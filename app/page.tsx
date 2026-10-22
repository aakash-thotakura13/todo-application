import { Suspense } from "react";
import { createTask, logout } from "./actions";
import { CurrentStep, DeleteChainButton } from "./task-controls";
import { tasksCollection, type Task } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { DISPLAY_NAMES, type User } from "@/lib/users";

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

function name(user: User | null | undefined) {
  return user ? DISPLAY_NAMES[user] : "someone";
}

function completedDate(task: Task) {
  return task.completedAt ?? task.updatedAt ?? task.createdAt;
}

type Chain = {
  id: string;
  steps: Task[]; // in order, first step first
  first: Task;
  current: Task; // the newest step
  lastActivity: number;
};

function groupIntoChains(tasks: Task[]): Chain[] {
  const byChain = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = (task.chainId ?? task._id).toString();
    const steps = byChain.get(key) ?? [];
    steps.push(task);
    byChain.set(key, steps);
  }

  const chains: Chain[] = [];
  for (const [id, steps] of byChain) {
    steps.sort(
      (a, b) =>
        (a.step ?? 1) - (b.step ?? 1) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const lastActivity = Math.max(
      ...steps.map((s) => (s.updatedAt ?? s.createdAt).getTime()),
    );
    chains.push({
      id,
      steps,
      first: steps[0],
      current: steps[steps.length - 1],
      lastActivity,
    });
  }
  return chains.sort((a, b) => b.lastActivity - a.lastActivity);
}

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {/* The board reads cookies and the database, so it renders per request. */}
        <Suspense fallback={<BoardSkeleton />}>
          <Board />
        </Suspense>
      </div>
    </main>
  );
}

async function Board() {
  const user = await requireUser();
  const tasks = await tasksCollection().find().toArray();
  const chains = groupIntoChains(tasks);

  const pending = chains.filter((c) => c.current.status === "pending");
  const complete = chains.filter((c) => c.current.status === "complete");

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Tasks
        </h1>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>Hi, {DISPLAY_NAMES[user]}</span>
          <form action={logout}>
            <button type="submit" className="text-blue-600 hover:underline">
              Log out
            </button>
          </form>
        </div>
      </header>

      <form action={createTask} className="mb-8 flex gap-2">
        <input
          id="new-task"
          type="text"
          name="text"
          required
          maxLength={500}
          placeholder="Start a new task…"
          className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      <ChainSection title="Pending" chains={pending} emptyText="Nothing pending. Nice!" />
      <ChainSection title="Complete" chains={complete} emptyText="No completed tasks yet." />
    </>
  );
}

function ChainSection({
  title,
  chains,
  emptyText,
}: {
  title: string;
  chains: Chain[];
  emptyText: string;
}) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        {title} ({chains.length})
      </h2>
      {chains.length === 0 ? (
        <p className="py-3 text-sm text-zinc-400">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {chains.map((chain) => (
            <ChainCard key={chain.id} chain={chain} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ChainCard({ chain }: { chain: Chain }) {
  const { first, current, steps } = chain;
  const multiStep = steps.length > 1;
  const earlier = steps.slice(0, -1);
  const done = current.status === "complete";

  const currentMeta = done
    ? `Done by ${name(current.completedBy)} · ${dateFormat.format(completedDate(current))}`
    : `Added by ${name(current.createdBy)} · ${dateFormat.format(current.createdAt)}`;

  const currentStep = (
    <CurrentStep
      key={current._id.toString()}
      id={current._id.toString()}
      text={current.text}
      meta={currentMeta}
      done={done}
      note={current.note ?? null}
      canRemove={multiStep}
      prominent={!multiStep}
    />
  );

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {multiStep ? (
            <>
              {/* Heading: the first task in the chain */}
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {first.text}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Started by {name(first.createdBy)} · {dateFormat.format(first.createdAt)}
              </p>

              {/* Below it: the current step */}
              <div className="mt-3 border-l-2 border-blue-600/40 pl-3">
                <p className="mb-1.5 text-xs font-medium text-blue-600">
                  Step {steps.length} · {done ? "latest" : "current"}
                </p>
                {currentStep}
              </div>
            </>
          ) : (
            currentStep
          )}
        </div>
        <DeleteChainButton chainId={chain.id} title={first.text} stepCount={steps.length} />
      </div>

      {earlier.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-zinc-500 select-none hover:text-zinc-700 dark:hover:text-zinc-300">
            History · {earlier.length} earlier {earlier.length === 1 ? "step" : "steps"}
          </summary>
          <ol className="mt-3 space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
            {earlier.map((step, i) => (
              <li key={step._id.toString()}>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                  <span className="text-zinc-400">{i + 1}.</span> {step.text}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Done by {name(step.completedBy)} · {dateFormat.format(completedDate(step))}
                </p>
                {step.note ? (
                  <p className="mt-1.5 rounded-md bg-zinc-50 p-2 text-sm whitespace-pre-wrap text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                    {step.note}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-400 italic">No notes</p>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}

function BoardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-10 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-20 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-20 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
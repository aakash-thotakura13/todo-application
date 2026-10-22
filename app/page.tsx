import { Suspense, type ReactNode } from "react";
import { deleteChain, deleteRepeating, logout } from "./actions";
import { NewTaskForm } from "./new-task-form";
import { PlaceEditor } from "./place-picker";
import { RoutePlanner, type RouteStop } from "./route-planner";
import { CurrentStep, DeleteButton, RepeatingStep } from "./task-controls";
import { placeLink, type Place } from "@/lib/place";
import {
  completionsCollection,
  tasksCollection,
  type Completion,
  type Priority,
  type Task,
} from "@/lib/db";
import {
  addDays,
  dateOf,
  formatDay,
  normalizeDays,
  scheduleLabel,
  todayIST,
  weekdayOf,
} from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { DISPLAY_NAMES, type User } from "@/lib/users";

const HISTORY_DAYS = 30;

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function priorityOf(task: Task): Priority {
  return task.priority ?? "medium";
}

function name(user: User | null | undefined) {
  return user ? DISPLAY_NAMES[user] : "someone";
}

function completedDate(task: Task) {
  return task.completedAt ?? task.updatedAt ?? task.createdAt;
}

/** A one-time task's date (older tasks without one use their creation day). */
function dueDateOf(task: Task) {
  return task.dueDate ?? dateOf(task.createdAt);
}

/* ---------- Grouping one-time tasks into chains ---------- */

type Chain = {
  id: string;
  steps: Task[]; // in order, first step first
  first: Task;
  current: Task; // the newest step
  dueDate: string; // the current step's date
  priority: Priority;
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
    const current = steps[steps.length - 1];
    chains.push({
      id,
      steps,
      first: steps[0],
      current,
      dueDate: dueDateOf(current),
      priority: priorityOf(current),
      lastActivity: Math.max(
        ...steps.map((s) => (s.updatedAt ?? s.createdAt).getTime()),
      ),
    });
  }
  return chains;
}

/* ---------- Page ---------- */

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {/* The board reads cookies, the clock and the database, so it renders per request. */}
        <Suspense fallback={<BoardSkeleton />}>
          <Board />
        </Suspense>
      </div>
    </main>
  );
}

type TodayItem =
  | { type: "chain"; chain: Chain }
  | { type: "repeating"; task: Task; done: boolean };

async function Board() {
  const user = await requireUser(); // also marks the page as per-request
  const today = todayIST();
  const weekday = weekdayOf(today);

  const [tasks, completions] = await Promise.all([
    tasksCollection().find().toArray(),
    completionsCollection()
      .find({ date: { $gte: addDays(today, -HISTORY_DAYS) } })
      .sort({ date: -1 })
      .toArray(),
  ]);

  // Daily log per repeating task, newest first.
  const logByTask = new Map<string, Completion[]>();
  for (const c of completions) {
    const key = c.taskId.toString();
    logByTask.set(key, [...(logByTask.get(key) ?? []), c]);
  }
  const doneToday = (task: Task) =>
    logByTask.get(task._id.toString())?.find((c) => c.date === today) ?? null;

  const repeating = tasks.filter((t) => t.kind === "repeating");
  const chains = groupIntoChains(tasks.filter((t) => t.kind !== "repeating"));

  const repeatingToday = repeating.filter((t) => normalizeDays(t.days).includes(weekday));
  const repeatingOtherDays = repeating.filter((t) => !normalizeDays(t.days).includes(weekday));

  const pendingChains = chains.filter((c) => c.current.status === "pending");
  const completedChains = chains
    .filter((c) => c.current.status === "complete")
    .sort((a, b) => b.lastActivity - a.lastActivity);

  // Today: repeating tasks for today + one-time tasks due today or overdue.
  // Order: not done first, then by priority, then oldest date first.
  const todayItems: TodayItem[] = [
    ...repeatingToday.map((task) => ({
      type: "repeating" as const,
      task,
      done: doneToday(task) !== null,
    })),
    ...pendingChains
      .filter((c) => c.dueDate <= today)
      .map((chain) => ({ type: "chain" as const, chain })),
  ].sort((a, b) => {
    const doneA = a.type === "repeating" && a.done ? 1 : 0;
    const doneB = b.type === "repeating" && b.done ? 1 : 0;
    const prA = a.type === "chain" ? a.chain.priority : priorityOf(a.task);
    const prB = b.type === "chain" ? b.chain.priority : priorityOf(b.task);
    const dateA = a.type === "chain" ? a.chain.dueDate : today;
    const dateB = b.type === "chain" ? b.chain.dueDate : today;
    return (
      doneA - doneB ||
      PRIORITY_RANK[prA] - PRIORITY_RANK[prB] ||
      dateA.localeCompare(dateB)
    );
  });
  const todayLeft = todayItems.filter((i) => !(i.type === "repeating" && i.done)).length;

  // Stops for the route planner: today's pending tasks that have a place.
  const plain = (p: Place): Place => ({ id: p.id, name: p.name, address: p.address, lat: p.lat, lng: p.lng });
  const routeStops: RouteStop[] = todayItems.flatMap((item): RouteStop[] => {
    if (item.type === "repeating") {
      const t = item.task;
      return !item.done && t.place
        ? [{ taskId: t._id.toString(), text: t.text, priority: priorityOf(t), place: plain(t.place) }]
        : [];
    }
    const { chain } = item;
    const t = chain.current;
    const text = chain.steps.length > 1 ? `${chain.first.text} — ${t.text}` : t.text;
    return t.place
      ? [{ taskId: t._id.toString(), text, priority: chain.priority, place: plain(t.place) }]
      : [];
  });
  const missingPlaces = todayLeft - routeStops.length;

  // Upcoming: one-time tasks with a future date, soonest first.
  const upcoming = pendingChains
    .filter((c) => c.dueDate > today)
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    );

  const repeatingCard = (task: Task) => (
    <RepeatingCard
      key={task._id.toString()}
      task={task}
      today={today}
      todayCompletion={doneToday(task)}
      log={logByTask.get(task._id.toString()) ?? []}
    />
  );
  const chainCard = (chain: Chain) => (
    <ChainCard key={chain.id} chain={chain} today={today} />
  );

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Tasks
          </h1>
          <p className="text-sm text-zinc-500">{formatDay(today)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>Hi, {DISPLAY_NAMES[user]}</span>
          <form action={logout}>
            <button type="submit" className="text-blue-600 hover:underline">
              Log out
            </button>
          </form>
        </div>
      </header>

      <NewTaskForm today={today} />

      <Section
        title={`Today · ${todayLeft} left`}
        empty={todayItems.length === 0 ? "Nothing for today. Enjoy!" : null}
        toolbar={
          todayLeft > 0 ? <RoutePlanner stops={routeStops} missingPlaces={missingPlaces} /> : null
        }
      >
        {todayItems.map((item) =>
          item.type === "chain" ? chainCard(item.chain) : repeatingCard(item.task),
        )}
      </Section>

      <Section
        title={`Upcoming (${upcoming.length})`}
        empty={upcoming.length === 0 ? "Nothing planned ahead." : null}
      >
        {upcoming.map(chainCard)}
      </Section>

      {repeatingOtherDays.length > 0 && (
        <Section title={`Repeating · not today (${repeatingOtherDays.length})`} collapsible>
          {repeatingOtherDays.map(repeatingCard)}
        </Section>
      )}

      <Section
        title={`Completed (${completedChains.length})`}
        empty={completedChains.length === 0 ? "No completed tasks yet." : null}
        collapsible
      >
        {completedChains.map(chainCard)}
      </Section>
    </>
  );
}

function Section({
  title,
  empty = null,
  collapsible = false,
  toolbar = null,
  children,
}: {
  title: string;
  empty?: string | null;
  collapsible?: boolean;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const heading = (
    <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{title}</h2>
  );
  const body = (
    <>
      {toolbar}
      {empty ? (
        <p className="py-3 text-sm text-zinc-400">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">{children}</ul>
      )}
    </>
  );

  if (collapsible) {
    return (
      <details className="group mb-8 last:mb-0">
        <summary className="cursor-pointer list-none select-none">
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 transition-transform group-open:rotate-90">▶</span>
            {heading}
          </span>
        </summary>
        {body}
      </details>
    );
  }
  return (
    <section className="mb-8 last:mb-0">
      {heading}
      {body}
    </section>
  );
}

/* ---------- Badges ---------- */

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge className={PRIORITY_STYLES[priority]}>
      {priority[0].toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

function DueBadge({ date, today }: { date: string; today: string }) {
  if (date < today) {
    return (
      <Badge className="bg-red-600 text-white">Overdue · {formatDay(date)}</Badge>
    );
  }
  if (date === today) {
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
        Today
      </Badge>
    );
  }
  if (date === addDays(today, 1)) {
    return (
      <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        Tomorrow
      </Badge>
    );
  }
  return (
    <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      {formatDay(date)}
    </Badge>
  );
}

/* ---------- One-time task card (a chain of steps) ---------- */

function ChainCard({ chain, today }: { chain: Chain; today: string }) {
  const { first, current, steps } = chain;
  const multiStep = steps.length > 1;
  const earlier = steps.slice(0, -1);
  const done = current.status === "complete";

  const currentMeta = done
    ? `Done by ${name(current.completedBy)} · ${formatDay(dateOf(completedDate(current)))}`
    : `Added by ${name(current.createdBy)} · ${formatDay(dateOf(current.createdAt))}`;

  const currentStep = (
    <>
      <CurrentStep
        key={current._id.toString()}
        id={current._id.toString()}
        text={current.text}
        meta={currentMeta}
        done={done}
        note={current.note ?? null}
        canRemove={multiStep}
        prominent={!multiStep}
        today={today}
      />
      <PlaceEditor
        key={`place-${current._id.toString()}`}
        taskId={current._id.toString()}
        place={current.place ?? null}
      />
    </>
  );

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={chain.priority} />
        {!done && <DueBadge date={chain.dueDate} today={today} />}
      </div>

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {multiStep ? (
            <>
              {/* Heading: the first task in the chain */}
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{first.text}</h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Started by {name(first.createdBy)} · {formatDay(dateOf(first.createdAt))}
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
        <DeleteButton
          action={deleteChain.bind(null, chain.id)}
          label={`Delete "${first.text}"`}
          message={
            multiStep
              ? `Delete "${first.text}" and all ${steps.length} steps? This can't be undone.`
              : `Delete "${first.text}"? This can't be undone.`
          }
        />
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
                  Done by {name(step.completedBy)} · {formatDay(dateOf(completedDate(step)))}
                  {step.place && (
                    <>
                      {" · "}
                      <a
                        href={placeLink(step.place)}
                        target="_blank"
                        rel="noreferrer"
                        title={step.place.address}
                        className="hover:underline"
                      >
                        📍 {step.place.name}
                      </a>
                    </>
                  )}
                </p>
                <Note note={step.note} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}

/* ---------- Repeating task card ---------- */

function RepeatingCard({
  task,
  today,
  todayCompletion,
  log,
}: {
  task: Task;
  today: string;
  todayCompletion: Completion | null;
  log: Completion[]; // newest first, last 30 days
}) {
  const id = task._id.toString();
  const scheduledToday = normalizeDays(task.days).includes(weekdayOf(today));
  const done = todayCompletion !== null;

  const meta = todayCompletion
    ? `Done today by ${name(todayCompletion.completedBy)}`
    : `Added by ${name(task.createdBy)}`;

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={priorityOf(task)} />
        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
          ↻ {scheduleLabel(task.days)}
        </Badge>
      </div>

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {scheduledToday ? (
            <RepeatingStep
              key={`${id}-${today}`}
              id={id}
              text={task.text}
              meta={meta}
              done={done}
              note={todayCompletion?.note ?? null}
            />
          ) : (
            <>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{task.text}</p>
              <p className="mt-0.5 text-xs text-zinc-400">Not scheduled today</p>
            </>
          )}
          <PlaceEditor taskId={id} place={task.place ?? null} indent={scheduledToday} />
        </div>
        <DeleteButton
          action={deleteRepeating.bind(null, id)}
          label={`Delete "${task.text}"`}
          message={`Delete the repeating task "${task.text}" and its daily log? This can't be undone.`}
        />
      </div>

      {log.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-zinc-500 select-none hover:text-zinc-700 dark:hover:text-zinc-300">
            Daily log · done {log.length} {log.length === 1 ? "time" : "times"} in the last{" "}
            {HISTORY_DAYS} days
          </summary>
          <ol className="mt-3 space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
            {log.map((c) => (
              <li key={c._id.toString()}>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                  {c.date === today ? "Today" : formatDay(c.date)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">Done by {name(c.completedBy)}</p>
                <Note note={c.note} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}

function Note({ note }: { note?: string | null }) {
  return note ? (
    <p className="mt-1.5 rounded-md bg-zinc-50 p-2 text-sm whitespace-pre-wrap text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
      {note}
    </p>
  ) : (
    <p className="mt-1 text-xs text-zinc-400 italic">No notes</p>
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
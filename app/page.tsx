import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { deleteChain, deleteRepeating, logout } from "./actions";
import { Card } from "./instant";
import { BoardProvider, NewTaskButton, Panel, SavingList } from "./board-shell";
import { NewTaskDialog } from "./new-task-form";
import { PlaceEditor } from "./place-picker";
import { RoutePlanner, type RouteStop } from "./route-planner";
import { AssigneeSwitcher } from "./assignee-switcher";
import { SectionMenu, type MenuItem } from "./section-menu";
import { CurrentStep, DeleteButton, RepeatingStep } from "./task-controls";
import { percent, repeatStats, WINDOW, type DayState, type RepeatStats } from "@/lib/stats";
import { placeLink, type Place } from "@/lib/place";
import {
  assigneeOf,
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
import {
  assigneeLabel,
  DISPLAY_NAMES,
  isFor,
  otherUser,
  participants,
  type User,
} from "@/lib/users";

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
    // Extra bottom padding so the menu bubble never covers the last card.
    <main className="min-h-screen bg-zinc-100 px-4 pt-12 pb-28 dark:bg-zinc-950">
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
    // All ticks, for the done/missed analysis.
    completionsCollection().find().sort({ date: -1 }).toArray(),
  ]);

  // Ticks per repeating task, newest first.
  const logByTask = new Map<string, Completion[]>();
  for (const c of completions) {
    const key = c.taskId.toString();
    logByTask.set(key, [...(logByTask.get(key) ?? []), c]);
  }
  const todaysTicks = (task: Task) =>
    (logByTask.get(task._id.toString()) ?? []).filter((c) => c.date === today);
  // Your tick today ("Either of us" tasks: anyone's tick counts).
  const myTickToday = (task: Task) => {
    const ticks = todaysTicks(task);
    return assigneeOf(task) === "either"
      ? (ticks[0] ?? null)
      : (ticks.find((c) => c.completedBy === user) ?? null);
  };

  const repeating = tasks
    .filter((t) => t.kind === "repeating")
    .sort(
      (a, b) =>
        PRIORITY_RANK[priorityOf(a)] - PRIORITY_RANK[priorityOf(b)] ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
  const chains = groupIntoChains(tasks.filter((t) => t.kind !== "repeating"));

  // Done/missed records: one per person, or one shared record for "Either of us".
  const statsByTask = new Map<string, StatsEntry[]>(
    repeating.map((t) => [
      t._id.toString(),
      statsEntries(t, logByTask.get(t._id.toString()) ?? [], today),
    ]),
  );
  const myStats = (task: Task) =>
    statsByTask.get(task._id.toString())?.find((e) => e.who === null || e.who === user)?.stats;

  // Your repeating tasks for today (not the other person's personal ones).
  const repeatingToday = repeating.filter(
    (t) => normalizeDays(t.days).includes(weekday) && isFor(assigneeOf(t), user),
  );

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
      done: myTickToday(task) !== null,
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

  const chainCard = (chain: Chain) => (
    <ChainCard key={chain.id} chain={chain} today={today} />
  );

  const menu: MenuItem[] = [
    { id: "today", label: "Today", icon: "☀️", count: todayLeft },
    { id: "upcoming", label: "Upcoming", icon: "📅", count: upcoming.length },
    { id: "repeating", label: "Repeating", icon: "↻", count: repeating.length },
    { id: "completed", label: "Completed", icon: "✓", count: completedChains.length },
  ];

  return (
    <BoardProvider>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Tasks
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-zinc-500">
            <span>{formatDay(today)}</span>
            <span aria-hidden>·</span>
            <span>{DISPLAY_NAMES[user]}</span>
            <span aria-hidden>·</span>
            <Link href="/expenses" className="text-zinc-500 hover:text-blue-600 hover:underline">
              Expenses
            </Link>
            <span aria-hidden>·</span>
            <form action={logout}>
              <button type="submit" className="text-zinc-500 hover:text-blue-600 hover:underline">
                Log out
              </button>
            </form>
          </div>
        </div>
        <NewTaskButton />
      </header>

      <SavingList />

      <Panel id="today">
        <Section
          title="Today"
          count={todayLeft === 0 ? "All done" : `${todayLeft} left`}
          empty={todayItems.length === 0 ? "Nothing for today. Enjoy!" : null}
          toolbar={
            todayLeft > 0 ? <RoutePlanner stops={routeStops} missingPlaces={missingPlaces} /> : null
          }
        >
          {todayItems.map((item) => {
            if (item.type === "chain") return chainCard(item.chain);
            const id = item.task._id.toString();
            return (
              <TodayRepeatingCard
                key={id}
                task={item.task}
                myTick={myTickToday(item.task)}
                partner={
                  assigneeOf(item.task) === "each"
                    ? {
                        name: DISPLAY_NAMES[otherUser(user)],
                        done: todaysTicks(item.task).some((c) => c.completedBy === otherUser(user)),
                      }
                    : null
                }
                streak={myStats(item.task)?.currentStreak ?? 0}
              />
            );
          })}
        </Section>
      </Panel>

      <Panel id="upcoming">
        <Section
          title="Upcoming"
          count={String(upcoming.length)}
          empty={upcoming.length === 0 ? "Nothing planned ahead." : null}
        >
          {upcoming.map(chainCard)}
        </Section>
      </Panel>

      <Panel id="repeating">
        <Section
          title="Repeating"
          count={String(repeating.length)}
          empty={repeating.length === 0 ? "No repeating tasks yet." : null}
          toolbar={
            repeating.length > 0 ? (
              <RepeatingOverview
                entries={[...statsByTask.values()].flat()}
                todayDone={repeatingToday.filter((t) => myTickToday(t) !== null).length}
                todayTotal={repeatingToday.length}
              />
            ) : null
          }
        >
          {repeating.map((task) => {
            const id = task._id.toString();
            return (
              <RepeatingStatsCard
                key={id}
                task={task}
                today={today}
                me={user}
                entries={statsByTask.get(id) ?? []}
                log={(logByTask.get(id) ?? []).filter((c) => c.date > addDays(today, -WINDOW))}
              />
            );
          })}
        </Section>
      </Panel>

      <Panel id="completed">
        <Section
          title="Completed"
          count={String(completedChains.length)}
          empty={completedChains.length === 0 ? "No completed tasks yet." : null}
        >
          {completedChains.map(chainCard)}
        </Section>
      </Panel>

      <SectionMenu items={menu} />
      <NewTaskDialog today={today} me={user} />
    </BoardProvider>
  );
}

function Section({
  title,
  count,
  empty = null,
  toolbar = null,
  children,
}: {
  title: string;
  count: string;
  empty?: string | null;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <span className="text-sm text-zinc-400">{count}</span>
      </div>
      {toolbar}
      {empty ? (
        <p className="py-10 text-center text-sm text-zinc-400">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">{children}</ul>
      )}
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
    <Card className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
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
    </Card>
  );
}

/* ---------- Repeating tasks ---------- */

/** One done/missed record: a person's own (`who`), or shared for "Either of us" (null). */
type StatsEntry = { who: User | null; stats: RepeatStats };

function statsEntries(task: Task, ticks: Completion[], today: string): StatsEntry[] {
  const record = (list: Completion[]) =>
    repeatStats({
      days: normalizeDays(task.days),
      startDate: dateOf(task.createdAt),
      completions: list,
      today,
    });
  const people = participants(assigneeOf(task));
  if (people === null) return [{ who: null, stats: record(ticks) }];
  return people.map((who) => ({ who, stats: record(ticks.filter((c) => c.completedBy === who)) }));
}

const ASSIGNEE_ICON = { each: "👥", either: "🤝", personal: "👤" } as const;

function assigneeBadge(task: Task) {
  const a = assigneeOf(task);
  const icon = a === "each" || a === "either" ? ASSIGNEE_ICON[a] : ASSIGNEE_ICON.personal;
  return (
    <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
      {icon} {assigneeLabel(a)}
    </Badge>
  );
}

function scheduleBadge(task: Task) {
  return (
    <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
      ↻ {scheduleLabel(task.days)}
    </Badge>
  );
}

/** In the Today list: your tick for today (and how the other person is doing). */
function TodayRepeatingCard({
  task,
  myTick,
  partner,
  streak,
}: {
  task: Task;
  myTick: Completion | null;
  partner: { name: string; done: boolean } | null; // "Each of us" tasks only
  streak: number;
}) {
  const id = task._id.toString();
  const shared = assigneeOf(task) === "either";
  const meta = myTick
    ? shared
      ? `Done today by ${name(myTick.completedBy)}`
      : "You've done it today"
    : partner
      ? "Your tick for today"
      : `Added by ${name(task.createdBy)}`;

  return (
    <Card className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={priorityOf(task)} />
        {scheduleBadge(task)}
        {assigneeOf(task) !== "either" && assigneeBadge(task)}
        {streak >= 2 && (
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
            🔥 {streak}-day streak
          </Badge>
        )}
      </div>
      <RepeatingStep
        id={id}
        text={task.text}
        meta={meta}
        done={myTick !== null}
        note={myTick?.note ?? null}
      />
      {partner && (
        <p className="mt-2 ml-8 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
              partner.done
                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {partner.name}: {partner.done ? "✓ done" : "not yet"}
          </span>
        </p>
      )}
      <PlaceEditor taskId={id} place={task.place ?? null} />
    </Card>
  );
}

function rateText(t: { done: number; due: number }) {
  const p = percent(t);
  return p === null ? "—" : `${p}%`;
}

function sumOf(entries: StatsEntry[], pick: (s: RepeatStats) => { done: number; due: number }) {
  return entries.reduce(
    (t, e) => ({ done: t.done + pick(e.stats).done, due: t.due + pick(e.stats).due }),
    { done: 0, due: 0 },
  );
}

/** Summary tiles at the top of the Repeating section. */
function RepeatingOverview({
  entries,
  todayDone,
  todayTotal,
}: {
  entries: StatsEntry[]; // every record across all repeating tasks
  todayDone: number; // your ticks today
  todayTotal: number; // your repeating tasks today
}) {
  const week = sumOf(entries, (s) => s.week);
  const month = sumOf(entries, (s) => s.window);

  const tiles = [
    { label: "Your today", value: `${todayDone}/${todayTotal}`, sub: "done so far" },
    { label: "Last 7 days", value: rateText(week), sub: `${week.done} of ${week.due} done` },
    { label: `Last ${WINDOW} days`, value: rateText(month), sub: `${month.done} of ${month.due} done` },
  ];

  // Per person, over personal and "each of us" tasks.
  const people = (["ish", "ishah"] as User[])
    .map((who) => ({ who, total: sumOf(entries.filter((e) => e.who === who), (s) => s.window) }))
    .filter((p) => p.total.due > 0);

  return (
    <div className="mt-3">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <p className="text-[11px] font-medium text-zinc-500">{t.label}</p>
            <p className="mt-0.5 text-xl font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
              {t.value}
            </p>
            <p className="text-[11px] text-zinc-400">{t.sub}</p>
          </div>
        ))}
      </div>
      {people.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {people.map((p) => (
            <span
              key={p.who}
              className="rounded-full bg-zinc-50 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
            >
              {name(p.who)}: <b className="font-semibold tabular-nums">{rateText(p.total)}</b>{" "}
              <span className="text-zinc-400">
                ({p.total.done}/{p.total.due}, last {WINDOW} days)
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const CELL_STYLES: Record<DayState, string> = {
  done: "bg-green-500",
  missed: "bg-red-400 dark:bg-red-500/80",
  pending: "bg-transparent ring-1 ring-inset ring-blue-500",
  off: "bg-zinc-100 dark:bg-zinc-800",
};
const CELL_LABEL: Record<DayState, string> = {
  done: "done",
  missed: "missed",
  pending: "not done yet",
  off: "not scheduled",
};

/** Numbers + 30-day strip for one record. */
function StatsBlock({ entry, heading }: { entry: StatsEntry; heading: string | null }) {
  const { stats } = entry;
  const missed = stats.window.due - stats.window.done;

  return (
    <div className="mt-4">
      {heading && (
        <p className="mb-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{heading}</p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] text-zinc-500">Last {WINDOW} days</dt>
          <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
            {rateText(stats.window)}{" "}
            <span className="text-xs font-normal text-zinc-400">
              {stats.window.done}/{stats.window.due}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-zinc-500">Missed</dt>
          <dd
            className={`font-semibold tabular-nums ${missed > 0 ? "text-red-600" : "text-zinc-900 dark:text-zinc-100"}`}
          >
            {missed} {missed === 1 ? "day" : "days"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-zinc-500">Streak</dt>
          <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
            {stats.currentStreak}{" "}
            <span className="text-xs font-normal text-zinc-400">best {stats.bestStreak}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-zinc-500">All time</dt>
          <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
            {rateText(stats.allTime)}{" "}
            <span className="text-xs font-normal text-zinc-400">
              {stats.allTime.done}/{stats.allTime.due}
            </span>
          </dd>
        </div>
      </dl>

      {/* Last 30 days, one square per day */}
      <div
        className="mt-3 grid max-w-md gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${stats.strip.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`${heading ? `${heading}: ` : ""}last ${WINDOW} days, ${stats.window.done} done, ${missed} missed`}
      >
        {stats.strip.map((d) => (
          <span
            key={d.date}
            title={`${formatDay(d.date)}: ${CELL_LABEL[d.state]}${d.by ? ` by ${name(d.by)}` : ""}`}
            className={`aspect-square rounded-[3px] ${CELL_STYLES[d.state]}`}
          />
        ))}
      </div>
    </div>
  );
}

/** In the Repeating section: the full done/missed record for one task. */
function RepeatingStatsCard({
  task,
  today,
  me,
  entries,
  log,
}: {
  task: Task;
  today: string;
  me: User;
  entries: StatsEntry[];
  log: Completion[]; // newest first, within the window
}) {
  const id = task._id.toString();
  const assignee = assigneeOf(task);
  const lastDone = entries.reduce<string | null>(
    (latest, e) =>
      e.stats.lastDone && (latest === null || e.stats.lastDone > latest) ? e.stats.lastDone : latest,
    null,
  );
  const shared = entries.length === 1 && entries[0].who === null;
  // Show your own record first.
  const ordered = [...entries].sort((a, b) => (a.who === me ? -1 : b.who === me ? 1 : 0));
  const firstStrip = entries[0]?.stats.strip;

  return (
    <Card className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={priorityOf(task)} />
        {scheduleBadge(task)}
        <AssigneeSwitcher taskId={id} assignee={assignee} />
      </div>

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{task.text}</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Since {formatDay(dateOf(task.createdAt))} · added by {name(task.createdBy)}
            {lastDone && ` · last done ${lastDone === today ? "today" : formatDay(lastDone)}`}
          </p>
          <PlaceEditor taskId={id} place={task.place ?? null} indent={false} />
        </div>
        <DeleteButton
          action={deleteRepeating.bind(null, id)}
          label={`Delete "${task.text}"`}
          message={`Delete the repeating task "${task.text}" and all its history? This can't be undone.`}
        />
      </div>

      {ordered.map((entry) => (
        <StatsBlock
          key={entry.who ?? "shared"}
          entry={entry}
          heading={
            shared || entries.length === 1
              ? null
              : entry.who === me
                ? `You (${name(entry.who)})`
                : name(entry.who)
          }
        />
      ))}

      {firstStrip && (
        <div className="mt-1.5 flex max-w-md items-center justify-between text-[10px] text-zinc-400">
          <span>{formatDay(firstStrip[0].date)}</span>
          <span className="flex items-center gap-2">
            <Legend state="done" /> <Legend state="missed" /> <Legend state="off" />
          </span>
          <span>Today</span>
        </div>
      )}

      {/* Who ticked a shared task */}
      {shared && Object.keys(entries[0].stats.byUser).length > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          Done by:{" "}
          {(["ish", "ishah"] as User[])
            .filter((p) => entries[0].stats.byUser[p])
            .map((p) => `${name(p)} ${entries[0].stats.byUser[p]}×`)
            .join(" · ")}
        </p>
      )}

      {log.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-zinc-500 select-none hover:text-zinc-700 dark:hover:text-zinc-300">
            Daily log · last {WINDOW} days
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
    </Card>
  );
}

function Legend({ state }: { state: DayState }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block size-2 rounded-[2px] ${CELL_STYLES[state]}`} />
      {state === "off" ? "off" : CELL_LABEL[state]}
    </span>
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

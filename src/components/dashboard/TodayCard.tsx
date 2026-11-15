import { Check, CheckSquare, Dumbbell, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardCard } from './DashboardCard';

export interface TodayHabit { id: string; name: string; frequency: 'daily' | 'weekly'; completed: boolean }
export interface TodayTask { id: string; title: string; time: string | null; completed: boolean }
export interface PlannedWorkout { name: string; completed: boolean }

interface TodayCardProps {
  habits: TodayHabit[];
  tasks: TodayTask[];
  plannedWorkout: PlannedWorkout | null;
  hasFitnessProfile: boolean;
  completedCount: number;
  plannedCount: number;
  onHabitToggle: (id: string) => void;
  onTaskToggle: (id: string) => void;
}

function ProgressRing({ completed, planned }: { completed: number; planned: number }) {
  const radius = 39;
  const circumference = 2 * Math.PI * radius;
  const ratio = planned ? Math.min(1, completed / planned) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <div className="relative h-[104px] w-[104px] shrink-0" role="img" aria-label={planned ? `${completed} of ${planned} planned items complete` : 'Nothing planned today'}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--app-muted)" strokeWidth="8" />
        {planned > 0 && <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-accent-contrast)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none" />}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <span className="text-xl font-extrabold tabular-nums text-app-ink">{planned ? `${Math.round(ratio * 100)}%` : '—'}</span>
        <span className="-mt-5 text-[10px] font-medium text-app-subtle">{planned ? `${completed}/${planned}` : 'today'}</span>
      </div>
    </div>
  );
}

export function TodayCard({ habits, tasks, plannedWorkout, hasFitnessProfile, completedCount, plannedCount, onHabitToggle, onTaskToggle }: TodayCardProps) {
  const visibleTasks = tasks.slice(0, 5);
  const remainingTasks = Math.max(0, tasks.length - visibleTasks.length);

  return (
    <DashboardCard label="Today" className="sm:col-span-2 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-contrast">Today</p>
          <h2 className="mt-1 text-lg font-bold text-app-ink">A steady day, one step at a time</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[124px_minmax(0,1fr)] md:items-center">
        <div className="flex justify-center"><ProgressRing completed={completedCount} planned={plannedCount} /></div>
        <div>
          {plannedCount === 0 ? (
            <div className="rounded-2xl bg-app-bg p-4">
              <h3 className="font-semibold text-app-ink">Nothing planned today</h3>
              <p className="mt-1 text-sm leading-5 text-app-subtle">Take the day as it comes, or add a small next step when you’re ready.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3">
              <div><p className="text-sm font-semibold text-app-ink">{completedCount} of {plannedCount} items complete</p><p className="mt-0.5 text-xs text-app-subtle">Your progress adds up.</p></div>
              <Check size={18} className="shrink-0 text-accent-contrast" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section aria-labelledby="today-habits-heading" className="min-w-0">
          <h3 id="today-habits-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-app-ink"><CheckSquare size={16} className="text-cat-indigo" />Habits to keep up with</h3>
          {habits.length ? <ul className="max-h-48 space-y-1.5 overflow-y-auto">{habits.map((habit) => <li key={habit.id}><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-app-bg px-3 py-2 text-sm text-app-ink hover:bg-app-muted"><input type="checkbox" checked={habit.completed} onChange={() => onHabitToggle(habit.id)} aria-label={`Mark habit ${habit.name} ${habit.completed ? 'incomplete' : 'complete'}`} className="h-5 w-5 shrink-0 accent-[var(--color-accent-contrast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /><span className={`min-w-0 flex-1 truncate ${habit.completed ? 'text-app-subtle line-through' : ''}`}>{habit.name}</span>{habit.frequency === 'weekly' && <span className="shrink-0 rounded-full bg-app-card px-2 py-0.5 text-[10px] text-app-subtle">Weekly</span>}</label></li>)}</ul> : <p className="rounded-xl bg-app-bg px-3 py-3 text-sm text-app-subtle">Add a habit when you’re ready to build a routine.</p>}
        </section>

        <section aria-labelledby="today-tasks-heading" className="min-w-0">
          <h3 id="today-tasks-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-app-ink"><ListTodo size={16} className="text-cat-blue" />Today’s tasks</h3>
          {visibleTasks.length ? <ul className="space-y-1.5">{visibleTasks.map((task) => <li key={task.id}><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-app-bg px-3 py-2 text-sm text-app-ink hover:bg-app-muted"><input type="checkbox" checked={task.completed} onChange={() => onTaskToggle(task.id)} aria-label={`Mark task ${task.title} ${task.completed ? 'incomplete' : 'complete'}`} className="h-5 w-5 shrink-0 accent-[var(--color-accent-contrast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /><span className={`min-w-0 flex-1 truncate ${task.completed ? 'text-app-subtle line-through' : ''}`}>{task.title}</span>{task.time && <time className="shrink-0 text-xs tabular-nums text-app-subtle">{task.time}</time>}</label></li>)}</ul> : <p className="rounded-xl bg-app-bg px-3 py-3 text-sm text-app-subtle">No tasks scheduled for today.</p>}
          {remainingTasks > 0 && <Link to="/todos" className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">See {remainingTasks} more task{remainingTasks === 1 ? '' : 's'}</Link>}
          {!tasks.length && <Link to="/todos" className="mt-1 inline-flex min-h-10 items-center text-xs font-semibold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Open To-Do</Link>}
        </section>
      </div>

      <div className="mt-4 border-t border-app-border pt-4">
        {hasFitnessProfile ? (
          <Link to="/fitness" className="flex min-h-12 items-center gap-3 rounded-xl bg-app-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <span className="rounded-xl bg-cat-teal/10 p-2 text-cat-teal"><Dumbbell size={18} /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs text-app-subtle">Today’s workout</span><span className="block truncate text-sm font-semibold text-app-ink">{plannedWorkout ? plannedWorkout.name : 'Rest day'}{plannedWorkout?.completed ? ' · Complete' : ''}</span></span>
            <span className="text-xs font-semibold text-app-ink">Open Fitness <span aria-hidden="true">→</span></span>
          </Link>
        ) : (
          <Link to="/fitness" className="flex min-h-12 items-center gap-3 rounded-xl bg-app-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <span className="rounded-xl bg-cat-teal/10 p-2 text-cat-teal"><Dumbbell size={18} /></span><span className="flex-1 text-sm font-semibold text-app-ink">Set up Fitness</span><span className="text-xs text-app-subtle">Start with a plan →</span>
          </Link>
        )}
      </div>
    </DashboardCard>
  );
}

import { format, isValid, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import type { Goal } from '../../types';
import { DashboardCard } from './DashboardCard';

function targetLabel(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'MMM d, yyyy') : 'No target date';
}

export function GoalsCard({ goals }: { goals: Goal[] }) {
  const activeGoals = goals.filter((goal) => !goal.completed).sort((a, b) => a.targetDate.localeCompare(b.targetDate)).slice(0, 3);

  return (
    <DashboardCard label="Active goals">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-subtle">Keep your direction</p><h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-app-ink"><Target size={18} className="text-cat-green" />Active goals</h2></div><span className="rounded-full bg-cat-green/10 px-2.5 py-1 text-xs font-semibold text-cat-green-ink">{activeGoals.length}</span></div>
      {activeGoals.length ? <ul className="mt-5 space-y-4">{activeGoals.map((goal) => {
        const completed = goal.milestones.filter((item) => item.completed).length;
        const progress = goal.milestones.length ? Math.round((completed / goal.milestones.length) * 100) : 0;
        return <li key={goal.id} className="rounded-2xl bg-app-bg p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-app-ink">{goal.title}</h3><p className="mt-0.5 text-xs text-app-subtle">Target {targetLabel(goal.targetDate)}</p></div><span className="shrink-0 text-xs font-semibold tabular-nums text-app-subtle">{goal.milestones.length ? `${completed}/${goal.milestones.length}` : '—'}</span></div>{goal.milestones.length > 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-app-muted" role="progressbar" aria-label={`${goal.title} milestone progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-cat-green" style={{ width: `${progress}%` }} /></div>}</li>;
      })}</ul> : <div className="mt-5 rounded-2xl bg-app-bg p-4"><p className="text-sm text-app-subtle">Your next goal can start with one small step.</p><Link to="/goals" className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Set a goal</Link></div>}
      {activeGoals.length > 0 && <Link to="/goals" className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">View all goals</Link>}
    </DashboardCard>
  );
}

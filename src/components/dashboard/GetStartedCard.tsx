import { useState } from 'react';
import { CheckSquare, Dumbbell, Plus, Sparkles, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import { DashboardCard } from './DashboardCard';

const actions = [
  { to: '/habits', title: 'Add a habit', detail: 'Start a simple routine', icon: CheckSquare, color: 'text-cat-indigo' },
  { to: '/todos', title: 'Add a task', detail: 'Choose a next step', icon: Plus, color: 'text-cat-blue' },
  { to: '/fitness', title: 'Set up Fitness', detail: 'Make a weekly plan', icon: Dumbbell, color: 'text-cat-teal' },
  { to: '/finances', title: 'Add a transaction', detail: 'Track money in or out', icon: Wallet, color: 'text-cat-amber' },
];

export function GetStartedCard({ onLoadSample }: { onLoadSample: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const handleLoadSample = async () => {
    setLoading(true);
    try { await onLoadSample(); } catch { /* The caller reports cloud errors through the existing app notice. */ }
    finally { setLoading(false); }
  };

  return (
    <DashboardCard label="Get started" className="sm:col-span-2 xl:col-span-3">
      <div className="flex items-start gap-3"><span className="rounded-2xl bg-accent-soft p-3 text-accent-contrast"><Sparkles size={20} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-subtle">A fresh start</p><h2 className="mt-1 text-xl font-bold text-app-ink">Get started</h2><p className="mt-1 text-sm leading-5 text-app-subtle">Choose one small thing to track. You can build the rest over time.</p></div></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{actions.map(({ to, title, detail, icon: Icon, color }) => <Link key={to} to={to} className="flex min-h-16 items-center gap-3 rounded-2xl bg-app-bg p-3 transition-colors hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className={`rounded-xl bg-app-card p-2.5 ${color}`}><Icon size={18} /></span><span><span className="block text-sm font-semibold text-app-ink">{title}</span><span className="block text-xs text-app-subtle">{detail}</span></span></Link>)}</div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-app-border pt-4"><Button disabled={loading} onClick={() => void handleLoadSample()}><Sparkles size={16} />{loading ? 'Loading sample data…' : 'Load sample data'}</Button><p className="text-xs text-app-subtle">Sample data is added to your signed-in cloud account.</p></div>
    </DashboardCard>
  );
}

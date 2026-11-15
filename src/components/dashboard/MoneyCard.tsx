import { Eye, EyeOff, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/helpers';
import { DashboardCard } from './DashboardCard';

interface MoneyCardProps {
  income: number;
  spending: number;
  budget: number | null;
  toReceive: number;
  toPay: number;
  currency: string;
  hideAmounts: boolean;
  onToggleHideAmounts: () => void;
}

export function MoneyCard({ income, spending, budget, toReceive, toPay, currency, hideAmounts, onToggleHideAmounts }: MoneyCardProps) {
  const money = (value: number) => hideAmounts ? '••••••' : formatCurrency(value, currency);
  const budgetProgress = budget && budget > 0 ? Math.min(100, (spending / budget) * 100) : 0;

  return (
    <DashboardCard label="Money this month">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-subtle">This month</p><h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-app-ink"><Wallet size={18} className="text-cat-amber" />Money</h2></div>
        <button type="button" onClick={onToggleHideAmounts} aria-label={hideAmounts ? 'Show finance amounts' : 'Hide finance amounts'} aria-pressed={hideAmounts} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{hideAmounts ? <Eye size={18} /> : <EyeOff size={18} />}</button>
      </div>

      {budget !== null ? (
        hideAmounts ? <div className="mt-5 flex min-h-28 items-center justify-center rounded-2xl bg-app-bg p-4 text-center text-sm text-app-subtle">Monthly budget details are hidden.</div> :
        <div className="mt-5 rounded-2xl bg-app-bg p-4">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs text-app-subtle">Spent against your overall budget</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-app-ink">{money(spending)}</p></div><p className="text-sm font-semibold tabular-nums text-app-subtle">of {money(budget)}</p></div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-app-muted" role="progressbar" aria-label="Monthly spending against budget" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(budgetProgress)}><div className="h-full rounded-full bg-accent-contrast transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${budgetProgress}%` }} /></div>
          <p className="mt-2 text-xs text-app-subtle">{spending > budget ? 'You are over budget; take a look when convenient.' : 'Your monthly spending so far.'}</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-app-bg p-4"><p className="text-xs font-medium text-app-subtle">Income</p><p className="mt-1 truncate text-xl font-extrabold tabular-nums text-cat-green-ink">{money(income)}</p></div>
          <div className="rounded-2xl bg-app-bg p-4"><p className="text-xs font-medium text-app-subtle">Spending</p><p className="mt-1 truncate text-xl font-extrabold tabular-nums text-app-ink">{money(spending)}</p></div>
        </div>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-app-border pt-3 text-xs text-app-subtle">
        <span className="font-semibold text-app-ink">Loans</span><span>Receive {money(toReceive)}</span><span aria-hidden="true">·</span><span>Pay {money(toPay)}</span>
      </p>
      <Link to="/finances" className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Open Finances</Link>
    </DashboardCard>
  );
}

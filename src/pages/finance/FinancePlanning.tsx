import { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { BellRing, Check, Plus, Target, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Input, Modal, ProgressBar } from '../../components/ui';
import { useFinanceStore } from '../../stores/financeStore';
import type { FinanceBudget, SavingsContribution, SavingsGoal } from '../../types';
import { getTodayStr, roundMoney, sumMoney } from '../../utils/helpers';
import { FINANCE_EXPENSE_CATEGORIES } from './financeConstants';

const amountNumber = (value: string) => roundMoney(Number(value));
const money = (value: number, currency: string) => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
};

export function FinancePlanning({ month, hideAmounts = false, view = 'all' }: { month: string; hideAmounts?: boolean; view?: 'all' | 'budgets' | 'savings' }) {
  const finance = useFinanceStore();
  const [category, setCategory] = useState('Food & Snacks');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [overallAmount, setOverallAmount] = useState(finance.financeSettings.overallMonthlyBudget?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [goalModal, setGoalModal] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const [contributionDraft, setContributionDraft] = useState({ amount: '', walletId: '', date: getTodayStr(), note: '' });
  const [undo, setUndo] = useState<{ label: string; action: () => Promise<void> } | null>(null);
  const [error, setError] = useState('');
  const today = getTodayStr();
  const monthStart = `${month}-01`;
  const showMoney = (value: number) => hideAmounts ? '••••••' : money(value, finance.financeSettings.currency);
  const categories = useMemo(() => [...new Set([...FINANCE_EXPENSE_CATEGORIES, ...finance.transactions.filter((item) => item.type === 'expense').map((item) => item.category)])], [finance.transactions]);
  const monthlyExpenses = finance.transactions.filter((item) => item.type === 'expense' && item.date.startsWith(month));
  const categorySpend = (value: string) => sumMoney(monthlyExpenses.filter((item) => item.category.toLowerCase() === value.toLowerCase()).map((item) => item.amount));
  const selectedBudget = finance.budgets.find((item) => item.monthStart === monthStart && item.category.toLowerCase() === category.toLowerCase());
  const currentSeries = finance.recurringTransactionSeries.filter((item) => item.active);
  const upcoming = finance.transactions.filter((item) => item.type === 'expense' && item.recurringSeriesId && item.date >= today && item.date <= format(addDays(parseISO(today), 7), 'yyyy-MM-dd'))
    .sort((a, b) => a.date.localeCompare(b.date));
  const contributionsFor = (goalId: string) => finance.savingsContributions.filter((item) => item.goalId === goalId);
  const savedFor = (goalId: string) => sumMoney(contributionsFor(goalId).map((item) => item.amount));
  const saveOverall = async () => {
    setError(''); const value = overallAmount.trim() ? amountNumber(overallAmount) : null;
    if (value !== null && (!Number.isFinite(value) || value <= 0)) { setError('Overall budget must be greater than zero.'); return; }
    setBusy(true); try { await finance.saveSettings({ ...finance.financeSettings, overallMonthlyBudget: value }); setMessage('Overall monthly budget saved.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the overall budget.'); } finally { setBusy(false); }
  };
  const saveCategoryBudget = async () => {
    setError(''); const value = amountNumber(budgetAmount);
    if (!Number.isFinite(value) || value <= 0) { setError('Enter a category budget greater than zero.'); return; }
    setBusy(true); try { await finance.saveBudget({ monthStart, category, amount: value }); setBudgetAmount(''); setMessage(`${category} budget saved for ${format(parseISO(monthStart), 'MMMM')}.`); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save that budget.'); } finally { setBusy(false); }
  };
  const removeBudget = async (budget: FinanceBudget) => {
    try { await finance.removeBudget(budget.id); setUndo({ label: 'Budget removed', action: async () => { await finance.saveBudget({ monthStart: budget.monthStart, category: budget.category, amount: budget.amount }); } }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove the budget.'); }
  };
  const saveGoal = async () => {
    setError(''); const value = amountNumber(goalDraft.targetAmount);
    if (!goalDraft.name.trim() || !Number.isFinite(value) || value <= 0) { setError('Enter a name and a target above zero.'); return; }
    try { await finance.addSavingsGoal({ name: goalDraft.name.trim(), targetAmount: value, targetDate: goalDraft.targetDate || null }); setGoalModal(false); setGoalDraft({ name: '', targetAmount: '', targetDate: '' }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create the savings goal.'); }
  };
  const saveContribution = async () => {
    setError(''); const value = amountNumber(contributionDraft.amount);
    if (!contributionGoal || !contributionDraft.walletId || !Number.isFinite(value) || value <= 0) { setError('Choose a wallet and enter an amount above zero.'); return; }
    try { const contribution = await finance.addSavingsContribution({ goalId: contributionGoal.id, walletId: contributionDraft.walletId, amount: value, date: contributionDraft.date, note: contributionDraft.note.trim() }); setUndo({ label: 'Savings contribution added', action: async () => { await finance.removeSavingsContribution(contribution.id); } }); setContributionGoal(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add this contribution.'); }
  };
  const deleteGoal = async (goal: SavingsGoal) => {
    if (!window.confirm(`Delete “${goal.name}” and its contribution history?`)) return;
    const contributions = contributionsFor(goal.id);
    try { await finance.removeSavingsGoal(goal.id); setUndo({ label: 'Savings goal deleted', action: async () => { await finance.restoreSavingsGoal(goal); for (const item of contributions) await finance.restoreSavingsContribution(item); } }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete this goal.'); }
  };

  return <div className="space-y-5">
    {view !== 'savings' && <section className="space-y-3"><div><h2 className="text-lg font-bold text-app-ink">Budgets · {format(parseISO(monthStart), 'MMMM yyyy')}</h2><p className="text-sm text-app-subtle">Loans, transfers and savings contributions do not count as spending.</p></div>
      <Card className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Input label="Overall monthly budget" type="number" min="0.01" step="0.01" value={overallAmount} onChange={(event) => setOverallAmount(event.target.value)} placeholder="Optional"/><p className="mt-1 text-xs text-app-subtle">Used to estimate how much is safe to spend each day.</p></div><Button onClick={() => void saveOverall()} disabled={busy}>Save overall</Button></div><div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end"><label className="block"><span className="mb-1.5 block text-sm font-semibold text-app-ink">Expense category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><Input label="Monthly limit" type="number" min="0.01" step="0.01" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} placeholder={selectedBudget ? String(selectedBudget.amount) : '0.00'}/><Button variant="secondary" onClick={() => void saveCategoryBudget()} disabled={busy}><Plus size={16}/>{selectedBudget ? 'Update' : 'Set budget'}</Button></div>
        {finance.budgets.filter((item) => item.monthStart === monthStart).length === 0 ? <p className="rounded-xl border border-dashed border-app-border p-4 text-center text-sm text-app-subtle">No category budgets for this month yet.</p> : <div className="space-y-3">{finance.budgets.filter((item) => item.monthStart === monthStart).map((budget) => { const spent = categorySpend(budget.category); const progress = budget.amount > 0 ? spent / budget.amount * 100 : 0; const color = progress >= 100 ? 'red' : progress >= 80 ? 'amber' : 'emerald'; return <div key={budget.id} className="rounded-xl border border-app-border p-3"><div className="flex items-center justify-between gap-2"><div><p className="font-semibold text-app-ink">{budget.category}</p><p className="text-xs text-app-subtle">{showMoney(spent)} spent of {showMoney(budget.amount)}</p></div><div className="flex items-center gap-2"><Badge variant={progress >= 100 ? 'red' : progress >= 80 ? 'amber' : 'emerald'}>{progress >= 100 ? 'Over limit' : progress >= 80 ? 'Near limit' : 'On track'}</Badge><button type="button" aria-label={`Remove ${budget.category} budget`} onClick={() => void removeBudget(budget)} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={15}/></button></div></div><div className="mt-2"><ProgressBar value={Math.min(progress, 100)} color={color} showLabel={false}/></div></div>; })}</div>}
      </Card>
    </section>}

    {view !== 'savings' && <section className="space-y-3"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-app-ink">Recurring & upcoming</h2><p className="text-sm text-app-subtle">Repeating templates generate unique entries for the next 30 days.</p></div></div>
      <Card className="p-4 sm:p-5"><div className="flex items-center gap-2"><BellRing size={18} className="text-accent"/><h3 className="font-bold text-app-ink">Upcoming bills · 7 days</h3></div>{upcoming.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-app-border p-4 text-center text-sm text-app-subtle">Nothing due in the next week.</p> : <div className="mt-3 space-y-2">{upcoming.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-app-bg p-3"><span className="min-w-[3rem] rounded-lg bg-accent-soft px-2 py-1 text-center text-xs font-bold text-app-ink">{format(parseISO(item.date), 'MMM d')}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-app-ink">{item.description || item.category}</span><span className="text-sm font-bold text-app-ink">{showMoney(item.amount)}</span></div>)}</div>}
        <h3 className="mt-5 font-bold text-app-ink">Schedules</h3>{currentSeries.length === 0 ? <p className="mt-2 text-sm text-app-subtle">Use Add transaction → More options → Repeat to create a schedule.</p> : <div className="mt-3 space-y-2">{currentSeries.map((series) => <div key={series.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-app-border p-3"><div className="min-w-0 flex-1"><p className="truncate font-semibold text-app-ink">{series.description || series.category}</p><p className="text-xs capitalize text-app-subtle">{series.frequency} · starts {format(parseISO(series.startsOn), 'MMM d')}{series.endsOn ? ` · ends ${format(parseISO(series.endsOn), 'MMM d')}` : ''} · {showMoney(series.amount)}</p></div><Button size="sm" variant="secondary" onClick={() => { void finance.stopRecurringSeries(series.id).then(() => setMessage('Repeating schedule stopped.')).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not stop the schedule.')); }}>Stop repeating</Button></div>)}</div>}
      </Card>
    </section>}

    {view !== 'budgets' && <section className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-app-ink">Savings goals</h2><p className="text-sm text-app-subtle">Contributions move money from a wallet, not into expenses.</p></div><Button onClick={() => { setGoalDraft({ name: '', targetAmount: '', targetDate: '' }); setGoalModal(true); }}><Plus size={16}/>New goal</Button></div>
      {finance.savingsGoals.length === 0 ? <Card className="p-7 text-center"><Target size={27} className="mx-auto text-cat-indigo"/><p className="mt-2 font-semibold text-app-ink">Start with one thing you’re saving for</p><p className="mt-1 text-sm text-app-subtle">Your progress appears on the Dashboard too.</p></Card> : <div className="grid gap-3 md:grid-cols-2">{finance.savingsGoals.map((goal) => { const saved = savedFor(goal.id); const progress = Math.min(100, goal.targetAmount ? saved / goal.targetAmount * 100 : 0); return <Card key={goal.id} className="p-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cat-indigo/10 text-cat-indigo"><Target size={19}/></span><div className="min-w-0 flex-1"><p className="truncate font-bold text-app-ink">{goal.name}</p><p className="text-xs text-app-subtle">{showMoney(saved)} of {showMoney(goal.targetAmount)}{goal.targetDate ? ` · by ${format(parseISO(goal.targetDate), 'MMM d, yyyy')}` : ''}</p></div><button type="button" aria-label={`Delete ${goal.name}`} onClick={() => void deleteGoal(goal)} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={15}/></button></div><div className="mt-3"><ProgressBar value={progress} color="purple" showLabel/></div><div className="mt-3 flex justify-end"><Button size="sm" variant="secondary" onClick={() => { setContributionGoal(goal); setContributionDraft({ amount: '', walletId: finance.wallets.find((item) => !item.archivedAt)?.id ?? '', date: today, note: '' }); setError(''); }}>Add contribution</Button></div></Card>; })}</div>}
      {finance.savingsContributions.length > 0 && <Card className="p-4"><h3 className="font-semibold text-app-ink">Recent contributions</h3><div className="mt-2 space-y-2">{finance.savingsContributions.slice(0, 5).map((item: SavingsContribution) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-app-subtle">{finance.savingsGoals.find((goal) => goal.id === item.goalId)?.name} · {format(parseISO(item.date), 'MMM d')}</span><b className="text-app-ink">{showMoney(item.amount)}</b></div>)}</div></Card>}
    </section>}
    {(error || message) && <p role={error ? 'alert' : 'status'} className={`rounded-xl px-3 py-2 text-sm ${error ? 'bg-accent-soft text-accent-strong' : 'bg-cat-green/10 text-cat-green-ink'}`}>{error || message}</p>}
    {undo && <div role="status" className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-app-border bg-app-card px-4 py-3 text-sm text-app-ink shadow-card-hover">{undo.label}<button type="button" onClick={() => { const action = undo.action; setUndo(null); void action(); }} className="font-bold underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Undo</button><button type="button" aria-label="Dismiss" onClick={() => setUndo(null)}>×</button></div>}
    <Modal isOpen={goalModal} onClose={() => setGoalModal(false)} title="Create a savings goal"><div className="space-y-4"><Input label="Name" value={goalDraft.name} onChange={(event) => setGoalDraft({ ...goalDraft, name: event.target.value })} placeholder="e.g. New laptop"/><Input label="Target amount" type="number" min="0.01" step="0.01" value={goalDraft.targetAmount} onChange={(event) => setGoalDraft({ ...goalDraft, targetAmount: event.target.value })}/><Input label="Target date (optional)" type="date" value={goalDraft.targetDate} onChange={(event) => setGoalDraft({ ...goalDraft, targetDate: event.target.value })}/>{error && <p role="alert" className="text-sm text-accent-strong">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setGoalModal(false)}>Cancel</Button><Button onClick={() => void saveGoal()}><Check size={16}/>Create goal</Button></div></div></Modal>
    <Modal isOpen={Boolean(contributionGoal)} onClose={() => setContributionGoal(null)} title={contributionGoal ? `Contribute to ${contributionGoal.name}` : 'Add contribution'}><div className="space-y-4">{finance.wallets.filter((item) => !item.archivedAt).length === 0 ? <p className="rounded-xl bg-cat-amber/10 p-3 text-sm text-app-ink">Create a wallet before adding a contribution.</p> : <label className="block"><span className="mb-1 block text-sm font-semibold text-app-ink">From wallet</span><select value={contributionDraft.walletId} onChange={(event) => setContributionDraft({ ...contributionDraft, walletId: event.target.value })} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{finance.wallets.filter((item) => !item.archivedAt).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}<Input label="Amount" type="number" min="0.01" step="0.01" value={contributionDraft.amount} onChange={(event) => setContributionDraft({ ...contributionDraft, amount: event.target.value })}/><Input label="Date" type="date" value={contributionDraft.date} onChange={(event) => setContributionDraft({ ...contributionDraft, date: event.target.value })}/><Input label="Note (optional)" value={contributionDraft.note} onChange={(event) => setContributionDraft({ ...contributionDraft, note: event.target.value })}/>{error && <p role="alert" className="text-sm text-accent-strong">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setContributionGoal(null)}>Cancel</Button><Button onClick={() => void saveContribution()} disabled={finance.wallets.filter((item) => !item.archivedAt).length === 0}>Add contribution</Button></div></div></Modal>
  </div>;
}

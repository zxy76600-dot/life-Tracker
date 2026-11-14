import { useMemo, useState } from 'react';
import { format, getDaysInMonth, parseISO } from 'date-fns';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, CalendarDays, ChevronDown, CircleHelp, Edit3, Eye, EyeOff, Plus, Search, Trash2, Wallet as WalletIcon } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Modal } from '../components/ui';
import { useFinanceStore } from '../stores/financeStore';
import type { Loan, Transaction } from '../types';
import { formatDate, getTodayStr, roundMoney, sumMoney } from '../utils/helpers';
import { FinanceAnalytics } from './finance/FinanceAnalytics';
import { LoansPanel } from './finance/LoansPanel';
import { FinancePlanning } from './finance/FinancePlanning';
import { FINANCE_EXPENSE_CATEGORIES, FINANCE_INCOME_CATEGORIES } from './finance/financeConstants';
import { FinancePreferences } from './finance/FinancePreferences';
import { downloadCsv } from './finance/csvTools';

const walletDefaults = ['Cash', 'UPI / Bank'];
const amountValue = (value: string) => roundMoney(Number(value));
const todayMonth = () => format(new Date(), 'yyyy-MM');
const currencyText = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount); }
};
const categoryTint = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes('food') || value.includes('snack')) return 'bg-cat-amber/15 text-cat-amber-ink';
  if (value.includes('rent') || value.includes('fee')) return 'bg-cat-indigo/15 text-cat-indigo';
  if (value.includes('book') || value.includes('college')) return 'bg-cat-blue/15 text-cat-blue';
  if (value.includes('health')) return 'bg-cat-green/15 text-cat-green-ink';
  if (value.includes('travel') || value.includes('transport')) return 'bg-cat-teal/15 text-cat-teal';
  return 'bg-accent-soft text-app-ink';
};

type TxDraft = { type: 'expense' | 'income'; amount: string; category: string; description: string; date: string; walletId: string };
const emptyDraft = (): TxDraft => ({ type: 'expense', amount: '', category: '', description: '', date: getTodayStr(), walletId: '' });

export default function Finances() {
  const finance = useFinanceStore();
  const { transactions, wallets, transfers, loans, loanPayments, savingsContributions, financeSchemaAvailable } = finance;
  const [month, setMonth] = useState(todayMonth());
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'date' | 'amount'>('date');
  const [tab, setTab] = useState<'transactions' | 'loans' | 'budgets' | 'savings'>('transactions');
  const [modal, setModal] = useState<'transaction' | 'wallet' | 'transfer' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TxDraft>(emptyDraft());
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [splitPeople, setSplitPeople] = useState<Array<{ person: string; amount: string }>>([{ person: '', amount: '' }]);
  const [splitDueDate, setSplitDueDate] = useState('');
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [repeatEndsOn, setRepeatEndsOn] = useState('');
  const [walletDraft, setWalletDraft] = useState({ name: '', openingBalance: '' });
  const [walletEditId, setWalletEditId] = useState<string | null>(null);
  const [transferDraft, setTransferDraft] = useState({ from: '', to: '', amount: '', date: getTodayStr(), note: '' });
  const [undo, setUndo] = useState<{ message: string; run: () => Promise<void> } | null>(null);
  const [hideAmounts, setHideAmounts] = useState(() => localStorage.getItem('life-tracker-finance-hide-amounts') === 'true');
  const [error, setError] = useState('');
  const isHidden = (value: number) => hideAmounts ? '••••••' : currencyText(value, finance.financeSettings.currency);
  const selectedMonth = `${month}-01`;
  const monthTransactions = useMemo(() => transactions.filter((item) => item.date.startsWith(month)), [transactions, month]);
  const monthlyIncome = sumMoney(monthTransactions.filter((item) => item.type === 'income').map((item) => item.amount));
  const monthlyExpenses = sumMoney(monthTransactions.filter((item) => item.type === 'expense').map((item) => item.amount));
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const today = getTodayStr();
  const daysLeft = Math.max(1, getDaysInMonth(new Date()) - Number(format(new Date(), 'd')) + 1);
  const spentSoFar = sumMoney(monthTransactions.filter((item) => item.type === 'expense' && item.date <= today).map((item) => item.amount));
  const safeToSpendToday = finance.financeSettings.overallMonthlyBudget == null || month !== todayMonth()
    ? null : (finance.financeSettings.overallMonthlyBudget - spentSoFar) / daysLeft;
  const filtered = useMemo(() => transactions.filter((item) => item.date.startsWith(month)
    && (filter === 'all' || item.type === filter)
    && (!query.trim() || `${item.description} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()))
  ).sort((a, b) => sort === 'date' ? b.date.localeCompare(a.date) : b.amount - a.amount), [transactions, month, filter, query, sort]);
  const walletBalance = (walletId: string) => {
    const wallet = wallets.find((item) => item.id === walletId);
    const incomeExpense = sumMoney(transactions.filter((item) => item.walletId === walletId && item.date <= today).map((item) => item.type === 'income' ? item.amount : -item.amount));
    const transferAmount = sumMoney(transfers.filter((item) => item.date <= today).map((item) => item.toWalletId === walletId ? item.amount : item.fromWalletId === walletId ? -item.amount : 0));
    const loanAmount = sumMoney(loans.filter((item) => item.walletId === walletId && item.date <= today).map((loan) => {
      const principal = loan.direction === 'lent' ? -loan.amount : loan.amount;
      const repayments = sumMoney(loanPayments.filter((payment) => payment.loanId === loan.id && payment.walletId === walletId && payment.date <= today).map((payment) => loan.direction === 'lent' ? payment.amount : -payment.amount));
      return principal + repayments;
    }));
    const savingsAmount = sumMoney(savingsContributions.filter((item) => item.walletId === walletId && item.date <= today).map((item) => item.amount));
    return roundMoney((wallet?.openingBalance ?? 0) + incomeExpense + transferAmount + loanAmount - savingsAmount);
  };
  const openTransaction = (transaction?: Transaction) => {
    setError(''); setEditId(transaction?.id ?? null);
    setSplitEnabled(false); setSplitMode('equal'); setSplitPeople([{ person: '', amount: '' }]); setSplitDueDate('');
    setRepeatEnabled(false); setRepeatFrequency('monthly'); setRepeatEndsOn('');
    setDraft(transaction ? { type: transaction.type, amount: String(transaction.amount), category: transaction.category, description: transaction.description, date: transaction.date, walletId: transaction.walletId ?? '' } : { ...emptyDraft(), date: getTodayStr(), walletId: wallets.find((item) => !item.archivedAt)?.id ?? '' });
    setModal('transaction');
  };
  const submitTransaction = async () => {
    setError('');
    const amount = amountValue(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError('Enter an amount greater than zero.'); return; }
    if (!draft.category) { setError('Choose a category.'); return; }
    if (!draft.date) { setError('Choose a transaction date.'); return; }
    if (financeSchemaAvailable && !draft.walletId) { setError('Choose a wallet. Add one in the Wallets card if needed.'); return; }
    let split = { ownAmount: amount, shares: [] as Array<{ person: string; amount: number; dueDate: string | null }> };
    if (splitEnabled && !editId) {
      if (draft.type !== 'expense') { setError('Bill splitting is available for expenses.'); return; }
      if (splitPeople.length === 0 || splitPeople.some((item) => !item.person.trim())) { setError('Add a name for each person in the split.'); return; }
      if (splitMode === 'equal') {
        const perPerson = Math.floor((amount / (splitPeople.length + 1)) * 100) / 100;
        split = { ownAmount: Math.round((amount - perPerson * splitPeople.length) * 100) / 100, shares: splitPeople.map((item) => ({ person: item.person.trim(), amount: perPerson, dueDate: splitDueDate || null })) };
      } else {
        const shares = splitPeople.map((item) => ({ person: item.person.trim(), amount: amountValue(item.amount), dueDate: splitDueDate || null }));
        const friendsTotal = sumMoney(shares.map((item) => item.amount));
        split = { ownAmount: Math.round((amount - friendsTotal) * 100) / 100, shares };
      }
      if (!Number.isFinite(split.ownAmount) || split.ownAmount <= 0 || split.shares.some((item) => !Number.isFinite(item.amount) || item.amount <= 0)) { setError('Friend shares must be positive and leave a positive amount for your share.'); return; }
    }
    try {
      if (editId) {
        const previous = transactions.find((item) => item.id === editId);
        const linkedSplit = loans.some((loan) => loan.linkedTransactionId === editId);
        if (linkedSplit && !window.confirm('This expense is linked to split loans. Changing its amount or date will not change the loans. Continue?')) return;
        await finance.updateTransaction(editId, { type: draft.type, amount, category: draft.category, description: draft.description.trim(), date: draft.date, ...(financeSchemaAvailable ? { walletId: draft.walletId || null } : {}) });
        if (previous) setUndo({ message: 'Transaction updated', run: async () => { await finance.updateTransaction(previous.id, previous); } });
      } else {
        const values = { type: draft.type, amount, category: draft.category, description: draft.description.trim(), date: draft.date, ...(financeSchemaAvailable ? { walletId: draft.walletId || null } : {}) };
        if (repeatEnabled) {
          const series = await finance.addRecurringSeries({ ...values, type: draft.type, amount, category: draft.category, description: draft.description.trim(), walletId: financeSchemaAvailable ? draft.walletId || null : null, frequency: repeatFrequency, startsOn: draft.date, endsOn: repeatEndsOn || null, active: true });
          setUndo({ message: 'Repeating transaction added', run: async () => { const generated = finance.transactions.filter((item) => item.recurringSeriesId === series.id); for (const item of generated) await finance.removeTransaction(item.id); await finance.removeRecurringSeries(series.id); } });
        } else if (splitEnabled) {
          const created = await finance.addSplitExpense({ ...values, amount: split.ownAmount, walletId: draft.walletId || null }, amount, split.shares);
          setUndo({ message: 'Split expense added', run: async () => { for (const loan of created.loans) await finance.removeLoan(loan.id); await finance.removeTransaction(created.transaction.id); } });
        } else {
          const created = await finance.addTransaction(values);
          setUndo({ message: 'Transaction added', run: async () => { await finance.removeTransaction(created.id); } });
        }
      }
      setModal(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this transaction.'); }
  };
  const deleteTx = async (transaction: Transaction) => {
    const linked = loans.filter((loan) => loan.linkedTransactionId === transaction.id);
    if (linked.length && !window.confirm(`This expense has ${linked.length} linked split loan${linked.length === 1 ? '' : 's'}. Delete the expense and its linked loans?`)) return;
    try {
      const deletedLoans: Loan[] = [];
      const deletedPayments = [] as typeof loanPayments;
      for (const loan of linked) for (const payment of loanPayments.filter((item) => item.loanId === loan.id)) {
        const removedPayment = await finance.removeLoanPayment(payment.id); if (removedPayment) deletedPayments.push(removedPayment);
      }
      for (const loan of linked) { const removed = await finance.removeLoan(loan.id); if (removed) deletedLoans.push(removed); }
      const deleted = await finance.removeTransaction(transaction.id);
      if (deleted) setUndo({ message: 'Transaction deleted', run: async () => { await finance.restoreTransaction(deleted); for (const loan of deletedLoans) await finance.restoreLoan(loan); for (const payment of deletedPayments) await finance.restoreLoanPayment(payment); } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the transaction.'); }
  };
  const submitWallet = async () => {
    setError(''); if (!walletDraft.name.trim()) { setError('Enter a wallet name.'); return; }
    try {
      if (walletEditId) await finance.updateWallet(walletEditId, { name: walletDraft.name.trim(), openingBalance: amountValue(walletDraft.openingBalance || '0') });
      else await finance.addWallet({ name: walletDraft.name.trim(), openingBalance: amountValue(walletDraft.openingBalance || '0') });
      setModal(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this wallet.'); }
  };
  const submitTransfer = async () => {
    setError(''); const amount = amountValue(transferDraft.amount);
    if (!transferDraft.from || !transferDraft.to || transferDraft.from === transferDraft.to || amount <= 0) { setError('Choose two different wallets and enter a positive amount.'); return; }
    try {
      const item = await finance.addTransfer({ fromWalletId: transferDraft.from, toWalletId: transferDraft.to, amount, date: transferDraft.date, note: transferDraft.note.trim() });
      setUndo({ message: 'Transfer saved', run: async () => { await finance.removeTransfer(item.id); } }); setModal(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this transfer.'); }
  };
  const createDefaults = async () => {
    try { for (const name of walletDefaults) await finance.addWallet({ name, openingBalance: 0 }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create default wallets.'); }
  };
  const toggleHideAmounts = () => {
    const next = !hideAmounts; setHideAmounts(next); localStorage.setItem('life-tracker-finance-hide-amounts', String(next));
  };
  const exportTransactions = () => downloadCsv(`life-tracker-transactions-${month}.csv`, [
    ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Description', 'Wallet'],
    ...monthTransactions.map((item) => [item.date, item.type, item.amount.toFixed(2), finance.financeSettings.currency, item.category, item.description, wallets.find((wallet) => wallet.id === item.walletId)?.name ?? '']),
  ]);
  const exportLoans = () => downloadCsv('life-tracker-loans-and-repayments.csv', [
    ['Record', 'Loan ID', 'Direction', 'Person', 'Loan amount', 'Remaining', 'Loan date', 'Due date', 'Repayment amount', 'Repayment date', 'Repayment note', 'Currency'],
    ...loans.flatMap((loan) => {
      const paid = sumMoney(loanPayments.filter((item) => item.loanId === loan.id).map((item) => item.amount));
      const base = ['Loan', loan.id, loan.direction, loan.person, loan.amount.toFixed(2), Math.max(0, loan.amount - paid).toFixed(2), loan.date, loan.dueDate ?? '', '', '', '', finance.financeSettings.currency];
      const payments = loanPayments.filter((item) => item.loanId === loan.id).map((item) => ['Repayment', loan.id, loan.direction, loan.person, loan.amount.toFixed(2), Math.max(0, loan.amount - paid).toFixed(2), loan.date, loan.dueDate ?? '', item.amount.toFixed(2), item.date, item.note, finance.financeSettings.currency]);
      return [base, ...payments];
    }),
  ]);
  const currentCategories = draft.type === 'income' ? FINANCE_INCOME_CATEGORIES : FINANCE_EXPENSE_CATEGORIES;
  const visibleWallets = wallets.filter((wallet) => !wallet.archivedAt);

  return (
    <div className="space-y-5 pb-24 sm:space-y-6 lg:pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-app-subtle">Your money, made clearer</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-app-ink sm:text-3xl">Finances</h1></div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={toggleHideAmounts} aria-label={hideAmounts ? 'Show amounts' : 'Hide amounts'}>{hideAmounts ? <Eye size={17} /> : <EyeOff size={17} />}<span className="hidden sm:inline">{hideAmounts ? 'Show amounts' : 'Hide amounts'}</span></Button>
          <Button variant="secondary" size="sm" className="hidden sm:inline-flex" onClick={exportTransactions}>Transactions CSV</Button>
          <Button variant="secondary" size="sm" className="hidden sm:inline-flex" onClick={exportLoans}>Loans CSV</Button>
          <Button className="hidden sm:inline-flex" onClick={() => openTransaction()}><Plus size={17} />Add transaction</Button>
        </div>
      </div>

      {!financeSchemaAvailable && <Card className="border-cat-amber/40 bg-cat-amber/10"><p className="font-semibold text-app-ink">Finance upgrade migration pending</p><p className="mt-1 text-sm text-app-subtle">Your existing transactions still work. Apply <code>20261115000100_life_tracker_finance_upgrade.sql</code> to enable wallets, loans, budgets, recurring transactions and savings.</p></Card>}

      <div className="flex gap-2 overflow-x-auto rounded-card bg-app-muted p-1 lg:hidden" role="tablist" aria-label="Finance sections">
        {(['transactions', 'loans', 'budgets', 'savings'] as const).map((key) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`min-h-10 shrink-0 rounded-card px-4 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${tab === key ? 'bg-app-card text-app-ink shadow-card' : 'text-app-subtle'}`}>{key}</button>)}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Monthly totals">
        {[['Income', monthlyIncome, 'text-cat-green-ink'], ['Expenses', monthlyExpenses, 'text-accent-strong'], ['Monthly result', monthlyIncome - monthlyExpenses, monthlyIncome >= monthlyExpenses ? 'text-cat-green-ink' : 'text-accent-strong'], ['Savings rate', savingsRate, 'text-cat-indigo']].map(([label, value, color]) => <Card key={String(label)} className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">{label}</p><p className={`mt-2 text-2xl font-extrabold tabular-nums ${color}`}>{label === 'Savings rate' ? `${hideAmounts ? '••••' : `${Number(value).toFixed(1)}%`}` : isHidden(Number(value))}</p></Card>)}
        <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">Month</p><label className="mt-2 flex items-center gap-2"><CalendarDays size={17} className="text-accent"/><input aria-label="Select month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="min-h-9 min-w-0 bg-transparent text-lg font-bold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label></Card>
        {safeToSpendToday !== null && <Card className="border-cat-teal/25 bg-cat-teal/5 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">Safe to spend today</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-cat-teal">{isHidden(safeToSpendToday)}</p><p className="mt-1 text-xs text-app-subtle">Budget minus spending so far, shared across {daysLeft} days left.</p></Card>}
      </section>
      <div className="grid grid-cols-2 gap-2 sm:hidden"><Button size="sm" variant="secondary" onClick={exportTransactions}>Transactions CSV</Button><Button size="sm" variant="secondary" onClick={exportLoans}>Loans CSV</Button></div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]">
        <section className={`${tab !== 'transactions' ? 'hidden lg:block' : ''} min-w-0 space-y-4`}>
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-app-ink">Transactions</h2><p className="text-sm text-app-subtle">{filtered.length} in {format(parseISO(selectedMonth), 'MMMM yyyy')}</p></div><Button onClick={() => openTransaction()}><Plus size={17} />Add transaction</Button></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <label className="relative"><span className="sr-only">Search transactions</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search description or category" className="min-h-10 w-full rounded-card border border-app-border bg-app-bg pl-9 pr-3 text-sm text-app-ink placeholder:text-app-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label>
              <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filter transaction type" className="min-h-10 rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="all">All</option><option value="income">Income</option><option value="expense">Expense</option></select>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort transactions" className="min-h-10 rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="date">Newest date</option><option value="amount">Largest amount</option></select>
            </div>
          </Card>
          {filtered.length === 0 ? <EmptyState icon={Banknote} title="No transactions for this view" description="Try another month or add your first transaction." action={<Button onClick={() => openTransaction()}><Plus size={17} />Add transaction</Button>} /> : <div className="space-y-2">{filtered.map((item) => <Card key={item.id} className="p-4 transition-shadow hover:shadow-card-hover"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryTint(item.category)}`}>{item.type === 'income' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="max-w-full truncate font-semibold text-app-ink">{item.description || item.category}</p><Badge variant={item.type === 'income' ? 'emerald' : 'blue'}>{item.category}</Badge></div><p className="mt-1 truncate text-xs text-app-subtle">{formatDate(item.date)}{wallets.find((wallet) => wallet.id === item.walletId) ? ` · ${wallets.find((wallet) => wallet.id === item.walletId)?.name}` : ''}{item.recurringSeriesId ? ' · Repeating' : ''}</p></div><span className={`whitespace-nowrap text-sm font-bold tabular-nums ${item.type === 'income' ? 'text-cat-green-ink' : 'text-app-ink'}`}>{item.type === 'income' ? '+' : '−'}{isHidden(item.amount)}</span><div className="flex shrink-0"><button type="button" title="Edit transaction" aria-label="Edit transaction" onClick={() => openTransaction(item)} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Edit3 size={16}/></button><button type="button" title="Delete transaction" aria-label="Delete transaction" onClick={() => void deleteTx(item)} className="rounded-lg p-2 text-app-subtle hover:bg-accent-soft hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={16}/></button></div></div></Card>)}</div>}
        </section>

        <aside className={`${tab !== 'transactions' ? 'hidden lg:block' : ''} min-w-0 space-y-4`}>
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-app-ink">Wallets</h2><p className="text-xs text-app-subtle">Current balance by wallet</p></div>{financeSchemaAvailable && <div className="flex gap-1"><button type="button" aria-label="Transfer between wallets" onClick={() => { setError(''); setTransferDraft({ from: visibleWallets[0]?.id ?? '', to: visibleWallets[1]?.id ?? '', amount: '', date: getTodayStr(), note: '' }); setModal('transfer'); }} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ArrowLeftRight size={17}/></button><button type="button" aria-label="Add wallet" onClick={() => { setWalletDraft({ name: '', openingBalance: '' }); setWalletEditId(null); setModal('wallet'); }} className="rounded-lg p-2 text-accent-strong hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Plus size={18}/></button></div>}</div>
            {wallets.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-app-border p-4 text-center"><WalletIcon size={23} className="mx-auto text-app-subtle"/><p className="mt-2 text-sm text-app-subtle">Add Cash and UPI / Bank wallets to track where money moves.</p>{financeSchemaAvailable && <Button className="mt-3" variant="secondary" onClick={() => void createDefaults()}>Create default wallets</Button>}</div> : <div className="mt-3 space-y-2">{wallets.map((wallet) => <div key={wallet.id} className={`rounded-xl border border-app-border p-3 ${wallet.archivedAt ? 'opacity-60' : ''}`}><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cat-indigo/10 text-cat-indigo"><WalletIcon size={18}/></div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-app-ink">{wallet.name}{wallet.archivedAt && <span className="ml-1 text-xs font-normal">· archived</span>}</p><p className="text-xs text-app-subtle">{wallet.archivedAt ? 'History kept' : 'Available balance'}</p></div><b className="text-sm tabular-nums text-app-ink">{isHidden(walletBalance(wallet.id))}</b>{!wallet.archivedAt && <button type="button" aria-label={`Edit ${wallet.name}`} onClick={() => { setWalletEditId(wallet.id); setWalletDraft({ name: wallet.name, openingBalance: String(wallet.openingBalance) }); setError(''); setModal('wallet'); }} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Edit3 size={15}/></button>}{!wallet.archivedAt && <button type="button" aria-label={`Archive ${wallet.name}`} onClick={() => { void finance.updateWallet(wallet.id, { archivedAt: new Date().toISOString() }); }} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ChevronDown size={16}/></button>}{wallet.archivedAt && <button type="button" aria-label={`Restore ${wallet.name}`} onClick={() => { void finance.updateWallet(wallet.id, { archivedAt: null }); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Restore</button>}</div></div>)}</div>}
            {transfers.length > 0 && <div className="mt-4 border-t border-app-border pt-3"><p className="text-xs font-bold uppercase tracking-wide text-app-subtle">Recent transfers</p><div className="mt-2 space-y-2">{transfers.slice(0, 5).map((transfer) => <div key={transfer.id} className="flex items-center gap-2 text-xs"><span className="min-w-0 flex-1 truncate text-app-subtle">{wallets.find((wallet) => wallet.id === transfer.fromWalletId)?.name} → {wallets.find((wallet) => wallet.id === transfer.toWalletId)?.name} · {formatDate(transfer.date)}</span><b className="text-app-ink">{isHidden(transfer.amount)}</b><button type="button" aria-label="Undo transfer" onClick={() => { void finance.removeTransfer(transfer.id).then((removed) => removed && setUndo({ message: 'Transfer deleted', run: async () => { await finance.restoreTransfer(removed); } })).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not undo transfer.')); }} className="rounded p-1 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={13}/></button></div>)}</div></div>}
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-app-subtle"><CircleHelp size={15} className="mt-0.5 shrink-0"/>Balance = opening balance + income − expenses + transfers + loan movements − savings contributions.</p>
          </Card>
          <FinanceAnalytics transactions={transactions} month={month} currency={finance.financeSettings.currency} hideAmounts={hideAmounts} />
          {financeSchemaAvailable && <FinancePreferences/>}
        </aside>

        <section className={`${tab !== 'loans' ? 'hidden lg:block' : ''} xl:col-span-2`}>{financeSchemaAvailable ? <LoansPanel hideAmounts={hideAmounts}/> : <Card><h2 className="text-lg font-bold text-app-ink">Loans</h2><p className="mt-2 text-sm text-app-subtle">Apply the finance migration to enable cloud loan tracking.</p></Card>}</section>
        <section className={`${tab !== 'budgets' && tab !== 'savings' ? 'hidden lg:block' : ''} xl:col-span-2`}>{financeSchemaAvailable ? <FinancePlanning month={month} hideAmounts={hideAmounts} view={tab === 'budgets' || tab === 'savings' ? tab : 'all'}/> : <Card><h2 className="text-lg font-bold text-app-ink">Budgets and savings</h2><p className="mt-2 text-sm text-app-subtle">Apply the finance migration to save budgets, recurring transactions and goals.</p></Card>}</section>
      </div>

      <button type="button" aria-label="Add transaction" onClick={() => openTransaction()} className="fixed bottom-20 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent-contrast text-white shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg sm:hidden"><Plus size={24}/></button>
      {undo && <div role="status" className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-app-border bg-app-card px-4 py-3 text-sm text-app-ink shadow-card-hover"><span>{undo.message}</span><button type="button" onClick={() => { const action = undo.run; setUndo(null); void action(); }} className="font-bold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Undo</button><button type="button" aria-label="Dismiss" onClick={() => setUndo(null)} className="rounded p-1 text-app-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">×</button></div>}

      <Modal isOpen={modal === 'transaction'} onClose={() => setModal(null)} title={editId ? 'Edit transaction' : 'Add transaction'}>
        <div className="space-y-4">
          {editId && transactions.find((item) => item.id === editId)?.recurringSeriesId && <p className="rounded-lg bg-cat-indigo/10 px-3 py-2 text-xs leading-relaxed text-app-ink"><b>This one only.</b> Edits here change this occurrence; the schedule continues. Stop it from the Recurring &amp; upcoming section.</p>}
          <div className="grid grid-cols-2 rounded-xl bg-app-muted p-1" role="group" aria-label="Transaction type">{(['expense', 'income'] as const).map((type) => <button key={type} type="button" aria-pressed={draft.type === type} onClick={() => setDraft({ ...draft, type, category: '' })} className={`min-h-10 rounded-lg text-sm font-bold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${draft.type === type ? 'bg-app-card text-app-ink shadow-card' : 'text-app-subtle'}`}>{type}</button>)}</div>
          <Input label="Amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} autoFocus />
          <fieldset><legend className="mb-2 text-sm font-semibold text-app-ink">Category</legend><div className="flex flex-wrap gap-2">{currentCategories.map((category) => <button type="button" key={category} aria-pressed={draft.category === category} onClick={() => setDraft({ ...draft, category })} className={`min-h-9 rounded-full px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${draft.category === category ? 'bg-accent-contrast text-white' : `${categoryTint(category)} hover:ring-1 hover:ring-app-border`}`}>{category}</button>)}</div>{draft.category && !currentCategories.some((item) => item === draft.category) && <p className="mt-2 text-xs text-app-subtle">Current saved category: {draft.category}</p>}</fieldset>
          {draft.category === 'Other' && <Input label="What was it? (optional)" placeholder="A short description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />}
          {draft.category !== 'Other' && <Input label="Note (optional)" placeholder="Add a short note" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />}
          {financeSchemaAvailable && <label className="block"><span className="mb-1.5 block text-sm font-semibold text-app-ink">Wallet</span><select value={draft.walletId} onChange={(event) => setDraft({ ...draft, walletId: event.target.value })} className="min-h-11 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="">Choose wallet (optional)</option>{visibleWallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>}
          <div><Input label="Date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })}/><div className="mt-2 flex gap-2"><button type="button" onClick={() => setDraft({ ...draft, date: getTodayStr() })} className="rounded-full bg-app-muted px-3 py-1.5 text-xs font-semibold text-app-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Today</button><button type="button" onClick={() => { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); setDraft({ ...draft, date: format(yesterday, 'yyyy-MM-dd') }); }} className="rounded-full bg-app-muted px-3 py-1.5 text-xs font-semibold text-app-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Yesterday</button></div></div>
          {error && <p role="alert" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-app-ink">{error}</p>}
          {!editId && financeSchemaAvailable && <details className="rounded-xl border border-app-border"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">More options<ChevronDown size={16} className="text-app-subtle"/></summary><div className="space-y-3 border-t border-app-border p-3"><label className="flex items-center gap-2 text-sm font-medium text-app-ink"><input type="checkbox" checked={splitEnabled} onChange={(event) => { setSplitEnabled(event.target.checked); if (event.target.checked) setRepeatEnabled(false); }} disabled={draft.type !== 'expense' || repeatEnabled} className="h-4 w-4 accent-[var(--color-accent)]"/>Split with friends</label>{splitEnabled && <div className="space-y-3"><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={splitMode === 'equal'} onClick={() => setSplitMode('equal')} className={`min-h-9 rounded-lg text-xs font-semibold ${splitMode === 'equal' ? 'bg-accent-contrast text-white' : 'bg-app-muted text-app-subtle'}`}>Equal split</button><button type="button" aria-pressed={splitMode === 'custom'} onClick={() => setSplitMode('custom')} className={`min-h-9 rounded-lg text-xs font-semibold ${splitMode === 'custom' ? 'bg-accent-contrast text-white' : 'bg-app-muted text-app-subtle'}`}>Custom shares</button></div>{splitPeople.map((person, index) => <div key={index} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2"><Input label={`Person ${index + 1}`} value={person.person} onChange={(event) => setSplitPeople((current) => current.map((item, i) => i === index ? { ...item, person: event.target.value } : item))} placeholder="Name"/>{splitMode === 'custom' && <Input label="Their share" type="number" min="0.01" step="0.01" value={person.amount} onChange={(event) => setSplitPeople((current) => current.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))}/>}<button type="button" aria-label={`Remove person ${index + 1}`} onClick={() => setSplitPeople((items) => items.length > 1 ? items.filter((_, i) => i !== index) : items)} className="mb-1 rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={15}/></button></div>)}<Button variant="secondary" size="sm" onClick={() => setSplitPeople((items) => [...items, { person: '', amount: '' }])}><Plus size={14}/>Add person</Button><Input label="Due date for friends (optional)" type="date" value={splitDueDate} onChange={(event) => setSplitDueDate(event.target.value)}/><p className="text-xs text-app-subtle">Your share is recorded as this expense; the other shares become loans to receive.</p></div>}<label className="flex items-center gap-2 text-sm font-medium text-app-ink"><input type="checkbox" checked={repeatEnabled} onChange={(event) => { setRepeatEnabled(event.target.checked); if (event.target.checked) setSplitEnabled(false); }} disabled={splitEnabled} className="h-4 w-4 accent-[var(--color-accent)]"/>Repeat this transaction</label>{repeatEnabled && <div className="space-y-3"><label className="block"><span className="mb-1 block text-sm font-semibold text-app-ink">Repeats</span><select value={repeatFrequency} onChange={(event) => setRepeatFrequency(event.target.value as typeof repeatFrequency)} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label><Input label="Stop after (optional)" type="date" min={draft.date} value={repeatEndsOn} onChange={(event) => setRepeatEndsOn(event.target.value)}/><p className="text-xs text-app-subtle">Future entries are created once at a time for a rolling 30-day window. Editing one entry leaves the schedule unchanged.</p></div>}</div></details>}
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-app-border bg-app-card pt-3"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={() => void submitTransaction()} disabled={!draft.amount || !draft.category}>{editId ? 'Save changes' : 'Add transaction'}</Button></div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'wallet'} onClose={() => setModal(null)} title={walletEditId ? 'Edit wallet' : 'Add wallet'}><div className="space-y-4"><Input label="Wallet name" value={walletDraft.name} onChange={(event) => setWalletDraft({ ...walletDraft, name: event.target.value })} placeholder="e.g. Savings account"/><Input label="Opening balance" type="number" step="0.01" value={walletDraft.openingBalance} onChange={(event) => setWalletDraft({ ...walletDraft, openingBalance: event.target.value })} placeholder="0.00"/>{error && <p role="alert" className="text-sm text-accent-strong">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={() => void submitWallet()}>{walletEditId ? 'Save wallet' : 'Add wallet'}</Button></div></div></Modal>

      <Modal isOpen={modal === 'transfer'} onClose={() => setModal(null)} title="Transfer between wallets"><div className="space-y-4"><label className="block"><span className="mb-1 block text-sm font-semibold text-app-ink">From</span><select value={transferDraft.from} onChange={(event) => setTransferDraft({ ...transferDraft, from: event.target.value })} className="min-h-11 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{visibleWallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></label><label className="block"><span className="mb-1 block text-sm font-semibold text-app-ink">To</span><select value={transferDraft.to} onChange={(event) => setTransferDraft({ ...transferDraft, to: event.target.value })} className="min-h-11 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{visibleWallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></label><Input label="Amount" type="number" min="0.01" step="0.01" value={transferDraft.amount} onChange={(event) => setTransferDraft({ ...transferDraft, amount: event.target.value })}/><Input label="Date" type="date" value={transferDraft.date} onChange={(event) => setTransferDraft({ ...transferDraft, date: event.target.value })}/><Input label="Note (optional)" value={transferDraft.note} onChange={(event) => setTransferDraft({ ...transferDraft, note: event.target.value })}/>{error && <p role="alert" className="text-sm text-accent-strong">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={() => void submitTransfer()}><ArrowLeftRight size={16}/>Transfer</Button></div></div></Modal>
    </div>
  );
}

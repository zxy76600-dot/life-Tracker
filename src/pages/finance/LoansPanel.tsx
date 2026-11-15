import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Edit3, Plus, Trash2 } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { Badge, Button, Card, Input, Modal, ProgressBar } from '../../components/ui';
import { useFinanceStore } from '../../stores/financeStore';
import type { Loan } from '../../types';
import { getTodayStr, roundMoney, sumMoney } from '../../utils/helpers';

const money = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};

type LoanDraft = { direction: 'lent' | 'borrowed'; person: string; amount: string; date: string; dueDate: string; walletId: string; note: string };
const newDraft = (): LoanDraft => ({ direction: 'lent', person: '', amount: '', date: getTodayStr(), dueDate: '', walletId: '', note: '' });

export function LoansPanel({ hideAmounts = false }: { hideAmounts?: boolean }) {
  const finance = useFinanceStore();
  const [modal, setModal] = useState<'loan' | 'payment' | null>(null);
  const [draft, setDraft] = useState<LoanDraft>(newDraft());
  const [editId, setEditId] = useState<string | null>(null);
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayStr());
  const [paymentWallet, setPaymentWallet] = useState('');
  const [openLoan, setOpenLoan] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<{ label: string; action: () => Promise<void> } | null>(null);
  const today = getTodayStr();
  const amountFor = (loan: Loan) => sumMoney(finance.loanPayments.filter((payment) => payment.loanId === loan.id).map((item) => item.amount));
  const remainingFor = (loan: Loan) => Math.max(0, roundMoney(loan.amount - amountFor(loan)));
  const dueSoon = (date: string | null) => Boolean(date && date >= today && date <= format(addDays(parseISO(today), 7), 'yyyy-MM-dd'));
  const statusFor = (loan: Loan) => {
    const paid = amountFor(loan); const remaining = remainingFor(loan);
    if (remaining <= 0) return 'Settled';
    if (loan.dueDate && loan.dueDate < today) return 'Overdue';
    if (paid > 0) return 'Partly repaid';
    return 'Open';
  };
  const totals = useMemo(() => finance.loans.reduce((result, loan) => {
    if (remainingFor(loan) > 0) result[loan.direction] = roundMoney(result[loan.direction] + remainingFor(loan));
    return result;
  }, { lent: 0, borrowed: 0 }), [finance.loans, finance.loanPayments]);
  const shownMoney = (amount: number) => hideAmounts ? '••••••' : money(amount, finance.financeSettings.currency);
  const startEdit = (loan: Loan) => {
    setEditId(loan.id); setDraft({ direction: loan.direction, person: loan.person, amount: String(loan.amount), date: loan.date, dueDate: loan.dueDate ?? '', walletId: loan.walletId ?? '', note: loan.note }); setError(''); setModal('loan');
  };
  const submitLoan = async () => {
    setError(''); const amount = Math.round((Number(draft.amount) + Number.EPSILON) * 100) / 100;
    if (!draft.person.trim() || !draft.date || !Number.isFinite(amount) || amount <= 0) { setError('Enter a person, a date and an amount greater than zero.'); return; }
    try {
      const values = { direction: draft.direction, person: draft.person.trim(), amount, date: draft.date, dueDate: draft.dueDate || null, walletId: draft.walletId || null, note: draft.note.trim() };
      if (editId) {
        const previous = finance.loans.find((item) => item.id === editId);
        await finance.updateLoan(editId, values);
        if (previous) setUndo({ label: 'Loan updated', action: async () => { await finance.updateLoan(editId, previous); } });
      } else {
        const created = await finance.addLoan({ ...values, linkedTransactionId: null });
        setUndo({ label: 'Loan added', action: async () => { await finance.removeLoan(created.id); } });
      }
      setModal(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this loan.'); }
  };
  const removeLoan = async (loan: Loan) => {
    if (finance.loanPayments.some((payment) => payment.loanId === loan.id) && !window.confirm('Deleting this loan also deletes its repayment history. Continue?')) return;
    try {
      const payments = finance.loanPayments.filter((payment) => payment.loanId === loan.id);
      const removed = await finance.removeLoan(loan.id); if (!removed) return;
      setUndo({ label: 'Loan deleted', action: async () => { await finance.restoreLoan(removed); for (const payment of payments) await finance.restoreLoanPayment(payment); } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete this loan.'); }
  };
  const recordPayment = async (settle = false, targetLoan = paymentLoan) => {
    if (!targetLoan) return;
    setError('');
    const remainingForTarget = remainingFor(targetLoan);
    const amount = settle ? remainingForTarget : Math.round((Number(paymentAmount) + Number.EPSILON) * 100) / 100;
    if (!paymentDate || !Number.isFinite(amount) || amount <= 0 || amount > remainingForTarget) { setError('Repayment needs a date and an amount above zero, no more than the remaining amount.'); return; }
    try {
      const payment = await finance.addLoanPayment({ loanId: targetLoan.id, walletId: paymentWallet || targetLoan.walletId, amount, date: paymentDate, note: '' });
      setUndo({ label: 'Repayment recorded', action: async () => { await finance.removeLoanPayment(payment.id); } }); setModal(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not record repayment.'); }
  };
  const openNewLoan = () => { setEditId(null); setDraft(newDraft()); setError(''); setModal('loan'); };
  const renderLoan = (loan: Loan) => {
    const paid = amountFor(loan); const remaining = remainingFor(loan); const status = statusFor(loan);
    const isDueToday = loan.dueDate === today && remaining > 0;
    const urgent = status === 'Overdue' || isDueToday || (remaining > 0 && dueSoon(loan.dueDate));
    return <Card key={loan.id} className={`p-4 ${urgent ? 'border-cat-amber/50' : ''}`}>
      <div className="flex flex-wrap items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${loan.direction === 'lent' ? 'bg-cat-green/10 text-cat-green-ink' : 'bg-cat-indigo/10 text-cat-indigo'}`}>{loan.direction === 'lent' ? <ArrowUpRight size={19}/> : <ArrowDownLeft size={19}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-app-ink">{loan.person}</h3><Badge variant={status === 'Settled' ? 'emerald' : status === 'Overdue' ? 'red' : 'blue'}>{status}</Badge>{urgent && status !== 'Overdue' && <span className="inline-flex items-center gap-1 text-xs font-semibold text-cat-amber-ink"><AlertTriangle size={13}/>{isDueToday ? 'Due today' : 'Due soon'}</span>}</div><p className="mt-1 text-xs text-app-subtle">{loan.direction === 'lent' ? 'To receive' : 'To pay'} · {format(parseISO(loan.date), 'MMM d, yyyy')}{loan.dueDate ? ` · Due ${format(parseISO(loan.dueDate), 'MMM d')}` : ''}</p></div><p className="text-right text-sm font-extrabold tabular-nums text-app-ink">{shownMoney(remaining)}<span className="block text-[10px] font-medium text-app-subtle">of {shownMoney(loan.amount)}</span></p><div className="flex"><button type="button" aria-label="Edit loan" onClick={() => startEdit(loan)} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Edit3 size={15}/></button><button type="button" aria-label="Delete loan" onClick={() => void removeLoan(loan)} className="rounded-lg p-2 text-app-subtle hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={15}/></button><button type="button" aria-label="Show repayment history" aria-expanded={openLoan === loan.id} onClick={() => setOpenLoan(openLoan === loan.id ? null : loan.id)} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ChevronDown size={15}/></button></div></div>
      <div className="mt-3 flex items-center gap-2"><ProgressBar value={loan.amount ? paid / loan.amount * 100 : 0} showLabel={false}/><span className="text-xs tabular-nums text-app-subtle">{shownMoney(paid)} repaid</span></div>
      {remaining > 0 && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => { setPaymentLoan(loan); setPaymentAmount(String(remaining)); setPaymentDate(today); setPaymentWallet(loan.walletId ?? ''); setError(''); setModal('payment'); }}>Record repayment</Button><Button size="sm" onClick={() => { setPaymentLoan(loan); setPaymentDate(today); setPaymentWallet(loan.walletId ?? ''); setError(''); void recordPayment(true, loan); }}>Settle remaining</Button></div>}
      {openLoan === loan.id && <div className="mt-3 space-y-2 border-t border-app-border pt-3">{finance.loanPayments.filter((item) => item.loanId === loan.id).length === 0 ? <p className="text-xs text-app-subtle">No repayments recorded yet.</p> : finance.loanPayments.filter((item) => item.loanId === loan.id).map((payment) => <div key={payment.id} className="flex justify-between text-xs text-app-subtle"><span>{format(parseISO(payment.date), 'MMM d, yyyy')} · {payment.note || 'Repayment'}</span><span className="flex items-center gap-2 font-semibold text-app-ink">{shownMoney(payment.amount)}<button type="button" aria-label="Undo repayment" onClick={() => { void finance.removeLoanPayment(payment.id).then((removed) => removed && setUndo({ label: 'Repayment deleted', action: async () => { await finance.restoreLoanPayment(removed); } })); }} className="rounded p-1 hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={13}/></button></span></div>)}</div>}
    </Card>;
  };

  const lentLoans = finance.loans.filter((loan) => loan.direction === 'lent');
  const borrowedLoans = finance.loans.filter((loan) => loan.direction === 'borrowed');
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-app-ink">Loans</h2><p className="text-sm text-app-subtle">Money lent and borrowed stays separate from monthly income and expenses.</p></div><Button onClick={openNewLoan}><Plus size={17}/>Add loan</Button></div>
    <div className="grid gap-3 sm:grid-cols-2"><Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">To receive</p><p className="mt-2 text-2xl font-extrabold text-cat-green-ink">{shownMoney(totals.lent)}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">To pay</p><p className="mt-2 text-2xl font-extrabold text-cat-indigo">{shownMoney(totals.borrowed)}</p></Card></div>
    <div className="grid gap-4 xl:grid-cols-2"><div className="space-y-3"><h3 className="font-bold text-app-ink">To receive</h3>{lentLoans.length ? lentLoans.map(renderLoan) : <Card className="p-5 text-sm text-app-subtle">No money lent to track yet.</Card>}</div><div className="space-y-3"><h3 className="font-bold text-app-ink">To pay</h3>{borrowedLoans.length ? borrowedLoans.map(renderLoan) : <Card className="p-5 text-sm text-app-subtle">No borrowed money to track yet.</Card>}</div></div>
    {undo && <div role="status" className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-app-border bg-app-card px-4 py-3 text-sm text-app-ink shadow-card-hover">{undo.label}<button type="button" onClick={() => { const action = undo.action; setUndo(null); void action(); }} className="font-bold underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Undo</button><button type="button" aria-label="Dismiss" onClick={() => setUndo(null)}>×</button></div>}
    <Modal isOpen={modal === 'loan'} onClose={() => setModal(null)} title={editId ? 'Edit loan' : 'Add loan'}><div className="space-y-4">{editId && finance.loans.find((item) => item.id === editId)?.linkedTransactionId && <p className="rounded-lg bg-cat-amber/10 px-3 py-2 text-xs text-app-ink">This loan came from a split expense. Changes here update the loan only; they do not change the source expense.</p>}<div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={draft.direction === 'lent'} onClick={() => setDraft({ ...draft, direction: 'lent' })} className={`min-h-10 rounded-xl text-sm font-semibold ${draft.direction === 'lent' ? 'bg-cat-green/10 text-cat-green-ink ring-1 ring-cat-green/40' : 'bg-app-muted text-app-subtle'}`}>I lent</button><button type="button" aria-pressed={draft.direction === 'borrowed'} onClick={() => setDraft({ ...draft, direction: 'borrowed' })} className={`min-h-10 rounded-xl text-sm font-semibold ${draft.direction === 'borrowed' ? 'bg-cat-indigo/10 text-cat-indigo ring-1 ring-cat-indigo/40' : 'bg-app-muted text-app-subtle'}`}>I borrowed</button></div><Input label="Person" value={draft.person} onChange={(event) => setDraft({ ...draft, person: event.target.value })} placeholder="Name"/><Input label="Amount" type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })}/><div className="grid grid-cols-2 gap-3"><Input label="Date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })}/><Input label="Due date (optional)" type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}/></div><label className="block"><span className="mb-1 block text-sm font-semibold text-app-ink">Wallet (optional)</span><select value={draft.walletId} onChange={(event) => setDraft({ ...draft, walletId: event.target.value })} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="">No wallet movement</option>{finance.wallets.filter((wallet) => !wallet.archivedAt).map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></label><Input label="Note (optional)" value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })}/>{error && <p role="alert" className="text-sm text-accent-strong">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={() => void submitLoan()}><Check size={16}/>{editId ? 'Save loan' : 'Add loan'}</Button></div></div></Modal>
    <Modal isOpen={modal === 'payment'} onClose={() => setModal(null)} title="Record repayment"><div className="space-y-4"><p className="text-sm text-app-subtle">Remaining: <b className="text-app-ink">{paymentLoan ? shownMoney(remainingFor(paymentLoan)) : ''}</b></p><Input label="Amount" type="number" min="0.01" step="0.01" max={paymentLoan ? remainingFor(paymentLoan) : undefined} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)}/><Input label="Date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)}/><label className="block"><span className="mb-1 block text-sm font-semibold text-app-ink">Wallet (optional)</span><select value={paymentWallet} onChange={(event) => setPaymentWallet(event.target.value)} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="">No wallet movement</option>{finance.wallets.filter((wallet) => !wallet.archivedAt).map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></label>{error && <p role="alert" className="text-sm text-accent-strong">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={() => void recordPayment()}>Save repayment</Button></div></div></Modal>
  </div>;
}

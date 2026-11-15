import { useMemo } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../components/ui';
import type { Transaction } from '../../types';
import { roundMoney, sumMoney } from '../../utils/helpers';

const colors = ['var(--color-cat-indigo)', 'var(--color-cat-blue)', 'var(--color-cat-teal)', 'var(--color-cat-amber)', 'var(--color-accent)', 'var(--color-cat-green)', '#8B6EF3', '#EA7A42', '#3A9A80'];
const money = (value: number, currency: string) => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
};

function buildSlices(transactions: Transaction[], type: Transaction['type']) {
  const rows = transactions.filter((item) => item.type === type);
  const totals = new Map<string, { label: string; amount: number; description: string }>();
  let noDescription = 0;
  let baseOther = 0;
  for (const item of rows) {
    if (item.category !== 'Other') {
      const existing = totals.get(item.category) ?? { label: item.category, amount: 0, description: '' };
      existing.amount = roundMoney(existing.amount + item.amount); totals.set(item.category, existing); continue;
    }
    const description = item.description.trim();
    if (!description) { noDescription += item.amount; continue; }
    const key = description.toLocaleLowerCase();
    const existing = totals.get(`other:${key}`) ?? { label: `Other · ${description}`, amount: 0, description };
    existing.amount = roundMoney(existing.amount + item.amount); totals.set(`other:${key}`, existing);
  }
  const otherGroups = [...totals.entries()].filter(([key]) => key.startsWith('other:')).sort((a, b) => b[1].amount - a[1].amount);
  const keep = otherGroups.slice(0, 5);
  const rest = sumMoney(otherGroups.slice(5).map(([, item]) => item.amount));
  const regular = [...totals.entries()].filter(([key]) => !key.startsWith('other:')).map(([, value]) => value);
  const otherAmount = noDescription + baseOther + rest;
  return [...regular, ...keep.map(([, item]) => item), ...(otherAmount > 0 ? [{ label: 'Other', amount: otherAmount, description: 'Other entries' }] : [])]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({ ...item, name: item.label, value: item.amount }));
}

function ChartEmpty({ label }: { label: string }) {
  return <div className="grid h-48 place-items-center rounded-xl border border-dashed border-app-border text-center text-sm text-app-subtle">No {label} to chart for this month yet.</div>;
}

function DonutChart({ title, items, total, currency, hideAmounts }: { title: string; items: ReturnType<typeof buildSlices>; total: number; currency: string; hideAmounts: boolean }) {
  if (!items.length) return <Card className="min-w-0 p-4 sm:p-5"><h3 className="mb-4 font-bold text-app-ink">{title}</h3><ChartEmpty label={title.toLowerCase()} /></Card>;
  return <Card className="min-w-0 p-4 sm:p-5">
    <h3 className="font-bold text-app-ink">{title}</h3>
    <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <div className="relative h-48 w-full max-w-56 shrink-0" aria-label={`${title} donut chart`}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={items} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={2} stroke="var(--app-card)">{items.map((item, index) => <Cell key={`${item.name}-${index}`} fill={colors[index % colors.length]} />)}</Pie><Tooltip content={({ active, payload }) => { const item = payload?.[0]?.payload as (typeof items)[number] | undefined; if (!active || !item) return null; const percentage = total ? (item.amount / total) * 100 : 0; return <div className="rounded-xl border border-app-border bg-app-card px-3 py-2 text-xs text-app-ink shadow-card"><p className="font-bold">{item.name}</p>{item.description && <p className="mt-0.5 text-app-subtle">{item.description}</p>}<p className="mt-1">{hideAmounts ? '••••••' : money(item.amount, currency)} · {percentage.toFixed(1)}%</p></div>; }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-app-subtle">Total</p><p className="mt-1 max-w-[6rem] truncate text-sm font-extrabold tabular-nums text-app-ink">{hideAmounts ? '••••' : money(total, currency)}</p></div></div></div>
      <ul className="w-full min-w-0 space-y-2">{items.map((item, index) => <li key={`${item.name}-${index}`} className="flex min-w-0 items-start gap-2 text-xs"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="min-w-0 flex-1"><span className="block truncate font-medium text-app-ink">{item.name}</span><span className="block text-app-subtle">{hideAmounts ? '••••••' : money(item.amount, currency)} · {total ? ((item.amount / total) * 100).toFixed(1) : '0.0'}%</span></span></li>)}</ul>
    </div>
  </Card>;
}

export function FinanceAnalytics({ transactions, month, currency, hideAmounts = false }: { transactions: Transaction[]; month: string; currency: string; hideAmounts?: boolean }) {
  const monthly = useMemo(() => transactions.filter((item) => item.date.startsWith(month)), [transactions, month]);
  const income = monthly.filter((item) => item.type === 'income');
  const expenses = monthly.filter((item) => item.type === 'expense');
  const incomeTotal = sumMoney(income.map((item) => item.amount));
  const expenseTotal = sumMoney(expenses.map((item) => item.amount));
  const monthStart = parseISO(`${month}-01`);
  const sixMonthStart = addMonths(startOfMonth(monthStart), -5);
  const monthlyBars = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = addMonths(sixMonthStart, index); const key = format(date, 'yyyy-MM');
    const rows = transactions.filter((item) => item.date.startsWith(key));
    return { month: format(date, 'MMM'), income: sumMoney(rows.filter((item) => item.type === 'income').map((item) => item.amount)), expenses: sumMoney(rows.filter((item) => item.type === 'expense').map((item) => item.amount)) };
  }), [transactions, sixMonthStart]);
  const sixMonthIncome = sumMoney(monthlyBars.map((item) => item.income));
  const sixMonthExpenses = sumMoney(monthlyBars.map((item) => item.expenses));
  const sixMonthTotal = sixMonthIncome + sixMonthExpenses;
  const dailyBars = useMemo(() => eachDayOfInterval({ start: startOfMonth(monthStart), end: endOfMonth(monthStart) }).map((date) => {
    const key = format(date, 'yyyy-MM-dd');
    return { day: format(date, 'd'), spending: sumMoney(expenses.filter((item) => item.date === key).map((item) => item.amount)) };
  }), [expenses, monthStart]);
  const axisStyle = { fill: 'var(--app-subtle)', fontSize: 10 };
  const tooltip = { backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 'var(--radius-card)', color: 'var(--app-ink)', boxShadow: 'var(--shadow-card)' };
  return <div className="space-y-4">
    <DonutChart title="Spending by category" items={buildSlices(monthly, 'expense')} total={expenseTotal} currency={currency} hideAmounts={hideAmounts} />
    <DonutChart title="Income by category" items={buildSlices(monthly, 'income')} total={incomeTotal} currency={currency} hideAmounts={hideAmounts} />
    <Card className="p-4 sm:p-5"><h3 className="font-bold text-app-ink">Income vs expenses · 6 months</h3><div className="mt-3 h-56 min-w-0">{monthlyBars.some((row) => row.income || row.expenses) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyBars} margin={{ top: 5, right: 4, left: -18, bottom: 0 }}><CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false}/><YAxis tick={axisStyle} axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltip} formatter={(value) => hideAmounts ? '••••••' : `${money(Number(value) || 0, currency)} · ${sixMonthTotal ? ((Number(value) / sixMonthTotal) * 100).toFixed(1) : '0.0'}% of total`}/><Bar dataKey="income" name="Income" fill="var(--color-cat-green)" radius={[4,4,0,0]}/><Bar dataKey="expenses" name="Expenses" fill="var(--color-accent)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer> : <ChartEmpty label="transactions"/>}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><LegendItem color="var(--color-cat-green)" label="Income" amount={sixMonthIncome} total={sixMonthTotal} currency={currency} hidden={hideAmounts}/><LegendItem color="var(--color-accent)" label="Expenses" amount={sixMonthExpenses} total={sixMonthTotal} currency={currency} hidden={hideAmounts}/></div></Card>
    <Card className="p-4 sm:p-5"><h3 className="font-bold text-app-ink">Daily spending · {format(monthStart, 'MMMM')}</h3><div className="mt-3 h-56 min-w-0">{expenses.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={dailyBars} margin={{ top: 5, right: 4, left: -18, bottom: 0 }}><CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day" interval={dayCount(dailyBars.length)} tick={axisStyle} axisLine={false} tickLine={false}/><YAxis tick={axisStyle} axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltip} formatter={(value) => hideAmounts ? '••••••' : `${money(Number(value) || 0, currency)} · ${expenseTotal ? ((Number(value) / expenseTotal) * 100).toFixed(1) : '0.0'}% of month`} labelFormatter={(label) => `${format(monthStart, 'MMM')} ${label}`}/><Bar dataKey="spending" name="Daily spending" fill="var(--color-accent)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer> : <ChartEmpty label="spending"/>}</div><div className="mt-3"><LegendItem color="var(--color-accent)" label="Monthly spending" amount={expenseTotal} total={expenseTotal} currency={currency} hidden={hideAmounts}/></div></Card>
  </div>;
}

function dayCount(length: number) { return length > 24 ? 4 : length > 15 ? 2 : 0; }

function LegendItem({ color, label, amount, total, currency, hidden }: { color: string; label: string; amount: number; total: number; currency: string; hidden: boolean }) {
  return <div className="flex min-w-0 items-start gap-2"><span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }}/><span className="min-w-0"><span className="block font-semibold text-app-ink">{label}</span><span className="block text-app-subtle">{hidden ? '••••••' : money(amount, currency)} · {total ? ((amount / total) * 100).toFixed(1) : '0.0'}%</span></span></div>;
}

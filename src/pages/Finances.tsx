import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, Button, Input, Modal, EmptyState, Badge, Select } from '../components/ui';
import { useFinanceStore } from '../stores/financeStore';
import { formatCurrency, formatDate, getTodayStr } from '../utils/helpers';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import { format } from 'date-fns';

/**
 * Finances Page — Track income and expenses with true black and white themes.
 */

const PIE_COLORS = ['var(--color-cat-blue)', 'var(--color-cat-green)', 'var(--color-cat-indigo)', 'var(--color-cat-amber)', 'var(--color-accent)', 'var(--color-cat-teal)', 'var(--color-accent-strong)', 'var(--color-cat-indigo)', 'var(--color-cat-amber)'];

export default function Finances() {
  const shouldReduceMotion = useReducedMotion();
  const { transactions, addTransaction, removeTransaction } = useFinanceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleAddTransaction = () => {
    if (amount && category) {
      addTransaction({
        type: txType,
        amount: Number(amount),
        category,
        description: description.trim(),
        date: getTodayStr(),
      });
      setAmount('');
      setCategory('');
      setDescription('');
      setIsModalOpen(false);
    }
  };

  // Monthly stats
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));
  const monthlyIncome = monthlyTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthlyTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Expense breakdown for pie chart
  const expenseByCategory = monthlyTx
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  const sortedTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  const categories = txType === 'income'
    ? INCOME_CATEGORIES.map((c) => ({ value: c, label: c }))
    : EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="border-l-4 border-l-cat-green">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cat-green/10 p-2.5">
              <TrendingUp size={20} className="text-cat-green" />
            </div>
            <div>
              <p className="text-xs font-medium text-app-subtle">Income</p>
              <p className="mt-1 text-xl font-bold text-cat-green-ink tabular-nums">{formatCurrency(monthlyIncome)}</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-accent">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent/10 p-2.5">
              <TrendingDown size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-xs font-medium text-app-subtle">Expenses</p>
              <p className="mt-1 text-xl font-bold text-app-ink tabular-nums">{formatCurrency(monthlyExpenses)}</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-cat-indigo">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cat-indigo/10 p-2.5">
              <Wallet size={20} className="text-cat-indigo" />
            </div>
            <div>
              <p className="text-xs font-medium text-app-subtle">Balance</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${monthlyIncome - monthlyExpenses >= 0 ? 'text-cat-green-ink' : 'text-app-ink'}`}>
                {formatCurrency(monthlyIncome - monthlyExpenses)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-app-ink">Expense Breakdown</h3>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ResponsiveContainer width="100%" height={200} className="max-w-[200px]">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                  backgroundColor: 'var(--app-card)',
                  border: '1px solid var(--app-border)',
                  borderRadius: 'var(--radius-card)',
                  color: 'var(--app-ink)',
                  boxShadow: 'var(--shadow-card)',
                  }}
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-app-subtle">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Transactions Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold tracking-tight text-app-ink">Transactions</h3>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Transaction
        </Button>
      </div>

      {/* Transactions List */}
      {sortedTransactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No transactions yet"
          description="Start tracking your income and expenses."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              Add Transaction
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sortedTransactions.slice(0, 20).map((tx) => (
              <motion.div
                key={tx.id}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              >
                <Card hover className="p-4 sm:p-5">
                  <div className="flex min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
                    <div className={`shrink-0 rounded-xl p-2.5 ${tx.type === 'income' ? 'bg-cat-green/10' : 'bg-accent/10'}`}>
                      {tx.type === 'income' ? (
                        <TrendingUp size={18} className="text-cat-green" />
                      ) : (
                        <TrendingDown size={18} className="text-accent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="max-w-full break-words font-semibold text-app-ink">{tx.description || tx.category}</span>
                        <Badge variant={tx.type === 'income' ? 'emerald' : 'red'}>{tx.category}</Badge>
                      </div>
                      <span className="text-xs text-app-subtle">{formatDate(tx.date)}</span>
                    </div>
                    <span className={`ml-auto whitespace-nowrap text-sm font-bold tabular-nums sm:ml-0 ${tx.type === 'income' ? 'text-cat-green-ink' : 'text-app-ink'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => removeTransaction(tx.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Transaction">
        <div className="space-y-4">
          {/* Type toggle */}
          <div role="group" aria-label="Transaction type" className="grid grid-cols-2 rounded-xl bg-app-muted p-1">
            <button
              type="button"
              aria-pressed={txType === 'expense'}
              onClick={() => { setTxType('expense'); setCategory(''); }}
              className={`min-h-11 rounded-lg py-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
                txType === 'expense'
                  ? 'bg-app-card text-accent shadow-card'
                  : 'text-app-subtle hover:text-app-ink'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              aria-pressed={txType === 'income'}
              onClick={() => { setTxType('income'); setCategory(''); }}
              className={`min-h-11 rounded-lg py-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cat-green cursor-pointer ${
                txType === 'income'
                  ? 'bg-app-card text-cat-green shadow-card'
                  : 'text-app-subtle hover:text-app-ink'
              }`}
            >
              Income
            </button>
          </div>

          <Input
            label="Amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[{ value: '', label: 'Select category...' }, ...categories]}
          />
          <Input
            label="Description (optional)"
            placeholder="e.g., Weekly groceries"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTransaction} disabled={!amount || !category}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

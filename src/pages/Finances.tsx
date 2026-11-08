import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, Button, Input, Modal, EmptyState, Badge, Select } from '../components/ui';
import { useFinanceStore } from '../stores/financeStore';
import { useThemeStore } from '../stores/themeStore';
import { formatCurrency, formatDate, getTodayStr } from '../utils/helpers';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import { format } from 'date-fns';

/**
 * Finances Page — Track income and expenses with true black and white themes.
 */

const PIE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'];

export default function Finances() {
  const { transactions, addTransaction, removeTransaction } = useFinanceStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5">
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Income</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(monthlyIncome)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-2.5">
              <TrendingDown size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Expenses</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(monthlyExpenses)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <Wallet size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Balance</p>
              <p className={`text-xl font-bold ${monthlyIncome - monthlyExpenses >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(monthlyIncome - monthlyExpenses)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Expense Breakdown</h3>
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
                    backgroundColor: isDark ? '#171717' : '#ffffff',
                    border: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`,
                    borderRadius: '10px',
                    color: isDark ? '#ffffff' : '#0a0a0a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Transactions Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Transactions</h3>
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
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card hover>
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-2.5 ${tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {tx.type === 'income' ? (
                        <TrendingUp size={18} className="text-emerald-500" />
                      ) : (
                        <TrendingDown size={18} className="text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900 dark:text-white">{tx.description || tx.category}</span>
                        <Badge variant={tx.type === 'income' ? 'emerald' : 'red'}>{tx.category}</Badge>
                      </div>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">{formatDate(tx.date)}</span>
                    </div>
                    <span className={`font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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
          <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            <button
              onClick={() => { setTxType('expense'); setCategory(''); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all cursor-pointer ${
                txType === 'expense'
                  ? 'bg-white text-red-600 shadow-sm dark:bg-neutral-900 dark:text-red-400'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => { setTxType('income'); setCategory(''); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all cursor-pointer ${
                txType === 'income'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-neutral-900 dark:text-emerald-400'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
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

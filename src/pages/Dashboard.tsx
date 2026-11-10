import { Card, Button } from '../components/ui';
import { useHabitStore } from '../stores/habitStore';
import { useGoalStore } from '../stores/goalStore';
import { useMoodStore } from '../stores/moodStore';
import { useFitnessStore } from '../stores/fitnessStore';
import { useFinanceStore } from '../stores/financeStore';
import { useThemeStore } from '../stores/themeStore';
import { calculateStreak, getTodayStr, formatCurrency } from '../utils/helpers';
import { loadDemoData } from '../utils/demoData';
import { reportCloudError } from '../lib/cloudFeedback';
import {
  CheckSquare,
  Target,
  Smile,
  Wallet,
  Flame,
  TrendingUp,
  Droplets,
  Moon,
  Sparkles,
} from 'lucide-react';
import { MOOD_EMOJIS, type MoodLevel } from '../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

/**
 * Dashboard — The home page with true black dark theme and crisp white light theme.
 */
export default function Dashboard() {
  const { habits } = useHabitStore();
  const { goals } = useGoalStore();
  const { entries: moodEntries } = useMoodStore();
  const { getTodayHealth } = useFitnessStore();
  const { transactions } = useFinanceStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const today = getTodayStr();
  const todayHealth = getTodayHealth();

  // Calculate stats
  const habitsCompletedToday = habits.filter((h) =>
    h.completedDates.includes(today)
  ).length;
  const totalHabits = habits.length;
  const completionRate = totalHabits > 0 ? Math.round((habitsCompletedToday / totalHabits) * 100) : 0;

  const bestStreak = habits.reduce(
    (max, h) => Math.max(max, calculateStreak(h.completedDates)),
    0
  );

  const activeGoals = goals.filter((g) => !g.completed).length;
  const completedGoals = goals.filter((g) => g.completed).length;

  const todayMood = moodEntries.find((e) => e.date === today);

  // Monthly finance summary
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthlyTransactions = transactions.filter((t) =>
    t.date.startsWith(currentMonth)
  );
  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Build mood chart data for last 7 days
  const moodChartData = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const entry = moodEntries.find((e) => e.date === date);
    return {
      day: format(parseISO(date), 'EEE'),
      mood: entry?.mood ?? null,
    };
  });

  // Stats cards data
  const statCards = [
    {
      label: 'Habits Today',
      value: `${habitsCompletedToday}/${totalHabits}`,
      subtext: `${completionRate}% complete`,
      icon: CheckSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/15',
    },
    {
      label: 'Best Streak',
      value: `${bestStreak} days`,
      subtext: 'Keep it going! 🔥',
      icon: Flame,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
    },
    {
      label: 'Active Goals',
      value: `${activeGoals}`,
      subtext: `${completedGoals} completed`,
      icon: Target,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    },
    {
      label: "Today's Mood",
      value: todayMood ? MOOD_EMOJIS[todayMood.mood as MoodLevel] : '—',
      subtext: todayMood ? `Feeling ${todayMood.mood >= 4 ? 'great' : todayMood.mood >= 3 ? 'okay' : 'down'}` : 'Not logged yet',
      icon: Smile,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/15',
    },
    {
      label: 'Water Today',
      value: `${todayHealth.waterGlasses} glasses`,
      subtext: '8 glasses is the goal 💧',
      icon: Droplets,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    },
    {
      label: 'Sleep',
      value: todayHealth.sleepHours > 0 ? `${todayHealth.sleepHours}h` : '—',
      subtext: todayHealth.sleepHours >= 7 ? 'Well rested! 🌙' : 'Log your sleep',
      icon: Moon,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}! 👋
        </h2>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Here's your life at a glance. Keep pushing forward!
        </p>
      </div>

      {/* Quick Start / Demo Data Banner for first-time visitors */}
      {totalHabits === 0 && activeGoals === 0 && moodEntries.length === 0 && (
        <Card className="border-neutral-200 bg-neutral-100/80 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Welcome to your Life Tracker!</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Ready to see it in action? Load sample data to explore charts, streaks, and trackers, or start adding your own!
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                void loadDemoData().then(() => window.location.reload()).catch(reportCloudError);
              }}
              className="shrink-0"
            >
              <Sparkles size={16} />
              Load Sample Data
            </Button>
          </div>
        </Card>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label} hover>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{stat.subtext}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${stat.bgColor}`}>
                <stat.icon size={22} className={stat.color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Mood Trend Chart */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Mood Trend (Last 7 Days)
          </h3>
          {moodEntries.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={moodChartData}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e5e5'} />
                <XAxis dataKey="day" stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={12} />
                <YAxis domain={[1, 5]} stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#171717' : '#ffffff',
                    border: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`,
                    borderRadius: '10px',
                    color: isDark ? '#ffffff' : '#0a0a0a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="mood"
                  stroke="#8b5cf6"
                  fill="url(#moodGradient)"
                  strokeWidth={2}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-neutral-400">
              Start logging your mood to see trends here
            </div>
          )}
        </Card>

        {/* Finance Summary */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            This Month's Finances
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Income</span>
              </div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(monthlyIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-red-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Expenses</span>
              </div>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(monthlyExpenses)}
              </span>
            </div>
            <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Balance</span>
                <span
                  className={`text-lg font-bold ${
                    monthlyIncome - monthlyExpenses >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(monthlyIncome - monthlyExpenses)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

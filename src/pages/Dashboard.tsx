import { Card, Button } from '../components/ui';
import { useHabitStore } from '../stores/habitStore';
import { useGoalStore } from '../stores/goalStore';
import { useMoodStore } from '../stores/moodStore';
import { useFitnessStore } from '../stores/fitnessStore';
import { useFinanceStore } from '../stores/financeStore';
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
      tone: 'coral',
    },
    {
      label: 'Best Streak',
      value: `${bestStreak} days`,
      subtext: 'Keep it going! 🔥',
      icon: Flame,
      tone: 'indigo',
    },
    {
      label: 'Active Goals',
      value: `${activeGoals}`,
      subtext: `${completedGoals} completed`,
      icon: Target,
      tone: 'green',
    },
    {
      label: "Today's Mood",
      value: todayMood ? MOOD_EMOJIS[todayMood.mood as MoodLevel] : '—',
      subtext: todayMood ? `Feeling ${todayMood.mood >= 4 ? 'great' : todayMood.mood >= 3 ? 'okay' : 'down'}` : 'Not logged yet',
      icon: Smile,
      tone: 'teal',
    },
    {
      label: 'Water Today',
      value: `${todayHealth.waterGlasses} glasses`,
      subtext: '8 glasses is the goal 💧',
      icon: Droplets,
      tone: 'blue',
    },
    {
      label: 'Sleep',
      value: todayHealth.sleepHours > 0 ? `${todayHealth.sleepHours}h` : '—',
      subtext: todayHealth.sleepHours >= 7 ? 'Well rested! 🌙' : 'Log your sleep',
      icon: Moon,
      tone: 'amber',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink">Your personal overview</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-app-ink sm:text-3xl">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}! <span aria-hidden="true">👋</span>
          </h2>
          <p className="mt-1 text-sm text-app-subtle sm:text-base">Here's your life at a glance. Keep moving at your own pace.</p>
        </div>
        <p className="text-sm font-medium text-app-subtle">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Informational week strip. Dashboard summaries are currently for today. */}
      <div className="overflow-x-auto pb-1">
        <div aria-label="Current week, today selected" className="flex min-w-max gap-2">
          {Array.from({ length: 7 }, (_, index) => {
            const date = subDays(new Date(), 6 - index);
            const isToday = index === 6;
            return (
              <div key={format(date, 'yyyy-MM-dd')} aria-current={isToday ? 'date' : undefined} className={`flex min-w-[48px] flex-col items-center gap-1 rounded-xl px-2.5 py-2 text-center ${isToday ? 'bg-accent-contrast text-white shadow-accent' : 'bg-app-card text-app-subtle ring-1 ring-inset ring-app-border'}`}>
                <span className={`text-[10px] font-medium uppercase ${isToday ? 'text-white/80' : ''}`}>{format(date, 'EEE')}</span>
                <span className="text-sm font-bold tabular-nums">{format(date, 'd')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Start / Demo Data Banner for first-time visitors */}
      {totalHabits === 0 && activeGoals === 0 && moodEntries.length === 0 && (
        <Card className="border-accent/20 bg-accent-soft shadow-card dark:border-accent/20 dark:bg-accent/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-accent text-white shadow-accent">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-app-ink">Welcome to your Life Tracker!</h3>
                <p className="text-sm text-app-subtle">
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label} hover className={`min-w-0 border-l-4 ${stat.tone === 'coral' ? 'border-l-accent' : stat.tone === 'indigo' ? 'border-l-cat-indigo' : stat.tone === 'green' ? 'border-l-cat-green' : stat.tone === 'teal' ? 'border-l-cat-teal' : stat.tone === 'blue' ? 'border-l-cat-blue' : 'border-l-cat-amber'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-app-subtle sm:text-sm">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold leading-none tracking-tight text-app-ink tabular-nums sm:text-3xl">{stat.value}</p>
                <p className="mt-2 text-[11px] text-app-subtle sm:text-xs">{stat.subtext}</p>
              </div>
              <div className={`rounded-xl p-2 ${stat.tone === 'coral' ? 'bg-accent/10 text-accent' : stat.tone === 'indigo' ? 'bg-cat-indigo/10 text-cat-indigo' : stat.tone === 'green' ? 'bg-cat-green/10 text-cat-green' : stat.tone === 'teal' ? 'bg-cat-teal/10 text-cat-teal' : stat.tone === 'blue' ? 'bg-cat-blue/10 text-cat-blue' : 'bg-cat-amber/10 text-cat-amber'}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Mood Trend Chart */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-app-ink">
            Mood Trend (Last 7 Days)
          </h3>
          {moodEntries.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={moodChartData}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-cat-teal)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-cat-teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-app-border)" />
                <XAxis dataKey="day" stroke="var(--color-app-subtle)" fontSize={12} />
                <YAxis domain={[1, 5]} stroke="var(--color-app-subtle)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--app-card)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 'var(--radius-card)',
                    color: 'var(--app-ink)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="mood"
                  stroke="var(--color-cat-teal)"
                  fill="url(#moodGradient)"
                  strokeWidth={2}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-app-subtle">
              Start logging your mood to see trends here
            </div>
          )}
        </Card>

        {/* Finance Summary */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-app-ink">
            This Month's Finances
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-cat-green" />
                <span className="text-sm text-app-subtle">Income</span>
              </div>
              <span className="font-semibold text-cat-green">
                {formatCurrency(monthlyIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-accent" />
                <span className="text-sm text-app-subtle">Expenses</span>
              </div>
              <span className="font-semibold text-app-ink">
                {formatCurrency(monthlyExpenses)}
              </span>
            </div>
            <div className="border-t border-app-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-app-ink">Balance</span>
                <span
                  className={`text-lg font-bold ${
                    monthlyIncome - monthlyExpenses >= 0
                    ? 'text-cat-green-ink'
                    : 'text-app-ink'
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

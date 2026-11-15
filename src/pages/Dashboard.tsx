import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO, startOfWeek, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import { reportCloudError } from '../lib/cloudFeedback';
import { useAuth } from '../auth/authContext';
import { useFinanceStore } from '../stores/financeStore';
import { useFitnessStore } from '../stores/fitnessStore';
import { useGoalStore } from '../stores/goalStore';
import { useHabitStore } from '../stores/habitStore';
import { useMoodStore } from '../stores/moodStore';
import { useTodoStore } from '../stores/todoStore';
import { calculateStreak, getTodayStr, roundMoney, sumMoney } from '../utils/helpers';
import { loadDemoData } from '../utils/demoData';
import type { DashboardStat, MoodChartPoint, WeekChartPoint } from '../components/dashboard/DashboardInsights';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';
import { GetStartedCard } from '../components/dashboard/GetStartedCard';
import { GoalsCard } from '../components/dashboard/GoalsCard';
import { MoneyCard } from '../components/dashboard/MoneyCard';
import { TodayCard } from '../components/dashboard/TodayCard';

const DashboardInsights = lazy(() => import('../components/dashboard/DashboardInsights').then((module) => ({ default: module.DashboardInsights })));

function readHiddenAmounts() {
  try { return localStorage.getItem('life-tracker-finance-hide-amounts') === 'true'; }
  catch { return false; }
}

function InsightsSkeleton() {
  return <>
    {Array.from({ length: 4 }, (_, index) => <div key={`stat-${index}`} className="min-h-[146px] animate-pulse rounded-card-lg border border-app-border bg-app-card motion-reduce:animate-none" />)}
    <div className="min-h-[300px] animate-pulse rounded-card-lg border border-app-border bg-app-card motion-reduce:animate-none sm:col-span-2" />
    <div className="min-h-[300px] animate-pulse rounded-card-lg border border-app-border bg-app-card motion-reduce:animate-none" />
  </>;
}

export default function Dashboard() {
  const { loading: authLoading, error: authError } = useAuth();
  const habits = useHabitStore((state) => state.habits);
  const toggleHabitCompletion = useHabitStore((state) => state.toggleHabitCompletion);
  const goals = useGoalStore((state) => state.goals);
  const moodEntries = useMoodStore((state) => state.entries);
  const fitness = useFitnessStore();
  const finance = useFinanceStore();
  const todoStore = useTodoStore();
  const [hideFinanceAmounts, setHideFinanceAmounts] = useState(readHiddenAmounts);

  useEffect(() => {
    if (!fitness.isLoaded && !fitness.isLoading) void fitness.loadFitnessData();
  }, [fitness.isLoaded, fitness.isLoading, fitness.loadFitnessData]);

  const today = getTodayStr();
  const todayDate = parseISO(today);
  const dateLabel = format(todayDate, 'EEEE, MMMM d');
  const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const weekStartKey = format(weekStart, 'yyyy-MM-dd');
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => format(addDays(weekStart, index), 'yyyy-MM-dd')), [weekStartKey]);

  const habitsDueToday = habits.filter((habit) => habit.frequency === 'daily' || !habit.completedDates.some((date) => date >= weekStartKey && date <= today));
  const todayHabits = habitsDueToday.map((habit) => ({
    id: habit.id,
    name: habit.name,
    frequency: habit.frequency,
    completed: habit.frequency === 'weekly'
      ? habit.completedDates.some((date) => date >= weekStartKey && date <= today)
      : habit.completedDates.includes(today),
  }));
  const todayTasks = todoStore.todos
    .filter((todo) => todo.date === today)
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.position - b.position)
    .map((todo) => ({ id: todo.id, title: todo.title, time: todo.time, completed: Boolean(todo.completedAt) }));

  const currentPlan = fitness.getCurrentPlan();
  const plannedFitnessDays = currentPlan?.days.filter((day) => !day.isSkipped) ?? [];
  const scheduledToday = plannedFitnessDays.find((day) => day.scheduledDate === today) ?? null;
  const workoutForPlanDay = (dayId: string, date: string) => fitness.workoutLogs.some((log) => log.planDayId === dayId || (!log.planDayId && log.date === date));
  const todayWorkoutComplete = scheduledToday ? workoutForPlanDay(scheduledToday.id, scheduledToday.scheduledDate) : false;
  const completedTodayCount = todayHabits.filter((habit) => habit.completed).length + todayTasks.filter((task) => task.completed).length + Number(Boolean(scheduledToday && todayWorkoutComplete));
  const plannedTodayCount = todayHabits.length + todayTasks.length + Number(Boolean(scheduledToday));

  const weekData: WeekChartPoint[] = useMemo(() => weekDates.map((date) => ({
    date,
    day: format(parseISO(date), 'EEE'),
    tasks: todoStore.todos.filter((todo) => todo.completedAt && format(parseISO(todo.completedAt), 'yyyy-MM-dd') === date).length,
    habits: habits.filter((habit) => habit.completedDates.includes(date)).length,
  })), [weekDates, todoStore.todos, habits]);

  const moodData: MoodChartPoint[] = useMemo(() => weekDates.slice(-7).map((date) => ({
    date,
    day: format(parseISO(date), 'EEE'),
    mood: moodEntries.find((entry) => entry.date === date)?.mood ?? null,
  })), [weekDates, moodEntries]);

  const bestStreak = habits.reduce((maximum, habit) => Math.max(maximum, calculateStreak(habit.completedDates)), 0);
  const openTodos = todoStore.todos.filter((todo) => !todo.completedAt);
  const overdueTasks = openTodos.filter((todo) => todo.date < today).length;
  const completedPlannedWorkouts = plannedFitnessDays.filter((day) => workoutForPlanDay(day.id, day.scheduledDate)).length;
  const weeklyWorkoutCount = fitness.workoutLogs.filter((log) => log.date >= weekStartKey && log.date <= weekDates[6]).length;
  const workoutsCompleted = plannedFitnessDays.length ? completedPlannedWorkouts : weeklyWorkoutCount;
  const workoutsPlanned = plannedFitnessDays.length || fitness.profile?.trainingDaysPerWeek || 0;

  const monthKey = format(todayDate, 'yyyy-MM');
  const monthlyTransactions = finance.transactions.filter((transaction) => transaction.date.startsWith(monthKey));
  const monthlyIncome = sumMoney(monthlyTransactions.filter((transaction) => transaction.type === 'income').map((transaction) => transaction.amount));
  const monthlySpending = sumMoney(monthlyTransactions.filter((transaction) => transaction.type === 'expense').map((transaction) => transaction.amount));
  const monthlyBalance = roundMoney(monthlyIncome - monthlySpending);
  const remainingForLoan = (loanId: string, amount: number) => Math.max(0, roundMoney(amount - sumMoney(finance.loanPayments.filter((payment) => payment.loanId === loanId).map((payment) => payment.amount))));
  const toReceive = sumMoney(finance.loans.filter((loan) => loan.direction === 'lent').map((loan) => remainingForLoan(loan.id, loan.amount)));
  const toPay = sumMoney(finance.loans.filter((loan) => loan.direction === 'borrowed').map((loan) => remainingForLoan(loan.id, loan.amount)));

  const habitActivity = weekData.map((point) => point.habits);
  const taskActivity = weekData.map((point) => point.tasks);
  const workoutActivity = weekDates.map((date) => fitness.workoutLogs.filter((log) => log.date === date).length);
  const balanceActivity = Array.from({ length: 6 }, (_, index) => {
    const month = format(subMonths(todayDate, 5 - index), 'yyyy-MM');
    const monthTransactions = finance.transactions.filter((transaction) => transaction.date.startsWith(month));
    return roundMoney(sumMoney(monthTransactions.filter((transaction) => transaction.type === 'income').map((transaction) => transaction.amount)) - sumMoney(monthTransactions.filter((transaction) => transaction.type === 'expense').map((transaction) => transaction.amount)));
  });
  const stats: DashboardStat[] = [
    { id: 'streak', label: 'Best habit streak', value: bestStreak, detail: 'Your strongest current run', sparkline: habitActivity },
    { id: 'tasks', label: 'Open tasks', value: openTodos.length, detail: overdueTasks ? `${overdueTasks} overdue` : 'Nothing overdue', sparkline: taskActivity },
    { id: 'workouts', label: 'Workouts this week', value: workoutsCompleted, planned: workoutsPlanned, detail: workoutsPlanned ? 'Keep your weekly rhythm' : 'Set up Fitness to plan workouts', sparkline: workoutActivity },
    { id: 'balance', label: 'This month’s balance', value: monthlyBalance, detail: 'Income minus spending', sparkline: balanceActivity },
  ];

  const hasAnyData = Boolean(
    habits.length || goals.length || moodEntries.length || todoStore.todos.length || todoStore.series.length ||
    fitness.profile || fitness.workouts.length || fitness.dailyHealth.length || fitness.customExercises.length || fitness.routines.length || fitness.plans.length || fitness.workoutLogs.length || fitness.weeklyCheckins.length ||
    finance.transactions.length || finance.wallets.length || finance.transfers.length || finance.loans.length || finance.loanPayments.length || finance.budgets.length || finance.recurringTransactionSeries.length || finance.savingsGoals.length || finance.savingsContributions.length,
  );

  const toggleFinanceAmounts = () => {
    const next = !hideFinanceAmounts;
    setHideFinanceAmounts(next);
    try { localStorage.setItem('life-tracker-finance-hide-amounts', String(next)); } catch { /* Keep the dashboard preference for this visit. */ }
  };
  const toggleTask = (id: string) => { void todoStore.toggleTodo(id).catch(() => undefined); };
  const loadSampleData = async () => {
    try { await loadDemoData(); window.location.reload(); }
    catch (error) { reportCloudError(error); }
  };

  if (authLoading || (fitness.isLoading && !fitness.isLoaded)) return <DashboardSkeleton />;

  const dashboardError = authError || todoStore.error;
  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader today={today} dateLabel={dateLabel} />
      {dashboardError && <div role="alert" className="rounded-2xl border border-app-border bg-app-card px-4 py-3 text-sm text-app-subtle">Some tracker updates are taking a little longer to appear. You can continue with the information that’s available. {todoStore.error && <Link to="/todos" className="ml-1 font-semibold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Open To-Do</Link>}</div>}

      {!hasAnyData ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"><GetStartedCard onLoadSample={loadSampleData} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          <TodayCard
            habits={todayHabits}
            tasks={todayTasks}
            plannedWorkout={scheduledToday ? { name: scheduledToday.name, completed: todayWorkoutComplete } : null}
            hasFitnessProfile={Boolean(fitness.profile)}
            completedCount={completedTodayCount}
            plannedCount={plannedTodayCount}
            onHabitToggle={(id) => toggleHabitCompletion(id, today)}
            onTaskToggle={toggleTask}
          />
          <Suspense fallback={<InsightsSkeleton />}>
            <DashboardInsights weekData={weekData} moodData={moodData} stats={stats} currency={finance.financeSettings.currency} hideAmounts={hideFinanceAmounts} />
          </Suspense>
          <MoneyCard income={monthlyIncome} spending={monthlySpending} budget={finance.financeSettings.overallMonthlyBudget} toReceive={toReceive} toPay={toPay} currency={finance.financeSettings.currency} hideAmounts={hideFinanceAmounts} onToggleHideAmounts={toggleFinanceAmounts} />
          <GoalsCard goals={goals} />
        </div>
      )}
    </div>
  );
}

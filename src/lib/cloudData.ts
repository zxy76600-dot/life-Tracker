import type { DailyHealth, FinanceBudget, FinanceSettings, Goal, Habit, Loan, LoanPayment, MoodEntry, RecurringTransactionSeries, SavingsContribution, SavingsGoal, Todo, TodoSeries, TodoSubtask, Transaction, Wallet, WalletTransfer, Workout } from '../types';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { generateId, getTodayStr } from '../utils/helpers';
import { requireSupabase } from './supabase';

type Row = Record<string, unknown>;

async function currentUserId() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in to access your Life Tracker data.');
  return data.user.id;
}

async function insert(table: string, values: Row | Row[]) {
  const client = requireSupabase();
  const user_id = await currentUserId();
  const rows = (Array.isArray(values) ? values : [values]).map((row) => ({ ...row, user_id }));
  if (!rows.length) return;
  const { error } = await client.from(table).insert(rows);
  if (error) throw error;
}

async function update(table: string, id: string, values: Row) {
  const client = requireSupabase();
  const { error } = await client.from(table).update(values).eq('id', id);
  if (error) throw error;
}

async function remove(table: string, id: string) {
  const client = requireSupabase();
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTrackerData() {
  const client = requireSupabase();
  const [habitsRes, completionsRes, goalsRes, milestonesRes, moodsRes, workoutsRes, healthRes, transactionsRes, todosRes, subtasksRes, seriesRes,
    walletsRes, transfersRes, loansRes, paymentsRes, budgetsRes, settingsRes, financeSeriesRes, savingsGoalsRes, savingsContributionsRes] = await Promise.all([
    client.from('habits').select('*').order('created_at'),
    client.from('habit_completions').select('*').order('completed_date'),
    client.from('goals').select('*').order('created_at'),
    client.from('goal_milestones').select('*').order('created_at'),
    client.from('mood_entries').select('*').order('entry_date'),
    client.from('workouts').select('*').order('workout_date', { ascending: false }),
    client.from('daily_health').select('*').order('health_date', { ascending: false }),
    client.from('transactions').select('*').order('transaction_date', { ascending: false }),
    client.from('todos').select('*').order('task_date').order('task_time', { nullsFirst: false }).order('position'),
    client.from('todo_subtasks').select('*').order('position'),
    client.from('todo_series').select('*').order('created_at'),
    client.from('wallets').select('*').order('created_at'),
    client.from('wallet_transfers').select('*').order('transfer_date', { ascending: false }),
    client.from('loans').select('*').order('loan_date', { ascending: false }),
    client.from('loan_payments').select('*').order('payment_date', { ascending: false }),
    client.from('budgets').select('*').order('month_start', { ascending: false }),
    client.from('finance_settings').select('*').maybeSingle(),
    client.from('recurring_transaction_series').select('*').order('created_at'),
    client.from('savings_goals').select('*').order('created_at'),
    client.from('savings_contributions').select('*').order('contribution_date', { ascending: false }),
  ]);
  for (const result of [habitsRes, completionsRes, goalsRes, milestonesRes, moodsRes, workoutsRes, healthRes, transactionsRes]) {
    if (result.error) throw result.error;
  }
  // Keep the existing trackers available until the user applies the review-only To-Do migration.
  const todoSchemaUnavailable = [todosRes, subtasksRes, seriesRes].some((result) =>
    result.error && ['PGRST205', '42P01'].includes(result.error.code),
  );
  if (!todoSchemaUnavailable) {
    for (const result of [todosRes, subtasksRes, seriesRes]) if (result.error) throw result.error;
  }
  const financeResults = [walletsRes, transfersRes, loansRes, paymentsRes, budgetsRes, settingsRes, financeSeriesRes, savingsGoalsRes, savingsContributionsRes];
  const financeSchemaUnavailable = financeResults.some((result) => result.error && ['PGRST205', '42P01', '42703'].includes(result.error.code));
  if (!financeSchemaUnavailable) for (const result of financeResults) if (result.error) throw result.error;
  const completions = completionsRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const todoSubtasks = todoSchemaUnavailable ? [] : subtasksRes.data ?? [];
  return {
    habits: (habitsRes.data ?? []).map((row) => ({
      id: row.id, name: row.name, icon: row.icon, color: row.color,
      frequency: row.frequency, createdAt: row.created_at,
      completedDates: completions.filter((item) => item.habit_id === row.id).map((item) => item.completed_date),
    })) as Habit[],
    goals: (goalsRes.data ?? []).map((row) => ({
      id: row.id, title: row.title, description: row.description, category: row.category,
      targetDate: row.target_date, createdAt: row.created_at, completed: row.completed,
      milestones: milestones.filter((item) => item.goal_id === row.id).map((item) => ({
        id: item.id, title: item.title, completed: item.completed,
      })),
    })) as Goal[],
    entries: (moodsRes.data ?? []).map((row) => ({
      id: row.id, date: row.entry_date, mood: row.mood, note: row.note, tags: row.tags ?? [],
    })) as MoodEntry[],
    workouts: (workoutsRes.data ?? []).map((row) => ({
      id: row.id, type: row.type, name: row.name, duration: row.duration,
      calories: row.calories, date: row.workout_date, notes: row.notes,
    })) as Workout[],
    dailyHealth: (healthRes.data ?? []).map((row) => ({
      date: row.health_date, sleepHours: row.sleep_hours, waterGlasses: row.water_glasses,
    })) as DailyHealth[],
    transactions: (transactionsRes.data ?? []).map((row) => ({
      id: row.id, type: row.type, amount: row.amount, category: row.category,
      description: row.description, date: row.transaction_date, walletId: financeSchemaUnavailable ? undefined : row.wallet_id ?? null,
      recurringSeriesId: financeSchemaUnavailable ? undefined : row.recurring_series_id ?? null,
      splitTotalAmount: financeSchemaUnavailable ? undefined : row.split_total_amount == null ? null : Number(row.split_total_amount),
    })) as Transaction[],
    financeSchemaAvailable: !financeSchemaUnavailable,
    wallets: (financeSchemaUnavailable ? [] : walletsRes.data ?? []).map((row) => ({
      id: row.id, name: row.name, openingBalance: Number(row.opening_balance), archivedAt: row.archived_at, createdAt: row.created_at,
    })) as Wallet[],
    transfers: (financeSchemaUnavailable ? [] : transfersRes.data ?? []).map((row) => ({
      id: row.id, fromWalletId: row.from_wallet_id, toWalletId: row.to_wallet_id, amount: Number(row.amount), date: row.transfer_date, note: row.note,
    })) as WalletTransfer[],
    loans: (financeSchemaUnavailable ? [] : loansRes.data ?? []).map((row) => ({
      id: row.id, direction: row.direction, person: row.person, amount: Number(row.amount), date: row.loan_date,
      dueDate: row.due_date, note: row.note, walletId: row.wallet_id, linkedTransactionId: row.linked_transaction_id, createdAt: row.created_at,
    })) as Loan[],
    loanPayments: (financeSchemaUnavailable ? [] : paymentsRes.data ?? []).map((row) => ({
      id: row.id, loanId: row.loan_id, walletId: row.wallet_id, amount: Number(row.amount), date: row.payment_date, note: row.note,
    })) as LoanPayment[],
    budgets: (financeSchemaUnavailable ? [] : budgetsRes.data ?? []).map((row) => ({
      id: row.id, monthStart: row.month_start, category: row.category, amount: Number(row.amount),
    })) as FinanceBudget[],
    financeSettings: (financeSchemaUnavailable || !settingsRes.data ? { currency: 'INR', overallMonthlyBudget: null, keywordRules: [] } : {
      currency: settingsRes.data.currency, overallMonthlyBudget: settingsRes.data.overall_monthly_budget == null ? null : Number(settingsRes.data.overall_monthly_budget),
      keywordRules: settingsRes.data.keyword_rules ?? [],
    }) as FinanceSettings,
    financeSettingsExists: !financeSchemaUnavailable && Boolean(settingsRes.data),
    recurringTransactionSeries: (financeSchemaUnavailable ? [] : financeSeriesRes.data ?? []).map((row) => ({
      id: row.id, type: row.type, amount: Number(row.amount), category: row.category, description: row.description,
      walletId: row.wallet_id, frequency: row.frequency, startsOn: row.starts_on, endsOn: row.ends_on,
      active: row.active, createdAt: row.created_at,
    })) as RecurringTransactionSeries[],
    savingsGoals: (financeSchemaUnavailable ? [] : savingsGoalsRes.data ?? []).map((row) => ({
      id: row.id, name: row.name, targetAmount: Number(row.target_amount), targetDate: row.target_date, createdAt: row.created_at,
    })) as SavingsGoal[],
    savingsContributions: (financeSchemaUnavailable ? [] : savingsContributionsRes.data ?? []).map((row) => ({
      id: row.id, goalId: row.goal_id, walletId: row.wallet_id, amount: Number(row.amount), date: row.contribution_date, note: row.note,
    })) as SavingsContribution[],
    todos: (todoSchemaUnavailable ? [] : todosRes.data ?? []).map((row) => ({
      id: row.id, seriesId: row.series_id, title: row.title, notes: row.notes, date: row.task_date,
      time: row.task_time, priority: row.priority, category: row.category, position: row.position,
      reminderEnabled: row.reminder_enabled, createdAt: row.created_at, completedAt: row.completed_at,
      subtasks: todoSubtasks.filter((item) => item.todo_id === row.id).map((item) => ({
        id: item.id, title: item.title, completed: item.completed, position: item.position, createdAt: item.created_at,
      })),
    })) as Todo[],
    todoSeries: (todoSchemaUnavailable ? [] : seriesRes.data ?? []).map((row) => ({
      id: row.id, title: row.title, notes: row.notes, time: row.task_time, priority: row.priority,
      category: row.category, reminderEnabled: row.reminder_enabled, recurrence: row.recurrence,
      subtasks: row.subtasks_template ?? [], weekdays: row.weekdays ?? [], startsOn: row.starts_on, endsOn: row.ends_on,
      active: row.active, createdAt: row.created_at,
    })) as TodoSeries[],
  };
}

export async function createTodo(todo: Todo) {
  await insert('todos', {
    id: todo.id, series_id: todo.seriesId, title: todo.title, notes: todo.notes, task_date: todo.date,
    task_time: todo.time, priority: todo.priority, category: todo.category, position: todo.position,
    reminder_enabled: todo.reminderEnabled, created_at: todo.createdAt, completed_at: todo.completedAt,
  });
  if (todo.subtasks.length) await insert('todo_subtasks', todo.subtasks.map((item) => ({
    id: item.id, todo_id: todo.id, title: item.title, completed: item.completed,
    position: item.position, created_at: item.createdAt,
  })));
}

export async function updateTodo(id: string, values: Partial<Todo>) {
  const row: Row = {};
  if (values.title !== undefined) row.title = values.title;
  if (values.notes !== undefined) row.notes = values.notes;
  if (values.date !== undefined) row.task_date = values.date;
  if (values.time !== undefined) row.task_time = values.time;
  if (values.priority !== undefined) row.priority = values.priority;
  if (values.category !== undefined) row.category = values.category;
  if (values.position !== undefined) row.position = values.position;
  if (values.reminderEnabled !== undefined) row.reminder_enabled = values.reminderEnabled;
  if (values.completedAt !== undefined) row.completed_at = values.completedAt;
  if (values.seriesId !== undefined) row.series_id = values.seriesId;
  if (Object.keys(row).length) await update('todos', id, row);
}

export async function deleteTodo(id: string) { await remove('todos', id); }

export async function createTodoSubtask(todoId: string, subtask: TodoSubtask) {
  await insert('todo_subtasks', {
    id: subtask.id, todo_id: todoId, title: subtask.title, completed: subtask.completed,
    position: subtask.position, created_at: subtask.createdAt,
  });
}

export async function updateTodoSubtask(id: string, values: Partial<TodoSubtask>) {
  const row: Row = {};
  if (values.title !== undefined) row.title = values.title;
  if (values.completed !== undefined) row.completed = values.completed;
  if (values.position !== undefined) row.position = values.position;
  if (Object.keys(row).length) await update('todo_subtasks', id, row);
}

export async function deleteTodoSubtask(id: string) { await remove('todo_subtasks', id); }

export async function updateTodoPositions(orderedIds: string[]) {
  await Promise.all(orderedIds.map((id, position) => update('todos', id, { position })));
}

export function todoSeriesOccursOn(series: TodoSeries, date: string) {
  if (date < series.startsOn || (series.endsOn && date > series.endsOn)) return false;
  const localDate = parseISO(date);
  if (series.recurrence === 'daily') return true;
  if (series.recurrence === 'weekdays') return localDate.getDay() >= 1 && localDate.getDay() <= 5;
  if (series.recurrence === 'weekly') {
    const weekday = localDate.getDay() === 0 ? 7 : localDate.getDay();
    return series.weekdays.includes(weekday);
  }
  return localDate.getDate() === parseISO(series.startsOn).getDate();
}

export async function ensureRecurringTodoWindow(series: TodoSeries[], existingTodos: Todo[]) {
  const today = parseISO(getTodayStr());
  const horizon = format(addDays(today, 13), 'yyyy-MM-dd');
  const existing = new Set(existingTodos.filter((todo) => todo.seriesId).map((todo) => `${todo.seriesId}:${todo.date}`));
  const rows: Row[] = [];
  for (const item of series.filter((entry) => entry.active)) {
    const start = item.startsOn > getTodayStr() ? parseISO(item.startsOn) : today;
    const end = item.endsOn && item.endsOn < horizon ? parseISO(item.endsOn) : parseISO(horizon);
    for (let date = start; date <= end; date = addDays(date, 1)) {
      const taskDate = format(date, 'yyyy-MM-dd');
      const key = `${item.id}:${taskDate}`;
      if (!existing.has(key) && todoSeriesOccursOn(item, taskDate)) rows.push({
        id: generateId(), series_id: item.id, title: item.title, notes: item.notes, task_date: taskDate,
        task_time: item.time, priority: item.priority, category: item.category, position: 0,
        reminder_enabled: item.reminderEnabled,
      });
    }
    // Always retain the first planned occurrence, including a start date beyond the rolling window.
    const firstKey = `${item.id}:${item.startsOn}`;
    if (!existing.has(firstKey) && !rows.some((row) => row.series_id === item.id && row.task_date === item.startsOn) && todoSeriesOccursOn(item, item.startsOn)) {
      rows.push({ id: generateId(), series_id: item.id, title: item.title, notes: item.notes, task_date: item.startsOn,
        task_time: item.time, priority: item.priority, category: item.category, position: 0, reminder_enabled: item.reminderEnabled });
    }
  }
  if (!rows.length) return [] as Todo[];
  const client = requireSupabase();
  const user_id = await currentUserId();
  const { data, error } = await client.from('todos').upsert(rows.map((row) => ({ ...row, user_id })), {
    onConflict: 'user_id,series_id,task_date', ignoreDuplicates: true,
  }).select('*');
  if (error) throw error;
  const newRows = data ?? [];
  const subtasksToInsert = newRows.flatMap((row) => {
    const source = series.find((item) => item.id === row.series_id);
    return (source?.subtasks ?? []).map((title, position) => ({
      user_id, id: generateId(), todo_id: row.id, title, completed: false, position,
    }));
  });
  if (subtasksToInsert.length) {
    const { error: subtaskError } = await client.from('todo_subtasks').insert(subtasksToInsert);
    if (subtaskError) throw subtaskError;
  }
  return newRows.map((row) => ({
    id: row.id, seriesId: row.series_id, title: row.title, notes: row.notes, date: row.task_date,
    time: row.task_time, priority: row.priority, category: row.category, position: row.position,
    reminderEnabled: row.reminder_enabled, createdAt: row.created_at, completedAt: row.completed_at,
    subtasks: subtasksToInsert.filter((item) => item.todo_id === row.id).map((item) => ({
      id: item.id, title: item.title, completed: false, position: item.position, createdAt: new Date().toISOString(),
    })),
  })) as Todo[];
}

export async function createTodoSeries(series: TodoSeries) {
  await insert('todo_series', {
    id: series.id, title: series.title, notes: series.notes, task_time: series.time,
    priority: series.priority, category: series.category, reminder_enabled: series.reminderEnabled,
    recurrence: series.recurrence, subtasks_template: series.subtasks, weekdays: series.weekdays, starts_on: series.startsOn,
    ends_on: series.endsOn, active: series.active, created_at: series.createdAt,
  });
}

export async function updateTodoSeries(id: string, changes: Partial<TodoSeries>) {
  const row: Row = {};
  if (changes.title !== undefined) row.title = changes.title;
  if (changes.notes !== undefined) row.notes = changes.notes;
  if (changes.time !== undefined) row.task_time = changes.time;
  if (changes.priority !== undefined) row.priority = changes.priority;
  if (changes.category !== undefined) row.category = changes.category;
  if (changes.reminderEnabled !== undefined) row.reminder_enabled = changes.reminderEnabled;
  if (changes.recurrence !== undefined) row.recurrence = changes.recurrence;
  if (changes.subtasks !== undefined) row.subtasks_template = changes.subtasks;
  if (changes.weekdays !== undefined) row.weekdays = changes.weekdays;
  if (changes.startsOn !== undefined) row.starts_on = changes.startsOn;
  if (changes.endsOn !== undefined) row.ends_on = changes.endsOn;
  if (changes.active !== undefined) row.active = changes.active;
  if (Object.keys(row).length) await update('todo_series', id, row);
}

export async function createHabit(habit: Habit) {
  await insert('habits', { id: habit.id, name: habit.name, icon: habit.icon, color: habit.color, frequency: habit.frequency, created_at: habit.createdAt });
}
export async function deleteHabit(id: string) { await remove('habits', id); }
export async function updateHabit(id: string, values: Partial<Habit>) {
  const row: Row = {};
  if (values.name !== undefined) row.name = values.name;
  if (values.icon !== undefined) row.icon = values.icon;
  if (values.color !== undefined) row.color = values.color;
  if (values.frequency !== undefined) row.frequency = values.frequency;
  if (Object.keys(row).length) await update('habits', id, row);
  if (values.completedDates !== undefined) {
    const client = requireSupabase();
    const { data, error } = await client.from('habit_completions').select('id,completed_date').eq('habit_id', id);
    if (error) throw error;
    const existing = data ?? [];
    const desired = new Set(values.completedDates);
    const toDelete = existing.filter((item) => !desired.has(item.completed_date));
    if (toDelete.length) {
      const { error: deleteError } = await client.from('habit_completions').delete().in('id', toDelete.map((item) => item.id));
      if (deleteError) throw deleteError;
    }
    const existingDates = new Set(existing.map((item) => item.completed_date));
    for (const date of values.completedDates.filter((item) => !existingDates.has(item))) await setHabitCompletion(id, date, true);
  }
}
export async function setHabitCompletion(habitId: string, date: string, complete: boolean) {
  const client = requireSupabase();
  if (complete) await insert('habit_completions', { id: generateId(), habit_id: habitId, completed_date: date });
  else {
    const { error } = await client.from('habit_completions').delete().eq('habit_id', habitId).eq('completed_date', date);
    if (error) throw error;
  }
}

export async function createGoal(goal: Goal) {
  await insert('goals', { id: goal.id, title: goal.title, description: goal.description, category: goal.category, target_date: goal.targetDate, created_at: goal.createdAt, completed: goal.completed });
  await insert('goal_milestones', goal.milestones.map((item) => ({ id: item.id, goal_id: goal.id, title: item.title, completed: item.completed, created_at: goal.createdAt })));
}
export async function deleteGoal(id: string) { await remove('goals', id); }
export async function setGoalComplete(id: string, completed: boolean) { await update('goals', id, { completed }); }
export async function setMilestoneComplete(id: string, completed: boolean) { await update('goal_milestones', id, { completed }); }
export async function editGoal(id: string, values: Partial<Goal>) {
  const row: Row = {};
  if (values.title !== undefined) row.title = values.title;
  if (values.description !== undefined) row.description = values.description;
  if (values.category !== undefined) row.category = values.category;
  if (values.targetDate !== undefined) row.target_date = values.targetDate;
  if (values.completed !== undefined) row.completed = values.completed;
  if (Object.keys(row).length) await update('goals', id, row);
  if (values.milestones !== undefined) {
    const client = requireSupabase();
    const user_id = await currentUserId();
    const { data, error } = await client.from('goal_milestones').select('id').eq('goal_id', id);
    if (error) throw error;
    const retained = new Set(values.milestones.map((item) => item.id));
    const removed = (data ?? []).filter((item) => !retained.has(item.id)).map((item) => item.id);
    if (removed.length) {
      const { error: deleteError } = await client.from('goal_milestones').delete().in('id', removed);
      if (deleteError) throw deleteError;
    }
    if (values.milestones.length) {
      const { error: saveError } = await client.from('goal_milestones').upsert(values.milestones.map((item) => ({
        user_id, id: item.id, goal_id: id, title: item.title, completed: item.completed,
      })), { onConflict: 'user_id,id' });
      if (saveError) throw saveError;
    }
  }
}

export async function saveMood(entry: MoodEntry) {
  const client = requireSupabase();
  const user_id = await currentUserId();
  const { error } = await client.from('mood_entries').upsert({
    id: entry.id, user_id, entry_date: entry.date, mood: entry.mood, note: entry.note, tags: entry.tags,
  }, { onConflict: 'user_id,entry_date' });
  if (error) throw error;
}
export async function deleteMood(id: string) { await remove('mood_entries', id); }
export async function createWorkout(workout: Workout) {
  await insert('workouts', { id: workout.id, type: workout.type, name: workout.name, duration: workout.duration, calories: workout.calories, workout_date: workout.date, notes: workout.notes });
}
export async function deleteWorkout(id: string) { await remove('workouts', id); }
export async function saveDailyHealth(data: DailyHealth) {
  const client = requireSupabase();
  const user_id = await currentUserId();
  const { error } = await client.from('daily_health').upsert({ user_id, health_date: data.date, sleep_hours: data.sleepHours, water_glasses: data.waterGlasses }, { onConflict: 'user_id,health_date' });
  if (error) throw error;
}
export async function createTransaction(transaction: Transaction) {
  const row: Row = { id: transaction.id, type: transaction.type, amount: roundMoney(transaction.amount), category: transaction.category, description: transaction.description, transaction_date: transaction.date };
  if (transaction.walletId !== undefined) row.wallet_id = transaction.walletId;
  if (transaction.recurringSeriesId !== undefined) row.recurring_series_id = transaction.recurringSeriesId;
  if (transaction.splitTotalAmount !== undefined) row.split_total_amount = transaction.splitTotalAmount;
  await insert('transactions', row);
}
export async function deleteTransaction(id: string) { await remove('transactions', id); }
export async function updateTransaction(id: string, values: Partial<Transaction>) {
  const row: Row = {};
  if (values.type !== undefined) row.type = values.type;
  if (values.amount !== undefined) row.amount = values.amount;
  if (values.category !== undefined) row.category = values.category;
  if (values.description !== undefined) row.description = values.description;
  if (values.date !== undefined) row.transaction_date = values.date;
  if (values.walletId !== undefined) row.wallet_id = values.walletId;
  if (values.recurringSeriesId !== undefined) row.recurring_series_id = values.recurringSeriesId;
  if (values.splitTotalAmount !== undefined) row.split_total_amount = values.splitTotalAmount;
  await update('transactions', id, row);
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export async function createWallet(wallet: Wallet) {
  await insert('wallets', { id: wallet.id, name: wallet.name.trim(), opening_balance: roundMoney(wallet.openingBalance), archived_at: wallet.archivedAt, created_at: wallet.createdAt });
}
export async function updateWallet(id: string, values: Partial<Wallet>) {
  const row: Row = {};
  if (values.name !== undefined) row.name = values.name.trim();
  if (values.openingBalance !== undefined) row.opening_balance = roundMoney(values.openingBalance);
  if (values.archivedAt !== undefined) row.archived_at = values.archivedAt;
  row.updated_at = new Date().toISOString();
  await update('wallets', id, row);
}
export async function createWalletTransfer(transfer: WalletTransfer) {
  await insert('wallet_transfers', { id: transfer.id, from_wallet_id: transfer.fromWalletId, to_wallet_id: transfer.toWalletId, amount: roundMoney(transfer.amount), transfer_date: transfer.date, note: transfer.note });
}
export async function deleteWalletTransfer(id: string) { await remove('wallet_transfers', id); }
export async function createLoan(loan: Loan) {
  await insert('loans', { id: loan.id, direction: loan.direction, person: loan.person.trim(), amount: roundMoney(loan.amount), loan_date: loan.date, due_date: loan.dueDate, note: loan.note, wallet_id: loan.walletId, linked_transaction_id: loan.linkedTransactionId, created_at: loan.createdAt });
}
export async function updateLoan(id: string, values: Partial<Loan>) {
  const row: Row = {};
  if (values.direction !== undefined) row.direction = values.direction;
  if (values.person !== undefined) row.person = values.person.trim();
  if (values.amount !== undefined) row.amount = roundMoney(values.amount);
  if (values.date !== undefined) row.loan_date = values.date;
  if (values.dueDate !== undefined) row.due_date = values.dueDate;
  if (values.note !== undefined) row.note = values.note;
  if (values.walletId !== undefined) row.wallet_id = values.walletId;
  row.updated_at = new Date().toISOString();
  await update('loans', id, row);
}
export async function deleteLoan(id: string) { await remove('loans', id); }
export async function createLoanPayment(payment: LoanPayment) {
  const { error } = await requireSupabase().rpc('add_loan_payment', { p_payment: {
    id: payment.id, loan_id: payment.loanId, wallet_id: payment.walletId, amount: roundMoney(payment.amount),
    payment_date: payment.date, note: payment.note,
  } });
  if (error) throw error;
}
export async function deleteLoanPayment(id: string) { await remove('loan_payments', id); }
export async function upsertFinanceSettings(settings: FinanceSettings) {
  const user_id = await currentUserId();
  const { error } = await requireSupabase().from('finance_settings').upsert({
    user_id, currency: settings.currency, overall_monthly_budget: settings.overallMonthlyBudget == null ? null : roundMoney(settings.overallMonthlyBudget),
    keyword_rules: settings.keywordRules,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}
export async function saveBudget(budget: FinanceBudget) {
  await insert('budgets', { id: budget.id, month_start: budget.monthStart, category: budget.category, amount: roundMoney(budget.amount) });
}
export async function updateBudget(id: string, amount: number) { await update('budgets', id, { amount: roundMoney(amount) }); }
export async function deleteBudget(id: string) { await remove('budgets', id); }
export async function createRecurringTransactionSeries(series: RecurringTransactionSeries) {
  await insert('recurring_transaction_series', {
    id: series.id, type: series.type, amount: roundMoney(series.amount), category: series.category,
    description: series.description, wallet_id: series.walletId, frequency: series.frequency,
    starts_on: series.startsOn, ends_on: series.endsOn, active: series.active, created_at: series.createdAt,
  });
}
export async function updateRecurringTransactionSeries(id: string, values: Partial<RecurringTransactionSeries>) {
  const row: Row = {};
  if (values.active !== undefined) row.active = values.active;
  if (values.amount !== undefined) row.amount = roundMoney(values.amount);
  if (values.category !== undefined) row.category = values.category;
  if (values.description !== undefined) row.description = values.description;
  if (values.walletId !== undefined) row.wallet_id = values.walletId;
  if (values.endsOn !== undefined) row.ends_on = values.endsOn;
  await update('recurring_transaction_series', id, row);
}
export async function deleteRecurringTransactionSeries(id: string) { await remove('recurring_transaction_series', id); }
export async function stopRecurringTransactionSeries(id: string) {
  const client = requireSupabase();
  const { error: updateError } = await client.from('recurring_transaction_series').update({ active: false }).eq('id', id);
  if (updateError) throw updateError;
  const { error } = await client.from('transactions').delete().eq('recurring_series_id', id).gt('transaction_date', getTodayStr());
  if (error) throw error;
}
export async function createSavingsGoal(goal: SavingsGoal) {
  await insert('savings_goals', { id: goal.id, name: goal.name.trim(), target_amount: roundMoney(goal.targetAmount), target_date: goal.targetDate, created_at: goal.createdAt });
}
export async function updateSavingsGoal(id: string, values: Partial<SavingsGoal>) {
  const row: Row = {};
  if (values.name !== undefined) row.name = values.name.trim();
  if (values.targetAmount !== undefined) row.target_amount = roundMoney(values.targetAmount);
  if (values.targetDate !== undefined) row.target_date = values.targetDate;
  await update('savings_goals', id, row);
}
export async function deleteSavingsGoal(id: string) { await remove('savings_goals', id); }
export async function createSavingsContribution(contribution: SavingsContribution) {
  await insert('savings_contributions', { id: contribution.id, goal_id: contribution.goalId, wallet_id: contribution.walletId, amount: roundMoney(contribution.amount), contribution_date: contribution.date, note: contribution.note });
}
export async function deleteSavingsContribution(id: string) { await remove('savings_contributions', id); }

function occursOn(series: RecurringTransactionSeries, day: Date) {
  const start = parseISO(series.startsOn);
  const days = differenceInCalendarDays(day, start);
  if (days < 0) return false;
  if (series.frequency === 'daily') return true;
  if (series.frequency === 'weekly') return days % 7 === 0;
  if (series.frequency === 'monthly') {
    const endOfMonth = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
    return day.getDate() === Math.min(start.getDate(), endOfMonth);
  }
  const endOfFebruary = new Date(day.getFullYear(), 2, 0).getDate();
  return day.getMonth() === start.getMonth() && day.getDate() === Math.min(start.getDate(), endOfFebruary);
}

/** Creates each active series occurrence through the next 30 local calendar days. */
export async function ensureRecurringFinanceWindow(series: RecurringTransactionSeries[], existing: Transaction[]) {
  if (!series.length) return [] as Transaction[];
  const start = parseISO(getTodayStr());
  const end = addDays(start, 30);
  const existingKeys = new Set(existing.filter((item) => item.recurringSeriesId).map((item) => `${item.recurringSeriesId}:${item.date}`));
  const rows: Transaction[] = [];
  for (const item of series.filter((entry) => entry.active)) {
    const first = item.startsOn > getTodayStr() ? parseISO(item.startsOn) : start;
    for (let day = first; day <= end; day = addDays(day, 1)) {
      const date = format(day, 'yyyy-MM-dd');
      if (item.endsOn && date > item.endsOn) continue;
      if (!occursOn(item, day) || existingKeys.has(`${item.id}:${date}`)) continue;
      rows.push({ id: generateId(), type: item.type, amount: roundMoney(item.amount), category: item.category,
        description: item.description, date, walletId: item.walletId, recurringSeriesId: item.id });
    }
  }
  if (!rows.length) return rows;
  const user_id = await currentUserId();
  const payload = rows.map((row) => ({ user_id, id: row.id, type: row.type, amount: row.amount, category: row.category,
    description: row.description, transaction_date: row.date, wallet_id: row.walletId, recurring_series_id: row.recurringSeriesId }));
  const { data, error } = await requireSupabase().from('transactions').upsert(payload, {
    onConflict: 'user_id,recurring_series_id,transaction_date', ignoreDuplicates: true,
  }).select('*');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, type: row.type, amount: Number(row.amount), category: row.category,
    description: row.description, date: row.transaction_date, walletId: row.wallet_id, recurringSeriesId: row.recurring_series_id,
    splitTotalAmount: row.split_total_amount == null ? null : Number(row.split_total_amount) })) as Transaction[];
}

export async function createSplitExpense(transaction: Transaction, shares: Array<{ id: string; person: string; amount: number; dueDate?: string | null }>) {
  const client = requireSupabase();
  const { error } = await client.rpc('create_split_expense', { p_transaction: {
    id: transaction.id, type: transaction.type, amount: roundMoney(transaction.amount), category: transaction.category,
    description: transaction.description, transaction_date: transaction.date, wallet_id: transaction.walletId ?? null,
    split_total_amount: transaction.splitTotalAmount ?? transaction.amount,
  }, p_shares: shares.map((share) => ({ id: share.id, person: share.person.trim(), amount: roundMoney(share.amount), due_date: share.dueDate ?? null })) });
  if (error) throw error;
}

export async function clearCloudData() {
  const client = requireSupabase();
  const user_id = await currentUserId();
  const financeSchemaAvailable = (await fetchTrackerData()).financeSchemaAvailable;
  const financeTables = financeSchemaAvailable ? ['savings_contributions', 'loan_payments', 'loans', 'wallet_transfers', 'transactions', 'recurring_transaction_series', 'savings_goals', 'budgets', 'finance_settings', 'wallets'] : ['transactions'];
  for (const table of [...financeTables, 'todos', 'todo_series', 'habits', 'goals', 'mood_entries', 'workouts', 'daily_health']) {
    const { error } = await client.from(table).delete().eq('user_id', user_id);
    if (error) throw error;
  }
}

export async function exportCloudBackup() {
  const data = await fetchTrackerData();
  const theme = localStorage.getItem('life-tracker-theme');
  return {
    'life-tracker-habits': JSON.stringify({ state: { habits: data.habits }, version: 0 }),
    'life-tracker-goals': JSON.stringify({ state: { goals: data.goals }, version: 0 }),
    'life-tracker-mood': JSON.stringify({ state: { entries: data.entries }, version: 0 }),
    'life-tracker-fitness': JSON.stringify({ state: { workouts: data.workouts, dailyHealth: data.dailyHealth }, version: 0 }),
    'life-tracker-finances': JSON.stringify({ state: { transactions: data.transactions }, version: 0 }),
    'life-tracker-finance-details': JSON.stringify({ state: {
      wallets: data.wallets, transfers: data.transfers, loans: data.loans, loanPayments: data.loanPayments,
      budgets: data.budgets, financeSettings: data.financeSettings, recurringTransactionSeries: data.recurringTransactionSeries,
      savingsGoals: data.savingsGoals, savingsContributions: data.savingsContributions,
    }, version: 0 }),
    'life-tracker-todos': JSON.stringify({ state: { todos: data.todos, series: data.todoSeries }, version: 0 }),
    'life-tracker-theme': theme,
  };
}

export type LegacyBackup = Record<string, string | null>;
const legacyKeys = ['life-tracker-habits', 'life-tracker-goals', 'life-tracker-mood', 'life-tracker-fitness', 'life-tracker-finances', 'life-tracker-todos'] as const;
const financeDetailsKey = 'life-tracker-finance-details';

function parseLegacy<T>(backup: LegacyBackup, key: typeof legacyKeys[number], field: string): T[] {
  const raw = backup[key];
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) throw new Error(`Backup data for ${key} is invalid.`);
  const state = (parsed as { state: Record<string, unknown> }).state;
  const value = state[field];
  if (!Array.isArray(value)) throw new Error(`Backup data for ${key} is invalid.`);
  return value as T[];
}

export function getLegacyBackup(): LegacyBackup {
  return Object.fromEntries([...legacyKeys, financeDetailsKey, 'life-tracker-theme'].map((key) => [key, localStorage.getItem(key)]));
}

export async function importLegacyBackup(backup: LegacyBackup) {
  const data = await fetchTrackerData();
  const hasCloudData = [data.habits, data.goals, data.entries, data.workouts, data.transactions, data.todos, data.todoSeries,
    data.wallets, data.transfers, data.loans, data.loanPayments, data.budgets, data.savingsGoals, data.savingsContributions]
    .some((items) => items.length > 0) || data.financeSettingsExists;
  if (hasCloudData) throw new Error('Cloud data already exists. Import is disabled to prevent overwriting it.');

  const habits = parseLegacy<Habit>(backup, legacyKeys[0], 'habits');
  const goals = parseLegacy<Goal>(backup, legacyKeys[1], 'goals');
  const entries = parseLegacy<MoodEntry>(backup, legacyKeys[2], 'entries');
  const fitness = JSON.parse(backup[legacyKeys[3]] ?? '{"state":{}}') as { state?: { workouts?: Workout[]; dailyHealth?: DailyHealth[] } };
  const finance = parseLegacy<Transaction>(backup, legacyKeys[4], 'transactions');
  let financeDetails: Record<string, unknown> = {};
  try {
    const raw = backup[financeDetailsKey];
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !('state' in parsed) || !parsed.state || typeof parsed.state !== 'object') throw new Error();
      financeDetails = (parsed as { state: Record<string, unknown> }).state;
    }
  } catch { throw new Error('Finance backup data is invalid.'); }
  const detailArrays = ['wallets', 'transfers', 'loans', 'loanPayments', 'budgets', 'recurringTransactionSeries', 'savingsGoals', 'savingsContributions'] as const;
  for (const key of detailArrays) if (financeDetails[key] !== undefined && !Array.isArray(financeDetails[key])) throw new Error('Finance backup data is invalid.');
  for (const transaction of finance) {
    if (!transaction || typeof transaction.id !== 'string' || !['income', 'expense'].includes(transaction.type)
      || !Number.isFinite(Number(transaction.amount)) || Number(transaction.amount) <= 0 || !Number.isFinite(Math.round(Number(transaction.amount) * 100))
      || typeof transaction.category !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
      throw new Error('Finance backup includes a transaction with an invalid date, category or amount. Amounts must be greater than zero.');
    }
  }
  let todoBackup: { state?: { todos?: Todo[]; series?: TodoSeries[] } };
  try {
    const parsed: unknown = JSON.parse(backup[legacyKeys[5]] ?? '{"state":{}}');
    if (!parsed || typeof parsed !== 'object' || !('state' in parsed) || !parsed.state || typeof parsed.state !== 'object') throw new Error();
    todoBackup = parsed as { state?: { todos?: Todo[]; series?: TodoSeries[] } };
  } catch { throw new Error('To-Do backup data is invalid.'); }
  const todos = todoBackup.state?.todos ?? [];
  const todoSeries = todoBackup.state?.series ?? [];
  const workouts = fitness.state?.workouts ?? [];
  const dailyHealth = fitness.state?.dailyHealth ?? [];
  if (!Array.isArray(workouts) || !Array.isArray(dailyHealth)) throw new Error('Fitness backup data is invalid.');
  if (!Array.isArray(todos) || !Array.isArray(todoSeries)) throw new Error('To-Do backup data is invalid.');
  if (todos.some((todo) => !todo || typeof todo.id !== 'string' || typeof todo.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(todo.date) || !Array.isArray(todo.subtasks)
    || !['low', 'medium', 'high'].includes(todo.priority) || todo.subtasks.some((item) => !item || typeof item.id !== 'string' || typeof item.title !== 'string'))) throw new Error('To-Do backup data is invalid.');
  if (todoSeries.some((series) => !series || typeof series.id !== 'string' || typeof series.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(series.startsOn)
    || !['daily', 'weekdays', 'weekly', 'monthly'].includes(series.recurrence) || !['low', 'medium', 'high'].includes(series.priority)
    || !Array.isArray(series.weekdays) || !Array.isArray(series.subtasks ?? []))) throw new Error('To-Do recurring backup data is invalid.');
  const seriesIds = new Set(todoSeries.map((series) => series.id));
  if (todos.some((todo) => todo.seriesId && !seriesIds.has(todo.seriesId))) throw new Error('To-Do backup contains a task with a missing repeating schedule.');
  const hasFinanceDetails = detailArrays.some((key) => Array.isArray(financeDetails[key]) && (financeDetails[key] as unknown[]).length > 0)
    || Boolean(financeDetails.financeSettings);
  if (![habits, goals, entries, workouts, dailyHealth, finance, todos, todoSeries].some((items) => items.length > 0) && !hasFinanceDetails) {
    throw new Error('This backup contains no tracker records to import.');
  }

  const payload = {
    habits: habits.map(({ id, name, icon, color, frequency, createdAt }) => ({ id, name, icon, color, frequency, created_at: createdAt })),
    habit_completions: habits.flatMap((habit) => (habit.completedDates ?? []).map((completed_date) => ({ id: generateId(), habit_id: habit.id, completed_date }))),
    goals: goals.map(({ id, title, description, category, targetDate, createdAt, completed }) => ({ id, title, description, category, target_date: targetDate, created_at: createdAt, completed })),
    goal_milestones: goals.flatMap((goal) => (goal.milestones ?? []).map(({ id, title, completed }) => ({ id, goal_id: goal.id, title, completed, created_at: goal.createdAt }))),
    mood_entries: entries.map(({ id, date, mood, note, tags }) => ({ id, entry_date: date, mood, note, tags })),
    workouts: workouts.map(({ id, type, name, duration, calories, date, notes }) => ({ id, type, name, duration, calories, workout_date: date, notes })),
    daily_health: dailyHealth.map(({ date, sleepHours, waterGlasses }) => ({ health_date: date, sleep_hours: sleepHours, water_glasses: waterGlasses })),
    transactions: finance.map(({ id, type, amount, category, description, date, walletId, recurringSeriesId, splitTotalAmount }) => ({ id, type, amount: Math.round((Number(amount) + Number.EPSILON) * 100) / 100, category, description, transaction_date: date, wallet_id: walletId ?? null, recurring_series_id: recurringSeriesId ?? null, split_total_amount: splitTotalAmount ?? null })),
    todo_series: todoSeries.map((series) => ({
      id: series.id, title: series.title, notes: series.notes ?? '', task_time: series.time, priority: series.priority,
      category: series.category, reminder_enabled: series.reminderEnabled, recurrence: series.recurrence,
      subtasks_template: series.subtasks ?? [], weekdays: series.weekdays ?? [], starts_on: series.startsOn,
      ends_on: series.endsOn, active: series.active, created_at: series.createdAt,
    })),
    todos: todos.map(({ id, seriesId, title, notes, date, time, priority, category, position, reminderEnabled, createdAt, completedAt }) => ({
      id, series_id: seriesId, title, notes, task_date: date, task_time: time, priority, category,
      position, reminder_enabled: reminderEnabled, created_at: createdAt, completed_at: completedAt,
    })),
    todo_subtasks: todos.flatMap((todo) => todo.subtasks.map((subtask) => ({
      id: subtask.id, todo_id: todo.id, title: subtask.title, completed: subtask.completed,
      position: subtask.position, created_at: subtask.createdAt,
    }))),
    wallets: ((financeDetails.wallets as Wallet[] | undefined) ?? []).map((item) => ({ id: item.id, name: item.name, opening_balance: item.openingBalance, archived_at: item.archivedAt, created_at: item.createdAt, updated_at: item.createdAt })),
    recurring_transaction_series: ((financeDetails.recurringTransactionSeries as RecurringTransactionSeries[] | undefined) ?? []).map((item) => ({ id: item.id, type: item.type, amount: item.amount, category: item.category, description: item.description, wallet_id: item.walletId, frequency: item.frequency, starts_on: item.startsOn, ends_on: item.endsOn, active: item.active, created_at: item.createdAt })),
    wallet_transfers: ((financeDetails.transfers as WalletTransfer[] | undefined) ?? []).map((item) => ({ id: item.id, from_wallet_id: item.fromWalletId, to_wallet_id: item.toWalletId, amount: item.amount, transfer_date: item.date, note: item.note })),
    loans: ((financeDetails.loans as Loan[] | undefined) ?? []).map((item) => ({ id: item.id, direction: item.direction, person: item.person, amount: item.amount, loan_date: item.date, due_date: item.dueDate, note: item.note, wallet_id: item.walletId, linked_transaction_id: item.linkedTransactionId, created_at: item.createdAt, updated_at: item.createdAt })),
    loan_payments: ((financeDetails.loanPayments as LoanPayment[] | undefined) ?? []).map((item) => ({ id: item.id, loan_id: item.loanId, wallet_id: item.walletId, amount: item.amount, payment_date: item.date, note: item.note })),
    budgets: ((financeDetails.budgets as FinanceBudget[] | undefined) ?? []).map((item) => ({ id: item.id, month_start: item.monthStart, category: item.category, amount: item.amount })),
    finance_settings: financeDetails.financeSettings ? [{ currency: (financeDetails.financeSettings as FinanceSettings).currency, overall_monthly_budget: (financeDetails.financeSettings as FinanceSettings).overallMonthlyBudget, keyword_rules: (financeDetails.financeSettings as FinanceSettings).keywordRules }] : [],
    savings_goals: ((financeDetails.savingsGoals as SavingsGoal[] | undefined) ?? []).map((item) => ({ id: item.id, name: item.name, target_amount: item.targetAmount, target_date: item.targetDate, created_at: item.createdAt, updated_at: item.createdAt })),
    savings_contributions: ((financeDetails.savingsContributions as SavingsContribution[] | undefined) ?? []).map((item) => ({ id: item.id, goal_id: item.goalId, wallet_id: item.walletId, amount: item.amount, contribution_date: item.date, note: item.note })),
  };
  const { error } = await requireSupabase().rpc('import_life_tracker_data', { payload });
  if (error) throw error;

  const updated = await fetchTrackerData();
  return updated;
}


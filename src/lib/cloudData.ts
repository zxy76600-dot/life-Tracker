import type { DailyHealth, Goal, Habit, MoodEntry, Transaction, Workout } from '../types';
import { generateId } from '../utils/helpers';
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
  const [habitsRes, completionsRes, goalsRes, milestonesRes, moodsRes, workoutsRes, healthRes, transactionsRes] = await Promise.all([
    client.from('habits').select('*').order('created_at'),
    client.from('habit_completions').select('*').order('completed_date'),
    client.from('goals').select('*').order('created_at'),
    client.from('goal_milestones').select('*').order('created_at'),
    client.from('mood_entries').select('*').order('entry_date'),
    client.from('workouts').select('*').order('workout_date', { ascending: false }),
    client.from('daily_health').select('*').order('health_date', { ascending: false }),
    client.from('transactions').select('*').order('transaction_date', { ascending: false }),
  ]);
  for (const result of [habitsRes, completionsRes, goalsRes, milestonesRes, moodsRes, workoutsRes, healthRes, transactionsRes]) {
    if (result.error) throw result.error;
  }
  const completions = completionsRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
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
      description: row.description, date: row.transaction_date,
    })) as Transaction[],
  };
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
  await insert('transactions', { id: transaction.id, type: transaction.type, amount: transaction.amount, category: transaction.category, description: transaction.description, transaction_date: transaction.date });
}
export async function deleteTransaction(id: string) { await remove('transactions', id); }
export async function updateTransaction(id: string, values: Partial<Transaction>) {
  const row: Row = {};
  if (values.type !== undefined) row.type = values.type;
  if (values.amount !== undefined) row.amount = values.amount;
  if (values.category !== undefined) row.category = values.category;
  if (values.description !== undefined) row.description = values.description;
  if (values.date !== undefined) row.transaction_date = values.date;
  await update('transactions', id, row);
}

export async function clearCloudData() {
  const client = requireSupabase();
  const user_id = await currentUserId();
  for (const table of ['habits', 'goals', 'mood_entries', 'workouts', 'daily_health', 'transactions']) {
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
    'life-tracker-theme': theme,
  };
}

export type LegacyBackup = Record<string, string | null>;
const legacyKeys = ['life-tracker-habits', 'life-tracker-goals', 'life-tracker-mood', 'life-tracker-fitness', 'life-tracker-finances'] as const;

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
  return Object.fromEntries([...legacyKeys, 'life-tracker-theme'].map((key) => [key, localStorage.getItem(key)]));
}

export async function importLegacyBackup(backup: LegacyBackup) {
  const data = await fetchTrackerData();
  const hasCloudData = Object.values(data).some((items) => items.length > 0);
  if (hasCloudData) throw new Error('Cloud data already exists. Import is disabled to prevent overwriting it.');

  const habits = parseLegacy<Habit>(backup, legacyKeys[0], 'habits');
  const goals = parseLegacy<Goal>(backup, legacyKeys[1], 'goals');
  const entries = parseLegacy<MoodEntry>(backup, legacyKeys[2], 'entries');
  const fitness = JSON.parse(backup[legacyKeys[3]] ?? '{"state":{}}') as { state?: { workouts?: Workout[]; dailyHealth?: DailyHealth[] } };
  const finance = parseLegacy<Transaction>(backup, legacyKeys[4], 'transactions');
  const workouts = fitness.state?.workouts ?? [];
  const dailyHealth = fitness.state?.dailyHealth ?? [];
  if (!Array.isArray(workouts) || !Array.isArray(dailyHealth)) throw new Error('Fitness backup data is invalid.');
  if (![habits, goals, entries, workouts, dailyHealth, finance].some((items) => items.length > 0)) {
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
    transactions: finance.map(({ id, type, amount, category, description, date }) => ({ id, type, amount, category, description, transaction_date: date })),
  };
  const { error } = await requireSupabase().rpc('import_life_tracker_data', { payload });
  if (error) throw error;

  const updated = await fetchTrackerData();
  return updated;
}


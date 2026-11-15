import { useMemo, useState } from 'react';
import { Download, FileDown, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { loadDemoData } from '../../utils/demoData';
import {
  clearCloudData, clearCloudModuleData, exportCloudBackup,
  getLegacyBackup, importLegacyBackup, type ClearableTrackerModule, type LegacyBackup,
} from '../../lib/cloudData';
import { useHabitStore } from '../../stores/habitStore';
import { useGoalStore } from '../../stores/goalStore';
import { useMoodStore } from '../../stores/moodStore';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useFinanceStore } from '../../stores/financeStore';
import { useTodoStore } from '../../stores/todoStore';

const LAST_BACKUP_KEY = 'life-tracker-last-backup';
type CsvRecord = Record<string, unknown>;

const csvValue = (value: unknown) => {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function downloadCsv(filename: string, headers: string[], records: CsvRecord[]) {
  const csv = [headers, ...records.map((record) => headers.map((header) => record[header] ?? ''))]
    .map((row) => row.map(csvValue).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function readBackupDate() {
  try { return localStorage.getItem(LAST_BACKUP_KEY); } catch { return null; }
}

function removeLocalKeys(keys: string[]) {
  try { keys.forEach((key) => localStorage.removeItem(key)); }
  catch { throw new Error('Cloud data was cleared, but this browser could not remove its local cache.'); }
}

const localKeysByModule: Record<ClearableTrackerModule, string[]> = {
  habits: ['life-tracker-habits'],
  goals: ['life-tracker-goals'],
  mood: ['life-tracker-mood'],
  fitness: ['life-tracker-fitness', 'life-tracker-fitness-workout-draft'],
  todo: ['life-tracker-todos'],
  finance: ['life-tracker-finances', 'life-tracker-finance-details', 'life-tracker-finance-hide-amounts'],
};

const tablesByModule: Record<ClearableTrackerModule, string[]> = {
  habits: ['habit_completions', 'habits'],
  goals: ['goal_milestones', 'goals'],
  mood: ['mood_entries'],
  fitness: ['fitness_set_logs', 'fitness_workout_logs', 'fitness_plan_days', 'fitness_plans', 'fitness_routine_exercises', 'fitness_routines', 'custom_exercises', 'fitness_weekly_checkins', 'fitness_profiles', 'workouts', 'daily_health'],
  todo: ['todo_subtasks', 'todos', 'todo_series'],
  finance: ['savings_contributions', 'loan_payments', 'loans', 'wallet_transfers', 'transactions', 'recurring_transaction_series', 'savings_goals', 'budgets', 'finance_settings', 'wallets'],
};

const modules: { id: ClearableTrackerModule; label: string; description: string }[] = [
  { id: 'habits', label: 'Habits', description: 'Your habits and their completion history.' },
  { id: 'goals', label: 'Goals', description: 'Your goals and their milestones.' },
  { id: 'mood', label: 'Mood', description: 'All mood journal entries.' },
  { id: 'fitness', label: 'Fitness', description: 'Fitness profile, plans, routines, workouts, check-ins, sleep and water logs, and the saved workout draft.' },
  { id: 'todo', label: 'To-Do', description: 'Tasks, subtasks and recurring task series.' },
  { id: 'finance', label: 'Finance', description: 'Transactions, transfers, loans, payments, budgets, savings, wallets and finance preferences.' },
];

const clearAllTables = [
  ...tablesByModule.finance, 'todos', 'todo_series', 'habits', 'goals', 'mood_entries',
  ...tablesByModule.fitness,
].filter((table, index, all) => all.indexOf(table) === index);

function clearLegacyKeys() {
  removeLocalKeys([
    'life-tracker-habits', 'life-tracker-goals', 'life-tracker-mood', 'life-tracker-fitness',
    'life-tracker-finances', 'life-tracker-finance-details', 'life-tracker-todos',
  ]);
}

function clearAllLocalTrackerData() {
  clearLegacyKeys();
  removeLocalKeys(['life-tracker-fitness-workout-draft']);
}

function refreshModuleStore(module: ClearableTrackerModule, availability: { financeSchemaAvailable: boolean; fitnessSchemaAvailable: boolean }) {
  if (module === 'habits') { useHabitStore.setState({ habits: [] }); return; }
  if (module === 'goals') { useGoalStore.setState({ goals: [] }); return; }
  if (module === 'mood') { useMoodStore.setState({ entries: [] }); return; }
  if (module === 'todo') { useTodoStore.getState().setData([], []); return; }
  if (module === 'finance') {
    useFinanceStore.getState().setData({
      transactions: [], wallets: [], transfers: [], loans: [], loanPayments: [], budgets: [],
      financeSettings: { currency: 'INR', overallMonthlyBudget: null, keywordRules: [] },
      recurringTransactionSeries: [], savingsGoals: [], savingsContributions: [],
      financeSchemaAvailable: availability.financeSchemaAvailable,
    });
    return;
  }
  useFitnessStore.setState({
    workouts: [], dailyHealth: [], profile: null, customExercises: [], routines: [], plans: [],
    workoutLogs: [], weeklyCheckins: [], fitnessSchemaAvailable: availability.fitnessSchemaAvailable,
    isLoaded: true, isLoading: false,
  });
}

export default function DataPrivacySettings() {
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [clearingModule, setClearingModule] = useState<ClearableTrackerModule | null>(null);
  const [moduleConfirmations, setModuleConfirmations] = useState<Record<ClearableTrackerModule, string>>({ habits: '', goals: '', mood: '', fitness: '', todo: '', finance: '' });
  const [clearAllConfirmation, setClearAllConfirmation] = useState('');
  const [lastBackup, setLastBackup] = useState(readBackupDate);

  const habits = useHabitStore((state) => state.habits);
  const goals = useGoalStore((state) => state.goals);
  const moods = useMoodStore((state) => state.entries);
  const fitness = useFitnessStore();
  const finance = useFinanceStore();
  const todos = useTodoStore((state) => state.todos);
  const todoSeries = useTodoStore((state) => state.series);
  const hasData = Boolean(habits.length || goals.length || moods.length || fitness.workouts.length || fitness.dailyHealth.length || fitness.profile || fitness.customExercises.length || fitness.routines.length || fitness.plans.length || fitness.workoutLogs.length || fitness.weeklyCheckins.length || finance.transactions.length || finance.wallets.length || finance.transfers.length || finance.loans.length || finance.loanPayments.length || finance.budgets.length || finance.recurringTransactionSeries.length || finance.savingsGoals.length || finance.savingsContributions.length || finance.financeSettings.currency !== 'INR' || finance.financeSettings.overallMonthlyBudget !== null || finance.financeSettings.keywordRules.length || todos.length || todoSeries.length);
  const staleBackup = useMemo(() => {
    if (!lastBackup) return hasData;
    const [year, month, day] = lastBackup.split('-').map(Number);
    const saved = new Date(year, month - 1, day);
    if (!Number.isFinite(saved.getTime())) return hasData;
    const elapsed = Math.floor((new Date().setHours(0, 0, 0, 0) - saved.getTime()) / 86_400_000);
    return elapsed > 30;
  }, [hasData, lastBackup]);

  const recordExport = () => {
    const date = localDateString();
    try { localStorage.setItem(LAST_BACKUP_KEY, date); setLastBackup(date); return true; }
    catch { setMessage('The export completed, but this browser could not save its last-export date.'); setMessageIsError(true); return false; }
  };
  const handleCsvExport = (filename: string, headers: string[], records: CsvRecord[]) => {
    setMessageIsError(false);
    try { downloadCsv(filename, headers, records); if (recordExport()) { setMessageIsError(false); setMessage('CSV exported successfully.'); } }
    catch (error) { setMessageIsError(true); setMessage(error instanceof Error ? error.message : 'Could not create this CSV export.'); }
  };

  const handleLoadDemo = async () => {
    setBusy(true); setMessageIsError(false);
    try { await loadDemoData(); setMessage('Sample data loaded to your cloud account. Refreshing…'); setTimeout(() => window.location.reload(), 800); }
    catch (error) { setMessageIsError(true); setMessage(error instanceof Error ? error.message : 'Could not load sample data.'); }
    finally { setBusy(false); }
  };
  const handleExport = async () => {
    setBusy(true); setMessageIsError(false);
    try {
      const data = await exportCloudBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `life-tracker-backup-${localDateString()}.json`; anchor.click(); URL.revokeObjectURL(url);
      const dateSaved = recordExport();
      if (dateSaved) setMessage('Cloud data exported successfully.');
    } catch (error) { setMessageIsError(true); setMessage(error instanceof Error ? error.message : 'Could not export cloud data.'); }
    finally { setBusy(false); }
  };
  const migrateBackup = async (backup: LegacyBackup) => {
    await importLegacyBackup(backup);
    if (backup['life-tracker-theme']) localStorage.setItem('life-tracker-theme', backup['life-tracker-theme']);
    clearLegacyKeys(); setMessageIsError(false); setMessage('Data imported to your cloud account successfully.'); window.location.reload();
  };
  const handleMigrateBrowserData = async () => {
    const backup = getLegacyBackup();
    if (!Object.entries(backup).some(([key, value]) => key !== 'life-tracker-theme' && value !== null)) { setMessageIsError(true); setMessage('No browser tracker data was found to migrate.'); return; }
    setBusy(true); try { await migrateBackup(backup); } catch (error) { setMessageIsError(true); setMessage(error instanceof Error ? error.message : 'Could not migrate browser data. Your local backup is still available.'); } finally { setBusy(false); }
  };
  const handleImport = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const data = JSON.parse(loadEvent.target?.result as string);
          if (!data || typeof data !== 'object' || Array.isArray(data) || Object.values(data).some((value) => value !== null && typeof value !== 'string')) throw new Error('Invalid backup format.');
          setBusy(true); void migrateBackup(data as LegacyBackup).catch((error: unknown) => { setMessageIsError(true); setMessage(error instanceof Error ? error.message : 'Could not restore this backup.'); }).finally(() => setBusy(false));
        } catch (error) { setMessageIsError(true); setMessage(error instanceof Error ? error.message : 'Invalid backup file.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const clearModule = async (module: ClearableTrackerModule) => {
    setClearingModule(module); setBusy(true); setMessage(''); setMessageIsError(false);
    try {
      const availability = await clearCloudModuleData(module);
      refreshModuleStore(module, availability);
      removeLocalKeys(localKeysByModule[module]);
      setModuleConfirmations((current) => ({ ...current, [module]: '' }));
      const partial = (module === 'fitness' && !availability.fitnessSchemaAvailable) || (module === 'finance' && !availability.financeSchemaAvailable);
      setMessage(`${modules.find((item) => item.id === module)?.label} data cleared${partial ? '; optional cloud tables were unavailable, so only available data was removed' : ''}.`);
    } catch (error) {
      setMessageIsError(true);
      const detail = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setMessage(`Could not finish clearing ${modules.find((item) => item.id === module)?.label} data: ${detail} Some cloud rows may already have been removed; retry to finish clearing them.`);
    } finally { setBusy(false); setClearingModule(null); }
  };

  const handleClearAll = async () => {
    setBusy(true); setClearingAll(true); setMessage(''); setMessageIsError(false);
    try {
      await clearCloudData(); clearAllLocalTrackerData();
      setClearAllConfirmation('');
      setMessage('All cloud and local tracker data was cleared.');
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setMessageIsError(true); setMessage(error instanceof Error ? error.message : 'Could not clear all cloud data.');
    } finally { setBusy(false); setClearingAll(false); }
  };

  const hideWeight = fitness.profile?.hideWeight ?? false;
  const baseFitnessHeaders = ['record_type', 'workout_id', 'date', 'workout_name', 'legacy_type', 'duration_minutes', 'calories', 'notes', 'exercise_id', 'set_number', 'reps', 'set_weight', 'set_completed', 'personal_record', 'week_start', 'workouts_completed', 'workouts_planned', 'energy', 'sleep', 'hunger', 'soreness'];
  const fitnessHeaders = hideWeight ? baseFitnessHeaders : [...baseFitnessHeaders, 'body_weight'];

  const csvExports = [
    { label: 'Habits', onClick: () => handleCsvExport('life-tracker-habits.csv', ['habit_id', 'name', 'frequency', 'created_date', 'completed_date'], habits.flatMap((habit) => (habit.completedDates.length ? habit.completedDates : ['']).map((date) => ({ habit_id: habit.id, name: habit.name, frequency: habit.frequency, created_date: habit.createdAt, completed_date: date })))) },
    { label: 'Goals', onClick: () => handleCsvExport('life-tracker-goals.csv', ['goal_id', 'title', 'description', 'category', 'target_date', 'completed', 'milestones_total', 'milestones_completed', 'milestones'], goals.map((goal) => ({ goal_id: goal.id, title: goal.title, description: goal.description, category: goal.category, target_date: goal.targetDate, completed: goal.completed, milestones_total: goal.milestones.length, milestones_completed: goal.milestones.filter((item) => item.completed).length, milestones: goal.milestones.map((item) => `${item.title} [${item.completed ? 'done' : 'open'}]`).join('; ') }))) },
    { label: 'Mood', onClick: () => handleCsvExport('life-tracker-mood.csv', ['date', 'mood', 'note', 'tags'], moods.map((entry) => ({ date: entry.date, mood: entry.mood, note: entry.note, tags: entry.tags.join('; ') }))) },
    { label: 'Fitness workouts', onClick: () => {
      const records: CsvRecord[] = [
        ...fitness.workouts.map((workout) => ({ record_type: 'workout', workout_id: workout.id, date: workout.date, workout_name: workout.name, legacy_type: workout.type, duration_minutes: workout.duration, calories: workout.calories, notes: workout.notes })),
        ...fitness.workoutLogs.flatMap((workout) => [
          { record_type: 'workout', workout_id: workout.id, date: workout.date, workout_name: workout.name, notes: workout.notes },
          ...workout.sets.map((set) => ({ record_type: 'set', workout_id: workout.id, date: workout.date, workout_name: workout.name, exercise_id: set.exerciseId, set_number: set.setNumber, reps: set.reps, set_weight: set.weight, set_completed: set.completed, personal_record: set.isPr })),
        ]),
        ...fitness.weeklyCheckins.map((checkin) => ({ record_type: 'weekly_checkin', week_start: checkin.weekStartDate, workouts_completed: checkin.workoutsCompleted, workouts_planned: checkin.workoutsPlanned, energy: checkin.energy, sleep: checkin.sleep, hunger: checkin.hunger, soreness: checkin.soreness, ...(hideWeight ? {} : { body_weight: checkin.weight }) })),
      ];
      handleCsvExport('life-tracker-fitness.csv', fitnessHeaders, records);
    } },
    { label: 'To-Do', onClick: () => handleCsvExport('life-tracker-todos.csv', ['record_type', 'task_id', 'title', 'date', 'time', 'priority', 'category', 'completed_date', 'subtasks', 'recurrence', 'active'], [
      ...todos.map((todo) => ({ record_type: 'task', task_id: todo.id, title: todo.title, date: todo.date, time: todo.time, priority: todo.priority, category: todo.category, completed_date: todo.completedAt, subtasks: todo.subtasks.map((item) => `${item.title} [${item.completed ? 'done' : 'open'}]`).join('; ') })),
      ...todoSeries.map((series) => ({ record_type: 'recurring_series', title: series.title, time: series.time, priority: series.priority, category: series.category, recurrence: series.recurrence, active: series.active, date: series.startsOn })),
    ]) },
    { label: 'Finance', onClick: () => handleCsvExport('life-tracker-finance.csv', ['record_type', 'id', 'date', 'name', 'type', 'amount', 'currency', 'category', 'description', 'wallet_id', 'from_wallet_id', 'to_wallet_id', 'goal_id', 'target_date', 'frequency', 'active', 'month_start'], [
      ...finance.transactions.map((item) => ({ record_type: 'transaction', id: item.id, date: item.date, type: item.type, amount: item.amount, currency: finance.financeSettings.currency, category: item.category, description: item.description, wallet_id: item.walletId })),
      ...finance.wallets.map((item) => ({ record_type: 'wallet', id: item.id, name: item.name, amount: item.openingBalance, currency: finance.financeSettings.currency })),
      ...finance.transfers.map((item) => ({ record_type: 'transfer', id: item.id, date: item.date, amount: item.amount, currency: finance.financeSettings.currency, from_wallet_id: item.fromWalletId, to_wallet_id: item.toWalletId, description: item.note })),
      ...finance.budgets.map((item) => ({ record_type: 'budget', id: item.id, category: item.category, amount: item.amount, currency: finance.financeSettings.currency, month_start: item.monthStart })),
      ...finance.recurringTransactionSeries.map((item) => ({ record_type: 'recurring', id: item.id, date: item.startsOn, type: item.type, amount: item.amount, currency: finance.financeSettings.currency, category: item.category, description: item.description, wallet_id: item.walletId, frequency: item.frequency, active: item.active })),
      ...finance.savingsGoals.map((item) => ({ record_type: 'savings_goal', id: item.id, name: item.name, amount: item.targetAmount, currency: finance.financeSettings.currency, target_date: item.targetDate })),
      ...finance.savingsContributions.map((item) => ({ record_type: 'savings_contribution', id: item.id, date: item.date, amount: item.amount, currency: finance.financeSettings.currency, wallet_id: item.walletId, goal_id: item.goalId, description: item.note })),
    ]) },
    { label: 'Loans', onClick: () => handleCsvExport('life-tracker-loans.csv', ['record_type', 'loan_id', 'direction', 'person', 'date', 'due_date', 'amount', 'remaining', 'payment_date', 'payment_amount', 'note', 'currency'], [
      ...finance.loans.map((loan) => ({ record_type: 'loan', loan_id: loan.id, direction: loan.direction, person: loan.person, date: loan.date, due_date: loan.dueDate, amount: loan.amount, remaining: loan.amount - finance.loanPayments.filter((payment) => payment.loanId === loan.id).reduce((sum, payment) => sum + payment.amount, 0), note: loan.note, currency: finance.financeSettings.currency })),
      ...finance.loanPayments.map((payment) => ({ record_type: 'payment', loan_id: payment.loanId, payment_date: payment.date, payment_amount: payment.amount, note: payment.note, currency: finance.financeSettings.currency })),
    ]) },
  ];

  return <div className="space-y-5">
    {staleBackup && <Card className="border border-cat-amber/40 bg-cat-amber/10"><h2 className="font-semibold text-app-ink">Backup reminder</h2><p className="mt-1 text-sm text-app-subtle">{lastBackup ? `Your last backup was on ${lastBackup}. Consider making a fresh backup.` : 'You have tracker data but have not exported a backup yet.'}</p></Card>}

    <Card><h2 className="mb-1 font-semibold text-app-ink">Export a tracker as CSV</h2><p className="mb-4 text-sm leading-6 text-app-subtle">Downloads data already loaded in this browser. Dates stay in the app’s local date format. Spreadsheet formulas are neutralized, and Excel-compatible UTF-8 is included.</p><div className="grid gap-2 sm:grid-cols-2">{csvExports.map((item) => <Button key={item.label} variant="secondary" disabled={busy} onClick={item.onClick} className="w-full justify-start"><FileDown size={16} />{item.label}</Button>)}</div>{hideWeight && <p className="mt-3 text-xs text-app-subtle">Body-weight columns are omitted because Hide Weight is enabled in your Fitness profile.</p>}</Card>

    <Card><h2 className="mb-2 font-semibold text-app-ink">Cloud backup and restore</h2><p className="mb-4 text-sm leading-6 text-app-subtle">Your tracker data is stored securely in your signed-in cloud account. Theme preference remains on this device.</p><div className="space-y-3">
      <Button variant="primary" onClick={() => void handleLoadDemo()} disabled={busy} className="w-full justify-start"><Sparkles size={18} />Load Sample / Demo Data</Button>
      <Button variant="secondary" onClick={() => void handleExport()} disabled={busy} className="w-full justify-start"><Download size={18} />Export Data (Backup)</Button>
      <Button variant="secondary" onClick={handleImport} disabled={busy} className="w-full justify-start"><Upload size={18} />Restore Backup to Cloud</Button>
      <Button variant="secondary" onClick={() => void handleMigrateBrowserData()} disabled={busy} className="w-full justify-start"><Upload size={18} />Migrate Browser Data to Cloud</Button>
    </div></Card>

    <Card><h2 className="mb-3 font-semibold text-app-ink">Clear one tracker</h2><p className="mb-4 text-sm leading-6 text-app-subtle">Each action permanently removes only that tracker’s cloud records and local browser cache. Type DELETE exactly to enable its button.</p><div className="space-y-3">{modules.map((module) => <details key={module.id} className="rounded-xl border border-app-border bg-app-bg p-3"><summary className="cursor-pointer font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Clear {module.label} data</summary><p className="mt-2 text-sm text-app-subtle">{module.description}</p><p className="mt-2 text-xs leading-5 text-app-subtle"><strong className="text-app-ink">Cloud tables:</strong> {tablesByModule[module.id].join(', ')}<br /><strong className="text-app-ink">Browser keys:</strong> {localKeysByModule[module.id].join(', ')}</p><label className="mt-3 block text-sm font-medium text-app-ink" htmlFor={`confirm-${module.id}`}>Type DELETE to confirm<input id={`confirm-${module.id}`} autoComplete="off" value={moduleConfirmations[module.id]} onChange={(event) => setModuleConfirmations((current) => ({ ...current, [module.id]: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-xl border border-app-border bg-app-card px-3 text-app-ink outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label><Button variant="danger" disabled={busy || moduleConfirmations[module.id] !== 'DELETE'} onClick={() => void clearModule(module.id)} className="mt-3"><Trash2 size={16} />{clearingModule === module.id ? `Clearing ${module.label}…` : `Clear ${module.label} data`}</Button></details>)}</div></Card>

    <Card className="border border-accent/40"><h2 className="font-semibold text-app-ink">Danger zone · Clear all data</h2><p className="mt-1 text-sm leading-6 text-app-subtle">This permanently removes every tracker table listed below, your legacy browser tracker cache and the saved in-progress fitness workout. Appearance preferences stay on this device. Deleting To-Do records also removes their subtasks. Fitness and Finance tables are cleared only when those optional schemas are available; legacy workouts, daily health and transactions are still included.</p><p className="mt-2 text-xs leading-5 text-app-subtle"><strong className="text-app-ink">Cloud tables in clear-all order:</strong> {clearAllTables.join(', ')}</p><label className="mt-3 block text-sm font-medium text-app-ink" htmlFor="confirm-clear-all">Type DELETE to confirm<input id="confirm-clear-all" autoComplete="off" value={clearAllConfirmation} onChange={(event) => setClearAllConfirmation(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-app-border bg-app-muted px-3 text-app-ink outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label><Button variant="danger" disabled={busy || clearAllConfirmation !== 'DELETE'} onClick={() => void handleClearAll()} className="mt-3"><Trash2 size={16} />{clearingAll ? 'Clearing all data…' : 'Clear All Data'}</Button></Card>

    {message && <p role={messageIsError ? 'alert' : 'status'} className={`text-sm ${messageIsError ? 'text-app-ink' : 'text-cat-green'}`}>{message}</p>}
  </div>;
}

import { useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button, Card, EmptyState } from '../ui';
import { useFitnessStore, getLocalMonday } from '../../stores/fitnessStore';
import { getAllExercises } from '../../data/exercises';
import { formatDate } from '../../utils/helpers';
import { Dumbbell, Trash2, TrendingUp } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: 'var(--app-card)',
  border: '1px solid var(--app-border)',
  borderRadius: 'var(--radius-card)',
  color: 'var(--app-ink)',
  boxShadow: 'var(--shadow-card)',
};

export function FitnessProgress() {
  const { workouts, workoutLogs, weeklyCheckins, profile, customExercises, removeWorkout } = useFitnessStore();
  const exercises = useMemo(() => getAllExercises(customExercises), [customExercises]);

  const weeklyData = useMemo(() => {
    const currentMonday = parseISO(getLocalMonday());
    return Array.from({ length: 8 }, (_, index) => {
      const monday = addDays(currentMonday, (index - 7) * 7);
      const start = format(monday, 'yyyy-MM-dd');
      const end = format(addDays(monday, 6), 'yyyy-MM-dd');
      const legacyCount = workouts.filter((item) => item.date >= start && item.date <= end).length;
      const loggedCount = workoutLogs.filter((item) => item.date >= start && item.date <= end).length;
      return { week: format(monday, 'MMM d'), count: legacyCount + loggedCount, start };
    });
  }, [workouts, workoutLogs]);

  const exerciseIds = useMemo(() => Array.from(new Set(
    workoutLogs.flatMap((log) => log.sets.filter((set) => set.completed && set.reps > 0).map((set) => set.exerciseId)),
  )), [workoutLogs]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  useEffect(() => {
    if (!exerciseIds.includes(selectedExerciseId)) setSelectedExerciseId(exerciseIds[0] ?? '');
  }, [exerciseIds, selectedExerciseId]);

  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId);
  const exerciseData = useMemo(() => {
    if (!selectedExerciseId) return [];
    return workoutLogs
      .filter((log) => log.sets.some((set) => set.exerciseId === selectedExerciseId && set.completed && set.reps > 0))
      .map((log) => {
        const sets = log.sets.filter((set) => set.exerciseId === selectedExerciseId && set.completed && set.reps > 0);
        return {
          session: format(parseISO(log.date), 'MMM d'),
          date: log.date,
          best: selectedExercise?.isBodyweight
            ? Math.max(...sets.map((set) => set.reps))
            : Math.max(0, ...sets.map((set) => set.weight ?? 0)),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [workoutLogs, selectedExercise, selectedExerciseId]);

  const showBodyWeight = !(profile?.hideWeight ?? false);
  const weightData = useMemo(() => showBodyWeight
    ? weeklyCheckins
      .filter((checkin) => checkin.weight !== null && Number.isFinite(checkin.weight))
      .map((checkin) => ({ week: format(parseISO(checkin.weekStartDate), 'MMM d'), weight: checkin.weight, date: checkin.weekStartDate }))
      .sort((a, b) => a.date.localeCompare(b.date))
    : [], [showBodyWeight, weeklyCheckins]);

  return <div className="space-y-5">
    <Card className="p-4 sm:p-5">
      <div className="mb-3"><h3 className="font-bold text-app-ink">Workouts per week</h3><p className="text-xs text-app-subtle">Completed workouts across the last eight Monday-to-Sunday weeks.</p></div>
      {weeklyData.some((item) => item.count > 0) ? <ResponsiveContainer width="100%" height={230}>
        <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-app-border)" />
          <XAxis dataKey="week" stroke="var(--color-app-subtle)" fontSize={11} />
          <YAxis allowDecimals={false} stroke="var(--color-app-subtle)" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.start ?? ''} />
          <Legend />
          <Bar dataKey="count" name="Workouts completed" fill="var(--color-accent-contrast)" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer> : <EmptyState icon={TrendingUp} title="No workouts yet" description="Log a workout and your weekly activity will appear here." />}
    </Card>

    <Card className="space-y-3 p-4 sm:p-5">
      <div><h3 className="font-bold text-app-ink">Exercise progress</h3><p className="text-xs text-app-subtle">Best completed set in each logged session.</p></div>
      {exerciseIds.length > 0 ? <>
        <label className="block max-w-sm"><span className="mb-1 block text-sm font-semibold text-app-ink">Choose an exercise</span><select value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{exerciseIds.map((id) => <option key={id} value={id}>{exercises.find((exercise) => exercise.id === id)?.name ?? id}</option>)}</select></label>
        {exerciseData.length > 0 ? <ResponsiveContainer width="100%" height={230}>
          <LineChart data={exerciseData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-app-border)" />
            <XAxis dataKey="session" stroke="var(--color-app-subtle)" fontSize={11} />
            <YAxis allowDecimals={false} stroke="var(--color-app-subtle)" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''} />
            <Legend />
            <Line type="monotone" dataKey="best" name={selectedExercise?.isBodyweight ? 'Best reps' : `Best load (${profile?.units ?? 'kg'})`} stroke="var(--color-cat-indigo)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer> : <EmptyState icon={TrendingUp} title="No sets for this exercise" description="Completed set data will appear here." />}
      </> : <EmptyState icon={TrendingUp} title="No exercise data yet" description="Finish a rep-based workout to compare your best sets over time." />}
    </Card>

    {showBodyWeight && <Card className="p-4 sm:p-5">
      <div className="mb-3"><h3 className="font-bold text-app-ink">Weekly weight trend</h3><p className="text-xs text-app-subtle">Optional check-in weights, shown as information only.</p></div>
      {weightData.length > 0 ? <ResponsiveContainer width="100%" height={220}>
        <LineChart data={weightData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-app-border)" />
          <XAxis dataKey="week" stroke="var(--color-app-subtle)" fontSize={11} />
          <YAxis domain={['auto', 'auto']} stroke="var(--color-app-subtle)" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="weight" name={`Weekly average (${profile?.units ?? 'kg'})`} stroke="var(--color-cat-teal)" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer> : <EmptyState icon={TrendingUp} title="No weight entries" description="Optional weekly check-in weights will appear here when you choose to log them." />}
    </Card>}

    <Card className="p-4 sm:p-5">
      <div className="mb-3"><h3 className="font-bold text-app-ink">Past check-ins</h3><p className="text-xs text-app-subtle">Your weekly reflections and saved plan adjustments.</p></div>
      {weeklyCheckins.length > 0 ? <ul className="space-y-2">{[...weeklyCheckins].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)).map((checkin) => <li key={checkin.id} className="rounded-xl border border-app-border bg-app-bg p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-app-ink">Week of {format(parseISO(checkin.weekStartDate), 'MMM d, yyyy')}</p><span className="text-sm font-semibold text-app-subtle">{checkin.workoutsCompleted}/{checkin.workoutsPlanned} workouts</span></div><p className="mt-1 text-xs text-app-subtle">Energy {checkin.energy}/5 · Sleep {checkin.sleep}/5 · Hunger {checkin.hunger}/5 · Soreness {checkin.soreness}/5</p>{!profile?.hideWeight && checkin.weight !== null && <p className="mt-1 text-xs text-app-subtle">Weight: {checkin.weight} {profile?.units ?? 'kg'}</p>}{checkin.adjustments.length > 0 && <ul className="mt-2 space-y-1">{checkin.adjustments.map((adjustment, index) => <li key={`${checkin.id}-${index}`} className="text-xs text-app-ink">• {adjustment.reason}</li>)}</ul>}</li>)}</ul> : <EmptyState icon={TrendingUp} title="No check-ins yet" description="Your completed weekly check-ins will be listed here." />}
    </Card>

    <Card className="p-4 sm:p-5">
      <h3 className="mb-3 font-bold text-app-ink">All logged workouts ({workouts.length})</h3>
      {workouts.length === 0 ? <EmptyState icon={Dumbbell} title="No general workouts logged" description="Your quick general workout entries will appear here." /> : <ul className="space-y-2">{[...workouts].sort((a, b) => b.date.localeCompare(a.date)).map((workout) => <li key={workout.id} className="flex items-center justify-between gap-3 rounded-xl border border-app-border bg-app-bg p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-app-ink">{workout.name}</p><p className="mt-0.5 text-xs text-app-subtle">{workout.duration} min · {formatDate(workout.date)} · {workout.type}</p></div><Button variant="ghost" size="sm" aria-label={`Delete ${workout.name}`} onClick={() => removeWorkout(workout.id)}><Trash2 size={15}/></Button></li>)}</ul>}
    </Card>
  </div>;
}

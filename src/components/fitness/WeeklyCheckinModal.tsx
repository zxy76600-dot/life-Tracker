import { useState, useMemo } from 'react';
import { Card, Button, Modal } from '../ui';
import { useFitnessStore, getLocalMonday } from '../../stores/fitnessStore';
import {
  calculateWeightTrend,
  countConsecutiveTrainingWeeks,
  generateNextWeekPlan,
  type WeightTrendResult,
} from '../../utils/fitnessRules';
import { addDays, format, parseISO } from 'date-fns';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Battery,
  Moon,
  Utensils,
  Zap,
} from 'lucide-react';

interface WeeklyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekStartDate?: string; // defaults to current week Monday
}

export function WeeklyCheckinModal({
  isOpen,
  onClose,
  weekStartDate,
}: WeeklyCheckinModalProps) {
  const {
    profile,
    workouts,
    getCurrentPlan,
    workoutLogs,
    weeklyCheckins,
    customExercises,
    addWeeklyCheckin,
    setPlan,
  } = useFitnessStore();

  const currentPlan = getCurrentPlan();
  const effectiveWeekMonday = weekStartDate || currentPlan?.weekStartDate || getLocalMonday();
  const mondayDate = parseISO(effectiveWeekMonday);
  const sundayDate = addDays(mondayDate, 6);
  const effectiveSundayStr = format(sundayDate, 'yyyy-MM-dd');

  // Logs for this week
  const currentWeekLogs = useMemo(() => {
    return workoutLogs.filter(
      (l) => l.date >= effectiveWeekMonday && l.date <= effectiveSundayStr,
    );
  }, [workoutLogs, effectiveWeekMonday, effectiveSundayStr]);

  // Previous week Monday and logs
  const previousMondayDate = addDays(mondayDate, -7);
  const previousMondayStr = format(previousMondayDate, 'yyyy-MM-dd');
  const previousSundayStr = format(addDays(previousMondayDate, 6), 'yyyy-MM-dd');

  const previousWeekLogs = useMemo(() => {
    return workoutLogs.filter(
      (l) => l.date >= previousMondayStr && l.date <= previousSundayStr,
    );
  }, [workoutLogs, previousMondayStr, previousSundayStr]);

  const existingCheckin = useMemo(() => {
    return weeklyCheckins.find((c) => c.weekStartDate === effectiveWeekMonday);
  }, [weeklyCheckins, effectiveWeekMonday]);

  const previousCheckin = useMemo(() => {
    return weeklyCheckins.find((c) => c.weekStartDate === previousMondayStr);
  }, [weeklyCheckins, previousMondayStr]);

  const plannedDays = currentPlan?.days.filter((day) => !day.isSkipped) ?? [];
  const defaultWorkoutsPlanned = plannedDays.length || 3;
  const loggedPlannedWorkoutCount = currentPlan
    ? plannedDays.filter((day) => currentWeekLogs.some((log) => log.planDayId === day.id || (!log.planDayId && log.date === day.scheduledDate))).length
    : currentWeekLogs.length;

  // Form states
  const [workoutsCompleted, setWorkoutsCompleted] = useState<number>(
    existingCheckin ? existingCheckin.workoutsCompleted : loggedPlannedWorkoutCount,
  );
  const workoutsPlanned = existingCheckin ? existingCheckin.workoutsPlanned : defaultWorkoutsPlanned;
  const [energy, setEnergy] = useState<number>(existingCheckin ? existingCheckin.energy : 4);
  const [sleep, setSleep] = useState<number>(existingCheckin ? existingCheckin.sleep : 4);
  const [hunger, setHunger] = useState<number>(existingCheckin ? existingCheckin.hunger : 3);
  const [soreness, setSoreness] = useState<number>(existingCheckin ? existingCheckin.soreness : 2);
  const [weightInput, setWeightInput] = useState<string>(
    existingCheckin?.weight != null ? String(existingCheckin.weight) : '',
  );

  const [saving, setSaving] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [generatedReasons, setGeneratedReasons] = useState<string[]>([]);
  const [weightTrendInfo, setWeightTrendInfo] = useState<WeightTrendResult | null>(null);
  const [isDeloadResult, setIsDeloadResult] = useState(false);

  const hideWeight = profile?.hideWeight ?? false;
  const unitLabel = profile?.units || 'kg';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan) return;

    setSaving(true);
    try {
      const parsedWeight =
        !hideWeight && weightInput.trim() !== '' ? Number(weightInput) : null;

      // Weight trend calculation (information only)
      const trend = calculateWeightTrend(
        parsedWeight,
        previousCheckin?.weight ?? null,
        profile?.goalMode || 'basic',
        hideWeight,
      );
      setWeightTrendInfo(trend);

      // Generate next week's plan with deterministic rules
      const consecutiveWeeksTrained = countConsecutiveTrainingWeeks(workoutLogs, effectiveWeekMonday);
      const { nextPlan, adjustments, reasons, isDeload } = generateNextWeekPlan({
        profile: profile || {
          goalMode: 'basic',
          experience: 'beginner',
          trainingDaysPerWeek: 3,
          equipment: 'gym',
          units: 'kg',
          confirmed18OrOlder: false,
          hideWeight: false,
        },
        currentPlan,
        currentWeekLogs,
        previousWeekLogs,
        energy,
        sleep,
        customExercises,
        consecutiveWeeksTrained,
      });

      setIsDeloadResult(isDeload);
      setGeneratedReasons(reasons);

      // 1. Save weekly check-in record
      await addWeeklyCheckin({
        weekStartDate: effectiveWeekMonday,
        workoutsCompleted,
        workoutsPlanned,
        energy,
        sleep,
        hunger,
        soreness,
        weight: parsedWeight,
        adjustments,
      });

      // 2. Check if next week already has logged workouts before updating next week's plan
      const nextMondayStr = nextPlan.weekStartDate;
      const followingMondayStr = format(addDays(parseISO(nextMondayStr), 7), 'yyyy-MM-dd');
      const hasNextWeekLogs = workoutLogs.some(
        (log) => log.date >= nextMondayStr && log.date < followingMondayStr,
      ) || workouts.some((workout) => workout.date >= nextMondayStr && workout.date < followingMondayStr);

      // Only apply next week's plan if current check-in is for the active week and next week hasn't been started
      const currentMondayStr = getLocalMonday();
      const isCurrentOrFutureWeek = effectiveWeekMonday >= currentMondayStr;

      if (!hasNextWeekLogs && isCurrentOrFutureWeek) {
        await setPlan(nextPlan);
      }

      setResultModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save check-in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !resultModalOpen}
        onClose={onClose}
        title={`Weekly Check-In (${format(mondayDate, 'MMM d')} – ${format(sundayDate, 'MMM d')})`}
      >
        <form onSubmit={handleSave} className="space-y-4 text-sm max-h-[82vh] overflow-y-auto pr-1">
          {/* Workouts compliance */}
          <div className="bg-app-muted/40 p-3.5 rounded-card border border-app-border space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-app-subtle">
              Workouts Completed This Week
            </span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="14"
                value={workoutsCompleted}
                onChange={(e) => setWorkoutsCompleted(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-20 rounded border border-app-border bg-app-card px-3 py-1.5 font-bold text-center text-sm text-app-ink"
              />
              <span className="text-xs text-app-subtle font-medium">
                out of {workoutsPlanned} scheduled
              </span>
            </div>
          </div>

          {/* 1-5 Scale Ratings */}
          <div className="space-y-3 pt-1">
            {/* Energy */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-app-ink flex items-center gap-1.5">
                  <Zap size={14} className="text-cat-amber" /> Average Energy This Week
                </span>
                <span className="font-bold text-app-subtle">{energy} / 5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEnergy(val)}
                    className={`py-2 rounded-card text-xs font-bold border transition-colors cursor-pointer ${
                      energy === val
                        ? 'border-accent bg-accent text-white shadow-sm'
                        : 'border-app-border bg-app-card text-app-subtle hover:bg-app-muted'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Sleep */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-app-ink flex items-center gap-1.5">
                  <Moon size={14} className="text-cat-indigo" /> Average Sleep This Week
                </span>
                <span className="font-bold text-app-subtle">{sleep} / 5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSleep(val)}
                    className={`py-2 rounded-card text-xs font-bold border transition-colors cursor-pointer ${
                      sleep === val
                        ? 'border-accent bg-accent text-white shadow-sm'
                        : 'border-app-border bg-app-card text-app-subtle hover:bg-app-muted'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Hunger */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-app-ink flex items-center gap-1.5">
                  <Utensils size={14} className="text-cat-teal" /> Appetite & Hunger
                </span>
                <span className="font-bold text-app-subtle">{hunger} / 5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setHunger(val)}
                    className={`py-2 rounded-card text-xs font-bold border transition-colors cursor-pointer ${
                      hunger === val
                        ? 'border-accent bg-accent text-white shadow-sm'
                        : 'border-app-border bg-app-card text-app-subtle hover:bg-app-muted'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Soreness */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-app-ink flex items-center gap-1.5">
                  <Battery size={14} className="text-cat-green" /> Muscle Soreness & Fatigue
                </span>
                <span className="font-bold text-app-subtle">{soreness} / 5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSoreness(val)}
                    className={`py-2 rounded-card text-xs font-bold border transition-colors cursor-pointer ${
                      soreness === val
                        ? 'border-accent bg-accent text-white shadow-sm'
                        : 'border-app-border bg-app-card text-app-subtle hover:bg-app-muted'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Weight Input (ONLY shown if hideWeight is FALSE) */}
          {!hideWeight && (
            <div className="pt-2 border-t border-app-border space-y-1.5">
              <label className="block text-xs font-semibold text-app-ink">
                Weekly Average Body Weight ({unitLabel}) — optional
              </label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="400"
                placeholder={`e.g., 72.5 (${unitLabel})`}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full rounded-card border border-app-border bg-app-card px-3 py-2 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-[11px] text-app-subtle">
                Used solely to provide healthy rate trends. You can hide weight at any time in settings.
              </p>
            </div>
          )}

          {/* Kind Medical Disclaimer */}
          <div className="rounded-card border border-app-border bg-app-muted/30 p-3 text-[11px] leading-relaxed text-app-subtle flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 text-app-subtle mt-0.5" />
            <span>
              <strong>General guidance, not medical advice.</strong> If you're pregnant, have a medical condition or injury, or find dieting stressful, talk to a doctor or dietitian.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-app-border">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Sparkles size={16} />
              {saving ? 'Analyzing…' : 'Submit Check-In & Adjust Next Week'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* "What Changed and Why" Next Week Summary Modal */}
      {resultModalOpen && (
        <Modal
          isOpen={resultModalOpen}
          onClose={() => {
            setResultModalOpen(false);
            onClose();
          }}
          title="Next Week's Plan: What Changed and Why"
        >
          <div className="space-y-4 text-sm max-h-[80vh] overflow-y-auto pr-1">
            {/* Deload badge if applicable */}
            {isDeloadResult && (
              <Card className="border-cat-amber/30 bg-cat-amber/10 p-3.5 space-y-1">
                <span className="font-bold text-xs uppercase tracking-wider text-cat-amber-ink">
                  Deload Week Scheduled
                </span>
                <p className="text-xs text-app-subtle">
                  Volumes have been scaled back by ~40% to allow your nervous system and connective tissues to fully recharge.
                </p>
              </Card>
            )}

            {/* Weight trend info note (if present) */}
            {weightTrendInfo && (
              <div
                className={`p-3 rounded-card border text-xs leading-relaxed ${
                  weightTrendInfo.isRapidLoss
                    ? 'border-cat-amber/40 bg-cat-amber/10 text-app-ink'
                    : 'border-app-border bg-app-card text-app-subtle'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1 text-app-ink">
                  <TrendingUp size={15} />
                  <span>Weight Trend Feedback</span>
                </div>
                <p>{weightTrendInfo.message}</p>
              </div>
            )}

            {/* List of deterministic progression reasons */}
            <div className="space-y-2">
              <h5 className="font-semibold text-xs text-app-ink uppercase tracking-wider">
                Exercise Adjustments ({generatedReasons.length})
              </h5>
              <div className="space-y-1.5">
                {generatedReasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-card border border-app-border bg-app-muted/30 text-xs text-app-ink flex items-start gap-2"
                  >
                    <CheckCircle2 size={14} className="text-cat-green shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-app-border">
              <Button
                onClick={() => {
                  setResultModalOpen(false);
                  onClose();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

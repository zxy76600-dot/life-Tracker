import { addDays, format, parseISO } from 'date-fns';
import type {
  CustomExercise,
  Exercise,
  FitnessPlan,
  FitnessPlanDay,
  FitnessPlanDayExercise,
  FitnessProfile,
  FitnessWorkoutLog,
  WeeklyCheckinAdjustment,
} from '../types';
import { generateId } from './helpers';
import { getExerciseById } from '../data/exercises';

export interface WeightTrendResult {
  percentChange: number;
  message: string;
  isRapidLoss: boolean;
}

/** Count consecutive Monday-to-Sunday weeks with at least one completed workout. */
export function countConsecutiveTrainingWeeks(
  logs: readonly Pick<FitnessWorkoutLog, 'date'>[],
  weekStartDate: string,
): number {
  const monday = parseISO(weekStartDate);
  let count = 0;

  for (let offset = 0; ; offset += 1) {
    const start = format(addDays(monday, -7 * offset), 'yyyy-MM-dd');
    const end = format(addDays(parseISO(start), 6), 'yyyy-MM-dd');
    if (!logs.some((log) => log.date >= start && log.date <= end)) break;
    count += 1;
  }

  return count;
}

/**
 * Compute weekly weight trend and healthy progression bands.
 * General guidance only; no calorie or diet targets.
 */
export function calculateWeightTrend(
  currentWeight: number | null,
  previousWeight: number | null,
  goalMode: string,
  hideWeight: boolean,
): WeightTrendResult | null {
  if (hideWeight || currentWeight === null || previousWeight === null) return null;
  if (currentWeight <= 0 || previousWeight <= 0) return null;

  const diff = currentWeight - previousWeight;
  const percentChange = Math.round(((diff / previousWeight) * 100) * 100) / 100;
  const changeSign = percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`;

  if (goalMode === 'bulk') {
    let msg = `Weekly weight change: ${changeSign}. `;
    if (percentChange >= 0.25 && percentChange <= 0.5) {
      msg += 'Within the healthy steady gain range of ~0.25% to 0.5% per week for bulking.';
    } else if (percentChange > 0.5) {
      msg += 'Slightly above the recommended ~0.5% per week pace. Consider pacing increases gradually.';
    } else {
      msg += 'Weight held steady or dipped; ensure adequate recovery and nutrition.';
    }
    return { percentChange, message: msg, isRapidLoss: false };
  }

  if (goalMode === 'cut') {
    let msg = `Weekly weight change: ${changeSign}. `;
    let isRapid = false;

    if (percentChange <= -1.5) {
      isRapid = true;
      msg += 'Weight dropped by more than 1.5% this week. Please eat enough to sustain energy and protect your health, and talk to a doctor or dietitian.';
    } else if (percentChange < -1.0) {
      msg += 'Weight dropped slightly faster than 1% this week. Eat enough nutritious food to support your recovery and consider talking to a doctor or dietitian.';
    } else if (percentChange <= -0.5) {
      msg += 'Within the healthy steady fat-loss range of ~0.5% to 1.0% per week.';
    } else {
      msg += 'Weight held steady this week. Consistency in training and sleep is your foundation.';
    }
    return { percentChange, message: msg, isRapidLoss: isRapid };
  }

  // Basic or custom mode: no judgment band
  return {
    percentChange,
    message: `Weekly weight change: ${changeSign} from previous check-in.`,
    isRapidLoss: false,
  };
}

interface ProgressionEvaluationParams {
  exerciseId: string;
  exercise: Exercise | undefined;
  plannedExercise: FitnessPlanDayExercise;
  currentWeekLogs: readonly FitnessWorkoutLog[];
  previousWeekLogs: readonly FitnessWorkoutLog[];
  expectedWorkingSetCount: number;
  isDeload: boolean;
  units: 'kg' | 'lb';
}

/**
 * Deterministically evaluate weight & rep changes for an individual exercise.
 */
function evaluateExerciseProgression({
  exerciseId,
  exercise,
  plannedExercise,
  currentWeekLogs,
  previousWeekLogs,
  expectedWorkingSetCount,
  isDeload,
  units,
}: ProgressionEvaluationParams): {
  adjustedExercise: FitnessPlanDayExercise;
  adjustment: WeeklyCheckinAdjustment;
  reason: string;
} {
  const exName = exercise?.name || exerciseId;
  const isBodyweight = exercise?.isBodyweight || false;
  const isLowerBody = exercise?.muscleGroup === 'legs';

  // Gather completed sets for this exercise this week
  const currentWeekSets = currentWeekLogs.flatMap((log) =>
    log.sets.filter((s) => s.exerciseId === exerciseId && s.completed && s.reps > 0),
  );

  // If this is a deload week: 40% set reduction, keep weight
  if (isDeload) {
    const deloadSets = Math.max(1, Math.round(plannedExercise.targetSets * 0.6));
    const reason = `${exName}: deload week active — sets reduced from ${plannedExercise.targetSets} to ${deloadSets} to foster recovery`;
    return {
      adjustedExercise: {
        ...plannedExercise,
        targetSets: deloadSets,
      },
      adjustment: {
        exerciseId,
        exerciseName: exName,
        action: 'deload',
        reason,
      },
      reason,
    };
  }

  // If no sets logged this week: keep plan as is
  if (currentWeekSets.length === 0) {
    const reason = `${exName}: maintained current targets (no logged sets this week)`;
    return {
      adjustedExercise: { ...plannedExercise },
      adjustment: {
        exerciseId,
        exerciseName: exName,
        action: 'hold',
        reason,
      },
      reason,
    };
  }

  if (currentWeekSets.length < expectedWorkingSetCount) {
    const reason = `${exName}: kept current targets because only ${currentWeekSets.length} of ${expectedWorkingSetCount} planned working sets were logged`;
    return {
      adjustedExercise: { ...plannedExercise },
      adjustment: { exerciseId, exerciseName: exName, action: 'hold', reason },
      reason,
    };
  }

  const minTarget = plannedExercise.minReps;
  const maxTarget = plannedExercise.maxReps;

  // Check 1: Did every working set reach the top of the rep range?
  const allHitTop = currentWeekSets.every((s) => s.reps >= maxTarget);

  if (allHitTop) {
    if (isBodyweight) {
      // Bodyweight: raise rep targets toward top
      const newMin = Math.min(maxTarget, minTarget + 2);
      const newMax = maxTarget + 2;
      const subName = exercise?.substitutes?.[0] ? ` (consider progressing to ${exercise.substitutes[0]})` : '';
      const reason = `${exName}: all sets reached ${maxTarget} reps, raising rep targets to ${newMin}–${newMax}${subName}`;

      return {
        adjustedExercise: {
          ...plannedExercise,
          minReps: newMin,
          maxReps: newMax,
        },
        adjustment: {
          exerciseId,
          exerciseName: exName,
          action: 'increase',
          reason,
        },
        reason,
      };
    }

    // Weighted exercise: raise weight
    // Upper body: +2.5 kg or +5 lb; Lower body: +5 kg or +10 lb
    const step = units === 'lb' ? (isLowerBody ? 10 : 5) : (isLowerBody ? 5 : 2.5);
    const lastWeight = currentWeekSets[0]?.weight ?? plannedExercise.targetWeight ?? 20;
    const newWeight = Math.round((lastWeight + step) * 10) / 10;
    const reason = `${exName}: all sets reached top rep target (${maxTarget} reps), weight increased by +${step} ${units} (${newWeight} ${units})`;

    return {
      adjustedExercise: {
        ...plannedExercise,
        targetWeight: newWeight,
      },
      adjustment: {
        exerciseId,
        exerciseName: exName,
        action: 'increase',
        weightChange: step,
        reason,
      },
      reason,
    };
  }

  // Check 2: Was the bottom of the rep range missed?
  const missedBottomThisWeek = currentWeekSets.some((s) => s.reps < minTarget);

  if (missedBottomThisWeek) {
    // Check previous week to see if missed 2 weeks in a row
    const prevWeekSets = previousWeekLogs.flatMap((log) =>
      log.sets.filter((s) => s.exerciseId === exerciseId && s.completed && s.reps > 0),
    );
    const missedBottomLastWeek = prevWeekSets.length > 0 && prevWeekSets.some((s) => s.reps < minTarget);

    if (missedBottomLastWeek && !isBodyweight) {
      // Missed 2 weeks in a row: lower weight by 5-10% (round to step 2.5)
      const currentWeight = currentWeekSets[0]?.weight ?? plannedExercise.targetWeight ?? 20;
      const reduced = Math.max(0, Math.round((currentWeight * 0.92) / 2.5) * 2.5);
      const diff = Math.round((currentWeight - reduced) * 10) / 10;
      const reason = `${exName}: missed minimum reps 2 weeks in a row, reduced weight by ~8% (-${diff} ${units}) to consolidate form`;

      return {
        adjustedExercise: {
          ...plannedExercise,
          targetWeight: reduced,
        },
        adjustment: {
          exerciseId,
          exerciseName: exName,
          action: 'decrease',
          weightChange: -diff,
          reason,
        },
        reason,
      };
    }

    // Missed once: hold weight
    const reason = `${exName}: held weight at current level to consolidate reps within the ${minTarget}–${maxTarget} target range`;
    return {
      adjustedExercise: { ...plannedExercise },
      adjustment: {
        exerciseId,
        exerciseName: exName,
        action: 'hold',
        reason,
      },
      reason,
    };
  }

  // Set reps were comfortably inside the range: hold weight
  const reason = `${exName}: reps within ${minTarget}–${maxTarget} target, held weight steady for consolidation`;
  return {
    adjustedExercise: { ...plannedExercise },
    adjustment: {
      exerciseId,
      exerciseName: exName,
      action: 'hold',
      reason,
    },
    reason,
  };
}

export interface GenerateNextWeekPlanParams {
  profile: FitnessProfile;
  currentPlan: FitnessPlan;
  currentWeekLogs: readonly FitnessWorkoutLog[];
  previousWeekLogs: readonly FitnessWorkoutLog[];
  energy: number;
  sleep: number;
  customExercises?: readonly CustomExercise[];
  consecutiveWeeksTrained?: number;
}

/**
 * Generate next week's plan using deterministic progressive overload rules.
 */
export function generateNextWeekPlan({
  profile,
  currentPlan,
  currentWeekLogs,
  previousWeekLogs,
  energy,
  sleep,
  customExercises = [],
  consecutiveWeeksTrained = 1,
}: GenerateNextWeekPlanParams): {
  nextPlan: FitnessPlan;
  adjustments: WeeklyCheckinAdjustment[];
  reasons: string[];
  isDeload: boolean;
} {
  const currentMonday = parseISO(currentPlan.weekStartDate);
  const nextMondayDate = addDays(currentMonday, 7);
  const nextMondayStr = format(nextMondayDate, 'yyyy-MM-dd');

  // Suggest deload every 5th week or when energy/sleep are low (<= 2)
  const isDeload = (consecutiveWeeksTrained + 1) % 5 === 0 || (energy <= 2 || sleep <= 2);

  const adjustments: WeeklyCheckinAdjustment[] = [];
  const reasons: string[] = [];

  const nextPlanId = generateId();

  const nextDays: FitnessPlanDay[] = currentPlan.days.map((day) => {
    const nextScheduledDate = format(addDays(nextMondayDate, day.dayOfWeek), 'yyyy-MM-dd');

    const nextExercises: FitnessPlanDayExercise[] = day.exercises.map((plannedEx) => {
      const ex = getExerciseById(plannedEx.exerciseId, customExercises);
      const evalResult = evaluateExerciseProgression({
        exerciseId: plannedEx.exerciseId,
        exercise: ex,
        plannedExercise: plannedEx,
        currentWeekLogs,
        previousWeekLogs,
        expectedWorkingSetCount: Math.max(1, currentPlan.days
          .filter((plannedDay) => !plannedDay.isSkipped && plannedDay.scheduledDate >= currentPlan.weekStartDate && plannedDay.scheduledDate < nextMondayStr)
          .flatMap((plannedDay) => plannedDay.exercises.filter((item) => item.exerciseId === plannedEx.exerciseId))
          .reduce((total, item) => total + item.targetSets, 0)),
        isDeload,
        units: profile.units,
      });

      adjustments.push(evalResult.adjustment);
      reasons.push(evalResult.reason);

      return evalResult.adjustedExercise;
    });

    return {
      id: generateId(),
      planId: nextPlanId,
      dayOfWeek: day.dayOfWeek,
      scheduledDate: nextScheduledDate,
      name: day.name,
      exercises: nextExercises,
      isSkipped: false,
      position: day.position,
    };
  });

  const nextPlan: FitnessPlan = {
    id: nextPlanId,
    weekStartDate: nextMondayStr,
    goalMode: currentPlan.goalMode,
    notes: isDeload
      ? `Deload week (week of ${nextMondayStr}) — focused on recovery and tissue repair`
      : `Progression week (week of ${nextMondayStr}) based on check-in`,
    days: nextDays,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { nextPlan, adjustments, reasons, isDeload };
}

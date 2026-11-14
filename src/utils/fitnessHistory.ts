import type { FitnessSetLog, FitnessWorkoutLog } from '../types';

/**
 * Get previous session performance for an exercise from completed workout logs.
 * Finds the most recent workout containing this exercise and returns its last/best set numbers.
 */
export function getPreviousExercisePerformance(
  exerciseId: string,
  history: readonly FitnessWorkoutLog[],
): { lastWeight: number | null; lastReps: number } | null {
  for (const log of history) {
    const matchingSets = log.sets.filter((s) => s.exerciseId === exerciseId && s.completed);
    if (matchingSets.length > 0) {
      // Pick the heaviest completed set or highest rep set
      const bestSet = [...matchingSets].sort((a, b) => {
        if (a.weight !== null && b.weight !== null && a.weight !== b.weight) {
          return b.weight - a.weight;
        }
        return b.reps - a.reps;
      })[0];
      return {
        lastWeight: bestSet.weight,
        lastReps: bestSet.reps,
      };
    }
  }
  return null;
}

/**
 * Deterministically check if a set qualifies as a Personal Record (PR).
 * - For weighted exercises: new max weight, or more weight for the same/greater reps.
 * - For bodyweight exercises: new max reps achieved in a single set.
 */
export function isPersonalRecord(
  exerciseId: string,
  reps: number,
  weight: number | null,
  isBodyweight: boolean,
  history: readonly FitnessWorkoutLog[],
): boolean {
  if (reps <= 0) return false;

  const previousSets: FitnessSetLog[] = [];
  for (const log of history) {
    for (const s of log.sets) {
      if (s.exerciseId === exerciseId && s.completed && s.reps > 0) {
        previousSets.push(s);
      }
    }
  }

  // Need at least one previous logged session to establish a comparison PR
  if (previousSets.length === 0) return false;

  if (isBodyweight || weight === null || weight === 0) {
    const maxPrevReps = Math.max(...previousSets.map((s) => s.reps));
    return reps > maxPrevReps;
  }

  // Weighted exercise comparison:
  const maxPrevWeightAll = Math.max(...previousSets.map((s) => s.weight ?? 0));
  if (weight > maxPrevWeightAll) return true;

  // Same or more reps with higher weight
  const sameOrMoreReps = previousSets.filter((s) => s.reps >= reps);
  if (sameOrMoreReps.length > 0) {
    const maxWeightAtReps = Math.max(...sameOrMoreReps.map((s) => s.weight ?? 0));
    return weight > maxWeightAtReps;
  }

  return false;
}

/**
 * Calculate summary metrics for a workout session.
 */
export function calculateWorkoutSummary(
  sets: readonly FitnessSetLog[],
  isBodyweightMap: Record<string, boolean>,
): {
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  prCount: number;
} {
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  let prCount = 0;

  for (const s of sets) {
    if (s.completed && s.reps > 0) {
      totalSets += 1;
      totalReps += s.reps;
      const isBodyweight = isBodyweightMap[s.exerciseId] || false;
      if (!isBodyweight && s.weight && s.weight > 0) {
        totalVolume += Math.round(s.weight * s.reps * 100) / 100;
      }
      if (s.isPr) {
        prCount += 1;
      }
    }
  }

  return { totalSets, totalReps, totalVolume, prCount };
}

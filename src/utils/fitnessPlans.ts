import { addDays, format, parseISO } from 'date-fns';
import type {
  FitnessPlan,
  FitnessPlanDay,
  FitnessPlanDayExercise,
  FitnessProfile,
  FitnessRoutine,
} from '../types';
import { generateId } from './helpers';
import { getLocalMonday } from '../stores/fitnessStore';

interface PlanTemplateDay {
  name: string;
  dayOfWeek: number; // 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun
  exercises: FitnessPlanDayExercise[];
}

/**
 * Pure TypeScript deterministic plan generators (no AI, no network).
 * Tailors rep-based plans by goal mode (Basic, Bulk, Cut, Custom),
 * experience (beginner, intermediate), and available equipment.
 */

// ---------------------------------------------------------------------------
// 1. Gym Plan Templates
// ---------------------------------------------------------------------------
function getGymBasicTemplates(): PlanTemplateDay[] {
  return [
    {
      name: 'Full Body A',
      dayOfWeek: 0, // Mon
      exercises: [
        { exerciseId: 'barbell-back-squat', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'barbell-bench-press', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'lat-pulldown', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-lateral-raise', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'dead-bug', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Full Body B',
      dayOfWeek: 2, // Wed
      exercises: [
        { exerciseId: 'barbell-romanian-deadlift', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'overhead-barbell-press', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'seated-cable-row', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'barbell-bicep-curl', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'triceps-rope-pushdown', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Full Body C',
      dayOfWeek: 4, // Fri
      exercises: [
        { exerciseId: 'leg-press', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'incline-barbell-bench-press', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'pull-up', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'face-pull', targetSets: 3, minReps: 12, maxReps: 15 },
        { exerciseId: 'hanging-knee-raise', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
  ];
}

function getGymBulkTemplates(isBeginner: boolean): PlanTemplateDay[] {
  if (isBeginner) {
    // 3 Full Body days with slightly elevated volume for beginners bulking
    return [
      {
        name: 'Full Body 1 (Volume)',
        dayOfWeek: 0,
        exercises: [
          { exerciseId: 'barbell-back-squat', targetSets: 4, minReps: 6, maxReps: 10 },
          { exerciseId: 'barbell-bench-press', targetSets: 4, minReps: 6, maxReps: 10 },
          { exerciseId: 'barbell-bent-over-row', targetSets: 4, minReps: 8, maxReps: 12 },
          { exerciseId: 'dumbbell-lateral-raise', targetSets: 3, minReps: 10, maxReps: 15 },
          { exerciseId: 'triceps-rope-pushdown', targetSets: 3, minReps: 10, maxReps: 15 },
        ],
      },
      {
        name: 'Full Body 2 (Volume)',
        dayOfWeek: 2,
        exercises: [
          { exerciseId: 'barbell-deadlift', targetSets: 3, minReps: 6, maxReps: 8 },
          { exerciseId: 'overhead-barbell-press', targetSets: 4, minReps: 6, maxReps: 10 },
          { exerciseId: 'lat-pulldown', targetSets: 4, minReps: 8, maxReps: 12 },
          { exerciseId: 'barbell-hip-thrust', targetSets: 3, minReps: 8, maxReps: 12 },
          { exerciseId: 'barbell-bicep-curl', targetSets: 3, minReps: 10, maxReps: 15 },
        ],
      },
      {
        name: 'Full Body 3 (Volume)',
        dayOfWeek: 4,
        exercises: [
          { exerciseId: 'incline-barbell-bench-press', targetSets: 4, minReps: 6, maxReps: 10 },
          { exerciseId: 'barbell-romanian-deadlift', targetSets: 4, minReps: 8, maxReps: 12 },
          { exerciseId: 'seated-cable-row', targetSets: 4, minReps: 8, maxReps: 12 },
          { exerciseId: 'cable-lateral-raise', targetSets: 3, minReps: 10, maxReps: 15 },
          { exerciseId: 'hanging-knee-raise', targetSets: 3, minReps: 10, maxReps: 15 },
        ],
      },
    ];
  }

  // 4-day Upper / Lower for intermediate bulk
  return [
    {
      name: 'Upper A (Heavy Compound)',
      dayOfWeek: 0, // Mon
      exercises: [
        { exerciseId: 'barbell-bench-press', targetSets: 4, minReps: 6, maxReps: 10 },
        { exerciseId: 'barbell-bent-over-row', targetSets: 4, minReps: 6, maxReps: 10 },
        { exerciseId: 'overhead-barbell-press', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'lat-pulldown', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-lateral-raise', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'triceps-rope-pushdown', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Lower A (Squat Focus)',
      dayOfWeek: 1, // Tue
      exercises: [
        { exerciseId: 'barbell-back-squat', targetSets: 4, minReps: 6, maxReps: 10 },
        { exerciseId: 'barbell-romanian-deadlift', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'leg-press', targetSets: 3, minReps: 10, maxReps: 12 },
        { exerciseId: 'lying-leg-curl', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'hanging-knee-raise', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Upper B (Hypertrophy)',
      dayOfWeek: 3, // Thu
      exercises: [
        { exerciseId: 'incline-barbell-bench-press', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'seated-cable-row', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'pull-up', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'cable-chest-flye', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'face-pull', targetSets: 3, minReps: 12, maxReps: 15 },
        { exerciseId: 'barbell-bicep-curl', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Lower B (Hinge Focus)',
      dayOfWeek: 4, // Fri
      exercises: [
        { exerciseId: 'barbell-deadlift', targetSets: 3, minReps: 6, maxReps: 8 },
        { exerciseId: 'barbell-front-squat', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'barbell-hip-thrust', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'standing-calf-raise-dumbbell', targetSets: 4, minReps: 10, maxReps: 15 },
        { exerciseId: 'dead-bug', targetSets: 3, minReps: 12, maxReps: 15 },
      ],
    },
  ];
}

function getGymCutTemplates(trainingDays: number): PlanTemplateDay[] {
  // Heavy weights maintained, volume kept moderate to preserve muscle
  const fourDays = trainingDays >= 4;
  if (!fourDays) {
    return [
      {
        name: 'Full Body Heavy 1',
        dayOfWeek: 0,
        exercises: [
          { exerciseId: 'barbell-back-squat', targetSets: 3, minReps: 6, maxReps: 8 },
          { exerciseId: 'barbell-bench-press', targetSets: 3, minReps: 6, maxReps: 8 },
          { exerciseId: 'lat-pulldown', targetSets: 3, minReps: 8, maxReps: 10 },
          { exerciseId: 'dead-bug', targetSets: 3, minReps: 10, maxReps: 12 },
        ],
      },
      {
        name: 'Full Body Heavy 2',
        dayOfWeek: 2,
        exercises: [
          { exerciseId: 'barbell-romanian-deadlift', targetSets: 3, minReps: 6, maxReps: 8 },
          { exerciseId: 'overhead-barbell-press', targetSets: 3, minReps: 6, maxReps: 8 },
          { exerciseId: 'seated-cable-row', targetSets: 3, minReps: 8, maxReps: 10 },
          { exerciseId: 'hanging-knee-raise', targetSets: 3, minReps: 10, maxReps: 12 },
        ],
      },
      {
        name: 'Full Body Heavy 3',
        dayOfWeek: 4,
        exercises: [
          { exerciseId: 'barbell-deadlift', targetSets: 3, minReps: 5, maxReps: 6 },
          { exerciseId: 'incline-barbell-bench-press', targetSets: 3, minReps: 6, maxReps: 8 },
          { exerciseId: 'pull-up', targetSets: 3, minReps: 6, maxReps: 8 },
          { exerciseId: 'dumbbell-lateral-raise', targetSets: 3, minReps: 10, maxReps: 12 },
        ],
      },
    ];
  }

  return [
    {
      name: 'Upper Cut A',
      dayOfWeek: 0,
      exercises: [
        { exerciseId: 'barbell-bench-press', targetSets: 3, minReps: 6, maxReps: 8 },
        { exerciseId: 'barbell-bent-over-row', targetSets: 3, minReps: 6, maxReps: 8 },
        { exerciseId: 'overhead-barbell-press', targetSets: 3, minReps: 6, maxReps: 8 },
        { exerciseId: 'lat-pulldown', targetSets: 3, minReps: 8, maxReps: 10 },
      ],
    },
    {
      name: 'Lower Cut A',
      dayOfWeek: 1,
      exercises: [
        { exerciseId: 'barbell-back-squat', targetSets: 3, minReps: 6, maxReps: 8 },
        { exerciseId: 'barbell-romanian-deadlift', targetSets: 3, minReps: 6, maxReps: 8 },
        { exerciseId: 'lying-leg-curl', targetSets: 3, minReps: 8, maxReps: 10 },
        { exerciseId: 'dead-bug', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Upper Cut B',
      dayOfWeek: 3,
      exercises: [
        { exerciseId: 'incline-barbell-bench-press', targetSets: 3, minReps: 6, maxReps: 8 },
        { exerciseId: 'pull-up', targetSets: 3, minReps: 6, maxReps: 8 },
        { exerciseId: 'seated-cable-row', targetSets: 3, minReps: 8, maxReps: 10 },
        { exerciseId: 'dumbbell-lateral-raise', targetSets: 3, minReps: 10, maxReps: 12 },
      ],
    },
    {
      name: 'Lower Cut B',
      dayOfWeek: 4,
      exercises: [
        { exerciseId: 'barbell-deadlift', targetSets: 3, minReps: 5, maxReps: 6 },
        { exerciseId: 'leg-press', targetSets: 3, minReps: 8, maxReps: 10 },
        { exerciseId: 'barbell-hip-thrust', targetSets: 3, minReps: 8, maxReps: 10 },
        { exerciseId: 'hanging-knee-raise', targetSets: 3, minReps: 10, maxReps: 12 },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 2. Dumbbell Plan Templates
// ---------------------------------------------------------------------------
function getDumbbellBasicTemplates(): PlanTemplateDay[] {
  return [
    {
      name: 'Dumbbell Full Body 1',
      dayOfWeek: 0,
      exercises: [
        { exerciseId: 'dumbbell-goblet-squat', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-bench-press', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-bent-over-row', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'overhead-dumbbell-press', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dead-bug', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Dumbbell Full Body 2',
      dayOfWeek: 2,
      exercises: [
        { exerciseId: 'dumbbell-romanian-deadlift', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-floor-press', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-single-arm-row', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-lateral-raise', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'russian-twist-weighted', targetSets: 3, minReps: 12, maxReps: 16 },
      ],
    },
    {
      name: 'Dumbbell Full Body 3',
      dayOfWeek: 4,
      exercises: [
        { exerciseId: 'bulgarian-split-squat-dumbbell', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'incline-dumbbell-bench-press', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-pullover', targetSets: 3, minReps: 10, maxReps: 12 },
        { exerciseId: 'dumbbell-bicep-curl', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'overhead-dumbbell-triceps-extension', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
  ];
}

function getDumbbellBulkTemplates(isBeginner: boolean): PlanTemplateDay[] {
  if (isBeginner) {
    return getDumbbellBasicTemplates();
  }
  return [
    {
      name: 'Dumbbell Upper 1',
      dayOfWeek: 0,
      exercises: [
        { exerciseId: 'dumbbell-bench-press', targetSets: 4, minReps: 6, maxReps: 10 },
        { exerciseId: 'dumbbell-bent-over-row', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'overhead-dumbbell-press', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-single-arm-row', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-lateral-raise', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Dumbbell Lower 1',
      dayOfWeek: 1,
      exercises: [
        { exerciseId: 'dumbbell-goblet-squat', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-romanian-deadlift', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'bulgarian-split-squat-dumbbell', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-glute-bridge', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'dead-bug', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Dumbbell Upper 2',
      dayOfWeek: 3,
      exercises: [
        { exerciseId: 'incline-dumbbell-bench-press', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-pullover', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-flye', targetSets: 3, minReps: 10, maxReps: 12 },
        { exerciseId: 'dumbbell-rear-delt-flye', targetSets: 3, minReps: 12, maxReps: 15 },
        { exerciseId: 'dumbbell-bicep-curl', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Dumbbell Lower 2',
      dayOfWeek: 4,
      exercises: [
        { exerciseId: 'dumbbell-romanian-deadlift', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'dumbbell-goblet-squat', targetSets: 4, minReps: 8, maxReps: 12 },
        { exerciseId: 'standing-calf-raise-dumbbell', targetSets: 4, minReps: 12, maxReps: 15 },
        { exerciseId: 'russian-twist-weighted', targetSets: 3, minReps: 12, maxReps: 16 },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 3. Bodyweight Plan Templates
// ---------------------------------------------------------------------------
function getBodyweightTemplates(): PlanTemplateDay[] {
  return [
    {
      name: 'Calisthenics Full Body 1',
      dayOfWeek: 0,
      exercises: [
        { exerciseId: 'push-up', targetSets: 3, minReps: 8, maxReps: 15 },
        { exerciseId: 'bodyweight-squat', targetSets: 3, minReps: 12, maxReps: 20 },
        { exerciseId: 'inverted-row', targetSets: 3, minReps: 8, maxReps: 12 },
        { exerciseId: 'single-leg-bodyweight-deadlift', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'dead-bug', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Calisthenics Full Body 2',
      dayOfWeek: 2,
      exercises: [
        { exerciseId: 'pike-push-up', targetSets: 3, minReps: 6, maxReps: 10 },
        { exerciseId: 'bulgarian-split-squat-bodyweight', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'pull-up', targetSets: 3, minReps: 5, maxReps: 10 },
        { exerciseId: 'glute-bridge', targetSets: 3, minReps: 12, maxReps: 20 },
        { exerciseId: 'lying-leg-raise', targetSets: 3, minReps: 10, maxReps: 15 },
      ],
    },
    {
      name: 'Calisthenics Full Body 3',
      dayOfWeek: 4,
      exercises: [
        { exerciseId: 'incline-push-up', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'chin-up', targetSets: 3, minReps: 5, maxReps: 10 },
        { exerciseId: 'bench-dip', targetSets: 3, minReps: 10, maxReps: 15 },
        { exerciseId: 'bird-dog', targetSets: 3, minReps: 10, maxReps: 12 },
        { exerciseId: 'standing-calf-raise-bodyweight', targetSets: 3, minReps: 15, maxReps: 25 },
      ],
    },
  ];
}

/**
 * Generate a complete 7-day fitness plan for the current Monday week.
 */
export function generateFitnessPlan(profile: FitnessProfile, weekStartDate?: string): FitnessPlan {
  const monday = weekStartDate || getLocalMonday();
  const isBeginner = profile.experience === 'beginner';
  let dayTemplates: PlanTemplateDay[] = [];

  if (profile.equipment === 'bodyweight') {
    dayTemplates = getBodyweightTemplates();
  } else if (profile.equipment === 'dumbbells') {
    if (profile.goalMode === 'bulk') {
      dayTemplates = getDumbbellBulkTemplates(isBeginner);
    } else {
      dayTemplates = getDumbbellBasicTemplates();
    }
  } else {
    // Gym equipment
    if (profile.goalMode === 'bulk') {
      dayTemplates = getGymBulkTemplates(isBeginner);
    } else if (profile.goalMode === 'cut') {
      dayTemplates = getGymCutTemplates(profile.trainingDaysPerWeek);
    } else {
      dayTemplates = getGymBasicTemplates();
    }
  }

  // If trainingDaysPerWeek is 3, clamp to 3 days; if 4, ensure 4 days.
  if (profile.trainingDaysPerWeek === 3 && dayTemplates.length > 3) {
    dayTemplates = dayTemplates.slice(0, 3);
  }

  const planId = generateId();
  const days: FitnessPlanDay[] = dayTemplates.map((template, index) => {
    const scheduledDate = format(addDays(parseISO(monday), template.dayOfWeek), 'yyyy-MM-dd');
    return {
      id: generateId(),
      planId,
      dayOfWeek: template.dayOfWeek,
      scheduledDate,
      name: template.name,
      exercises: template.exercises,
      isSkipped: false,
      position: index,
    };
  });

  return {
    id: planId,
    weekStartDate: monday,
    goalMode: profile.goalMode,
    notes: `Generated ${profile.goalMode.toUpperCase()} plan for ${profile.equipment} (${profile.experience})`,
    days,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Convert a planned workout day into a reusable custom routine.
 */
export function convertPlanDayToRoutine(day: FitnessPlanDay): Omit<FitnessRoutine, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: day.name,
    notes: `Routine created from planned session (${day.scheduledDate})`,
    exercises: day.exercises.map((ex, index) => ({
      id: generateId(),
      routineId: '',
      exerciseId: ex.exerciseId,
      targetSets: ex.targetSets,
      minReps: ex.minReps,
      maxReps: ex.maxReps,
      targetWeight: ex.targetWeight ?? null,
      position: index,
    })),
  };
}

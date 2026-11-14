import { create } from 'zustand';
import type {
  DailyHealth, Workout, FitnessProfile, CustomExercise, FitnessRoutine,
  FitnessPlan, FitnessWorkoutLog, FitnessWeeklyCheckin,
} from '../types';
import { generateId, getTodayStr } from '../utils/helpers';
import {
  createWorkout, deleteWorkout, saveDailyHealth, fetchFitnessData,
  saveFitnessProfile, createCustomExercise, deleteCustomExercise,
  saveFitnessRoutine, deleteFitnessRoutine, saveFitnessPlan,
  updateFitnessPlanDay, saveFitnessWorkoutLog, deleteFitnessWorkoutLog,
  saveFitnessWeeklyCheckin, prefixCustomExerciseId,
} from '../lib/cloudData';
import { reportCloudError } from '../lib/cloudFeedback';
import { startOfWeek, format, parseISO } from 'date-fns';

export function getLocalMonday(dateStr?: string): string {
  const d = dateStr ? parseISO(dateStr) : new Date();
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

interface FitnessState {
  // Legacy / Daily Health (Kept intact)
  workouts: Workout[];
  dailyHealth: DailyHealth[];
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  removeWorkout: (id: string) => void;
  updateDailyHealth: (data: Partial<DailyHealth>) => void;
  getTodayHealth: () => DailyHealth;

  // Upgraded Fitness Phase 1
  profile: FitnessProfile | null;
  customExercises: CustomExercise[];
  routines: FitnessRoutine[];
  plans: FitnessPlan[];
  workoutLogs: FitnessWorkoutLog[];
  weeklyCheckins: FitnessWeeklyCheckin[];
  fitnessSchemaAvailable: boolean;
  isLoading: boolean;
  isLoaded: boolean;

  loadFitnessData: () => Promise<void>;
  updateProfile: (profile: FitnessProfile) => Promise<void>;
  addCustomExercise: (exercise: Omit<CustomExercise, 'id' | 'createdAt'>) => Promise<CustomExercise>;
  removeCustomExercise: (id: string) => Promise<void>;
  addRoutine: (routine: Omit<FitnessRoutine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FitnessRoutine>;
  updateRoutine: (id: string, updates: Partial<FitnessRoutine>) => Promise<void>;
  duplicateRoutine: (id: string) => Promise<FitnessRoutine | null>;
  removeRoutine: (id: string) => Promise<void>;
  setPlan: (plan: FitnessPlan) => Promise<void>;
  skipOrMovePlanDay: (planDayId: string, updates: { isSkipped?: boolean; scheduledDate?: string }) => Promise<void>;
  addWorkoutLog: (log: Omit<FitnessWorkoutLog, 'id' | 'createdAt'>) => Promise<FitnessWorkoutLog>;
  removeWorkoutLog: (id: string) => Promise<void>;
  addWeeklyCheckin: (checkin: Omit<FitnessWeeklyCheckin, 'id' | 'createdAt'>) => Promise<FitnessWeeklyCheckin>;
  getCurrentPlan: () => FitnessPlan | null;
}

const DEFAULT_HEALTH: DailyHealth = { date: '', sleepHours: 0, waterGlasses: 0 };

export const useFitnessStore = create<FitnessState>()((set, get) => ({
  workouts: [],
  dailyHealth: [],
  profile: null,
  customExercises: [],
  routines: [],
  plans: [],
  workoutLogs: [],
  weeklyCheckins: [],
  fitnessSchemaAvailable: true,
  isLoading: false,
  isLoaded: false,

  addWorkout: (data) => {
    const workout = { ...data, id: generateId() };
    void createWorkout(workout).then(() => set((state) => ({ workouts: [...state.workouts, workout] }))).catch(reportCloudError);
  },
  removeWorkout: (id) => {
    void deleteWorkout(id).then(() => set((state) => ({ workouts: state.workouts.filter((workout) => workout.id !== id) }))).catch(reportCloudError);
  },
  updateDailyHealth: (data) => {
    const today = getTodayStr();
    const next = { ...DEFAULT_HEALTH, ...get().dailyHealth.find((item) => item.date === today), ...data, date: today };
    void saveDailyHealth(next).then(() => set((state) => ({ dailyHealth: state.dailyHealth.some((item) => item.date === today)
      ? state.dailyHealth.map((item) => item.date === today ? next : item)
      : [...state.dailyHealth, next],
    }))).catch(reportCloudError);
  },
  getTodayHealth: () => get().dailyHealth.find((item) => item.date === getTodayStr()) ?? { ...DEFAULT_HEALTH, date: getTodayStr() },

  loadFitnessData: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const data = await fetchFitnessData();
      set({ ...data, isLoaded: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      reportCloudError(err);
    }
  },

  updateProfile: async (profile) => {
    const previous = get().profile;
    set({ profile });
    try {
      await saveFitnessProfile(profile);
    } catch (err) {
      set({ profile: previous });
      reportCloudError(err);
      throw err;
    }
  },

  addCustomExercise: async (exerciseData) => {
    const newEx: CustomExercise = {
      ...exerciseData,
      id: prefixCustomExerciseId(generateId()),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ customExercises: [...state.customExercises, newEx] }));
    try {
      await createCustomExercise(newEx);
      return newEx;
    } catch (err) {
      set((state) => ({ customExercises: state.customExercises.filter((e) => e.id !== newEx.id) }));
      reportCloudError(err);
      throw err;
    }
  },

  removeCustomExercise: async (id) => {
    const prev = get().customExercises;
    set({ customExercises: prev.filter((e) => e.id !== id) });
    try {
      await deleteCustomExercise(id);
    } catch (err) {
      set({ customExercises: prev });
      reportCloudError(err);
      throw err;
    }
  },

  addRoutine: async (routineData) => {
    const now = new Date().toISOString();
    const newRoutine: FitnessRoutine = {
      ...routineData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ routines: [...state.routines, newRoutine] }));
    try {
      await saveFitnessRoutine(newRoutine);
      return newRoutine;
    } catch (err) {
      set((state) => ({ routines: state.routines.filter((r) => r.id !== newRoutine.id) }));
      reportCloudError(err);
      throw err;
    }
  },

  updateRoutine: async (id, updates) => {
    const prev = get().routines;
    const existing = prev.find((r) => r.id === id);
    if (!existing) return;
    const updated: FitnessRoutine = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    set({ routines: prev.map((r) => (r.id === id ? updated : r)) });
    try {
      await saveFitnessRoutine(updated);
    } catch (err) {
      set({ routines: prev });
      reportCloudError(err);
      throw err;
    }
  },

  duplicateRoutine: async (id) => {
    const routine = get().routines.find((r) => r.id === id);
    if (!routine) return null;
    const now = new Date().toISOString();
    const duplicated: FitnessRoutine = {
      id: generateId(),
      name: `${routine.name} (Copy)`.slice(0, 100),
      notes: routine.notes,
      exercises: routine.exercises.map((e) => ({ ...e, id: generateId() })),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ routines: [...state.routines, duplicated] }));
    try {
      await saveFitnessRoutine(duplicated);
      return duplicated;
    } catch (err) {
      set((state) => ({ routines: state.routines.filter((r) => r.id !== duplicated.id) }));
      reportCloudError(err);
      throw err;
    }
  },

  removeRoutine: async (id) => {
    const prev = get().routines;
    set({ routines: prev.filter((r) => r.id !== id) });
    try {
      await deleteFitnessRoutine(id);
    } catch (err) {
      set({ routines: prev });
      reportCloudError(err);
      throw err;
    }
  },

  setPlan: async (plan) => {
    const prev = get().plans;
    const existingIndex = prev.findIndex((p) => p.weekStartDate === plan.weekStartDate);
    const updatedPlans = existingIndex >= 0
      ? prev.map((p, i) => (i === existingIndex ? plan : p))
      : [plan, ...prev];
    set({ plans: updatedPlans });
    try {
      await saveFitnessPlan(plan);
    } catch (err) {
      set({ plans: prev });
      reportCloudError(err);
      throw err;
    }
  },

  skipOrMovePlanDay: async (planDayId, updates) => {
    const prev = get().plans;
    const updated = prev.map((plan) => ({
      ...plan,
      days: plan.days.map((day) => (day.id === planDayId ? { ...day, ...updates } : day)),
    }));
    set({ plans: updated });
    try {
      await updateFitnessPlanDay(planDayId, updates);
    } catch (err) {
      set({ plans: prev });
      reportCloudError(err);
      throw err;
    }
  },

  addWorkoutLog: async (logData) => {
    const newLog: FitnessWorkoutLog = {
      ...logData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ workoutLogs: [newLog, ...state.workoutLogs] }));
    try {
      await saveFitnessWorkoutLog(newLog);
      return newLog;
    } catch (err) {
      set((state) => ({ workoutLogs: state.workoutLogs.filter((l) => l.id !== newLog.id) }));
      reportCloudError(err);
      throw err;
    }
  },

  removeWorkoutLog: async (id) => {
    const prev = get().workoutLogs;
    set({ workoutLogs: prev.filter((l) => l.id !== id) });
    try {
      await deleteFitnessWorkoutLog(id);
    } catch (err) {
      set({ workoutLogs: prev });
      reportCloudError(err);
      throw err;
    }
  },

  addWeeklyCheckin: async (checkinData) => {
    const newCheckin: FitnessWeeklyCheckin = {
      ...checkinData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const filtered = state.weeklyCheckins.filter((c) => c.weekStartDate !== newCheckin.weekStartDate);
      return { weeklyCheckins: [newCheckin, ...filtered] };
    });
    try {
      await saveFitnessWeeklyCheckin(newCheckin);
      return newCheckin;
    } catch (err) {
      set((state) => ({ weeklyCheckins: state.weeklyCheckins.filter((c) => c.id !== newCheckin.id) }));
      reportCloudError(err);
      throw err;
    }
  },

  getCurrentPlan: () => {
    const currentMonday = getLocalMonday();
    return get().plans.find((p) => p.weekStartDate === currentMonday) ?? null;
  },
}));

// ========================================
// Fitness Store
// ========================================
// Manages workout logs and daily health metrics (sleep, water) using Zustand.
// Persisted to localStorage so data survives page refreshes.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workout, DailyHealth } from '../types';
import { generateId, getTodayStr } from '../utils/helpers';

/**
 * Shape of the fitness store — includes workouts, daily health data,
 * and all the actions that can modify them.
 */
interface FitnessState {
  workouts: Workout[];
  dailyHealth: DailyHealth[];
  /** Add a new workout (id is auto-generated) */
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  /** Remove a workout by its ID */
  removeWorkout: (id: string) => void;
  /** Update today's health metrics (creates a new entry if none exists) */
  updateDailyHealth: (data: Partial<DailyHealth>) => void;
  /** Get today's health data (returns defaults if none exists) */
  getTodayHealth: () => DailyHealth;
}

/** Default health values for a new day */
const DEFAULT_HEALTH: DailyHealth = {
  date: '',
  sleepHours: 0,
  waterGlasses: 0,
};

export const useFitnessStore = create<FitnessState>()(
  persist(
    (set, get) => ({
      // Start with empty arrays
      workouts: [],
      dailyHealth: [],

      addWorkout: (workoutData) => set((state) => ({
        workouts: [...state.workouts, { ...workoutData, id: generateId() }],
      })),

      removeWorkout: (id) => set((state) => ({
        workouts: state.workouts.filter((w) => w.id !== id),
      })),

      updateDailyHealth: (data) => {
        const today = getTodayStr();
        set((state) => {
          const existing = state.dailyHealth.find((d) => d.date === today);
          if (existing) {
            // Update today's existing entry
            return {
              dailyHealth: state.dailyHealth.map((d) =>
                d.date === today ? { ...d, ...data } : d
              ),
            };
          }
          // Create a new entry for today with defaults + provided data
          return {
            dailyHealth: [...state.dailyHealth, { ...DEFAULT_HEALTH, date: today, ...data }],
          };
        });
      },

      getTodayHealth: () => {
        const today = getTodayStr();
        return get().dailyHealth.find((d) => d.date === today) ?? { ...DEFAULT_HEALTH, date: today };
      },
    }),
    // Persist to localStorage under this key
    { name: 'life-tracker-fitness' }
  )
);

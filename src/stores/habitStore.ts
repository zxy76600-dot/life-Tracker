// ========================================
// Habit Store
// ========================================
// Manages all habit-related data using Zustand.
// Uses localStorage persistence so data survives page refreshes.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit } from '../types';
import { generateId, getTodayStr } from '../utils/helpers';

/**
 * Shape of the habit store — includes the data (habits array)
 * and all the actions that can modify it.
 */
interface HabitState {
  habits: Habit[];
  /** Add a new habit (id, createdAt, and completedDates are auto-generated) */
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'completedDates'>) => void;
  /** Remove a habit by its ID */
  removeHabit: (id: string) => void;
  /** Toggle whether a habit is completed for a given date (defaults to today) */
  toggleHabitCompletion: (id: string, date?: string) => void;
  /** Partially update a habit's properties */
  updateHabit: (id: string, updates: Partial<Habit>) => void;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set) => ({
      // Start with an empty habits array
      habits: [],

      addHabit: (habitData) => set((state) => ({
        habits: [
          ...state.habits,
          {
            ...habitData,
            id: generateId(),
            createdAt: getTodayStr(),
            completedDates: [],
          },
        ],
      })),

      removeHabit: (id) => set((state) => ({
        habits: state.habits.filter((h) => h.id !== id),
      })),

      toggleHabitCompletion: (id, date) => set((state) => ({
        habits: state.habits.map((habit) => {
          if (habit.id !== id) return habit;

          const targetDate = date ?? getTodayStr();
          const isCompleted = habit.completedDates.includes(targetDate);

          return {
            ...habit,
            // If already completed for that date, remove it; otherwise add it
            completedDates: isCompleted
              ? habit.completedDates.filter((d) => d !== targetDate)
              : [...habit.completedDates, targetDate],
          };
        }),
      })),

      updateHabit: (id, updates) => set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      })),
    }),
    // Persist to localStorage under this key
    { name: 'life-tracker-habits' }
  )
);

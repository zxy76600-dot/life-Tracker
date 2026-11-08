// ========================================
// Mood Store
// ========================================
// Manages mood journal entries using Zustand.
// Only one entry per day — adding a mood on the same day updates the existing entry.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MoodEntry, MoodLevel } from '../types';
import { generateId, getTodayStr } from '../utils/helpers';

/**
 * Shape of the mood store — includes the data (entries array)
 * and all the actions that can modify it.
 */
interface MoodState {
  entries: MoodEntry[];
  /** Add or update today's mood entry */
  addEntry: (mood: MoodLevel, note: string, tags?: string[]) => void;
  /** Remove a mood entry by its ID */
  removeEntry: (id: string) => void;
  /** Partially update a mood entry's properties */
  updateEntry: (id: string, updates: Partial<MoodEntry>) => void;
  /** Get today's mood entry (if it exists) */
  getTodayEntry: () => MoodEntry | undefined;
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      // Start with an empty entries array
      entries: [],

      addEntry: (mood, note, tags = []) => {
        const today = getTodayStr();
        const existing = get().entries.find((e) => e.date === today);

        if (existing) {
          // Update today's existing entry instead of creating a new one
          set((state) => ({
            entries: state.entries.map((e) =>
              e.id === existing.id ? { ...e, mood, note, tags } : e
            ),
          }));
        } else {
          // Create a brand new entry for today
          set((state) => ({
            entries: [
              ...state.entries,
              { id: generateId(), date: today, mood, note, tags },
            ],
          }));
        }
      },

      removeEntry: (id) => set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      })),

      updateEntry: (id, updates) => set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      })),

      getTodayEntry: () => {
        const today = getTodayStr();
        return get().entries.find((e) => e.date === today);
      },
    }),
    // Persist to localStorage under this key
    { name: 'life-tracker-mood' }
  )
);

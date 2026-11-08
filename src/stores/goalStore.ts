// ========================================
// Goal Store
// ========================================
// Manages goals and their milestones using Zustand.
// Persisted to localStorage so goals survive page refreshes.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal } from '../types';
import { generateId, getTodayStr } from '../utils/helpers';

/**
 * Shape of the goal store — includes the data (goals array)
 * and all the actions that can modify it.
 */
interface GoalState {
  goals: Goal[];
  /** Add a new goal. Milestones are passed as simple strings and converted to Milestone objects. */
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'completed' | 'milestones'> & { milestones: string[] }) => void;
  /** Remove a goal by its ID */
  removeGoal: (id: string) => void;
  /** Toggle the completion state of a specific milestone within a goal */
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  /** Toggle the overall completion state of a goal */
  toggleGoalComplete: (id: string) => void;
  /** Partially update a goal's properties */
  updateGoal: (id: string, updates: Partial<Goal>) => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      // Start with an empty goals array
      goals: [],

      addGoal: (goalData) => set((state) => ({
        goals: [
          ...state.goals,
          {
            ...goalData,
            id: generateId(),
            createdAt: getTodayStr(),
            completed: false,
            // Convert simple string titles into full Milestone objects
            milestones: goalData.milestones.map((title) => ({
              id: generateId(),
              title,
              completed: false,
            })),
          },
        ],
      })),

      removeGoal: (id) => set((state) => ({
        goals: state.goals.filter((g) => g.id !== id),
      })),

      toggleMilestone: (goalId, milestoneId) => set((state) => ({
        goals: state.goals.map((goal) => {
          if (goal.id !== goalId) return goal;
          return {
            ...goal,
            milestones: goal.milestones.map((m) =>
              m.id === milestoneId ? { ...m, completed: !m.completed } : m
            ),
          };
        }),
      })),

      toggleGoalComplete: (id) => set((state) => ({
        goals: state.goals.map((g) =>
          g.id === id ? { ...g, completed: !g.completed } : g
        ),
      })),

      updateGoal: (id, updates) => set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      })),
    }),
    // Persist to localStorage under this key
    { name: 'life-tracker-goals' }
  )
);

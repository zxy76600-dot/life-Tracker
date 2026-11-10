import { create } from 'zustand';
import type { Goal } from '../types';
import { generateId, getTodayStr } from '../utils/helpers';
import { createGoal, deleteGoal, editGoal, setGoalComplete, setMilestoneComplete } from '../lib/cloudData';
import { reportCloudError } from '../lib/cloudFeedback';

interface GoalState {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'completed' | 'milestones'> & { milestones: string[] }) => void;
  removeGoal: (id: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  toggleGoalComplete: (id: string) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
}

export const useGoalStore = create<GoalState>()((set, get) => ({
  goals: [],
  addGoal: (data) => {
    const createdAt = getTodayStr();
    const goal: Goal = {
      ...data, id: generateId(), createdAt, completed: false,
      milestones: data.milestones.map((title) => ({ id: generateId(), title, completed: false })),
    };
    void createGoal(goal).then(() => set((state) => ({ goals: [...state.goals, goal] }))).catch(reportCloudError);
  },
  removeGoal: (id) => {
    void deleteGoal(id).then(() => set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) }))).catch(reportCloudError);
  },
  toggleMilestone: (goalId, milestoneId) => {
    const milestone = get().goals.find((goal) => goal.id === goalId)?.milestones.find((item) => item.id === milestoneId);
    if (!milestone) return;
    void setMilestoneComplete(milestoneId, !milestone.completed).then(() => set((state) => ({
      goals: state.goals.map((goal) => goal.id !== goalId ? goal : {
        ...goal, milestones: goal.milestones.map((item) => item.id === milestoneId ? { ...item, completed: !item.completed } : item),
      }),
    }))).catch(reportCloudError);
  },
  toggleGoalComplete: (id) => {
    const goal = get().goals.find((item) => item.id === id);
    if (!goal) return;
    void setGoalComplete(id, !goal.completed).then(() => set((state) => ({ goals: state.goals.map((item) => item.id === id ? { ...item, completed: !item.completed } : item) }))).catch(reportCloudError);
  },
  updateGoal: (id, updates) => {
    const existing = get().goals.find((goal) => goal.id === id);
    if (!existing) return;
    const next = { ...existing, ...updates };
    void editGoal(id, updates).then(() => set((state) => ({ goals: state.goals.map((goal) => goal.id === id ? next : goal) }))).catch(reportCloudError);
  },
}));

import { create } from 'zustand';
import type { Habit } from '../types';
import { generateId, getTodayStr } from '../utils/helpers';
import { createHabit, deleteHabit, setHabitCompletion, updateHabit } from '../lib/cloudData';
import { reportCloudError } from '../lib/cloudFeedback';

interface HabitState {
  habits: Habit[];
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'completedDates'>) => void;
  removeHabit: (id: string) => void;
  toggleHabitCompletion: (id: string, date?: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
}

export const useHabitStore = create<HabitState>()((set, get) => ({
  habits: [],
  addHabit: (habitData) => {
    const habit: Habit = { ...habitData, id: generateId(), createdAt: getTodayStr(), completedDates: [] };
    void createHabit(habit).then(() => set((state) => ({ habits: [...state.habits, habit] }))).catch(reportCloudError);
  },
  removeHabit: (id) => {
    void deleteHabit(id).then(() => set((state) => ({ habits: state.habits.filter((habit) => habit.id !== id) }))).catch(reportCloudError);
  },
  toggleHabitCompletion: (id, date) => {
    const habit = get().habits.find((item) => item.id === id);
    if (!habit) return;
    const targetDate = date ?? getTodayStr();
    const complete = !habit.completedDates.includes(targetDate);
    void setHabitCompletion(id, targetDate, complete).then(() => set((state) => ({
      habits: state.habits.map((item) => item.id !== id ? item : {
        ...item,
        completedDates: complete ? [...item.completedDates, targetDate] : item.completedDates.filter((day) => day !== targetDate),
      }),
    }))).catch(reportCloudError);
  },
  updateHabit: (id, updates) => {
    void updateHabit(id, updates).then(() => set((state) => ({ habits: state.habits.map((habit) => habit.id === id ? { ...habit, ...updates } : habit) }))).catch(reportCloudError);
  },
}));

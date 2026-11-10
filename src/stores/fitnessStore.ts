import { create } from 'zustand';
import type { DailyHealth, Workout } from '../types';
import { generateId, getTodayStr } from '../utils/helpers';
import { createWorkout, deleteWorkout, saveDailyHealth } from '../lib/cloudData';
import { reportCloudError } from '../lib/cloudFeedback';

interface FitnessState {
  workouts: Workout[];
  dailyHealth: DailyHealth[];
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  removeWorkout: (id: string) => void;
  updateDailyHealth: (data: Partial<DailyHealth>) => void;
  getTodayHealth: () => DailyHealth;
}
const DEFAULT_HEALTH: DailyHealth = { date: '', sleepHours: 0, waterGlasses: 0 };

export const useFitnessStore = create<FitnessState>()((set, get) => ({
  workouts: [], dailyHealth: [],
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
}));

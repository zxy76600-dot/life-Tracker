import { create } from 'zustand';
import type { MoodEntry, MoodLevel } from '../types';
import { generateId, getTodayStr } from '../utils/helpers';
import { deleteMood, saveMood } from '../lib/cloudData';
import { reportCloudError } from '../lib/cloudFeedback';

interface MoodState {
  entries: MoodEntry[];
  addEntry: (mood: MoodLevel, note: string, tags?: string[]) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, updates: Partial<MoodEntry>) => void;
  getTodayEntry: () => MoodEntry | undefined;
}

export const useMoodStore = create<MoodState>()((set, get) => ({
  entries: [],
  addEntry: (mood, note, tags = []) => {
    const today = getTodayStr();
    const previous = get().entries.find((entry) => entry.date === today);
    const entry: MoodEntry = { id: previous?.id ?? generateId(), date: today, mood, note, tags };
    void saveMood(entry).then(() => set((state) => ({ entries: previous
      ? state.entries.map((item) => item.id === entry.id ? entry : item)
      : [...state.entries, entry],
    }))).catch(reportCloudError);
  },
  removeEntry: (id) => {
    void deleteMood(id).then(() => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }))).catch(reportCloudError);
  },
  updateEntry: (id, updates) => {
    const entry = get().entries.find((item) => item.id === id);
    if (!entry) return;
    const next = { ...entry, ...updates };
    void saveMood(next).then(() => set((state) => ({ entries: state.entries.map((item) => item.id === id ? next : item) }))).catch(reportCloudError);
  },
  getTodayEntry: () => get().entries.find((entry) => entry.date === getTodayStr()),
}));

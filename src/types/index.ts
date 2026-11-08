// ========================================
// Life Tracker - Type Definitions
// ========================================
// This file contains all TypeScript types used throughout the app.
// Having them in one place makes it easy to understand the data model.

// ========================================
// Habit Types
// ========================================

/** Represents a single habit the user wants to track */
export interface Habit {
  id: string;
  name: string;
  icon: string;        // Lucide icon name (e.g., 'Dumbbell', 'BookOpen')
  color: string;       // Tailwind color class like 'blue', 'emerald', 'purple'
  frequency: 'daily' | 'weekly';
  createdAt: string;   // ISO date string
  completedDates: string[]; // Array of ISO date strings when the habit was completed
}

// ========================================
// Goal Types
// ========================================

/** A single milestone within a goal */
export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

/** Represents a larger goal with milestones */
export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  milestones: Milestone[];
  targetDate: string;   // ISO date string
  createdAt: string;
  completed: boolean;
}

/** Available categories for goals */
export type GoalCategory = 'health' | 'career' | 'learning' | 'finance' | 'personal' | 'fitness';

// ========================================
// Mood Types
// ========================================

/** Represents a single mood journal entry */
export interface MoodEntry {
  id: string;
  date: string;          // ISO date string
  mood: MoodLevel;       // 1-5 scale
  note: string;
  tags: string[];
}

/** Mood level on a 1-5 scale */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/** Mood emojis mapped to levels for display */
export const MOOD_EMOJIS: Record<MoodLevel, string> = {
  1: '😢',  // Terrible
  2: '😟',  // Bad
  3: '😐',  // Okay
  4: '😊',  // Good
  5: '🤩',  // Amazing
};

/** Human-readable labels for each mood level */
export const MOOD_LABELS: Record<MoodLevel, string> = {
  1: 'Terrible',
  2: 'Bad',
  3: 'Okay',
  4: 'Good',
  5: 'Amazing',
};

// ========================================
// Fitness Types
// ========================================

/** Represents a single workout session */
export interface Workout {
  id: string;
  type: WorkoutType;
  name: string;
  duration: number;      // minutes
  calories: number;
  date: string;          // ISO date string
  notes: string;
}

/** Available workout types */
export type WorkoutType = 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other';

/** Daily health metrics (sleep, hydration) */
export interface DailyHealth {
  date: string;          // ISO date string
  sleepHours: number;
  waterGlasses: number;  // glasses of water
}

// ========================================
// Finance Types
// ========================================

/** Represents a single financial transaction */
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;          // ISO date string
}

/** Predefined expense categories for the finance tracker */
export const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Transportation', 'Housing', 'Utilities',
  'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Other'
] as const;

/** Predefined income categories for the finance tracker */
export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Gift', 'Other'
] as const;

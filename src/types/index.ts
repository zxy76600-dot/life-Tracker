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
// To-Do Types
// ========================================

export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoRecurrence = 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface TodoSubtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
}

export interface Todo {
  id: string;
  seriesId: string | null;
  title: string;
  notes: string;
  date: string;
  time: string | null;
  priority: TodoPriority;
  category: string | null;
  position: number;
  reminderEnabled: boolean;
  createdAt: string;
  completedAt: string | null;
  subtasks: TodoSubtask[];
}

export interface TodoSeries {
  id: string;
  title: string;
  notes: string;
  time: string | null;
  priority: TodoPriority;
  category: string | null;
  reminderEnabled: boolean;
  recurrence: TodoRecurrence;
  subtasks: string[];
  weekdays: number[];
  startsOn: string;
  endsOn: string | null;
  active: boolean;
  createdAt: string;
}

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
  walletId?: string | null;
  recurringSeriesId?: string | null;
  splitTotalAmount?: number | null;
}

export type FinanceCurrency = 'INR' | 'NPR' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'SGD' | 'NZD' | 'CHF' | 'CNY' | 'AED' | 'BDT' | 'PKR' | 'ZAR';
export type FinanceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type LoanDirection = 'lent' | 'borrowed';

export interface Wallet {
  id: string;
  name: string;
  openingBalance: number;
  archivedAt: string | null;
  createdAt: string;
}

export interface WalletTransfer {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  date: string;
  note: string;
}

export interface Loan {
  id: string;
  direction: LoanDirection;
  person: string;
  amount: number;
  date: string;
  dueDate: string | null;
  note: string;
  walletId: string | null;
  linkedTransactionId: string | null;
  createdAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  walletId: string | null;
  amount: number;
  date: string;
  note: string;
}

export interface FinanceBudget {
  id: string;
  monthStart: string;
  category: string;
  amount: number;
}

export interface FinanceKeywordRule {
  id: string;
  keyword: string;
  category: string;
  type: 'income' | 'expense';
}

export interface FinanceSettings {
  currency: FinanceCurrency;
  overallMonthlyBudget: number | null;
  keywordRules: FinanceKeywordRule[];
}

export interface RecurringTransactionSeries {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  walletId: string | null;
  frequency: FinanceFrequency;
  startsOn: string;
  endsOn: string | null;
  active: boolean;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  createdAt: string;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  walletId: string;
  amount: number;
  date: string;
  note: string;
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

// ========================================
// Upgraded Fitness Types (Phase 1)
// ========================================

export type FitnessGoalMode = 'basic' | 'bulk' | 'cut' | 'custom';
export type FitnessExperience = 'beginner' | 'intermediate';
export type FitnessEquipment = 'gym' | 'dumbbells' | 'bodyweight';
export type FitnessUnit = 'kg' | 'lb';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core' | 'full_body';

export interface FitnessProfile {
  goalMode: FitnessGoalMode;
  experience: FitnessExperience;
  trainingDaysPerWeek: number;
  equipment: FitnessEquipment;
  units: FitnessUnit;
  confirmed18OrOlder: boolean;
  hideWeight: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: FitnessEquipment;
  isBodyweight: boolean;
  formCues: string[];
  substitutes: string[];
}

export interface CustomExercise extends Exercise {
  createdAt: string;
}

export interface FitnessRoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetWeight?: number | null;
  position: number;
}

export interface FitnessRoutine {
  id: string;
  name: string;
  notes: string;
  exercises: FitnessRoutineExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface FitnessPlanDayExercise {
  exerciseId: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetWeight?: number | null;
}

export interface FitnessPlanDay {
  id: string;
  planId: string;
  dayOfWeek: number;
  scheduledDate: string;
  name: string;
  exercises: FitnessPlanDayExercise[];
  isSkipped: boolean;
  position: number;
}

export interface FitnessPlan {
  id: string;
  weekStartDate: string;
  goalMode: FitnessGoalMode;
  notes: string;
  days: FitnessPlanDay[];
  createdAt: string;
  updatedAt: string;
}

export interface FitnessSetLog {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number | null;
  completed: boolean;
  isPr: boolean;
}

export interface FitnessWorkoutLog {
  id: string;
  planDayId?: string | null;
  routineId?: string | null;
  name: string;
  date: string;
  startedAt?: string | null;
  completedAt?: string | null;
  notes: string;
  sets: FitnessSetLog[];
  createdAt: string;
}

export interface WeeklyCheckinAdjustment {
  exerciseId: string;
  exerciseName: string;
  action: 'increase' | 'hold' | 'decrease' | 'deload';
  weightChange?: number;
  reason: string;
}

export interface FitnessWeeklyCheckin {
  id: string;
  weekStartDate: string;
  workoutsCompleted: number;
  workoutsPlanned: number;
  energy: number;
  sleep: number;
  hunger: number;
  soreness: number;
  weight: number | null;
  adjustments: WeeklyCheckinAdjustment[];
  createdAt: string;
}


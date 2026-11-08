// ========================================
// Utility / Helper Functions
// ========================================
// Reusable helper functions used across the app.

import { format, isToday, isYesterday, differenceInDays, startOfDay, parseISO } from 'date-fns';

/**
 * Generate a unique ID for new items.
 * Uses timestamp + random string for simplicity.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format a date string for display.
 * Shows "Today", "Yesterday", or the formatted date.
 */
export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

/**
 * Format a date as a short string (e.g., "Nov 8")
 */
export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d');
}

/**
 * Get today's date as an ISO string (date only, no time).
 */
export function getTodayStr(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd');
}

/**
 * Calculate the current streak for a habit.
 * A streak counts how many consecutive days (up to today) the habit was completed.
 */
export function calculateStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  // Sort dates in descending order (most recent first)
  const sorted = [...completedDates].sort().reverse();
  const today = getTodayStr();

  // Check if the most recent completion is today or yesterday
  const mostRecent = sorted[0];
  const daysDiff = differenceInDays(parseISO(today), parseISO(mostRecent));

  if (daysDiff > 1) return 0; // Streak is broken

  // Count consecutive days going backwards
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInDays(parseISO(sorted[i - 1]), parseISO(sorted[i]));
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Format currency with dollar sign.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

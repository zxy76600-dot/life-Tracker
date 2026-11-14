import { addDays, format, parseISO, subDays } from 'date-fns';
import type { Todo } from '../types';

export interface TodoDayStats {
  date: string;
  label: string;
  total: number;
  completed: number;
  percent: number;
}

export function getTodoDayStats(todos: Todo[], date: string): TodoDayStats {
  const dayTodos = todos.filter((todo) => todo.date === date);
  const completed = dayTodos.filter((todo) => Boolean(todo.completedAt)).length;
  return { date, label: format(parseISO(date), 'EEE'), total: dayTodos.length, completed, percent: dayTodos.length ? Math.round(completed / dayTodos.length * 100) : 0 };
}

export function getTodoHistory(todos: Todo[], days: 7 | 30, throughDate = format(new Date(), 'yyyy-MM-dd')): TodoDayStats[] {
  const end = parseISO(throughDate);
  return Array.from({ length: days }, (_, index) => {
    const date = format(subDays(end, days - index - 1), 'yyyy-MM-dd');
    return getTodoDayStats(todos, date);
  });
}

export function getTodoStreak(todos: Todo[], today = format(new Date(), 'yyyy-MM-dd')) {
  const todayStats = getTodoDayStats(todos, today);
  let cursor = todayStats.total > 0 && todayStats.percent === 100 ? parseISO(today) : subDays(parseISO(today), 1);
  let streak = 0;
  for (let attempts = 0; attempts < 3650; attempts++) {
    const stats = getTodoDayStats(todos, format(cursor, 'yyyy-MM-dd'));
    if (stats.total === 0 || stats.percent < 100) break;
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function getTodoBestDay(todos: Todo[]) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const totals = new Map<string, Todo[]>();
  todos.forEach((todo) => totals.set(todo.date, [...(totals.get(todo.date) ?? []), todo]));
  let best: TodoDayStats | null = null;
  for (const date of totals.keys()) {
    if (date > today) continue;
    const stats = getTodoDayStats(todos, date);
    if (stats.completed === 0) continue;
    if (!best || stats.percent > best.percent || (stats.percent === best.percent && date > best.date)) best = stats;
  }
  return best;
}

export function nextTodoDate(date: string) {
  return format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
}

import { create } from 'zustand';
import type { Todo, TodoPriority, TodoRecurrence, TodoSeries, TodoSubtask } from '../types';
import {
  createTodo, createTodoSeries, createTodoSubtask, deleteTodo, deleteTodoSubtask,
  ensureRecurringTodoWindow, todoSeriesOccursOn, updateTodo, updateTodoSeries, updateTodoSubtask,
  updateTodoPositions,
} from '../lib/cloudData';
import { generateId, getTodayStr } from '../utils/helpers';
import { reportCloudError } from '../lib/cloudFeedback';

type NewTodo = {
  title: string;
  notes?: string;
  date?: string;
  time?: string | null;
  priority?: TodoPriority;
  category?: string | null;
  subtasks?: string[];
  recurrence?: TodoRecurrence | null;
  weekdays?: number[];
  endsOn?: string | null;
  reminderEnabled?: boolean;
};

interface TodoState {
  todos: Todo[];
  series: TodoSeries[];
  error: string;
  setData: (todos: Todo[], series: TodoSeries[]) => void;
  addTodo: (data: NewTodo) => Promise<void>;
  editTodo: (id: string, changes: Partial<Todo>) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  addSubtask: (todoId: string, title: string) => Promise<void>;
  editSubtask: (todoId: string, subtaskId: string, changes: Partial<TodoSubtask>) => Promise<void>;
  removeSubtask: (todoId: string, subtaskId: string) => Promise<void>;
  reorderSubtasks: (todoId: string, orderedIds: string[]) => Promise<void>;
  editSeries: (seriesId: string, changes: Partial<TodoSeries>, fromDate: string) => Promise<void>;
  stopSeries: (seriesId: string) => Promise<void>;
  reorderTodos: (date: string, orderedIds: string[]) => Promise<void>;
  clearError: () => void;
}

function currentError(error: unknown) {
  return error instanceof Error ? error.message : 'Could not save this task. Please try again.';
}

export const useTodoStore = create<TodoState>()((set, get) => ({
  todos: [],
  series: [],
  error: '',
  setData: (todos, series) => set({ todos, series, error: '' }),
  addTodo: async (data) => {
    const now = new Date().toISOString();
    const todo: Todo = {
      id: generateId(), seriesId: null, title: data.title.trim(), notes: data.notes?.trim() ?? '',
      date: data.date ?? getTodayStr(), time: data.time || null, priority: data.priority ?? 'medium',
      category: data.category || null, position: get().todos.filter((item) => item.date === (data.date ?? getTodayStr())).length,
      reminderEnabled: data.reminderEnabled ?? false, createdAt: now, completedAt: null,
      subtasks: (data.subtasks ?? []).filter((title) => title.trim()).map((title, index) => ({
        id: generateId(), title: title.trim(), completed: false, position: index, createdAt: now,
      })),
    };
    try {
      if (data.recurrence) {
        const series: TodoSeries = {
          id: generateId(), title: todo.title, notes: todo.notes, time: todo.time,
          priority: todo.priority, category: todo.category, reminderEnabled: todo.reminderEnabled,
          recurrence: data.recurrence, subtasks: todo.subtasks.map((item) => item.title), weekdays: data.weekdays ?? [], startsOn: todo.date,
          endsOn: data.endsOn ?? null, active: true, createdAt: now,
        };
        await createTodoSeries(series);
        const generated = await ensureRecurringTodoWindow([series], get().todos);
        set((state) => ({ todos: [...state.todos, ...generated], series: [...state.series, series], error: '' }));
      } else {
        await createTodo(todo);
        set((state) => ({ todos: [...state.todos, todo], error: '' }));
      }
    }
    catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  editTodo: async (id, changes) => {
    try {
      await updateTodo(id, changes);
      set((state) => ({ todos: state.todos.map((todo) => todo.id === id ? { ...todo, ...changes } : todo), error: '' }));
    } catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  removeTodo: async (id) => {
    try { await deleteTodo(id); set((state) => ({ todos: state.todos.filter((todo) => todo.id !== id), error: '' })); }
    catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  toggleTodo: async (id) => {
    const todo = get().todos.find((item) => item.id === id);
    if (!todo) return;
    const completedAt = todo.completedAt ? null : new Date().toISOString();
    await get().editTodo(id, { completedAt });
  },
  addSubtask: async (todoId, title) => {
    const todo = get().todos.find((item) => item.id === todoId);
    if (!todo || !title.trim()) return;
    const subtask: TodoSubtask = {
      id: generateId(), title: title.trim(), completed: false, position: todo.subtasks.length,
      createdAt: new Date().toISOString(),
    };
    try {
      await createTodoSubtask(todoId, subtask);
      set((state) => ({ todos: state.todos.map((item) => item.id === todoId ? { ...item, subtasks: [...item.subtasks, subtask] } : item), error: '' }));
    } catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  editSubtask: async (todoId, subtaskId, changes) => {
    try {
      await updateTodoSubtask(subtaskId, changes);
      set((state) => ({ todos: state.todos.map((todo) => todo.id !== todoId ? todo : {
        ...todo, subtasks: todo.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, ...changes } : subtask),
      }), error: '' }));
    } catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  removeSubtask: async (todoId, subtaskId) => {
    try {
      await deleteTodoSubtask(subtaskId);
      set((state) => ({ todos: state.todos.map((todo) => todo.id !== todoId ? todo : {
        ...todo, subtasks: todo.subtasks.filter((subtask) => subtask.id !== subtaskId),
      }), error: '' }));
    } catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  reorderSubtasks: async (todoId, orderedIds) => {
    const todo = get().todos.find((item) => item.id === todoId);
    if (!todo) return;
    const reordered = orderedIds.map((id) => todo.subtasks.find((item) => item.id === id)).filter((item): item is TodoSubtask => Boolean(item));
    try {
      await Promise.all(reordered.map((subtask, position) => updateTodoSubtask(subtask.id, { position })));
      set((state) => ({ todos: state.todos.map((item) => item.id === todoId ? {
        ...item, subtasks: reordered.map((subtask, position) => ({ ...subtask, position })),
      } : item), error: '' }));
    } catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  editSeries: async (seriesId, changes, fromDate) => {
    const previous = get().series.find((item) => item.id === seriesId);
    if (!previous) return;
    const nextSeries = { ...previous, ...changes };
    const future = get().todos.filter((todo) => todo.seriesId === seriesId && todo.date >= fromDate);
    try {
      await updateTodoSeries(seriesId, changes);
      await Promise.all(future.map((todo) => todoSeriesOccursOn(nextSeries, todo.date)
        ? updateTodo(todo.id, { title: nextSeries.title, notes: nextSeries.notes, time: nextSeries.time, priority: nextSeries.priority, category: nextSeries.category, reminderEnabled: nextSeries.reminderEnabled })
        : updateTodo(todo.id, { seriesId: null })));
      const remaining = get().todos.map((todo) => future.find((entry) => entry.id === todo.id && !todoSeriesOccursOn(nextSeries, entry.date)) ? { ...todo, seriesId: null } : todo);
      const generated = await ensureRecurringTodoWindow([nextSeries], remaining);
      set((state) => ({
        series: state.series.map((item) => item.id === seriesId ? nextSeries : item),
        todos: [...remaining.map((todo) => todo.seriesId === seriesId && todo.date >= fromDate ? {
          ...todo, title: nextSeries.title, notes: nextSeries.notes, time: nextSeries.time,
          priority: nextSeries.priority, category: nextSeries.category, reminderEnabled: nextSeries.reminderEnabled,
        } : todo), ...generated], error: '',
      }));
    } catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  stopSeries: async (seriesId) => {
    const series = get().series.find((item) => item.id === seriesId);
    if (!series) return;
    try {
      await updateTodoSeries(seriesId, { active: false });
      const attached = get().todos.filter((todo) => todo.seriesId === seriesId);
      await Promise.all(attached.map((todo) => updateTodo(todo.id, { seriesId: null })));
      set((state) => ({
        series: state.series.map((item) => item.id === seriesId ? { ...item, active: false } : item),
        todos: state.todos.map((todo) => todo.seriesId === seriesId ? { ...todo, seriesId: null } : todo), error: '',
      }));
    } catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  reorderTodos: async (date, orderedIds) => {
    const dayTodos = get().todos.filter((todo) => todo.date === date);
    const reordered = orderedIds.map((id) => dayTodos.find((todo) => todo.id === id)).filter((todo): todo is Todo => Boolean(todo));
    try {
      await updateTodoPositions(reordered.map((todo) => todo.id));
      set((state) => ({ todos: state.todos.map((todo) => {
        if (todo.date !== date) return todo;
        const position = reordered.findIndex((item) => item.id === todo.id);
        return position < 0 ? todo : { ...todo, position };
      }), error: '' }));
    } catch (error) { set({ error: currentError(error) }); reportCloudError(error); throw error; }
  },
  clearError: () => set({ error: '' }),
}));

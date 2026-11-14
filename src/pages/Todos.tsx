import { useState } from 'react';
import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { ArrowDown, ArrowUp, Bell, BellOff, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Clipboard, Clock3, GripVertical, ListTodo, Pencil, Plus, Search, Trash2, Undo2, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, ProgressBar } from '../components/ui';
import { useTodoStore } from '../stores/todoStore';
import type { Todo, TodoPriority, TodoRecurrence } from '../types';
import { getTodayStr } from '../utils/helpers';
import { getTodoBestDay, getTodoDayStats, getTodoHistory, getTodoStreak } from '../utils/todoStats';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Filter = 'all' | 'open' | 'done';
type TaskForm = { title: string; date: string; time: string; priority: TodoPriority; recurrence: TodoRecurrence | ''; weekdays: number[]; endsOn: string; reminderEnabled: boolean };
const emptyForm = (date: string): TaskForm => ({ title: '', date, time: '', priority: 'medium', recurrence: '', weekdays: [], endsOn: '', reminderEnabled: false });

const priorityStyles: Record<TodoPriority, string> = {
  low: 'bg-cat-blue/10 text-cat-blue',
  medium: 'bg-cat-amber/10 text-cat-amber',
  high: 'bg-accent-soft text-app-ink',
};

function localDateLabel(date: string) {
  return format(parseISO(date), 'EEE, d MMM');
}

function DayStrip({ selectedDate, onSelect, onDropDate }: { selectedDate: string; onSelect: (date: string) => void; onDropDate: (date: string) => void }) {
  const today = getTodayStr();
  const center = startOfDay(new Date());
  const dates = Array.from({ length: 15 }, (_, index) => addDays(center, index - 7));
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Choose a day">
      {dates.map((date) => {
        const value = format(date, 'yyyy-MM-dd');
        const active = selectedDate === value;
        return <button key={value} type="button" onClick={() => onSelect(value)} aria-pressed={active}
          onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDropDate(value); }}
          className={`flex min-w-14 flex-col items-center rounded-card px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? 'bg-accent-contrast text-white shadow-accent' : 'border border-app-border bg-app-card text-app-subtle hover:bg-app-muted'}`}>
          <span className={`text-[10px] font-semibold uppercase ${active ? 'text-white/80' : ''}`}>{format(date, 'EEE')}</span>
          <span className="mt-0.5 text-base font-bold tabular-nums">{format(date, 'd')}</span>
          <span className="mt-0.5 h-1 w-1 rounded-full" aria-hidden="true">{value === today ? '•' : ''}</span>
        </button>;
      })}
    </div>
  );
}

export default function Todos() {
  const { todos, series, addTodo, editTodo, editSeries, stopSeries, removeTodo, toggleTodo, addSubtask, editSubtask, removeSubtask, reorderTodos, reorderSubtasks, error, clearError } = useTodoStore();
  const today = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [form, setForm] = useState<TaskForm>(() => emptyForm(today));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [seriesEditChoice, setSeriesEditChoice] = useState(false);
  const [deleteChoiceTodo, setDeleteChoiceTodo] = useState<Todo | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [subtaskEditing, setSubtaskEditing] = useState<string | null>(null);
  const [subtaskText, setSubtaskText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Todo | null>(null);
  const [toast, setToast] = useState('');
  const [toastTimer, setToastTimer] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<string | null>(null);
  const [movingTodoId, setMovingTodoId] = useState<string | null>(null);
  const [historyDays, setHistoryDays] = useState<7 | 30>(7);

  const selectedTodos = todos.filter((todo) => todo.date === selectedDate).sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time) || a.position - b.position;
    if (a.time) return -1;
    if (b.time) return 1;
    return a.position - b.position || a.createdAt.localeCompare(b.createdAt);
  });
  const visibleTodos = selectedTodos.filter((todo) => {
    if (filter === 'open' && todo.completedAt) return false;
    if (filter === 'done' && !todo.completedAt) return false;
    const query = search.trim().toLocaleLowerCase();
    return !query || `${todo.title} ${todo.notes} ${todo.category ?? ''}`.toLocaleLowerCase().includes(query);
  });
  const earlierTodos = todos.filter((todo) => todo.date < today && !todo.completedAt).sort((a, b) => a.date.localeCompare(b.date));
  const selectedStats = getTodoDayStats(todos, selectedDate);
  const history = getTodoHistory(todos, historyDays, today);
  const streak = getTodoStreak(todos, today);
  const bestDay = getTodoBestDay(todos);

  const showMessage = (message: string) => {
    setToast(message);
    if (toastTimer) window.clearTimeout(toastTimer);
    setToastTimer(window.setTimeout(() => setToast(''), 4500));
  };

  const openNewForm = (date = selectedDate) => {
    clearError(); setFormError(''); setMoreOptionsOpen(false); setEditingId(null); setForm(emptyForm(date)); setFormOpen(true);
  };

  const openEditForm = (todo: Todo) => {
    clearError(); setFormError(''); setMoreOptionsOpen(false); setEditingId(todo.id);
    const recurrence = series.find((item) => item.id === todo.seriesId);
    setForm({ title: todo.title, date: todo.date, time: todo.time?.slice(0, 5) ?? '', priority: todo.priority, recurrence: recurrence?.recurrence ?? '', weekdays: recurrence?.weekdays ?? [], endsOn: recurrence?.endsOn ?? '', reminderEnabled: todo.reminderEnabled });
    setFormOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (editingId && todos.find((todo) => todo.id === editingId)?.seriesId) { setSeriesEditChoice(true); return; }
    await saveForm(false);
  };

  const saveForm = async (applyToSeries: boolean) => {
    if (!form.title.trim()) return;
    setSaving(true); clearError(); setFormError('');
    try {
      if (form.recurrence === 'weekly' && form.weekdays.length === 0) throw new Error('Choose at least one weekday for a weekly task.');
      if (editingId) {
        const task = todos.find((todo) => todo.id === editingId);
        if (applyToSeries && task?.seriesId && task.date !== form.date) throw new Error('Changing a repeating task’s date applies to this occurrence only. Choose “This task only” to move it.');
        const values = { title: form.title.trim(), date: form.date, time: form.time || null, priority: form.priority, reminderEnabled: form.reminderEnabled };
        if (applyToSeries && task?.seriesId) {
          const currentSeries = series.find((item) => item.id === task.seriesId);
          if (currentSeries) await editSeries(currentSeries.id, { title: values.title, time: values.time, priority: values.priority, reminderEnabled: values.reminderEnabled, recurrence: form.recurrence || currentSeries.recurrence, weekdays: form.weekdays, endsOn: form.endsOn || null }, task.date);
        } else await editTodo(editingId, { ...values, seriesId: task?.seriesId ? null : undefined });
      } else {
        await addTodo({ title: form.title, date: form.date, time: form.time || null, priority: form.priority, recurrence: form.recurrence || null, weekdays: form.weekdays, endsOn: form.endsOn || null, reminderEnabled: form.reminderEnabled });
      }
      setFormOpen(false); setSeriesEditChoice(false); setSelectedDate(form.date); showMessage(editingId ? 'Task updated.' : 'Task added.');
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Could not save this task. Please try again.'); }
    finally { setSaving(false); }
  };

  const quickAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    try { await addTodo({ title: quickTitle, date: selectedDate }); setQuickTitle(''); showMessage('Task added.'); }
    catch { /* Store exposes the error in the page. */ }
  };

  const askDelete = (todo: Todo) => {
    if (todo.seriesId) { setDeleteChoiceTodo(todo); return; }
    queueDelete(todo);
  };

  const queueDelete = (todo: Todo) => {
    if (toastTimer) window.clearTimeout(toastTimer);
    setPendingDelete(todo); setToast('Task queued for deletion.');
    setToastTimer(window.setTimeout(() => {
      void removeTodo(todo.id).then(() => { setPendingDelete(null); setToast('Task deleted.'); setToastTimer(window.setTimeout(() => setToast(''), 3500)); })
        .catch(() => { setPendingDelete(null); setToast('Could not delete task.'); });
    }, 5000));
  };

  const undoDelete = () => {
    if (toastTimer) window.clearTimeout(toastTimer);
    setPendingDelete(null); setToast('Deletion undone.'); setToastTimer(window.setTimeout(() => setToast(''), 3500));
  };

  const stopRepeatingAndDelete = async () => {
    if (!deleteChoiceTodo?.seriesId) return;
    const task = deleteChoiceTodo;
    const seriesId = task.seriesId ?? '';
    if (!seriesId) return;
    setDeleteChoiceTodo(null);
    try { await stopSeries(seriesId); await removeTodo(task.id); showMessage('Repeating task stopped. Existing dates were kept as individual tasks.'); }
    catch { /* Store exposes the error in the page. */ }
  };

  const stopRepeatingFromEdit = async () => {
    const task = todos.find((todo) => todo.id === editingId);
    if (!task?.seriesId) return;
    try {
      await stopSeries(task.seriesId);
      await editTodo(task.id, { title: form.title.trim(), date: form.date, time: form.time || null, priority: form.priority, reminderEnabled: form.reminderEnabled });
      setSeriesEditChoice(false); setFormOpen(false); showMessage('Repeating stopped. Existing dates remain as individual tasks.');
    } catch { /* Store exposes the error in the page. */ }
  };

  const toggleReminder = async (todo: Todo) => {
    if (!todo.time) { showMessage('Add a time to this task before turning on a reminder.'); return; }
    if (!todo.reminderEnabled && 'Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') showMessage('Browser notifications are off. In-app reminders will still work while Life Tracker is open.');
      } catch { showMessage('Browser notifications are unavailable here. In-app reminders will still work while Life Tracker is open.'); }
    }
    try {
      await editTodo(todo.id, { reminderEnabled: !todo.reminderEnabled });
      showMessage(todo.reminderEnabled ? 'Reminder turned off.' : 'Reminder enabled while Life Tracker is open.');
    } catch { /* Store exposes the error in the page. */ }
  };

  const enableFormReminder = async (enabled: boolean) => {
    if (enabled && !form.time) { showMessage('Add a task time before enabling a reminder.'); return; }
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') showMessage('Browser notifications are off. You can still receive an in-app reminder while Life Tracker is open.');
      } catch { showMessage('Browser notifications are unavailable here. You can still receive an in-app reminder while Life Tracker is open.'); }
    }
    setForm((current) => ({ ...current, reminderEnabled: enabled }));
  };

  const copyList = async () => {
    const text = selectedTodos.map((todo) => `${todo.completedAt ? '[x]' : '[ ]'} ${todo.time ? `${todo.time.slice(0, 5)} ` : ''}${todo.title}`).join('\n');
    try { await navigator.clipboard.writeText(text || 'No tasks planned.'); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { showMessage('Clipboard access is unavailable in this browser.'); }
  };

  const changeDate = (delta: number) => setSelectedDate((date) => format(addDays(parseISO(date), delta), 'yyyy-MM-dd'));
  const selectedLabel = selectedDate === today ? 'Today' : selectedDate < today ? format(parseISO(selectedDate), 'EEEE, MMMM d') : format(parseISO(selectedDate), 'EEEE, MMMM d');

  const handleSubtaskAdd = async (todoId: string) => {
    if (!subtaskDraft.trim()) return;
    try { await addSubtask(todoId, subtaskDraft); setSubtaskDraft(''); setExpandedId(todoId); }
    catch { /* Store exposes the error in the page. */ }
  };

  const handleSubtaskEdit = async (todoId: string, subtaskId: string) => {
    if (!subtaskText.trim()) return;
    try { await editSubtask(todoId, subtaskId, { title: subtaskText.trim() }); setSubtaskEditing(null); }
    catch { /* Store exposes the error in the page. */ }
  };

  const moveTodoTo = async (todoId: string, date: string) => {
    const todo = todos.find((item) => item.id === todoId);
    if (!todo || todo.date === date) return;
    try {
      await editTodo(todoId, { date, position: todos.filter((item) => item.date === date).length, ...(todo.seriesId ? { seriesId: null } : {}) });
      setSelectedDate(date); setMovingTodoId(null); setDraggedTodoId(null);
      showMessage(todo.seriesId ? 'Moved this occurrence. Its repeating schedule continues on the other dates.' : 'Task moved.');
    } catch { /* Store exposes the error in the page. */ }
  };

  const moveTaskByDrop = (targetId: string) => {
    if (!draggedTodoId || draggedTodoId === targetId) return;
    const dragged = selectedTodos.find((todo) => todo.id === draggedTodoId);
    const target = selectedTodos.find((todo) => todo.id === targetId);
    if (!dragged || !target) return;
    if (dragged.time !== target.time) { showMessage('Tasks stay ordered by time. Reorder tasks in the same time group.'); return; }
    const group = selectedTodos.filter((todo) => todo.time === dragged.time);
    const ordered = group.map((todo) => todo.id);
    const from = ordered.indexOf(draggedTodoId);
    const to = ordered.indexOf(targetId);
    ordered.splice(from, 1); ordered.splice(to, 0, draggedTodoId);
    const merged = selectedTodos.map((todo) => todo.id);
    const groupPositions = merged.map((id, index) => group.some((item) => item.id === id) ? index : -1).filter((index) => index >= 0);
    groupPositions.forEach((position, index) => { merged[position] = ordered[index]; });
    void reorderTodos(selectedDate, merged).catch(() => undefined);
    setDraggedTodoId(null);
  };

  const moveTaskByKeyboard = (todoId: string, direction: -1 | 1) => {
    const current = selectedTodos.find((todo) => todo.id === todoId);
    if (!current) return;
    const group = selectedTodos.filter((todo) => todo.time === current.time);
    const ordered = group.map((todo) => todo.id);
    const index = ordered.indexOf(todoId); const next = index + direction;
    if (next < 0 || next >= ordered.length) return;
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    const merged = selectedTodos.map((todo) => todo.id);
    const groupPositions = merged.map((id, position) => group.some((item) => item.id === id) ? position : -1).filter((position) => position >= 0);
    groupPositions.forEach((position, groupIndex) => { merged[position] = ordered[groupIndex]; });
    void reorderTodos(selectedDate, merged).catch(() => undefined);
  };

  const moveSubtask = (todo: Todo, subtaskId: string, direction: -1 | 1) => {
    const ids = todo.subtasks.slice().sort((a, b) => a.position - b.position).map((item) => item.id);
    const index = ids.indexOf(subtaskId); const next = index + direction;
    if (next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next], ids[index]];
    void reorderSubtasks(todo.id, ids).catch(() => undefined);
  };

  const changeWeekday = (weekday: number) => setForm((current) => ({
    ...current,
    weekdays: current.weekdays.includes(weekday) ? current.weekdays.filter((day) => day !== weekday) : [...current.weekdays, weekday].sort((a, b) => a - b),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-4 sm:space-y-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-subtle">Plan your day</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-app-ink sm:text-3xl">To-Do</h1>
          <p className="mt-1 text-sm text-app-subtle">A clear next step, one task at a time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button onClick={() => openNewForm()} className="hidden sm:inline-flex"><Plus size={18} />Add task</Button>
          <Button onClick={() => void copyList()} variant="secondary"><Clipboard size={16} />{copied ? 'Copied' : `Copy ${selectedDate === today ? 'today’s' : 'selected day’s'} list`}</Button>
        </div>
      </header>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-app-ink">{selectedLabel}</h2>
            <p className="text-sm text-app-subtle">{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex gap-1">
            <button type="button" aria-label="Previous day" onClick={() => changeDate(-1)} className="rounded-xl p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ChevronLeft size={20} /></button>
            <button type="button" aria-label="Next day" onClick={() => changeDate(1)} className="rounded-xl p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ChevronRight size={20} /></button>
          </div>
        </div>
        <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} onDropDate={(date) => { if (draggedTodoId) void moveTodoTo(draggedTodoId, date); }} />
      </Card>

      <form onSubmit={(event) => void quickAdd(event)} className="hidden gap-2 sm:flex">
        <label className="sr-only" htmlFor="quick-todo">Quick add a task</label>
        <Input id="quick-todo" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="Add a task and press Enter…" className="min-h-12" />
        <Button type="submit" disabled={!quickTitle.trim()} className="min-h-12 px-5"><Plus size={18} />Add</Button>
      </form>

      {earlierTodos.length > 0 && (
        <Card className="border-cat-amber/25 bg-cat-amber/5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h2 className="font-bold text-app-ink">From earlier</h2><p className="text-xs text-app-subtle">Unfinished tasks stay on their original date until you move them.</p></div>
            <Badge variant="amber">{earlierTodos.length}</Badge>
          </div>
          <ul className="space-y-2">
            {earlierTodos.map((todo) => <li key={todo.id} className="flex items-center justify-between gap-3 rounded-card border border-app-border bg-app-card px-3 py-2.5">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-app-ink">{todo.title}</p><p className="text-xs text-app-subtle">{localDateLabel(todo.date)}</p></div>
              <Button size="sm" variant="secondary" onClick={() => { void editTodo(todo.id, { date: today }).then(() => showMessage('Moved to today.')).catch(() => undefined); }}>Move to today</Button>
            </li>)}
          </ul>
        </Card>
      )}

      <section aria-label="Task progress" className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-4 p-4 sm:p-5">
          <div role="progressbar" aria-label={`${selectedLabel} tasks completed`} aria-valuenow={selectedStats.percent} aria-valuemin={0} aria-valuemax={100}
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(var(--color-accent) ${selectedStats.percent * 3.6}deg, var(--app-muted) 0deg)` }}>
            <div className="flex h-[3.75rem] w-[3.75rem] flex-col items-center justify-center rounded-full bg-app-card"><span className="text-lg font-bold tabular-nums text-app-ink">{selectedStats.percent}%</span></div>
          </div>
          <div><p className="text-sm font-semibold text-app-subtle">Day progress</p><p className="mt-1 text-xl font-bold tabular-nums text-app-ink">{selectedStats.completed}/{selectedStats.total}</p><p className="text-xs text-app-subtle">tasks completed</p></div>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-app-subtle">Current streak</p><p className="mt-3 text-3xl font-bold tabular-nums text-app-ink">{streak}<span className="ml-1 text-base font-semibold text-app-subtle">days</span></p><p className="mt-1 text-xs text-app-subtle">Full planned days completed</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-app-subtle">Best day</p><p className="mt-3 text-xl font-bold text-app-ink">{bestDay ? localDateLabel(bestDay.date) : '—'}</p><p className="mt-1 text-xs text-app-subtle">{bestDay ? `${bestDay.percent}% completed · ${bestDay.completed}/${bestDay.total} tasks` : 'Add tasks to see your best day'}</p>
        </Card>
        <Card className="min-w-0 p-4 sm:p-5 sm:col-span-2 xl:col-span-1">
          <div className="mb-2 flex items-center justify-between gap-2"><div><h2 className="font-bold text-app-ink">Completion trend</h2><p className="text-xs text-app-subtle">Percent of tasks completed</p></div><div className="flex rounded-full bg-app-muted p-0.5" aria-label="Choose chart range">{([7, 30] as const).map((days) => <button key={days} type="button" aria-pressed={historyDays === days} onClick={() => setHistoryDays(days)} className={`rounded-full px-2 py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${historyDays === days ? 'bg-app-card text-app-ink shadow-sm' : 'text-app-subtle'}`}>{days}d</button>)}</div></div>
          <ResponsiveContainer width="100%" height={142}>
            <BarChart data={history} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-app-border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" interval={historyDays === 30 ? 4 : 0} tick={{ fill: 'var(--color-app-subtle)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-app-subtle)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'var(--color-app-muted)' }} contentStyle={{ backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 'var(--radius-card)', color: 'var(--app-ink)' }} formatter={(value) => [`${value}%`, 'Done']} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''} />
              <Bar dataKey="percent" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 space-y-4">
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2" aria-label="Filter tasks">
                {(['all', 'open', 'done'] as Filter[]).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item}
                  className={`rounded-full px-3.5 py-2 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${filter === item ? 'bg-accent-contrast text-white' : 'bg-app-muted text-app-subtle hover:text-app-ink'}`}>{item === 'done' ? 'Done' : item === 'open' ? 'Open' : 'All'}</button>)}
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle" />
                  <label className="sr-only" htmlFor="todo-search">Search tasks</label>
                  <input id="todo-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="min-h-10 w-full rounded-card border border-app-border bg-app-card pl-9 pr-3 text-sm text-app-ink placeholder:text-app-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
                </div>
              </div>
            </div>
          </Card>

          {visibleTodos.length ? <ul className="space-y-3">
            {visibleTodos.map((todo) => {
              const doneCount = todo.subtasks.filter((item) => item.completed).length;
              const progress = todo.subtasks.length ? Math.round((doneCount / todo.subtasks.length) * 100) : 0;
              const expanded = expandedId === todo.id;
              const deletedPending = pendingDelete?.id === todo.id;
              return <li key={todo.id} className={deletedPending ? 'opacity-40' : ''} onDragOver={(event) => { if (draggedTodoId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); moveTaskByDrop(todo.id); }}>
                <Card className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <button type="button" aria-label={todo.completedAt ? `Mark ${todo.title} as open` : `Complete ${todo.title}`} aria-pressed={Boolean(todo.completedAt)} onClick={() => { void toggleTodo(todo.id).catch(() => undefined); }}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${todo.completedAt ? 'border-cat-green bg-cat-green text-white' : 'border-app-border hover:border-accent'}`}>
                      {todo.completedAt && <Check size={14} strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`break-words text-base font-bold ${todo.completedAt ? 'text-app-subtle line-through' : 'text-app-ink'}`}>{todo.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${priorityStyles[todo.priority]}`}>{todo.priority}</span>
                        {todo.category && <Badge variant="blue">{todo.category}</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-subtle">
                        {todo.time && <span className="inline-flex items-center gap-1"><Clock3 size={13} />{todo.time.slice(0, 5)}</span>}
                        <span>Created {localDateLabel(format(parseISO(todo.createdAt), 'yyyy-MM-dd'))}</span>
                        {todo.seriesId && <span>Repeats</span>}
                      </div>
                      {todo.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-app-subtle">{todo.notes}</p>}
                      {todo.subtasks.length > 0 && <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs"><span className="font-medium text-app-subtle">Subtasks · {doneCount}/{todo.subtasks.length}</span><span className="font-semibold text-app-subtle">{progress}%</span></div>
                        <ProgressBar value={progress} color="red" size="sm" showLabel={false} />
                      </div>}
                    </div>
                    <div className="flex max-w-32 shrink-0 flex-wrap items-center justify-end gap-0.5 sm:max-w-none sm:flex-nowrap">
                      <button type="button" draggable aria-label={`Drag to reorder ${todo.title}`} onDragStart={(event) => { setDraggedTodoId(todo.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', todo.id); }} onDragEnd={() => setDraggedTodoId(null)} className="hidden rounded-xl p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:block"><GripVertical size={16} /></button>
                      <div className="flex flex-col"><button type="button" aria-label={`Move ${todo.title} earlier`} onClick={() => moveTaskByKeyboard(todo.id, -1)} className="rounded p-0.5 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ArrowUp size={13} /></button><button type="button" aria-label={`Move ${todo.title} later`} onClick={() => moveTaskByKeyboard(todo.id, 1)} className="rounded p-0.5 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ArrowDown size={13} /></button></div>
                      <button type="button" aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} subtasks for ${todo.title}, ${doneCount} of ${todo.subtasks.length} complete`} onClick={() => setExpandedId(expanded ? null : todo.id)} className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold tabular-nums text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ListTodo size={17} /><span>{doneCount}/{todo.subtasks.length}</span></button>
                      <button type="button" aria-label={`Move ${todo.title} to another date`} aria-expanded={movingTodoId === todo.id} onClick={() => setMovingTodoId(movingTodoId === todo.id ? null : todo.id)} className="rounded-xl p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Calendar size={16} /></button>
                      <button type="button" aria-label={`${todo.reminderEnabled ? 'Turn off' : 'Turn on'} reminder for ${todo.title}`} aria-pressed={todo.reminderEnabled} onClick={() => void toggleReminder(todo)} className={`rounded-xl p-2 hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${todo.reminderEnabled ? 'text-app-ink' : 'text-app-subtle'}`}>{todo.reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}</button>
                      <button type="button" aria-label={`Edit ${todo.title}`} onClick={() => openEditForm(todo)} className="rounded-xl p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Pencil size={16} /></button>
                      <button type="button" aria-label={`Delete ${todo.title}`} onClick={() => askDelete(todo)} className="rounded-xl p-2 text-app-subtle hover:bg-app-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {movingTodoId === todo.id && <form className="ml-9 mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem('move-date') as HTMLInputElement | null; if (input?.value) void moveTodoTo(todo.id, input.value); }}><label className="text-xs font-semibold text-app-ink" htmlFor={`move-date-${todo.id}`}>Move to date</label><input id={`move-date-${todo.id}`} name="move-date" type="date" defaultValue={todo.date} className="min-h-9 rounded-card border border-app-border bg-app-card px-2 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent" /><Button size="sm" type="submit">Move</Button></form>}
                  {expanded && <div className="ml-9 mt-4 space-y-3 border-t border-app-border pt-3">
                    <ul className="space-y-2">{todo.subtasks.slice().sort((a, b) => a.position - b.position).map((subtask, subtaskIndex, subtaskList) => <li key={subtask.id} className="flex items-center gap-1" onDragOver={(event) => { if (draggedSubtaskId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (!draggedSubtaskId || draggedSubtaskId === subtask.id) return; const ids = subtaskList.map((item) => item.id); const from = ids.indexOf(draggedSubtaskId); const to = ids.indexOf(subtask.id); if (from < 0) return; ids.splice(from, 1); ids.splice(to, 0, draggedSubtaskId); void reorderSubtasks(todo.id, ids).catch(() => undefined); setDraggedSubtaskId(null); }}>
                      <button type="button" draggable aria-label={`Drag to reorder subtask ${subtask.title}`} onDragStart={(event) => { setDraggedSubtaskId(subtask.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', subtask.id); }} onDragEnd={() => setDraggedSubtaskId(null)} className="rounded p-1 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><GripVertical size={14} /></button>
                      <input type="checkbox" checked={subtask.completed} onChange={(event) => { void editSubtask(todo.id, subtask.id, { completed: event.target.checked }).catch(() => undefined); }} aria-label={`Mark subtask ${subtask.title} ${subtask.completed ? 'incomplete' : 'complete'}`} className="h-4 w-4 rounded border-app-border accent-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
                      {subtaskEditing === subtask.id ? <form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); void handleSubtaskEdit(todo.id, subtask.id); }}><input autoFocus value={subtaskText} onChange={(event) => setSubtaskText(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-card px-2 py-1 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent" /><button className="text-xs font-semibold text-app-ink">Save</button></form> : <button type="button" aria-label={`Edit subtask title ${subtask.title}`} onClick={() => { setSubtaskEditing(subtask.id); setSubtaskText(subtask.title); }} className={`min-w-0 flex-1 text-left text-sm hover:underline decoration-dotted ${subtask.completed ? 'text-app-subtle line-through' : 'text-app-ink'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>{subtask.title}</button>}
                      <button type="button" aria-label={`Delete subtask ${subtask.title}`} onClick={() => { void removeSubtask(todo.id, subtask.id).catch(() => undefined); }} className="rounded-lg p-1.5 text-app-subtle hover:bg-app-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={15} /></button>
                      <button type="button" aria-label={`Move subtask ${subtask.title} up`} disabled={subtaskIndex === 0} onClick={() => moveSubtask(todo, subtask.id, -1)} className="rounded p-1 text-app-subtle hover:bg-app-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ArrowUp size={13} /></button><button type="button" aria-label={`Move subtask ${subtask.title} down`} disabled={subtaskIndex === subtaskList.length - 1} onClick={() => moveSubtask(todo, subtask.id, 1)} className="rounded p-1 text-app-subtle hover:bg-app-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ArrowDown size={13} /></button>
                    </li>)}</ul>
                    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void handleSubtaskAdd(todo.id); }}><label className="sr-only" htmlFor={`subtask-${todo.id}`}>Add a subtask</label><input id={`subtask-${todo.id}`} value={subtaskDraft} onChange={(event) => setSubtaskDraft(event.target.value)} placeholder="Add a subtask" className="min-h-9 min-w-0 flex-1 rounded-card border border-app-border bg-app-card px-3 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent" /><Button size="sm" type="submit" disabled={!subtaskDraft.trim()}><Plus size={15} />Add</Button></form>
                  </div>}
                </Card>
              </li>;
            })}
          </ul> : <Card><EmptyState icon={ListTodo} title={search || filter !== 'all' ? 'No matching tasks' : 'A little room to begin'} description={search || filter !== 'all' ? 'Try changing the search or filters.' : `You have no tasks for ${selectedDate === today ? 'today' : format(parseISO(selectedDate), 'MMM d')}. Add one when you’re ready.`} /></Card>}
        </section>

        <aside className="hidden space-y-4 xl:block">
          <Card className="space-y-3">
            <h2 className="font-bold text-app-ink">Planning tip</h2>
            <p className="text-sm leading-6 text-app-subtle">Choose a date to plan ahead. Unfinished tasks stay on their original day until you move them.</p>
            {selectedDate !== today && <Button variant="secondary" className="w-full" onClick={() => setSelectedDate(today)}>Back to today</Button>}
          </Card>
        </aside>
      </div>

      {error && <p role="alert" className="rounded-card border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-app-ink">{error}</p>}

      <button type="button" aria-label="Add a task" onClick={() => openNewForm()} className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent-contrast text-white shadow-accent transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg sm:hidden"><Plus size={24} /></button>

      {toast && <div role="status" className="fixed bottom-24 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-4 rounded-card border border-app-border bg-app-card px-4 py-3 text-sm font-medium text-app-ink shadow-card-hover sm:bottom-6">
        <span>{toast}</span>{pendingDelete && <button type="button" onClick={undoDelete} className="inline-flex items-center gap-1 font-bold text-app-ink underline decoration-accent decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Undo2 size={15} />Undo</button>}
      </div>}

      {formOpen && <div className="fixed inset-0 z-40 flex items-end justify-center bg-neutral-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="todo-form-title" className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.5rem] border border-app-border bg-app-card shadow-card-hover sm:max-w-xl sm:rounded-card-lg">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-app-border px-5 py-4 sm:px-6"><div><h2 id="todo-form-title" className="text-lg font-bold text-app-ink">{editingId ? 'Edit task' : 'Add a task'}</h2><p className="text-sm text-app-subtle">Keep it clear and easy to act on.</p></div><button type="button" aria-label="Close task form" onClick={() => setFormOpen(false)} className="rounded-xl p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={20} /></button></div>
          <form onSubmit={(event) => void handleSave(event)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              <Input label="Task" autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What needs to get done?" required />
              <div>
                <Input label="Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
                <div className="mt-2 flex gap-2" role="group" aria-label="Quick date choices">
                  {[{ label: 'Today', date: today }, { label: 'Tomorrow', date: format(addDays(parseISO(today), 1), 'yyyy-MM-dd') }].map((choice) => <button key={choice.label} type="button" aria-pressed={form.date === choice.date} onClick={() => setForm({ ...form, date: choice.date })} className={`rounded-full px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${form.date === choice.date ? 'bg-accent-contrast text-white' : 'bg-app-muted text-app-subtle hover:text-app-ink'}`}>{choice.label}</button>)}
                </div>
              </div>
              <Input label="Time (optional)" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value, reminderEnabled: event.target.value ? form.reminderEnabled : false })} />
              <div>
                <button type="button" aria-expanded={moreOptionsOpen} onClick={() => setMoreOptionsOpen((open) => !open)} className="flex min-h-11 w-full items-center justify-between rounded-card border border-app-border bg-app-muted/50 px-4 text-sm font-semibold text-app-ink hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span>More options</span><ChevronDown size={17} className={`transition-transform motion-reduce:transition-none ${moreOptionsOpen ? 'rotate-180' : ''}`} /></button>
                {moreOptionsOpen && <div className="mt-3 space-y-4 rounded-card border border-app-border p-3">
                  <div><label htmlFor="todo-priority" className="mb-1.5 block text-sm font-semibold text-app-ink">Priority</label><select id="todo-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TodoPriority })} className="min-h-11 w-full rounded-card border border-app-border bg-app-card px-3 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                  {(!editingId || todos.find((todo) => todo.id === editingId)?.seriesId) && <div className="space-y-3"><div><label htmlFor="todo-repeat" className="mb-1.5 block text-sm font-semibold text-app-ink">Repeat</label><select id="todo-repeat" value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value as TodoRecurrence | '' })} className="min-h-10 w-full rounded-card border border-app-border bg-app-card px-3 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"><option value="">Does not repeat</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
                    {form.recurrence === 'weekly' && <fieldset><legend className="mb-2 text-xs font-semibold text-app-ink">Repeat on</legend><div className="flex flex-wrap gap-1.5">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => { const day = index + 1; const active = form.weekdays.includes(day); return <button key={label} type="button" aria-pressed={active} onClick={() => changeWeekday(day)} className={`rounded-full px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? 'bg-accent-contrast text-white' : 'bg-app-card text-app-subtle ring-1 ring-app-border'}`}>{label}</button>; })}</div></fieldset>}
                    {form.recurrence && <Input label="Stop repeating after (optional)" type="date" min={form.date} value={form.endsOn} onChange={(event) => setForm({ ...form, endsOn: event.target.value })} />}
                  </div>}
                  {form.time && <label className="flex cursor-pointer items-start gap-3 rounded-card border border-app-border p-3"><input type="checkbox" checked={form.reminderEnabled} onChange={(event) => void enableFormReminder(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /><span><span className="block text-sm font-semibold text-app-ink">Remind me at this time</span><span className="block text-xs text-app-subtle">Notifications appear while Life Tracker is open.</span></span></label>}
                </div>}
              </div>
              {(formError || error) && <p role="alert" className="text-sm text-app-ink">{formError || error}</p>}
            </div>
            <div className="sticky bottom-0 flex shrink-0 justify-end gap-2 border-t border-app-border bg-app-card px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6 sm:pb-4"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !form.title.trim()}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add task'}</Button></div>
          </form>
        </section>
      </div>}

      {seriesEditChoice && <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="series-edit-title" className="w-full rounded-t-[1.5rem] border border-app-border bg-app-card p-5 shadow-card-hover sm:max-w-md sm:rounded-card-lg">
          <h2 id="series-edit-title" className="text-lg font-bold text-app-ink">Update repeating task</h2><p className="mt-1 text-sm text-app-subtle">Choose which dates should receive these changes.</p>
          <div className="mt-5 grid gap-2"><Button onClick={() => void saveForm(false)}>This task only</Button><Button variant="secondary" onClick={() => void saveForm(true)}>This and future tasks</Button><Button variant="danger" onClick={() => void stopRepeatingFromEdit()}>Stop repeating</Button><Button variant="ghost" onClick={() => setSeriesEditChoice(false)}>Cancel</Button></div>
        </section>
      </div>}

      {deleteChoiceTodo && <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="series-delete-title" className="w-full rounded-t-[1.5rem] border border-app-border bg-app-card p-5 shadow-card-hover sm:max-w-md sm:rounded-card-lg">
          <h2 id="series-delete-title" className="text-lg font-bold text-app-ink">Delete repeating task</h2><p className="mt-1 text-sm text-app-subtle">Already-created future dates will stay in your plan as individual tasks.</p>
          <div className="mt-5 grid gap-2"><Button variant="secondary" onClick={() => { const task = deleteChoiceTodo; setDeleteChoiceTodo(null); queueDelete(task); }}>This task only</Button><Button variant="danger" onClick={() => void stopRepeatingAndDelete()}>Stop repeating</Button><Button variant="ghost" onClick={() => setDeleteChoiceTodo(null)}>Cancel</Button></div>
        </section>
      </div>}
    </div>
  );
}

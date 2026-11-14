import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { useTodoStore } from '../../stores/todoStore';
import { useFinanceStore } from '../../stores/financeStore';
import { getTodayStr } from '../../utils/helpers';

export function TodoReminderMonitor() {
  const todos = useTodoStore((state) => state.todos);
  const loans = useFinanceStore((state) => state.loans);
  const loanPayments = useFinanceStore((state) => state.loanPayments);
  const [reminder, setReminder] = useState<{ id: string; title: string; to: '/todos' | '/finances' } | null>(null);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const today = getTodayStr();
      const time = format(now, 'HH:mm');
      for (const todo of todos) {
        if (!todo.reminderEnabled || todo.completedAt || todo.date !== today || todo.time?.slice(0, 5) !== time) continue;
        const key = `life-tracker-reminder:${todo.id}:${today}:${time}`;
        if (sessionStorage.getItem(key)) continue;
        sessionStorage.setItem(key, 'shown');
        setReminder({ id: todo.id, title: todo.title, to: '/todos' });
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Life Tracker reminder', { body: todo.title, tag: key });
        }
      }
    };
    checkReminders();
    const interval = window.setInterval(checkReminders, 15_000);
    return () => window.clearInterval(interval);
  }, [todos]);

  useEffect(() => {
    const checkLoanDueDates = () => {
      const today = getTodayStr();
      for (const loan of loans) {
        const paid = loanPayments.filter((payment) => payment.loanId === loan.id).reduce((sum, payment) => sum + payment.amount, 0);
        if (loan.dueDate !== today || loan.amount - paid <= 0) continue;
        const key = `life-tracker-loan-reminder:${loan.id}:${today}`;
        if (sessionStorage.getItem(key)) continue;
        sessionStorage.setItem(key, 'shown');
        const title = `Loan repayment due: ${loan.person}`;
        setReminder({ id: loan.id, title, to: '/finances' });
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Life Tracker loan reminder', { body: title, tag: key });
      }
    };
    checkLoanDueDates();
    const interval = window.setInterval(checkLoanDueDates, 60_000);
    return () => window.clearInterval(interval);
  }, [loans, loanPayments]);

  if (!reminder) return null;
  return <div role="status" className="fixed bottom-24 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-card border border-app-border bg-app-card px-4 py-3 text-sm text-app-ink shadow-card-hover sm:bottom-6">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-app-ink"><Bell size={17} /></span>
    <Link to={reminder.to} className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="block text-xs font-semibold text-app-subtle">Reminder</span><span className="block truncate font-bold">{reminder.title}</span></Link>
    <button type="button" aria-label="Dismiss reminder" onClick={() => setReminder(null)} className="rounded-lg p-2 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={16} /></button>
  </div>;
}

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue } from './authContext';
import { ensureRecurringFinanceWindow, ensureRecurringTodoWindow, fetchTrackerData } from '../lib/cloudData';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';
import { reportCloudError } from '../lib/cloudFeedback';
import { useHabitStore } from '../stores/habitStore';
import { useGoalStore } from '../stores/goalStore';
import { useMoodStore } from '../stores/moodStore';
import { useFitnessStore } from '../stores/fitnessStore';
import { useFinanceStore } from '../stores/financeStore';
import { useTodoStore } from '../stores/todoStore';

function clearTrackerState() {
  useHabitStore.setState({ habits: [] });
  useGoalStore.setState({ goals: [] });
  useMoodStore.setState({ entries: [] });
  useFitnessStore.setState({ workouts: [], dailyHealth: [] });
  useFinanceStore.setState({ transactions: [], wallets: [], transfers: [], loans: [], loanPayments: [], budgets: [], financeSettings: { currency: 'INR' as const, overallMonthlyBudget: null, keywordRules: [] }, recurringTransactionSeries: [], savingsGoals: [], savingsContributions: [], financeSchemaAvailable: true });
  useTodoStore.setState({ todos: [], series: [], error: '' });
}

function applyTrackerData(data: Awaited<ReturnType<typeof fetchTrackerData>>) {
  useHabitStore.setState({ habits: data.habits });
  useGoalStore.setState({ goals: data.goals });
  useMoodStore.setState({ entries: data.entries });
  useFitnessStore.setState({ workouts: data.workouts, dailyHealth: data.dailyHealth });
  useFinanceStore.getState().setData({
    transactions: data.transactions, wallets: data.wallets, transfers: data.transfers, loans: data.loans,
    loanPayments: data.loanPayments, budgets: data.budgets, financeSettings: data.financeSettings,
    recurringTransactionSeries: data.recurringTransactionSeries, savingsGoals: data.savingsGoals,
    savingsContributions: data.savingsContributions, financeSchemaAvailable: data.financeSchemaAvailable,
  });
  useTodoStore.getState().setData(data.todos, data.todoSeries);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let activeUserId: string | null = null;
    let request = 0;
    const initialize = async (session: Session | null) => {
      const nextId = session?.user.id ?? null;
      setUser(session?.user ?? null);
      if (!nextId) {
        activeUserId = null;
        clearTrackerState();
        setLoading(false);
        return;
      }
      if (nextId === activeUserId) return;
      activeUserId = nextId;
      const currentRequest = ++request;
      setLoading(true);
      clearTrackerState();
      try {
        const data = await fetchTrackerData();
        if (data.financeSchemaAvailable) {
          const generatedTransactions = await ensureRecurringFinanceWindow(data.recurringTransactionSeries, data.transactions);
          data.transactions.push(...generatedTransactions);
        }
        if (data.todoSeries.length) {
          const generatedTodos = await ensureRecurringTodoWindow(data.todoSeries, data.todos);
          data.todos.push(...generatedTodos);
        }
        if (currentRequest === request) applyTrackerData(data);
        if (currentRequest === request) setError('');
      } catch (loadError) {
        if (currentRequest === request) {
          const message = loadError instanceof Error ? loadError.message : 'Could not load your cloud data.';
          setError(message);
          reportCloudError(message);
        }
      } finally {
        if (currentRequest === request) setLoading(false);
      }
    };
    const client = requireSupabase();
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void initialize(session), 0);
    });
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message);
      return initialize(data.session);
    }).catch((sessionError: unknown) => setError(sessionError instanceof Error ? sessionError.message : 'Could not restore your session.'));
    return () => {
      request++;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, error,
    signIn: async (email, password) => {
      setError('');
      const { error: authError } = await requireSupabase().auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); throw authError; }
    },
    signInWithGoogle: async () => {
      setError('');
      const { error: authError } = await requireSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (authError) { setError(authError.message); throw authError; }
    },
    signUp: async (email, password) => {
      setError('');
      const { data, error: authError } = await requireSupabase().auth.signUp({ email, password });
      if (authError) { setError(authError.message); throw authError; }
      return Boolean(data.session);
    },
    signOut: async () => {
      setError('');
      const { error: authError } = await requireSupabase().auth.signOut();
      if (authError) { setError(authError.message); throw authError; }
    },
    clearError: () => setError(''),
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { useAuth } from '../auth/authContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Auth() {
  const { user, loading, error, signIn, signUp, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/';

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-sm text-neutral-500 dark:bg-black dark:text-neutral-400">Loading…</div>;
  if (user) return <Navigate to={returnTo} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage(''); clearError();
    try {
      if (mode === 'login') await signIn(email, password);
      else {
        const hasSession = await signUp(email, password);
        setMessage(hasSession ? 'Account created. You can start tracking now.' : 'Account created. Check your email to confirm your address, then sign in.');
        if (!hasSession) setMode('login');
      }
    } catch { /* Error is displayed from the auth provider. */ }
    finally { setBusy(false); }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 text-neutral-900 dark:bg-black dark:text-white">
      <div className="w-full max-w-md space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black"><Zap size={24} /></div>
          <div><h1 className="text-2xl font-bold">Life Tracker</h1><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Your personal life management dashboard</p></div>
        </div>
        <Card>
          {!isSupabaseConfigured ? (
            <div className="space-y-2"><h2 className="font-semibold">Supabase setup required</h2><p className="text-sm text-neutral-500 dark:text-neutral-400">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your local environment, then restart the app.</p></div>
          ) : (
            <>
              <div className="mb-5 flex gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
                {(['login', 'register'] as const).map((item) => <button key={item} onClick={() => { setMode(item); setMessage(''); clearError(); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize ${mode === item ? 'bg-white shadow-sm dark:bg-neutral-700' : 'text-neutral-500'}`}>{item === 'login' ? 'Sign in' : 'Create account'}</button>)}
              </div>
              <form onSubmit={submit} className="space-y-4">
                <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                <Input label="Password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
                {(error || message) && <p role="status" className={`text-sm ${error ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{error || message}</p>}
                <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>
              </form>
              <p className="mt-4 text-center text-xs text-neutral-500">Your tracker data is private to your account.</p>
            </>
          )}
        </Card>
        <p className="text-center text-sm text-neutral-500"><Link className="hover:text-neutral-900 dark:hover:text-white" to="/">Back to Life Tracker</Link></p>
      </div>
    </main>
  );
}

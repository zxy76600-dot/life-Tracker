import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Activity, CheckCircle2, Eye, EyeOff, HeartPulse, Wallet, Zap } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../auth/authContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Auth() {
  const { user, loading, error, signIn, signInWithGoogle, signUp, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    const url = new URL(window.location.href);
    const errorKeys = ['error', 'error_code', 'error_description'];
    const searchParams = new URLSearchParams(url.search);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const queryError = errorKeys.some((key) => searchParams.has(key));
    const hashError = errorKeys.some((key) => hashParams.has(key));
    if (!queryError && !hashError) return;

    const providerError = searchParams.get('error') ?? hashParams.get('error') ?? '';
    const description = searchParams.get('error_description') ?? hashParams.get('error_description') ?? '';
    const cancelled = /cancel|denied|access_denied/i.test(`${providerError} ${description}`);
    setMessage(cancelled
      ? 'Google sign-in was cancelled. You can try again whenever you’re ready.'
      : 'Google sign-in couldn’t be completed. Please try again.');

    for (const key of errorKeys) {
      searchParams.delete(key);
      hashParams.delete(key);
    }
    url.search = searchParams.toString();
    const remainingHash = hashParams.toString();
    url.hash = remainingHash ? `#${remainingHash}` : '';
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-app-bg text-sm text-app-subtle">Loading…</div>;
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

  const continueWithGoogle = async () => {
    setGoogleBusy(true); setMessage(''); clearError();
    try {
      await signInWithGoogle();
    } catch {
      setMessage('Google sign-in couldn’t be started. Please try again.');
      setGoogleBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-app-bg text-app-ink lg:grid-cols-2">
      <section className="relative isolate flex min-h-[152px] flex-col justify-center overflow-hidden bg-gradient-to-br from-app-ink via-cat-indigo/80 to-neutral-950 px-6 py-5 text-white sm:px-8 lg:min-h-screen lg:px-12 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-cat-indigo/30 blur-3xl" />
        <div className="relative z-10 mx-auto w-full max-w-xl lg:my-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-white/20 bg-accent text-white shadow-accent"><Zap size={23} aria-hidden="true" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Life Tracker</h1>
              <p className="mt-0.5 text-xs text-white/75 sm:text-sm">Make space for what matters.</p>
            </div>
          </div>

          <div className="mt-10 hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">A clearer view of your day</p>
            <h2 className="mt-3 max-w-md text-4xl font-semibold leading-tight tracking-tight">Small steps. A life that feels more in balance.</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-white/75">Bring your routines, wellbeing, and goals together in one calm space.</p>
          </div>

          <div className="mt-7 hidden gap-3 sm:grid-cols-3 lg:grid">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-medium text-white backdrop-blur-sm"><CheckCircle2 size={16} className="shrink-0 text-white/75" />Habits &amp; Goals</div>
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-medium text-white backdrop-blur-sm"><HeartPulse size={16} className="shrink-0 text-white/75" />Mood &amp; Fitness</div>
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-medium text-white backdrop-blur-sm"><Wallet size={16} className="shrink-0 text-white/75" />Finances</div>
          </div>

          <div aria-hidden="true" className="mt-10 hidden max-w-md rounded-card-lg border border-white/20 bg-white/10 p-4 shadow-2xl shadow-black/20 backdrop-blur-md lg:block">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">Your overview</p><p className="mt-1 text-sm font-semibold">A good day starts here</p></div>
              <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-white/40" /><span className="h-2 w-2 rounded-full bg-white/60" /><span className="h-2 w-2 rounded-full bg-white/80" /></div>
            </div>
            <div className="mt-4 grid grid-cols-[1.2fr_0.8fr] gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                <div className="flex items-center justify-between text-[11px]"><span className="text-white/75">Weekly habits</span><span className="font-semibold">4 of 5</span></div>
                <div className="mt-3 flex h-12 items-end gap-1.5">{[42, 67, 52, 82, 61, 92, 72].map((height, index) => <span key={index} className="flex-1 rounded-t-md bg-white/70" style={{ height: `${height}%` }} />)}</div>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-white/10 p-3">
                <span className="text-[11px] text-white/75">Today’s focus</span>
                <div className="mt-2 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15"><Activity size={15} /></span><span className="text-xs font-semibold">Keep going</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full w-2/3 rounded-full bg-white" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-152px)] items-center justify-center px-4 py-8 sm:px-8 lg:min-h-screen lg:px-10 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <p className="text-sm font-medium text-app-subtle">Your personal life management dashboard</p>
          </div>
          <div className="rounded-card-lg border border-app-border bg-app-card p-6 shadow-card-hover sm:p-8">
            {!isSupabaseConfigured ? (
              <div className="space-y-2">
                <h2 className="font-semibold">Supabase setup required</h2>
                <p className="text-sm leading-6 text-app-subtle">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your local environment, then restart the app.</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink">Life Tracker</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
                  <p className="mt-1 text-sm text-app-subtle">{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Start building a better picture of your days.'}</p>
                </div>

                <div role="group" aria-label="Account access" className="mb-6 grid grid-cols-2 rounded-xl bg-app-muted p-1">
                  {(['login', 'register'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={mode === item}
                      onClick={() => { setMode(item); setMessage(''); clearError(); }}
                      className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-muted ${mode === item ? 'bg-app-card text-app-ink shadow-card' : 'text-app-subtle hover:text-app-ink'}`}
                    >
                      {item === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                  ))}
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="auth-email" className="block text-sm font-semibold text-app-ink">Email address</label>
                    <input id="auth-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-card border border-app-border bg-app-card px-4 text-sm text-app-ink shadow-sm placeholder:text-app-subtle transition-colors motion-reduce:transition-none focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 focus-visible:ring-2 focus-visible:ring-accent" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="auth-password" className="block text-sm font-semibold text-app-ink">Password</label>
                    <div className="relative">
                      <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-card border border-app-border bg-app-card py-2.5 pl-4 pr-12 text-sm text-app-ink shadow-sm placeholder:text-app-subtle transition-colors motion-reduce:transition-none focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 focus-visible:ring-2 focus-visible:ring-accent" />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-app-subtle transition-colors motion-reduce:transition-none hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                        {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  {(error || message) && <p role={error ? 'alert' : 'status'} className={`rounded-xl px-3 py-2.5 text-sm leading-5 ${error ? 'bg-app-muted text-app-ink' : 'bg-cat-green/10 text-cat-green-ink'}`}>{message || error}</p>}
                  <Button type="submit" disabled={busy} size="lg" className="auth-submit-button w-full motion-reduce:transition-none focus-visible:ring-app-ink">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>
                </form>

                <div className="my-5 flex items-center gap-3 text-xs font-medium text-app-subtle"><span className="h-px flex-1 bg-app-border" /><span>or</span><span className="h-px flex-1 bg-app-border" /></div>
                <button type="button" disabled={busy || googleBusy} onClick={() => void continueWithGoogle()} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-card border border-app-border bg-app-card px-4 py-3 text-sm font-semibold text-app-ink shadow-sm transition-colors motion-reduce:transition-none hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg disabled:pointer-events-none disabled:opacity-60">
                  <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
                    <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
                    <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
                    <path fill="#FBBC05" d="M12.8 27.7a12 12 0 0 1 0-7.4v-5.2H5.9a20 20 0 0 0 0 17.8l6.9-5.2Z" />
                    <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.9 15.1l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z" />
                  </svg>
                  {googleBusy ? 'Redirecting to Google…' : 'Continue with Google'}
                </button>
                <p className="mt-5 text-center text-xs leading-5 text-app-subtle">
                  By continuing, you agree to our <Link className="font-semibold text-app-ink underline underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to="/terms">Terms</Link> and <Link className="font-semibold text-app-ink underline underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to="/privacy">Privacy Policy</Link>.
                </p>
              </>
            )}
          </div>
          <p className="mt-5 text-center text-sm text-app-subtle"><Link className="rounded-sm hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to="/">Back to Life Tracker</Link></p>
        </div>
      </section>
    </main>
  );
}

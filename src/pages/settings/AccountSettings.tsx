import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, LogOut, Save, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { requireSupabase } from '../../lib/supabase';
import { Card, Button } from '../../components/ui';

const avatarColors = [
  { id: 'coral', label: 'Coral', color: '#ff5a5f' },
  { id: 'indigo', label: 'Indigo', color: '#5b5bf0' },
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'teal', label: 'Teal', color: '#14b8a6' },
  { id: 'amber', label: 'Amber', color: '#f59e0b' },
  { id: 'green', label: 'Green', color: '#22a06b' },
];

export default function AccountSettings() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState('coral');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : '');
    const savedColor = user?.user_metadata?.avatar_color;
    setAvatarColor(avatarColors.some((item) => item.id === savedColor) ? savedColor : 'coral');
  }, [user]);

  const providers = [...new Set((user?.identities ?? []).map((identity) => identity.provider))];
  const hasEmailPassword = providers.includes('email') || (user?.app_metadata?.providers ?? []).includes('email');

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    if (name.trim().length > 40) { setBusy(false); setError('Display name must be 40 characters or fewer.'); return; }
    try {
      const { error: updateError } = await requireSupabase().auth.updateUser({ data: { display_name: name.trim(), avatar_color: avatarColor } });
      if (updateError) throw updateError;
      await refreshUser();
      setMessage('Saved');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your profile.'); }
    finally { setBusy(false); }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error: updateError } = await requireSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(''); setConfirmPassword(''); setMessage('Password updated.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your password.'); }
    finally { setBusy(false); }
  };

  const signOutEverywhere = async () => {
    if (!window.confirm('Sign out of Life Tracker on all devices?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: signOutError } = await requireSupabase().auth.signOut({ scope: 'global' });
      if (signOutError) throw signOutError;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign out of all devices.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <Card>
      <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-accent/10 p-2.5 text-accent"><UserRound size={20} /></span><div><h2 className="font-semibold text-app-ink">Profile</h2><p className="text-sm text-app-subtle">Choose how your account appears in Life Tracker.</p></div></div>
      <form onSubmit={(event) => void saveProfile(event)} className="space-y-4">
        <label className="block text-sm font-medium text-app-ink" htmlFor="display-name">Display name
          <input id="display-name" autoComplete="name" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-app-border bg-app-muted px-3 text-app-ink outline-none focus-visible:ring-2 focus-visible:ring-accent" />
        </label>
        <fieldset><legend className="mb-2 text-sm font-medium text-app-ink">Avatar color</legend><div className="flex flex-wrap gap-3">{avatarColors.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-app-subtle focus-within:ring-2 focus-within:ring-accent"><input type="radio" name="avatar-color" value={item.id} checked={avatarColor === item.id} onChange={() => setAvatarColor(item.id)} className="sr-only" /><span className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-app-card ${avatarColor === item.id ? 'ring-2 ring-app-ink' : ''}`} style={{ backgroundColor: item.color }} /><span>{item.label}</span></label>)}</div></fieldset>
        <Button type="submit" variant="primary" disabled={busy}><Save size={16} /> Save profile</Button>
      </form>
    </Card>

    <Card>
      <h2 className="mb-3 font-semibold text-app-ink">Sign-in details</h2>
      <dl className="space-y-3 text-sm"><div><dt className="text-app-subtle">Email</dt><dd className="break-all font-medium text-app-ink">{user?.email || '—'}</dd></div><div><dt className="text-app-subtle">Linked sign-in methods</dt><dd className="mt-1 flex flex-wrap gap-2">{providers.length ? providers.map((provider) => <span key={provider} className="rounded-full bg-app-muted px-2.5 py-1 text-app-ink">{provider === 'email' ? 'Email and password' : provider}</span>) : <span className="text-app-ink">No linked methods found</span>}</dd></div></dl>
    </Card>

    {hasEmailPassword ? <Card><div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-app-muted p-2.5 text-app-ink"><KeyRound size={19} /></span><div><h2 className="font-semibold text-app-ink">Change password</h2><p className="text-sm text-app-subtle">Use at least 8 characters.</p></div></div><form onSubmit={(event) => void changePassword(event)} className="space-y-3"><label className="block text-sm font-medium text-app-ink" htmlFor="new-password">New password<input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-app-border bg-app-muted px-3 text-app-ink outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label><label className="block text-sm font-medium text-app-ink" htmlFor="confirm-password">Confirm password<input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-app-border bg-app-muted px-3 text-app-ink outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label><Button type="submit" variant="secondary" disabled={busy}>Update password</Button></form></Card> : <Card><h2 className="font-semibold text-app-ink">Password</h2><p className="mt-1 text-sm leading-6 text-app-subtle">This account uses Google sign-in, so it does not have a Life Tracker password to change. Manage your password with Google.</p></Card>}

    <Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-app-ink">Sign out of all devices</h2><p className="mt-1 text-sm text-app-subtle">End Life Tracker sessions on your other devices too.</p></div><Button variant="danger" disabled={busy} onClick={() => void signOutEverywhere()}><LogOut size={16} /> Sign out everywhere</Button></div></Card>
    {(error || message) && <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-app-ink' : 'text-cat-green'}`}>{error || message}</p>}
    <p className="text-sm text-app-subtle">Read our <Link className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to="/privacy">Privacy Policy</Link>.</p>
  </div>;
}

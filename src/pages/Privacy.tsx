import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-app-bg px-4 py-10 text-app-ink">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <Link to="/auth" className="text-sm font-semibold text-app-subtle transition-colors hover:text-app-ink">Life Tracker</Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Privacy</h1>
        </header>
        <Card>
          <div className="space-y-4 text-sm leading-6 text-app-subtle">
            <p>Life Tracker stores the information you enter: habits, goals, mood entries, workouts, sleep and water, and transactions. It also stores your email address and basic Google profile information if you sign in with Google.</p>
            <p>Your data is stored with Supabase, and the website is hosted on Vercel. Your data is not sold or shared for advertising.</p>
            <p>In Settings, use <strong>Export Data (Backup)</strong> to export your data or <strong>Clear All Data</strong> to delete it.</p>
            <p>Questions? Contact <a className="font-medium text-app-ink underline underline-offset-2" href="mailto:Zxy76600@gmail.com">Zxy76600@gmail.com</a>.</p>
          </div>
        </Card>
        <p className="text-sm text-app-subtle"><Link className="hover:text-app-ink" to="/terms">Terms</Link><span className="mx-2">·</span><Link className="hover:text-app-ink" to="/auth">Sign in</Link></p>
      </div>
    </main>
  );
}

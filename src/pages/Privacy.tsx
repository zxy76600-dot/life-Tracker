import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-900 dark:bg-black dark:text-white">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <Link to="/auth" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">Life Tracker</Link>
          <h1 className="mt-3 text-2xl font-bold">Privacy</h1>
        </header>
        <Card>
          <div className="space-y-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            <p>Life Tracker stores the information you enter: habits, goals, mood entries, workouts, sleep and water, and transactions. It also stores your email address and basic Google profile information if you sign in with Google.</p>
            <p>Your data is stored with Supabase, and the website is hosted on Vercel. Your data is not sold or shared for advertising.</p>
            <p>In Settings, use <strong>Export Data (Backup)</strong> to export your data or <strong>Clear All Data</strong> to delete it.</p>
            <p>Questions? Contact <a className="underline hover:text-neutral-900 dark:hover:text-white" href="mailto:Zxy76600@gmail.com">Zxy76600@gmail.com</a>.</p>
          </div>
        </Card>
        <p className="text-sm text-neutral-500"><Link className="hover:text-neutral-900 dark:hover:text-white" to="/terms">Terms</Link><span className="mx-2">·</span><Link className="hover:text-neutral-900 dark:hover:text-white" to="/auth">Sign in</Link></p>
      </div>
    </main>
  );
}

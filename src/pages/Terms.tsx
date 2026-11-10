import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function Terms() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-900 dark:bg-black dark:text-white">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <Link to="/auth" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">Life Tracker</Link>
          <h1 className="mt-3 text-2xl font-bold">Terms</h1>
        </header>
        <Card>
          <div className="space-y-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            <p>Life Tracker is provided as-is, without guarantees.</p>
            <p>You are responsible for your account and the data you enter, export, or delete.</p>
            <p>These terms may change. Continued use of the app means you accept the current terms.</p>
          </div>
        </Card>
        <p className="text-sm text-neutral-500"><Link className="hover:text-neutral-900 dark:hover:text-white" to="/privacy">Privacy</Link><span className="mx-2">·</span><Link className="hover:text-neutral-900 dark:hover:text-white" to="/auth">Sign in</Link></p>
      </div>
    </main>
  );
}

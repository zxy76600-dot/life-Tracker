import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function Terms() {
  return (
    <main className="min-h-screen bg-app-bg px-4 py-10 text-app-ink">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <Link to="/auth" className="text-sm font-semibold text-app-subtle transition-colors hover:text-app-ink">Life Tracker</Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Terms</h1>
        </header>
        <Card>
          <div className="space-y-4 text-sm leading-6 text-app-subtle">
            <p>Life Tracker is provided as-is, without guarantees.</p>
            <p>You are responsible for your account and the data you enter, export, or delete.</p>
            <p>These terms may change. Continued use of the app means you accept the current terms.</p>
          </div>
        </Card>
        <p className="text-sm text-app-subtle"><Link className="hover:text-app-ink" to="/privacy">Privacy</Link><span className="mx-2">·</span><Link className="hover:text-app-ink" to="/auth">Sign in</Link></p>
      </div>
    </main>
  );
}

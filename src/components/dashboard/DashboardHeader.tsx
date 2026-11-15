import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ListTodo, Plus, Smile, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';

const quickActions = [
  { to: '/todos', label: 'Task', icon: ListTodo },
  { to: '/finances', label: 'Expense', icon: Wallet },
  { to: '/mood', label: 'Mood', icon: Smile },
];

export function DashboardHeader({ today, dateLabel }: { today: string; dateLabel: string }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const metadataName = typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name.trim() : '';
  const emailName = user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  const name = metadataName || emailName || 'there';

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-contrast">Your personal overview</p>
        <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-app-ink sm:text-3xl">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {name}
        </h1>
        <time dateTime={today} className="mt-1 block text-sm text-app-subtle">{dateLabel}</time>
      </div>

      <div ref={menuRef} className="relative self-start sm:self-auto">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls="dashboard-add-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-contrast px-4 text-sm font-semibold text-white shadow-accent transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
        >
          <Plus size={17} aria-hidden="true" /> Add <ChevronDown size={15} aria-hidden="true" />
        </button>
        {menuOpen && (
          <div id="dashboard-add-menu" role="menu" aria-label="Add to your tracker" className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-app-border bg-app-card p-1.5 shadow-card">
            {quickActions.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} role="menuitem" onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-app-ink hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <Icon size={17} className="text-app-subtle" aria-hidden="true" /> {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

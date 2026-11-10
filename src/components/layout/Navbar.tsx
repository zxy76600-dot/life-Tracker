import { Menu, Bell, Sun, Moon, LogOut } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../stores/themeStore';
import { useAuth } from '../../auth/authContext';
import { CloudNotice } from '../ui/CloudNotice';
import { reportCloudError } from '../../lib/cloudFeedback';

/**
 * Navbar — Top navigation bar with true black dark theme support.
 */
interface NavbarProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/habits': 'Habits',
  '/goals': 'Goals',
  '/mood': 'Mood Journal',
  '/fitness': 'Fitness',
  '/finances': 'Finances',
  '/settings': 'Settings',
};

export function Navbar({ onMenuClick }: NavbarProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'Life Tracker';
  const { theme, toggleTheme } = useThemeStore();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-app-border bg-app-bg/90 px-3 backdrop-blur-xl transition-colors duration-200 motion-reduce:transition-none sm:gap-4 sm:px-5 lg:px-8">
      {/* Hamburger menu button (mobile only) */}
      <button
        onClick={onMenuClick}
        className="rounded-xl p-2 text-app-subtle hover:bg-app-muted hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <h1 className="truncate text-lg font-bold tracking-tight text-app-ink sm:text-xl">{title}</h1>

      {/* Right side actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span className="hidden max-w-48 truncate text-xs text-app-subtle md:block">{user?.email}</span>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex min-h-10 items-center gap-2 rounded-xl border border-app-border bg-app-card px-2.5 py-1.5 text-xs font-semibold text-app-ink transition-colors motion-reduce:transition-none hover:border-accent/30 hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-accent/10 sm:px-3 cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon size={15} className="text-neutral-700" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Notifications button */}
        <button
          className="relative rounded-xl p-2 text-app-subtle transition-colors motion-reduce:transition-none hover:bg-app-muted hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-app-bg" />
        </button>

        <div title={user?.email ?? 'Account'} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold uppercase text-app-ink ring-1 ring-inset ring-accent/20">
          {user?.email?.[0] ?? 'U'}
        </div>
        <button onClick={() => void signOut().catch(reportCloudError)} className="rounded-xl p-2 text-app-subtle transition-colors motion-reduce:transition-none hover:bg-app-muted hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Sign out" title="Sign out"><LogOut size={19} /></button>
      </div>
      <CloudNotice />
    </header>
  );
}

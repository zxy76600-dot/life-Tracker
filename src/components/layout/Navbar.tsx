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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-neutral-200/80 bg-white/80 px-4 backdrop-blur-xl transition-colors duration-200 dark:border-neutral-800 dark:bg-black/85 lg:px-6">
      {/* Hamburger menu button (mobile only) */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white lg:hidden cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">{title}</h1>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden max-w-48 truncate text-xs text-neutral-500 dark:text-neutral-400 sm:block">{user?.email}</span>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-all hover:bg-neutral-200 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
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
          className="relative rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
        </button>

        <div title={user?.email ?? 'Account'} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold uppercase text-white border border-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-300 shadow-sm">
          {user?.email?.[0] ?? 'U'}
        </div>
        <button onClick={() => void signOut().catch(reportCloudError)} className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white" aria-label="Sign out" title="Sign out"><LogOut size={19} /></button>
      </div>
      <CloudNotice />
    </header>
  );
}

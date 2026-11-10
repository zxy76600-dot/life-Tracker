import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Smile,
  Dumbbell,
  Wallet,
  Settings,
  X,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

/**
 * Sidebar — Main navigation panel with true black dark theme.
 */
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/habits', icon: CheckSquare, label: 'Habits' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/mood', icon: Smile, label: 'Mood Journal' },
  { to: '/fitness', icon: Dumbbell, label: 'Fitness' },
  { to: '/finances', icon: Wallet, label: 'Finances' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed left-0 top-0 z-30 flex h-full w-64 flex-col
          border-r border-app-border bg-app-card shadow-sm
          transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-app-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-card bg-accent text-white shadow-accent">
              <Zap size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight text-app-ink">Life Tracker</span>
          </div>

          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-app-subtle hover:bg-app-muted hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                ${
                  isActive
                    ? 'bg-accent-contrast text-white font-semibold shadow-accent'
                    : 'text-app-subtle hover:bg-app-muted hover:text-app-ink'
                }`
              }
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer with theme switch */}
        <div className="border-t border-app-border p-4">
          <button
            onClick={toggleTheme}
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-app-border bg-app-muted px-3 py-2 text-xs font-medium text-app-ink transition-colors motion-reduce:transition-none hover:border-accent/30 hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-accent/10 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? (
                <>
                  <Moon size={15} className="text-neutral-400" />
                  <span>Dark Mode (Black)</span>
                </>
              ) : (
                <>
                  <Sun size={15} className="text-amber-500" />
                  <span>Light Mode (White)</span>
                </>
              )}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-app-subtle">Switch</span>
          </button>
          <p className="mt-3 text-center text-[11px] text-app-subtle">
            Life Tracker v1.1
          </p>
        </div>
      </aside>
    </>
  );
}

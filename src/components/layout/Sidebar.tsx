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
          border-r border-neutral-200/80 bg-white
          dark:border-neutral-800 dark:bg-black
          transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200/80 px-5 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 shadow-sm">
              <Zap size={20} />
            </div>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">Life Tracker</span>
          </div>

          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-white lg:hidden cursor-pointer"
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
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-neutral-900 text-white font-semibold dark:bg-neutral-800 dark:text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer with theme switch */}
        <div className="border-t border-neutral-200/80 p-4 dark:border-neutral-800">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
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
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Switch</span>
          </button>
          <p className="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-600">
            Life Tracker v1.1
          </p>
        </div>
      </aside>
    </>
  );
}

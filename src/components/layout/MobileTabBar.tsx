import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Smile,
  Dumbbell,
  Wallet,
} from 'lucide-react';

/**
 * MobileTabBar — Bottom navigation for mobile devices with true black theme.
 */
const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/habits', icon: CheckSquare, label: 'Habits' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/mood', icon: Smile, label: 'Mood' },
  { to: '/fitness', icon: Dumbbell, label: 'Fitness' },
  { to: '/finances', icon: Wallet, label: 'Money' },
];

export function MobileTabBar() {
  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-30 border-t border-app-border bg-app-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-20px_rgba(20,24,38,0.35)] backdrop-blur-xl transition-colors duration-200 motion-reduce:transition-none lg:hidden">
      <div className="flex items-center justify-between gap-0.5 px-1.5 py-2 sm:px-3">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
              ${isActive ? 'bg-accent-soft font-semibold text-app-ink dark:bg-accent/15' : 'text-app-subtle hover:bg-app-muted hover:text-app-ink'}`
            }
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

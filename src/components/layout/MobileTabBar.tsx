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
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-neutral-200/80 bg-white/90 backdrop-blur-xl transition-colors duration-200 dark:border-neutral-800 dark:bg-black/95 lg:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors
              ${isActive ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'}`
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

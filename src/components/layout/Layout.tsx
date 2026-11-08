import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileTabBar } from './MobileTabBar';
import { useThemeStore, applyTheme } from '../../stores/themeStore';

/**
 * Layout — The main wrapper that combines Sidebar + Navbar + Content.
 * Features true black dark mode and clean white light mode.
 */
export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 transition-colors duration-200 dark:bg-black dark:text-neutral-100">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="p-4 pb-24 lg:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </div>
  );
}

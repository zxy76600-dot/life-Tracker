import { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
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
    <div className="min-h-screen bg-app-bg text-app-ink transition-colors duration-200 motion-reduce:transition-none">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="min-w-0 lg:pl-64">
        {/* Top navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="min-w-0 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-6">
          <Outlet />
        </main>
        <footer className="px-4 pb-24 text-center text-xs text-app-subtle sm:px-6 lg:px-8 lg:pb-6">
          <Link className="rounded-sm hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to="/privacy">Privacy</Link>
          <span className="mx-2">·</span>
          <Link className="rounded-sm hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to="/terms">Terms</Link>
        </footer>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </div>
  );
}

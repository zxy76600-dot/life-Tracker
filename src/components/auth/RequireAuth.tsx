import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-sm text-neutral-500 dark:bg-black dark:text-neutral-400">Loading your Life Tracker…</div>;
  return user ? <Outlet /> : <Navigate to={`/auth${location.search}${location.hash}`} replace state={{ from: location.pathname }} />;
}

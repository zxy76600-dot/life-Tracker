import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Habits from './pages/Habits';
import Goals from './pages/Goals';
import MoodJournal from './pages/MoodJournal';
import Fitness from './pages/Fitness';
import Finances from './pages/Finances';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import { RequireAuth } from './components/auth/RequireAuth';

/**
 * App — The root component.
 * Sets up routing so each URL path renders a different page.
 * 
 * The Layout component wraps all pages with the sidebar, navbar, and content area.
 * Each Route renders a specific page component inside the Layout's <Outlet />.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/mood" element={<MoodJournal />} />
            <Route path="/fitness" element={<Fitness />} />
            <Route path="/finances" element={<Finances />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

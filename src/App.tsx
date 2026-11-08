import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Habits from './pages/Habits';
import Goals from './pages/Goals';
import MoodJournal from './pages/MoodJournal';
import Fitness from './pages/Fitness';
import Finances from './pages/Finances';
import Settings from './pages/Settings';

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
        {/* All pages share the same Layout (sidebar + navbar) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/mood" element={<MoodJournal />} />
          <Route path="/fitness" element={<Fitness />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

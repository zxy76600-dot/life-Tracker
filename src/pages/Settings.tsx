import { useState } from 'react';
import { Card, Button } from '../components/ui';
import { Download, Upload, Trash2, Palette, Sparkles, Sun, Moon, Check } from 'lucide-react';
import { loadDemoData } from '../utils/demoData';
import { useThemeStore } from '../stores/themeStore';

/**
 * Settings Page — App customization, true black/white theme selector, data management.
 */
export default function Settings() {
  const [exportMessage, setExportMessage] = useState('');
  const { theme, setTheme } = useThemeStore();

  const handleLoadDemo = () => {
    loadDemoData();
    setExportMessage('✨ Sample data loaded! Refreshing...');
    setTimeout(() => window.location.reload(), 1200);
  };

  const handleExport = () => {
    const data: Record<string, string | null> = {};
    const keys = [
      'life-tracker-habits',
      'life-tracker-goals',
      'life-tracker-mood',
      'life-tracker-fitness',
      'life-tracker-finances',
      'life-tracker-theme',
    ];
    keys.forEach((key) => {
      data[key] = localStorage.getItem(key);
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMessage('✅ Data exported successfully!');
    setTimeout(() => setExportMessage(''), 3000);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          Object.entries(data).forEach(([key, value]) => {
            if (value) localStorage.setItem(key, value as string);
          });
          setExportMessage('✅ Data imported! Reloading...');
          setTimeout(() => window.location.reload(), 1500);
        } catch {
          setExportMessage('❌ Invalid backup file.');
          setTimeout(() => setExportMessage(''), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
      const keys = [
        'life-tracker-habits',
        'life-tracker-goals',
        'life-tracker-mood',
        'life-tracker-fitness',
        'life-tracker-finances',
      ];
      keys.forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Theme & Appearance */}
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 p-2.5">
            <Palette size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Appearance & Theme</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Choose between Pure Black (Dark) and Pure White (Light).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
          {/* True Black Dark theme card */}
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-white bg-black text-white ring-2 ring-white/30 shadow-lg'
                : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white border border-neutral-700">
                <Moon size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">True Black Theme</p>
                <p className="text-xs text-neutral-400">Pure midnight black & neutral</p>
              </div>
            </div>
            {theme === 'dark' && <Check size={18} className="text-white" />}
          </button>

          {/* White / Light theme card */}
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-neutral-900 bg-white text-neutral-900 ring-2 ring-neutral-900/20 shadow-md'
                : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500 border border-amber-200">
                <Sun size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">Pure White Theme</p>
                <p className="text-xs text-neutral-500">Crisp, clean & bright</p>
              </div>
            </div>
            {theme === 'light' && <Check size={18} className="text-neutral-900" />}
          </button>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">Data Management</h3>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Your data is stored locally in your browser. Use these tools to backup, restore, or manage your data.
        </p>

        <div className="space-y-3">
          <Button variant="primary" onClick={handleLoadDemo} className="w-full justify-start">
            <Sparkles size={18} />
            Load Sample / Demo Data
          </Button>

          <Button variant="secondary" onClick={handleExport} className="w-full justify-start">
            <Download size={18} />
            Export Data (Backup)
          </Button>

          <Button variant="secondary" onClick={handleImport} className="w-full justify-start">
            <Upload size={18} />
            Import Data (Restore)
          </Button>

          <Button variant="danger" onClick={handleClearAll} className="w-full justify-start">
            <Trash2 size={18} />
            Clear All Data
          </Button>
        </div>

        {exportMessage && (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{exportMessage}</p>
        )}
      </Card>

      {/* About */}
      <Card>
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">About Life Tracker</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Life Tracker is your personal all-in-one life management dashboard. Track habits, set goals, log moods, monitor fitness, and manage finances — all in one clean, customizable interface.
        </p>
        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">Version 1.2.0 • Pure Black & White Themes</p>
      </Card>
    </div>
  );
}

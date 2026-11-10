import { useState } from 'react';
import { Card, Button } from '../components/ui';
import { Download, Upload, Trash2, Palette, Sparkles, Sun, Moon, Check } from 'lucide-react';
import { loadDemoData } from '../utils/demoData';
import { useThemeStore } from '../stores/themeStore';
import { clearCloudData, exportCloudBackup, getLegacyBackup, importLegacyBackup, type LegacyBackup } from '../lib/cloudData';

/**
 * Settings Page — App customization, true black/white theme selector, data management.
 */
export default function Settings() {
  const [exportMessage, setExportMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [messageIsError, setMessageIsError] = useState(false);
  const { theme, setTheme } = useThemeStore();

  const clearLegacyKeys = () => {
    ['life-tracker-habits', 'life-tracker-goals', 'life-tracker-mood', 'life-tracker-fitness', 'life-tracker-finances'].forEach((key) => localStorage.removeItem(key));
  };

  const handleLoadDemo = async () => {
    setBusy(true); setMessageIsError(false);
    try {
      await loadDemoData();
      setExportMessage('Sample data loaded to your cloud account. Refreshing…');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setMessageIsError(true); setExportMessage(error instanceof Error ? error.message : 'Could not load sample data.');
    } finally { setBusy(false); }
  };

  const handleExport = async () => {
    setBusy(true); setMessageIsError(false);
    try {
    const data = await exportCloudBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMessage('Cloud data exported successfully.');
    } catch (error) { setMessageIsError(true); setExportMessage(error instanceof Error ? error.message : 'Could not export cloud data.'); }
    finally { setBusy(false); }
  };

  const migrateBackup = async (backup: LegacyBackup) => {
    await importLegacyBackup(backup);
    if (backup['life-tracker-theme']) localStorage.setItem('life-tracker-theme', backup['life-tracker-theme']);
    clearLegacyKeys();
    setMessageIsError(false);
    setExportMessage('Data imported to your cloud account successfully.');
    window.location.reload();
  };

  const handleMigrateBrowserData = async () => {
    const backup = getLegacyBackup();
    const hasLocalData = Object.entries(backup).some(([key, value]) => key !== 'life-tracker-theme' && value !== null);
    if (!hasLocalData) { setMessageIsError(true); setExportMessage('No browser tracker data was found to migrate.'); return; }
    setBusy(true);
    try { await migrateBackup(backup); }
    catch (error) { setMessageIsError(true); setExportMessage(error instanceof Error ? error.message : 'Could not migrate browser data. Your local backup is still available.'); }
    finally { setBusy(false); }
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
          if (!data || typeof data !== 'object' || Array.isArray(data) || Object.values(data).some((value) => value !== null && typeof value !== 'string')) throw new Error('Invalid backup format.');
          setBusy(true);
          void migrateBackup(data as LegacyBackup).catch((error: unknown) => {
            setMessageIsError(true); setExportMessage(error instanceof Error ? error.message : 'Could not restore this backup.');
          }).finally(() => setBusy(false));
        } catch (error) {
          setMessageIsError(true); setExportMessage(error instanceof Error ? error.message : 'Invalid backup file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
      setBusy(true);
      try { await clearCloudData(); clearLegacyKeys(); window.location.reload(); }
      catch (error) { setMessageIsError(true); setExportMessage(error instanceof Error ? error.message : 'Could not clear cloud data.'); }
      finally { setBusy(false); }
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
      {/* Theme & Appearance */}
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-accent/10 p-2.5 text-accent">
            <Palette size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-app-ink">Appearance & Theme</h3>
            <p className="text-xs text-app-subtle">Choose between Pure Black (Dark) and Pure White (Light).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
          {/* True Black Dark theme card */}
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-between rounded-card-lg border p-4 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
              theme === 'dark'
              ? 'border-accent bg-accent/5 text-app-ink ring-2 ring-accent/30 shadow-card'
              : 'border-app-border bg-app-muted text-app-ink hover:border-accent/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-card text-app-ink">
                <Moon size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">True Black Theme</p>
                <p className="text-xs text-app-subtle">Pure midnight black & neutral</p>
              </div>
            </div>
            {theme === 'dark' && <Check size={18} className="text-accent" />}
          </button>

          {/* White / Light theme card */}
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-between rounded-card-lg border p-4 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
              theme === 'light'
              ? 'border-accent bg-accent/5 text-app-ink ring-2 ring-accent/30 shadow-card'
              : 'border-app-border bg-app-muted text-app-ink hover:border-accent/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cat-amber/20 bg-cat-amber/10 text-cat-amber">
                <Sun size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">Pure White Theme</p>
                <p className="text-xs text-app-subtle">Crisp, clean & bright</p>
              </div>
            </div>
            {theme === 'light' && <Check size={18} className="text-accent" />}
          </button>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <h3 className="mb-2 font-semibold text-app-ink">Data Management</h3>
        <p className="mb-4 text-sm leading-6 text-app-subtle">
          Your tracker data is stored securely in your signed-in cloud account. Theme preference remains on this device.
        </p>

        <div className="space-y-3">
          <Button variant="primary" onClick={() => void handleLoadDemo()} disabled={busy} className="w-full justify-start">
            <Sparkles size={18} />
            Load Sample / Demo Data
          </Button>

          <Button variant="secondary" onClick={() => void handleExport()} disabled={busy} className="w-full justify-start">
            <Download size={18} />
            Export Data (Backup)
          </Button>

          <Button variant="secondary" onClick={handleImport} disabled={busy} className="w-full justify-start">
            <Upload size={18} />
            Restore Backup to Cloud
          </Button>

          <Button variant="secondary" onClick={() => void handleMigrateBrowserData()} disabled={busy} className="w-full justify-start">
            <Upload size={18} />
            Migrate Browser Data to Cloud
          </Button>

          <Button variant="danger" onClick={() => void handleClearAll()} disabled={busy} className="w-full justify-start">
            <Trash2 size={18} />
            Clear All Data
          </Button>
        </div>

        {exportMessage && (
          <p role="status" className={`mt-3 text-sm ${messageIsError ? 'text-app-ink' : 'text-cat-green'}`}>{exportMessage}</p>
        )}
      </Card>

      {/* About */}
      <Card>
        <h3 className="font-semibold text-app-ink mb-2">About Life Tracker</h3>
        <p className="text-sm leading-6 text-app-subtle">
          Life Tracker is your personal all-in-one life management dashboard. Track habits, set goals, log moods, monitor fitness, and manage finances — all in one clean, customizable interface.
        </p>
        <p className="mt-2 text-xs text-app-subtle">Version 1.2.0 • Pure Black & White Themes</p>
      </Card>
    </div>
  );
}

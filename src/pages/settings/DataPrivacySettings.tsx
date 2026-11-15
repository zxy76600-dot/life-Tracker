import { useState } from 'react';
import { Download, Upload, Trash2, Sparkles } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { loadDemoData } from '../../utils/demoData';
import { clearCloudData, exportCloudBackup, getLegacyBackup, importLegacyBackup, type LegacyBackup } from '../../lib/cloudData';

export default function DataPrivacySettings() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [messageIsError, setMessageIsError] = useState(false);
  const clearLegacyKeys = () => ['life-tracker-habits', 'life-tracker-goals', 'life-tracker-mood', 'life-tracker-fitness', 'life-tracker-finances', 'life-tracker-finance-details', 'life-tracker-todos'].forEach((key) => localStorage.removeItem(key));
  const showError = (error: unknown, fallback: string) => { setMessageIsError(true); setMessage(error instanceof Error ? error.message : fallback); };

  const handleLoadDemo = async () => {
    setBusy(true); setMessageIsError(false);
    try { await loadDemoData(); setMessage('Sample data loaded to your cloud account. Refreshing…'); setTimeout(() => window.location.reload(), 800); }
    catch (error) { showError(error, 'Could not load sample data.'); }
    finally { setBusy(false); }
  };
  const handleExport = async () => {
    setBusy(true); setMessageIsError(false);
    try {
      const data = await exportCloudBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `life-tracker-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
      setMessage('Cloud data exported successfully.');
    } catch (error) { showError(error, 'Could not export cloud data.'); }
    finally { setBusy(false); }
  };
  const migrateBackup = async (backup: LegacyBackup) => {
    await importLegacyBackup(backup);
    if (backup['life-tracker-theme']) localStorage.setItem('life-tracker-theme', backup['life-tracker-theme']);
    clearLegacyKeys(); setMessageIsError(false); setMessage('Data imported to your cloud account successfully.'); window.location.reload();
  };
  const handleMigrateBrowserData = async () => {
    const backup = getLegacyBackup();
    if (!Object.entries(backup).some(([key, value]) => key !== 'life-tracker-theme' && value !== null)) { setMessageIsError(true); setMessage('No browser tracker data was found to migrate.'); return; }
    setBusy(true); try { await migrateBackup(backup); } catch (error) { showError(error, 'Could not migrate browser data. Your local backup is still available.'); } finally { setBusy(false); }
  };
  const handleImport = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const data = JSON.parse(loadEvent.target?.result as string);
          if (!data || typeof data !== 'object' || Array.isArray(data) || Object.values(data).some((value) => value !== null && typeof value !== 'string')) throw new Error('Invalid backup format.');
          setBusy(true); void migrateBackup(data as LegacyBackup).catch((error: unknown) => showError(error, 'Could not restore this backup.')).finally(() => setBusy(false));
        } catch (error) { showError(error, 'Invalid backup file.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL data, including fitness profiles, workout logs, check-ins, and the saved in-progress workout? This cannot be undone!')) return;
    setBusy(true);
    try { await clearCloudData(); clearLegacyKeys(); localStorage.removeItem('life-tracker-fitness-workout-draft'); window.location.reload(); }
    catch (error) { showError(error, 'Could not clear cloud data.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <Card><h2 className="mb-2 font-semibold text-app-ink">Your data</h2><p className="mb-4 text-sm leading-6 text-app-subtle">Your tracker data is stored securely in your signed-in cloud account. Theme preference remains on this device.</p><div className="space-y-3">
      <Button variant="primary" onClick={() => void handleLoadDemo()} disabled={busy} className="w-full justify-start"><Sparkles size={18} />Load Sample / Demo Data</Button>
      <Button variant="secondary" onClick={() => void handleExport()} disabled={busy} className="w-full justify-start"><Download size={18} />Export Data (Backup)</Button>
      <Button variant="secondary" onClick={handleImport} disabled={busy} className="w-full justify-start"><Upload size={18} />Restore Backup to Cloud</Button>
      <Button variant="secondary" onClick={() => void handleMigrateBrowserData()} disabled={busy} className="w-full justify-start"><Upload size={18} />Migrate Browser Data to Cloud</Button>
      <Button variant="danger" onClick={() => void handleClearAll()} disabled={busy} className="w-full justify-start"><Trash2 size={18} />Clear All Data</Button>
    </div>{message && <p role={messageIsError ? 'alert' : 'status'} className={`mt-3 text-sm ${messageIsError ? 'text-app-ink' : 'text-cat-green'}`}>{message}</p>}</Card>
  </div>;
}

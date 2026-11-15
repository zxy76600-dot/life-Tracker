import { useEffect, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { hiddenPageOptions, useThemeStore, type AccentColor, type Density, type TextSize, type Theme } from '../../stores/themeStore';

const themes: { value: Theme; label: string; detail: string }[] = [
  { value: 'light', label: 'Light', detail: 'Bright surfaces' },
  { value: 'dark', label: 'Dark', detail: 'Soft charcoal' },
  { value: 'black', label: 'Black', detail: 'True black surfaces' },
  { value: 'system', label: 'System', detail: 'Follow your device' },
];
const accents: { value: AccentColor; label: string; color: string }[] = [
  { value: 'coral', label: 'Coral', color: '#ff5a5f' },
  { value: 'indigo', label: 'Indigo', color: '#5b5bf0' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'teal', label: 'Teal', color: '#14b8a6' },
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
  { value: 'green', label: 'Green', color: '#22a06b' },
];

export default function AppearanceSettings() {
  const { theme, setTheme, accentColor, setAccentColor, textSize, setTextSize, density, setDensity, reduceMotion, setReduceMotion, hiddenPages, setPageHidden, resetAppearance } = useThemeStore();
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!saved) return; const timer = window.setTimeout(() => setSaved(false), 1800); return () => window.clearTimeout(timer); }, [saved]);
  const changed = (action: () => void) => { action(); setSaved(true); };

  return <div className="space-y-5">
    <Card><h2 className="mb-1 font-semibold text-app-ink">Theme</h2><p className="mb-4 text-sm text-app-subtle">Choose how Life Tracker looks on this device.</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{themes.map((option) => <button key={option.value} type="button" onClick={() => changed(() => setTheme(option.value))} aria-pressed={theme === option.value} className={`min-h-24 rounded-card border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${theme === option.value ? 'border-accent bg-accent-soft ring-2 ring-accent/25' : 'border-app-border bg-app-muted hover:border-accent/40'}`}><span className="flex items-center justify-between font-semibold text-app-ink">{option.label}{theme === option.value && <Check size={16} className="text-accent-contrast" />}</span><span className="mt-1 block text-xs text-app-subtle">{option.detail}</span></button>)}</div></Card>

    <Card><h2 className="mb-1 font-semibold text-app-ink">Accent color</h2><p className="mb-4 text-sm text-app-subtle">The color used for highlights and primary actions.</p><fieldset><legend className="sr-only">Choose an accent color</legend><div className="flex flex-wrap gap-3">{accents.map((option) => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-app-border px-3 py-2 text-sm text-app-ink focus-within:ring-2 focus-within:ring-accent"><input className="sr-only" type="radio" name="accent-color" value={option.value} checked={accentColor === option.value} onChange={() => changed(() => setAccentColor(option.value))} /><span className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-app-card ${accentColor === option.value ? 'ring-2 ring-app-ink' : ''}`} style={{ backgroundColor: option.color }} /><span>{option.label}</span></label>)}</div></fieldset></Card>

    <Card><h2 className="mb-3 font-semibold text-app-ink">Display</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-app-ink">Text size<select value={textSize} onChange={(event) => changed(() => setTextSize(event.target.value as TextSize))} className="mt-1.5 min-h-11 w-full rounded-xl border border-app-border bg-app-muted px-3 text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="small">Small</option><option value="default">Default</option><option value="large">Large</option></select></label><label className="text-sm font-medium text-app-ink">Spacing<select value={density} onChange={(event) => changed(() => setDensity(event.target.value as Density))} className="mt-1.5 min-h-11 w-full rounded-xl border border-app-border bg-app-muted px-3 text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></div><label className="mt-4 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-app-border bg-app-muted px-3 py-2 text-sm text-app-ink"><span><span className="block font-medium">Reduce motion</span><span className="text-xs text-app-subtle">Also honors your device accessibility setting.</span></span><input type="checkbox" checked={reduceMotion} onChange={(event) => changed(() => setReduceMotion(event.target.checked))} className="h-5 w-5 accent-[var(--color-accent-contrast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label></Card>

    <Card><h2 className="mb-1 font-semibold text-app-ink">Navigation</h2><p className="mb-3 text-sm text-app-subtle">Hide pages you do not use from the sidebar and mobile tabs. Hidden pages still work when opened by URL.</p><div className="divide-y divide-app-border">{hiddenPageOptions.map(({ path, label }) => <label key={path} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-2 text-sm text-app-ink">{label}<input type="checkbox" checked={!hiddenPages.includes(path)} onChange={(event) => changed(() => setPageHidden(path, !event.target.checked))} aria-label={`Show ${label} in navigation`} className="h-5 w-5 accent-[var(--color-accent-contrast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label>)}</div><p className="mt-3 text-xs text-app-subtle">Dashboard and Settings always stay visible.</p></Card>

    <div className="flex flex-wrap items-center gap-3"><Button variant="secondary" onClick={() => changed(resetAppearance)}><RotateCcw size={16} /> Reset appearance to defaults</Button>{saved && <span role="status" className="flex items-center gap-1 text-sm font-medium text-cat-green"><Check size={15} /> Saved</span>}</div>
  </div>;
}

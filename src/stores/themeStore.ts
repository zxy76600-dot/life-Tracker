import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'black' | 'system';
export type AccentColor = 'coral' | 'indigo' | 'blue' | 'teal' | 'amber' | 'green';
export type TextSize = 'small' | 'default' | 'large';
export type Density = 'comfortable' | 'compact';
export const hiddenPageOptions = [
  { path: '/habits', label: 'Habits' },
  { path: '/goals', label: 'Goals' },
  { path: '/todos', label: 'To-Do' },
  { path: '/mood', label: 'Mood Journal' },
  { path: '/fitness', label: 'Fitness' },
  { path: '/finances', label: 'Finances' },
] as const;

type Appearance = {
  theme: Theme;
  accentColor: AccentColor;
  textSize: TextSize;
  density: Density;
  reduceMotion: boolean;
  hiddenPages: string[];
};

interface ThemeState extends Appearance {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccentColor: (accentColor: AccentColor) => void;
  setTextSize: (textSize: TextSize) => void;
  setDensity: (density: Density) => void;
  setReduceMotion: (reduceMotion: boolean) => void;
  setPageHidden: (path: string, hidden: boolean) => void;
  resetAppearance: () => void;
}

const defaults: Appearance = {
  theme: 'black',
  accentColor: 'coral',
  textSize: 'default',
  density: 'comfortable',
  reduceMotion: false,
  hiddenPages: [],
};

const validThemes: Theme[] = ['light', 'dark', 'black', 'system'];
const validAccents: AccentColor[] = ['coral', 'indigo', 'blue', 'teal', 'amber', 'green'];
const validTextSizes: TextSize[] = ['small', 'default', 'large'];
const validDensities: Density[] = ['comfortable', 'compact'];
const allowedHiddenPages = new Set<string>(hiddenPageOptions.map(({ path }) => path));
const accentValues: Record<AccentColor, { accent: string; contrast: string; soft: string }> = {
  coral: { accent: '#ff5a5f', contrast: '#c9363d', soft: '#fff0f0' },
  indigo: { accent: '#5b5bf0', contrast: '#4338ca', soft: '#eeeeff' },
  blue: { accent: '#3b82f6', contrast: '#1d4ed8', soft: '#eff6ff' },
  teal: { accent: '#14b8a6', contrast: '#0f766e', soft: '#e6fffb' },
  amber: { accent: '#f59e0b', contrast: '#92400e', soft: '#fff7e6' },
  green: { accent: '#22a06b', contrast: '#166534', soft: '#eaf8f0' },
};

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

const guardedStorage: PersistStorage<Appearance> = {
  getItem: (name) => {
    try {
      const raw = safeLocalStorage()?.getItem(name);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { state?: unknown; version?: number };
      if (!parsed || typeof parsed !== 'object' || !parsed.state || typeof parsed.state !== 'object') return null;
      return { state: validAppearance(parsed.state) as Appearance, version: parsed.version };
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try { safeLocalStorage()?.setItem(name, JSON.stringify(value)); } catch { /* Storage may be unavailable. */ }
  },
  removeItem: (name) => {
    try { safeLocalStorage()?.removeItem(name); } catch { /* Storage may be unavailable. */ }
  },
};

function validAppearance(value: unknown): Partial<Appearance> {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const theme = source.theme === 'dark' ? 'black' : source.theme;
  return {
    ...(validThemes.includes(theme as Theme) ? { theme: theme as Theme } : {}),
    ...(validAccents.includes(source.accentColor as AccentColor) ? { accentColor: source.accentColor as AccentColor } : {}),
    ...(validTextSizes.includes(source.textSize as TextSize) ? { textSize: source.textSize as TextSize } : {}),
    ...(validDensities.includes(source.density as Density) ? { density: source.density as Density } : {}),
    ...(typeof source.reduceMotion === 'boolean' ? { reduceMotion: source.reduceMotion } : {}),
    ...(Array.isArray(source.hiddenPages) ? { hiddenPages: source.hiddenPages.filter((path): path is string => typeof path === 'string' && allowedHiddenPages.has(path)) } : {}),
  };
}

function resolvedDark(theme: Theme): boolean {
  if (theme === 'system') {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
  }
  return theme === 'dark' || theme === 'black';
}

export function applyAppearance(appearance: Appearance) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = resolvedDark(appearance.theme);
  root.classList.toggle('dark', dark);
  root.classList.toggle('black', appearance.theme === 'black' || (appearance.theme === 'system' && dark));
  root.dataset.theme = appearance.theme;
  root.dataset.accent = appearance.accentColor;
  root.dataset.textSize = appearance.textSize;
  root.dataset.density = appearance.density;
  root.dataset.reduceMotion = String(appearance.reduceMotion);
  root.style.setProperty('--color-accent', accentValues[appearance.accentColor].accent);
  root.style.setProperty('--color-accent-strong', accentValues[appearance.accentColor].contrast);
  root.style.setProperty('--color-accent-contrast', accentValues[appearance.accentColor].contrast);
  root.style.setProperty('--color-accent-soft', dark ? `${accentValues[appearance.accentColor].accent}26` : accentValues[appearance.accentColor].soft);
}

/** Backwards-compatible helper for callers that only need to set the theme. */
export function applyTheme(theme: Theme) {
  const state = useThemeStore.getState();
  applyAppearance({ ...state, theme });
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...defaults,
      setTheme: (theme) => { const next: Appearance = { ...get(), theme }; applyAppearance(next); set({ theme }); },
      toggleTheme: () => {
        const theme = get().theme === 'light' ? 'black' : 'light';
        const next: Appearance = { ...get(), theme }; applyAppearance(next); set({ theme });
      },
      setAccentColor: (accentColor) => { const next: Appearance = { ...get(), accentColor }; applyAppearance(next); set({ accentColor }); },
      setTextSize: (textSize) => { const next: Appearance = { ...get(), textSize }; applyAppearance(next); set({ textSize }); },
      setDensity: (density) => { const next: Appearance = { ...get(), density }; applyAppearance(next); set({ density }); },
      setReduceMotion: (reduceMotion) => { const next: Appearance = { ...get(), reduceMotion }; applyAppearance(next); set({ reduceMotion }); },
      setPageHidden: (path, hidden) => {
        if (!allowedHiddenPages.has(path)) return;
        const hiddenPages = hidden ? [...new Set([...get().hiddenPages, path])] : get().hiddenPages.filter((item) => item !== path);
        set({ hiddenPages });
      },
      resetAppearance: () => { applyAppearance(defaults); set(defaults); },
    }),
    {
      name: 'life-tracker-theme',
      version: 2,
      storage: guardedStorage,
      partialize: (state): Appearance => ({ theme: state.theme, accentColor: state.accentColor, textSize: state.textSize, density: state.density, reduceMotion: state.reduceMotion, hiddenPages: state.hiddenPages }),
      migrate: (persisted) => ({ ...defaults, ...validAppearance(persisted) }),
      merge: (persisted, current) => ({ ...current, ...validAppearance(persisted) }),
      onRehydrateStorage: () => (state) => { if (state) applyAppearance(state); },
    },
  ),
);

if (typeof window !== 'undefined') {
  try {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      const state = useThemeStore.getState();
      if (state.theme === 'system') applyAppearance(state);
    });
  } catch { /* Older browsers may not support matchMedia. */ }
}

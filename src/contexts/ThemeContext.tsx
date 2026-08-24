import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';

export type ThemeName = 'ocean' | 'emerald' | 'slate';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  isDark: boolean;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  ocean: {
    name: 'ocean', label: 'Ocean Blue',
    primary: '#0369A1', primaryHover: '#075985', secondary: '#0EA5E9', accent: '#7DD3FC',
    bg: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0',
    text: '#0F172A', textMuted: '#64748B', isDark: false,
  },
  emerald: {
    name: 'emerald', label: 'Bio Organic',
    primary: '#16A34A', primaryHover: '#15803D', secondary: '#4ADE80', accent: '#86EFAC',
    bg: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0',
    text: '#0F172A', textMuted: '#64748B', isDark: false,
  },
  slate: {
    name: 'slate', label: 'Slate Professional',
    primary: '#334155', primaryHover: '#1E293B', secondary: '#64748B', accent: '#94A3B8',
    bg: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0',
    text: '#0F172A', textMuted: '#64748B', isDark: false,
  },
};

interface ThemeContextValue {
  theme: ThemeConfig;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('nutro-theme') as ThemeName;
    const valid: ThemeName[] = ['ocean', 'emerald', 'slate'];
    return valid.includes(stored) ? stored : 'ocean';
  });

  const theme = useMemo(() => THEMES[themeName], [themeName]);

  const setTheme = (name: ThemeName) => {
    setThemeName(name);
    localStorage.setItem('nutro-theme', name);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-hover', theme.primaryHover);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-bg', theme.bg);
    root.style.setProperty('--color-surface', theme.surface);
    root.style.setProperty('--color-border', theme.border);
    root.style.setProperty('--color-text', theme.text);
    root.style.setProperty('--color-text-muted', theme.textMuted);
    root.setAttribute('data-theme', themeName);
  }, [theme, themeName]);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

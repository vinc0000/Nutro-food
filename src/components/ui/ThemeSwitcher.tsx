import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, THEMES, ThemeName } from '@/contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, themeName, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:opacity-70 flex items-center gap-1 transition-opacity"
        style={{ color: theme.textMuted }}>
        <Palette size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 rounded-xl p-3 w-48 shadow-2xl"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>Thème</p>
            {(Object.keys(THEMES) as ThemeName[]).map(t => (
              <button key={t} onClick={() => { setTheme(t); setOpen(false); }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{
                  background: themeName === t ? theme.primary + '20' : 'transparent',
                  color: themeName === t ? theme.primary : theme.text,
                }}>
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: THEMES[t].primary }} />
                <span className="flex-1 text-left">{THEMES[t].label}</span>
                {themeName === t && <Check size={14} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

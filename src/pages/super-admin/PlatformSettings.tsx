import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Loader2, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function SuperAdminSettings() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [trialDays, setTrialDays] = useState(14);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('platform_settings').select('*');
      const rows = (data as Array<{ key: string; value: unknown }> ?? []);
      const settingsMap = new Map(rows.map(r => [r.key, r.value]));
      if (typeof settingsMap.get('trial_length_days') === 'number') setTrialDays(settingsMap.get('trial_length_days') as number);
      if (typeof settingsMap.get('maintenance_mode') === 'boolean') setMaintenanceMode(settingsMap.get('maintenance_mode') as boolean);
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const updates = [
      supabase.from('platform_settings').update({ value: trialDays, updated_at: new Date().toISOString() }).eq('key', 'trial_length_days'),
      supabase.from('platform_settings').update({ value: maintenanceMode, updated_at: new Date().toISOString() }).eq('key', 'maintenance_mode'),
    ];
    await Promise.all(updates);
    setSaving(false);
    showToast('Platform settings saved');
  };

  if (loading) return <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading settings…</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><SettingsIcon size={20} /> Platform Settings</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real platform-wide configuration, stored in platform_settings</p>
      </div>

      <div className="rounded-2xl p-5 space-y-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div>
          <label className="block text-sm font-bold mb-1.5" style={{ color: theme.text }}>Free Trial Length (days)</label>
          <p className="text-xs mb-2" style={{ color: theme.textMuted }}>Note: changing this here does not automatically change create_tenant()/handle_new_user() — those are set in the database and would need a matching code change to actually apply this value.</p>
          <input type="number" min={1} value={trialDays} onChange={e => setTrialDays(Number(e.target.value))}
            className="w-32 px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-bold" style={{ color: theme.text }}>Maintenance Mode</label>
            <p className="text-xs" style={{ color: theme.textMuted }}>Recorded here for reference — enforcing an actual maintenance banner/lockout is a separate change.</p>
          </div>
          <button onClick={() => setMaintenanceMode(!maintenanceMode)}
            className="w-12 h-6 rounded-full relative flex-shrink-0 transition-colors"
            style={{ background: maintenanceMode ? '#ef4444' : theme.border }}>
            <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: maintenanceMode ? '26px' : '2px' }} />
          </button>
        </div>

        <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: theme.primary }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Settings
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl" style={{ background: theme.primary }}>{toast}</div>
      )}
    </div>
  );
}

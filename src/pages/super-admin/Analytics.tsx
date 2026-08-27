import { useEffect, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function SuperAdminAnalytics() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [byPlan, setByPlan] = useState<Array<{ label: string; count: number }>>([]);
  const [byCountry, setByCountry] = useState<Array<{ label: string; count: number }>>([]);
  const [byStatus, setByStatus] = useState<Array<{ label: string; count: number }>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data: orgs, error } = await supabase.from('organizations').select('plan, plan_status');
      if (error) { setLoadError(error.message); setLoading(false); return; }
      const { data: branches } = await supabase.from('branches').select('country');

      const count = <T extends string>(items: T[]) => {
        const map = new Map<string, number>();
        for (const item of items) map.set(item || 'Unknown', (map.get(item || 'Unknown') ?? 0) + 1);
        return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
      };

      const orgRows = (orgs as Array<{ plan: string; plan_status: string }> ?? []);
      setByPlan(count(orgRows.map(o => o.plan)));
      setByStatus(count(orgRows.map(o => o.plan_status)));
      setByCountry(count((branches as Array<{ country: string | null }> ?? []).map(b => b.country ?? 'Unknown')).slice(0, 8));
      setLoading(false);
    };
    load();
  }, []);

  const Bar = ({ items, colorFn }: { items: Array<{ label: string; count: number }>; colorFn: (i: number) => string }) => {
    const max = Math.max(...items.map(i => i.count), 1);
    return (
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="capitalize font-semibold" style={{ color: theme.text }}>{item.label}</span>
              <span style={{ color: theme.textMuted }}>{item.count}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: theme.bg }}>
              <div className="h-2 rounded-full" style={{ width: `${(item.count / max) * 100}%`, background: colorFn(i) }} />
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs" style={{ color: theme.textMuted }}>No data yet.</p>}
      </div>
    );
  };

  const palette = ['#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ef4444', '#0ea5e9', '#f97316', '#14b8a6'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><BarChart3 size={20} /> Analytics</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>How tenants segment by plan, status, and country — real counts from organizations and branches</p>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading analytics…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load analytics: {loadError}</div>}

      {!loading && !loadError && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: theme.text }}>By Plan</h3>
            <Bar items={byPlan} colorFn={i => palette[i % palette.length]} />
          </div>
          <div className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: theme.text }}>By Status</h3>
            <Bar items={byStatus} colorFn={i => palette[i % palette.length]} />
          </div>
          <div className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: theme.text }}>By Country (branches)</h3>
            <Bar items={byCountry} colorFn={i => palette[i % palette.length]} />
          </div>
        </div>
      )}
    </div>
  );
}

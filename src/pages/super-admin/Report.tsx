import { useEffect, useState } from 'react';
import { FileBarChart, Loader2, Download } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface MonthRow { month: string; newTenants: number; revenue: number }

export default function SuperAdminReport() {
  const { theme } = useTheme();
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const [orgsRes, subsRes] = await Promise.all([
        supabase.from('organizations').select('created_at'),
        supabase.from('subscriptions').select('amount, paid_at').eq('status', 'successful').not('paid_at', 'is', null),
      ]);
      if (orgsRes.error) { setLoadError(orgsRes.error.message); setLoading(false); return; }

      const monthKey = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const monthMap = new Map<string, MonthRow>();

      for (const o of (orgsRes.data as Array<{ created_at: string }> ?? [])) {
        const key = monthKey(o.created_at);
        const row = monthMap.get(key) ?? { month: key, newTenants: 0, revenue: 0 };
        row.newTenants += 1;
        monthMap.set(key, row);
      }
      for (const s of (subsRes.data as Array<{ amount: number; paid_at: string }> ?? [])) {
        const key = monthKey(s.paid_at);
        const row = monthMap.get(key) ?? { month: key, newTenants: 0, revenue: 0 };
        row.revenue += Number(s.amount);
        monthMap.set(key, row);
      }

      setRows([...monthMap.values()].sort((a, b) => new Date(`1 ${a.month}`).getTime() - new Date(`1 ${b.month}`).getTime()));
      setLoading(false);
    };
    load();
  }, []);

  const exportCsv = () => {
    const csv = ['Month,New Tenants,Revenue', ...rows.map(r => `${r.month},${r.newTenants},${r.revenue}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nutro-growth-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const maxTenants = Math.max(...rows.map(r => r.newTenants), 1);
  const maxRevenue = Math.max(...rows.map(r => r.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><FileBarChart size={20} /> Growth Report</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>New tenants and revenue collected, by month — computed live from organizations and subscriptions</p>
        </div>
        <button onClick={exportCsv} disabled={rows.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Building report…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load report: {loadError}</div>}

      {!loading && !loadError && (
        <div className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th className="text-left py-2 text-xs font-bold uppercase" style={{ color: theme.textMuted }}>Month</th>
                <th className="text-left py-2 text-xs font-bold uppercase" style={{ color: theme.textMuted }}>New Tenants</th>
                <th className="text-left py-2 text-xs font-bold uppercase" style={{ color: theme.textMuted }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.month} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td className="py-3 font-semibold" style={{ color: theme.text }}>{r.month}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full" style={{ width: `${(r.newTenants / maxTenants) * 80}px`, background: '#3b82f6' }} />
                      <span style={{ color: theme.text }}>{r.newTenants}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full" style={{ width: `${(r.revenue / maxRevenue) * 80}px`, background: '#22c55e' }} />
                      <span style={{ color: theme.text }}>${r.revenue.toLocaleString()}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-sm" style={{ color: theme.textMuted }}>No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Activity, Loader2, TrendingUp, ShoppingBag, Building2, Users2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function SuperAdminPerformance() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalOrders: 0, ordersLast7Days: 0, activeBranches: 0, totalTenants: 0, activeTenants: 0, avgOrdersPerBranch: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [ordersRes, recentOrdersRes, branchesRes, orgsRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.from('branches').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('organizations').select('plan_status'),
      ]);

      if (ordersRes.error) { setLoadError(ordersRes.error.message); setLoading(false); return; }

      const orgRows = (orgsRes.data as Array<{ plan_status: string }> ?? []);
      const activeBranches = branchesRes.count ?? 0;
      const totalOrders = ordersRes.count ?? 0;

      setMetrics({
        totalOrders,
        ordersLast7Days: recentOrdersRes.count ?? 0,
        activeBranches,
        totalTenants: orgRows.length,
        activeTenants: orgRows.filter(o => o.plan_status === 'active' || o.plan_status === 'trial').length,
        avgOrdersPerBranch: activeBranches > 0 ? Math.round(totalOrders / activeBranches) : 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: 'Total Orders Processed', value: metrics.totalOrders.toLocaleString(), icon: ShoppingBag, color: '#3b82f6' },
    { label: 'Orders (Last 7 Days)', value: metrics.ordersLast7Days.toLocaleString(), icon: TrendingUp, color: '#22c55e' },
    { label: 'Active Branches', value: metrics.activeBranches.toLocaleString(), icon: Building2, color: '#8b5cf6' },
    { label: 'Tenants (Active + Trial)', value: `${metrics.activeTenants} / ${metrics.totalTenants}`, icon: Users2, color: '#eab308' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><Activity size={20} /> Platform Performance</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real operational volume across every tenant — computed live from orders, branches, and organizations</p>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Crunching numbers…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load performance data: {loadError}</div>}

      {!loading && !loadError && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(c => (
              <div key={c.label} className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: c.color + '20' }}>
                  <c.icon size={16} style={{ color: c.color }} />
                </div>
                <p className="text-2xl font-extrabold" style={{ color: theme.text }}>{c.value}</p>
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{c.label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <p className="text-sm font-bold mb-1" style={{ color: theme.text }}>Average Orders per Active Branch</p>
            <p className="text-3xl font-extrabold" style={{ color: theme.primary }}>{metrics.avgOrdersPerBranch}</p>
          </div>
        </>
      )}
    </div>
  );
}

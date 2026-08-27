import { useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', org_owner: 'Org Owner', branch_manager: 'Branch Manager',
  cashier: 'Cashier', kitchen_staff: 'Kitchen Staff', waiter: 'Waiter',
};
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ['Full access to everything in their organization'],
  org_owner: ['Full access to everything in their organization'],
  branch_manager: ['Manage staff, menu, orders, settings for their branch'],
  cashier: ['POS access, take payments, view orders'],
  kitchen_staff: ['KDS access, update order status'],
  waiter: ['Take orders, view tables'],
};

export default function SuperAdminRoles() {
  const { theme } = useTheme();
  const [distribution, setDistribution] = useState<Array<{ role: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.from('user_org_roles').select('role_name');
      if (error) { setLoadError(error.message); setLoading(false); return; }

      const counts = new Map<string, number>();
      for (const row of (data as Array<{ role_name: string }> ?? [])) {
        counts.set(row.role_name, (counts.get(row.role_name) ?? 0) + 1);
      }
      setDistribution([...counts.entries()].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count));
      setLoading(false);
    };
    load();
  }, []);

  const total = distribution.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><KeyRound size={20} /> Roles</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>How every staff role across all tenants breaks down — real counts from user_org_roles, plus what each role can do</p>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading roles…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load roles: {loadError}</div>}

      {!loading && !loadError && (
        <div className="grid gap-4 md:grid-cols-2">
          {distribution.map(({ role, count }) => (
            <div key={role} className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold" style={{ color: theme.text }}>{ROLE_LABELS[role] ?? role}</h3>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: theme.primary + '20', color: theme.primary }}>
                  {count} {count === 1 ? 'person' : 'people'} ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                </span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: theme.textMuted }}>
                {(ROLE_PERMISSIONS[role] ?? ['Custom permission set']).map((perm, i) => <li key={i}>• {perm}</li>)}
              </ul>
            </div>
          ))}
          {distribution.length === 0 && (
            <p className="text-sm text-center py-8 col-span-2" style={{ color: theme.textMuted }}>No staff role assignments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

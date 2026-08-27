import { useEffect, useState } from 'react';
import { CreditCard, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface SubRow {
  id: string;
  orgName: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  psp: string;
  billingPeriod: string;
  createdAt: string;
  paidAt: string | null;
}

const statusMeta: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  successful: { icon: CheckCircle2, color: '#22c55e' },
  pending: { icon: Clock, color: '#eab308' },
  failed: { icon: XCircle, color: '#ef4444' },
};

export default function SuperAdminSubscriptions() {
  const { theme } = useTheme();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
      if (error) { setLoadError(error.message); setLoading(false); return; }

      const rows = (data ?? []) as Array<{ id: string; org_id: string; plan: string; amount: number; currency: string; status: string; psp: string | null; billing_period: string | null; created_at: string; paid_at: string | null }>;
      const orgIds = [...new Set(rows.map(r => r.org_id))];
      const { data: orgs } = orgIds.length ? await supabase.from('organizations').select('id, name').in('id', orgIds) : { data: [] };
      const orgNameById = new Map((orgs as Array<{ id: string; name: string }> ?? []).map(o => [o.id, o.name]));

      setSubs(rows.map(r => ({
        id: r.id,
        orgName: orgNameById.get(r.org_id) ?? '—',
        plan: r.plan,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        psp: r.psp ?? 'flutterwave',
        billingPeriod: r.billing_period ?? 'monthly',
        createdAt: r.created_at,
        paidAt: r.paid_at,
      })));
      setLoading(false);
    };
    load();
  }, []);

  const totalCollected = subs.filter(s => s.status === 'successful').reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><CreditCard size={20} /> Subscriptions</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Every subscription attempt across all tenants — real rows from the subscriptions table, written by the PayUnit/Flutterwave edge functions</p>
      </div>

      <div className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <p className="text-xs font-bold uppercase" style={{ color: theme.textMuted }}>Total Collected (successful)</p>
        <p className="text-2xl font-extrabold mt-1" style={{ color: theme.primary }}>${totalCollected.toLocaleString()}</p>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading subscriptions…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load subscriptions: {loadError}</div>}

      {!loading && !loadError && (
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {['Tenant', 'Plan', 'Amount', 'Provider', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: theme.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map(s => {
                const meta = statusMeta[s.status] ?? { icon: Clock, color: theme.textMuted };
                const StatusIcon = meta.icon;
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: theme.text }}>{s.orgName}</td>
                    <td className="px-4 py-3 text-sm capitalize" style={{ color: theme.text }}>{s.plan} <span style={{ color: theme.textMuted }}>({s.billingPeriod})</span></td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: theme.text }}>{s.currency} {s.amount}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: theme.textMuted }}>{s.psp}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full capitalize" style={{ background: `${meta.color}20`, color: meta.color }}>
                        <StatusIcon size={11} /> {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: theme.textMuted }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {subs.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: theme.textMuted }}>No subscription attempts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

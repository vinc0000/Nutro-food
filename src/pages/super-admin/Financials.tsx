import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Receipt, PieChart, Download, Calendar, X, Building2, ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';

interface LedgerRow {
  date: string;
  tenant: string;
  plan: string;
  psp: string;
  amount: number;
  status: string;
}

const PLAN_MRR: Record<string, number> = { starter: 29, premium: 69, enterprise: 189 };
const PLAN_COLORS: Record<string, string> = { starter: '#94a3b8', premium: '#10B981', enterprise: '#0369A1' };

function FilterDropdown({ label, value, options, onChange, theme }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
        <span style={{ color: theme.textMuted }}>{label}:</span><span>{value}</span>
        <ChevronDown size={12} style={{ color: theme.textMuted }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 w-48 rounded-xl p-1.5 shadow-xl"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            {options.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: value === opt ? theme.primary + '15' : 'transparent', color: value === opt ? theme.primary : theme.text }}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SuperAdminFinancials() {
  const { theme } = useTheme();
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [activeOrgPlans, setActiveOrgPlans] = useState<string[]>([]);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data: subs, error: subsError } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
      if (subsError) { setLoadError(subsError.message); setLoading(false); return; }

      const subRows = (subs ?? []) as Array<{ org_id: string; plan: string; amount: number; psp: string; status: string; created_at: string; paid_at: string | null }>;
      const orgIds = Array.from(new Set(subRows.map(r => r.org_id)));
      const namesById = new Map<string, string>();
      // Batched .in() instead of one query per distinct org_id in the ledger — the
      // financial ledger can have thousands of rows across many tenants, so this
      // avoided a real N+1 slowdown on every page load.
      if (orgIds.length > 0) {
        const { data: orgNames } = await supabase.from('organizations').select('*').in('id', orgIds);
        for (const o of (orgNames ?? []) as Array<{ id: string; name: string }>) namesById.set(o.id, o.name);
      }

      setLedger(subRows.map(r => ({
        date: (r.paid_at ?? r.created_at).slice(0, 10),
        tenant: namesById.get(r.org_id) ?? r.org_id,
        plan: r.plan,
        psp: r.psp,
        amount: r.amount,
        status: r.status,
      })));

      const { data: orgs } = await supabase.from('organizations').select('*').eq('plan_status', 'active');
      setActiveOrgPlans(((orgs ?? []) as Array<{ plan: string }>).map(o => o.plan));

      setLoading(false);
    })();
  }, []);

  const filteredLedger = useMemo(() => ledger.filter(r =>
    (statusFilter === 'All' || r.status === statusFilter) &&
    r.date >= startDate && r.date <= endDate
  ), [ledger, statusFilter, startDate, endDate]);

  const totalMRR = useMemo(() => activeOrgPlans.reduce((s, p) => s + (PLAN_MRR[p] ?? 0), 0), [activeOrgPlans]);
  const totalARR = totalMRR * 12;

  const planDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of activeOrgPlans) counts[p] = (counts[p] ?? 0) + 1;
    return Object.entries(counts).map(([plan, count]) => ({ plan, count, rev: count * (PLAN_MRR[plan] ?? 0), color: PLAN_COLORS[plan] ?? theme.textMuted }));
  }, [activeOrgPlans, theme.textMuted]);

  const monthlyRevenue = useMemo(() => {
    const months: { label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString(undefined, { month: 'short' });
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const total = ledger.filter(r => r.status === 'successful' && r.date.startsWith(monthKey)).reduce((s, r) => s + r.amount, 0);
      months.push({ label, total });
    }
    return months;
  }, [ledger]);
  const maxBar = Math.max(1, ...monthlyRevenue.map(m => m.total));

  const exportCSV = () => {
    const headers = 'Date,Tenant,Plan,PSP,Amount,Status\n';
    const rows = filteredLedger.map(r => `${r.date},"${r.tenant}",${r.plan},${r.psp},${r.amount},${r.status}`).join('\n');
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nutro-financials-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Platform Financials</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real subscription ledger and MRR/ARR across every tenant, worldwide</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: theme.primary, color: '#fff' }}>
            <Receipt size={16} /> Print
          </button>
        </div>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading financials…</div>}
      {!loading && loadError && <div className="p-4 text-sm rounded-xl" style={{ background: '#ef444410', color: '#ef4444' }}>Could not load financials: {loadError}</div>}

      {!loading && !loadError && (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monthly MRR" value={`$${totalMRR.toLocaleString()}`} icon={DollarSign} color="#22c55e" />
        <StatCard title="Annual ARR" value={`$${totalARR.toLocaleString()}`} icon={TrendingUp} color="#3b82f6" />
        <StatCard title="Active Subscriptions" value={String(activeOrgPlans.length)} icon={Receipt} color="#f59e0b" />
        <StatCard title="All-time Successful Payments" value={String(ledger.filter(r => r.status === 'successful').length)} icon={PieChart} />
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-extrabold" style={{ color: theme.text }}>Successful Payments (12 months)</h2>
        </div>
        <div className="h-48 flex items-end gap-2">
          {monthlyRevenue.map((m, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(m.total / maxBar) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}
              className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg" style={{ background: i === monthlyRevenue.length - 1 ? theme.primary : theme.primary + '50', minHeight: 4 }} />
              <span className="text-[9px]" style={{ color: theme.textMuted }}>{m.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl flex flex-wrap items-center gap-3" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: theme.textMuted }} />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
          <span className="text-xs" style={{ color: theme.textMuted }}>to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        <FilterDropdown label="Status" value={statusFilter} options={['All', 'successful', 'pending', 'failed']} onChange={setStatusFilter} theme={theme} />
        <button onClick={() => { setStatusFilter('All'); setStartDate(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)); setEndDate(new Date().toISOString().slice(0, 10)); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
          <X size={12} /> Clear
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <h2 className="font-extrabold mb-4" style={{ color: theme.text }}>Revenue by Plan</h2>
          <div className="space-y-4">
            {planDist.map(p => (
              <div key={p.plan}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold capitalize" style={{ color: p.color }}>{p.plan}</span>
                  <span style={{ color: theme.text }}>${p.rev}/mo</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.bg }}>
                  <div className="h-full rounded-full" style={{ width: `${totalMRR ? (p.rev / totalMRR) * 100 : 0}%`, background: p.color }} />
                </div>
                <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{p.count} tenant{p.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
            {planDist.length === 0 && <p className="text-xs" style={{ color: theme.textMuted }}>No active paid subscriptions yet.</p>}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <h2 className="font-extrabold flex items-center gap-2" style={{ color: theme.text }}><Building2 size={16} /> Subscription Ledger</h2>
            <span className="text-xs" style={{ color: theme.textMuted }}>{filteredLedger.length} transactions</span>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr><th>Date</th><th>Tenant</th><th>Plan</th><th>PSP</th><th className="text-right">Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredLedger.map((row, i) => (
                <tr key={i}>
                  <td><span className="text-xs" style={{ color: theme.textMuted }}>{row.date}</span></td>
                  <td><span className="text-sm">{row.tenant}</span></td>
                  <td><span className="text-xs capitalize" style={{ color: theme.textMuted }}>{row.plan}</span></td>
                  <td><span className="text-xs capitalize" style={{ color: theme.textMuted }}>{row.psp}</span></td>
                  <td className="text-right"><span className="text-sm font-bold" style={{ color: theme.primary }}>${row.amount}</span></td>
                  <td><span className="badge text-[10px]" style={{ background: row.status === 'successful' ? '#22c55e20' : row.status === 'failed' ? '#ef444420' : '#eab30820', color: row.status === 'successful' ? '#22c55e' : row.status === 'failed' ? '#ef4444' : '#eab308' }}>{row.status}</span></td>
                </tr>
              ))}
              {filteredLedger.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-sm" style={{ color: theme.textMuted }}>No transactions in this range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: theme.primary }}>
          <Download size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

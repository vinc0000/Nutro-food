import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Receipt, PieChart, Download, Calendar, X, Building2, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import StatCard from '@/components/ui/StatCard';

const LEDGER = [
  { date: '2024-07-31', type: 'Subscription', tenant: 'Nile Kitchen', plan: 'Enterprise', amount: 189, status: 'paid' },
  { date: '2024-07-31', type: 'Subscription', tenant: 'Le Maison Dubai', plan: 'Enterprise', amount: 189, status: 'paid' },
  { date: '2024-07-30', type: 'Subscription', tenant: 'BurgerCraft Group', plan: 'Premium', amount: 69, status: 'paid' },
  { date: '2024-07-29', type: 'Commission', tenant: 'Marcus Osei (REP)', plan: '-', amount: -320, status: 'paid' },
  { date: '2024-07-28', type: 'Subscription', tenant: 'Spice Route', plan: 'Starter', amount: 29, status: 'paid' },
  { date: '2024-07-27', type: 'Refund', tenant: 'Casa Verde', plan: 'Premium', amount: -69, status: 'refunded' },
  { date: '2024-07-26', type: 'Subscription', tenant: 'Sakura Lounge', plan: 'Trial', amount: 0, status: 'trial' },
  { date: '2024-07-25', type: 'Setup Fee', tenant: 'Nile Kitchen', plan: 'Enterprise', amount: 500, status: 'paid' },
];

const PLAN_DIST = [
  { plan: 'Enterprise', count: 2, rev: 378, color: '#0369A1' },
  { plan: 'Premium', count: 2, rev: 138, color: '#10B981' },
  { plan: 'Starter', count: 1, rev: 29, color: '#94a3b8' },
  { plan: 'Trial', count: 1, rev: 0, color: '#8b5cf6' },
];

const REVENUE_BARS = [3200, 4100, 3800, 5200, 4900, 6100, 5800, 6400, 7200, 6800, 8100, 9200];

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
  const [startDate, setStartDate] = useState('2024-07-01');
  const [endDate, setEndDate] = useState('2024-07-31');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const filteredLedger = useMemo(() => LEDGER.filter(r =>
    (typeFilter === 'All' || r.type === typeFilter) &&
    (statusFilter === 'All' || r.status === statusFilter) &&
    r.date >= startDate && r.date <= endDate
  ), [typeFilter, statusFilter, startDate, endDate]);

  const totalMRR = 13920;
  const totalARR = 167040;
  const taxRate = 0.05;
  const maxBar = Math.max(...REVENUE_BARS);

  const exportCSV = () => {
    const headers = 'Date,Type,Tenant,Plan,Amount,Status\n';
    const rows = filteredLedger.map(r => `${r.date},${r.type},"${r.tenant}",${r.plan},${r.amount},${r.status}`).join('\n');
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
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Centralized ledger, billing logs, and revenue breakdown</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monthly MRR" value={`$${totalMRR.toLocaleString()}`} icon={DollarSign} color="#22c55e" trend={1.6} />
        <StatCard title="Annual ARR" value={`$${totalARR.toLocaleString()}`} icon={TrendingUp} color="#3b82f6" />
        <StatCard title="Est. Tax Liability" value={`$${(totalMRR * taxRate).toFixed(0)}`} icon={Receipt} color="#f59e0b" />
        <StatCard title="Net Revenue" value={`$${(totalMRR * (1 - taxRate)).toFixed(0)}`} icon={PieChart} />
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-extrabold" style={{ color: theme.text }}>Revenue Trend (12 months)</h2>
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#0369A118', color: '#0369A1' }}>+24% YoY</span>
        </div>
        <div className="h-48 flex items-end gap-2">
          {REVENUE_BARS.map((v, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(v / maxBar) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}
              className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg" style={{ background: i === REVENUE_BARS.length - 1 ? '#0369A1' : '#0369A150', minHeight: 4 }} />
              <span className="text-[9px]" style={{ color: theme.textMuted }}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</span>
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
        <FilterDropdown label="Type" value={typeFilter} options={['All', 'Subscription', 'Commission', 'Refund', 'Setup Fee']} onChange={setTypeFilter} theme={theme} />
        <FilterDropdown label="Status" value={statusFilter} options={['All', 'paid', 'refunded', 'trial']} onChange={setStatusFilter} theme={theme} />
        <button onClick={() => { setTypeFilter('All'); setStatusFilter('All'); setStartDate('2024-07-01'); setEndDate('2024-07-31'); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
          <X size={12} /> Clear
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <h2 className="font-extrabold mb-4" style={{ color: theme.text }}>Revenue by Plan</h2>
          <div className="space-y-4">
            {PLAN_DIST.map(p => (
              <div key={p.plan}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold" style={{ color: p.color }}>{p.plan}</span>
                  <span style={{ color: theme.text }}>${p.rev}/mo</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.bg }}>
                  <div className="h-full rounded-full" style={{ width: `${totalMRR ? (p.rev / totalMRR) * 100 : 0}%`, background: p.color }} />
                </div>
                <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{p.count} tenant{p.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <h2 className="font-extrabold flex items-center gap-2" style={{ color: theme.text }}><Building2 size={16} /> Transaction Ledger</h2>
            <span className="text-xs" style={{ color: theme.textMuted }}>{filteredLedger.length} transactions</span>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Tenant</th><th>Plan</th><th className="text-right">Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredLedger.map((row, i) => (
                <tr key={i}>
                  <td><span className="text-xs" style={{ color: theme.textMuted }}>{row.date}</span></td>
                  <td><span className="text-xs font-semibold">{row.type}</span></td>
                  <td><span className="text-sm">{row.tenant}</span></td>
                  <td><span className="text-xs" style={{ color: theme.textMuted }}>{row.plan}</span></td>
                  <td className="text-right"><span className="text-sm font-bold" style={{ color: row.amount >= 0 ? '#0369A1' : '#ef4444' }}>{row.amount >= 0 ? '+' : ''}${row.amount}</span></td>
                  <td><span className="badge text-[10px]" style={{ background: row.status === 'paid' ? '#22c55e20' : row.status === 'refunded' ? '#ef444420' : '#eab30820', color: row.status === 'paid' ? '#22c55e' : row.status === 'refunded' ? '#ef4444' : '#eab308' }}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: theme.primary }}>
          <Download size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

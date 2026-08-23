import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Eye, X, Printer, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSharedOrders } from '@/lib/ordersStore';
import { useOrgContext } from '@/hooks/useOrgContext';

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  preparing: { bg: '#3b82f620', text: '#3b82f6', label: 'Preparing' },
  ready: { bg: '#22c55e20', text: '#22c55e', label: 'Ready' },
  served: { bg: '#06b6d420', text: '#06b6d4', label: 'Served' },
  paid: { bg: '#6b728020', text: '#6b7280', label: 'Paid' },
};

export default function AdminOrders() {
  const { theme } = useTheme();
  const { orgContext } = useOrgContext();
  const { orders, loading, error, updateOrder } = useSharedOrders(orgContext?.branch_id ?? null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewOrder, setViewOrder] = useState<(typeof orders)[number] | null>(null);

  const filtered = useMemo(() => orders.filter(o =>
    (filterStatus === 'all' || o.status === filterStatus) &&
    (o.orderNumber.includes(search) || o.tableLabel.toLowerCase().includes(search.toLowerCase()))
  ), [filterStatus, orders, search]);

  const totals = useMemo(() => ({
    revenue: orders.filter(o => o.payment === 'paid').reduce((s, o) => s + o.total, 0),
    count: orders.length,
  }), [orders]);

  const markAsPaid = (id: string) => {
    void updateOrder(id, order => ({ ...order, status: 'paid', payment: 'paid', updatedAt: new Date().toISOString() }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: theme.text }}>Orders</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real-time order management across all tables and channels</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: 'Total Orders Today', val: totals.count, color: theme.primary },
          { label: 'Revenue Collected', val: `$${totals.revenue.toFixed(2)}`, color: '#22c55e' },
          { label: 'Pending Payment', val: orders.filter(o => o.payment === 'unpaid' && o.status !== 'cancelled').length, color: '#eab308' }].map(s => (
          <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
            className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-44"
            style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all', 'pending', 'preparing', 'ready', 'paid'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{ background: filterStatus === s ? theme.primary : theme.surface, color: filterStatus === s ? '#fff' : theme.textMuted, border: `1px solid ${filterStatus === s ? theme.primary : theme.border}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        {loading && (
          <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}>
            <Loader2 size={16} className="animate-spin" /> Loading orders…
          </div>
        )}
        {!loading && error && (
          <div className="p-4 text-sm" style={{ color: '#ef4444' }}>Could not load orders: {error}</div>
        )}
        {!loading && !error && (
        <table className="w-full data-table">
          <thead>
            <tr><th>Order</th><th>Location</th><th>Type</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th>Time</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td><span className="font-mono text-sm font-bold" style={{ color: theme.primary }}>{o.orderNumber}</span></td>
                <td><span className="text-sm">{o.tableLabel}</span></td>
                <td><span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: theme.bg, color: theme.textMuted }}>{o.type.replace('_', ' ')}</span></td>
                <td><span className="text-sm">{o.items.reduce((sum, item) => sum + item.qty, 0)}</span></td>
                <td><span className="text-sm font-semibold">${o.total.toFixed(2)}</span></td>
                <td><span className="badge text-[10px]" style={{ background: statusConfig[o.status]?.bg, color: statusConfig[o.status]?.text }}>{statusConfig[o.status]?.label}</span></td>
                <td><span className="badge text-[10px]" style={{ background: o.payment === 'paid' ? '#22c55e20' : '#eab30820', color: o.payment === 'paid' ? '#22c55e' : '#eab308' }}>{o.payment}</span></td>
                <td><span className="text-xs" style={{ color: theme.textMuted }}>{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewOrder(o)} title="View details" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><Eye size={13} /></button>
                    {o.status !== 'paid' && (
                      <button onClick={() => markAsPaid(o.id)} title="Mark as paid" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#22c55e' }}><Check size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      <AnimatePresence>
        {viewOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setViewOrder(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Order {viewOrder.orderNumber}</h2>
                <button onClick={() => setViewOrder(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Location</span><span className="font-bold" style={{ color: theme.text }}>{viewOrder.tableLabel}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Type</span><span className="font-bold capitalize" style={{ color: theme.text }}>{viewOrder.type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Items</span><span className="font-bold" style={{ color: theme.text }}>{viewOrder.items.reduce((sum, item) => sum + item.qty, 0)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Total</span><span className="font-extrabold" style={{ color: theme.primary }}>${viewOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Status</span>
                  <span className="badge text-[10px]" style={{ background: statusConfig[viewOrder.status]?.bg, color: statusConfig[viewOrder.status]?.text }}>{statusConfig[viewOrder.status]?.label}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Payment</span>
                  <span className="badge text-[10px]" style={{ background: viewOrder.payment === 'paid' ? '#22c55e20' : '#eab30820', color: viewOrder.payment === 'paid' ? '#22c55e' : '#eab308' }}>{viewOrder.payment}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Time</span><span className="font-bold" style={{ color: theme.text }}>{new Date(viewOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                {viewOrder.status !== 'paid' && (
                  <button onClick={() => { markAsPaid(viewOrder.id); setViewOrder(null); }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5" style={{ background: '#22c55e' }}>
                    <Check size={14} /> Mark as Paid
                  </button>
                )}
                <button onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setViewOrder(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

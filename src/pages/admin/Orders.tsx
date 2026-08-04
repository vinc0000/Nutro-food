/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Eye, X, Printer, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useOrgContext } from '@/hooks/useOrgContext';

interface OrderRow {
  id: string;
  table: string;
  table_id?: string | null;
  type: 'dine_in' | 'takeaway' | 'delivery';
  items: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  payment: 'unpaid' | 'partial' | 'paid' | 'refunded';
  time: string;
}

const DEFAULT_ORDERS = [
  { order_number: '1042', table_name: 'Table 4', order_type: 'dine_in', subtotal: 83.33, tax_amount: 4.17, total_amount: 87.50, status: 'preparing', payment_status: 'unpaid' },
  { order_number: '1041', table_name: 'Table 7', order_type: 'dine_in', subtotal: 135.24, tax_amount: 6.76, total_amount: 142.00, status: 'ready', payment_status: 'unpaid' },
  { order_number: '1040', table_name: 'Takeaway', order_type: 'takeaway', subtotal: 32.38, tax_amount: 1.62, total_amount: 34.00, status: 'paid', payment_status: 'paid' },
  { order_number: '1039', table_name: 'Table 2', order_type: 'dine_in', subtotal: 91.43, tax_amount: 4.57, total_amount: 96.00, status: 'paid', payment_status: 'paid' },
  { order_number: '1038', table_name: 'Table 9', order_type: 'dine_in', subtotal: 200.00, tax_amount: 10.00, total_amount: 210.00, status: 'served', payment_status: 'paid' },
];

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#3b82f620', text: '#3b82f6', label: 'Pending' },
  preparing: { bg: '#3b82f620', text: '#3b82f6', label: 'Preparing' },
  ready: { bg: '#22c55e20', text: '#22c55e', label: 'Ready' },
  served: { bg: '#06b6d420', text: '#06b6d4', label: 'Served' },
  paid: { bg: '#6b728020', text: '#6b7280', label: 'Paid' },
  completed: { bg: '#6b728020', text: '#6b7280', label: 'Completed' },
  cancelled: { bg: '#ef444420', text: '#ef4444', label: 'Cancelled' },
};

export default function AdminOrders() {
  const { theme } = useTheme();
  const { orgContext } = useOrgContext();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState<OrderRow | null>(null);
  const [savedMsg, setSavedMsg] = useState('');

  const showToast = (msg: string) => { setSavedMsg(msg); setTimeout(() => setSavedMsg(''), 2500); };

  const fetchOrders = useCallback(async () => {
    if (!orgContext?.branch_id) return;
    setLoading(true);
    try {
      let { data: dbOrders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('branch_id', orgContext.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Auto-seed if empty
      if (!dbOrders || dbOrders.length === 0) {
        const seedPayload = DEFAULT_ORDERS.map(o => ({
          branch_id: orgContext.branch_id,
          order_number: o.order_number,
          order_type: o.order_type,
          status: o.status,
          subtotal: o.subtotal,
          tax_amount: o.tax_amount,
          discount_amount: 0,
          total_amount: o.total_amount,
          payment_status: o.payment_status,
          payment_method: o.payment_status === 'paid' ? 'cash' : null,
          notes: o.table_name, // temporary place to store mock table label
        }));

        const { data: inserted, error: insErr } = await supabase
          .from('orders')
          .insert(seedPayload)
          .select('*');

        if (insErr) throw insErr;
        dbOrders = inserted || [];
      }

      const mapped: OrderRow[] = dbOrders.map((o: any) => ({
        id: o.id,
        table: o.notes || 'Table',
        table_id: o.table_id,
        type: o.order_type || 'dine_in',
        items: 3, // Mock number of items for rendering
        total: Number(o.total_amount),
        status: o.status,
        payment: o.payment_status || 'unpaid',
        time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      setOrders(mapped);
    } catch (err) {
      console.warn('Database orders fetch failed, falling back to mock data:', err);
      const mockMapped: OrderRow[] = DEFAULT_ORDERS.map((o, i) => ({
        id: `mock-order-${i}`,
        table: o.table_name || 'Table 4',
        table_id: `table-${i}`,
        type: o.order_type || 'dine_in',
        items: 3,
        total: o.total_amount,
        status: o.status,
        payment: o.payment_status,
        time: new Date(Date.now() - i * 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setOrders(mockMapped);
    } finally {
      setLoading(false);
    }
  }, [orgContext?.branch_id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter(o =>
    (filterStatus === 'all' || o.status === filterStatus) &&
    (o.id.includes(search) || o.table.toLowerCase().includes(search.toLowerCase()))
  );

  const totals = useMemo(() => {
    return {
      revenue: orders.filter(o => o.payment === 'paid').reduce((s, o) => s + o.total, 0),
      count: orders.length
    };
  }, [orders]);

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid', payment_status: 'paid', payment_method: 'cash' })
        .eq('id', id);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'paid', payment: 'paid' } : o));
      showToast('Order marked as paid');
    } catch (err) {
      console.error(err);
    }
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
          {['all', 'preparing', 'ready', 'paid'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{ background: filterStatus === s ? theme.primary : theme.surface, color: filterStatus === s ? '#fff' : theme.textMuted, border: `1px solid ${filterStatus === s ? theme.primary : theme.border}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: theme.primary }} />
          <span className="text-sm" style={{ color: theme.textMuted }}>Loading orders from database...</span>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <table className="w-full data-table">
            <thead>
              <tr><th>Order</th><th>Location</th><th>Type</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th>Time</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td><span className="font-mono text-sm font-bold text-gray-500" style={{ color: theme.primary }}>#{o.id.substring(0, 5)}</span></td>
                  <td><span className="text-sm font-semibold">{o.table}</span></td>
                  <td><span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: theme.bg, color: theme.textMuted }}>{o.type.replace('_', ' ')}</span></td>
                  <td><span className="text-sm">{o.items}</span></td>
                  <td><span className="text-sm font-semibold">${o.total.toFixed(2)}</span></td>
                  <td><span className="badge text-[10px]" style={{ background: statusConfig[o.status]?.bg || '#6b728020', color: statusConfig[o.status]?.text || '#6b7280' }}>{statusConfig[o.status]?.label || o.status}</span></td>
                  <td><span className="badge text-[10px]" style={{ background: o.payment === 'paid' ? '#22c55e20' : '#eab30820', color: o.payment === 'paid' ? '#22c55e' : '#eab308' }}>{o.payment}</span></td>
                  <td><span className="text-xs" style={{ color: theme.textMuted }}>{o.time}</span></td>
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
        </div>
      )}

      <AnimatePresence>
        {viewOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setViewOrder(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Order details</h2>
                <button onClick={() => setViewOrder(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Location</span><span className="font-bold" style={{ color: theme.text }}>{viewOrder.table}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Type</span><span className="font-bold capitalize" style={{ color: theme.text }}>{viewOrder.type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Items</span><span className="font-bold" style={{ color: theme.text }}>{viewOrder.items}</span>
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
                  <span style={{ color: theme.textMuted }}>Time</span><span className="font-bold" style={{ color: theme.text }}>{viewOrder.time}</span>
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

      {savedMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: '#22c55e' }}>
          <Check size={16} /> {savedMsg}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Eye, X, Printer, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSharedOrders, SharedOrder } from '@/lib/ordersStore';
import { useOrgContext } from '@/hooks/useOrgContext';

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  preparing: { bg: '#3b82f620', text: '#3b82f6', label: 'Preparing' },
  ready: { bg: '#22c55e20', text: '#22c55e', label: 'Ready' },
  served: { bg: '#06b6d420', text: '#06b6d4', label: 'Served' },
  paid: { bg: '#6b728020', text: '#6b7280', label: 'Paid' },
  refunded: { bg: '#ef444420', text: '#ef4444', label: 'Refunded' },
};

export default function AdminOrders() {
  const { theme } = useTheme();
  const { orgContext } = useOrgContext();
  const { orders, loading, error, updateOrder, refundOrder } = useSharedOrders(orgContext?.branch_id ?? null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewOrder, setViewOrder] = useState<SharedOrder | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<SharedOrder | null>(null);
  const [refundTarget, setRefundTarget] = useState<SharedOrder | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const filtered = useMemo(() => orders.filter(o =>
    (filterStatus === 'all' || o.status === filterStatus) &&
    (o.orderNumber.includes(search) || o.tableLabel.toLowerCase().includes(search.toLowerCase()))
  ), [filterStatus, orders, search]);

  const totals = useMemo(() => ({
    revenue: orders.filter(o => o.payment === 'paid').reduce((s, o) => s + (o.total - o.refundAmount), 0),
    refunded: orders.reduce((s, o) => s + o.refundAmount, 0),
    count: orders.length,
  }), [orders]);

  const markAsPaid = (id: string) => {
    void updateOrder(id, order => ({ ...order, status: 'paid', payment: 'paid', updatedAt: new Date().toISOString() }));
  };

  const openRefund = (order: SharedOrder) => {
    setRefundTarget(order);
    setRefundAmount((order.total - order.refundAmount).toFixed(2));
    setRefundReason('');
    setRefundError(null);
  };

  const confirmRefund = async () => {
    if (!refundTarget) return;
    const amount = parseFloat(refundAmount);
    const remaining = refundTarget.total - refundTarget.refundAmount;
    if (Number.isNaN(amount) || amount <= 0) { setRefundError('Enter a valid amount'); return; }
    if (amount > remaining) { setRefundError(`Cannot exceed the remaining refundable amount ($${remaining.toFixed(2)})`); return; }
    if (!refundReason.trim()) { setRefundError('A reason is required for the record'); return; }

    setRefundBusy(true);
    const ok = await refundOrder(refundTarget.id, amount, refundReason.trim());
    setRefundBusy(false);
    if (!ok) { setRefundError('Refund failed — you may not have permission, or the amount is invalid.'); return; }
    setRefundTarget(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: theme.text }}>Orders</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real-time order management across all tables and channels</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: 'Total Orders Today', val: totals.count, color: theme.primary },
          { label: 'Net Revenue', val: `$${totals.revenue.toFixed(2)}`, color: '#22c55e' },
          { label: 'Refunded', val: `$${totals.refunded.toFixed(2)}`, color: '#ef4444' },
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
          {['all', 'pending', 'preparing', 'ready', 'paid', 'refunded'].map(s => (
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
                <td>
                  <span className="text-sm font-semibold">${o.total.toFixed(2)}</span>
                  {o.refundAmount > 0 && <div className="text-[10px] font-semibold" style={{ color: '#ef4444' }}>-${o.refundAmount.toFixed(2)} refunded</div>}
                </td>
                <td><span className="badge text-[10px]" style={{ background: statusConfig[o.status]?.bg, color: statusConfig[o.status]?.text }}>{statusConfig[o.status]?.label ?? o.status}</span></td>
                <td><span className="badge text-[10px]" style={{ background: o.payment === 'paid' ? '#22c55e20' : '#eab30820', color: o.payment === 'paid' ? '#22c55e' : '#eab308' }}>{o.payment}</span></td>
                <td><span className="text-xs" style={{ color: theme.textMuted }}>{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewOrder(o)} title="View details" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><Eye size={13} /></button>
                    {o.payment === 'paid' && (
                      <button onClick={() => setReceiptOrder(o)} title="View / reprint receipt" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><Printer size={13} /></button>
                    )}
                    {o.status !== 'paid' && o.status !== 'refunded' && (
                      <button onClick={() => markAsPaid(o.id)} title="Mark as paid" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#22c55e' }}><Check size={13} /></button>
                    )}
                    {o.payment === 'paid' && o.refundAmount < o.total && (
                      <button onClick={() => openRefund(o)} title="Refund" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }}><RotateCcw size={13} /></button>
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
                {viewOrder.refundAmount > 0 && (
                  <div className="flex justify-between p-3 rounded-xl" style={{ background: '#ef444410' }}>
                    <span style={{ color: theme.textMuted }}>Refunded</span>
                    <span className="font-extrabold" style={{ color: '#ef4444' }}>-${viewOrder.refundAmount.toFixed(2)}{viewOrder.refundReason ? ` (${viewOrder.refundReason})` : ''}</span>
                  </div>
                )}
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Status</span>
                  <span className="badge text-[10px]" style={{ background: statusConfig[viewOrder.status]?.bg, color: statusConfig[viewOrder.status]?.text }}>{statusConfig[viewOrder.status]?.label ?? viewOrder.status}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Payment</span>
                  <span className="badge text-[10px]" style={{ background: viewOrder.payment === 'paid' ? '#22c55e20' : '#eab30820', color: viewOrder.payment === 'paid' ? '#22c55e' : '#eab308' }}>{viewOrder.payment}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Time</span><span className="font-bold" style={{ color: theme.text }}>{new Date(viewOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-5 flex-wrap">
                {viewOrder.status !== 'paid' && viewOrder.status !== 'refunded' && (
                  <button onClick={() => { markAsPaid(viewOrder.id); setViewOrder(null); }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5" style={{ background: '#22c55e' }}>
                    <Check size={14} /> Mark as Paid
                  </button>
                )}
                {viewOrder.payment === 'paid' && viewOrder.refundAmount < viewOrder.total && (
                  <button onClick={() => { openRefund(viewOrder); setViewOrder(null); }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5" style={{ background: '#ef4444' }}>
                    <RotateCcw size={14} /> Refund
                  </button>
                )}
                {viewOrder.payment === 'paid' && (
                  <button onClick={() => { setReceiptOrder(viewOrder); setViewOrder(null); }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                    <Printer size={14} /> View Receipt
                  </button>
                )}
                <button onClick={() => setViewOrder(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund modal */}
      <AnimatePresence>
        {refundTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setRefundTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: theme.text }}><RotateCcw size={18} style={{ color: '#ef4444' }} /> Refund Order {refundTarget.orderNumber}</h2>
                <button onClick={() => setRefundTarget(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  This is permanent and recorded against your account. Remaining refundable: <strong style={{ color: theme.text }}>${(refundTarget.total - refundTarget.refundAmount).toFixed(2)}</strong>
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Amount to refund</label>
                  <input type="number" min="0" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Reason (required)</label>
                  <input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="e.g. Item was cold, customer complaint..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                {refundError && <p className="text-xs" style={{ color: '#ef4444' }}>{refundError}</p>}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => void confirmRefund()} disabled={refundBusy}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#ef4444' }}>
                  {refundBusy && <Loader2 size={14} className="animate-spin" />} Confirm Refund
                </button>
                <button onClick={() => setRefundTarget(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real receipt view / reprint — reads straight from the historical order record
          (items, subtotal, tax, total, payment method, timestamp), so this is an actual
          reconstruction of what the customer received, not a screenshot of the admin
          page. Reuses the same print-isolation CSS trick as the POS's own receipt so
          printing this only outputs the 80mm receipt, never the surrounding admin UI —
          the previous "Print" button here had no such isolation and would have printed
          the whole order-history page. */}
      <AnimatePresence>
        {receiptOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setReceiptOrder(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-80 rounded-2xl p-6 print-receipt-container" style={{ background: '#fff', color: '#000' }} onClick={e => e.stopPropagation()}>
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * { visibility: hidden !important; }
                  .print-receipt-container, .print-receipt-container * { visibility: visible !important; }
                  .print-receipt-container {
                    position: absolute !important; left: 0 !important; top: 0 !important;
                    width: 80mm !important; margin: 0 !important; padding: 10px !important;
                    border: none !important; box-shadow: none !important;
                  }
                }
              `}} />
              <div className="text-center mb-4">
                <div className="text-lg font-extrabold">{orgContext?.org_name ?? 'Receipt'}</div>
                <div className="text-xs text-gray-500">Powered by Nutro</div>
                <div className="text-[10px] text-gray-500 font-bold mt-1">REPRINT</div>
              </div>
              <div className="border-t border-b border-dashed border-gray-300 py-3 mb-3 text-xs">
                <div className="flex justify-between mb-1"><span>{receiptOrder.tableLabel}</span><span>Order: {receiptOrder.orderNumber}</span></div>
                <div className="flex justify-between"><span>Date: {new Date(receiptOrder.createdAt).toLocaleString()}</span></div>
                {receiptOrder.paymentMethod && (
                  <div className="flex justify-between mt-1"><span>Payment: {receiptOrder.paymentMethod.replace('_', ' ').toUpperCase()}</span></div>
                )}
              </div>
              <div className="space-y-1 mb-3 text-xs">
                {receiptOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.qty}x {item.name}</span>
                    <span>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-300 pt-3 text-xs space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>${receiptOrder.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>${receiptOrder.tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>${receiptOrder.total.toFixed(2)}</span></div>
                {receiptOrder.refundAmount > 0 && (
                  <div className="flex justify-between text-red-600"><span>Refunded{receiptOrder.refundReason ? ` (${receiptOrder.refundReason})` : ''}</span><span>-${receiptOrder.refundAmount.toFixed(2)}</span></div>
                )}
              </div>
              <div className="text-center mt-4 text-[10px] text-gray-500">
                <p>Thank you for dining with us!</p>
              </div>
              <div className="flex gap-2 mt-4 print:hidden">
                <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5" style={{ background: theme.primary }}>
                  <Printer size={14} /> Reprint
                </button>
                <button onClick={() => setReceiptOrder(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: '#f5f5f5', color: '#666' }}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

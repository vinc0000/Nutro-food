import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, Users, TrendingUp, ArrowUpRight, ChefHat, Tablet, Monitor, Plus, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgContext, usePlanInfo } from '@/hooks/useOrgContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';

interface OrderRow {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  total_amount: number;
  created_at: string;
  table_id: string | null;
}

const statusStyle: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#3b82f620', text: '#3b82f6' },
  preparing: { bg: '#3b82f620', text: '#3b82f6' },
  ready: { bg: '#22c55e20', text: '#22c55e' },
  paid: { bg: '#6b728020', text: '#6b7280' },
  completed: { bg: '#6b728020', text: '#6b7280' },
  cancelled: { bg: '#ef444420', text: '#ef4444' },
};

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { orgContext } = useOrgContext();
  const { isTrialActive, daysLeft, isTrialExpired } = usePlanInfo();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [activeTables, setActiveTables] = useState(0);
  const [totalTables, setTotalTables] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgContext?.branch_id) return;
    const fetchData = async () => {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const branchId = orgContext.branch_id;

      const [ordersRes, tablesRes] = await Promise.all([
        supabase.from('orders').select('id, order_number, order_type, status, total_amount, created_at, table_id')
          .eq('branch_id', branchId).order('created_at', { ascending: false }).limit(10),
        supabase.from('restaurant_tables').select('id, status').eq('branch_id', branchId),
      ]);

      if (ordersRes.data) {
        setOrders(ordersRes.data as OrderRow[]);
        const todays = ordersRes.data.filter(o => new Date(o.created_at) >= today);
        setTodayOrders(todays.length);
        setTodayRevenue(todays.reduce((sum, o) => sum + Number(o.total_amount), 0));
      }

      if (tablesRes.data) {
        setTotalTables(tablesRes.data.length);
        setActiveTables(tablesRes.data.filter(t => t.status === 'occupied' || t.status === 'seated').length);
      }

      setLoading(false);
    };
    fetchData();
  }, [orgContext?.branch_id]);

  const avgOrder = todayOrders > 0 ? todayRevenue / todayOrders : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0] ?? 'Chef'}
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
            {orgContext?.org_name ?? 'Your restaurant'} · {orgContext?.branch_name ?? 'Main Branch'}
          </p>
        </div>
        <Link to="/app/admin/menu" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
          <Plus size={16} /> Add Menu Item
        </Link>
      </div>

      {(isTrialActive || isTrialExpired) && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{
          background: isTrialExpired ? '#ef444410' : (daysLeft <= 3 ? '#eab30810' : theme.primary + '08'),
          border: `1px solid ${isTrialExpired ? '#ef444430' : (daysLeft <= 3 ? '#eab30830' : theme.primary + '20')}`,
        }}>
          {isTrialExpired ? <AlertTriangle size={16} style={{ color: '#ef4444' }} /> : <Clock size={16} style={{ color: daysLeft <= 3 ? '#eab308' : theme.primary }} />}
          <p className="text-sm" style={{ color: theme.text }}>
            {isTrialExpired ? (
              <><span className="font-bold" style={{ color: '#ef4444' }}>Trial expired.</span> Choose a plan to continue. </>
            ) : (
              <><span className="font-bold" style={{ color: daysLeft <= 3 ? '#eab308' : theme.primary }}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span> in your free trial. </>
            )}
            <Link to="/app/admin/settings" className="ml-1 font-bold underline" style={{ color: theme.primary }}>View plans →</Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Today's Revenue", value: loading ? '—' : `$${todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, trend: 12, color: '#22c55e', delay: 0 },
          { title: "Today's Orders", value: loading ? '—' : todayOrders, icon: ShoppingBag, trend: 8, delay: 0.05 },
          { title: 'Avg Order Value', value: loading ? '—' : `$${avgOrder.toFixed(2)}`, icon: TrendingUp, color: '#3b82f6', delay: 0.1 },
          { title: 'Active Tables', value: loading ? '—' : `${activeTables} / ${totalTables}`, icon: Users, color: '#f59e0b', delay: 0.15 },
        ].map(s => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.delay }}>
            <StatCard {...s} sub="" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open POS', desc: 'Start taking orders', to: '/app/pos', icon: Monitor, color: '#3b82f6', external: true },
          { label: 'Kitchen Display', desc: 'View KDS board', to: '/app/kds', icon: ChefHat, color: '#f59e0b', external: true },
          { label: 'Tablet Preview', desc: 'Customer-facing menu', to: '/app/tablet', icon: Tablet, color: '#8b5cf6', external: true },
        ].map(item =>
          item.external ? (
            <a key={item.label} href={item.to} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:-translate-y-0.5"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.color + '18' }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: theme.text }}>{item.label}</div>
                <div className="text-xs" style={{ color: theme.textMuted }}>{item.desc}</div>
              </div>
              <ArrowUpRight size={14} className="ml-auto" style={{ color: theme.textMuted }} />
            </a>
          ) : (
            <Link key={item.label} to={item.to} className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:-translate-y-0.5"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.color + '18' }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: theme.text }}>{item.label}</div>
                <div className="text-xs" style={{ color: theme.textMuted }}>{item.desc}</div>
              </div>
              <ArrowUpRight size={14} className="ml-auto" style={{ color: theme.textMuted }} />
            </Link>
          )
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <h2 className="font-bold" style={{ color: theme.text }}>Recent Orders</h2>
            <Link to="/app/admin/orders" className="text-xs font-semibold flex items-center gap-1" style={{ color: theme.primary }}>View all <ArrowUpRight size={12} /></Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: theme.textMuted }}>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: theme.textMuted }}>No orders yet. Start taking orders from the POS terminal.</div>
          ) : (
            <table className="w-full data-table">
              <thead><tr><th>Order</th><th>Type</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><span className="text-sm font-mono font-bold" style={{ color: theme.primary }}>#{o.order_number}</span></td>
                    <td><span className="text-sm capitalize">{o.order_type.replace('_', ' ')}</span></td>
                    <td><span className="text-sm font-semibold">${Number(o.total_amount).toFixed(2)}</span></td>
                    <td><span className="badge text-[10px]" style={{ background: statusStyle[o.status]?.bg ?? '#6b728020', color: statusStyle[o.status]?.text ?? '#6b7280' }}>{o.status}</span></td>
                    <td><span className="text-xs" style={{ color: theme.textMuted }}>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <h2 className="font-bold mb-4" style={{ color: theme.text }}>Hourly Revenue</h2>
          <div className="h-36 flex items-end gap-1.5">
            {[80, 120, 200, 180, 320, 420, 380, 510, 480, 390, 280, 220].map((v, i) => {
              const max = 510; const h = (v / max) * 100; const hour = 8 + i;
              const isCurrent = hour === new Date().getHours();
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md transition-all" style={{ height: `${h}%`, minHeight: 2, background: isCurrent ? theme.primary : theme.primary + '40' }} />
                  <span className="text-[9px]" style={{ color: theme.textMuted }}>{hour}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: `1px solid ${theme.border}` }}>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: theme.primary }}>${todayRevenue.toFixed(0)}</div>
              <div className="text-xs" style={{ color: theme.textMuted }}>Today Total</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: theme.text }}>12–2 PM</div>
              <div className="text-xs" style={{ color: theme.textMuted }}>Peak Hours</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

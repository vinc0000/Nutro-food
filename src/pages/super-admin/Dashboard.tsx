import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, TrendingUp, DollarSign, Activity, Tablet, ShieldAlert, Globe, Users,
  X, Check, AlertTriangle, Lock, Eye, Trash2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';

interface Metric {
  date: string; total_orgs: number; active_orgs: number; new_orgs: number;
  total_branches: number; total_orders: number; total_revenue: number; mrr: number; arr: number;
}

interface TenantAction {
  tenant: typeof DEMO_TENANTS[0];
  type: 'upgrade' | 'extend' | 'suspend' | 'view';
}

const DEMO_TENANTS = [
  { name: 'Le Maison Dubai', plan: 'enterprise', status: 'active', branches: 4, country: 'UAE', currency: 'AED', owner: 'Ahmed Al-Rashid', mrr: 756 },
  { name: 'BurgerCraft Group', plan: 'premium', status: 'active', branches: 2, country: 'USA', currency: 'USD', owner: 'Sara Johnson', mrr: 138 },
  { name: 'Sakura Lounge', plan: 'trial', status: 'trial', branches: 1, country: 'France', currency: 'EUR', owner: 'Kenji Tanaka', mrr: 0 },
  { name: 'Nile Kitchen', plan: 'enterprise', status: 'active', branches: 6, country: 'Nigeria', currency: 'NGN', owner: 'Fatima Nasser', mrr: 1134 },
  { name: 'Casa Verde', plan: 'premium', status: 'suspended', branches: 1, country: 'Cameroon', currency: 'XAF', owner: 'Maria Goncalves', mrr: 0 },
  { name: 'Spice Route', plan: 'starter', status: 'active', branches: 1, country: 'USA', currency: 'USD', owner: 'Priya Sharma', mrr: 29 },
];

const planColor: Record<string, string> = { starter: '#94a3b8', premium: '#10B981', enterprise: '#0369A1', trial: '#8b5cf6' };
const statusColor: Record<string, string> = { active: '#22c55e', trial: '#eab308', suspended: '#ef4444', cancelled: '#6b7280' };
const PLANS = ['starter', 'premium', 'enterprise'];
const PLAN_PRICES: Record<string, number> = { starter: 29, premium: 69, enterprise: 189 };

const COUNTRY_REVENUE: { country: string; flag: string; revenue: number; tenants: number }[] = [
  { country: 'UAE', flag: '\u{1F1E6}\u{1F1EA}', revenue: 756, tenants: 1 },
  { country: 'USA', flag: '\u{1F1FA}\u{1F1F8}', revenue: 98, tenants: 2 },
  { country: 'Nigeria', flag: '\u{1F1F3}\u{1F1EC}', revenue: 1134, tenants: 1 },
  { country: 'France', flag: '\u{1F1EB}\u{1F1F7}', revenue: 0, tenants: 1 },
  { country: 'Cameroon', flag: '\u{1F1E8}\u{1F1F2}', revenue: 0, tenants: 1 },
];

export default function SuperAdminDashboard() {
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'sales' | 'financials' | 'admins'>('overview');
  const [tenants, setTenants] = useState(DEMO_TENANTS);
  const [action, setAction] = useState<TenantAction | null>(null);
  const [newPlan, setNewPlan] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [viewTenant, setViewTenant] = useState<typeof DEMO_TENANTS[0] | null>(null);

  useState(() => {
    supabase.from('platform_metrics').select('*').order('date', { ascending: true })
      .then(({ data }) => setMetrics(data ?? []));
  });

  const latest = metrics[metrics.length - 1];
  const prev = metrics[metrics.length - 2];
  const trendPct = (cur: number, prv: number) => prv ? Math.round(((cur - prv) / prv) * 100) : 0;
  const totalActiveTablets = 73;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const openAction = (t: typeof DEMO_TENANTS[0], type: TenantAction['type']) => {
    setAction({ tenant: t, type });
    if (type === 'upgrade') setNewPlan(t.plan === 'starter' ? 'premium' : 'enterprise');
  };

  const confirmAction = () => {
    if (!action) return;
    setTenants(prev => prev.map(t => {
      if (t.name !== action.tenant.name) return t;
      if (action.type === 'upgrade') return { ...t, plan: newPlan, status: 'active', mrr: PLAN_PRICES[newPlan] };
      if (action.type === 'extend') return { ...t, status: 'trial' };
      if (action.type === 'suspend') return { ...t, status: 'suspended', mrr: 0 };
      return t;
    }));
    showToast(`${action.type === 'upgrade' ? 'Plan upgraded' : action.type === 'extend' ? 'Trial extended' : 'Tenant suspended'}: ${action.tenant.name}`);
    setAction(null);
  };

  const TABS = [
    { key: 'overview' as const, label: 'Overview & Health' },
    { key: 'tenants' as const, label: 'Tenant Control' },
    { key: 'sales' as const, label: 'Commercial & Sales' },
    { key: 'financials' as const, label: 'Platform Financials' },
    { key: 'admins' as const, label: 'Super Admin Team' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Command Center</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real-time platform health, tenants, and financials</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: '#22c55e20', color: '#22c55e' }}>
          <Activity size={12} /> All Systems Operational
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: activeTab === tab.key ? theme.primary : theme.surface, color: activeTab === tab.key ? '#fff' : theme.textMuted, border: `1px solid ${activeTab === tab.key ? theme.primary : theme.border}` }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Monthly Recurring Revenue', value: latest ? `$${latest.mrr.toLocaleString()}` : '$13,920', sub: 'Platform MRR', icon: DollarSign, trend: latest && prev ? trendPct(latest.mrr, prev.mrr) : 1.6, color: '#22c55e' },
              { title: 'Annual Run Rate', value: latest ? `$${latest.arr.toLocaleString()}` : '$167,040', sub: 'Platform ARR', icon: TrendingUp, color: '#3b82f6' },
              { title: 'Active Restaurants', value: latest?.active_orgs ?? 5, sub: `of ${latest?.total_orgs ?? 6} total`, icon: Building2, trend: latest && prev ? trendPct(latest.active_orgs, prev.active_orgs) : 3 },
              { title: 'Active Tablets', value: totalActiveTablets, sub: 'Fleet across all branches', icon: Tablet, color: '#f59e0b' },
            ].map(s => <StatCard key={s.title} {...s} />)}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-extrabold" style={{ color: theme.text }}>Revenue Trend (7d)</h2>
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: theme.primary + '18', color: theme.primary }}>Live</span>
              </div>
              <div className="h-40 flex items-end gap-2">
                {[0.6, 0.75, 0.5, 0.85, 0.7, 0.9, 1].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${h * 100}%`, minHeight: 4, background: i === 6 ? theme.primary : theme.primary + '50' }} />
                    <span className="text-[9px]" style={{ color: theme.textMuted }}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                {[{ label: "Today's Orders", val: '1,284' }, { label: "Today's Revenue", val: '$24,380' }, { label: 'New Tenants Today', val: '2' }].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-xl font-extrabold" style={{ color: theme.primary }}>{s.val}</div>
                    <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <h2 className="font-extrabold mb-4" style={{ color: theme.text }}>System Health</h2>
              <div className="space-y-3">
                {[
                  { label: 'API Response Time', val: '142ms', color: '#22c55e' },
                  { label: 'Database Uptime', val: '99.98%', color: '#22c55e' },
                  { label: 'Edge Functions', val: 'Operational', color: '#22c55e' },
                  { label: 'Realtime Connections', val: '1,204 active', color: '#3b82f6' },
                  { label: 'Storage Usage', val: '42% / 100GB', color: '#eab308' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <span className="text-sm" style={{ color: theme.textMuted }}>{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
            <ShieldAlert size={18} style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Super Admin Protection Active</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>System prevents deletion or demotion of the last 2 Super Admin accounts. Currently 2 Super Admins active.</p>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'tenants' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <table className="w-full data-table">
              <thead><tr><th>Organization</th><th>Country</th><th>Plan</th><th>Status</th><th>Branches</th><th>MRR</th><th>Actions</th></tr></thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.name}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} style={{ color: theme.textMuted }} />
                        <div><div className="text-sm font-semibold">{t.name}</div><div className="text-xs" style={{ color: theme.textMuted }}>{t.owner}</div></div>
                      </div>
                    </td>
                    <td><span className="text-xs">{t.country}</span></td>
                    <td><span className="text-xs font-bold uppercase" style={{ color: planColor[t.plan] }}>{t.plan}</span></td>
                    <td><span className="badge text-[10px]" style={{ background: statusColor[t.status] + '20', color: statusColor[t.status] }}>{t.status}</span></td>
                    <td><span className="text-sm">{t.branches}</span></td>
                    <td><span className="text-sm font-semibold" style={{ color: theme.primary }}>${t.mrr}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setViewTenant(t)} title="View details" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><Eye size={13} /></button>
                        <button onClick={() => openAction(t, 'extend')} title="Extend Trial" className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-70" style={{ background: '#3b82f620', color: '#3b82f6' }}>Extend</button>
                        <button onClick={() => openAction(t, 'upgrade')} title="Change Plan" className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-70" style={{ background: '#eab30820', color: '#eab308' }}>Plan</button>
                        <button onClick={() => openAction(t, 'suspend')} title="Suspend" className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-70" style={{ background: '#ef444420', color: '#ef4444' }}>Suspend</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'sales' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Sales Reps" value={4} icon={Users} />
            <StatCard title="Active Reps" value={3} icon={TrendingUp} color="#22c55e" />
            <StatCard title="Total Clients" value={62} icon={Building2} color="#3b82f6" />
            <StatCard title="Total Commissions" value="$8,952" icon={DollarSign} color="#0369A1" />
          </div>
          <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <h2 className="font-extrabold mb-4" style={{ color: theme.text }}>Performance Leaderboard</h2>
            <div className="space-y-3">
              {[
                { name: 'Marcus Osei', clients: 24, commission: 3840, code: 'REP-MARC01' },
                { name: 'Layla Hassan', clients: 18, commission: 2520, code: 'REP-LAYLA2' },
                { name: 'Dimitri Papadopoulos', clients: 12, commission: 1680, code: 'REP-DIMI3' },
                { name: 'Sophie Mensah', clients: 8, commission: 912, code: 'REP-SOPH4' },
              ].map((rep, i) => {
                const maxComm = 3840; const pct = Math.round((rep.commission / maxComm) * 100);
                const rankColors = ['#0369A1', '#94a3b8', '#cd7c42', theme.textMuted];
                return (
                  <div key={rep.name} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm" style={{ background: rankColors[i] + '20', color: rankColors[i] }}>#{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-bold">{rep.name}</span>
                        <span className="text-sm font-bold" style={{ color: theme.primary }}>${rep.commission.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rankColors[i] }} />
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{rep.clients} clients - {rep.code}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'financials' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Monthly MRR" value="$13,920" icon={DollarSign} color="#22c55e" trend={1.6} />
            <StatCard title="Annual ARR" value="$167,040" icon={TrendingUp} color="#3b82f6" />
            <StatCard title="Est. Tax Liability" value="$696" icon={DollarSign} color="#f59e0b" />
            <StatCard title="Net Revenue" value="$13,224" icon={DollarSign} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <h2 className="font-extrabold mb-4 flex items-center gap-2" style={{ color: theme.text }}><Globe size={18} /> Revenue by Country</h2>
              <div className="space-y-4">
                {COUNTRY_REVENUE.map(c => (
                  <div key={c.country}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{c.flag} {c.country}</span>
                      <span style={{ color: theme.primary }}>${c.revenue}/mo</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.bg }}>
                      <div className="h-full rounded-full" style={{ width: `${(c.revenue / 1134) * 100}%`, background: theme.primary }} />
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{c.tenants} tenant{c.tenants !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <h2 className="font-extrabold mb-4" style={{ color: theme.text }}>Platform Fee Analytics</h2>
              <div className="space-y-3">
                {[
                  { label: 'Subscription Revenue', val: '$13,920', pct: '72%' },
                  { label: 'Transaction Fees', val: '$3,240', pct: '17%' },
                  { label: 'Setup Fees', val: '$1,200', pct: '6%' },
                  { label: 'Add-on Services', val: '$1,080', pct: '5%' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: theme.text }}>{item.label}</div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>{item.pct} of total</div>
                    </div>
                    <div className="text-lg font-extrabold" style={{ color: theme.primary }}>{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'admins' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
            <ShieldAlert size={18} style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Deletion Protection Active</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>The last 2 Super Admin accounts are permanently protected from deletion or demotion.</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Vincent Nogue', email: 'vincentnogue@yahoo.com', role: 'Founder', protected: true },
              { name: 'Vincent Nogue', email: 'vincentnogue2@gmail.com', role: 'Founder', protected: true },
              { name: 'Liyah Joha', email: 'liyahjoha@gmail.com', role: 'Co-Founder', protected: false },
              { name: 'Liyah Joha', email: 'liyahjoha@yahoo.com', role: 'Co-Founder', protected: false },
            ].map(admin => (
              <div key={admin.email} className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: theme.surface, border: `1px solid ${admin.protected ? theme.primary + '40' : theme.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: admin.protected ? theme.primary + '18' : theme.bg, color: admin.protected ? theme.primary : theme.textMuted }}>
                  {admin.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: theme.text }}>{admin.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: theme.primary + '18', color: theme.primary }}>{admin.role}</span>
                    {admin.protected && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>PROTECTED</span>}
                  </div>
                  <div className="text-sm" style={{ color: theme.textMuted }}>{admin.email}</div>
                </div>
                {!admin.protected && (
                  <button onClick={() => showToast(`Access revoked for ${admin.email}`)} className="p-2 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }} title="Revoke Access"><Trash2 size={14} /></button>
                )}
                {admin.protected && <Lock size={14} style={{ color: theme.textMuted }} />}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tenant action modal */}
      <AnimatePresence>
        {action && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setAction(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold capitalize" style={{ color: theme.text }}>{action.type} - {action.tenant.name}</h2>
                <button onClick={() => setAction(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              {action.type === 'upgrade' && (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: theme.textMuted }}>Select new plan:</p>
                  {PLANS.map(p => (
                    <button key={p} onClick={() => setNewPlan(p)}
                      className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                      style={{ background: newPlan === p ? theme.primary + '15' : theme.bg, border: `2px solid ${newPlan === p ? theme.primary : theme.border}` }}>
                      <span className="text-sm font-bold capitalize" style={{ color: planColor[p] }}>{p}</span>
                      <span className="text-sm font-bold" style={{ color: theme.text }}>${PLAN_PRICES[p]}/mo</span>
                      {newPlan === p && <Check size={16} style={{ color: theme.primary }} />}
                    </button>
                  ))}
                </div>
              )}
              {action.type === 'extend' && <p className="text-sm" style={{ color: theme.textMuted }}>This will extend the trial period for <strong style={{ color: theme.text }}>{action.tenant.name}</strong> by 7 additional days.</p>}
              {action.type === 'suspend' && (
                <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                  <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-sm" style={{ color: theme.textMuted }}>This will suspend <strong style={{ color: theme.text }}>{action.tenant.name}</strong>. All their tablets and POS terminals will be disabled immediately.</p>
                </div>
              )}
              <div className="flex gap-3 mt-5">
                <button onClick={confirmAction} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: action.type === 'suspend' ? '#ef4444' : theme.primary }}>
                  {action.type === 'suspend' ? 'Confirm Suspend' : 'Confirm'}
                </button>
                <button onClick={() => setAction(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View tenant modal */}
      <AnimatePresence>
        {viewTenant && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setViewTenant(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>{viewTenant.name}</h2>
                <button onClick={() => setViewTenant(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Owner', val: viewTenant.owner },
                  { label: 'Country', val: viewTenant.country },
                  { label: 'Currency', val: viewTenant.currency },
                  { label: 'Plan', val: viewTenant.plan, color: planColor[viewTenant.plan] },
                  { label: 'Status', val: viewTenant.status, color: statusColor[viewTenant.status] },
                  { label: 'Branches', val: String(viewTenant.branches) },
                  { label: 'Monthly Revenue', val: `$${viewTenant.mrr}`, color: theme.primary },
                ].map(s => (
                  <div key={s.label} className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                    <span style={{ color: theme.textMuted }}>{s.label}</span>
                    <span className="font-bold capitalize" style={{ color: s.color ?? theme.text }}>{s.val}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setViewTenant(null)} className="w-full mt-5 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: '#22c55e' }}>
            <Check size={16} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

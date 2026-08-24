import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, ArrowUpCircle, RefreshCw, ShieldBan, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface Tenant {
  id: string; name: string; plan: string; status: string; branches: number; mrr: number; owner: string; joined: string;
}

const statusColor: Record<string, { bg: string; text: string }> = {
  active: { bg: '#22c55e20', text: '#22c55e' }, trial: { bg: '#eab30820', text: '#eab308' },
  suspended: { bg: '#ef444420', text: '#ef4444' }, cancelled: { bg: '#6b728020', text: '#6b7280' },
};
const planColor: Record<string, string> = { starter: '#94a3b8', premium: '#10B981', enterprise: '#0369A1', trial: '#8b5cf6' };
const PLANS = ['starter', 'premium', 'enterprise'];
const PLAN_MRR: Record<string, number> = { starter: 29, premium: 69, enterprise: 189, trial: 0 };

export default function SuperAdminTenants() {
  const { theme } = useTheme();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionTenant, setActionTenant] = useState<Tenant | null>(null);
  const [actionType, setActionType] = useState<'upgrade' | 'extend' | 'suspend' | null>(null);
  const [newPlan, setNewPlan] = useState('');
  const [busy, setBusy] = useState(false);

  const loadTenants = async () => {
    setLoading(true);
    setLoadError(null);
    const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
    if (orgsError) { setLoadError(orgsError.message); setLoading(false); return; }

    const orgRows = (orgs ?? []) as Array<{ id: string; name: string; plan: string; plan_status: string; owner_id: string | null; created_at: string }>;
    const { data: allBranches } = await supabase.from('branches').select('*');
    const branchRows = (allBranches ?? []) as Array<{ org_id: string }>;
    const branchCountByOrg = new Map<string, number>();
    for (const b of branchRows) branchCountByOrg.set(b.org_id, (branchCountByOrg.get(b.org_id) ?? 0) + 1);

    const withOwners = await Promise.all(orgRows.map(async (o) => {
      let ownerName = '—';
      if (o.owner_id) {
        const { data: ownerProfile } = await supabase.from('profiles').select('*').eq('id', o.owner_id).maybeSingle<{ full_name: string | null; email: string | null }>();
        ownerName = ownerProfile?.full_name ?? ownerProfile?.email ?? '—';
      }
      return {
        id: o.id,
        name: o.name,
        plan: o.plan,
        status: o.plan_status,
        branches: branchCountByOrg.get(o.id) ?? 0,
        mrr: o.plan_status === 'active' ? (PLAN_MRR[o.plan] ?? 0) : 0,
        owner: ownerName,
        joined: o.created_at,
      };
    }));

    setTenants(withOwners);
    setLoading(false);
  };

  useEffect(() => { void loadTenants(); }, []);

  const filtered = tenants.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.owner.toLowerCase().includes(search.toLowerCase()))
  );

  const openAction = (t: Tenant, type: 'upgrade' | 'extend' | 'suspend') => {
    setActionTenant(t); setActionType(type);
    if (type === 'upgrade') setNewPlan(t.plan === 'starter' ? 'premium' : 'enterprise');
  };

  const confirmAction = async () => {
    if (!actionTenant || !actionType) return;
    setBusy(true);
    let patch: Record<string, unknown> = {};
    if (actionType === 'upgrade') patch = { plan: newPlan, plan_status: 'active' };
    if (actionType === 'suspend') patch = { plan_status: 'suspended' };
    if (actionType === 'extend') {
      const extended = new Date(Date.now() + 7 * 86400000).toISOString();
      patch = { trial_ends_at: extended, plan_status: 'trial' };
    }
    const { error } = await supabase.from('organizations').update(patch as never).eq('id', actionTenant.id);
    setBusy(false);
    if (error) { setLoadError(error.message); return; }
    setActionTenant(null); setActionType(null);
    void loadTenants();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Tenants & Subscriptions</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Manage restaurant accounts, plans, and billing — platform-wide, real data</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: 'Total Tenants', val: tenants.length, color: theme.primary },
          { label: 'Active', val: tenants.filter(t => t.status === 'active').length, color: '#22c55e' },
          { label: 'On Trial', val: tenants.filter(t => t.status === 'trial').length, color: '#eab308' },
          { label: 'Suspended', val: tenants.filter(t => t.status === 'suspended').length, color: '#ef4444' }].map(s => (
          <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        <div className="flex gap-1">
          {['all', 'active', 'trial', 'suspended'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{ background: filterStatus === s ? theme.primary : theme.surface, color: filterStatus === s ? '#fff' : theme.textMuted, border: `1px solid ${filterStatus === s ? theme.primary : theme.border}` }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading tenants…</div>}
        {!loading && loadError && <div className="p-4 text-sm" style={{ color: '#ef4444' }}>Could not load tenants: {loadError}</div>}
        {!loading && !loadError && (
        <table className="w-full data-table">
          <thead><tr><th>Organization</th><th>Plan</th><th>Status</th><th>Branches</th><th>MRR</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((t, i) => (
              <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.bg }}><Building2 size={14} style={{ color: theme.textMuted }} /></div>
                    <div><div className="text-sm font-semibold" style={{ color: theme.text }}>{t.name}</div><div className="text-xs" style={{ color: theme.textMuted }}>{t.owner}</div></div>
                  </div>
                </td>
                <td><span className="text-xs font-bold uppercase" style={{ color: planColor[t.plan] }}>{t.plan}</span></td>
                <td><span className="badge text-[10px]" style={{ background: statusColor[t.status]?.bg, color: statusColor[t.status]?.text }}>{t.status}</span></td>
                <td><span className="text-sm">{t.branches}</span></td>
                <td><span className="text-sm font-semibold" style={{ color: theme.primary }}>${t.mrr}</span></td>
                <td><span className="text-xs" style={{ color: theme.textMuted }}>{new Date(t.joined).toLocaleDateString()}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openAction(t, 'upgrade')} title="Upgrade Plan" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#22c55e' }}><ArrowUpCircle size={14} /></button>
                    <button onClick={() => openAction(t, 'extend')} title="Extend Trial" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#3b82f6' }}><RefreshCw size={14} /></button>
                    <button onClick={() => openAction(t, 'suspend')} title="Suspend" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }}><ShieldBan size={14} /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-sm" style={{ color: theme.textMuted }}>No tenants found.</td></tr>}
          </tbody>
        </table>
        )}
      </div>

      <AnimatePresence>
        {actionTenant && actionType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setActionTenant(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold capitalize" style={{ color: theme.text }}>{actionType} - {actionTenant.name}</h2>
                <button onClick={() => setActionTenant(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              {actionType === 'upgrade' && (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: theme.textMuted }}>Select new plan:</p>
                  {PLANS.map(p => (
                    <button key={p} onClick={() => setNewPlan(p)}
                      className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                      style={{ background: newPlan === p ? theme.primary + '15' : theme.bg, border: `2px solid ${newPlan === p ? theme.primary : theme.border}` }}>
                      <span className="text-sm font-bold capitalize" style={{ color: planColor[p] }}>{p}</span>
                      <span className="text-sm font-bold" style={{ color: theme.text }}>${PLAN_MRR[p]}/mo</span>
                      {newPlan === p && <Check size={16} style={{ color: theme.primary }} />}
                    </button>
                  ))}
                </div>
              )}
              {actionType === 'extend' && <p className="text-sm" style={{ color: theme.textMuted }}>This will extend the trial period for <strong style={{ color: theme.text }}>{actionTenant.name}</strong> by 7 additional days.</p>}
              {actionType === 'suspend' && (
                <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                  <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-sm" style={{ color: theme.textMuted }}>This will suspend <strong style={{ color: theme.text }}>{actionTenant.name}</strong>. Their staff will be redirected to the billing page until reactivated.</p>
                </div>
              )}
              <div className="flex gap-3 mt-5">
                <button onClick={() => void confirmAction()} disabled={busy} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: actionType === 'suspend' ? '#ef4444' : theme.primary }}>
                  {busy && <Loader2 size={14} className="animate-spin" />} {actionType === 'suspend' ? 'Confirm Suspend' : 'Confirm'}
                </button>
                <button onClick={() => setActionTenant(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

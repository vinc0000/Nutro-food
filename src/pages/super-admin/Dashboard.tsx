import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, TrendingUp, DollarSign, Activity, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';

const PLAN_MRR: Record<string, number> = { starter: 29, premium: 69, enterprise: 189 };

export default function SuperAdminDashboard() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalOrgs, setTotalOrgs] = useState(0);
  const [activeOrgs, setActiveOrgs] = useState(0);
  const [trialOrgs, setTrialOrgs] = useState(0);
  const [totalBranches, setTotalBranches] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [superAdminCount, setSuperAdminCount] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      const [orgsResult, branchesResult, adminsResult] = await Promise.all([
        supabase.from('organizations').select('*'),
        supabase.from('branches').select('*'),
        supabase.from('profiles').select('*').eq('system_role', 'super_admin'),
      ]);
      if (orgsResult.error) { setLoadError(orgsResult.error.message); setLoading(false); return; }

      const orgs = (orgsResult.data ?? []) as Array<{ plan: string; plan_status: string }>;
      setTotalOrgs(orgs.length);
      setActiveOrgs(orgs.filter(o => o.plan_status === 'active').length);
      setTrialOrgs(orgs.filter(o => o.plan_status === 'trial').length);
      setMrr(orgs.filter(o => o.plan_status === 'active').reduce((s, o) => s + (PLAN_MRR[o.plan] ?? 0), 0));
      setTotalBranches((branchesResult.data ?? []).length);
      setSuperAdminCount((adminsResult.data ?? []).length);
      setLoading(false);
    })();
  }, []);

  const arr = mrr * 12;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Command Center</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real-time platform overview, worldwide</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: '#22c55e20', color: '#22c55e' }}>
          <Activity size={12} /> Live
        </div>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading platform data…</div>}
      {!loading && loadError && <div className="p-4 text-sm rounded-xl" style={{ background: '#ef444410', color: '#ef4444' }}>Could not load dashboard: {loadError}</div>}

      {!loading && !loadError && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Monthly Recurring Revenue" value={`$${mrr.toLocaleString()}`} sub="Platform MRR" icon={DollarSign} color="#22c55e" />
            <StatCard title="Annual Run Rate" value={`$${arr.toLocaleString()}`} sub="Platform ARR" icon={TrendingUp} color="#3b82f6" />
            <StatCard title="Active Restaurants" value={activeOrgs} sub={`of ${totalOrgs} total, ${trialOrgs} on trial`} icon={Building2} />
            <StatCard title="Branches" value={totalBranches} sub="Across all tenants" icon={Building2} color="#f59e0b" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <a href="/app/super-admin/tenants" className="p-4 rounded-xl block transition-all hover:opacity-80" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="text-sm font-bold" style={{ color: theme.text }}>Manage Tenants →</div>
              <div className="text-xs mt-1" style={{ color: theme.textMuted }}>Upgrade plans, extend trials, suspend accounts</div>
            </a>
            <a href="/app/super-admin/financials" className="p-4 rounded-xl block transition-all hover:opacity-80" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="text-sm font-bold" style={{ color: theme.text }}>View Financials →</div>
              <div className="text-xs mt-1" style={{ color: theme.textMuted }}>Full subscription ledger and revenue by plan</div>
            </a>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: theme.primary + '10', border: `1px solid ${theme.primary}30` }}>
            <Activity size={18} style={{ color: theme.primary }} />
            <div>
              <p className="text-sm font-bold" style={{ color: theme.primary }}>Super Admin Access</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                {superAdminCount} account{superAdminCount !== 1 ? 's' : ''} currently hold Super Admin access, granted only via <code className="px-1 py-0.5 rounded font-mono text-xs" style={{ background: theme.bg }}>system_role</code> in the database. Manage who has access from Super Admins in the sidebar.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

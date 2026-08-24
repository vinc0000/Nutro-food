import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, DollarSign, TrendingUp, Award, Plus, Copy, Check, X, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';

interface Rep {
  id: string;
  name: string;
  email: string;
  rate: number;
  code: string;
  clients: number;
  commission: number;
}

const PLAN_MRR: Record<string, number> = { starter: 29, premium: 69, enterprise: 189 };

function randomCode(name: string) {
  const base = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'REP';
  return `REP-${base}${Math.floor(Math.random() * 90 + 10)}`;
}

export default function SuperAdminSalesReps() {
  const { theme } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRep, setNewRep] = useState({ name: '', email: '', rate: 10 });
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadReps = async () => {
    setLoading(true);
    setLoadError(null);
    const { data: repRows, error: repsError } = await supabase.from('sales_reps').select('*');
    if (repsError) { setLoadError(repsError.message); setLoading(false); return; }

    const { data: orgRows } = await supabase.from('organizations').select('*');
    const orgs = (orgRows ?? []) as Array<{ referral_code: string | null; plan: string; plan_status: string }>;

    const rows = (repRows ?? []) as Array<{ id: string; name: string; email: string | null; commission_rate: number; referral_code: string | null }>;
    setReps(rows.map(r => {
      const referred = r.referral_code ? orgs.filter(o => o.referral_code === r.referral_code) : [];
      const activeReferred = referred.filter(o => o.plan_status === 'active');
      const commission = activeReferred.reduce((s, o) => s + (PLAN_MRR[o.plan] ?? 0) * (r.commission_rate / 100), 0);
      return {
        id: r.id,
        name: r.name,
        email: r.email ?? '—',
        rate: r.commission_rate,
        code: r.referral_code ?? '—',
        clients: referred.length,
        commission,
      };
    }).sort((a, b) => b.commission - a.commission));
    setLoading(false);
  };

  useEffect(() => { void loadReps(); }, []);

  const copyCode = (code: string) => { void navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 2000); };

  const addRep = async () => {
    if (!newRep.name || !newRep.email) return;
    setBusy(true);
    const { error } = await supabase.from('sales_reps').insert({
      name: newRep.name,
      email: newRep.email,
      commission_rate: newRep.rate,
      referral_code: randomCode(newRep.name),
    } as never);
    setBusy(false);
    if (error) { setLoadError(error.message); return; }
    setShowAdd(false);
    setNewRep({ name: '', email: '', rate: 10 });
    void loadReps();
  };

  const maxComm = Math.max(1, ...reps.map(r => r.commission));
  const rankColors = ['#0369A1', '#94a3b8', '#cd7c42', theme.textMuted];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Sales & Representatives</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real referral tracking — commission is computed from actual signups using each rep's code</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
          <Plus size={16} /> Add Sales Rep
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading reps…</div>}
      {!loading && loadError && <div className="p-4 text-sm rounded-xl" style={{ background: '#ef444410', color: '#ef4444' }}>Could not load sales reps: {loadError}</div>}

      {!loading && !loadError && (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Reps" value={reps.length} icon={Users} />
        <StatCard title="Total Clients" value={reps.reduce((s, r) => s + r.clients, 0)} icon={TrendingUp} color="#3b82f6" />
        <StatCard title="Total Commissions" value={`$${reps.reduce((s, r) => s + r.commission, 0).toFixed(0)}`} icon={DollarSign} color={theme.primary} />
        <StatCard title="Avg Rate" value={reps.length ? `${(reps.reduce((s, r) => s + r.rate, 0) / reps.length).toFixed(1)}%` : '—'} icon={Award} color="#10B981" />
      </div>

      <div className="space-y-3">
        {reps.map((rep, i) => {
          const pct = Math.round((rep.commission / maxComm) * 100);
          return (
            <motion.div key={rep.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ background: (rankColors[i] ?? theme.textMuted) + '20', color: rankColors[i] ?? theme.textMuted }}>#{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color: theme.text }}>{rep.name}</span>
                  <span className="text-sm font-bold" style={{ color: theme.primary }}>${rep.commission.toFixed(0)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rankColors[i] ?? theme.textMuted }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs" style={{ color: theme.textMuted }}>{rep.clients} client{rep.clients !== 1 ? 's' : ''} - {rep.email}</span>
                  <button onClick={() => copyCode(rep.code)} className="flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-md transition-all" style={{ background: theme.bg, color: copied === rep.code ? '#22c55e' : theme.textMuted }}>
                    {copied === rep.code ? <><Check size={10} /> Copied</> : <><Copy size={10} /> {rep.code}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {reps.length === 0 && <p className="text-sm text-center py-6" style={{ color: theme.textMuted }}>No sales reps yet.</p>}
      </div>
      </>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Add Sales Rep</h2>
                <button onClick={() => setShowAdd(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Full Name</label>
                  <input value={newRep.name} onChange={e => setNewRep(p => ({ ...p, name: e.target.value }))} placeholder="John Doe"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Email</label>
                  <input value={newRep.email} onChange={e => setNewRep(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Commission Rate (%)</label>
                  <input type="number" value={newRep.rate} onChange={e => setNewRep(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => void addRep()} disabled={busy} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: theme.primary }}>
                  {busy && <Loader2 size={14} className="animate-spin" />} Add Rep
                </button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, DollarSign, TrendingUp, Award, Plus, Copy, Check, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import StatCard from '@/components/ui/StatCard';

const REPS = [
  { id: '1', name: 'Marcus Osei', email: 'marcus@liafrik.com', clients: 24, commission: 3840, rate: 12, code: 'REP-MARC01' },
  { id: '2', name: 'Layla Hassan', email: 'layla@liafrik.com', clients: 18, commission: 2520, rate: 10, code: 'REP-LAYLA2' },
  { id: '3', name: 'Dimitri Papadopoulos', email: 'dimitri@liafrik.com', clients: 12, commission: 1680, rate: 8, code: 'REP-DIMI3' },
  { id: '4', name: 'Sophie Mensah', email: 'sophie@liafrik.com', clients: 8, commission: 912, rate: 6, code: 'REP-SOPH4' },
];

export default function SuperAdminSalesReps() {
  const { theme } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRep, setNewRep] = useState({ name: '', email: '', rate: 10 });

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 2000); };
  const addRep = () => {
    if (!newRep.name || !newRep.email) return;
    setShowAdd(false);
    setNewRep({ name: '', email: '', rate: 10 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Sales & Representatives</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Manage sales reps, commissions, and client assignments</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
          <Plus size={16} /> Add Sales Rep
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Reps" value={REPS.length} icon={Users} />
        <StatCard title="Total Clients" value={REPS.reduce((s, r) => s + r.clients, 0)} icon={TrendingUp} color="#3b82f6" />
        <StatCard title="Total Commissions" value={`$${REPS.reduce((s, r) => s + r.commission, 0).toLocaleString()}`} icon={DollarSign} color="#0369A1" />
        <StatCard title="Avg Rate" value={`${(REPS.reduce((s, r) => s + r.rate, 0) / REPS.length).toFixed(1)}%`} icon={Award} color="#10B981" />
      </div>

      <div className="space-y-3">
        {REPS.map((rep, i) => {
          const maxComm = 3840; const pct = Math.round((rep.commission / maxComm) * 100);
          const rankColors = ['#0369A1', '#94a3b8', '#cd7c42', theme.textMuted];
          return (
            <motion.div key={rep.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ background: rankColors[i] + '20', color: rankColors[i] }}>#{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color: theme.text }}>{rep.name}</span>
                  <span className="text-sm font-bold" style={{ color: theme.primary }}>${rep.commission.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rankColors[i] }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs" style={{ color: theme.textMuted }}>{rep.clients} clients - {rep.email}</span>
                  <button onClick={() => copyCode(rep.code)} className="flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-md transition-all" style={{ background: theme.bg, color: copied === rep.code ? '#22c55e' : theme.textMuted }}>
                    {copied === rep.code ? <><Check size={10} /> Copied</> : <><Copy size={10} /> {rep.code}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

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
                  <input value={newRep.email} onChange={e => setNewRep(p => ({ ...p, email: e.target.value }))} placeholder="john@liafrik.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Commission Rate (%)</label>
                  <input type="number" value={newRep.rate} onChange={e => setNewRep(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={addRep} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: theme.primary }}>Add Rep</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

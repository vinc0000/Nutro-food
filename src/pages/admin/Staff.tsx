import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Shield, Key, AlertTriangle, Archive, X, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const STAFF = [
  { id: '1', name: 'Ahmed Al-Rashid', email: 'ahmed@restaurant.com', role: 'branch_manager', active: true, since: '2023-05-01', pin: '1234' },
  { id: '2', name: 'Layla Hassan', email: 'layla@restaurant.com', role: 'cashier', active: true, since: '2023-09-15', pin: '5678' },
  { id: '3', name: 'Marcus Owusu', email: 'marcus@restaurant.com', role: 'kitchen_staff', active: true, since: '2024-01-10', pin: '9012' },
  { id: '4', name: 'Sophie Diallo', email: 'sophie@restaurant.com', role: 'cashier', active: false, since: '2024-03-20', pin: '3456' },
];

const roleConfig: Record<string, { label: string; color: string; perms: string[] }> = {
  org_owner: { label: 'Org Owner', color: '#0369A1', perms: ['Full access', 'Billing', 'All branches'] },
  branch_manager: { label: 'Branch Manager', color: '#10B981', perms: ['Menu edit', 'Staff manage', 'View reports', 'Approve refunds'] },
  cashier: { label: 'Cashier / POS', color: '#3b82f6', perms: ['POS terminal', 'Orders', 'Cash drawer'] },
  kitchen_staff: { label: 'Kitchen Staff', color: '#f59e0b', perms: ['KDS view', 'Bump tickets'] },
  accountant: { label: 'Accountant', color: '#8b5cf6', perms: ['Financial reports', 'Read-only'] },
  custom: { label: 'Custom Role', color: '#6b7280', perms: ['Custom'] },
};

export default function AdminStaff() {
  const { theme } = useTheme();
  const [showAdd, setShowAdd] = useState(false);
  const [staff, setStaff] = useState(STAFF);
  const [deleteConfirm, setDeleteConfirm] = useState<typeof STAFF[0] | null>(null);
  const [resetPinFor, setResetPinFor] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'cashier' });
  const [editStaff, setEditStaff] = useState<typeof STAFF[0] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const resetPin = (id: string) => {
    setResetPinFor(id);
    setNewPin('');
  };

  const confirmResetPin = () => { setResetPinFor(null); setNewPin(''); showToast('PIN updated successfully'); };

  const addStaff = () => {
    if (!newStaff.name || !newStaff.email) return;
    setStaff(prev => [...prev, { ...newStaff, id: Date.now().toString(), active: true, since: new Date().toISOString().slice(0, 10), pin: '0000' } as typeof STAFF[0]]);
    setShowAdd(false);
    setNewStaff({ name: '', email: '', role: 'cashier' });
  };

  const confirmDelete = () => {
    if (deleteConfirm) setStaff(prev => prev.filter(s => s.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  const saveEdit = () => {
    setStaff(prev => prev.map(s => s.id === editStaff?.id ? editStaff : s));
    setEditStaff(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Staff & Roles</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Manage team members, roles, permissions, and PIN codes</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(roleConfig).slice(0, 4).map(([key, cfg]) => (
          <div key={key} className="p-4 rounded-xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
            <ul className="space-y-0.5">
              {cfg.perms.map(p => <li key={p} className="text-xs" style={{ color: theme.textMuted }}>• {p}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {staff.map((member, i) => {
          const role = roleConfig[member.role] ?? roleConfig.custom;
          return (
            <motion.div key={member.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: theme.surface, border: `1px solid ${member.active ? theme.border : theme.border + '60'}`, opacity: member.active ? 1 : 0.6 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ background: role.color + '20', color: role.color }}>
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm" style={{ color: theme.text }}>{member.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: role.color + '20', color: role.color }}>{role.label}</span>
                  {!member.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>Inactive</span>}
                </div>
                <span className="text-xs" style={{ color: theme.textMuted }}>{member.email} · Since {member.since}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: theme.bg, color: theme.textMuted }}>
                  <Key size={11} /><span className="font-mono">PIN: {'•'.repeat(4)}</span>
                </div>
                <button onClick={() => resetPin(member.id)} title="Reset PIN" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#f59e0b' }}><Key size={14} /></button>
                <button onClick={() => setEditStaff(member)} title="Edit" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><Edit2 size={14} /></button>
                <button onClick={() => setDeleteConfirm(member)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} style={{ color: theme.primary }} />
          <h2 className="font-extrabold" style={{ color: theme.text }}>Custom Role Builder</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#0369A120', color: '#0369A1' }}>Enterprise</span>
        </div>
        <p className="text-sm mb-4" style={{ color: theme.textMuted }}>Create granular custom roles with fine-grained permission toggles.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {['Allow Refunds', 'Edit Menu Prices', 'View Daily Revenue', 'Manage Staff', 'View Customer Data', 'Export Reports', 'Change Table Layout', 'Override Discounts'].map(perm => (
            <label key={perm} className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg"
              style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
              <input type="checkbox" style={{ accentColor: theme.primary }} />
              <span style={{ color: theme.text }}>{perm}</span>
            </label>
          ))}
        </div>
        <button onClick={() => showToast('Custom role created')} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>Create Custom Role</button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Add Staff Member</h2>
                <button onClick={() => setShowAdd(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Full Name</label>
                  <input value={newStaff.name} onChange={e => setNewStaff(p => ({ ...p, name: e.target.value }))} placeholder="John Doe"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Email</label>
                  <input value={newStaff.email} onChange={e => setNewStaff(p => ({ ...p, email: e.target.value }))} placeholder="john@restaurant.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Role</label>
                  <select value={newStaff.role} onChange={e => setNewStaff(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                    {Object.entries(roleConfig).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={addStaff} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: theme.primary }}>Add Staff</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editStaff && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditStaff(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Edit Staff Member</h2>
                <button onClick={() => setEditStaff(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Full Name</label>
                  <input value={editStaff.name} onChange={e => setEditStaff(p => p ? { ...p, name: e.target.value } : p)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Email</label>
                  <input value={editStaff.email} onChange={e => setEditStaff(p => p ? { ...p, email: e.target.value } : p)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Role</label>
                  <select value={editStaff.role} onChange={e => setEditStaff(p => p ? { ...p, role: e.target.value } : p)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                    {Object.entries(roleConfig).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input type="checkbox" checked={editStaff.active} onChange={e => setEditStaff(p => p ? { ...p, active: e.target.checked } : p)} style={{ accentColor: theme.primary }} />
                  <span style={{ color: theme.text }}>Active</span>
                </label>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: theme.primary }}>Save Changes</button>
                <button onClick={() => setEditStaff(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ef444420' }}>
                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              </div>
              <h2 className="text-lg font-extrabold text-center mb-2" style={{ color: theme.text }}>Delete Staff Member?</h2>
              <p className="text-sm text-center mb-2" style={{ color: theme.textMuted }}>
                You are about to delete <strong style={{ color: theme.text }}>{deleteConfirm.name}</strong>.
              </p>
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: '#3b82f610', border: '1px solid #3b82f630' }}>
                <Archive size={14} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  Their full sales audit history will be archived. Their PIN will be securely unlinked. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#ef4444' }}>Archive & Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetPinFor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setResetPinFor(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-xs rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: theme.text }}><Key size={18} style={{ color: '#f59e0b' }} /> Reset PIN</h2>
                <button onClick={() => setResetPinFor(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: theme.textMuted }}>Enter a new 4-digit PIN for this staff member.</p>
              <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
                className="w-full px-4 py-3 rounded-xl text-center text-2xl font-extrabold tracking-widest outline-none mb-4"
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              <button onClick={confirmResetPin} disabled={newPin.length !== 4}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: theme.primary }}>
                Confirm New PIN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: '#22c55e' }}>
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

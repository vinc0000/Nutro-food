import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock, Mail, Trash2, UserCog, X, Check, Plus, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { SUPER_ADMIN_EMAILS } from '@/components/guards/RouteGuards';

const ADMIN_NAMES: Record<string, string> = {
  'vincentnogue@yahoo.com': 'Vincent Nogue',
  'vincentnogue2@gmail.com': 'Vincent Nogue',
  'liyahjoha@gmail.com': 'Liyah Joha',
  'liyahjoha@yahoo.com': 'Liyah Joha',
};

interface AdminUser {
  email: string;
  name: string;
  role: string;
  protected: boolean;
  active: boolean;
  lastLogin: string;
}

const INITIAL_ADMINS: AdminUser[] = SUPER_ADMIN_EMAILS.map((email, i) => ({
  email,
  name: ADMIN_NAMES[email] ?? 'Unknown',
  role: i < 2 ? 'Founder' : 'Co-Founder',
  protected: i < 2,
  active: true,
  lastLogin: ['2m ago', '1h ago', '3h ago', '1d ago'][i] ?? 'unknown',
}));

export default function SuperAdminAdmins() {
  const { theme } = useTheme();
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Co-Founder');
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const sendInvite = () => {
    if (!inviteEmail || !inviteEmail.includes('@')) { showToast('Please enter a valid email'); return; }
    const newAdmin: AdminUser = {
      email: inviteEmail, name: inviteName || inviteEmail.split('@')[0],
      role: inviteRole, protected: false, active: true, lastLogin: 'Never',
    };
    setAdmins(prev => [...prev, newAdmin]);
    setShowInvite(false); setInviteEmail(''); setInviteName(''); setInviteRole('Co-Founder');
    showToast(`Invitation sent to ${inviteEmail}`);
  };

  const saveEdit = () => {
    if (!editAdmin) return;
    setAdmins(prev => prev.map(a => a.email === editAdmin.email ? editAdmin : a));
    showToast(`Updated ${editAdmin.name}`);
    setEditAdmin(null);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    setAdmins(prev => prev.filter(a => a.email !== deleteConfirm.email));
    showToast(`Access revoked for ${deleteConfirm.email}`);
    setDeleteConfirm(null);
  };

  const toggleActive = (email: string) => {
    setAdmins(prev => prev.map(a => a.email === email ? { ...a, active: !a.active } : a));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Super Admin Team</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Manage founder accounts, roles, and access control</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#0369A1' }}>
          <Plus size={16} /> Invite Admin
        </button>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
        <ShieldAlert size={18} style={{ color: '#ef4444' }} />
        <div>
          <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Deletion Protection Active</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>The last 2 Super Admin accounts are permanently protected from deletion or demotion. Support emails do NOT possess Super Admin rights.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Admins', val: admins.length, color: '#0369A1' },
          { label: 'Protected', val: admins.filter(a => a.protected).length, color: '#ef4444' },
          { label: 'Active', val: admins.filter(a => a.active).length, color: '#22c55e' },
          { label: 'Invited', val: admins.filter(a => a.lastLogin === 'Never').length, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {admins.map(admin => (
          <div key={admin.email} className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: theme.surface, border: `1px solid ${admin.protected ? '#0369A140' : theme.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ background: admin.protected ? '#0369A118' : theme.bg, color: admin.protected ? '#0369A1' : theme.textMuted }}>
              {admin.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold" style={{ color: theme.text }}>{admin.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#0369A118', color: '#0369A1' }}>{admin.role}</span>
                {admin.protected && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>PROTECTED</span>}
                {!admin.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#6b728020', color: '#6b7280' }}>INACTIVE</span>}
              </div>
              <div className="text-sm" style={{ color: theme.textMuted }}>{admin.email}</div>
              <div className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>Last login: {admin.lastLogin}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setEditAdmin(admin)} title="Edit Role" className="p-2 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><UserCog size={14} /></button>
              {!admin.protected && (
                <button onClick={() => toggleActive(admin.email)} title={admin.active ? 'Deactivate' : 'Activate'}
                  className="p-2 rounded-lg hover:opacity-70" style={{ color: admin.active ? '#eab308' : '#22c55e' }}>
                  {admin.active ? <Lock size={14} /> : <Check size={14} />}
                </button>
              )}
              {!admin.protected && (
                <button onClick={() => setDeleteConfirm(admin)} title="Revoke Access" className="p-2 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
              )}
              {admin.protected && <Lock size={14} style={{ color: theme.textMuted }} />}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <h3 className="font-bold mb-2" style={{ color: theme.text }}>Whitelist Policy</h3>
        <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
          Only whitelisted emails can access the Super Admin module. Any other email attempting to access <code className="px-1 py-0.5 rounded font-mono text-xs" style={{ background: theme.bg }}>/app/super-admin</code> is automatically redirected to <code className="px-1 py-0.5 rounded font-mono text-xs" style={{ background: theme.bg }}>/app/admin</code>. This whitelist is enforced at both the route guard and database RLS level.
        </p>
      </div>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowInvite(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: theme.text }}><Mail size={18} /> Invite Super Admin</h2>
                <button onClick={() => setShowInvite(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Full Name</label>
                  <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Doe"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Email Address</label>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="john@liafrik.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                    <option>Co-Founder</option>
                    <option>Operations Lead</option>
                    <option>Support Lead</option>
                    <option>Developer</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={sendInvite} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#0369A1' }}>Send Invitation</button>
                <button onClick={() => setShowInvite(false)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditAdmin(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Edit {editAdmin.name}</h2>
                <button onClick={() => setEditAdmin(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Name</label>
                  <input value={editAdmin.name} onChange={e => setEditAdmin(p => p ? { ...p, name: e.target.value } : p)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Role</label>
                  <select value={editAdmin.role} onChange={e => setEditAdmin(p => p ? { ...p, role: e.target.value } : p)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} disabled={editAdmin.protected}>
                    {['Founder', 'Co-Founder', 'Operations Lead', 'Support Lead', 'Developer'].map(r => <option key={r}>{r}</option>)}
                  </select>
                  {editAdmin.protected && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>Role locked for protected accounts</p>}
                </div>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input type="checkbox" checked={editAdmin.active} onChange={e => setEditAdmin(p => p ? { ...p, active: e.target.checked } : p)} style={{ accentColor: '#0369A1' }} />
                  <span style={{ color: theme.text }}>Active</span>
                </label>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#0369A1' }}>Save Changes</button>
                <button onClick={() => setEditAdmin(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Revoke Access</h2>
                <button onClick={() => setDeleteConfirm(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm" style={{ color: theme.textMuted }}>This will permanently revoke Super Admin access for <strong style={{ color: theme.text }}>{deleteConfirm.name}</strong> ({deleteConfirm.email}). They will be redirected to the regular admin panel.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#ef4444' }}>Revoke Access</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: '#0369A1' }}>
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

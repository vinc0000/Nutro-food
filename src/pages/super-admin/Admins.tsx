import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Mail, Trash2, X, Check, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export default function SuperAdminAdmins() {
  const { theme } = useTheme();
  const { profile: currentProfile } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadAdmins = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('system_role', 'super_admin')
      .order('created_at', { ascending: true });

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Array<{ id: string; email: string | null; full_name: string | null; created_at: string }>;
    setAdmins(rows.map(row => ({
      id: row.id,
      email: row.email ?? '(no email)',
      name: row.full_name ?? row.email ?? 'Unnamed',
      createdAt: row.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { loadAdmins(); }, []);

  // Promotes an EXISTING account to super_admin. We deliberately do not fabricate an
  // "invitation email" here: sending real invite emails requires a server-side function
  // with the Supabase service role key, which this project does not have yet. The person
  // being promoted must already have created a regular Nutro account first.
  const promoteToSuperAdmin = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) { setInviteError('Please enter a valid email'); return; }
    setInviteBusy(true);
    setInviteError(null);

    const { data: existing, error: lookupError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', inviteEmail.trim().toLowerCase())
      .maybeSingle();

    if (lookupError) { setInviteError(lookupError.message); setInviteBusy(false); return; }
    if (!existing) {
      setInviteError('No Nutro account exists with this email yet. Ask them to sign up first, then promote them here.');
      setInviteBusy(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ system_role: 'super_admin' })
      .eq('id', (existing as { id: string }).id);

    setInviteBusy(false);
    if (updateError) { setInviteError(updateError.message); return; }

    setShowInvite(false);
    setInviteEmail('');
    showToast(`${inviteEmail} is now a Super Admin`);
    loadAdmins();
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase
      .from('profiles')
      .update({ system_role: 'user' })
      .eq('id', deleteConfirm.id);

    if (error) { showToast(`Failed: ${error.message}`); setDeleteConfirm(null); return; }
    showToast(`Access revoked for ${deleteConfirm.email}`);
    setDeleteConfirm(null);
    loadAdmins();
  };

  // Never let the team drop below 2 — a single remaining super admin with no backup
  // is one lost password away from nobody being able to manage the platform at all.
  const isProtectedByMinimum = admins.length <= 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Super Admin Team</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Manage who has Super Admin access to the platform</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
          <Plus size={16} /> Promote an Admin
        </button>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
        <ShieldAlert size={18} style={{ color: '#ef4444' }} />
        <div>
          <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Access is DB-enforced</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>Super Admin access is granted only via the <code className="px-1 py-0.5 rounded font-mono text-xs" style={{ background: theme.bg }}>system_role</code> column on <code className="px-1 py-0.5 rounded font-mono text-xs" style={{ background: theme.bg }}>profiles</code>, enforced by Supabase RLS. The list below is the real, live source of truth &mdash; not a hardcoded list.</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}>
          <Loader2 size={16} className="animate-spin" /> Loading admins…
        </div>
      )}

      {!loading && loadError && (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
          Could not load admins: {loadError}
        </div>
      )}

      {!loading && !loadError && (
        <div className="space-y-3">
          {admins.map(admin => {
            const isSelf = admin.id === currentProfile?.id;
            const protectedFromDeletion = isSelf || isProtectedByMinimum;
            return (
              <div key={admin.id} className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: theme.bg, color: theme.textMuted }}>
                  {admin.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold" style={{ color: theme.text }}>{admin.name}</span>
                    {isSelf && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#0369A118', color: '#0369A1' }}>YOU</span>}
                    {protectedFromDeletion && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>PROTECTED</span>}
                  </div>
                  <div className="text-sm" style={{ color: theme.textMuted }}>{admin.email}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>Admin since {new Date(admin.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-1">
                  {!protectedFromDeletion && (
                    <button onClick={() => setDeleteConfirm(admin)} title="Revoke Access" className="p-2 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            );
          })}
          {admins.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: theme.textMuted }}>No Super Admins found.</p>
          )}
        </div>
      )}

      {/* Promote modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowInvite(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: theme.text }}><Mail size={18} /> Promote to Super Admin</h2>
                <button onClick={() => setShowInvite(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <p className="text-xs mb-4" style={{ color: theme.textMuted }}>
                The account must already exist. Enter the email of an existing Nutro user to grant them Super Admin access.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Email Address</label>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="teammate@example.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                {inviteError && <p className="text-xs" style={{ color: '#ef4444' }}>{inviteError}</p>}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={promoteToSuperAdmin} disabled={inviteBusy}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: theme.primary }}>
                  {inviteBusy && <Loader2 size={14} className="animate-spin" />} Promote
                </button>
                <button onClick={() => setShowInvite(false)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: theme.primary }}>
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

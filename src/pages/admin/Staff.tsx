import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Shield, Key, AlertTriangle, Archive, X, Check, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgContext } from '@/hooks/useOrgContext';
import { supabase } from '@/lib/supabase';

const roleConfig: Record<string, { label: string; color: string; perms: string[] }> = {
  owner: { label: 'Owner', color: '#0369A1', perms: ['Full access', 'Billing', 'All branches'] },
  org_owner: { label: 'Org Owner', color: '#0369A1', perms: ['Full access', 'Billing', 'All branches'] },
  branch_manager: { label: 'Branch Manager', color: '#16A34A', perms: ['Menu edit', 'Staff manage', 'View reports', 'Approve refunds'] },
  cashier: { label: 'Cashier / POS', color: '#3b82f6', perms: ['POS terminal', 'Orders', 'Cash drawer'] },
  kitchen_staff: { label: 'Kitchen Staff', color: '#f59e0b', perms: ['KDS view', 'Bump tickets'] },
  accountant: { label: 'Accountant', color: '#8b5cf6', perms: ['Financial reports', 'Read-only'] },
  custom: { label: 'Custom Role', color: '#6b7280', perms: ['Custom'] },
};

interface StaffMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  since: string;
}

export default function AdminStaff() {
  const { theme } = useTheme();
  const { profile: currentProfile } = useAuth();
  const { orgContext } = useOrgContext();
  const orgId = orgContext?.org_id;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('cashier');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null);
  const [resetPinFor, setResetPinFor] = useState<StaffMember | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadStaff = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('user_org_roles')
      .select('*')
      .eq('org_id', orgId);

    if (error) { setLoadError(error.message); setLoading(false); return; }

    const rows = (data ?? []) as Array<{ id: string; user_id: string; role_name: string; is_active: boolean; created_at: string }>;

    // The mock demo client's .from() builder only supports single-table filtering, so
    // resolve profile details with a second lookup rather than a real join — this keeps
    // the page working the same way in local demo mode as it does against real Supabase.
    const withProfiles = await Promise.all(rows.map(async (row) => {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', row.user_id)
        .maybeSingle<{ full_name: string | null; email: string | null }>();
      return {
        membershipId: row.id,
        userId: row.user_id,
        name: profileRow?.full_name ?? profileRow?.email ?? 'Unnamed',
        email: profileRow?.email ?? '(no email)',
        role: row.role_name,
        active: row.is_active,
        since: row.created_at,
      };
    }));

    setStaff(withProfiles);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  // Adds an EXISTING Nutro account to this org. We don't fabricate a "staff invitation
  // email" here for the same reason as the Super Admin panel: sending real invite
  // emails needs a server-side function with the service role key, which this project
  // doesn't have yet. The person must already have a Nutro account.
  const addStaffMember = async () => {
    if (!addEmail || !addEmail.includes('@') || !orgId) { setAddError('Enter a valid email'); return; }
    setAddBusy(true);
    setAddError(null);

    const { data: existingProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', addEmail.trim().toLowerCase())
      .maybeSingle<{ id: string }>();

    if (lookupError) { setAddError(lookupError.message); setAddBusy(false); return; }
    if (!existingProfile) {
      setAddError('No Nutro account exists with this email yet. Ask them to sign up first.');
      setAddBusy(false);
      return;
    }

    if (staff.some(s => s.userId === existingProfile.id)) {
      setAddError('This person is already on your team.');
      setAddBusy(false);
      return;
    }

    const permissionsByRole: Record<string, Record<string, string[]>> = {
      branch_manager: { menu: ['read', 'write'], orders: ['read', 'write'], reports: ['read'], staff: ['read', 'write'] },
      cashier: { pos: ['read', 'write'], orders: ['read', 'write'] },
      kitchen_staff: { kds: ['read', 'write'] },
      accountant: { reports: ['read'] },
      custom: {},
    };

    const { data: newId, error: insertError } = await supabase.rpc('add_staff_member', {
      p_org_id: orgId,
      p_user_id: existingProfile.id,
      p_role_name: addRole,
      p_permissions: permissionsByRole[addRole] ?? {},
    });

    setAddBusy(false);
    if (insertError || !newId) { setAddError(insertError?.message ?? 'Could not add staff member — check permissions'); return; }

    setShowAdd(false);
    setAddEmail('');
    setAddRole('cashier');
    showToast('Staff member added');
    loadStaff();
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { data: ok, error } = await supabase.rpc('remove_staff_member', { p_membership_id: deleteConfirm.membershipId });
    if (error || !ok) { showToast(`Failed: ${error?.message ?? 'check permissions'}`); setDeleteConfirm(null); return; }
    showToast(`${deleteConfirm.name} removed from the team`);
    setDeleteConfirm(null);
    loadStaff();
  };

  const saveEdit = async () => {
    if (!editStaff) return;
    const { data: ok, error } = await supabase.rpc('update_staff_member', {
      p_membership_id: editStaff.membershipId,
      p_role_name: editStaff.role,
      p_is_active: editStaff.active,
    });
    if (error || !ok) { showToast(`Failed: ${error?.message ?? 'check permissions'}`); return; }
    setEditStaff(null);
    showToast('Staff member updated');
    loadStaff();
  };

  const confirmResetPin = async () => {
    if (!resetPinFor || newPin.length !== 4) return;
    setPinBusy(true);
    const { data, error } = await supabase.rpc('set_staff_pin', {
      p_target_user_id: resetPinFor.userId,
      p_pin: newPin,
    });
    setPinBusy(false);
    if (error || !data) { showToast('Could not update PIN — check permissions'); return; }
    setResetPinFor(null);
    setNewPin('');
    showToast('PIN updated successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Staff & Roles</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Manage team members, roles, permissions, and PIN codes</p>
        </div>
        <button onClick={() => setShowAdd(true)} disabled={!orgId} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: theme.primary }}>
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(roleConfig).filter(([key]) => key !== 'owner').slice(0, 4).map(([key, cfg]) => (
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

      {loading && (
        <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}>
          <Loader2 size={16} className="animate-spin" /> Loading staff…
        </div>
      )}

      {!loading && loadError && (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
          Could not load staff: {loadError}
        </div>
      )}

      {!loading && !loadError && (
        <div className="space-y-3">
          {staff.map((member, i) => {
            const role = roleConfig[member.role] ?? roleConfig.custom;
            const isSelf = member.userId === currentProfile?.id;
            return (
              <motion.div key={member.membershipId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: theme.surface, border: `1px solid ${member.active ? theme.border : theme.border + '60'}`, opacity: member.active ? 1 : 0.6 }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: role.color + '20', color: role.color }}>
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: theme.text }}>{member.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: role.color + '20', color: role.color }}>{role.label}</span>
                    {isSelf && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: theme.primary + '20', color: theme.primary }}>YOU</span>}
                    {!member.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>Inactive</span>}
                  </div>
                  <span className="text-xs" style={{ color: theme.textMuted }}>{member.email} · Since {new Date(member.since).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setResetPinFor(member); setNewPin(''); }} title="Reset PIN" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#f59e0b' }}><Key size={14} /></button>
                  <button onClick={() => setEditStaff(member)} title="Edit" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><Edit2 size={14} /></button>
                  {!isSelf && <button onClick={() => setDeleteConfirm(member)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>}
                </div>
              </motion.div>
            );
          })}
          {staff.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: theme.textMuted }}>No staff members yet.</p>
          )}
        </div>
      )}

      <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} style={{ color: theme.primary }} />
          <h2 className="font-extrabold" style={{ color: theme.text }}>Custom Role Builder</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#0369A120', color: '#0369A1' }}>Coming Soon</span>
        </div>
        <p className="text-sm" style={{ color: theme.textMuted }}>
          Fine-grained, per-permission custom roles aren't wired up yet — today's roles ({Object.values(roleConfig).filter(r => r !== roleConfig.owner && r !== roleConfig.org_owner).map(r => r.label).join(', ')}) come with a fixed permission set. This section will let you toggle individual permissions once that's built.
        </p>
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
              <p className="text-xs mb-4" style={{ color: theme.textMuted }}>The account must already exist — enter the email of an existing Nutro user.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Email</label>
                  <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="john@restaurant.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Role</label>
                  <select value={addRole} onChange={e => setAddRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                    {Object.entries(roleConfig).filter(([key]) => key !== 'owner' && key !== 'org_owner').map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                  </select>
                </div>
                {addError && <p className="text-xs" style={{ color: '#ef4444' }}>{addError}</p>}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={addStaffMember} disabled={addBusy} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: theme.primary }}>
                  {addBusy && <Loader2 size={14} className="animate-spin" />} Add Staff
                </button>
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
                <p className="text-sm font-semibold" style={{ color: theme.text }}>{editStaff.name}</p>
                <p className="text-xs -mt-3" style={{ color: theme.textMuted }}>{editStaff.email}</p>
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
              <h2 className="text-lg font-extrabold text-center mb-2" style={{ color: theme.text }}>Remove Staff Member?</h2>
              <p className="text-sm text-center mb-2" style={{ color: theme.textMuted }}>
                You are about to remove <strong style={{ color: theme.text }}>{deleteConfirm.name}</strong> from your team.
              </p>
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: '#3b82f610', border: '1px solid #3b82f630' }}>
                <Archive size={14} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  Their sales history stays on record. Their PIN access is revoked. Their Nutro account itself is not deleted.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#ef4444' }}>Remove</button>
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
              <p className="text-sm mb-4" style={{ color: theme.textMuted }}>New 4-digit PIN for {resetPinFor.name}.</p>
              <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
                className="w-full px-4 py-3 rounded-xl text-center text-2xl font-extrabold tracking-widest outline-none mb-4"
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              <button onClick={confirmResetPin} disabled={newPin.length !== 4 || pinBusy}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: theme.primary }}>
                {pinBusy && <Loader2 size={14} className="animate-spin" />} Confirm New PIN
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

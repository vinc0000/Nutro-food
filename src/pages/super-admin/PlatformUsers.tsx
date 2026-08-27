import { useEffect, useState } from 'react';
import { Users as UsersIcon, Search, Loader2, ShieldCheck, Building2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  systemRole: string;
  orgName: string | null;
  orgRole: string | null;
  createdAt: string;
}

export default function SuperAdminUsers() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles').select('*').order('created_at', { ascending: false });
      if (profilesError) { setLoadError(profilesError.message); setLoading(false); return; }

      const { data: memberships } = await supabase
        .from('user_org_roles').select('*');
      const { data: orgs } = await supabase.from('organizations').select('id, name');

      const orgNameById = new Map((orgs as Array<{ id: string; name: string }> ?? []).map(o => [o.id, o.name]));
      const membershipByUser = new Map(
        (memberships as Array<{ user_id: string; org_id: string; role_name: string }> ?? []).map(m => [m.user_id, m])
      );

      const rows = (profiles as Array<{ id: string; email: string | null; full_name: string | null; system_role: string; created_at: string }> ?? []).map(p => {
        const membership = membershipByUser.get(p.id);
        return {
          id: p.id,
          email: p.email ?? '—',
          name: p.full_name ?? p.email ?? 'Unnamed',
          systemRole: p.system_role,
          orgName: membership ? orgNameById.get(membership.org_id) ?? null : null,
          orgRole: membership?.role_name ?? null,
          createdAt: p.created_at,
        };
      });
      setUsers(rows);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = users.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><UsersIcon size={20} /> Platform Users</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Every account on Nutro — real data from profiles, not just Super Admins</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading users…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load users: {loadError}</div>}

      {!loading && !loadError && (
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {['User', 'Role', 'Organization', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: theme.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: theme.text }}>{u.name}</div>
                    <div className="text-xs" style={{ color: theme.textMuted }}>{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.systemRole === 'super_admin' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>
                        <ShieldCheck size={11} /> Super Admin
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: theme.bg, color: theme.textMuted }}>{u.orgRole ?? u.systemRole}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: theme.text }}>
                    {u.orgName ? <span className="flex items-center gap-1.5"><Building2 size={12} style={{ color: theme.textMuted }} /> {u.orgName}</span> : <span style={{ color: theme.textMuted }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: theme.textMuted }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: theme.textMuted }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

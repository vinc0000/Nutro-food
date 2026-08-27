import { useEffect, useState } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface AuditRow {
  id: string;
  actorEmail: string;
  action: string;
  targetLabel: string | null;
  createdAt: string;
}

export default function SuperAdminAudit() {
  const { theme } = useTheme();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) { setLoadError(error.message); setLoading(false); return; }
      setRows((data as Array<{ id: string; actor_email: string | null; action: string; target_label: string | null; created_at: string }> ?? []).map(r => ({
        id: r.id, actorEmail: r.actor_email ?? '—', action: r.action, targetLabel: r.target_label, createdAt: r.created_at,
      })));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><ScrollText size={20} /> Audit Log</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real record of sensitive actions taken by Super Admins — promotions, revocations, tenant suspensions, plan changes</p>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading audit trail…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load audit log: {loadError}</div>}

      {!loading && !loadError && (
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <p className="text-sm" style={{ color: theme.text }}>
                  <span className="font-bold">{r.actorEmail}</span> {r.action.replace(/_/g, ' ')}
                  {r.targetLabel && <> — <span style={{ color: theme.textMuted }}>{r.targetLabel}</span></>}
                </p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: theme.textMuted }}>{new Date(r.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: theme.textMuted }}>No audited actions yet. Actions taken from this Super Admin panel (promoting an admin, suspending a tenant, etc.) will appear here.</p>
          )}
        </div>
      )}
    </div>
  );
}

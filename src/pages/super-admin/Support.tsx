import { useEffect, useState } from 'react';
import { LifeBuoy, Loader2, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface Ticket {
  id: string;
  orgName: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
}

const statusColor: Record<string, string> = { open: '#eab308', in_progress: '#3b82f6', resolved: '#22c55e', closed: '#6b7280' };
const priorityColor: Record<string, string> = { low: '#6b7280', normal: '#3b82f6', high: '#eab308', urgent: '#ef4444' };

export default function SuperAdminSupport() {
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) { setLoadError(error.message); setLoading(false); return; }

    const rows = (data as Array<{ id: string; org_id: string; subject: string; message: string; status: string; priority: string; created_at: string }> ?? []);
    const orgIds = [...new Set(rows.map(r => r.org_id))];
    const { data: orgs } = orgIds.length ? await supabase.from('organizations').select('id, name').in('id', orgIds) : { data: [] };
    const orgNameById = new Map((orgs as Array<{ id: string; name: string }> ?? []).map(o => [o.id, o.name]));

    setTickets(rows.map(r => ({
      id: r.id, orgName: orgNameById.get(r.org_id) ?? '—', subject: r.subject, message: r.message,
      status: r.status, priority: r.priority, createdAt: r.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast(`Failed: ${error.message}`); return; }
    showToast('Ticket updated');
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><LifeBuoy size={20} /> Support</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real tickets from tenants — backed by support_tickets, not a static mailbox</p>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading tickets…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load tickets: {loadError}</div>}

      {!loading && !loadError && (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="rounded-2xl p-4" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold" style={{ color: theme.text }}>{t.subject}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: `${statusColor[t.status]}20`, color: statusColor[t.status] }}>{t.status.replace('_', ' ')}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: `${priorityColor[t.priority]}20`, color: priorityColor[t.priority] }}>{t.priority}</span>
                  </div>
                  <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{t.orgName} · {new Date(t.createdAt).toLocaleString()}</p>
                  <p className="text-sm" style={{ color: theme.text }}>{t.message}</p>
                </div>
                {t.status !== 'resolved' && t.status !== 'closed' && (
                  <button onClick={() => updateStatus(t.id, 'resolved')} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#22c55e' }}>
                    <Check size={12} /> Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
          {tickets.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: theme.textMuted }}>No support tickets yet. Tickets tenants open will appear here.</p>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl" style={{ background: theme.primary }}>{toast}</div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Bell, Loader2, Building2, DollarSign, LifeBuoy } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface NotificationRow {
  id: string;
  kind: 'tenant' | 'payment' | 'ticket';
  title: string;
  desc: string;
  time: string;
}

const ICONS = { tenant: Building2, payment: DollarSign, ticket: LifeBuoy };
const COLORS = { tenant: '#22c55e', payment: '#22c55e', ticket: '#eab308' };

export default function SuperAdminNotifications() {
  const { theme } = useTheme();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      const [orgsRes, subsRes, ticketsRes] = await Promise.all([
        supabase.from('organizations').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('subscriptions').select('*').eq('status', 'successful').order('paid_at', { ascending: false }).limit(20),
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      if (orgsRes.error) { setLoadError(orgsRes.error.message); setLoading(false); return; }

      const orgs = (orgsRes.data ?? []) as Array<{ name: string; created_at: string }>;
      const subs = (subsRes.data ?? []) as Array<{ org_id: string; amount: number; currency: string; plan: string; paid_at: string | null; created_at: string }>;
      const tickets = (ticketsRes.data ?? []) as Array<{ subject: string; org_id: string; status: string; created_at: string }>;

      const orgIds = Array.from(new Set([...subs.map(s => s.org_id), ...tickets.map(t => t.org_id)]));
      const namesById = new Map<string, string>();
      await Promise.all(orgIds.map(async (id) => {
        const { data } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle<{ name: string }>();
        namesById.set(id, data?.name ?? 'A tenant');
      }));

      const items: NotificationRow[] = [
        ...orgs.map((o, i) => ({ id: `org-${i}`, kind: 'tenant' as const, title: 'New tenant registered', desc: `${o.name} joined the platform`, time: o.created_at })),
        ...subs.map((s, i) => ({ id: `sub-${i}`, kind: 'payment' as const, title: 'Payment received', desc: `${namesById.get(s.org_id) ?? 'A tenant'} paid ${s.currency} ${s.amount} (${s.plan})`, time: s.paid_at ?? s.created_at })),
        ...tickets.map((t, i) => ({ id: `ticket-${i}`, kind: 'ticket' as const, title: t.status === 'open' ? 'New support ticket' : 'Support ticket updated', desc: `${namesById.get(t.org_id) ?? 'A tenant'}: ${t.subject}`, time: t.created_at })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setRows(items);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><Bell size={20} /> Notifications</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real platform activity — new tenants, successful payments, and support tickets, worldwide</p>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading notifications…</div>}
      {!loading && loadError && <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>Could not load notifications: {loadError}</div>}

      {!loading && !loadError && (
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          {rows.map(r => {
            const Icon = ICONS[r.kind];
            return (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLORS[r.kind] + '18' }}>
                  <Icon size={14} style={{ color: COLORS[r.kind] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: theme.text }}>{r.title}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>{r.desc}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: theme.textMuted }}>{new Date(r.time).toLocaleString()}</span>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-sm text-center py-8" style={{ color: theme.textMuted }}>No activity yet.</p>}
        </div>
      )}
    </div>
  );
}

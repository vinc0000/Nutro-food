import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plug, Check, X, Loader2, ExternalLink, Trash2, Users, BookOpen, MessageCircle, Webhook } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrgContext } from '@/hooks/useOrgContext';
import { supabase } from '@/lib/supabase';
import PlanGate from '@/components/ui/PlanGate';

type Provider = 'atlas_crm' | 'libooks' | 'whatsapp' | 'webhook';

interface IntegrationRow {
  id: string;
  provider: Provider;
  enabled: boolean;
  connected_at: string;
}

const PROVIDERS: Array<{
  key: Provider; name: string; description: string; icon: typeof Users; color: string;
  url: string; keyLabel: string; keyPlaceholder: string;
}> = [
  {
    key: 'atlas_crm', name: 'Atlas CRM', icon: Users, color: '#0176d3',
    description: 'AI-powered CRM by LiAfrik — sync your customer base for marketing and loyalty campaigns.',
    url: 'https://atlas.liafrik.com', keyLabel: 'Atlas API Key', keyPlaceholder: 'atlas_live_...',
  },
  {
    key: 'libooks', name: 'LiBooks', icon: BookOpen, color: '#0F2A3D',
    description: 'International accounting with OHADA expertise — export sales for bookkeeping, invoicing, and treasury.',
    url: 'https://libooks.liafrik.com', keyLabel: 'LiBooks API Key', keyPlaceholder: 'lib_live_...',
  },
  {
    key: 'whatsapp', name: 'WhatsApp Business', icon: MessageCircle, color: '#25D366',
    description: 'Send order confirmations and ready-for-pickup alerts to customers over WhatsApp.',
    url: 'https://business.whatsapp.com', keyLabel: 'WhatsApp Cloud API Token', keyPlaceholder: 'EAAG...',
  },
  {
    key: 'webhook', name: 'Custom Webhook', icon: Webhook, color: '#8b5cf6',
    description: 'Send a POST request for every new order to Zapier, Make, n8n, or your own endpoint.',
    url: 'https://zapier.com', keyLabel: 'Webhook URL', keyPlaceholder: 'https://hooks.zapier.com/...',
  },
];

export default function AdminIntegrations() {
  const { theme } = useTheme();
  const { orgContext } = useOrgContext();
  const orgId = orgContext?.org_id;

  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectTarget, setConnectTarget] = useState<Provider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from('integrations').select('*').eq('org_id', orgId);
    setRows((data ?? []) as IntegrationRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [orgId]);

  const connect = async () => {
    if (!connectTarget || !orgId || !apiKeyInput.trim()) return;
    setBusy(true);
    setError(null);
    const { error: upsertError } = await supabase.from('integrations').upsert({
      org_id: orgId,
      provider: connectTarget,
      api_key: apiKeyInput.trim(),
      enabled: true,
      connected_at: new Date().toISOString(),
    } as never, { onConflict: 'org_id,provider' } as never);
    setBusy(false);
    if (upsertError) { setError(upsertError.message); return; }
    setConnectTarget(null);
    setApiKeyInput('');
    showToast(`${PROVIDERS.find(p => p.key === connectTarget)?.name} connected`);
    void load();
  };

  const disconnect = async (provider: Provider) => {
    if (!orgId) return;
    await supabase.from('integrations').delete().eq('org_id', orgId).eq('provider', provider);
    showToast(`${PROVIDERS.find(p => p.key === provider)?.name} disconnected`);
    void load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: theme.text }}>Integrations</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Connect Nutro to the other tools you run your business with</p>
      </div>

      <PlanGate feature="integrations" title="Integrations" description="Connecting external apps like Atlas CRM or LiBooks is available on Premium and Enterprise plans.">
        {loading && (
          <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}>
            <Loader2 size={16} className="animate-spin" /> Loading integrations…
          </div>
        )}

        {!loading && (
          <div className="grid md:grid-cols-2 gap-4">
            {PROVIDERS.map(p => {
              const row = rows.find(r => r.provider === p.key);
              const Icon = p.icon;
              return (
                <div key={p.key} className="p-5 rounded-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: p.color + '18' }}>
                        <Icon size={18} style={{ color: p.color }} />
                      </div>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-1.5" style={{ color: theme.text }}>
                          {p.name}
                          <a href={p.url} target="_blank" rel="noreferrer" style={{ color: theme.textMuted }}><ExternalLink size={11} /></a>
                        </div>
                        {row ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1" style={{ background: '#22c55e20', color: '#22c55e' }}>
                            <Check size={10} /> Connected {new Date(row.connected_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: theme.bg, color: theme.textMuted }}>Not connected</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs mb-4" style={{ color: theme.textMuted }}>{p.description}</p>
                  {row ? (
                    <button onClick={() => void disconnect(p.key)}
                      className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                      style={{ background: '#ef444415', color: '#ef4444' }}>
                      <Trash2 size={12} /> Disconnect
                    </button>
                  ) : (
                    <button onClick={() => { setConnectTarget(p.key); setApiKeyInput(''); setError(null); }} disabled={!orgId}
                      className="w-full py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                      style={{ background: theme.primary }}>
                      <Plug size={12} /> Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="p-4 rounded-xl mt-4" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            Connecting a provider securely stores its credentials for your organization only (protected by the same
            role-based access as staff PIN resets and refunds). The two-way data sync for each provider — pushing
            orders to LiBooks for bookkeeping, pushing customers to Atlas CRM, sending WhatsApp notifications — is
            being built against each provider's own API next; connecting today reserves your spot and lets us reach
            out once sync for that provider goes live.
          </p>
        </div>
      </PlanGate>

      {/* Connect modal */}
      <AnimatePresence>
        {connectTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setConnectTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Connect {PROVIDERS.find(p => p.key === connectTarget)?.name}</h2>
                <button onClick={() => setConnectTarget(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{PROVIDERS.find(p => p.key === connectTarget)?.keyLabel}</label>
                <input value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder={PROVIDERS.find(p => p.key === connectTarget)?.keyPlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                {error && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{error}</p>}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => void connect()} disabled={busy || !apiKeyInput.trim()}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: theme.primary }}>
                  {busy && <Loader2 size={14} className="animate-spin" />} Connect
                </button>
                <button onClick={() => setConnectTarget(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
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

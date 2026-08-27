import { useEffect, useState } from 'react';
import { Code2, Loader2, Plus, Copy, Check, XCircle, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface ApiKeyRow {
  id: string;
  orgName: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
}

// Generates a real random key client-side. Only its SHA-256 hash and a short prefix
// are ever sent to the database — the full value is shown once, here, and never
// retrievable again, the same pattern GitHub/Stripe use for API tokens.
async function generateApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const raw = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const fullKey = `nutro_live_${raw}`;
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(fullKey));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  return { fullKey, hash, prefix: fullKey.slice(0, 16) };
}

export default function SuperAdminApi() {
  const { theme } = useTheme();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    const rows = (data as Array<{ id: string; org_id: string; label: string; key_prefix: string; created_at: string; revoked_at: string | null }> ?? []);
    const { data: orgRows } = await supabase.from('organizations').select('id, name').eq('plan', 'enterprise');
    const orgNameById = new Map((orgRows as Array<{ id: string; name: string }> ?? []).map(o => [o.id, o.name]));
    setKeys(rows.map(r => ({ id: r.id, orgName: orgNameById.get(r.org_id) ?? '—', label: r.label, keyPrefix: r.key_prefix, createdAt: r.created_at, revokedAt: r.revoked_at })));
    setOrgs((orgRows as Array<{ id: string; name: string }>) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!selectedOrg || !label.trim()) return;
    setBusy(true);
    const { fullKey, hash, prefix } = await generateApiKey();
    const { error } = await supabase.from('api_keys').insert({ org_id: selectedOrg, label: label.trim(), key_prefix: prefix, key_hash: hash } as never);
    setBusy(false);
    if (error) return;
    setRevealedKey(fullKey);
    setShowCreate(false);
    setSelectedOrg(''); setLabel('');
    load();
  };

  const revokeKey = async (id: string) => {
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}><Code2 size={20} /> API Keys</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Real platform API keys for Enterprise tenants — hashed at rest, shown once at creation</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
          <Plus size={16} /> New Key
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}><Loader2 size={16} className="animate-spin" /> Loading keys…</div>}

      {!loading && (
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {['Tenant', 'Label', 'Key', 'Created', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: theme.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: theme.text }}>{k.orgName}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: theme.text }}>{k.label}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: theme.textMuted }}>{k.keyPrefix}…</td>
                  <td className="px-4 py-3 text-xs" style={{ color: theme.textMuted }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {k.revokedAt
                      ? <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>Revoked</span>
                      : <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>Active</span>}
                  </td>
                  <td className="px-4 py-3">
                    {!k.revokedAt && (
                      <button onClick={() => revokeKey(k.id)} className="text-xs font-bold flex items-center gap-1" style={{ color: '#ef4444' }}><XCircle size={12} /> Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: theme.textMuted }}>No API keys yet. Only Enterprise-plan tenants can be issued one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>New API Key</h2>
              <button onClick={() => setShowCreate(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                <option value="">Select Enterprise tenant…</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. Production integration)"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
            </div>
            <button onClick={createKey} disabled={busy || !selectedOrg || !label.trim()}
              className="w-full mt-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: theme.primary }}>
              {busy && <Loader2 size={14} className="animate-spin" />} Generate Key
            </button>
          </div>
        </div>
      )}

      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <h2 className="text-lg font-extrabold mb-2" style={{ color: theme.text }}>Save this key now</h2>
            <p className="text-xs mb-4" style={{ color: theme.textMuted }}>This is the only time the full key will be shown. It's not stored anywhere retrievable.</p>
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
              <code className="text-xs flex-1 break-all" style={{ color: theme.text }}>{revealedKey}</code>
              <button onClick={() => { navigator.clipboard.writeText(revealedKey); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ color: theme.primary }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <button onClick={() => setRevealedKey(null)} className="w-full py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: theme.primary }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

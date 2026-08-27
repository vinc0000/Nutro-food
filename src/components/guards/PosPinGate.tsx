import { useEffect, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrgContext } from '@/hooks/useOrgContext';
import { supabase } from '@/lib/supabase';

// Settings.tsx lets a branch owner/manager set a POS PIN (set_branch_pos_pin, bcrypt-
// hashed server-side), and verify_branch_pos_pin already exists to check one — but
// nothing anywhere ever called it. Staff could set a PIN believing it protected the
// POS terminal, and it did nothing: /app/pos opened straight through, no prompt, ever.
// This is what actually enforces it. Unlock state is per-tab/session on purpose (not
// persisted) — that's what "PIN-lock the terminal" means; it should re-lock on reload.
export default function PosPinGate({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { orgContext, loading: orgLoading } = useOrgContext();
  const branchId = orgContext?.branch_id ?? null;

  const [checkingPin, setCheckingPin] = useState(true);
  const [pinRequired, setPinRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // If org loading finished but there's genuinely no branch (e.g. a super admin
    // with no restaurant of their own), there's nothing to check a PIN against —
    // resolve immediately instead of leaving checkingPin stuck at its initial
    // `true` forever, which pinned the whole POS behind an infinite spinner.
    if (!branchId) {
      if (!orgLoading) setCheckingPin(false);
      return;
    }
    let cancelled = false;
    setCheckingPin(true);
    supabase
      .from('branches')
      .select('pos_pin_hash')
      .eq('id', branchId)
      .maybeSingle<{ pos_pin_hash: string | null }>()
      .then(({ data }) => {
        if (cancelled) return;
        setPinRequired(Boolean(data?.pos_pin_hash));
        setCheckingPin(false);
      });
    return () => { cancelled = true; };
  }, [branchId, orgLoading]);

  const submitPin = async () => {
    if (!branchId || pin.length < 4) return;
    setVerifying(true);
    setError(null);
    const { data: ok, error: rpcError } = await supabase.rpc('verify_branch_pos_pin', {
      p_branch_id: branchId,
      p_pin: pin,
    });
    setVerifying(false);
    if (rpcError || !ok) {
      setError('Incorrect PIN');
      setPin('');
      return;
    }
    setUnlocked(true);
  };

  if (orgLoading || checkingPin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <Loader2 size={24} className="animate-spin" style={{ color: theme.textMuted }} />
      </div>
    );
  }

  if (!pinRequired || unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: theme.bg }}>
      <div className="w-full max-w-xs text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: theme.primary + '20' }}>
          <Lock size={22} style={{ color: theme.primary }} />
        </div>
        <h1 className="text-lg font-extrabold mb-1" style={{ color: theme.text }}>POS Locked</h1>
        <p className="text-sm mb-5" style={{ color: theme.textMuted }}>Enter the branch PIN to continue</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={8}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submitPin(); }}
          className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl mb-3 font-bold"
          style={{ background: theme.surface, color: theme.text, border: `1px solid ${error ? '#ef4444' : theme.border}` }}
          placeholder="····"
        />
        {error && <p className="text-xs mb-3" style={{ color: '#ef4444' }}>{error}</p>}
        <button
          onClick={submitPin}
          disabled={pin.length < 4 || verifying}
          className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: theme.primary }}
        >
          {verifying && <Loader2 size={14} className="animate-spin" />} Unlock
        </button>
      </div>
    </div>
  );
}

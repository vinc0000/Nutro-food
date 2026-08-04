import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { usePlanInfo } from '@/hooks/useOrgContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function TrialBanner() {
  const { isTrialActive, daysLeft, isSuspended, isTrialExpired } = usePlanInfo();
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (isTrialActive && daysLeft <= 3) {
    return (
      <div className="px-4 py-2.5 flex items-center gap-3 text-sm" style={{ background: '#eab30810', borderBottom: `1px solid #eab30830` }}>
        <Clock size={15} style={{ color: '#eab308' }} />
        <p style={{ color: theme.text }}>
          <span className="font-bold" style={{ color: '#eab308' }}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span> in your free trial.
          <Link to="/app/admin/settings" className="ml-2 font-bold underline" style={{ color: theme.primary }}>Upgrade now →</Link>
        </p>
        <button onClick={() => setDismissed(true)} className="ml-auto p-1 rounded hover:opacity-70"><X size={14} style={{ color: theme.textMuted }} /></button>
      </div>
    );
  }

  if (isTrialExpired || isSuspended) {
    return (
      <div className="px-4 py-2.5 flex items-center gap-3 text-sm" style={{ background: '#ef444410', borderBottom: `1px solid #ef444430` }}>
        <AlertTriangle size={15} style={{ color: '#ef4444' }} />
        <p style={{ color: theme.text }}>
          <span className="font-bold" style={{ color: '#ef4444' }}>Your trial has expired.</span>
          <Link to="/app/admin/settings" className="ml-2 font-bold underline" style={{ color: theme.primary }}>Choose a plan to continue →</Link>
        </p>
        <button onClick={() => setDismissed(true)} className="ml-auto p-1 rounded hover:opacity-70"><X size={14} style={{ color: theme.textMuted }} /></button>
      </div>
    );
  }

  if (isTrialActive && daysLeft <= 7) {
    return (
      <div className="px-4 py-2.5 flex items-center gap-3 text-sm" style={{ background: theme.primary + '08', borderBottom: `1px solid ${theme.primary}20` }}>
        <Clock size={15} style={{ color: theme.primary }} />
        <p style={{ color: theme.text }}>
          <span className="font-bold" style={{ color: theme.primary }}>Free trial active</span> — {daysLeft} days remaining.
          <Link to="/app/admin/settings" className="ml-2 font-semibold underline" style={{ color: theme.primary }}>View plans →</Link>
        </p>
        <button onClick={() => setDismissed(true)} className="ml-auto p-1 rounded hover:opacity-70"><X size={14} style={{ color: theme.textMuted }} /></button>
      </div>
    );
  }

  return null;
}

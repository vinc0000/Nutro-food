import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { usePlanInfo } from '@/hooks/useOrgContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function TrialBanner() {
  const { isTrialActive, trialEndsAt, isSuspended, isTrialExpired, plan } = usePlanInfo();
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!trialEndsAt) return;
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const diff = new Date(trialEndsAt).getTime() - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [trialEndsAt]);

  if (dismissed) return null;

  if (isTrialExpired || isSuspended) {
    return (
      <div className="px-4 py-2.5 flex items-center gap-3 text-sm animate-pulse" style={{ background: '#ef444410', borderBottom: `1px solid #ef444430` }}>
        <AlertTriangle size={15} style={{ color: '#ef4444' }} />
        <p style={{ color: theme.text }} className="flex-1">
          <span className="font-bold" style={{ color: '#ef4444' }}>Your free trial has expired.</span> Choose a subscription plan to reactivate your restaurant portal and restore POS access.
          <Link to="/app/admin/settings" className="ml-2 font-bold underline" style={{ color: theme.primary }}>Select Plan →</Link>
        </p>
        <button onClick={() => setDismissed(true)} className="p-1 rounded hover:opacity-70"><X size={14} style={{ color: theme.textMuted }} /></button>
      </div>
    );
  }

  if (isTrialActive && timeLeft) {
    const isUrgent = timeLeft.days < 3;
    const countdownString = `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;

    return (
      <div className="px-4 py-2.5 flex items-center gap-3 text-sm transition-all"
        style={{
          background: isUrgent ? '#eab30810' : theme.primary + '08',
          borderBottom: `1px solid ${isUrgent ? '#eab30830' : `${theme.primary}20`}`
        }}>
        <Clock size={15} style={{ color: isUrgent ? '#eab308' : theme.primary }} />
        <p style={{ color: theme.text }} className="flex-1">
          <span className="font-bold" style={{ color: isUrgent ? '#eab308' : theme.primary }}>Free trial active ({plan.toUpperCase()})</span> —
          <span className="font-mono font-bold mx-1.5" style={{ color: isUrgent ? '#eab308' : theme.primary }}>{countdownString}</span> remaining before expiration.
          <Link to="/app/admin/settings" className="ml-2 font-semibold underline" style={{ color: theme.primary }}>Upgrade now →</Link>
        </p>
        <button onClick={() => setDismissed(true)} className="ml-auto p-1 rounded hover:opacity-70"><X size={14} style={{ color: theme.textMuted }} /></button>
      </div>
    );
  }

  return null;
}

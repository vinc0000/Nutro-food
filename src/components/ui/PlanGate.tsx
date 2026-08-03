import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { usePlanInfo } from '@/hooks/useOrgContext';
import { useTheme } from '@/contexts/ThemeContext';

interface PlanGateProps {
  feature: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export default function PlanGate({ feature, title, description, children }: PlanGateProps) {
  const { canAccess, isTrialActive } = usePlanInfo();
  const { theme } = useTheme();

  if (canAccess(feature) || isTrialActive) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: theme.primary + '15' }}>
        <Lock size={22} style={{ color: theme.primary }} />
      </div>
      <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>{title ?? 'Premium Feature'}</h3>
      <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: theme.textMuted }}>
        {description ?? 'This feature is not available on your current plan. Upgrade to unlock it.'}
      </p>
      <Link to="/app/admin/settings" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
        style={{ background: theme.primary }}>
        Upgrade Plan
      </Link>
    </div>
  );
}

import { LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: number;
  color?: string;
}

export default function StatCard({ title, value, sub, icon: Icon, trend, color }: StatCardProps) {
  const { theme } = useTheme();
  const iconColor = color ?? theme.primary;

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>{title}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconColor + '18' }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>
      <div>
        <div className="text-3xl font-extrabold" style={{ color: theme.text }}>{value}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className="text-xs font-semibold" style={{ color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday
        </div>
      )}
    </div>
  );
}

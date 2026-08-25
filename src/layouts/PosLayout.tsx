import { Outlet } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import PosPinGate from '@/components/guards/PosPinGate';

export default function PosLayout() {
  const { theme } = useTheme();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg, color: theme.text }}>
      <PosPinGate><Outlet /></PosPinGate>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabletLayout() {
  const { theme } = useTheme();
  return <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}><Outlet /></div>;
}

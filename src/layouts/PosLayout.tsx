import { Outlet } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

export default function PosLayout() {
  const { theme } = useTheme();
  return <div className="min-h-screen flex flex-col" style={{ background: theme.bg, color: theme.text }}><Outlet /></div>;
}

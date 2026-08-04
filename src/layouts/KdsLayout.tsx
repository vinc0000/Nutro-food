import { Outlet } from 'react-router-dom';

export default function KdsLayout() {
  return <div className="min-h-screen" style={{ background: '#0a0a0a', color: '#fff' }}><Outlet /></div>;
}

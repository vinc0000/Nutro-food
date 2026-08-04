import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, Users,
  Settings, LogOut, ChevronLeft, ChevronRight, Monitor,
  ChefHat, Bell, Tablet, FileBarChart, ShieldCheck, Menu as MenuIcon,
  X, ChevronDown, UtensilsCrossed as Logo, Languages
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import TrialBanner from '@/components/ui/TrialBanner';
import { SUPER_ADMIN_EMAILS } from '@/components/guards/RouteGuards';
import { CURRENCIES, LANGUAGES } from '@/lib/countries';

const NAV = [
  { to: '/app/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/tablet', icon: Tablet, label: 'Interactive Tablet Menu', external: true },
  { to: '/app/admin/menu', icon: UtensilsCrossed, label: 'Menu & Recipe Manager' },
  { to: '/app/pos', icon: Monitor, label: 'POS Terminal', external: true },
  { to: '/app/kds', icon: ChefHat, label: 'KDS Kitchen Screen', external: true },
  { to: '/app/admin/reports', icon: FileBarChart, label: 'Reports & Analytics' },
  { to: '/app/admin/staff', icon: Users, label: 'Staff & Access Control' },
  { to: '/app/admin/settings', icon: Settings, label: 'Restaurant Settings' },
];

export default function AdminLayout() {
  const { profile, signOut, user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [localeMenu, setLocaleMenu] = useState(false);
  const [lang, setLang] = useState('en');
  const [currency, setCurrency] = useState('USD');

  const isWhitelisted = SUPER_ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? '');
  const selectedCurrency = CURRENCIES.find(c => c.code === currency);
  const selectedLang = LANGUAGES.find(l => l.code === lang);

  const navLinkStyle = (isActive: boolean) => ({
    background: isActive ? theme.primary : 'transparent',
    color: isActive ? '#fff' : theme.textMuted,
    fontWeight: isActive ? 700 : 600,
  });

  const SidebarContent = () => (
    <>
      <div className="h-14 flex items-center justify-between px-3 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.primary }}>
              <Logo size={14} color="#fff" />
            </div>
            <span className="text-sm font-extrabold text-white">NUTRO</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto p-1 rounded-lg hover:opacity-70 text-gray-400 hidden md:block">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 rounded-lg text-gray-400 md:hidden">
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV.map(item =>
          item.external ? (
            <a key={item.to} href={item.to} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ color: theme.textMuted }} title={collapsed ? item.label : undefined}>
              <item.icon size={17} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </a>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={({ isActive }) => navLinkStyle(isActive)} title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}>
              <item.icon size={17} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        )}
        {isWhitelisted && (
          <>
            <div className="pt-4 pb-2 px-3" style={{ borderTop: `1px solid ${theme.border}`, marginTop: 8 }}>
              {!collapsed && (
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>Platform</p>
              )}
            </div>
            <NavLink to="/app/super-admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={({ isActive }) => ({
                background: isActive ? theme.primary : theme.primary + '15',
                color: isActive ? '#fff' : theme.primary,
              })}
              title={collapsed ? 'Super Admin Command Center' : undefined}
              onClick={() => setMobileOpen(false)}>
              <ShieldCheck size={17} className="flex-shrink-0" />
              {!collapsed && <span>Super Admin Command</span>}
            </NavLink>
          </>
        )}
      </nav>

      {/* Dual language/currency button - saves space */}
      <div className="px-2 pb-2 flex-shrink-0">
        <div className="relative">
          <button onClick={() => setLocaleMenu(!localeMenu)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
            title={collapsed ? `${selectedLang?.name} / ${currency}` : undefined}>
            <Languages size={14} className="flex-shrink-0" style={{ color: theme.primary }} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{selectedLang?.flag} {lang.toUpperCase()} · {selectedCurrency?.symbol} {currency}</span>
                <ChevronDown size={12} style={{ color: theme.textMuted }} />
              </>
            )}
            {collapsed && <span className="text-[10px] font-bold mx-auto">{lang.toUpperCase()}</span>}
          </button>
          {localeMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLocaleMenu(false)} />
              <div className="absolute bottom-full mb-2 left-0 right-0 z-50 rounded-xl p-3 shadow-2xl max-h-80 overflow-auto"
                style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>Language</p>
                <div className="grid grid-cols-3 gap-1 mb-3">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setLang(l.code)}
                      className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{
                        background: lang === l.code ? theme.primary : theme.bg,
                        color: lang === l.code ? '#fff' : theme.textMuted,
                        border: `1px solid ${lang === l.code ? theme.primary : theme.border}`,
                      }}>
                      {l.flag} {l.code.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>Currency</p>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs font-bold outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-3 space-y-1 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="text-xs font-bold truncate" style={{ color: theme.text }}>{profile?.full_name ?? 'Restaurant Admin'}</div>
            <div className="text-[11px] truncate capitalize" style={{ color: theme.textMuted }}>{profile?.system_role ?? 'admin'}</div>
          </div>
        )}
        <button onClick={() => { signOut(); navigate('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
          style={{ color: theme.textMuted }} title={collapsed ? 'Sign Out' : undefined}>
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: theme.bg }}>
      <aside className="hidden md:flex flex-col flex-shrink-0 transition-all duration-200"
        style={{ width: collapsed ? 64 : 240, background: theme.surface, borderRight: `1px solid ${theme.border}` }}>
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ background: theme.surface, borderRight: `1px solid ${theme.border}` }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 flex-shrink-0"
          style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg" style={{ color: theme.text }}>
              <MenuIcon size={18} />
            </button>
            <h1 className="text-sm font-bold" style={{ color: theme.textMuted }}>Restaurant Back-Office</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <button onClick={() => navigate('/app/admin/notifications')} className="p-2 rounded-lg hover:opacity-70 relative" style={{ color: theme.textMuted }}>
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} />
            </button>
            <div className="relative">
              <button onClick={() => setProfileMenu(!profileMenu)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: theme.primary }}>
                  {(profile?.full_name ?? 'A').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold hidden sm:block" style={{ color: theme.text }}>{profile?.full_name?.split(' ')[0] ?? 'Admin'}</span>
                <ChevronDown size={12} style={{ color: theme.textMuted }} />
              </button>
              {profileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl p-4 shadow-2xl"
                    style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <div className="pb-3 mb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <div className="text-sm font-bold" style={{ color: theme.text }}>{profile?.full_name ?? 'Restaurant Admin'}</div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>{user?.email}</div>
                    </div>
                    <button onClick={() => { setProfileMenu(false); navigate('/app/admin/settings'); }}
                      className="w-full flex items-center gap-2 py-2 rounded-lg text-xs font-semibold mb-1" style={{ color: theme.textMuted }}>
                      <Settings size={13} /> Settings
                    </button>
                    <button onClick={() => { signOut(); navigate('/'); }}
                      className="w-full flex items-center gap-2 py-2 rounded-lg text-xs font-semibold" style={{ color: '#ef4444' }}>
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <TrialBanner />
        <main className="flex-1 overflow-auto p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, DollarSign, ShieldCheck,
  LogOut, ChevronLeft, ChevronRight, Bell, Menu as MenuIcon, X,
  Languages, ChevronDown, Check
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import { CURRENCIES, LANGUAGES } from '@/lib/countries';

const NAV = [
  { to: '/app/super-admin', icon: LayoutDashboard, label: 'Command Center', end: true },
  { to: '/app/super-admin/tenants', icon: Building2, label: 'Tenants & Plans' },
  { to: '/app/super-admin/sales-reps', icon: Users, label: 'Sales & Reps' },
  { to: '/app/super-admin/financials', icon: DollarSign, label: 'Financials' },
  { to: '/app/super-admin/admins', icon: ShieldCheck, label: 'Super Admins' },
];

const NOTIFICATIONS = [
  { id: 1, title: 'New tenant registered', desc: 'Sakura Lounge started 7-day trial', time: '5m ago', color: '#22c55e' },
  { id: 2, title: 'Payment received', desc: 'Nile Kitchen paid $189 (Enterprise)', time: '1h ago', color: '#22c55e' },
  { id: 3, title: 'Tenant suspended', desc: 'Casa Verde - payment failure', time: '3h ago', color: '#ef4444' },
  { id: 4, title: 'New sales rep added', desc: 'Sophie Mensah joined', time: '6h ago', color: '#3b82f6' },
];

export default function SuperAdminLayout() {
  const { profile, signOut, user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLocale, setShowLocale] = useState(false);
  const [lang, setLang] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [notifList, setNotifList] = useState(NOTIFICATIONS);
  const [toast, setToast] = useState<string | null>(null);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency);
  const selectedLang = LANGUAGES.find(l => l.code === lang);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const markAllRead = () => {
    setNotifList([]);
    showToast('All notifications marked as read');
  };

  const SidebarContent = () => (
    <>
      <div className="h-14 flex items-center justify-between px-3 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}`, background: '#1E293B' }}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.primary }}>
              <Logo size={14} color="#fff" />
            </div>
            <div>
              <span className="text-sm font-extrabold text-white">NUTRO</span>
              <span className="block text-[10px] font-semibold" style={{ color: theme.primary }}>SUPER ADMIN</span>
            </div>
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
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={({ isActive }) => ({ background: isActive ? theme.primary : 'transparent', color: isActive ? '#fff' : theme.textMuted })}
            title={collapsed ? item.label : undefined}
            onClick={() => setMobileOpen(false)}>
            <item.icon size={17} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Dual language/currency button */}
      <div className="px-2 pb-2 flex-shrink-0">
        <div className="relative">
          <button onClick={() => setShowLocale(!showLocale)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
            title={collapsed ? `${selectedLang?.name} / ${currency}` : undefined}>
            <Languages size={14} className="flex-shrink-0" style={{ color: theme.primary }} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{selectedLang?.flag} {lang.toUpperCase()} - {selectedCurrency?.symbol} {currency}</span>
                <ChevronDown size={12} style={{ color: theme.textMuted }} />
              </>
            )}
            {collapsed && <span className="text-[10px] font-bold mx-auto">{lang.toUpperCase()}</span>}
          </button>
          {showLocale && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLocale(false)} />
              <div className="absolute bottom-full mb-2 left-0 right-0 z-50 rounded-xl p-3 shadow-2xl max-h-80 overflow-auto"
                style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>Language</p>
                <div className="grid grid-cols-3 gap-1 mb-3">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); showToast(`Language: ${l.name}`); }}
                      className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: lang === l.code ? theme.primary : theme.bg, color: lang === l.code ? '#fff' : theme.textMuted, border: `1px solid ${lang === l.code ? theme.primary : theme.border}` }}>
                      {l.flag} {l.code.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>Currency</p>
                <select value={currency} onChange={e => { setCurrency(e.target.value); showToast(`Currency: ${e.target.value}`); }}
                  className="w-full px-3 py-2 rounded-lg text-xs font-bold outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="text-xs font-bold truncate" style={{ color: theme.text }}>{profile?.full_name ?? 'Super Admin'}</div>
            <div className="text-[11px] truncate" style={{ color: theme.primary }}>Super Admin</div>
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
            <h1 className="text-sm font-bold" style={{ color: theme.textMuted }}>Nutro Super Admin Console</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-lg hover:opacity-70 relative" style={{ color: theme.textMuted }}>
                <Bell size={16} />
                {notifList.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} />}
              </button>
              {showNotif && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl shadow-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <span className="text-sm font-bold" style={{ color: theme.text }}>Notifications</span>
                      {notifList.length > 0 && <button onClick={markAllRead} className="text-xs font-semibold" style={{ color: theme.primary }}>Mark all read</button>}
                    </div>
                    <div className="max-h-80 overflow-auto">
                      {notifList.length === 0 ? (
                        <div className="text-center py-8" style={{ color: theme.textMuted }}>
                          <Bell size={24} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">All caught up</p>
                        </div>
                      ) : notifList.map(n => (
                        <div key={n.id} className="flex items-start gap-3 p-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.color }} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold" style={{ color: theme.text }}>{n.title}</div>
                            <div className="text-xs" style={{ color: theme.textMuted }}>{n.desc}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>{n.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Profile menu */}
            <div className="relative">
              <button onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: theme.primary }}>
                  {(profile?.full_name ?? 'A').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold hidden sm:block" style={{ color: theme.text }}>{profile?.full_name?.split(' ')[0] ?? 'Admin'}</span>
                <ChevronDown size={12} style={{ color: theme.textMuted }} />
              </button>
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl p-4 shadow-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <div className="pb-3 mb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <div className="text-sm font-bold" style={{ color: theme.text }}>{profile?.full_name ?? 'Super Admin'}</div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>{user?.email}</div>
                    </div>
                    <button onClick={() => { setShowProfile(false); showToast('Opening settings...'); }}
                      className="w-full flex items-center gap-2 py-2 rounded-lg text-xs font-semibold mb-1" style={{ color: theme.textMuted }}>
                      <Check size={13} /> Settings
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
        <main className="flex-1 overflow-auto p-4 md:p-6"><Outlet /></main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: theme.primary }}>
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

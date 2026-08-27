import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, DollarSign, ShieldCheck,
  LogOut, ChevronLeft, ChevronRight, Bell, Menu as MenuIcon, X,
  Languages, ChevronDown, Check, Users2, CreditCard, KeyRound, ScrollText,
  Activity, BarChart3, LifeBuoy, Code2, FileBarChart, Settings as SettingsIcon,
  ArrowLeftCircle,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import { CURRENCIES, LANGUAGES } from '@/lib/countries';
import { supabase } from '@/lib/supabase';

const NAV = [
  { to: '/app/super-admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/app/super-admin/tenants', icon: Building2, label: 'Tenants' },
  { to: '/app/super-admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/app/super-admin/financials', icon: DollarSign, label: 'Billing' },
  { to: '/app/super-admin/performance', icon: Activity, label: 'Performance' },
  { to: '/app/super-admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/app/super-admin/report', icon: FileBarChart, label: 'Report' },
  { to: '/app/super-admin/sales-reps', icon: Users, label: 'Sales & Reps' },
  { to: '/app/super-admin/users', icon: Users2, label: 'Users' },
  { to: '/app/super-admin/roles', icon: KeyRound, label: 'Roles' },
  { to: '/app/super-admin/admins', icon: ShieldCheck, label: 'Super Admins' },
  { to: '/app/super-admin/support', icon: LifeBuoy, label: 'Support' },
  { to: '/app/super-admin/api', icon: Code2, label: 'API' },
  { to: '/app/super-admin/audit', icon: ScrollText, label: 'Audit' },
  { to: '/app/super-admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/app/super-admin/settings', icon: SettingsIcon, label: 'Settings' },
];

interface LiveNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  color: string;
}

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

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
  const [notifList, setNotifList] = useState<LiveNotification[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency);
  const selectedLang = LANGUAGES.find(l => l.code === lang);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Real recent-activity feed instead of a hardcoded fake list — pulled from the
  // actual tables these events live in (new orgs, successful payments, open tickets),
  // merged and sorted by recency.
  useEffect(() => {
    const loadNotifications = async () => {
      const [orgsRes, subsRes, ticketsRes] = await Promise.all([
        supabase.from('organizations').select('name, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('subscriptions').select('org_id, amount, currency, plan, paid_at').eq('status', 'successful').order('paid_at', { ascending: false }).limit(5),
        supabase.from('support_tickets').select('subject, org_id, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(5),
      ]);

      const orgIds = [...new Set((subsRes.data as Array<{ org_id: string }> ?? []).concat(ticketsRes.data as Array<{ org_id: string }> ?? []).map(r => r.org_id))];
      const { data: orgNames } = orgIds.length ? await supabase.from('organizations').select('id, name').in('id', orgIds) : { data: [] };
      const orgNameById = new Map((orgNames as Array<{ id: string; name: string }> ?? []).map(o => [o.id, o.name]));

      const items: LiveNotification[] = [
        ...((orgsRes.data as Array<{ name: string; created_at: string }> ?? []).map((o, i) => ({
          id: `org-${i}-${o.created_at}`, title: 'New tenant registered', desc: `${o.name} joined the platform`, time: o.created_at, color: '#22c55e',
        }))),
        ...((subsRes.data as Array<{ org_id: string; amount: number; currency: string; plan: string; paid_at: string }> ?? []).map((s, i) => ({
          id: `sub-${i}-${s.paid_at}`, title: 'Payment received', desc: `${orgNameById.get(s.org_id) ?? 'A tenant'} paid ${s.currency} ${s.amount} (${s.plan})`, time: s.paid_at, color: '#22c55e',
        }))),
        ...((ticketsRes.data as Array<{ subject: string; org_id: string; created_at: string }> ?? []).map((t, i) => ({
          id: `ticket-${i}-${t.created_at}`, title: 'New support ticket', desc: `${orgNameById.get(t.org_id) ?? 'A tenant'}: ${t.subject}`, time: t.created_at, color: '#eab308',
        }))),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8)
       .map(n => ({ ...n, time: timeAgo(n.time) }));

      setNotifList(items);
    };
    loadNotifications();
  }, []);

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
        <button onClick={() => navigate('/app/admin')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
          style={{ color: theme.textMuted }} title={collapsed ? 'Back to Platform' : undefined}>
          <ArrowLeftCircle size={16} className="flex-shrink-0" />
          {!collapsed && 'Back to Platform'}
        </button>
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

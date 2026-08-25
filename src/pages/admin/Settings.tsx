import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2, Globe, Bell, CreditCard, Palette, Stamp, Share2, MapPin, Check, Lock, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { usePlanInfo } from '@/hooks/useOrgContext';
import { useTheme, THEMES, ThemeName } from '@/contexts/ThemeContext';
import { COUNTRIES, CURRENCIES, LANGUAGES } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { useOrgContext } from '@/hooks/useOrgContext';

export default function AdminSettings() {
  const { theme, themeName, setTheme } = useTheme();
  const { orgContext } = useOrgContext();
  const location = useLocation();
  const expiredAlert = (location.state as any)?.expiredAlert;

  const [activeTab, setActiveTab] = useState('general');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (expiredAlert) {
      setActiveTab('billing');
    }
  }, [expiredAlert]);

  const showSaved = (msg: string) => { setSavedMsg(msg); setTimeout(() => setSavedMsg(''), 2500); };

  // General settings state — loaded from the real branches row once orgContext
  // resolves (see the loadBranchProfile effect below), not localStorage: this data
  // must be the same for every device/staff member viewing this org, not per-browser.
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Localization settings state
  const [country, setCountry] = useState('AE');
  const [stateRegion, setStateRegion] = useState('');
  const [city, setCity] = useState('');
  const [sector, setSector] = useState('');
  const [landmark, setLandmark] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [language, setLanguage] = useState(() => localStorage.getItem('nutro:settings:language') ?? 'en');

  // Social & Stamp state
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [googleReviews, setGoogleReviews] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Notifications state
  const [notifNewOrder, setNotifNewOrder] = useState(() => JSON.parse(localStorage.getItem('nutro:settings:notifNewOrder') ?? 'true'));
  const [notifKdsOverdue, setNotifKdsOverdue] = useState(() => JSON.parse(localStorage.getItem('nutro:settings:notifKdsOverdue') ?? 'true'));
  const [notifServiceReq, setNotifServiceReq] = useState(() => JSON.parse(localStorage.getItem('nutro:settings:notifServiceReq') ?? 'true'));
  const [notifLowStock, setNotifLowStock] = useState(() => JSON.parse(localStorage.getItem('nutro:settings:notifLowStock') ?? 'true'));
  const [notifDailyRev, setNotifDailyRev] = useState(() => JSON.parse(localStorage.getItem('nutro:settings:notifDailyRev') ?? 'true'));
  const [notifStaffClock, setNotifStaffClock] = useState(() => JSON.parse(localStorage.getItem('nutro:settings:notifStaffClock') ?? 'true'));

  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!orgContext?.branch_id) { setProfileLoading(false); return; }
    let cancelled = false;
    setProfileLoading(true);
    supabase.from('branches').select('*').eq('id', orgContext.branch_id).maybeSingle<{
      name: string; address: string | null; contact_email: string | null; contact_phone: string | null;
      country: string | null; state_region: string | null; city: string | null; sector: string | null;
      landmark: string | null; currency: string | null;
      instagram_url: string | null; tiktok_url: string | null; facebook_url: string | null;
      whatsapp_number: string | null; google_reviews_url: string | null; stamp_url: string | null; logo_url: string | null;
    }>().then(({ data }) => {
      if (cancelled || !data) { setProfileLoading(false); return; }
      setRestaurantName(data.name ?? orgContext.org_name ?? '');
      setAddress(data.address ?? '');
      setEmail(data.contact_email ?? '');
      setPhone(data.contact_phone ?? '');
      setCountry(data.country === 'United Arab Emirates' ? 'AE' : (data.country ?? 'AE'));
      setStateRegion(data.state_region ?? '');
      setCity(data.city ?? '');
      setSector(data.sector ?? '');
      setLandmark(data.landmark ?? '');
      setCurrency(data.currency ?? 'AED');
      setInstagram(data.instagram_url ?? '');
      setTiktok(data.tiktok_url ?? '');
      setFacebook(data.facebook_url ?? '');
      setWhatsapp(data.whatsapp_number ?? '');
      setGoogleReviews(data.google_reviews_url ?? '');
      setStampUrl(data.stamp_url ?? '');
      setLogoUrl(data.logo_url ?? '');
      setProfileLoading(false);
    });
    return () => { cancelled = true; };
  }, [orgContext?.branch_id, orgContext?.org_name]);

  const saveGeneral = async () => {
    if (!orgContext?.branch_id) return;
    const { error } = await supabase.from('branches').update({
      name: restaurantName, address, contact_email: email, contact_phone: phone,
    } as never).eq('id', orgContext.branch_id);
    if (error) { showSaved(`Could not save: ${error.message}`); return; }
    showSaved('Restaurant profile saved successfully');
  };

  const saveLocalization = async () => {
    if (!orgContext?.branch_id) return;
    localStorage.setItem('nutro:settings:language', language);
    const { error } = await supabase.from('branches').update({
      country, state_region: stateRegion, city, sector, landmark, currency,
    } as never).eq('id', orgContext.branch_id);
    if (error) { showSaved(`Could not save: ${error.message}`); return; }
    showSaved('Localization settings saved successfully');
  };

  const saveSocial = async () => {
    if (!orgContext?.branch_id) return;
    const { error } = await supabase.from('branches').update({
      instagram_url: instagram, tiktok_url: tiktok, facebook_url: facebook,
      whatsapp_number: whatsapp, google_reviews_url: googleReviews, stamp_url: stampUrl, logo_url: logoUrl,
    } as never).eq('id', orgContext.branch_id);
    if (error) { showSaved(`Could not save: ${error.message}`); return; }
    showSaved('Social and branding options saved successfully');
  };

  const toggleNotif = (key: string, currentVal: boolean, setter: (v: boolean) => void) => {
    const nextVal = !currentVal;
    setter(nextVal);
    localStorage.setItem(`nutro:settings:${key}`, JSON.stringify(nextVal));
    showSaved('Notification settings updated');
  };

  const TABS = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'branding', label: 'Branding & Theme', icon: Palette },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'social', label: 'Social & Stamp', icon: Share2 },
    { id: 'pos', label: 'POS & Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  const selectedCountry = COUNTRIES.find(c => c.code === country);

  return (
    <div className="space-y-6">
      {expiredAlert && (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#ef444415] border border-[#ef444430] animate-pulse">
          <AlertTriangle className="mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} size={20} />
          <div>
            <h3 className="text-sm font-bold text-red-500">Période d'essai expirée / Abonnement requis</h3>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
              Votre période d'essai gratuite de 14 jours est terminée. Veuillez vous abonner ci-dessous pour débloquer immédiatement l'accès complet à tous vos outils (POS, KDS, Menus, Rapports).
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold" style={{ color: theme.text }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Configure your restaurant profile, branding, and preferences</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: activeTab === tab.id ? theme.primary : theme.surface, color: activeTab === tab.id ? '#fff' : theme.textMuted, border: `1px solid ${activeTab === tab.id ? theme.primary : theme.border}` }}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        {activeTab === 'general' && (
          <div className="space-y-5">
            <h2 className="font-extrabold" style={{ color: theme.text }}>Restaurant Profile</h2>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Restaurant Name</label>
              <input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="My Restaurant" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Dubai" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Business Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="info@restaurant.com" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 XX XXX XXXX" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
            </div>
            <button onClick={() => void saveGeneral()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>Save Changes</button>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h2 className="font-extrabold" style={{ color: theme.text }}>Theme & Branding</h2>
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: theme.textMuted }}>Platform Theme (3 Options)</p>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(THEMES) as ThemeName[]).map(t => (
                  <button key={t} onClick={() => setTheme(t)}
                    className="p-4 rounded-xl text-left transition-all"
                    style={{ background: THEMES[t].surface, border: `2px solid ${themeName === t ? theme.primary : THEMES[t].border}` }}>
                    <div className="w-6 h-6 rounded-lg mb-2" style={{ background: THEMES[t].primary }} />
                    <div className="text-xs font-bold" style={{ color: THEMES[t].text }}>{THEMES[t].label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'localization' && (
          <div className="space-y-5">
            <h2 className="font-extrabold" style={{ color: theme.text }}>Geographic Localization</h2>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Country (auto-sets currency)</label>
              <select value={country} onChange={e => { setCountry(e.target.value); const c = COUNTRIES.find(x => x.code === e.target.value); if (c) setCurrency(c.currency); }}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>State / Region</label>
                <input value={stateRegion} onChange={e => setStateRegion(e.target.value)} placeholder="Dubai" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>City</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Dubai" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Sector / District</label>
                <input value={sector} onChange={e => setSector(e.target.value)} placeholder="Downtown" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Landmark</label>
                <input value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="Near Burj Khalifa" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: theme.primary + '10' }}>
              <MapPin size={14} style={{ color: theme.primary }} />
              <span className="text-xs" style={{ color: theme.textMuted }}>
                Currency auto-set to <strong style={{ color: theme.primary }}>{currency}</strong> for {selectedCountry?.flag} {selectedCountry?.name}. You can override this manually.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Default Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Default Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name} ({l.nativeName})</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => void saveLocalization()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>Save Localization</button>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-extrabold mb-1" style={{ color: theme.text }}>Social Media Links</h2>
              <p className="text-sm mb-4" style={{ color: theme.textMuted }}>Displayed as QR codes & icons on customer tablets</p>
              <div className="mb-3">
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Instagram</label>
                <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="https://instagram.com/yourrestaurant" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>TikTok</label>
                <input value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="https://tiktok.com/@yourrestaurant" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Facebook</label>
                <input value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="https://facebook.com/yourrestaurant" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>WhatsApp</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+971 XX XXX XXXX" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Google Maps Review URL</label>
                <input value={googleReviews} onChange={e => setGoogleReviews(e.target.value)} placeholder="https://g.page/r/yourrestaurant" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
            </div>
            <div className="pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
              <h3 className="font-bold mb-1 flex items-center gap-2" style={{ color: theme.text }}>
                <Stamp size={16} style={{ color: theme.primary }} /> Official Stamp / Digital Signature
              </h3>
              <p className="text-sm mb-3" style={{ color: theme.textMuted }}>Upload your restaurant's official rubber stamp or digital signature for receipts & invoices</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: theme.bg, border: `2px dashed ${theme.border}` }}>
                  {stampUrl ? <img src={stampUrl} alt="Stamp" className="w-full h-full object-cover" /> : <Stamp size={28} style={{ color: theme.textMuted }} />}
                </div>
                <button onClick={() => {
                  const url = prompt('Enter Stamp Image URL:', stampUrl);
                  if (url !== null) setStampUrl(url);
                }} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>Upload Stamp</button>
              </div>
            </div>
            <div className="pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
              <h3 className="font-bold mb-1" style={{ color: theme.text }}>Restaurant Logo</h3>
              <p className="text-sm mb-3" style={{ color: theme.textMuted }}>Used on tablet menus, receipts, and invoices</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: theme.bg, border: `2px dashed ${theme.border}` }}>
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Building2 size={28} style={{ color: theme.textMuted }} />}
                </div>
                <button onClick={() => {
                  const url = prompt('Enter Logo Image URL:', logoUrl);
                  if (url !== null) setLogoUrl(url);
                }} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>Upload Logo</button>
              </div>
            </div>
            <button onClick={() => void saveSocial()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>Save Social & Branding</button>
          </div>
        )}

        {activeTab === 'pos' && <PosSecurityTab theme={theme} showSaved={showSaved} />}

        {activeTab === 'billing' && <BillingTab theme={theme} showSaved={showSaved} />}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="font-extrabold" style={{ color: theme.text }}>Notification Preferences</h2>
            {[
              { label: 'New Order Alerts', desc: 'Notify when a new order is placed', state: notifNewOrder, setter: setNotifNewOrder, key: 'notifNewOrder' },
              { label: 'KDS Overdue Alerts', desc: 'Alert when a ticket exceeds 15 minutes', state: notifKdsOverdue, setter: setNotifKdsOverdue, key: 'notifKdsOverdue' },
              { label: 'Service Request Alerts', desc: 'Sound/visual alert for Call Waiter, Water, Bill requests', state: notifServiceReq, setter: setNotifServiceReq, key: 'notifServiceReq' },
              { label: 'Low Stock Warnings', desc: 'Notify when menu items reach 0 portions', state: notifLowStock, setter: setNotifLowStock, key: 'notifLowStock' },
              { label: 'Daily Revenue Summary', desc: 'Email summary at end of day', state: notifDailyRev, setter: setNotifDailyRev, key: 'notifDailyRev' },
              { label: 'Staff Clock-in Alerts', desc: 'Notify on shift start/end', state: notifStaffClock, setter: setNotifStaffClock, key: 'notifStaffClock' },
            ].map(n => (
              <div key={n.label} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>{n.label}</div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>{n.desc}</div>
                </div>
                <input type="checkbox" checked={n.state} onChange={() => toggleNotif(n.key, n.state, n.setter)} style={{ accentColor: theme.primary }} />
              </div>
            ))}
          </div>
        )}
      </div>
      {savedMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: '#22c55e' }}>
          <Check size={16} /> {savedMsg}
        </div>
      )}
    </div>
  );
}

// function TrialStatusCard() {
//   const { theme } = useTheme();
//   const { isTrialActive, daysLeft, isTrialExpired, isSuspended, plan, planStatus } = usePlanInfo();
//
//   if (isTrialExpired || isSuspended) {
//     return (
//       <div className="p-4 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
//         <div className="flex items-center justify-between mb-1">
//           <span className="font-bold" style={{ color: '#ef4444' }}>Trial Expired</span>
//           <span className="text-xs font-bold uppercase" style={{ color: theme.textMuted }}>{plan}</span>
//         </div>
//         <p className="text-sm" style={{ color: theme.textMuted }}>Your free trial has ended. Choose a plan below to reactivate your account and restore access to all features.</p>
//       </div>
//     );
//   }
//
//   if (isTrialActive) {
//     return (
//       <div className="p-4 rounded-xl" style={{ background: daysLeft <= 3 ? '#eab30810' : theme.primary + '08', border: `1px solid ${daysLeft <= 3 ? '#eab30830' : theme.primary + '20'}` }}>
//         <div className="flex items-center justify-between mb-1">
//           <span className="font-bold" style={{ color: daysLeft <= 3 ? '#eab308' : theme.primary }}>Free Trial Active</span>
//           <span className="text-xs font-bold" style={{ color: daysLeft <= 3 ? '#eab308' : theme.primary }}>{daysLeft} days left</span>
//         </div>
//         <p className="text-sm" style={{ color: theme.textMuted }}>You're on the {plan} plan trial. All features unlocked until your trial expires. Choose a plan below to continue after your trial ends.</p>
//       </div>
//     );
//   }
//
//   return (
//     <div className="p-4 rounded-xl" style={{ background: '#22c55e10', border: '1px solid #22c55e30' }}>
//       <div className="flex items-center justify-between mb-1">
//         <span className="font-bold" style={{ color: '#22c55e' }}>Active Subscription</span>
//         <span className="text-xs font-bold uppercase" style={{ color: theme.textMuted }}>{plan} · {planStatus}</span>
//       </div>
//       <p className="text-sm" style={{ color: theme.textMuted }}>Your subscription is active. You can change or cancel your plan at any time.</p>
//     </div>
//   );
// }

function PosSecurityTab({ theme, showSaved }: { theme: ReturnType<typeof useTheme>['theme']; showSaved: (msg: string) => void }) {
  const { orgContext } = useOrgContext();
  const branchId = orgContext?.branch_id ?? null;
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  const checkExistingPin = useCallback(async () => {
    if (!branchId) return;
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('pos_pin_hash')
        .eq('id', branchId)
        .maybeSingle<{ pos_pin_hash: string | null }>();
      if (error) throw error;
      setHasPin(Boolean(data?.pos_pin_hash));
    } catch {
      setHasPin(false);
    }
  }, [branchId]);

  useEffect(() => { checkExistingPin(); }, [checkExistingPin]);

  const handleSavePin = async () => {
    setError(null);
    if (!branchId) {
      setError('Still loading your branch — please try again in a moment.');
      return;
    }
    if (pin.length < 4 || pin.length > 8) {
      setError('PIN must be 4-8 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setError('PIN must contain only digits');
      return;
    }
    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('set_branch_pos_pin', {
        p_branch_id: branchId,
        p_pin: pin,
      });
      if (rpcError) throw rpcError;
      setHasPin(true);
      setPin('');
      setConfirmPin('');
      showSaved('POS PIN saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: theme.text }}>POS Terminal PIN</h2>
        <p className="text-sm" style={{ color: theme.textMuted }}>
          Set a PIN code to lock your POS terminal. Staff must enter this PIN to access the POS. Leave empty to remove the PIN.
        </p>
      </div>

      {hasPin !== null && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: hasPin ? '#22c55e10' : '#f59e0b10', border: `1px solid ${hasPin ? '#22c55e30' : '#f59e0b30'}` }}>
          {hasPin ? (
            <>
              <Lock size={16} style={{ color: '#22c55e' }} />
              <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>A POS PIN is currently set</span>
            </>
          ) : (
            <>
              <KeyRound size={16} style={{ color: '#f59e0b' }} />
              <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>No POS PIN set — POS is currently unprotected</span>
            </>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>New PIN (4-8 digits)</label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Enter PIN..."
              maxLength={8}
              className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none tracking-widest"
              style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
            />
            <button
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: theme.textMuted }}
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Confirm PIN</label>
          <input
            type={showPin ? 'text' : 'password'}
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="Re-enter PIN..."
            maxLength={8}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none tracking-widest"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
            <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>{error}</span>
          </div>
        )}

        <button
          onClick={handleSavePin}
          disabled={loading || !pin || !confirmPin}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: theme.primary }}
        >
          <Lock size={16} /> {loading ? 'Saving...' : hasPin ? 'Update POS PIN' : 'Create POS PIN'}
        </button>
      </div>

      <div className="p-4 rounded-xl" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
        <div className="flex items-start gap-2">
          <KeyRound size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: theme.text }}>About POS PIN</p>
            <ul className="text-xs space-y-1" style={{ color: theme.textMuted }}>
              <li>The PIN protects access to your POS terminal</li>
              <li>Use 4-8 digits — only numbers are allowed</li>
              <li>Share this PIN only with trusted staff who operate the POS</li>
              <li>You can change or remove the PIN at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingTab({ theme, showSaved }: { theme: ReturnType<typeof useTheme>['theme']; showSaved: (msg: string) => void }) {
  const { plan, planStatus, isTrialActive, daysLeft, refresh } = usePlanInfo();
  const { orgContext } = useOrgContext();
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestTxRef, setLatestTxRef] = useState<string | null>(() => localStorage.getItem('nutro:pending-tx-ref'));
  const [activePsp, setActivePsp] = useState<'flutterwave' | 'payunit' | null>(() => (localStorage.getItem('nutro:pending-psp') as 'flutterwave' | 'payunit' | null));
  const [pspChecking, setPspChecking] = useState(true);

  const PLANS = [
    { name: 'starter', label: 'Starter', price: 29, color: '#94a3b8', features: '10 tables, 3 staff, basic reports' },
    { name: 'premium', label: 'Premium', price: 69, color: '#10B981', features: '30 tables, 10 staff, advanced reports' },
    { name: 'enterprise', label: 'Enterprise', price: 189, color: theme.primary, features: 'Unlimited everything, API access' },
  ];

  const callPsp = async (psp: 'flutterwave' | 'payunit', payload: Record<string, unknown>) => {
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${psp}-pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session?.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    return response.json();
  };

  // PayUnit and Flutterwave are both supported — whichever one has real API
  // credentials configured in Supabase secrets is the one that gets used. If both are
  // configured, PayUnit takes priority (it's the newer, Africa-focused addition); if
  // neither is configured yet, subscribing is disabled with an explanatory message
  // rather than faking a successful payment.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPspChecking(true);
      try {
        const [payunitStatus, flutterwaveStatus] = await Promise.all([
          callPsp('payunit', { action: 'status' }).catch(() => ({ configured: false })),
          callPsp('flutterwave', { action: 'status' }).catch(() => ({ configured: false })),
        ]);
        if (cancelled) return;
        if (payunitStatus?.configured) setActivePsp('payunit');
        else if (flutterwaveStatus?.configured) setActivePsp('flutterwave');
        else setActivePsp(null);
      } finally {
        if (!cancelled) setPspChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubscribe = async (planName: string) => {
    if (!activePsp) {
      setError('Payments are not configured yet. Add Flutterwave or PayUnit API credentials to Supabase secrets to enable subscriptions.');
      return;
    }
    setError(null);
    setPaying(true);
    try {
      const result = await callPsp(activePsp, {
        action: 'initialize',
        plan: planName,
        billing_period: selectedPeriod,
        tenant_org_id: orgContext?.org_id,
      });
      if (result.error) { setError(result.error); return; }
      if (!result.payment_link || !result.tx_ref) { setError('Could not start checkout — please try again.'); return; }

      localStorage.setItem('nutro:pending-tx-ref', result.tx_ref);
      localStorage.setItem('nutro:pending-psp', activePsp);
      setLatestTxRef(result.tx_ref);
      // Full-page redirect to the PSP's real hosted checkout — this is not a modal or
      // simulation, the customer leaves the app and pays on the provider's own page.
      window.location.href = result.payment_link;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout');
    } finally {
      setPaying(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!latestTxRef || !activePsp) {
      setError('No pending payment was initialized for this tenant yet.');
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      const result = await callPsp(activePsp, {
        action: 'verify',
        tx_ref: latestTxRef,
        tenant_org_id: orgContext?.org_id,
      });
      if (result.status === 'successful') {
        localStorage.removeItem('nutro:pending-tx-ref');
        localStorage.removeItem('nutro:pending-psp');
        setLatestTxRef(null);
        await refresh();
        showSaved('Subscription confirmed for this tenant.');
      } else {
        setError(result.message || result.error || 'Payment verification could not be completed yet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // If we just came back from a PSP's hosted checkout page, auto-verify once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success' && latestTxRef && activePsp && !pspChecking) {
      void handleVerifyPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pspChecking]);

  return (
    <div className="space-y-5">
      <h2 className="font-extrabold" style={{ color: theme.text }}>Subscription & Billing</h2>

      {isTrialActive && (
        <div className="p-4 rounded-xl" style={{ background: theme.primary + '10', border: `1px solid ${theme.primary}30` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold" style={{ color: theme.primary }}>Free Trial Active</span>
            <span className="text-xs font-bold" style={{ color: theme.textMuted }}>{daysLeft} days left</span>
          </div>
          <p className="text-sm" style={{ color: theme.textMuted }}>Every plan includes a 14-day free trial. No credit card required to start.</p>
        </div>
      )}

      <div className="flex items-center gap-2 p-1 rounded-xl" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
        {(['monthly', 'annual'] as const).map(p => (
          <button key={p} onClick={() => setSelectedPeriod(p)}
            className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
            style={{ background: selectedPeriod === p ? theme.primary : 'transparent', color: selectedPeriod === p ? '#fff' : theme.textMuted }}>
            {p} {p === 'annual' && '(Save 2 months)'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PLANS.map(p => {
          const price = selectedPeriod === 'annual' ? Math.round(p.price * 10) : p.price;
          const isCurrent = plan === p.name && planStatus === 'active';
          return (
            <div key={p.name} className="p-4 rounded-xl transition-all"
              style={{ background: theme.bg, border: `2px solid ${isCurrent ? '#22c55e' : p.color + '40'}` }}>
              <div className="font-bold text-sm mb-1" style={{ color: p.color }}>{p.label}</div>
              <div className="text-lg font-extrabold" style={{ color: theme.text }}>
                {/* Subscription billing is always USD (see the payunit-pay/flutterwave-pay edge functions) — this is Nutro's own fee, independent of the tenant's branches.currency used for their customers' orders. */}
                ${price}
                <span className="text-xs font-normal" style={{ color: theme.textMuted }}>/{selectedPeriod === 'annual' ? 'yr' : 'mo'}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{p.features}</div>
              <div className="text-[10px] mt-1 font-semibold" style={{ color: theme.primary }}>KDS & Thermal included</div>
              <button
                onClick={() => void handleSubscribe(p.name)}
                disabled={paying || isCurrent || pspChecking || !activePsp}
                className="w-full mt-3 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                style={{ background: isCurrent ? '#22c55e' : theme.primary }}>
                {isCurrent ? 'Current Plan' : paying ? 'Redirecting...' : pspChecking ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      {!pspChecking && !activePsp && (
        <div className="p-3 rounded-xl" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
          <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
            No payment provider is configured yet. Add either Flutterwave (FLW_SECRET_KEY) or PayUnit (PAYUNIT_API_USER / PAYUNIT_API_PASSWORD / PAYUNIT_APP_TOKEN) as Supabase Edge Function secrets to accept real subscriptions.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
          <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      {latestTxRef && (
        <button
          onClick={() => void handleVerifyPayment()}
          disabled={verifying}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: theme.primary }}
        >
          {verifying ? 'Verifying payment...' : 'Verify payment after completion'}
        </button>
      )}

      <div className="p-4 rounded-xl" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
        <div className="flex items-start gap-2">
          <CreditCard size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: theme.text }}>
              {activePsp === 'payunit' ? 'Payment via PayUnit' : activePsp === 'flutterwave' ? 'Payment via Flutterwave' : 'Payments'}
            </p>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              {activePsp === 'payunit'
                ? "We use PayUnit to securely process payments. Supports mobile money, cards, and bank transfers across Africa."
                : "We use Flutterwave to securely process payments. Supports cards, mobile money, bank transfers, and USSD across Africa and beyond."}
              {' '}Clicking Subscribe takes you to the provider's own secure checkout page — Nutro never sees your card or mobile money details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

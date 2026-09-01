import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2, Globe, Bell, CreditCard, Palette, Stamp, Share2, MapPin, Check, Lock, KeyRound, Eye, EyeOff, AlertTriangle, LifeBuoy, Loader2, Gift } from 'lucide-react';
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
  const [uploadingAsset, setUploadingAsset] = useState<'stamp' | 'logo' | null>(null);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);

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

  // Real file upload to Supabase Storage (restaurant-assets bucket) — replaces what
  // used to be a prompt() asking the admin to paste an image URL despite the button
  // being labeled "Upload Stamp"/"Upload Logo". Same pattern already proven in
  // Menu.tsx's own image upload.
  const handleAssetUpload = async (file: File, kind: 'stamp' | 'logo') => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setAssetUploadError('Image too large. Maximum size: 2 MB.'); return; }
    setUploadingAsset(kind);
    setAssetUploadError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${kind}-${orgContext?.branch_id ?? 'branch'}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('restaurant-assets').upload(fileName, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('restaurant-assets').getPublicUrl(fileName);
      if (!pub?.publicUrl) throw new Error('No public URL returned by storage');
      if (kind === 'stamp') setStampUrl(pub.publicUrl); else setLogoUrl(pub.publicUrl);
    } catch (err) {
      setAssetUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingAsset(null);
    }
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
    { id: 'loyalty', label: 'Loyalty Program', icon: Gift },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'support', label: 'Support', icon: LifeBuoy },
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
                <label className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center gap-2" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  {uploadingAsset === 'stamp' && <Loader2 size={14} className="animate-spin" />}
                  {uploadingAsset === 'stamp' ? 'Uploading...' : 'Upload Stamp'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingAsset !== null}
                    onChange={e => { const f = e.target.files?.[0]; if (f) void handleAssetUpload(f, 'stamp'); e.target.value = ''; }} />
                </label>
              </div>
            </div>
            <div className="pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
              <h3 className="font-bold mb-1" style={{ color: theme.text }}>Restaurant Logo</h3>
              <p className="text-sm mb-3" style={{ color: theme.textMuted }}>Used on tablet menus, receipts, and invoices</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: theme.bg, border: `2px dashed ${theme.border}` }}>
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Building2 size={28} style={{ color: theme.textMuted }} />}
                </div>
                <label className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center gap-2" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  {uploadingAsset === 'logo' && <Loader2 size={14} className="animate-spin" />}
                  {uploadingAsset === 'logo' ? 'Uploading...' : 'Upload Logo'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingAsset !== null}
                    onChange={e => { const f = e.target.files?.[0]; if (f) void handleAssetUpload(f, 'logo'); e.target.value = ''; }} />
                </label>
              </div>
            </div>
            {assetUploadError && <p className="text-xs" style={{ color: '#ef4444' }}>{assetUploadError}</p>}
            <button onClick={() => void saveSocial()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>Save Social & Branding</button>
          </div>
        )}

        {activeTab === 'pos' && <PosSecurityTab theme={theme} showSaved={showSaved} />}
        {activeTab === 'loyalty' && <LoyaltyTab theme={theme} showSaved={showSaved} />}

        {activeTab === 'billing' && <BillingTab theme={theme} showSaved={showSaved} />}
        {activeTab === 'support' && <SupportTab theme={theme} showSaved={showSaved} />}

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

function LoyaltyTab({ theme, showSaved }: { theme: ReturnType<typeof useTheme>['theme']; showSaved: (msg: string) => void }) {
  const { orgContext } = useOrgContext();
  const [enabled, setEnabled] = useState(false);
  const [pointsPerUnit, setPointsPerUnit] = useState(1);
  const [rewardThreshold, setRewardThreshold] = useState(100);
  const [rewardDescription, setRewardDescription] = useState('Free item');
  const [rewardValue, setRewardValue] = useState(0);
  const [discountPriority, setDiscountPriority] = useState<'discount' | 'loyalty' | 'both'>('both');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgContext?.org_id) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('loyalty_settings').select('*').eq('org_id', orgContext.org_id).maybeSingle<{
        enabled: boolean; points_per_currency_unit: number; reward_threshold: number; reward_description: string;
        reward_value: number; discount_priority: 'discount' | 'loyalty' | 'both';
      }>();
      if (data) {
        setEnabled(data.enabled);
        setPointsPerUnit(data.points_per_currency_unit);
        setRewardThreshold(data.reward_threshold);
        setRewardDescription(data.reward_description);
        setRewardValue(data.reward_value);
        setDiscountPriority(data.discount_priority);
      }
      setLoading(false);
    })();
  }, [orgContext?.org_id]);

  const save = async () => {
    if (!orgContext?.org_id) return;
    setSaving(true);
    const { error } = await supabase.from('loyalty_settings').upsert({
      org_id: orgContext.org_id,
      enabled,
      points_per_currency_unit: pointsPerUnit,
      reward_threshold: rewardThreshold,
      reward_description: rewardDescription,
      reward_value: rewardValue,
      discount_priority: discountPriority,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: 'org_id' } as never);
    setSaving(false);
    if (!error) showSaved('Loyalty program settings saved');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={24} style={{ color: theme.primary }} /></div>;

  return (
    <div className="space-y-5">
      <h2 className="font-extrabold" style={{ color: theme.text }}>Loyalty Program & Discounts</h2>
      <p className="text-sm" style={{ color: theme.textMuted }}>
        Customers earn points automatically on every paid order that has a phone number attached (collected at checkout on the POS or tablet). No separate signup — the phone number is the loyalty account.
      </p>

      <label className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ accentColor: theme.primary }} className="w-5 h-5" />
        <div>
          <p className="font-bold text-sm" style={{ color: theme.text }}>Enable loyalty program</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>When off, no points are earned or shown, anywhere.</p>
        </div>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Points earned per $1 spent</label>
          <input type="number" min={0.1} step={0.1} value={pointsPerUnit} onChange={e => setPointsPerUnit(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Points needed for reward</label>
          <input type="number" min={1} value={rewardThreshold} onChange={e => setRewardThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Reward description</label>
          <input value={rewardDescription} onChange={e => setRewardDescription(e.target.value)} placeholder="e.g. Free coffee"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Reward value ($ discount)</label>
          <input type="number" min={0} step={0.5} value={rewardValue} onChange={e => setRewardValue(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
      </div>

      <div className="p-4 rounded-xl text-xs" style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.textMuted }}>
        Example: at {pointsPerUnit} point{pointsPerUnit === 1 ? '' : 's'}/$1, a customer needs to spend ${(rewardThreshold / pointsPerUnit).toFixed(2)} total to unlock "{rewardDescription || 'the reward'}" — a ${rewardValue.toFixed(2)} discount applied at the POS.
      </div>

      <div className="pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
        <h3 className="font-bold text-sm mb-1 mt-4" style={{ color: theme.text }}>Price reduction options at the POS</h3>
        <p className="text-xs mb-3" style={{ color: theme.textMuted }}>Choose what a cashier can offer a customer: a manager-approved manual discount, loyalty point redemption, or both.</p>
        <div className="space-y-2">
          {([
            { key: 'both', label: 'Both', desc: 'Manual discount (manager approval required) and loyalty redemption are both available.' },
            { key: 'discount', label: 'Manual discount only', desc: 'Cashiers can apply a discount with manager PIN approval. No loyalty points.' },
            { key: 'loyalty', label: 'Loyalty points only', desc: 'Only point redemption is available — no manual discounts.' },
          ] as const).map(opt => (
            <label key={opt.key} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer" style={{ background: discountPriority === opt.key ? theme.primary + '10' : theme.bg, border: `1px solid ${discountPriority === opt.key ? theme.primary : theme.border}` }}>
              <input type="radio" name="discount_priority" checked={discountPriority === opt.key} onChange={() => setDiscountPriority(opt.key)} style={{ accentColor: theme.primary }} className="mt-0.5" />
              <div>
                <p className="font-bold text-xs" style={{ color: theme.text }}>{opt.label}</p>
                <p className="text-[11px]" style={{ color: theme.textMuted }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button onClick={() => void save()} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: theme.primary }}>
        {saving ? 'Saving...' : 'Save Loyalty Settings'}
      </button>
    </div>
  );
}

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

      <ZReportLimitSection theme={theme} branchId={branchId} showSaved={showSaved} />
    </div>
  );
}

function ZReportLimitSection({ theme, branchId, showSaved }: { theme: ReturnType<typeof useTheme>['theme']; branchId: string | null; showSaved: (msg: string) => void }) {
  const { orgContext, refresh } = useOrgContext();
  const [limit, setLimit] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgContext?.z_report_print_limit) setLimit(orgContext.z_report_print_limit);
  }, [orgContext?.z_report_print_limit]);

  const save = async () => {
    if (!branchId) return;
    setSaving(true);
    const { error } = await supabase.from('branches').update({ z_report_print_limit: limit } as never).eq('id', branchId);
    setSaving(false);
    if (!error) { showSaved('Z-Report print limit updated'); void refresh(); }
  };

  return (
    <div className="p-5 rounded-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
      <h3 className="font-bold text-sm mb-1" style={{ color: theme.text }}>Z-Report daily print limit</h3>
      <p className="text-xs mb-3" style={{ color: theme.textMuted }}>
        How many times cashiers can print the official Z-Report (end-of-day close) per day, per branch. The X-Report (sales snapshot) is unaffected and can always be printed. This protects thermal paper from being wasted on repeated prints.
      </p>
      <div className="flex items-center gap-3">
        <input type="number" min={1} max={20} value={limit} onChange={e => setLimit(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
          className="w-24 px-4 py-2.5 rounded-xl text-sm outline-none font-bold text-center" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        <span className="text-xs" style={{ color: theme.textMuted }}>prints per day</span>
        <button onClick={() => void save()} disabled={saving || !branchId}
          className="ml-auto px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: theme.primary }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function BillingTab({ theme, showSaved }: { theme: ReturnType<typeof useTheme>['theme']; showSaved: (msg: string) => void }) {
  const { plan, planStatus, isTrialActive, daysLeft, refresh } = usePlanInfo();
  const { orgContext, loading: orgLoading } = useOrgContext();
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestTxRef, setLatestTxRef] = useState<string | null>(() => localStorage.getItem('nutro:pending-tx-ref'));
  const [activePsp, setActivePsp] = useState<'flutterwave' | 'payunit' | 'stripe' | 'paystack' | null>(() => (localStorage.getItem('nutro:pending-psp') as 'flutterwave' | 'payunit' | 'stripe' | 'paystack' | null));
  const [availablePsps, setAvailablePsps] = useState<Array<'flutterwave' | 'payunit' | 'stripe' | 'paystack'>>([]);
  const [pspChecking, setPspChecking] = useState(true);
  const [pspPickerFor, setPspPickerFor] = useState<string | null>(null);

  const PLANS = [
    { name: 'starter', label: 'Starter', price: 29, color: '#94a3b8', features: '10 tables, 3 staff, basic reports' },
    { name: 'premium', label: 'Premium', price: 69, color: '#10B981', features: '30 tables, 10 staff, advanced reports' },
    { name: 'enterprise', label: 'Enterprise', price: 189, color: theme.primary, features: 'Unlimited everything, API access' },
  ];

  const callPsp = async (psp: 'flutterwave' | 'payunit' | 'stripe' | 'paystack', payload: Record<string, unknown>) => {
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

  // PayUnit, Flutterwave, Stripe and Paystack are all supported. If exactly one has
  // real API credentials configured in Supabase secrets, it's used automatically. If
  // more than one is configured, the tenant is asked which to pay with (a popup) at
  // Subscribe time instead of the app silently picking one on their behalf — money is
  // moving, so which processor to trust should be their choice. If none are
  // configured, subscribing is disabled with an explanatory message rather than
  // faking a successful payment.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPspChecking(true);
      try {
        const [payunitStatus, flutterwaveStatus, stripeStatus, paystackStatus] = await Promise.all([
          callPsp('payunit', { action: 'status' }).catch(() => ({ configured: false })),
          callPsp('flutterwave', { action: 'status' }).catch(() => ({ configured: false })),
          callPsp('stripe', { action: 'status' }).catch(() => ({ configured: false })),
          callPsp('paystack', { action: 'status' }).catch(() => ({ configured: false })),
        ]);
        if (cancelled) return;
        const configured: Array<'flutterwave' | 'payunit' | 'stripe' | 'paystack'> = [];
        if (payunitStatus?.configured) configured.push('payunit');
        if (flutterwaveStatus?.configured) configured.push('flutterwave');
        if (stripeStatus?.configured) configured.push('stripe');
        if (paystackStatus?.configured) configured.push('paystack');
        setAvailablePsps(configured);
        setActivePsp(configured.length === 1 ? configured[0] : null);
      } finally {
        if (!cancelled) setPspChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubscribe = async (planName: string, pspOverride?: 'flutterwave' | 'payunit' | 'stripe' | 'paystack') => {
    const psp = pspOverride ?? activePsp;
    if (!psp) {
      if (availablePsps.length > 1) { setPspPickerFor(planName); return; }
      setError('Payments are not configured yet. Add Flutterwave, PayUnit, Stripe or Paystack API credentials to Supabase secrets to enable subscriptions.');
      return;
    }
    setError(null);
    setPaying(true);
    try {
      const result = await callPsp(psp, {
        action: 'initialize',
        plan: planName,
        billing_period: selectedPeriod,
        tenant_org_id: orgContext?.org_id,
      });
      if (result.error) { setError(result.error); return; }
      if (!result.payment_link || !result.tx_ref) { setError('Could not start checkout — please try again.'); return; }

      localStorage.setItem('nutro:pending-tx-ref', result.tx_ref);
      localStorage.setItem('nutro:pending-psp', psp);
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

      {!orgLoading && !orgContext?.org_id && (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', color: '#f59e0b' }}>
          No restaurant is associated with this account, so there's no subscription to manage. This is expected for a platform Super Admin account with no restaurant of its own — a normal tenant account created through Sign Up will have one automatically.
        </div>
      )}

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
          // Billing is always actually charged in USD (see the payunit-pay/
          // flutterwave-pay edge functions) — that's independent of the tenant's
          // own operating currency (branches.currency, used for their customers'
          // orders) and isn't changed here. This only adds an automatic, approximate
          // conversion to the tenant's currency alongside it, using the same real
          // rate table (CURRENCIES) the public pricing page already converts with —
          // shown as an estimate, never in place of the actual USD amount that gets
          // charged, so there's no risk of the displayed price disagreeing with what
          // PayUnit/Flutterwave actually bills.
          const tenantCurrency = CURRENCIES.find(c => c.code === orgContext?.currency);
          const convertedPrice = tenantCurrency && tenantCurrency.code !== 'USD' ? Math.round(price * tenantCurrency.rate) : null;
          return (
            <div key={p.name} className="p-4 rounded-xl transition-all"
              style={{ background: theme.bg, border: `2px solid ${isCurrent ? '#22c55e' : p.color + '40'}` }}>
              <div className="font-bold text-sm mb-1" style={{ color: p.color }}>{p.label}</div>
              <div className="text-lg font-extrabold" style={{ color: theme.text }}>
                ${price}
                <span className="text-xs font-normal" style={{ color: theme.textMuted }}>/{selectedPeriod === 'annual' ? 'yr' : 'mo'}</span>
              </div>
              {convertedPrice !== null && (
                <div className="text-xs font-semibold" style={{ color: theme.textMuted }}>≈ {tenantCurrency!.symbol}{convertedPrice.toLocaleString()} — billed in USD</div>
              )}
              <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{p.features}</div>
              <div className="text-[10px] mt-1 font-semibold" style={{ color: theme.primary }}>KDS & Thermal included</div>
              <button
                onClick={() => void handleSubscribe(p.name)}
                disabled={paying || isCurrent || pspChecking || (!activePsp && availablePsps.length === 0) || !orgContext?.org_id}
                className="w-full mt-3 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                style={{ background: isCurrent ? '#22c55e' : theme.primary }}>
                {isCurrent ? 'Current Plan' : paying ? 'Redirecting...' : pspChecking ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      {!pspChecking && availablePsps.length === 0 && (
        <div className="p-3 rounded-xl" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
          <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
            No payment provider is configured yet. Add Flutterwave (FLW_SECRET_KEY), PayUnit (PAYUNIT_API_USER / PAYUNIT_API_PASSWORD / PAYUNIT_APP_TOKEN), Stripe (STRIPE_SECRET_KEY) or Paystack (PAYSTACK_SECRET_KEY) as Supabase Edge Function secrets to accept real subscriptions.
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
              {activePsp === 'payunit' ? 'Payment via PayUnit'
                : activePsp === 'flutterwave' ? 'Payment via Flutterwave'
                : activePsp === 'stripe' ? 'Payment via Stripe'
                : activePsp === 'paystack' ? 'Payment via Paystack'
                : 'Payments'}
            </p>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              {activePsp === 'payunit'
                ? "We use PayUnit to securely process payments. Supports mobile money, cards, and bank transfers across Africa."
                : activePsp === 'flutterwave'
                ? "We use Flutterwave to securely process payments. Supports cards, mobile money, bank transfers, and USSD across Africa and beyond."
                : activePsp === 'stripe'
                ? "We use Stripe to securely process payments. Supports cards and popular wallets worldwide."
                : activePsp === 'paystack'
                ? "We use Paystack to securely process payments. Supports cards, bank transfers, and mobile money across Africa."
                : availablePsps.length > 1
                ? "Multiple payment providers are available — you'll be asked to pick one when you subscribe."
                : ""}
              {' '}Clicking Subscribe takes you to the provider's own secure checkout page — Nutro never sees your card or mobile money details.
            </p>
          </div>
        </div>
      </div>

      {pspPickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setPspPickerFor(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold mb-1" style={{ color: theme.text }}>Choose how to pay</h2>
            <p className="text-xs mb-5" style={{ color: theme.textMuted }}>More than one payment provider is available for this tenant. Pick one to continue.</p>
            <div className="space-y-2">
              {availablePsps.map(psp => (
                <button key={psp} onClick={() => { const plan = pspPickerFor; setPspPickerFor(null); void handleSubscribe(plan, psp); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-left"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  {psp === 'payunit' ? 'PayUnit' : psp === 'flutterwave' ? 'Flutterwave' : psp === 'stripe' ? 'Stripe' : 'Paystack'}
                  <span className="text-xs font-normal" style={{ color: theme.textMuted }}>
                    {psp === 'payunit' ? 'Mobile money, cards, bank transfer'
                      : psp === 'flutterwave' ? 'Cards, mobile money, USSD'
                      : psp === 'stripe' ? 'Cards, wallets'
                      : 'Cards, bank transfer, mobile money'}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setPspPickerFor(null)} className="w-full mt-4 py-2 rounded-xl text-sm font-semibold" style={{ color: theme.textMuted }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SupportTab({ theme, showSaved }: { theme: ReturnType<typeof useTheme>['theme']; showSaved: (msg: string) => void }) {
  const { orgContext } = useOrgContext();
  const [tickets, setTickets] = useState<Array<{ id: string; subject: string; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = async () => {
    if (!orgContext?.org_id) { setLoading(false); return; }
    const { data } = await supabase.from('support_tickets').select('id, subject, status, created_at').eq('org_id', orgContext.org_id).order('created_at', { ascending: false });
    setTickets((data as Array<{ id: string; subject: string; status: string; created_at: string }> ?? []).map(t => ({ id: t.id, subject: t.subject, status: t.status, createdAt: t.created_at })));
    setLoading(false);
  };

  useEffect(() => { loadTickets(); }, [orgContext?.org_id]);

  const submitTicket = async () => {
    if (!orgContext?.org_id || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('support_tickets').insert({
      org_id: orgContext.org_id, subject: subject.trim(), message: message.trim(),
    } as never);
    setSubmitting(false);
    if (error) return;
    setSubject(''); setMessage('');
    showSaved('Support ticket submitted — our team will get back to you');
    loadTickets();
  };

  const statusColor: Record<string, string> = { open: '#eab308', in_progress: '#3b82f6', resolved: '#22c55e', closed: '#6b7280' };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Contact Support</h3>
        <div className="space-y-3">
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue…" rows={4}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
          <button onClick={submitTicket} disabled={submitting || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: theme.primary }}>
            {submitting && <Loader2 size={14} className="animate-spin" />} Submit Ticket
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Your Tickets</h3>
        {loading && <p className="text-xs" style={{ color: theme.textMuted }}>Loading…</p>}
        {!loading && tickets.length === 0 && <p className="text-xs" style={{ color: theme.textMuted }}>No support tickets yet.</p>}
        {!loading && tickets.map(t => (
          <div key={t.id} className="flex items-center justify-between p-3 rounded-xl mb-2" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
            <span className="text-sm" style={{ color: theme.text }}>{t.subject}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: `${statusColor[t.status]}20`, color: statusColor[t.status] }}>{t.status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

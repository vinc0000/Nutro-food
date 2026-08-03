import { useState } from 'react';
import { Building2, Globe, Bell, CreditCard, Palette, Stamp, Share2, MapPin, Check } from 'lucide-react';
import { usePlanInfo } from '@/hooks/useOrgContext';
import { useTheme, THEMES, ThemeName } from '@/contexts/ThemeContext';
import { COUNTRIES, CURRENCIES, LANGUAGES } from '@/lib/countries';

export default function AdminSettings() {
  const { theme, themeName, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [country, setCountry] = useState('AE');
  const [savedMsg, setSavedMsg] = useState('');

  const showSaved = (msg: string) => { setSavedMsg(msg); setTimeout(() => setSavedMsg(''), 2500); };

  const TABS = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'branding', label: 'Branding & Theme', icon: Palette },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'social', label: 'Social & Stamp', icon: Share2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  const selectedCountry = COUNTRIES.find(c => c.code === country);

  return (
    <div className="space-y-6">
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
            {[
              { label: 'Restaurant Name', placeholder: 'My Restaurant' },
              { label: 'Address', placeholder: '123 Main St, Dubai' },
              { label: 'Business Email', placeholder: 'info@restaurant.com' },
              { label: 'Phone Number', placeholder: '+971 XX XXX XXXX' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{f.label}</label>
                <input placeholder={f.placeholder} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
            ))}
            <button onClick={() => showSaved('Restaurant profile saved')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>Save Changes</button>
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
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>State / Region</label>
                <input placeholder="Auto-cascaded" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>City</label>
                <input placeholder="Auto-cascaded" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Sector / District</label>
                <input placeholder="Auto-cascaded" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Landmark</label>
                <input placeholder="Manual override" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: theme.primary + '10' }}>
              <MapPin size={14} style={{ color: theme.primary }} />
              <span className="text-xs" style={{ color: theme.textMuted }}>
                Currency auto-set to <strong style={{ color: theme.primary }}>{selectedCountry?.currency}</strong> for {selectedCountry?.flag} {selectedCountry?.name}. You can override this manually.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Default Currency</label>
                <select className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} defaultValue={selectedCountry?.currency}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Default Language</label>
                <select className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name} ({l.nativeName})</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => showSaved('Localization settings saved')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>Save</button>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-extrabold mb-1" style={{ color: theme.text }}>Social Media Links</h2>
              <p className="text-sm mb-4" style={{ color: theme.textMuted }}>Displayed as QR codes & icons on customer tablets</p>
              {[
                { label: 'Instagram', placeholder: 'https://instagram.com/yourrestaurant' },
                { label: 'TikTok', placeholder: 'https://tiktok.com/@yourrestaurant' },
                { label: 'Facebook', placeholder: 'https://facebook.com/yourrestaurant' },
                { label: 'WhatsApp', placeholder: '+971 XX XXX XXXX' },
                { label: 'Google Maps Review URL', placeholder: 'https://g.page/r/yourrestaurant' },
              ].map(f => (
                <div key={f.label} className="mb-3">
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{f.label}</label>
                  <input placeholder={f.placeholder} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>
              ))}
            </div>
            <div className="pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
              <h3 className="font-bold mb-1 flex items-center gap-2" style={{ color: theme.text }}>
                <Stamp size={16} style={{ color: theme.primary }} /> Official Stamp / Digital Signature
              </h3>
              <p className="text-sm mb-3" style={{ color: theme.textMuted }}>Upload your restaurant's official rubber stamp or digital signature for receipts & invoices</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl flex items-center justify-center" style={{ background: theme.bg, border: `2px dashed ${theme.border}` }}>
                  <Stamp size={28} style={{ color: theme.textMuted }} />
                </div>
                <button onClick={() => showSaved('Stamp upload dialog opened')} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>Upload Stamp</button>
              </div>
            </div>
            <div className="pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
              <h3 className="font-bold mb-1" style={{ color: theme.text }}>Restaurant Logo</h3>
              <p className="text-sm mb-3" style={{ color: theme.textMuted }}>Used on tablet menus, receipts, and invoices</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl flex items-center justify-center" style={{ background: theme.bg, border: `2px dashed ${theme.border}` }}>
                  <Building2 size={28} style={{ color: theme.textMuted }} />
                </div>
                <button onClick={() => showSaved('Logo upload dialog opened')} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>Upload Logo</button>
              </div>
            </div>
            <button onClick={() => showSaved('Social & branding saved')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>Save Social & Branding</button>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-5">
            <h2 className="font-extrabold" style={{ color: theme.text }}>Subscription & Billing</h2>
            <TrialStatusCard />
            <div className="grid grid-cols-3 gap-3">
              {[{ name: 'Starter', price: '$29/mo', color: '#94a3b8', features: '10 tables, 3 staff' },
                { name: 'Premium', price: '$69/mo', color: '#10B981', features: '30 tables, 10 staff' },
                { name: 'Enterprise', price: '$189/mo', color: '#0369A1', features: 'Unlimited everything' }].map(p => (
                <button key={p.name} onClick={() => showSaved(`Switched to ${p.name} plan`)} className="p-4 rounded-xl text-left transition-all hover:opacity-80"
                  style={{ background: theme.bg, border: `2px solid ${p.color}40` }}>
                  <div className="font-bold text-sm mb-1" style={{ color: p.color }}>{p.name}</div>
                  <div className="text-lg font-extrabold" style={{ color: theme.text }}>{p.price}</div>
                  <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{p.features}</div>
                  <div className="text-[10px] mt-1 font-semibold" style={{ color: theme.primary }}>KDS & Thermal included</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="font-extrabold" style={{ color: theme.text }}>Notification Preferences</h2>
            {[
              { label: 'New Order Alerts', desc: 'Notify when a new order is placed' },
              { label: 'KDS Overdue Alerts', desc: 'Alert when a ticket exceeds 15 minutes' },
              { label: 'Service Request Alerts', desc: 'Sound/visual alert for Call Waiter, Water, Bill requests' },
              { label: 'Low Stock Warnings', desc: 'Notify when menu items reach 0 portions' },
              { label: 'Daily Revenue Summary', desc: 'Email summary at end of day' },
              { label: 'Staff Clock-in Alerts', desc: 'Notify on shift start/end' },
            ].map(n => (
              <div key={n.label} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>{n.label}</div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>{n.desc}</div>
                </div>
                <input type="checkbox" defaultChecked style={{ accentColor: theme.primary }} />
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

function TrialStatusCard() {
  const { theme } = useTheme();
  const { isTrialActive, daysLeft, isTrialExpired, isSuspended, plan, planStatus } = usePlanInfo();

  if (isTrialExpired || isSuspended) {
    return (
      <div className="p-4 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold" style={{ color: '#ef4444' }}>Trial Expired</span>
          <span className="text-xs font-bold uppercase" style={{ color: theme.textMuted }}>{plan}</span>
        </div>
        <p className="text-sm" style={{ color: theme.textMuted }}>Your free trial has ended. Choose a plan below to reactivate your account and restore access to all features.</p>
      </div>
    );
  }

  if (isTrialActive) {
    return (
      <div className="p-4 rounded-xl" style={{ background: daysLeft <= 3 ? '#eab30810' : theme.primary + '08', border: `1px solid ${daysLeft <= 3 ? '#eab30830' : theme.primary + '20'}` }}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold" style={{ color: daysLeft <= 3 ? '#eab308' : theme.primary }}>Free Trial Active</span>
          <span className="text-xs font-bold" style={{ color: daysLeft <= 3 ? '#eab308' : theme.primary }}>{daysLeft} days left</span>
        </div>
        <p className="text-sm" style={{ color: theme.textMuted }}>You're on the {plan} plan trial. All features unlocked until your trial expires. Choose a plan below to continue after your trial ends.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl" style={{ background: '#22c55e10', border: '1px solid #22c55e30' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold" style={{ color: '#22c55e' }}>Active Subscription</span>
        <span className="text-xs font-bold uppercase" style={{ color: theme.textMuted }}>{plan} · {planStatus}</span>
      </div>
      <p className="text-sm" style={{ color: theme.textMuted }}>Your subscription is active. You can change or cancel your plan at any time.</p>
    </div>
  );
}

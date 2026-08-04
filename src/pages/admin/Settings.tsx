import { useState, useEffect } from 'react';
import { Building2, Globe, Bell, CreditCard, Palette, Stamp, Share2, MapPin, Check, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { usePlanInfo } from '@/hooks/useOrgContext';
import { useTheme, THEMES, ThemeName } from '@/contexts/ThemeContext';
import { COUNTRIES, CURRENCIES, LANGUAGES } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { useOrgContext } from '@/hooks/useOrgContext';

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
    { id: 'pos', label: 'POS & Security', icon: Lock },
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

        {activeTab === 'pos' && <PosSecurityTab theme={theme} showSaved={showSaved} />}

        {activeTab === 'billing' && <BillingTab theme={theme} showSaved={showSaved} />}

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

function PosSecurityTab({ theme, showSaved }: { theme: ReturnType<typeof useTheme>['theme']; showSaved: (msg: string) => void }) {
  const { orgContext } = useOrgContext();
  const branchId = orgContext?.branch_id ?? null;
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  const checkExistingPin = async () => {
    if (!branchId) return;
    try {
      const { data } = await supabase
        .from('branches')
        .select('pos_pin_hash')
        .eq('id', branchId)
        .maybeSingle();
      setHasPin(!!data?.pos_pin_hash);
    } catch {
      setHasPin(false);
    }
  };

  useEffect(() => { checkExistingPin(); }, []);

  const handleSavePin = async () => {
    setError(null);
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
  const { plan, planStatus, isTrialActive, daysLeft } = usePlanInfo();
  const { orgContext } = useOrgContext();
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PLANS = [
    { name: 'starter', label: 'Starter', price: 29, color: '#94a3b8', features: '10 tables, 3 staff, basic reports' },
    { name: 'premium', label: 'Premium', price: 69, color: '#10B981', features: '30 tables, 10 staff, advanced reports' },
    { name: 'enterprise', label: 'Enterprise', price: 189, color: '#0369A1', features: 'Unlimited everything, API access' },
  ];

  const handleSubscribe = async (planName: string) => {
    setError(null);
    setPaying(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flutterwave-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'initialize',
          plan: planName,
          billing_period: selectedPeriod,
        }),
      });
      const result = await response.json();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.payment_link) {
        window.open(result.payment_link, '_blank');
        showSaved('Redirecting to Flutterwave payment...');
      } else {
        setError('Payment link not available. Flutterwave may not be configured yet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="font-extrabold" style={{ color: theme.text }}>Subscription & Billing</h2>

      {isTrialActive && (
        <div className="p-4 rounded-xl" style={{ background: '#0369A110', border: '1px solid #0369A130' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold" style={{ color: '#0369A1' }}>Free Trial Active</span>
            <span className="text-xs font-bold" style={{ color: theme.textMuted }}>{daysLeft} days left</span>
          </div>
          <p className="text-sm" style={{ color: theme.textMuted }}>Every plan includes a 7-day free trial. No credit card required to start.</p>
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
                {orgContext?.currency === 'USD' || !orgContext?.currency ? '$' : ''}{price}
                <span className="text-xs font-normal" style={{ color: theme.textMuted }}>/{selectedPeriod === 'annual' ? 'yr' : 'mo'}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{p.features}</div>
              <div className="text-[10px] mt-1 font-semibold" style={{ color: theme.primary }}>KDS & Thermal included</div>
              <button
                onClick={() => handleSubscribe(p.name)}
                disabled={paying || isCurrent}
                className="w-full mt-3 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                style={{ background: isCurrent ? '#22c55e' : theme.primary }}>
                {isCurrent ? 'Current Plan' : paying ? 'Processing...' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 rounded-xl" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
          <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      <div className="p-4 rounded-xl" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
        <div className="flex items-start gap-2">
          <CreditCard size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: theme.text }}>Payment via Flutterwave</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              We use Flutterwave to securely process payments. Supports cards, mobile money, bank transfers, and USSD across Africa and beyond.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

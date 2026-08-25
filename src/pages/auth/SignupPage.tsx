import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Eye, EyeOff, AlertCircle, Check,
  Building2, MapPin, Globe, ChevronRight, ChevronLeft, Phone
} from 'lucide-react';
import Logo from '@/components/Logo';
import AuthBackground from '@/components/AuthBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { COUNTRIES, CURRENCIES, LANGUAGES } from '@/lib/countries';

const STEPS = ['Account', 'Location', 'Business', 'Plan'];

const PLANS = [
  { name: 'Starter', price: 29, color: '#94A3B8', desc: '1 location, 10 tables', features: ['Digital Menu', 'KDS', 'Basic Reports'] },
  { name: 'Premium', price: 69, color: '#10B981', desc: '3 locations, 30 tables', features: ['Everything in Starter', 'Full POS', 'Multi-currency', 'Advanced Analytics'], popular: true },
  { name: 'Enterprise', price: 189, color: '#0369A1', desc: 'Unlimited everything', features: ['Everything in Premium', 'AI Assistant', 'Custom Roles', 'Priority Support'] },
];

export default function SignupPage() {
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();
  // A sales rep's referral link is ?ref=<their code> (SalesReps.tsx generates one per
  // rep). Captured here and passed through to create_tenant so commission tracking —
  // which reads organizations.referral_code — has something real to match against,
  // instead of every signup leaving it null forever.
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Business info
  const [restaurantName, setRestaurantName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('AE');
  const [currency, setCurrency] = useState('AED');
  const [language, setLanguage] = useState('en');
  const [city, setCity] = useState('');
  const [plan, setPlan] = useState('Premium');

  const selectedCountry = COUNTRIES.find(c => c.code === country);

  const canProceed = () => {
    if (step === 0) return fullName.length > 1 && email.includes('@') && password.length >= 8;
    if (step === 1) return country.length > 0 && city.length > 0;
    if (step === 2) return restaurantName.length > 1 && phone.length > 3;
    if (step === 3) return plan.length > 0;
    return false;
  };

  const handleNext = () => {
    if (step < 3) { setStep(step + 1); return; }
    handleSubmit();
  };

  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error, needsEmailConfirmation } = await signUp(email, password, fullName, {
      orgName: restaurantName,
      plan: plan.toLowerCase(),
      branchName: 'Main Branch',
      country: selectedCountry?.name || country,
      city,
      currency,
      language,
      phone: phone ? `+${selectedCountry?.dialCode ?? ''} ${phone}` : '',
      referralCode: referralCode || undefined,
    });
    setLoading(false);
    if (error) { setError(error); setStep(0); return; }
    if (needsEmailConfirmation) { setNeedsConfirmation(true); return; }
    navigate('/app/admin', { replace: true });
  };

  const onCountryChange = (code: string) => {
    setCountry(code);
    const c = COUNTRIES.find(x => x.code === code);
    if (c) setCurrency(c.currency);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <AuthBackground />

      {needsConfirmation ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
          <div className="rounded-2xl p-8 text-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: theme.primary + '15' }}>
              <Mail size={26} style={{ color: theme.primary }} />
            </div>
            <h1 className="text-lg font-bold mb-2" style={{ color: theme.text }}>Check your email</h1>
            <p className="text-sm mb-1" style={{ color: theme.textMuted }}>
              We sent a confirmation link to <strong style={{ color: theme.text }}>{email}</strong>.
            </p>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              Click it to activate your account — your 14-day free trial for {restaurantName} starts as soon as you sign in.
            </p>
            <Link to="/auth/login" className="inline-block mt-6 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
              Go to Sign In
            </Link>
          </div>
        </motion.div>
      ) : (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: theme.primary }}>
              <Logo size={22} color="#fff" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight" style={{ color: '#fff' }}>NUTRO</span>
          </Link>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-6 mx-auto w-fit px-4 py-2 rounded-full" style={{ background: 'rgba(15,23,20,0.55)', backdropFilter: 'blur(6px)' }}>
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: i <= step ? theme.primary : 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: `1px solid ${i <= step ? theme.primary : 'rgba(255,255,255,0.3)'}`,
                  }}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span className="text-xs font-semibold hidden sm:block" style={{ color: i <= step ? '#fff' : 'rgba(255,255,255,0.6)' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-6 h-0.5" style={{ background: i < step ? theme.primary : 'rgba(255,255,255,0.25)' }} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-6 sm:p-8" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg mb-4 text-sm"
              style={{ background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444' }}>
              <AlertCircle size={16} />{error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 0: Account */}
            {step === 0 && (
              <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-lg font-bold mb-1" style={{ color: theme.text }}>{t('auth.createAccount')}</h1>
                <p className="text-sm mb-5" style={{ color: theme.textMuted }}>{t('auth.freeTrial')}</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.fullName')}</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                      <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                        onFocus={e => e.target.style.borderColor = theme.primary} onBlur={e => e.target.style.borderColor = theme.border} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.email')}</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@restaurant.com"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                        onFocus={e => e.target.style.borderColor = theme.primary} onBlur={e => e.target.style.borderColor = theme.border} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.password')}</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                      <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                        onFocus={e => e.target.style.borderColor = theme.primary} onBlur={e => e.target.style.borderColor = theme.border} />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Location */}
            {step === 1 && (
              <motion.div key="location" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-lg font-bold mb-1" style={{ color: theme.text }}>Where is your restaurant?</h2>
                <p className="text-sm mb-5" style={{ color: theme.textMuted }}>We auto-detect your currency based on country.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.country')}</label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: theme.textMuted }} />
                      <select value={country} onChange={e => onCountryChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.city')}</label>
                    <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="Dubai"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                      onFocus={e => e.target.style.borderColor = theme.primary} onBlur={e => e.target.style.borderColor = theme.border} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.currencyAuto')}</label>
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: theme.primary + '10', border: `1px solid ${theme.primary}30` }}>
                      <span className="text-lg">{CURRENCIES.find(c => c.code === currency)?.symbol ?? '$'}</span>
                      <div>
                        <div className="text-sm font-bold" style={{ color: theme.text }}>{currency}</div>
                        <div className="text-xs" style={{ color: theme.textMuted }}>{CURRENCIES.find(c => c.code === currency)?.name ?? ''}</div>
                      </div>
                      <Check size={16} className="ml-auto" style={{ color: theme.primary }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Business */}
            {step === 2 && (
              <motion.div key="business" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-lg font-bold mb-1" style={{ color: theme.text }}>Tell us about your restaurant</h2>
                <p className="text-sm mb-5" style={{ color: theme.textMuted }}>This information appears on your receipts and tablet menu.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.restaurantName')}</label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                      <input type="text" required value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="Le Maison Dubai"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                        onFocus={e => e.target.style.borderColor = theme.primary} onBlur={e => e.target.style.borderColor = theme.border} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.phoneNumber')}</label>
                    <div className="flex gap-2">
                      <div className="relative w-24 flex-shrink-0">
                        <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                        <input type="text" value={`+${selectedCountry?.dialCode ?? ''}`} readOnly
                          className="w-full pl-9 pr-2 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }} />
                      </div>
                      <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="XX XXX XXXX"
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                        onFocus={e => e.target.style.borderColor = theme.primary} onBlur={e => e.target.style.borderColor = theme.border} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{t('auth.language')}</label>
                    <div className="relative">
                      <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: theme.textMuted }} />
                      <select value={language} onChange={e => setLanguage(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name} ({l.nativeName})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Plan */}
            {step === 3 && (
              <motion.div key="plan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-lg font-bold mb-1" style={{ color: theme.text }}>{t('auth.choosePlan')}</h2>
                <p className="text-sm mb-5" style={{ color: theme.textMuted }}>{t('auth.planDesc')}</p>
                <div className="space-y-3">
                  {PLANS.map(p => (
                    <button key={p.name} onClick={() => setPlan(p.name)}
                      className="w-full text-left p-4 rounded-xl transition-all"
                      style={{ background: plan === p.name ? theme.primary + '10' : theme.bg, border: `2px solid ${plan === p.name ? theme.primary : theme.border}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${plan === p.name ? theme.primary : theme.border}` }}>
                            {plan === p.name && <div className="w-2 h-2 rounded-full" style={{ background: theme.primary }} />}
                          </div>
                          <span className="font-bold text-sm" style={{ color: p.color }}>{p.name}</span>
                          {p.popular && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: theme.primary + '20', color: theme.primary }}>POPULAR</span>}
                        </div>
                        <span className="text-lg font-extrabold" style={{ color: theme.text }}>${p.price}<span className="text-xs font-normal" style={{ color: theme.textMuted }}>/mo</span></span>
                      </div>
                      <p className="text-xs ml-6" style={{ color: theme.textMuted }}>{p.desc}</p>
                      <div className="flex flex-wrap gap-1.5 ml-6 mt-2">
                        {p.features.map(f => <span key={f} className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: theme.primary + '10', color: theme.primary }}>{f}</span>)}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <button onClick={handleNext} disabled={!canProceed() || loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
              style={{ background: theme.primary }}>
              {loading ? 'Creating account...' : step === 3 ? 'Create Account & Start Trial' : 'Continue'}
              {step < 3 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: theme.textMuted }}>
          Already have an account?{' '}
          <Link to="/auth/login" className="font-semibold hover:underline" style={{ color: theme.primary }}>Sign in</Link>
        </p>

        <div className="text-center mt-4 text-xs" style={{ color: theme.textMuted }}>
          <p>By signing up, you agree to our Terms of Service and Privacy Policy (GDPR/INCO compliant).</p>
        </div>
      </motion.div>
      )}
    </div>
  );
}

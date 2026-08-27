import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import AuthBackground from '@/components/AuthBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem('nutro:remembered-email');
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) { setLoading(false); setError(error); return; }

    // Save/Clear Remembered Email
    if (remember) {
      localStorage.setItem('nutro:remembered-email', email);
    } else {
      localStorage.removeItem('nutro:remembered-email');
    }

    // `from` (where the guard bounced them from before login) always wins. Otherwise,
    // a super admin should land on /app/super-admin, not the generic /app/admin
    // default — that page is empty/useless for an account with no restaurant org of
    // its own, which reads as "no access" even though nothing is actually blocking
    // them, just routing them to the wrong place. Fetched fresh here rather than read
    // from AuthContext's `profile`, since that's populated by an async
    // onAuthStateChange side effect that isn't guaranteed to have resolved yet at
    // this exact point in the login flow.
    const hasExplicitFrom = Boolean((location.state as { from?: { pathname: string } })?.from);
    let destination = from;
    if (!hasExplicitFrom) {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser) {
        const { data: freshProfile } = await supabase.from('profiles').select('system_role').eq('id', freshUser.id).maybeSingle<{ system_role: string }>();
        if (freshProfile?.system_role === 'super_admin') destination = '/app/super-admin';
      }
    }

    setLoading(false);
    navigate(destination, { replace: true });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    // Fire-and-forget: Supabase's resetPasswordForEmail doesn't reveal whether the
    // address is registered, and we mirror that by always showing the same success
    // state regardless of the outcome.
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/login`,
    });
    setForgotSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <AuthBackground />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: theme.primary }}>
              <Logo size={24} color="#fff" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight" style={{ color: '#fff' }}>NUTRO</span>
          </Link>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{t('auth.signin')} to your restaurant platform</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <h1 className="text-xl font-bold mb-6" style={{ color: theme.text }}>{t('auth.welcome')}</h1>

          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg mb-4 text-sm"
              style={{ background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444' }}>
              <AlertCircle size={16} />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: theme.textMuted }}>{t('auth.email')}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@restaurant.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                  onFocus={e => e.target.style.borderColor = theme.primary}
                  onBlur={e => e.target.style.borderColor = theme.border} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: theme.textMuted }}>{t('auth.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                  onFocus={e => e.target.style.borderColor = theme.primary}
                  onBlur={e => e.target.style.borderColor = theme.border} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded" style={{ accentColor: theme.primary }} />
                <span className="text-xs font-medium" style={{ color: theme.textMuted }}>{t('auth.remember')}</span>
              </label>
              <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-semibold hover:underline" style={{ color: theme.primary }}>{t('auth.forgot')}</button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: theme.primary, color: '#fff' }}>
              {loading ? 'Signing in…' : t('auth.signin')}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: theme.textMuted }}>
            {t('auth.noAccount')}{' '}
            <Link to="/auth/signup" className="font-semibold hover:underline" style={{ color: theme.primary }}>{t('auth.signup')}</Link>
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showForgot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => { setShowForgot(false); setForgotSent(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}>
              {forgotSent ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#22c55e20' }}>
                    <Check size={28} style={{ color: '#22c55e' }} />
                  </div>
                  <h2 className="text-lg font-extrabold mb-2" style={{ color: theme.text }}>Recovery Link Sent</h2>
                  <p className="text-sm mb-6" style={{ color: theme.textMuted }}>
                    If an account exists for {forgotEmail || 'that email'}, a password reset link has been sent. Check your inbox and follow the instructions.
                  </p>
                  <button onClick={() => { setShowForgot(false); setForgotSent(false); }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Reset Password</h2>
                    <button onClick={() => setShowForgot(false)} style={{ color: theme.textMuted }}><ArrowLeft size={18} /></button>
                  </div>
                  <p className="text-sm mb-4" style={{ color: theme.textMuted }}>Enter your email address and we'll send you a link to reset your password.</p>
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                      <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@restaurant.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                        onFocus={e => e.target.style.borderColor = theme.primary}
                        onBlur={e => e.target.style.borderColor = theme.border} />
                    </div>
                    <button type="submit" className="w-full py-3 rounded-xl font-bold text-sm text-white" style={{ background: theme.primary }}>
                      Send Recovery Link
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

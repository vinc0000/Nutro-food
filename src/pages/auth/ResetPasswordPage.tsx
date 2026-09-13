import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import Logo from '@/components/Logo';
import AuthBackground from '@/components/AuthBackground';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { supabase } from '@/lib/supabase';

// Reached via the link in the "reset password" email (resetPasswordForEmail's
// redirectTo in LoginPage.tsx now points here instead of /auth/login). Clicking
// that link makes Supabase's client SDK create a real session automatically —
// which is exactly why this page previously didn't work when it pointed at
// /auth/login: PublicOnlyGuard saw that session and immediately redirected the
// person straight into the app, without ever giving them a form to actually set
// a new password. This route is intentionally unguarded (no AuthGuard, no
// PublicOnlyGuard) so a recovery session lands on a real form instead of either
// gate redirecting it away.
export default function ResetPasswordPage() {
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('auth.resetPassword.tooShort', 'Password must be at least 8 characters.'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.mismatch', 'Passwords do not match.'));
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      // The most common real-world case here is an expired or already-used
      // recovery link (Supabase's own recovery tokens are single-use and
      // time-limited) — surfaced as-is rather than guessing at a friendlier
      // message that might misdescribe a different underlying error.
      setError(updateError.message);
      return;
    }

    // Sign out the recovery session on purpose rather than dropping the person
    // straight into the app — they should log in fresh with the password they
    // just set, the same pattern used by most major sign-in providers.
    await supabase.auth.signOut();
    setDone(true);
    setTimeout(() => navigate('/auth/login', { replace: true }), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative" style={{ background: theme.bg }}>
      <AuthBackground />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-2xl p-8" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="flex justify-center mb-6"><Logo /></div>

        {done ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: theme.primary + '20' }}>
              <Check size={24} style={{ color: theme.primary }} />
            </div>
            <h1 className="text-lg font-bold mb-2" style={{ color: theme.text }}>{t('auth.resetPassword.successTitle', 'Password updated')}</h1>
            <p className="text-sm" style={{ color: theme.textMuted }}>{t('auth.resetPassword.successDesc', 'Redirecting you to sign in…')}</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-1 text-center" style={{ color: theme.text }}>{t('auth.resetPassword.title', 'Set a new password')}</h1>
            <p className="text-sm mb-6 text-center" style={{ color: theme.textMuted }}>{t('auth.resetPassword.subtitle', 'Choose a new password for your account.')}</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl flex items-start gap-2 text-sm" style={{ background: '#ef444415', color: '#ef4444' }}>
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: theme.textMuted }}>{t('auth.resetPassword.newPassword', 'New password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                    required
                    minLength={8}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: theme.textMuted }}>{t('auth.resetPassword.confirmPassword', 'Confirm new password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: theme.primary }}>
                {loading ? t('auth.resetPassword.updating', 'Updating…') : t('auth.resetPassword.submit', 'Update password')}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

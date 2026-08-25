import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, SystemRole } from '@/lib/supabase';

export interface OnboardingData {
  orgName: string;
  plan: string;
  branchName?: string;
  country?: string;
  city?: string;
  currency?: string;
  language?: string;
  phone?: string;
  referralCode?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, onboarding?: OnboardingData) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  hasSystemRole: (role: SystemRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const s = session as Session | null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const s = session as Session | null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        (async () => {
          await fetchProfile(s.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, onboarding?: OnboardingData) => {
    // Onboarding data is passed as raw_user_meta_data, read server-side by the
    // handle_new_user() trigger — NOT as a follow-up RPC call. A follow-up call would
    // require an active session, which doesn't exist yet if this Supabase project
    // requires email confirmation before login (the default for new projects). The
    // trigger runs regardless, so tenant provisioning always succeeds on signup.
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          full_name: fullName,
          ...(onboarding ? {
            org_name: onboarding.orgName,
            plan: onboarding.plan?.toLowerCase(),
            branch_name: onboarding.branchName || 'Main Branch',
            country: onboarding.country || null,
            city: onboarding.city || null,
            currency: onboarding.currency || 'USD',
            language: onboarding.language || 'en',
            phone: onboarding.phone || null,
            referral_code: onboarding.referralCode || null,
          } : {}),
        },
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Signup did not return a user — please try again.' };

    // If email confirmation is required, signUp() returns a user but no session yet —
    // tell the caller so it can show a 'check your email' screen instead of trying to
    // navigate into a guarded route the user can't actually access until they confirm.
    return { error: null, needsEmailConfirmation: !data.session };
  };

  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshProfile = async () => { if (user) await fetchProfile(user.id); };

  const isSuperAdmin = profile?.system_role === 'super_admin';
  const hasSystemRole = (role: SystemRole) => profile?.system_role === role;

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, isSuperAdmin, hasSystemRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

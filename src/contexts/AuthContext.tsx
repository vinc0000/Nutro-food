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
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, onboarding?: OnboardingData) => Promise<{ error: string | null }>;
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
    setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
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
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };

    // If onboarding data provided, create the tenant (org + branch + role)
    if (onboarding && data.user) {
      try {
        const { error: rpcError } = await supabase.rpc('create_tenant', {
          p_org_name: onboarding.orgName,
          p_plan: onboarding.plan.toLowerCase(),
          p_billing_email: email,
          p_branch_name: onboarding.branchName || 'Main Branch',
          p_country: onboarding.country || null,
          p_city: onboarding.city || null,
          p_currency: onboarding.currency || 'USD',
          p_language: onboarding.language || 'en',
        });
        if (rpcError) {
          console.error('Tenant creation failed:', rpcError.message);
          return { error: 'Account created but setup incomplete. Please contact support.' };
        }
      } catch (err) {
        console.error('Tenant creation error:', err);
        return { error: 'Account created but setup incomplete. Please contact support.' };
      }
    }

    return { error: null };
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

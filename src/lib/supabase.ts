import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

function createDemoStore() {
  const branchId = 'demo-branch';
  const orgId = 'demo-org';
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: 'demo-admin',
        email: 'demo@nutro.app',
        password: 'demo1234',
        full_name: 'Demo Admin',
        role: 'admin',
      },
    ],
    profiles: [
      {
        id: 'demo-admin',
        email: 'demo@nutro.app',
        full_name: 'Demo Admin',
        avatar_url: null,
        system_role: 'super_admin',
        pin_hash: null,
        theme_preference: 'ocean',
        custom_accent_color: null,
        created_at: now,
      },
    ],
    organizations: [
      {
        id: orgId,
        name: 'Le Maison Dubai',
        slug: 'le-maison-dubai',
        logo_url: null,
        owner_id: 'demo-admin',
        plan: 'premium',
        plan_status: 'active',
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        billing_email: 'demo@nutro.app',
        referral_code: 'NUTRO7',
        created_at: now,
      },
    ],
    branches: [
      {
        id: branchId,
        org_id: orgId,
        name: 'Main Branch',
        address: 'Downtown Dubai' as string | null,
        city: 'Dubai' as string | null,
        country: 'United Arab Emirates' as string | null,
        currency: 'AED',
        timezone: 'Asia/Dubai',
        is_active: true,
        tablet_token: 'demo-tablet-token' as string | null,
        kds_pin: '1234' as string | null,
        pos_pin_hash: '1234' as string | null,
        created_at: now,
      },
    ],
    orders: [
      { id: 'ord-1', branch_id: branchId, table_id: 'table-1', order_number: '1042', order_type: 'dine_in', status: 'preparing', subtotal: 56.5, tax_amount: 2.83, discount_amount: 0, total_amount: 59.33, payment_method: 'card', payment_status: 'paid', notes: null, created_at: new Date().toISOString() },
      { id: 'ord-2', branch_id: branchId, table_id: 'table-4', order_number: '1043', order_type: 'takeaway', status: 'ready', subtotal: 37.0, tax_amount: 1.85, discount_amount: 0, total_amount: 38.85, payment_method: 'cash', payment_status: 'paid', notes: 'Pack well', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
    ],
    restaurant_tables: [
      { id: 'table-1', branch_id: branchId, status: 'occupied' },
      { id: 'table-2', branch_id: branchId, status: 'available' },
      { id: 'table-3', branch_id: branchId, status: 'reserved' },
      { id: 'table-4', branch_id: branchId, status: 'occupied' },
    ],
    session: null as Record<string, unknown> | null,
  };
}

function createMockSupabaseClient() {
  const STORAGE_KEY = 'nutro-demo-store';

  const getDefaultStore = () => createDemoStore();
  const readStore = () => {
    if (typeof window === 'undefined') return getDefaultStore();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = getDefaultStore();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return JSON.parse(raw) as ReturnType<typeof getDefaultStore>;
    } catch {
      return getDefaultStore();
    }
  };

  const writeStore = (store: ReturnType<typeof getDefaultStore>) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  };

  const notifyAuthChange = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nutro-auth-change'));
    }
  };

  const auth = {
    getSession: async () => {
      const store = readStore();
      return { data: { session: store.session ?? null } };
    },
    onAuthStateChange: (callback: (event: string, session: Record<string, unknown> | null) => void) => {
      const listener = () => callback('SIGNED_IN', readStore().session ?? null);
      if (typeof window !== 'undefined') {
        window.addEventListener('nutro-auth-change', listener);
      }
      return { data: { subscription: { unsubscribe: () => { if (typeof window !== 'undefined') window.removeEventListener('nutro-auth-change', listener); } } } };
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const store = readStore();
      const user = store.users.find((entry) => entry.email === email && entry.password === password);
      if (!user) {
        return { data: { user: null, session: null }, error: { message: 'Invalid email or password' } };
      }
      const session = {
        access_token: `demo-${user.id}`,
        token_type: 'bearer',
        user: {
          id: user.id,
          email: user.email,
          user_metadata: { full_name: user.full_name },
        },
      };
      store.session = session;
      writeStore(store);
      notifyAuthChange();
      return { data: { user: session.user, session }, error: null };
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
      const store = readStore();
      const exists = store.users.some((entry) => entry.email === email);
      if (exists) {
        return { data: { user: null, session: null }, error: { message: 'An account already exists for this email.' } };
      }
      const userId = `user-${Date.now()}`;
      const fullName = String(options?.data?.full_name ?? 'New User');
      const user = { id: userId, email, password, full_name: fullName, role: 'admin' };
      store.users.push(user);
      store.profiles.push({
        id: userId,
        email,
        full_name: fullName,
        avatar_url: null,
        system_role: 'user',
        pin_hash: null,
        theme_preference: 'ocean',
        custom_accent_color: null,
        created_at: new Date().toISOString(),
      });
      const session = {
        access_token: `demo-${userId}`,
        token_type: 'bearer',
        user: { id: userId, email, user_metadata: { full_name: fullName } },
      };
      store.session = session;
      writeStore(store);
      notifyAuthChange();
      return { data: { user: session.user, session }, error: null };
    },
    signOut: async () => {
      const store = readStore();
      store.session = null;
      writeStore(store);
      notifyAuthChange();
    },
    resetPasswordForEmail: async (email: string) => {
      // In demo mode there's no real email delivery. We deliberately don't reveal
      // whether the address exists, matching the real Supabase API's behavior.
      void email;
      return { data: {}, error: null };
    },
  };

  const runQuery = (table: string, filters: Array<[string, unknown]>, orderBy: { field: string; ascending: boolean } | null, limitValue: number | null) => {
    const store = readStore();
    const items = (store as Record<string, unknown>)[table] as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(items)) return [];

    const data = items.filter((item) => filters.every(([field, value]) => item[field] === value));
    if (orderBy) {
      data.sort((a, b) => {
        const aValue = a[orderBy.field] as any;
        const bValue = b[orderBy.field] as any;
        if (aValue === bValue) return 0;
        const comparison = aValue < bValue ? -1 : 1;
        return orderBy.ascending ? comparison : -comparison;
      });
    }
    return limitValue !== null ? data.slice(0, limitValue) : data;
  };

  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    const state = {
      filters: [] as Array<[string, unknown]>,
      orderBy: null as { field: string; ascending: boolean } | null,
      limitValue: null as number | null,
      updateValues: null as Record<string, unknown> | null,
      deleteFlag: false,
    };

    const computeData = () => runQuery(table, state.filters, state.orderBy, state.limitValue);

    const applyMutation = () => {
      const store = readStore();
      const items = (store as Record<string, unknown>)[table] as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(items)) return { data: [] as Array<Record<string, unknown>>, error: null };

      const matches = (item: Record<string, unknown>) => state.filters.every(([field, value]) => item[field] === value);

      if (state.deleteFlag) {
        const removed = items.filter(matches);
        (store as Record<string, unknown>)[table] = items.filter((item) => !matches(item));
        writeStore(store);
        return { data: removed, error: null };
      }

      if (state.updateValues) {
        const updated: Array<Record<string, unknown>> = [];
        (store as Record<string, unknown>)[table] = items.map((item) => {
          if (!matches(item)) return item;
          const next = { ...item, ...state.updateValues };
          updated.push(next);
          return next;
        });
        writeStore(store);
        return { data: updated, error: null };
      }

      return { data: computeData(), error: null };
    };

    builder.select = () => builder;
    builder.eq = (field: string, value: unknown) => {
      state.filters.push([field, value]);
      return builder;
    };
    builder.order = (field: string, options?: { ascending?: boolean }) => {
      state.orderBy = { field, ascending: options?.ascending ?? true };
      return builder;
    };
    builder.limit = (value: number) => {
      state.limitValue = value;
      return builder;
    };
    builder.update = (values: Record<string, unknown>) => {
      state.updateValues = values;
      return builder;
    };
    builder.delete = () => {
      state.deleteFlag = true;
      return builder;
    };
    builder.maybeSingle = async () => {
      if (state.updateValues || state.deleteFlag) {
        const { data, error } = applyMutation();
        return { data: data[0] ?? null, error };
      }
      const data = computeData()[0] ?? null;
      return { data, error: null };
    };
    Object.defineProperty(builder, 'data', {
      get: () => computeData(),
    });

    interface SupabaseBuilder {
      data: Array<Record<string, unknown>>;
      select: (columns?: string) => SupabaseBuilder;
      eq: (field: string, value: unknown) => SupabaseBuilder;
      order: (field: string, options?: { ascending?: boolean }) => SupabaseBuilder;
      limit: (value: number) => SupabaseBuilder;
      update: (values: Record<string, unknown>) => SupabaseBuilder;
      delete: () => SupabaseBuilder;
      maybeSingle: <T = Record<string, unknown>>() => Promise<{ data: T | null; error: any }>;
      then: (callback: (result: { data: any[]; error: null }) => void) => Promise<void>;
    }

    // Support simple promise-like .then() chaining (covers plain selects as well as
    // .update()/.delete() calls that are awaited directly without .maybeSingle()).
    (builder as any).then = (callback: any) => {
      return Promise.resolve(applyMutation()).then(callback);
    };

    return builder as unknown as SupabaseBuilder;
  };

  const rpc = async (name: string, params?: Record<string, unknown>) => {
    const store = readStore();
    if (name === 'get_user_org_context') {
      const currentUser = store.session?.user as { id?: string; email?: string } | undefined;
      const profile = store.profiles.find((entry) => entry.id === currentUser?.id) ?? null;
      const organization = store.organizations[0];
      const branch = store.branches[0];
      return {
        data: {
          org_id: organization?.id ?? 'demo-org',
          org_name: organization?.name ?? 'Le Maison Dubai',
          plan: organization?.plan ?? 'premium',
          plan_status: organization?.plan_status ?? 'active',
          trial_ends_at: organization?.trial_ends_at ?? null,
          branch_id: branch?.id ?? 'demo-branch',
          branch_name: branch?.name ?? 'Main Branch',
          currency: branch?.currency ?? 'AED',
          country: branch?.country ?? 'United Arab Emirates',
          city: branch?.city ?? 'Dubai',
          role: profile?.system_role ?? 'user',
          permissions: { menu: ['read', 'write'], orders: ['read', 'write'], reports: ['read'] },
        },
        error: null,
      };
    }

    if (name === 'create_tenant') {
      const orgName = String(params?.p_org_name ?? 'Demo Org');
      const branchName = String(params?.p_branch_name ?? 'Main Branch');
      const existingOrg = store.organizations[0];
      if (!existingOrg) {
        store.organizations.unshift({
          id: 'demo-org',
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          logo_url: null,
          owner_id: (store.session as any)?.user?.id ?? 'demo-admin',
          plan: String(params?.p_plan ?? 'premium'),
          plan_status: 'active',
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          billing_email: String(params?.p_billing_email ?? 'demo@nutro.app'),
          referral_code: 'NUTRO7',
          created_at: new Date().toISOString(),
        });
      }
      if (!store.branches.find((branch) => branch.name === branchName)) {
        store.branches.push({
          id: `branch-${Date.now()}`,
          org_id: store.organizations[0]?.id ?? 'demo-org',
          name: branchName,
          address: null,
          city: params?.p_city ? String(params.p_city) : null,
          country: params?.p_country ? String(params.p_country) : null,
          currency: params?.p_currency ? String(params.p_currency) : 'USD',
          timezone: 'UTC',
          is_active: true,
          tablet_token: null,
          kds_pin: '1234',
          pos_pin_hash: null,
          created_at: new Date().toISOString(),
        });
      }
      writeStore(store);
      return { data: true, error: null };
    }

    return { data: null, error: null };
  };

  const localObjectUrls: Record<string, string> = {};

  const storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File, options?: { contentType?: string }) => {
        if (typeof window !== 'undefined') {
          const objectUrl = URL.createObjectURL(file);
          localObjectUrls[path] = objectUrl;
          window.localStorage.setItem(`nutro:${bucket}:${path}`, JSON.stringify({ name: file.name, type: file.type, size: file.size, objectUrl, options }));
        }
        return { error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: localObjectUrls[path] ?? `https://demo.local/${bucket}/${path}` } }),
    }),
  };

  return { auth, from, rpc, storage };
}

const supabaseClient = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : createMockSupabaseClient();

export const supabase = supabaseClient;

export type SystemRole = 'super_admin' | 'sales_rep' | 'accountant' | 'user';
export type OrgRole = 'org_owner' | 'branch_manager' | 'cashier' | 'kitchen_staff' | 'accountant' | 'custom';
export type Plan = 'starter' | 'premium' | 'enterprise' | 'trial';
export type PlanStatus = 'trial' | 'active' | 'suspended' | 'cancelled';
export type ThemeName = 'ocean' | 'emerald' | 'slate';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  system_role: SystemRole;
  pin_hash: string | null;
  theme_preference: ThemeName;
  custom_accent_color: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string | null;
  plan: Plan;
  plan_status: PlanStatus;
  trial_ends_at: string | null;
  billing_email: string | null;
  referral_code: string | null;
  created_at: string;
}

export interface Branch {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  is_active: boolean;
  tablet_token: string | null;
  kds_pin: string | null;
  pos_pin_hash: string | null;
  created_at: string;
}

export interface MenuItem {
  id: string;
  branch_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  weight_g: number | null;
  is_halal: boolean;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_gluten_free: boolean;
  is_keto: boolean;
  is_nut_free: boolean;
  contains_dairy: boolean;
  contains_shellfish: boolean;
  is_spicy: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface MenuCategory {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  icon: string | null;
  is_active: boolean;
}

export interface Order {
  id: string;
  branch_id: string;
  table_id: string | null;
  order_number: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  cashier_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string | null;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  notes: string | null;
  created_at: string;
}

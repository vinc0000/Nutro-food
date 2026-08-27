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
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        billing_email: 'demo@nutro.app',
        referral_code: 'NUTRO7' as string | null,
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
        pos_pin_hash: 'demo-pin-1234' as string | null, // demo PIN is 1234 — matches verify_branch_pos_pin's mock format below
        created_at: now,
      },
    ],
    orders: [
      { id: 'ord-1', branch_id: branchId, table_id: 'table-1', table_label: 'Table 1', order_number: '#1042', order_type: 'dine_in', status: 'preparing', cashier_id: null, subtotal: 56.5, tax_amount: 2.83, discount_amount: 0, total_amount: 59.33, payment_method: 'card', payment_status: 'paid', source: 'tablet', notes: null, created_at: new Date(Date.now() - 8 * 60000).toISOString(), updated_at: new Date(Date.now() - 5 * 60000).toISOString() },
      { id: 'ord-2', branch_id: branchId, table_id: 'table-4', table_label: 'Takeaway', order_number: '#1043', order_type: 'takeaway', status: 'ready', cashier_id: 'demo-admin', subtotal: 37.0, tax_amount: 1.85, discount_amount: 0, total_amount: 38.85, payment_method: 'cash', payment_status: 'paid', source: 'pos', notes: 'Pack well', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
    ],
    order_items: [
      { id: 'oi-1', order_id: 'ord-1', menu_item_id: 'item-1', name: 'Wagyu Beef Burger', unit_price: 24, quantity: 2, subtotal: 48, modifiers: [], notes: null, created_at: new Date().toISOString() },
      { id: 'oi-2', order_id: 'ord-1', menu_item_id: 'item-2', name: 'Truffle Fries', unit_price: 9, quantity: 1, subtotal: 9, modifiers: [], notes: null, created_at: new Date().toISOString() },
      { id: 'oi-3', order_id: 'ord-2', menu_item_id: 'item-5', name: 'Fresh Lemonade', unit_price: 6, quantity: 2, subtotal: 12, modifiers: [], notes: null, created_at: new Date().toISOString() },
      { id: 'oi-4', order_id: 'ord-2', menu_item_id: 'item-3', name: 'Vegan Buddha Bowl', unit_price: 18, quantity: 1, subtotal: 18, modifiers: [], notes: null, created_at: new Date().toISOString() },
    ],
    branch_public_info: [
      { id: branchId, name: 'Main Branch', currency: 'AED', country: 'United Arab Emirates', city: 'Dubai', tablet_token: 'demo-tablet-token', logo_url: null as string | null },
    ],
    menu_categories: [
      { id: 'cat-starters', branch_id: branchId, name: 'Starters', description: null, sort_order: 0, icon: null, is_active: true, created_at: now },
      { id: 'cat-mains', branch_id: branchId, name: 'Mains', description: null, sort_order: 1, icon: null, is_active: true, created_at: now },
      { id: 'cat-desserts', branch_id: branchId, name: 'Desserts', description: null, sort_order: 2, icon: null, is_active: true, created_at: now },
      { id: 'cat-drinks', branch_id: branchId, name: 'Drinks', description: null, sort_order: 3, icon: null, is_active: true, created_at: now },
    ],
    menu_items: [
      {
        id: 'item-1', branch_id: branchId, category_id: 'cat-mains', name: 'Wagyu Beef Burger',
        description: 'Premium A5 Wagyu patty, aged cheddar, truffle aioli, brioche bun.', price: 24,
        image_url: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=400',
        calories: 820, protein_g: 48, carbs_g: 42, fats_g: 52, fiber_g: 4, weight_g: 380,
        is_halal: true, is_vegan: false, is_gluten_free: false, is_keto: false, is_nut_free: true, is_spicy: false,
        is_available: true, stock: 15, sort_order: 0,
        ingredients: [{ name: 'Wagyu beef', grams: 180 }, { name: 'Brioche bun', grams: 60 }, { name: 'Cheddar', grams: 20 }],
        allergens: ['Gluten', 'Dairy'], tax_rate: 5, portion_size: 'Regular', created_at: now,
      },
      {
        id: 'item-2', branch_id: branchId, category_id: 'cat-starters', name: 'Truffle Fries',
        description: 'Hand-cut fries tossed in truffle oil and parmesan.', price: 9,
        image_url: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=400',
        calories: 380, protein_g: 6, carbs_g: 48, fats_g: 18, fiber_g: 5, weight_g: 200,
        is_halal: true, is_vegan: true, is_gluten_free: true, is_keto: false, is_nut_free: true, is_spicy: false,
        is_available: true, stock: 30, sort_order: 1,
        ingredients: [{ name: 'Potatoes', grams: 200 }, { name: 'Truffle oil', grams: 5 }],
        allergens: ['Dairy'], tax_rate: 5, portion_size: 'Large', created_at: now,
      },
      {
        id: 'item-3', branch_id: branchId, category_id: 'cat-mains', name: 'Vegan Buddha Bowl',
        description: 'Quinoa, roasted veggies, avocado, tahini, mixed greens.', price: 18,
        image_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=400',
        calories: 540, protein_g: 22, carbs_g: 68, fats_g: 16, fiber_g: 12, weight_g: 420,
        is_halal: true, is_vegan: true, is_gluten_free: true, is_keto: false, is_nut_free: false, is_spicy: false,
        is_available: true, stock: 8, sort_order: 2,
        ingredients: [{ name: 'Quinoa', grams: 150 }, { name: 'Avocado', grams: 50 }],
        allergens: ['Sesame'], tax_rate: 5, portion_size: 'Regular', created_at: now,
      },
      {
        id: 'item-4', branch_id: branchId, category_id: 'cat-desserts', name: 'Chocolate Lava Cake',
        description: 'Warm molten chocolate cake, vanilla ice cream.', price: 11,
        image_url: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?w=400',
        calories: 460, protein_g: 7, carbs_g: 62, fats_g: 22, fiber_g: 3, weight_g: 180,
        is_halal: true, is_vegan: false, is_gluten_free: false, is_keto: false, is_nut_free: false, is_spicy: false,
        is_available: false, stock: 0, sort_order: 3,
        ingredients: [{ name: 'Dark chocolate', grams: 80 }, { name: 'Butter', grams: 40 }],
        allergens: ['Gluten', 'Dairy', 'Egg'], tax_rate: 5, portion_size: 'Small', created_at: now,
      },
      {
        id: 'item-5', branch_id: branchId, category_id: 'cat-drinks', name: 'Fresh Lemonade',
        description: 'House-squeezed lemonade with mint and ice.', price: 6,
        image_url: 'https://images.pexels.com/photos/1998635/pexels-photo-1998635.jpeg?w=400',
        calories: 120, protein_g: 0, carbs_g: 28, fats_g: 0, fiber_g: 0, weight_g: 350,
        is_halal: true, is_vegan: true, is_gluten_free: true, is_keto: false, is_nut_free: true, is_spicy: false,
        is_available: true, stock: 50, sort_order: 4,
        ingredients: [{ name: 'Lemon juice', grams: 30 }, { name: 'Mint', grams: 10 }],
        allergens: [] as string[], tax_rate: 5, portion_size: 'Large', created_at: now,
      },
    ] as Array<Record<string, unknown>>,
    restaurant_tables: [
      { id: 'table-1', branch_id: branchId, status: 'occupied' },
      { id: 'table-2', branch_id: branchId, status: 'available' },
      { id: 'table-3', branch_id: branchId, status: 'reserved' },
      { id: 'table-4', branch_id: branchId, status: 'occupied' },
    ],
    user_org_roles: [
      { id: 'membership-demo-admin', user_id: 'demo-admin', org_id: orgId, branch_id: null, role_name: 'owner', permissions: {}, is_active: true, created_at: now },
    ] as Array<Record<string, unknown>>,
    integrations: [] as Array<Record<string, unknown>>,
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
    // Was entirely missing: LoginPage.tsx and SignupPage.tsx both `await
    // supabase.auth.getUser()` directly (uncaught) right after a successful sign-in to
    // decide the post-login redirect. With no getUser on the mock, that call threw
    // "supabase.auth.getUser is not a function" — confirmed via a live browser test —
    // which stopped execution before `navigate()` ran, i.e. demo-mode login silently
    // failed to complete this step. Mirrors the real client: returns the current
    // session's user, or null if there isn't one, never throws.
    getUser: async () => {
      const store = readStore();
      const user = (store.session as { user?: Record<string, unknown> } | null)?.user ?? null;
      return { data: { user }, error: null };
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

      // Mirrors handle_new_user() server-side: if onboarding data was passed at
      // signUp() time, provision the tenant right here — no separate RPC call needed,
      // same as the real trigger.
      const orgName = options?.data?.org_name ? String(options.data.org_name) : null;
      if (orgName) {
        const orgId = `org-${Date.now()}`;
        const branchId = `branch-${Date.now()}`;
        store.organizations.push({
          id: orgId,
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          logo_url: null,
          owner_id: userId,
          plan: options?.data?.plan ? String(options.data.plan) : 'trial',
          plan_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          billing_email: email,
          referral_code: null as string | null,
          created_at: new Date().toISOString(),
        });
        store.branches.push({
          id: branchId,
          org_id: orgId,
          name: options?.data?.branch_name ? String(options.data.branch_name) : 'Main Branch',
          address: null,
          city: options?.data?.city ? String(options.data.city) : null,
          country: options?.data?.country ? String(options.data.country) : null,
          currency: options?.data?.currency ? String(options.data.currency) : 'USD',
          timezone: 'UTC',
          is_active: true,
          tablet_token: `demo-token-${branchId}`,
          kds_pin: null,
          pos_pin_hash: null,
          created_at: new Date().toISOString(),
        } as never);
        (store.user_org_roles as Array<Record<string, unknown>>).push({
          id: `membership-${Date.now()}`,
          user_id: userId,
          org_id: orgId,
          branch_id: null,
          role_name: 'owner',
          permissions: {},
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }

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

  // A single filter predicate accumulated by .eq/.neq/.gt/.gte/.lt/.lte/.in/.is/.not
  // (mirrors the small subset of PostgREST's query builder this app actually calls
  // client-side — see the grep-verified call sites: SuperAdminLayout.tsx, Support.tsx,
  // Report.tsx, Performance.tsx, Subscriptions.tsx and admin/Dashboard.tsx use .in()/
  // .not()/.gte(), none of which the mock previously implemented, so every one of
  // those pages threw "supabase.from(...).select(...).gte is not a function" (etc.)
  // in demo mode instead of rendering).
  type QueryFilter = { field: string; op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is' | 'not_is'; value: unknown };

  const matchesFilter = (item: Record<string, unknown>, filter: QueryFilter): boolean => {
    const actual = item[filter.field];
    switch (filter.op) {
      case 'eq':
        return actual === filter.value;
      case 'neq':
        return actual !== filter.value;
      case 'gt':
        return (actual as any) > (filter.value as any);
      case 'gte':
        return (actual as any) >= (filter.value as any);
      case 'lt':
        return (actual as any) < (filter.value as any);
      case 'lte':
        return (actual as any) <= (filter.value as any);
      case 'in':
        return Array.isArray(filter.value) && (filter.value as unknown[]).includes(actual);
      case 'is':
        return actual === filter.value;
      case 'not_is':
        return actual !== filter.value;
      default:
        return true;
    }
  };

  const runQuery = (table: string, filters: Array<QueryFilter>, orderBy: { field: string; ascending: boolean } | null, limitValue: number | null) => {
    const store = readStore();
    const items = (store as Record<string, unknown>)[table] as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(items)) return [];

    const data = items.filter((item) => filters.every((filter) => matchesFilter(item, filter)));
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
      filters: [] as Array<QueryFilter>,
      orderBy: null as { field: string; ascending: boolean } | null,
      limitValue: null as number | null,
      updateValues: null as Record<string, unknown> | null,
      insertValues: null as Record<string, unknown> | Record<string, unknown>[] | null,
      upsertValues: null as Record<string, unknown> | null,
      upsertConflictKeys: [] as string[],
      deleteFlag: false,
    };

    const computeData = () => runQuery(table, state.filters, state.orderBy, state.limitValue);

    const applyMutation = () => {
      const store = readStore();
      const items = (store as Record<string, unknown>)[table] as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(items)) return { data: [] as Array<Record<string, unknown>>, error: null };

      const matches = (item: Record<string, unknown>) => state.filters.every((filter) => matchesFilter(item, filter));

      if (state.insertValues) {
        // insert() takes either a single row or an array of rows (used by
        // ordersStore.addOrder's batched order_items insert) — mirror
        // supabase-js's real behavior instead of assuming one row.
        const rows = Array.isArray(state.insertValues) ? state.insertValues : [state.insertValues];
        const inserted = rows.map((row) => ({
          id: `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
          ...row,
        }));
        items.push(...inserted);
        (store as Record<string, unknown>)[table] = items;

        // Mirror the real decrement_menu_item_stock trigger: placing an order
        // (POS or tablet, either way this table is where line items land)
        // actually depletes stock instead of only the admin's manual +/-.
        if (table === 'order_items') {
          const menuItems = store.menu_items as Array<Record<string, unknown>>;
          for (const row of inserted) {
            const menuItemId = (row as Record<string, unknown>).menu_item_id as string | null;
            const quantity = Number((row as Record<string, unknown>).quantity ?? 0);
            if (!menuItemId || !quantity) continue;
            const menuItem = menuItems.find((m) => m.id === menuItemId);
            if (menuItem) menuItem.stock = Math.max(0, Number(menuItem.stock ?? 0) - quantity);
          }
        }

        writeStore(store);
        return { data: inserted, error: null };
      }

      if (state.upsertValues) {
        const keys = state.upsertConflictKeys.length ? state.upsertConflictKeys : Object.keys(state.upsertValues);
        const existingIndex = items.findIndex((item) => keys.every((k) => item[k] === (state.upsertValues as Record<string, unknown>)[k]));
        if (existingIndex >= 0) {
          const updated = { ...items[existingIndex], ...state.upsertValues };
          items[existingIndex] = updated;
          (store as Record<string, unknown>)[table] = items;
          writeStore(store);
          return { data: [updated], error: null };
        }
        const inserted = {
          id: `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
          ...state.upsertValues,
        };
        items.push(inserted);
        (store as Record<string, unknown>)[table] = items;
        writeStore(store);
        return { data: [inserted], error: null };
      }

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

        // Mirror the real restore_stock_on_order_cancel trigger: reject/cancel in
        // the POS shouldn't leak stock forever now that placing an order actually
        // decrements it (see the order_items insert branch above).
        if (table === 'orders') {
          const values = state.updateValues as Record<string, unknown>;
          for (const order of updated) {
            const wasCancelled = items.find((i) => i.id === order.id)?.status === 'cancelled';
            if (values.status === 'cancelled' && !wasCancelled) {
              const menuItems = store.menu_items as Array<Record<string, unknown>>;
              const orderItems = (store.order_items as Array<Record<string, unknown>>).filter((oi) => oi.order_id === order.id);
              for (const oi of orderItems) {
                const menuItem = menuItems.find((m) => m.id === oi.menu_item_id);
                if (menuItem) menuItem.stock = Number(menuItem.stock ?? 0) + Number(oi.quantity ?? 0);
              }
            }
          }
        }

        writeStore(store);
        return { data: updated, error: null };
      }

      return { data: computeData(), error: null };
    };

    builder.select = () => builder;
    builder.eq = (field: string, value: unknown) => {
      state.filters.push({ field, op: 'eq', value });
      return builder;
    };
    builder.neq = (field: string, value: unknown) => {
      state.filters.push({ field, op: 'neq', value });
      return builder;
    };
    builder.gt = (field: string, value: unknown) => {
      state.filters.push({ field, op: 'gt', value });
      return builder;
    };
    builder.gte = (field: string, value: unknown) => {
      state.filters.push({ field, op: 'gte', value });
      return builder;
    };
    builder.lt = (field: string, value: unknown) => {
      state.filters.push({ field, op: 'lt', value });
      return builder;
    };
    builder.lte = (field: string, value: unknown) => {
      state.filters.push({ field, op: 'lte', value });
      return builder;
    };
    builder.in = (field: string, values: unknown[]) => {
      state.filters.push({ field, op: 'in', value: values });
      return builder;
    };
    builder.is = (field: string, value: unknown) => {
      state.filters.push({ field, op: 'is', value });
      return builder;
    };
    builder.not = (field: string, operator: string, value: unknown) => {
      // Only .not(field, 'is', value) is used anywhere in this codebase (Report.tsx:
      // .not('paid_at', 'is', null), meaning "paid_at IS NOT NULL"). Other PostgREST
      // .not() operator negations aren't called client-side, so they're not modeled.
      if (operator === 'is') {
        state.filters.push({ field, op: 'not_is', value });
      }
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
    builder.insert = (values: Record<string, unknown> | Record<string, unknown>[]) => {
      state.insertValues = values;
      return builder;
    };
    builder.upsert = (values: Record<string, unknown>, options?: { onConflict?: string }) => {
      state.upsertValues = values;
      state.upsertConflictKeys = options?.onConflict ? options.onConflict.split(',').map((s) => s.trim()) : [];
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
      neq: (field: string, value: unknown) => SupabaseBuilder;
      gt: (field: string, value: unknown) => SupabaseBuilder;
      gte: (field: string, value: unknown) => SupabaseBuilder;
      lt: (field: string, value: unknown) => SupabaseBuilder;
      lte: (field: string, value: unknown) => SupabaseBuilder;
      in: (field: string, values: unknown[]) => SupabaseBuilder;
      is: (field: string, value: unknown) => SupabaseBuilder;
      not: (field: string, operator: string, value: unknown) => SupabaseBuilder;
      order: (field: string, options?: { ascending?: boolean }) => SupabaseBuilder;
      limit: (value: number) => SupabaseBuilder;
      update: (values: Record<string, unknown>) => SupabaseBuilder;
      insert: (values: Record<string, unknown> | Record<string, unknown>[]) => SupabaseBuilder;
      upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => SupabaseBuilder;
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
    if (name === 'resolve_branch_by_tablet_token') {
      // Mirrors the real resolve_branch_by_tablet_token() migration: look a
      // branch up by its exact token instead of exposing tablet_token through
      // a broadly-selectable table/view.
      const token = String(params?.p_token ?? '');
      const branch = store.branch_public_info.find((b) => b.tablet_token === token);
      return {
        data: branch ? [{ id: branch.id, name: branch.name, currency: branch.currency, country: branch.country, city: branch.city }] : [],
        error: null,
      };
    }
    if (name === 'add_staff_member') {
      // Demo mode has one seeded admin and no real multi-account auth, so unlike
      // the real add_staff_member() there's no meaningful org-membership check to
      // perform here — just mirror the write so the Staff page works the same way.
      const id = `membership-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      store.user_org_roles.push({
        id,
        user_id: params?.p_user_id,
        org_id: params?.p_org_id,
        branch_id: null,
        role_name: params?.p_role_name,
        permissions: params?.p_permissions ?? {},
        is_active: true,
        created_at: new Date().toISOString(),
      });
      writeStore(store);
      return { data: id, error: null };
    }
    if (name === 'update_staff_member') {
      const row = store.user_org_roles.find((r) => r.id === params?.p_membership_id);
      if (!row) return { data: false, error: null };
      row.role_name = params?.p_role_name;
      row.is_active = params?.p_is_active;
      writeStore(store);
      return { data: true, error: null };
    }
    if (name === 'remove_staff_member') {
      const before = store.user_org_roles.length;
      store.user_org_roles = store.user_org_roles.filter((r) => r.id !== params?.p_membership_id);
      writeStore(store);
      return { data: store.user_org_roles.length < before, error: null };
    }
    if (name === 'get_next_order_number') {
      // Mirrors the real get_next_order_number() migration: one atomically-
      // incrementing counter per branch instead of client-side randomness, so
      // demo mode can't produce duplicate ticket numbers either.
      const branchIdParam = String(params?.p_branch_id ?? 'demo-branch');
      const counters = (store as unknown as { orderCounters?: Record<string, number> }).orderCounters ?? {};
      const next = (counters[branchIdParam] ?? 1000) + 1;
      counters[branchIdParam] = next;
      (store as unknown as { orderCounters?: Record<string, number> }).orderCounters = counters;
      writeStore(store);
      return { data: `#${next}`, error: null };
    }
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
          org_owner_is_super_admin: true,
        },
        error: null,
      };
    }

    if (name === 'refund_order') {
      const orderId = String(params?.p_order_id ?? '');
      const amount = Number(params?.p_amount ?? 0);
      if (!orderId || amount <= 0) return { data: false, error: null };
      const order = store.orders.find((entry) => entry.id === orderId) as Record<string, unknown> | undefined;
      if (!order) return { data: false, error: null };
      const currentRefund = Number(order.refund_amount ?? 0);
      const total = Number(order.total_amount ?? 0);
      const nextRefund = currentRefund + amount;
      if (nextRefund > total) return { data: false, error: null };
      order.refund_amount = nextRefund;
      order.refunded_at = new Date().toISOString();
      order.refund_reason = String(params?.p_reason ?? '');
      order.updated_at = new Date().toISOString();
      if (nextRefund >= total) order.payment_status = 'refunded';
      writeStore(store);
      return { data: true, error: null };
    }

    if (name === 'set_branch_pos_pin') {
      // Was entirely unhandled: the mock rpc's default fallback (data: null, error:
      // null) let Settings.tsx's "if (rpcError) throw" pass silently, so demo mode
      // showed "PIN saved successfully" without saving anything.
      const targetBranchId = String(params?.p_branch_id ?? '');
      const pin = String(params?.p_pin ?? '');
      if (pin.length < 4) return { data: false, error: null };
      const branch = store.branches.find((b) => b.id === targetBranchId);
      if (!branch) return { data: false, error: null };
      // Demo mode has no pgcrypto/bcrypt available client-side; this prefix-tagged
      // value is only ever compared against by the matching verify handler below,
      // never treated as a real hash — same non-goal as set_staff_pin's demo-hash-*.
      (branch as { pos_pin_hash: string | null }).pos_pin_hash = `demo-pin-${pin}`;
      writeStore(store);
      return { data: true, error: null };
    }
    if (name === 'verify_branch_pos_pin') {
      const targetBranchId = String(params?.p_branch_id ?? '');
      const pin = String(params?.p_pin ?? '');
      const branch = store.branches.find((b) => b.id === targetBranchId);
      const ok = Boolean(branch?.pos_pin_hash) && branch?.pos_pin_hash === `demo-pin-${pin}`;
      return { data: ok, error: null };
    }
    if (name === 'set_staff_pin') {
      const targetUserId = String(params?.p_target_user_id ?? '');
      const pin = String(params?.p_pin ?? '');
      if (pin.length < 4) return { data: false, error: null };
      const targetProfile = store.profiles.find((entry) => entry.id === targetUserId);
      if (!targetProfile) return { data: false, error: null };
      (targetProfile as { pin_hash: string | null }).pin_hash = `demo-hash-${pin}`;
      writeStore(store);
      return { data: true, error: null };
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
          plan_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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

  // Demo mode has no real backend to push changes from, so realtime is a no-op stub
  // that still satisfies the same shape the real client exposes (channel(...).on(...).subscribe()),
  // so callers like useSharedOrders/useSharedMenu don't need to special-case demo mode.
  const channel = (_name: string) => {
    const builder = {
      on: () => builder,
      subscribe: () => builder,
    };
    return builder;
  };
  const removeChannel = (_channel: unknown) => {};

  // Cast to the real client's type: this is a mock, not a structural subtype of
  // SupabaseClient (it only implements the handful of methods this app actually
  // calls), so without the cast every caller would see a real-client | mock-client
  // union and TS would reject calls like the postgres_changes overload of .on().
  return { auth, from, rpc, storage, channel, removeChannel } as unknown as ReturnType<typeof createClient>;
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

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SharedMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  halal: boolean;
  vegan: boolean;
  glutenFree: boolean;
  keto: boolean;
  nutFree: boolean;
  spicy: boolean;
  available: boolean;
  description: string;
  stock: number;
  ingredients: { name: string; grams: number }[];
  allergens: string[];
  taxRate: number;
  image: string;
  portionSize: string;
  weight: number;
}

interface MenuItemRow {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  fiber_g: number | null;
  weight_g: number | null;
  is_halal: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_keto: boolean;
  is_nut_free: boolean;
  is_spicy: boolean;
  is_available: boolean;
  stock: number;
  ingredients: { name: string; grams: number }[] | null;
  allergens: string[] | null;
  tax_rate: number | null;
  portion_size: string | null;
}

function rowToShared(row: MenuItemRow, categoryNameById: Map<string, string>): SharedMenuItem {
  return {
    id: row.id,
    name: row.name,
    category: (row.category_id && categoryNameById.get(row.category_id)) || 'Mains',
    price: Number(row.price ?? 0),
    calories: row.calories ?? 0,
    protein: Number(row.protein_g ?? 0),
    carbs: Number(row.carbs_g ?? 0),
    fats: Number(row.fats_g ?? 0),
    fiber: Number(row.fiber_g ?? 0),
    halal: row.is_halal,
    vegan: row.is_vegan,
    glutenFree: row.is_gluten_free,
    keto: row.is_keto,
    nutFree: row.is_nut_free,
    spicy: row.is_spicy,
    available: row.is_available,
    description: row.description ?? '',
    stock: row.stock ?? 0,
    ingredients: row.ingredients ?? [],
    allergens: row.allergens ?? [],
    taxRate: Number(row.tax_rate ?? 0),
    image: row.image_url ?? '',
    portionSize: row.portion_size ?? 'Regular',
    weight: Number(row.weight_g ?? 0),
  };
}

function sharedToRowPatch(item: Partial<SharedMenuItem>, categoryId?: string | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (item.name !== undefined) out.name = item.name;
  if (categoryId !== undefined) out.category_id = categoryId;
  if (item.price !== undefined) out.price = item.price;
  if (item.calories !== undefined) out.calories = item.calories;
  if (item.protein !== undefined) out.protein_g = item.protein;
  if (item.carbs !== undefined) out.carbs_g = item.carbs;
  if (item.fats !== undefined) out.fats_g = item.fats;
  if (item.fiber !== undefined) out.fiber_g = item.fiber;
  if (item.halal !== undefined) out.is_halal = item.halal;
  if (item.vegan !== undefined) out.is_vegan = item.vegan;
  if (item.glutenFree !== undefined) out.is_gluten_free = item.glutenFree;
  if (item.keto !== undefined) out.is_keto = item.keto;
  if (item.nutFree !== undefined) out.is_nut_free = item.nutFree;
  if (item.spicy !== undefined) out.is_spicy = item.spicy;
  if (item.available !== undefined) out.is_available = item.available;
  if (item.description !== undefined) out.description = item.description;
  if (item.stock !== undefined) out.stock = item.stock;
  if (item.ingredients !== undefined) out.ingredients = item.ingredients;
  if (item.allergens !== undefined) out.allergens = item.allergens;
  if (item.taxRate !== undefined) out.tax_rate = item.taxRate;
  if (item.image !== undefined) out.image_url = item.image;
  if (item.portionSize !== undefined) out.portion_size = item.portionSize;
  if (item.weight !== undefined) out.weight_g = item.weight;
  return out;
}

/**
 * Menu items and categories for a branch, backed by real Supabase tables
 * (menu_items / menu_categories) instead of localStorage. Pass `null` while the
 * branch hasn't been resolved yet (e.g. org context still loading, or an
 * unauthenticated tablet that hasn't identified its branch) — the hook just
 * returns an empty, non-loading list rather than throwing.
 *
 * menu_items/menu_categories have an anon-readable RLS policy scoped to
 * available items on active branches (see migration
 * 20260823030000_menu_fields_and_public_read.sql), so this same hook works both
 * for the authenticated admin/POS views and the public customer tablet.
 */
export function useSharedMenu(branchId: string | null) {
  const [menuItems, setMenuItems] = useState<SharedMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const categoryNameById = useRef<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!branchId) {
      setMenuItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [categoriesResult, itemsResult] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('branch_id', branchId),
      supabase.from('menu_items').select('*').eq('branch_id', branchId).order('sort_order', { ascending: true }),
    ]);

    if (categoriesResult.error || itemsResult.error) {
      setError((categoriesResult.error ?? itemsResult.error)?.message ?? 'Failed to load menu');
      setLoading(false);
      return;
    }

    const categories = (categoriesResult.data ?? []) as Array<{ id: string; name: string }>;
    categoryNameById.current = new Map(categories.map((c) => [c.id, c.name]));

    const items = (itemsResult.data ?? []) as MenuItemRow[];
    setMenuItems(items.map((row) => rowToShared(row, categoryNameById.current)));
    setError(null);
    setLoading(false);
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  // Mirror the orders store: subscribe so that a stock change or 86'd item made
  // from one screen (e.g. admin marks something unavailable) shows up on every
  // other open screen (POS, customer tablet) without a manual refresh.
  useEffect(() => {
    if (!branchId) return;
    const channel = supabase
      .channel(`menu-branch-${branchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `branch_id=eq.${branchId}` }, () => {
        load();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categories', filter: `branch_id=eq.${branchId}` }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [branchId, load]);

  // Categories are managed as plain name strings in the UI (a fixed dropdown), but
  // stored as their own table with an id underneath. Get-or-create by name per branch.
  const resolveCategoryId = useCallback(async (categoryName: string): Promise<string | null> => {
    if (!branchId) return null;
    const existing = await supabase
      .from('menu_categories')
      .select('*')
      .eq('branch_id', branchId)
      .eq('name', categoryName)
      .maybeSingle<{ id: string }>();
    if (existing.data) return existing.data.id;
    if (existing.error) { setError(existing.error.message); return null; }

    const created = await supabase
      .from('menu_categories')
      .insert({ branch_id: branchId, name: categoryName, is_active: true } as never)
      .select();
    if (created.error) { setError(created.error.message); return null; }
    const row = (created.data as Array<{ id: string }> | null)?.[0];
    return row?.id ?? null;
  }, [branchId]);

  const addItem = useCallback(async (item: Omit<SharedMenuItem, 'id'>) => {
    if (!branchId) return null;
    const categoryId = await resolveCategoryId(item.category);
    const patch = sharedToRowPatch(item, categoryId);
    const { data, error: insertError } = await supabase
      .from('menu_items')
      .insert({ ...patch, branch_id: branchId } as never)
      .select();
    if (insertError) { setError(insertError.message); return null; }
    const row = (data as MenuItemRow[] | null)?.[0];
    if (row) setMenuItems((prev) => [...prev, rowToShared(row, categoryNameById.current)]);
    return row?.id ?? null;
  }, [branchId, resolveCategoryId]);

  const updateItem = useCallback(async (id: string, patch: Partial<SharedMenuItem>) => {
    const categoryId = patch.category !== undefined ? await resolveCategoryId(patch.category) : undefined;
    const rowPatch = sharedToRowPatch(patch, categoryId);
    const { error: updateError } = await supabase.from('menu_items').update(rowPatch as never).eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setMenuItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, [resolveCategoryId]);

  const deleteItem = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('menu_items').delete().eq('id', id);
    if (deleteError) { setError(deleteError.message); return; }
    setMenuItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const toggleAvailable = useCallback(async (id: string) => {
    const current = menuItems.find((it) => it.id === id);
    if (!current) return;
    await updateItem(id, { available: !current.available });
  }, [menuItems, updateItem]);

  const adjustStock = useCallback(async (id: string, delta: number) => {
    const current = menuItems.find((it) => it.id === id);
    if (!current) return;
    await updateItem(id, { stock: Math.max(0, current.stock + delta) });
  }, [menuItems, updateItem]);

  return { menuItems, loading, error, addItem, updateItem, deleteItem, toggleAvailable, adjustStock, refresh: load };
}

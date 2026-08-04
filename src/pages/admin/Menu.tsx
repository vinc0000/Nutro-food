/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Check, Package, AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useOrgContext } from '@/hooks/useOrgContext';

interface MenuItem {
  id: string; name: string; category: string; category_id?: string; price: number; calories: number;
  protein: number; carbs: number; fats: number; fiber: number;
  halal: boolean; vegan: boolean; glutenFree: boolean; keto: boolean; nutFree: boolean; spicy: boolean;
  available: boolean; description: string;
  stock: number; ingredients: { name: string; grams: number }[];
  taxRate: number; image: string; portionSize: string; weight: number;
}

const CATS = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks'];
const PORTION_SIZES = ['Small', 'Regular', 'Large', 'Family'];

const DEFAULT_ITEMS = [
  { name: 'Wagyu Beef Burger', category: 'Mains', price: 24, calories: 820, protein: 48, carbs: 42, fats: 52, halal: true, vegan: false, glutenFree: false, keto: false, nutFree: true, spicy: false, available: true, stock: 15, taxRate: 5, portionSize: 'Regular', weight: 380, image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=400', description: 'Premium A5 Wagyu patty, aged cheddar, truffle aioli, brioche bun.' },
  { name: 'Truffle Fries', category: 'Starters', price: 9, calories: 380, protein: 6, carbs: 48, fats: 18, halal: true, vegan: true, glutenFree: true, keto: false, nutFree: true, spicy: false, available: true, stock: 30, taxRate: 5, portionSize: 'Large', weight: 200, image: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=400', description: 'Hand-cut fries tossed in truffle oil and parmesan.' },
  { name: 'Vegan Buddha Bowl', category: 'Mains', price: 18, calories: 540, protein: 22, carbs: 68, fats: 16, halal: true, vegan: true, glutenFree: true, keto: false, nutFree: false, spicy: false, available: true, stock: 8, taxRate: 5, portionSize: 'Regular', weight: 420, image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=400', description: 'Quinoa, roasted veggies, avocado, tahini, mixed greens.' },
  { name: 'Spicy Calamari', category: 'Starters', price: 14, calories: 320, protein: 24, carbs: 28, fats: 12, halal: true, vegan: false, glutenFree: false, keto: false, nutFree: true, spicy: true, available: true, stock: 0, taxRate: 5, portionSize: 'Regular', weight: 250, image: 'https://images.pexels.com/photos/566345/pexels-photo-566345.jpeg?w=400', description: 'Lightly battered calamari rings, sriracha mayo.' },
  { name: 'Chocolate Lava Cake', category: 'Desserts', price: 11, calories: 460, protein: 7, carbs: 62, fats: 22, halal: true, vegan: false, glutenFree: false, keto: false, nutFree: false, spicy: false, available: false, stock: 12, taxRate: 5, portionSize: 'Small', weight: 180, image: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?w=400', description: 'Warm molten chocolate cake, vanilla ice cream.' },
  { name: 'Fresh Lemonade', category: 'Drinks', price: 6, calories: 120, protein: 0, carbs: 28, fats: 0, halal: true, vegan: true, glutenFree: true, keto: false, nutFree: true, spicy: false, available: true, stock: 50, taxRate: 5, portionSize: 'Large', weight: 350, image: 'https://images.pexels.com/photos/1998635/pexels-photo-1998635.jpeg?w=400', description: 'House-squeezed lemonade with mint and ice.' },
];

function DietBadge({ label, color }: { label: string; color: string }) {
  return <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: color + '20', color }}>{label}</span>;
}

export default function AdminMenu() {
  const { theme } = useTheme();
  const { orgContext } = useOrgContext();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem>>({});
  const [newIngredient, setNewIngredient] = useState({ name: '', grams: 0 });
  const [savedMsg, setSavedMsg] = useState('');

  const showToast = (msg: string) => { setSavedMsg(msg); setTimeout(() => setSavedMsg(''), 2500); };

  const fetchMenu = useCallback(async () => {
    if (!orgContext?.branch_id) return;
    setLoading(true);
    try {
      // 1. Fetch categories
      let { data: cats, error: catErr } = await supabase
        .from('menu_categories')
        .select('id, name')
        .eq('branch_id', orgContext.branch_id)
        .order('sort_order', { ascending: true });

      if (catErr) throw catErr;

      // Seed categories if empty
      if (!cats || cats.length === 0) {
        const seedCats = ['Starters', 'Mains', 'Desserts', 'Drinks'].map((name, i) => ({
          branch_id: orgContext.branch_id,
          name,
          sort_order: i,
          is_active: true
        }));
        const { data: insertedCats, error: insCatErr } = await supabase
          .from('menu_categories')
          .insert(seedCats)
          .select('id, name');
        if (insCatErr) throw insCatErr;
        cats = insertedCats || [];
      }
      setCategories(cats);

      // 2. Fetch menu items
      let { data: dbItems, error: itemErr } = await supabase
        .from('menu_items')
        .select('*')
        .eq('branch_id', orgContext.branch_id)
        .order('sort_order', { ascending: true });

      if (itemErr) throw itemErr;

      // Seed items if empty
      if (!dbItems || dbItems.length === 0) {
        const seedItems = DEFAULT_ITEMS.map((item, i) => {
          const matchedCat = cats?.find(c => c.name === item.category);
          return {
            branch_id: orgContext.branch_id,
            category_id: matchedCat?.id || null,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image,
            calories: item.calories,
            protein_g: item.protein,
            carbs_g: item.carbs,
            fats_g: item.fats,
            is_halal: item.halal,
            is_vegan: item.vegan,
            is_gluten_free: item.glutenFree,
            is_keto: item.keto,
            is_nut_free: item.nutFree,
            is_spicy: item.spicy,
            is_available: item.available,
            sort_order: i,
            weight_g: item.weight
          };
        });
        const { data: insertedItems, error: insItemErr } = await supabase
          .from('menu_items')
          .insert(seedItems)
          .select('*');
        if (insItemErr) throw insItemErr;
        dbItems = insertedItems || [];
      }

      // Map to UI MenuItems
      const mapped: MenuItem[] = dbItems.map((dbItem: any) => {
        const matchedCat = cats?.find(c => c.id === dbItem.category_id);
        return {
          id: dbItem.id,
          name: dbItem.name,
          category: matchedCat?.name || 'Mains',
          category_id: dbItem.category_id,
          price: Number(dbItem.price),
          calories: dbItem.calories || 0,
          protein: dbItem.protein_g || 0,
          carbs: dbItem.carbs_g || 0,
          fats: dbItem.fats_g || 0,
          fiber: 0,
          halal: !!dbItem.is_halal,
          vegan: !!dbItem.is_vegan,
          glutenFree: !!dbItem.is_gluten_free,
          keto: !!dbItem.is_keto,
          nutFree: !!dbItem.is_nut_free,
          spicy: !!dbItem.is_spicy,
          available: !!dbItem.is_available,
          description: dbItem.description || '',
          stock: 15,
          ingredients: [],
          taxRate: 5,
          image: dbItem.image_url || '',
          portionSize: 'Regular',
          weight: dbItem.weight_g || 0,
        };
      });

      setItems(mapped);
    } catch (err) {
      console.warn("Database menu fetch failed, falling back to mock data:", err);
      // Fallback categories
      const mockCats = [
        { id: 'cat-1', name: 'Starters' },
        { id: 'cat-2', name: 'Mains' },
        { id: 'cat-3', name: 'Desserts' },
        { id: 'cat-4', name: 'Drinks' }
      ];
      setCategories(mockCats);

      // Fallback mapped items
      const mockMapped: MenuItem[] = DEFAULT_ITEMS.map((item, i) => ({
        id: `mock-item-${i}`,
        name: item.name,
        category: item.category,
        category_id: `cat-${item.category === 'Starters' ? 1 : item.category === 'Mains' ? 2 : item.category === 'Desserts' ? 3 : 4}`,
        price: item.price,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        fiber: 0,
        halal: item.halal,
        vegan: item.vegan,
        glutenFree: item.glutenFree,
        keto: item.keto,
        nutFree: item.nutFree,
        spicy: item.spicy,
        description: item.description,
        image: item.image,
        available: item.available,
        stock: 50,
        allergens: [],
        ingredients: [],
        weight: item.weight,
        portionSize: 'Standard',
        is_active: true
      }));
      setItems(mockMapped);
    } finally {
      setLoading(false);
    }
  }, [orgContext?.branch_id]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const filtered = items.filter(item =>
    (activeCat === 'All' || item.category === activeCat) &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAvailable = async (id: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentVal })
        .eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === id ? { ...i, available: !i.available } : i));
      showToast('Item visibility updated');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
      showToast('Item deleted successfully');
    } catch (err) {
      console.error(err);
    }
  };

  const adjustStock = (id: string, delta: number) => {
    // Save stock changes locally since it's transient
    setItems(prev => prev.map(i => i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i));
  };

  const openAddForm = () => {
    const firstCat = categories[0]?.id || '';
    setFormData({ available: true, stock: 15, taxRate: 5, portionSize: 'Regular', halal: true, ingredients: [], image: '', category_id: firstCat });
    setEditing(null);
    setShowForm(true);
  };

  const openEditForm = (item: MenuItem) => {
    setFormData({ ...item });
    setEditing(item);
    setShowForm(true);
  };

  const saveForm = async () => {
    if (!orgContext?.branch_id) return;
    setSaving(true);
    try {
      const dbPayload = {
        branch_id: orgContext.branch_id,
        category_id: formData.category_id || null,
        name: formData.name || '',
        description: formData.description || '',
        price: formData.price || 0,
        image_url: formData.image || '',
        calories: formData.calories || 0,
        protein_g: formData.protein || 0,
        carbs_g: formData.carbs || 0,
        fats_g: formData.fats || 0,
        is_halal: !!formData.halal,
        is_vegan: !!formData.vegan,
        is_gluten_free: !!formData.glutenFree,
        is_keto: !!formData.keto,
        is_nut_free: !!formData.nutFree,
        is_spicy: !!formData.spicy,
        is_available: !!formData.available,
        weight_g: formData.weight || 0,
      };

      if (editing) {
        const { error } = await supabase
          .from('menu_items')
          .update(dbPayload)
          .eq('id', editing.id);
        if (error) throw error;
        showToast('Item updated successfully');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert([dbPayload]);
        if (error) throw error;
        showToast('Item added successfully');
      }
      setShowForm(false);
      setFormData({});
      fetchMenu();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addIngredient = () => {
    if (!newIngredient.name) return;
    setFormData(prev => ({ ...prev, ingredients: [...(prev.ingredients ?? []), newIngredient] }));
    setNewIngredient({ name: '', grams: 0 });
  };

  const removeIngredient = (idx: number) => {
    setFormData(prev => ({ ...prev, ingredients: (prev.ingredients ?? []).filter((_, i) => i !== idx) }));
  };

  const toggleDiet = (key: keyof MenuItem) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Menu & Recipe Manager</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Manage items, images, portions, macros, stock, allergens, and pricing</p>
        </div>
        <button onClick={openAddForm} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.primary }}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..."
            className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-52"
            style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        <div className="flex gap-1">
          {CATS.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: activeCat === c ? theme.primary : theme.surface, color: activeCat === c ? '#fff' : theme.textMuted, border: `1px solid ${activeCat === c ? theme.primary : theme.border}` }}>{c}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: theme.primary }} />
          <span className="text-sm" style={{ color: theme.textMuted }}>Loading menu from database...</span>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background: theme.surface, border: `1px solid ${item.available && item.stock > 0 ? theme.border : theme.border + '80'}`, opacity: item.available && item.stock > 0 ? 1 : 0.6 }}>
              {/* Image */}
              <div className="relative h-32 overflow-hidden" style={{ background: theme.bg }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: theme.textMuted }}>
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: theme.primary }}>{item.portionSize}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: '#1E293B' }}>{item.weight}g</span>
                </div>
                {!item.available && <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}><span className="text-xs font-bold text-white">HIDDEN</span></div>}
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: theme.text }}>{item.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{item.category} - {item.portionSize} ({item.weight}g)</p>
                  </div>
                  <span className="text-lg font-extrabold" style={{ color: theme.primary }}>${item.price}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>{item.description}</p>
                <div className="grid grid-cols-5 gap-1">
                  {[{ label: 'Cal', val: item.calories }, { label: 'Prot', val: item.protein }, { label: 'Carbs', val: item.carbs }, { label: 'Fats', val: item.fats }, { label: 'Fiber', val: item.fiber }].map(m => (
                    <div key={m.label} className="text-center p-1.5 rounded-lg" style={{ background: theme.bg }}>
                      <div className="text-xs font-bold" style={{ color: theme.text }}>{m.val}</div>
                      <div className="text-[9px]" style={{ color: theme.textMuted }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.halal && <DietBadge label="Halal" color="#22c55e" />}
                  {item.vegan && <DietBadge label="Vegan" color="#84cc16" />}
                  {item.glutenFree && <DietBadge label="GF" color="#06b6d4" />}
                  {item.keto && <DietBadge label="Keto" color="#f59e0b" />}
                  {item.nutFree && <DietBadge label="Nut-Free" color="#8b5cf6" />}
                  {item.spicy && <DietBadge label="Spicy" color="#ef4444" />}
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: theme.bg }}>
                  <Package size={14} style={{ color: item.stock > 0 ? theme.primary : '#ef4444' }} />
                  <span className="text-xs font-semibold" style={{ color: item.stock > 0 ? theme.text : '#ef4444' }}>
                    {item.stock > 0 ? `${item.stock} portions left` : 'SOLD OUT'}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => adjustStock(item.id, -1)} className="w-5 h-5 rounded flex items-center justify-center" style={{ background: theme.surface }}><span className="text-xs">-</span></button>
                    <button onClick={() => adjustStock(item.id, 1)} className="w-5 h-5 rounded flex items-center justify-center" style={{ background: theme.surface }}><span className="text-xs">+</span></button>
                  </div>
                </div>
                {item.stock === 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: '#ef444415', border: '1px solid #ef444430' }}>
                    <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                    <span className="text-[10px] font-bold" style={{ color: '#ef4444' }}>SOLD OUT on customer tablets</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <button onClick={() => toggleAvailable(item.id, item.available)}
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg transition-all"
                    style={{ background: item.available ? '#22c55e20' : '#ef444420', color: item.available ? '#22c55e' : '#ef4444' }}>
                    {item.available ? <><Check size={11} /> Available</> : <><X size={11} /> Hidden</>}
                  </button>
                  <span className="text-xs ml-1" style={{ color: theme.textMuted }}>Tax: {item.taxRate}%</span>
                  <button onClick={() => openEditForm(item)} className="p-1.5 rounded-lg ml-auto" style={{ color: theme.textMuted }}><Edit2 size={14} /></button>
                  <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-auto" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold" style={{ color: theme.text }}>{editing ? 'Edit Menu Item' : 'New Menu Item'}</h2>
                <button onClick={() => setShowForm(false)} style={{ color: theme.textMuted }}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                {/* Image upload */}
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Item Image</label>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                      {formData.image ? <img src={formData.image} alt="preview" className="w-full h-full object-cover" /> : <ImageIcon size={24} style={{ color: theme.textMuted }} />}
                    </div>
                    <input value={formData.image ?? ''} onChange={e => setFormData(prev => ({ ...prev, image: e.target.value }))} placeholder="Paste image URL..."
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Item Name</label>
                  <input value={formData.name ?? ''} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Wagyu Burger"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Description</label>
                  <input value={formData.description ?? ''} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Short description..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>

                {/* Category selector */}
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Category</label>
                  <select value={formData.category_id ?? ''} onChange={e => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Portion size & weight */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Portion Size</label>
                    <select value={formData.portionSize ?? 'Regular'} onChange={e => setFormData(prev => ({ ...prev, portionSize: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                      {PORTION_SIZES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Weight (grams)</label>
                    <input type="number" value={formData.weight ?? ''} onChange={e => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))} placeholder="380"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'price' as keyof MenuItem, label: 'Price ($)' },
                    { key: 'calories' as keyof MenuItem, label: 'Calories' },
                    { key: 'stock' as keyof MenuItem, label: 'Stock (portions)' },
                    { key: 'protein' as keyof MenuItem, label: 'Protein (g)' },
                    { key: 'carbs' as keyof MenuItem, label: 'Carbs (g)' },
                    { key: 'fats' as keyof MenuItem, label: 'Fats (g)' },
                    { key: 'fiber' as keyof MenuItem, label: 'Fiber (g)' },
                    { key: 'taxRate' as keyof MenuItem, label: 'Tax Rate (%)' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>{f.label}</label>
                      <input type="number" value={formData[f.key] as number ?? ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                    </div>
                  ))}
                </div>

                {/* Ingredients */}
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color: theme.textMuted }}>Ingredients & Grammage</p>
                  <div className="space-y-2">
                    {(formData.ingredients ?? []).map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input value={ing.name} onChange={e => setFormData(prev => ({ ...prev, ingredients: (prev.ingredients ?? []).map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))} placeholder="Ingredient name"
                          className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                          style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                        <input type="number" value={ing.grams} onChange={e => setFormData(prev => ({ ...prev, ingredients: (prev.ingredients ?? []).map((x, i) => i === idx ? { ...x, grams: parseFloat(e.target.value) || 0 } : x) }))} placeholder="grams"
                          className="w-20 px-3 py-2 rounded-lg text-xs outline-none"
                          style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                        <button onClick={() => removeIngredient(idx)} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }}><X size={14} /></button>
                      </div>
                    ))}
                    <div className="flex gap-2 items-center">
                      <input value={newIngredient.name} onChange={e => setNewIngredient(prev => ({ ...prev, name: e.target.value }))} placeholder="Add ingredient..."
                        className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                      <input type="number" value={newIngredient.grams || ''} onChange={e => setNewIngredient(prev => ({ ...prev, grams: parseFloat(e.target.value) || 0 }))} placeholder="grams"
                        className="w-20 px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                      <button onClick={addIngredient} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: theme.primary }}><Plus size={12} /> Add</button>
                    </div>
                  </div>
                </div>

                {/* Dietary flags */}
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color: theme.textMuted }}>Dietary Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'halal' as keyof MenuItem, label: 'Halal' },
                      { key: 'vegan' as keyof MenuItem, label: 'Vegan' },
                      { key: 'glutenFree' as keyof MenuItem, label: 'Gluten-Free' },
                      { key: 'keto' as keyof MenuItem, label: 'Keto' },
                      { key: 'nutFree' as keyof MenuItem, label: 'Nut-Free' },
                      { key: 'spicy' as keyof MenuItem, label: 'Spicy' },
                    ] as { key: keyof MenuItem; label: string }[]).map(f => (
                      <button key={f.key} onClick={() => toggleDiet(f.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: formData[f.key] ? theme.primary + '15' : theme.bg,
                          color: formData[f.key] ? theme.primary : theme.textMuted,
                          border: `1px solid ${formData[f.key] ? theme.primary : theme.border}`,
                        }}>
                        {formData[f.key] && <Check size={11} />}{f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={saveForm} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: theme.primary }}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editing ? 'Save Changes' : 'Add Item'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {savedMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: '#22c55e' }}>
          <Check size={16} /> {savedMsg}
        </div>
      )}
    </div>
  );
}

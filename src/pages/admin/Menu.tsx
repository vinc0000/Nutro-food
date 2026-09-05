import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Check, Package, AlertTriangle, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useSharedMenu, type SharedMenuItem } from '@/lib/menuStore';
import { useOrgContext } from '@/hooks/useOrgContext';

type MenuItem = SharedMenuItem;

const CATS = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks', 'Snacks'];
const PORTION_SIZES = ['Small', 'Regular', 'Large', 'Family'];


function DietBadge({ label, color }: { label: string; color: string }) {
  return <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: color + '20', color }}>{label}</span>;
}

export default function AdminMenu() {
  const { theme } = useTheme();
  const { orgContext, loading: orgLoading } = useOrgContext();
  const branchId = orgContext?.branch_id ?? null;
  const { menuItems: items, loading, error, addItem, updateItem, deleteItem: removeItem, toggleAvailable: toggleItemAvailable, adjustStock: adjustItemStock } = useSharedMenu(branchId);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [newIngredient, setNewIngredient] = useState({ name: '', grams: 0 });

  const filtered = items.filter(item =>
    (activeCat === 'All' || item.category === activeCat) &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAvailable = (id: string) => { void toggleItemAvailable(id); };
  const deleteItem = (id: string) => { void removeItem(id); };
  const adjustStock = (id: string, delta: number) => { void adjustItemStock(id, delta); };

  const openAddForm = () => {
    setFormData({ available: true, stock: 0, taxRate: 5, portionSize: 'Regular', halal: true, ingredients: [], image: '', category: 'Mains' });
    setEditing(null);
    setShowForm(true);
    setUploadMessage(null);
  };

  const openEditForm = (item: MenuItem) => {
    setFormData({ ...item });
    setEditing(item);
    setShowForm(true);
    setUploadMessage(null);
  };

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveForm = async () => {
    setSaveError(null);
    if (!branchId) { setSaveError('Still loading your branch — please wait a moment and try again.'); return; }
    setSaving(true);
    if (editing) {
      await updateItem(editing.id, formData);
    } else {
      const newItem: Omit<MenuItem, 'id'> = {
        name: formData.name ?? '',
        category: formData.category ?? 'Mains',
        price: formData.price ?? 0,
        calories: formData.calories ?? 0,
        protein: formData.protein ?? 0,
        carbs: formData.carbs ?? 0,
        fats: formData.fats ?? 0,
        fiber: formData.fiber ?? 0,
        halal: formData.halal ?? true,
        vegan: formData.vegan ?? false,
        glutenFree: formData.glutenFree ?? false,
        keto: formData.keto ?? false,
        nutFree: formData.nutFree ?? true,
        spicy: formData.spicy ?? false,
        available: formData.available ?? true,
        description: formData.description ?? '',
        stock: formData.stock ?? 0,
        ingredients: formData.ingredients ?? [],
        allergens: formData.allergens ?? [],
        taxRate: formData.taxRate ?? 5,
        image: formData.image ?? '',
        portionSize: formData.portionSize ?? 'Regular',
        weight: formData.weight ?? 0,
      };
      const createdId = await addItem(newItem);
      setSaving(false);
      if (!createdId) {
        // Don't close the form and pretend it worked — addItem() failing (RLS,
        // network, a bad value) previously closed the form silently either way,
        // so the item just quietly never existed with no indication why.
        setSaveError(error ?? 'Could not save this item — please try again.');
        return;
      }
    }
    setSaving(false);
    setShowForm(false);
    setFormData({});
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

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    // Only the file's declared MIME type was checked before (for the upload's
    // contentType header) — the extension was trusted from the filename, and
    // nothing rejected a non-image file. SVG is deliberately excluded even
    // though it's a valid image type: an SVG can carry an embedded <script>,
    // and this bucket is public — anyone opening the file's direct URL in a
    // new tab would execute it, a real stored-XSS path for a "menu image".
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadMessage('Unsupported file type. Please upload a JPEG, PNG, WEBP or GIF image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadMessage('Image too large. Maximum size: 2 MB.');
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      const extByType: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      const ext = extByType[file.type];
      const fileName = `menu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('menu-images').upload(fileName, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      if (!pub?.publicUrl) throw new Error('No public URL returned by storage');

      setFormData(prev => ({ ...prev, image: pub.publicUrl }));
      setUploadMessage('Image uploaded and attached to this menu item.');
    } catch {
      const previewUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Unable to create image preview'));
        reader.readAsDataURL(file);
      });

      setFormData(prev => ({ ...prev, image: previewUrl }));
      setUploadMessage('Upload was unavailable, so a local preview was used to keep the menu flow moving.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Menu & Recipe Manager</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Manage items, images, portions, macros, stock, allergens, and pricing</p>
        </div>
        <button onClick={openAddForm} disabled={!branchId} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: theme.primary }}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      {!orgLoading && !branchId && (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', color: '#f59e0b' }}>
          No restaurant is associated with this account, so there's no menu to manage yet. This is expected for a platform Super Admin account with no restaurant of its own — a normal tenant account created through Sign Up will have one automatically.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 p-6 justify-center" style={{ color: theme.textMuted }}>
          <Loader2 size={16} className="animate-spin" /> Loading menu…
        </div>
      )}
      {!loading && error && (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
          Could not load menu: {error}
        </div>
      )}

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
                <button onClick={() => toggleAvailable(item.id)}
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
                    <div className="flex-1 space-y-2">
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all" style={{ background: theme.primary + '10', color: theme.primary, border: `1px dashed ${theme.primary}40` }}>
                        {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload Image</>}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            await handleImageUpload(file);
                          }}
                        />
                      </label>
                      {uploadMessage && (
                        <p className="text-xs" style={{ color: theme.primary }}>
                          {uploadMessage}
                        </p>
                      )}
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        Recommended: 800×600px · Max 2 MB · JPG, PNG, or WebP
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Item Name</label>
                  <input value={formData.name ?? ''} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Wagyu Burger"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Category</label>
                  <select value={formData.category ?? 'Mains'} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                    {['Starters', 'Mains', 'Desserts', 'Drinks', 'Snacks'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Description</label>
                  <input value={formData.description ?? ''} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Short description..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
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
              {saveError && (
                <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>{saveError}</p>
              )}
              <div className="flex gap-3 mt-6">
                <button onClick={() => void saveForm()} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: theme.primary }}>
                  {saving && <Loader2 size={14} className="animate-spin" />} {editing ? 'Save Changes' : 'Add Item'}
                </button>
                <button onClick={() => { setShowForm(false); setSaveError(null); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

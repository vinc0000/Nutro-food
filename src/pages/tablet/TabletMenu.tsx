import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed, Search, ShoppingCart, X, Plus, Minus,
  Info, Check, AlertTriangle, Leaf, Instagram, Facebook, MessageCircle, MapPin,
  CreditCard, Banknote, Lock, Loader2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrgContext } from '@/hooks/useOrgContext';

const CURRENCIES = ['USD', 'EUR', 'AED', 'XAF', 'NGN', 'GBP'];
const CURRENCY_RATES: Record<string, number> = { USD: 1, EUR: 0.92, AED: 3.67, XAF: 600, NGN: 1500, GBP: 0.79 };
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '\u20AC', AED: '\u062F.\u0625', XAF: 'FCFA', NGN: '\u20A6', GBP: '\u00A3' };

interface MenuItem {
  id: string; name: string; category: string; price: number; calories: number;
  protein: number; carbs: number; fats: number; weight: number; description: string; image: string;
  halal: boolean; vegan: boolean; glutenFree: boolean; nutFree: boolean; spicy: boolean;
  ingredients: string[]; allergens: string[]; stock: number; portionSize: string;
}

const DEFAULT_MENU: MenuItem[] = [
  { id: '1', name: 'Wagyu Beef Burger', category: 'Mains', price: 24, calories: 820, protein: 48, carbs: 42, fats: 52, weight: 380, portionSize: 'Regular',
    description: 'Premium A5 Wagyu patty, aged cheddar, truffle aioli on brioche bun.',
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=400',
    halal: true, vegan: false, glutenFree: false, nutFree: true, spicy: false,
    ingredients: ['Wagyu beef', 'Brioche bun', 'Aged cheddar', 'Truffle aioli', 'Lettuce', 'Tomato'], allergens: ['Gluten', 'Dairy', 'Egg'], stock: 15 },
  { id: '2', name: 'Truffle Fries', category: 'Starters', price: 9, calories: 380, protein: 6, carbs: 48, fats: 18, weight: 200, portionSize: 'Large',
    description: 'Hand-cut fries tossed in premium truffle oil and aged parmesan.',
    image: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=400',
    halal: true, vegan: true, glutenFree: true, nutFree: true, spicy: false,
    ingredients: ['Potatoes', 'Truffle oil', 'Parmesan', 'Sea salt', 'Fresh herbs'], allergens: ['Dairy'], stock: 30 },
  { id: '3', name: 'Vegan Buddha Bowl', category: 'Mains', price: 18, calories: 540, protein: 22, carbs: 68, fats: 16, weight: 420, portionSize: 'Regular',
    description: 'Quinoa, roasted veggies, avocado, tahini dressing, and mixed greens.',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=400',
    halal: true, vegan: true, glutenFree: true, nutFree: false, spicy: false,
    ingredients: ['Quinoa', 'Avocado', 'Roasted peppers', 'Chickpeas', 'Tahini', 'Mixed greens'], allergens: ['Sesame'], stock: 8 },
  { id: '4', name: 'Grilled Salmon', category: 'Mains', price: 28, calories: 560, protein: 42, carbs: 8, fats: 28, weight: 300, portionSize: 'Regular',
    description: 'Atlantic salmon fillet, lemon butter sauce, seasonal vegetables.',
    image: 'https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?w=400',
    halal: false, vegan: false, glutenFree: true, nutFree: true, spicy: false,
    ingredients: ['Atlantic salmon', 'Lemon butter', 'Asparagus', 'Cherry tomatoes', 'Capers'], allergens: ['Fish', 'Dairy'], stock: 12 },
  { id: '5', name: 'Chocolate Lava Cake', category: 'Desserts', price: 11, calories: 460, protein: 7, carbs: 62, fats: 22, weight: 180, portionSize: 'Small',
    description: 'Warm molten dark chocolate cake with vanilla bean ice cream.',
    image: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?w=400',
    halal: true, vegan: false, glutenFree: false, nutFree: false, spicy: false,
    ingredients: ['Dark chocolate', 'Butter', 'Eggs', 'Flour', 'Vanilla ice cream'], allergens: ['Gluten', 'Dairy', 'Egg', 'May contain nuts'], stock: 0 },
  { id: '6', name: 'Fresh Lemonade', category: 'Drinks', price: 6, calories: 120, protein: 0, carbs: 28, fats: 0, weight: 350, portionSize: 'Large',
    description: 'House-squeezed lemonade with fresh mint and crushed ice.',
    image: 'https://images.pexels.com/photos/1998635/pexels-photo-1998635.jpeg?w=400',
    halal: true, vegan: true, glutenFree: true, nutFree: true, spicy: false,
    ingredients: ['Lemon juice', 'Sugar syrup', 'Mint', 'Sparkling water'], allergens: [], stock: 50 },
];

const DIET_FILTERS = [
  { key: 'halal', label: 'Halal', color: '#22c55e' },
  { key: 'vegan', label: 'Vegan', color: '#84cc16' },
  { key: 'glutenFree', label: 'Gluten-Free', color: '#06b6d4' },
  { key: 'nutFree', label: 'Nut-Free', color: '#8b5cf6' },
];

const SOCIAL_LINKS = [
  { icon: Instagram, label: 'Instagram', color: '#E1306C' },
  { icon: Facebook, label: 'Facebook', color: '#1877F2' },
  { icon: MessageCircle, label: 'WhatsApp', color: '#25D366' },
  { icon: MapPin, label: 'Google Reviews', color: '#4285F4' },
];

interface CartItem { item: MenuItem; qty: number; }
type PayMethod = 'cash' | 'card' | 'tablet_pay';

export default function TabletMenu() {
  const { theme } = useTheme();
  const { orgContext } = useOrgContext();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') ?? '1';

  const [currency, setCurrency] = useState('USD');
  const [activeCat, setActiveCat] = useState('All');
  const [cats, setCats] = useState<string[]>(['All', 'Starters', 'Mains', 'Desserts', 'Drinks']);
  const [search, setSearch] = useState('');
  const [activeDietFilters, setActiveDietFilters] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [serviceRequest, setServiceRequest] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('tablet_pay');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveMenu = useCallback(async () => {
    if (!orgContext?.branch_id) return;
    setLoading(true);
    try {
      // 1. Fetch live categories
      const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .select('id, name')
        .eq('branch_id', orgContext.branch_id)
        .order('sort_order', { ascending: true });

      if (catError) throw catError;

      const fetchedCats = catData?.map(c => c.name) || [];
      if (fetchedCats.length > 0) {
        setCats(['All', ...fetchedCats]);
      } else {
        setCats(['All', 'Starters', 'Mains', 'Desserts', 'Drinks']);
      }

      // 2. Fetch live items
      const { data: itemData, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('branch_id', orgContext.branch_id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (itemData && itemData.length > 0) {
        const mapped: MenuItem[] = itemData.map(dbItem => {
          const matchedCatName = catData?.find(c => c.id === dbItem.category_id)?.name || 'Mains';
          return {
            id: dbItem.id,
            name: dbItem.name,
            category: matchedCatName,
            price: Number(dbItem.price),
            calories: dbItem.calories || 0,
            protein: dbItem.protein_g || 0,
            carbs: dbItem.carbs_g || 0,
            fats: dbItem.fats_g || 0,
            weight: dbItem.weight_g || 0,
            description: dbItem.description || '',
            image: dbItem.image_url || '',
            halal: !!dbItem.is_halal,
            vegan: !!dbItem.is_vegan,
            glutenFree: !!dbItem.is_gluten_free,
            nutFree: !!dbItem.is_nut_free,
            spicy: !!dbItem.is_spicy,
            ingredients: [],
            allergens: [],
            stock: 15,
            portionSize: 'Regular',
          };
        });
        setMenu(mapped);
      } else {
        setMenu(DEFAULT_MENU);
      }
    } catch (err) {
      console.warn('Error fetching tablet menu, using mock fallback:', err);
      setCats(['All', 'Starters', 'Mains', 'Desserts', 'Drinks']);
      setMenu(DEFAULT_MENU);
    } finally {
      setLoading(false);
    }
  }, [orgContext?.branch_id]);

  useEffect(() => {
    fetchLiveMenu();
  }, [fetchLiveMenu]);

  const rate = CURRENCY_RATES[currency];
  const sym = CURRENCY_SYMBOLS[currency];
  const toPrice = (usd: number) => `${sym}${(usd * rate).toFixed(2)}`;

  const toggleDiet = (key: string) => setActiveDietFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const filtered = menu.filter(item => {
    if (activeCat !== 'All' && item.category !== activeCat) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    for (const f of activeDietFilters) { if (!item[f as keyof MenuItem]) return false; }
    return true;
  });

  const addToCart = (item: MenuItem) => {
    if (item.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const processPayment = async () => {
    if (!orgContext?.branch_id) return;
    try {
      // Create a real order in Supabase
      const { error } = await supabase
        .from('orders')
        .insert([{
          branch_id: orgContext.branch_id,
          order_number: Math.floor(1000 + Math.random() * 9000).toString(),
          order_type: 'dine_in',
          status: 'pending',
          subtotal: cartTotal * 0.95,
          tax_amount: cartTotal * 0.05,
          discount_amount: 0,
          total_amount: cartTotal,
          payment_status: payMethod === 'tablet_pay' ? 'unpaid' : 'paid',
          payment_method: payMethod === 'tablet_pay' ? null : payMethod,
          notes: `Table ${tableNum}`,
        }]);

      if (error) throw error;

      setShowPayment(false);
      setOrderPlaced(true);
      setTimeout(() => setOrderPlaced(false), 4000);
      setCart([]);
    } catch (err) {
      console.error('Error placing order:', err);
    }
  };

  const sendServiceRequest = (req: string) => {
    setServiceRequest(req);
    setTimeout(() => setServiceRequest(null), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      <header className="sticky top-0 z-30 px-4 py-3" style={{ background: theme.surface + 'F0', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: theme.primary }}>
              <UtensilsCrossed size={18} color="#fff" />
            </div>
            <div>
              <div className="text-sm font-extrabold" style={{ color: theme.text }}>{orgContext?.org_name || 'Le Maison Dubai'}</div>
              <div className="text-xs" style={{ color: theme.textMuted }}>{orgContext?.branch_name || 'Main Branch'} · Table {tableNum}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="px-2 py-1 rounded-lg text-xs font-bold outline-none"
              style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowSocial(true)} className="px-2 py-1.5 rounded-lg text-xs font-bold" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Social</button>
            <button onClick={() => setShowCart(true)} className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
              style={{ background: theme.primary, color: '#fff' }}>
              <ShoppingCart size={16} />
              {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: '#ef4444' }}>{cartCount}</span>}
              {cartCount > 0 && toPrice(cartTotal)}
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'waiter', label: 'Call Waiter' },
            { key: 'water', label: 'Water Request' },
            { key: 'bill', label: 'Bring Bill' },
          ].map(req => (
            <button key={req.key} onClick={() => sendServiceRequest(req.label)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{req.label}</button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="animate-spin" style={{ color: theme.primary }} />
          <span className="text-sm font-semibold" style={{ color: theme.textMuted }}>Loading interactive tablet menu...</span>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto w-full px-4 py-4 space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dishes..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />
          </div>

          <div className="flex gap-2 flex-wrap">
            {DIET_FILTERS.map(f => (
              <button key={f.key} onClick={() => toggleDiet(f.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: activeDietFilters.includes(f.key) ? f.color : f.color + '18', color: activeDietFilters.includes(f.key) ? '#fff' : f.color, border: `1px solid ${f.color}40` }}>
                {activeDietFilters.includes(f.key) && <Check size={11} />}{f.label}
              </button>
            ))}
          </div>

          <input value={customAllergy} onChange={e => setCustomAllergy(e.target.value)} placeholder="Custom allergy or dietary note..."
            className="w-full px-4 py-2 rounded-xl text-xs outline-none"
            style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />

          <div className="flex gap-2 overflow-x-auto pb-1">
            {cats.map(c => (
              <button key={c} onClick={() => setActiveCat(c)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: activeCat === c ? theme.primary : theme.surface, color: activeCat === c ? '#fff' : theme.textMuted, border: `1px solid ${activeCat === c ? theme.primary : theme.border}` }}>{c}</button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl overflow-hidden flex flex-col relative" style={{ background: theme.surface, border: `1px solid ${theme.border}`, opacity: item.stock > 0 ? 1 : 0.6 }}>
                <div className="relative h-40 overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-2 left-3 flex gap-1 flex-wrap">
                    {item.halal && <span className="badge badge-green">Halal</span>}
                    {item.vegan && <span className="badge" style={{ background: '#84cc1620', color: '#84cc16' }}>Vegan</span>}
                    {item.glutenFree && <span className="badge" style={{ background: '#06b6d420', color: '#06b6d4' }}>GF</span>}
                    {item.spicy && <span className="badge badge-red">Spicy</span>}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: theme.primary }}>{item.portionSize}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: '#1E293B' }}>{item.weight}g</span>
                  </div>
                  {item.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <span className="badge badge-red text-sm px-4 py-2">SOLD OUT</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-base leading-tight" style={{ color: theme.text }}>{item.name}</h3>
                    <span className="text-lg font-extrabold ml-2 flex-shrink-0" style={{ color: theme.primary }}>{toPrice(item.price)}</span>
                  </div>
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: theme.textMuted }}>{item.description}</p>
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {[{ label: 'Cal', val: item.calories }, { label: 'Prot', val: `${item.protein}g` }, { label: 'Carbs', val: `${item.carbs}g` }, { label: 'Wt', val: `${item.weight}g` }].map(m => (
                      <div key={m.label} className="text-center py-1.5 rounded-lg" style={{ background: theme.bg }}>
                        <div className="text-xs font-bold" style={{ color: theme.text }}>{m.val}</div>
                        <div className="text-[10px]" style={{ color: theme.textMuted }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => setSelectedItem(item)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}><Info size={13} /> Details</button>
                    <button onClick={() => addToCart(item)} disabled={item.stock <= 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                      style={{ background: theme.primary }}>{item.stock <= 0 ? 'Sold Out' : <><Plus size={15} /> Add to Order</>}</button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-16">
                <Leaf size={40} className="mx-auto mb-3 opacity-20" style={{ color: theme.primary }} />
                <p style={{ color: theme.textMuted }}>No items match your filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Item detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSelectedItem(null)}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl overflow-auto max-h-[85vh]" style={{ background: theme.surface }} onClick={e => e.stopPropagation()}>
              <div className="relative h-52">
                <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
                <button onClick={() => setSelectedItem(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><X size={16} color="#fff" /></button>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-extrabold" style={{ color: theme.text }}>{selectedItem.name}</h2>
                    <p className="text-xs" style={{ color: theme.textMuted }}>{selectedItem.portionSize} - {selectedItem.weight}g</p>
                  </div>
                  <span className="text-xl font-extrabold" style={{ color: theme.primary }}>{toPrice(selectedItem.price)}</span>
                </div>
                <p className="text-sm mb-4" style={{ color: theme.textMuted }}>{selectedItem.description}</p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[{ label: 'Calories', val: selectedItem.calories + ' kcal' }, { label: 'Protein', val: selectedItem.protein + 'g' },
                    { label: 'Carbs', val: selectedItem.carbs + 'g' }, { label: 'Weight', val: selectedItem.weight + 'g' }].map(m => (
                    <div key={m.label} className="text-center p-2 rounded-xl" style={{ background: theme.bg }}>
                      <div className="text-sm font-extrabold" style={{ color: theme.primary }}>{m.val}</div>
                      <div className="text-[10px]" style={{ color: theme.textMuted }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: theme.textMuted }}>Ingredients</h4>
                  <p className="text-sm" style={{ color: theme.text }}>{selectedItem.ingredients.join(', ') || 'Fresh ingredients selected by the chef'}</p>
                </div>
                {selectedItem.allergens.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                    <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div className="text-xs font-bold" style={{ color: '#ef4444' }}>Allergens</div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>{selectedItem.allergens.join(' - ')}</div>
                    </div>
                  </div>
                )}
                <button onClick={() => { addToCart(selectedItem); setSelectedItem(null); }} disabled={selectedItem.stock <= 0}
                  className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40" style={{ background: theme.primary }}>
                  {selectedItem.stock <= 0 ? 'Currently Unavailable' : `Add to Order - ${toPrice(selectedItem.price)}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowCart(false)}>
            <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} className="w-full max-w-sm rounded-2xl"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <h2 className="font-extrabold" style={{ color: theme.text }}>Your Order</h2>
                <button onClick={() => setShowCart(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="p-4 space-y-3 max-h-64 overflow-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8" style={{ color: theme.textMuted }}>
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Your cart is empty</p>
                  </div>
                ) : cart.map(c => (
                  <div key={c.item.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: theme.text }}>{c.item.name}</div>
                      <div className="text-xs" style={{ color: theme.primary }}>{toPrice(c.item.price * c.qty)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setCart(prev => prev.map(p => p.item.id === c.item.id ? { ...p, qty: Math.max(0, p.qty - 1) } : p).filter(p => p.qty > 0))}
                        className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: theme.bg }}><Minus size={12} style={{ color: theme.textMuted }} /></button>
                      <span className="text-sm font-bold w-4 text-center" style={{ color: theme.text }}>{c.qty}</span>
                      <button onClick={() => addToCart(c.item)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: theme.bg }}><Plus size={12} style={{ color: theme.textMuted }} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="px-5 pb-5 pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div className="flex justify-between font-extrabold text-base mb-4">
                    <span style={{ color: theme.text }}>Total</span><span style={{ color: theme.primary }}>{toPrice(cartTotal)}</span>
                  </div>
                  <button onClick={() => { setShowCart(false); setShowPayment(true); }} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: theme.primary }}>
                    Pay & Place Order
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment modal - required before order is placed */}
      <AnimatePresence>
        {showPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={() => setShowPayment(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Payment Required</h2>
                <button onClick={() => setShowPayment(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="text-center mb-5">
                <div className="text-4xl font-extrabold" style={{ color: theme.primary }}>{toPrice(cartTotal)}</div>
                <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{cartCount} items - Table {tableNum}</div>
                <div className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: '#eab308' }}>
                  <Lock size={11} /> Order is sent to kitchen after payment
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {([ { key: 'tablet_pay', label: 'Pay at Table', icon: CreditCard }, { key: 'card', label: 'Card', icon: CreditCard }, { key: 'cash', label: 'Cash', icon: Banknote } ] as { key: PayMethod; label: string; icon: typeof CreditCard }[]).map(m => (
                  <button key={m.key} onClick={() => setPayMethod(m.key)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all"
                    style={{ background: payMethod === m.key ? theme.primary : theme.bg, color: payMethod === m.key ? '#fff' : theme.textMuted, border: `1px solid ${payMethod === m.key ? theme.primary : theme.border}` }}>
                    <m.icon size={18} />{m.label}
                  </button>
                ))}
              </div>
              <button onClick={processPayment} className="w-full py-3 rounded-xl font-bold text-sm text-white" style={{ background: theme.primary }}>
                Confirm Payment & Send Order
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Social modal */}
      <AnimatePresence>
        {showSocial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowSocial(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-extrabold" style={{ color: theme.text }}>Follow Us</h2>
                <button onClick={() => setShowSocial(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SOCIAL_LINKS.map(s => (
                  <button key={s.label} className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:opacity-80"
                    style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: s.color + '20' }}>
                      <s.icon size={22} style={{ color: s.color }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: theme.text }}>{s.label}</span>
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                      <div className="grid grid-cols-4 gap-px">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5" style={{ background: i % 3 === 0 ? theme.text : 'transparent' }} />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <AnimatePresence>
        {serviceRequest && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl"
            style={{ background: theme.primary }}>{serviceRequest} sent to your waiter</motion.div>
        )}
        {orderPlaced && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 text-white shadow-2xl"
            style={{ background: '#22c55e' }}><Check size={16} /> Order placed! Kitchen is preparing your food.</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

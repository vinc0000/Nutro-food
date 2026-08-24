import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingCart, X, Plus, Minus,
  Info, Check, AlertTriangle, Leaf, Instagram, Facebook, MessageCircle, MapPin,
  CreditCard, Banknote, Lock
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSharedMenu } from '@/lib/menuStore';
import { useSharedOrders, SharedOrder } from '@/lib/ordersStore';
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

const CATS = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks', 'Snacks'];

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

export default function TabletMenu() {
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') ?? '1';

  // A real customer-facing tablet is unauthenticated, so it must identify its own
  // branch from the URL — either directly (?branch=<id>) or via a QR-provisioned
  // token (?token=<tablet_token>, resolved against the public branch_public_info
  // view). When neither is present (e.g. previewing from the admin sidebar while
  // logged in), fall back to the signed-in admin's own branch.
  const branchParam = searchParams.get('branch');
  const tokenParam = searchParams.get('token');
  const { orgContext } = useOrgContext();
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(branchParam);

  useEffect(() => {
    if (branchParam) { setResolvedBranchId(branchParam); return; }
    if (tokenParam) {
      supabase
        .from('branch_public_info')
        .select('id,name,currency,country,city')
        .eq('tablet_token', tokenParam)
        .maybeSingle<{ id: string }>()
        .then(({ data }) => setResolvedBranchId(data?.id ?? null));
      return;
    }
    setResolvedBranchId(orgContext?.branch_id ?? null);
  }, [branchParam, tokenParam, orgContext?.branch_id]);

  const { menuItems } = useSharedMenu(resolvedBranchId);
  const { addOrder } = useSharedOrders(resolvedBranchId);

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('nutro:settings:currency') ?? 'USD';
  });

  const [isOnline, setIsOnline] = useState(() => typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [brandLogo] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('nutro:settings:logoUrl') ?? '' : '');
  const [brandName] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('nutro:settings:name') ?? 'Le Maison Dubai' : 'Le Maison Dubai');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');
  const [activeDietFilters, setActiveDietFilters] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [serviceRequest, setServiceRequest] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showSocial, setShowSocial] = useState(false);

  // Editable Table and Note states
  const [editableTableNum, setEditableTableNum] = useState(() => searchParams.get('table') ?? '1');
  const [orderNote, setOrderNote] = useState('');

  const rate = CURRENCY_RATES[currency];
  const sym = CURRENCY_SYMBOLS[currency];
  const toPrice = (usd: number) => `${sym}${(usd * rate).toFixed(2)}`;

  const toggleDiet = (key: string) => setActiveDietFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const sharedMenu = menuItems.map(item => ({
    ...item,
    ingredients: item.ingredients.map(ingredient => ingredient.name),
    allergens: item.allergens ?? [],
  })) as MenuItem[];

  const filtered = sharedMenu.filter(item => {
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

  const placeOrderDirectly = async () => {
    const orderId = 'order-' + Date.now();
    const orderNum = '#' + Math.floor(1000 + Math.random() * 9000);
    const combinedNotes = [
      customAllergy ? 'ALLERGY WARNING: ' + customAllergy : '',
      orderNote ? 'NOTE: ' + orderNote : ''
    ].filter(Boolean).join(' | ');

    const newOrder: SharedOrder = {
      id: orderId,
      orderNumber: orderNum,
      tableLabel: 'Table ' + (editableTableNum || '1'),
      type: 'dine_in',
      status: 'pending',
      payment: 'unpaid',
      refundAmount: 0,
      items: cart.map(c => ({
        id: c.item.id,
        name: c.item.name,
        price: c.item.price,
        qty: c.qty
      })),
      subtotal: cartTotal,
      tax: cartTotal * 0.05,
      total: cartTotal * 1.05,
      source: 'tablet',
      note: combinedNotes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await addOrder(newOrder);

    setOrderPlaced(true);
    setTimeout(() => setOrderPlaced(false), 5000);
    setCart([]);
    setOrderNote('');
  };

  const sendServiceRequest = (req: string) => {
    setServiceRequest(req);
    setTimeout(() => setServiceRequest(null), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      <header className="sticky top-0 z-30 px-4 sm:px-6 py-3" style={{ background: theme.surface + 'F0', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: theme.primary }}>
                <Logo size={18} color="#fff" />
              </div>
            )}
            <div>
              <div className="text-sm font-extrabold flex items-center gap-2" style={{ color: theme.text }}>
                {brandName}
                {!isOnline && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 animate-pulse border border-amber-500/20">
                    Offline Mode
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: theme.textMuted }}>{t('tablet.table')} {tableNum}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="px-2 py-1 rounded-lg text-xs font-bold outline-none"
              style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowSocial(true)} className="px-2 py-1.5 rounded-lg text-xs font-bold" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{t('tablet.social')}</button>
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
            { key: 'waiter', label: t('tablet.callWaiter') },
            { key: 'water', label: t('tablet.water') },
            { key: 'bill', label: t('tablet.bill') },
          ].map(req => (
            <button key={req.key} onClick={() => sendServiceRequest(req.label)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{req.label}</button>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        <div className="relative rounded-2xl px-3 py-2" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('tablet.search')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>

        <div className="flex gap-2 flex-wrap rounded-2xl p-3" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          {DIET_FILTERS.map(f => (
            <button key={f.key} onClick={() => toggleDiet(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: activeDietFilters.includes(f.key) ? f.color : f.color + '18', color: activeDietFilters.includes(f.key) ? '#fff' : f.color, border: `1px solid ${f.color}40` }}>
              {activeDietFilters.includes(f.key) && <Check size={11} />}{f.label}
            </button>
          ))}
        </div>

        <input value={customAllergy} onChange={e => setCustomAllergy(e.target.value)} placeholder={t('tablet.customAllergy')}
          className="w-full px-4 py-2.5 rounded-2xl text-xs outline-none"
          style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />

        <div className="flex gap-2 overflow-x-auto pb-1 rounded-2xl p-2" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: activeCat === c ? theme.primary : theme.surface, color: activeCat === c ? '#fff' : theme.textMuted, border: `1px solid ${activeCat === c ? theme.primary : theme.border}` }}>{c}</button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-3xl overflow-hidden flex flex-col relative shadow-sm" style={{ background: theme.surface, border: `1px solid ${theme.border}`, opacity: item.stock > 0 ? 1 : 0.6 }}>
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
                    style={{ background: theme.primary }}>{item.stock <= 0 ? t('tablet.soldOut') : <><Plus size={15} /> {t('tablet.add')}</>}</button>
                </div>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="sm:col-span-2 xl:col-span-3 text-center py-16">
              <Leaf size={40} className="mx-auto mb-3 opacity-20" style={{ color: theme.primary }} />
              <p style={{ color: theme.textMuted }}>No items match your filters.</p>
            </div>
          )}
        </div>
      </div>

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
                  <p className="text-sm" style={{ color: theme.text }}>{selectedItem.ingredients.join(', ')}</p>
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
                <div className="px-5 pb-5 pt-2 space-y-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: theme.textMuted }}>Table</label>
                      <input type="text" value={editableTableNum} onChange={e => setEditableTableNum(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: theme.textMuted }}>Instructions</label>
                      <input type="text" value={orderNote} onChange={e => setOrderNote(e.target.value)}
                        placeholder="e.g. Pas d'oignon"
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                    </div>
                  </div>
                  <div className="flex justify-between font-extrabold text-base pt-1">
                    <span style={{ color: theme.text }}>Total</span><span style={{ color: theme.primary }}>{toPrice(cartTotal)}</span>
                  </div>
                  <button onClick={() => { setShowCart(false); void placeOrderDirectly(); }} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: theme.primary }}>
                    Passer la commande (Règlement à la caisse)
                  </button>
                </div>
              )}
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 text-white shadow-2xl text-center"
            style={{ background: '#22c55e' }}><Check size={16} /> Commande envoyée ! Veuillez régler à la caisse (POS).</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

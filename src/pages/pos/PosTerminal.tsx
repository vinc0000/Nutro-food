/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Search, Plus, Minus, X, CreditCard, Banknote, Smartphone, Gift,
  Clock, Printer, ArrowLeft, Check, Hash, Edit2, FileText, Lock,
  Tablet, Loader2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, getLocalOrders, saveLocalOrders } from '@/lib/supabase';
import { useOrgContext, usePlanInfo } from '@/hooks/useOrgContext';

interface CartItem { id: string; name: string; price: number; qty: number; }
interface TabletOrder {
  id: string; tableNum: string; items: { name: string; qty: number; price: number }[];
  total: number; status: 'pending' | 'accepted' | 'rejected'; time: string;
}

const DEFAULT_MENU = [
  { id: '1', name: 'Wagyu Burger', price: 24, cat: 'Mains', calories: 820, available: true },
  { id: '2', name: 'Truffle Fries', price: 9, cat: 'Starters', calories: 380, available: true },
  { id: '3', name: 'Caesar Salad', price: 12, cat: 'Starters', calories: 320, available: true },
  { id: '4', name: 'Margherita Pizza', price: 18, cat: 'Mains', calories: 680, available: true },
  { id: '5', name: 'Seafood Pasta', price: 22, cat: 'Mains', calories: 740, available: true },
  { id: '6', name: 'Cheesecake', price: 9, cat: 'Desserts', calories: 420, available: true },
  { id: '7', name: 'Lava Cake', price: 11, cat: 'Desserts', calories: 460, available: true },
  { id: '8', name: 'Fresh Juice', price: 6, cat: 'Drinks', calories: 120, available: true },
  { id: '9', name: 'Sparkling Water', price: 3, cat: 'Drinks', calories: 0, available: true },
  { id: '10', name: 'Grilled Salmon', price: 28, cat: 'Mains', calories: 560, available: true },
  { id: '11', name: 'Calamari', price: 14, cat: 'Starters', calories: 320, available: true },
  { id: '12', name: 'Creme Brulee', price: 10, cat: 'Desserts', calories: 390, available: false },
];

const tableColor: Record<string, string> = { available: '#22c55e', occupied: '#ef4444', reserved: '#eab308', cleaning: '#94a3b8' };
type PayMethod = 'cash' | 'card' | 'tap' | 'gift_card';

function PinGuard({ onUnlock }: { onUnlock: () => void }) {
  const { theme } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const handleKey = (k: string) => {
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      if (next === '1234') setTimeout(onUnlock, 200);
      else { setError(true); setTimeout(() => { setPin(''); setError(false); }, 600); }
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-72 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: theme.primary }}>
          <Monitor size={26} color="#fff" />
        </div>
        <h1 className="text-lg font-bold mb-1" style={{ color: theme.text }}>POS Terminal</h1>
        <p className="text-sm mb-8" style={{ color: theme.textMuted }}>Enter your 4-digit PIN to continue</p>
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-extrabold border-2 transition-all ${error ? 'animate-pulse' : ''}`}
              style={{ background: theme.surface, borderColor: pin.length > i ? (error ? '#ef4444' : theme.primary) : theme.border, color: theme.text }}>
              {pin.length > i ? '\u25CF' : ''}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((k, i) => (
            <button key={i} onClick={() => k === 'del' ? setPin(p => p.slice(0, -1)) : k !== null ? handleKey(String(k)) : undefined}
              disabled={k === null}
              className="h-14 rounded-xl font-bold text-xl transition-all hover:opacity-80 active:scale-95 disabled:opacity-0"
              style={{ background: k === 'del' ? '#ef444420' : theme.surface, color: k === 'del' ? '#ef4444' : theme.text, border: `1px solid ${theme.border}` }}>
              {k === 'del' ? '\u232B' : k}
            </button>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: theme.textMuted }}>Demo PIN: 1234</p>
      </motion.div>
    </div>
  );
}

function ManagerPinModal({ onClose, onApprove, theme }: { onClose: () => void; onApprove: () => void; theme: ReturnType<typeof useTheme>['theme'] }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const handleKey = (k: string) => {
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      if (next === '9999') onApprove();
      else { setError(true); setTimeout(() => { setPin(''); setError(false); }, 600); }
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="w-72 rounded-2xl p-6 text-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#f59e0b20' }}>
          <Lock size={22} style={{ color: '#f59e0b' }} />
        </div>
        <h2 className="text-lg font-extrabold mb-1" style={{ color: theme.text }}>Manager Approval</h2>
        <p className="text-xs mb-5" style={{ color: theme.textMuted }}>Enter Manager PIN to authorize</p>
        <div className="flex justify-center gap-2 mb-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-10 h-12 rounded-lg flex items-center justify-center text-xl font-extrabold border-2 ${error ? 'animate-pulse' : ''}`}
              style={{ background: theme.bg, borderColor: pin.length > i ? (error ? '#ef4444' : theme.primary) : theme.border, color: theme.text }}>
              {pin.length > i ? '\u25CF' : ''}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((k, i) => (
            <button key={i} onClick={() => k === 'del' ? setPin(p => p.slice(0, -1)) : k !== null ? handleKey(String(k)) : undefined}
              disabled={k === null}
              className="h-12 rounded-lg font-bold text-lg transition-all hover:opacity-80 disabled:opacity-0"
              style={{ background: k === 'del' ? '#ef444420' : theme.bg, color: k === 'del' ? '#ef4444' : theme.text, border: `1px solid ${theme.border}` }}>
              {k === 'del' ? '\u232B' : k}
            </button>
          ))}
        </div>
        <p className="text-[10px] mt-3" style={{ color: theme.textMuted }}>Demo Manager PIN: 9999</p>
      </motion.div>
    </motion.div>
  );
}

export default function PosTerminal() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { orgContext } = useOrgContext();
  const { plan } = usePlanInfo();
  const PLAN_TABLE_LIMIT = plan === 'premium' ? 30 : plan === 'enterprise' ? 999 : 10;

  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [cat, setCat] = useState('All');
  const [cats, setCats] = useState<string[]>(['All', 'Starters', 'Mains', 'Desserts', 'Drinks']);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [sessionStart] = useState(new Date());
  const [orderCount, setOrderCount] = useState(0);
  const [sessionSales, setSessionSales] = useState(0);
  const [menu, setMenu] = useState<{ id: string; name: string; price: number; cat: string; calories: number; available: boolean }[]>(DEFAULT_MENU);
  const [loading, setLoading] = useState(false);

  const [tables, setTables] = useState([
    { id: '1', name: 'T1', status: 'occupied' },
    { id: '2', name: 'T2', status: 'occupied' },
    { id: '3', name: 'T3', status: 'available' },
    { id: '4', name: 'T4', status: 'available' },
    { id: '5', name: 'T5', status: 'reserved' },
    { id: '6', name: 'T6', status: 'reserved' },
    { id: '7', name: 'T7', status: 'cleaning' },
    { id: '8', name: 'T8', status: 'cleaning' },
  ]);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [cardDetail, setCardDetail] = useState('');
  const [cashGiven, setCashGiven] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showZReport, setShowZReport] = useState(false);
  const [zReportPrinted, setZReportPrinted] = useState(0);
  const [showManagerPin, setShowManagerPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | 'void'>(null);
  const [showTabletOrders, setShowTabletOrders] = useState(false);
  const [tabletOrders, setTabletOrders] = useState<TabletOrder[]>([
    { id: 'to1', tableNum: '5', items: [{ name: 'Wagyu Burger', qty: 2, price: 24 }, { name: 'Truffle Fries', qty: 1, price: 9 }], total: 57, status: 'pending', time: '2 min ago' },
    { id: 'to2', tableNum: '3', items: [{ name: 'Margherita Pizza', qty: 1, price: 18 }, { name: 'Fresh Juice', qty: 2, price: 6 }], total: 30, status: 'pending', time: '5 min ago' },
  ]);

  const fetchLiveMenu = useCallback(async () => {
    if (!orgContext?.branch_id) return;
    setLoading(true);
    try {
      // 1. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .select('id, name')
        .eq('branch_id', orgContext.branch_id);

      if (catError) throw catError;

      if (catData && catData.length > 0) {
        setCats(['All', ...catData.map(c => c.name)]);
      } else {
        setCats(['All', 'Starters', 'Mains', 'Desserts', 'Drinks']);
      }

      // 2. Fetch live items
      const { data: itemData, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('branch_id', orgContext.branch_id);

      if (itemError) throw itemError;

      if (itemData && itemData.length > 0) {
        const mapped = itemData.map(dbItem => {
          const matchedCatName = catData?.find(c => c.id === dbItem.category_id)?.name || 'Mains';
          return {
            id: dbItem.id,
            name: dbItem.name,
            price: Number(dbItem.price),
            cat: matchedCatName,
            calories: dbItem.calories || 0,
            available: !!dbItem.is_available,
          };
        });
        setMenu(mapped);
      } else {
        setMenu(DEFAULT_MENU);
      }

      // 3. Fetch real tables if they exist
      const { data: tableData, error: tableError } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('branch_id', orgContext.branch_id);

      if (tableError) throw tableError;

      if (tableData && tableData.length > 0) {
        setTables(tableData.map((t: any) => ({
          id: t.id,
          name: t.name || `T${t.table_number || ''}`,
          status: t.status || 'available'
        })));
      }
    } catch (err) {
      console.warn('Error fetching live data for POS, using mock fallback:', err);
      setCats(['All', 'Starters', 'Mains', 'Desserts', 'Drinks']);
      setMenu(DEFAULT_MENU);
    } finally {
      setLoading(false);
    }
  }, [orgContext?.branch_id]);

  useEffect(() => {
    if (unlocked) {
      fetchLiveMenu();
    }
  }, [unlocked, fetchLiveMenu]);

  useEffect(() => {
    const syncOrders = () => {
      if (!orgContext?.branch_id) return;
      const localOrders = getLocalOrders();
      // 1. Sync pending Tablet orders
      const pendingTablet = localOrders
        .filter(o => o.branch_id === orgContext.branch_id && o.notes?.startsWith('Table ') && o.status === 'pending')
        .map(o => ({
          id: o.id,
          tableNum: o.notes.replace('Table ', ''),
          items: o.items || [{ name: 'Salad & Proteins', qty: 1, price: o.total_amount }],
          total: o.total_amount,
          status: 'pending' as const,
          time: 'Just now'
        }));
      if (pendingTablet.length > 0) {
        setTabletOrders(pendingTablet);
      }

      // 2. Sync real table states (mark occupied if there are pending orders)
      const tablesWithOrders = localOrders
        .filter(o => o.branch_id === orgContext.branch_id && o.status === 'pending' && o.notes?.startsWith('Table '))
        .map(o => o.notes.replace('Table ', ''));

      setTables(prev => prev.map(t => {
        if (tablesWithOrders.includes(t.name)) {
          return { ...t, status: 'occupied' };
        }
        return t;
      }));
    };

    syncOrders();
    window.addEventListener('storage', syncOrders);
    return () => window.removeEventListener('storage', syncOrders);
  }, [orgContext?.branch_id]);

  const filtered = menu.filter(i => (cat === 'All' || i.cat === cat) && i.name.toLowerCase().includes(search.toLowerCase()));
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const change = cashGiven ? Math.max(0, parseFloat(cashGiven) - total) : 0;
  const pendingTabletOrders = tabletOrders.filter(o => o.status === 'pending');

  const addItem = (item: any) => {
    if (!item.available) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const processPayment = async () => {
    if (!orgContext?.branch_id) return;
    try {
      const orderNumber = Math.floor(1000 + Math.random() * 9000).toString();
      const notesLabel = selectedTable ? `Table ${tables.find(t => t.id === selectedTable)?.name || selectedTable}` : 'Dine-In';

      // Store in shared local orders key to trigger real-time sync with other modules (KDS, Admin dashboard, etc)
      const localOrders = getLocalOrders();
      const newLocalOrder = {
        id: 'order-' + Date.now(),
        branch_id: orgContext.branch_id,
        order_number: orderNumber,
        order_type: orderType,
        status: 'pending', // Pending so it pops on KDS panel in real time!
        subtotal: subtotal,
        tax_amount: tax,
        discount_amount: 0,
        total_amount: total,
        payment_status: 'paid',
        payment_method: payMethod,
        notes: notesLabel,
        items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
        created_at: new Date().toISOString()
      };
      saveLocalOrders([newLocalOrder, ...localOrders]);

      // Try background syncing to Supabase database (does not block POS checkout on offline/relation errors)
      try {
        await supabase
          .from('orders')
          .insert([{
            branch_id: orgContext.branch_id,
            order_number: orderNumber,
            order_type: orderType,
            status: 'paid',
            subtotal: subtotal,
            tax_amount: tax,
            discount_amount: 0,
            total_amount: total,
            payment_status: 'paid',
            payment_method: payMethod,
            notes: notesLabel,
          }]);
      } catch (dbErr) {
        console.warn("Background Supabase order persistence skipped:", dbErr);
      }

      setPaidSuccess(true);
      setIsPaid(true);
      setOrderCount(c => c + 1);
      setSessionSales(s => s + total);
      setTimeout(() => { setShowPayment(false); setPaidSuccess(false); }, 2000);
    } catch (err) {
      console.error('Error recording POS order:', err);
    }
  };

  const acceptTabletOrder = (id: string) => {
    setTabletOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'accepted' } : o));
    const order = tabletOrders.find(o => o.id === id);
    if (order) {
      setCart(order.items.map((it, i) => ({ id: `to-${i}`, name: it.name, price: it.price, qty: it.qty })));
      setSelectedTable(order.tableNum);
      setShowTabletOrders(false);
    }
  };

  const rejectTabletOrder = (id: string) => {
    setTabletOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'rejected' } : o));
  };

  const startNewOrder = () => {
    setCart([]); setSelectedTable(null); setIsPaid(false); setCardDetail(''); setCashGiven('');
  };

  if (!unlocked) return <PinGuard onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="h-screen flex flex-col" style={{ background: theme.bg }}>
      <header className="h-12 flex items-center justify-between px-4 flex-shrink-0" style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/admin')} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><ArrowLeft size={16} /></button>
          <Monitor size={16} style={{ color: theme.primary }} />
          <span className="text-sm font-bold" style={{ color: theme.text }}>POS Terminal</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: theme.textMuted }}>
            <Clock size={12} /><span>{Math.floor((Date.now() - sessionStart.getTime()) / 60000)}m</span><span>· {orderCount} orders</span><span>· ${sessionSales.toFixed(2)}</span>
          </div>
          <button onClick={() => setShowTabletOrders(true)} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg relative" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
            <Tablet size={12} /> Tablet Orders
            {pendingTabletOrders.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#ef4444' }}>{pendingTabletOrders.length}</span>}
          </button>
          <button onClick={() => setShowZReport(true)} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
            <FileText size={12} /> Z-Report
          </button>
          <span className="text-xs font-semibold" style={{ color: theme.primary }}>{profile?.full_name ?? 'Cashier'}</span>
          <button onClick={() => setUnlocked(false)} className="text-xs px-2 py-1 rounded-lg" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Lock</button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="animate-spin" style={{ color: theme.primary }} />
          <span className="text-sm font-semibold" style={{ color: theme.textMuted }}>Loading terminal items & table map...</span>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap flex-shrink-0">
              {(['dine_in', 'takeaway', 'delivery'] as const).map(t => (
                <button key={t} onClick={() => setOrderType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                  style={{ background: orderType === t ? theme.primary : theme.surface, color: orderType === t ? '#fff' : theme.textMuted, border: `1px solid ${orderType === t ? theme.primary : theme.border}` }}>
                  {t.replace('_', ' ')}
                </button>
              ))}
              <div className="ml-auto flex gap-1.5 flex-wrap items-center">
                {tables.map(t => (
                  <div key={t.id} className="relative group">
                    <button onClick={() => setSelectedTable(t.id === selectedTable ? null : t.id)}
                      onDoubleClick={() => { setEditingTable(t.id); setTableName(t.name); }}
                      className="w-auto min-w-[36px] h-9 px-2 rounded-lg text-[11px] font-bold transition-all"
                      style={{ background: selectedTable === t.id ? tableColor[t.status] : tableColor[t.status] + '20', color: selectedTable === t.id ? '#fff' : tableColor[t.status], border: `1px solid ${tableColor[t.status]}40` }}>
                      {t.name}
                    </button>
                    <button onClick={() => { setEditingTable(t.id); setTableName(t.name); }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: theme.primary }}>
                      <Edit2 size={8} color="#fff" />
                    </button>
                  </div>
                ))}
                {tables.length < PLAN_TABLE_LIMIT && (
                  <button onClick={() => setTables(prev => [...prev, { id: Date.now().toString(), name: `T${prev.length + 1}`, status: 'available' }])}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: theme.primary + '20', color: theme.primary, border: `1px dashed ${theme.primary}40` }}>
                    <Plus size={14} />
                  </button>
                )}
                {tables.length >= PLAN_TABLE_LIMIT && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: '#eab30820', color: '#eab308' }}>Limit: {PLAN_TABLE_LIMIT}</span>
                )}
              </div>
            </div>

            {editingTable && (
              <div className="px-4 pb-2 flex items-center gap-2">
                <input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="Table name"
                  className="px-3 py-1.5 rounded-lg text-xs outline-none w-40"
                  style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.primary}` }} />
                <button onClick={() => { setTables(prev => prev.map(t => t.id === editingTable ? { ...t, name: tableName || t.name } : t)); setEditingTable(null); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: theme.primary }}>Save</button>
                <button onClick={() => setEditingTable(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: theme.surface, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
              </div>
            )}

            <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
              {cats.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
                  style={{ background: cat === c ? theme.primary : theme.surface, color: cat === c ? '#fff' : theme.textMuted, border: `1px solid ${cat === c ? theme.primary : theme.border}` }}>{c}</button>
              ))}
            </div>

            <div className="px-4 pb-3 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                  className="w-full pl-8 pr-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />
              </div>
            </div>

            <div className="flex-1 overflow-auto px-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {filtered.map(item => {
                  const inCart = cart.find(c => c.id === item.id);
                  return (
                    <motion.button key={item.id} whileTap={{ scale: 0.96 }} onClick={() => addItem(item)} disabled={!item.available}
                      className="p-3 rounded-xl text-left transition-all relative disabled:opacity-40"
                      style={{ background: inCart ? theme.primary + '15' : theme.surface, border: `1px solid ${inCart ? theme.primary : theme.border}` }}>
                      <div className="text-sm font-bold leading-tight mb-1" style={{ color: theme.text }}>{item.name}</div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>{item.calories} kcal</div>
                      <div className="text-base font-extrabold mt-2" style={{ color: theme.primary }}>${item.price}</div>
                      {!item.available && <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.4)' }}><span className="text-[10px] font-bold text-white">SOLD OUT</span></div>}
                      {inCart && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: theme.primary }}>{inCart.qty}</div>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-72 flex-shrink-0 flex flex-col" style={{ background: theme.surface, borderLeft: `1px solid ${theme.border}` }}>
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <span className="text-sm font-extrabold" style={{ color: theme.text }}>Order {selectedTable ? `· ${tables.find(t => t.id === selectedTable)?.name ?? `T${selectedTable}`}` : ''}</span>
              {cart.length > 0 && <button onClick={startNewOrder} className="text-xs" style={{ color: '#ef4444' }}>Clear</button>}
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-12" style={{ color: theme.textMuted }}>
                  <Hash size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tap items to add to order</p>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: theme.text }}>{item.name}</div>
                    <div className="text-xs" style={{ color: theme.primary }}>${(item.price * item.qty).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: theme.bg, color: theme.textMuted }}><Minus size={10} /></button>
                    <span className="text-xs font-bold w-4 text-center" style={{ color: theme.text }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: theme.bg, color: theme.textMuted }}><Plus size={10} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 space-y-2 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
              <div className="flex justify-between text-xs" style={{ color: theme.textMuted }}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs" style={{ color: theme.textMuted }}><span>Tax (5%)</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-extrabold text-base" style={{ color: theme.text }}>
                <span>Total</span><span style={{ color: theme.primary }}>${total.toFixed(2)}</span>
              </div>
              {isPaid && (
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#22c55e15', border: '1px solid #22c55e30' }}>
                  <Check size={14} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-bold" style={{ color: '#22c55e' }}>Payment received - receipt ready</span>
                </div>
              )}
              <button onClick={() => cart.length > 0 && setShowPayment(true)} disabled={cart.length === 0 || isPaid}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40" style={{ background: theme.primary }}>
                {isPaid ? 'Paid' : `Charge $${total.toFixed(2)}`}
              </button>
              <div className="flex gap-2">
                <button onClick={() => cart.length > 0 && isPaid && setShowReceipt(true)} disabled={cart.length === 0 || !isPaid}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                  style={{ background: theme.bg, color: isPaid ? theme.primary : theme.textMuted, border: `1px solid ${isPaid ? theme.primary : theme.border}` }}>
                  <Printer size={12} /> Receipt
                </button>
                <button onClick={() => { setPendingAction('void'); setShowManagerPin(true); }} disabled={cart.length === 0}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                  style={{ background: theme.bg, color: '#ef4444', border: `1px solid ${theme.border}` }}>
                  <X size={12} /> Void
                </button>
              </div>
              {isPaid && <button onClick={startNewOrder} className="w-full py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#22c55e' }}>New Order</button>}
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      <AnimatePresence>
        {showPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => !paidSuccess && setShowPayment(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-96 rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              {paidSuccess ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#22c55e20' }}>
                    <Check size={32} style={{ color: '#22c55e' }} />
                  </div>
                  <h2 className="text-xl font-extrabold mb-1" style={{ color: theme.text }}>Payment Successful!</h2>
                  <p className="text-sm" style={{ color: theme.textMuted }}>${total.toFixed(2)} charged via {payMethod}</p>
                  <p className="text-xs mt-2" style={{ color: theme.primary }}>Receipt is now printable</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Payment Required</h2>
                    <button onClick={() => setShowPayment(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
                  </div>
                  <div className="text-center mb-5">
                    <div className="text-4xl font-extrabold" style={{ color: theme.primary }}>${total.toFixed(2)}</div>
                    <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{cart.length} items · Tax included</div>
                    <div className="text-xs mt-1" style={{ color: '#eab308' }}>Receipt locked until payment confirmed</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {([ { key: 'cash', label: 'Cash', icon: Banknote }, { key: 'card', label: 'Card', icon: CreditCard },
                       { key: 'tap', label: 'Tap to Pay', icon: Smartphone }, { key: 'gift_card', label: 'Gift Card', icon: Gift }
                     ] as { key: PayMethod; label: string; icon: typeof Banknote }[]).map(m => (
                      <button key={m.key} onClick={() => setPayMethod(m.key)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all"
                        style={{ background: payMethod === m.key ? theme.primary : theme.bg, color: payMethod === m.key ? '#fff' : theme.textMuted, border: `1px solid ${payMethod === m.key ? theme.primary : theme.border}` }}>
                        <m.icon size={18} />{m.label}
                      </button>
                    ))}
                  </div>
                  {(payMethod === 'card' || payMethod === 'tap' || payMethod === 'gift_card') && (
                    <div className="mb-4">
                      <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>
                        {payMethod === 'gift_card' ? 'Gift Card Number / Approval Code' : 'Approval Code or Last 4 Digits'}
                      </label>
                      <input value={cardDetail} onChange={e => setCardDetail(e.target.value)} placeholder={payMethod === 'gift_card' ? 'GC-XXXX' : 'A1234 / 4242'}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                    </div>
                  )}
                  {payMethod === 'cash' && (
                    <div className="mb-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Cash Received</label>
                        <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0.00"
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {[total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20, Math.ceil(total / 50) * 50].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                          <button key={v} onClick={() => setCashGiven(v.toFixed(2))}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>${v.toFixed(2)}</button>
                        ))}
                      </div>
                      {cashGiven && (
                        <div className="p-3 rounded-xl text-center" style={{ background: '#22c55e15', border: '1px solid #22c55e30' }}>
                          <div className="text-xs font-semibold" style={{ color: theme.textMuted }}>CHANGE TO GIVE</div>
                          <div className="text-3xl font-extrabold" style={{ color: '#22c55e' }}>${change.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={processPayment} disabled={payMethod === 'cash' && !cashGiven}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50" style={{ background: theme.primary }}>
                    Confirm {payMethod === 'cash' ? 'Cash' : payMethod === 'card' ? 'Card' : payMethod === 'tap' ? 'Tap' : 'Gift Card'} Payment
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt modal - only accessible after payment */}
      <AnimatePresence>
        {showReceipt && isPaid && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowReceipt(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-80 rounded-2xl p-6" style={{ background: '#fff', color: '#000' }} onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="text-lg font-extrabold">{orgContext?.org_name || 'Le Maison Dubai'}</div>
                <div className="text-xs text-gray-500">Powered by Nutro - LiAfrik</div>
                <div className="text-xs text-gray-500">{orgContext?.city || 'Dubai'} - {profile?.email}</div>
              </div>
              <div className="border-t border-b border-dashed border-gray-300 py-3 mb-3 text-xs">
                <div className="flex justify-between mb-1"><span>Table: {tables.find(t => t.id === selectedTable)?.name ?? (selectedTable ? `T${selectedTable}` : '-')}</span><span>Cashier: {profile?.full_name ?? 'Staff'}</span></div>
                <div className="flex justify-between"><span>Date: {new Date().toLocaleString()}</span><span>Order: #{1042 + orderCount}</span></div>
                <div className="flex justify-between mt-1"><span>Payment: {payMethod.toUpperCase()}</span>{cardDetail && <span>Ref: {cardDetail}</span>}</div>
              </div>
              <div className="space-y-1 mb-3 text-xs">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.qty}x {item.name}</span>
                    <span>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-300 pt-3 text-xs space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax (5%)</span><span>${tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>${total.toFixed(2)}</span></div>
                {payMethod === 'cash' && cashGiven && <div className="flex justify-between"><span>Cash</span><span>${parseFloat(cashGiven).toFixed(2)}</span></div>}
                {payMethod === 'cash' && <div className="flex justify-between"><span>Change</span><span>${change.toFixed(2)}</span></div>}
              </div>
              <div className="text-center mt-4 text-xs text-gray-500">
                <p>Thank you for dining with us!</p>
                <p className="mt-1">Instagram: @lemaison | TikTok: @lemaison</p>
                <p>Review us on Google Maps!</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5" style={{ background: theme.primary }}>
                  <Printer size={14} /> Print 80mm
                </button>
                <button onClick={() => setShowReceipt(false)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: '#f5f5f5', color: '#666' }}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Z-Report modal */}
      <AnimatePresence>
        {showZReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowZReport(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-96 rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: theme.text }}><FileText size={18} /> Z-Report - End of Day</h2>
                <button onClick={() => setShowZReport(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Total Orders</span><span className="font-bold" style={{ color: theme.text }}>{orderCount}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Total Sales</span><span className="font-bold" style={{ color: theme.primary }}>${sessionSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Session Duration</span><span className="font-bold" style={{ color: theme.text }}>{Math.floor((Date.now() - sessionStart.getTime()) / 60000)} min</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Cashier</span><span className="font-bold" style={{ color: theme.text }}>{profile?.full_name ?? 'Staff'}</span>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl" style={{ background: '#eab30810', border: '1px solid #eab30830' }}>
                <p className="text-xs" style={{ color: theme.textMuted }}>Prints today: {zReportPrinted}/2. Max 2 prints per day to prevent thermal roll waste.</p>
              </div>
              <button onClick={() => { if (zReportPrinted < 2) { setZReportPrinted(p => p + 1); window.print(); } }}
                disabled={zReportPrinted >= 2}
                className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: theme.primary }}>
                <Printer size={16} /> {zReportPrinted >= 2 ? 'Print Limit Reached' : `Print Z-Report (${zReportPrinted}/2)`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tablet orders modal */}
      <AnimatePresence>
        {showTabletOrders && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowTabletOrders(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: theme.text }}>
                  <Tablet size={18} /> Tablet Orders
                  {pendingTabletOrders.length > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>{pendingTabletOrders.length} pending</span>}
                </h2>
                <button onClick={() => setShowTabletOrders(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-3 max-h-80 overflow-auto">
                {tabletOrders.length === 0 ? (
                  <div className="text-center py-8" style={{ color: theme.textMuted }}>
                    <Tablet size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tablet orders</p>
                  </div>
                ) : tabletOrders.map(order => (
                  <div key={order.id} className="p-4 rounded-xl" style={{ background: theme.bg, border: `1px solid ${order.status === 'pending' ? '#eab30840' : theme.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold" style={{ color: theme.text }}>Table {order.tableNum}</span>
                      <span className="text-xs" style={{ color: theme.textMuted }}>{order.time}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {order.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-xs" style={{ color: theme.textMuted }}>
                          <span>{it.qty}x {it.name}</span><span>${(it.price * it.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-bold mb-3" style={{ color: theme.text }}>
                      <span>Total</span><span style={{ color: theme.primary }}>${order.total.toFixed(2)}</span>
                    </div>
                    {order.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => acceptTabletOrder(order.id)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#22c55e' }}>
                          Accept & Load to POS
                        </button>
                        <button onClick={() => rejectTabletOrder(order.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: '#ef444420', color: '#ef4444' }}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold" style={{ color: order.status === 'accepted' ? '#22c55e' : '#ef4444' }}>
                        {order.status === 'accepted' ? <><Check size={14} /> Accepted</> : <><X size={14} /> Rejected</>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManagerPin && (
          <ManagerPinModal theme={theme}
            onClose={() => { setShowManagerPin(false); setPendingAction(null); }}
            onApprove={() => {
              setShowManagerPin(false);
              if (pendingAction === 'void') startNewOrder();
              setPendingAction(null);
            }} />
        )}
      </AnimatePresence>
    </div>
  );
}

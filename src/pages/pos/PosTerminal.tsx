import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Search, Plus, Minus, X, CreditCard, Banknote, Smartphone, Gift,
  Clock, Printer, ArrowLeft, Check, Hash, Edit2, FileText, Lock,
  Tablet, Volume2, VolumeX, Split, UtensilsCrossed
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useNavigate } from 'react-router-dom';
import { useSharedMenu } from '@/lib/menuStore';
import { useSharedOrders, SharedOrder, PaymentSplitEntry } from '@/lib/ordersStore';
import { usePlanInfo, useOrgContext } from '@/hooks/useOrgContext';
import { playNotificationSound } from '@/lib/notificationSound';
import { CURRENCIES } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { usePosLock } from '@/components/guards/PosPinGate';

interface CartItem { id: string; name: string; price: number; qty: number; taxRate: number; }
interface TabletOrder {
  id: string; tableNum: string; items: { name: string; qty: number; price: number; imageUrl?: string | null }[];
  total: number; status: 'pending' | 'accepted' | 'rejected'; time: string;
}

const CATEGORIES = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks', 'Snacks'];

const tableColor: Record<string, string> = { available: '#22c55e', occupied: '#ef4444', reserved: '#eab308', cleaning: '#94a3b8' };
type PayMethod = 'cash' | 'card' | 'tap' | 'gift_card' | 'mobile_money' | 'voucher' | 'credit_note';

// The PinGuard component that used to live here (a hardcoded "1234" check, entirely
// disconnected from any real data) has been removed. PosPinGate — the parent route
// wrapper in PosLayout.tsx — already gates entry to the whole POS using the real,
// admin-configured branch PIN (verify_branch_pos_pin). Keeping a second, fake,
// always-"1234" gate here didn't add security (anyone could read the source or the
// on-screen "demo PIN" hint) and actively broke the terminal for anyone who didn't
// know that undocumented bypass: real staff who correctly entered their actual PIN
// at the real gate would then hit this second, unrelated prompt with no way to know
// what to type.

function ManagerPinModal({ onClose, onApprove, theme, branchId }: { onClose: () => void; onApprove: () => void; theme: ReturnType<typeof useTheme>['theme']; branchId: string | null }) {
  const { t } = useLocale();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const handleKey = (k: string) => {
    if (pin.length >= 4 || verifying) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      if (!branchId) { setError(true); setTimeout(() => { setPin(''); setError(false); }, 600); return; }
      setVerifying(true);
      // Real branch PIN check (the same one PosPinGate verifies at entry), not a
      // hardcoded value — a manager override should require the actual PIN a
      // manager configured, not a fixed "9999" anyone could look up in the source.
      supabase.rpc('verify_branch_pos_pin', { p_branch_id: branchId, p_pin: next }).then(({ data: ok }) => {
        setVerifying(false);
        if (ok) onApprove();
        else { setError(true); setTimeout(() => { setPin(''); setError(false); }, 600); }
      });
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
        <h2 className="text-lg font-extrabold mb-1" style={{ color: theme.text }}>{t('pos.managerTitle')}</h2>
        <p className="text-xs mb-5" style={{ color: theme.textMuted }}>{t('pos.managerPrompt')}</p>
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
        <p className="text-[10px] mt-3" style={{ color: theme.textMuted }}>{t('pos.managerDemo')}</p>
      </motion.div>
    </motion.div>
  );
}

export default function PosTerminal() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const { plan } = usePlanInfo();
  const { orgContext, loading: orgLoading } = useOrgContext();
  const lockPos = usePosLock();
  const { menuItems } = useSharedMenu(orgContext?.branch_id ?? null);
  const PLAN_TABLE_LIMIT = plan === 'starter' ? 10 : (plan === 'premium' ? 30 : 999);

  const currencyCode = orgContext?.currency ?? 'USD';
  const currencySymbol = CURRENCIES.find(c => c.code === currencyCode)?.symbol ?? '$';

  const [isOnline, setIsOnline] = useState(() => typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [brandProfile, setBrandProfile] = useState({
    name: orgContext?.org_name ?? 'Nutro', address: '', phone: '', instagram: '', tiktok: '',
  });
  const { name: brandName, address: brandAddress, phone: brandPhone, instagram: brandInstagram, tiktok: brandTiktok } = brandProfile;

  useEffect(() => {
    if (!orgContext?.branch_id) return;
    supabase.from('branches').select('*').eq('id', orgContext.branch_id).maybeSingle<{
      name: string; address: string | null; contact_phone: string | null; instagram_url: string | null; tiktok_url: string | null;
    }>().then(({ data }) => {
      if (!data) return;
      setBrandProfile({
        name: data.name ?? orgContext.org_name ?? 'Nutro',
        address: data.address ?? '',
        phone: data.contact_phone ?? '',
        instagram: data.instagram_url ?? '',
        tiktok: data.tiktok_url ?? '',
      });
    });
  }, [orgContext?.branch_id, orgContext?.org_name]);

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

  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitEntries, setSplitEntries] = useState<PaymentSplitEntry[]>([
    { method: 'cash', amount: 0 },
    { method: 'card', amount: 0 },
  ]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [sessionStart] = useState(new Date());
  const [orderCount, setOrderCount] = useState(0);
  const [sessionSales, setSessionSales] = useState(0);
  const [tables, setTables] = useState(
    Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), name: `T${i + 1}`, status: i < 2 ? 'occupied' : i < 4 ? 'available' : i < 6 ? 'reserved' : 'cleaning' }))
  );
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [cardDetail, setCardDetail] = useState('');
  const [cashGiven, setCashGiven] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [showZReport, setShowZReport] = useState(false);
  const [zReportMode, setZReportMode] = useState<'x' | 'z'>('z');
  const [zReportPrinted, setZReportPrinted] = useState(0);
  const [showManagerPin, setShowManagerPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | 'void'>(null);
  const [showTabletOrders, setShowTabletOrders] = useState(false);
  const { orders, updateOrder, addOrder } = useSharedOrders(orgContext?.branch_id ?? null);

  // Dynamically map shared orders to TabletOrder structure. Falls back to matching
  // the item by name against the live menu when the order's own stored image is
  // missing (e.g. an older order placed before this field existed, or a menu_item_id
  // that's since been deleted) — a cashier should never have to guess what a tablet
  // order item is from the name alone if a photo can be found at all.
  const tabletOrders: TabletOrder[] = orders
    .filter(o => o.source === 'tablet')
    .map(o => ({
      id: o.id,
      tableNum: o.tableLabel.replace('Table ', ''),
      items: o.items.map(it => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
        imageUrl: it.imageUrl ?? menuItems.find(m => m.name.toLowerCase() === it.name.toLowerCase())?.image ?? null,
      })),
      total: o.total,
      status: o.status === 'pending' ? 'pending' : (o.status === 'cancelled' ? 'rejected' : 'accepted'),
      time: 'Just now',
    }));

  const posMenu = menuItems.map(item => ({ id: item.id, name: item.name, price: item.price, cat: item.category, calories: item.calories, available: item.available && item.stock > 0, image: item.image, taxRate: item.taxRate }));
  const filtered = posMenu.filter(i => (cat === 'All' || i.cat === cat) && i.name.toLowerCase().includes(search.toLowerCase()));
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  // Each menu item carries its own admin-configured tax rate (Menu.tsx lets a manager
  // set this per item, and shows it on the item card) — a single flat 5% here was
  // silently ignoring that and applying UAE's rate to every branch regardless of its
  // actual country, and to every item regardless of what the admin set for it.
  const tax = cart.reduce((s, i) => s + i.price * i.qty * (i.taxRate / 100), 0);
  const total = subtotal + tax;
  const cashGivenAmount = cashGiven ? parseFloat(cashGiven) : NaN;
  const isCashAmountValid = !Number.isNaN(cashGivenAmount) && cashGivenAmount >= total;
  const splitTotal = splitEntries.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const isSplitAmountValid = splitEntries.filter(e => e.amount > 0).length >= 2 && Math.abs(splitTotal - total) < 0.01;
  const change = isCashAmountValid ? cashGivenAmount - total : 0;
  const pendingTabletOrders = tabletOrders.filter(o => o.status === 'pending');
  const [posSoundOn, setPosSoundOn] = useState(true);
  const knownPendingTabletIds = useRef<Set<string> | null>(null);

  // A cashier can't be expected to keep glancing at the tablet-orders badge — this
  // plays an audible beep the moment a NEW tablet order arrives (not just a silent
  // count going up), same real-sound mechanism as KDS. Seeds on first render
  // (skip=true) so opening POS with orders already pending doesn't beep for orders
  // that aren't actually new.
  useEffect(() => {
    const currentIds = new Set(pendingTabletOrders.map(o => o.id));
    if (knownPendingTabletIds.current === null) {
      knownPendingTabletIds.current = currentIds;
      return;
    }
    const hasNew = pendingTabletOrders.some(o => !knownPendingTabletIds.current!.has(o.id));
    if (hasNew) {
      playNotificationSound(posSoundOn);
      setShowTabletOrders(true);
    }
    knownPendingTabletIds.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTabletOrders.map(o => o.id).join(',')]);

  const zReportPrintLimit = orgContext?.z_report_print_limit ?? 2;
  const todayKey = new Date().toISOString().slice(0, 10);
  const zReportStorageKey = `nutro:zreport-printed:${orgContext?.branch_id ?? 'branch'}:${todayKey}`;

  // Real day totals for the X/Z report — every order for this branch placed today,
  // not just what this cashier has rung up since logging in (that's what the header's
  // sessionSales/orderCount still shows, which is a genuinely different, smaller
  // number: "since I logged in" vs "the whole branch's day"). A refund reduces net
  // sales but the order still counts toward order count. Cancelled orders count
  // toward neither, matching what an owner actually means by "sales today".
  const todaysOrders = orders.filter(o => o.createdAt.slice(0, 10) === todayKey);
  const todaysNetSales = todaysOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total - (o.refundAmount || 0)), 0);
  const todaysOrderCount = todaysOrders.filter(o => o.status !== 'cancelled').length;
  const todaysByMethod = todaysOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, o) => {
      const net = o.total - (o.refundAmount || 0);
      if (o.paymentMethod === 'split' && o.paymentSplit) {
        // A split sale's own components already sum to the order total, so
        // apportion the (possibly refund-reduced) net amount proportionally
        // across each method rather than crediting the whole net to 'split'.
        const splitSum = o.paymentSplit.reduce((s, e) => s + e.amount, 0) || 1;
        for (const entry of o.paymentSplit) {
          const share = net * (entry.amount / splitSum);
          acc[entry.method] = (acc[entry.method] ?? 0) + share;
        }
      } else if (o.paymentMethod) {
        acc[o.paymentMethod] = (acc[o.paymentMethod] ?? 0) + net;
      }
      return acc;
    }, {} as Record<string, number>);

  useEffect(() => {
    const stored = window.localStorage.getItem(zReportStorageKey);
    setZReportPrinted(stored ? parseInt(stored, 10) || 0 : 0);
  }, [zReportStorageKey]);

  const printZReport = () => {
    if (zReportPrinted >= zReportPrintLimit) return;
    const next = zReportPrinted + 1;
    setZReportPrinted(next);
    window.localStorage.setItem(zReportStorageKey, String(next));
    window.print();
  };

  const addItem = (item: typeof posMenu[number]) => {
    if (!item.available) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, taxRate: item.taxRate }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const processPayment = async () => {
    const effectivePaymentMethod: PayMethod | 'split' = isSplitPayment ? 'split' : payMethod;
    const effectivePaymentSplit: PaymentSplitEntry[] | null = isSplitPayment ? splitEntries.filter(e => e.amount > 0) : null;

    // If it is an accepted tablet order, update its payment and keep/ensure status in useSharedOrders
    const existingTabletOrder = orders.find(o => o.source === 'tablet' && o.tableLabel === 'Table ' + selectedTable && o.status === 'pending');
    if (existingTabletOrder) {
      setLastOrderNumber(existingTabletOrder.orderNumber);
      await updateOrder(existingTabletOrder.id, o => ({
        ...o,
        payment: 'paid',
        paymentMethod: effectivePaymentMethod,
        paymentSplit: effectivePaymentSplit,
        cashierId: profile?.id ?? null,
        status: 'preparing',
        updatedAt: new Date().toISOString()
      }));
    } else {
      // Create a brand new POS order
      const orderId = 'order-' + Date.now();
      const newOrder: SharedOrder = {
        id: orderId,
        orderNumber: '', // assigned atomically by addOrder() via the DB — see ordersStore.ts
        tableLabel: selectedTable ? 'Table ' + selectedTable : (orderType === 'takeaway' ? 'Takeaway' : 'Delivery'),
        type: orderType,
        status: 'preparing', // Send to KDS immediately
        payment: 'paid',
        paymentMethod: effectivePaymentMethod,
        paymentSplit: effectivePaymentSplit,
        cashierId: profile?.id ?? null,
        refundAmount: 0,
        items: cart.map(c => ({
          id: c.id,
          name: c.name,
          price: c.price,
          qty: c.qty
        })),
        subtotal,
        tax,
        total,
        source: 'pos',
        customerPhone: customerPhone.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const orderNumber = await addOrder(newOrder);
      setLastOrderNumber(orderNumber ?? null);
    }

    setCustomerPhone('');
    setIsSplitPayment(false);
    setSplitEntries([{ method: 'cash', amount: 0 }, { method: 'card', amount: 0 }]);
    setPaidSuccess(true);
    setIsPaid(true);
    setOrderCount(c => c + 1);
    setSessionSales(s => s + total);
    // Print immediately on every sale — the receipt used to only appear if the cashier
    // remembered to click "Receipt" then "Print" afterwards, two extra steps that were
    // easy to skip under real service pressure and left a customer without a paper
    // trail. The receipt view opens and triggers window.print() automatically right
    // after the payment-success confirmation closes, no manual step required.
    // (window.print() still opens the browser's own print dialog/preview — that's a
    // platform limitation, not a choice here; on a real POS this is typically hidden
    // by kiosk-mode print settings on the till itself, which route straight to the
    // receipt printer with no dialog shown.)
    setTimeout(() => {
      setShowPayment(false);
      setPaidSuccess(false);
      setShowReceipt(true);
      setTimeout(() => window.print(), 300);
    }, 1200);
  };

  const acceptTabletOrder = (id: string) => {
    void updateOrder(id, o => ({ ...o, status: 'preparing' }));
    const order = orders.find(o => o.id === id);
    if (order) {
      setCart(order.items.map((it, i) => ({ id: it.id || `to-${i}`, name: it.name, price: it.price, qty: it.qty, taxRate: menuItems.find(m => m.id === it.id)?.taxRate ?? 0 })));
      const num = order.tableLabel.replace('Table ', '');
      setSelectedTable(num);
      setShowTabletOrders(false);
    }
  };

  const rejectTabletOrder = (id: string) => {
    void updateOrder(id, o => ({ ...o, status: 'cancelled' }));
  };

  const startNewOrder = () => {
    setCart([]); setSelectedTable(null); setIsPaid(false); setCardDetail(''); setCashGiven('');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      <header className="px-4 sm:px-6 py-3 flex-shrink-0" style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/app/admin')} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.textMuted }}><ArrowLeft size={16} /></button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: theme.primary + '16' }}>
              <Monitor size={16} style={{ color: theme.primary }} />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2" style={{ color: theme.text }}>
                {t('pos.title')}
                {!isOnline && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                    Offline Mode
                  </span>
                )}
              </div>
              <div className="text-[11px]" style={{ color: theme.textMuted }}>Cloud checkout • live floor control</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs rounded-full px-3 py-1.5" style={{ color: theme.textMuted, background: theme.bg, border: `1px solid ${theme.border}` }}>
              <Clock size={12} /><span>{Math.floor((Date.now() - sessionStart.getTime()) / 60000)}{t('pos.minutes')}</span><span>· {orderCount} {t('common.orders')}</span><span>· {currencySymbol}{sessionSales.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowTabletOrders(true)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full relative" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
              <Tablet size={12} /> {t('pos.tabletOrders')}
              {pendingTabletOrders.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#ef4444' }}>{pendingTabletOrders.length}</span>}
            </button>
            <button onClick={() => setPosSoundOn(p => !p)} title={posSoundOn ? 'Mute new-order sound' : 'Unmute new-order sound'}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
              {posSoundOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
            </button>
            <button onClick={() => { setZReportMode('x'); setShowZReport(true); }} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
              <FileText size={12} /> X-Report
            </button>
            <button onClick={() => { setZReportMode('z'); setShowZReport(true); }} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
              <FileText size={12} /> {t('pos.zReport')}
            </button>
            <span className="text-xs font-semibold px-2.5 py-1.5 rounded-full" style={{ color: theme.primary, background: theme.primary + '12' }}>{profile?.full_name ?? 'Cashier'}</span>
            <button onClick={() => lockPos()} className="text-xs px-2.5 py-1.5 rounded-full" style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{t('pos.lock')}</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 pt-3 pb-2 flex items-center gap-2 flex-wrap flex-shrink-0">
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
            <div className="px-4 sm:px-5 pb-2 flex items-center gap-2 flex-wrap">
              <input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="Table name"
                className="px-3 py-1.5 rounded-lg text-xs outline-none w-full sm:w-40"
                style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.primary}` }} />
              <button onClick={() => { setTables(prev => prev.map(t => t.id === editingTable ? { ...t, name: tableName || t.name } : t)); setEditingTable(null); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: theme.primary }}>Save</button>
              <button onClick={() => setEditingTable(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: theme.surface, color: theme.textMuted, border: `1px solid ${theme.border}` }}>Cancel</button>
            </div>
          )}

          <div className="px-4 sm:px-5 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={{ background: cat === c ? theme.primary : theme.surface, color: cat === c ? '#fff' : theme.textMuted, border: `1px solid ${cat === c ? theme.primary : theme.border}` }}>{c}</button>
            ))}
          </div>

          <div className="px-4 sm:px-5 pb-3 flex-shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                className="w-full pl-8 pr-4 py-2.5 rounded-2xl text-sm outline-none"
                style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />
            </div>
          </div>

          <div className="flex-1 overflow-auto px-4 sm:px-5 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(item => {
                const inCart = cart.find(c => c.id === item.id);
                return (
                  <motion.button key={item.id} whileTap={{ scale: 0.96 }} onClick={() => addItem(item)} disabled={!item.available}
                    className="p-3 rounded-2xl text-left transition-all relative disabled:opacity-40 shadow-sm flex gap-3 items-center"
                    style={{ background: inCart ? theme.primary + '15' : theme.surface, border: `1px solid ${inCart ? theme.primary : theme.border}` }}>
                    {item.image && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold leading-tight truncate" style={{ color: theme.text }}>{item.name}</div>
                      <div className="text-[10px]" style={{ color: theme.textMuted }}>{item.calories} kcal</div>
                      <div className="text-sm font-extrabold mt-1" style={{ color: theme.primary }}>{currencySymbol}{item.price}</div>
                    </div>
                    {!item.available && <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.4)' }}><span className="text-[10px] font-bold text-white">SOLD OUT</span></div>}
                    {inCart && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: theme.primary }}>{inCart.qty}</div>}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[22rem] xl:w-[24rem] flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l" style={{ background: theme.surface, borderColor: theme.border }}>
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <span className="text-sm font-extrabold" style={{ color: theme.text }}>Order {selectedTable ? `· ${tables.find(t => t.id === selectedTable)?.name ?? `T${selectedTable}`}` : ''}</span>
            {cart.length > 0 && <button onClick={startNewOrder} className="text-xs" style={{ color: '#ef4444' }}>Clear</button>}
          </div>
          <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12" style={{ color: theme.textMuted }}>
                <Hash size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tap items to add to order</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="flex items-center gap-2 py-2 px-2 rounded-xl" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: theme.text }}>{item.name}</div>
                  <div className="text-xs" style={{ color: theme.primary }}>{currencySymbol}{(item.price * item.qty).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: theme.bg, color: theme.textMuted }}><Minus size={10} /></button>
                  <span className="text-xs font-bold w-4 text-center" style={{ color: theme.text }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: theme.bg, color: theme.textMuted }}><Plus size={10} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 sm:p-4 space-y-2 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
            <div className="rounded-2xl p-3" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
              <div className="flex justify-between text-xs" style={{ color: theme.textMuted }}><span>Subtotal</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs mt-1" style={{ color: theme.textMuted }}><span>Tax</span><span>{currencySymbol}{tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-extrabold text-base mt-2" style={{ color: theme.text }}>
                <span>Total</span><span style={{ color: theme.primary }}>{currencySymbol}{total.toFixed(2)}</span>
              </div>
            </div>
            {isPaid && (
              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#22c55e15', border: '1px solid #22c55e30' }}>
                <Check size={14} style={{ color: '#22c55e' }} />
                <span className="text-xs font-bold" style={{ color: '#22c55e' }}>Payment received - receipt ready</span>
              </div>
            )}
            <button onClick={() => cart.length > 0 && setShowPayment(true)} disabled={cart.length === 0 || isPaid}
              className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all disabled:opacity-40" style={{ background: theme.primary }}>
              {isPaid ? 'Paid' : `Charge ${currencySymbol}${total.toFixed(2)}`}
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
            {isPaid && <button onClick={startNewOrder} className="w-full py-2 rounded-2xl text-xs font-bold text-white" style={{ background: '#22c55e' }}>New Order</button>}
          </div>
        </div>
      </div>

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
                  <p className="text-sm" style={{ color: theme.textMuted }}>{currencySymbol}{total.toFixed(2)} charged via {payMethod}</p>
                  <p className="text-xs mt-2" style={{ color: theme.primary }}>Receipt is now printable</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-extrabold" style={{ color: theme.text }}>Payment Required</h2>
                    <button onClick={() => setShowPayment(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
                  </div>
                  <div className="text-center mb-5">
                    <div className="text-4xl font-extrabold" style={{ color: theme.primary }}>{currencySymbol}{total.toFixed(2)}</div>
                    <div className="text-xs mt-1" style={{ color: theme.textMuted }}>{cart.length} items · Tax included</div>
                    <div className="text-xs mt-1" style={{ color: '#eab308' }}>Receipt locked until payment confirmed</div>
                  </div>
                  <button onClick={() => setIsSplitPayment(p => !p)}
                    className="w-full mb-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                    style={{ background: isSplitPayment ? theme.primary : theme.bg, color: isSplitPayment ? '#fff' : theme.textMuted, border: `1px solid ${isSplitPayment ? theme.primary : theme.border}` }}>
                    <Split size={14} /> {isSplitPayment ? 'Split payment enabled' : 'Split this payment across methods'}
                  </button>
                  {isSplitPayment ? (
                    <SplitPaymentForm theme={theme} total={total} currencySymbol={currencySymbol} entries={splitEntries} setEntries={setSplitEntries} />
                  ) : (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                    {([ { key: 'cash', label: 'Cash', icon: Banknote }, { key: 'card', label: 'Card', icon: CreditCard },
                       { key: 'tap', label: 'Tap to Pay', icon: Smartphone }, { key: 'gift_card', label: 'Gift Card', icon: Gift },
                       { key: 'mobile_money', label: 'Mobile Money', icon: CreditCard }, { key: 'voucher', label: 'Voucher', icon: Gift },
                       { key: 'credit_note', label: 'Credit Note', icon: FileText },
                     ] as { key: PayMethod; label: string; icon: typeof Banknote }[]).map(m => (
                      <button key={m.key} onClick={() => setPayMethod(m.key)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: payMethod === m.key ? (m.key === 'mobile_money' ? '#f5a623' : theme.primary) : theme.bg,
                          color: payMethod === m.key ? '#fff' : theme.textMuted,
                          border: `1px solid ${payMethod === m.key ? (m.key === 'mobile_money' ? '#f5a623' : theme.primary) : theme.border}`
                        }}>
                        <m.icon size={18} />{m.label}
                      </button>
                    ))}
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Customer phone (optional — for WhatsApp confirmation)</label>
                    <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+234 XXX XXX XXXX"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                  </div>
                  {payMethod === 'mobile_money' && !isSplitPayment && (
                    <div className="mb-4 p-3.5 rounded-xl border space-y-2" style={{ background: '#f5a62310', borderColor: '#f5a62330' }}>
                      <div className="text-xs font-bold" style={{ color: '#f5a623' }}>Mobile Money</div>
                      <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                        Confirm the customer paid via their mobile money app (M-Pesa, MTN MoMo, etc.) on their own
                        device, then log their number below for the receipt. This records the payment — it does not
                        send a live payment request.
                      </p>
                      <input value={cardDetail} onChange={e => setCardDetail(e.target.value)} placeholder="+234 XXX XXX XXXX"
                        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid #f5a62350` }} />
                    </div>
                  )}
                  {(payMethod === 'card' || payMethod === 'tap' || payMethod === 'gift_card') && !isSplitPayment && (
                    <div className="mb-4">
                      <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>
                        {payMethod === 'gift_card' ? 'Gift Card Number / Approval Code' : 'Approval Code or Last 4 Digits'}
                      </label>
                      <input value={cardDetail} onChange={e => setCardDetail(e.target.value)} placeholder={payMethod === 'gift_card' ? 'GC-XXXX' : 'A1234 / 4242'}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                    </div>
                  )}
                  {payMethod === 'cash' && !isSplitPayment && (
                    <div className="mb-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: theme.textMuted }}>Cash Received</label>
                        <input type="number" min="0" step="0.01" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0.00"
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {[total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20, Math.ceil(total / 50) * 50].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                          <button key={v} onClick={() => setCashGiven(v.toFixed(2))}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>{currencySymbol}{v.toFixed(2)}</button>
                        ))}
                      </div>
                      {cashGiven && !isCashAmountValid && (
                        <div className="p-3 rounded-xl text-center text-sm font-semibold" style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }}>
                          {Number.isNaN(cashGivenAmount) ? 'Enter a valid amount' : `Amount is short by ${currencySymbol}${(total - cashGivenAmount).toFixed(2)}`}
                        </div>
                      )}
                      {cashGiven && isCashAmountValid && (
                        <div className="p-3 rounded-xl text-center" style={{ background: '#22c55e15', border: '1px solid #22c55e30' }}>
                          <div className="text-xs font-semibold" style={{ color: theme.textMuted }}>CHANGE TO GIVE</div>
                          <div className="text-3xl font-extrabold" style={{ color: '#22c55e' }}>{currencySymbol}{change.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => void processPayment()}
                    disabled={isSplitPayment ? !isSplitAmountValid : (payMethod === 'cash' && !isCashAmountValid)}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                    style={{ background: payMethod === 'mobile_money' && !isSplitPayment ? '#f5a623' : theme.primary }}>
                    {isSplitPayment
                      ? (isSplitAmountValid ? 'Confirm Split Payment' : `Split must total ${currencySymbol}${total.toFixed(2)}`)
                      : `Confirm ${payMethod === 'cash' ? 'Cash' : payMethod === 'card' ? 'Card' : payMethod === 'tap' ? 'Tap' : payMethod === 'mobile_money' ? 'Mobile Money' : payMethod === 'voucher' ? 'Voucher' : payMethod === 'credit_note' ? 'Credit Note' : 'Gift Card'} Payment`}
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
              className="w-80 rounded-2xl p-6 print-receipt-container" style={{ background: '#fff', color: '#000' }} onClick={e => e.stopPropagation()}>
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  .print-receipt-container, .print-receipt-container * {
                    visibility: visible !important;
                  }
                  .print-receipt-container {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 80mm !important;
                    margin: 0 !important;
                    padding: 10px !important;
                    border: none !important;
                    box-shadow: none !important;
                  }
                }
              `}} />
              <div className="text-center mb-4">
                <div className="text-lg font-extrabold">{brandName}</div>
                <div className="text-xs text-gray-500">Powered by Nutro</div>
                <div className="text-[10px] text-gray-500">{brandAddress} - {brandPhone}</div>
              </div>
              <div className="border-t border-b border-dashed border-gray-300 py-3 mb-3 text-xs">
                <div className="flex justify-between mb-1"><span>Table: {tables.find(t => t.id === selectedTable)?.name ?? (selectedTable ? `T${selectedTable}` : '-')}</span><span>Cashier: {profile?.full_name ?? 'Staff'}</span></div>
                <div className="flex justify-between"><span>Date: {new Date().toLocaleString()}</span><span>Order: {lastOrderNumber ?? '—'}</span></div>
                <div className="flex justify-between mt-1"><span>Payment: {payMethod.toUpperCase()}</span>{cardDetail && <span>Ref: {cardDetail}</span>}</div>
              </div>
              <div className="space-y-1 mb-3 text-xs">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.qty}x {item.name}</span>
                    <span>{currencySymbol}{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-300 pt-3 text-xs space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{currencySymbol}{tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{currencySymbol}{total.toFixed(2)}</span></div>
                {payMethod === 'cash' && cashGiven && <div className="flex justify-between"><span>Cash</span><span>{currencySymbol}{cashGivenAmount.toFixed(2)}</span></div>}
                {payMethod === 'cash' && <div className="flex justify-between"><span>Change</span><span>{currencySymbol}{change.toFixed(2)}</span></div>}
              </div>
              <div className="text-center mt-4 text-[10px] text-gray-500">
                <p>Thank you for dining with us!</p>
                <p className="mt-1">Instagram: {brandInstagram.replace('https://', '')}</p>
                <p>TikTok: {brandTiktok.replace('https://', '')}</p>
              </div>
              <div className="flex gap-2 mt-4 print:hidden">
                <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5" style={{ background: theme.primary }}>
                  <Printer size={14} /> Print 80mm
                </button>
                <button onClick={() => setShowReceipt(false)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: '#f5f5f5', color: '#666' }}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* X-Report / Z-Report modal — X is a non-destructive sales snapshot the
          cashier can pull any number of times during the day; Z is the official
          end-of-day print, capped at the admin-configured daily limit
          (Settings > POS & Security) to prevent thermal-roll waste. Both show the
          same real numbers: every order for this branch placed today, not just
          this cashier's own session. */}
      <AnimatePresence>
        {showZReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowZReport(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-96 rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: theme.text }}>
                  <FileText size={18} /> {zReportMode === 'z' ? 'Z-Report — End of Day' : 'X-Report — Sales Snapshot'}
                </h2>
                <button onClick={() => setShowZReport(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Orders Today (branch)</span><span className="font-bold" style={{ color: theme.text }}>{todaysOrderCount}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Net Sales Today (branch)</span><span className="font-bold" style={{ color: theme.primary }}>{currencySymbol}{todaysNetSales.toFixed(2)}</span>
                </div>
                {Object.entries(todaysByMethod).map(([method, amount]) => (
                  <div key={method} className="flex justify-between px-3 text-xs" style={{ color: theme.textMuted }}>
                    <span className="capitalize">{method.replace('_', ' ')}</span><span>{currencySymbol}{amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                  <span style={{ color: theme.textMuted }}>Printed By</span><span className="font-bold" style={{ color: theme.text }}>{profile?.full_name ?? 'Staff'}</span>
                </div>
              </div>
              {zReportMode === 'z' && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: '#eab30810', border: '1px solid #eab30830' }}>
                  <p className="text-xs" style={{ color: theme.textMuted }}>Prints today: {zReportPrinted}/{zReportPrintLimit}. Set by your admin in Settings &gt; POS &amp; Security to control thermal-roll usage.</p>
                </div>
              )}
              <button onClick={() => zReportMode === 'z' ? printZReport() : window.print()}
                disabled={zReportMode === 'z' && zReportPrinted >= zReportPrintLimit}
                className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: theme.primary }}>
                <Printer size={16} />
                {zReportMode === 'x'
                  ? 'Print X-Report'
                  : zReportPrinted >= zReportPrintLimit ? 'Print Limit Reached' : `Print Z-Report (${zReportPrinted}/${zReportPrintLimit})`}
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
                    <div className="space-y-2 mb-3">
                      {order.items.map((it, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs" style={{ color: theme.textMuted }}>
                          {it.imageUrl ? (
                            <img src={it.imageUrl} alt={it.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" style={{ border: `1px solid ${theme.border}` }} />
                          ) : (
                            <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                              <UtensilsCrossed size={14} style={{ color: theme.textMuted, opacity: 0.5 }} />
                            </div>
                          )}
                          <span className="flex-1">{it.qty}x {it.name}</span>
                          <span>{currencySymbol}{(it.price * it.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-bold mb-3" style={{ color: theme.text }}>
                      <span>Total</span><span style={{ color: theme.primary }}>{currencySymbol}{order.total.toFixed(2)}</span>
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
          <ManagerPinModal theme={theme} branchId={orgContext?.branch_id ?? null}
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

const SPLIT_METHOD_LABELS: Record<PaymentSplitEntry['method'], string> = {
  cash: 'Cash', card: 'Card', tap: 'Tap', gift_card: 'Gift Card',
  mobile_money: 'Mobile Money', voucher: 'Voucher', credit_note: 'Credit Note',
};

function SplitPaymentForm({ theme, total, currencySymbol, entries, setEntries }: {
  theme: ReturnType<typeof useTheme>['theme'];
  total: number;
  currencySymbol: string;
  entries: PaymentSplitEntry[];
  setEntries: React.Dispatch<React.SetStateAction<PaymentSplitEntry[]>>;
}) {
  const splitTotal = entries.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const remaining = total - splitTotal;

  const updateEntry = (index: number, patch: Partial<PaymentSplitEntry>) => {
    setEntries(prev => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };
  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };
  const addEntry = () => {
    setEntries(prev => [...prev, { method: 'cash', amount: Math.max(0, remaining) }]);
  };

  return (
    <div className="mb-4 space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <select value={entry.method} onChange={e => updateEntry(i, { method: e.target.value as PaymentSplitEntry['method'] })}
            className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold outline-none" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
            {Object.entries(SPLIT_METHOD_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <input type="number" min="0" step="0.01" value={entry.amount || ''} onChange={e => updateEntry(i, { amount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00" className="w-28 px-3 py-2.5 rounded-xl text-xs font-bold outline-none text-right"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
          {entries.length > 2 && (
            <button onClick={() => removeEntry(i)} style={{ color: theme.textMuted }}><X size={16} /></button>
          )}
        </div>
      ))}
      <button onClick={addEntry} className="text-xs font-bold" style={{ color: theme.primary }}>+ Add another method</button>
      <div className="flex justify-between p-3 rounded-xl text-xs font-bold" style={{
        background: Math.abs(remaining) < 0.01 ? '#22c55e15' : '#ef444415',
        color: Math.abs(remaining) < 0.01 ? '#22c55e' : '#ef4444',
      }}>
        <span>{Math.abs(remaining) < 0.01 ? 'Fully covered' : remaining > 0 ? 'Remaining' : 'Over by'}</span>
        <span>{currencySymbol}{Math.abs(remaining).toFixed(2)}</span>
      </div>
    </div>
  );
}


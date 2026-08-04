import { useCallback, useEffect, useState } from 'react';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'paid';
export type PaymentStatus = 'unpaid' | 'paid';

export interface SharedOrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface SharedOrder {
  id: string;
  orderNumber: string;
  tableLabel: string;
  type: OrderType;
  status: OrderStatus;
  payment: PaymentStatus;
  items: SharedOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  source: 'pos' | 'tablet';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'nutro:shared-orders';
const ORDERS_EVENT = 'nutro:orders-updated';

const seedOrders: SharedOrder[] = [
  {
    id: 'order-1001',
    orderNumber: '#1042',
    tableLabel: 'Table 4',
    type: 'dine_in',
    status: 'preparing',
    payment: 'paid',
    items: [
      { id: '1', name: 'Wagyu Beef Burger', price: 24, qty: 2 },
      { id: '2', name: 'Truffle Fries', price: 9, qty: 1 },
    ],
    subtotal: 57,
    tax: 2.85,
    total: 59.85,
    source: 'tablet',
    note: 'No onion on burger',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'order-1002',
    orderNumber: '#1043',
    tableLabel: 'Takeaway',
    type: 'takeaway',
    status: 'pending',
    payment: 'paid',
    items: [
      { id: '6', name: 'Fresh Lemonade', price: 6, qty: 2 },
      { id: '3', name: 'Vegan Buddha Bowl', price: 18, qty: 1 },
    ],
    subtotal: 30,
    tax: 1.5,
    total: 31.5,
    source: 'pos',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
  },
];

function readStoredOrders(): SharedOrder[] {
  if (typeof window === 'undefined') return seedOrders;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedOrders;
    const parsed = JSON.parse(raw) as SharedOrder[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedOrders;
  } catch {
    return seedOrders;
  }
}

function persistOrders(orders: SharedOrder[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent(ORDERS_EVENT, { detail: orders }));
}

export function useSharedOrders() {
  const [orders, setOrdersState] = useState<SharedOrder[]>(() => readStoredOrders());

  useEffect(() => {
    const syncOrders = () => setOrdersState(readStoredOrders());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) syncOrders();
    };

    window.addEventListener(ORDERS_EVENT, syncOrders as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(ORDERS_EVENT, syncOrders as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setOrders = useCallback((valueOrUpdater: SharedOrder[] | ((prev: SharedOrder[]) => SharedOrder[])) => {
    setOrdersState(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      persistOrders(next);
      return next;
    });
  }, []);

  const addOrder = useCallback((order: SharedOrder) => {
    setOrdersState(prev => {
      const next = [order, ...prev];
      persistOrders(next);
      return next;
    });
  }, []);

  const updateOrder = useCallback((id: string, updater: (order: SharedOrder) => SharedOrder) => {
    setOrdersState(prev => {
      const next = prev.map(order => (order.id === id ? updater(order) : order));
      persistOrders(next);
      return next;
    });
  }, []);

  return { orders, setOrders, addOrder, updateOrder };
}

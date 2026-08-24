import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'refunded' | 'cancelled';
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
  paymentMethod?: 'cash' | 'card' | 'tap' | 'gift_card' | 'flutterwave' | null;
  cashierId?: string | null;
  refundAmount: number;
  refundedAt?: string | null;
  refundReason?: string | null;
  items: SharedOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  source: 'pos' | 'tablet';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  table_label: string | null;
  order_type: OrderType;
  status: OrderStatus;
  payment_status: string;
  payment_method: string | null;
  cashier_id: string | null;
  refund_amount: number;
  refunded_at: string | null;
  refund_reason: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  source: 'pos' | 'tablet';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
}

function genId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function rowToShared(row: OrderRow, items: OrderItemRow[]): SharedOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    tableLabel: row.table_label ?? '—',
    type: row.order_type,
    status: row.status,
    payment: row.payment_status === 'paid' ? 'paid' : 'unpaid',
    paymentMethod: (['cash', 'card', 'tap', 'gift_card', 'flutterwave'] as const).includes(row.payment_method as any) ? (row.payment_method as SharedOrder['paymentMethod']) : null,
    cashierId: row.cashier_id,
    refundAmount: Number(row.refund_amount ?? 0),
    refundedAt: row.refunded_at,
    refundReason: row.refund_reason,
    items: items.map((it) => ({ id: it.menu_item_id ?? it.id, name: it.name, price: Number(it.unit_price), qty: it.quantity })),
    subtotal: Number(row.subtotal),
    tax: Number(row.tax_amount),
    total: Number(row.total_amount),
    source: row.source,
    note: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Orders for a branch, backed by real Supabase tables (orders / order_items) instead
 * of localStorage. Pass `null` while the branch hasn't been resolved yet.
 *
 * The customer tablet has no Supabase Auth session, so addOrder() generates its own
 * ids client-side and never needs to read a row back — this lets it work under a
 * write-only anon RLS policy (see migration 20260823040000).
 */
export function useSharedOrders(branchId: string | null) {
  const [orders, setOrders] = useState<SharedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!branchId) { setOrders([]); setLoading(false); return; }
    setLoading(true);
    const { data: orderRows, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (ordersError) { setError(ordersError.message); setLoading(false); return; }

    const rows = (orderRows ?? []) as OrderRow[];
    const withItems = await Promise.all(rows.map(async (row) => {
      const { data: itemRows } = await supabase.from('order_items').select('*').eq('order_id', row.id);
      return rowToShared(row, (itemRows ?? []) as OrderItemRow[]);
    }));

    setOrders(withItems);
    setError(null);
    setLoading(false);
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const addOrder = useCallback(async (order: SharedOrder) => {
    if (!branchId) return;
    const orderId = genId();

    const { error: insertError } = await supabase.from('orders').insert({
      id: orderId,
      branch_id: branchId,
      order_number: order.orderNumber,
      table_label: order.tableLabel,
      order_type: order.type,
      status: order.status,
      payment_status: order.payment,
      payment_method: order.paymentMethod ?? null,
      cashier_id: order.cashierId ?? null,
      subtotal: order.subtotal,
      tax_amount: order.tax,
      discount_amount: 0,
      total_amount: order.total,
      source: order.source,
      notes: order.note ?? null,
    } as never);
    if (insertError) { setError(insertError.message); return; }

    for (const item of order.items) {
      await supabase.from('order_items').insert({
        id: genId(),
        order_id: orderId,
        menu_item_id: item.id,
        name: item.name,
        unit_price: item.price,
        quantity: item.qty,
        subtotal: item.price * item.qty,
      } as never);
    }

    setOrders((prev) => [{ ...order, id: orderId }, ...prev]);
  }, [branchId]);

  const updateOrder = useCallback(async (id: string, updater: (order: SharedOrder) => SharedOrder) => {
    const current = orders.find((o) => o.id === id);
    if (!current) return;
    const next = updater(current);

    const { error: updateError } = await supabase.from('orders').update({
      status: next.status,
      payment_status: next.payment,
      payment_method: next.paymentMethod ?? null,
      updated_at: new Date().toISOString(),
    } as never).eq('id', id);
    if (updateError) { setError(updateError.message); return; }

    setOrders((prev) => prev.map((o) => (o.id === id ? next : o)));
  }, [orders]);

  const refundOrder = useCallback(async (id: string, amount: number, reason: string) => {
    const { data, error: rpcError } = await supabase.rpc('refund_order', {
      p_order_id: id,
      p_amount: amount,
      p_reason: reason,
    });
    if (rpcError || !data) {
      setError(rpcError?.message ?? 'Refund failed — check your permissions and the amount.');
      return false;
    }
    await load();
    return true;
  }, [load]);

  return { orders, loading, error, addOrder, updateOrder, refundOrder, refresh: load };
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, AlertTriangle, Check, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/contexts/LocaleContext';
import { useSharedOrders } from '@/lib/ordersStore';
import { useOrgContext } from '@/hooks/useOrgContext';

interface KdsTicket {
  id: string;
  orderNum: string;
  tableLabel: string;
  type: 'dine_in' | 'takeaway' | 'delivery';
  status: 'new' | 'preparing' | 'ready' | 'served';
  items: { name: string; qty: number; mods: string[]; note?: string }[];
  allergyAlert?: string;
  createdAt: Date;
  startedAt?: Date;
}

function getElapsed(from: Date): number {
  return Math.floor((Date.now() - from.getTime()) / 60000);
}

function TimerBadge({ minutes }: { minutes: number }) {
  const color = minutes < 10 ? '#22c55e' : minutes < 15 ? '#eab308' : '#ef4444';
  return (
    <div className="flex items-center gap-1 text-sm font-extrabold" style={{ color }}>
      <Clock size={14} />
      {minutes}m
    </div>
  );
}

const COLUMNS: { key: KdsTicket['status']; label: string; color: string }[] = [
  { key: 'new', label: 'New Orders', color: '#eab308' },
  { key: 'preparing', label: 'Preparing', color: '#3b82f6' },
  { key: 'ready', label: 'Ready to Serve', color: '#22c55e' },
];

export default function KdsView() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { orgContext } = useOrgContext();
  const { orders, updateOrder } = useSharedOrders(orgContext?.branch_id ?? null);
  const [, setTick] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const playSound = () => {
    if (soundOn && audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    }
  };

  void playSound;

  // Map shared orders into KDS tickets dynamically, excluding pending tablet orders (validated at POS first)
  const tickets: KdsTicket[] = orders
    .filter(o => o.status !== 'pending')
    .map(o => {
    let kdsStatus: KdsTicket['status'] = 'new';
    if (o.status === 'preparing') kdsStatus = 'preparing';
    else if (o.status === 'ready') kdsStatus = 'ready';
    else if (o.status === 'served' || o.status === 'paid') kdsStatus = 'served';

    return {
      id: o.id,
      orderNum: o.orderNumber,
      tableLabel: o.tableLabel,
      type: o.type,
      status: kdsStatus,
      items: o.items.map(it => ({
        name: it.name,
        qty: it.qty,
        mods: [] as string[],
        note: o.note?.includes('ALLERGY') ? undefined : o.note,
      })),
      allergyAlert: o.note?.includes('ALLERGY') ? o.note : undefined,
      createdAt: new Date(o.createdAt),
      startedAt: o.createdAt !== o.updatedAt ? new Date(o.updatedAt) : undefined,
    };
  });

  const advanceTicket = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const nextStatus = order.status === 'pending' ? 'preparing' : 'ready';
    void updateOrder(id, o => ({
      ...o,
      status: nextStatus as any,
      updatedAt: new Date().toISOString()
    }));
  };

  const bumpTicket = (id: string) => {
    void updateOrder(id, o => ({
      ...o,
      status: 'served',
      updatedAt: new Date().toISOString()
    }));
  };

  const activeTickets = tickets.filter((t) => t.status !== 'served');
  const allergyTickets = activeTickets.filter((t) => t.allergyAlert);

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: '#fff' }}>
      <header
        className="px-4 sm:px-6 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)', borderBottom: '1px solid #222' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/admin')}
            className="p-1.5 rounded-lg hover:opacity-70 text-gray-400"
          >
            <ArrowLeft size={16} />
          </button>
          <ChefHat size={18} style={{ color: '#10B981' }} />
          <span className="text-sm font-bold text-white">{t('kds.title')}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: '#10B98120', color: '#10B981' }}
          >
            {t('kds.live')}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">{activeTickets.length} active tickets</span>
          {allergyTickets.length > 0 && (
            <span
              className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full animate-pulse"
              style={{ background: '#ef444420', color: '#ef4444' }}
            >
              <AlertTriangle size={12} /> {allergyTickets.length} {t('kds.allergyAlert')}{allergyTickets.length > 1 ? 'S' : ''}
            </span>
          )}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all"
            style={{
              background: soundOn ? '#10B98120' : '#222',
              color: soundOn ? '#10B981' : '#666',
            }}
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />} {soundOn ? t('kds.soundOn') : t('kds.soundOff')}
          </button>
          <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTickets = activeTickets.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="flex flex-col gap-3 rounded-3xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-bold text-white">{col.label}</span>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: col.color + '20', color: col.color }}
                >
                  {colTickets.length}
                </span>
              </div>
              <AnimatePresence>
                {colTickets.map((ticket) => {
                  const elapsed = getElapsed(ticket.createdAt);
                  const urgency = elapsed < 10 ? 'green' : elapsed < 15 ? 'yellow' : 'red';
                  const urgencyColor =
                    urgency === 'green' ? '#22c55e' : urgency === 'yellow' ? '#eab308' : '#ef4444';
                  const isAllergy = !!ticket.allergyAlert;
                  const isReady = ticket.status === 'ready';

                  return (
                    <motion.div
                      key={ticket.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="rounded-2xl overflow-hidden flex flex-col shadow-lg"
                      style={{
                        background: '#111827',
                        border: isAllergy ? '2px solid #ef4444' : '1px solid #222',
                        borderLeft: '4px solid ' + (isReady ? '#22c55e' : urgencyColor),
                        boxShadow: isAllergy
                          ? '0 0 24px rgba(239,68,68,0.4), 0 0 48px rgba(239,68,68,0.15)'
                          : isReady
                          ? '0 0 16px rgba(34,197,94,0.2)'
                          : 'none',
                      }}
                    >
                      {isAllergy && (
                        <motion.div
                          animate={{ opacity: [1, 0.7, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="px-4 py-2 flex items-center gap-2"
                          style={{ background: '#ef444430', borderBottom: '1px solid #ef444460' }}
                        >
                          <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                          <span
                            className="text-xs font-extrabold tracking-wide"
                            style={{ color: '#ef4444' }}
                          >
                            ALERT: {ticket.allergyAlert}
                          </span>
                        </motion.div>
                      )}

                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ borderBottom: '1px solid #1e1e1e' }}
                      >
                        <div>
                          <span className="font-extrabold text-base text-white">{ticket.orderNum}</span>
                          <span className="ml-2 text-xs text-gray-400">{ticket.tableLabel}</span>
                        </div>
                        <TimerBadge minutes={elapsed} />
                      </div>

                      <div className="flex-1 p-4 space-y-3">
                        {ticket.items.map((item, i) => (
                          <div key={i}>
                            <div className="flex items-start gap-2">
                              <span className="text-base font-extrabold text-white leading-none">
                                {item.qty}x
                              </span>
                              <div>
                                <div className="text-sm font-bold text-white">{item.name}</div>
                                {item.mods.map((mod) => (
                                  <div
                                    key={mod}
                                    className="text-xs mt-0.5 font-semibold"
                                    style={{ color: '#eab308' }}
                                  >
                                    -- {mod}
                                  </div>
                                ))}
                                {item.note && (
                                  <div
                                    className="text-xs mt-0.5 font-semibold"
                                    style={{ color: '#eab308' }}
                                  >
                                    Note: {item.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className="p-3 flex gap-2"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {ticket.status !== 'ready' && (
                          <button
                            onClick={() => advanceTicket(ticket.id)}
                            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                            style={{
                              background: ticket.status === 'new' ? '#3b82f620' : '#22c55e20',
                              color: ticket.status === 'new' ? '#3b82f6' : '#22c55e',
                              border:
                                '1px solid ' +
                                (ticket.status === 'new' ? '#3b82f640' : '#22c55e40'),
                            }}
                          >
                            {ticket.status === 'new' ? 'Start Preparing' : 'Mark Ready'}
                          </button>
                        )}
                        <button
                          onClick={() => bumpTicket(ticket.id)}
                          className="flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
                          style={{
                            background: isReady ? '#22c55e' : '#22c55e20',
                            color: isReady ? '#fff' : '#22c55e',
                            border: '1px solid #22c55e40',
                          }}
                        >
                          <Check size={15} /> {isReady ? 'BUMP' : 'Done'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {colTickets.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-600">No tickets</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeTickets.length === 0 && (
        <div className="text-center py-24">
          <ChefHat size={48} className="mx-auto mb-4 opacity-20" style={{ color: '#10B981' }} />
          <p className="text-gray-500 text-lg font-semibold">All caught up! No pending tickets.</p>
        </div>
      )}
    </div>
  );
}

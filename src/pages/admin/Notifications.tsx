import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, AlertTriangle, ShieldCheck, CreditCard, Check, X, ArrowRight, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlanInfo } from '@/hooks/useOrgContext';
import { Link } from 'react-router-dom';

interface SystemNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: string;
}

export default function AdminNotifications() {
  const { theme } = useTheme();
  const { isTrialActive, daysLeft, isTrialExpired, plan } = usePlanInfo();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Set up initial list of notifications
  const [notifs, setNotifs] = useState<SystemNotification[]>([
    { id: '1', title: 'New Order Received', desc: 'Order #1042 placed via Customer Tablet for Table 4', time: '5 mins ago', type: 'success', category: 'Orders' },
    { id: '2', title: 'Low Stock Alert', desc: 'Vegan Buddha Bowl has only 8 portions remaining in inventory', time: '1 hour ago', type: 'warning', category: 'Inventory' },
    { id: '3', title: 'System Backup Completed', desc: 'Secure database backup synced with Supabase Storage', time: '12 hours ago', type: 'info', category: 'Security' },
    { id: '4', title: 'New Staff Role Assigned', desc: 'Marcus Owusu role updated to Kitchen Staff', time: '1 day ago', type: 'info', category: 'Staff' },
  ]);

  // Insert a real warning if trial is active or expired
  const showTrialAlert = isTrialActive || isTrialExpired;

  const deleteNotif = (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    showToast('Notification removed');
  };

  const clearAll = () => {
    setNotifs([]);
    showToast('All notifications cleared');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
            <Bell size={20} style={{ color: theme.primary }} /> Notifications & Alerts
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Stay updated on orders, stock level updates, and subscription status</p>
        </div>
        {notifs.length > 0 && (
          <button onClick={clearAll} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: theme.surface, color: '#ef4444', border: `1px solid ${theme.border}` }}>
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {/* Free Trial Warning Alert */}
          {showTrialAlert && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl border flex flex-col sm:flex-row items-start gap-4 shadow-sm"
              style={{
                background: isTrialExpired ? '#ef444408' : '#f59e0b08',
                borderColor: isTrialExpired ? '#ef444430' : '#f59e0b30'
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isTrialExpired ? '#ef444415' : '#f59e0b15' }}>
                <AlertTriangle size={18} style={{ color: isTrialExpired ? '#ef4444' : '#f59e0b' }} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm" style={{ color: theme.text }}>
                    {isTrialExpired ? 'Free Trial Expired' : 'Free Trial Expiration Notice'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{
                      background: isTrialExpired ? '#ef444420' : '#f59e0b20',
                      color: isTrialExpired ? '#ef4444' : '#f59e0b'
                    }}>
                    Subscription
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                  {isTrialExpired ? (
                    `Your 7-day free trial on the ${plan.toUpperCase()} plan has ended. All active backoffice operations, POS transactions, and customer menus are suspended until a billing plan is selected.`
                  ) : (
                    `Your 7-day free trial has ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining. Upgrade to one of our premium plans to ensure zero interruptions to your tablet menus and POS terminal services.`
                  )}
                </p>
                <div className="pt-2">
                  <Link to="/app/admin/settings" className="inline-flex items-center gap-1.5 text-xs font-bold underline transition-colors hover:opacity-85"
                    style={{ color: theme.primary }}>
                    Choose a Plan to Upgrade <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {notifs.length === 0 && !showTrialAlert ? (
            <div className="p-12 text-center rounded-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <Bell size={36} className="mx-auto mb-3 opacity-20" style={{ color: theme.textMuted }} />
              <h3 className="font-bold text-sm mb-1" style={{ color: theme.text }}>All caught up!</h3>
              <p className="text-xs" style={{ color: theme.textMuted }}>You have no unread notifications at this time.</p>
            </div>
          ) : (
            notifs.map(n => {
              const iconColor = n.type === 'success' ? '#22c55e' : n.type === 'warning' ? '#f59e0b' : n.type === 'error' ? '#ef4444' : theme.primary;
              return (
                <motion.div key={n.id} layout className="p-4 rounded-2xl border flex items-start gap-4 transition-all"
                  style={{ background: theme.surface, borderColor: theme.border }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconColor + '10' }}>
                    {n.type === 'warning' ? (
                      <AlertTriangle size={15} style={{ color: iconColor }} />
                    ) : n.type === 'success' ? (
                      <Check size={15} style={{ color: iconColor }} />
                    ) : (
                      <Bell size={15} style={{ color: iconColor }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm truncate" style={{ color: theme.text }}>{n.title}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: theme.bg, color: theme.textMuted }}>{n.category}</span>
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: theme.textMuted }}>{n.desc}</p>
                    <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: theme.textMuted }}>
                      <Clock size={10} /><span>{n.time}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteNotif(n.id)} className="p-1 rounded-lg hover:opacity-75" style={{ color: theme.textMuted }}>
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl border space-y-4" style={{ background: theme.surface, borderColor: theme.border }}>
            <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: theme.text }}>
              <ShieldCheck size={16} style={{ color: theme.primary }} /> Subscription Summary
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ color: theme.textMuted }}>Active Plan</span>
                <span className="font-bold uppercase" style={{ color: theme.primary }}>{plan}</span>
              </div>
              <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ color: theme.textMuted }}>Status</span>
                <span className="font-bold capitalize" style={{ color: isTrialExpired ? '#ef4444' : '#22c55e' }}>
                  {isTrialExpired ? 'Expired' : 'Active Trial'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span style={{ color: theme.textMuted }}>Remaining Days</span>
                <span className="font-extrabold" style={{ color: daysLeft <= 3 ? '#ef4444' : theme.text }}>
                  {daysLeft} days
                </span>
              </div>
            </div>
            <Link to="/app/admin/settings" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: theme.primary }}>
              <CreditCard size={13} /> Manage Subscription
            </Link>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2" style={{ background: '#22c55e' }}>
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

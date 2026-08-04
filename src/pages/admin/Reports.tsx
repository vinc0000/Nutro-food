import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileBarChart, Calendar, Clock, Building2, User, Printer,
  TrendingUp, DollarSign, CreditCard, Banknote, RotateCcw, Package,
  X, ChevronDown
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import PlanGate from '@/components/ui/PlanGate';

interface StaffReport {
  name: string; role: string; shift: string;
  totalSales: number; cashCollected: number; cardTransactions: number;
  refunds: number; itemsSold: number; ordersCount: number;
}

const STAFF_REPORTS: StaffReport[] = [
  { name: 'Ahmed Al-Rashid', role: 'Branch Manager', shift: '08:00 - 16:00', totalSales: 2840, cashCollected: 1200, cardTransactions: 1640, refunds: 0, itemsSold: 87, ordersCount: 34 },
  { name: 'Layla Hassan', role: 'Cashier', shift: '10:00 - 18:00', totalSales: 1920, cashCollected: 800, cardTransactions: 1120, refunds: 45, itemsSold: 62, ordersCount: 28 },
  { name: 'Marcus Owusu', role: 'Kitchen Staff', shift: '06:00 - 14:00', totalSales: 0, cashCollected: 0, cardTransactions: 0, refunds: 0, itemsSold: 95, ordersCount: 0 },
  { name: 'Sophie Diallo', role: 'Cashier', shift: '14:00 - 22:00', totalSales: 3120, cashCollected: 1450, cardTransactions: 1670, refunds: 120, itemsSold: 78, ordersCount: 41 },
];

const BRANCHES = ['All Branches', 'Downtown Dubai', 'Marina Branch', 'Jumeirah Branch'];
const SHIFTS = ['All Shifts', 'Morning (06-14)', 'Evening (14-22)', 'Night (22-06)'];

function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, theme }: {
  startDate: string; endDate: string; onStartChange: (d: string) => void; onEndChange: (d: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <div className="flex items-center gap-2">
      <Calendar size={14} style={{ color: theme.textMuted }} />
      <input type="date" value={startDate} onChange={e => onStartChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
      <span className="text-xs" style={{ color: theme.textMuted }}>to</span>
      <input type="date" value={endDate} onChange={e => onEndChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
    </div>
  );
}

function FilterDropdown({ label, value, options, onChange, icon: Icon, theme }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
  icon: typeof Building2; theme: ReturnType<typeof useTheme>['theme'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
        <Icon size={13} style={{ color: theme.textMuted }} />
        <span style={{ color: theme.textMuted }}>{label}:</span>
        <span>{value}</span>
        <ChevronDown size={12} style={{ color: theme.textMuted }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 w-48 rounded-xl p-1.5 shadow-xl"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            {options.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: value === opt ? theme.primary + '15' : 'transparent', color: value === opt ? theme.primary : theme.text }}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color, theme }: {
  label: string; value: string; icon: typeof DollarSign; color: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <div className="p-4 rounded-xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '15' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="text-xl font-extrabold" style={{ color: theme.text }}>{value}</div>
    </div>
  );
}

export default function AdminReports() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [branch, setBranch] = useState('All Branches');
  const [shift, setShift] = useState('All Shifts');
  const [staffFilter, setStaffFilter] = useState('All Staff');
  const [printStaff, setPrintStaff] = useState<StaffReport | null>(null);
  const [showZReport, setShowZReport] = useState(false);
  const [zPrintsToday, setZPrintsToday] = useState(0);
  const MAX_Z_PRINTS = 2;

  const filteredReports = useMemo(() => {
    return STAFF_REPORTS.filter(r => staffFilter === 'All Staff' || r.name === staffFilter);
  }, [staffFilter]);

  const totals = useMemo(() => ({
    sales: filteredReports.reduce((s, r) => s + r.totalSales, 0),
    cash: filteredReports.reduce((s, r) => s + r.cashCollected, 0),
    card: filteredReports.reduce((s, r) => s + r.cardTransactions, 0),
    refunds: filteredReports.reduce((s, r) => s + r.refunds, 0),
    items: filteredReports.reduce((s, r) => s + r.itemsSold, 0),
    orders: filteredReports.reduce((s, r) => s + r.ordersCount, 0),
  }), [filteredReports]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Reports & Analytics</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Dynamics 365-style enterprise reporting with staff performance tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowZReport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
            <Printer size={15} /> Z-Report (EOD)
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-4 rounded-2xl flex flex-wrap items-center gap-3" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} theme={theme} />
        <FilterDropdown label="Branch" value={branch} options={BRANCHES} onChange={setBranch} icon={Building2} theme={theme} />
        <FilterDropdown label="Shift" value={shift} options={SHIFTS} onChange={setShift} icon={Clock} theme={theme} />
        <FilterDropdown label="Staff" value={staffFilter} options={['All Staff', ...STAFF_REPORTS.map(r => r.name)]} onChange={setStaffFilter} icon={User} theme={theme} />
        <button onClick={() => { setBranch('All Branches'); setShift('All Shifts'); setStaffFilter('All Staff'); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
          <X size={12} /> Clear
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile label="Total Sales" value={`$${totals.sales.toLocaleString()}`} icon={DollarSign} color="#22c55e" theme={theme} />
        <StatTile label="Cash Collected" value={`$${totals.cash.toLocaleString()}`} icon={Banknote} color="#f59e0b" theme={theme} />
        <StatTile label="Card Transactions" value={`$${totals.card.toLocaleString()}`} icon={CreditCard} color="#3b82f6" theme={theme} />
        <StatTile label="Refunds" value={`$${totals.refunds.toLocaleString()}`} icon={RotateCcw} color="#ef4444" theme={theme} />
        <StatTile label="Items Sold" value={String(totals.items)} icon={Package} color="#8b5cf6" theme={theme} />
        <StatTile label="Orders" value={String(totals.orders)} icon={TrendingUp} color={theme.primary} theme={theme} />
      </div>

      {/* Staff performance table */}
      <PlanGate feature="advanced_reports" title="Advanced Staff Analytics" description="Staff performance breakdown is available on Premium and Enterprise plans. Upgrade to unlock detailed per-staff sales reporting.">
      <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <h2 className="font-extrabold flex items-center gap-2" style={{ color: theme.text }}>
            <User size={16} style={{ color: theme.primary }} /> Staff Performance Breakdown
          </h2>
          <span className="text-xs" style={{ color: theme.textMuted }}>{filteredReports.length} staff members</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Shift</th>
                <th>Total Sales</th>
                <th>Cash</th>
                <th>Card</th>
                <th>Refunds</th>
                <th>Items</th>
                <th>Orders</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((r, i) => (
                <motion.tr key={r.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: theme.primary }}>{r.name.split(' ').map(n => n[0]).join('')}</div><span className="text-sm font-semibold">{r.name}</span></div></td>
                  <td><span className="text-xs">{r.role}</span></td>
                  <td><span className="text-xs font-mono">{r.shift}</span></td>
                  <td><span className="text-sm font-bold" style={{ color: theme.primary }}>${r.totalSales.toLocaleString()}</span></td>
                  <td><span className="text-sm">${r.cashCollected.toLocaleString()}</span></td>
                  <td><span className="text-sm">${r.cardTransactions.toLocaleString()}</span></td>
                  <td><span className="text-sm" style={{ color: r.refunds > 0 ? '#ef4444' : theme.textMuted }}>${r.refunds.toLocaleString()}</span></td>
                  <td><span className="text-sm">{r.itemsSold}</span></td>
                  <td><span className="text-sm">{r.ordersCount}</span></td>
                  <td>
                    <button onClick={() => setPrintStaff(r)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                      style={{ background: theme.primary + '15', color: theme.primary }}>
                      <Printer size={12} /> Print
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </PlanGate>

      {/* Staff report print modal */}
      {printStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setPrintStaff(null)}>
          <div className="w-80 max-h-[85vh] overflow-auto rounded-2xl" style={{ background: '#fff', color: '#000' }} onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold">Staff Sales Report</h2>
                <button onClick={() => setPrintStaff(null)} style={{ color: '#999' }}><X size={18} /></button>
              </div>
              <div className="text-center mb-4 pb-3" style={{ borderBottom: '1px dashed #ddd' }}>
                <div className="font-extrabold text-sm">Le Maison Dubai</div>
                <div className="text-xs text-gray-500">Powered by Nutro - LiAfrik</div>
                <div className="text-xs text-gray-500">{branch} | {startDate} to {endDate}</div>
              </div>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between"><span className="text-gray-500">Staff Name:</span><span className="font-bold">{printStaff.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="font-bold">{printStaff.role}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Shift:</span><span className="font-bold">{printStaff.shift}</span></div>
              </div>
              <div className="border-t border-dashed border-gray-300 pt-3 space-y-2 text-xs">
                <div className="flex justify-between"><span>Total Sales</span><span className="font-bold">${printStaff.totalSales.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Cash Collected</span><span className="font-bold">${printStaff.cashCollected.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Card Transactions</span><span className="font-bold">${printStaff.cardTransactions.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Refunds Triggered</span><span className="font-bold" style={{ color: '#ef4444' }}>${printStaff.refunds.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Items Sold</span><span className="font-bold">{printStaff.itemsSold}</span></div>
                <div className="flex justify-between"><span>Orders Processed</span><span className="font-bold">{printStaff.ordersCount}</span></div>
              </div>
              <div className="border-t border-dashed border-gray-300 mt-3 pt-3 text-center">
                <div className="text-xs text-gray-500">Generated by: {profile?.full_name ?? 'Admin'}</div>
                <div className="text-xs text-gray-500">{new Date().toLocaleString()}</div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5" style={{ background: theme.primary }}>
                  <Printer size={14} /> Print 80mm
                </button>
                <button onClick={() => setPrintStaff(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: '#f5f5f5', color: '#666' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Z-Report modal */}
      {showZReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowZReport(false)}>
          <div className="w-96 max-h-[85vh] overflow-auto rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: theme.text }}>
                <FileBarChart size={18} /> Z-Report - End of Day
              </h2>
              <button onClick={() => setShowZReport(false)} style={{ color: theme.textMuted }}><X size={18} /></button>
            </div>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                <span style={{ color: theme.textMuted }}>Date Range</span><span className="font-bold" style={{ color: theme.text }}>{startDate} to {endDate}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                <span style={{ color: theme.textMuted }}>Branch</span><span className="font-bold" style={{ color: theme.text }}>{branch}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                <span style={{ color: theme.textMuted }}>Total Orders</span><span className="font-bold" style={{ color: theme.text }}>{totals.orders}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                <span style={{ color: theme.textMuted }}>Total Revenue</span><span className="font-extrabold" style={{ color: theme.primary }}>${totals.sales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                <span style={{ color: theme.textMuted }}>Cash Collected</span><span className="font-bold" style={{ color: '#f59e0b' }}>${totals.cash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                <span style={{ color: theme.textMuted }}>Card Transactions</span><span className="font-bold" style={{ color: '#3b82f6' }}>${totals.card.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                <span style={{ color: theme.textMuted }}>Total Refunds</span><span className="font-bold" style={{ color: '#ef4444' }}>${totals.refunds.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{ background: theme.bg }}>
                <span style={{ color: theme.textMuted }}>Items Sold</span><span className="font-bold" style={{ color: theme.text }}>{totals.items}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: '#eab30810', border: '1px solid #eab30830' }}>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Prints today: {zPrintsToday}/{MAX_Z_PRINTS}. Maximum {MAX_Z_PRINTS} prints per day to prevent thermal roll waste.
              </p>
            </div>
            <button onClick={() => { if (zPrintsToday < MAX_Z_PRINTS) { setZPrintsToday(p => p + 1); window.print(); } }}
              disabled={zPrintsToday >= MAX_Z_PRINTS}
              className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: theme.primary }}>
              <Printer size={16} /> {zPrintsToday >= MAX_Z_PRINTS ? 'Print Limit Reached' : `Print Z-Report (${zPrintsToday}/${MAX_Z_PRINTS})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Package, AlertTriangle, Search, Plus, Minus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrgContext } from '@/hooks/useOrgContext';
import { useSharedMenu } from '@/lib/menuStore';
import PlanGate from '@/components/ui/PlanGate';

const LOW_STOCK_THRESHOLD = 10;

function InventoryContent() {
  const { theme } = useTheme();
  const { orgContext } = useOrgContext();
  const branchId = orgContext?.branch_id ?? null;
  const { menuItems, loading, adjustStock } = useSharedMenu(branchId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const filtered = useMemo(() => {
    return menuItems
      .filter(item => !search || item.name.toLowerCase().includes(search.toLowerCase()))
      .filter(item => {
        if (filter === 'low') return item.stock > 0 && item.stock <= LOW_STOCK_THRESHOLD;
        if (filter === 'out') return item.stock <= 0;
        return true;
      })
      .sort((a, b) => a.stock - b.stock);
  }, [menuItems, search, filter]);

  const lowStockCount = menuItems.filter(i => i.stock > 0 && i.stock <= LOW_STOCK_THRESHOLD).length;
  const outOfStockCount = menuItems.filter(i => i.stock <= 0).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: theme.text }}>Inventory</h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
          Real stock levels — the same numbers the POS/tablet use to gate ordering, automatically decremented on sale and restored on cancellation.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFilter('all')} className="p-4 rounded-2xl text-left" style={{ background: theme.surface, border: `2px solid ${filter === 'all' ? theme.primary : theme.border}` }}>
          <p className="text-2xl font-extrabold" style={{ color: theme.text }}>{menuItems.length}</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>Total Items</p>
        </button>
        <button onClick={() => setFilter('low')} className="p-4 rounded-2xl text-left" style={{ background: theme.surface, border: `2px solid ${filter === 'low' ? '#eab308' : theme.border}` }}>
          <p className="text-2xl font-extrabold" style={{ color: '#eab308' }}>{lowStockCount}</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>Low Stock (≤{LOW_STOCK_THRESHOLD})</p>
        </button>
        <button onClick={() => setFilter('out')} className="p-4 rounded-2xl text-left" style={{ background: theme.surface, border: `2px solid ${filter === 'out' ? '#ef4444' : theme.border}` }}>
          <p className="text-2xl font-extrabold" style={{ color: '#ef4444' }}>{outOfStockCount}</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>Out of Stock</p>
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu items…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} />
      </div>

      {loading && <p className="text-sm text-center py-8" style={{ color: theme.textMuted }}>Loading inventory…</p>}

      {!loading && (
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {['Item', 'Category', 'Stock', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: theme.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isOut = item.stock <= 0;
                const isLow = item.stock > 0 && item.stock <= LOW_STOCK_THRESHOLD;
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: theme.text }}>{item.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: theme.textMuted }}>{item.category}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: isOut ? '#ef4444' : isLow ? '#eab308' : theme.text }}>
                        {(isOut || isLow) && <AlertTriangle size={12} />} {item.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => adjustStock(item.id, -1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}><Minus size={12} style={{ color: theme.textMuted }} /></button>
                        <button onClick={() => adjustStock(item.id, 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}><Plus size={12} style={{ color: theme.textMuted }} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: theme.textMuted }}>No items match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminInventory() {
  return (
    <PlanGate feature="inventory" title="Inventory" description="Stock tracking and low-stock alerts are available on Premium and Enterprise plans. Upgrade to unlock inventory management.">
      <div className="p-2 rounded-xl mb-3 text-xs flex items-center gap-2" style={{ background: '#3b82f610', color: '#3b82f6' }}>
        <Package size={14} /> Stock changes here use the same real adjustStock function as the Menu page — both stay in sync.
      </div>
      <InventoryContent />
    </PlanGate>
  );
}

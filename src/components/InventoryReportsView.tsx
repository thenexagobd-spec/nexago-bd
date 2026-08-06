/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, Box, CalendarDays, Package, TrendingUp, Truck, Wallet } from 'lucide-react';
import { BatchEntry, LedgerEntry, daysOfStock, effectiveExpiry, fmt, ledgerSales } from './inventoryUtils';

interface InventoryReportsViewProps {
  products: any[];
  ledger: LedgerEntry[];
  batches: BatchEntry[];
}

const enrich = (products: any[], ledger: LedgerEntry[], batches: BatchEntry[]) =>
  products.map((p: any) => {
    const rp = p.reorderPoint ?? 5;
    const stock = p.stock ?? 0;
    const cost = p.cost ?? Math.round((p.price ?? 0) * 0.75);
    const status = stock <= 0 ? 'Out of Stock' : stock <= rp ? 'Low Stock' : 'In Stock';
    const price = p.price ?? 0;
    const salePrice = p.promoPrice && p.promoPrice > 0 ? p.promoPrice : price - (price * (p.discount ?? 0)) / 100;
    const sales30 = ledgerSales(ledger, p.id, 30);
    const salesAll = ledgerSales(ledger, p.id, 9999);
    const exp = effectiveExpiry(p, batches);
    return { ...p, rp, cost, status, salePrice, sales30, salesAll, exp, days: daysOfStock(ledger, stock, p.id) };
  });

const Bar = ({ label, sub, pct, color = 'bg-brand-orange' }: { label: string; sub: string; pct: number; color?: string; key?: any }) => (
  <div className="mb-2.5">
    <div className="flex items-center justify-between text-[10px]">
      <span className="font-bold text-white truncate pr-2">{label}</span>
      <span className="text-gray-500 font-mono shrink-0">{sub}</span>
    </div>
    <div className="h-1.5 bg-brand-dark rounded-full mt-1 overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
    </div>
  </div>
);

export default function InventoryReportsView({ products, ledger, batches }: InventoryReportsViewProps) {
  const enriched = enrich(products, ledger, batches);
  const totalStock = enriched.reduce((s: number, p: any) => s + (p.stock ?? 0), 0);
  const valueCost = enriched.reduce((s: number, p: any) => s + ((p.stock ?? 0) * p.cost), 0);
  const valueRetail = enriched.reduce((s: number, p: any) => s + ((p.stock ?? 0) * p.salePrice), 0);
  const potentialProfit = valueRetail - valueCost;
  const avgMargin = enriched.length ? enriched.reduce((s: number, p: any) => s + (p.salePrice > 0 ? ((p.salePrice - p.cost) / p.salePrice) * 100 : 0), 0) / enriched.length : 0;

  const movers = [...enriched].sort((a, b) => (b.sales30 || 0) - (a.sales30 || 0)).filter(p => (p.sales30 || 0) > 0).slice(0, 6);
  const deadStock = enriched.filter(p => (p.stock ?? 0) > 0 && (p.salesAll ?? 0) === 0).sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
  const slowMovers = enriched.filter(p => (p.stock ?? 0) > 0 && (p.sales30 ?? 0) > 0 && (p.sales30 ?? 0) < 3);
  const runway = enriched.filter(p => (p.stock ?? 0) > 0 && p.days !== null && p.days <= 14).sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
  const expiringSoon = enriched.filter(p => (p.stock ?? 0) > 0 && p.exp.state === 'soon').sort((a, b) => (a.exp.days ?? 0) - (b.exp.days ?? 0));
  const expired = enriched.filter(p => p.exp.state === 'expired');
  const wastage = ledger.filter(e => e.type === 'Waste');
  const wastageQty = wastage.reduce((s, e) => s + Math.abs(e.qty), 0);
  const returns = ledger.filter(e => e.type === 'Return');
  const returnsQty = returns.reduce((s, e) => s + e.qty, 0);
  const maxSales = movers.length ? Math.max(...movers.map(m => m.sales30)) : 1;

  const empty = (msg: string) => <p className="text-[10px] text-gray-500">{msg}</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Value (at cost)</span>
          <div className="text-xl font-black text-emerald-400 mt-1 flex items-center space-x-2"><Wallet className="w-4 h-4 text-emerald-400" /><span>{fmt(valueCost)}</span></div>
          <p className="text-[9px] text-gray-500 mt-0.5">{totalStock} units</p>
        </div>
        <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Potential Profit</span>
          <div className="text-xl font-black text-white mt-1 flex items-center space-x-2"><TrendingUp className="w-4 h-4 text-brand-orange" /><span>{fmt(potentialProfit)}</span></div>
          <p className="text-[9px] text-gray-500 mt-0.5">avg margin {avgMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Wastage (30d)</span>
          <div className="text-xl font-black text-red-400 mt-1 flex items-center space-x-2"><Box className="w-4 h-4 text-red-400" /><span>{wastageQty} <span className="text-xs">units</span></span></div>
          <p className="text-[9px] text-gray-500 mt-0.5">{wastage.length} wastage record{wastage.length === 1 ? '' : 's'} · {returnsQty} returned</p>
        </div>
        <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expiry Watch</span>
          <div className="text-xl font-black text-orange-400 mt-1 flex items-center space-x-2"><CalendarDays className="w-4 h-4 text-orange-400" /><span>{expiringSoon.length} <span className="text-xs">soon</span></span></div>
          <p className="text-[9px] text-gray-500 mt-0.5">{expired.length} already expired</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-brand-card border border-brand-border rounded-xl p-4">
          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /><span>Top Movers — Sales (30d)</span></h4>
          {movers.length === 0 ? empty('No sales recorded yet. Log a Sale via the ± adjust button on the inventory tab.') : movers.map((m: any) => (
            <Bar key={m.id} label={m.name} sub={`${m.sales30} sold · ${fmt(m.salePrice * m.sales30)}`} pct={(m.sales30 / maxSales) * 100} color="bg-emerald-500" />
          ))}
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-4">
          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Box className="w-3.5 h-3.5 text-red-400" /><span>Dead Stock — No Sales Ever</span></h4>
          {deadStock.length === 0 ? empty('No dead stock — every item has sold at least once.') : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {deadStock.slice(0, 12).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-white truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-red-300">{p.stock} {p.unit || 'pcs'} · {fmt(p.stock * p.cost)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-4">
          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><CalendarDays className="w-3.5 h-3.5 text-orange-400" /><span>Stock Runway — Days Until Sold Out</span></h4>
          {runway.length === 0 ? empty('All stocked items have healthy runway (>14 days) or no sales data.') : runway.slice(0, 10).map((p: any) => (
            <Bar key={p.id} label={p.name} sub={`${p.days} days · ${p.stock} left`} pct={(p.days ? Math.min(100, p.days / 14 * 100) : 100)} color={p.days !== null && p.days <= 7 ? 'bg-red-500' : 'bg-orange-500'} />
          ))}
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-4">
          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" /><span>Expiry Forecast — Expiring Soon</span></h4>
          {expiringSoon.length === 0 && expired.length === 0 ? empty('No expiry dates on file. Add an expiry date in the product form or when receiving a PO.') : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {expired.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-red-300 truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-red-400">EXPIRED · {p.exp.expiry}</span>
                </div>
              ))}
              {expiringSoon.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-white truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-orange-300">{p.exp.days}d · {p.exp.expiry}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-4">
        <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Package className="w-3.5 h-3.5 text-brand-orange" /><span>Inventory Snapshot — All Products</span></h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="text-gray-500 border-b border-brand-border">
                <th className="py-2 pr-2 font-bold uppercase">Product</th>
                <th className="py-2 px-2 font-bold uppercase">Stock</th>
                <th className="py-2 px-2 font-bold uppercase">Cost</th>
                <th className="py-2 px-2 font-bold uppercase">Sale Price</th>
                <th className="py-2 px-2 font-bold uppercase">Margin</th>
                <th className="py-2 px-2 font-bold uppercase">Sold (30d)</th>
                <th className="py-2 px-2 font-bold uppercase">Days Left</th>
                <th className="py-2 pl-2 font-bold uppercase text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {enriched.map((p: any) => (
                <tr key={p.id} className="hover:bg-brand-dark/10">
                  <td className="py-1.5 pr-2 font-bold text-white truncate max-w-[180px]">{p.name}</td>
                  <td className="py-1.5 px-2 font-mono text-gray-300">{p.stock} {p.unit || 'pcs'}</td>
                  <td className="py-1.5 px-2 font-mono text-gray-400">{fmt(p.cost)}</td>
                  <td className="py-1.5 px-2 font-mono text-emerald-400">{fmt(p.salePrice)}</td>
                  <td className="py-1.5 px-2 font-mono text-gray-300">{p.salePrice > 0 ? ((p.salePrice - p.cost) / p.salePrice * 100).toFixed(1) + '%' : '—'}</td>
                  <td className="py-1.5 px-2 font-mono text-gray-300">{p.sales30}</td>
                  <td className="py-1.5 px-2 font-mono font-bold text-gray-300">{p.days !== null ? p.days : '—'}</td>
                  <td className="py-1.5 pl-2 text-right font-bold text-white">{fmt(p.stock * p.salePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[9px] text-gray-500">
        <Truck className="w-3 h-3" />
        <span>Analytics derive from the stock ledger. Log a "Sale" via ± adjust, a "Waste" for damaged/expired items, and add expiry dates to unlock forecasting.</span>
      </div>
    </div>
  );
}

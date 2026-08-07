/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, IndianRupee, ShoppingBag, Boxes, Wallet } from 'lucide-react';
import { Order } from '../types';
import { fetchInventoryLedger } from './inventoryAutoWaste';
import { LedgerEntry } from './inventoryUtils';

interface KpiDashboardViewProps {
  products: any[];
  orders: Order[];
  onNavigate: (tab: string) => void;
}

const COLORS = ['#f97316', '#22d3ee', '#34d399', '#a78bfa', '#fbbf24', '#f472b6', '#60a5fa'];

export default function KpiDashboardView({ products, orders, onNavigate }: KpiDashboardViewProps) {
  const metrics = useMemo(() => {
    const ledger: LedgerEntry[] = fetchInventoryLedger();
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const days: { date: string; label: string; revenue: number; units: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: iso, label: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: 0, units: 0 });
    }

    const priceOf: Record<string, number> = {};
    products.forEach((p: any) => { priceOf[p.id] = Number(p.promoPrice || p.price || 0); });

    const saleEntries = ledger.filter(e => e.type === 'Sale');
    saleEntries.forEach(e => {
      const d = e.date || todayISO;
      const row = days.find(x => x.date === d);
      const q = Math.abs(e.qty || 0);
      if (row) { row.revenue += q * (priceOf[e.productId] ?? 0); row.units += q; }
    });

    const moversMap: Record<string, { name: string; units: number }> = {};
    const cutoff = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    saleEntries.forEach(e => {
      if (e.date && e.date < cutoff) return;
      if (!moversMap[e.productId]) moversMap[e.productId] = { name: e.productName, units: 0 };
      moversMap[e.productId].units += Math.abs(e.qty || 0);
    });
    const topMovers = Object.values(moversMap).sort((a, b) => b.units - a.units).slice(0, 6);

    const catMap: Record<string, number> = {};
    let inventoryValue = 0;
    let potentialProfit = 0;
    let lowStock = 0;
    products.forEach((p: any) => {
      const stock = Number(p.stock || 0);
      const cost = Number(p.cost || 0);
      const price = Number(p.promoPrice || p.price || 0);
      const value = stock * (cost || price);
      inventoryValue += value;
      potentialProfit += stock * (price - cost);
      if (stock <= (p.reorderPoint ?? 5)) lowStock++;
      const cat = p.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + value;
    });
    const categoryShare = Object.entries(catMap).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);

    const todayRow = days[days.length - 1];
    const weekRevenue = days.reduce((s, d) => s + d.revenue, 0);
    const weekUnits = days.reduce((s, d) => s + d.units, 0);

    return { days, topMovers, categoryShare, inventoryValue, potentialProfit, lowStock, todayRevenue: todayRow.revenue, weekRevenue, weekUnits, todayUnits: todayRow.units };
  }, [products, orders]);

  const statCards = [
    { label: 'Today Sales', value: '৳' + Math.round(metrics.todayRevenue).toLocaleString('en-IN'), sub: metrics.todayUnits + ' units', icon: IndianRupee, color: 'text-brand-orange bg-brand-orange/10' },
    { label: '7-Day Revenue', value: '৳' + Math.round(metrics.weekRevenue).toLocaleString('en-IN'), sub: metrics.weekUnits + ' units sold', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Inventory Value', value: '৳' + Math.round(metrics.inventoryValue).toLocaleString('en-IN'), sub: 'at cost / market price', icon: Wallet, color: 'text-cyan-400 bg-cyan-500/10' },
    { label: 'Low Stock Alerts', value: String(metrics.lowStock), sub: 'below reorder point', icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-500/10' }
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">KPI Dashboard</h3>
          <p className="text-xs text-gray-400">Live performance metrics from POS sales, ledger, and inventory</p>
        </div>
        <button
          onClick={() => onNavigate('Reports & Analytics')}
          className="px-3.5 py-2 bg-brand-dark border border-brand-border hover:border-brand-orange/40 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
        >
          Open Reports
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(c => (
          <div key={c.label} className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{c.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{c.value}</div>
            <div className="text-[10px] text-gray-500 font-semibold">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily revenue area */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-brand-orange" />
            <span>Daily Sales Revenue (7 days)</span>
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.days} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#1e293b" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#1e293b" />
                <Tooltip
                  contentStyle={{ background: '#0c1624', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#e2e8f0' }}
                  labelStyle={{ color: '#f97316' }}
                  formatter={(v: any) => '৳' + Number(v).toLocaleString('en-IN')}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top movers bar */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Boxes className="w-4 h-4 text-brand-orange" />
            <span>Top Movers (30 days)</span>
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.topMovers} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#1e293b" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#1e293b" />
                <Tooltip
                  contentStyle={{ background: '#0c1624', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#e2e8f0' }}
                  formatter={(v: any) => v + ' units'}
                />
                <Bar dataKey="units" name="Units sold" fill="#22d3ee" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category share pie */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-brand-orange" />
            <span>Inventory Value by Category</span>
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.categoryShare} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                  {metrics.categoryShare.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0c1624', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#e2e8f0' }}
                  formatter={(v: any) => '৳' + Number(v).toLocaleString('en-IN')}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock health list */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-brand-orange" />
            <span>Stock Health</span>
          </h4>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {products.slice(0, 8).map((p: any) => {
              const stock = Number(p.stock || 0);
              const reorder = p.reorderPoint ?? 5;
              const pct = Math.min(100, Math.round((stock / Math.max(reorder * 2, 1)) * 100));
              const low = stock <= reorder;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-white truncate pr-2">{p.name}</span>
                    <span className={low ? 'text-yellow-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {stock} {p.unit || 'pcs'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-brand-dark rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${low ? 'bg-yellow-400' : 'bg-emerald-500'}`} style={{ width: pct + '%' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle, Truck, XCircle, 
  ShoppingBag, UserPlus, MapPin, Bell, FileText, LifeBuoy, Settings, 
  ChevronRight, UserCheck, Wallet, Zap
} from 'lucide-react';
import { Order, Driver, Zone, SystemNotification } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import TrackingMapView from './TrackingMapView';

interface DashboardViewProps {
  orders: Order[];
  drivers: Driver[];
  zones: Zone[];
  notifications: SystemNotification[];
  onNavigate: (tab: string) => void;
  onOpenQuickAction: (actionType: string) => void;
  isTightMode?: boolean;
}

const safeText = (value: unknown, fallback = '') => {
  const next = String(value ?? '').trim();
  return next || fallback;
};
const initials = (value: unknown, fallback = 'NA') => safeText(value, fallback).split(/\s+/).map(n => n[0] || '').join('').slice(0, 2).toUpperCase() || fallback;

export default function DashboardView({
  orders,
  drivers,
  zones,
  notifications,
  onNavigate,
  onOpenQuickAction,
  isTightMode = false
}: DashboardViewProps) {
  // Chart Hover State
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'Daily'|'Monthly'|'Yearly'|'Custom'>('Daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const ongoingOrders = orders.filter(o => ['Pending', 'Confirmed', 'Processing', 'Ongoing'].includes(o.status));
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled');
  const totalEarnings = completedOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const percentOf = (value: number, total: number) => total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';
  const formatMoney = (value: number) => `৳ ${Number(value || 0).toLocaleString()}`;

  // Parse an order date string ("May 26, 2024") into a Date
  const parseOrderDate = (date: string) => {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Build chart data from the real orders list for the selected timeframe
  const chartMeta = (() => {
    const maxOrderDate = orders.reduce<Date>((max, o) => {
      const d = parseOrderDate(o.date);
      return d && d > max ? d : max;
    }, new Date(0));
    const anchor = maxOrderDate.getTime() === new Date(0).getTime() ? new Date() : maxOrderDate;

    const daysCount = 7;
    const offsetDays = 0;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const days: string[] = [];
    const data: { completed: number; ongoing: number; cancelled: number }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - (i + offsetDays));
      days.push(`${monthNames[d.getMonth()]} ${d.getDate()}`);
      data.push({ completed: 0, ongoing: 0, cancelled: 0 });
    }

    orders.forEach(order => {
      const orderDate = parseOrderDate(order.date);
      if (!orderDate) return;
      const dayIndex = days.findIndex(day => day === `${monthNames[orderDate.getMonth()]} ${orderDate.getDate()}`);
      if (dayIndex < 0) return;
      if (order.status === 'Completed') data[dayIndex].completed += 1;
      else if (order.status === 'Cancelled') data[dayIndex].cancelled += 1;
      else data[dayIndex].ongoing += 1;
    });

    return { days, data };
  })();

  const chartDays = chartMeta.days;
  const chartData = chartMeta.data;
  const revenueChartData = chartDays.map((day, index) => ({
    day,
    revenue: orders.reduce((sum, order) => {
      const d = parseOrderDate(order.date);
      if (!d || `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}` !== day || order.status !== 'Completed') return sum;
      return sum + Number(order.amount || 0);
    }, 0),
    orders: chartData[index]?.completed + chartData[index]?.ongoing + chartData[index]?.cancelled || 0,
  }));

  // SVG dimensions
  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 20;

  // Dynamic Y-axis scale based on real data
  const rawMax = Math.max(10, ...chartData.flatMap(d => [d.completed, d.ongoing, d.cancelled]));
  const niceCeil = (n: number) => {
    const pow = Math.pow(10, Math.floor(Math.log10(n)));
    const scaled = n / pow;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return nice * pow;
  };
  const maxY = niceCeil(rawMax);
  const gridTicks = Array.from({ length: 6 }, (_, i) => Math.round(maxY * i / 5));

  // Helper to map values to SVG coordinates
  const getX = (index: number) => paddingX + (index * (width - paddingX * 2)) / (chartDays.length - 1);
  const getY = (val: number) => height - paddingY - (val * (height - paddingY * 2)) / maxY;

  const [dashboardTab, setDashboardTab] = useState<'overview' | 'tracking'>('overview');

  return (
    <div className={`${isTightMode ? 'space-y-3' : 'space-y-6'} fade-in`}>
      {/* Dashboard Sub-navigation Tabs */}
      <div className="flex border-b border-brand-border/40 pb-1 justify-between items-center shrink-0">
        <div className="flex space-x-6 text-xs font-black uppercase tracking-wider">
          <button
            onClick={() => setDashboardTab('overview')}
            className={`pb-2.5 transition-all cursor-pointer relative font-bold ${
              dashboardTab === 'overview' 
                ? 'text-brand-orange' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Overview</span>
            {dashboardTab === 'overview' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-orange rounded-full"></span>
            )}
          </button>
          
          <button
            onClick={() => setDashboardTab('tracking')}
            className={`pb-2.5 transition-all cursor-pointer relative font-bold flex items-center space-x-1.5 ${
              dashboardTab === 'tracking' 
                ? 'text-brand-orange' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>
            <span>Live Tracking Map</span>
            {dashboardTab === 'tracking' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-orange rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {dashboardTab === 'tracking' ? (
        <TrackingMapView orders={orders} drivers={drivers} zones={zones} />
      ) : (
        <>
          {/* Original 5 Stats Cards Row */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 ${isTightMode ? 'gap-2.5' : 'gap-4'}`}>
        {/* Total Orders */}
        <div 
          onClick={() => onNavigate('Orders')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Orders</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>{orders.length.toLocaleString()}</h3>
            <div className="flex items-center text-[10px] text-gray-400 font-medium">
              <span>Real orders</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0`}>
            <ShoppingBag className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>

        {/* Completed Orders */}
        <div 
          onClick={() => onNavigate('Orders')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Completed Orders</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>{completedOrders.length.toLocaleString()}</h3>
            <div className="flex items-center text-[10px] text-emerald-400 font-medium">
              <TrendingUp className="w-2.5 shrink-0 mr-0.5" />
              <span>{percentOf(completedOrders.length, orders.length)}</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0`}>
            <CheckCircle className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>

        {/* Ongoing Orders */}
        <div 
          onClick={() => onNavigate('Orders')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ongoing Orders</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>{ongoingOrders.length.toLocaleString()}</h3>
            <div className="flex items-center text-[10px] text-blue-400 font-medium">
              <Truck className="w-2.5 shrink-0 mr-0.5" />
              <span>{percentOf(ongoingOrders.length, orders.length)}</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0`}>
            <Truck className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>

        {/* Cancelled Orders */}
        <div 
          onClick={() => onNavigate('Orders')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cancelled Orders</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>{cancelledOrders.length.toLocaleString()}</h3>
            <div className="flex items-center text-[10px] text-red-400 font-medium">
              <TrendingDown className="w-2.5 shrink-0 mr-0.5" />
              <span>{percentOf(cancelledOrders.length, orders.length)}</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0`}>
            <XCircle className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>

        {/* Total Earnings */}
        <div 
          onClick={() => onNavigate('Payments')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Earnings</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>{formatMoney(totalEarnings)}</h3>
            <div className="flex items-center text-[10px] text-gray-400 font-medium">
              <span>Completed orders</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0`}>
            <span className={`${isTightMode ? 'text-sm' : 'text-lg'} font-bold`}>৳</span>
          </div>
        </div>
      </div>

      {/* Simulation Banner announcement */}
      <div className="bg-gradient-to-r from-brand-orange/10 via-brand-orange/5 to-transparent border border-brand-orange/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-lg bg-brand-orange/15 border border-brand-orange/35 flex items-center justify-center text-brand-orange text-lg">
            📱
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              Interactive Customer & Driver Mobile App Simulator
              <span className="px-1.5 py-0.5 bg-brand-orange text-white text-[8px] rounded font-black tracking-widest animate-pulse">UPDATED</span>
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Experience the dual-sided smartphone simulation matching driver pings, signups, document validations, support modules, and real-time live customer tracking!
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('Mobile App Simulator')}
          className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer whitespace-nowrap shadow-md"
        >
          Open Simulator
        </button>
      </div>

      {/* 7-Day Daily Revenue & Sales Trends via Recharts */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Revenue & Sales Trends</h3>
            <p className="text-[11px] text-gray-400">Platform-wide revenue performance visualized via Recharts</p>
          </div>
          <div className="flex items-center space-x-1 bg-brand-dark p-1 rounded-lg border border-brand-border/60">
            {(['Daily','Monthly','Yearly','Custom'] as const).map(p=>(<button key={p} onClick={()=>setChartPeriod(p)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${chartPeriod===p?'bg-brand-orange text-white':'text-gray-400 hover:text-white'}`}>{p}</button>            ))}
          </div>
          {chartPeriod==='Custom' && (<div className="flex items-center flex-wrap gap-2 border-t border-brand-border/40 pt-3 mt-1">
            <span className="text-[10px] text-gray-400 font-bold">Custom Range:</span>
            <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="px-3 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer" />
            <span className="text-gray-400 text-xs">→</span>
            <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="px-3 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer" />
            {customFrom&&customTo&&(<span className="text-[10px] text-emerald-400 font-bold ml-1">✓ Applied: {customFrom} → {customTo}</span>)}
          </div>)}
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={
              revenueChartData
            }>
              <defs>
                <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/><stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/></linearGradient>
                <linearGradient id="dashOrdGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
              <YAxis yAxisId="left" stroke="#f97316" fontSize={11} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} />
              <Tooltip contentStyle={{backgroundColor:'#0f172a',borderColor:'#334155',borderRadius:'8px',fontSize:'12px'}} formatter={(v:any,n:string)=>[n==='Revenue'?`৳${Number(v).toLocaleString()}`:v,n]} />
              <Legend wrapperStyle={{fontSize:'11px'}} />
              <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#f97316" fill="url(#dashRevGrad)" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" fill="url(#dashOrdGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MFS Business & Settlement Quick Access */}
      <button
        onClick={() => onNavigate('MFS Business & Settlement')}
        className="w-full flex items-center justify-between bg-gradient-to-r from-brand-orange/10 via-brand-orange/5 to-transparent border border-brand-orange/30 p-4 rounded-xl shadow-lg hover:border-brand-orange/60 transition-all cursor-pointer group"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-brand-orange/15 border border-brand-orange/35 flex items-center justify-center text-brand-orange group-hover:scale-105 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">MFS Business & Settlement</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Calculate bKash / Nagad / Rocket business, commission & net settlement</p>
          </div>
        </div>
        <span className="px-3 py-1.5 bg-brand-orange text-white rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
          Open Calculator →
        </span>
      </button>

      {/* Live Customer Orders Board */}
      <div className="bg-brand-card/60 border border-brand-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-brand-orange/15 border border-brand-orange/35 flex items-center justify-center text-brand-orange">
                <Zap className="w-4 h-4" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Live Customer Orders</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase tracking-wider">● Live</span>
              </h3>
              <p className="text-[10px] text-gray-400">Real-time storefront orders · auto rider assignment</p>
            </div>
          </div>
          <button onClick={() => onNavigate('Orders')} className="text-[10px] font-bold text-brand-orange hover:underline cursor-pointer">View All →</button>
        </div>
        {orders.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">No customer orders yet — they appear here the moment they're placed.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.slice(0, 6).map(o => {
              const fresh = ['Ongoing', 'Pending', 'Confirmed', 'Processing'].includes(o.status);
              return (
                <button key={o.id} onClick={() => onNavigate('Orders')} className="bg-brand-dark/50 hover:bg-brand-dark border border-brand-border rounded-xl p-3 text-left transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-brand-orange">{o.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${fresh ? 'bg-amber-500/15 text-amber-400 animate-pulse' : o.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white mt-2 truncate">{o.storeName}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">👤 {o.customerName} · 🛵 {o.driverId || 'Assigning rider…'}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-brand-border/40">
                    <span className="font-mono font-black text-emerald-400 text-xs">৳{o.amount.toLocaleString()}</span>
                    <span className="text-[9px] text-gray-500 font-mono">{o.time || o.date}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 3: Original Top Drivers, Top Zones & Quick Actions */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isTightMode ? 'gap-3' : 'gap-6'}`}>
        {/* Top Drivers */}
        <div className={`bg-brand-card border border-brand-border rounded-xl shadow-sm ${isTightMode ? 'p-3.5' : 'p-5'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-100 text-sm">Top Drivers</h3>
            <button 
              onClick={() => onNavigate('Suppliers')}
              className="text-brand-orange hover:text-brand-orange-hover text-xs font-semibold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-brand-border/60 pb-2">
                  <th className="font-medium pb-2">Driver</th>
                  <th className="font-medium pb-2 text-right">Orders</th>
                  <th className="font-medium pb-2 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {drivers.slice(0, 5).map((driver) => (
                  <tr key={driver.id} className="hover:bg-brand-dark/20">
                    <td className={`${isTightMode ? 'py-1.5' : 'py-2.5'} pr-2`}>
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center font-bold text-brand-orange text-[10px]">
                          {initials(driver.name, 'DR')}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{safeText(driver.name, 'Driver')}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{safeText(driver.id, 'NO-ID')}</div>
          </div>
          {chartPeriod==='Custom' && <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="text-[10px] text-gray-400">From:</span>
            <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="px-3 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
            <input type="text" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} placeholder="DD/MM/YYYY" className="w-28 px-3 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
            <span className="text-[10px] text-gray-400">To:</span>
            <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="px-3 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
            <input type="text" value={customTo} onChange={e=>setCustomTo(e.target.value)} placeholder="DD/MM/YYYY" className="w-28 px-3 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
            <button onClick={()=>{setCustomFrom('');setCustomTo('');}} className="px-2 py-1.5 text-[10px] text-gray-400 hover:text-white border border-brand-border rounded cursor-pointer">✕</button>
            {customFrom && customTo && <span className="text-[10px] text-emerald-400 font-bold">✓ {customFrom} → {customTo} applied</span>}
          </div>}
        </div>
                    </td>
                    <td className={`${isTightMode ? 'py-1.5' : 'py-2.5'} text-right font-medium`}>
                      <div className="flex items-center justify-end space-x-1">
                        <span>{Number(driver.completedOrders || 0)}</span>
                        <span className="text-[10px] text-emerald-400">↑ {Math.max(0, Math.round((Number(driver.completedOrders) || 0) * 0.04))}</span>
                      </div>
                    </td>
                    <td className={`${isTightMode ? 'py-1.5' : 'py-2.5'} text-right text-white font-mono font-bold`}>
                      ৳ {Number(driver.earnings || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Zones */}
        <div className={`bg-brand-card border border-brand-border rounded-xl shadow-sm ${isTightMode ? 'p-3.5' : 'p-5'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-100 text-sm">Top Zones</h3>
            <button 
              onClick={() => onNavigate('Delivery Management')}
              className="text-brand-orange hover:text-brand-orange-hover text-xs font-semibold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-brand-border/60 pb-2">
                  <th className="font-medium pb-2">Zone</th>
                  <th className="font-medium pb-2 text-right">Orders</th>
                  <th className="font-medium pb-2 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {zones.slice(0, 5).map((zone) => (
                  <tr key={zone.id} className="hover:bg-brand-dark/20">
                    <td className={isTightMode ? 'py-2' : 'py-3'}>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                        <span className="font-semibold text-white">{zone.name}</span>
                      </div>
                    </td>
                    <td className={`py-3 text-right font-semibold text-gray-300 font-mono ${isTightMode ? 'py-2' : 'py-3'}`}>
                      {zone.ordersCount}
                    </td>
                    <td className={`py-3 text-right text-white font-mono font-bold ${isTightMode ? 'py-2' : 'py-3'}`}>
                      ৳ {zone.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`bg-brand-card border border-brand-border rounded-xl shadow-sm ${isTightMode ? 'p-3.5' : 'p-5'}`}>
          <h3 className="font-semibold text-gray-100 text-sm mb-4">Quick Actions</h3>
          <div className={`grid grid-cols-2 ${isTightMode ? 'gap-2' : 'gap-3'}`}>
            <button 
              onClick={() => onOpenQuickAction('driver')}
              className={`flex flex-col items-center justify-center rounded-lg bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border/80 hover:border-brand-orange/30 transition-all text-center group cursor-pointer ${isTightMode ? 'p-2' : 'p-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-orange-600/10 group-hover:bg-orange-600/20 text-brand-orange flex items-center justify-center mb-1.5 transition-colors">
                <UserPlus className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-200 group-hover:text-brand-orange">Add Driver</span>
            </button>

            <button 
              onClick={() => onOpenQuickAction('user')}
              className={`flex flex-col items-center justify-center rounded-lg bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border/80 hover:border-brand-orange/30 transition-all text-center group cursor-pointer ${isTightMode ? 'p-2' : 'p-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600/10 group-hover:bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-1.5 transition-colors">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-200 group-hover:text-brand-orange">Add User</span>
            </button>

            <button 
              onClick={() => onOpenQuickAction('zone')}
              className={`flex flex-col items-center justify-center rounded-lg bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border/80 hover:border-brand-orange/30 transition-all text-center group cursor-pointer ${isTightMode ? 'p-2' : 'p-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600/10 group-hover:bg-blue-600/20 text-blue-400 flex items-center justify-center mb-1.5 transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-200 group-hover:text-brand-orange">Add Zone</span>
            </button>

            <button 
              onClick={() => onOpenQuickAction('notification')}
              className={`flex flex-col items-center justify-center rounded-lg bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border/80 hover:border-brand-orange/30 transition-all text-center group cursor-pointer ${isTightMode ? 'p-2' : 'p-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-purple-600/10 group-hover:bg-purple-600/20 text-purple-400 flex items-center justify-center mb-1.5 transition-colors">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-200 group-hover:text-brand-orange">Send Alert</span>
            </button>

            <button 
              onClick={() => onOpenQuickAction('banner')}
              className={`flex flex-col items-center justify-center rounded-lg bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border/80 hover:border-brand-orange/30 transition-all text-center group cursor-pointer ${isTightMode ? 'p-2' : 'p-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-rose-600/10 group-hover:bg-rose-600/20 text-rose-400 flex items-center justify-center mb-1.5 transition-colors">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-200 group-hover:text-brand-orange">Add Banner</span>
            </button>

            <button 
              onClick={() => onNavigate('Reports')}
              className={`flex flex-col items-center justify-center rounded-lg bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border/80 hover:border-brand-orange/30 transition-all text-center group cursor-pointer ${isTightMode ? 'p-2' : 'p-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-yellow-600/10 group-hover:bg-yellow-600/20 text-yellow-400 flex items-center justify-center mb-1.5 transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-200 group-hover:text-brand-orange">View Reports</span>
            </button>

            <button 
              onClick={() => onNavigate('Support Tickets')}
              className={`flex flex-col items-center justify-center rounded-lg bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border/80 hover:border-brand-orange/30 transition-all text-center group cursor-pointer ${isTightMode ? 'p-2' : 'p-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-teal-600/10 group-hover:bg-teal-600/20 text-teal-400 flex items-center justify-center mb-1.5 transition-colors">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-200 group-hover:text-brand-orange">Tickets</span>
            </button>

            <button 
              onClick={() => onNavigate('Settings')}
              className={`flex flex-col items-center justify-center rounded-lg bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border/80 hover:border-brand-orange/30 transition-all text-center group cursor-pointer ${isTightMode ? 'p-2' : 'p-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-600/10 group-hover:bg-slate-600/20 text-slate-400 flex items-center justify-center mb-1.5 transition-colors">
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-200 group-hover:text-brand-orange">Settings</span>
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}


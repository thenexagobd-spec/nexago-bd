/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, 
  ShoppingBag, ChevronRight, UserCheck, Star, Wallet
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Order } from '../types';

interface StoreDashboardViewProps {
  orders: Order[];
  onNavigate: (tab: string) => void;
  productsCount?: number;
  categoriesCount?: number;
  customersCount?: number;
  reviewsCount?: number;
  isTightMode?: boolean;
}

export default function StoreDashboardView({
  orders,
  onNavigate,
  productsCount = 7,
  categoriesCount = 6,
  customersCount = 5,
  reviewsCount = 3,
  isTightMode = false
}: StoreDashboardViewProps) {
  // Chart Hover State
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'Daily'|'Monthly'|'Yearly'|'Custom'>('Daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Hardcoded chart data based on the screenshot
  const chartDays = ['May 20', 'May 21', 'May 22', 'May 23', 'May 24', 'May 25', 'May 26'];
  const chartData = [
    { completed: 250, ongoing: 100, cancelled: 25 },
    { completed: 290, ongoing: 110, cancelled: 30 },
    { completed: 370, ongoing: 120, cancelled: 25 },
    { completed: 430, ongoing: 150, cancelled: 35 },
    { completed: 390, ongoing: 130, cancelled: 20 },
    { completed: 400, ongoing: 140, cancelled: 30 },
    { completed: 350, ongoing: 120, cancelled: 28 },
  ];

  // SVG dimensions
  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 20;

  // Helper to map values to SVG coordinates
  const getX = (index: number) => paddingX + (index * (width - paddingX * 2)) / (chartDays.length - 1);
  const getY = (val: number) => height - paddingY - (val * (height - paddingY * 2)) / 500;

  // Dynamic store overview counters synced with state additions
  const dispProductsCount = productsCount;
  const dispCategoriesCount = categoriesCount;
  const dispCustomersCount = customersCount;
  const dispReviewsCount = reviewsCount;

  return (
    <div className={`${isTightMode ? 'space-y-3' : 'space-y-6'} fade-in`}>
      {/* 6 Stats Cards Row matching screenshot exactly */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 ${isTightMode ? 'gap-2.5' : 'gap-4'}`}>
        {/* Total Sales */}
        <div 
          onClick={() => onNavigate('Payments')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Sales</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>৳ 125,430.00</h3>
            <div className="flex items-center text-[10px] text-gray-400 font-medium">
              <span className="text-gray-500">vs last 7 days</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0`}>
            <span className={`${isTightMode ? 'text-sm' : 'text-lg'} font-bold`}>৳</span>
          </div>
        </div>

        {/* Total Orders */}
        <div 
          onClick={() => onNavigate('Orders')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Orders</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>1,248</h3>
            <div className="flex items-center text-[10px] text-emerald-400 font-medium">
              <TrendingUp className="w-2.5 shrink-0 mr-0.5" />
              <span>12.5%</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0`}>
            <ShoppingBag className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>

        {/* Completed Orders */}
        <div 
          onClick={() => onNavigate('Orders')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Completed</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>980</h3>
            <div className="flex items-center text-[10px] text-emerald-400 font-medium">
              <TrendingUp className="w-2.5 shrink-0 mr-0.5" />
              <span>15.3%</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0`}>
            <CheckCircle className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>

        {/* Ongoing/Pending Orders */}
        <div 
          onClick={() => onNavigate('Orders')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pending Orders</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>156</h3>
            <div className="flex items-center text-[10px] text-red-400 font-medium">
              <TrendingDown className="w-2.5 shrink-0 mr-0.5" />
              <span>5.8%</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-brand-orange shrink-0`}>
            <Clock className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>

        {/* Cancelled Orders */}
        <div 
          onClick={() => onNavigate('Orders')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cancelled</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>112</h3>
            <div className="flex items-center text-[10px] text-red-400 font-medium">
              <TrendingDown className="w-2.5 shrink-0 mr-0.5" />
              <span>2.1%</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0`}>
            <XCircle className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>

        {/* Total Customers */}
        <div 
          onClick={() => onNavigate('Customers')}
          className={`bg-brand-card border border-brand-border rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-orange/45 transition-all ${isTightMode ? 'p-3' : 'p-4'}`}
        >
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Customers</p>
            <h3 className={`${isTightMode ? 'text-lg' : 'text-xl'} font-bold text-white tracking-tight`}>{dispCustomersCount.toLocaleString()}</h3>
            <div className="flex items-center text-[10px] text-emerald-400 font-medium">
              <TrendingUp className="w-2.5 shrink-0 mr-0.5" />
              <span>8.4%</span>
            </div>
          </div>
          <div className={`${isTightMode ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0`}>
            <UserCheck className={`${isTightMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
        </div>
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
              chartPeriod==='Daily'?[{ day:'Mon', revenue:12500, orders:18 },{ day:'Tue', revenue:18900, orders:24 },{ day:'Wed', revenue:15200, orders:20 },{ day:'Thu', revenue:22400, orders:31 },{ day:'Fri', revenue:19800, orders:26 },{ day:'Sat', revenue:27100, orders:38 },{ day:'Sun', revenue:21500, orders:29 }]:
              chartPeriod==='Monthly'?[{ day:'Jan', revenue:285000, orders:420 },{ day:'Feb', revenue:310000, orders:450 },{ day:'Mar', revenue:295000, orders:430 },{ day:'Apr', revenue:340000, orders:480 },{ day:'May', revenue:380000, orders:520 },{ day:'Jun', revenue:420000, orders:580 }]:
              chartPeriod==='Yearly'?[{ day:'2020', revenue:2.8, orders:4200 },{ day:'2021', revenue:3.5, orders:5100 },{ day:'2022', revenue:4.2, orders:6200 },{ day:'2023', revenue:5.1, orders:7400 },{ day:'2024', revenue:6.0, orders:8500 },{ day:'2025', revenue:6.8, orders:9600 }]:
              (customFrom&&customTo)?(()=>{const m=(new Date(customTo).getTime()-new Date(customFrom).getTime())/(86400000);const n=Math.min(12,Math.max(2,Math.ceil(Math.abs(m)/7)));return Array.from({length:n},(_,i)=>{const d=new Date(customFrom);d.setDate(d.getDate()+i*Math.ceil(Math.abs(m)/n));return {day:d.toLocaleDateString('en-US',{month:'short',day:'numeric'}),revenue:Math.round(15000+Math.random()*20000),orders:Math.round(15+Math.random()*25)};});})():
              [{ day:'Q1', revenue:890000, orders:1250 },{ day:'Q2', revenue:1050000, orders:1480 },{ day:'Q3', revenue:980000, orders:1350 },{ day:'Q4', revenue:1200000, orders:1680 }]
            }>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/><stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/></linearGradient>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
              <YAxis yAxisId="left" stroke="#f97316" fontSize={11} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} />
              <Tooltip contentStyle={{backgroundColor:'#0f172a',borderColor:'#334155',borderRadius:'8px',fontSize:'12px'}} formatter={(v:any,n:string)=>[n==='Revenue'?`৳${Number(v).toLocaleString()}`:v,n]} />
              <Legend wrapperStyle={{fontSize:'11px'}} />
              <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#f97316" fill="url(#revGrad)" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" fill="url(#ordGrad)" strokeWidth={2} />
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


      {/* Row 3: Top Selling Products, Orders by Status & Store Overview matching screenshot perfectly */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isTightMode ? 'gap-3' : 'gap-6'}`}>
        {/* Top Selling Products */}
        <div className={`bg-brand-card border border-brand-border rounded-xl shadow-sm ${isTightMode ? 'p-3.5' : 'p-5'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-100 text-sm">Top Selling Products</h3>
            <button 
              onClick={() => onNavigate('Products')}
              className="text-brand-orange hover:text-brand-orange-hover text-xs font-semibold hover:underline"
            >
              View All
            </button>
          </div>

          <div className={isTightMode ? 'space-y-2' : 'space-y-3.5'}>
            {[
              { rank: 1, name: 'Chicken Burger', orders: '245 Orders', revenue: '৳ 24,500.00', color: 'text-amber-500 bg-amber-500/10 border-amber-500/35' },
              { rank: 2, name: 'Beef Pizza', orders: '198 Orders', revenue: '৳ 19,800.00', color: 'text-slate-300 bg-slate-500/10 border-slate-500/25' },
              { rank: 3, name: 'Cheese Sandwich', orders: '168 Orders', revenue: '৳ 16,800.00', color: 'text-orange-400 bg-orange-500/10 border-orange-500/25' },
              { rank: 4, name: 'French Fries', orders: '154 Orders', revenue: '৳ 10,780.00', color: 'text-gray-400 bg-gray-500/10 border-gray-500/15' },
              { rank: 5, name: 'Iced Coffee', orders: '142 Orders', revenue: '৳ 9,450.00', color: 'text-gray-400 bg-gray-500/10 border-gray-500/15' }
            ].map((prod) => (
              <div key={prod.rank} className="flex items-center justify-between p-2 rounded-lg hover:bg-brand-dark/20 transition-all border border-transparent hover:border-brand-border/40">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs ${prod.color}`}>
                    {prod.rank}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{prod.name}</h4>
                    <span className="text-[10px] text-emerald-400 font-semibold">{prod.orders}</span>
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
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white">{prod.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders by Status Circular Donut Chart */}
        <div className={`bg-brand-card border border-brand-border rounded-xl shadow-sm flex flex-col justify-between ${isTightMode ? 'p-3.5' : 'p-5'}`}>
          <div>
            <h3 className="font-semibold text-gray-100 text-sm mb-4">Orders by Status</h3>
            
            <div className="flex items-center justify-center space-x-6 py-4">
              {/* SVG Donut Chart */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  {/* Background Gray Ring */}
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="#102030" strokeWidth="12" />
                  
                  {/* Completed segment (Green) - 78.5% of circumference (2 * Math.PI * 50 = 314.16) */}
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="transparent" 
                    stroke="#10b981" 
                    strokeWidth="12" 
                    strokeDasharray="246.6 314.16"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  
                  {/* Ongoing segment (Blue) - 12.5% of circumference (39.3) */}
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="transparent" 
                    stroke="#3b82f6" 
                    strokeWidth="12" 
                    strokeDasharray="39.3 314.16"
                    strokeDashoffset="-246.6"
                    strokeLinecap="round"
                  />
                  
                  {/* Cancelled segment (Orange/Red) - 9% of circumference (28.3) */}
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="transparent" 
                    stroke="#f97316" 
                    strokeWidth="12" 
                    strokeDasharray="28.3 314.16"
                    strokeDashoffset="-285.9"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute text-center">
                  <div className="text-lg font-black text-white font-mono leading-none">1,248</div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Total</div>
                </div>
              </div>

              {/* Legends Side List */}
              <div className="space-y-2">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] text-gray-300 font-semibold">Completed</span>
                  </div>
                  <span className="text-[11px] font-bold text-white font-mono pl-4">980 (78.5%)</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-[10px] text-gray-300 font-semibold">Ongoing</span>
                  </div>
                  <span className="text-[11px] font-bold text-white font-mono pl-4">156 (12.5%)</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span className="text-[10px] text-gray-300 font-semibold">Cancelled</span>
                  </div>
                  <span className="text-[11px] font-bold text-white font-mono pl-4">112 (9.0%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Store Overview with fully connected navigation click triggers */}
        <div className={`bg-brand-card border border-brand-border rounded-xl shadow-sm ${isTightMode ? 'p-3.5' : 'p-5'}`}>
          <h3 className="font-semibold text-gray-100 text-sm mb-4">Store Overview</h3>
          
          <div className={isTightMode ? 'space-y-1.5' : 'space-y-2.5'}>
            {/* Products Row */}
            <div 
              onClick={() => onNavigate('Products')}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-dark/40 hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600/10 text-purple-400 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">📦</span>
                </div>
                <span className="text-xs font-semibold text-gray-200 group-hover:text-white">Products</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white font-mono">{dispProductsCount}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-orange" />
              </div>
            </div>

            {/* Categories Row */}
            <div 
              onClick={() => onNavigate('Categories')}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-dark/40 hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">📂</span>
                </div>
                <span className="text-xs font-semibold text-gray-200 group-hover:text-white">Categories</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white font-mono">{dispCategoriesCount}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-orange" />
              </div>
            </div>

            {/* Customers Row */}
            <div 
              onClick={() => onNavigate('Customers')}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-dark/40 hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">👥</span>
                </div>
                <span className="text-xs font-semibold text-gray-200 group-hover:text-white">Customers</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white font-mono">{dispCustomersCount.toLocaleString()}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-orange" />
              </div>
            </div>

            {/* Reviews Row */}
            <div 
              onClick={() => onNavigate('Reviews')}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-dark/40 hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-600/10 text-yellow-400 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">⭐</span>
                </div>
                <span className="text-xs font-semibold text-gray-200 group-hover:text-white">Reviews</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white font-mono">{dispReviewsCount}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-orange" />
              </div>
            </div>

            {/* Average Rating Row */}
            <div 
              onClick={() => onNavigate('Reviews')}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-dark/40 hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">📈</span>
                </div>
                <span className="text-xs font-semibold text-gray-200 group-hover:text-white">Average Rating</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white font-mono">4.6 / 5</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-orange" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Zone } from '../types';
import LeafletMap, { REAL_SPOTS, nearestRoad, MAJOR_ROADS } from './LeafletMap';
import { LiveDriverSim } from '../hooks/useLiveDrivers';
import { MapPin, Plus, Search, CheckCircle, AlertCircle, Trash2, X, Edit2, Users, Clock, Route, Package, Activity, Zap, TrendingUp, PencilLine, Save, Shield, Award, Download, Star, Percent, Building2, Settings2, Timer, Navigation, Ruler, Crosshair, Bike, Car, Truck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from 'recharts';

interface ZonesViewProps {
  zones: Zone[];
  liveDrivers: LiveDriverSim[];
  locSim: boolean;
  onToggleLocSim: () => void;
  simTick: number;
  onAddZone: (zone: Omit<Zone, 'id' | 'ordersCount' | 'earnings'>) => void;
  onUpdateZone: (zone: Zone) => void;
  onDeleteZone: (id: string) => void;
}

const fmt = (n: number) => '৳' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VehIcon = ({ v, color }: { v?: string; color: string }) => {
  const cls = `w-4 h-4`;
  if ((v || '').toLowerCase().includes('van') || (v || '').toLowerCase().includes('truck')) return <Truck className={cls} color={color} strokeWidth={2.4} />;
  if ((v || '').toLowerCase().includes('car')) return <Car className={cls} color={color} strokeWidth={2.4} />;
  return <Bike className={cls} color={color} strokeWidth={2.4} />;
};

const BikeV: React.FC<{ color: string }> = ({ color }) => (
  <svg width="30" height="19" viewBox="0 0 48 28" style={{ display: 'block' }}>
    <circle cx="10" cy="21" r="6" fill="#0b1220" stroke="#94a3b8" strokeWidth="2"/>
    <circle cx="10" cy="21" r="2.6" fill="#cbd5e1"/>
    <circle cx="38" cy="21" r="6" fill="#0b1220" stroke="#94a3b8" strokeWidth="2"/>
    <circle cx="38" cy="21" r="2.6" fill="#cbd5e1"/>
    <path d="M10 20 L13 14 L19 9.5 L25 8.5 L31 12.5 L37 17 L38 20" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M24 8.5 L27 15 L35 17.5" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="21" y="7.5" width="10" height="3.4" rx="1.7" fill={color}/>
    <rect x="13" y="11.5" width="11" height="4.2" rx="2.1" fill={color}/>
    <rect x="14.5" y="12.5" width="8" height="2.4" rx="1.2" fill="#0f172a" opacity="0.4"/>
    <path d="M22.5 6.2 Q26 3.8 29.5 6.2 L33 7.6" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="34.5" y="13" width="6" height="4.4" rx="2.2" fill="#fde047" stroke="#f59e0b" strokeWidth="0.8"/>
  </svg>
);

const CarV: React.FC<{ color: string }> = ({ color }) => (
  <svg width="30" height="16" viewBox="0 0 56 28" style={{ display: 'block' }}>
    <circle cx="13" cy="21" r="5.8" fill="#0b1220" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="13" cy="21" r="2.2" fill="#94a3b8"/>
    <circle cx="43" cy="21" r="5.8" fill="#0b1220" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="43" cy="21" r="2.2" fill="#94a3b8"/>
    <path d="M8 18 L13 9.5 Q14.5 6.5 18 6.5 L36 6.5 Q40.5 6.5 42 9.5 L48 18 Q49.5 20 47 21 L9 21 Q6.5 21 8 18 Z" fill={color}/>
    <path d="M16 9.5 Q16.5 8 18 8 L27 8 L28.5 12 L17.5 12 Z" fill="#0f172a" opacity="0.55"/>
    <path d="M30 8 L36 8 Q38.5 8 39.5 9.5 L40.5 12 L31 12 Z" fill="#0f172a" opacity="0.55"/>
    <path d="M9 18.5 Q14 16.5 20 16.5 L40 16.5 Q46 16.5 47 18.5 L47 19.5 Q45.5 20.5 42 20.5 L14 20.5 Q10.5 20.5 9 18.5 Z" fill="#0b1220" opacity="0.3"/>
    <circle cx="33" cy="13.5" r="0.9" fill="#0b1220"/>
    <circle cx="41.5" cy="13.5" r="0.9" fill="#0b1220"/>
  </svg>
);

const TruckV: React.FC<{ color: string }> = ({ color }) => (
  <svg width="32" height="15" viewBox="0 0 64 28" style={{ display: 'block' }}>
    <circle cx="12" cy="21" r="5.8" fill="#0b1220" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="12" cy="21" r="2.2" fill="#94a3b8"/>
    <circle cx="30" cy="21" r="5.8" fill="#0b1220" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="30" cy="21" r="2.2" fill="#94a3b8"/>
    <circle cx="52" cy="21" r="5.8" fill="#0b1220" stroke="#334155" strokeWidth="1.2"/>
    <circle cx="52" cy="21" r="2.2" fill="#94a3b8"/>
    <rect x="8" y="9.5" width="24" height="11" rx="1.5" fill={color}/>
    <rect x="13" y="12" width="4" height="3" rx="0.8" fill="#0b1220" opacity="0.4"/>
    <rect x="22" y="12" width="4" height="3" rx="0.8" fill="#0b1220" opacity="0.4"/>
    <rect x="33" y="8" width="22" height="12.5" rx="1.5" fill={color}/>
    <rect x="34.5" y="9.5" width="19" height="4.5" rx="1" fill="#0f172a" opacity="0.45"/>
    <path d="M34 21 L30 21 L30 15 L34 15 Z" fill="#0b1220" opacity="0.4"/>
  </svg>
);

const RealVeh: React.FC<{ v?: string; color: string }> = ({ v, color }) => {
  const t = (v || '').toLowerCase();
  if (t.includes('van') || t.includes('truck')) return <TruckV color={color} />;
  if (t.includes('car')) return <CarV color={color} />;
  return <BikeV color={color} />;
};

const destColor: Record<string, string> = { Customer: '#34d399', Restaurant: '#f97316', Base: '#60a5fa', Idle: '#f87171' };
const destLabel: Record<string, string> = { Customer: '→ Customer', Restaurant: '→ Restaurant', Base: '→ Base', Idle: 'Resting' };

const DriverMarker: React.FC<{ x: number; y: number; tx?: number; ty?: number; name: string; status: string; vehicleType?: string; dest?: string; speed?: number; onClick?: (e: any) => void }> = ({ x, y, tx, ty, name, status, vehicleType, dest, speed, onClick }) => {
  const dc = status === 'Active' || status === 'On-Delivery' ? '#34d399' : status === 'Idle' ? '#facc15' : '#f87171';
  const dd = dest ? destColor[dest] || dc : dc;
  const initials = name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  const avatarBg = ['#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#f87171', '#22d3ee', '#4ade80'][Math.abs(name.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)) % 8];
  return (
    <g onClick={e => { e.stopPropagation(); if (onClick) onClick(dest); }} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
      {tx != null && ty != null && <line x1={x} y1={y} x2={tx} y2={ty} stroke={dd} strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>}
      <circle cx={x} cy={y} r={13} fill={dd} fillOpacity="0.15"><animate attributeName="r" values="11;18;11" dur="2.2s" repeatCount="indefinite"/></circle>
      <g transform={`translate(${x},${y}) translate(${-15},${-9})`}>
        <RealVeh v={vehicleType} color={dd} />
      </g>
      <circle cx={x} cy={y - 14} r={7} fill={avatarBg} stroke="#0f172a" strokeWidth={1.5}/>
      <circle cx={x} cy={y - 14} r={7} fill="none" stroke={dd} strokeWidth={1}/>
      <text x={x} y={y - 11} fontSize="6.5" fontWeight={900} fill="#0f172a" textAnchor="middle">{initials}</text>
      <ellipse cx={x} cy={y + 9} rx={8} ry={2.2} fill="#000" opacity="0.25"/>
      <text x={x + 14} y={y - 11} fontSize="8" fontWeight={800} fill="#e2e8f0" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{name.split(' ')[0]}</text>
      {dest && speed != null && (
        <g>
          <rect x={x + 14} y={y + 6} width="86" height="16" rx="5" fill="rgba(2,6,23,0.88)"/>
          <text x={x + 18} y={y + 17} fontSize="7.5" fontWeight={800} fill={dd}>{destLabel[dest] || dest}</text>
          <text x={x + 84} y={y + 17} fontSize="7.5" fontWeight={800} fill="#fff">{Math.round(speed)} km/h</text>
        </g>
      )}
    </g>
  );
};

export default function ZonesView({ zones, liveDrivers, locSim, onToggleLocSim, simTick, onAddZone, onUpdateZone, onDeleteZone }: ZonesViewProps) {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [detailZone, setDetailZone] = useState<Zone | null>(null);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [view, setView] = useState<'cards' | 'chart' | 'map' | 'live' | 'google'>('cards');
  const [driverName, setDriverName] = useState('');
  const [ef, setEf] = useState<{ deliveryFee: number; minOrder: number; operatingHours: string; coveragePct: number }>({ deliveryFee: 50, minOrder: 100, operatingHours: '9AM-11PM', coveragePct: 100 });
  const [livePts, setLivePts] = useState<{ x: number; y: number }[]>([]);
  const [liveName, setLiveName] = useState('');
  const [selZone, setSelZone] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showDrivers, setShowDrivers] = useState(true);
  const [measurePts, setMeasurePts] = useState<{ x: number; y: number }[]>([]);
  const [showCoords, setShowCoords] = useState<string | null>(null);
  const [clicked, setClicked] = useState<{ x: number; y: number } | null>(null);
  const [selDriver, setSelDriver] = useState<any>(null);
  const [driverPanel, setDriverPanel] = useState<any>(null);
  const [mapZoom, setMapZoom] = useState(12);
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const polyArea = (pts: { x: number; y: number }[]) => { if (pts.length < 3) return 0; let area = 0; for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; area += pts[i].x * pts[j].y; area -= pts[j].x * pts[i].y; } return Math.abs(area) / 2; };
  const polyCenter = (pts: { x: number; y: number }[]) => { if (pts.length === 0) return { x: 0, y: 0 }; const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length; const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length; return { x: Math.round(cx), y: Math.round(cy) }; };
  const zoomIn = () => setZoom(z => Math.min(3.5, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.6, +(z - 0.25).toFixed(2)));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const zoomToPoint = (p: { x: number; y: number }, factor: number) => {
    setZoom(z => { const nz = Math.max(0.6, Math.min(3.5, z * factor)); const k = nz / z; setPan(pan0 => ({ x: 210 - (210 - pan0.x) * k, y: 150 - (150 - pan0.y) * k })); return nz; });
  };
  const mapCoord = (clientX: number, clientY: number, rect: DOMRect) => {
    const rawX = ((clientX - rect.left) / rect.width) * 420;
    const rawY = ((clientY - rect.top) / rect.height) * 300;
    const x = (rawX - pan.x) / zoom;
    const y = (rawY - pan.y) / zoom;
    return { x: Math.round(x), y: Math.round(y) };
  };

  const filteredZones = zones.filter(zone => {
    const m = zone.name.toLowerCase().includes(search.toLowerCase());
    return m && (filter === 'All' || zone.status === filter);
  });

  const activeCount = zones.filter(z => z.status === 'Active').length;
  const totalOrders = zones.reduce((s, z) => s + (z.ordersCount || 0), 0);
  const totalEarnings = zones.reduce((s, z) => s + (z.earnings || 0), 0);
  const totalPending = zones.reduce((s, z) => s + (z.pendingOrders || 0), 0);
  const totalDrivers = zones.reduce((s, z) => s + (z.activeDrivers || 0), 0);
  const avgDelivery = zones.length > 0 ? Math.round(zones.reduce((s, z) => s + (z.avgDeliveryMin || 0), 0) / zones.length) : 0;
  const bestZone = zones.length > 0 ? zones.reduce((a, b) => (b.ordersCount || 0) > (a.ordersCount || 0) ? b : a) : null;

  const chartData = filteredZones.length > 0 ? filteredZones : zones;
  const pieData = chartData.map(z => ({ name: z.name, value: z.ordersCount || 0 }));
  const barColors = ['#f97316', '#34d399', '#60a5fa', '#facc15', '#a78bfa', '#f472b6', '#22d3ee', '#fb7185'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddZone({ name: name.trim(), status, pendingOrders: 0, activeDrivers: 0, avgDeliveryMin: 0, totalKm: 0, coveragePct: 100, drivers: [], deliveryFee: 50, minOrder: 100, operatingHours: '9AM-11PM', peakHourOrders: 0, returnRate: 0, satisfaction: 90 });
    setName('');
    setStatus('Active');
    setIsAddOpen(false);
  };

  const toggleStatus = (zone: Zone) => {
    onUpdateZone({ ...zone, status: zone.status === 'Active' ? 'Inactive' : 'Active' });
  };

  const saveEdit = () => {
    if (!editId) return;
    const z = zones.find(x => x.id === editId);
    if (!z) return;
    onUpdateZone({ ...z, name: editName.trim() || z.name, status: editStatus, deliveryFee: ef.deliveryFee, minOrder: ef.minOrder, operatingHours: ef.operatingHours, coveragePct: ef.coveragePct });
    setEditId(null);
  };

  const assignDriver = (zone: Zone) => {
    if (!driverName.trim()) return;
    const list = zone.drivers ? [...zone.drivers, driverName.trim()] : [driverName.trim()];
    onUpdateZone({ ...zone, drivers: list, activeDrivers: (zone.activeDrivers || 0) + 1 });
    setDriverName('');
  };

  const boostOrders = (zone: Zone) => {
    onUpdateZone({ ...zone, ordersCount: (zone.ordersCount || 0) + 10, earnings: (zone.earnings || 0) + 750, pendingOrders: (zone.pendingOrders || 0) - 2 });
  };

  const markComplete = (zone: Zone) => {
    onUpdateZone({ ...zone, pendingOrders: Math.max(0, (zone.pendingOrders || 0) - 5), ordersCount: (zone.ordersCount || 0) + 5, earnings: (zone.earnings || 0) + 350 });
  };

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-brand-orange"/>Zones & Coverage Areas</h2>
          <p className="text-xs text-gray-400">Configure and monitor delivery zones in metropolitan Dhaka</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-brand-dark border border-brand-border rounded-lg p-0.5">
            <button onClick={() => setView('cards')} className={`px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${view === 'cards' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'}`}>Cards</button>
            <button onClick={() => setView('chart')} className={`px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${view === 'chart' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'}`}>Analytics</button>
            <button onClick={() => setView('map')} className={`px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${view === 'map' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'}`}>Coverage Map</button>
            <button onClick={() => setView('live')} className={`px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${view === 'live' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'}`}>Live Draw</button>
            <button onClick={() => setView('google')} className={`px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${view === 'google' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'}`}>Live Road Map</button>
          </div>
          <button onClick={() => { const csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent('Zone,Status,Orders,Earnings,Pending,Drivers,AvgMin,TotalKm,Fee,MinOrder,Satisfaction\n' + zones.map(z => `${z.name},${z.status},${z.ordersCount},${z.earnings},${z.pendingOrders ?? 0},${z.activeDrivers ?? 0},${z.avgDeliveryMin ?? 0},${z.totalKm ?? 0},${z.deliveryFee ?? 0},${z.minOrder ?? 0},${z.satisfaction ?? 0}`).join('\n')); const l = document.createElement('a'); l.href = csv; l.download = 'zones_report.csv'; l.click(); }} className="flex items-center space-x-1.5 px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0"><Download className="w-3.5 h-3.5"/><span>Export</span></button>
          <button onClick={() => setIsAddOpen(true)} className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add Coverage Zone</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { l: 'Total Zones', v: zones.length, c: 'orange' },
          { l: 'Active', v: activeCount, c: 'emerald' },
          { l: 'Inactive', v: zones.length - activeCount, c: 'red' },
          { l: 'Orders', v: totalOrders.toLocaleString(), c: 'blue' },
          { l: 'Earnings', v: fmt(totalEarnings), c: 'emerald' },
          { l: 'Pending', v: totalPending, c: 'amber' },
          { l: 'Drivers', v: totalDrivers, c: 'blue' },
          { l: 'Avg Time', v: avgDelivery + 'm', c: 'orange' }
        ].map(x => (
          <div key={x.l} className="bg-brand-card border border-brand-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-black">{x.l}</p>
            <p className={`text-lg font-black mt-0.5 ${x.c === 'emerald' ? 'text-emerald-400' : x.c === 'blue' ? 'text-blue-400' : x.c === 'amber' ? 'text-amber-400' : x.c === 'red' ? 'text-red-400' : 'text-brand-orange'}`}>{x.v}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-xl p-3">
        <Search className="w-4 h-4 text-gray-400"/>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search zones by name..." className="bg-transparent text-xs text-white outline-none flex-1"/>
        <div className="flex items-center space-x-1">{['All', 'Active', 'Inactive'].map(p => (
          <button key={p} onClick={() => setFilter(p as any)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${filter === p ? 'bg-brand-orange text-white' : 'bg-brand-dark/50 text-gray-400 hover:text-white'}`}>{p}</button>
        ))}</div>
        {bestZone && <span className="text-[10px] text-emerald-400 font-bold hidden md:flex items-center gap-1"><Award className="w-3 h-3"/>Top: {bestZone.name} ({bestZone.ordersCount})</span>}
      </div>

      {/* Analytics view */}
      {view === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><BarChart className="w-4 h-4 text-brand-orange"/>Orders by Zone</h3>
            <div style={{ height: 300, minHeight: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.map(z => ({ name: z.name, orders: z.ordersCount || 0, earnings: Math.round((z.earnings || 0) / 100) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a5c" strokeWidth={0.5}/>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }}/>
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }}/>
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', fontSize: '12px', color: '#fff' }} labelStyle={{ color: '#f97316', fontWeight: 800 }} formatter={(v: any) => [v, 'Orders']}/>
                  <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm self-start">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-blue-400"/>Market Share</h3>
            <div style={{ height: 200, minHeight: 200, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', fontSize: '12px', color: '#fff' }} formatter={(v: any, n: any) => [v + ' orders', n]}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Coverage Map view */}
      {view === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-brand-orange"/>Dhaka Metro Coverage Grid</h3>
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: 8 * 6 }).map((_, i) => {
                const idx = i % zones.length;
                const z = zones[idx];
                const active = z.status === 'Active';
                return (
                  <div key={i} className="aspect-square rounded-md border border-white/5 flex items-center justify-center text-[8px] font-bold transition-all hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: active ? barColors[idx % barColors.length] + '22' : '#1e293b', color: active ? barColors[idx % barColors.length] : '#475569' }}
                    title={`${z.name} · ${z.ordersCount} orders`}>
                    {z.name.slice(0, 3).toUpperCase()}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {zones.map((z, i) => (
                <span key={z.id} className="flex items-center gap-1.5 text-[9px] text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: barColors[i % barColors.length] + '55' }}></span>
                  {z.name} <span className="font-bold" style={{ color: barColors[i % barColors.length] }}>{z.coveragePct ?? 0}%</span>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm self-start">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Star className="w-4 h-4 text-amber-400"/>Zone Leaderboard</h3>
              <div className="space-y-2">
                {[...zones].sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0)).map((z, i) => (
                  <div key={z.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-white/5 text-gray-500'}`}>{i + 1}</span>
                      <span className="text-[11px] font-bold text-white">{z.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-brand-orange">{z.ordersCount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Percent className="w-4 h-4 text-blue-400"/>Satisfaction & Returns</h3>
              <div className="space-y-3">
                {zones.map(z => (
                  <div key={z.id}>
                    <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400">{z.name}</span><span className="font-bold text-emerald-400">{z.satisfaction ?? 0}%</span></div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${z.satisfaction ?? 0}%` }}></div></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {zones.map(z => (
                  <div key={z.id} className="flex justify-between text-[10px]"><span className="text-gray-400">{z.name}</span><span className={`font-bold ${(z.returnRate ?? 0) > 1.5 ? 'text-red-400' : 'text-emerald-400'}`}>{z.returnRate ?? 0}% returns</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

            {/* Google Map view */}
      {view === 'google' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-orange"/>Dhaka Live Road Map</h3>
              <div className="flex items-center gap-1.5">
                <button onClick={onToggleLocSim} className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition-all border ${locSim ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-brand-dark text-gray-400 border-brand-border hover:text-white'}`}>{locSim ? 'Live GPS ●' : 'GPS Off'}</button>
                <button onClick={() => setShowDrivers(d => !d)} className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition-all border ${showDrivers ? 'bg-blue-500/15 text-blue-400 border-blue-500/40' : 'bg-brand-dark text-gray-400 border-brand-border hover:text-white'}`}>Drivers</button>
              </div>
            </div>
            <div className="relative z-0 rounded-xl overflow-hidden border border-brand-border/60" style={{ height: 460 }}>
              <div className="absolute top-2 right-2 z-[500] flex gap-1.5">
                <button onClick={() => setMapZoom(11)} className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer border transition-all ${mapZoom === 11 ? 'bg-brand-orange text-white border-brand-orange' : 'bg-brand-dark/90 text-gray-300 border-brand-border'}`}>City</button>
                <button onClick={() => setMapZoom(13)} className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer border transition-all ${mapZoom === 13 ? 'bg-brand-orange text-white border-brand-orange' : 'bg-brand-dark/90 text-gray-300 border-brand-border'}`}>District</button>
                <button onClick={() => setMapZoom(15.5)} className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer border transition-all ${mapZoom === 15.5 ? 'bg-brand-orange text-white border-brand-orange' : 'bg-brand-dark/90 text-gray-300 border-brand-border'}`}>Street</button>
              </div>
              <LeafletMap vehicles={showDrivers ? liveDrivers.map(d => ({ id: d.id, name: d.name, status: d.status, vehicleType: d.vehicleType, dest: d.dest, speed: d.speed, lat: d.lat, lng: d.lng, tLat: d.tLat, tLng: d.tLng, roadName: d.roadName, restLat: d.restLat, restLng: d.restLng, restName: d.restName, custLat: d.custLat, custLng: d.custLng, custName: d.custName })) : []} zoomTo={mapZoom} onVehicleClick={id => { const d = liveDrivers.find(x => x.id === id); if (d) setDriverPanel(d); }} />
              <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5 z-[500]">
                {locSim && <span className="bg-emerald-500/80 px-2 py-1 rounded text-[9px] text-white font-bold animate-pulse">● LIVE GPS</span>}
                <span className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[9px] text-white font-bold">{liveDrivers.length} drivers live</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4">
              <input type="text" value={liveName} onChange={e => setLiveName(e.target.value)} placeholder="Zone-এর নাম দিন (e.g. Motijheel, Badda, Khilgaon)" className="flex-1 px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"/>
              <div className="flex items-center gap-2">
                <button onClick={() => setLivePts(p => p.slice(0, -1))} className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 rounded text-[10px] font-bold cursor-pointer disabled:opacity-40" disabled={livePts.length === 0}>Undo</button>
                <button onClick={() => setLivePts([])} className="px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded text-[10px] font-bold cursor-pointer disabled:opacity-40" disabled={livePts.length === 0}>Clear</button>
                <button onClick={() => setMeasurePts([])} className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded text-[10px] font-bold cursor-pointer disabled:opacity-40" disabled={measurePts.length === 0}>Clear Measure</button>
                <button onClick={() => { if (livePts.length >= 3 && liveName.trim()) { onAddZone({ name: liveName.trim(), status: 'Active', pendingOrders: 0, activeDrivers: 0, avgDeliveryMin: 0, totalKm: 0, coveragePct: 100, drivers: [], deliveryFee: 50, minOrder: 100, operatingHours: '9AM-11PM', peakHourOrders: 0, returnRate: 0, satisfaction: 90, coords: livePts }); setLivePts([]); setLiveName(''); } }} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer transition-all disabled:opacity-40" disabled={livePts.length < 3 || !liveName.trim()}><CheckCircle className="w-3 h-3 inline mr-1"/>Save Zone</button>
              </div>
            </div>
            {livePts.length > 0 && livePts.length < 3 && <p className="text-[10px] text-amber-400 mt-2">Zone বানাতে কমপক্ষে 3টা point দরকার ({livePts.length}/3)</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-center"><p className="text-[8px] text-gray-500 uppercase font-bold">Area</p><p className="text-sm font-black text-emerald-400">{livePts.length >= 3 ? Math.round(polyArea(livePts)) : '—'}</p></div>
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-center"><p className="text-[8px] text-gray-500 uppercase font-bold">Center</p><p className="text-sm font-black text-blue-400">{livePts.length >= 3 ? `${polyCenter(livePts).x},${polyCenter(livePts).y}` : '—'}</p></div>
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-center"><p className="text-[8px] text-gray-500 uppercase font-bold">Coords</p><p className="text-sm font-black text-white">{showCoords ? showCoords : '—'}</p></div>
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-center"><p className="text-[8px] text-gray-500 uppercase font-bold">Sim Tick</p><p className="text-sm font-black text-brand-orange">{simTick}</p></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Bike className="w-4 h-4 text-emerald-400"/>Live Fleet GPS</h3>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {liveDrivers.slice(0, 14).map(d => {
                  const dc = d.status === 'Active' || d.status === 'On-Delivery' ? 'text-emerald-400' : d.status === 'Idle' ? 'text-amber-400' : 'text-red-400';
                  const dcol = d.dest ? destColor[d.dest] || '#94a3b8' : '#94a3b8';
                  const rd = d.roadName || nearestRoad(d.lat, d.lng).name;
                  const initials = d.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
                  const avatarBg = ['#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#f87171', '#22d3ee', '#4ade80'][Math.abs(d.name.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)) % 8];
                  return (
                    <div key={d.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2 cursor-pointer" onClick={() => setDriverPanel(d)}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-[#0f172a] shrink-0" style={{ backgroundColor: avatarBg, border: `1.5px solid ${dcol}` }}>{initials}</span>
                        <span className="text-[10px] font-bold text-white">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold" style={{ color: dcol }}>{destLabel[d.dest || ''] || d.dest}</span>
                        <span className="text-[8px] font-mono text-gray-500">{Math.round(d.speed || 0)}km/h</span>
                      </div>
                      <span className="text-[8px] font-bold text-amber-300/80">{rd}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="flex items-center gap-1 text-[8px]" style={{ color: destColor.Customer }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: destColor.Customer }}></span>Customer</span>
                <span className="flex items-center gap-1 text-[8px]" style={{ color: destColor.Restaurant }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: destColor.Restaurant }}></span>Restaurant</span>
                <span className="flex items-center gap-1 text-[8px]" style={{ color: destColor.Base }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: destColor.Base }}></span>Base</span>
                <span className="flex items-center gap-1 text-[8px]" style={{ color: destColor.Idle }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: destColor.Idle }}></span>Idle</span>
              </div>
              <button onClick={onToggleLocSim} className="w-full mt-3 py-2 bg-brand-dark hover:bg-white/10 border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all">{locSim ? 'Stop GPS Simulation' : 'Start Live GPS Simulation'}</button>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><MapPin className="w-4 h-4 text-brand-orange"/>How it works</h3>
              <div className="space-y-2 text-[10px] text-gray-400">
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">1</span><b className="text-white">Draw</b> — click করে zone polygon বানান</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">2</span><b className="text-white">Pick</b> — click করলে real GPS coords (lat,lng) দেখাবে</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">3</span><b className="text-white">Measure</b> — click-click করে distance মাপুন</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">4</span><b className="text-white">GPS</b> — Start simulation করলে driver-রা নড়াচড়া করবে</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Live Tracking modal */}
      {driverPanel && (() => {
        const live = liveDrivers.find(x => x.id === driverPanel.id) || driverPanel;
        const d = live;
        const from = { lat: d.lat.toFixed(5), lng: d.lng.toFixed(5) };
        const to = { lat: d.tLat.toFixed(5), lng: d.tLng.toFixed(5) };
        const dlat = d.tLat - d.lat, dlng = d.tLng - d.lng;
        const dst = Math.sqrt(dlat * dlat + dlng * dlng);
        const km = (dst * 111).toFixed(1);
        const etaMin = d.speed > 0 ? Math.max(1, Math.round((parseFloat(km) / Math.max(d.speed, 5)) * 60)) : (d.dest === 'Idle' ? 0 : 12);
        const isIdle = d.dest === 'Idle';
        const near = REAL_SPOTS.map(s => ({ n: s[2], d: Math.sqrt((s[0] - d.lat) ** 2 + (s[1] - d.lng) ** 2) })).sort((a, b) => a.d - b.d)[0];
        const nearT = REAL_SPOTS.map(s => ({ n: s[2], d: Math.sqrt((s[0] - d.tLat) ** 2 + (s[1] - d.tLng) ** 2) })).sort((a, b) => a.d - b.d)[0];
        const curRoad = { name: d.roadName || nearestRoad(d.lat, d.lng).name };
        const goRoad = nearestRoad(d.tLat, d.tLng);
        const initials = d.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
        const avatarBg = ['#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#f87171', '#22d3ee', '#4ade80'][Math.abs(d.name.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)) % 8];
        return (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDriverPanel(null)}>
            <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-dark/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-[#0f172a] shrink-0" style={{ backgroundColor: avatarBg, border: `2px solid ${destColor[d.dest] || '#f97316'}` }}>{initials}</div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{d.name}</h3>
                    <p className="text-[9px] text-gray-500 font-mono">{d.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${d.status === 'Active' || d.status === 'On-Delivery' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : d.status === 'Idle' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{d.status}</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="relative z-0 rounded-lg overflow-hidden border border-brand-border/50" style={{ height: 170 }}>
                  <LeafletMap vehicles={[{ id: d.id, name: d.name, status: d.status, vehicleType: d.vehicleType, dest: d.dest, speed: d.speed, lat: d.lat, lng: d.lng, tLat: d.tLat, tLng: d.tLng, roadName: d.roadName, restLat: d.restLat, restLng: d.restLng, restName: d.restName, custLat: d.custLat, custLng: d.custLng, custName: d.custName }]} zoomTo={16} trackingId={d.id} />
                  <span className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[9px] text-white font-bold">📍 {from.lat}, {from.lng} · {near.n}</span>
                  <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold" style={{ color: destColor[d.dest] || '#f97316' }}>{destLabel[d.dest] || d.dest} → {nearT.n}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2"><p className="text-[8px] text-gray-500 uppercase font-bold">Speed</p><p className="text-sm font-black text-white">{Math.round(d.speed || 0)}<span className="text-[8px]">km/h</span></p></div>
                  <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2"><p className="text-[8px] text-gray-500 uppercase font-bold">Distance</p><p className="text-sm font-black text-brand-orange">{km} km</p></div>
                  <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2"><p className="text-[8px] text-gray-500 uppercase font-bold">ETA</p><p className="text-sm font-black text-emerald-400">{isIdle ? '—' : etaMin + ' min'}</p></div>
                  <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2"><p className="text-[8px] text-gray-500 uppercase font-bold">Dest</p><p className="text-sm font-black text-blue-400">{to.lat},{to.lng}</p></div>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-gray-300 mb-2 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-brand-orange"/>Live Status</p>
                  <div className="flex items-center justify-between gap-2 mb-2 text-[10px]">
                    <span className="text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 flex items-center gap-1">🛣 এখন আছে: <span className="text-white">{curRoad.name}</span></span>
                    <span className="text-blue-300 font-bold bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-1 flex items-center gap-1">🎯 যাচ্ছে: <span className="text-white">{goRoad.name}</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-[#2a1606]/50 border border-orange-500/30 rounded-lg p-2.5">
                      <p className="text-[8px] text-orange-300 font-bold uppercase flex items-center gap-1">🍽️ Restaurant</p>
                      <p className="text-[11px] font-black text-white mt-0.5">{d.restName || '—'}</p>
                      <p className="text-[8px] font-mono text-gray-500">📍 {d.restLat?.toFixed(5)}, {d.restLng?.toFixed(5)}</p>
                      <p className="text-[8px] text-orange-300 font-bold mt-0.5">{destLabel.Restaurant || '→ Restaurant'}</p>
                    </div>
                    <div className="bg-[#062a22]/50 border border-emerald-500/30 rounded-lg p-2.5">
                      <p className="text-[8px] text-emerald-300 font-bold uppercase flex items-center gap-1">🏠 Customer</p>
                      <p className="text-[11px] font-black text-white mt-0.5">{d.custName || '—'}</p>
                      <p className="text-[8px] font-mono text-gray-500">📍 {d.custLat?.toFixed(5)}, {d.custLng?.toFixed(5)}</p>
                      <p className="text-[8px] text-emerald-300 font-bold mt-0.5">{destLabel.Customer || '→ Customer'}</p>
                    </div>
                  </div>
                  {isIdle ? (
                    <p className="text-[10px] text-gray-400">🪑 Driver বর্তমানে <b className="text-red-400">বসে আছেন</b> — নতুন order এর জন্য অপেক্ষা করছেন</p>
                  ) : d.dest === 'Customer' ? (
                    <p className="text-[10px] text-gray-400">🛵 Driver <b className="text-emerald-400">customer-এর দিকে যাচ্ছেন</b> — <b className="text-emerald-400">{etaMin} min</b> এ পৌঁছাবেন</p>
                  ) : d.dest === 'Restaurant' ? (
                    <p className="text-[10px] text-gray-400">🍽️ Driver <b className="text-brand-orange">restaurant-এ যাচ্ছেন</b> order pick-up করতে — <b className="text-brand-orange">{etaMin} min</b></p>
                  ) : (
                    <p className="text-[10px] text-gray-400">🏠 Driver <b className="text-blue-400">base-এ ফিরছেন</b> — <b className="text-blue-400">{etaMin} min</b></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Live Draw map */}
      {view === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-orange"/>Live Zone Drawer</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">Click = mark · Drag = pan · Wheel = zoom</span>
                {livePts.length > 0 && <button onClick={() => setLivePts(p => p.slice(0, -1))} className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 rounded text-[9px] font-bold cursor-pointer">Undo</button>}
                {livePts.length > 0 && <button onClick={() => setLivePts([])} className="px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded text-[9px] font-bold cursor-pointer">Clear</button>}
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-brand-border/60" style={{ background: 'linear-gradient(180deg,#0a1122 0%,#0f1a33 60%,#0d1526 100%)' }}>
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                <button onClick={zoomIn} className="w-7 h-7 bg-brand-dark/90 hover:bg-brand-orange border border-brand-border/60 rounded text-white font-black text-sm cursor-pointer transition-all" title="Zoom In">+</button>
                <button onClick={zoomOut} className="w-7 h-7 bg-brand-dark/90 hover:bg-brand-orange border border-brand-border/60 rounded text-white font-black text-sm cursor-pointer transition-all" title="Zoom Out">−</button>
                <button onClick={resetView} className="w-7 h-7 bg-brand-dark/90 hover:bg-brand-orange border border-brand-border/60 rounded text-white text-[9px] font-black cursor-pointer transition-all" title="Reset View">⌂</button>
                <span className="w-7 text-center bg-brand-dark/70 border border-brand-border/40 rounded text-[9px] text-brand-orange font-bold py-0.5">{Math.round(zoom * 100)}%</span>
              </div>
              <svg viewBox="0 0 420 300" className="w-full h-auto block cursor-grab active:cursor-grabbing touch-none select-none"
                onClick={e => { if (dragging) { setDragging(false); return; } const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const p = mapCoord(e.clientX, e.clientY, rect); setLivePts(pts => [...pts, p]); }}
                onWheel={e => { const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const p = mapCoord(e.clientX, e.clientY, rect); zoomToPoint(p, e.deltaY < 0 ? 1.2 : 0.85); }}
                onPointerDown={e => { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); setDragStart({ x: e.clientX, y: e.clientY }); setDragging(false); }}
                onPointerMove={e => { if (dragStart) { const dx = e.clientX - dragStart.x; const dy = e.clientY - dragStart.y; if (!dragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) setDragging(true); if (dragging) { const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const sx = 420 / rect.width; const sy = 300 / rect.height; setPan(p => ({ x: p.x + dx * sx, y: p.y + dy * sy })); } setDragStart({ x: e.clientX, y: e.clientY }); } }}
                onPointerUp={() => { setDragStart(null); }}>
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                <defs>
                  <pattern id="gridP" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#1a2744" strokeWidth="0.4"/></pattern>
                </defs>
                <rect width="420" height="300" fill="url(#gridP)"/>
                <path d="M0,270 Q40,268 80,265 L150,285 Q210,298 280,282 L420,275 L420,300 L0,300 Z" fill="#0e2a3d" stroke="#1e4a66" strokeWidth="1"/>
                <text x="200" y="294" fontSize="9" fill="#3d7a9e" fontWeight={700} opacity="0.8" textAnchor="middle">Buriganga River</text>
                <path d="M70,0 Q65,40 80,75 Q95,110 75,150 Q60,185 85,220 Q100,245 90,270" fill="none" stroke="#334155" strokeWidth="6" opacity="0.6"/>
                <path d="M180,0 Q185,60 170,120 Q160,170 175,210 Q185,240 175,270" fill="none" stroke="#334155" strokeWidth="7" opacity="0.6"/>
                <path d="M270,0 Q265,45 275,95 Q285,145 270,200 Q262,240 278,270" fill="none" stroke="#334155" strokeWidth="7" opacity="0.6"/>
                <path d="M370,0 Q365,60 378,130 Q385,190 375,240 Q370,260 378,275" fill="none" stroke="#334155" strokeWidth="5" opacity="0.6"/>
                <path d="M0,60 Q105,55 210,62 Q315,68 420,58" fill="none" stroke="#334155" strokeWidth="6" opacity="0.6"/>
                <path d="M0,120 Q110,118 210,122 Q315,126 420,118" fill="none" stroke="#334155" strokeWidth="6" opacity="0.6"/>
                <path d="M0,180 Q120,178 210,184 Q315,190 420,182" fill="none" stroke="#334155" strokeWidth="6" opacity="0.6"/>
                <path d="M0,232 Q120,230 210,234 Q315,238 420,230" fill="none" stroke="#334155" strokeWidth="5" opacity="0.6"/>
                <path d="M80,0 L90,300 M170,0 L175,300 M270,0 L268,300 M378,0 L375,300" stroke="#475569" strokeWidth="1" strokeDasharray="6 5" opacity="0.35"/>
                <path d="M0,30 L420,25 M0,90 L420,88 M0,150 L420,148 M0,210 L420,212" stroke="#475569" strokeWidth="1" strokeDasharray="6 5" opacity="0.35"/>
                <g fontSize="7.5" fontWeight={700} fill="#5b7ba6">
                  <text x="88" y="18">Airport Road</text>
                  <text x="272" y="18">Progoti Sarani</text>
                  <text x="374" y="18">Shahjadpur</text>
                  <text x="12" y="52">Mirpur Road</text>
                  <text x="14" y="112">Shatmashjid Rd</text>
                  <text x="16" y="174">Panthapath</text>
                  <text x="18" y="224">New Market</text>
                  <text x="196" y="112">Baily Road</text>
                  <text x="200" y="174">Dhanmondi</text>
                  <text x="320" y="112">Gulshan Ave</text>
                  <text x="322" y="174">Banani</text>
                </g>
                <g>{[
                  {x:85,y:70,n:'Airport'},{x:275,y:80,n:'Kuril'},{x:180,y:70,n:'Khilkhet'},{x:85,y:150,n:'Mipur 10'},{x:275,y:170,n:'Badda'},{x:200,y:240,n:'Motijheel'},{x:130,y:240,n:'Dholaikhal'},{x:340,y:140,n:'Banasree'},{x:60,y:235,n:'Hazaribagh'},{x:320,y:250,n:'Jatrabari'}
                ].map((m,i)=>(<g key={i} opacity="0.85"><circle cx={m.x} cy={m.y} r={3} fill="#f97316"/><text x={m.x+5} y={m.y+2.5} fontSize="7.5" fontWeight={800} fill="#fbbf24">{m.n}</text></g>))}                </g>
                {showDrivers && liveDrivers.slice(0, 14).map((d, i) => (<DriverMarker key={d.id} x={d.lx} y={d.ly} tx={d.tx} ty={d.ty} name={d.name} status={d.status} vehicleType={d.vehicleType} dest={d.dest} speed={d.speed} onClick={() => setDriverPanel(d)} />))}
                {zones.filter(z => z.coords && z.coords.length > 2).map((z, i) => {
                  const pts = z.coords!.map(c => `${c.x},${c.y}`).join(' ');
                  const isSel = selZone === z.id;
                  return (
                    <g key={z.id} onClick={e => { e.stopPropagation(); setSelZone(isSel ? null : z.id); }} className="cursor-pointer">
                      <polygon points={pts} fill={barColors[i % barColors.length]} fillOpacity={isSel ? 0.55 : 0.28} stroke={barColors[i % barColors.length]} strokeWidth={isSel ? 3 : 1.5}/>
                      <text x={z.coords![0].x} y={z.coords![0].y} fontSize="11" fontWeight={800} fill={isSel ? '#fff' : barColors[i % barColors.length]} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{z.name}</text>
                    </g>
                  );
                })}
                {livePts.length > 0 && (
                  <g>
                    <polygon points={livePts.map(c => `${c.x},${c.y}`).join(' ')} fill="#f97316" fillOpacity="0.25" stroke="#f97316" strokeWidth="2" strokeDasharray="5 4"/>
                    {livePts.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={6} fill="#f97316" stroke="#fff" strokeWidth={2}/><text x={p.x + 9} y={p.y + 4} fontSize="10" fontWeight={800} fill="#f97316">{i + 1}</text></g>)}
                  </g>
                )}
                </g>
              </svg>
              {livePts.length === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-center"><p className="text-3xl">🗺️</p><p className="text-xs text-gray-400 mt-2 font-bold">Map-এ click করে zone-এর boundary চিহ্নিত করুন</p><p className="text-[10px] text-gray-500 mt-1">Point সংখ্যা ৩+ হলে save-এ zone তৈরি হবে</p></div></div>}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4">
              <input type="text" value={liveName} onChange={e => setLiveName(e.target.value)} placeholder="Zone-এর নাম দিন (e.g. Motijheel, Badda, Khilgaon)" className="flex-1 px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"/>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{livePts.length} points</span>
                <button onClick={() => { if (livePts.length >= 3 && liveName.trim()) { onAddZone({ name: liveName.trim(), status: 'Active', pendingOrders: 0, activeDrivers: 0, avgDeliveryMin: 0, totalKm: 0, coveragePct: 100, drivers: [], deliveryFee: 50, minOrder: 100, operatingHours: '9AM-11PM', peakHourOrders: 0, returnRate: 0, satisfaction: 90, coords: livePts }); setLivePts([]); setLiveName(''); } }} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40" disabled={livePts.length < 3 || !liveName.trim()}><CheckCircle className="w-3.5 h-3.5"/>Save Zone</button>
              </div>
            </div>
            {livePts.length > 0 && livePts.length < 3 && <p className="text-[10px] text-amber-400 mt-2">Zone বানাতে কমপক্ষে 3টা point দরকার ({livePts.length}/3)</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-center"><p className="text-[8px] text-gray-500 uppercase font-bold">Points</p><p className="text-sm font-black text-brand-orange">{livePts.length}</p></div>
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-center"><p className="text-[8px] text-gray-500 uppercase font-bold">Perimeter</p><p className="text-sm font-black text-white">{livePts.length > 1 ? Math.round(livePts.reduce((s, p, i) => s + dist(p, livePts[(i + 1) % livePts.length]), 0)) : 0} u</p></div>
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-center"><p className="text-[8px] text-gray-500 uppercase font-bold">Area</p><p className="text-sm font-black text-emerald-400">{livePts.length >= 3 ? Math.round(polyArea(livePts)) : 0}</p></div>
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-center"><p className="text-[8px] text-gray-500 uppercase font-bold">Center</p><p className="text-sm font-black text-blue-400">{livePts.length >= 3 ? `${polyCenter(livePts).x},${polyCenter(livePts).y}` : '—'}</p></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><MapPin className="w-4 h-4 text-brand-orange"/>Zones on Map</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {zones.filter(z => z.coords).map(z => (
                  <button key={z.id} onClick={() => setSelZone(selZone === z.id ? null : z.id)} className={`w-full flex items-center justify-between bg-brand-dark/40 border rounded-lg p-2.5 text-left cursor-pointer transition-all ${selZone === z.id ? 'border-brand-orange/60 bg-brand-orange/5' : 'border-brand-border/50 hover:border-brand-border'}`}>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: barColors[zones.indexOf(z) % barColors.length] }}></span><span className="text-[11px] font-bold text-white">{z.name}</span></div>
                    <span className="text-[9px] text-gray-500">{z.coords?.length} pts</span>
                  </button>
                ))}
                {zones.filter(z => z.coords).length === 0 && <p className="text-[10px] text-gray-500">Map-এ এখনো কোনো zone নেই</p>}
              </div>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Bike className="w-4 h-4 text-emerald-400"/>Live Drivers</h3>
                <button onClick={() => setShowDrivers(d => !d)} className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${showDrivers ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-brand-dark text-gray-400 border border-brand-border'}`}>{showDrivers ? 'ON' : 'OFF'}</button>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {liveDrivers.slice(0, 12).map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2">
                    <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${d.status === 'Active' || d.status === 'On-Delivery' ? 'bg-emerald-400' : d.status === 'Idle' ? 'bg-amber-400' : 'bg-red-400'}`}></span><span className="text-[10px] font-bold text-white">{d.name}</span></div>
                    <span className="text-[9px] text-gray-500">({d.lx},{d.ly})</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                <span className="flex items-center gap-1 text-[8px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Active</span>
                <span className="flex items-center gap-1 text-[8px] text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Idle</span>
                <span className="flex items-center gap-1 text-[8px] text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>Off</span>
              </div>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Settings2 className="w-4 h-4 text-blue-400"/>How to use</h3>
              <div className="space-y-2 text-[10px] text-gray-400">
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">1</span>Wheel scroll করে zoom, drag করে map ঘোরান</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">2</span>Map-এ click করে area-র boundary-র point দিন</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">3</span>3+ point দিলে shape তৈরি হবে</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">4</span>Zone-এর নাম লিখে Save Zone চাপুন</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-[9px]">5</span>নতুন zone map-এ polygon হিসেবে দেখাবে</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone cards */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredZones.map((zone) => (
            <div key={zone.id} className="bg-brand-card border border-brand-border rounded-xl p-5 hover:border-brand-orange/40 transition-all flex flex-col justify-between shadow-sm relative group">
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <button onClick={() => { setEditId(zone.id); setEditName(zone.name); setEditStatus(zone.status); setEf({ deliveryFee: zone.deliveryFee ?? 50, minOrder: zone.minOrder ?? 100, operatingHours: zone.operatingHours ?? '9AM-11PM', coveragePct: zone.coveragePct ?? 100 }); }} className="p-1.5 bg-brand-dark/60 hover:bg-white/10 text-gray-400 hover:text-white border border-brand-border rounded cursor-pointer transition-colors" title="Edit Zone"><PencilLine className="w-3.5 h-3.5"/></button>
                <button onClick={() => toggleStatus(zone)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase cursor-pointer border tracking-wider transition-colors ${zone.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'}`} title="Toggle Active status">{zone.status}</button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange shrink-0"><MapPin className="w-5 h-5"/></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{zone.name}</h4>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {zone.id} · {zone.coveragePct != null ? zone.coveragePct + '% covered' : '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-brand-dark/40 p-3 border border-brand-border/40 rounded-lg text-center">
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-medium">Orders</p>
                    <p className="text-sm font-bold text-white mt-0.5">{zone.ordersCount}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-medium">Pending</p>
                    <p className={`text-sm font-bold mt-0.5 ${(zone.pendingOrders || 0) > 20 ? 'text-amber-400' : 'text-white'}`}>{zone.pendingOrders ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-medium">Earnings</p>
                    <p className="text-sm font-bold text-brand-green mt-0.5">{fmt(zone.earnings)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-brand-dark/40 border border-brand-border/40 rounded-lg p-2"><Users className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1"/><p className="text-[10px] font-bold text-white">{zone.activeDrivers ?? 0}</p><p className="text-[8px] text-gray-500">Drivers</p></div>
                  <div className="bg-brand-dark/40 border border-brand-border/40 rounded-lg p-2"><Clock className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1"/><p className="text-[10px] font-bold text-white">{zone.avgDeliveryMin ?? 0}m</p><p className="text-[8px] text-gray-500">Avg Time</p></div>
                  <div className="bg-brand-dark/40 border border-brand-border/40 rounded-lg p-2"><Route className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1"/><p className="text-[10px] font-bold text-white">{(zone.totalKm ?? 0).toLocaleString()}km</p><p className="text-[8px] text-gray-500">Total Km</p></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-brand-dark/40 border border-brand-border/40 rounded-lg p-2"><Timer className="w-3.5 h-3.5 text-brand-orange mx-auto mb-1"/><p className="text-[10px] font-bold text-white">৳{zone.deliveryFee ?? 0}</p><p className="text-[8px] text-gray-500">Fee</p></div>
                  <div className="bg-brand-dark/40 border border-brand-border/40 rounded-lg p-2"><Package className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1"/><p className="text-[10px] font-bold text-white">৳{zone.minOrder ?? 0}</p><p className="text-[8px] text-gray-500">Min Order</p></div>
                  <div className="bg-brand-dark/40 border border-brand-border/40 rounded-lg p-2"><Star className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1"/><p className="text-[10px] font-bold text-white">{zone.satisfaction ?? 0}%</p><p className="text-[8px] text-gray-500">Satisfaction</p></div>
                </div>

                {zone.drivers && zone.drivers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {zone.drivers.map(d => <span key={d} className="px-1.5 py-0.5 bg-brand-orange/10 border border-brand-orange/20 text-[8px] font-bold text-brand-orange rounded">{d.split(' ')[0]}</span>)}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setDetailZone(zone)} className="flex-1 py-1.5 bg-brand-dark hover:bg-white/10 border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"><Shield className="w-3 h-3"/>Zone Detail</button>
                  <button onClick={() => boostOrders(zone)} className="flex-1 py-1.5 bg-brand-dark hover:bg-white/10 border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"><Zap className="w-3 h-3 text-amber-400"/>Boost</button>
                  <button onClick={() => markComplete(zone)} className="flex-1 py-1.5 bg-brand-dark hover:bg-white/10 border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400"/>Fulfill</button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-border/40 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {zone.status === 'Active' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400"/> : <AlertCircle className="w-3.5 h-3.5 text-red-400"/>}
                  <span className={`text-[10px] font-bold ${zone.status === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>{zone.status === 'Active' ? 'Orders Dispatched' : 'Paused Delivery'}</span>
                </div>
                {zone.id !== 'Z-1' && zone.id !== 'Z-2' && (
                  <button onClick={() => onDeleteZone(zone.id)} className="p-1.5 bg-brand-dark/60 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-brand-border rounded cursor-pointer transition-colors opacity-0 group-hover:opacity-100" title="Remove Zone"><Trash2 className="w-3.5 h-3.5"/></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-sm w-full overflow-hidden shadow-2xl fade-in">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-semibold text-white text-sm">Add New Coverage Zone</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Zone Name (Dhaka Neighborhood)</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Badda, Khilgaon, Motijheel" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                  <option value="Active">Active (Launch immediately)</option>
                  <option value="Inactive">Inactive (Plan first)</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer">Create Zone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-sm w-full overflow-hidden shadow-2xl fade-in">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2"><Edit2 className="w-4 h-4 text-brand-orange"/>Edit Zone</h3>
              <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Zone Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Fee (৳)</label>
                  <input type="number" value={ef.deliveryFee} onChange={e => setEf({ ...ef, deliveryFee: Number(e.target.value) })} className="w-full px-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Min Order</label>
                  <input type="number" value={ef.minOrder} onChange={e => setEf({ ...ef, minOrder: Number(e.target.value) })} className="w-full px-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Coverage %</label>
                  <input type="number" value={ef.coveragePct} onChange={e => setEf({ ...ef, coveragePct: Number(e.target.value) })} className="w-full px-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Operating Hours</label>
                <input type="text" value={ef.operatingHours} onChange={e => setEf({ ...ef, operatingHours: e.target.value })} placeholder="e.g. 9AM-11PM" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"/>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button onClick={() => setEditId(null)} className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                <button onClick={saveEdit} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"><Save className="w-3.5 h-3.5"/>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone Detail modal */}
      {detailZone && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailZone(null)}>
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-orange"/>{detailZone.name}</h3>
              <button onClick={() => setDetailZone(null)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: 'Orders', v: detailZone.ordersCount, c: 'text-white' },
                  { l: 'Pending', v: detailZone.pendingOrders ?? 0, c: 'text-amber-400' },
                  { l: 'Earnings', v: fmt(detailZone.earnings), c: 'text-emerald-400' },
                  { l: 'Drivers', v: detailZone.activeDrivers ?? 0, c: 'text-blue-400' },
                  { l: 'Avg Delivery', v: (detailZone.avgDeliveryMin ?? 0) + ' min', c: 'text-white' },
                  { l: 'Total Km', v: (detailZone.totalKm ?? 0).toLocaleString() + ' km', c: 'text-white' },
                  { l: 'Coverage', v: (detailZone.coveragePct ?? 0) + '%', c: 'text-brand-orange' },
                  { l: 'Status', v: detailZone.status, c: detailZone.status === 'Active' ? 'text-emerald-400' : 'text-red-400' },
                  { l: 'Fee', v: '৳' + (detailZone.deliveryFee ?? 0), c: 'text-white' },
                  { l: 'Min Order', v: '৳' + (detailZone.minOrder ?? 0), c: 'text-white' },
                  { l: 'Hours', v: detailZone.operatingHours ?? '—', c: 'text-white' },
                  { l: 'Satisfaction', v: (detailZone.satisfaction ?? 0) + '%', c: 'text-emerald-400' }
                ].map(x => (
                  <div key={x.l} className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3 text-center">
                    <p className="text-[9px] text-gray-400 uppercase font-bold">{x.l}</p>
                    <p className={`text-sm font-black mt-1 ${x.c}`}>{x.v}</p>
                  </div>
                ))}
              </div>

              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-gray-300 uppercase flex items-center gap-1"><Users className="w-3 h-3 text-blue-400"/>Assigned Drivers</p>
                  <div className="flex items-center gap-1.5">
                    <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver name" className="w-24 px-2 py-1 bg-brand-dark text-[10px] text-white border border-brand-border rounded outline-none focus:border-brand-orange"/>
                    <button onClick={() => assignDriver(detailZone)} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[9px] font-bold cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3"/>Add</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(detailZone.drivers && detailZone.drivers.length > 0 ? detailZone.drivers : []).map(d => <span key={d} className="px-2 py-1 bg-brand-orange/10 border border-brand-orange/20 text-[9px] font-bold text-brand-orange rounded">{d}</span>)}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => boostOrders(detailZone)} className="flex-1 py-2 bg-brand-dark hover:bg-white/10 border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"><Zap className="w-3 h-3 text-amber-400"/>Boost Orders (+10)</button>
                <button onClick={() => markComplete(detailZone)} className="flex-1 py-2 bg-brand-dark hover:bg-white/10 border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400"/>Fulfill 5</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

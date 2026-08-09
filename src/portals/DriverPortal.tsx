/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver Site — a fresh, full driver app: dashboard, deliveries, live route,
 * earnings, chat, performance and profile. Data is shared via localStorage
 * with the admin panel.
 */
import React, { useMemo, useState } from 'react';
import { LayoutDashboard, Package, Map, Wallet, User, MessageSquare, BarChart3, Phone, Navigation, CheckCircle2, Star, LogIn, Power, Send } from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, useDrivers, useWalletTxns, bdt, todayStr, statusBadge } from './portalUtils';

export default function DriverPortal() {
  const [orders, setOrders] = useOrders();
  const [drivers, setDrivers] = useDrivers();
  const [txns] = useWalletTxns();
  const me = drivers[0];
  const [tab, setTab] = useState('dashboard');
  const [chat, setChat] = useState<{ from: string; msg: string; time: string }[]>([
    { from: 'Dispatch', msg: 'Rahim, 3 deliveries assigned near Dhanmondi. Please start.', time: '9:12 AM' },
  ]);
  const [chatMsg, setChatMsg] = useState('');

  const myOrders = orders.filter(o => o.driverId === me?.id || o.driverId === me?.name || o.driverId === `DRV-${me?.id.slice(-4)}` || orders.indexOf(o) < orders.length);
  const deliveries = useMemo(() => myOrders.filter(o => o.status !== 'Cancelled'), [myOrders]);
  const active = deliveries.filter(o => o.status === 'Ongoing' || o.status === 'Processing' || o.status === 'Confirmed' || o.status === 'Pending');
  const done = deliveries.filter(o => o.status === 'Completed');
  const earned = done.reduce((s, o) => s + (o.deliveryCharge || 0) + (o.codAmount && o.paymentMethod.toLowerCase().includes('cod') ? 0 : 0), 0) + done.length * 20;
  const today = done.filter(o => (o.date || '').includes(new Date().getFullYear().toString())).length || done.length;

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deliveries', label: 'Deliveries', icon: Package, badge: active.length },
    { id: 'track', label: 'Track', icon: Map },
    { id: 'earnings', label: 'Earnings', icon: Wallet },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: 1 },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const goBack = () => { window.open(`${window.location.origin}/index.html`, '_self'); };

  const updateStatus = (id: string, status: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: status as any } : o)));
  };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    setChat(prev => [...prev, { from: 'You', msg: chatMsg.trim(), time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }]);
    setChatMsg('');
  };

  const toggleDuty = () => {
    if (!me) return;
    const next = me.status === 'On-Delivery' ? 'On-Delivery' : me.status === 'Online' ? 'Offline' : 'Online';
    setDrivers(prev => prev.map(d => (d.id === me.id ? { ...d, status: next as any } : d)));
  };

  const moneyBars = [3800, 2900, 4100, 2200, 5100, 3400, 2600];

  return (
    <PortalShell
      role="Driver Site"
      tagline="Rahim Khan · DRV-1001"
      nav={nav}
      active={tab}
      onNav={setTab}
      onBack={goBack}
    >
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* Hero */}
          <div className="rounded-2xl p-5 bg-gradient-to-r from-brand-orange/20 via-[#101d30] to-[#101d30] border border-brand-orange/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-xl">RK</div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},</p>
                <p className="text-lg font-black text-white">Rahim Khan</p>
                <p className="text-[10px] text-gray-400">DRV-1001 · Bike · Dhanmondi Zone</p>
              </div>
            </div>
            <button onClick={toggleDuty} className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-colors ${me?.status === 'Online' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : me?.status === 'On-Delivery' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-gray-500/20 border-gray-500/40 text-gray-300'}`}>
              <Power className="w-3.5 h-3.5" /><span>{me?.status || 'Offline'}</span>
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Today Deliveries', value: today.toString(), sub: `${done.length} total completed`, color: 'text-emerald-400' },
              { label: 'Active Jobs', value: active.length.toString(), sub: 'awaiting delivery', color: 'text-amber-400' },
              { label: 'Earnings Today', value: bdt(earned), sub: 'delivery + tips', color: 'text-brand-orange' },
              { label: 'Rating', value: me?.rating ? me.rating.toFixed(1) : '4.9', sub: '★ excellent', color: 'text-sky-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-2xl font-black mt-1.5 ${k.color}`}>{k.value}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Next delivery + recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2"><Package className="w-3.5 h-3.5 text-brand-orange" /><span>Today's Deliveries</span></p>
                <button onClick={() => setTab('deliveries')} className="text-[9px] font-black text-brand-orange uppercase tracking-wider hover:underline">View all</button>
              </div>
              {active.length === 0 ? <p className="text-[10px] text-gray-500 py-6 text-center">No active deliveries — tap <b>Online</b> to receive jobs.</p> : (
                <div className="space-y-2">
                  {active.slice(0, 4).map(o => (
                    <div key={o.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-brand-orange font-bold">#{o.id}</p>
                        <p className="text-[10px] text-gray-300 truncate">{o.storeName} → {o.customerName}</p>
                        <p className="text-[8px] text-gray-500 truncate">{o.address || o.pickupLocation || '—'} · {o.date}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><BarChart3 className="w-3.5 h-3.5 text-brand-orange" /><span>This Week</span></p>
              <div className="flex items-end space-x-1.5 h-24">
                {moneyBars.map((v, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-brand-orange/60 to-brand-orange rounded-t-md" style={{ height: `${(v / 5100) * 100}%` }} title={bdt(v)} />
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-gray-500 mt-1.5"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'deliveries' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><Package className="w-4 h-4 text-brand-orange" /><span>My Deliveries</span></h3>
              <p className="text-[10px] text-gray-400">Accept and complete deliveries — status syncs to the admin panel live.</p>
            </div>
          </div>
          {deliveries.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No deliveries assigned yet.</p> : (
            <div className="space-y-2">
              {deliveries.map(o => (
                <div key={o.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <p className="text-[11px] font-mono text-brand-orange font-black">#{o.id}</p>
                      <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                      <span className="text-[9px] text-gray-500">{o.paymentMethod}</span>
                    </div>
                    <span className="text-[11px] font-black font-mono text-white">{bdt(o.amount)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[10px]">
                    <p className="text-gray-300"><span className="text-gray-500">From:</span> <b className="text-gray-200">{o.storeName}</b></p>
                    <p className="text-gray-300"><span className="text-gray-500">To:</span> <b className="text-gray-200">{o.customerName}</b> · {o.customerPhone}</p>
                    <p className="text-gray-400 sm:col-span-2 truncate"><span className="text-gray-500">Address:</span> {o.address || o.pickupLocation || '—'}</p>
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    {o.status !== 'Completed' && (
                      <>
                        <button onClick={() => updateStatus(o.id, 'Ongoing')} className="flex items-center space-x-1.5 px-3 py-2 bg-sky-500/15 border border-sky-500/40 text-sky-300 rounded-xl text-[10px] font-black hover:bg-sky-500/25 transition-colors">
                          <Navigation className="w-3 h-3" /><span>Start Delivery</span>
                        </button>
                        <button onClick={() => updateStatus(o.id, 'Completed')} className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black transition-colors">
                          <CheckCircle2 className="w-3 h-3" /><span>Mark Complete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'track' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Map className="w-4 h-4 text-brand-orange" /><span>Live Route</span></h3>
            <p className="text-[10px] text-gray-400">Simulated live GPS — your position moves along the route in real time.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
            {/* Simple simulated map */}
            <div className="relative h-72 bg-[#0a1322]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #132238 0, transparent 30%), radial-gradient(circle at 80% 70%, #132238 0, transparent 30%)' }}>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#1e3050 1px, transparent 1px), linear-gradient(90deg, #1e3050 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 280" preserveAspectRatio="none">
                <path d="M40 220 Q 120 160, 200 140 T 360 40" fill="none" stroke="#f97316" strokeWidth="4" strokeDasharray="8 6" opacity="0.8" />
                <circle cx="40" cy="220" r="7" fill="#132238" stroke="#64748b" strokeWidth="2" />
                <circle cx="360" cy="40" r="8" fill="#10b981" stroke="#101d30" strokeWidth="3" />
                <circle cx="200" cy="140" r="8" fill="#f97316" stroke="#101d30" strokeWidth="3">
                  <animate attributeName="r" values="6;11;6" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <circle cx="200" cy="140" r="3" fill="#fff" />
              </svg>
              <div className="absolute bottom-3 left-3 bg-[#101d30]/90 border border-[#1e3050] rounded-lg px-3 py-2 text-[10px]">
                <p className="text-emerald-400 font-black">● Store Pickup</p>
                <p className="text-brand-orange font-black mt-1">● Rider (you)</p>
                <p className="text-emerald-500 font-black mt-1">● Delivery Point</p>
              </div>
              <div className="absolute top-3 right-3 bg-[#101d30]/90 border border-[#1e3050] rounded-lg px-3 py-2 text-[10px]">
                <p className="text-gray-300"><b className="text-brand-orange">ETA:</b> 9 min</p>
                <p className="text-gray-300 mt-0.5"><b className="text-brand-orange">Distance:</b> 3.2 km</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Pickup', value: 'Fresh Mart, Dhanmondi 27', icon: '🏪' },
              { label: 'Drop', value: 'House 12, Road 7, Dhanmondi', icon: '🏠' },
              { label: 'Customer', value: '01712-345678', icon: '📱' },
            ].map(c => (
              <div key={c.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{c.label}</p>
                <p className="text-[11px] text-gray-200 font-bold mt-1">{c.icon} {c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'earnings' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Wallet className="w-4 h-4 text-brand-orange" /><span>My Earnings</span></h3>
            <p className="text-[10px] text-gray-400">Payouts sync with the admin wallet system.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Earnings', value: bdt(earned + done.length * 20), color: 'text-brand-orange' },
              { label: 'This Week', value: bdt(24100), color: 'text-white' },
              { label: 'Deliveries Done', value: done.length.toString(), color: 'text-emerald-400' },
              { label: 'Tips', value: bdt(done.length * 10), color: 'text-amber-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Payout History</p>
            {txns.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">No payouts yet.</p> : (
              <div className="space-y-1.5">
                {txns.slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-lg px-3 py-2 text-[10px]">
                    <div>
                      <p className="text-gray-200 font-bold">{t.type}</p>
                      <p className="text-[8px] text-gray-500 font-mono">{t.id} · {t.date}</p>
                    </div>
                    <span className={`font-mono font-black ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.amount >= 0 ? '+' : ''}{bdt(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><MessageSquare className="w-4 h-4 text-brand-orange" /><span>Dispatch Chat</span></h3>
            <p className="text-[10px] text-gray-400">Talk to the dispatch team in real time.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 h-96 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {chat.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'You' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-[10px] ${m.from === 'You' ? 'bg-brand-orange text-white' : 'bg-[#0a1322] border border-[#1e3050] text-gray-200'}`}>
                    <p className="font-black text-[8px] uppercase tracking-wider opacity-70 mb-0.5">{m.from} · {m.time}</p>
                    <p>{m.msg}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2 mt-3">
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type a message…" className="flex-1 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[10px] outline-none focus:border-brand-orange" />
              <button onClick={sendChat} className="p-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl transition-colors"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><BarChart3 className="w-4 h-4 text-brand-orange" /><span>Performance</span></h3>
            <p className="text-[10px] text-gray-400">Your delivery stats at a glance.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Completion Rate', value: '98%', color: 'text-emerald-400' },
              { label: 'On-Time Delivery', value: '94%', color: 'text-sky-400' },
              { label: 'Total Distance', value: '1,240 km', color: 'text-brand-orange' },
              { label: 'Customer Rating', value: '★ 4.9', color: 'text-amber-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">Rating Breakdown</p>
            {[5, 4, 3, 2, 1].map(r => {
              const pct = r === 5 ? 88 : r === 4 ? 9 : r === 3 ? 2 : 1;
              return (
                <div key={r} className="flex items-center space-x-2 text-[10px]">
                  <span className="w-6 text-gray-400 flex items-center"><Star className="w-3 h-3 text-amber-400" />{r}</span>
                  <div className="flex-1 h-2 bg-[#0a1322] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-brand-orange" style={{ width: `${pct}%` }} /></div>
                  <span className="text-gray-400 w-8 text-right font-mono">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><User className="w-4 h-4 text-brand-orange" /><span>My Profile</span></h3>
            <p className="text-[10px] text-gray-400">Your identity & documents on the NexaGo network.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-5 flex flex-wrap items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-2xl">RK</div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-white">{me?.name || 'Rahim Khan'}</p>
              <p className="text-[10px] text-gray-400 font-mono">{me?.id || 'DRV-1001'} · Bike · Dhanmondi</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">★ 4.9 Rating</span>
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">Top 5% Rider</span>
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">1,240 deliveries</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2.5 bg-[#0a1322] border border-[#1e3050] hover:border-emerald-500/40 text-emerald-300 rounded-xl"><Phone className="w-4 h-4" /></button>
              <button onClick={toggleDuty} className="flex items-center space-x-2 px-4 py-2.5 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-orange/25 transition-colors">
                <LogIn className="w-3.5 h-3.5" /><span>{me?.status === 'Online' ? 'Go Offline' : 'Go Online'}</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'NID / Documents', value: 'Verified ✓', ok: true },
              { label: 'License', value: 'BD-2023-44512', ok: true },
              { label: 'Vehicle', value: 'Yamaha FZ · 12-4451', ok: true },
              { label: 'Zone', value: 'Dhanmondi, Dhaka', ok: true },
            ].map(d => (
              <div key={d.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{d.label}</p>
                  <p className="text-[11px] text-gray-200 font-bold mt-1">{d.value}</p>
                </div>
                {d.ok && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-600 text-center pt-2">Last active: {todayStr()} · NexaGo Smart Delivery Network</p>
        </div>
      )}
    </PortalShell>
  );
}

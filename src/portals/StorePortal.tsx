/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Site — a full store portal that mirrors the simulator's Store App:
 * online/offline duty toggle, incoming order queue with accept/reject +
 * 5-minute accept countdown, live order view (items, customer, print receipt),
 * accept → start preparing → mark order ready → ready for pickup handoff to the
 * driver, order history with filters + print, and store support. Accepting a
 * new order dispatches it to the first available driver (status Confirmed +
 * driverId) so the Driver Site picks it up instantly. Reads the same
 * localStorage keys as the admin panel and driver site.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Inbox, History, CheckCircle2, Package, Send, User, Phone, Power, WifiOff,
  Printer, X, Headphones, MessageSquare, HelpCircle, ShoppingBag, Clock,
  Check, Store, Bell
} from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, useDrivers, useStoreProfile, useNotifications, bdt, statusBadge, lsGet, lsSet, appendTimeline, makeNotif } from './portalUtils';

export default function StorePortal() {
  const [orders, setOrders] = useOrders();
  const [drivers, setDrivers] = useDrivers();
  const [profile] = useStoreProfile();
  const [notifications, setNotifications] = useNotifications();
  const [tab, setTab] = useState('receive');
  const [storeOnline, setStoreOnline] = useState<boolean>(lsGet('sd_store_online', true));
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [now, setNow] = useState(Date.now());

  useEffect(() => lsSet('sd_store_online', storeOnline), [storeOnline]);

  // Ticking clock for accept countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const storeName = profile.storeName || 'Smart Shop';
  const mine = useMemo(() => orders.filter(o => o.storeName === storeName || o.source === 'customer-app' || o.customerName), [orders, storeName]);

  const incoming = mine.filter(o => o.status === 'Pending');
  const live = mine.find(o => o.status === 'Processing' || o.status === 'Ongoing' || (o.status === 'Confirmed' && o.driverId));
  const dispatched = mine.filter(o => o.status === 'Confirmed' && o.driverId && (!o.preparing && !o.storeReady));
  const queue = mine.filter(o => (o.status === 'Confirmed' && o.driverId && (o.preparing || o.storeReady)) || (o.status === 'Processing' && !o.pickedUp));
  const done = mine.filter(o => o.status === 'Completed');
  const cancelled = mine.filter(o => o.status === 'Cancelled');

  // Auto-accept pending orders at 0s of the 5-minute window
  useEffect(() => {
    incoming.forEach(o => {
      const deadline = (o.placedAt || 0) + 5 * 60 * 1000;
      if (o.placedAt && now > deadline) acceptOrder(o.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, incoming.length]);

  const storeNotifs = notifications.filter(n => n.audience === 'all' || n.audience === 'store' || n.audience === 'store-admin' || n.storeId);
  const storeUnread = storeNotifs.filter(n => !n.read).length;

  const nav = [
    { id: 'receive', label: 'Receive Orders', icon: Inbox, badge: incoming.length },
    { id: 'live', label: 'Live Order', icon: Package, badge: live ? 1 : 0 },
    { id: 'history', label: 'Order History', icon: History },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: storeUnread },
    { id: 'account', label: 'Account', icon: User },
  ];

  const goBack = () => { window.open(`${window.location.origin}/roles.html`, '_self'); };

  const acceptOrder = (id: string) => {
    const rider = drivers.find(d => d.status !== 'Offline') || drivers[0];
    setOrders(prev => prev.map(o => (o.id === id ? appendTimeline({
      ...o,
      status: 'Confirmed' as any,
      driverId: rider?.id || 'DRV123456',
      driverDeadline: Date.now() + 60 * 1000,
      placedAt: o.placedAt || Date.now(),
    }, 'accepted', 'store', `Store accepted — rider ${rider?.name || ''} assigned`) : o)));
    setNotifications(prev => [
      makeNotif('🚚 Order Confirmed', `Store accepted order #${id} — assigned to ${rider?.name || 'a rider'}.`, 'order', { audience: 'driver', driverId: rider?.id }),
      makeNotif('🚚 Store Accepted #' + id, `Order #${id} accepted — rider ${rider?.name || 'assigned'} on the way.`, 'order', { audience: 'all' }),
      ...prev,
    ]);
  };

  const rejectOrder = (id: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? appendTimeline({ ...o, status: 'Cancelled' as any }, 'cancelled', 'store', 'Store declined the order') : o)));
    setNotifications(prev => [
      makeNotif('🚫 Order Rejected', `Store declined order #${id} — no rider assigned.`, 'order', { audience: 'all' }),
      ...prev,
    ]);
  };

  const startPreparing = (id: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? appendTimeline({ ...o, preparing: true, status: 'Processing' as any }, 'preparing', 'store', 'Store started preparing the order') : o)));
  };

  const markReady = (id: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? appendTimeline({ ...o, storeReady: true, preparing: true }, 'ready', 'store', 'Order ready for pickup') : o)));
    const ord = orders.find(o => o.id === id);
    setNotifications(prev => [
      makeNotif('📦 Ready for Pickup', `Store marked order #${id} ready — pick it up now.`, 'order', { audience: 'driver', driverId: ord?.driverId }),
      makeNotif('📦 Order Ready — #' + id, `Your order is ready for pickup at ${ord?.storeName || 'the store'}.`, 'order', { audience: 'customer', customerId: ord?.customerId || ord?.customerPhone }),
      ...prev,
    ]);
  };

  const callCustomer = (o: any) => {
    window.open(`tel:${o.customerPhone?.replace(/\D/g, '')}`, '_self');
  };

  const printReceipt = (o: any) => {
    setPrintOrder(o);
    setTimeout(() => window.print(), 300);
  };

  const countdownLeft = (o: any) => {
    const deadline = (o.placedAt || 0) + 5 * 60 * 1000;
    return o.placedAt ? Math.max(0, Math.round((deadline - now) / 1000)) : 300;
  };

  const liveDriver = live ? drivers.find(d => d.id === live.driverId) : undefined;

  return (
    <PortalShell role="Store Site" tagline={storeName} nav={nav} active={tab} onNav={setTab} onBack={goBack}>
      {tab === 'receive' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><Inbox className="w-4 h-4 text-brand-orange" /><span>New Orders</span></h3>
              <p className="text-[10px] text-gray-400">Customer placed these orders — accept to dispatch to a driver.</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-[9px] font-black uppercase ${storeOnline ? 'text-emerald-400' : 'text-red-400'}`}>{storeOnline ? 'Store Online' : 'Store Offline'}</span>
              <button
                onClick={() => setStoreOnline(!storeOnline)}
                className={`w-11 h-6 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${storeOnline ? 'bg-emerald-500' : 'bg-gray-700'}`}
                title="Toggle store online/offline"
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all shadow ${storeOnline ? 'ml-auto' : ''}`}></div>
              </button>
              <button onClick={() => setSupportOpen(true)} className="p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg" title="Store support">
                <Headphones className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!storeOnline && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-3.5 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center"><WifiOff className="w-4 h-4 text-red-400" /></div>
              <div>
                <p className="text-[11px] font-bold text-white">You're Offline</p>
                <p className="text-[9px] text-gray-400">To receive orders, go online by tapping the toggle above.</p>
              </div>
            </div>
          )}

          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-3.5 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">{incoming.length ? `${incoming.length} order${incoming.length > 1 ? 's' : ''} awaiting accept` : 'No new order right now'}</p>
              <p className="text-[9px] text-gray-400">Customer orders appear here — accept if you have time, otherwise reject.</p>
            </div>
          </div>

          {!storeOnline ? (
            <p className="text-center text-[10px] text-gray-500 py-6">New orders will wait until you go online.</p>
          ) : incoming.length === 0 ? (
            <p className="text-center text-[10px] text-gray-500 py-4">No new orders right now ✓</p>
          ) : (
            <div className="space-y-2">
              {incoming.map(o => {
                const left = countdownLeft(o);
                return (
                  <div key={o.id} className="bg-[#101d30] border border-amber-500/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <p className="text-[11px] font-mono text-brand-orange font-black">#{o.id}</p>
                        <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                        <span className="text-[9px] text-gray-500">{o.paymentMethod}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${left <= 30 ? 'bg-red-500/15 text-red-400' : 'bg-brand-orange/15 text-brand-orange'}`}>
                          {left <= 30 ? 'Expiring…' : `${Math.floor(left / 60)}m ${left % 60}s`}
                        </span>
                        <span className="text-[11px] font-black font-mono text-white">{bdt(o.amount)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2 text-[10px]">
                      <p className="text-gray-300"><b className="text-gray-200">{o.customerName}</b> · {o.customerPhone}</p>
                      <p className="text-gray-500">{o.date} {o.time ? `· ${o.time}` : ''}</p>
                      <p className="text-gray-400 sm:col-span-2 truncate">{o.address || o.pickupLocation || '—'}</p>
                    </div>
                    {o.scheduledSlot && (
                      <span className="inline-flex items-center space-x-1 mt-1.5 px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[9px] font-black">
                        <Clock className="w-3 h-3" /><span>Scheduled delivery · {o.scheduledSlot}</span>
                      </span>
                    )}
                    {o.items && o.items.length > 0 && (
                      <div className="flex items-center space-x-1 mt-1.5 text-[9px] text-gray-400">
                        <Package className="w-3 h-3" /><span>{o.items.length} item{o.items.length === 1 ? '' : 's'}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-end space-x-2 mt-3">
                      <button onClick={() => rejectOrder(o.id)} className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-black hover:bg-red-500/20 transition-colors">Reject</button>
                      <button onClick={() => acceptOrder(o.id)} className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black transition-colors">
                        <CheckCircle2 className="w-3 h-3" /><span>Accept & Dispatch</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Queue / preparing / ready orders */}
          {queue.length > 0 && (
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-2"><Clock className="w-3.5 h-3.5 text-sky-400" /><span>Order Queue</span></p>
              <div className="space-y-1.5">
                {queue.map(o => {
                  const d = drivers.find(x => x.id === o.driverId);
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px]">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-brand-orange font-bold">#{o.id}</p>
                        <p className="text-[9px] text-gray-300 truncate">{o.customerName} · {o.itemCount || o.items?.length || 1} items</p>
                        <p className="text-[8px] text-gray-500 truncate">{d ? `Driver: ${d.name}` : ''} {o.storeReady ? '· Ready for pickup' : o.preparing ? '· Preparing' : ''}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {o.status === 'Processing' && !o.preparing && (
                          <button onClick={() => startPreparing(o.id)} className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black uppercase rounded-lg cursor-pointer">Accept & Prepare</button>
                        )}
                        {o.preparing && !o.storeReady && (
                          <button onClick={() => markReady(o.id)} className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-[8px] font-black uppercase rounded-lg cursor-pointer">Mark Ready</button>
                        )}
                        {o.storeReady && <span className="text-[8px] font-black text-blue-400 uppercase">READY</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dispatched to driver */}
          {dispatched.length > 0 && (
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-2"><Send className="w-3.5 h-3.5 text-sky-400" /><span>Dispatched to Driver</span></p>
              <div className="space-y-1.5">
                {dispatched.slice(0, 4).map(o => {
                  const d = drivers.find(x => x.id === o.driverId);
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px]">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-brand-orange font-bold">#{o.id}</p>
                        <p className="text-[9px] text-gray-300 truncate">{o.customerName} · {d?.name || 'Driver'} {d?.phone ? `· ${d.phone}` : ''}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg border text-[8px] font-black shrink-0 ${statusBadge(o.status)}`}>{o.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'live' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Package className="w-4 h-4 text-brand-orange" /><span>Live Order</span></h3>
            <p className="text-[10px] text-gray-400">Follow the order from dispatch to delivery — the driver sees your status instantly.</p>
          </div>

          {!live ? (
            <div className="rounded-2xl p-8 bg-[#101d30] border border-[#1e3050] text-center space-y-2">
              <ShoppingBag className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-[11px] text-white font-bold">No live order right now</p>
              <p className="text-[10px] text-gray-400">Accepted orders appear here with their live status.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Order</p>
                  <p className="text-[12px] font-black text-white font-mono">#{live.id}</p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button onClick={() => setPrintOrder(live)} className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#101d30] border border-[#1e3050] text-white text-[8px] font-black uppercase rounded-lg cursor-pointer hover:bg-[#132238]" title="Print receipt">
                    <Printer className="w-3 h-3 text-brand-orange" /><span>Print</span>
                  </button>
                  <span className={`px-2 py-1 rounded-md text-[8px] font-black ${live.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : live.storeReady ? 'bg-blue-500/15 text-blue-400' : live.preparing ? 'bg-amber-500/15 text-amber-400' : 'bg-brand-orange/15 text-brand-orange'}`}>
                    {live.status === 'Completed' ? 'COMPLETED' : live.storeReady ? 'READY' : live.preparing ? 'PREPARING' : live.status === 'Confirmed' ? 'DISPATCHED' : live.status}
                  </span>
                </div>
              </div>

              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400">Customer</p>
                    <p className="text-[11px] text-white font-bold truncate">{live.customerName}</p>
                  </div>
                  <button onClick={() => callCustomer(live)} className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center cursor-pointer" title="Call customer">
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[9px] leading-relaxed text-gray-400">{live.address || live.pickupLocation || '—'}</p>
              </div>

              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-[#1e3050] flex items-center justify-between">
                  <p className="text-[10px] text-white font-bold">Order items</p>
                  <span className="text-[8px] text-gray-400">{live.items?.length || live.itemCount || 1} item{(live.items?.length || live.itemCount || 1) === 1 ? '' : 's'}</span>
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  {(live.items || []).map((item: any, index: number) => (
                    <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-gray-300 truncate">{item.quantity || item.qty}x {item.name}</span>
                      <span className="text-white font-bold whitespace-nowrap">{bdt((item.price || 0) * (item.quantity || item.qty || 1))}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 bg-[#0a1322] border-t border-[#1e3050] flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Delivery fee</span>
                  <span className="text-emerald-400 font-bold">{bdt(live.deliveryCharge || 0)}</span>
                </div>
                <div className="px-3 py-2 bg-[#0a1322] border-t border-[#1e3050] flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 font-bold">Total</span>
                  <span className="text-white font-black">{bdt(live.amount)}</span>
                </div>
              </div>

              {/* Driver info */}
              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange text-xs font-black">
                    {liveDriver?.photo ? <img src={liveDriver.photo} alt="" className="w-full h-full rounded-full object-cover" /> : (liveDriver?.name?.[0] || 'D')}
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Assigned Driver</p>
                    <p className="text-[11px] font-black text-white">{liveDriver?.name || 'Searching for driver…'}</p>
                  </div>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${liveDriver?.status === 'On-Delivery' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{liveDriver?.status || '—'}</span>
              </div>

              {live.scheduledSlot && (
                <div className="bg-sky-500/10 border border-sky-500/25 rounded-2xl p-3 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                  <div><p className="text-[10px] font-bold text-white">Scheduled Delivery</p><p className="text-[9px] text-gray-400">Slot: {live.scheduledSlot} — prepare ahead of time.</p></div>
                </div>
              )}

              {(live.timeline?.length || 0) > 0 && (
                <div className="bg-[#0a1322] border border-[#1e3050] rounded-2xl p-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Order Timeline</p>
                  <div className="space-y-1.5">
                    {live.timeline!.map((t, i) => (
                      <div key={i} className="flex items-start space-x-2">
                        <span className="text-[9px] mt-0.5">{t.actor === 'store' ? '🏪' : t.actor === 'driver' ? '🛵' : t.actor === 'customer' ? '👤' : '🛠️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-white font-bold uppercase">{t.status}</p>
                          {t.note && <p className="text-[8px] text-gray-400">{t.note}</p>}
                        </div>
                        <span className="text-[8px] text-gray-500 shrink-0">{new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Store action area */}
              {live.status === 'Completed' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3.5 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div><p className="text-[10px] font-bold text-white">Delivery completed</p><p className="text-[9px] text-gray-400">The delivery proof was submitted by the driver.</p></div>
                </div>
              ) : !live.preparing ? (
                <button onClick={() => startPreparing(live.id)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                  <Package className="w-4 h-4" /><span>Accept & Start Preparing</span>
                </button>
              ) : !live.storeReady ? (
                <button onClick={() => markReady(live.id)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /><span>Mark Order Ready</span>
                </button>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-3.5 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <div><p className="text-[10px] font-bold text-white">Order is ready for pickup</p><p className="text-[9px] text-gray-400">The driver receives this status instantly.</p></div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-2 text-[9px]">
                {[
                  { icon: '🕐', label: 'Customer placed order', done: true },
                  { icon: '🏪', label: 'Store received', done: true },
                  { icon: '🛵', label: 'Driver received', done: !!(live.driverId) },
                  { icon: '📦', label: 'Store marked ready', done: !!live.storeReady },
                  { icon: '🚚', label: 'Driver picked up', done: !!live.pickedUp },
                  { icon: '✓', label: 'Delivered to customer', done: live.status === 'Completed' },
                ].map((s, i) => (
                  <div key={i} className={`flex items-center justify-between ${s.done ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <span className="font-bold"><span className="mr-1.5">{s.icon}</span>{s.label}</span>
                    {s.done && <Check className="w-3 h-3" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><History className="w-4 h-4 text-brand-orange" /><span>Order History</span></h3>
            <p className="text-[10px] text-gray-400">Completed and cancelled orders for this store.</p>
          </div>
          <div className="flex items-center space-x-2 border-b border-[#1e3050] pb-2 text-[11px] font-bold">
            {(['all', 'completed', 'cancelled'] as const).map(tb => (
              <button key={tb} onClick={() => setHistoryFilter(tb)}
                className={`pb-1.5 transition-all capitalize cursor-pointer relative ${historyFilter === tb ? 'text-brand-orange font-black' : 'text-gray-400'}`}>
                {tb}
                {historyFilter === tb && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-orange rounded-full"></div>}
              </button>
            ))}
          </div>
          {(() => {
            const list = mine.filter(o => historyFilter === 'all' ? (o.status === 'Completed' || o.status === 'Cancelled') : o.status === (historyFilter === 'completed' ? 'Completed' : 'Cancelled'));
            if (list.length === 0) return <p className="text-center text-[10px] text-gray-500 py-10">No orders yet.</p>;
            return (
              <div className="space-y-2">
                {list.map(o => {
                  const d = drivers.find(x => x.id === o.driverId);
                  return (
                    <div key={o.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <p className="text-[11px] font-mono text-brand-orange font-black">#{o.id}</p>
                          <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => setPrintOrder(o)} className="flex items-center space-x-1 px-2 py-1 bg-[#0a1322] border border-[#1e3050] text-white text-[8px] font-black uppercase rounded-lg cursor-pointer hover:bg-[#132238]">
                            <Printer className="w-3 h-3 text-brand-orange" /><span>Print</span>
                          </button>
                          <span className="text-[11px] font-black font-mono text-white">{bdt(o.amount)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-2 text-[10px]">
                        <p className="text-gray-300"><b className="text-gray-200">{o.customerName}</b> · {o.customerPhone}</p>
                        <p className="text-gray-400 truncate">{o.paymentMethod}</p>
                        <p className="text-gray-500">{o.date} {o.time ? `· ${o.time}` : ''}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-2 text-[9px]">
                        {o.items && o.items.length > 0 && (
                          <span className="flex items-center space-x-1 text-gray-400"><Package className="w-3 h-3" /><span>{o.items.length} item{o.items.length === 1 ? '' : 's'}</span></span>
                        )}
                        {o.driverId && d && (
                          <span className="flex items-center space-x-1 text-emerald-400">
                            <Send className="w-3 h-3" />
                            <span>{d.name} · {d.phone || '—'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><Bell className="w-4 h-4 text-brand-orange" /><span>Store Alerts</span></h3>
              <p className="text-[10px] text-gray-400">Admin announcements and platform updates for your store.</p>
            </div>
            <button onClick={() => setNotifications(prev => prev.map(n => (n.audience === 'all' || n.audience === 'store' || n.audience === 'store-admin' || n.storeId) ? { ...n, read: true } : n))} className="text-[9px] font-black text-brand-orange uppercase tracking-wider hover:underline">Mark all read</button>
          </div>
          {storeNotifs.length === 0 ? (
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0"><Bell className="w-4 h-4" /></div>
              <div>
                <p className="text-[11px] font-bold text-white">No new alerts</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Admin broadcasts and order-related notices will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {storeNotifs.map(n => {
                const color = n.type === 'order' ? 'text-brand-orange' : n.type === 'payment' ? 'text-emerald-400' : n.type === 'driver' ? 'text-cyan-400' : 'text-sky-400';
                return (
                  <div key={n.id} className={`bg-[#101d30] border rounded-xl p-3 flex items-start space-x-3 ${n.read ? 'border-[#1e3050]' : 'border-brand-orange/40'}`}>
                    <span className={`w-8 h-8 rounded-full bg-[#0a1322] flex items-center justify-center shrink-0 ${color}`}><Bell className="w-4 h-4" /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-white font-bold">{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0"></span>}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">{n.message}</p>
                      <p className={`text-[8px] ${color} font-bold mt-1`}>{n.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'account' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><User className="w-4 h-4 text-brand-orange" /><span>Store Account</span></h3>
            <p className="text-[10px] text-gray-400">Your store identity & performance stats.</p>
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-500/15 via-[#101d30] to-[#101d30] border border-emerald-500/20">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-xl">SM</div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">{profile.storeSub || 'NexaGo Store'}</p>
                <p className="text-lg font-black text-white">{storeName}</p>
                <p className="text-[10px] text-gray-400">{incoming.length} new order{incoming.length === 1 ? '' : 's'} waiting · {live ? '1 live delivery' : 'no live delivery'}</p>
              </div>
            </div>
          </div>

          {/* Online toggle */}
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-black ${storeOnline ? 'text-emerald-400' : 'text-red-400'}`}>{storeOnline ? 'Store Online' : 'Store Offline'}</p>
              <p className="text-[8px] text-gray-400">{storeOnline ? 'Ready to receive orders' : 'New orders will wait until you go online'}</p>
            </div>
            <button onClick={() => setStoreOnline(!storeOnline)} className={`w-11 h-6 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${storeOnline ? 'bg-emerald-500' : 'bg-gray-700'}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-all shadow ${storeOnline ? 'ml-auto' : ''}`}></div>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'New', value: incoming.length.toString(), sub: 'awaiting accept', color: 'text-amber-400' },
              { label: 'Dispatched', value: dispatched.length.toString(), sub: 'with driver', color: 'text-sky-400' },
              { label: 'Completed', value: done.length.toString(), sub: 'all time', color: 'text-emerald-400' },
              { label: 'Cancelled', value: cancelled.length.toString(), sub: 'all time', color: 'text-red-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-2xl font-black mt-1.5 ${k.color}`}>{k.value}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Store</span>
              <span className="text-[11px] font-bold text-white">{storeName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tagline</span>
              <span className="text-[11px] font-bold text-white">{profile.storeSub || 'NexaGo Store'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">WhatsApp</span>
              <a href={`https://wa.me/${(profile.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-[11px] font-bold text-emerald-400 hover:underline">
                <Phone className="w-3 h-3" /><span>{profile.whatsapp || '—'}</span>
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Drivers Online</span>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1"><Power className="w-3 h-3" /><span>{drivers.filter(d => d.status === 'Online').length}</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Orders</span>
              <span className="text-[11px] font-bold text-white">{mine.length}</span>
            </div>
          </div>

          {/* Support quick actions */}
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">Store Support</p>
            <button onClick={() => setSupportOpen(true)} className="w-full flex items-center space-x-2.5 bg-[#0a1322] border border-[#1e3050] rounded-xl p-3 cursor-pointer hover:bg-[#132238] text-left">
              <Headphones className="w-4 h-4 text-emerald-400" />
              <div><p className="text-[10px] font-bold text-white">NexaGo Store Support</p><p className="text-[8px] text-gray-400">Available 24/7 · Avg reply under 2 min</p></div>
            </button>
            <a href="tel:+8809612345678" className="w-full flex items-center space-x-2.5 bg-[#0a1322] border border-[#1e3050] rounded-xl p-3 cursor-pointer hover:bg-[#132238] text-left">
              <Phone className="w-4 h-4 text-emerald-400" />
              <div><p className="text-[10px] font-bold text-white">Call Support</p><p className="text-[8px] text-gray-400">+880 9612-345678</p></div>
            </a>
          </div>

          <button onClick={goBack} className="w-full py-2.5 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-orange/25 transition-colors">
            All Role Sites
          </button>
        </div>
      )}

      {/* ============ SUPPORT OVERLAY ============ */}
      {supportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setSupportOpen(false)}>
          <div className="w-full max-w-md bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 bg-[#0a1322] border-b border-[#1e3050] flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Store Support</h4>
              <button onClick={() => setSupportOpen(false)} className="w-7 h-7 rounded-full bg-[#132238] flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="bg-[#0a1322] border border-[#1e3050] rounded-2xl p-3 flex items-center space-x-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center"><Headphones className="w-4 h-4 text-emerald-400" /></div>
                <div>
                  <p className="text-[11px] font-bold text-white">NexaGo Store Support</p>
                  <p className="text-[9px] text-gray-400">Available 24/7 · Avg reply under 2 min</p>
                </div>
              </div>
              <a href="tel:+8809612345678" className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl p-3 flex items-center space-x-2.5 cursor-pointer hover:bg-[#132238]">
                <Phone className="w-4 h-4 text-emerald-400" />
                <div className="text-left"><p className="text-[10px] font-bold text-white">Call Support</p><p className="text-[8px] text-gray-400">+880 9612-345678</p></div>
              </a>
              <div className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl p-3 flex items-center space-x-2.5 cursor-pointer hover:bg-[#132238]">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <div className="text-left"><p className="text-[10px] font-bold text-white">Live Chat</p><p className="text-[8px] text-gray-400">Chat with a support agent</p></div>
              </div>
              <div className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl p-3 flex items-center space-x-2.5 cursor-pointer hover:bg-[#132238]">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <div className="text-left"><p className="text-[10px] font-bold text-white">FAQ & Guides</p><p className="text-[8px] text-gray-400">How to accept orders, print receipts, payouts</p></div>
              </div>
              <div className="bg-[#0a1322] border border-[#1e3050] rounded-xl p-3 space-y-2">
                <p className="text-[8px] font-bold text-gray-400 uppercase">Quick help</p>
                {[
                  ['How do I accept an order?', 'Tap Accept within 5 minutes — it auto-accepts at 0s.'],
                  ['How do I print a receipt?', 'Use the Print button in the live order screen.'],
                  ['When do I get paid?', 'Store payouts settle on Friday via the Pay tab.'],
                ].map(([q, a]) => (
                  <div key={q} className="border-t border-[#1e3050] pt-1.5 first:border-t-0 first:pt-0">
                    <p className="text-[9px] text-white font-bold">{q}</p>
                    <p className="text-[8px] text-gray-400">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ PRINT RECEIPT MODAL ============ */}
      {printOrder && (
        <div id="printable-store-receipt" className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0 print:m-0">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-store-receipt, #printable-store-receipt * { visibility: visible !important; }
              #printable-store-receipt { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; color: black !important; box-shadow: none !important; }
              .no-print { display: none !important; visibility: hidden !important; }
            }
          `}</style>
          <div className="bg-white text-gray-900 rounded-xl w-full max-w-[300px] shadow-2xl flex flex-col overflow-hidden max-h-[88vh] border border-gray-100 print:border-none print:shadow-none print:max-h-none print:w-full">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between no-print">
              <div className="flex items-center space-x-2">
                <Printer className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="text-[10px] font-black text-gray-800 uppercase tracking-wider">Store Receipt Preview</span>
              </div>
              <button onClick={() => setPrintOrder(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-all cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-white font-mono text-[9px] text-black border-b border-dashed border-gray-300 print:overflow-visible print:p-0">
              <div className="space-y-3">
                <div className="text-center space-y-1">
                  <div className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center mx-auto text-base font-black">S</div>
                  <p className="text-xs font-black uppercase tracking-wider">{printOrder.storeName}</p>
                  <p className="text-[7.5px] text-gray-500">{profile.storeSub}</p>
                </div>
                <div className="border-t border-dashed border-gray-300 pt-2 text-center">
                  <p className="text-[7.5px] text-gray-500 uppercase tracking-widest">Order No.</p>
                  <p className="text-base font-black tracking-wider">#{printOrder.id}</p>
                  <p className="text-[7.5px] text-gray-500">{new Date().toLocaleDateString()} · {printOrder.time || ''}</p>
                </div>
                <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5">
                  <p className="text-[7.5px] text-gray-500 uppercase tracking-widest">Customer</p>
                  <p className="font-bold">{printOrder.customerName}</p>
                  <p className="text-gray-600">{printOrder.customerPhone}</p>
                  <p className="text-gray-600">{printOrder.address || printOrder.pickupLocation}</p>
                </div>
                <div className="border-t border-dashed border-gray-300 pt-2">
                  <p className="text-[7.5px] text-gray-500 uppercase tracking-widest mb-1">Items</p>
                  {(printOrder.items || []).map((it: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-0.5">
                      <span className="truncate pr-2">{it.quantity || it.qty}x {it.name}</span>
                      <span className="font-bold whitespace-nowrap">{bdt((it.price || 0) * (it.quantity || it.qty || 1))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-0.5">
                    <span>Delivery fee</span>
                    <span className="font-bold">{bdt(printOrder.deliveryCharge || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-t border-dashed border-gray-300 mt-1 text-[10px] font-black">
                    <span>TOTAL</span>
                    <span>{bdt(printOrder.amount)}</span>
                  </div>
                  <p className="text-[7.5px] text-gray-500 pt-1 uppercase">{/cash|cod/i.test(printOrder.paymentMethod || '') ? 'Payment: Cash (COD)' : 'Payment: Prepaid'}</p>
                </div>
                <div className="text-center text-[7.5px] text-gray-500 border-t border-dashed border-gray-300 pt-2">
                  Thank you for ordering!<br />Powered by The NexaGo BD
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between no-print">
              <button onClick={() => setPrintOrder(null)} className="px-3 py-1.5 text-[9px] font-bold text-gray-600 rounded-lg cursor-pointer hover:bg-gray-200/60">Close</button>
              <button onClick={() => window.print()} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase rounded-lg cursor-pointer flex items-center space-x-1.5">
                <Printer className="w-3 h-3" /><span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Site — lean store portal: receive incoming customer orders and view
 * order history only. Accepting an order dispatches it straight to the first
 * available driver (status Confirmed + driverId). All management (products,
 * inventory, coupons, staff, payments) happens on the Store Admin site. Reads
 * the same localStorage keys as the admin panel.
 */
import React, { useMemo, useState } from 'react';
import { Inbox, History, CheckCircle2, Package, Send } from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, useDrivers, useStoreProfile, bdt, statusBadge } from './portalUtils';

export default function StorePortal() {
  const [orders, setOrders] = useOrders();
  const [drivers] = useDrivers();
  const [profile] = useStoreProfile();
  const [tab, setTab] = useState('receive');

  const history = useMemo(() => [...orders].sort((a, b) => ((b.date || '') < (a.date || '') ? -1 : 1)), [orders]);
  const incoming = orders.filter(o => o.status === 'Pending');
  const dispatched = orders.filter(o => o.status === 'Confirmed' || o.status === 'Processing' || o.status === 'Ongoing');
  const done = orders.filter(o => o.status === 'Completed');
  const cancelled = orders.filter(o => o.status === 'Cancelled');

  const nav = [
    { id: 'receive', label: 'Receive Orders', icon: Inbox, badge: incoming.length },
    { id: 'history', label: 'Order History', icon: History },
  ];

  const goBack = () => { window.open(`${window.location.origin}/index.html`, '_self'); };

  const acceptOrder = (id: string) => {
    const rider = drivers[0];
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: 'Confirmed' as any, driverId: rider?.id || 'DRV123456' } : o)));
  };

  const rejectOrder = (id: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: 'Cancelled' as any } : o)));
  };

  return (
    <PortalShell role="Store Site" tagline={profile.storeName || 'Smart Shop'} nav={nav} active={tab} onNav={setTab} onBack={goBack}>
      {tab === 'receive' && (
        <div className="space-y-3">
          <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-500/15 via-[#101d30] to-[#101d30] border border-emerald-500/20">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-xl">SM</div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">{profile.storeSub || 'NexaGo Store'}</p>
                <p className="text-lg font-black text-white">{profile.storeName || 'Smart Shop'}</p>
                <p className="text-[10px] text-gray-400">{incoming.length} new order{incoming.length === 1 ? '' : 's'} waiting · {dispatched.length} dispatched to driver</p>
              </div>
            </div>
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

          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Inbox className="w-4 h-4 text-brand-orange" /><span>New Orders</span></h3>
            <p className="text-[10px] text-gray-400">Customer placed these orders — accept to dispatch to a driver.</p>
          </div>

          {incoming.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No new orders right now ✓</p> : (
            <div className="space-y-2">
              {incoming.map(o => (
                <div key={o.id} className="bg-[#101d30] border border-amber-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <p className="text-[11px] font-mono text-brand-orange font-black">#{o.id}</p>
                      <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                      <span className="text-[9px] text-gray-500">{o.paymentMethod}</span>
                    </div>
                    <span className="text-[11px] font-black font-mono text-white">{bdt(o.amount)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2 text-[10px]">
                    <p className="text-gray-300"><b className="text-gray-200">{o.customerName}</b> · {o.customerPhone}</p>
                    <p className="text-gray-500">{o.date}</p>
                    <p className="text-gray-400 sm:col-span-2 truncate">{o.address || o.pickupLocation || '—'}</p>
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    <button onClick={() => rejectOrder(o.id)} className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-black hover:bg-red-500/20 transition-colors">Reject</button>
                    <button onClick={() => acceptOrder(o.id)} className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black transition-colors">
                      <CheckCircle2 className="w-3 h-3" /><span>Accept & Dispatch</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dispatched.length > 0 && (
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-2"><Send className="w-3.5 h-3.5 text-sky-400" /><span>Dispatched to Driver</span></p>
              <div className="space-y-1.5">
                {dispatched.slice(0, 4).map(o => (
                  <div key={o.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px]">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-brand-orange font-bold">#{o.id}</p>
                      <p className="text-[9px] text-gray-300 truncate">{o.customerName} · {drivers[0]?.name || 'Driver'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg border text-[8px] font-black shrink-0 ${statusBadge(o.status)}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><History className="w-4 h-4 text-brand-orange" /><span>Order History</span></h3>
            <p className="text-[10px] text-gray-400">Every order that came to this store.</p>
          </div>
          {history.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No orders yet.</p> : (
            <div className="space-y-2">
              {history.map(o => (
                <div key={o.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <p className="text-[11px] font-mono text-brand-orange font-black">#{o.id}</p>
                      <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                    </div>
                    <span className="text-[11px] font-black font-mono text-white">{bdt(o.amount)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-2 text-[10px]">
                    <p className="text-gray-300"><b className="text-gray-200">{o.customerName}</b> · {o.customerPhone}</p>
                    <p className="text-gray-400 truncate">{o.paymentMethod}</p>
                    <p className="text-gray-500">{o.date}</p>
                  </div>
                  <div className="flex items-center space-x-2 mt-2 text-[9px]">
                    {o.items && o.items.length > 0 && (
                      <span className="flex items-center space-x-1 text-gray-400"><Package className="w-3 h-3" /><span>{o.items.length} item{o.items.length === 1 ? '' : 's'}</span></span>
                    )}
                    {o.customerPhone && (
                      <a href={`https://wa.me/${o.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-emerald-400 hover:underline"><Send className="w-3 h-3" /><span>WhatsApp</span></a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PortalShell>
  );
}

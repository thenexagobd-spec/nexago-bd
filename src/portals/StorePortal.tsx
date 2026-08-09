/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Site — lean store portal: receive incoming orders and view order
 * history only. All management (products, inventory, coupons, staff, payments)
 * happens on the Store Admin site. Reads the same localStorage keys as the
 * admin panel.
 */
import React, { useMemo, useState } from 'react';
import { Inbox, History, CheckCircle2, Clock, Package, Send } from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, useStoreProfile, bdt, statusBadge } from './portalUtils';

export default function StorePortal() {
  const [orders, setOrders] = useOrders();
  const [profile] = useStoreProfile();
  const [tab, setTab] = useState('receive');

  const history = useMemo(() => [...orders].sort((a, b) => ((b.date || '') < (a.date || '') ? -1 : 1)), [orders]);
  const incoming = orders.filter(o => o.status === 'Pending');
  const active = orders.filter(o => o.status === 'Confirmed' || o.status === 'Processing' || o.status === 'Ongoing');
  const done = orders.filter(o => o.status === 'Completed');
  const cancelled = orders.filter(o => o.status === 'Cancelled');

  const nav = [
    { id: 'receive', label: 'Receive Orders', icon: Inbox, badge: incoming.length },
    { id: 'history', label: 'Order History', icon: History },
  ];

  const goBack = () => { window.open(`${window.location.origin}/index.html`, '_self'); };

  const setStatus = (id: string, status: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: status as any } : o)));
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
                <p className="text-[10px] text-gray-400">{incoming.length} new order{incoming.length === 1 ? '' : 's'} waiting · {active.length} in progress</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'New', value: incoming.length.toString(), sub: 'awaiting accept', color: 'text-amber-400' },
              { label: 'Active', value: active.length.toString(), sub: 'in progress', color: 'text-sky-400' },
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
            <p className="text-[10px] text-gray-400">Accept incoming orders — they move to the kitchen & delivery flow.</p>
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
                    <button onClick={() => setStatus(o.id, 'Cancelled')} className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-black hover:bg-red-500/20 transition-colors">Reject</button>
                    <button onClick={() => setStatus(o.id, 'Confirmed')} className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black transition-colors">
                      <CheckCircle2 className="w-3 h-3" /><span>Accept Order</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {active.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2 mt-2"><Clock className="w-4 h-4 text-sky-400" /><span>In Progress</span></h3>
              </div>
              <div className="space-y-2">
                {active.map(o => (
                  <div key={o.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <p className="text-[11px] font-mono text-brand-orange font-black">#{o.id}</p>
                        <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                      </div>
                      <span className="text-[11px] font-black font-mono text-white">{bdt(o.amount)}</span>
                    </div>
                    <p className="text-[10px] text-gray-300 mt-1.5 truncate">{o.customerName} · {o.address || o.pickupLocation || '—'}</p>
                    <div className="flex items-center justify-end space-x-2 mt-3">
                      <button onClick={() => setStatus(o.id, 'Processing')} className="px-3 py-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-xl text-[10px] font-black hover:bg-amber-500/25 transition-colors">Process</button>
                      <button onClick={() => setStatus(o.id, 'Completed')} className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black transition-colors">
                        <CheckCircle2 className="w-3 h-3" /><span>Mark Complete</span>
                      </button>
                    </div>
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

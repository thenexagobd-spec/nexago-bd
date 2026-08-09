/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Super Admin Staff Site — fresh staff portal: dashboard, orders, order tools,
 * support, notifications and reports. Reads the same localStorage keys as the
 * admin panel.
 */
import React, { useState } from 'react';
import { LayoutDashboard, ClipboardList, Wrench, LifeBuoy, Bell, BarChart3, CheckCircle2, TrendingUp, Ticket } from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, useTickets, useNotifications, useWalletBal, useWalletTxns, bdt, statusBadge } from './portalUtils';

export default function StaffPortal() {
  const [orders, setOrders] = useOrders();
  const [tickets, setTickets] = useTickets();
  const [notifications, setNotifications] = useNotifications();
  const [walletBal, setWalletBal] = useWalletBal();
  const [txns, setTxns] = useWalletTxns();
  const [tab, setTab] = useState('dashboard');
  const [custTickets, setCustTickets] = useState<any[]>(() => {
    try { const raw = localStorage.getItem('ss_tickets_v2'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });

  const pending = txns.filter(t => t.status === 'Pending');
  const openTickets = tickets.filter(t => t.status === 'Open');
  const unread = notifications.filter(n => !n.read).length;
  const revenue = orders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);
  const byStatus = ['Completed', 'Pending', 'Confirmed', 'Processing', 'Cancelled'].map(st => ({ st, n: orders.filter(o => o.status === st).length }));

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ClipboardList, badge: orders.filter(o => o.status === 'Pending').length },
    { id: 'tools', label: 'Order Tools', icon: Wrench, badge: pending.length },
    { id: 'support', label: 'Support', icon: LifeBuoy, badge: openTickets.length + custTickets.length },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: unread },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const goBack = () => { window.open(`${window.location.origin}/index.html`, '_self'); };

  const updateStatus = (id: string, status: string) => setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: status as any } : o)));
  const approveTopUp = (tx: any, ok: boolean) => {
    const next = txns.map(t => (t.id === tx.id ? { ...t, status: ok ? 'Completed' : 'Rejected' } : t));
    setTxns(next);
    if (ok) setWalletBal(walletBal + tx.amount);
  };
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const closeTicket = (id: string) => setTickets(prev => prev.map(t => (t.id === id ? { ...t, status: 'Closed' } : t)));
  const closeCustTicket = (id: string) => setCustTickets(prev => prev.map(t => (t.id === id ? { ...t, status: 'Resolved' } : t)));

  return (
    <PortalShell role="Admin Staff" tagline="Super Admin Support" nav={nav} active={tab} onNav={setTab} onBack={goBack}>
      {tab === 'dashboard' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 bg-gradient-to-r from-violet-500/15 via-[#101d30] to-[#101d30] border border-violet-500/20 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-white text-xl">AS</div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">Support & Operations Team</p>
                <p className="text-lg font-black text-white">NexaGo Staff Console</p>
                <p className="text-[10px] text-gray-400">Super Admin Staff · {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
              </div>
            </div>
            <button onClick={() => setTab('support')} className="flex items-center space-x-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors">
              <LifeBuoy className="w-3.5 h-3.5" /><span>Open Queue ({openTickets.length + custTickets.length})</span>
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Open Tickets', value: (openTickets.length + custTickets.length).toString(), sub: 'needs attention', color: 'text-amber-400' },
              { label: 'Orders Today', value: orders.length.toString(), sub: `${orders.filter(o => o.status === 'Pending').length} pending`, color: 'text-white' },
              { label: 'Pending Top-Ups', value: pending.length.toString(), sub: 'verify wallet credits', color: 'text-brand-orange' },
              { label: 'Unread Alerts', value: unread.toString(), sub: 'notifications', color: 'text-sky-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-2xl font-black mt-1.5 ${k.color}`}>{k.value}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><Ticket className="w-3.5 h-3.5 text-brand-orange" /><span>Latest Tickets</span></p>
              {tickets.slice(0, 4).map(t => (
                <div key={t.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 mb-2 text-[10px]">
                  <div className="min-w-0">
                    <p className="font-mono text-brand-orange font-bold">{t.id}</p>
                    <p className="text-gray-300 truncate">{t.subject}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black shrink-0 ${t.status === 'Open' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{t.status}</span>
                </div>
              ))}
              {tickets.length === 0 && <p className="text-[10px] text-gray-500 py-4 text-center">No tickets.</p>}
            </div>
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><TrendingUp className="w-3.5 h-3.5 text-brand-orange" /><span>Orders by Status</span></p>
              <div className="space-y-2">
                {byStatus.map(s => (
                  <div key={s.st} className="flex items-center space-x-2 text-[10px]">
                    <span className="w-24 text-gray-400">{s.st}</span>
                    <div className="flex-1 h-2.5 bg-[#0a1322] rounded-full overflow-hidden">
                      <div className={`h-full ${s.st === 'Completed' ? 'bg-emerald-500' : s.st === 'Cancelled' ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${orders.length ? (s.n / orders.length) * 100 : 0}%` }} />
                    </div>
                    <span className="text-gray-400 w-6 text-right font-mono">{s.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><ClipboardList className="w-4 h-4 text-brand-orange" /><span>Orders</span></h3>
            <p className="text-[10px] text-gray-400">Track & update order status across the network.</p>
          </div>
          {orders.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No orders found.</p> : (
            <div className="space-y-2">
              {orders.map(o => (
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
                    <p className="text-gray-400 truncate">{o.storeName} · {o.paymentMethod}</p>
                    <p className="text-gray-500">{o.date}</p>
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    {o.status !== 'Completed' && o.status !== 'Cancelled' && (
                      <>
                        <button onClick={() => updateStatus(o.id, 'Ongoing')} className="px-3 py-1.5 bg-sky-500/15 border border-sky-500/40 text-sky-300 rounded-lg text-[9px] font-black hover:bg-sky-500/25 transition-colors">Dispatch</button>
                        <button onClick={() => updateStatus(o.id, 'Completed')} className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors"><CheckCircle2 className="w-3 h-3" /><span>Complete</span></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tools' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Wrench className="w-4 h-4 text-brand-orange" /><span>Order Tools</span></h3>
            <p className="text-[10px] text-gray-400">Verify wallet top-ups & review the ledger.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Pending Top-Ups ({pending.length})</p>
              <span className="text-[10px] text-emerald-400 font-black">Wallet: {bdt(walletBal)}</span>
            </div>
            {pending.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">Queue clear ✓</p> : (
              <div className="space-y-2">
                {pending.map(tx => (
                  <div key={tx.id} className="bg-[#0a1322] border border-amber-500/30 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] font-mono text-brand-orange font-bold">{tx.id}</p>
                      <p className="text-[9px] text-gray-400">{tx.sender} · {tx.method} · {tx.date}</p>
                    </div>
                    <span className="text-[12px] font-black text-emerald-400">+{bdt(tx.amount)}</span>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => approveTopUp(tx, true)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors">✓ Verify</button>
                      <button onClick={() => approveTopUp(tx, false)} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-[9px] font-black transition-colors">✗ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Wallet Ledger</p>
            {txns.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">No wallet activity.</p> : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {txns.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-lg px-3 py-2 text-[10px]">
                    <p className="text-gray-300 truncate">{t.type} <span className="font-mono text-gray-500">{t.id}</span></p>
                    <span className={`font-mono font-black ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.amount >= 0 ? '+' : ''}{bdt(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><LifeBuoy className="w-4 h-4 text-brand-orange" /><span>Support Queue</span></h3>
            <p className="text-[10px] text-gray-400">Platform tickets + customer-raised tickets.</p>
          </div>
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-brand-orange font-bold">{t.id}</p>
                    <p className="text-[11px] font-bold text-white truncate">{t.subject}</p>
                    <p className="text-[9px] text-gray-500">{t.category} · {t.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg border text-[8px] font-black ${t.status === 'Open' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{t.status}</span>
                </div>
                {t.status !== 'Closed' && (
                  <div className="flex items-center justify-end mt-3">
                    <button onClick={() => closeTicket(t.id)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors">✓ Resolve</button>
                  </div>
                )}
              </div>
            ))}
            {custTickets.map(t => (
              <div key={t.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-brand-orange font-bold">{t.id} <span className="text-[8px] text-gray-500 ml-1">customer</span></p>
                    <p className="text-[11px] font-bold text-white truncate">{t.subject}</p>
                    <p className="text-[9px] text-gray-500">{t.category} · {t.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg border text-[8px] font-black ${t.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>{t.status}</span>
                </div>
                {t.status !== 'Resolved' && (
                  <div className="flex items-center justify-end mt-3">
                    <button onClick={() => closeCustTicket(t.id)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors">✓ Resolve</button>
                  </div>
                )}
              </div>
            ))}
            {tickets.length + custTickets.length === 0 && <p className="text-center text-[10px] text-gray-500 py-10">Queue clear ✓</p>}
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><Bell className="w-4 h-4 text-brand-orange" /><span>Notifications</span></h3>
              <p className="text-[10px] text-gray-400">Platform alerts & announcements.</p>
            </div>
            <button onClick={markAllRead} className="px-3 py-2 bg-sky-500/15 border border-sky-500/40 text-sky-300 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-sky-500/25 transition-colors">Mark all read</button>
          </div>
          {notifications.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No notifications.</p> : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id} className={`bg-[#101d30] border rounded-2xl p-4 ${n.read ? 'border-[#1e3050] opacity-70' : 'border-sky-500/40'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white">{n.title} {!n.read && <span className="ml-1 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[8px] font-black">NEW</span>}</p>
                      <p className="text-[9px] text-gray-400 mt-1">{n.message}</p>
                      <p className="text-[8px] text-gray-600 mt-1">{n.date || '—'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black shrink-0 ${n.type === 'system' ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' : n.type === 'order' ? 'bg-brand-orange/20 text-brand-orange border-brand-orange/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{n.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><BarChart3 className="w-4 h-4 text-brand-orange" /><span>Reports</span></h3>
            <p className="text-[10px] text-gray-400">Platform performance at a glance.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Orders', value: orders.length.toString(), color: 'text-white' },
              { label: 'Completed', value: orders.filter(o => o.status === 'Completed').length.toString(), color: 'text-emerald-400' },
              { label: 'Cancelled', value: orders.filter(o => o.status === 'Cancelled').length.toString(), color: 'text-red-400' },
              { label: 'Revenue', value: bdt(revenue), color: 'text-brand-orange' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Order Mix</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {byStatus.map(s => (
                <div key={s.st} className="flex items-center space-x-2 text-[10px]">
                  <span className="w-24 text-gray-400">{s.st}</span>
                  <div className="flex-1 h-2 bg-[#0a1322] rounded-full overflow-hidden"><div className={`h-full ${s.st === 'Completed' ? 'bg-emerald-500' : s.st === 'Cancelled' ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${orders.length ? (s.n / orders.length) * 100 : 0}%` }} /></div>
                  <span className="text-gray-400 w-6 text-right font-mono">{s.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

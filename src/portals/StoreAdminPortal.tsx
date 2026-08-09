/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Admin Site — fresh store-management portal: dashboard, orders, order
 * tools (top-ups/wallet/refunds), staff, payments and support. Reads the same
 * localStorage keys as the admin panel.
 */
import React, { useState } from 'react';
import { LayoutDashboard, ClipboardList, Wrench, UserSquare2, CreditCard, LifeBuoy, CheckCircle2, TrendingUp, UserPlus, Phone } from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, usePayments, useTickets, useWalletBal, useWalletTxns, useProducts, bdt, statusBadge } from './portalUtils';

interface Staff {
  id: string; name: string; role: string; shift: string; status: string; phone: string;
}

export default function StoreAdminPortal() {
  const [orders, setOrders] = useOrders();
  const [payments, setPayments] = usePayments();
  const [tickets, setTickets] = useTickets();
  const [walletBal, setWalletBal] = useWalletBal();
  const [txns, setTxns] = useWalletTxns();
  const [products] = useProducts();
  const [tab, setTab] = useState('dashboard');
  const [staff, setStaff] = useState<Staff[]>([
    { id: 'STF-01', name: 'Asif Rahman', role: 'Inventory Manager', shift: 'Day Shift', status: 'Active', phone: '01812345678' },
    { id: 'STF-02', name: 'Nusrat Jahan', role: 'Support Supervisor', shift: 'Night Shift', status: 'Active', phone: '01712345679' },
    { id: 'STF-03', name: 'Monirul Islam', role: 'Delivery Lead', shift: 'Day Shift', status: 'Active', phone: '01612345670' },
  ]);
  const [stf, setStf] = useState({ name: '', role: '', phone: '' });

  const pending = txns.filter(t => t.status === 'Pending');
  const refunds = JSON.parse(localStorage.getItem('ss_refunds') || '[]');
  const revenue = orders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ClipboardList, badge: orders.filter(o => o.status === 'Pending').length },
    { id: 'tools', label: 'Order Tools', icon: Wrench, badge: pending.length },
    { id: 'staff', label: 'Staff', icon: UserSquare2 },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'support', label: 'Support', icon: LifeBuoy, badge: tickets.filter(t => t.status === 'Open').length },
  ];

  const goBack = () => { window.open(`${window.location.origin}/index.html`, '_self'); };

  const updateStatus = (id: string, status: string) => setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: status as any } : o)));

  const approveTopUp = (tx: any, ok: boolean) => {
    const next = txns.map(t => (t.id === tx.id ? { ...t, status: ok ? 'Completed' : 'Rejected' } : t));
    setTxns(next);
    if (ok) setWalletBal(walletBal + tx.amount);
  };

  const addStaff = () => {
    if (!stf.name || !stf.role) return;
    setStaff(prev => [...prev, { id: `STF-0${prev.length + 1}`, name: stf.name, role: stf.role, shift: 'Day Shift', status: 'Active', phone: stf.phone || '—' }]);
    setStf({ name: '', role: '', phone: '' });
  };

  const replyTicket = (id: string, ok: boolean) => setTickets(prev => prev.map(t => (t.id === id ? { ...t, status: ok ? 'Closed' : 'In Progress' } : t)));

  return (
    <PortalShell role="Store Admin" tagline="Store Operations" nav={nav} active={tab} onNav={setTab} onBack={goBack}>
      {tab === 'dashboard' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 bg-gradient-to-r from-teal-500/15 via-[#101d30] to-[#101d30] border border-teal-500/20 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center font-black text-white text-xl">SA</div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">Store Admin Console</p>
                <p className="text-lg font-black text-white">Smart Shop Admin</p>
                <p className="text-[10px] text-gray-400">Dhanmondi Hub · 5 staff online</p>
              </div>
            </div>
            <button onClick={() => setTab('tools')} className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors">
              <Wrench className="w-3.5 h-3.5" /><span>Review Top-Ups {pending.length > 0 && `(${pending.length})`}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Orders', value: orders.length.toString(), sub: `${orders.filter(o => o.status === 'Pending').length} pending`, color: 'text-white' },
              { label: 'Revenue', value: bdt(revenue), sub: 'completed', color: 'text-teal-400' },
              { label: 'Wallet Balance', value: bdt(walletBal), sub: 'customer funds', color: 'text-brand-orange' },
              { label: 'Products', value: products.length.toString(), sub: 'catalog live', color: 'text-sky-400' },
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
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><TrendingUp className="w-3.5 h-3.5 text-brand-orange" /><span>Recent Orders</span></p>
              {orders.length === 0 ? <p className="text-[10px] text-gray-500 py-6 text-center">No orders yet.</p> : (
                <div className="space-y-2">
                  {orders.slice(0, 4).map(o => (
                    <div key={o.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-brand-orange font-bold">#{o.id}</p>
                        <p className="text-[9px] text-gray-300 truncate">{o.customerName} · {bdt(o.amount)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><UserSquare2 className="w-3.5 h-3.5 text-brand-orange" /><span>Staff</span></p>
              <div className="space-y-2">
                {staff.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px]">
                    <div className="min-w-0">
                      <p className="text-gray-200 font-bold truncate">{s.name}</p>
                      <p className="text-[8px] text-gray-500">{s.role} · {s.shift}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${s.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>{s.status}</span>
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
            <p className="text-[10px] text-gray-400">Manage order status — changes reflect on the admin panel.</p>
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
                        <button onClick={() => updateStatus(o.id, 'Confirmed')} className="px-3 py-2 bg-sky-500/15 border border-sky-500/40 text-sky-300 rounded-xl text-[10px] font-black hover:bg-sky-500/25 transition-colors">Confirm</button>
                        <button onClick={() => updateStatus(o.id, 'Processing')} className="px-3 py-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-xl text-[10px] font-black hover:bg-amber-500/25 transition-colors">Process</button>
                        <button onClick={() => updateStatus(o.id, 'Completed')} className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black transition-colors"><CheckCircle2 className="w-3 h-3" /><span>Complete</span></button>
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
            <p className="text-[10px] text-gray-400">Verify top-ups, watch the wallet ledger & refunds.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Pending Top-Ups ({pending.length})</p>
              <span className="text-[10px] text-emerald-400 font-black">Wallet: {bdt(walletBal)}</span>
            </div>
            {pending.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">No pending top-ups ✓</p> : (
              <div className="space-y-2">
                {pending.map(tx => (
                  <div key={tx.id} className="bg-[#0a1322] border border-amber-500/30 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] font-mono text-brand-orange font-bold">{tx.id}</p>
                      <p className="text-[9px] text-gray-400">{tx.sender} · {tx.method} · {tx.date}</p>
                    </div>
                    <span className="text-[12px] font-black text-emerald-400">+{bdt(tx.amount)}</span>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => approveTopUp(tx, true)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors">✓ Approve</button>
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
          {refunds.length > 0 && (
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Refunds ({refunds.length})</p>
              <div className="space-y-1.5">
                {refunds.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-[#0a1322] border border-[#1e3050] rounded-lg px-3 py-2 text-[10px]">
                    <p className="text-gray-300 truncate">{r.orderId} · {r.method} {r.number}</p>
                    <span className="font-mono font-black text-red-400">{bdt(r.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><UserSquare2 className="w-4 h-4 text-brand-orange" /><span>Staff Management</span></h3>
              <p className="text-[10px] text-gray-400">Hire and manage store staff.</p>
            </div>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 flex flex-wrap items-center gap-2">
            <input value={stf.name} onChange={e => setStf(prev => ({ ...prev, name: e.target.value }))} placeholder="Name" className="flex-1 min-w-[140px] bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
            <input value={stf.role} onChange={e => setStf(prev => ({ ...prev, role: e.target.value }))} placeholder="Role" className="flex-1 min-w-[120px] bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
            <input value={stf.phone} onChange={e => setStf(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="w-36 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
            <button onClick={addStaff} className="flex items-center space-x-1.5 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-[10px] font-black transition-colors"><UserPlus className="w-3.5 h-3.5" /><span>Hire</span></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staff.map(s => (
              <div key={s.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-black text-sm">{s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{s.name}</p>
                    <p className="text-[9px] text-gray-500">{s.role}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-[9px]">
                  <span className="text-gray-400 flex items-center space-x-1"><Phone className="w-3 h-3" /><span>{s.phone}</span></span>
                  <span className={`px-2 py-0.5 rounded-lg border font-black ${s.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><CreditCard className="w-4 h-4 text-brand-orange" /><span>Payments</span></h3>
            <p className="text-[10px] text-gray-400">Store payment records from the shared ledger.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total Payments', value: payments.length.toString(), color: 'text-white' },
              { label: 'Paid', value: payments.filter(p => p.status === 'Paid').length.toString(), color: 'text-emerald-400' },
              { label: 'Pending', value: payments.filter(p => p.status !== 'Paid').length.toString(), color: 'text-amber-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-[10px]">
              <thead><tr className="bg-[#0a1322] text-gray-400 text-[9px] uppercase tracking-wider"><th className="px-3 py-2.5">Ref</th><th className="px-3 py-2.5">Method</th><th className="px-3 py-2.5">Amount</th><th className="px-3 py-2.5">Status</th></tr></thead>
              <tbody className="divide-y divide-[#1e3050]">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-[#132238] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-brand-orange font-bold">#{p.id}</td>
                    <td className="px-3 py-2.5 text-gray-300">{p.method || '—'}</td>
                    <td className="px-3 py-2.5 font-mono font-black text-white">{bdt(p.amount)}</td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${p.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>{p.status}</span></td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No payments.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><LifeBuoy className="w-4 h-4 text-brand-orange" /><span>Support Tickets</span></h3>
            <p className="text-[10px] text-gray-400">Customer tickets from the shared support queue.</p>
          </div>
          {tickets.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No tickets.</p> : (
            <div className="space-y-2">
              {tickets.map(t => (
                <div key={t.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-brand-orange font-bold">{t.id}</p>
                      <p className="text-[11px] font-bold text-white truncate">{t.subject}</p>
                      <p className="text-[9px] text-gray-500">{t.category} · {t.date}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg border text-[8px] font-black ${t.status === 'Open' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : t.status === 'Closed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-sky-500/20 text-sky-300 border-sky-500/30'}`}>{t.status}</span>
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    <button onClick={() => replyTicket(t.id, false)} className="px-3 py-1.5 bg-sky-500/15 border border-sky-500/40 text-sky-300 rounded-lg text-[9px] font-black hover:bg-sky-500/25 transition-colors">In Progress</button>
                    <button onClick={() => replyTicket(t.id, true)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors">✓ Close</button>
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

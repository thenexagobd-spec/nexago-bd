/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, AdminAuditEntry, RefundRequest, WalletConfig, WalletKey, DEFAULT_WALLETS, WALLET_CONFIG_KEY } from '../types';
import {
  History, Banknote, TrendingUp, Wallet, X, PlusCircle, ShieldCheck,
  ClipboardList, Check
} from 'lucide-react';
import { BkashLogo, NagadLogo, UpayLogo, RocketLogo, WALLET_META } from './walletLogos';

const lsGet = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const lsSet = (key: string, v: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* noop */ }
};

interface OrderToolsDashboardProps {
  orders: Order[];
  showToast?: (message: string, type?: 'success' | 'info') => void;
}

type ToolTab = 'orders' | 'audit' | 'refunds' | 'analytics' | 'wallets';

export default function OrderToolsDashboard({ orders, showToast }: OrderToolsDashboardProps) {
  const [tab, setTab] = useState<ToolTab>('orders');

  // Payment method & payment status filters (moved here from the All Orders header)
  const [payFilter, setPayFilter] = useState<'All' | 'bKash' | 'Nagad' | 'Upay' | 'Rocket' | 'Cash on Delivery' | 'Card' | 'Wallet'>('All');
  const [payStatusFilter, setPayStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'COD' | 'Paid'>('All');

  const [auditLog, setAuditLog] = useState<AdminAuditEntry[]>(() => lsGet('ss_admin_audit', []));
  useEffect(() => lsSet('ss_admin_audit', auditLog), [auditLog]);

  const [refunds, setRefunds] = useState<RefundRequest[]>(() => lsGet('ss_refunds', []));
  useEffect(() => lsSet('ss_refunds', refunds), [refunds]);

  const [walletCfg, setWalletCfg] = useState<WalletConfig>(() => lsGet<WalletConfig>(WALLET_CONFIG_KEY, DEFAULT_WALLETS));

  // Keep wallet numbers in sync if edited from another tab
  useEffect(() => {
    const onStorage = () => setWalletCfg(lsGet<WalletConfig>(WALLET_CONFIG_KEY, DEFAULT_WALLETS));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setWalletNum = (k: WalletKey, i: number, v: string) =>
    setWalletCfg(prev => ({ ...prev, [k]: { ...prev[k], numbers: prev[k].numbers.map((n, j) => (j === i ? v : n)) } }));
  const addWalletNum = (k: WalletKey) =>
    setWalletCfg(prev => ({ ...prev, [k]: { ...prev[k], numbers: [...prev[k].numbers, '01XXX-XXXXXX'] } }));
  const removeWalletNum = (k: WalletKey, i: number) =>
    setWalletCfg(prev => ({ ...prev, [k]: { ...prev[k], numbers: prev[k].numbers.filter((_, j) => j !== i) } }));
  const setWalletName = (k: WalletKey, v: string) =>
    setWalletCfg(prev => ({ ...prev, [k]: { ...prev[k], name: v } }));
  const saveWallets = () => {
    lsSet(WALLET_CONFIG_KEY, walletCfg);
    showToast && showToast('Wallet numbers saved — customers now send money to these', 'success');
  };

  const tabs: { key: ToolTab; label: string; icon: any; badge?: number }[] = [
    { key: 'orders', label: 'Orders', icon: ClipboardList, badge: orders.length },
    { key: 'audit', label: 'Audit Log', icon: History, badge: auditLog.length },
    { key: 'refunds', label: 'Refund Requests', icon: Banknote, badge: refunds.filter(r => r.status === 'Requested').length },
    { key: 'analytics', label: 'Orders Analytics', icon: TrendingUp },
    { key: 'wallets', label: 'Payment Wallets', icon: Wallet },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-brand-orange" />
            <span>Order Tools</span>
          </h2>
          <p className="text-xs text-gray-400">Audit log, refund requests, orders analytics & payment wallets — all in one dashboard.</p>
        </div>
      </div>

      {/* Tool tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
              tab === t.key
                ? 'bg-brand-orange/10 border-brand-orange text-brand-orange'
                : 'bg-brand-dark/40 border-brand-border/50 text-gray-400 hover:text-gray-200 hover:bg-brand-dark/80'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-brand-border/50 text-gray-300">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-brand-card border border-brand-border/60 rounded-2xl p-5 text-xs max-w-5xl">
        {/* ============ ORDERS — PAYMENT FILTER ============ */}
        {tab === 'orders' && (
          <div className="space-y-3">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><ClipboardList className="w-4 h-4 text-brand-orange" /><span>Orders — Payment Filter</span></h3>
            <p className="text-[10px] text-gray-400">Filter orders by payment method and payment status.</p>

            {(() => {
              const bucket = (m: string) => m.startsWith('bKash') ? 'bKash' : m.startsWith('Nagad') ? 'Nagad' : m.startsWith('Upay') ? 'Upay' : m.startsWith('Rocket') ? 'Rocket' : m.includes('Wallet') ? 'Wallet' : m.includes('Cash') ? 'Cash on Delivery' : m;
              const filtered = orders.filter(o =>
                (payFilter === 'All' || bucket(o.paymentMethod) === payFilter) &&
                (payStatusFilter === 'All' || o.paymentStatus === payStatusFilter)
              );
              return (
                <div className="space-y-3">
                  <div className="flex flex-col lg:flex-row gap-3 lg:items-center border border-brand-border/50 rounded-xl p-3 bg-brand-dark/20">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Payment:</span>
                      {(['All', 'bKash', 'Nagad', 'Upay', 'Rocket', 'Cash on Delivery', 'Card', 'Wallet'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setPayFilter(m)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                            payFilter === m
                              ? 'bg-brand-orange/10 border-brand-orange text-brand-orange'
                              : 'bg-brand-dark/40 border-brand-border/50 text-gray-400 hover:text-gray-200 hover:bg-brand-dark/80'
                          }`}
                        >
                          {m === 'All' ? 'All Methods' : m === 'Cash on Delivery' ? 'COD' : m}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Pay Status:</span>
                      {(['All', 'Pending', 'Approved', 'Rejected', 'COD', 'Paid'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setPayStatusFilter(s)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                            payStatusFilter === s
                              ? 'bg-brand-orange/10 border-brand-orange text-brand-orange'
                              : 'bg-brand-dark/40 border-brand-border/50 text-gray-400 hover:text-gray-200 hover:bg-brand-dark/80'
                          }`}
                        >
                          {s === 'Pending' ? '⏳ Pending' : s === 'Approved' ? '✓ Approved' : s === 'Rejected' ? '✗ Rejected' : s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-brand-border/40 rounded-xl">
                    <table className="w-full text-left text-xs min-w-[760px]">
                      <thead>
                        <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40 select-none">
                          <th className="py-2.5 px-3 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Order</th>
                          <th className="py-2.5 px-3 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Customer</th>
                          <th className="py-2.5 px-3 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Store</th>
                          <th className="py-2.5 px-3 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Amount</th>
                          <th className="py-2.5 px-3 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Payment</th>
                          <th className="py-2.5 px-3 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Pay Status</th>
                          <th className="py-2.5 px-3 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Status</th>
                          <th className="py-2.5 px-3 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={8} className="py-10 text-center text-gray-500">No orders match these filters.</td></tr>
                        ) : filtered.map(o => (
                          <tr key={o.id} className="border-b border-brand-border/30 last:border-0 hover:bg-brand-dark/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-gray-300">#{o.id}</td>
                            <td className="py-2.5 px-3 text-gray-200 font-semibold">
                              <span className="block">{o.customerName}</span>
                              {o.customerNote && <span className="block text-[9px] text-blue-300 truncate max-w-[150px]" title={o.customerNote}>💬 {o.customerNote}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-gray-400">{o.storeName}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-white">৳{o.amount.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-gray-300">{o.paymentMethod}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                o.paymentStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                                o.paymentStatus === 'Rejected' ? 'bg-red-500/10 text-red-300 border border-red-500/20' :
                                o.paymentStatus === 'COD' ? 'bg-slate-500/10 text-slate-300 border border-slate-500/20' :
                                o.paymentStatus === 'Paid' ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' :
                                'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              }`}>
                                {o.paymentStatus === 'Approved' ? <><Check className="w-3 h-3 mr-1" />Approved</> : o.paymentStatus || '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-400">{o.status}</td>
                            <td className="py-2.5 px-3 text-gray-500">{o.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ============ AUDIT LOG ============ */}
        {tab === 'audit' && (
          <div className="space-y-3">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><History className="w-4 h-4 text-brand-orange" /><span>Admin Audit Log</span></h3>
            <p className="text-[10px] text-gray-400">Who approved / rejected / refunded which payment & when.</p>
            {auditLog.length === 0 ? (
              <p className="text-center text-gray-500 py-6">No audit entries yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLog.map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-brand-dark/50 border border-brand-border/40 rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        e.action === 'Approved' ? 'bg-emerald-500/20 text-emerald-300' : e.action === 'Rejected' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {e.action === 'Approved' ? '✓' : e.action === 'Rejected' ? '✗' : '↩'}
                      </span>
                      <div>
                        <p className="text-gray-200 font-bold">{e.action} · <span className="font-mono text-gray-400">#{e.orderId}</span></p>
                        <p className="text-[9px] text-gray-500">{e.paymentMethod} · ৳{e.amount}{e.reason ? ` · ${e.reason}` : ''}</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500 shrink-0">{new Date(e.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ REFUNDS ============ */}
        {tab === 'refunds' && (
          <div className="space-y-3">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><Banknote className="w-4 h-4 text-brand-orange" /><span>Refund Requests</span></h3>
            <p className="text-[10px] text-gray-400">Customers request refunds here with their bKash/Nagad number.</p>
            {refunds.length === 0 ? (
              <p className="text-center text-gray-500 py-6">No refund requests yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {refunds.map(r => (
                  <div key={r.id} className="bg-brand-dark/50 border border-brand-border/40 rounded-lg px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-200 font-bold">#{r.orderId} · <span className="font-mono">৳{r.amount}</span></p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        r.status === 'Refunded' ? 'bg-emerald-500/20 text-emerald-300' : r.status === 'Rejected' ? 'bg-red-500/20 text-red-300' : r.status === 'Processing' ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>{r.status}</span>
                    </div>
                    <p className="text-[9px] text-gray-500">{r.method} · <b className="font-mono text-gray-300">{r.number}</b> · {r.reason}</p>
                    {r.status === 'Requested' && (
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => {
                            setRefunds(prev => prev.map(x => x.id === r.id ? { ...x, status: 'Refunded' } : x));
                            setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Refunded', orderId: r.orderId, paymentMethod: r.method, amount: r.amount, at: Date.now() }, ...prev]);
                            showToast && showToast(`Refund approved for #${r.orderId} (৳${r.amount})`, 'success');
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >Refunded ✓</button>
                        <button
                          onClick={() => { setRefunds(prev => prev.map(x => x.id === r.id ? { ...x, status: 'Rejected' } : x)); showToast && showToast('Refund request rejected', 'info'); }}
                          className="px-3 py-1.5 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ ANALYTICS ============ */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><TrendingUp className="w-4 h-4 text-brand-orange" /><span>Analytics & Reports</span></h3>
            {(() => {
              const bucket = (m: string) => m.startsWith('bKash') ? 'bKash' : m.startsWith('Nagad') ? 'Nagad' : m.startsWith('Upay') ? 'Upay' : m.startsWith('Rocket') ? 'Rocket' : m.includes('Wallet') ? 'Wallet' : m.includes('Cash') ? 'Cash on Delivery' : m;
              const byMethod = (m: string) => {
                const list = orders.filter(o => bucket(o.paymentMethod) === m);
                return { count: list.length, total: list.reduce((s, o) => s + o.amount, 0), approved: list.filter(o => o.paymentStatus === 'Approved').length };
              };
              const methods = ['bKash', 'Nagad', 'Upay', 'Rocket', 'Cash on Delivery', 'Card', 'Wallet'];
              const methodStats = methods.map(m => ({ m, ...byMethod(m) }));
              const maxTotal = Math.max(1, ...methodStats.map(s => s.total));
              const grandTotal = orders.reduce((s, o) => s + o.amount, 0);
              const approvedTotal = orders.filter(o => o.paymentStatus === 'Approved').reduce((s, o) => s + o.amount, 0);
              const pending = orders.filter(o => o.paymentStatus === 'Pending').length;
              const days: { label: string; total: number; count: number }[] = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
                const next = d.getTime() + 86400000;
                const list = orders.filter(o => o.placedAt && o.placedAt >= d.getTime() && o.placedAt < next);
                days.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), total: list.reduce((s, o) => s + o.amount, 0), count: list.length });
              }
              const maxDay = Math.max(1, ...days.map(x => x.total));
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">Total Revenue</p><p className="text-lg font-black text-white font-mono">৳{grandTotal.toFixed(0)}</p></div>
                    <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">Approved (verified)</p><p className="text-lg font-black text-emerald-300 font-mono">৳{approvedTotal.toFixed(0)}</p></div>
                    <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">Pending Payments</p><p className="text-lg font-black text-purple-300 font-mono">{pending}</p></div>
                    <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">Total Orders</p><p className="text-lg font-black text-white font-mono">{orders.length}</p></div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Revenue by payment method</p>
                    <div className="space-y-2">
                      {methodStats.map(({ m, count, total, approved }) => (
                        <div key={m} className="flex items-center gap-2">
                          <span className="w-28 text-gray-400 font-bold text-[10px] shrink-0">{m}</span>
                          <div className="flex-1 h-5 bg-brand-dark/60 rounded-md overflow-hidden flex">
                            <div className="h-full bg-gradient-to-r from-brand-orange to-amber-400 transition-all" style={{ width: `${Math.max(2, (total / maxTotal) * 100)}%` }} />
                          </div>
                          <span className="w-20 text-right text-[10px] font-mono text-gray-300 shrink-0">৳{total.toFixed(0)}</span>
                          <span className="w-16 text-right text-[9px] text-gray-500 shrink-0">{count} ord · {approved}✓</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Last 7 days</p>
                    <div className="flex items-end gap-2 h-32">
                      {days.map((x, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[8px] font-mono text-gray-500">{x.total > 0 ? `৳${x.total.toFixed(0)}` : ''}</span>
                          <div className="w-full rounded-t-md bg-gradient-to-t from-brand-orange/70 to-amber-400 transition-all" style={{ height: `${Math.max(4, (x.total / maxDay) * 100)}%` }} />
                          <span className="text-[8px] text-gray-500 font-bold">{x.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ============ PAYMENT WALLETS ============ */}
        {tab === 'wallets' && (
          <div className="space-y-3">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><Wallet className="w-4 h-4 text-brand-orange" /><span>Payment Wallets</span></h3>
            <p className="text-[10px] text-gray-400">These are the Send Money numbers customers see in the storefront. Customers cannot change them — only you can, from here.</p>

            {(Object.keys(walletCfg) as WalletKey[]).map(k => (
              <div key={k} className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white shrink-0">
                    {k === 'bKash' ? <BkashLogo width={40} height={40} /> : k === 'Nagad' ? <NagadLogo width={40} height={40} /> : k === 'Upay' ? <UpayLogo width={40} height={40} /> : <RocketLogo width={40} height={40} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-black">{k}</p>
                    <input
                      value={walletCfg[k].name}
                      onChange={(e) => setWalletName(k, e.target.value)}
                      placeholder="Wallet holder name"
                      className="w-full px-2 py-1 bg-brand-dark text-xs text-gray-200 border border-brand-border rounded-md outline-none focus:border-brand-orange mt-0.5"
                    />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: WALLET_META[k].accent + '22', color: WALLET_META[k].accent }}>Send Money</span>
                </div>
                <div className="space-y-1.5">
                  {walletCfg[k].numbers.map((n, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <span className="text-[9px] font-mono text-gray-500 w-6 shrink-0">#{i + 1}</span>
                      <input
                        value={n}
                        onChange={(e) => setWalletNum(k, i, e.target.value)}
                        placeholder="01XXX-XXXXXX"
                        className="flex-1 px-2.5 py-1.5 bg-brand-dark text-xs font-mono text-gray-200 border border-brand-border rounded-md outline-none focus:border-brand-orange"
                      />
                      <button
                        onClick={() => removeWalletNum(k, i)}
                        disabled={walletCfg[k].numbers.length <= 1}
                        className="p-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0"
                        title="Remove number"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addWalletNum(k)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-brand-dark border border-dashed border-brand-border text-gray-400 hover:text-white hover:border-brand-orange text-[10px] font-bold cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" /><span>Add number</span>
                </button>
              </div>
            ))}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/40">
              <button
                onClick={() => { setWalletCfg(DEFAULT_WALLETS); lsSet(WALLET_CONFIG_KEY, DEFAULT_WALLETS); showToast && showToast('Wallet numbers reset to defaults', 'info'); }}
                className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Reset to defaults
              </button>
              <button
                onClick={saveWallets}
                className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Save wallet numbers
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

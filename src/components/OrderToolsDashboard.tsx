/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, AdminAuditEntry, RefundRequest, WalletConfig, WalletKey, DEFAULT_WALLETS, WALLET_CONFIG_KEY, OrderReportEntry } from '../types';
import {
  History, Banknote, TrendingUp, Wallet, X, PlusCircle, ShieldCheck,
  ClipboardList, Check, Users, Search, Plus
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
  onUpdateOrder: (order: Order) => void;
  reports?: OrderReportEntry[];
  onOpenReport?: (orderId: string) => void;
  onReportReply?: (orderId: string, reply: string) => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
}

type ToolTab = 'verify' | 'audit' | 'refunds' | 'analytics' | 'wallets' | 'reports' | 'customers' | 'topups';

export default function OrderToolsDashboard({ orders, onUpdateOrder, reports = [], onOpenReport, onReportReply, showToast }: OrderToolsDashboardProps) {
  const [tab, setTab] = useState<ToolTab>('audit');
  const [reportReply, setReportReply] = useState('');

  const [auditLog, setAuditLog] = useState<AdminAuditEntry[]>(() => lsGet('ss_admin_audit', []));
  useEffect(() => lsSet('ss_admin_audit', auditLog), [auditLog]);

  const [refunds, setRefunds] = useState<RefundRequest[]>(() => lsGet('ss_refunds', []));
  useEffect(() => lsSet('ss_refunds', refunds), [refunds]);

  const [walletCfg, setWalletCfg] = useState<WalletConfig>(() => lsGet<WalletConfig>(WALLET_CONFIG_KEY, DEFAULT_WALLETS));

  // Customer directory (A–Z) with per-customer wallet add
  const [custSearch, setCustSearch] = useState('');
  const seedCustomers = [
    { id: 'CUS-001', name: 'Rahim Khan', phone: '01712-345678', email: 'rahim.khan@example.com', orders: 12, spent: 8450, zone: 'Dhanmondi', joined: 'Jan 2024' },
    { id: 'CUS-002', name: 'Ayesha Siddika', phone: '01819-987654', email: 'ayesha.s@example.com', orders: 8, spent: 5230, zone: 'Gulshan', joined: 'Mar 2024' },
    { id: 'CUS-003', name: 'Tanvir Ahmed', phone: '01611-444555', email: 'tanvir.a@example.com', orders: 15, spent: 12400, zone: 'Uttara', joined: 'Feb 2024' },
    { id: 'CUS-004', name: 'Sumaiya Jahan', phone: '01311-666777', email: 'sumaiya.j@example.com', orders: 5, spent: 3180, zone: 'Banani', joined: 'May 2024' },
    { id: 'CUS-005', name: 'Farhan Hasan', phone: '01911-123456', email: 'farhan.h@example.com', orders: 20, spent: 18750, zone: 'Mirpur', joined: 'Jan 2024' },
    { id: 'CUS-006', name: 'Nusrat Zaman', phone: '01511-654321', email: 'nusrat.z@example.com', orders: 3, spent: 2450, zone: 'Mohakhali', joined: 'Jun 2024' },
    { id: 'CUS-007', name: 'Imran Kabir', phone: '01412-888999', email: 'imran.k@example.com', orders: 9, spent: 6740, zone: 'Bashundhara', joined: 'Apr 2024' },
    { id: 'CUS-008', name: 'Sadia Rahman', phone: '01755-222333', email: 'sadia.r@example.com', orders: 6, spent: 3980, zone: 'Dhanmondi', joined: 'Feb 2024' },
    { id: 'CUS-009', name: 'Mahmudul Islam', phone: '01877-444555', email: 'mahmudul.i@example.com', orders: 11, spent: 9020, zone: 'Gulshan', joined: 'Mar 2024' },
    { id: 'CUS-010', name: 'Tasnim Akter', phone: '01933-777888', email: 'tasnim.a@example.com', orders: 2, spent: 1680, zone: 'Uttara', joined: 'Jul 2024' },
  ];
  const [custWallet, setCustWallet] = useState<Record<string, number>>(() => lsGet('ss_admin_cust_wallet', {}));
  useEffect(() => lsSet('ss_admin_cust_wallet', custWallet), [custWallet]);

  // Customer-created support tickets (from the storefront), esp. Add Money / Top-Up problems
  const [customerTickets, setCustomerTickets] = useState<Array<{ id: string; subject: string; category: string; status: string; date: string; lastMessage: string }>>(() => lsGet('ss_tickets_v2', []));
  useEffect(() => {
    const onStorage = () => setCustomerTickets(lsGet('ss_tickets_v2', []));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const topUpTickets = customerTickets.filter(t => /top[- ]?up|add ?money|wallet/i.test(t.category));

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

  // Send-money orders awaiting payment verification (Pending) or held after a rejection (Rejected)
  const isWalletMethod = (m: string) =>
    ['bKash', 'Nagad', 'Upay', 'Rocket'].includes(
      m.startsWith('bKash') ? 'bKash' : m.startsWith('Nagad') ? 'Nagad' : m.startsWith('Upay') ? 'Upay' : m.startsWith('Rocket') ? 'Rocket' : m.includes('Wallet') ? 'Wallet' : m.includes('Cash') ? 'Cash on Delivery' : m
    );
  const verifyPayments = orders.filter(o => (o.paymentStatus === 'Pending' || o.paymentStatus === 'Rejected') && isWalletMethod(o.paymentMethod));

  // Receipt popup viewer (full-size payment screenshot)
  const [receiptView, setReceiptView] = useState<string | null>(null);

  const tabs: { key: ToolTab; label: string; icon: any; badge?: number }[] = [
    { key: 'verify', label: 'Verify Payments', icon: ShieldCheck, badge: verifyPayments.length },
    { key: 'reports', label: 'Payment Reports', icon: ClipboardList, badge: reports.filter(r => r.status === 'Open').length },
    { key: 'topups', label: 'Top-Up Reports', icon: Banknote, badge: topUpTickets.length },
    { key: 'audit', label: 'Audit Log', icon: History, badge: auditLog.length },
    { key: 'refunds', label: 'Refund Requests', icon: Banknote, badge: refunds.filter(r => r.status === 'Requested').length },
    { key: 'analytics', label: 'Orders Analytics', icon: TrendingUp },
    { key: 'wallets', label: 'Payment Wallets', icon: Wallet },
    { key: 'customers', label: 'Customers', icon: Users },
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
        {/* ============ VERIFY PAYMENTS ============ */}
        {tab === 'verify' && (
          <div className="space-y-3">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><ShieldCheck className="w-4 h-4 text-brand-orange" /><span>Verify Send Money Payments</span></h3>
            <p className="text-[10px] text-gray-400">When a customer places a send-money order, all their details show up here. Rejected payments are held here so you can re-check — approve again or keep rejected, any time.</p>

            {verifyPayments.length === 0 ? (
              <p className="text-center text-[10px] text-gray-500 py-6 flex items-center justify-center space-x-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>No pending or held payments — all send-money orders verified.</span></p>
            ) : (
              <div className="space-y-2">
                {verifyPayments.map(o => (
                  <div key={o.id} className={`bg-brand-dark/50 border rounded-xl p-3 space-y-2 ${o.paymentStatus === 'Rejected' ? 'border-red-500/40' : 'border-brand-border/50'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-100 font-black text-xs font-mono">#{o.id}</p>
                        {o.paymentStatus === 'Rejected' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/20">⏸ Hold · Rejected</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/20">⏳ Pending</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const wasHeld = o.paymentStatus === 'Rejected';
                            onUpdateOrder({ ...o, paymentStatus: 'Approved', status: wasHeld && o.status === 'Cancelled' ? 'Pending' : o.status });
                            setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Approved', orderId: o.id, paymentMethod: o.paymentMethod, amount: o.amount, at: Date.now() }, ...prev]);
                            showToast && showToast(wasHeld ? `Payment re-approved for #${o.id} — order is active again` : `Payment approved for #${o.id} — moved to Order Management`, 'success');
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >✓ Approve Payment</button>
                        <button
                          onClick={() => {
                            onUpdateOrder({ ...o, paymentStatus: 'Rejected' });
                            setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Rejected', orderId: o.id, paymentMethod: o.paymentMethod, amount: o.amount, at: Date.now() }, ...prev]);
                            showToast && showToast(`Payment rejected for #${o.id} — order held`, 'info');
                          }}
                          className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                            o.paymentStatus === 'Rejected'
                              ? 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/40'
                              : 'bg-brand-dark border-brand-border hover:bg-red-500/20 text-gray-300 hover:text-red-300'
                          }`}
                        >✗ Reject</button>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 text-[10px]">
                        <p className="text-gray-400"><b className="text-gray-200">Customer:</b> {o.customerName}{o.customerPhone ? ` · ${o.customerPhone}` : ''}</p>
                        <p className="text-gray-400"><b className="text-gray-200">Store:</b> {o.storeName}</p>
                        <p className="text-gray-400"><b className="text-gray-200">Amount:</b> <span className="font-mono text-white font-bold">৳{o.amount.toLocaleString()}</span></p>
                        <p className="text-gray-400"><b className="text-gray-200">Method:</b> {o.paymentMethod}</p>
                        {o.trxId && <p className="text-gray-400"><b className="text-gray-200">TrxID:</b> <span className="font-mono">{o.trxId}</span></p>}
                        {o.senderNumber && <p className="text-gray-400"><b className="text-gray-200">Sender No:</b> <span className="font-mono">{o.senderNumber}</span></p>}
                        {o.last4 && <p className="text-gray-400"><b className="text-gray-200">Last 4:</b> <span className="font-mono">{o.last4}</span></p>}
                        {o.trxAmount !== undefined && <p className="text-gray-400"><b className="text-gray-200">Sent:</b> <span className="font-mono">৳{o.trxAmount.toLocaleString()}</span></p>}
                        <p className="text-gray-400"><b className="text-gray-200">Date:</b> {o.date}{o.time ? ` · ${o.time}` : ''}</p>
                      </div>
                      {o.receipt && (
                        <button
                          onClick={() => setReceiptView(o.receipt)}
                          className="shrink-0 self-start sm:self-center w-16 h-20 rounded-lg border border-brand-border overflow-hidden bg-brand-dark cursor-pointer hover:opacity-90 hover:border-brand-orange transition-all"
                          title="Tap to view receipt full size"
                        >
                          <img src={o.receipt} alt="payment receipt" className="w-full h-full object-cover" />
                        </button>
                      )}
                    </div>
                    {o.customerNote && (
                      <p className="text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5">💬 Customer note: {o.customerNote}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ PAYMENT REPORTS ============ */}
        {tab === 'reports' && (
          <div className="space-y-3">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><ClipboardList className="w-4 h-4 text-brand-orange" /><span>Payment Reports</span></h3>
            <p className="text-[10px] text-gray-400">Customer reports. Open a report to mark it Under Review — the customer then sees tracking paused on that order.</p>
            {reports.length === 0 ? (
              <p className="text-center text-[10px] text-gray-500 py-6 flex items-center justify-center space-x-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>No reports yet.</span></p>
            ) : (
              <div className="space-y-2">
                {reports.map((r, i) => {
                  const order = orders.find(o => o.id === r.orderId);
                  return (
                    <div key={i} className={`bg-brand-dark/50 border rounded-xl p-3 space-y-2 ${r.status === 'Under Review' ? 'border-blue-500/40' : 'border-brand-border/50'}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <p className="text-gray-100 font-black text-xs font-mono">#{r.orderId}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            r.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' :
                            r.status === 'Under Review' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                          }`}>{r.status || 'Open'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {r.status === 'Open' && (
                            <button
                              onClick={() => { onOpenReport && onOpenReport(r.orderId); showToast && showToast(`Report for #${r.orderId} marked Under Review — customer tracking paused`, 'info'); }}
                              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            >Open Report</button>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] space-y-0.5">
                        <p className="text-red-300 font-bold">{r.reason}</p>
                        {r.note && <p className="text-gray-400">{r.note}</p>}
                        <p className="text-gray-500">
                          {order ? <><b className="text-gray-300">{order.customerName}</b> · {order.storeName} · <span className="font-mono text-white font-bold">৳{order.amount.toLocaleString()}</span> · {order.paymentMethod}</> : 'Unknown order'} · {r.time}
                        </p>
                      </div>
                      {r.adminReply && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
                          <p className="text-[9px] font-black text-emerald-300 uppercase tracking-wider mb-0.5">Admin reply</p>
                          <p className="text-gray-300 text-[10px]">{r.adminReply}</p>
                        </div>
                      )}
                      {r.status !== 'Resolved' && (
                        <div className="flex items-start space-x-2 pt-1">
                          <input
                            value={reportReply}
                            onChange={(e) => setReportReply(e.target.value)}
                            placeholder="Reply to customer — explain the resolution…"
                            className="flex-1 bg-brand-dark/60 border border-brand-border/60 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-200 outline-none focus:border-emerald-500/60"
                          />
                          <button
                            onClick={() => {
                              if (!reportReply.trim()) { showToast && showToast('Write a reply first', 'info'); return; }
                              onReportReply && onReportReply(r.orderId, reportReply.trim());
                              setReportReply('');
                              showToast && showToast(`Reply sent to customer for #${r.orderId} — report resolved`, 'success');
                            }}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                          >Send Reply</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============ TOP-UP REPORTS ============ */}
        {tab === 'topups' && (
          <div className="space-y-3">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><Banknote className="w-4 h-4 text-brand-orange" /><span>Top-Up / Add Money Reports</span></h3>
            <p className="text-[10px] text-gray-400">Customer tickets filed for Add Money / Top-Up problems (money sent but not credited, wrong amount, etc.). Reply to resolve.</p>
            {topUpTickets.length === 0 ? (
              <p className="text-center text-[10px] text-gray-500 py-6 flex items-center justify-center space-x-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>No Add Money reports yet.</span></p>
            ) : (
              <div className="space-y-2">
                {topUpTickets.map(tk => (
                  <div key={tk.id} className="bg-brand-dark/50 border border-brand-border/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-100 font-black text-xs font-mono">{tk.id}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          tk.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' :
                          tk.status === 'Under Review' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                        }`}>{tk.status || 'Open'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/20">{tk.category}</span>
                      </div>
                      <span className="text-[9px] text-gray-500">{tk.date}</span>
                    </div>
                    <p className="text-gray-200 font-bold text-[11px]">{tk.subject}</p>
                    <p className="text-gray-400 text-[10px] bg-brand-dark/40 border border-brand-border/30 rounded-lg p-2">"{tk.lastMessage}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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

        {tab === 'customers' && (
          <div className="space-y-3">
            <h3 className="font-black text-white text-sm flex items-center space-x-2"><Users className="w-4 h-4 text-brand-orange" /><span>Customer Directory</span></h3>
            <p className="text-[10px] text-gray-400">All customers A–Z. Add balance straight to any customer wallet — they see it instantly in the storefront.</p>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                placeholder="Search by name, phone or email..."
                className="w-full bg-brand-dark/50 border border-brand-border rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 outline-none focus:border-brand-orange placeholder:text-gray-600"
              />
            </div>

            <div className="space-y-2">
              {[...seedCustomers]
                .filter(c => !custSearch.trim() || c.name.toLowerCase().includes(custSearch.trim().toLowerCase()) || c.phone.includes(custSearch.trim()) || c.email.toLowerCase().includes(custSearch.trim().toLowerCase()))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => {
                  const alloc = custWallet[c.id] || 0;
                  return (
                    <div key={c.id} className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-brand-orange/20 border border-brand-orange/30 text-brand-orange text-[11px] font-black flex items-center justify-center shrink-0">
                          {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-black text-xs truncate">{c.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono truncate">{c.phone} · {c.email}</p>
                          <div className="flex items-center space-x-2 text-[9px] text-gray-500 mt-0.5">
                            <span>{c.zone}</span><span>•</span><span>{c.orders} orders</span><span>•</span><span>৳{c.spent.toLocaleString()} spent</span>
                            {alloc > 0 && <span className="text-emerald-400 font-black">• Wallet: ৳{alloc}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center space-x-1.5">
                        <input
                          type="number"
                          min={0}
                          value={alloc === 0 && !custWallet[c.id] ? '' : alloc}
                          placeholder="৳"
                          onChange={(e) => setCustWallet(prev => ({ ...prev, [c.id]: Math.max(0, Number(e.target.value) || 0) }))}
                          className="w-20 bg-brand-dark text-xs font-mono text-gray-200 border border-brand-border rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange"
                        />
                        <button
                          onClick={() => {
                            const amt = custWallet[c.id] || 0;
                            if (amt <= 0) { showToast && showToast('Enter an amount to add to wallet', 'info'); return; }
                            setCustWallet(prev => ({ ...prev, [c.id]: 0 }));
                            setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Wallet add', orderId: c.id, paymentMethod: 'Wallet', amount: amt, at: Date.now() }, ...prev]);
                            showToast && showToast(`৳${amt.toLocaleString()} added to ${c.name}'s wallet`, 'success');
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" /><span>Add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              {seedCustomers.filter(c => !custSearch.trim() || c.name.toLowerCase().includes(custSearch.trim().toLowerCase()) || c.phone.includes(custSearch.trim()) || c.email.toLowerCase().includes(custSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-center text-[10px] text-gray-500 py-6">No customers found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Receipt popup viewer */}
      {receiptView && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setReceiptView(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setReceiptView(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-xl cursor-pointer hover:bg-gray-200 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={receiptView}
              alt="payment receipt full size"
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}

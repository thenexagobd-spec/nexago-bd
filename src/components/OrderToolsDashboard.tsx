/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, AdminAuditEntry, RefundRequest, WalletConfig, WalletKey, DEFAULT_WALLETS, WALLET_CONFIG_KEY, OrderReportEntry } from '../types';
import {
  History, Banknote, TrendingUp, Wallet, X, PlusCircle, ShieldCheck,
  ClipboardList, Check, Users, Search, Plus, Phone, MessageCircle, PenLine,
  Gift, Ban, Mail, ChevronDown, UserPlus, Copy, UserSearch, Ticket
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

type ToolTab = 'verify' | 'audit' | 'refunds' | 'analytics' | 'wallets' | 'reports' | 'customers' | 'topups' | 'lookup';

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
  const seedCustomers = () => [
    { id: 'CUS-001', name: 'Rahim Khan', phone: '01712-345678', email: 'rahim.khan@example.com', orders: 12, spent: 8450, zone: 'Dhanmondi', joined: 'Jan 2024', loyalty: 120, status: 'Active', custId: 'NEX4654646786' },
    { id: 'CUS-002', name: 'Ayesha Siddika', phone: '01819-987654', email: 'ayesha.s@example.com', orders: 8, spent: 5230, zone: 'Gulshan', joined: 'Mar 2024', loyalty: 80, status: 'Active', custId: 'NEX3829104756' },
    { id: 'CUS-003', name: 'Tanvir Ahmed', phone: '01611-444555', email: 'tanvir.a@example.com', orders: 15, spent: 12400, zone: 'Uttara', joined: 'Feb 2024', loyalty: 240, status: 'Active', custId: 'NEX7712039485' },
    { id: 'CUS-004', name: 'Sumaiya Jahan', phone: '01311-666777', email: 'sumaiya.j@example.com', orders: 5, spent: 3180, zone: 'Banani', joined: 'May 2024', loyalty: 45, status: 'Active', custId: 'NEX2938475610' },
    { id: 'CUS-005', name: 'Farhan Hasan', phone: '01911-123456', email: 'farhan.h@example.com', orders: 20, spent: 18750, zone: 'Mirpur', joined: 'Jan 2024', loyalty: 310, status: 'Active', custId: 'NEX1102938475' },
    { id: 'CUS-006', name: 'Nusrat Zaman', phone: '01511-654321', email: 'nusrat.z@example.com', orders: 3, spent: 2450, zone: 'Mohakhali', joined: 'Jun 2024', loyalty: 30, status: 'Active', custId: 'NEX8475610293' },
    { id: 'CUS-007', name: 'Imran Kabir', phone: '01412-888999', email: 'imran.k@example.com', orders: 9, spent: 6740, zone: 'Bashundhara', joined: 'Apr 2024', loyalty: 95, status: 'Active', custId: 'NEX5566778899' },
    { id: 'CUS-008', name: 'Sadia Rahman', phone: '01755-222333', email: 'sadia.r@example.com', orders: 6, spent: 3980, zone: 'Dhanmondi', joined: 'Feb 2024', loyalty: 60, status: 'Active', custId: 'NEX9988776655' },
    { id: 'CUS-009', name: 'Mahmudul Islam', phone: '01877-444555', email: 'mahmudul.i@example.com', orders: 11, spent: 9020, zone: 'Gulshan', joined: 'Mar 2024', loyalty: 150, status: 'Active', custId: 'NEX3344556677' },
    { id: 'CUS-010', name: 'Tasnim Akter', phone: '01933-777888', email: 'tasnim.a@example.com', orders: 2, spent: 1680, zone: 'Uttara', joined: 'Jul 2024', loyalty: 20, status: 'Active', custId: 'NEX6677889900' },
  ];
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string; email: string; orders: number; spent: number; zone: string; joined: string; loyalty: number; status: 'Active' | 'Blocked'; custId?: string }>>(() => {
    const stored = lsGet<Array<{ id: string; name: string; phone: string; email: string; orders: number; spent: number; zone: string; joined: string; loyalty: number; status: 'Active' | 'Blocked'; custId?: string }>>('ss_admin_customers', []);
    return stored.length ? stored : seedCustomers();
  });
  useEffect(() => lsSet('ss_admin_customers', customers), [customers]);
  const [custWallet, setCustWallet] = useState<Record<string, number>>(() => lsGet('ss_admin_cust_wallet', {}));
  useEffect(() => lsSet('ss_admin_cust_wallet', custWallet), [custWallet]);
  const [custLoyalty, setCustLoyalty] = useState<Record<string, number>>(() => lsGet('ss_admin_cust_loyalty', {}));
  useEffect(() => lsSet('ss_admin_cust_loyalty', custLoyalty), [custLoyalty]);
  const [expandedCust, setExpandedCust] = useState<string | null>(null);
  const [showCustOrders, setShowCustOrders] = useState<string | null>(null);
  const [showCustTxns, setShowCustTxns] = useState<string | null>(null);
  const [smsDraft, setSmsDraft] = useState<Record<string, string>>({});
  const [customerModal, setCustomerModal] = useState<null | { editing?: string }>(null);
  const [custForm, setCustForm] = useState({ name: '', phone: '', email: '', zone: '' });
  const [adminTopUpModal, setAdminTopUpModal] = useState<null | string>(null);
  const [adminTopUp, setAdminTopUp] = useState({ amount: '', method: 'bKash', sender: '', trxId: '', note: '' });

  // Dedicated Customer Lookup — search by permanent ID / phone / Gmail → full profile
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<null | {
    customerId: string; name: string; phone: string; email: string;
    zone: string; joined: string; loyalty: number; status: string;
    wallet: number; photo?: string;
  }>(null);
  const [lookupCopied, setLookupCopied] = useState(false);
  const [lookupSearched, setLookupSearched] = useState(false);
  const normP = (p: string) => (p || '').replace(/[^0-9]/g, '');
  const normEmail = (e: string) => (e || '').trim().toLowerCase();
  const runLookup = (query: string) => {
    const q = (query || '').trim();
    if (!q) return;
    setLookupSearched(true);
    const qLower = q.toLowerCase();
    const qDigits = normP(q);
    const byId = (x: string | undefined) => !!x && x.toLowerCase() === qLower;
    const byPhone = (x: string | undefined) => !!x && normP(x) === qDigits;
    const byEmail = (x: string | undefined) => !!x && x.toLowerCase() === qLower;
    const profilePhoto = lsGet<{ profilePic?: string; phone?: string; email?: string }>('ss_profile', {});
    const photoOf = (phone: string, email: string) => (profilePhoto && normP(profilePhoto.phone || '') === normP(phone) && normEmail(profilePhoto.email || '') === normEmail(email)) ? profilePhoto.profilePic || '' : '';
    const found = customers.find(c => byId(c.custId) || byId(c.id) || byPhone(c.phone) || byEmail(c.email));
    if (found) {
      const wallet = custWallet[found.id] || 0;
      const loyalty = custLoyalty[found.id] !== undefined ? custLoyalty[found.id] : found.loyalty;
      setLookupResult({ customerId: found.custId || found.id, name: found.name, phone: found.phone, email: found.email, zone: found.zone, joined: found.joined, loyalty, status: found.status, wallet, photo: photoOf(found.phone, found.email) });
      return;
    }
    // Not in directory — check the shared account registry (storefront-created accounts)
    const registry = lsGet<Array<{ customerId: string; name: string; phone: string; email: string }>>('ss_cust_accounts', []);
    const reg = registry.find(a => byId(a.customerId) || byPhone(a.phone) || byEmail(a.email));
    if (reg) {
      setLookupResult({ customerId: reg.customerId, name: reg.name, phone: reg.phone, email: reg.email, zone: '—', joined: '—', loyalty: 0, status: 'Active', wallet: lsGet<number>('ss_wallet_v2', 0), photo: photoOf(reg.phone, reg.email) });
      return;
    }
    setLookupResult(null);
    showToast && showToast('No customer found for that ID / phone / Gmail', 'info');
  };

  // Customer-created support tickets (from the storefront), esp. Add Money / Top-Up problems
  const [customerTickets, setCustomerTickets] = useState<Array<{ id: string; subject: string; category: string; status: string; date: string; lastMessage: string; customerId?: string }>>(() => lsGet('ss_tickets_v2', []));
  useEffect(() => {
    const onStorage = () => setCustomerTickets(lsGet('ss_tickets_v2', []));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const topUpTickets = customerTickets.filter(t => /top[- ]?up|add ?money|wallet/i.test(t.category));

  // Customer wallet top-up transactions (from storefront ss_wtxn_v3) awaiting admin verify
  const [custTxns, setCustTxns] = useState<Array<{ id: string; type: string; amount: number; date: string; status: string; trxId?: string; receipt?: string; sender?: string; method?: string; customerId?: string }>>(() => lsGet('ss_wtxn_v3', []));
  useEffect(() => {
    const onStorage = () => setCustTxns(lsGet('ss_wtxn_v3', []));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const pendingTopUps = custTxns.filter(t => t.type === 'Top-Up' && t.status === 'Pending');
  const unassignedTopUps = pendingTopUps.filter(t => !t.customerId || !customers.some(c => c.id === t.customerId || c.custId === t.customerId));
  const [walletBal, setWalletBal] = useState<number>(() => lsGet('ss_wallet_v2', 0));
  useEffect(() => {
    const onStorage = () => setWalletBal(lsGet('ss_wallet_v2', 0));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const verifyTopUp = (tx: { id: string; amount: number; receipt?: string }, approve: boolean) => {
    const next = custTxns.map(t => t.id === tx.id ? { ...t, status: approve ? 'Completed' : 'Rejected' } : t);
    setCustTxns(next);
                          lsSet('ss_wtxn_v3', next);
    if (approve) {
      const bal = walletBal + tx.amount;
      setWalletBal(bal);
      lsSet('ss_wallet_v2', bal);
    }
    setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: approve ? 'Top-up approved' : 'Top-up rejected', orderId: tx.id, paymentMethod: 'Wallet Top-Up', amount: tx.amount, at: Date.now() }, ...prev]);
    showToast && showToast(approve ? `৳${tx.amount.toLocaleString()} credited to wallet` : 'Top-up rejected', approve ? 'success' : 'info');
  };

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
    { key: 'customers', label: 'Customers', icon: Users, badge: unassignedTopUps.length },
    { key: 'lookup', label: 'Customer Lookup', icon: UserSearch },
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
                        <p className="text-gray-400"><b className="text-gray-200">Customer:</b> {o.customerName}{o.customerPhone ? ` · ${o.customerPhone}` : ''}{o.customerId ? ` · ID ${o.customerId}` : ''}</p>
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
          <div className="space-y-4">
            <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-black text-white text-sm flex items-center space-x-2"><Banknote className="w-4 h-4 text-brand-orange" /><span>Top-Up / Add Money</span></h3>
                <p className="text-[10px] text-gray-400">Verify payment screenshots, then credit the wallet — every credit/debit is recorded below.</p>
              </div>
              <div className="flex items-center space-x-3 text-right">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Customer wallet</p>
                  <p className="text-white font-black font-mono">৳{walletBal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Pending</p>
                  <p className="text-amber-400 font-black font-mono">{pendingTopUps.length}</p>
                </div>
              </div>
            </div>

            {/* Pending top-ups to verify */}
            {pendingTopUps.length === 0 ? (
              <p className="text-center text-[10px] text-gray-500 py-6 flex items-center justify-center space-x-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>No pending top-ups — all verified.</span></p>
            ) : (
              <div className="space-y-2">
                {pendingTopUps.map(tx => (
                  <div key={tx.id} className="bg-brand-dark/50 border border-amber-500/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-100 font-black text-xs font-mono">{tx.id}</p>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/20">⏳ Pending Verify</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/20">{tx.method || 'Wallet'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-black font-mono text-sm">+৳{tx.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                      <div className="space-y-0.5">
                        <p className="text-gray-400">Sender: <b className="text-gray-200 font-mono">{tx.sender || '—'}</b></p>
                        {tx.customerId && <p className="text-gray-400">Customer ID: <b className="text-gray-200 font-mono">{tx.customerId}</b></p>}
                        <p className="text-gray-400">TrxID: <b className="text-gray-200 font-mono">{tx.trxId || '—'}</b></p>
                        <p className="text-gray-400">Date: <span className="text-gray-300">{tx.date}</span></p>
                      </div>
                      <div className="flex items-center justify-start sm:justify-end space-x-2">
                        {tx.receipt && (
                          <button
                            onClick={() => setReceiptView(tx.receipt || null)}
                            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg text-[10px] font-bold hover:bg-blue-500/20 transition-colors cursor-pointer"
                          >View Receipt Photo</button>
                        )}
                        <button
                          onClick={() => verifyTopUp(tx, true)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >✓ Verify & Credit</button>
                        <button
                          onClick={() => verifyTopUp(tx, false)}
                          className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-colors cursor-pointer"
                        >✗ Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Wallet ledger (credit/debit) */}
            <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3 space-y-2">
              <h4 className="font-black text-white text-xs flex items-center space-x-2"><History className="w-3.5 h-3.5 text-brand-orange" /><span>Wallet Ledger — Credit / Debit</span></h4>
              {custTxns.length === 0 ? (
                <p className="text-center text-[10px] text-gray-500 py-4">No wallet transactions yet.</p>
              ) : (
                <div className="space-y-1">
                  {custTxns.slice(0, 20).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between gap-2 bg-brand-dark/40 border border-brand-border/30 rounded-lg px-2.5 py-1.5 text-[10px]">
                      <div className="min-w-0 flex items-center space-x-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${tx.type === 'Top-Up' ? 'bg-emerald-500/20 text-emerald-300' : tx.type === 'Refund' ? 'bg-blue-500/20 text-blue-300' : tx.type === 'Cashback' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                          {tx.amount >= 0 ? '↑' : '↓'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-gray-200 font-bold truncate">{tx.type} <span className="font-mono text-gray-500">{tx.id}</span></p>
                          <p className="text-[8px] text-gray-500 truncate">{tx.date}{tx.trxId ? ` · ${tx.trxId}` : ''}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-black ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{tx.amount >= 0 ? `+৳${tx.amount.toLocaleString()}` : `-৳${Math.abs(tx.amount).toLocaleString()}`}</span>
                        <span className={`block text-[8px] font-bold ${tx.status === 'Completed' ? 'text-emerald-500' : tx.status === 'Rejected' ? 'text-red-400' : 'text-amber-400'}`}>{tx.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer tickets for add-money problems */}
            <div className="space-y-2">
              <h4 className="font-black text-white text-xs flex items-center space-x-2"><ClipboardList className="w-3.5 h-3.5 text-brand-orange" /><span>Customer Problem Reports</span></h4>
              {topUpTickets.length === 0 ? (
                <p className="text-center text-[10px] text-gray-500 py-4">No Add Money problem tickets.</p>
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

        {tab === 'lookup' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-black text-white text-sm flex items-center space-x-2"><UserSearch className="w-4 h-4 text-brand-orange" /><span>Customer Lookup</span></h3>
              <p className="text-[10px] text-gray-400">Search by permanent ID, phone or Gmail — only the matching account appears.</p>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runLookup(lookupQuery); }}
                  placeholder="Paste ID (NEX…) or type phone / Gmail…"
                  className="flex-1 min-w-0 bg-brand-dark/50 border border-brand-border rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:border-brand-orange placeholder:text-gray-600 font-mono"
                />
                <button
                  onClick={() => runLookup(lookupQuery)}
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-black cursor-pointer transition-colors flex items-center space-x-1.5 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" /><span>Lookup</span>
                </button>
              </div>
              {!lookupResult && !lookupSearched && (
                <p className="text-[10px] text-gray-500">No results yet. Search an ID / phone / Gmail to see the account profile.</p>
              )}
              {!lookupResult && lookupSearched && (
                <p className="text-[10px] text-amber-300 font-bold">No customer found for that ID / phone / Gmail.</p>
              )}
              {lookupResult && (
                <div className="bg-brand-dark/50 border border-brand-border/40 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {lookupResult.photo ? (
                      <img src={lookupResult.photo} alt={lookupResult.name} className="w-12 h-12 rounded-full object-cover border-2 border-brand-orange/40 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-brand-orange/20 border border-brand-orange/30 text-brand-orange flex items-center justify-center font-black text-base shrink-0">
                        {lookupResult.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <p className="text-white font-black text-sm">{lookupResult.name}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${lookupResult.status === 'Blocked' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>{lookupResult.status}</span>
                        {lookupResult.loyalty >= 200 && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">VIP</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{lookupResult.phone} · {lookupResult.email}</p>
                    </div>
                    <button
                      onClick={() => { try { navigator.clipboard.writeText(lookupResult.customerId); setLookupCopied(true); setTimeout(() => setLookupCopied(false), 2000); } catch { /* noop */ } }}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-gray-500/10 border border-gray-500/30 text-gray-300 rounded-lg text-[10px] font-black hover:bg-gray-500/20 transition-colors shrink-0 font-mono"
                    >
                      <span>ID: {lookupResult.customerId}</span>
                      {lookupCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Zone</p>
                      <p className="text-[10px] text-gray-200 font-bold mt-0.5">{lookupResult.zone || '—'}</p>
                    </div>
                    <div className="bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Member Since</p>
                      <p className="text-[10px] text-gray-200 font-bold mt-0.5">{lookupResult.joined || '—'}</p>
                    </div>
                    <div className="bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Loyalty</p>
                      <p className="text-[10px] text-amber-400 font-bold mt-0.5">{lookupResult.loyalty} pts</p>
                    </div>
                    <div className="bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Wallet Balance</p>
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5">৳{lookupResult.wallet.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'customers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-black text-white text-sm flex items-center space-x-2"><Users className="w-4 h-4 text-brand-orange" /><span>Customer Directory</span></h3>
                <p className="text-[10px] text-gray-400">All customers A–Z. Add balance straight to any customer wallet — they see it instantly in the storefront.</p>
              </div>
              <button
                onClick={() => { setCustomerModal({}); setCustForm({ name: '', phone: '', email: '', zone: '' }); }}
                className="px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-black cursor-pointer transition-colors flex items-center space-x-1.5 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" /><span>Add Customer</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                placeholder="Search by name, phone, email or customer ID..."
                className="w-full bg-brand-dark/50 border border-brand-border rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 outline-none focus:border-brand-orange placeholder:text-gray-600"
              />
            </div>

            {unassignedTopUps.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-black text-amber-300 flex items-center space-x-1.5"><Banknote className="w-3.5 h-3.5" /><span>New Add Money Request{unassignedTopUps.length > 1 ? 's' : ''} — unassigned</span></p>
                <div className="space-y-1.5">
                  {unassignedTopUps.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between gap-2 flex-wrap bg-brand-dark/50 border border-amber-500/20 rounded-lg px-3 py-2">
                      <div className="min-w-0 text-[10px]">
                        <p className="text-gray-200 font-bold">Sender: <span className="font-mono">{tx.sender || '—'}</span> · TrxID: <span className="font-mono">{tx.trxId || '—'}</span> · <span className="font-mono text-amber-300">+৳{tx.amount.toLocaleString()}</span></p>
                        <p className="text-[9px] text-gray-500">{tx.method} · {tx.date}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => setTab('topups')}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >Verify in Top-Up</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {[...customers]
                .filter(c => !custSearch.trim() || c.name.toLowerCase().includes(custSearch.trim().toLowerCase()) || c.phone.includes(custSearch.trim()) || c.email.toLowerCase().includes(custSearch.trim().toLowerCase()) || (c.custId || '').toLowerCase().includes(custSearch.trim().toLowerCase()))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => {
                  const alloc = custWallet[c.id] || 0;
                  const loyalty = custLoyalty[c.id] !== undefined ? custLoyalty[c.id] : c.loyalty;
                  const custOrders = orders.filter(o => o.customerName === c.name || o.customerPhone === c.phone || o.customerId === c.custId);
                  const blocked = c.status === 'Blocked';
                  return (
                    <div key={c.id} className={`group flex items-center gap-3 bg-gradient-to-r from-brand-card to-brand-dark/80 border rounded-xl pl-3 pr-2 py-2.5 transition-all duration-150 hover:border-brand-orange/40 hover:shadow-md hover:shadow-black/20 ${blocked ? 'border-red-500/40 opacity-80' : 'border-brand-border/40'}`}>
                      <div className="relative shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shadow-md ${blocked ? 'bg-gradient-to-br from-red-500/30 to-red-600/30 text-red-400 border border-red-500/40' : 'bg-gradient-to-br from-brand-orange to-orange-600 text-white border border-brand-orange/50'}`}>
                          {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-brand-card ${blocked ? 'bg-red-500' : 'bg-emerald-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-white font-black text-xs truncate">{c.name}</p>
                          {blocked && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">Blocked</span>}
                          {loyalty >= 200 && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-gradient-to-r from-amber-500/30 to-yellow-600/30 text-amber-300 border border-amber-500/40 shrink-0">★ VIP</span>}
                          {loyalty >= 100 && loyalty < 200 && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">★ Gold</span>}
                        </div>
                        <p className="text-[9px] text-gray-500 font-mono truncate mt-0.5"><span className="text-brand-orange">ID:</span> {c.custId || c.id} · {c.phone}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider px-2 py-1 rounded-md bg-brand-dark/40 border border-brand-border/30"><span className="text-gray-300">{c.orders}</span> orders</span>
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider px-2 py-1 rounded-md bg-brand-dark/40 border border-brand-border/30"><span className="text-emerald-400">৳{c.spent.toLocaleString()}</span> spent</span>
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider px-2 py-1 rounded-md bg-brand-dark/40 border border-brand-border/30"><span className="text-amber-400">{loyalty}</span> pts</span>
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider px-2 py-1 rounded-md bg-brand-dark/40 border border-brand-border/30"><span className={alloc > 0 ? 'text-emerald-400' : 'text-gray-400'}>৳{alloc > 0 ? alloc.toLocaleString() : '0'}</span> wallet</span>
                      </div>
                      <button
                        onClick={() => setExpandedCust(expandedCust === c.id ? null : c.id)}
                        className="p-2 bg-brand-dark/60 border border-brand-border rounded-lg text-gray-300 hover:text-white hover:border-brand-orange cursor-pointer transition-all shrink-0"
                        title="View orders & actions"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedCust === c.id ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedCust === c.id && (
                        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-brand-border/30">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <a href={`tel:${c.phone.replace(/[^0-9]/g, '')}`} className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-[9px] font-black hover:bg-emerald-500/20 transition-colors">
                              <Phone className="w-3 h-3" /><span>Call</span>
                            </a>
                            <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg text-[9px] font-black hover:bg-green-500/20 transition-colors">
                              <MessageCircle className="w-3 h-3" /><span>WhatsApp</span>
                            </a>
                            <button
                              onClick={() => { window.open(`mailto:${c.email}`); }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg text-[9px] font-black hover:bg-blue-500/20 transition-colors"
                            >
                              <Mail className="w-3 h-3" /><span>Email</span>
                            </button>
                            <button
                              onClick={() => {
                                setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, status: blocked ? 'Active' : 'Blocked' } : x));
                                setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: blocked ? 'Unblocked' : 'Blocked', orderId: c.id, paymentMethod: 'Customer', amount: 0, at: Date.now() }, ...prev]);
                                showToast && showToast(`${blocked ? 'Unblocked' : 'Blocked'} ${c.name}`, blocked ? 'success' : 'info');
                              }}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-colors border ${blocked ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20' : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'}`}
                            >
                              <Ban className="w-3 h-3" /><span>{blocked ? 'Unblock' : 'Block'}</span>
                            </button>
                            <button
                              onClick={() => { setCustomerModal({ editing: c.id }); setCustForm({ name: c.name, phone: c.phone, email: c.email, zone: c.zone }); }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-gray-500/10 border border-gray-500/30 text-gray-300 rounded-lg text-[9px] font-black hover:bg-gray-500/20 transition-colors"
                            >
                              <PenLine className="w-3 h-3" /><span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setTab('lookup');
                                setLookupQuery(c.custId || c.id);
                                runLookup(c.custId || c.id);
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-brand-orange/10 border border-brand-orange/30 text-brand-orange rounded-lg text-[9px] font-black hover:bg-brand-orange/20 transition-colors"
                            >
                              <UserSearch className="w-3 h-3" /><span>Profile</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1"><Gift className="w-3 h-3 text-amber-400" /><span>Add Loyalty Points</span></p>
                              <div className="flex items-center space-x-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Points"
                                  onChange={(e) => setCustLoyalty(prev => ({ ...prev, [c.id]: Math.max(0, Number(e.target.value) || 0) }))}
                                  className="w-24 bg-brand-dark text-xs font-mono text-gray-200 border border-brand-border rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange"
                                />
                                <button
                                  onClick={() => {
                                    const pts = custLoyalty[c.id];
                                    if (pts === undefined) { showToast && showToast('Enter points to add', 'info'); return; }
                                    setCustLoyalty(prev => ({ ...prev, [c.id]: 0 }));
                                    setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, loyalty: x.loyalty + pts } : x));
                                    setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Loyalty add', orderId: c.id, paymentMethod: 'Wallet', amount: pts, at: Date.now() }, ...prev]);
                                    showToast && showToast(`${pts} points added to ${c.name}`, 'success');
                                  }}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                >Add</button>
                              </div>
                            </div>

                            <div className="bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1"><Mail className="w-3 h-3 text-cyan-400" /><span>Send SMS / Notify</span></p>
                              <div className="flex items-center space-x-1.5">
                                <input
                                  type="text"
                                  value={smsDraft[c.id] || ''}
                                  onChange={(e) => setSmsDraft(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { const msg = (smsDraft[c.id] || '').trim(); if (msg) { showToast && showToast(`SMS sent to ${c.name}: "${msg}"`, 'success'); setSmsDraft(prev => ({ ...prev, [c.id]: '' })); } } }}
                                  placeholder="Type message…"
                                  className="flex-1 bg-brand-dark text-[10px] text-gray-200 border border-brand-border rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange placeholder:text-gray-600 min-w-0"
                                />
                                <button
                                  onClick={() => {
                                    const msg = (smsDraft[c.id] || '').trim();
                                    if (!msg) { showToast && showToast('Type a message first', 'info'); return; }
                                    setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'SMS sent', orderId: c.id, paymentMethod: 'SMS', amount: 0, at: Date.now() }, ...prev]);
                                    showToast && showToast(`SMS sent to ${c.name}: "${msg}"`, 'success');
                                    setSmsDraft(prev => ({ ...prev, [c.id]: '' }));
                                  }}
                                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                                >Send</button>
                              </div>
                            </div>
                          </div>

                          <div className="bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                            <button
                              onClick={() => setShowCustOrders(showCustOrders === c.id ? null : c.id)}
                              className="w-full flex items-center justify-between text-left cursor-pointer"
                            >
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Order History ({custOrders.length})</span>
                              <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${showCustOrders === c.id ? 'rotate-180' : ''}`} />
                            </button>
                            {showCustOrders === c.id && (
                              custOrders.length === 0 ? (
                                <p className="text-[9px] text-gray-500 mt-1.5">No orders found for this customer.</p>
                              ) : (
                                <div className="space-y-1 mt-1.5">
                                  {custOrders.map(o => (
                                    <div key={o.id} className="flex items-center justify-between gap-2 text-[9px] text-gray-300 bg-brand-dark border border-brand-border/30 rounded px-2 py-1">
                                      <span className="font-mono">#{o.id}</span>
                                      <span className="text-gray-400 truncate">{o.storeName}</span>
                                      <span className="font-mono text-white font-black">৳{o.amount.toLocaleString()}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-brand-border/40 text-gray-300">{o.status}</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            )}
                          </div>

                          <div className="bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                            <button
                              onClick={() => setShowCustTxns(showCustTxns === c.id ? null : c.id)}
                              className="w-full flex items-center justify-between text-left cursor-pointer"
                            >
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider flex items-center space-x-1"><Banknote className="w-3 h-3 text-brand-orange" /><span>Add Money Requests ({custTxns.filter(t => t.type === 'Top-Up' && (t.customerId === c.id || t.customerId === c.custId || t.sender === c.phone)).length})</span></span>
                              <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${showCustTxns === c.id ? 'rotate-180' : ''}`} />
                            </button>
                            {showCustTxns === c.id && (
                              custTxns.filter(t => t.type === 'Top-Up' && (t.customerId === c.id || t.customerId === c.custId || t.sender === c.phone)).length === 0 ? (
                                <p className="text-[9px] text-gray-500 mt-1.5">No add money requests for this customer. Use New Add Money to create one.</p>
                              ) : (
                                <div className="space-y-1 mt-1.5">
                                  {custTxns.filter(t => t.type === 'Top-Up' && (t.customerId === c.id || t.customerId === c.custId || t.sender === c.phone)).map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between gap-2 text-[9px] text-gray-300 bg-brand-dark border border-brand-border/30 rounded px-2 py-1">
                                      <div className="min-w-0 flex items-center space-x-2">
                                        <span className={`font-mono ${tx.status === 'Completed' ? 'text-emerald-400' : tx.status === 'Rejected' ? 'text-red-400' : 'text-amber-400'}`}>{tx.id}</span>
                                        <span className="text-gray-500 truncate">{tx.method}{tx.trxId ? ` · ${tx.trxId}` : ''}</span>
                                      </div>
                                      <div className="flex items-center space-x-2 shrink-0">
                                        <span className="font-mono text-white font-black">+৳{tx.amount.toLocaleString()}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${tx.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : tx.status === 'Rejected' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{tx.status}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            )}
                          </div>

                          <div className="flex items-center space-x-2 bg-brand-dark/60 border border-brand-border/40 rounded-lg p-2">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider shrink-0">Add to Wallet</p>
                            <input
                              type="number"
                              min={0}
                              value={alloc === 0 && !custWallet[c.id] ? '' : alloc}
                              placeholder="৳"
                              onChange={(e) => setCustWallet(prev => ({ ...prev, [c.id]: Math.max(0, Number(e.target.value) || 0) }))}
                              className="w-24 bg-brand-dark text-xs font-mono text-gray-200 border border-brand-border rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange"
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
                            <button
                              onClick={() => { setAdminTopUpModal(c.id); setAdminTopUp({ amount: '', method: 'bKash', sender: '', trxId: '', note: '' }); }}
                              className="ml-auto px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-black cursor-pointer transition-colors flex items-center space-x-1 shrink-0"
                            >
                              <PlusCircle className="w-3 h-3" /><span>New Add Money</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {customers.filter(c => !custSearch.trim() || c.name.toLowerCase().includes(custSearch.trim().toLowerCase()) || c.phone.includes(custSearch.trim()) || c.email.toLowerCase().includes(custSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-center text-[10px] text-gray-500 py-6">No customers found</p>
              )}
            </div>
          </div>
        )}

        {/* Add / Edit customer modal */}
        {customerModal && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setCustomerModal(null)}>
            <div className="bg-brand-card border border-brand-border rounded-2xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-white text-sm flex items-center space-x-2">
                  {customerModal.editing ? <><PenLine className="w-4 h-4 text-brand-orange" /><span>Edit Customer</span></> : <><UserPlus className="w-4 h-4 text-brand-orange" /><span>Add Customer</span></>}
                </h3>
                <button onClick={() => setCustomerModal(null)} className="p-1.5 text-gray-400 hover:text-white rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Full Name</label>
                  <input type="text" value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} placeholder="e.g. Ahad Rahman" className="w-full bg-brand-dark text-gray-200 border border-brand-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-orange placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone</label>
                  <input type="tel" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} placeholder="01XXX-XXXXXX" className="w-full bg-brand-dark text-gray-200 border border-brand-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-orange placeholder:text-gray-600 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email</label>
                  <input type="email" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} placeholder="name@example.com" className="w-full bg-brand-dark text-gray-200 border border-brand-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-orange placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Zone / Area</label>
                  <input type="text" value={custForm.zone} onChange={(e) => setCustForm({ ...custForm, zone: e.target.value })} placeholder="e.g. Dhanmondi" className="w-full bg-brand-dark text-gray-200 border border-brand-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-orange placeholder:text-gray-600" />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button onClick={() => setCustomerModal(null)} className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                <button
                  onClick={() => {
                    if (!custForm.name.trim() || !custForm.phone.trim()) { showToast && showToast('Name and phone are required', 'info'); return; }
                    if (customerModal.editing) {
                      setCustomers(prev => prev.map(x => x.id === customerModal.editing ? { ...x, name: custForm.name.trim(), phone: custForm.phone.trim(), email: custForm.email.trim(), zone: custForm.zone.trim() } : x));
                      showToast && showToast('Customer updated', 'success');
                    } else {
                      setCustomers(prev => [{ id: `CUS-${String(prev.length + 1).padStart(3, '0')}`, name: custForm.name.trim(), phone: custForm.phone.trim(), email: custForm.email.trim(), zone: custForm.zone.trim(), orders: 0, spent: 0, joined: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }), loyalty: 0, status: 'Active', custId: 'NEX' + Math.floor(1000000000 + Math.random() * 9000000000).toString() }, ...prev]);
                      showToast && showToast('Customer added — permanent ID assigned', 'success');
                    }
                    setCustomerModal(null);
                  }}
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer"
                >{customerModal.editing ? 'Save Changes' : 'Add Customer'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Admin New Add Money modal */}
        {adminTopUpModal && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setAdminTopUpModal(null)}>
            <div className="bg-brand-card border border-brand-border rounded-2xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-white text-sm flex items-center space-x-2"><PlusCircle className="w-4 h-4 text-brand-orange" /><span>New Add Money</span></h3>
                <button onClick={() => setAdminTopUpModal(null)} className="p-1.5 text-gray-400 hover:text-white rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              {(() => {
                const cust = customers.find(x => x.id === adminTopUpModal);
                return (
                  <>
                    <div className="flex items-center space-x-2.5 bg-brand-dark/50 border border-brand-border/40 rounded-xl p-2.5">
                      <div className="w-9 h-9 rounded-full bg-brand-orange/20 border border-brand-orange/30 text-brand-orange text-[11px] font-black flex items-center justify-center shrink-0">
                        {(cust?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-black text-xs">{cust?.name || '—'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{cust?.phone || ''} · Wallet ৳{walletBal.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount (৳)</label>
                        <input type="number" min={0} value={adminTopUp.amount} onChange={(e) => setAdminTopUp({ ...adminTopUp, amount: e.target.value })} placeholder="e.g. 500" className="w-full bg-brand-dark text-gray-200 border border-brand-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-orange placeholder:text-gray-600 font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Method</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {['bKash', 'Nagad', 'Upay', 'Rocket'].map(m => (
                            <button key={m} onClick={() => setAdminTopUp({ ...adminTopUp, method: m })} className={`py-2 rounded-lg border text-[10px] font-black transition-all cursor-pointer ${adminTopUp.method === m ? 'border-brand-orange bg-brand-orange/15 text-brand-orange' : 'border-brand-border bg-brand-dark text-gray-400 hover:text-white'}`}>{m}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sender Number</label>
                          <input type="tel" value={adminTopUp.sender} onChange={(e) => setAdminTopUp({ ...adminTopUp, sender: e.target.value })} placeholder="01XXXXXXXXX" className="w-full bg-brand-dark text-gray-200 border border-brand-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-orange placeholder:text-gray-600 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">TrxID</label>
                          <input type="text" value={adminTopUp.trxId} onChange={(e) => setAdminTopUp({ ...adminTopUp, trxId: e.target.value })} placeholder="e.g. 355767868763565" className="w-full bg-brand-dark text-gray-200 border border-brand-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-orange placeholder:text-gray-600 font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Note (optional)</label>
                        <input type="text" value={adminTopUp.note} onChange={(e) => setAdminTopUp({ ...adminTopUp, note: e.target.value })} placeholder="e.g. Walk-in top-up at store" className="w-full bg-brand-dark text-gray-200 border border-brand-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-orange placeholder:text-gray-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button onClick={() => setAdminTopUpModal(null)} className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                      <button
                        onClick={() => {
                          const amt = parseFloat(adminTopUp.amount);
                          if (isNaN(amt) || amt <= 0) { showToast && showToast('Enter a valid amount', 'info'); return; }
                          const txn = { id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Top-Up', amount: amt, date: 'Just now', status: 'Pending' as const, trxId: adminTopUp.trxId.trim().toUpperCase() || undefined, sender: adminTopUp.sender.trim(), method: adminTopUp.method, receipt: undefined, customerId: adminTopUpModal || undefined };
                          const next = [txn, ...custTxns];
                          setCustTxns(next);
    lsSet('ss_wtxn_v3', next);
                          setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Top-up created', orderId: adminTopUpModal || '', paymentMethod: adminTopUp.method, amount: amt, at: Date.now(), reason: adminTopUp.note.trim() || undefined }, ...prev]);
                          showToast && showToast(`৳${amt.toLocaleString()} ${adminTopUp.method} top-up added — verify in Top-Up tab`, 'info');
                          setAdminTopUpModal(null);
                        }}
                        className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer"
                      >Submit for Verify</button>
                    </div>
                  </>
                );
              })()}
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

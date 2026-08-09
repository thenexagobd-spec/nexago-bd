/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, Driver, AdminAuditEntry, RefundRequest, WalletConfig, WalletKey, DEFAULT_WALLETS, WALLET_CONFIG_KEY } from '../types';
import { 
  Search, Plus, Filter, Edit3, Trash2, Check, Clock, X, Copy, 
  Eye, Download, ChevronRight, ChevronLeft, ChevronDown, Store,
  Zap, MapPin, Package, Navigation, Sparkles, Timer, Undo2, ShieldCheck, MessageCircle,
  History, Banknote, TrendingUp, Wallet, PlusCircle
} from 'lucide-react';
import { BkashLogo, NagadLogo, UpayLogo, RocketLogo, WALLET_META } from './walletLogos';

const lsGet = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const lsSet = (key: string, v: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* noop */ }
};

interface OrdersViewProps {
  orders: Order[];
  drivers: Driver[];
  onAddOrder: (order: Omit<Order, 'id' | 'date'>) => void;
  onUpdateOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onAssignDriver?: (order: Order, driverId: string) => void;
  onCancelOrder?: (order: Order, note: string) => void;
  onReactivateOrder?: (order: Order, destination: 'driver' | 'customer' | 'store') => void;
  onUndoStatus?: (order: Order) => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
  toolRequest?: { tool: 'audit' | 'refunds' | 'analytics' | 'wallets' | null; at: number };
}

// Real brand logo image with graceful fallback to a styled mark when offline
const BrandImage: React.FC<{ src: string; size: number; alt: string }> = ({ src, size, alt }) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (failed) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: Math.max(4, size * 0.2),
          background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontWeight: 800, color: '#475569', fontSize: size * 0.34, fontFamily: 'Arial, sans-serif'
        }}
      >
        {alt[0]}
      </div>
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: Math.max(4, size * 0.2),
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden', border: '1px solid #e2e8f0'
      }}
    >
      {!loaded && <span style={{ color: '#94a3b8', fontSize: size * 0.3, fontWeight: 800 }}>...</span>}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{ display: loaded ? 'block' : 'none', objectFit: 'contain', padding: size * 0.12 }}
      />
    </div>
  );
};

// Brand logo renderer for each Bangladesh payment method (official SVG artwork where available)
const PaymentLogo: React.FC<{ method: string; size?: number }> = ({ method, size = 28 }) => {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.max(4, size * 0.2),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    fontWeight: 800,
    color: '#fff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    letterSpacing: '-0.02em'
  };
  const text = (color: string, label: string, fontSizeRatio = 0.3, italic = false): React.CSSProperties => ({
    fontSize: Math.max(7, size * fontSizeRatio),
    color,
    fontWeight: 900,
    fontStyle: italic ? 'italic' : 'normal',
    lineHeight: 1
  });
  const walletBox = (children: React.ReactNode, bg: string): React.ReactElement => (
    <div style={{ ...base, background: bg }}>{children}</div>
  );

  switch (method) {
    case 'bKash':
      return walletBox(<BkashLogo width={size} height={size} />, '#fff');
    case 'Nagad':
      return walletBox(<NagadLogo width={size} height={size} />, '#fff');
    case 'Upay':
      return walletBox(<UpayLogo width={size} height={size} />, '#fff');
    case 'Rocket':
      return walletBox(<RocketLogo width={size} height={size} />, '#fff');
    case 'SureCash':
      return walletBox(<span style={text('#fff', 'S', 0.5)}>S</span>, '#f7941d');
    case 'Tap':
      return walletBox(<span style={text('#fff', 'tap', 0.34, true)}>tap</span>, '#7c3aed');
    case 'mCash':
      return walletBox(<span style={text('#fff', 'mCash', 0.3)}>mCash</span>, '#d71920');
    case 'OK Wallet':
      return walletBox(<span style={text('#fff', 'OK', 0.36)}>OK</span>, '#00a651');
    case 'MY Cash':
      return walletBox(<span style={text('#fff', 'MY', 0.36)}>MY</span>, '#f58220');
    case 'Aamra Pay':
      return <div style={{ ...base, background: '#78be20' }}><span style={text('#fff', 'A', 0.5)}>A</span></div>;
    case 'Islami Bank mCash':
      return <div style={{ ...base, background: '#0d8a5f' }}><span style={text('#fff', 'iB', 0.36)}>iB</span></div>;
    case 'Visa Card':
      return <BrandImage src="https://cdn.simpleicons.org/visa" size={size} alt="Visa" />;
    case 'Mastercard':
      return <BrandImage src="https://cdn.simpleicons.org/mastercard" size={size} alt="Mastercard" />;
    case 'Amex Card':
      return <BrandImage src="https://cdn.simpleicons.org/americanexpress" size={size} alt="Amex" />;
    case 'Local Debit Card':
      return (
        <div style={{ ...base, background: '#4f46e5' }}>
          <span style={{ position: 'absolute', left: size * 0.16, top: size * 0.24, width: size * 0.28, height: size * 0.2, background: 'rgba(255,255,255,0.85)', borderRadius: 2 }} />
          <span style={{ position: 'absolute', right: size * 0.12, top: size * 0.2, width: size * 0.5, height: size * 0.6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.5)' }} />
        </div>
      );
    case 'Internet Banking':
      return (
        <div style={{ ...base, background: '#475569' }}>
          <span style={{ width: 0, height: 0, borderLeft: `${size * 0.14}px solid transparent`, borderRight: `${size * 0.14}px solid transparent`, borderBottom: `${size * 0.24}px solid #fff` }} />
        </div>
      );
    case 'Bank Transfer':
      return (
        <div style={{ ...base, background: '#334155' }}>
          <span style={{ fontSize: size * 0.4, fontWeight: 900, lineHeight: 1, transform: 'rotate(180deg)' }}>⇄</span>
        </div>
      );
    case 'SSLCommerz':
      return (
        <div style={{ ...base, background: '#0b6dc7' }}>
          <span style={{ fontSize: size * 0.32, fontWeight: 900, lineHeight: 1 }}>SSL</span>
        </div>
      );
    case 'Shwapno Pay':
      return (
        <div style={{ ...base, background: '#8dc63f' }}>
          <span style={text('#fff', 'SHW', 0.3)}>SHW</span>
        </div>
      );
    case 'Cash':
    case 'Cash on Delivery':
      return (
        <div style={{ ...base, background: '#10b981', borderRadius: size / 2 }}>
          <span style={text('#fff', '৳', 0.5)}>৳</span>
        </div>
      );
    default:
      return <div style={{ ...base, background: '#3b82f6' }}><span style={text('#fff', '?', 0.4)}>?</span></div>;
  }
};

export default function OrdersView({ 
  orders, 
  drivers, 
  onAddOrder, 
  onUpdateOrder, 
  onDeleteOrder,
  onAssignDriver,
  onCancelOrder,
  onReactivateOrder,
  onUndoStatus,
  showToast,
  toolRequest
}: OrdersViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Processing' | 'Completed' | 'Cancelled'>('All');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'bKash' | 'Nagad' | 'Upay' | 'Rocket' | 'Cash on Delivery' | 'Card' | 'Wallet'>('All');
  const [payStatusFilter, setPayStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'COD' | 'Paid'>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Admin cancel with debit/credit adjustment
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelParty, setCancelParty] = useState<'Customer' | 'Driver' | 'Store' | 'None'>('None');
  const [cancelAdjust, setCancelAdjust] = useState<'Debit' | 'Credit'>('Debit');
  const [cancelAmount, setCancelAmount] = useState(0);
  const [cancelReason, setCancelReason] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Custom rejection reasons
  const REJECT_REASONS = ['TrxID invalid', 'Amount mismatched', 'Screenshot unclear/illegible', 'Duplicate TrxID', 'Number mismatch (last 4 digits)', 'Other'];
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null);

  // Admin audit log (who approved/rejected/refunded what & when)
  const [auditLog, setAuditLog] = useState<AdminAuditEntry[]>(() => lsGet('ss_admin_audit', []));
  useEffect(() => lsSet('ss_admin_audit', auditLog), [auditLog]);
  const [showAudit, setShowAudit] = useState(false);

  // Refund requests (customer-initiated)
  const [refunds, setRefunds] = useState<RefundRequest[]>(() => lsGet('ss_refunds', []));
  useEffect(() => lsSet('ss_refunds', refunds), [refunds]);
  const [showRefunds, setShowRefunds] = useState(false);

  // Analytics / reports panel
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Admin-managed Send Money wallet numbers (bKash / Nagad / Upay / Rocket) — shared with the customer storefront
  const [walletCfg, setWalletCfg] = useState<WalletConfig>(() => lsGet<WalletConfig>(WALLET_CONFIG_KEY, DEFAULT_WALLETS));
  const [showWallets, setShowWallets] = useState(false);

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

  // Open a tool panel (audit / refunds / analytics / wallets) when requested from the sidebar
  useEffect(() => {
    if (!toolRequest || !toolRequest.tool) return;
    if (toolRequest.tool === 'audit') setShowAudit(true);
    else if (toolRequest.tool === 'refunds') setShowRefunds(true);
    else if (toolRequest.tool === 'analytics') setShowAnalytics(true);
    else if (toolRequest.tool === 'wallets') setShowWallets(true);
  }, [toolRequest]);

  // Form states
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [driverId, setDriverId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [status, setStatus] = useState<Order['status']>('Pending');
  const [priority, setPriority] = useState<'Normal' | 'Express' | 'Urgent'>('Normal');
  const [pickupLocation, setPickupLocation] = useState('');
  const [deliveryZone, setDeliveryZone] = useState('');
  const [itemCount, setItemCount] = useState(1);
  const [parcelSize, setParcelSize] = useState<'Small' | 'Medium' | 'Large'>('Small');
  const [instructions, setInstructions] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [codAmount, setCodAmount] = useState(0);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [isPaymentListOpen, setIsPaymentListOpen] = useState(false);

  // Auto-assign the nearest available (Online) driver
  const autoAssignDriver = () => {
    const available = drivers.filter(d => d.status === 'Online' && !d.dispatchLocked);
    if (available.length === 0) return;
    const chosen = available[Math.floor(Math.random() * available.length)];
    setDriverId(chosen.id);
    const zone = ['Dhanmondi', 'Gulshan', 'Banani', 'Mohammadpur', 'Uttara', 'Mirpur'];
    setDeliveryZone(prev => prev || zone[Math.floor(Math.random() * zone.length)]);
  };

  // Copy to clipboard helper
  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(search.toLowerCase()) ||
                          order.storeName.toLowerCase().includes(search.toLowerCase()) ||
                          order.address.toLowerCase().includes(search.toLowerCase()) ||
                          order.customerName.toLowerCase().includes(search.toLowerCase()) ||
                          (order.customerPhone && order.customerPhone.includes(search));
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    const paymentBucket = (m: string) =>
      m.startsWith('bKash') ? 'bKash' :
      m.startsWith('Nagad') ? 'Nagad' :
      m.startsWith('Upay') ? 'Upay' :
      m.startsWith('Rocket') ? 'Rocket' :
      m.includes('Wallet') ? 'Wallet' :
      m.includes('Cash') ? 'Cash on Delivery' : m;
    const matchesPayment = paymentFilter === 'All' || paymentBucket(order.paymentMethod) === paymentFilter;
    const matchesPayStatus = payStatusFilter === 'All' || order.paymentStatus === payStatusFilter;
    return matchesSearch && matchesStatus && matchesPayment && matchesPayStatus;
  });

  // Pagination calculation
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCSV = () => {
    const header = ['Order ID', 'Store', 'Customer', 'Phone', 'Date', 'Time', 'Amount (BDT)', 'Payment', 'Status', 'Priority', 'Rider', 'Address'];
    const rows = filteredOrders.map(o => [
      o.id, o.storeName, o.customerName, o.customerPhone || '', o.date, o.time || '',
      o.amount.toFixed(2), o.paymentMethod, o.status, o.priority || 'Normal', o.driverId || 'Unassigned', o.address || ''
    ]);
    const csv = '\uFEFF' + [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexago-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredOrders.length} orders to CSV`, 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extraFields = {
      priority,
      pickupLocation,
      zone: deliveryZone,
      itemCount: Number(itemCount),
      parcelSize,
      instructions,
      deliveryCharge: Number(deliveryCharge),
      codAmount: Number(codAmount),
      estimatedMinutes: Number(estimatedMinutes)
    };
    if (editingOrder) {
      onUpdateOrder({
        ...editingOrder,
        storeName,
        address,
        amount: Number(amount),
        customerName,
        customerPhone,
        driverId: driverId || undefined,
        paymentMethod,
        status,
        ...extraFields
      });
      setEditingOrder(null);
    } else {
      onAddOrder({
        storeName,
        address,
        amount: Number(amount),
        customerName,
        customerPhone,
        driverId: driverId || undefined,
        paymentMethod,
        status,
        ...extraFields
      });
      setIsAddOpen(false);
    }
    resetForm();
  };

  const startEdit = (order: Order) => {
    setEditingOrder(order);
    setStoreName(order.storeName);
    setAddress(order.address);
    setAmount(order.amount);
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone || '');
    setDriverId(order.driverId || '');
    setPaymentMethod(order.paymentMethod);
    setStatus(order.status);
    setPriority(order.priority || 'Normal');
    setPickupLocation(order.pickupLocation || '');
    setDeliveryZone(order.zone || '');
    setItemCount(order.itemCount || 1);
    setParcelSize(order.parcelSize || 'Small');
    setInstructions(order.instructions || '');
    setDeliveryCharge(order.deliveryCharge || 0);
    setCodAmount(order.codAmount || 0);
    setEstimatedMinutes(order.estimatedMinutes || 30);
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setStoreName('');
    setAddress('');
    setAmount(0);
    setCustomerName('');
    setCustomerPhone('');
    setDriverId('');
    setPaymentMethod('bKash');
    setStatus('Pending');
    setPriority('Normal');
    setPickupLocation('');
    setDeliveryZone('');
    setItemCount(1);
    setParcelSize('Small');
    setInstructions('');
    setDeliveryCharge(0);
    setCodAmount(0);
    setEstimatedMinutes(30);
    setEditingOrder(null);
  };

  // Get Store initials/logo styling
  const getStoreLogo = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const colors = [
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'bg-pink-500/10 text-pink-400 border-pink-500/20',
    ];
    const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colorClass = colors[charCodeSum % colors.length];

    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border ${colorClass} shrink-0`}>
        {initials}
      </div>
    );
  };

  // All Bangladesh payment methods as selectable chips
  const paymentMethods: { name: string; color: string; letter: string }[] = [
    { name: 'bKash', color: '#e2136e', letter: 'b' },
    { name: 'Nagad', color: '#f15a22', letter: 'N' },
    { name: 'Rocket', color: '#8c3494', letter: 'R' },
    { name: 'Upay', color: '#e31b23', letter: 'U' },
    { name: 'SureCash', color: '#f59e0b', letter: 'S' },
    { name: 'Tap', color: '#8b5cf6', letter: 'T' },
    { name: 'mCash', color: '#10b981', letter: 'm' },
    { name: 'OK Wallet', color: '#0ea5e9', letter: 'O' },
    { name: 'MY Cash', color: '#ec4899', letter: 'M' },
    { name: 'Aamra Pay', color: '#14b8a6', letter: 'A' },
    { name: 'Islami Bank mCash', color: '#059669', letter: 'IB' },
    { name: 'Visa Card', color: '#2563eb', letter: 'V' },
    { name: 'Mastercard', color: '#f97316', letter: 'M' },
    { name: 'Amex Card', color: '#06b6d4', letter: 'A' },
    { name: 'Local Debit Card', color: '#6366f1', letter: 'D' },
    { name: 'Internet Banking', color: '#64748b', letter: 'IB' },
    { name: 'Bank Transfer', color: '#475569', letter: 'BT' },
    { name: 'SSLCommerz', color: '#6366f1', letter: 'S' },
    { name: 'Shwapno Pay', color: '#84cc16', letter: 'SW' },
    { name: 'Cash', color: '#10b981', letter: 'C' },
    { name: 'Cash on Delivery', color: '#059669', letter: 'COD' }
  ];

  // Render Payment badges with original brand logos + verification for Send Money
  const getPaymentMethodBadge = (order: Order) => {
    const isPending = order.paymentStatus === 'Pending';
    const amountOk = !order.trxAmount || Math.abs(order.trxAmount - order.amount) <= 0.01;
    const waLink = order.customerPhone
      ? `https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`NexaGo: Order #${order.id} payment ${order.paymentStatus === 'Approved' ? 'approved ✓' : 'rejected ✗'} (৳${order.amount}).`)}`
      : null;
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <PaymentLogo method={order.paymentMethod} size={28} />
          <span className="font-semibold text-gray-300">{order.paymentMethod}</span>
        </div>
        {order.paymentStatus && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
            order.paymentStatus === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
            order.paymentStatus === 'Pending' ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 animate-pulse' :
            order.paymentStatus === 'Rejected' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
            order.paymentStatus === 'COD' ? 'bg-gray-500/15 text-gray-300 border border-gray-500/30' :
            'bg-blue-500/15 text-blue-300 border border-blue-500/30'
          }`}>
            {order.paymentStatus === 'Approved' ? '✓ Approved' : order.paymentStatus === 'Pending' ? '⏳ Pending' : order.paymentStatus === 'Rejected' ? '✗ Rejected' : order.paymentStatus === 'COD' ? 'COD' : 'Paid'}
          </span>
        )}
        {isPending && order.trxId && (
          <div className="space-y-1.5 text-[10px] bg-brand-dark/60 border border-brand-border/60 rounded-lg p-2">
            <p className="font-mono text-gray-300">TrxID: <b className="text-white">{order.trxId}</b></p>
            {order.senderNumber && <p className="text-gray-400">From: <b className="text-gray-300">{order.senderNumber}</b></p>}
            {order.last4 && <p className="text-gray-400">Last 4 (PIN): <b className="text-gray-300">•••• {order.last4}</b></p>}
            <p className={amountOk ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
              {amountOk ? `✓ Amount matches (৳${order.amount})` : `⚠ Amount mismatch — claimed ৳${order.trxAmount} vs ৳${order.amount}`}
            </p>
            {order.receipt && (
              <a href={order.receipt} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-1 text-blue-400 hover:underline cursor-pointer">
                <Eye className="w-3 h-3" /><span>View receipt</span>
              </a>
            )}
            <div className="flex items-center space-x-1.5 pt-1">
              <button
                onClick={() => {
                  onUpdateOrder({ ...order, paymentStatus: 'Approved', status: 'Confirmed', paymentNote: 'Payment verified by admin' });
                  setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Approved', orderId: order.id, paymentMethod: order.paymentMethod, amount: order.amount, at: Date.now() }, ...prev]);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded text-[9px] font-bold cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-3 h-3" /><span>Verify & Approve</span>
              </button>
              <button
                onClick={() => setRejectTarget(order)}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded text-[9px] font-bold cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" /><span>Reject</span>
              </button>
            </div>
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-1 text-emerald-400 hover:underline cursor-pointer">
                <MessageCircle className="w-3 h-3" /><span>WhatsApp {order.customerPhone}</span>
              </a>
            )}
          </div>
        )}
        {!isPending && order.paymentNote && (
          <p className="text-[9px] text-gray-500">Note: {order.paymentNote}</p>
        )}
      </div>
    );
  };

  // Tab dynamic counts
  const getTabCount = (tab: typeof statusFilter) => {
    if (tab === 'All') return orders.length;
    return orders.filter(o => o.status === tab).length;
  };

  const pendingPayments = orders.filter(o => o.paymentStatus === 'Pending').length;

  return (
    <div className="space-y-6 fade-in">
      
      {/* Live payment verification alert */}
      {pendingPayments > 0 && (
        <div className="flex items-center justify-between gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-purple-200">🔔 {pendingPayments} payment{pendingPayments > 1 ? 's' : ''} awaiting verification</p>
              <p className="text-[10px] text-purple-300/80">Review the TrxID, match the exact amount, then Verify & Approve or Reject.</p>
            </div>
          </div>
          <button
            onClick={() => {
              const Ctx = window.AudioContext || (window as any).webkitAudioContext;
              try {
                const ctx = new Ctx();
                [880, 1174, 1568].forEach((f, i) => {
                  const o = ctx.createOscillator(); const g = ctx.createGain();
                  o.type = 'sine'; o.frequency.value = f;
                  const t = ctx.currentTime + i * 0.18;
                  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
                  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.18);
                });
              } catch { /* noop */ }
            }}
            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0"
          >
            Test Ring
          </button>
        </div>
      )}
      
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">All Orders</h2>
          <p className="text-xs text-gray-400">Manage real-time grocery logistics, dispatch controls, and active orders</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddOpen(true); }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Dispatch New Order</span>
        </button>
      </div>

      {/* FILTER BUTTONS & EXPORT/FILTER TOOLS */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-brand-card/30 border border-brand-border/60 p-4 rounded-xl">
        
        {/* Dynamic status filters with counts matching the mockup structure */}
        <div className="flex items-center space-x-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-none">
          {(['All', 'Pending', 'Confirmed', 'Processing', 'Completed', 'Cancelled'] as const).map((tab) => {
            const isActive = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setCurrentPage(1);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-brand-orange/10 border-brand-orange text-brand-orange'
                    : 'bg-brand-dark/40 border-brand-border/50 text-gray-400 hover:text-gray-200 hover:bg-brand-dark/80'
                }`}
              >
                <span>{tab === 'All' ? 'All Orders' : tab}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  isActive 
                    ? 'bg-brand-orange text-white' 
                    : 'bg-brand-border/50 text-gray-400'
                }`}>
                  {getTabCount(tab)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input, Export and Filter tools */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, Customer, Store..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange transition-all placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 justify-end">
            <button onClick={handleExportCSV} className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-dark hover:bg-brand-dark/80 text-gray-300 hover:text-white border border-brand-border rounded-lg text-xs font-bold transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5 text-gray-400" />
              <span>Export CSV</span>
            </button>
            <button onClick={() => showToast && showToast('Filters: status & search are applied live above', 'info')} className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-dark hover:bg-brand-dark/80 text-gray-300 hover:text-white border border-brand-border rounded-lg text-xs font-bold transition-all cursor-pointer">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span>Filter</span>
            </button>
          </div>
        </div>

      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-brand-card border border-brand-border/60 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40 select-none">
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Order ID</th>
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Store</th>
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Customer</th>
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Date & Time</th>
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Amount</th>
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Payment Method</th>
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Status</th>
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Driver</th>
                <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-brand-dark/20 transition-colors group">
                  
                  {/* Order ID with click-to-copy */}
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-300">
                    <div className="flex items-center space-x-2">
                      <span>#{order.id}</span>
                      <button 
                        onClick={() => handleCopy(order.id)}
                        className="text-gray-500 hover:text-brand-orange transition-colors p-1 rounded hover:bg-brand-dark cursor-pointer"
                        title="Copy Order ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {copiedId === order.id && (
                        <span className="text-[9px] text-emerald-400 font-sans font-semibold ml-1 animate-pulse">Copied!</span>
                      )}
                    </div>
                  </td>

                  {/* Store info with circular logo */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      {getStoreLogo(order.storeName)}
                      <div>
                        <div className="font-bold text-white text-[12px]">{order.storeName}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{order.address}</div>
                      </div>
                    </div>
                  </td>

                  {/* Customer details with Phone info */}
                  <td className="py-3.5 px-4">
                    <div>
                      <div className="font-semibold text-gray-200 text-[12px]">{order.customerName}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{order.customerPhone || '01711-223344'}</div>
                      {order.customerNote && (
                        <span className="flex items-center space-x-1 text-[9px] text-blue-300 mt-0.5 max-w-[160px]" title={order.customerNote}>
                          <MessageCircle className="w-3 h-3 shrink-0" />
                          <span className="truncate">{order.customerNote}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date and Time column */}
                  <td className="py-3.5 px-4 text-gray-300 font-medium">
                    <div>
                      <div>{order.date}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{order.time || '12:00 PM'}</div>
                    </div>
                  </td>

                  {/* Amount with Taka sign */}
                  <td className="py-3.5 px-4 font-bold text-white text-[12px]">
                    ৳ {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Payment Method Badge */}
                  <td className="py-3.5 px-4">
                    {getPaymentMethodBadge(order)}
                  </td>

                  {/* Status pills matching original design */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.8 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      order.status === 'Pending' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      order.status === 'Processing' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      order.status === 'Confirmed' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {order.status}
                    </span>
                  </td>

                  {/* Driver column with quick manual assign */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={order.driverId || ''}
                        onChange={(e) => {
                          const id = e.target.value;
                          onUpdateOrder({ ...order, driverId: id || undefined });
                          if (id && onAssignDriver) onAssignDriver({ ...order, driverId: id }, id);
                        }}
                        className="max-w-[120px] bg-brand-dark border border-brand-border/80 rounded text-[10px] font-semibold text-gray-300 px-1.5 py-1 outline-none cursor-pointer"
                        title="Manually assign a driver to this order"
                      >
                        <option value="">{order.driverId ? 'Driver ID: ' + order.driverId : 'Unassigned'}</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                        ))}
                      </select>
                      {!order.driverId && (
                        <span className="text-[9px] text-red-400 font-bold uppercase">No rider</span>
                      )}
                    </div>
                  </td>

                  {/* Action buttons (Eye icon and dropdown for details) */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => startEdit(order)}
                        className="p-1.5 bg-brand-dark hover:bg-brand-orange/20 text-gray-400 hover:text-brand-orange border border-brand-border/80 rounded transition-all cursor-pointer"
                        title="View & Edit Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteOrder(order.id)}
                        className="p-1.5 bg-brand-dark hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-brand-border/80 rounded transition-all cursor-pointer"
                        title="Delete Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {order.status === 'Completed' && (
                        <button
                          onClick={() => onUndoStatus?.(order)}
                          className="p-1.5 bg-brand-dark hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 border border-brand-border/80 rounded transition-all cursor-pointer"
                          title="Undo status → back to Ongoing"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                        <button
                          onClick={() => { setCancelOrder(order); setCancelParty('None'); setCancelAdjust('Debit'); setCancelAmount(0); setCancelReason(''); }}
                          className="p-1.5 bg-brand-dark hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-brand-border/80 rounded transition-all cursor-pointer"
                          title="Cancel Order (admin only) — optional debit/credit"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {order.status === 'Cancelled' && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onReactivateOrder?.(order, 'driver')}
                            className="px-1.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-black cursor-pointer transition-all"
                            title="Re-activate → Driver App (resume delivery)"
                          >
                            Driver
                          </button>
                          <button
                            onClick={() => onReactivateOrder?.(order, 'customer')}
                            className="px-1.5 py-1 bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded text-[9px] font-black cursor-pointer transition-all"
                            title="Re-activate → Customer App only"
                          >
                            Customer
                          </button>
                          <button
                            onClick={() => onReactivateOrder?.(order, 'store')}
                            disabled={!!order.pickedUp}
                            className={`px-1.5 py-1 bg-orange-500/10 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 rounded text-[9px] font-black transition-all ${
                              order.pickedUp ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title={order.pickedUp ? 'Unavailable — picked-up orders cannot return to the store' : 'Re-activate → Store queue'}
                          >
                            Store
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty status message */}
        {paginatedOrders.length === 0 && (
          <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <Store className="w-8 h-8 text-gray-600" />
            <p className="text-xs">No orders found matching this filter query.</p>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        <div className="p-4 border-t border-brand-border/40 bg-brand-dark/30 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
          
          <div className="text-xs text-gray-400 font-semibold">
            Showing <span className="text-white">{startIndex + 1}</span> to{' '}
            <span className="text-white">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{' '}
            <span className="text-white">{totalItems}</span> orders
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Items per page selector */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-brand-dark text-white border border-brand-border rounded px-2 py-1 text-xs cursor-pointer focus:border-brand-orange outline-none font-bold"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className={`p-1.5 rounded border border-brand-border ${
                  currentPage === 1 
                    ? 'text-gray-600 bg-brand-dark/20 cursor-not-allowed' 
                    : 'text-gray-300 hover:text-white hover:bg-brand-dark/80 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Simple logic to show a few page items
                if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-gray-500 px-1 text-xs font-bold">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2.5 py-1 text-xs font-bold rounded border ${
                      currentPage === pageNum
                        ? 'bg-brand-orange/20 border-brand-orange text-brand-orange'
                        : 'border-brand-border text-gray-400 hover:text-white hover:bg-brand-dark/80 cursor-pointer'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className={`p-1.5 rounded border border-brand-border ${
                  currentPage === totalPages 
                    ? 'text-gray-600 bg-brand-dark/20 cursor-not-allowed' 
                    : 'text-gray-300 hover:text-white hover:bg-brand-dark/80 cursor-pointer'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* DISPATCH ORDER / EDIT ORDER POPUP MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            
            <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-dark/20 sticky top-0 z-10">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                {editingOrder ? 'Modify Order Logistics' : 'Dispatch New Order'}
              </h3>
              <button
                onClick={() => { resetForm(); setIsAddOpen(false); }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Store / Shop Name</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Fresh Mart"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahim Khan"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Order Priority */}
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Order Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Normal', 'Express', 'Urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        priority === p
                          ? p === 'Urgent'
                            ? 'bg-red-500/15 border-red-500 text-red-400'
                            : p === 'Express'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                            : 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                          : 'bg-brand-dark/40 border-brand-border/60 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Destination Location</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Gulshan, Dhaka"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Customer Phone</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 01712-345678"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-orange" /> Pickup Location</label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g. Fresh Mart, Dhanmondi"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1 flex items-center gap-1"><Navigation className="w-3 h-3 text-emerald-400" /> Delivery Zone</label>
                  <input
                    type="text"
                    value={deliveryZone}
                    onChange={(e) => setDeliveryZone(e.target.value)}
                    placeholder="e.g. Dhanmondi"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Amount Value (৳ Taka)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Payment Channel</label>
                <button
                  type="button"
                  onClick={() => setIsPaymentListOpen(prev => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-brand-dark text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-3">
                    <PaymentLogo method={paymentMethod} size={40} />
                    <span className="text-xs font-bold">{paymentMethod}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isPaymentListOpen ? 'rotate-180' : ''}`} />
                </button>

                {isPaymentListOpen && (
                  <div className="mt-1.5 max-h-44 overflow-y-auto pr-1 space-y-1.5 border border-brand-border/60 bg-brand-dark/40 rounded-lg p-2">
                    {paymentMethods.map((pm) => {
                      const isSelected = paymentMethod === pm.name;
                      return (
                        <button
                          key={pm.name}
                          type="button"
                          onClick={() => { setPaymentMethod(pm.name); setIsPaymentListOpen(false); }}
                          className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand-orange/15 border-brand-orange text-white'
                              : 'border-brand-border/50 bg-brand-dark/40 text-gray-300 hover:border-brand-border hover:bg-brand-dark'
                          }`}
                        >
                        <PaymentLogo method={pm.name} size={30} />
                        <span className="text-[11px] font-semibold flex-1">{pm.name}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Delivery Charge (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                    placeholder="e.g. 60"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">COD Amount (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={codAmount}
                    onChange={(e) => setCodAmount(Number(e.target.value))}
                    placeholder="Cash to collect from customer"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1 flex items-center gap-1"><Package className="w-3 h-3 text-blue-400" /> Item Count</label>
                  <input
                    type="number"
                    min="1"
                    value={itemCount}
                    onChange={(e) => setItemCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Parcel Size</label>
                  <select
                    value={parcelSize}
                    onChange={(e) => setParcelSize(e.target.value as any)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1 flex items-center gap-1"><Timer className="w-3 h-3 text-amber-400" /> ETA (min)</label>
                  <input
                    type="number"
                    min="5"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Assign Courier (Driver)</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={autoAssignDriver}
                      className="shrink-0 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                      title="Auto-assign nearest online driver"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Workflow Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="Pending">Pending (Unassigned)</option>
                    <option value="Confirmed">Confirmed (Approved)</option>
                    <option value="Processing">Processing (Courier Picked)</option>
                    <option value="Completed">Completed (Delivered)</option>
                    <option value="Cancelled">Cancelled (Terminated)</option>
                  </select>
                </div>
              </div>

              {editingOrder?.customerNote && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2">
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-wider mb-1">Customer Order Note</p>
                  <p className="text-xs text-blue-200">💬 {editingOrder.customerNote}</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Rider Instructions (Notes)</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Call customer before reaching. Leave parcel at the gate if unavailable."
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => { resetForm(); setIsAddOpen(false); }}
                  className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {editingOrder ? 'Apply Changes' : 'Dispatch Order'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Admin Cancel Modal with optional debit/credit adjustment */}
      {cancelOrder && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-brand-border/60 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-brand-border/40 flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Cancel Order</h3>
              <button onClick={() => setCancelOrder(null)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-brand-dark/60 border border-brand-border/60 rounded-xl p-3">
                <p className="text-[10px] font-black text-white font-mono">#{cancelOrder.id}</p>
                <p className="text-[10px] text-gray-400">{cancelOrder.customerName} · ৳ {cancelOrder.amount.toFixed(2)} · {cancelOrder.storeName}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">At-fault party (optional)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['None', 'Customer', 'Driver', 'Store'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCancelParty(p)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border transition-colors ${cancelParty === p ? 'bg-brand-orange text-white border-brand-orange' : 'bg-brand-dark text-gray-300 border-brand-border'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {cancelParty !== 'None' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Type</label>
                      <select value={cancelAdjust} onChange={(e) => setCancelAdjust(e.target.value as any)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                        <option value="Debit">Debit (charge)</option>
                        <option value="Credit">Credit (compensate)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Amount (Tk)</label>
                      <input type="number" min={0} value={cancelAmount} onChange={(e) => setCancelAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Reason</label>
                    <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Driver was late / Store packed wrong items" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/40">
                <button onClick={() => setCancelOrder(null)} className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer">Back</button>
                <button
                  onClick={() => {
                    const note = cancelParty === 'None'
                      ? 'Cancelled by Admin'
                      : `Cancelled by Admin A� ${cancelParty} ${cancelAdjust} Tk ${cancelAmount}${cancelReason ? ' �?" ' + cancelReason : ''}`;
                    onUpdateOrder({ ...cancelOrder, status: 'Cancelled' });
                    if (onCancelOrder) onCancelOrder({ ...cancelOrder, status: 'Cancelled' }, note);
                    setCancelOrder(null);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ REJECT PAYMENT MODAL (custom reason) ============ */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3 text-xs animate-in fade-in duration-200 my-auto max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-sm flex items-center space-x-2"><X className="w-4 h-4 text-red-500" /><span>Reject Payment</span></h3>
              <button onClick={() => setRejectTarget(null)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-gray-500">Order <b className="text-gray-800 font-mono">#{rejectTarget.id}</b> · ৳{rejectTarget.amount} · TrxID <b className="font-mono">{rejectTarget.trxId}</b></p>
            <p className="text-[10px] font-bold text-gray-600 uppercase">Select rejection reason (shown to customer)</p>
            <div className="space-y-2">
              {REJECT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => {
                    onUpdateOrder({ ...rejectTarget, paymentStatus: 'Rejected', status: 'Cancelled', paymentNote: r, rejectionReason: r });
                    setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Rejected', orderId: rejectTarget.id, paymentMethod: rejectTarget.paymentMethod, amount: rejectTarget.amount, reason: r, at: Date.now() }, ...prev]);
                    setRejectTarget(null);
                    showToast && showToast(`Payment rejected: ${r}`, 'info');
                  }}
                  className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl text-gray-700 font-bold transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ ADMIN AUDIT LOG PANEL ============ */}
      {showAudit && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border/60 rounded-2xl max-w-lg w-full p-5 space-y-3 text-xs my-auto max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-sm flex items-center space-x-2"><History className="w-4 h-4 text-brand-orange" /><span>Admin Audit Log</span></h3>
              <button onClick={() => setShowAudit(false)} className="p-1 rounded-full hover:bg-brand-border/30 cursor-pointer"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
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
        </div>
      )}

      {/* ============ REFUNDS PANEL ============ */}
      {showRefunds && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border/60 rounded-2xl max-w-lg w-full p-5 space-y-3 text-xs my-auto max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-sm flex items-center space-x-2"><Banknote className="w-4 h-4 text-brand-orange" /><span>Refund Requests</span></h3>
              <button onClick={() => setShowRefunds(false)} className="p-1 rounded-full hover:bg-brand-border/30 cursor-pointer"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-[10px] text-gray-400">Customers request refunds here with their bKash/Nagad number.</p>
            {refunds.length === 0 ? (
              <p className="text-center text-gray-500 py-6">No refund requests yet.</p>
            ) : (
              <div className="space-y-2">
                {refunds.map(r => (
                  <div key={r.id} className="bg-brand-dark/50 border border-brand-border/40 rounded-lg px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-200 font-bold">#{r.orderId} · <span className="font-mono">৳{r.amount}</span></p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        r.status === 'Refunded' ? 'bg-emerald-500/20 text-emerald-300' : r.status === 'Rejected' ? 'bg-red-500/20 text-red-300' : r.status === 'Processing' ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>{r.status}</span>
                    </div>
                    <p className="text-[9px] text-gray-500">{r.method} · <b className="font-mono text-gray-300">{r.number}</b> · {r.reason}</p>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => {
                          setRefunds(prev => prev.map(x => x.id === r.id ? { ...x, status: 'Refunded' } : x));
                          const ord = orders.find(o => o.id === r.orderId);
                          const custTarget = ord ? (ord.customerId || ord.customerPhone) : undefined;
                          // Credit the customer wallet + record the wallet transaction
                          lsSet('ss_wallet_v2', (lsGet<number>('ss_wallet_v2', 0) || 0) + r.amount);
                          const wtxns = lsGet<any[]>('ss_wtxn_v3', []);
                          lsSet('ss_wtxn_v3', [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Refund', amount: r.amount, date: 'Just now', status: 'Completed', customerId: custTarget }, ...wtxns]);
                          if (ord) onUpdateOrder({ ...ord, paymentStatus: 'Refunded', paymentNote: `Refund of ৳${r.amount} approved by admin` });
                          if (custTarget) {
                            const notifs = lsGet<any[]>('sd_notifications', []);
                            lsSet('sd_notifications', [{
                              id: `NOTIF-${Date.now().toString().slice(-8)}`, title: '↩️ Refund Approved',
                              message: `Your refund of ৳${r.amount} for order #${r.orderId} was approved and credited to your wallet.`,
                              type: 'payment', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false,
                              audience: 'customer', customerId: custTarget,
                            }, ...notifs]);
                          }
                          setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Refunded', orderId: r.orderId, paymentMethod: r.method, amount: r.amount, at: Date.now() }, ...prev]);
                          showToast && showToast(`Refund approved for #${r.orderId} (৳${r.amount})`, 'success');
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >Approve & Pay ✓</button>
                      <button
                        onClick={() => {
                          setRefunds(prev => prev.map(x => x.id === r.id ? { ...x, status: 'Rejected' } : x));
                          const ord = orders.find(o => o.id === r.orderId);
                          const custTarget = ord ? (ord.customerId || ord.customerPhone) : undefined;
                          if (custTarget) {
                            const notifs = lsGet<any[]>('sd_notifications', []);
                            lsSet('sd_notifications', [{
                              id: `NOTIF-${Date.now().toString().slice(-8)}`, title: '↩️ Refund Rejected',
                              message: `Your refund request for order #${r.orderId} (৳${r.amount}) was rejected. Contact support for details.`,
                              type: 'payment', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false,
                              audience: 'customer', customerId: custTarget,
                            }, ...notifs]);
                          }
                          setAuditLog(prev => [{ id: `AUD-${Date.now().toString().slice(-5)}`, action: 'Rejected', orderId: r.orderId, paymentMethod: r.method, amount: r.amount, at: Date.now() }, ...prev]);
                          showToast && showToast('Refund request rejected', 'info');
                        }}
                        className="px-3 py-1.5 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ ANALYTICS / REPORTS PANEL ============ */}
      {showAnalytics && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border/60 rounded-2xl max-w-2xl w-full p-5 space-y-4 text-xs my-auto max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-sm flex items-center space-x-2"><TrendingUp className="w-4 h-4 text-brand-orange" /><span>Analytics & Reports</span></h3>
              <button onClick={() => setShowAnalytics(false)} className="p-1 rounded-full hover:bg-brand-border/30 cursor-pointer"><X className="w-4 h-4 text-gray-400" /></button>
            </div>

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
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">Total Revenue</p><p className="text-lg font-black text-white font-mono">৳{grandTotal.toFixed(0)}</p></div>
                    <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">Approved (verified)</p><p className="text-lg font-black text-emerald-300 font-mono">৳{approvedTotal.toFixed(0)}</p></div>
                    <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">Pending Payments</p><p className="text-lg font-black text-purple-300 font-mono">{pending}</p></div>
                    <div className="bg-brand-dark/50 border border-brand-border/40 rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">Total Orders</p><p className="text-lg font-black text-white font-mono">{orders.length}</p></div>
                  </div>

                  {/* By method bars */}
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

                  {/* Last 7 days bar chart */}
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
        </div>
      )}

      {/* ============ PAYMENT WALLETS PANEL (admin-controlled Send Money numbers) ============ */}
      {showWallets && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border/60 rounded-2xl max-w-2xl w-full p-5 space-y-3 text-xs my-auto max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-sm flex items-center space-x-2"><Wallet className="w-4 h-4 text-brand-orange" /><span>Payment Wallets</span></h3>
              <button onClick={() => setShowWallets(false)} className="p-1 rounded-full hover:bg-brand-border/30 cursor-pointer"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
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
        </div>
      )}

    </div>
  );
}

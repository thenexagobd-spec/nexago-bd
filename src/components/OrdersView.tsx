/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Order, Driver } from '../types';
import { 
  Search, Plus, Filter, Edit3, Trash2, Check, Clock, X, Copy, 
  Eye, Download, ChevronRight, ChevronLeft, ChevronDown, MoreHorizontal, Store,
  Zap, MapPin, Package, Navigation, Sparkles, Timer, Undo2, ShieldCheck, MessageCircle
} from 'lucide-react';

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

// Real bKash / Nagad brand marks
const BkashLogo = ({ className = '', width, height }: { className?: string; width?: number; height?: number }) => (
  <svg viewBox="0 0 60 34" className={className} width={width} height={height} xmlns="http://www.w3.org/2000/svg" aria-label="bKash">
    <rect width="60" height="34" rx="7.5" fill="#E2136E" />
    <text x="30" y="23" textAnchor="middle" fontFamily="'Arial Black','Segoe UI',Arial,sans-serif" fontWeight="900" fontSize="15" fill="#ffffff" letterSpacing="-0.3">bKash</text>
    <path d="M14 24.5c10.5 2.2 21.5 2.2 32 0" stroke="#ffffff" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.95" />
  </svg>
);

const NagadLogo = ({ className = '', width, height }: { className?: string; width?: number; height?: number }) => (
  <svg viewBox="0 0 60 34" className={className} width={width} height={height} xmlns="http://www.w3.org/2000/svg" aria-label="nagad">
    <rect width="60" height="34" rx="7.5" fill="#F6921E" />
    <text x="30" y="23" textAnchor="middle" fontFamily="'Arial Black','Segoe UI',Arial,sans-serif" fontWeight="900" fontSize="15" fill="#ffffff" letterSpacing="-0.3">nagad</text>
    <path d="M12 10.5 48 23.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
  </svg>
);

// Brand logo renderer for each Bangladesh payment method (crisp HTML/CSS marks)
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

  switch (method) {
    case 'bKash':
      return <div style={{ ...base, background: '#e2136e', overflow: 'hidden' }}><BkashLogo width={size} height={size} /></div>;
    case 'Nagad':
      return <div style={{ ...base, background: '#f26522', overflow: 'hidden' }}><NagadLogo width={size} height={size} /></div>;
    case 'Rocket':
      return (
        <div style={{ ...base, background: 'linear-gradient(135deg, #7b1fa2, #ab47bc)' }}>
          <span style={{ position: 'absolute', width: size * 0.5, height: size * 0.5, border: `2px solid #fff`, borderRightColor: 'transparent', borderBottomColor: 'transparent', borderRadius: '50%', transform: 'rotate(-45deg)' }} />
          <span style={{ position: 'absolute', width: size * 0.16, height: size * 0.16, background: '#fff', borderRadius: '50%' }} />
        </div>
      );
    case 'Upay':
      return <div style={{ ...base, background: '#ee1c25' }}><span style={text('#fff', 'uPay', 0.32)}>uPay</span></div>;
    case 'SureCash':
      return <div style={{ ...base, background: '#f7941d' }}><span style={text('#fff', 'S', 0.5)}>S</span></div>;
    case 'Tap':
      return <div style={{ ...base, background: '#7c3aed' }}><span style={text('#fff', 'tap', 0.34, true)}>tap</span></div>;
    case 'mCash':
      return <div style={{ ...base, background: '#d71920' }}><span style={text('#fff', 'mCash', 0.3)}>mCash</span></div>;
    case 'OK Wallet':
      return <div style={{ ...base, background: '#00a651' }}><span style={text('#fff', 'OK', 0.36)}>OK</span></div>;
    case 'MY Cash':
      return <div style={{ ...base, background: '#f58220' }}><span style={text('#fff', 'MY', 0.36)}>MY</span></div>;
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
  showToast
}: OrdersViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Processing' | 'Completed' | 'Cancelled'>('All');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'bKash' | 'Nagad' | 'Cash on Delivery' | 'Card' | 'Wallet'>('All');
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
                onClick={() => onUpdateOrder({ ...order, paymentStatus: 'Approved', status: 'Confirmed' })}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded text-[9px] font-bold cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-3 h-3" /><span>Verify & Approve</span>
              </button>
              <button
                onClick={() => onUpdateOrder({ ...order, paymentStatus: 'Rejected', status: 'Cancelled', paymentNote: 'Payment rejected by admin' })}
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
            <button onClick={() => showToast && showToast('Filters: status, search, priority are applied live above', 'info')} className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-dark hover:bg-brand-dark/80 text-gray-300 hover:text-white border border-brand-border rounded-lg text-xs font-bold transition-all cursor-pointer">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Payment method & payment status filters */}
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center border-t border-brand-border/60 pt-3 mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Payment:</span>
            {(['All', 'bKash', 'Nagad', 'Cash on Delivery', 'Card', 'Wallet'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setPaymentFilter(m); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                  paymentFilter === m
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
                onClick={() => { setPayStatusFilter(s); setCurrentPage(1); }}
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
                      : `Cancelled by Admin · ${cancelParty} ${cancelAdjust} Tk ${cancelAmount}${cancelReason ? ' — ' + cancelReason : ''}`;
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

    </div>
  );
}

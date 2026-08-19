/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Admin Site — fresh store-management portal: dashboard, orders, order
 * tools (top-ups/wallet/refunds), staff, payments and support. Reads the same
 * localStorage keys as the admin panel.
 */
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardList, Wrench, UserSquare2, CreditCard, LifeBuoy, CheckCircle2, TrendingUp, UserPlus, Phone, Box, Ticket, Package, Plus, Search, Bell, Clock, FileText, Lock, LogIn, ShieldCheck, Store, Copy, FolderOpen, Star, Trash2, Send, Paperclip, History, ShoppingCart } from 'lucide-react';
import PortalShell from './PortalShell';
import PosSystem from '../components/PosSystem';
import { useOrders, usePayments, useTickets, useWalletBal, useWalletTxns, useProducts, useCategories, useCoupons, useReviews, useNotifications, useDrivers, useStores, useBranches, useStoreAdminApps, useStoreAdminCreds, bdt, statusBadge, appendTimeline, makeNotif, useCloudSync, lsGet, lsSet, secureFileUpload, securityApi, securityAudit, identityCheck, identityClaim, persistOrderToCloud } from './portalUtils';
import { newOfferRound } from '../utils/autoAssign';

interface Staff {
  id: string; name: string; role: string; shift: string; status: string; phone: string;
}

const storeDocMeta = [
  { key: 'tradeLicense', label: 'Trade License', required: true },
  { key: 'binTin', label: 'BIN/TIN Certificate', required: true },
  { key: 'ownerNid', label: 'Owner NID Front & Back', required: true },
  { key: 'storePhoto', label: 'Store Front Photo', required: true },
  { key: 'bankMfs', label: 'Bank/MFS Settlement Proof', required: true },
  { key: 'foodSafety', label: 'BSTI/Food Safety Certificate (if food)', required: false },
];

const DEFAULT_STORE_ADMIN_PAGES = ['dashboard', 'orders', 'branches', 'products', 'categories', 'inventory', 'pos', 'reviews', 'coupons', 'tools', 'staff', 'payments', 'alerts', 'support'];

const makeStoreId = () => `STR-${String(Date.now()).slice(-7)}`;
const makeStoreAdminId = () => `SA-${String(Date.now()).slice(-8)}`;
const fingerprintOf = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return `DOC-${Math.abs(hash).toString(36)}-${value.length}`;
};

export default function StoreAdminPortal() {
  useCloudSync();
  const [orders, setOrders] = useOrders();
  const [drivers, setDrivers] = useDrivers();
  const [payments, setPayments] = usePayments();
  const [tickets, setTickets] = useTickets();
  const [walletBal, setWalletBal] = useWalletBal();
  const [txns, setTxns] = useWalletTxns();
  const [products, setProducts] = useProducts();
  const [categories, setCategories] = useCategories();
  const [allCoupons, setAllCoupons] = useCoupons();
  const [reviews, setReviews] = useReviews();
  const [notifications, setNotifications] = useNotifications();
  const [stores, setStores] = useStores();
  const [branches] = useBranches();
  const [storeAdminApps, setStoreAdminApps] = useStoreAdminApps();
  const [storeAdminCreds] = useStoreAdminCreds();
  const [tab, setTab] = useState('dashboard');
  const [authView, setAuthView] = useState<'login' | 'signup' | 'track'>('login');
  const [sessionAdminId, setSessionAdminId] = useState(() => localStorage.getItem('sd_store_admin_session') || '');
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [trackId, setTrackId] = useState('');
  const [signup, setSignup] = useState({ ownerName: '', phone: '', email: '', storeName: '', storeAddress: '', businessType: 'Grocery / Super Shop', tradeLicenseNo: '', tinBin: '', settlementNumber: '', password: '', confirmPassword: '' });
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, any>>({});
  const [signupReview, setSignupReview] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState('');
  const branchSession = branches.find((b: any) => b.branchAdminId === sessionAdminId && b.status === 'Active');
  const activeApplication = storeAdminApps.find((a: any) => ((a.adminId === sessionAdminId) || (branchSession && a.storeId === branchSession.storeId)) && a.status === 'Verified');
  const activeStoreId = branchSession?.storeId || activeApplication?.storeId || '';
  // Store activity log (Phase 4): every staff/order/security action for this
  // store is fetched from the server audit trail (store-scoped server-side).
  const [storeAudit, setStoreAudit] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  useEffect(() => {
    if (!activeStoreId) { setStoreAudit([]); return; }
    let cancelled = false;
    setAuditLoading(true);
    securityApi(`/audit?storeId=${encodeURIComponent(activeStoreId)}&limit=200`).then((d) => {
      if (!cancelled) setStoreAudit(Array.isArray(d.audit) ? d.audit : []);
    }).catch(() => { if (!cancelled) setStoreAudit([]); }).finally(() => { if (!cancelled) setAuditLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreId]);
  const activeStore = stores.find((s: any) => s.id === activeStoreId);
  const deliveryProviderMode = activeStore?.deliveryProviderMode || 'platform';
  const usesPersonalDriver = deliveryProviderMode === 'personal';
  const storeAccessBlocked = ['Suspended', 'Blacklisted'].includes(activeStore?.status || '') || ['suspend', 'blacklist'].includes(activeStore?.adminRiskStatus || '');
  const activeStoreName = activeApplication?.storeName || 'Approved Store';
  const myBranches = branches.filter((b: any) => b.storeId === activeStoreId);
  const queryBranchId = new URLSearchParams(window.location.search).get('branch') || '';
  const activeBranchId = branchSession?.id || queryBranchId || localStorage.getItem(`sd_active_branch_${activeStoreId}`) || myBranches[0]?.id || '';
  const activeBranch = myBranches.find((b: any) => b.id === activeBranchId);
  const isMyStoreRecord = (record: any) => {
    if (!activeStoreId) return false;
    if (activeBranchId && record.branchId && record.branchId !== activeBranchId) return false;
    return record.storeId === activeStoreId || record.storeName === activeStoreName;
  };
  const myOrders = orders.filter(o => activeBranchId ? (o as any).branchId === activeBranchId : isMyStoreRecord(o));
  const myOrderIds = new Set(myOrders.map(o => o.id));
  const myProducts = products.filter((p: any) => p.storeId === activeStoreId && (!activeBranchId || p.branchId === activeBranchId));
  const myPayments = payments.filter(p => myOrderIds.has(p.orderId));
  const myCategories = categories.filter((c: any) => c.storeId === activeStoreId && (!activeBranchId || !c.branchId || c.branchId === activeBranchId));
  const coupons = allCoupons.filter((c: any) => c.storeId === activeStoreId && (!activeBranchId || !c.branchId || c.branchId === activeBranchId));
  const myReviews = reviews.filter((r: any) => r.storeId === activeStoreId || r.storeName === activeStoreName || myProducts.some((p: any) => p.id === r.productId));
  const [search, setSearch] = useState('');
  const [newProd, setNewProd] = useState({ name: '', price: '', stock: '', category: '' });
  const [newCategory, setNewCategory] = useState('');
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: '', minOrder: '' });
  const [reviewReplies, setReviewReplies] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<Staff[]>([]);
  const [stf, setStf] = useState({ name: '', role: '', phone: '' });
  const [supportDraft, setSupportDraft] = useState({ subject: '', message: '', priority: 'Medium' });
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [ticketLinks, setTicketLinks] = useState<Record<string, string>>({});
  const [ticketFiles, setTicketFiles] = useState<Record<string, { name: string; type: string; dataUrl: string }>>({});

  const myTxns = txns.filter(t => t.storeId === activeStoreId || myOrderIds.has(t.orderId));
  const pending = myTxns.filter(t => t.status === 'Pending');
  const refunds = JSON.parse(localStorage.getItem('ss_refunds') || '[]');
  const myRefunds = refunds.filter((r: any) => r.storeId === activeStoreId || myOrderIds.has(r.orderId));
  const myTickets = tickets.filter((t: any) => t.storeId === activeStoreId || t.storeName === activeStoreName || myOrderIds.has(t.orderId));
  const myWalletBal = myTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  useEffect(() => {
    if (!activeStoreId) return;
    setStaff(JSON.parse(localStorage.getItem(`sd_store_staff_${activeStoreId}`) || '[]'));
    setReviewReplies(JSON.parse(localStorage.getItem(`sd_review_replies_${activeStoreId}`) || '{}'));
  }, [activeStoreId]);

  useEffect(() => { if (activeStoreId) lsSet(`sd_store_staff_${activeStoreId}`, staff); }, [activeStoreId, staff]);
  useEffect(() => { if (activeStoreId) lsSet(`sd_review_replies_${activeStoreId}`, reviewReplies); }, [activeStoreId, reviewReplies]);

  const revenue = myOrders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);
  const lowStock = myProducts.filter(p => p.stock > 0 && p.stock <= 10);
  const outStock = myProducts.filter(p => p.stock <= 0);

  const syncPosProducts = (nextStoreProducts: any[]) => {
    const nextById = new Map(nextStoreProducts.map((p: any) => [p.id, { ...p, storeId: p.storeId || activeStoreId, branchId: p.branchId || activeBranchId, storeName: activeStoreName }]));
    setProducts(products.map((p: any) => nextById.get(p.id) || p));
  };

  const createPosOrder = (order: any) => {
    const next = appendTimeline({
      ...order,
      storeId: activeStoreId,
      branchId: activeBranchId,
      storeName: activeStoreName,
      pickupLocation: activeBranch?.name || activeStoreName,
      date: order.date || new Date().toLocaleDateString(),
      time: order.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }, 'created', 'admin', 'Created from Store Admin POS');
    setOrders([next, ...orders]);
    persistOrderToCloud(next);
    setPayments([{
      id: `PAY-${Date.now().toString().slice(-10)}`,
      orderId: next.id,
      amount: next.amount || 0,
      method: next.paymentMethod || 'CASH',
      status: next.status === 'Completed' ? 'Paid' : 'Pending',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    }, ...payments]);
    setNotifications([
      makeNotif('POS order saved', `Store Admin POS saved order #${next.id}.`, 'order', { audience: 'store', storeId: activeStoreId }),
      ...notifications,
    ]);
  };

  const updatePosOrder = (order: any) => {
    const next = appendTimeline({ ...order, storeId: activeStoreId, branchId: activeBranchId, storeName: activeStoreName }, 'updated', 'admin', 'Updated from Store Admin POS');
    setOrders(orders.map(o => o.id === next.id ? next : o));
    persistOrderToCloud(next);
    setPayments(payments.map(p => p.orderId === next.id ? { ...p, amount: next.amount || p.amount, method: next.paymentMethod || p.method, status: next.status === 'Completed' ? 'Paid' : next.status === 'Cancelled' ? 'Failed' : p.status } : p));
  };

  const posSaleRecorded = (items: { productId: string; name: string; qty: number; price: number }[], source: 'counter' | 'delivery') => {
    if (!items.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ledger = lsGet<any[]>('sd_stock_ledger', []);
    const entries = items.map(it => ({
      id: `LED-${Date.now()}-${it.productId}`,
      productId: it.productId,
      productName: it.name,
      storeId: activeStoreId,
      branchId: activeBranchId,
      storeName: activeStoreName,
      type: 'Sale',
      qty: -Math.abs(it.qty),
      reason: source === 'delivery' ? 'Store Admin POS delivery dispatch' : 'Store Admin POS counter sale',
      by: sessionAdminId || 'Store Admin POS',
      date: today,
      time,
    }));
    lsSet('sd_stock_ledger', [...entries, ...ledger]);
    setNotifications([
      makeNotif('POS stock updated', `${items.length} POS item(s) deducted from ${activeBranch?.name || activeStoreName}.`, 'system', { audience: 'store-admin', storeId: activeStoreId }),
      ...notifications,
    ]);
  };

  const myNotifs = notifications.filter(n => n.audience === 'all' || n.storeId === activeStoreId || (!n.storeId && (n.audience === 'store' || n.audience === 'store-admin')));
  const unreadCount = myNotifs.filter(n => !n.read).length;

  const allowedPages = new Set<string>((activeStore?.adminPages && activeStore.adminPages.length ? activeStore.adminPages : DEFAULT_STORE_ADMIN_PAGES));
  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ClipboardList, badge: myOrders.filter(o => o.status === 'Pending').length },
    { id: 'branches', label: 'Branches', icon: Store, badge: myBranches.length },
    { id: 'products', label: 'Products', icon: Box, badge: outStock.length },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStock.length },
    { id: 'pos', label: 'POS', icon: ShoppingCart },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'tools', label: 'Order Tools', icon: Wrench, badge: pending.length },
    { id: 'staff', label: 'Staff', icon: UserSquare2 },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadCount },
    { id: 'support', label: 'Support', icon: LifeBuoy, badge: myTickets.filter(t => t.status === 'Open').length },
  ].filter(item => allowedPages.has(item.id));

  useEffect(() => {
    if (activeApplication && nav.length > 0 && !allowedPages.has(tab)) setTab(nav[0].id);
  }, [activeApplication, allowedPages, nav, tab]);

  const goBack = () => { window.open(`${window.location.origin}/roles.html`, '_self'); };

  const handleDocUpload = (key: string, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const stored = await secureFileUpload({ name: file.name, type: file.type, dataUrl }, { role: 'store-admin-signup', owner: signup.email || signup.phone || signup.ownerName, storeId: signup.storeName });
      setUploadedDocs(prev => ({ ...prev, [key]: stored }));
    };
    reader.readAsDataURL(file);
  };

  const submitSignup = async () => {
    const missing = storeDocMeta.find(d => d.required && !uploadedDocs[d.key]);
    if (!signup.ownerName || !signup.phone || !signup.email || !signup.storeName || !signup.storeAddress || !signup.tradeLicenseNo || !signup.tinBin) return;
    if (otpStep !== 'verified') return;
    if (!signup.password || signup.password.length < 8) return;
    if (signup.password !== signup.confirmPassword) return;
    if (missing) return;
    const idConflict = await identityCheck({ phone: signup.phone, email: signup.email });
    if (idConflict.taken) {
      const c = idConflict.conflict;
      setOtpError(`This phone or Gmail already belongs to ${c?.name || c?.identityId || 'an existing account'} (${c?.role || 'account'}). One account per phone/Gmail.`);
      setSignupReview(false);
      return;
    }
    if (!signupReview) { setSignupReview(true); return; }
    const docData = (key: string) => typeof uploadedDocs[key] === 'string' ? uploadedDocs[key] : uploadedDocs[key]?.dataUrl || '';
    const usedFingerprints = new Set(storeAdminApps.flatMap((app: any) => (app.documents || []).map((d: any) => d.fingerprint).filter(Boolean)));
    const duplicate = storeDocMeta.find(d => docData(d.key) && usedFingerprints.has(fingerprintOf(docData(d.key))));
    if (duplicate) return;
    const storeId = makeStoreId();
    const adminId = makeStoreAdminId();
    const app = {
      id: `SAPP-${Date.now()}`,
      adminId,
      storeId,
      status: 'Pending Audit',
      submittedAt: new Date().toLocaleString('en-GB'),
      emailVerified: true,
      verifiedEmail: signup.email,
      password: signup.password,
      ...signup,
      documents: storeDocMeta.map(d => ({
        key: d.key,
        type: d.label,
        required: d.required,
        status: docData(d.key) ? 'Pending' : 'Not Submitted',
        dataUrl: docData(d.key),
        secureFile: uploadedDocs[d.key]?.secureFile || null,
        privateUrl: uploadedDocs[d.key]?.privateUrl || '',
        fingerprint: docData(d.key) ? fingerprintOf(docData(d.key)) : '',
      })),
    };
    delete (app as any).confirmPassword;
    setStoreAdminApps(prev => [app, ...prev]);
    securityAudit('store-admin-signup-submitted', { actor: adminId, storeId, reason: 'new store admin application (email verified, password set by owner)' });
    identityClaim({ role: 'store-admin', identityId: adminId, name: signup.ownerName, phone: signup.phone, email: signup.email }).catch(() => {});
    setSubmittedAppId(adminId);
    setTrackId(adminId);
    setAuthView('track');
    setSignup({ ownerName: '', phone: '', email: '', storeName: '', storeAddress: '', businessType: 'Grocery / Super Shop', tradeLicenseNo: '', tinBin: '', settlementNumber: '', password: '', confirmPassword: '' });
    setEmailVerified(false);
    setOtpStep('idle');
    setOtpCode('');
    setOtpError('');
    setUploadedDocs({});
    setSignupReview(false);
  };

  const login = () => {
    const id = loginId.trim();
    const cred = storeAdminCreds[id];
    const app = storeAdminApps.find((a: any) => a.adminId === id && a.status === 'Verified');
    const branch = branches.find((b: any) => b.branchAdminId === id && b.branchPassword === loginPassword && b.status === 'Active');
    const loginStore = stores.find((s: any) => s.id === (app?.storeId || branch?.storeId));
    if (['Suspended', 'Blacklisted'].includes(loginStore?.status || '') || ['suspend', 'blacklist'].includes(loginStore?.adminRiskStatus || '')) return;
    const ownerPassword = (app && app.password) || (cred && cred.password);
    if ((!ownerPassword || ownerPassword !== loginPassword) && !branch) return;
    securityApi('/login', { userId: id, password: loginPassword }).then((data) => {
      if (data.token) localStorage.setItem('sd_security_session', data.token);
    }).catch(() => {});
    localStorage.setItem('sd_store_admin_session', id);
    setSessionAdminId(id);
    setTab('dashboard');
  };

  const logout = () => {
    localStorage.removeItem('sd_store_admin_session');
    setSessionAdminId('');
    setLoginPassword('');
    setAuthView('login');
  };

  const sendSignupOtp = () => {
    const email = signup.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setOtpError('Enter a valid email address first.'); return; }
    setOtpBusy(true);
    setOtpError('');
    securityApi('/otp-signup-send', { email }).then(() => {
      setOtpStep('sent');
      setOtpError('');
    }).catch((err) => {
      setOtpError(String(err?.message || 'Could not send the code. Try again.'));
    }).finally(() => setOtpBusy(false));
  };

  const verifySignupOtp = () => {
    const email = signup.email.trim().toLowerCase();
    if (!otpCode.trim()) { setOtpError('Enter the 6-digit code from your email.'); return; }
    setOtpBusy(true);
    setOtpError('');
    securityApi('/otp-signup-verify', { email, code: otpCode }).then(() => {
      setOtpStep('verified');
      setEmailVerified(true);
      setOtpError('');
    }).catch((err) => {
      setOtpError(String(err?.message || 'That code is invalid or expired.'));
    }).finally(() => setOtpBusy(false));
  };

  const updateStatus = (id: string, status: string) => {
    if (!myOrderIds.has(id)) return;
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: status as any } : o)));
  };

  // Store admin accepts a pending customer order → dispatch to the first available driver
  const acceptOrder = (id: string) => {
    if (!myOrderIds.has(id)) return;
    const onlineDrivers = drivers.filter(d => d.status !== 'Offline');
    if (!usesPersonalDriver && onlineDrivers.length === 0) {
      setNotifications(prev => [
        makeNotif('Driver unavailable', `Order #${id} cannot be dispatched until a real driver is online.`, 'order', { audience: 'store-admin', storeId: activeStoreId }),
        ...prev,
      ]);
      return;
    }
    const order = orders.find(o => o.id === id);
    const broadcast = order && !usesPersonalDriver ? newOfferRound(order, drivers) : {};
    const updated = order ? appendTimeline({
      ...order,
      status: 'Confirmed' as any,
      driverId: undefined,
      ...(usesPersonalDriver ? { offeredDriverIds: undefined, offerRound: undefined, driverDeadline: undefined } : broadcast),
      deliveryProvider: usesPersonalDriver ? 'personal' : deliveryProviderMode,
      requiresStorePersonalDriver: usesPersonalDriver,
      personalDriverInfo: usesPersonalDriver ? activeStore?.personalDriverInfo : undefined,
      storePersonalDriverNote: usesPersonalDriver
        ? `Store will deliver with its own personal driver${activeStore?.personalDriverInfo?.name ? `: ${activeStore.personalDriverInfo.name}` : ''}${activeStore?.personalDriverInfo?.phone ? ` (${activeStore.personalDriverInfo.phone})` : ''}. NexaGo driver broadcast disabled by Super Admin setting.`
        : undefined,
      placedAt: order.placedAt || Date.now(),
    }, 'accepted', 'store', usesPersonalDriver ? 'Store admin accepted — delivery will be handled by store personal driver' : `Store admin accepted — offered to ${(broadcast.offeredDriverIds || []).length} riders`) : null;
    if (!updated) return;
    setOrders(prev => prev.map(o => (o.id === id ? updated : o)));
    persistOrderToCloud(updated);
    if (usesPersonalDriver) {
      setNotifications(prev => [
        makeNotif('Store personal delivery #' + id, `Store accepted order #${id}. Delivery will be completed by the store's own driver.`, 'order', { audience: 'all', storeId: activeStoreId }),
        ...prev,
      ]);
      return;
    }
    setNotifications(prev => [
      makeNotif('🚚 Order Accepted & Dispatched', `Store accepted order #${id} — broadcast to ${(broadcast.offeredDriverIds || []).length} nearby riders.`, 'order', { audience: 'driver' }),
      makeNotif('🚚 Store Accepted #' + id, `Order #${id} accepted — dispatched to ${(broadcast.offeredDriverIds || []).length} nearby riders.`, 'order', { audience: 'all' }),
      ...prev,
    ]);
  };

  const approveTopUp = (tx: any, ok: boolean) => {
    if (!myTxns.some(t => t.id === tx.id)) return;
    const next = txns.map(t => (t.id === tx.id ? { ...t, status: ok ? 'Completed' : 'Rejected' } : t));
    setTxns(next);
    if (ok) setWalletBal(walletBal + tx.amount);
  };

  const addStaff = () => {
    if (!stf.name || !stf.role) return;
    setStaff(prev => [...prev, { id: `STF-0${prev.length + 1}`, name: stf.name, role: stf.role, shift: 'Day Shift', status: 'Active', phone: stf.phone || '—' }]);
    setStf({ name: '', role: '', phone: '' });
  };

  const replyTicket = (id: string, ok: boolean) => {
    if (!myTickets.some(t => t.id === id)) return;
    setTickets(prev => prev.map(t => (t.id === id ? { ...t, status: ok ? 'Closed' : 'In Progress' } : t)));
  };

  const createSupportTicket = () => {
    if (!supportDraft.subject.trim() || !supportDraft.message.trim() || !activeStoreId) return;
    const ticket: any = {
      id: `STK-${Date.now().toString().slice(-7)}`,
      user: activeStoreName,
      subject: supportDraft.subject.trim(),
      priority: supportDraft.priority,
      status: 'Open',
      date: new Date().toLocaleString('en-GB'),
      storeId: activeStoreId,
      branchId: activeBranchId,
      storeName: activeStoreName,
      requesterRole: 'store-admin',
      requestStatus: 'Store Admin Submitted',
      messages: [{ sender: 'user', text: supportDraft.message.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
      auditLog: [{ actor: sessionAdminId, action: 'ticket-created', time: new Date().toISOString(), note: supportDraft.message.trim() }],
    };
    setTickets(prev => [ticket, ...prev]);
    setSupportDraft({ subject: '', message: '', priority: 'Medium' });
  };

  const decideAdminRequest = (ticket: any, approve: boolean) => {
    if (!myTickets.some(t => t.id === ticket.id)) return;
    setTickets(prev => prev.map((t: any) => t.id === ticket.id ? {
      ...t,
      status: approve ? 'In Progress' : 'Resolved',
      requestStatus: approve ? 'Store Admin Approved Admin Fix' : 'Store Admin Rejected Admin Fix',
      messages: [...(t.messages || []), { sender: 'user', text: approve ? 'Store Admin approved the Super Admin fix request after reading the terms.' : 'Store Admin rejected the Super Admin fix request.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
      auditLog: [...(t.auditLog || []), { actor: sessionAdminId, action: approve ? 'approved-admin-fix' : 'rejected-admin-fix', time: new Date().toISOString(), note: t.terms || '' }],
    } : t));
  };

  const uploadTicketFile = (ticketId: string, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const stored = await secureFileUpload({ name: file.name, type: file.type, dataUrl }, { role: 'store-admin-support', actor: sessionAdminId, storeId: activeStoreId, branchId: activeBranchId });
      setTicketFiles(prev => ({ ...prev, [ticketId]: { name: file.name, type: file.type, dataUrl, secureFile: (stored as any).secureFile, privateUrl: (stored as any).privateUrl } as any }));
    };
    reader.readAsDataURL(file);
  };

  const sendTicketMessage = (ticket: any) => {
    if (!myTickets.some(t => t.id === ticket.id) || ticket.status === 'Resolved' || ticket.status === 'Closed') return;
    const text = (ticketReplies[ticket.id] || '').trim();
    const link = (ticketLinks[ticket.id] || '').trim();
    const file = ticketFiles[ticket.id];
    if (!text && !link && !file) return;
    setTickets(prev => prev.map((t: any) => t.id === ticket.id ? {
      ...t,
      status: t.status === 'Open' ? 'In Progress' : t.status,
      messages: [...(t.messages || []), {
        sender: 'user',
        text: text || (file ? `Attached ${file.name}` : link),
        linkUrl: link,
        attachmentName: file?.name || '',
        attachmentType: file?.type || '',
        attachmentUrl: file?.dataUrl || '',
        secureFile: file?.secureFile || null,
        privateUrl: file?.privateUrl || '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }],
      auditLog: [...(t.auditLog || []), { actor: sessionAdminId, action: 'store-admin-message', time: new Date().toISOString(), note: text || link || file?.name || '' }],
    } : t));
    securityAudit('store-admin-support-message', { actor: sessionAdminId, storeId: activeStoreId, branchId: activeBranchId, reason: ticket.id });
    setTicketReplies(prev => ({ ...prev, [ticket.id]: '' }));
    setTicketLinks(prev => ({ ...prev, [ticket.id]: '' }));
    setTicketFiles(prev => {
      const next = { ...prev };
      delete next[ticket.id];
      return next;
    });
  };

  const addProduct = () => {
    if (!newProd.name || !newProd.price) return;
    const p = {
      id: `PROD-${Date.now().toString().slice(-4)}`,
      name: newProd.name,
      category: newProd.category || myCategories[0]?.name || 'General',
      price: Number(newProd.price) || 0,
      stock: Number(newProd.stock) || 0,
      status: Number(newProd.stock) <= 0 ? 'Out of Stock' : Number(newProd.stock) <= 10 ? 'Low Stock' : 'In Stock',
      image: '',
      storeId: activeStoreId,
      branchId: activeBranchId,
      branchName: activeBranch?.name || '',
    };
    setProducts(prev => [p, ...prev]);
    setNewProd({ name: '', price: '', stock: '', category: '' });
  };

  const addCategory = () => {
    if (!newCategory.trim() || !activeStoreId) return;
    setCategories(prev => [{ id: `CAT-${Date.now().toString().slice(-5)}`, name: newCategory.trim(), itemsCount: 0, status: 'Active', storeId: activeStoreId, storeName: activeStoreName, branchId: activeBranchId, branchName: activeBranch?.name || '' }, ...prev]);
    setNewCategory('');
  };

  const addCoupon = () => {
    if (!newCoupon.code.trim() || !newCoupon.discount.trim() || !activeStoreId) return;
    setAllCoupons(prev => [{ id: `CPN-${Date.now().toString().slice(-5)}`, code: newCoupon.code.trim().toUpperCase(), discount: newCoupon.discount.trim(), minOrder: Number(newCoupon.minOrder) || 0, usages: 0, status: 'Active', storeId: activeStoreId, storeName: activeStoreName, branchId: activeBranchId, branchName: activeBranch?.name || '' }, ...prev]);
    setNewCoupon({ code: '', discount: '', minOrder: '' });
  };

  const deleteCoupon = (id: string) => setAllCoupons(prev => prev.filter((c: any) => c.id !== id));
  const toggleCoupon = (id: string) => setAllCoupons(prev => prev.map((c: any) => c.id === id ? { ...c, status: c.status === 'Active' ? 'Paused' : 'Active' } : c));

  const setStock = (id: string, delta: number) => {
    if (!myProducts.some(p => p.id === id)) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const stock = Math.max(0, (p.stock || 0) + delta);
      return { ...p, stock, status: stock <= 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'In Stock' };
    }));
  };

  const filtered = myProducts.filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  if (!activeApplication || storeAccessBlocked) {
    const tracked = storeAdminApps.find((a: any) => a.adminId === trackId.trim() || a.adminId === submittedAppId);
    const approvedCred = tracked ? storeAdminCreds[tracked.adminId] : null;
    return (
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-[#060d17] via-[#0a1322] to-[#0a1322] p-3 text-gray-100 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-2xl border border-[#1e3050] bg-[#101d30] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange">NexaGo Store Admin</p>
                <h1 className="mt-1 text-xl font-black text-white">Real Store Admin Account</h1>
                <p className="mt-1 text-[11px] text-gray-400">Only real data. Submit Bangladesh business documents, track approval, then login with permanent ID.</p>
              </div>
              <div className="flex rounded-xl border border-[#1e3050] bg-[#0a1322] p-1">
                {(['login', 'signup', 'track'] as const).map(v => (
                  <button key={v} onClick={() => setAuthView(v)} className={`px-3 py-2 text-[10px] font-black uppercase ${authView === v ? 'rounded-lg bg-brand-orange text-white' : 'text-gray-400'}`}>{v}</button>
                ))}
              </div>
            </div>
          </div>

          {authView === 'login' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
                <h2 className="flex items-center gap-2 text-sm font-black text-white"><LogIn className="h-4 w-4 text-brand-orange" /> Login</h2>
                <div className="mt-4 space-y-3">
                  <input value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="Permanent Store Admin ID (SA-...)" className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
                  <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password from approval tracking page" type="password" className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
                  <button onClick={login} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-[10px] font-black uppercase text-white"><Lock className="h-3.5 w-3.5" /> Login to Store Admin</button>
                </div>
              </div>
              <div className="rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
                <h2 className="flex items-center gap-2 text-sm font-black text-white"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Approval Required</h2>
                <p className="mt-3 text-[11px] leading-relaxed text-gray-400">Store Admin account opens only after Super Admin verifies documents. Each approved account gets one permanent Store ID and one permanent Store Admin ID. Data is separated by Store ID.</p>
              </div>
            </div>
          )}

          {authView === 'signup' && (
            <div className="rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
              <h2 className="flex items-center gap-2 text-sm font-black text-white"><Store className="h-4 w-4 text-brand-orange" /> Store Admin Signup</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['ownerName', 'Owner full name'], ['phone', 'Mobile number'], ['email', 'Email address'], ['storeName', 'Store / business name'], ['storeAddress', 'Store full address'], ['tradeLicenseNo', 'Trade license number'], ['tinBin', 'TIN/BIN number'], ['settlementNumber', 'Bank/MFS settlement number'],
                ].map(([key, label]) => (
                  <input key={key} value={(signup as any)[key]} onChange={e => setSignup(prev => ({ ...prev, [key]: e.target.value }))} placeholder={label} className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
                ))}
                <input value={signup.password} onChange={e => setSignup(prev => ({ ...prev, password: e.target.value }))} placeholder="Choose a login password (min 8 chars)" type="password" className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
                <input value={signup.confirmPassword} onChange={e => setSignup(prev => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Confirm password" type="password" className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
                <select value={signup.businessType} onChange={e => setSignup(prev => ({ ...prev, businessType: e.target.value }))} className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange">
                  <option>Grocery / Super Shop</option>
                  <option>Restaurant / Food</option>
                  <option>Pharmacy</option>
                  <option>Electronics / Retail</option>
                </select>
              </div>
              <div className="mt-4 rounded-2xl border border-[#1e3050] bg-[#0a1322] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-[11px] font-black uppercase text-white"><ShieldCheck className="h-3.5 w-3.5 text-brand-orange" /> Verify Owner Gmail with OTP</p>
                    <p className="mt-1 text-[9px] text-gray-500">We email a 6-digit code to the address above. Signup stays locked until this is verified.</p>
                  </div>
                  <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase ${otpStep === 'verified' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : otpStep === 'sent' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-[#1e3050] bg-[#101d30] text-gray-400'}`}>
                    {otpStep === 'verified' ? 'Verified' : otpStep === 'sent' ? 'Code Sent' : 'Not Verified'}
                  </span>
                </div>
                {otpStep !== 'verified' && (
                  <div className="mt-3 space-y-2.5">
                    <button onClick={sendSignupOtp} disabled={otpBusy} className="w-full rounded-xl border border-[#1e3050] bg-[#101d30] px-4 py-2 text-[10px] font-black uppercase text-gray-200 hover:border-brand-orange disabled:opacity-60">
                      {otpBusy ? 'Sending…' : otpStep === 'sent' ? 'Resend code' : 'Send verification code'}
                    </button>
                    {otpStep === 'sent' && (
                      <div className="flex gap-2">
                        <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" className="min-w-0 flex-1 rounded-xl border border-[#1e3050] bg-[#101d30] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
                        <button onClick={verifySignupOtp} disabled={otpBusy} className="rounded-xl bg-brand-orange px-4 py-2 text-[10px] font-black uppercase text-white disabled:opacity-60">
                          {otpBusy ? '…' : 'Verify'}
                        </button>
                      </div>
                    )}
                    {otpError && <p className="text-[10px] font-bold text-red-400">{otpError}</p>}
                  </div>
                )}
                {otpStep === 'verified' && (
                  <p className="mt-3 text-[10px] font-black text-emerald-400">Email verified — you can now submit the application with your chosen password.</p>
                )}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {storeDocMeta.map(d => (
                  <label key={d.key} className="rounded-2xl border border-[#1e3050] bg-[#0a1322] p-3">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase text-white"><FileText className="h-3.5 w-3.5 text-brand-orange" /> {d.label}</span>
                    <span className="mt-1 block text-[8px] text-gray-500">{d.required ? 'Required' : 'Optional'}</span>
                    <input type="file" onChange={e => handleDocUpload(d.key, e.target.files?.[0])} className="mt-3 w-full text-[9px] text-gray-400" />
                    {uploadedDocs[d.key] && <span className="mt-2 block text-[9px] font-bold text-emerald-400">Submitted</span>}
                  </label>
                ))}
              </div>
              {signupReview && (
                <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-50">
                  <p className="text-[10px] font-black uppercase text-amber-300">Confirm Before Submit</p>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    {Object.entries(signup).filter(([k]) => k !== 'password' && k !== 'confirmPassword').map(([k, v]) => <p key={k}><b>{k}:</b> {v || '-'}</p>)}
                    <p><b>password:</b> {signup.password ? '••••••••' : '-'}</p>
                    <p><b>emailVerified:</b> {emailVerified ? 'Yes' : 'No'}</p>
                    {storeDocMeta.map(d => <p key={d.key}><b>{d.label}:</b> {uploadedDocs[d.key] ? 'Attached' : 'Not submitted'}</p>)}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed">Notice: Submit only true owner, store and document information. False, edited, borrowed or reused documents can permanently reject or block the Store Admin account. After final submit, Super Admin will verify every document.</p>
                </div>
              )}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                {signupReview && <button onClick={() => setSignupReview(false)} className="rounded-xl border border-[#1e3050] bg-[#0a1322] px-4 py-3 text-[10px] font-black uppercase text-gray-300 sm:w-40">Edit Again</button>}
                <button onClick={submitSignup} className="w-full rounded-xl bg-brand-orange px-4 py-3 text-[10px] font-black uppercase text-white">{signupReview ? 'Final Submit for Verification' : 'Review & Confirm'}</button>
              </div>
            </div>
          )}

          {authView === 'track' && (
            <div className="rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
              <h2 className="flex items-center gap-2 text-sm font-black text-white"><Search className="h-4 w-4 text-brand-orange" /> Track Application</h2>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input value={trackId} onChange={e => setTrackId(e.target.value)} placeholder="Enter Store Admin ID (SA-...)" className="min-w-0 flex-1 rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
                <button className="rounded-xl bg-[#132238] px-4 py-2 text-[10px] font-black uppercase text-gray-200">Check</button>
              </div>
              {tracked && (
                <div className="mt-4 rounded-2xl border border-[#1e3050] bg-[#0a1322] p-4 text-xs">
                  <p className="font-mono text-brand-orange">{tracked.adminId}</p>
                  <p className="mt-1 font-black text-white">{tracked.storeName}</p>
                  <p className="mt-1 text-gray-400">Store ID: <b className="text-white">{tracked.storeId}</b></p>
                  <p className="mt-2 text-[10px] font-black uppercase text-amber-300">Status: {tracked.status}</p>
                  {approvedCred && (
                    <div className="mt-4 grid gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <p className="text-[10px] font-black uppercase text-emerald-300">Approved Login Credential</p>
                      <p>Admin ID: <b>{tracked.adminId}</b></p>
                      <p>Password: <b>{approvedCred.password}</b></p>
                      <p>Store Site: <a className="text-brand-orange underline" href={`/store?key=${tracked.storeId}`}>{window.location.origin}/store?key={tracked.storeId}</a></p>
                      <p>Store Admin: <a className="text-brand-orange underline" href={`/store-admin?key=${tracked.storeId}`}>{window.location.origin}/store-admin?key={tracked.storeId}</a></p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <PortalShell role="Store Admin" tagline="Store Operations" nav={nav} active={tab} onNav={setTab} onBack={goBack}>
      {tab === 'dashboard' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 bg-gradient-to-r from-teal-500/15 via-[#101d30] to-[#101d30] border border-teal-500/20 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center font-black text-white text-xl">SA</div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">Store Admin Console</p>
                <p className="text-lg font-black text-white">{activeStoreName}</p>
                <p className="text-[10px] text-gray-400">Store ID {activeStoreId} · Branch {activeBranchId || 'All'} · {staff.length} staff online</p>
              </div>
            </div>
            <button onClick={() => setTab('tools')} className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors">
              <Wrench className="w-3.5 h-3.5" /><span>Review Top-Ups {pending.length > 0 && `(${pending.length})`}</span>
            </button>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Store Site', url: `${window.location.origin}/store?key=${activeStoreId}` },
                { label: 'Store Admin', url: `${window.location.origin}/store-admin?key=${activeStoreId}` },
                { label: 'Branch Admin', url: `${window.location.origin}/store-admin?key=${activeStoreId}&branch=${activeBranchId}` },
              ].map(link => (
                <button key={link.label} onClick={() => navigator.clipboard.writeText(link.url)} className="flex items-center gap-1.5 rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-[9px] font-black uppercase text-gray-300">
                  <Copy className="h-3 w-3" /> {link.label}
                </button>
              ))}
              <button onClick={logout} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase text-red-300">Logout</button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Orders', value: myOrders.length.toString(), sub: `${myOrders.filter(o => o.status === 'Pending').length} pending`, color: 'text-white' },
              { label: 'Revenue', value: bdt(revenue), sub: 'completed', color: 'text-teal-400' },
              { label: 'Wallet Balance', value: bdt(myWalletBal), sub: 'store ledger only', color: 'text-brand-orange' },
              { label: 'Products', value: myProducts.length.toString(), sub: 'catalog live', color: 'text-sky-400' },
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
              {myOrders.length === 0 ? <p className="text-[10px] text-gray-500 py-6 text-center">No orders yet.</p> : (
                <div className="space-y-2">
                  {myOrders.slice(0, 4).map(o => (
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

      {tab === 'branches' && (
        <div className="space-y-3">
          <div>
            <h3 className="flex items-center space-x-2 text-sm font-black text-white"><Store className="h-4 w-4 text-brand-orange" /><span>Branch List</span></h3>
            <p className="text-[10px] text-gray-400">Each branch has its own ID, login, link, products, orders, stock and sales.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {myBranches.map((b: any) => {
              const bOrders = orders.filter(o => (o as any).branchId === b.id);
              const bProducts = products.filter((p: any) => p.branchId === b.id);
              const bRevenue = bOrders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);
              const branchLink = `${window.location.origin}/store-admin?key=${activeStoreId}&branch=${b.id}`;
              return (
                <div key={b.id} className={`rounded-2xl border p-4 ${b.id === activeBranchId ? 'border-brand-orange bg-brand-orange/10' : 'border-[#1e3050] bg-[#101d30]'}`}>
                  <p className="font-mono text-[10px] font-black text-brand-orange">{b.id}</p>
                  <p className="mt-1 text-sm font-black text-white">{b.name}</p>
                  <p className="text-[9px] text-gray-500">{b.address}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-[#0a1322] p-2"><p className="text-xs font-black text-white">{bOrders.length}</p><p className="text-[8px] text-gray-500">Orders</p></div>
                    <div className="rounded-lg bg-[#0a1322] p-2"><p className="text-xs font-black text-white">{bProducts.length}</p><p className="text-[8px] text-gray-500">Products</p></div>
                    <div className="rounded-lg bg-[#0a1322] p-2"><p className="text-xs font-black text-emerald-400">{bdt(bRevenue)}</p><p className="text-[8px] text-gray-500">Sales</p></div>
                  </div>
                  <div className="mt-3 grid gap-1 rounded-lg bg-[#0a1322] p-2 text-[9px]">
                    <p>Login ID: <b className="text-white">{b.branchAdminId || 'Not generated'}</b></p>
                    <p>Password: <b className="text-white">{b.branchPassword || 'Not generated'}</b></p>
                    <button onClick={() => navigator.clipboard.writeText(branchLink)} className="mt-1 rounded-lg border border-brand-orange/30 px-2 py-1 font-black uppercase text-brand-orange">Copy Branch Link</button>
                  </div>
                  <button onClick={() => { localStorage.setItem(`sd_active_branch_${activeStoreId}`, b.id); window.location.href = branchLink; }} className="mt-3 w-full rounded-xl bg-brand-orange px-3 py-2 text-[10px] font-black uppercase text-white">Open This Branch</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><ClipboardList className="w-4 h-4 text-brand-orange" /><span>Orders</span></h3>
            <p className="text-[10px] text-gray-400">Manage order status — changes reflect on the admin panel.</p>
          </div>
          {myOrders.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No orders found.</p> : (
            <div className="space-y-2">
              {myOrders.map(o => (
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
                  {o.scheduledSlot && (
                    <span className="inline-flex items-center space-x-1 mt-1.5 px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[9px] font-black">
                      <Clock className="w-3 h-3" /><span>Scheduled · {o.scheduledSlot}</span>
                    </span>
                  )}
                  {o.timeline && o.timeline.length > 0 && (
                    <details className="mt-2 text-[9px] text-gray-400">
                      <summary className="cursor-pointer font-black text-gray-400 uppercase tracking-widest">Timeline ({o.timeline.length})</summary>
                      <div className="mt-1.5 space-y-1">
                        {o.timeline.map((t: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="uppercase font-bold text-gray-300">{t.status}</span>
                            <span className="text-gray-500">{new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                    {o.status !== 'Completed' && o.status !== 'Cancelled' && (
                      <>
                        <button onClick={() => acceptOrder(o.id)} className="px-3 py-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-xl text-[10px] font-black hover:bg-emerald-500/25 transition-colors">Accept & Dispatch to Driver</button>
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

      {tab === 'products' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Box className="w-4 h-4 text-brand-orange" /><span>Product Catalog</span></h3>
            <p className="text-[10px] text-gray-400">Add & manage products — they appear on the live storefront.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input value={newProd.name} onChange={e => setNewProd(prev => ({ ...prev, name: e.target.value }))} placeholder="Product name" className="min-w-0 flex-1 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
              <select value={newProd.category} onChange={e => setNewProd(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange sm:w-40">
                <option value="">Category</option>
                {myCategories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="General">General</option>
              </select>
              <input value={newProd.price} onChange={e => setNewProd(prev => ({ ...prev, price: e.target.value }))} placeholder="Price ৳" type="number" className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange sm:w-24" />
              <input value={newProd.stock} onChange={e => setNewProd(prev => ({ ...prev, stock: e.target.value }))} placeholder="Stock" type="number" className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange sm:w-20" />
              <button onClick={addProduct} className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-[10px] font-black transition-colors sm:self-stretch"><Plus className="w-3.5 h-3.5" /><span>Add</span></button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="w-full bg-[#101d30] border border-[#1e3050] rounded-xl pl-9 pr-3 py-2.5 text-[10px] outline-none focus:border-brand-orange" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
                <div className="h-28 bg-[#132238] flex items-center justify-center">
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-gray-600" />}
                </div>
                <div className="p-3">
                  <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                  <p className="text-[8px] text-gray-500">{p.category} · {p.id}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[12px] font-black text-brand-orange">{bdt(p.price)}</span>
                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(p.status)}`}>{p.status}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[9px] text-gray-400">Stock: <b className="text-white">{p.stock}</b></span>
                    <div className="flex items-center space-x-1.5">
                      <button onClick={() => setStock(p.id, -1)} className="w-6 h-6 rounded-lg bg-[#0a1322] border border-[#1e3050] text-gray-300 hover:border-red-500/40 hover:text-red-400 text-[11px]">−</button>
                      <button onClick={() => setStock(p.id, 1)} className="w-6 h-6 rounded-lg bg-[#0a1322] border border-[#1e3050] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 text-[11px]">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div>
              <h3 className="flex items-center space-x-2 text-sm font-black text-white"><FolderOpen className="h-4 w-4 text-brand-orange" /><span>Product Categories</span></h3>
              <p className="text-[10px] text-gray-400">Real category departments for this Store ID only.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {myCategories.map((c: any) => {
                const count = myProducts.filter((p: any) => p.category === c.name).length;
                return (
                  <div key={c.id} className="rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
                    <p className="text-sm font-black text-white">{c.name}</p>
                    <p className="mt-1 font-mono text-[9px] font-bold text-gray-500">{c.id}</p>
                    <p className="mt-3 text-lg font-black text-brand-orange">{count}</p>
                    <p className="text-[9px] font-black uppercase text-gray-500">Items Active</p>
                  </div>
                );
              })}
              {myCategories.length === 0 && <p className="rounded-2xl border border-[#1e3050] bg-[#101d30] py-10 text-center text-[10px] text-gray-500 sm:col-span-2">No real category added yet.</p>}
            </div>
          </div>
          <div className="h-fit rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
            <h4 className="flex items-center gap-2 border-b border-[#1e3050] pb-3 text-xs font-black uppercase text-white"><Plus className="h-4 w-4 text-brand-orange" /> Create Category</h4>
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Frozen Foods" className="mt-4 w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
            <button onClick={addCategory} className="mt-3 w-full rounded-xl bg-brand-orange px-4 py-2.5 text-[10px] font-black uppercase text-white">Launch Category</button>
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Package className="w-4 h-4 text-brand-orange" /><span>Inventory</span></h3>
            <p className="text-[10px] text-gray-400">Stock levels — low stock highlighted, adjust on the fly.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[10px]">
              <thead><tr className="bg-[#0a1322] text-gray-400 text-[9px] uppercase tracking-wider"><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Price</th><th className="px-3 py-2.5">Stock</th><th className="px-3 py-2.5 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-[#1e3050]">
                {myProducts.map(p => (
                  <tr key={p.id} className="hover:bg-[#132238] transition-colors">
                    <td className="px-3 py-2.5 font-bold text-gray-200 truncate max-w-[160px]">{p.name}</td>
                    <td className="px-3 py-2.5 text-gray-400">{p.category}</td>
                    <td className="px-3 py-2.5 font-mono text-brand-orange font-bold">{bdt(p.price)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-mono font-black ${p.stock <= 0 ? 'text-red-400' : p.stock <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>{p.stock}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button onClick={() => setStock(p.id, -5)} className="px-2 py-1 rounded-lg bg-[#0a1322] border border-[#1e3050] text-gray-300 hover:border-red-500/40 hover:text-red-400 text-[9px] font-black">−5</button>
                        <button onClick={() => setStock(p.id, 5)} className="px-2 py-1 rounded-lg bg-[#0a1322] border border-[#1e3050] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 text-[9px] font-black">+5</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'pos' && (
        <div className="min-h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-brand-border bg-brand-dark">
          <PosSystem
            products={myProducts}
            orders={myOrders}
            onProductsChange={syncPosProducts}
            onCreateOrder={createPosOrder}
            onUpdateOrder={updatePosOrder}
            onSendToDriver={() => undefined}
            onDeleteOrder={(id) => setOrders(orders.map(o => o.id === id ? appendTimeline({ ...o, status: 'Cancelled' as any }, 'cancelled', 'admin', 'Cancelled from Store Admin POS') : o))}
            onNavigate={setTab}
            onSaleRecorded={posSaleRecorded}
          />
        </div>
      )}

      {tab === 'coupons' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><Ticket className="w-4 h-4 text-brand-orange" /><span>Coupons & Offers</span></h3>
              <p className="text-[10px] text-gray-400">Real coupons for this store only. Super Admin sees the same records.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coupons.map((c: any) => (
                <div key={c.id} className="bg-[#101d30] border border-dashed border-brand-orange/40 rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute -right-3 top-0 bottom-0 w-6 border-l-2 border-dashed border-[#1e3050]" />
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{c.id}</p>
                  <p className="text-lg font-black font-mono text-brand-orange mt-1">{c.code}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{c.discount}</p>
                  <p className="text-[8px] text-gray-500 mt-1">Min order {bdt(c.minOrder || 0)} · {c.usages || 0} uses</p>
                  <div className="mt-3 flex items-center justify-between border-t border-[#1e3050] pt-3">
                    <button onClick={() => toggleCoupon(c.id)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase text-emerald-300">{c.status || 'Active'}</button>
                    <button onClick={() => deleteCoupon(c.id)} className="flex items-center gap-1 text-[9px] font-bold text-red-400"><Trash2 className="h-3 w-3" /> Delete</button>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && <p className="rounded-2xl border border-[#1e3050] bg-[#101d30] py-10 text-center text-[10px] text-gray-500 sm:col-span-2">No real coupon added yet.</p>}
            </div>
          </div>
          <div className="h-fit rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
            <h4 className="flex items-center gap-2 border-b border-[#1e3050] pb-3 text-xs font-black uppercase text-white"><Ticket className="h-4 w-4 text-brand-orange" /> Configure Promo Code</h4>
            <div className="mt-4 space-y-3">
              <input value={newCoupon.code} onChange={e => setNewCoupon(prev => ({ ...prev, code: e.target.value }))} placeholder="Coupon code" className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs uppercase outline-none focus:border-brand-orange" />
              <input value={newCoupon.discount} onChange={e => setNewCoupon(prev => ({ ...prev, discount: e.target.value }))} placeholder="Discount display e.g. 20% Off" className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
              <input value={newCoupon.minOrder} onChange={e => setNewCoupon(prev => ({ ...prev, minOrder: e.target.value }))} placeholder="Minimum order" type="number" className="w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-xs outline-none focus:border-brand-orange" />
              <button onClick={addCoupon} className="w-full rounded-xl bg-brand-orange px-4 py-2.5 text-[10px] font-black uppercase text-white">Publish Coupon Code</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          <div>
            <h3 className="flex items-center space-x-2 text-sm font-black text-white"><Star className="h-4 w-4 text-brand-orange" /><span>Customer Reviews</span></h3>
            <p className="text-[10px] text-gray-400">Real customer feedback for this Store ID. Replies stay saved.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {myReviews.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{r.customer || r.customerName || 'Customer'}</p>
                    <p className="text-[9px] text-gray-500">{r.date || 'Recent'} · {r.item || r.productName || activeStoreName}</p>
                  </div>
                  <span className="rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-2 py-1 text-[10px] font-black text-brand-orange">{r.rating || 5}.0</span>
                </div>
                <p className="mt-3 text-xs italic text-gray-300">"{r.comment || r.text || 'No comment'}"</p>
                {reviewReplies[r.id] && <p className="mt-3 rounded-xl border-l-2 border-brand-orange bg-[#0a1322] p-3 text-[11px] text-gray-300">{reviewReplies[r.id]}</p>}
                <div className="mt-3 flex gap-2">
                  <input id={`reply-${r.id}`} placeholder="Reply to customer..." className="min-w-0 flex-1 rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
                  <button onClick={() => {
                    const input = document.getElementById(`reply-${r.id}`) as HTMLInputElement | null;
                    if (!input?.value) return;
                    setReviewReplies(prev => ({ ...prev, [r.id]: input.value }));
                    input.value = '';
                  }} className="rounded-xl bg-brand-orange px-3 py-2 text-[10px] font-black uppercase text-white">Reply</button>
                </div>
              </div>
            ))}
            {myReviews.length === 0 && <p className="rounded-2xl border border-[#1e3050] bg-[#101d30] py-10 text-center text-[10px] text-gray-500 md:col-span-2">No real customer review yet.</p>}
          </div>
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
              <span className="text-[10px] text-emerald-400 font-black">Wallet: {bdt(myWalletBal)}</span>
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
            {myTxns.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">No wallet activity.</p> : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {myTxns.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-lg px-3 py-2 text-[10px]">
                    <p className="text-gray-300 truncate">{t.type} <span className="font-mono text-gray-500">{t.id}</span></p>
                    <span className={`font-mono font-black ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.amount >= 0 ? '+' : ''}{bdt(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {myRefunds.length > 0 && (
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Refunds ({myRefunds.length})</p>
              <div className="space-y-1.5">
                {myRefunds.map((r: any) => (
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
            <input value={stf.phone} onChange={e => setStf(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange sm:w-36" />
            <button onClick={addStaff} className="flex w-full items-center justify-center space-x-1.5 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-[10px] font-black transition-colors sm:w-auto"><UserPlus className="w-3.5 h-3.5" /><span>Hire</span></button>
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
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3050]">
              <p className="text-[10px] font-black uppercase tracking-widest text-white flex items-center space-x-2"><History className="w-3.5 h-3.5 text-brand-orange" /><span>Store Activity Log</span></p>
              <button onClick={() => { setAuditLoading(true); securityApi(`/audit?storeId=${encodeURIComponent(activeStoreId)}&limit=200`).then((d) => setStoreAudit(Array.isArray(d.audit) ? d.audit : [])).catch(() => {}).finally(() => setAuditLoading(false)); }} className="text-[9px] font-black text-brand-orange uppercase hover:underline">Refresh</button>
            </div>
            {auditLoading ? (
              <div className="p-6 text-center text-[10px] text-gray-500">Loading activity log…</div>
            ) : storeAudit.length === 0 ? (
              <div className="p-6 text-center text-[10px] text-gray-500">No audited actions yet for this store.</div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto divide-y divide-[#1e3050]">
                {storeAudit.slice(0, 120).map((a: any) => (
                  <div key={a.id} className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-[#132238] transition-colors">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-200 truncate">{a.action}</p>
                      <p className="text-[9px] text-gray-500 truncate">{a.actor ? `by ${a.actor}` : ''}{a.reason ? ` · ${a.reason}` : ''}</p>
                      {a.newValue && <p className="text-[8px] font-mono text-gray-600 truncate">{JSON.stringify(a.newValue).slice(0, 160)}</p>}
                    </div>
                    <span className="text-[8px] text-gray-500 whitespace-nowrap">{a.time ? new Date(a.time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                ))}
              </div>
            )}
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
              { label: 'Total Payments', value: myPayments.length.toString(), color: 'text-white' },
              { label: 'Paid', value: myPayments.filter(p => p.status === 'Paid').length.toString(), color: 'text-emerald-400' },
              { label: 'Pending', value: myPayments.filter(p => p.status !== 'Paid').length.toString(), color: 'text-amber-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[10px]">
              <thead><tr className="bg-[#0a1322] text-gray-400 text-[9px] uppercase tracking-wider"><th className="px-3 py-2.5">Ref</th><th className="px-3 py-2.5">Method</th><th className="px-3 py-2.5">Amount</th><th className="px-3 py-2.5">Status</th></tr></thead>
              <tbody className="divide-y divide-[#1e3050]">
                {myPayments.map(p => (
                  <tr key={p.id} className="hover:bg-[#132238] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-brand-orange font-bold">#{p.id}</td>
                    <td className="px-3 py-2.5 text-gray-300">{p.method || '—'}</td>
                    <td className="px-3 py-2.5 font-mono font-black text-white">{bdt(p.amount)}</td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${p.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>{p.status}</span></td>
                  </tr>
                ))}
                {myPayments.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No payments.</td></tr>}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><Bell className="w-4 h-4 text-brand-orange" /><span>Alerts & Notifications</span></h3>
              <p className="text-[10px] text-gray-400">Admin announcements and platform updates addressed to stores appear here.</p>
            </div>
            <button onClick={() => setNotifications(prev => prev.map(n => myNotifs.some(m => m.id === n.id) ? { ...n, read: true } : n))} className="text-[9px] font-black text-brand-orange uppercase tracking-wider hover:underline">Mark all read</button>
          </div>
          {myNotifs.length === 0 ? (
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0"><Bell className="w-4 h-4" /></div>
              <div>
                <p className="text-[11px] font-bold text-white">No new alerts</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Admin broadcasts for stores and platform updates will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {myNotifs.map(n => {
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

      {tab === 'support' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><LifeBuoy className="w-4 h-4 text-brand-orange" /><span>Support Tickets</span></h3>
            <p className="text-[10px] text-gray-400">Create store support requests and approve Super Admin fix requests before any work starts.</p>
          </div>
          <div className="rounded-2xl border border-[#1e3050] bg-[#101d30] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white">New Support Request</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px]">
              <input value={supportDraft.subject} onChange={e => setSupportDraft(prev => ({ ...prev, subject: e.target.value }))} placeholder="Problem subject" className="rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
              <select value={supportDraft.priority} onChange={e => setSupportDraft(prev => ({ ...prev, priority: e.target.value }))} className="rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-[10px] outline-none focus:border-brand-orange">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <textarea value={supportDraft.message} onChange={e => setSupportDraft(prev => ({ ...prev, message: e.target.value }))} placeholder="Write the issue, order/product/payment reference, and what help you need" className="mt-2 min-h-20 w-full rounded-xl border border-[#1e3050] bg-[#0a1322] px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
            <button onClick={createSupportTicket} className="mt-2 rounded-xl bg-brand-orange px-4 py-2 text-[10px] font-black uppercase text-white">Submit Ticket to Super Admin</button>
          </div>
          {myTickets.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No tickets.</p> : (
            <div className="space-y-2">
              {myTickets.map((t: any) => (
                <div key={t.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-brand-orange font-bold">{t.id}</p>
                      <p className="text-[11px] font-bold text-white truncate">{t.subject}</p>
                      <p className="text-[9px] text-gray-500">{t.category} · {t.date}</p>
                      {t.requestStatus && <p className="mt-1 text-[9px] font-black uppercase text-cyan-300">{t.requestStatus}</p>}
                    </div>
                    <span className={`px-2 py-1 rounded-lg border text-[8px] font-black ${t.status === 'Open' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : t.status === 'Closed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-sky-500/20 text-sky-300 border-sky-500/30'}`}>{t.status}</span>
                  </div>
                  {t.terms && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-[9px] font-black uppercase text-amber-300">Super Admin Fix Request Terms</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-amber-50">{t.terms}</p>
                      {t.requestStatus === 'Waiting Store Admin Approval' && (
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button onClick={() => decideAdminRequest(t, false)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[9px] font-black uppercase text-red-300">Reject Request</button>
                          <button onClick={() => decideAdminRequest(t, true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[9px] font-black uppercase text-white">Approve Fix Request</button>
                        </div>
                      )}
                    </div>
                  )}
                  {(t.messages || []).length > 0 && (
                    <div className="mt-3 space-y-1 rounded-xl border border-[#1e3050] bg-[#0a1322] p-2">
                      {(t.messages || []).slice(-3).map((m: any, i: number) => (
                        <div key={i} className="text-[9px] text-gray-300">
                          <p><b className={m.sender === 'admin' ? 'text-brand-orange' : 'text-cyan-300'}>{m.sender}:</b> {m.text}</p>
                          {m.linkUrl && <a href={m.linkUrl} target="_blank" rel="noreferrer" className="mt-1 block text-brand-orange underline">{m.linkUrl}</a>}
                          {m.attachmentUrl && (
                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-300">
                              <Paperclip className="h-3 w-3" /> {m.attachmentName || 'Attachment'}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {t.status !== 'Resolved' && t.status !== 'Closed' && (
                    <div className="mt-3 rounded-xl border border-[#1e3050] bg-[#0a1322] p-2">
                      <textarea value={ticketReplies[t.id] || ''} onChange={e => setTicketReplies(prev => ({ ...prev, [t.id]: e.target.value }))} placeholder="Chat message to Super Admin / Support staff" className="min-h-16 w-full rounded-lg border border-[#1e3050] bg-[#101d30] px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
                      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_170px_auto]">
                        <input value={ticketLinks[t.id] || ''} onChange={e => setTicketLinks(prev => ({ ...prev, [t.id]: e.target.value }))} placeholder="Any link / URL" className="rounded-lg border border-[#1e3050] bg-[#101d30] px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
                        <label className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#1e3050] bg-[#101d30] px-3 py-2 text-[9px] font-black uppercase text-gray-300">
                          <Paperclip className="h-3 w-3" /> {ticketFiles[t.id]?.name ? 'Attached' : 'Photo/Video'}
                          <input type="file" onChange={e => uploadTicketFile(t.id, e.target.files?.[0])} className="hidden" />
                        </label>
                        <button onClick={() => sendTicketMessage(t)} className="flex items-center justify-center gap-1 rounded-lg bg-brand-orange px-3 py-2 text-[9px] font-black uppercase text-white">
                          <Send className="h-3 w-3" /> Send
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
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

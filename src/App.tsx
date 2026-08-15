/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { 
  Order, Driver, Zone, User, Payment, Vehicle, PromotionBanner, SupportTicket, SystemNotification, ChatLogEntry, OrderReportEntry, makeOrderId
} from './types';
import { getStoredData, setStoredData, getZonesWithDefaults } from './data';

import DashboardView from './components/DashboardView';
import UsersView from './components/UsersView';
import DriversView from './components/DriversView';
import OrdersView from './components/OrdersView';
import ZonesView from './components/ZonesView';
import SupportView from './components/SupportView';
import NotificationsView from './components/NotificationsView';
import SettingsView from './components/SettingsView';
import EarningsView from './components/EarningsView';
import FleetPromosView from './components/FleetPromosView';
import InventoryView from './components/InventoryView';
import ProductInventoryView from './components/ProductInventoryView';
import PromoStudioView from './components/PromoStudioView';
import StoreDashboardView from './components/StoreDashboardView';
import DeliveryDashboardView from './components/DeliveryDashboardView';
import { CustomerStorefront } from './components/CustomerStorefront';
import { useLiveDrivers } from './hooks/useLiveDrivers';
import { ScanOrderModule } from './components/ScanOrderModule';
import { Html5Qrcode } from 'html5-qrcode';
import OrderToolsDashboard from './components/OrderToolsDashboard';
import MobileAppSimulator from './components/MobileAppSimulator';
import MFSBusinessView from './components/MFSBusinessView';
import PosSystem from './components/PosSystem';
import VehiclesView from './components/VehiclesView';
import StoreSyncView from './components/StoreSyncView';
import KpiDashboardView from './components/KpiDashboardView';
import { runExpiryAutoWaste } from './components/inventoryAutoWaste';
import { appendTimeline, useCloudSync, secureFileUpload, securityApi, securityAudit } from './portals/portalUtils';

import { 
  LayoutDashboard, Users, UserSquare2, ShoppingCart, DollarSign, CreditCard, 
  Map, Truck, Bookmark, FileText, LifeBuoy, Bell, Settings, LogOut, Menu, X, 
  Check, Calendar, BellOff, Box, FolderOpen, Store, ClipboardList, Ticket,
  BarChart3, ShieldCheck, MapPin, Star, Megaphone, ShieldAlert, Award, Download,
  Copy, ExternalLink, Plus, Link, Search, Mail, Trash2, Edit, MessageSquare, CheckCircle, XCircle, Clock, ArrowRight, Sparkles, TrendingUp, Printer, Globe, ShoppingBag,
  Camera, QrCode, Smartphone, Wallet, CloudUpload,
  Wrench
} from 'lucide-react';

const storeDocMeta = [
  { key: 'tradeLicense', label: 'Trade License', required: true },
  { key: 'binTin', label: 'BIN/TIN Certificate', required: true },
  { key: 'ownerNid', label: 'Owner NID Front & Back', required: true },
  { key: 'storePhoto', label: 'Store Front Photo', required: true },
  { key: 'bankMfs', label: 'Bank/MFS Settlement Proof', required: true },
  { key: 'foodSafety', label: 'BSTI/Food Safety Certificate (if food)', required: false },
];

const CODE39_PATTERNS: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', A: '110101001011', B: '101101001011',
  C: '110110100101', D: '101011001011', E: '110101100101', F: '101101100101',
  G: '101010011011', H: '110101001101', I: '101101001101', J: '101011001101',
  K: '110101010011', L: '101101010011', M: '110110101001', N: '101011010011',
  O: '110101101001', P: '101101101001', Q: '101010110011', R: '110101011001',
  S: '101101011001', T: '101011011001', U: '110010101011', V: '100110101011',
  W: '110011010101', X: '100101101011', Y: '110010110101', Z: '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '$': '100100100101',
  '/': '100100101001', '+': '100101001001', '%': '101001001001', '*': '100101101101',
};

const staffCardCode = (card: any) => String(card?.permanentNumber || card?.id || 'STAFF').toUpperCase().replace(/[^A-Z0-9-. $/+%]/g, '-');
const staffCardBarcodeCode = (card: any) => staffCardCode(card);
const staffCardVerifyUrl = (card: any) => `${window.location.origin}/api/security/staff-card/verify?key=${encodeURIComponent(new URLSearchParams(window.location.search).get('key') || localStorage.getItem('sd_store_key') || 'nexago-main')}&staffId=${encodeURIComponent(card?.id || '')}&permanentNo=${encodeURIComponent(staffCardCode(card))}`;

// Renders the REAL scannable QR code to an SVG string (same QR the on-screen card shows).
const staffCardQrSvg = (card: any): string => {
  const holder = document.createElement('div');
  const root = createRoot(holder);
  flushSync(() => root.render(<QRCodeSVG value={staffCardVerifyUrl(card)} size={120} level="M" marginSize={0} />));
  const svg = holder.innerHTML;
  root.unmount();
  return svg;
};

const code39SvgDataUrlThick = (value: string) => {
  const bars = code39Bars(value);
  let x = 0;
  const rects = bars.map((bar) => {
    const w = bar.wide ? 24 : 8;
    const rect = bar.on ? `<rect x="${x}" y="0" width="${w}" height="64" fill="#020617"/>` : '';
    x += w + 1;
    return rect;
  }).join('');
  const width = Math.max(x - 1, 1);
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="64" viewBox="0 0 ${width} 64"><rect width="${width}" height="64" fill="#fff"/>${rects}</svg>`)}`;
};
const staffInitialsAvatarDataUrl = (name?: string) => {
  const initials = String(name || 'S').split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'S';
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320"><rect width="240" height="320" fill="#0f1a2e"/><rect x="20" y="20" width="200" height="280" rx="16" fill="#162a45"/><text x="120" y="178" font-family="Arial,sans-serif" font-size="96" font-weight="900" fill="#f97316" text-anchor="middle">${initials}</text><text x="120" y="252" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="#94a3b8" text-anchor="middle">STAFF</text></svg>`)}`;
};
const code39Bars = (value: string) => `*${value || 'STAFF'}*`.split('').flatMap((char, charIndex, chars) => {
  const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];
  const bars = pattern.split('').map((bit, idx) => ({ on: idx % 2 === 0, wide: bit === '1' }));
  return charIndex < chars.length - 1 ? [...bars, { on: false, wide: false }] : bars;
});
const code39SvgDataUrl = (value: string) => {
  const bars = code39Bars(value);
  let x = 0;
  const rects = bars.map((bar) => {
    const w = bar.wide ? 5 : 3;
    const rect = bar.on ? `<rect x="${x}" y="0" width="${w}" height="48" fill="#020617"/>` : '';
    x += w + 1;
    return rect;
  }).join('');
  const width = Math.max(x - 1, 1);
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="48" viewBox="0 0 ${width} 48"><rect width="${width}" height="48" fill="#fff"/>${rects}</svg>`)}`;
};

const STORE_ADMIN_PAGE_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'orders', label: 'Orders' },
  { id: 'branches', label: 'Branches' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'tools', label: 'Order Tools' },
  { id: 'staff', label: 'Staff' },
  { id: 'payments', label: 'Payments' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'support', label: 'Support' },
];
const DEFAULT_STORE_ADMIN_PAGES = STORE_ADMIN_PAGE_OPTIONS.map(p => p.id);

const makeStoreId = () => `STR-${Date.now().toString().slice(-7)}`;
const makeStoreAdminId = () => `SA-${Date.now().toString().slice(-8)}`;
const fingerprintOf = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return `DOC-${Math.abs(hash).toString(36)}-${value.length}`;
};

// Role-based portal sites — each HTML entry (driver.html, store.html, ...) opens
// the full NexaGo admin panel (super admin access).
export default function App() {
  // Live cloud sync: admin changes (driver approvals, orders, notifications...)
  // are pushed to the relay so every role site (driver, store, customer) sees
  // them instantly — and incoming changes from those sites are pulled in live.
  useCloudSync();

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isSuperAdminRoute = window.location.pathname.includes('super-admin') || window.location.pathname.endsWith('/admin') || window.location.pathname.endsWith('/index.html');
  const [isSuperAdminLoggedIn, setIsSuperAdminLoggedIn] = useState(() => localStorage.getItem('sd_super_admin_login') === 'verified');
  const [superAdminLogin, setSuperAdminLogin] = useState({ user: '', password: '', secretCode: '' });
  const [superAdminLoginError, setSuperAdminLoginError] = useState('');
  const [superAdminLoginStep, setSuperAdminLoginStep] = useState<'credentials' | 'secret'>('credentials');
  const [superAdminPasswordForm, setSuperAdminPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', secretCode: '' });
  const [superAdminPasswordError, setSuperAdminPasswordError] = useState('');
  const [superAdminSessions, setSuperAdminSessions] = useState<any[]>([]);
  const [superAdminSessionsError, setSuperAdminSessionsError] = useState('');
  const [selectedDeviceSession, setSelectedDeviceSession] = useState<any | null>(null);

  // Standalone Store Portal state
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('storeId');
  });
  const [activeMerchantTab, setActiveMerchantTab] = useState<string>('Dashboard');
  const [isOrderScannerOpen, setIsOrderScannerOpen] = useState<boolean>(false);

  // Listen to browser URL changes (for navigation/back button support)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedStoreId(params.get('storeId'));
      setActiveMerchantTab('Dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLaunchStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    setActiveMerchantTab('Dashboard');
    const newUrl = `${window.location.origin}${window.location.pathname}?storeId=${storeId}`;
    window.history.pushState({ storeId }, '', newUrl);
    showToast("Launching store merchant portal...", "info");
  };

  const handleExitStorePortal = () => {
    setSelectedStoreId(null);
    setActiveMerchantTab('Dashboard');
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({}, '', newUrl);
    showToast("Returned to super admin panel", "info");
  };
  
  // Separate Workspace Panel State: 'super_admin' = Super Admin Control Center, 'store' = Grocery Admin, 'delivery' = Delivery Logistics
  const [activePanelMode, setActivePanelMode] = useState<'super_admin' | 'store' | 'delivery'>('super_admin');

  const stripDemoData = <T extends Record<string, any>>(rows: T[] = [], kind: 'orders' | 'drivers' | 'zones' | 'users' | 'payments' | 'vehicles' | 'banners' | 'tickets' | 'notifications' | 'products' | 'stores' | 'inventory'): T[] => {
    const demoNames = /rahim|shakib|arif hossain|chillox|sultan|madchef|takeout|gulshan|dhanmondi/i;
    return rows.filter((row) => {
      const id = String(row.id || row.orderId || row.plateNumber || '');
      const text = JSON.stringify(row || {});
      if (kind === 'orders' && /^ORD-001\d+/.test(id)) return false;
      if (kind === 'drivers' && (/^DRV12345[6-9]$/.test(id) || demoNames.test(text))) return false;
      if (kind === 'zones' && /^Z-[1-5]$/.test(id)) return false;
      if (kind === 'payments' && (/^TXN-982\d+/.test(id) || /^ORD-001\d+/.test(String(row.orderId || '')))) return false;
      if (kind === 'vehicles' && (/^VEH-00\d$/.test(id) || /^V00\d$/.test(id) || demoNames.test(text))) return false;
      if (kind === 'banners' && /^BNR-/.test(id)) return false;
      if (kind === 'tickets' && (/^TCK-/.test(id) || /^ORD-001\d+/.test(text))) return false;
      if (kind === 'notifications' && (/^NTF-/.test(id) || /^ORD-001\d+/.test(text) || demoNames.test(text))) return false;
      if (kind === 'products' && /^PROD-10\d$/.test(id)) return false;
      if (kind === 'stores' && /^STR-0[1-5]$/.test(id) && !row.adminId) return false;
      if (kind === 'inventory' && /^INV-30[1-4]$/.test(id)) return false;
      return true;
    });
  };

  // Compact Layout / Tight Mode state
  const [isTightMode, setIsTightMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('is_tight_mode');
    return stored === 'true';
  });

  const toggleTightMode = () => {
    setIsTightMode(prev => {
      const next = !prev;
      localStorage.setItem('is_tight_mode', String(next));
      showToast(next ? "Tight Mode (Compact UI) enabled" : "Standard spacing enabled", "info");
      return next;
    });
  };

  // Collections Persistent State
  const [orders, setOrders] = useState<Order[]>(() => {
    const stored = getStoredData<Order[]>('sd_orders_v2', []);
    return stripDemoData(stored, 'orders');
  });
  const [driverDispatchOrder, setDriverDispatchOrder] = useState<Order | null>(null);
  const [adminDispatchOrder, setAdminDispatchOrder] = useState<Order | null>(null);
  const [customerDispatchOrder, setCustomerDispatchOrder] = useState<Order | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>(() => stripDemoData(getStoredData('sd_drivers', []), 'drivers'));
  const [zones, setZones] = useState<Zone[]>(() => stripDemoData(getZonesWithDefaults(), 'zones'));
  const [users, setUsers] = useState<User[]>(() => stripDemoData(getStoredData('sd_users', []), 'users'));
  const [payments, setPayments] = useState<Payment[]>(() => stripDemoData(getStoredData('sd_payments', []), 'payments'));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => stripDemoData(getStoredData('sd_vehicles', []), 'vehicles'));
  const [banners, setBanners] = useState<PromotionBanner[]>(() => stripDemoData(getStoredData('sd_banners', []), 'banners'));
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => stripDemoData(getStoredData('sd_tickets', []), 'tickets'));
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => stripDemoData(getStoredData('sd_notifications', []), 'notifications'));
  const [chatLog, setChatLog] = useState<ChatLogEntry[]>([]);
  const [orderReports, setOrderReports] = useState<OrderReportEntry[]>([]);
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const { liveDrivers, locSim, setLocSim, simTick } = useLiveDrivers(drivers);

  // Additional Interactive Mock States for the rich new sidebar panels
  const [products, setProducts] = useState<any[]>(() => stripDemoData(getStoredData<any[]>('sd_products', []), 'products'));

  const [categories, setCategories] = useState<any[]>(() => getStoredData('sd_categories', []));

  const [stores, setStores] = useState<any[]>(() => stripDemoData(getStoredData<any[]>('sd_stores', []), 'stores'));
  const [branches, setBranches] = useState<any[]>(() => getStoredData('sd_store_branches', []));
  const [storeAdminApps, setStoreAdminApps] = useState<any[]>(() => getStoredData('sd_store_admin_apps', []));
  const [storeAdminCreds, setStoreAdminCreds] = useState<Record<string, { password: string; storeId: string }>>(() => getStoredData('sd_store_admin_creds', {}));

  const [inventory, setInventory] = useState<any[]>(() => stripDemoData(getStoredData<any[]>('sd_inventory', []), 'inventory'));

  const [coupons, setCoupons] = useState<any[]>(() => getStoredData('sd_coupons', []));

  const normalizeStaffKyc = (rows: any[]) => (rows || []).map((s: any) => {
    const docs = Array.isArray(s.documents) ? s.documents : [];
    const hasFullKyc = docs.length >= 3 && docs.every((d: any) => d && (d.fileId || d.ref));
    if (hasFullKyc) return s;
    return {
      ...s,
      status: s.status === 'Active' ? 'Pending Verification' : (s.status || 'Pending Verification'),
      documentStatus: s.documentStatus && s.documentStatus !== 'Verified' ? s.documentStatus : 'Not Submitted',
      loginEnabled: false,
    };
  });

  const [staff, setStaff] = useState<any[]>(() => normalizeStaffKyc(getStoredData('sd_staff', [])).filter((s: any) => !(s && (s.testRecord === true || s.id === 'STF-TEST-001'))));
  const [staffScanOpen, setStaffScanOpen] = useState(false);
  const [staffScanMsg, setStaffScanMsg] = useState<string | null>(null);
  const [staffScanManual, setStaffScanManual] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [staffKycOpen, setStaffKycOpen] = useState(false);
  const [staffKycViewing, setStaffKycViewing] = useState<any | null>(null);
  const [staffKycForm, setStaffKycForm] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    dob: '',
    gender: '',
    nationality: 'Bangladeshi',
    bloodGroup: '',
    phone: '',
    email: '',
    emergencyContact: '',
    nid: '',
    passport: '',
    birthCertificate: '',
    documentExpiry: '',
    address: '',
    permanentAddress: '',
    district: '',
    upazila: '',
    postCode: '',
    role: 'Support Staff',
    shift: 'Full Time',
    joiningDate: '',
    supervisor: '',
    contractType: '',
    salaryNote: '',
    referenceOne: '',
    referenceTwo: '',
    deviceAccess: 'Allowed after approval',
    confirmTruth: false,
    permissions: 'support,orders,reports,notifications',
  });
  const [staffKycStep, setStaffKycStep] = useState(1);
  const [staffKycFiles, setStaffKycFiles] = useState<{ identity?: File; photo?: File; police?: File }>({});
  const [staffKycBusy, setStaffKycBusy] = useState(false);
  const [staffLoginTarget, setStaffLoginTarget] = useState<any | null>(null);
  const [staffLoginPassword, setStaffLoginPassword] = useState('');
  const [staffActionTarget, setStaffActionTarget] = useState<{ member: any; status: 'Active' | 'Rejected' | 'Suspended' } | null>(null);
  const [staffActionReason, setStaffActionReason] = useState('');
  const [staffKycFilter, setStaffKycFilter] = useState<'All' | 'Pending Verification' | 'Active' | 'Rejected' | 'Suspended' | 'Archived'>('All');
  const [staffKycSearch, setStaffKycSearch] = useState('');
  const [staffProfile, setStaffProfile] = useState<any | null>(null);
  const [staffIdCard, setStaffIdCard] = useState<any | null>(null);  const staffCardPrintRef = useRef<HTMLDivElement | null>(null); const [staffRenewalOpen, setStaffRenewalOpen] = useState(false);
  const [staffRenewalStep, setStaffRenewalStep] = useState(1);
  const [staffRenewalForm, setStaffRenewalForm] = useState({ role: '', shift: '', joiningDate: '', phone: '', address: '', emergencyContact: '', reason: '' });
  const [staffRenewalRef, setStaffRenewalRef] = useState('');

  const [reviews, setReviews] = useState<any[]>(() => getStoredData('sd_reviews', []));

  const [marketing, setMarketing] = useState<any[]>(() => getStoredData('sd_marketing', []));

  useEffect(() => {
    setCoupons(prev => prev.filter((c: any) => !/^CPN-0[1-3]$/.test(c.id || '')));
  }, []);

  // UI Control states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [quickActionModal, setQuickActionModal] = useState<'driver' | 'user' | 'zone' | 'notification' | 'banner' | null>(null);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreAdminDraft, setNewStoreAdminDraft] = useState({
    ownerName: '',
    phone: '',
    email: '',
    businessType: 'Grocery / Super Shop',
    tradeLicenseNo: '',
    tinBin: '',
    settlementNumber: '',
  });
  const [newStoreDocs, setNewStoreDocs] = useState<Record<string, any>>({});
  const [newStoreReview, setNewStoreReview] = useState(false);

  // Merchant specific interactive states
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [mProdName, setMProdName] = useState('');
  const [mProdCat, setMProdCat] = useState('Fruits & Vegetables');
  const [mProdPrice, setMProdPrice] = useState('');
  const [mProdStock, setMProdStock] = useState('');
  const [mCatName, setMCatName] = useState('');
  const [mCouponCode, setMCouponCode] = useState('');
  const [mCouponDiscount, setMCouponDiscount] = useState('');
  const [mCouponMinOrder, setMCouponMinOrder] = useState('');
  const [mStaffName, setMStaffName] = useState('');
  const [mStaffRole, setMStaffRole] = useState('Cashier');
  const [mStaffShift, setMStaffShift] = useState('Day Shift');
  const [mMarketingTitle, setMMarketingTitle] = useState('');
  const [mMarketingChannel, setMMarketingChannel] = useState('In-app Banner');
  const [mMarketingBudget, setMMarketingBudget] = useState('');
  const [mTicketSubject, setMTicketSubject] = useState('');
  const [mTicketPriority, setMTicketPriority] = useState('Medium');
  const [mTicketMsg, setMTicketMsg] = useState('');
  const [mSelectedOrder, setMSelectedOrder] = useState<Order | null>(null);
  const [printingReceiptOrder, setPrintingReceiptOrder] = useState<Order | null>(null);
  const [mReviewReplies, setMReviewReplies] = useState<Record<string, string>>({});
  const [merchantUnreadNotifCount, setMerchantUnreadNotifCount] = useState(5);
  const [isMerchantNotifDropdownOpen, setIsMerchantNotifDropdownOpen] = useState(false);
  const [isMerchantProfileDropdownOpen, setIsMerchantProfileDropdownOpen] = useState(false);
  const [isMerchantMobileSidebarOpen, setIsMerchantMobileSidebarOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => { setStoredData('sd_orders_v2', orders); }, [orders]);
  useEffect(() => { setStoredData('sd_drivers', drivers); }, [drivers]);
  useEffect(() => { setStoredData('sd_zones', zones); }, [zones]);
  useEffect(() => { setStoredData('sd_users', users); }, [users]);
  useEffect(() => { setStoredData('sd_payments', payments); }, [payments]);
  useEffect(() => { setStoredData('sd_vehicles', vehicles); }, [vehicles]);
  useEffect(() => { setStoredData('sd_products', products); }, [products]);
  useEffect(() => { setStoredData('sd_categories', categories); }, [categories]);
  useEffect(() => { setStoredData('sd_inventory', inventory); }, [inventory]);
  useEffect(() => { setStoredData('sd_coupons', coupons); }, [coupons]);
  useEffect(() => { setStoredData('sd_staff', normalizeStaffKyc(staff)); }, [staff]);
  useEffect(() => {
    if (!staffIdCard?.id) return;
    const latest = normalizeStaffKyc(staff).find((s: any) => s.id === staffIdCard.id);
    if (latest) setStaffIdCard((prev: any) => ({ ...prev, ...latest }));
  }, [staff, staffIdCard?.id]);
  useEffect(() => { setStoredData('sd_reviews', reviews); }, [reviews]);
  useEffect(() => { setStoredData('sd_marketing', marketing); }, [marketing]);
  useEffect(() => { setStoredData('sd_banners', banners); }, [banners]);
  useEffect(() => { setStoredData('sd_tickets', supportTickets); }, [supportTickets]);
  useEffect(() => { setStoredData('sd_notifications', notifications); }, [notifications]);
  useEffect(() => { setStoredData('sd_stores', stores); }, [stores]);
  useEffect(() => { setStoredData('sd_store_branches', branches); }, [branches]);
  useEffect(() => { setStoredData('sd_store_admin_apps', storeAdminApps); }, [storeAdminApps]);
  useEffect(() => { setStoredData('sd_store_admin_creds', storeAdminCreds); }, [storeAdminCreds]);

  // Toast System trigger helper
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ===== LIVE STOREFRONT & CLOUD SYNC =====
  const [storeKey, setStoreKey] = useState<string>(() => localStorage.getItem('sd_store_key') || 'nexago-main');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'online' | 'offline'>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [profile, setProfile] = useState(() => getStoredData('sd_store_profile', { storeName: '', storeSub: '', whatsapp: '' }));
  const configuredApiBase = ((import.meta.env.VITE_RELAY_BASE as string) || '').replace(/\/+$/, '');
  const apiBase = window.location.hostname.endsWith('.onrender.com')
    ? window.location.origin
    : (configuredApiBase || window.location.origin).replace(/\/+$/, '');
  const storefrontUrl = `${apiBase}/store?key=${encodeURIComponent(storeKey)}`;

  const handleStoreKeyChange = (key: string) => {
    const k = key.trim() || 'nexago-main';
    setStoreKey(k);
    localStorage.setItem('sd_store_key', k);
  };

  const handleProfileChange = (p: { storeName: string; storeSub: string; whatsapp: string }) => {
    const next = { storeName: p.storeName.trim(), storeSub: p.storeSub.trim(), whatsapp: p.whatsapp.trim() };
    setProfile(next);
    setStoredData('sd_store_profile', next);
    showToast('Store branding saved — pushed to customer site', 'success');
  };

  const pushState = async (silent = false) => {
    try {
      const payload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        profile,
        products,
        categories,
        stores,
        branches,
        coupons,
        reviews,
        banners,
        orders,
        notifications
      };
      const res = await fetch(`${apiBase}/api/state?key=${encodeURIComponent(storeKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('http ' + res.status);
      setLastSyncAt(new Date().toISOString());
      setSyncState('online');
      if (!silent) showToast('Data synced to live storefront — customers can see updates now', 'success');
    } catch {
      setSyncState('offline');
      if (!silent) showToast('Sync failed — check your internet or server status', 'info');
    }
  };

  const pullState = async () => {
    setSyncState('syncing');
    try {
      const res = await fetch(`${apiBase}/api/state?key=${encodeURIComponent(storeKey)}`);
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      if (data && data.state && data.state.updatedAt && (data.state.products || data.state.banners || data.state.stores)) {
        if (Array.isArray(data.state.products)) setProducts(stripDemoData(data.state.products, 'products'));
        if (Array.isArray(data.state.categories)) setCategories(data.state.categories);
        if (Array.isArray(data.state.stores)) setStores(stripDemoData(data.state.stores, 'stores'));
        if (Array.isArray(data.state.branches)) setBranches(data.state.branches);
        if (Array.isArray(data.state.coupons)) setCoupons(data.state.coupons);
        if (Array.isArray(data.state.reviews)) setReviews(data.state.reviews);
        if (Array.isArray(data.state.banners)) setBanners(stripDemoData(data.state.banners, 'banners'));
        if (Array.isArray(data.state.orders)) setOrders(stripDemoData(data.state.orders, 'orders'));
        if (Array.isArray(data.state.notifications)) setNotifications(stripDemoData(data.state.notifications, 'notifications'));
        setLastSyncAt(data.state.updatedAt);
        setSyncState('online');
        showToast('Pulled the latest cloud data for this store', 'success');
      } else {
        setSyncState('online');
        await pushState(true);
        showToast('No cloud data yet — local data published to the live storefront', 'success');
      }
    } catch {
      setSyncState('offline');
      showToast('Could not reach the sync server', 'info');
    }
  };

  const handleResetCloud = async () => {
    try {
      await fetch(`${apiBase}/api/reset?key=${encodeURIComponent(storeKey)}`, { method: 'POST' });
      setLastSyncAt(null);
      setSyncState('idle');
      showToast('Cloud copy cleared for this store key', 'info');
    } catch {
      showToast('Reset failed — server unreachable', 'info');
    }
  };

  const seedCloudIfEmpty = async () => {
    setSyncState('syncing');
    try {
      const res = await fetch(`${apiBase}/api/state?key=${encodeURIComponent(storeKey)}`);
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      const hasCloud = data && data.state && (
        (Array.isArray(data.state.products) && data.state.products.length) ||
        (Array.isArray(data.state.stores) && data.state.stores.length) ||
        (Array.isArray(data.state.branches) && data.state.branches.length) ||
        (Array.isArray(data.state.categories) && data.state.categories.length) ||
        (Array.isArray(data.state.coupons) && data.state.coupons.length) ||
        (Array.isArray(data.state.banners) && data.state.banners.length) ||
        (Array.isArray(data.state.orders) && data.state.orders.length)
      );
      if (hasCloud) {
        setLastSyncAt(data.state.updatedAt || null);
        setSyncState('online');
      } else {
        setSyncState('online');
        await pushState(true);
      }
    } catch {
      setSyncState('offline');
    }
  };

  // Auto-push local changes to the live storefront (debounced)
  const firstSyncRun = useRef(true);
  useEffect(() => {
    if (firstSyncRun.current) { firstSyncRun.current = false; return; }
    const t = setTimeout(() => { pushState(true); }, 1500);
    return () => clearTimeout(t);
  }, [products, categories, stores, branches, coupons, reviews, banners, orders, notifications]);

  // On first load: seed the cloud with local data if the cloud is empty (local stays authoritative)
  useEffect(() => { seedCloudIfEmpty(); }, []);

  // Live pending-payment alerts: quietly poll the cloud and ring + toast on new Send Money submissions
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const pendingAckRef = useRef<Set<string>>(new Set());
  const [pendingPayments, setPendingPayments] = useState(0);
  const playAlertSound = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      [880, 1174, 1568, 1174].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        const t = ctx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.18);
      });
    } catch { /* audio unsupported */ }
  };
  const quietPull = async () => {
    try {
      const res = await fetch(`${apiBase}/api/state?key=${encodeURIComponent(storeKey)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.state && Array.isArray(data.state.orders)) setOrders(stripDemoData(data.state.orders, 'orders'));
    } catch { /* ignore */ }
  };
  useEffect(() => {
    const checkPending = () => {
      const pend = (ordersRef.current || []).filter((o: any) => o.paymentStatus === 'Pending');
      setPendingPayments(pend.length);
      for (const o of pend) {
        if (!pendingAckRef.current.has(o.id)) {
          pendingAckRef.current.add(o.id);
          playAlertSound();
          showToast(`🔔 New payment awaiting verification — Order #${o.id} (${o.storeName})`, 'info');
        }
      }
    };
    checkPending();
    const pullTimer = setInterval(quietPull, 20000);
    const checkTimer = setInterval(checkPending, 5000);
    return () => { clearInterval(pullTimer); clearInterval(checkTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expiry auto-waste: batch expired → auto Waste (runs on load + every 6 hours)
  useEffect(() => {
    const runWaste = () => {
      const res = runExpiryAutoWaste(products);
      if (res.wasted.length) {
        setProducts(res.products);
        const total = res.wasted.reduce((s, w) => s + w.qty, 0);
        res.wasted.forEach(w => {
          handleAddNotification({
            title: 'Expired stock auto-wasted',
            message: `"${w.batch.productName}" (batch ${w.batch.batchCode}) — ${w.qty} unit(s) expired on ${w.batch.expiry}, auto-moved to Waste.`,
            type: 'system'
          });
        });
        showToast(`${total} unit(s) expired → auto-wasted`, 'info');
      }
    };
    runWaste();
    const iv = setInterval(runWaste, 6 * 60 * 60 * 1000);
    return () => clearInterval(iv);
  }, [products]);

  // HANDLERS
  // Orders
  const handleAddOrder = (orderData: Omit<Order, 'id' | 'date'> & { id?: string }) => {
    const newId = orderData.id || makeOrderId();
    const newOrder: Order = {
      ...orderData,
      id: newId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      source: orderData.source || ((orderData.pickupCoords || orderData.deliveryCoords) ? 'customer-app' : 'counter')
    };

    // Auto-assign the nearest online live driver if none was chosen (customer orders)
    // Only for non-customer-app flows (simulator/counter). Customer-app orders wait
    // for the store to accept first, then get dispatched to a driver.
    const isCustomerApp = newOrder.source === 'customer-app' || newOrder.status === 'Pending';
    if (!newOrder.driverId && newOrder.pickupCoords && !isCustomerApp) {
      let best: { id: string } | null = null;
      let bestD = Infinity;
      for (const d of liveDrivers) {
        if (d.status === 'Offline') continue;
        const dd = Math.pow(d.lat - newOrder.pickupCoords.lat, 2) + Math.pow(d.lng - newOrder.pickupCoords.lng, 2);
        if (dd < bestD) { bestD = dd; best = d; }
      }
      if (best) {
        newOrder.driverId = best.id;
        setDrivers(drivers.map(d => d.id === best!.id ? { ...d, status: 'On-Delivery' as const } : d));
      }
    }

    setOrders([newOrder, ...orders]);

    // Customer-placed order → surface on admin live board
    if (newOrder.deliveryCoords || newOrder.pickupCoords) {
      handleAddNotification({
        title: `🛒 New Customer Order #${newId}`,
        message: `${newOrder.customerName} ordered from ${newOrder.storeName} (৳${newOrder.amount.toLocaleString()})${newOrder.driverId ? ` — rider ${newOrder.driverId} auto-assigned` : ' — waiting for store to accept'}`,
        type: 'order',
        audience: 'all'
      });
      // Tell the store + store admin a new order is waiting for them
      if (isCustomerApp) {
        handleAddNotification({
          title: `🛒 New Order For Store #${newId}`,
          message: `${newOrder.customerName} ordered from ${newOrder.storeName} (৳${newOrder.amount.toLocaleString()}) — accept to dispatch a rider.`,
          type: 'order',
          audience: 'store-admin',
          storeId: newOrder.storeName
        });
        handleAddNotification({
          title: `📢 Store Action Needed #${newId}`,
          message: `Accept order #${newId} from ${newOrder.storeName} so a driver can be assigned.`,
          type: 'system',
          audience: 'staff'
        });
      }
    }

    // Create matching transaction log
    const newTxn: Payment = {
      id: `PAY-${Date.now().toString().slice(-10)}`,
      orderId: newId,
      amount: orderData.amount,
      method: orderData.paymentMethod,
      status: orderData.status === 'Completed' ? 'Paid' : orderData.status === 'Cancelled' ? 'Failed' : 'Pending',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setPayments([newTxn, ...payments]);

    // Credit driver completed count / earnings
    if (orderData.driverId) {
      setDrivers(drivers.map(d => d.id === orderData.driverId ? {
        ...d,
        completedOrders: d.completedOrders + (orderData.status === 'Completed' ? 1 : 0),
        earnings: d.earnings + (orderData.status === 'Completed' ? orderData.amount * 0.8 : 0)
      } : d));
    }

    showToast(`Order #${newId} dispatched successfully!`);
  };

  // Same as handleAddOrder but without the global toast — used by the phone simulator,
  // which shows its own in-phone toast so nothing appears outside the device frames.
  const handleSilentAddOrder = (orderData: Omit<Order, 'id' | 'date'> & { id?: string }) => {
    const newId = orderData.id || makeOrderId();
    const newOrder: Order = {
      ...orderData,
      id: newId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      source: orderData.source || ((orderData.pickupCoords || orderData.deliveryCoords) ? 'customer-app' : 'counter')
    };

    if (!newOrder.driverId && newOrder.pickupCoords) {
      let best: { id: string } | null = null;
      let bestD = Infinity;
      for (const d of liveDrivers) {
        if (d.status === 'Offline') continue;
        const dd = Math.pow(d.lat - newOrder.pickupCoords.lat, 2) + Math.pow(d.lng - newOrder.pickupCoords.lng, 2);
        if (dd < bestD) { bestD = dd; best = d; }
      }
      if (best) {
        newOrder.driverId = best.id;
        setDrivers(drivers.map(d => d.id === best!.id ? { ...d, status: 'On-Delivery' as const } : d));
      }
    }

    setOrders([newOrder, ...orders]);

    if (newOrder.deliveryCoords || newOrder.pickupCoords) {
      handleAddNotification({
        title: `🛒 New Customer Order #${newId}`,
        message: `${newOrder.customerName} ordered from ${newOrder.storeName} (৳${newOrder.amount.toLocaleString()})${newOrder.driverId ? ` — rider ${newOrder.driverId} auto-assigned` : ''}`,
        type: 'order'
      });
    }

    const newTxn: Payment = {
      id: `PAY-${Date.now().toString().slice(-10)}`,
      orderId: newId,
      amount: orderData.amount,
      method: orderData.paymentMethod,
      status: orderData.status === 'Completed' ? 'Paid' : orderData.status === 'Cancelled' ? 'Failed' : 'Pending',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setPayments([newTxn, ...payments]);

    if (orderData.driverId) {
      setDrivers(drivers.map(d => d.id === orderData.driverId ? {
        ...d,
        completedOrders: d.completedOrders + (orderData.status === 'Completed' ? 1 : 0),
        earnings: d.earnings + (orderData.status === 'Completed' ? orderData.amount * 0.8 : 0)
      } : d));
    }
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    applyOrderUpdate(updatedOrder);
    showToast(`Order #${updatedOrder.id} successfully updated.`);
  };

  const handleSilentUpdateOrder = (updatedOrder: Order) => {
    applyOrderUpdate(updatedOrder);
  };

  const applyOrderUpdate = (updatedOrder: Order) => {
    const original = orders.find(o => o.id === updatedOrder.id);
    // Audit: log every status / driver change in the order timeline
    if (original) {
      if (original.status !== updatedOrder.status) {
        updatedOrder = appendTimeline(updatedOrder, updatedOrder.status.toLowerCase(), 'admin', `Status changed: ${original.status} → ${updatedOrder.status}`);
      } else if (original.driverId !== updatedOrder.driverId) {
        updatedOrder = appendTimeline(updatedOrder, 'reassigned', 'admin', `Rider changed: ${original.driverId || 'none'} → ${updatedOrder.driverId || 'none'}`);
      }
    }
    if (original && original.status !== 'Completed' && updatedOrder.status === 'Completed' && updatedOrder.driverId) {
      setDrivers(drivers.map(d => d.id === updatedOrder.driverId ? {
        ...d,
        completedOrders: d.completedOrders + 1,
        earnings: d.earnings + updatedOrder.amount * 0.8
      } : d));
    }

    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));

    // Update payment
    setPayments(payments.map(p => p.orderId === updatedOrder.id ? {
      ...p,
      status: updatedOrder.status === 'Completed' ? 'Paid' : updatedOrder.status === 'Cancelled' ? 'Failed' : 'Pending'
    } : p));
  };

  const handleDeleteOrder = (id: string) => {
    // Deleted orders are not erased — they are marked Cancelled so they stay in order history
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'Cancelled' as const } : o));
    setPayments(payments.map(p => p.orderId === id ? { ...p, status: 'Failed' as const } : p));
    showToast(`Order #${id} deleted (kept in history as Cancelled).`);
  };

  // Manually assign a driver to an order (used when driver rejects/doesn't accept)
  const handleAssignDriver = (order: Order, driverId: string) => {
    const updated = { ...order, driverId };
    handleUpdateOrder(updated);
    setDriverDispatchOrder(null);
    setAdminDispatchOrder(updated);
    showToast(`Order #${order.id} assigned to ${driverId} and pushed to Driver App (auto-online)`, 'success');
  };

  // Re-activate a cancelled order — push it straight to the chosen destination app
  const handleReactivateOrder = (order: Order, destination: 'driver' | 'customer' | 'store') => {
    const updated = { ...order, status: (destination === 'store' ? 'Confirmed' : 'Ongoing') as Order['status'] };
    handleUpdateOrder(updated);
    if (destination === 'driver') {
      setAdminDispatchOrder(updated);
      showToast(`Order #${order.id} re-activated → Driver App (resume delivery).`, 'success');
    } else if (destination === 'customer') {
      setCustomerDispatchOrder(updated);
      showToast(`Order #${order.id} re-activated → Customer App only.`, 'success');
    } else {
      showToast(`Order #${order.id} re-activated → Store queue.`, 'success');
    }
  };

  // Drivers
  const handleAddDriver = (driverData: Omit<Driver, 'id' | 'completedOrders' | 'earnings'>) => {
    let newId = '';
    do { newId = `3${Math.floor(100000000 + Math.random() * 899999999)}`.slice(0, 10); }
    while (drivers.some(d => d.id === newId));
    const newDriver: Driver = {
      ...driverData,
      id: newId,
      completedOrders: 0,
      earnings: 0
    };
    setDrivers([...drivers, newDriver]);
    // Generate a permanent login password for admin-created fleet drivers so
    // they can log in on the driver site immediately.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    let creds: Record<string, { phone: string; password: string }> = {};
    try { creds = JSON.parse(localStorage.getItem('sd_driver_creds') || '{}'); } catch { creds = {}; }
    creds[newId] = { phone: driverData.phone || '', password: pwd };
    localStorage.setItem('sd_driver_creds', JSON.stringify(creds));
    showToast(`Driver ${driverData.name} registered! ID: ${newId} · Password: ${pwd}`, 'success');
  };

  const handleUpdateDriver = (updatedDriver: Driver) => {
    const prev = drivers.find(d => d.id === updatedDriver.id);
    setDrivers(drivers.map(d => d.id === updatedDriver.id ? updatedDriver : d));
    // When an admin approves a pending registration, generate the driver's
    // permanent random password into sd_driver_creds so they can log in with
    // their numeric driver ID + this password.
    const justApproved = prev && prev.verificationStatus !== 'Verified' && updatedDriver.verificationStatus === 'Verified';
    if (justApproved) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
      let pwd = '';
      for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
      let creds: Record<string, { phone: string; password: string }> = {};
      try { creds = JSON.parse(localStorage.getItem('sd_driver_creds') || '{}'); } catch { creds = {}; }
      creds[updatedDriver.id] = { phone: updatedDriver.phone || '', password: pwd };
      localStorage.setItem('sd_driver_creds', JSON.stringify(creds));
      showToast(`Driver ${updatedDriver.name} approved! Password: ${pwd}`, 'success');
      return;
    }
    showToast(`Driver profile ${updatedDriver.id} updated.`);
  };

  const handleDeleteDriver = (id: string) => {
    setDrivers(drivers.filter(d => d.id !== id));
    showToast(`Driver ${id} deleted from fleet.`);
  };

  // Zones
  const handleAddZone = (zoneData: Omit<Zone, 'id' | 'ordersCount' | 'earnings'>) => {
    const newId = `Z-${zones.length + 1}`;
    const newZone: Zone = {
      ...zoneData,
      id: newId,
      ordersCount: 0,
      earnings: 0,
      pendingOrders: zoneData.pendingOrders ?? 0,
      activeDrivers: zoneData.activeDrivers ?? 0,
      avgDeliveryMin: zoneData.avgDeliveryMin ?? 0,
      totalKm: zoneData.totalKm ?? 0,
      coveragePct: zoneData.coveragePct ?? 100,
      drivers: zoneData.drivers ?? [],
      deliveryFee: zoneData.deliveryFee ?? 50,
      minOrder: zoneData.minOrder ?? 100,
      operatingHours: zoneData.operatingHours ?? '9AM-11PM',
      peakHourOrders: zoneData.peakHourOrders ?? 0,
      returnRate: zoneData.returnRate ?? 0,
      satisfaction: zoneData.satisfaction ?? 90,
      coords: zoneData.coords
    };
    setZones([...zones, newZone]);
    showToast(`Zone ${zoneData.name} activated.`);
  };

  const handleUpdateZone = (updatedZone: Zone) => {
    setZones(zones.map(z => z.id === updatedZone.id ? updatedZone : z));
    showToast(`Zone ${updatedZone.id} updated.`);
  };

  const handleDeleteZone = (id: string) => {
    setZones(zones.filter(z => z.id !== id));
    showToast(`Zone ${id} deactivated.`);
  };

  // Users
  const handleAddUser = (userData: User) => {
    setUsers([userData, ...users]);
    showToast(`Account for ${userData.name} configured.`);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.phone === updatedUser.phone ? updatedUser : u));
    showToast(`User ${updatedUser.name} profile adjusted.`);
  };

  const handleDeleteUser = (phone: string) => {
    setUsers(users.filter(u => u.phone !== phone));
    showToast("User account terminated.");
  };

  // Vehicles
  const handleAddVehicle = (vehicle: Vehicle) => {
    setVehicles([...vehicles, vehicle]);
    showToast(`Vehicle ${vehicle.plateNumber} logged.`);
  };

  const handleDeleteVehicle = (plateNo: string) => {
    setVehicles(vehicles.filter(v => v.plateNumber !== plateNo));
    showToast("Vehicle unlinked.");
  };

  // Banners
  const handleAddBanner = (bannerData: Omit<PromotionBanner, 'id'>) => {
    const newId = `BAN-${banners.length + 1}`;
    const newBanner: PromotionBanner = {
      ...bannerData,
      id: newId
    };
    setBanners([...banners, newBanner]);
    showToast("Promotional banner campaign published.");
  };

  const handleDeleteBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
    showToast("Banner removed.");
  };

  // Notifications
  const handleAddNotification = (notifData: Omit<SystemNotification, 'id' | 'time' | 'read'>) => {
    const newNotif: SystemNotification = {
      ...notifData,
      id: `NOTIF-${notifications.length + 1}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications([newNotif, ...notifications]);
  };

  const handlePosSaleRecorded = (items: { productId: string; name: string; qty: number; price: number }[], source: 'counter' | 'delivery') => {
    if (!items.length) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().slice(0, 10);
    const ledger = getStoredData<any[]>('sd_stock_ledger', []);
    const entries = items.map(it => ({
      id: 'LED-' + Math.floor(100 + Math.random() * 900),
      productId: it.productId,
      productName: it.name,
      type: 'Sale',
      qty: -Math.abs(it.qty),
      reason: source === 'delivery' ? 'POS delivery dispatch' : 'POS counter sale',
      by: 'POS',
      time: nowTime,
      date: today
    }));
    setStoredData('sd_stock_ledger', [...entries, ...ledger]);
    items.forEach(it => {
      const p = products.find((x: any) => x.id === it.productId);
      if (!p) return;
      const after = Math.max(0, (p.stock ?? 0) - it.qty);
      if (after <= (p.reorderPoint ?? 5)) {
        handleAddNotification({ title: 'Low stock alert', message: `"${it.name}" fell to ${after} after a POS sale — reorder point is ${p.reorderPoint ?? 5}.`, type: 'system' });
      }
    });
    showToast(`${items.length} item(s) deducted from inventory stock`, 'success');
  };

  const handleOrderReport = (rep: { orderId: string; reason: string; note: string }) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOrderReports(prev => {
      const existing = prev.find(r => r.orderId === rep.orderId && r.reason === rep.reason && r.time === timeNow);
      if (existing) return prev;
      return [{ orderId: rep.orderId, reason: rep.reason, note: rep.note, time: timeNow, status: 'Open' }, ...prev];
    });
    // Auto-create a linked Support Ticket for this report (only once per order)
    setSupportTickets(prev => {
      const linked = prev.some(t => t.subject.includes(`order ${rep.orderId}`) || t.messages.some(m => m.text.includes(rep.orderId)));
      if (linked) return prev;
      const order = orders.find(o => o.id === rep.orderId);
      const newTicket: SupportTicket = {
        id: `TCK-80${prev.length + 1}`,
        user: 'Customer',
        subject: `Report on order ${rep.orderId} — ${rep.reason}`,
        priority: ((order && order.amount >= 500) || /urgent|not delivered|never came/i.test(rep.reason)) ? 'High' : 'Medium',
        status: 'Open',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        messages: [{ sender: 'user', text: `Report on order ${rep.orderId}: ${rep.reason}${rep.note ? ' — ' + rep.note : ''}`, time: timeNow }]
      };
      return [newTicket, ...prev];
    });
    handleAddNotification({ title: '📢 Customer Report — ' + rep.orderId, message: `${rep.reason}${rep.note ? ' · ' + rep.note : ''}`, type: 'system' });
  };

  // Admin opens a customer report -> it becomes "Under Review" (customer then sees tracking paused)
  const handleOpenReport = (orderId: string) => {
    setOrderReports(prev => prev.map(r => r.orderId === orderId && r.status !== 'Resolved' ? { ...r, status: 'Under Review' } : r));
  };

  // Admin replies to a customer report -> the reply is shown to the customer and report is Resolved
  const handleReportReply = (orderId: string, reply: string) => {
    setOrderReports(prev => prev.map(r => r.orderId === orderId ? { ...r, status: 'Resolved', adminReply: reply } : r));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    showToast("All system alerts cleared.");
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    showToast("Notifications center purged.");
  };

  // Support
  const handleReplyTicket = (id: string, message: string) => {
    setSupportTickets(supportTickets.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'Resolved',
          replies: [
            ...t.replies,
            {
              sender: 'Support Desk',
              message,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return t;
    }));
    showToast("Reply sent to customer inbox.");
  };

  const handleUpdateTicketStatus = (id: string, newStatus: SupportTicket['status']) => {
    setSupportTickets(supportTickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
    showToast(`Ticket status updated to: ${newStatus}`);
  };

  // Support Desk refund → mark the order's payment as Refunded in the Payments module
  const handlePaymentRefund = (orderId: string, amount: number, reason: string) => {
    setPayments(payments.map(p => p.orderId === orderId ? { ...p, status: 'Refunded' as const } : p));
    showToast(`Payment for #${orderId} marked Refunded (Tk ${amount.toFixed(2)}) · ${reason}`, 'info');
  };

  const createStaffLogin = (member: any, password = '') => {
    const docs = Array.isArray(member.documents) ? member.documents : [];
    const hasFullKyc = docs.length >= 3 && docs.every((d: any) => d && (d.fileId || d.ref));
    if (!hasFullKyc || member.documentStatus !== 'Verified' || member.status !== 'Active') {
      showToast('KYC verified na hole staff login create kora jabe na.', 'info');
      return;
    }
    if (!password) {
      setStaffLoginTarget(member);
      setStaffLoginPassword('');
      return;
    }
    if (!password || password.length < 8) {
      showToast('Staff password must be at least 8 characters.', 'info');
      return;
    }
    const userId = String(member.id || '').trim();
    securityApi('/admin-set-password', {
      userId,
      password,
      role: 'staff',
      storeId: member.storeId || '',
      branchId: member.branchId || '',
      permissions: member.permissions || [],
      reason: 'Super Admin created staff portal login',
    }).then(() => {
      const now = new Date().toISOString();
      setStaff(prev => prev.map((s: any) => s.id === member.id ? { ...s, loginEnabled: true, loginCreatedAt: now, updatedAt: now } : s));
      setStaffLoginTarget(null);
      setStaffLoginPassword('');
      securityAudit('staff-login-created', { actor: 'super-admin', newValue: { staffId: userId, staffName: member.name }, reason: 'staff portal account created' });
      showToast(`Staff login ready. ID: ${userId}`, 'success');
    }).catch((err) => {
      showToast(`Staff login could not be created: ${String(err?.message || 'Check server security config')}`, 'info');
    });
  };

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });

  const compressStaffPhoto = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(String(reader.result || '')); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });

  const addSuperAdminStaff = () => {
    setStaffKycForm({
      name: '', fatherName: '', motherName: '', dob: '', gender: '', nationality: 'Bangladeshi', bloodGroup: '',
      phone: '', email: '', emergencyContact: '', nid: '', passport: '', birthCertificate: '', documentExpiry: '',
      address: '', permanentAddress: '', district: '', upazila: '', postCode: '',
      role: 'Support Staff', shift: 'Full Time', joiningDate: '', supervisor: '', contractType: '', salaryNote: '',
      referenceOne: '', referenceTwo: '', deviceAccess: 'Allowed after approval', confirmTruth: false,
      permissions: 'support,orders,reports,notifications'
    });
    setStaffKycFiles({});
    setStaffKycStep(1);
    setStaffKycOpen(true);
  };

  const submitSuperAdminStaffKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    const draft = staffKycForm;
    const required = [draft.name, draft.fatherName, draft.motherName, draft.dob, draft.gender, draft.phone, draft.emergencyContact, draft.nid, draft.address, draft.permanentAddress, draft.district, draft.upazila, draft.role, draft.shift, draft.joiningDate, draft.referenceOne, draft.referenceTwo];
    if (required.some(v => !String(v || '').trim())) {
      showToast('All required KYC fields must be filled before submit.', 'info');
      return;
    }
    if (!draft.confirmTruth) {
      showToast('Review confirmation checkbox is required.', 'info');
      return;
    }
    const permissions = draft.permissions.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
    if (!permissions.length) {
      showToast('At least one staff permission is required.', 'info');
      return;
    }
    const duplicate = staff.find((s: any) =>
      String(s.nid || '').trim().toLowerCase() === draft.nid.trim().toLowerCase() ||
      String(s.phone || '').trim() === draft.phone.trim()
    );
    if (duplicate) {
      showToast(`Duplicate KYC blocked. Same phone/document already exists for ${duplicate.id}.`, 'info');
      return;
    }
    const { identity: nidFile, photo: photoFile, police: policeFile } = staffKycFiles;
    if (!nidFile || !photoFile || !policeFile) {
      showToast('Identity, photo and police/reference files are required.', 'info');
      return;
    }
    setStaffKycBusy(true);
    const id = `STF-${Date.now().toString().slice(-7)}`;
    const permanentNumber = `NXG${new Date().getFullYear()}${Date.now().toString().slice(-8)}`;
    const now = new Date().toISOString();
    const uploadDoc = async (type: string, file: File) => {
      const dataUrl = await fileToDataUrl(file);
      return secureFileUpload({ name: file.name, type: file.type, dataUrl }, { owner: id, role: 'staff', type: `staff-kyc-${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` });
    };
    let uploadedDocs: any[];
    try {
      uploadedDocs = await Promise.all([
        uploadDoc('Identity Document', nidFile),
        uploadDoc('Staff Photo', photoFile),
        uploadDoc('Police Reference Check', policeFile),
      ]);
    } catch (err) {
      setStaffKycBusy(false);
      showToast(`KYC file upload failed: ${String((err as any)?.message || err)}`, 'info');
      return;
    }
    const member = {
      id,
      permanentNumber,
      name: draft.name.trim(),
      fatherName: draft.fatherName.trim(),
      motherName: draft.motherName.trim(),
      dob: draft.dob.trim(),
      gender: draft.gender.trim(),
      nationality: draft.nationality.trim(),
      bloodGroup: draft.bloodGroup.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      emergencyContact: draft.emergencyContact.trim(),
      nid: draft.nid.trim(),
      passport: draft.passport.trim(),
      birthCertificate: draft.birthCertificate.trim(),
      documentExpiry: draft.documentExpiry.trim(),
      address: draft.address.trim(),
      permanentAddress: draft.permanentAddress.trim(),
      district: draft.district.trim(),
      upazila: draft.upazila.trim(),
      postCode: draft.postCode.trim(),
      role: draft.role.trim(),
      shift: draft.shift.trim(),
      joiningDate: draft.joiningDate.trim(),
      supervisor: draft.supervisor.trim(),
      contractType: draft.contractType.trim(),
      salaryNote: draft.salaryNote.trim(),
      referenceOne: draft.referenceOne.trim(),
      referenceTwo: draft.referenceTwo.trim(),
      deviceAccess: draft.deviceAccess.trim(),
      permissions,
      status: 'Pending Verification',
      scope: 'super-admin',
      documentStatus: 'Submitted',
      documents: [
        { type: 'Identity Document', ref: uploadedDocs[0].privateUrl || uploadedDocs[0].name, fileId: uploadedDocs[0].secureFile?.id, sha256: uploadedDocs[0].secureFile?.sha256, submittedAt: now, status: 'Stored' },
        { type: 'Staff Photo', ref: uploadedDocs[1].privateUrl || uploadedDocs[1].name, fileId: uploadedDocs[1].secureFile?.id, sha256: uploadedDocs[1].secureFile?.sha256, submittedAt: now, status: 'Stored' },
        { type: 'Police/Reference Check', ref: uploadedDocs[2].privateUrl || uploadedDocs[2].name, fileId: uploadedDocs[2].secureFile?.id, sha256: uploadedDocs[2].secureFile?.sha256, submittedAt: now, status: 'Stored' },
      ],
      auditTrail: [
        { action: 'staff-document-submitted', actor: 'super-admin', at: now, reason: 'new staff onboarding documents submitted before confirmation' },
      ],
      createdAt: now,
      updatedAt: now,
    };
    setStaff(prev => [member, ...prev]);
    setStaffKycBusy(false);
    setStaffKycOpen(false);
    securityAudit('staff-record-created', { actor: 'super-admin', newValue: { staffId: id, name: member.name, role: member.role, documentStatus: member.documentStatus }, reason: 'super admin staff record created with required documents' });
    showToast(`Staff document record saved. ID: ${id}`, 'success');
  };

  const viewStaffDocuments = (member: any) => {
    setStaffKycViewing(member);
  };

  const openStaffDocuments = async (member: any) => {
    const docs = (member.documents || []).filter((doc: any) => doc.ref);
    if (!docs.length) {
      showToast('No KYC file found for this staff.', 'info');
      return;
    }
    const first = docs[0];
    let previewDataUrl = '';
    try {
      if (first.fileId) {
        const fileData = await securityApi(`/file/${first.fileId}`);
        previewDataUrl = fileData.dataUrl || '';
      }
    } catch {
      /* metadata still opens in the panel */
    }
    setStaffKycViewing({ ...member, previewDataUrl, previewDoc: first });
    securityAudit('staff-kyc-files-opened', { actor: 'super-admin', newValue: { staffId: member.id, files: docs.map((d: any) => d.fileId || d.ref) }, reason: 'super admin opened staff KYC files' });
  };

  const openStaffIdCard = async (member: any) => {
    const photoDoc = (member.documents || []).find((doc: any) => String(doc.type || '').toLowerCase().includes('photo'));
    let photoDataUrl = '';
    try {
      if (photoDoc?.fileId) {
        const fileData = await securityApi(`/file/${photoDoc.fileId}`);
        photoDataUrl = fileData.dataUrl || '';
      }
    } catch {
      /* card still opens with initials */
    }
    if (!photoDataUrl) {
      photoDataUrl = member.photoDataUrl;
    }
    const issuedAt = member.cardIssuedAt || member.verifiedAt || member.createdAt || new Date().toISOString();
    const expiresAt = member.cardExpiresAt || new Date(new Date(issuedAt).setFullYear(new Date(issuedAt).getFullYear() + 1)).toISOString();
    setStaffIdCard({ ...member, photoDataUrl, issuedAt, expiresAt });
    securityAudit('staff-id-card-opened', { actor: 'super-admin', newValue: { staffId: member.id }, reason: 'digital smart ID card preview opened' });
  };

  const staffCardHtml = (card: any) => `<!doctype html><html><head><meta charset="utf-8"><title>${card.id} Staff ID</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{min-height:100vh;background:#111827}
    body{display:grid;place-items:center;font-family:Inter,Arial,sans-serif}
    .card{width:85.6mm;height:54mm;padding:4mm;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;border-radius:4mm;color:#fff;background:linear-gradient(135deg,#07111f,#102138 60%,#f97316)}
    .shine{position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.14),transparent 35%,rgba(255,255,255,.08))}
    .ring{position:absolute;right:-10mm;top:-10mm;width:28mm;height:28mm;border-radius:9999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05)}
    .head{display:flex;justify-content:space-between;align-items:flex-start;position:relative}
    .brand{font-size:2.1mm;font-weight:900;text-transform:uppercase;letter-spacing:.2em;color:#ffedd5}
    .sub{font-size:1.85mm;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,.7);margin-top:.6mm}
    .logo{width:8.5mm;height:8.5mm;display:flex;align-items:center;justify-content:center;border-radius:2mm;background:linear-gradient(135deg,#fff,#fde68a 55%,#fb923c);color:#0b1220;font-size:2.6mm;font-weight:900;box-shadow:0 0 0 .3mm rgba(251,146,60,.6),0 2mm 4mm rgba(249,115,22,.2)}
    .mid{display:grid;grid-template-columns:29mm minmax(0,1fr) 16mm;gap:3mm;align-items:end;position:relative}
    .photoCol{display:flex;flex-direction:column;align-items:center}
    .photo{width:29mm;height:20mm;border-radius:3mm;overflow:hidden;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1)}
    .photo img{width:100%;height:100%;object-fit:cover;object-position:${card.photoX || 50}% ${card.photoY || 50}%;transform:scale(${card.photoScale || 1});transform-origin:${card.photoX || 50}% ${card.photoY || 50}%}
    .bar{width:100%;margin-top:1mm;display:flex;flex-direction:column;align-items:center;gap:.5mm}.barImg{width:100%;height:12mm;overflow:hidden}.barImg img{width:100%;height:100%;object-fit:fill;display:block}.barTxt{font-size:1.7mm;font-weight:800;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,.9);letter-spacing:.5mm;white-space:nowrap;text-align:center}
    .info{min-width:0}
    .name{font-size:3.7mm;font-weight:900;text-transform:uppercase;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .meta{font-size:2.1mm;font-weight:700;text-transform:uppercase;color:#ffedd5;margin-top:.6mm;line-height:1.3;overflow:visible}
    .grey{font-size:1.85mm;font-weight:700;color:rgba(255,255,255,.7);margin-top:.6mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .id{font-size:2.1mm;font-weight:900;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,.9);margin-top:1mm}
    .qr{width:17mm;height:17mm;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.3);border-radius:2mm;padding:1mm;align-self:center}
    .qr svg{width:100%;height:100%}
    .foot{display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.15);padding-top:1mm;font-size:1.7mm;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,.7);position:relative}
    @media print{html,body{display:block;margin:0;padding:0;background:#fff;min-height:0;place-items:initial}@page{size:85.6mm 54mm;margin:0}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}
  </style></head><body><div class="card"><div class="shine"></div><div class="ring"></div>
  <div class="head"><div><div class="brand">The NexaGo BD</div><div class="sub">Super Admin Staff</div></div><div class="logo">NXG</div></div>
  <div class="mid"><div class="photoCol"><div class="photo"><img src="${card.photoDataUrl || staffInitialsAvatarDataUrl(card.name)}"></div></div>
  <div class="info"><div class="name">${card.name || 'Staff Name'}</div><div class="meta">${card.role || 'Staff'} · ${card.contractType || 'Official'}</div><div class="grey">Join: ${card.joiningDate || new Date(card.createdAt || Date.now()).toLocaleDateString()}</div><div class="id">ID: ${staffCardCode(card)}</div><div class="grey">Phone: ${card.phone || 'N/A'}</div></div>
  <div class="qr">${staffCardQrSvg(card)}</div></div>
  <div class="bar"><div class="barImg"><img src="${code39SvgDataUrlThick(staffCardBarcodeCode(card))}"></div><div class="barTxt">${staffCardBarcodeCode(card)}</div></div>
  <div class="foot"><span>Issue: ${new Date(card.issuedAt).toLocaleDateString()}</span><span>Expire: ${new Date(card.expiresAt).toLocaleDateString()}</span><span>${card.status || ''}</span></div>
  </div></body></html>`;

  const downloadStaffIdCard = (card: any) => {
    // Self-contained HTML (inline CSS, real photo, real barcode, real QR) so the
    // saved file always renders the same original card — no app CSS dependency.
    const blob = new Blob([staffCardHtml(card)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.permanentNumber || card.id}-smart-id-card.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printStaffIdCard = (card: any) => {
    // Print the ORIGINAL 85.6mm x 54mm card. Body HTML is fully self-contained
    // (its own inline CSS, data-url photo/barcode, inline SVG QR) — the print
    // output never depends on the running app styles being reachable.
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    let done = false;
    const doPrint = () => {
      if (done) return;
      done = true;
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1500);
    };
    const doc = frame.contentDocument;
    if (!doc) { frame.remove(); return; }
    doc.open();
    doc.write(staffCardHtml(card));
    doc.close();
    setTimeout(doPrint, 500);
  };

  const changeStaffCardPhoto = async (card: any, file?: File | null) => {
    if (!file) return;
    const dataUrl = await compressStaffPhoto(file);
    const now = new Date().toISOString();
    setStaff(prev => prev.map((s: any) => s.id === card.id ? {
      ...s,
      photoDataUrl: dataUrl,
      updatedAt: now,
      auditTrail: [...(s.auditTrail || []), { action: 'staff-card-photo-updated', actor: 'super-admin', at: now, reason: 'smart staff ID card photo changed' }],
    } : s));
    setStaffIdCard((prev: any) => prev && prev.id === card.id ? { ...prev, photoDataUrl: dataUrl, updatedAt: now } : prev);
    securityAudit('staff-card-photo-updated', { actor: 'super-admin', newValue: { staffId: card.id }, reason: 'smart staff ID card photo changed' });
    showToast('Staff card photo updated and saved permanently.', 'success');
  };

  const updateStaffCardPhotoSetting = (card: any, key: 'photoScale' | 'photoX' | 'photoY', value: number) => {
    const now = new Date().toISOString();
    const nextValue = key === 'photoScale' ? Math.max(1, Math.min(1.8, value)) : Math.max(0, Math.min(100, value));
    setStaff(prev => prev.map((s: any) => s.id === card.id ? {
      ...s,
      [key]: nextValue,
      updatedAt: now,
      auditTrail: [...(s.auditTrail || []), { action: 'staff-card-photo-size-updated', actor: 'super-admin', at: now, reason: `smart staff ID card ${key} adjusted`, newValue: nextValue }],
    } : s));
    setStaffIdCard((prev: any) => prev && prev.id === card.id ? { ...prev, [key]: nextValue, updatedAt: now } : prev);
  };

  const openStaffRenewal = (card: any) => {
    setStaffRenewalForm({
      role: card.role || '',
      shift: card.shift || '',
      joiningDate: card.joiningDate || '',
      phone: card.phone || '',
      address: card.address || '',
      emergencyContact: card.emergencyContact || '',
      reason: '',
    });
    setStaffRenewalStep(1);
    setStaffRenewalRef('');
    setStaffRenewalOpen(true);
  };

  const renewStaffIdCard = (card: any) => {
    if (!staffRenewalForm.reason.trim()) {
      showToast('Renew reason required. Eta permanent audit-e save hobe.', 'info');
      setStaffRenewalStep(3);
      return;
    }
    const now = new Date().toISOString();
    const expiresAt = new Date(new Date(now).setFullYear(new Date(now).getFullYear() + 1)).toISOString();
    const ref = `NXG-RENEW-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(card.permanentNumber || card.id || 'STAFF').replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${Date.now().toString().slice(-8)}`;
    const renewed = { ...card, ...staffRenewalForm, cardIssuedAt: now, cardExpiresAt: expiresAt, lastRenewalRef: ref, updatedAt: now };
    setStaff(prev => prev.map((s: any) => s.id === card.id ? {
      ...s,
      ...staffRenewalForm,
      cardIssuedAt: now,
      cardExpiresAt: expiresAt,
      lastRenewalRef: ref,
      updatedAt: now,
      auditTrail: [...(s.auditTrail || []), { action: 'staff-id-card-renewed', actor: 'super-admin', at: now, reason: staffRenewalForm.reason.trim(), ref }],
    } : s));
    setStaffIdCard({ ...renewed, issuedAt: now, expiresAt });
    setStaffRenewalRef(ref);
    setStaffRenewalStep(4);
    securityAudit('staff-id-card-renewed', { actor: 'super-admin', newValue: { staffId: card.id, cardIssuedAt: now, cardExpiresAt: expiresAt, ref }, reason: staffRenewalForm.reason.trim() });
    showToast('Staff ID card renewed and synced live.', 'success');
  };

  const updateStaffVerification = (member: any, nextStatus: 'Active' | 'Rejected' | 'Suspended', reason = '') => {
    const docs = Array.isArray(member.documents) ? member.documents : [];
    const hasFullKyc = docs.length >= 3 && docs.every((d: any) => d && (d.fileId || d.ref));
    if (nextStatus === 'Active' && !hasFullKyc) {
      showToast('3 ta KYC document submit na hole approve kora jabe na.', 'info');
      return;
    }
    if (!reason) {
      setStaffActionTarget({ member, status: nextStatus });
      setStaffActionReason('');
      return;
    }
    if (!reason?.trim()) {
      showToast('Reason is required and will be saved permanently.', 'info');
      return;
    }
    const now = new Date().toISOString();
    setStaff(prev => prev.map((s: any) => s.id === member.id ? {
      ...s,
      status: nextStatus,
      documentStatus: nextStatus === 'Active' ? 'Verified' : nextStatus,
      verifiedAt: nextStatus === 'Active' ? now : s.verifiedAt,
      updatedAt: now,
      auditTrail: [
        ...(s.auditTrail || []),
        { action: `staff-${nextStatus.toLowerCase()}`, actor: 'super-admin', at: now, reason: reason.trim() },
      ],
    } : s));
    setStaffActionTarget(null);
    setStaffActionReason('');
    securityAudit('staff-verification-updated', { actor: 'super-admin', oldValue: { staffId: member.id, status: member.status }, newValue: { staffId: member.id, status: nextStatus }, reason: reason.trim() });
    showToast(`Staff ${nextStatus} saved with audit reason.`, 'success');
  };

  const staffRiskOf = (member: any) => {
    const duplicatePhone = staff.filter((s: any) => s.id !== member.id && String(s.phone || '').trim() === String(member.phone || '').trim()).length;
    const duplicateDoc = staff.filter((s: any) => s.id !== member.id && String(s.nid || '').trim().toLowerCase() === String(member.nid || '').trim().toLowerCase()).length;
    const missingDocs = (member.documents || []).length < 3 || (member.documents || []).some((d: any) => !d.fileId && !d.ref);
    if (duplicatePhone || duplicateDoc) return { label: 'High Risk', tone: 'text-red-300 bg-red-500/10 border-red-500/30' };
    if (missingDocs || member.status === 'Pending Verification') return { label: 'Review', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30' };
    return { label: 'Clear', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' };
  };

  const filteredStaff = staff.filter((s: any) => {
    const haystack = [s.id, s.name, s.phone, s.nid, s.role, s.status, s.documentStatus].join(' ').toLowerCase();
    const matchesSearch = !staffKycSearch.trim() || haystack.includes(staffKycSearch.trim().toLowerCase());
    const archived = s.status === 'Archived' || s.archived;
    const matchesFilter = staffKycFilter === 'Archived' ? archived : (staffKycFilter === 'All' ? !archived : s.status === staffKycFilter && !archived);
    return matchesSearch && matchesFilter;
  });

  const archiveIncompleteStaff = (member: any) => {
    const docs = Array.isArray(member.documents) ? member.documents : [];
    if (docs.length >= 3) {
      showToast('Complete KYC record archive korar age Suspend/Reject use korun.', 'info');
      return;
    }
    const now = new Date().toISOString();
    setStaff(prev => prev.map((s: any) => s.id === member.id ? {
      ...s,
      status: 'Archived',
      archived: true,
      archivedAt: now,
      updatedAt: now,
      loginEnabled: false,
      auditTrail: [
        ...(s.auditTrail || []),
        { action: 'staff-incomplete-archived', actor: 'super-admin', at: now, reason: 'incomplete/not-submitted KYC hidden from active queue' },
      ],
    } : s));
    securityAudit('staff-incomplete-archived', { actor: 'super-admin', newValue: { staffId: member.id }, reason: 'incomplete KYC archived from main queue' });
    showToast('Incomplete staff record archived. Recovery Archived filter-e thakbe.', 'success');
  };

  const applyStaffScan = (code: string) => {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return;
    const match = staff.find((s: any) => String(s.permanentNumber || s.id || '').toUpperCase().trim() === clean || String(s.id || '').toUpperCase().trim() === clean);
    if (match) {
      setStaffScanMsg(null);
      setStaffScanManual('');
      setStaffScanOpen(false);
      openStaffIdCard(match);
      securityAudit('staff-id-card-scanned', { actor: 'super-admin', newValue: { staffId: match.id, scanned: clean }, reason: 'staff ID card barcode/QR scanned and opened' });
      showToast(`${match.name} — full card opened.`, 'success');
    } else {
      setStaffScanMsg(`No staff matches "${clean}". Verify the Permanent No on the card.`);
    }
  };

  const scanStaffCleanup = () => {
    try { scannerRef.current?.stop().then(() => scannerRef.current?.clear()).catch(() => {}); } catch { /* noop */ }
    scannerRef.current = null;
  };
  useEffect(() => {
    if (!staffScanOpen) { scanStaffCleanup(); return; }
    setStaffScanMsg(null);
    const scanner = new Html5Qrcode('staff-scan-video');
    scannerRef.current = scanner;
    let stopped = false;
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 180 } },
      (text) => {
        if (stopped) return;
        stopped = true;
        scanner.stop().then(() => scanner.clear()).catch(() => {});
        scannerRef.current = null;
        applyStaffScan(text);
      },
      () => { /* ignore decode errors */ }
    ).catch(() => { if (!stopped) setStaffScanMsg('Camera unavailable — type the Permanent No below.'); });
    return () => { stopped = true; scanStaffCleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffScanOpen]);

  // --- SIDEBAR NAVIGATION DEFINITION WITH ALL STORE & DELIVERY MANAGEMENT MODULES ---
  const sidebarItems = React.useMemo(() => {
    const allItems: Array<{ name: string; icon: any; badgeCount?: number; section?: string; onClick?: () => void }> = [
      // --- DELIVERY SYSTEM MANAGEMENT PANEL (Requested Screenshot) ---
      { section: 'Delivery System', name: 'Dashboard', icon: LayoutDashboard },
      { name: 'Mobile App Simulator', icon: Smartphone },
      { name: 'Users Management', icon: Users, badgeCount: users.length },
      { name: 'Drivers Management', icon: UserSquare2, badgeCount: drivers.length },
      { name: 'Orders Management', icon: ClipboardList, badgeCount: orders.length },
      { name: 'Earnings & Payouts', icon: DollarSign },
      { name: 'Zones & Areas', icon: MapPin, badgeCount: zones.length },
      { name: 'Vehicles Management', icon: Truck },
      { name: 'Promotions & Banners', icon: Megaphone, badgeCount: banners.length },
      { name: 'KPI Dashboard', icon: TrendingUp },

      // --- ORDER TOOLS (kept out of the All Orders header to stay clean) ---
      { section: 'Order Tools', name: 'Order Tools Dashboard', icon: Wrench },

      // --- PREVIOUS GROCERY STORE & CATALOG ADMIN ---
      { section: 'Store & Catalog Admin', name: 'Store Dashboard', icon: Store },
      { name: 'Products', icon: Box, badgeCount: products.length },
      { name: 'Categories', icon: FolderOpen },
      { name: 'Inventory', icon: ClipboardList },
      { name: 'Stores & Merchants', icon: Store, badgeCount: stores.length },
      { name: 'Staff Management', icon: ShieldCheck },
      { name: 'Reviews', icon: Star },
      { name: 'Coupons', icon: Ticket },
      { name: 'Customer Storefront', icon: Globe },
      { name: 'Live Store Sync', icon: CloudUpload },

      // --- SYSTEM OPERATIONS & FINANCE ---
      { section: 'Finance & System', name: 'Payments', icon: CreditCard },
      { name: 'MFS Business & Settlement', icon: Wallet },
      { name: 'POS System', icon: ShoppingCart },
      { name: 'Support Tickets', icon: LifeBuoy, badgeCount: supportTickets.filter(t => t.status === 'Open').length },
      { name: 'Notifications', icon: Bell, badgeCount: unreadNotifCount },
      { name: 'Reports & Analytics', icon: BarChart3 },
      { name: 'Security Control', icon: ShieldCheck },
      { name: 'Settings', icon: Settings },
    ];

    if (activePanelMode === 'super_admin') {
      return allItems;
    } else if (activePanelMode === 'delivery') {
      return allItems.filter(item => 
        [
          'Dashboard', 'Mobile App Simulator', 'Users Management', 'Drivers Management', 'Orders Management', 
          'Earnings & Payouts', 'Zones & Areas', 'Vehicles Management', 'Promotions & Banners', 'KPI Dashboard',
          'Order Tools Dashboard',
          'Payments', 'Support Tickets', 'Notifications', 'Reports & Analytics', 'Settings'
        ].includes(item.name)
      ).map((item) => {
        if (item.name === 'Dashboard') {
          return { ...item, section: 'Delivery System' };
        }
        if (item.name === 'Payments') {
          return { ...item, section: 'Finance & System' };
        }
        return { ...item, section: item.section };
      });
    } else if (activePanelMode === 'store') {
      return allItems.filter(item => 
        [
          'Store Dashboard', 'Products', 'Categories', 'Inventory', 
          'Stores & Merchants', 'Staff Management', 'Reviews', 'Coupons', 'Customer Storefront', 'Live Store Sync',
          'Payments', 'MFS Business & Settlement', 'Support Tickets', 'Notifications', 'Reports & Analytics', 'Settings'
        ].includes(item.name)
      ).map((item) => {
        if (item.name === 'Store Dashboard') {
          return { ...item, section: 'Store & Catalog Admin' };
        }
        if (item.name === 'Payments') {
          return { ...item, section: 'Finance & System' };
        }
        return { ...item, section: item.section };
      });
    }

    return allItems;
  }, [
    activePanelMode,
    users.length,
    drivers.length,
    orders.length,
    zones.length,
    banners.length,
    products.length,
    categories.length,
    stores.length,
    supportTickets,
    unreadNotifCount
  ]);

  // Quick Action Forms submit helper
  const handleQuickActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    if (quickActionModal === 'driver') {
      handleAddDriver({
        name: fd.get('name') as string,
        phone: fd.get('phone') as string,
        vehicleType: fd.get('vehicleType') as string,
        rating: 5.0,
        status: 'Online'
      });
    } else if (quickActionModal === 'user') {
      handleAddUser({
        id: `USR-${Math.floor(Math.random() * 9000) + 1000}`,
        name: fd.get('name') as string,
        email: fd.get('email') as string,
        phone: fd.get('phone') as string,
        role: fd.get('role') as any,
        status: 'Active',
        joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        ordersCount: 0
      });
    } else if (quickActionModal === 'zone') {
      handleAddZone({
        name: fd.get('name') as string,
        status: 'Active'
      });
    } else if (quickActionModal === 'notification') {
      handleAddNotification({
        title: fd.get('title') as string,
        message: fd.get('message') as string,
        type: 'system'
      });
    } else if (quickActionModal === 'banner') {
      handleAddBanner({
        title: fd.get('title') as string,
        subtitle: fd.get('subtitle') as string,
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        clicks: 0
      });
    }
    setQuickActionModal(null);
  };

  // Custom Interactive Renderer for newly requested sidebar items to keep app 100% functional
  const renderGenericView = (tabName: string) => {
    switch (tabName) {
      case 'Products':
        return (
          <ProductInventoryView
            products={products}
            onProductsChange={setProducts}
            showToast={showToast}
            onAddNotification={handleAddNotification}
          />
        );

      case 'Categories':
        return (
          <div className="space-y-6 fade-in">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Departmental Categories</h3>
              <p className="text-xs text-gray-400">Configure supermarket categories, grocery slots, and sub-sections</p>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-brand-dark/40 text-gray-400 border-b border-brand-border">
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Category Code</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Category Title</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Active Item Count</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {categories.map(c => (
                    <tr key={c.id} className="hover:bg-brand-dark/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-400 font-bold">#{c.id}</td>
                      <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-300">{c.itemsCount} SKUs</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'Stores': {
        const approveStoreAdmin = (app: any, approve: boolean) => {
          const nextStatus = approve ? 'Verified' : 'Rejected';
          const nextApps = storeAdminApps.map(a => a.adminId === app.adminId ? {
            ...a,
            status: nextStatus,
            reviewedAt: new Date().toLocaleString('en-GB'),
            documents: (a.documents || []).map((d: any) => ({ ...d, status: d.dataUrl ? nextStatus : d.status })),
          } : a);
          setStoreAdminApps(nextApps);
          if (approve) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
            let password = '';
            for (let i = 0; i < 10; i++) password += chars[Math.floor(Math.random() * chars.length)];
            setStoreAdminCreds({ ...storeAdminCreds, [app.adminId]: { password, storeId: app.storeId } });
            securityApi('/register', {
              role: 'store-admin',
              userId: app.adminId,
              password,
              storeId: app.storeId,
              reason: 'Super Admin approved Store Admin documents',
            }).catch(() => {});
            securityAudit('store-admin-approved', { actor: 'super-admin', storeId: app.storeId, newValue: { adminId: app.adminId }, reason: 'document verified and permanent password generated' });
            const storeRecord = {
              id: app.storeId,
              name: app.storeName,
              address: app.storeAddress,
              rating: 0,
              orders: 0,
              status: 'Active',
              category: app.businessType,
              ownerName: app.ownerName,
              phone: app.phone,
              email: app.email,
              adminId: app.adminId,
              siteUrl: `${window.location.origin}/store?key=${encodeURIComponent(app.storeId)}`,
              adminUrl: `${window.location.origin}/store-admin?key=${encodeURIComponent(app.storeId)}`,
              adminPages: app.adminPages && app.adminPages.length ? app.adminPages : DEFAULT_STORE_ADMIN_PAGES,
            };
            setStores(prev => prev.some(s => s.id === app.storeId) ? prev.map(s => s.id === app.storeId ? { ...s, ...storeRecord } : s) : [storeRecord, ...prev]);
            const primaryBranchPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
            setBranches(prev => prev.some((b: any) => b.id === `${app.storeId}-BR-001`) ? prev : [{
              id: `${app.storeId}-BR-001`,
              storeId: app.storeId,
              name: app.storeName,
              address: app.storeAddress,
              status: 'Active',
              manager: app.ownerName,
              phone: app.phone,
              branchAdminId: `${app.storeId}-BR-001-ADMIN`,
              branchPassword: primaryBranchPassword,
              adminUrl: `${window.location.origin}/store-admin?key=${encodeURIComponent(app.storeId)}&branch=${encodeURIComponent(`${app.storeId}-BR-001`)}`,
              createdAt: new Date().toLocaleString('en-GB'),
            }, ...prev]);
            showToast(`Store admin approved. ID: ${app.adminId} · Password: ${password}`, 'success');
          } else {
            showToast(`Store admin application ${app.adminId} rejected.`, 'info');
          }
        };

        const modifyStoreAdminApp = (app: any) => {
          const field = window.prompt('Field to modify: ownerName, phone, email, storeName, storeAddress, tradeLicenseNo, tinBin, settlementNumber, businessType');
          if (!field || !(field in app)) return;
          const value = window.prompt(`New value for ${field}`, app[field] || '');
          if (value === null) return;
          const reason = window.prompt('Required reason for modification');
          if (!reason?.trim()) { showToast('Modification reason is required and must be saved.', 'info'); return; }
          setStoreAdminApps(prev => prev.map((a: any) => a.id === app.id ? {
            ...a,
            [field]: value,
            modifiedAt: new Date().toLocaleString('en-GB'),
            modificationLog: [
              ...(a.modificationLog || []),
              { field, oldValue: app[field] || '', newValue: value, reason: reason.trim(), time: new Date().toISOString(), actor: 'super-admin' }
            ],
          } : a));
          showToast(`${field} modified with permanent reason.`, 'success');
        };

        const toggleStoreAdminPage = (storeId: string, pageId: string) => {
          if (pageId === 'dashboard') {
            showToast('Dashboard is required for Store Admin login.', 'info');
            return;
          }
          setStores(prev => prev.map((store: any) => {
            if (store.id !== storeId) return store;
            const current = store.adminPages && store.adminPages.length ? store.adminPages : DEFAULT_STORE_ADMIN_PAGES;
            const next = current.includes(pageId) ? current.filter((id: string) => id !== pageId) : [...current, pageId];
            return {
              ...store,
              adminPages: next,
              adminAccessUpdatedAt: new Date().toLocaleString('en-GB'),
              adminAccessLog: [
                ...(store.adminAccessLog || []),
                { pageId, action: current.includes(pageId) ? 'cancelled' : 'added', time: new Date().toISOString(), actor: 'super-admin' },
              ],
            };
          }));
          const page = STORE_ADMIN_PAGE_OPTIONS.find(p => p.id === pageId)?.label || pageId;
          showToast(`${page} Store Admin access updated.`, 'success');
        };

        const takeStoreAdminAction = (store: any, action: 'warning' | 'review' | 'suspend' | 'freeze' | 'restrict' | 'blacklist' | 'restore') => {
          const reason = window.prompt(`Required reason for ${action.toUpperCase()} action against ${store.name}`);
          if (!reason?.trim()) {
            showToast('Action reason is required and permanently saved.', 'info');
            return;
          }
          setStores(prev => prev.map((s: any) => {
            if (s.id !== store.id) return s;
            const currentPages = s.adminPages && s.adminPages.length ? s.adminPages : DEFAULT_STORE_ADMIN_PAGES;
            const next: any = {
              ...s,
              adminRiskStatus: action === 'restore' ? 'Clear' : action,
              paymentsFrozen: action === 'freeze' || (action !== 'restore' && s.paymentsFrozen),
              riskUpdatedAt: new Date().toLocaleString('en-GB'),
              riskActionLog: [
                ...(s.riskActionLog || []),
                { action, reason: reason.trim(), actor: 'super-admin', time: new Date().toISOString() },
              ],
            };
            if (action === 'suspend' || action === 'blacklist') next.status = action === 'blacklist' ? 'Blacklisted' : 'Suspended';
            if (action === 'restrict') next.adminPages = currentPages.filter((id: string) => ['dashboard', 'support', 'alerts'].includes(id));
            if (action === 'restore') {
              next.status = 'Active';
              next.paymentsFrozen = false;
              next.adminPages = currentPages.length > 3 ? currentPages : DEFAULT_STORE_ADMIN_PAGES;
            }
            return next;
          }));
          setStoreAdminApps(prev => prev.map((app: any) => app.storeId === store.id ? {
            ...app,
            riskStatus: action === 'restore' ? 'Clear' : action,
            riskActionLog: [
              ...(app.riskActionLog || []),
              { action, reason: reason.trim(), actor: 'super-admin', time: new Date().toISOString() },
            ],
          } : app));
          setNotifications(prev => [{
            id: `NOTIF-${Date.now().toString().slice(-8)}`,
            title: `Store Admin Action: ${action.toUpperCase()}`,
            message: reason.trim(),
            type: 'system',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            audience: 'store-admin',
            storeId: store.id,
          }, ...prev]);
          showToast(`${action.toUpperCase()} action saved for ${store.name}.`, action === 'restore' ? 'success' : 'info');
        };

        const handleCreateStore = (e: React.FormEvent) => {
          e.preventDefault();
          const missingDoc = storeDocMeta.find(d => d.required && !newStoreDocs[d.key]);
          if (!newStoreName || !newStoreAddress || !newStoreAdminDraft.ownerName || !newStoreAdminDraft.phone || !newStoreAdminDraft.email || !newStoreAdminDraft.tradeLicenseNo || !newStoreAdminDraft.tinBin || missingDoc) {
            showToast("Please fill in all fields and required documents", "info");
            return;
          }
          if (!newStoreReview) {
            setNewStoreReview(true);
            showToast('Review all details, then final submit.', 'info');
            return;
          }
          const usedFingerprints = new Set(storeAdminApps.flatMap((app: any) => (app.documents || []).map((d: any) => d.fingerprint).filter(Boolean)));
          const docData = (docKey: string) => typeof newStoreDocs[docKey] === 'string' ? newStoreDocs[docKey] : newStoreDocs[docKey]?.dataUrl || '';
          const docs = storeDocMeta.map(d => ({
            key: d.key,
            type: d.label,
            required: d.required,
            dataUrl: docData(d.key),
            secureFile: newStoreDocs[d.key]?.secureFile || null,
            privateUrl: newStoreDocs[d.key]?.privateUrl || '',
            fingerprint: docData(d.key) ? fingerprintOf(docData(d.key)) : '',
            status: docData(d.key) ? 'Pending' : 'Not Submitted',
          }));
          const duplicate = docs.find(d => d.fingerprint && usedFingerprints.has(d.fingerprint));
          if (duplicate) {
            showToast(`${duplicate.type} already used by another store admin. Same document cannot be registered twice.`, 'info');
            return;
          }
          const storeId = makeStoreId();
          const adminId = makeStoreAdminId();
          const app = {
            id: `SAPP-${Date.now()}`,
            adminId,
            storeId,
            status: 'Pending Audit',
            submittedAt: new Date().toLocaleString('en-GB'),
            source: 'super-admin-register',
            ownerName: newStoreAdminDraft.ownerName,
            phone: newStoreAdminDraft.phone,
            email: newStoreAdminDraft.email,
            storeName: newStoreName,
            storeAddress: newStoreAddress,
            businessType: newStoreAdminDraft.businessType,
            tradeLicenseNo: newStoreAdminDraft.tradeLicenseNo,
            tinBin: newStoreAdminDraft.tinBin,
            settlementNumber: newStoreAdminDraft.settlementNumber,
            documents: docs,
          };
          setStoreAdminApps(prev => [app, ...prev]);
          setNewStoreName('');
          setNewStoreAddress('');
          setNewStoreAdminDraft({ ownerName: '', phone: '', email: '', businessType: 'Grocery / Super Shop', tradeLicenseNo: '', tinBin: '', settlementNumber: '' });
          setNewStoreDocs({});
          setNewStoreReview(false);
          setIsAddingStore(false);
          showToast(`Store admin application ${adminId} submitted. Verify documents to generate password.`, "success");
        };

        const handleRegisterDocUpload = (key: string, file?: File | null) => {
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = String(reader.result || '');
            const stored = await secureFileUpload({ name: file.name, type: file.type, dataUrl }, { role: 'super-admin-register-store', actor: 'super-admin', storeId: newStoreName || key });
            setNewStoreDocs(prev => ({ ...prev, [key]: stored }));
          };
          reader.readAsDataURL(file);
        };

        return (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Partner Outlets</h3>
                <p className="text-xs text-gray-400">Registered grocery chains and store locations in coverage areas</p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setActiveTab('Customer Site')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-md"
                >
                  <Globe className="w-4 h-4" />
                  <span>Launch Customer Site</span>
                </button>
                <button 
                  onClick={() => setIsAddingStore(!isAddingStore)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-all self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingStore ? "Cancel Registration" : "Register New Store"}</span>
                </button>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Store Admin Document Verification</h4>
                  <p className="text-[10px] text-gray-400">Signup submissions from Store Admin site. Approve to generate permanent Store ID, Store Admin ID and password.</p>
                </div>
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-amber-300">
                  {storeAdminApps.filter(a => a.status === 'Pending Audit').length} Pending
                </span>
              </div>
              {storeAdminApps.length === 0 ? (
                <p className="py-4 text-center text-[10px] text-gray-500">No real store admin application submitted yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {storeAdminApps.map(app => {
                    const cred = storeAdminCreds[app.adminId];
                    const storeLink = `${window.location.origin}/store?key=${encodeURIComponent(app.storeId)}`;
                    const adminLink = `${window.location.origin}/store-admin?key=${encodeURIComponent(app.storeId)}`;
                    return (
                    <div key={app.id} className="rounded-xl border border-brand-border/70 bg-[#080e17] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] font-black text-brand-orange">{app.adminId} · {app.storeId}</p>
                          <p className="mt-1 truncate text-sm font-black text-white">{app.storeName}</p>
                          <p className="text-[10px] text-gray-400">{app.ownerName} · {app.phone}</p>
                          <p className="text-[10px] text-gray-500">{app.storeAddress}</p>
                        </div>
                        <span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase ${app.status === 'Verified' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : app.status === 'Rejected' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>{app.status}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(app.documents || []).map((doc: any) => (
                          <a key={doc.type} href={doc.dataUrl || '#'} target="_blank" rel="noreferrer" className={`rounded-lg border px-2 py-2 text-[9px] font-bold ${doc.dataUrl ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                            <FileText className="mr-1 inline h-3 w-3" /> {doc.type}
                          </a>
                        ))}
                      </div>
                      {(app.modificationLog || []).length > 0 && (
                        <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/10 p-2">
                          <p className="text-[9px] font-black uppercase text-purple-300">Modification History</p>
                          {(app.modificationLog || []).slice(-3).map((m: any, i: number) => (
                            <p key={i} className="mt-1 text-[9px] text-gray-300">{m.field}: {m.oldValue || '-'} → {m.newValue || '-'} · Reason: {m.reason}</p>
                          ))}
                        </div>
                      )}
                      {app.status === 'Verified' && (
                        <div className="mt-3 grid gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[9px] text-emerald-100">
                          <p className="font-black uppercase text-emerald-300">Permanent Access</p>
                          <p>Admin ID: <b>{app.adminId}</b></p>
                          <p>Password: <b>{cred?.password || 'Generated'}</b></p>
                          <a className="text-brand-orange underline" href={storeLink} target="_blank" rel="noreferrer">Store Site Link</a>
                          <a className="text-brand-orange underline" href={adminLink} target="_blank" rel="noreferrer">Store Admin Link</a>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button onClick={() => modifyStoreAdminApp(app)} className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-[9px] font-black uppercase text-purple-300">Modify With Reason</button>
                        <button onClick={() => approveStoreAdmin(app, false)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[9px] font-black uppercase text-red-300">Reject</button>
                        <button onClick={() => approveStoreAdmin(app, true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[9px] font-black uppercase text-white">Approve & Generate Password</button>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>

            {/* Register New Store Form */}
            {isAddingStore && (
              <form onSubmit={handleCreateStore} className="bg-brand-card border border-brand-border/85 rounded-xl p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-4 duration-200">
                <div className="border-b border-brand-border/40 pb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Register Store Admin Application</h4>
                  <p className="mt-1 text-[10px] text-gray-400">Same process as Store Admin signup. Documents are permanently saved and cannot be reused for another account.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ['ownerName', 'Owner full name', newStoreAdminDraft.ownerName],
                    ['phone', 'Mobile number', newStoreAdminDraft.phone],
                    ['email', 'Email address', newStoreAdminDraft.email],
                    ['tradeLicenseNo', 'Trade license number', newStoreAdminDraft.tradeLicenseNo],
                    ['tinBin', 'TIN/BIN number', newStoreAdminDraft.tinBin],
                    ['settlementNumber', 'Bank/MFS settlement number', newStoreAdminDraft.settlementNumber],
                  ].map(([key, label, value]) => (
                    <div key={key}>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">{label}</label>
                      <input
                        required={key !== 'settlementNumber'}
                        value={value}
                        onChange={(e) => setNewStoreAdminDraft(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange/50"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Store Outlet Name</label>
                    <input required value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Store Address / Area Location</label>
                    <input required value={newStoreAddress} onChange={(e) => setNewStoreAddress(e.target.value)} className="w-full px-3 py-2 bg-[#080e17] text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Business Type</label>
                    <select value={newStoreAdminDraft.businessType} onChange={(e) => setNewStoreAdminDraft(prev => ({ ...prev, businessType: e.target.value }))} className="w-full px-3 py-2 bg-[#080e17] text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange/50">
                      <option>Grocery / Super Shop</option>
                      <option>Restaurant / Food</option>
                      <option>Pharmacy</option>
                      <option>Electronics / Retail</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {storeDocMeta.map(d => (
                    <label key={d.key} className="rounded-xl border border-brand-border bg-[#080e17] p-3">
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase text-white"><FileText className="h-3.5 w-3.5 text-brand-orange" /> {d.label}</span>
                      <span className="mt-1 block text-[8px] text-gray-500">{d.required ? 'Required' : 'Optional'} · Permanent record</span>
                      <input type="file" onChange={e => handleRegisterDocUpload(d.key, e.target.files?.[0])} className="mt-3 w-full text-[9px] text-gray-400" />
                      {newStoreDocs[d.key] && <span className="mt-2 block text-[9px] font-bold text-emerald-400">Ready to submit</span>}
                    </label>
                  ))}
                </div>
                {newStoreReview && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-50">
                    <p className="text-[10px] font-black uppercase text-amber-300">Confirm Before Final Submit</p>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(newStoreAdminDraft).map(([k, v]) => <p key={k}><b>{k}:</b> {v || '-'}</p>)}
                      <p><b>storeName:</b> {newStoreName || '-'}</p>
                      <p><b>storeAddress:</b> {newStoreAddress || '-'}</p>
                      {storeDocMeta.map(d => <p key={d.key}><b>{d.label}:</b> {newStoreDocs[d.key] ? 'Attached' : 'Not submitted'}</p>)}
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed">Notice: Verify that all store, owner and document information is true. False, reused, edited or borrowed documents can cause permanent rejection or account block. Super Admin modifications must include a permanent reason.</p>
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsAddingStore(false); setNewStoreReview(false); }}
                    className="px-3 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    {newStoreReview ? 'Final Submit For Verification' : 'Review & Confirm'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map(s => {
                const dashboardUrl = `${window.location.origin}${window.location.pathname}?storeId=${s.id}`;
                const storeBranches = branches.filter((b: any) => b.storeId === s.id);
                return (
                  <div key={s.id} className="bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col justify-between shadow-lg hover:border-brand-border-hover transition-all">
                    <div>
                      <div className="flex items-center justify-between border-b border-brand-border/35 pb-2.5 mb-3">
                        <div className="flex items-center space-x-2">
                          <Store className="w-4 h-4 text-brand-orange" />
                          <span className="font-bold text-white text-sm">{s.name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase border border-emerald-500/10">
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium mb-2">{s.address}</p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[9px] font-black uppercase text-sky-300">{storeBranches.length} Branches</span>
                        <button onClick={() => {
                          const name = window.prompt('Branch name');
                          if (!name) return;
                          const address = window.prompt('Branch address') || '';
                          const branchNo = String(storeBranches.length + 1).padStart(3, '0');
                          const branchId = `${s.id}-BR-${branchNo}`;
                          const branchPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
                          const branch = {
                            id: branchId,
                            storeId: s.id,
                            name,
                            address,
                            status: 'Active',
                            manager: s.ownerName || '',
                            phone: s.phone || '',
                            branchAdminId: `${branchId}-ADMIN`,
                            branchPassword,
                            adminUrl: `${window.location.origin}/store-admin?key=${encodeURIComponent(s.id)}&branch=${encodeURIComponent(branchId)}`,
                            createdAt: new Date().toLocaleString('en-GB')
                          };
                          setBranches(prev => prev.some((b: any) => b.id === branch.id) ? prev : [branch, ...prev]);
                          showToast(`Branch ${branch.id} added. Login: ${branch.branchAdminId} / ${branchPassword}`, 'success');
                        }} className="rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-2 py-1 text-[9px] font-black uppercase text-brand-orange">+ Add Branch</button>
                      </div>
                      {storeBranches.length > 0 && (
                        <div className="mb-3 grid gap-1">
                          {storeBranches.slice(0, 4).map((b: any) => (
                            <div key={b.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg bg-[#080e17] px-2 py-1 text-[9px]">
                              <div className="min-w-0">
                                <span className="font-mono text-brand-orange">{b.id}</span>
                                <span className="ml-2 truncate text-gray-300">{b.name}</span>
                                <p className="font-mono text-[8px] text-gray-500">{b.branchAdminId}</p>
                              </div>
                              <button onClick={() => navigator.clipboard.writeText(b.adminUrl || `${window.location.origin}/store-admin?key=${s.id}&branch=${b.id}`)} className="text-brand-orange">Copy</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* URL Block for Merchant Entrance */}
                      <div className="bg-[#080e17] border border-brand-border/40 rounded-lg p-2.5 mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-brand-orange font-bold uppercase tracking-wider flex items-center space-x-1">
                            <Link className="w-2.5 h-2.5 mr-0.5" />
                            Store Live Links (auto-generated)
                          </span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase">ID: {s.id}</span>
                        </div>
                        {[
                          { label: 'Store Site', url: `${window.location.origin}/store-site?key=${encodeURIComponent(s.id)}` },
                          { label: 'Store Admin', url: `${window.location.origin}/store-admin?key=${encodeURIComponent(s.id)}` },
                          { label: 'Merchant Dashboard', url: `${window.location.origin}${window.location.pathname}?storeId=${s.id}` },
                        ].map(l => (
                          <div key={l.label} className="flex items-center space-x-1.5 mb-1.5 last:mb-0">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider w-28 shrink-0">{l.label}</span>
                            <input 
                              type="text" 
                              readOnly 
                              value={l.url}
                              className="flex-1 bg-[#0c1624] px-2 py-1 text-[10px] font-mono text-gray-300 rounded border border-brand-border/30 select-all outline-none"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(l.url);
                                showToast(`${l.label} link copied for ${s.name}`, "success");
                              }}
                              className="p-1.5 bg-brand-dark hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 text-gray-400 hover:text-brand-orange rounded cursor-pointer transition-all"
                              title={`Copy ${l.label} Link`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="bg-[#080e17] border border-brand-border/40 rounded-lg p-2.5 mb-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-cyan-300">Store Admin Page Access</p>
                            <p className="text-[8px] text-gray-500">This store admin gets only the pages enabled here.</p>
                          </div>
                          <span className="text-[8px] font-bold uppercase text-gray-500">{(s.adminPages?.length || DEFAULT_STORE_ADMIN_PAGES.length)} Active</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {STORE_ADMIN_PAGE_OPTIONS.map(page => {
                            const enabled = (s.adminPages && s.adminPages.length ? s.adminPages : DEFAULT_STORE_ADMIN_PAGES).includes(page.id);
                            return (
                              <button
                                key={page.id}
                                type="button"
                                onClick={() => toggleStoreAdminPage(s.id, page.id)}
                                className={`rounded-lg border px-2 py-1.5 text-[8px] font-black uppercase transition-all ${enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}
                                title={enabled ? `Cancel ${page.label}` : `Add ${page.label}`}
                              >
                                {enabled ? 'ON ' : 'OFF '} {page.label}
                              </button>
                            );
                          })}
                        </div>
                        {(s.adminAccessLog || []).length > 0 && (
                          <div className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2">
                            <p className="text-[8px] font-black uppercase text-cyan-300">Access History</p>
                            {(s.adminAccessLog || []).slice(-3).map((log: any, i: number) => (
                              <p key={i} className="mt-1 text-[8px] text-gray-300">{log.pageId}: {log.action}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="bg-[#080e17] border border-brand-border/40 rounded-lg p-2.5 mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Admin Fix Permission</p>
                            <p className="text-[8px] text-gray-500">Send request to this Store Admin before changing their store data.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const subject = window.prompt('Fix request subject', `${s.name} store support fix`);
                              if (!subject) return;
                              const terms = window.prompt('Terms and condition / reason for access request', 'Super Admin needs temporary permission to review and fix this store issue. All actions will be recorded with admin/staff ID.');
                              if (!terms?.trim()) {
                                showToast('Terms/reason is required before sending request.', 'info');
                                return;
                              }
                              const ticket: any = {
                                id: `ADMREQ-${Date.now().toString().slice(-7)}`,
                                user: s.name,
                                subject,
                                priority: 'High',
                                status: 'Open',
                                date: new Date().toLocaleString('en-GB'),
                                storeId: s.id,
                                storeName: s.name,
                                requesterRole: 'super-admin',
                                requestStatus: 'Waiting Store Admin Approval',
                                terms: terms.trim(),
                                messages: [{ sender: 'admin', text: terms.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
                                auditLog: [{ actor: 'super-admin', action: 'fix-request-sent', time: new Date().toISOString(), note: terms.trim() }],
                              };
                              setSupportTickets(prev => [ticket, ...prev]);
                              setNotifications(prev => [{
                                id: `NOTIF-${Date.now().toString().slice(-8)}`,
                                title: 'Super Admin Fix Request',
                                message: `${subject} - approve from Store Admin Support page.`,
                                type: 'system',
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                read: false,
                                audience: 'store-admin',
                                storeId: s.id,
                              }, ...prev]);
                              showToast(`Fix request sent to ${s.name} Store Admin.`, 'success');
                            }}
                            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[9px] font-black uppercase text-amber-300"
                          >
                            Send Request
                          </button>
                        </div>
                      </div>
                      <div className="bg-[#080e17] border border-red-500/20 rounded-lg p-2.5 mb-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-red-300">Suspicious Store Admin Action</p>
                            <p className="text-[8px] text-gray-500">Every action needs reason and stays in permanent audit history.</p>
                          </div>
                          <span className="rounded border border-red-500/25 bg-red-500/10 px-2 py-1 text-[8px] font-black uppercase text-red-300">{s.adminRiskStatus || 'Clear'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {[
                            ['warning', 'Warn'],
                            ['review', 'Review'],
                            ['restrict', 'Restrict'],
                            ['freeze', 'Freeze Pay'],
                            ['suspend', 'Suspend'],
                            ['blacklist', 'Blacklist'],
                            ['restore', 'Restore'],
                          ].map(([action, label]) => (
                            <button key={action} type="button" onClick={() => takeStoreAdminAction(s, action as any)} className={`rounded-lg border px-2 py-1.5 text-[8px] font-black uppercase ${action === 'restore' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                        {(s.riskActionLog || []).length > 0 && (
                          <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2">
                            <p className="text-[8px] font-black uppercase text-red-300">Risk Action History</p>
                            {(s.riskActionLog || []).slice(-3).map((log: any, i: number) => (
                              <p key={i} className="mt-1 text-[8px] text-gray-300">{log.action}: {log.reason}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-brand-border/40 pt-3.5 text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400 text-[11px]">Rating: <b className="text-white">⭐ {s.rating}</b></span>
                        <span className="text-gray-400 text-[11px]">Orders: <b className="text-brand-orange">{s.orders}</b></span>
                      </div>
                      <button
                        onClick={() => handleLaunchStore(s.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-brand-orange/10 border border-brand-orange/30 hover:bg-brand-orange/20 text-brand-orange hover:text-white rounded text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <span>Enter Dashboard</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'Customer Site':
        return (
          <CustomerStorefront
            stores={stores}
            products={products}
            orders={orders}
            liveDrivers={liveDrivers}
        onAddOrder={handleAddOrder}
        onUpdateOrder={handleUpdateOrder}
        onSilentUpdateOrder={handleSilentUpdateOrder}
        onReturnToAdmin={() => setActiveTab('Dashboard')}
        onLaunchMerchantStore={handleLaunchStore}
        onReport={handleOrderReport}
        reports={orderReports}
        showToast={showToast}
      />
        );

      case 'Inventory':
        return <InventoryView onAddNotification={handleAddNotification} showToast={showToast} products={products} onProductsChange={setProducts} />;

      case 'Coupons':
        return (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Coupon Campaigns</h3>
                <p className="text-xs text-gray-400">Configure promotional discounts and code triggers</p>
              </div>
              <button 
                onClick={() => {
                  const code = window.prompt('Coupon code');
                  if (!code) return;
                  const discount = window.prompt('Discount display', '10% Off') || '10% Off';
                  const minOrder = Number(window.prompt('Minimum order amount', '0') || 0);
                  setCoupons(prev => [{ id: `CPN-${Date.now().toString().slice(-5)}`, code: code.trim().toUpperCase(), discount, minOrder, usages: 0, status: 'Active' }, ...prev]);
                  showToast(`Coupon ${code.trim().toUpperCase()} created`, 'success');
                }}
                className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                + Create Promo Code
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {coupons.map(c => (
                <div key={c.id} className="bg-brand-card border border-brand-border rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase px-2.5 py-1 rounded-bl">
                    Active
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CODE</span>
                  <div className="text-xl font-black text-white mt-1 font-mono tracking-wider">{c.code}</div>
                  <div className="text-xs text-brand-orange font-bold mt-2">{c.discount}</div>
                  <div className="text-xs text-gray-400 mt-1">Min. Purchase: ৳ {c.minOrder}</div>
                  <div className="border-t border-brand-border/40 mt-3 pt-2 text-[10px] text-gray-500 font-bold">
                    TOTAL USAGES: {c.usages}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Reports':
        return (
          <div className="space-y-6 fade-in">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Logistics & Performance Reports</h3>
              <p className="text-xs text-gray-400">Download system data summaries, driver audit logs, and gross earnings reports</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-brand-card p-5 border border-brand-border rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Monthly Driver Payout Log</h4>
                  <p className="text-xs text-gray-400 mt-1">Summary of earnings and commissions for May 2024</p>
                </div>
                <button 
                  onClick={() => showToast("Exporting payout report PDF...", "success")}
                  className="p-2 bg-brand-dark hover:bg-brand-orange/10 border border-brand-border rounded text-brand-orange cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-brand-card p-5 border border-brand-border rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Fulfillment Center Delivery Audit</h4>
                  <p className="text-xs text-gray-400 mt-1">Order completion, cancellation ratios, and latency graphs</p>
                </div>
                <button 
                  onClick={() => showToast("Exporting CSV report...", "success")}
                  className="p-2 bg-brand-dark hover:bg-brand-orange/10 border border-brand-border rounded text-brand-orange cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'Staff Management':
        return (
          <div className="flex flex-col gap-4 fade-in">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Supermarket & Dispatch Staff</h3>
                <p className="text-xs text-gray-400">Authorized personnel managing logistics and partner portals</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStaffScanOpen(o => !o)} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20">
                  {staffScanOpen ? 'Close Card Scanner' : 'Scan Staff ID Card'}
                </button>
                <button onClick={addSuperAdminStaff} className="rounded-xl bg-brand-orange px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-brand-orange/20 hover:bg-brand-orange-hover">
                  Add Super Admin Staff
                </button>
              </div>
            </div>
            {staffScanOpen && (
              <div className="rounded-2xl border border-emerald-500/20 bg-black/30 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Scan Staff ID Card</h4>
                    <p className="text-[10px] font-semibold text-gray-500">Point the camera at the printed card barcode or QR — the full staff card opens automatically.</p>
                  </div>
                  <button onClick={() => setStaffScanOpen(false)} className="rounded-lg border border-brand-border px-3 py-2 text-[9px] font-black uppercase text-gray-300 hover:bg-brand-dark">Close</button>
                </div>
                <div id="staff-scan-video" className="mx-auto h-56 w-full max-w-sm overflow-hidden rounded-xl border border-emerald-500/30 bg-black" />
                {staffScanMsg && (
                  <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-[10px] font-bold text-red-300">{staffScanMsg}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={staffScanManual}
                    onChange={e => setStaffScanManual(e.target.value)}
                    placeholder="Or type the Permanent No manually, e.g. NXG202606133353"
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/50"
                  />
                  <button onClick={() => applyStaffScan(staffScanManual)} className="rounded-lg bg-emerald-500/20 px-4 py-2 text-[10px] font-black uppercase text-emerald-300 hover:bg-emerald-500/30">Look Up</button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-2">
              {[
                ['All', staff.filter((s: any) => !s.archived && s.status !== 'Archived').length],
                ['Pending Verification', staff.filter((s: any) => !s.archived && s.status === 'Pending Verification').length],
                ['Active', staff.filter((s: any) => !s.archived && s.status === 'Active').length],
                ['Rejected', staff.filter((s: any) => !s.archived && s.status === 'Rejected').length],
                ['Suspended', staff.filter((s: any) => !s.archived && s.status === 'Suspended').length],
                ['Archived', staff.filter((s: any) => s.archived || s.status === 'Archived').length],
              ].map(([label, count]) => (
                <button key={String(label)} onClick={() => setStaffKycFilter(label as any)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black uppercase transition-colors ${staffKycFilter === label ? 'border-brand-orange/50 bg-brand-orange/15 text-brand-orange' : 'border-transparent bg-transparent text-gray-400 hover:bg-white/[0.06] hover:text-white'}`}>
                  <span>{label}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${staffKycFilter === label ? 'bg-brand-orange text-white' : 'bg-white/10 text-gray-300'}`}>{count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white">KYC Queue Control</p>
                <p className="mt-1 text-[10px] font-semibold text-gray-500">Only real submitted staff records appear here. No demo records are created.</p>
              </div>
              <input value={staffKycSearch} onChange={e => setStaffKycSearch(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-orange md:max-w-sm" placeholder="Search staff ID, name, phone, document..." />
            </div>
            {staffKycOpen && (
              <>
              <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setStaffKycOpen(false)} />
              <form onSubmit={submitSuperAdminStaffKyc} className="fixed left-1/2 top-6 z-50 max-h-[calc(100vh-4rem)] w-[min(860px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1220]/95 p-5 shadow-2xl shadow-black/70 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-brand-border pb-4">
                  <div>
                    <h4 className="text-base font-black uppercase tracking-wider text-white">New Staff KYC Registration</h4>
                    <p className="text-[10px] font-semibold text-gray-500">Submit verified staff identity, permissions and secure KYC files. No demo data is created.</p>
                  </div>
                  <button type="button" onClick={() => setStaffKycOpen(false)} className="rounded-lg border border-brand-border bg-brand-dark px-3 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-brand-card">Close</button>
                </div>
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {['Personal', 'Identity', 'Address', 'Job Access', 'Security', 'Review'].map((label, index) => (
                    <button key={label} type="button" onClick={() => setStaffKycStep(index + 1)} className={`shrink-0 rounded-lg border px-3 py-2 text-[9px] font-black uppercase ${staffKycStep === index + 1 ? 'border-brand-orange/50 bg-brand-orange/15 text-brand-orange' : 'border-white/10 bg-white/[0.03] text-gray-400'}`}>
                      {index + 1}. {label}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  {staffKycStep === 1 && (
                    <>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white">Personal Details</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ['name', 'Full Legal Name', 'text'], ['fatherName', 'Father Name', 'text'], ['motherName', 'Mother Name', 'text'], ['dob', 'Date of Birth', 'date'],
                          ['gender', 'Gender', 'text'], ['nationality', 'Nationality', 'text'], ['bloodGroup', 'Blood Group', 'text'], ['phone', 'Mobile Number', 'tel'], ['email', 'Email', 'email'], ['emergencyContact', 'Emergency Contact', 'tel'],
                        ].map(([keyName, label, type]) => (
                          <label key={keyName} className="block"><span className="mb-1 block text-[9px] font-black uppercase text-gray-500">{label}</span><input type={type} value={(staffKycForm as any)[keyName]} onChange={e => setStaffKycForm(prev => ({ ...prev, [keyName]: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-[#070d16] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-orange" /></label>
                        ))}
                      </div>
                    </>
                  )}
                  {staffKycStep === 2 && (
                    <>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white">Identity Verification</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ['nid', 'NID Number', 'text'], ['passport', 'Passport Number', 'text'], ['birthCertificate', 'Birth Certificate Number', 'text'], ['documentExpiry', 'Document Expiry Date', 'date'],
                        ].map(([keyName, label, type]) => (
                          <label key={keyName} className="block"><span className="mb-1 block text-[9px] font-black uppercase text-gray-500">{label}</span><input type={type} value={(staffKycForm as any)[keyName]} onChange={e => setStaffKycForm(prev => ({ ...prev, [keyName]: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-[#070d16] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-orange" /></label>
                        ))}
                      </div>
                    </>
                  )}
                  {staffKycStep === 3 && (
                    <>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white">Address Information</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ['address', 'Present Address', 'text'], ['permanentAddress', 'Permanent Address', 'text'], ['district', 'District', 'text'], ['upazila', 'Thana / Upazila', 'text'], ['postCode', 'Post Code', 'text'],
                        ].map(([keyName, label, type]) => (
                          <label key={keyName} className="block"><span className="mb-1 block text-[9px] font-black uppercase text-gray-500">{label}</span><input type={type} value={(staffKycForm as any)[keyName]} onChange={e => setStaffKycForm(prev => ({ ...prev, [keyName]: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-[#070d16] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-orange" /></label>
                        ))}
                      </div>
                    </>
                  )}
                  {staffKycStep === 4 && (
                    <>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white">Job & Access</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ['role', 'Role / Department', 'text'], ['shift', 'Shift Profile', 'text'], ['joiningDate', 'Joining Date', 'date'], ['supervisor', 'Supervisor', 'text'], ['contractType', 'Contract Type', 'text'], ['salaryNote', 'Salary / Contract Note', 'text'],
                        ].map(([keyName, label, type]) => (
                          <label key={keyName} className="block"><span className="mb-1 block text-[9px] font-black uppercase text-gray-500">{label}</span><input type={type} value={(staffKycForm as any)[keyName]} onChange={e => setStaffKycForm(prev => ({ ...prev, [keyName]: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-[#070d16] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-orange" /></label>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {['support', 'orders', 'tools', 'reports', 'notifications', 'payouts', 'kyc-review', 'security'].map(permission => {
                          const selected = staffKycForm.permissions.split(',').map(p => p.trim()).includes(permission);
                          return <label key={permission} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${selected ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange' : 'border-brand-border bg-[#0d1726] text-gray-400'}`}><input type="checkbox" checked={selected} onChange={e => { const current = new Set(staffKycForm.permissions.split(',').map(p => p.trim()).filter(Boolean)); if (e.target.checked) current.add(permission); else current.delete(permission); setStaffKycForm(prev => ({ ...prev, permissions: Array.from(current).join(',') })); }} className="accent-brand-orange" />{permission}</label>;
                        })}
                      </div>
                    </>
                  )}
                  {staffKycStep === 5 && (
                    <>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white">Security & Documents</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ['referenceOne', 'Reference Person 1', 'text'], ['referenceTwo', 'Reference Person 2', 'text'], ['deviceAccess', 'Device Access Rule', 'text'],
                        ].map(([keyName, label, type]) => (
                          <label key={keyName} className="block"><span className="mb-1 block text-[9px] font-black uppercase text-gray-500">{label}</span><input type={type} value={(staffKycForm as any)[keyName]} onChange={e => setStaffKycForm(prev => ({ ...prev, [keyName]: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-[#070d16] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-orange" /></label>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {[
                          ['identity', 'Identity Document'], ['photo', 'Live Selfie / Staff Photo'], ['police', 'Police / Reference Check'],
                        ].map(([keyName, label]) => (
                          <div key={keyName} className="rounded-xl border border-dashed border-brand-border bg-[#070d16] p-3">
                            <span className="block text-[9px] font-black uppercase text-gray-500">{label}</span>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3 py-2 text-[9px] font-black uppercase text-brand-orange hover:bg-brand-orange/20">Camera<input type="file" accept="image/*" capture="environment" onChange={e => setStaffKycFiles(prev => ({ ...prev, [keyName]: e.target.files?.[0] }))} className="hidden" /></label>
                              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[9px] font-black uppercase text-sky-300 hover:bg-sky-500/20">Gallery/PDF<input type="file" accept="image/*,application/pdf" onChange={e => setStaffKycFiles(prev => ({ ...prev, [keyName]: e.target.files?.[0] }))} className="hidden" /></label>
                            </div>
                            <p className="mt-2 truncate text-[9px] font-semibold text-gray-500">{(staffKycFiles as any)[keyName]?.name || 'No file selected'}</p>
                            {(staffKycFiles as any)[keyName] && (
                              <div className="mt-3 h-36 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                {String((staffKycFiles as any)[keyName].type || '').includes('pdf') ? (
                                  <iframe title={`${label} preview`} src={URL.createObjectURL((staffKycFiles as any)[keyName])} className="h-full w-full bg-white" />
                                ) : (
                                  <img src={URL.createObjectURL((staffKycFiles as any)[keyName])} alt={`${label} preview`} className="h-full w-full object-contain" />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {staffKycStep === 6 && (
                    <>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white">Review & Submit</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {[
                          ['Name', staffKycForm.name], ['Phone', staffKycForm.phone], ['NID', staffKycForm.nid], ['Role', staffKycForm.role], ['District', staffKycForm.district], ['Permissions', staffKycForm.permissions],
                        ].map(([label, value]) => <div key={label} className="rounded-lg border border-white/10 bg-[#070d16] p-3"><p className="text-[9px] font-black uppercase text-gray-500">{label}</p><p className="mt-1 break-words text-xs font-bold text-white">{value || 'Not filled'}</p></div>)}
                      </div>
                      <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] font-bold text-amber-200"><input type="checkbox" checked={staffKycForm.confirmTruth} onChange={e => setStaffKycForm(prev => ({ ...prev, confirmTruth: e.target.checked }))} className="mt-0.5 accent-brand-orange" />I confirm all submitted information and documents are true. False information can cause permanent rejection, freeze or legal action.</label>
                    </>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-brand-border pt-4">
                  <button type="button" disabled={staffKycStep === 1} onClick={() => setStaffKycStep(step => Math.max(1, step - 1))} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-300 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40">Back</button>
                  {staffKycStep < 6 ? (
                    <button type="button" onClick={() => setStaffKycStep(step => Math.min(6, step + 1))} className="rounded-xl bg-brand-orange px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-brand-orange-hover">Next Step</button>
                  ) : (
                    <button disabled={staffKycBusy} type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{staffKycBusy ? 'Saving KYC...' : 'Submit KYC & Save Staff'}</button>
                  )}
                </div>
              </form>
              </>
            )}
            {staffKycViewing && (
              <div className="order-last rounded-2xl border border-sky-500/20 bg-[#07111f] p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">KYC Document Viewer</h4>
                    <p className="text-[10px] font-semibold text-gray-500">{staffKycViewing.id} · {staffKycViewing.name} · {staffKycViewing.documentStatus || 'Not submitted'}</p>
                  </div>
                  <button onClick={() => setStaffKycViewing(null)} className="rounded-lg border border-brand-border px-3 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-brand-dark">Close</button>
                </div>
                <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                  <div className="rounded-xl border border-brand-border bg-brand-dark/50 p-4 text-[11px] font-semibold text-gray-300">
                    <p><span className="text-gray-500">DOB:</span> {staffKycViewing.dob || 'Not submitted'}</p>
                    <p className="mt-2"><span className="text-gray-500">Phone:</span> {staffKycViewing.phone || 'Not submitted'}</p>
                    <p className="mt-2"><span className="text-gray-500">Document No:</span> {staffKycViewing.nid || 'Not submitted'}</p>
                    <p className="mt-2"><span className="text-gray-500">Address:</span> {staffKycViewing.address || 'Not submitted'}</p>
                    <p className="mt-2"><span className="text-gray-500">Permissions:</span> {(staffKycViewing.permissions || []).join(', ') || 'None'}</p>
                    <div className="mt-4 space-y-2">
                      {(staffKycViewing.documents || []).map((doc: any) => (
                        <button key={doc.fileId || doc.ref} onClick={async () => {
                          let previewDataUrl = '';
                          try {
                            if (doc.fileId) {
                              const fileData = await securityApi(`/file/${doc.fileId}`);
                              previewDataUrl = fileData.dataUrl || '';
                            }
                          } catch { showToast('Could not load secure file preview.', 'info'); }
                          setStaffKycViewing((prev: any) => ({ ...prev, previewDoc: doc, previewDataUrl }));
                        }} className="block w-full rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-left text-[9px] font-black uppercase text-sky-300 hover:bg-sky-500/20">
                          Show {doc.type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="min-h-[320px] rounded-xl border border-brand-border bg-brand-dark/60 p-3">
                    {staffKycViewing.previewDataUrl ? (
                      String(staffKycViewing.previewDataUrl).startsWith('data:application/pdf') ? (
                        <iframe title="KYC PDF Preview" src={staffKycViewing.previewDataUrl} className="h-[520px] w-full rounded-lg border border-brand-border bg-white" />
                      ) : (
                        <img src={staffKycViewing.previewDataUrl} alt="KYC preview" className="max-h-[520px] w-full rounded-lg object-contain" />
                      )
                    ) : (
                      <div className="flex h-full min-h-[320px] items-center justify-center text-center text-xs font-bold text-gray-500">Click a Show button to preview secure KYC file inside the app.</div>
                    )}
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-brand-border bg-brand-dark/40 p-3">
                  <p className="mb-2 text-[9px] font-black uppercase text-gray-500">Permanent Audit Trail</p>
                  <div className="space-y-1 text-[10px] font-semibold text-gray-400">
                    {(staffKycViewing.auditTrail || []).map((a: any, idx: number) => <p key={idx}>{a.at} · {a.action} · {a.reason || 'No reason'}</p>)}
                    {!(staffKycViewing.auditTrail || []).length && <p>No audit yet.</p>}
                  </div>
                </div>
              </div>
            )}
            {staffLoginTarget && (
              <div className="order-last rounded-2xl border border-brand-orange/20 bg-brand-card p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Create Staff Portal Login</h4>
                    <p className="text-[10px] font-semibold text-gray-500">{staffLoginTarget.id} · {staffLoginTarget.name} · Password is hashed on the server.</p>
                  </div>
                  <button onClick={() => setStaffLoginTarget(null)} className="rounded-lg border border-brand-border px-3 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-brand-dark">Close</button>
                </div>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input type="password" value={staffLoginPassword} onChange={e => setStaffLoginPassword(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-brand-border bg-brand-dark px-4 py-3 text-sm font-bold text-white outline-none focus:border-brand-orange" placeholder="Minimum 8 character staff password" />
                  <button onClick={() => createStaffLogin(staffLoginTarget, staffLoginPassword)} className="rounded-xl bg-brand-orange px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-brand-orange-hover">Save Login</button>
                </div>
              </div>
            )}
            {staffActionTarget && (
              <div className="order-last rounded-2xl border border-amber-500/20 bg-brand-card p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Save Verification Decision</h4>
                    <p className="text-[10px] font-semibold text-gray-500">{staffActionTarget.member.id} · {staffActionTarget.status} · Reason will be permanently audited.</p>
                  </div>
                  <button onClick={() => setStaffActionTarget(null)} className="rounded-lg border border-brand-border px-3 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-brand-dark">Close</button>
                </div>
                <textarea value={staffActionReason} onChange={e => setStaffActionReason(e.target.value)} className="min-h-[90px] w-full rounded-xl border border-brand-border bg-brand-dark px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-400" placeholder="Write the verification reason here..." />
                <div className="mt-3 flex justify-end">
                  <button onClick={() => updateStaffVerification(staffActionTarget.member, staffActionTarget.status, staffActionReason)} className="rounded-xl bg-amber-600 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-amber-500">Save Decision</button>
                </div>
              </div>
            )}
            {staffProfile && (
              <div className="order-last rounded-2xl border border-violet-500/20 bg-[#0a1020] p-5 shadow-xl">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Staff 360 Profile</h4>
                    <p className="text-[10px] font-semibold text-gray-500">{staffProfile.id} · {staffProfile.name} · {staffProfile.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => viewStaffDocuments(staffProfile)} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[10px] font-black uppercase text-sky-300 hover:bg-sky-500/20">KYC Viewer</button>
                    <button onClick={() => openStaffIdCard(staffProfile)} className="rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3 py-2 text-[10px] font-black uppercase text-brand-orange hover:bg-brand-orange/20">Smart ID Card</button>
                    <button onClick={() => updateStaffVerification(staffProfile, 'Suspended')} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase text-red-300 hover:bg-red-500/20">Emergency Freeze</button>
                    {(staffProfile.archived || staffProfile.status === 'Archived') && (
                      <button onClick={() => {
                        const now = new Date().toISOString();
                        setStaff(prev => prev.map((s: any) => s.id === staffProfile.id ? { ...s, archived: false, status: 'Pending Verification', auditTrail: [...(s.auditTrail || []), { action: 'staff-archive-restored', actor: 'super-admin', at: now, reason: 'restored from archive for KYC correction' }] } : s));
                        setStaffProfile(null);
                        showToast('Archived staff restored to Pending Verification.', 'success');
                      }} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase text-emerald-300 hover:bg-emerald-500/20">Restore</button>
                    )}
                    <button onClick={() => setStaffProfile(null)} className="rounded-lg border border-brand-border px-3 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-brand-dark">Close</button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ['Phone', staffProfile.phone || 'Not submitted'],
                    ['Document', staffProfile.nid || 'Not submitted'],
                    ['DOB', staffProfile.dob || 'Not submitted'],
                    ['Docs', `${staffProfile.documents?.length || 0} secure files`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-brand-border bg-brand-dark/60 p-4">
                      <p className="text-[9px] font-black uppercase text-gray-500">{label}</p>
                      <p className="mt-1 break-words text-xs font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-brand-border bg-brand-dark/40 p-4">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-wider text-gray-500">Permission Access</p>
                    <div className="flex flex-wrap gap-2">
                      {(staffProfile.permissions || []).map((p: string) => <span key={p} className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[9px] font-black uppercase text-violet-300">{p}</span>)}
                      {!(staffProfile.permissions || []).length && <span className="text-[10px] font-semibold text-gray-500">No permission assigned.</span>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-brand-border bg-brand-dark/40 p-4">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-wider text-gray-500">Permanent Activity</p>
                    <div className="max-h-32 space-y-1 overflow-auto text-[10px] font-semibold text-gray-400">
                      {(staffProfile.auditTrail || []).map((a: any, idx: number) => <p key={idx}>{a.at} · {a.action} · {a.reason || 'No reason'}</p>)}
                      {!(staffProfile.auditTrail || []).length && <p>No staff activity yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {staffIdCard && (
              <div className="order-last rounded-2xl border border-brand-orange/20 bg-[#07111f] p-5 shadow-xl">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Digital Smart Staff ID Card</h4>
                    <p className="text-[10px] font-semibold text-gray-500">Permanent No: {staffIdCard.permanentNumber || staffIdCard.id} · original card size preview for neck badge printing.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openStaffRenewal(staffIdCard)} className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[10px] font-black uppercase text-violet-300 hover:bg-violet-500/20">Renew Card</button>
                    <button onClick={() => downloadStaffIdCard(staffIdCard)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase text-emerald-300 hover:bg-emerald-500/20">Download</button>
                    <button onClick={() => printStaffIdCard(staffIdCard)} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[10px] font-black uppercase text-sky-300 hover:bg-sky-500/20">Print</button>
                    <button onClick={() => setStaffIdCard(null)} className="rounded-lg border border-brand-border px-3 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-brand-dark">Close</button>
                  </div>
                </div>
                <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
                  <div className="mx-auto w-full max-w-[340px]">
                    <div ref={staffCardPrintRef} className="staff-print-card relative aspect-[85.6/54] overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#07111f] via-[#102138] to-[#f97316] p-4 shadow-2xl">
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),transparent_35%,rgba(255,255,255,0.08))]" />
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-white/10 bg-white/5" />
                      <div className="relative flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-100">The NexaGo BD</p>
                            <p className="mt-0.5 text-[7px] font-bold uppercase text-white/70">Super Admin Staff</p>
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white via-orange-100 to-orange-400 text-[10px] font-black text-[#0b1220] ring-1 ring-orange-400/60 shadow-lg shadow-orange-500/20">NXG</div>
                        </div>
                        <div className="grid grid-cols-[110px_minmax(0,1fr)_64px] items-end gap-3">
                          <div className="flex w-[110px] shrink-0 flex-col items-center">
                            <div className="h-[4.6rem] w-[110px] overflow-hidden rounded-xl border border-white/25 bg-white/10">
                              <img
                                src={staffIdCard.photoDataUrl || staffInitialsAvatarDataUrl(staffIdCard.name)}
                                alt="Staff"
                                className="h-full w-full object-cover"
                                style={{
                                  objectPosition: `${staffIdCard.photoX || 50}% ${staffIdCard.photoY || 50}%`,
                                  transform: `scale(${staffIdCard.photoScale || 1})`,
                                  transformOrigin: `${staffIdCard.photoX || 50}% ${staffIdCard.photoY || 50}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black uppercase text-white">{staffIdCard.name || 'Staff Name'}</p>
                            <p className="text-[8px] font-bold uppercase leading-tight text-orange-100">{staffIdCard.role || 'Staff'} · {staffIdCard.contractType || 'Official'}</p>
                            <p className="truncate text-[7px] font-bold uppercase text-white/70">Join: {staffIdCard.joiningDate || new Date(staffIdCard.createdAt || Date.now()).toLocaleDateString()}</p>
                            <p className="mt-1 font-mono text-[8px] font-black text-white/90">ID: {staffIdCard.permanentNumber || staffIdCard.id}</p>
                            <p className="mt-0.5 truncate text-[7px] font-semibold text-white/70">Phone: {staffIdCard.phone || 'N/A'}</p>
                          </div>
                          <div className="flex h-16 w-16 items-center justify-center self-center rounded-md border border-white/30 p-1">
                              <QRCodeSVG value={staffCardVerifyUrl(staffIdCard)} size={56} level="M" marginSize={0} bgColor="transparent" fgColor="#ffffff" />
                          </div>
                        </div>
                        <div className="mt-2 flex w-full flex-col items-center">
                          <div className="h-12 w-full overflow-hidden">
                            <img src={code39SvgDataUrlThick(staffCardBarcodeCode(staffIdCard))} alt="Staff barcode" className="h-full w-full object-fill" />
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[6px] font-bold tracking-[0.14em] text-white/90">{staffCardBarcodeCode(staffIdCard)}</p>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/15 pt-1 text-[6.5px] font-bold uppercase text-white/70">
                          <span>Issue: {new Date(staffIdCard.issuedAt).toLocaleDateString()}</span>
                          <span>Expire: {new Date(staffIdCard.expiresAt).toLocaleDateString()}</span>
                          <span>{staffIdCard.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">Card Tools</p>
                      <label className="flex cursor-pointer items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[9px] font-black uppercase text-sky-200 hover:bg-sky-500/20">
                        Change Photo
                        <input type="file" accept="image/*" onChange={e => changeStaffCardPhoto(staffIdCard, e.target.files?.[0])} className="hidden" />
                      </label>
                      <div className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[9px] font-black uppercase text-gray-400">Photo Zoom</span>
                          <span className="font-mono text-[9px] font-bold text-white">{Math.round((staffIdCard.photoScale || 1) * 100)}%</span>
                        </div>
                        <input type="range" min="1" max="1.8" step="0.01" value={staffIdCard.photoScale || 1} onChange={e => updateStaffCardPhotoSetting(staffIdCard, 'photoScale', Number(e.target.value))} className="w-full accent-orange-500" />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[9px] font-black uppercase text-gray-400">Left / Right</span>
                          <span className="font-mono text-[9px] font-bold text-white">{staffIdCard.photoX || 50}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="1" value={staffIdCard.photoX || 50} onChange={e => updateStaffCardPhotoSetting(staffIdCard, 'photoX', Number(e.target.value))} className="w-full accent-orange-500" />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[9px] font-black uppercase text-gray-400">Up / Down</span>
                          <span className="font-mono text-[9px] font-bold text-white">{staffIdCard.photoY || 50}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="1" value={staffIdCard.photoY || 50} onChange={e => updateStaffCardPhotoSetting(staffIdCard, 'photoY', Number(e.target.value))} className="w-full accent-orange-500" />
                      </div>
                      <p className="text-center text-[9px] font-semibold text-gray-500">Print size: 85.6mm x 54mm. Use PVC/ID-card print scale 100%.</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ['Permanent ID No', staffIdCard.permanentNumber || staffIdCard.id], ['Staff Record ID', staffIdCard.id], ['Full Name', staffIdCard.name], ['Father Name', staffIdCard.fatherName], ['Mother Name', staffIdCard.motherName],
                      ['Podobi / Designation', staffIdCard.role], ['Department/Shift', staffIdCard.shift], ['Joining Date', staffIdCard.joiningDate], ['Phone', staffIdCard.phone], ['Email', staffIdCard.email], ['NID', staffIdCard.nid],
                      ['Date of Birth', staffIdCard.dob], ['Blood Group', staffIdCard.bloodGroup || 'N/A'], ['Present Address', staffIdCard.address], ['Permanent Address', staffIdCard.permanentAddress], ['District/Upazila', `${staffIdCard.district || ''} ${staffIdCard.upazila || ''}`.trim()],
                      ['Emergency Contact', staffIdCard.emergencyContact || 'N/A'], ['Device Access', staffIdCard.deviceAccess || 'After approval'], ['Permissions', (staffIdCard.permissions || []).join(', ')],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                        <p className="text-[9px] font-black uppercase text-gray-500">{label}</p>
                        <p className="mt-1 break-words text-xs font-bold text-white">{value || 'Not submitted'}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {staffRenewalOpen && (
                  <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h5 className="text-xs font-black uppercase tracking-wider text-white">ID Card Renewal System</h5>
                        <p className="mt-1 text-[10px] font-semibold text-gray-500">Step by step review, update, audit reason and permanent renewal reference.</p>
                      </div>
                      <button onClick={() => setStaffRenewalOpen(false)} className="rounded-lg border border-brand-border px-3 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-brand-dark">Close Renewal</button>
                    </div>
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                      {['Review', 'Update Details', 'Confirm', 'Reference'].map((label, index) => (
                        <button key={label} type="button" onClick={() => staffRenewalRef ? setStaffRenewalStep(index + 1) : setStaffRenewalStep(Math.min(index + 1, 3))} className={`shrink-0 rounded-lg border px-3 py-2 text-[9px] font-black uppercase ${staffRenewalStep === index + 1 ? 'border-violet-400/60 bg-violet-500/20 text-violet-200' : 'border-white/10 bg-white/[0.03] text-gray-400'}`}>
                          {index + 1}. {label}
                        </button>
                      ))}
                    </div>
                    {staffRenewalStep === 1 && (
                      <div className="grid gap-3 md:grid-cols-3">
                        {[
                          ['Current Staff', staffIdCard.name],
                          ['Current Card No', staffCardCode(staffIdCard)],
                          ['Current Expiry', new Date(staffIdCard.expiresAt).toLocaleDateString()],
                          ['Current Status', staffIdCard.status],
                          ['Current Podobi', staffIdCard.role],
                          ['Last Renewal Ref', staffIdCard.lastRenewalRef || 'Not renewed yet'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="text-[9px] font-black uppercase text-gray-500">{label}</p>
                            <p className="mt-1 break-words text-xs font-bold text-white">{value || 'Not submitted'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {staffRenewalStep === 2 && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ['role', 'Podobi / Designation', 'text'], ['shift', 'Department / Shift', 'text'], ['joiningDate', 'Joining Date', 'date'],
                          ['phone', 'Phone', 'tel'], ['emergencyContact', 'Emergency Contact', 'tel'], ['address', 'Present Address', 'text'],
                        ].map(([keyName, label, type]) => (
                          <label key={keyName} className="block">
                            <span className="mb-1 block text-[9px] font-black uppercase text-gray-500">{label}</span>
                            <input type={type} value={(staffRenewalForm as any)[keyName]} onChange={e => setStaffRenewalForm(prev => ({ ...prev, [keyName]: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-[#070d16] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-violet-400" />
                          </label>
                        ))}
                      </div>
                    )}
                    {staffRenewalStep === 3 && (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="mb-1 block text-[9px] font-black uppercase text-gray-500">Renewal Reason / Note</span>
                          <textarea value={staffRenewalForm.reason} onChange={e => setStaffRenewalForm(prev => ({ ...prev, reason: e.target.value }))} className="min-h-[90px] w-full rounded-lg border border-brand-border bg-[#070d16] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-violet-400" placeholder="Example: yearly ID card renewal after staff document review." />
                        </label>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] font-bold text-amber-200">Renew korle new issue/expiry date, updated staff details, renewal reason and reference number permanent audit-e save hobe.</div>
                      </div>
                    )}
                    {staffRenewalStep === 4 && (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Renewal Completed</p>
                        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-emerald-400/30 bg-[#062015] p-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="break-all font-mono text-sm font-black text-emerald-200">{staffRenewalRef || staffIdCard.lastRenewalRef}</p>
                          <button onClick={() => { navigator.clipboard.writeText(staffRenewalRef || staffIdCard.lastRenewalRef || ''); showToast('Renewal reference copied.', 'success'); }} className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase text-white hover:bg-emerald-400">Copy</button>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <button disabled={staffRenewalStep === 1} onClick={() => setStaffRenewalStep(step => Math.max(1, step - 1))} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase text-gray-300 disabled:cursor-not-allowed disabled:opacity-40">Back</button>
                      {staffRenewalStep < 3 ? (
                        <button onClick={() => setStaffRenewalStep(step => Math.min(3, step + 1))} className="rounded-xl bg-violet-600 px-5 py-3 text-[10px] font-black uppercase text-white hover:bg-violet-500">Next Step</button>
                      ) : staffRenewalStep === 3 ? (
                        <button onClick={() => renewStaffIdCard(staffIdCard)} className="rounded-xl bg-emerald-600 px-5 py-3 text-[10px] font-black uppercase text-white hover:bg-emerald-500">Renew & Generate Reference</button>
                      ) : (
                        <button onClick={() => setStaffRenewalOpen(false)} className="rounded-xl bg-brand-orange px-5 py-3 text-[10px] font-black uppercase text-white hover:bg-brand-orange-hover">Done</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!(staffKycViewing || staffProfile || staffIdCard || staffLoginTarget || staffActionTarget) && (
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-brand-dark/40 text-gray-400 border-b border-brand-border">
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Staff ID</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Full Name</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Assigned Role</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Shift Profile</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Risk</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Documents</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">System Status</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Control</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase text-right">Portal Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {filteredStaff.map(raw => {
                    const s = normalizeStaffKyc([raw])[0];
                    const risk = staffRiskOf(s);
                    const canCreateLogin = s.status === 'Active' && s.documentStatus === 'Verified' && (s.documents || []).length >= 3;
                    return (
                    <tr key={s.id} className="hover:bg-brand-dark/10 transition-colors">
                      <td className="py-3 px-4">
                        <button onClick={() => setStaffProfile(s)} className="font-mono font-bold text-sky-300 hover:text-white">#{s.id}</button>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{s.name}</td>
                      <td className="py-3 px-4 text-brand-orange font-semibold">{s.role}</td>
                      <td className="py-3 px-4 text-gray-300">{s.shift}</td>
                      <td className="py-3 px-4">
                        <span className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase ${risk.tone}`}>{risk.label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => viewStaffDocuments(s)} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[9px] font-black uppercase text-sky-300 hover:bg-sky-500/20">
                            Details ({s.documents?.length || 0})
                          </button>
                          <button onClick={() => openStaffDocuments(s)} className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase text-violet-300 hover:bg-violet-500/20">
                            Show
                          </button>
                          <button onClick={() => openStaffIdCard(s)} className="rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3 py-1.5 text-[9px] font-black uppercase text-brand-orange hover:bg-brand-orange/20">
                            Smart Card
                          </button>
                        </div>
                        <p className="mt-1 text-[9px] font-bold uppercase text-gray-500">{s.documentStatus || 'Not Submitted'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : s.status === 'Suspended' || s.status === 'Rejected' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => updateStaffVerification(s, 'Active')} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[9px] font-black uppercase text-emerald-300 hover:bg-emerald-500/20">
                            Approve
                          </button>
                          <button onClick={() => updateStaffVerification(s, 'Rejected')} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[9px] font-black uppercase text-red-300 hover:bg-red-500/20">
                            Reject
                          </button>
                          <button onClick={() => updateStaffVerification(s, 'Suspended')} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[9px] font-black uppercase text-amber-300 hover:bg-amber-500/20">
                            Freeze
                          </button>
                          {(!(s.documents || []).length || s.documentStatus === 'Not Submitted') && (
                            <button onClick={() => archiveIncompleteStaff(s)} className="rounded-lg border border-gray-500/30 bg-gray-500/10 px-2.5 py-1.5 text-[9px] font-black uppercase text-gray-300 hover:bg-gray-500/20">
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button disabled={!canCreateLogin} onClick={() => createStaffLogin(s)} className="rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-3 py-1.5 text-[9px] font-black uppercase text-brand-orange hover:bg-brand-orange/20 disabled:cursor-not-allowed disabled:opacity-40">
                          {s.loginEnabled ? 'Reset Login' : 'Create Login'}
                        </button>
                      </td>
                    </tr>
                  );})}
                  {!filteredStaff.length && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-xs font-semibold text-gray-500">No real staff KYC record found for this filter/search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        );

      case 'Reviews':
        return (
          <div className="space-y-6 fade-in">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Customer Experience Reviews</h3>
              <p className="text-xs text-gray-400">Post-delivery rating audits and feedback comments</p>
            </div>
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="bg-brand-card border border-brand-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs">{r.customer}</span>
                      <span className="text-[10px] text-gray-500 ml-2">{r.date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: r.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 text-brand-orange fill-brand-orange" />
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-bold mt-1">Target: <span className="text-brand-orange">{r.item}</span></div>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">"{r.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Vehicles Management':
      case 'Vehicles':
        return (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Fleet & Vehicles Management</h3>
                <p className="text-xs text-gray-400">Registered delivery transport units assigned to active drivers</p>
              </div>
              <button 
                onClick={() => showToast("Vehicle registered to logistics fleet!", "success")}
                className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md"
              >
                + Register New Vehicle
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Motorcycles</span>
                <div className="text-2xl font-black text-white mt-1">12 Units</div>
                <span className="text-[10px] text-emerald-400 font-semibold">10 On Delivery Route</span>
              </div>
              <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Bicycles / E-Bikes</span>
                <div className="text-2xl font-black text-brand-orange mt-1">8 Units</div>
                <span className="text-[10px] text-emerald-400 font-semibold">7 Active</span>
              </div>
              <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CNG Auto Rickshaws</span>
                <div className="text-2xl font-black text-white mt-1">5 Units</div>
                <span className="text-[10px] text-gray-400 font-semibold">Bulk Grocery Express</span>
              </div>
              <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mini Covered Vans</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">3 Units</div>
                <span className="text-[10px] text-emerald-400 font-semibold">Inter-Zone Supply</span>
              </div>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-brand-dark/40 text-gray-400 border-b border-brand-border">
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Vehicle ID</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Type & Model</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Plate / Reg No</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Assigned Driver</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {drivers.map((d, i) => (
                    <tr key={d.id} className="hover:bg-brand-dark/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-400 font-bold">#VEC-00{i + 1}</td>
                      <td className="py-3 px-4 font-bold text-white">{d.vehicleType || "Honda CB Shine 125"}</td>
                      <td className="py-3 px-4 font-mono text-gray-300 font-semibold">DHAKA-METRO-HA-{1020 + i}</td>
                      <td className="py-3 px-4 text-brand-orange font-bold">{d.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase">
                          {d.status === 'Online' ? 'Active' : 'Standby'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'Earnings & Payouts':
      case 'Earnings':
        return (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Earnings & Driver Payouts</h3>
                <p className="text-xs text-gray-400">Platform revenue balance, store merchant commissions, and courier payouts</p>
              </div>
              <button 
                onClick={() => showToast("Dispatched payout batch to bKash Merchant API!", "success")}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-md"
              >
                Trigger Bulk Payout (bKash/Nagad)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-brand-card p-5 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Gross Platform Revenue</span>
                <div className="text-2xl font-black text-white mt-1">৳ 125,430.00</div>
                <span className="text-[10px] text-emerald-400 font-bold">+18.6% vs last week</span>
              </div>
              <div className="bg-brand-card p-5 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Driver Earnings Dispatched</span>
                <div className="text-2xl font-black text-brand-orange mt-1">৳ 68,200.00</div>
                <span className="text-[10px] text-gray-400 font-semibold">Weekly cycle cleared</span>
              </div>
              <div className="bg-brand-card p-5 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pending Payout Reserves</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">৳ 14,850.00</div>
                <span className="text-[10px] text-emerald-400 font-semibold">Ready for Friday batch</span>
              </div>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-brand-dark/40 text-gray-400 border-b border-brand-border">
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Recipient Driver</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Completed Deliveries</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Net Earnings</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Payout Method</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Payout Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {drivers.map(d => (
                    <tr key={d.id} className="hover:bg-brand-dark/10 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{d.name} <span className="text-[10px] text-gray-500 font-mono">({d.id})</span></td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-300">{d.rating > 4.5 ? '68 Deliveries' : '45 Deliveries'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-brand-orange">৳ {(d.rating * 2400).toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-300 font-semibold">bKash Personal</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase">
                          Cleared
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'Promotions & Banners':
      case 'Banners':
        return (
          <PromoStudioView banners={banners} onBannersChange={setBanners} showToast={showToast} />
        );

      case 'KPI Dashboard':
        return (
          <KpiDashboardView products={products} orders={orders} onNavigate={setActiveTab} />
        );

      case 'Live Store Sync':
        return (
          <StoreSyncView
            storeKey={storeKey}
            onStoreKeyChange={handleStoreKeyChange}
            storefrontUrl={storefrontUrl}
            syncState={syncState}
            lastSyncAt={lastSyncAt}
            profile={profile}
            onProfileChange={handleProfileChange}
            onPush={() => pushState(false)}
            onPull={pullState}
            onReset={handleResetCloud}
            showToast={showToast}
          />
        );

      case 'Notifications':
        return (
          <NotificationsView
            notifications={notifications}
            onAddNotification={handleAddNotification}
            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
            onClearAll={handleClearAllNotifications}
            onToggleRead={(id) => setNotifications(notifications.map(n => n.id === id ? { ...n, read: !n.read } : n))}
            drivers={drivers.map(d => ({ id: d.id, name: d.name }))}
            customers={users.filter(u => u.role === 'Customer').map(u => ({ id: u.id || u.phone, name: u.name }))}
            stores={stores.map(s => ({ id: s.id || s.name, name: s.name }))}
          />
        );

      case 'Reports & Analytics':
        return (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Reports & Analytics</h3>
                <p className="text-xs text-gray-400">Platform performance metrics, order latency, and financial exports</p>
              </div>
              <button 
                onClick={() => showToast("Full platform audit report downloaded!", "success")}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export System Audit (CSV)</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-brand-card p-5 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Average Delivery Latency</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">24.5 Mins</div>
                <span className="text-[10px] text-emerald-400 font-semibold">-3.2 mins vs target</span>
              </div>
              <div className="bg-brand-card p-5 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Customer Fulfillment Rate</span>
                <div className="text-2xl font-black text-white mt-1">98.5%</div>
                <span className="text-[10px] text-emerald-400 font-semibold">1,248 total orders</span>
              </div>
              <div className="bg-brand-card p-5 border border-brand-border rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Coverage Zones</span>
                <div className="text-2xl font-black text-brand-orange mt-1">5 Areas</div>
                <span className="text-[10px] text-gray-400 font-semibold">Dhanmondi, Gulshan, Uttara, Mirpur, Banani</span>
              </div>
            </div>
          </div>
        );

      case 'Marketing':
        return (
          <div className="space-y-6 fade-in">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Marketing Campaigns</h3>
              <p className="text-xs text-gray-400">Promotions, banner ads, bKash/Nagad campaigns, and analytics</p>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-brand-dark/40 text-gray-400 border-b border-brand-border">
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">ID</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Campaign Name</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Platform/Channel</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Budget Assigned</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Engagement clicks</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {marketing.map(m => (
                    <tr key={m.id} className="hover:bg-brand-dark/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-400 font-bold">#{m.id}</td>
                      <td className="py-3 px-4 font-bold text-white">{m.title}</td>
                      <td className="py-3 px-4 text-gray-300 font-semibold">{m.channel}</td>
                      <td className="py-3 px-4 font-mono text-white font-bold">৳ {m.budget}</td>
                      <td className="py-3 px-4 font-mono font-bold text-brand-orange">{m.clicks} Clicks</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-20 text-center text-gray-500">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Module Active</h3>
            <p className="text-xs mt-1">The NexaGo BD active module: {tabName}</p>
          </div>
        );
    }
  };

  if (selectedStoreId) {
    const activeStore = stores.find(s => s.id === selectedStoreId) || stores[0];
    const storeOrders = orders.filter(o => ((o as any).storeId && (o as any).storeId === activeStore.id) || o.storeName.toLowerCase() === activeStore.name.toLowerCase());
    
    // Merchant Side Navigation Options
    const merchantSidebarItems = [
      { name: 'Dashboard', icon: LayoutDashboard },
      { name: 'Orders', icon: ShoppingCart, badgeCount: storeOrders.length },
      { name: 'Scan Order', icon: Camera },
      { name: 'Products', icon: Box },
      { name: 'Categories', icon: FolderOpen },
      { name: 'Customers', icon: Users },
      { name: 'Reviews', icon: Star },
      { name: 'Coupons', icon: Ticket },
      { name: 'Inventory', icon: ClipboardList },
      { name: 'Staff', icon: UserSquare2 },
      { name: 'Payments', icon: CreditCard },
      { name: 'Reports', icon: BarChart3 },
      { name: 'Settings', icon: Settings },
      { name: 'Store Profile', icon: Store },
      { name: 'Marketing', icon: Megaphone },
      { name: 'Support Tickets', icon: LifeBuoy },
    ];

    // Derived statistics and values for current merchant context
    const currentProducts = products.filter((p: any) => p.storeId === activeStore.id);
    const storeCategories = categories.filter((c: any) => c.storeId === activeStore.id);
    const storeStaff = staff.filter((s: any) => !s.storeId || s.storeId === activeStore.id);
    const storeCoupons = coupons.filter((c: any) => c.storeId === activeStore.id);
    const storeReviews = reviews.filter((r: any) => r.storeId === activeStore.id || r.storeName === activeStore.name || currentProducts.some((p: any) => p.id === r.productId));

    // Handle Order status transition from within Merchant Panel
    const updateMerchantOrderStatus = (orderId: string, newStatus: 'Completed' | 'Ongoing' | 'Cancelled') => {
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      );
      showToast(`Order #${orderId} set to ${newStatus}`, "success");
    };

    // Handle Creating custom product inside Merchant Context
    const handleMerchantAddProduct = (e: React.FormEvent) => {
      e.preventDefault();
      if (!mProdName || !mProdPrice || !mProdStock) {
        showToast("Please fill all product fields", "info");
        return;
      }
      const newProd = {
        id: `PROD-${Date.now().toString().slice(-5)}`,
        name: mProdName,
        category: mProdCat,
        stock: parseInt(mProdStock) || 0,
        price: parseFloat(mProdPrice) || 0,
        status: parseInt(mProdStock) > 10 ? 'In Stock' : (parseInt(mProdStock) > 0 ? 'Low Stock' : 'Out of Stock'),
        storeId: activeStore.id,
        storeName: activeStore.name
      };
      setProducts([...products, newProd]);
      setMProdName('');
      setMProdPrice('');
      setMProdStock('');
      showToast(`Product "${newProd.name}" added to inventory!`, "success");
    };

    // Handle Adding category
    const handleMerchantAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (!mCatName) return;
      const newCat = {
        id: `CAT-${Date.now().toString().slice(-5)}`,
        name: mCatName,
        itemsCount: 0,
        status: 'Active',
        storeId: activeStore.id,
        storeName: activeStore.name
      };
      setCategories([...categories, newCat]);
      setMCatName('');
      showToast(`Category "${newCat.name}" launched!`, "success");
    };

    // Handle Adding coupon
    const handleMerchantAddCoupon = (e: React.FormEvent) => {
      e.preventDefault();
      if (!mCouponCode || !mCouponDiscount) return;
      const newCpn = {
        id: `CPN-${Date.now().toString().slice(-5)}`,
        code: mCouponCode.toUpperCase(),
        discount: mCouponDiscount,
        minOrder: parseInt(mCouponMinOrder) || 0,
        usages: 0,
        status: 'Active',
        storeId: activeStore.id,
        storeName: activeStore.name
      };
      setCoupons([...coupons, newCpn]);
      setMCouponCode('');
      setMCouponDiscount('');
      setMCouponMinOrder('');
      showToast(`Promo coupon "${newCpn.code}" is now active!`, "success");
    };

    // Handle Hiring new staff
    const handleMerchantAddStaff = (e: React.FormEvent) => {
      e.preventDefault();
      if (!mStaffName) return;
      const newStf = {
        id: `STF-${Date.now().toString().slice(-5)}`,
        name: mStaffName,
        role: mStaffRole,
        shift: mStaffShift,
        status: 'Active',
        storeId: activeStore.id,
        storeName: activeStore.name
      };
      setStaff([...staff, newStf]);
      setMStaffName('');
      showToast(`Staff member "${newStf.name}" onboarded successfully!`, "success");
    };

    // Handle Creating support ticket
    const handleMerchantAddTicket = (e: React.FormEvent) => {
      e.preventDefault();
      if (!mTicketSubject || !mTicketMsg) return;
      const newTicket: SupportTicket = {
        id: `TCK-80${supportTickets.length + 1}`,
        user: activeStore.name,
        subject: mTicketSubject,
        priority: mTicketPriority as 'Low' | 'Medium' | 'High',
        status: 'Open',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        messages: [{ sender: 'user', text: mTicketMsg, time: 'Just Now' }]
      };
      setSupportTickets([newTicket, ...supportTickets]);
      setMTicketSubject('');
      setMTicketMsg('');
      showToast("Support ticket registered with platform admin", "success");
    };

    // Handle editing and saving store profile
    const handleMerchantSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      const updatedStores = stores.map(s => {
        if (s.id === activeStore.id) {
          return {
            ...s,
            name: activeStore.name,
            address: activeStore.address,
            category: activeStore.category || "Restaurant",
            status: activeStore.status
          };
        }
        return s;
      });
      setStores(updatedStores);
      showToast("Store settings saved in cloud db!", "success");
    };

    // Payout tracker calculations
    const totalEarnings = storeOrders.reduce((sum, o) => sum + o.amount, 0);
    const unpaidBalance = totalEarnings * 0.95; // 5% marketplace commission

    const handlePayoutRequest = () => {
      showToast(`Processing bank payout of ৳ ${unpaidBalance.toFixed(2)} to merchant account...`, "info");
      setTimeout(() => {
        showToast("Payout successfully transferred to bank account!", "success");
      }, 1500);
    };

    // Custom filtered views
    const renderMerchantTabContent = () => {
      const searchLower = merchantSearchQuery.toLowerCase();
      
      switch (activeMerchantTab) {
        case 'Dashboard':
          return (
            <div className="space-y-6">
              {/* URL Alert Block */}
              <div className="bg-[#0c1624]/40 border border-brand-border/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-inner animate-in fade-in duration-200">
                <div className="text-xs">
                  <span className="text-gray-400 font-medium">Merchant Dashboard Access Link:</span>
                  <span className="font-mono text-brand-orange ml-2 font-bold select-all bg-brand-dark/60 px-2.5 py-1 rounded border border-brand-border/40">
                    {window.location.origin}?storeId={activeStore.id}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}?storeId=${activeStore.id}`);
                    showToast("Dashboard Link Copied!", "success");
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-brand-orange/10 border border-brand-orange/35 hover:bg-brand-orange/20 text-brand-orange rounded text-xs font-bold transition-all cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Link</span>
                </button>
              </div>

              <StoreDashboardView 
                orders={storeOrders} 
                onNavigate={(tab) => {
                  const mapped = merchantSidebarItems.find(item => item.name.toLowerCase() === tab.toLowerCase());
                  if (mapped) setActiveMerchantTab(mapped.name);
                }}
                productsCount={products.filter(p => p.category !== '').length}
                categoriesCount={categories.length}
                customersCount={storeOrders.length + 3}
                reviewsCount={storeReviews.length}
                isTightMode={isTightMode}
              />
            </div>
          );

        case 'Scan Order':
          return (
            <div className="space-y-5 fade-in">
              <ScanOrderModule 
                orders={storeOrders} 
                onUpdateOrderStatus={updateMerchantOrderStatus}
                onPrintReceipt={(ord) => setPrintingReceiptOrder(ord)}
              />
            </div>
          );

        case 'Orders': {
          const filteredOrders = storeOrders.filter(o => 
            o.id.toLowerCase().includes(searchLower) ||
            o.customerName.toLowerCase().includes(searchLower)
          );

          return (
            <div className="space-y-5 fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Merchant Orders Fulfillment</h3>
                  <p className="text-[11px] text-gray-400">Incoming, packing and dispatch logistics for your outlet</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsOrderScannerOpen(!isOrderScannerOpen)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 border shadow-md ${
                      isOrderScannerOpen
                        ? 'bg-brand-orange text-white border-brand-orange shadow-brand-orange/20 ring-2 ring-brand-orange/40'
                        : 'bg-brand-orange/15 hover:bg-brand-orange border-brand-orange/40 hover:border-brand-orange text-brand-orange hover:text-white'
                    }`}
                  >
                    <Camera className="w-4 h-4 animate-pulse" />
                    <span>{isOrderScannerOpen ? 'Hide Order Scanner' : 'Scan Order (Camera)'}</span>
                  </button>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search Order ID / Client..." 
                      value={merchantSearchQuery}
                      onChange={(e) => setMerchantSearchQuery(e.target.value)}
                      className="w-48 sm:w-56 bg-brand-card border border-brand-border text-xs px-9 py-2 rounded-lg outline-none text-white focus:border-brand-orange"
                    />
                  </div>
                </div>
              </div>

              {/* CAMERA SCAN ORDER MODULE */}
              {isOrderScannerOpen && (
                <ScanOrderModule 
                  orders={storeOrders} 
                  onUpdateOrderStatus={updateMerchantOrderStatus}
                  onPrintReceipt={(ord) => setPrintingReceiptOrder(ord)}
                  onClose={() => setIsOrderScannerOpen(false)}
                />
              )}

              {/* Layout splits into List & Details if selected */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2 bg-[#0c1624]/60 border border-brand-border/60 rounded-xl overflow-hidden shadow-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border/50 bg-[#0c1624] text-gray-400 text-[10px] font-black uppercase tracking-wider">
                        <th className="py-3 px-4">Order Code</th>
                        <th className="py-3 px-4">Client Name</th>
                        <th className="py-3 px-4">Total Price</th>
                        <th className="py-3 px-4">Timeline</th>
                        <th className="py-3 px-4">Logistics Status</th>
                        <th className="py-3 px-4 text-right">Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30 text-xs">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-gray-500 font-medium">No active orders found matching query</td>
                        </tr>
                      ) : (
                        filteredOrders.map(o => (
                          <tr 
                            key={o.id} 
                            onClick={() => setMSelectedOrder(o)}
                            className={`hover:bg-brand-orange/5 transition-colors cursor-pointer ${mSelectedOrder?.id === o.id ? 'bg-brand-orange/10 border-l-2 border-brand-orange' : ''}`}
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-gray-400">#{o.id}</td>
                            <td className="py-3.5 px-4 font-bold text-white">{o.customerName}</td>
                            <td className="py-3.5 px-4 font-mono text-brand-orange font-bold">৳ {o.amount.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-gray-400 font-medium">{o.time || "09:30 AM"}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                o.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                o.status === 'Ongoing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1.5" onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => updateMerchantOrderStatus(o.id, 'Completed')}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                                title="Fulfill Order"
                              >
                                Fulfill
                              </button>
                              <button 
                                onClick={() => updateMerchantOrderStatus(o.id, 'Ongoing')}
                                className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                                title="Mark Preparing"
                              >
                                Prepare
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Selected Order Detail Sidebar */}
                <div className="bg-[#0c1624]/80 border border-brand-border/60 rounded-xl p-5 space-y-4 shadow-xl">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-brand-border/40 pb-3">
                    Order Inspection Box
                  </h4>
                  {mSelectedOrder ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center bg-brand-dark/40 p-2.5 rounded-lg border border-brand-border/30">
                        <span className="font-mono font-bold text-gray-300">Code: #{mSelectedOrder.id}</span>
                        <span className="text-[10px] text-brand-orange font-bold">{mSelectedOrder.date}</span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client & Dispatch Details</p>
                        <div className="bg-brand-dark/20 p-3 rounded-lg border border-brand-border/20 space-y-1">
                          <p className="font-bold text-white text-sm">{mSelectedOrder.customerName}</p>
                          <p className="text-gray-400 font-semibold">{mSelectedOrder.address || "Dhanmondi, Road 8A, Dhaka"}</p>
                          <p className="text-gray-500 font-mono text-[10px]">Method: {mSelectedOrder.paymentMethod || "bKash Digital"}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Requested Cart Items</p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {products.slice(0, 3).map((prod, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-brand-dark/30 px-3 py-2 rounded-md border border-brand-border/20">
                              <div>
                                <p className="font-bold text-white text-[11px]">{prod.name}</p>
                                <p className="text-[9px] text-gray-500 font-mono">Qty: {1 + idx} • {prod.category}</p>
                              </div>
                              <span className="font-mono font-bold text-brand-orange text-[11px]">৳ {(prod.price * (1+idx)).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-brand-border/30 pt-3 text-sm font-bold text-white">
                        <span>Fulfillment Value:</span>
                        <span className="text-lg text-brand-orange">৳ {mSelectedOrder.amount.toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1.5">
                        <button
                          onClick={() => updateMerchantOrderStatus(mSelectedOrder.id, 'Completed')}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Fulfill Complete
                        </button>
                        <button
                          onClick={() => updateMerchantOrderStatus(mSelectedOrder.id, 'Cancelled')}
                          className="w-full py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Cancel order
                        </button>
                      </div>

                      <button
                        onClick={() => setPrintingReceiptOrder(mSelectedOrder)}
                        className="w-full py-2.5 bg-brand-dark hover:bg-brand-border/40 border border-brand-border text-gray-200 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer shadow-md"
                      >
                        <Printer className="w-3.5 h-3.5 text-brand-orange animate-pulse" />
                        <span>Print Invoice Receipt</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500 space-y-2">
                      <ShoppingCart className="w-10 h-10 text-brand-border mx-auto opacity-30" />
                      <p className="font-medium text-xs">Select any order from list to inspect cart details, customer address and update logistics logs.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        case 'Products': {
          const filteredProducts = currentProducts.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.category.toLowerCase().includes(searchLower)
          );

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
              {/* Product catalog List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Product Catalog</h3>
                    <p className="text-[11px] text-gray-400">Inventory and availability items active for consumer ordering</p>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search name, category..." 
                      value={merchantSearchQuery}
                      onChange={(e) => setMerchantSearchQuery(e.target.value)}
                      className="bg-brand-card border border-brand-border text-xs px-9 py-2 rounded-lg outline-none text-white focus:border-brand-orange"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map(p => (
                    <div key={p.id} className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-4 flex flex-col justify-between hover:border-brand-border-hover transition-all shadow-md">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">{p.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            p.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-400' :
                            p.status === 'Low Stock' ? 'bg-orange-500/10 text-orange-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-[13px] tracking-wide line-clamp-1">{p.name}</h4>
                        <p className="text-[10px] text-brand-orange font-semibold tracking-wider uppercase mt-0.5">{p.category}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-brand-border/30 mt-3 pt-3">
                        <span className="font-mono text-white text-sm font-bold">৳ {p.price}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-gray-400 font-bold">Stock: {p.stock}</span>
                          <button 
                            onClick={() => {
                              const updated = products.map(item => item.id === p.id ? { ...item, stock: item.stock + 10, status: 'In Stock' } : item);
                              setProducts(updated);
                              showToast(`Added +10 to ${p.name} stock`, "success");
                            }}
                            className="px-1.5 py-0.5 bg-brand-orange/10 border border-brand-orange/30 text-[10px] font-bold rounded hover:bg-brand-orange text-brand-orange hover:text-white transition-all"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Product Form */}
              <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-4 shadow-xl h-fit">
                <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-brand-border/40 pb-3 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-brand-orange" />
                  <span>Launch New Product</span>
                </h4>
                <form onSubmit={handleMerchantAddProduct} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Product Title / Label</label>
                    <input 
                      type="text" 
                      required
                      value={mProdName}
                      onChange={(e) => setMProdName(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. Organic Strawberries 250g"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Category Section</label>
                    <select 
                      value={mProdCat}
                      onChange={(e) => setMProdCat(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                    >
                      {storeCategories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Item Price (৳)</label>
                      <input 
                        type="number" 
                        required
                        value={mProdPrice}
                        onChange={(e) => setMProdPrice(e.target.value)}
                        className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                        placeholder="e.g. 150"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Stock Quantity</label>
                      <input 
                        type="number" 
                        required
                        value={mProdStock}
                        onChange={(e) => setMProdStock(e.target.value)}
                        className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer shadow-md"
                  >
                    Confirm & Publish Item
                  </button>
                </form>
              </div>
            </div>
          );
        }

        case 'Categories':
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Product Categories</h3>
                  <p className="text-[11px] text-gray-400">Department sections active for your menu layout</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {storeCategories.map(c => {
                    const mappedCount = currentProducts.filter(p => p.category === c.name).length;
                    return (
                      <div key={c.id} className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 flex items-center justify-between shadow-md">
                        <div>
                          <h4 className="font-bold text-white text-[14px]">{c.name}</h4>
                          <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">ID: {c.id}</p>
                        </div>
                        <div className="text-right">
                          <span className="block font-mono text-brand-orange font-bold text-lg">{mappedCount || c.itemsCount}</span>
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider">Items Active</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add New Category */}
              <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-4 shadow-xl h-fit">
                <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-brand-border/40 pb-3 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-brand-orange" />
                  <span>Create Category Department</span>
                </h4>
                <form onSubmit={handleMerchantAddCategory} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Department Name</label>
                    <input 
                      type="text" 
                      required
                      value={mCatName}
                      onChange={(e) => setMCatName(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. Frozen Foods, Fresh Organic"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer"
                  >
                    Launch Category
                  </button>
                </form>
              </div>
            </div>
          );

        case 'Customers': {
          const uniqueCustomers = Array.from(new Set(storeOrders.map(o => o.customerName))) as string[];
          const dispCustList = uniqueCustomers.map((name, idx) => {
            const custOrders = storeOrders.filter(o => o.customerName === name);
            const totalSpent = custOrders.reduce((sum, o) => sum + o.amount, 0);
            return {
              id: `CUST-98${idx + 1}`,
              name,
              email: `${name.toLowerCase().replace(/\s/g, '')}@gmail.com`,
              ordersCount: custOrders.length,
              totalSpent,
              status: 'Verified Member'
            };
          });

          return (
            <div className="space-y-4 fade-in">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Customers Hub</h3>
                <p className="text-[11px] text-gray-400">Directory of consumers placing delivery orders at your outlet</p>
              </div>

              <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border/50 bg-[#0c1624] text-gray-400 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Client ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Contact Email</th>
                      <th className="py-3 px-4">Orders Placed</th>
                      <th className="py-3 px-4">Revenue Spent</th>
                      <th className="py-3 px-4">Trust Status</th>
                      <th className="py-3 px-4 text-right">Marketing Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 text-xs">
                    {dispCustList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-500 font-semibold">No consumer interactions registered yet</td>
                      </tr>
                    ) : (
                      dispCustList.map(c => (
                        <tr key={c.id} className="hover:bg-brand-dark/10 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-500">{c.id}</td>
                          <td className="py-3.5 px-4 font-bold text-white">{c.name}</td>
                          <td className="py-3.5 px-4 font-semibold text-gray-300">{c.email}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-400">{c.ordersCount} Orders</td>
                          <td className="py-3.5 px-4 font-mono text-brand-orange font-bold">৳ {c.totalSpent.toLocaleString()}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[9px] font-bold uppercase tracking-wider">
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              onClick={() => showToast(`Discount promotional flyer dispatched to ${c.name}!`, "success")}
                              className="px-2.5 py-1 bg-brand-orange/15 hover:bg-brand-orange border border-brand-orange/30 hover:border-brand-orange text-brand-orange hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Send Flyer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        case 'Reviews':
          return (
            <div className="space-y-4 fade-in">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Customer Feedback & Reviews</h3>
                <p className="text-[11px] text-gray-400">Reputation rating scores and service feedback left by consumers</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storeReviews.length === 0 ? (
                  <div className="col-span-2 bg-[#0c1624]/40 border border-brand-border/40 py-12 rounded-xl text-center text-gray-500 font-medium">
                    No consumer reviews submitted for this outlet yet.
                  </div>
                ) : (
                  storeReviews.map(r => (
                    <div key={r.id} className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-3.5 shadow-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-sm">{r.customer}</h4>
                          <span className="text-[10px] text-gray-500 font-bold">{r.date} • {r.item}</span>
                        </div>
                        <div className="flex items-center space-x-0.5 bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20 text-brand-orange">
                          <Star className="w-3 h-3 fill-brand-orange" />
                          <span className="text-[11px] font-black">{r.rating}.0</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-300 font-medium italic">"{r.comment}"</p>

                      {/* Display replies if exists */}
                      {mReviewReplies[r.id] && (
                        <div className="bg-brand-dark/40 border-l-2 border-brand-orange p-2.5 rounded text-[11px] space-y-0.5">
                          <span className="block text-[9px] font-black text-brand-orange uppercase">Merchant Reply Box:</span>
                          <p className="text-gray-300 font-medium">{mReviewReplies[r.id]}</p>
                        </div>
                      )}

                      {/* Add interactive reply input */}
                      <div className="pt-2 border-t border-brand-border/25 flex items-center space-x-2">
                        <input 
                          type="text" 
                          id={`reply-input-${r.id}`}
                          placeholder="Type reply back to consumer..." 
                          className="flex-1 bg-brand-dark/60 border border-brand-border text-[11px] px-2.5 py-1.5 rounded outline-none text-white focus:border-brand-orange"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              if (!input.value) return;
                              setMReviewReplies({ ...mReviewReplies, [r.id]: input.value });
                              input.value = '';
                              showToast("Reply published to feedback system", "success");
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById(`reply-input-${r.id}`) as HTMLInputElement;
                            if (input && input.value) {
                              setMReviewReplies({ ...mReviewReplies, [r.id]: input.value });
                              input.value = '';
                              showToast("Reply published to feedback system", "success");
                            }
                          }}
                          className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-bold rounded cursor-pointer transition-all"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );

        case 'Coupons':
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Promo Codes & Coupons</h3>
                  <p className="text-[11px] text-gray-400">Launch and configure promo coupons active for your storefront</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {storeCoupons.map(c => (
                    <div key={c.id} className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden">
                      {/* Ticket cutouts for aesthetics */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 rounded-r-full bg-brand-dark/90 border-r border-brand-border"></div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 rounded-l-full bg-brand-dark/90 border-l border-brand-border"></div>
                      
                      <div className="px-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 bg-brand-orange/15 rounded text-brand-orange font-mono text-[11px] font-black border border-brand-orange/20 uppercase tracking-wider">
                            Code: {c.code}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold">Usages: {c.usages}</span>
                        </div>
                        <h4 className="font-bold text-white text-[15px]">{c.discount}</h4>
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold">Min purchase required: ৳ {c.minOrder}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-brand-border/30 px-3 mt-4 pt-3.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Status: <b className="text-emerald-400">Active</b></span>
                        <button 
                          onClick={() => {
                            setCoupons(coupons.filter(item => item.id !== c.id));
                            showToast(`Coupon ${c.code} deleted`, "info");
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Coupon Form */}
              <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-4 shadow-xl h-fit">
                <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-brand-border/40 pb-3 flex items-center space-x-2">
                  <Ticket className="w-4 h-4 text-brand-orange" />
                  <span>Configure Promo Code</span>
                </h4>
                <form onSubmit={handleMerchantAddCoupon} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Coupon Promo Code</label>
                    <input 
                      type="text" 
                      required
                      value={mCouponCode}
                      onChange={(e) => setMCouponCode(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. SUMMER25, EIDBITE"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Discount Offer Display</label>
                    <input 
                      type="text" 
                      required
                      value={mCouponDiscount}
                      onChange={(e) => setMCouponDiscount(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. 20% Off, ৳100 Flat discount"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Minimum Order Amount (৳)</label>
                    <input 
                      type="number" 
                      required
                      value={mCouponMinOrder}
                      onChange={(e) => setMCouponMinOrder(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. 500"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer"
                  >
                    Publish Coupon Code
                  </button>
                </form>
              </div>
            </div>
          );

        case 'Inventory': {
          return (
            <div className="space-y-4 fade-in">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Inventory & Stocks</h3>
                <p className="text-[11px] text-gray-400">Stock level adjustments and automatic low supply notifications</p>
              </div>

              <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border/50 bg-[#0c1624] text-gray-400 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Item ID</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Remaining Stock</th>
                      <th className="py-3 px-4">Status Indicator</th>
                      <th className="py-3 px-4">Refill Stock Level</th>
                      <th className="py-3 px-4 text-right">Instant Restock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 text-xs">
                    {currentProducts.map(p => {
                      const percentage = Math.min(100, (p.stock / 120) * 100);
                      const barColor = p.stock > 20 ? 'bg-emerald-500' : (p.stock > 0 ? 'bg-orange-500' : 'bg-red-500');
                      return (
                        <tr key={p.id} className="hover:bg-brand-dark/10 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-500">{p.id}</td>
                          <td className="py-3.5 px-4 font-bold text-white">{p.name}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-300">
                            <div className="flex items-center space-x-2">
                              <span>{p.stock} units</span>
                              <div className="w-16 h-1.5 bg-brand-dark rounded-full overflow-hidden">
                                <div className={`h-full ${barColor}`} style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              p.stock > 20 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                              p.stock > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/10' :
                              'bg-red-500/10 text-red-400 border border-red-500/10'
                            }`}>
                              {p.stock > 20 ? 'Healthy' : (p.stock > 0 ? 'Low Stock' : 'Reorder Needed')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 font-bold uppercase tracking-wide">Reorder at 15 items</td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              onClick={() => {
                                const updated = products.map(item => item.id === p.id ? { ...item, stock: item.stock + 50, status: 'In Stock' } : item);
                                setProducts(updated);
                                showToast(`Refilled +50 units for ${p.name}`, "success");
                              }}
                              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-400 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                            >
                              +50 Restock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        case 'Staff':
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Outlet Employee Roster</h3>
                  <p className="text-[11px] text-gray-400">Team schedules, shift supervisors, and cashier assignments</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {storeStaff.map(s => (
                    <div key={s.id} className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 flex items-center justify-between shadow-md">
                      <div>
                        <h4 className="font-bold text-white text-sm">{s.name}</h4>
                        <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider mt-0.5">{s.role}</p>
                        <p className="text-[10px] text-gray-500 font-semibold mt-1">{s.shift} assignment</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-wider border border-emerald-500/10">
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Employee */}
              <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-4 shadow-xl h-fit">
                <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-brand-border/40 pb-3 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-brand-orange" />
                  <span>Onboard New Employee</span>
                </h4>
                <form onSubmit={handleMerchantAddStaff} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Employee Name</label>
                    <input 
                      type="text" 
                      required
                      value={mStaffName}
                      onChange={(e) => setMStaffName(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. Moniruzzaman Kabir"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Role / Position</label>
                    <select 
                      value={mStaffRole}
                      onChange={(e) => setMStaffRole(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                    >
                      <option value="Cashier">Cashier Counter Staff</option>
                      <option value="Inventory Manager">Inventory Coordinator</option>
                      <option value="Kitchen Chef">Fulfillment Cook</option>
                      <option value="Delivery Coordinator">Courier Coordinator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Working Shift</label>
                    <select 
                      value={mStaffShift}
                      onChange={(e) => setMStaffShift(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                    >
                      <option value="Day Shift">Day Shift (08:00 AM - 04:00 PM)</option>
                      <option value="Evening Shift">Evening Shift (04:00 PM - 12:00 AM)</option>
                      <option value="Night Shift">Night Shift (12:00 AM - 08:00 AM)</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer"
                  >
                    Confirm Hiring
                  </button>
                </form>
              </div>
            </div>
          );

        case 'Payments':
          return (
            <div className="space-y-6 fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 shadow-md">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Fulfillment Revenue</span>
                  <h3 className="text-xl font-bold text-white mt-1">৳ {totalEarnings.toLocaleString()}</h3>
                  <p className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center">
                    <TrendingUp className="w-2.5 mr-0.5" />
                    <span>Calculated from active orders</span>
                  </p>
                </div>
                <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 shadow-md">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Unpaid Earnings Ledger</span>
                  <h3 className="text-xl font-bold text-brand-orange mt-1">৳ {unpaidBalance.toLocaleString()}</h3>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold">After 5% marketplace fee deductions</p>
                </div>
                <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 shadow-md flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Payout Route</span>
                    <p className="text-xs font-bold text-white mt-1">Standard Chartered Bank (XXXX-892)</p>
                  </div>
                  <button 
                    onClick={handlePayoutRequest}
                    className="w-full mt-2 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Request Instant Bank Transfer
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Ledger & Disbursements Transaction Log</h4>
                <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl overflow-hidden shadow-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border/50 bg-[#0c1624] text-gray-400 text-[10px] font-black uppercase tracking-wider">
                        <th className="py-3 px-4">Transaction Code</th>
                        <th className="py-3 px-4">Fulfillment Code</th>
                        <th className="py-3 px-4">Disbursed Amount</th>
                        <th className="py-3 px-4">Deduction Commission</th>
                        <th className="py-3 px-4">Timeline</th>
                        <th className="py-3 px-4 text-right">Route Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30 text-xs">
                      {storeOrders.map((o, idx) => (
                        <tr key={idx} className="hover:bg-brand-dark/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-gray-500">#{o.id || `PAY-${idx + 1}`}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-gray-300">#{o.id}</td>
                          <td className="py-3 px-4 font-mono text-white font-bold">৳ {(o.amount * 0.95).toFixed(2)}</td>
                          <td className="py-3 px-4 font-mono text-red-400 font-bold">৳ {(o.amount * 0.05).toFixed(2)}</td>
                          <td className="py-3 px-4 text-gray-400 font-semibold">{o.time || "09:30 AM"}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[9px] font-bold uppercase">
                              Processing
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );

        case 'Reports':
          return (
            <div className="space-y-6 fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Reports & Exports</h3>
                  <p className="text-[11px] text-gray-400">Export statement ledgers and transaction digests</p>
                </div>
                <button 
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ store: activeStore.name, totalRevenue: totalEarnings, ordersCount: storeOrders.length }));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `Report_${activeStore.name.replace(/\s/g, '_')}_2024.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showToast("Statement generated and downloaded!", "success");
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-all self-start"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON Audit Statement</span>
                </button>
              </div>

              {/* Stats bento layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Weekly Performance Metrics</h4>
                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between items-center bg-brand-dark/30 p-2.5 rounded border border-brand-border/25">
                      <span className="text-gray-400 font-semibold">Average Order Value (AOV):</span>
                      <span className="font-mono text-white font-bold">৳ {(totalEarnings / (storeOrders.length || 1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-brand-dark/30 p-2.5 rounded border border-brand-border/25">
                      <span className="text-gray-400 font-semibold">Fulfillment Success Rate:</span>
                      <span className="font-mono text-emerald-400 font-bold">98.5%</span>
                    </div>
                    <div className="flex justify-between items-center bg-brand-dark/30 p-2.5 rounded border border-brand-border/25">
                      <span className="text-gray-400 font-semibold">Customer Retention Multiplier:</span>
                      <span className="font-mono text-white font-bold">2.4x</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">Automated Monthly Digests</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">Configure automated exports of your ledger transactions. Reports are formatted for clean accounting system ingest. Standard payouts settle on Friday.</p>
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <button 
                      onClick={() => showToast("CSV ledger export prepared and emailed!", "success")}
                      className="flex-1 py-2 bg-brand-dark hover:bg-brand-border/40 border border-brand-border text-gray-300 hover:text-white rounded text-xs font-bold transition-all cursor-pointer"
                    >
                      Export CSV Ledger
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );

        case 'Settings':
          return (
            <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-6 space-y-6 max-w-2xl fade-in shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Outlet Integration Settings</h3>
                <p className="text-[11px] text-gray-400">Configure sound triggers, system alerts, and routing parameters</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 bg-brand-dark/30 rounded-lg border border-brand-border/25">
                  <div>
                    <h4 className="font-bold text-white">Auditory Alarm Alerts</h4>
                    <p className="text-[11px] text-gray-500 font-semibold">Play siren alarm audio upon receiving new grocery orders</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-brand-orange w-4 h-4 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between p-3 bg-brand-dark/30 rounded-lg border border-brand-border/25">
                  <div>
                    <h4 className="font-bold text-white">Automatic Dispatch Sync</h4>
                    <p className="text-[11px] text-gray-500 font-semibold">Auto-assign nearest platform delivery courier once order is packed</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-brand-orange w-4 h-4 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between p-3 bg-brand-dark/30 rounded-lg border border-brand-border/25">
                  <div>
                    <h4 className="font-bold text-white">Daily Summary Invoices</h4>
                    <p className="text-[11px] text-gray-500 font-semibold">Dispatch daily PDF transaction reports to the assigned store admin</p>
                  </div>
                  <input type="checkbox" className="accent-brand-orange w-4 h-4 cursor-pointer" />
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    onClick={() => showToast("Notification parameters configured", "success")}
                    className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          );

        case 'Store Profile':
          return (
            <form onSubmit={handleMerchantSaveProfile} className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-6 space-y-6 max-w-2xl fade-in shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Store Profile Card Settings</h3>
                <p className="text-[11px] text-gray-400">Configure naming, storefront location, and retail status shown to clients</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Outlet Store Name</label>
                  <input 
                    type="text" 
                    required
                    value={activeStore.name}
                    onChange={(e) => {
                      const updated = stores.map(s => s.id === activeStore.id ? { ...s, name: e.target.value } : s);
                      setStores(updated);
                    }}
                    className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Department Category</label>
                  <input 
                    type="text" 
                    required
                    value={activeStore.category || "Restaurant"}
                    onChange={(e) => {
                      const updated = stores.map(s => s.id === activeStore.id ? { ...s, category: e.target.value } : s);
                      setStores(updated);
                    }}
                    className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Physical Address / Area location</label>
                  <input 
                    type="text" 
                    required
                    value={activeStore.address}
                    onChange={(e) => {
                      const updated = stores.map(s => s.id === activeStore.id ? { ...s, address: e.target.value } : s);
                      setStores(updated);
                    }}
                    className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Platform Status</label>
                  <select 
                    value={activeStore.status}
                    onChange={(e) => {
                      const updated = stores.map(s => s.id === activeStore.id ? { ...s, status: e.target.value } : s);
                      setStores(updated);
                    }}
                    className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                  >
                    <option value="Active">Active & Serving</option>
                    <option value="Suspended">Temporary Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Operating Status (Open / Closed)</label>
                  <select 
                    value={activeStore.operatingStatus || "Open"}
                    onChange={(e) => {
                      const updated = stores.map(s => s.id === activeStore.id ? { ...s, operatingStatus: e.target.value } : s);
                      setStores(updated);
                    }}
                    className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                  >
                    <option value="Open">● Open</option>
                    <option value="Closed">○ Closed</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[#10b981] hover:bg-emerald-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
          );

        case 'Marketing':
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Promo Banners & Marketing</h3>
                  <p className="text-[11px] text-gray-400">Manage digital platform campaigns and budget targets</p>
                </div>
                <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl overflow-hidden shadow-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border/50 bg-[#0c1624] text-gray-400 text-[10px] font-black uppercase tracking-wider">
                        <th className="py-3 px-4">Campaign ID</th>
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Channel</th>
                        <th className="py-3 px-4">Budget Assigned</th>
                        <th className="py-3 px-4">Engagement Clicks</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30 text-xs">
                      {marketing.map(m => (
                        <tr key={m.id} className="hover:bg-brand-dark/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-gray-500">#{m.id}</td>
                          <td className="py-3 px-4 font-bold text-white">{m.title}</td>
                          <td className="py-3 px-4 text-gray-300 font-semibold">{m.channel}</td>
                          <td className="py-3 px-4 font-mono font-bold text-white">৳ {m.budget}</td>
                          <td className="py-3 px-4 font-mono font-bold text-brand-orange">{m.clicks} Clicks</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              m.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Promo Campaign */}
              <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-4 shadow-xl h-fit">
                <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-brand-border/40 pb-3 flex items-center space-x-2">
                  <Megaphone className="w-4 h-4 text-brand-orange" />
                  <span>Launch Promo Campaign</span>
                </h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!mMarketingTitle || !mMarketingBudget) return;
                  const newMkt = {
                    id: `MKT-0${marketing.length + 1}`,
                    title: mMarketingTitle,
                    channel: mMarketingChannel,
                    budget: parseInt(mMarketingBudget) || 0,
                    clicks: 0,
                    status: 'Running'
                  };
                  setMarketing([...marketing, newMkt]);
                  setMMarketingTitle('');
                  setMMarketingBudget('');
                  showToast(`Campaign "${newMkt.title}" launched successfully!`, "success");
                }} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Campaign Name</label>
                    <input 
                      type="text" 
                      required
                      value={mMarketingTitle}
                      onChange={(e) => setMMarketingTitle(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. Free Dessert Weekend Promotion"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Channel platform</label>
                    <select 
                      value={mMarketingChannel}
                      onChange={(e) => setMMarketingChannel(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                    >
                      <option value="In-app Banner">In-App Dashboard Banner</option>
                      <option value="Push Notification">Push Notification Blast</option>
                      <option value="SMS Broadcast">Mobile SMS Broadcast</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Budget Budget (৳)</label>
                    <input 
                      type="number" 
                      required
                      value={mMarketingBudget}
                      onChange={(e) => setMMarketingBudget(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. 5000"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer"
                  >
                    Launch Campaign
                  </button>
                </form>
              </div>
            </div>
          );

        case 'Support Tickets':
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Help & Technical Support</h3>
                  <p className="text-[11px] text-gray-400">Get technical assistance or appeal financial settlement holds</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {supportTickets.filter(t => t.user === activeStore.name || t.category === 'Merchant Support').map(t => (
                    <div key={t.id} className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-3.5 shadow-md">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] text-gray-500 font-bold">Ticket: #{t.id}</span>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            t.priority === 'High' ? 'bg-red-500/15 text-red-400 border border-red-500/10' :
                            t.priority === 'Medium' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/10' :
                            'bg-blue-500/15 text-blue-400 border border-blue-500/10'
                          }`}>
                            {t.priority} Priority
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[9px] font-bold uppercase">
                            {t.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{t.subject}</h4>
                        <p className="text-xs text-gray-400 mt-1 font-semibold">Registered on: {t.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Ticket Form */}
              <div className="bg-[#0c1624]/60 border border-brand-border/60 rounded-xl p-5 space-y-4 shadow-xl h-fit">
                <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-brand-border/40 pb-3 flex items-center space-x-2">
                  <LifeBuoy className="w-4 h-4 text-brand-orange" />
                  <span>Open Help Ticket</span>
                </h4>
                <form onSubmit={handleMerchantAddTicket} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Problem Subject</label>
                    <input 
                      type="text" 
                      required
                      value={mTicketSubject}
                      onChange={(e) => setMTicketSubject(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                      placeholder="e.g. Settlement payout not cleared"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Priority Urgency</label>
                    <select 
                      value={mTicketPriority}
                      onChange={(e) => setMTicketPriority(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange"
                    >
                      <option value="Low">Low - System feedback</option>
                      <option value="Medium">Medium - Standard query</option>
                      <option value="High">High - Terminal blocker</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Detailed Message</label>
                    <textarea 
                      required
                      rows={3}
                      value={mTicketMsg}
                      onChange={(e) => setMTicketMsg(e.target.value)}
                      className="w-full bg-brand-dark/60 border border-brand-border rounded-lg p-2.5 text-white outline-none focus:border-brand-orange resize-none"
                      placeholder="Type details regarding the issue..."
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer animate-pulse"
                  >
                    Transmit Ticket
                  </button>
                </form>
              </div>
            </div>
          );

        default:
          return (
            <div className="py-20 text-center text-gray-500">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Under Development</h3>
              <p className="text-xs mt-1">This specific department is being optimized for real-time operations.</p>
            </div>
          );
      }
    };

    return (
      <div className="min-h-screen bg-brand-dark flex overflow-x-hidden font-sans antialiased text-gray-200">
        
        {/* MERCHANT SIDEBAR - Static left panel */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0c1624] border-r border-brand-border/60 shrink-0 select-none">
          {/* Brand header matching screenshot exactly */}
          <div className="p-5 border-b border-brand-border/45 flex items-center space-x-3 bg-brand-dark/15">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange shrink-0 shadow-md">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase line-clamp-1">{activeStore.name}</h1>
              <p className="text-[10px] text-brand-orange font-bold tracking-wider uppercase mt-0.5">Store Dashboard</p>
            </div>
          </div>

          {/* Navigation links matching list in screenshot */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-none">
            {merchantSidebarItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeMerchantTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveMerchantTab(item.name);
                    setMerchantSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 group cursor-pointer ${
                    isActive 
                      ? 'bg-brand-orange text-white shadow-lg' 
                      : 'text-gray-400 hover:bg-brand-card hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-orange'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-white text-brand-orange' : 'bg-brand-orange/15 text-brand-orange'}`}>
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Back to Platform Admin button masqueraded as Logout */}
            <button
              onClick={handleExitStorePortal}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 mt-4 rounded-lg text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Back to Admin</span>
            </button>
          </nav>

          {/* Bottom custom profile element matching screenshot */}
          <div className="p-4 border-t border-brand-border/40 bg-brand-dark/25 flex items-center space-x-3 select-none">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 overflow-hidden shrink-0 flex items-center justify-center text-brand-orange shadow-md relative">
              <Store className="w-5 h-5" />
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-orange/20 to-transparent"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-white uppercase tracking-wider truncate">{activeStore.name}</h4>
              <p className="text-[10px] text-gray-400 font-semibold truncate uppercase mt-0.5">{activeStore.category || "Restaurant"}</p>
              <div className="flex items-center space-x-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                  {activeStore.operatingStatus === 'Closed' ? 'Closed' : 'Open'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* MOBILE SIDEBAR FOR MERCHANT */}
        {isMerchantMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <aside className="w-[88vw] max-w-72 bg-[#0c1624] flex flex-col h-full animate-in slide-in-from-left duration-200">
              <div className="p-5 border-b border-brand-border/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-sm">B</div>
                  <span className="font-bold text-white text-xs uppercase truncate tracking-wider">{activeStore.name}</span>
                </div>
                <button onClick={() => setIsMerchantMobileSidebarOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {merchantSidebarItems.map((item) => {
                  const IconComp = item.icon;
                  const isActive = activeMerchantTab === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveMerchantTab(item.name);
                        setMerchantSearchQuery('');
                        setIsMerchantMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        isActive ? 'bg-brand-orange text-white' : 'text-gray-400 hover:bg-brand-card hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComp className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={handleExitStorePortal}
                  className="w-full flex items-center space-x-3 px-3 py-2 mt-4 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Back to Admin</span>
                </button>
              </nav>
            </aside>
          </div>
        )}

        {/* MERCHANT BODY PANEL */}
        <div className="flex-1 flex min-w-0 flex-col overflow-hidden">
          
          {/* HEADER - top navbar matching layout exactly */}
          <header className="min-h-16 bg-[#0c1624] border-b border-brand-border/60 flex flex-wrap items-start justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6 shrink-0 shadow-md">
            {/* Left: Breadcrumbs welcome */}
            <div className="flex min-w-0 items-start space-x-3">
              <button 
                onClick={() => setIsMerchantMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 bg-brand-dark/80 hover:bg-brand-border border border-brand-border rounded-md text-gray-300"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-brand-orange uppercase tracking-wider">{activeMerchantTab}</span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase">/</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-black uppercase px-1.5 py-0.5 rounded tracking-widest animate-pulse">
                    Outlet Panel Live
                  </span>
                </div>
                <h1 className="mt-0.5 truncate text-xs font-black text-white uppercase tracking-wider">Welcome back, {activeStore.name}!</h1>
              </div>
            </div>

            {/* Middle: Universal Search Bar with hotkey */}
            <div className="order-3 hidden w-full items-center space-x-2 bg-brand-dark/80 border border-brand-border px-3 py-1.5 rounded-lg transition-all group focus-within:border-brand-orange md:order-none md:flex md:w-72 lg:w-80">
              <Search className="w-3.5 h-3.5 text-gray-500 group-focus-within:text-brand-orange" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                value={merchantSearchQuery}
                onChange={(e) => setMerchantSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder-gray-500"
              />
              <span className="text-[9px] font-black text-gray-500 bg-brand-card/80 border border-brand-border px-1.5 py-0.5 rounded">Ctrl + /</span>
            </div>

            {/* Right: Badge notifications, profile avatar dropdown */}
            <div className="flex w-full items-center justify-end gap-2 sm:gap-3 md:w-auto">
              {/* Inbox notifications */}
              <div className="relative">
                <button 
                  onClick={() => setIsMerchantNotifDropdownOpen(!isMerchantNotifDropdownOpen)}
                  className="p-2 bg-brand-dark hover:bg-brand-border/30 border border-brand-border hover:border-brand-orange/40 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer relative"
                >
                  <Bell className="w-4 h-4" />
                  {merchantUnreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-lg border border-[#0c1624]">
                      {merchantUnreadNotifCount}
                    </span>
                  )}
                </button>
                {/* Notification Dropdown list */}
                {isMerchantNotifDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-[min(18rem,calc(100vw-1.5rem))] bg-[#0c1624] border border-brand-border rounded-xl p-4 shadow-2xl z-50 text-xs space-y-3 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                      <span className="font-black text-white uppercase tracking-wider text-[10px]">Active Orders Alert</span>
                      <button 
                        onClick={() => {
                          setMerchantUnreadNotifCount(0);
                          setIsMerchantNotifDropdownOpen(false);
                          showToast("Notifications cleared", "info");
                        }} 
                        className="text-[9px] text-brand-orange hover:underline font-bold uppercase"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-2.5 max-h-48 overflow-y-auto">
                      <div className="p-2 bg-brand-dark/40 rounded border border-brand-border/20 space-y-0.5">
                        <div className="flex justify-between font-bold text-white text-[10px]">
                          <span>🛒 New Grocery Request</span>
                          <span className="text-[9px] text-brand-orange">Just Now</span>
                        </div>
                        <p className="text-gray-400">A real customer order has been requested and assigned to prepare.</p>
                      </div>
                      <div className="p-2 bg-brand-dark/40 rounded border border-brand-border/20 space-y-0.5">
                        <div className="flex justify-between font-bold text-white text-[10px]">
                          <span>📦 Stock Refill Required</span>
                          <span className="text-[9px] text-gray-500">2h ago</span>
                        </div>
                        <p className="text-gray-400">Jasmine Rice 1kg has crossed critical reorder thresholds.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message box */}
              <button className="p-2 bg-brand-dark hover:bg-brand-border/30 border border-brand-border hover:border-brand-orange/40 text-gray-400 hover:text-white rounded-lg transition-all relative">
                <Mail className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-lg border border-[#0c1624]">
                  3
                </span>
              </button>

              {/* Separator */}
              <span className="w-px h-6 bg-brand-border/60"></span>

              {/* Admin credentials & Avatar profile dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsMerchantProfileDropdownOpen(!isMerchantProfileDropdownOpen)}
                  className="flex items-center space-x-2 hover:bg-brand-card/60 p-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" 
                    alt="Store Admin" 
                    referrerPolicy="no-referrer"
                    className="w-7.5 h-7.5 rounded-full object-cover border border-brand-orange/40 shadow" 
                  />
                  <div className="text-left hidden xl:block">
                    <span className="block text-xs font-black text-white leading-none">Store Admin</span>
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Store Admin</span>
                  </div>
                </button>
                {isMerchantProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#0c1624] border border-brand-border rounded-xl p-2 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in duration-200">
                    <button 
                      onClick={() => {
                        setActiveMerchantTab('Store Profile');
                        setIsMerchantProfileDropdownOpen(false);
                      }} 
                      className="w-full text-left px-3 py-2 hover:bg-brand-card text-white font-bold rounded-lg transition-all uppercase tracking-wider text-[10px]"
                    >
                      Store Profile Settings
                    </button>
                    <button 
                      onClick={() => {
                        setActiveMerchantTab('Settings');
                        setIsMerchantProfileDropdownOpen(false);
                      }} 
                      className="w-full text-left px-3 py-2 hover:bg-brand-card text-white font-bold rounded-lg transition-all uppercase tracking-wider text-[10px]"
                    >
                      Outlet Preferences
                    </button>
                    <hr className="border-brand-border/30 my-1" />
                    <button 
                      onClick={handleExitStorePortal} 
                      className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 font-bold rounded-lg transition-all uppercase tracking-wider text-[10px]"
                    >
                      Exit to Super Admin
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN CONTAINER PAGE BODY */}
          <main className="mx-auto flex-1 w-full max-w-7xl space-y-4 overflow-x-hidden overflow-y-auto p-3 scrollbar-thin sm:p-4 md:space-y-6 md:p-6 xl:p-8">
            {renderMerchantTabContent()}
          </main>

          {/* TOAST SYSTEM POPUP */}
          {toast && (
            <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-brand-dark border border-brand-border px-4 py-3 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-brand-orange animate-pulse'}`} />
              <p className="text-xs font-bold text-white uppercase tracking-wider">{toast.message}</p>
            </div>
          )}

          {/* PRINTABLE RECEIPT OVERLAY MODAL */}
          {printingReceiptOrder && (() => {
            const deliveryFee = 40;
            const orderAmount = printingReceiptOrder.amount;
            const computedSubtotal = Math.max(0, Math.round((orderAmount - deliveryFee) / 1.05));
            const computedTax = Math.max(0, orderAmount - computedSubtotal - deliveryFee);
            
            const realOrderItems = Array.isArray((printingReceiptOrder as any).items) ? (printingReceiptOrder as any).items : [];
            const receiptItems = realOrderItems.length
              ? realOrderItems.map((item: any) => ({ name: item.name || item.productName || 'Order item', qty: item.quantity || item.qty || 1, price: item.price || item.amount || 0 }))
              : [{ name: 'Order subtotal', qty: 1, price: computedSubtotal }];

            return (
              <div id="printable-receipt-modal" className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0 print:m-0">
                <style>{`
                  @media print {
                    /* Hide everything else on the page during physical print */
                    body * {
                      visibility: hidden !important;
                    }
                    /* Show only the printable modal container and its nested descendants */
                    #printable-receipt-modal, 
                    #printable-receipt-modal * {
                      visibility: visible !important;
                    }
                    /* Re-anchor printable receipt container strictly to top-left of paper */
                    #printable-receipt-modal {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      background: white !important;
                      color: black !important;
                      box-shadow: none !important;
                    }
                    .no-print {
                      display: none !important;
                      visibility: hidden !important;
                    }
                  }
                `}</style>

                {/* Main Modal Box Container */}
                <div className="bg-white text-gray-900 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-gray-100 print:border-none print:shadow-none print:max-h-none print:w-full">
                  {/* Header Preview Action Banner - Hidden on physical printed paper */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between no-print">
                    <div className="flex items-center space-x-2">
                      <Printer className="w-4 h-4 text-brand-orange animate-pulse" />
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Print Preview Receipt</span>
                    </div>
                    <button 
                      onClick={() => setPrintingReceiptOrder(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-all cursor-pointer"
                      title="Close Preview"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Cash Receipt Paper Area (Monospaced styled for premium authentic look) */}
                  <div className="p-8 overflow-y-auto flex-1 bg-white font-mono text-xs text-black border-b border-dashed border-gray-300 print:overflow-visible print:p-0">
                    <div className="space-y-6">
                      {/* Store Details Header */}
                      <div className="text-center space-y-2">
                        {/* Placeholder Brand Logo - High Contrast Vector Badge for Screen & Paper Media */}
                        <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                          <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shadow-xs border-2 border-black print:bg-black print:text-white print:border-black">
                            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                              <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h6v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/>
                            </svg>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[9px] font-black tracking-widest uppercase text-black print:text-black">
                            <span>★</span>
                            <span>SMART SHOP BRAND</span>
                            <span>★</span>
                          </div>
                        </div>

                        <h2 className="text-lg font-black uppercase tracking-tight text-black print:text-black">{activeStore.name}</h2>
                        <p className="text-[10px] text-gray-600 uppercase font-bold">Official Invoice & Cash Voucher</p>
                        <p className="text-[9px] text-gray-500 leading-normal">{activeStore.address || 'Dhanmondi, Dhaka, Bangladesh'}</p>
                        <p className="text-[9px] text-gray-500">Phone Contact: +880 1712-345678</p>
                      </div>

                      {/* Receipt divider lines */}
                      <div className="text-center text-gray-400 font-bold tracking-widest leading-none select-none">
                        ------------------------------------------
                      </div>

                      {/* Receipt Metadata information */}
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">INVOICE CODE:</span>
                          <span className="font-bold">#{printingReceiptOrder.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">DATE & TIME:</span>
                          <span>{printingReceiptOrder.date} • {printingReceiptOrder.time || '11:46 AM'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">PAYMENT BY:</span>
                          <span className="font-bold uppercase">{printingReceiptOrder.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">ORDER STATE:</span>
                          <span className="font-bold uppercase text-emerald-600">{printingReceiptOrder.status}</span>
                        </div>
                      </div>

                      {/* Receipt divider lines */}
                      <div className="text-center text-gray-400 font-bold tracking-widest leading-none select-none">
                        - - - - - - - - - - - - - - - - - - - - -
                      </div>

                      {/* Customer / Logistics delivery details */}
                      <div className="space-y-1.5 text-[11px] bg-gray-50 p-2.5 rounded border border-gray-100 print:bg-white print:border-none print:p-0">
                        <p className="font-black text-gray-700 text-[10px] uppercase tracking-wider mb-1">Customer Delivery Details:</p>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">DELIVERY TYPE:</span>
                          <span className="font-bold text-gray-900">🏠 HOME DELIVERY</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">ORDER RESPONSE:</span>
                          <span className="font-bold text-emerald-700">✔ CONFIRMED</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">DELIVERY MODE:</span>
                          <span className="font-bold">{printingReceiptOrder.priority || 'Normal'}</span>
                        </div>
                        <p className="font-bold text-gray-900">{printingReceiptOrder.customerName}</p>
                        {printingReceiptOrder.customerPhone && (
                          <p className="text-gray-600">Phone: {printingReceiptOrder.customerPhone}</p>
                        )}
                        <p className="text-gray-600 leading-snug">Deliver to: {printingReceiptOrder.address || 'Dhanmondi Road 8A, Dhaka'}</p>
                        {printingReceiptOrder.zone && (
                          <p className="text-gray-600">Delivery Zone: {printingReceiptOrder.zone}</p>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Est. Delivery:</span>
                          <span className="font-bold text-gray-800">{printingReceiptOrder.estimatedMinutes ? `${printingReceiptOrder.estimatedMinutes} min` : '30 min'}</span>
                        </div>
                        {printingReceiptOrder.codAmount ? (
                          <div className="flex justify-between border-t border-dashed border-gray-300 pt-1 mt-0.5">
                            <span className="font-bold text-gray-600">COD COLLECT:</span>
                            <span className="font-bold text-gray-900">৳{printingReceiptOrder.codAmount.toLocaleString()}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Receipt divider lines */}
                      <div className="text-center text-gray-400 font-bold tracking-widest leading-none select-none">
                        - - - - - - - - - - - - - - - - - - - - -
                      </div>

                      {/* Items Listing Table */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 text-[10px] font-black text-gray-500 uppercase tracking-wider pb-1.5 border-b border-gray-200">
                          <div className="col-span-6">Item Desc</div>
                          <div className="col-span-2 text-center">Qty</div>
                          <div className="col-span-2 text-right">Price</div>
                          <div className="col-span-2 text-right">Total</div>
                        </div>

                        <div className="divide-y divide-dashed divide-gray-200 space-y-2 pt-1 text-[11px]">
                          {receiptItems.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 pt-2 first:pt-0">
                              <div className="col-span-6 font-bold text-gray-800 break-words">{item.name}</div>
                              <div className="col-span-2 text-center text-gray-600">{item.qty}</div>
                              <div className="col-span-2 text-right font-mono text-gray-600">৳{item.price.toLocaleString()}</div>
                              <div className="col-span-2 text-right font-mono font-bold">৳{(item.price * item.qty).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Receipt divider lines */}
                      <div className="text-center text-gray-400 font-bold tracking-widest leading-none select-none">
                        ------------------------------------------
                      </div>

                      {/* Total calculation breakdowns */}
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>Items Subtotal:</span>
                          <span className="font-mono">৳{computedSubtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Govt VAT / Tax (5%):</span>
                          <span className="font-mono">৳{computedTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Delivery Logistics:</span>
                          <span className="font-mono">৳{deliveryFee.toLocaleString()}</span>
                        </div>
                        <div className="text-center text-gray-300 font-bold tracking-widest leading-none select-none py-1">
                          - - - - - - - - - - - - -
                        </div>
                        <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
                          <span>TOTAL PAID AMOUNT:</span>
                          <span className="font-mono text-base text-gray-900">৳{orderAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Receipt divider lines */}
                      <div className="text-center text-gray-400 font-bold tracking-widest leading-none select-none">
                        ==========================================
                      </div>

                      {/* Dynamically Generated QR Code for Warehouse Logistics Scanning */}
                      <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg border border-gray-200/80 text-center space-y-2 print:bg-white print:border-none print:p-0">
                        <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs print:border-black print:p-1">
                          <QRCodeSVG 
                            value={JSON.stringify({
                              orderId: printingReceiptOrder.id,
                              store: activeStore.name,
                              customer: printingReceiptOrder.customerName,
                              amount: printingReceiptOrder.amount,
                              status: printingReceiptOrder.status
                            })}
                            size={96}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-[9px] text-gray-800 tracking-wider uppercase">
                            Warehouse Logistics QR Code
                          </p>
                          <p className="text-[8px] text-gray-500 font-mono">
                            SCAN FOR FAST DISPATCH • ORDER #{printingReceiptOrder.id}
                          </p>
                        </div>
                      </div>

                      {/* Barcode and thank you footer */}
                      <div className="text-center space-y-2.5 pt-1">
                        <div className="font-mono text-[9px] text-gray-400 tracking-widest select-none">
                          ||||||| | |||||||| |||| | ||||||| | ||||
                          <span className="block text-[8px] text-gray-500 tracking-normal mt-0.5">MEMBER ID: CUST-981- {printingReceiptOrder.customerName.replace(/\s/g, '').toUpperCase().slice(0, 4)}</span>
                        </div>
                        <p className="text-[10px] font-black uppercase text-gray-800 tracking-wider">*** Thank you for shopping! ***</p>
                        <p className="text-[8px] text-gray-500">Powered by Antigravity OS Marketplace Platform</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer - Hidden on physical printed paper */}
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex space-x-3 no-print">
                    <button
                      onClick={() => setPrintingReceiptOrder(null)}
                      className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Close Preview
                    </button>
                    <button
                      onClick={() => {
                        window.print();
                        showToast("Document transmitted to printer spool!", "success");
                      }}
                      className="flex-1 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Trigger Print</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* FOOTER */}
          <footer className="py-4 border-t border-brand-border/40 text-center text-[10px] text-gray-500 bg-[#0c1624]/20 select-none flex flex-col items-center justify-between gap-2 px-4 shrink-0 sm:flex-row sm:px-6">
            <p>© 2026 {activeStore.name}. All rights reserved. The NexaGo BD</p>
            <p className="font-mono text-gray-600">Version 1.0.0</p>
          </footer>
        </div>
      </div>
    );
  }

  const handleSuperAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = superAdminLogin.user.trim();
    const confirmBiometric = async () => {
      const pk = window.PublicKeyCredential;
      if (!pk || !navigator.credentials) return true;
      const available = await pk.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
      if (!available) return true;
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'The NexaGo BD' },
          user: { id: challenge, name: userId || 'super-admin', displayName: 'Super Admin' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60_000,
        },
      });
      return true;
    };
    const runLogin = () => {
    securityApi('/login', { userId, password: superAdminLogin.password, secretCode: superAdminLoginStep === 'secret' ? superAdminLogin.secretCode : '' }).then((data) => {
      if (data.requiresSecret) {
        setSuperAdminLoginStep('secret');
        setSuperAdminLoginError('');
        showToast('Password verified. Enter secret code.', 'info');
        return;
      }
      if (data.user?.role !== 'super-admin') throw new Error('not super admin');
      localStorage.setItem('sd_security_session', data.token);
      localStorage.setItem('sd_super_admin_login', 'verified');
      setIsSuperAdminLoggedIn(true);
      setSuperAdminLoginStep('credentials');
      setSuperAdminLoginError('');
      securityAudit('super-admin-login-success', { actor: userId, reason: 'server verified super admin login' });
      showToast('Super Admin login successful.', 'success');
    }).catch(() => {
      setSuperAdminLoginError(superAdminLoginStep === 'secret' ? 'Invalid secret code.' : 'Invalid Super Admin username/email or password.');
      securityAudit('super-admin-login-failed', { actor: userId || 'unknown', reason: 'server rejected super admin login' });
    });
    };
    if (superAdminLoginStep === 'secret') {
      confirmBiometric().catch(() => {
        securityAudit('super-admin-biometric-skipped', { actor: userId || 'unknown', reason: 'device verification unavailable or rejected; secret code fallback used' });
        return true;
      }).then(runLogin).catch(() => {
        setSuperAdminLoginError('Secret code verification failed.');
      });
      return;
    }
    runLogin();
  };

  const handleSuperAdminPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (superAdminPasswordForm.newPassword !== superAdminPasswordForm.confirmPassword) {
      setSuperAdminPasswordError('New password and confirm password do not match.');
      return;
    }
    securityApi('/super-admin/password', {
      currentPassword: superAdminPasswordForm.currentPassword,
      newPassword: superAdminPasswordForm.newPassword,
      secretCode: superAdminPasswordForm.secretCode,
      reason: 'Super Admin changed login password from secured dashboard',
    }).then((data) => {
      setSuperAdminPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', secretCode: '' });
      setSuperAdminPasswordError('');
      securityAudit('super-admin-password-change-ui-success', { actor: 'super-admin', reason: 'secret code verified', newValue: { changedUsers: data.changedUsers || [] } });
      showToast('Super Admin password changed securely.', 'success');
    }).catch((err) => {
      setSuperAdminPasswordError(String(err?.message || 'Password change failed. Check current password and secret code.'));
      securityAudit('super-admin-password-change-ui-failed', { actor: 'super-admin', reason: 'server rejected password change' });
    });
  };

  const refreshSuperAdminSessions = () => {
    securityApi('/sessions').then((data) => {
      setSuperAdminSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setSuperAdminSessionsError('');
    }).catch(() => setSuperAdminSessionsError('Device sessions could not load.'));
  };

  const updateSuperAdminSession = (tokenId: string, action: 'inactive' | 'block') => {
    securityApi('/session-action', { tokenId, action }).then(() => {
      refreshSuperAdminSessions();
      showToast(action === 'block' ? 'Device blocked.' : 'Device set inactive.', 'success');
    }).catch(() => showToast('Device action failed.', 'info'));
  };

  useEffect(() => {
    if (!isSuperAdminLoggedIn) return;
    refreshSuperAdminSessions();
    const timer = window.setInterval(refreshSuperAdminSessions, 10_000);
    return () => window.clearInterval(timer);
  }, [isSuperAdminLoggedIn]);

  useEffect(() => {
    if (!isSuperAdminLoggedIn || !navigator.geolocation) return;
    const sendLocation = (pos: GeolocationPosition) => {
      securityApi('/session-location', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }).catch(() => {});
    };
    navigator.geolocation.getCurrentPosition(sendLocation, () => {}, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 });
    const watchId = navigator.geolocation.watchPosition(sendLocation, () => {}, { enableHighAccuracy: true, timeout: 20_000, maximumAge: 15_000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSuperAdminLoggedIn]);

  if (isSuperAdminRoute && !isSuperAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#070d16] text-gray-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_28%)]" />
        <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-brand-border bg-[#0c1624] shadow-2xl">
          <div className="grid min-h-[560px] lg:grid-cols-[1fr_420px]">
            <div className="flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-orange">
                  <ShieldCheck className="h-3.5 w-3.5" /> Secured Super Admin
                </div>
                <h1 className="mt-6 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl">The NexaGo BD Control Center</h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-gray-400">Protected dashboard access for platform records, store approvals, staff controls, security audit and emergency operations.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Security', 'Audit alerts active'],
                  ['Access', 'Role protected'],
                  ['Data', 'Store isolated'],
                ].map(([title, sub]) => (
                  <div key={title} className="rounded-xl border border-brand-border bg-[#080e17] p-3">
                    <p className="text-[10px] font-black uppercase text-white">{title}</p>
                    <p className="mt-1 text-[9px] text-gray-500">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={handleSuperAdminLogin} className="flex flex-col justify-center border-t border-brand-border bg-[#101d30] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange">Login Required</p>
                <h2 className="mt-2 text-xl font-black text-white">Super Admin Dashboard</h2>
                <p className="mt-1 text-[11px] text-gray-400">{superAdminLoginStep === 'secret' ? 'Password accepted. Enter the Super Admin secret code.' : 'Enter authorized username/email and password.'}</p>
              </div>
              <div className="space-y-3">
                {superAdminLoginStep === 'credentials' ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">Username / Email</span>
                      <input value={superAdminLogin.user} onChange={e => setSuperAdminLogin(prev => ({ ...prev, user: e.target.value }))} className="w-full rounded-xl border border-brand-border bg-[#080e17] px-4 py-3 text-sm text-white outline-none focus:border-brand-orange" placeholder="Username or email" autoComplete="username" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">Password</span>
                      <input value={superAdminLogin.password} onChange={e => setSuperAdminLogin(prev => ({ ...prev, password: e.target.value }))} className="w-full rounded-xl border border-brand-border bg-[#080e17] px-4 py-3 text-sm text-white outline-none focus:border-brand-orange" placeholder="Password" type="password" autoComplete="current-password" />
                    </label>
                  </>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">Secret Code</span>
                    <input value={superAdminLogin.secretCode} onChange={e => setSuperAdminLogin(prev => ({ ...prev, secretCode: e.target.value }))} className="w-full rounded-xl border border-brand-border bg-[#080e17] px-4 py-3 text-sm text-white outline-none focus:border-brand-orange" placeholder="Secret code" type="password" inputMode="numeric" autoComplete="one-time-code" autoFocus />
                  </label>
                )}
                {superAdminLoginError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-300">{superAdminLoginError}</p>}
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-[11px] font-black uppercase tracking-wider text-white shadow-lg transition-colors hover:bg-brand-orange-hover">
                  <ShieldCheck className="h-4 w-4" /> {superAdminLoginStep === 'secret' ? 'Verify Secret Code' : 'Next'}
                </button>
                {superAdminLoginStep === 'secret' && (
                  <button type="button" onClick={() => { setSuperAdminLoginStep('credentials'); setSuperAdminLogin(prev => ({ ...prev, secretCode: '' })); setSuperAdminLoginError(''); }} className="w-full rounded-xl border border-brand-border px-4 py-2 text-[10px] font-black uppercase text-gray-300 hover:border-brand-orange">
                    Back
                  </button>
                )}
              </div>
              <p className="mt-5 text-center text-[10px] text-gray-500">All login attempts are audited by the security system.</p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'Customer Site') {
    return (
      <CustomerStorefront
        stores={stores}
        products={products}
        orders={orders}
        liveDrivers={liveDrivers}
        onAddOrder={handleAddOrder}
        onUpdateOrder={handleUpdateOrder}
        onSilentUpdateOrder={handleSilentUpdateOrder}
        onReturnToAdmin={() => setActiveTab('Dashboard')}
        onLaunchMerchantStore={handleLaunchStore}
        onReport={handleOrderReport}
        reports={orderReports}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex overflow-x-hidden font-sans antialiased text-gray-200">
      {selectedDeviceSession && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-brand-border bg-[#0c1624] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-brand-border p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-brand-orange">Live Phone Device</p>
                <h3 className="mt-1 text-sm font-black text-white">{selectedDeviceSession.userId || 'Unknown device'}</h3>
              </div>
              <button onClick={() => setSelectedDeviceSession(null)} className="rounded-lg border border-brand-border px-3 py-1.5 text-[10px] font-black uppercase text-gray-300 hover:border-brand-orange">Close</button>
            </div>
            <div className="space-y-3 p-4 text-[10px]">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-brand-border bg-[#070e17] p-3">
                  <p className="text-gray-500">IP Address</p>
                  <p className="mt-1 font-mono font-bold text-white">{selectedDeviceSession.ip || 'Not available'}</p>
                </div>
                <div className="rounded-xl border border-brand-border bg-[#070e17] p-3">
                  <p className="text-gray-500">Status</p>
                  <p className="mt-1 font-bold text-white">{selectedDeviceSession.status || (selectedDeviceSession.active ? 'Active' : 'Inactive')}</p>
                </div>
              </div>
              <div className="rounded-xl border border-brand-border bg-[#070e17] p-3">
                <p className="text-gray-500">Phone / Browser Detail</p>
                <p className="mt-1 break-words font-mono text-[9px] text-gray-200">{selectedDeviceSession.device || 'Unknown device'}</p>
              </div>
              {selectedDeviceSession.location ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-brand-border bg-[#070e17] p-3">
                      <p className="text-gray-500">Latitude</p>
                      <p className="mt-1 font-mono font-bold text-white">{Number(selectedDeviceSession.location.lat).toFixed(6)}</p>
                    </div>
                    <div className="rounded-xl border border-brand-border bg-[#070e17] p-3">
                      <p className="text-gray-500">Longitude</p>
                      <p className="mt-1 font-mono font-bold text-white">{Number(selectedDeviceSession.location.lng).toFixed(6)}</p>
                    </div>
                    <div className="rounded-xl border border-brand-border bg-[#070e17] p-3">
                      <p className="text-gray-500">Accuracy</p>
                      <p className="mt-1 font-mono font-bold text-white">±{Math.round(Number(selectedDeviceSession.location.accuracy || 0))}m</p>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-brand-border bg-[#070e17]">
                    <iframe
                      title="Live device location"
                      src={`https://maps.google.com/maps?q=${selectedDeviceSession.location.lat},${selectedDeviceSession.location.lng}&z=16&output=embed`}
                      className="h-64 w-full border-0"
                      loading="lazy"
                    />
                  </div>
                  <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedDeviceSession.location.lat},${selectedDeviceSession.location.lng}`, '_blank')} className="w-full rounded-xl bg-brand-orange px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white">
                    Start Route To This Phone
                  </button>
                </>
              ) : (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 font-bold text-amber-300">Location not available. Phone browser must allow location permission.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* SIDEBAR - Left panel */}
      {/* Desktop static Sidebar */}
      {activeTab !== 'POS System' && (
      <aside className="hidden lg:flex flex-col w-64 bg-[#0c1624] border-r border-brand-border/60 shrink-0 select-none">
        
        {/* Workspace Switcher Header for 3 Separate Dashboards */}
        <div className="p-3 border-b border-brand-border/40 bg-brand-dark/40 space-y-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-orange text-white flex items-center justify-center font-black shrink-0 shadow-md">
              {activePanelMode === 'super_admin' ? <ShieldCheck className="w-5 h-5 text-white" /> :
               activePanelMode === 'store' ? <ShoppingCart className="w-5 h-5 text-white" /> : 
               <Truck className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xs font-black text-white tracking-wide uppercase truncate">
                {activePanelMode === 'super_admin' ? 'Super Admin' :
                 'The NexaGo BD'}
              </h1>
              <p className="text-[9px] text-brand-orange font-bold tracking-wider uppercase">
                {activePanelMode === 'super_admin' ? 'Control Center' :
                 activePanelMode === 'store' ? 'Store Catalog' : 'Logistics Fleet'}
              </p>
            </div>
          </div>

          <div className="flex bg-[#070e17] p-1 rounded-lg border border-brand-border/60">
            <button
              onClick={() => {
                setActivePanelMode('super_admin');
                setActiveTab('Dashboard');
                showToast("Switched to Super Admin Control Center Dashboard", "info");
              }}
              className={`flex-1 py-1 px-1 text-[9px] font-bold rounded flex items-center justify-center space-x-0.5 cursor-pointer ${
                activePanelMode === 'super_admin' ? 'bg-brand-orange text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Super</span>
            </button>
            <button
              onClick={() => {
                setActivePanelMode('store');
                setActiveTab('Store Dashboard');
                 showToast("Switched to The NexaGo BD Admin Dashboard", "info");
              }}
              className={`flex-1 py-1 px-1 text-[9px] font-bold rounded flex items-center justify-center space-x-0.5 cursor-pointer ${
                activePanelMode === 'store' ? 'bg-brand-orange text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3 h-3" />
              <span>Store</span>
            </button>
            <button
              onClick={() => {
                setActivePanelMode('delivery');
                setActiveTab('Dashboard');
                showToast("Switched to Delivery Management Dashboard", "info");
              }}
              className={`flex-1 py-1 px-1 text-[9px] font-bold rounded flex items-center justify-center space-x-0.5 cursor-pointer ${
                activePanelMode === 'delivery' ? 'bg-brand-orange text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Truck className="w-3 h-3" />
              <span>Delivery</span>
            </button>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-none">
          {sidebarItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.name;
            return (
              <React.Fragment key={item.name}>
                {item.section && (
                  <div className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-wider text-brand-orange/90 border-t border-brand-border/40 mt-2 first:mt-0 first:border-0 first:pt-0">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (item.onClick) { item.onClick(); } else { setActiveTab(item.name); }
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all relative ${
                    isActive 
                      ? 'bg-brand-orange text-white font-bold shadow-md' 
                      : 'text-gray-300 hover:text-white hover:bg-[#132238]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badgeCount !== undefined && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-border/60 text-gray-300'
                    }`}>
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}

          <button
            onClick={() => {
              localStorage.removeItem('sd_super_admin_login');
              setIsSuperAdminLoggedIn(false);
              setSuperAdminLogin({ user: '', password: '', secretCode: '' });
              setSuperAdminLoginStep('credentials');
              showToast("Session reset. Welcome to The NexaGo BD Admin Panel!", "info");
              setActiveTab('Dashboard');
            }}
            className="w-full flex items-center space-x-3 px-3 py-2.5 mt-3 rounded-lg text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500/10 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>

          {false && activePanelMode === 'super_admin' && (
            <form onSubmit={handleSuperAdminPasswordChange} className="mt-3 rounded-xl border border-brand-border bg-[#070e17] p-3 space-y-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-brand-orange">Password Control</p>
                <p className="mt-0.5 text-[8px] leading-relaxed text-gray-500">Secret code required before changing Super Admin login.</p>
              </div>
              <input
                value={superAdminPasswordForm.currentPassword}
                onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                type="password"
                placeholder="Current password"
                className="w-full rounded-lg border border-brand-border bg-[#0c1624] px-2.5 py-2 text-[10px] text-white outline-none focus:border-brand-orange"
              />
              <input
                value={superAdminPasswordForm.newPassword}
                onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                type="password"
                placeholder="New password"
                className="w-full rounded-lg border border-brand-border bg-[#0c1624] px-2.5 py-2 text-[10px] text-white outline-none focus:border-brand-orange"
              />
              <input
                value={superAdminPasswordForm.confirmPassword}
                onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                type="password"
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-brand-border bg-[#0c1624] px-2.5 py-2 text-[10px] text-white outline-none focus:border-brand-orange"
              />
              <input
                value={superAdminPasswordForm.secretCode}
                onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, secretCode: e.target.value }))}
                type="password"
                inputMode="numeric"
                placeholder="Secret code"
                className="w-full rounded-lg border border-brand-border bg-[#0c1624] px-2.5 py-2 text-[10px] text-white outline-none focus:border-brand-orange"
              />
              {superAdminPasswordError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[8px] font-bold text-red-300">{superAdminPasswordError}</p>}
              <button type="submit" className="w-full rounded-lg bg-brand-orange px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white hover:bg-brand-orange-hover">
                Change Password
              </button>
            </form>
          )}

          {false && activePanelMode === 'super_admin' && (
            <div className="mt-3 rounded-xl border border-brand-border bg-[#070e17] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-brand-orange">Live Devices</p>
                  <p className="mt-0.5 text-[8px] text-gray-500">{superAdminSessions.filter(s => s.active).length} active / {superAdminSessions.length} total</p>
                </div>
                <button type="button" onClick={refreshSuperAdminSessions} className="rounded-lg border border-brand-border px-2 py-1 text-[8px] font-black uppercase text-gray-300 hover:border-brand-orange">Refresh</button>
              </div>
              {superAdminSessionsError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[8px] font-bold text-red-300">{superAdminSessionsError}</p>}
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {superAdminSessions.slice(0, 8).map((session) => (
                  <div key={session.tokenId} className="rounded-lg border border-brand-border/70 bg-[#0c1624] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[9px] font-black text-white">{session.userId || 'Unknown'}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${session.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-300'}`}>{session.status || (session.active ? 'Active' : 'Inactive')}</span>
                    </div>
                    <p className="mt-1 truncate text-[8px] text-gray-500">{session.ip || 'No IP'} · {String(session.device || 'Unknown device').slice(0, 52)}</p>
                    <p className="mt-0.5 text-[8px] text-gray-600">{session.createdAt ? new Date(Number(session.createdAt)).toLocaleString() : 'No time'}</p>
                    {session.location ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDeviceSession(session)}
                        className="mt-1 w-full rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-left text-[8px] font-bold text-sky-300 hover:bg-sky-500/15"
                      >
                        Open live location popup
                      </button>
                    ) : (
                      <p className="mt-1 text-[8px] text-gray-600">Location waiting for phone permission.</p>
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <button type="button" onClick={() => updateSuperAdminSession(session.tokenId, 'inactive')} className="rounded-md border border-amber-500/30 px-2 py-1 text-[8px] font-black uppercase text-amber-300 hover:bg-amber-500/10">Inactive</button>
                      <button type="button" onClick={() => updateSuperAdminSession(session.tokenId, 'block')} className="rounded-md border border-red-500/30 px-2 py-1 text-[8px] font-black uppercase text-red-300 hover:bg-red-500/10">Block</button>
                    </div>
                  </div>
                ))}
                {!superAdminSessions.length && <p className="rounded-lg border border-brand-border/60 px-2 py-3 text-center text-[8px] text-gray-500">No device session found.</p>}
              </div>
            </div>
          )}
        </nav>

        {/* Profile Footer */}
        <div className="p-4 border-t border-brand-border/40 bg-brand-dark/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-orange text-white flex items-center justify-center font-black text-xs shadow-md">
              AU
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">Admin User</h4>
              <p className="text-[9px] text-gray-400 font-semibold uppercase">Super Administrator</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[9px] font-bold text-emerald-400">Online</span>
          </div>
        </div>
      </aside>
      )}

      {/* Mobile Sidebar overlay Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-brand-dark/80 backdrop-blur-xs">
          <div className="w-[88vw] max-w-72 bg-[#0c1624] border-r border-brand-border flex flex-col h-full animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-dark/30">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-orange text-white flex items-center justify-center font-black text-xs shadow-md">
                  <Box className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xs font-black text-white tracking-wide uppercase">The NexaGo BD</h1>
                  <p className="text-[9px] text-brand-orange font-bold uppercase">Admin Panel</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-brand-dark cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-none">
              {sidebarItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <React.Fragment key={item.name}>
                    {item.section && (
                      <div className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-wider text-brand-orange/90 border-t border-brand-border/40 mt-2 first:mt-0 first:border-0 first:pt-0">
                        {item.section}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (item.onClick) { item.onClick(); } else { setActiveTab(item.name); }
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-brand-orange text-white font-bold shadow-md' 
                          : 'text-gray-300 hover:text-white hover:bg-[#132238]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badgeCount !== undefined && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-brand-border/60 text-gray-300'
                        }`}>
                          {item.badgeCount}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}

              <button
                onClick={() => {
                  localStorage.removeItem('sd_super_admin_login');
                  setIsSuperAdminLoggedIn(false);
                  setSuperAdminLogin({ user: '', password: '', secretCode: '' });
                  setSuperAdminLoginStep('credentials');
                  showToast("Session reset. Welcome to The NexaGo BD Admin Panel!", "info");
                  setActiveTab('Dashboard');
                  setIsMobileSidebarOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 mt-3 rounded-lg text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500/10 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>

              {false && activePanelMode === 'super_admin' && (
                <form onSubmit={handleSuperAdminPasswordChange} className="mt-3 rounded-xl border border-brand-border bg-[#070e17] p-3 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-brand-orange">Password Control</p>
                  <input value={superAdminPasswordForm.currentPassword} onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))} type="password" placeholder="Current password" className="w-full rounded-lg border border-brand-border bg-[#0c1624] px-2.5 py-2 text-[10px] text-white outline-none focus:border-brand-orange" />
                  <input value={superAdminPasswordForm.newPassword} onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))} type="password" placeholder="New password" className="w-full rounded-lg border border-brand-border bg-[#0c1624] px-2.5 py-2 text-[10px] text-white outline-none focus:border-brand-orange" />
                  <input value={superAdminPasswordForm.confirmPassword} onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))} type="password" placeholder="Confirm new password" className="w-full rounded-lg border border-brand-border bg-[#0c1624] px-2.5 py-2 text-[10px] text-white outline-none focus:border-brand-orange" />
                  <input value={superAdminPasswordForm.secretCode} onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, secretCode: e.target.value }))} type="password" inputMode="numeric" placeholder="Secret code" className="w-full rounded-lg border border-brand-border bg-[#0c1624] px-2.5 py-2 text-[10px] text-white outline-none focus:border-brand-orange" />
                  {superAdminPasswordError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[8px] font-bold text-red-300">{superAdminPasswordError}</p>}
                  <button type="submit" className="w-full rounded-lg bg-brand-orange px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white hover:bg-brand-orange-hover">Change Password</button>
                </form>
              )}
            </nav>

            <div className="p-4 border-t border-brand-border bg-brand-dark/30 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-xs">AU</div>
                <div>
                  <h4 className="text-xs font-bold text-white">Admin User</h4>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">Super Administrator</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9px] font-bold text-emerald-400">Online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* HEADER BAR */}
        {activeTab !== 'Mobile App Simulator' && activeTab !== 'POS System' && (
        <header className="min-h-16 border-b border-brand-border/60 bg-[#0c1624]/65 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5 select-none shrink-0 sticky top-0 z-40">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 hover:bg-brand-dark text-gray-300 hover:text-white rounded lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">{activeTab}</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">Home &gt; {activeTab}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {/* Tight Mode Toggle Switch */}
            <button
              onClick={toggleTightMode}
              className={`flex items-center space-x-2 px-3 py-1.5 bg-brand-dark/80 border hover:border-brand-orange/40 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                isTightMode ? 'text-brand-orange border-brand-orange/35' : 'text-gray-300 border-brand-border/80'
              }`}
              title="Toggle Compact UI Spacing (Tight Mode)"
            >
              <span className="font-bold uppercase text-[9px] tracking-wider">Tight Mode</span>
              <div className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isTightMode ? 'bg-brand-orange' : 'bg-gray-700'
              }`}>
                <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isTightMode ? 'translate-x-3' : 'translate-x-0'
                }`} />
              </div>
            </button>

            {/* Date Picker Display */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-brand-dark/80 border border-brand-border/80 rounded-lg text-xs font-semibold text-gray-300">
              <Calendar className="w-3.5 h-3.5 text-brand-orange" />
              <span>May 20, 2024 - May 26, 2024</span>
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="p-1.5 bg-brand-dark hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 text-gray-300 hover:text-brand-orange rounded-lg transition-all relative cursor-pointer"
                title="Notifications Desk"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-[min(20rem,calc(100vw-1.5rem))] bg-[#0e1b2c] border border-brand-border rounded-xl shadow-2xl overflow-hidden z-50 fade-in">
                  <div className="p-3 border-b border-brand-border bg-brand-dark/30 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">System Alerts</span>
                    {unreadNotifCount > 0 && (
                      <button 
                        onClick={handleMarkAllNotificationsAsRead}
                        className="text-[10px] text-brand-orange hover:underline font-bold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-brand-border/30">
                    {notifications.slice(0, 4).map((notif) => (
                      <div key={notif.id} className="p-3 hover:bg-brand-dark/30 transition-colors text-left">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-xs font-bold ${notif.read ? 'text-gray-400' : 'text-white'}`}>{notif.title}</h4>
                          <span className="text-[9px] text-gray-500">{notif.time}</span>
                        </div>
                        <p className="text-[10px] text-gray-300 mt-1 line-clamp-2 leading-relaxed">{notif.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-500 flex flex-col items-center justify-center space-y-1">
                        <BellOff className="w-6 h-6 text-gray-600 mb-1" />
                        <span>All alerts read</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-brand-dark/50 border-t border-brand-border text-center">
                    <button 
                      onClick={() => {
                        setActiveTab('Notifications');
                        setIsNotifDropdownOpen(false);
                      }}
                      className="text-[11px] text-gray-400 hover:text-white font-bold cursor-pointer hover:underline"
                    >
                      View All Alerts
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Badge */}
            <div className="flex items-center space-x-2.5 pl-2 border-l border-brand-border/40">
              <div className="w-8.5 h-8.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center font-bold text-brand-orange text-xs">
                AU
              </div>
              <div className="hidden sm:block text-left">
                <h4 className="text-xs font-bold text-white leading-tight">Admin User</h4>
                <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Super Admin</p>
              </div>
            </div>
          </div>
        </header>
        )}

        {/* TOAST SYSTEM */}
        {toast && (
          <div className="fixed top-20 right-4 z-[200] flex items-center space-x-2 px-4 py-3 bg-[#0c1a29] border-l-4 border-brand-orange text-white rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 text-xs">
            <Check className="w-4 h-4 text-brand-orange" />
            <span className="font-semibold">{toast.message}</span>
          </div>
        )}

        {/* CORE CONTENT SWITCH CONTAINER */}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto ${activeTab === 'Mobile App Simulator' || activeTab === 'POS System' ? 'p-0' : 'p-3 sm:p-4 md:p-6'}`}>
          {activeTab === 'Dashboard' && activePanelMode === 'super_admin' && (
            <DashboardView 
              orders={orders} 
              drivers={drivers} 
              zones={zones} 
              notifications={notifications}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenQuickAction={(action) => setQuickActionModal(action)}
              isTightMode={isTightMode}
            />
          )}

          {activeTab === 'Security Control' && activePanelMode === 'super_admin' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange">Super Admin Security</p>
                  <h2 className="mt-1 text-xl font-black text-white">Password Control & Live Devices</h2>
                  <p className="mt-1 text-xs text-gray-400">Manage Super Admin password and monitor every active device session.</p>
                </div>
                <button type="button" onClick={refreshSuperAdminSessions} className="rounded-xl border border-brand-border bg-[#0c1624] px-4 py-2 text-[10px] font-black uppercase text-gray-200 hover:border-brand-orange">
                  Refresh Devices
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
                <form onSubmit={handleSuperAdminPasswordChange} className="rounded-xl border border-brand-border bg-[#0c1624] p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-brand-orange">Password Control</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-400">Current password, new password and secret code are required. Every change is audited.</p>
                  </div>
                  <input value={superAdminPasswordForm.currentPassword} onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))} type="password" placeholder="Current password" className="w-full rounded-lg border border-brand-border bg-[#070e17] px-3 py-2.5 text-xs text-white outline-none focus:border-brand-orange" />
                  <input value={superAdminPasswordForm.newPassword} onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))} type="password" placeholder="New password" className="w-full rounded-lg border border-brand-border bg-[#070e17] px-3 py-2.5 text-xs text-white outline-none focus:border-brand-orange" />
                  <input value={superAdminPasswordForm.confirmPassword} onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))} type="password" placeholder="Confirm new password" className="w-full rounded-lg border border-brand-border bg-[#070e17] px-3 py-2.5 text-xs text-white outline-none focus:border-brand-orange" />
                  <input value={superAdminPasswordForm.secretCode} onChange={e => setSuperAdminPasswordForm(prev => ({ ...prev, secretCode: e.target.value }))} type="password" inputMode="numeric" placeholder="Secret code" className="w-full rounded-lg border border-brand-border bg-[#070e17] px-3 py-2.5 text-xs text-white outline-none focus:border-brand-orange" />
                  {superAdminPasswordError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-300">{superAdminPasswordError}</p>}
                  <button type="submit" className="w-full rounded-xl bg-brand-orange px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-brand-orange-hover">Change Password</button>
                </form>

                <div className="rounded-xl border border-brand-border bg-[#0c1624] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-brand-orange">Live Devices</p>
                      <p className="mt-1 text-[11px] text-gray-400">{superAdminSessions.filter(s => s.active).length} active / {superAdminSessions.length} total device sessions</p>
                    </div>
                    {superAdminSessionsError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-300">{superAdminSessionsError}</p>}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-brand-border/60">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead className="bg-[#070e17] text-[9px] uppercase text-gray-400">
                        <tr>
                          <th className="px-3 py-3">User</th>
                          <th className="px-3 py-3">Device</th>
                          <th className="px-3 py-3">IP</th>
                          <th className="px-3 py-3">Location</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/50">
                        {superAdminSessions.map((session) => (
                          <tr key={session.tokenId} className="hover:bg-[#101d30]">
                            <td className="px-3 py-3 font-bold text-white">{session.userId || 'Unknown'}</td>
                            <td className="max-w-[260px] truncate px-3 py-3 text-[10px] text-gray-400">{session.device || 'Unknown device'}</td>
                            <td className="px-3 py-3 font-mono text-[10px] text-gray-300">{session.ip || 'No IP'}</td>
                            <td className="px-3 py-3">
                              {session.location ? (
                                <button type="button" onClick={() => setSelectedDeviceSession(session)} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[9px] font-black uppercase text-sky-300 hover:bg-sky-500/15">
                                  Open Live
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-500">Waiting permission</span>
                              )}
                            </td>
                            <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${session.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-300'}`}>{session.status || (session.active ? 'Active' : 'Inactive')}</span></td>
                            <td className="px-3 py-3">
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => updateSuperAdminSession(session.tokenId, 'inactive')} className="rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-[9px] font-black uppercase text-amber-300 hover:bg-amber-500/10">Inactive</button>
                                <button type="button" onClick={() => updateSuperAdminSession(session.tokenId, 'block')} className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-[9px] font-black uppercase text-red-300 hover:bg-red-500/10">Block</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!superAdminSessions.length && (
                          <tr><td colSpan={6} className="px-3 py-10 text-center text-xs text-gray-500">No device session found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Dashboard' && activePanelMode === 'delivery' && (
            <DeliveryDashboardView 
              orders={orders}
              drivers={drivers}
              zones={zones}
              vehicles={vehicles}
              notifications={notifications}
              onUpdateOrderStatus={handleUpdateOrder}
              onUpdateDriver={handleUpdateDriver}
              isTightMode={isTightMode}
            />
          )}

          {(activeTab === 'Store Dashboard' || (activeTab === 'Dashboard' && activePanelMode === 'store')) && (
            <StoreDashboardView 
              orders={orders} 
              onNavigate={(tab) => setActiveTab(tab)}
              productsCount={products.length}
              categoriesCount={categories.length}
              customersCount={users.length}
              reviewsCount={reviews.length}
              isTightMode={isTightMode}
            />
          )}

          {(activeTab === 'Users Management' || activeTab === 'Customers') && (
            <UsersView 
              users={users}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {(activeTab === 'Drivers Management' || activeTab === 'Suppliers') && (
            <DriversView 
              drivers={drivers}
              orders={orders}
              onAddDriver={handleAddDriver}
              onUpdateDriver={handleUpdateDriver}
              onDeleteDriver={handleDeleteDriver}
              vehicles={vehicles}
            />
          )}

          {(activeTab === 'Orders Management' || activeTab === 'Orders') && (
            <OrdersView 
              orders={orders}
              drivers={drivers}
              onAddOrder={handleAddOrder}
              onUpdateOrder={handleUpdateOrder}
              onDeleteOrder={handleDeleteOrder}
              onAssignDriver={handleAssignDriver}
              onCancelOrder={(order, note) => {
                handleAddNotification({ title: '🚫 Order Cancelled — ' + order.id, message: note, type: 'system' });
                showToast(`Order #${order.id} cancelled by admin · ${note}`, 'info');
              }}
              onReactivateOrder={handleReactivateOrder}
              onUndoStatus={(order) => {
                if (order.status === 'Completed') {
                  handleUpdateOrder({ ...order, status: 'Ongoing' });
                  showToast(`Order #${order.id} status undone → Ongoing`, 'info');
                }
              }}
              showToast={showToast}
            />
          )}

          {activeTab === 'Order Tools Dashboard' && (
            <OrderToolsDashboard
              orders={orders}
              onUpdateOrder={handleUpdateOrder}
              reports={orderReports}
              onOpenReport={handleOpenReport}
              onReportReply={handleReportReply}
              showToast={showToast}
            />
          )}

          {(activeTab === 'Payments' || activeTab === 'Earnings & Payouts') && (
            <EarningsView payments={payments} drivers={drivers} orders={orders} />
          )}

          {activeTab === 'MFS Business & Settlement' && (
            <MFSBusinessView orders={orders} />
          )}

          {activeTab === 'POS System' && (
            <PosSystem products={products} orders={orders} onProductsChange={setProducts} onCreateOrder={handleSilentAddOrder} onUpdateOrder={handleUpdateOrder} onSendToDriver={setDriverDispatchOrder} onDeleteOrder={handleDeleteOrder} onNavigate={setActiveTab} onSaleRecorded={handlePosSaleRecorded} />
          )}

          {activeTab === 'Vehicles Management' && (
            <VehiclesView />
          )}

          {(activeTab === 'Zones & Areas' || activeTab === 'Delivery Management') && (
            <ZonesView 
              zones={zones}
              liveDrivers={liveDrivers}
              locSim={locSim}
              onToggleLocSim={() => setLocSim(!locSim)}
              simTick={simTick}
              onAddZone={handleAddZone}
              onUpdateZone={handleUpdateZone}
              onDeleteZone={handleDeleteZone}
            />
          )}

          {activeTab === 'Settings' && (
            <SettingsView />
          )}

          {activeTab === 'Support Tickets' && (
            <SupportView 
              tickets={supportTickets}
              onReplyTicket={handleReplyTicket}
              onUpdateStatus={handleUpdateTicketStatus}
              orders={orders}
              chatLog={chatLog}
              reports={orderReports}
              onPaymentRefund={handlePaymentRefund}
              onNotify={handleAddNotification}
              drivers={drivers}
              onDriversChange={setDrivers}
            />
          )}

          {activeTab === 'Stores & Merchants' && (
            renderGenericView('Stores')
          )}

          {activeTab === 'Customer Storefront' && (
            renderGenericView('Customer Site')
          )}

          {activeTab === 'Mobile App Simulator' && (
            <MobileAppSimulator 
              orders={orders}
              liveDrivers={liveDrivers}
              drivers={drivers}
              stores={stores}
              products={products}
              zones={zones}
              users={users}
              payments={payments}
              vehicles={vehicles}
              banners={banners}
              supportTickets={supportTickets}
              notifications={notifications}
              categories={categories}
              coupons={coupons}
              staff={staff}
              reviews={reviews}
              marketing={marketing}
              onAddOrder={handleSilentAddOrder}
              onUpdateOrder={handleSilentUpdateOrder}
              onUpdateDriver={handleUpdateDriver}
              onDriversChange={setDrivers}
              onProductsChange={setProducts}
              onStoresChange={setStores}
              onZonesChange={setZones}
              onUsersChange={setUsers}
              onPaymentsChange={setPayments}
              onVehiclesChange={setVehicles}
              onBannersChange={setBanners}
              onTicketsChange={setSupportTickets}
              onNotificationsChange={setNotifications}
              onCategoriesChange={setCategories}
              onCouponsChange={setCoupons}
              onStaffChange={setStaff}
              onReviewsChange={setReviews}
              onMarketingChange={setMarketing}
              onReport={handleOrderReport}
              onChatLogChange={setChatLog}
              incomingDispatch={driverDispatchOrder}
              adminDispatch={adminDispatchOrder}
              customerDispatchOrder={customerDispatchOrder}
              onDriverRejected={(id) => { handleAddNotification({ title: '🚫 Driver Rejected — ' + id, message: `Driver rejected order #${id} — assign a rider from the Orders tab`, type: 'system' }); }}
              onStoreRejected={(id) => { handleAddNotification({ title: '🚫 Store Rejected — ' + id, message: `Store rejected order #${id} — no rider assigned yet`, type: 'system' }); }}
              showToast={showToast}
            />
          )}

          {/* Render high-fidelity dynamic panel for other active tabs */}
          {!['Dashboard', 'Store Dashboard', 'Orders Management', 'Orders', 'Users Management', 'Customers', 'Drivers Management', 'Suppliers', 'Zones & Areas', 'Delivery Management', 'Settings', 'Support Tickets', 'Stores & Merchants', 'Customer Storefront', 'Payments', 'MFS Business & Settlement', 'POS System', 'Earnings & Payouts', 'Vehicles Management', 'Mobile App Simulator'].includes(activeTab) && (
            renderGenericView(activeTab)
          )}
        </main>

        {/* APP FOOTER LINE */}
        {activeTab !== 'Mobile App Simulator' && activeTab !== 'POS System' && (
        <footer className="py-4 border-t border-brand-border/40 text-center text-[10px] text-gray-500 select-none bg-[#0c1624]/20">
          <p>© 2026 The NexaGo BD. All rights reserved. Version 1.0.0 &nbsp;|&nbsp; Support: <span className="text-brand-orange">thenexagobd@gmail.com</span></p>
        </footer>
        )}
      </div>

      {/* QUICK ACTIONS SUBMIT POPUP MODAL (Triggers direct dashboard quick grid submits) */}
      {quickActionModal && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-sm w-full overflow-hidden shadow-2xl fade-in">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-semibold text-white text-xs uppercase tracking-wider">
                Quick Action: Add {quickActionModal}
              </h3>
              <button
                onClick={() => setQuickActionModal(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickActionSubmit} className="p-4 space-y-4">
              {quickActionModal === 'driver' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Driver Name</label>
                    <input name="name" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="Driver full name" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Phone Number</label>
                    <input name="phone" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="01712345678" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Vehicle Type</label>
                    <input name="vehicleType" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="Motorcycle (Honda 125)" />
                  </div>
                </>
              )}

              {quickActionModal === 'user' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">User Full Name</label>
                    <input name="name" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="Customer full name" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Email Address</label>
                    <input name="email" type="email" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="customer@email.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Phone</label>
                    <input name="phone" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="01811223344" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Role Type</label>
                    <select name="role" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none cursor-pointer">
                      <option value="Customer">Customer</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </>
              )}

              {quickActionModal === 'zone' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">New Coverage Zone Name</label>
                  <input name="name" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="e.g. Mirpur, Farmgate" />
                </div>
              )}

              {quickActionModal === 'notification' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Announcement Title</label>
                    <input name="title" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="System alert description" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Message Body</label>
                    <textarea name="message" required rows={3} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none resize-none" placeholder="Alert message detailed description..." />
                  </div>
                </>
              )}

              {quickActionModal === 'banner' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Campaign Title Headline</label>
                    <input name="title" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="e.g. Eid 20% off with bKash" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Campaign Subtitle Description</label>
                    <input name="subtitle" required className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none" placeholder="Use your real coupon code" />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => setQuickActionModal(null)}
                  className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Apply Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Smartphone, Wifi, Battery, MapPin, Phone, MessageSquare, Check, 
  CheckCircle2, DollarSign, ShoppingBag, Star, ArrowRight, ArrowLeft, 
  AlertCircle, X, FileText, MoreHorizontal, User, Lock, Plus, 
  ChevronRight, Headphones, Settings, LogOut, Navigation, ThumbsUp, 
  HelpCircle, RefreshCw, Send, Shield, Info, Clipboard, Eye, EyeOff,
  Compass, Copy, Filter, Menu, Clock, Calendar, Utensils, Store as StoreIcon,
  Crosshair, SlidersHorizontal, Gift, ShoppingBasket, CheckSquare, XCircle, Search, Bell, BadgePercent, ChevronDown,
  Home, ShoppingCart, Package, User as UserIcon, Zap, Banknote, Apple, Building2, Pill, Timer, Wallet, Tag, Truck,
  Map as MapIcon, KeyRound, Ticket, Award, History, RotateCcw, ShieldCheck, Flame, Globe, MapPinned, Minus, SlidersHorizontal as SortIcon, StarHalf, Printer, WifiOff, Inbox, Image, Camera
} from 'lucide-react';
import { Order, Driver, DriverDutyStatus, Zone, User as AppUser, Payment, Vehicle, PromotionBanner, SupportTicket, SystemNotification, ChatLogEntry, makeOrderId } from '../types';
import { LiveDriverSim } from '../hooks/useLiveDrivers';
import LeafletMap, { LiveVeh } from './LeafletMap';

const SIM_LANGS = {
  en: { stores: 'Popular Stores', browse: 'Browse Categories', deliverTo: 'Deliver to', greeting: 'What would you like to order today?', search: 'Search stores, dishes, groceries…', cart: 'Cart', viewCart: 'View Cart', checkout: 'Checkout', placeOrder: 'Place Order', coupons: 'Coupons', offers: 'Offers', ratings: 'Ratings & Reviews', notif: 'Notifications', orders: 'Orders', profile: 'Profile', home: 'Home', explore: 'Explore', product: 'Products', sortBy: 'Sort by', freeDelivery: 'Free Delivery', deliveryFee: 'Delivery fee', totalPayable: 'Total Payable' },
  bn: { stores: 'জনপ্রিয় দোকান', browse: 'ক্যাটাগরি ব্রাউজ', deliverTo: 'ডেলিভারি ঠিকানা', greeting: 'আজ কী অর্ডার করবেন?', search: 'দোকান, খাবার, বাজার খুঁজুন…', cart: 'কার্ট', viewCart: 'কার্ট দেখুন', checkout: 'চেকআউট', placeOrder: 'অর্ডার করুন', coupons: 'কুপন', offers: 'অফার', ratings: 'রেটিং ও রিভিউ', notif: 'নোটিফিকেশন', orders: 'অর্ডার', profile: 'প্রোফাইল', home: 'হোম', explore: 'এক্সপ্লোর', product: 'পণ্য', sortBy: 'সাজান', freeDelivery: 'ফ্রি ডেলিভারি', deliveryFee: 'ডেলিভারি ফি', totalPayable: 'মোট পরিশোধযোগ্য' },
};

interface MobileAppSimulatorProps {
  onAddOrder?: (order: any) => void;
  onUpdateOrder?: (order: Order) => void;
  onUpdateDriver?: (driver: Driver) => void;
  onDriversChange?: (drivers: Driver[]) => void;
  onProductsChange?: (products: Array<{ id: string; name: string; price: number; stock: number; status: string; image?: string; category?: string }>) => void;
  onStoresChange?: (stores: Array<{ id: string; name: string; address: string; status: string; rating: number; orders: number; category?: string; image?: string; description?: string; deliveryFee?: number; deliveryTime?: number; offer?: string }>) => void;
  onZonesChange?: (zones: Zone[]) => void;
  onUsersChange?: (users: AppUser[]) => void;
  onPaymentsChange?: (payments: Payment[]) => void;
  onVehiclesChange?: (vehicles: Vehicle[]) => void;
  onBannersChange?: (banners: PromotionBanner[]) => void;
  onTicketsChange?: (tickets: SupportTicket[]) => void;
  onNotificationsChange?: (notifications: SystemNotification[]) => void;
  onCategoriesChange?: (categories: Array<{ id: string; name: string; itemsCount: number; status: string }>) => void;
  onCouponsChange?: (coupons: Array<{ id: string; code: string; discount: string; minOrder: number; usages: number; status: string }>) => void;
  onStaffChange?: (staff: Array<{ id: string; name: string; role: string; shift: string; status: string }>) => void;
  onReviewsChange?: (reviews: Array<{ id: string; customer: string; item: string; rating: number; comment: string; date: string }>) => void;
  onMarketingChange?: (marketing: Array<{ id: string; title: string; channel: string; budget: number; clicks: number; status: string }>) => void;
onReport?: (report: { orderId: string; reason: string; note: string }) => void;
  onChatLogChange?: (log: ChatLogEntry[]) => void;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  incomingDispatch?: Order | null;
  adminDispatch?: Order | null;
  customerDispatchOrder?: Order | null;
  onDriverRejected?: (orderId: string) => void;
  onStoreRejected?: (orderId: string) => void;
  orders?: Order[];
  liveDrivers?: LiveDriverSim[];
  drivers?: Driver[];
  stores?: Array<{ id: string; name: string; address: string; status: string; rating: number; orders: number; category?: string; image?: string; description?: string; deliveryFee?: number; deliveryTime?: number; offer?: string }>;
  products?: Array<{ id: string; name: string; price: number; stock: number; status: string; image?: string; category?: string }>;
  zones?: Zone[];
  users?: AppUser[];
  payments?: Payment[];
  vehicles?: Vehicle[];
  banners?: PromotionBanner[];
  supportTickets?: SupportTicket[];
  notifications?: SystemNotification[];
  categories?: Array<{ id: string; name: string; itemsCount: number; status: string }>;
  coupons?: Array<{ id: string; code: string; discount: string; minOrder: number; usages: number; status: string }>;
  staff?: Array<{ id: string; name: string; role: string; shift: string; status: string }>;
  reviews?: Array<{ id: string; customer: string; item: string; rating: number; comment: string; date: string }>;
  marketing?: Array<{ id: string; title: string; channel: string; budget: number; clicks: number; status: string }>;
}

function simCategory(storeName: string) {
  const s = (storeName || '').toLowerCase();
  if (/(food|bites|grill|biriyani|pizza|kebab|diner|darbar|burger|kottu|shawarma|bbq|thai|bistro|restaurant|sweets)/.test(s)) return 'food';
  if (/(mart|store|super|market|grocery|fresh|daily|dairy|rice|oil|milk)/.test(s)) return 'grocery';
  if (/(pharmacy|med|drug|chemist|pharma)/.test(s)) return 'pharmacy';
  return 'other';
}

function mapOrderToSim(ord: Order) {
  const itemsList = (ord.items || []).map(it => ({ name: it.name, qty: it.quantity, price: it.price, icon: '🛍️' }));
  const deliveryFee = ord.deliveryCharge || 0;
  const itemPrice = Math.max(0, ord.amount - deliveryFee);
  return {
    id: ord.id,
    storeName: ord.storeName,
    storeAddress: ord.pickupLocation || ord.storeName,
    customerName: ord.customerName,
    customerPhone: ord.customerPhone,
    customerAddress: ord.address,
    distance: '4.2 km',
    storeToYou: '1.3 km',
    youToCustomer: '2.9 km',
    deliveryFee,
    itemPrice,
    totalPayable: ord.amount,
    item: (ord.items || []).length ? `${(ord.items || []).reduce((s, i) => s + i.quantity, 0)} items` : `${ord.itemCount || 1} item(s)`,
    paymentMethod: ord.paymentMethod,
    timeEst: `${ord.estimatedMinutes || 30} mins`,
    timestamp: ord.time || '',
    status: ord.status,
    itemsList: itemsList.length ? itemsList : [{ name: 'Order Items', qty: ord.itemCount || 1, price: itemPrice, icon: '🛍️' }],
    pickupCoords: ord.pickupCoords,
    deliveryCoords: ord.deliveryCoords,
    driverId: ord.driverId,
    source: ord.source,
    pickedUp: !!ord.pickedUp,
  };
}

const DEFAULT_SIM_ORDER = {
  id: 'ORD-000001',
  storeName: 'Store',
  storeAddress: '',
  customerName: 'Customer',
  customerPhone: '',
  customerAddress: '',
  distance: '4.2 km',
  storeToYou: '1.3 km',
  youToCustomer: '2.9 km',
  deliveryFee: 60,
  itemPrice: 440,
  totalPayable: 500,
  item: '4 items',
  paymentMethod: 'Cash on Delivery',
  timeEst: '25 mins',
  timestamp: 'Just now',
  status: 'Ongoing',
  itemsList: [
    { name: 'Fresh Milk (1 Ltr)', qty: 1, price: 110, icon: '🥛' },
    { name: 'Basmati Rice (1 kg)', qty: 1, price: 120, icon: '🌾' },
    { name: 'Potato (500 gm)', qty: 1, price: 20, icon: '🥔' },
    { name: 'Cooking Oil (1 Ltr)', qty: 1, price: 160, icon: '🍾' },
  ],
  pickupCoords: undefined,
  deliveryCoords: undefined,
  driverId: undefined,
};

// Circular countdown ring (seconds left / total)
const CountdownRing: React.FC<{ seconds: number; total: number; size?: number; color?: string }> = ({ seconds, total, size = 44, color = '#f97316' }) => {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / total));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{seconds}s</span>
    </div>
  );
};

export default function MobileAppSimulator({
  onAddOrder, onUpdateOrder, onUpdateDriver, onDriversChange, onProductsChange, onStoresChange, onZonesChange, onUsersChange,
  onPaymentsChange, onVehiclesChange, onBannersChange, onTicketsChange, onNotificationsChange, onCategoriesChange,
onCouponsChange, onStaffChange, onReviewsChange, onMarketingChange, onReport, onChatLogChange, showToast,
  orders = [], liveDrivers = [], drivers = [], stores = [], products = [], zones = [], users = [], payments = [], vehicles = [],
  banners = [], supportTickets = [], notifications = [], categories = [], coupons = [], staff = [], reviews = [], marketing = [],
  incomingDispatch = null,
  adminDispatch = null,
  customerDispatchOrder = null,
  onDriverRejected,
  onStoreRejected,
}: MobileAppSimulatorProps) {
  const realOrders = orders;
  const realDrivers = drivers;
  const liveDriversArr = liveDrivers;
  // Orders that have ever been picked up by the driver. Once an order is picked up it must NEVER
  // return to the store — cancel + re-activate always resumes the delivery (driver + customer).
  const pickedUpOrderIdsRef = useRef<Set<string>>(new Set());
  const simStores = stores;
  const simProducts = products;
  const isPosOrder = (ord: any) => !!ord && (ord.source === 'pos-dispatch' || String(ord.id || '').startsWith('POS-'));
  const storeAdminOrderCount = Math.max(
    realOrders.filter(o => !isPosOrder(o) && o.storeName === (realOrders[realOrders.length - 1]?.storeName || DEFAULT_SIM_ORDER.storeName)).length,
    1
  );
  const storeAdminRevenue = Math.max(
    realOrders.filter(o => !isPosOrder(o) && o.storeName === (realOrders[realOrders.length - 1]?.storeName || DEFAULT_SIM_ORDER.storeName)).reduce((sum, o) => sum + o.amount, 0),
    DEFAULT_SIM_ORDER.totalPayable
  );
  const platformActiveOrders = Math.max(realOrders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length, 1);
  const onlineDriverCount = liveDriversArr.filter(d => d.status !== 'Offline').length || Math.max(realDrivers.length, 1);
  const lowStockCount = simProducts.filter(p => p.stock <= 10 || p.status !== 'In Stock').length;
  const openAdminControl = (name: string, _panel?: 'super_admin' | 'store' | 'delivery') => {
    setSuperAdminModule(name);
    setSuperAdminTab('overview');
    window.requestAnimationFrame(() => {
      superAdminOverviewRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    setAdminNotice(`${name} opened`);
  };
  const [chatLog, setChatLog] = useState<Array<{ sender: 'customer' | 'driver'; name: string; text: string; time: string; image?: string; orderId: string }>>([
    { sender: 'driver', name: '', text: 'Assalamu Alaikum. I have picked up your order and I am on my way!', time: '11:28 AM', orderId: '' },
    { sender: 'customer', name: '', text: 'Walaikum Assalam. Please bring it hot and check if sauce is included.', time: '11:30 AM', orderId: '' }
  ]);
  const [helpDeskCategory, setHelpDeskCategory] = useState<string | null>(null);
  const superAdminControlGroups = [
    {
      title: 'Delivery System',
      tone: 'orange',
      controls: [
        ['Dashboard', 'KPI, live tracking, dispatch overview', platformActiveOrders],
        ['Mobile App Simulator', 'Customer, Driver, Store apps', 5],
        ['Users Management', 'Customer accounts and roles', Math.max(realOrders.length, 1)],
        ['Drivers Management', 'Rider approval, duty, profile', realDrivers.length || onlineDriverCount],
        ['Orders Management', 'Create, assign, cancel, complete', realOrders.length || 1],
        ['Zones & Areas', 'Coverage, fee, heat map, GPS', 4],
        ['Vehicles Management', 'Bike, car, van fleet control', realDrivers.length || 1],
        ['Promotions & Banners', 'App banners and campaigns', 3],
      ],
    },
    {
      title: 'Store & Catalog Admin',
      tone: 'cyan',
      controls: [
        ['Store Dashboard', 'Merchant performance dashboard', simStores.length],
        ['Stores & Merchants', 'Store onboarding and access', simStores.length],
        ['Products', 'Catalog, price, availability', simProducts.length],
        ['Categories', 'Food, grocery, pharmacy groups', 6],
        ['Inventory', 'Stock, low alerts, SKU control', lowStockCount],
        ['Coupons', 'Discount, free delivery, usage', 3],
        ['Reviews', 'Ratings and customer feedback', 12],
        ['Staff Management', 'Store staff and shift control', 3],
        ['Marketing', 'Campaigns, push, offer banners', 3],
      ],
    },
    {
      title: 'Finance & System',
      tone: 'red',
      controls: [
        ['Payments', 'COD, card, wallet transactions', realOrders.length || 1],
        ['MFS Business & Settlement', 'bKash, Nagad, Rocket settlement', 4],
        ['Earnings & Payouts', 'Driver/store payout ledger', onlineDriverCount],
        ['POS System', 'Counter order and receipt print', 1],
        ['Support Tickets', 'Customer, driver, merchant issues', supportTickets.length || 2],
        ['Support & Help Desk', 'Customer concerns, order disputes, driver assistance', 3],
        ['Notifications', 'Broadcast and system alerts', 5],
        ['Reports & Analytics', 'Revenue, delivery, audit reports', 7],
        ['Settings', 'Platform rules, fees, keys, access', 12],
      ],
    },
    {
      title: 'Monitoring',
      tone: 'emerald',
      controls: [
        ['Chat Monitoring', 'Live customer-driver messages & photos', chatLog.length],
      ],
    },
  ];

  // Mini customer ordering flow inside the Customer app viewport
  const [custView, setCustView] = useState<'stores' | 'store' | 'cart' | 'checkout'>('stores');
  const [custStoreId, setCustStoreId] = useState<string | null>(null);
  const [custCart, setCustCart] = useState<Array<{ productId: string; name: string; price: number; qty: number }>>([]);
  const [custAddress, setCustAddress] = useState('House 42, Road 8A, Dhanmondi, Dhaka');
  const [custPhone, setCustPhone] = useState('01712-345678');
  const [custPay, setCustPay] = useState('Cash on Delivery');
  const [custCat, setCustCat] = useState('All');
  const [custSearch, setCustSearch] = useState('');
  const [custStoreCat, setCustStoreCat] = useState('All');
  const [custSort, setCustSort] = useState<'rating' | 'time' | 'fee'>('rating');
  const [custRecentSearches, setCustRecentSearches] = useState<string[]>([]);
  const [custSearchFocused, setCustSearchFocused] = useState(false);
  const [custDetailProduct, setCustDetailProduct] = useState<any | null>(null);
  const [custDetailQty, setCustDetailQty] = useState(1);
  const [custCoupon, setCustCoupon] = useState('');
  const [custAppliedCoupon, setCustAppliedCoupon] = useState<string | null>(null);
  const [custNotifOpen, setCustNotifOpen] = useState(false);
  const [custLang, setCustLang] = useState<'en' | 'bn'>('en');
  const [custPoints, setCustPoints] = useState(250);
  const [custLoading, setCustLoading] = useState(true);
  const [custSavedAddresses, setCustSavedAddresses] = useState([
    { id: 'A1', label: 'Home', value: 'House 42, Road 8A, Dhanmondi, Dhaka' },
    { id: 'A2', label: 'Office', value: 'Level 6, Concord Grand, Gulshan-1, Dhaka' },
    { id: 'A3', label: 'Other', value: 'House 7, Road 4, Uttara, Dhaka' },
  ]);
  const [custMapOpen, setCustMapOpen] = useState(false);
  const [custMapPt, setCustMapPt] = useState<{ lat: number; lng: number } | null>(null);
  const [custPickCoords, setCustPickCoords] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nexago_saved_loc') || 'null');
      return saved && typeof saved.lat === 'number' && typeof saved.lng === 'number' ? saved : null;
    } catch { return null; }
  });
  const [custPickedAddress, setCustPickedAddress] = useState('');
  const [custSheet, setCustSheet] = useState<null | 'payments' | 'help' | 'terms' | 'settings'>(null);
  const [custLogoutConfirm, setCustLogoutConfirm] = useState(false);
  const [custNotifPref, setCustNotifPref] = useState(true);
  const [custPrefs, setCustPrefs] = useState({ order: true, offers: true, sms: true, location: true, reduceData: false });
  const [custProfileForm, setCustProfileForm] = useState({ name: '', phone: '', email: '' });
  const [custPinForm, setCustPinForm] = useState('');
  const [custEditProfile, setCustEditProfile] = useState(false);
  const [custCards, setCustCards] = useState<Array<{ id: string; type: string; number: string; holder: string }>>([]);
  const [custNewCard, setCustNewCard] = useState({ number: '', holder: '', type: 'Card' });
  const [custWallet, setCustWallet] = useState(0);
  const [custCardNum, setCustCardNum] = useState('');
  const [custCardExp, setCustCardExp] = useState('');
  const [custCvv, setCustCvv] = useState('');
  const [custBkashPin, setCustBkashPin] = useState('');
  const [custOtpOpen, setCustOtpOpen] = useState(false);
  const [custOtpInput, setCustOtpInput] = useState('');
  const [custOtpSent, setCustOtpSent] = useState('');
  const [custOtpCode, setCustOtpCode] = useState('');
  const [custTopUpOpen, setCustTopUpOpen] = useState(false);
  const [custTopUpAmount, setCustTopUpAmount] = useState(500);
  const [custTopUpSource, setCustTopUpSource] = useState<'bKash' | 'Nagad' | 'Card'>('bKash');
  const [custTopUpPending, setCustTopUpPending] = useState(false);
  const [custReportOpen, setCustReportOpen] = useState(false);
  const [custReportOrder, setCustReportOrder] = useState<string | null>(null);
  const [custReportReason, setCustReportReason] = useState('Wrong item received');
  const [custReportDesc, setCustReportDesc] = useState('');
  const [custGpsLoading, setCustGpsLoading] = useState(false);

  const T = SIM_LANGS[custLang];

  // Skeleton loader on customer app open
  useEffect(() => {
    setCustLoading(true);
    const t = setTimeout(() => setCustLoading(false), 1100);
    return () => clearTimeout(t);
  }, []);

  const simReviews = useMemo(() => reviews.map((r: any) => ({
    name: r.customer || r.customerName || 'Customer',
    rating: r.rating || 5,
    text: r.comment || r.text || '',
    time: r.date || 'Recent',
  })), [reviews]);

  const applySimCoupon = (code: string) => {
    const c = simCoupons.find(x => x.code === code.toUpperCase());
    if (!c) { if (showToast) custShowToast('Invalid coupon code', 'error'); return; }
    if (simCartTotal < (c.minOrder || 0)) { if (showToast) custShowToast(`Minimum order Tk ${c.minOrder || 0} required`, 'error'); return; }
    setCustAppliedCoupon(c.code);
    setCustCoupon(c.code);
    if (showToast) custShowToast(`Coupon ${c.code} applied`, 'success');
  };

  const custFaq = [
    { q: 'How do I track my order?', a: 'Go to the Orders tab and tap on your active order to see live tracking with rider location and ETA.' },
    { q: 'What payment methods are accepted?', a: 'We accept Cash on Delivery, bKash, Nagad, and Visa/Mastercard debit & credit cards.' },
    { q: 'How long does delivery take?', a: 'Standard delivery takes 25-40 minutes depending on your area and store availability.' },
    { q: 'Can I cancel my order?', a: 'Yes, you can cancel from the Orders tab while the order is in Confirmed or Preparing status. A small fee may apply.' },
    { q: 'How do I get a refund?', a: 'Refunds are processed within 3-5 working days to your original payment method.' },
    { q: 'Where is my coupon code?', a: 'Coupons created by the store or super admin can be applied in the cart.' },
  ];
  // Persist the active delivery so a browser refresh / tab switch keeps the order on all apps.
  // The core state below is lazy-initialized FROM this payload, so the very first render already
  // restores an active delivery — no mount-effect race, no StrictMode clobber window.
  const deliveryPersistKey = 'sd_sim_active_delivery_v2';
  const readPersistedDelivery = (): any => {
    try {
      const raw = localStorage.getItem(deliveryPersistKey);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || (s.simulationStatus === 'idle' && s.driverDeliveryStage === 'offer')) return null;
      // Never restore an order that was cancelled/completed while the simulator was unmounted
      // (e.g. admin cancelled it from the Orders tab) — otherwise it would flash back on every app.
      if (s.currentOrder && s.currentOrder.id) {
        const ro = realOrders.find(o => o.id === s.currentOrder.id);
        if (ro && (ro.status === 'Cancelled' || ro.status === 'Completed')) return null;
      }
      return s;
    } catch {
      return null;
    }
  };
  // Shared simulation state
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'store_pending' | 'offered' | 'ongoing' | 'arrived' | 'delivered'>(() => readPersistedDelivery()?.simulationStatus ?? 'idle');
  const [onlineStatus, setOnlineStatus] = useState<boolean>(() => readPersistedDelivery()?.onlineStatus ?? true);
  const [autoAccept, setAutoAccept] = useState(() => readPersistedDelivery()?.autoAccept ?? false);
  const [driverDeliveryStage, setDriverDeliveryStage] = useState<'offer' | 'to_store' | 'waiting_store' | 'ready_for_pickup' | 'to_customer' | 'at_customer' | 'customer_reported' | 'delivered'>(() => readPersistedDelivery()?.driverDeliveryStage ?? 'offer');
const [pickupProofName, setPickupProofName] = useState(() => readPersistedDelivery()?.pickupProofName ?? '');
  const [deliveryProofName, setDeliveryProofName] = useState(() => readPersistedDelivery()?.deliveryProofName ?? '');
  const [driverLocModal, setDriverLocModal] = useState<'store' | 'customer' | null>(null);
  const [storePreparationStarted, setStorePreparationStarted] = useState(() => readPersistedDelivery()?.storePreparationStarted ?? false);
  const [storeOrderReady, setStoreOrderReady] = useState(() => readPersistedDelivery()?.storeOrderReady ?? false);
  const [storeReceived, setStoreReceived] = useState(() => readPersistedDelivery()?.storeReceived ?? false);
  const [storeOnline, setStoreOnline] = useState(() => readPersistedDelivery()?.storeOnline ?? true);
  const [driverCountdown, setDriverCountdown] = useState(60);
  const [storeCountdown, setStoreCountdown] = useState(300);
  const [custCountdown, setCustCountdown] = useState(300);
  const [orderPlacedAt, setOrderPlacedAt] = useState(() => readPersistedDelivery()?.orderPlacedAt ?? '');
  const [storeReceivedAt, setStoreReceivedAt] = useState(() => readPersistedDelivery()?.storeReceivedAt ?? '');
  const [driverReceivedAt, setDriverReceivedAt] = useState(() => readPersistedDelivery()?.driverReceivedAt ?? '');
  const [storePrintOpen, setStorePrintOpen] = useState(false);

  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [storeAdminTab, setStoreAdminTab] = useState<'overview' | 'orders' | 'inventory' | 'payout' | 'settings'>('overview');
  const [storeHistoryOpen, setStoreHistoryOpen] = useState(false);
  const [storeSupportOpen, setStoreSupportOpen] = useState(false);
  const [superAdminTab, setSuperAdminTab] = useState<'overview' | 'orders' | 'users' | 'finance' | 'security'>('overview');
  const [superAdminModule, setSuperAdminModule] = useState<string | null>(null);
  const [superAdminSidebarOpen, setSuperAdminSidebarOpen] = useState(false);
  const superAdminOverviewRef = useRef<HTMLDivElement | null>(null);
  const [adminBaseFee, setAdminBaseFee] = useState(() => Number(localStorage.getItem('sd_admin_base_fee') || 40));
  const [adminMaintenance, setAdminMaintenance] = useState(() => localStorage.getItem('sd_admin_maintenance') === 'true');
  const [adminBroadcastText, setAdminBroadcastText] = useState('');
  const [adminNotice, setAdminNotice] = useState('');
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);
  const [adminCreateName, setAdminCreateName] = useState('');
  const [adminCreateDetail, setAdminCreateDetail] = useState('');

  useEffect(() => {
    if (!adminNotice) return;
    const timer = window.setTimeout(() => setAdminNotice(''), 2200);
    return () => window.clearTimeout(timer);
  }, [adminNotice]);
  
  // Simulated Order state — wired to real orders from the app
  const [currentOrder, setCurrentOrder] = useState<any>(() => {
    const s = readPersistedDelivery();
    if (s && s.currentOrder) return s.currentOrder;
    return realOrders.length ? mapOrderToSim(realOrders[realOrders.length - 1]) : DEFAULT_SIM_ORDER;
  });

  // Order currently loaded in the store receipt preview (live order or any history order)
  const [storePrintOrder, setStorePrintOrder] = useState<any>(() => realOrders.length ? mapOrderToSim(realOrders[realOrders.length - 1]) : DEFAULT_SIM_ORDER);

  // Admin-only action: returns an order that already left the store (driver picked it up) back to the store queue.
  // Problems like customer_reported NEVER auto-return the order; only this explicit admin action does.
  const handleAdminReturnToStore = () => {
    if (currentOrder.pickedUp || pickedUpOrderIdsRef.current.has(currentOrder.id)) {
      if (showToast) driverShowToast('Order already picked up by the driver — it cannot return to the store. Cancel or complete it instead.', 'error');
      return;
    }
    if (simulationStatus === 'idle' || driverDeliveryStage === 'offer' || driverDeliveryStage === 'to_store' || driverDeliveryStage === 'waiting_store') {
      if (showToast) driverShowToast('Order is still at the store — nothing to return.', 'info');
      return;
    }
    setPendingDispatch(null);
    setSimulationStatus('store_pending');
    setDriverDeliveryStage('offer');
    setStoreReceived(false);
    setStorePreparationStarted(false);
    setStoreOrderReady(false);
    setStoreReceivedAt('');
    setPickupProofName('');
    setDeliveryProofName('');
    setDriverScreen('dashboard');
    setCustomerScreen('tracking');
    setAdminNotice(`Order #${currentOrder.id} returned to the store queue by Admin.`);
    if (showToast) driverShowToast(`Order #${currentOrder.id} returned to store by Admin — store must accept again.`, 'info');
  };

  const updateAdminOrderStatus = (status: Order['status']) => {
    const realOrder = realOrders.find(o => o.id === currentOrder.id);
    if (realOrder && onUpdateOrder) onUpdateOrder({ ...realOrder, status });
    setCurrentOrder((prev: any) => ({ ...prev, status }));
    setAdminNotice(`Order #${currentOrder.id} updated to ${status}`);
    // Admin cancellation is the allowed reason for an order to leave every app's display at any stage.
    // Runs unconditionally (even when simulationStatus is already idle, e.g. driver offline / order queued)
    // so a cancelled order never lingers on any screen.
    if (status === 'Cancelled') {
      setPendingDispatch(null);
      setSimulationStatus('idle');
      setDriverDeliveryStage('offer');
      setPickupProofName('');
      setDeliveryProofName('');
      setStorePreparationStarted(false);
      setStoreOrderReady(false);
      setStoreReceived(false);
      setDriverScreen('dashboard');
      setCustomerScreen('store');
      if (showToast) driverShowToast(`Order #${currentOrder.id} cancelled by Admin — removed from active delivery.`, 'error');
    }
    // Admin-completed orders also leave every app's display immediately (like driver completion).
    if (status === 'Completed') {
      setPendingDispatch(null);
      setSimulationStatus('idle');
      setDriverDeliveryStage('offer');
      setPickupProofName('');
      setDeliveryProofName('');
      setStorePreparationStarted(false);
      setStoreOrderReady(false);
      setStoreReceived(false);
      setDriverScreen('dashboard');
      setCustomerScreen('store');
      creditDriverCompletion();
      const simDriver = realDrivers[0];
      if (simDriver && onDriversChange && simDriver.status === 'On-Delivery') {
        onDriversChange(realDrivers.map(d => d.id === simDriver.id ? { ...d, status: 'Online' as DriverDutyStatus } : d));
      }
      if (showToast) driverShowToast(`Order #${currentOrder.id} completed by Admin — removed from active delivery.`, 'success');
    }
    // Re-activating a previously picked-up (cancelled) order resumes the delivery directly with the
    // driver and customer — it must NOT go back to the store for re-acceptance.
    if (status !== 'Cancelled' && status !== 'Completed' && realOrder?.pickedUp && simulationStatus === 'idle' && driverDeliveryStage === 'offer') {
      resumePickedUpDelivery({ ...realOrder, status });
      setAdminNotice(`Order #${currentOrder.id} re-activated — delivery resumed with driver.`);
    }
  };

  const updateAdminProductStock = (productId: string, delta: number) => {
    const nextProducts = simProducts.map(p => {
      if (p.id !== productId) return p;
      const stock = Math.max(0, p.stock + delta);
      return { ...p, stock, status: stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'In Stock' };
    });
    if (onProductsChange) onProductsChange(nextProducts);
    setAdminNotice('Product stock updated');
  };

  const toggleAdminDriverDuty = (driverId: string) => {
    const driver = realDrivers.find(d => d.id === driverId);
    if (!driver || !onUpdateDriver) return;
    const status = driver.status === 'Offline' ? 'Online' : 'Offline';
    onUpdateDriver({ ...driver, status });
    setAdminNotice(`${driver.name} is now ${status}`);
  };

  const toggleAdminUser = (id: string) => {
    if (!onUsersChange) return;
    onUsersChange(users.map(user => user.id === id ? { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' } : user));
    setAdminNotice('User access updated');
  };
  const deleteAdminUser = (id: string) => {
    if (!onUsersChange) return;
    onUsersChange(users.filter(user => user.id !== id));
    setAdminNotice('User removed from the main system');
  };
  const toggleAdminZone = (id: string) => {
    if (!onZonesChange) return;
    onZonesChange(zones.map(zone => zone.id === id ? { ...zone, status: zone.status === 'Active' ? 'Inactive' : 'Active' } : zone));
    setAdminNotice('Delivery zone status updated');
  };
  const cycleAdminVehicle = (id: string) => {
    if (!onVehiclesChange) return;
    onVehiclesChange(vehicles.map(vehicle => vehicle.id === id ? { ...vehicle, status: vehicle.status === 'Active' ? 'Maintenance' : 'Active' } : vehicle));
    setAdminNotice('Vehicle fleet status updated');
  };
  const toggleAdminStore = (id: string) => {
    if (!onStoresChange) return;
    onStoresChange(stores.map(store => store.id === id ? { ...store, status: store.status === 'Active' || store.status === 'Open' ? 'Inactive' : 'Active' } : store));
    setAdminNotice('Merchant availability updated');
  };
  const cycleAdminPayment = (id: string) => {
    if (!onPaymentsChange) return;
    onPaymentsChange(payments.map(payment => payment.id === id ? { ...payment, status: payment.status === 'Paid' ? 'Pending' : 'Paid' } : payment));
    setAdminNotice('Payment settlement updated');
  };
  const toggleAdminBanner = (id: string) => {
    if (!onBannersChange) return;
    onBannersChange(banners.map(banner => banner.id === id ? { ...banner, status: banner.status === 'Active' ? 'Expired' : 'Active' } : banner));
    setAdminNotice('Promotion banner updated');
  };
  const cycleAdminTicket = (id: string) => {
    if (!onTicketsChange) return;
    onTicketsChange(supportTickets.map(ticket => ticket.id === id ? { ...ticket, status: ticket.status === 'Open' ? 'In Progress' : ticket.status === 'In Progress' ? 'Resolved' : 'Open' } : ticket));
    setAdminNotice('Support ticket updated');
  };
  const markAdminNotification = (id: string) => {
    if (!onNotificationsChange) return;
    onNotificationsChange(notifications.map(notification => notification.id === id ? { ...notification, read: !notification.read } : notification));
  };
  const sendAdminBroadcast = () => {
    const message = adminBroadcastText.trim();
    if (!message || !onNotificationsChange) return;
    onNotificationsChange([{ id: `NOTIF-${Date.now()}`, title: 'Super Admin Broadcast', message, type: 'system', time: 'Just now', read: false }, ...notifications]);
    setAdminBroadcastText('');
    setAdminNotice('Broadcast sent');
  };
  const toggleAdminCategory = (id: string) => {
    if (!onCategoriesChange) return;
    onCategoriesChange(categories.map(category => category.id === id ? { ...category, status: category.status === 'Active' ? 'Inactive' : 'Active' } : category));
  };
  const toggleAdminCoupon = (id: string) => {
    if (!onCouponsChange) return;
    onCouponsChange(coupons.map(coupon => coupon.id === id ? { ...coupon, status: coupon.status === 'Active' ? 'Paused' : 'Active' } : coupon));
  };
  const toggleAdminStaff = (id: string) => {
    if (!onStaffChange) return;
    onStaffChange(staff.map(member => member.id === id ? { ...member, status: member.status === 'Active' ? 'Inactive' : 'Active' } : member));
  };
  const toggleAdminMarketing = (id: string) => {
    if (!onMarketingChange) return;
    onMarketingChange(marketing.map(campaign => campaign.id === id ? { ...campaign, status: campaign.status === 'Running' ? 'Paused' : 'Running' } : campaign));
  };
  const moderateAdminReview = (id: string) => {
    if (!onReviewsChange) return;
    onReviewsChange(reviews.filter(review => review.id !== id));
    setAdminNotice('Review removed from storefront');
  };
  const saveAdminSettings = () => {
    localStorage.setItem('sd_admin_base_fee', String(adminBaseFee));
    localStorage.setItem('sd_admin_maintenance', String(adminMaintenance));
    const realOrder = realOrders.find(order => order.id === currentOrder.id);
    if (realOrder && onUpdateOrder) {
      const previousFee = realOrder.deliveryCharge || 0;
      onUpdateOrder({ ...realOrder, deliveryCharge: adminBaseFee, amount: Math.max(0, realOrder.amount - previousFee + adminBaseFee) });
    }
    setAdminNotice('Platform settings saved and applied');
  };
  const createAdminPosOrder = () => {
    if (!onAddOrder) return;
    const store = simStores[0];
    const posOrder: Order = {
      id: `POS-${Date.now()}`,
      storeName: store?.name || 'Counter Store',
      address: store?.address || 'Store Counter',
      status: 'Confirmed',
      amount: 250 + adminBaseFee,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: 'Walk-in Customer',
      customerPhone: 'Counter Sale',
      paymentMethod: 'Cash',
      pickupLocation: store?.address || 'Store Counter',
      deliveryCharge: adminBaseFee,
      itemCount: 1,
      source: 'pos-dispatch',
      items: [{ productId: simProducts[0]?.id || 'POS-ITEM', name: simProducts[0]?.name || 'Counter Item', price: 250, quantity: 1 }],
    };
    onAddOrder(posOrder);
    setCurrentOrder(mapOrderToSim(posOrder));
    setAdminNotice('POS order created in live orders');
  };

  const adminAddableModules = new Set([
    'Orders Management', 'Users Management', 'Drivers Management', 'Zones & Areas', 'Vehicles Management',
    'Promotions & Banners', 'Store Dashboard', 'Stores & Merchants', 'Products', 'Categories', 'Inventory',
    'Coupons', 'Reviews', 'Staff Management', 'Marketing', 'Payments', 'MFS Business & Settlement',
    'Earnings & Payouts', 'POS System', 'Support Tickets', 'Notifications',
  ]);

  const createAdminRecord = () => {
    if (!superAdminModule) return;
    const name = adminCreateName.trim();
    const detail = adminCreateDetail.trim();
    if (!name) {
      setAdminNotice('Name is required');
      return;
    }
    const stamp = Date.now();
    const today = new Date().toLocaleDateString();

    switch (superAdminModule) {
      case 'Orders Management':
        onAddOrder?.({
          id: makeOrderId(), storeName: detail || simStores[0]?.name || 'New Store', address: 'Admin created order',
          status: 'Confirmed', amount: 250 + adminBaseFee, date: today, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          customerName: name, customerPhone: '01700000000', paymentMethod: 'Cash on Delivery',
          pickupLocation: simStores[0]?.address || 'Store pickup', deliveryCharge: adminBaseFee, itemCount: 1,
          items: [{ productId: simProducts[0]?.id || `P-${stamp}`, name: simProducts[0]?.name || 'Admin Item', price: 250, quantity: 1 }],
        });
        break;
      case 'Users Management':
        onUsersChange?.([...users, { id: `USR-${stamp}`, name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@nexago.app`, phone: detail || '01700000000', role: 'Customer', status: 'Active', joinDate: today, ordersCount: 0 }]);
        break;
      case 'Drivers Management':
        onDriversChange?.([...realDrivers, { id: `DRV-${stamp}`, name, phone: detail || '01700000000', vehicleType: 'Motorcycle', status: 'Online', rating: 5, completedOrders: 0, earnings: 0, verificationStatus: 'Pending Audit' }]);
        break;
      case 'Zones & Areas':
        onZonesChange?.([...zones, { id: `Z-${stamp}`, name, status: 'Active', ordersCount: 0, earnings: 0, activeDrivers: 0, deliveryFee: Number(detail) || adminBaseFee }]);
        break;
      case 'Vehicles Management':
        onVehiclesChange?.([...vehicles, { id: `VEH-${stamp}`, type: 'Motorcycle', plateNumber: name, driverName: detail || 'Unassigned', status: 'Active' }]);
        break;
      case 'Promotions & Banners':
        onBannersChange?.([...banners, { id: `BNR-${stamp}`, title: name, subtitle: detail || 'New campaign', status: 'Active', startDate: today, endDate: today, clicks: 0 }]);
        break;
      case 'Store Dashboard':
      case 'Stores & Merchants':
        onStoresChange?.([...stores, { id: `STR-${stamp}`, name, address: detail || 'Dhaka, Bangladesh', status: 'Active', rating: 5, orders: 0, category: 'General', deliveryFee: adminBaseFee, deliveryTime: 30 }]);
        break;
      case 'Products':
      case 'Inventory':
        onProductsChange?.([...products, { id: `P-${stamp}`, name, price: Number(detail) || 100, stock: 20, status: 'In Stock', category: 'General' }]);
        break;
      case 'Categories':
        onCategoriesChange?.([...categories, { id: `CAT-${stamp}`, name, itemsCount: 0, status: 'Active' }]);
        break;
      case 'Coupons':
        onCouponsChange?.([...coupons, { id: `CPN-${stamp}`, code: name.toUpperCase().replace(/\s+/g, ''), discount: detail || '10%', minOrder: 200, usages: 0, status: 'Active' }]);
        break;
      case 'Reviews':
        onReviewsChange?.([...reviews, { id: `REV-${stamp}`, customer: name, item: detail || 'General order', rating: 5, comment: 'Added by admin', date: today }]);
        break;
      case 'Staff Management':
        onStaffChange?.([...staff, { id: `STF-${stamp}`, name, role: detail || 'Store Staff', shift: 'Day', status: 'Active' }]);
        break;
      case 'Marketing':
        onMarketingChange?.([...marketing, { id: `MKT-${stamp}`, title: name, channel: detail || 'Push', budget: 0, clicks: 0, status: 'Running' }]);
        break;
      case 'Payments':
      case 'MFS Business & Settlement':
      case 'Earnings & Payouts':
        onPaymentsChange?.([...payments, { id: `TXN-${stamp}`, orderId: name, amount: Number(detail) || 100, method: superAdminModule === 'MFS Business & Settlement' ? 'bKash' : 'Admin', status: 'Pending', date: today }]);
        break;
      case 'POS System':
        createAdminPosOrder();
        break;
      case 'Support Tickets':
        onTicketsChange?.([...supportTickets, { id: `TKT-${stamp}`, user: name, subject: detail || 'Admin created ticket', priority: 'Medium', status: 'Open', date: today, messages: [] }]);
        break;
      case 'Notifications':
        onNotificationsChange?.([{ id: `NOTIF-${stamp}`, title: name, message: detail || 'Admin notification', type: 'system', time: 'Just now', read: false }, ...notifications]);
        break;
      default:
        return;
    }

    setAdminCreateName('');
    setAdminCreateDetail('');
    setAdminCreateOpen(false);
    setAdminNotice(`${superAdminModule} item added successfully`);
  };

  // Keep the simulator's order in sync with the real orders list.
  // If the active order was deleted/cancelled (no longer exists in realOrders or now Cancelled),
  // reset the simulator to idle so it never jumps to another (e.g. temporary) order or keeps showing it.
  useEffect(() => {
    const realCurrent = realOrders.find(o => o.id === currentOrder.id);
    const stillExists = !!realCurrent;
    const nowCancelled = !!realCurrent && realCurrent.status === 'Cancelled';
    const nowCompleted = !!realCurrent && realCurrent.status === 'Completed';
    // Once an order has been picked up it must NEVER return to the store. Even if the real order's
    // status is flipped back to non-cancelled (admin re-activation), the delivery auto-resumes with
    // the driver + customer instead of being offered again.
    const nowPickedUp = !!realCurrent?.pickedUp || pickedUpOrderIdsRef.current.has(currentOrder.id) || !!currentOrder.pickedUp;
    // Skip the placeholder order on first load so no false "deleted" toast appears.
    const isPlaceholder = currentOrder.id === DEFAULT_SIM_ORDER.id && !stillExists && realOrders.length === 0;
    // Whether a delivery is actually being shown — gates the toast, NOT the reset.
    const wasActive = simulationStatus !== 'idle' || driverDeliveryStage !== 'offer';
    // Cancellation is terminal: the order leaves EVERY display instantly no matter which admin path
    // cancelled it (sim panel, Orders Management, POS). Reset runs even on an idle mount so a
    // cancelled order can never linger; the "deleted" toast only fires when something was visible.
    if (!isPlaceholder && nowCancelled) {
      setPendingDispatch(null);
      setSimulationStatus('idle');
      setDriverDeliveryStage('offer');
      setPickupProofName('');
      setDeliveryProofName('');
      setStorePreparationStarted(false);
      setStoreOrderReady(false);
      setStoreReceived(false);
      setDriverScreen('dashboard');
      setCustomerScreen('store');
      if (showToast && wasActive) driverShowToast(`Order #${currentOrder.id} cancelled — removed from your apps.`, 'info');
    } else if (!isPlaceholder && !stillExists && wasActive) {
      setPendingDispatch(null);
      setSimulationStatus('idle');
      setDriverDeliveryStage('offer');
      setPickupProofName('');
      setDeliveryProofName('');
      setStorePreparationStarted(false);
      setStoreOrderReady(false);
      setStoreReceived(false);
      setDriverScreen('dashboard');
      setCustomerScreen('store');
      if (showToast) driverShowToast(`Order #${currentOrder.id} deleted — removed from your apps.`, 'info');
    }
    // Re-activated picked-up order: skip the store entirely, go straight back to driver + customer.
    if (!isPlaceholder && nowPickedUp && !nowCancelled && !nowCompleted && simulationStatus === 'idle' && driverDeliveryStage === 'offer') {
      resumePickedUpDelivery(realCurrent);
    }
    if (realOrders.length) {
      setCurrentOrder(prev => {
        const prevExists = realOrders.some(o => o.id === prev.id);
        if (prevExists) return prev;
        if (!prev.id && currentOrder.id) return prev;
        return mapOrderToSim(realOrders[realOrders.length - 1]);
      });
    }
  }, [realOrders]);

  // Driver metrics state — wired to the first real driver in the registry
  const [driverStats, setDriverStats] = useState(() => {
    const d = realDrivers[0];
    return d ? {
      name: d.name,
      id: d.id,
      completedCount: 0,
      todayEarnings: 0,
      walletBalance: 0,
      rating: d.rating,
      phone: d.phone
    } : {
      name: '',
      id: '',
      completedCount: 0,
      todayEarnings: 0,
      walletBalance: 0,
      rating: 0,
      phone: ''
    };
  });

  // Keep driver stats live (identity only — balance/earnings start from 0 and grow with real deliveries)
  useEffect(() => {
    const d = realDrivers[0];
    if (!d) return;
    setDriverStats(prev => ({
      ...prev,
      name: d.name,
      id: d.id,
      rating: d.rating,
      phone: d.phone
    }));
  }, [realDrivers]);

  // Live ETA for the tracking screen based on real liveDrivers sim
  const liveEtaMins = useMemo(() => {
    const pk = currentOrder.pickupCoords || { lat: 23.78, lng: 90.4045 };
    let drv: LiveDriverSim | null = null;
    if (currentOrder.driverId) drv = liveDriversArr.find(x => x.id === currentOrder.driverId) || null;
    if (!drv) {
      let best: LiveDriverSim | null = null;
      let bestD = Infinity;
      for (const d of liveDriversArr) {
        if (d.status === 'Offline') continue;
        const dd = Math.pow(d.lat - pk.lat, 2) + Math.pow(d.lng - pk.lng, 2);
        if (dd < bestD) { bestD = dd; best = d; }
      }
      drv = best;
    }
    if (!drv) return 12;
    const dv = currentOrder.deliveryCoords || { lat: 23.7539, lng: 90.3836 };
    const total = Math.sqrt(Math.pow(dv.lat - pk.lat, 2) + Math.pow(dv.lng - pk.lng, 2)) || 1;
    const left = Math.sqrt(Math.pow(dv.lat - drv.lat, 2) + Math.pow(dv.lng - drv.lng, 2));
    const p = Math.max(0.05, Math.min(1, 1 - left / total));
    return Math.max(2, Math.round((currentOrder.status === 'Completed' ? 0 : 25) * (1 - p)));
  }, [currentOrder.driverId, currentOrder.pickupCoords, currentOrder.deliveryCoords, currentOrder.status, liveDriversArr]);

  // Live tracking screen: real driver + status stepper driven by the real order
  const trackingDriverName = useMemo(() => {
    if (currentOrder.driverId) {
      const ex = liveDriversArr.find(x => x.id === currentOrder.driverId);
      if (ex) return ex.name;
    }
    const pk = currentOrder.pickupCoords || { lat: 23.78, lng: 90.4045 };
    let best: LiveDriverSim | null = null;
    let bestD = Infinity;
    for (const d of liveDriversArr) {
      if (d.status === 'Offline') continue;
      const dd = Math.pow(d.lat - pk.lat, 2) + Math.pow(d.lng - pk.lng, 2);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best ? best.name : driverStats.name;
  }, [currentOrder.driverId, currentOrder.pickupCoords, liveDriversArr, driverStats.name]);

  const trackStep = (() => {
    const st = currentOrder.status;
    if (st === 'Completed') return 4;
    if (st === 'Ongoing' || st === 'Pending') return 3;
    if (st === 'Processing') return 2;
    return 1;
  })();

  // Real live map vehicle for the customer tracking screen
  const simTrackVeh = useMemo<LiveVeh | null>(() => {
    const pk = currentOrder.pickupCoords || { lat: 23.7539, lng: 90.3836 };
    const dv = currentOrder.deliveryCoords || { lat: 23.7806, lng: 90.4009 };
    let drv: LiveDriverSim | null = null;
    if (currentOrder.driverId) drv = liveDriversArr.find(x => x.id === currentOrder.driverId) || null;
    if (!drv) {
      let best: LiveDriverSim | null = null;
      let bestD = Infinity;
      for (const d of liveDriversArr) {
        if (d.status === 'Offline') continue;
        const dd = Math.pow(d.lat - pk.lat, 2) + Math.pow(d.lng - pk.lng, 2);
        if (dd < bestD) { bestD = dd; best = d; }
      }
      drv = best;
    }
    if (!drv) return null;
    return {
      id: currentOrder.id,
      name: drv.name,
      status: currentOrder.status === 'Completed' ? 'Delivered' : 'On-Delivery',
      vehicleType: drv.vehicleType || 'Bike',
      dest: 'Customer',
      speed: currentOrder.status === 'Completed' ? 0 : drv.speed,
      lat: drv.lat, lng: drv.lng, tLat: drv.tLat, tLng: drv.tLng,
      roadName: drv.roadName,
      restLat: pk.lat, restLng: pk.lng, restName: currentOrder.storeName,
      custLat: dv.lat, custLng: dv.lng, custName: currentOrder.customerAddress
    };
  }, [currentOrder, liveDriversArr]);

const simPickupPt = currentOrder.pickupCoords || { lat: 23.7539, lng: 90.3836 };
  const simDropPt = currentOrder.deliveryCoords || { lat: 23.7806, lng: 90.4009 };

  // Driver delivery step (0 = offer, 1 = to_store, ... 6 = delivered) used by step-by-step progress
  const driverStep = driverDeliveryStage === 'delivered' ? 6
    : driverDeliveryStage === 'at_customer' ? 5
    : driverDeliveryStage === 'to_customer' ? 4
    : driverDeliveryStage === 'ready_for_pickup' ? 3
    : driverDeliveryStage === 'waiting_store' ? 2
    : driverDeliveryStage === 'to_store' ? 1 : 0;

  const productImageOf = (name: string) => {
    const found = simProducts.find(p => p.name.toLowerCase() === (name || '').toLowerCase());
    return found?.image || '';
  };

  // Map style toggle for tracking (Dark map vs Light map matching Images 1 & 6)
  const [mapStyle, setMapStyle] = useState<'dark' | 'light'>('dark');

  // Screen state manager inside simulator
  // Driver app screens: 'login' | 'signup' | 'docs' | 'pending' | 'dashboard' | 'new_order' | 'progress' | 'completed' | 'history' | 'support' | 'terms' | 'forgot_password'
  const [driverScreen, setDriverScreen] = useState<'login' | 'signup' | 'docs' | 'pending' | 'dashboard' | 'new_order' | 'progress' | 'completed' | 'history' | 'support' | 'terms' | 'forgot_password' | 'account' | 'inbox' | 'settings'>(() => readPersistedDelivery()?.driverScreen ?? 'dashboard');
  const [driverWalletOpen, setDriverWalletOpen] = useState(false);
  const [driverProfileOpen, setDriverProfileOpen] = useState(false);
  const [driverRefreshing, setDriverRefreshing] = useState(false);
  const [notifOn, setNotifOn] = useState(true);

  const [driverToast, setDriverToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const driverShowToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setDriverToast({ message, type });
    setTimeout(() => setDriverToast(null), 3000);
  };

  const [custToast, setCustToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const custShowToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setCustToast({ message, type });
    setTimeout(() => setCustToast(null), 3000);
  };

  const [storeToast, setStoreToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const storeShowToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStoreToast({ message, type });
    setTimeout(() => setStoreToast(null), 3000);
  };

  const [storeAdminToast, setStoreAdminToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const storeAdminShowToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStoreAdminToast({ message, type });
    setTimeout(() => setStoreAdminToast(null), 3000);
  };

  const [superAdminToast, setSuperAdminToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const superAdminShowToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setSuperAdminToast({ message, type });
    setTimeout(() => setSuperAdminToast(null), 3000);
  };

  const handleDriverRefresh = () => {
    if (driverRefreshing) return;
    setDriverRefreshing(true);
    if (showToast) driverShowToast('Searching for new orders nearby...', 'info');
    setTimeout(() => setDriverRefreshing(false), 1800);
  };

  // Block going offline while an active delivery is in progress — driver must complete it first
  const hasActiveDelivery = driverDeliveryStage !== 'offer' && driverDeliveryStage !== 'delivered' && simulationStatus !== 'idle' && simulationStatus !== 'store_pending';

  // Once the driver has picked the order up, it leaves the store display and moves to the store's history
  const storePickedUp = ['to_customer', 'at_customer', 'customer_reported', 'delivered'].includes(driverDeliveryStage);

  // POS-created orders (source 'pos-dispatch' / id starting with 'POS-') are handled directly by the admin and driver.
  // They NEVER appear in the store app or the store admin app, and the store gets no notification about them.
  // In the customer app they appear only when the customer's phone number matches the order's phone number.
  const normPhone = (p: any) => String(p || '').replace(/\D/g, '');
  const posVisibleToCustomer = (ord: any) => !isPosOrder(ord) || (normPhone(ord.customerPhone).length > 0 && normPhone(ord.customerPhone) === normPhone(custPhone));
  const posOrderHiddenFromStore = isPosOrder(currentOrder);
  const posOrderHiddenFromCustomer = isPosOrder(currentOrder) && !posVisibleToCustomer(currentOrder);

  const handleDriverToggleOnline = () => {
    if (onlineStatus && hasActiveDelivery) {
      driverShowToast(`Complete order #${currentOrder.id} first — you cannot go offline during an active delivery.`, 'error');
      return;
    }
    const next = !onlineStatus;
    setOnlineStatus(next);
    const simDriver = realDrivers[0];
    if (simDriver && onDriversChange && simDriver.status !== (next ? 'Online' : 'Offline')) {
      onDriversChange(realDrivers.map(d => d.id === simDriver.id ? { ...d, status: (next ? 'Online' : 'Offline') as DriverDutyStatus } : d));
    }
    driverShowToast(next ? 'Driver is online — ready to receive orders.' : 'Driver went offline — no new orders.', next ? 'success' : 'info');
  };

  // Copy the same order number shared everywhere
  const copyOrderNo = (id: string) => {
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id); } catch {}
    if (showToast) driverShowToast(`Order number #${id} copied`, 'success');
  };

  const handleDriverMapNav = () => {
    if (driverDeliveryStage !== 'offer' && driverDeliveryStage !== 'delivered') {
      setDriverScreen('progress');
    } else {
      if (showToast) driverShowToast('No active delivery right now', 'info');
    }
  };
  
  // Customer view screens: 'store' | 'tracking' | 'history' | 'delivered'
  const [customerScreen, setCustomerScreen] = useState<'store' | 'tracking' | 'history' | 'delivered' | 'profile'>(() => readPersistedDelivery()?.customerScreen ?? 'store');

  // Filter state for Order History screen (Image 2)
  const [orderHistoryTab, setOrderHistoryTab] = useState<'all' | 'completed' | 'cancelled' | 'ongoing'>('all');

  // Input states inside simulation
  const [loginId, setLoginId] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  const [signupName, setSignupName] = useState<string>('');
  const [signupId, setSignupId] = useState<string>('');
  const [signupPhone, setSignupPhone] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPass, setSignupPass] = useState<string>('');
  const [signupConfirmPass, setSignupConfirmPass] = useState<string>('');
  const [termsChecked, setTermsChecked] = useState<boolean>(false);

  // Document upload interactive states
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({
    license: '',
    nid: '',
    registration: '',
    insurance: '',
    taxToken: '',
    photo: ''
  });

  // Terms & Conditions collapsible accordion state
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  
  // Custom interactive reference chat state for simulation
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'driver' | 'customer'; text: string; time: string; image?: string }>>([
    { sender: 'driver', text: 'Assalamu Alaikum. I have picked up your order and I am on my way!', time: '11:28 AM' },
    { sender: 'customer', text: 'Walaikum Assalam. Please bring it hot and check if sauce is included.', time: '11:30 AM' }
  ]);
  const [newMessageText, setNewMessageText] = useState<string>('');
  const [driverChatOpen, setDriverChatOpen] = useState<boolean>(false);
  const [driverChatText, setDriverChatText] = useState<string>('');
  const [driverReportOpen, setDriverReportOpen] = useState(false);
  const [driverReportOrder, setDriverReportOrder] = useState<string | null>(null);
  const [driverReportReason, setDriverReportReason] = useState('Customer unreachable');
  const [driverReportDesc, setDriverReportDesc] = useState('');
  // Queued delivery request — applied only after the current active delivery completes
  const [pendingDispatch, setPendingDispatch] = useState<{ order: any; source: 'admin' | 'pos' } | null>(() => readPersistedDelivery()?.pendingDispatch ?? null);

  // Persist the active delivery to localStorage so a browser refresh keeps the order on the driver display
  const restoredDeliveryRef = useRef(false);
  useEffect(() => {
    if (restoredDeliveryRef.current) return;
    restoredDeliveryRef.current = true;
    try {
      const raw = localStorage.getItem(deliveryPersistKey);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || (s.simulationStatus === 'idle' && s.driverDeliveryStage === 'offer')) return;
      if (s.currentOrder) setCurrentOrder(s.currentOrder);
      setSimulationStatus(s.simulationStatus);
      setDriverDeliveryStage(s.driverDeliveryStage);
      setOnlineStatus(s.onlineStatus);
      setAutoAccept(s.autoAccept);
      setPickupProofName(s.pickupProofName || '');
      setDeliveryProofName(s.deliveryProofName || '');
      setStorePreparationStarted(s.storePreparationStarted);
      setStoreOrderReady(s.storeOrderReady);
      setStoreReceived(s.storeReceived);
      setStoreOnline(s.storeOnline);
      setOrderPlacedAt(s.orderPlacedAt || '');
      setStoreReceivedAt(s.storeReceivedAt || '');
      setDriverReceivedAt(s.driverReceivedAt || '');
      setDriverScreen(s.driverScreen || 'dashboard');
      setCustomerScreen(s.customerScreen || 'tracking');
      if (s.pendingDispatch) setPendingDispatch(s.pendingDispatch);
    } catch {}
  }, []);
  const deliverySaveRunCountRef = useRef(0);
  useEffect(() => {
    // StrictMode double-invokes effects on mount; skip the first two runs so a
    // restored 'ongoing' delivery is never clobbered by the blank initial state.
    deliverySaveRunCountRef.current += 1;
    if (deliverySaveRunCountRef.current <= 2) return;
    if (simulationStatus === 'idle' && driverDeliveryStage === 'offer' && !currentOrder.id) return;
    try {
      localStorage.setItem(deliveryPersistKey, JSON.stringify({
        currentOrder,
        simulationStatus,
        driverDeliveryStage,
        onlineStatus,
        autoAccept,
        pickupProofName,
        deliveryProofName,
        storePreparationStarted,
        storeOrderReady,
        storeReceived,
        storeOnline,
        orderPlacedAt,
        storeReceivedAt,
        driverReceivedAt,
        driverScreen,
        customerScreen,
        pendingDispatch
      }));
    } catch {}
  });

  // Rating stars state for Driver Order Completed (Image 3)
  const [customerRating, setCustomerRating] = useState<number>(0);

  // Order History Data — derived from the real orders list (POS orders only shown if the customer's phone matches)
  const orderHistoryData = realOrders.filter(o => posVisibleToCustomer(o)).map(ord => ({
    id: ord.id,
    store: ord.storeName,
    category: simCategory(ord.storeName),
    address: ord.address,
    date: ord.date,
    time: ord.time || '—',
    amount: ord.amount,
    items: ord.items || [],
    status: ord.status === 'Cancelled' ? 'Cancelled' : ord.status === 'Completed' ? 'Completed' : 'Ongoing'
  }));

  // Auto transition rules to make simulation feel alive
  useEffect(() => {
    if (simulationStatus === 'offered') {
      setDriverScreen('new_order');
    } else if (simulationStatus === 'ongoing') {
      setDriverScreen('progress');
      if (!posOrderHiddenFromCustomer) setCustomerScreen('tracking');
    } else if (simulationStatus === 'arrived') {
      setDriverScreen('progress');
      if (!posOrderHiddenFromCustomer) setCustomerScreen('tracking');
    } else if (simulationStatus === 'delivered') {
      setDriverScreen('completed');
      if (!posOrderHiddenFromCustomer) setCustomerScreen('delivered');
    } else if (simulationStatus === 'idle') {
      if (['new_order', 'progress'].includes(driverScreen)) {
        setDriverScreen('dashboard');
      }
    }
  }, [simulationStatus]);

  // Resumes an order that was already picked up by the driver before it was cancelled.
  // Re-activating it must NOT send the driver back to the store — it goes straight back to
  // the driver (continue delivery) and the customer (live tracking). Store is not involved.
  const resumePickedUpDelivery = (ord: Order) => {
    setPendingDispatch(null);
    setOnlineStatus(true);
    setCurrentOrder(mapOrderToSim(ord));
    setDriverDeliveryStage('to_customer');
    setSimulationStatus('ongoing');
    setDriverScreen('progress');
    setPickupProofName('');
    setDeliveryProofName('');
    setStorePreparationStarted(false);
    setStoreOrderReady(false);
    setStoreReceived(false);
    if (!isPosOrder(ord) || posVisibleToCustomer(ord)) setCustomerScreen('tracking');
    setDriverReceivedAt(nowTime());
    if (showToast) driverShowToast(`Order #${ord.id} resumed — driver already picked it up, delivering to customer.`, 'info');
  };

  // Admin manually assigned a driver to this order — driver auto-goes Online and receives it.
  // If the driver is already on an active delivery:
  //   - a DIFFERENT order is queued until the current delivery completes
  //   - the SAME order (reassigned to another driver) is transferred away and leaves this driver's display
  useEffect(() => {
    if (!adminDispatch) return;
    const dispatchedReal = realOrders.find(o => o.id === adminDispatch.id);
    const dispatchCancelled = (dispatchedReal && dispatchedReal.status === 'Cancelled') || adminDispatch.status === 'Cancelled';
    const dispatchCompleted = (dispatchedReal && dispatchedReal.status === 'Completed') || adminDispatch.status === 'Completed';
    // A cancelled order that was never picked up stays cancelled. A PICKED-UP order is only ever
    // re-activated (resume delivery with the driver + customer) — it never returns to the store queue.
    const dispatchPickedUp = !!adminDispatch.pickedUp || pickedUpOrderIdsRef.current.has(adminDispatch.id) || (currentOrder.id === adminDispatch.id && !!currentOrder.pickedUp);
    if (dispatchCompleted || (dispatchCancelled && !dispatchPickedUp)) return;
    const hasActiveDelivery = driverDeliveryStage !== 'offer' && driverDeliveryStage !== 'delivered' && simulationStatus !== 'idle';
    if (hasActiveDelivery) {
      if (adminDispatch.id === currentOrder.id) {
        setPendingDispatch(null);
        setSimulationStatus('idle');
        setDriverDeliveryStage('offer');
        setPickupProofName('');
        setDeliveryProofName('');
        setStorePreparationStarted(false);
        setStoreOrderReady(false);
        setStoreReceived(false);
        setDriverScreen('dashboard');
        setCustomerScreen('tracking');
        if (showToast) driverShowToast(`Order #${adminDispatch.id} transferred to another driver — removed from your active delivery.`, 'info');
        return;
      }
      setPendingDispatch({ order: adminDispatch, source: 'admin' });
      if (showToast) driverShowToast(`Driver is busy with #${currentOrder.id} — order #${adminDispatch.id} queued until delivery completes.`, 'info');
      return;
    }
    setPendingDispatch(null);
    if (dispatchPickedUp) {
      resumePickedUpDelivery(adminDispatch);
      return;
    }
    setOnlineStatus(true);
    const mapped = mapOrderToSim(adminDispatch);
    setCurrentOrder(mapped);
    setDriverDeliveryStage('offer');
    setPickupProofName('');
    setDeliveryProofName('');
    setStorePreparationStarted(false);
    setStoreOrderReady(false);
    setSimulationStatus('offered');
    setDriverScreen('new_order');
    if (!isPosOrder(adminDispatch) || posVisibleToCustomer(adminDispatch)) setCustomerScreen('tracking');
    setOrderPlacedAt(nowTime());
    setStoreReceivedAt(nowTime());
    setDriverReceivedAt(nowTime());
    if (showToast) driverShowToast(`Admin assigned order #${adminDispatch.id} — Driver auto-Online, request received!`, 'success');
  }, [adminDispatch]);

  // Re-activated a cancelled order targeting the CUSTOMER app only: show it on the customer's live
  // tracking screen WITHOUT involving the driver (the driver app stays on its dashboard).
  useEffect(() => {
    if (!customerDispatchOrder) return;
    const dispatchedReal = realOrders.find(o => o.id === customerDispatchOrder.id);
    const cancelled = (dispatchedReal && dispatchedReal.status === 'Cancelled') || customerDispatchOrder.status === 'Cancelled';
    const completed = (dispatchedReal && dispatchedReal.status === 'Completed') || customerDispatchOrder.status === 'Completed';
    if (cancelled || completed) return;
    const mapped = mapOrderToSim(customerDispatchOrder);
    setCurrentOrder(mapped);
    setPendingDispatch(null);
    setSimulationStatus('ongoing');
    setDriverDeliveryStage('offer');
    setDriverScreen('dashboard');
    setPickupProofName('');
    setDeliveryProofName('');
    setStorePreparationStarted(false);
    setStoreOrderReady(false);
    setStoreReceived(false);
    if (!isPosOrder(customerDispatchOrder) || posVisibleToCustomer(customerDispatchOrder)) setCustomerScreen('tracking');
    setOrderPlacedAt(nowTime());
    if (showToast) driverShowToast(`Order #${customerDispatchOrder.id} re-activated — showing on Customer App only.`, 'info');
  }, [customerDispatchOrder]);

  // Handle a delivery request dispatched from the POS "Send to Driver" panel.
  // If the driver is already on an active delivery, queue the request until it completes.
  useEffect(() => {
    if (!incomingDispatch) return;
    const dispatchedReal = realOrders.find(o => o.id === incomingDispatch.id);
    const dispatchCancelled = (dispatchedReal && dispatchedReal.status === 'Cancelled') || incomingDispatch.status === 'Cancelled';
    const dispatchCompleted = (dispatchedReal && dispatchedReal.status === 'Completed') || incomingDispatch.status === 'Completed';
    // A cancelled order that was never picked up stays cancelled. A PICKED-UP order is only ever
    // re-activated (resume delivery with the driver + customer) — it never returns to the store queue.
    const dispatchPickedUp = !!incomingDispatch.pickedUp || pickedUpOrderIdsRef.current.has(incomingDispatch.id) || (currentOrder.id === incomingDispatch.id && !!currentOrder.pickedUp);
    if (dispatchCompleted || (dispatchCancelled && !dispatchPickedUp)) return;
    const hasActiveDelivery = driverDeliveryStage !== 'offer' && driverDeliveryStage !== 'delivered' && simulationStatus !== 'idle';
    if (hasActiveDelivery) {
      setPendingDispatch({ order: incomingDispatch, source: 'pos' });
      if (showToast) driverShowToast(`Driver is busy with #${currentOrder.id} — order #${incomingDispatch.id} queued until delivery completes.`, 'info');
      return;
    }
    setPendingDispatch(null);
    if (dispatchPickedUp) {
      resumePickedUpDelivery(incomingDispatch);
      return;
    }
    if (!onlineStatus) {
      setSimulationStatus('idle');
      setDriverScreen('dashboard');
      if (showToast) driverShowToast("Driver is offline — this order was NOT received. Go online to get it.", 'error');
      return;
    }
    const mapped = mapOrderToSim(incomingDispatch);
    setCurrentOrder(mapped);
    setDriverDeliveryStage('offer');
    setPickupProofName('');
    setDeliveryProofName('');
    setStorePreparationStarted(false);
    setStoreOrderReady(false);
    setSimulationStatus('offered');
    setDriverScreen('new_order');
    if (!isPosOrder(incomingDispatch) || posVisibleToCustomer(incomingDispatch)) setCustomerScreen('tracking');
    setOrderPlacedAt(nowTime());
    setStoreReceivedAt(nowTime());
    setDriverReceivedAt(nowTime());
    if (showToast) driverShowToast(`New delivery request #${incomingDispatch.id} sent to Driver App!`, 'info');
  }, [incomingDispatch]);

  // ==== COUNTDOWN TIMERS (ring) ====
  // Driver: 1 min to accept the offer
  useEffect(() => {
    if (driverDeliveryStage === 'offer' && driverScreen === 'new_order') {
      setDriverCountdown(60);
      const t = setInterval(() => setDriverCountdown(prev => (prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(t);
    }
  }, [driverDeliveryStage, driverScreen]);

  useEffect(() => {
    if (driverCountdown <= 0 && driverDeliveryStage === 'offer') {
      setSimulationStatus('idle');
      setDriverScreen('dashboard');
      if (onDriverRejected) onDriverRejected(currentOrder.id);
      if (showToast) driverShowToast('Order request expired — not accepted within 1 minute.', 'error');
    }
  }, [driverCountdown]);

  // AUTO-ACCEPT: when the toggle is ON, new offers are received automatically
  useEffect(() => {
    if (autoAccept && driverDeliveryStage === 'offer' && driverScreen === 'new_order') {
      const t = setTimeout(() => {
        handleAcceptOrder();
        if (showToast) driverShowToast('Auto-accept ON — order received automatically!', 'success');
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [autoAccept, driverDeliveryStage, driverScreen]);

  // Store: 5 min to accept/reject (paused while store is offline)
  useEffect(() => {
    if (simulationStatus === 'store_pending' && !storeReceived && storeOnline) {
      setStoreCountdown(300);
      const t = setInterval(() => setStoreCountdown(prev => (prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(t);
    }
  }, [simulationStatus, storeReceived, storeOnline]);

  useEffect(() => {
    if (storeCountdown <= 0 && simulationStatus === 'store_pending' && !storeReceived) {
      storeAcceptOrder(currentOrder);
      if (showToast) storeShowToast('Store did not respond in 5 minutes — order auto-accepted, sent to Driver.', 'info');
    }
  }, [storeCountdown]);

  // Customer: 5 min to confirm/keep the order alive
  useEffect(() => {
    if (simulationStatus === 'store_pending' && customerScreen === 'tracking') {
      setCustCountdown(300);
      const t = setInterval(() => setCustCountdown(prev => (prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(t);
    }
  }, [simulationStatus, customerScreen]);

  useEffect(() => {
    if (custCountdown <= 0 && simulationStatus === 'store_pending') {
      setSimulationStatus('idle');
      if (showToast) custShowToast('Order cancelled — not confirmed within 5 minutes.', 'error');
    }
  }, [custCountdown]);

  // Interactive handler for document uploads
  const handleUploadDocument = (docKey: string, docName: string) => {
    const randomFiles: Record<string, string> = {
      license: 'driving_license_front.jpg',
      nid: 'nid_card_front.png',
      registration: 'scooter_reg_cert.pdf',
      insurance: 'scooter_insurance_receipt.pdf',
      taxToken: 'tax_token_2026.png',
      photo: 'rahim_khan_selfie.jpg'
    };
    
    setUploadedDocs(prev => ({
      ...prev,
      [docKey]: randomFiles[docKey] || 'document_uploaded.jpg'
    }));

    if (showToast) driverShowToast(`${docName} uploaded successfully!`, "success");
  };

  const triggerNewOrderreference = () => {
    if (!onlineStatus) {
      if (showToast) storeShowToast("Driver is offline. Please toggle 'Online' on the Driver App first!", "error");
      return;
    }
    setDriverDeliveryStage('offer');
    setPickupProofName('');
    setDeliveryProofName('');
    setStorePreparationStarted(false);
    setStoreOrderReady(false);
    setSimulationStatus('offered');
    setDriverScreen('new_order');
    if (showToast) storeShowToast("New order request (#A7B9C2) sent to Driver App!", "info");
  };

  const handleAcceptOrder = () => {
    const realOrder = realOrders.find(o => o.id === currentOrder.id);
    const simDriver = realDrivers[0];
    if (realOrder && onUpdateOrder) onUpdateOrder({ ...realOrder, status: 'Processing', driverId: simDriver?.id || realOrder.driverId });
    if (simDriver && onDriversChange && simDriver.status !== 'On-Delivery') {
      onDriversChange(realDrivers.map(d => d.id === simDriver.id ? { ...d, status: 'On-Delivery' as DriverDutyStatus } : d));
    }
    setCurrentOrder((prev: any) => ({ ...prev, status: 'Processing', driverId: prev.driverId || simDriver?.id }));
    setDriverDeliveryStage('to_store');
    setSimulationStatus('ongoing');
    setDriverScreen('progress');
    if (!posOrderHiddenFromCustomer) setCustomerScreen('tracking');
    if (showToast) driverShowToast("Driver accepted the order and is navigating to the store.", "success");
  };

  const handleRejectOrder = () => {
    setSimulationStatus('idle');
    setDriverScreen('dashboard');
    if (onDriverRejected) onDriverRejected(currentOrder.id);
    if (showToast) driverShowToast("Order request rejected by driver.", "error");
  };

  const handleArrived = () => {
    setDriverDeliveryStage('at_customer');
    setSimulationStatus('arrived');
    if (showToast) driverShowToast("Driver arrived at customer destination!", "success");
  };

  const handleArriveStore = () => {
    setDriverDeliveryStage(storeOrderReady ? 'ready_for_pickup' : 'waiting_store');
    if (showToast) driverShowToast(storeOrderReady
      ? `${currentOrder.storeName} has already prepared the order for pickup.`
      : `Driver reached ${currentOrder.storeName} and is waiting for the order.`, 'info');
  };

  const handleStoreStartPreparation = () => {
    const realOrder = realOrders.find(o => o.id === currentOrder.id);
    if (realOrder && onUpdateOrder) onUpdateOrder({ ...realOrder, status: 'Processing' });
    setCurrentOrder((prev: any) => ({ ...prev, status: 'Processing' }));
    setStorePreparationStarted(true);
    if (showToast) storeShowToast(`${currentOrder.storeName} started preparing the order.`, 'success');
  };

  // Store receives the customer order first, then it flows to Admin + Driver
  const handleStoreReceiveOrder = () => {
    storeAcceptOrder(currentOrder);
  };

  const storeAcceptOrder = (ord: any) => {
    // If the driver is already on an active delivery, queue this order until it completes
    const hasActiveDelivery = driverDeliveryStage !== 'offer' && driverDeliveryStage !== 'delivered' && simulationStatus !== 'idle' && simulationStatus !== 'store_pending';
    if (hasActiveDelivery) {
      setPendingDispatch({ order: ord, source: 'pos' });
      if (showToast) storeShowToast(`Driver is busy with #${currentOrder.id} — order #${ord.id} queued until delivery completes.`, 'info');
      return;
    }
    setPendingDispatch(null);
    setCurrentOrder(ord && typeof ord.amount === 'number' ? mapOrderToSim(ord) : ord);
    setStoreReceived(true);
    if (!onlineStatus) {
      setSimulationStatus('idle');
      setDriverScreen('dashboard');
      if (showToast) storeShowToast(`Order #${ord.id} accepted by store — but Driver is OFFLINE, order will wait until driver goes Online.`, 'info');
      return;
    }
    setDriverReceivedAt(nowTime());
    setDriverDeliveryStage('offer');
    setSimulationStatus('offered');
    setDriverScreen('new_order');
    if (showToast) storeShowToast(`Order #${ord.id} accepted by store — sent to Admin & Driver.`, 'success');
  };

  const storeRejectOrder = (ord: any) => {
    if (onStoreRejected) onStoreRejected(ord.id);
    if (showToast) storeShowToast(`Order #${ord.id} rejected by store.`, 'error');
  };

  const handleStoreOrderReady = () => {
    setStorePreparationStarted(true);
    setStoreOrderReady(true);
    if (driverDeliveryStage === 'waiting_store') setDriverDeliveryStage('ready_for_pickup');
    if (showToast) storeShowToast(`${currentOrder.storeName} marked the order ready for pickup.`, 'success');
  };

  const handlePickupConfirmed = () => {
    if (!pickupProofName) {
      if (showToast) driverShowToast('Upload an order pickup photo first.', 'error');
      return;
    }
    const realOrder = realOrders.find(o => o.id === currentOrder.id);
    if (realOrder && onUpdateOrder) onUpdateOrder({ ...realOrder, status: 'Ongoing', pickedUp: true });
    pickedUpOrderIdsRef.current.add(currentOrder.id);
    setCurrentOrder((prev: any) => ({ ...prev, status: 'Ongoing', pickedUp: true }));
    setDriverDeliveryStage('to_customer');
    setSimulationStatus('ongoing');
    if (showToast) driverShowToast('Pickup proof submitted. Customer is now tracking the live delivery.', 'success');
  };

  const handleCustomerUnreachable = () => {
    setDriverDeliveryStage('customer_reported');
    if (onReport) onReport({
      orderId: currentOrder.id,
      reason: 'Customer unreachable',
      note: `Driver called ${currentOrder.customerName}, but the customer did not answer.`
    });
    if (showToast) driverShowToast('Customer-unreachable report sent to Admin and Store.', 'error');
  };

  // Credits the driver's wallet/stats once when a delivery is completed
  const creditDriverCompletion = () => {
    setDriverStats(prev => ({
      ...prev,
      completedCount: prev.completedCount + 1,
      todayEarnings: prev.todayEarnings + Number(currentOrder.deliveryFee || 0),
      walletBalance: prev.walletBalance + Number(currentOrder.deliveryFee || 0)
    }));
  };

  // Returns every app to its home screen so a finished/cancelled order never stays on display
  // and no temporary order ever appears in its place.
  const resetSimulationToIdle = (toastMsg?: string) => {
    setSimulationStatus('idle');
    setDriverDeliveryStage('offer');
    setPickupProofName('');
    setDeliveryProofName('');
    setStorePreparationStarted(false);
    setStoreOrderReady(false);
    setStoreReceived(false);
    setDriverScreen('dashboard');
    setCustomerScreen('store');
    if (pendingDispatch) {
      const queued = pendingDispatch;
      setPendingDispatch(null);
      const queuedReal = realOrders.find(o => o.id === queued.order.id);
      const queuedTerminal = (queuedReal && (queuedReal.status === 'Cancelled' || queuedReal.status === 'Completed')) || queued.order.status === 'Cancelled' || queued.order.status === 'Completed';
      if (!queuedTerminal) {
        // A queued order that was already picked up resumes the delivery — it must NEVER return to the store.
        const queuedPickedUp = !!queued.order.pickedUp || pickedUpOrderIdsRef.current.has(queued.order.id);
        if (queuedPickedUp) {
          resumePickedUpDelivery(queued.order);
        } else {
        setOnlineStatus(true);
        const mapped = mapOrderToSim(queued.order);
        setCurrentOrder(mapped);
        setDriverDeliveryStage('offer');
        setPickupProofName('');
        setDeliveryProofName('');
        setStorePreparationStarted(false);
        setStoreOrderReady(false);
        setSimulationStatus('offered');
        setDriverScreen('new_order');
        if (!isPosOrder(queued.order) || posVisibleToCustomer(queued.order)) setCustomerScreen('tracking');
        setOrderPlacedAt(nowTime());
        setStoreReceivedAt(nowTime());
        setDriverReceivedAt(nowTime());
        if (showToast) driverShowToast(`Queued delivery #${queued.order.id} now sent to Driver — request received!`, 'success');
        }
      }
    }
    if (toastMsg && showToast) driverShowToast(toastMsg, 'success');
  };

  // Store completes the order after the driver picks it up — order leaves the active list and moves to history
  // Driver submits delivery proof — the order is completed immediately, no store approval step.
  const handleDeliveryProofSubmitted = () => {
    if (!deliveryProofName) {
      if (showToast) driverShowToast('Upload a delivery proof photo first.', 'error');
      return;
    }
    handleDeliverComplete();
  };

  const handleDeliverComplete = () => {
    const realOrder = realOrders.find(o => o.id === currentOrder.id);
    if (realOrder && onUpdateOrder) onUpdateOrder({ ...realOrder, status: 'Completed' });
    setCurrentOrder((prev: any) => ({ ...prev, status: 'Completed' }));
    setDriverDeliveryStage('delivered');
    setSimulationStatus('delivered');
    setDriverScreen('completed');
    if (!posOrderHiddenFromCustomer) setCustomerScreen('delivered');
    creditDriverCompletion();
    const simDriver = realDrivers[0];
    if (simDriver && onDriversChange && simDriver.status === 'On-Delivery') {
      onDriversChange(realDrivers.map(d => d.id === simDriver.id ? { ...d, status: 'Online' as DriverDutyStatus } : d));
    }
    if (showToast) driverShowToast("Order delivered successfully!", "success");
    // Auto-return every app to its home screen so the finished order leaves the display
    setTimeout(() => resetSimulationToIdle(`Order #${currentOrder.id} delivered — all apps back to home.`), 1000);
  };

  const handleFinishSimulationOrder = () => {
    // The completed status is submitted at delivery confirmation. This fallback is for reference-only orders.
    const realOrder = realOrders.find(o => o.id === currentOrder.id);
    if (!realOrder && onAddOrder) {
      onAddOrder({
        id: currentOrder.id,
        storeName: currentOrder.storeName,
        address: currentOrder.customerAddress,
        status: 'Completed',
        amount: currentOrder.totalPayable,
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customerName: currentOrder.customerName,
        paymentMethod: currentOrder.paymentMethod
      });
    }
    resetSimulationToIdle(`Order delivered - Tk ${Number(currentOrder.deliveryFee || 0).toFixed(2)} added to Driver wallet balance!`);
  };

  const handleSendMessage = (sender: 'driver' | 'customer') => {
    if (!newMessageText.trim()) return;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sentText = newMessageText;
    setChatMessages(prev => [...prev, { sender, text: sentText, time: timeNow }]);
    setNewMessageText('');
    recordChatLog(sender, sentText, timeNow);
    
    setTimeout(() => {
      const respTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const automatedReplies = [
        "Sure, please wait near the gate.",
        "Okay brother, drive carefully.",
        "I am coming downstairs right now.",
        "Sauce is inside the box, thank you!"
      ];
      const randomResponse = automatedReplies[Math.floor(Math.random() * automatedReplies.length)];
      const other = sender === 'driver' ? 'customer' : 'driver';
      setChatMessages(prev => [...prev, { 
        sender: other, 
        text: randomResponse, 
        time: respTime 
      }]);
      recordChatLog(other, randomResponse, respTime);
    }, 1200);
  };

  const handleSendPhoto = (sender: 'driver' | 'customer', image: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender, text: '📷 Photo', time: timeNow, image }]);
    recordChatLog(sender, '📷 Photo', timeNow, image);
  };

  const recordChatLog = (sender: 'customer' | 'driver', text: string, time: string, image?: string) => {
    const entry: ChatLogEntry = {
      sender,
      name: sender === 'driver' ? driverStats.name : currentOrder.customerName,
      text,
      time,
      image,
      orderId: currentOrder.id
    };
    setChatLog(prev => {
      const next = [...prev, entry];
      if (onChatLogChange) onChatLogChange(next);
      return next;
    });
  };

  const triggerPhotoPicker = (mode: 'gallery' | 'camera') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (mode === 'camera') input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => handleSendPhoto('customer', reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleDriverSendMessage = () => {
    if (!driverChatText.trim()) return;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sentText = driverChatText;
    setChatMessages(prev => [...prev, { sender: 'driver', text: sentText, time: timeNow }]);
    setDriverChatText('');
    recordChatLog('driver', sentText, timeNow);
    setTimeout(() => {
      const respTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const automatedReplies = [
        "Sure, please wait near the gate.",
        "Okay brother, drive carefully.",
        "I am coming downstairs right now.",
        "Sauce is inside the box, thank you!"
      ];
      const randomResponse = automatedReplies[Math.floor(Math.random() * automatedReplies.length)];
      setChatMessages(prev => [...prev, { sender: 'customer', text: randomResponse, time: respTime }]);
      recordChatLog('customer', randomResponse, respTime);
    }, 1200);
  };

  const triggerDriverPhotoPicker = (mode: 'gallery' | 'camera') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (mode === 'camera') input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => handleSendPhoto('driver', reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const resetSimulationState = () => {
    setSimulationStatus('idle');
    setDriverDeliveryStage('offer');
    setPickupProofName('');
    setDeliveryProofName('');
    setStorePreparationStarted(false);
    setStoreOrderReady(false);
    setDriverScreen('dashboard');
    setCustomerScreen('tracking');
    setUploadedDocs({
      license: '',
      nid: '',
      registration: '',
      insurance: '',
      taxToken: '',
      photo: ''
    });
    setChatMessages([
      { sender: 'driver', text: 'Assalamu Alaikum. I have picked up your order and I am on my way!', time: '11:28 AM' },
      { sender: 'customer', text: 'Walaikum Assalam. Please bring it hot and check if sauce is included.', time: '11:30 AM' }
    ]);
    if (showToast) driverShowToast("Simulation reset to default state.", "info");
  };

  const toggleAccordion = (termId: string) => {
    setExpandedTerm(prev => prev === termId ? null : termId);
  };

  // ----- Customer app order placement (mirrors the customer site) -----
  const custSelectedStore = simStores.find(s => s.id === custStoreId) || null;
  const simCartCount = custCart.reduce((s, i) => s + i.qty, 0);
  const simCartTotal = custCart.reduce((s, i) => s + i.price * i.qty, 0);
  const simCoupons = coupons.filter(c => c.status !== 'Paused' && c.status !== 'Inactive');
  const simCouponDiscount = useMemo(() => {
    if (!custAppliedCoupon || !simCartTotal) return 0;
    const c = simCoupons.find(x => x.code === custAppliedCoupon);
    if (!c || simCartTotal < (c.minOrder || 0)) return 0;
    const discountText = String(c.discount || '').toLowerCase();
    if (discountText.includes('free')) return 0;
    const pct = discountText.match(/(\d+)\s*%/);
    if (pct) return Math.round(simCartTotal * (Number(pct[1]) / 100));
    const flat = discountText.match(/(\d+)/);
    return flat ? Math.min(Number(flat[1]), simCartTotal) : 0;
  }, [custAppliedCoupon, simCartTotal, simCoupons]);
  const simFreeByCoupon = !!simCoupons.find(c => c.code === custAppliedCoupon && String(c.discount || '').toLowerCase().includes('free') && simCartTotal >= (c.minOrder || 0));
  const simSelectedOffer = (custSelectedStore?.offer || '').toLowerCase();
  const simStoreFreeDelivery = simSelectedOffer.includes('free delivery') && simCartTotal >= 500;
  const simDeliveryFee = simCartTotal > 0
    ? (simStoreFreeDelivery || simFreeByCoupon ? 0 : (custSelectedStore?.deliveryFee ?? 60))
    : 0;
  const simDiscount = simCartTotal > 0
    ? (simSelectedOffer.includes('10% off') ? Math.round(simCartTotal * 0.1)
      : simSelectedOffer.includes('5% off') ? Math.round(simCartTotal * 0.05)
      : (() => { const m = simSelectedOffer.match(/tk\s*(\d+)\s*off/); return m ? Math.min(Number(m[1]), simCartTotal) : 0; })())
    : 0;
  const simTotalPayable = Math.max(0, simCartTotal - simDiscount - simCouponDiscount + simDeliveryFee);
  const simCartCountById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of custCart) m[it.productId] = (m[it.productId] || 0) + it.qty;
    return m;
  }, [custCart]);
  const simFilteredProducts = useMemo(() => {
    const q = (custSearch || '').trim().toLowerCase();
    return simProducts.filter(p =>
      (custCat === 'All' || (p.category || 'Other') === custCat) &&
      (!q || p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
    );
  }, [simProducts, custCat, custSearch]);
  const simFilteredStores = useMemo(() => {
    const q = (custSearch || '').trim().toLowerCase();
    const list = simStores.filter(st =>
      (custStoreCat === 'All' || (st.category || '') === custStoreCat) &&
      (!q || st.name.toLowerCase().includes(q) || (st.description || '').toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => {
      if (custSort === 'time') return (a.deliveryTime ?? 25) - (b.deliveryTime ?? 25);
      if (custSort === 'fee') return (a.deliveryFee ?? 60) - (b.deliveryFee ?? 60);
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  }, [simStores, custStoreCat, custSearch, custSort]);
  const simSearchSuggestions = useMemo(() => {
    const q = (custSearch || '').trim().toLowerCase();
    if (!q) return [];
    const fromStores = simStores.filter(st => st.name.toLowerCase().includes(q)).map(st => st.name);
    const fromRecent = custRecentSearches.filter(s => s.toLowerCase().includes(q));
    return [...new Set([...fromRecent, ...fromStores])].slice(0, 5);
  }, [custSearch, simStores, custRecentSearches]);

  const simAddToCart = (p: { id: string; name: string; price: number }) => {
    setCustCart(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) return prev.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const simChangeQty = (productId: string, delta: number) => {
    setCustCart(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const qty = Math.max(0, i.qty + delta);
      return { ...i, qty };
    }).filter(i => i.qty > 0));
  };

  const handleSimPlaceOrder = () => {
    if (!custSelectedStore) return;
    if (!custCart.length) {
      if (showToast) custShowToast("Your cart is empty — add items first!", "error");
      return;
    }
    if (custPay === 'NexaGo Wallet' && custWallet < simTotalPayable) {
      if (showToast) custShowToast(`Insufficient wallet balance — need Tk ${simTotalPayable}`, 'error');
      return;
    }
    if (custPay === 'Card' && (custCardNum.replace(/\s/g, '').length < 15 || !custCvv || custCvv.length < 3 || !custCardExp)) {
      if (showToast) custShowToast('Please enter a valid card number, expiry and CVV', 'error');
      return;
    }
    if ((custPay === 'bKash' || custPay === 'Nagad') && custBkashPin.length < 4) {
      if (showToast) custShowToast('Enter your mobile wallet PIN (4 digits)', 'error');
      return;
    }
    if (custPay === 'NexaGo Wallet') setCustWallet(w => w - simTotalPayable);
    const earned = Math.floor(simCartTotal / 100);
    const orderId = makeOrderId();
    const orderBase: any = {
      id: orderId,
      storeName: custSelectedStore.name,
      address: custAddress,
      customerName: custProfileForm.name,
      customerPhone: custPhone,
      paymentMethod: custPay,
      status: 'Confirmed',
      amount: simTotalPayable,
      deliveryCharge: simDeliveryFee,
      discount: simDiscount,
      coupon: custAppliedCoupon,
      couponDiscount: simCouponDiscount,
      offer: custSelectedStore.offer,
      itemCount: simCartCount,
      priority: simCartTotal > 1500 ? 'Express' : 'Normal',
      deliveryCoords: custPickCoords,
      items: custCart.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.qty }))
    };
    try { localStorage.setItem('nexago_saved_loc', JSON.stringify(custPickCoords)); } catch {}
    if (onAddOrder) onAddOrder(orderBase);
    const driverMidDelivery = driverDeliveryStage !== 'offer' && driverDeliveryStage !== 'delivered' && simulationStatus !== 'idle' && simulationStatus !== 'store_pending';
    if (!driverMidDelivery) setCurrentOrder({ ...mapOrderToSim(orderBase), id: orderId });
    setCustCart([]);
    setCustAppliedCoupon(null);
    setCustCoupon('');
    setCustBkashPin('');
    setCustCardNum('');
    setCustCardExp('');
    setCustCvv('');
    setCustPoints(p => p + earned);
    if (showToast) custShowToast(`Order placed! +${earned} points earned`, 'success');
    setCustView('stores');
    setCustomerScreen('tracking');
    // Never wipe an active delivery when a new customer order is placed — only reset when the driver is idle
    if (!driverMidDelivery) {
      setDriverDeliveryStage('offer');
      setPickupProofName('');
      setDeliveryProofName('');
      setStorePreparationStarted(false);
      setStoreOrderReady(false);
      setStoreReceived(false);
      setOrderPlacedAt(nowTime());
      setStoreReceivedAt(nowTime());
      setSimulationStatus('store_pending');
      if (showToast) custShowToast(`Order placed at ${custSelectedStore.name} — sent to the store first.`, "success");
    } else {
      // Driver is busy — keep the active delivery; the new order waits in the store queue until the driver is free
      if (showToast) custShowToast(`Order placed at ${custSelectedStore.name} — queued at the store until the driver finishes the current delivery.`, "info");
    }
  };

  const simReorder = (ord: any) => {
    if (!ord.items || !ord.items.length) { if (showToast) custShowToast('No items in this order to reorder', 'error'); return; }
    const store = simStores.find(s => s.name === ord.store) || simStores[0];
    setCustStoreId(store.id);
    const cart: Array<{ productId: string; name: string; price: number; qty: number }> = [];
    for (const it of ord.items) {
      const p = simProducts.find(x => x.name.toLowerCase() === (it.name || '').toLowerCase());
      if (p && p.stock > 0) cart.push({ productId: p.id, name: p.name, price: p.price, qty: Math.min(it.quantity || 1, p.stock) });
    }
    if (!cart.length) { if (showToast) custShowToast('Items unavailable right now', 'error'); return; }
    setCustCart(cart);
    setCustCat('All');
    setCustSearch('');
    setCustomerScreen('store');
    setCustView('store');
    if (showToast) custShowToast(`Cart ready to reorder from ${store.name}`, 'success');
  };

  const trackHistoryOrder = (ord: any) => {
    if (ord.status === 'Completed') { if (showToast) custShowToast('This order is already delivered — tracking not available', 'error'); return; }
    if (ord.status === 'Cancelled') { if (showToast) custShowToast('This order was cancelled — tracking not available', 'error'); return; }
    const store = simStores.find(s => s.name === ord.store) || simStores[0];
    setCurrentOrder({
      id: ord.id,
      storeName: ord.store,
      storeAddress: store.address || ord.store,
      customerName: custProfileForm.name,
      customerAddress: ord.address,
      distance: '4.2 km', storeToYou: '1.3 km', youToCustomer: '2.9 km',
      deliveryFee: 0, itemPrice: ord.amount, totalPayable: ord.amount,
      item: `${(ord.items || []).reduce((s: number, i: any) => s + (i.quantity || 1), 0)} items`,
      paymentMethod: 'Cash on Delivery',
      timeEst: '30 mins', timestamp: `${ord.date} ${ord.time}`,
      status: ord.status === 'Completed' ? 'Completed' : 'Ongoing',
      itemsList: (ord.items || []).map((it: any) => ({ name: it.name, qty: it.quantity, price: it.price, icon: '🛍️' })),
      pickupCoords: undefined, deliveryCoords: undefined, driverId: undefined,
    });
    setSimulationStatus(ord.status === 'Completed' ? 'idle' : 'ongoing');
    setCustomerScreen('tracking');
    if (showToast) custShowToast(`Tracking order ${ord.id}`, 'info');
  };

  // Helper for Order History icon based on category
  const getOrderCategoryIcon = (category: string) => {
    if (category === 'food') return <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">🍴</div>;
    if (category === 'grocery') return <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">🛒</div>;
    if (category === 'pharmacy') return <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">🛍️</div>;
    return <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">🏪</div>;
  };

  const filteredHistoryOrders = orderHistoryData.filter(ord => {
    if (orderHistoryTab === 'all') return true;
    if (orderHistoryTab === 'completed') return ord.status === 'Completed';
    if (orderHistoryTab === 'cancelled') return ord.status === 'Cancelled';
    if (orderHistoryTab === 'ongoing') return ord.status === 'Ongoing';
    return true;
  });

  return (
    <div className="min-h-full bg-[#07101b] p-4 md:p-6 fade-in" id="app-simulator-module">

      {/* Dual Phone Grid Representation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-8 justify-items-center">
        
        {/* ======================================================= */}
        {/* PHONE 1: CUSTOMER APP SIDE                              */}
        {/* ======================================================= */}
        <div className="w-[290px] sm:w-[310px] flex flex-col">
          {/* Realistic Mobile Container referenceup */}
          <div className="w-full aspect-[9/19.5] bg-[#050b12] rounded-[48px] border-[10px] border-[#1d2736] relative shadow-2xl flex flex-col overflow-hidden select-none">
            {/* Phone Side Buttons */}
            <div className="absolute -left-[4px] top-24 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -left-[4px] top-36 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -right-[4px] top-32 w-[4px] h-16 bg-[#2a3646] rounded-r-md" />
            {/* Dynamic Island */}
            <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 flex items-center justify-center shadow-lg">
              <div className="w-7 h-1.5 bg-[#1d2736] rounded-full"></div>
            </div>

            {/* Simulated Phone Status Bar */}
            <div className="h-10 bg-[#060c13] px-6 pt-3 flex items-center justify-between text-white text-[10px] font-bold z-30 relative">
              <span>11:26</span>
              <div className="flex items-center space-x-1.5">
                <Wifi className="w-3.5 h-3.5" />
                <span className="text-[8px] bg-white/20 px-1 rounded-sm uppercase tracking-tighter">LTE</span>
                <Battery className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* SCREEN CANVAS AREA */}
            <div className="flex-1 overflow-y-auto bg-[#070e17] flex flex-col relative text-white">
              
              {/* CUSTOMER SCREEN 1: ORDER TRACKING (Screenshots 1 & 6 - Pixel Perfect) */}
              {customerScreen === 'tracking' && !posOrderHiddenFromCustomer && (
                <div className="flex-1 flex flex-col justify-between fade-in bg-[#070e17]">
                  
                  {/* Header Bar */}
                  <div className="px-4 py-2.5 bg-[#070e17] flex items-center justify-between border-b border-white/5">
                    <button onClick={() => setCustomerScreen('store')} className="text-gray-300 hover:text-white p-1">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-sm font-bold text-white tracking-wide">Order Tracking</h4>
                    <div className="flex items-center space-x-1.5">
                  {simulationStatus === 'store_pending' && (
                    <div className="flex items-center space-x-1 bg-[#111c2e] border border-orange-500/30 rounded-full px-1.5 py-0.5">
                      <CountdownRing seconds={custCountdown} total={300} size={22} color={custCountdown <= 30 ? '#ef4444' : '#f97316'} />
                      <span className="text-[7px] font-bold text-gray-300">Store confirm</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 bg-[#0b1320] border border-white/10 rounded-full px-2 py-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-[8px] font-bold text-gray-300">Placed at {orderPlacedAt || '—'}</span>
                  </div>
                      <button onClick={() => { if (showToast) custShowToast("Opening Customer Support...", "info"); }} className="flex items-center space-x-1 text-xs text-gray-300 hover:text-white">
                        <Headphones className="w-3.5 h-3.5" />
                        <span>Help</span>
                      </button>
                      <button onClick={() => { setCustReportOrder(currentOrder.id); setCustReportReason('Wrong item received'); setCustReportDesc(''); setCustReportOpen(true); }} className="flex items-center space-x-1 px-2 py-1 bg-red-500/15 text-red-400 text-[8px] font-bold rounded-lg cursor-pointer hover:bg-red-500/25">
                        <AlertCircle className="w-3 h-3" /><span>Report</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    
                    {/* Stepper Timeline - driven by the real order status */}
                    <div className="flex items-center justify-between px-2 py-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${trackStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          {trackStep >= 1 ? <Check className="w-3.5 h-3.5" /> : <span className="text-[9px]">1</span>}
                        </div>
                        <span className={`text-[9px] font-semibold mt-1 ${trackStep >= 1 ? 'text-emerald-400' : 'text-gray-400'}`}>Confirmed</span>
                      </div>
                      <div className={`h-[2px] flex-1 mx-1 ${trackStep >= 2 ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${trackStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          {trackStep >= 2 ? <Check className="w-3.5 h-3.5" /> : <span className="text-[9px]">2</span>}
                        </div>
                        <span className={`text-[9px] font-semibold mt-1 ${trackStep >= 2 ? 'text-emerald-400' : 'text-gray-400'}`}>Preparing</span>
                      </div>
                      <div className={`h-[2px] flex-1 mx-1 ${trackStep >= 3 ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${trackStep >= 3 ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          {trackStep >= 3 ? <span className="text-xs">🛵</span> : <span className="text-[9px]">3</span>}
                        </div>
                        <span className={`text-[9px] font-semibold mt-1 ${trackStep >= 3 ? 'text-orange-400' : 'text-gray-400'}`}>On the Way</span>
                      </div>
                      <div className={`h-[2px] flex-1 mx-1 ${trackStep >= 4 ? 'bg-emerald-500' : 'bg-gray-700 border-dashed'}`}></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${trackStep >= 4 ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          {trackStep >= 4 ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px]">🏠</span>}
                        </div>
                        <span className={`text-[9px] font-semibold mt-1 ${trackStep >= 4 ? 'text-emerald-400' : 'text-gray-400'}`}>Delivered</span>
                      </div>
                    </div>

                  {/* Step-by-step Delivery Progress (replaces live map) */}
                    <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">Delivery Progress</p>
                        <span className="text-[8px] text-orange-400 font-bold">{currentOrder.status === 'Completed' ? 'Completed' : 'Live'}</span>
                      </div>
                      {[
                        { done: trackStep >= 1, icon: '✓', label: 'Order Confirmed', desc: 'Store accepted your order', time: 'Just now' },
                        { done: trackStep >= 2, icon: '👨‍🍳', label: 'Preparing', desc: 'Store is packing your items', time: 'Estimated 5 min' },
                        { done: trackStep >= 3, icon: '🛵', label: 'On the Way', desc: `${trackingDriverName} is delivering to you`, time: `${currentOrder.status === 'Completed' ? 0 : liveEtaMins} mins left` },
                        { done: trackStep >= 4, icon: '🏠', label: 'Delivered', desc: 'Enjoy your order!', time: trackStep >= 4 ? 'Completed' : 'Upcoming' },
                      ].map((s, i) => (
                        <div key={i} className="flex items-start space-x-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                            {s.done ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px]">{s.icon}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-[10px] font-bold ${s.done ? 'text-emerald-400' : 'text-gray-400'}`}>{s.label}</p>
                              <span className="text-[8px] text-gray-500">{s.time}</span>
                            </div>
                            <p className="text-[8px] text-gray-400">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Details Card - live ETA */}
                    <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Delivery Details</p>
                        <div className="flex items-baseline space-x-1.5 mt-0.5">
                          <span className="text-2xl font-black text-orange-500">{currentOrder.status === 'Completed' ? 0 : liveEtaMins}</span>
                          <span className="text-sm font-bold text-white">mins</span>
                        </div>
                        <p className="text-[9.5px] text-gray-300 font-medium mt-0.5">{currentOrder.status === 'Completed' ? 'Order delivered — thank you!' : 'Almost there, please be ready!'}</p>
                      </div>

                      {/* Green Grocery Bag Illustration */}
                      <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <span className="text-3xl">🛍️</span>
                      </div>
                    </div>

                    {/* Order Summary & Items List - real totals */}
                    <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div>
                          <p className="text-xs font-bold text-white">Order Summary</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">{currentOrder.itemsList.reduce((s, i) => s + i.qty, 0)} Items</p>
                        </div>
                        <div className="text-right flex items-center space-x-1">
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase">Total Amount</p>
                            <p className="text-sm font-black text-orange-500">Tk {currentOrder.totalPayable.toFixed(2)}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2 pt-1">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Order Items</p>
                        {currentOrder.itemsList.map((itm, idx) => {
                          const img = productImageOf(itm.name);
                          return (
                            <div key={idx} className="flex items-center justify-between text-[10px] py-1 border-b border-white/5 last:border-none">
                              <div className="flex items-center space-x-2">
                                {img ? (
                                  <img src={img} alt={itm.name} referrerPolicy="no-referrer" loading="lazy" className="w-6 h-6 rounded-md object-cover" />
                                ) : (
                                  <span className="text-sm">{itm.icon}</span>
                                )}
                                <span className="text-gray-200 font-medium">{itm.name}</span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-gray-400">{itm.qty} ×</span>
                                <span className="text-white font-bold w-16 text-right">Tk {itm.price.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Driver Contact Card - Image 1 & 6 */}
                    <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs overflow-hidden border border-white/20">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{trackingDriverName}</p>
                          <p className="text-[9px] text-gray-400 flex items-center mt-0.5">
                            <span className="text-amber-400 font-bold mr-1">★ {driverStats.rating}</span>
                            <span>Completed {driverStats.completedCount} orders</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <a 
                          href={`tel:${driverStats.phone}`}
                          onClick={(e) => { e.preventDefault(); if (showToast) custShowToast(`Calling ${trackingDriverName}...`, "info"); }}
                          className="flex flex-col items-center text-gray-300 hover:text-white"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Phone className="w-3.5 h-3.5 text-orange-400" />
                          </div>
                          <span className="text-[7.5px] font-bold uppercase mt-1">Call</span>
                        </a>

                        <button 
                          onClick={() => setChatOpen(true)}
                          className="flex flex-col items-center text-gray-300 hover:text-white"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                          </div>
                          <span className="text-[7.5px] font-bold uppercase mt-1">Chat</span>
                        </button>
                      </div>
                    </div>

                    {/* Safety Banner Footer */}
                    <div className="py-1 text-center flex items-center justify-center space-x-1.5 text-[9px] text-emerald-400 font-medium">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Your order is safe with us</span>
                    </div>

                  </div>
                </div>
              )}

              {/* CUSTOMER SCREEN 2: ORDER HISTORY (Screenshot 2 - Pixel Perfect) */}
              {customerScreen === 'history' && (
                <div className="flex-1 flex flex-col justify-between fade-in bg-[#070e17]">
                  {/* Top Header */}
                  <div className="px-4 py-3 bg-[#070e17] flex items-center justify-between border-b border-white/5">
                    <button onClick={() => setCustomerScreen('profile')} className="text-gray-300 hover:text-white p-1 cursor-pointer">
                      <Menu className="w-4 h-4" />
                    </button>
                    <h4 className="text-sm font-bold text-white">Order History</h4>
                    <button className="flex items-center space-x-1 text-xs text-orange-400 font-bold">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Filter</span>
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="px-3 pt-2 pb-1 border-b border-white/5 flex items-center justify-between text-[11px] font-bold">
                    {[
                      { key: 'all', label: 'All Orders' },
                      { key: 'completed', label: 'Completed' },
                      { key: 'cancelled', label: 'Cancelled' },
                      { key: 'ongoing', label: 'Ongoing' }
                    ].map(tb => (
                      <button
                        key={tb.key}
                        onClick={() => setOrderHistoryTab(tb.key as any)}
                        className={`pb-1.5 transition-all cursor-pointer relative ${orderHistoryTab === tb.key ? 'text-orange-400 font-black' : 'text-gray-400'}`}
                      >
                        {tb.label}
                        {orderHistoryTab === tb.key && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    
                    {/* 4 Summary Cards Grid - real counts from the orders list */}
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl text-center">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-[10px]">🧩</div>
                        <p className="text-xs font-black text-white mt-1">{realOrders.length}</p>
                        <p className="text-[7px] text-gray-400 uppercase font-bold mt-0.5">Total Orders</p>
                      </div>

                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl text-center">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-[10px]">✓</div>
                        <p className="text-xs font-black text-white mt-1">{realOrders.filter(o => o.status === 'Completed').length}</p>
                        <p className="text-[7px] text-gray-400 uppercase font-bold mt-0.5">Completed</p>
                      </div>

                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl text-center">
                        <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 mx-auto flex items-center justify-center text-[10px]">⏱️</div>
                        <p className="text-xs font-black text-white mt-1">{realOrders.filter(o => o.status === 'Ongoing' || o.status === 'Processing' || o.status === 'Confirmed').length}</p>
                        <p className="text-[7px] text-gray-400 uppercase font-bold mt-0.5">Ongoing</p>
                      </div>

                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl text-center">
                        <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center text-[10px]">✕</div>
                        <p className="text-xs font-black text-white mt-1">{realOrders.filter(o => o.status === 'Cancelled').length}</p>
                        <p className="text-[7px] text-gray-400 uppercase font-bold mt-0.5">Cancelled</p>
                      </div>
                    </div>

                    {/* Order List Cards */}
                    {filteredHistoryOrders.length === 0 ? (
                      <div className="text-center py-10 space-y-2">
                        <div className="text-3xl">📦</div>
                        <p className="text-[10px] text-gray-300 font-bold">No orders found</p>
                        <p className="text-[8px] text-gray-500">Place your first order to see it here</p>
                        <button onClick={() => { setCustomerScreen('store'); setCustView('stores'); }} className="mx-auto px-3 py-1.5 bg-orange-500 text-white text-[8px] font-bold rounded-lg cursor-pointer">Browse Stores</button>
                      </div>
                    ) : (
                    <div className="space-y-2">
                      {filteredHistoryOrders.map((ord, idx) => (
                        <div key={idx} className="bg-[#111c2e] border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                          <div className="flex items-center space-x-3">
                            {getOrderCategoryIcon(ord.category)}
                            <div>
                              <p className="text-[10px] font-bold text-gray-400">Order ID: <span className="text-white font-mono">{ord.id}</span></p>
                              <h5 className="text-xs font-bold text-white mt-0.5">{ord.store}</h5>
                              <p className="text-[9px] text-emerald-400 font-medium flex items-center mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1"></span>
                                {ord.address}
                              </p>
                            </div>
                          </div>

                          <div className="text-right space-y-1">
                            <p className="text-xs font-bold text-emerald-400">Tk {ord.amount.toFixed(2)}</p>
                            <div className="text-[8px] text-gray-400 space-y-0.5">
                              <p className="flex items-center justify-end"><Calendar className="w-2.5 h-2.5 mr-0.5 text-gray-400" /> {ord.date}</p>
                              <p className="flex items-center justify-end"><Clock className="w-2.5 h-2.5 mr-0.5 text-gray-400" /> {ord.time}</p>
                            </div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold ${
                              ord.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                              ord.status === 'Ongoing' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {ord.status}
                            </span>
                            <div className="flex items-center space-x-1 justify-end pt-0.5">
                              {ord.status === 'Ongoing' && (
                                <button onClick={() => trackHistoryOrder(ord)} className="flex items-center space-x-1 px-2 py-1 bg-blue-500/15 text-blue-400 text-[8px] font-bold rounded-md cursor-pointer hover:bg-blue-500/25">
                                  <Truck className="w-2.5 h-2.5" /><span>Track</span>
                                </button>
                              )}
                              {ord.status === 'Completed' && (
                                <button onClick={() => simReorder(ord)} className="flex items-center space-x-1 px-2 py-1 bg-orange-500/15 text-orange-400 text-[8px] font-bold rounded-md cursor-pointer hover:bg-orange-500/25">
                                  <RotateCcw className="w-2.5 h-2.5" /><span>Reorder</span>
                                </button>
                              )}
                              <button onClick={() => { setCustReportOrder(ord.id); setCustReportReason('Wrong item received'); setCustReportDesc(''); setCustReportOpen(true); }} className="flex items-center space-x-1 px-2 py-1 bg-red-500/15 text-red-400 text-[8px] font-bold rounded-md cursor-pointer hover:bg-red-500/25">
                                <AlertCircle className="w-2.5 h-2.5" /><span>Report</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}

                  </div>

                  {/* Customer Bottom Tab Navigation */}
                  <div className="bg-[#0b1320] border-t border-white/5 px-4 py-2 flex items-center justify-around text-center text-[9px] font-bold text-gray-400">
                    <button onClick={() => { setCustomerScreen('store'); setCustView('stores'); }} className="flex flex-col items-center hover:text-orange-400 transition-colors">
                      <Home className="w-4 h-4" />
                      <span>Home</span>
                    </button>
                    <button onClick={() => { setCustView('stores'); }} className="flex flex-col items-center hover:text-orange-400 transition-colors">
                      <Search className="w-4 h-4" />
                      <span>Explore</span>
                    </button>
                    <button onClick={() => setCustView(simCartCount ? 'cart' : 'stores')} className="relative flex flex-col items-center hover:text-orange-400 transition-colors">
                      <span className="relative">
                        <ShoppingCart className="w-4 h-4" />
                        {simCartCount > 0 && <span className="absolute -top-1.5 -right-2 min-w-3 h-3 px-0.5 bg-orange-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">{simCartCount}</span>}
                      </span>
                      <span>Cart</span>
                    </button>
                    <button onClick={() => setCustomerScreen('history')} className="flex flex-col items-center hover:text-orange-400 transition-colors">
                      <Package className="w-4 h-4" />
                      <span>Orders</span>
                    </button>
                    <button onClick={() => setCustomerScreen('profile')} className="flex flex-col items-center hover:text-orange-400 transition-colors">
                      <UserIcon className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CUSTOMER SCREEN 3: STOREFRONT — real store browsing + order placement */}
              {customerScreen === 'store' && (
                <div className="relative flex-1 flex flex-col p-3 fade-in overflow-hidden bg-gradient-to-br from-[#0d1220] via-[#131a2c] to-[#181431]">
                  <div className="pointer-events-none absolute -top-14 -right-14 w-48 h-48 bg-orange-500/20 blur-3xl rounded-full" />
                  <div className="pointer-events-none absolute -bottom-14 -left-14 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full" />
                  <div className="pointer-events-none absolute top-1/3 left-1/4 w-32 h-32 bg-amber-400/10 blur-3xl rounded-full" />
                  {custLoading && (
                    <div className="absolute inset-0 z-30 flex flex-col justify-center items-center p-3 space-y-3 bg-gradient-to-br from-[#0d1220] via-[#131a2c] to-[#181431]">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 animate-pulse" />
                      <div className="w-32 h-2.5 bg-white/10 rounded-full animate-pulse" />
                      <div className="w-40 h-2 bg-white/[0.07] rounded-full animate-pulse" />
                      <div className="w-full space-y-2 mt-2">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-full h-14 bg-white/[0.05] rounded-xl animate-pulse" />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 mb-2">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 cursor-pointer">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xs font-black text-white">N</div>
                        <div className="leading-none">
                          <p className="text-[8px] text-gray-500 flex items-center space-x-0.5">Deliver to <ChevronDown className="w-2.5 h-2.5" /></p>
                          <p className="text-[9px] font-bold text-white leading-tight">{custAddress.split(',')[0]}, Dhanmondi</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button onClick={() => setCustLang(p => p === 'en' ? 'bn' : 'en')} className="w-7 h-7 rounded-full bg-white/[0.07] backdrop-blur-xl border border-white/10 flex items-center justify-center cursor-pointer hover:border-orange-500/40" title="Language">
                          <Globe className="w-3 h-3 text-gray-200" />
                        </button>
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center space-x-0.5 cursor-default">
                          <Award className="w-2.5 h-2.5 text-amber-400" />
                          <span className="text-[8px] font-black text-amber-300">{custPoints}</span>
                        </span>
                        <button onClick={() => setCustNotifOpen(true)} className="relative w-7 h-7 rounded-full bg-white/[0.07] backdrop-blur-xl border border-white/10 flex items-center justify-center cursor-pointer hover:border-orange-500/40">
                          <Bell className="w-3 h-3 text-gray-200" />
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        </button>
                        <button
                          onClick={() => custView === 'cart' ? setCustView('checkout') : setCustView('cart')}
                          className="relative w-7 h-7 rounded-full bg-white/[0.07] backdrop-blur-xl border border-white/10 flex items-center justify-center cursor-pointer hover:border-orange-500/40"
                        >
                          <ShoppingBasket className="w-3.5 h-3.5 text-orange-400" />
                          {simCartCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-orange-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">{simCartCount}</span>
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Greeting + search */}
                    <div>
                      <h4 className="text-xs font-black text-white leading-tight">{custLang === 'bn' ? 'আজ কী অর্ডার' : 'What would you like'}</h4>
                      <p className="text-[9px] text-gray-400">{custLang === 'bn' ? 'করবেন?' : 'to order today?'}</p>
                    </div>
                    <div className="relative flex items-center space-x-2 bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-xl px-2.5 py-2">
                      <Search className="w-3 h-3 text-gray-400" />
                      <input
                        value={custSearch}
                        onChange={e => setCustSearch(e.target.value)}
                        onFocus={() => setCustSearchFocused(true)}
                        onBlur={() => setTimeout(() => setCustSearchFocused(false), 150)}
                        onKeyDown={e => { if (e.key === 'Enter' && custSearch.trim()) { setCustRecentSearches(prev => [custSearch.trim(), ...prev.filter(x => x !== custSearch.trim())].slice(0, 5)); setCustSearchFocused(false); } }}
                        placeholder={T.search}
                        className="flex-1 bg-transparent text-[9px] text-white outline-none placeholder:text-gray-500"
                      />
                      {custSearch.trim() && (
                        <button onClick={() => setCustSearch('')} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                      )}
                      {/* Suggestions */}
                      {custSearchFocused && (custSearch.trim() ? simSearchSuggestions : custRecentSearches).length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-[#101a2c] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                          {(custSearch.trim() ? simSearchSuggestions : custRecentSearches).map((s, i) => (
                            <button key={i} onMouseDown={() => { setCustSearch(s); setCustRecentSearches(prev => [s, ...prev.filter(x => x !== s)].slice(0, 5)); setCustSearchFocused(false); }} className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-left hover:bg-white/5 cursor-pointer">
                              <History className="w-3 h-3 text-gray-500" />
                              <span className="text-[9px] text-gray-200">{s}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {custView === 'stores' && (
                      <>
                        {/* Promo carousel */}
                        <div className="flex space-x-2 overflow-x-auto pb-0.5">
                          <button onClick={() => { setCustStoreCat('All'); if (showToast) custShowToast('Free delivery applies automatically on orders over Tk 500', 'success'); }} className="w-56 shrink-0 bg-gradient-to-r from-orange-500 to-amber-500 p-3 rounded-2xl shadow-lg text-left cursor-pointer hover:brightness-110 transition-all">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-[7.5px] text-orange-100 font-bold uppercase tracking-wider">Offer</p>
                                <p className="text-[10px] font-black text-white leading-tight">Free Delivery<br />Over Tk 500</p>
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-white/20 text-white text-[7.5px] font-bold rounded-md">Order Now →</span>
                              </div>
                              <Truck className="w-6 h-6 text-white/40" />
                            </div>
                          </button>
                          <button onClick={() => { if (showToast) custShowToast('10% cashback on every bKash payment', 'success'); }} className="w-56 shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-2xl shadow-lg text-left cursor-pointer hover:brightness-110 transition-all">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-[7.5px] text-amber-100 font-bold uppercase tracking-wider">Cashback</p>
                                <p className="text-[10px] font-black text-white leading-tight">10% bKash<br />Cashback</p>
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-white/20 text-white text-[7.5px] font-bold rounded-md">Get Deal →</span>
                              </div>
                              <Wallet className="w-6 h-6 text-white/40" />
                            </div>
                          </button>
                          <button onClick={() => { setCustStoreCat('All'); if (showToast) custShowToast('Tk 40 OFF on your first order — automatically applied', 'success'); }} className="w-56 shrink-0 bg-white/[0.06] backdrop-blur-xl border border-orange-500/40 p-3 rounded-2xl text-left cursor-pointer hover:border-orange-500 transition-all">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-[7.5px] text-orange-400 font-bold uppercase tracking-wider">New User</p>
                                <p className="text-[10px] font-black text-white leading-tight">Tk 40 OFF<br />First Order</p>
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-500 text-white text-[7.5px] font-bold rounded-md">Claim →</span>
                              </div>
                              <BadgePercent className="w-6 h-6 text-orange-400/50" />
                            </div>
                          </button>
                        </div>

                        {/* Categories */}
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Browse Categories</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'All', icon: <Tag className="w-3.5 h-3.5" />, label: 'All' },
                            { id: 'Grocery', icon: <ShoppingBasket className="w-3.5 h-3.5" />, label: 'Grocery' },
                            { id: 'Fruits & Veg', icon: <Apple className="w-3.5 h-3.5" />, label: 'Fruits' },
                            { id: 'Department Store', icon: <Building2 className="w-3.5 h-3.5" />, label: 'Dept' },
                            { id: 'Pharmacy', icon: <Pill className="w-3.5 h-3.5" />, label: 'Pharmacy' },
                            { id: 'Bakery', icon: <Utensils className="w-3.5 h-3.5" />, label: 'Bakery' },
                            { id: 'Electronics', icon: <Smartphone className="w-3.5 h-3.5" />, label: 'Electro' },
                          ].map((c, i) => (
                            <button
                              key={i}
                              onClick={() => setCustStoreCat(c.id)}
                              className={`flex flex-col items-center space-y-1 px-1 py-1.5 rounded-xl cursor-pointer transition-all ${custStoreCat === c.id ? 'bg-orange-500 text-white shadow' : 'bg-white/[0.05] backdrop-blur-xl border border-white/10 text-gray-300 hover:border-orange-500/40'}`}
                            >
                              <span className="text-orange-400 flex items-center justify-center w-5 h-5 rounded-md bg-orange-500/10">{c.icon}</span>
                              <span className="text-[7.5px] font-bold">{c.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Trust strip */}
                        <div className="flex items-center justify-around bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl py-1.5 px-1">
                          {[[<Zap className="w-2.5 h-2.5 text-orange-400" />, '30 min delivery'], [<Banknote className="w-2.5 h-2.5 text-emerald-400" />, 'Cash on Delivery'], [<MapPin className="w-2.5 h-2.5 text-blue-400" />, 'Live tracking']].map(([ic, lbl], i) => (
                            <span key={i} className="flex items-center space-x-1 text-[7.5px] text-gray-300">{ic}<b>{lbl as string}</b></span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{custStoreCat === 'All' ? T.stores : custStoreCat}</p>
                          <div className="flex items-center space-x-1">
                            <SortIcon className="w-2.5 h-2.5 text-gray-500" />
                            <select value={custSort} onChange={e => setCustSort(e.target.value as any)} className="bg-transparent text-[8px] text-orange-400 font-bold outline-none cursor-pointer">
                              <option value="rating" className="bg-[#101a2c]">★ Top Rated</option>
                              <option value="time" className="bg-[#101a2c]">⚡ Fastest</option>
                              <option value="fee" className="bg-[#101a2c]">💰 Lowest Fee</option>
                            </select>
                          </div>
                        </div>
                        {simFilteredStores.length === 0 && (
                          <div className="text-center py-10 space-y-2">
                            <div className="text-3xl">🔍</div>
                            <p className="text-[10px] text-gray-300 font-bold">No stores found</p>
                            <p className="text-[8px] text-gray-500">Try a different search or category</p>
                            <button onClick={() => { setCustSearch(''); setCustStoreCat('All'); }} className="mx-auto px-3 py-1.5 bg-orange-500 text-white text-[8px] font-bold rounded-lg cursor-pointer">Clear Filters</button>
                          </div>
                        )}
                        {simFilteredStores.map(st => {
                          const badges: Array<{ ic: string; label: string; cls: string }> = [];
                          if ((st.rating ?? 0) >= 4.7) badges.push({ ic: '🔥', label: 'Top Rated', cls: 'bg-amber-500/15 text-amber-400' });
                          badges.push({ ic: '✅', label: 'Verified', cls: 'bg-blue-500/15 text-blue-400' });
                          if ((st.offer || '').toLowerCase().includes('cashback')) badges.push({ ic: '💳', label: 'Cashback', cls: 'bg-emerald-500/15 text-emerald-400' });
                          return (
                          <button
                            key={st.id}
                            onClick={() => { setCustStoreId(st.id); setCustView('store'); setCustCat('All'); setCustSearch(''); }}
                            className="w-full bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl px-2 py-2 text-left cursor-pointer hover:border-orange-500/50 hover:bg-white/[0.09] transition-all"
                          >
                            <div className="flex items-center space-x-2.5">
                              {/* Store thumb */}
                              {st.image ? (
                                <img src={st.image} alt={st.name} referrerPolicy="no-referrer" loading="lazy" className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0" />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-orange-500/30 to-amber-500/10 flex items-center justify-center text-lg shrink-0">🛍️</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-[10px] font-bold text-white truncate">{st.name}</h5>
                                  <span className="flex items-center space-x-0.5 text-amber-400 font-bold shrink-0"><Star className="w-2.5 h-2.5 fill-current" /><span className="text-[8px]">{st.rating}</span></span>
                                </div>
                                <div className="flex items-center space-x-1 mt-0.5 overflow-hidden">
                                  {badges.slice(0, 2).map((b, i) => (
                                    <span key={i} className={`px-1 py-0.5 text-[6.5px] font-bold rounded-md whitespace-nowrap ${b.cls}`}>{b.ic} {b.label}</span>
                                  ))}
                                </div>
                                {st.description && <p className="text-[8px] text-emerald-300/80 truncate">{st.description}</p>}
                                <div className="flex items-center justify-between mt-0.5">
                                  <div className="flex items-center space-x-1.5 text-[8px] text-gray-400">
                                    <span className="flex items-center space-x-0.5"><Clock className="w-2.5 h-2.5" /><span>25 min</span></span>
                                    <span>·</span>
                                    <span>Fee <b className="text-gray-200">Tk {st.deliveryFee ?? 60}</b></span>
                                  </div>
                                  {st.offer ? (
                                    <span className="px-1 py-0.5 bg-emerald-500/15 text-emerald-400 text-[7.5px] font-bold rounded-md truncate max-w-[90px]">{st.offer}</span>
                                  ) : (
                                    <span className={`px-1 py-0.5 text-[7.5px] font-bold rounded-md ${st.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-600/30 text-gray-400'}`}>{st.status}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                          );
                        })}
                      </>
                    )}

                    {custView === 'store' && custSelectedStore && (
                      <>
                        {/* Store hero */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10">
                          <button onClick={() => setCustView('stores')} className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full bg-black/50 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-black/70">
                            <ArrowLeft className="w-3 h-3 text-white" />
                          </button>
                          <div className="h-24 relative">
                            {custSelectedStore.image ? (
                              <img src={custSelectedStore.image} alt={custSelectedStore.name} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-orange-500/50 via-amber-500/25 to-[#111c2e]" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1320] via-transparent to-transparent"></div>
                            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
                              <div>
                                <p className="text-[11px] font-black text-white drop-shadow">{custSelectedStore.name}</p>
                                <p className="text-[8px] text-gray-200 flex items-center space-x-1"><MapPin className="w-2.5 h-2.5" /><span>{custSelectedStore.address}</span></p>
                              </div>
                              <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[7.5px] font-black rounded-md shadow">● Open</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.06] backdrop-blur-xl border-t border-white/5">
                            <span className="text-[8px] text-gray-300 flex items-center space-x-1"><Star className="w-2.5 h-2.5 text-amber-400 fill-current" /><b className="text-amber-400">{custSelectedStore.rating}</b><span>(120+ ratings)</span></span>
                            <span className="text-[8px] text-gray-300 flex items-center space-x-1"><Clock className="w-2.5 h-2.5 text-orange-400" /><b>25 min</b></span>
                            <span className="text-[8px] text-gray-300 flex items-center space-x-1"><Utensils className="w-2.5 h-2.5 text-orange-400" /><b>{custSelectedStore.category || 'Grocery'}</b></span>
                          </div>
                        </div>

                        {/* Offers */}
                        <div className="flex space-x-2 overflow-x-auto pb-0.5">
                          <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1.5 whitespace-nowrap">
                            <BadgePercent className="w-3 h-3 text-emerald-400" />
                            <p className="text-[8px] text-emerald-300 font-bold">10% OFF on first order</p>
                          </div>
                          <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1.5 whitespace-nowrap">
                            <Gift className="w-3 h-3 text-emerald-400" />
                            <p className="text-[8px] text-emerald-300 font-bold">Free delivery over Tk 500</p>
                          </div>
                        </div>

                        {/* Search */}
                        <div className="flex items-center space-x-2 bg-[#111c2e] border border-white/10 rounded-xl px-2.5 py-1.5">
                          <Search className="w-3 h-3 text-gray-500" />
                          <input
                            value={custSearch}
                            onChange={e => setCustSearch(e.target.value)}
                            placeholder="Search in this store…"
                            className="flex-1 bg-transparent text-[9px] text-white outline-none placeholder:text-gray-500"
                          />
                        </div>

                        {/* Category chips — sticky */}
                        <div className="sticky top-0 z-10 bg-[#0d1220]/80 backdrop-blur-xl pb-1 pt-0.5 -mx-3 px-3">
                          <div className="flex space-x-1.5 overflow-x-auto">
                            {['All', ...Array.from(new Set(simProducts.map(p => p.category || 'Other')))].map(cat => (
                              <button
                                key={cat}
                                onClick={() => setCustCat(cat)}
                                className={`px-2.5 py-1 rounded-full text-[8px] font-bold whitespace-nowrap cursor-pointer transition-all ${custCat === cat ? 'bg-orange-500 text-white shadow' : 'bg-white/[0.05] border border-white/10 text-gray-400'}`}
                              >{cat}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{T.product}</p>
                          <p className="text-[8px] text-gray-500">{simFilteredProducts.length} items</p>
                        </div>

                        {/* Product grid */}
                        {simFilteredProducts.length === 0 ? (
                          <div className="text-center py-8 space-y-1">
                            <div className="text-3xl">🛒</div>
                            <p className="text-[10px] text-gray-300 font-bold">No products found</p>
                            <p className="text-[8px] text-gray-500">Try a different search or category</p>
                            <button onClick={() => { setCustSearch(''); setCustCat('All'); }} className="mx-auto px-3 py-1.5 bg-orange-500 text-white text-[8px] font-bold rounded-lg cursor-pointer">Clear Filters</button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {simFilteredProducts.map(p => (
                              <div key={p.id} onClick={() => { setCustDetailProduct(p); setCustDetailQty(Math.max(1, simCartCountById[p.id] || 1)); }} className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all cursor-pointer">
                                <div className="relative h-16">
                                  {p.image ? (
                                    <img src={p.image} alt={p.name} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-[#14203a] flex items-center justify-center text-xl">🍱</div>
                                  )}
                                  {p.stock === 0 && (
                                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600 text-white text-[7px] font-black rounded">Sold Out</span>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); simAddToCart(p); }}
                                    disabled={p.stock === 0}
                                    className={`absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full text-white text-sm font-black flex items-center justify-center shadow-lg cursor-pointer ${p.stock === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}
                                  >+</button>
                                </div>
                                <div className="p-2">
                                  <p className="text-[9px] font-bold text-white leading-tight line-clamp-1">{p.name}</p>
                                  <p className="text-[8px] text-gray-400">{p.category || 'Grocery'}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] font-black text-orange-400">Tk {p.price}</span>
                                    {simCartCountById[p.id] > 0 && (
                                      <span className="px-1 py-0.5 bg-orange-500/20 text-orange-400 text-[7.5px] font-black rounded-md">×{simCartCountById[p.id]}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => setCustView('cart')}
                          className={`w-full py-2.5 text-white text-[10px] font-black uppercase rounded-xl shadow-lg cursor-pointer transition-all ${simCartCount > 0 ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110' : 'bg-white/[0.06] backdrop-blur-xl border border-white/10 text-gray-500'}`}
                        >
                          View Cart ({simCartCount} items · Tk {simTotalPayable})
                        </button>

                        {/* Ratings & Reviews */}
                        <div className="space-y-2">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{T.ratings}</p>
                          <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl p-2.5">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-black text-white">{custSelectedStore.rating}</span>
                              <div className="flex items-center space-x-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`w-3 h-3 ${s <= Math.round(custSelectedStore.rating) ? 'text-amber-400 fill-current' : 'text-gray-600'}`} />
                                ))}
                              </div>
                              <span className="text-[8px] text-gray-400">120+ ratings</span>
                            </div>
                            <div className="space-y-1 mt-2">
                              {[5, 4, 3, 2, 1].map(r => {
                                const pct = r === 5 ? 68 : r === 4 ? 22 : r === 3 ? 7 : r === 2 ? 2 : 1;
                                return (
                                  <div key={r} className="flex items-center space-x-1.5 text-[7.5px] text-gray-400">
                                    <span className="w-3">{r}</span><Star className="w-2 h-2 text-amber-400 fill-current" />
                                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                                    <span className="w-6 text-right">{pct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {simReviews.map((rv, i) => (
                              <div key={i} className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-2">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center space-x-1.5">
                                    <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-[8px] font-black text-orange-300">{rv.name[0]}</span>
                                    <span className="text-[8px] font-bold text-white">{rv.name}</span>
                                  </span>
                                  <span className="text-[7px] text-gray-500">{rv.time}</span>
                                </div>
                                <div className="flex items-center space-x-0.5 mt-1">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`w-2 h-2 ${s <= rv.rating ? 'text-amber-400 fill-current' : 'text-gray-600'}`} />
                                  ))}
                                </div>
                                <p className="text-[8px] text-gray-300 mt-1">{rv.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {custView === 'cart' && (
                      <>
                        <button onClick={() => setCustView('store')} className="flex items-center space-x-1 text-[9px] text-gray-400 cursor-pointer">
                          <ArrowLeft className="w-3 h-3" /><span>Add more items</span>
                        </button>
                        {custCart.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-[10px]">Your cart is empty</div>
                        ) : custCart.map(it => (
                          <div key={it.productId} className="bg-white/[0.06] backdrop-blur-xl border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-bold text-white">{it.name}</p>
                              <p className="text-[8px] text-orange-400">Tk {it.price} × {it.qty}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button onClick={() => simChangeQty(it.productId, -1)} className="w-5 h-5 rounded bg-white/5 border border-white/10 text-white text-xs cursor-pointer">−</button>
                              <span className="text-[10px] font-bold text-white w-4 text-center">{it.qty}</span>
                              <button onClick={() => simChangeQty(it.productId, 1)} className="w-5 h-5 rounded bg-orange-500 text-white text-xs cursor-pointer">+</button>
                            </div>
                          </div>
                        ))}
                        {custCart.length > 0 && (
                          <>
                            {/* Estimated delivery countdown */}
                            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                              <span className="flex items-center space-x-1.5 text-[8px] text-gray-300"><Timer className="w-3 h-3 text-orange-400" /><b>Estimated delivery</b></span>
                              <span className="text-[8px] text-orange-400 font-black">25:00 min</span>
                            </div>
                            {/* Coupon */}
                            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center space-x-1 text-[8px] text-gray-300 font-bold"><Ticket className="w-3 h-3 text-orange-400" /> {T.coupons}</span>
                                {custAppliedCoupon && (
                                  <button onClick={() => { setCustAppliedCoupon(null); setCustCoupon(''); }} className="text-[8px] text-red-400 font-bold cursor-pointer">Remove</button>
                                )}
                              </div>
                              {custAppliedCoupon ? (
                                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1">
                                  <span className="text-[8px] text-emerald-300 font-bold">{custAppliedCoupon}</span>
                                  <span className="text-[8px] text-emerald-400 font-black">− Tk {simCouponDiscount}{simFreeByCoupon ? ' · FREE delivery' : ''}</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5">
                                  <input value={custCoupon} onChange={e => setCustCoupon(e.target.value.toUpperCase())} placeholder="Enter coupon code" className="flex-1 bg-[#070e17] border border-white/10 rounded-lg px-2 py-1.5 text-[8px] text-white outline-none focus:border-orange-500 placeholder:text-gray-600" />
                                  <button onClick={() => applySimCoupon(custCoupon)} className="px-2.5 py-1.5 bg-orange-500 text-white text-[8px] font-black rounded-lg cursor-pointer">Apply</button>
                                </div>
                              )}
                              <div className="flex space-x-1 overflow-x-auto">
                                {simCoupons.map(c => (
                                  <button key={c.code} onClick={() => applySimCoupon(c.code)} className="px-1.5 py-0.5 bg-white/[0.05] border border-white/10 rounded-md text-[7.5px] text-gray-300 whitespace-nowrap cursor-pointer">{c.code}</button>
                                ))}
                              </div>
                            </div>
                            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 p-3 rounded-2xl space-y-1 text-[9px] text-gray-300">
                              <div className="flex justify-between"><span>Subtotal</span><span className="text-white font-bold">Tk {simCartTotal}</span></div>
                              {simDiscount > 0 && (
                                <div className="flex justify-between"><span className="text-emerald-400">🏷 {custSelectedStore?.offer}</span><span className="text-emerald-400 font-bold">− Tk {simDiscount}</span></div>
                              )}
                              {simCouponDiscount > 0 && (
                                <div className="flex justify-between"><span className="text-emerald-400">🎟 {custAppliedCoupon}</span><span className="text-emerald-400 font-bold">− Tk {simCouponDiscount}</span></div>
                              )}
                              <div className="flex justify-between"><span>{T.deliveryFee}</span><span className={`text-white font-bold ${simDeliveryFee === 0 ? 'text-emerald-400' : ''}`}>{simDeliveryFee === 0 ? 'FREE' : `Tk ${simDeliveryFee}`}</span></div>
                              <div className="border-t border-white/10 pt-1.5 flex justify-between text-[11px] font-bold text-white"><span>{T.totalPayable}</span><span className="text-orange-400">Tk {simTotalPayable}</span></div>
                            </div>
                            <button onClick={() => setCustView('checkout')} className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg cursor-pointer">
                              Proceed to Checkout · Tk {simTotalPayable}
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {custView === 'checkout' && (
                      <>
                        <button onClick={() => setCustView('cart')} className="flex items-center space-x-1 text-[9px] text-gray-400 cursor-pointer">
                          <ArrowLeft className="w-3 h-3" /><span>Back to cart</span>
                        </button>
                        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 p-3 rounded-2xl space-y-2">
                          <label className="block text-[8px] text-gray-400 font-bold uppercase flex items-center space-x-1"><MapPinned className="w-3 h-3 text-orange-400" /><span>Delivery Address</span></label>
                          <div className="flex space-x-1.5 overflow-x-auto">
                            {custSavedAddresses.map(a => (
                              <button key={a.id} onClick={() => setCustAddress(a.value)} className={`px-2 py-1.5 rounded-lg text-[8px] font-bold whitespace-nowrap cursor-pointer border ${custAddress === a.value ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-white/[0.05] border-white/10 text-gray-300'}`}>
                                <span className="block text-[7px] text-gray-400">{a.label}</span>{a.value.split(',')[0]}
                              </button>
                            ))}
                          </div>
                          <input value={custAddress} onChange={e => setCustAddress(e.target.value)} className="w-full bg-[#070e17] border border-white/10 rounded-lg p-2 text-[9px] text-white outline-none focus:border-orange-500" />
                          <div className="flex space-x-1.5">
                            <button onClick={() => { setCustGpsLoading(true); setTimeout(() => { setCustGpsLoading(false); const pt = { lat: 23.8103, lng: 90.4125 }; setCustPickCoords(pt); setCustAddress('23.8103°N, 90.4125°E — Badda, Dhaka 1212 (GPS)'); setCustPickedAddress('Current location · Badda, Dhaka'); if (showToast) custShowToast('GPS location found ✓', 'success'); }, 1400); }} className={`flex items-center justify-center space-x-1 flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[8px] text-emerald-300 font-bold cursor-pointer ${custGpsLoading ? 'opacity-60' : ''}`}>
                              {custGpsLoading ? <><span className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin"></span><span>Detecting location…</span></> : <><Navigation className="w-3 h-3" /><span>Current Location (GPS)</span></>}
                            </button>
                            <button onClick={() => setCustMapOpen(true)} className="flex items-center justify-center space-x-1 flex-1 py-1.5 bg-white/[0.05] border border-white/10 rounded-lg text-[8px] text-blue-400 font-bold cursor-pointer">
                              <MapIcon className="w-3 h-3" /><span>Pick on map</span>
                            </button>
                          </div>
                          {custPickedAddress && <p className="text-[8px] text-emerald-400">✓ {custPickedAddress}</p>}
                          <label className="block text-[8px] text-gray-400 font-bold uppercase">Phone</label>
                          <input value={custPhone} onChange={e => setCustPhone(e.target.value)} className="w-full bg-[#070e17] border border-white/10 rounded-lg p-2 text-[9px] text-white outline-none focus:border-orange-500" />
                          <label className="block text-[8px] text-gray-400 font-bold uppercase">Payment Method</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'Cash on Delivery', short: 'COD', cls: 'border-emerald-500/50 text-emerald-300' },
                              { id: 'NexaGo Wallet', short: '👛 Wallet', cls: 'border-amber-500/50 text-amber-300' },
                              { id: 'bKash', short: 'bKash', cls: 'border-pink-500/50 text-pink-300' },
                              { id: 'Nagad', short: 'Nagad', cls: 'border-orange-500/50 text-orange-300' },
                              { id: 'Card', short: '💳 Card', cls: 'border-blue-500/50 text-blue-300' },
                            ].map(pm => (
                              <button key={pm.id} onClick={() => setCustPay(pm.id)} className={`flex items-center justify-center space-x-1 px-2 py-2 rounded-lg text-[8px] font-black cursor-pointer border ${custPay === pm.id ? `bg-white/[0.08] ${pm.cls}` : 'bg-white/[0.03] border-white/10 text-gray-500'}`}>
                                <span>{pm.short}</span>
                              </button>
                            ))}
                          </div>

                          {/* Wallet line under payment methods */}
                          <button onClick={() => setCustPay('NexaGo Wallet')} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer border-l-2 transition-all ${custPay === 'NexaGo Wallet' ? 'border-amber-500 bg-amber-500/10' : 'border-transparent bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                            <span className="flex items-center space-x-2">
                              <Wallet className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-[9px] font-bold text-white">NexaGo Wallet</span>
                              <span className="text-[8px] text-gray-400">Tk {custWallet}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${custPay === 'NexaGo Wallet' ? 'bg-amber-500 text-white' : 'bg-amber-500/15 text-amber-400'}`}>{custPay === 'NexaGo Wallet' ? 'Selected' : 'Use'}</span>
                          </button>

                          {/* COD line under payment methods */}
                          <button onClick={() => setCustPay('Cash on Delivery')} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer border-l-2 transition-all ${custPay === 'Cash on Delivery' ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                            <span className="flex items-center space-x-2">
                              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[9px] font-bold text-white">Cash on Delivery</span>
                              <span className="text-[8px] text-gray-400">Pay cash on arrival</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${custPay === 'Cash on Delivery' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/15 text-emerald-400'}`}>{custPay === 'Cash on Delivery' ? 'Selected' : 'Use'}</span>
                          </button>

                          {custPay === 'Cash on Delivery' && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">💵</span>
                                <div>
                                  <p className="text-[8px] font-bold text-emerald-300">Pay when your order arrives</p>
                                  <p className="text-[7px] text-gray-400">Hand over Tk {simTotalPayable} in cash to the rider</p>
                                </div>
                              </div>
                              <span className="text-[9px] font-black text-emerald-300">Tk {simTotalPayable}</span>
                            </div>
                          )}

                          {/* Wallet / Card / Mobile wallet dynamic fields */}
                          {custPay === 'NexaGo Wallet' && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between">
                              <div>
                                <p className="text-[8px] font-bold text-amber-300">NexaGo Wallet balance</p>
                                <p className="text-sm font-black text-white">Tk {custWallet}</p>
                              </div>
                              <div className="text-right space-y-1">
                                <button onClick={() => setCustTopUpOpen(true)} className="block px-2 py-1 bg-amber-500 text-white text-[8px] font-black rounded-lg cursor-pointer">+ Top up</button>
                                <p className="text-[7px] text-gray-400">{custWallet >= simTotalPayable ? '✓ Sufficient balance' : 'Insufficient balance'}</p>
                              </div>
                            </div>
                          )}
                          {custPay === 'Card' ? (
                            <div className="space-y-1.5">
                              <input value={custCardNum} onChange={e => setCustCardNum(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())} placeholder="Card number · 4242 4242 4242 4242" className="w-full bg-[#070e17] border border-white/10 rounded-lg p-2 text-[9px] text-white outline-none focus:border-blue-500 placeholder:text-gray-600" />
                              <div className="flex space-x-1.5">
                                <input value={custCardExp} onChange={e => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); setCustCardExp(v); }} placeholder="MM/YY" className="w-24 bg-[#070e17] border border-white/10 rounded-lg p-2 text-[9px] text-white outline-none focus:border-blue-500 placeholder:text-gray-600" />
                                <div className="relative flex-1">
                                  <input type="password" value={custCvv} onChange={e => setCustCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="CVV · 3 digits on card back" className="w-full bg-[#070e17] border border-white/10 rounded-lg p-2 text-[9px] text-white outline-none focus:border-blue-500 placeholder:text-gray-600" />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] text-gray-500">CVV</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2 flex items-center justify-between cursor-pointer" onClick={() => setCustPay('Card')}>
                              <span className="flex items-center space-x-2">
                                <span className="text-[9px] font-bold text-white">💳 Card payment</span>
                                <span className="text-[7px] text-gray-500">Visa · Master · Debit</span>
                              </span>
                              <span className="text-[8px] text-blue-400 font-black">Enter card + CVV →</span>
                            </div>
                          )}
                          {(custPay === 'bKash' || custPay === 'Nagad') && (
                            <div className="flex items-center space-x-1.5">
                              <input type="password" value={custBkashPin} onChange={e => setCustBkashPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Enter 4-digit wallet PIN" className="flex-1 bg-[#070e17] border border-white/10 rounded-lg p-2 text-[9px] text-white outline-none focus:border-pink-500 placeholder:text-gray-600" />
                              <button onClick={() => { if (showToast) custShowToast(`Payment request sent to your ${custPay}`, 'info'); }} className="px-2 py-2 bg-white/[0.05] border border-white/10 text-gray-400 text-[8px] font-bold rounded-lg cursor-pointer">Request</button>
                            </div>
                          )}
                          <div className="border-t border-white/10 pt-2 space-y-1 text-[9px]">
                            {simDiscount > 0 && <div className="flex justify-between text-emerald-400"><span>Offer applied</span><span>− Tk {simDiscount}</span></div>}
                            {simCouponDiscount > 0 && <div className="flex justify-between text-emerald-400"><span>Coupon {custAppliedCoupon}</span><span>− Tk {simCouponDiscount}</span></div>}
                            <div className="flex justify-between text-[11px] font-bold text-white"><span>Total</span><span className="text-orange-400">Tk {simTotalPayable}</span></div>
                          </div>
                        </div>
                        <button onClick={() => {
                          if (!custAddress.trim() || custPhone.trim().length < 6) { if (showToast) custShowToast('Enter a valid address and phone number first', 'error'); return; }
                          if (custPay === 'Cash on Delivery' || custPay === 'NexaGo Wallet') { handleSimPlaceOrder(); return; }
                          const code = String(Math.floor(100000 + Math.random() * 900000)); setCustOtpCode(code); setCustOtpSent(custPhone); setCustOtpInput(''); setCustTopUpPending(false); setCustOtpOpen(true); if (showToast) custShowToast(`OTP sent to ${custPhone}`, 'info');
                        }} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg cursor-pointer">
                          Place Order · Tk {simTotalPayable}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Sticky floating cart bar */}
                  {simCartCount > 0 && custView !== 'checkout' && (
                    <button
                      onClick={() => setCustView('cart')}
                      className="shrink-0 mt-2 w-full py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg flex items-center justify-between px-3 cursor-pointer hover:brightness-110 transition-all"
                    >
                      <span className="flex items-center space-x-2 text-white">
                        <ShoppingBasket className="w-4 h-4" />
                        <span className="text-[9px] font-bold">{simCartCount} item(s) · Tk {simCartTotal}</span>
                      </span>
                      <span className="text-[9px] font-black uppercase text-white flex items-center space-x-1">{T.viewCart}<ArrowRight className="w-3 h-3" /></span>
                    </button>
                  )}

                  {/* Bottom nav */}
                  <div className="mt-2 shrink-0 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-2 flex items-center justify-around text-center text-[9px] font-bold text-gray-400">
                    <button onClick={() => { setCustView('stores'); }} className={`flex flex-col items-center hover:text-orange-400 transition-colors ${custView === 'stores' ? 'text-orange-400' : ''}`}>
                      <Home className="w-4 h-4" />
                      <span>{T.home}</span>
                    </button>
                    <button onClick={() => { setCustView('stores'); }} className="flex flex-col items-center hover:text-orange-400 transition-colors">
                      <Search className="w-4 h-4" />
                      <span>{T.explore}</span>
                    </button>
                    <button onClick={() => setCustView(simCartCount ? 'cart' : 'stores')} className={`relative flex flex-col items-center hover:text-orange-400 transition-colors ${custView === 'cart' ? 'text-orange-400' : ''}`}>
                      <span className="relative">
                        <ShoppingCart className="w-4 h-4" />
                        {simCartCount > 0 && <span className="absolute -top-1.5 -right-2 min-w-3 h-3 px-0.5 bg-orange-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">{simCartCount}</span>}
                      </span>
                      <span>{T.cart}</span>
                    </button>
                    <button onClick={() => setCustomerScreen('history')} className="flex flex-col items-center hover:text-orange-400 transition-colors">
                      <Package className="w-4 h-4" />
                      <span>{T.orders}</span>
                    </button>
                    <button onClick={() => setCustomerScreen('profile')} className="flex flex-col items-center hover:text-orange-400 transition-colors">
                      <UserIcon className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                  </div>

                  {/* Product detail modal */}
                  {custDetailProduct && (
                    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end">
                      <div className="w-full bg-[#0e1626] border-t border-white/10 rounded-t-3xl overflow-hidden animate-[slideUp_0.25s_ease-out]">
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2"></div>
                        <div className="p-3 space-y-2">
                          <div className="relative h-32 rounded-xl overflow-hidden">
                            {custDetailProduct.image ? (
                              <img src={custDetailProduct.image} alt={custDetailProduct.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-orange-500/30 to-[#14203a] flex items-center justify-center text-4xl">🍱</div>
                            )}
                            <button onClick={() => setCustDetailProduct(null)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                            {custDetailProduct.stock === 0 && <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600 text-white text-[7px] font-black rounded">Sold Out</span>}
                          </div>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[11px] font-black text-white">{custDetailProduct.name}</p>
                              <p className="text-[8px] text-gray-400">{custDetailProduct.category || 'Grocery'} · <span className={custDetailProduct.stock > 0 ? 'text-emerald-400' : 'text-red-400'}>{custDetailProduct.stock > 0 ? `${custDetailProduct.stock} in stock` : 'Out of stock'}</span></p>
                            </div>
                            <span className="text-sm font-black text-orange-400">Tk {custDetailProduct.price}</span>
                          </div>
                          <p className="text-[9px] text-gray-400 leading-relaxed">{custDetailProduct.desc || `Fresh ${custDetailProduct.name.toLowerCase()} — ${custDetailProduct.category || 'premium quality'}, delivered to your door.`}</p>
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center space-x-2.5 bg-white/[0.05] border border-white/10 rounded-xl px-2 py-1.5">
                              <button onClick={() => setCustDetailQty(q => Math.max(1, q - 1))} className="w-5 h-5 rounded bg-white/5 text-white text-xs cursor-pointer"><Minus className="w-3 h-3 mx-auto" /></button>
                              <span className="text-[10px] font-black text-white w-4 text-center">{custDetailQty}</span>
                              <button onClick={() => setCustDetailQty(q => Math.min(custDetailProduct.stock || 99, q + 1))} className="w-5 h-5 rounded bg-orange-500 text-white text-xs cursor-pointer"><Plus className="w-3 h-3 mx-auto" /></button>
                            </div>
                            <button
                              disabled={custDetailProduct.stock === 0}
                              onClick={() => { const p = custDetailProduct; for (let i = 0; i < custDetailQty; i++) simAddToCart(p); setCustDetailProduct(null); if (showToast) custShowToast(`${custDetailQty} × ${p.name} added to cart`, 'success'); }}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase text-white cursor-pointer ${custDetailProduct.stock === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-amber-500'}`}
                            >Add {custDetailQty} × Tk {custDetailProduct.price * custDetailQty}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notifications overlay */}
                  {custNotifOpen && (
                    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end">
                      <div className="w-full bg-[#0e1626] border-t border-white/10 rounded-t-3xl p-3 max-h-[70%] overflow-y-auto space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-black text-white flex items-center space-x-1.5"><Bell className="w-3.5 h-3.5 text-orange-400" /><span>{T.notif}</span></h5>
                          <button onClick={() => setCustNotifOpen(false)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                        </div>
                        {[].map((n: any, i) => (
                          <div key={i} className="bg-white/[0.05] border border-white/10 rounded-xl p-2.5 flex space-x-2">
                            <span className="text-base">{n.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-[9px] font-bold text-white">{n.title}</p>
                                <span className="text-[7px] text-gray-500">{n.time}</span>
                              </div>
                              <p className="text-[8px] text-gray-400 mt-0.5">{n.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Map picker modal */}
                  {custMapOpen && (
                    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm p-3">
                      <div className="w-full h-full bg-[#0e1626] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-2.5 border-b border-white/10">
                          <span className="text-[10px] font-black text-white flex items-center space-x-1.5"><MapIcon className="w-3.5 h-3.5 text-orange-400" /><span>Pick delivery location</span></span>
                          <button onClick={() => setCustMapOpen(false)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                        </div>
                        <div className="flex-1 relative">
                          <LeafletMap
                            vehicles={[]}
                            zoomTo={13}
                            marker={custMapPt}
                            onMapClick={(lat, lng) => { setCustMapPt({ lat, lng }); setCustPickCoords({ lat, lng }); setCustPickedAddress(`Picked location (${lat.toFixed(4)}, ${lng.toFixed(4)})`); }}
                          />
                          <button onClick={() => { setCustGpsLoading(true); setTimeout(() => { setCustGpsLoading(false); const pt = { lat: 23.7928, lng: 90.4067 }; setCustMapPt(pt); setCustPickCoords(pt); setCustPickedAddress('Current location · Mirpur-10, Dhaka 1216'); if (showToast) custShowToast('GPS current location found ✓', 'success'); }, 1400); }} className="absolute bottom-3 right-3 px-2.5 py-2 bg-emerald-500 text-white text-[8px] font-black rounded-xl flex items-center space-x-1 cursor-pointer shadow-lg z-[1000]">
                            {custGpsLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Crosshair className="w-3 h-3" />}<span>{custGpsLoading ? 'Locating…' : 'My location'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 border-t border-white/10 space-y-1.5">
                          <p className="text-[8px] text-gray-300 truncate">{custPickedAddress || 'Tap anywhere on the map to set your location'}</p>
                          <button
                            onClick={() => { if (custMapPt) { setCustAddress(custPickedAddress); try { localStorage.setItem('nexago_saved_loc', JSON.stringify(custPickCoords)); } catch {} setCustMapOpen(false); if (showToast) custShowToast('Delivery location updated & saved ✓', 'success'); } }}
                            className="w-full py-2 bg-orange-500 text-white text-[9px] font-black rounded-xl cursor-pointer"
                          >Confirm Location</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {customerScreen === 'tracking' && posOrderHiddenFromCustomer && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 fade-in bg-[#070e17]">
                  <div className="w-14 h-14 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No matching order</h4>
                  <p className="text-[10px] text-gray-400 leading-relaxed">This order was placed at the store counter. You can only track an order that matches your registered phone number.</p>
                  <button onClick={() => setCustomerScreen('store')} className="px-4 py-2 bg-[#111c2e] border border-white/10 text-white text-[10px] font-bold rounded-xl cursor-pointer">
                    Back to Home
                  </button>
                </div>
              )}

              {/* CUSTOMER SCREEN 4: DELIVERED */}
              {customerScreen === 'delivered' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 fade-in bg-[#070e17]">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Order Delivered Successfully!</h4>
                  <p className="text-[10px] text-gray-400">Thank you for ordering with The NexaGo BD.</p>
                  <button
                    onClick={() => setCustomerScreen('tracking')}
                    className="px-4 py-2 bg-[#111c2e] border border-white/10 text-white text-[10px] font-bold rounded-xl cursor-pointer"
                  >
                    Back to Tracking
                  </button>
                </div>
              )}

              {/* CUSTOMER SCREEN: PROFILE */}
              {customerScreen === 'profile' && (
                <div className="relative flex-1 flex flex-col fade-in overflow-hidden bg-gradient-to-br from-[#0d1220] via-[#131a2c] to-[#181431]">
                  <div className="pointer-events-none absolute -top-14 -right-14 w-48 h-48 bg-orange-500/20 blur-3xl rounded-full" />
                  <div className="pointer-events-none absolute -bottom-14 -left-14 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full" />

                  {/* Header */}
                  <div className="px-3 py-3 flex items-center justify-between border-b border-white/10">
                    <button onClick={() => { setCustomerScreen('store'); setCustView('stores'); }} className="text-gray-300 hover:text-white p-1 cursor-pointer">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-sm font-bold text-white">{custLang === 'bn' ? 'প্রোফাইল' : 'My Profile'}</h4>
                    <button onClick={() => setCustLang(p => p === 'en' ? 'bn' : 'en')} className="flex items-center space-x-1 text-[9px] text-orange-400 font-bold cursor-pointer">
                      <Globe className="w-3 h-3" /><span>{custLang === 'en' ? 'বাংলা' : 'English'}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* User card */}
                    <button onClick={() => setCustSheet('settings')} className="w-full bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center space-x-3 text-left cursor-pointer hover:bg-white/[0.09] transition-all">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-lg font-black text-white">{custProfileForm.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-white">{custProfileForm.name}</p>
                        <p className="text-[8px] text-gray-400">{custProfileForm.phone}</p>
                        <p className="text-[8px] text-emerald-400 mt-0.5 flex items-center space-x-1"><ShieldCheck className="w-2.5 h-2.5" /><span>Verified customer</span></p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setCustEditProfile(true); }} className="w-7 h-7 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center cursor-pointer"><Settings className="w-3.5 h-3.5 text-gray-300" /></button>
                    </button>

                    {/* Points & wallet */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-3">
                        <p className="text-[8px] text-gray-400 uppercase font-bold">Nexa Points</p>
                        <p className="text-base font-black text-amber-400 mt-1">{custPoints}</p>
                        <p className="text-[7px] text-gray-500">= Tk {custPoints / 10} cashback</p>
                      </div>
                      <button onClick={() => { setCustPay('NexaGo Wallet'); setCustomerScreen('store'); setCustView('checkout'); }} className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-3 text-left cursor-pointer hover:bg-amber-500/15 transition-all">
                        <p className="text-[8px] text-amber-300 uppercase font-bold">Wallet Balance</p>
                        <p className="text-base font-black text-white mt-1">Tk {custWallet}</p>
                        <p className="text-[7px] text-emerald-400">✓ Pay & earn rewards</p>
                      </button>
                      <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-3">
                        <p className="text-[8px] text-gray-400 uppercase font-bold">Orders Placed</p>
                        <p className="text-base font-black text-orange-400 mt-1">{realOrders.length}</p>
                        <p className="text-[7px] text-gray-500">{realOrders.filter(o => o.status === 'Completed').length} completed</p>
                      </div>
                      <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-3">
                        <p className="text-[8px] text-gray-400 uppercase font-bold">Total Saved</p>
                        <p className="text-base font-black text-emerald-400 mt-1">Tk {realOrders.reduce((s, o) => s + ((o as any).discount || 0), 0)}</p>
                        <p className="text-[7px] text-gray-500">offers & coupons</p>
                      </div>
                    </div>

                    {/* Saved addresses */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center space-x-1"><MapPinned className="w-3 h-3 text-orange-400" /><span>Saved Addresses</span></p>
                      {custSavedAddresses.map(a => (
                        <div key={a.id} className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl px-2.5 py-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center text-[9px] font-black text-orange-300">{a.label[0]}</span>
                            <div>
                              <p className="text-[8px] font-bold text-white">{a.label}</p>
                              <p className="text-[7.5px] text-gray-400 truncate max-w-[160px]">{a.value}</p>
                            </div>
                          </div>
                          <button onClick={() => { setCustAddress(a.value); if (showToast) custShowToast(`Delivering to ${a.label}`, 'success'); }} className="px-2 py-1 bg-orange-500/15 text-orange-400 text-[8px] font-bold rounded-md cursor-pointer">Use</button>
                        </div>
                      ))}
                    </div>

                    {/* Settings list */}
                    <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                      {[
                        { icon: <Bell className="w-3.5 h-3.5 text-orange-400" />, label: 'Notifications', fn: () => setCustNotifOpen(true) },
                        { icon: <Wallet className="w-3.5 h-3.5 text-emerald-400" />, label: 'Payment Methods', fn: () => setCustSheet('payments') },
                        { icon: <Headphones className="w-3.5 h-3.5 text-blue-400" />, label: 'Help & Support', fn: () => setCustSheet('help') },
                        { icon: <Shield className="w-3.5 h-3.5 text-amber-400" />, label: 'Terms & Privacy', fn: () => setCustSheet('terms') },
                        { icon: <LogOut className="w-3.5 h-3.5 text-red-400" />, label: 'Log Out', fn: () => setCustLogoutConfirm(true) },
                      ].map((s, i) => (
                        <button key={i} onClick={s.fn} className={`w-full flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-white/5 ${i !== 4 ? 'border-b border-white/5' : ''}`}>
                          <span className="flex items-center space-x-2 text-[9px] font-bold text-gray-200">{s.icon}<span>{s.label}</span></span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      ))}
                    </div>

                    <p className="text-center text-[7px] text-gray-600 pt-1">NexaGo BD · v2.4.1</p>
                  </div>

                  {/* Sheets */}
                  {custSheet && (
                    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end">
                      <div className="w-full bg-[#0e1626] border-t border-white/10 rounded-t-3xl max-h-[78%] flex flex-col">
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2"></div>
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                          <h5 className="text-[11px] font-black text-white">
                            {custSheet === 'payments' ? (custLang === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Methods')
                             : custSheet === 'help' ? (custLang === 'bn' ? 'সাহায্য' : 'Help & Support')
                             : custSheet === 'terms' ? (custLang === 'bn' ? 'শর্তাবলি' : 'Terms & Privacy')
                             : custLang === 'bn' ? 'সেটিংস' : 'Settings'}
                          </h5>
                          <button onClick={() => setCustSheet(null)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">

                          {custSheet === 'payments' && (
                            <>
                              <div className="grid grid-cols-2 gap-1.5">
                                {[['COD', 'Cash on Delivery', 'emerald'], ['bKash', 'Mobile Wallet', 'pink'], ['Nagad', 'Mobile Wallet', 'orange'], ['Card', 'Visa / Master', 'blue']].map(([name, sub, color]) => (
                                  <div key={name} className={`bg-white/[0.05] border border-white/10 rounded-xl p-2.5 border-l-2 ${color === 'emerald' ? 'border-l-emerald-500' : color === 'pink' ? 'border-l-pink-500' : color === 'orange' ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
                                    <p className="text-[9px] font-black text-white">{name}</p>
                                    <p className="text-[7px] text-gray-400">{sub}</p>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-1">Saved Methods</p>
                              {custCards.map(c => (
                                <div key={c.id} className="bg-white/[0.05] border border-white/10 rounded-xl px-2.5 py-2 flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-black ${c.type === 'bKash' ? 'bg-pink-500/20 text-pink-300' : c.type === 'Nagad' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>{c.type === 'Visa' ? '💳' : c.type[0]}</span>
                                    <div>
                                      <p className="text-[8px] font-bold text-white">{c.type} · {c.number}</p>
                                      <p className="text-[7px] text-gray-400">{c.holder}</p>
                                    </div>
                                  </div>
                                  <button onClick={() => { setCustCards(prev => prev.filter(x => x.id !== c.id)); if (showToast) custShowToast(`${c.type} removed`, 'info'); }} className="px-1.5 py-0.5 text-[7.5px] text-red-400 font-bold cursor-pointer">Remove</button>
                                </div>
                              ))}
                              <div className="bg-white/[0.05] border border-white/10 rounded-xl p-2.5 space-y-1.5">
                                <p className="text-[8px] text-gray-300 font-bold">Add new method</p>
                                <select value={custNewCard.type} onChange={e => setCustNewCard({ ...custNewCard, type: e.target.value })} className="w-full bg-[#070e17] border border-white/10 rounded-lg px-2 py-1.5 text-[8px] text-white outline-none">
                                  <option>Card</option><option>bKash</option><option>Nagad</option>
                                </select>
                                <input value={custNewCard.number} onChange={e => setCustNewCard({ ...custNewCard, number: e.target.value })} placeholder={custNewCard.type === 'Card' ? 'Card number (16 digits)' : 'Wallet number'} className="w-full bg-[#070e17] border border-white/10 rounded-lg px-2 py-1.5 text-[8px] text-white outline-none" />
                                <input value={custNewCard.holder} onChange={e => setCustNewCard({ ...custNewCard, holder: e.target.value })} placeholder="Name on card" className="w-full bg-[#070e17] border border-white/10 rounded-lg px-2 py-1.5 text-[8px] text-white outline-none" />
                                <button onClick={() => {
                                  const ok = custNewCard.type === 'Card' ? /^\d{16}$/.test(custNewCard.number) : /^\d{11}$/.test(custNewCard.number.replace(/-/g, ''));
                                  if (!ok || !custNewCard.holder.trim()) { if (showToast) custShowToast('Please enter valid details', 'error'); return; }
                                  setCustCards(prev => [...prev, { id: `C${Date.now()}`, type: custNewCard.type, number: `**** ${custNewCard.number.slice(-4)}`, holder: custNewCard.holder }]);
                                  setCustNewCard({ number: '', holder: '', type: 'Card' });
                                  if (showToast) custShowToast('Payment method added', 'success');
                                }} className="w-full py-2 bg-orange-500 text-white text-[9px] font-black rounded-lg cursor-pointer">Add Method</button>
                              </div>
                            </>
                          )}

                          {custSheet === 'help' && (
                            <>
                              {custFaq.map((f, i) => (
                                <div key={i} className="bg-white/[0.05] border border-white/10 rounded-xl overflow-hidden">
                                  <button onClick={() => setExpandedTerm(prev => prev === `custf${i}` ? null : `custf${i}`)} className="w-full flex items-center justify-between px-2.5 py-2 cursor-pointer">
                                    <span className="text-[9px] font-bold text-gray-200">{f.q}</span>
                                    <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${expandedTerm === `custf${i}` ? 'rotate-180' : ''}`} />
                                  </button>
                                  {expandedTerm === `custf${i}` && <p className="px-2.5 pb-2 text-[8px] text-gray-400 leading-relaxed">{f.a}</p>}
                                </div>
                              ))}
                              <div className="bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-center space-y-1">
                                <p className="text-[8px] text-gray-300 font-bold">Still need help?</p>
                                <p className="text-[7px] text-gray-500">Call us 24/7 at 16247 or chat live</p>
                                <button onClick={() => { setCustSheet(null); setCustNotifOpen(true); if (showToast) custShowToast('Live chat coming soon — call 16247', 'info'); }} className="w-full py-2 bg-orange-500 text-white text-[9px] font-black rounded-lg cursor-pointer">Chat with Support</button>
                              </div>
                            </>
                          )}

                          {custSheet === 'terms' && (
                            <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3 space-y-2">
                              {[
                                ['1. Orders & Delivery', 'Estimated delivery times are approximate. NexaGo is not liable for delays caused by traffic, weather, or force majeure.'],
                                ['2. Payments', 'All online payments are processed securely. Cash on Delivery is available for eligible orders.'],
                                ['3. Cancellations & Refunds', 'Orders may be cancelled while in Confirmed/Preparing. Refunds are issued to the original payment method within 3-5 working days.'],
                                ['4. Privacy', 'We collect only the data needed to deliver your orders and never sell your personal information to third parties.'],
                              ].map(([t, b], i) => (
                                <div key={i}>
                                  <p className="text-[9px] font-black text-orange-400">{t}</p>
                                  <p className="text-[8px] text-gray-400 leading-relaxed mt-0.5">{b}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {custSheet === 'settings' && (
                            <>
                              {/* Account */}
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Account</p>
                              <div className="bg-white/[0.05] border border-white/10 rounded-xl overflow-hidden">
                                <button onClick={() => { setCustEditProfile(true); }} className="w-full flex items-center justify-between px-3 py-2.5 border-b border-white/10 cursor-pointer hover:bg-white/5">
                                  <span className="flex items-center space-x-2 text-[9px] font-bold text-gray-200"><UserIcon className="w-3.5 h-3.5 text-orange-400" /><span>Edit profile</span></span>
                                  <span className="text-[8px] text-gray-500">{custProfileForm.name}</span>
                                </button>
                                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
                                  <span className="flex items-center space-x-2 text-[9px] font-bold text-gray-200"><Wallet className="w-3.5 h-3.5 text-emerald-400" /><span>Nexa Points</span></span>
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-[9px] font-black text-amber-400">{custPoints} pts</span>
                                    <button onClick={() => { if (custPoints >= 100) { setCustPoints(p => p - 100); if (showToast) custShowToast('100 pts → Tk 10 wallet credit', 'success'); } else if (showToast) custShowToast('Minimum 100 pts to redeem', 'error'); }} className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[7.5px] font-bold rounded-md cursor-pointer">Redeem</button>
                                  </div>
                                </div>
                              </div>

                              {/* Notifications */}
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider pt-1">Notifications</p>
                              <div className="bg-white/[0.05] border border-white/10 rounded-xl overflow-hidden">
                                {[
                                  { key: 'order', label: 'Order updates', ic: <Package className="w-3.5 h-3.5 text-orange-400" /> },
                                  { key: 'offers', label: 'Offers & deals', ic: <BadgePercent className="w-3.5 h-3.5 text-emerald-400" /> },
                                  { key: 'sms', label: 'SMS alerts', ic: <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> },
                                ].map((n, i) => (
                                  <div key={n.key} className={`flex items-center justify-between px-3 py-2.5 ${i !== 2 ? 'border-b border-white/10' : ''}`}>
                                    <span className="flex items-center space-x-2 text-[9px] font-bold text-gray-200">{n.ic}<span>{n.label}</span></span>
                                    <button onClick={() => setCustPrefs(p => ({ ...p, [n.key]: !p[n.key as 'order'] }))} className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${custPrefs[n.key as 'order'] ? 'bg-emerald-500' : 'bg-white/10'}`}><span className={`block w-3 h-3 rounded-full bg-white mt-0.5 mx-0.5 transition-transform ${custPrefs[n.key as 'order'] ? 'translate-x-4' : ''}`} /></button>
                                  </div>
                                ))}
                              </div>

                              {/* Security */}
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider pt-1">Security</p>
                              <div className="bg-white/[0.05] border border-white/10 rounded-xl p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center space-x-2 text-[9px] font-bold text-gray-200"><Lock className="w-3.5 h-3.5 text-amber-400" /><span>App PIN</span></span>
                                  <span className="text-[7px] text-gray-500">••••</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <input value={custPinForm} onChange={e => setCustPinForm(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="New 4-digit PIN" type="password" className="flex-1 bg-[#070e17] border border-white/10 rounded-lg px-2 py-1.5 text-[8px] text-white outline-none placeholder:text-gray-600" />
                                  <button onClick={() => { if (custPinForm.length === 4) { if (showToast) custShowToast('PIN updated successfully', 'success'); setCustPinForm(''); } else if (showToast) custShowToast('Enter a valid 4-digit PIN', 'error'); }} className="px-2.5 py-1.5 bg-amber-500 text-white text-[8px] font-black rounded-lg cursor-pointer">Set PIN</button>
                                </div>
                              </div>

                              {/* Preferences */}
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider pt-1">Preferences</p>
                              <div className="bg-white/[0.05] border border-white/10 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
                                  <span className="flex items-center space-x-2 text-[9px] font-bold text-gray-200"><Globe className="w-3.5 h-3.5 text-orange-400" /><span>Language</span></span>
                                  <div className="flex space-x-1">
                                    {(['en', 'bn'] as const).map(l => (
                                      <button key={l} onClick={() => setCustLang(l)} className={`px-2 py-0.5 rounded-md text-[8px] font-bold cursor-pointer ${custLang === l ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400'}`}>{l.toUpperCase()}</button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
                                  <span className="flex items-center space-x-2 text-[9px] font-bold text-gray-200"><MapPin className="w-3.5 h-3.5 text-blue-400" /><span>Location services</span></span>
                                  <button onClick={() => setCustPrefs(p => ({ ...p, location: !p.location }))} className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${custPrefs.location ? 'bg-emerald-500' : 'bg-white/10'}`}><span className={`block w-3 h-3 rounded-full bg-white mt-0.5 mx-0.5 transition-transform ${custPrefs.location ? 'translate-x-4' : ''}`} /></button>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2.5">
                                  <span className="flex items-center space-x-2 text-[9px] font-bold text-gray-200"><Zap className="w-3.5 h-3.5 text-amber-400" /><span>Reduce data usage</span></span>
                                  <button onClick={() => setCustPrefs(p => ({ ...p, reduceData: !p.reduceData }))} className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${custPrefs.reduceData ? 'bg-emerald-500' : 'bg-white/10'}`}><span className={`block w-3 h-3 rounded-full bg-white mt-0.5 mx-0.5 transition-transform ${custPrefs.reduceData ? 'translate-x-4' : ''}`} /></button>
                                </div>
                              </div>

                              {/* App info */}
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider pt-1">About</p>
                              <div className="bg-white/[0.05] border border-white/10 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
                                  <span className="text-[9px] font-bold text-gray-200">Version</span>
                                  <span className="text-[8px] text-gray-400">v2.4.1 (build 241)</span>
                                </div>
                                <button onClick={() => { if (showToast) custShowToast('You are on the latest version ✓', 'success'); }} className="w-full flex items-center justify-between px-3 py-2.5 border-b border-white/10 cursor-pointer hover:bg-white/5">
                                  <span className="text-[9px] font-bold text-gray-200">Check for updates</span>
                                  <ChevronRight className="w-3 h-3 text-gray-600" />
                                </button>
                                <button onClick={() => { setCustCart([]); if (showToast) custShowToast('Cache cleared (2.4 MB)', 'success'); }} className="w-full flex items-center justify-between px-3 py-2.5 border-b border-white/10 cursor-pointer hover:bg-white/5">
                                  <span className="text-[9px] font-bold text-gray-200">Clear cache</span>
                                  <ChevronRight className="w-3 h-3 text-gray-600" />
                                </button>
                                <button onClick={() => { if (showToast) custShowToast('Thanks! Your rating matters ♥', 'success'); }} className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-white/5">
                                  <span className="text-[9px] font-bold text-gray-200">Rate NexaGo</span>
                                  <span className="text-amber-400 text-[8px]">★★★★★</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* CUSTOMER MODALS - rendered at phone root so they always overlay the visible phone */}
            {custLogoutConfirm && (
              <div className="absolute inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="w-full bg-[#0e1626] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center mx-auto"><LogOut className="w-5 h-5 text-red-400" /></div>
                  <p className="text-[11px] font-black text-white text-center">{custLang === 'bn' ? 'লগ আউট করবেন?' : 'Log out of NexaGo?'}</p>
                  <p className="text-[8px] text-gray-400 text-center">You can log back in anytime with your phone number.</p>
                  <div className="flex space-x-2">
                    <button onClick={() => setCustLogoutConfirm(false)} className="flex-1 py-2 bg-white/5 border border-white/10 text-white text-[9px] font-black rounded-xl cursor-pointer">Cancel</button>
                    <button onClick={() => { setCustLogoutConfirm(false); setCustCart([]); setCustAppliedCoupon(null); setCustSheet(null); setCustomerScreen('store'); setCustView('stores'); if (showToast) custShowToast('Logged out — see you soon!', 'info'); }} className="flex-1 py-2 bg-red-500 text-white text-[9px] font-black rounded-xl cursor-pointer">Log Out</button>
                  </div>
                </div>
              </div>
            )}

            {custReportOpen && (
              <div className="absolute inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" style={{ fontFamily: 'inherit' }}>
                <div className="w-full bg-[#0e1626] border border-white/10 rounded-2xl p-3 space-y-2.5">
                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto"></div>
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black text-white flex items-center space-x-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-400" /><span>Report an issue</span></h5>
                    <button onClick={() => setCustReportOpen(false)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                  </div>
                  <div className="bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[8px] text-gray-400">Order</span>
                    <span className="text-[8px] text-white font-mono font-bold">{custReportOrder}</span>
                  </div>
                  <div>
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase mb-1">What went wrong?</p>
                    <div className="space-y-1">
                      {['Wrong item received', 'Missing item', 'Poor food quality', 'Late delivery', 'Damaged packaging', 'Overcharged', 'Other'].map(r => (
                        <button key={r} onClick={() => setCustReportReason(r)} className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[8px] font-bold cursor-pointer border ${custReportReason === r ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-white/[0.03] border-white/10 text-gray-300'}`}>
                          <span>{r}</span>{custReportReason === r && <Check className="w-3 h-3 text-red-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea value={custReportDesc} onChange={e => setCustReportDesc(e.target.value)} placeholder="Add details (optional) — e.g. ordered 2 but got 1…" className="w-full bg-[#070e17] border border-white/10 rounded-lg p-2 text-[8px] text-white outline-none focus:border-red-500 placeholder:text-gray-600 min-h-[44px] resize-none" />
                  <button onClick={() => { if (onReport) onReport({ orderId: custReportOrder || '', reason: custReportReason, note: custReportDesc }); setCustReportOpen(false); if (showToast) custShowToast(`Report submitted for ${custReportOrder} — admin notified ✓`, 'success'); }} className="w-full py-2.5 bg-red-500 text-white text-[9px] font-black uppercase rounded-xl cursor-pointer">
                    Submit Report to Admin
                  </button>
                </div>
              </div>
            )}

            {custEditProfile && (
              <div className="absolute inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-end">
                <div className="w-full bg-[#0e1626] border-t border-white/10 rounded-t-3xl p-3 space-y-2.5">
                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto"></div>
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black text-white">{custLang === 'bn' ? 'প্রোফাইল এডিট' : 'Edit profile'}</h5>
                    <button onClick={() => setCustEditProfile(false)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xl font-black text-white">{custProfileForm.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                    <label className="px-2.5 py-1 bg-white/[0.05] border border-white/10 rounded-lg text-[8px] text-orange-400 font-bold cursor-pointer">Change photo</label>
                  </div>
                  {[['name', 'Full name'], ['phone', 'Phone number'], ['email', 'Email address']].map(([key, label]) => (
                    <div key={key} className="space-y-0.5">
                      <label className="text-[7.5px] text-gray-400 font-bold uppercase">{label}</label>
                    <input
                      value={custProfileForm[key as 'name']}
                      onChange={e => setCustProfileForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-[#070e17] border border-white/10 rounded-lg px-2.5 py-2 text-[9px] text-white outline-none focus:border-orange-500"
                    />
                    </div>
                  ))}
                  <div className="flex space-x-2 pt-1">
                    <button onClick={() => setCustEditProfile(false)} className="flex-1 py-2 bg-white/5 border border-white/10 text-white text-[9px] font-black rounded-xl cursor-pointer">Cancel</button>
                    <button onClick={() => { if (!custProfileForm.name.trim() || custProfileForm.phone.trim().length < 6) { if (showToast) custShowToast('Please fill in valid details', 'error'); return; } setCustEditProfile(false); if (showToast) custShowToast('Profile updated successfully', 'success'); }} className="flex-1 py-2 bg-orange-500 text-white text-[9px] font-black rounded-xl cursor-pointer">Save Changes</button>
                  </div>
                </div>
              </div>
            )}

            {custTopUpOpen && (
              <div className="absolute inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-end">
                <div className="w-full bg-[#0e1626] border-t border-white/10 rounded-t-3xl p-3 space-y-2.5">
                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto"></div>
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black text-white">Add money to Wallet</h5>
                    <button onClick={() => setCustTopUpOpen(false)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="text-[8px] font-bold text-amber-300">Current balance</span>
                    <span className="text-sm font-black text-white">Tk {custWallet}</span>
                  </div>
                  <div>
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase mb-1">Select amount</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[100, 300, 500, 1000].map(a => (
                        <button key={a} onClick={() => setCustTopUpAmount(a)} className={`py-2 rounded-lg text-[9px] font-black cursor-pointer border ${custTopUpAmount === a ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/[0.03] border-white/10 text-gray-400'}`}>Tk {a}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase mb-1">Pay from</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['bKash', 'Nagad', 'Card'] as const).map(s => (
                        <button key={s} onClick={() => setCustTopUpSource(s)} className={`py-2 rounded-lg text-[8px] font-black cursor-pointer border ${custTopUpSource === s ? `bg-white/[0.08] ${s === 'bKash' ? 'border-pink-500/50 text-pink-300' : s === 'Nagad' ? 'border-orange-500/50 text-orange-300' : 'border-blue-500/50 text-blue-300'}` : 'bg-white/[0.03] border-white/10 text-gray-500'}`}>{s === 'Card' ? '💳 Card' : s}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { const code = String(Math.floor(100000 + Math.random() * 900000)); setCustOtpCode(code); setCustOtpSent(custProfileForm.phone); setCustOtpInput(''); setCustTopUpPending(true); setCustTopUpOpen(false); setCustOtpOpen(true); if (showToast) custShowToast(`OTP sent to ${custProfileForm.phone}`, 'info'); }} className="w-full py-2.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded-xl cursor-pointer">
                    Add Tk {custTopUpAmount} via {custTopUpSource} · OTP verify
                  </button>
                </div>
              </div>
            )}

            {custOtpOpen && (
              <div className="absolute inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="w-full bg-[#0e1626] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto"><Smartphone className="w-5 h-5 text-emerald-400" /></div>
                  <p className="text-[11px] font-black text-white text-center">{custTopUpPending ? 'Verify wallet top-up' : 'Verify your order'}</p>
                  <p className="text-[8px] text-gray-400 text-center">A 6-digit OTP was sent to<br /><span className="text-white font-bold">{custOtpSent}</span></p>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 space-y-1">
                    <p className="text-[7px] text-emerald-400 font-bold flex items-center space-x-1"><MessageSquare className="w-2.5 h-2.5" /><span>SMS from NEXAGO-BD</span></p>
                    <p className="text-[8px] text-white leading-relaxed">Your verification code is <span className="text-emerald-300 font-black tracking-[0.2em]">{custOtpCode}</span>. Do not share it with anyone.</p>
                    <button onClick={() => setCustOtpInput(custOtpCode)} className="w-full py-1 bg-emerald-500 text-white text-[7.5px] font-black rounded-lg cursor-pointer">Use secure OTP</button>
                  </div>
                  <input
                    value={custOtpInput}
                    onChange={e => setCustOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-[#070e17] border border-white/10 rounded-xl px-3 py-2.5 text-center text-lg tracking-[0.5em] font-black text-white outline-none focus:border-emerald-500 placeholder:text-sm placeholder:tracking-normal placeholder:text-gray-600"
                  />
                  <button onClick={() => { if (custOtpInput.length !== 6) { if (showToast) custShowToast('Enter the full 6-digit OTP', 'error'); return; } if (custOtpInput !== custOtpCode) { if (showToast) custShowToast('Wrong OTP — please try again', 'error'); return; } setCustOtpOpen(false); if (custTopUpPending) { setCustTopUpPending(false); setCustWallet(w => w + custTopUpAmount); if (showToast) custShowToast(`Tk ${custTopUpAmount} added to your wallet ✓`, 'success'); return; } handleSimPlaceOrder(); }} disabled={custOtpInput.length !== 6} className="w-full py-2.5 bg-emerald-500 disabled:opacity-40 text-white text-[9px] font-black uppercase rounded-xl cursor-pointer">
                    {custTopUpPending ? `Confirm Top-up · Tk ${custTopUpAmount}` : `Confirm & Pay ${custPay === 'NexaGo Wallet' ? '· Wallet' : custPay === 'Cash on Delivery' ? '' : `· ${custPay}`} · Tk ${simTotalPayable}`}
                  </button>
                  <div className="flex justify-between items-center text-[8px]">
                    <button onClick={() => { const code = String(Math.floor(100000 + Math.random() * 900000)); setCustOtpCode(code); if (showToast) custShowToast('New OTP sent via SMS', 'info'); }} className="text-blue-400 font-bold cursor-pointer">Resend OTP</button>
                    <button onClick={() => setCustOtpOpen(false)} className="text-gray-500 font-bold cursor-pointer">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* SIMULATED CHAT POPUP - inside customer phone */}
            {chatOpen && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-end justify-center">
                <div className="bg-[#0b1320] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col h-[480px]">
                  <div className="p-3 bg-[#111c2e] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white text-xs">RK</div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Driver Chat: {driverStats.name}</h4>
                        <p className="text-[8px] text-emerald-400 font-bold">Active Delivery</p>
                      </div>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col justify-end">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl text-[10px] max-w-[80%] ${msg.sender === 'driver' ? 'bg-[#111c2e] text-white self-start' : 'bg-orange-500 text-white self-end ml-auto'}`}>
                        {msg.image ? (
                          <img src={msg.image} alt="Sent photo" className="rounded-lg w-full max-w-[180px] h-auto object-cover" />
                        ) : (
                          msg.text
                        )}
                        <span className="block text-[7px] opacity-70 mt-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-[#111c2e] border-t border-white/10 flex items-center space-x-2">
                    <button onClick={() => triggerPhotoPicker('gallery')} className="p-2 bg-white/5 border border-white/10 text-blue-400 rounded-lg cursor-pointer" title="Gallery">
                      <Image className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => triggerPhotoPicker('camera')} className="p-2 bg-white/5 border border-white/10 text-emerald-400 rounded-lg cursor-pointer" title="Camera">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      placeholder="Type message..."
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage('customer'); }}
                      className="flex-1 px-3 py-1.5 bg-[#0b1320] text-xs text-white border border-white/10 rounded-lg outline-none"
                    />
                    <button onClick={() => handleSendMessage('customer')} className="p-2 bg-orange-500 text-white rounded-lg">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Swipe Home Bar */}
            {custToast && (
              <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-[1100] px-3 py-2 rounded-xl text-[8px] font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[240px] text-center border ${custToast.type === 'success' ? 'bg-emerald-500/95 border-emerald-300/40' : custToast.type === 'error' ? 'bg-red-500/95 border-red-300/40' : 'bg-[#111c2e]/95 border-white/10'}`}>
                {custToast.message}
              </div>
            )}

            <div className="h-4 bg-[#060c13] flex items-center justify-center pb-2 z-40 relative">
              <div className="w-24 h-1 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* PHONE 2: DRIVER APP SIDE                                */}
        {/* ======================================================= */}
        <div className="w-[290px] sm:w-[310px] flex flex-col">
          {/* Realistic Mobile Container referenceup */}
          <div className="w-full aspect-[9/19.5] bg-[#050b12] rounded-[48px] border-[10px] border-[#1d2736] relative shadow-2xl flex flex-col overflow-hidden select-none">
            {/* Phone Side Buttons */}
            <div className="absolute -left-[4px] top-24 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -left-[4px] top-36 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -right-[4px] top-32 w-[4px] h-16 bg-[#2a3646] rounded-r-md" />
            {/* Dynamic Island */}
            <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 flex items-center justify-center shadow-lg">
              <div className="w-7 h-1.5 bg-[#1d2736] rounded-full"></div>
            </div>

            {/* Simulated Phone Status Bar */}
            <div className="h-10 bg-[#060c13] px-6 pt-3 flex items-center justify-between text-white text-[10px] font-bold z-30 relative">
              <span>11:26</span>
              <div className="flex items-center space-x-1.5">
                <Wifi className="w-3.5 h-3.5" />
                <span className="text-[8px] bg-brand-orange/20 text-brand-orange px-1 rounded-sm font-black uppercase tracking-tighter">DRIVER</span>
                <Battery className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* SCREEN CANVAS AREA */}
            <div className="flex-1 overflow-y-auto bg-[#050b12] flex flex-col relative text-white">
              {/* DRIVER SCREEN 1: NEW ORDER REQUEST RING (Screenshot 5 - Pixel Perfect) */}
              {driverScreen === 'new_order' && (
                <div className="flex-1 flex flex-col justify-between p-3.5 fade-in bg-[#070e17]">
                  
                  {/* Header Bar */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <button onClick={() => setDriverScreen('dashboard')} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                    <h4 className="text-xs font-bold text-white">New Order</h4>
                    <button onClick={() => setDriverScreen('support')} className="flex items-center space-x-1 text-[10px] text-gray-300">
                      <Headphones className="w-3 h-3 text-orange-400" />
                      <span>Help</span>
                    </button>
                  </div>

                  {/* Driver Top Card */}
                  <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-white">{driverStats.name}</span>
                          <span className="text-amber-400 text-[10px] font-bold">★ 4.9</span>
                        </div>
                        <p className="text-[8px] text-emerald-400 font-bold">Active • Online</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-[8px] text-emerald-400 font-bold">
                      <span>Online</span>
                      <div className="w-7 h-4 rounded-full bg-emerald-500 relative p-0.5">
                        <div className="w-3 h-3 rounded-full bg-white ml-auto"></div>
                      </div>
                    </div>
                  </div>

                  {/* Vector Map Preview Card */}
                  {/* Removed by request: location map/photo no longer shown on the new order screen. */}

                  {/* New Order Banner & ID */}
                  <div className="bg-[#111c2e] border border-white/10 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="text-xs font-bold text-white">New Order</span>
                      <div className="flex items-center space-x-1 text-[10px] text-gray-400">
                        <span>Order ID: <span className="text-white font-mono">{currentOrder.id}</span></span>
                        <Copy className="w-3 h-3 text-gray-400 hover:text-white cursor-pointer" />
                      </div>
                    </div>

                    {/* Addresses */}
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">🍴</div>
                        <div>
                          <p className="text-gray-400 text-[8px] uppercase font-bold">Restaurant</p>
                          <p className="text-white font-bold">{currentOrder.storeName}</p>
                          <p className="text-gray-400 text-[8px]">{currentOrder.storeAddress}</p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-500" />

                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">👤</div>
                        <div>
                          <p className="text-gray-400 text-[8px] uppercase font-bold">Customer</p>
                          <p className="text-white font-bold">{currentOrder.customerName}</p>
                          <p className="text-gray-400 text-[8px]">{currentOrder.customerAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Distance metrics (4 cols) */}
                    <div className="grid grid-cols-4 gap-1 pt-1 text-center text-[8px]">
                      <div className="bg-[#0b1320] p-1.5 rounded-lg border border-white/5">
                        <p className="text-gray-400">Store → You</p>
                        <p className="text-white font-bold mt-0.5">{currentOrder.storeToYou}</p>
                      </div>
                      <div className="bg-[#0b1320] p-1.5 rounded-lg border border-white/5">
                        <p className="text-gray-400">You → Customer</p>
                        <p className="text-white font-bold mt-0.5">{currentOrder.youToCustomer}</p>
                      </div>
                      <div className="bg-[#0b1320] p-1.5 rounded-lg border border-white/5">
                        <p className="text-gray-400">Total Distance</p>
                        <p className="text-emerald-400 font-bold mt-0.5">{currentOrder.distance}</p>
                      </div>
                      <div className="bg-[#0b1320] p-1.5 rounded-lg border border-white/5">
                        <p className="text-gray-400">Estimated Time</p>
                        <p className="text-orange-400 font-bold mt-0.5">{currentOrder.timeEst}</p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="border-t border-white/5 pt-2 text-[9px] space-y-1 text-gray-300">
                      <div className="flex justify-between">
                        <span>Order Summary</span>
                        <span className="text-white font-bold">Tk {currentOrder.itemPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span className="text-white font-bold">Tk {currentOrder.deliveryFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-white text-[10px] pt-0.5 border-t border-white/5">
                        <span>Total Payable</span>
                        <span className="text-white font-black">Tk {currentOrder.totalPayable.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-400">
                        <span>Payment Method</span>
                        <span className="text-white">{currentOrder.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Accept / Reject Action Buttons - Image 5 */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-1.5">
                      <CountdownRing seconds={driverCountdown} total={60} size={40} color={driverCountdown <= 10 ? '#ef4444' : '#f97316'} />
                      <div>
                        <p className="text-[8px] font-black text-gray-300 uppercase">Accept in</p>
                        <p className="text-[7px] text-gray-500">auto-expires at 0s</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {autoAccept && (
                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300">Auto-accept ON</span>
                      )}
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${driverCountdown <= 10 ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-300'}`}>{driverCountdown <= 10 ? 'Expiring…' : '1 min window'}</span>
                    </div>
                  </div>

                  {/* Timeline times - placed / store received / driver received */}
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 space-y-1 text-[8px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">🕐 Customer placed order</span>
                      <span className="text-white font-bold">{orderPlacedAt || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">🏪 Store received</span>
                      <span className="text-white font-bold">{storeReceivedAt || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">🛵 Driver received</span>
                      <span className="text-emerald-400 font-bold">{driverReceivedAt || '—'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleRejectOrder}
                      className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <span>✕ Reject</span>
                    </button>
                    <button
                      onClick={handleAcceptOrder}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center space-x-1 animate-pulse"
                    >
                      <span>✓ Accept</span>
                    </button>
                  </div>
                </div>
              )}

              {/* DRIVER SCREEN 2: ORDER IN PROGRESS (Screenshot 4 - Pixel Perfect) */}
              {driverScreen === 'progress' && (
                <div className="flex-1 flex flex-col p-2.5 gap-2 fade-in bg-[#070e17]">
                  
                  {/* Header Bar */}
                  <div className="shrink-0 flex items-center justify-between border-b border-white/5 pb-2">
                    <button onClick={() => setDriverScreen('dashboard')} className="text-gray-300 p-1">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-xs font-bold text-white">Order In Progress</h4>
                    <button onClick={() => setDriverChatOpen(true)} className="flex items-center space-x-1 text-[10px] text-gray-300">
                      <MessageSquare className="w-3 h-3 text-blue-400" />
                      <span>Chat</span>
                    </button>
                  </div>

                  {/* Driver Header */}
                  <div className="shrink-0 bg-[#111c2e] border border-white/10 p-2 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-white">{driverStats.name}</span>
                          <span className="text-amber-400 text-[10px] font-bold">★ 4.9</span>
                        </div>
                        <p className="text-[8px] text-emerald-400 font-bold">Active • On Delivery</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-[8px] text-emerald-400 font-bold">
                      <span>Online</span>
                      <div className="w-7 h-4 rounded-full bg-emerald-500 relative p-0.5">
                        <div className="w-3 h-3 rounded-full bg-white ml-auto"></div>
                      </div>
                    </div>
                  </div>

                  {/* Trip Summary List - stays until order completed */}
                  <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-3.5 space-y-2 shadow-lg">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Delivery Summary</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Restaurant</span>
                      <span className="text-[9px] font-black text-white truncate">{currentOrder.storeName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Order No.</span>
                      <span className="flex items-center space-x-1.5">
                        <span className="text-sm font-black text-orange-400 font-mono tracking-wider">#{currentOrder.id}</span>
                        <button onClick={() => copyOrderNo(currentOrder.id)} className="p-1 bg-white/5 border border-white/10 rounded-md cursor-pointer hover:bg-white/10" title="Copy order number">
                          <Copy className="w-3 h-3 text-orange-400" />
                        </button>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">To Restaurant</span>
                      <span className="text-[9px] font-black text-white">{currentOrder.storeToYou}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">To Customer</span>
                      <span className="text-[9px] font-black text-white">{currentOrder.youToCustomer}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Total Distance</span>
                      <span className="text-[9px] font-black text-emerald-400">{currentOrder.distance}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-1.5">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Order Placed</span>
                      <span className="text-[9px] font-black text-white">{orderPlacedAt || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Store Received</span>
                      <span className="text-[9px] font-black text-white">{storeReceivedAt || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Driver Received</span>
                      <span className="text-[9px] font-black text-emerald-400">{driverReceivedAt || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Payment</span>
                      {/cash|cod/i.test(currentOrder.paymentMethod || '') ? (
                        <span className="text-[9px] font-black text-emerald-400">Cash Amount · Tk {Number(currentOrder.amount || currentOrder.deliveryFee || 0).toFixed(2)}</span>
                      ) : (
                        <span className="text-[9px] font-black text-blue-400">PID · Tk {Number(currentOrder.amount || 0).toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Step-by-step Delivery Progress - hidden in Driver App (customer sees it) */}
                  <div className="hidden bg-[#111c2e] border border-white/10 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Delivery Progress</p>
                      <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-300 text-[8px] font-black">{driverStep >= 6 ? 'Completed' : 'Live'}</span>
                    </div>
                    {[
                      { done: driverStep >= 1, icon: '✅', label: 'Order Accepted', desc: 'Request accepted by rider', time: 'Just now' },
                      { done: driverStep >= 2, icon: '🏪', label: 'Reached Store', desc: `Store: ${currentOrder.storeName}`, time: driverStep >= 2 ? 'Arrived' : 'Pending' },
                      { done: driverStep >= 3, icon: '📦', label: 'Order Ready for Pickup', desc: 'Store marked the order ready', time: driverStep >= 3 ? 'Ready' : 'Pending' },
                      { done: driverStep >= 4, icon: '🛵', label: 'Picked Up — On The Way', desc: `Delivering to ${currentOrder.customerName}`, time: `${currentOrder.status === 'Completed' ? 0 : liveEtaMins} mins` },
                      { done: driverStep >= 5, icon: '🚪', label: 'At Customer Location', desc: currentOrder.customerAddress, time: driverStep >= 5 ? 'Reached' : 'Upcoming' },
                      { done: driverStep >= 6, icon: '🏠', label: 'Delivered', desc: 'Order handed over to customer', time: driverStep >= 6 ? 'Done' : 'Upcoming' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-start space-x-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          {s.done ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px]">{s.icon}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-[10px] font-bold ${s.done ? 'text-emerald-400' : 'text-gray-400'}`}>{s.label}</p>
                            <span className="text-[8px] text-gray-500">{s.time}</span>
                          </div>
                          <p className="text-[8px] text-gray-400 truncate">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mini route details sheet */}
                  <div className="hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] text-white font-black">
                          {driverDeliveryStage === 'to_store' && 'Navigate to Store'}
                          {driverDeliveryStage === 'waiting_store' && 'Waiting at Store'}
                          {driverDeliveryStage === 'ready_for_pickup' && 'Store Ready for Pickup'}
                          {driverDeliveryStage === 'to_customer' && 'Navigate to Customer'}
                          {driverDeliveryStage === 'at_customer' && 'At Customer Location'}
                          {driverDeliveryStage === 'customer_reported' && 'Customer Report Open'}
                        </p>
                        <p className="text-[7.5px] text-gray-400 truncate">{currentOrder.id} - {currentOrder.distance} - {currentOrder.timeEst}</p>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-orange-500/15 text-orange-300 text-[7.5px] font-black shrink-0">
                        Tk {currentOrder.deliveryFee.toFixed(0)}
                      </div>
                    </div>

                    <div className="grid grid-cols-[14px_1fr] gap-x-1.5 gap-y-1.5 text-[8px]">
                      <div className="w-3 h-3 rounded-full bg-[#1a73e8] mt-0.5"></div>
                      <div className="min-w-0">
                        <p className="text-white font-bold truncate">{simTrackVeh?.name || driverStats.name}</p>
                        <p className="text-gray-400 truncate">Driver current GPS location</p>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-[#f97316] mt-0.5"></div>
                      <div className="min-w-0">
                        <p className="text-orange-300 font-bold truncate">Store Location: {currentOrder.storeName}</p>
                        <p className="text-gray-300 truncate">{currentOrder.storeAddress}</p>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-[#34a853] mt-0.5"></div>
                      <div className="min-w-0">
                        <p className="text-emerald-300 font-bold truncate">Customer: {currentOrder.customerName}</p>
                        <p className="text-gray-400 truncate">{currentOrder.customerAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="hidden">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-[10px]">🍴</span>
                      <div>
                        <p className="text-white font-bold">{currentOrder.storeName}</p>
                        <p className="text-gray-400 text-[8px]">{currentOrder.storeAddress}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">👤</span>
                      <div>
                        <p className="text-white font-bold">{currentOrder.customerName}</p>
                        <p className="text-gray-400 text-[8px]">{currentOrder.customerAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Metrics Grid */}
                  <div className="hidden">
                    <div className="bg-[#111c2e] border border-white/10 p-1.5 rounded-lg">
                      <p className="text-gray-400">Total Distance</p>
                      <p className="text-emerald-400 font-bold mt-0.5">{currentOrder.distance}</p>
                    </div>
                    <div className="bg-[#111c2e] border border-white/10 p-1.5 rounded-lg">
                      <p className="text-gray-400">Estimated Time</p>
                      <p className="text-orange-400 font-bold mt-0.5">{currentOrder.timeEst}</p>
                    </div>
                    <div className="bg-[#111c2e] border border-white/10 p-1.5 rounded-lg">
                      <p className="text-gray-400">Remaining Dist.</p>
                      <p className="text-emerald-400 font-bold mt-0.5">1.2 km</p>
                    </div>
                    <div className="bg-[#111c2e] border border-white/10 p-1.5 rounded-lg">
                      <p className="text-gray-400">Remaining Time</p>
                      <p className="text-orange-400 font-bold mt-0.5">5 mins</p>
                    </div>
                  </div>

                  {/* Stepper Timeline - Image 4 */}
                  <div className="hidden">
                    <div className="flex items-center justify-between text-[8px] text-center">
                      <div>
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">✓</div>
                        <p className="text-white font-bold mt-1">Order Confirmed</p>
                        <p className="text-gray-400">11:20 AM</p>
                      </div>
                      <div className="h-[2px] flex-1 bg-emerald-500 mx-1"></div>
                      <div>
                        <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center mx-auto text-[9px]">🛵</div>
                        <p className="text-orange-400 font-bold mt-1">On The Way</p>
                        <p className="text-gray-400">11:26 AM</p>
                      </div>
                      <div className="h-[2px] flex-1 bg-gray-700 mx-1 border-dashed"></div>
                      <div>
                        <div className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center mx-auto">•</div>
                        <p className="text-gray-400 mt-1">Arrived</p>
                        <p className="text-gray-500">-</p>
                      </div>
                      <div className="h-[2px] flex-1 bg-gray-700 mx-1 border-dashed"></div>
                      <div>
                        <div className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center mx-auto">○</div>
                        <p className="text-gray-400 mt-1">Delivered</p>
                        <p className="text-gray-500">-</p>
                      </div>
                    </div>
                  </div>

                  {/* Bell Notification Banner - Image 4 */}
                  <div className="hidden">
                    <span className="text-emerald-400 text-sm">🔔</span>
                    <div>
                      <p className="text-white font-bold">
                        {driverDeliveryStage === 'to_store' && 'Navigate to the store'}
                        {driverDeliveryStage === 'waiting_store' && 'Waiting for store confirmation'}
                        {driverDeliveryStage === 'ready_for_pickup' && 'Store order is ready for pickup'}
                        {driverDeliveryStage === 'to_customer' && 'Customer is tracking your route'}
                        {driverDeliveryStage === 'at_customer' && 'You reached the customer location'}
                        {driverDeliveryStage === 'customer_reported' && 'Customer-unreachable report is open'}
                      </p>
                      <p className="text-gray-300">
                        {driverDeliveryStage === 'to_store' && `Follow the map to ${currentOrder.storeName}.`}
                        {driverDeliveryStage === 'waiting_store' && 'The store can send an order-ready message when packing is complete.'}
                        {driverDeliveryStage === 'ready_for_pickup' && 'Take a pickup photo before starting the customer delivery.'}
                        {driverDeliveryStage === 'to_customer' && 'Use the customer address and call if you need delivery directions.'}
                        {driverDeliveryStage === 'at_customer' && 'Take delivery proof after handing the order to the customer.'}
                        {driverDeliveryStage === 'customer_reported' && 'Admin and Store were notified. Try calling the customer again.'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-1.5 pt-1">
                    {driverDeliveryStage === 'to_store' && (
                      <>
                        <button onClick={() => setDriverLocModal('store')} className="w-full py-2 bg-[#1a73e8] hover:bg-blue-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /><span>📍 Store Location</span>
                        </button>
                        <button onClick={handleArriveStore} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer">
                          I've Arrived at Store
                        </button>
                      </>
                    )}
                    {driverDeliveryStage === 'waiting_store' && (
                      <div className="w-full py-2 bg-[#111c2e] border border-white/10 text-gray-300 text-[9px] font-bold text-center rounded-xl">
                        Waiting for Store App to mark the order ready
                      </div>
                    )}
                    {driverDeliveryStage === 'ready_for_pickup' && (
                      <>
                        <label className="w-full py-2 bg-[#111c2e] border border-dashed border-white/30 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-orange-400" />
                          <span>{pickupProofName ? `Pickup photo: ${pickupProofName}` : 'Upload pickup order photo'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setPickupProofName(e.target.files?.[0]?.name || '')} />
                        </label>
                        <button onClick={handlePickupConfirmed} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer">
                          Confirm Pickup & Start Delivery
                        </button>
                      </>
                    )}
                    {(driverDeliveryStage === 'to_customer' || driverDeliveryStage === 'at_customer' || driverDeliveryStage === 'customer_reported') && (
                      <>
<button onClick={() => { if (showToast) driverShowToast(`Calling ${currentOrder.customerName}: ${currentOrder.customerPhone || '+880 1712-345678'}`, 'info'); }} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center space-x-1">
                          <Phone className="w-3.5 h-3.5" /><span>Call Customer</span>
                        </button>
                        {driverDeliveryStage === 'to_customer' && <button onClick={() => setDriverLocModal('customer')} className="w-full py-2 bg-[#1a73e8] hover:bg-blue-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5"><MapPin className="w-3.5 h-3.5" /><span>📍 Customer Location</span></button>}
                        {driverDeliveryStage === 'to_customer' && <button onClick={handleArrived} className="w-full py-2 bg-[#111c2e] border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase rounded-xl cursor-pointer">I've Arrived at Customer</button>}
                        {driverDeliveryStage === 'at_customer' && <button onClick={handleCustomerUnreachable} className="w-full py-2 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-300 text-xs font-bold uppercase rounded-xl cursor-pointer">Customer Did Not Answer - Report</button>}
                        {(driverDeliveryStage === 'at_customer' || driverDeliveryStage === 'customer_reported') && <label className="w-full py-2 bg-[#111c2e] border border-dashed border-white/30 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1"><FileText className="w-3.5 h-3.5 text-emerald-400" /><span>{deliveryProofName ? `Delivery photo: ${deliveryProofName}` : 'Upload delivery proof photo'}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => setDeliveryProofName(e.target.files?.[0]?.name || '')} /></label>}
                        {(driverDeliveryStage === 'at_customer' || driverDeliveryStage === 'customer_reported') && <button onClick={handleDeliveryProofSubmitted} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-xl cursor-pointer">Complete Delivery</button>}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* DRIVER SCREEN 3: ORDER COMPLETED (Screenshot 3 - Pixel Perfect) */}
              {driverScreen === 'completed' && (
                <div className="flex-1 flex flex-col justify-between p-3.5 fade-in bg-[#070e17]">
                  
                  {/* Header Bar */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <button onClick={() => setDriverScreen('dashboard')} className="text-gray-300 p-1">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-xs font-bold text-white">Order Completed</h4>
                    <button onClick={() => setDriverScreen('support')} className="flex items-center space-x-1 text-[10px] text-gray-300">
                      <Headphones className="w-3 h-3 text-orange-400" />
                      <span>Help</span>
                    </button>
                  </div>

                  {/* Driver Header */}
                  <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-white">{driverStats.name}</span>
                          <span className="text-amber-400 text-[10px] font-bold">★ 4.9</span>
                        </div>
                        <p className="text-[8px] text-emerald-400 font-bold">Completed • Delivered</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-[8px] text-emerald-400 font-bold">
                      <span>Online</span>
                      <div className="w-7 h-4 rounded-full bg-emerald-500 relative p-0.5">
                        <div className="w-3 h-3 rounded-full bg-white ml-auto"></div>
                      </div>
                    </div>
                  </div>

                  {/* Map Preview with Delivered Successfully Badge */}
                  <div className="h-32 rounded-xl bg-[#edf2f7] border border-white/10 relative overflow-hidden shadow-inner">
                    <svg viewBox="0 0 320 130" className="w-full h-full">
                      <rect width="100%" height="100%" fill="#edf2f7" />
                      <path d="M0 40 L320 40 M0 90 L320 90 M90 0 L90 130 M210 0 L210 130" stroke="#cbd5e1" strokeWidth="6" />
                      <path d="M 50 40 L 140 65 L 250 90" fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="4 2" />

                      <g transform="translate(50, 40)">
                        <circle r="10" fill="#f97316" />
                        <text x="0" y="3" fill="white" fontSize="7" textAnchor="middle">🏪</text>
                      </g>

                      <g transform="translate(140, 65)">
                        <circle r="8" fill="#1e293b" />
                        <text x="0" y="2" fill="white" fontSize="6" textAnchor="middle">🛵</text>
                      </g>

                      {/* Delivered Badge */}
                      <g transform="translate(250, 90)">
                        <circle r="10" fill="#22c55e" />
                        <text x="0" y="3" fill="white" fontSize="7" textAnchor="middle">✓</text>
                        
                        <rect x="-45" y="-22" width="90" height="15" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
                        <text x="0" y="-12" fill="#22c55e" fontSize="5.5" fontWeight="bold" textAnchor="middle">✓ Delivered Successfully</text>
                      </g>
                    </svg>
                  </div>

                  {/* Addresses */}
                  <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-center justify-between text-[9.5px]">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-[10px]">🍴</span>
                      <div>
                        <p className="text-white font-bold">{currentOrder.storeName}</p>
                        <p className="text-gray-400 text-[8px]">{currentOrder.storeAddress}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">👤</span>
                      <div>
                        <p className="text-white font-bold">{currentOrder.customerName}</p>
                        <p className="text-gray-400 text-[8px]">{currentOrder.customerAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Metrics Grid - Image 3 */}
                  <div className="grid grid-cols-4 gap-1 text-center text-[8px]">
                    <div className="bg-[#111c2e] border border-white/10 p-1.5 rounded-lg">
                      <p className="text-gray-400">Total Distance</p>
                      <p className="text-emerald-400 font-bold mt-0.5">4.2 km</p>
                    </div>
                    <div className="bg-[#111c2e] border border-white/10 p-1.5 rounded-lg">
                      <p className="text-gray-400">Total Time</p>
                      <p className="text-orange-400 font-bold mt-0.5">23 mins</p>
                    </div>
                    <div className="bg-[#111c2e] border border-white/10 p-1.5 rounded-lg">
                      <p className="text-gray-400">Completed At</p>
                      <p className="text-emerald-400 font-bold mt-0.5">11:46 AM</p>
                    </div>
                    <div className="bg-[#0f2e1e] border border-emerald-500/40 p-1.5 rounded-lg">
                      <p className="text-emerald-300">Earning</p>
                      <p className="text-emerald-400 font-black mt-0.5">Tk 260.00</p>
                    </div>
                  </div>

                  {/* Order Delivered Confetti Box - Image 3 */}
                  <div className="bg-[#0b1f16] border border-emerald-500/30 p-2.5 rounded-xl flex items-center justify-between text-[9px]">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">✓</div>
                      <div>
                        <p className="text-white font-bold text-[10px]">Order Delivered!</p>
                        <p className="text-gray-300">The order has been successfully delivered to the customer.</p>
                      </div>
                    </div>
                    <span className="text-2xl">🎉</span>
                  </div>

                  {/* Breakdown & Rating */}
                  <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl space-y-1.5 text-[9px] text-gray-300">
                    <div className="flex justify-between">
                      <span>Order Summary</span>
                      <span className="text-white font-bold">Tk {currentOrder.itemPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="text-white font-bold">Tk {currentOrder.deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white text-[10px] border-t border-white/5 pt-1">
                      <span>Total Payable</span>
                      <span className="text-white font-black">Tk {currentOrder.totalPayable.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[8px] text-gray-400">
                      <span>Payment Method</span>
                      <span className="text-white">{currentOrder.paymentMethod}</span>
                    </div>

                    <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[8px] text-gray-400">Rate Customer (Optional)</span>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map(st => (
                          <button
                            key={st}
                            onClick={() => setCustomerRating(st)}
                            className={`text-xs cursor-pointer ${customerRating >= st ? 'text-amber-400' : 'text-gray-600 hover:text-amber-300'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Image 3 */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleFinishSimulationOrder}
                      className="py-2.5 bg-[#111c2e] border border-white/20 hover:bg-white/10 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              )}

              {/* DRIVER SCREEN 4: ORDER HISTORY (Screenshot 2) */}
              {driverScreen === 'history' && (
                <div className="flex-1 flex flex-col justify-between fade-in bg-[#070e17]">
                  <div className="px-4 py-3 bg-[#070e17] flex items-center justify-between border-b border-white/5">
                    <button onClick={() => setDriverScreen('dashboard')} className="text-gray-300 p-1">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-sm font-bold text-white">Order History</h4>
                    <button className="flex items-center space-x-1 text-xs text-orange-400 font-bold">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Filter</span>
                    </button>
                  </div>

                  <div className="px-3 pt-2 pb-1 border-b border-white/5 flex items-center justify-between text-[11px] font-bold">
                    {['all', 'completed', 'cancelled', 'ongoing'].map(tb => (
                      <button
                        key={tb}
                        onClick={() => setOrderHistoryTab(tb as any)}
                        className={`pb-1.5 transition-all capitalize cursor-pointer relative ${orderHistoryTab === tb ? 'text-orange-400 font-black' : 'text-gray-400'}`}
                      >
                        {tb}
                        {orderHistoryTab === tb && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 flex-1 overflow-y-auto space-y-2">
                    {filteredHistoryOrders.map((ord, idx) => (
                      <div key={idx} className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          {getOrderCategoryIcon(ord.category)}
                          <div>
                            <p className="text-[9px] text-gray-400">Order ID: <span className="text-white font-mono">{ord.id}</span></p>
                            <h5 className="text-[11px] font-bold text-white">{ord.store}</h5>
                            <p className="text-[8px] text-emerald-400 font-medium">• {ord.address}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-400">Tk {ord.amount.toFixed(2)}</p>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[7.5px] font-bold ${
                            ord.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                            ord.status === 'Ongoing' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {ord.status}
                          </span>
                          <div className="flex items-center space-x-1 justify-end pt-0.5">
                            <button onClick={() => { if (showToast) driverShowToast(`Opening chat for ${ord.id}…`, 'info'); setDriverChatOpen(true); }} className="flex items-center space-x-1 px-1.5 py-0.5 bg-blue-500/15 text-blue-400 text-[7.5px] font-bold rounded-md cursor-pointer hover:bg-blue-500/25">
                              <MessageSquare className="w-2 h-2" /><span>Chat</span>
                            </button>
                            <button onClick={() => { setDriverReportOrder(ord.id); setDriverReportReason('Customer unreachable'); setDriverReportDesc(''); setDriverReportOpen(true); }} className="flex items-center space-x-1 px-1.5 py-0.5 bg-red-500/15 text-red-400 text-[7.5px] font-bold rounded-md cursor-pointer hover:bg-red-500/25">
                              <AlertCircle className="w-2 h-2" /><span>Report</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setDriverScreen('dashboard')}
                    className="m-3 py-2 bg-[#111c2e] border border-white/10 text-white text-xs font-bold uppercase rounded-xl"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}

              {/* DRIVER SCREEN 5: DASHBOARD */}
              {driverScreen === 'dashboard' && (
                <div className="flex-1 flex flex-col justify-between fade-in bg-[#070e17]">
                  <div className="p-3 bg-[#0b1320] border-b border-white/5 flex items-center justify-between">
                    <div className="w-5"></div>
                    <div className="flex-1 text-center">
                      <p className={`text-[11px] font-black ${onlineStatus ? 'text-emerald-400' : 'text-red-400'}`}>{onlineStatus ? "You're Online" : "You're Offline"}</p>
                    </div>
                    <button 
                      onClick={handleDriverToggleOnline}
                      className={`w-10 h-5 rounded-full p-0.5 border transition-colors cursor-pointer ${hasActiveDelivery ? 'opacity-40 cursor-not-allowed' : 'border-white/10'} ${onlineStatus ? 'bg-emerald-500' : 'bg-gray-700'}`}
                      title={hasActiveDelivery ? `Complete order #${currentOrder.id} before going offline` : 'Toggle online status'}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${onlineStatus ? 'ml-auto' : ''}`}></div>
                    </button>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col space-y-3 overflow-y-auto">
                    {!onlineStatus ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-wide">You're Offline</p>
                        <p className="text-[9.5px] text-gray-400 leading-relaxed">To receive orders, go online by clicking <b className="text-white">Start Working</b></p>
                        <button onClick={() => setOnlineStatus(true)} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase rounded-2xl cursor-pointer shadow-lg">Start Working</button>
                      </div>
                    ) : (
                      <>
                    {/* Circular Refresh Ring - middle of display, rotates non-stop. Hidden during active delivery */}
                    {(driverDeliveryStage === 'offer' || driverDeliveryStage === 'delivered') && (
                    <div className="flex-1 flex flex-col items-center justify-center py-3">
                      <button
                        onClick={handleDriverRefresh}
                        className="relative w-14 h-14 rounded-full bg-[#111c2e] border border-orange-500/40 flex items-center justify-center cursor-pointer group"
                        title="Refresh for new orders"
                      >
                        <span className="absolute inset-0 rounded-full border-2 border-dashed border-orange-500/50"></span>
                        <span className="absolute inset-0 rounded-full border border-orange-500/40"></span>
                        <RefreshCw className="w-6 h-6 text-orange-400 animate-spin" />
                      </button>
                      <p className="text-[7.5px] text-gray-500 font-bold uppercase mt-2 tracking-wide">{driverRefreshing ? 'Searching…' : 'Tap to refresh'}</p>
                    </div>
                    )}

                    {/* Active Delivery Card - stays visible until order completed */}
                    {driverDeliveryStage !== 'offer' && driverDeliveryStage !== 'delivered' && (
                      <div className="bg-[#111c2e] border border-orange-500/30 rounded-2xl p-3 space-y-2 shadow-md">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-orange-400 font-black uppercase tracking-wider">Active Delivery</p>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-sm font-black text-white font-mono tracking-wider">#{currentOrder.id}</span>
                            <button onClick={() => copyOrderNo(currentOrder.id)} className="p-1 bg-white/5 border border-white/10 rounded-md cursor-pointer hover:bg-white/10" title="Copy order number">
                              <Copy className="w-3 h-3 text-orange-400" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-white truncate">{currentOrder.storeName}</p>
                        <div className="flex items-center justify-between text-[8px] text-gray-400">
                          <span>To Restaurant: <b className="text-white">{currentOrder.storeToYou}</b></span>
                          <span>To Customer: <b className="text-white">{currentOrder.youToCustomer}</b></span>
                        </div>
                        <button onClick={() => setDriverScreen('progress')} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase rounded-xl cursor-pointer">Continue Delivery</button>
                      </div>
                    )}
                      </>
                    )}
                  </div>

                  {/* Driver Bottom Nav */}
                  <div className="bg-[#0b1320] border-t border-white/5 p-2 flex items-center justify-around text-center text-[8px] font-bold text-gray-400 uppercase">
                    <button onClick={() => setDriverScreen('dashboard')} className="text-orange-400 flex flex-col items-center">
                      <Home className="w-4 h-4" />
                      <span>Home</span>
                    </button>
                    <button onClick={handleDriverMapNav} className="hover:text-white flex flex-col items-center">
                      <MapIcon className="w-4 h-4" />
                      <span>Map</span>
                    </button>
                    <button onClick={() => setDriverWalletOpen(true)} className="hover:text-white flex flex-col items-center">
                      <Wallet className="w-4 h-4" />
                      <span>Wallet</span>
                    </button>
                    <button onClick={() => setDriverScreen('account')} className="hover:text-white flex flex-col items-center">
                      <User className="w-4 h-4" />
                      <span>Account</span>
                    </button>
                  </div>
                </div>
              )}

              {/* DRIVER SCREEN: ACCOUNT MENU (Profile, History, Dashboard, Inbox, Support, Settings, Privacy Policy, Logout) */}
              {driverScreen === 'account' && (
                <div className="flex-1 flex flex-col fade-in bg-[#070e17]">
                  <div className="p-3.5 bg-[#0b1320] border-b border-white/5 flex items-center space-x-2.5">
                    <button onClick={() => setDriverScreen('dashboard')} className="text-gray-300 p-1">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-xs font-black text-white">Account</h4>
                    <div className="ml-auto w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">
                      <User className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {/* Online / Offline toggle */}
                    <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                      <div>
                        <p className={`text-[10px] font-black ${onlineStatus ? 'text-emerald-400' : 'text-red-400'}`}>{onlineStatus ? "You're Online" : "You're Offline"}</p>
                        <p className="text-[7.5px] text-gray-400">Accept orders to start earning</p>
                      </div>
                      <button
                        onClick={handleDriverToggleOnline}
                        className={`w-10 h-5 rounded-full p-0.5 border transition-colors cursor-pointer ${hasActiveDelivery ? 'opacity-40 cursor-not-allowed' : 'border-white/10'} ${onlineStatus ? 'bg-emerald-500' : 'bg-gray-700'}`}
                        title={hasActiveDelivery ? `Complete order #${currentOrder.id} before going offline` : 'Toggle online status'}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${onlineStatus ? 'ml-auto' : ''}`}></div>
                      </button>
                    </div>

                    {/* Auto-accept toggle */}
                    <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                      <div>
                        <p className={`text-[10px] font-black ${autoAccept ? 'text-emerald-400' : 'text-gray-300'}`}>Auto-accept orders</p>
                        <p className="text-[7.5px] text-gray-400">{autoAccept ? 'ON — new orders are received automatically' : 'OFF — accept each order manually'}</p>
                      </div>
                      <button
                        onClick={() => { setAutoAccept(!autoAccept); if (showToast) driverShowToast(autoAccept ? 'Auto-accept turned OFF.' : 'Auto-accept turned ON — orders will be received automatically.', autoAccept ? 'info' : 'success'); }}
                        className={`w-10 h-5 rounded-full p-0.5 border border-white/10 transition-colors cursor-pointer ${autoAccept ? 'bg-emerald-500' : 'bg-gray-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${autoAccept ? 'ml-auto' : ''}`}></div>
                      </button>
                    </div>

                    {/* Order Stats - moved from dashboard */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[8px] mb-2">
                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl">
                        <span className="text-base">🛍️</span>
                        <p className="text-xs font-bold text-white mt-0.5">{driverStats.completedCount}</p>
                        <p className="text-gray-400 uppercase">Completed</p>
                      </div>
                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl">
                        <span className="text-base">📞</span>
                        <p className="text-xs font-bold text-white mt-0.5">{onlineStatus ? '01' : '00'}</p>
                        <p className="text-gray-400 uppercase">Ongoing</p>
                      </div>
                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl">
                        <span className="text-base">💼</span>
                        <p className="text-xs font-bold text-white mt-0.5">{driverStats.completedCount}</p>
                        <p className="text-gray-400 uppercase">Total</p>
                      </div>
                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl">
                        <span className="text-base">⭐</span>
                        <p className="text-xs font-bold text-white mt-0.5">{driverStats.rating}</p>
                        <p className="text-gray-400 uppercase">Rating</p>
                      </div>
                    </div>
                    {[
                      { icon: User, label: 'Profile', color: 'text-orange-400', fn: () => setDriverProfileOpen(true) },
                      { icon: Wallet, label: 'Wallet & Earnings', color: 'text-emerald-400', fn: () => setDriverWalletOpen(true) },
                      { icon: History, label: 'Delivery History', color: 'text-blue-400', fn: () => setDriverScreen('history') },
                      { icon: Home, label: 'Dashboard', color: 'text-orange-400', fn: () => setDriverScreen('dashboard') },
                      { icon: Inbox, label: 'Inbox', color: 'text-cyan-400', fn: () => setDriverScreen('inbox') },
                      { icon: Headphones, label: 'Support', color: 'text-purple-400', fn: () => setDriverScreen('support') },
                      { icon: Settings, label: 'Settings', color: 'text-amber-400', fn: () => setDriverScreen('settings') },
                      { icon: ShieldCheck, label: 'Privacy Policy', color: 'text-teal-400', fn: () => setDriverScreen('terms') },
                      { icon: LogOut, label: 'Logout', color: 'text-red-400', fn: () => setDriverScreen('login') },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={item.fn}
                        className="w-full bg-[#111c2e] border border-white/10 hover:border-orange-500/40 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center space-x-2.5">
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                          <span className={`text-[10px] font-bold ${item.label === 'Logout' ? 'text-red-400' : 'text-white'}`}>{item.label}</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DRIVER SCREEN 6: DRIVER LOGIN (1. Login Portal) */}
              {driverScreen === 'login' && (
                <div className="flex-1 flex flex-col justify-between p-4 fade-in bg-[#070e17] overflow-y-auto">
                  <div className="space-y-4 pt-2 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto text-3xl font-bold shadow-xl">
                      <Truck className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white tracking-wide">The NexaGo BD Driver</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Enter credentials to access dispatch portal</p>
                    </div>
                    
                    <div className="space-y-2.5 text-left pt-2">
                      <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl space-y-1">
                        <label className="text-[8px] text-gray-400 uppercase block font-black">Driver Phone or ID</label>
                        <input 
                          type="text" 
                          value={loginId} 
                          onChange={(e) => setLoginId(e.target.value)} 
                          className="bg-transparent text-xs text-white font-mono outline-none w-full"
                          placeholder="Enter driver ID" 
                        />
                      </div>

                      <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl space-y-1 relative">
                        <label className="text-[8px] text-gray-400 uppercase block font-black">Password</label>
                        <div className="flex items-center justify-between">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            value={loginPass} 
                            onChange={(e) => setLoginPass(e.target.value)} 
                            className="bg-transparent text-xs text-white font-mono outline-none w-full pr-6" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="text-gray-400 hover:text-white cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-gray-300">
                          <input 
                            type="checkbox" 
                            checked={rememberMe} 
                            onChange={(e) => setRememberMe(e.target.checked)} 
                            className="rounded bg-brand-dark border-white/20 text-orange-500 focus:ring-0" 
                          />
                          <span>Remember Me</span>
                        </label>
                        <button 
                          onClick={() => setDriverScreen('forgot_password')} 
                          className="text-orange-400 hover:underline font-bold"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <button 
                      onClick={() => {
                        setDriverScreen('dashboard');
                        if (showToast) driverShowToast(`Welcome back, ${driverStats.name}!`, 'success');
                      }} 
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer transition-all"
                    >
                      Login to Portal
                    </button>
                    <button 
                      onClick={() => setDriverScreen('signup')} 
                      className="w-full py-2 bg-[#111c2e] border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer"
                    >
                      Register New Driver →
                    </button>
                  </div>
                </div>
              )}

              {/* DRIVER SCREEN 7: SIGN UP / REGISTRATION */}
              {driverScreen === 'signup' && (
                <div className="flex-1 flex flex-col justify-between p-4 fade-in bg-[#070e17] overflow-y-auto">
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <button onClick={() => setDriverScreen('login')} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-bold text-white">Driver Registration</h4>
                      <span className="text-[9px] text-orange-400 font-bold">Step 1 of 2</span>
                    </div>

                    <div className="space-y-2 text-left pt-1">
                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl">
                        <label className="text-[7.5px] text-gray-400 uppercase block font-bold">Full Name (Bangla/English)</label>
                        <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full" />
                      </div>

                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl">
                        <label className="text-[7.5px] text-gray-400 uppercase block font-bold">Mobile Phone (+880)</label>
                        <input type="text" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full" />
                      </div>

                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl">
                        <label className="text-[7.5px] text-gray-400 uppercase block font-bold">Vehicle Type</label>
                        <select className="bg-transparent text-xs text-white outline-none w-full cursor-pointer">
                          <option value="motorcycle" className="bg-[#111c2e]">Motorcycle (150cc)</option>
                          <option value="electric" className="bg-[#111c2e]">Electric Scooter / EV</option>
                          <option value="bicycle" className="bg-[#111c2e]">Bicycle Courier</option>
                          <option value="car" className="bg-[#111c2e]">Covered Van / Car</option>
                        </select>
                      </div>

                      <div className="bg-[#111c2e] border border-white/10 p-2 rounded-xl">
                        <label className="text-[7.5px] text-gray-400 uppercase block font-bold">Create Password</label>
                        <input type="password" value={signupPass} onChange={(e) => setSignupPass(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full" />
                      </div>

                      <div className="flex items-center space-x-1.5 pt-1">
                        <input 
                          type="checkbox" 
                          id="terms-check" 
                          checked={termsChecked} 
                          onChange={(e) => setTermsChecked(e.target.checked)} 
                          className="rounded bg-brand-dark border-white/20 text-orange-500" 
                        />
                        <label htmlFor="terms-check" className="text-[9px] text-gray-300">
                          I agree to the <button onClick={() => setDriverScreen('terms')} className="text-orange-400 underline">Terms & Safety Guidelines</button>
                        </label>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setDriverScreen('docs')} 
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer mt-3"
                  >
                    Continue to Document Upload →
                  </button>
                </div>
              )}

              {/* DRIVER SCREEN 8: DOCUMENT UPLOAD (Step 2) */}
              {driverScreen === 'docs' && (
                <div className="flex-1 flex flex-col justify-between p-4 fade-in bg-[#070e17] overflow-y-auto">
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <button onClick={() => setDriverScreen('signup')} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-bold text-white">Document Verification</h4>
                      <span className="text-[9px] text-orange-400 font-bold">Step 2 of 2</span>
                    </div>

                    <p className="text-[9px] text-gray-400">Upload clear photos of your official documents for dispatch approval.</p>

                    <div className="space-y-2 pt-1 text-[10px]">
                      {[
                        { key: 'license', label: 'Driving License (Front & Back)', required: true },
                        { key: 'nid', label: 'National ID (NID) Smart Card', required: true },
                        { key: 'registration', label: 'Vehicle Registration Certificate', required: true },
                        { key: 'insurance', label: 'Tax Token & Insurance Policy', required: false },
                        { key: 'photo', label: 'Profile Photo / Selfie with Vehicle', required: true }
                      ].map((docItem) => (
                        <div key={docItem.key} className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-white font-bold">{docItem.label}</p>
                            <p className="text-[8px] text-gray-400">{uploadedDocs[docItem.key] ? uploadedDocs[docItem.key] : docItem.required ? 'Required' : 'Optional'}</p>
                          </div>
                          
                          <button
                            onClick={() => handleUploadDocument(docItem.key, docItem.label)}
                            className={`px-2.5 py-1 rounded text-[9px] font-bold cursor-pointer transition-all ${
                              uploadedDocs[docItem.key] 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white'
                            }`}
                          >
                            {uploadedDocs[docItem.key] ? '✓ Uploaded' : 'Upload File'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setDriverScreen('pending');
                      if (showToast) driverShowToast('Documents submitted! Application now under admin review.', 'success');
                    }} 
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer mt-3"
                  >
                    Submit Application for Approval
                  </button>
                </div>
              )}

              {/* DRIVER SCREEN 9: APPLICATION PENDING APPROVAL */}
              {driverScreen === 'pending' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 fade-in bg-[#070e17]">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Application Under Review</h4>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[220px] mx-auto">
                      Our dispatch team is verifying your Driving License & NID details. Estimated time: 2 - 4 hours.
                    </p>
                  </div>

                  <div className="bg-[#111c2e] border border-white/10 p-3 rounded-xl text-left text-[9px] space-y-1.5 w-full">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Driver ID:</span>
                      <span className="text-white font-mono font-bold">{driverStats.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Submitted:</span>
                      <span className="text-white">Today, 11:15 AM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Verification Status:</span>
                      <span className="text-amber-400 font-bold">Pending Review</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setDriverScreen('dashboard')} 
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg cursor-pointer"
                  >
                    Bypass / Enter temporary Dashboard →
                  </button>
                </div>
              )}

              {/* DRIVER SCREEN 10: FORGOT PASSWORD */}
              {driverScreen === 'forgot_password' && (
                <div className="flex-1 flex flex-col justify-between p-4 fade-in bg-[#070e17]">
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <button onClick={() => setDriverScreen('login')} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-bold text-white">Reset Driver Password</h4>
                      <span className="w-4"></span>
                    </div>

                    <p className="text-[9.5px] text-gray-400">Enter your registered mobile phone number to receive a 6-digit OTP verification code.</p>

                    <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl space-y-1">
                      <label className="text-[8px] text-gray-400 uppercase block font-black">Registered Phone Number</label>
                      <input type="text" defaultValue="+880 1234-567890" className="bg-transparent text-xs text-white font-mono outline-none w-full" />
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (showToast) driverShowToast('OTP Code 492108 sent to registered phone!', 'info');
                      setDriverScreen('login');
                    }} 
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-xl cursor-pointer"
                  >
                    Send OTP Verification Code
                  </button>
                </div>
              )}

              {/* DRIVER SCREEN 11: HELPLINE & CONTACT SUPPORT */}
              {driverScreen === 'support' && (
                <div className="flex-1 flex flex-col justify-between p-4 fade-in bg-[#070e17] overflow-y-auto">
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <button onClick={() => setDriverScreen('dashboard')} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-bold text-white">Driver Helpline Support</h4>
                      <span className="w-4"></span>
                    </div>

                    <div className="bg-[#111c2e] border border-white/10 p-3.5 rounded-2xl text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto text-xl">
                        🎧
                      </div>
                      <h5 className="text-xs font-bold text-white">24/7 Dispatch Control Room</h5>
                      <p className="text-[9px] text-gray-400">Direct hotline for active rider emergencies and route issues.</p>
                      <a
                        href="tel:+8809612345678"
                        onClick={(e) => {
                          e.preventDefault();
                          if (showToast) driverShowToast('Connecting to Dispatch Control Room Hotline (+880 9612-345678)...', 'info');
                        }}
                        className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                      >
                        📞 Call Dispatcher (+880 9612)
                      </a>
                    </div>

                    <div className="space-y-1.5 pt-1 text-[9.5px]">
                      <p className="text-gray-400 font-bold uppercase text-[8px]">Frequently Asked Questions</p>
                      <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl">
                        <p className="text-white font-bold">How are weekly payouts calculated?</p>
                        <p className="text-gray-400 text-[8.5px] mt-0.5">Earnings are transferred every Sunday directly to your bKash or Bank account.</p>
                      </div>
                      <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl">
                        <p className="text-white font-bold">What to do in case of heavy traffic / rain delay?</p>
                        <p className="text-gray-400 text-[8.5px] mt-0.5">Use the in-app chat button on transit view to notify customer immediately.</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setDriverScreen('dashboard')} 
                    className="w-full py-2.5 bg-[#111c2e] border border-white/10 text-white text-xs font-bold uppercase rounded-xl cursor-pointer mt-3"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}

              {/* DRIVER SCREEN: INBOX */}
              {driverScreen === 'inbox' && (
                <div className="flex-1 flex flex-col justify-between p-4 fade-in bg-[#070e17] overflow-y-auto">
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <button onClick={() => setDriverScreen('account')} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-bold text-white">Inbox</h4>
                      <span className="w-4"></span>
                    </div>

                    <div className="bg-[#111c2e] border border-white/10 p-3 rounded-2xl flex items-start space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 text-sm">
                        <Inbox className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-white">No new messages</p>
                        <p className="text-[8.5px] text-gray-400">You're all caught up. New dispatch updates, payout notices and support replies will appear here.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 text-[9.5px]">
                      <p className="text-gray-400 font-bold uppercase text-[8px]">Recent Activity</p>
                      {[
                        { icon: Truck, color: 'text-emerald-400', title: 'Welcome to The NexaGo BD Driver!', time: 'Today · 9:00 AM' },
                        { icon: FileText, color: 'text-orange-400', title: 'Weekly payout schedule updated — Sundays, bKash/Bank', time: 'Yesterday' }
                      ].map((m, i) => (
                        <div key={i} className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-start space-x-2.5">
                          <span className={`w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0 ${m.color}`}>
                            <m.icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold">{m.title}</p>
                            <p className={`text-[8px] ${m.color} font-bold`}>{m.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setDriverScreen('account')}
                    className="w-full py-2.5 bg-[#111c2e] border border-white/10 text-white text-xs font-bold uppercase rounded-xl cursor-pointer mt-3"
                  >
                    Back to Account
                  </button>
                </div>
              )}

              {/* DRIVER SCREEN: SETTINGS */}
              {driverScreen === 'settings' && (
                <div className="flex-1 flex flex-col justify-between p-4 fade-in bg-[#070e17] overflow-y-auto">
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <button onClick={() => setDriverScreen('account')} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-bold text-white">Settings</h4>
                      <span className="w-4"></span>
                    </div>

                    <div className="space-y-1.5 text-[9.5px]">
                      {[
                        { label: 'App Language', value: 'English (বাংলা available)' },
                        { label: 'Distance Unit', value: 'Kilometers (km)' },
                        { label: 'Ringer / Notification Tone', value: 'Default · Dispatch Bell' }
                      ].map((s, i) => (
                        <div key={i} className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
                          <p className="text-gray-400">{s.label}</p>
                          <p className="text-white font-bold">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-white">Push Notifications</p>
                        <p className="text-[8px] text-gray-400">New order, payout & support alerts</p>
                      </div>
                      <button onClick={() => { setNotifOn(!notifOn); if (showToast) driverShowToast(notifOn ? 'Push notifications OFF' : 'Push notifications ON', 'info'); }} className={`w-10 h-5 rounded-full p-0.5 border border-white/10 transition-colors cursor-pointer ${notifOn ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${notifOn ? 'ml-auto' : ''}`}></div>
                      </button>
                    </div>

                    <button
                      onClick={() => { if (showToast) driverShowToast('App is up to date (v1.4.2)', 'success'); }}
                      className="w-full bg-[#111c2e] border border-white/10 p-2.5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/5"
                    >
                      <p className="text-gray-400">App Version</p>
                      <p className="text-white font-bold">v1.4.2 ✓</p>
                    </button>
                  </div>

                  <button
                    onClick={() => setDriverScreen('account')}
                    className="w-full py-2.5 bg-[#111c2e] border border-white/10 text-white text-xs font-bold uppercase rounded-xl cursor-pointer mt-3"
                  >
                    Back to Account
                  </button>
                </div>
              )}
              {driverScreen === 'terms' && (
                <div className="flex-1 flex flex-col justify-between p-4 fade-in bg-[#070e17] overflow-y-auto">
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <button onClick={() => setDriverScreen('signup')} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-bold text-white">Terms & Safety Guidelines</h4>
                      <span className="w-4"></span>
                    </div>

                    <div className="space-y-2 text-[9px] text-gray-300">
                      {[
                        { id: 't1', title: '1. Courier Safety & Helmet Rule', desc: 'All riders must wear a certified helmet and follow traffic regulations across Dhaka city.' },
                        { id: 't2', title: '2. Payout & Commission Rates', desc: 'Standard commission is 15% per fulfilled delivery. Weekly settlement happens every Sunday.' },
                        { id: 't3', title: '3. Order Cancellation Policy', desc: 'Unauthorized order cancellation will lead to temporary account freeze.' }
                      ].map((term) => (
                        <div key={term.id} className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl">
                          <button onClick={() => toggleAccordion(term.id)} className="w-full text-left flex justify-between items-center font-bold text-white cursor-pointer">
                            <span>{term.title}</span>
                            <span>{expandedTerm === term.id ? '−' : '+'}</span>
                          </button>
                          {expandedTerm === term.id && (
                            <p className="text-gray-400 text-[8.5px] mt-1.5 pt-1.5 border-t border-white/5">{term.desc}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setDriverScreen('signup')} 
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase rounded-xl cursor-pointer mt-3"
                  >
                    I Accept Terms
                  </button>
                </div>
              )}

              {/* Driver Location Modal (Store / Customer) */}
            </div>

            {/* Driver Modals - rendered outside the scrollable canvas so they always overlay the visible phone */}
            {driverLocModal && (
              <div className="absolute inset-0 z-[80] bg-black/70 flex items-end">
                <div className="w-full bg-[#111c2e] border-t border-white/10 rounded-t-3xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-white flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#1a73e8]" />{driverLocModal === 'store' ? 'Store Location' : 'Customer Location'}</h5>
                    <button onClick={() => setDriverLocModal(null)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
                  </div>
                  {driverLocModal === 'store' ? (
                    <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-3.5 space-y-1">
                      <p className="text-[10px] font-black text-white flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]"></span>{currentOrder.storeName}</p>
                      <p className="text-[8px] text-gray-400">{currentOrder.storeAddress}</p>
                    </div>
                  ) : (
                    <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-3.5 space-y-1">
                      <p className="text-[10px] font-black text-white flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#34a853]"></span>{currentOrder.customerName}</p>
                      <p className="text-[8px] text-gray-400">{currentOrder.customerAddress}</p>
                      <p className="text-[8px] text-gray-400">📞 {currentOrder.customerPhone}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { if (showToast) driverShowToast(`Navigating to ${driverLocModal === 'store' ? currentOrder.storeName : currentOrder.customerName}...`, 'info'); }} className="w-full py-2.5 bg-[#1a73e8] hover:bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Start Navigation</button>
                    <button onClick={() => setDriverLocModal(null)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer">Close</button>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Wallet Modal */}
            {driverWalletOpen && (
              <div className="absolute inset-0 z-[80] bg-black/70 flex items-end">
                <div className="w-full bg-[#111c2e] border-t border-white/10 rounded-t-3xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-white flex items-center gap-1.5"><Wallet className="w-4 h-4 text-cyan-400" />Driver Wallet</h5>
                    <button onClick={() => setDriverWalletOpen(false)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
                  </div>
                  <div className="bg-gradient-to-tr from-[#1a73e8] to-[#34a853] rounded-2xl p-4 shadow-lg">
                    <p className="text-[9px] text-white/80 font-bold uppercase">Available Balance</p>
                    <p className="text-2xl font-black text-white mt-1">Tk {driverStats.walletBalance.toFixed(2)}</p>
                    <p className="text-[8px] text-white/80 font-bold mt-1">{driverStats.completedCount} Orders Completed</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-3">
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Today's Earnings</p>
                      <p className="text-sm font-black text-white mt-1">Tk {driverStats.todayEarnings.toFixed(2)}</p>
                    </div>
                    <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-3">
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Pending Settlement</p>
                      <p className="text-sm font-black text-white mt-1">Tk 0.00</p>
                    </div>
                  </div>
                  <button onClick={() => { if (showToast) driverShowToast('Settlement request sent to Super Admin.', 'success'); }} className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer">Withdraw</button>
                </div>
              </div>
            )}

            {/* Driver Profile Modal */}
            {driverProfileOpen && (
              <div className="absolute inset-0 z-[80] bg-black/70 flex items-end">
                <div className="w-full bg-[#111c2e] border-t border-white/10 rounded-t-3xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-white flex items-center gap-1.5"><User className="w-4 h-4 text-orange-400" />Driver Profile</h5>
                    <button onClick={() => setDriverProfileOpen(false)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
                  </div>
                  <div className="flex items-center space-x-3 bg-[#0b1320] border border-white/10 rounded-2xl p-3.5">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white text-lg font-bold">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white truncate">{driverStats.name}</p>
                      <p className="text-[8px] text-gray-400">ID: {driverStats.id}</p>
                      <p className="text-[8px] text-gray-400">📞 {driverStats.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-3">
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Rating</p>
                      <p className="text-sm font-black text-white mt-1">★ {driverStats.rating}</p>
                    </div>
                    <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-3">
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Vehicle</p>
                      <p className="text-sm font-black text-white mt-1 truncate">{driverStats.vehicle}</p>
                    </div>
                    <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-3">
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Completed</p>
                      <p className="text-sm font-black text-white mt-1">{driverStats.completedCount} orders</p>
                    </div>
                    <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-3">
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Status</p>
                      <p className={`text-sm font-black mt-1 ${onlineStatus ? 'text-emerald-400' : 'text-red-400'}`}>{onlineStatus ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DRIVER CHAT MODAL - customer messages arrive here */}
            {driverChatOpen && (
              <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-end justify-center">
                <div className="bg-[#0b1320] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col h-[480px]">
                  <div className="p-3 bg-[#111c2e] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white text-xs">RK</div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Customer: {currentOrder.customerName}</h4>
                        <p className="text-[8px] text-emerald-400 font-bold">Active Delivery</p>
                      </div>
                    </div>
                    <button onClick={() => setDriverChatOpen(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col justify-end">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl text-[10px] max-w-[80%] ${msg.sender === 'driver' ? 'bg-orange-500 text-white self-end ml-auto' : 'bg-[#111c2e] text-white self-start'}`}>
                        {msg.image ? (
                          <img src={msg.image} alt="Received photo" className="rounded-lg w-full max-w-[180px] h-auto object-cover" />
                        ) : (
                          msg.text
                        )}
                        <span className="block text-[7px] opacity-70 mt-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-[#111c2e] border-t border-white/10 flex items-center space-x-2">
                    <button onClick={() => triggerDriverPhotoPicker('gallery')} className="p-2 bg-white/5 border border-white/10 text-blue-400 rounded-lg cursor-pointer" title="Gallery">
                      <Image className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => triggerDriverPhotoPicker('camera')} className="p-2 bg-white/5 border border-white/10 text-emerald-400 rounded-lg cursor-pointer" title="Camera">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      placeholder="Type message..."
                      value={driverChatText}
                      onChange={(e) => setDriverChatText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleDriverSendMessage(); }}
                      className="flex-1 px-3 py-1.5 bg-[#0b1320] text-xs text-white border border-white/10 rounded-lg outline-none"
                    />
                    <button onClick={handleDriverSendMessage} className="p-2 bg-orange-500 text-white rounded-lg">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DRIVER REPORT MODAL - report issues from order history */}
            {driverReportOpen && (
              <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-5">
                <div className="bg-[#0b1320] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black text-white flex items-center space-x-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-400" /><span>Report an issue</span></h5>
                    <button onClick={() => setDriverReportOpen(false)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"><X className="w-3 h-3 text-white" /></button>
                  </div>
                  <div className="bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[8px] text-gray-400">Order</span>
                    <span className="text-[8px] text-white font-mono font-bold">{driverReportOrder}</span>
                  </div>
                  <div>
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase mb-1">What went wrong?</p>
                    <div className="space-y-1">
                      {['Customer unreachable', 'Wrong delivery address', 'Customer refused order', 'Store took too long', 'Payment issue', 'Vehicle problem', 'Other'].map(r => (
                        <button key={r} onClick={() => setDriverReportReason(r)} className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[8px] font-bold cursor-pointer border ${driverReportReason === r ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-white/[0.03] border-white/10 text-gray-300'}`}>
                          <span>{r}</span>{driverReportReason === r && <Check className="w-3 h-3 text-red-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea value={driverReportDesc} onChange={e => setDriverReportDesc(e.target.value)} placeholder="Add details (optional)…" className="w-full bg-[#070e17] border border-white/10 rounded-lg p-2 text-[8px] text-white outline-none focus:border-red-500 placeholder:text-gray-600 min-h-[44px] resize-none" />
                  <button onClick={() => { if (onReport) onReport({ orderId: driverReportOrder || '', reason: driverReportReason, note: driverReportDesc }); setDriverReportOpen(false); if (showToast) driverShowToast(`Report submitted for ${driverReportOrder} — admin notified ✓`, 'success'); }} className="w-full py-2.5 bg-red-500 text-white text-[9px] font-black uppercase rounded-xl cursor-pointer">
                    Submit Report to Admin
                  </button>
                </div>
              </div>
            )}

            {/* Driver in-phone toast */}
            {driverToast && (
              <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-[1100] px-3 py-2 rounded-xl text-[8px] font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[240px] text-center border ${driverToast.type === 'success' ? 'bg-emerald-500/95 border-emerald-300/40' : driverToast.type === 'error' ? 'bg-red-500/95 border-red-300/40' : 'bg-[#111c2e]/95 border-white/10'}`}>
                {driverToast.message}
              </div>
            )}

            {/* Bottom Swipe Home Bar */}
            <div className="h-4 bg-[#060c13] flex items-center justify-center pb-2 z-40 relative">
              <div className="w-24 h-1 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* PHONE 3: STORE APP SIDE                                 */}
        {/* ======================================================= */}
        <div className="w-[290px] sm:w-[310px] flex flex-col">
          <div className="w-full aspect-[9/19.5] bg-[#050b12] rounded-[48px] border-[10px] border-[#1d2736] relative shadow-2xl flex flex-col overflow-hidden select-none">
            <div className="absolute -left-[4px] top-24 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -left-[4px] top-36 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -right-[4px] top-32 w-[4px] h-16 bg-[#2a3646] rounded-r-md" />
            <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 flex items-center justify-center shadow-lg">
              <div className="w-7 h-1.5 bg-[#1d2736] rounded-full"></div>
            </div>

            <div className="h-10 bg-[#060c13] px-6 pt-3 flex items-center justify-between text-white text-[10px] font-bold z-30 relative">
              <span>11:26</span>
              <span className="text-[8px] text-emerald-400 tracking-wide">STORE</span>
              <div className="flex items-center space-x-1.5">
                <Wifi className="w-3 h-3" />
                <Battery className="w-4 h-3" />
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-[#070e17] overflow-hidden">
              <div className="px-3.5 py-3 bg-[#0b1320] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <StoreIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white font-black truncate">{simulationStatus === 'idle' ? (simStores[0]?.name || 'My Store') : currentOrder.storeName}</p>
                    <p className={`text-[8px] font-bold ${storeOnline ? 'text-emerald-400' : 'text-red-400'}`}>{storeOnline ? "Store Online" : "Store Offline"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setStoreOnline(!storeOnline);
                      if (showToast) storeShowToast(storeOnline ? 'Store went offline — new orders will wait until you go online.' : 'Store is online — ready to receive orders.', storeOnline ? 'info' : 'success');
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 border border-white/10 transition-colors cursor-pointer ${storeOnline ? 'bg-emerald-500' : 'bg-gray-700'}`}
                    title="Toggle store online/offline"
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${storeOnline ? 'ml-auto' : ''}`}></div>
                  </button>
                  <button onClick={() => setStoreHistoryOpen(true)} className="p-1.5 text-gray-300 hover:text-white hover:bg-white/5 rounded cursor-pointer" title="Order history">
                    <History className="w-4 h-4" />
                  </button>
                  <button onClick={() => setStoreSupportOpen(true)} className="p-1.5 text-gray-300 hover:text-white hover:bg-white/5 rounded cursor-pointer" title="Store support">
                    <Headphones className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {simulationStatus === 'idle' || storePickedUp || !!currentOrder.pickedUp || posOrderHiddenFromStore ? (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {!storeOnline && (
                    <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-3 flex items-center space-x-2">
                      <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center">
                        <WifiOff className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white">You're Offline</p>
                        <p className="text-[8px] text-gray-400">To receive orders, go online by tapping the toggle above.</p>
                      </div>
                    </div>
                  )}
                  <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-3 flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white">No new order right now</p>
                      <p className="text-[8px] text-gray-400">Customer orders will appear here — accept if you have time, otherwise reject.</p>
                    </div>
                  </div>

                  {/* Store order queue - list of this store's orders */}
                  {(() => {
                    const myStore = simStores[0]?.name || '';
                    const queue = realOrders.filter(o => o.storeName === myStore && o.status !== 'Completed' && o.status !== 'Cancelled' && !o.pickedUp && !isPosOrder(o));
                    if (!queue.length) return null;
                    return (
                      <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-2.5 space-y-1.5">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider px-1">Order Queue</p>
                        {queue.map(ord => (
                          <div key={ord.id} className="bg-[#0b1320] border border-white/10 rounded-xl p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[9px] font-black text-white font-mono">#{ord.id}</p>
                              <p className="text-[7.5px] text-gray-400 truncate">{ord.customerName} · {ord.itemCount || 1} items</p>
                            </div>
                            {ord.status === 'Confirmed' || ord.status === 'Pending' ? (
                              <div className="flex items-center space-x-1">
                                <button onClick={() => storeAcceptOrder(ord)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[7.5px] font-black uppercase rounded-lg cursor-pointer">Accept</button>
                                <button onClick={() => storeRejectOrder(ord)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[7.5px] font-black uppercase rounded-lg cursor-pointer">Reject</button>
                              </div>
                            ) : (
                              <span className="text-[7.5px] font-black text-amber-400 uppercase">{ord.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase">Live Order</p>
                      <p className="text-[10px] font-black text-white font-mono">#{currentOrder.id}</p>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button onClick={() => { setStorePrintOrder(currentOrder); setStorePrintOpen(true); }} className="flex items-center space-x-1 px-2 py-1 bg-[#111c2e] border border-white/15 text-white text-[8px] font-black uppercase rounded-lg cursor-pointer hover:bg-white/10" title="Print receipt">
                        <Printer className="w-3 h-3 text-orange-400" /><span>Print</span>
                      </button>
                      <span className={`px-2 py-1 rounded-md text-[8px] font-black ${currentOrder.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : storeOrderReady ? 'bg-blue-500/15 text-blue-400' : storePreparationStarted ? 'bg-amber-500/15 text-amber-400' : 'bg-orange-500/15 text-orange-400'}`}>
                        {currentOrder.status === 'Completed' ? 'COMPLETED' : storeOrderReady ? 'READY' : storePreparationStarted ? 'PREPARING' : 'NEW ORDER'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#111c2e] border border-white/10 p-2.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[8px] text-gray-400">Customer</p>
                        <p className="text-[10px] text-white font-bold truncate">{currentOrder.customerName}</p>
                      </div>
                      <button onClick={() => { if (showToast) storeShowToast(`Calling ${currentOrder.customerName}: ${currentOrder.customerPhone || '+880 1712-345678'}`, 'info'); }} className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center cursor-pointer" title="Call customer">
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[8px] leading-relaxed text-gray-400">{currentOrder.customerAddress}</p>
                  </div>

                  <div className="bg-[#111c2e] border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-2.5 py-2 border-b border-white/5 flex items-center justify-between">
                      <p className="text-[9px] text-white font-bold">Order items</p>
                      <span className="text-[8px] text-gray-400">{currentOrder.item}</span>
                    </div>
                    <div className="px-2.5 py-1.5 space-y-1.5">
                      {currentOrder.itemsList.slice(0, 3).map((item: any, index: number) => (
                        <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-2 text-[8px]">
                          <span className="text-gray-300 truncate">{item.qty}x {item.name}</span>
                          <span className="text-white font-bold whitespace-nowrap">Tk {Number(item.price * item.qty).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-2.5 py-2 bg-white/[0.03] border-t border-white/5 flex items-center justify-between text-[8px]">
                      <span className="text-gray-400">Delivery fee</span>
                      <span className="text-emerald-400 font-bold">Tk {Number(currentOrder.deliveryFee || 0).toFixed(0)}</span>
                    </div>
                  </div>

                  {simulationStatus === 'store_pending' && !storeReceived ? (
                    <>
                      <div className="bg-[#0b1320] border border-white/10 rounded-xl p-2.5 space-y-1 text-[8px]">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">🕐 Customer placed order</span>
                          <span className="text-white font-bold">{orderPlacedAt || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">🏪 Store received</span>
                          <span className="text-orange-400 font-bold">{storeReceivedAt || '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-[#111c2e] border border-orange-500/30 rounded-xl p-2.5">
                        <div className="flex items-center space-x-2">
                          <CountdownRing seconds={storeCountdown} total={300} size={40} color={storeCountdown <= 30 ? '#ef4444' : '#f97316'} />
                          <div>
                            <p className="text-[8px] font-black text-gray-300 uppercase">Accept within</p>
                            <p className="text-[7px] text-gray-500">5 min · auto-accept at 0s</p>
                          </div>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${storeCountdown <= 30 ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-300'}`}>{storeCountdown <= 30 ? 'Expiring…' : '5 min window'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleStoreReceiveOrder} className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /><span>Accept</span>
                        </button>
                        <button onClick={() => storeRejectOrder(currentOrder)} className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                          <X className="w-3.5 h-3.5" /><span>Reject</span>
                        </button>
                      </div>
                    </>
                  ) : currentOrder.status === 'Completed' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div><p className="text-[9px] font-bold text-white">Delivery completed</p><p className="text-[8px] text-gray-400">The delivery proof was submitted by the driver.</p></div>
                    </div>
                  ) : !storePreparationStarted ? (
                    <button onClick={handleStoreStartPreparation} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /><span>Accept & Start Preparing</span>
                    </button>
                  ) : !storeOrderReady ? (
                    <button onClick={handleStoreOrderReady} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /><span>Mark Order Ready</span>
                    </button>
                  ) : (
                    <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-2.5 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <div><p className="text-[9px] font-bold text-white">Order is ready for pickup</p><p className="text-[8px] text-gray-400">The driver receives this status instantly.</p></div>
                    </div>
                  )}
                </div>
              )}

              {/* STORE ORDER HISTORY OVERLAY */}
              {storeHistoryOpen && (
                <div className="absolute inset-0 z-[70] bg-[#070e17] flex flex-col">
                  <div className="px-3.5 py-3 bg-[#0b1320] border-b border-white/5 flex items-center justify-between">
                    <button onClick={() => setStoreHistoryOpen(false)} className="flex items-center space-x-1 text-gray-300 hover:text-white cursor-pointer">
                      <ArrowLeft className="w-4 h-4" /><span className="text-[10px] font-bold">Back</span>
                    </button>
                    <h4 className="text-sm font-bold text-white">Order History</h4>
                    <div className="w-10"></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {(() => {
                      const myStore = simStores[0]?.name || '';
                      const hist = realOrders.filter(o => o.storeName === myStore && (o.status === 'Completed' || o.status === 'Cancelled') && !isPosOrder(o));
                      const entries = hist;
                      if (!entries.length) {
                        return (
                          <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-1.5">
                            <History className="w-7 h-7 text-gray-600" />
                            <p className="text-[10px] text-white font-black">No order history yet</p>
                            <p className="text-[8px] text-gray-400">Completed and cancelled orders for this store will appear here.</p>
                          </div>
                        );
                      }
                      return entries.map(ord => {
                        return (
                          <div key={ord.id} className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-black text-white font-mono">#{ord.id}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[7px] font-black ${ord.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{ord.status}</span>
                            </div>
                            <p className="text-[8px] text-gray-400">{ord.customerName} · {ord.date} {ord.time ? '· ' + ord.time : ''}</p>
                            <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                              <span className="text-[8px] text-gray-400">Total</span>
                              <span className="text-[9px] font-black text-white">Tk {Number(ord.amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-white/5">
                              <button onClick={() => { setStorePrintOrder(mapOrderToSim(ord)); setStorePrintOpen(true); }} className="px-2 py-1 bg-[#0b1320] border border-white/10 hover:bg-white/10 text-white text-[7.5px] font-black uppercase rounded-lg cursor-pointer flex items-center space-x-1">
                                <Printer className="w-3 h-3 text-orange-400" /><span>Print</span>
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* STORE SUPPORT OVERLAY */}
              {storeSupportOpen && (
                <div className="absolute inset-0 z-[70] bg-[#070e17] flex flex-col">
                  <div className="px-3.5 py-3 bg-[#0b1320] border-b border-white/5 flex items-center justify-between">
                    <button onClick={() => setStoreSupportOpen(false)} className="flex items-center space-x-1 text-gray-300 hover:text-white cursor-pointer">
                      <ArrowLeft className="w-4 h-4" /><span className="text-[10px] font-bold">Back</span>
                    </button>
                    <h4 className="text-sm font-bold text-white">Store Support</h4>
                    <div className="w-10"></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <div className="bg-[#111c2e] border border-white/10 rounded-2xl p-3 flex items-center space-x-2">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center"><Headphones className="w-4 h-4 text-emerald-400" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-white">NexaGo Store Support</p>
                        <p className="text-[8px] text-gray-400">Available 24/7 · Avg reply under 2 min</p>
                      </div>
                    </div>
                    <button onClick={() => { if (showToast) storeShowToast('Calling NexaGo support: +880 9612-345678', 'info'); }} className="w-full bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center space-x-2.5 cursor-pointer hover:bg-white/5">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <div className="text-left"><p className="text-[9px] font-bold text-white">Call Support</p><p className="text-[7.5px] text-gray-400">+880 9612-345678</p></div>
                    </button>
                    <button onClick={() => { if (showToast) storeShowToast('Opening live chat with NexaGo support…', 'success'); }} className="w-full bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center space-x-2.5 cursor-pointer hover:bg-white/5">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <div className="text-left"><p className="text-[9px] font-bold text-white">Live Chat</p><p className="text-[7.5px] text-gray-400">Chat with a support agent</p></div>
                    </button>
                    <button onClick={() => { if (showToast) storeShowToast('Opening FAQ…', 'info'); }} className="w-full bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center space-x-2.5 cursor-pointer hover:bg-white/5">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <div className="text-left"><p className="text-[9px] font-bold text-white">FAQ & Guides</p><p className="text-[7.5px] text-gray-400">How to accept orders, print receipts, payouts</p></div>
                    </button>
                    <div className="bg-[#0b1320] border border-white/10 rounded-xl p-2.5 space-y-1.5">
                      <p className="text-[8px] font-bold text-gray-400 uppercase">Quick help</p>
                      {[
                        ['How do I accept an order?', 'Tap Accept within 5 minutes — it auto-accepts at 0s.'],
                        ['How do I print a receipt?', 'Use the Print button in the live order screen.'],
                        ['When do I get paid?', 'Store payouts settle on Friday via the Pay tab.'],
                      ].map(([q, a]) => (
                        <div key={q} className="border-t border-white/5 pt-1.5 first:border-t-0 first:pt-0">
                          <p className="text-[8.5px] text-white font-bold">{q}</p>
                          <p className="text-[7.5px] text-gray-400">{a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#0b1320] border-t border-white/5 p-2 flex items-center justify-around text-center text-[8px] font-bold text-gray-400 uppercase">
                <span className="text-emerald-400 flex flex-col items-center"><StoreIcon className="w-3.5 h-3.5 mb-0.5" /><span>Orders</span></span>
                <span className="flex flex-col items-center"><Clock className="w-3.5 h-3.5 mb-0.5" /><span>Queue</span></span>
                <span className="flex flex-col items-center"><Settings className="w-3.5 h-3.5 mb-0.5" /><span>Store</span></span>
              </div>
            </div>

            {storeToast && (
              <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-[1100] px-3 py-2 rounded-xl text-[8px] font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[240px] text-center border ${storeToast.type === 'success' ? 'bg-emerald-500/95 border-emerald-300/40' : storeToast.type === 'error' ? 'bg-red-500/95 border-red-300/40' : 'bg-[#111c2e]/95 border-white/10'}`}>
                {storeToast.message}
              </div>
            )}

            {/* STORE RECEIPT PRINTER MODAL - inside the store phone frame */}
            {storePrintOpen && (
              <div id="printable-store-receipt" className="absolute inset-0 z-[1200] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto print:static print:bg-white print:p-0 print:m-0">
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    #printable-store-receipt, #printable-store-receipt * { visibility: visible !important; }
                    #printable-store-receipt {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      background: white !important;
                      color: black !important;
                      box-shadow: none !important;
                    }
                    .no-print { display: none !important; visibility: hidden !important; }
                  }
                `}</style>

                <div className="bg-white text-gray-900 rounded-xl w-full max-w-[250px] shadow-2xl flex flex-col overflow-hidden max-h-[88vh] border border-gray-100 print:border-none print:shadow-none print:max-h-none print:w-full">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between no-print">
                    <div className="flex items-center space-x-2">
                      <Printer className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      <span className="text-[10px] font-black text-gray-800 uppercase tracking-wider">Store Receipt Preview</span>
                    </div>
                    <button onClick={() => setStorePrintOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-all cursor-pointer" title="Close Preview">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 overflow-y-auto flex-1 bg-white font-mono text-[9px] text-black border-b border-dashed border-gray-300 print:overflow-visible print:p-0">
                    <div className="space-y-3">
                      <div className="text-center space-y-1">
                        <div className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center mx-auto text-base font-black">S</div>
                        <p className="text-xs font-black uppercase tracking-wider">{storePrintOrder.storeName}</p>
                        <p className="text-[7.5px] text-gray-500">{storePrintOrder.storeAddress}</p>
                      </div>
                      <div className="border-t border-dashed border-gray-300 pt-2 text-center">
                        <p className="text-[7.5px] text-gray-500 uppercase tracking-widest">Order No.</p>
                        <p className="text-base font-black tracking-wider">#{storePrintOrder.id}</p>
                        <p className="text-[7.5px] text-gray-500">{new Date().toLocaleDateString()} · {storePrintOrder.timestamp || orderPlacedAt || nowTime()}</p>
                      </div>
                      <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5">
                        <p className="text-[7.5px] text-gray-500 uppercase tracking-widest">Customer</p>
                        <p className="font-bold">{storePrintOrder.customerName}</p>
                        <p className="text-gray-600">{storePrintOrder.customerPhone}</p>
                        <p className="text-gray-600">{storePrintOrder.customerAddress}</p>
                      </div>
                      <div className="border-t border-dashed border-gray-300 pt-2">
                        <p className="text-[7.5px] text-gray-500 uppercase tracking-widest mb-1">Items</p>
                        {(storePrintOrder.itemsList || []).map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-0.5">
                            <span className="truncate pr-2">{it.qty}x {it.name}</span>
                            <span className="font-bold whitespace-nowrap">Tk {Number(it.price * it.qty).toFixed(0)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between py-0.5">
                          <span>Delivery fee</span>
                          <span className="font-bold">Tk {Number(storePrintOrder.deliveryFee || 0).toFixed(0)}</span>
                        </div>
                        <div className="flex items-center justify-between py-0.5 border-t border-dashed border-gray-300 mt-1 text-[10px] font-black">
                          <span>TOTAL</span>
                          <span>Tk {Number(storePrintOrder.totalPayable || storePrintOrder.amount || 0).toFixed(2)}</span>
                        </div>
                        <p className="text-[7.5px] text-gray-500 pt-1 uppercase">
                          {/cash|cod/i.test(storePrintOrder.paymentMethod || '') ? 'Payment: Cash (COD)' : 'Payment: Prepaid (PID)'}
                        </p>
                      </div>
                      <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5 text-[7.5px] text-gray-600">
                        <div className="flex justify-between"><span>Customer placed</span><span className="font-bold">{orderPlacedAt || '—'}</span></div>
                        <div className="flex justify-between"><span>Store received</span><span className="font-bold">{storeReceivedAt || '—'}</span></div>
                        <div className="flex justify-between"><span>Driver received</span><span className="font-bold">{driverReceivedAt || '—'}</span></div>
                      </div>
                      <div className="text-center text-[7.5px] text-gray-500 border-t border-dashed border-gray-300 pt-2">
                        Thank you for ordering!<br />Powered by The NexaGo BD
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between no-print">
                    <button onClick={() => setStorePrintOpen(false)} className="px-3 py-1.5 text-[9px] font-bold text-gray-600 rounded-lg cursor-pointer hover:bg-gray-200/60">Close</button>
                    <button onClick={() => window.print()} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase rounded-lg cursor-pointer flex items-center space-x-1.5">
                      <Printer className="w-3 h-3" /><span>Print Receipt</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="h-4 bg-[#060c13] flex items-center justify-center pb-2 z-40 relative">
              <div className="w-24 h-1 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* PHONE 4: STORE ADMIN APP SIDE                           */}
        {/* ======================================================= */}
        <div className="w-[290px] sm:w-[310px] flex flex-col">
          <div className="w-full aspect-[9/19.5] bg-[#050b12] rounded-[48px] border-[10px] border-[#1d2736] relative shadow-2xl flex flex-col overflow-hidden select-none">
            <div className="absolute -left-[4px] top-24 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -left-[4px] top-36 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -right-[4px] top-32 w-[4px] h-16 bg-[#2a3646] rounded-r-md" />
            <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 flex items-center justify-center shadow-lg">
              <div className="w-7 h-1.5 bg-[#1d2736] rounded-full"></div>
            </div>

            <div className="h-10 bg-[#060c13] px-6 pt-3 flex items-center justify-between text-white text-[10px] font-bold z-30 relative">
              <span>11:26</span>
              <span className="text-[8px] text-cyan-400 tracking-wide">STORE ADMIN</span>
              <div className="flex items-center space-x-1.5">
                <Wifi className="w-3 h-3" />
                <Battery className="w-4 h-3" />
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-[#07111d] overflow-hidden">
              <div className="px-3.5 py-3 bg-[#0b1724] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white font-black truncate">{simulationStatus === 'idle' ? (simStores[0]?.name || 'My Store') : currentOrder.storeName}</p>
                    <p className="text-[8px] text-cyan-400 font-bold">Owner control panel</p>
                  </div>
                </div>
                <button onClick={() => openAdminControl('Settings', 'store')} className="p-1.5 text-gray-300 hover:text-white hover:bg-white/5 rounded cursor-pointer" title="Store admin settings">
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${storeAdminTab === 'overview' ? '' : 'hidden'}`}>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2">
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase">Orders</p>
                    <p className="text-lg text-white font-black">{storeAdminOrderCount}</p>
                    <p className="text-[7px] text-emerald-400 font-bold">Live synced</p>
                  </div>
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2">
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase">Revenue</p>
                    <p className="text-lg text-white font-black">Tk {storeAdminRevenue.toFixed(0)}</p>
                    <p className="text-[7px] text-cyan-400 font-bold">Today</p>
                  </div>
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2">
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase">Stock Alerts</p>
                    <p className="text-lg text-white font-black">{lowStockCount}</p>
                    <p className="text-[7px] text-amber-400 font-bold">Needs review</p>
                  </div>
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2">
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase">Payout</p>
                    <p className="text-lg text-white font-black">Tk {Math.round(storeAdminRevenue * 0.82)}</p>
                    <p className="text-[7px] text-emerald-400 font-bold">Ready</p>
                  </div>
                </div>

                <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400 font-bold uppercase">Live Order Control</p>
                      <p className="text-[10px] text-white font-black font-mono">#{simulationStatus === 'idle' || storePickedUp || !!currentOrder.pickedUp || posOrderHiddenFromStore ? '—' : currentOrder.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[7.5px] font-black ${simulationStatus === 'idle' || storePickedUp || !!currentOrder.pickedUp || posOrderHiddenFromStore ? 'bg-gray-500/15 text-gray-400' : storeOrderReady ? 'bg-blue-500/15 text-blue-400' : storePreparationStarted ? 'bg-amber-500/15 text-amber-400' : 'bg-orange-500/15 text-orange-400'}`}>
                      {simulationStatus === 'idle' || storePickedUp || !!currentOrder.pickedUp || posOrderHiddenFromStore ? 'IDLE' : storeOrderReady ? 'READY' : storePreparationStarted ? 'PREPARING' : 'NEW'}
                    </span>
                  </div>
                  {simulationStatus === 'idle' || storePickedUp || !!currentOrder.pickedUp || posOrderHiddenFromStore ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-1.5">
                      <ShoppingBag className="w-6 h-6 text-gray-600" />
                      <p className="text-[9px] text-white font-bold">No active order</p>
                      <p className="text-[8px] text-gray-400">New customer orders will appear here in real time. Picked-up orders move to history.</p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-[18px_1fr] gap-x-2 gap-y-1.5 text-[8px]">
                    <StoreIcon className="w-4 h-4 text-cyan-400" />
                    <div className="min-w-0"><p className="text-white font-bold truncate">{currentOrder.storeName}</p><p className="text-gray-400 truncate">{currentOrder.storeAddress}</p></div>
                    <UserIcon className="w-4 h-4 text-emerald-400" />
                    <div className="min-w-0"><p className="text-white font-bold truncate">{currentOrder.customerName}</p><p className="text-gray-400 truncate">{currentOrder.customerAddress}</p></div>
                  </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleStoreStartPreparation} disabled={simulationStatus === 'idle' || storePreparationStarted} className="py-2 bg-cyan-600 disabled:opacity-40 hover:bg-cyan-700 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1">
                    <Package className="w-3.5 h-3.5" /><span>Start Prep</span>
                  </button>
                  <button onClick={handleStoreOrderReady} disabled={simulationStatus === 'idle' || storeOrderReady} className="py-2 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /><span>Ready</span>
                  </button>
                </div>

                <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] text-white font-bold">Inventory snapshot</p>
                    <span className="text-[7px] text-gray-400">{simProducts.length} SKUs</span>
                  </div>
                  {simProducts.slice(0, 3).map((p) => (
                    <div key={`store-admin-${p.id}`} className="flex items-center justify-between py-1 text-[8px] border-t border-white/5 first:border-t-0">
                      <span className="text-gray-300 truncate">{p.name}</span>
                      <span className={`font-bold ${p.stock <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>{p.stock} left</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${storeAdminTab === 'orders' ? '' : 'hidden'}`}>
                {simulationStatus === 'idle' || storePickedUp || !!currentOrder.pickedUp || posOrderHiddenFromStore ? (
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-1.5">
                    <ShoppingBag className="w-7 h-7 text-gray-600" />
                    <p className="text-[10px] text-white font-black">No orders in queue</p>
                    <p className="text-[8px] text-gray-400">Customer orders will arrive here and in the Order Queue tab.</p>
                  </div>
                ) : (
                <>
                <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400 font-bold uppercase">Order Queue</p>
                      <p className="text-[10px] text-white font-black font-mono">#{currentOrder.id}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-cyan-500/15 text-cyan-400 text-[7.5px] font-black">LIVE</span>
                  </div>
                  <div className="space-y-1.5 text-[8px]">
                    <div className="flex justify-between"><span className="text-gray-400">Customer</span><span className="text-white font-bold truncate ml-2">{currentOrder.customerName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="text-emerald-400 font-bold">{currentOrder.customerPhone || '+880 1712-345678'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Payment</span><span className="text-white font-bold">{currentOrder.paymentMethod}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Total</span><span className="text-orange-300 font-black">Tk {currentOrder.totalPayable.toFixed(0)}</span></div>
                  </div>
                </div>

                <div className="bg-[#111c2e] border border-white/10 rounded-xl overflow-hidden">
                  <div className="px-2.5 py-2 border-b border-white/5 flex items-center justify-between">
                    <p className="text-[9px] text-white font-bold">Kitchen ticket</p>
                    <span className="text-[7px] text-gray-400">{currentOrder.item}</span>
                  </div>
                  <div className="px-2.5 py-1.5 space-y-1.5">
                    {currentOrder.itemsList.map((item: any, index: number) => (
                      <div key={`store-admin-order-item-${item.name}-${index}`} className="flex items-center justify-between gap-2 text-[8px]">
                        <span className="text-gray-300 truncate">{item.qty}x {item.name}</span>
                        <span className="text-white font-bold whitespace-nowrap">Tk {Number(item.price * item.qty).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleStoreStartPreparation} disabled={simulationStatus === 'idle' || storePreparationStarted} className="py-2 bg-cyan-600 disabled:opacity-40 hover:bg-cyan-700 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Accept Order</button>
                  <button onClick={handleStoreOrderReady} disabled={simulationStatus === 'idle' || storeOrderReady} className="py-2 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Ready</button>
                  <button onClick={() => { if (showToast) storeAdminShowToast(`Calling ${currentOrder.customerName}.`, 'info'); }} className="py-2 bg-[#111c2e] border border-white/10 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Call</button>
                  <button onClick={() => { if (showToast) storeAdminShowToast(`Invoice printed for #${currentOrder.id}.`, 'success'); }} className="py-2 bg-[#111c2e] border border-white/10 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Print</button>
                </div>
                </>
                )}
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${storeAdminTab === 'inventory' ? '' : 'hidden'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white font-black">Inventory Control</p>
                    <p className="text-[8px] text-gray-400">{simProducts.length} products synced</p>
                  </div>
                  <button onClick={() => openAdminControl('Products', 'store')} className="px-2 py-1 bg-cyan-600 text-white rounded-lg text-[7px] font-black uppercase cursor-pointer">Add</button>
                </div>
                {simProducts.slice(0, 7).map((p) => (
                  <div key={`store-admin-inventory-${p.id}`} className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] text-white font-bold truncate">{p.name}</p>
                      <p className="text-[7px] text-gray-400">Tk {p.price} - {p.status}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[7px] font-black ${p.stock <= 10 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{p.stock}</span>
                      <button onClick={() => openAdminControl('Inventory', 'store')} className="w-6 h-6 rounded bg-white/5 text-gray-200 flex items-center justify-center cursor-pointer"><SlidersHorizontal className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[7px] font-bold">
                  <button onClick={() => openAdminControl('Inventory', 'store')} className="bg-[#111c2e] border border-white/10 rounded-lg p-2 text-cyan-300">Bulk</button>
                  <button onClick={() => openAdminControl('Inventory', 'store')} className="bg-[#111c2e] border border-white/10 rounded-lg p-2 text-amber-300">Alerts</button>
                  <button onClick={() => openAdminControl('Products', 'store')} className="bg-[#111c2e] border border-white/10 rounded-lg p-2 text-emerald-300">Sync</button>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${storeAdminTab === 'payout' ? '' : 'hidden'}`}>
                <div className="bg-gradient-to-br from-cyan-600 to-emerald-600 rounded-2xl p-3 shadow-lg">
                  <p className="text-[8px] text-cyan-50 font-bold uppercase">Available settlement</p>
                  <p className="text-2xl text-white font-black mt-1">Tk {Math.round(storeAdminRevenue * 0.82)}</p>
                  <p className="text-[8px] text-cyan-50 mt-1">After platform commission and delivery service fee</p>
                </div>
                {[
                  ['Gross sales', `Tk ${storeAdminRevenue.toFixed(0)}`],
                  ['Platform commission', `Tk ${Math.round(storeAdminRevenue * 0.12)}`],
                  ['MFS / payment fee', `Tk ${Math.round(storeAdminRevenue * 0.03)}`],
                  ['Delivery adjustment', `Tk ${Math.round(storeAdminRevenue * 0.03)}`],
                ].map(([label, value]) => (
                  <div key={`store-admin-payout-${label}`} className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-[8px]">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-bold">{value}</span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { if (showToast) storeAdminShowToast('Settlement request sent to Super Admin.', 'success'); }} className="py-2 bg-cyan-600 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Withdraw</button>
                  <button onClick={() => openAdminControl('Payments', 'store')} className="py-2 bg-[#111c2e] border border-white/10 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Statement</button>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${storeAdminTab === 'settings' ? '' : 'hidden'}`}>
                {[
                  ['Store availability', 'Open now', 'emerald'],
                  ['Prep time', '25-30 mins', 'cyan'],
                  ['Delivery radius', '5.8 km', 'orange'],
                  ['COD acceptance', 'Enabled', 'emerald'],
                  ['Owner role', 'Full access', 'cyan'],
                  ['Offer banner', 'Free delivery over Tk 500', 'orange'],
                ].map(([label, value, color]) => (
                  <button key={`store-admin-setting-${label}`} onClick={() => openAdminControl('Settings', 'store')} className="w-full bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-left cursor-pointer hover:border-cyan-500/40">
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{label}</span>
                    <span className={`text-[8px] font-black ${color === 'emerald' ? 'text-emerald-400' : color === 'cyan' ? 'text-cyan-400' : 'text-orange-400'}`}>{value}</span>
                  </button>
                ))}
                <button onClick={() => { if (showToast) storeAdminShowToast('Store admin changes saved.', 'success'); }} className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-[9px] font-black uppercase rounded-xl cursor-pointer">Save Store Admin Settings</button>
              </div>

              <div className="bg-[#0b1320] border-t border-white/5 p-1.5 flex items-center justify-around text-center text-[7px] font-bold text-gray-400 uppercase">
                <button onClick={() => setStoreAdminTab('overview')} className={`${storeAdminTab === 'overview' ? 'text-cyan-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><ShieldCheck className="w-3.5 h-3.5 mb-0.5" /><span>Admin</span></button>
                <button onClick={() => setStoreAdminTab('orders')} className={`${storeAdminTab === 'orders' ? 'text-cyan-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><ShoppingBag className="w-3.5 h-3.5 mb-0.5" /><span>Orders</span></button>
                <button onClick={() => setStoreAdminTab('inventory')} className={`${storeAdminTab === 'inventory' ? 'text-cyan-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><Package className="w-3.5 h-3.5 mb-0.5" /><span>Items</span></button>
                <button onClick={() => setStoreAdminTab('payout')} className={`${storeAdminTab === 'payout' ? 'text-cyan-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><DollarSign className="w-3.5 h-3.5 mb-0.5" /><span>Pay</span></button>
                <button onClick={() => setStoreAdminTab('settings')} className={`${storeAdminTab === 'settings' ? 'text-cyan-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><Settings className="w-3.5 h-3.5 mb-0.5" /><span>Set</span></button>
              </div>
            </div>

            {storeAdminToast && (
              <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-[1100] px-3 py-2 rounded-xl text-[8px] font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[240px] text-center border ${storeAdminToast.type === 'success' ? 'bg-emerald-500/95 border-emerald-300/40' : storeAdminToast.type === 'error' ? 'bg-red-500/95 border-red-300/40' : 'bg-[#111c2e]/95 border-white/10'}`}>
                {storeAdminToast.message}
              </div>
            )}

            <div className="h-4 bg-[#060c13] flex items-center justify-center pb-2 z-40 relative">
              <div className="w-24 h-1 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* PHONE 5: SUPER ADMIN APP SIDE                           */}
        {/* ======================================================= */}
        <div className="w-[290px] sm:w-[310px] flex flex-col">
          <div className="w-full aspect-[9/19.5] bg-[#050b12] rounded-[48px] border-[10px] border-[#1d2736] relative shadow-2xl flex flex-col overflow-hidden select-none">
            <div className="absolute -left-[4px] top-24 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -left-[4px] top-36 w-[4px] h-9 bg-[#2a3646] rounded-l-md" />
            <div className="absolute -right-[4px] top-32 w-[4px] h-16 bg-[#2a3646] rounded-r-md" />
            <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 flex items-center justify-center shadow-lg">
              <div className="w-7 h-1.5 bg-[#1d2736] rounded-full"></div>
            </div>

            <div className="h-10 bg-[#060c13] px-6 pt-3 flex items-center justify-between text-white text-[10px] font-bold z-30 relative">
              <span>11:26</span>
              <span className="text-[8px] text-red-400 tracking-wide">SUPER ADMIN</span>
              <div className="flex items-center space-x-1.5">
                <Wifi className="w-3 h-3" />
                <Battery className="w-4 h-3" />
              </div>
            </div>

            <div className="flex-1 relative flex flex-col bg-[#0b1018] overflow-hidden">
              <div className="px-3.5 py-3 bg-[#121822] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSuperAdminSidebarOpen(true)}
                    className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white cursor-pointer"
                    title="Open admin menu"
                    aria-label="Open admin menu"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white font-black truncate">The NexaGo BD</p>
                    <p className="text-[8px] text-red-300 font-bold truncate">{superAdminModule || 'Platform command center'}</p>
                  </div>
                </div>
                <button onClick={() => openAdminControl('Settings', 'super_admin')} className="p-1.5 text-gray-300 hover:text-white hover:bg-white/5 rounded cursor-pointer" title="Security console">
                  <Bell className="w-4 h-4" />
                </button>
              </div>

              {superAdminSidebarOpen && (
                <div className="absolute inset-0 z-[70] flex bg-black/70">
                  <aside className="w-[84%] h-full bg-[#0b1320] border-r border-white/10 flex flex-col shadow-2xl">
                    <div className="px-3 py-3 bg-[#121822] border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center text-white shrink-0">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-white font-black truncate">Super Admin System</p>
                          <p className="text-[7px] text-gray-400 font-bold">All pages & controls</p>
                        </div>
                      </div>
                      <button onClick={() => setSuperAdminSidebarOpen(false)} className="w-7 h-7 rounded-lg bg-white/5 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer" aria-label="Close admin menu">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-3">
                      <div className="space-y-1">
                        <p className="px-2 pt-1 text-[7px] text-gray-500 font-black uppercase">Dashboard</p>
                        {[
                          ['Dashboard', 'overview', Shield],
                          ['Orders', 'orders', ShoppingBag],
                          ['Users', 'users', UserIcon],
                          ['Finance', 'finance', Wallet],
                          ['Security & Rules', 'security', SlidersHorizontal],
                        ].map(([label, tabName, Icon]) => (
                          <button
                            key={`super-admin-sidebar-${String(label)}`}
                            onClick={() => {
                              setSuperAdminModule(null);
                              setSuperAdminTab(tabName as 'overview' | 'orders' | 'users' | 'finance' | 'security');
                              setSuperAdminSidebarOpen(false);
                            }}
                            className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-left cursor-pointer ${superAdminTab === tabName && !superAdminModule ? 'bg-red-500/15 text-red-300' : 'text-gray-300 hover:bg-white/5'}`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[8px] font-bold">{String(label)}</span>
                          </button>
                        ))}
                      </div>

                      {superAdminControlGroups.map((group) => (
                        <div key={`super-admin-sidebar-group-${group.title}`} className="space-y-1">
                          <div className="px-2 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${group.tone === 'orange' ? 'bg-orange-500' : group.tone === 'cyan' ? 'bg-cyan-500' : group.tone === 'emerald' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <p className="text-[7px] text-gray-500 font-black uppercase">{group.title}</p>
                          </div>
                          {group.controls.map(([name, , badge]) => (
                            <button
                              key={`super-admin-sidebar-control-${String(name)}`}
                              onClick={() => {
                                openAdminControl(String(name));
                                setSuperAdminSidebarOpen(false);
                              }}
                              className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-left cursor-pointer ${superAdminModule === name ? 'bg-red-500/15 text-red-300' : 'text-gray-300 hover:bg-white/5'}`}
                            >
                              <span className="text-[8px] font-bold truncate">{String(name)}</span>
                              <span className="text-[6.5px] text-gray-500 font-black shrink-0">{String(badge)}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </aside>
                  <button className="flex-1 h-full cursor-default" onClick={() => setSuperAdminSidebarOpen(false)} aria-label="Close admin menu overlay" />
                </div>
              )}

              {adminNotice && (
                <div className="mx-3 mt-2 px-2.5 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center gap-2 text-[7.5px] text-emerald-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{adminNotice}</span>
                </div>
              )}

              <div ref={superAdminOverviewRef} className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${superAdminTab === 'overview' ? '' : 'hidden'}`}>
                <div className={superAdminModule ? 'hidden' : 'grid grid-cols-2 gap-2'}>
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2">
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase">Active Orders</p>
                    <p className="text-lg text-white font-black">{platformActiveOrders}</p>
                    <p className="text-[7px] text-orange-400 font-bold">Live</p>
                  </div>
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2">
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase">Online Riders</p>
                    <p className="text-lg text-white font-black">{onlineDriverCount}</p>
                    <p className="text-[7px] text-emerald-400 font-bold">Dispatch ready</p>
                  </div>
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2">
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase">Stores</p>
                    <p className="text-lg text-white font-black">{simStores.length}</p>
                    <p className="text-[7px] text-cyan-400 font-bold">Connected</p>
                  </div>
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2">
                    <p className="text-[7.5px] text-gray-400 font-bold uppercase">GMV</p>
                    <p className="text-lg text-white font-black">Tk {realOrders.reduce((sum, o) => sum + o.amount, 0).toFixed(0)}</p>
                    <p className="text-[7px] text-red-300 font-bold">Today</p>
                  </div>
                </div>

                <div className={`${superAdminModule ? 'hidden' : ''} bg-[#111c2e] border border-white/10 rounded-xl p-2.5 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400 font-bold uppercase">Live Platform Order</p>
                      <p className="text-[10px] text-white font-black font-mono">#{simulationStatus === 'idle' ? '—' : currentOrder.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[7.5px] font-black ${simulationStatus === 'idle' ? 'bg-gray-500/15 text-gray-400' : currentOrder.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'}`}>
                      {simulationStatus === 'idle' ? 'IDLE' : currentOrder.status}
                    </span>
                  </div>
                  {simulationStatus === 'idle' ? (
                    <div className="flex flex-col items-center justify-center py-5 text-center space-y-1.5">
                      <Package className="w-6 h-6 text-gray-600" />
                      <p className="text-[9px] text-white font-bold">No live order</p>
                      <p className="text-[8px] text-gray-400">New orders will stream here instantly.</p>
                    </div>
                  ) : (
                  <div className="space-y-1.5">
                    {[
                      ['Customer', currentOrder.customerName, 'emerald'],
                      ['Store', currentOrder.storeName, 'cyan'],
                      ['Driver', simTrackVeh?.name || driverStats.name, 'orange'],
                      ['Admin', 'Order visible in control center', 'red'],
                    ].map(([label, value, color]) => (
                      <div key={`super-admin-${label}`} className="flex items-center justify-between text-[8px] border-t border-white/5 pt-1 first:border-t-0 first:pt-0">
                        <span className="text-gray-400">{label}</span>
                        <span className={`font-bold truncate ml-2 ${color === 'emerald' ? 'text-emerald-400' : color === 'cyan' ? 'text-cyan-400' : color === 'orange' ? 'text-orange-400' : 'text-red-300'}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                <div className={`${superAdminModule ? 'hidden' : ''} bg-red-500/10 border border-red-500/25 rounded-xl p-2.5`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
                    <div>
                      <p className="text-[9px] text-white font-bold">Risk & approvals</p>
                      <p className="text-[7px] text-gray-400">Driver reports, store admins, payment review</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[7px] font-bold">
                    <div className="bg-[#111c2e] rounded-lg p-1.5"><p className="text-red-300">0</p><p className="text-gray-400">Reports</p></div>
                    <div className="bg-[#111c2e] rounded-lg p-1.5"><p className="text-amber-300">{lowStockCount}</p><p className="text-gray-400">Stock</p></div>
                    <div className="bg-[#111c2e] rounded-lg p-1.5"><p className="text-emerald-300">OK</p><p className="text-gray-400">System</p></div>
                  </div>
                </div>

                <div className={superAdminModule ? 'hidden' : 'grid grid-cols-2 gap-2'}>
                  <button onClick={() => openAdminControl('Notifications', 'super_admin')} className="py-2 bg-red-600 hover:bg-red-700 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1">
                    <Send className="w-3.5 h-3.5" /><span>Broadcast</span>
                  </button>
                  <button onClick={() => openAdminControl('Reports & Analytics', 'super_admin')} className="py-2 bg-[#111c2e] border border-white/10 hover:bg-white/10 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1">
                    <Eye className="w-3.5 h-3.5" /><span>Audit</span>
                  </button>
                </div>

                {superAdminModule && (
                  <div className="min-h-full bg-[#111c2e] border border-red-500/30 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] text-white font-black truncate">{superAdminModule}</p>
                        <p className="text-[7px] text-red-300 font-bold">Real in-app control view</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {adminAddableModules.has(superAdminModule) && (
                          <button
                            onClick={() => setAdminCreateOpen(value => !value)}
                            className="px-2 py-1 bg-red-600 text-white rounded-lg text-[7px] font-black uppercase cursor-pointer flex items-center gap-1"
                            aria-label={`Add new ${superAdminModule}`}
                          >
                            <Plus className="w-3 h-3" />Add
                          </button>
                        )}
                        <button onClick={() => { setAdminCreateOpen(false); setSuperAdminModule(null); }} className="px-2 py-1 bg-white/5 border border-white/10 text-gray-200 rounded-lg text-[7px] font-black uppercase cursor-pointer flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Back</button>
                      </div>
                    </div>

                    {adminCreateOpen && adminAddableModules.has(superAdminModule) && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] text-white font-black">Add New</p>
                          <span className="text-[6.5px] text-red-300 font-bold">Saves to main system</span>
                        </div>
                        <input
                          value={adminCreateName}
                          onChange={event => setAdminCreateName(event.target.value)}
                          placeholder={superAdminModule === 'Vehicles Management' ? 'Plate number' : superAdminModule === 'Coupons' ? 'Coupon code' : superAdminModule.includes('Payment') || superAdminModule.includes('Settlement') || superAdminModule.includes('Payout') ? 'Order / reference ID' : 'Name / title'}
                          className="w-full bg-[#0b1320] border border-white/10 rounded-lg px-2 py-2 text-[8px] text-white outline-none focus:border-red-500 placeholder:text-gray-600"
                        />
                        <input
                          value={adminCreateDetail}
                          onChange={event => setAdminCreateDetail(event.target.value)}
                          placeholder={superAdminModule === 'Products' || superAdminModule === 'Inventory' || superAdminModule.includes('Payment') || superAdminModule.includes('Settlement') || superAdminModule.includes('Payout') ? 'Amount' : 'Phone / address / details'}
                          className="w-full bg-[#0b1320] border border-white/10 rounded-lg px-2 py-2 text-[8px] text-white outline-none focus:border-red-500 placeholder:text-gray-600"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <button onClick={() => { setAdminCreateOpen(false); setAdminCreateName(''); setAdminCreateDetail(''); }} className="py-2 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-[7px] font-black uppercase">Cancel</button>
                          <button onClick={createAdminRecord} className="py-2 bg-emerald-600 text-white rounded-lg text-[7px] font-black uppercase flex items-center justify-center gap-1"><Check className="w-3 h-3" />Save</button>
                        </div>
                      </div>
                    )}

                    {/(Order|Dashboard|Simulator)/.test(superAdminModule) && (
                      <div className="space-y-2">
                        {simulationStatus === 'idle' ? (
                          <div className="bg-[#0b1320] border border-white/10 rounded-lg p-2.5 text-[8px]">
                            <p className="text-gray-400 font-bold">No active order right now</p>
                            <p className="text-[7px] text-gray-500 mt-0.5">A dispatched delivery will appear here automatically.</p>
                          </div>
                        ) : (
                        <>
                        <div className="bg-[#0b1320] border border-white/10 rounded-lg p-2 text-[8px] space-y-1">
                          <div className="flex justify-between"><span className="text-gray-400">Order</span><span className="text-white font-bold">#{currentOrder.id}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Store</span><span className="text-cyan-400 font-bold truncate ml-2">{currentOrder.storeName}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Driver</span><span className="text-orange-400 font-bold truncate ml-2">{simTrackVeh?.name || driverStats.name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Status</span><span className="text-emerald-400 font-bold">{currentOrder.status}</span></div>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {(['Confirmed', 'Processing', 'Ongoing'] as Order['status'][]).map(st => (
                            <button key={`admin-status-${st}`} onClick={() => updateAdminOrderStatus(st)} className="py-1.5 bg-[#0b1320] border border-white/10 text-white rounded-lg text-[7px] font-black uppercase cursor-pointer">{st}</button>
                          ))}
                          <button onClick={() => updateAdminOrderStatus('Completed')} className="py-1.5 bg-emerald-600 text-white rounded-lg text-[7px] font-black uppercase cursor-pointer">Complete</button>
                          <button onClick={() => updateAdminOrderStatus('Cancelled')} className="py-1.5 bg-red-600 text-white rounded-lg text-[7px] font-black uppercase cursor-pointer">Cancel</button>
                          <button onClick={handleAdminReturnToStore} className="py-1.5 bg-amber-600 text-white rounded-lg text-[7px] font-black uppercase cursor-pointer">Return to Store</button>
                          <button onClick={() => openAdminControl('Payments', 'super_admin')} className="py-1.5 bg-[#0b1320] border border-white/10 text-white rounded-lg text-[7px] font-black uppercase cursor-pointer">Pay</button>
                        </div>
                        </>
                        )}
                      </div>
                    )}

                    {(superAdminModule === 'Products' || superAdminModule === 'Inventory') && (
                      <div className="space-y-1.5">
                        {simProducts.slice(0, 4).map(p => (
                          <div key={`admin-module-product-${p.id}`} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[8px] text-white font-bold truncate">{p.name}</p>
                              <p className="text-[7px] text-gray-400">Tk {p.price} - {p.status}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => updateAdminProductStock(p.id, -1)} className="w-5 h-5 rounded bg-white/5 text-gray-200 flex items-center justify-center cursor-pointer"><Minus className="w-3 h-3" /></button>
                              <span className={`w-7 text-center text-[7px] font-black ${p.stock <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>{p.stock}</span>
                              <button onClick={() => updateAdminProductStock(p.id, 1)} className="w-5 h-5 rounded bg-white/5 text-gray-200 flex items-center justify-center cursor-pointer"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Drivers Management' && (
                      <div className="space-y-1.5">
                        {(realDrivers.length ? realDrivers : [{ id: driverStats.id, name: driverStats.name, status: 'Online', phone: driverStats.phone, vehicleType: driverStats.vehicle, rating: driverStats.rating, completedOrders: driverStats.completedCount, earnings: driverStats.todayEarnings } as Driver]).slice(0, 4).map(d => (
                          <div key={`admin-module-driver-${d.id}`} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[8px] text-white font-bold truncate">{d.name}</p>
                              <p className="text-[7px] text-gray-400">{d.vehicleType} - {d.status}</p>
                            </div>
                            <button onClick={() => toggleAdminDriverDuty(d.id)} className={`px-2 py-1 rounded text-[7px] font-black uppercase cursor-pointer ${d.status === 'Offline' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>{d.status === 'Offline' ? 'Online' : 'Off'}</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Users Management' && (
                      <div className="space-y-1.5">
                        {users.slice(0, 6).map(user => (
                          <div key={user.id} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0"><p className="text-[8px] text-white font-bold truncate">{user.name}</p><p className="text-[7px] text-gray-400 truncate">{user.role} - {user.phone}</p></div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => toggleAdminUser(user.id)} className={`px-2 py-1 rounded text-[7px] font-black uppercase ${user.status === 'Active' ? 'bg-red-600' : 'bg-emerald-600'} text-white`}>{user.status === 'Active' ? 'Suspend' : 'Activate'}</button>
                              <button onClick={() => deleteAdminUser(user.id)} className="w-5 h-5 rounded bg-white/5 text-red-300 flex items-center justify-center" aria-label={`Delete ${user.name}`}><X className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Zones & Areas' && (
                      <div className="space-y-1.5">
                        {zones.slice(0, 6).map(zone => (
                          <div key={zone.id} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                            <div><p className="text-[8px] text-white font-bold">{zone.name}</p><p className="text-[7px] text-gray-400">Fee Tk {zone.deliveryFee || 0} - {zone.activeDrivers || 0} riders</p></div>
                            <button onClick={() => toggleAdminZone(zone.id)} className={`px-2 py-1 rounded text-[7px] font-black ${zone.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-300'}`}>{zone.status}</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Vehicles Management' && (
                      <div className="space-y-1.5">
                        {vehicles.slice(0, 6).map(vehicle => (
                          <div key={vehicle.id} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                            <div><p className="text-[8px] text-white font-bold">{vehicle.plateNumber}</p><p className="text-[7px] text-gray-400">{vehicle.type} - {vehicle.driverName}</p></div>
                            <button onClick={() => cycleAdminVehicle(vehicle.id)} className="px-2 py-1 rounded bg-orange-500/15 text-orange-300 text-[7px] font-black">{vehicle.status}</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Promotions & Banners' && (
                      <div className="space-y-1.5">
                        {banners.slice(0, 6).map(banner => (
                          <div key={banner.id} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0"><p className="text-[8px] text-white font-bold truncate">{banner.title}</p><p className="text-[7px] text-gray-400">{banner.clicks} clicks - {banner.endDate}</p></div>
                            <button onClick={() => toggleAdminBanner(banner.id)} className="px-2 py-1 rounded bg-red-500/15 text-red-300 text-[7px] font-black">{banner.status}</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(superAdminModule === 'Store Dashboard' || superAdminModule === 'Stores & Merchants') && (
                      <div className="space-y-1.5">
                        {simStores.slice(0, 6).map(store => (
                          <div key={store.id} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0"><p className="text-[8px] text-white font-bold truncate">{store.name}</p><p className="text-[7px] text-gray-400 truncate">{store.address} - {store.orders} orders</p></div>
                            <button onClick={() => toggleAdminStore(store.id)} className={`px-2 py-1 rounded text-[7px] font-black ${store.status === 'Active' || store.status === 'Open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-300'}`}>{store.status}</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Categories' && (
                      <div className="space-y-1.5">
                        {categories.slice(0, 7).map(category => (
                          <button key={category.id} onClick={() => toggleAdminCategory(category.id)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between text-left">
                            <span className="text-[8px] text-white font-bold">{category.name}</span><span className="text-[7px] text-cyan-300">{category.itemsCount} - {category.status}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Coupons' && (
                      <div className="space-y-1.5">
                        {coupons.slice(0, 7).map(coupon => (
                          <button key={coupon.id} onClick={() => toggleAdminCoupon(coupon.id)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between text-left">
                            <div><p className="text-[8px] text-white font-black">{coupon.code}</p><p className="text-[7px] text-gray-400">{coupon.discount} - Min Tk {coupon.minOrder}</p></div><span className="text-[7px] text-emerald-300">{coupon.status}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Reviews' && (
                      <div className="space-y-1.5">
                        {reviews.slice(0, 6).map(review => (
                          <div key={review.id} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 space-y-1">
                            <div className="flex justify-between"><span className="text-[8px] text-white font-bold">{review.customer}</span><span className="text-[7px] text-amber-300">{review.rating}/5</span></div>
                            <p className="text-[7px] text-gray-400 line-clamp-2">{review.comment}</p>
                            <button onClick={() => moderateAdminReview(review.id)} className="text-[7px] text-red-300 font-black">Remove</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Staff Management' && (
                      <div className="space-y-1.5">
                        {staff.slice(0, 6).map(member => (
                          <button key={member.id} onClick={() => toggleAdminStaff(member.id)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between text-left">
                            <div><p className="text-[8px] text-white font-bold">{member.name}</p><p className="text-[7px] text-gray-400">{member.role} - {member.shift}</p></div><span className="text-[7px] text-cyan-300">{member.status}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Marketing' && (
                      <div className="space-y-1.5">
                        {marketing.slice(0, 6).map(campaign => (
                          <button key={campaign.id} onClick={() => toggleAdminMarketing(campaign.id)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between text-left">
                            <div className="min-w-0"><p className="text-[8px] text-white font-bold truncate">{campaign.title}</p><p className="text-[7px] text-gray-400">Tk {campaign.budget} - {campaign.clicks} clicks</p></div><span className="text-[7px] text-red-300">{campaign.status}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {(superAdminModule === 'Payments' || superAdminModule === 'MFS Business & Settlement') && (
                      <div className="space-y-1.5">
                        {payments.slice(0, 7).map(payment => (
                          <button key={payment.id} onClick={() => cycleAdminPayment(payment.id)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between text-left">
                            <div><p className="text-[8px] text-white font-bold">{payment.id}</p><p className="text-[7px] text-gray-400">{payment.method} - #{payment.orderId}</p></div><div className="text-right"><p className="text-[8px] text-white font-black">Tk {payment.amount}</p><p className="text-[7px] text-emerald-300">{payment.status}</p></div>
                          </button>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Earnings & Payouts' && (
                      <div className="space-y-1.5">
                        {realDrivers.slice(0, 7).map(driver => (
                          <div key={driver.id} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between"><div><p className="text-[8px] text-white font-bold">{driver.name}</p><p className="text-[7px] text-gray-400">{driver.completedOrders} deliveries</p></div><span className="text-[9px] text-emerald-300 font-black">Tk {driver.earnings}</span></div>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'POS System' && (
                      <div className="space-y-2">
                        <div className="bg-[#0b1320] border border-white/10 rounded-lg p-2 text-[8px] space-y-1"><div className="flex justify-between"><span className="text-gray-400">Item</span><span className="text-white">{simProducts[0]?.name || 'Counter Item'}</span></div><div className="flex justify-between"><span className="text-gray-400">Total</span><span className="text-emerald-300 font-black">Tk {250 + adminBaseFee}</span></div></div>
                        <button onClick={createAdminPosOrder} className="w-full py-2 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-lg">Create Live POS Order</button>
                      </div>
                    )}

                    {superAdminModule === 'Support Tickets' && (
                      <div className="space-y-1.5">
                        {supportTickets.slice(0, 7).map(ticket => (
                          <button key={ticket.id} onClick={() => cycleAdminTicket(ticket.id)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between text-left"><div className="min-w-0"><p className="text-[8px] text-white font-bold truncate">{ticket.subject}</p><p className="text-[7px] text-gray-400">{ticket.user} - {ticket.priority}</p></div><span className="text-[7px] text-orange-300">{ticket.status}</span></button>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Support & Help Desk' && (
                      <div className="space-y-1.5">
                        <div className="bg-[#0b1320] border border-white/10 rounded-lg p-2">
                          <p className="text-[8px] text-white font-black">Resolve customer concerns, order disputes, and driver assistance requests</p>
                          <p className="text-[7px] text-gray-400 mt-0.5">Pick a category below to open the relevant help desk queue.</p>
                        </div>
                        {[
                          { id: 'customers', label: 'Customer Concerns', desc: 'Complaints, refunds, cashback & delivery issues', icon: '😟', tone: 'text-blue-300' },
                          { id: 'disputes', label: 'Order Disputes', desc: 'Wrong item, missing order, pricing & cancellation conflicts', icon: '⚖️', tone: 'text-amber-300' },
                          { id: 'drivers', label: 'Driver Assistance', desc: 'Rider support, route issues, payouts & account help', icon: '🛵', tone: 'text-orange-300' },
                        ].map(cat => (
                          <button key={cat.id} onClick={() => { setHelpDeskCategory(cat.id); if (showToast) superAdminShowToast(`${cat.label} help desk opened`, 'info'); }} className="w-full bg-[#111c2e] border border-white/10 rounded-lg p-2.5 flex items-start gap-2 text-left cursor-pointer hover:border-emerald-500/40">
                            <span className={`text-sm ${cat.tone}`}>{cat.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[8.5px] text-white font-black">{cat.label}</p>
                              <p className="text-[7px] text-gray-400">{cat.desc}</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-500 shrink-0 mt-0.5" />
                          </button>
                        ))}
                        {helpDeskCategory && (
                          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[8px] text-emerald-300 font-black uppercase">{['customers', 'disputes', 'drivers'].find(c => c === helpDeskCategory) === 'customers' ? 'Customer Concerns' : ['customers', 'disputes', 'drivers'].find(c => c === helpDeskCategory) === 'disputes' ? 'Order Disputes' : 'Driver Assistance'} — Queue</p>
                              <button onClick={() => setHelpDeskCategory(null)} className="text-[7px] text-gray-400 font-bold cursor-pointer">✕ Close</button>
                            </div>
                            {supportTickets.filter(t => helpDeskCategory === 'drivers' ? t.user.toLowerCase().includes('driver') : helpDeskCategory === 'disputes' ? /refund|cancel|wrong|missing|dispute|pricing/i.test(t.subject) : !/driver|refund|cancel|wrong|missing|dispute|pricing/i.test(t.subject)).slice(0, 5).map(ticket => (
                              <button key={ticket.id} onClick={() => cycleAdminTicket(ticket.id)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between text-left">
                                <div className="min-w-0"><p className="text-[8px] text-white font-bold truncate">{ticket.subject}</p><p className="text-[7px] text-gray-400">{ticket.user} · {ticket.date}</p></div>
                                <span className={`text-[6.5px] px-1.5 py-0.5 rounded font-black ${ticket.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-300' : ticket.status === 'In Progress' ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'}`}>{ticket.status}</span>
                              </button>
                            ))}
                            {supportTickets.filter(t => helpDeskCategory === 'drivers' ? t.user.toLowerCase().includes('driver') : helpDeskCategory === 'disputes' ? /refund|cancel|wrong|missing|dispute|pricing/i.test(t.subject) : !/driver|refund|cancel|wrong|missing|dispute|pricing/i.test(t.subject)).length === 0 && (
                              <p className="text-[7.5px] text-gray-400 text-center py-1">No tickets in this queue right now.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}


                    {superAdminModule === 'Notifications' && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1"><input value={adminBroadcastText} onChange={event => setAdminBroadcastText(event.target.value)} placeholder="Broadcast message" className="min-w-0 flex-1 bg-[#0b1320] border border-white/10 rounded-lg px-2 text-[8px] text-white outline-none" /><button onClick={sendAdminBroadcast} className="px-2 py-2 bg-red-600 text-white rounded-lg"><Send className="w-3 h-3" /></button></div>
                        {notifications.slice(0, 6).map(notification => (
                          <button key={notification.id} onClick={() => markAdminNotification(notification.id)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 text-left"><div className="flex justify-between gap-2"><span className="text-[8px] text-white font-bold truncate">{notification.title}</span><span className={`w-2 h-2 rounded-full shrink-0 ${notification.read ? 'bg-gray-600' : 'bg-red-500'}`} /></div><p className="text-[7px] text-gray-400 truncate">{notification.message}</p></button>
                        ))}
                      </div>
                    )}

                    {superAdminModule === 'Chat Monitoring' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[7px] text-gray-400 uppercase font-black tracking-wide">Live customer ↔ driver messages</p>
                          <span className="text-[7px] text-emerald-300 font-black">{chatLog.length} messages logged</span>
                        </div>
                        {chatLog.length === 0 && (
                          <div className="bg-[#0b1320] border border-white/10 rounded-lg p-3 text-center text-[8px] text-gray-400">No chat messages yet. Start a conversation in the Customer or Driver app.</div>
                        )}
                        {[...chatLog].reverse().map((log, idx) => (
                          <div key={`chat-log-${idx}`} className="bg-[#0b1320] border border-white/10 rounded-lg p-2 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${log.sender === 'driver' ? 'bg-orange-500/15 text-orange-300' : 'bg-blue-500/15 text-blue-300'}`}>
                                {log.sender === 'driver' ? 'Driver' : 'Customer'}{log.name ? ` · ${log.name}` : ''}
                              </span>
                              <span className="text-[6.5px] text-gray-500 font-bold">{log.time}{log.orderId ? ` · #${log.orderId}` : ''}</span>
                            </div>
                            {log.image ? (
                              <img src={log.image} alt="Chat photo" className="rounded-md w-full max-w-[140px] h-auto object-cover border border-white/10" />
                            ) : (
                              <p className="text-[8px] text-white leading-relaxed">{log.text}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}


                    {superAdminModule === 'Reports & Analytics' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {[['Orders', realOrders.length], ['Completed', realOrders.filter(order => order.status === 'Completed').length], ['GMV', `Tk ${realOrders.reduce((sum, order) => sum + order.amount, 0)}`], ['Drivers', realDrivers.length], ['Stores', simStores.length], ['Tickets', supportTickets.filter(ticket => ticket.status !== 'Resolved').length]].map(([label, value]) => <div key={String(label)} className="bg-[#0b1320] border border-white/10 rounded-lg p-2"><p className="text-[7px] text-gray-400">{label}</p><p className="text-[11px] text-white font-black">{value}</p></div>)}
                      </div>
                    )}

                    {superAdminModule === 'Settings' && (
                      <div className="space-y-2">
                        <label className="block text-[7px] text-gray-400">Base delivery fee<input type="number" value={adminBaseFee} onChange={event => setAdminBaseFee(Number(event.target.value))} className="mt-1 w-full bg-[#0b1320] border border-white/10 rounded-lg px-2 py-2 text-[9px] text-white outline-none" /></label>
                        <button onClick={() => setAdminMaintenance(value => !value)} className="w-full bg-[#0b1320] border border-white/10 rounded-lg p-2 flex items-center justify-between text-[8px]"><span className="text-white">Maintenance mode</span><span className={adminMaintenance ? 'text-red-300' : 'text-emerald-300'}>{adminMaintenance ? 'ON' : 'OFF'}</span></button>
                        <button onClick={saveAdminSettings} className="w-full py-2 bg-red-600 text-white text-[8px] font-black uppercase rounded-lg">Save & Apply</button>
                      </div>
                    )}
                  </div>
                )}

                <div className={`${superAdminModule ? 'hidden' : ''} bg-[#111c2e] border border-white/10 rounded-xl p-2.5 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-white font-black">All Control Hub</p>
                      <p className="text-[7px] text-gray-400">Every existing admin feature inside this app</p>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-red-500/15 text-red-300 text-[7px] font-black">
                      {superAdminControlGroups.reduce((sum, group) => sum + group.controls.length, 0)} Controls
                    </span>
                  </div>

                  {superAdminControlGroups.map((group) => (
                    <div key={`super-admin-group-${group.title}`} className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${group.tone === 'orange' ? 'bg-orange-500' : group.tone === 'cyan' ? 'bg-cyan-500' : group.tone === 'emerald' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <p className="text-[7.5px] text-gray-300 font-black uppercase">{group.title}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {group.controls.map(([name, desc, badge]) => (
                          <button
                            key={`super-admin-control-${name}`}
                            onClick={() => openAdminControl(String(name))}
                            className="w-full bg-[#0b1320] border border-white/10 hover:border-red-500/40 rounded-lg p-2 flex items-center justify-between gap-2 text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
<div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${group.tone === 'orange' ? 'bg-orange-500/15 text-orange-400' : group.tone === 'cyan' ? 'bg-cyan-500/15 text-cyan-400' : group.tone === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-300'}`}>
{group.tone === 'orange' ? <Truck className="w-3.5 h-3.5" /> : group.tone === 'cyan' ? <StoreIcon className="w-3.5 h-3.5" /> : group.tone === 'emerald' ? <MessageSquare className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[8px] text-white font-bold truncate">{String(name)}</p>
                                <p className="text-[6.8px] text-gray-500 truncate">{String(desc)}</p>
                              </div>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black shrink-0 ${group.tone === 'orange' ? 'bg-orange-500/15 text-orange-400' : group.tone === 'cyan' ? 'bg-cyan-500/15 text-cyan-400' : group.tone === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-300'}`}>{String(badge)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${superAdminTab === 'orders' ? '' : 'hidden'}`}>
                {simulationStatus === 'idle' ? (
                  <div className="bg-[#111c2e] border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-1.5">
                    <Package className="w-7 h-7 text-gray-600" />
                    <p className="text-[10px] text-white font-black">No orders in the system</p>
                    <p className="text-[8px] text-gray-400">Global order control will show live orders here.</p>
                  </div>
                ) : (
                <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-400 font-bold uppercase">Global Order Control</p>
                      <p className="text-[10px] text-white font-black font-mono">#{currentOrder.id}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-orange-500/15 text-orange-400 text-[7.5px] font-black">{currentOrder.status}</span>
                  </div>
                  <div className="grid grid-cols-[18px_1fr] gap-x-2 gap-y-1.5 text-[8px]">
                    <UserIcon className="w-4 h-4 text-emerald-400" />
                    <div className="min-w-0"><p className="text-white font-bold truncate">{currentOrder.customerName}</p><p className="text-gray-400 truncate">{currentOrder.customerAddress}</p></div>
                    <StoreIcon className="w-4 h-4 text-cyan-400" />
                    <div className="min-w-0"><p className="text-white font-bold truncate">{currentOrder.storeName}</p><p className="text-gray-400 truncate">{currentOrder.storeAddress}</p></div>
                    <Truck className="w-4 h-4 text-orange-400" />
                    <div className="min-w-0"><p className="text-white font-bold truncate">{simTrackVeh?.name || driverStats.name}</p><p className="text-gray-400 truncate">{driverDeliveryStage}</p></div>
                  </div>
                </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => openAdminControl('Orders Management', 'delivery')} className="py-2 bg-red-600 hover:bg-red-700 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Dispatch</button>
                  <button onClick={() => openAdminControl('Payments', 'super_admin')} className="py-2 bg-[#111c2e] border border-white/10 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Refund</button>
                  <button onClick={() => openAdminControl('Notifications', 'super_admin')} className="py-2 bg-[#111c2e] border border-white/10 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Notify Store</button>
                  <button onClick={() => openAdminControl('Zones & Areas', 'delivery')} className="py-2 bg-[#111c2e] border border-white/10 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Route Audit</button>
                </div>

                <div className="space-y-1.5">
                  {realOrders.slice(-4).reverse().map((ord) => (
                    <button key={`super-order-${ord.id}`} onClick={() => { if (showToast) superAdminShowToast(`Opened order #${ord.id}.`, 'info'); }} className="w-full bg-[#111c2e] border border-white/10 rounded-xl p-2 flex items-center justify-between text-left cursor-pointer">
                      <div className="min-w-0"><p className="text-[8px] text-white font-bold truncate">#{ord.id} - {ord.storeName}</p><p className="text-[7px] text-gray-400 truncate">{ord.customerName}</p></div>
                      <span className="text-[7px] text-orange-300 font-black">{ord.status}</span>
                    </button>
                  ))}
                  {!realOrders.length && <div className="bg-[#111c2e] border border-white/10 rounded-xl p-2 text-[8px] text-gray-400">No saved platform orders yet. Trigger a customer order to populate the queue.</div>}
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${superAdminTab === 'users' ? '' : 'hidden'}`}>
                {[
                  ['Customers', `${Math.max(realOrders.length, 1)} active`, 'emerald'],
                  ['Drivers', `${onlineDriverCount} online`, 'orange'],
                  ['Stores', `${simStores.length} connected`, 'cyan'],
                  ['Store Admins', `${simStores.length} owners`, 'red'],
                  ['Support Agents', '4 available', 'emerald'],
                ].map(([label, value, color]) => (
                  <div key={`super-user-${label}`} className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="min-w-0"><p className="text-[9px] text-white font-bold">{label}</p><p className="text-[7px] text-gray-400">{value}</p></div>
                    <div className="flex items-center gap-1.5">
                    <button onClick={() => openAdminControl(label === 'Drivers' ? 'Drivers Management' : label === 'Stores' || label === 'Store Admins' ? 'Stores & Merchants' : 'Users Management', label === 'Drivers' ? 'delivery' : label === 'Stores' || label === 'Store Admins' ? 'store' : 'super_admin')} className={`px-2 py-1 rounded text-[7px] font-black ${color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' : color === 'orange' ? 'bg-orange-500/15 text-orange-400' : color === 'cyan' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-red-500/15 text-red-300'}`}>KYC</button>
                      <button onClick={() => openAdminControl('Settings', 'super_admin')} className="w-6 h-6 rounded bg-white/5 text-gray-200 flex items-center justify-center cursor-pointer"><Settings className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => openAdminControl('Users Management', 'super_admin')} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Invite Admin / Agent</button>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${superAdminTab === 'finance' ? '' : 'hidden'}`}>
                <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-3 shadow-lg">
                  <p className="text-[8px] text-red-50 font-bold uppercase">Platform GMV</p>
                  <p className="text-2xl text-white font-black mt-1">Tk {Math.max(realOrders.reduce((sum, o) => sum + o.amount, 0), currentOrder.totalPayable).toFixed(0)}</p>
                  <p className="text-[8px] text-red-50 mt-1">MFS, COD, card and store settlements</p>
                </div>
                {[
                  ['Store settlement due', `Tk ${Math.round(storeAdminRevenue * 0.82)}`],
                  ['Driver payout due', `Tk ${Math.round(currentOrder.deliveryFee * platformActiveOrders)}`],
                  ['Platform commission', `Tk ${Math.round(storeAdminRevenue * 0.12)}`],
                  ['MFS fee reserve', `Tk ${Math.round(storeAdminRevenue * 0.03)}`],
                ].map(([label, value]) => (
                  <div key={`super-finance-${label}`} className="bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-[8px]">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-bold">{value}</span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => openAdminControl('Payments', 'super_admin')} className="py-2 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Approve</button>
                  <button onClick={() => openAdminControl('MFS Business & Settlement', 'super_admin')} className="py-2 bg-[#111c2e] border border-white/10 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">MFS</button>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${superAdminTab === 'security' ? '' : 'hidden'}`}>
                <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-2.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-300" />
                    <div><p className="text-[9px] text-white font-bold">Security & Rules</p><p className="text-[7px] text-gray-400">Platform permissions and risk controls</p></div>
                  </div>
                </div>
                {[
                  ['Fraud rules', 'Auto hold high-risk COD orders'],
                  ['Driver reports', 'Customer unreachable / proof review'],
                  ['Store admin roles', 'Owner, manager, cashier permissions'],
                  ['Delivery fee rules', 'Distance + surge + zone pricing'],
                  ['API & live map keys', 'Location service health'],
                  ['Audit logs', 'Every admin action tracked'],
                ].map(([label, value]) => (
                  <button key={`super-security-${label}`} onClick={() => openAdminControl(label === 'Audit logs' ? 'Reports & Analytics' : 'Settings', 'super_admin')} className="w-full bg-[#111c2e] border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-left cursor-pointer hover:border-red-500/40">
                    <span className="text-[8px] text-white font-bold">{label}</span>
                    <span className="text-[7px] text-gray-400 truncate ml-2">{value}</span>
                  </button>
                ))}
                <button onClick={() => { if (showToast) superAdminShowToast('Security policy saved.', 'success'); }} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-[8px] font-black uppercase rounded-xl cursor-pointer">Save Rules</button>
              </div>

              <div className="bg-[#0b1320] border-t border-white/5 p-1.5 flex items-center justify-around text-center text-[7px] font-bold text-gray-400 uppercase">
                <button onClick={() => { setSuperAdminModule(null); setSuperAdminTab('overview'); }} className={`${superAdminTab === 'overview' ? 'text-red-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><Shield className="w-3.5 h-3.5 mb-0.5" /><span>Root</span></button>
                <button onClick={() => setSuperAdminTab('orders')} className={`${superAdminTab === 'orders' ? 'text-red-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><ShoppingBag className="w-3.5 h-3.5 mb-0.5" /><span>Orders</span></button>
                <button onClick={() => setSuperAdminTab('users')} className={`${superAdminTab === 'users' ? 'text-red-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><UserIcon className="w-3.5 h-3.5 mb-0.5" /><span>Users</span></button>
                <button onClick={() => setSuperAdminTab('finance')} className={`${superAdminTab === 'finance' ? 'text-red-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><Wallet className="w-3.5 h-3.5 mb-0.5" /><span>Money</span></button>
                <button onClick={() => setSuperAdminTab('security')} className={`${superAdminTab === 'security' ? 'text-red-400' : 'text-gray-400'} flex flex-col items-center cursor-pointer`}><SlidersHorizontal className="w-3.5 h-3.5 mb-0.5" /><span>Rules</span></button>
              </div>
            </div>

            {superAdminToast && (
              <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-[1100] px-3 py-2 rounded-xl text-[8px] font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[240px] text-center border ${superAdminToast.type === 'success' ? 'bg-emerald-500/95 border-emerald-300/40' : superAdminToast.type === 'error' ? 'bg-red-500/95 border-red-300/40' : 'bg-[#111c2e]/95 border-white/10'}`}>
                {superAdminToast.message}
              </div>
            )}

            <div className="h-4 bg-[#060c13] flex items-center justify-center pb-2 z-40 relative">
              <div className="w-24 h-1 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

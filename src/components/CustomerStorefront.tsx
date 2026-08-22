import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag, Search, MapPin, Bell, Heart, CreditCard, Wallet, Ticket,
  HelpCircle, Settings, ChevronDown, ChevronLeft, ChevronRight, Filter, Star,
  Clock, Truck, Shield, Gift, Store, Plus, Minus, CheckCircle, CheckCircle2, X,
  ShieldCheck, Home, Package, Map, Phone, Copy, Check, RefreshCw, LogOut,
  Trash2, Navigation, Sparkles, Tag, Printer, Lock, Banknote, Zap, ArrowRight, Bike, Percent,
  RotateCcw, Languages, ShoppingCart, BadgePercent, Crown, Gem, Store as StoreIcon,
  MessageCircle, Share2, LocateFixed, CalendarClock, AlertCircle, Link2,
  Camera, Send, Headphones, ScrollText, RefreshCcw, User, Mail, KeyRound, Wrench, QrCode, Eye, EyeOff
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order, Product, RefundRequest, ReturnRequest, WalletConfig, WalletKey, DEFAULT_WALLETS, WALLET_CONFIG_KEY, SEND_MONEY_METHODS } from '../types';
import { handoffPayloadOf, handoffCodeOf, identityCheck, securityApi, customerRegister, customerSync, customerLogin, customerOtpSend, customerOtpLogin, customerForgot, supabaseClient } from '../portals/portalUtils';
import LeafletMap, { LiveVeh } from './LeafletMap';
import { LiveDriverSim } from '../hooks/useLiveDrivers';
import { getStoredData, setStoredData } from '../data';
import { UpayLogo, RocketLogo, WALLET_META } from './walletLogos';

interface CustomerStorefrontProps {
  stores: Array<{
    id: string;
    name: string;
    address: string;
    status: string;
    rating: number;
    orders: number;
    category?: string;
  }>;
  products: Product[];
  orders: Order[];
  liveDrivers: LiveDriverSim[];
  onAddOrder: (orderData: Omit<Order, 'id' | 'date'>) => void;
  onUpdateOrder: (order: Order) => void;
  onSilentUpdateOrder?: (order: Order) => void;
  onReturnToAdmin: () => void;
  onLaunchMerchantStore: (storeId: string) => void;
  onReport?: (report: { orderId: string; reason: string; note: string }) => void;
  reports?: { orderId: string; status?: string; adminReply?: string }[];
  showToast: (message: string, type?: 'success' | 'info') => void;
}

interface SavedAddress {
  id: string;
  title: string;
  address: string;
  area: string;
  phone: string;
  isDefault: boolean;
  zipCode?: string;
  email?: string;
  emailVerified?: boolean;
  lat?: number;
  lng?: number;
  accuracy?: number;
  source?: 'gps' | 'manual';
}

interface SavedPaymentMethod {
  id: string;
  type: 'bKash' | 'Nagad' | 'Card' | 'COD';
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
  pin?: string;
}

interface WalletTransaction {
  id: string;
  type: 'Top-Up' | 'Order Payment' | 'Refund' | 'Cashback';
  amount: number;
  date: string;
  status: 'Completed' | 'Pending' | 'Rejected';
  trxId?: string;
  receipt?: string;
  sender?: string;
  method?: string;
  customerId?: string;
}

interface SupportTicketItem {
  id: string;
  subject: string;
  category: string;
  status: 'Open' | 'Resolved' | 'In Progress' | 'Under Review';
  date: string;
  lastMessage: string;
  customerId?: string;
}

interface StoreProduct {
  id: string;
  name: string;
  nameBn?: string;
  price: number;
  category: string;
  stock: number;
  status: string;
  unit: string;
  desc: string;
  image: string;
}

interface StoreDef {
  id: string;
  name: string;
  nameBn?: string;
  subtext: string;
  category: string;
  badgeColor: string;
  rating: number;
  reviewsCount: string;
  deliveryTime: string;
  deliveryFee: number;
  image: string;
  logoText: string;
  logoBg: string;
  pickup: { lat: number; lng: number };
  catalog: StoreProduct[];
}

const AREA_COORDS: Record<string, [number, number]> = {
  'Dhanmondi': [23.7539, 90.3836],
  'Gulshan': [23.8133, 90.4301],
  'Banani': [23.8168, 90.4234],
  'Mirpur': [23.7998, 90.3665],
  'Motijheel': [23.7822, 90.4145],
  'Uttara': [23.8759, 90.3795],
  'Badda': [23.8286, 90.4183],
  'Tejgaon': [23.7995, 90.4349],
  'Farmgate': [23.7936, 90.4045],
  'Shahbagh': [23.7806, 90.4009],
};

const AREA_NAMES_BN: Record<string, string> = {
  'Dhanmondi': 'ধানমন্ডি',
  'Gulshan': 'গুলশান',
  'Banani': 'বনানী',
  'Mirpur': 'মিরপুর',
  'Motijheel': 'মতিঝিল',
  'Uttara': 'উত্তরা',
  'Badda': 'বাড্ডা',
  'Tejgaon': 'তেজগাঁও',
  'Farmgate': 'ফার্মগেট',
  'Shahbagh': 'শাহবাগ',
};

const BD_DIVISIONS: Record<string, string[]> = {
  Dhaka: ['Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail'],
  Chattogram: ['Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', 'Cumilla', 'Cox’s Bazar', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati'],
  Rajshahi: ['Bogura', 'Joypurhat', 'Naogaon', 'Natore', 'Chapainawabganj', 'Pabna', 'Rajshahi', 'Sirajganj'],
  Khulna: ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  Barishal: ['Barguna', 'Barishal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur'],
  Sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
  Rangpur: ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  Mymensingh: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
};

const CUSTOMER_AREA_KEY = 'sd_customer_area_availability';
const allBangladeshDistricts = Object.values(BD_DIVISIONS).flat();
const defaultCustomerAreaAvailability = () => allBangladeshDistricts.reduce<Record<string, boolean>>((acc, district) => {
  acc[district] = true;
  return acc;
}, {});
const readCustomerAreaAvailability = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOMER_AREA_KEY) || '{}');
    return { ...defaultCustomerAreaAvailability(), ...(parsed || {}) };
  } catch {
    return defaultCustomerAreaAvailability();
  }
};

const districtDivisionOf = (district: string) => (
  Object.entries(BD_DIVISIONS).find(([, districts]) => districts.includes(district))?.[0] || ''
);

// Approximate reverse-geocoder: nearest known Dhaka area for a lat/lng.
// If the GPS point is outside Dhaka, do not force a fake Dhaka area.
const nearestAreaOf = (lat: number, lng: number) => {
  let best = 'Dhanmondi';
  let bestD = Infinity;
  for (const [name, [al, ag]] of Object.entries(AREA_COORDS)) {
    const d = Math.pow(al - lat, 2) + Math.pow(ag - lng, 2);
    if (d < bestD) { bestD = d; best = name; }
  }
  return bestD < 0.03 ? best : '';
};

const cleanAccuracy = (accuracy?: number) => (
  typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0 && accuracy < 5000
    ? Math.round(accuracy)
    : null
);

const reverseGeocodeLocation = async (lat: number, lng: number) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address || {};
    const road = [a.house_number, a.road || a.neighbourhood || a.suburb].filter(Boolean).join(' ');
    const city = a.city || a.town || a.village || a.county || a.state || '';
    const country = a.country || '';
    const line = String(data?.display_name || '').trim();
    return {
      street: road || line || `Live GPS location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      area: [city, country].filter(Boolean).join(', '),
      zipCode: String(a.postcode || a.postal_code || '').trim(),
      display: line
    };
  } catch {
    return null;
  }
};

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=600`;

const STORE_DEFS: StoreDef[] = [];

const BN_NAMES: Record<string, string> = {};

const CATEGORIES = ['All', 'Grocery', 'Supermarket', 'Restaurant', 'Fast Food', 'Bakery', 'Pharmacy', 'Fruits & Veg', 'Meat & Fish'];

const CAT_BN: Record<string, string> = {
  'All': 'সব',
  'Grocery': 'বাজার',
  'Supermarket': 'সুপারমার্কেট',
  'Restaurant': 'রেস্তোরাঁ',
  'Fast Food': 'ফাস্ট ফুড',
  'Bakery': 'বেকারি',
  'Pharmacy': 'ফার্মেসি',
  'Fruits & Veg': 'ফল ও সবজি',
  'Meat & Fish': 'মাংস ও মাছ',
};

const STATUS_BN: Record<string, string> = {
  'In Stock': 'স্টকে আছে',
  'Low Stock': 'স্টক কম',
  'Out of Stock': 'স্টক নেই',
  'Confirmed': 'নিশ্চিত হয়েছে',
  'Processing': 'প্রসেস হচ্ছে',
  'Ongoing': 'চলমান',
  'Pending': 'অপেক্ষমাণ',
  'Completed': 'সম্পন্ন',
  'Cancelled': 'বাতিল',
  'Delivered': 'ডেলিভারড',
  'Order Confirmed': 'অর্ডার নিশ্চিত হয়েছে',
  'Preparing at Store': 'দোকানে প্রস্তুত হচ্ছে',
  'Out for Delivery': 'ডেলিভারির পথে',
  'Store has accepted your order': 'দোকান আপনার অর্ডার গ্রহণ করেছে',
  'Your items are being packed': 'আপনার পণ্যগুলো প্যাক করা হচ্ছে',
  'Courier driver is on the way': 'কুরিয়ার ড্রাইভার পথে আছে',
  'Order delivered to your door': 'অর্ডার আপনার দরজায় পৌঁছেছে',
};

const BANNERS: Array<{ emoji: string; title: string; sub: string; bg: string; cta: string }> = [];

const COUPONS: Array<{ code: string; discountText: string; desc: string; validTill: string; discountValue: number; minOrder: number; isFreeShip?: boolean }> = [];

const LS_KEYS = {
  favs: 'ss_favs',
  addr: 'ss_addr',
  pays: 'ss_pays',
  wallet: 'ss_wallet_v2',
  wtxn: 'ss_wtxn_v3',
  profile: 'ss_profile',
  tickets: 'ss_tickets_v2',
  cart: 'ss_cart',
  lang: 'ss_lang',
  notifs: 'ss_notifs_v2',
  reviews: 'ss_reviews',
  spend: 'ss_spend_v2',
  chat: 'ss_chat',
  storeRatings: 'ss_store_ratings',
  watched: 'ss_watched',
  watchSnap: 'ss_watch_snap',
  referral: 'ss_referral',
  dark: 'ss_dark',
  trxUsed: 'ss_trx_used',
  fraud: 'ss_trx_fraud',
  walletIdx: 'ss_wallet_idx',
  refunds: 'ss_refunds',
  reminded: 'ss_reminded',
  selectedDivision: 'ss_selected_delivery_division',
  selectedArea: 'ss_selected_delivery_area',
};

// Send Money merchant wallets come from the shared admin-managed config
// (bKash / Nagad / Upay / Rocket) — the admin edits these from the Orders dashboard.

const TRX_RE = /^[A-Z0-9]{8,20}$/;
const PAY_SESSION_MS = 10 * 60 * 1000;   // 10-minute payment window
const PAY_AUTO_CANCEL_MS = 15 * 60 * 1000; // auto-cancel unpaid pending orders after 15 min
const FRAUD_MAX_ATTEMPTS = 3;
const FRAUD_COOLDOWN_MS = 10 * 60 * 1000;  // 10-minute lockout
const MAX_RECEIPT_BYTES = 2 * 1024 * 1024; // 2 MB screenshot limit

interface TrxUsed { trxId: string; orderId: string; at: number; }
interface FraudRecord { sender: string; attempts: number; blockedUntil: number; }

const SCHEDULE_SLOTS = [
  'ASAP (Fastest)',
  'Today · 2:00 PM – 4:00 PM',
  'Today · 5:00 PM – 7:00 PM',
  'Today · 7:00 PM – 9:00 PM',
  'Tomorrow · 10:00 AM – 12:00 PM',
];

interface ChatMsg { id: string; from: 'me' | 'rider'; text: string; time: string; }
interface StoreRatingAgg { total: number; count: number; }

type Lang = 'en' | 'bn';

interface CustomerNotif {
  id: string;
  title: string;
  body: string;
  emoji: string;
  time: string;
  read: boolean;
}

const isDemoDeliveredNotification = (n: Partial<CustomerNotif> | any) => {
  const text = `${n?.title || ''} ${n?.body || ''} ${n?.message || ''} ${n?.id || ''}`;
  return /Order Delivered/i.test(text)
    && /(BDPOS-\d+|POS-\d+|Bangladesh POS Counter|The NexaGo BD Counter)/i.test(text);
};

const isDemoSavedAddress = (addr: Partial<SavedAddress>) => {
  const text = `${addr.title || ''} ${addr.address || ''} ${addr.area || ''} ${addr.phone || ''}`;
  return /(House 42|Road 8A|Flat 4B|Dhanmondi, Dhaka 1209|Level 7|Tower 14|Gulshan Avenue|Gulshan-1, Dhaka 1212|01712-345678|01819-987654)/i.test(text);
};

interface ProductReview {
  id: string;
  productId: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}

const T_DICT: Record<Lang, Record<string, string>> = {
  en: {
    brandTag: 'NexaGo BD Delivery',
    searchPlaceholder: 'Search stores, restaurants, pharmacies...',
    home: 'Home',
    orders: 'Orders',
    myOrders: 'My Orders',
    favorites: 'Favorites',
    addresses: 'Addresses',
    payments: 'Payments',
    wallet: 'Wallet',
    coupons: 'Coupons',
    help: 'Help & Support',
    settings: 'Settings',
    notifications: 'Notifications',
    markAllRead: 'Mark all read',
    freeDelivery: 'Free Delivery',
    freeDeliverySub: 'On orders above ৳500',
    shopNow: 'Shop Now',
    exitCustomer: 'Exit Customer Site',
    popularNearYou: 'Popular Near You',
    popularSub: 'Top-rated stores in your area',
    viewAll: 'View All',
    orderNow: 'Order Now',
    wideRange: 'Wide Range of Stores',
    wideRangeSub: 'Grocery, restaurants, pharmacies & more',
    fastDelivery: 'Fast Delivery',
    fastDeliverySub: 'Get orders at your doorstep fast',
    securePay: 'Secure Payments',
    securePaySub: 'bKash, Nagad, COD & card options',
    bestOffers: 'Best Offers',
    bestOffersSub: 'Exclusive deals on every order',
    support: 'Support',
    supportSub: 'support@nexagobd.com',
    terms: 'Terms & Conditions',
    termsSub: 'Our rules & guidelines',
    privacy: 'Privacy Policy',
    privacySub: 'Your data is safe with us',
    refund: 'Refund Policy',
    refundSub: 'Full refund guarantee',
    t1: '1. Order price and delivery charge apply once the order is confirmed.',
    t2: '2. Delivery time is 30–60 minutes depending on your area.',
    t3: '3. Tracking unlocks only after admin verifies and approves your payment.',
    t4: '4. Offers and deals may change over time.',
    t5: '5. A re-delivery charge applies if the delivery address is incorrect.',
    t6: '6. Contact our support team within 48 hours for any complaint.',
    p1: '1. Your personal info (name, address, phone) is used only for delivery and order management.',
    p2: '2. Payment details are processed securely through an encrypted payment gateway.',
    p3: '3. We never share your data with third parties without your consent.',
    p4: '4. You can request data deletion from our support team at any time.',
    r1: '1. Full refund is given if the product is not delivered or the order is cancelled.',
    r2: '2. Refund reaches your wallet or payment method within 24–48 hours after verification.',
    r3: '3. Report wrong or damaged products within 48 hours of delivery.',
    r4: '4. Refund reports are approved after admin verification.',
    allStores: 'All Stores',
    filter: 'Filter',
    sortBy: 'Sort by',
    recommended: 'Recommended',
    highestRating: 'Highest Rating',
    fastestDelivery: 'Fastest Delivery',
    myOrderHistory: 'My Order History',
    orderHistorySub: 'Track active deliveries, view receipt QR codes, and re-order',
    browseStores: 'Browse Stores',
    noOrders: 'No orders placed yet',
    noOrdersSub: 'Pick items from your favorite grocery or restaurant stores to order.',
    totalAmount: 'Total Amount',
    receipt: 'Receipt',
    trackDelivery: 'Track Delivery',
    delivered: 'Delivered',
    reOrder: 'Re-order',
    cancelOrder: 'Cancel Order',
    delivery: 'Delivery',
    contactPhone: 'Contact Phone',
    paymentMethod: 'Payment Method',
    placeOrder: 'Place Order',
    orderNote: 'Order Note (optional)',
    yourBasket: 'Your Basket',
    items: 'Items',
    basketEmpty: 'Basket is empty. Add items from the menu.',
    couponCode: 'Coupon code',
    apply: 'Apply',
    subtotal: 'Subtotal',
    vat: 'VAT (5%)',
    promoDiscount: 'Promo Discount',
    grandTotal: 'Grand Total',
    deliveryDetails: 'Delivery Details',
    deliveryAddress: 'Delivery Address',
    savedAddresses: 'Saved Addresses',
    addNewAddress: 'Add New Address',
    newAddressDetails: 'New Address Details',
    saveAddress: 'Save Address',
    cancel: 'Cancel',
    defaultAddress: 'Default Address',
    useForOrders: 'Use for Orders',
    delete: 'Delete',
    paymentMethods: 'Payment Methods',
    linkPayment: 'Link Payment Account',
    walletBalance: 'Wallet Balance',
    topUp: 'Top Up',
    noFavoriteStores: 'No favorite stores added',
    liveTracking: 'Live Delivery Tracking',
    orderConfirmed: 'Order Confirmed',
    preparingAtStore: 'Preparing at Store',
    outForDelivery: 'Out for Delivery',
    minsAway: 'mins away',
    closeTracking: 'Close Tracking Window',
    officialReceipt: 'Official Order Receipt',
    printReceipt: 'Print Receipt',
    viewStore: 'View Store',
    goToCart: 'View Cart',
    bestCoupon: 'Best coupon for you',
    loyaltyTier: 'Your Rewards Tier',
    standard: 'Standard Member',
    silver: 'Silver VIP',
    gold: 'Gold VIP',
    earnPerOrder: 'Cashback on every order',
    language: 'বাংলা',
    merchantPortal: 'Merchant Portal',
    productDetails: 'Product Details',
    reviews: 'Reviews',
    writeReview: 'Write a Review',
    submitReview: 'Submit Review',
    addToCart: 'Add',
    searchResults: 'Search Results',
    storeMatches: 'Stores',
    productMatches: 'Products',
    noResults: 'No results found',
    noResultsSub: 'Try a different search keyword.',
    cartDrawer: 'Your Cart',
    checkout: 'Checkout',
    emptyCart: 'Your cart is empty',
    emptyCartSub: 'Browse stores and add items to start shopping.',
    confirmCancelTitle: 'Cancel this order?',
    confirmCancelBody: 'Your order will be cancelled and payment refunded to your wallet.',
    yesCancel: 'Yes, Cancel Order',
    keepOrder: 'Keep Order',
    cancelled: 'Cancelled',
    freeShip: 'FREE',
    callDriver: 'Calling driver',
    courierDriver: 'Courier Driver',
    atStore: 'At store',
    assignedDriver: 'Rider assigned',
    fromWallet: 'from wallet',
    // Payment instructions
    amountToPay: 'Amount to pay',
    secureVia: 'Secure payment via NexaGo Pay Gateway',
    sendMoneyTo: 'Send Money to this number',
    copyNumber: 'Copy Number',
    completeWithin: 'Complete payment within',
    sessionExpired: 'Session expired',
    expiredMsg: 'This payment window has expired to prevent invalid orders. Your cart is untouched — start again to place a fresh order.',
    close: 'Close',
    yourNumber: 'Your {m} number (sender)',
    sentAmount: 'Sent amount (must equal ৳{x})',
    exactMatch: '✓ Exact amount matches',
    amountMatch: 'Amount must match exactly ৳{x}',
    reference: '📝 Send Money Reference',
    referenceHint: 'When sending, put this note in the reference box:',
    trxIdLabel: '{m} TrxID',
    trxIdHint: '8–20 letters/digits from your SMS confirmation.',
    receiptLabel: 'Payment receipt / screenshot',
    uploadReceipt: 'Upload screenshot',
    changeReceipt: 'Change receipt',
    submitVerify: 'Submit for Verification',
    verificationNote: 'Order is placed only after admin verifies your TrxID & amount',
    last4Label: 'Last 4 digits (your {m} PIN)',
    last4Hint: 'Security check: last 4 digits must match your {m} number that sent the money.',
    numberOf: 'Number {i} of {n}',
    anotherNumber: 'Use another number',
    accountSettings: 'Customer Account Settings',
    accountSettingsSub: 'Update personal details and notification preferences',
    tapCameraHint: 'Tap the camera icon to change your profile picture',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    phoneNumber: 'Phone Number',
    smsAlerts: 'SMS Order Status Alerts',
    emailReceipts: 'Email Order Receipts',
    pushAlerts: 'Push Notifications',
    saveChanges: 'Save Changes',
    changePassword: 'Change Password',
    oldPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    updatePassword: 'Update Password',
    activeAccount: 'Active Account',
    connectedGmail: 'Connected Gmail',
    forgotPassword: 'Forgot password?',
    forgotTitle: 'Forgot your password?',
    forgotGmailPwd: 'Forgot Gmail password',
    forgotAppPwd: 'Forgot App password',
    recoverViaGmail: 'Reset via your connected Gmail',
    account: 'Account',
    logOut: 'Log Out',
    loggedOutMsg: 'Logged out — see you soon!',
    noNotifications: 'No notifications',
    smartWallet: 'Smart Wallet',
    smartShopCashWallet: 'Smart Shop Cash Wallet',
    walletUseSub: 'Use instant wallet balance for 1-click order checkout!',
    addMoney: 'Add Money',
    walletRealNote: 'Card or bKash / Nagad — send to personal number, admin verifies (100% real)',
    walletTransactionHistory: 'Wallet Transaction History',
    secureWallet: 'Secure Wallet',
    secureWalletSub: 'Every transaction is protected. Add money with bKash, Nagad or Card and pay in one tap.',
    walletSafeNote: 'Your balance is safe with Smart Shop. Order payments and cashback update instantly in your transaction history.',
    orderTools: 'Order Tools',
    orderToolsSub: 'Everything you need for your orders — all in one place.',
    trackOrders: 'Track Orders',
    liveDeliveryStatus: 'Live delivery status',
    reorder: 'Reorder',
    rebuyOneTap: 'Re-buy in one tap',
    requestRefund: 'Request Refund',
    moneyBackSupport: 'Money back support',
    orderReceipt: 'Order Receipt',
    printViewQr: 'Print / view QR',
    activePromoCodes: 'Active promo codes',
    topupHistory: 'Top-up History',
    transactionsBalance: 'Transactions & balance',
    customers: 'Customers',
    customerDirectoryWallet: 'A-Z directory & wallet add',
    activePromoVouchers: 'Active Promo Vouchers',
    promoVoucherSub: 'Apply discount codes to save big on your groceries and food orders',
    minOrder: 'Min order',
    expires: 'Expires',
    useCode: 'Use Code',
    applied: 'Applied',
    helpTitle: 'Help & Customer Support',
    helpSub: 'Submit support tickets or resolve delivery questions',
    openSupportTicket: 'Open Support Ticket',
    supportRequests: 'Your Support Requests',
    commonProblems: 'Common Problems & Solutions',
    noFaqs: 'No FAQs yet — the admin will add common problems and solutions here.',
    adminResponse: 'Admin response',
    preferences: 'Preferences',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    totalSpend: 'Total spend',
    browsingFreeDelivery: 'Browsing free delivery stores',
    defaultMethod: 'Default Method',
    setAsActive: 'Set as Active',
    unlink: 'Unlink',
    paymentUnlinked: 'Payment account unlinked',
    selectedAsPrimary: 'Selected {m} as primary checkout method',
    addMoneyPendingTitle: 'Top-up Pending — Admin Verification',
    transactionStatus: 'Transaction status',
    pendingWalletNote: 'Added to your wallet transaction history as Pending. Once the admin verifies, it turns Completed and your balance updates automatically.',
    done: 'Done',
  },
  bn: {
    brandTag: 'নেক্সাগো বিডি ডেলিভারি',
    searchPlaceholder: 'দোকান, রেস্তোরাঁ, ফার্মেসি খুঁজুন...',
    home: 'হোম',
    orders: 'অর্ডার',
    myOrders: 'আমার অর্ডার',
    favorites: 'প্রিয়',
    addresses: 'ঠিকানা',
    payments: 'পেমেন্ট',
    wallet: 'ওয়ালেট',
    coupons: 'কুপন',
    help: 'সাহায্য ও সাপোর্ট',
    settings: 'সেটিংস',
    notifications: 'নোটিফিকেশন',
    markAllRead: 'সব পড়া হয়েছে',
    freeDelivery: 'ফ্রি ডেলিভারি',
    freeDeliverySub: '৳৫০০ এর উপরে অর্ডারে',
    shopNow: 'কিনুন',
    exitCustomer: 'কাস্টমার সাইট ত্যাগ করুন',
    popularNearYou: 'আপনার কাছাকাছি জনপ্রিয়',
    popularSub: 'আপনার এলাকার সেরা দোকানগুলো',
    viewAll: 'সব দেখুন',
    orderNow: 'অর্ডার করুন',
    wideRange: 'বহু দোকান',
    wideRangeSub: 'বাজার, রেস্তোরাঁ, ফার্মেসি ও আরও অনেক কিছু',
    fastDelivery: 'দ্রুত ডেলিভারি',
    fastDeliverySub: 'দরজায় দ্রুত ডেলিভারি',
    securePay: 'নিরাপদ পেমেন্ট',
    securePaySub: 'বিকাশ, নগদ, ক্যাশ ও কার্ড',
    bestOffers: 'সেরা অফার',
    bestOffersSub: 'প্রতিটি অর্ডারে এক্সক্লুসিভ ডিল',
    support: 'সাপোর্ট',
    supportSub: 'support@nexagobd.com',
    terms: 'টার্মস অ্যান্ড কন্ডিশনস',
    termsSub: 'আমাদের নিয়মাবলি',
    privacy: 'প্রাইভেসি পলিসি',
    privacySub: 'আপনার তথ্য সুরক্ষিত',
    refund: 'রিফান্ড পলিসি',
    refundSub: 'ফুল রিফান্ড গ্যারান্টি',
    t1: '১. অর্ডার নিশ্চিত হওয়ার পর পণ্যের মূল্য ও ডেলিভারি চার্জ প্রযোজ্য থাকবে।',
    t2: '২. ডেলিভারি সময় শহরভেদে ৩০–৬০ মিনিটের মধ্যে হয়ে থাকে।',
    t3: '৩. পেমেন্ট অ্যাডমিন যাচাই করার পরই অর্ডার ডেলিভারির জন্য ট্র্যাকিং খুলবে।',
    t4: '৪. অ্যাপের মাধ্যমে ঘোষিত যেকোনো অফার ও ডিল সময়সাপেক্ষ পরিবর্তন হতে পারে।',
    t5: '৫. ডেলিভারি ঠিকানা সঠিক না হলে পুনরায় ডেলিভারি চার্জ প্রযোজ্য হবে।',
    t6: '৬. যেকোনো অভিযোগের জন্য ৪৮ ঘণ্টার মধ্যে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।',
    p1: '১. আপনার ব্যক্তিগত তথ্য (নাম, ঠিকানা, ফোন) শুধুমাত্র ডেলিভারি ও অর্ডার পরিচালনার জন্য ব্যবহৃত হয়।',
    p2: '২. পেমেন্ট তথ্য এনক্রিপ্টেড পেমেন্ট গেটওয়ের মাধ্যমে নিরাপদে প্রসেস হয়।',
    p3: '৩. আপনার অনুমতি ছাড়া তৃতীয় পক্ষের সাথে তথ্য শেয়ার করা হয় না।',
    p4: '৪. আপনি যেকোনো সময় আমাদের সাপোর্ট টিমের কাছে তথ্য মুছে ফেলার অনুরোধ করতে পারবেন।',
    r1: '১. পণ্য ডেলিভারি না হওয়া বা অর্ডার ক্যান্সেল হলে পূর্ণ অর্থ ফেরত দেওয়া হয়।',
    r2: '২. রিফান্ড যাচাই হওয়ার পর ২৪–৪৮ ঘণ্টার মধ্যে আপনার ওয়ালেট বা পেমেন্ট মেথডে ফেরত যাবে।',
    r3: '৩. ভুল পণ্য বা ক্ষতিগ্রস্ত পণ্য পেলে ডেলিভারির ৪৮ ঘণ্টার মধ্যে রিপোর্ট করুন।',
    r4: '৪. রিফান্ড রিপোর্ট অ্যাডমিন যাচাইয়ের পর অনুমোদিত হয়।',
    allStores: 'সব দোকান',
    filter: 'ফিল্টার',
    sortBy: 'সাজান',
    recommended: 'সুপারিশকৃত',
    highestRating: 'সর্বোচ্চ রেটিং',
    fastestDelivery: 'দ্রুততম ডেলিভারি',
    myOrderHistory: 'আমার অর্ডার ইতিহাস',
    orderHistorySub: 'সক্রিয় ডেলিভারি ট্র্যাক করুন, রসিদ QR দেখুন ও পুনরায় অর্ডার করুন',
    browseStores: 'দোকান দেখুন',
    noOrders: 'এখনো কোনো অর্ডার নেই',
    noOrdersSub: 'আপনার প্রিয় দোকান থেকে পণ্য বেছে অর্ডার করুন।',
    totalAmount: 'মোট পরিমাণ',
    receipt: 'রসিদ',
    trackDelivery: 'ডেলিভারি ট্র্যাক করুন',
    delivered: 'ডেলিভারড',
    reOrder: 'পুনরায় অর্ডার',
    cancelOrder: 'অর্ডার বাতিল',
    delivery: 'ডেলিভারি',
    contactPhone: 'যোগাযোগের নম্বর',
    paymentMethod: 'পেমেন্ট পদ্ধতি',
    placeOrder: 'অর্ডার করুন',
    orderNote: 'অর্ডার নোট (ঐচ্ছিক)',
    yourBasket: 'আপনার ঝুড়ি',
    items: 'আইটেম',
    basketEmpty: 'ঝুড়ি খালি। মেনু থেকে পণ্য যোগ করুন।',
    couponCode: 'কুপন কোড',
    apply: 'প্রয়োগ',
    subtotal: 'সাবটোটাল',
    vat: 'ভ্যাট (৫%)',
    promoDiscount: 'প্রোমো ডিসকাউন্ট',
    grandTotal: 'সর্বমোট',
    deliveryDetails: 'ডেলিভারি বিবরণ',
    deliveryAddress: 'ডেলিভারি ঠিকানা',
    savedAddresses: 'সংরক্ষিত ঠিকানা',
    addNewAddress: 'নতুন ঠিকানা যোগ করুন',
    newAddressDetails: 'নতুন ঠিকানার বিবরণ',
    saveAddress: 'ঠিকানা সংরক্ষণ',
    cancel: 'বাতিল',
    defaultAddress: 'ডিফল্ট ঠিকানা',
    useForOrders: 'অর্ডারে ব্যবহার করুন',
    delete: 'মুছুন',
    paymentMethods: 'পেমেন্ট পদ্ধতি',
    linkPayment: 'পেমেন্ট অ্যাকাউন্ট লিংক',
    walletBalance: 'ওয়ালেট ব্যালেন্স',
    topUp: 'টপ-আপ',
    noFavoriteStores: 'কোনো প্রিয় দোকান নেই',
    liveTracking: 'লাইভ ডেলিভারি ট্র্যাকিং',
    orderConfirmed: 'অর্ডার নিশ্চিত হয়েছে',
    preparingAtStore: 'দোকানে প্রস্তুত হচ্ছে',
    outForDelivery: 'ডেলিভারির পথে',
    minsAway: 'মিনিট বাকি',
    closeTracking: 'ট্র্যাকিং উইন্ডো বন্ধ করুন',
    officialReceipt: 'অফিসিয়াল অর্ডার রসিদ',
    printReceipt: 'রসিদ প্রিন্ট করুন',
    viewStore: 'দোকান দেখুন',
    goToCart: 'কার্ট দেখুন',
    bestCoupon: 'আপনার জন্য সেরা কুপন',
    loyaltyTier: 'আপনার রিওয়ার্ড লেভেল',
    standard: 'স্ট্যান্ডার্ড মেম্বার',
    silver: 'সিলভার ভিআইপি',
    gold: 'গোল্ড ভিআইপি',
    earnPerOrder: 'প্রতিটি অর্ডারে ক্যাশব্যাক',
    language: 'English',
    merchantPortal: 'মার্চেন্ট পোর্টাল',
    productDetails: 'পণ্যের বিবরণ',
    reviews: 'রিভিউ',
    writeReview: 'রিভিউ লিখুন',
    submitReview: 'রিভিউ জমা দিন',
    addToCart: 'যোগ করুন',
    searchResults: 'সার্চ ফলাফল',
    storeMatches: 'দোকান',
    productMatches: 'পণ্য',
    noResults: 'কোনো ফলাফল পাওয়া যায়নি',
    noResultsSub: 'অন্য কীওয়ার্ড দিয়ে চেষ্টা করুন।',
    cartDrawer: 'আপনার কার্ট',
    checkout: 'চেকআউট',
    emptyCart: 'আপনার কার্ট খালি',
    emptyCartSub: 'দোকান ঘুরে কার্টে পণ্য যোগ করুন।',
    confirmCancelTitle: 'এই অর্ডারটি বাতিল করবেন?',
    confirmCancelBody: 'অর্ডারটি বাতিল হলে টাকা ওয়ালেটে ফেরত যাবে।',
    yesCancel: 'হ্যাঁ, অর্ডার বাতিল',
    keepOrder: 'অর্ডার রাখুন',
    cancelled: 'বাতিল',
    freeShip: 'ফ্রি',
    callDriver: 'ড্রাইভারকে কল',
    courierDriver: 'কুরিয়ার ড্রাইভার',
    atStore: 'দোকানে',
    assignedDriver: 'রাইডার নিয়োগ হয়েছে',
    fromWallet: 'ওয়ালেট থেকে',
    // Payment instructions
    amountToPay: 'পরিশোধের পরিমাণ',
    secureVia: 'নেক্সাগো পে গেটওয়ে মাধ্যমে নিরাপদ পেমেন্ট',
    sendMoneyTo: 'এই নম্বরে সেন্ড মানি করুন',
    copyNumber: 'নম্বর কপি করুন',
    completeWithin: 'এর মধ্যে পেমেন্ট সম্পন্ন করুন',
    sessionExpired: 'সেশন শেষ',
    expiredMsg: 'ফেক অর্ডার ঠেকাতে পেমেন্ট উইন্ডো শেষ হয়ে গেছে। আপনার কার্ট অপরিবর্তিত আছে — নতুন অর্ডার দিতে আবার শুরু করুন।',
    close: 'বন্ধ করুন',
    yourNumber: 'আপনার {m} নম্বর (প্রেরক)',
    sentAmount: 'পাঠানো পরিমাণ (অবশ্যই ৳{x} হতে হবে)',
    exactMatch: '✓ সঠিক পরিমাণ মিলেছে',
    amountMatch: 'পরিমাণ অবশ্যই ৳{x} এর সাথে মেলাতে হবে',
    reference: '📝 সেন্ড মানি রেফারেন্স',
    referenceHint: 'পাঠানোর সময় রেফারেন্স বক্সে এই নোটটি লিখুন:',
    trxIdLabel: '{m} TrxID',
    trxIdHint: 'আপনার SMS কনফার্মেশনের ৮–২০ অক্ষর/সংখ্যা।',
    receiptLabel: 'পেমেন্ট রিসিট / স্ক্রিনশট',
    uploadReceipt: 'স্ক্রিনশট আপলোড করুন',
    changeReceipt: 'রিসিট পরিবর্তন করুন',
    submitVerify: 'যাচাইয়ের জন্য জমা দিন',
    verificationNote: 'অ্যাডমিন আপনার TrxID ও পরিমাণ যাচাই করার পরেই অর্ডার নিশ্চিত হবে',
    last4Label: 'শেষ ৪ সংখ্যা (আপনার {m} PIN)',
    last4Hint: 'নিরাপত্তা চেক: শেষ ৪ সংখ্যা অবশ্যই আপনার {m} নম্বরের সাথে মেলাতে হবে।',
    numberOf: 'নম্বর {i} / {n}',
    anotherNumber: 'অন্য নম্বর ব্যবহার করুন',
    accountSettings: 'কাস্টমার অ্যাকাউন্ট সেটিংস',
    accountSettingsSub: 'ব্যক্তিগত তথ্য ও নোটিফিকেশন পছন্দ আপডেট করুন',
    tapCameraHint: 'প্রোফাইল ছবি বদলাতে ক্যামেরা আইকনে ক্লিক করুন',
    fullName: 'পুরো নাম',
    emailAddress: 'ইমেইল ঠিকানা',
    phoneNumber: 'ফোন নম্বর',
    smsAlerts: 'SMS অর্ডার স্ট্যাটাস অ্যালার্ট',
    emailReceipts: 'ইমেইল অর্ডার রিসিট',
    pushAlerts: 'পুশ নোটিফিকেশন',
    saveChanges: 'পরিবর্তন সংরক্ষণ করুন',
    changePassword: 'পাসওয়ার্ড পরিবর্তন করুন',
    oldPassword: 'বর্তমান পাসওয়ার্ড',
    newPassword: 'নতুন পাসওয়ার্ড',
    confirmPassword: 'নতুন পাসওয়ার্ড নিশ্চিত করুন',
    updatePassword: 'পাসওয়ার্ড আপডেট করুন',
    activeAccount: 'সক্রিয় অ্যাকাউন্ট',
    connectedGmail: 'সংযুক্ত Gmail',
    forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
    forgotTitle: 'পাসওয়ার্ড ভুলে গেছেন?',
    forgotGmailPwd: 'Gmail পাসওয়ার্ড ভুলে গেছেন',
    forgotAppPwd: 'অ্যাপ পাসওয়ার্ড ভুলে গেছেন',
    recoverViaGmail: 'সংযুক্ত Gmail বা ফোন OTP দিয়ে রিসেট করুন',
    account: 'অ্যাকাউন্ট',
    logOut: 'লগ আউট',
    loggedOutMsg: 'লগ আউট হয়েছে — আবার দেখা হবে!',
    noNotifications: 'কোনো নোটিফিকেশন নেই',
    smartWallet: 'স্মার্ট ওয়ালেট',
    smartShopCashWallet: 'স্মার্ট শপ ক্যাশ ওয়ালেট',
    walletUseSub: 'এক ক্লিকে অর্ডার পেমেন্টের জন্য ইনস্ট্যান্ট ওয়ালেট ব্যালেন্স ব্যবহার করুন!',
    addMoney: 'টাকা যোগ করুন',
    walletRealNote: 'কার্ড অথবা বিকাশ / নগদ — ব্যক্তিগত নম্বরে পাঠান, অ্যাডমিন যাচাই করবে (১০০% রিয়াল)',
    walletTransactionHistory: 'ওয়ালেট লেনদেন ইতিহাস',
    secureWallet: 'নিরাপদ ওয়ালেট',
    secureWalletSub: 'প্রতিটি লেনদেন সুরক্ষিত। বিকাশ, নগদ বা কার্ড দিয়ে টাকা যোগ করুন এবং এক ট্যাপে পেমেন্ট করুন।',
    walletSafeNote: 'আপনার ব্যালেন্স নিরাপদ। অর্ডার পেমেন্ট ও ক্যাশব্যাক সাথে সাথে লেনদেন ইতিহাসে আপডেট হয়।',
    orderTools: 'অর্ডার টুলস',
    orderToolsSub: 'আপনার অর্ডারের জন্য দরকারি সবকিছু এক জায়গায়।',
    trackOrders: 'অর্ডার ট্র্যাক',
    liveDeliveryStatus: 'লাইভ ডেলিভারি স্ট্যাটাস',
    reorder: 'আবার অর্ডার',
    rebuyOneTap: 'এক ট্যাপে আবার কিনুন',
    requestRefund: 'রিফান্ড অনুরোধ',
    moneyBackSupport: 'টাকা ফেরত সাপোর্ট',
    orderReceipt: 'অর্ডার রসিদ',
    printViewQr: 'প্রিন্ট / QR দেখুন',
    activePromoCodes: 'চলমান প্রোমো কোড',
    topupHistory: 'টপ-আপ ইতিহাস',
    transactionsBalance: 'লেনদেন ও ব্যালেন্স',
    customers: 'কাস্টমার',
    customerDirectoryWallet: 'A-Z ডিরেক্টরি ও ওয়ালেট যোগ',
    activePromoVouchers: 'চলমান প্রোমো ভাউচার',
    promoVoucherSub: 'গ্রোসারি ও খাবার অর্ডারে বেশি সেভ করতে ডিসকাউন্ট কোড ব্যবহার করুন',
    minOrder: 'ন্যূনতম অর্ডার',
    expires: 'মেয়াদ',
    useCode: 'কোড ব্যবহার',
    applied: 'প্রয়োগ হয়েছে',
    helpTitle: 'সাহায্য ও কাস্টমার সাপোর্ট',
    helpSub: 'সাপোর্ট টিকিট জমা দিন বা ডেলিভারি সমস্যা সমাধান করুন',
    openSupportTicket: 'সাপোর্ট টিকিট খুলুন',
    supportRequests: 'আপনার সাপোর্ট অনুরোধ',
    commonProblems: 'সাধারণ সমস্যা ও সমাধান',
    noFaqs: 'এখনো কোনো FAQ নেই — অ্যাডমিন এখানে সাধারণ সমস্যা ও সমাধান যোগ করবে।',
    adminResponse: 'অ্যাডমিন উত্তর',
    preferences: 'পছন্দসমূহ',
    darkMode: 'ডার্ক মোড',
    lightMode: 'লাইট মোড',
    totalSpend: 'মোট খরচ',
    browsingFreeDelivery: 'ফ্রি ডেলিভারি দোকান দেখা হচ্ছে',
    defaultMethod: 'ডিফল্ট পদ্ধতি',
    setAsActive: 'সক্রিয় করুন',
    unlink: 'আনলিংক',
    paymentUnlinked: 'পেমেন্ট অ্যাকাউন্ট আনলিংক হয়েছে',
    selectedAsPrimary: '{m} প্রধান চেকআউট পদ্ধতি হিসেবে নির্বাচিত হয়েছে',
    addMoneyPendingTitle: 'টপ-আপ পেন্ডিং — অ্যাডমিন যাচাই',
    transactionStatus: 'লেনদেনের অবস্থা',
    pendingWalletNote: 'আপনার ওয়ালেট লেনদেন ইতিহাসে Pending হিসেবে যোগ হয়েছে। অ্যাডমিন যাচাই করলে Completed হবে এবং ব্যালেন্স আপডেট হবে।',
    done: 'সম্পন্ন',
  },
};

const LOYALTY_TIERS = [
  { key: 'standard' as const, label: 'Standard Member', minSpend: 0, cashbackPct: 1, color: 'bg-gray-600', icon: '★' },
  { key: 'silver' as const, label: 'Silver VIP', minSpend: 3000, cashbackPct: 3, color: 'bg-slate-400', icon: '🥈' },
  { key: 'gold' as const, label: 'Gold VIP', minSpend: 10000, cashbackPct: 5, color: 'bg-amber-500', icon: '🥇' },
];

const AVATAR_COLORS = ['bg-emerald-600', 'bg-orange-500', 'bg-blue-600', 'bg-rose-600', 'bg-violet-600', 'bg-teal-600', 'bg-amber-500', 'bg-indigo-600'];
const safeText = (value: unknown, fallback = '') => {
  const next = String(value ?? '').trim();
  return next || fallback;
};
const hashColor = (s: unknown) => AVATAR_COLORS[Math.abs(safeText(s, 'Customer').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];
const initialsOf = (s: unknown, fallback = 'CU') => safeText(s, fallback).split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || fallback;
const firstPart = (s: unknown, separator = ',') => safeText(s).split(separator)[0] || '';

const ETA_STEPS = [
  { label: 'Order Confirmed', desc: 'Store has accepted your order', min: 0.0 },
  { label: 'Preparing at Store', desc: 'Your items are being packed', min: 0.18 },
  { label: 'Out for Delivery', desc: 'Courier driver is on the way', min: 0.42 },
  { label: 'Delivered', desc: 'Order delivered to your door', min: 0.9 },
];

// Official bKash brand logo (vector artwork from bkash.com)
const BkashLogo = ({ className = '', width, height }: { className?: string; width?: number; height?: number }) => (
  <svg viewBox="11.22 10.7 458.08 209.58" className={className} width={width} height={height} xmlns="http://www.w3.org/2000/svg" aria-label="bKash">
    <path d="M327.99 110.75l12.99 58.4 85.01-43.04z" fill="#d12053" />
    <path d="M352.16 23.48L328 110.76l98.01 15.35z" fill="#e2136e" />
    <path d="M248.31 10.7l101.38 12.11-23.97 86.76z" fill="#d12053" />
    <path d="M247.52 27.76h11.29l31.67 40.5z" fill="#9e1638" />
    <path d="M428.69 125.55l-29.46-40.77 47.66-8.53z" fill="#d12053" />
    <path d="M423.77 137.5l3.04-9.07-74.39 37.74z" fill="#e2136e" />
    <path d="M325.91 113.05l15.52 69.77-46.06 37.46z" fill="#9e1638" />
    <path d="M442.25 96.97l27.05-.46-19.55-19.89z" fill="#e2136e" />
    <path d="M255.13 94.18v7.53c-2.76-4.35-10.52-7.22-14.8-6.62s-11 4.14-14.65 12C221.68 98.82 214 94 208.27 94h-17.78v8.84h11.58c5.12 0 10.46-.52 15.24 3.83a11.76 11.76 0 0 1 3.46 6.7c1.47 6.86-1.54 15.09-9.51 15.29a24.63 24.63 0 0 1-7.49-.87l-.61.63a66.48 66.48 0 0 1 4.91 8.17 25.21 25.21 0 0 0 12.56-6.82 24.09 24.09 0 0 0 5.05-7.12 24.26 24.26 0 0 0 4.49 7.12 22.36 22.36 0 0 0 11.32 6.82 69.8 69.8 0 0 1 4.42-8.17l-.54-.63a20.07 20.07 0 0 1-6.74.87c-8.25-.23-9.76-8.69-8.48-15.29 1.11-5.62 6.11-11.15 11-11.56 5.49-.45 12.19 4.18 13.55 9.85a41.85 41.85 0 0 1 1 9.47v51.49a35 35 0 0 1 3.94-.38 33.7 33.7 0 0 1 4 .38V94.18z" fill="#231f20" />
    <path d="M42.34 64.29c13.91-1.39 35.27 16.56 37 20.48l1.32-.21V74.25c-9.77-5.17-23.41-15.79-41.5-14.49-20.07 1.44-27.92 13.24-27.94 34V172.67a26.39 26.39 0 0 1 3.77-.41 36.5 36.5 0 0 1 4.27.41v-69.79h53.36v5.73c-29.29.54-42 16.87-42 30.9 0 17.1 17.66 33.17 48.68 33.17h1.37V94H20l-.1-.18a20.61 20.61 0 0 1-.61-4.66C19.18 75.87 28 65.69 42.34 64.29zM41.09 140c0-12.34 13.67-24.17 31.53-26.74v56.09C53 166 41.09 150.6 41.09 140z" fill="#e2136e" />
    <path d="M82.75 94v8.85h54.88v5.73c-29.29.54-42 16.87-42 30.9 0 17.1 17.67 33.17 48.67 33.17h1.36v-58.32h.85c9.85-.27 15.74 6 16.05 14.05a13.34 13.34 0 0 1-8.69 13.09l.06 1.19 7.48-.22c4.18-5.29 6.89-11.19 6.62-17.56-.46-11.11-7.88-16.4-22.37-16.2v-5.75h34.75v69.79a28.1 28.1 0 0 1 3.93-.41 34.62 34.62 0 0 1 4.1.41V94zm23.35 46c0-12.34 13.68-24.17 31.53-26.74v56.1C118 166 106.1 150.6 106.1 140z" fill="#231f20" />
  </svg>
);

// Official Nagad brand logo (vector artwork from nagad.com.bd)
const NagadLogo = ({ className = '', width, height }: { className?: string; width?: number; height?: number }) => (
  <svg viewBox="-0.002 -0.001 300.21 131.033" className={className} width={width} height={height} xmlns="http://www.w3.org/2000/svg" aria-label="nagad">
    <g fill="#ed1c24">
      <path d="m193.564 50.855h-52.413c-1.038 0-1.557.779-1.557 1.557v4.152c0 1.038.779 1.556 1.557 1.556h39.18v21.796c-1.038-1.557-2.335-3.114-3.632-4.67-4.67-4.67-9.6-7.006-14.79-7.006-4.152 0-7.525 2.076-10.38 5.708-2.334 3.114-3.632 6.747-3.632 10.12s.52 7.784 3.114 11.935c3.114 4.93 8.303 6.487 12.974 6.487 5.967 0 10.897-4.151 10.897-9.6 0-3.114-1.556-5.709-4.41-7.525l-2.855-1.557v4.67c-.26 1.298-2.335 3.114-4.67 3.114-2.076 0-3.892-.778-5.19-2.075-.778-.779-1.297-2.336-1.038-3.374 0-1.556.52-2.854 1.557-4.151 1.298-1.557 2.595-2.335 4.67-2.335 5.19 0 9.601 2.335 13.234 7.524 2.854 4.411 4.41 8.563 4.41 13.233v10.898l7.785 4.67c.26.26.519.26.778.26 1.038 0 1.557-.778 1.557-1.557v-56.305h3.114c1.038 0 1.557-.778 1.557-1.557v-4.151c0-1.038-.779-1.817-1.817-1.817z" />
      <path d="m298.391 50.855h-66.425c-1.038 0-1.557.779-1.557 1.557v7.265c-6.486-6.746-12.195-10.12-17.384-10.12-4.93 0-9.082 1.039-12.714 3.893-3.374 2.595-5.45 5.968-5.45 9.86 0 11.676 12.974 11.417 16.347 9.86.52-.26 1.298-.779 2.076-.779 2.595 0 3.633 2.076 3.633 3.893 0 2.594-3.892 4.93-8.563 4.93-2.594 0-4.151-.779-5.19-2.336l-2.075-3.113-1.297 3.632c-.26.779-.779 1.816-.779 3.114 0 2.595 1.298 5.19 3.892 7.525 2.336 2.075 5.19 3.113 8.303 3.113 4.93 0 9.082-1.816 11.677-5.449 2.335-2.854 3.373-6.227 3.373-10.12 0-2.075-.779-4.41-2.595-7.005-2.076-3.114-4.67-4.67-7.525-4.67-1.037 0-2.335.26-3.632.778-.52.26-1.557.519-1.817.519-.518 0-1.297-.26-1.816-1.038-.519-.519-1.038-1.297-1.038-2.595 0-2.854 2.595-5.708 7.266-5.708h.259c3.114 0 6.227 1.557 9.082 4.411 2.335 2.335 4.151 4.67 5.708 7.265v41.256l7.784 4.67c.26.26.519.26.778.26 1.038 0 1.557-.778 1.557-1.557v-55.786h11.936v36.067l9.341 3.892h.519c.778 0 1.557-.52 1.557-1.557v-.26c1.557-10.638 6.227-17.903 14.011-22.314v2.076c0 1.556 0 5.448.26 7.524 0 1.298 0 2.076.26 2.854 0 4.152.518 10.38 1.816 15.05 2.594 8.822 7.005 10.898 10.119 10.898h.26c1.816 0 3.373-.52 4.41-1.557.52-.52 1.298-1.557 1.298-3.373 0-1.557-.26-2.855-.779-3.892l-.778-1.298-1.557.26c-1.557.519-2.335.519-2.335.26h-.26c-.519 0-.519 0-.778-.26-.519-.26-1.557-1.038-2.335-3.892-.52-2.076-.779-4.93-.779-6.487 0-11.676 2.336-20.498 6.228-22.315h.26c.518-.26 1.037-.778 1.037-1.557 0-.26 0-.519-.26-.778v-.26c-1.816-3.632-5.708-6.227-10.897-7.524h-1.038c-4.152.778-9.082 3.632-15.309 8.822-1.557 1.297-3.114 2.595-4.411 3.892v-14.271h36.326c1.038 0 1.557-.778 1.557-1.557v-4.151c.26-1.038-.52-1.817-1.557-1.817zm-175.922 19.201c0 1.817 0 3.373-.26 4.93a58.206 58.206 0 0 1 -5.189 20.239c-1.038 2.595-2.335 4.93-3.892 7.265-10.898 17.125-30.099 28.542-51.894 28.542-9.341 0-18.163-2.076-25.948-5.708-20.756-9.6-35.288-30.877-35.288-55.268 0-24.13 14.012-44.888 33.991-54.748-1.557 2.075-3.114 4.151-4.411 6.486 0 .26-.26.26-.26.52-.778.778-1.556 1.297-2.335 2.075-1.038.779-1.816 1.816-2.854 2.595l-.519.519-.519.519c-.26.26-.519.778-1.038 1.038-.519.778-1.297 1.556-1.816 2.335a45.542 45.542 0 0 0 -6.227 10.898c-.26.26-.26.778-.52 1.038-.259.519-.259 1.037-.518 1.297 0 .26-.26.519-.26.778-.26.779-.519 1.298-.778 2.076-.26.52-.26 1.038-.519 1.297 0 .26-.26.52-.26.779 0 .519-.259 1.038-.259 1.557l-.778 4.67c0 .52 0 .779-.26 1.298v6.227c0 16.606 7.525 31.656 19.72 41.256 9.341 7.525 21.017 12.195 33.731 12.195 11.677 0 22.315-3.632 31.137-10.12 6.487-4.67 11.676-10.638 15.568-17.643.52-1.038 1.038-1.817 1.557-2.855 3.114-6.486 4.93-13.492 4.93-21.017v-1.816c0-1.816 0-3.373-.26-5.19l.26.26c.779.778 1.557 1.297 2.335 2.076.779-1.298 1.557-2.336 2.336-3.633.519 2.335.778 4.67 1.038 7.265.259 2.336.259 4.152.259 5.968z" />
    </g>
    <path d="m68.499 21.016-11.417-21.017c-18.941 8.561-31.915 27.504-31.915 49.559 0 11.157 3.373 21.536 9.082 30.099-.52-2.855-.52-5.709-.52-8.822.261-22.575 14.531-41.775 34.771-49.819z" fill="#f7941d" />
    <path d="m77.58 31.395c4.67-1.297 9.86-1.816 14.79-1.816 3.114 0 6.487.259 9.341.778l-.26-9.341-.518-18.682c-2.076-.26-4.411-.519-6.746-.519-10.38 0-19.98 3.373-27.764 8.822l6.227 11.417c-11.157 3.892-20.238 11.676-25.947 21.796-2.854 4.93-4.93 10.638-5.708 16.606 1.557-3.114 3.373-5.968 5.449-8.563 7.524-9.86 18.422-17.384 31.136-20.498z" fill="#ed1c24" />
    <g fill="#f7941d">
      <path d="m104.825 20.757.519 13.233c-4.411-1.298-8.822-2.076-13.752-2.076-9.082 0-17.644 2.595-25.169 7.006-9.34 5.708-16.606 14.79-20.239 25.428 3.633-4.93 8.044-9.341 13.233-12.714 7.525-4.93 16.607-7.784 26.207-7.784 7.265 0 14.011 1.556 20.239 4.41a41.05 41.05 0 0 1 12.454 8.563l7.266-10.898 9.34-14.27c-8.302-6.747-18.681-10.898-30.098-10.898z" />
      <path d="m116.501 63.829v1.816c0 10.898-4.41 19.98-4.93 21.017s-1.038 1.817-1.557 2.855c-3.892 7.005-9.081 12.973-15.568 17.644-8.822 6.227-19.46 10.12-31.137 10.12-12.714 0-24.65-4.412-33.731-12.196-11.936-9.86-19.72-24.65-19.72-41.256v-6.227c0-.52 0-.779.26-1.298l.778-4.67c0-.52.26-1.038.26-1.557 0-.26.259-.52.259-.779.26-.519.26-1.037.519-1.297.26-.778.519-1.557.778-2.076 0-.26.26-.519.26-.778.26-.52.26-1.038.519-1.297s.26-.779.519-1.038c1.557-3.892 3.892-7.525 6.227-10.898.519-.779 1.297-1.557 1.816-2.335.26-.26.52-.779 1.038-1.038.26-.26.26-.52.52-.52.259-.259.259-.518.518-.518.779-1.038 1.816-1.817 2.854-2.595.779-.778 1.557-1.297 2.336-2.076 0 .26-.26.26-.26.52s-.26.518-.26.518c-3.113 6.228-5.189 13.752-5.967 21.536-.26 2.076-.26 4.152-.26 6.487 0 28.023 16.347 50.597 36.586 50.597h2.076c2.854 0 5.708-.519 8.562-1.038 13.752-3.632 23.872-16.346 23.872-31.136v-.779c-.26-8.822-3.892-16.865-9.86-22.314 4.151 0 8.303.778 12.195 1.816 7.525 1.816 14.27 5.449 20.239 10.12l.26.259c-.26 1.038 0 2.854 0 4.41z" />
      <path d="m116.501 63.829v1.816c0 11.417-5.19 21.277-5.19 21.277-.518 1.038-1.037 1.816-1.556 2.854-3.892 7.006-9.341 12.974-15.828 17.644-9.081 6.746-19.98 10.12-31.396 10.12-12.455 0-24.39-4.411-33.99-12.196-12.457-10.119-19.721-25.428-19.721-41.514s7.264-31.396 19.72-41.516l.518-.519c0 .26-.26.26-.26.52s-.259.259-.259.518c-12.195 10.12-19.2 24.91-19.2 40.997s7.005 30.877 19.46 41.256c9.34 7.784 21.536 11.936 33.731 11.936 11.157 0 22.055-3.374 31.137-10.12 6.486-4.67 11.676-10.638 15.568-17.644.519-1.038 1.038-1.816 1.297-2.854 0 0 5.19-9.6 5.19-21.017v-1.817c0-1.816 0-3.373-.26-5.189v-.26l.26.26.26.26c.518 2.075.518 3.632.518 5.189z" />
    </g>
  </svg>
);

export const CustomerStorefront: React.FC<CustomerStorefrontProps> = ({
  stores,
  products,
  orders,
  liveDrivers,
  onAddOrder,
  onUpdateOrder,
  onSilentUpdateOrder,
  onLaunchMerchantStore,
  onReport,
  reports = [],
  showToast,
}) => {
  const [activeNav, setActiveNav] = useState<
    'Home' | 'Orders' | 'My Orders' | 'Favorites' | 'Addresses' | 'Payments' | 'Wallet' | 'Coupons' | 'Help' | 'Settings'
  >('Home');

  // Browser-style back / forward navigation across customer pages
  const navStackRef = useRef<string[]>(['Home']);
  const navPosRef = useRef(0);
  const skipPushRef = useRef(false);
  const [, forceNavTick] = useState(0);
  useEffect(() => {
    if (skipPushRef.current) { skipPushRef.current = false; return; }
    const stack = navStackRef.current;
    const pos = navPosRef.current;
    if (stack[pos] === activeNav) return;
    const next = stack.slice(0, pos + 1);
    next.push(activeNav);
    navStackRef.current = next;
    navPosRef.current = next.length - 1;
    forceNavTick(t => t + 1);
  }, [activeNav]);
  const navBack = () => {
    if (navPosRef.current <= 0) return;
    skipPushRef.current = true;
    navPosRef.current -= 1;
    setActiveNav(navStackRef.current[navPosRef.current]);
  };
  const navForward = () => {
    if (navPosRef.current >= navStackRef.current.length - 1) return;
    skipPushRef.current = true;
    navPosRef.current += 1;
    setActiveNav(navStackRef.current[navPosRef.current]);
  };
  const navCanBack = navPosRef.current > 0;
  const navCanForward = navPosRef.current < navStackRef.current.length - 1;

  const [lang, setLang] = useState<Lang>(() => getStoredData(LS_KEYS.lang, 'en'));
  useEffect(() => setStoredData(LS_KEYS.lang, lang), [lang]);
  const [dark, setDark] = useState<boolean>(true);
  useEffect(() => setStoredData(LS_KEYS.dark, dark), [dark]);
  const T = T_DICT[lang];
  const catLabel = (c: string) => (lang === 'bn' ? (CAT_BN[c] || c) : c);
  const statusLabel = (s: string) => (lang === 'bn' ? (STATUS_BN[s] || s) : s);
  const nm = (n: string) => (lang === 'bn' ? (BN_NAMES[n] || n) : n);

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const [customerNotifs, setCustomerNotifs] = useState<CustomerNotif[]>(() => getStoredData<CustomerNotif[]>(LS_KEYS.notifs, []).filter(n => !isDemoDeliveredNotification(n)));
  useEffect(() => setStoredData(LS_KEYS.notifs, customerNotifs), [customerNotifs]);

  // Live-sync admin/platform notifications (sd_notifications) into this customer's inbox
  const [adminNotifs, setAdminNotifs] = useState<{ id: string; title: string; body: string; time: string; read: boolean }[]>(() => {
    try { return JSON.parse(localStorage.getItem('sd_notifications') || '[]').filter((n: any) => !isDemoDeliveredNotification(n)); } catch { return []; }
  });
  // (admin notification live-sync effect is declared below, after the profile)
  // Merge admin notifications at the top of the customer inbox list (fresh ones always visible)
  const mergedNotifs = [...adminNotifs.map(n => ({ id: n.id, title: n.title, body: n.body, emoji: '📣', time: n.time, read: n.read })), ...customerNotifs.filter(n => !n.id.startsWith('SD-ADMIN-'))];

  const [totalSpend, setTotalSpend] = useState<number>(() => getStoredData(LS_KEYS.spend, 0));
  useEffect(() => setStoredData(LS_KEYS.spend, totalSpend), [totalSpend]);

  const [productReviews, setProductReviews] = useState<ProductReview[]>(() => getStoredData(LS_KEYS.reviews, []));
  useEffect(() => setStoredData(LS_KEYS.reviews, productReviews), [productReviews]);

  const [detailProduct, setDetailProduct] = useState<StoreProduct | null>(null);
  const [detailStoreName, setDetailStoreName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');

  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // Checkout: delivery pin on map + scheduling
  const [deliveryPin, setDeliveryPin] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryLocationMeta, setDeliveryLocationMeta] = useState<{ accuracy?: number; capturedAt?: string; source?: 'browser-gps' | 'map-pin'; area?: string } | null>(null);
  const [isLocatingDelivery, setIsLocatingDelivery] = useState(false);
  const [locationPermissionState, setLocationPermissionState] = useState<'checking' | 'granted' | 'denied' | 'prompt' | 'unsupported'>(() => {
    try { return localStorage.getItem('nexago_customer_location_allowed') === '1' ? 'granted' : 'checking'; } catch { return 'checking'; }
  });
  const [locationConsentAction, setLocationConsentAction] = useState<'delivery' | 'address' | null>(null);
  const [locationSharingPaused, setLocationSharingPaused] = useState(() => {
    try { return localStorage.getItem('nexago_customer_location_paused') === '1'; } catch { return false; }
  });
  const [cameraPermissionState, setCameraPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt' | 'unsupported'>('unknown');
  const [notificationPermissionState, setNotificationPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'default' | 'unsupported'>('unknown');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleSlot, setScheduleSlot] = useState(SCHEDULE_SLOTS[0]);

  // Split payment
  const [splitWalletAmount, setSplitWalletAmount] = useState<number>(0);

  // Rider chat
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMsg[]>>(() => getStoredData(LS_KEYS.chat, {}));
  useEffect(() => setStoredData(LS_KEYS.chat, chatMessages), [chatMessages]);

  // Store ratings (after delivery)
  const [storeRatings, setStoreRatings] = useState<Record<string, StoreRatingAgg>>(() => getStoredData(LS_KEYS.storeRatings, {}));
  useEffect(() => setStoredData(LS_KEYS.storeRatings, storeRatings), [storeRatings]);
  const [rateOrder, setRateOrder] = useState<Order | null>(null);
  const [rateVal, setRateVal] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [rateRiderOrder, setRateRiderOrder] = useState<Order | null>(null);
  const [riderRateVal, setRiderRateVal] = useState(5);
  const [riderRatings, setRiderRatings] = useState<Record<string, { driverName: string; score: number; note?: string }>>(() => getStoredData('ss_rider_ratings', {}) as Record<string, { driverName: string; score: number; note?: string }>);
  useEffect(() => setStoredData('ss_rider_ratings', riderRatings), [riderRatings]);
  const riderRatingOf = (driverName: string) => {
    const all = (Object.values(riderRatings) as { driverName: string; score: number }[]).filter(r => r.driverName === driverName);
    if (!all.length) return null;
    return { avg: (all.reduce((s, r) => s + r.score, 0) / all.length).toFixed(1), count: all.length };
  };
  const [reportOrder, setReportOrder] = useState<Order | null>(null);
  const [reportReason, setReportReason] = useState('Wrong item received');
  const [reportNote, setReportNote] = useState('');

  // Open the report modal — held (payment rejected) orders get payment-specific reasons
  const openReportModal = (order: Order) => {
    setReportOrder(order);
    setReportReason(order.paymentStatus === 'Rejected' ? 'Payment rejected — money not credited' : 'Wrong item received');
    setReportNote('');
  };

  // Re-send payment for review (held / payment-rejected orders)
  const [reSubmitOrder, setReSubmitOrder] = useState<Order | null>(null);
  const [reSub, setReSub] = useState({ sender: '', trxId: '', amount: '', receipt: '', last4: '' });
  const openReSubmit = (order: Order) => {
    setReSubmitOrder(order);
    setReSub({ sender: '', trxId: '', amount: String(order.amount), receipt: '', last4: '' });
  };
  const handleReSubFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) { showToast('Screenshot too large — max 2 MB', 'info'); return; }
    const reader = new FileReader();
    reader.onload = () => setReSub(s => ({ ...s, receipt: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };
  const submitReSubmit = () => {
    if (!reSubmitOrder) return;
    if (!reSub.trxId || !reSub.amount) { showToast('Enter the TrxID and amount before resubmitting', 'info'); return; }
    if (Number(reSub.amount) !== reSubmitOrder.amount) { showToast(`Amount must match the order total ৳${reSubmitOrder.amount}`, 'info'); return; }
    if (!reSub.receipt) { showToast('Upload a fresh payment screenshot/receipt', 'info'); return; }
    onUpdateOrder({
      ...reSubmitOrder,
      paymentStatus: 'Pending',
      trxId: reSub.trxId,
      senderNumber: reSub.sender,
      last4: reSub.last4,
      trxAmount: Number(reSub.amount),
      receipt: reSub.receipt,
      paymentNote: 'Re-submitted by customer for re-verification',
    });
    // Old "Under Review" ticket for this order is cleared on the customer side (not saved)
    setTickets(prev => prev.filter(t => !t.subject.includes(`order #${reSubmitOrder.id}`)));
    setReSubmitOrder(null);
    showToast(`Payment re-submitted for #${reSubmitOrder.id} — sent for review again`, 'success');
  };

  // Watched products for price-drop / restock alerts
  const [watchedProducts, setWatchedProducts] = useState<string[]>(() => getStoredData(LS_KEYS.watched, []));
  useEffect(() => setStoredData(LS_KEYS.watched, watchedProducts), [watchedProducts]);
  const [watchSnapshot, setWatchSnapshot] = useState<Record<string, { stock: number; price: number }>>(() => getStoredData(LS_KEYS.watchSnap, {}));
  useEffect(() => setStoredData(LS_KEYS.watchSnap, watchSnapshot), [watchSnapshot]);


  const unreadNotifCount = mergedNotifs.filter(n => !n.read).length;
  const tier = LOYALTY_TIERS.slice().reverse().find(t => totalSpend >= t.minSpend) || LOYALTY_TIERS[0];

  const displayRating = (store: { name: string; rating: number }) => {
    const agg = storeRatings[store.name];
    if (!agg || agg.count === 0) return store.rating;
    return +(((store.rating * 5 + agg.total) / (5 + agg.count))).toFixed(1);
  };

  const statusProgressFloor = (status?: string) => {
    switch (status) {
      case 'Confirmed': return 0.18;
      case 'Processing': return 0.42;
      case 'Ongoing': return 0.45;
      case 'Completed': return 1;
      default: return 0;
    }
  };

  // Live admin-inventory sync: build the customer catalog only from real admin data.
  const syncedStores = useMemo(() => {
    return stores.map((store): StoreDef => {
      const catalog = products
        .filter((p: any) => p.storeId === store.id)
        .map((p: any): StoreProduct => {
          const stock = Number(p.stock || 0);
          return {
            id: p.id,
            name: p.name,
            price: Number(p.price || 0),
            category: p.category || 'General',
            stock,
            status: stock === 0 ? 'Out of Stock' : (stock <= 8 ? 'Low Stock' : 'In Stock'),
            unit: p.unit || 'pcs',
            desc: p.desc || p.description || '',
            image: p.image || '',
          };
        });
      return {
        id: store.id,
        name: store.name,
        subtext: store.address || '',
        category: store.category || 'Store',
        badgeColor: 'bg-emerald-50 text-emerald-700',
        rating: Number(store.rating || 0),
        reviewsCount: String(store.reviewsCount || 0),
        deliveryTime: store.deliveryTime || 'Real-time',
        deliveryFee: Number(store.deliveryFee || 0),
        image: store.image || '',
        logoText: store.name,
        logoBg: 'bg-emerald-100 text-emerald-800',
        pickup: store.pickup || { lat: 23.8103, lng: 90.4125 },
        catalog,
      };
    });
  }, [products, stores]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'Recommended' | 'Rating' | 'Fastest'>('Recommended');

  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>(() => getStoredData(LS_KEYS.favs, []));
  useEffect(() => setStoredData(LS_KEYS.favs, favoriteStoreIds), [favoriteStoreIds]);

  const [cart, setCart] = useState<Array<{ product: StoreProduct; quantity: number; note?: string }>>(() => getStoredData(LS_KEYS.cart, []));
  useEffect(() => setStoredData(LS_KEYS.cart, cart), [cart]);

  const [selectedStore, setSelectedStore] = useState<StoreDef | null>(null);
  const [storeCat, setStoreCat] = useState<string>('All');
  const [storeSearch, setStoreSearch] = useState<string>('');

  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; isFreeShip?: boolean } | null>(null);
  const [couponInput, setCouponInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Upay' | 'Rocket' | 'Cash on Delivery' | 'Card' | 'Split (Wallet + bKash)'>('bKash');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [customerAreaAvailability, setCustomerAreaAvailability] = useState<Record<string, boolean>>(() => readCustomerAreaAvailability());
  const [selectedDeliveryDivision, setSelectedDeliveryDivision] = useState<string>(() => getStoredData(LS_KEYS.selectedDivision, ''));
  const [selectedDeliveryArea, setSelectedDeliveryArea] = useState<string>(() => getStoredData(LS_KEYS.selectedArea, ''));
  const availableDivisions = useMemo(() => Object.keys(BD_DIVISIONS).filter(division => BD_DIVISIONS[division].some(district => customerAreaAvailability[district])), [customerAreaAvailability]);
  const availableDistrictsForSelectedDivision = useMemo(() => (BD_DIVISIONS[selectedDeliveryDivision] || []).filter(district => customerAreaAvailability[district]), [customerAreaAvailability, selectedDeliveryDivision]);
  useEffect(() => setStoredData(LS_KEYS.selectedDivision, selectedDeliveryDivision), [selectedDeliveryDivision]);
  useEffect(() => setStoredData(LS_KEYS.selectedArea, selectedDeliveryArea), [selectedDeliveryArea]);
  useEffect(() => {
    const refreshAreas = () => setCustomerAreaAvailability(readCustomerAreaAvailability());
    window.addEventListener('storage', refreshAreas);
    window.addEventListener('nexago-local-write', refreshAreas);
    return () => {
      window.removeEventListener('storage', refreshAreas);
      window.removeEventListener('nexago-local-write', refreshAreas);
    };
  }, []);
  useEffect(() => {
    if (selectedDeliveryArea && !customerAreaAvailability[selectedDeliveryArea]) setSelectedDeliveryArea('');
    if (selectedDeliveryDivision && !availableDivisions.includes(selectedDeliveryDivision)) {
      setSelectedDeliveryDivision('');
      setSelectedDeliveryArea('');
    }
  }, [availableDivisions, customerAreaAvailability, selectedDeliveryArea, selectedDeliveryDivision]);
  const [customerPhone, setCustomerPhone] = useState<string>('');

  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const [addresses, setAddresses] = useState<SavedAddress[]>(() => getStoredData<SavedAddress[]>(LS_KEYS.addr, []).filter(addr => !isDemoSavedAddress(addr)));
  useEffect(() => setStoredData(LS_KEYS.addr, addresses), [addresses]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddrTitle, setNewAddrTitle] = useState('');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrDivision, setNewAddrDivision] = useState('');
  const [newAddrArea, setNewAddrArea] = useState('');
  const [newAddrZipCode, setNewAddrZipCode] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrEmail, setNewAddrEmail] = useState('');
  const [newAddrEmailVerified, setNewAddrEmailVerified] = useState(false);
  const [newAddrCoords, setNewAddrCoords] = useState<{ lat: number; lng: number; accuracy?: number; source: 'gps' | 'manual' } | null>(null);
  const availableAddressDistricts = useMemo(() => (BD_DIVISIONS[newAddrDivision] || []).filter(district => customerAreaAvailability[district]), [customerAreaAvailability, newAddrDivision]);

  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>(() => getStoredData(LS_KEYS.pays, []));
  useEffect(() => setStoredData(LS_KEYS.pays, paymentMethods), [paymentMethods]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayType, setNewPayType] = useState<'bKash' | 'Nagad' | 'Card'>('bKash');
  const [newPayAccount, setNewPayAccount] = useState('');

  const [walletBalance, setWalletBalance] = useState<number>(() => getStoredData(LS_KEYS.wallet, 0));
  useEffect(() => setStoredData(LS_KEYS.wallet, walletBalance), [walletBalance]);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [addMoneyStep, setAddMoneyStep] = useState<'method' | 'send' | 'pending'>('method');
  const [addMoneyMethod, setAddMoneyMethod] = useState<WalletKey | 'Card'>('bKash');
  const [addMoneyAmount, setAddMoneyAmount] = useState('500');
  const [addMoneyPhone, setAddMoneyPhone] = useState('');
  const [addMoneyCard, setAddMoneyCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [addMoneySender, setAddMoneySender] = useState('');
  const [addMoneyLast4, setAddMoneyLast4] = useState('');
  const [addMoneyTrxId, setAddMoneyTrxId] = useState('');
  const [addMoneyReceipt, setAddMoneyReceipt] = useState('');
  const [addMoneySentTo, setAddMoneySentTo] = useState('');
  const [addMoneyError, setAddMoneyError] = useState('');
  const [addMoneyDeadline, setAddMoneyDeadline] = useState<number>(0);
  const [addMoneyLeft, setAddMoneyLeft] = useState<number>(0);
  const [addMoneyExpired, setAddMoneyExpired] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => getStoredData(LS_KEYS.wtxn, []));
  useEffect(() => setStoredData(LS_KEYS.wtxn, walletTransactions), [walletTransactions]);
  const [splitPinInput, setSplitPinInput] = useState('');

  // Customer instant OTP login/signup: the site opens on a Gmail OTP auth
  // screen; once verified the customer is marked verified on this device.
  const [custVerified, setCustVerified] = useState<boolean>(() => { try { return localStorage.getItem('ss_cust_verified') === '1'; } catch { return false; } });

  const [tickets, setTickets] = useState<SupportTicketItem[]>(() => getStoredData(LS_KEYS.tickets, []));
  useEffect(() => setStoredData(LS_KEYS.tickets, tickets), [tickets]);
  const [isNewTicketModal, setIsNewTicketModal] = useState(false);
  const [policyModal, setPolicyModal] = useState<'terms' | 'privacy' | 'refund' | null>(null);
  const [ticketCategory, setTicketCategory] = useState('Order Delivery');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDetail, setTicketDetail] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('FAQ-1');
  const [ticketCategories, setTicketCategories] = useState<{ value: string; label: string }[]>(() => {
    const defaults = [
      { value: 'Order Delivery', label: 'Order Delivery Delay' },
      { value: 'Top-Up / Add Money', label: 'Top-Up / Add Money Issue' },
      { value: 'Payment / Refund', label: 'Payment / Wallet Refund' },
      { value: 'Missing Item', label: 'Missing or Damaged Item' },
      { value: 'General Query', label: 'General Query' },
    ];
    const stored = getStoredData<{ value: string; label: string }[]>('sd_ticket_categories_v1', defaults);
    return defaults.concat(stored.filter(s => !defaults.some(d => d.value === s.value)));
  });
  const [helpFaqs, setHelpFaqs] = useState<{ id: string; problem: string; solution: string }[]>(() => getStoredData('sd_support_faqs_v1', [
    { id: 'FAQ-1', problem: 'My order is delayed', solution: 'Check the live tracking in My Orders. If it exceeds the estimated time, the delivery partner is notified automatically. You can also open a ticket and we will prioritize it.' },
    { id: 'FAQ-2', problem: 'How do I get a refund?', solution: 'Open the order in My Orders and tap Request Refund. Approved refunds go back to your payment method or Smart Wallet within 24–48 hours.' },
    { id: 'FAQ-3', problem: 'An item is missing from my order', solution: 'Report it immediately via a support ticket with the Missing Item category. Attach a photo if possible and our team will verify and replace or refund.' },
    { id: 'FAQ-4', problem: 'How does Cash on Delivery work?', solution: 'Select Cash on Delivery at checkout. Pay the rider in cash when your order arrives — no online payment needed.' },
  ]));

  const [customerProfile, setCustomerProfile] = useState(() => getStoredData(LS_KEYS.profile, { name: '', email: '', phone: '', sms: true, emailNotif: true, pushNotif: true, profilePic: '' }));
  useEffect(() => setStoredData(LS_KEYS.profile, customerProfile), [customerProfile]);

  // Live-sync admin/platform notifications (sd_notifications) into this customer's inbox
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('sd_notifications');
        const list = raw ? JSON.parse(raw) : [];
        const myId = localStorage.getItem('ss_cust_id') || '';
        setAdminNotifs(list.filter((n: any) => {
          if (isDemoDeliveredNotification(n)) return false;
          if (n.audience === 'all' || (n.audience === 'customer' && !n.customerId)) return true;
          if (n.customerId && (n.customerId === customerProfile.phone || n.customerId === customerProfile.name || n.customerId === myId)) return true;
          return false;
        }));
      } catch { /* noop */ }
    };
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === 'sd_notifications') load(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProfile.phone, customerProfile.name]);

  // Permanent unique customer ID — generated once at account creation, never changes.
  // One ID per phone / one ID per Gmail (duplicates are prevented).
  // On mount we look up the shared account registry (ss_cust_accounts) AND the admin
  // customer directory (ss_admin_customers) by phone or Gmail. If an account already
  // exists with the same phone/Gmail we ADOPT that permanent ID (unified identity —
  // no duplicate accounts). If none exists, we create a brand-new permanent ID.
  const normPhone = (p: string) => (p || '').replace(/[^0-9]/g, '');
  const normEmail = (e: string) => (e || '').trim().toLowerCase();
  const [customerId, setCustomerId] = useState<string>(() => {
    const myPhone = normPhone(customerProfile.phone);
    const myEmail = normEmail(customerProfile.email);
    const accounts = getStoredData<Array<{ customerId: string; name: string; phone: string; email: string }>>('ss_cust_accounts', []);
    const directory = getStoredData<Array<{ phone?: string; email?: string; custId?: string }>>('ss_admin_customers', []);
    const regMatch = accounts.find(a => (myPhone && normPhone(a.phone) === myPhone) || (myEmail && normEmail(a.email) === myEmail));
    if (regMatch) {
      setStoredData('ss_cust_id', regMatch.customerId);
      return regMatch.customerId;
    }
    const dirMatch = directory.find(c => (myPhone && normPhone(c.phone || '') === myPhone) || (myEmail && normEmail(c.email || '') === myEmail));
    if (dirMatch && dirMatch.custId) {
      setStoredData('ss_cust_id', dirMatch.custId);
      return dirMatch.custId;
    }
    let id = getStoredData<string>('ss_cust_id', '');
    if (!id) {
      id = 'NEX' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
      setStoredData('ss_cust_id', id);
    }
    return id;
  });

  // Register this customer in the shared account registry so the admin can find
  // the profile by ID / phone / Gmail and duplicates are never created.
  useEffect(() => {
    const accounts = getStoredData<Array<{ customerId: string; name: string; phone: string; email: string }>>('ss_cust_accounts', []);
    const idx = accounts.findIndex(a => a.customerId === customerId);
    const entry = { customerId, name: customerProfile.name, phone: customerProfile.phone, email: customerProfile.email };
    const next = idx >= 0 ? accounts.map(a => a.customerId === customerId ? entry : a) : [...accounts, entry];
    setStoredData('ss_cust_accounts', next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, customerProfile.name, customerProfile.phone, customerProfile.email]);

  // Claim the permanent identity server-side so the phone/Gmail cannot be reused
  // by a different account (customer, driver, store admin or staff) anywhere.
  useEffect(() => {
    let cancelled = false;
    const phone = customerProfile.phone || '';
    const email = customerProfile.email || '';
    if (!phone && !email) return;
    identityCheck({ phone, email, excludeId: customerId, excludeRole: 'customer' })
      .then(({ taken }) => {
        if (cancelled || taken) return;
        return securityApi('/identity/claim', {
          role: 'customer',
          identityId: customerId,
          name: customerProfile.name || 'Customer',
          phone,
          email,
        }).catch(() => null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, customerProfile.name, customerProfile.phone, customerProfile.email]);

  // Register the permanent customer server-side and restore the wallet. If the
  // phone/Gmail was already registered on another device, the server returns the
  // EXISTING customerId (device-independent ID) and we adopt it here.
  useEffect(() => {
    let cancelled = false;
    const phone = customerProfile.phone || '';
    const email = customerProfile.email || '';
    customerRegister({ name: customerProfile.name || 'Customer', phone, email, customerId, balance: walletBalance }).then((res) => {
      if (cancelled || !res || !res.customer) return;
      const serverId = res.customer.customerId || customerId;
      if (serverId && serverId !== customerId) {
        setStoredData('ss_cust_id', serverId);
      }
      if (res.customer.phone && !phone) setCustomerProfile((p) => ({ ...p, phone: res.customer.phone }));
      if (res.customer.email && !email) setCustomerProfile((p) => ({ ...p, email: res.customer.email }));
      if (res.customer.name && !customerProfile.name) setCustomerProfile((p) => ({ ...p, name: res.customer.name }));
      if (typeof res.walletBalance === 'number') setWalletBalance((prev) => Math.max(prev, res.walletBalance || 0));
      if (Array.isArray(res.txns) && res.txns.length) setWalletTransactions((prev) => {
        const known = new Set(prev.map((t) => t.id));
        const fresh = res.txns.filter((t) => !known.has(t.id));
        return fresh.length ? [...fresh, ...prev] : prev;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Keep the permanent wallet cloud store in sync as the balance / history moves.
  useEffect(() => {
    const t = window.setTimeout(() => {
      customerSync(customerId, walletBalance, walletTransactions).catch(() => {});
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, walletBalance, walletTransactions]);

  const [custIdCopy, setCustIdCopy] = useState(false);

  // Duplicate prevention: one phone + one Gmail = one account. When the customer
  // tries to save a phone/Gmail that already belongs to another account, block it.
  const findAccountDuplicate = (phone: string, email: string) => {
    const accounts = getStoredData<Array<{ customerId: string; name: string; phone: string; email: string }>>('ss_cust_accounts', []);
    const p = normPhone(phone);
    const e = normEmail(email);
    const byPhone = accounts.find(a => a.customerId !== customerId && p && normPhone(a.phone) === p);
    if (byPhone) return byPhone;
    const byEmail = accounts.find(a => a.customerId !== customerId && e && normEmail(a.email) === e);
    if (byEmail) return byEmail;
    return null;
  };

  // Server-side Single Account check: phone/Gmail must not belong to ANY account
  // on the platform (customer, driver, store admin, staff). Local registry + cloud
  // both checked; cloud wins when it reports a conflict.
  const checkIdentityConflict = async (phone: string, email: string) => {
    const local = findAccountDuplicate(phone, email);
    const cloud = await identityCheck({ phone, email, excludeId: customerId, excludeRole: 'customer' });
    const conflict = cloud.taken ? cloud.conflict : (local ? { name: local.name, identityId: local.customerId, role: 'customer', phone: local.phone, email: local.email } : null);
    return conflict;
  };

  const [pwd, setPwd] = useState({ old: '', fresh: '', confirm: '' });
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showPrefsCard, setShowPrefsCard] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);

  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Payment flow modal
  const [payModal, setPayModal] = useState<null | 'bKash' | 'Nagad' | 'Upay' | 'Rocket' | 'Card' | 'COD' | 'Split (Wallet + bKash)'>(null);
  const [pinInput, setPinInput] = useState('');
  const [cardInfo, setCardInfo] = useState({ number: '', name: '', expiry: '', cvv: '' });

  // Send Money flow (bKash/Nagad/Upay/Rocket) — numbers are admin-managed via shared config
  const [sendMoney, setSendMoney] = useState({ sender: '', trxId: '', amount: '', receipt: '', note: '', last4: '' });
  const [walletConfig, setWalletConfig] = useState<WalletConfig>(() => getStoredData(WALLET_CONFIG_KEY, DEFAULT_WALLETS));

  // Live-refresh wallet numbers when the admin edits them from the dashboard tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === WALLET_CONFIG_KEY) {
        try { setWalletConfig(e.newValue ? (JSON.parse(e.newValue) as WalletConfig) : DEFAULT_WALLETS); } catch { /* noop */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Refund / cancellation request
  const [refunds, setRefunds] = useState<RefundRequest[]>(() => getStoredData(LS_KEYS.refunds, []));
  useEffect(() => setStoredData(LS_KEYS.refunds, refunds), [refunds]);
  const [refundModal, setRefundModal] = useState<Order | null>(null);
  const [refundMethod, setRefundMethod] = useState<WalletKey>('bKash');
  const [refundNumber, setRefundNumber] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Return / reverse logistics request
  const [returns, setReturns] = useState<ReturnRequest[]>(() => getStoredData('sd_returns', []));
  useEffect(() => setStoredData('sd_returns', returns), [returns]);
  const [returnModal, setReturnModal] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnNote, setReturnNote] = useState('');

  // Payment reminder tracking (avoid repeat reminders per order)
  const [reminded, setReminded] = useState<string[]>(() => getStoredData(LS_KEYS.reminded, []));
  useEffect(() => setStoredData(LS_KEYS.reminded, reminded), [reminded]);
  const [payDeadline, setPayDeadline] = useState<number>(0);
  const [payLeft, setPayLeft] = useState<number>(0);
  const [payExpired, setPayExpired] = useState(false);
  const [trxUsed, setTrxUsed] = useState<TrxUsed[]>(() => getStoredData(LS_KEYS.trxUsed, []));
  useEffect(() => setStoredData(LS_KEYS.trxUsed, trxUsed), [trxUsed]);
  const [fraud, setFraud] = useState<FraudRecord[]>(() => getStoredData(LS_KEYS.fraud, []));
  useEffect(() => setStoredData(LS_KEYS.fraud, fraud), [fraud]);

  const fraudStateOf = (sender: string): FraudRecord => {
    const rec = fraud.find(f => f.sender === sender);
    return rec || { sender, attempts: 0, blockedUntil: 0 };
  };
  const fraudBlocked = (sender: string) => {
    const r = fraudStateOf(sender);
    return r.blockedUntil > Date.now();
  };
  const registerFraudAttempt = (sender: string) => {
    const r = fraudStateOf(sender);
    const attempts = r.attempts + 1;
    if (attempts >= FRAUD_MAX_ATTEMPTS) {
      setFraud(prev => [...prev.filter(f => f.sender !== sender), { sender, attempts, blockedUntil: Date.now() + FRAUD_COOLDOWN_MS }]);
      return true;
    }
    setFraud(prev => [...prev.filter(f => f.sender !== sender), { sender, attempts, blockedUntil: 0 }]);
    return false;
  };

  // Payment countdown for Send Money session
  useEffect(() => {
    if (!payDeadline) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((payDeadline - Date.now()) / 1000));
      setPayLeft(left);
      if (left <= 0) {
        clearInterval(t);
        setPayExpired(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [payDeadline]);

  // Add Money countdown (personal number Send Money session)
  useEffect(() => {
    if (!addMoneyDeadline) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((addMoneyDeadline - Date.now()) / 1000));
      setAddMoneyLeft(left);
      if (left <= 0) {
        clearInterval(t);
        setAddMoneyExpired(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [addMoneyDeadline]);

  // Auto-expiry: cancel pending-payment orders whose window lapsed (invalid-order cleanup)
  useEffect(() => {
    const t = setInterval(() => {
      for (const o of orders) {
        if (o.paymentStatus === 'Pending' && o.placedAt && Date.now() - o.placedAt > PAY_AUTO_CANCEL_MS && (o.status === 'Pending' || o.status === 'Confirmed')) {
          onSilentUpdateOrder?.({ ...o, status: 'Cancelled', paymentStatus: 'Rejected', paymentNote: 'Payment window expired — order auto-cancelled' });
        }
      }
    }, 15000);
    return () => clearInterval(t);
  }, [orders, onSilentUpdateOrder]);

  // Payment reminder: nudge user ~5 min after a pending payment order is placed (before the 15-min window ends)
  useEffect(() => {
    const t = setInterval(() => {
      for (const o of orders) {
        if (o.paymentStatus === 'Pending' && o.placedAt && !reminded.includes(o.id)) {
          const age = Date.now() - o.placedAt;
          if (age >= 5 * 60 * 1000 && age < PAY_AUTO_CANCEL_MS) {
            setReminded(prev => [...prev, o.id]);
            setCustomerNotifs(prev => [{
              id: `CN-${Date.now().toString().slice(-4)}`, title: '⏰ Payment Reminder',
              body: `You still have time to complete the payment for order #${o.id}. Finish your Send Money within the window or it auto-cancels.`, emoji: '⏰', time: 'Just now', read: false
            }, ...prev]);
          }
        }
      }
    }, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, reminded]);

  // Notify when a pending payment gets approved/rejected (admin action visible to user)
  useEffect(() => {
    for (const ord of orders) {
      if ((ord.paymentStatus === 'Approved') && !seenCompletedRef.current.has(ord.id + '-pay-ok')) {
        seenCompletedRef.current.add(ord.id + '-pay-ok');
        setCustomerNotifs(prev => [{
          id: `CN-${Date.now().toString().slice(-4)}`, title: '✅ Payment Approved',
          body: `Payment for order #${ord.id} verified. Your order is confirmed!`, emoji: '✅', time: 'Just now', read: false
        }, ...prev]);
      }
      if ((ord.paymentStatus === 'Rejected') && !seenCompletedRef.current.has(ord.id + '-pay-no')) {
        seenCompletedRef.current.add(ord.id + '-pay-no');
        setCustomerNotifs(prev => [{
          id: `CN-${Date.now().toString().slice(-4)}`, title: '⏸ Order on Hold',
          body: `Payment for order #${ord.id} needs re-verification — your order is on hold${ord.paymentNote ? ` (${ord.paymentNote})` : ''}.`, emoji: '⏸', time: 'Just now', read: false
        }, ...prev]);
        // Auto-open a support ticket so the customer sees it "Under Review" in Help & Support
        // Old tickets for the same order are replaced (not accumulated) on the customer side
        setTickets(prev => [{
          id: `TCK-${Math.floor(100 + Math.random() * 900)}`,
          subject: `Payment under review — order #${ord.id}`,
          category: 'Payment Issue',
          status: 'Under Review',
          date: 'Just now',
          lastMessage: `Our team is re-verifying your ${ord.paymentMethod} payment for order #${ord.id}. You will be notified once it is confirmed.`
        }, ...prev.filter(t => !t.subject.includes(`order #${ord.id}`))]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const startPaySession = (wallet: WalletKey) => {
    setPayExpired(false);
    setSendMoney({ sender: customerPhone.replace(/[^0-9]/g, ''), trxId: '', amount: String(cartGrandTotal), receipt: '', note: customerPhone, last4: '' });
    setPayDeadline(Date.now() + PAY_SESSION_MS);
    setPayLeft(PAY_SESSION_MS / 1000);
  };
  const resetPaySession = () => {
    setPayDeadline(0);
    setPayLeft(0);
    setPayExpired(false);
  };
  const copyText = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(`${label} copied to clipboard`, 'success')).catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  };
  const fallbackCopy = (text: string, label: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast(`${label} copied to clipboard`, 'success'); } catch { showToast(`Number: ${text}`, 'info'); }
    document.body.removeChild(ta);
  };
  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) { showToast('Screenshot too large — max 2 MB', 'info'); return; }
    const reader = new FileReader();
    reader.onload = () => setSendMoney(s => ({ ...s, receipt: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  // Tracking live sim
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  // Order status-change notifications: when a tracked order reaches Delivered/Completed
  const seenCompletedRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const ord of orders) {
      if ((ord.status === 'Completed') && !seenCompletedRef.current.has(ord.id)) {
        const orderText = `${ord.id || ''} ${ord.storeName || ''}`;
        if (/(BDPOS-\d+|POS-\d+|Bangladesh POS Counter|The NexaGo BD Counter)/i.test(orderText)) {
          seenCompletedRef.current.add(ord.id);
          continue;
        }
        seenCompletedRef.current.add(ord.id);
        setCustomerNotifs(prev => [{
          id: `CN-${Date.now().toString().slice(-4)}`, title: '✅ Order Delivered',
          body: `Order #${ord.id} from ${ord.storeName} has been delivered. Enjoy!`, emoji: '🛵', time: 'Just now', read: false
        }, ...prev]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const filteredStores = useMemo(() => {
    return syncedStores.filter(store => {
      const matchesCategory = selectedCategory === 'All' || store.category === selectedCategory;
      const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.subtext.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'Rating') return b.rating - a.rating;
      if (sortBy === 'Fastest') return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
      return 0;
    });
  }, [selectedCategory, searchQuery, sortBy]);

  const toggleFavorite = (e: React.MouseEvent, storeId: string) => {
    e.stopPropagation();
    setFavoriteStoreIds(prev => {
      if (prev.includes(storeId)) {
        showToast('Favorite store removed', 'info');
        return prev.filter(id => id !== storeId);
      }
      showToast('Added to favorites ❤️', 'success');
      return [...prev, storeId];
    });
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const rawDeliveryCharge = selectedStore ? selectedStore.deliveryFee : 40;
  const deliveryCharge = appliedCoupon?.isFreeShip ? 0 : rawDeliveryCharge;
  const vatTax = Math.round(cartSubtotal * 0.05);
  const couponDiscountAmount = appliedCoupon?.discount || 0;
  const cartGrandTotal = Math.max(0, cartSubtotal + deliveryCharge + vatTax - couponDiscountAmount);

  const openStore = (store: StoreDef) => {
    setSelectedStore(store);
    setStoreCat('All');
    setStoreSearch('');
    setAppliedCoupon(null);
    setCouponInput('');
  };

  const storeOfProduct = (pid: string) => syncedStores.find(s => s.catalog.some(c => c.id === pid))?.name || '';

  const handleAddToCart = (prod: StoreProduct) => {
    if (prod.status === 'Out of Stock') {
      showToast(`${nm(prod.name)} is out of stock`, 'info');
      return;
    }
    if (cart.length > 0 && storeOfProduct(cart[0].product.id) && storeOfProduct(cart[0].product.id) !== storeOfProduct(prod.id)) {
      showToast('One store per order — complete your current order before adding from another store.', 'info');
      return;
    }
    const inCart = cart.find(i => i.product.id === prod.id);
    if (inCart && inCart.quantity >= prod.stock) {
      showToast(`Only ${prod.stock} available in stock`, 'info');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === prod.id);
      if (existing) return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: prod, quantity: 1 }];
    });
    showToast(`${nm(prod.name)} added to cart`, 'info');
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(i => {
        if (i.product.id === productId) {
          const newQty = i.quantity + delta;
          if (newQty > (i.product.stock || 99)) {
            showToast(`Max stock for ${nm(i.product.name)} reached`, 'info');
            return i;
          }
          return { ...i, quantity: newQty };
        }
        return i;
      });
      const removed = updated.find(i => i.product.id === productId && i.quantity <= 0);
      if (removed) showToast(`${nm(removed.product.name)} removed from cart`, 'info');
      return updated.filter(i => i.quantity > 0);
    });
  };

  const [customizeProd, setCustomizeProd] = useState<StoreProduct | null>(null);
  const [customizeQty, setCustomizeQty] = useState(1);
  const [customizeNote, setCustomizeNote] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [customizeExtra, setCustomizeExtra] = useState(false);
  const [customizeWeight, setCustomizeWeight] = useState(1); // 0.5 | 1 | 2

  const getProductCustomizations = (prod: StoreProduct): { label: string; key: string; choices: { label: string; multiplier: number; price: number }[] }[] => {
    const opts: { label: string; key: string; choices: { label: string; multiplier: number; price: number }[] }[] = [];
    const unit = prod.unit.toLowerCase();
    if (['kg', 'ltr', 'g', 'l', 'litre', 'liter'].some(u => unit.includes(u))) {
      const ul = unit.includes('ltr') || unit.includes('lit') || unit === 'l' ? 'L' : unit.includes('g') ? 'g' : 'kg';
      opts.push({
        label: ul === 'g' ? 'Weight' : ul === 'L' ? 'Volume' : 'Weight',
        key: 'weight',
        choices: ul === 'g' ? [
          { label: `100${ul}`, multiplier: 0.1, price: Math.round(prod.price * 0.1) },
          { label: `250${ul}`, multiplier: 0.25, price: Math.round(prod.price * 0.25) },
          { label: `500${ul}`, multiplier: 0.5, price: Math.round(prod.price * 0.5) },
          { label: `1 kg`, multiplier: 1, price: prod.price },
        ] : [
          { label: ul === 'L' ? `½ ${ul}` : `½ ${ul}`, multiplier: 0.5, price: Math.round(prod.price * 0.5) },
          { label: ul === 'L' ? `1 ${ul}` : `1 ${ul}`, multiplier: 1, price: prod.price },
          { label: ul === 'L' ? `2 ${ul}` : `2 ${ul}`, multiplier: 2, price: prod.price * 2 },
        ],
      });
    }
    return opts;
  };

  const computeCustomizeTotal = () => {
    if (!customizeProd) return 0;
    const opts = getProductCustomizations(customizeProd);
    const weightOpt = opts.find(o => o.key === 'weight');
    const mult = weightOpt ? (weightOpt.choices.find(c => c.multiplier === customizeWeight)?.multiplier || 1) : 1;
    return Math.round(customizeProd.price * mult * customizeQty);
  };

  const openCustomize = (prod: StoreProduct) => {
    setCustomizeProd(prod);
    setCustomizeQty(1);
    setCustomizeNote('');
    setCustomizeExtra(false);
    setCustomizeWeight(1);
  };

  const handleCustomizeAdd = () => {
    if (!customizeProd) return;
    if (customizeProd.status === 'Out of Stock') {
      showToast(`${nm(customizeProd.name)} is out of stock`, 'info');
      return;
    }
    if (cart.length > 0 && storeOfProduct(cart[0].product.id) && storeOfProduct(cart[0].product.id) !== storeOfProduct(customizeProd.id)) {
      showToast('One store per order — complete your current order before adding from another store.', 'info');
      return;
    }
    const opts = getProductCustomizations(customizeProd);
    const weightChoice = opts.find(o => o.key === 'weight')?.choices.find(c => c.multiplier === customizeWeight);
    if (customizeQty > (customizeProd.stock || 99)) {
      showToast(`Only ${customizeProd.stock} available in stock`, 'info');
      return;
    }
    const parts = [weightChoice ? weightChoice.label : '', customizeExtra ? 'Extra portion' : '', customizeNote.trim()].filter(Boolean);
    const note = parts.join(' · ');
    setCart(prev => {
      const existing = prev.find(i => i.product.id === customizeProd.id);
      if (existing) return prev.map(i => i.product.id === customizeProd.id ? { ...i, quantity: i.quantity + customizeQty, note: note || i.note } : i);
      return [...prev, { product: customizeProd, quantity: customizeQty, note: note || undefined }];
    });
    showToast(`${weightChoice ? `(${weightChoice.label}) ` : ''}${nm(customizeProd.name)} customized & added to cart`, 'success');
    setCustomizeProd(null);
  };

  const handleApplyCouponCode = (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) return;
    const found = COUPONS.find(c => c.code === code);
    if (!found) {
      showToast('Invalid promo coupon code', 'info');
      return;
    }
    if (cartSubtotal < found.minOrder) {
      showToast(`Minimum order ৳${found.minOrder} required for ${code}`, 'info');
      return;
    }
    if (found.isFreeShip) {
      setAppliedCoupon({ code: found.code, discount: 0, isFreeShip: true });
      showToast(`Coupon ${code} applied: Free Delivery!`, 'success');
    } else {
      setAppliedCoupon({ code: found.code, discount: found.discountValue });
      showToast(`Coupon ${code} applied: ৳${found.discountValue} discount!`, 'success');
    }
  };

  const finishOrder = (orderBase: Omit<Order, 'id' | 'date'>) => {
    onAddOrder({ ...orderBase, customerId });
    const cashback = Math.round(orderBase.amount * (tier.cashbackPct / 100));
    if (cashback > 0) {
      setWalletBalance(prev => prev + cashback);
      setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Cashback', amount: cashback, date: 'Just now', status: 'Completed', customerId }, ...prev]);
      setTotalSpend(prev => prev + orderBase.amount);
      setCustomerNotifs(prev => [{
        id: `CN-${Date.now().toString().slice(-4)}`, title: `${tier.icon} ${tier.label} Cashback`,
        body: `৳${cashback} cashback credited to your wallet.`, emoji: tier.icon, time: 'Just now', read: false
      }, ...prev]);
    }
    if (appliedCoupon?.code === 'SMARTSHOP') {
      setWalletBalance(prev => prev + 50);
      setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Cashback', amount: 50, date: 'Just now', status: 'Completed', customerId }, ...prev]);
    }
    setCustomerNotifs(prev => [{
      id: `CN-${Date.now().toString().slice(-4)}`, title: '✅ Order Placed',
      body: `Order ${orderBase.itemCount} item(s) from ${orderBase.storeName} — ${orderBase.priority || 'Normal'} delivery.`, emoji: '📦', time: 'Just now', read: false
    }, ...prev]);
    setCart([]);
    setOrderNote('');
    setAppliedCoupon(null);
    setSelectedStore(null);
    setIsCartDrawerOpen(false);
    setActiveNav('My Orders');
  };

  const requireCustomerDeliveryLocation = async (): Promise<{ lat: number; lng: number; meta: { accuracy?: number; capturedAt: string; source: 'browser-gps' | 'map-pin'; area: string } } | null> => {
    if (deliveryPin) {
      const area = deliveryLocationMeta?.area || nearestAreaOf(deliveryPin.lat, deliveryPin.lng);
      return {
        lat: deliveryPin.lat,
        lng: deliveryPin.lng,
        meta: {
          accuracy: deliveryLocationMeta?.accuracy,
          capturedAt: deliveryLocationMeta?.capturedAt || new Date().toISOString(),
          source: deliveryLocationMeta?.source === 'map-pin' ? 'map-pin' : 'browser-gps',
          area,
        },
      };
    }
    if (!('geolocation' in navigator)) {
      showToast('Map থেকে delivery pin দিন অথবা browser location Allow করুন.', 'info');
      return null;
    }
    setLocationSharingPaused(true);
    try { localStorage.setItem('nexago_customer_location_paused', '1'); } catch { /* ignore */ }
    setLocationConsentAction('delivery');
    showToast('Order করতে app location popup থেকে Allow Location চাপুন.', 'info');
    return null;
  };

  useEffect(() => {
    if (!custVerified) {
      setLocationPermissionState('checking');
      setLocationConsentAction(null);
      return;
    }
    if (!('geolocation' in navigator)) {
      setLocationPermissionState('unsupported');
      return;
    }
    let cancelled = false;
    const savedAllowed = () => {
      try { return localStorage.getItem('nexago_customer_location_allowed') === '1'; } catch { return false; }
    };
    const savedPaused = () => {
      try { return localStorage.getItem('nexago_customer_location_paused') === '1'; } catch { return false; }
    };
    const askFromApp = () => {
      if (!cancelled) setLocationConsentAction(prev => prev || 'delivery');
    };
    const applyPermissionState = (state: PermissionState) => {
      setLocationPermissionState(state as 'granted' | 'denied' | 'prompt');
      if (state === 'granted' && savedAllowed() && !savedPaused()) {
        setLocationSharingPaused(false);
        setLocationConsentAction(null);
        return;
      }
      if (state === 'denied') {
        setLocationSharingPaused(true);
        try { localStorage.setItem('nexago_customer_location_paused', '1'); } catch { /* ignore */ }
      }
      askFromApp();
    };
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((status) => {
        if (cancelled) return;
        applyPermissionState(status.state);
        status.onchange = () => {
          if (cancelled) return;
          applyPermissionState(status.state);
        };
      }).catch(askFromApp);
    } else {
      if (savedAllowed() && !savedPaused()) {
        setLocationPermissionState('granted');
        setLocationConsentAction(null);
      } else {
        askFromApp();
      }
    }
    const recheckLocationPermission = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (savedAllowed() && !savedPaused()) {
        setLocationPermissionState('granted');
        setLocationSharingPaused(false);
        setLocationConsentAction(null);
      } else {
        askFromApp();
      }
    };
    window.addEventListener('focus', recheckLocationPermission);
    document.addEventListener('visibilitychange', recheckLocationPermission);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', recheckLocationPermission);
      document.removeEventListener('visibilitychange', recheckLocationPermission);
    };
  }, [custVerified]);

  useEffect(() => {
    setNotificationPermissionState('Notification' in window ? Notification.permission : 'unsupported');
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'camera' as PermissionName }).then((status) => {
        setCameraPermissionState(status.state as 'granted' | 'denied' | 'prompt');
        status.onchange = () => setCameraPermissionState(status.state as 'granted' | 'denied' | 'prompt');
      }).catch(() => setCameraPermissionState(navigator.mediaDevices?.getUserMedia ? 'prompt' : 'unsupported'));
    } else {
      setCameraPermissionState(navigator.mediaDevices?.getUserMedia ? 'prompt' : 'unsupported');
    }
  }, []);

  const requestCameraPermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPermissionState('unsupported');
      showToast('Camera permission is not supported on this browser/device.', 'info');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermissionState('granted');
      showToast('Camera permission allowed.', 'success');
    } catch {
      setCameraPermissionState('denied');
      showToast('Camera permission denied. Enable it from browser site settings.', 'info');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setNotificationPermissionState('unsupported');
      showToast('Notifications are not supported on this browser/device.', 'info');
      return;
    }
    const result = await Notification.requestPermission();
    setNotificationPermissionState(result);
    showToast(result === 'granted' ? 'Notification permission allowed.' : 'Notification permission not allowed.', result === 'granted' ? 'success' : 'info');
  };

  const handlePlaceCustomerOrder = async () => {
    if (cart.length === 0) {
      showToast('Your cart is empty. Add items to order!', 'info');
      return;
    }
    if (!custVerified) {
      showToast('Sign in with your Gmail first to place an order', 'info');
      return;
    }
    const loc = await requireCustomerDeliveryLocation();
    if (!loc) return;
    proceedToPlaceOrder();
  };

  const proceedToPlaceOrder = () => {
    if (SEND_MONEY_METHODS.includes(paymentMethod as WalletKey)) {
      setPayModal(paymentMethod);
      setPinInput('');
      setCardInfo({ number: '', name: '', expiry: '', cvv: '' });
      startPaySession(paymentMethod as WalletKey);
      return;
    }
    if (paymentMethod === 'Card' || paymentMethod === 'Split (Wallet + bKash)') {
      setPayModal(paymentMethod);
      setPinInput('');
      setCardInfo({ number: '', name: '', expiry: '', cvv: '' });
      setSplitWalletAmount(Math.min(walletBalance, cartGrandTotal));
      return;
    }
    setPayModal('COD');
  };

  const confirmPayment = async () => {
    const liveLocation = await requireCustomerDeliveryLocation();
    if (!liveLocation) return;
    const targetStore = selectedStore || (cart[0] ? syncedStores.find(s => s.catalog.some(c => c.id === cart[0].product.id)) || null : null);
    if (!targetStore) {
      showToast('Please choose a store first to place your order.', 'info');
      return;
    }
    const dest = [liveLocation.lat, liveLocation.lng] as [number, number];
    const estimated = parseInt(targetStore.deliveryTime) || 35;
    const assigned = liveDriverOf({ storeName: targetStore.name, pickupCoords: targetStore.pickup } as Order);
    const deliveryPinCode = String(Math.floor(1000 + Math.random() * 9000));

    // Split payment: deduct wallet portion now
    let splitDeduct = 0;
    if (paymentMethod === 'Split (Wallet + bKash)' && splitWalletAmount > 0) {
      splitDeduct = Math.min(splitWalletAmount, walletBalance, cartGrandTotal);
      setWalletBalance(prev => prev - splitDeduct);
      setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Order Payment', amount: -splitDeduct, date: 'Just now', status: 'Completed', customerId }, ...prev]);
    }

    const isSendMoney = payModal !== null && SEND_MONEY_METHODS.includes(payModal as WalletKey);
    const trxId = (sendMoney.trxId || '').trim().toUpperCase();

    finishOrder({
      customerName: customerProfile.name,
      storeName: targetStore.name,
      amount: cartGrandTotal,
      status: 'Pending',
      paymentMethod: isSendMoney
        ? `${payModal} (Send Money)`
        : paymentMethod === 'Split (Wallet + bKash)' ? `Split (Wallet ৳${splitDeduct} + bKash ৳${cartGrandTotal - splitDeduct})` : paymentMethod,
      paymentStatus: isSendMoney ? 'Pending' : (paymentMethod === 'Cash on Delivery' ? 'COD' : 'Paid'),
      trxId: isSendMoney ? trxId : undefined,
      senderNumber: isSendMoney ? sendMoney.sender.replace(/[^0-9]/g, '') : undefined,
      last4: isSendMoney ? sendMoney.last4.replace(/[^0-9]/g, '').slice(-4) : undefined,
      trxAmount: isSendMoney ? (parseFloat(sendMoney.amount) || cartGrandTotal) : undefined,
      receipt: isSendMoney ? sendMoney.receipt : undefined,
      reference: isSendMoney ? sendMoney.note : undefined,
      paymentExpiry: isSendMoney ? Date.now() + PAY_AUTO_CANCEL_MS : undefined,
      customerPhone,
      address: deliveryAddress,
      deliveryCoords: { lat: dest[0], lng: dest[1] },
      deliveryLocationMeta: liveLocation.meta,
      pickupCoords: targetStore.pickup,
      pickupLocation: targetStore.name,
      driverId: undefined,
      itemCount: cart.reduce((s, i) => s + i.quantity, 0),
      deliveryCharge,
      estimatedMinutes: estimated,
      priority: cartGrandTotal > 1500 ? 'Express' : 'Normal',
      scheduledSlot: isScheduled ? scheduleSlot : undefined,
      deliveryPin: deliveryPinCode,
      splitWalletAmount: splitDeduct || undefined,
      customerNote: orderNote.trim() || undefined,
      items: cart.map(i => ({ productId: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity }))
    });
    if (isSendMoney && trxId) {
      setTrxUsed(prev => [{ trxId, orderId: '', at: Date.now() }, ...prev.filter(t => t.trxId !== trxId)]);
    }
    setPayModal(null);
    resetPaySession();
    setIsScheduled(false);
    showToast(isSendMoney ? `Payment submitted — order #pending admin verification` : `Order placed successfully with ${nm(targetStore.name)}!`, isSendMoney ? 'info' : 'success');
  };

  const confirmSendMoney = () => {
    if (!payModal) return;
    const sender = sendMoney.sender.replace(/[^0-9]/g, '');
    const trxId = (sendMoney.trxId || '').trim().toUpperCase();
    if (payExpired) { showToast('Payment session expired — restart to place a fresh order', 'info'); return; }
    if (fraudBlocked(sender)) { showToast('Too many invalid attempts — payment temporarily blocked. Try again in a few minutes.', 'info'); return; }
    if (sender.length < 10) { showToast('Enter the 11-digit mobile number that sent the money', 'info'); registerFraudAttempt(sender); return; }
    const last4 = sendMoney.last4.replace(/[^0-9]/g, '');
    if (!/^\d{4}$/.test(last4)) { showToast('Enter the last 4 digits of the sending number for verification', 'info'); return; }
    if (!sender.endsWith(last4)) { showToast('Last 4 digits must match the last 4 digits of your sending number', 'info'); return; }
    if (!TRX_RE.test(trxId)) { showToast(`Invalid ${payModal} TrxID — expected 8–20 letters/digits (e.g. ${WALLET_META[payModal as WalletKey].trxPlaceholder})`, 'info'); registerFraudAttempt(sender); return; }
    if (trxUsed.some(t => t.trxId === trxId)) { showToast('This TrxID was already used — duplicate transactions are blocked', 'info'); registerFraudAttempt(sender); return; }
    if (!sendMoney.receipt) { showToast('Upload the payment screenshot/receipt before submitting', 'info'); return; }
    const claimed = parseFloat(sendMoney.amount) || 0;
    if (Math.abs(claimed - cartGrandTotal) > 0.01) { showToast(`Sent amount must match exactly ৳${cartGrandTotal} — you entered ৳${claimed}`, 'info'); return; }
    void confirmPayment();
  };

  const submitRefund = () => {
    if (!refundModal) return;
    const num = refundNumber.replace(/[^0-9]/g, '');
    if (num.length < 10) { showToast('Enter your valid bKash/Nagad/Upay/Rocket number', 'info'); return; }
    if (!refundReason.trim()) { showToast('Tell us why you want a refund', 'info'); return; }
    setRefunds(prev => [{
      id: `RF-${Date.now().toString().slice(-5)}`,
      orderId: refundModal.id,
      method: refundMethod,
      number: num,
      amount: refundModal.amount,
      reason: refundReason.trim(),
      status: 'Requested',
      at: Date.now(),
      customerId,
    }, ...prev]);
    setCustomerNotifs(prev => [{
      id: `CN-${Date.now().toString().slice(-4)}`, title: '↩ Refund Request Submitted',
      body: `Refund of ৳${refundModal.amount} for order #${refundModal.id} is under review.`, emoji: '↩', time: 'Just now', read: false
    }, ...prev]);
    setRefundModal(null);
    setRefundReason('');
    setRefundNumber('');
    showToast('Refund request submitted — admin will review soon', 'success');
  };

  const submitReturn = () => {
    if (!returnModal) return;
    if (!returnReason.trim()) { showToast('Select a reason for the return', 'info'); return; }
    setReturns(prev => [{
      id: `RT-${Date.now().toString().slice(-5)}`,
      orderId: returnModal.id,
      customerId,
      customerName: customerProfile.name,
      customerPhone: customerProfile.phone,
      storeName: returnModal.storeName,
      amount: returnModal.amount,
      reason: returnReason.trim(),
      note: returnNote.trim() || undefined,
      status: 'Requested',
      at: Date.now(),
    }, ...prev]);
    // Notify store + platform
    try {
      const notifs = JSON.parse(localStorage.getItem('sd_notifications') || '[]');
      localStorage.setItem('sd_notifications', JSON.stringify([
        { id: `NOTIF-${Date.now().toString().slice(-8)}`, title: '↩️ Return Request — #' + returnModal.id, message: `${customerProfile.name} requested a return for order #${returnModal.id} (৳${returnModal.amount}): ${returnReason.trim()}.`, type: 'order', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false, audience: 'store' },
        { id: `NOTIF-${Date.now().toString().slice(-8)}`, title: '↩️ Return Requested', message: `${customerProfile.name} wants to return order #${returnModal.id} (৳${returnModal.amount}).`, type: 'order', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false, audience: 'all' },
        ...notifs,
      ]));
    } catch { /* noop */ }
    setCustomerNotifs(prev => [{
      id: `CN-${Date.now().toString().slice(-4)}`, title: '↩️ Return Request Submitted',
      body: `Return for order #${returnModal.id} (৳${returnModal.amount}) submitted — ${returnReason.trim()}. We will arrange pickup soon.`, emoji: '↩️', time: 'Just now', read: false
    }, ...prev]);
    setReturnModal(null);
    setReturnReason('');
    setReturnNote('');
    showToast('Return request submitted — pickup will be scheduled', 'success');
  };

  const reorder = (ord: Order) => {
    const store = syncedStores.find(s => s.name === ord.storeName) || syncedStores[0];
    setSelectedStore(store);
    setStoreCat('All');
    setStoreSearch('');
    setAppliedCoupon(null);
    setCouponInput('');
    const restocked: Array<{ product: StoreProduct; quantity: number }> = [];
    for (const it of ord.items || []) {
      const p = store.catalog.find(c => c.id === it.productId);
      if (p && p.status !== 'Out of Stock') restocked.push({ product: p, quantity: Math.min(it.quantity, p.stock || 1) });
    }
    if (restocked.length > 0) setCart(restocked);
    showToast(`Re-order cart ready from ${nm(store.name)}`, 'success');
  };

  const confirmCancelOrder = () => {
    if (!cancelConfirmId) return;
    const ord = orders.find(o => o.id === cancelConfirmId);
    if (ord) {
      const isCOD = /cash|cod/i.test(ord.paymentMethod);
      onUpdateOrder({ ...ord, status: 'Cancelled', paymentNote: isCOD ? 'Order cancelled by customer' : 'Order cancelled by customer — refund pending admin approval' });
      if (isCOD) {
        setCustomerNotifs(prev => [{
          id: `CN-${Date.now().toString().slice(-4)}`, title: '↩️ Order Cancelled',
          body: `Order #${ord.id} was cancelled. No online payment was made.`, emoji: '↩️', time: 'Just now', read: false
        }, ...prev]);
        showToast(`Order #${ord.id} cancelled`, 'info');
      } else {
        setRefunds(prev => [{
          id: `RF-${Date.now().toString().slice(-5)}`,
          orderId: ord.id,
          method: ord.paymentMethod.includes('Wallet') ? 'Smart Wallet' : ord.paymentMethod,
          number: ord.paymentMethod.includes('Wallet') ? 'Smart Wallet' : customerProfile.phone,
          amount: ord.amount,
          reason: 'Order cancelled by customer',
          status: 'Requested',
          at: Date.now(),
          customerId,
        }, ...prev]);
        setCustomerNotifs(prev => [{
          id: `CN-${Date.now().toString().slice(-4)}`, title: '↩️ Order Cancelled — Refund Pending',
          body: `Order #${ord.id} was cancelled. Refund of ৳${ord.amount} is pending admin approval.`, emoji: '↩️', time: 'Just now', read: false
        }, ...prev]);
        showToast(`Order #${ord.id} cancelled — refund ৳${ord.amount} pending admin approval`, 'info');
      }
    }
    setCancelConfirmId(null);
  };

  const submitRiderRating = () => {
    if (!rateRiderOrder) return;
    const drv = liveDriverOf(rateRiderOrder);
    const driverName = drv ? drv.name : rateRiderOrder.driverId || 'Your Rider';
    setRiderRatings(prev => ({ ...prev, [rateRiderOrder.id]: { driverName, score: riderRateVal } }));
    // Notify the rated rider directly
    try {
      const notifs = JSON.parse(localStorage.getItem('sd_notifications') || '[]');
      localStorage.setItem('sd_notifications', JSON.stringify([{
        id: `NOTIF-${Date.now().toString().slice(-8)}`, title: '⭐ New Rider Rating',
        message: `Customer rated you ${riderRateVal}★ after delivering order #${rateRiderOrder.id}.`,
        type: 'driver', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false,
        audience: 'driver', driverId: drv?.id || rateRiderOrder.driverId,
      }, ...notifs]));
    } catch { /* noop */ }
    setCustomerNotifs(prev => [{
      id: `CN-${Date.now().toString().slice(-4)}`, title: '⭐ Rider Rated!',
      body: `You rated ${driverName} ${riderRateVal}★. Thank you for the feedback!`, emoji: '⭐', time: 'Just now', read: false
    }, ...prev]);
    setRateRiderOrder(null);
    setRiderRateVal(5);
    showToast(`${driverName} rated ${riderRateVal}★ — thanks for your feedback!`, 'success');
  };

  const sendChatMessage = () => {
    if (!chatOrderId || !chatInput.trim()) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const mine: ChatMsg = { id: `CM-${Date.now()}`, from: 'me', text: chatInput.trim(), time: now };
    setChatMessages(prev => ({ ...prev, [chatOrderId]: [...(prev[chatOrderId] || []), mine] }));
    setChatInput('');
    const rider = liveDriverOf(orders.find(o => o.id === chatOrderId) as Order);
    const autoReplies = [
      `আপনার অর্ডারটি ${trackVeh?.roadName || 'পথে'} আছে, ${etaMins} মিনিটের মধ্যে পৌঁছাবে ইনশাআল্লাহ।`,
      'Sure, I will deliver it to your door. Please keep the cash / PIN ready.',
      'I am on my way. If you need anything else, text me here anytime.',
    ];
    const replyText = autoReplies[Math.floor(Math.random() * autoReplies.length)];
    setTimeout(() => {
      const rnow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const reply: ChatMsg = { id: `CM-${Date.now() + 1}`, from: 'rider', text: replyText, time: rnow };
      setChatMessages(prev => ({ ...prev, [chatOrderId]: [...(prev[chatOrderId] || []), reply] }));
    }, 1200);
  };

  const submitStoreRating = () => {
    if (!rateOrder) return;
    const key = rateOrder.storeName;
    setStoreRatings(prev => {
      const agg = prev[key] || { total: 0, count: 0 };
      return { ...prev, [key]: { total: agg.total + rateVal, count: agg.count + 1 } };
    });
    // Persist to the shared store-rating registry so the store portal can show it
    try {
      const reg = JSON.parse(localStorage.getItem('sd_store_ratings') || '{}');
      const agg = reg[key] || { total: 0, count: 0 };
      localStorage.setItem('sd_store_ratings', JSON.stringify({ ...reg, [key]: { total: agg.total + rateVal, count: agg.count + 1 } }));
    } catch { /* noop */ }
    // Notify the store + platform of the new rating
    try {
      const notifs = JSON.parse(localStorage.getItem('sd_notifications') || '[]');
      localStorage.setItem('sd_notifications', JSON.stringify([{
        id: `NOTIF-${Date.now().toString().slice(-8)}`, title: '⭐ New Store Rating',
        message: `${customerProfile.name} rated ${key} ${rateVal}★${rateComment ? ` — "${rateComment}"` : ''}.`,
        type: 'order', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false,
        audience: 'store',
      }, ...notifs]));
    } catch { /* noop */ }
    setCustomerNotifs(prev => [{
      id: `CN-${Date.now().toString().slice(-4)}`, title: '⭐ Thank you for rating!',
      body: `Your ${rateVal}-star rating for ${key} has been published.`, emoji: '⭐', time: 'Just now', read: false
    }, ...prev]);
    setRateOrder(null);
    setRateComment('');
    setRateVal(5);
    showToast(`Thanks! ${rateVal}-star rating submitted for ${key}`, 'success');
  };

  const toggleWatch = (productId: string) => {
    setWatchedProducts(prev => {
      const has = prev.includes(productId);
      const next = has ? prev.filter(id => id !== productId) : [...prev, productId];
      showToast(has ? 'Removed price-drop alert' : 'Price-drop alert set for this product', 'info');
      return next;
    });
  };

  // Watched product price-drop / restock alert monitor
  useEffect(() => {
    if (watchedProducts.length === 0) return;
    const check = () => {
      setWatchSnapshot(snap => {
        let changed = false;
        let next = { ...snap };
        for (const s of syncedStores) {
          for (const p of s.catalog) {
            if (!watchedProducts.includes(p.id)) continue;
            const prevSnap = next[p.id];
            if (!prevSnap) { next[p.id] = { stock: p.stock, price: p.price }; continue; }
            const restocked = prevSnap.stock === 0 && p.stock > 0;
            const priceDrop = p.price < prevSnap.price;
            if (restocked || priceDrop) {
              changed = true;
              setCustomerNotifs(prevN => [{
                id: `CN-${Date.now().toString().slice(-4)}`, title: restocked ? '🔔 Back in Stock!' : '📉 Price Dropped!',
                body: `${nm(p.name)} ${restocked ? 'is now available again' : `now ৳${p.price} (was ৳${prevSnap.price})`} at ${nm(s.name)}.`,
                emoji: restocked ? '🔔' : '📉', time: 'Just now', read: false
              }, ...prevN]);
            }
            next[p.id] = { stock: p.stock, price: p.price };
          }
        }
        return changed ? next : snap;
      });
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedProducts, syncedStores]);

  const areaOfOrder = (ord: Order) => {
    if (ord.deliveryCoords) return ord.deliveryCoords;
    if (ord.address) {
      const m = ord.address.match(/(Dhanmondi|Gulshan|Banani|Mirpur|Motijheel|Uttara|Badda|Tejgaon|Farmgate|Shahbagh)/i);
      if (m) return { lat: AREA_COORDS[m[1]][0], lng: AREA_COORDS[m[1]][1] };
    }
    return { lat: 23.7539, lng: 90.3836 };
  };
  const pickupOfOrder = (ord: Order) => {
    if (ord.pickupCoords) return ord.pickupCoords;
    const st = syncedStores.find(s => s.name === ord.storeName);
    return st ? st.pickup : { lat: 23.7806, lng: 90.4009 };
  };

  // Real live-driver tracking — uses the exact same admin liveDrivers sim.
  const liveDriverOf = (ord: Order) => {
    if (ord.driverId) {
      const exact = liveDrivers.find(d => d.id === ord.driverId);
      if (exact) return exact;
    }
    const pk = pickupOfOrder(ord);
    let best: LiveDriverSim | null = null;
    let bestD = Infinity;
    for (const d of liveDrivers) {
      if (d.status === 'Offline') continue;
      const dd = Math.pow(d.lat - pk.lat, 2) + Math.pow(d.lng - pk.lng, 2);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  };

  const trackingDriver = trackingOrder ? liveDriverOf(trackingOrder) : null;
  const qrLiveOrder = qrOrder ? (orders.find(o => o.id === qrOrder.id) || qrOrder) : null;

  const liveProgressOf = (ord: Order) => {
    const drv = liveDriverOf(ord);
    const pk = pickupOfOrder(ord);
    const dv = areaOfOrder(ord);
    if (!drv) return statusProgressFloor(ord.status);
    if (!Number.isFinite(drv.lat) || !Number.isFinite(drv.lng) || !Number.isFinite(dv.lat) || !Number.isFinite(dv.lng)) return statusProgressFloor(ord.status);
    const total = Math.sqrt(Math.pow(dv.lat - pk.lat, 2) + Math.pow(dv.lng - pk.lng, 2)) || 1;
    const left = Math.sqrt(Math.pow(dv.lat - drv.lat, 2) + Math.pow(dv.lng - drv.lng, 2));
    const p = Math.min(1, Math.max(0, 1 - left / total));
    return Math.max(statusProgressFloor(ord.status), p);
  };

  // Deterministic route progress: rider starts AT the store (0) → picks up → moves to the customer (1).
  // Advances over the order's ETA window using placedAt, floored by status so a fresh order is never "delivered".
  const routeProgressOf = (ord: Order | null | undefined) => {
    if (!ord) return 0;
    const floor = statusProgressFloor(ord.status);
    if (floor >= 1) return 1;
    const eta = Math.max(1, parseInt(String(ord.estimatedMinutes || 35), 10) || 35);
    const elapsed = ord.placedAt ? (Date.now() - ord.placedAt) / 60000 : 0;
    return Math.max(floor, Math.min(1, elapsed / eta));
  };

  // Rider position interpolated along the store→customer line so the shared link always shows
  // the rider AT the store first and then heading to the customer's location after pickup.
  const routePosOf = (ord: Order, p: number) => {
    const pk = pickupOfOrder(ord);
    const dv = areaOfOrder(ord);
    return { lat: pk.lat + (dv.lat - pk.lat) * p, lng: pk.lng + (dv.lng - pk.lng) * p };
  };

  const trackProgress = useMemo(() => routeProgressOf(trackingOrder), [trackingOrder]);

  const trackVeh: LiveVeh | null = useMemo(() => {
    if (!trackingOrder) return null;
    const dv = areaOfOrder(trackingOrder);
    const pk = pickupOfOrder(trackingOrder);
    const drv = trackingDriver;
    if (!drv) return null;
    const pos = routePosOf(trackingOrder, trackProgress);
    return {
      id: `TRK-${trackingOrder.id}`,
      name: drv.name,
      status: trackProgress >= 0.9 ? 'Delivered' : 'On-Delivery',
      vehicleType: drv.vehicleType || 'Bike',
      dest: 'Customer',
      speed: trackProgress >= 0.9 ? 0 : drv.speed,
      lat: pos.lat, lng: pos.lng, tLat: dv.lat, tLng: dv.lng,
      roadName: trackProgress < 0.12 ? `${trackingOrder.storeName} pickup point` : 'En route to you',
      restLat: pk.lat, restLng: pk.lng, restName: trackingOrder.storeName,
      custLat: dv.lat, custLng: dv.lng, custName: safeText(trackingOrder.address || deliveryAddress).split(',').pop()?.trim() || 'Your Address'
    };
  }, [trackingOrder, trackingDriver, trackProgress]);

  const etaMins = Math.max(1, Math.round((parseInt(trackingOrder?.estimatedMinutes ? String(trackingOrder.estimatedMinutes) : '35') || 35) * (1 - trackProgress)));
  const activeStepIdx = ETA_STEPS.filter(s => trackProgress >= s.min).length - 1;

  // Auto-advance order status from rider progress + auto notifications (self-sufficient customer temporary)
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const driversRef = useRef(liveDrivers);
  driversRef.current = liveDrivers;
  const silentUpdateRef = useRef(onSilentUpdateOrder);
  silentUpdateRef.current = onSilentUpdateOrder;
  const storesRef = useRef(syncedStores);
  storesRef.current = syncedStores;
  const autoNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      const cur = ordersRef.current;
      const drvs = driversRef.current;
      const sts = storesRef.current;
      cur.forEach(o => {
        if (o.status === 'Completed' || o.status === 'Cancelled') return;
        if (!['Confirmed', 'Processing', 'Ongoing', 'Pending'].includes(o.status)) return;
        const pk = o.pickupCoords || (() => { const st = sts.find(s => s.name === o.storeName); return st ? st.pickup : { lat: 23.7806, lng: 90.4009 }; })();
        let drv = null;
        if (o.driverId) drv = drvs.find(d => d.id === o.driverId) || null;
        if (!drv) {
          let best: LiveDriverSim | null = null;
          let bestD = Infinity;
          for (const d of drvs) {
            if (d.status === 'Offline') continue;
            const dd = Math.pow(d.lat - pk.lat, 2) + Math.pow(d.lng - pk.lng, 2);
            if (dd < bestD) { bestD = dd; best = d; }
          }
          drv = best;
        }
        if (!drv) return;
        // Route progress: rider at store (0) → pickup → customer (1)
        const p = routeProgressOf(o);
        const next = p < 0.35 ? 'Confirmed' : p < 0.7 ? 'Processing' : 'Ongoing';
        if (next !== o.status && silentUpdateRef.current) {
          silentUpdateRef.current({ ...o, status: next });
          const nKey = `${o.id}:${next}`;
          if (!autoNotifiedRef.current.has(nKey)) {
            autoNotifiedRef.current.add(nKey);
            const notif = next === 'Ongoing'
              ? { title: '🛵 Order On The Way!', body: `Order #${o.id} from ${o.storeName} is now with your rider.`, emoji: '🛵' }
              : next === 'Processing'
              ? { title: '👨‍🍳 Preparing Your Order', body: `${o.storeName} is preparing order #${o.id}.`, emoji: '👨‍🍳' }
              : { title: '✅ Order Confirmed', body: `Order #${o.id} confirmed. Rider is heading to ${o.storeName}.`, emoji: '📦' };
            setCustomerNotifs(prev => [{ id: `CN-${Date.now().toString().slice(-4)}`, title: notif.title, body: notif.body, emoji: notif.emoji, time: 'Just now', read: false }, ...prev]);
          }
        }
        if (p >= 0.9 && o.status !== 'Completed') {
          const nearKey = `${o.id}:near`;
          if (!autoNotifiedRef.current.has(nearKey)) {
            autoNotifiedRef.current.add(nearKey);
            setCustomerNotifs(prev => [{ id: `CN-${Date.now().toString().slice(-4)}`, title: '🔔 Rider Is Nearby!', body: `Order #${o.id} is arriving. Keep your delivery PIN ${o.deliveryPin || '—'} ready.`, emoji: '🔔', time: 'Just now', read: false }, ...prev]);
          }
        }
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      showToast('Geolocation is not available on this device', 'info');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationPermissionState('granted');
        setLocationSharingPaused(false);
        try {
          localStorage.setItem('nexago_customer_location_allowed', '1');
          localStorage.setItem('nexago_customer_location_paused', '0');
        } catch { /* ignore */ }
        setDeliveryPin({ lat, lng });
        // Auto-fill the delivery address text from the pinned location — in Bangla or English
        const area = nearestAreaOf(lat, lng);
        setDeliveryLocationMeta({ accuracy: pos.coords.accuracy, capturedAt: new Date().toISOString(), source: 'browser-gps', area });
        const reverse = await reverseGeocodeLocation(lat, lng);
        const addrText = reverse?.display || (area
          ? (lang === 'bn'
            ? `আপনার বর্তমান অবস্থান, ${AREA_NAMES_BN[area]}, ঢাকা`
            : `Your current location, ${area}, Dhaka`)
          : `Live GPS location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        setDeliveryAddress(addrText);
        showToast('Current location pinned — address updated', 'success');
      },
      () => {
        setLocationPermissionState('denied');
        setLocationSharingPaused(true);
        try { localStorage.setItem('nexago_customer_location_paused', '1'); } catch { /* ignore */ }
        setLocationConsentAction('delivery');
        showToast('Could not fetch location — allow location permission to continue', 'info');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const captureAddressLocation = () => {
    if (!('geolocation' in navigator)) {
      showToast('Geolocation is not available on this device', 'info');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const area = nearestAreaOf(lat, lng);
        const reverse = await reverseGeocodeLocation(lat, lng);
        setLocationPermissionState('granted');
        setLocationSharingPaused(false);
        try {
          localStorage.setItem('nexago_customer_location_allowed', '1');
          localStorage.setItem('nexago_customer_location_paused', '0');
        } catch { /* ignore */ }
        setNewAddrCoords({ lat, lng, accuracy: pos.coords.accuracy, source: 'gps' });
        if (!newAddrArea.trim()) {
          const nextArea = reverse?.area || (area ? `${area}, Bangladesh` : '');
          setNewAddrArea(nextArea);
          setNewAddrDivision(districtDivisionOf(nextArea.replace(/,\s*Bangladesh$/i, '')));
        }
        if (!newAddrZipCode.trim()) setNewAddrZipCode(reverse?.zipCode || '');
        if (!newAddrStreet.trim()) setNewAddrStreet(reverse?.street || reverse?.display || `Live GPS location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        showToast('Live location added to this address', 'success');
      },
      () => {
        setLocationPermissionState('denied');
        setLocationSharingPaused(true);
        try { localStorage.setItem('nexago_customer_location_paused', '1'); } catch { /* ignore */ }
        setLocationConsentAction('address');
        showToast('Location permission denied. Allow location to save live GPS address.', 'info');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const isCustomerLocationAllowed = () => {
    try {
      return localStorage.getItem('nexago_customer_location_allowed') === '1'
        && localStorage.getItem('nexago_customer_location_paused') !== '1';
    } catch {
      return false;
    }
  };

  const requestLocationFromApp = (action: 'delivery' | 'address') => {
    if (locationPermissionState === 'granted' && !locationSharingPaused && isCustomerLocationAllowed()) {
      if (action === 'address') captureAddressLocation();
      else locateMe();
      return;
    }
    setLocationConsentAction(action);
  };

  const updateNewAddressPin = async (lat: number, lng: number) => {
    const area = nearestAreaOf(lat, lng);
    setNewAddrCoords({ lat, lng, source: 'manual' });
    const reverse = await reverseGeocodeLocation(lat, lng);
    setNewAddrArea(reverse?.area || (area ? `${area}, Dhaka` : ''));
    setNewAddrDivision(districtDivisionOf((reverse?.area || area).replace(/,\s*Bangladesh$/i, '')));
    setNewAddrZipCode(reverse?.zipCode || '');
    setNewAddrStreet(reverse?.street || reverse?.display || `Pinned map location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
  };

  const confirmLocationFromApp = () => {
    const action = locationConsentAction;
    setLocationConsentAction(null);
    setLocationSharingPaused(false);
    if (action === 'address') captureAddressLocation();
    else locateMe();
  };

  const turnOffLocationSharing = () => {
    setLocationSharingPaused(true);
    try { localStorage.setItem('nexago_customer_location_paused', '1'); } catch { /* ignore */ }
    setDeliveryPin(null);
    setDeliveryLocationMeta(null);
    setLocationConsentAction('delivery');
    showToast('Location sharing turned off. Allow location again to continue.', 'info');
  };

  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet) return;
    const newAddrObj: SavedAddress = {
      id: editingAddressId || `ADDR-${Date.now().toString().slice(-3)}`,
      title: newAddrTitle, address: newAddrStreet, area: newAddrArea, phone: newAddrPhone,
      isDefault: editingAddressId ? Boolean(addresses.find(a => a.id === editingAddressId)?.isDefault) : addresses.length === 0,
      zipCode: newAddrZipCode.trim(),
      email: newAddrEmail.trim(),
      emailVerified: newAddrEmailVerified,
      lat: newAddrCoords?.lat,
      lng: newAddrCoords?.lng,
      accuracy: newAddrCoords?.accuracy,
      source: newAddrCoords?.source || 'manual'
    };
    setAddresses(prev => editingAddressId ? prev.map(a => a.id === editingAddressId ? newAddrObj : a) : [...prev, newAddrObj]);
    setIsAddingAddress(false);
    setEditingAddressId(null);
    setNewAddrTitle('');
    setNewAddrStreet('');
    setNewAddrDivision('');
    setNewAddrArea('');
    setNewAddrZipCode('');
    setNewAddrPhone('');
    setNewAddrEmail('');
    setNewAddrEmailVerified(false);
    setNewAddrCoords(null);
    showToast(editingAddressId ? 'Delivery address updated successfully!' : 'New delivery address saved successfully!', 'success');
  };

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setIsAddingAddress(false);
    setNewAddrTitle('');
    setNewAddrStreet('');
    setNewAddrDivision('');
    setNewAddrArea('');
    setNewAddrZipCode('');
    setNewAddrPhone('');
    setNewAddrEmail('');
    setNewAddrEmailVerified(false);
    setNewAddrCoords(null);
  };

  const startEditAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setNewAddrTitle(addr.title);
    setNewAddrStreet(addr.address);
    setNewAddrDivision(districtDivisionOf(addr.area.replace(/,\s*Bangladesh$/i, '')));
    setNewAddrArea(addr.area);
    setNewAddrZipCode(addr.zipCode || '');
    setNewAddrPhone(addr.phone);
    setNewAddrEmail(addr.email || '');
    setNewAddrEmailVerified(Boolean(addr.emailVerified));
    setNewAddrCoords(addr.lat && addr.lng ? { lat: addr.lat, lng: addr.lng, accuracy: addr.accuracy, source: addr.source || 'manual' } : null);
    setIsAddingAddress(true);
  };

  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayAccount) return;
    setPaymentMethods(prev => [...prev, {
      id: `PAY-${Date.now().toString().slice(-3)}`, type: newPayType, accountName: customerProfile.name, accountNumber: newPayAccount, isDefault: false,
      pin: newPayType === 'Card' ? undefined : String(Math.floor(10000 + Math.random() * 90000))
    }]);
    setIsAddingPayment(false);
    setNewPayAccount('');
    showToast(`${newPayType} account linked successfully!`, 'success');
  };

  const sendAddMoneyOtp = () => {
    const num = parseFloat(addMoneyAmount);
    if (isNaN(num) || num <= 0) { setAddMoneyError('Enter a valid amount'); return; }
    if (addMoneyMethod !== 'Card' && addMoneyPhone.trim().replace(/\D/g, '').length < 11) { setAddMoneyError('Enter a valid 11-digit phone number'); return; }
    if (addMoneyMethod === 'Card' && (addMoneyCard.name.trim() === '' || addMoneyCard.number.trim().replace(/\D/g, '').length < 12 || addMoneyCard.expiry.trim() === '' || addMoneyCard.cvv.length < 3)) {
      setAddMoneyError('Enter card holder name, 16-digit number, expiry & CVV'); return;
    }
    setAddMoneyError('');
    setAddMoneySender('');
    setAddMoneyLast4('');
    setAddMoneyTrxId('');
    setAddMoneyReceipt('');
    setAddMoneySentTo(addMoneyMethod === 'Card' ? `card **** ${addMoneyCard.number.replace(/\D/g, '').slice(-4)}` : addMoneyPhone.trim());
    setAddMoneyDeadline(Date.now() + 10 * 60 * 1000);
    setAddMoneyLeft(600);
    setAddMoneyExpired(false);
    setAddMoneyStep('send');
    showToast('Send money to the personal number shown below', 'info');
  };

  const confirmAddMoney = () => {
    const num = parseFloat(addMoneyAmount);
    const sender = addMoneySender.replace(/[^0-9]/g, '');
    if (addMoneyExpired) { setAddMoneyError('Payment session expired — start again'); return; }
    if (sender.length < 10) { setAddMoneyError('Enter the 11-digit mobile number that sent the money'); return; }
    const last4 = addMoneyLast4.replace(/[^0-9]/g, '');
    if (!/^\d{4}$/.test(last4)) { setAddMoneyError('Enter the last 4 digits of the sending number'); return; }
    if (!sender.endsWith(last4)) { setAddMoneyError('Last 4 digits must match the sending number'); return; }
    if (!/^[A-Z0-9]{8,20}$/.test(addMoneyTrxId.trim())) { setAddMoneyError('Invalid TrxID — expected 8–20 letters/digits from your SMS'); return; }
    if (!addMoneyReceipt) { setAddMoneyError('Upload the payment screenshot/receipt before submitting'); return; }
    setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Top-Up', amount: num, date: 'Just now', status: 'Pending', trxId: addMoneyTrxId.trim().toUpperCase(), receipt: addMoneyReceipt, sender: addMoneySender, method: addMoneyMethod === 'Card' ? 'Card' : addMoneyMethod, customerId }, ...prev]);
    setAddMoneyStep('pending');
    showToast('Payment received — admin will verify & add to your wallet', 'info');
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDetail) return;
    setTickets(prev => [{
      id: `TCK-${Math.floor(100 + Math.random() * 900)}`, subject: ticketSubject, category: ticketCategory, status: 'In Progress', date: 'Just now', lastMessage: ticketDetail, customerId
    }, ...prev]);
    setIsNewTicketModal(false);
    setTicketSubject('');
    setTicketDetail('');
    showToast('Support ticket submitted! Agent assigned.', 'success');
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const navItems: { key: typeof activeNav; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'Home', label: T.home, icon: <Home className="w-4 h-4" /> },
    { key: 'Orders', label: T.orders, icon: <Store className="w-4 h-4" /> },
    { key: 'My Orders', label: T.myOrders, icon: <Package className="w-4 h-4" />, badge: orders.length },
    { key: 'Favorites', label: T.favorites, icon: <Heart className="w-4 h-4 text-red-500 fill-red-500" />, badge: favoriteStoreIds.length },
    { key: 'Addresses', label: T.addresses, icon: <Map className="w-4 h-4" /> },
    { key: 'Payments', label: T.payments, icon: <CreditCard className="w-4 h-4" /> },
    { key: 'Wallet', label: T.wallet, icon: <Wallet className="w-4 h-4" /> },
    { key: 'Coupons', label: T.coupons, icon: <Ticket className="w-4 h-4 text-amber-500" /> },
    { key: 'Help', label: T.help, icon: <HelpCircle className="w-4 h-4" /> },
    { key: 'Settings', label: T.settings, icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className={`cs-glass min-h-screen font-sans text-gray-800 flex flex-col overflow-x-hidden ${dark ? 'cs-dark' : ''}`}>
      {!custVerified && (
        <CustomerAuthScreen
          lang={lang}
          dark={dark}
          email={customerProfile.email}
          name={customerProfile.name}
          phone={customerProfile.phone}
          customerId={customerId}
          onLangChange={setLang}
          onDarkChange={setDark}
          onUpdateProfile={(patch) => setCustomerProfile((p) => ({ ...p, ...patch }))}
          onVerified={(info) => {
            setCustVerified(true);
            try {
              localStorage.setItem('ss_cust_verified', '1');
              if (info?.customerId) {
                setCustomerId(info.customerId);
                localStorage.setItem('ss_cust_id', info.customerId);
              }
            } catch { /* ignore */ }
          }}
          showToast={showToast}
        />
      )}
      {custVerified && !isCustomerLocationAllowed() && (locationSharingPaused || locationPermissionState !== 'granted') && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 shadow-2xl p-6 text-white space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <LocateFixed className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Location Permission Required</h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Customer app use korte real delivery location permission Allow korte hobe. Allow na korle order, checkout, tracking, saved address location kaj korbe na.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300 space-y-1.5">
              <p className="font-bold text-white">Why needed</p>
              <p>Order-er sathe customer current location Super Admin, Store, Driver system-e real-time jabe.</p>
              <p>Manual address pore add korte parben, kintu first app unlock-er jonno device location Allow lagbe.</p>
            </div>
            {locationPermissionState === 'denied' && (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">
                Location off/blocked. App popup theke Allow Location চাপুন; browser blocked thakle site settings theke Location Allow করতে হবে.
              </div>
            )}
            {locationPermissionState === 'unsupported' && (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">
                Ei device/browser geolocation support korche na. Supported browser/device diye open korte hobe.
              </div>
            )}
            <button
              type="button"
              onClick={() => requestLocationFromApp('delivery')}
              disabled={isLocatingDelivery || locationPermissionState === 'unsupported'}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 disabled:text-slate-300 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2"
            >
              {isLocatingDelivery ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              <span>{isLocatingDelivery ? 'Checking location...' : 'Allow Location & Continue'}</span>
            </button>
          </div>
        </div>
      )}
      {custVerified && locationConsentAction && (
        <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-emerald-100 p-5 text-gray-900 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <LocateFixed className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black">Location Permission</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Real delivery location set korte device location permission lagbe. Apni continue korle browser/system location popup ashbe.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-[11px] text-emerald-800 font-bold">
              {locationConsentAction === 'address'
                ? 'Saved address-er jonno live GPS address text, map preview, lat/lng save hobe.'
                : 'Order, tracking, driver, store and super admin system-e customer current location jabe.'}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setLocationConsentAction(null)} className="flex-1 py-2.5 rounded-2xl bg-gray-100 text-gray-700 text-xs font-black">
                Cancel
              </button>
              <button type="button" onClick={confirmLocationFromApp} className="flex-1 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-black">
                Allow Location
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        html, body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; overflow-x: hidden; }
        .cs-glass { scrollbar-gutter: stable; }
        .cs-glass {
          background:
            radial-gradient(circle at 12% 5%, rgba(167,243,208,0.6), transparent 42%),
            radial-gradient(circle at 88% 18%, rgba(153,246,228,0.55), transparent 45%),
            radial-gradient(circle at 75% 85%, rgba(165,243,252,0.5), transparent 40%),
            radial-gradient(circle at 25% 95%, rgba(186,230,253,0.5), transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(240,253,244,0.9), transparent 60%),
            #f1f5f9;
        }
        .cs-glass main { scrollbar-gutter: stable; overflow-y: auto; }
        .cs-glass main::-webkit-scrollbar { width: 8px; }
        .cs-glass main::-webkit-scrollbar-thumb { background: rgba(6,78,59,0.18); border-radius: 8px; }
        .cs-glass .glass-bar, .cs-glass aside, .cs-glass nav {
          background: rgba(255,255,255,0.72) !important;
          backdrop-filter: blur(26px) saturate(190%);
          -webkit-backdrop-filter: blur(26px) saturate(190%);
          border-color: rgba(255,255,255,0.65) !important;
          box-shadow: 0 4px 28px rgba(6,78,59,0.1), inset 0 1px 0 rgba(255,255,255,0.85);
        }
        .cs-glass aside {
          border-right: 1px solid rgba(255,255,255,0.65) !important;
        }
        .cs-glass main .bg-white:not(button):not(a):not(input):not(select):not(textarea) {
          background: rgba(255,255,255,0.5) !important;
          backdrop-filter: blur(24px) saturate(185%);
          -webkit-backdrop-filter: blur(24px) saturate(185%);
          border-color: rgba(255,255,255,0.65) !important;
          box-shadow: 0 12px 40px rgba(6,78,59,0.1), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.4);
          border-radius: inherit;
        }
        .cs-glass main .bg-white {
          box-shadow: 0 6px 20px rgba(6,78,59,0.05);
        }
        .cs-glass main .bg-slate-50, .cs-glass main .bg-gray-50, .cs-glass main .bg-emerald-50, .cs-glass main .bg-emerald-50\/30 {
          background: rgba(255,255,255,0.42) !important;
          backdrop-filter: blur(16px) saturate(165%);
          -webkit-backdrop-filter: blur(16px) saturate(165%);
        }
        .cs-glass main .bg-emerald-50, .cs-glass main .bg-emerald-50\/30 { background: rgba(236,253,245,0.6) !important; }
        .cs-glass .fixed .bg-white:not(button):not(a):not(input):not(select):not(textarea) {
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(34px) saturate(200%);
          -webkit-backdrop-filter: blur(34px) saturate(200%);
          border-color: rgba(255,255,255,0.65) !important;
          box-shadow: 0 24px 70px rgba(2,44,34,0.18), inset 0 1px 0 rgba(255,255,255,0.9);
          border-radius: inherit;
        }
        .cs-glass header .bg-white:not(button):not(a) {
          background: rgba(255,255,255,0.9) !important;
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: inset 0 -1px 0 rgba(255,255,255,0.5);
        }
        .cs-glass button { -webkit-tap-highlight-color: transparent; }

        /* ===== DARK MODE ===== */
        .cs-glass.cs-dark {
          background:
            radial-gradient(circle at 10% 0%, rgba(16,185,129,0.1), transparent 40%),
            radial-gradient(circle at 90% 15%, rgba(45,212,191,0.07), transparent 45%),
            radial-gradient(circle at 75% 90%, rgba(59,130,246,0.07), transparent 40%),
            linear-gradient(180deg, #020408 0%, #050a14 55%, #070d1c 100%);
          color: #e2e8f0;
        }
        .cs-glass.cs-dark html, .cs-glass.cs-dark body { color-scheme: dark; }
        .cs-glass.cs-dark .glass-bar, .cs-glass.cs-dark aside, .cs-glass.cs-dark nav {
          background: rgba(4,7,14,0.96) !important;
          backdrop-filter: blur(30px) saturate(170%);
          -webkit-backdrop-filter: blur(30px) saturate(170%);
          border-color: rgba(148,163,184,0.15) !important;
          box-shadow: 0 4px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .cs-glass.cs-dark aside { border-right: 1px solid rgba(148,163,184,0.15) !important; }
        .cs-glass.cs-dark main .bg-white:not(a):not(input):not(select):not(textarea),
        .cs-glass.cs-dark .fixed .bg-white:not(a):not(input):not(select):not(textarea),
        .cs-glass.cs-dark header .bg-white:not(a),
        .cs-glass.cs-dark .bg-white:not(a):not(input):not(select):not(textarea) {
          background: rgba(7,12,24,0.96) !important;
          backdrop-filter: blur(28px) saturate(175%);
          -webkit-backdrop-filter: blur(28px) saturate(175%);
          border-color: rgba(148,163,184,0.17) !important;
          box-shadow: 0 14px 44px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03);
          border-radius: inherit;
        }
        .cs-glass.cs-dark .fixed .bg-white:not(a):not(input):not(select):not(textarea) {
          background: rgba(4,8,16,0.99) !important;
          backdrop-filter: blur(38px) saturate(180%);
          -webkit-backdrop-filter: blur(38px) saturate(180%);
          border-color: rgba(148,163,184,0.18) !important;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .cs-glass.cs-dark button.bg-white, .cs-glass.cs-dark a.bg-white, .cs-glass.cs-dark .bg-white.cursor-pointer {
          background: rgba(10,16,30,0.98) !important;
          border-color: rgba(148,163,184,0.2) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .cs-glass.cs-dark .shadow-xl.bg-white, .cs-glass.cs-dark .shadow-lg.bg-white {
          background: #060b16 !important;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border-color: rgba(148,163,184,0.24) !important;
          box-shadow: 0 18px 50px rgba(0,0,0,0.7) !important;
        }
        .cs-glass.cs-dark main .bg-slate-50, .cs-glass.cs-dark main .bg-gray-50, .cs-glass.cs-dark main .bg-gray-100, .cs-glass.cs-dark main .bg-gray-200 {
          background: rgba(30,41,59,0.5) !important;
        }
        .cs-glass.cs-dark main .bg-emerald-50, .cs-glass.cs-dark main .bg-emerald-50\/30 { background: rgba(6,78,59,0.35) !important; }
        .cs-glass.cs-dark .bg-blue-50, .cs-glass.cs-dark .bg-amber-50, .cs-glass.cs-dark .bg-red-50, .cs-glass.cs-dark .bg-green-50, .cs-glass.cs-dark .bg-violet-50 {
          background: rgba(30,41,59,0.5) !important;
        }
        .cs-glass.cs-dark .border-gray-200, .cs-glass.cs-dark .border-gray-100, .cs-glass.cs-dark .border-gray-300, .cs-glass.cs-dark .border-gray-400 {
          border-color: rgba(148,163,184,0.18) !important;
        }
        .cs-glass.cs-dark .text-gray-900, .cs-glass.cs-dark .text-gray-800, .cs-glass.cs-dark .text-gray-700, .cs-glass.cs-dark .text-gray-600, .cs-glass.cs-dark .text-slate-900, .cs-glass.cs-dark .text-slate-800, .cs-glass.cs-dark .text-slate-700, .cs-glass.cs-dark .text-slate-600 {
          color: #f1f5f9 !important;
        }
        .cs-glass.cs-dark .text-gray-500, .cs-glass.cs-dark .text-gray-400, .cs-glass.cs-dark .text-gray-300, .cs-glass.cs-dark .text-slate-500, .cs-glass.cs-dark .text-slate-400 {
          color: #9aa8bd !important;
        }
        .cs-glass.cs-dark .text-emerald-600, .cs-glass.cs-dark .text-emerald-700, .cs-glass.cs-dark .text-green-700 {
          color: #34d399 !important;
        }
        .cs-glass.cs-dark input, .cs-glass.cs-dark select, .cs-glass.cs-dark textarea {
          background: rgba(3,6,12,0.95) !important;
          color: #e2e8f0 !important;
          border-color: rgba(148,163,184,0.28) !important;
        }
        .cs-glass.cs-dark input::placeholder { color: #64748b; }
        .cs-glass.cs-dark .bg-gray-100, .cs-glass.cs-dark .bg-gray-50 { background: rgba(30,41,59,0.5) !important; }
        .cs-glass.cs-dark .bg-white\/90, .cs-glass.cs-dark .bg-white\/80, .cs-glass.cs-dark .bg-white\/70, .cs-glass.cs-dark .bg-white\/60, .cs-glass.cs-dark .bg-white\/40, .cs-glass.cs-dark .bg-white\/20, .cs-glass.cs-dark .bg-white\/10, .cs-glass.cs-dark .bg-white\/5 {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(148,163,184,0.14) !important;
        }
        .cs-glass.cs-dark main::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); }
      `}</style>
      {/* HEADER */}
      <header className="glass-bar bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1500px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-6 shrink-0">
            <div className="flex items-center space-x-0.5 sm:space-x-1 mr-0.5 sm:mr-1">
              <button
                onClick={navBack}
                disabled={!navCanBack}
                title="Go back"
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${navCanBack ? 'bg-white/80 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 shadow-xs' : 'bg-white/40 text-gray-300 border border-gray-100 cursor-not-allowed'}`}
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={navForward}
                disabled={!navCanForward}
                title="Go forward"
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${navCanForward ? 'bg-white/80 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 shadow-xs' : 'bg-white/40 text-gray-300 border border-gray-100 cursor-not-allowed'}`}
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
            <div onClick={() => setActiveNav('Home')} className="flex items-center space-x-2.5 cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-md">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black text-gray-900 tracking-tight block leading-none">Smart Shop</span>
                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">{T.brandTag}</span>
              </div>
            </div>
            <div className="hidden lg:flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200/80 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 transition-colors border border-gray-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <select
                value={selectedDeliveryDivision}
                onChange={(e) => {
                  setSelectedDeliveryDivision(e.target.value);
                  setSelectedDeliveryArea('');
                }}
                className="bg-transparent outline-none font-bold cursor-pointer max-w-[120px]"
                title="Select division"
              >
                <option value="">Division</option>
                {availableDivisions.map(division => <option key={division} value={division}>{division}</option>)}
              </select>
              <select
                value={selectedDeliveryArea}
                onChange={(e) => setSelectedDeliveryArea(e.target.value)}
                disabled={!selectedDeliveryDivision}
                className="bg-transparent outline-none font-bold cursor-pointer max-w-[130px] disabled:text-gray-400"
                title="Select district"
              >
                <option value="">District</option>
                {availableDistrictsForSelectedDivision.map(district => <option key={district} value={district}>{district}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </div>
          </div>

          <div className="flex items-center space-x-0.5 sm:space-x-2 shrink-0">
            <button
              onClick={() => setActiveNav('Wallet')}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>৳{walletBalance.toLocaleString()}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${tier.key === 'gold' ? 'bg-amber-400 text-amber-900' : tier.key === 'silver' ? 'bg-slate-300 text-slate-800' : 'bg-white/10 text-gray-300'}`}>{tier.icon} {tier.label}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:bg-gray-100 rounded-xl transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white rounded-full text-[8px] font-black flex items-center justify-center border-2 border-white">{unreadNotifCount}</span>
                )}
              </button>
              {isNotifOpen && (
                <div className="fixed top-16 right-2 z-[60] w-[min(22rem,calc(100vw-1rem))] bg-[#0e1a2b] rounded-2xl shadow-2xl border border-[#162a45] p-3 text-xs" style={{ backdropFilter: 'blur(0px)' }}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 font-bold">
                    <span className="text-white">{T.notifications}</span>
                    {unreadNotifCount > 0 && (
                      <span onClick={() => { setCustomerNotifs(prev => prev.map(n => ({ ...n, read: true }))); setAdminNotifs(prev => prev.map(n => ({ ...n, read: true }))); showToast(T.markAllRead, 'info'); }} className="text-[10px] text-emerald-400 cursor-pointer">{T.markAllRead}</span>
                    )}
                  </div>
                  <div className="py-2 space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                    {mergedNotifs.length === 0 ? (
                      <p className="text-gray-400 py-2 text-center">{T.noNotifications}</p>
                    ) : mergedNotifs.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { setCustomerNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); setAdminNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); }}
                        className={`p-2.5 rounded-lg text-[11px] border cursor-pointer transition-colors ${n.read ? 'bg-white/5 border-white/10' : 'bg-emerald-500/15 border-emerald-500/30'}`}
                      >
                        <p className={`font-bold leading-snug ${n.read ? 'text-gray-200' : 'text-white'}`}>{n.emoji} {n.title}</p>
                        <p className={`text-[10px] leading-snug mt-0.5 ${n.read ? 'text-gray-400' : 'text-emerald-200'}`}>{n.body}</p>
                        <p className="text-[9px] text-gray-500 mt-1 flex items-center justify-between">
                          <span>{n.time}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:bg-gray-100 rounded-xl transition-colors relative cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                 <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-0.5 bg-emerald-600 text-white rounded-full text-[8px] font-black flex items-center justify-center border-2 border-white">{cartCount}</span>
              )}
            </button>

            <button
              onClick={() => { setLang(l => (l === 'en' ? 'bn' : 'en')); showToast(lang === 'en' ? 'ভাষা পরিবর্তন হয়েছে' : 'Language switched to English', 'info'); }}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 transition-colors cursor-pointer"
              title={T.language}
            >
              <Languages className="w-4 h-4 text-emerald-600" />
            </button>

            {/* Visible logout button */}
            <button
              onClick={() => { setCustVerified(false); try { localStorage.removeItem('ss_cust_verified'); } catch { /* ignore */ } showToast(T.loggedOutMsg, 'info'); }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-bold text-red-500 transition-colors cursor-pointer"
              title={T.logOut}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{T.logOut}</span>
            </button>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 p-1 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <div className={`w-7 h-7 rounded-full ${hashColor(customerProfile.name)} text-white font-black flex items-center justify-center text-[10px] border-2 border-emerald-500/40`}>
                  {initialsOf(customerProfile.name)}
                </div>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#0e1a2b] rounded-2xl shadow-xl border border-[#162a45] p-2 text-xs z-50 space-y-1">
                  <div className="p-2 border-b border-white/10">
                    <p className="font-bold text-white">{customerProfile.name}</p>
                    <p className="text-[10px] text-gray-400">{customerProfile.email}</p>
                  </div>
                  <button onClick={() => { setActiveNav('Settings'); setIsProfileOpen(false); }} className="w-full text-left px-3 py-2 text-gray-300 font-semibold hover:bg-white/5 hover:text-white rounded-lg flex items-center space-x-2 transition-colors cursor-pointer">
                    <Settings className="w-4 h-4 text-gray-400" /><span>{T.accountSettings}</span>
                  </button>
                  <button onClick={() => { setCustVerified(false); setIsProfileOpen(false); try { localStorage.removeItem('ss_cust_verified'); } catch { /* ignore */ } showToast(T.loggedOutMsg, 'info'); }} className="w-full text-left px-3 py-2 text-red-400 font-semibold hover:bg-white/5 hover:text-red-300 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer">
                    <LogOut className="w-4 h-4" /><span>{T.logOut}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SEARCH BAR — always visible below header */}
      {(() => {
        const q = searchQuery.toLowerCase().trim();
        const suggestions = q ? syncedStores.flatMap(s => s.catalog.filter(p => p.name.toLowerCase().includes(q) || (BN_NAMES[p.name] || '').toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).map(p => ({ product: p, store: s }))).slice(0, 8) : [];
        const showSuggest = q.length > 0;
        return (
      <div className="glass-bar bg-white border-b border-gray-200 sticky top-16 z-30 shadow-xs flex items-center justify-center px-4 py-2.5">
        <div className="relative w-full max-w-xl">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (activeNav !== 'Orders') setActiveNav('Orders'); }}
            onFocus={() => setActiveNav('Orders')}
            placeholder={T.searchPlaceholder}
            className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-10 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
          {showSuggest && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[#0a101e] border border-[#1a2b45] rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
              {suggestions.length > 0 ? (
                suggestions.map((s, i) => (
                  <div
                    key={`${s.product.id}-${i}`}
                    onClick={() => {
                      setSearchQuery(s.product.name);
                      openStore(s.store);
                    }}
                    className="flex items-center space-x-3 px-4 py-2.5 hover:bg-emerald-500/10 cursor-pointer border-b border-white/10 last:border-0 transition-colors"
                  >
                    <img src={s.product.image} alt={nm(s.product.name)} referrerPolicy="no-referrer" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{nm(s.product.name)}</p>
                      <p className="text-[10px] text-gray-400 truncate">{nm(s.store.name)} · {s.product.category}</p>
                    </div>
                    <span className="text-[11px] font-mono font-black text-emerald-400 shrink-0">৳{s.product.price}</span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-xs text-gray-400 text-center">No products found for "{q}"</p>
              )}
            </div>
          )}
        </div>
      </div>
        );
      })()}

      {/* BODY */}
      <div className="max-w-[1500px] w-full mx-auto flex-1 flex pb-16 md:pb-0">
        {/* SIDEBAR */}
        <aside className="w-60 bg-white border-r border-gray-200 p-4 shrink-0 hidden md:flex flex-col justify-between">
          <div className="space-y-6">
            <nav className="space-y-1 text-xs">
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeNav === item.key ? 'bg-emerald-500/15 text-emerald-300 font-black' : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">{item.icon}<span>{item.label}</span></div>
                  {item.key === 'My Orders' && !!item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">{item.badge}</span>
                  )}
                  {item.key === 'Wallet' && (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">৳{walletBalance.toLocaleString()}</span>
                  )}
                  {item.key === 'Favorites' && !!item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold">{item.badge}</span>
                  )}
                  {item.key === 'Coupons' && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase">4 Active</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="bg-gradient-to-br from-emerald-700 to-teal-800 border border-emerald-600/40 rounded-2xl p-4 space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center shadow-md">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">{T.freeDelivery}</h4>
                <p className="text-[10px] text-emerald-100/90 mt-0.5">{T.freeDeliverySub}</p>
              </div>
              <button
                onClick={() => { setSelectedCategory('All'); setActiveNav('Orders'); showToast(T.browsingFreeDelivery, 'info'); }}
                className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
              >
                {T.shopNow}
              </button>
            </div>

            <div className={`rounded-2xl p-4 space-y-2.5 relative overflow-hidden text-white ${tier.key === 'gold' ? 'bg-gradient-to-br from-amber-400 to-amber-600' : tier.key === 'silver' ? 'bg-gradient-to-br from-slate-500 to-slate-700' : 'bg-gradient-to-br from-emerald-800 to-teal-900'}`}>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">{tier.icon}</div>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-[9px] font-black uppercase tracking-wider">{tier.label}</span>
              </div>
              <div>
                <h4 className="text-xs font-black">{T.loyaltyTier}</h4>
                <p className="text-[10px] text-white/80 mt-0.5">{T.earnPerOrder} · {tier.cashbackPct}%</p>
              </div>
              <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((totalSpend / (LOYALTY_TIERS[tier.key === 'gold' ? 2 : tier.key === 'silver' ? 2 : 1].minSpend)) * 100))}%` }}
                />
              </div>
              <p className="text-[9px] text-white/75">{T.totalSpend}: ৳{totalSpend.toLocaleString()}</p>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
          {/* ============ HOME LANDING ============ */}
          {activeNav === 'Home' && (
            <div className="space-y-6">
              {/* Banner carousel */}
              <div className="relative rounded-3xl overflow-hidden h-44 sm:h-52 shadow-lg">
                {BANNERS.map((b, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 bg-gradient-to-r ${b.bg} transition-opacity duration-700 flex items-center justify-between px-6 sm:px-10 ${i === bannerIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  >
                    <div className="text-white space-y-2">
                      <span className="text-3xl">{b.emoji}</span>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">{b.title}</h2>
                      <p className="text-xs sm:text-sm text-white/85 font-medium">{b.sub}</p>
                      <button
                        onClick={() => setActiveNav('Orders')}
                        className="mt-2 px-4 py-2 bg-white text-gray-900 text-xs font-black rounded-xl shadow-md hover:bg-gray-100 transition-colors cursor-pointer flex items-center space-x-1.5"
                      >
                        <span>{b.cta}</span><ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/85 via-white/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
                  {BANNERS.map((_, i) => (
                    <button key={i} onClick={() => setBannerIdx(i)} className={`h-1.5 rounded-full transition-all cursor-pointer ${i === bannerIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />
                  ))}
                </div>
                <button onClick={() => setBannerIdx((bannerIdx - 1 + BANNERS.length) % BANNERS.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/25 text-white flex items-center justify-center hover:bg-black/40 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setBannerIdx((bannerIdx + 1) % BANNERS.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/25 text-white flex items-center justify-center hover:bg-black/40 cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Category quick chips */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setActiveNav('Orders'); }}
                      className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        isSelected ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {catLabel(cat)}
                    </button>
                  );
                })}
              </div>

              {/* Popular stores */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /><span>{T.popularNearYou}</span>
                  </h2>
                  <p className="text-xs text-gray-500">{T.popularSub}</p>
                </div>
                <button onClick={() => setActiveNav('Orders')} className="text-xs font-bold text-emerald-700 hover:underline flex items-center space-x-1">
                  <span>{T.viewAll}</span><ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {syncedStores.slice(0, 4).map((store) => {
                  const isFav = favoriteStoreIds.includes(store.id);
                  return (
                    <div key={store.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative">
                      <div>
                        <div className="relative h-24 overflow-hidden bg-gray-100">
                          <img src={store.image} alt={nm(store.name)} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/5 to-white/25 pointer-events-none" />
                          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md ${store.badgeColor}`}>{store.category}</span>
                          <button onClick={(e) => toggleFavorite(e, store.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors shadow-md cursor-pointer">
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-red-500 fill-red-500' : ''}`} />
                          </button>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <h3 className="font-bold text-gray-900 text-xs group-hover:text-emerald-600 transition-colors line-clamp-1">{nm(store.name)}</h3>
                          <div className="flex items-center justify-between text-[10px] text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span className="font-bold text-gray-900">{displayRating(store)}</span>
                              <span className="text-gray-400">({store.reviewsCount})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-gray-400" /><span>{store.deliveryTime}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 pt-0">
                        <button onClick={() => openStore(store)} className="w-full py-2 bg-emerald-400 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all cursor-pointer shadow-xs active:scale-[0.98]">
                          Order Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Offers strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {[
                  { icon: <Store className="w-4 h-4" />, title: T.wideRange, sub: T.wideRangeSub },
                  { icon: <Truck className="w-4 h-4" />, title: T.fastDelivery, sub: T.fastDeliverySub },
                  { icon: <Shield className="w-4 h-4" />, title: T.securePay, sub: T.securePaySub },
                  { icon: <Gift className="w-4 h-4" />, title: T.bestOffers, sub: T.bestOffersSub },
                ].map((f, i) => (
                  <div key={i} className="bg-[#0a1425] border border-[#1e2f4a] rounded-xl p-3 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">{f.icon}</div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-white truncate">{f.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{f.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick links / policies strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <a href="mailto:support@nexagobd.com" className="bg-[#0a1425] border border-[#1e2f4a] rounded-xl p-3 flex items-center space-x-3 hover:border-emerald-500/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0"><Headphones className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-white truncate">{T.support}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{T.supportSub}</p>
                  </div>
                </a>
                <button onClick={() => setPolicyModal('terms')} className="bg-[#0a1425] border border-[#1e2f4a] rounded-xl p-3 flex items-center space-x-3 hover:border-emerald-500/50 transition-colors text-left cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0"><ScrollText className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-white truncate">{T.terms}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{T.termsSub}</p>
                  </div>
                </button>
                <button onClick={() => setPolicyModal('privacy')} className="bg-[#0a1425] border border-[#1e2f4a] rounded-xl p-3 flex items-center space-x-3 hover:border-emerald-500/50 transition-colors text-left cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0"><Lock className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-white truncate">{T.privacy}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{T.privacySub}</p>
                  </div>
                </button>
                <button onClick={() => setPolicyModal('refund')} className="bg-[#0a1425] border border-[#1e2f4a] rounded-xl p-3 flex items-center space-x-3 hover:border-emerald-500/50 transition-colors text-left cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0"><RefreshCcw className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-white truncate">{T.refund}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{T.refundSub}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ============ ORDERS (STORE CATALOG) ============ */}
          {activeNav === 'Orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
                <div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium">
                    <span>{T.home}</span><span>&gt;</span><span>{T.orders}</span><span>&gt;</span>
                    <span className="text-gray-900 font-bold">{T.allStores}</span>
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">{searchQuery ? T.searchResults : T.orders}</h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {searchQuery ? `"${searchQuery}"` : ''} {filteredStores.length} {T.storeMatches.toLowerCase()}
                    {selectedDeliveryArea ? ` delivering to ${selectedDeliveryArea}` : ' — select delivery area'}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => showToast('Free delivery filter active on orders above ৳500', 'info')}
                    className="flex items-center space-x-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs transition-colors cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5 text-gray-500" /><span>{T.filter}</span>
                  </button>
                  <div className="flex items-center space-x-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-xs">
                    <span className="text-gray-400 font-normal">{T.sortBy}</span>
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
                    >
                      <option value="Recommended">{T.recommended}</option>
                      <option value="Rating">{T.highestRating}</option>
                      <option value="Fastest">{T.fastestDelivery}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedCategory === cat ? 'bg-green-600 text-white shadow-md shadow-green-600/20' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                    >
                      {catLabel(cat)}
                    </button>
                  ))}
                </div>

              {searchQuery && (
                <div className="bg-[#0a1425] border border-[#1e2f4a] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /><span>{T.searchResults} · "{searchQuery}"</span>
                    </h3>
                    <button onClick={() => setSearchQuery('')} className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer">
                      <X className="w-3 h-3" /><span>{T.cancel}</span>
                    </button>
                  </div>

                  {/* Product matches */}
                  {(() => {
                    const q = searchQuery.toLowerCase();
                    const storeMatches = syncedStores.filter(s => s.name.toLowerCase().includes(q) || (BN_NAMES[s.name] || '').toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.subtext.toLowerCase().includes(q));
                    const prodMatches: Array<{ store: StoreDef; product: StoreProduct }> = [];
                    for (const s of syncedStores) {
                      for (const p of s.catalog) {
                        if (p.name.toLowerCase().includes(q) || (BN_NAMES[p.name] || '').toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) prodMatches.push({ store: s, product: p });
                      }
                    }
                    if (prodMatches.length === 0 && storeMatches.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <Search className="w-8 h-8 text-gray-600 mx-auto" />
                          <p className="text-xs font-bold text-gray-200 mt-2">{T.noResults}</p>
                          <p className="text-[10px] text-gray-400">{T.noResultsSub}</p>
                        </div>
                      );
                    }
                    return (
                      <>
                        {prodMatches.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">{prodMatches.length} {T.productMatches}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {prodMatches.slice(0, 6).map(({ store, product }) => (
                                <button key={`${store.id}-${product.id}`} onClick={() => openStore(store)} className="flex items-center space-x-3 bg-[#0e1a2b] border border-[#162a45] rounded-xl p-2.5 text-left hover:border-emerald-500/50 hover:bg-[#12233a] transition-all cursor-pointer">
                                  <img src={product.image} alt={nm(product.name)} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{nm(product.name)}</p>
                                    <p className="text-[10px] text-gray-400">{nm(store.name)}</p>
                                    <p className="text-[11px] font-black text-emerald-400 font-mono">৳{product.price} <span className="text-[9px] text-gray-500 font-normal">/ {product.unit}</span></p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {storeMatches.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">{storeMatches.length} {T.storeMatches}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {storeMatches.map(store => (
                                <button key={store.id} onClick={() => openStore(store)} className="flex items-center space-x-3 bg-[#0e1a2b] border border-[#162a45] rounded-xl p-2.5 text-left hover:border-emerald-500/50 hover:bg-[#12233a] transition-all cursor-pointer">
                                  <img src={store.image} alt={nm(store.name)} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white">{nm(store.name)}</p>
                                    <p className="text-[10px] text-gray-400">{store.category} · ⭐ {displayRating(store)}</p>
                                    <p className="text-[10px] font-bold text-emerald-400">{store.deliveryTime}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredStores.map((store) => {
                  const isFav = favoriteStoreIds.includes(store.id);
                  return (
                    <div key={store.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative">
                      <div>
                        <div className="relative h-24 overflow-hidden bg-gray-100">
                          <img src={store.image} alt={nm(store.name)} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/5 to-white/25 pointer-events-none" />
                          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md ${store.badgeColor}`}>{store.category}</span>
                          <button onClick={(e) => toggleFavorite(e, store.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors shadow-md cursor-pointer">
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-red-500 fill-red-500' : ''}`} />
                          </button>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-lg ${store.logoBg} flex items-center justify-center font-black text-[10px] shrink-0 shadow-xs`}>{store.logoText.charAt(0)}</div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-900 text-xs group-hover:text-emerald-600 transition-colors line-clamp-1">{nm(store.name)}</h3>
                              <p className="text-[10px] text-gray-500 line-clamp-1">{store.subtext}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-600 pt-1.5 border-t border-gray-100">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span className="font-bold text-gray-900">{displayRating(store)}</span>
                              <span className="text-gray-400">({store.reviewsCount})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-gray-400" /><span>{store.deliveryTime}</span>
                            </div>
                            <span className="font-bold text-emerald-700">৳{store.deliveryFee}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 pt-0">
                        <button onClick={() => openStore(store)} className="w-full py-2 bg-emerald-400 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all cursor-pointer shadow-xs active:scale-[0.98]">
                          Order Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredStores.length === 0 && (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs space-y-3">
                  <Search className="w-12 h-12 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-800">{T.noResults}</h3>
                  <p className="text-xs text-gray-500">{T.noResultsSub}</p>
                </div>
              )}
            </div>
          )}

          {/* ============ MY ORDERS ============ */}
          {activeNav === 'My Orders' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">{T.myOrderHistory}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{T.orderHistorySub}</p>
                </div>
                <button onClick={() => setActiveNav('Orders')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs">
                  {T.browseStores}
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs space-y-3">
                  <Package className="w-12 h-12 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-800">{T.noOrders}</h3>
                  <p className="text-xs text-gray-500">{T.noOrdersSub}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => {
                    const active = ord.status === 'Ongoing' || ord.status === 'Processing' || ord.status === 'Confirmed' || ord.status === 'Pending';
                    const completed = ord.status === 'Completed';
                    const cancelled = ord.status === 'Cancelled';
                    const held = ord.paymentStatus === 'Rejected';
                    const reportUnderReview = (oid: string) => reports.some(r => r.orderId === oid && r.status === 'Under Review');
                    const refR = refunds.find(r => r.orderId === ord.id);
                    const retR = returns.find(r => r.orderId === ord.id);
                    return (
                      <div key={ord.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-emerald-200 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                            <span className="font-mono text-xs font-bold text-gray-500">#{ord.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              held ? 'bg-red-100 text-red-800' :
                              completed ? 'bg-emerald-100 text-emerald-800' :
                              cancelled ? 'bg-red-100 text-red-800' :
                              active ? 'bg-amber-100 text-amber-800 animate-pulse' :
                              'bg-gray-100 text-gray-700'
                            }`}>{held ? '⏸ Hold' : statusLabel(ord.status)}</span>
                            {ord.paymentStatus === 'Rejected' && (
                              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black">⛔ Payment Rejected</span>
                            )}
                            {ord.paymentStatus === 'Pending' && (
                              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black animate-pulse">⏳ Payment Pending</span>
                            )}
                            {ord.paymentStatus === 'Approved' && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">✅ Payment Approved</span>
                            )}
                            {ord.paymentStatus === 'COD' && (
                              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-black">💵 Cash on Delivery</span>
                            )}
                            {refR && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                refR.status === 'Refunded' ? 'bg-emerald-100 text-emerald-800' :
                                refR.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>↩ {refR.status === 'Requested' ? 'Refund Requested' : refR.status === 'Processing' ? 'Refund Processing' : refR.status === 'Refunded' ? 'Refunded ✓' : 'Refund Rejected'}</span>
                            )}
                            {retR && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                retR.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                retR.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>↩ Return: {retR.status === 'Requested' ? 'Awaiting Approval' : retR.status === 'Approved' ? 'Pickup Scheduled' : retR.status === 'Picked Up' ? 'Item Picked Up' : retR.status === 'Completed' ? 'Return Completed' : 'Return Rejected'}</span>
                            )}
                            {ord.estimatedMinutes && active && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">~{ord.estimatedMinutes} min</span>
                            )}
                            {ord.paymentStatus === 'Rejected' && ord.rejectionReason && (
                              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">Reason: {ord.rejectionReason}</span>
                            )}
                            {held && reportUnderReview(ord.id) && (
                              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">🛑 Tracking paused — payment under review</span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-gray-900">{ord.storeName}</h4>
                          {ord.items && ord.items.length > 0 && (
                            <p className="text-[10px] text-gray-500 truncate max-w-full">
                              {ord.items.reduce((s, i) => s + i.quantity, 0)} items — {ord.items.map(i => `${nm(i.name)}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500">{ord.date} {ord.time ? `• ${ord.time}` : ''} • {T.paymentMethod}: {ord.paymentMethod}</p>
                          <p className="text-[10px] text-gray-600 font-medium flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-gray-400" /><span className="truncate">{ord.address || deliveryAddress}</span>
                          </p>
                          {active && !held && ord.paymentStatus !== 'Pending' && ord.status === 'Ongoing' && (() => {
                            const drv = liveDriverOf(ord);
                            if (!drv) return null;
                            const prog = liveProgressOf(ord);
                            return (
                              <div className="pt-1 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[8px] font-black border border-emerald-200 shrink-0">
                                    {initialsOf(drv.name, 'DR')}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-medium">
                                    {drv.name} · {drv.vehicleType || 'Bike'} · <span className="text-emerald-600 font-bold font-mono">{Number.isFinite(prog) ? Math.round(prog * 100) : 0}%</span>
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-48">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Number.isFinite(prog) ? Math.round(prog * 100) : 0}%` }} />
                                </div>
                              </div>
                            );
                          })()}
                          {active && !held && ord.paymentStatus === 'Pending' && (
                            <p className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 mt-1 w-fit font-semibold">
                              ⏳ {lang === 'bn' ? 'অ্যাডমিন পেমেন্ট যাচাই ও অনুমোদন করলে ট্র্যাকিং চালু হবে।' : 'Tracking opens once admin verifies & approves your payment.'}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5 justify-between md:justify-end flex-wrap gap-y-1.5">
                          <div className="text-right pr-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{T.totalAmount}</p>
                            <p className="text-sm font-black text-gray-900 font-mono">৳{ord.amount.toLocaleString()}</p>
                          </div>
                          <button onClick={() => setReceiptOrder(ord)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1">
                            <Printer className="w-3 h-3 text-gray-500" /><span>{T.receipt}</span>
                          </button>
                          {active ? (
                            <div className="flex items-center space-x-1.5">
                              {ord.status === 'Ongoing' && (
                                <button onClick={() => setCancelConfirmId(ord.id)} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-red-200">
                                  <X className="w-3 h-3" /><span>{T.cancelOrder}</span>
                                </button>
                              )}
                              {!held && ord.paymentStatus !== 'Pending' && (
                                <button onClick={() => setTrackingOrder(ord)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-xs flex items-center space-x-1">
                                  <Navigation className="w-3 h-3" /><span>{T.trackDelivery}</span>
                                </button>
                              )}
                              {!held && ord.paymentStatus !== 'Pending' && (
                                <button onClick={() => setQrOrder(ord)} className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-blue-200">
                                  <QrCode className="w-3 h-3" /><span>QR</span>
                                </button>
                              )}
                              {held && (
                                <button onClick={() => openReSubmit(ord)} className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-purple-200">
                                  <Send className="w-3 h-3" /><span>Re-send Payment</span>
                                </button>
                              )}
                              <button onClick={() => openReportModal(ord)} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-red-200">
                                <AlertCircle className="w-3 h-3" /><span>Report</span>
                              </button>
                            </div>
                          ) : cancelled ? (
                            <div className="flex items-center space-x-1.5">
                              <button onClick={() => { setRefundModal(ord); setRefundNumber(customerPhone.replace(/[^0-9]/g, '')); setRefundReason(''); }} className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-blue-200">
                                <Banknote className="w-3 h-3" /><span>{refR ? 'Refund Again' : 'Request Refund'}</span>
                              </button>
                              <button onClick={() => showToast('This order has been cancelled', 'info')} className="px-3 py-1.5 bg-gray-200 text-gray-500 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1">
                                <X className="w-3 h-3" /><span>{T.cancelled}</span>
                              </button>
                              <button onClick={() => openReportModal(ord)} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-red-200">
                                <AlertCircle className="w-3 h-3" /><span>Report</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <button onClick={() => { setRefundModal(ord); setRefundNumber(customerPhone.replace(/[^0-9]/g, '')); setRefundReason(''); }} className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-blue-200">
                                <Banknote className="w-3 h-3" /><span>{refR ? 'Refund Again' : 'Request Refund'}</span>
                              </button>
                              <button onClick={() => { reorder(ord); }} className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-emerald-200">
                                <RotateCcw className="w-3 h-3" /><span>{T.reOrder}</span>
                              </button>
                              {!retR && (
                                <button onClick={() => { setReturnModal(ord); setReturnReason(''); setReturnNote(''); }} className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-orange-200">
                                  <RotateCcw className="w-3 h-3" /><span>Request Return</span>
                                </button>
                              )}
                              <button onClick={() => setRateOrder(ord)} className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-amber-200">
                                <Star className="w-3 h-3" /><span>Rate</span>
                              </button>
                              <button onClick={() => openReportModal(ord)} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 border border-red-200">
                                <AlertCircle className="w-3 h-3" /><span>Report</span>
                              </button>
                              <button onClick={() => showToast('Order already delivered', 'info')} className="px-3 py-1.5 bg-gray-200 text-gray-500 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3" /><span>{T.delivered}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============ FAVORITES ============ */}
          {activeNav === 'Favorites' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Saved Favorite Stores</h2>
                <p className="text-xs text-gray-500 mt-0.5">Quick access to your most-loved outlets</p>
              </div>
              {favoriteStoreIds.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs space-y-3">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-800">No favorite stores added</h3>
                  <p className="text-xs text-gray-500">Tap the heart icon on any store card to add it to your favorites list.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {syncedStores.filter(s => favoriteStoreIds.includes(s.id)).map((store) => (
                    <div key={store.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all p-4 space-y-3">
                      <div className="flex items-center space-x-3">
                        <img src={store.image} alt={nm(store.name)} referrerPolicy="no-referrer" className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{nm(store.name)}</h4>
                          <p className="text-[11px] text-gray-500">{store.category} • ⭐ {displayRating(store)}</p>
                        </div>
                      </div>
                      <button onClick={() => openStore(store)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all">
                        Order Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ ADDRESSES ============ */}
          {activeNav === 'Addresses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Saved Addresses</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage your delivery locations for faster checkout</p>
                </div>
                <button onClick={() => { if (isAddingAddress) resetAddressForm(); else setIsAddingAddress(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2">
                  <Plus className="w-4 h-4" /><span>Add New Address</span>
                </button>
              </div>

              {isAddingAddress && (
                <form onSubmit={handleAddAddressSubmit} className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800">{editingAddressId ? 'Edit Saved Address' : 'New Address Details'}</h3>
                    <button type="button" onClick={() => requestLocationFromApp('address')} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black flex items-center gap-1.5">
                      <LocateFixed className="w-3.5 h-3.5" /> Live Location
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Title Label</label>
                      <input type="text" value={newAddrTitle} onChange={(e) => setNewAddrTitle(e.target.value)} placeholder="Home / Office / Parents" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                      <input type="text" value={newAddrPhone} onChange={(e) => setNewAddrPhone(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500 font-mono" required />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Street Address / Flat / Building</label>
                      <input type="text" value={newAddrStreet} onChange={(e) => setNewAddrStreet(e.target.value)} placeholder="House 12, Road 4, Block B" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Division</label>
                      <select value={newAddrDivision} onChange={(e) => { setNewAddrDivision(e.target.value); setNewAddrArea(''); }} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500 bg-white" required>
                        <option value="">Select division</option>
                        {availableDivisions.map(division => <option key={division} value={division}>{division}</option>)}
                        {newAddrArea && !newAddrDivision && <option value="custom">Detected / custom</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">District</label>
                      <select value={newAddrArea.replace(/,\s*Bangladesh$/i, '')} onChange={(e) => setNewAddrArea(e.target.value ? `${e.target.value}, Bangladesh` : '')} disabled={!newAddrDivision} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500 bg-white disabled:bg-gray-100 disabled:text-gray-400" required>
                        <option value="">Select district</option>
                        {availableAddressDistricts.map(district => <option key={district} value={district}>{district}</option>)}
                        {newAddrArea && !Object.values(BD_DIVISIONS).flat().some(district => newAddrArea === `${district}, Bangladesh`) && <option value={newAddrArea.replace(/,\s*Bangladesh$/i, '')}>{newAddrArea}</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Postal / ZIP Code</label>
                      <input type="text" value={newAddrZipCode} onChange={(e) => setNewAddrZipCode(e.target.value)} placeholder="Auto from GPS or enter manually" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500 font-mono" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Gmail for address verification</label>
                      <div className="flex gap-2">
                        <input type="email" value={newAddrEmail} onChange={(e) => { setNewAddrEmail(e.target.value); setNewAddrEmailVerified(false); }} placeholder="name@gmail.com" className="flex-1 min-w-0 p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" />
                        <button type="button" onClick={() => {
                          if (!/^[^\s@]+@gmail\.com$/i.test(newAddrEmail.trim())) { showToast('Enter a valid Gmail address', 'info'); return; }
                          setNewAddrEmailVerified(true);
                          showToast('Gmail verified for this address', 'success');
                        }} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black">Verify</button>
                      </div>
                      <p className={`mt-1 text-[10px] font-bold ${newAddrEmailVerified ? 'text-emerald-600' : 'text-gray-400'}`}>{newAddrEmailVerified ? 'Verified Gmail linked with this delivery address.' : 'Optional: verify a different Gmail for this saved address.'}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-gray-900 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-emerald-600" /> Address Preview</p>
                <span className="text-[10px] font-bold text-gray-500">{newAddrCoords ? 'Live GPS attached' : 'Manual address'}</span>
                    </div>
                    <p className="font-bold text-gray-800">{newAddrTitle || 'Not entered yet'}</p>
                    <p className="text-gray-600">{newAddrStreet || 'Street / house / flat not entered yet'}</p>
                    <p className="text-gray-500">{newAddrArea || (newAddrCoords ? 'GPS location outside saved Dhaka area list' : 'Area / city not entered yet')}</p>
                    <p className="text-gray-500 font-mono">{newAddrZipCode ? `ZIP ${newAddrZipCode}` : 'Postal / ZIP code auto or manual'}</p>
                    <p className="text-gray-500 font-mono">{newAddrPhone || 'Phone not entered yet'}</p>
                    {newAddrEmail && <p className="text-gray-500 font-mono">{newAddrEmail} {newAddrEmailVerified ? '✓ verified' : 'not verified'}</p>}
                    {newAddrCoords && (
                      <>
                        <div className="h-32 rounded-xl overflow-hidden border border-emerald-200">
                          <LeafletMap
                            vehicles={[]}
                            zoomTo={18}
                            marker={{ lat: newAddrCoords.lat, lng: newAddrCoords.lng }}
                            markerDraggable
                            onMapClick={updateNewAddressPin}
                            onMarkerDrag={updateNewAddressPin}
                          />
                        </div>
                        <p className="text-[10px] text-emerald-700 font-mono">
                          Lat {newAddrCoords.lat.toFixed(5)} · Lng {newAddrCoords.lng.toFixed(5)}
                          {cleanAccuracy(newAddrCoords.accuracy) ? ` · ±${cleanAccuracy(newAddrCoords.accuracy)}m` : ' · live GPS'}
                        </p>
                      </>
                    )}
                    {!newAddrCoords && (
                      <>
                        <div className="h-32 rounded-xl overflow-hidden border border-amber-200">
                          <LeafletMap
                            vehicles={[]}
                            zoomTo={17}
                            marker={null}
                            onMapClick={updateNewAddressPin}
                          />
                        </div>
                        <p className="text-[10px] text-amber-700 font-bold">Map-e click kore pin boshan, ba "Live Location" button click korun. Permission already allowed thakle browser popup abar dekhabe na.</p>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">{editingAddressId ? 'Update Address' : 'Save Address'}</button>
                    <button type="button" onClick={resetAddressForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Cancel</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-900 flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-emerald-600" /><span>{addr.title}</span>
                        </span>
                        {addr.isDefault && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">Default Address</span>}
                      </div>
                      <p className="text-xs text-gray-700 font-medium">{addr.address}</p>
                      <p className="text-xs text-gray-500">{addr.area}</p>
                      {addr.zipCode && <p className="text-xs text-gray-500 font-mono">ZIP {addr.zipCode}</p>}
                      <p className="text-xs text-gray-500 font-mono">📱 {addr.phone}</p>
                      {addr.email && <p className="text-xs text-gray-500 font-mono">✉ {addr.email} {addr.emailVerified ? '✓' : ''}</p>}
                      {addr.lat && addr.lng && (
                        <p className="text-[10px] text-emerald-700 font-mono">
                          GPS {addr.lat.toFixed(5)}, {addr.lng.toFixed(5)}
                          {cleanAccuracy(addr.accuracy) ? ` · ±${cleanAccuracy(addr.accuracy)}m` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-bold">
                      <button onClick={() => {
                        setDeliveryAddress([addr.address, addr.area, addr.zipCode ? `ZIP ${addr.zipCode}` : ''].filter(Boolean).join(', '));
                        if (addr.lat && addr.lng) {
                          setDeliveryPin({ lat: addr.lat, lng: addr.lng });
                          setDeliveryLocationMeta({ accuracy: addr.accuracy, capturedAt: new Date().toISOString(), source: addr.source === 'gps' ? 'browser-gps' : 'map-pin', area: addr.area });
                        }
                        showToast(`Set ${addr.title} as active delivery address`, 'info');
                      }} className="text-emerald-700 hover:underline">
                        Use for Orders
                      </button>
                      <button onClick={() => startEditAddress(addr)} className="text-blue-700 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => { setAddresses(prev => prev.filter(a => a.id !== addr.id)); showToast('Address deleted', 'info'); }} className="text-red-600 hover:text-red-700">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ PAYMENTS ============ */}
          {activeNav === 'Payments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Payment Methods</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Linked bKash, Nagad mobile banking & bank cards</p>
                </div>
                <button onClick={() => setIsAddingPayment(!isAddingPayment)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2">
                  <Plus className="w-4 h-4" /><span>Link Payment Account</span>
                </button>
              </div>

              {isAddingPayment && (
                <form onSubmit={handleAddPaymentSubmit} className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                  <h3 className="font-black uppercase tracking-wider text-emerald-800">Link New Method</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Type</label>
                      <select value={newPayType} onChange={(e: any) => setNewPayType(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none">
                        <option value="bKash">bKash Mobile Wallet</option>
                        <option value="Nagad">Nagad Mobile Wallet</option>
                        <option value="Card">Visa / Mastercard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Number / Card Info</label>
                      <input type="text" placeholder="017XXXXXXXX or Card Number" value={newPayAccount} onChange={(e) => setNewPayAccount(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none font-mono" required />
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-1">
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold">Link Account</button>
                    <button type="button" onClick={() => setIsAddingPayment(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold">Cancel</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                          pm.type === 'bKash' ? 'bg-pink-100 text-pink-700' : pm.type === 'Nagad' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>{pm.type}</span>
                        {pm.isDefault && <span className="text-[10px] font-bold text-emerald-600">{T.defaultMethod}</span>}
                      </div>
                      <p className="text-sm font-bold text-gray-900">{pm.accountName}</p>
                      <p className="text-xs font-mono text-gray-500">{pm.accountNumber}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
                      <button onClick={() => { setPaymentMethod(pm.type as any); showToast(T.selectedAsPrimary.replace('{m}', pm.type), 'info'); }} className="text-emerald-700 font-bold">
                        {T.setAsActive}
                      </button>
                      <button onClick={() => { setPaymentMethods(prev => prev.filter(p => p.id !== pm.id)); showToast(T.paymentUnlinked, 'info'); }} className="text-red-500 font-bold">
                        {T.unlink}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ WALLET ============ */}
          {activeNav === 'Wallet' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">{T.smartShopCashWallet}</span>
                  <p className="text-3xl font-black font-mono">৳{walletBalance.toLocaleString()}</p>
                  <p className="text-[11px] text-emerald-100">{T.walletUseSub}</p>
                </div>
                <div className="shrink-0 w-full sm:w-72">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200 mb-2">{T.smartWallet}</p>
                  <button
                    onClick={() => { setAddMoneyOpen(true); setAddMoneyStep('method'); setAddMoneyError(''); }}
                    className="w-full py-3 bg-white text-emerald-800 font-black text-xs rounded-2xl shadow-lg hover:bg-emerald-50 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" /><span>{T.addMoney}</span>
                  </button>
                  <p className="text-[9px] text-emerald-100 mt-2">{T.walletRealNote}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{T.walletTransactionHistory}</h3>
                <div className="divide-y divide-gray-100">
                  {walletTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{tx.type}</p>
                        <p className="text-[10px] text-gray-400">{tx.date} • {tx.id}</p>
                        {tx.trxId && (
                          <button
                            onClick={() => copyText(tx.trxId!, `${tx.type} TrxID`)}
                            className="mt-1 inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors font-mono text-[9px]"
                          >
                            <span className="truncate max-w-28">TrxID: {tx.trxId}</span>
                            <Copy className="w-3 h-3 shrink-0" />
                          </button>
                        )}
                      </div>
                      <div className="text-right font-mono font-bold">
                        <span className={tx.amount > 0 ? 'text-emerald-600' : 'text-gray-800'}>
                          {tx.amount > 0 ? `+৳${tx.amount}` : `-৳${Math.abs(tx.amount)}`}
                        </span>
                        <span className="block text-[9px] text-gray-400">{tx.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral program */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-8 -left-6 w-40 h-40 rounded-full bg-emerald-300/20" />
                <div className="space-y-4 relative">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-200" /></div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider">{T.secureWallet}</h3>
                      <p className="text-[11px] text-emerald-100">{T.secureWalletSub}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-100/80">{T.walletSafeNote}</p>
                </div>
              </div>

              {/* Order Tools */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                      <Wrench className="w-4 h-4 text-emerald-600" /><span>{T.orderTools}</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">{T.orderToolsSub}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setActiveNav('My Orders')}
                    className="p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50 transition-all cursor-pointer text-left space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center"><Package className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{T.trackOrders}</p>
                      <p className="text-[9px] text-gray-500">{T.liveDeliveryStatus}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveNav('My Orders')}
                    className="p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50 transition-all cursor-pointer text-left space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center"><RotateCcw className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{T.reorder}</p>
                      <p className="text-[9px] text-gray-500">{T.rebuyOneTap}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { const last = orders[0]; if (last) setRefundModal(last); else showToast('No orders yet to refund', 'info'); }}
                    className="p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50 transition-all cursor-pointer text-left space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center"><Banknote className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{T.requestRefund}</p>
                      <p className="text-[9px] text-gray-500">{T.moneyBackSupport}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { const last = orders.find(o => o.paymentStatus === 'Completed' || o.paymentStatus === 'Paid'); if (last) setReceiptOrder(last); else showToast('No completed orders for a receipt yet', 'info'); }}
                    className="p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50 transition-all cursor-pointer text-left space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center"><ScrollText className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{T.orderReceipt}</p>
                      <p className="text-[9px] text-gray-500">{T.printViewQr}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveNav('Coupons')}
                    className="p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50 transition-all cursor-pointer text-left space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center"><BadgePercent className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{T.coupons}</p>
                      <p className="text-[9px] text-gray-500">{T.activePromoCodes}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveNav('Wallet')}
                    className="p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50 transition-all cursor-pointer text-left space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{T.topupHistory}</p>
                      <p className="text-[9px] text-gray-500">{T.transactionsBalance}</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============ COUPONS ============ */}
          {activeNav === 'Coupons' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">{T.activePromoVouchers}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{T.promoVoucherSub}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COUPONS.map((cp) => (
                  <div key={cp.code} className="bg-white border border-dashed border-emerald-300 rounded-2xl p-5 shadow-xs flex items-center justify-between bg-emerald-50/30">
                    <div className="space-y-1">
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-mono font-black text-xs">{cp.code}</span>
                      <h4 className="font-bold text-sm text-gray-900 pt-1">{cp.discountText}</h4>
                      <p className="text-xs text-gray-500">{cp.desc}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{T.minOrder} ৳{cp.minOrder} • {T.expires} {cp.validTill}</p>
                    </div>
                    <button
                      onClick={() => { setCopiedCoupon(cp.code); handleApplyCouponCode(cp.code); setTimeout(() => setCopiedCoupon(null), 3000); }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center space-x-1"
                    >
                      {copiedCoupon === cp.code ? (<><Check className="w-3.5 h-3.5" /><span>{T.applied}</span></>) : (<><Copy className="w-3.5 h-3.5" /><span>{T.useCode}</span></>)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ HELP ============ */}
          {activeNav === 'Help' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">{T.helpTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{T.helpSub}</p>
                </div>
                <button onClick={() => setIsNewTicketModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2">
                  <Plus className="w-4 h-4" /><span>{T.openSupportTicket}</span>
                </button>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">{T.supportRequests}</h3>
                {tickets.map((tck) => {
                  const oid = tck.subject.match(/#(\d+)/)?.[1];
                  const adminR = oid ? reports.find(r => r.orderId === oid && r.adminReply) : undefined;
                  return (
                    <div key={tck.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-gray-500">{tck.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tck.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                          tck.status === 'Under Review' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>{tck.status}</span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900">{tck.subject}</h4>
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">"{tck.lastMessage}"</p>
                      {adminR && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                          <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider mb-0.5">{T.adminResponse}</p>
                          <p className="text-xs text-emerald-900">{adminR.adminReply}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">{T.commonProblems}</h3>
                {helpFaqs.length === 0 && (
                  <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-2xl p-4">{T.noFaqs}</p>
                )}
                {helpFaqs.map((f) => (
                  <div key={f.id} className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                    <button
                      onClick={() => setOpenFaqId(openFaqId === f.id ? null : f.id)}
                      className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex items-center space-x-2.5 text-left">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><HelpCircle className="w-3.5 h-3.5" /></span>
                        <span className="text-xs font-bold text-gray-900">{f.problem}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${openFaqId === f.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaqId === f.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                        <div className="flex items-start space-x-2.5">
                          <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></span>
                          <p className="text-xs text-gray-600 leading-relaxed">{f.solution}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ SETTINGS ============ */}
          {activeNav === 'Settings' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">{T.accountSettings || 'Customer Account Settings'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{T.accountSettingsSub || 'Update personal details and notification preferences'}</p>
              </div>

              {/* Profile picture + identity */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs">
                <button type="button" onClick={() => setShowProfileCard(!showProfileCard)} className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-black/5 transition-colors">
                  <span className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-black text-gray-900 text-sm">{T.activeAccount || 'Active Account'}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileCard ? 'rotate-180' : ''}`} />
                </button>
                {showProfileCard && (
                  <div className="px-6 pb-6 pt-4 border-t border-gray-100 space-y-4 text-xs">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-black overflow-hidden shrink-0">
                          {customerProfile.profilePic ? <img src={customerProfile.profilePic} alt={customerProfile.name} className="w-full h-full object-cover" /> : initialsOf(customerProfile.name)}
                        </div>
                        <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shadow-md">
                          <Camera className="w-3 h-3" />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const reader = new FileReader();
                            reader.onload = () => setCustomerProfile({ ...customerProfile, profilePic: String(reader.result || '') });
                            reader.readAsDataURL(f);
                          }} />
                        </label>
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">{customerProfile.name}</p>
                        <p className="text-[10px] text-gray-500">{customerProfile.email} · {customerProfile.phone}</p>
                        <button
                          onClick={() => { copyText(customerId, 'Customer ID'); setCustIdCopy(true); setTimeout(() => setCustIdCopy(false), 2000); }}
                          className="mt-1.5 inline-flex items-center space-x-1.5 px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors font-mono text-[10px]"
                          title="Copy your permanent customer ID"
                        >
                          <span>ID: {customerId}</span>
                          {custIdCopy ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-0.5">{T.tapCameraHint || 'Tap the camera icon to change your profile picture'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preferences toggles */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs">
                <button type="button" onClick={() => setShowPrefsCard(!showPrefsCard)} className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-black/5 transition-colors">
                  <span className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span className="font-black text-gray-900 text-sm">{T.preferences}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPrefsCard ? 'rotate-180' : ''}`} />
                </button>
                {showPrefsCard && (
                  <div className="px-6 pb-6 pt-4 border-t border-gray-100 space-y-4 text-xs">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-gray-800 flex items-center space-x-2">
                        <span className="text-base">{dark ? '🌙' : '☀️'}</span><span>{dark ? T.darkMode : T.lightMode}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setDark(!dark); showToast(dark ? 'Light mode enabled' : 'Dark mode enabled', 'success'); }}
                        className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${dark ? 'bg-emerald-600' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${dark ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </label>
                    <label className="flex items-center justify-between cursor-pointer border-t border-gray-100 pt-4">
                      <span className="font-bold text-gray-800 flex items-center space-x-2">
                        <Languages className="w-4 h-4 text-gray-400" /><span>{lang === 'bn' ? 'ভাষা / Language' : 'Language / ভাষা'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setLang(l => (l === 'en' ? 'bn' : 'en')); showToast(lang === 'en' ? 'ভাষা পরিবর্তন হয়েছে' : 'Language switched to English', 'info'); }}
                        className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${lang === 'bn' ? 'bg-emerald-600' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${lang === 'bn' ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </label>
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-gray-800 flex items-center space-x-2">
                          <LocateFixed className="w-4 h-4 text-emerald-600" />
                          <span>{lang === 'bn' ? 'লোকেশন পারমিশন' : 'Location Permission'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => locationPermissionState === 'granted' && !locationSharingPaused ? turnOffLocationSharing() : requestLocationFromApp('delivery')}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black transition-colors cursor-pointer ${locationPermissionState === 'granted' && !locationSharingPaused ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-600 text-white'}`}
                        >
                          {locationPermissionState === 'granted' && !locationSharingPaused ? (lang === 'bn' ? 'Off করুন' : 'Turn Off') : (lang === 'bn' ? 'Allow করুন' : 'Allow')}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        {locationPermissionState === 'granted' && !locationSharingPaused
                          ? (lang === 'bn' ? 'লোকেশন চালু আছে। Off করলে সাথে সাথে app popup আবার Allow চাইবে।' : 'Location is active. Turning it off opens the app popup again to allow.')
                          : (lang === 'bn' ? 'লোকেশন বন্ধ আছে। Allow চাপলে আগে app popup, তারপর দরকার হলে browser popup আসবে।' : 'Location is off. Allow opens the app popup first, then browser popup if needed.')}
                      </p>
                    </div>
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-gray-800 flex items-center space-x-2">
                          <Camera className="w-4 h-4 text-blue-600" />
                          <span>{lang === 'bn' ? 'ক্যামেরা পারমিশন' : 'Camera Permission'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={requestCameraPermission}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black transition-colors cursor-pointer ${cameraPermissionState === 'granted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-600 text-white'}`}
                        >
                          {cameraPermissionState === 'granted' ? (lang === 'bn' ? 'Allowed' : 'Allowed') : (lang === 'bn' ? 'Allow' : 'Allow')}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        {lang === 'bn' ? 'প্রোফাইল ছবি, receipt, support photo/video, proof upload-এর জন্য লাগে।' : 'Needed for profile photo, receipt, support photo/video and proof uploads.'}
                      </p>
                    </div>
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-gray-800 flex items-center space-x-2">
                          <Bell className="w-4 h-4 text-amber-600" />
                          <span>{lang === 'bn' ? 'নোটিফিকেশন পারমিশন' : 'Notification Permission'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={requestNotificationPermission}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black transition-colors cursor-pointer ${notificationPermissionState === 'granted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-500 text-white'}`}
                        >
                          {notificationPermissionState === 'granted' ? (lang === 'bn' ? 'Allowed' : 'Allowed') : (lang === 'bn' ? 'Allow' : 'Allow')}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        {lang === 'bn' ? 'Order update, driver nearby, payment approval, support reply alert পেতে লাগে।' : 'Needed for order updates, driver nearby alerts, payment approvals and support replies.'}
                      </p>
                    </div>
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-gray-800 flex items-center space-x-2">
                          <Package className="w-4 h-4 text-violet-600" />
                          <span>{lang === 'bn' ? 'গ্যালারি / ফাইল অ্যাক্সেস' : 'Gallery / File Access'}</span>
                        </span>
                        <span className="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-black">
                          {lang === 'bn' ? 'On demand' : 'On demand'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        {lang === 'bn' ? 'Browser security অনুযায়ী file chooser শুধু upload button চাপলে খুলবে; আলাদা permanent permission লাগে না।' : 'Browser security opens the file chooser only after tapping an upload button; no permanent permission is required.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Account details */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs">
                <button type="button" onClick={() => setShowAccountForm(!showAccountForm)} className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-black/5 transition-colors">
                  <span className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="font-black text-gray-900 text-sm">{T.connectedGmail || 'Connected Gmail'}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAccountForm ? 'rotate-180' : ''}`} />
                </button>
                {showAccountForm && (
                  <form onSubmit={async (e) => { e.preventDefault(); const dup = findAccountDuplicate(customerProfile.phone, customerProfile.email); if (dup) { showToast(`This phone or Gmail already belongs to account ${dup.name} (ID ${dup.customerId}). One account per phone/Gmail — please use your existing login.`, 'info'); return; } const conflict = await checkIdentityConflict(customerProfile.phone, customerProfile.email); if (conflict) { showToast(`This phone or Gmail already belongs to ${conflict.name || conflict.identityId} (${conflict.role || 'account'}). One account per phone/Gmail — please use your existing login.`, 'info'); return; } showToast('Account settings updated successfully!', 'success'); }} className="px-6 pb-6 pt-4 border-t border-gray-100 space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{T.fullName || 'Full Name'}</label>
                      <input type="text" value={customerProfile.name} onChange={(e) => setCustomerProfile({ ...customerProfile, name: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{T.emailAddress || 'Email Address'}</label>
                      <input type="email" value={customerProfile.email} onChange={(e) => setCustomerProfile({ ...customerProfile, email: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{T.phoneNumber || 'Phone Number'}</label>
                      <input type="tel" value={customerProfile.phone} onChange={(e) => setCustomerProfile({ ...customerProfile, phone: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" />
                    </div>
                    <div className="pt-2 space-y-3 border-t border-gray-100">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-bold text-gray-800">{T.smsAlerts || 'SMS Order Status Alerts'}</span>
                        <input type="checkbox" checked={customerProfile.sms} onChange={(e) => setCustomerProfile({ ...customerProfile, sms: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-bold text-gray-800">{T.emailReceipts || 'Email Order Receipts'}</span>
                        <input type="checkbox" checked={customerProfile.emailNotif} onChange={(e) => setCustomerProfile({ ...customerProfile, emailNotif: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-bold text-gray-800">{T.pushAlerts || 'Push Notifications'}</span>
                        <input type="checkbox" checked={customerProfile.pushNotif} onChange={(e) => setCustomerProfile({ ...customerProfile, pushNotif: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                      </label>
                    </div>
                    <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all">{T.saveChanges || 'Save Changes'}</button>
                  </form>
                )}
              </div>

              {/* Change password */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs">
                <button type="button" onClick={() => setShowPwdForm(!showPwdForm)} className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-black/5 transition-colors">
                  <span className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="font-black text-gray-900 text-sm">{T.changePassword || 'Change Password'}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPwdForm ? 'rotate-180' : ''}`} />
                </button>
                {showPwdForm && (
                  <form onSubmit={(e) => { e.preventDefault(); if (!pwd.old || !pwd.fresh) { showToast('Please fill in all password fields', 'info'); return; } if (pwd.fresh !== pwd.confirm) { showToast('New password and confirm password do not match', 'info'); return; } setPwd({ old: '', fresh: '', confirm: '' }); showToast('Password changed successfully!', 'success'); }} className="px-6 pb-6 space-y-4 text-xs border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <span className="flex items-center space-x-2 text-[10px] text-gray-500">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-bold text-gray-600">{T.connectedGmail || 'Connected Gmail'}:</span>
                        <span className="text-gray-900 font-mono">{customerProfile.email}</span>
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{T.oldPassword || 'Current Password'}</label>
                      <input type="password" value={pwd.old} onChange={(e) => setPwd(p => ({ ...p, old: e.target.value }))} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{T.newPassword || 'New Password'}</label>
                      <input type="password" value={pwd.fresh} onChange={(e) => setPwd(p => ({ ...p, fresh: e.target.value }))} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{T.confirmPassword || 'Confirm New Password'}</label>
                      <input type="password" value={pwd.confirm} onChange={(e) => setPwd(p => ({ ...p, confirm: e.target.value }))} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" />
                    </div>
                    <button type="submit" className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-md transition-all">{T.updatePassword || 'Update Password'}</button>
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{T.forgotTitle || 'Forgot your password?'}</p>
                      <button
                        type="button"
                        onClick={() => { setPwd({ old: '', fresh: '', confirm: '' }); showToast(`Gmail password reset link sent to ${customerProfile.email}`, 'success'); }}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" /><span>{T.forgotGmailPwd || 'Forgot Gmail password'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPwd({ old: '', fresh: '', confirm: '' }); showToast('App password reset OTP sent to your phone', 'success'); }}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" /><span>{T.forgotAppPwd || 'Forgot App password'}</span>
                      </button>
                      <p className="text-[10px] text-gray-400 text-center">{T.recoverViaGmail || 'Reset via your connected Gmail or phone OTP'}</p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-xl border-t border-white/70 md:hidden grid grid-cols-5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {[
          { key: 'Home' as const, label: T.home, icon: <Home className="w-5 h-5" /> },
          { key: 'Orders' as const, label: T.orders, icon: <Store className="w-5 h-5" /> },
          { key: 'My Orders' as const, label: T.myOrders, icon: <Package className="w-5 h-5" /> },
          { key: 'Wallet' as const, label: T.wallet, icon: <Wallet className="w-5 h-5" /> },
          { key: 'Settings' as const, label: T.account, icon: <Settings className="w-5 h-5" /> },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveNav(item.key)}
            className={`flex flex-col items-center justify-center py-2.5 text-[9px] font-bold transition-colors cursor-pointer ${activeNav === item.key ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            {item.icon}
            <span className="mt-0.5">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ============ STORE MENU & CHECKOUT MODAL ============ */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden sm:my-6 max-h-[90vh] flex flex-col">
            <div className="relative h-24 sm:h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-500 shrink-0">
              <img src={selectedStore.image} alt={nm(selectedStore.name)} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/30 via-teal-800/20 to-teal-600/10" />
              <div className="absolute top-2.5 right-2.5 flex items-center space-x-2">
                <button onClick={() => setSelectedStore(null)} className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="absolute bottom-2 left-3 text-white flex items-end gap-2.5">
                <div className={`hidden sm:flex w-11 h-11 rounded-xl ${selectedStore.logoBg} items-center justify-center font-black text-base shadow-lg border-2 border-white/40`}>
                  {selectedStore.logoText.charAt(0)}
                </div>
                <div>
                  <span className={`px-1.5 py-px rounded text-[8px] font-bold uppercase ${selectedStore.badgeColor}`}>{selectedStore.category}</span>
                  <h2 className="text-lg font-black mt-0.5">{nm(selectedStore.name)}</h2>
                  <p className="text-[10px] text-gray-300 flex items-center space-x-1.5">
                    <span className="flex items-center space-x-1"><Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /><b>{selectedStore.rating}</b></span>
                    <span>•</span><Clock className="w-2.5 h-2.5" /><span>{selectedStore.deliveryTime}</span>
                    <span>•</span><span>৳{selectedStore.deliveryFee} delivery</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Product grid */}
              <div className="lg:col-span-2 space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none">
                    {['All', ...Array.from(new Set(selectedStore.catalog.map(p => p.category)))].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setStoreCat(cat)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                          storeCat === cat ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={storeSearch}
                      onChange={(e) => setStoreSearch(e.target.value)}
                      placeholder="Search menu — type product name…"
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:bg-white focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {
                      selectedStore.catalog
                        .filter(p => storeCat === 'All' || p.category === storeCat)
                        .filter(p => {
                          if (!storeSearch.trim()) return true;
                          const q = storeSearch.trim().toLowerCase();
                          return p.name.toLowerCase().includes(q) || (BN_NAMES[p.name] || '').toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q) || (p.unit || '').toLowerCase().includes(q);
                        }).length
                    } items found
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {selectedStore.catalog
                    .filter(p => storeCat === 'All' || p.category === storeCat)
                    .filter(p => {
                      if (!storeSearch.trim()) return true;
                      const q = storeSearch.trim().toLowerCase();
                      return p.name.toLowerCase().includes(q) || (BN_NAMES[p.name] || '').toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q) || (p.unit || '').toLowerCase().includes(q);
                    })
                    .map((prod) => {
                      const inCart = cart.find(i => i.product.id === prod.id);
                      return (
                        <div key={prod.id} className={`border rounded-xl overflow-hidden bg-white transition-all ${prod.status === 'Out of Stock' ? 'opacity-55 border-gray-200' : 'border-gray-200 hover:border-emerald-300 hover:shadow-sm'}`}>
                          <div className="relative h-16 bg-gray-100 cursor-pointer" onClick={() => { setDetailProduct(prod); setDetailStoreName(selectedStore.name); }}>
                            <img src={prod.image} alt={nm(prod.name)} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            <span className={`absolute top-0.5 left-0.5 px-1 py-px rounded text-[7px] font-black uppercase ${
                              prod.status === 'In Stock' ? 'bg-emerald-600 text-white' : prod.status === 'Low Stock' ? 'bg-amber-500 text-white' : 'bg-gray-600 text-white'
                            }`}>{statusLabel(prod.status)}</span>
                          </div>
                          <div className="p-2 space-y-1">
                            <h4 className="font-bold text-[11px] text-gray-900 leading-tight line-clamp-2 cursor-pointer hover:text-emerald-700" onClick={() => { setDetailProduct(prod); setDetailStoreName(selectedStore.name); }}>{nm(prod.name)}</h4>
                            <div className="flex items-center justify-between pt-0.5 gap-1">
                              <div className="min-w-0">
                                <span className="font-mono font-black text-emerald-700 text-xs">৳{prod.price}</span>
                                <span className="text-[8px] text-gray-400 ml-0.5">/{prod.unit}</span>
                              </div>
                              {prod.status === 'Out of Stock' ? (
                                <span className="text-[8px] font-bold text-gray-400">Sold out</span>
                              ) : (
                                <div className="flex items-center space-x-0.5 shrink-0">
                                   {inCart ? (
                                    <div className="flex items-center justify-center space-x-1 bg-emerald-500 text-white rounded-md px-1.5 py-0.5">
                                      <button onClick={() => handleUpdateQty(prod.id, -1)} className="text-white hover:text-green-200 cursor-pointer"><Minus className="w-3 h-3" /></button>
                                      <span className="font-mono font-bold text-[10px] w-3 text-center">{inCart.quantity}</span>
                                      <button onClick={() => handleAddToCart(prod)} className="text-white hover:text-green-200 cursor-pointer"><Plus className="w-3 h-3" /></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => handleAddToCart(prod)} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1">
                                      <Plus className="w-3 h-3" /><span>Add</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {selectedStore.catalog
                    .filter(p => storeCat === 'All' || p.category === storeCat)
                    .filter(p => {
                      if (!storeSearch.trim()) return true;
                      const q = storeSearch.trim().toLowerCase();
                      return p.name.toLowerCase().includes(q) || (BN_NAMES[p.name] || '').toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q) || (p.unit || '').toLowerCase().includes(q);
                    }).length === 0 && (
                    <p className="col-span-full text-center text-xs text-gray-400 py-8">No items match "{storeSearch}"</p>
                  )}
                </div>
              </div>

              {/* Cart & checkout */}
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center justify-between">
                    <span>{T.yourBasket}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{cartCount} {T.items}</span>
                  </h3>
                  {cart.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">{T.basketEmpty}</p>
                  ) : (
                    <div className="divide-y divide-gray-200 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div key={item.product.id} className="pt-2 flex items-center justify-between text-xs">
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-gray-900 block">{nm(item.product.name)}</span>
                            {item.note && <span className="text-[9px] text-amber-600 font-bold block truncate">✎ {item.note}</span>}
                            <span className="text-[10px] text-gray-500">৳{item.product.price} / {item.product.unit}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <div className="flex items-center space-x-1 border border-gray-300 rounded-lg bg-white px-1.5 py-0.5">
                              <button onClick={() => handleUpdateQty(item.product.id, -1)} className="text-gray-500 hover:text-gray-800 cursor-pointer"><Minus className="w-3 h-3" /></button>
                              <span className="font-mono font-bold text-xs text-gray-800 w-4 text-center">{item.quantity}</span>
                              <button onClick={() => handleAddToCart(item.product)} className="text-gray-500 hover:text-gray-800 cursor-pointer"><Plus className="w-3 h-3" /></button>
                            </div>
                            <span className="font-mono font-bold text-gray-900 w-12 text-right">৳{item.product.price * item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder={T.couponCode}
                        className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono uppercase outline-none focus:border-emerald-500" />
                    </div>
                    <button type="button" onClick={() => handleApplyCouponCode()} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer">{T.apply}</button>
                  </div>
                  {!appliedCoupon && (() => {
                    const best = COUPONS.filter(c => cartSubtotal >= c.minOrder && c.code !== 'SMARTSHOP').sort((a, b) => (b.discountValue || 0) - (a.discountValue || 0))[0];
                    if (!best) return null;
                    return (
                      <button
                        onClick={() => { if (best.isFreeShip) { setAppliedCoupon({ code: best.code, discount: 0, isFreeShip: true }); showToast(`Coupon ${best.code} applied: Free Delivery!`, 'success'); } else { setAppliedCoupon({ code: best.code, discount: best.discountValue }); showToast(`Coupon ${best.code} applied: ৳${best.discountValue} discount!`, 'success'); } }}
                        className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
                      >
                        <span className="flex items-center space-x-1.5"><BadgePercent className="w-4 h-4" /><span>{T.bestCoupon}: <span className="font-mono">{best.code}</span></span></span>
                        <span className="text-amber-700 underline">{T.apply}</span>
                      </button>
                    );
                  })()}
                  {appliedCoupon && (
                    <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-bold flex justify-between items-center">
                      <span>🎉 Coupon '{appliedCoupon.code}' applied</span>
                      <button onClick={() => setAppliedCoupon(null)} className="text-red-600 hover:underline cursor-pointer">Remove</button>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 text-xs space-y-1.5 font-medium">
                    <div className="flex justify-between text-gray-600"><span>{T.subtotal}</span><span className="font-mono">৳{cartSubtotal}</span></div>
                    <div className="flex justify-between text-gray-600"><span>{T.delivery}</span><span className="font-mono">{deliveryCharge === 0 ? T.freeShip : `৳${deliveryCharge}`}</span></div>
                    <div className="flex justify-between text-gray-600"><span>{T.vat}</span><span className="font-mono">৳{vatTax}</span></div>
                    {couponDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold"><span>{T.promoDiscount}</span><span className="font-mono">-৳{couponDiscountAmount}</span></div>
                    )}
                    <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                      <span>{T.grandTotal}</span><span className="font-mono text-emerald-700">৳{cartGrandTotal}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 text-xs">
                  <h3 className="font-black uppercase tracking-wider text-gray-800">{T.deliveryDetails}</h3>
                  {(locationSharingPaused || locationPermissionState !== 'granted') && (
                    <div className={`rounded-xl border p-2.5 text-[10px] font-bold ${locationPermissionState === 'denied' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                      {locationSharingPaused
                        ? 'Location sharing app theke OFF ache. Allow Location চাপলে আবার app popup আসবে.'
                        : locationPermissionState === 'denied'
                        ? 'Location permission blocked/off. App popup থেকে Allow Location চাপুন; দরকার হলে browser site settings থেকেও Allow করুন.'
                        : 'Customer app নিজের popup দেখাবে. Allow করলে real GPS order location auto save হবে.'}
                    </div>
                  )}

                  {/* Schedule toggle */}
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <button
                        type="button"
                        onClick={() => setIsScheduled(false)}
                        className={`flex-1 py-1.5 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${!isScheduled ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        ⚡ {T.home === 'হোম' ? 'এখনই' : 'Deliver Now'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsScheduled(true)}
                        className={`flex-1 py-1.5 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1 ${isScheduled ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        <CalendarClock className="w-3 h-3" /><span>{T.home === 'হোম' ? 'পরবর্তী সময়ে' : 'Schedule Later'}</span>
                      </button>
                    </div>
                    {isScheduled && (
                      <select
                        value={scheduleSlot}
                        onChange={(e) => setScheduleSlot(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 outline-none focus:border-emerald-500"
                      >
                        {SCHEDULE_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Delivery pin map — tap, drag, or use your current location */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1"><LocateFixed className="w-3 h-3 text-emerald-600" /><span>📍 {T.deliveryAddress} {lang === 'bn' ? '(পিন দিন)' : '(pin your location)'}</span></span>
                      {deliveryPin && <button type="button" onClick={() => setDeliveryPin(null)} className="text-red-500 hover:underline font-bold">{T.cancel}</button>}
                    </label>
                    <div className="h-36 rounded-xl overflow-hidden border border-gray-200 relative z-0">
                      <LeafletMap
                        vehicles={[]}
                        zoomTo={13}
                        marker={deliveryPin}
                        markerDraggable
                        onMapClick={(lat, lng) => {
                          const area = nearestAreaOf(lat, lng);
                          setDeliveryPin({ lat, lng });
                          setDeliveryLocationMeta({ capturedAt: new Date().toISOString(), source: 'map-pin', area });
                        }}
                        onMarkerDrag={(lat, lng) => {
                          const area = nearestAreaOf(lat, lng);
                          setDeliveryPin({ lat, lng });
                          setDeliveryLocationMeta({ capturedAt: new Date().toISOString(), source: 'map-pin', area });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <button
                        type="button"
                        onClick={() => requestLocationFromApp('delivery')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <LocateFixed className="w-3.5 h-3.5" /><span>Use my current location</span>
                      </button>
                      {deliveryPin && (
                        <button
                          type="button"
                          onClick={() => showToast('Delivery pin saved — it cannot change after the order completes.', 'success')}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" /><span>Pin saved</span>
                        </button>
                      )}
                      {locationPermissionState === 'granted' && !locationSharingPaused && (
                        <button
                          type="button"
                          onClick={turnOffLocationSharing}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Off
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.deliveryAddress}</label>
                    <input type="text" list="saved-addrs" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 outline-none focus:border-emerald-500" />
                    <datalist id="saved-addrs">
                      {addresses.map(a => <option key={a.id} value={`${a.address}, ${a.area}`} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.contactPhone}</label>
                    <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 outline-none focus:border-emerald-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.orderNote}</label>
                    <textarea
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: দরজায় রেখে যান, বেল বাজান…' : 'e.g. leave at the door, ring the bell…'}
                      rows={2}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">{T.paymentMethod}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['bKash', 'Nagad', 'Upay', 'Rocket', 'Cash on Delivery', 'Card', 'Split (Wallet + bKash)'] as const).map((method) => (
                        <button
                          type="button"
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${method === 'Split (Wallet + bKash)' ? 'col-span-2' : ''} ${
                            paymentMethod === method ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {(SEND_MONEY_METHODS as readonly string[]).includes(method) ? (
                            <span className="flex items-center justify-center space-x-1">
                              {method === 'bKash' ? <BkashLogo className="w-8 h-8 rounded-md" /> : method === 'Nagad' ? <NagadLogo className="w-8 h-8 rounded-md" /> : method === 'Upay' ? <UpayLogo className="w-8 h-8 rounded-md" /> : <RocketLogo className="w-8 h-8 rounded-md" />}
                              <span>Send Money</span>
                            </span>
                          ) : method}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handlePlaceCustomerOrder}
                    disabled={cart.length === 0 || isLocatingDelivery}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Zap className="w-4 h-4" /><span>{isLocatingDelivery ? 'Getting location...' : `${T.placeOrder} (৳${cartGrandTotal})`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ REFUND MODAL ============ */}
      {refundModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-3 text-xs animate-in fade-in duration-200 my-auto max-h-[88dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-900 text-sm">↩ Request Refund</h3>
                <p className="text-[10px] text-gray-500">Order #{refundModal.id} · ৳{refundModal.amount.toLocaleString()}</p>
              </div>
              <button onClick={() => setRefundModal(null)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-800">
              Money will be returned to your bKash/Nagad account after admin approval.
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Refund to (wallet)</label>
              <div className="grid grid-cols-2 gap-2">
                {(['bKash', 'Nagad', 'Upay', 'Rocket'] as const).map(m => (
                  <button key={m} onClick={() => setRefundMethod(m)} className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${refundMethod === m ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white text-gray-500'}`}>
                    {m === 'bKash' ? <BkashLogo className="w-8 h-8 rounded-md" /> : m === 'Nagad' ? <NagadLogo className="w-8 h-8 rounded-md" /> : m === 'Upay' ? <UpayLogo className="w-8 h-8 rounded-md" /> : <RocketLogo className="w-8 h-8 rounded-md" />}
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Your {refundMethod} number</label>
              <input type="tel" inputMode="numeric" value={refundNumber} onChange={(e) => setRefundNumber(e.target.value.replace(/[^0-9-]/g, ''))} placeholder="01XXX-XXXXXX" maxLength={13} className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Reason</label>
              <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2} placeholder="Why do you want a refund? (e.g. order cancelled, wrong item, not delivered)" className="w-full bg-white border border-gray-300 rounded-xl p-2 outline-none focus:border-emerald-500 resize-none" />
            </div>
            <button onClick={submitRefund} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer">
              Submit Refund Request
            </button>
          </div>
        </div>
      )}

      {/* ============ RETURN REQUEST MODAL ============ */}
      {returnModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-3 text-xs animate-in fade-in duration-200 my-auto max-h-[88dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-900 text-sm">↩ Request Return</h3>
                <p className="text-[10px] text-gray-500">Order #{returnModal.id} · ৳{returnModal.amount.toLocaleString()}</p>
              </div>
              <button onClick={() => setReturnModal(null)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Reason</label>
              <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl p-2 outline-none focus:border-orange-500 cursor-pointer">
                <option value="">Select a reason…</option>
                <option>Wrong item received</option>
                <option>Item damaged / defective</option>
                <option>Item not as described</option>
                <option>Duplicate / extra item</option>
                <option>Changed my mind</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Details (optional)</label>
              <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)} rows={3} placeholder="Describe the issue — e.g. damaged box, missing parts, etc." className="w-full bg-white border border-gray-300 rounded-xl p-2 outline-none focus:border-orange-500 resize-none" />
            </div>
            <p className="text-[9px] text-gray-500">A rider will be scheduled to pick the item up from your address. Refund starts after the store receives it.</p>
            <button onClick={submitReturn} className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer">
              Submit Return Request
            </button>
          </div>
        </div>
      )}

      {/* ============ HANDOFF QR MODAL ============ */}
      {qrLiveOrder && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs my-auto max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-900 text-sm flex items-center space-x-2"><QrCode className="w-4 h-4 text-blue-600" /><span>Handoff QR · Order #{qrLiveOrder.id}</span></h3>
                <p className="text-[10px] text-gray-500">{qrLiveOrder.storeName} · ৳{qrLiveOrder.amount.toLocaleString()}</p>
              </div>
              <button onClick={() => setQrOrder(null)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
              <QRCodeSVG value={handoffPayloadOf(qrLiveOrder.id)} size={180} level="M" />
              <div className="text-center">
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Handoff Code</p>
                <p className="text-lg font-black font-mono text-gray-900 tracking-[0.2em]">{handoffCodeOf(qrLiveOrder.id)}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-[10px]">
              <p className="flex items-center space-x-2"><span className={`w-2 h-2 rounded-full ${qrLiveOrder.handoffScanned?.pickup ? 'bg-emerald-500' : 'bg-gray-300'}`} /><span className={qrLiveOrder.handoffScanned?.pickup ? 'text-emerald-700 font-bold' : 'text-gray-500'}>Pickup — store staff scan করে verify করবে</span>{qrLiveOrder.handoffScanned?.pickup && '✅'}</p>
              <p className="flex items-center space-x-2"><span className={`w-2 h-2 rounded-full ${qrLiveOrder.handoffScanned?.delivery ? 'bg-emerald-500' : 'bg-gray-300'}`} /><span className={qrLiveOrder.handoffScanned?.delivery ? 'text-emerald-700 font-bold' : 'text-gray-500'}>Delivery — driver customer-এর কাছে scan করে verify করবে</span>{qrLiveOrder.handoffScanned?.delivery && '✅'}</p>
            </div>
            <p className="text-[9px] text-gray-400 leading-relaxed">এই QR শুধু এই অর্ডারের জন্য — স্ক্রিন থেকে দেখান, ছবি নেওয়ার দরকার নেই। Delivery PIN <b className="font-mono">{qrLiveOrder.deliveryPin || '—'}</b> সাথে রাখুন।</p>
          </div>
        </div>
      )}

      {/* ============ PAYMENT FLOW MODAL ============ */}
      {payModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-3 text-xs animate-in fade-in duration-200 my-auto max-h-[88dvh] overflow-y-auto overflow-x-hidden">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                {payModal === 'bKash' && <BkashLogo className="w-9 h-9 rounded-lg" />}
                {payModal === 'Nagad' && <NagadLogo className="w-9 h-9 rounded-lg" />}
                {payModal === 'Upay' && <UpayLogo className="w-9 h-9 rounded-lg" />}
                {payModal === 'Rocket' && <RocketLogo className="w-9 h-9 rounded-lg" />}
                {payModal === 'Card' && <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center"><CreditCard className="w-4 h-4" /></div>}
                {payModal === 'COD' && <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><Banknote className="w-4 h-4" /></div>}
                {payModal === 'Split (Wallet + bKash)' && <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><Wallet className="w-4 h-4" /></div>}
                <div>
                  <h3 className="font-black text-gray-900 text-sm">
                    {payModal === 'bKash' ? 'Pay with bKash' : payModal === 'Nagad' ? 'Pay with Nagad' : payModal === 'Upay' ? 'Pay with Upay' : payModal === 'Rocket' ? 'Pay with Rocket' : payModal === 'Card' ? 'Card Payment' : payModal === 'Split (Wallet + bKash)' ? 'Split Payment' : 'Cash on Delivery'}
                  </h3>
                  <p className="text-[10px] text-gray-500">{T.secureVia}</p>
                </div>
              </div>
              <button onClick={() => setPayModal(null)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">{T.amountToPay}</p>
                <p className="text-xl font-black font-mono text-gray-900">৳{cartGrandTotal}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Lock className="w-4 h-4" /></div>
            </div>

            {payModal === 'bKash' || payModal === 'Nagad' || payModal === 'Upay' || payModal === 'Rocket' ? (() => {
              const wk = payModal as WalletKey;
              const cfg = walletConfig[wk] || DEFAULT_WALLETS[wk];
              const mwList = cfg.numbers && cfg.numbers.length ? cfg.numbers : DEFAULT_WALLETS[wk].numbers;
              const mwName = cfg.name || DEFAULT_WALLETS[wk].name;
              const mw = mwList[0];
              const meta = WALLET_META[wk];
              const mm = Math.floor(payLeft / 60);
              const ss = payLeft % 60;
              const sender = sendMoney.sender.replace(/[^0-9]/g, '');
              const blocked = fraudBlocked(sender);
              return (
              <div className="space-y-3">
                {/* Merchant wallet card */}
                <div className={`rounded-2xl border p-3 text-white relative overflow-hidden bg-gradient-to-br ${meta.gradient}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-9 h-9 rounded-xl overflow-hidden shadow">{wk === 'bKash' ? <BkashLogo className="w-9 h-9" /> : wk === 'Nagad' ? <NagadLogo className="w-9 h-9" /> : wk === 'Upay' ? <UpayLogo className="w-9 h-9" /> : <RocketLogo className="w-9 h-9" />}</div>
                      <div>
                        <p className="font-black text-sm leading-tight">{mwName} · {wk} Wallet</p>
                        <p className="text-[10px] text-white/80">{T.sendMoneyTo}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/25 text-[9px] font-black">Send Money</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <p className="font-mono text-lg font-black tracking-wider">{mw}</p>
                    <button
                      onClick={() => copyText(mw, `${wk} number`)}
                      className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-[10px] font-black flex items-center space-x-1 hover:bg-gray-100 transition-colors cursor-pointer shadow shrink-0"
                    >
                      <Copy className="w-3 h-3" /><span>{T.copyNumber}</span>
                    </button>
                  </div>
                  {mwList.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-white/70 font-bold uppercase">Other numbers:</span>
                      {mwList.slice(1).map(n => (
                        <button
                          key={n}
                          onClick={() => copyText(n, `${wk} number`)}
                          className="px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <Copy className="w-2.5 h-2.5" /><span className="font-mono">{n}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Countdown */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${payExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <span className="font-bold flex items-center space-x-1"><Clock className="w-3.5 h-3.5" /><span>{payExpired ? T.sessionExpired : T.completeWithin}</span></span>
                  <span className="font-mono font-black text-sm">{payExpired ? '00:00' : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`}</span>
                </div>

                {payExpired ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-gray-500 text-center py-2">{T.expiredMsg}</p>
                    <button
                      onClick={() => { setPayModal(null); resetPaySession(); }}
                      className="w-full py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      {T.close}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.yourNumber?.replace('{m}', payModal)}</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={sendMoney.sender}
                        onChange={(e) => setSendMoney(s => ({ ...s, sender: e.target.value.replace(/[^0-9-]/g, '') }))}
                        placeholder="01XXX-XXXXXX"
                        maxLength={13}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono outline-none focus:border-emerald-500"
                      />
                      {blocked && <p className="text-[10px] text-red-600 mt-1 font-bold">Too many invalid attempts — this number is temporarily blocked.</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.last4Label?.replace('{m}', payModal)}</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={sendMoney.last4}
                        onChange={(e) => setSendMoney(s => ({ ...s, last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                        placeholder="••••"
                        maxLength={4}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono tracking-[0.3em] text-center text-sm font-black outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">{T.last4Hint?.replace('{m}', payModal)}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.sentAmount?.replace('{x}', String(cartGrandTotal))}</label>
                      <input
                        type="number"
                        min={0}
                        value={sendMoney.amount}
                        onChange={(e) => setSendMoney(s => ({ ...s, amount: e.target.value }))}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono outline-none focus:border-emerald-500"
                      />
                      <p className={`text-[10px] mt-1 font-bold ${Math.abs((parseFloat(sendMoney.amount) || 0) - cartGrandTotal) <= 0.01 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {Math.abs((parseFloat(sendMoney.amount) || 0) - cartGrandTotal) <= 0.01 ? T.exactMatch : T.amountMatch?.replace('{x}', String(cartGrandTotal))}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.trxIdLabel?.replace('{m}', payModal)}</label>
                      <input
                        type="text"
                        value={sendMoney.trxId}
                        onChange={(e) => setSendMoney(s => ({ ...s, trxId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) }))}
                        placeholder={WALLET_META[payModal as WalletKey].trxPlaceholder}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono tracking-wider uppercase outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">{T.trxIdHint}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.receiptLabel}</label>
                      <div className="flex items-center space-x-2">
                        <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-600 font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                          <Camera className="w-4 h-4" /><span>{sendMoney.receipt ? T.changeReceipt : T.uploadReceipt}</span>
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptFile} />
                        </label>
                        {sendMoney.receipt && (
                          <button onClick={() => setSendMoney(s => ({ ...s, receipt: '' }))} className="px-2.5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer" title="Remove receipt">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {sendMoney.receipt && (
                        <img src={sendMoney.receipt} alt="receipt" className="mt-2 w-full h-20 object-cover rounded-xl border border-gray-200" />
                      )}
                    </div>
                    <button
                      onClick={confirmSendMoney}
                      className={`w-full py-2.5 text-white font-black rounded-xl shadow-md transition-all cursor-pointer ${WALLET_META[payModal as WalletKey].btn}`}
                    >
                      {T.submitVerify} ৳{cartGrandTotal}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center flex items-center justify-center space-x-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /><span>{T.verificationNote}</span></p>
                  </div>
                )}
              </div>
              );
            })(              ) : payModal === 'Split (Wallet + bKash)' ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 space-y-1.5">
                    <div className="flex justify-between font-bold"><span>Wallet balance</span><span className="font-mono">৳{walletBalance.toLocaleString()}</span></div>
                    <div className="flex justify-between font-bold text-gray-900"><span>Order total</span><span className="font-mono">৳{cartGrandTotal}</span></div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Pay from Wallet</label>
                    <input
                      type="number"
                      min={0}
                      max={Math.min(walletBalance, cartGrandTotal)}
                      value={splitWalletAmount}
                      onChange={(e) => setSplitWalletAmount(Math.max(0, Math.min(Number(e.target.value) || 0, walletBalance, cartGrandTotal)))}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-mono outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Remaining <b className="font-mono">৳{Math.max(0, cartGrandTotal - splitWalletAmount)}</b> will be paid via bKash.</p>
                  </div>
                  {cartGrandTotal - splitWalletAmount > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">bKash PIN (for ৳{Math.max(0, cartGrandTotal - splitWalletAmount)})</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={splitPinInput}
                        onChange={(e) => setSplitPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="• • • • •"
                        maxLength={5}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-center tracking-[0.5em] font-mono outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">temporary PIN: <b className="text-gray-600 font-mono">{(paymentMethods.find(p => p.type === 'bKash')?.pin) || '12345'}</b></p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (splitWalletAmount <= 0) { showToast('Choose an amount from wallet', 'info'); return; }
                      const bPin = paymentMethods.find(p => p.type === 'bKash')?.pin || '12345';
                      if (cartGrandTotal - splitWalletAmount > 0 && splitPinInput !== bPin) { showToast(`Incorrect bKash PIN — the correct PIN is ${bPin}`, 'info'); return; }
                      showToast(`Split payment: ৳${splitWalletAmount} wallet + ৳${cartGrandTotal - splitWalletAmount} bKash`, 'success');
                      confirmPayment();
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Pay ৳{splitWalletAmount} wallet + ৳{Math.max(0, cartGrandTotal - splitWalletAmount)} bKash
                  </button>
                </div>
              ) : payModal === 'Card' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Card Number</label>
                  <input type="text" value={cardInfo.number} onChange={(e) => setCardInfo({ ...cardInfo, number: e.target.value.replace(/[^0-9 ]/g, '') })} placeholder="4242 4242 4242 4242" className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-mono outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Cardholder Name</label>
                  <input type="text" value={cardInfo.name} onChange={(e) => setCardInfo({ ...cardInfo, name: e.target.value })} placeholder="Customer Name" className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-mono uppercase outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Expiry</label>
                    <input type="text" value={cardInfo.expiry} onChange={(e) => setCardInfo({ ...cardInfo, expiry: e.target.value.replace(/[^0-9/]/g, '') })} placeholder="12/28" className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-mono outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">CVV</label>
                    <input type="password" value={cardInfo.cvv} onChange={(e) => setCardInfo({ ...cardInfo, cvv: e.target.value.replace(/[^0-9]/g, '') })} placeholder="•••" maxLength={3} className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-mono outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (cardInfo.number.replace(/\s/g, '').length < 16) { showToast('Enter a valid 16-digit card number', 'info'); return; }
                    if (!cardInfo.name.trim()) { showToast('Enter the cardholder name', 'info'); return; }
                    const expMatch = cardInfo.expiry.match(/^(\d{2})\/(\d{2})$/);
                    if (!expMatch) { showToast('Enter expiry as MM/YY', 'info'); return; }
                    const mm = parseInt(expMatch[1], 10);
                    const yy = 2000 + parseInt(expMatch[2], 10);
                    if (mm < 1 || mm > 12) { showToast('Invalid expiry month', 'info'); return; }
                    if (yy < 2026 || (yy === 2026 && mm < 8)) { showToast('This card is expired', 'info'); return; }
                    if (cardInfo.cvv.length < 3) { showToast('Enter the 3-digit CVV', 'info'); return; }
                    showToast('Card payment of ৳' + cartGrandTotal + ' successful', 'success');
                    confirmPayment();
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Pay ৳{cartGrandTotal}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 font-bold flex items-center space-x-2">
                  <Banknote className="w-4 h-4 shrink-0" /><span>Pay ৳{cartGrandTotal} in cash when your order arrives.</span>
                </div>
                <p className="text-[11px] text-gray-500">Your driver will collect the exact amount on delivery. Please keep the cash ready.</p>
                <button onClick={confirmPayment} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer">
                  Confirm Cash on Delivery
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ LIVE TRACKING MODAL ============ */}
      {trackingOrder && (
        <div className="fixed inset-0 z-[60] bg-slate-900/35 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-5 shadow-2xl border border-gray-200 space-y-3 sm:space-y-4 animate-in fade-in duration-200 my-2">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{T.liveTracking}</span>
                <h3 className="text-base font-black text-gray-900">Order #{trackingOrder.id} · {trackingOrder.storeName}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${trackingOrder.status === 'Ongoing' ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'}`}>{trackingOrder.status}</span>
                  {trackingOrder.scheduledSlot && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-bold flex items-center space-x-1"><CalendarClock className="w-3 h-3" /><span>{trackingOrder.scheduledSlot}</span></span>}
                </div>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Location links — store pickup + customer's pinned delivery point (no live driver location) */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pickup & Delivery</span>
                </p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black">
                  {trackProgress >= 1 ? T.delivered : `${etaMins} ${T.minsAway}`}
                </span>
              </div>
              {trackingDriver && trackingOrder.status === 'Ongoing' && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-700">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">{initialsOf(trackingDriver.name)}</span>
                  <span className="min-w-0">
                    {T.courierDriver}: <b>{trackingDriver.name}</b> · {trackingDriver.vehicleType}
                    {(() => { const rr = riderRatingOf(trackingDriver.name); return rr ? <span className="ml-1 text-amber-500">★ {rr.avg} <span className="text-gray-400">({rr.count})</span></span> : null; })()}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps?q=${pickupOfOrder(trackingOrder).lat},${pickupOfOrder(trackingOrder).lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 hover:border-emerald-400 hover:text-emerald-700 flex items-center justify-center space-x-1 transition-colors"
                >
                  <Store className="w-3 h-3" /><span>Store Location</span>
                </a>
                <a
                  href={`https://www.google.com/maps?q=${areaOfOrder(trackingOrder).lat},${areaOfOrder(trackingOrder).lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 hover:border-emerald-400 hover:text-emerald-700 flex items-center justify-center space-x-1 transition-colors"
                >
                  <MapPin className="w-3 h-3" /><span>My Delivery Pin</span>
                </a>
              </div>
              <p className="text-[9px] text-gray-400 leading-relaxed">
                Your rider's live position is visible to the admin dashboard only. You can always open the store or your pinned delivery point on Google Maps.
              </p>
            </div>

            {/* Timeline */}
            <div className="space-y-1">
              {ETA_STEPS.map((step, i) => {
                const done = trackProgress >= step.min;
                const isActive = activeStepIdx === i && trackProgress < 1;
                return (
                  <div key={i} className="flex items-start space-x-3 py-1.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border-2 ${
                        done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {done ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                      </div>
                      {i < ETA_STEPS.length - 1 && <div className={`w-0.5 h-6 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                    </div>
                    <div className="pt-0.5">
                      <p className={`text-xs font-black ${isActive ? 'text-emerald-700' : done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {statusLabel(step.label)} {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />}
                      </p>
                      <p className="text-[10px] text-gray-500">{statusLabel(step.desc)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Driver card — only shown once the order is Out for Delivery */}
            {trackingDriver && trackingOrder.status === 'Ongoing' && (() => {
              const dPhone = trackingDriver.phone || '01700000000';
              const waNum = '88' + dPhone.replace(/^0/, '');
              return (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full ${hashColor(trackingDriver.name)} text-white font-bold flex items-center justify-center text-[11px] shrink-0`}>
                      {initialsOf(trackingDriver.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{T.courierDriver}: {trackingDriver.name} {(() => { const rr = riderRatingOf(trackingDriver.name); return rr ? <span className="text-amber-500">★ {rr.avg}</span> : null; })()}</p>
                      <p className="text-[10px] text-gray-500 font-mono truncate">{trackingDriver.vehicleType}: {trackingDriver.id} · {trackProgress < 0.12 ? 'At store — picking up your order' : 'En route to you'}</p>
                      {dPhone && <p className="text-[10px] text-gray-600 font-mono font-bold">📞 {dPhone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors cursor-pointer" title="Chat on WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                    <button onClick={() => showToast(`${T.callDriver} ${trackingDriver.name}: ${dPhone}`, 'info')} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer" title={`Call ${dPhone}`}>
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Delivery is completed by the admin/store only — customers cannot complete orders */}
            {trackProgress >= 0.9 && trackingOrder.status !== 'Completed' && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl text-center">
                <p className="text-xs font-black text-blue-900 flex items-center justify-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5" /><span>Driver at your door — delivery will be confirmed by our team</span>
                </p>
              </div>
            )}

            <div className="flex space-x-2">
              <button onClick={() => setTrackingOrder(null)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer">
                {T.closeTracking}
              </button>
              <button onClick={() => openReportModal(trackingOrder)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5" /><span>Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ RECEIPT MODAL ============ */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="pos-receipt" className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs font-mono">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="font-bold text-gray-900">Official Order Receipt</span>
              <button onClick={() => setReceiptOrder(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="text-center space-y-2">
              <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-xs border-2 border-black print:bg-black print:text-white print:border-black">
                  <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                    <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h6v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
                  </svg>
                </div>
                <div className="flex items-center space-x-1.5 text-[9px] font-black tracking-widest uppercase text-black print:text-black">
                  <span>★</span><span>SMART SHOP BRAND</span><span>★</span>
                </div>
              </div>
              <h4 className="font-black text-sm text-gray-900 uppercase print:text-black">{receiptOrder.storeName}</h4>
              <p className="text-[10px] text-gray-500 print:text-black">Order ID: #{receiptOrder.id}</p>
              <p className="text-[10px] text-gray-500 print:text-black">Date: {receiptOrder.date} {receiptOrder.time ? `• ${receiptOrder.time}` : ''}</p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <QRCodeSVG
                value={JSON.stringify({
                  orderId: receiptOrder.id,
                  store: receiptOrder.storeName,
                  customer: receiptOrder.customerName,
                  amount: receiptOrder.amount,
                  paymentMethod: receiptOrder.paymentMethod
                })}
                size={110}
              />
              <p className="text-[9px] text-gray-500 font-sans mt-2">Scan for warehouse verification</p>
            </div>
            <div className="border-t border-b border-gray-200 py-2 space-y-1">
              <div className="flex justify-between"><span>Customer:</span><span className="font-bold">{receiptOrder.customerName}</span></div>
              <div className="flex justify-between"><span>Payment:</span><span className="font-bold">{receiptOrder.paymentMethod}</span></div>
              {receiptOrder.scheduledSlot && receiptOrder.scheduledSlot !== 'ASAP (Fastest)' ? (
                <div className="flex justify-between"><span>Scheduled:</span><span className="font-bold">{receiptOrder.scheduledSlot}</span></div>
              ) : null}
              {receiptOrder.deliveryPin ? (
                <div className="flex justify-between"><span>Delivery PIN:</span><span className="font-bold tracking-[0.25em]">{receiptOrder.deliveryPin}</span></div>
              ) : null}
              {receiptOrder.itemCount ? (
                <div className="flex justify-between"><span>Items:</span><span className="font-bold">{receiptOrder.itemCount} pcs</span></div>
              ) : null}
              {receiptOrder.deliveryCharge ? (
                <div className="flex justify-between"><span>Delivery:</span><span className="font-bold">৳{receiptOrder.deliveryCharge}</span></div>
              ) : null}
              <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
                <span>Total Amount:</span><span>৳{receiptOrder.amount}</span>
              </div>
            </div>
            <button onClick={() => { window.print(); }} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-sans font-bold text-xs">
              Print Receipt
            </button>
          </div>
        </div>
      )}

      {/* ============ SUPPORT TICKET MODAL ============ */}
      {isNewTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateTicketSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-black text-sm text-gray-900">Open Customer Support Ticket</h3>
              <button type="button" onClick={() => setIsNewTicketModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Issue Category</label>
              <select value={ticketCategories.some(c => c.value === ticketCategory) ? ticketCategory : (ticketCategories[0]?.value || 'Order Delivery')} onChange={(e) => setTicketCategory(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none">
                {ticketCategories.length === 0 && <option value="Order Delivery">Order Delivery Delay</option>}
                {ticketCategories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Subject</label>
              <input type="text" required placeholder="Brief summary of the problem" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Detailed Description</label>
              <textarea required rows={3} placeholder="Describe your issue in detail..." value={ticketDetail} onChange={(e) => setTicketDetail(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none" />
            </div>
            <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md">Submit Ticket</button>
          </form>
        </div>
      )}

      {/* ============ TERMS / PRIVACY / REFUND POLICY MODAL ============ */}
      {policyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPolicyModal(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 text-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
              <h3 className="font-black text-sm text-gray-900">
                {policyModal === 'terms' ? T.terms : policyModal === 'privacy' ? T.privacy : T.refund}
              </h3>
              <button onClick={() => setPolicyModal(null)} className="cursor-pointer text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-gray-700 leading-relaxed max-h-80 overflow-y-auto pr-1">
              {policyModal === 'terms' && (
                <>
                  <p>{T.t1}</p>
                  <p>{T.t2}</p>
                  <p>{T.t3}</p>
                  <p>{T.t4}</p>
                  <p>{T.t5}</p>
                  <p>{T.t6}</p>
                </>
              )}
              {policyModal === 'privacy' && (
                <>
                  <p>{T.p1}</p>
                  <p>{T.p2}</p>
                  <p>{T.p3}</p>
                  <p>{T.p4}</p>
                </>
              )}
              {policyModal === 'refund' && (
                <>
                  <p>{T.r1}</p>
                  <p>{T.r2}</p>
                  <p>{T.r3}</p>
                  <p>{T.r4}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ PRODUCT DETAIL + REVIEWS MODAL ============ */}
      {detailProduct && (
        <div className="fixed inset-0 z-[70] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in duration-200">
            <div className="relative h-32 bg-white">
              <img src={detailProduct.image} alt={nm(detailProduct.name)} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5 pointer-events-none" />
              <button onClick={() => setDetailProduct(null)} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              <span className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${detailProduct.status === 'In Stock' ? 'bg-emerald-600 text-white' : detailProduct.status === 'Low Stock' ? 'bg-amber-500 text-white' : 'bg-gray-600 text-white'}`}>{statusLabel(detailProduct.status)}</span>
            </div>
            <div className="p-3.5 space-y-2.5">
              <div>
                <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">{detailStoreName} · {detailProduct.category}</p>
                <h3 className="text-sm font-black text-gray-900">{nm(detailProduct.name)}</h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-mono font-black text-emerald-700 text-base">৳{detailProduct.price} <span className="text-[11px] text-gray-400 font-normal">/ {detailProduct.unit}</span></p>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map(r => {
                      const agg = productReviews.filter(pr => pr.productId === detailProduct.id);
                      const avg = agg.length ? agg.reduce((s, x) => s + x.rating, 0) / agg.length : 4;
                      return <Star key={r} className={`w-3.5 h-3.5 ${r <= Math.round(avg) ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />;
                    })}
                    <span className="text-xs font-bold text-gray-700 ml-1">
                      {(() => { const agg = productReviews.filter(pr => pr.productId === detailProduct.id); return agg.length ? (agg.reduce((s, x) => s + x.rating, 0) / agg.length).toFixed(1) : '4.0'; })()}
                    </span>
                    <span className="text-[10px] text-gray-400">({productReviews.filter(pr => pr.productId === detailProduct.id).length} {T.reviews.toLowerCase()})</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{detailProduct.desc}</p>

              {/* Reviews */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">{T.reviews}</h4>
                  <span className="text-[10px] text-gray-500">{productReviews.filter(pr => pr.productId === detailProduct.id).length} reviews</span>
                </div>
                {productReviews.filter(pr => pr.productId === detailProduct.id).slice(0, 3).map(rev => (
                  <div key={rev.id} className="bg-gray-50 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-900 flex items-center space-x-1.5">
                        <span className={`w-5 h-5 rounded-full ${hashColor(rev.user)} text-white text-[9px] font-bold flex items-center justify-center`}>{initialsOf(rev.user)}</span>
                        {rev.user}
                      </span>
                      <span className="text-[9px] text-gray-400">{rev.date}</span>
                    </div>
                    <div className="flex space-x-0.5">
                      {[1, 2, 3, 4, 5].map(r => <Star key={r} className={`w-3 h-3 ${r <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />)}
                    </div>
                    <p className="text-[11px] text-gray-600">{rev.comment}</p>
                  </div>
                ))}
                {productReviews.filter(pr => pr.productId === detailProduct.id).length === 0 && (
                  <p className="text-[11px] text-gray-400">No reviews yet — be the first to review this product.</p>
                )}

                {/* Write review */}
                <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-700">{T.writeReview}</p>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setNewReviewRating(r)} className="cursor-pointer">
                        <Star className={`w-5 h-5 ${r <= newReviewRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300 hover:text-amber-300'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Share your experience with this product..."
                    className="w-full p-2 border border-gray-300 rounded-xl text-[11px] outline-none focus:border-emerald-500 resize-none"
                  />
                  <button
                    onClick={() => {
                      if (!newReviewText.trim()) { showToast('Write a short review first', 'info'); return; }
                      setProductReviews(prev => [{
                        id: `REV-${Date.now().toString().slice(-4)}`, productId: detailProduct.id,
                        user: customerProfile.name, rating: newReviewRating, comment: newReviewText.trim(), date: 'Just now'
                      }, ...prev]);
                      setNewReviewText('');
                      setNewReviewRating(5);
                      showToast('Review submitted — thank you!', 'success');
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {T.submitReview}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { handleAddToCart(detailProduct); }}
                disabled={detailProduct.status === 'Out of Stock'}
                className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Plus className="w-3.5 h-3.5" /><span>{detailProduct.status === 'Out of Stock' ? (lang === 'bn' ? 'অনুপলব্ধ' : 'Unavailable') : T.addToCart} · ৳{detailProduct.price}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ CART DRAWER ============ */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/30 backdrop-blur-sm flex justify-end">
          <div onClick={() => setIsCartDrawerOpen(false)} className="absolute inset-0" />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" /><span>{T.cartDrawer}</span>
                <span className="text-[10px] text-gray-400 font-bold">({cartCount} {T.items.toLowerCase()})</span>
              </h3>
              <button onClick={() => setIsCartDrawerOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                  <ShoppingCart className="w-12 h-12 text-gray-300" />
                  <p className="text-xs font-bold text-gray-700">{T.emptyCart}</p>
                  <p className="text-[10px] text-gray-400">{T.emptyCartSub}</p>
                  <button onClick={() => { setIsCartDrawerOpen(false); setActiveNav('Orders'); }} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer">{T.browseStores}</button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                    <img src={item.product.image} alt={nm(item.product.name)} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{nm(item.product.name)}</p>
                      {item.note && <p className="text-[9px] text-amber-600 font-bold truncate mt-0.5">✎ {item.note}</p>}
                      <p className="text-[10px] text-gray-500">৳{item.product.price} / {item.product.unit}</p>
                      <div className="flex items-center space-x-1.5 mt-1 border border-gray-300 rounded-lg bg-white w-fit px-1.5 py-0.5">
                        <button onClick={() => handleUpdateQty(item.product.id, -1)} className="text-gray-500 cursor-pointer"><Minus className="w-3 h-3" /></button>
                        <span className="font-mono font-bold text-[11px] text-gray-800 w-4 text-center">{item.quantity}</span>
                        <button onClick={() => handleAddToCart(item.product)} className="text-gray-500 cursor-pointer"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <span className="font-mono font-black text-gray-900 text-xs">৳{item.product.price * item.quantity}</span>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-bold">{T.grandTotal}</span>
                  <span className="font-mono font-black text-emerald-700">৳{cartGrandTotal}</span>
                </div>
                <button onClick={() => {
                  setIsCartDrawerOpen(false);
                  const st = selectedStore || (cart[0] ? syncedStores.find(s => s.catalog.some(c => c.id === cart[0].product.id)) || null : null);
                  if (st) setSelectedStore(st); else setActiveNav('Orders');
                  showToast(st ? T.goToCart : T.browseStores, 'info');
                }} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                  {T.checkout}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ RIDER CHAT MODAL ============ */}
      {chatOrderId && (
        <div className="fixed inset-0 z-[80] bg-slate-900/35 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 flex flex-col max-h-[80vh] animate-in fade-in duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {(() => {
                  const ord = orders.find(o => o.id === chatOrderId);
                  const drv = ord ? liveDriverOf(ord) : null;
                  return (
                    <>
                      <div className={`w-9 h-9 rounded-full ${hashColor(drv ? drv.name : 'Rider')} text-white font-bold flex items-center justify-center text-[11px]`}>
                        {initialsOf(drv ? drv.name : 'Rider')}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900">{drv ? drv.name : 'Rider'} · {ord?.storeName}</p>
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span>Online · replies instantly</span></p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button onClick={() => setChatOrderId(null)} className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px]">
              {(chatMessages[chatOrderId] || []).length === 0 && (
                <p className="text-[11px] text-gray-400 text-center py-6">Start a conversation with your courier rider.</p>
              )}
              {(chatMessages[chatOrderId] || []).map(m => (
                <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[11px] shadow-sm ${m.from === 'me' ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                    <p>{m.text}</p>
                    <p className={`text-[8px] mt-0.5 ${m.from === 'me' ? 'text-emerald-200' : 'text-gray-400'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100 flex items-center space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                placeholder={lang === 'bn' ? 'বার্তা লিখুন...' : 'Type a message...'}
                className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500"
              />
              <button onClick={sendChatMessage} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ RE-SUBMIT PAYMENT MODAL (held orders) ============ */}
      {reSubmitOrder && (
        <div className="fixed inset-0 z-[80] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto"><Send className="w-6 h-6" /></div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Re-send Payment for Review</h3>
              <p className="text-xs text-gray-500 mt-1">Order <span className="font-mono font-bold">#{reSubmitOrder.id}</span> · {reSubmitOrder.storeName} · {reSubmitOrder.paymentMethod}</p>
              <p className="text-[10px] text-purple-600 mt-1 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1">Your payment was rejected. Re-enter the correct details + upload a fresh screenshot so we can re-verify it.</p>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sender Number (your bKash/Nagad/Upay/Rocket)</label>
                <input type="text" value={reSub.sender} onChange={(e) => setReSub(s => ({ ...s, sender: e.target.value }))} placeholder="01XXXXXXXXX" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">TrxID</label>
                <input type="text" value={reSub.trxId} onChange={(e) => setReSub(s => ({ ...s, trxId: e.target.value }))} placeholder="e.g. 8ETRGRGD" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Amount (৳)</label>
                  <input type="number" value={reSub.amount} readOnly className="w-full p-2.5 border border-gray-300 rounded-xl outline-none bg-gray-50 text-gray-700 font-bold" />
                  <p className="text-[9px] text-gray-400 mt-1">Must match order total ৳{reSubmitOrder?.amount}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Last 4 digits</label>
                  <input type="text" value={reSub.last4} onChange={(e) => setReSub(s => ({ ...s, last4: e.target.value }))} placeholder="5678" maxLength={4} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment receipt / screenshot</label>
                <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-purple-400 hover:bg-purple-50 cursor-pointer text-[11px] font-bold">
                  <Camera className="w-4 h-4" /><span>{reSub.receipt ? 'Change receipt' : 'Upload new screenshot'}</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReSubFile} />
                </label>
                {reSub.receipt && (
                  <img src={reSub.receipt} alt="receipt" className="mt-2 w-full h-24 object-cover rounded-xl border border-gray-200" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={submitReSubmit} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer">
                Send for Re-Review
              </button>
              <button onClick={() => setReSubmitOrder(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer">{T.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ ORDER REPORT MODAL ============ */}
      {reportOrder && (
        <div className="fixed inset-0 z-[80] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto"><AlertCircle className="w-6 h-6" /></div>
            <div>
              <h3 className="text-sm font-black text-gray-900">{reportOrder.paymentStatus === 'Rejected' ? 'Report payment issue' : 'Report an issue'}</h3>
              <p className="text-xs text-gray-500 mt-1">Order <span className="font-mono font-bold">#{reportOrder.id}</span> · {reportOrder.storeName}</p>
            </div>
            <div className="space-y-1.5">
              {(reportOrder.paymentStatus === 'Rejected'
                ? ['Payment rejected — money not credited', 'I sent the money — please re-check', 'Wrong transaction ID entered', 'Amount mismatched', 'Receipt / screenshot not visible', 'Send Money failed', 'Other']
                : ['Wrong item received', 'Missing item', 'Poor food quality', 'Late delivery', 'Damaged packaging', 'Overcharged', 'Other']).map(r => (
                <button key={r} onClick={() => setReportReason(r)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border ${reportReason === r ? 'bg-red-50 border-red-400 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                  <span>{r}</span>{reportReason === r && <Check className="w-3.5 h-3.5 text-red-500" />}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              placeholder={reportOrder.paymentStatus === 'Rejected' ? 'Add details (optional) — e.g. TrxID 8ETRGRGD, sent at 08:53 AM…' : 'Add details (optional) — e.g. ordered 2 but got 1…'}
              className="w-full p-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:border-red-500 resize-none"
            />
            <div className="space-y-2">
              <button onClick={() => { if (onReport) onReport({ orderId: reportOrder.id, reason: reportReason, note: reportNote }); setReportOrder(null); showToast(`Report submitted for #${reportOrder.id} — admin notified ✓`, 'success'); }} className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl transition-all cursor-pointer">
                Submit Report to Admin
              </button>
              <button onClick={() => setReportOrder(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer">{T.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STORE RATING MODAL ============ */}
      {rateOrder && (
        <div className="fixed inset-0 z-[80] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-center animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto"><Star className="w-6 h-6 fill-amber-400 text-amber-400" /></div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Rate {rateOrder.storeName}</h3>
              <p className="text-xs text-gray-500 mt-1">How was your experience with this store?</p>
            </div>
            <div className="flex items-center justify-center space-x-1.5">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => setRateVal(r)} className="cursor-pointer">
                  <Star className={`w-8 h-8 ${r <= rateVal ? 'text-amber-500 fill-amber-500' : 'text-gray-300 hover:text-amber-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={rateComment}
              onChange={(e) => setRateComment(e.target.value)}
              placeholder="Share what you liked (optional)..."
              className="w-full p-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:border-emerald-500 resize-none"
            />
            <div className="space-y-2">
              <button onClick={submitStoreRating} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all cursor-pointer">
                Submit {rateVal}-Star Rating
              </button>
              <button onClick={() => setRateOrder(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer">{T.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ RIDER RATING MODAL ============ */}
      {rateRiderOrder && (
        <div className="fixed inset-0 z-[82] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><Truck className="w-6 h-6" /></div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Rate Your Rider</h3>
              <p className="text-xs text-gray-500 mt-1">
                {(() => { const d = liveDriverOf(rateRiderOrder); return d ? `How was ${d.name}'s delivery service?` : 'How was your delivery experience?'; })()}
              </p>
            </div>
            <div className="flex items-center justify-center space-x-1.5">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => setRiderRateVal(r)} className="cursor-pointer">
                  <Star className={`w-9 h-9 ${r <= riderRateVal ? 'text-emerald-500 fill-emerald-500' : 'text-gray-300 hover:text-emerald-300'}`} />
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 font-bold">{riderRateVal}-star rating</p>
            <div className="space-y-2">
              <button onClick={submitRiderRating} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer">
                Submit {riderRateVal}-Star Rating
              </button>
              <button onClick={() => setRateRiderOrder(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer">{T.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ CANCEL ORDER CONFIRM ============ */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-[80] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-center animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto"><Trash2 className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-black text-gray-900">{T.confirmCancelTitle}</h3>
              <p className="text-xs text-gray-500 mt-1">{T.confirmCancelBody}</p>
              <p className="text-[10px] font-mono text-gray-400 mt-1">Order #{cancelConfirmId}</p>
            </div>
            <div className="space-y-2">
              <button onClick={confirmCancelOrder} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">{T.yesCancel}</button>
              <button onClick={() => setCancelConfirmId(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer">{T.keepOrder}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ ADD MONEY MODAL (real flow: send to personal number + admin verify) ============ */}
      {addMoneyOpen && (
        <div className="fixed inset-0 z-[84] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-3 text-xs animate-in fade-in duration-200 my-auto max-h-[88dvh] overflow-y-auto overflow-x-hidden">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">{addMoneyStep === 'send' ? T.sendMoneyTo : addMoneyStep === 'pending' ? T.addMoneyPendingTitle : T.addMoney}</h3>
                  <p className="text-[9px] text-gray-400">Current balance: ৳{walletBalance.toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setAddMoneyOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            {addMoneyStep === 'method' ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Amount (৳)</label>
                  <input
                    type="number"
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-900 outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['bKash', 'Nagad', 'Upay', 'Rocket', 'Card'] as const).map((m) => {
                      const isCard = m === 'Card';
                      const active = addMoneyMethod === m;
                      return (
                        <button
                          key={m}
                          onClick={() => !isCard && setAddMoneyMethod(m)}
                          disabled={isCard}
                          title={isCard ? 'Card top-up coming soon' : ''}
                          className={`py-2.5 px-2 rounded-xl border flex items-center justify-center space-x-1.5 transition-all ${isCard
                            ? 'border-dashed border-gray-300 bg-gray-50 text-gray-400 opacity-60 cursor-not-allowed'
                            : active ? 'border-emerald-600 bg-emerald-50 shadow-xs' : 'border-gray-200 bg-white hover:bg-gray-50 cursor-pointer'}`}
                        >
                          {m === 'bKash' ? <BkashLogo className="w-5 h-5" /> : m === 'Nagad' ? <NagadLogo className="w-5 h-5" /> : m === 'Upay' ? <UpayLogo className="w-5 h-5" /> : m === 'Rocket' ? <RocketLogo className="w-5 h-5" /> : <CreditCard className="w-4 h-4" />}
                          <span className={`font-black text-[10px] ${active ? 'text-emerald-800' : isCard ? 'text-gray-400' : 'text-gray-600'}`}>
                            {m === 'bKash' ? 'bKash' : m === 'Nagad' ? 'Nagad' : m === 'Upay' ? 'Upay' : m === 'Rocket' ? 'Rocket' : 'Card · Soon'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {addMoneyMethod !== 'Card' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{addMoneyMethod} Account Number</label>
                    <input
                      type="tel"
                      value={addMoneyPhone}
                      onChange={(e) => setAddMoneyPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-900 outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Card Holder Name</label>
                      <input type="text" value={addMoneyCard.name} onChange={(e) => setAddMoneyCard({ ...addMoneyCard, name: e.target.value })} placeholder="Name on card" className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-900 outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Card Number</label>
                      <input type="text" value={addMoneyCard.number} onChange={(e) => setAddMoneyCard({ ...addMoneyCard, number: e.target.value })} placeholder="1234 5678 9012 3456" className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-900 outline-none focus:border-emerald-500 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Expiry</label>
                        <input type="text" value={addMoneyCard.expiry} onChange={(e) => setAddMoneyCard({ ...addMoneyCard, expiry: e.target.value })} placeholder="MM/YY" className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-900 outline-none focus:border-emerald-500 font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">CVV</label>
                        <input type="password" value={addMoneyCard.cvv} onChange={(e) => setAddMoneyCard({ ...addMoneyCard, cvv: e.target.value })} placeholder="•••" className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-gray-900 outline-none focus:border-emerald-500 font-mono" />
                      </div>
                    </div>
                  </div>
                )}

                {addMoneyError && <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-bold">{addMoneyError}</p>}

                <button onClick={sendAddMoneyOtp} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer">
                  Continue
                </button>
              </>
            ) : addMoneyStep === 'send' ? (() => {
              const wk = addMoneyMethod as WalletKey;
              const cfg = addMoneyMethod === 'Card' ? { name: 'NexaGo Pay', numbers: ['Bank transfer to card'] } : (walletConfig[wk] || DEFAULT_WALLETS[wk]);
              const mwList = cfg.numbers && cfg.numbers.length ? cfg.numbers : DEFAULT_WALLETS[wk]?.numbers || [];
              const mwName = cfg.name || 'NexaGo Pay';
              const mw = mwList[0] || '01712-345678';
              const meta = addMoneyMethod === 'Card' ? { gradient: 'from-blue-600 to-blue-800', btn: 'bg-blue-600 hover:bg-blue-700', trxPlaceholder: 'CARD-XXXXXXXX' } : WALLET_META[wk];
              const mm = Math.floor(addMoneyLeft / 60);
              const ss = addMoneyLeft % 60;
              return (
              <div className="space-y-3">
                {/* Personal number card */}
                <div className={`rounded-2xl border p-3 text-white relative overflow-hidden bg-gradient-to-br ${meta.gradient}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-9 h-9 rounded-xl overflow-hidden shadow">{addMoneyMethod === 'bKash' ? <BkashLogo className="w-9 h-9" /> : addMoneyMethod === 'Nagad' ? <NagadLogo className="w-9 h-9" /> : addMoneyMethod === 'Upay' ? <UpayLogo className="w-9 h-9" /> : addMoneyMethod === 'Rocket' ? <RocketLogo className="w-9 h-9" /> : <CreditCard className="w-9 h-9 text-white bg-blue-600 rounded-lg p-1.5" />}</div>
                      <div>
                        <p className="font-black text-sm leading-tight">{mwName} · {addMoneyMethod === 'Card' ? 'Bank' : `${addMoneyMethod} Wallet`}</p>
                        <p className="text-[10px] text-white/80">{T.sendMoneyTo}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/25 text-[9px] font-black">Send Money</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <p className="font-mono text-lg font-black tracking-wider">{addMoneyMethod === 'Card' ? `**** ${addMoneyCard.number.replace(/\D/g, '').slice(-4)}` : mw}</p>
                    {addMoneyMethod !== 'Card' && (
                      <button
                        onClick={() => copyText(mw, `${addMoneyMethod} number`)}
                        className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-[10px] font-black flex items-center space-x-1 hover:bg-gray-100 transition-colors cursor-pointer shadow shrink-0"
                      >
                        <Copy className="w-3 h-3" /><span>{T.copyNumber}</span>
                      </button>
                    )}
                  </div>
                  {addMoneyMethod !== 'Card' && mwList.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-white/70 font-bold uppercase">Other numbers:</span>
                      {mwList.slice(1).map(n => (
                        <button
                          key={n}
                          onClick={() => copyText(n, `${addMoneyMethod} number`)}
                          className="px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <Copy className="w-2.5 h-2.5" /><span className="font-mono">{n}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Countdown */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${addMoneyExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <span className="font-bold flex items-center space-x-1"><Clock className="w-3.5 h-3.5" /><span>{addMoneyExpired ? T.sessionExpired : T.completeWithin}</span></span>
                  <span className="font-mono font-black text-sm">{addMoneyExpired ? '00:00' : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`}</span>
                </div>

                {addMoneyExpired ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-gray-500 text-center py-2">{T.expiredMsg}</p>
                    <button
                      onClick={() => { setAddMoneyStep('method'); setAddMoneyError(''); }}
                      className="w-full py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      {T.close}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.yourNumber?.replace('{m}', addMoneyMethod === 'Card' ? 'Card' : addMoneyMethod)}</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={addMoneySender}
                        onChange={(e) => setAddMoneySender(e.target.value.replace(/[^0-9-]/g, ''))}
                        placeholder="01XXX-XXXXXX"
                        maxLength={13}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.last4Label?.replace('{m}', addMoneyMethod === 'Card' ? 'Card' : addMoneyMethod)}</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={addMoneyLast4}
                        onChange={(e) => setAddMoneyLast4(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        placeholder="••••"
                        maxLength={4}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono tracking-[0.3em] text-center text-sm font-black outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">{T.last4Hint?.replace('{m}', addMoneyMethod === 'Card' ? 'Card' : addMoneyMethod)}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.sentAmount?.replace('{x}', String(parseFloat(addMoneyAmount) || 0))}</label>
                      <input
                        type="number"
                        min={0}
                        value={addMoneyAmount}
                        onChange={(e) => setAddMoneyAmount(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono outline-none focus:border-emerald-500"
                      />
                      <p className={`text-[10px] mt-1 font-bold ${Math.abs((parseFloat(addMoneyAmount) || 0) - (parseFloat(addMoneyAmount) || 0)) <= 0.01 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {T.exactMatch}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.trxIdLabel?.replace('{m}', addMoneyMethod === 'Card' ? 'Card' : addMoneyMethod)}</label>
                      <input
                        type="text"
                        value={addMoneyTrxId}
                        onChange={(e) => setAddMoneyTrxId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
                        placeholder={meta.trxPlaceholder}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2 font-mono tracking-wider uppercase outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">{T.trxIdHint}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">{T.receiptLabel}</label>
                      <div className="flex items-center space-x-2">
                        <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-600 font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                          <Camera className="w-4 h-4" /><span>{addMoneyReceipt ? T.changeReceipt : T.uploadReceipt}</span>
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            if (file.size > MAX_RECEIPT_BYTES) { showToast('Screenshot too large — max 2 MB', 'info'); return; }
                            const reader = new FileReader();
                            reader.onload = () => setAddMoneyReceipt(String(reader.result || ''));
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        {addMoneyReceipt && (
                          <button onClick={() => setAddMoneyReceipt('')} className="px-2.5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer" title="Remove receipt">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {addMoneyReceipt && (
                        <img src={addMoneyReceipt} alt="receipt" className="mt-2 w-full h-20 object-cover rounded-xl border border-gray-200" />
                      )}
                    </div>
                    {addMoneyError && <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-bold">{addMoneyError}</p>}
                    <button
                      onClick={confirmAddMoney}
                      className={`w-full py-2.5 text-white font-black rounded-xl shadow-md transition-all cursor-pointer ${addMoneyMethod === 'Card' ? 'bg-blue-600 hover:bg-blue-700' : WALLET_META[wk].btn}`}
                    >
                      {T.submitVerify} ৳{parseFloat(addMoneyAmount).toLocaleString()}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center flex items-center justify-center space-x-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /><span>{T.verificationNote}</span></p>
                  </div>
                )}
              </div>
              );
            })() : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
                  <p className="text-xs font-black text-amber-800">{T.addMoneyPendingTitle}</p>
                  <p className="text-[10px] text-amber-700">৳{parseFloat(addMoneyAmount).toLocaleString()} {addMoneyMethod} request submitted. The admin checks the money received on the personal number and adds it to your wallet shortly.</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] text-gray-500 font-bold">{T.transactionStatus}</p>
                  <p className="text-[11px] text-gray-700">{T.pendingWalletNote}</p>
                </div>
                <button onClick={() => { setAddMoneyOpen(false); setAddMoneyStep('method'); setAddMoneyError(''); }} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer">
                  {T.done}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ CUSTOMIZE PRODUCT MODAL (product-specific options) ============ */}
      {customizeProd && (() => {
        const opts = getProductCustomizations(customizeProd);
        const wChoices = opts.find(o => o.key === 'weight')?.choices || [];
        const total = computeCustomizeTotal();
        return (
        <div className="fixed inset-0 z-[86] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[90vh]">
            <div className="relative h-40 bg-gray-100 shrink-0">
              <img src={customizeProd.image} alt={nm(customizeProd.name)} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <button onClick={() => setCustomizeProd(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-gray-700 flex items-center justify-center hover:bg-white cursor-pointer shadow-md"><X className="w-4 h-4" /></button>
              <div className="absolute bottom-3 left-4 right-4">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-600 text-white">{customizeProd.category}</span>
                <h3 className="text-lg font-black text-white mt-1 leading-tight">{nm(customizeProd.name)}</h3>
                <p className="text-xs text-white/90"><span className="font-mono font-black">৳{customizeProd.price}</span> / {customizeProd.unit}</p>
              </div>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <p className="text-[11px] text-gray-500">{customizeProd.desc}</p>

              {/* Weight/volume selector */}
              {wChoices.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">{opts.find(o => o.key === 'weight')!.label}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {wChoices.map((ch) => (
                      <button
                        key={ch.label}
                        onClick={() => setCustomizeWeight(ch.multiplier)}
                        className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                          customizeWeight === ch.multiplier ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="block">{ch.label}</span>
                        <span className="block text-[10px] text-gray-500 font-mono">৳{ch.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Quantity</label>
                <div className="flex items-center space-x-3 border border-gray-300 rounded-xl w-fit px-2 py-1.5 bg-white">
                  <button onClick={() => setCustomizeQty(q => Math.max(1, q - 1))} className="p-1 text-gray-600 hover:text-emerald-600 cursor-pointer"><Minus className="w-4 h-4" /></button>
                  <span className="font-mono font-black text-sm text-gray-900 w-6 text-center">{customizeQty}</span>
                  <button onClick={() => setCustomizeQty(q => Math.min(customizeProd.stock || 99, q + 1))} className="p-1 text-gray-600 hover:text-emerald-600 cursor-pointer"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Extra add-ons */}
              <div>
                <label className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3 cursor-pointer">
                  <span className="flex items-center space-x-2 text-xs font-bold text-emerald-800">
                    <Sparkles className="w-4 h-4 text-amber-500" /><span>Extra portion / add-ons</span>
                  </span>
                  <button onClick={() => setCustomizeExtra(e => !e)} className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${customizeExtra ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${customizeExtra ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </div>

              {/* Special instructions */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Special instructions</label>
                <textarea
                  value={customizeNote}
                  onChange={(e) => setCustomizeNote(e.target.value)}
                  placeholder="e.g. less spicy, no onions, extra sauce…"
                  rows={2}
                  className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs text-gray-900 outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-xl p-3">
                <span className="font-bold text-gray-700">Total</span>
                <div className="text-right">
                  {wChoices.length > 0 && (
                    <span className="text-[10px] text-gray-500 font-mono block">{wChoices.find(c => c.multiplier === customizeWeight)?.label || '1'} × {customizeQty} qty</span>
                  )}
                  <span className="font-mono font-black text-emerald-700 text-lg">৳{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={handleCustomizeAdd} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                  Add to Cart — ৳{total.toLocaleString()}
                </button>
                <button onClick={() => setCustomizeProd(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer">{T.cancel}</button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-xs text-gray-500 hidden md:block">
        <p>© 2026 Smart Shop E-Commerce Platform by NexaGo BD. All rights reserved.</p>
      </footer>
    </div>
  );
};

/* ============ CUSTOMER AUTH SCREEN (premium glass) ============ */
const CustomerAuthScreen: React.FC<{
  lang: Lang;
  dark: boolean;
  email: string;
  name: string;
  phone: string;
  customerId: string;
  onLangChange: (lang: Lang) => void;
  onDarkChange: (dark: boolean) => void;
  onUpdateProfile: (patch: Partial<{ name: string; email: string; phone: string }>) => void;
  onVerified: (info?: { customerId?: string; name?: string; email?: string; phone?: string; password?: string; pin?: string }) => void;
  showToast?: (msg: string, type?: string) => void;
}> = ({ lang, dark, email, name, phone, customerId, onLangChange, onDarkChange, onUpdateProfile, onVerified, showToast }) => {
  const A = {
    welcome: lang === 'bn' ? 'স্মার্ট শপে স্বাগতম' : 'Welcome to Smart Shop',
    oneAccount: lang === 'bn' ? 'সব ডিভাইসের জন্য এক স্থায়ী অ্যাকাউন্ট — Gmail + ফোন যুক্ত, অর্ডার ও ওয়ালেট ডাটা হারাবে না।' : 'One permanent account for all your devices — Gmail + phone linked, order & wallet data never lost.',
    createAccount: lang === 'bn' ? 'অ্যাকাউন্ট খুলুন' : 'Create Account',
    signIn: lang === 'bn' ? 'সাইন ইন' : 'Sign In',
    continueGoogle: lang === 'bn' ? 'Google দিয়ে চালিয়ে যান' : 'Continue with Google',
    connectingGoogle: lang === 'bn' ? 'Google সংযোগ হচ্ছে…' : 'Connecting to Google…',
    or: lang === 'bn' ? 'অথবা' : 'or',
    password: lang === 'bn' ? 'পাসওয়ার্ড' : 'Password',
    otpLogin: lang === 'bn' ? 'OTP লগইন' : 'OTP Login',
    gmail: lang === 'bn' ? 'Gmail ঠিকানা' : 'Gmail Address',
    gmailOrId: lang === 'bn' ? 'Gmail বা Customer ID' : 'Gmail or Customer ID',
    yourPassword: lang === 'bn' ? 'আপনার পাসওয়ার্ড' : 'Your password',
    sendOtp: lang === 'bn' ? 'Gmail-এ OTP পাঠান' : 'Send OTP to Gmail',
    sending: lang === 'bn' ? 'পাঠানো হচ্ছে…' : 'Sending…',
    signingIn: lang === 'bn' ? 'সাইন ইন হচ্ছে…' : 'Signing in…',
    signInPassword: lang === 'bn' ? 'পাসওয়ার্ড দিয়ে সাইন ইন' : 'Sign In with Password',
    forgotPassword: lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?',
    sendLoginOtp: lang === 'bn' ? 'লগইন OTP পাঠান' : 'Send Login OTP',
    sendingOtp: lang === 'bn' ? 'OTP পাঠানো হচ্ছে…' : 'Sending OTP…',
    customerOtpLogin: lang === 'bn' ? 'কাস্টমার OTP লগইন' : 'Customer OTP Login',
    loginWithOtp: lang === 'bn' ? 'OTP দিয়ে লগইন' : 'Login with OTP',
    resendOtp: lang === 'bn' ? 'OTP আবার পাঠান' : 'Resend Login OTP',
    backSignIn: lang === 'bn' ? '← সাইন ইনে ফিরে যান' : '← Back to Sign In',
    fullName: lang === 'bn' ? 'পুরো নাম' : 'Full Name',
    phoneNumber: lang === 'bn' ? 'ফোন নম্বর' : 'Phone Number',
    confirmPassword: lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password',
    createMyAccount: lang === 'bn' ? 'আমার অ্যাকাউন্ট খুলুন' : 'Create My Account',
    creating: lang === 'bn' ? 'তৈরি হচ্ছে…' : 'Creating…',
  };
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'form' | 'otp' | 'loginOtp' | 'details' | 'done'>('form');
  const [emailField, setEmailField] = useState(email || '');
  const [nameField, setNameField] = useState(name || '');
  const [phoneField, setPhoneField] = useState(phone || '');
  const [passField, setPassField] = useState('');
  const [passConfirm, setPassConfirm] = useState('');

  // Google account chooser (Supabase OAuth). After the user picks a Gmail on
  // Google, we read the chosen email and auto-register/auto-login the customer
  // (permanent ID linked to that Gmail — no password needed on this device).
  const supabase = supabaseClient();
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;
  const [googleBusy, setGoogleBusy] = useState(false);

  // Google OAuth callback: #access_token in URL → read session → get chosen
  // Gmail → auto-register the customer (adopts permanent ID).
  useEffect(() => {
    const sb = supabaseRef.current;
    if (!sb) return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('oauthRole') !== 'customer') return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (!params.get('access_token')) return;
    (async () => {
      try {
        const { data, error } = await sb.auth.getSession();
        if (error || !data.session) throw error || new Error('no session');
        const gmail = String(data.session.user.email || '').trim().toLowerCase();
        if (!gmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail)) throw new Error('no email');
        const emailPrefix = safeText(gmail).split('@')[0] || 'customer';
        const res = await customerRegister({ name: nameField.trim() || emailPrefix, email: gmail, phone: phoneField.trim(), customerId, balance: 0 });
        if (!res || !res.customer) throw new Error('register failed');
        onUpdateProfile({ name: (res.customer.name || emailPrefix), email: gmail, phone: res.customer.phone || phoneField });
        showToast?.('Signed in with Google — welcome!', 'success');
        onVerified({ customerId: res.customer.customerId, name: res.customer.name, email: gmail, phone: res.customer.phone || phoneField });
      } catch {
        showToast?.('Google sign-in could not be completed. Try again or use the form below.', 'info');
      } finally {
        setGoogleBusy(false);
      }
      searchParams.delete('oauthRole');
      const cleanSearch = searchParams.toString();
      window.history.replaceState(null, '', window.location.pathname + (cleanSearch ? `?${cleanSearch}` : ''));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doGoogleLogin = () => {
    if (!supabase) {
      showToast?.('Google sign-in is not configured on this server yet. Use the form below.', 'info');
      return;
    }
    setGoogleBusy(true);
    const params = new URLSearchParams(window.location.search);
    params.set('oauthRole', 'customer');
    const redirectTo = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
      .catch(() => {
        setGoogleBusy(false);
        showToast?.('Google sign-in unavailable right now. Try again or use the form below.', 'info');
      });
  };

  const [otpCode, setOtpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [doneCard, setDoneCard] = useState<{ customerId: string; email: string; phone: string; password: string; pin: string } | null>(null);

  const emailOk = () => /^[\w.+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(emailField.trim());
  const loginIdOk = () => emailOk() || /^NEX\d{6,}$/i.test(emailField.trim());
  const phoneOk = () => !phoneField.trim() || /^\+?88?01\d{9}$/.test(phoneField.trim().replace(/[^0-9]/g, ''));
  const genPin = () => String(Math.floor(100000 + Math.random() * 900000));

  // Password login.
  const doLogin = () => {
    if (!loginIdOk()) { setError('Enter your Gmail or permanent Customer ID.'); return; }
    if (!passField) { setError('Enter your password.'); return; }
    setBusy(true);
    setError('');
    customerLogin({ identifier: emailField.trim(), password: passField })
      .then((res) => {
        if (!res || !res.customer) { setError('Wrong email or password. Try again, or use Forgot Password.'); return; }
        onUpdateProfile({ name: res.customer.name || nameField, email: res.customer.email || emailField, phone: res.customer.phone || phoneField });
        showToast?.('Welcome back! Logged in with password.', 'success');
        onVerified({ customerId: res.customer.customerId, name: res.customer.name, email: res.customer.email, phone: res.customer.phone });
      })
      .catch(() => setError('Password milche na. Forgot Password diye Gmail OTP verify kore new password set korun.'))
      .finally(() => setBusy(false));
  };

  const sendLoginOtp = () => {
    if (!loginIdOk()) { setError('Enter your Gmail or permanent Customer ID.'); return; }
    setBusy(true);
    setError('');
    const target = emailField.trim();
    setSentTo(target);
    customerOtpSend({ identifier: target })
      .then((res) => {
        if (!res) { setError('Customer account found holo na. Gmail/Customer ID check korun.'); return; }
        setStep('loginOtp');
        showToast?.(`OTP sent to ${res.sentTo || 'your Gmail'}.`, 'success');
      })
      .catch(() => setError('OTP pathate parlam na. Try again.'))
      .finally(() => setBusy(false));
  };

  const verifyLoginOtp = () => {
    if (!otpCode.trim()) { setError('Enter the 6-digit code from your Gmail.'); return; }
    setBusy(true);
    setError('');
    customerOtpLogin({ identifier: sentTo, code: otpCode })
      .then((res) => {
        if (!res || !res.customer) { setError('OTP milche na ba expire hoye geche.'); return; }
        onUpdateProfile({ name: res.customer.name || nameField, email: res.customer.email || emailField, phone: res.customer.phone || phoneField });
        setOtpCode('');
        showToast?.('OTP verified — logged in successfully.', 'success');
        onVerified({ customerId: res.customer.customerId, name: res.customer.name, email: res.customer.email, phone: res.customer.phone });
      })
      .catch(() => setError('OTP login failed. Code check kore abar try korun.'))
      .finally(() => setBusy(false));
  };

  // Signup step 1: only the Gmail + OTP. Name/phone/password come on the next
  // page after the email is verified.
  const sendOtp = () => {
    if (!emailOk()) { setError('Enter a valid Gmail address.'); return; }
    setBusy(true);
    setError('');
    const target = emailField.trim().toLowerCase();
    setSentTo(target);
    securityApi('/otp-signup-send', { email: target })
      .then(() => setStep('otp'))
      .catch((err) => setError(String(err?.message || 'Could not send the code. Try again.')))
      .finally(() => setBusy(false));
  };

  // Verify the OTP, then move to the details page (name/phone/password).
  const verifyOtp = () => {
    if (!otpCode.trim()) { setError('Enter the 6-digit code from your email.'); return; }
    setBusy(true);
    setError('');
    const target = sentTo;
    securityApi('/otp-signup-verify', { email: target, code: otpCode })
      .then(() => {
        setOtpCode('');
        setStep('details');
        showToast?.('Gmail verified — now set up your account details.', 'success');
      })
      .catch((err) => setError(String(err?.message || 'Invalid or expired code.')))
      .finally(() => setBusy(false));
  };

  // Signup step 2: details page after OTP passed. Creates the account — the
  // server links the permanent ID with the Gmail/phone (one ID per Gmail/phone,
  // never duplicated).
  const createAccount = async () => {
    if (!nameField.trim()) { setError('Enter your full name.'); return; }
    if (!phoneOk()) { setError('Enter a valid Bangladeshi phone number.'); return; }
    if (passField.length < 6) { setError('Set a password of at least 6 characters.'); return; }
    if (passField !== passConfirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    setError('');
    const target = sentTo;
    try {
      // One-account rule: reject if the same Gmail/phone already belongs to
      // another customer/driver/store-admin/staff identity.
      const takenCheck = await identityCheck({ phone: phoneField.trim(), email: target, excludeId: customerId, excludeRole: 'customer' }).catch(() => null);
      if (takenCheck && takenCheck.taken) {
        setError('This Gmail or phone already belongs to another account. One account per Gmail/phone — please log in with your existing account.');
        return;
      }
      const res = await customerRegister({ name: nameField.trim(), phone: phoneField.trim(), email: target, customerId, password: passField, balance: 0 });
      if (!res || !res.customer) { setError('Account could not be created. Please try again.'); return; }
      const newId = res.customer.customerId || customerId;
      const pin = genPin();
      onUpdateProfile({ name: nameField.trim(), email: target, phone: phoneField.trim() });
      setDoneCard({ customerId: newId, email: target, phone: phoneField.trim(), password: passField, pin });
      setStep('done');
    } catch (err) {
      setError(String((err as any)?.message || 'Account could not be created. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Forgot password: OTP → set new password.
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'ask' | 'otp'>('ask');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPass, setForgotPass] = useState('');

  const sendForgotOtp = () => {
    if (!emailOk()) { setError('Enter the email address of your account.'); return; }
    setBusy(true);
    setError('');
    const target = emailField.trim().toLowerCase();
    setSentTo(target);
    securityApi('/otp-signup-send', { email: target })
      .then(() => setForgotStep('otp'))
      .catch((err) => setError(String(err?.message || 'Could not send the code. Try again.')))
      .finally(() => setBusy(false));
  };

  const doForgot = () => {
    if (!forgotOtp.trim()) { setError('Enter the 6-digit code from your email.'); return; }
    if (forgotPass.length < 6) { setError('Set a new password of at least 6 characters.'); return; }
    setBusy(true);
    setError('');
    customerForgot({ email: sentTo, code: forgotOtp, newPassword: forgotPass })
      .then((ok) => {
        if (!ok) { setError('Could not reset the password. Check the code and try again.'); return; }
        showToast?.('Password reset successful — log in with your new password.', 'success');
        setForgotMode(false);
        setForgotStep('ask');
        setForgotOtp('');
        setForgotPass('');
        setMode('login');
        setPassField(forgotPass);
        setPassConfirm('');
        setError('');
      })
      .catch((err) => setError(String(err?.message || 'Reset failed. Try again.')))
      .finally(() => setBusy(false));
  };

  const printCard = () => {
    if (!doneCard) return;
    const w = window.open('', '_blank', 'width=420,height=520');
    if (!w) { showToast?.('Popup blocked — allow popups to print your credential card.', 'info'); return; }
    w.document.write(`<!doctype html><html><head><title>Smart Shop — Customer Credential</title><style>
      body{font-family:'Segoe UI',Arial,sans-serif;background:#0b1220;color:#e2e8f0;display:flex;justify-content:center;padding:40px 16px;}
      .card{background:linear-gradient(145deg,#0e1a2b,#13233c);border:1px solid rgba(52,211,153,0.35);border-radius:20px;padding:28px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
      .brand{display:flex;align-items:center;gap:10px;margin-bottom:20px;}
      .logo{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#10b981,#0d9488);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;}
      h2{margin:0;font-size:18px;}
      .sub{font-size:10px;color:#6ee7b7;letter-spacing:2px;text-transform:uppercase;}
      .row{margin-top:14px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;}
      .lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:700;}
      .val{font-size:15px;font-weight:700;color:#fff;word-break:break-all;margin-top:3px;font-family:'Courier New',monospace;}
      .warn{margin-top:18px;font-size:10px;color:#fbbf24;line-height:1.5;}
      @media print{body{padding:8px;background:#fff;color:#111;}.card{background:#fff;border:2px solid #10b981;box-shadow:none;}.val{color:#111;}.lbl{color:#555;}.sub{color:#059669;}.warn{color:#b45309;}}
    </style></head><body>
      <div class="card">
        <div class="brand"><div class="logo">SS</div><div><h2>Smart Shop</h2><div class="sub">by NexaGo BD</div></div></div>
        <div class="row"><div class="lbl">Permanent Customer ID</div><div class="val">${doneCard.customerId}</div></div>
        <div class="row"><div class="lbl">Gmail (login)</div><div class="val">${doneCard.email}</div></div>
        <div class="row"><div class="lbl">Phone</div><div class="val">${doneCard.phone || '—'}</div></div>
        <div class="row"><div class="lbl">Password</div><div class="val">${doneCard.password}</div></div>
        <div class="row"><div class="lbl">Account PIN</div><div class="val">${doneCard.pin}</div></div>
        <div class="warn">Keep this card safe. Your permanent ID, Gmail and phone are linked — you can log in from any device with your Gmail + password and never lose your orders or wallet.</div>
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center px-3 py-5 sm:p-4 overflow-y-auto overflow-x-hidden" style={{
      background: 'radial-gradient(1200px 600px at 20% -10%, rgba(16,185,129,0.25), transparent 60%), radial-gradient(1000px 500px at 90% 10%, rgba(45,212,191,0.18), transparent 55%), radial-gradient(900px 600px at 50% 110%, rgba(59,130,246,0.18), transparent 60%), #050a14',
    }}>
      <style>{`
        .cs-auth-card { background: rgba(255,255,255,0.06); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 24px 80px rgba(2,44,34,0.5), inset 0 1px 0 rgba(255,255,255,0.18); }
        .cs-auth-glow { box-shadow: 0 0 60px rgba(16,185,129,0.35), 0 0 0 1px rgba(16,185,129,0.25); }
        .cs-auth-input { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); transition: all 0.2s; }
        .cs-auth-input:focus { border-color: rgba(52,211,153,0.7); box-shadow: 0 0 0 3px rgba(52,211,153,0.18); background: rgba(255,255,255,0.12); }
        .cs-auth-input option { background:#0b1220; color:#fff; }
        .cs-auth-card { overflow-x: hidden; scrollbar-width: none; }
        .cs-auth-card::-webkit-scrollbar { width: 0; height: 0; display: none; }
      `}</style>

      <div className="cs-auth-card cs-auth-glow relative w-full max-w-md rounded-3xl p-5 sm:p-8 text-white max-h-[92dvh] overflow-y-auto">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-52 h-52 rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shrink-0">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black tracking-tight leading-none">Smart Shop</p>
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-[0.2em] mt-1">by NexaGo BD</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onLangChange(lang === 'bn' ? 'en' : 'bn')}
                className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] font-black text-white transition-colors"
                title="Change language"
              >
                {lang === 'bn' ? 'EN' : 'বাংলা'}
              </button>
              <button
                type="button"
                onClick={() => onDarkChange(!dark)}
                className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] font-black text-white transition-colors"
                title="Dark / light mode"
              >
                {dark ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>

          {!forgotMode && step === 'form' && (
            <>
              <h1 className="mt-5 text-xl font-black leading-tight">{A.welcome}</h1>
              <p className="mt-1.5 text-[12px] text-gray-300 leading-relaxed">{A.oneAccount}</p>

              <div className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
                <button onClick={() => { setMode('signup'); setStep('form'); setError(''); }} className={`py-2.5 rounded-xl text-[12px] font-black transition-colors cursor-pointer ${mode === 'signup' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>{A.createAccount}</button>
                <button onClick={() => { setMode('login'); setStep('form'); setError(''); }} className={`py-2.5 rounded-xl text-[12px] font-black transition-colors cursor-pointer ${mode === 'login' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>{A.signIn}</button>
              </div>

              <button
                onClick={doGoogleLogin}
                disabled={googleBusy}
                className="mt-4 w-full py-3 rounded-xl bg-white hover:bg-gray-100 text-gray-800 text-[13px] font-bold shadow-lg transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center space-x-2.5 border border-white/60"
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{googleBusy ? A.connectingGoogle : A.continueGoogle}</span>
              </button>

              <div className="flex items-center space-x-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{A.or}</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="space-y-3">
                {mode === 'signup' && (
                  <p className="text-[11px] text-gray-400 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Step 1 of 2 — first verify your Gmail with an OTP. Name, phone & password come next.</span>
                  </p>
                )}
                {mode === 'login' && (
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
                    <button onClick={() => { setLoginMethod('password'); setError(''); }} className={`py-2 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${loginMethod === 'password' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}>{A.password}</button>
                    <button onClick={() => { setLoginMethod('otp'); setError(''); }} className={`py-2 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${loginMethod === 'otp' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}>{A.otpLogin}</button>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{mode === 'login' ? A.gmailOrId : A.gmail} <span className="text-emerald-400">*</span></label>
                  <input value={emailField} onChange={(e) => { setEmailField(e.target.value); setError(''); }} placeholder={mode === 'login' ? 'name@gmail.com or NEX1234567890' : 'name@gmail.com'}
                    className="cs-auth-input w-full rounded-xl px-4 py-3 text-[13px] text-white outline-none placeholder:text-gray-500" />
                </div>
                {mode === 'login' && loginMethod === 'password' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{A.password} <span className="text-emerald-400">*</span></label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={passField} onChange={(e) => { setPassField(e.target.value); setError(''); }} placeholder={A.yourPassword}
                        className="cs-auth-input w-full rounded-xl px-4 py-3 pr-12 text-[13px] text-white outline-none placeholder:text-gray-500" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-300 cursor-pointer">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                {mode === 'signup' ? (
                  <button onClick={sendOtp} disabled={busy}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all cursor-pointer">
                    {busy ? A.sending : A.sendOtp}
                  </button>
                ) : (
                  <>
                    {loginMethod === 'password' ? (
                      <>
                        <button onClick={doLogin} disabled={busy}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all cursor-pointer">
                          {busy ? A.signingIn : A.signInPassword}
                        </button>
                        <button onClick={() => { setForgotMode(true); setError(''); }} className="w-full text-center text-[11px] font-bold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer">
                          {A.forgotPassword}
                        </button>
                      </>
                    ) : (
                      <button onClick={sendLoginOtp} disabled={busy}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all cursor-pointer">
                        {busy ? A.sendingOtp : A.sendLoginOtp}
                      </button>
                    )}
                  </>
                )}
                {error && <p className="text-[11px] font-bold text-red-400">{error}</p>}
              </div>
            </>
          )}

          {!forgotMode && step === 'otp' && (
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/25 px-4 py-3 text-[11px] text-emerald-200">
                <b className="text-white">Step 1 of 2</b> — a 6-digit code was sent to <b className="text-white">{sentTo}</b>. After verifying, you'll set up your account details.
              </div>
              <input value={otpCode} onChange={(e) => { setOtpCode(e.target.value); setError(''); }} placeholder="6-digit code"
                className="cs-auth-input w-full rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none placeholder:text-gray-500" />
              <button onClick={verifyOtp} disabled={busy}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all cursor-pointer">
                {busy ? 'Verifying…' : 'Verify Gmail'}
              </button>
              <button onClick={sendOtp} disabled={busy}
                className="w-full py-2.5 rounded-xl border border-white/15 text-[11px] font-bold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer">
                Resend Code
              </button>
              <button onClick={() => setStep('form')} disabled={busy}
                className="w-full py-2.5 rounded-xl text-[11px] font-bold text-gray-400 hover:text-white transition-colors cursor-pointer">
                ← Back
              </button>
              {error && <p className="text-[11px] font-bold text-red-400">{error}</p>}
            </div>
          )}

          {!forgotMode && step === 'loginOtp' && (
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/25 px-4 py-3 text-[11px] text-emerald-200">
                <b className="text-white">{A.customerOtpLogin}</b> — {lang === 'bn' ? 'লিংক করা Gmail-এ পাঠানো ৬ সংখ্যার কোড দিন' : 'enter the 6-digit code sent to the Gmail linked with'} <b className="text-white">{sentTo}</b>.
              </div>
              <input value={otpCode} onChange={(e) => { setOtpCode(e.target.value); setError(''); }} placeholder="6-digit code"
                className="cs-auth-input w-full rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none placeholder:text-gray-500" />
              <button onClick={verifyLoginOtp} disabled={busy}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all cursor-pointer">
                {busy ? (lang === 'bn' ? 'যাচাই হচ্ছে…' : 'Verifying…') : A.loginWithOtp}
              </button>
              <button onClick={sendLoginOtp} disabled={busy}
                className="w-full py-2.5 rounded-xl border border-white/15 text-[11px] font-bold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer">
                {A.resendOtp}
              </button>
              <button onClick={() => { setStep('form'); setOtpCode(''); setError(''); }} disabled={busy}
                className="w-full py-2.5 rounded-xl text-[11px] font-bold text-gray-400 hover:text-white transition-colors cursor-pointer">
                {A.backSignIn}
              </button>
              {error && <p className="text-[11px] font-bold text-red-400">{error}</p>}
            </div>
          )}

          {!forgotMode && step === 'details' && (
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/25 px-4 py-3 text-[11px] text-emerald-200">
                <b className="text-white">Step 2 of 2</b> — Gmail <b className="text-white">{sentTo}</b> is verified. Now set up your account details.
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{A.fullName} <span className="text-emerald-400">*</span></label>
                <input value={nameField} onChange={(e) => { setNameField(e.target.value); setError(''); }} placeholder="e.g. Rahim Khan"
                  className="cs-auth-input w-full rounded-xl px-4 py-3 text-[13px] text-white outline-none placeholder:text-gray-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{A.phoneNumber} <span className="text-emerald-400">*</span></label>
                <input value={phoneField} onChange={(e) => { setPhoneField(e.target.value); setError(''); }} placeholder="e.g. 01712345678"
                  className="cs-auth-input w-full rounded-xl px-4 py-3 text-[13px] text-white outline-none placeholder:text-gray-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Password (min 6 chars) <span className="text-emerald-400">*</span></label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={passField} onChange={(e) => { setPassField(e.target.value); setError(''); }} placeholder="Set your password"
                    className="cs-auth-input w-full rounded-xl px-4 py-3 pr-12 text-[13px] text-white outline-none placeholder:text-gray-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-300 cursor-pointer">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{A.confirmPassword} <span className="text-emerald-400">*</span></label>
                <input type={showPass ? 'text' : 'password'} value={passConfirm} onChange={(e) => { setPassConfirm(e.target.value); setError(''); }} placeholder="Re-type your password"
                  className="cs-auth-input w-full rounded-xl px-4 py-3 text-[13px] text-white outline-none placeholder:text-gray-500" />
              </div>
              <button onClick={createAccount} disabled={busy}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all cursor-pointer">
                {busy ? A.creating : A.createMyAccount}
              </button>
              <button onClick={() => setStep('form')} disabled={busy}
                className="w-full py-2.5 rounded-xl text-[11px] font-bold text-gray-400 hover:text-white transition-colors cursor-pointer">
                ← Back
              </button>
              {error && <p className="text-[11px] font-bold text-red-400">{error}</p>}
            </div>
          )}

          {!forgotMode && step === 'done' && doneCard && (
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h2 className="mt-3 text-lg font-black text-emerald-300">Account Created!</h2>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">Your permanent ID, Gmail and phone are now linked. You can log in from any device with your Gmail + password.</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-emerald-400/25 p-4 space-y-2 text-[11px]">
                <div className="flex justify-between items-center"><span className="text-gray-400">Permanent ID</span><span className="font-mono font-black text-emerald-300">{doneCard.customerId}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-400">Gmail</span><span className="font-mono font-bold text-white">{doneCard.email}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-400">Phone</span><span className="font-mono font-bold text-white">{doneCard.phone || '—'}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-400">Password</span><span className="font-mono font-bold text-white">{doneCard.password}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-400">Account PIN</span><span className="font-mono font-black text-emerald-300">{doneCard.pin}</span></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={printCard}
                  className="py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-white text-[12px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center space-x-1.5">
                  <Printer className="w-4 h-4" /><span>Print Credential</span>
                </button>
                <button onClick={() => onVerified({ customerId: doneCard.customerId, name: nameField, email: doneCard.email, phone: doneCard.phone, password: doneCard.password, pin: doneCard.pin })}
                  className="py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[12px] font-black uppercase tracking-wider transition-all cursor-pointer">
                  Start Shopping →
                </button>
              </div>
            </div>
          )}

          {forgotMode && (
            <div className="mt-6 space-y-3">
              <h2 className="text-lg font-black">Reset Password</h2>
              <p className="text-[11px] text-gray-300">Enter your account Gmail, verify the OTP, then set a new password.</p>
              {forgotStep === 'ask' ? (
                <>
                  <input value={emailField} onChange={(e) => { setEmailField(e.target.value); setError(''); }} placeholder="name@gmail.com"
                    className="cs-auth-input w-full rounded-xl px-4 py-3 text-[13px] text-white outline-none placeholder:text-gray-500" />
                  <button onClick={sendForgotOtp} disabled={busy}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all cursor-pointer">
                    {busy ? 'Sending…' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/25 px-4 py-3 text-[11px] text-emerald-200">
                    Code sent to <b className="text-white">{sentTo}</b>
                  </div>
                  <input value={forgotOtp} onChange={(e) => { setForgotOtp(e.target.value); setError(''); }} placeholder="6-digit code"
                    className="cs-auth-input w-full rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none placeholder:text-gray-500" />
                  <input type={showPass ? 'text' : 'password'} value={forgotPass} onChange={(e) => { setForgotPass(e.target.value); setError(''); }} placeholder="New password (min 6 chars)"
                    className="cs-auth-input w-full rounded-xl px-4 py-3 text-[13px] text-white outline-none placeholder:text-gray-500" />
                  <button onClick={doForgot} disabled={busy}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 disabled:opacity-60 transition-all cursor-pointer">
                    {busy ? 'Resetting…' : 'Set New Password'}
                  </button>
                  <button onClick={sendForgotOtp} disabled={busy}
                    className="w-full py-2.5 rounded-xl border border-white/15 text-[11px] font-bold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer">
                    Resend Code
                  </button>
                </>
              )}
              <button onClick={() => { setForgotMode(false); setForgotStep('ask'); setError(''); }} disabled={busy}
                className="w-full py-2.5 rounded-xl text-[11px] font-bold text-gray-400 hover:text-white transition-colors cursor-pointer">
                ← Back to Sign In
              </button>
              {error && <p className="text-[11px] font-bold text-red-400">{error}</p>}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 text-center space-y-2">
            <p className="text-[10px] text-gray-400 flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>One account per Gmail/phone · OTP mandatory · No data loss across devices</span>
            </p>
            <p className="text-[9px] text-gray-500">By continuing you agree to our Terms & Privacy Policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
};




/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OrderTimelineEntry {
  status: string;
  actor: 'customer' | 'store' | 'driver' | 'admin' | 'system';
  note?: string;
  time: number; // epoch ms
}

export interface Order {
  id: string; // e.g. "ORD-001248"
  storeName: string;
  address: string;
  status: 'Completed' | 'Pending' | 'Confirmed' | 'Processing' | 'Cancelled' | 'Ongoing';
  amount: number;
  date: string; // "May 20", etc.
  time?: string; // "11:46 AM", etc.
  customerName: string;
  customerPhone?: string; // e.g. "01712-345678"
  customerId?: string;    // permanent unique customer ID (NEX...) linking to profile, wallet & tickets
  driverId?: string;
  paymentMethod: string;
  pickupCoords?: { lat: number; lng: number };
  deliveryCoords?: { lat: number; lng: number };
  priority?: 'Normal' | 'Express' | 'Urgent';
  pickupLocation?: string;
  // Store/Driver delivery flow fields (mirror the simulator's live order lifecycle)
  storeReady?: boolean;      // store marked the order ready for pickup
  preparing?: boolean;       // store started preparing the order
  driverStage?: string;      // to_store | waiting_store | ready_for_pickup | to_customer | at_customer | customer_reported
  driverDeadline?: number;   // epoch ms — driver must accept the offer before this
  pickupProof?: string;      // filename of the driver's pickup photo
  deliveryProof?: string;    // filename of the driver's delivery proof photo
  zone?: string;
  itemCount?: number;
  parcelSize?: 'Small' | 'Medium' | 'Large';
  instructions?: string;
  customerNote?: string;      // comment the customer wrote when placing the order
  deliveryCharge?: number;
  codAmount?: number;
  estimatedMinutes?: number;
  items?: Array<{ productId: string; name: string; price: number; quantity: number }>;
  scheduledSlot?: string;
  deliveryPin?: string;
  pickupPin?: string;       // store-issued PIN given to the rider to verify pickup
  splitWalletAmount?: number;
  source?: 'customer-app' | 'pos-dispatch' | 'counter';
  pickedUp?: boolean;
  handoffScanned?: { pickup?: boolean; delivery?: boolean }; // QR handoff verified at each stage
  extraStores?: string[];
  placedAt?: number; // epoch ms — drives deterministic store→customer tracking progress
  timeline?: OrderTimelineEntry[]; // audit trail of every status change
  // Send Money / manual payment verification
  paymentStatus?: 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'COD' | 'Refunded';
  trxId?: string;          // bKash/Nagad Send Money transaction id
  senderNumber?: string;   // customer mobile that sent the money
  last4?: string;          // last 4 digits / PIN of the sending number (verification)
  trxAmount?: number;      // amount user claims to have sent
  receipt?: string;        // base64 data-URL screenshot/receipt
  reference?: string;      // pre-filled "Send Money" reference note
  paymentExpiry?: number;  // epoch ms deadline for pending payment
  paymentNote?: string;    // admin note on approve/reject
  rejectionReason?: string; // structured reject reason (TrxID invalid, Amount mismatched, ...)
}

export type DriverDutyStatus = 'Online' | 'Offline' | 'On-Delivery';

// Big numeric order id shared across Admin / Customer / Store / Driver (e.g. 4577685123)
export const makeOrderId = () => `45${String(Date.now()).slice(-8)}`;

export interface DriverDocument {
  type: 'NID Card' | 'Driving License' | 'Vehicle Registration' | 'Profile Photo' | 'Other';
  fileName: string;
  submittedAt: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  dataUrl?: string;
}

export interface DriverStatusLog {
  id: string;
  status: DriverDutyStatus;
  timestamp: string; // ISO format or formatted timestamp
  formattedTime?: string;
  reason?: string;
  updatedBy?: string;
  location?: string;
  durationMinutes?: number;
}

export interface Driver {
  id: string; // e.g. "DRV123456"
  name: string;
  photo?: string; // driver profile photo URL
  completedOrders: number;
  earnings: number;
  rating: number;
  status: DriverDutyStatus;
  phone: string;
  vehicleType: string;
  dispatchLocked?: boolean;
  commissionRate?: number;
  verificationStatus?: 'Verified' | 'Pending Audit' | 'Rejected';
  codCashCollected?: number;
  email?: string;
  nidNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  documents?: DriverDocument[];
  statusHistory?: DriverStatusLog[];
  locationCoords?: { lat: number; lng: number };
  currentZone?: string;
}

export interface Zone {
  id: string;
  name: string;
  ordersCount: number;
  earnings: number;
  status: 'Active' | 'Inactive';
  pendingOrders?: number;
  activeDrivers?: number;
  avgDeliveryMin?: number;
  totalKm?: number;
  drivers?: string[];
  coveragePct?: number;
  deliveryFee?: number;
  minOrder?: number;
  operatingHours?: string;
  peakHourOrders?: number;
  returnRate?: number;
  satisfaction?: number;
  coords?: { x: number; y: number }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Customer' | 'Admin' | 'Super Admin';
  status: 'Active' | 'Suspended';
  joinDate: string;
  ordersCount: number;
  walletBalance?: number;
  membershipTier?: 'Standard' | 'Silver VIP' | 'Gold VIP';
  address?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  date: string;
}

export interface Vehicle {
  id: string;
  type: 'Bike' | 'Bicycle' | 'Car' | 'Van' | 'Motorcycle';
  plateNumber: string;
  driverName: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
}

export interface PromotionBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  status: 'Active' | 'Scheduled' | 'Expired';
  startDate: string;
  endDate: string;
  clicks: number;
  description?: string;
  ctaLabel?: string;
  link?: string;
  placement?: 'home' | 'store' | 'popup' | 'app';
  mediaType?: 'image' | 'video';
  media?: string;
  impressions?: number;
  couponCode?: string;
}

export interface SupportTicket {
  id: string;
  user: string;
  subject: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved';
  date: string;
  messages: Array<{
    sender: 'user' | 'admin';
    text: string;
    time: string;
  }>;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'system' | 'driver' | 'payment';
  time: string;
  read: boolean;
  audience?: 'all' | 'customer' | 'driver' | 'store' | 'store-admin' | 'staff' | 'admin'; // who should see this in their inbox
  driverId?: string;      // if set, only this driver sees it in their inbox
  customerId?: string;    // if set, only this customer sees it in their inbox
  storeId?: string;       // if set, only this store / store-admin sees it in their inbox
  staffId?: string;       // if set, only this staff member sees it in their inbox
}

export interface ChatLogEntry {
  sender: 'customer' | 'driver';
  name: string;
  text: string;
  time: string;
  image?: string;
  orderId: string;
}

export interface OrderReportEntry {
  orderId: string;
  reason: string;
  note: string;
  time: string;
  status?: 'Open' | 'Under Review' | 'Resolved';
  adminReply?: string;
}

export interface AdminAuditEntry {
  id: string;
  action: 'Approved' | 'Rejected' | 'Refunded';
  orderId: string;
  paymentMethod: string;
  amount: number;
  reason?: string;
  at: number;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  method: string;
  number: string;
  amount: number;
  reason: string;
  status: 'Requested' | 'Processing' | 'Refunded' | 'Rejected';
  at: number;
  customerId?: string;      // who the money goes back to (for admin refund approvals)
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  storeName?: string;
  amount?: number;
  reason: string;
  note?: string;
  status: 'Requested' | 'Approved' | 'Picked Up' | 'Completed' | 'Rejected';
  at: number;
  driverId?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  status: string;
  image?: string;
}

// Send Money merchant wallets — admin edits these from the Orders dashboard,
// the customer storefront reads the same shared key (bKash / Nagad / Upay / Rocket)
export type WalletKey = 'bKash' | 'Nagad' | 'Upay' | 'Rocket';
export interface WalletNumbers {
  name: string;
  numbers: string[];
}
export type WalletConfig = Record<WalletKey, WalletNumbers>;

export const WALLET_CONFIG_KEY = 'ss_wallet_config';

export const DEFAULT_WALLETS: WalletConfig = {
  bKash: { name: 'NexaGo Pay', numbers: ['01712-345678', '01811-222333', '01611-444555'] },
  Nagad: { name: 'NexaGo Pay', numbers: ['01819-987654', '01311-666777'] },
  Upay: { name: 'NexaGo Pay', numbers: ['01911-123456', '01511-654321'] },
  Rocket: { name: 'NexaGo Pay', numbers: ['01812-333444', '01612-555666'] },
};

export const SEND_MONEY_METHODS: WalletKey[] = ['bKash', 'Nagad', 'Upay', 'Rocket'];

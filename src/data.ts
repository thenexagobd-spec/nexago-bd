/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Driver, Zone, User, Payment, Vehicle, PromotionBanner, SupportTicket, SystemNotification } from './types';

export const defaultOrders: Order[] = [];

export const defaultDrivers: Driver[] = [
  {
    id: "DRV123456",
    name: "Rahim Khan",
    completedOrders: 72,
    earnings: 12560.00,
    rating: 4.9,
    status: "Online",
    phone: "01712345678",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
    vehicleType: "Motorcycle (Yamaha 125cc)",
    dispatchLocked: false,
    commissionRate: 15,
    verificationStatus: "Verified",
    codCashCollected: 3250.00,
    nidNumber: "1992261048291039",
    licenseNumber: "DK-DL-2021-98432",
    statusHistory: [
      {
        id: "LOG-101",
        status: "Online",
        timestamp: "2026-07-30T08:00:00.000Z",
        formattedTime: "Today, 08:00 AM",
        reason: "Morning Shift Started (Dhanmondi Hub)",
        updatedBy: "Driver (Mobile App)",
        location: "Dhanmondi Central Hub",
        durationMinutes: 195
      },
      {
        id: "LOG-102",
        status: "On-Delivery",
        timestamp: "2026-07-30T11:15:00.000Z",
        formattedTime: "Today, 11:15 AM",
        reason: "Dispatched Order #ORD-001248 (Chillox Dhanmondi)",
        updatedBy: "System Automated",
        location: "Dhanmondi Rd 27 -> Sobhanbag",
        durationMinutes: 28
      },
      {
        id: "LOG-103",
        status: "Online",
        timestamp: "2026-07-30T11:43:00.000Z",
        formattedTime: "Today, 11:43 AM",
        reason: "Order #ORD-001248 Delivered & Returned to Active Fleet Queue",
        updatedBy: "Driver (Mobile App)",
        location: "Sobhanbag, Dhanmondi",
        durationMinutes: 82
      },
      {
        id: "LOG-104",
        status: "On-Delivery",
        timestamp: "2026-07-30T13:05:00.000Z",
        formattedTime: "Today, 01:05 PM",
        reason: "Dispatched Order #ORD-001252 (Sultan's Dine)",
        updatedBy: "System Automated",
        location: "Gulshan 1 Circle",
        durationMinutes: 35
      },
      {
        id: "LOG-105",
        status: "Online",
        timestamp: "2026-07-30T13:40:00.000Z",
        formattedTime: "Today, 01:40 PM",
        reason: "Order Delivered Successfully & Re-entered Dispatch Zone",
        updatedBy: "Driver (Mobile App)",
        location: "Gulshan Hub",
        durationMinutes: 65
      }
    ]
  },
  {
    id: "DRV123457",
    name: "Shakib Hasan",
    completedOrders: 68,
    earnings: 11230.00,
    rating: 4.8,
    status: "On-Delivery",
    phone: "01812345679",
    vehicleType: "Motorcycle (Suzuki Gixxer)",
    dispatchLocked: false,
    commissionRate: 15,
    verificationStatus: "Verified",
    codCashCollected: 1800.00,
    nidNumber: "1990261048291040",
    licenseNumber: "DK-DL-2020-11204",
    statusHistory: [
      {
        id: "LOG-201",
        status: "Online",
        timestamp: "2026-07-30T09:00:00.000Z",
        formattedTime: "Today, 09:00 AM",
        reason: "Gulshan Corporate Shift Check-in",
        updatedBy: "Driver (Mobile App)",
        location: "Gulshan 2 Hub",
        durationMinutes: 90
      },
      {
        id: "LOG-202",
        status: "On-Delivery",
        timestamp: "2026-07-30T10:30:00.000Z",
        formattedTime: "Today, 10:30 AM",
        reason: "Dispatched Order #ORD-001245 (Madchef Gulshan)",
        updatedBy: "System Automated",
        location: "Gulshan 1 -> Banani Rd 11",
        durationMinutes: 32
      },
      {
        id: "LOG-203",
        status: "Online",
        timestamp: "2026-07-30T11:02:00.000Z",
        formattedTime: "Today, 11:02 AM",
        reason: "Order Delivered & Back in Service",
        updatedBy: "Driver (Mobile App)",
        location: "Banani Rd 11",
        durationMinutes: 128
      },
      {
        id: "LOG-204",
        status: "On-Delivery",
        timestamp: "2026-07-30T13:10:00.000Z",
        formattedTime: "Today, 01:10 PM",
        reason: "Dispatched Order #ORD-001255 (Takeout Banani)",
        updatedBy: "Admin Dispatch Control",
        location: "Banani -> Mohakhali DOHS",
        durationMinutes: 40
      }
    ]
  },
  {
    id: "DRV123458",
    name: "Hasan Mahmud",
    completedOrders: 61,
    earnings: 9870.00,
    rating: 4.7,
    status: "Online",
    phone: "01912345680",
    vehicleType: "Bicycle (Hero Ranger)",
    dispatchLocked: false,
    commissionRate: 12,
    verificationStatus: "Pending Audit",
    codCashCollected: 850.00,
    nidNumber: "1995261048291088",
    licenseNumber: "N/A (Bicycle Courier)",
    statusHistory: [
      {
        id: "LOG-301",
        status: "Online",
        timestamp: "2026-07-30T08:30:00.000Z",
        formattedTime: "Today, 08:30 AM",
        reason: "Short-Haul Bicycle Duty Logged",
        updatedBy: "Driver (Mobile App)",
        location: "Dhanmondi Lake Sector",
        durationMinutes: 110
      },
      {
        id: "LOG-302",
        status: "On-Delivery",
        timestamp: "2026-07-30T10:20:00.000Z",
        formattedTime: "Today, 10:20 AM",
        reason: "Dispatched Local Grocery #ORD-001241",
        updatedBy: "System Automated",
        location: "Green Road -> Dhanmondi 5",
        durationMinutes: 20
      },
      {
        id: "LOG-303",
        status: "Online",
        timestamp: "2026-07-30T10:40:00.000Z",
        formattedTime: "Today, 10:40 AM",
        reason: "Order Delivered Successfully",
        updatedBy: "Driver (Mobile App)",
        location: "Dhanmondi Rd 5",
        durationMinutes: 140
      },
      {
        id: "LOG-304",
        status: "Offline",
        timestamp: "2026-07-30T13:00:00.000Z",
        formattedTime: "Today, 01:00 PM",
        reason: "Rest Break & Document Audit Pending",
        updatedBy: "Admin Dispatch Control",
        location: "HQ Central Office",
        durationMinutes: 45
      },
      {
        id: "LOG-305",
        status: "Online",
        timestamp: "2026-07-30T13:45:00.000Z",
        formattedTime: "Today, 01:45 PM",
        reason: "Logged Back Online for Afternoon Shift",
        updatedBy: "Driver (Mobile App)",
        location: "Dhanmondi Hub",
        durationMinutes: 30
      }
    ]
  },
  {
    id: "DRV123459",
    name: "Arif Hossain",
    completedOrders: 53,
    earnings: 8450.00,
    rating: 4.6,
    status: "Offline",
    phone: "01512345681",
    vehicleType: "Motorcycle (TVS Metro)",
    dispatchLocked: true,
    commissionRate: 15,
    verificationStatus: "Verified",
    codCashCollected: 0.00,
    nidNumber: "1988261048291092",
    licenseNumber: "DK-DL-2019-77281",
    statusHistory: [
      {
        id: "LOG-401",
        status: "Online",
        timestamp: "2026-07-30T07:30:00.000Z",
        formattedTime: "Today, 07:30 AM",
        reason: "Early Morning Rush Shift Started",
        updatedBy: "Driver (Mobile App)",
        location: "Mohammadpur Hub",
        durationMinutes: 120
      },
      {
        id: "LOG-402",
        status: "On-Delivery",
        timestamp: "2026-07-30T09:30:00.000Z",
        formattedTime: "Today, 09:30 AM",
        reason: "Dispatched Order #ORD-001239",
        updatedBy: "System Automated",
        location: "Mohammadpur -> Asad Gate",
        durationMinutes: 25
      },
      {
        id: "LOG-403",
        status: "Online",
        timestamp: "2026-07-30T09:55:00.000Z",
        formattedTime: "Today, 09:55 AM",
        reason: "Order Delivered",
        updatedBy: "Driver (Mobile App)",
        location: "Asad Gate",
        durationMinutes: 65
      },
      {
        id: "LOG-404",
        status: "Offline",
        timestamp: "2026-07-30T11:00:00.000Z",
        formattedTime: "Today, 11:00 AM",
        reason: "Dispatch Suspended (COD Cash Limit Exceeded)",
        updatedBy: "Admin Dispatch Control",
        location: "Mohammadpur Depot",
        durationMinutes: 180
      }
    ]
  },
  {
    id: "DRV123460",
    name: "Sabbir Ahmed",
    completedOrders: 49,
    earnings: 7560.00,
    rating: 4.5,
    status: "Online",
    phone: "01312345682",
    vehicleType: "Bicycle (Veloce 602)",
    dispatchLocked: false,
    commissionRate: 12,
    verificationStatus: "Verified",
    codCashCollected: 420.00,
    nidNumber: "1997261048291011",
    licenseNumber: "N/A (Bicycle Courier)",
    statusHistory: [
      {
        id: "LOG-501",
        status: "Online",
        timestamp: "2026-07-30T10:00:00.000Z",
        formattedTime: "Today, 10:00 AM",
        reason: "Checked In - Mirpur 10 Hub",
        updatedBy: "Driver (Mobile App)",
        location: "Mirpur 10 Circle",
        durationMinutes: 105
      },
      {
        id: "LOG-502",
        status: "On-Delivery",
        timestamp: "2026-07-30T11:45:00.000Z",
        formattedTime: "Today, 11:45 AM",
        reason: "Dispatched Order #ORD-001249",
        updatedBy: "System Automated",
        location: "Mirpur 10 -> Kazipara",
        durationMinutes: 22
      },
      {
        id: "LOG-503",
        status: "Online",
        timestamp: "2026-07-30T12:07:00.000Z",
        formattedTime: "Today, 12:07 PM",
        reason: "Order Delivered & Ready for Next Assignment",
        updatedBy: "Driver (Mobile App)",
        location: "Kazipara",
        durationMinutes: 120
      }
    ]
  }
];

export const defaultZones: Zone[] = [
  { id: "Z-1", name: "Dhanmondi", ordersCount: 230, earnings: 23450.00, status: "Active", pendingOrders: 18, activeDrivers: 26, avgDeliveryMin: 32, totalKm: 1480, coveragePct: 92, deliveryFee: 60, minOrder: 150, operatingHours: "9AM-11PM", peakHourOrders: 87, returnRate: 1.2, satisfaction: 96, drivers: ["Rahim Khan","Rafiq Islam","Shamim Ahmed","Nazmul Haque","Jahid Hasan","Tanvir Hossain"], coords: [{x:120,y:160},{x:180,y:150},{x:200,y:200},{x:150,y:220},{x:110,y:200}] },
  { id: "Z-2", name: "Gulshan", ordersCount: 198, earnings: 19870.00, status: "Active", pendingOrders: 14, activeDrivers: 22, avgDeliveryMin: 35, totalKm: 1320, coveragePct: 88, deliveryFee: 70, minOrder: 200, operatingHours: "10AM-11PM", peakHourOrders: 74, returnRate: 0.9, satisfaction: 94, drivers: ["Shakib Hasan","Kamal Uddin","Rashed Mia","Imran Hossain"], coords: [{x:260,y:120},{x:330,y:110},{x:360,y:170},{x:300,y:200},{x:250,y:170}] },
  { id: "Z-3", name: "Uttara", ordersCount: 186, earnings: 18230.00, status: "Active", pendingOrders: 22, activeDrivers: 24, avgDeliveryMin: 38, totalKm: 1560, coveragePct: 85, deliveryFee: 55, minOrder: 120, operatingHours: "9AM-11PM", peakHourOrders: 69, returnRate: 1.5, satisfaction: 91, drivers: ["Hasan Mahmud","Ashraful Islam","Mamun Khan","Sabbir Ahmed"], coords: [{x:140,y:40},{x:260,y:30},{x:280,y:80},{x:160,y:95}] },
  { id: "Z-4", name: "Mirpur", ordersCount: 162, earnings: 15420.00, status: "Active", pendingOrders: 26, activeDrivers: 20, avgDeliveryMin: 41, totalKm: 1190, coveragePct: 80, deliveryFee: 50, minOrder: 100, operatingHours: "9AM-10PM", peakHourOrders: 58, returnRate: 2.1, satisfaction: 88, drivers: ["Arif Hossain","Sohel Rana","Bijoy Das","Monir Uddin"], coords: [{x:40,y:80},{x:120,y:70},{x:140,y:140},{x:60,y:160}] },
  { id: "Z-5", name: "Banani", ordersCount: 142, earnings: 13230.00, status: "Active", pendingOrders: 12, activeDrivers: 18, avgDeliveryMin: 30, totalKm: 980, coveragePct: 90, deliveryFee: 65, minOrder: 180, operatingHours: "10AM-11PM", peakHourOrders: 63, returnRate: 0.8, satisfaction: 95, drivers: ["Nayeem Islam","Fahim Ahmed","Rubel Hossain"], coords: [{x:240,y:180},{x:290,y:175},{x:300,y:220},{x:250,y:230}] }
];

export const defaultUsers: User[] = [
  {
    id: "USR-001",
    name: "M. A. Rahman",
    email: "rahman@email.com",
    phone: "01711122233",
    role: "Customer",
    status: "Active",
    joinDate: "2023-01-15",
    ordersCount: 42,
    walletBalance: 1450.00,
    membershipTier: "Gold VIP",
    address: "Dhanmondi Road 8A, House 24, Dhaka"
  },
  {
    id: "USR-002",
    name: "Sadia Chowdhury",
    email: "sadia.c@email.com",
    phone: "01822233344",
    role: "Customer",
    status: "Active",
    joinDate: "2023-04-10",
    ordersCount: 28,
    walletBalance: 820.00,
    membershipTier: "Silver VIP",
    address: "Gulshan Avenue, Circle 2, Dhaka"
  },
  {
    id: "USR-003",
    name: "Nabil Ahmed",
    email: "nabil@email.com",
    phone: "01933344455",
    role: "Customer",
    status: "Active",
    joinDate: "2023-07-22",
    ordersCount: 19,
    walletBalance: 350.00,
    membershipTier: "Standard",
    address: "Uttara Sector 7, Road 12, Dhaka"
  },
  {
    id: "USR-004",
    name: "Fahim Shahriar",
    email: "fahim.s@email.com",
    phone: "01544455566",
    role: "Customer",
    status: "Active",
    joinDate: "2023-11-05",
    ordersCount: 14,
    walletBalance: 0.00,
    membershipTier: "Standard",
    address: "Mirpur 10, Block C, Dhaka"
  },
  {
    id: "USR-005",
    name: "Admin User",
    email: "admin@smartdelivery.com",
    phone: "01700000000",
    role: "Super Admin",
    status: "Active",
    joinDate: "2022-10-01",
    ordersCount: 0,
    walletBalance: 50000.00,
    membershipTier: "Gold VIP",
    address: "HQ Central Command, Banani, Dhaka"
  }
];

export const defaultPayments: Payment[] = [
  { id: "TXN-98240", orderId: "ORD-001248", amount: 260.00, method: "bKash", status: "Paid", date: "2024-05-26 18:34" },
  { id: "TXN-98239", orderId: "ORD-001247", amount: 310.00, method: "Cash on Delivery", status: "Pending", date: "2024-05-26 17:15" },
  { id: "TXN-98238", orderId: "ORD-001246", amount: 300.00, method: "bKash", status: "Paid", date: "2024-05-25 14:12" },
  { id: "TXN-98237", orderId: "ORD-001245", amount: 210.00, method: "Nagad", status: "Failed", date: "2024-05-24 13:02" },
  { id: "TXN-98236", orderId: "ORD-001244", amount: 240.00, method: "Visa Card", status: "Paid", date: "2024-05-24 11:45" }
];

export const defaultVehicles: Vehicle[] = [
  { id: "VEH-001", type: "Motorcycle", plateNumber: "Dhaka Metro-H-12-3456", driverName: "Rahim Khan", status: "Active" },
  { id: "VEH-002", type: "Motorcycle", plateNumber: "Dhaka Metro-L-45-6789", driverName: "Shakib Hasan", status: "Active" },
  { id: "VEH-003", type: "Bicycle", plateNumber: "N/A - Bicycle", driverName: "Hasan Mahmud", status: "Active" },
  { id: "VEH-004", type: "Motorcycle", plateNumber: "Dhaka Metro-H-98-7654", driverName: "Arif Hossain", status: "Active" },
  { id: "VEH-005", type: "Bicycle", plateNumber: "N/A - Bicycle", driverName: "Sabbir Ahmed", status: "Active" }
];

export const defaultBanners: PromotionBanner[] = [
  {
    id: "BAN-001",
    title: "15% off with bKash payment!",
    subtitle: "Use code BKASH15 on Brew & Bites or KFC",
    status: "Active",
    startDate: "2024-05-01",
    endDate: "2024-05-31",
    clicks: 1420
  },
  {
    id: "BAN-002",
    title: "Free Delivery on Daily Mart",
    subtitle: "Min order ৳500 on Gulshan & Dhanmondi",
    status: "Active",
    startDate: "2024-05-15",
    endDate: "2024-06-15",
    clicks: 980
  },
  {
    id: "BAN-003",
    title: "EID Delivery Special campaign",
    subtitle: "Earn double payouts for delivering after 8 PM",
    status: "Scheduled",
    startDate: "2024-06-10",
    endDate: "2024-06-20",
    clicks: 0
  }
];

export const defaultSupportTickets: SupportTicket[] = [
  {
    id: "TCK-104",
    user: "M. A. Rahman",
    subject: "Order #ORD-001248 cash back not received",
    priority: "High",
    status: "Open",
    date: "2024-05-26 19:10",
    messages: [
      { sender: "user", text: "I paid through bKash but did not receive the 15% discount cash back. Please resolve.", time: "19:10" }
    ]
  },
  {
    id: "TCK-103",
    user: "Shakib Hasan (Driver)",
    subject: "Address correction in Gulshan zone",
    priority: "Medium",
    status: "In Progress",
    date: "2024-05-26 15:40",
    messages: [
      { sender: "user", text: "The map pin for Daily Mart in Gulshan 1 is shifted about 200m north. Please update.", time: "15:40" },
      { sender: "admin", text: "Thanks for reporting. We have forwarded this to the GIS mapping team for review.", time: "16:05" }
    ]
  },
  {
    id: "TCK-102",
    user: "Tasnim Sultana",
    subject: "Refund query for cancelled order #1230",
    priority: "Low",
    status: "Resolved",
    date: "2024-05-25 10:20",
    messages: [
      { sender: "user", text: "My order was cancelled yesterday. When will I get the bKash refund?", time: "10:20" },
      { sender: "admin", text: "Refunds generally take 3-5 business days. Your transaction has been processed from our side.", time: "11:15" },
      { sender: "user", text: "Received. Thank you!", time: "11:30" }
    ]
  }
];

export const defaultNotifications: SystemNotification[] = [
  { id: "NTF-001", title: "New Driver Registration", message: "Arif Hossain has submitted documents for verification.", type: "driver", time: "10 mins ago", read: false },
  { id: "NTF-002", title: "High Demand in Gulshan", message: "Gulshan zone is experiencing high order volume. Extra fee enabled.", type: "system", time: "1 hour ago", read: false },
  { id: "NTF-003", title: "bKash Payouts Complete", message: "Weekly payout of ৳ 84,500 successfully dispatched to drivers.", type: "payment", time: "4 hours ago", read: true },
  { id: "NTF-004", title: "Cancelled Order Report", message: "Order #ORD-001245 was cancelled by customer due to delivery delay.", type: "order", time: "1 day ago", read: true }
];

// LocalStorage helpers to load/save state
export const getStoredData = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const setStoredData = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
};

export const getZonesWithDefaults = (): Zone[] => {
  try {
    const data = localStorage.getItem('sd_zones');
    const stored: Zone[] = data ? JSON.parse(data) : defaultZones;
    const zoneMap = new Map<string, Zone>(stored.map(z => [z.id, z]));
    const merged = defaultZones.map(dz => {
      const existing = zoneMap.get(dz.id);
      if (!existing) return dz;
      return { ...existing, coords: existing.coords && existing.coords.length > 0 ? existing.coords : dz.coords };
    });
    return merged.concat(stored.filter(z => !defaultZones.some(dz => dz.id === z.id)));
  } catch (error) {
    console.error('Error reading sd_zones:', error);
    return defaultZones;
  }
};

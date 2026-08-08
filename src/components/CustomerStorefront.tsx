import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag, Search, MapPin, Bell, Heart, CreditCard, Wallet, Ticket,
  HelpCircle, Settings, ChevronDown, ChevronLeft, ChevronRight, Filter, Star,
  Clock, Truck, Shield, Gift, Store, Plus, Minus, CheckCircle, X,
  ShieldCheck, Home, Package, Map, Phone, Copy, Check, RefreshCw,
  Trash2, Navigation, Sparkles, Tag, Printer, Lock, Banknote, Zap, ArrowRight, Bike, Percent,
  RotateCcw, Languages, ShoppingCart, BadgePercent, Crown, Gem, Store as StoreIcon,
  MessageCircle, Share2, LocateFixed, CalendarClock, AlertCircle, Link2,
  Camera, Send, Headphones, ScrollText, RefreshCcw, User, Mail, KeyRound
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order, Product, RefundRequest, WalletConfig, WalletKey, DEFAULT_WALLETS, WALLET_CONFIG_KEY, SEND_MONEY_METHODS } from '../types';
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
  status: 'Completed' | 'Pending';
}

interface SupportTicketItem {
  id: string;
  subject: string;
  category: string;
  status: 'Open' | 'Resolved' | 'In Progress' | 'Under Review';
  date: string;
  lastMessage: string;
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

// Approximate reverse-geocoder: nearest known Dhaka area for a lat/lng
const nearestAreaOf = (lat: number, lng: number) => {
  let best = 'Dhanmondi';
  let bestD = Infinity;
  for (const [name, [al, ag]] of Object.entries(AREA_COORDS)) {
    const d = Math.pow(al - lat, 2) + Math.pow(ag - lng, 2);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
};

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=600`;

const STORE_DEFS: StoreDef[] = [
  {
    id: 'S1', name: 'Fresh Mart', subtext: 'The NexaGo BD', category: 'Grocery',
    badgeColor: 'bg-emerald-600 text-white', rating: 4.6, reviewsCount: '230+',
    deliveryTime: '30-40 min', deliveryFee: 40,
    image: U('photo-1542838132-92c53300491e'), logoText: 'Fresh Mart', logoBg: 'bg-emerald-100 text-emerald-800',
    pickup: { lat: 23.7806, lng: 90.4009 },
    catalog: [
      { id: 'S1-P1', name: 'Fresh Apples (Premium)', price: 180, category: 'Fruits & Veg', stock: 45, status: 'In Stock', unit: '1 kg', desc: 'Crisp, juicy imported apples. Perfect for snacks & salads.', image: U('photo-1560806887-1e4cd0b6cbd6') },
      { id: 'S1-P2', name: 'Organic Bananas', price: 90, category: 'Fruits & Veg', stock: 120, status: 'In Stock', unit: '12 pcs', desc: 'Farm-fresh sweet bananas, rich in potassium.', image: U('photo-1571771894821-ce9b6c11b08e') },
      { id: 'S1-P3', name: 'Miniket Rice 5kg', price: 380, category: 'Rice & Grains', stock: 35, status: 'In Stock', unit: '5 kg', desc: 'Premium Miniket rice, soft and aromatic.', image: U('photo-1586201375761-83865001e31c') },
      { id: 'S1-P4', name: 'Whole Milk 1L', price: 95, category: 'Dairy & Eggs', stock: 60, status: 'In Stock', unit: '1 L', desc: 'Full-cream pasteurised cow milk, farm fresh daily.', image: U('photo-1550583724-b2692b85b150') },
      { id: 'S1-P5', name: 'Fresh Farm Eggs (Dozen)', price: 145, category: 'Dairy & Eggs', stock: 80, status: 'In Stock', unit: '12 pcs', desc: 'Grade-A brown eggs from local farms.', image: U('photo-1582722872445-44dc5f7e3c8f') },
      { id: 'S1-P6', name: 'Brown Bread 400g', price: 65, category: 'Bakery', stock: 15, status: 'In Stock', unit: '400 g', desc: 'Whole-grain brown bread, high fibre.', image: U('photo-1509440159596-0249088772ff') },
      { id: 'S1-P7', name: 'Tomatoes (Local)', price: 80, category: 'Fruits & Veg', stock: 9, status: 'Low Stock', unit: '1 kg', desc: 'Vine-ripened local tomatoes.', image: U('photo-1546094096-0df4bcaaa337') },
      { id: 'S1-P8', name: 'Onion (Local)', price: 65, category: 'Fruits & Veg', stock: 50, status: 'In Stock', unit: '1 kg', desc: 'Fresh local onions.', image: U('photo-1508747703725-719777637510') },
      { id: 'S1-P9', name: 'Soybean Oil 2L', price: 350, category: 'Oil & Ghee', stock: 28, status: 'In Stock', unit: '2 L', desc: 'Refined soybean cooking oil.', image: U('photo-1474979266404-7eaacbcd87c5') },
      { id: 'S1-P10', name: 'White Sugar 1kg', price: 130, category: 'Sugar & Salt', stock: 0, status: 'Out of Stock', unit: '1 kg', desc: 'Fine granulated sugar.', image: U('photo-1584744982491-665216d95f8b') },
    ]
  },
  {
    id: 'S2', name: 'Daily Shopper', subtext: 'Supermarket', category: 'Supermarket',
    badgeColor: 'bg-orange-500 text-white', rating: 4.5, reviewsCount: '180+',
    deliveryTime: '40-50 min', deliveryFee: 50,
    image: U('photo-1578916171728-46686eac8d58'), logoText: 'DS', logoBg: 'bg-orange-100 text-orange-800',
    pickup: { lat: 23.7822, lng: 90.4145 },
    catalog: [
      { id: 'S2-P1', name: 'Toilet Paper 12 Roll', price: 420, category: 'Household', stock: 30, status: 'In Stock', unit: '12 rolls', desc: '3-ply soft toilet rolls.', image: U('photo-1584634731339-252c581abfc5') },
      { id: 'S2-P2', name: 'Detergent Powder 1kg', price: 210, category: 'Household', stock: 40, status: 'In Stock', unit: '1 kg', desc: 'Stain-removing laundry detergent.', image: U('photo-1585699324551-f6c309eedeca') },
      { id: 'S2-P3', name: 'Dishwash Liquid 500ml', price: 120, category: 'Household', stock: 25, status: 'In Stock', unit: '500 ml', desc: 'Lemon-fresh dishwashing liquid.', image: U('photo-1620381131645-6c135a50e3cb') },
      { id: 'S2-P4', name: 'Shampoo 350ml', price: 320, category: 'Personal Care', stock: 18, status: 'In Stock', unit: '350 ml', desc: 'Anti-dandruff herbal shampoo.', image: U('photo-1556228720-195a672e8a03') },
      { id: 'S2-P5', name: 'Toothpaste 150g', price: 140, category: 'Personal Care', stock: 55, status: 'In Stock', unit: '150 g', desc: 'Fluoride protection toothpaste.', image: U('photo-1585421514738-01798e13b998') },
      { id: 'S2-P6', name: 'Bath Soap (3 Pack)', price: 180, category: 'Personal Care', stock: 7, status: 'Low Stock', unit: '3 pcs', desc: 'Moisturising bath soap bars.', image: U('photo-1583947215259-38e31be8751f') },
      { id: 'S2-P7', name: 'Instant Noodles (5 Pack)', price: 175, category: 'Snacks', stock: 0, status: 'Out of Stock', unit: '5 pcs', desc: 'Quick-cook masala noodles.', image: U('photo-1612929633738-8fe44f7ec841') },
      { id: 'S2-P8', name: 'Family Biscuits 500g', price: 160, category: 'Snacks', stock: 42, status: 'In Stock', unit: '500 g', desc: 'Crunchy tea-time biscuits.', image: U('photo-1558961363-fa8fdf82db35') },
    ]
  },
  {
    id: 'S3', name: 'Spice Garden', subtext: 'Bangladeshi · Indian', category: 'Restaurant',
    badgeColor: 'bg-red-600 text-white', rating: 4.7, reviewsCount: '320+',
    deliveryTime: '35-45 min', deliveryFee: 60,
    image: U('photo-1517248135467-4c7edcad34c4'), logoText: 'SG', logoBg: 'bg-red-100 text-red-800',
    pickup: { lat: 23.7539, lng: 90.3836 },
    catalog: [
      { id: 'S3-P1', name: 'Kacchi Biryani', price: 420, category: 'Biryani', stock: 30, status: 'In Stock', unit: '1 plate', desc: 'Fragrant basmati kacchi with tender mutton.', image: U('photo-1596797038530-2c107229654b') },
      { id: 'S3-P2', name: 'Chicken Biryani', price: 280, category: 'Biryani', stock: 40, status: 'In Stock', unit: '1 plate', desc: 'Classic chicken biryani with mint raita.', image: U('photo-1563379091339-03b21ab4a4f8') },
      { id: 'S3-P3', name: 'Beef Bhuna', price: 480, category: 'Mains', stock: 22, status: 'In Stock', unit: '1 plate', desc: 'Slow-cooked spicy beef bhuna.', image: U('photo-1604908176997-125f25cc6f3d') },
      { id: 'S3-P4', name: 'Tandoori Chicken (Half)', price: 380, category: 'Mains', stock: 16, status: 'In Stock', unit: 'half', desc: 'Char-grilled tandoori chicken.', image: U('photo-1604503468506-a8da13d82791') },
      { id: 'S3-P5', name: 'Garlic Naan', price: 80, category: 'Breads', stock: 50, status: 'In Stock', unit: '1 pc', desc: 'Fresh tandoor naan with garlic butter.', image: U('photo-1601050690597-df0568f70950') },
      { id: 'S3-P6', name: 'Veg Curry & Rice', price: 180, category: 'Mains', stock: 8, status: 'Low Stock', unit: '1 plate', desc: 'Mixed vegetable curry with steamed rice.', image: U('photo-1512621776951-a57141f2eefd') },
      { id: 'S3-P7', name: 'Misti Doi', price: 120, category: 'Dessert', stock: 25, status: 'In Stock', unit: '1 cup', desc: 'Traditional caramelised sweet yoghurt.', image: U('photo-1551024506-0bccd828d307') },
      { id: 'S3-P8', name: 'Lemon Mint Sharbat', price: 90, category: 'Drinks', stock: 0, status: 'Out of Stock', unit: '1 glass', desc: 'Refreshing mint lemonade.', image: U('photo-1600271886742-f049cd451bba') },
    ]
  },
  {
    id: 'S4', name: 'Burger House', subtext: 'Fast Food · Burgers', category: 'Fast Food',
    badgeColor: 'bg-amber-600 text-white', rating: 4.4, reviewsCount: '150+',
    deliveryTime: '25-35 min', deliveryFee: 40,
    image: U('photo-1568901346375-23c9450c58cd'), logoText: 'BH', logoBg: 'bg-amber-100 text-amber-800',
    pickup: { lat: 23.7936, lng: 90.4045 },
    catalog: [
      { id: 'S4-P1', name: 'Classic Beef Burger', price: 320, category: 'Burgers', stock: 35, status: 'In Stock', unit: '1 pc', desc: 'Juicy beef patty, cheese, fresh veggies.', image: U('photo-1568901346375-23c9450c58cd') },
      { id: 'S4-P2', name: 'Zinger Chicken Burger', price: 280, category: 'Burgers', stock: 30, status: 'In Stock', unit: '1 pc', desc: 'Crispy fried chicken zinger.', image: U('photo-1550547660-d9450f859349') },
      { id: 'S4-P3', name: 'French Fries (Large)', price: 130, category: 'Sides', stock: 60, status: 'In Stock', unit: 'large', desc: 'Golden crispy fries with dip.', image: U('photo-1573080496219-bb080dd4f877') },
      { id: 'S4-P4', name: 'BBQ Wings (6 pc)', price: 260, category: 'Sides', stock: 20, status: 'In Stock', unit: '6 pcs', desc: 'Smoky grilled BBQ wings.', image: U('photo-1567620832903-9fc6debc209f') },
      { id: 'S4-P5', name: 'Chocolate Shake', price: 190, category: 'Drinks', stock: 12, status: 'In Stock', unit: '1 glass', desc: 'Thick cold chocolate milkshake.', image: U('photo-1572490122747-3968b75cc699') },
      { id: 'S4-P6', name: 'Cold Coffee', price: 170, category: 'Drinks', stock: 9, status: 'Low Stock', unit: '1 glass', desc: 'Iced blended coffee.', image: U('photo-1461023058943-07fcbe16d735') },
      { id: 'S4-P7', name: 'Cheese Fries', price: 180, category: 'Sides', stock: 0, status: 'Out of Stock', unit: '1 box', desc: 'Fries loaded with cheese sauce.', image: U('photo-1541592106381-b31e9677c0e5') },
    ]
  },
  {
    id: 'S5', name: 'MedPlus', subtext: 'Pharmacy', category: 'Pharmacy',
    badgeColor: 'bg-blue-600 text-white', rating: 4.6, reviewsCount: '210+',
    deliveryTime: '30-40 min', deliveryFee: 40,
    image: U('photo-1586015555751-63bb77f4322a'), logoText: 'MP', logoBg: 'bg-blue-100 text-blue-800',
    pickup: { lat: 23.8096, lng: 90.4144 },
    catalog: [
      { id: 'S5-P1', name: 'Paracetamol 500mg (20)', price: 30, category: 'Pain Relief', stock: 100, status: 'In Stock', unit: '20 tabs', desc: 'Fever & headache relief tablets.', image: U('photo-1584308666744-24d5c474f2ae') },
      { id: 'S5-P2', name: 'Vitamin C 1000mg (30)', price: 450, category: 'Vitamins', stock: 40, status: 'In Stock', unit: '30 tabs', desc: 'Immune support effervescent.', image: U('photo-1587854692152-cbe660dbde88') },
      { id: 'S5-P3', name: 'Digital Thermometer', price: 250, category: 'Devices', stock: 15, status: 'In Stock', unit: '1 pc', desc: 'Fast digital body thermometer.', image: U('photo-1583947581279-4eec4ae225d1') },
      { id: 'S5-P4', name: 'Antiseptic Bandage', price: 60, category: 'First Aid', stock: 50, status: 'In Stock', unit: '1 pc', desc: 'Waterproof wound bandage.', image: U('photo-1576091160399-112ba8d25d1d') },
      { id: 'S5-P5', name: 'Hand Sanitizer 100ml', price: 110, category: 'First Aid', stock: 5, status: 'Low Stock', unit: '100 ml', desc: '70% alcohol hand sanitiser.', image: U('photo-1585386959984-a4155224a1ad') },
      { id: 'S5-P6', name: 'BP Monitor (Digital)', price: 1850, category: 'Devices', stock: 8, status: 'In Stock', unit: '1 pc', desc: 'Automatic arm blood pressure monitor.', image: U('photo-1584384358998-1c3b19760f2f') },
      { id: 'S5-P7', name: 'Antacid 250ml', price: 140, category: 'Digestive', stock: 0, status: 'Out of Stock', unit: '250 ml', desc: 'Fast heartburn & acidity relief.', image: U('photo-1471864190281-a93a3070b6de') },
    ]
  },
  {
    id: 'S6', name: 'Fresh Valley', subtext: 'Fruits & Vegetables', category: 'Fruits & Veg',
    badgeColor: 'bg-green-700 text-white', rating: 4.5, reviewsCount: '160+',
    deliveryTime: '20-30 min', deliveryFee: 30,
    image: U('photo-1610832958506-aa56368176cf'), logoText: 'FV', logoBg: 'bg-green-100 text-green-800',
    pickup: { lat: 23.7864, lng: 90.4097 },
    catalog: [
      { id: 'S6-P1', name: 'Ripe Mangoes (Alphonso)', price: 150, category: 'Fruits', stock: 40, status: 'In Stock', unit: '1 kg', desc: 'Sweet juicy seasonal mangoes.', image: U('photo-1553279768-865429fa0078') },
      { id: 'S6-P2', name: 'Seedless Watermelon', price: 160, category: 'Fruits', stock: 20, status: 'In Stock', unit: '1 pc', desc: 'Fresh whole watermelon.', image: U('photo-1587049352846-4a222e784d38') },
      { id: 'S6-P3', name: 'Cucumber', price: 40, category: 'Vegetables', stock: 70, status: 'In Stock', unit: '500 g', desc: 'Crisp fresh cucumbers.', image: U('photo-1604977042946-1eecc30f269e') },
      { id: 'S6-P4', name: 'Carrot', price: 70, category: 'Vegetables', stock: 55, status: 'In Stock', unit: '1 kg', desc: 'Fresh orange carrots.', image: U('photo-1447175008436-054170c2e979') },
      { id: 'S6-P5', name: 'Green Coriander', price: 25, category: 'Herbs', stock: 30, status: 'In Stock', unit: '100 g', desc: 'Fresh coriander leaves.', image: U('photo-1532336414038-cf19250c5757') },
      { id: 'S6-P6', name: 'Ginger', price: 130, category: 'Vegetables', stock: 6, status: 'Low Stock', unit: '500 g', desc: 'Fresh local ginger.', image: U('photo-1596040033229-a9821ebd058d') },
      { id: 'S6-P7', name: 'Strawberries', price: 290, category: 'Fruits', stock: 0, status: 'Out of Stock', unit: '250 g', desc: 'Imported fresh strawberries.', image: U('photo-1464965911861-746a04b4bca6') },
    ]
  },
  {
    id: 'S7', name: 'Meat Express', subtext: 'Meat & Fish Shop', category: 'Meat & Fish',
    badgeColor: 'bg-rose-700 text-white', rating: 4.3, reviewsCount: '120+',
    deliveryTime: '30-40 min', deliveryFee: 50,
    image: U('photo-1607623814075-e51df1bdc82f'), logoText: 'ME', logoBg: 'bg-rose-100 text-rose-800',
    pickup: { lat: 23.7998, lng: 90.3665 },
    catalog: [
      { id: 'S7-P1', name: 'Beef (Boneless)', price: 980, category: 'Beef', stock: 30, status: 'In Stock', unit: '1 kg', desc: 'Fresh local beef, cut to order.', image: U('photo-1544025162-d76694265947') },
      { id: 'S7-P2', name: 'Broiler Chicken', price: 230, category: 'Chicken', stock: 45, status: 'In Stock', unit: '1 kg', desc: 'Fresh dressed broiler chicken.', image: U('photo-1604503468506-a8da13d82791') },
      { id: 'S7-P3', name: 'Rui Fish', price: 420, category: 'Fish', stock: 20, status: 'In Stock', unit: '1 kg', desc: 'Fresh pond rui fish.', image: U('photo-1498654200943-1088dd4438ae') },
      { id: 'S7-P4', name: 'Mutton (Boneless)', price: 1350, category: 'Mutton', stock: 12, status: 'In Stock', unit: '1 kg', desc: 'Tender local mutton.', image: U('photo-1602470520998-f4a52199a3d6') },
      { id: 'S7-P5', name: 'Shrimp (Medium)', price: 850, category: 'Fish', stock: 8, status: 'Low Stock', unit: '1 kg', desc: 'Medium size fresh shrimp.', image: U('photo-1559737558-2f5a35f4523b') },
      { id: 'S7-P6', name: 'Beef Liver', price: 320, category: 'Beef', stock: 0, status: 'Out of Stock', unit: '500 g', desc: 'Fresh beef liver.', image: U('photo-1579895994587-0711b75ea737') },
    ]
  },
  {
    id: 'S8', name: 'Cake Cottage', subtext: 'Bakery · Cakes', category: 'Bakery',
    badgeColor: 'bg-purple-600 text-white', rating: 4.7, reviewsCount: '190+',
    deliveryTime: '25-35 min', deliveryFee: 40,
    image: U('photo-1578985545062-69928b1d9587'), logoText: 'CC', logoBg: 'bg-purple-100 text-purple-800',
    pickup: { lat: 23.7917, lng: 90.4192 },
    catalog: [
      { id: 'S8-P1', name: 'Black Forest Cake', price: 950, category: 'Cakes', stock: 10, status: 'In Stock', unit: '1 kg', desc: 'Classic chocolate cherry black forest.', image: U('photo-1578985545062-69928b1d9587') },
      { id: 'S8-P2', name: 'Chocolate Truffle Cake', price: 1100, category: 'Cakes', stock: 8, status: 'In Stock', unit: '1 kg', desc: 'Rich Belgian chocolate truffle.', image: U('photo-1587248720327-8eb72564be1e') },
      { id: 'S8-P3', name: 'Vanilla Cupcake', price: 120, category: 'Pastries', stock: 24, status: 'In Stock', unit: '1 pc', desc: 'Fluffy vanilla cupcake with frosting.', image: U('photo-1574085733277-851d9d856a3a') },
      { id: 'S8-P4', name: 'Butter Croissant', price: 90, category: 'Pastries', stock: 18, status: 'In Stock', unit: '1 pc', desc: 'Flaky buttery croissant.', image: U('photo-1555507036-ab1f4038808a') },
      { id: 'S8-P5', name: 'Chocolate Chip Cookie', price: 80, category: 'Biscuits', stock: 40, status: 'In Stock', unit: '1 pc', desc: 'Warm gooey chocolate chip cookie.', image: U('photo-1499636136210-6f4ee915583e') },
      { id: 'S8-P6', name: 'Red Velvet Slice', price: 250, category: 'Cakes', stock: 5, status: 'Low Stock', unit: '1 slice', desc: 'Cream cheese red velvet slice.', image: U('photo-1606983340126-99ab4feaa64a') },
      { id: 'S8-P7', name: 'Brownie (4 pc)', price: 320, category: 'Pastries', stock: 0, status: 'Out of Stock', unit: '4 pcs', desc: 'Fudgy walnut brownies.', image: U('photo-1606313564200-e75d5e30476c') },
    ]
  },
];

const BN_NAMES: Record<string, string> = {
  'Fresh Mart': 'ফ্রেশ মার্ট',
  'Daily Shopper': 'ডেইলি শপার',
  'Spice Garden': 'স্পাইস গার্ডেন',
  'Burger House': 'বার্গার হাউস',
  'MedPlus': 'মেডপ্লাস',
  'Fresh Valley': 'ফ্রেশ ভ্যালি',
  'Meat Express': 'মিট এক্সপ্রেস',
  'Cake Cottage': 'কেক কটেজ',
  'Fresh Apples (Premium)': 'তাজা আপেল (প্রিমিয়াম)',
  'Organic Bananas': 'অর্গানিক কলা',
  'Miniket Rice 5kg': 'মিনিকেট চাল ৫ কেজি',
  'Whole Milk 1L': 'ফুল ক্রিম দুধ ১ লিটার',
  'Fresh Farm Eggs (Dozen)': 'তাজা ফার্ম ডিম (১ ডজন)',
  'Brown Bread 400g': 'ব্রাউন ব্রেড ৪০০ গ্রাম',
  'Tomatoes (Local)': 'টমেটো (দেশি)',
  'Onion (Local)': 'পেঁয়াজ (দেশি)',
  'Soybean Oil 2L': 'সয়াবিন তেল ২ লিটার',
  'White Sugar 1kg': 'সাদা চিনি ১ কেজি',
  'Toilet Paper 12 Roll': 'টয়লেট পেপার ১২ রোল',
  'Detergent Powder 1kg': 'ডিটারজেন্ট পাউডার ১ কেজি',
  'Dishwash Liquid 500ml': 'ডিশওয়াশ লিকুইড ৫০০ মিলি',
  'Shampoo 350ml': 'শ্যাম্পু ৩৫০ মিলি',
  'Toothpaste 150g': 'টুথপেস্ট ১৫০ গ্রাম',
  'Bath Soap (3 Pack)': 'বাথ সাবান (৩ প্যাক)',
  'Instant Noodles (5 Pack)': 'ইনস্ট্যান্ট নুডলস (৫ প্যাক)',
  'Family Biscuits 500g': 'ফ্যামিলি বিস্কুট ৫০০ গ্রাম',
  'Kacchi Biryani': 'কাচ্চি বিরিয়ানি',
  'Chicken Biryani': 'চিকেন বিরিয়ানি',
  'Beef Bhuna': 'গরুর ভুনা',
  'Tandoori Chicken (Half)': 'তন্দুরি চিকেন (অর্ধেক)',
  'Garlic Naan': 'গার্লিক নান',
  'Veg Curry & Rice': 'সবজি তরকারি ও ভাত',
  'Misti Doi': 'মিষ্টি দই',
  'Lemon Mint Sharbat': 'লেবু মিন্ট শরবত',
  'Classic Beef Burger': 'ক্লাসিক বিফ বার্গার',
  'Zinger Chicken Burger': 'জিঙ্গার চিকেন বার্গার',
  'French Fries (Large)': 'ফ্রেঞ্চ ফ্রাই (লার্জ)',
  'BBQ Wings (6 pc)': 'বিবিকিউ উইংস (৬ পিস)',
  'Chocolate Shake': 'চকলেট শেক',
  'Cold Coffee': 'কোল্ড কফি',
  'Cheese Fries': 'চিজ ফ্রাই',
  'Paracetamol 500mg (20)': 'প্যারাসিটামল ৫০০মিগ্রা (২০)',
  'Vitamin C 1000mg (30)': 'ভিটামিন সি ১০০০মিগ্রা (৩০)',
  'Digital Thermometer': 'ডিজিটাল থার্মোমিটার',
  'Antiseptic Bandage': 'অ্যান্টিসেপটিক ব্যান্ডেজ',
  'Hand Sanitizer 100ml': 'হ্যান্ড স্যানিটাইজার ১০০ মিলি',
  'BP Monitor (Digital)': 'বিপি মনিটর (ডিজিটাল)',
  'Antacid 250ml': 'অ্যান্টাসিড ২৫০ মিলি',
  'Ripe Mangoes (Alphonso)': 'পাকা আম (আলফানসো)',
  'Seedless Watermelon': 'বীজবিহীন তরমুজ',
  'Cucumber': 'শসা',
  'Carrot': 'গাজর',
  'Green Coriander': 'ধনেপাতা',
  'Ginger': 'আদা',
  'Strawberries': 'স্ট্রবেরি',
  'Beef (Boneless)': 'গরুর মাংস (বোনলেস)',
  'Broiler Chicken': 'ব্রয়লার মুরগি',
  'Rui Fish': 'রুই মাছ',
  'Mutton (Boneless)': 'খাসির মাংস (বোনলেস)',
  'Shrimp (Medium)': 'চিংড়ি (মাঝারি)',
  'Beef Liver': 'গরুর কলিজা',
  'Black Forest Cake': 'ব্ল্যাক ফরেস্ট কেক',
  'Chocolate Truffle Cake': 'চকলেট ট্রাফল কেক',
  'Vanilla Cupcake': 'ভ্যানিলা কাপকেক',
  'Butter Croissant': 'বাটার ক্রোয়াসাঁ',
  'Chocolate Chip Cookie': 'চকলেট চিপ কুকি',
  'Red Velvet Slice': 'রেড ভেলভেট স্লাইস',
  'Brownie (4 pc)': 'ব্রাউনি (৪ পিস)',
};

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

const BANNERS = [
  { emoji: '🛒', title: 'Eid Special Sale', sub: 'Biggest festival discount up to 40% off', bg: 'from-emerald-500 to-teal-500', cta: 'Shop Now' },
  { emoji: '🍕', title: 'Free Delivery', sub: 'On all orders above ৳500', bg: 'from-orange-400 to-orange-400', cta: 'Order Food' },
  { emoji: '💊', title: 'Medicine in 30 min', sub: 'MedPlus pharmacy now at your doorstep', bg: 'from-sky-500 to-sky-400', cta: 'Order Medicine' },
  { emoji: '🥭', title: 'Fresh Fruits & Veg', sub: 'Farm-fresh daily from Fresh Valley', bg: 'from-green-500 to-emerald-400', cta: 'Buy Fresh' },
];

const COUPONS = [
  { code: 'EID2024', discountText: '৳100 Flat Discount', desc: 'On orders above ৳500 from any store', validTill: '31 Aug 2026', discountValue: 100, minOrder: 500 },
  { code: 'FREESHIP', discountText: 'Free Delivery', desc: '100% free delivery on all grocery orders', validTill: '15 Aug 2026', isFreeShip: true, discountValue: 0, minOrder: 200 },
  { code: 'SUMMER15', discountText: '15% Off (max ৳150)', desc: 'On bakery & restaurant orders above ৳400', validTill: '10 Aug 2026', discountValue: 150, minOrder: 400 },
  { code: 'SMARTSHOP', discountText: '৳50 Smart Cashback', desc: 'Direct cashback to your wallet', validTill: '31 Dec 2026', discountValue: 50, minOrder: 0 },
];

const LS_KEYS = {
  favs: 'ss_favs',
  addr: 'ss_addr',
  pays: 'ss_pays',
  wallet: 'ss_wallet_v2',
  wtxn: 'ss_wtxn_v2',
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
    couponCode: 'Coupon code (EID2024)',
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
    expiredMsg: 'This payment window has expired to prevent fake orders. Your cart is untouched — start again to place a fresh order.',
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
    recoverViaGmail: 'Reset via your connected Gmail',
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
    couponCode: 'কুপন কোড (EID2024)',
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
    recoverViaGmail: 'আপনার সংযুক্ত Gmail দিয়ে রিসেট করুন',
  },
};

const LOYALTY_TIERS = [
  { key: 'standard' as const, label: 'Standard Member', minSpend: 0, cashbackPct: 1, color: 'bg-gray-600', icon: '★' },
  { key: 'silver' as const, label: 'Silver VIP', minSpend: 3000, cashbackPct: 3, color: 'bg-slate-400', icon: '🥈' },
  { key: 'gold' as const, label: 'Gold VIP', minSpend: 10000, cashbackPct: 5, color: 'bg-amber-500', icon: '🥇' },
];

const AVATAR_COLORS = ['bg-emerald-600', 'bg-orange-500', 'bg-blue-600', 'bg-rose-600', 'bg-violet-600', 'bg-teal-600', 'bg-amber-500', 'bg-indigo-600'];
const hashColor = (s: string) => AVATAR_COLORS[Math.abs(s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];
const initialsOf = (s: string) => (s || '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

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

  const [customerNotifs, setCustomerNotifs] = useState<CustomerNotif[]>(() => getStoredData(LS_KEYS.notifs, []));
  useEffect(() => setStoredData(LS_KEYS.notifs, customerNotifs), [customerNotifs]);

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


  const unreadNotifCount = customerNotifs.filter(n => !n.read).length;
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

  // Live admin-inventory sync: admin price/stock changes flow into the customer catalog
  const syncedStores = useMemo(() => {
    const override = new globalThis.Map<string, { price: number; stock: number }>();
    for (const p of products) {
      override.set(p.name.toLowerCase(), { price: p.price, stock: p.stock });
    }
    return STORE_DEFS.map(s => ({
      ...s,
      catalog: s.catalog.map(prod => {
        const ov = override.get(prod.name.toLowerCase());
        if (!ov) return prod;
        const stock = ov.stock;
        return { ...prod, price: ov.price, stock, status: stock === 0 ? 'Out of Stock' : (stock <= 8 ? 'Low Stock' : 'In Stock') };
      })
    }));
  }, [products]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'Recommended' | 'Rating' | 'Fastest'>('Recommended');

  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>(() => getStoredData(LS_KEYS.favs, ['S1', 'S3']));
  useEffect(() => setStoredData(LS_KEYS.favs, favoriteStoreIds), [favoriteStoreIds]);

  const [cart, setCart] = useState<Array<{ product: StoreProduct; quantity: number; note?: string }>>(() => getStoredData(LS_KEYS.cart, []));
  useEffect(() => setStoredData(LS_KEYS.cart, cart), [cart]);

  const [selectedStore, setSelectedStore] = useState<StoreDef | null>(null);
  const [storeCat, setStoreCat] = useState<string>('All');
  const [storeSearch, setStoreSearch] = useState<string>('');

  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; isFreeShip?: boolean } | null>(null);
  const [couponInput, setCouponInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Upay' | 'Rocket' | 'Cash on Delivery' | 'Card' | 'Split (Wallet + bKash)'>('bKash');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('House 42, Road 8A, Dhanmondi, Dhaka');
  const [customerPhone, setCustomerPhone] = useState<string>('01712-345678');

  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const [addresses, setAddresses] = useState<SavedAddress[]>(() => getStoredData(LS_KEYS.addr, [
    { id: 'ADDR-1', title: 'Home', address: 'House 42, Road 8A, Flat 4B', area: 'Dhanmondi, Dhaka 1209', phone: '01712-345678', isDefault: true },
    { id: 'ADDR-2', title: 'Office', address: 'Level 7, Tower 14, Gulshan Avenue', area: 'Gulshan-1, Dhaka 1212', phone: '01819-987654', isDefault: false }
  ]));
  useEffect(() => setStoredData(LS_KEYS.addr, addresses), [addresses]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddrTitle, setNewAddrTitle] = useState('Home');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrArea, setNewAddrArea] = useState('Dhanmondi, Dhaka');
  const [newAddrPhone, setNewAddrPhone] = useState('01712-345678');

  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>(() => getStoredData(LS_KEYS.pays, [
    { id: 'PAY-1', type: 'bKash', accountName: 'Rahim Khan', accountNumber: '01712-345678', isDefault: true, pin: '12345' },
    { id: 'PAY-2', type: 'Nagad', accountName: 'Rahim Khan', accountNumber: '01819-987654', isDefault: false, pin: '24680' },
    { id: 'PAY-3', type: 'Card', accountName: 'Rahim Khan (DBBL Visa)', accountNumber: '**** **** **** 4821', isDefault: false }
  ]));
  useEffect(() => setStoredData(LS_KEYS.pays, paymentMethods), [paymentMethods]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayType, setNewPayType] = useState<'bKash' | 'Nagad' | 'Card'>('bKash');
  const [newPayAccount, setNewPayAccount] = useState('');

  const [walletBalance, setWalletBalance] = useState<number>(() => getStoredData(LS_KEYS.wallet, 0));
  useEffect(() => setStoredData(LS_KEYS.wallet, walletBalance), [walletBalance]);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [addMoneyStep, setAddMoneyStep] = useState<'method' | 'otp'>('method');
  const [addMoneyMethod, setAddMoneyMethod] = useState<'bKash' | 'Nagad' | 'Card'>('bKash');
  const [addMoneyAmount, setAddMoneyAmount] = useState('500');
  const [addMoneyPhone, setAddMoneyPhone] = useState('');
  const [addMoneyCard, setAddMoneyCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [addMoneyOtp, setAddMoneyOtp] = useState('');
  const [addMoneyOtpInput, setAddMoneyOtpInput] = useState('');
  const [addMoneySentTo, setAddMoneySentTo] = useState('');
  const [addMoneyError, setAddMoneyError] = useState('');
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => getStoredData(LS_KEYS.wtxn, []));
  useEffect(() => setStoredData(LS_KEYS.wtxn, walletTransactions), [walletTransactions]);
  const [splitPinInput, setSplitPinInput] = useState('');

  const [tickets, setTickets] = useState<SupportTicketItem[]>(() => getStoredData(LS_KEYS.tickets, []));
  useEffect(() => setStoredData(LS_KEYS.tickets, tickets), [tickets]);
  const [isNewTicketModal, setIsNewTicketModal] = useState(false);
  const [policyModal, setPolicyModal] = useState<'terms' | 'privacy' | 'refund' | null>(null);
  const [ticketCategory, setTicketCategory] = useState('Order Delivery');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDetail, setTicketDetail] = useState('');

  const [customerProfile, setCustomerProfile] = useState(() => getStoredData(LS_KEYS.profile, { name: 'Rahim Khan', email: 'rahim.khan@example.com', phone: '01712-345678', sms: true, emailNotif: true, pushNotif: true, profilePic: '' }));
  useEffect(() => setStoredData(LS_KEYS.profile, customerProfile), [customerProfile]);

  const [pwd, setPwd] = useState({ old: '', fresh: '', confirm: '' });
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(true);
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

  // Auto-expiry: cancel pending-payment orders whose window lapsed (fake-order cleanup)
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
    onAddOrder(orderBase);
    const cashback = Math.round(orderBase.amount * (tier.cashbackPct / 100));
    if (cashback > 0) {
      setWalletBalance(prev => prev + cashback);
      setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Cashback', amount: cashback, date: 'Just now', status: 'Completed' }, ...prev]);
      setTotalSpend(prev => prev + orderBase.amount);
      setCustomerNotifs(prev => [{
        id: `CN-${Date.now().toString().slice(-4)}`, title: `${tier.icon} ${tier.label} Cashback`,
        body: `৳${cashback} cashback credited to your wallet.`, emoji: tier.icon, time: 'Just now', read: false
      }, ...prev]);
    }
    if (appliedCoupon?.code === 'SMARTSHOP') {
      setWalletBalance(prev => prev + 50);
      setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Cashback', amount: 50, date: 'Just now', status: 'Completed' }, ...prev]);
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

  const handlePlaceCustomerOrder = () => {
    if (cart.length === 0) {
      showToast('Your cart is empty. Add items to order!', 'info');
      return;
    }
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

  const confirmPayment = () => {
    const targetStore = selectedStore || (cart[0] ? syncedStores.find(s => s.catalog.some(c => c.id === cart[0].product.id)) || null : null);
    if (!targetStore) {
      showToast('Please choose a store first to place your order.', 'info');
      return;
    }
    const areaMatch = deliveryAddress.match(/(Dhanmondi|Gulshan|Banani|Mirpur|Motijheel|Uttara|Badda|Tejgaon|Farmgate|Shahbagh)/i);
    const areaName = areaMatch ? areaMatch[1] : 'Dhanmondi';
    const dest = deliveryPin || AREA_COORDS[areaName] || [23.7539, 90.3836];
    const estimated = parseInt(targetStore.deliveryTime) || 35;
    const assigned = liveDriverOf({ storeName: targetStore.name, pickupCoords: targetStore.pickup } as Order);
    const deliveryPinCode = String(Math.floor(1000 + Math.random() * 9000));

    // Split payment: deduct wallet portion now
    let splitDeduct = 0;
    if (paymentMethod === 'Split (Wallet + bKash)' && splitWalletAmount > 0) {
      splitDeduct = Math.min(splitWalletAmount, walletBalance, cartGrandTotal);
      setWalletBalance(prev => prev - splitDeduct);
      setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Order Payment', amount: -splitDeduct, date: 'Just now', status: 'Completed' }, ...prev]);
    }

    const isSendMoney = payModal !== null && SEND_MONEY_METHODS.includes(payModal as WalletKey);
    const trxId = (sendMoney.trxId || '').trim().toUpperCase();

    finishOrder({
      customerName: customerProfile.name,
      storeName: targetStore.name,
      amount: cartGrandTotal,
      status: isSendMoney ? 'Pending' : 'Confirmed',
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
      pickupCoords: targetStore.pickup,
      pickupLocation: targetStore.name,
      driverId: assigned ? assigned.id : undefined,
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
    setDeliveryPin(null);
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
    confirmPayment();
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
      onUpdateOrder({ ...ord, status: 'Cancelled' });
      setWalletBalance(prev => prev + ord.amount);
      setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: 'Refund', amount: ord.amount, date: 'Just now', status: 'Completed' }, ...prev]);
      setCustomerNotifs(prev => [{
        id: `CN-${Date.now().toString().slice(-4)}`, title: '↩️ Order Cancelled',
        body: `Order #${ord.id} was cancelled. ৳${ord.amount} refunded to wallet.`, emoji: '↩️', time: 'Just now', read: false
      }, ...prev]);
      showToast(`Order #${ord.id} cancelled — ৳${ord.amount} refunded to wallet`, 'info');
    }
    setCancelConfirmId(null);
  };

  const submitRiderRating = () => {
    if (!rateRiderOrder) return;
    const drv = liveDriverOf(rateRiderOrder);
    const driverName = drv ? drv.name : rateRiderOrder.driverId || 'Your Rider';
    setRiderRatings(prev => ({ ...prev, [rateRiderOrder.id]: { driverName, score: riderRateVal } }));
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
      custLat: dv.lat, custLng: dv.lng, custName: (trackingOrder.address || deliveryAddress).split(',').pop()?.trim() || 'Your Address'
    };
  }, [trackingOrder, trackingDriver, trackProgress]);

  const etaMins = Math.max(1, Math.round((parseInt(trackingOrder?.estimatedMinutes ? String(trackingOrder.estimatedMinutes) : '35') || 35) * (1 - trackProgress)));
  const activeStepIdx = ETA_STEPS.filter(s => trackProgress >= s.min).length - 1;

  // Auto-advance order status from rider progress + auto notifications (self-sufficient customer demo)
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
      (pos) => {
        setDeliveryPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // Auto-fill the delivery address text from the pinned location — in Bangla or English
        const area = nearestAreaOf(pos.coords.latitude, pos.coords.longitude);
        const addrText = lang === 'bn'
          ? `আপনার বর্তমান অবস্থান, ${AREA_NAMES_BN[area]}, ঢাকা`
          : `Your current location, ${area}, Dhaka`;
        setDeliveryAddress(addrText);
        showToast('Current location pinned — address updated', 'success');
      },
      () => showToast('Could not fetch location — drag the pin to place it manually', 'info'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet) return;    const newAddrObj: SavedAddress = {
      id: `ADDR-${Date.now().toString().slice(-3)}`,
      title: newAddrTitle, address: newAddrStreet, area: newAddrArea, phone: newAddrPhone,
      isDefault: addresses.length === 0
    };
    setAddresses(prev => [...prev, newAddrObj]);
    setIsAddingAddress(false);
    setNewAddrStreet('');
    showToast('New delivery address saved successfully!', 'success');
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
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setAddMoneyOtp(otp);
    setAddMoneyOtpInput('');
    setAddMoneyError('');
    setAddMoneySentTo(addMoneyMethod === 'Card' ? `card **** ${addMoneyCard.number.replace(/\D/g, '').slice(-4)}` : addMoneyPhone.trim());
    setAddMoneyStep('otp');
    showToast('OTP sent — check your phone / registered number', 'info');
  };

  const confirmAddMoney = () => {
    const num = parseFloat(addMoneyAmount);
    if (addMoneyOtpInput.trim() !== addMoneyOtp) { setAddMoneyError('Incorrect OTP — please check the code sent to you'); return; }
    setWalletBalance(prev => prev + num);
    setWalletTransactions(prev => [{ id: `TXN-${Date.now().toString().slice(-3)}`, type: `Add Money (${addMoneyMethod})`, amount: num, date: 'Just now', status: 'Completed' }, ...prev]);
    setAddMoneyOpen(false);
    setAddMoneyStep('method');
    setAddMoneyOtp('');
    setAddMoneyOtpInput('');
    showToast(`৳${num.toLocaleString()} added to your wallet via ${addMoneyMethod}!`, 'success');
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDetail) return;
    setTickets(prev => [{
      id: `TCK-${Math.floor(100 + Math.random() * 900)}`, subject: ticketSubject, category: ticketCategory, status: 'In Progress', date: 'Just now', lastMessage: ticketDetail
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
            <div className="hidden lg:flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200/80 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 cursor-pointer transition-colors border border-gray-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dhanmondi, Dhaka</span>
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
                      <span onClick={() => { setCustomerNotifs(prev => prev.map(n => ({ ...n, read: true }))); showToast(T.markAllRead, 'info'); }} className="text-[10px] text-emerald-400 cursor-pointer">{T.markAllRead}</span>
                    )}
                  </div>
                  <div className="py-2 space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                    {customerNotifs.length === 0 ? (
                      <p className="text-gray-400 py-2 text-center">No notifications</p>
                    ) : customerNotifs.map(n => (
                      <div
                        key={n.id}
                        onClick={() => setCustomerNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
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
                    <Settings className="w-4 h-4 text-gray-400" /><span>My Account Settings</span>
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
                onClick={() => { setSelectedCategory('All'); setActiveNav('Orders'); showToast('Browsing free delivery stores', 'info'); }}
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
              <p className="text-[9px] text-white/75">Total spend: ৳{totalSpend.toLocaleString()}</p>
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
                  <p className="text-xs text-gray-500 mt-0.5">{searchQuery ? `"${searchQuery}"` : ''} {filteredStores.length} {T.storeMatches.toLowerCase()} delivering to Dhanmondi</p>
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
                                    {drv.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()}
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
                              ⏳ Tracking opens once admin verifies & approves your payment.
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
                <button onClick={() => setIsAddingAddress(!isAddingAddress)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2">
                  <Plus className="w-4 h-4" /><span>Add New Address</span>
                </button>
              </div>

              {isAddingAddress && (
                <form onSubmit={handleAddAddressSubmit} className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800">New Address Details</h3>
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
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Area / Thana / City</label>
                      <input type="text" value={newAddrArea} onChange={(e) => setNewAddrArea(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-emerald-500" required />
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Save Address</button>
                    <button type="button" onClick={() => setIsAddingAddress(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Cancel</button>
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
                      <p className="text-xs text-gray-500 font-mono">📱 {addr.phone}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-bold">
                      <button onClick={() => { setDeliveryAddress(`${addr.address}, ${addr.area}`); showToast(`Set ${addr.title} as active delivery address`, 'info'); }} className="text-emerald-700 hover:underline">
                        Use for Orders
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
                        {pm.isDefault && <span className="text-[10px] font-bold text-emerald-600">Default Method</span>}
                      </div>
                      <p className="text-sm font-bold text-gray-900">{pm.accountName}</p>
                      <p className="text-xs font-mono text-gray-500">{pm.accountNumber}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
                      <button onClick={() => { setPaymentMethod(pm.type as any); showToast(`Selected ${pm.type} as primary checkout method`, 'info'); }} className="text-emerald-700 font-bold">
                        Set as Active
                      </button>
                      <button onClick={() => { setPaymentMethods(prev => prev.filter(p => p.id !== pm.id)); showToast('Payment account unlinked', 'info'); }} className="text-red-500 font-bold">
                        Unlink
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
                  <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Smart Shop Cash Wallet</span>
                  <p className="text-3xl font-black font-mono">৳{walletBalance.toLocaleString()}</p>
                  <p className="text-[11px] text-emerald-100">Use instant wallet balance for 1-click order checkout!</p>
                </div>
                <div className="shrink-0 w-full sm:w-72">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200 mb-2">Smart Wallet</p>
                  <button
                    onClick={() => { setAddMoneyOpen(true); setAddMoneyStep('method'); setAddMoneyError(''); }}
                    className="w-full py-3 bg-white text-emerald-800 font-black text-xs rounded-2xl shadow-lg hover:bg-emerald-50 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" /><span>Add Money</span>
                  </button>
                  <p className="text-[9px] text-emerald-100 mt-2">Card or bKash / Nagad with OTP verification</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Wallet Transaction History</h3>
                <div className="divide-y divide-gray-100">
                  {walletTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-900">{tx.type}</p>
                        <p className="text-[10px] text-gray-400">{tx.date} • {tx.id}</p>
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
                      <h3 className="text-sm font-black uppercase tracking-wider">Secure Wallet</h3>
                      <p className="text-[11px] text-emerald-100">Every transaction is protected. Add money with bKash, Nagad or Card and pay in one tap.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-100/80">Your balance is safe with Smart Shop. Order payments and cashback update instantly in your transaction history.</p>
                </div>
              </div>
            </div>
          )}

          {/* ============ COUPONS ============ */}
          {activeNav === 'Coupons' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Active Promo Vouchers</h2>
                <p className="text-xs text-gray-500 mt-0.5">Apply discount codes to save big on your groceries and food orders</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COUPONS.map((cp) => (
                  <div key={cp.code} className="bg-white border border-dashed border-emerald-300 rounded-2xl p-5 shadow-xs flex items-center justify-between bg-emerald-50/30">
                    <div className="space-y-1">
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-mono font-black text-xs">{cp.code}</span>
                      <h4 className="font-bold text-sm text-gray-900 pt-1">{cp.discountText}</h4>
                      <p className="text-xs text-gray-500">{cp.desc}</p>
                      <p className="text-[10px] text-gray-400 font-mono">Min order ৳{cp.minOrder} • Expires {cp.validTill}</p>
                    </div>
                    <button
                      onClick={() => { setCopiedCoupon(cp.code); handleApplyCouponCode(cp.code); setTimeout(() => setCopiedCoupon(null), 3000); }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center space-x-1"
                    >
                      {copiedCoupon === cp.code ? (<><Check className="w-3.5 h-3.5" /><span>Applied</span></>) : (<><Copy className="w-3.5 h-3.5" /><span>Use Code</span></>)}
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
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Help & Customer Support</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Submit support tickets or resolve delivery questions</p>
                </div>
                <button onClick={() => setIsNewTicketModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2">
                  <Plus className="w-4 h-4" /><span>Open Support Ticket</span>
                </button>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Your Support Requests</h3>
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
                          <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider mb-0.5">Admin response</p>
                          <p className="text-xs text-emerald-900">{adminR.adminReply}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                <button type="button" onClick={() => setShowProfileCard(!showProfileCard)} className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
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
                          {customerProfile.profilePic ? <img src={customerProfile.profilePic} alt={customerProfile.name} className="w-full h-full object-cover" /> : customerProfile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
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
                        <p className="text-[10px] text-gray-400 mt-0.5">{T.tapCameraHint || 'Tap the camera icon to change your profile picture'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preferences toggles */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs">
                <button type="button" onClick={() => setShowPrefsCard(!showPrefsCard)} className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <span className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span className="font-black text-gray-900 text-sm">Preferences</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPrefsCard ? 'rotate-180' : ''}`} />
                </button>
                {showPrefsCard && (
                  <div className="px-6 pb-6 pt-4 border-t border-gray-100 space-y-4 text-xs">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-gray-800 flex items-center space-x-2">
                        <span className="text-base">{dark ? '🌙' : '☀️'}</span><span>{dark ? 'Dark Mode' : 'Light Mode'}</span>
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
                  </div>
                )}
              </div>

              {/* Account details */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs">
                <button type="button" onClick={() => setShowAccountForm(!showAccountForm)} className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <span className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="font-black text-gray-900 text-sm">{T.connectedGmail || 'Connected Gmail'}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAccountForm ? 'rotate-180' : ''}`} />
                </button>
                {showAccountForm && (
                  <form onSubmit={(e) => { e.preventDefault(); showToast('Account settings updated successfully!', 'success'); }} className="px-6 pb-6 pt-4 border-t border-gray-100 space-y-4 text-xs">
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
                <button type="button" onClick={() => setShowPwdForm(!showPwdForm)} className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
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
                    <button
                      type="button"
                      onClick={() => { setPwd({ old: '', fresh: '', confirm: '' }); showToast(`Password reset link sent to ${customerProfile.email}`, 'success'); }}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" /><span>{T.forgotPassword || 'Forgot password?'}</span>
                    </button>
                    <p className="text-[10px] text-gray-400 text-center">{T.recoverViaGmail || 'Reset via your connected Gmail'}</p>
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
          { key: 'Settings' as const, label: lang === 'bn' ? '??????????' : 'Account', icon: <Settings className="w-5 h-5" /> },
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
                        onMapClick={(lat, lng) => { setDeliveryPin({ lat, lng }); }}
                        onMarkerDrag={(lat, lng) => setDeliveryPin({ lat, lng })}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <button
                        type="button"
                        onClick={locateMe}
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
                    disabled={cart.length === 0}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Zap className="w-4 h-4" /><span>{T.placeOrder} (৳{cartGrandTotal})</span>
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
                      <p className="text-[10px] text-gray-400 mt-1">Demo PIN: <b className="text-gray-600 font-mono">{(paymentMethods.find(p => p.type === 'bKash')?.pin) || '12345'}</b></p>
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
                  <input type="text" value={cardInfo.name} onChange={(e) => setCardInfo({ ...cardInfo, name: e.target.value })} placeholder="RAHIM KHAN" className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-mono uppercase outline-none focus:border-emerald-500" />
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
              <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl outline-none">
                <option value="Order Delivery">Order Delivery Delay</option>
                <option value="Payment / Refund">Payment / Wallet Refund</option>
                <option value="Missing Item">Missing or Damaged Item</option>
                <option value="General Query">General Query</option>
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

      {/* ============ ADD MONEY MODAL (real flow: card/bKash/Nagad + OTP) ============ */}
      {addMoneyOpen && (
        <div className="fixed inset-0 z-[84] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">{addMoneyStep === 'otp' ? 'Verify OTP' : 'Add Money to Wallet'}</h3>
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
                  <div className="grid grid-cols-3 gap-2">
                    {(['bKash', 'Nagad', 'Card'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setAddMoneyMethod(m)}
                        className={`py-2 rounded-xl border text-center font-black text-[10px] transition-all cursor-pointer ${addMoneyMethod === m ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        {m === 'bKash' ? 'bKash' : m === 'Nagad' ? 'Nagad' : 'Card'}
                      </button>
                    ))}
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
                  Continue — Send OTP
                </button>
              </>
            ) : (
              <>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] text-gray-500 font-bold">OTP sent to {addMoneySentTo}</p>
                  <div className="bg-white border border-dashed border-emerald-300 rounded-lg px-3 py-2 font-mono font-black tracking-[0.25em] text-lg text-emerald-700 text-center select-all">
                    {addMoneyOtp}
                  </div>
                  <p className="text-[9px] text-gray-400">Enter the 6-digit code to complete ৳{parseFloat(addMoneyAmount).toLocaleString()} top-up</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">OTP Code</label>
                  <input
                    type="text"
                    value={addMoneyOtpInput}
                    onChange={(e) => setAddMoneyOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full bg-white border border-gray-300 rounded-xl p-3 text-center text-gray-900 outline-none focus:border-emerald-500 font-mono font-black text-xl tracking-[0.4em]"
                  />
                </div>
                {addMoneyError && <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-bold">{addMoneyError}</p>}
                <div className="space-y-2">
                  <button onClick={confirmAddMoney} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer">
                    Verify & Add ৳{parseFloat(addMoneyAmount).toLocaleString()}
                  </button>
                  <button onClick={() => { setAddMoneyStep('method'); setAddMoneyError(''); }} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer">
                    {T.cancel}
                  </button>
                </div>
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

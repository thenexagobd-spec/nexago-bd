/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared helpers + shared-localStorage hooks for the four role portals.
 * All portals read/write the SAME keys the admin panel uses, so data stays in
 * sync across sites in the same browser.
 */
import { useEffect, useState } from 'react';
import { Order, Driver, Product, Payment, SupportTicket, SystemNotification, User } from '../types';
import { defaultDrivers, defaultUsers, defaultPayments, defaultSupportTickets, defaultNotifications } from '../data';

export const lsGet = <T,>(key: string, d: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : d;
  } catch {
    return d;
  }
};

export const lsSet = <T,>(key: string, v: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

export const bdt = (n: number) => `৳${(n || 0).toLocaleString()}`;

export const todayStr = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function useShared<T>(key: string, fallback: T) {
  const [data, setData] = useState<T>(() => lsGet(key, fallback));
  useEffect(() => lsSet(key, data), [key, data]);
  useEffect(() => {
    const onStorage = () => setData(lsGet(key, fallback));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);
  return [data, setData] as const;
}

export const useOrders = () => useShared<Order[]>('sd_orders_v2', []);
export const useDrivers = () => useShared<Driver[]>('sd_drivers', defaultDrivers);
export const useProducts = () => useShared<Product[]>('sd_products', SEED_PRODUCTS);
export const usePayments = () => useShared<Payment[]>('sd_payments', defaultPayments);
export const useTickets = () => useShared<SupportTicket[]>('sd_tickets', defaultSupportTickets);
export const useNotifications = () => useShared<SystemNotification[]>('sd_notifications', defaultNotifications);
export const useUsers = () => useShared<User[]>('sd_users', defaultUsers);
export const useStores = () => useShared<any[]>('sd_stores', []);
export const useWalletBal = () => useShared<number>('ss_wallet_v2', 0);
export const useWalletTxns = () => useShared<any[]>('ss_wtxn_v3', []);
export const useStoreProfile = () => useShared<{ storeName: string; storeSub: string; whatsapp: string }>('sd_store_profile', { storeName: 'Smart Shop', storeSub: 'NexaGo BD Delivery', whatsapp: '8801712345678' });

export const SEED_PRODUCTS: Product[] = [
  { id: 'PROD-101', name: 'Fresh Apples (Premium)', category: 'Fruits & Vegetables', stock: 45, price: 180, status: 'In Stock', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-102', name: 'Organic Bananas', category: 'Fruits & Vegetables', stock: 120, price: 90, status: 'In Stock', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-103', name: 'Miniket Rice 5kg', category: 'Rice & Grains', stock: 35, price: 380, status: 'In Stock', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-104', name: 'Jasmine Rice 1kg', category: 'Rice & Grains', stock: 8, price: 150, status: 'Low Stock', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-105', name: 'Whole Milk 1L', category: 'Dairy & Eggs', stock: 0, price: 95, status: 'Out of Stock', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-106', name: 'Fresh Farm Eggs (Dozen)', category: 'Dairy & Eggs', stock: 80, price: 145, status: 'In Stock', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=600' },
];

export const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Confirmed: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    Processing: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    Ongoing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return map[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
};

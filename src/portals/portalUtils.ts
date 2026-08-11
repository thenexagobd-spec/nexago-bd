/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared helpers + shared-localStorage hooks for the four role portals.
 * All portals read/write the SAME keys the admin panel uses, so data stays in
 * sync across sites in the same browser.
 */
import { useEffect, useRef, useState } from 'react';
import { Order, Driver, Product, Payment, SupportTicket, SystemNotification, User } from '../types';

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
    // Notify sibling tabs (driver/admin/store...) that shared state changed so
    // their cloud sync pulls right away instead of waiting for the poll timer.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('nexago-local-write'));
  } catch {
    /* ignore */
  }
};

// ---- Live cloud sync (same engine every role site uses) ----
// Maps each shared localStorage key to its cloud state key so a push from one
// portal (driver/store/store-admin/staff) is visible live on every other site,
// exactly like the customer storefront's Live Storefront & Cloud Sync.
export const CLOUD_KEY_MAP: Record<string, string> = {
  sd_orders_v2: 'orders',
  sd_drivers: 'drivers',
  sd_products: 'products',
  sd_payments: 'payments',
  sd_tickets: 'tickets',
  sd_users: 'users',
  sd_stores: 'stores',
  sd_store_branches: 'branches',
  sd_returns: 'returns',
  ss_refunds: 'refunds',
  ss_wallet_v2: 'wallet',
  ss_wtxn_v3: 'walletTxns',
  sd_store_ratings: 'ratings',
  sd_coupons: 'coupons',
  sd_store_online: 'storeOnline',
  sd_store_profile: 'profile',
  sd_notifications: 'notifications',
  sd_driver_creds: 'driverCreds',
  sd_store_admin_apps: 'storeAdminApps',
  sd_store_admin_creds: 'storeAdminCreds',
};

// Every approved role writes its own store-scoped records. Server-side merge is
// union-by-id, so Store Admin product/stock changes sync live without dropping
// another store's data.
const CLOUD_PUSH_EXCLUDE = new Set<string>();

const API_BASE = ((import.meta.env.VITE_RELAY_BASE as string) || window.location.origin).replace(/\/+$/, '');

const cloudKeyOf = () =>
  new URLSearchParams(window.location.search).get('key') || localStorage.getItem('sd_store_key') || 'nexago-main';

export const currentCloudKey = cloudKeyOf;

export async function securityApi(path: string, body?: Record<string, any>, token?: string) {
  const key = currentCloudKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sessionToken = token || localStorage.getItem('sd_security_session') || '';
  if (sessionToken) headers['X-Session-Token'] = sessionToken;
  const res = await fetch(`${API_BASE}/api/security${path}?key=${encodeURIComponent(key)}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Security API failed: ${path}`);
  return data;
}

export async function securityAudit(action: string, detail: Record<string, any> = {}) {
  try { await securityApi('/audit', { action, ...detail }); } catch { /* old flow stays working if security API is offline */ }
}

export async function secureFileUpload(file: { name: string; type?: string; dataUrl: string }, detail: Record<string, any> = {}) {
  try {
    const data = await securityApi('/file', { name: file.name, type: file.type, dataUrl: file.dataUrl, ...detail });
    return data.file ? { ...file, secureFile: data.file, privateUrl: data.privateUrl } : file;
  } catch {
    return file;
  }
}

const unionByIdArr = <T extends { id?: any }>(a: T[], b: T[]) => {
  const byId = new Map<string, T>();
  (a || []).forEach(x => { if (x && x.id) byId.set(String(x.id), x); });
  (b || []).forEach(x => { if (x && x.id) byId.set(String(x.id), x); });
  return Array.from(byId.values());
};

// Pull the cloud state into the shared localStorage keys (union by id so a
// portal never drops data a different site wrote), then push the local snapshot
// back up so changes made here appear on every other site.
export function useCloudSync() {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'online' | 'offline'>('idle');
  useEffect(() => {
    let cancelled = false;
    const key = cloudKeyOf();
    const url = `${API_BASE}/api/state?key=${encodeURIComponent(key)}`;
    const sig = () => JSON.stringify(Object.keys(CLOUD_KEY_MAP).map(k => lsGet(k, null)));

    const pull = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return false;
        const data = await res.json();
        const state = data && data.state;
        if (!state || typeof state !== 'object') return false;
        let changed = false;
        for (const [localKey, cloudKey] of Object.entries(CLOUD_KEY_MAP)) {
          const cloudVal = (state as any)[cloudKey];
          if (cloudVal === undefined) continue;
          const localVal = lsGet<any[] | number | Record<string, any> | string | null>(localKey, null);
          let next: any;
          if (Array.isArray(cloudVal)) {
            next = unionByIdArr(Array.isArray(localVal) ? localVal as any[] : [], cloudVal);
          } else if (cloudVal && typeof cloudVal === 'object') {
            next = { ...(localVal && typeof localVal === 'object' ? localVal as object : {}), ...cloudVal };
          } else {
            next = cloudVal;
          }
          const a = JSON.stringify(next);
          const b = JSON.stringify(localVal);
          if (a !== b) { lsSet(localKey, next); changed = true; }
        }
        if (changed) window.dispatchEvent(new Event('storage'));
        return true;
      } catch {
        return false;
      }
    };

    const push = async () => {
      try {
        const payload: Record<string, any> = {};
        for (const [localKey, cloudKey] of Object.entries(CLOUD_KEY_MAP)) {
          if (CLOUD_PUSH_EXCLUDE.has(localKey)) continue;
          const val = lsGet<any>(localKey, null);
          if (val !== null) payload[cloudKey] = val;
        }
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return true;
      } catch {
        return false;
      }
    };

    // Subscribe to storage changes from any tab/site of this browser so local
    // edits (orders accepted, drivers toggled online, refunds approved, ...) are
    // pushed to the cloud for every other role site to see live.
    const onStorage = () => { push(); };
    window.addEventListener('storage', onStorage);

    // Instant cross-tab delivery for the same browser: any tab that writes shared
    // state tells every other open tab to pull from the cloud right away instead
    // of waiting for the poll timer. This makes admin approvals appear on the
    // driver site immediately.
    const bc: BroadcastChannel | undefined =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nexago-cloud-sync') : undefined;
    if (bc) {
      bc.onmessage = (e: MessageEvent) => {
        if (e && e.data && e.data.nexago === 'sync') { pull(); }
      };
    }

    (async () => {
      const ok = await pull();
      if (!cancelled) setSyncState(ok ? 'online' : 'offline');
      await push();
      if (!cancelled) setSyncState('online');
    })();
    const pullTimer = setInterval(async () => { const ok = await pull(); if (!cancelled) setSyncState(ok ? 'online' : 'offline'); }, 2000);
    const pushTimer = setInterval(() => { push(); }, 1500);

    // Broadcast changes made in THIS tab so sibling tabs (driver site, admin, ...)
    // trigger an immediate pull instead of waiting for the poll timer.
    const onBroadcast = () => {
      if (bc) bc.postMessage({ nexago: 'sync' });
    };
    window.addEventListener('nexago-local-write', onBroadcast);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('nexago-local-write', onBroadcast);
      if (bc) bc.close();
      clearInterval(pullTimer);
      clearInterval(pushTimer);
    };
  }, []);
  return syncState;
}

export const bdt = (n: number) => `৳${(n || 0).toLocaleString()}`;

export const todayStr = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ---- QR handoff helpers (deterministic, order-bound) ----
const HANDBASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const handoffCodeOf = (orderId: string): string => {
  const h = String(orderId || 'ORDER').split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  let n = Math.abs(h);
  let code = '';
  for (let i = 0; i < 8; i++) { code += HANDBASE[n % HANDBASE.length]; n = Math.floor(n / HANDBASE.length); }
  return `NX-${code}`;
};
// The exact string encoded into the QR — orderId + code
export const handoffPayloadOf = (orderId: string) => JSON.stringify({ o: orderId, c: handoffCodeOf(orderId) });
// Validate a scanned/typed payload against an expected order id
export const verifyHandoff = (raw: string, orderId: string): boolean => {
  try {
    const p = JSON.parse(raw);
    return !!p && p.o === orderId && p.c === handoffCodeOf(orderId);
  } catch { return false; }
};

// Append an audit entry to an order's timeline (keeps at most N entries)
export const appendTimeline = <T extends { timeline?: any[] }>(order: T, status: string, actor: 'customer' | 'store' | 'driver' | 'admin' | 'system', note?: string): T => {
  const entry = { status, actor, note, time: Date.now() };
  const timeline = [...(order.timeline || []), entry];
  return { ...order, timeline: timeline.slice(-40) };
};

// Build a notification payload object (targeted) shared by all portals
export const makeNotif = (title: string, message: string, type: 'order' | 'system' | 'driver' | 'payment', opts: { audience?: string; driverId?: string; customerId?: string; storeId?: string; staffId?: string } = {}): any => ({
  id: `NOTIF-${Date.now().toString().slice(-8)}`,
  title,
  message,
  type,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  read: false,
  audience: opts.audience,
  driverId: opts.driverId,
  customerId: opts.customerId,
  storeId: opts.storeId,
  staffId: opts.staffId,
});

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
export const useDrivers = () => useShared<Driver[]>('sd_drivers', []);
export const useProducts = () => useShared<Product[]>('sd_products', []);
export const useCategories = () => useShared<any[]>('sd_categories', []);
export const useCoupons = () => useShared<any[]>('sd_coupons', []);
export const useReviews = () => useShared<any[]>('sd_reviews', []);
export const usePayments = () => useShared<Payment[]>('sd_payments', []);
export const useTickets = () => useShared<SupportTicket[]>('sd_tickets', []);
export const useNotifications = () => useShared<SystemNotification[]>('sd_notifications', []);
export const useUsers = () => useShared<User[]>('sd_users', []);
export const useStores = () => useShared<any[]>('sd_stores', []);
export const useBranches = () => useShared<any[]>('sd_store_branches', []);
export const useWalletBal = () => useShared<number>('ss_wallet_v2', 0);
export const useWalletTxns = () => useShared<any[]>('ss_wtxn_v3', []);
export const useStoreProfile = () => useShared<{ storeName: string; storeSub: string; whatsapp: string }>('sd_store_profile', { storeName: '', storeSub: '', whatsapp: '' });
export const useStoreAdminApps = () => useShared<any[]>('sd_store_admin_apps', []);
export const useStoreAdminCreds = () => useShared<Record<string, { password: string; storeId: string }>>('sd_store_admin_creds', {});

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

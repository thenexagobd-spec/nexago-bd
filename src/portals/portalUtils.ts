/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared helpers + shared-localStorage hooks for the four role portals.
 * All portals read/write the SAME keys the admin panel uses, so data stays in
 * sync across sites in the same browser.
 */
import { useEffect, useRef, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, Driver, Product, Payment, SupportTicket, SystemNotification, User } from '../types';

export const lsGet = <T,>(key: string, d: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : d;
  } catch {
    return d;
  }
};

// Single shared Supabase client for the whole app (App super-admin Google OAuth
// + CustomerStorefront Google sign-in). Creating it once avoids the auth-js
// "Multiple GoTrueClient instances detected" warning and undefined behavior.
let _supabaseClient: SupabaseClient | null | undefined;
export function supabaseClient(): SupabaseClient | null {
  if (_supabaseClient !== undefined) return _supabaseClient;
  const url = ((import.meta.env.VITE_SUPABASE_URL as string) || '').replace(/\/+$/, '');
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  _supabaseClient = url && anon ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return _supabaseClient;
}

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
  sd_driver_creds: 'driverCreds',
  sd_zones: 'zones',
  sd_products: 'products',
  sd_categories: 'categories',
  sd_inventory: 'inventory',
  sd_inventory_v2: 'inventoryV2',
  sd_inventory_logs: 'inventoryLogs',
  sd_payments: 'payments',
  sd_tickets: 'tickets',
  sd_users: 'users',
  sd_vehicles: 'vehicles',
  sd_stores: 'stores',
  sd_stores_meta: 'storesMeta',
  sd_store_branches: 'branches',
  sd_store_admin_creds: 'storeAdminCreds',
  sd_returns: 'returns',
  ss_refunds: 'refunds',
  ss_wallet_v2: 'wallet',
  ss_wtxn_v3: 'walletTxns',
  ss_tickets_v2: 'customerTickets',
  ss_rider_ratings: 'riderRatings',
  ss_cust_accounts: 'customerAccounts',
  ss_cust_wallet_alloc: 'customerWalletAlloc',
  sd_store_ratings: 'ratings',
  sd_coupons: 'coupons',
  sd_store_online: 'storeOnline',
  sd_store_profile: 'profile',
  sd_notifications: 'notifications',
  sd_store_admin_apps: 'storeAdminApps',
  sd_staff: 'staff',
  sd_role_cards: 'roleCards',
  sd_super_admin_card_profile: 'superAdminCardProfile',
  sd_reviews: 'reviews',
  sd_marketing: 'marketing',
  sd_banners: 'banners',
  sd_stock_ledger: 'stockLedger',
  sd_batches: 'batches',
  sd_purchase_orders: 'purchaseOrders',
  sd_undo_stack: 'undoStack',
  sd_transfers: 'transfers',
  nexago_pos_sales: 'posSales',
  nexago_pos_holds: 'posHolds',
  nexago_pos_bill_no: 'posBillNo',
  sd_support_templates_v1: 'supportTemplates',
  sd_known_issues_v1: 'knownIssues',
  sd_tech_audit_v1: 'techAudit',
  sd_users_v1: 'supportUsers',
  sd_integrations_v1: 'integrations',
  sd_maintenance_v1: 'maintenance',
  sd_backlog_v1: 'backlog',
  sd_sla_targets_v1: 'slaTargets',
  sd_apilog_v1: 'apiLog',
  sd_alertrules_v1: 'alertRules',
  sd_sec_events_v1: 'securityEvents',
  sd_sec_score_v1: 'securityScore',
  sd_featureflags_v1: 'featureFlags',
  sd_changes_v1: 'changes',
  sd_warroom_v1: 'warroom',
  sd_logs_v1: 'logs',
  sd_webhooks_v1: 'webhooks',
  sd_backups_v1: 'backups',
  sd_digest_v1: 'digest',
  sd_reviews_v1: 'supportReviews',
  sd_sos_v1: 'sosAlerts',
  sd_dr_v1: 'disasterRecovery',
  sd_smsbal_v1: 'smsBalance',
  sd_debt_v1: 'technicalDebt',
  sd_broadcast_v1: 'broadcasts',
  sd_fraudq_v1: 'fraudQueue',
  sd_approvals_v1: 'approvals',
  sd_certs_v1: 'certificates',
  sd_relcheck_v1: 'releaseChecks',
  sd_zones_v1: 'supportZones',
  sd_ratelimit_v1: 'rateLimits',
  sd_sessions_v1: 'supportSessions',
  sd_searchidx_v1: 'searchIndex',
  sd_retention_v1: 'retention',
  sd_crashes_v1: 'crashes',
  sd_allowlist_v1: 'allowlist',
  sd_pipeline_v1: 'pipeline',
  sd_pwpolicy_v1: 'passwordPolicy',
  sd_locks_v1: 'locks',
  sd_access_v1: 'accessModes',
  sd_geofence_v1: 'geofence',
  sd_smstpl_v1: 'smsTemplates',
  sd_driverdocs_v1: 'driverDocuments',
  sd_handover_v1: 'handover',
  sd_storehealth_v1: 'storeHealth',
  sd_featureboard_v1: 'featureBoard',
  sd_batchjobs_v1: 'batchJobs',
  sd_envconfig_v1: 'envConfig',
  sd_forceupdate_v1: 'forceUpdate',
  sd_canned_v1: 'cannedReplies',
  sd_zonesla_v1: 'zoneSla',
  sd_offlineq_v1: 'offlineQueue',
  sd_promos_v1: 'supportPromos',
  sd_payouts_v1: 'supportPayouts',
  sd_cdn_v1: 'cdn',
  sd_runbook_v1: 'runbook',
  sd_refundvel_v1: 'refundVelocity',
  sd_latency_v1: 'latency',
  sd_tiers_v1: 'tierQueue',
  sd_channels_v1: 'channels',
  sd_ticket_categories_v1: 'ticketCategories',
  sd_support_faqs_v1: 'supportFaqs',
};

// Every approved role writes its own store-scoped records. Server-side merge is
// union-by-id, so Store Admin product/stock changes sync live without dropping
// another store's data.
const CLOUD_PUSH_EXCLUDE = new Set<string>();

// Store/branch-scoped modules create localStorage keys dynamically, so they
// cannot be listed one by one in CLOUD_KEY_MAP. Persist each dynamic key under
// its own cloud field to avoid overwriting another store's records.
const CLOUD_DYNAMIC_PREFIXES = [
  'sd_store_staff_',
  'sd_review_replies_',
  'sd_active_branch_',
  'mfs_',
];

const DYNAMIC_CLOUD_PREFIX = 'dynamic:';
const OFFLINE_ORDER_QUEUE_KEY = 'nexago_offline_order_queue_v1';
const OFFLINE_STATE_QUEUE_KEY = 'nexago_offline_state_queue_v1';

const isCloudDynamicLocalKey = (key: string) =>
  CLOUD_DYNAMIC_PREFIXES.some(prefix => key.startsWith(prefix));

const dynamicCloudEntries = (): Array<[string, any]> => {
  const entries: Array<[string, any]> = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const localKey = localStorage.key(i) || '';
      if (!isCloudDynamicLocalKey(localKey)) continue;
      entries.push([`${DYNAMIC_CLOUD_PREFIX}${localKey}`, lsGet(localKey, null)]);
    }
  } catch {
    /* ignore */
  }
  return entries.sort(([a], [b]) => a.localeCompare(b));
};

const readOfflineQueue = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeOfflineQueue = <T,>(key: string, rows: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
    window.dispatchEvent(new Event('nexago-local-write'));
  } catch {
    /* ignore */
  }
};

const queueOfflineOrder = (key: string, order: any) => {
  const rows = readOfflineQueue<any>(OFFLINE_ORDER_QUEUE_KEY);
  const next = [{ key, order, queuedAt: Date.now() }, ...rows.filter(row => !(row.key === key && row.order?.id === order.id))].slice(0, 500);
  writeOfflineQueue(OFFLINE_ORDER_QUEUE_KEY, next);
};

const queueOfflineState = (key: string, payload: Record<string, any>) => {
  const rows = readOfflineQueue<any>(OFFLINE_STATE_QUEUE_KEY);
  const next = [{ key, payload, queuedAt: Date.now() }, ...rows].slice(0, 50);
  writeOfflineQueue(OFFLINE_STATE_QUEUE_KEY, next);
};

const configuredApiBase = ((import.meta.env.VITE_RELAY_BASE as string) || '').replace(/\/+$/, '');
const API_BASE = (configuredApiBase || window.location.origin).replace(/\/+$/, '');

const cloudKeyOf = () =>
  new URLSearchParams(window.location.search).get('key') || localStorage.getItem('sd_store_key') || 'nexago-main';

export const currentCloudKey = cloudKeyOf;

export async function securityApi(path: string, body?: Record<string, any>, token?: string) {
  const key = currentCloudKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sessionToken = token || localStorage.getItem('sd_security_session') || '';
  if (sessionToken) headers['X-Session-Token'] = sessionToken;
  const joiner = path.includes('?') ? '&' : '?';
  const res = await fetch(`${API_BASE}/api/security${path}${joiner}key=${encodeURIComponent(key)}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const error = new Error(data.error || `Security API failed: ${path}`) as Error & { status?: number; data?: any };
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function securityAudit(action: string, detail: Record<string, any> = {}) {
  try { await securityApi('/audit', { action, ...detail }); } catch { /* old flow stays working if security API is offline */ }
}

export async function persistOrderToCloud(order: any): Promise<boolean> {
  if (!order || !order.id) return false;
  const key = currentCloudKey();
  try {
    const res = await fetch(`${API_BASE}/api/order?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    if (res.ok) return true;
    queueOfflineOrder(key, order);
    return false;
  } catch {
    queueOfflineOrder(key, order);
    return false;
  }
}

export async function flushOfflineSyncQueue(): Promise<{ orders: number; states: number }> {
  let ordersFlushed = 0;
  let statesFlushed = 0;
  const orderRows = readOfflineQueue<any>(OFFLINE_ORDER_QUEUE_KEY);
  const remainingOrders: any[] = [];
  for (const row of orderRows.reverse()) {
    try {
      const res = await fetch(`${API_BASE}/api/order?key=${encodeURIComponent(row.key || currentCloudKey())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: row.order }),
      });
      if (res.ok) ordersFlushed += 1;
      else remainingOrders.push(row);
    } catch {
      remainingOrders.push(row);
    }
  }
  writeOfflineQueue(OFFLINE_ORDER_QUEUE_KEY, remainingOrders.reverse());

  const stateRows = readOfflineQueue<any>(OFFLINE_STATE_QUEUE_KEY);
  const remainingStates: any[] = [];
  for (const row of stateRows.reverse()) {
    try {
      const res = await fetch(`${API_BASE}/api/state?key=${encodeURIComponent(row.key || currentCloudKey())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row.payload || {}),
      });
      if (res.ok) statesFlushed += 1;
      else remainingStates.push(row);
    } catch {
      remainingStates.push(row);
    }
  }
  writeOfflineQueue(OFFLINE_STATE_QUEUE_KEY, remainingStates.reverse());
  return { orders: ordersFlushed, states: statesFlushed };
}

// Single Account Rule helpers (Phase 2). Every signup / registration calls
// identityCheck before submitting; identityClaim registers the account atomically
// (unique phone + unique Gmail across all roles and stores). These fail safe —
// if the security API is unreachable the caller decides whether to block.
export async function identityCheck(opts: { phone?: string; email?: string; excludeId?: string; excludeRole?: string }): Promise<{ taken: boolean; conflict?: { role?: string; identityId?: string; name?: string; phone?: string; email?: string } | null }> {
  try {
    const data = await securityApi('/identity/check', { ...opts });
    return { taken: !!data.taken, conflict: data.conflict || null };
  } catch {
    return { taken: false, conflict: null };
  }
}

export async function identityClaim(opts: { role: string; identityId: string; name?: string; phone?: string; email?: string; status?: string }): Promise<{ ok: boolean; error?: string; conflict?: any }> {
  try {
    const data = await securityApi('/identity/claim', { ...opts });
    return { ok: true, ...data };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || 'IDENTITY_CLAIM_FAILED'), conflict: err?.conflict };
  }
}

// Unified ID + Permanent Cloud helpers (Phase 3). Customer profile, wallet and
// wallet history are persisted per permanent ID server-side so a wiped browser or
// a new device restores the SAME customer ID and balance.
export async function customerRegister(opts: { name?: string; phone?: string; email?: string; customerId?: string; balance?: number; password?: string }): Promise<{ customer?: any; walletBalance?: number; txns?: any[]; hasPassword?: boolean } | null> {
  try {
    const data = await securityApi('/customer/register', { ...opts });
    return { customer: data.customer, walletBalance: data.walletBalance, txns: data.txns, hasPassword: data.hasPassword };
  } catch {
    return null;
  }
}

export async function customerLogin(opts: { email: string; password: string }): Promise<{ customer?: any; walletBalance?: number; txns?: any[] } | null> {
  try {
    const data = await securityApi('/customer/login', { ...opts });
    return { customer: data.customer, walletBalance: data.walletBalance, txns: data.txns };
  } catch {
    return null;
  }
}

export async function customerForgot(opts: { email: string; code: string; newPassword: string }): Promise<boolean> {
  try {
    await securityApi('/customer/forgot', { ...opts });
    return true;
  } catch {
    return false;
  }
}

export async function customerMe(customerId: string): Promise<{ customer?: any; walletBalance?: number; txns?: any[] } | null> {
  try {
    const data = await securityApi(`/customer/me?customerId=${encodeURIComponent(customerId)}`);
    return { customer: data.customer, walletBalance: data.walletBalance, txns: data.txns };
  } catch {
    return null;
  }
}

export async function customerSync(customerId: string, balance: number, txns: any[] = []): Promise<boolean> {
  try {
    await securityApi('/customer/sync', { customerId, balance, txns });
    return true;
  } catch {
    return false;
  }
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
  // Keep the RICHER record when both sides have the same id — e.g. a driver
  // that carries uploaded document images (dataUrl) must never be replaced by
  // an older cloud snapshot that lost those images.
  const pick = (x: T) => {
    if (!x || !x.id) return;
    const k = String(x.id);
    const cur = byId.get(k);
    if (!cur) { byId.set(k, x); return; }
    const curTime = Date.parse((cur as any).updatedAt || (cur as any).verifiedAt || (cur as any).loginCreatedAt || (cur as any).createdAt || '') || 0;
    const newTime = Date.parse((x as any).updatedAt || (x as any).verifiedAt || (x as any).loginCreatedAt || (x as any).createdAt || '') || 0;
    if (newTime > curTime) { byId.set(k, x); return; }
    if (curTime > newTime) return;
    const curLen = JSON.stringify(cur).length;
    const newLen = JSON.stringify(x).length;
    if (newLen > curLen) byId.set(k, x);
  };
  (a || []).forEach(pick);
  (b || []).forEach(pick);
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
    const sig = () => JSON.stringify([
      ...Object.keys(CLOUD_KEY_MAP).map(k => [k, lsGet(k, null)]),
      ...dynamicCloudEntries(),
    ]);
    let lastPushedSig = '';
    let pullInFlight = false;
    let pushInFlight = false;
    let syncBackoffUntil = 0;
    let applyingRemoteState = false;

    const pull = async () => {
      if (pullInFlight || Date.now() < syncBackoffUntil) return false;
      pullInFlight = true;
      try {
        const res = await fetch(url);
        if (res.status === 429) {
          syncBackoffUntil = Date.now() + 15_000;
          return false;
        }
        if (!res.ok) return false;
        const data = await res.json();
        const state = data && data.state;
        if (!state || typeof state !== 'object') return false;
        let changed = false;
        applyingRemoteState = true;
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
        for (const [cloudKey, cloudVal] of Object.entries(state as Record<string, any>)) {
          if (!cloudKey.startsWith(DYNAMIC_CLOUD_PREFIX) || cloudVal === undefined) continue;
          const localKey = cloudKey.slice(DYNAMIC_CLOUD_PREFIX.length);
          if (!isCloudDynamicLocalKey(localKey)) continue;
          const localVal = lsGet<any>(localKey, null);
          let next: any;
          if (Array.isArray(cloudVal)) {
            next = unionByIdArr(Array.isArray(localVal) ? localVal : [], cloudVal);
          } else if (cloudVal && typeof cloudVal === 'object') {
            next = { ...(localVal && typeof localVal === 'object' ? localVal as object : {}), ...cloudVal };
          } else {
            next = cloudVal;
          }
          if (JSON.stringify(next) !== JSON.stringify(localVal)) { lsSet(localKey, next); changed = true; }
        }
        applyingRemoteState = false;
        lastPushedSig = sig();
        if (changed) window.dispatchEvent(new Event('storage'));
        return true;
      } catch {
        return false;
      } finally {
        applyingRemoteState = false;
        pullInFlight = false;
      }
    };

    const push = async () => {
      if (pushInFlight || applyingRemoteState || Date.now() < syncBackoffUntil) return false;
      const currentSig = sig();
      if (currentSig === lastPushedSig) return true;
      pushInFlight = true;
      try {
        const payload: Record<string, any> = {};
        for (const [localKey, cloudKey] of Object.entries(CLOUD_KEY_MAP)) {
          if (CLOUD_PUSH_EXCLUDE.has(localKey)) continue;
          const val = lsGet<any>(localKey, null);
          if (val !== null) payload[cloudKey] = val;
        }
        for (const [cloudKey, val] of dynamicCloudEntries()) {
          if (val !== null) payload[cloudKey] = val;
        }
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const sessionToken = localStorage.getItem('sd_security_session') || '';
        if (sessionToken) headers['X-Session-Token'] = sessionToken;
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (res.status === 429) {
          syncBackoffUntil = Date.now() + 15_000;
          queueOfflineState(key, payload);
          return false;
        }
        if (!res.ok) {
          queueOfflineState(key, payload);
          return false;
        }
        lastPushedSig = currentSig;
        return true;
      } catch {
        queueOfflineState(key, (() => {
          const payload: Record<string, any> = {};
          for (const [localKey, cloudKey] of Object.entries(CLOUD_KEY_MAP)) {
            if (CLOUD_PUSH_EXCLUDE.has(localKey)) continue;
            const val = lsGet<any>(localKey, null);
            if (val !== null) payload[cloudKey] = val;
          }
          for (const [cloudKey, val] of dynamicCloudEntries()) {
            if (val !== null) payload[cloudKey] = val;
          }
          return payload;
        })());
        return false;
      } finally {
        pushInFlight = false;
      }
    };

    // Subscribe to local writes (any tab) so real edits are pushed to the cloud
    // for every other role site to see live. A content signature is used so only
    // genuine changes are pushed — echo writes that just mirror a cloud pull skip
    // silently, keeping request volume tiny even with many tabs open.
    const isVisible = () => typeof document === 'undefined' || !document.hidden;
    const flushPush = () => {
      if (isVisible() && !applyingRemoteState) push();
    };
    const flushOffline = async () => {
      if (!isVisible()) return;
      const result = await flushOfflineSyncQueue();
      if ((result.orders || result.states) && !cancelled) {
        await pull();
        await push();
        if (!cancelled) setSyncState('online');
      }
    };
    const onLocalChange = () => {
      if (bc) bc.postMessage({ nexago: 'sync' });
      setTimeout(flushPush, 0);
    };
    window.addEventListener('storage', onLocalChange);
    window.addEventListener('nexago-local-write', onLocalChange);

    // Instant cross-tab delivery for the same browser: any tab that writes shared
    // state tells every other open tab to pull from the cloud right away instead
    // of waiting for the poll timer. This makes admin approvals appear on the
    // driver site immediately.
    const bc: BroadcastChannel | undefined =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nexago-cloud-sync') : undefined;
    if (bc) {
      bc.onmessage = (e: MessageEvent) => {
        if (e && e.data && e.data.nexago === 'sync') { if (isVisible()) pull(); }
      };
    }
    let ws: WebSocket | null = null;
    const wsEnabled =
      import.meta.env.VITE_ENABLE_WEBSOCKET_SYNC === 'true' ||
      new URLSearchParams(window.location.search).get('ws') === '1';
    if (wsEnabled) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => ws?.send(JSON.stringify({ type: 'state-subscribe', key }));
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(String(event.data || '{}'));
            if (msg.type === 'state-updated' && (!msg.key || msg.key === key)) { if (isVisible()) pull(); }
          } catch { /* ignore non-json ws messages */ }
        };
        ws.onerror = () => { try { ws?.close(); } catch { /* noop */ } };
      } catch { /* websocket is optional; polling remains active */ }
    }

    (async () => {
      const ok = await pull();
      if (!cancelled) setSyncState(ok ? 'online' : 'offline');
      await push();
      if (!cancelled) setSyncState('online');
    })();
    // Only poll while the tab is actually visible. Hidden background tabs (many
    // role sites open at once) used to hammer the relay every second, which
    // looked bot-like to edge proxies and triggered 429s. The visible tab stays
    // live, and hidden tabs catch up instantly when the user switches to them.
    const pullTimer = setInterval(async () => {
      if (!isVisible()) return;
      const ok = await pull();
      if (!cancelled) setSyncState(ok ? 'online' : 'offline');
    }, 5000);
    const pushTimer = setInterval(flushPush, 3000);
    const offlineTimer = setInterval(flushOffline, 8000);
    const onVisible = () => { if (isVisible()) { pull(); flushOffline(); } };
    const onOnline = () => { flushOffline(); flushPush(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onLocalChange);
      window.removeEventListener('nexago-local-write', onLocalChange);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      if (bc) bc.close();
      if (ws) ws.close();
      clearInterval(pullTimer);
      clearInterval(pushTimer);
      clearInterval(offlineTimer);
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

export const SEED_PRODUCTS: Product[] = [];

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

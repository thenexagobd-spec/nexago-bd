import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabaseConfigured, serviceClient, sendEmailOtp, verifyEmailOtp } from './supabase.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || process.env.RELAY_PORT || 3100;
const HOST = process.env.RELAY_HOST || '0.0.0.0';
const PUBLIC_URL = (process.env.RELAY_PUBLIC_URL || '').replace(/\/$/, '');
const AGENT_TOKEN = process.env.NEXAGO_AGENT_TOKEN || '';
const MAX_JSON_BYTES = Number(process.env.NEXAGO_MAX_JSON_BYTES || 8_000_000);
const STRICT_SECURITY = process.env.NEXAGO_STRICT_SECURITY === '1';
const STATE_WRITE_TOKEN = process.env.NEXAGO_STATE_WRITE_TOKEN || '';
const DATA_ENCRYPTION_KEY = process.env.NEXAGO_DATA_ENCRYPTION_KEY || '';
const SECURITY_ALERT_WEBHOOK = process.env.NEXAGO_SECURITY_ALERT_WEBHOOK || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXAGO_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.NEXAGO_TELEGRAM_CHAT_ID || '';
function cleanEnvSecret(value) {
  const raw = String(value || '').trim();
  return raw.replace(/^["']|["']$/g, '').trim();
}

const SUPER_ADMIN_USERS = (process.env.NEXAGO_SUPER_ADMIN_USERS || '').split(',').map((x) => cleanEnvSecret(x)).filter(Boolean);
const SUPER_ADMIN_PASSWORD = cleanEnvSecret(process.env.NEXAGO_SUPER_ADMIN_PASSWORD);
const SUPER_ADMIN_PASSWORD_CHANGE_CODE = cleanEnvSecret(process.env.NEXAGO_SUPER_ADMIN_PASSWORD_CHANGE_CODE);
const SUPER_ADMIN_LOGIN_SECRET_CODE = cleanEnvSecret(process.env.NEXAGO_SUPER_ADMIN_LOGIN_SECRET_CODE) || SUPER_ADMIN_PASSWORD_CHANGE_CODE;

import os from 'node:os';

function lanIps() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

function readPublicUrlFile() {
  try {
    const v = fs.readFileSync(path.join(__dirname, '.public-url'), 'utf8').trim();
    return v || '';
  } catch { return ''; }
}

function publicBase(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const fromFile = readPublicUrlFile();
  if (fromFile) return fromFile;
  const host = req.headers.host || '';
  const hostname = host.split(':')[0];
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!isLocal && hostname) return `https://${host}`;
  const ip = lanIps()[0];
  if (ip) return `http://${ip}:${PORT}`;
  return `http://localhost:${PORT}`;
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Content-Security-Policy': "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' https: data: blob:; connect-src 'self' https: wss: ws:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};
const corsHeaders = {
  ...securityHeaders,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token, X-Nexago-Agent',
};

const rooms = new Map(); // room -> { share?: ws, admin?: ws }

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify(obj));
}

// ---- Live store data (JSON file store per store key) ----
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const BACKUP_DIR = path.join(DATA_DIR, '_backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const SECURITY_DIR = path.join(DATA_DIR, '_security');
const FILES_DIR = path.join(DATA_DIR, '_files');
for (const dir of [SECURITY_DIR, FILES_DIR]) if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const rateBuckets = new Map();
const alertBuckets = new Map();
const stateSubscribers = new Map();

function notifyStateSubscribers(key, detail = {}) {
  const safe = safeKey(key);
  const payload = JSON.stringify({ type: 'state-updated', key: safe, updatedAt: new Date().toISOString(), ...detail });
  const sockets = stateSubscribers.get(safe) || new Set();
  for (const ws of sockets) {
    try {
      if (ws.readyState === 1) ws.send(payload);
    } catch { /* ignore dead socket */ }
  }
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function isTrustedAutomation(req) {
  const ip = clientIp(req);
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  const tokenOk = AGENT_TOKEN && req.headers['x-nexago-agent'] === AGENT_TOKEN;
  return isLocal || tokenOk;
}

function hasStateWriteAccess(req, key) {
  if (!STRICT_SECURITY) return true;
  if (isTrustedAutomation(req)) return true;
  const session = requireSession(req, key);
  if (session && ['super-admin', 'store-admin', 'branch-admin', 'driver', 'customer', 'staff'].includes(session.role)) return true;
  return !!(STATE_WRITE_TOKEN && req.headers['x-nexago-agent'] === STATE_WRITE_TOKEN);
}

function rateLimit(req, bucket = 'default', limit = 60, windowMs = 60_000) {
  if (isTrustedAutomation(req)) return true;
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const entry = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count += 1;
  rateBuckets.set(key, entry);
  return entry.count <= limit;
}

function securityFile(name) {
  return path.join(SECURITY_DIR, name.replace(/[^a-zA-Z0-9_.-]/g, '') + '.json');
}

function encryptionKey() {
  if (!DATA_ENCRYPTION_KEY) return null;
  return crypto.createHash('sha256').update(DATA_ENCRYPTION_KEY).digest();
}

function encryptJson(value) {
  const key = encryptionKey();
  if (!key) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(value);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    __encrypted: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: ciphertext.toString('base64'),
  };
}

function decryptJson(value) {
  if (!value || value.__encrypted !== 'aes-256-gcm') return value;
  const key = encryptionKey();
  if (!key) throw new Error('encrypted data requires NEXAGO_DATA_ENCRYPTION_KEY');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext);
}

function readSecurity(name, fallback) {
  const mirrored = supabaseSecurityMirror.get(name);
  if (supabaseReady && mirrored !== undefined) return mirrored;
  try { return decryptJson(JSON.parse(fs.readFileSync(securityFile(name), 'utf8'))); } catch { return fallback; }
}

function writeSecurity(name, value) {
  fs.writeFileSync(securityFile(name), JSON.stringify(encryptJson(value)), 'utf8');
  supabaseSecurityWrite(name, value);
  return value;
}

// ---- Supabase bridge ----
// When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are configured, security and
// store payloads are mirrored to the nexago_security / nexago_stores tables so
// data survives in PostgreSQL (DigitalOcean). The local JSON files stay as a
// fallback so nothing breaks if Supabase is unreachable. A single in-process
// memory mirror keeps reads fast and consistent during the server's lifetime.
const supabaseStoreMirror = new Map();
const supabaseSecurityMirror = new Map();
let supabaseReady = false;

const SUPABASE_TABLE = {
  stores: 'nexago_stores',
  security: 'nexago_security',
};

function supabaseWrite(table, row) {
  if (!supabaseConfigured || !serviceClient) return;
  try {
    serviceClient
      .from(table)
      .upsert(row, { onConflict: table === SUPABASE_TABLE.stores ? 'key' : 'name' })
      .then(({ error }) => {
        if (error) console.error('[supabase] upsert failed:', table, error.message);
      })
      .catch((e) => console.error('[supabase] upsert error:', e.message));
  } catch { /* ignore */ }
}

function supabaseStoreWrite(key, value) {
  if (!supabaseReady || !supabaseConfigured) return;
  supabaseStoreMirror.set(key, value);
  supabaseWrite(SUPABASE_TABLE.stores, { key, payload: value, updated_at: new Date().toISOString() });
}

function supabaseSecurityWrite(name, value) {
  if (!supabaseReady || !supabaseConfigured) return;
  supabaseSecurityMirror.set(name, value);
  supabaseWrite(SUPABASE_TABLE.security, { name, payload: value, updated_at: new Date().toISOString() });
}

async function initSupabaseBridge() {
  if (!supabaseConfigured || !serviceClient) return;
  const [storeRes, secRes] = await Promise.all([
    serviceClient.from(SUPABASE_TABLE.stores).select('key,payload'),
    serviceClient.from(SUPABASE_TABLE.security).select('name,payload'),
  ]);
  if (storeRes.error) console.error('[supabase] load stores failed:', storeRes.error.message);
  else for (const r of storeRes.data || []) if (r && r.key != null) supabaseStoreMirror.set(r.key, r.payload);
  if (secRes.error) console.error('[supabase] load security failed:', secRes.error.message);
  else for (const r of secRes.data || []) if (r && r.name != null) supabaseSecurityMirror.set(r.name, r.payload);
  supabaseReady = true;
  console.log(`[supabase] mirror ready: ${supabaseStoreMirror.size} stores, ${supabaseSecurityMirror.size} security docs`);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password || ''), salt, 210000, 32, 'sha256').toString('hex');
  return { salt, hash, algo: 'pbkdf2-sha256', iterations: 210000 };
}

function verifyPassword(password, record) {
  if (!record || !record.salt || !record.hash) return false;
  const next = hashPassword(password, record.salt);
  return crypto.timingSafeEqual(Buffer.from(next.hash), Buffer.from(record.hash));
}

function normalizeLoginId(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s._-]+/g, '');
}

function findSecurityUser(users, loginId) {
  const exact = users[loginId];
  if (exact) return { userId: loginId, user: exact };
  const target = normalizeLoginId(loginId);
  for (const [userId, user] of Object.entries(users)) {
    if (normalizeLoginId(userId) === target) return { userId, user };
  }
  return { userId: loginId, user: null };
}

function appendAudit(key, entry) {
  const audit = readSecurity(`audit-${safeKey(key)}`, []);
  const item = {
    id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    time: new Date().toISOString(),
    ...entry,
  };
  audit.push(item);
  writeSecurity(`audit-${safeKey(key)}`, audit.slice(-5000));
  return item;
}

async function sendSecurityAlert(kind, detail = {}) {
  const now = Date.now();
  const bucketKey = `${kind}:${detail.ip || ''}:${detail.actor || ''}`;
  const prev = alertBuckets.get(bucketKey) || 0;
  if (now - prev < 60_000) return;
  alertBuckets.set(bucketKey, now);
  const text = [
    `NexaGo Security Alert: ${kind}`,
    `Time: ${new Date().toISOString()}`,
    detail.actor ? `Actor: ${detail.actor}` : '',
    detail.ip ? `IP: ${detail.ip}` : '',
    detail.storeId ? `Store: ${detail.storeId}` : '',
    detail.reason ? `Reason: ${detail.reason}` : '',
    detail.device ? `Device: ${String(detail.device).slice(0, 160)}` : '',
  ].filter(Boolean).join('\n');
  const tasks = [];
  if (SECURITY_ALERT_WEBHOOK) {
    tasks.push(fetch(SECURITY_ALERT_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, text, detail }) }).catch(() => {}));
  }
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    tasks.push(fetch(tgUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }) }).catch(() => {}));
  }
  await Promise.all(tasks);
}

function sessionFromReq(req) {
  return String(req.headers['x-session-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || '').trim();
}

function requireSession(req, key) {
  const token = sessionFromReq(req);
  if (!token) return null;
  const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
  const session = sessions[token];
  if (!session || Date.now() > Number(session.expiresAt || 0)) return null;
  const users = readSecurity(`users-${safeKey(key)}`, {});
  const user = users[session.userId];
  if (!user || user.status !== 'Active') return null;
  if (user.cardExpiresAt && Date.now() > Date.parse(user.cardExpiresAt)) return null;
  return { token, ...session };
}

function ensureEnvSuperAdmins(key) {
  if (!SUPER_ADMIN_USERS.length || !SUPER_ADMIN_PASSWORD) return;
  const users = readSecurity(`users-${safeKey(key)}`, {});
  let changed = false;
  for (const userId of SUPER_ADMIN_USERS) {
    if (!users[userId]) {
      users[userId] = {
        userId,
        role: 'super-admin',
        storeId: '',
        branchId: '',
        status: 'Active',
        password: hashPassword(SUPER_ADMIN_PASSWORD),
        createdAt: new Date().toISOString(),
        lastPasswordChangeAt: new Date().toISOString(),
        source: 'env-seed',
      };
      changed = true;
    } else {
      const existing = users[userId];
      const next = {
        ...existing,
        userId,
        role: 'super-admin',
        storeId: existing.storeId || '',
        branchId: existing.branchId || '',
        status: 'Active',
        source: existing.source || 'env-seed',
      };
      if (SUPER_ADMIN_PASSWORD && !verifyPassword(SUPER_ADMIN_PASSWORD, existing.password)) {
        next.password = hashPassword(SUPER_ADMIN_PASSWORD);
        next.lastPasswordChangeAt = new Date().toISOString();
        next.source = 'env-seed';
        next.passwordChangedBy = 'render-env';
      }
      users[userId] = next;
      changed = true;
    }
  }
  if (changed) writeSecurity(`users-${safeKey(key)}`, users);
}

function storeFile(key) {
  const safe = String(key || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'default';
  return path.join(DATA_DIR, safe + '.json');
}

function safeKey(key) {
  return String(key || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'default';
}

function keyLooksSafe(key) {
  const raw = String(key || '');
  return /^[a-zA-Z0-9_-]{1,64}$/.test(raw);
}

function backupFile(key, stamp = new Date().toISOString().replace(/[:.]/g, '-')) {
  const dir = path.join(BACKUP_DIR, safeKey(key));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${stamp}.json`);
}

function backupStore(key, obj, reason = 'autosave') {
  try {
    if (!obj || !obj.state) return;
    const payload = { ...obj, backupReason: reason, backedUpAt: new Date().toISOString() };
    fs.writeFileSync(backupFile(key), JSON.stringify(payload), 'utf8');
    const dir = path.dirname(backupFile(key, 'x'));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    while (files.length > 100) {
      const old = files.shift();
      if (old) fs.unlinkSync(path.join(dir, old));
    }
  } catch { /* ignore backup errors */ }
}

function loadStore(key) {
  const mirrored = supabaseStoreMirror.get(key);
  if (supabaseReady && mirrored) return mirrored;
  try {
    const raw = fs.readFileSync(storeFile(key), 'utf8');
    const obj = JSON.parse(raw);
    if (obj && obj.state && typeof obj.state === 'object') return obj;
    return { version: 1, updatedAt: null, state: {} };
  } catch {
    return { version: 1, updatedAt: null, state: {} };
  }
}

function saveStore(key, obj) {
  backupStore(key, loadStore(key), 'before-save');
  fs.writeFileSync(storeFile(key), JSON.stringify(obj), 'utf8');
  backupStore(key, obj, 'after-save');
  supabaseStoreWrite(key, obj);
  return obj;
}

// Merge a client push into the stored state. Banner counters coming from the
// live storefront (impressions/clicks) survive subsequent admin pushes, and
// customer-placed orders + notifications are merged (union by id) so they
// survive admin pushes too. Every role site (driver/store/admin/staff) pushes
// the same shared keys (orders, drivers, notifications, products, payments,
// tickets, returns, refunds, wallet txns, ratings, stores, users, coupons),
// and array keys are merged union-by-id so no site's data is ever dropped.
function latestRecord(existing, incoming) {
  const a = Date.parse(existing && (existing.updatedAt || existing.verifiedAt || existing.loginCreatedAt || existing.createdAt) || '') || 0;
  const b = Date.parse(incoming && (incoming.updatedAt || incoming.verifiedAt || incoming.loginCreatedAt || incoming.createdAt) || '') || 0;
  if (b > a) return incoming;
  if (a > b) return existing;
  return JSON.stringify(incoming || {}).length >= JSON.stringify(existing || {}).length ? incoming : existing;
}

function unionById(existing, incomingArr) {
  const byId = new Map((Array.isArray(existing) ? existing : []).map((x) => [x && x.id, x]));
  for (const item of incomingArr) {
    if (!item || !item.id) continue;
    byId.set(item.id, byId.has(item.id) ? latestRecord(byId.get(item.id), item) : item);
  }
  return Array.from(byId.values());
}

function mergeState(stored, incoming) {
  const merged = { ...(stored.state || {}) };
  const arrayUnion = new Set(['orders', 'notifications', 'drivers', 'payments', 'tickets', 'users', 'stores', 'branches', 'products', 'categories', 'inventory', 'staff', 'reviews', 'marketing', 'returns', 'refunds', 'walletTxns', 'ratings', 'coupons']);
  for (const [k, v] of Object.entries(incoming || {})) {
    if (k === 'banners') {
      if (Array.isArray(v)) {
        const storedBanners = Array.isArray(merged.banners) ? merged.banners : [];
        merged.banners = v.map((b) => {
          const prev = storedBanners.find((x) => x && x.id === b.id);
          return {
            ...b,
            impressions: Math.max(Number(b.impressions || 0), Number(prev?.impressions || 0)),
            clicks: Math.max(Number(b.clicks || 0), Number(prev?.clicks || 0))
          };
        });
      }
    } else if (Array.isArray(v)) {
      merged[k] = arrayUnion.has(k) ? unionById(merged[k], v) : v;
    } else if (v && typeof v === 'object') {
      merged[k] = { ...(merged[k] && typeof merged[k] === 'object' ? merged[k] : {}), ...v };
    } else {
      merged[k] = v;
    }
  }
  if (Array.isArray(merged.notifications)) merged.notifications = merged.notifications.slice(0, 100);
  return { version: 1, updatedAt: new Date().toISOString(), state: merged };
}

function storefrontView(state) {
  const now = new Date().toISOString().slice(0, 10);
  const profile = Object.assign(
    { storeName: '', storeSub: '', whatsapp: '' },
    (state.profile && typeof state.profile === 'object') ? state.profile : {}
  );
  const banners = (Array.isArray(state.banners) ? state.banners : [])
    .filter((b) => b && b.status === 'Active' && (!b.startDate || b.startDate <= now) && (!b.endDate || b.endDate >= now))
    .map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description || '',
      imageUrl: b.imageUrl || b.media || '',
      mediaType: b.mediaType || 'image',
      media: b.media || '',
      ctaLabel: b.ctaLabel || 'Shop Now',
      link: b.link || '',
      couponCode: b.couponCode || '',
      impressions: Number(b.impressions || 0),
      clicks: Number(b.clicks || 0)
    }));
  const products = (Array.isArray(state.products) ? state.products : [])
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category || '',
      unit: p.unit || 'pcs',
      price: Number(p.price || 0),
      promoPrice: p.promoPrice ? Number(p.promoPrice) : null,
      stock: Number(p.stock || 0),
      image: p.image || '',
      gallery: Array.isArray(p.gallery) ? p.gallery.filter(Boolean) : [],
      description: p.description || '',
      tags: Array.isArray(p.tags) ? p.tags.filter(Boolean) : []
    }))
    .filter((p) => p.name);
  return { profile, banners, products };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > MAX_JSON_BYTES) { req.destroy(); reject(new Error('payload too large')); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function serveDistFile(res, reqPath) {
  const root = path.join(__dirname, '..', 'dist');
  const file = path.normalize(path.join(root, reqPath.replace(/^\/+/, '')));
  if (!file.startsWith(root)) return false;
  try {
    const data = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
      '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
      '.map': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, ...corsHeaders });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const allowedMethods = new Set(['GET', 'POST', 'OPTIONS']);
  if (!allowedMethods.has(req.method || '')) {
    sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  const suspicious = /\.\.|%2e%2e|<script|union\s+select|\/wp-admin|\/phpmyadmin|\.env|\.git/i.test(req.url || '');
  if (suspicious) {
    try { appendAudit('nexago-main', { actor: 'system', action: 'suspicious-request-blocked', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: req.url }); } catch { /* ignore */ }
    sendSecurityAlert('suspicious-request-blocked', { ip: clientIp(req), device: req.headers['user-agent'] || '', reason: req.url });
    sendJson(res, 403, { ok: false, error: 'blocked' });
    return;
  }
  if (url.pathname.startsWith('/api/') && !rateLimit(req, 'api-global', 240, 60_000)) {
    sendSecurityAlert('api-rate-limit', { ip: clientIp(req), device: req.headers['user-agent'] || '', reason: req.url });
    sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' });
    return;
  }
  if (url.pathname === '/' || url.pathname === '/share') {
    const file = path.join(__dirname, 'share.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(500); res.end('share page missing'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders });
      res.end(data);
    });
    return;
  }
  if (url.pathname === '/store') {
    // Prefer the built React customer storefront (dist/customer.html), else the simple fallback page
    const built = path.join(__dirname, '..', 'dist', 'customer.html');
    if (fs.existsSync(built)) {
      fs.readFile(built, (err, data) => {
        if (err) { res.writeHead(500); res.end('customer build missing'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders });
        res.end(data);
      });
      return;
    }
    const file = path.join(__dirname, 'storefront.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(500); res.end('storefront page missing'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders });
      res.end(data);
    });
    return;
  }

  // ---- Serve every role portal site live (like the customer storefront) ----
  // Clean URL -> built html page. Both the pretty route (/driver) and the raw
  // file route (/driver.html) are supported so every site stays reachable.
  const SITE_PAGES = {
    '/admin': 'index.html',
    '/roles': 'roles.html',
    '/customer': 'customer.html',
    '/driver': 'driver.html',
    '/store': 'customer.html',
    '/store-site': 'store.html',
    '/store-admin': 'store-admin.html',
    '/super-admin': 'super-admin.html',
    '/super-admin-staff': 'super-admin-staff.html',
  };
  const sitePage = SITE_PAGES[url.pathname]
    || (url.pathname.endsWith('.html') && /^\/[a-z0-9-]+\.html$/.test(url.pathname) ? url.pathname.slice(1) : null);
  if (sitePage) {
    const file = path.join(__dirname, '..', 'dist', sitePage);
    if (fs.existsSync(file)) {
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(500); res.end(sitePage + ' missing'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders });
        res.end(data);
      });
      return;
    }
  }
  // Built front-end static assets (from vite build)
  if (url.pathname.startsWith('/assets/') || url.pathname === '/icon.svg' || url.pathname === '/vite.svg') {
    if (serveDistFile(res, url.pathname)) return;
  }

  // ---- Live store REST API ----
  const key = (url.searchParams.get('key') || '').trim() || 'default';
  if (url.pathname.startsWith('/api/') && !keyLooksSafe(key)) {
    appendAudit('nexago-main', { actor: 'system', action: 'unsafe-key-blocked', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: key });
    sendSecurityAlert('unsafe-key-blocked', { ip: clientIp(req), device: req.headers['user-agent'] || '', reason: key });
    sendJson(res, 400, { ok: false, error: 'INVALID_KEY' });
    return;
  }

  if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders); res.end(); return; }

  if (req.method === 'GET' && url.pathname === '/api/storefront') {
    const store = loadStore(key);
    sendJson(res, 200, { ok: true, key, updatedAt: store.updatedAt, ...storefrontView(store.state) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/state') {
    const store = loadStore(key);
    sendJson(res, 200, { ok: true, key, version: store.version, updatedAt: store.updatedAt, state: store.state });
    return;
  }

  // ---- Gmail/Google OTP login (Supabase email OTP) ----
  // Flow: POST /otp-send { email } → Supabase emails a 6-digit code to the
  // address; POST /otp-login { email, code, secretCode } verifies the code
  // server-side, then (for super-admin) checks the login secret code and mints
  // the same relay session as the password flow. The code is only minted when
  // Supabase is configured; otherwise this returns 503 so the UI can fall back
  // to the classic username/password form.
  const otpSend = async () => {
    if (!supabaseConfigured) { sendJson(res, 503, { ok: false, error: 'SUPABASE_NOT_CONFIGURED' }); return; }
    if (!rateLimit(req, 'otp-send', 6, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { sendJson(res, 400, { ok: false, error: 'INVALID_EMAIL' }); return; }
      ensureEnvSuperAdmins(key);
      const users = readSecurity(`users-${safeKey(key)}`, {});
      const found = findSecurityUser(users, email);
      if (!found.user || found.user.status !== 'Active') {
        appendAudit(key, { actor: email, action: 'otp-send-unknown-user', ip: clientIp(req), reason: 'email not an active platform user' });
        sendJson(res, 401, { ok: false, error: 'INVALID_EMAIL' });
        return;
      }
      try {
        await sendEmailOtp(email);
        appendAudit(key, { actor: email, role: found.user.role, action: 'otp-send-success', ip: clientIp(req), reason: 'Gmail OTP requested' });
        sendJson(res, 200, { ok: true });
      } catch (e) {
        const errCode = e && (e.code || e.error_code || e.status) ? ` [${e.code || e.error_code || e.status}]` : '';
        const details = e && e.details ? ` :: ${e.details}` : '';
        appendAudit(key, { actor: email, action: 'otp-send-failed', ip: clientIp(req), reason: `${String(e && e.message || e)}${errCode}${details}` });
        sendJson(res, 500, { ok: false, error: `${String(e && e.message || e)}${errCode}${details}` });
      }
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
  };

  const otpLogin = async () => {
    if (!supabaseConfigured) { sendJson(res, 503, { ok: false, error: 'SUPABASE_NOT_CONFIGURED' }); return; }
    if (!rateLimit(req, 'otp-login', 8, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim().replace(/\D/g, '');
      const secretCode = cleanEnvSecret(body.secretCode);
      if (!email || !code) { sendJson(res, 400, { ok: false, error: 'email and code required' }); return; }
      ensureEnvSuperAdmins(key);
      const users = readSecurity(`users-${safeKey(key)}`, {});
      const found = findSecurityUser(users, email);
      const user = found.user;
      if (!user || user.status !== 'Active') {
        appendAudit(key, { actor: email, action: 'otp-login-unknown-user', ip: clientIp(req) });
        sendJson(res, 401, { ok: false, error: 'INVALID_EMAIL' });
        return;
      }
      try {
        await verifyEmailOtp(email, code);
      } catch {
        appendAudit(key, { actor: email, action: 'otp-login-bad-code', ip: clientIp(req), reason: 'email OTP verification failed' });
        sendSecurityAlert('otp-login-bad-code', { actor: email, ip: clientIp(req), device: req.headers['user-agent'] || '' });
        sendJson(res, 401, { ok: false, error: 'INVALID_CODE' });
        return;
      }
      if (user.role === 'super-admin') {
        if (!SUPER_ADMIN_LOGIN_SECRET_CODE) {
          appendAudit(key, { actor: email, role: 'super-admin', action: 'otp-login-secret-missing', ip: clientIp(req) });
          sendJson(res, 503, { ok: false, error: 'LOGIN_SECRET_NOT_CONFIGURED' });
          return;
        }
        if (!secretCode) {
          sendJson(res, 200, { ok: true, requiresSecret: true, user: { userId: found.userId, role: user.role } });
          return;
        }
        if (secretCode !== SUPER_ADMIN_LOGIN_SECRET_CODE) {
          appendAudit(key, { actor: found.userId, role: 'super-admin', action: 'otp-login-secret-denied', ip: clientIp(req) });
          sendSecurityAlert('super-admin-login-secret-failed', { actor: found.userId, ip: clientIp(req), device: req.headers['user-agent'] || '' });
          sendJson(res, 401, { ok: false, error: 'INVALID_SECRET_CODE' });
          return;
        }
      }
      const canonicalUserId = found.userId;
      const token = crypto.randomBytes(32).toString('hex');
      const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
      sessions[token] = {
        userId: canonicalUserId,
        role: user.role,
        storeId: user.storeId || '',
        branchId: user.branchId || '',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 12,
        ip: clientIp(req),
        device: req.headers['user-agent'] || '',
        via: 'google-otp',
      };
      writeSecurity(`sessions-${safeKey(key)}`, sessions);
      appendAudit(key, { actor: canonicalUserId, role: user.role, action: 'otp-login-success', storeId: user.storeId, branchId: user.branchId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'Gmail OTP verified' });
      sendJson(res, 200, { ok: true, token, expiresAt: sessions[token].expiresAt, user: { userId: canonicalUserId, role: user.role, storeId: user.storeId || '', branchId: user.branchId || '' } });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
  };

  if (req.method === 'POST' && url.pathname === '/api/security/otp-send') { otpSend(); return; }
  if (req.method === 'POST' && url.pathname === '/api/security/otp-login') { otpLogin(); return; }

  if (req.method === 'POST' && url.pathname === '/api/security/register') {
    if (!rateLimit(req, 'security-register', 10, 60_000)) { sendSecurityAlert('register-rate-limit', { ip: clientIp(req), device: req.headers['user-agent'] || '' }); sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const role = String(body.role || '').trim();
      const userId = String(body.userId || '').trim();
      const password = cleanEnvSecret(body.password);
      const storeId = String(body.storeId || '').trim();
      const branchId = String(body.branchId || '').trim();
      if (!role || !userId || password.length < 8) { sendJson(res, 400, { ok: false, error: 'role, userId and 8+ char password required' }); return; }
      const users = readSecurity(`users-${safeKey(key)}`, {});
      if (users[userId]) { sendJson(res, 409, { ok: false, error: 'USER_EXISTS' }); return; }
      users[userId] = {
        userId,
        role,
        storeId,
        branchId,
        status: 'Active',
        password: hashPassword(password),
        createdAt: new Date().toISOString(),
        lastPasswordChangeAt: new Date().toISOString(),
      };
      writeSecurity(`users-${safeKey(key)}`, users);
      appendAudit(key, { actor: userId, role, action: 'security-user-registered', storeId, branchId, ip: clientIp(req), reason: body.reason || 'initial registration' });
      sendJson(res, 200, { ok: true, userId, role, storeId, branchId });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/login') {
    if (!rateLimit(req, 'security-login', 12, 60_000)) { sendSecurityAlert('login-rate-limit', { ip: clientIp(req), device: req.headers['user-agent'] || '' }); sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const userId = String(body.userId || '').trim();
      const password = String(body.password || '');
      const secretCode = cleanEnvSecret(body.secretCode);
      ensureEnvSuperAdmins(key);
      const users = readSecurity(`users-${safeKey(key)}`, {});
      const found = findSecurityUser(users, userId);
      const user = found.user;
      if (!user || user.status !== 'Active' || !verifyPassword(password, user.password)) {
        appendAudit(key, { actor: userId || 'unknown', action: 'login-failed', ip: clientIp(req), device: req.headers['user-agent'] || '' });
        sendSecurityAlert('login-failed', { actor: userId || 'unknown', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'invalid credentials or inactive user' });
        sendJson(res, 401, { ok: false, error: 'INVALID_LOGIN' });
        return;
      }
      if (user.cardExpiresAt && Date.now() > Date.parse(user.cardExpiresAt)) {
        appendAudit(key, { actor: found.userId, role: user.role, action: 'login-denied-card-expired', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'staff ID card expired' });
        sendJson(res, 401, { ok: false, error: 'CARD_EXPIRED' });
        return;
      }
      if (user.role === 'super-admin') {
        if (!SUPER_ADMIN_LOGIN_SECRET_CODE) {
          appendAudit(key, { actor: found.userId, role: user.role, action: 'super-admin-login-denied', ip: clientIp(req), reason: 'login secret env missing' });
          sendJson(res, 503, { ok: false, error: 'LOGIN_SECRET_NOT_CONFIGURED' });
          return;
        }
        if (!secretCode) {
          appendAudit(key, { actor: found.userId, role: user.role, action: 'super-admin-login-secret-required', ip: clientIp(req), reason: 'password accepted; waiting for secret code' });
          sendJson(res, 200, { ok: true, requiresSecret: true, user: { userId: found.userId, role: user.role } });
          return;
        }
        if (secretCode !== SUPER_ADMIN_LOGIN_SECRET_CODE) {
          appendAudit(key, { actor: found.userId, role: user.role, action: 'super-admin-login-denied', ip: clientIp(req), reason: 'invalid login secret code' });
          sendSecurityAlert('super-admin-login-secret-failed', { actor: found.userId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'invalid login secret code' });
          sendJson(res, 401, { ok: false, error: 'INVALID_SECRET_CODE' });
          return;
        }
      }
      const canonicalUserId = found.userId;
      const token = crypto.randomBytes(32).toString('hex');
      const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
      sessions[token] = {
        userId: canonicalUserId,
        role: user.role,
        storeId: user.storeId || '',
        branchId: user.branchId || '',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 12,
        ip: clientIp(req),
        device: req.headers['user-agent'] || '',
      };
      writeSecurity(`sessions-${safeKey(key)}`, sessions);
      appendAudit(key, { actor: canonicalUserId, role: user.role, action: 'login-success', storeId: user.storeId, branchId: user.branchId, ip: clientIp(req), device: req.headers['user-agent'] || '' });
      sendJson(res, 200, { ok: true, token, expiresAt: sessions[token].expiresAt, user: { userId: canonicalUserId, role: user.role, storeId: user.storeId || '', branchId: user.branchId || '' } });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/security/session') {
    const session = requireSession(req, key);
    if (!session) { sendJson(res, 401, { ok: false, error: 'NO_SESSION' }); return; }
    sendJson(res, 200, { ok: true, session });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/security/config-status') {
    sendJson(res, 200, {
      ok: true,
      key,
      superAdminUsersConfigured: SUPER_ADMIN_USERS.length > 0,
      superAdminUserCount: SUPER_ADMIN_USERS.length,
      superAdminPasswordConfigured: Boolean(SUPER_ADMIN_PASSWORD),
      superAdminLoginSecretConfigured: Boolean(SUPER_ADMIN_LOGIN_SECRET_CODE),
      superAdminPasswordChangeSecretConfigured: Boolean(SUPER_ADMIN_PASSWORD_CHANGE_CODE),
      encryptionConfigured: Boolean(DATA_ENCRYPTION_KEY),
      strictSecurity: STRICT_SECURITY,
      checkedAt: new Date().toISOString(),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/security/sessions') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
    const list = Object.entries(sessions).map(([token, item]) => ({
      token: `${token.slice(0, 10)}...${token.slice(-6)}`,
      tokenId: token,
      active: Date.now() <= Number(item.expiresAt || 0),
      ...item,
    })).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    sendJson(res, 200, { ok: true, sessions: list });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/session-action') {
    if (!rateLimit(req, 'session-action', 30, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const session = requireSession(req, key);
      if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
      const targetToken = String(body.tokenId || '');
      const action = String(body.action || '').toLowerCase();
      const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
      const target = sessions[targetToken];
      if (!target) { sendJson(res, 404, { ok: false, error: 'SESSION_NOT_FOUND' }); return; }
      if (action === 'inactive' || action === 'block') {
        sessions[targetToken] = {
          ...target,
          expiresAt: 0,
          status: action === 'block' ? 'Blocked' : 'Inactive',
          changedBy: session.userId,
          changedAt: Date.now(),
        };
        writeSecurity(`sessions-${safeKey(key)}`, sessions);
        appendAudit(key, { actor: session.userId, role: session.role, action: `session-${action}`, ip: clientIp(req), newValue: { targetUser: target.userId, targetIp: target.ip, targetDevice: target.device } });
        sendJson(res, 200, { ok: true, session: sessions[targetToken] });
        return;
      }
      sendJson(res, 400, { ok: false, error: 'INVALID_ACTION' });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/session-location') {
    if (!rateLimit(req, 'session-location', 60, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const session = requireSession(req, key);
      if (!session) { sendJson(res, 401, { ok: false, error: 'NO_SESSION' }); return; }
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const accuracy = Number(body.accuracy || 0);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) { sendJson(res, 400, { ok: false, error: 'INVALID_LOCATION' }); return; }
      const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
      if (!sessions[session.token]) { sendJson(res, 404, { ok: false, error: 'SESSION_NOT_FOUND' }); return; }
      sessions[session.token] = {
        ...sessions[session.token],
        location: { lat, lng, accuracy, updatedAt: Date.now() },
      };
      writeSecurity(`sessions-${safeKey(key)}`, sessions);
      sendJson(res, 200, { ok: true, location: sessions[session.token].location });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/super-admin/password') {
    if (!rateLimit(req, 'super-admin-password', 6, 60_000)) { sendSecurityAlert('super-admin-password-rate-limit', { ip: clientIp(req), device: req.headers['user-agent'] || '' }); sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      ensureEnvSuperAdmins(key);
      const session = requireSession(req, key);
      if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
      const currentPassword = cleanEnvSecret(body.currentPassword);
      const newPassword = cleanEnvSecret(body.newPassword);
      const secretCode = cleanEnvSecret(body.secretCode);
      if (!SUPER_ADMIN_PASSWORD_CHANGE_CODE) {
        appendAudit(key, { actor: session.userId, role: session.role, action: 'super-admin-password-change-denied', ip: clientIp(req), reason: 'secret code env missing' });
        sendJson(res, 503, { ok: false, error: 'SECRET_CODE_NOT_CONFIGURED' });
        return;
      }
      if (secretCode !== SUPER_ADMIN_PASSWORD_CHANGE_CODE) {
        appendAudit(key, { actor: session.userId, role: session.role, action: 'super-admin-password-change-denied', ip: clientIp(req), reason: 'invalid secret code' });
        sendSecurityAlert('super-admin-password-change-denied', { actor: session.userId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'invalid secret code' });
        sendJson(res, 403, { ok: false, error: 'INVALID_SECRET_CODE' });
        return;
      }
      if (newPassword.length < 8) { sendJson(res, 400, { ok: false, error: 'NEW_PASSWORD_TOO_SHORT' }); return; }
      const users = readSecurity(`users-${safeKey(key)}`, {});
      const actor = users[session.userId];
      if (!actor || !verifyPassword(currentPassword, actor.password)) {
        appendAudit(key, { actor: session.userId, role: session.role, action: 'super-admin-password-change-denied', ip: clientIp(req), reason: 'current password mismatch' });
        sendJson(res, 401, { ok: false, error: 'INVALID_CURRENT_PASSWORD' });
        return;
      }
      const changedUsers = Object.values(users).filter((user) =>
        user?.role === 'super-admin' && (user.userId === session.userId || user.source === 'env-seed' || SUPER_ADMIN_USERS.includes(user.userId))
      );
      const nextHash = hashPassword(newPassword);
      for (const user of changedUsers) {
        users[user.userId] = {
          ...user,
          password: nextHash,
          lastPasswordChangeAt: new Date().toISOString(),
          passwordChangedBy: session.userId,
        };
      }
      writeSecurity(`users-${safeKey(key)}`, users);
      appendAudit(key, { actor: session.userId, role: session.role, action: 'super-admin-password-changed', ip: clientIp(req), reason: body.reason || 'secret code verified', newValue: { changedUsers: changedUsers.map((u) => u.userId) } });
      sendJson(res, 200, { ok: true, changedUsers: changedUsers.map((u) => u.userId) });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/admin-set-password') {
    if (!rateLimit(req, 'admin-set-password', 30, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const session = requireSession(req, key);
      if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
      const userId = String(body.userId || '').trim();
      const password = cleanEnvSecret(body.password);
      const role = String(body.role || 'staff').trim();
      if (!userId || password.length < 8) { sendJson(res, 400, { ok: false, error: 'userId and 8+ char password required' }); return; }
      const users = readSecurity(`users-${safeKey(key)}`, {});
      users[userId] = {
        ...(users[userId] || {}),
        userId,
          role,
          storeId: String(body.storeId || users[userId]?.storeId || ''),
          branchId: String(body.branchId || users[userId]?.branchId || ''),
          permissions: Array.isArray(body.permissions) ? body.permissions.map((x) => String(x).trim()).filter(Boolean) : (users[userId]?.permissions || []),
          status: 'Active',
          cardExpiresAt: body.cardExpiresAt ? String(body.cardExpiresAt) : (users[userId]?.cardExpiresAt || ''),
          password: hashPassword(password),
        createdAt: users[userId]?.createdAt || new Date().toISOString(),
        lastPasswordChangeAt: new Date().toISOString(),
        passwordChangedBy: session.userId,
      };
      writeSecurity(`users-${safeKey(key)}`, users);
      appendAudit(key, { actor: session.userId, role: session.role, action: 'admin-set-user-password', ip: clientIp(req), reason: body.reason || 'super admin staff password reset', newValue: { userId, role } });
      sendJson(res, 200, { ok: true, userId, role });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/admin-set-user-status') {
    if (!rateLimit(req, 'admin-set-user-status', 30, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const session = requireSession(req, key);
      if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
      const userId = String(body.userId || '').trim();
      if (!userId) { sendJson(res, 400, { ok: false, error: 'userId required' }); return; }
      const users = readSecurity(`users-${safeKey(key)}`, {});
      const existing = users[userId];
      if (!existing) { sendJson(res, 404, { ok: false, error: 'USER_NOT_FOUND' }); return; }
      const next = { ...existing };
      if (body.status) next.status = String(body.status).trim();
      if (body.cardExpiresAt) next.cardExpiresAt = String(body.cardExpiresAt);
      users[userId] = next;
      writeSecurity(`users-${safeKey(key)}`, users);
      let revoked = 0;
      if (next.status !== 'Active') {
        const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
        for (const [token, s] of Object.entries(sessions)) {
          if (s.userId === userId && Date.now() <= Number(s.expiresAt || 0)) {
            sessions[token] = { ...s, expiresAt: 0, status: 'Blocked', changedBy: session.userId, changedAt: Date.now() };
            revoked++;
          }
        }
        if (revoked) writeSecurity(`sessions-${safeKey(key)}`, sessions);
      }
      appendAudit(key, { actor: session.userId, role: session.role, action: 'admin-set-user-status', ip: clientIp(req), reason: body.reason || '', oldValue: { userId, status: existing.status }, newValue: { userId, status: next.status, cardExpiresAt: next.cardExpiresAt || null, revokedSessions: revoked } });
      sendJson(res, 200, { ok: true, userId, status: next.status, revokedSessions: revoked });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/audit') {
    if (!rateLimit(req, 'security-audit', 120, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const session = requireSession(req, key);
      const actor = session?.userId || String(body.actor || 'anonymous');
      const item = appendAudit(key, {
        actor,
        role: session?.role || body.role || '',
        action: String(body.action || 'event'),
        oldValue: body.oldValue ?? null,
        newValue: body.newValue ?? null,
        reason: body.reason || '',
        ip: clientIp(req),
        device: req.headers['user-agent'] || '',
        storeId: body.storeId || session?.storeId || '',
        branchId: body.branchId || session?.branchId || '',
      });
      sendJson(res, 200, { ok: true, audit: item });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/security/audit') {
    if (!requireSession(req, key) && !isTrustedAutomation(req)) { sendJson(res, 401, { ok: false, error: 'NO_SESSION' }); return; }
    const audit = readSecurity(`audit-${safeKey(key)}`, []);
    sendJson(res, 200, { ok: true, key, audit: audit.slice().reverse().slice(0, 500) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/security/staff-card/verify') {
    if (!rateLimit(req, 'staff-card-verify', 120, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    const staffId = String(url.searchParams.get('staffId') || '').trim();
    const permanentNo = String(url.searchParams.get('permanentNo') || '').trim();
    const store = loadStore(key);
    const rows = Array.isArray(store.state.staff) ? store.state.staff : [];
    const staff = rows.find((s) => s && (String(s.id || '') === staffId || String(s.permanentNumber || '') === permanentNo));
    if (!staff) {
      appendAudit(key, { actor: 'public-scan', action: 'staff-card-verify-failed', ip: clientIp(req), reason: 'staff card not found', newValue: { staffId, permanentNo } });
      sendJson(res, 404, { ok: false, valid: false, error: 'STAFF_CARD_NOT_FOUND' });
      return;
    }
    const expiresAt = staff.cardExpiresAt || staff.expiresAt || '';
    const expired = expiresAt ? Date.now() > Date.parse(expiresAt) : false;
    const active = staff.status === 'Active' && !staff.archived && !expired;
    appendAudit(key, { actor: 'public-scan', action: 'staff-card-verified', ip: clientIp(req), reason: 'staff card barcode/qr scanned', newValue: { staffId: staff.id, permanentNo: staff.permanentNumber, active, expired } });
    sendJson(res, 200, {
      ok: true,
      valid: active,
      card: {
        id: String(staff.id || '').replace(/^(.{3}).+(.{2})$/, '$1***$2'),
        permanentNumber: String(staff.permanentNumber || '').replace(/^(.{4}).+(.{3})$/, '$1***$2'),
        status: staff.status,
        cardExpiresAt: expiresAt,
        expired,
      },
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/file') {
    if (!rateLimit(req, 'security-file', 20, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const session = requireSession(req, key);
      const name = String(body.name || 'upload.bin').replace(/[^\w .()-]/g, '').slice(0, 120);
      const dataUrl = String(body.dataUrl || '');
      if (!dataUrl.startsWith('data:') || dataUrl.length > 8_000_000) { sendJson(res, 400, { ok: false, error: 'invalid or too large file' }); return; }
      const id = `FILE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const meta = {
        id,
        name,
        type: String(body.type || dataUrl.slice(5, dataUrl.indexOf(';')) || 'application/octet-stream'),
        sha256: crypto.createHash('sha256').update(dataUrl).digest('hex'),
        owner: session?.userId || body.owner || 'anonymous',
        role: session?.role || body.role || '',
        storeId: body.storeId || session?.storeId || '',
        branchId: body.branchId || session?.branchId || '',
        uploadedAt: new Date().toISOString(),
        status: 'Stored',
      };
      const dir = path.join(FILES_DIR, safeKey(key));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(encryptJson({ ...meta, dataUrl })), 'utf8');
      appendAudit(key, { actor: meta.owner, role: meta.role, action: 'secure-file-uploaded', storeId: meta.storeId, branchId: meta.branchId, ip: clientIp(req), newValue: { id, name, type: meta.type, sha256: meta.sha256 } });
      sendJson(res, 200, { ok: true, file: meta, privateUrl: `/api/security/file/${id}?key=${encodeURIComponent(key)}` });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/security/file/')) {
    if (!requireSession(req, key) && !isTrustedAutomation(req)) { sendJson(res, 401, { ok: false, error: 'NO_SESSION' }); return; }
    const id = url.pathname.split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '');
    const file = path.join(FILES_DIR, safeKey(key), `${id}.json`);
    try {
      const obj = decryptJson(JSON.parse(fs.readFileSync(file, 'utf8')));
      sendJson(res, 200, { ok: true, file: { ...obj, dataUrl: undefined }, dataUrl: obj.dataUrl });
    } catch {
      sendJson(res, 404, { ok: false, error: 'file not found' });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/backups') {
    try {
      const dir = path.join(BACKUP_DIR, safeKey(key));
      const backups = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse().slice(0, 50).map((file) => ({ id: file.replace(/\.json$/, ''), file }))
        : [];
      sendJson(res, 200, { ok: true, key, backups });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: String(e && e.message || e) });
    }
    return;
  }

  if (req.method === 'POST' && (url.pathname === '/api/state' || url.pathname === '/api/push')) {
    if (!hasStateWriteAccess(req, key)) {
      appendAudit(key, { actor: 'system', action: 'state-write-blocked', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'strict security requires trusted session/token' });
      sendJson(res, 401, { ok: false, error: 'STATE_WRITE_LOCKED' });
      return;
    }
    readBody(req).then((body) => {
      const store = loadStore(key);
      const merged = mergeState(store, body || {});
      saveStore(key, merged);
      if (safeKey(key) !== 'nexago-main') {
        const central = loadStore('nexago-main');
        saveStore('nexago-main', mergeState(central, body || {}));
        notifyStateSubscribers('nexago-main', { sourceKey: safeKey(key), reason: 'state-push' });
      }
      notifyStateSubscribers(key, { reason: 'state-push' });
      sendJson(res, 200, { ok: true, key, updatedAt: merged.updatedAt });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/recover') {
    if (!hasStateWriteAccess(req, key)) { sendJson(res, 401, { ok: false, error: 'RECOVER_LOCKED' }); return; }
    readBody(req).then((body) => {
      const dir = path.join(BACKUP_DIR, safeKey(key));
      if (!fs.existsSync(dir)) { sendJson(res, 404, { ok: false, error: 'No backups found' }); return; }
      const requested = body && body.backupId ? String(body.backupId).replace(/[^a-zA-Z0-9_-]/g, '') + '.json' : '';
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
      const file = requested && files.includes(requested) ? requested : files[files.length - 1];
      if (!file) { sendJson(res, 404, { ok: false, error: 'No backups found' }); return; }
      const recovered = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const current = loadStore(key);
      backupStore(key, current, 'before-recover');
      const merged = mergeState(current, recovered.state || {});
      saveStore(key, merged);
      notifyStateSubscribers(key, { reason: 'state-recover' });
      sendJson(res, 200, { ok: true, key, recoveredFrom: file, updatedAt: merged.updatedAt });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    if (!rateLimit(req, 'events', 120, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const store = loadStore(key);
      const banners = Array.isArray(store.state && store.state.banners) ? store.state.banners : [];
      const ev = body || {};
      if ((ev.type === 'banner-impression' || ev.type === 'banner-click') && ev.bannerId) {
        const idx = banners.findIndex((b) => b && b.id === ev.bannerId);
        if (idx >= 0) {
          if (ev.type === 'banner-impression') banners[idx].impressions = Number(banners[idx].impressions || 0) + 1;
          else banners[idx].clicks = Number(banners[idx].clicks || 0) + 1;
          saveStore(key, store);
          notifyStateSubscribers(key, { reason: ev.type });
          sendJson(res, 200, { ok: true, counted: ev.type });
          return;
        }
      }
      sendJson(res, 200, { ok: true, counted: 'none' });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/order') {
    if (!rateLimit(req, 'orders', 30, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const store = loadStore(key);
      const order = body && body.order;
      if (!order || !order.id) { sendJson(res, 400, { ok: false, error: 'order.id required' }); return; }
      const orders = Array.isArray(store.state.orders) ? store.state.orders : [];
      // Anti-duplicate TrxID: reject reuse of a transaction id already on a live order
      if (order.trxId) {
        const trx = String(order.trxId).trim().toUpperCase();
        const dup = orders.find((o) => o && o.id !== order.id && o.trxId === trx && o.paymentStatus && o.paymentStatus !== 'Rejected');
        if (dup) {
          sendJson(res, 409, { ok: false, error: 'DUPLICATE_TRX', message: 'This TrxID has already been used for order #' + dup.id + ' — duplicate transactions are blocked' });
          return;
        }
      }
      const idx = orders.findIndex((o) => o && o.id === order.id);
      if (idx >= 0) orders[idx] = order; else orders.unshift(order);
      store.state.orders = orders;
      const notifs = Array.isArray(store.state.notifications) ? store.state.notifications : [];
      notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        title: 'New Customer Order #' + order.id,
        message: (order.customerName || 'Customer') + ' ordered from ' + (order.storeName || 'a store') + ' (৳' + Number(order.amount || 0).toLocaleString('en-IN') + ')',
        type: 'order',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      });
      store.state.notifications = notifs.slice(0, 100);
      store.updatedAt = new Date().toISOString();
      saveStore(key, store);
      if (safeKey(key) !== 'nexago-main') {
        const central = loadStore('nexago-main');
        saveStore('nexago-main', mergeState(central, { orders: [order], notifications: store.state.notifications }));
        notifyStateSubscribers('nexago-main', { sourceKey: safeKey(key), reason: 'order' });
      }
      notifyStateSubscribers(key, { reason: 'order' });
      sendJson(res, 200, { ok: true, orderId: order.id });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String((e && e.message) || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/reset') {
    if (!hasStateWriteAccess(req, key) || (!isTrustedAutomation(req) && url.searchParams.get('confirm') !== 'RESET')) {
      appendAudit(key, { actor: 'system', action: 'reset-blocked', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'missing confirm token' });
      sendJson(res, 403, { ok: false, error: 'RESET_CONFIRM_REQUIRED' });
      return;
    }
    try {
      const store = loadStore(key);
      backupStore(key, store, 'before-reset');
      if (fs.existsSync(storeFile(key))) fs.unlinkSync(storeFile(key));
    } catch { /* ignore */ }
    sendJson(res, 200, { ok: true, reset: key });
    return;
  }

  if (url.pathname === '/health') {
    sendJson(res, 200, { ok: true, rooms: rooms.size, port: PORT, publicUrl: PUBLIC_URL, lanIps: lanIps() });
    return;
  }
  if (url.pathname === '/info') {
    sendJson(res, 200, {
      base: publicBase(req),
      lanIps: lanIps(),
      publicUrl: PUBLIC_URL,
      port: PORT,
      supabase: supabaseConfigured,
      supabaseMirror: supabaseReady ? { stores: supabaseStoreMirror.size, security: supabaseSecurityMirror.size } : null,
    });
    return;
  }
  res.writeHead(404, corsHeaders); res.end('not found');
});

const { WebSocketServer } = await import('ws');
const wss = new WebSocketServer({ server, path: '/ws' });
const wsIpCounts = new Map();

function roomFor(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, { share: null, admin: null });
  return rooms.get(roomId);
}

wss.on('connection', (ws, req) => {
  const ip = clientIp(req);
  const current = wsIpCounts.get(ip) || 0;
  if (!isTrustedAutomation(req) && current >= 12) {
    try { ws.close(4008, 'too many connections'); } catch { /* ignore */ }
    return;
  }
  wsIpCounts.set(ip, current + 1);
  let roomId = null;
  let role = null;
  let stateKey = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'join') {
      roomId = String(msg.room || '').toUpperCase().trim();
      role = msg.role === 'admin' ? 'admin' : 'share';
      if (!roomId || roomId.length < 4) { ws.send(JSON.stringify({ type: 'error', message: 'Invalid room code' })); return; }
      const room = roomFor(roomId);
      if (role === 'share') {
        if (room.share && room.share !== ws) {
          try { room.share.send(JSON.stringify({ type: 'error', message: 'Replaced by a new share connection' })); room.share.close(4001, 'replaced'); } catch { /* ignore */ }
          room.share = null;
        }
        room.share = ws;
      } else {
        room.admin = ws;
      }
      ws.send(JSON.stringify({ type: 'joined', room: roomId, role }));
      if (room.admin) room.admin.send(JSON.stringify({ type: 'peer-status', role: 'share', online: room.share !== null }));
      if (room.share) room.share.send(JSON.stringify({ type: 'peer-status', role: 'admin', online: room.admin !== null }));
      return;
    }

    if (msg.type === 'state-subscribe') {
      stateKey = safeKey(msg.key || 'nexago-main');
      if (!stateSubscribers.has(stateKey)) stateSubscribers.set(stateKey, new Set());
      stateSubscribers.get(stateKey).add(ws);
      ws.send(JSON.stringify({ type: 'state-subscribed', key: stateKey }));
      return;
    }

    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    // Relay SDP offers/answers and ICE candidates between share <-> admin
    const target = role === 'share' ? room.admin : room.share;
    if (!target || target.readyState !== 1) return;

    if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice') {
      target.send(JSON.stringify({ type: msg.type, sdp: msg.sdp, candidate: msg.candidate, mode: msg.mode, from: role }));
    } else if (msg.type === 'device' && role === 'share') {
      target.send(JSON.stringify({ type: 'device', info: msg.info }));
    } else if (msg.type === 'status' && role === 'share') {
      target.send(JSON.stringify({ type: 'status', state: msg.state, message: msg.message }));
    }
  });

  ws.on('close', () => {
    wsIpCounts.set(ip, Math.max(0, (wsIpCounts.get(ip) || 1) - 1));
    if (stateKey && stateSubscribers.has(stateKey)) {
      stateSubscribers.get(stateKey).delete(ws);
      if (!stateSubscribers.get(stateKey).size) stateSubscribers.delete(stateKey);
    }
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (role === 'share' && room.share === ws) room.share = null;
    if (role === 'admin' && room.admin === ws) room.admin = null;
    if (room.admin) room.admin.send(JSON.stringify({ type: 'peer-status', role: 'share', online: room.share !== null }));
    if (room.share) room.share.send(JSON.stringify({ type: 'peer-status', role: 'admin', online: room.admin !== null }));
    if (!room.share && !room.admin) rooms.delete(roomId);
  });

  ws.on('error', () => {});
});

await initSupabaseBridge();
server.listen(PORT, HOST, () => {
  console.log(`NexaGo Remote Relay running on ${HOST}:${PORT}`);
  console.log(`Share page: http://localhost:${PORT}/share`);
});

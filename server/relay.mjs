import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || process.env.RELAY_PORT || 3100;
const HOST = process.env.RELAY_HOST || '0.0.0.0';
const PUBLIC_URL = (process.env.RELAY_PUBLIC_URL || '').replace(/\/$/, '');
const AGENT_TOKEN = process.env.NEXAGO_AGENT_TOKEN || '';
const MAX_JSON_BYTES = Number(process.env.NEXAGO_MAX_JSON_BYTES || 8_000_000);

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

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function isTrustedAutomation(req) {
  const ip = clientIp(req);
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  const tokenOk = AGENT_TOKEN && req.headers['x-nexago-agent'] === AGENT_TOKEN;
  return isLocal || tokenOk;
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

function readSecurity(name, fallback) {
  try { return JSON.parse(fs.readFileSync(securityFile(name), 'utf8')); } catch { return fallback; }
}

function writeSecurity(name, value) {
  fs.writeFileSync(securityFile(name), JSON.stringify(value), 'utf8');
  return value;
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

function sessionFromReq(req) {
  return String(req.headers['x-session-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || '').trim();
}

function requireSession(req, key) {
  const token = sessionFromReq(req);
  if (!token) return null;
  const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
  const session = sessions[token];
  if (!session || Date.now() > Number(session.expiresAt || 0)) return null;
  return { token, ...session };
}

function storeFile(key) {
  const safe = String(key || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'default';
  return path.join(DATA_DIR, safe + '.json');
}

function safeKey(key) {
  return String(key || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'default';
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
  return obj;
}

// Merge a client push into the stored state. Banner counters coming from the
// live storefront (impressions/clicks) survive subsequent admin pushes, and
// customer-placed orders + notifications are merged (union by id) so they
// survive admin pushes too. Every role site (driver/store/admin/staff) pushes
// the same shared keys (orders, drivers, notifications, products, payments,
// tickets, returns, refunds, wallet txns, ratings, stores, users, coupons),
// and array keys are merged union-by-id so no site's data is ever dropped.
function unionById(existing, incomingArr) {
  const byId = new Map((Array.isArray(existing) ? existing : []).map((x) => [x && x.id, x]));
  for (const item of incomingArr) if (item && item.id) byId.set(item.id, item);
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
  const suspicious = /\.\.|%2e%2e|<script|union\s+select|\/wp-admin|\/phpmyadmin|\.env|\.git/i.test(req.url || '');
  if (suspicious) {
    try { appendAudit('nexago-main', { actor: 'system', action: 'suspicious-request-blocked', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: req.url }); } catch { /* ignore */ }
    sendJson(res, 403, { ok: false, error: 'blocked' });
    return;
  }
  if (url.pathname.startsWith('/api/') && !rateLimit(req, 'api-global', 240, 60_000)) {
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

  if (req.method === 'POST' && url.pathname === '/api/security/register') {
    if (!rateLimit(req, 'security-register', 10, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const role = String(body.role || '').trim();
      const userId = String(body.userId || '').trim();
      const password = String(body.password || '');
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
    if (!rateLimit(req, 'security-login', 12, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const userId = String(body.userId || '').trim();
      const password = String(body.password || '');
      const users = readSecurity(`users-${safeKey(key)}`, {});
      const user = users[userId];
      if (!user || user.status !== 'Active' || !verifyPassword(password, user.password)) {
        appendAudit(key, { actor: userId || 'unknown', action: 'login-failed', ip: clientIp(req), device: req.headers['user-agent'] || '' });
        sendJson(res, 401, { ok: false, error: 'INVALID_LOGIN' });
        return;
      }
      const token = crypto.randomBytes(32).toString('hex');
      const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
      sessions[token] = {
        userId,
        role: user.role,
        storeId: user.storeId || '',
        branchId: user.branchId || '',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 12,
        ip: clientIp(req),
        device: req.headers['user-agent'] || '',
      };
      writeSecurity(`sessions-${safeKey(key)}`, sessions);
      appendAudit(key, { actor: userId, role: user.role, action: 'login-success', storeId: user.storeId, branchId: user.branchId, ip: clientIp(req), device: req.headers['user-agent'] || '' });
      sendJson(res, 200, { ok: true, token, expiresAt: sessions[token].expiresAt, user: { userId, role: user.role, storeId: user.storeId || '', branchId: user.branchId || '' } });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/security/session') {
    const session = requireSession(req, key);
    if (!session) { sendJson(res, 401, { ok: false, error: 'NO_SESSION' }); return; }
    sendJson(res, 200, { ok: true, session });
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
      fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ ...meta, dataUrl }), 'utf8');
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
      const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
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
    readBody(req).then((body) => {
      const store = loadStore(key);
      const merged = mergeState(store, body || {});
      saveStore(key, merged);
      if (safeKey(key) !== 'nexago-main') {
        const central = loadStore('nexago-main');
        saveStore('nexago-main', mergeState(central, body || {}));
      }
      sendJson(res, 200, { ok: true, key, updatedAt: merged.updatedAt });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/recover') {
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
      sendJson(res, 200, { ok: true, key, recoveredFrom: file, updatedAt: merged.updatedAt });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
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
          sendJson(res, 200, { ok: true, counted: ev.type });
          return;
        }
      }
      sendJson(res, 200, { ok: true, counted: 'none' });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/order') {
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
      }
      sendJson(res, 200, { ok: true, orderId: order.id });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String((e && e.message) || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/reset') {
    if (!isTrustedAutomation(req) && url.searchParams.get('confirm') !== 'RESET') {
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
    sendJson(res, 200, { base: publicBase(req), lanIps: lanIps(), publicUrl: PUBLIC_URL, port: PORT });
    return;
  }
  res.writeHead(404, corsHeaders); res.end('not found');
});

const { WebSocketServer } = await import('ws');
const wss = new WebSocketServer({ server, path: '/ws' });

function roomFor(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, { share: null, admin: null });
  return rooms.get(roomId);
}

wss.on('connection', (ws, req) => {
  let roomId = null;
  let role = null;

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

server.listen(PORT, HOST, () => {
  console.log(`NexaGo Remote Relay running on ${HOST}:${PORT}`);
  console.log(`Share page: http://localhost:${PORT}/share`);
});

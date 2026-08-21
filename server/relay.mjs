import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import zlib from 'node:zlib';
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

// One-time email OTPs from Supabase can only be verified once. After the code
// is accepted we remember the address here so the second step (secret code)
// can mint the session without re-verifying the already-consumed OTP.
const otpVerifiedPending = new Map(); // key:email -> { expiresAt }

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
const SUPABASE_BACKUP_DIR = path.resolve(process.env.NEXAGO_SUPABASE_BACKUP_DIR || path.join(process.cwd(), 'backups'));
const AUTO_SUPABASE_BACKUP = process.env.NEXAGO_AUTO_SUPABASE_BACKUP === '1';
const SUPABASE_BACKUP_INTERVAL_MS = Math.max(15, Number(process.env.NEXAGO_SUPABASE_BACKUP_INTERVAL_MIN || 1440)) * 60 * 1000;
const SUPABASE_BACKUP_RETENTION = Math.max(1, Number(process.env.NEXAGO_SUPABASE_BACKUP_RETENTION || 14));
const SECURITY_DIR = path.join(DATA_DIR, '_security');
const FILES_DIR = path.join(DATA_DIR, '_files');
for (const dir of [SECURITY_DIR, FILES_DIR]) if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const rateBuckets = new Map();
const alertBuckets = new Map();
const stateSubscribers = new Map();
const requestActivity = new Map();
let supabaseBackupRunning = false;
let lastSupabaseBackup = null;
let nextSupabaseBackupAt = null;

function bytesLabel(bytes) {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${n} B`;
}

function directorySize(dir, depth = 3) {
  try {
    if (!fs.existsSync(dir) || depth < 0) return 0;
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, ent) => {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) return sum + directorySize(p, depth - 1);
      if (ent.isFile()) return sum + fs.statSync(p).size;
      return sum;
    }, 0);
  } catch {
    return 0;
  }
}

function latestSupabaseBackupFile() {
  try {
    if (!fs.existsSync(SUPABASE_BACKUP_DIR)) return null;
    const files = listSupabaseBackupFiles();
    return files[0] || null;
  } catch {
    return null;
  }
}

function listSupabaseBackupFiles() {
  try {
    if (!fs.existsSync(SUPABASE_BACKUP_DIR)) return [];
    return fs.readdirSync(SUPABASE_BACKUP_DIR)
      .filter((name) => /^nexago_supabase_\d{8}_\d{6}\.sql\.gz$/.test(name))
      .map((name) => {
        const full = path.join(SUPABASE_BACKUP_DIR, name);
        const stat = fs.statSync(full);
        return { name, path: full, size: stat.size, sizeLabel: bytesLabel(stat.size), createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch {
    return [];
  }
}

function verifyBackupFile(file) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let bytes = 0;
    const gunzip = zlib.createGunzip();
    const input = fs.createReadStream(file);
    input.on('data', (chunk) => { bytes += chunk.length; });
    input.on('error', (err) => resolve({ ok: false, error: err.message, bytes, durationMs: Date.now() - startedAt }));
    gunzip.on('data', () => {});
    gunzip.on('error', (err) => resolve({ ok: false, error: err.message, bytes, durationMs: Date.now() - startedAt }));
    gunzip.on('end', () => resolve({ ok: true, bytes, durationMs: Date.now() - startedAt }));
    input.pipe(gunzip);
  });
}

async function supabaseTableCounts() {
  const tables = Object.entries(SUPABASE_TABLE).filter(([, table]) => String(table || '').startsWith('nexago_'));
  const counts = {};
  if (!supabaseConfigured || !serviceClient) return counts;
  await Promise.all(tables.map(async ([keyName, table]) => {
    try {
      const { count, error } = await serviceClient.from(table).select('*', { count: 'exact', head: true });
      counts[keyName] = error ? { table, error: error.message } : { table, count: count || 0 };
    } catch (err) {
      counts[keyName] = { table, error: String(err && err.message || err) };
    }
  }));
  return counts;
}

function localStateCounts(state = {}) {
  const keys = ['orders', 'products', 'categories', 'drivers', 'users', 'stores', 'branches', 'payments', 'staff', 'coupons', 'tickets', 'reviews', 'posSales'];
  return Object.fromEntries(keys.map((name) => [name, Array.isArray(state[name]) ? state[name].length : 0]));
}

function backupIntegrity(files) {
  if (!files.length) return { score: 0, status: 'No backup', warnings: ['No backup file found'] };
  const warnings = [];
  const latest = files[0];
  const previous = files[1];
  let score = 100;
  if (latest.size < 1024) { score -= 35; warnings.push('Latest backup is very small'); }
  if (previous && latest.size < previous.size * 0.5) { score -= 30; warnings.push('Latest backup is more than 50% smaller than previous backup'); }
  const ageMin = Math.round((Date.now() - Date.parse(latest.createdAt || 0)) / 60000);
  if (ageMin > Math.max(60, (SUPABASE_BACKUP_INTERVAL_MS / 60000) * 2)) { score -= 20; warnings.push('Latest backup is older than expected schedule'); }
  score = Math.max(0, score);
  return { score, status: score >= 80 ? 'Healthy' : score >= 50 ? 'Review' : 'Risk', warnings };
}

function detectStateConflicts(state = {}) {
  const groups = ['orders', 'products', 'drivers', 'users', 'stores', 'branches', 'payments', 'staff', 'coupons'];
  const conflicts = [];
  for (const group of groups) {
    const seen = new Map();
    for (const row of Array.isArray(state[group]) ? state[group] : []) {
      const id = String(row?.id || row?.productId || row?.orderId || row?.staffId || row?.storeId || row?.branchId || row?.code || '').trim();
      if (!id) continue;
      if (seen.has(id)) {
        conflicts.push({ group, id, first: seen.get(id), second: row, reason: 'duplicate-id' });
      } else {
        seen.set(id, row);
      }
    }
  }
  return conflicts.slice(0, 50);
}

function incidentEvents(audit = []) {
  const risky = /fail|failed|blocked|denied|suspicious|restore|rate-limit|lockdown|conflict/i;
  return audit.filter((row) => risky.test(String(row.action || row.reason || ''))).slice(-30).reverse();
}

async function simulateRestoreFile(file) {
  const verify = await verifyBackupFile(file);
  if (!verify.ok) return { ok: false, verify, tables: [], copySections: 0, estimatedRows: 0 };
  return new Promise((resolve) => {
    const tables = new Set();
    let copySections = 0;
    let estimatedRows = 0;
    let text = '';
    const gunzip = zlib.createGunzip();
    const input = fs.createReadStream(file);
    const finish = () => {
      const matches = text.matchAll(/(?:CREATE TABLE|COPY)\s+(?:public\.)?("?[\w_]+"?)/gi);
      for (const match of matches) tables.add(String(match[1] || '').replace(/"/g, ''));
      copySections = (text.match(/^COPY\s/igm) || []).length;
      estimatedRows = (text.match(/^\d|^[0-9a-f-]{8}-/igm) || []).length;
      resolve({ ok: true, verify, tables: Array.from(tables).slice(0, 80), copySections, estimatedRows });
    };
    input.on('error', (err) => resolve({ ok: false, verify, error: err.message, tables: [], copySections: 0, estimatedRows: 0 }));
    gunzip.on('data', (chunk) => { if (text.length < 8_000_000) text += chunk.toString('utf8'); });
    gunzip.on('error', (err) => resolve({ ok: false, verify, error: err.message, tables: [], copySections: 0, estimatedRows: 0 }));
    gunzip.on('end', finish);
    input.pipe(gunzip);
  });
}

function pruneSupabaseBackups() {
  try {
    if (!fs.existsSync(SUPABASE_BACKUP_DIR)) return;
    const files = fs.readdirSync(SUPABASE_BACKUP_DIR)
      .filter((name) => /^nexago_supabase_\d{8}_\d{6}\.sql\.gz$/.test(name))
      .map((name) => ({ name, path: path.join(SUPABASE_BACKUP_DIR, name), mtime: fs.statSync(path.join(SUPABASE_BACKUP_DIR, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const file of files.slice(SUPABASE_BACKUP_RETENTION)) {
      try { fs.unlinkSync(file.path); } catch { /* keep backup if delete fails */ }
    }
  } catch (err) {
    console.warn('[backup] retention cleanup failed:', err.message);
  }
}

function recordRequestActivity(key, req) {
  try {
    if (!req.url || !req.url.startsWith('/api/')) return;
    const safe = safeKey(key || 'default');
    const current = requestActivity.get(safe) || { key: safe, count: 0, lastAt: '', lastPath: '', ip: '', device: '' };
    requestActivity.set(safe, {
      ...current,
      count: current.count + 1,
      lastAt: new Date().toISOString(),
      lastPath: req.url.split('?')[0],
      ip: clientIp(req),
      device: String(req.headers['user-agent'] || '').slice(0, 120),
    });
  } catch {
    /* ignore activity failure */
  }
}

function runSupabaseBackup(reason = 'scheduled') {
  if (!process.env.SUPABASE_DB_URL) {
    console.warn('[backup] SUPABASE_DB_URL missing; automatic Supabase backup skipped.');
    return;
  }
  if (supabaseBackupRunning) {
    console.warn('[backup] previous Supabase backup still running; skipped.');
    return;
  }

  fs.mkdirSync(SUPABASE_BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const target = path.join(SUPABASE_BACKUP_DIR, `nexago_supabase_${stamp}.sql.gz`);
  const tempTarget = `${target}.tmp`;
  supabaseBackupRunning = true;

  const dump = spawn('pg_dump', [process.env.SUPABASE_DB_URL, '--no-owner', '--no-privileges'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const gzip = zlib.createGzip({ level: 9 });
  const out = fs.createWriteStream(tempTarget);
  let stderr = '';
  let dumpExitCode = null;
  let writeFinished = false;

  const finalize = () => {
    if (dumpExitCode === null || !writeFinished) return;
    supabaseBackupRunning = false;
    if (dumpExitCode !== 0) {
      try { fs.rmSync(tempTarget, { force: true }); } catch { /* ignore */ }
      console.warn(`[backup] Supabase backup failed (${reason}) code=${dumpExitCode}: ${stderr.trim() || 'unknown error'}`);
      void sendSecurityAlert('supabase-backup-failed', { reason: `${reason} code=${dumpExitCode} ${stderr.trim() || 'unknown error'}` });
      return;
    }
      try {
        fs.renameSync(tempTarget, target);
        const stat = fs.statSync(target);
        lastSupabaseBackup = { name: path.basename(target), path: target, size: stat.size, sizeLabel: bytesLabel(stat.size), createdAt: new Date().toISOString(), status: 'Success', reason };
        pruneSupabaseBackups();
        console.log(`[backup] Supabase backup saved (${reason}): ${target}`);
    } catch (err) {
      try { fs.rmSync(tempTarget, { force: true }); } catch { /* ignore */ }
      console.warn('[backup] finalize failed:', err.message);
      void sendSecurityAlert('supabase-backup-finalize-failed', { reason: err.message });
    }
  };

  dump.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  dump.on('error', (err) => {
    supabaseBackupRunning = false;
    try { fs.rmSync(tempTarget, { force: true }); } catch { /* ignore */ }
    console.warn('[backup] pg_dump failed to start:', err.message);
    void sendSecurityAlert('supabase-backup-start-failed', { reason: err.message });
  });
  out.on('error', (err) => {
    supabaseBackupRunning = false;
    try { dump.kill(); } catch { /* ignore */ }
    try { fs.rmSync(tempTarget, { force: true }); } catch { /* ignore */ }
    console.warn('[backup] write failed:', err.message);
    void sendSecurityAlert('supabase-backup-write-failed', { reason: err.message });
  });
  dump.stdout.pipe(gzip).pipe(out);
  dump.on('close', (code) => {
    dumpExitCode = code;
    finalize();
  });
  out.on('finish', () => {
    writeFinished = true;
    finalize();
  });
}

function startAutomaticSupabaseBackups() {
  if (!AUTO_SUPABASE_BACKUP) {
    console.log('[backup] automatic Supabase backup disabled. Set NEXAGO_AUTO_SUPABASE_BACKUP=1 to enable.');
    return;
  }
  console.log(`[backup] automatic Supabase backup enabled every ${Math.round(SUPABASE_BACKUP_INTERVAL_MS / 60000)} minutes.`);
  nextSupabaseBackupAt = new Date(Date.now() + 30_000).toISOString();
  setTimeout(() => {
    runSupabaseBackup('startup');
    nextSupabaseBackupAt = new Date(Date.now() + SUPABASE_BACKUP_INTERVAL_MS).toISOString();
  }, 30_000).unref();
  setInterval(() => {
    runSupabaseBackup('scheduled');
    nextSupabaseBackupAt = new Date(Date.now() + SUPABASE_BACKUP_INTERVAL_MS).toISOString();
  }, SUPABASE_BACKUP_INTERVAL_MS).unref();
}

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
  if (isTrustedAutomation(req)) return true;
  const session = requireSession(req, key);
  if (session) {
    if (session.role === 'super-admin') return true;
    if (['store-admin', 'branch-admin', 'driver', 'customer', 'staff'].includes(session.role)) {
      const safeKeyValue = safeKey(key);
      const sessionStoreId = String(session.storeId || '');
      const allowedMain = safeKeyValue === 'nexago-main' && (session.role === 'store-admin' || session.role === 'branch-admin' || session.role === 'staff');
      if (allowedMain) return true;
      if (!sessionStoreId) return false;
      if (safeKeyValue === sessionStoreId) return true;
      if (safeKeyValue.startsWith(`${sessionStoreId}-`)) return true;
      return false;
    }
    return true;
  }
  if (!STRICT_SECURITY) return true;
  return !!(STATE_WRITE_TOKEN && req.headers['x-nexago-agent'] === STATE_WRITE_TOKEN);
}

// RBAC: does the current session hold a permission? Super-admin and owners of the
// 'all' permission always pass. Used to gate sensitive security endpoints the
// same way the client gates UI actions.
function hasPermission(req, key, permission) {
  const session = requireSession(req, key);
  if (!session) return false;
  if (session.role === 'super-admin') return true;
  const perms = Array.isArray(session.permissions) ? session.permissions.map((p) => String(p).toLowerCase()) : [];
  return perms.includes('all') || perms.includes(String(permission).toLowerCase());
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
  identities: 'nexago_identities',
  customers: 'nexago_customers',
  wallets: 'nexago_wallets',
  walletTxns: 'nexago_wallet_txns',
  auditLog: 'nexago_audit_log',
  files: 'nexago_files',
  products: 'nexago_products',
  coupons: 'nexago_coupons',
  branches: 'nexago_branches',
  staff: 'nexago_staff',
  payments: 'nexago_payments',
  orderHistory: 'nexago_order_history',
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
  supabaseMirrorNormalizedState(key, value && value.state).catch((e) => console.error('[supabase] normalized mirror failed:', e.message));
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function boolActive(value, fallback = true) {
  const text = String(value ?? '').toLowerCase();
  if (['false', 'inactive', 'suspended', 'rejected', 'archived', 'deleted', 'out of stock'].includes(text)) return false;
  if (['true', 'active', 'approved', 'in stock', 'pending verification'].includes(text)) return true;
  return fallback;
}

// Display-only time strings like "09:10 AM" (toLocaleTimeString) must never be
// written into a timestamptz column — that aborts the whole Supabase mirror.
function safeTimestamp(value, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
}

async function upsertNormalized(table, rows, onConflict) {
  if (!supabaseConfigured || !serviceClient || !Array.isArray(rows) || rows.length === 0) return;
  const { error } = await serviceClient.from(table).upsert(rows, { onConflict });
  if (error) throw error;
}

function orderHistoryRows(platformKey, order) {
  if (!order || !order.id) return [];
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const baseStoreId = firstText(order.storeId, order.ownerStoreId, order.storeName);
  const baseBranchId = firstText(order.branchId);
  const rows = timeline.map((event, index) => {
    const at = safeTimestamp(event?.time || event?.createdAt || event?.at);
    const status = firstText(event?.status, order.status, 'updated');
    const actor = firstText(event?.actor, 'system');
    const note = firstText(event?.note, event?.reason);
    const dayKey = firstText(event?.dayKey, at.slice(0, 10));
    return {
      event_id: firstText(event?.id, `${platformKey}:${order.id}:${at}:${index}:${status}:${actor}`),
      platform_key: platformKey,
      order_id: String(order.id),
      store_id: baseStoreId,
      branch_id: baseBranchId,
      customer_id: firstText(order.customerId),
      driver_id: firstText(order.driverId),
      status,
      actor,
      note,
      day_key: dayKey,
      payload: { orderSnapshot: order, event },
      created_at: at,
    };
  });
  if (!rows.length) {
    const at = safeTimestamp(order.placedAt || order.createdAt || order.date);
    rows.push({
      event_id: `${platformKey}:${order.id}:${at}:created`,
      platform_key: platformKey,
      order_id: String(order.id),
      store_id: baseStoreId,
      branch_id: baseBranchId,
      customer_id: firstText(order.customerId),
      driver_id: firstText(order.driverId),
      status: firstText(order.status, 'created'),
      actor: firstText(order.source, 'system'),
      note: 'Order saved without timeline; permanent history row created by relay',
      day_key: at.slice(0, 10),
      payload: { orderSnapshot: order },
      created_at: at,
    });
  }
  return rows;
}

async function mirrorOrderHistory(platformKey, orders) {
  if (!supabaseConfigured || !serviceClient) return;
  const input = Array.isArray(orders) ? orders : [orders];
  const rows = input.flatMap((order) => orderHistoryRows(platformKey, order)).filter((row) => row.event_id && row.order_id);
  if (!rows.length) return;
  const { error } = await serviceClient.from(SUPABASE_TABLE.orderHistory).upsert(rows, { onConflict: 'event_id' });
  if (error) throw error;
}

async function supabaseMirrorNormalizedState(key, state = {}) {
  if (!supabaseConfigured || !serviceClient || !state || typeof state !== 'object') return;
  const platformKey = safeKey(key);
  const now = new Date().toISOString();
  const defaultStoreId = firstText(state.profile?.storeId, state.profile?.id, platformKey);

  const branches = (Array.isArray(state.branches) ? state.branches : [])
    .map((b) => ({
      branch_id: firstText(b.id, b.branchId),
      platform_key: platformKey,
      store_id: firstText(b.storeId, b.ownerStoreId, defaultStoreId),
      name: firstText(b.name, b.branchName, 'Branch'),
      address: firstText(b.address, b.location),
      is_active: boolActive(b.status ?? b.isActive, true),
      payload: b,
      created_at: safeTimestamp(b.createdAt),
      updated_at: safeTimestamp(b.updatedAt),
    }))
    .filter((b) => b.branch_id && b.store_id);

  const products = (Array.isArray(state.products) ? state.products : [])
    .map((p) => ({
      product_id: firstText(p.id, p.productId, p.sku),
      platform_key: platformKey,
      store_id: firstText(p.storeId, p.ownerStoreId, defaultStoreId),
      branch_id: firstText(p.branchId),
      name: firstText(p.name, p.title, 'Product'),
      sku: firstText(p.sku, p.barcode),
      category: firstText(p.category),
      price: Number(p.price || 0),
      promo_price: p.promoPrice || p.salePrice ? Number(p.promoPrice || p.salePrice || 0) : null,
      stock_qty: Number(p.stock ?? p.stockQty ?? p.quantity ?? 0),
      is_active: boolActive(p.status ?? p.isActive, Number(p.stock ?? 0) > 0),
      payload: p,
      created_at: safeTimestamp(p.createdAt),
      updated_at: safeTimestamp(p.updatedAt),
    }))
    .filter((p) => p.product_id && p.store_id && p.name);

  const coupons = (Array.isArray(state.coupons) ? state.coupons : [])
    .map((c) => ({
      coupon_id: firstText(c.id, c.couponId),
      code: firstText(c.code, c.couponCode, c.id),
      platform_key: platformKey,
      store_id: firstText(c.storeId, c.ownerStoreId),
      branch_id: firstText(c.branchId),
      discount_type: firstText(c.discountType, c.type, 'percentage'),
      discount_value: Number(c.discountValue ?? c.discount ?? c.value ?? 0),
      min_spend: Number(c.minSpend ?? c.minOrder ?? 0),
      usage_limit: Number(c.usageLimit ?? c.limit ?? 100),
      used_count: Number(c.usedCount ?? c.used ?? 0),
      expires_at: c.expiresAt || c.endDate || null,
      is_active: boolActive(c.status ?? c.isActive, true),
      payload: c,
      created_at: safeTimestamp(c.createdAt),
      updated_at: safeTimestamp(c.updatedAt),
    }))
    .filter((c) => c.code);

  const staff = (Array.isArray(state.staff) ? state.staff : [])
    .map((s) => ({
      staff_id: firstText(s.id, s.staffId, s.permanentNumber),
      platform_key: platformKey,
      store_id: firstText(s.storeId, s.ownerStoreId, defaultStoreId),
      branch_id: firstText(s.branchId),
      name: firstText(s.name, s.fullName, 'Staff'),
      phone: firstText(s.phone, s.mobile, 'N/A'),
      role: firstText(s.role, s.assignedRole, 'staff'),
      is_active: boolActive(s.status ?? s.isActive, true),
      payload: s,
      created_at: safeTimestamp(s.createdAt),
      updated_at: safeTimestamp(s.updatedAt),
    }))
    .filter((s) => s.staff_id && s.store_id);

  const payments = (Array.isArray(state.payments) ? state.payments : [])
    .map((p) => ({
      payment_id: firstText(p.id, p.paymentId, p.trxId),
      platform_key: platformKey,
      order_id: firstText(p.orderId, p.order_id, p.orderNo, 'UNKNOWN'),
      store_id: firstText(p.storeId, p.ownerStoreId),
      branch_id: firstText(p.branchId),
      gateway: firstText(p.gateway, p.method, p.paymentMethod, 'cash'),
      amount: Number(p.amount || 0),
      currency: firstText(p.currency, 'BDT'),
      status: firstText(p.status, p.paymentStatus, 'pending').toLowerCase(),
      gateway_response: p.gatewayResponse || p.gateway_response || {},
      payload: p,
      created_at: safeTimestamp(p.createdAt || p.paidAt || p.paymentDate),
      updated_at: safeTimestamp(p.updatedAt),
    }))
    .filter((p) => p.payment_id);

  await Promise.all([
    upsertNormalized(SUPABASE_TABLE.branches, branches, 'branch_id'),
    upsertNormalized(SUPABASE_TABLE.products, products, 'product_id'),
    upsertNormalized(SUPABASE_TABLE.coupons, coupons, 'code'),
    upsertNormalized(SUPABASE_TABLE.staff, staff, 'staff_id'),
    upsertNormalized(SUPABASE_TABLE.payments, payments, 'payment_id'),
    mirrorOrderHistory(platformKey, Array.isArray(state.orders) ? state.orders : []),
  ]);
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
  // Permanent append-only mirror: every audit row is inserted once into
  // nexago_audit_log, so the full history survives in PostgreSQL.
  if (supabaseConfigured && serviceClient) {
    try {
      serviceClient.from(SUPABASE_TABLE.auditLog).insert({
        platform_key: safeKey(key),
        audit_id: item.id,
        actor: String(entry.actor || 'system').slice(0, 200),
        role: String(entry.role || '').slice(0, 60),
        action: String(entry.action || 'event').slice(0, 120),
        store_id: String(entry.storeId || '').slice(0, 100),
        branch_id: String(entry.branchId || '').slice(0, 100),
        ip: String(entry.ip || '').slice(0, 100),
        device: String(entry.device || '').slice(0, 300),
        reason: String(entry.reason || '').slice(0, 2000),
        payload: {
          oldValue: entry.oldValue ?? null,
          newValue: entry.newValue ?? null,
          time: item.time,
        },
        created_at: item.time,
      }).then(({ error }) => {
        if (error && !String(error.message).includes('duplicate')) console.error('[supabase] audit insert failed:', error.message);
      }).catch(() => { /* non-fatal */ });
    } catch { /* ignore */ }
  }
  return item;
}

// ---- Single Account Rule (Phase 2) ----
// Every real-world identity (phone / Gmail) may belong to exactly ONE platform
// account across ALL stores. Identity claims are stored in Supabase
// (nexago_identities) with unique indexes on phone_norm and email_norm, and are
// also mirrored into the local security file as a fallback so uniqueness works
// even when Supabase is briefly unreachable.
const IDENTITY_FILE = 'identities';
const IDENTITY_ROLES = ['customer', 'driver', 'store-admin', 'branch-admin', 'staff'];

function normalizePhoneForIdentity(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function normalizeEmailForIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

function readIdentities() {
  const list = readSecurity(IDENTITY_FILE, []);
  return Array.isArray(list) ? list : [];
}

function writeIdentities(list) {
  writeSecurity(IDENTITY_FILE, list.slice(0, 20000));
  return list;
}

// Find any existing account that already claims this phone or email.
function findIdentityConflict({ phone = '', email = '', excludeId = '', excludeRole = '' }) {
  const p = normalizePhoneForIdentity(phone);
  const e = normalizeEmailForIdentity(email);
  if (!p && !e) return null;
  return readIdentities().find((it) => it
    && !(it.identity_id === excludeId && it.role === excludeRole)
    && ((p && normalizePhoneForIdentity(it.phone) === p) || (e && normalizeEmailForIdentity(it.email) === e)));
}

// Upsert one identity claim into Supabase + local mirror. Returns { ok, conflict? }
async function claimIdentity({ role, identityId, name = '', phone = '', email = '', platformKey = '', status = 'Active' }) {
  if (!IDENTITY_ROLES.includes(role) || !identityId) return { ok: false, error: 'INVALID_IDENTITY' };
  const p = normalizePhoneForIdentity(phone);
  const e = normalizeEmailForIdentity(email);
  const localConflict = findIdentityConflict({ phone: p, email: e, excludeId: identityId, excludeRole: role });
  if (localConflict) {
    return { ok: false, error: 'IDENTITY_CLAIMED', conflict: { role: localConflict.role, identityId: localConflict.identity_id, name: localConflict.name, phone: localConflict.phone, email: localConflict.email } };
  }
  const row = {
    role,
    platform_key: platformKey || 'nexago-main',
    identity_id: identityId,
    name: String(name || ''),
    phone: p ? `+${p}` : '',
    phone_norm: p,
    email: e,
    email_norm: e,
    status,
    updated_at: new Date().toISOString(),
  };
  const list = readIdentities();
  const idx = list.findIndex((it) => it && it.role === role && it.identity_id === identityId);
  if (idx >= 0) list[idx] = { ...list[idx], ...row, created_at: list[idx].created_at }; else list.push(row);
  writeIdentities(list);
  if (supabaseConfigured && serviceClient) {
    const { error } = await serviceClient.from(SUPABASE_TABLE.identities).upsert(row, { onConflict: 'role,identity_id' });
    if (error) {
      // Re-read what Supabase actually holds so the local mirror stays truthful.
      if (String(error.message).includes('duplicate')) {
        const { data } = await serviceClient.from(SUPABASE_TABLE.identities)
          .select('role,identity_id,name,phone,email')
          .or(`phone_norm.eq.${p},email_norm.eq.${e}`)
          .limit(5);
        const dbConflict = (data || []).find((it) => !(it.identity_id === identityId && it.role === role));
        if (dbConflict) {
          return { ok: false, error: 'IDENTITY_CLAIMED', conflict: dbConflict };
        }
      }
    }
  }
  return { ok: true, identity: row };
}

// ---- Unified ID + Permanent Cloud (Phase 3) ----
// The customer's permanent NEX... ID, profile, wallet balance and wallet history
// live in Supabase (nexago_customers / nexago_wallets / nexago_wallet_txns) keyed
// by customerId, with the local security file as a fallback. Registering adopts
// the existing customerId when the phone or Gmail is already known, so a wiped
// browser / new device gets the SAME ID and wallet back.
const CUSTOMER_FILE = 'customers';

function readCustomers() {
  const list = readSecurity(CUSTOMER_FILE, []);
  return Array.isArray(list) ? list : [];
}

function writeCustomers(list) {
  writeSecurity(CUSTOMER_FILE, list.slice(0, 50000));
  return list;
}

function findCustomerByPhoneOrEmail(phone = '', email = '') {
  const p = normalizePhoneForIdentity(phone);
  const e = normalizeEmailForIdentity(email);
  if (!p && !e) return null;
  return readCustomers().find((c) => c && ((p && normalizePhoneForIdentity(c.phone) === p) || (e && normalizeEmailForIdentity(c.email) === e)));
}

async function supabaseFetchCustomer(customerId) {
  if (!supabaseConfigured || !serviceClient || !customerId) return null;
  const { data, error } = await serviceClient.from(SUPABASE_TABLE.customers).select('*').eq('customer_id', customerId).maybeSingle();
  if (error || !data) return null;
  return {
    customerId: data.customer_id,
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    payload: data.payload || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function supabaseFetchWallet(customerId) {
  if (!supabaseConfigured || !serviceClient || !customerId) return null;
  const { data, error } = await serviceClient.from(SUPABASE_TABLE.wallets).select('*').eq('customer_id', customerId).maybeSingle();
  if (error || !data) return null;
  return { customerId: data.customer_id, balance: Number(data.balance || 0), updatedAt: data.updated_at };
}

async function supabaseFetchTxns(customerId, limit = 100) {
  if (!supabaseConfigured || !serviceClient || !customerId) return [];
  const { data, error } = await serviceClient.from(SUPABASE_TABLE.walletTxns)
    .select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data.map((t) => ({ id: t.txn_ref || `TXN-${t.id}`, customerId: t.customer_id, type: t.type, amount: Number(t.amount || 0), status: t.status || 'Completed', date: t.created_at, meta: t.meta || {} }));
}

async function supabaseUpsertCustomer(customer) {
  if (!supabaseConfigured || !serviceClient || !customer || !customer.customerId) return;
  try {
    await serviceClient.from(SUPABASE_TABLE.customers).upsert({
      customer_id: customer.customerId,
      name: String(customer.name || '').slice(0, 200),
      phone: String(customer.phone || '').slice(0, 30),
      phone_norm: normalizePhoneForIdentity(customer.phone),
      email: normalizeEmailForIdentity(customer.email).slice(0, 200),
      email_norm: normalizeEmailForIdentity(customer.email),
      payload: customer.payload || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'customer_id' });
  } catch { /* ignore */ }
}

async function supabaseUpsertWallet(customerId, balance) {
  if (!supabaseConfigured || !serviceClient || !customerId) return;
  try {
    await serviceClient.from(SUPABASE_TABLE.wallets).upsert({ customer_id: customerId, balance: Number(balance || 0), updated_at: new Date().toISOString() }, { onConflict: 'customer_id' });
  } catch { /* ignore */ }
}

async function supabaseInsertWalletTxn(customerId, txn) {
  if (!supabaseConfigured || !serviceClient || !customerId) return;
  try {
    await serviceClient.from(SUPABASE_TABLE.walletTxns).insert({
      customer_id: customerId,
      txn_ref: String(txn.id || '').slice(0, 100),
      type: String(txn.type || '').slice(0, 60),
      amount: Number(txn.amount || 0),
      status: String(txn.status || 'Completed').slice(0, 40),
      meta: { date: txn.date || '', ...(txn.meta || {}) },
      created_at: new Date().toISOString(),
    });
  } catch { /* ignore */ }
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

const pendingStoreWrites = new Map();
const pendingStoreTimers = new Map();

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
  const pending = pendingStoreWrites.get(key);
  if (pending) return pending;
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

function writeStoreImmediate(key, obj, mirrorSupabase = true) {
  backupStore(key, loadStore(key), 'before-save');
  const target = storeFile(key);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj), 'utf8');
  fs.renameSync(tmp, target);
  backupStore(key, obj, 'after-save');
  if (mirrorSupabase) supabaseStoreWrite(key, obj);
}

function saveStore(key, obj) {
  pendingStoreWrites.set(key, obj);
  const existing = pendingStoreTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingStoreTimers.delete(key);
    const latest = pendingStoreWrites.get(key);
    pendingStoreWrites.delete(key);
    try { writeStoreImmediate(key, latest, false); } catch (err) { console.error('[store] deferred write failed:', err.message); }
  }, 250);
  pendingStoreTimers.set(key, timer);
  supabaseStoreWrite(key, obj);
  return obj;
}

function flushPendingStoreWrites() {
  for (const timer of pendingStoreTimers.values()) clearTimeout(timer);
  pendingStoreTimers.clear();
  for (const [key, obj] of pendingStoreWrites.entries()) {
    try { writeStoreImmediate(key, obj); } catch (err) { console.error('[store] flush failed:', err.message); }
  }
  pendingStoreWrites.clear();
}

process.once('SIGINT', () => { flushPendingStoreWrites(); process.exit(0); });
process.once('SIGTERM', () => { flushPendingStoreWrites(); process.exit(0); });

async function loadStoreLatest(key) {
  return loadStore(key);
}

async function saveStorePermanent(key, obj) {
  saveStore(key, obj);
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
  if (existing && incoming && existing.id && incoming.id && existing.id === incoming.id && (Array.isArray(existing.timeline) || Array.isArray(incoming.timeline))) {
    const byKey = new Map();
    for (const ev of [...(Array.isArray(existing.timeline) ? existing.timeline : []), ...(Array.isArray(incoming.timeline) ? incoming.timeline : [])]) {
      if (!ev || typeof ev !== 'object') continue;
      const key = `${ev.time || ev.at || ev.createdAt || ''}|${ev.status || ''}|${ev.actor || ''}|${ev.note || ev.reason || ''}`;
      byKey.set(key, ev);
    }
    const timeline = Array.from(byKey.values()).sort((a, b) => (Number(a.time || Date.parse(a.at || a.createdAt || '') || 0) - Number(b.time || Date.parse(b.at || b.createdAt || '') || 0)));
    const newer = latestRecord({ ...existing, timeline: undefined }, { ...incoming, timeline: undefined });
    return { ...newer, timeline };
  }
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
  const arrayUnion = new Set(['orders', 'notifications', 'drivers', 'payments', 'tickets', 'users', 'stores', 'branches', 'products', 'categories', 'inventory', 'staff', 'reviews', 'marketing', 'returns', 'refunds', 'walletTxns', 'ratings', 'coupons', 'deletedRecords']);
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

function storefrontView(state, customerId = '') {
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
      storeId: p.storeId || '',
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
  const stores = (Array.isArray(state.stores) ? state.stores : [])
    .filter((s) => s && s.id)
    .map((s) => ({ id: s.id, name: s.name || s.storeName || '', status: s.status || 'Active' }));
  const orders = (Array.isArray(state.orders) ? state.orders : [])
    .filter((o) => o && (!customerId || String(o.customerId || o.customer || '') === customerId))
    .map((o) => ({
      id: o.id,
      status: o.status || 'Pending',
      amount: Number(o.amount || 0),
      customerName: o.customerName || '',
      customerId: o.customerId || '',
      customerPhone: o.customerPhone || '',
      storeName: o.storeName || '',
      items: Array.isArray(o.items) ? o.items : [],
      date: o.date || '',
      time: o.time || '',
      placedAt: o.placedAt || 0,
    }));
  return { profile, banners, products, stores, orders };
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
    const cacheHeader = /\.(?:js|css|woff2|png|jpg|jpeg|webp|svg|ico)$/i.test(file)
      ? { 'Cache-Control': 'public, max-age=31536000, immutable' }
      : { 'Cache-Control': 'no-cache' };
    res.writeHead(200, { 'Content-Type': mime, ...cacheHeader, ...corsHeaders });
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
  const isStateRead = url.pathname === '/api/state' && req.method === 'GET';
  const isStateWrite = url.pathname === '/api/state' || url.pathname === '/api/push';
  if (url.pathname.startsWith('/api/') && !isStateRead && !isStateWrite && !rateLimit(req, 'api-global', 480, 60_000)) {
    sendSecurityAlert('api-rate-limit', { ip: clientIp(req), device: req.headers['user-agent'] || '', reason: req.url });
    sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' });
    return;
  }
  // Live cloud-sync reads (GET) are the backbone shared by every role site, so
  // they are not throttled; writes get their own generous bucket.
  if (isStateWrite && !rateLimit(req, 'state-write', 600, 60_000)) {
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
  if (url.pathname.startsWith('/assets/') || url.pathname === '/icon.svg' || url.pathname === '/favicon.ico' || url.pathname === '/vite.svg') {
    const assetPath = url.pathname === '/favicon.ico' ? '/icon.svg' : url.pathname;
    if (serveDistFile(res, assetPath)) return;
  }

  // ---- Live store REST API ----
  const key = (url.searchParams.get('key') || '').trim() || 'default';
  if (url.pathname.startsWith('/api/') && !keyLooksSafe(key)) {
    appendAudit('nexago-main', { actor: 'system', action: 'unsafe-key-blocked', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: key });
    sendSecurityAlert('unsafe-key-blocked', { ip: clientIp(req), device: req.headers['user-agent'] || '', reason: key });
    sendJson(res, 400, { ok: false, error: 'INVALID_KEY' });
    return;
  }
  recordRequestActivity(key, req);

  if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders); res.end(); return; }

  if (req.method === 'GET' && url.pathname === '/api/system/health') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    (async () => {
    const backupFiles = listSupabaseBackupFiles();
    const latestBackup = lastSupabaseBackup || backupFiles[0] || null;
    const localBackupDir = path.join(BACKUP_DIR, safeKey(key));
    const localBackupCount = fs.existsSync(localBackupDir) ? fs.readdirSync(localBackupDir).filter((name) => name.endsWith('.json')).length : 0;
    const audit = readSecurity(`audit-${safeKey(key)}`, []);
    const storeState = loadStore(key).state || {};
    const branchMap = new Map();
    const bumpBranch = (branchKey, patch = {}) => {
      const current = branchMap.get(branchKey) || { key: branchKey, orders: 0, completed: 0, revenue: 0, posSales: 0, printerStatus: 'Unknown', lastOrderAt: '' };
      branchMap.set(branchKey, { ...current, ...patch });
      return branchMap.get(branchKey);
    };
    for (const order of Array.isArray(storeState.orders) ? storeState.orders : []) {
      const branchKey = String(order.branchId || order.storeId || order.storeName || 'unassigned');
      const row = bumpBranch(branchKey);
      row.orders += 1;
      if (String(order.status || '').toLowerCase() === 'completed') row.completed += 1;
      row.revenue += Number(order.amount || order.total || order.grandTotal || 0);
      row.lastOrderAt = order.updatedAt || order.createdAt || order.date || row.lastOrderAt;
    }
    for (const sale of Array.isArray(storeState.posSales) ? storeState.posSales : []) {
      const branchKey = String(sale.branchId || sale.storeId || sale.storeName || 'pos');
      const row = bumpBranch(branchKey);
      row.posSales += 1;
      row.revenue += Number(sale.total || sale.netTotal || sale.amount || 0);
      row.lastOrderAt = sale.createdAt || sale.time || row.lastOrderAt;
    }
    for (const device of Array.isArray(storeState.devices) ? storeState.devices : []) {
      const branchKey = String(device.branchId || device.storeId || device.name || 'device');
      bumpBranch(branchKey, { printerStatus: device.printerStatus || device.status || 'Online' });
    }
    const memory = process.memoryUsage();
    const load = os.loadavg();
    const cpuCount = Math.max(1, os.cpus().length);
    const cpuLoadPercent = Math.min(100, Math.round((load[0] / cpuCount) * 100));
    const dataBytes = directorySize(DATA_DIR, 4);
    const backupBytes = directorySize(SUPABASE_BACKUP_DIR, 2);
    const tableCounts = await supabaseTableCounts();
    const localCounts = localStateCounts(storeState);
    const conflicts = detectStateConflicts(storeState);
    const incidents = incidentEvents(audit);
    const integrity = backupIntegrity(backupFiles);
    const latestBackupAgeMinutes = latestBackup ? Math.max(0, Math.round((Date.now() - Date.parse(latestBackup.createdAt || 0)) / 60000)) : null;
    const estimatedRestoreMinutes = latestBackup ? Math.max(2, Math.ceil((latestBackup.size || 0) / (1024 * 1024) * 0.8)) : null;
    const lockdown = readSecurity(`lockdown-${safeKey(key)}`, { active: false });
    const protectionChecks = [
      { key: 'supabase', label: 'Supabase configured', ok: supabaseConfigured },
      { key: 'serviceRole', label: 'Server service role available', ok: !!serviceClient },
      { key: 'autoBackup', label: 'Automatic backup enabled', ok: AUTO_SUPABASE_BACKUP },
      { key: 'dbUrl', label: 'SUPABASE_DB_URL configured', ok: !!process.env.SUPABASE_DB_URL },
      { key: 'backupFile', label: 'At least one backup file exists', ok: !!latestBackup },
      { key: 'encryption', label: 'Encryption key configured', ok: !!DATA_ENCRYPTION_KEY },
      { key: 'alerts', label: 'Telegram/Webhook alert configured', ok: !!(SECURITY_ALERT_WEBHOOK || (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)) },
      { key: 'audit', label: 'Audit log active', ok: audit.length > 0 },
    ];
    sendJson(res, 200, {
      ok: true,
      key: safeKey(key),
      checkedAt: new Date().toISOString(),
      backup: {
        automaticEnabled: AUTO_SUPABASE_BACKUP,
        running: supabaseBackupRunning,
        status: latestBackup ? 'Success' : (AUTO_SUPABASE_BACKUP ? 'Pending' : 'Disabled'),
        latest: latestBackup,
        files: backupFiles.slice(0, 10).map(({ name, sizeLabel, createdAt }) => ({ name, sizeLabel, createdAt })),
        integrity,
        nextRunAt: nextSupabaseBackupAt,
        intervalMinutes: Math.round(SUPABASE_BACKUP_INTERVAL_MS / 60000),
        retention: SUPABASE_BACKUP_RETENTION,
        localJsonBackupCount: localBackupCount,
      },
      storage: {
        databaseConfigured: supabaseConfigured,
        databaseSizeEstimate: latestBackup?.sizeLabel || 'No backup yet',
        localDataSize: bytesLabel(dataBytes),
        backupStorageSize: bytesLabel(backupBytes),
        localCounts,
        tableCounts,
      },
      server: {
        uptimeSeconds: Math.round(process.uptime()),
        cpuLoadPercent,
        loadAverage: load.map((x) => Number(x.toFixed(2))),
        memoryUsed: bytesLabel(memory.rss),
        heapUsed: bytesLabel(memory.heapUsed),
        heapTotal: bytesLabel(memory.heapTotal),
        freeSystemMemory: bytesLabel(os.freemem()),
        totalSystemMemory: bytesLabel(os.totalmem()),
        platform: `${os.platform()} ${os.arch()}`,
      },
      activity: {
        activeKeys: Array.from(requestActivity.values()).sort((a, b) => Date.parse(b.lastAt || '0') - Date.parse(a.lastAt || '0')).slice(0, 20),
        branches: Array.from(branchMap.values()).sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)).slice(0, 20),
        auditTail: audit.slice(-12).reverse(),
        auditCount: audit.length,
        websocketSubscribers: Array.from(stateSubscribers.entries()).map(([stateKey, sockets]) => ({ key: stateKey, subscribers: sockets.size })),
        conflicts,
        incidents,
      },
      protection: {
        score: protectionChecks.filter((x) => x.ok).length,
        total: protectionChecks.length,
        checks: protectionChecks,
      },
      recovery: {
        rpoMinutes: latestBackupAgeMinutes,
        rtoEstimateMinutes: estimatedRestoreMinutes,
        lockdown,
        dependencies: [
          { name: 'Supabase API', status: supabaseConfigured && serviceClient ? 'Configured' : 'Missing' },
          { name: 'Supabase DB URL', status: process.env.SUPABASE_DB_URL ? 'Configured' : 'Missing' },
          { name: 'Telegram Alert', status: TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID ? 'Configured' : 'Missing' },
          { name: 'Webhook Alert', status: SECURITY_ALERT_WEBHOOK ? 'Configured' : 'Missing' },
          { name: 'Encryption', status: DATA_ENCRYPTION_KEY ? 'Configured' : 'Missing' },
        ],
      },
    });
    })().catch((e) => sendJson(res, 500, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/backup/run') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    if (supabaseBackupRunning) { sendJson(res, 409, { ok: false, error: 'BACKUP_ALREADY_RUNNING' }); return; }
    appendAudit(key, { actor: session.userId, role: session.role, action: 'manual-supabase-backup-triggered', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'Super Admin dashboard backup button' });
    runSupabaseBackup(`manual:${session.userId}`);
    sendJson(res, 202, { ok: true, status: 'started', message: 'Backup started in background' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/system/backups') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    sendJson(res, 200, { ok: true, backups: listSupabaseBackupFiles().map(({ name, sizeLabel, createdAt }) => ({ name, sizeLabel, createdAt })) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/backup/verify') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    readBody(req).then(async (body) => {
      const name = String(body.name || '').trim();
      if (!/^nexago_supabase_\d{8}_\d{6}\.sql\.gz$/.test(name)) { sendJson(res, 400, { ok: false, error: 'INVALID_BACKUP_NAME' }); return; }
      const file = path.join(SUPABASE_BACKUP_DIR, name);
      if (!file.startsWith(SUPABASE_BACKUP_DIR) || !fs.existsSync(file)) { sendJson(res, 404, { ok: false, error: 'BACKUP_NOT_FOUND' }); return; }
      const result = await verifyBackupFile(file);
      appendAudit(key, { actor: session.userId, role: session.role, action: result.ok ? 'supabase-backup-verified' : 'supabase-backup-verify-failed', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: name, newValue: result });
      if (!result.ok) await sendSecurityAlert('supabase-backup-verify-failed', { actor: session.userId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason: `${name}: ${result.error}` });
      sendJson(res, result.ok ? 200 : 422, { ok: result.ok, backup: name, ...result });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/backup/simulate-restore') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    readBody(req).then(async (body) => {
      const name = String(body.name || '').trim();
      if (!/^nexago_supabase_\d{8}_\d{6}\.sql\.gz$/.test(name)) { sendJson(res, 400, { ok: false, error: 'INVALID_BACKUP_NAME' }); return; }
      const file = path.join(SUPABASE_BACKUP_DIR, name);
      if (!file.startsWith(SUPABASE_BACKUP_DIR) || !fs.existsSync(file)) { sendJson(res, 404, { ok: false, error: 'BACKUP_NOT_FOUND' }); return; }
      const result = await simulateRestoreFile(file);
      appendAudit(key, { actor: session.userId, role: session.role, action: result.ok ? 'restore-simulation-completed' : 'restore-simulation-failed', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: name, newValue: result });
      sendJson(res, result.ok ? 200 : 422, { ok: result.ok, backup: name, ...result });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/alert/test') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    (async () => {
      appendAudit(key, { actor: session.userId, role: session.role, action: 'system-alert-test-sent', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'Super Admin System Health test alert' });
      await sendSecurityAlert('system-health-test-alert', { actor: session.userId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'Manual test from System Health page' });
      sendJson(res, 200, { ok: true, webhookConfigured: !!SECURITY_ALERT_WEBHOOK, telegramConfigured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) });
    })().catch((e) => sendJson(res, 500, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/emergency-lockdown') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    readBody(req).then(async (body) => {
      const active = body.active !== false;
      const reason = String(body.reason || '').trim() || (active ? 'Emergency lockdown enabled' : 'Emergency lockdown disabled');
      const sessions = readSecurity(`sessions-${safeKey(key)}`, {});
      let revoked = 0;
      if (active) {
        for (const [token, row] of Object.entries(sessions)) {
          if (row && row.role !== 'super-admin') {
            sessions[token] = { ...row, status: 'Revoked', active: false, revokedAt: new Date().toISOString(), revokedBy: session.userId, revokeReason: 'emergency-lockdown' };
            revoked += 1;
          }
        }
        writeSecurity(`sessions-${safeKey(key)}`, sessions);
      }
      const lockdown = { active, reason, actor: session.userId, revoked, updatedAt: new Date().toISOString() };
      writeSecurity(`lockdown-${safeKey(key)}`, lockdown);
      appendAudit(key, { actor: session.userId, role: session.role, action: active ? 'emergency-lockdown-enabled' : 'emergency-lockdown-disabled', ip: clientIp(req), device: req.headers['user-agent'] || '', reason, newValue: lockdown });
      await sendSecurityAlert(active ? 'emergency-lockdown-enabled' : 'emergency-lockdown-disabled', { actor: session.userId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason });
      sendJson(res, 200, { ok: true, lockdown });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/full-scan') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    const storeState = loadStore(key).state || {};
    const latestBackup = latestSupabaseBackupFile();
    const conflicts = detectStateConflicts(storeState);
    const files = listSupabaseBackupFiles();
    const report = {
      scanId: `SCAN-${Date.now()}`,
      at: new Date().toISOString(),
      backupCount: files.length,
      latestBackup: latestBackup ? { name: latestBackup.name, sizeLabel: latestBackup.sizeLabel, createdAt: latestBackup.createdAt } : null,
      integrity: backupIntegrity(files),
      localCounts: localStateCounts(storeState),
      conflicts: conflicts.length,
      dependencyMissing: [
        !supabaseConfigured ? 'Supabase API' : '',
        !process.env.SUPABASE_DB_URL ? 'SUPABASE_DB_URL' : '',
        !(SECURITY_ALERT_WEBHOOK || (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)) ? 'Alert channel' : '',
      ].filter(Boolean),
    };
    appendAudit(key, { actor: session.userId, role: session.role, action: 'system-health-full-scan', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'manual full scan from System Health', newValue: report });
    sendJson(res, 200, { ok: true, report });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/conflict/review') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    readBody(req).then((body) => {
      const conflict = { group: String(body.group || ''), id: String(body.id || ''), reason: String(body.reason || '') };
      appendAudit(key, { actor: session.userId, role: session.role, action: 'system-conflict-reviewed', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: `${conflict.group}:${conflict.id}`, newValue: conflict });
      sendJson(res, 200, { ok: true, reviewed: conflict });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/incident/create') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    readBody(req).then(async (body) => {
      const store = await loadStoreLatest(key);
      const incident = {
        id: `INC-${Date.now()}`,
        subject: String(body.subject || 'System Health Incident').slice(0, 160),
        message: String(body.message || 'Created from System Health').slice(0, 2000),
        status: 'Open',
        priority: String(body.priority || 'High'),
        source: 'system-health',
        createdAt: new Date().toISOString(),
        actor: session.userId,
      };
      const tickets = Array.isArray(store.state.tickets) ? store.state.tickets : [];
      store.state.tickets = [incident, ...tickets];
      await saveStorePermanent(key, store);
      notifyStateSubscribers(key, { reason: 'system-incident-created' });
      appendAudit(key, { actor: session.userId, role: session.role, action: 'system-incident-created', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: incident.subject, newValue: incident });
      await sendSecurityAlert('system-incident-created', { actor: session.userId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason: incident.subject });
      sendJson(res, 200, { ok: true, incident });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/action') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    readBody(req).then(async (body) => {
      const action = String(body.action || '').trim();
      const reason = String(body.reason || action || 'system action').trim();
      const store = await loadStoreLatest(key);
      const nowIso = new Date().toISOString();
      let result = { action, status: 'saved', at: nowIso };
      if (action === 'maintenance-on' || action === 'maintenance-off') {
        store.state.systemMaintenance = { active: action === 'maintenance-on', reason, actor: session.userId, updatedAt: nowIso };
        await saveStorePermanent(key, store);
        notifyStateSubscribers(key, { reason: action });
        result = { ...result, status: store.state.systemMaintenance.active ? 'maintenance-on' : 'maintenance-off' };
      } else if (action === 'restart-request' || action === 'backup-drill-ticket' || action === 'data-repair-dry-run') {
        const ticket = { id: `SYS-${Date.now()}`, subject: action.replace(/-/g, ' '), message: reason, status: 'Open', priority: action === 'restart-request' ? 'Critical' : 'High', source: 'system-health', createdAt: nowIso, actor: session.userId };
        store.state.tickets = [ticket, ...(Array.isArray(store.state.tickets) ? store.state.tickets : [])];
        await saveStorePermanent(key, store);
        notifyStateSubscribers(key, { reason: action });
        result = { ...result, ticket };
      } else if (action === 'dependency-recheck') {
        result = { ...result, dependencies: [
          { name: 'Supabase API', ok: supabaseConfigured && !!serviceClient },
          { name: 'Supabase DB URL', ok: !!process.env.SUPABASE_DB_URL },
          { name: 'Alert channel', ok: !!(SECURITY_ALERT_WEBHOOK || (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)) },
          { name: 'Encryption', ok: !!DATA_ENCRYPTION_KEY },
        ] };
      } else if (action === 'sync-broadcast') {
        notifyStateSubscribers(key, { reason: 'manual-sync-broadcast', actor: session.userId });
        notifyStateSubscribers('nexago-main', { reason: 'manual-sync-broadcast', actor: session.userId });
        result = { ...result, status: 'broadcast-sent' };
      } else if (action === 'recovery-checklist') {
        result = { ...result, checklist: [
          'Confirm latest backup verified',
          'Run restore simulation',
          'Export health report',
          'Check incidents and conflicts',
          'Notify affected branch/store admins',
        ] };
      }
      appendAudit(key, { actor: session.userId, role: session.role, action: `system-${action}`, ip: clientIp(req), device: req.headers['user-agent'] || '', reason, newValue: result });
      if (['restart-request', 'maintenance-on', 'backup-drill-ticket'].includes(action)) await sendSecurityAlert(`system-${action}`, { actor: session.userId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason });
      sendJson(res, 200, { ok: true, result });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/system/backup/download') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    const name = String(url.searchParams.get('name') || '').trim();
    if (!/^nexago_supabase_\d{8}_\d{6}\.sql\.gz$/.test(name)) { sendJson(res, 400, { ok: false, error: 'INVALID_BACKUP_NAME' }); return; }
    const file = path.join(SUPABASE_BACKUP_DIR, name);
    if (!file.startsWith(SUPABASE_BACKUP_DIR) || !fs.existsSync(file)) { sendJson(res, 404, { ok: false, error: 'BACKUP_NOT_FOUND' }); return; }
    appendAudit(key, { actor: session.userId, role: session.role, action: 'supabase-backup-downloaded', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: name });
    res.writeHead(200, {
      ...securityHeaders,
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system/backup/restore-request') {
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    readBody(req).then(async (body) => {
      const name = String(body.name || '').trim();
      const reason = String(body.reason || '').trim();
      const confirmText = String(body.confirmText || '').trim();
      if (!/^nexago_supabase_\d{8}_\d{6}\.sql\.gz$/.test(name)) { sendJson(res, 400, { ok: false, error: 'INVALID_BACKUP_NAME' }); return; }
      if (confirmText !== 'RESTORE REQUEST') { sendJson(res, 400, { ok: false, error: 'CONFIRM_TEXT_REQUIRED' }); return; }
      appendAudit(key, { actor: session.userId, role: session.role, action: 'supabase-restore-requested', ip: clientIp(req), device: req.headers['user-agent'] || '', reason: reason || 'restore requested from Super Admin dashboard', newValue: { backup: name } });
      await sendSecurityAlert('supabase-restore-requested', { actor: session.userId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason: `${name} :: ${reason || 'no reason'}` });
      sendJson(res, 200, { ok: true, status: 'audit-saved', message: 'Restore request saved and alerted. Run restore only during maintenance window.' });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/storefront') {
    const store = loadStore(key);
    const customerId = (url.searchParams.get('customerId') || '').trim();
    sendJson(res, 200, { ok: true, key, updatedAt: store.updatedAt, cloud: supabaseConfigured ? 'supabase' : 'local', ...storefrontView(store.state, customerId) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/state') {
    loadStoreLatest(key)
      .then((store) => sendJson(res, 200, { ok: true, key, version: store.version, updatedAt: store.updatedAt, state: store.state, cloud: supabaseConfigured ? 'supabase' : 'local' }))
      .catch((e) => sendJson(res, 500, { ok: false, error: String(e && e.message || e) }));
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
      const pendingKey = `${key}:${email}`;
      const pending = otpVerifiedPending.get(pendingKey);
      const pendingValid = pending && Date.now() < Number(pending.expiresAt || 0);
      if (!pendingValid) {
        // The email OTP has not been verified yet in this session (or it
        // expired): verify it before accepting the secret code.
        try {
          await verifyEmailOtp(email, code);
          otpVerifiedPending.set(pendingKey, { expiresAt: Date.now() + 1000 * 60 * 10 });
        } catch {
          appendAudit(key, { actor: email, action: 'otp-login-bad-code', ip: clientIp(req), reason: 'email OTP verification failed' });
          sendSecurityAlert('otp-login-bad-code', { actor: email, ip: clientIp(req), device: req.headers['user-agent'] || '' });
          sendJson(res, 401, { ok: false, error: 'INVALID_CODE' });
          return;
        }
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
      const sessionPermissions = Array.isArray(user.permissions) ? user.permissions : [];
      sessions[token] = {
        userId: canonicalUserId,
        role: user.role,
        storeId: user.storeId || '',
        branchId: user.branchId || '',
        permissions: sessionPermissions,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 12,
        ip: clientIp(req),
        device: req.headers['user-agent'] || '',
        via: 'google-otp',
      };
      writeSecurity(`sessions-${safeKey(key)}`, sessions);
      appendAudit(key, { actor: canonicalUserId, role: user.role, action: 'otp-login-success', storeId: user.storeId, branchId: user.branchId, ip: clientIp(req), device: req.headers['user-agent'] || '', reason: 'Gmail OTP verified' });
      sendJson(res, 200, { ok: true, token, expiresAt: sessions[token].expiresAt, user: { userId: canonicalUserId, role: user.role, storeId: user.storeId || '', branchId: user.branchId || '', permissions: sessionPermissions } });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
  };

  if (req.method === 'POST' && url.pathname === '/api/security/otp-send') { otpSend(); return; }
  if (req.method === 'POST' && url.pathname === '/api/security/otp-login') { otpLogin(); return; }

  // ---- Store Admin signup email verification ----
  // These differ from otp-send/otp-login: they do NOT require the address to be
  // an active platform user yet, because the store admin is verifying their
  // Gmail before submitting their application. The verification result is only
  // used to unlock the signup form in the browser (no session is minted).
  if (req.method === 'POST' && url.pathname === '/api/security/otp-signup-send') {
    if (!supabaseConfigured) { sendJson(res, 503, { ok: false, error: 'SUPABASE_NOT_CONFIGURED' }); return; }
    if (!rateLimit(req, 'otp-signup-send', 6, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { sendJson(res, 400, { ok: false, error: 'INVALID_EMAIL' }); return; }
      try {
        await sendEmailOtp(email, 'store-admin-signup');
        appendAudit(key, { actor: email, action: 'otp-signup-send-success', ip: clientIp(req), reason: 'store admin signup OTP requested' });
        sendJson(res, 200, { ok: true });
      } catch (e) {
        appendAudit(key, { actor: email, action: 'otp-signup-send-failed', ip: clientIp(req), reason: String(e && e.message || e) });
        sendJson(res, 500, { ok: false, error: String(e && e.message || e) });
      }
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/otp-signup-verify') {
    if (!supabaseConfigured) { sendJson(res, 503, { ok: false, error: 'SUPABASE_NOT_CONFIGURED' }); return; }
    if (!rateLimit(req, 'otp-signup-verify', 10, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim().replace(/\D/g, '');
      if (!email || !code) { sendJson(res, 400, { ok: false, error: 'email and code required' }); return; }
      try {
        await verifyEmailOtp(email, code);
        appendAudit(key, { actor: email, action: 'otp-signup-verify-success', ip: clientIp(req), reason: 'store admin signup email verified' });
        sendJson(res, 200, { ok: true });
      } catch {
        appendAudit(key, { actor: email, action: 'otp-signup-verify-failed', ip: clientIp(req), reason: 'store admin signup OTP verification failed' });
        sendJson(res, 401, { ok: false, error: 'INVALID_CODE' });
      }
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  // Driver forgot password: the driver enters their Gmail, we email a 6-digit
  // OTP (reuses the signup OTP endpoints), then they choose a new password.
  // The OTP is verified server-side with the same Supabase email verification
  // the signup flow uses; the new password is written into the same security
  // registry the driver login checks (/api/security/login).
  if (req.method === 'POST' && url.pathname === '/api/security/driver/forgot') {
    if (!supabaseConfigured) { sendJson(res, 503, { ok: false, error: 'SUPABASE_NOT_CONFIGURED' }); return; }
    if (!rateLimit(req, 'driver-forgot', 8, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim().replace(/\D/g, '');
      const newPassword = String(body.newPassword || '');
      if (!email || !code) { sendJson(res, 400, { ok: false, error: 'email and code required' }); return; }
      if (!newPassword || newPassword.length < 6) { sendJson(res, 400, { ok: false, error: 'PASSWORD_TOO_SHORT' }); return; }
      try {
        await verifyEmailOtp(email, code);
        const store = await loadStoreLatest(key);
        const drivers = Array.isArray(store.state && store.state.drivers) ? store.state.drivers : [];
        const driver = drivers.find((d) => d && (d.email || '').toLowerCase() === email);
        if (!driver || !driver.id) { sendJson(res, 404, { ok: false, error: 'DRIVER_NOT_FOUND' }); return; }
        const users = readSecurity(`users-${safeKey(key)}`, {});
        const existing = users[driver.id];
        if (!existing || existing.role !== 'driver') { sendJson(res, 404, { ok: false, error: 'DRIVER_NOT_FOUND' }); return; }
        users[driver.id] = {
          ...existing,
          userId: driver.id,
          role: 'driver',
          status: 'Active',
          password: hashPassword(newPassword),
          lastPasswordChangeAt: new Date().toISOString(),
          passwordChangedBy: 'driver-self',
        };
        writeSecurity(`users-${safeKey(key)}`, users);
        appendAudit(key, { actor: driver.id, role: 'driver', action: 'driver-password-reset', ip: clientIp(req), reason: 'Gmail OTP verified' });
        sendJson(res, 200, { ok: true, driverId: driver.id });
      } catch (e) {
        appendAudit(key, { actor: email, role: 'driver', action: 'driver-password-reset-failed', ip: clientIp(req), reason: 'invalid OTP or driver lookup failed' });
        sendJson(res, 401, { ok: false, error: 'INVALID_CODE' });
      }
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/register') {
    if (!rateLimit(req, 'security-register', 10, 60_000)) { sendSecurityAlert('register-rate-limit', { ip: clientIp(req), device: req.headers['user-agent'] || '' }); sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    if (!hasPermission(req, key, 'users') && !isTrustedAutomation(req)) { sendJson(res, 403, { ok: false, error: 'FORBIDDEN' }); return; }
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

  // ---- Single Account Rule ----
  // POST /api/security/identity/check { phone, email, excludeId, excludeRole }
  //   → { ok, taken: bool, conflict? } — used by every signup/registration form
  //     (customer, driver, store admin, staff) BEFORE submitting, so a phone or
  //     Gmail that already belongs to ANY account is rejected up front.
  // POST /api/security/identity/claim { role, identityId, name, phone, email }
  //   → registers the identity atomically (unique phone + unique email across
  //     all roles/stores). 409 IDENTITY_CLAIMED with the existing account when
  //     the phone or Gmail is already taken.
  if (req.method === 'POST' && url.pathname === '/api/security/identity/check') {
    if (!rateLimit(req, 'identity-check', 60, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then((body) => {
      const conflict = findIdentityConflict({
        phone: String(body.phone || ''),
        email: String(body.email || ''),
        excludeId: String(body.excludeId || ''),
        excludeRole: String(body.excludeRole || ''),
      });
      sendJson(res, 200, { ok: true, taken: !!conflict, conflict: conflict ? { role: conflict.role, identityId: conflict.identity_id, name: conflict.name, phone: conflict.phone, email: conflict.email } : null });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/identity/claim') {
    if (!rateLimit(req, 'identity-claim', 30, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const result = await claimIdentity({
        role: String(body.role || '').trim(),
        identityId: String(body.identityId || '').trim(),
        name: String(body.name || ''),
        phone: String(body.phone || ''),
        email: String(body.email || ''),
        platformKey: safeKey(key),
        status: String(body.status || 'Active'),
      });
      if (!result.ok) {
        if (result.error === 'IDENTITY_CLAIMED') {
          appendAudit(key, { actor: body.identityId || 'unknown', role: body.role, action: 'identity-claim-rejected', ip: clientIp(req), reason: `phone/Gmail already claimed by ${result.conflict?.role} ${result.conflict?.identityId}` });
          sendJson(res, 409, { ok: false, error: 'IDENTITY_CLAIMED', conflict: result.conflict });
          return;
        }
        sendJson(res, 400, { ok: false, error: result.error });
        return;
      }
      appendAudit(key, { actor: result.identity.identity_id, role: result.identity.role, action: 'identity-claimed', ip: clientIp(req), reason: 'single account registration' });
      sendJson(res, 200, { ok: true, identity: result.identity });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  // ---- Unified ID + Permanent Cloud ----
  // POST /api/security/customer/register { name?, phone?, email?, customerId?, password? }
  //   → returns the permanent customer record. If the phone or Gmail is already
  //     registered, the EXISTING customerId is adopted (device-independent ID);
  //     otherwise a new record is created (or the provided customerId is used).
  //     Includes wallet balance + recent transactions so the client restores
  //     itself on any device. A password (min 6 chars) is hashed server-side so
  //     the customer can also log in with email + password on any device.
  // GET  /api/security/customer/me?customerId=... → customer + wallet + txns.
  // POST /api/security/customer/sync { customerId, balance, txns[] } → pushes
  //   wallet balance + new wallet transactions to the permanent cloud store.
  // POST /api/security/customer/login { email, password } → verifies password,
  //   returns customer + wallet + txns.
  // POST /api/security/customer/forgot { email, code, newPassword } → verifies
  //   the OTP then sets a new password.
  if (req.method === 'POST' && url.pathname === '/api/security/customer/register') {
    if (!rateLimit(req, 'customer-register', 30, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const phone = String(body.phone || '').trim();
      const email = normalizeEmailForIdentity(body.email);
      const password = String(body.password || '');
      if (password && password.length < 6) { sendJson(res, 400, { ok: false, error: 'PASSWORD_TOO_SHORT' }); return; }
      const requestedId = String(body.customerId || '').trim();
      let customerId = requestedId && requestedId.startsWith('NEX') ? requestedId : '';
      let record = null;
      // Adopt the existing ID when the phone/Gmail is already registered.
      if (!customerId) {
        const found = findCustomerByPhoneOrEmail(phone, email);
        if (found) { customerId = found.customerId; record = found; }
      }
      if (!customerId) {
        customerId = 'NEX' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
      }
      if (supabaseConfigured && serviceClient && !record) {
        record = await supabaseFetchCustomer(customerId);
        if (!record && (phone || email)) {
          const { data } = await serviceClient.from(SUPABASE_TABLE.customers)
            .select('*').or(`phone_norm.eq.${normalizePhoneForIdentity(phone)},email_norm.eq.${email}`).limit(1);
          if (data && data[0]) { customerId = data[0].customer_id; record = { customerId, name: data[0].name, phone: data[0].phone, email: data[0].email, payload: data[0].payload }; }
        }
      }
      const existingHash = record?.payload?.passwordHash || '';
      const passwordHash = password ? hashPassword(password) : existingHash;
      const customer = {
        customerId,
        name: String(body.name || record?.name || 'Customer').slice(0, 200),
        phone,
        email,
        payload: { ...(record?.payload || {}), ...(passwordHash ? { passwordHash } : {}) },
      };
      if (supabaseConfigured && serviceClient) {
        try {
          const upserted = {
            customer_id: customerId,
            name: customer.name,
            phone,
            phone_norm: normalizePhoneForIdentity(phone),
            email,
            email_norm: email,
            payload: customer.payload,
            updated_at: new Date().toISOString(),
          };
          await serviceClient.from(SUPABASE_TABLE.customers).upsert(upserted, { onConflict: 'customer_id' });
        } catch { /* ignore */ }
      }
      const list = readCustomers();
      const idx = list.findIndex((c) => c && c.customerId === customerId);
      const localRow = { ...customer, updatedAt: new Date().toISOString(), createdAt: record?.createdAt || new Date().toISOString() };
      if (idx >= 0) list[idx] = { ...list[idx], ...localRow }; else list.unshift(localRow);
      writeCustomers(list);
      const wallet = (supabaseConfigured && serviceClient) ? await supabaseFetchWallet(customerId) : null;
      const balance = wallet ? wallet.balance : Number(body.balance || 0);
      if (supabaseConfigured && serviceClient) await supabaseUpsertWallet(customerId, balance);
      const txns = (supabaseConfigured && serviceClient) ? await supabaseFetchTxns(customerId, 100) : [];
      appendAudit(key, { actor: customerId, role: 'customer', action: 'customer-registered', ip: clientIp(req), reason: phone || email || 'anonymous' });
      sendJson(res, 200, { ok: true, customer: { customerId: customer.customerId, name: customer.name, phone: customer.phone, email: customer.email }, hasPassword: !!passwordHash, walletBalance: balance, txns });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/customer/login') {
    if (!rateLimit(req, 'customer-login', 12, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const email = normalizeEmailForIdentity(body.email);
      const password = String(body.password || '');
      const found = findCustomerByPhoneOrEmail('', email);
      if (!found || !found.payload?.passwordHash || !verifyPassword(password, found.payload.passwordHash)) {
        appendAudit(key, { actor: email || 'unknown', role: 'customer', action: 'customer-login-failed', ip: clientIp(req), reason: 'invalid customer password' });
        sendJson(res, 401, { ok: false, error: 'INVALID_LOGIN' });
        return;
      }
      const wallet = (supabaseConfigured && serviceClient) ? await supabaseFetchWallet(found.customerId) : null;
      const txns = (supabaseConfigured && serviceClient) ? await supabaseFetchTxns(found.customerId, 100) : [];
      appendAudit(key, { actor: found.customerId, role: 'customer', action: 'customer-login', ip: clientIp(req), reason: 'password login' });
      sendJson(res, 200, {
        ok: true,
        customer: { customerId: found.customerId, name: found.name || '', phone: found.phone || '', email: found.email || '' },
        walletBalance: wallet ? wallet.balance : 0,
        txns,
      });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/customer/forgot') {
    if (!supabaseConfigured) { sendJson(res, 503, { ok: false, error: 'SUPABASE_NOT_CONFIGURED' }); return; }
    if (!rateLimit(req, 'customer-forgot', 8, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim().replace(/\D/g, '');
      const newPassword = String(body.newPassword || '');
      if (!email || !code) { sendJson(res, 400, { ok: false, error: 'email and code required' }); return; }
      if (!newPassword || newPassword.length < 6) { sendJson(res, 400, { ok: false, error: 'PASSWORD_TOO_SHORT' }); return; }
      try {
        await verifyEmailOtp(email, code);
        const found = findCustomerByPhoneOrEmail('', normalizeEmailForIdentity(email));
        if (!found) { sendJson(res, 404, { ok: false, error: 'CUSTOMER_NOT_FOUND' }); return; }
        const passwordHash = hashPassword(newPassword);
        const updated = { ...found, payload: { ...(found.payload || {}), passwordHash } };
        const list = readCustomers();
        const idx = list.findIndex((c) => c && c.customerId === found.customerId);
        if (idx >= 0) list[idx] = { ...list[idx], ...updated }; else list.unshift(updated);
        writeCustomers(list);
        if (supabaseConfigured && serviceClient) {
          try {
            await serviceClient.from(SUPABASE_TABLE.customers).update({ payload: updated.payload, updated_at: new Date().toISOString() }).eq('customer_id', found.customerId);
          } catch { /* ignore */ }
        }
        appendAudit(key, { actor: found.customerId, role: 'customer', action: 'customer-password-reset', ip: clientIp(req), reason: 'OTP verified' });
        sendJson(res, 200, { ok: true });
      } catch {
        appendAudit(key, { actor: email, role: 'customer', action: 'customer-password-reset-failed', ip: clientIp(req), reason: 'invalid OTP' });
        sendJson(res, 401, { ok: false, error: 'INVALID_CODE' });
      }
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/security/customer/me') {
    if (!rateLimit(req, 'customer-me', 60, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    const customerId = String(url.searchParams.get('customerId') || '').trim();
    if (!customerId || !customerId.startsWith('NEX')) { sendJson(res, 400, { ok: false, error: 'INVALID_CUSTOMER_ID' }); return; }
    (async () => {
      const found = readCustomers().find((c) => c && c.customerId === customerId);
      const record = found || (supabaseConfigured && serviceClient ? await supabaseFetchCustomer(customerId) : null);
      if (!record) { sendJson(res, 404, { ok: false, error: 'CUSTOMER_NOT_FOUND' }); return; }
      const wallet = supabaseConfigured && serviceClient ? await supabaseFetchWallet(customerId) : null;
      const txns = supabaseConfigured && serviceClient ? await supabaseFetchTxns(customerId, 100) : [];
      sendJson(res, 200, {
        ok: true,
        customer: { customerId: record.customerId, name: record.name || '', phone: record.phone || '', email: record.email || '' },
        walletBalance: wallet ? wallet.balance : 0,
        txns,
      });
    })();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/security/customer/sync') {
    if (!rateLimit(req, 'customer-sync', 60, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const customerId = String(body.customerId || '').trim();
      if (!customerId || !customerId.startsWith('NEX')) { sendJson(res, 400, { ok: false, error: 'INVALID_CUSTOMER_ID' }); return; }
      if (supabaseConfigured && serviceClient) {
        await supabaseUpsertWallet(customerId, Number(body.balance || 0));
        const txns = Array.isArray(body.txns) ? body.txns.slice(0, 50) : [];
        for (const txn of txns) {
          if (txn && (txn.id || txn.type)) await supabaseInsertWalletTxn(customerId, txn);
        }
      }
      sendJson(res, 200, { ok: true });
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
      const sessionPermissions = Array.isArray(user.permissions) ? user.permissions : [];
      sessions[token] = {
        userId: canonicalUserId,
        role: user.role,
        storeId: user.storeId || '',
        branchId: user.branchId || '',
        permissions: sessionPermissions,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 12,
        ip: clientIp(req),
        device: req.headers['user-agent'] || '',
      };
      writeSecurity(`sessions-${safeKey(key)}`, sessions);
      appendAudit(key, { actor: canonicalUserId, role: user.role, action: 'login-success', storeId: user.storeId, branchId: user.branchId, ip: clientIp(req), device: req.headers['user-agent'] || '' });
      sendJson(res, 200, { ok: true, token, expiresAt: sessions[token].expiresAt, user: { userId: canonicalUserId, role: user.role, storeId: user.storeId || '', branchId: user.branchId || '', permissions: sessionPermissions } });
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
      supabaseConfigured,
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

  if (req.method === 'GET' && url.pathname === '/api/security/me') {
    const session = requireSession(req, key);
    if (!session) { sendJson(res, 401, { ok: false, error: 'SESSION_REQUIRED' }); return; }
    sendJson(res, 200, {
      ok: true,
      user: {
        userId: session.userId,
        role: session.role,
        storeId: session.storeId || '',
        branchId: session.branchId || '',
        permissions: session.permissions || [],
      },
      expiresAt: session.expiresAt || 0,
      status: session.status || 'Active',
    });
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
    const session = requireSession(req, key);
    let audit = readSecurity(`audit-${safeKey(key)}`, []);
    // Role-based scoping: super-admin sees everything; everyone else sees only
    // their own store's log entries (storeId match) unless they act globally.
    if (session && session.role !== 'super-admin') {
      const myStore = String(session.storeId || '');
      audit = audit.filter((a) => a && (!myStore || String(a.storeId || '') === myStore || String(a.actor || '') === String(session.userId || '')));
    }
    const actor = String(url.searchParams.get('actor') || '').trim().toLowerCase();
    const action = String(url.searchParams.get('action') || '').trim().toLowerCase();
    const storeId = String(url.searchParams.get('storeId') || '').trim();
    const role = String(url.searchParams.get('role') || '').trim().toLowerCase();
    const since = url.searchParams.get('since') ? Number(url.searchParams.get('since')) : 0;
    const limit = Math.min(Number(url.searchParams.get('limit') || 500), 2000);
    if (actor) audit = audit.filter((a) => a && String(a.actor || '').toLowerCase().includes(actor));
    if (action) audit = audit.filter((a) => a && String(a.action || '').toLowerCase().includes(action));
    if (storeId) audit = audit.filter((a) => a && String(a.storeId || '') === storeId);
    if (role) audit = audit.filter((a) => a && String(a.role || '').toLowerCase() === role);
    if (since) audit = audit.filter((a) => a && (a.time ? Date.parse(a.time) : 0) >= since);
    sendJson(res, 200, { ok: true, key, count: audit.length, audit: audit.slice().reverse().slice(0, limit), cloud: supabaseConfigured ? 'supabase' : 'local' });
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

  if (url.pathname === '/api/security/card-registry') {
    if (!rateLimit(req, 'card-registry', 120, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    const session = requireSession(req, key);
    if (!session || session.role !== 'super-admin') { sendJson(res, 403, { ok: false, error: 'SUPER_ADMIN_SESSION_REQUIRED' }); return; }
    const registryName = `card-registry-${safeKey(key)}`;
    if (req.method === 'GET') {
      const rawQuery = String(url.searchParams.get('q') || '').trim();
      const query = rawQuery.toLowerCase();
      const registry = readSecurity(registryName, {});
      let cards = Object.values(registry || {});
      if (query) {
        cards = cards.filter((card) => {
          const haystack = [
            card?.id,
            card?.cardId,
            card?.permanentNumber,
            card?.kind,
            card?.name,
            card?.phone,
            card?.email,
            card?.role,
            card?.status,
          ].join(' ').toLowerCase();
          return haystack.includes(query);
        });
      }
      cards.sort((a, b) => Date.parse(b?.updatedAt || b?.createdAt || 0) - Date.parse(a?.updatedAt || a?.createdAt || 0));
      sendJson(res, 200, { ok: true, key, count: cards.length, cards: cards.slice(0, 100), cloud: supabaseConfigured ? 'supabase' : 'local' });
      return;
    }
    if (req.method === 'POST') {
      readBody(req).then((body) => {
        const inputCards = Array.isArray(body.cards) ? body.cards : [body.card && typeof body.card === 'object' ? body.card : body];
        const registry = readSecurity(registryName, {});
        const now = new Date().toISOString();
        const saved = [];
        for (const card of inputCards) {
          if (!card || typeof card !== 'object') continue;
          const kind = String(card.kind || 'staff').trim();
          const id = String(card.id || card.cardId || '').trim();
          const permanentNumber = String(card.permanentNumber || '').trim();
          if (!id || !permanentNumber) continue;
          const cardKey = `${kind}:${id}`;
          const existing = registry[cardKey] || {};
          const safeCard = {
            ...existing,
            ...card,
            kind,
            id,
            cardId: cardKey,
            permanentNumber,
            createdAt: existing.createdAt || card.createdAt || now,
            updatedAt: now,
            savedBy: session.userId,
            platformKey: safeKey(key),
          };
          registry[cardKey] = safeCard;
          saved.push(safeCard);
        }
        if (!saved.length) { sendJson(res, 400, { ok: false, error: 'at least one card with id and permanentNumber required' }); return; }
        writeSecurity(registryName, registry);
        appendAudit(key, {
          actor: session.userId,
          role: session.role,
          action: 'card-registry-upserted',
          ip: clientIp(req),
          reason: body.reason || 'smart card permanent registry save',
          newValue: { count: saved.length, cardIds: saved.map(c => c.cardId).slice(0, 25) },
        });
        sendJson(res, 200, { ok: true, count: saved.length, cards: saved, card: saved[0], cloud: supabaseConfigured ? 'supabase' : 'local' });
      }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
      return;
    }
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
      const storedFile = { ...meta, dataUrl };
      fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(encryptJson(storedFile)), 'utf8');
      if (supabaseConfigured && serviceClient) {
        serviceClient.from(SUPABASE_TABLE.files).upsert({
          file_id: id,
          platform_key: safeKey(key),
          owner_id: meta.owner,
          role: meta.role,
          store_id: meta.storeId,
          branch_id: meta.branchId,
          name: meta.name,
          mime_type: meta.type,
          sha256: meta.sha256,
          payload: encryptJson(storedFile),
          created_at: meta.uploadedAt,
        }, { onConflict: 'file_id' }).then(({ error }) => {
          if (error) console.error('[supabase] file upsert failed:', error.message);
        }).catch(() => {});
      }
      appendAudit(key, { actor: meta.owner, role: meta.role, action: 'secure-file-uploaded', storeId: meta.storeId, branchId: meta.branchId, ip: clientIp(req), newValue: { id, name, type: meta.type, sha256: meta.sha256 } });
      sendJson(res, 200, { ok: true, file: meta, privateUrl: `/api/security/file/${id}?key=${encodeURIComponent(key)}` });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/security/file/')) {
    if (!requireSession(req, key) && !isTrustedAutomation(req)) { sendJson(res, 401, { ok: false, error: 'NO_SESSION' }); return; }
    const id = url.pathname.split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '');
    (async () => {
      const file = path.join(FILES_DIR, safeKey(key), `${id}.json`);
      try {
        const obj = decryptJson(JSON.parse(fs.readFileSync(file, 'utf8')));
        sendJson(res, 200, { ok: true, file: { ...obj, dataUrl: undefined }, dataUrl: obj.dataUrl, cloud: 'local' });
        return;
      } catch { /* try supabase */ }
      if (supabaseConfigured && serviceClient) {
        try {
          const { data, error } = await serviceClient.from(SUPABASE_TABLE.files)
            .select('payload')
            .eq('file_id', id)
            .eq('platform_key', safeKey(key))
            .maybeSingle();
          if (error) throw error;
          const obj = data && data.payload ? decryptJson(data.payload) : null;
          if (obj) {
            sendJson(res, 200, { ok: true, file: { ...obj, dataUrl: undefined }, dataUrl: obj.dataUrl, cloud: 'supabase' });
            return;
          }
        } catch { /* not found */ }
      }
      sendJson(res, 404, { ok: false, error: 'file not found' });
    })();
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
    readBody(req).then(async (body) => {
      const store = await loadStoreLatest(key);
      const merged = mergeState(store, body || {});
      await saveStorePermanent(key, merged);
      if (safeKey(key) !== 'nexago-main') {
        const central = await loadStoreLatest('nexago-main');
        await saveStorePermanent('nexago-main', mergeState(central, body || {}));
        notifyStateSubscribers('nexago-main', { sourceKey: safeKey(key), reason: 'state-push' });
      }
      notifyStateSubscribers(key, { reason: 'state-push' });
      sendJson(res, 200, { ok: true, key, updatedAt: merged.updatedAt });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  // Targeted removal of specific driver records (e.g. ghost/test entries). The
  // normal /api/state merge is union-by-id so records can never be dropped by a
  // push; this endpoint is the only way to delete a driver from the cloud.
  if (req.method === 'POST' && url.pathname === '/api/state/remove') {
    if (!hasStateWriteAccess(req, key) || url.searchParams.get('confirm') !== 'REMOVE') {
      sendJson(res, 403, { ok: false, error: 'REMOVE_CONFIRM_REQUIRED' });
      return;
    }
    readBody(req).then(async (body) => {
      const driverIds = new Set((Array.isArray(body && body.drivers) ? body.drivers : []).map((x) => String(x)));
      const productIds = new Set((Array.isArray(body && body.products) ? body.products : []).map((x) => String(x)));
      const clearAllProducts = body && body.allProducts === true;
      const store = await loadStoreLatest(key);
      let removed = 0;
      if (driverIds.size && Array.isArray(store.state.drivers)) {
        const before = store.state.drivers.length;
        store.state.drivers = store.state.drivers.filter((d) => d && !driverIds.has(String(d.id)));
        removed += before - store.state.drivers.length;
      }
      if (Array.isArray(store.state.products)) {
        if (clearAllProducts) {
          removed += store.state.products.length;
          // Track all IDs so cloud sync filter re-adds never bring them back
          store.state.deletedProductIds = store.state.products.map((p) => String(p.id));
          store.state.products = [];
        } else if (productIds.size) {
          const before = store.state.products.length;
          store.state.products = store.state.products.filter((p) => p && !productIds.has(String(p.id)));
          removed += before - store.state.products.length;
          // Track removed IDs
          const existing = new Set(Array.isArray(store.state.deletedProductIds) ? store.state.deletedProductIds : []);
          productIds.forEach((id) => existing.add(id));
          store.state.deletedProductIds = [...existing];
        }
      }
      if (removed) {
        store.updatedAt = new Date().toISOString();
        await saveStorePermanent(key, store);
        notifyStateSubscribers(key, { reason: 'state-remove' });
      }
      sendJson(res, 200, { ok: true, removed });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/recover') {
    if (!hasStateWriteAccess(req, key)) { sendJson(res, 401, { ok: false, error: 'RECOVER_LOCKED' }); return; }
    readBody(req).then(async (body) => {
      const dir = path.join(BACKUP_DIR, safeKey(key));
      if (!fs.existsSync(dir)) { sendJson(res, 404, { ok: false, error: 'No backups found' }); return; }
      const requested = body && body.backupId ? String(body.backupId).replace(/[^a-zA-Z0-9_-]/g, '') + '.json' : '';
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
      const file = requested && files.includes(requested) ? requested : files[files.length - 1];
      if (!file) { sendJson(res, 404, { ok: false, error: 'No backups found' }); return; }
      const recovered = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const current = await loadStoreLatest(key);
      backupStore(key, current, 'before-recover');
      const merged = mergeState(current, recovered.state || {});
      await saveStorePermanent(key, merged);
      notifyStateSubscribers(key, { reason: 'state-recover' });
      sendJson(res, 200, { ok: true, key, recoveredFrom: file, updatedAt: merged.updatedAt });
    }).catch((e) => sendJson(res, 400, { ok: false, error: String(e && e.message || e) }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    if (!rateLimit(req, 'events', 120, 60_000)) { sendJson(res, 429, { ok: false, error: 'RATE_LIMIT' }); return; }
    readBody(req).then(async (body) => {
      const store = await loadStoreLatest(key);
      const banners = Array.isArray(store.state && store.state.banners) ? store.state.banners : [];
      const ev = body || {};
      if ((ev.type === 'banner-impression' || ev.type === 'banner-click') && ev.bannerId) {
        const idx = banners.findIndex((b) => b && b.id === ev.bannerId);
        if (idx >= 0) {
          if (ev.type === 'banner-impression') banners[idx].impressions = Number(banners[idx].impressions || 0) + 1;
          else banners[idx].clicks = Number(banners[idx].clicks || 0) + 1;
          await saveStorePermanent(key, store);
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
    readBody(req).then(async (body) => {
      const store = await loadStoreLatest(key);
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
      const isNewOrder = idx < 0;
      if (idx >= 0) orders[idx] = order; else orders.unshift(order);
      store.state.orders = orders;
      const notifs = Array.isArray(store.state.notifications) ? store.state.notifications : [];
      if (isNewOrder) {
        notifs.unshift({
          id: 'NOTIF-' + Date.now(),
          title: (order.source === 'pos-dispatch' || String(order.id || '').startsWith('POS-')) ? 'New POS Order #' + order.id : 'New Customer Order #' + order.id,
          message: (order.customerName || 'Customer') + ' ordered from ' + (order.storeName || 'a store') + ' (৳' + Number(order.amount || 0).toLocaleString('en-IN') + ')',
          type: 'order',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        });
      }
      store.state.notifications = notifs.slice(0, 100);
      store.updatedAt = new Date().toISOString();
      await saveStorePermanent(key, store);
      mirrorOrderHistory(safeKey(key), order).catch((e) => console.error('[supabase] order history mirror failed:', e.message));
      if (safeKey(key) !== 'nexago-main') {
        const central = await loadStoreLatest('nexago-main');
        await saveStorePermanent('nexago-main', mergeState(central, { orders: [order], notifications: store.state.notifications }));
        mirrorOrderHistory('nexago-main', order).catch((e) => console.error('[supabase] central order history mirror failed:', e.message));
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
  startAutomaticSupabaseBackups();
});

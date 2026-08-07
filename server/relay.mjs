import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || process.env.RELAY_PORT || 3100;
const HOST = process.env.RELAY_HOST || '0.0.0.0';
const PUBLIC_URL = (process.env.RELAY_PUBLIC_URL || '').replace(/\/$/, '');

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

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

const rooms = new Map(); // room -> { share?: ws, admin?: ws }

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify(obj));
}

// ---- Live store data (JSON file store per store key) ----
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function storeFile(key) {
  const safe = String(key || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'default';
  return path.join(DATA_DIR, safe + '.json');
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
  fs.writeFileSync(storeFile(key), JSON.stringify(obj), 'utf8');
  return obj;
}

// Merge a client push into the stored state. Banner counters coming from the
// live storefront (impressions/clicks) survive subsequent admin pushes.
function mergeState(stored, incoming) {
  const merged = { ...(stored.state || {}) };
  for (const k of ['products', 'orders', 'notifications']) {
    if (Array.isArray(incoming[k])) merged[k] = incoming[k];
  }
  if (Array.isArray(incoming.banners)) {
    const storedBanners = Array.isArray(merged.banners) ? merged.banners : [];
    merged.banners = incoming.banners.map((b) => {
      const prev = storedBanners.find((x) => x && x.id === b.id);
      return {
        ...b,
        impressions: Math.max(Number(b.impressions || 0), Number(prev?.impressions || 0)),
        clicks: Math.max(Number(b.clicks || 0), Number(prev?.clicks || 0))
      };
    });
  }
  if (incoming.profile && typeof incoming.profile === 'object') merged.profile = incoming.profile;
  return { version: 1, updatedAt: new Date().toISOString(), state: merged };
}

function storefrontView(state) {
  const now = new Date().toISOString().slice(0, 10);
  const profile = Object.assign(
    { storeName: 'Smart Shop', storeSub: 'NexaGo BD Delivery', whatsapp: '' },
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
    req.on('data', (c) => { data += c; if (data.length > 5e6) { req.destroy(); reject(new Error('payload too large')); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
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
    const file = path.join(__dirname, 'storefront.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(500); res.end('storefront page missing'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders });
      res.end(data);
    });
    return;
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

  if (req.method === 'POST' && (url.pathname === '/api/state' || url.pathname === '/api/push')) {
    readBody(req).then((body) => {
      const store = loadStore(key);
      const merged = mergeState(store, body || {});
      saveStore(key, merged);
      sendJson(res, 200, { ok: true, key, updatedAt: merged.updatedAt });
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

  if (req.method === 'POST' && url.pathname === '/api/reset') {
    try { if (fs.existsSync(storeFile(key))) fs.unlinkSync(storeFile(key)); } catch { /* ignore */ }
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

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CLOUDFLARED = process.env.CLOUDFLARED_PATH || path.join(ROOT, 'cloudflared.exe');
const RELAY_PORT = process.env.RELAY_PORT || 3100;
const PUBLIC_FILE = path.join(__dirname, '.public-url');

fs.writeFileSync(PUBLIC_FILE, '');

function log(msg) { console.log(new Date().toISOString().slice(11, 19), msg); }

const isWin = os.platform() === 'win32';
const relay = spawn(process.execPath, [path.join(__dirname, 'relay.mjs')], { stdio: 'inherit' });

function ensureCloudflared() {
  try { fs.accessSync(CLOUDFLARED); return true; }
  catch {
    log('cloudflared not found at ' + CLOUDFLARED);
    return false;
  }
}

let tunnelProc = null;
function startTunnel() {
  if (!ensureCloudflared()) { log('Cannot start tunnel — install cloudflared first'); return; }
  log('Starting Cloudflare quick tunnel to http://localhost:' + RELAY_PORT + ' …');
  tunnelProc = spawn(CLOUDFLARED, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${RELAY_PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  tunnelProc.stdout.on('data', (buf) => {
    const text = buf.toString();
    process.stdout.write(text);
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g);
    if (m && m[0]) {
      fs.writeFileSync(PUBLIC_FILE, m[0].trim());
      log('PUBLIC URL: ' + m[0].trim());
      log('Share link: ' + m[0].trim() + '/share?room=NX-ABCD-123');
    }
  });
  tunnelProc.stderr.on('data', (buf) => {
    const text = buf.toString();
    process.stderr.write(text);
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g);
    if (m && m[0]) {
      fs.writeFileSync(PUBLIC_FILE, m[0].trim());
      log('PUBLIC URL: ' + m[0].trim());
    }
  });
  tunnelProc.on('exit', (code) => {
    log('Tunnel exited (' + code + ') — restarting in 3s');
    setTimeout(startTunnel, 3000);
  });
}

const INT = process.platform === 'win32' ? 'SIGTERM' : 'SIGINT';
process.on('SIGINT', () => { relay.kill(INT); if (tunnelProc) tunnelProc.kill(); process.exit(0); });
process.on('SIGTERM', () => { relay.kill(INT); if (tunnelProc) tunnelProc.kill(); process.exit(0); });

startTunnel();

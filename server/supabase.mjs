import { createClient } from '@supabase/supabase-js';

function cleanEnvSecret(value) {
  const raw = String(value || '').trim();
  return raw.replace(/^["']|["']$/g, '').trim();
}

const SUPABASE_URL = cleanEnvSecret(process.env.SUPABASE_URL).replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = cleanEnvSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_ANON_KEY = cleanEnvSecret(process.env.SUPABASE_ANON_KEY);

// Service-role is only ever used server-side inside relay.mjs. The anon key is
// exposed to browsers for storage/uploads; the service key never leaves the
// server and is read from environment variables on DigitalOcean.
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export const serviceClient = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-Nexago-Origin': 'relay' } },
    })
  : null;

export const anonClient = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const supabaseUrl = SUPABASE_URL;

export function supabaseHeaders() {
  return {
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function supabaseFetch(path, options = {}) {
  const headers = supabaseHeaders();
  if (options.headers) Object.assign(headers, options.headers);
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`supabase ${res.status} ${text.slice(0, 200)}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

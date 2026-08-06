/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LedgerEntry {
  id: string;
  productId: string;
  productName: string;
  type: string;
  qty: number;
  reason: string;
  by: string;
  time: string;
  date?: string;
}

export interface BatchEntry {
  id: string;
  productId: string;
  productName: string;
  batchCode: string;
  expiry: string;
  qty: number;
  receivedAt: string;
  supplier: string;
}

export interface POItem {
  productId: string;
  name: string;
  qty: number;
  unitCost: number;
  batchCode: string;
  expiry: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  supplierContact: string;
  items: POItem[];
  total: number;
  status: 'Pending' | 'Received' | 'Cancelled';
  createdAt: string;
  receivedAt?: string;
  notes: string;
}

export const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.now()) / 86400000);
};

export type ExpiryState = 'none' | 'ok' | 'soon' | 'expired';

export const expiryState = (iso?: string): ExpiryState => {
  const days = daysUntil(iso);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
};

export const effectiveExpiry = (p: any, batches: BatchEntry[]) => {
  const dates: string[] = [];
  if (p.expiry) dates.push(p.expiry);
  batches
    .filter(b => b.productId === p.id && b.qty > 0 && b.expiry)
    .forEach(b => dates.push(b.expiry));
  if (dates.length === 0) return { expiry: null as string | null, state: 'none' as ExpiryState, days: null as number | null };
  dates.sort();
  const expiry = dates[0];
  return { expiry, state: expiryState(expiry), days: daysUntil(expiry) };
};

export const fmt = (n: number) => '৳' + (Math.round(n * 100) / 100).toLocaleString('en-IN');

const withinDays = (dateISO: string, windowDays: number) => {
  if (!dateISO) return false;
  const d = new Date(dateISO + 'T00:00:00');
  if (isNaN(d.getTime())) return true;
  return (Date.now() - d.getTime()) / 86400000 <= windowDays;
};

export const ledgerSales = (ledger: LedgerEntry[], productId: string, windowDays: number) =>
  ledger
    .filter(e => e.productId === productId && e.type === 'Sale' && (!e.date || withinDays(e.date, windowDays)))
    .reduce((s, e) => s + Math.abs(e.qty), 0);

export const avgDailySales = (ledger: LedgerEntry[], productId: string) =>
  ledgerSales(ledger, productId, 30) / 30;

export const daysOfStock = (ledger: LedgerEntry[], stock: number, productId: string) => {
  const avg = avgDailySales(ledger, productId);
  if (avg <= 0) return null;
  return Math.round(stock / avg);
};

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const poNumber = () => {
  const d = new Date();
  return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
};

export const code39Pattern = (ch: string): string | null => {
  const map: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001',
    '5': '100110000', '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100',
    'A': '100001001', 'B': '001001001', 'C': '101001000', 'D': '000011001', 'E': '100011000',
    'F': '001011000', 'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011', 'O': '100010010',
    'P': '001010010', 'Q': '000000111', 'R': '100000110', 'S': '001000110', 'T': '000010110',
    'U': '110000001', 'V': '011000001', 'W': '111000000', 'X': '010010001', 'Y': '110010000',
    'Z': '011010000', '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
    '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
  };
  return map[ch.toUpperCase()] || null;
};

export interface BarElement { width: number; white: boolean; }

export const code39Bars = (text: string): BarElement[] => {
  const chars = text.toUpperCase().split('').filter(c => code39Pattern(c)).slice(0, 20);
  const full = ['*', ...chars, '*'];
  const out: BarElement[] = [];
  full.forEach((c, i) => {
    if (i > 0) out.push({ width: 1, white: true });
    const pat = code39Pattern(c);
    if (!pat) return;
    for (let k = 0; k < 9; k++) {
      const wide = pat[k] === '1';
      out.push({ width: wide ? 2 : 1, white: k % 2 === 1 });
    }
  });
  return out;
};

export const encodeCSV = (products: any[]) => {
  const header = ['name', 'category', 'sku', 'unit', 'stock', 'cost', 'price', 'vat', 'discount', 'promoPrice', 'supplier', 'supplierContact', 'reorderPoint', 'expiry', 'image'];
  const cell = (v: any) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [header.map(cell).join(',')];
  products.forEach((p: any) => rows.push(header.map(h => cell(p[h])).join(',')));
  return '\uFEFF' + rows.join('\n');
};

export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  const s = text.trim().replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
};

export const downloadBlob = (filename: string, content: string, mime = 'text/csv') => {
  const blob = new Blob([content], { type: mime + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
};

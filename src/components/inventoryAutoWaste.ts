/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BatchEntry, LedgerEntry, nowTime, todayISO } from './inventoryUtils';
import { getStoredData, setStoredData } from '../data';

export interface AutoWasteResult {
  products: any[];
  batches: BatchEntry[];
  ledger: LedgerEntry[];
  wasted: { batch: BatchEntry; qty: number }[];
}

export const runExpiryAutoWaste = (products: any[]): AutoWasteResult => {
  const today = todayISO();
  const batches = getStoredData<BatchEntry[]>('sd_batches', []);
  const ledger = getStoredData<LedgerEntry[]>('sd_stock_ledger', []);
  const expired = batches.filter(b => b && b.qty > 0 && b.expiry && b.expiry < today);
  if (!expired.length) return { products, batches, ledger, wasted: [] };

  const wasted = expired.map(b => ({ batch: b, qty: b.qty }));
  const newBatches = batches.map(b => (expired.some(x => x.id === b.id) ? { ...b, qty: 0 } : b));
  const newLedger: LedgerEntry[] = expired.map(b => ({
    id: 'LED-' + Math.floor(100 + Math.random() * 900),
    productId: b.productId,
    productName: b.productName,
    type: 'Waste',
    qty: -Math.abs(b.qty),
    reason: 'Auto-waste: batch expired ' + b.expiry,
    by: 'Auto',
    time: nowTime(),
    date: today
  }));

  const newProducts = products.map(p => {
    const q = wasted.filter(w => w.batch.productId === p.id).reduce((s, w) => s + w.qty, 0);
    return q ? { ...p, stock: Math.max(0, (p.stock ?? 0) - q) } : p;
  });

  setStoredData('sd_batches', newBatches);
  setStoredData('sd_stock_ledger', [...newLedger, ...ledger]);
  return { products: newProducts, batches: newBatches, ledger: [...newLedger, ...ledger], wasted };
};

export const fetchInventoryLedger = (): LedgerEntry[] => getStoredData<LedgerEntry[]>('sd_stock_ledger', []);

export const fetchInventoryBatches = (): BatchEntry[] => getStoredData<BatchEntry[]>('sd_batches', []);

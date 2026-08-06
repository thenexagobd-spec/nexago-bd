/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, X, Truck, Phone, FileText, Package } from 'lucide-react';
import { BatchEntry, LedgerEntry, POItem, PurchaseOrder, addDays, fmt, nowTime, poNumber, todayISO } from './inventoryUtils';

interface PurchaseOrdersViewProps {
  pos: PurchaseOrder[];
  onPosChange: (next: PurchaseOrder[]) => void;
  products: any[];
  onProductsChange: (next: any[]) => void;
  addBatches: (bs: BatchEntry[]) => void;
  logEntry: (e: Omit<LedgerEntry, 'id' | 'time'>) => void;
  showToast: (msg: string, type?: 'success' | 'info') => void;
}

interface DraftItem extends POItem { _key: number; }

export default function PurchaseOrdersView({ pos, onPosChange, products, onProductsChange, addBatches, logEntry, showToast }: PurchaseOrdersViewProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ supplier: string; supplierContact: string; notes: string; items: DraftItem[] }>({
    supplier: '', supplierContact: '', notes: '', items: []
  });

  const defaultCost = (p: any) => p.cost || Math.round((p.price || 0) * 0.75);

  const prefillReorder = () => {
    const items: DraftItem[] = products
      .filter((p: any) => (p.stock ?? 0) <= (p.reorderPoint ?? 5))
      .map((p: any, i: number) => ({
        productId: p.id,
        name: p.name,
        qty: Math.max((p.reorderPoint ?? 5) * 2 - (p.stock ?? 0), 10),
        unitCost: defaultCost(p),
        batchCode: '',
        expiry: addDays(todayISO(), 30),
        _key: Date.now() + i
      }));
    if (items.length === 0) items.push({ productId: '', name: '', qty: 10, unitCost: 0, batchCode: '', expiry: addDays(todayISO(), 30), _key: Date.now() });
    setDraft(d => ({ ...d, items }));
  };

  const openCreate = () => {
    const items: DraftItem[] = products
      .filter((p: any) => (p.stock ?? 0) <= (p.reorderPoint ?? 5))
      .map((p: any, i: number) => ({
        productId: p.id,
        name: p.name,
        qty: Math.max((p.reorderPoint ?? 5) * 2 - (p.stock ?? 0), 10),
        unitCost: defaultCost(p),
        batchCode: '',
        expiry: addDays(todayISO(), 30),
        _key: Date.now() + i
      }));
    if (items.length === 0) items.push({ productId: '', name: '', qty: 10, unitCost: 0, batchCode: '', expiry: addDays(todayISO(), 30), _key: Date.now() });
    setDraft({ supplier: '', supplierContact: '', notes: '', items });
    setCreateOpen(true);
  };

  const patchItem = (key: number, patch: Partial<DraftItem>) => {
    setDraft(d => ({
      ...d,
      items: d.items.map(it => it._key === key ? { ...it, ...patch } : it)
    }));
  };

  const addItem = () => {
    const first: any = products[0];
    setDraft(d => ({
      ...d,
      items: [...d.items, { productId: first?.id || '', name: first?.name || '', qty: 10, unitCost: defaultCost(first || {}), batchCode: '', expiry: addDays(todayISO(), 30), _key: Date.now() + Math.random() }]
    }));
  };

  const removeItem = (key: number) => {
    setDraft(d => ({ ...d, items: d.items.filter(it => it._key !== key) }));
  };

  const createPO = () => {
    const valid = draft.items.filter(it => it.productId && it.qty > 0);
    if (valid.length === 0) { showToast('Add at least one product with qty', 'info'); return; }
    const items: POItem[] = valid.map(({ _key, ...rest }) => rest);
    const total = items.reduce((s, it) => s + it.qty * it.unitCost, 0);
    const po: PurchaseOrder = {
      id: 'PO-' + Math.floor(100 + Math.random() * 900),
      poNumber: poNumber(),
      supplier: draft.supplier.trim() || '—',
      supplierContact: draft.supplierContact.trim(),
      items,
      total,
      status: 'Pending',
      createdAt: nowTime(),
      notes: draft.notes.trim()
    };
    onPosChange([po, ...pos]);
    setCreateOpen(false);
    showToast(`PO ${po.poNumber} created — ${items.length} item${items.length === 1 ? '' : 's'}, ${fmt(total)}`, 'success');
  };

  const receivePO = () => {
    const po = pos.find(p => p.id === receiveId);
    if (!po) return;
    po.items.forEach((it: POItem) => {
      const existing = products.find((p: any) => p.id === it.productId);
      if (!existing) return;
      const stock = (existing.stock ?? 0) + it.qty;
      const st = stock <= 0 ? 'Out of Stock' : stock <= (existing.reorderPoint ?? 5) ? 'Low Stock' : 'In Stock';
      onProductsChange(products.map((x: any) => x.id === it.productId ? { ...x, stock, status: st, updatedAt: nowTime() } : x));
      logEntry({
        productId: it.productId,
        productName: it.name,
        type: 'Restock',
        qty: it.qty,
        reason: `PO ${po.poNumber} received`,
        by: 'Admin'
      });
    });
    const batchEntries: BatchEntry[] = po.items
      .filter((it: POItem) => it.batchCode && it.expiry)
      .map((it: POItem) => ({
        id: 'BATCH-' + Math.floor(1000 + Math.random() * 9000),
        productId: it.productId,
        productName: it.name,
        batchCode: it.batchCode,
        expiry: it.expiry,
        qty: it.qty,
        receivedAt: nowTime(),
        supplier: po.supplier
      }));
    if (batchEntries.length) addBatches(batchEntries);
    onPosChange(pos.map(p => p.id === po.id ? { ...p, status: 'Received' as const, receivedAt: nowTime() } : p));
    setReceiveId(null);
    showToast(`PO ${po.poNumber} received — stock updated`, 'success');
  };

  const cancelPO = (id: string) => {
    onPosChange(pos.map(p => p.id === id ? { ...p, status: 'Cancelled' as const } : p));
    showToast('PO cancelled', 'info');
  };

  const statusChip = (s: string) =>
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${s === 'Pending' ? 'bg-amber-500/10 text-amber-300' : s === 'Received' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{s}</span>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Truck className="w-3.5 h-3.5 text-brand-orange" /><span>Purchase Orders — Supplier Procurement</span></h4>
          <p className="text-[10px] text-gray-500 mt-0.5">Create, receive, and cancel purchase orders. Receiving auto-restocks inventory and logs batches.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={prefillReorder} className="px-3 py-2 bg-brand-dark border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:text-white">Prefill from Reorder</button>
          <button onClick={openCreate} className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><Plus className="w-3.5 h-3.5" /><span>New Purchase Order</span></button>
        </div>
      </div>

      {pos.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-xl p-8 text-center">
          <Package className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-sm font-bold text-gray-300 mt-2">No purchase orders yet</p>
          <p className="text-xs text-gray-500 mt-1">Create one manually or use "Prefill from Reorder" to pull items that are below their reorder point.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pos.map((po: PurchaseOrder) => (
            <div key={po.id} className="bg-brand-card border border-brand-border rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-black text-brand-orange">{po.poNumber}</span>
                  {statusChip(po.status)}
                  <span className="text-[10px] text-gray-500 font-mono">{po.createdAt}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-white">{fmt(po.total)}</span>
                  {po.status === 'Pending' && (
                    <>
                      <button onClick={() => setReceiveId(po.id)} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-emerald-500/20 flex items-center space-x-1"><CheckCircle2 className="w-3 h-3" /><span>Receive</span></button>
                      <button onClick={() => cancelPO(po.id)} className="px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-red-500/20">Cancel</button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
                <span className="flex items-center space-x-1"><Truck className="w-3 h-3" /><span>{po.supplier}</span></span>
                {po.supplierContact && <span className="flex items-center space-x-1"><Phone className="w-3 h-3" /><span>{po.supplierContact}</span></span>}
                <span>{po.items.length} item{po.items.length === 1 ? '' : 's'}</span>
                {po.receivedAt && <span>Received {po.receivedAt}</span>}
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-brand-border/40">
                      <th className="py-1 pr-2 font-bold uppercase">Product</th>
                      <th className="py-1 px-2 font-bold uppercase">Qty</th>
                      <th className="py-1 px-2 font-bold uppercase">Unit Cost</th>
                      <th className="py-1 px-2 font-bold uppercase">Batch</th>
                      <th className="py-1 px-2 font-bold uppercase">Expiry</th>
                      <th className="py-1 pl-2 font-bold uppercase text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40">
                    {po.items.map((it: POItem, i: number) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-2 font-bold text-white">{it.name}</td>
                        <td className="py-1.5 px-2 font-mono text-gray-300">{it.qty}</td>
                        <td className="py-1.5 px-2 font-mono text-gray-400">{fmt(it.unitCost)}</td>
                        <td className="py-1.5 px-2 font-mono text-gray-500">{it.batchCode || '—'}</td>
                        <td className="py-1.5 px-2 font-mono text-gray-500">{it.expiry || '—'}</td>
                        <td className="py-1.5 pl-2 text-right font-bold text-emerald-400">{fmt(it.qty * it.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New PO modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2"><FileText className="w-4 h-4 text-brand-orange" /><span>New Purchase Order</span></h4>
              <button onClick={() => setCreateOpen(false)} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Supplier</label>
                <input value={draft.supplier} onChange={(e) => setDraft(d => ({ ...d, supplier: e.target.value }))} placeholder="e.g. FreshMart Wholesale" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Supplier Contact</label>
                <input value={draft.supplierContact} onChange={(e) => setDraft(d => ({ ...d, supplierContact: e.target.value }))} placeholder="phone / email" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Notes</label>
                <input value={draft.notes} onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="delivery date, terms…" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
            </div>
            <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Line Items</span>
                <button onClick={addItem} className="px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/40 text-blue-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-blue-500/20 flex items-center space-x-1"><Plus className="w-3 h-3" /><span>Add Item</span></button>
              </div>
              {draft.items.map((it: DraftItem) => (
                <div key={it._key} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
                  <select
                    value={it.productId}
                    onChange={(e) => {
                      const p: any = products.find((x: any) => x.id === e.target.value);
                      patchItem(it._key, { productId: e.target.value, name: p?.name || '', unitCost: p ? defaultCost(p) : it.unitCost });
                    }}
                    className="col-span-2 px-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  >
                    <option value="">Select product…</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" min={1} value={it.qty} onChange={(e) => patchItem(it._key, { qty: Number(e.target.value) || 0 })} className="px-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" title="Qty" />
                  <input type="number" min={0} value={it.unitCost} onChange={(e) => patchItem(it._key, { unitCost: Number(e.target.value) || 0 })} className="px-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" title="Unit cost" />
                  <input value={it.batchCode} onChange={(e) => patchItem(it._key, { batchCode: e.target.value })} placeholder="Batch" className="px-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
                  <div className="flex items-center space-x-1">
                    <input type="date" value={it.expiry} onChange={(e) => patchItem(it._key, { expiry: e.target.value })} className="flex-1 px-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                    <button onClick={() => removeItem(it._key)} className="p-2 bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg cursor-pointer hover:bg-red-500/20" title="Remove line"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end space-x-3 text-xs pt-1">
                <span className="text-gray-400 font-semibold">{draft.items.filter(i => i.productId && i.qty > 0).length} line item(s)</span>
                <span className="font-black text-white">Total: <span className="text-brand-orange">{fmt(draft.items.reduce((s, it) => s + (it.productId ? it.qty * it.unitCost : 0), 0))}</span></span>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setCreateOpen(false)} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-600/30">Cancel</button>
              <button onClick={createPO} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5" /><span>Create PO</span></button>
            </div>
          </div>
        </div>
      )}

      {/* Receive confirm */}
      {receiveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-xl p-5 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">Receive this PO?</p>
            <p className="text-xs text-gray-400">"{pos.find(p => p.id === receiveId)?.poNumber}" will add all line items to stock and record a Restock entry in the ledger. Batch/expiry details are saved for FEFO.</p>
            <div className="flex justify-center space-x-2 pt-1">
              <button onClick={() => setReceiveId(null)} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer">Cancel</button>
              <button onClick={receivePO} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer">Receive Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

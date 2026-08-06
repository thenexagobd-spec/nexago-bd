/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle2, ClipboardCheck, Plus, Search, Store, Trash2, X } from 'lucide-react';
import { getStoredData, setStoredData } from '../data';
import { LedgerEntry, nowTime, todayISO } from './inventoryUtils';

interface StoreOpsViewProps {
  products: any[];
  onProductsChange: (next: any[]) => void;
  logEntry: (e: Omit<LedgerEntry, 'id' | 'time'>) => void;
  showToast: (msg: string, type?: 'success' | 'info') => void;
  snapshot: (label: string) => void;
}

interface TransferEntry {
  id: string;
  from: string;
  to: string;
  productId: string;
  productName: string;
  qty: number;
  note: string;
  time: string;
}

const DEFAULT_STORES = ['Main Outlet', 'Warehouse', 'Branch 2'];

export default function StoreOpsView({ products, onProductsChange, logEntry, showToast, snapshot }: StoreOpsViewProps) {
  const [storesMeta, setStoresMeta] = useState<string[]>(() => getStoredData('sd_stores_meta', DEFAULT_STORES));
  const [transfers, setTransfers] = useState<TransferEntry[]>(() => getStoredData('sd_transfers', []));
  const [sub, setSub] = useState<'stock' | 'transfers' | 'count'>('stock');
  const [selStore, setSelStore] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newStore, setNewStore] = useState('');
  const [search, setSearch] = useState('');
  const [tFrom, setTFrom] = useState(0);
  const [tTo, setTTo] = useState(1);
  const [tProduct, setTProduct] = useState('');
  const [tQty, setTQty] = useState('');
  const [tNote, setTNote] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [cSearch, setCSearch] = useState('');

  useEffect(() => { setStoredData('sd_stores_meta', storesMeta); }, [storesMeta]);
  useEffect(() => { setStoredData('sd_transfers', transfers); }, [transfers]);

  const store = storesMeta[selStore] || storesMeta[0];
  const stockAt = (p: any, name: string) => {
    const ss = p.storeStock;
    if (ss) return Number(ss[name]) || 0;
    return name === storesMeta[0] ? (p.stock ?? 0) : 0;
  };

  const addStore = () => {
    const name = newStore.trim();
    if (!name) { showToast('Enter a store name', 'info'); return; }
    if (storesMeta.some(s => s.toLowerCase() === name.toLowerCase())) { showToast('Store already exists', 'info'); return; }
    setStoresMeta([...storesMeta, name]);
    setNewStore('');
    showToast(`Store "${name}" added`, 'success');
  };

  const applyStock = () => {
    let changed = 0;
    snapshot('Store stock update');
    const next = products.map((p: any) => {
      const raw = drafts[p.id];
      if (raw === undefined || raw === '') return p;
      const nq = Math.max(0, parseInt(raw) || 0);
      const ss = p.storeStock ? { ...p.storeStock } : { [storesMeta[0]]: p.stock ?? 0 };
      const old = Number(ss[store]) || 0;
      if (nq === old) return p;
      ss[store] = nq;
      const total = Object.values(ss as Record<string, number>).reduce((s, v) => s + (Number(v) || 0), 0);
      const st = total <= 0 ? 'Out of Stock' : total <= (Number(p.reorderPoint) || 5) ? 'Low Stock' : 'In Stock';
      changed++;
      logEntry({ productId: p.id, productName: p.name, type: 'Adjust', qty: nq - old, reason: `Store stock update — ${store}`, by: 'Admin', date: todayISO() });
      return { ...p, storeStock: ss, stock: total, status: st, updatedAt: nowTime() };
    });
    onProductsChange(next);
    setDrafts({});
    showToast(changed ? `Updated ${changed} product(s) at ${store}` : 'No changes to apply', changed ? 'success' : 'info');
  };

  const doTransfer = () => {
    if (tFrom === tTo) { showToast('Choose two different stores', 'info'); return; }
    const p = products.find((x: any) => x.id === tProduct);
    const qty = Math.max(0, parseInt(tQty) || 0);
    if (!p || qty <= 0) { showToast('Select a product and a positive quantity', 'info'); return; }
    const from = storesMeta[tFrom];
    const to = storesMeta[tTo];
    if (stockAt(p, from) < qty) { showToast(`Only ${stockAt(p, from)} ${p.unit || 'pcs'} available in ${from}`, 'info'); return; }
    snapshot('Stock transfer');
    const next = products.map((x: any) => {
      if (x.id !== p.id) return x;
      const ss = x.storeStock ? { ...x.storeStock } : { [storesMeta[0]]: x.stock ?? 0 };
      ss[from] = Math.max(0, (ss[from] || 0) - qty);
      ss[to] = (ss[to] || 0) + qty;
      const total = Object.values(ss as Record<string, number>).reduce((s, v) => s + (Number(v) || 0), 0);
      const st = total <= 0 ? 'Out of Stock' : total <= (Number(x.reorderPoint) || 5) ? 'Low Stock' : 'In Stock';
      return { ...x, storeStock: ss, stock: total, status: st, updatedAt: nowTime() };
    });
    onProductsChange(next);
    setTransfers(prev => [{ id: 'TR-' + Math.floor(100 + Math.random() * 900), from, to, productId: p.id, productName: p.name, qty, note: tNote.trim(), time: nowTime() }, ...prev]);
    logEntry({ productId: p.id, productName: p.name, type: 'Transfer', qty: 0, reason: `Transferred ${qty} to ${to}`, by: 'Admin', date: todayISO() });
    showToast(`Transferred ${qty} ${p.name} to ${to}`, 'success');
    setTQty(''); setTNote('');
  };

  const applyCount = () => {
    let changed = 0;
    let varTotal = 0;
    snapshot('Cycle count');
    const next = products.map((p: any) => {
      const raw = counts[p.id];
      if (raw === undefined || raw === '') return p;
      const counted = Math.max(0, parseInt(raw) || 0);
      const diff = counted - (p.stock ?? 0);
      if (diff === 0) return p;
      changed++;
      varTotal += diff;
      const ss = p.storeStock ? { ...p.storeStock } : {};
      const st = counted <= 0 ? 'Out of Stock' : counted <= (p.reorderPoint ?? 5) ? 'Low Stock' : 'In Stock';
      logEntry({ productId: p.id, productName: p.name, type: 'Adjust', qty: diff, reason: 'Stock count variance', by: 'Count', date: todayISO() });
      return { ...p, stock: counted, storeStock: ss, status: st, updatedAt: nowTime() };
    });
    onProductsChange(next);
    setCounts({});
    showToast(changed ? `${changed} item(s) reconciled — net Δ ${varTotal}` : 'No variances to apply', changed ? 'success' : 'info');
  };

  const counted = products.filter((p: any) => counts[p.id] !== undefined && counts[p.id] !== '');
  const varSum = counted.reduce((s: number, p: any) => s + (Math.max(0, parseInt(counts[p.id]) || 0) - (p.stock ?? 0)), 0);

  const subTabs = [
    { id: 'stock' as const, label: 'Store Stock', icon: Store },
    { id: 'transfers' as const, label: 'Transfers', icon: ArrowLeftRight },
    { id: 'count' as const, label: 'Cycle Count', icon: ClipboardCheck }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Store className="w-3.5 h-3.5 text-brand-orange" /><span>Warehouse & Multi-Store Ops</span></h4>
          <p className="text-[10px] text-gray-500 mt-0.5">Per-store stock, transfers between outlets, and cycle-count reconciliation.</p>
        </div>
        <div className="flex items-center space-x-2">
          <input value={newStore} onChange={(e) => setNewStore(e.target.value)} placeholder="New store name…" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
          <button onClick={addStore} className="px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><Plus className="w-3.5 h-3.5" /><span>Add Store</span></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${sub === t.id ? 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange' : 'bg-brand-dark border-brand-border text-gray-400 hover:text-white'}`}>
            <t.icon className="w-3.5 h-3.5" /><span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400">
        {storesMeta.map((s, i) => (
          <span key={i} className={`px-2.5 py-1 rounded-full border ${i === selStore ? 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange font-bold' : 'bg-brand-dark border-brand-border'}`}>{s}</span>
        ))}
      </div>

      {sub === 'stock' && (
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Store</span>
              <select value={selStore} onChange={(e) => setSelStore(Number(e.target.value))} className="px-2 py-1.5 bg-brand-dark border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-brand-orange">
                {storesMeta.map((s, i) => <option key={i} value={i}>{s}</option>)}
              </select>
            </div>
            <button onClick={applyStock} className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5" /><span>Apply Changes</span></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-gray-500 border-b border-brand-border">
                  <th className="py-2 pr-2 font-bold uppercase">Product</th>
                  <th className="py-2 px-2 font-bold uppercase">Current @ {store}</th>
                  <th className="py-2 px-2 font-bold uppercase">New Qty</th>
                  <th className="py-2 pl-2 font-bold uppercase text-right">Total Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-brand-dark/10">
                    <td className="py-1.5 pr-2 font-bold text-white truncate max-w-[200px]">{p.name}</td>
                    <td className="py-1.5 px-2 font-mono text-gray-300">{stockAt(p, store)}</td>
                    <td className="py-1.5 px-2">
                      <input
                        value={drafts[p.id] ?? ''}
                        onChange={(e) => setDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                        type="number" min={0}
                        placeholder="unchanged"
                        className="w-20 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600"
                      />
                    </td>
                    <td className="py-1.5 pl-2 text-right font-mono font-bold text-emerald-400">{p.stock ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sub === 'transfers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
            <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">New Transfer</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] text-gray-500 uppercase mb-1">From Store</label>
                <select value={tFrom} onChange={(e) => setTFrom(Number(e.target.value))} className="w-full px-2 py-2 bg-brand-dark border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-brand-orange">
                  {storesMeta.map((s, i) => <option key={i} value={i}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-gray-500 uppercase mb-1">To Store</label>
                <select value={tTo} onChange={(e) => setTTo(Number(e.target.value))} className="w-full px-2 py-2 bg-brand-dark border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-brand-orange">
                  {storesMeta.map((s, i) => <option key={i} value={i}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 uppercase mb-1">Product</label>
              <select value={tProduct} onChange={(e) => setTProduct(e.target.value)} className="w-full px-2 py-2 bg-brand-dark border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-brand-orange">
                <option value="">Select product…</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({stockAt(p, storesMeta[tFrom]) || 0} @ {storesMeta[tFrom]})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} value={tQty} onChange={(e) => setTQty(e.target.value)} placeholder="Quantity" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <input value={tNote} onChange={(e) => setTNote(e.target.value)} placeholder="Note (optional)" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
            </div>
            <button onClick={doTransfer} className="w-full px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center justify-center space-x-1.5"><ArrowLeftRight className="w-3.5 h-3.5" /><span>Transfer Stock</span></button>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl p-4">
            <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-3">Transfer Log</h4>
            {transfers.length === 0 ? <p className="text-xs text-gray-500">No transfers yet.</p> : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {transfers.slice(0, 30).map((t: TransferEntry) => (
                  <div key={t.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{t.productName}</span>
                      <span className="font-mono text-[10px] text-brand-orange font-black">+{t.qty}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{t.from} <ArrowLeftRight className="w-3 h-3 inline-block mx-0.5" /> {t.to} · {t.time}{t.note ? ` · ${t.note}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {sub === 'count' && (
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={cSearch} onChange={(e) => setCSearch(e.target.value)} placeholder="Search product…" className="pl-8 pr-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-xs text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-[10px] text-gray-400">{counted.length} counted · Δ {varSum >= 0 ? '+' : ''}{varSum}</span>
              <button onClick={applyCount} className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5" /><span>Reconcile</span></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-gray-500 border-b border-brand-border">
                  <th className="py-2 pr-2 font-bold uppercase">Product</th>
                  <th className="py-2 px-2 font-bold uppercase">System</th>
                  <th className="py-2 px-2 font-bold uppercase">Counted</th>
                  <th className="py-2 pl-2 font-bold uppercase text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {products.filter((p: any) => !cSearch || p.name.toLowerCase().includes(cSearch.toLowerCase())).map((p: any) => {
                  const entered = counts[p.id] !== undefined && counts[p.id] !== '';
                  const sys = p.stock ?? 0;
                  const val = entered ? Math.max(0, parseInt(counts[p.id]) || 0) : null;
                  const varQ = val !== null ? val - sys : 0;
                  return (
                    <tr key={p.id} className="hover:bg-brand-dark/10">
                      <td className="py-1.5 pr-2 font-bold text-white truncate max-w-[220px]">{p.name}</td>
                      <td className="py-1.5 px-2 font-mono text-gray-300">{sys}</td>
                      <td className="py-1.5 px-2">
                        <input
                          value={counts[p.id] ?? ''}
                          onChange={(e) => setCounts(c => ({ ...c, [p.id]: e.target.value }))}
                          type="number" min={0}
                          placeholder="count"
                          className="w-20 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600"
                        />
                      </td>
                      <td className={`py-1.5 pl-2 text-right font-mono font-bold ${varQ > 0 ? 'text-emerald-400' : varQ < 0 ? 'text-red-400' : 'text-gray-600'}`}>{entered ? (varQ > 0 ? '+' + varQ : varQ) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {counted.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-[10px] text-blue-300">
              <Trash2 className="w-3 h-3 shrink-0" />
              <span>Reconciling writes variances to the stock ledger as "Stock count variance". Click Reconcile to apply.</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-[9px] text-gray-500">
        <X className="w-3 h-3 hidden" />
        <span>Store stock breakdown lives on each product (storeStock). Total stock = sum across stores. Every change is logged and undoable.</span>
      </div>
    </div>
  );
}

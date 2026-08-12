/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SystemNotification } from '../types';
import { getStoredData, setStoredData } from '../data';
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle, ClipboardList, X, Save, History, Truck, Tag, Box, Wallet, Minus, CheckCircle2, ShoppingCart, Download, Upload, Barcode, CalendarDays, TrendingUp, Boxes, MessageCircle, Undo2, Warehouse } from 'lucide-react';
import InventoryLabelModal from './InventoryLabel';
import PurchaseOrdersView from './PurchaseOrdersView';
import InventoryReportsView from './InventoryReportsView';
import StoreOpsView from './StoreOpsView';
import { BatchEntry, LedgerEntry, PurchaseOrder, addDays, downloadBlob, effectiveExpiry, encodeCSV, fmt, nowTime, parseCSV, poNumber, todayISO } from './inventoryUtils';

interface ProductInventoryViewProps {
  products: any[];
  onProductsChange: (next: any[]) => void;
  showToast: (msg: string, type?: 'success' | 'info') => void;
  onAddNotification?: (n: Omit<SystemNotification, 'id' | 'time' | 'read'>) => void;
}

const nowTimeLocal = nowTime;
const emptyForm = () => ({ name: '', category: 'Fruits & Vegetables', sku: '', unit: 'pcs', stock: 0, cost: 0, price: 0, vat: 0, discount: 0, promoPrice: 0, supplier: '', supplierContact: '', reorderPoint: 5, image: '', expiry: '', description: '', tags: '', video: '', gallery: '' });

const typePresets: Record<string, string> = {
  Restock: 'Manual restock',
  Sale: 'POS sale deduction',
  Waste: 'Damaged / expired (wastage)',
  Return: 'Customer return'
};

const CSV_ORDER = ['name', 'category', 'sku', 'unit', 'stock', 'cost', 'price', 'vat', 'discount', 'promoPrice', 'supplier', 'supplierContact', 'reorderPoint', 'expiry', 'image'];

export default function ProductInventoryView({ products, onProductsChange, showToast, onAddNotification }: ProductInventoryViewProps) {
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => getStoredData('sd_stock_ledger', []));
  const [batches, setBatches] = useState<BatchEntry[]>(() => getStoredData('sd_batches', []));
  const [pos, setPos] = useState<PurchaseOrder[]>(() => getStoredData('sd_purchase_orders', []));
  const [undoStack, setUndoStack] = useState<any[]>(() => getStoredData('sd_undo_stack', []));
  const [tab, setTab] = useState<'inventory' | 'pos' | 'reports' | 'warehouse'>('inventory');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<{ id: string; name: string; delta: string; reason: string; type: string; batch: string; expiry: string } | null>(null);
  const [panel, setPanel] = useState<'none' | 'reorder' | 'ledger'>('none');
  const [labelSel, setLabelSel] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [wa, setWa] = useState<{ p: any; suggested: number } | null>(null);
  const [waMsgText, setWaMsgText] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [variantTarget, setVariantTarget] = useState<any | null>(null);
  const [variantDraft, setVariantDraft] = useState<any[]>([]);
  const importRef = useRef<HTMLInputElement | null>(null);
  const PAGE_SIZE = 15;

  useEffect(() => { setStoredData('sd_stock_ledger', ledger); }, [ledger]);
  useEffect(() => { setStoredData('sd_products', products); }, [products]);
  useEffect(() => { setStoredData('sd_batches', batches); }, [batches]);
  useEffect(() => { setStoredData('sd_purchase_orders', pos); }, [pos]);
  useEffect(() => { setStoredData('sd_undo_stack', undoStack.slice(0, 12)); }, [undoStack]);
  useEffect(() => { setPage(1); }, [search, catFilter, statusFilter, sortBy]);

  const pushUndo = (label: string) => {
    setUndoStack(prev => [{
      label,
      time: nowTimeLocal(),
      products: JSON.parse(JSON.stringify(products)),
      ledger: JSON.parse(JSON.stringify(ledger)),
      batches: JSON.parse(JSON.stringify(batches)),
      pos: JSON.parse(JSON.stringify(pos))
    }, ...prev].slice(0, 12));
  };

  const doUndo = () => {
    if (undoStack.length === 0) return;
    const snap = undoStack[0];
    onProductsChange(snap.products || []);
    setLedger(snap.ledger || []);
    setBatches(snap.batches || []);
    setPos(snap.pos || []);
    setUndoStack(undoStack.slice(1));
    showToast(`Undid: ${snap.label}`, 'success');
  };

  const toggleAll = () => {
    const ids = new Set(filtered.map((p: any) => p.id));
    const allSel = ids.size > 0 && ids.size === selected.size && [...ids].every(id => selected.has(id));
    setSelected(allSel ? new Set() : ids);
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    pushUndo(`Bulk delete ${selected.size} item(s)`);
    const ids = Array.from(selected);
    onProductsChange(products.filter((x: any) => !ids.includes(x.id)));
    logEntry({ productId: 'BULK-DELETE', productName: `${ids.length} product(s) deleted`, type: 'Remove', qty: 0, reason: 'Bulk delete', by: 'Admin', date: todayISO() });
    setSelected(new Set());
    showToast(`Deleted ${ids.length} product(s)`, 'success');
  };

  const bulkLabels = () => {
    if (selected.size === 0) return;
    setLabelSel(products.filter((x: any) => selected.has(x.id)));
  };

  const bulkExport = () => {
    if (selected.size === 0) return;
    downloadBlob(`products-${todayISO()}.csv`, encodeCSV(products.filter((x: any) => selected.has(x.id))));
  };

  const waNumber = (p: any) => {
    const digits = String(p.supplierContact || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits : '';
  };

  const waMsg = (p: any, suggested: number) => {
    const supplier = p.supplier && p.supplier !== '—' ? p.supplier : 'Supplier';
    return `Dear ${supplier},\n\nThis is NexaGo BD. We need to reorder:\n\n${p.name} — current stock ${p.stock} ${p.unit || 'pcs'}, reorder point ${p.reorderPoint ?? 5}.\nPlease arrange ${suggested} ${p.unit || 'pcs'}.\n\nThanks!`;
  };

  const openWa = (p: any, suggested: number) => {
    setWa({ p, suggested });
    setWaMsgText(waMsg(p, suggested));
    setWaPhone(waNumber(p));
  };

  const sendWa = () => {
    if (!wa) return;
    const num = waPhone.replace(/\D/g, '');
    const url = num.length >= 10
      ? `https://wa.me/${num}?text=${encodeURIComponent(waMsgText)}`
      : `https://wa.me/?text=${encodeURIComponent(waMsgText)}`;
    if (num.length < 10) {
      navigator.clipboard?.writeText(waMsgText).catch(() => undefined);
      showToast('No supplier phone saved — message copied, pick the contact in WhatsApp', 'info');
    }
    window.open(url, '_blank');
  };

  const patchVariant = (i: number, key: string, val: any) => {
    setVariantDraft(d => d.map((v, idx) => idx === i ? { ...v, [key]: val } : v));
  };

  const removeVariant = (id: string) => {
    setVariantDraft(d => d.filter(v => v.id !== id));
  };

  const openVariants = (p: any) => {
    setVariantTarget(p);
    setVariantDraft((p.variants || []).map((v: any) => ({ ...v })));
  };

  const addVariant = () => {
    setVariantDraft(d => [...d, { id: 'V-' + Math.floor(100 + Math.random() * 900), label: '', sku: '', stock: 0, cost: 0, price: 0 }]);
  };

  const saveVariants = () => {
    if (!variantTarget) return;
    pushUndo('Variant update');
    const old = variantTarget.variants || [];
    old.forEach((v: any) => {
      const nv = variantDraft.find((x: any) => x.id === v.id);
      const nStock = nv ? (Number(nv.stock) || 0) : 0;
      if (nv && nStock !== (Number(v.stock) || 0)) {
        logEntry({ productId: variantTarget.id, productName: `${variantTarget.name} (${nv.label})`, type: 'Adjust', qty: nStock - (Number(v.stock) || 0), reason: 'Variant stock update', by: 'Admin', date: todayISO() });
      }
    });
    const newSum = variantDraft.reduce((s: number, v: any) => s + (Number(v.stock) || 0), 0);
    const parent = products.find((x: any) => x.id === variantTarget.id);
    const st = newSum <= 0 ? 'Out of Stock' : newSum <= (parent?.reorderPoint ?? 5) ? 'Low Stock' : 'In Stock';
    const cleaned = variantDraft.map(v => ({ ...v, label: String(v.label || '').trim() })).filter((v: any) => v.label || v.sku);
    onProductsChange(products.map((x: any) => x.id === variantTarget.id ? { ...x, variants: cleaned, stock: newSum, status: st, updatedAt: nowTimeLocal() } : x));
    setVariantTarget(null);
    showToast(`Variants saved — total stock ${newSum}`, 'success');
  };

  const categories = Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)));
  const fallbackImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600';

  const enriched = products.map((p: any) => {
    const rp = p.reorderPoint ?? 5;
    const stock = p.stock ?? 0;
    const cost = p.cost ?? Math.round((p.price ?? 0) * 0.75);
    const status = stock <= 0 ? 'Out of Stock' : stock <= rp ? 'Low Stock' : 'In Stock';
    const price = p.price ?? 0;
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    const salePrice = p.promoPrice && p.promoPrice > 0 ? p.promoPrice : price - (price * (p.discount ?? 0)) / 100;
    const exp = effectiveExpiry(p, batches);
    return { ...p, rp, cost, status, margin, salePrice, exp };
  });

  const lowStock = enriched.filter((p: any) => p.status === 'Low Stock');
  const outOfStock = enriched.filter((p: any) => p.status === 'Out of Stock');
  const reorderList = enriched.filter((p: any) => p.status !== 'In Stock');
  const inventoryValue = enriched.reduce((s: number, p: any) => s + (p.stock * p.cost), 0);
  const expirySoon = enriched.filter((p: any) => (p.stock ?? 0) > 0 && p.exp.state === 'soon');
  const expiryExpired = enriched.filter((p: any) => p.exp.state === 'expired');
  const pendingPos = pos.filter((p: PurchaseOrder) => p.status === 'Pending').length;

  const filtered = enriched
    .filter((p: any) => {
      const q = search.toLowerCase();
      const okSearch = !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q);
      const okCat = catFilter === 'All' || p.category === catFilter;
      const okStatus = statusFilter === 'All' || p.status === statusFilter;
      return okSearch && okCat && okStatus;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'price') return (b.price ?? 0) - (a.price ?? 0);
      if (sortBy === 'stock') return (a.stock ?? 0) - (b.stock ?? 0);
      if (sortBy === 'margin') return (b.margin ?? 0) - (a.margin ?? 0);
      if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
      return (a.name || '').localeCompare(b.name || '');
    });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const logEntry = (e: Omit<LedgerEntry, 'id' | 'time'>) => {
    setLedger(prev => [{ id: 'LED-' + Math.floor(100 + Math.random() * 900), time: nowTimeLocal(), ...e }, ...prev]);
  };

  const notifyStock = (name: string, stock: number, rp: number) => {
    if (onAddNotification && stock <= rp) {
      onAddNotification({ title: 'Low stock alert', message: `"${name}" stock fell to ${stock} — reorder point is ${rp}.`, type: 'system' });
    }
  };

  const saveProduct = () => {
    if (!form.name.trim()) { showToast('Product name is required', 'info'); return; }
    const price = Number(form.price) || 0;
    if (price <= 0) { showToast('Enter a valid selling price', 'info'); return; }
    pushUndo(editing ? 'Edit product' : 'Add product');
    const product: any = {
      id: editing ? editing.id : 'PROD-' + (100 + products.length + 1),
      name: form.name.trim(),
      category: form.category.trim() || 'Uncategorized',
      stock: Number(form.stock) || 0,
      price,
      cost: Number(form.cost) > 0 ? Number(form.cost) : undefined,
      vat: Number(form.vat) || 0,
      discount: Number(form.discount) || 0,
      promoPrice: Number(form.promoPrice) || 0,
      supplier: form.supplier.trim() || '—',
      supplierContact: form.supplierContact.trim() || undefined,
      reorderPoint: Number(form.reorderPoint) >= 0 ? Number(form.reorderPoint) : 5,
      sku: form.sku.trim() || undefined,
      unit: form.unit.trim() || 'pcs',
      image: form.image.trim() || fallbackImg,
      expiry: form.expiry || undefined,
      description: form.description.trim() || undefined,
      tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      video: form.video.trim() || undefined,
      gallery: form.gallery.split(',').map((s: string) => s.trim()).filter(Boolean),
      status: (Number(form.stock) || 0) <= 0 ? 'Out of Stock' : (Number(form.stock) || 0) <= (Number(form.reorderPoint) || 5) ? 'Low Stock' : 'In Stock',
      updatedAt: nowTimeLocal()
    };
    if (editing) {
      const old = products.find((x: any) => x.id === editing.id);
      const delta = (Number(form.stock) || 0) - (old?.stock ?? 0);
      if (delta !== 0) logEntry({ productId: product.id, productName: product.name, type: 'Adjust', qty: delta, reason: 'Stock edited', by: 'Admin', date: todayISO() });
      onProductsChange(products.map((x: any) => x.id === editing.id ? product : x));
      showToast(`"${product.name}" updated`, 'success');
    } else {
      onProductsChange([product, ...products]);
      logEntry({ productId: product.id, productName: product.name, type: 'Add', qty: Number(form.stock) || 0, reason: 'New product added', by: 'Admin', date: todayISO() });
      showToast(`"${product.name}" added to catalog`, 'success');
    }
    notifyStock(product.name, product.stock, product.reorderPoint);
    setFormOpen(false); setEditing(null); setForm(emptyForm());
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name || '', category: p.category || '', sku: p.sku || '', unit: p.unit || 'pcs', stock: p.stock ?? 0, cost: p.cost ?? 0, price: p.price ?? 0, vat: p.vat ?? 0, discount: p.discount ?? 0, promoPrice: p.promoPrice ?? 0, supplier: p.supplier || '', supplierContact: p.supplierContact || '', reorderPoint: p.reorderPoint ?? 5, image: p.image || '', expiry: p.expiry || '', description: p.description || '', tags: (p.tags || []).join(', '), video: p.video || '', gallery: (p.gallery || []).join(', ') });
    setFormOpen(true);
  };

  const deleteProduct = () => {
    const p = products.find((x: any) => x.id === deleteId);
    if (!p) return;
    pushUndo('Delete product');
    onProductsChange(products.filter((x: any) => x.id !== deleteId));
    logEntry({ productId: p.id, productName: p.name, type: 'Remove', qty: 0, reason: 'Removed from catalog', by: 'Admin', date: todayISO() });
    showToast(`"${p.name}" removed`, 'info');
    setDeleteId(null);
  };

  const setType = (t: string) => {
    setAdjust(a => {
      if (!a) return a;
      const isPreset = !a.reason.trim() || Object.values(typePresets).includes(a.reason.trim());
      return { ...a, type: t, reason: isPreset ? typePresets[t] : a.reason };
    });
  };

  const applyAdjust = () => {
    if (!adjust) return;
    const mag = Math.abs(Number(adjust.delta) || 0);
    if (mag === 0) { showToast('Enter a non-zero quantity', 'info'); return; }
    pushUndo('Stock movement');
    const positive = adjust.type === 'Restock' || adjust.type === 'Return';
    const signed = positive ? mag : -mag;
    onProductsChange(products.map((x: any) => {
      if (x.id !== adjust.id) return x;
      const stock = Math.max(0, (x.stock ?? 0) + signed);
      const rp = x.reorderPoint ?? 5;
      const st = stock <= 0 ? 'Out of Stock' : stock <= rp ? 'Low Stock' : 'In Stock';
      return { ...x, stock, status: st, updatedAt: nowTimeLocal() };
    }));
    const p = products.find((x: any) => x.id === adjust.id);
    const reason = adjust.reason.trim() || typePresets[adjust.type] || 'Manual adjustment';
    logEntry({ productId: adjust.id, productName: adjust.name, type: adjust.type, qty: signed, reason, by: 'Admin', date: todayISO() });
    if (adjust.type === 'Restock' && adjust.batch.trim() && adjust.expiry) {
      setBatches(prev => [{ id: 'BATCH-' + Math.floor(1000 + Math.random() * 9000), productId: adjust.id, productName: adjust.name, batchCode: adjust.batch.trim(), expiry: adjust.expiry, qty: mag, receivedAt: nowTimeLocal(), supplier: p?.supplier || '—' }, ...prev]);
    }
    notifyStock(adjust.name, Math.max(0, (p?.stock ?? 0) + signed), p?.reorderPoint ?? 5);
    showToast(`${adjust.type} — stock ${positive ? 'increased' : 'decreased'} by ${mag}`, 'success');
    setAdjust(null);
  };

  const createOrder = (p: any) => {
    pushUndo('Create purchase order');
    const suggested = Math.max(p.rp * 2 - (p.stock ?? 0), 10);
    const unitCost = p.cost || Math.round((p.price || 0) * 0.75);
    const po: PurchaseOrder = {
      id: 'PO-' + Math.floor(100 + Math.random() * 900),
      poNumber: poNumber(),
      supplier: p.supplier || '—',
      supplierContact: '',
      items: [{ productId: p.id, name: p.name, qty: suggested, unitCost, batchCode: '', expiry: addDays(todayISO(), 30) }],
      total: suggested * unitCost,
      status: 'Pending',
      createdAt: nowTimeLocal(),
      notes: 'Auto-generated from the reorder plan'
    };
    setPos(prev => [po, ...prev]);
    showToast(`PO ${po.poNumber} created for "${p.name}"`, 'success');
    setTab('pos');
  };

  const exportCSV = () => downloadBlob(`products-${todayISO()}.csv`, encodeCSV(products));

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result || ''));
        if (rows.length === 0) { showToast('Empty CSV file', 'info'); return; }
        const header = rows[0].map(h => h.trim().toLowerCase());
        const isHeader = header[0] === 'name';
        const dataRows = isHeader ? rows.slice(1) : rows;
        const idx = (name: string) => {
          const i = header.indexOf(name);
          return isHeader ? i : CSV_ORDER.indexOf(name);
        };
        const existingKeys = new Set(products.map((x: any) => (x.sku || x.id || '').toLowerCase()));
        const added: any[] = [];
        dataRows.forEach((r: string[]) => {
          const name = (r[idx('name')] || '').trim();
          if (!name) return;
          const sku = (r[idx('sku')] || '').trim();
          if (sku) {
            if (existingKeys.has(sku.toLowerCase())) return;
          } else {
            const key = name.toLowerCase();
            if (existingKeys.has(key) || added.some(n => ((n.sku || '') || n.name).toLowerCase() === key)) return;
          }
          const num = (v: string) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
          const stock = num(r[idx('stock')]);
          const rp = num(r[idx('reorderPoint')]) || 5;
          const item: any = {
            id: 'PROD-' + Math.floor(100 + products.length + added.length + Math.random() * 900),
            name,
            category: (r[idx('category')] || '').trim() || 'Uncategorized',
            sku: sku || undefined,
            unit: (r[idx('unit')] || '').trim() || 'pcs',
            stock,
            price: num(r[idx('price')]),
            cost: num(r[idx('cost')]) > 0 ? num(r[idx('cost')]) : undefined,
            vat: num(r[idx('vat')]),
            discount: num(r[idx('discount')]),
            promoPrice: num(r[idx('promoPrice')]),
            supplier: (r[idx('supplier')] || '').trim() || '—',
            supplierContact: (r[idx('supplierContact')] || '').trim() || '',
            reorderPoint: rp,
            expiry: (r[idx('expiry')] || '').trim() || undefined,
            image: (r[idx('image')] || '').trim() || fallbackImg,
            status: stock <= 0 ? 'Out of Stock' : stock <= rp ? 'Low Stock' : 'In Stock',
            updatedAt: nowTimeLocal()
          };
          added.push(item);
        });
        if (added.length === 0) { showToast('No new products found in CSV (check header names / duplicate SKUs)', 'info'); return; }
        pushUndo('CSV import');
        onProductsChange([...added, ...products]);
        logEntry({ productId: 'CSV-IMPORT', productName: `${added.length} product(s) imported from CSV`, type: 'Add', qty: 0, reason: 'Bulk import', by: 'Admin', date: todayISO() });
        showToast(`Imported ${added.length} product(s)`, 'success');
      } catch (err) {
        showToast('CSV import failed — check the file format', 'info');
      }
    };
    reader.readAsText(file);
  };

  const typeChip = (t: string) => {
    if (adjust?.type !== t) return 'bg-brand-dark border border-brand-border text-gray-400';
    if (t === 'Waste' || t === 'Sale') return 'bg-red-500/20 border border-red-500/40 text-red-200';
    if (t === 'Return') return 'bg-blue-500/20 border border-blue-500/40 text-blue-200';
    return 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200';
  };

  const ledgerChip = (t: string) =>
    t === 'Add' || t === 'Restock' ? 'bg-emerald-500/10 text-emerald-400'
      : t === 'Return' ? 'bg-blue-500/10 text-blue-400'
        : t === 'Adjust' ? 'bg-teal-500/10 text-teal-400'
          : 'bg-red-500/10 text-red-400';

  const tabs = [
    { id: 'inventory' as const, label: 'Inventory', icon: Package, badge: 0 },
    { id: 'pos' as const, label: 'Purchase Orders', icon: ShoppingCart, badge: pendingPos },
    { id: 'reports' as const, label: 'Reports', icon: TrendingUp, badge: 0 },
    { id: 'warehouse' as const, label: 'Warehouse', icon: Warehouse, badge: 0 }
  ];

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Product Inventory</h3>
          <p className="text-xs text-gray-400">Add, track, procure, and forecast groceries catalog items</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={doUndo}
            disabled={undoStack.length === 0}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1.5 border ${undoStack.length ? 'bg-brand-dark border-brand-border text-gray-300 hover:text-white' : 'bg-brand-dark/30 border-brand-border/50 text-gray-600 cursor-not-allowed'}`}
            title={undoStack.length ? `Undo: ${undoStack[0].label} (${undoStack[0].time})` : 'Nothing to undo'}
          >
            <Undo2 className="w-4 h-4" />
            <span>Undo{undoStack.length ? `: ${undoStack[0].label}` : ''}</span>
          </button>
          <button
            onClick={() => { setEditing(null); setForm(emptyForm()); setFormOpen(true); }}
            className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-brand-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-t-lg text-[11px] font-bold uppercase tracking-wider border-b-2 -mb-px cursor-pointer transition-colors ${tab === t.id ? 'border-brand-orange text-brand-orange bg-brand-orange/5' : 'border-transparent text-gray-400 hover:text-white'}`}>
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
            {t.badge ? <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'pos' && (
        <PurchaseOrdersView
          pos={pos}
          onPosChange={setPos}
          products={products}
          onProductsChange={onProductsChange}
          addBatches={(bs) => setBatches(prev => [...bs, ...prev])}
          logEntry={logEntry}
          showToast={showToast}
          snapshot={pushUndo}
        />
      )}

      {tab === 'reports' && (
        <InventoryReportsView products={products} ledger={ledger} batches={batches} />
      )}

      {tab === 'warehouse' && (
        <StoreOpsView
          products={products}
          onProductsChange={onProductsChange}
          logEntry={logEntry}
          showToast={showToast}
          snapshot={pushUndo}
        />
      )}

      {tab === 'inventory' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Products</span>
              <div className="text-2xl font-black text-white mt-1 flex items-center space-x-2"><Package className="w-4 h-4 text-brand-orange" /><span>{products.length}</span></div>
            </div>
            <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Inventory Value (at cost)</span>
              <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center space-x-2"><Wallet className="w-4 h-4 text-emerald-400" /><span>{fmt(inventoryValue)}</span></div>
            </div>
            <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Low Stock Items</span>
              <div className="text-2xl font-black text-orange-400 mt-1 flex items-center space-x-2"><AlertTriangle className="w-4 h-4 text-orange-400" /><span>{lowStock.length}</span></div>
            </div>
            <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Out of Stock</span>
              <div className="text-2xl font-black text-red-400 mt-1 flex items-center space-x-2"><Box className="w-4 h-4 text-red-400" /><span>{outOfStock.length}</span></div>
            </div>
          </div>

          {/* Expiry alert */}
          {(expirySoon.length > 0 || expiryExpired.length > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
              <div className="flex items-center space-x-2 text-orange-300">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs font-bold">
                  {expiryExpired.length > 0 && <span>{expiryExpired.length} expired · </span>}
                  {expirySoon.length} item{expirySoon.length === 1 ? '' : 's'} expiring within 30 days — review the expiry forecast (FEFO).
                </span>
              </div>
              <button onClick={() => setTab('reports')} className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 text-orange-200 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-orange-500/30">View Forecast</button>
            </div>
          )}

          {/* Reorder alert */}
          {reorderList.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
              <div className="flex items-center space-x-2 text-amber-300">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-bold">{reorderList.length} item{reorderList.length > 1 ? 's' : ''} need reordering — stock is at or below the reorder point.</span>
              </div>
              <button onClick={() => setPanel(panel === 'reorder' ? 'none' : 'reorder')} className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-amber-500/30">
                {panel === 'reorder' ? 'Hide Reorder' : 'View Reorder Plan'}
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, ID…" className="w-full pl-8 pr-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-xs text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-2 py-2 bg-brand-dark border border-brand-border rounded-lg text-xs text-gray-300 outline-none focus:border-brand-orange">
              <option value="All">All Categories</option>
              {categories.map((c) => <option key={c as string} value={c as string}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-2 bg-brand-dark border border-brand-border rounded-lg text-xs text-gray-300 outline-none focus:border-brand-orange">
              <option value="All">All Status</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-2 py-2 bg-brand-dark border border-brand-border rounded-lg text-xs text-gray-300 outline-none focus:border-brand-orange">
              <option value="name">Sort: Name</option>
              <option value="price">Sort: Price</option>
              <option value="stock">Sort: Stock</option>
              <option value="margin">Sort: Margin</option>
              <option value="category">Sort: Category</option>
            </select>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button onClick={exportCSV} className="px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer border bg-brand-dark border-brand-border text-gray-400 hover:text-white" title="Download catalog as CSV"><Download className="w-3.5 h-3.5 inline-block mr-1" />Export CSV</button>
              <button onClick={() => importRef.current?.click()} className="px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer border bg-brand-dark border-brand-border text-gray-400 hover:text-white" title="Bulk import from CSV"><Upload className="w-3.5 h-3.5 inline-block mr-1" />Import CSV</button>
              <button onClick={() => setLabelSel(products)} className="px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer border bg-brand-dark border-brand-border text-gray-400 hover:text-white" title="Print shelf labels (barcode + QR)"><Barcode className="w-3.5 h-3.5 inline-block mr-1" />Labels</button>
              <button onClick={() => setPanel(panel === 'reorder' ? 'none' : 'reorder')} className={`px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer border ${panel === 'reorder' ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' : 'bg-brand-dark border-brand-border text-gray-400 hover:text-white'}`}><ShoppingCart className="w-3.5 h-3.5 inline-block mr-1" />Reorder</button>
              <button onClick={() => setPanel(panel === 'ledger' ? 'none' : 'ledger')} className={`px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer border ${panel === 'ledger' ? 'bg-teal-500/20 border-teal-500/40 text-teal-200' : 'bg-brand-dark border-brand-border text-gray-400 hover:text-white'}`}><History className="w-3.5 h-3.5 inline-block mr-1" />Stock Ledger</button>
            </div>
            <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImportFile} />
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2.5">
              <span className="text-[10px] font-bold text-blue-300">{selected.size} selected</span>
              <div className="flex items-center space-x-2">
                <button onClick={bulkExport} className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 text-blue-200 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-blue-500/30 flex items-center space-x-1"><Download className="w-3 h-3" /><span>Export</span></button>
                <button onClick={bulkLabels} className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 text-blue-200 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-blue-500/30 flex items-center space-x-1"><Barcode className="w-3 h-3" /><span>Labels</span></button>
                <button onClick={bulkDelete} className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-200 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-red-500/30 flex items-center space-x-1"><Trash2 className="w-3 h-3" /><span>Delete</span></button>
                <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:text-white">Clear</button>
              </div>
            </div>
          )}

          {/* Reorder panel */}
          {panel === 'reorder' && (
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Truck className="w-3.5 h-3.5 text-amber-400" /><span>Auto Reorder Plan</span></h4>
              {reorderList.length === 0 ? (
                <p className="text-xs text-gray-500">All items are above their reorder point — nothing needs ordering.</p>
              ) : (
                <div className="space-y-2">
                  {reorderList.map((p: any) => {
                    const suggested = Math.max(p.rp * 2 - (p.stock ?? 0), 10);
                    return (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-gray-500">Supplier: {p.supplier || '—'} · Reorder point {p.rp} · Current {p.stock}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono text-amber-300">Order {suggested} units</span>
                          <button onClick={() => openWa(p, suggested)} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-emerald-500/20 flex items-center space-x-1" title="Notify supplier on WhatsApp"><MessageCircle className="w-3 h-3" /><span>WhatsApp</span></button>
                          <button onClick={() => createOrder(p)} className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1"><CheckCircle2 className="w-3 h-3" /><span>Create Purchase Order</span></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ledger panel */}
          {panel === 'ledger' && (
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><ClipboardList className="w-3.5 h-3.5 text-teal-400" /><span>Stock Ledger — Audit Trail</span></h4>
              {ledger.length === 0 ? (
                <p className="text-xs text-gray-500">No stock movements recorded yet. Add, restock, or adjust a product to build the trail.</p>
              ) : (
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-xs min-w-[1000px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-brand-card text-gray-400 border-b border-brand-border">
                        <th className="py-2 px-3 font-bold text-[10px] uppercase">Time</th>
                        <th className="py-2 px-3 font-bold text-[10px] uppercase">Product</th>
                        <th className="py-2 px-3 font-bold text-[10px] uppercase">Type</th>
                        <th className="py-2 px-3 font-bold text-[10px] uppercase">Qty Change</th>
                        <th className="py-2 px-3 font-bold text-[10px] uppercase">Reason</th>
                        <th className="py-2 px-3 font-bold text-[10px] uppercase">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40">
                      {ledger.slice(0, 60).map((e: LedgerEntry) => (
                        <tr key={e.id} className="hover:bg-brand-dark/10">
                          <td className="py-2 px-3 font-mono text-gray-500">{e.time}</td>
                          <td className="py-2 px-3 font-bold text-white">{e.productName}</td>
                          <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${ledgerChip(e.type)}`}>{e.type}</span></td>
                          <td className={`py-2 px-3 font-mono font-bold ${e.qty >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{e.qty >= 0 ? '+' : ''}{e.qty}</td>
                          <td className="py-2 px-3 text-gray-400">{e.reason}</td>
                          <td className="py-2 px-3 text-gray-500">{e.by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-brand-dark/40 text-gray-400 border-b border-brand-border">
                    <th className="py-3 px-4 w-8"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-brand-orange cursor-pointer" title="Select all (current page)" /></th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Product</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Category</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Stock</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Expires</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">MRP</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Cost</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Margin</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Sale Price</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Status</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase sticky right-0 bg-brand-card shadow-[-8px_0_12px_rgba(0,0,0,0.25)] z-10">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {pageItems.length === 0 && (
                    <tr><td colSpan={11} className="py-8 text-center text-gray-500">No products match your filters.</td></tr>
                  )}
                  {pageItems.map((p: any) => (
                    <tr key={p.id} className={`hover:bg-brand-dark/10 transition-colors ${selected.has(p.id) ? 'bg-blue-500/5' : ''}`}>
                      <td className="py-3 px-4"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="accent-brand-orange cursor-pointer" /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <img src={p.image || fallbackImg} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-brand-border" />
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{p.name}</p>
                            <p className="font-mono text-[9px] text-gray-500">{p.id}{p.sku ? ' · ' + p.sku : ''}{p.variants?.length ? <span className="text-brand-orange font-bold"> · {p.variants.length} var</span> : ''}</p>
                            {(p.gallery?.length || p.video || p.description || p.tags?.length) && (
                              <p className="text-[9px] text-gray-500 mt-0.5 flex items-center space-x-1">
                                {p.gallery?.length ? <span className="px-1 bg-indigo-500/10 text-indigo-300 rounded">{p.gallery.length} photos</span> : null}
                                {p.video ? <span className="px-1 bg-red-500/10 text-red-300 rounded">video</span> : null}
                                {p.tags?.length ? <span className="px-1 bg-teal-500/10 text-teal-300 rounded">{p.tags.length} tags</span> : null}
                                {p.description ? <span className="px-1 bg-gray-600/20 text-gray-400 rounded">desc</span> : null}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-semibold">{p.category}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-gray-300">{p.stock} {p.unit || 'pcs'}</span>
                        <button onClick={() => setAdjust({ id: p.id, name: p.name, delta: '', reason: '', type: 'Restock', batch: '', expiry: addDays(todayISO(), 30) })} className="ml-2 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded text-[9px] font-bold cursor-pointer hover:bg-blue-500/20" title="Adjust stock / log movement">±</button>
                      </td>
                      <td className="py-3 px-4">
                        {p.exp.state === 'none' ? <span className="text-gray-600">—</span> : (
                          <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${p.exp.state === 'expired' ? 'bg-red-500/10 text-red-400' : p.exp.state === 'soon' ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {p.exp.state === 'expired' ? 'EXPIRED ' : ''}{p.exp.expiry}{p.exp.days !== null ? <span className="opacity-70"> · {p.exp.days}d</span> : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-brand-orange">{fmt(p.price)}</td>
                      <td className="py-3 px-4 font-mono text-gray-400">{p.cost ? fmt(p.cost) : '—'}</td>
                      <td className="py-3 px-4 font-mono font-bold" title={`VAT ${p.vat ?? 0}%`}>{p.margin >= 0 ? p.margin.toFixed(1) + '%' : '—'}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{fmt(p.salePrice)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${p.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'Low Stock' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'}`}>{p.status}</span>
                      </td>
                      <td className="py-3 px-4 sticky right-0 bg-brand-card shadow-[-8px_0_12px_rgba(0,0,0,0.25)]">
                        <div className="flex items-center space-x-1.5">
                          <button onClick={() => openWa(p, Math.max(p.rp * 2 - (p.stock ?? 0), 10))} className="px-2 py-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-500/25 flex items-center space-x-1" title="Notify supplier on WhatsApp"><MessageCircle className="w-3.5 h-3.5" /><span className="text-[8px] font-black uppercase">WA</span></button>
                          <button onClick={() => openVariants(p)} className="px-2 py-1.5 bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-500/25 flex items-center space-x-1" title="Manage variants"><Boxes className="w-3.5 h-3.5" /><span className="text-[8px] font-black uppercase">Var</span></button>
                          <button onClick={() => setLabelSel([p])} className="px-2 py-1.5 bg-slate-600/20 border border-slate-500/40 text-slate-300 rounded-lg cursor-pointer hover:bg-slate-600/30 flex items-center space-x-1" title="Print label"><Barcode className="w-3.5 h-3.5" /><span className="text-[8px] font-black uppercase">Label</span></button>
                          <button onClick={() => openEdit(p)} className="px-2 py-1.5 bg-sky-500/15 border border-sky-500/40 text-sky-300 rounded-lg cursor-pointer hover:bg-sky-500/25 flex items-center space-x-1" title="Edit"><Pencil className="w-3.5 h-3.5" /><span className="text-[8px] font-black uppercase">Edit</span></button>
                          <button onClick={() => setDeleteId(p.id)} className="px-2 py-1.5 bg-red-500/15 border border-red-500/40 text-red-300 rounded-lg cursor-pointer hover:bg-red-500/25 flex items-center space-x-1" title="Delete"><Trash2 className="w-3.5 h-3.5" /><span className="text-[8px] font-black uppercase">Del</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-brand-border/40">
              <span className="text-[10px] text-gray-500">{filtered.length} item{filtered.length === 1 ? '' : 's'} · page {safePage} of {pageCount} ({PAGE_SIZE} per page)</span>
              <div className="flex items-center space-x-1.5">
                <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} className="px-3 py-1.5 bg-brand-dark border border-brand-border rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white">Prev</button>
                {Array.from({ length: pageCount }).slice(0, 7).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border ${safePage === i + 1 ? 'bg-brand-orange border-brand-orange text-white' : 'bg-brand-dark border-brand-border text-gray-400 hover:text-white'}`}>{i + 1}</button>
                ))}
                <button onClick={() => setPage(Math.min(pageCount, safePage + 1))} disabled={safePage >= pageCount} className="px-3 py-1.5 bg-brand-dark border border-brand-border rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white">Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2"><Tag className="w-4 h-4 text-brand-orange" /><span>{editing ? 'Edit Product' : 'Add Product'}</span></h4>
              <button onClick={() => { setFormOpen(false); setEditing(null); }} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Product Name *</label>
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Fresh Apples (Premium)" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Category</label>
                <input list="cat-options" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <datalist id="cat-options">{categories.map((c) => <option key={c as string} value={c as string} />)}</datalist>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Unit</label>
                <select value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none">
                  <option>pcs</option><option>kg</option><option>g</option><option>L</option><option>pack</option><option>box</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">SKU / Barcode</label>
                <input value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. SKU-0001" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Expiry Date</label>
                <input type="date" value={form.expiry} onChange={(e) => setForm(f => ({ ...f, expiry: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Supplier</label>
                <input value={form.supplier} onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="e.g. FreshMart Wholesale" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Supplier Contact</label>
                <input value={form.supplierContact} onChange={(e) => setForm(f => ({ ...f, supplierContact: e.target.value }))} placeholder="phone / email" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Opening Stock</label>
                <input type="number" min={0} value={form.stock} onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Reorder Point</label>
                <input type="number" min={0} value={form.reorderPoint} onChange={(e) => setForm(f => ({ ...f, reorderPoint: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Cost Price (৳)</label>
                <input type="number" min={0} value={form.cost} onChange={(e) => setForm(f => ({ ...f, cost: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">MRP / Selling Price (৳) *</label>
                <input type="number" min={0} value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Discount (%)</label>
                <input type="number" min={0} max={100} value={form.discount} onChange={(e) => setForm(f => ({ ...f, discount: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Promo Price (৳, optional)</label>
                <input type="number" min={0} value={form.promoPrice} onChange={(e) => setForm(f => ({ ...f, promoPrice: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">VAT (%)</label>
                <input type="number" min={0} max={100} value={form.vat} onChange={(e) => setForm(f => ({ ...f, vat: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Image URL</label>
                <input value={form.image} onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))} placeholder="https://…" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Video URL (optional)</label>
                <input value={form.video} onChange={(e) => setForm(f => ({ ...f, video: e.target.value }))} placeholder="https://…/product.mp4" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Product description — origin, storage, usage, nutritional notes…" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600 resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Tags (comma separated)</label>
                <input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="organic, local, fresh, bestseller" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Gallery URLs (comma separated — extra photos)</label>
                <input value={form.gallery} onChange={(e) => setForm(f => ({ ...f, gallery: e.target.value }))} placeholder="https://…/1.jpg, https://…/2.jpg" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
            </div>
            {Number(form.price) > 0 && (
              <div className="grid grid-cols-3 gap-2 bg-brand-dark/40 border border-brand-border rounded-lg p-3 text-center">
                <div><p className="text-[9px] text-gray-500 uppercase">Est. Margin</p><p className={`text-sm font-black ${Number(form.price) > (Number(form.cost) || 0) ? 'text-emerald-400' : 'text-red-400'}`}>{Number(form.price) > 0 ? ((((Number(form.price) - (Number(form.cost) || 0)) / Number(form.price)) * 100).toFixed(1)) + '%' : '—'}</p></div>
                <div><p className="text-[9px] text-gray-500 uppercase">After Discount</p><p className="text-sm font-black text-brand-orange">{fmt(Number(form.price) - (Number(form.price) * (Number(form.discount) || 0)) / 100)}</p></div>
                <div><p className="text-[9px] text-gray-500 uppercase">+VAT</p><p className="text-sm font-black text-gray-300">{fmt(Number(form.price) + (Number(form.price) * (Number(form.vat) || 0)) / 100)}</p></div>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <button onClick={() => { setFormOpen(false); setEditing(null); }} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-600/30">Cancel</button>
              <button onClick={saveProduct} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><Save className="w-3.5 h-3.5" /><span>{editing ? 'Save Changes' : 'Add to Catalog'}</span></button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-xl p-5 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm font-bold text-white">Remove this product?</p>
            <p className="text-xs text-gray-400">"{products.find((x: any) => x.id === deleteId)?.name}" will be removed from the active catalog. This is recorded in the stock ledger.</p>
            <div className="flex justify-center space-x-2 pt-1">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer">Cancel</button>
              <button onClick={deleteProduct} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><Trash2 className="w-3.5 h-3.5" /><span>Delete</span></button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust stock */}
      {adjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Stock Movement — {adjust.name}</h4>
              <button onClick={() => setAdjust(null)} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['Restock', 'Sale', 'Waste', 'Return'].map(t => (
                  <button key={t} onClick={() => setType(t)} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${typeChip(t)}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setAdjust(a => a ? { ...a, delta: String(Math.max(0, (Number(a.delta) || 0) - 1)) } : a)} className="px-3 py-2 bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg cursor-pointer"><Minus className="w-4 h-4" /></button>
              <input type="number" min={0} value={adjust.delta} onChange={(e) => setAdjust(a => a ? { ...a, delta: e.target.value } : a)} placeholder="qty" className="flex-1 px-3 py-2 bg-brand-dark text-center text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <button onClick={() => setAdjust(a => a ? { ...a, delta: String((Number(a.delta) || 0) + 1) } : a)} className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded-lg cursor-pointer"><Plus className="w-4 h-4" /></button>
            </div>
            <p className="text-[10px] text-gray-500">
              {adjust.type === 'Restock' || adjust.type === 'Return'
                ? 'This will ADD stock to the product.'
                : 'This will REMOVE stock from the product.'}
            </p>
            {adjust.type === 'Restock' && (
              <div className="grid grid-cols-2 gap-2">
                <input value={adjust.batch} onChange={(e) => setAdjust(a => a ? { ...a, batch: e.target.value } : a)} placeholder="Batch code (e.g. B-2301)" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
                <input type="date" value={adjust.expiry} onChange={(e) => setAdjust(a => a ? { ...a, expiry: e.target.value } : a)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
            )}
            <input value={adjust.reason} onChange={(e) => setAdjust(a => a ? { ...a, reason: e.target.value } : a)} placeholder="Reason (optional — a default is set per type)" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setAdjust(null)} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer">Cancel</button>
              <button onClick={applyAdjust} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Labels */}
      {labelSel && <InventoryLabelModal products={labelSel} onClose={() => setLabelSel(null)} />}

      {/* WhatsApp supplier */}
      {wa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2"><MessageCircle className="w-4 h-4 text-emerald-400" /><span>Notify Supplier — {wa.p.name}</span></h4>
              <button onClick={() => setWa(null)} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2"><span className="text-gray-500 uppercase text-[9px] block">Supplier</span><span className="text-white font-bold">{wa.p.supplier || '—'}</span></div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2"><span className="text-gray-500 uppercase text-[9px] block">Stock / Reorder Pt</span><span className="text-white font-bold font-mono">{wa.p.stock} / {wa.p.reorderPoint ?? 5}</span></div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Supplier WhatsApp Number</label>
              <input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="e.g. 8801712345678" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-emerald-400 placeholder:text-gray-600" />
              <p className="text-[9px] text-gray-600 mt-1">Auto-filled from the product's supplier contact. Numbers with at least 10 digits open wa.me directly.</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Message</label>
              <textarea value={waMsgText} onChange={(e) => setWaMsgText(e.target.value)} rows={6} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-emerald-400 resize-none" />
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setWa(null)} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-600/30">Cancel</button>
              <button onClick={sendWa} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><MessageCircle className="w-3.5 h-3.5" /><span>Open WhatsApp</span></button>
            </div>
          </div>
        </div>
      )}

      {/* Variants */}
      {variantTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-card border border-brand-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2"><Boxes className="w-4 h-4 text-indigo-400" /><span>Variants — {variantTarget.name}</span></h4>
              <button onClick={() => setVariantTarget(null)} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[10px] text-gray-500">Sub-SKUs (sizes / weights). Parent stock = sum of all variant stock.</p>
            <div className="space-y-2">
              {variantDraft.map((v: any, i: number) => (
                <div key={v.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center bg-brand-dark/40 border border-brand-border rounded-lg p-2">
                  <input value={v.label} onChange={(e) => patchVariant(i, 'label', e.target.value)} placeholder="Label (500g)" className="col-span-2 px-2 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
                  <input value={v.sku} onChange={(e) => patchVariant(i, 'sku', e.target.value)} placeholder="SKU" className="px-2 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
                  <input type="number" min={0} value={v.stock} onChange={(e) => patchVariant(i, 'stock', e.target.value)} placeholder="Stock" className="px-2 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
                  <input type="number" min={0} value={v.price} onChange={(e) => patchVariant(i, 'price', e.target.value)} placeholder="Price" className="px-2 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
                  <button onClick={() => removeVariant(v.id)} className="p-2 bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg cursor-pointer hover:bg-red-500/20" title="Remove variant"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button onClick={addVariant} className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-indigo-500/20 flex items-center space-x-1"><Plus className="w-3.5 h-3.5" /><span>Add Variant</span></button>
              <span className="text-[10px] text-gray-400">Total stock: <span className="text-white font-black font-mono">{variantDraft.reduce((s: number, v: any) => s + (Number(v.stock) || 0), 0)}</span></span>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setVariantTarget(null)} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-600/30">Cancel</button>
              <button onClick={saveVariants} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><Save className="w-3.5 h-3.5" /><span>Save Variants</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

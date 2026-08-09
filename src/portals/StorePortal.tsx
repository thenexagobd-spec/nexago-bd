/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Site — fresh store portal: dashboard, product catalog, inventory,
 * coupons and the public storefront link. Reads the same localStorage keys as
 * the admin catalog.
 */
import React, { useState } from 'react';
import { LayoutDashboard, Box, ClipboardList, Ticket, Globe, ExternalLink, Package, TrendingUp, AlertTriangle, Plus, Search } from 'lucide-react';
import PortalShell from './PortalShell';
import { useProducts, useOrders, useStoreProfile, bdt, statusBadge } from './portalUtils';

export default function StorePortal() {
  const [products, setProducts] = useProducts();
  const [orders, setOrders] = useOrders();
  const [profile] = useStoreProfile();
  const [tab, setTab] = useState('dashboard');
  const [coupons, setCoupons] = useState<{ id: string; code: string; discount: number; used: number }[]>(
    JSON.parse(localStorage.getItem('sd_coupons') || '[]').length ? JSON.parse(localStorage.getItem('sd_coupons') || '[]') : [
      { id: 'C-1', code: 'WELCOME10', discount: 10, used: 342 },
      { id: 'C-2', code: 'FRIDAY15', discount: 15, used: 128 },
      { id: 'C-3', code: 'FREESHIP', discount: 0, used: 95 },
    ]
  );
  const saveCoupons = (next: typeof coupons) => { setCoupons(next); localStorage.setItem('sd_coupons', JSON.stringify(next)); };
  const [search, setSearch] = useState('');
  const [newProd, setNewProd] = useState({ name: '', price: '', stock: '' });

  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10);
  const outStock = products.filter(p => p.stock <= 0);
  const storefrontUrl = `${window.location.origin}/customer.html`;
  const revenue = orders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);
  const todayOrders = orders.filter(o => (o.date || '').toLowerCase().includes(new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase())).length || orders.length;

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Box, badge: outStock.length },
    { id: 'inventory', label: 'Inventory', icon: ClipboardList, badge: lowStock.length },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'storefront', label: 'Storefront', icon: Globe },
  ];

  const goBack = () => { window.open(`${window.location.origin}/index.html`, '_self'); };

  const addProduct = () => {
    if (!newProd.name || !newProd.price) return;
    const p = {
      id: `PROD-${Date.now().toString().slice(-4)}`,
      name: newProd.name,
      category: 'General',
      price: Number(newProd.price) || 0,
      stock: Number(newProd.stock) || 0,
      status: Number(newProd.stock) <= 0 ? 'Out of Stock' : Number(newProd.stock) <= 10 ? 'Low Stock' : 'In Stock',
      image: '',
    };
    setProducts(prev => [p, ...prev]);
    setNewProd({ name: '', price: '', stock: '' });
  };

  const setStock = (id: string, delta: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const stock = Math.max(0, (p.stock || 0) + delta);
      return { ...p, stock, status: stock <= 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'In Stock' };
    }));
  };

  const filtered = products.filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <PortalShell role="Store Site" tagline={profile.storeName} nav={nav} active={tab} onNav={setTab} onBack={goBack}>
      {tab === 'dashboard' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-500/15 via-[#101d30] to-[#101d30] border border-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-xl">SM</div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">{profile.storeSub || 'NexaGo Store'}</p>
                <p className="text-lg font-black text-white">{profile.storeName || 'Smart Shop'}</p>
                <p className="text-[10px] text-gray-400">WhatsApp orders: {profile.whatsapp || '—'}</p>
              </div>
            </div>
            <a href={storefrontUrl} target="_blank" rel="noreferrer" className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /><span>Open Storefront</span>
            </a>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Products', value: products.length.toString(), sub: `${outStock.length} out of stock`, color: 'text-brand-orange' },
              { label: 'Low Stock', value: lowStock.length.toString(), sub: 'restock soon', color: 'text-amber-400' },
              { label: 'Orders Today', value: todayOrders.toString(), sub: `${orders.length} total`, color: 'text-emerald-400' },
              { label: 'Revenue (Done)', value: bdt(revenue), sub: 'completed orders', color: 'text-sky-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-2xl font-black mt-1.5 ${k.color}`}>{k.value}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><TrendingUp className="w-3.5 h-3.5 text-brand-orange" /><span>Top Products</span></p>
              <div className="space-y-2">
                {products.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5">
                    <div className="min-w-0 flex items-center space-x-2.5">
                      {p.image ? <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-[#132238] flex items-center justify-center text-[9px] text-gray-400"><Package className="w-3.5 h-3.5" /></div>}
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-200 font-bold truncate">{p.name}</p>
                        <p className="text-[8px] text-gray-500">{p.category}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black text-white">{bdt(p.price)}</p>
                      <p className={`text-[8px] font-black ${p.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{p.stock > 0 ? `${p.stock} in stock` : 'Out'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /><span>Stock Alerts</span></p>
              {lowStock.concat(outStock).length === 0 ? <p className="text-[10px] text-gray-500 py-6 text-center">All stock levels are healthy ✓</p> : (
                <div className="space-y-2">
                  {lowStock.concat(outStock).map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px]">
                      <p className="text-gray-200 font-bold truncate">{p.name}</p>
                      <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${p.stock <= 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>{p.stock <= 0 ? 'Out' : `${p.stock} left`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><Box className="w-4 h-4 text-brand-orange" /><span>Product Catalog</span></h3>
              <p className="text-[10px] text-gray-400">Add & manage products — they appear on the live storefront.</p>
            </div>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <input value={newProd.name} onChange={e => setNewProd(prev => ({ ...prev, name: e.target.value }))} placeholder="Product name" className="flex-1 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
              <input value={newProd.price} onChange={e => setNewProd(prev => ({ ...prev, price: e.target.value }))} placeholder="Price ৳" type="number" className="w-24 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
              <input value={newProd.stock} onChange={e => setNewProd(prev => ({ ...prev, stock: e.target.value }))} placeholder="Stock" type="number" className="w-20 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 text-[10px] outline-none focus:border-brand-orange" />
              <button onClick={addProduct} className="flex items-center space-x-1.5 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-[10px] font-black transition-colors"><Plus className="w-3.5 h-3.5" /><span>Add</span></button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="w-full bg-[#101d30] border border-[#1e3050] rounded-xl pl-9 pr-3 py-2.5 text-[10px] outline-none focus:border-brand-orange" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
                <div className="h-28 bg-[#132238] flex items-center justify-center">
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-gray-600" />}
                </div>
                <div className="p-3">
                  <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                  <p className="text-[8px] text-gray-500">{p.category} · {p.id}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[12px] font-black text-brand-orange">{bdt(p.price)}</span>
                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(p.status)}`}>{p.status}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[9px] text-gray-400">Stock: <b className="text-white">{p.stock}</b></span>
                    <div className="flex items-center space-x-1.5">
                      <button onClick={() => setStock(p.id, -1)} className="w-6 h-6 rounded-lg bg-[#0a1322] border border-[#1e3050] text-gray-300 hover:border-red-500/40 hover:text-red-400 text-[11px]">−</button>
                      <button onClick={() => setStock(p.id, 1)} className="w-6 h-6 rounded-lg bg-[#0a1322] border border-[#1e3050] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 text-[11px]">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><ClipboardList className="w-4 h-4 text-brand-orange" /><span>Inventory</span></h3>
            <p className="text-[10px] text-gray-400">Stock levels — low stock highlighted, adjust on the fly.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-[10px]">
              <thead><tr className="bg-[#0a1322] text-gray-400 text-[9px] uppercase tracking-wider"><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Price</th><th className="px-3 py-2.5">Stock</th><th className="px-3 py-2.5 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-[#1e3050]">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-[#132238] transition-colors">
                    <td className="px-3 py-2.5 font-bold text-gray-200 truncate max-w-[160px]">{p.name}</td>
                    <td className="px-3 py-2.5 text-gray-400">{p.category}</td>
                    <td className="px-3 py-2.5 font-mono text-brand-orange font-bold">{bdt(p.price)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-mono font-black ${p.stock <= 0 ? 'text-red-400' : p.stock <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>{p.stock}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button onClick={() => setStock(p.id, -5)} className="px-2 py-1 rounded-lg bg-[#0a1322] border border-[#1e3050] text-gray-300 hover:border-red-500/40 hover:text-red-400 text-[9px] font-black">−5</button>
                        <button onClick={() => setStock(p.id, 5)} className="px-2 py-1 rounded-lg bg-[#0a1322] border border-[#1e3050] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 text-[9px] font-black">+5</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'coupons' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Ticket className="w-4 h-4 text-brand-orange" /><span>Coupons & Offers</span></h3>
            <p className="text-[10px] text-gray-400">Create discount codes customers can use on the storefront.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map(c => (
              <div key={c.id} className="bg-[#101d30] border border-dashed border-brand-orange/40 rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute -right-3 top-0 bottom-0 w-6 border-l-2 border-dashed border-[#1e3050]" />
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{c.id}</p>
                <p className="text-lg font-black font-mono text-brand-orange mt-1">{c.code}</p>
                <p className="text-[10px] text-gray-300 mt-1">{c.discount > 0 ? `${c.discount}% off` : 'Free delivery'}</p>
                <p className="text-[8px] text-gray-500 mt-1">{c.used} uses</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'storefront' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Globe className="w-4 h-4 text-brand-orange" /><span>Live Storefront</span></h3>
            <p className="text-[10px] text-gray-400">Your public customer site — share this link with customers.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <input readOnly value={storefrontUrl} className="flex-1 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[10px] font-mono text-gray-300 select-all outline-none" />
              <button onClick={() => navigator.clipboard.writeText(storefrontUrl)} className="px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black transition-colors">Copy</button>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-[10px] text-gray-400">{profile.storeName || 'Smart Shop'} · {products.length} products live · WhatsApp ordering {profile.whatsapp ? 'on' : 'off'}</p>
              <a href={storefrontUrl} target="_blank" rel="noreferrer" className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-[10px] font-black transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /><span>Open Storefront</span>
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Products', value: products.length },
              { label: 'Low Stock', value: lowStock.length },
              { label: 'Orders Today', value: todayOrders },
            ].map(s => (
              <div key={s.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-black text-white mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalShell>
  );
}

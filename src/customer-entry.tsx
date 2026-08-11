/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Standalone public customer storefront entry (built as customer.html and
 * served at /store by the NexaGo relay). Uses the full CustomerStorefront UI
 * with live synced catalog + real order placement that posts back to the
 * cloud store so the admin can see customer orders.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CustomerStorefront } from './components/CustomerStorefront';
import { Order, Product } from './types';
import { makeOrderId } from './types';
import { useLiveDrivers } from './hooks/useLiveDrivers';
import './index.css';

const params = new URLSearchParams(window.location.search);
const KEY = params.get('key') || 'nexago-main';
const API_BASE = window.location.origin;

// Simulated live GPS riders — the customer "Track Delivery" screen follows
// the nearest online driver in real time (same engine as the admin Live Map).
const SEED_DRIVERS: any[] = [];
const SEED_STORES: any[] = [];
const SEED_PRODUCTS: Product[] = [];

function PublicCustomerApp() {
  const [stores, setStores] = useState<any[]>(SEED_STORES);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const CUST_ORDERS_KEY = 'nexago_customer_orders';
  const [orders, setOrders] = useState<Order[]>(() => {
    try { const raw = localStorage.getItem(CUST_ORDERS_KEY); if (raw) return JSON.parse(raw); } catch {}
    return [];
  });
  useEffect(() => { try { localStorage.setItem(CUST_ORDERS_KEY, JSON.stringify(orders)); } catch {} }, [orders]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const { liveDrivers } = useLiveDrivers(SEED_DRIVERS);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/storefront?key=${encodeURIComponent(KEY)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('storefront fetch failed'))))
      .then(d => {
        const realProducts = Array.isArray(d.products) ? d.products.filter((p: any) => !KEY.startsWith('STR-') || p.storeId === KEY) : [];
        setProducts(realProducts.map((p: any): Product => ({
            id: p.id,
            name: p.name,
            price: Number(p.promoPrice || p.price || 0),
            category: p.category || 'General',
            stock: Number(p.stock || 0),
            status: Number(p.stock || 0) <= 0 ? 'Out of Stock' : Number(p.stock || 0) <= 10 ? 'Low Stock' : 'In Stock',
            image: p.image || ''
          })));
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/state?key=${encodeURIComponent(KEY)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('state fetch failed'))))
      .then(d => {
        if (d && d.state && Array.isArray(d.state.stores)) {
          setStores(KEY.startsWith('STR-') ? d.state.stores.filter((s: any) => s.id === KEY) : d.state.stores);
        }
        if (d && Array.isArray(d.state && d.state.orders) && d.state.orders.length) setOrders(d.state.orders);
      })
      .catch(() => {});
  }, []);

  const postOrder = (order: Order) => {
    fetch(`${API_BASE}/api/order?key=${encodeURIComponent(KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    }).catch(() => {});
  };

  const handleAddOrder = (orderData: Omit<Order, 'id' | 'date'>) => {
    const id = makeOrderId();
    const newOrder: Order = {
      ...orderData,
      id,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      source: 'customer-app',
      placedAt: Date.now(),
      status: orderData.status || 'Pending'
    };
    setOrders(prev => [newOrder, ...prev]);
    postOrder(newOrder);
    // Mirror into the shared portal store so the Store / Store Admin / Driver sites
    // pick it up live (same keys the admin panel + portals read).
    try {
      const sharedKey = 'sd_orders_v2';
      const raw = localStorage.getItem(sharedKey);
      const existing = raw ? JSON.parse(raw) : [];
      localStorage.setItem(sharedKey, JSON.stringify([newOrder, ...existing]));
      const notifKey = 'sd_notifications';
      const nRaw = localStorage.getItem(notifKey);
      const notifs = nRaw ? JSON.parse(nRaw) : [];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(notifKey, JSON.stringify([
        { id: `NOTIF-${Date.now().toString().slice(-6)}`, title: '🛒 New Order For Store #' + id, message: `${newOrder.customerName} ordered from ${newOrder.storeName} (৳${(newOrder.amount || 0).toLocaleString()}) — accept to dispatch a rider.`, type: 'order', time, read: false, audience: 'store-admin', storeId: newOrder.storeName },
        { id: `NOTIF-${Date.now().toString().slice(-6)}-s`, title: '📢 Store Action Needed #' + id, message: `Accept order #${id} from ${newOrder.storeName} so a driver can be assigned.`, type: 'system', time, read: false, audience: 'staff' },
        { id: `NOTIF-${Date.now().toString().slice(-6)}-a`, title: '🛒 New Customer Order #' + id, message: `${newOrder.customerName} ordered from ${newOrder.storeName} (৳${(newOrder.amount || 0).toLocaleString()}) — waiting for store to accept.`, type: 'order', time, read: false, audience: 'all' },
        ...notifs
      ]));
    } catch { /* noop */ }
    showToast(`Order #${id} placed successfully — our team will confirm shortly!`, 'success');
  };

  const handleUpdateOrder = (order: Order) => {
    setOrders(prev => prev.map(o => (o.id === order.id ? order : o)));
    postOrder(order);
    showToast(`Order #${order.id} updated`, 'success');
  };

  const handleSilentUpdateOrder = (order: Order) => {
    setOrders(prev => prev.map(o => (o.id === order.id ? order : o)));
    postOrder(order);
  };

  return (
    <>
      <CustomerStorefront
        stores={stores}
        products={products}
        orders={orders}
        liveDrivers={liveDrivers}
        onAddOrder={handleAddOrder}
        onUpdateOrder={handleUpdateOrder}
        onSilentUpdateOrder={handleSilentUpdateOrder}
        onReturnToAdmin={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onLaunchMerchantStore={() => {}}
        onReport={() => showToast('Report submitted — our support team will review it', 'info')}
        showToast={showToast}
      />
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 text-white rounded-lg shadow-2xl text-xs font-semibold border-l-4 ${toast.type === 'success' ? 'bg-[#0f1c2e] border-emerald-500' : 'bg-[#0f1c2e] border-brand-orange'}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<PublicCustomerApp />);

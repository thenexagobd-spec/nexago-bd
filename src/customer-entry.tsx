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
import { useCloudSync } from './portals/portalUtils';
import './index.css';

const params = new URLSearchParams(window.location.search);
const KEY = params.get('key') || 'nexago-main';
const API_BASE = window.location.origin;

// Simulated live GPS riders — the customer "Track Delivery" screen follows
// the nearest online driver in real time (same engine as the admin Live Map).
const SEED_DRIVERS: any[] = [];
const SEED_STORES: any[] = [];
const SEED_PRODUCTS: Product[] = [];
const STARTER_SEED_KEY = 'nexago_customer_starter_seed_v4';

const starterStore = {
  id: 'STR-CUSTOMER-STARTER',
  adminId: 'SA-CUSTOMER-STARTER',
  name: 'NexaGo Starter Mart',
  address: 'Dhaka, Bangladesh',
  category: 'Grocery',
  status: 'active',
  rating: 0,
  orders: 0,
  deliveryFee: 60,
  deliveryTime: 'Real-time',
  pickup: { lat: 23.8103, lng: 90.4125 },
  createdAt: new Date().toISOString(),
};

const P = (id: string, name: string, category: string, unit: string, stock: number, price: number, image: string) => ({
  id: `PRD-BD-${id}`,
  storeId: starterStore.id,
  name,
  category,
  unit,
  stock,
  price,
  cost: Math.max(1, Math.round(price * 0.78)),
  status: stock > 0 ? 'In Stock' : 'Out of Stock',
  desc: 'Bangladesh customer catalog item - editable and deletable from admin inventory.',
  image,
  createdAt: new Date().toISOString(),
});

const IMG = {
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600',
  oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=600',
  dal: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&q=80&w=600',
  flour: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600',
  milk: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=600',
  egg: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=600',
  tea: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600',
  biryani: 'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&q=80&w=600',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
  medicine: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600',
  fruit: 'https://images.unsplash.com/photo-1619566636858-adf3ef4640b5?auto=format&fit=crop&q=80&w=600',
  veg: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600',
  fish: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600',
  meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600',
};

const starterProducts = [
  P('RICE-5KG', 'Miniket Rice 5kg', 'Grocery', 'bag', 35, 520, IMG.rice),
  P('NAZIR-RICE-5KG', 'Nazirshail Rice 5kg', 'Grocery', 'bag', 26, 610, IMG.rice),
  P('SOYBEAN-OIL-2L', 'Soybean Oil 2L', 'Grocery', 'bottle', 30, 375, IMG.oil),
  P('MUSTARD-OIL-500ML', 'Mustard Oil 500ml', 'Grocery', 'bottle', 24, 165, IMG.oil),
  P('MOSUR-DAL-1KG', 'Mosur Dal 1kg', 'Grocery', 'kg', 40, 145, IMG.dal),
  P('CHOLA-BOOT-1KG', 'Chola Boot 1kg', 'Grocery', 'kg', 28, 135, IMG.dal),
  P('ATTA-2KG', 'Fresh Atta 2kg', 'Grocery', 'pack', 38, 120, IMG.flour),
  P('SUGAR-1KG', 'White Sugar 1kg', 'Grocery', 'kg', 45, 135, IMG.grocery),
  P('SALT-1KG', 'Iodized Salt 1kg', 'Grocery', 'pack', 60, 42, IMG.grocery),
  P('TEA-400G', 'Black Tea 400g', 'Grocery', 'pack', 25, 210, IMG.tea),
  P('MILK-1L', 'Fresh Milk 1L', 'Supermarket', 'pack', 32, 95, IMG.milk),
  P('EGG-12PCS', 'Farm Eggs 12pcs', 'Supermarket', 'tray', 42, 150, IMG.egg),
  P('NOODLES-8PACK', 'Instant Noodles 8 Pack', 'Supermarket', 'pack', 35, 180, IMG.grocery),
  P('BISCUIT-PACK', 'Tea Biscuit Family Pack', 'Supermarket', 'pack', 50, 90, IMG.grocery),
  P('DETERGENT-1KG', 'Laundry Detergent 1kg', 'Supermarket', 'pack', 30, 185, IMG.grocery),
  P('DISHWASH-500ML', 'Dishwash Liquid 500ml', 'Supermarket', 'bottle', 28, 115, IMG.grocery),
  P('BIRIYANI', 'Chicken Biryani', 'Restaurant', 'plate', 18, 220, IMG.biryani),
  P('KHICHURI', 'Beef Bhuna Khichuri', 'Restaurant', 'box', 16, 260, IMG.biryani),
  P('THALI', 'Rice Fish Curry Meal', 'Restaurant', 'plate', 20, 190, IMG.fish),
  P('CHICKEN-CURRY', 'Chicken Curry Meal', 'Restaurant', 'plate', 22, 210, IMG.biryani),
  P('BURGER', 'Chicken Burger', 'Fast Food', 'pcs', 30, 180, IMG.burger),
  P('PIZZA', 'Beef Pizza 8 inch', 'Fast Food', 'pcs', 16, 420, IMG.pizza),
  P('FRIES', 'French Fries Large', 'Fast Food', 'box', 34, 130, IMG.burger),
  P('SHAWARMA', 'Chicken Shawarma', 'Fast Food', 'pcs', 24, 160, IMG.burger),
  P('BREAD', 'Milk Bread Loaf', 'Bakery', 'loaf', 35, 80, IMG.bakery),
  P('CAKE', 'Chocolate Cake 1lb', 'Bakery', 'pcs', 12, 650, IMG.cake),
  P('CROISSANT', 'Butter Croissant', 'Bakery', 'pcs', 24, 95, IMG.bakery),
  P('BUN', 'Sweet Bun 4pcs', 'Bakery', 'pack', 28, 70, IMG.bakery),
  P('PARACETAMOL', 'Paracetamol Tablet Strip', 'Pharmacy', 'strip', 40, 25, IMG.medicine),
  P('SALINE', 'Oral Saline 10pcs', 'Pharmacy', 'box', 35, 60, IMG.medicine),
  P('BANDAGE', 'First Aid Bandage Roll', 'Pharmacy', 'pcs', 22, 85, IMG.medicine),
  P('HAND-SANITIZER', 'Hand Sanitizer 250ml', 'Pharmacy', 'bottle', 30, 120, IMG.medicine),
  P('APPLE', 'Apple 1kg', 'Fruits & Veg', 'kg', 25, 280, IMG.fruit),
  P('BANANA', 'Banana 1 dozen', 'Fruits & Veg', 'dozen', 32, 120, IMG.fruit),
  P('MANGO', 'Seasonal Mango 1kg', 'Fruits & Veg', 'kg', 20, 180, IMG.fruit),
  P('POTATO', 'Potato 1kg', 'Fruits & Veg', 'kg', 50, 45, IMG.veg),
  P('ONION', 'Onion 1kg', 'Fruits & Veg', 'kg', 45, 80, IMG.veg),
  P('TOMATO', 'Tomato 1kg', 'Fruits & Veg', 'kg', 30, 70, IMG.veg),
  P('RUI-FISH', 'Rui Fish 1kg', 'Meat & Fish', 'kg', 12, 360, IMG.fish),
  P('PANGAS-FISH', 'Pangas Fish 1kg', 'Meat & Fish', 'kg', 18, 220, IMG.fish),
  P('CHICKEN-BROILER', 'Broiler Chicken 1kg', 'Meat & Fish', 'kg', 22, 210, IMG.meat),
  P('BEEF', 'Beef 1kg', 'Meat & Fish', 'kg', 10, 780, IMG.meat),
];

const starterAddress = {
  id: 'ADDR-STARTER-001',
  title: 'Primary Delivery Address',
  address: 'House / Road / Area - update this address',
  area: 'Dhaka, Bangladesh',
  zipCode: '1200',
  phone: '',
  isDefault: true,
  source: 'manual',
};

const readArray = (key: string) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeArray = (key: string, rows: any[]) => {
  try { localStorage.setItem(key, JSON.stringify(rows)); } catch { /* ignore */ }
};

const mergeById = <T extends { id?: string }>(primaryRows: T[] = [], secondaryRows: T[] = []) => {
  const byId = new Map<string, T>();
  [...secondaryRows, ...primaryRows].forEach((row: T) => {
    if (!row?.id) return;
    byId.set(String(row.id), row);
  });
  return Array.from(byId.values());
};

const resolveStarterStoreTarget = (stores: any[], storeAdminApps: any[]) => {
  const ranastorApp = storeAdminApps.find((app: any) => app?.storeId && String(app.storeName || '').toLowerCase() === 'ranastor')
    || storeAdminApps.find((app: any) => app?.storeId === 'STR-8944327' || app?.adminId === 'SA-68944327');
  const verifiedApp = ranastorApp
    || storeAdminApps.find((app: any) => app?.storeId && String(app.status || '').toLowerCase() === 'verified')
    || storeAdminApps.find((app: any) => app?.storeId);
  if (verifiedApp) {
    const existingStore = stores.find((store: any) => store?.id === verifiedApp.storeId);
    return {
      ...starterStore,
      ...(existingStore || {}),
      id: verifiedApp.storeId,
      adminId: verifiedApp.adminId || existingStore?.adminId || '',
      ownerName: verifiedApp.ownerName || existingStore?.ownerName || '',
      name: verifiedApp.storeName || existingStore?.name || 'Approved Store',
      address: verifiedApp.storeAddress || existingStore?.address || 'Bangladesh',
      category: verifiedApp.businessType || existingStore?.category || 'Grocery',
      status: existingStore?.status || 'active',
    };
  }
  const existingRealStore = stores.find((store: any) => store?.id && store.id !== starterStore.id);
  if (existingRealStore) return existingRealStore;
  return starterStore;
};

const seedCustomerStarterData = () => {
  try {
    if (localStorage.getItem(STARTER_SEED_KEY) === '1') return;
    const stores = readArray('sd_stores');
    const storeAdminApps = readArray('sd_store_admin_apps');
    const products = readArray('sd_products');
    const addresses = readArray('ss_addr');
    const targetStore = resolveStarterStoreTarget(stores, storeAdminApps);
    const shouldAddTargetStore = !stores.some((store: any) => store.id === targetStore.id);
    const nextStores = shouldAddTargetStore ? [targetStore, ...stores] : stores.map((store: any) => store.id === targetStore.id ? { ...store, ...targetStore } : store);
    const productIds = new Set(products.map((product: any) => product.id));
    const ownedStarterProducts = starterProducts.map(product => ({
      ...product,
      storeId: targetStore.id,
      storeName: targetStore.name,
      ownerAdminId: targetStore.adminId || '',
      seededForStoreAdmin: Boolean(targetStore.adminId),
      updatedAt: new Date().toISOString(),
    }));
    const migratedProducts = products.map((product: any) => {
      if (!String(product?.id || '').startsWith('PRD-BD-') || product.isDeleted || product.deletedAt) return product;
      return {
        ...product,
        storeId: targetStore.id,
        storeName: targetStore.name,
        ownerAdminId: targetStore.adminId || product.ownerAdminId || '',
        seededForStoreAdmin: Boolean(targetStore.adminId),
        updatedAt: new Date().toISOString(),
      };
    });
    const nextProducts = [...migratedProducts, ...ownedStarterProducts.filter(product => !productIds.has(product.id))];
    const nextAddresses = addresses.some((address: any) => address.id === starterAddress.id) ? addresses : [...addresses, starterAddress];
    writeArray('sd_stores', nextStores);
    writeArray('sd_products', nextProducts);
    writeArray('ss_addr', nextAddresses);
    localStorage.setItem(STARTER_SEED_KEY, '1');
    window.dispatchEvent(new Event('nexago-local-write'));
  } catch {
    /* ignore */
  }
};

seedCustomerStarterData();

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
  useCloudSync();

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    let cancelled = false;
    const customerId = (() => { try { return localStorage.getItem('ss_cust_id') || ''; } catch { return ''; } })();
    const pullLive = () => {
      fetch(`${API_BASE}/api/storefront?key=${encodeURIComponent(KEY)}&customerId=${encodeURIComponent(customerId)}`)
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('storefront fetch failed'))))
        .then(d => {
          if (cancelled) return;
          const cloudProducts = Array.isArray(d.products) ? d.products : [];
          const localProducts = readArray('sd_products');
          const productById = new Map<string, any>();
          const locallyDeletedIds = new Set(localProducts.filter((product: any) => product?.isDeleted || product?.deletedAt).map((product: any) => String(product.id)));
          [...cloudProducts, ...localProducts].forEach((product: any) => {
            if (!product?.id || product.isDeleted || product.deletedAt) return;
            if (locallyDeletedIds.has(String(product.id))) return;
            productById.set(String(product.id), product);
          });
          const realProducts = Array.from(productById.values()).filter((p: any) => !KEY.startsWith('STR-') || p.storeId === KEY);
          setProducts(realProducts.map((p: any) => ({
            id: p.id,
            storeId: p.storeId || starterStore.id,
            name: p.name,
            price: Number(p.promoPrice || p.price || 0),
            category: p.category || 'General',
            stock: Number(p.stock || 0),
            status: Number(p.stock || 0) <= 0 ? 'Out of Stock' : Number(p.stock || 0) <= 10 ? 'Low Stock' : 'In Stock',
            image: p.image || ''
          })) as Product[]);
          const cloudStores = d && Array.isArray(d.stores) ? d.stores : [];
          const localStores = readArray('sd_stores');
          const storeById = new Map<string, any>();
          [...localStores, ...cloudStores].forEach((store: any) => {
            if (!store?.id) return;
            storeById.set(String(store.id), store);
          });
          const nextStores = Array.from(storeById.values());
          setStores(KEY.startsWith('STR-') ? nextStores.filter((s: any) => s.id === KEY) : nextStores);
          if (d && Array.isArray(d.orders)) {
            const localCustomerOrders = readArray(CUST_ORDERS_KEY);
            setOrders(prev => mergeById(d.orders, mergeById(localCustomerOrders, prev)) as Order[]);
          }
        })
        .catch(() => {});
    };
    pullLive();
    const timer = setInterval(pullLive, 2000);
    return () => { cancelled = true; clearInterval(timer); };
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

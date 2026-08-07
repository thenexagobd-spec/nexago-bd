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
import './index.css';

const params = new URLSearchParams(window.location.search);
const KEY = params.get('key') || 'nexago-main';
const API_BASE = window.location.origin;

const SEED_STORES = [
  { id: 'STR-01', name: 'Fresh Mart', address: 'Dhanmondi, Dhaka', status: 'Active', rating: 4.8, orders: 1240, category: 'Grocery' },
  { id: 'STR-02', name: 'Daily Grocery', address: 'Gulshan, Dhaka', status: 'Active', rating: 4.6, orders: 980, category: 'Grocery' },
  { id: 'STR-03', name: 'Green Basket', address: 'Uttara, Dhaka', status: 'Active', rating: 4.7, orders: 840, category: 'Fruits & Veg' },
  { id: 'STR-04', name: 'Super Shop', address: 'Mirpur, Dhaka', status: 'Active', rating: 4.5, orders: 720, category: 'Department Store' },
  { id: 'STR-05', name: 'Save Mart', address: 'Banani, Dhaka', status: 'Active', rating: 4.4, orders: 530, category: 'Grocery' },
];

const SEED_PRODUCTS: Product[] = [
  { id: 'PROD-101', name: 'Fresh Apples (Premium)', category: 'Fruits & Vegetables', stock: 45, price: 180, status: 'In Stock', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-102', name: 'Organic Bananas', category: 'Fruits & Vegetables', stock: 120, price: 90, status: 'In Stock', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-103', name: 'Miniket Rice 5kg', category: 'Rice & Grains', stock: 35, price: 380, status: 'In Stock', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-104', name: 'Jasmine Rice 1kg', category: 'Rice & Grains', stock: 8, price: 150, status: 'Low Stock', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-105', name: 'Whole Milk 1L', category: 'Dairy & Eggs', stock: 0, price: 95, status: 'Out of Stock', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600' },
  { id: 'PROD-106', name: 'Fresh Farm Eggs (Dozen)', category: 'Dairy & Eggs', stock: 80, price: 145, status: 'In Stock', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=600' },
];

function PublicCustomerApp() {
  const [stores] = useState(SEED_STORES);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/storefront?key=${encodeURIComponent(KEY)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('storefront fetch failed'))))
      .then(d => {
        if (Array.isArray(d.products) && d.products.length) {
          setProducts(d.products.map((p: any): Product => ({
            id: p.id,
            name: p.name,
            price: Number(p.promoPrice || p.price || 0),
            category: p.category || 'General',
            stock: Number(p.stock || 0),
            status: Number(p.stock || 0) <= 0 ? 'Out of Stock' : Number(p.stock || 0) <= 10 ? 'Low Stock' : 'In Stock',
            image: p.image || ''
          })));
        }
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/state?key=${encodeURIComponent(KEY)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('state fetch failed'))))
      .then(d => {
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
      source: 'customer-app'
    };
    setOrders(prev => [newOrder, ...prev]);
    postOrder(newOrder);
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
        liveDrivers={[]}
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

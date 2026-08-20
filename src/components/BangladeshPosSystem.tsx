import React, { useMemo, useState } from 'react';
import { Banknote, Barcode, Calculator, CreditCard, Package, Printer, RefreshCw, Search, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order, Product } from '../types';

interface CartLine {
  product: Product;
  qty: number;
  discount: number;
}

interface BangladeshPosSystemProps {
  products: Product[];
  orders?: Order[];
  onProductsChange?: (products: Product[]) => void;
  onCreateOrder?: (order: Order) => void;
  onSaleRecorded?: (items: { productId: string; name: string; qty: number; price: number }[], source: 'counter' | 'delivery') => void;
}

const money = (value: number) => `৳${Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BangladeshPosSystem({ products, orders = [], onProductsChange, onCreateOrder, onSaleRecorded }: BangladeshPosSystemProps) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [customer, setCustomer] = useState('Walk-in Customer');
  const [phone, setPhone] = useState('');
  const [payment, setPayment] = useState<'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Card'>('Cash');
  const [received, setReceived] = useState('');
  const [deliveryMode, setDeliveryMode] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [receiptId, setReceiptId] = useState('');

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category || 'General')))], [products]);
  const visible = useMemo(() => products.filter(product => {
    const text = `${product.id} ${product.name} ${product.category}`.toLowerCase();
    return (category === 'All' || product.category === category) && text.includes(query.toLowerCase());
  }), [category, products, query]);

  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const discount = cart.reduce((sum, line) => sum + line.discount, 0);
  const vat = Math.round(Math.max(0, subtotal - discount) * 0.05 * 100) / 100;
  const deliveryFee = deliveryMode ? 60 : 0;
  const total = Math.max(0, subtotal - discount + vat + deliveryFee);
  const change = Math.max(0, Number(received || 0) - total);

  const addProduct = (product: Product) => {
    if (Number(product.stock || 0) <= 0 || product.status === 'Out of Stock') return;
    setCart(prev => {
      const idx = prev.findIndex(line => line.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { product, qty: 1, discount: 0 }];
    });
  };

  const scanOrSearch = () => {
    const next = visible[0] || products.find(p => p.id.toLowerCase() === query.toLowerCase());
    if (next) addProduct(next);
    setQuery('');
  };

  const setQty = (index: number, qty: number) => {
    setCart(prev => prev.map((line, i) => i === index ? { ...line, qty: Math.max(1, qty) } : line));
  };

  const completeSale = () => {
    if (!cart.length) return;
    const id = `BDPOS-${Date.now().toString().slice(-8)}`;
    const items = cart.map(line => ({ productId: line.product.id, name: line.product.name, price: line.product.price, quantity: line.qty }));
    const nextProducts = products.map(product => {
      const sold = cart.find(line => line.product.id === product.id);
      if (!sold) return product;
      const stock = Math.max(0, Number(product.stock || 0) - sold.qty);
      return { ...product, stock, status: stock <= 0 ? 'Out of Stock' : product.status };
    });
    onProductsChange?.(nextProducts);
    onSaleRecorded?.(cart.map(line => ({ productId: line.product.id, name: line.product.name, qty: line.qty, price: line.product.price })), deliveryMode ? 'delivery' : 'counter');
    onCreateOrder?.({
      id,
      storeName: 'Bangladesh POS Counter',
      address: deliveryMode ? deliveryAddress : 'Counter Sale',
      status: deliveryMode ? 'Pending' : 'Completed',
      amount: total,
      date: new Date().toLocaleDateString('en-BD', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' }),
      customerName: customer,
      customerPhone: phone,
      paymentMethod: payment,
      paymentStatus: payment === 'Cash' ? 'Paid' : 'Pending',
      source: deliveryMode ? 'pos-dispatch' : 'counter',
      deliveryCharge: deliveryFee,
      itemCount: cart.reduce((s, line) => s + line.qty, 0),
      items,
    });
    setReceiptId(id);
    setCart([]);
    setReceived('');
  };

  return (
    <div className="min-h-[calc(100dvh-0px)] bg-[#dbeaf3] text-[#12304a] p-2 overflow-auto">
      <div className="min-w-[1180px] grid grid-cols-[330px_minmax(0,1fr)_280px] gap-2">
        <section className="bg-[#b9d7e8] border-2 border-[#6fa4c4]">
          <div className="h-11 bg-[#2378b5] text-white px-3 flex items-center justify-between font-black text-xs">
            <span>বাংলাদেশ POS · NEW</span>
            <span>{new Date().toLocaleTimeString('en-BD')}</span>
          </div>
          <div className="p-2 grid grid-cols-2 gap-2 text-xs">
            <input value={customer} onChange={e => setCustomer(e.target.value)} className="col-span-2 h-9 px-2 bg-white border border-[#7ea9bf]" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Customer mobile" className="h-9 px-2 bg-white border border-[#7ea9bf]" />
            <select value={payment} onChange={e => setPayment(e.target.value as any)} className="h-9 px-2 bg-white border border-[#7ea9bf]">
              {['Cash', 'bKash', 'Nagad', 'Rocket', 'Card'].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="p-2">
            <div className="flex gap-1">
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && scanOrSearch()} placeholder="Barcode / product search" className="flex-1 h-10 px-2 bg-white border border-[#7ea9bf] font-mono" />
              <button onClick={scanOrSearch} className="w-11 bg-[#1976ad] text-white grid place-items-center"><Barcode className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="h-[420px] bg-white border-y border-[#87adbf] overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#506f86] text-white">
                <tr><th className="p-2 text-left">Item</th><th>Qty</th><th className="text-right pr-2">Total</th><th></th></tr>
              </thead>
              <tbody>
                {cart.map((line, index) => (
                  <tr key={`${line.product.id}-${index}`} className="border-b border-[#d7e3ea]">
                    <td className="p-2"><b>{line.product.name}</b><p className="font-mono text-[9px] text-gray-500">{line.product.id}</p></td>
                    <td className="text-center"><input type="number" value={line.qty} onChange={e => setQty(index, Number(e.target.value))} className="w-14 h-8 border text-center" /></td>
                    <td className="text-right pr-2 font-black">{money(line.product.price * line.qty)}</td>
                    <td><button onClick={() => setCart(prev => prev.filter((_, i) => i !== index))} className="p-1 text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
                {!cart.length && <tr><td colSpan={4} className="h-48 text-center text-gray-400 font-bold">Scan or tap product</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="p-2 grid grid-cols-2 gap-2">
            <button onClick={() => setDeliveryMode(v => !v)} className={`h-10 font-black text-xs border ${deliveryMode ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border-purple-300'}`}><Truck className="inline w-4 h-4 mr-1" />Delivery</button>
            <button onClick={() => setCart([])} className="h-10 bg-red-600 text-white font-black text-xs">Clear</button>
            {deliveryMode && <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Delivery address" className="col-span-2 h-10 px-2 border border-[#7ea9bf]" />}
          </div>
        </section>

        <section className="bg-[#cae5f6] border-2 border-[#6fa4c4]">
          <div className="h-11 bg-[#2c86c4] text-white px-3 flex items-center justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {categories.map(cat => <button key={cat} onClick={() => setCategory(cat)} className={`px-4 h-8 text-xs font-black border border-white/30 ${category === cat ? 'bg-white text-[#126195]' : 'bg-[#126da6] text-white'}`}>{cat}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 p-3 content-start max-h-[650px] overflow-auto">
            {visible.map(product => (
              <button key={product.id} onClick={() => addProduct(product)} className="min-h-28 bg-white border border-[#86b4ca] hover:border-[#176aa2] shadow-sm p-2 text-center">
                <div className="w-12 h-12 mx-auto rounded bg-[#d7eef8] border border-[#9fc8dc] grid place-items-center text-[#2476a6]"><Package className="w-6 h-6" /></div>
                <p className="mt-1 text-[11px] font-black leading-tight line-clamp-2">{product.name}</p>
                <p className="text-[10px] font-mono text-[#1e749c]">{money(product.price)}</p>
                <p className="text-[9px] text-gray-500">Stock {product.stock}</p>
              </button>
            ))}
          </div>
        </section>

        <aside className="bg-[#d6e4ec] border-2 border-[#6fa4c4]">
          <div className="h-28 bg-white border-b border-[#8dafbf] flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-black text-[#1f6d9b]">NEXAGO</div>
              <div className="text-[10px] font-black text-gray-500">BANGLADESH SMART POS</div>
            </div>
          </div>
          <div className="p-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div className="flex justify-between"><span>Discount</span><b>{money(discount)}</b></div>
            <div className="flex justify-between"><span>VAT 5%</span><b>{money(vat)}</b></div>
            <div className="flex justify-between"><span>Delivery</span><b>{money(deliveryFee)}</b></div>
            <div className="h-16 bg-[#102b3d] text-white grid place-items-center text-3xl font-black">{money(total)}</div>
            <input type="number" value={received} onChange={e => setReceived(e.target.value)} placeholder="Received amount" className="w-full h-11 px-3 bg-white border border-[#86a9ba] text-xl font-black" />
            <div className="flex justify-between text-red-600"><span>Change</span><b>{money(change)}</b></div>
            <button onClick={completeSale} className="w-full h-16 bg-[#1b9a45] hover:bg-[#15803d] text-white text-xl font-black flex items-center justify-center gap-2"><Banknote className="w-6 h-6" />PAY</button>
            <div className="grid grid-cols-3 gap-1">
              {['7','8','9','4','5','6','1','2','3','0','00','.'].map(k => <button key={k} onClick={() => setReceived(v => `${v}${k}`)} className="h-12 bg-white border border-[#9ab6c5] font-black text-lg">{k}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setReceived('')} className="h-10 bg-red-600 text-white font-black">CE</button>
              <button onClick={() => window.print()} className="h-10 bg-[#25719d] text-white font-black flex items-center justify-center gap-1"><Printer className="w-4 h-4" />Print</button>
            </div>
          </div>
          {receiptId && (
            <div className="m-3 p-3 bg-white border border-[#8dafbf] text-center text-xs">
              <p className="font-black">Last Bill: {receiptId}</p>
              <QRCodeSVG value={JSON.stringify({ bill: receiptId, total, payment })} size={84} includeMargin />
            </div>
          )}
          <div className="m-3 p-3 bg-white border border-[#8dafbf] text-xs">
            <p className="font-black mb-2 flex items-center gap-1"><ShoppingCart className="w-4 h-4" />Live POS Orders</p>
            <p>Total POS records: {orders.filter(o => String(o.id).startsWith('BDPOS-') || String(o.id).startsWith('POS-')).length}</p>
            <p className="flex items-center gap-1 mt-1"><CreditCard className="w-3 h-3" />Bangladesh MFS ready</p>
            <p className="flex items-center gap-1"><Calculator className="w-3 h-3" />VAT / delivery / stock sync</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Banknote, Box, Check, CreditCard, Minus, Package,
  Plus, Printer, Search, ShoppingCart, Trash2, Truck, User, X,
  Maximize2, Minimize2, Moon, Sun,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order, Product, makeOrderId } from '../types';

type PosMode = 'SALES' | 'RETURN';
type Uom = 'PCS' | 'BOX' | 'CASE';
type EditAction = 'qty' | 'price' | 'discount' | 'billDiscount' | 'customer' | null;

interface CartLine {
  product: Product;
  qty: number;
  foc: boolean;
  discountPct: number;
  rate: number;
  uom: Uom;
}

interface SaleRecord {
  id: string;
  date: string;
  customer: string;
  customerPhone: string;
  salesman: string;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  tax: number;
  delivery: number;
  total: number;
  payment: string;
  received: number;
  change: number;
  status: 'PAID' | 'RETURNED' | 'VOID';
  address?: string;
  priority?: string;
}

interface PosSystemProps {
  products: Product[];
  orders?: Order[];
  onProductsChange?: (products: Product[]) => void;
  onCreateOrder?: (order: Order) => void;
  onUpdateOrder?: (order: Order) => void;
  onSendToDriver?: (order: Order) => void;
  onDeleteOrder?: (id: string) => void;
  onNavigate?: (tab: string) => void;
}

const formatMoney = (value: number) => `Tk ${Math.abs(value).toFixed(2)}`;

const code39Patterns: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
};

function PosBarcode({ value }: { value: string }) {
  const encodedValue = `*${value.toUpperCase().replace(/[^0-9A-Z-. $/+%]/g, '-')}*`;
  const narrow = 2;
  const wide = 5;
  const height = 58;
  let cursor = 0;
  const bars: { x: number; width: number }[] = [];

  encodedValue.split('').forEach(character => {
    const pattern = code39Patterns[character] || code39Patterns['-'];
    pattern.split('').forEach((widthCode, index) => {
      const width = widthCode === 'w' ? wide : narrow;
      if (index % 2 === 0) bars.push({ x: cursor, width });
      cursor += width;
    });
    cursor += narrow;
  });

  return (
    <svg viewBox={`0 0 ${cursor} ${height}`} className="h-14 w-full" role="img" aria-label={`Barcode ${value}`}>
      <rect width={cursor} height={height} fill="#fff" />
      {bars.map((bar, index) => <rect key={`${bar.x}-${index}`} x={bar.x} y="0" width={bar.width} height={height} fill="#000" />)}
    </svg>
  );
}

function readSaved<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export default function PosSystem({ products, orders = [], onProductsChange, onCreateOrder, onUpdateOrder, onSendToDriver, onDeleteOrder, onNavigate }: PosSystemProps) {
  const [mode, setMode] = useState<PosMode>('SALES');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [billNo, setBillNo] = useState(() => Number(localStorage.getItem('nexago_pos_bill_no') || 7038));
  const [customer, setCustomer] = useState('WALK-IN CUSTOMER');
  const [customerPhone, setCustomerPhone] = useState('');
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const [salesman, setSalesman] = useState('COUNTER 1');
  const [billDiscountPct, setBillDiscountPct] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPriority, setDeliveryPriority] = useState<Order['priority'] | undefined>(undefined);
  const [heldBills, setHeldBills] = useState<SaleRecord[]>(() => readSaved('nexago_pos_holds', []));
  const [sales, setSales] = useState<SaleRecord[]>(() => readSaved('nexago_pos_sales', []));
  const [receipt, setReceipt] = useState<SaleRecord | null>(null);
  const [panel, setPanel] = useState<'pay' | 'holds' | 'bills' | 'ledger' | 'delivery' | null>(null);
  const [deliveryTab, setDeliveryTab] = useState<'customer' | 'dispatch'>('customer');
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null);
  const [editAction, setEditAction] = useState<EditAction>(null);
  const [editValue, setEditValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [received, setReceived] = useState('');
  const [toast, setToast] = useState('Ready');
  const [errorPopup, setErrorPopup] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nexago_pos_dark_mode') === 'true');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const posRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => localStorage.setItem('nexago_pos_holds', JSON.stringify(heldBills)), [heldBills]);
  useEffect(() => localStorage.setItem('nexago_pos_sales', JSON.stringify(sales)), [sales]);
  useEffect(() => localStorage.setItem('nexago_pos_bill_no', String(billNo)), [billNo]);
  useEffect(() => localStorage.setItem('nexago_pos_dark_mode', String(darkMode)), [darkMode]);
  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === posRootRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await posRootRef.current?.requestFullscreen();
    } catch {
      notifyError('Full screen is not available in this browser');
    }
  };

  const categories = useMemo(() => ['ALL', ...Array.from(new Set(products.map(product => product.category || 'GENERAL')))], [products]);
  const deliveryOrders = useMemo(() => orders
    .filter(order => !order.id.startsWith('POS-') && order.source !== 'pos-dispatch')
    .slice()
    .sort((a, b) => {
      const active = (o: Order) => (o.status === 'Completed' || o.status === 'Cancelled') ? 1 : 0;
      if (active(a) !== active(b)) return active(a) - active(b);
      return b.id > a.id ? 1 : -1;
    }), [orders]);
  const posDispatchOrders = useMemo(() => orders
    .filter(order => order.source === 'pos-dispatch')
    .slice()
    .sort((a, b) => {
      const active = (o: Order) => (o.status === 'Completed' || o.status === 'Cancelled') ? 1 : 0;
      if (active(a) !== active(b)) return active(a) - active(b);
      return b.id > a.id ? 1 : -1;
    }), [orders]);
  const visibleProducts = useMemo(() => products.filter(product => {
    const matchesCategory = category === 'ALL' || product.category === category;
    const text = `${product.id} ${product.name} ${product.category}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  }), [category, products, query]);

  const itemSubtotal = cart.reduce((sum, line) => sum + (line.foc ? 0 : line.rate * line.qty), 0);
  const itemDiscount = cart.reduce((sum, line) => sum + (line.foc ? 0 : line.rate * line.qty * line.discountPct / 100), 0);
  const billDiscount = Math.max(0, (itemSubtotal - itemDiscount) * billDiscountPct / 100);
  const taxable = Math.max(0, itemSubtotal - itemDiscount - billDiscount);
  const tax = Math.round(taxable * 0.05 * 100) / 100;
  const netTotal = Math.max(0, taxable + tax + deliveryCharge);
  const signedNet = mode === 'RETURN' ? -netTotal : netTotal;

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setToast(message);
    if (type === 'error') setErrorPopup({ msg: message, type });
    window.setTimeout(() => { setToast('Ready'); setErrorPopup(null); }, 2200);
  };
  const notifyError = (message: string) => notify(message, 'error');

  const addProduct = (product: Product) => {
    if (product.stock <= 0 || product.status === 'Out of Stock') {
      notifyError(`${product.name} is out of stock`);
      return;
    }
    setCart(current => {
      const index = current.findIndex(line => line.product.id === product.id && line.uom === 'PCS');
      if (index >= 0) {
        const next = [...current];
        next[index] = { ...next[index], qty: next[index].qty + 1 };
        setSelectedIndex(index);
        return next;
      }
      setSelectedIndex(current.length);
      return [...current, { product, qty: 1, foc: false, discountPct: 0, rate: product.price, uom: 'PCS' }];
    });
    setQuery('');
  };

  const addFromSearch = () => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;
    const exact = products.find(product => product.id.toLowerCase() === normalized || product.name.toLowerCase() === normalized);
    const match = exact || visibleProducts[0];
    if (match) addProduct(match);
    else notifyError('Product not found');
  };

  const updateSelected = (change: (line: CartLine) => CartLine) => {
    if (selectedIndex === null || !cart[selectedIndex]) {
      notifyError('Select an item first');
      return;
    }
    setCart(current => current.map((line, index) => index === selectedIndex ? change(line) : line));
  };

  const removeSelected = () => {
    if (selectedIndex === null) return notifyError('Select an item first');
    setCart(current => current.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(null);
    notify('Item removed');
  };

  const moveSelection = (delta: number) => {
    if (!cart.length) return;
    setSelectedIndex(current => current === null ? 0 : Math.max(0, Math.min(cart.length - 1, current + delta)));
  };

  const openEdit = (action: EditAction) => {
    if (action !== 'billDiscount' && action !== 'customer' && (selectedIndex === null || !cart[selectedIndex])) {
      notifyError('Select an item first');
      return;
    }
    if (action === 'customer') setEditValue(customer === 'WALK-IN CUSTOMER' ? '' : customer);
    else if (action === 'billDiscount') setEditValue(String(billDiscountPct));
    else if (action === 'qty') setEditValue(String(cart[selectedIndex!].qty));
    else if (action === 'price') setEditValue(String(cart[selectedIndex!].rate));
    else if (action === 'discount') setEditValue(String(cart[selectedIndex!].discountPct));
    setEditAction(action);
  };

  const saveEdit = () => {
    const value = Number(editValue);
    if (editAction === 'customer') setCustomer(editValue.trim() || 'WALK-IN CUSTOMER');
    if (editAction === 'billDiscount') setBillDiscountPct(Math.max(0, Math.min(100, value || 0)));
    if (editAction === 'qty') updateSelected(line => ({ ...line, qty: Math.max(1, Math.floor(value || 1)) }));
    if (editAction === 'price') updateSelected(line => ({ ...line, rate: Math.max(0, value || 0) }));
    if (editAction === 'discount') updateSelected(line => ({ ...line, discountPct: Math.max(0, Math.min(100, value || 0)) }));
    setEditAction(null);
    setEditValue('');
    notify('Value updated');
  };

  const clearSale = () => {
    setCart([]);
    setSelectedIndex(null);
    setCustomer('WALK-IN CUSTOMER');
    setCustomerPhone('');
    setLinkedOrderId(null);
    setBillDiscountPct(0);
    setDeliveryCharge(0);
    setDeliveryAddress('');
    setDeliveryPriority(undefined);
    setMode('SALES');
  };

  const makeRecord = (status: SaleRecord['status'], payment = 'UNPAID', cash = 0): SaleRecord => ({
    id: String(billNo),
    date: new Date().toLocaleString(),
    customer,
    customerPhone,
    salesman,
    lines: cart.map(line => ({ ...line, product: { ...line.product } })),
    subtotal: itemSubtotal,
    discount: itemDiscount + billDiscount,
    tax,
    delivery: deliveryCharge,
    total: signedNet,
    payment,
    received: cash,
    change: mode === 'RETURN' ? 0 : Math.max(0, cash - netTotal),
    status,
    address: deliveryAddress || undefined,
    priority: deliveryPriority,
  });

  const buildReceiptFromOrder = (order: Order): SaleRecord => {
    const lines: CartLine[] = (order.items || []).map(it => ({
      product: { id: it.productId || order.id, name: it.name, price: it.price, category: 'Delivery Order', stock: 999, status: 'In Stock' },
      qty: it.quantity, foc: false, discountPct: 0, rate: it.price, uom: 'PCS' as Uom,
    }));
    if (!lines.length) {
      const unit = Math.max(0, order.amount - (order.deliveryCharge || 0));
      lines.push({ product: { id: order.id, name: order.storeName || 'Delivery Order', price: unit, category: 'Delivery Order', stock: 999, status: 'In Stock' }, qty: order.itemCount || 1, foc: false, discountPct: 0, rate: unit, uom: 'PCS' as Uom });
    }
    return {
      id: order.id,
      date: `${order.date || ''} ${order.time || ''}`.trim(),
      customer: order.customerName,
      customerPhone: order.customerPhone || '',
      salesman: 'Delivery',
      lines,
      subtotal: lines.reduce((s, l) => s + l.rate * l.qty, 0),
      discount: 0,
      tax: 0,
      delivery: order.deliveryCharge || 0,
      total: order.amount,
      payment: order.paymentMethod,
      received: 0,
      change: 0,
      status: order.status === 'Completed' ? 'PAID' : order.status === 'Cancelled' ? 'VOID' : 'PAID',
      address: order.address,
      priority: order.priority,
    };
  };

  const holdCurrent = () => {
    if (!cart.length) return notifyError('Cannot hold an empty bill');
    const record = makeRecord('PAID', 'HOLD');
    setHeldBills(current => [record, ...current]);
    setBillNo(current => current + 1);
    clearSale();
    notify(`Bill ${record.id} held`);
  };

  const recallHold = (record: SaleRecord) => {
    setCart(record.lines);
    setCustomer(record.customer);
    setCustomerPhone(record.customerPhone);
    setSalesman(record.salesman);
    setDeliveryAddress(record.address || '');
    setDeliveryPriority(record.priority);
    setHeldBills(current => current.filter(item => item.id !== record.id));
    setPanel(null);
    setSelectedIndex(record.lines.length ? 0 : null);
    notify(`Bill ${record.id} recalled`);
  };

  const voidCurrent = () => {
    if (!cart.length) return notifyError('Nothing to void');
    const record = makeRecord('VOID', 'VOID');
    setSales(current => [record, ...current]);
    setBillNo(current => current + 1);
    clearSale();
    notify(`Bill ${record.id} voided`);
  };

  const completePayment = () => {
    if (!cart.length) return;
    const cash = paymentMethod === 'CASH' ? Number(received) : netTotal;
    if (mode === 'SALES' && cash < netTotal) return notifyError('Received amount is below net total');
    const status = mode === 'RETURN' ? 'RETURNED' : 'PAID';
    const record = makeRecord(status, paymentMethod, cash);
    setSales(current => [record, ...current]);
    setReceipt(record);
    setPanel(null);

    if (mode === 'SALES') {
      onProductsChange?.(products.map(product => {
        const sold = cart.find(line => line.product.id === product.id);
        if (!sold || sold.foc) return product;
        const multiplier = sold.uom === 'CASE' ? 24 : sold.uom === 'BOX' ? 6 : 1;
        const stock = Math.max(0, product.stock - sold.qty * multiplier);
        return { ...product, stock, status: stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'In Stock' };
      }));
      const linkedOrder = linkedOrderId ? orders.find(order => order.id === linkedOrderId) : undefined;
      if (linkedOrder && onUpdateOrder) {
        onUpdateOrder({
          ...linkedOrder,
          status: linkedOrder.status === 'Confirmed' ? 'Processing' : linkedOrder.status,
          paymentMethod: record.payment,
          amount: record.total,
          deliveryCharge: record.delivery,
        });
      } else {
        onCreateOrder?.({
          id: `POS-${record.id}`,
          storeName: 'The NexaGo BD Counter',
          address: 'POS Counter Sale',
          status: 'Completed',
          amount: record.total,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          customerName: record.customer,
          customerPhone: record.customerPhone || 'Counter Customer',
          paymentMethod: record.payment,
          pickupLocation: 'The NexaGo BD Counter',
          deliveryCharge: record.delivery,
          itemCount: record.lines.reduce((sum, line) => sum + line.qty, 0),
          items: record.lines.map(line => ({ productId: line.product.id, name: line.product.name, price: line.rate, quantity: line.qty })),
        });
      }
    }

    setBillNo(current => current + 1);
    clearSale();
    setReceived('');
    notify(`${status} bill ${record.id} saved`);
  };

  const dispatchDelivery = () => {
    if (!cart.length) return notifyError('Cart is empty');
    if (!customer.trim()) return notifyError('Enter customer name first');
    if (!customerPhone.trim()) return notifyError('Enter customer phone number first');
    const newId = makeOrderId();
    const estMinutes = deliveryPriority === 'Express' ? 20 : deliveryPriority === 'Urgent' ? 15 : 30;
    const order: Order = {
      id: newId,
      storeName: 'The NexaGo BD Counter',
      address: deliveryAddress || 'Counter Delivery',
      status: 'Confirmed',
      amount: netTotal,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: customer,
      customerPhone: customerPhone || undefined,
      paymentMethod: deliveryCharge > 0 ? 'COD' : paymentMethod,
      pickupLocation: 'The NexaGo BD Counter',
      priority: deliveryPriority,
      deliveryCharge,
      codAmount: deliveryCharge > 0 ? netTotal : undefined,
      estimatedMinutes: estMinutes,
      itemCount: cart.reduce((sum, line) => sum + line.qty, 0),
      items: cart.map(line => ({ productId: line.product.id, name: line.product.name, price: line.rate, quantity: line.qty })),
      source: 'pos-dispatch',
    };
    onCreateOrder?.(order);
    onSendToDriver?.({ ...order });
    onProductsChange?.(products.map(product => {
      const sold = cart.find(line => line.product.id === product.id);
      if (!sold || sold.foc) return product;
      const multiplier = sold.uom === 'CASE' ? 24 : sold.uom === 'BOX' ? 6 : 1;
      const stock = Math.max(0, product.stock - sold.qty * multiplier);
      return { ...product, stock, status: stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'In Stock' };
    }));
    clearSale();
    setReceived('');
    notify(`Delivery ${newId} dispatched to driver`);
  };

  const loadReturn = (record: SaleRecord) => {
    setCart(record.lines);
    setCustomer(record.customer);
    setCustomerPhone(record.customerPhone);
    setDeliveryAddress(record.address || '');
    setDeliveryPriority(record.priority);
    setMode('RETURN');
    setPanel(null);
    setSelectedIndex(record.lines.length ? 0 : null);
    notify(`Bill ${record.id} loaded for return`);
  };

  const loadDeliveryOrder = (order: Order) => {
    const lines: CartLine[] = (order.items || []).map((item, index) => {
      const matched = products.find(product => product.id === item.productId || product.name === item.name);
      const product: Product = matched || {
        id: item.productId || `DEL-${order.id}-${index}`,
        name: item.name,
        price: item.price,
        category: 'Delivery Order',
        stock: 999,
        status: 'In Stock',
      };
      return { product, qty: item.quantity, foc: false, discountPct: 0, rate: item.price, uom: 'PCS' };
    });
    if (!lines.length) {
      const fallback = products[0];
      if (fallback) lines.push({ product: fallback, qty: order.itemCount || 1, foc: false, discountPct: 0, rate: Math.max(0, order.amount - (order.deliveryCharge || 0)), uom: 'PCS' });
    }
    setCart(lines);
    setSelectedIndex(lines.length ? 0 : null);
    setCustomer(order.customerName);
    setCustomerPhone(order.customerPhone);
    setDeliveryCharge(order.deliveryCharge || 0);
    setDeliveryAddress(order.address);
    setDeliveryPriority(order.priority);
    setLinkedOrderId(order.id);
    setMode('SALES');
    setPanel(null);
    notify(`Delivery order ${order.id} loaded`);
  };

  const updateDeliveryStatus = (order: Order, status: Order['status']) => {
    onUpdateOrder?.({ ...order, status });
    notify(`Order ${order.id} updated to ${status}`);
  };

  const dispatchToDriver = (order: Order) => {
    if (order.status === 'Completed' || order.status === 'Cancelled') return;
    if (!onSendToDriver) {
      notifyError('No driver app connected');
      return;
    }
    onSendToDriver({ ...order, status: 'Confirmed' });
    onUpdateOrder?.({ ...order, status: 'Confirmed' });
    notify(`Request sent to Rider for ${order.id}`);
  };

  const clearDeliveryList = () => {
    const list = deliveryTab === 'customer' ? deliveryOrders : posDispatchOrders;
    if (!list.length) return notifyError('List is already empty');
    list.forEach(order => onDeleteOrder?.(order.id));
    notify(`${list.length} demo ${deliveryTab === 'customer' ? 'customer' : 'dispatch'} order(s) removed`);
  };

  const keypad = (key: string) => {
    if (key === 'CLEAR') return setQuery('');
    if (key === 'ENTER') return addFromSearch();
    setQuery(current => `${current}${key}`);
    searchRef.current?.focus();
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'F2') { event.preventDefault(); setMode('SALES'); }
      if (event.key === 'F3') { event.preventDefault(); setMode('RETURN'); }
      if (event.key === 'F4') { event.preventDefault(); voidCurrent(); }
      if (event.key === 'F6') { event.preventDefault(); holdCurrent(); }
      if (event.key === 'F7') { event.preventDefault(); setPanel('holds'); }
      if (event.key === 'F8') { event.preventDefault(); clearSale(); }
      if (event.key === 'F9') { event.preventDefault(); onNavigate?.('Dashboard'); }
      if (event.key === 'F12') { event.preventDefault(); if (cart.length) setPanel('pay'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const topKeys = [
    ['Sales (F2)', () => setMode('SALES')],
    ['Return (F3)', () => setMode('RETURN')],
    ['Void (F4)', voidCurrent],
    ['Focus', () => searchRef.current?.focus()],
    ['Bill Wise Return', () => setPanel('bills')],
  ] as const;

  const sideKeys = [
    ['UP', () => moveSelection(-1)],
    ['Down', () => moveSelection(1)],
    ['Remove Item', removeSelected],
    ['Change Qty (F10)', () => openEdit('qty')],
    ['FOC', () => updateSelected(line => ({ ...line, foc: !line.foc }))],
    ['Change Price (F11)', () => openEdit('price')],
    ['Edit N/Rate', () => openEdit('price')],
    ['UOM (Alt+U)', () => updateSelected(line => ({ ...line, uom: line.uom === 'PCS' ? 'BOX' : line.uom === 'BOX' ? 'CASE' : 'PCS' }))],
    ['Item Discount', () => openEdit('discount')],
    ['Item List (F1)', () => searchRef.current?.focus()],
    ['Salesman (Alt+L)', () => setSalesman(value => value === 'COUNTER 1' ? 'COUNTER 2' : value === 'COUNTER 2' ? 'MANAGER' : 'COUNTER 1')],
    ['Bill Discount', () => openEdit('billDiscount')],
    ['Customer', () => openEdit('customer')],
    ['Product Ledger', () => setPanel('ledger')],
    [`Delivery Orders (${deliveryOrders.length})`, () => setPanel('delivery')],
  ] as const;

  return (
    <div ref={posRootRef} className={`classic-pos ${darkMode ? 'pos-dark' : ''} min-w-[1050px] min-h-[720px] bg-[#d8e1e8] text-[#142333] border border-[#617b90] shadow-2xl overflow-hidden`}>
      <div className="pos-layout grid grid-cols-[minmax(0,1fr)_118px_330px] min-h-[720px]">
        <section className="pos-left flex flex-col border-r border-[#6b879b]">
          <div className="pos-top grid grid-cols-5 h-14 bg-[#1d5c91] border-b border-[#547c9b]">
            {topKeys.map(([label, action], index) => (
              <button key={label} onClick={action} className={`pos-top-key border-r border-white/40 text-white text-sm font-bold hover:bg-[#174a76] ${index === 0 && mode === 'SALES' || index === 1 && mode === 'RETURN' ? 'pos-top-key-active bg-[#123f66]' : 'bg-[#246ca5]'}`}>{label}</button>
            ))}
          </div>

          <div className="pos-bill-info h-10 px-3 bg-[#456f90] text-white grid grid-cols-4 items-center text-xs font-semibold">
            <span>Bill No: <b>{billNo}</b></span>
            <span>POS</span>
            <span>C.No: {sales.length + 1}</span>
            <span>{new Date().toLocaleDateString()} - {mode}</span>
          </div>

          <div className="pos-customer-info h-12 px-3 bg-[#587f9b] text-white grid grid-cols-3 items-center text-xs">
            <span>Customer: <b>{customer}</b></span>
            <span>Salesman: <b>{salesman}</b></span>
            <span>Balance: <b>{formatMoney(mode === 'RETURN' ? signedNet : Math.max(0, netTotal - Number(received || 0)))}</b></span>
          </div>

          <div className="pos-table-wrap flex-1 bg-[#eef2f4] overflow-auto">
            <table className="pos-table w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-[#718da2] text-white">
                <tr>{['Sl', 'Barcode', 'Particulars', 'UOM', 'Qty', 'FOC', 'Rate', 'Dsc%', 'Discount', 'Tax', 'Total'].map(label => <th key={label} className="border border-[#9fb1bf] px-1.5 py-2 text-left font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody>
                {cart.map((line, index) => {
                  const gross = line.foc ? 0 : line.rate * line.qty;
                  const discount = gross * line.discountPct / 100;
                  const lineTax = (gross - discount) * 0.05;
                  return (
                    <tr key={`${line.product.id}-${index}`} onClick={() => setSelectedIndex(index)} className={`cursor-pointer ${selectedIndex === index ? 'bg-[#b9def5]' : 'bg-white hover:bg-[#e3f1fa]'}`}>
                      <td className="border border-[#c2ccd3] px-1.5 py-2">{index + 1}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 font-mono">{line.product.id}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 font-semibold">{line.product.name}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2">{line.uom}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 text-right">{line.qty}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 text-center">{line.foc ? 'YES' : ''}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 text-right">{line.rate.toFixed(2)}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 text-right">{line.discountPct.toFixed(1)}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 text-right">{discount.toFixed(2)}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 text-right">{lineTax.toFixed(2)}</td>
                      <td className="border border-[#c2ccd3] px-1.5 py-2 text-right font-bold">{(gross - discount + lineTax).toFixed(2)}</td>
                    </tr>
                  );
                })}
                {!cart.length && <tr><td colSpan={11} className="h-56 text-center text-gray-400 font-semibold">Scan a barcode or select a product to begin</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="pos-status h-9 bg-[#5b839a] px-3 flex items-center justify-between text-xs text-white">
            <span>Sales: {formatMoney(itemSubtotal)}</span>
            <span>Returns: {mode === 'RETURN' ? formatMoney(netTotal) : formatMoney(0)}</span>
            <span>{toast}</span>
          </div>

          <div className="pos-search px-3 py-2 bg-[#d9e2e7] border-b border-[#9cadb8]">
            <label className="text-[10px] font-bold text-[#405a6d]">Barcode / Product Search</label>
            <div className="flex gap-2 mt-1">
              <input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && addFromSearch()} className="flex-1 h-9 px-3 bg-white border border-[#8ea2b0] outline-none focus:border-[#176aa2] text-sm font-mono" placeholder="Scan barcode or type product name" />
              <button onClick={addFromSearch} className="pos-search-button w-12 bg-[#2673a8] text-white flex items-center justify-center"><Search className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="pos-bottom grid grid-cols-[320px_1fr] min-h-[195px] bg-[#426d87]">
            <div className="grid grid-cols-4 gap-1.5 p-2 border-r border-white/20">
              {['1','2','3','HOME','4','5','6','END','7','8','9','.','0','00','CLEAR','ENTER'].map(key => (
                <button key={key} onClick={() => keypad(key)} className={`pos-key ${key === 'ENTER' ? 'pos-key-enter bg-[#2f8b55]' : key === 'CLEAR' ? 'pos-key-clear bg-[#9b2f32]' : 'bg-[#667d8e]'} border border-white/25 text-white text-xs font-bold hover:brightness-110`}>{key}</button>
              ))}
            </div>
            <div className="p-3 text-white grid grid-cols-2 gap-x-6 gap-y-1 content-center text-sm">
              <span>Item Total:</span><b className="text-right">{itemSubtotal.toFixed(2)}</b>
              <span>Item Discount:</span><b className="text-right">{itemDiscount.toFixed(2)}</b>
              <span>Tax Amount:</span><b className="text-right">{tax.toFixed(2)}</b>
              <span>Sub Total:</span><b className="text-right">{taxable.toFixed(2)}</b>
              <span>Bill Discount:</span><b className="text-right">{billDiscount.toFixed(2)}</b>
              <span>Delivery:</span><b className="text-right">{deliveryCharge.toFixed(2)}</b>
              <span className="border-t border-white/30 pt-2 font-bold">Net Total:</span><b className="text-right border-t border-white/30 pt-2 text-2xl text-[#fff34f]">{signedNet.toFixed(2)}</b>
              <span>Balance:</span><b className="text-right text-xl text-[#ff4f55]">{Math.max(0, netTotal - Number(received || 0)).toFixed(2)}</b>
            </div>
          </div>
        </section>

        <aside className="pos-side grid grid-rows-[repeat(15,minmax(0,1fr))] bg-[#2d789d] border-r border-[#607f91]">
          {sideKeys.map(([label, action]) => <button key={label} onClick={action} className="border-b border-white/35 px-1 text-[11px] leading-tight font-bold text-white hover:bg-[#175d83]">{label}</button>)}
        </aside>

        <aside className="pos-right flex flex-col bg-[#d9e1e6]">
          <div className="pos-right-header h-14 bg-[#244a62] text-white px-2 flex items-center justify-between gap-2 text-xs">
            <span className="whitespace-nowrap">Logged User: 1</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPanel('delivery')} className="h-8 px-2 border border-orange-400/40 bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 font-black whitespace-nowrap" title="Customer delivery orders">
                Delivery {deliveryOrders.length}
              </button>
              <button onClick={() => setDarkMode(value => !value)} className="w-8 h-8 border border-white/25 bg-white/10 hover:bg-white/20 flex items-center justify-center" title={darkMode ? 'Light mode' : 'Dark mode'} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={toggleFullscreen} className="w-8 h-8 border border-white/25 bg-white/10 hover:bg-white/20 flex items-center justify-center" title={isFullscreen ? 'Exit full screen' : 'Full screen'} aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <span className="hidden 2xl:inline whitespace-nowrap">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="pos-categories flex gap-1 p-1 bg-[#b8c7d1] overflow-x-auto">
            {categories.slice(0, 5).map(item => <button key={item} onClick={() => setCategory(item)} className={`pos-category px-2 py-1 text-[9px] font-bold whitespace-nowrap ${category === item ? 'pos-category-active bg-[#226e9f] text-white' : 'bg-white text-[#415766]'}`}>{item}</button>)}
          </div>
          <div className="pos-products grid grid-cols-3 gap-1.5 p-2 h-[310px] overflow-y-auto content-start">
            {visibleProducts.map(product => (
              <button key={product.id} onClick={() => addProduct(product)} className="pos-product min-h-[88px] bg-[#edf1f3] border border-[#a7b8c4] hover:border-[#2876a4] p-1.5 text-center flex flex-col items-center justify-center">
                <div className="pos-product-icon w-8 h-8 mb-1 bg-[#ccd6dc] border border-[#aab8c1] flex items-center justify-center text-[#607684]"><Package className="w-4 h-4" /></div>
                <span className="text-[9px] font-bold leading-tight line-clamp-2">{product.name}</span>
                <span className="text-[8px] text-[#45677e]">{formatMoney(product.price)} - {product.stock}</span>
              </button>
            ))}
          </div>

          <div className="pos-customer p-2 bg-[#63859a] text-white text-[10px] space-y-1">
            <div className="grid grid-cols-[90px_1fr] gap-1"><span>Priv Card/Mobile</span><input value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} className="h-7 px-2 bg-white text-[#183345] outline-none" /></div>
            <div className="flex justify-between"><span>Customer</span><b>{customer}</b></div>
            <div className="flex justify-between"><span>Points</span><b>{sales.length * 10}</b><span>Disc</span><b>{billDiscountPct.toFixed(2)}</b></div>
          </div>

          <div className="pos-actions grid grid-cols-4 grid-rows-4 gap-1 p-1.5 flex-1 bg-[#5c8197]">
            <button onClick={() => setPanel('bills')} className="pos-action">View Bill (F5)</button>
            <button onClick={() => sales.length && setSales(current => current.slice(1))} className="pos-action bg-[#9a3b42]">Delete Bill</button>
            <button onClick={() => cart.length ? setPanel('pay') : notifyError('Cart is empty')} className="row-span-2 pos-action bg-[#35a04d] text-base">PAY (F12)</button>
            <button onClick={holdCurrent} className="pos-action">Hold (F6)</button>
            <button onClick={() => setPanel('holds')} className="pos-action">Hold List (F7)</button>
            <button onClick={dispatchDelivery} className="pos-action bg-[#7c3aed]">🛵 Delivery Dispatch</button>
            <button onClick={() => sales[0] && setReceipt(sales[0])} className="pos-action">Last Bill</button>
            <button onClick={clearSale} className="pos-action bg-[#397da2]">Clear (F8)</button>
            <button onClick={() => setPanel('delivery')} className="pos-action relative"><Truck className="w-3 h-3 mx-auto" />Delivery{deliveryOrders.length > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-white text-[8px] flex items-center justify-center">{deliveryOrders.length}</span>}</button>
            <button onClick={() => setPanel('ledger')} className="pos-action">Ledger</button>
            <button onClick={() => receipt ? setReceipt(receipt) : sales[0] && setReceipt(sales[0])} className="pos-action">Receipt</button>
            <button onClick={() => onNavigate?.('Dashboard')} className="col-span-4 pos-action bg-[#b52f36]">Close (F9)</button>
          </div>
        </aside>
      </div>

      <style>{`
        .classic-pos:fullscreen{width:100vw!important;height:100dvh!important;min-width:0!important;min-height:0!important;overflow:hidden!important;background:#080f18}
        .classic-pos:fullscreen>.pos-layout{width:100%;height:100dvh;min-height:0!important;overflow:hidden}
        .classic-pos:fullscreen .pos-left{height:100dvh;min-height:0;overflow:hidden}
        .classic-pos:fullscreen .pos-table-wrap{min-height:100px}
        .pos-action{border:1px solid rgba(255,255,255,.35);background:#317797;color:white;font-size:10px;font-weight:800;line-height:1.15;padding:4px;display:flex;align-items:center;justify-content:center;flex-direction:column}
        .pos-action:hover{filter:brightness(1.12)}
        .pos-dark{background:#080f18!important;color:#e5e7eb!important;border-color:#26374a!important}
        .pos-dark .pos-left,.pos-dark .pos-right{background:#0b1018!important;border-color:#26374a!important}
        .pos-dark .pos-top,.pos-dark .pos-bill-info,.pos-dark .pos-customer-info{background:#111c2e!important;border-color:#26374a!important}
        .pos-dark .pos-top button{background:#18263a!important;border-color:#334155!important}
        .pos-dark .pos-top button:hover{background:#f97316!important}
        .pos-dark .pos-top .pos-top-key-active{background:#ea580c!important;color:#fff!important}
        .pos-dark .pos-table-wrap{background:#0b1320!important}
        .pos-dark .pos-table thead{background:#1a293d!important;color:#f8fafc!important}
        .pos-dark .pos-table tbody tr{background:#111c2e!important;color:#e5e7eb!important}
        .pos-dark .pos-table tbody tr:hover{background:#17263a!important}
        .pos-dark .pos-table tbody td{border-color:#2a394b!important}
        .pos-dark .pos-status,.pos-dark .pos-bottom,.pos-dark .pos-customer{background:#111c2e!important}
        .pos-dark .pos-search,.pos-dark .pos-categories{background:#101a2a!important;border-color:#26374a!important;color:#e5e7eb!important}
        .pos-dark .pos-search label{color:#cbd5e1!important}
        .pos-dark .pos-search-button{background:#ea580c!important}
        .pos-dark input,.pos-dark select{background:#080f18!important;color:#f8fafc!important;border-color:#334155!important}
        .pos-dark .pos-key{background:#1e293b!important;border-color:#475569!important}
        .pos-dark .pos-key:hover{background:#334155!important}
        .pos-dark .pos-key-clear{background:#b91c1c!important}
        .pos-dark .pos-key-enter{background:#15803d!important}
        .pos-dark .pos-side,.pos-dark .pos-actions{background:#0e1827!important}
        .pos-dark .pos-side button,.pos-dark .pos-action{background:#18263a!important;border-color:#334155!important}
        .pos-dark .pos-side button:hover,.pos-dark .pos-action:hover{background:#f97316!important}
        .pos-dark .pos-right-header{background:#111c2e!important;border-bottom:1px solid #26374a}
        .pos-dark .pos-category{background:#18263a!important;color:#cbd5e1!important;border:1px solid #334155!important}
        .pos-dark .pos-category-active{background:#ea580c!important;color:#fff!important;border-color:#f97316!important}
        .pos-dark .pos-products{background:#0b1320!important}
        .pos-dark .pos-product{background:#111c2e!important;color:#f8fafc!important;border-color:#2a394b!important}
        .pos-dark .pos-product:hover{border-color:#f97316!important}
        .pos-dark .pos-product span:last-child{color:#fb923c!important}
        .pos-dark .pos-product-icon{background:#18263a!important;color:#94a3b8!important;border-color:#334155!important}
        .pos-dark .pos-modal{background:#111c2e!important;color:#e5e7eb!important;border-color:#334155!important}
        .pos-dark .pos-modal>div:first-child{background:#0f172a!important;border-color:#334155!important}
        .pos-dark .pos-panel-card,.pos-dark .pos-modal table{background:#0f1a2a!important;color:#e5e7eb!important;border-color:#334155!important}
        .pos-dark .pos-panel-card p{color:#94a3b8!important}
        .pos-dark .pos-modal th{background:#18263a!important;color:#f8fafc!important}
        .pos-dark .pos-modal td{border-color:#334155!important}
      `}</style>

      {editAction && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
          <div className="pos-modal w-full max-w-sm bg-[#e8eef2] border-2 border-[#376b8a] shadow-2xl">
            <div className="h-10 px-3 bg-[#245f84] text-white flex items-center justify-between"><b>{editAction === 'customer' ? 'Customer Name' : editAction === 'billDiscount' ? 'Bill Discount %' : `Change ${editAction}`}</b><button onClick={() => setEditAction(null)}><X className="w-4 h-4" /></button></div>
            <div className="p-4 space-y-3"><input autoFocus value={editValue} onChange={event => setEditValue(event.target.value)} onKeyDown={event => event.key === 'Enter' && saveEdit()} className="w-full h-11 px-3 bg-white border border-[#7892a3] outline-none text-lg" /><button onClick={saveEdit} className="w-full h-10 bg-[#278048] text-white font-bold flex items-center justify-center gap-2"><Check className="w-4 h-4" />Apply</button></div>
          </div>
        </div>
      )}

      {panel === 'pay' && (
        <div className="fixed inset-0 z-[80] bg-black/65 flex items-center justify-center p-4">
          <div className="pos-modal w-full max-w-xl bg-[#e8eef2] border-2 border-[#376b8a] shadow-2xl">
            <div className="h-11 px-4 bg-[#245f84] text-white flex items-center justify-between"><b>Payment - Bill {billNo}</b><button onClick={() => setPanel(null)}><X className="w-4 h-4" /></button></div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-2"><p className="text-xs font-bold">Payment Method</p>{['CASH','CARD','BKASH','NAGAD','ROCKET','BANK'].map(method => <button key={method} onClick={() => setPaymentMethod(method)} className={`w-full h-9 border font-bold text-xs ${paymentMethod === method ? 'bg-[#2775a0] text-white border-[#1c5b80]' : 'bg-white border-[#9aabb6]'}`}>{method}</button>)}</div>
              <div className="space-y-4"><div><p className="text-xs font-bold">Net Total</p><p className="text-3xl font-black text-[#1d6187]">{formatMoney(netTotal)}</p></div><label className="block text-xs font-bold">Received<input type="number" value={received} onChange={event => setReceived(event.target.value)} disabled={paymentMethod !== 'CASH'} className="mt-1 w-full h-11 px-3 bg-white border border-[#8da0ad] text-xl font-bold disabled:bg-gray-200" /></label><p className="text-xs">Change: <b>{formatMoney(Math.max(0, Number(received || 0) - netTotal))}</b></p><button onClick={completePayment} className="w-full h-12 bg-[#309149] text-white text-lg font-black flex items-center justify-center gap-2"><Banknote className="w-5 h-5" />CONFIRM PAYMENT</button></div>
            </div>
          </div>
        </div>
      )}

      {(panel === 'holds' || panel === 'bills' || panel === 'ledger' || panel === 'delivery') && (
        <div className="fixed inset-0 z-[80] bg-black/65 flex items-center justify-center p-4">
          <div className="pos-modal w-full max-w-4xl max-h-[80vh] bg-[#e8eef2] border-2 border-[#376b8a] shadow-2xl flex flex-col">
            <div className="h-11 px-4 bg-[#245f84] text-white flex items-center justify-between"><b>{panel === 'holds' ? 'Held Bills' : panel === 'bills' ? 'Bill Archive / Bill Wise Return' : panel === 'delivery' ? 'Delivery Orders' : 'Product Ledger'}</b><button onClick={() => setPanel(null)}><X className="w-4 h-4" /></button></div>
            <div className="p-4 overflow-auto">
              {panel === 'delivery' ? (
                <>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setDeliveryTab('customer')} className={`px-4 py-2 text-xs font-black rounded ${deliveryTab === 'customer' ? 'bg-[#245f84] text-white' : 'bg-white text-[#245f84] border border-[#9aabb6]'}`}>Customer App Orders ({deliveryOrders.length})</button>
                    <button onClick={() => setDeliveryTab('dispatch')} className={`px-4 py-2 text-xs font-black rounded ${deliveryTab === 'dispatch' ? 'bg-[#7c3aed] text-white' : 'bg-white text-[#7c3aed] border border-[#9aabb6]'}`}>POS Dispatch ({posDispatchOrders.length})</button>
                    <button onClick={clearDeliveryList} className="ml-auto px-3 py-2 bg-red-600 text-white text-xs font-black rounded">🗑 Clear</button>
                  </div>
                  <div className="space-y-2">
                    {(deliveryTab === 'customer' ? deliveryOrders : posDispatchOrders).map(order => (
                      <div key={`delivery-order-${deliveryTab}-${order.id}`} className={`pos-panel-card bg-white border border-[#a6b5bf] p-3 grid grid-cols-[1fr_auto] gap-3 ${order.status === 'Completed' || order.status === 'Cancelled' ? 'opacity-70' : ''}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap"><b>#{order.id}</b><span className={`px-2 py-0.5 text-[10px] font-black ${order.status === 'Confirmed' ? 'bg-amber-100 text-amber-700' : order.status === 'Processing' || order.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : order.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{order.status === 'Completed' ? '✔ Delivered' : order.status}</span>{order.deliveryCharge !== undefined && order.deliveryCharge > 0 && <span className="text-[10px] font-bold text-[#2677a2]">🏠 Home Delivery</span>}</div>
                          <p className="text-xs font-bold mt-1">{order.customerName} - {order.customerPhone}</p>
                          <p className="text-[11px] text-gray-500 truncate">{order.address}</p>
                          <p className="text-[11px] text-gray-500">{order.storeName} - {order.itemCount || order.items?.length || 0} items - {formatMoney(order.amount)}{order.deliveryCharge !== undefined && order.deliveryCharge > 0 ? ` (Delivery ${formatMoney(order.deliveryCharge)})` : ''}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-[116px]">
                          <div className="grid grid-cols-2 gap-1">
                            <button onClick={() => setShowOrderDetail(order)} className="px-1 py-1.5 bg-[#0e7490] text-white text-[10px] font-bold">Show</button>
                            <button onClick={() => setReceipt(buildReceiptFromOrder(order))} className="px-1 py-1.5 bg-[#b16b25] text-white text-[10px] font-bold">Receipt</button>
                          </div>
                          {order.status === 'Completed' || order.status === 'Cancelled' ? (
                            <span className="px-3 py-2 bg-gray-100 text-gray-500 text-[10px] font-black text-center uppercase">{order.status === 'Completed' ? 'Delivered' : 'Cancelled'}</span>
                          ) : (
                            <>
                              <button onClick={() => loadDeliveryOrder(order)} className="px-3 py-2 bg-[#2677a2] text-white text-xs font-bold">Load in POS</button>
                              {deliveryTab === 'customer' && <button onClick={() => updateDeliveryStatus(order, 'Processing')} className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold">Accept / Process</button>}
                              <button onClick={() => dispatchToDriver(order)} className="px-3 py-1.5 bg-[#7c3aed] text-white text-[10px] font-bold">🛵 Send to Driver</button>
                              <button onClick={() => updateDeliveryStatus(order, 'Cancelled')} className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold">Cancel</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {!(deliveryTab === 'customer' ? deliveryOrders : posDispatchOrders).length && (
                      deliveryTab === 'customer'
                        ? <div className="py-12 text-center"><Truck className="w-10 h-10 mx-auto text-gray-400 mb-2" /><p className="font-bold text-gray-600">No customer delivery orders</p><p className="text-xs text-gray-400">New Customer App orders will appear here automatically.</p></div>
                        : <div className="py-12 text-center"><Truck className="w-10 h-10 mx-auto text-gray-400 mb-2" /><p className="font-bold text-gray-600">No POS dispatch orders</p><p className="text-xs text-gray-400">Use the 🛵 Delivery Dispatch button with items in cart to send orders to a rider.</p></div>
                    )}
                  </div>
                </>
              ) : panel === 'ledger' ? (
                <table className="w-full text-xs bg-white"><thead className="bg-[#6b8799] text-white"><tr><th className="p-2 text-left">Code</th><th className="p-2 text-left">Product</th><th className="p-2">Category</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Stock</th><th className="p-2">Status</th></tr></thead><tbody>{products.map(product => <tr key={product.id} className="border-b"><td className="p-2 font-mono">{product.id}</td><td className="p-2 font-bold">{product.name}</td><td className="p-2 text-center">{product.category}</td><td className="p-2 text-right">{product.price.toFixed(2)}</td><td className="p-2 text-right">{product.stock}</td><td className="p-2 text-center">{product.status}</td></tr>)}</tbody></table>
              ) : (
                <div className="space-y-2">{(panel === 'holds' ? heldBills : sales).map(record => <div key={`${panel}-${record.id}-${record.date}`} className="pos-panel-card bg-white border border-[#a6b5bf] p-3 flex items-center justify-between"><div><b>Bill #{record.id}</b><p className="text-xs text-gray-500">{record.date} - {record.customer} - {record.status}</p></div><div className="flex items-center gap-2"><b>{formatMoney(record.total)}</b>{panel === 'holds' ? <><button onClick={() => recallHold(record)} className="px-3 py-2 bg-[#2677a2] text-white text-xs font-bold">Recall</button><button onClick={() => setHeldBills(current => current.filter(item => item !== record))} className="p-2 bg-red-600 text-white"><Trash2 className="w-4 h-4" /></button></> : <><button onClick={() => setReceipt(record)} className="px-3 py-2 bg-[#2677a2] text-white text-xs font-bold">Receipt</button>{record.status === 'PAID' && <button onClick={() => loadReturn(record)} className="px-3 py-2 bg-[#b16b25] text-white text-xs font-bold">Return</button>}</>}</div></div>)}{!(panel === 'holds' ? heldBills : sales).length && <p className="py-12 text-center text-gray-500">No records available</p>}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showOrderDetail && (
        <div className="fixed inset-0 z-[85] bg-black/70 flex items-center justify-center p-4">
          <div className="pos-modal w-full max-w-lg max-h-[85vh] bg-[#e8eef2] border-2 border-[#376b8a] shadow-2xl flex flex-col">
            <div className="h-11 px-4 bg-[#245f84] text-white flex items-center justify-between"><b>Order Details - #{showOrderDetail.id}</b><button onClick={() => setShowOrderDetail(null)}><X className="w-4 h-4" /></button></div>
            <div className="p-4 overflow-auto space-y-3">
              <div className="flex items-center gap-2 flex-wrap"><span className={`px-2 py-0.5 text-[10px] font-black ${showOrderDetail.status === 'Confirmed' ? 'bg-amber-100 text-amber-700' : showOrderDetail.status === 'Processing' || showOrderDetail.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : showOrderDetail.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{showOrderDetail.status === 'Completed' ? '✔ Delivered' : showOrderDetail.status}</span>{showOrderDetail.priority && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black">{showOrderDetail.priority}</span>}{showOrderDetail.deliveryCharge !== undefined && showOrderDetail.deliveryCharge > 0 && <span className="text-[10px] font-bold text-[#2677a2]">🏠 Home Delivery</span>}</div>
              <div className="text-xs space-y-0.5"><p><b>Customer:</b> {showOrderDetail.customerName} - {showOrderDetail.customerPhone}</p><p><b>Address:</b> {showOrderDetail.address}</p><p><b>Store:</b> {showOrderDetail.storeName}</p><p><b>Payment:</b> {showOrderDetail.paymentMethod}</p><p><b>Placed:</b> {showOrderDetail.date} {showOrderDetail.time}</p></div>
              <table className="w-full text-xs bg-white border border-[#a6b5bf]"><thead className="bg-[#6b8799] text-white"><tr><th className="p-2 text-left">Item</th><th className="p-2">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{(showOrderDetail.items || []).map((it, idx) => <tr key={`${it.productId || it.name}-${idx}`} className="border-b"><td className="p-2">{it.name}</td><td className="p-2 text-center">{it.quantity}</td><td className="p-2 text-right">{it.price.toFixed(2)}</td><td className="p-2 text-right font-bold">{(it.price * it.quantity).toFixed(2)}</td></tr>)}</tbody></table>
              <div className="text-xs space-y-1 bg-white border border-[#a6b5bf] p-3"><div className="flex justify-between"><span>Subtotal</span><b>{formatMoney(showOrderDetail.amount - (showOrderDetail.deliveryCharge || 0))}</b></div>{showOrderDetail.deliveryCharge !== undefined && showOrderDetail.deliveryCharge > 0 && <div className="flex justify-between"><span>Delivery Fee</span><b>{formatMoney(showOrderDetail.deliveryCharge)}</b></div>}<div className="flex justify-between border-t pt-1"><span>NET TOTAL</span><b>{formatMoney(showOrderDetail.amount)}</b></div></div>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] max-h-[88vh] overflow-y-auto bg-white text-black shadow-2xl" id="pos-receipt">
            <div className="p-4 text-center border-b border-dashed border-gray-400">
              <h2 className="text-base font-black">THE NEXAGO BD</h2>
              <p className="text-[10px]">SMART POS PLUS - TAX INVOICE</p>
              <p className="text-[9px]">Bill #{receipt.id} - {receipt.date}</p>
            </div>
            <div className="px-4 py-2.5 text-xs">
              <p>Customer: <b>{receipt.customer}</b></p>
              {receipt.customerPhone && <p>Phone: <b>{receipt.customerPhone}</b></p>}
              <p>Salesman: <b>{receipt.salesman}</b></p>
            </div>
            {(receipt.delivery > 0 || receipt.address) && (
              <div className="px-4 pb-2.5 text-xs space-y-0.5 border-b border-dashed border-gray-400">
                <div className="flex justify-between"><span>Delivery Type</span><b>🏠 Home Delivery</b></div>
                <div className="flex justify-between"><span>Order Response</span><b>✔ Confirmed</b></div>
                {receipt.priority && <div className="flex justify-between"><span>Delivery Mode</span><b>{receipt.priority}</b></div>}
                {receipt.address && <p className="pt-1">Deliver to: <b>{receipt.address}</b></p>}
                <div className="flex justify-between"><span>Est. Delivery</span><b>{receipt.priority === 'Express' ? '20 min' : receipt.priority === 'Urgent' ? '15 min' : '30 min'}</b></div>
              </div>
            )}
            <table className="w-full text-xs"><thead className="border-y border-dashed border-gray-400"><tr><th className="p-2 text-left">Item</th><th>Qty</th><th className="text-right">Amount</th></tr></thead><tbody>{receipt.lines.map((line, index) => <tr key={`${line.product.id}-${index}`}><td className="p-2">{line.product.name}</td><td className="text-center">{line.qty}</td><td className="text-right pr-2">{(line.rate * line.qty).toFixed(2)}</td></tr>)}</tbody></table>
            <div className="p-4 border-t border-dashed border-gray-400 space-y-1 text-xs"><div className="flex justify-between"><span>Subtotal</span><b>{formatMoney(receipt.subtotal)}</b></div><div className="flex justify-between"><span>Discount</span><b>{formatMoney(receipt.discount)}</b></div><div className="flex justify-between"><span>Tax</span><b>{formatMoney(receipt.tax)}</b></div>{receipt.delivery > 0 && <div className="flex justify-between"><span>Delivery Fee</span><b>{formatMoney(receipt.delivery)}</b></div>}<div className="flex justify-between text-base border-t pt-2"><b>NET TOTAL</b><b>{formatMoney(receipt.total)}</b></div><div className="flex justify-between"><span>Payment</span><b>{receipt.payment}</b></div></div>
            <div className="px-4 pb-4 border-t border-dashed border-gray-400">
              <div className="pt-3">
                <PosBarcode value={receipt.id} />
                <p className="text-center text-[9px] font-mono tracking-[0.25em] mt-1">{receipt.id}</p>
              </div>
              <div className="mt-2 flex items-center justify-center gap-3">
                <QRCodeSVG
                  value={JSON.stringify({ bill: receipt.id, total: receipt.total, payment: receipt.payment, customer: receipt.customer })}
                  size={64}
                  level="M"
                  includeMargin
                />
                <div className="text-[9px] leading-4">
                  <p className="font-black">SCAN BILL QR</p>
                  <p>Bill: {receipt.id}</p>
                  <p>Total: {formatMoney(receipt.total)}</p>
                  <p>{receipt.status}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 no-print"><button onClick={() => window.print()} className="h-11 bg-[#275f80] text-white font-bold flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Print</button><button onClick={() => setReceipt(null)} className="h-11 bg-[#2f8e4b] text-white font-bold">New Sale</button></div>
          </div>
        </div>
      )}

      {errorPopup && (
        <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-[95] px-4 py-2 border text-white text-xs font-bold rounded-lg shadow-xl whitespace-nowrap ${errorPopup.type === 'error' ? 'bg-[#7f1d1d] border-[#dc2626]' : 'bg-[#166534] border-[#22c55e]'}`}>{errorPopup.msg}</div>
      )}
    </div>
  );
}

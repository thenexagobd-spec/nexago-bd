/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Filter, Trash2, Check, Clock, X, Copy, Edit3, Download, 
  ChevronRight, ChevronLeft, RefreshCw, AlertTriangle, Database, Activity, 
  FileText, Layers, FileSpreadsheet, DollarSign, Package, TrendingUp, CheckCircle, ArrowUpRight
} from 'lucide-react';

export interface InventoryItem {
  id: string;
  name: string;
  store: string;
  category: string;
  stock: number;
  maxCapacity: number;
  unit: string;
  price: number;
  reorderPoint: number;
  status: 'Healthy' | 'Low Stock' | 'Reorder Needed' | 'In Transit';
  lastAudited: string;
  supplier: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  item: string;
  action: string;
  change: string;
  operator: string;
}

const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'INV-301', name: 'Premium Fuji Apples', store: 'Fresh Mart', category: 'Fruits & Vegetables', stock: 4, maxCapacity: 100, unit: 'kg', price: 280, reorderPoint: 20, status: 'Low Stock', lastAudited: 'May 26, 2024 11:20 AM', supplier: 'Dhaka Agro Importers' },
  { id: 'INV-302', name: 'Miniket Rice Premium', store: 'Daily Grocery', category: 'Rice & Grains', stock: 35, maxCapacity: 150, unit: 'kg', price: 76, reorderPoint: 30, status: 'Healthy', lastAudited: 'May 26, 2024 10:45 AM', supplier: 'Dinajpur Rice Mills' },
  { id: 'INV-303', name: 'Organic Fresh Farm Eggs', store: 'Green Basket', category: 'Dairy & Eggs', stock: 80, maxCapacity: 200, unit: 'doz', price: 145, reorderPoint: 25, status: 'Healthy', lastAudited: 'May 26, 2024 09:10 AM', supplier: 'Tejgaon Egg Depot' },
  { id: 'INV-304', name: 'Aarong Whole Milk 1L', store: 'Super Shop', category: 'Dairy & Eggs', stock: 0, maxCapacity: 120, unit: 'pcs', price: 95, reorderPoint: 15, status: 'Reorder Needed', lastAudited: 'May 25, 2024 06:15 PM', supplier: 'Brac Dairy Farm' },
  { id: 'INV-305', name: 'Coca-Cola Can 250ml', store: 'Save Mart', category: 'Beverages', stock: 12, maxCapacity: 150, unit: 'pcs', price: 45, reorderPoint: 30, status: 'Low Stock', lastAudited: 'May 26, 2024 08:30 AM', supplier: 'Coke Bottling Bangladesh' },
  { id: 'INV-306', name: 'Fresh Cavendish Bananas', store: 'Fresh Mart', category: 'Fruits & Vegetables', stock: 110, maxCapacity: 150, unit: 'pcs', price: 8, reorderPoint: 20, status: 'Healthy', lastAudited: 'May 26, 2024 07:15 AM', supplier: 'Narsingdi Fruit Market' },
  { id: 'INV-307', name: 'Jasmine Rice Fragrant', store: 'Daily Grocery', category: 'Rice & Grains', stock: 8, maxCapacity: 80, unit: 'kg', price: 150, reorderPoint: 15, status: 'Low Stock', lastAudited: 'May 25, 2024 04:22 PM', supplier: 'Importers Ltd' },
  { id: 'INV-308', name: 'Pran Mango Juice 1L', store: 'Green Basket', category: 'Beverages', stock: 45, maxCapacity: 100, unit: 'pcs', price: 120, reorderPoint: 15, status: 'Healthy', lastAudited: 'May 26, 2024 12:05 PM', supplier: 'PRAN Foods Corp' },
  { id: 'INV-309', name: 'Brown Sliced Bread 400g', store: 'Super Shop', category: 'Bakery', stock: 18, maxCapacity: 50, unit: 'pcs', price: 65, reorderPoint: 10, status: 'Healthy', lastAudited: 'May 26, 2024 09:55 AM', supplier: 'Bun-O-King Bakery' },
  { id: 'INV-310', name: 'Pure Clover Honey 500g', store: 'Save Mart', category: 'Bakery', stock: 2, maxCapacity: 40, unit: 'pcs', price: 480, reorderPoint: 8, status: 'Low Stock', lastAudited: 'May 24, 2024 03:40 PM', supplier: 'Sunderbans Honey Traders' },
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  { id: 'LOG-901', timestamp: 'May 26, 11:45 AM', item: 'Aarong Whole Milk 1L', action: 'Requested Restock', change: 'Status set to Transit', operator: 'Auto-Trigger (System)' },
  { id: 'LOG-902', timestamp: 'May 26, 10:30 AM', item: 'Premium Fuji Apples', action: 'Manual Inventory Edit', change: 'Stock decreased 25 -> 4', operator: 'Asif Rahman' },
  { id: 'LOG-903', timestamp: 'May 26, 09:15 AM', item: 'Organic Fresh Farm Eggs', action: 'Audit Complete', change: 'Stock updated to 80', operator: 'Monirul Islam' },
  { id: 'LOG-904', timestamp: 'May 25, 05:40 PM', item: 'Miniket Rice Premium', action: 'Batch Restock Delivery', change: 'Stock increased +50 units', operator: 'Nusrat Jahan' },
];

interface InventoryViewProps {
  onAddNotification?: (notifData: { title: string; message: string; type: 'order' | 'system' | 'driver' | 'payment' }) => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
  products?: Array<{ id: string; name: string; category: string; stock: number; price: number; status: string }>;
  onProductsChange?: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; category: string; stock: number; price: number; status: string }>>>;
}

export default function InventoryView({ onAddNotification, showToast, products, onProductsChange }: InventoryViewProps) {
  // Persistence States
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const local = localStorage.getItem('sd_inventory_v2');
    return local ? JSON.parse(local) : DEFAULT_INVENTORY_ITEMS;
  });

  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const local = localStorage.getItem('sd_inventory_logs');
    return local ? JSON.parse(local) : DEFAULT_AUDIT_LOGS;
  });

  // Active Tab: Live Inventory or Audit Logs
  const [activeTab, setActiveTab] = useState<'live' | 'logs'>('live');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Healthy' | 'Low Stock' | 'Reorder Needed' | 'In Transit'>('All');
  const [storeFilter, setStoreFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Interactive Form Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formStore, setFormStore] = useState('Fresh Mart');
  const [formCategory, setFormCategory] = useState('Fruits & Vegetables');
  const [formStock, setFormStock] = useState<number>(50);
  const [formMaxCap, setFormMaxCap] = useState<number>(100);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formPrice, setFormPrice] = useState<number>(100);
  const [formReorder, setFormReorder] = useState<number>(15);
  const [formSupplier, setFormSupplier] = useState('');

  // Bulk Operations Simulation
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Advanced States
  const [isAuditModeActive, setIsAuditModeActive] = useState(false);
  const [currentAuditor, setCurrentAuditor] = useState('S. Rahman (Senior Auditor)');
  const [isSimulatingSales, setIsSimulatingSales] = useState(false);
  const [isBulkRestocking, setIsBulkRestocking] = useState(false);
  const [customVibeTip, setCustomVibeTip] = useState('Tip: Click "Simulate Shift Sales" to run automated retail volume tests.');

  // Save changes to localstorage
  useEffect(() => {
    localStorage.setItem('sd_inventory_v2', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('sd_inventory_logs', JSON.stringify(logs));
  }, [logs]);

  // Sync inventory levels into the shared App product catalog so the customer
  // storefront shows live price/stock changes made here.
  useEffect(() => {
    if (!onProductsChange) return;
    onProductsChange(prev => {
      const map = new Map<string, { id: string; name: string; category: string; stock: number; price: number; status: string }>();
      for (const p of prev) map.set(p.name.toLowerCase(), p);
      for (const it of items) {
        const key = it.name.toLowerCase();
        const existing = map.get(key);
        const status = it.stock === 0 ? 'Out of Stock' : (it.stock <= it.reorderPoint ? 'Low Stock' : 'In Stock');
        if (existing) {
          map.set(key, { ...existing, price: it.price, stock: it.stock, status });
        } else {
          map.set(key, { id: it.id, name: it.name, category: it.category, stock: it.stock, price: it.price, status });
        }
      }
      return Array.from(map.values());
    });
  }, [items, onProductsChange]);

  // Dynamic status mapper based on levels
  const calculateStatus = (stock: number, reorder: number): InventoryItem['status'] => {
    if (stock === 0) return 'Reorder Needed';
    if (stock <= reorder) return 'Low Stock';
    return 'Healthy';
  };

  // Log action Helper
  const addNewLog = (itemName: string, action: string, change: string, operator: string = 'Admin') => {
    const newLog: AuditLog = {
      id: `LOG-${900 + logs.length + 1}`,
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      item: itemName,
      action,
      change,
      operator
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);
  };

  // Interactive Live Simulated Demand Engine
  const handleSimulateSales = () => {
    if (isSimulatingSales) return;
    setIsSimulatingSales(true);
    showToast('Running 24-Hour Retail Sales Simulation...', 'info');

    setTimeout(() => {
      let totalDeductions = 0;
      let triggeredAlerts: string[] = [];

      const simulatedItems = items.map(item => {
        // Only consume Healthy & Low Stock items
        if (item.stock > 0 && item.status !== 'In Transit') {
          // Consume between 5% to 25% of stock
          const consumeAmount = Math.ceil(item.stock * (Math.random() * 0.20 + 0.05));
          const nextStock = Math.max(item.stock - consumeAmount, 0);
          const nextStatus = calculateStatus(nextStock, item.reorderPoint);
          
          totalDeductions += consumeAmount;

          if (nextStatus !== item.status) {
            triggeredAlerts.push(item.name);
          }

          // Automatically record sales in audit logs
          if (consumeAmount > 0) {
            addNewLog(
              item.name, 
              'Automated Retail Sales Deduct', 
              `Sold -${consumeAmount} ${item.unit} (Stock: ${item.stock} -> ${nextStock})`,
              'POS Terminal #4'
            );
          }

          return {
            ...item,
            stock: nextStock,
            status: nextStatus,
            lastAudited: 'Sales Sync: Just Now'
          };
        }
        return item;
      });

      setItems(simulatedItems);
      setIsSimulatingSales(false);
      showToast(`Simulation completed! Decremented ${totalDeductions} total units.`);

      if (triggeredAlerts.length > 0) {
        triggeredAlerts.forEach(alertName => {
          if (onAddNotification) {
            onAddNotification({
              title: 'Low Stock Triggered',
              message: `Simulated sales volume pushed ${alertName} below its minimum threshold.`,
              type: 'system'
            });
          }
        });
        showToast(`${triggeredAlerts.length} items fell below safe reorder thresholds!`, 'info');
      }

      // Rotate tips
      const tips = [
        'Forecast: Highly recommended to run "Bulk Restock" to avoid empty supermarket shelves.',
        'Auditor note: Perishable products must remain under clean climate-controlled logistics.',
        'Data Insight: Grocery categories have registered high demand volume this afternoon.',
        'Tip: Use the "Audit Mode" checklist to quickly stamp physical inventory levels.',
      ];
      setCustomVibeTip(tips[Math.floor(Math.random() * tips.length)]);
    }, 1200);
  };

  // Bulk Reorder restock action for all low/reorder status items in one click
  const handleBulkRestock = () => {
    const criticalItems = items.filter(i => i.status === 'Low Stock' || i.status === 'Reorder Needed');
    if (criticalItems.length === 0) {
      showToast('All items are currently Healthy or already In Transit!', 'info');
      return;
    }

    setIsBulkRestocking(true);
    showToast(`Dispatching logistics reorder pipeline for ${criticalItems.length} SKUs...`, 'info');

    setTimeout(() => {
      const updated = items.map(item => {
        if (item.status === 'Low Stock' || item.status === 'Reorder Needed') {
          addNewLog(item.name, 'Bulk Reorder Triggered', `Status changed to In Transit via Auto-Procurement`, 'System Dispatcher');
          return {
            ...item,
            status: 'In Transit' as const,
            lastAudited: 'Auto Procurement'
          };
        }
        return item;
      });

      setItems(updated);
      setIsBulkRestocking(false);
      showToast('Logistics orders dispatched successfully for all depleted stock items!');
      
      if (onAddNotification) {
        onAddNotification({
          title: 'Bulk Dispatch Completed',
          message: `Dispatched automated reorders for ${criticalItems.length} items to partner distribution hubs.`,
          type: 'system'
        });
      }
    }, 1000);
  };

  // Verify Floor item manually
  const handleVerifyFloorItem = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        addNewLog(item.name, 'Physical Audit Verified', 'Stock levels confirmed correct by physical check', currentAuditor);
        return {
          ...item,
          lastAudited: `Checked by ${currentAuditor.split(' ')[0]} Just Now`
        };
      }
      return item;
    });

    setItems(updated);
    showToast(`SKU ${id} confirmed physically correct!`);
  };

  // Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSupplier) {
      showToast('Please fill in all required fields.', 'info');
      return;
    }

    const itemStatus = calculateStatus(Number(formStock), Number(formReorder));
    const newItem: InventoryItem = {
      id: `INV-${300 + items.length + 1}`,
      name: formName,
      store: formStore,
      category: formCategory,
      stock: Number(formStock),
      maxCapacity: Number(formMaxCap),
      unit: formUnit,
      price: Number(formPrice),
      reorderPoint: Number(formReorder),
      status: itemStatus,
      lastAudited: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      supplier: formSupplier,
    };

    setItems([...items, newItem]);
    addNewLog(formName, 'Registered New SKU', `Stock: ${formStock} ${formUnit} added`);
    
    if (onAddNotification) {
      onAddNotification({
        title: 'Inventory Registered', 
        message: `New inventory SKU [${newItem.id}] ${formName} was registered at ${formStore}.`, 
        type: 'system'
      });
    }

    setIsAddModalOpen(false);
    resetForm();
    showToast(`Inventory item registered successfully!`);
  };

  // Edit Item Stock Levels
  const handleEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const newStock = Number(formStock);
    const newReorder = Number(formReorder);
    const newStatus = calculateStatus(newStock, newReorder);

    const updatedItems = items.map(item => {
      if (item.id === selectedItem.id) {
        const stockDiff = newStock - item.stock;
        const changeStr = stockDiff === 0 ? 'Edited attributes' : `Stock adjusted (${item.stock} -> ${newStock})`;
        
        addNewLog(item.name, 'Manual Stock Adjustment', changeStr);
        return {
          ...item,
          stock: newStock,
          reorderPoint: newReorder,
          price: Number(formPrice),
          status: newStatus,
          lastAudited: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return item;
    });

    setItems(updatedItems);
    setIsEditModalOpen(false);
    showToast(`Stock levels updated for ${selectedItem.name}`);
    setSelectedItem(null);
  };

  // Quick Inline Increment
  const handleIncrementStock = (id: string, step: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const nextStock = Math.min(item.stock + step, item.maxCapacity);
        const nextStatus = item.status === 'In Transit' ? 'In Transit' : calculateStatus(nextStock, item.reorderPoint);
        addNewLog(item.name, 'Quick Stock Addition', `Stock added +${step} (${item.stock} -> ${nextStock})`);
        return {
          ...item,
          stock: nextStock,
          status: nextStatus,
          lastAudited: 'Just Now'
        };
      }
      return item;
    });
    setItems(updated);
    showToast('Stock count adjusted (+)');
  };

  // Quick Inline Decrement
  const handleDecrementStock = (id: string, step: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const nextStock = Math.max(item.stock - step, 0);
        const nextStatus = calculateStatus(nextStock, item.reorderPoint);
        addNewLog(item.name, 'Quick Stock Deduct', `Stock deducted -${step} (${item.stock} -> ${nextStock})`);
        return {
          ...item,
          stock: nextStock,
          status: nextStatus,
          lastAudited: 'Just Now'
        };
      }
      return item;
    });
    setItems(updated);
    showToast('Stock count adjusted (-)');
  };

  // Dispatch Restock Reorder Request
  const handleDispatchRestock = (id: string) => {
    setIsLoading(id);
    
    setTimeout(() => {
      const updated = items.map(item => {
        if (item.id === id) {
          addNewLog(item.name, 'Dispatched Supplier Order', `Triggered restock. Status: In Transit`);
          if (onAddNotification) {
            onAddNotification({
              title: 'Restock Dispatched', 
              message: `Logistics pipeline triggered. Bulk shipment requested for ${item.name} from ${item.supplier}.`, 
              type: 'system'
            });
          }
          return {
            ...item,
            status: 'In Transit' as const,
            lastAudited: 'Restock Requested'
          };
        }
        return item;
      });
      setItems(updated);
      setIsLoading(null);
      showToast('Supplier restock order dispatched successfully!');
    }, 1000);
  };

  // Receive Restock Transit
  const handleReceiveRestock = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const nextStock = item.maxCapacity;
        addNewLog(item.name, 'Received Shipment', `Fully restocked to ${nextStock} units`);
        return {
          ...item,
          stock: nextStock,
          status: 'Healthy' as const,
          lastAudited: 'Just Now'
        };
      }
      return item;
    });
    setItems(updated);
    showToast('Shipment received and added to inventory ledger!');
  };

  // Delete SKU from inventory
  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name} [${id}] from the active ledger?`)) {
      setItems(items.filter(item => item.id !== id));
      addNewLog(name, 'Removed SKU', 'Item deleted from ledger');
      showToast(`SKU ${id} removed.`);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormStore('Fresh Mart');
    setFormCategory('Fruits & Vegetables');
    setFormStock(50);
    setFormMaxCap(100);
    setFormUnit('pcs');
    setFormPrice(100);
    setFormReorder(15);
    setFormSupplier('');
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormName(item.name);
    setFormStore(item.store);
    setFormCategory(item.category);
    setFormStock(item.stock);
    setFormMaxCap(item.maxCapacity);
    setFormUnit(item.unit);
    setFormPrice(item.price);
    setFormReorder(item.reorderPoint);
    setFormSupplier(item.supplier);
    setIsEditModalOpen(true);
  };

  // Export CSV fully functioning
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Audit ID,Item Name,Outlet Store,Category,Stock Available,Max Capacity,Unit,Price (BDT),Reorder Point,Status,Supplier\n';
    
    items.forEach(item => {
      const row = `"${item.id}","${item.name}","${item.store}","${item.category}",${item.stock},${item.maxCapacity},"${item.unit}",${item.price},${item.reorderPoint},"${item.status}","${item.supplier}"`;
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exporting spreadsheet CSV report...', 'success');
  };

  // FILTER LOGIC
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                          item.id.toLowerCase().includes(search.toLowerCase()) ||
                          item.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesStore = storeFilter === 'All' || item.store === storeFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesStore && matchesCategory;
  });

  // Calculate high-level audit summary metrics
  const totalSKUs = items.length;
  const lowStockCount = items.filter(i => i.status === 'Low Stock').length;
  const depletedCount = items.filter(i => i.status === 'Reorder Needed').length;
  const transitCount = items.filter(i => i.status === 'In Transit').length;
  const totalAssetValue = items.reduce((sum, item) => sum + (item.stock * item.price), 0);
  const healthRate = Math.round(((totalSKUs - (lowStockCount + depletedCount)) / totalSKUs) * 100) || 100;

  // Render SVG Pie/Donut Chart details for advanced look
  const categoryCounts = items.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.stock;
    return acc;
  }, {} as Record<string, number>);

  const chartColors: Record<string, string> = {
    'Fruits & Vegetables': '#e11d48', // rose
    'Rice & Grains': '#f59e0b', // amber
    'Dairy & Eggs': '#10b981', // emerald
    'Beverages': '#3b82f6', // blue
    'Bakery': '#a855f7', // purple
  };

  return (
    <div className="space-y-6 fade-in">
      
      {/* HEADER TITLE PANEL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-bold flex items-center">
              <Database className="w-3.5 h-3.5 mr-1" />
              Active System Log
            </span>
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider mt-1">Real-Time Inventory Audit</h2>
          <p className="text-xs text-gray-400">Manage, audit, and restock perishable inventory across multi-partner supermarket centers</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Export and Add triggers */}
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-brand-dark hover:bg-brand-dark/80 text-gray-300 hover:text-white border border-brand-border rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-gray-400" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={openAddModal}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New SKU</span>
          </button>
        </div>
      </div>

      {/* ADVANCED AUTOMATION & SIMULATION COMMAND DECK */}
      <div className="bg-gradient-to-r from-brand-card to-brand-card/40 border border-brand-border/90 rounded-2xl p-4.5 shadow-2xl relative overflow-hidden">
        
        {/* Glow effect backdrops */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-brand-orange/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-36 h-36 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          
          {/* Controls section */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
              <span className="text-[11px] font-black text-brand-orange uppercase tracking-widest">Simulation & Control Deck</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              {/* Action 1: POS Sales simulator */}
              <button
                onClick={handleSimulateSales}
                disabled={isSimulatingSales}
                className={`flex items-center justify-center space-x-2.5 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                  isSimulatingSales 
                    ? 'bg-brand-orange/20 border-brand-orange/40 text-brand-orange' 
                    : 'bg-brand-dark/90 hover:bg-brand-dark border-brand-border hover:border-brand-orange text-white'
                }`}
              >
                <Activity className={`w-4 h-4 text-brand-orange ${isSimulatingSales ? 'animate-spin' : ''}`} />
                <span className="truncate">{isSimulatingSales ? 'Simulating Shift...' : 'Simulate Shift Sales'}</span>
              </button>

              {/* Action 2: Bulk automated restock */}
              <button
                onClick={handleBulkRestock}
                disabled={isBulkRestocking}
                className={`flex items-center justify-center space-x-2.5 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                  isBulkRestocking 
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                    : 'bg-brand-dark/90 hover:bg-brand-dark border-brand-border hover:border-blue-400 text-white'
                }`}
              >
                <RefreshCw className={`w-4 h-4 text-blue-400 ${isBulkRestocking ? 'animate-spin' : ''}`} />
                <span className="truncate">{isBulkRestocking ? 'Dispatching...' : 'Bulk Smart Restock'}</span>
              </button>

              {/* Action 3: Floor Auditor toggle */}
              <div className="bg-brand-dark/60 rounded-xl border border-brand-border p-1.5 flex items-center justify-between">
                <div className="pl-1.5">
                  <div className="text-[9px] font-bold text-gray-500 uppercase">Checklist Mode</div>
                  <div className="text-[11px] font-black text-white">{isAuditModeActive ? 'ACTIVE' : 'OFFLINE'}</div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsAuditModeActive(!isAuditModeActive);
                    showToast(isAuditModeActive ? 'Auditor checklist mode disabled.' : 'Floor verification checklist unlocked!');
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAuditModeActive ? 'bg-brand-orange' : 'bg-gray-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isAuditModeActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* Settings Section (Auditor authority config) */}
          <div className="lg:w-80 bg-brand-dark/30 border border-brand-border/60 rounded-xl p-3 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase select-none">
              <span>Auditor Authority Designation</span>
              <span className="text-emerald-400">Authorized ✔</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={currentAuditor}
                onChange={(e) => {
                  setCurrentAuditor(e.target.value);
                  showToast(`Auditor profile switched to ${e.target.value}`);
                }}
                className="w-full bg-brand-dark text-xs text-white border border-brand-border rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-orange cursor-pointer font-semibold"
              >
                <option value="S. Rahman (Senior Auditor)">S. Rahman (Senior Auditor)</option>
                <option value="M. Hossain (Floor Lead)">M. Hossain (Floor Lead)</option>
                <option value="A. Chowdhury (Operations)">A. Chowdhury (Operations)</option>
                <option value="N. Sultana (QA Officer)">N. Sultana (QA Officer)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Dynamic Vibe and Warning Banner inside container */}
        <div className="mt-3 pt-3 border-t border-brand-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-gray-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 rounded bg-brand-orange/10 text-brand-orange text-[9px] font-black uppercase">Live Forecasting Info</span>
            <span className="font-semibold text-gray-300 animate-pulse">{customVibeTip}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-bold shrink-0">
            System Clock: <span className="font-mono text-white">2026-07-06 23:14 UTC</span>
          </div>
        </div>

      </div>

      {/* METRIC CARD RAIL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        
        {/* Metric 1: Health Rate */}
        <div className="bg-brand-card/50 border border-brand-border/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Inventory Health Rate</span>
              <div className="text-2xl font-black text-white mt-1">{healthRate}%</div>
            </div>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center font-bold mt-3">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>Satisfactory stock ratios</span>
          </div>
        </div>

        {/* Metric 2: Asset Valuation */}
        <div className="bg-brand-card/50 border border-brand-border/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Asset Valuation</span>
              <div className="text-2xl font-black text-brand-orange mt-1">৳ {totalAssetValue.toLocaleString('en-US')}</div>
            </div>
            <div className="p-1.5 bg-brand-orange/10 rounded-lg text-brand-orange">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-bold mt-3 flex items-center space-x-1">
            <span>Across all partner outlets</span>
          </div>
        </div>

        {/* Metric 3: Low Stock Alerts */}
        <div 
          onClick={() => { setStatusFilter('Low Stock'); setSearch(''); }}
          className={`bg-brand-card/50 border rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === 'Low Stock' ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border/60 hover:border-brand-border'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Low Stock Warnings</span>
              <div className="text-2xl font-black text-orange-400 mt-1">{lowStockCount} SKUs</div>
            </div>
            <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-[10px] text-orange-400 font-bold mt-3">
            <span>Click to isolate & restock</span>
          </div>
        </div>

        {/* Metric 4: Reorder Needed */}
        <div 
          onClick={() => { setStatusFilter('Reorder Needed'); setSearch(''); }}
          className={`bg-brand-card/50 border rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === 'Reorder Needed' ? 'border-red-500 bg-red-500/5' : 'border-brand-border/60 hover:border-brand-border'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Depleted items</span>
              <div className="text-2xl font-black text-red-500 mt-1">{depletedCount} Items</div>
            </div>
            <div className="p-1.5 bg-red-500/10 rounded-lg text-red-500">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[10px] text-red-400 font-bold mt-3">
            <span>Critical action needed</span>
          </div>
        </div>

      </div>

      {/* TWO TABS NAVIGATION PANEL */}
      <div className="flex items-center justify-between border-b border-brand-border/40 select-none">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('live')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
              activeTab === 'live' ? 'text-brand-orange font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Live Stock Ledger ({filteredItems.length})</span>
            {activeTab === 'live' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange rounded-full animate-in fade-in" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
              activeTab === 'logs' ? 'text-brand-orange font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Audit History Logs ({logs.length})</span>
            {activeTab === 'logs' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange rounded-full animate-in fade-in" />
            )}
          </button>
        </div>

        {transitCount > 0 && (
          <div className="mb-2 flex items-center space-x-1.5 px-2 py-0.8 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-lg border border-blue-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>{transitCount} Reorders Pending Transit</span>
          </div>
        )}
      </div>

      {/* CORE VIEWPORT SWITCH */}
      {activeTab === 'live' ? (
        <div className="space-y-4">
          
          {/* SEARCH, SLOTS & FILTER RAIL */}
          <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between bg-brand-card/30 border border-brand-border/60 p-4 rounded-xl">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              
              {/* Filter 1: Store selector */}
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 select-none">Store Outlet</label>
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="w-full bg-brand-dark text-xs text-white border border-brand-border/80 rounded-lg px-3 py-2 outline-none focus:border-brand-orange cursor-pointer"
                >
                  <option value="All">All Partner Outlets</option>
                  <option value="Fresh Mart">Fresh Mart</option>
                  <option value="Daily Grocery">Daily Grocery</option>
                  <option value="Green Basket">Green Basket</option>
                  <option value="Super Shop">Super Shop</option>
                  <option value="Save Mart">Save Mart</option>
                </select>
              </div>

              {/* Filter 2: Category Selector */}
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 select-none">Product Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-brand-dark text-xs text-white border border-brand-border/80 rounded-lg px-3 py-2 outline-none focus:border-brand-orange cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                  <option value="Rice & Grains">Rice & Grains</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Bakery">Bakery & Bread</option>
                </select>
              </div>

              {/* Filter 3: Stock Status */}
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 select-none">Stock Status Alerts</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-brand-dark text-xs text-white border border-brand-border/80 rounded-lg px-3 py-2 outline-none focus:border-brand-orange cursor-pointer"
                >
                  <option value="All">All Status Tiers</option>
                  <option value="Healthy">Healthy Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Reorder Needed">Reorder Needed</option>
                  <option value="In Transit">Pending Transit</option>
                </select>
              </div>

            </div>

            {/* Live Search and clear buttons */}
            <div className="flex items-end space-x-2 xl:w-80">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search item, SKU, supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange transition-all placeholder:text-gray-500"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {(statusFilter !== 'All' || storeFilter !== 'All' || categoryFilter !== 'All' || search) && (
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setStoreFilter('All');
                    setCategoryFilter('All');
                    setSearch('');
                  }}
                  className="p-2 bg-brand-dark hover:bg-brand-orange/10 text-xs text-gray-400 hover:text-brand-orange border border-brand-border rounded-lg transition-all shrink-0 cursor-pointer font-bold uppercase text-[10px]"
                >
                  Reset
                </button>
              )}
            </div>

          </div>

          {/* DYNAMIC METRIC/CHART DRAWER - Highly Professional Dashboard Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Visualizer Panel - custom responsive SVG chart for robust visualization */}
            <div className="bg-brand-card border border-brand-border/60 rounded-xl p-4 lg:col-span-2 select-none">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Departmental Stock Distribution</h3>
                  <p className="text-[10px] text-gray-400">Total available stock units categorized by product department</p>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-bold">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-Time Audit Sync</span>
                </div>
              </div>
              
              {/* Responsive SVG Chart */}
              <div className="h-44 w-full flex items-center justify-center bg-brand-dark/20 rounded-lg p-2">
                <div className="w-full max-w-lg h-full flex flex-col justify-between">
                  <div className="flex items-end justify-between h-28 px-4 border-b border-brand-border/30 pb-1">
                    {Object.entries(categoryCounts).map(([cat, count]) => {
                      const countsList = Object.values(categoryCounts) as number[];
                      const maxCount = Math.max(...countsList) || 1;
                      const heightPercent = Math.max(((count as number) / maxCount) * 100, 10);
                      const barColor = chartColors[cat] || '#f59e0b';
                      return (
                        <div key={cat} className="flex flex-col items-center flex-1 mx-2 group relative">
                          {/* Tooltip bubble */}
                          <div className="absolute -top-7 scale-0 group-hover:scale-100 transition-all duration-150 bg-brand-dark border border-brand-border text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg pointer-events-none z-10">
                            {count} units
                          </div>
                          <div 
                            style={{ height: `${heightPercent}%`, backgroundColor: barColor }} 
                            className="w-full rounded-t opacity-80 hover:opacity-100 transition-all shadow-md cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend labels */}
                  <div className="flex justify-between px-1 pt-2">
                    {Object.entries(categoryCounts).map(([cat]) => (
                      <div key={cat} className="flex items-center space-x-1 flex-1 justify-center">
                        <span style={{ backgroundColor: chartColors[cat] || '#f59e0b' }} className="w-2 h-2 rounded-full shrink-0" />
                        <span className="text-[9px] text-gray-400 font-semibold truncate max-w-[65px]" title={cat}>{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fulfillment Status Health Index Card */}
            <div className="bg-brand-card border border-brand-border/60 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Lead Supplier Audit</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold text-[10px]">Dinajpur Rice Mills</span>
                    <span className="text-emerald-400 font-mono font-bold">100% Reliable</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold text-[10px]">Tejgaon Egg Depot</span>
                    <span className="text-emerald-400 font-mono font-bold">98.5% Filled</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold text-[10px]">Brac Dairy Farm</span>
                    <span className="text-orange-400 font-mono font-bold">Latency Warning</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold text-[10px]">Dhaka Agro Importers</span>
                    <span className="text-red-400 font-mono font-bold">Critical Delay</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-brand-border/40 pt-3 mt-3 flex items-center justify-between text-[11px]">
                <span className="text-gray-400 font-semibold">Active Suppliers Checked:</span>
                <span className="text-white font-mono font-bold">8 Accounts</span>
              </div>
            </div>

          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-brand-card border border-brand-border/60 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead>
                  <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40 select-none">
                    <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">ID</th>
                    {isAuditModeActive && (
                      <th className="py-3.5 px-4 font-bold text-brand-orange tracking-wider uppercase text-[10px] animate-pulse">Floor Verification</th>
                    )}
                    <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Audit Item & Supplier</th>
                    <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Fulfillment Center</th>
                    <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Depart. Category</th>
                    <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Live Stock / Max Cap</th>
                    <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Est. Asset Value</th>
                    <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px]">Status</th>
                    <th className="py-3.5 px-4 font-bold text-gray-400 tracking-wider uppercase text-[10px] text-center">Interactive Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {filteredItems.map((item) => {
                    const capacityPercent = Math.round((item.stock / item.maxCapacity) * 100);
                    return (
                      <tr key={item.id} className={`hover:bg-brand-dark/20 transition-colors group ${item.lastAudited.includes('Checked by') ? 'bg-emerald-500/5' : ''}`}>
                        
                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-400">
                          #{item.id}
                        </td>

                        {/* Floor Verification Checklist column */}
                        {isAuditModeActive && (
                          <td className="py-3.5 px-4 animate-in fade-in slide-in-from-left-2 duration-300">
                            {item.lastAudited.includes('Checked by') ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>VERIFIED ✔</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleVerifyFloorItem(item.id)}
                                className="flex items-center space-x-1 px-2 py-1 bg-brand-orange/15 hover:bg-brand-orange text-brand-orange hover:text-white border border-brand-orange/30 rounded text-[10px] font-black uppercase transition-all cursor-pointer animate-pulse"
                              >
                                <Check className="w-3 h-3" />
                                <span>Match Floor</span>
                              </button>
                            )}
                          </td>
                        )}

                        {/* Name and Supplier */}
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="font-bold text-white text-sm">{item.name}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">Supplier: {item.supplier}</div>
                          </div>
                        </td>

                        {/* Store Outlet */}
                        <td className="py-3.5 px-4 text-gray-200 font-semibold text-[11px]">
                          {item.store}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-brand-dark text-gray-300 font-medium text-[10px] border border-brand-border">
                            {item.category}
                          </span>
                        </td>

                        {/* Live Stock progress bar */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5 max-w-[150px]">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-white">{item.stock} / {item.maxCapacity} {item.unit}</span>
                              <span className="text-gray-400 font-mono">{capacityPercent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-brand-dark rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.status === 'Healthy' ? 'bg-emerald-500' :
                                  item.status === 'Low Stock' ? 'bg-orange-500' :
                                  item.status === 'In Transit' ? 'bg-blue-500 animate-pulse' :
                                  'bg-red-500'
                                }`}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Asset Value */}
                        <td className="py-3.5 px-4 font-bold text-white text-[11px]">
                          ৳ {(item.stock * item.price).toLocaleString('en-US')}
                          <div className="text-[9px] text-gray-500 font-normal mt-0.5">৳ {item.price} per {item.unit}</div>
                        </td>

                        {/* Status badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.8 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            item.status === 'Low Stock' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            item.status === 'In Transit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {item.status === 'In Transit' && <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" />}
                            {item.status}
                          </span>
                        </td>

                        {/* Quick Interactive stock triggers */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center space-x-1.5 select-none">
                            
                            {/* Decrement */}
                            <button
                              onClick={() => handleDecrementStock(item.id, 5)}
                              className="w-6 h-6 rounded bg-brand-dark hover:bg-brand-border/40 text-gray-400 hover:text-white flex items-center justify-center font-black border border-brand-border text-xs cursor-pointer"
                              title="Decrease stock -5"
                              disabled={item.stock === 0}
                            >
                              -
                            </button>
                            
                            {/* Increment */}
                            <button
                              onClick={() => handleIncrementStock(item.id, 5)}
                              className="w-6 h-6 rounded bg-brand-dark hover:bg-brand-border/40 text-gray-400 hover:text-white flex items-center justify-center font-black border border-brand-border text-xs cursor-pointer"
                              title="Increase stock +5"
                              disabled={item.stock >= item.maxCapacity}
                            >
                              +
                            </button>

                            {/* Trigger Supplier Reorder Restock */}
                            {item.status === 'In Transit' ? (
                              <button
                                onClick={() => handleReceiveRestock(item.id)}
                                className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold transition-all cursor-pointer"
                                title="Click to acknowledge package delivery"
                              >
                                <Check className="w-3 h-3" />
                                <span>Receive</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDispatchRestock(item.id)}
                                disabled={isLoading === item.id}
                                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                                  item.status === 'Healthy'
                                    ? 'bg-brand-dark hover:bg-brand-dark/80 text-gray-400 border-brand-border'
                                    : 'bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border-brand-orange/30'
                                }`}
                              >
                                {isLoading === item.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ArrowUpRight className="w-3 h-3" />
                                )}
                                <span>Order Restock</span>
                              </button>
                            )}

                            {/* Edit parameters */}
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 bg-brand-dark hover:bg-brand-border text-gray-400 hover:text-white border border-brand-border rounded cursor-pointer"
                              title="Modify Stock Parameter Configurations"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>

                            {/* Delete SKU */}
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1.5 bg-brand-dark hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-brand-border rounded cursor-pointer"
                              title="Delete SKU from Active Ledger"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty ledger condition */}
            {filteredItems.length === 0 && (
              <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
                <Database className="w-10 h-10 text-gray-600 mb-1" />
                <p className="text-xs font-bold text-white">No Stock SKUs Found</p>
                <p className="text-[11px] text-gray-400">Try adjusting your filters, store selection, or search query.</p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* AUDIT LOGS HISTORY PANEL */
        <div className="space-y-4">
          
          <div className="flex justify-between items-center bg-brand-card/30 border border-brand-border/60 p-4 rounded-xl">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Historical Audit Logs</h3>
              <p className="text-[10px] text-gray-400">Verifiable logging of all stock deductions, manual edits, and supplier restocks</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Clear audit history logs?')) {
                  setLogs([]);
                  showToast('Logs cleared.');
                }
              }}
              className="text-[10px] font-black text-red-400 hover:underline cursor-pointer uppercase"
              disabled={logs.length === 0}
            >
              Clear Logs
            </button>
          </div>

          <div className="bg-brand-card border border-brand-border/60 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-brand-dark/40 border-b border-brand-border/40 text-gray-400 select-none">
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Audit ID</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Timestamp</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Audit Item</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Action Dispatched</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Deduction / Addition Change</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Operator Authority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-brand-dark/10 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-500">#{log.id}</td>
                      <td className="py-3 px-4 text-gray-400">{log.timestamp}</td>
                      <td className="py-3 px-4 font-bold text-white">{log.item}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          log.action.includes('Request') || log.action.includes('Dispatched') ? 'bg-brand-orange/10 text-brand-orange' :
                          log.action.includes('Manual') ? 'bg-orange-500/10 text-orange-400' :
                          log.action.includes('Received') ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-semibold">{log.change}</td>
                      <td className="py-3 px-4 text-gray-400 font-bold">{log.operator}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 text-xs">
                        No recent inventory audits recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: REGISTER NEW SKU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            
            <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-dark/20">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Register SKU to Stock Ledger</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-4 space-y-4 text-left">
              
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Item Title / Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Miniket Rice 5kg"
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Supermarket Outlet</label>
                  <select
                    value={formStore}
                    onChange={(e) => setFormStore(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="Fresh Mart">Fresh Mart</option>
                    <option value="Daily Grocery">Daily Grocery</option>
                    <option value="Green Basket">Green Basket</option>
                    <option value="Super Shop">Super Shop</option>
                    <option value="Save Mart">Save Mart</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Rice & Grains">Rice & Grains</option>
                    <option value="Dairy & Eggs">Dairy & Eggs</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Bakery">Bakery & Bread</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Current Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Max Capacity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formMaxCap}
                    onChange={(e) => setFormMaxCap(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Stock Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="doz">dozen</option>
                    <option value="ltr">liter</option>
                    <option value="pkt">packet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Unit Price (৳ BDT)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Reorder Point Alert</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formReorder}
                    onChange={(e) => setFormReorder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Supplier Company Name *</label>
                <input
                  type="text"
                  required
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  placeholder="e.g. Pran-RFL Group"
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Register SKU
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SKU STOCK & PRICE PARAMETERS */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-sm w-full overflow-hidden shadow-2xl">
            
            <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-dark/20">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Audit Parameters for SKU</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditItem} className="p-4 space-y-4 text-left">
              
              <div>
                <h4 className="text-white font-black text-sm">{selectedItem.name}</h4>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">SKU ID: {selectedItem.id} | Outlet: {selectedItem.store}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Adjust Current Stock Count ({selectedItem.unit})</label>
                <input
                  type="number"
                  required
                  min="0"
                  max={selectedItem.maxCapacity}
                  value={formStock}
                  onChange={(e) => setFormStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
                <p className="text-[9px] text-gray-500 mt-1">Maximum authorized capacity is {selectedItem.maxCapacity} {selectedItem.unit}.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Unit Price (৳ BDT)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Reorder Point Threshold</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formReorder}
                    onChange={(e) => setFormReorder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 font-bold block mb-1">Audit Supplier Detail:</span>
                <div className="p-2.5 rounded bg-brand-dark border border-brand-border text-xs text-gray-300">
                  <span className="font-bold text-white block">{selectedItem.supplier}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Last audit completed at: {selectedItem.lastAudited}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Apply Audit Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

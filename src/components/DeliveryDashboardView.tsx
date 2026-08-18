import React, { useState, useMemo } from 'react';
import { Order, Driver, Zone, Vehicle, SystemNotification, DriverDutyStatus, DriverStatusLog } from '../types';
import { 
  Truck, Users, MapPin, Activity, CheckCircle2, AlertCircle, 
  Clock, Navigation, Sparkles, RefreshCw, Send, ArrowRight, Check,
  Zap, Crosshair, Sliders, ShieldCheck, Star, X, Info, Layers, Maximize2, BarChart2
} from 'lucide-react';
import { 
  rankDriversForOrder, 
  findBestDriverForOrder, 
  autoAssignAllPendingOrders, 
  getOrderCoordinates, 
  getDriverCoordinates, 
  DriverMatchResult 
} from '../utils/autoAssign';
import { D3HeatmapOverlay } from './D3HeatmapOverlay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DeliveryDashboardViewProps {
  orders: Order[];
  drivers: Driver[];
  zones: Zone[];
  vehicles: Vehicle[];
  notifications: SystemNotification[];
  onUpdateOrderStatus: (updatedOrder: Order) => void;
  onUpdateDriver?: (updatedDriver: Driver) => void;
  isTightMode?: boolean;
}

export const DeliveryDashboardView: React.FC<DeliveryDashboardViewProps> = ({
  orders,
  drivers,
  zones,
  vehicles,
  notifications,
  onUpdateOrderStatus,
  onUpdateDriver,
  isTightMode = false
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [activeDriverFilter, setActiveDriverFilter] = useState<'All' | 'Online' | 'Offline'>('Online');
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string | null>(null);

  // Auto-Assign State
  const [assignStrategy, setAssignStrategy] = useState<'distance' | 'eta' | 'balanced'>('distance');
  const [autoAssignModalOrder, setAutoAssignModalOrder] = useState<Order | null>(null);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [hoveredMatchCandidate, setHoveredMatchCandidate] = useState<DriverMatchResult | null>(null);
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Heatmap State
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState<'orders' | 'drivers' | 'imbalance' | 'combined'>('combined');
  const [heatmapPalette, setHeatmapPalette] = useState<'inferno' | 'turbo' | 'plasma' | 'amber' | 'emerald'>('inferno');
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.65);
  const [showHeatmapHotspots, setShowHeatmapHotspots] = useState(true);

  // Driver Insights State
  const [selectedInsightsDriver, setSelectedInsightsDriver] = useState<Driver | null>(null);

  const onlineDrivers = drivers.filter(d => d.status === 'Online');
  const ongoingDeliveries = orders.filter(o => o.status === 'Ongoing');
  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Processing');
  const completedOrdersCount = orders.filter(o => o.status === 'Completed').length;

  const showDashboardToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setLocalToast({ message: msg, type });
    setTimeout(() => setLocalToast(null), 4000);
  };

  // Dispatch a single driver manually
  const handleAssignDriver = (orderId: string, driver: Driver) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (orderToUpdate) {
      onUpdateOrderStatus({
        ...orderToUpdate,
        status: 'Ongoing',
        driverId: driver.id
      });

      // Update driver duty status if online
      if (driver.status === 'Online' && onUpdateDriver) {
        const now = new Date();
        const formattedTime = `Today, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        const newLog: DriverStatusLog = {
          id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
          status: 'On-Delivery',
          timestamp: now.toISOString(),
          formattedTime,
          reason: `Assigned order #${orderId} (${orderToUpdate.storeName})`,
          updatedBy: 'Dispatch Control Desk',
          location: orderToUpdate.address
        };

        onUpdateDriver({
          ...driver,
          status: 'On-Delivery',
          statusHistory: [newLog, ...(driver.statusHistory || [])]
        });
      }

      setAssigningOrderId(null);
      setSelectedDriverId('');
      showDashboardToast(`Dispatched #${orderId} to ${driver.name}`, 'success');
    }
  };

  // Auto-Assign a specific order to matched driver
  const handleAutoAssignSingle = (order: Order, matchResult?: DriverMatchResult) => {
    const bestMatch = matchResult || findBestDriverForOrder(order, drivers, assignStrategy);
    if (!bestMatch) {
      showDashboardToast(`No eligible online driver available for #${order.id}.`, 'info');
      return;
    }

    const { driver, distanceKm, etaMinutes, matchScore } = bestMatch;

    onUpdateOrderStatus({
      ...order,
      status: 'Ongoing',
      driverId: driver.id
    });

    if (onUpdateDriver) {
      const now = new Date();
      const formattedTime = `Today, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      const newLog: DriverStatusLog = {
        id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
        status: 'On-Delivery',
        timestamp: now.toISOString(),
        formattedTime,
        reason: `Auto-assigned #${order.id} (${distanceKm} km away, ${etaMinutes}m ETA)`,
        updatedBy: 'Smart Auto-Assign Algorithm',
        location: order.address
      };

      onUpdateDriver({
        ...driver,
        status: 'On-Delivery',
        statusHistory: [newLog, ...(driver.statusHistory || [])]
      });
    }

    setAutoAssignModalOrder(null);
    setHoveredMatchCandidate(null);
    showDashboardToast(`⚡ Auto-assigned #${order.id} to ${driver.name} (${distanceKm} km away, ${matchScore}% match)`, 'success');
  };

  // Batch Auto-Assign all pending orders simultaneously
  const handleBatchAutoAssignAll = () => {
    const batchResult = autoAssignAllPendingOrders(orders, drivers, assignStrategy);
    
    if (batchResult.assignments.length === 0) {
      showDashboardToast('No pending orders matched with available online drivers.', 'info');
      setIsBatchAssignModalOpen(false);
      return;
    }

    let assignedCount = 0;
    batchResult.assignments.forEach(({ order, driver, match }) => {
      onUpdateOrderStatus({
        ...order,
        status: 'Ongoing',
        driverId: driver.id
      });

      if (onUpdateDriver) {
        const now = new Date();
        const formattedTime = `Today, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        const newLog: DriverStatusLog = {
          id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
          status: 'On-Delivery',
          timestamp: now.toISOString(),
          formattedTime,
          reason: `Batch Auto-Assigned #${order.id} (${match.distanceKm} km, ${match.etaMinutes}m ETA)`,
          updatedBy: 'Batch Dispatch Optimizer',
          location: order.address
        };

        onUpdateDriver({
          ...driver,
          status: 'On-Delivery',
          statusHistory: [newLog, ...(driver.statusHistory || [])]
        });
      }

      assignedCount++;
    });

    setIsBatchAssignModalOpen(false);
    showDashboardToast(`⚡ Successfully auto-assigned ${assignedCount} orders to nearest couriers!`, 'success');
  };

  const handleCompleteDelivery = (orderId: string) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (orderToUpdate) {
      onUpdateOrderStatus({
        ...orderToUpdate,
        status: 'Completed'
      });
      showDashboardToast(`Order #${orderId} marked as completed.`, 'success');
    }
  };

  return (
    <div className={`space-y-6 fade-in relative`}>
      
      {/* Toast Notification Alert Banner */}
      {localToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#0e1e30] border border-brand-orange/60 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top duration-200">
          <Zap className="w-5 h-5 text-brand-orange animate-pulse" />
          <span className="text-xs font-bold">{localToast.message}</span>
          <button onClick={() => setLocalToast(null)} className="text-gray-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SMART AUTO-ASSIGN DISPATCH ENGINE HEADER */}
      <div className="bg-gradient-to-r from-[#0c1624] via-[#102035] to-[#0c1624] border border-brand-orange/30 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center text-brand-orange shadow-md">
              <Zap className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Smart Auto-Assign Dispatch Engine</span>
                <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono rounded-full font-bold">
                  Geographic Proximity AI
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Matches nearest available drivers to incoming orders based on GPS coordinates, traffic ETA & vehicle capacity
              </p>
            </div>
          </div>
        </div>

        {/* Auto-Assign Controls & Strategy Selector */}
        <div className="flex items-center space-x-3 z-10 flex-wrap gap-y-2">
          {/* Strategy selector dropdown */}
          <div className="flex items-center space-x-1.5 bg-brand-dark/90 border border-brand-border p-1 rounded-xl text-xs">
            <Sliders className="w-3.5 h-3.5 text-gray-400 ml-2" />
            <span className="text-[10px] text-gray-400 uppercase font-bold mr-1">Rule:</span>
            {(['distance', 'eta', 'balanced'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setAssignStrategy(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  assignStrategy === st
                    ? 'bg-brand-orange text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {st === 'distance' ? 'Nearest Distance' : st === 'eta' ? 'Fastest ETA' : 'Balanced Rating'}
              </button>
            ))}
          </div>

          {/* Batch Auto-Assign Action Button */}
          <button
            onClick={() => setIsBatchAssignModalOpen(true)}
            disabled={pendingOrders.length === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg flex items-center space-x-2 cursor-pointer ${
              pendingOrders.length > 0
                ? 'bg-gradient-to-r from-brand-orange to-orange-600 hover:from-orange-500 hover:to-brand-orange text-white shadow-brand-orange/20 animate-pulse'
                : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4 fill-white text-white" />
            <span>⚡ Auto-Assign All ({pendingOrders.length})</span>
          </button>
        </div>
      </div>

      {/* DELIVERY KPI OVERVIEW ROW */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4`}>
        {/* Active Fleet */}
        <div className="bg-[#0c1624] p-4 rounded-xl border border-brand-border/60 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Fleet</p>
              <h3 className="text-xl font-black text-white tracking-tight">
                {onlineDrivers.length} / {drivers.length}
              </h3>
              <p className="text-[9px] text-emerald-400 font-semibold">Drivers Online</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-brand-orange">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Ongoing Dispatches */}
        <div className="bg-[#0c1624] p-4 rounded-xl border border-brand-border/60 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ongoing Dispatches</p>
              <h3 className="text-xl font-black text-white tracking-tight">
                {ongoingDeliveries.length}
              </h3>
              <p className="text-[9px] text-blue-400 font-semibold">Active Trips</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Unassigned queue */}
        <div className="bg-[#0c1624] p-4 rounded-xl border border-brand-border/60 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Unassigned Orders</p>
              <h3 className="text-xl font-black text-white tracking-tight">
                {pendingOrders.length}
              </h3>
              <p className="text-[9px] text-yellow-400 font-semibold">Awaiting Dispatch</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-600/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dispatch Efficiency */}
        <div className="bg-[#0c1624] p-4 rounded-xl border border-brand-border/60 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Avg. Delivery Time</p>
              <h3 className="text-xl font-black text-white tracking-tight">
                24 mins
              </h3>
              <p className="text-[9px] text-emerald-400 font-semibold">SLA Targets Met (98.2%)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Deliveries completed */}
        <div className="bg-[#0c1624] p-4 rounded-xl border border-brand-border/60 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fleet Completed</p>
              <h3 className="text-xl font-black text-white tracking-tight">
                {completedOrdersCount}
              </h3>
              <p className="text-[9px] text-purple-400 font-semibold">Successful Orders</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* CORE LOGISTICS INTERACTION: DISPATCH ROOM & MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DISPATCH CONTROL DESK (AWAITING ASSIGNMENT) */}
        <div className="bg-brand-card border border-brand-border rounded-xl shadow-lg p-5 flex flex-col h-[560px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-brand-border/40 shrink-0">
            <div>
              <h3 className="font-bold text-gray-100 text-sm flex items-center space-x-2">
                <Activity className="w-4 h-4 text-brand-orange animate-pulse shrink-0" />
                <span>Dispatch Control Room</span>
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Assign nearest online driver to incoming orders</p>
            </div>
            <span className="bg-brand-orange/10 text-brand-orange text-[10px] font-black px-2 py-0.5 rounded-full border border-brand-orange/20">
              {pendingOrders.length} Pending
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-4 space-y-3 pr-1 scrollbar-none">
            {pendingOrders.map((order) => {
              const bestMatchedDriver = findBestDriverForOrder(order, drivers, assignStrategy);
              
              return (
                <div 
                  key={order.id} 
                  onMouseEnter={() => bestMatchedDriver && setHoveredMatchCandidate(bestMatchedDriver)}
                  onMouseLeave={() => setHoveredMatchCandidate(null)}
                  className="bg-brand-dark/40 border border-brand-border/50 hover:border-brand-orange/40 p-3.5 rounded-xl transition-all space-y-3 group relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-brand-orange font-mono">{order.id}</span>
                    <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-black px-2 py-0.5 rounded uppercase">
                      {order.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-white">{order.storeName}</p>
                    <p className="text-[10px] text-gray-400 flex items-center">
                      <MapPin className="w-3 h-3 text-emerald-400 mr-1 shrink-0" />
                      <span className="truncate">{order.address}</span>
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-300 font-bold pt-1">
                      <span>Total: ৳{order.amount.toLocaleString()}</span>
                      <span className="text-gray-400 font-mono text-[9px]">{order.time || '10 mins ago'}</span>
                    </div>
                  </div>

                  {/* Smart Auto-Assign Recommendation Pill */}
                  {bestMatchedDriver && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg flex items-center justify-between text-[10px]">
                      <div className="flex items-center space-x-1.5">
                        <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-300">Nearest: {bestMatchedDriver.driver.name}</span>
                          <span className="text-gray-400 font-mono ml-1">({bestMatchedDriver.distanceKm} km • {bestMatchedDriver.etaMinutes}m ETA)</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-black rounded text-[9px]">
                        {bestMatchedDriver.matchScore}% Match
                      </span>
                    </div>
                  )}

                  {/* Dispatch Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-border/30">
                    <button
                      onClick={() => handleAutoAssignSingle(order, bestMatchedDriver || undefined)}
                      disabled={!bestMatchedDriver}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                        bestMatchedDriver
                          ? 'bg-brand-orange hover:bg-brand-orange/90 text-white shadow-md'
                          : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-white text-white" />
                      <span>⚡ Auto-Assign</span>
                    </button>

                    <button
                      onClick={() => setAutoAssignModalOrder(order)}
                      className="py-1.5 px-2 bg-brand-dark/80 hover:bg-brand-card text-gray-200 hover:text-white border border-brand-border rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Compare ({onlineDrivers.length})</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {pendingOrders.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <Check className="w-10 h-10 text-emerald-500 mb-2 border border-emerald-500/20 bg-emerald-500/10 p-2 rounded-full" />
                <span className="text-xs font-bold text-gray-300">All Orders Dispatched</span>
                <span className="text-[10px] text-gray-500 mt-1">No unassigned orders in dispatch queue.</span>
              </div>
            )}
          </div>
        </div>

        {/* LIVE FLEET TRACKER MAP (SVG with Route Overlay) */}
        <div className="bg-brand-card border border-brand-border rounded-xl shadow-lg p-5 flex flex-col h-[560px] lg:col-span-2">
          <div className="flex items-center justify-between pb-3.5 border-b border-brand-border/40 shrink-0">
            <div>
              <h3 className="font-bold text-gray-100 text-sm flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-brand-orange shrink-0 animate-spin-slow" />
                <span>Fleet Live Proximity Coverage</span>
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">GPS distance calculator and courier trajectory rendering</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 bg-brand-dark px-2.5 py-1 rounded border border-brand-border">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{onlineDrivers.length} Online Drivers</span>
              </span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="flex-1 mt-4 rounded-xl overflow-hidden bg-[#070e17] border border-brand-border/40 relative shadow-inner">
            <svg viewBox="0 0 500 360" className="w-full h-full text-slate-800">
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#15202e" strokeWidth="0.5" />
                </pattern>
                
                {/* Glow Filter for Auto-Assign Route */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Simplified streets / road grid */}
              <g className="opacity-25" stroke="#1f2d3d" strokeWidth="6" strokeLinecap="round">
                <line x1="50" y1="20" x2="50" y2="340" />
                <line x1="160" y1="20" x2="160" y2="340" />
                <line x1="300" y1="20" x2="300" y2="340" />
                <line x1="420" y1="20" x2="420" y2="340" />
                
                <line x1="20" y1="80" x2="480" y2="80" />
                <line x1="20" y1="180" x2="480" y2="180" />
                <line x1="20" y1="280" x2="480" y2="280" />
              </g>

              {/* Main Central Hub */}
              <circle cx="230" cy="180" r="14" fill="#ff7a00" fillOpacity="0.15" stroke="#ff7a00" strokeWidth="1.5" className="animate-pulse" />
              <rect x="224" y="174" width="12" height="12" fill="#ff7a00" rx="2" />
              <text x="230" y="206" fill="#ff7a00" fontSize="8" fontWeight="bold" textAnchor="middle" className="tracking-wide">
                MAIN CENTRAL DISPATCH HUB
              </text>

              {/* Zone Borders */}
              <g fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3 3" className="opacity-40">
                <rect x="10" y="10" width="220" height="160" />
                <rect x="240" y="10" width="250" height="160" />
                <rect x="10" y="180" width="220" height="170" />
                <rect x="240" y="180" width="250" height="170" />
              </g>
              <text x="20" y="25" fill="#3b82f6" fontSize="7" fontWeight="bold" className="opacity-40">ZONE-A (GULSHAN)</text>
              <text x="410" y="25" fill="#3b82f6" fontSize="7" fontWeight="bold" className="opacity-40">ZONE-B (BANANI)</text>
              <text x="20" y="340" fill="#3b82f6" fontSize="7" fontWeight="bold" className="opacity-40">ZONE-C (DHANMONDI)</text>
              <text x="410" y="340" fill="#3b82f6" fontSize="7" fontWeight="bold" className="opacity-40">ZONE-D (UTTARA)</text>

              {/* D3.js Real-time Heatmap Overlay */}
              {showHeatmap && (
                <D3HeatmapOverlay 
                  orders={orders} 
                  drivers={drivers} 
                  width={500} 
                  height={360} 
                  mode={heatmapMode} 
                  palette={heatmapPalette} 
                  opacity={heatmapOpacity} 
                  showHotspots={showHeatmapHotspots}
                />
              )}

              {/* Auto-Assign Hover Route Vector Overlay */}
              {hoveredMatchCandidate && (
                <g filter="url(#glow)">
                  <line 
                    x1={hoveredMatchCandidate.driverCoords.x || 100} 
                    y1={hoveredMatchCandidate.driverCoords.y || 100} 
                    x2={hoveredMatchCandidate.pickupCoords.x || 200} 
                    y2={hoveredMatchCandidate.pickupCoords.y || 200} 
                    stroke="#ff7a00" 
                    strokeWidth="3" 
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                  {/* Store Pickup Target Ring */}
                  <circle 
                    cx={hoveredMatchCandidate.pickupCoords.x || 200} 
                    cy={hoveredMatchCandidate.pickupCoords.y || 200} 
                    r="10" 
                    fill="#10b981" 
                    fillOpacity="0.3" 
                    stroke="#10b981" 
                    strokeWidth="2" 
                    className="animate-ping"
                  />
                  {/* Distance Map Tooltip Badge */}
                  <g transform={`translate(${((hoveredMatchCandidate.driverCoords.x || 100) + (hoveredMatchCandidate.pickupCoords.x || 200)) / 2 - 45}, ${((hoveredMatchCandidate.driverCoords.y || 100) + (hoveredMatchCandidate.pickupCoords.y || 200)) / 2 - 12})`}>
                    <rect width="90" height="22" rx="6" fill="#0e1e30" stroke="#ff7a00" strokeWidth="1" />
                    <text x="45" y="14" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                      {hoveredMatchCandidate.distanceKm} km • {hoveredMatchCandidate.etaMinutes}m ETA
                    </text>
                  </g>
                </g>
              )}

              {/* Driver GPS Location Nodes */}
              {drivers.map((drv) => {
                const coords = getDriverCoordinates(drv);
                const isOnline = drv.status === 'Online';
                const isOnDelivery = drv.status === 'On-Delivery';
                const isSelected = hoveredMatchCandidate?.driver.id === drv.id;

                return (
                  <g 
                    key={drv.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedInsightsDriver(drv)}
                  >
                    {/* Pulsing ring for active driver pins (On-Delivery) */}
                    {isOnDelivery && (
                      <>
                        <circle 
                          cx={coords.x} 
                          cy={coords.y} 
                          r="18" 
                          fill="#8b5cf6" 
                          fillOpacity="0.12" 
                          className="animate-ping [animation-duration:3s]" 
                        />
                        <circle 
                          cx={coords.x} 
                          cy={coords.y} 
                          r="12" 
                          fill="#8b5cf6" 
                          fillOpacity="0.22" 
                          className="animate-ping [animation-duration:1.5s]" 
                        />
                      </>
                    )}

                    {/* Default Pulsing ring */}
                    <circle 
                      cx={coords.x} 
                      cy={coords.y} 
                      r={isSelected ? 14 : 9} 
                      fill={isOnline ? '#10b981' : isOnDelivery ? '#8b5cf6' : '#ef4444'} 
                      fillOpacity={isSelected ? 0.4 : 0.2} 
                      className="animate-ping" 
                    />
                    
                    {/* Main Node Dot */}
                    <circle 
                      cx={coords.x} 
                      cy={coords.y} 
                      r={isSelected ? 6 : 5} 
                      fill={isOnline ? '#10b981' : isOnDelivery ? '#8b5cf6' : '#ef4444'} 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                    />
                    
                    {/* Driver Tag */}
                    <text 
                      x={coords.x} 
                      y={coords.y - 9} 
                      fill={isSelected ? '#ff7a00' : '#ffffff'} 
                      fontSize="7" 
                      fontWeight="bold" 
                      textAnchor="middle"
                    >
                      {drv.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Float HUD on Map */}
            <div className="absolute bottom-3 left-3 bg-brand-dark/95 border border-brand-border p-2.5 rounded-lg text-[10px] space-y-1 text-gray-300 font-semibold shadow-xl">
              <p className="text-white font-bold flex items-center space-x-1 border-b border-brand-border/40 pb-1 mb-1">
                <Sparkles className="w-3 h-3 text-brand-orange" />
                <span>Auto-Assign Distance Matrix</span>
              </p>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Online Available Couriers ({onlineDrivers.length})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                <span>Couriers On-Delivery</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-orange inline-block"></span>
                <span>Active Auto-Assign Vector</span>
              </div>
            </div>

            {/* Heatmap Control floating panel (top-right) */}
            <div className="absolute top-3 right-3 bg-brand-dark/95 border border-brand-orange/30 p-2.5 rounded-lg text-[10px] space-y-1.5 text-gray-300 font-semibold shadow-xl z-20 w-44">
              <div className="flex items-center justify-between border-b border-brand-border/40 pb-1 mb-1">
                <span className="text-white font-bold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-brand-orange" />
                  <span>D3 Heatmap</span>
                </span>
                <input 
                  type="checkbox" 
                  checked={showHeatmap} 
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="w-3 h-3 accent-brand-orange cursor-pointer"
                />
              </div>

              {showHeatmap && (
                <>
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 block font-bold uppercase">Density Target:</span>
                    <div className="grid grid-cols-2 gap-1">
                      {(['orders', 'drivers', 'combined'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setHeatmapMode(m)}
                          className={`px-1 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                            heatmapMode === m 
                              ? 'bg-brand-orange text-white' 
                              : 'bg-brand-card hover:bg-gray-800 text-gray-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 block font-bold uppercase">Color Palette:</span>
                    <select 
                      value={heatmapPalette} 
                      onChange={(e) => setHeatmapPalette(e.target.value as any)}
                      className="w-full bg-brand-card border border-brand-border p-1 rounded text-[8px] font-bold text-gray-200"
                    >
                      <option value="inferno">Inferno (Thermal)</option>
                      <option value="turbo">Turbo (Spectrum)</option>
                      <option value="plasma">Plasma (Neon)</option>
                      <option value="amber">Amber Glow</option>
                      <option value="emerald">Emerald Sea</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] text-gray-400">
                      <span>Opacity:</span>
                      <span>{Math.round(heatmapOpacity * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="0.9" 
                      step="0.05"
                      value={heatmapOpacity} 
                      onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                      className="w-full accent-brand-orange h-1 rounded cursor-pointer bg-brand-card"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-gray-400 pt-0.5">
                    <span>Show Hotspots</span>
                    <input 
                      type="checkbox" 
                      checked={showHeatmapHotspots} 
                      onChange={(e) => setShowHeatmapHotspots(e.target.checked)}
                      className="w-2.5 h-2.5 accent-brand-orange cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DRIVERS STATUS TABLE & REAL-TIME EVENT FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DRIVERS FLEET DIRECTORY */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between pb-3.5 border-b border-brand-border/40 mb-4">
            <div>
              <h3 className="font-bold text-gray-100 text-sm">Active Courier Fleet & Proximity</h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Real-time driver statuses & dispatch availability</p>
            </div>
            
            {/* Filter buttons */}
            <div className="flex bg-[#070e17] border border-brand-border/60 p-0.5 rounded-lg text-[10px]">
              {['All', 'Online', 'Offline'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveDriverFilter(f as any)}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                    activeDriverFilter === f 
                      ? 'bg-brand-orange text-white font-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-brand-border/20 text-[10px] uppercase font-bold">
                  <th className="pb-2">Courier Name</th>
                  <th className="pb-2 text-center">Vehicle</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-center">Rating</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">Today Earnings</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/20">
                {drivers
                  .filter(d => activeDriverFilter === 'All' || d.status === activeDriverFilter)
                  .map(drv => (
                    <tr key={drv.id} className="hover:bg-brand-dark/20 text-[11px]">
                      <td className="py-2.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{drv.name}</span>
                          {drv.dispatchLocked && (
                            <span className="px-1.5 py-0.2 bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-mono rounded">LOCKED</span>
                          )}
                        </div>
                        <div className="text-[9px] text-gray-500 font-mono font-bold">{drv.id}</div>
                      </td>
                      <td className="py-2.5 text-center font-semibold text-gray-300">
                        {drv.vehicleType}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          drv.status === 'Online'
                            ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400'
                            : drv.status === 'On-Delivery'
                            ? 'bg-purple-500/15 border border-purple-500/20 text-purple-300'
                            : 'bg-red-500/15 border border-red-500/20 text-red-400'
                        }`}>
                          {drv.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-bold text-amber-400">
                        {drv.rating} ★
                      </td>
                      <td className="py-2.5 text-right font-bold text-white font-mono">
                        {drv.completedOrders}
                      </td>
                      <td className="py-2.5 text-right font-bold text-brand-orange font-mono">
                        ৳{drv.earnings.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setSelectedInsightsDriver(drv)}
                          className="px-2 py-1 bg-brand-dark hover:bg-brand-orange/20 border border-brand-border hover:border-brand-orange/60 text-gray-300 hover:text-brand-orange rounded-lg text-[10px] font-black transition-all cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Info className="w-3 h-3 text-brand-orange" />
                          <span>Insights</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOGISTICS NOTIFICATION FEED */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-lg flex flex-col h-[350px] lg:h-auto">
          <h3 className="font-bold text-gray-100 text-sm pb-3 border-b border-brand-border/40 shrink-0">
            Real-time Logistics Alerts
          </h3>
          
          <div className="flex-1 overflow-y-auto pt-3 space-y-3.5 pr-1 scrollbar-none">
            {notifications
              .filter(n => n.type === 'order' || n.type === 'driver')
              .slice(0, 8)
              .map(notif => (
                <div key={notif.id} className="text-left flex items-start space-x-2.5 text-[11px] hover:bg-brand-dark/30 p-2 rounded transition-colors">
                  <div className={`w-2.5 h-2.5 mt-1 rounded-full shrink-0 ${
                    notif.type === 'order' ? 'bg-brand-orange' : 'bg-blue-500'
                  }`}></div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{notif.title}</span>
                      <span className="text-[9px] text-gray-500 font-mono">{notif.time}</span>
                    </div>
                    <p className="text-gray-400 leading-relaxed font-semibold">{notif.message}</p>
                  </div>
                </div>
              ))}

            {notifications.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                All logs cleared
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: SINGLE ORDER AUTO-ASSIGN & CANDIDATE RANKINGS    */}
      {/* ========================================================= */}
      {autoAssignModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-5 fade-in">
            
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Auto-Assign Nearest Driver</span>
                    <span className="text-xs font-mono text-brand-orange">#{autoAssignModalOrder.id}</span>
                  </h3>
                  <p className="text-[11px] text-gray-400">Store: {autoAssignModalOrder.storeName} • {autoAssignModalOrder.address}</p>
                </div>
              </div>

              <button 
                onClick={() => setAutoAssignModalOrder(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-brand-dark cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Drivers Ranked List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                <span>Ranked Available Couriers ({onlineDrivers.length})</span>
                <span className="text-[10px] text-gray-400 font-mono uppercase">Strategy: {assignStrategy}</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {rankDriversForOrder(autoAssignModalOrder, drivers, assignStrategy, true).map((match, idx) => (
                  <div
                    key={match.driver.id}
                    onMouseEnter={() => setHoveredMatchCandidate(match)}
                    onMouseLeave={() => setHoveredMatchCandidate(null)}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-emerald-500/10 via-brand-dark to-brand-dark border-emerald-500/40'
                        : 'bg-brand-dark/60 border-brand-border/60 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        idx === 0 ? 'bg-emerald-500 text-white shadow-md' : 'bg-brand-card text-gray-400 border border-brand-border'
                      }`}>
                        #{idx + 1}
                      </div>

                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white truncate">{match.driver.name}</span>
                          <span className="text-[10px] text-amber-400 font-bold">{match.driver.rating} ★</span>
                          <span className="text-[9px] bg-brand-card px-1.5 py-0.5 text-gray-300 rounded border border-brand-border">
                            {match.driver.vehicleType}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-400 font-medium truncate">
                          {match.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-black text-brand-orange font-mono">{match.distanceKm} km</div>
                        <div className="text-[10px] text-gray-400">{match.etaMinutes} min ETA</div>
                      </div>

                      <button
                        onClick={() => handleAutoAssignSingle(autoAssignModalOrder, match)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                          idx === 0
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                            : 'bg-brand-orange/15 hover:bg-brand-orange text-brand-orange hover:text-white border border-brand-orange/30'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Assign</span>
                      </button>
                    </div>
                  </div>
                ))}

                {onlineDrivers.length === 0 && (
                  <div className="py-8 text-center text-xs text-red-400 font-bold bg-brand-dark/40 rounded-xl border border-brand-border">
                    No online drivers currently available. Switch off-duty drivers to Online in Fleet directory.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-brand-border/60">
              <span className="text-[11px] text-gray-400">
                Calculated using Haversine GPS coordinate matrix
              </span>
              <button
                onClick={() => setAutoAssignModalOrder(null)}
                className="px-4 py-2 bg-brand-dark border border-brand-border text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: BATCH AUTO-ASSIGN OPTIMIZER SUMMARY              */}
      {/* ========================================================= */}
      {isBatchAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-5 fade-in">
            
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                  <Zap className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Batch Auto-Assign Optimizer</h3>
                  <p className="text-[11px] text-gray-400">Simultaneous nearest-neighbour matching for all unassigned orders</p>
                </div>
              </div>

              <button 
                onClick={() => setIsBatchAssignModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-brand-dark cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch calculation simulation list */}
            {(() => {
              const batch = autoAssignAllPendingOrders(orders, drivers, assignStrategy);
              return (
                <div className="space-y-4">
                  <div className="bg-brand-dark/80 p-3.5 rounded-xl border border-brand-border flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400">Total Unassigned:</span>
                      <strong className="text-white ml-1.5">{pendingOrders.length} Orders</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Matched Couriers:</span>
                      <strong className="text-emerald-400 ml-1.5">{batch.assignments.length} Matched</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Remaining Queue:</span>
                      <strong className="text-yellow-400 ml-1.5">{batch.unassignedOrders.length} Unmatched</strong>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {batch.assignments.map(({ order, driver, match }) => (
                      <div key={order.id} className="bg-brand-dark/50 border border-brand-border p-3 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-brand-orange font-bold">#{order.id}</span>
                          <span className="text-white font-medium">{order.storeName}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="text-gray-400">Matched to</span>
                          <span className="text-emerald-400 font-bold">{driver.name}</span>
                          <span className="text-gray-500 font-mono">({match.distanceKm} km)</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3 pt-3 border-t border-brand-border/60">
                    <button
                      onClick={() => setIsBatchAssignModalOpen(false)}
                      className="w-1/2 py-2.5 bg-brand-dark border border-brand-border text-gray-300 rounded-xl text-xs font-bold hover:bg-brand-card transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBatchAutoAssignAll}
                      className="w-1/2 py-2.5 bg-gradient-to-r from-brand-orange to-orange-600 hover:from-orange-500 hover:to-brand-orange text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Zap className="w-4 h-4 fill-white text-white" />
                      <span>Confirm Auto-Assign All</span>
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DRIVER INSIGHTS & HISTORICAL PERFORMANCE        */}
      {/* ========================================================= */}
      {selectedInsightsDriver && (() => {
        // Generate historical 7-day data
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayIdx = new Date().getDay();
        const chartData = [];
        let totalCompletions = selectedInsightsDriver.completedOrders || 12;
        if (totalCompletions < 5) totalCompletions = 12;
        
        let remaining = totalCompletions;
        for (let i = 6; i >= 0; i--) {
          const dayName = days[(todayIdx - i + 7) % 7];
          let count = 0;
          if (i === 0) {
            count = Math.floor(remaining * 0.15);
          } else if (i === 1) {
            count = Math.floor(remaining * 0.25);
          } else {
            count = Math.round(remaining / (i + 1));
          }
          count = Math.max(1, Math.min(count, remaining));
          remaining -= count;
          chartData.push({
            day: dayName,
            Deliveries: count,
          });
        }
        if (remaining > 0 && chartData.length > 0) {
          chartData[chartData.length - 1].Deliveries += remaining;
        }

        // Calculate peak deliveries day
        const peakDayObj = [...chartData].sort((a, b) => b.Deliveries - a.Deliveries)[0];

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-brand-card border border-brand-orange/30 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden text-left">
              {/* Abstract background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full blur-2xl pointer-events-none"></div>

              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Driver Performance Insights</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        selectedInsightsDriver.status === 'Online'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : selectedInsightsDriver.status === 'On-Delivery'
                          ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                          : 'bg-red-500/15 border border-red-500/30 text-red-400'
                      }`}>
                        {selectedInsightsDriver.status}
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Courier: <span className="font-bold text-gray-200">{selectedInsightsDriver.name}</span> • ID: {selectedInsightsDriver.id}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedInsightsDriver(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-brand-dark cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Performance metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#070e17] border border-brand-border/40 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Completions</span>
                  <div className="text-lg font-black text-white font-mono">{selectedInsightsDriver.completedOrders}</div>
                  <span className="text-[8px] text-emerald-400 font-semibold">100% success rate</span>
                </div>
                <div className="bg-[#070e17] border border-brand-border/40 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Today Earnings</span>
                  <div className="text-lg font-black text-brand-orange font-mono">৳{selectedInsightsDriver.earnings.toLocaleString()}</div>
                  <span className="text-[8px] text-emerald-400 font-semibold">৳120 delivery base</span>
                </div>
                <div className="bg-[#070e17] border border-brand-border/40 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Peak Volume</span>
                  <div className="text-lg font-black text-white font-mono">{peakDayObj?.Deliveries || 0} trips</div>
                  <span className="text-[8px] text-brand-orange font-semibold">on {peakDayObj?.day}</span>
                </div>
                <div className="bg-[#070e17] border border-brand-border/40 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Rating Score</span>
                  <div className="text-lg font-black text-amber-400 font-mono flex items-center gap-1">
                    <span>{selectedInsightsDriver.rating}</span>
                    <span className="text-xs">★</span>
                  </div>
                  <span className="text-[8px] text-emerald-400 font-semibold">Excellent feedback</span>
                </div>
              </div>

              {/* Recharts Bar Chart Panel */}
              <div className="bg-brand-dark/50 border border-brand-border p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">Weekly Deliveries Volume (7-Day Breakdown)</span>
                  <span className="text-[9px] text-gray-400 font-mono">Last Updated: Real-time</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2d3d" opacity={0.3} vertical={false} />
                      <XAxis 
                        dataKey="day" 
                        stroke="#6b7280" 
                        fontSize={10} 
                        fontWeight="bold"
                        tickLine={false} 
                        axisLine={{ stroke: '#1f2d3d' }}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        fontSize={10} 
                        fontWeight="bold"
                        tickLine={false} 
                        axisLine={{ stroke: '#1f2d3d' }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,122,0,0.06)' }}
                        contentStyle={{ 
                          backgroundColor: '#070e17', 
                          border: '1px solid rgba(255,122,0,0.3)',
                          borderRadius: '10px',
                          fontSize: '10px',
                          color: '#fff',
                          fontWeight: 'bold'
                        }}
                        itemStyle={{ color: '#ff7a00' }}
                        labelStyle={{ color: '#9ca3af', marginBottom: '3px' }}
                      />
                      <Bar 
                        dataKey="Deliveries" 
                        fill="url(#barGlow)" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Courier Recent Duty History Logs / Timeline */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-200 block">Recent Trajectory & Event Logs</span>
                <div className="max-h-36 overflow-y-auto pr-1 space-y-2 text-[10px] scrollbar-none">
                  {selectedInsightsDriver.statusHistory && selectedInsightsDriver.statusHistory.length > 0 ? (
                    selectedInsightsDriver.statusHistory.map((log) => (
                      <div key={log.id} className="bg-[#070e17] border border-brand-border/40 p-2.5 rounded-lg flex items-start justify-between gap-3 text-left">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                              log.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400' :
                              log.status === 'On-Delivery' ? 'bg-purple-500/10 text-purple-300' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {log.status}
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono">{log.formattedTime}</span>
                          </div>
                          <p className="text-gray-300 font-semibold truncate leading-relaxed">{log.reason}</p>
                          {log.location && (
                            <p className="text-gray-500 text-[8px] flex items-center">
                              <MapPin className="w-2.5 h-2.5 text-brand-orange mr-0.5 shrink-0" />
                              <span>{log.location}</span>
                            </p>
                          )}
                        </div>
                        <span className="text-gray-500 text-[8px] shrink-0 font-mono font-bold uppercase">{log.updatedBy?.split(' ')[0] || 'System'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 font-bold bg-[#070e17] border border-brand-border/30 rounded-xl">
                      No trajectory events logged today. Active sessions will update the feed automatically.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-brand-border/60">
                <span className="text-[10px] text-gray-500">
                  Vehicle: {selectedInsightsDriver.vehicleType} • Courier Session Active
                </span>
                <button
                  onClick={() => setSelectedInsightsDriver(null)}
                  className="px-4 py-2 bg-brand-dark hover:bg-brand-card border border-brand-border text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close Insights
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default DeliveryDashboardView;

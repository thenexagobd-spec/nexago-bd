import React, { useState, useEffect, useMemo } from 'react';
import { Order, Driver, Zone } from '../types';
import { 
  Navigation, MapPin, Truck, RefreshCw, Layers, Compass, 
  Search, ShieldAlert, Sparkles, CheckCircle2, AlertCircle, Play, Pause, FastForward, Info
} from 'lucide-react';

interface TrackingMapViewProps {
  orders: Order[];
  drivers: Driver[];
  zones: Zone[];
}

interface SimulatedRoute {
  orderId: string;
  driverName: string;
  driverPhone: string;
  vehicleType: string;
  storeName: string;
  customerName: string;
  customerAddress: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  progress: number; // 0 to 100
  speed: number; // km/h
  waypoints: Array<{ x: number; y: number }>;
  completed: boolean;
}

const safeText = (value: unknown, fallback = '') => {
  const next = String(value ?? '').trim();
  return next || fallback;
};
const firstWord = (value: unknown, fallback = 'Driver') => safeText(value, fallback).split(/\s+/)[0] || fallback;

// Coordinate regions for live zones
const zoneCoords: Record<string, { x: number; y: number; r: number; color: string }> = {
  'Dhanmondi': { x: 90, y: 310, r: 45, color: '#3b82f6' }, // Blue
  'Gulshan': { x: 350, y: 110, r: 55, color: '#10b981' },   // Emerald
  'Uttara': { x: 485, y: 80, r: 40, color: '#ec4899' },    // Pink
  'Mirpur': { x: 100, y: 180, r: 50, color: '#8b5cf6' },    // Purple
  'Banani': { x: 210, y: 220, r: 48, color: '#eab308' },    // Yellow
};

export const TrackingMapView: React.FC<TrackingMapViewProps> = ({ orders, drivers, zones }) => {
  // Extract real ongoing orders
  const ongoingOrders = useMemo(() => orders.filter(o => o.status === 'Ongoing'), [orders]);

  const liveFallbackPoint = { x: 300, y: 200 };

  // Helper to generate dynamic intermediate waypoints between start and end
  // to make the vehicle turn nicely on "streets"
  const generateWaypoints = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    // Generate a simple Manhattan layout turn
    const midX = start.x;
    const midY = end.y;
    return [
      start,
      { x: midX, y: midY },
      end
    ];
  };

  // State to hold the actively tracked orders in simulation
  const [activeRoutes, setActiveRoutes] = useState<SimulatedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mapStyle, setMapStyle] = useState<'Default' | 'Satellite' | 'Dark'>('Dark');

  // Dynamic styling configurations based on selected mapStyle
  const mapConfig = useMemo(() => {
    switch (mapStyle) {
      case 'Default':
        return {
          bgClass: 'bg-[#f8fafc] border-slate-200/80',
          gridColor: '#e2e8f0',
          waterFill: '#93c5fd',
          waterStroke: '#60a5fa',
          waterOpacity: 0.5,
          waterTextColor: '#1d4ed8',
          parkFill: '#bbf7d0',
          parkStroke: '#34d399',
          parkOpacity: 0.4,
          parkTextColor: '#047857',
          roadStroke: '#cbd5e1',
          innerLaneStroke: '#94a3b8',
          innerLaneDash: '4 4',
          landmarkColor: '#475569',
          labelBg: '#ffffff',
          labelText: '#1e293b',
          labelBorder: '#cbd5e1'
        };
      case 'Satellite':
        return {
          bgClass: 'bg-[#142314] border-emerald-950',
          gridColor: '#1d2f1a',
          waterFill: '#0c4a6e',
          waterStroke: '#0284c7',
          waterOpacity: 0.8,
          waterTextColor: '#38bdf8',
          parkFill: '#052e16',
          parkStroke: '#15803d',
          parkOpacity: 0.7,
          parkTextColor: '#4ade80',
          roadStroke: '#44403c',
          innerLaneStroke: '#eab308',
          innerLaneDash: '6 3',
          landmarkColor: '#94a3b8',
          labelBg: '#0b160a',
          labelText: '#a7f3d0',
          labelBorder: '#166534'
        };
      case 'Dark':
      default:
        return {
          bgClass: 'bg-[#050b12] border-brand-border/50',
          gridColor: '#101925',
          waterFill: '#16293f',
          waterStroke: '#1d3856',
          waterOpacity: 0.3,
          waterTextColor: '#38bdf8',
          parkFill: '#065f46',
          parkStroke: '#059669',
          parkOpacity: 0.1,
          parkTextColor: '#10b981',
          roadStroke: '#162132',
          innerLaneStroke: '#2c3a4f',
          innerLaneDash: '4 4',
          landmarkColor: '#3b82f6',
          labelBg: '#0a121d',
          labelText: '#94a3b8',
          labelBorder: '#1f2d3d'
        };
    }
  }, [mapStyle]);

  // Build live route cards only from real ongoing orders.
  useEffect(() => {
    const initialRoutes: SimulatedRoute[] = [];

    const itemsToSimulate = ongoingOrders;

    itemsToSimulate.forEach((order, idx) => {
      const start = (order as any).storeLocation || (order as any).storePoint || liveFallbackPoint;
      const end = (order as any).customerLocation || (order as any).deliveryPoint || liveFallbackPoint;
      const assignedDriver = drivers.find(d => d.name === order.driverId) || drivers[idx % drivers.length];
      if (!assignedDriver) return;

      initialRoutes.push({
        orderId: order.id,
        driverName: assignedDriver.name,
        driverPhone: assignedDriver.phone || '',
        vehicleType: assignedDriver.vehicleType || '',
        storeName: order.storeName,
        customerName: order.customerName,
        customerAddress: order.address || '',
        start,
        end,
        progress: Number((order as any).progress ?? 0),
        speed: Number((assignedDriver as any).speed ?? 0),
        waypoints: generateWaypoints(start, end),
        completed: false
      });
    });

    setActiveRoutes(initialRoutes);
    if (initialRoutes.length > 0) {
      setSelectedRouteId(initialRoutes[0].orderId);
    }
  }, [ongoingOrders, drivers]);

  // Simulation tick logic to move the vehicles in real-time!
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setActiveRoutes(prevRoutes => {
        return prevRoutes.map(route => {
          if (route.completed) return route;

          // Progress addition based on speed
          const stepSize = (route.speed / 200) * simulationSpeed;
          let newProgress = route.progress + stepSize;
          let isCompleted = false;

          if (newProgress >= 100) {
            newProgress = 100;
            isCompleted = true;
          }

          return {
            ...route,
            progress: newProgress,
            completed: isCompleted
          };
        });
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, simulationSpeed]);

  // Helper to interpolate coordinate along Manhattan waypoints based on progress percentage
  const getVehiclePosition = (route: SimulatedRoute) => {
    const { waypoints, progress } = route;
    if (waypoints.length < 2) return { x: 0, y: 0 };

    const totalSegments = waypoints.length - 1;
    const segmentWeight = 100 / totalSegments;

    // Find current segment index
    let segmentIndex = Math.floor(progress / segmentWeight);
    if (segmentIndex >= totalSegments) segmentIndex = totalSegments - 1;

    const segmentProgress = (progress - segmentIndex * segmentWeight) / segmentWeight;

    const startPt = waypoints[segmentIndex];
    const endPt = waypoints[segmentIndex + 1];

    const currentX = startPt.x + (endPt.x - startPt.x) * segmentProgress;
    const currentY = startPt.y + (endPt.y - startPt.y) * segmentProgress;

    // Calculate angle/bearing for rotatable vector arrow
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return { x: currentX, y: currentY, angle };
  };

  // Highlighted route details
  const selectedRoute = useMemo(() => {
    return activeRoutes.find(r => r.orderId === selectedRouteId) || activeRoutes[0] || null;
  }, [activeRoutes, selectedRouteId]);

  // Real mode: routes must come from real orders.
  const handleSpawnTestOrder = () => {
    setActiveRoutes([]);
    setSelectedRouteId(null);
  };

  // Reset all simulation routes
  const handleResetSimulation = () => {
    setActiveRoutes(prev => {
      return prev.map(route => ({
        ...route,
        progress: 0,
        completed: false
      }));
    });
  };

  // Filter routes by search term (search order id, driver, customer, or store)
  const filteredRoutes = activeRoutes.filter(route => {
    const term = searchTerm.toLowerCase();
    return (
      route.orderId.toLowerCase().includes(term) ||
      route.driverName.toLowerCase().includes(term) ||
      route.customerName.toLowerCase().includes(term) ||
      route.storeName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* Simulation Master Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-brand-card border border-brand-border/60 p-4 rounded-xl shadow-md">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
            <h3 className="font-bold text-white text-sm flex items-center space-x-1.5">
              <Navigation className="w-4 h-4 text-brand-orange shrink-0 animate-spin-slow" />
              <span>Real-Time Logistics Telemetry Grid</span>
            </h3>
          </div>
          <p className="text-[10px] text-gray-400 font-semibold">
            Track dispatches, review live courier routes, and monitor delivery efficiency.
          </p>
        </div>

        {/* Master controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dispatch simulation triggers */}
          <button
            onClick={handleSpawnTestOrder}
            className="bg-brand-orange hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Live Dispatch</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-brand-dark hover:bg-brand-border/80 text-white border border-brand-border px-2.5 py-2 rounded-lg flex items-center justify-center transition-all cursor-pointer"
            title={isPlaying ? "Pause Simulation" : "Resume Simulation"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-yellow-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
          </button>

          {/* Reset */}
          <button
            onClick={handleResetSimulation}
            className="bg-brand-dark hover:bg-brand-border/80 text-gray-300 hover:text-white border border-brand-border px-2.5 py-2 rounded-lg flex items-center justify-center transition-all cursor-pointer"
            title="Reset All Trajectories"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Speed selectors */}
          <div className="flex bg-[#070e17] border border-brand-border/60 p-0.5 rounded-lg text-[9px] font-black uppercase">
            {[1, 2, 4].map(sp => (
              <button
                key={sp}
                onClick={() => setSimulationSpeed(sp)}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  simulationSpeed === sp ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Map left / list right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ACTIVE TRIPS LIST (Left Panel) */}
        <div className="bg-brand-card border border-brand-border rounded-xl shadow-lg p-4 flex flex-col h-[520px]">
          <div className="space-y-3 shrink-0 pb-3 border-b border-brand-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-gray-100 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-brand-orange" />
                <span>Active Dispatches</span>
              </span>
              <span className="bg-brand-orange/15 border border-brand-orange/20 text-brand-orange text-[9px] font-black px-2 py-0.5 rounded-full font-mono">
                {activeRoutes.filter(r => !r.completed).length} ON-ROUTE
              </span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search order ID, courier..."
                className="w-full bg-[#070e17] border border-brand-border text-xs rounded-lg py-1.5 pl-8 pr-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-orange transition-colors"
              />
            </div>
          </div>

          {/* List queue */}
          <div className="flex-1 overflow-y-auto mt-3.5 space-y-2.5 pr-1 scrollbar-none">
            {filteredRoutes.map((route) => {
              const isSelected = selectedRouteId === route.orderId;
              const vehiclePos = getVehiclePosition(route);

              return (
                <div
                  key={route.orderId}
                  onClick={() => setSelectedRouteId(route.orderId)}
                  className={`border p-3 rounded-xl transition-all cursor-pointer flex flex-col text-left relative overflow-hidden ${
                    isSelected 
                      ? 'bg-brand-orange/5 border-brand-orange shadow-lg' 
                      : 'bg-[#0a121d] border-brand-border/60 hover:border-brand-orange/25 hover:bg-[#0c1624]'
                  }`}
                >
                  {/* Status strip */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-brand-orange font-mono">{route.orderId}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      route.completed 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                    }`}>
                      {route.completed ? 'Delivered' : 'In Transit'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <p className="text-[11px] font-black text-white">{route.driverName}</p>
                      <p className="text-[9px] text-gray-400 flex items-center">
                        <Truck className="w-3 h-3 text-brand-orange mr-1" />
                        <span>{route.vehicleType} &bull; {route.speed} km/h</span>
                      </p>
                    </div>

                    <div className="text-[10px] text-gray-300 border-t border-brand-border/30 pt-1.5 space-y-0.5">
                      <p className="truncate"><span className="text-gray-500 font-bold">From:</span> {route.storeName}</p>
                      <p className="truncate"><span className="text-gray-500 font-bold">To:</span> {route.customerAddress}</p>
                    </div>

                    {/* Progress slider bar */}
                    <div className="pt-1.5 space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-gray-500 font-mono">
                        <span>PROGRESS</span>
                        <span>{Math.round(route.progress)}%</span>
                      </div>
                      <div className="w-full bg-[#0c1624] h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-100 ${route.completed ? 'bg-emerald-500' : 'bg-brand-orange'}`}
                          style={{ width: `${route.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRoutes.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <AlertCircle className="w-8 h-8 text-gray-600 mb-2" />
                <span className="text-xs font-bold text-gray-300">No Orders Found</span>
                <span className="text-[10px] text-gray-500 mt-0.5">Try searching another query or add a dispatch.</span>
              </div>
            )}
          </div>
        </div>

        {/* INTERACTIVE TRACKING MAP CANVAS (Center/Right Panel) */}
        <div className="bg-brand-card border border-brand-border rounded-xl shadow-lg p-4 flex flex-col h-[520px] lg:col-span-2">
          
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/40 shrink-0">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Compass className="w-4 h-4 text-brand-orange animate-pulse" />
                <span>Simulation Coverage Area</span>
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                Dynamic streets of Gulshan-Banani operations. Node nodes are interactive.
              </p>
            </div>

            {/* Quick stats on top of map */}
            {selectedRoute && (
              <div className="hidden sm:flex items-center space-x-2.5 bg-[#0a121d] border border-brand-border/70 px-2.5 py-1 rounded-lg">
                <div className="text-right">
                  <p className="text-[8px] text-gray-500 font-black">SELECTED ORDER</p>
                  <p className="text-[10px] text-brand-orange font-mono font-black">{selectedRoute.orderId}</p>
                </div>
                <div className="h-4 w-[1px] bg-brand-border/40"></div>
                <div className="text-right">
                  <p className="text-[8px] text-gray-500 font-black">ETA</p>
                  <p className="text-[10px] text-white font-black">
                    {selectedRoute.completed ? 'Arrived' : `${Math.round((100 - selectedRoute.progress) * 0.2)} mins`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SVG Map Container */}
          <div className={`flex-1 mt-4 rounded-xl overflow-hidden transition-all duration-300 relative shadow-inner ${mapConfig.bgClass}`}>
            
            {/* Floating Map Style Switcher Widget */}
            <div className="absolute top-3 right-3 bg-[#070e17]/90 backdrop-blur-sm border border-brand-border/40 p-1 rounded-lg flex items-center space-x-1 shadow-lg z-10 select-none">
              {(['Default', 'Satellite', 'Dark'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setMapStyle(style)}
                  className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all cursor-pointer ${
                    mapStyle === style 
                      ? 'bg-brand-orange text-white shadow' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>

            <svg viewBox="0 0 600 400" className="w-full h-full text-slate-800">
              
              {/* Map grid representation */}
              <defs>
                <pattern id="trackGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={mapConfig.gridColor} strokeWidth="0.5" />
                </pattern>
                
                {/* SVG Drop Shadows */}
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
                </filter>
              </defs>
              <rect width="100%" height="100%" fill="url(#trackGrid)" />

              {/* Simulated Land/Water Features */}
              {/* Gulshan Lake Representation */}
              <path 
                d="M 230 0 Q 210 100 240 200 T 220 400 L 250 400 T 270 200 Q 240 100 260 0 Z" 
                fill={mapConfig.waterFill} 
                fillOpacity={mapConfig.waterOpacity} 
                stroke={mapConfig.waterStroke} 
                strokeWidth="1" 
              />
              <text x="245" y="45" fill={mapConfig.waterTextColor} fontSize="6" fontWeight="bold" transform="rotate(84 245 45)" className="opacity-40 tracking-wider">
                GULSHAN LAKE
              </text>

              {/* Park outlines */}
              <rect x="20" y="30" width="70" height="45" rx="4" fill={mapConfig.parkFill} fillOpacity={mapConfig.parkOpacity} stroke={mapConfig.parkStroke} strokeWidth="0.5" strokeDasharray="2 2" />
              <text x="55" y="55" fill={mapConfig.parkTextColor} fontSize="6" fontWeight="bold" textAnchor="middle" className="opacity-45">BANANI COMM. PARK</text>

              <rect x="420" y="290" width="130" height="80" rx="6" fill={mapConfig.parkFill} fillOpacity={mapConfig.parkOpacity} stroke={mapConfig.parkStroke} strokeWidth="0.5" strokeDasharray="2 2" />
              <text x="485" y="335" fill={mapConfig.parkTextColor} fontSize="6" fontWeight="bold" textAnchor="middle" className="opacity-45">MILITARY GOLF CLUB</text>

              {/* Simulated Main Roads Layout (Double line look) */}
              <g stroke={mapConfig.roadStroke} strokeLinecap="round" strokeLinejoin="round" fill="none">
                {/* Vertical Highways */}
                <line x1="80" y1="0" x2="80" y2="400" strokeWidth="12" />
                <line x1="220" y1="0" x2="220" y2="400" strokeWidth="12" />
                <line x1="340" y1="0" x2="340" y2="400" strokeWidth="12" />
                <line x1="450" y1="0" x2="450" y2="400" strokeWidth="12" />

                {/* Horizontal Streets */}
                <line x1="0" y1="80" x2="600" y2="80" strokeWidth="12" />
                <line x1="0" y1="150" x2="600" y2="150" strokeWidth="12" />
                <line x1="0" y1="220" x2="600" y2="220" strokeWidth="12" />
                <line x1="0" y1="280" x2="600" y2="280" strokeWidth="12" />
                <line x1="0" y1="320" x2="600" y2="320" strokeWidth="12" />
              </g>

              {/* Inner Road Lanes to look highly professional */}
              <g stroke={mapConfig.innerLaneStroke} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth="0.5" strokeDasharray={mapConfig.innerLaneDash} className="opacity-45">
                <line x1="80" y1="0" x2="80" y2="400" />
                <line x1="220" y1="0" x2="220" y2="400" />
                <line x1="340" y1="0" x2="340" y2="400" />
                <line x1="450" y1="0" x2="450" y2="400" />

                <line x1="0" y1="80" x2="600" y2="80" />
                <line x1="0" y1="150" x2="600" y2="150" />
                <line x1="0" y1="220" x2="600" y2="220" />
                <line x1="0" y1="280" x2="600" y2="280" />
                <line x1="0" y1="320" x2="600" y2="320" />
              </g>

              {/* Static landmarks / zones label */}
              <text x="90" y="20" fill={mapConfig.landmarkColor} fontSize="7" fontWeight="bold" className="opacity-55 tracking-wider">BANANI BLOCK A</text>
              <text x="350" y="20" fill={mapConfig.landmarkColor} fontSize="7" fontWeight="bold" className="opacity-55 tracking-wider">GULSHAN-2 CENTER</text>
              <text x="460" y="200" fill={mapConfig.landmarkColor} fontSize="7" fontWeight="bold" className="opacity-55 tracking-wider">BARIDHARA R/A</text>

              {/* Render Selected Trajectory Track Path Line */}
              {selectedRoute && (
                <g>
                  {/* Detailed Route line */}
                  <polyline
                    points={selectedRoute.waypoints.map(w => `${w.x},${w.y}`).join(' ')}
                    fill="none"
                    stroke="#ff7a00"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-25"
                  />
                  {/* Active dotted path to destination */}
                  <polyline
                    points={selectedRoute.waypoints.map(w => `${w.x},${w.y}`).join(' ')}
                    fill="none"
                    stroke="#ff7a00"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="4 4"
                  />
                </g>
              )}

              {/* Draw ALL standard delivery zones as static reference layers */}
              {zones.map(zone => {
                const coord = zoneCoords[zone.name] || { x: 300, y: 200, r: 40, color: '#64748b' };
                return (
                  <g key={zone.id} className="opacity-50 hover:opacity-80 transition-opacity">
                    {/* Zone Boundary Circle with custom dash-array */}
                    <circle 
                      cx={coord.x} 
                      cy={coord.y} 
                      r={coord.r} 
                      fill={coord.color} 
                      fillOpacity="0.04" 
                      stroke={coord.color} 
                      strokeWidth="1" 
                      strokeDasharray="4 4" 
                    />
                    
                    {/* Standard Zone Center Marker (Purely static - no pulsing) */}
                    <circle cx={coord.x} cy={coord.y} r="4.5" fill="#0f172a" stroke={coord.color} strokeWidth="1.5" />
                    <circle cx={coord.x} cy={coord.y} r="1.5" fill={coord.color} />

                    {/* Small text label for Zone Hub */}
                    <g transform={`translate(${coord.x}, ${coord.y - 10})`}>
                      <rect x="-24" y="-5" width="48" height="10" rx="2" fill={mapConfig.labelBg} stroke={coord.color} strokeWidth="0.5" opacity="0.9" />
                      <text x="0" y="2" fill={mapConfig.labelText} fontSize="5.5" fontWeight="bold" textAnchor="middle" className="tracking-wider uppercase">
                        {zone.name}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Draw ALL active courier vehicles on map */}
              {activeRoutes.map(route => {
                const isSelected = selectedRouteId === route.orderId;
                const pos = getVehiclePosition(route);

                return (
                  <g key={route.orderId} onClick={() => setSelectedRouteId(route.orderId)} className="cursor-pointer">
                    {/* Concentric pulsing radar/ripple animations to distinguish active drivers from static markers */}
                    <circle cx={pos.x} cy={pos.y} r="6" fill="none" stroke="#ff7a00" strokeWidth="2" opacity="0.8">
                      <animate attributeName="r" values="6;26" dur="2s" repeatCount="indefinite" begin="0s" />
                      <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" begin="0s" />
                    </circle>
                    <circle cx={pos.x} cy={pos.y} r="6" fill="none" stroke="#ff7a00" strokeWidth="1.5" opacity="0.8">
                      <animate attributeName="r" values="6;26" dur="2s" repeatCount="indefinite" begin="0.7s" />
                      <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" begin="0.7s" />
                    </circle>
                    
                    {/* Secondary high-intensity focus pulse for the selected driver */}
                    {isSelected && (
                      <circle cx={pos.x} cy={pos.y} r="6" fill="none" stroke="#ff7a00" strokeWidth="2.5" opacity="0.9">
                        <animate attributeName="r" values="6;36" dur="1.4s" repeatCount="indefinite" begin="0.3s" />
                        <animate attributeName="opacity" values="0.9;0" dur="1.4s" repeatCount="indefinite" begin="0.3s" />
                      </circle>
                    )}

                    {/* Start Store pin marker */}
                    <circle cx={route.start.x} cy={route.start.y} r="4.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" filter="url(#shadow)" />
                    <circle cx={route.start.x} cy={route.start.y} r="1.5" fill="#050b12" />

                    {/* Destination/Customer pin marker */}
                    <circle cx={route.end.x} cy={route.end.y} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" filter="url(#shadow)" />
                    <polygon points={`${route.end.x},${route.end.y-2} ${route.end.x-2.5},${route.end.y+2} ${route.end.x+2.5},${route.end.y+2}`} fill="#ffffff" />

                    {/* Driver node vehicle icon */}
                    <g transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.angle || 0})`}>
                      <rect 
                        x="-7" 
                        y="-7" 
                        width="14" 
                        height="14" 
                        rx="3" 
                        fill={isSelected ? "#ff7a00" : "#2e3a4f"} 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                        filter="url(#shadow)" 
                      />
                      {/* Visual pointer showing heading */}
                      <polygon points="0,-4 3,0 -3,0" fill="#ffffff" />
                    </g>

                    {/* Simple Text Label for Courier */}
                    <g transform={`translate(${pos.x}, ${pos.y - 12})`} filter="url(#shadow)">
                      <rect 
                        x="-28" 
                        y="-6" 
                        width="56" 
                        height="11" 
                        rx="2" 
                        fill="#0c1624" 
                        stroke={isSelected ? "#ff7a00" : "#1f2d3d"} 
                        strokeWidth="0.5" 
                      />
                      <text x="0" y="2" fill="#ffffff" fontSize="6.5" fontWeight="black" textAnchor="middle" className="tracking-wide">
                        {firstWord(route.driverName)}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Floating Key Legend of Map inside canvas */}
              <g transform="translate(15, 275)" filter="url(#shadow)">
                <rect width="125" height="110" rx="8" fill="#070e17" stroke="#1f2d3d" strokeWidth="1" />
                <text x="12" y="18" fill="#ffffff" fontSize="8" fontWeight="bold">MAP LEGEND</text>
                
                {/* Store Pin Key */}
                <circle cx="18" cy="32" r="3.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="0.5" />
                <text x="28" y="34" fill="#94a3b8" fontSize="7" fontWeight="bold">Store Merchant</text>

                {/* Client Pin Key */}
                <circle cx="18" cy="48" r="3.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="0.5" />
                <text x="28" y="50" fill="#94a3b8" fontSize="7" fontWeight="bold">Customer Drop-off</text>

                {/* Driver Key */}
                <rect x="14" y="60" width="8" height="8" rx="2.5" fill="#ff7a00" stroke="#ffffff" strokeWidth="0.5" />
                <text x="28" y="66" fill="#94a3b8" fontSize="7" fontWeight="bold">Courier (Pulsing)</text>

                {/* Delivery Zone Key */}
                <circle cx="18" cy="78" r="4.5" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1.2" strokeDasharray="2 1.5" />
                <circle cx="18" cy="78" r="1.5" fill="#10b981" />
                <text x="28" y="81" fill="#94a3b8" fontSize="7" fontWeight="bold">Delivery Zone Hub</text>

                {/* Pulsing Active Signal Key */}
                <circle cx="18" cy="94" r="5.5" fill="none" stroke="#ff7a00" strokeWidth="1" opacity="0.6" />
                <circle cx="18" cy="94" r="2.5" fill="#ff7a00" />
                <text x="28" y="97" fill="#94a3b8" fontSize="7" fontWeight="bold">Active Dispatch (Live)</text>
              </g>

            </svg>

            {/* Float details panel for Selected Route */}
            {selectedRoute && (
              <div className="absolute bottom-3 right-3 bg-brand-dark/95 border border-brand-border/80 p-3.5 rounded-xl text-[11px] space-y-1.5 text-gray-300 font-semibold shadow-2xl max-w-xs animate-in fade-in slide-in-from-bottom-2">
                <p className="text-white font-black border-b border-brand-border/40 pb-1.5 mb-1 flex items-center justify-between">
                  <span>DISPATCH TELEMETRY</span>
                  <span className="text-[10px] text-brand-orange font-mono">{selectedRoute.orderId}</span>
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div>
                    <span className="text-gray-500 font-bold">Courier:</span>
                    <p className="text-white font-black truncate">{selectedRoute.driverName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold">Vehicle:</span>
                    <p className="text-white font-black">{selectedRoute.vehicleType}</p>
                  </div>
                  <div className="mt-1">
                    <span className="text-gray-500 font-bold">Speed:</span>
                    <p className="text-brand-orange font-black font-mono">{selectedRoute.speed} KM/H</p>
                  </div>
                  <div className="mt-1">
                    <span className="text-gray-500 font-bold">Progress:</span>
                    <p className="text-brand-orange font-black font-mono">{Math.round(selectedRoute.progress)}%</p>
                  </div>
                </div>

                <div className="border-t border-brand-border/40 pt-1.5 mt-1 text-[9px] text-gray-400">
                  <p className="truncate"><span className="text-gray-500 font-bold">From:</span> {selectedRoute.storeName}</p>
                  <p className="truncate"><span className="text-gray-500 font-bold">To:</span> {selectedRoute.customerAddress}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER METRICS AND QUICK STATISTICS OF ACTIVE COURIERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a121d] border border-brand-border/60 p-3.5 rounded-xl flex items-center space-x-3.5 shadow">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Average SLA Met</p>
            <h4 className="text-base font-black text-white">99.1% Acc. Rate</h4>
          </div>
        </div>

        <div className="bg-[#0a121d] border border-brand-border/60 p-3.5 rounded-xl flex items-center space-x-3.5 shadow">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">GPS Coverage</p>
            <h4 className="text-base font-black text-white">100% Core Zones</h4>
          </div>
        </div>

        <div className="bg-[#0a121d] border border-brand-border/60 p-3.5 rounded-xl flex items-center space-x-3.5 shadow">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 text-brand-orange flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Logistics Incidents</p>
            <h4 className="text-base font-black text-white">0 Alerts Pending</h4>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingMapView;

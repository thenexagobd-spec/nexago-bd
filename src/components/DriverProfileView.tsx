/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Driver, Vehicle, DriverStatusLog, DriverDutyStatus } from '../types';
import { 
  ArrowLeft, Star, Phone, MapPin, Award, CheckCircle2, ShieldCheck, 
  Clock, TrendingUp, TrendingDown, AlertTriangle, Calendar, Truck, Fuel, Wrench, 
  BarChart2, ThumbsUp, MessageSquare, Download, Edit3, UserCheck, 
  Activity, Zap, ChevronRight, RefreshCw, Filter, Layers, Gauge,
  Flame, Map, Compass, Navigation, Crosshair, Target, Globe, Sliders, Eye,
  Plus, Search, Trash2, FileText, User, Tag, History, Check, Power, XCircle, Lock, Unlock, Package, X
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';

interface DriverProfileViewProps {
  driver: Driver;
  allDrivers: Driver[];
  onBack: () => void;
  onUpdateDriver: (updatedDriver: Driver) => void;
  onSelectDriver: (driverId: string) => void;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

// Sparkline Chart Component for Visual Metric Trends
const SparklineChart: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  isUp?: boolean;
  label?: string;
}> = ({
  data,
  color = '#10b981',
  height = 28,
  width = 72,
  isUp = true,
  label
}) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 8) - 4;

  return (
    <div className="flex flex-col items-end shrink-0">
      <div className="relative group">
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          <circle
            cx={lastX}
            cy={lastY}
            r="3"
            fill={color}
            className="animate-pulse"
          />
        </svg>

        <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-brand-dark border border-white/20 px-2 py-0.5 rounded text-[8.5px] font-mono text-white whitespace-nowrap shadow-xl z-30">
          7d Trend: {data[0]} → {data[data.length - 1]}
        </div>
      </div>

      {label && (
        <span className={`text-[9px] font-mono font-bold mt-1 flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {label}
        </span>
      )}
    </div>
  );
};

export default function DriverProfileView({
  driver,
  allDrivers,
  onBack,
  onUpdateDriver,
  onSelectDriver,
  showToast
}: DriverProfileViewProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'heatmap' | 'ratings' | 'vehicle'>('overview');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('dhanmondi');
  const [heatmapTimeframe, setHeatmapTimeframe] = useState<'7d' | '30d' | 'all'>('30d');
  const [heatmapSort, setHeatmapSort] = useState<'orders' | 'earnings' | 'speed'>('orders');
  const [trendMetricMode, setTrendMetricMode] = useState<'ratings' | 'earnings'>('ratings');

  // Interactive Status History Timeline State
  const [timelineFilterStatus, setTimelineFilterStatus] = useState<'All' | 'Online' | 'On-Delivery' | 'Offline'>('All');
  const [timelineSearchQuery, setTimelineSearchQuery] = useState('');
  const [timelineSortOrder, setTimelineSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Manual Status Change Log Modal State
  const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
  const [newLogStatus, setNewLogStatus] = useState<DriverDutyStatus>('Online');
  const [newLogReason, setNewLogReason] = useState('');
  const [newLogLocation, setNewLogLocation] = useState('Central Dispatch Zone');
  const [newLogActor, setNewLogActor] = useState('Admin Dispatch Control');

  // Status Change Helpers
  const handleQuickStatusChange = (nextStatus: DriverDutyStatus, defaultReason?: string) => {
    const now = new Date();
    const formattedTime = `Today, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    
    const newLog: DriverStatusLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      status: nextStatus,
      timestamp: now.toISOString(),
      formattedTime,
      reason: defaultReason || (
        nextStatus === 'Online' ? 'Duty resumed & logged active' :
        nextStatus === 'On-Delivery' ? 'Dispatched for customer order fulfillment' :
        'Shift completed / Went offline'
      ),
      updatedBy: 'Admin Dispatch Control',
      location: 'Central Dispatch Zone'
    };

    const updatedHistory = [newLog, ...(driver.statusHistory || [])];
    
    onUpdateDriver({
      ...driver,
      status: nextStatus,
      statusHistory: updatedHistory
    });

    if (showToast) {
      showToast(`Duty status updated to ${nextStatus}`, 'success');
    }
  };

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const formattedTime = `Today, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    const newLog: DriverStatusLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      status: newLogStatus,
      timestamp: now.toISOString(),
      formattedTime,
      reason: newLogReason.trim() || `Manual status update to ${newLogStatus}`,
      updatedBy: newLogActor,
      location: newLogLocation
    };

    const updatedHistory = [newLog, ...(driver.statusHistory || [])];

    onUpdateDriver({
      ...driver,
      status: newLogStatus,
      statusHistory: updatedHistory
    });

    setIsAddLogModalOpen(false);
    setNewLogReason('');
    
    if (showToast) {
      showToast(`Logged status entry for ${driver.name}`, 'success');
    }
  };

  const handleDeleteStatusLog = (logId: string) => {
    const updatedHistory = (driver.statusHistory || []).filter(item => item.id !== logId);
    onUpdateDriver({
      ...driver,
      statusHistory: updatedHistory
    });
    if (showToast) {
      showToast('Status history log entry deleted.', 'info');
    }
  };

  const handleExportTimelineCSV = () => {
    const history = driver.statusHistory || [];
    if (history.length === 0) {
      if (showToast) showToast('No status history logs available to export.', 'info');
      return;
    }

    const headers = ['Log ID', 'Status', 'Timestamp', 'Formatted Time', 'Reason / Event Note', 'Updated By', 'Location / Zone'];
    const rows = history.map(item => [
      `"${item.id}"`,
      `"${item.status}"`,
      `"${item.timestamp}"`,
      `"${item.formattedTime || item.timestamp}"`,
      `"${(item.reason || '').replace(/"/g, '""')}"`,
      `"${item.updatedBy || 'System'}"`,
      `"${item.location || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `driver_${driver.id}_status_timeline.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) {
      showToast(`Exported ${history.length} timeline logs to CSV.`, 'success');
    }
  };

  // Generate deterministic/consistent mock data based on driver.id
  const isRahim = driver.id === 'DRV123456';

  // Delivery Heatmap Zones Data
  const heatmapZones = [
    {
      id: 'dhanmondi',
      name: 'Dhanmondi & Sobhanbag Hub',
      orders: Math.max(12, Math.round(driver.completedOrders * 0.38)),
      earnings: Math.max(1800, Math.round(driver.earnings * 0.40)),
      sharePct: 38,
      avgSpeed: '13.8 mins',
      demandLevel: 'EXTREME HOTSPOT',
      demandScore: 98,
      heatColor: '#ef4444',
      glowClass: 'from-red-500/80 via-amber-500/50 to-transparent',
      badgeBg: 'bg-red-500/10 text-red-400 border-red-500/30',
      coordinates: { x: '35%', y: '48%' },
      peakHours: '01:00 PM - 03:00 PM & 07:30 PM - 09:30 PM',
      topMerchants: ['Chillox Dhanmondi', 'Takeout 27', 'Sultan’s Dine', 'Khanas Dhanmondi'],
      description: 'Primary delivery hub. High concentration of fast-food restaurants, university students, and residential apartments.'
    },
    {
      id: 'gulshan',
      name: 'Gulshan 1 & 2 Circle',
      orders: Math.max(8, Math.round(driver.completedOrders * 0.28)),
      earnings: Math.max(1400, Math.round(driver.earnings * 0.30)),
      sharePct: 28,
      avgSpeed: '17.2 mins',
      demandLevel: 'HIGH DEMAND',
      demandScore: 84,
      heatColor: '#f97316',
      glowClass: 'from-orange-500/80 via-amber-500/40 to-transparent',
      badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      coordinates: { x: '65%', y: '32%' },
      peakHours: '12:30 PM - 02:30 PM & 08:00 PM - 10:00 PM',
      topMerchants: ['Glazed Gulshan', 'Madchef Gulshan', 'Bread & Beyond', 'North End Coffee'],
      description: 'Corporate office hub and premium fine-dining zone with high average order ticket sizes.'
    },
    {
      id: 'banani',
      name: 'Banani Road 11 & Mohakhali',
      orders: Math.max(5, Math.round(driver.completedOrders * 0.18)),
      earnings: Math.max(900, Math.round(driver.earnings * 0.16)),
      sharePct: 18,
      avgSpeed: '15.5 mins',
      demandLevel: 'HIGH DEMAND',
      demandScore: 72,
      heatColor: '#f59e0b',
      glowClass: 'from-amber-500/80 via-yellow-500/40 to-transparent',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      coordinates: { x: '58%', y: '24%' },
      peakHours: '01:00 PM - 03:00 PM',
      topMerchants: ['Secret Recipe Banani', 'Star Kabab', 'Trouvaille'],
      description: 'Bustling commercial strip with dense lunch order volumes from IT and corporate towers.'
    },
    {
      id: 'mohammadpur',
      name: 'Mohammadpur & Ring Road',
      orders: Math.max(3, Math.round(driver.completedOrders * 0.10)),
      earnings: Math.max(500, Math.round(driver.earnings * 0.08)),
      sharePct: 10,
      avgSpeed: '14.2 mins',
      demandLevel: 'MODERATE',
      demandScore: 50,
      heatColor: '#10b981',
      glowClass: 'from-emerald-500/80 via-teal-500/40 to-transparent',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      coordinates: { x: '22%', y: '40%' },
      peakHours: '07:00 PM - 10:00 PM',
      topMerchants: ['Town Hall Kabab', 'Biye Bari Kacchi', 'Shahi Biryani'],
      description: 'Residential sector with steady dinner and late-night snack deliveries.'
    },
    {
      id: 'uttara',
      name: 'Uttara Sector 3 & 7',
      orders: Math.max(2, Math.round(driver.completedOrders * 0.04)),
      earnings: Math.max(300, Math.round(driver.earnings * 0.04)),
      sharePct: 4,
      avgSpeed: '21.0 mins',
      demandLevel: 'EMERGING ZONE',
      demandScore: 32,
      heatColor: '#3b82f6',
      glowClass: 'from-blue-500/80 via-cyan-500/40 to-transparent',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      coordinates: { x: '72%', y: '12%' },
      peakHours: '06:00 PM - 09:00 PM',
      topMerchants: ['Pizza Hut Uttara', 'KFC Sector 3'],
      description: 'Long-haul suburban zone with growing demand during weekend evenings.'
    },
    {
      id: 'old_dhaka',
      name: 'Old Dhaka & Chawkbazar',
      orders: Math.max(1, Math.round(driver.completedOrders * 0.02)),
      earnings: Math.max(150, Math.round(driver.earnings * 0.02)),
      sharePct: 2,
      avgSpeed: '24.5 mins',
      demandLevel: 'LOW / SPECIALTY',
      demandScore: 18,
      heatColor: '#8b5cf6',
      glowClass: 'from-purple-500/80 via-indigo-500/40 to-transparent',
      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      coordinates: { x: '42%', y: '78%' },
      peakHours: '12:00 PM - 02:00 PM',
      topMerchants: ['Grand Nawab', 'Bismillah Borhani'],
      description: 'Traditional food district with high traffic density and specialty catering orders.'
    }
  ];

  const currentZone = heatmapZones.find(z => z.id === selectedZoneId) || heatmapZones[0];
  
  // Performance Trend Data for Charts
  const weeklyPerformanceData = [
    { day: 'Mon', orders: 12, earnings: 1850, onTime: 98, distance: 48 },
    { day: 'Tue', orders: 15, earnings: 2300, onTime: 100, distance: 62 },
    { day: 'Wed', orders: 11, earnings: 1620, onTime: 95, distance: 42 },
    { day: 'Thu', orders: 14, earnings: 2100, onTime: 97, distance: 55 },
    { day: 'Fri', orders: 18, earnings: 2950, onTime: 99, distance: 74 },
    { day: 'Sat', orders: 20, earnings: 3400, onTime: 96, distance: 88 },
    { day: 'Sun', orders: 16, earnings: 2600, onTime: 98, distance: 65 },
  ];

  // 7-Day Performance Metric Trends for Sparklines
  const ratingTrend7Days = [
    Number(Math.max(3.8, driver.rating - 0.3).toFixed(2)),
    Number(Math.max(3.9, driver.rating - 0.22).toFixed(2)),
    Number(Math.max(4.0, driver.rating - 0.18).toFixed(2)),
    Number(Math.max(4.0, driver.rating - 0.12).toFixed(2)),
    Number(Math.max(4.1, driver.rating - 0.08).toFixed(2)),
    Number(Math.max(4.2, driver.rating - 0.03).toFixed(2)),
    driver.rating
  ];
  const ratingDiff = Number((driver.rating - ratingTrend7Days[0]).toFixed(2));
  const isRatingUp = ratingDiff >= 0;

  const ratingTrendChartData = [
    { day: 'Mon', rating: ratingTrend7Days[0] },
    { day: 'Tue', rating: ratingTrend7Days[1] },
    { day: 'Wed', rating: ratingTrend7Days[2] },
    { day: 'Thu', rating: ratingTrend7Days[3] },
    { day: 'Fri', rating: ratingTrend7Days[4] },
    { day: 'Sat', rating: ratingTrend7Days[5] },
    { day: 'Sun', rating: ratingTrend7Days[6] },
  ];

  // 7-Day Earnings Trend Data for Financial Insights
  const earningsTrend7Days = weeklyPerformanceData.map(d => d.earnings);
  const earningsDiff = earningsTrend7Days[earningsTrend7Days.length - 1] - earningsTrend7Days[0];
  const isEarningsUp = earningsDiff >= 0;

  const earningsTrendChartData = weeklyPerformanceData.map(d => ({
    day: d.day,
    earnings: d.earnings,
    formatted: `৳${d.earnings.toLocaleString()}`
  }));

  const onTimeTrend7Days = [96.2, 96.8, 97.1, 97.5, 97.9, 98.2, 98.4];
  const acceptanceTrend7Days = [92.0, 93.1, 94.0, 94.8, 95.5, 96.0, 96.2];
  const cancellationTrend7Days = [2.8, 2.5, 2.1, 1.8, 1.5, 1.3, 1.2];
  const ordersTrend7Days = [14, 16, 18, 15, 20, 22, 25];

  const monthlyPerformanceData = [
    { day: 'W1', orders: 68, earnings: 10400, onTime: 97, distance: 280 },
    { day: 'W2', orders: 74, earnings: 11800, onTime: 98, distance: 310 },
    { day: 'W3', orders: 82, earnings: 13200, onTime: 99, distance: 350 },
    { day: 'W4', orders: 79, earnings: 12500, onTime: 96, distance: 330 },
  ];

  const currentPerformanceData = timeRange === 'week' ? weeklyPerformanceData : monthlyPerformanceData;

  // Hourly Peak Performance Breakdown
  const hourlyData = [
    { time: '08 AM-11 AM', deliveries: 18, avgTime: '14 mins' },
    { time: '11 AM-02 PM', deliveries: 32, avgTime: '18 mins' },
    { time: '02 PM-05 PM', deliveries: 22, avgTime: '15 mins' },
    { time: '05 PM-08 PM', deliveries: 45, avgTime: '21 mins' },
    { time: '08 PM-11 PM', deliveries: 28, avgTime: '16 mins' },
  ];

  // Rating Distribution Data for Donut/Bar Chart
  const ratingDistribution = [
    { name: '5 Stars', count: 124, percentage: 86, color: '#10b981' },
    { name: '4 Stars', count: 14, percentage: 10, color: '#3b82f6' },
    { name: '3 Stars', count: 4, percentage: 3, color: '#f59e0b' },
    { name: '2 Stars', count: 1, percentage: 1, color: '#f97316' },
    { name: '1 Star', count: 0, percentage: 0, color: '#ef4444' },
  ];

  // Vehicle Health Breakdown Data
  const vehicleHealthData = [
    { system: 'Engine & Oil', score: 96, fill: '#10b981' },
    { system: 'Brakes & Fluid', score: 92, fill: '#3b82f6' },
    { system: 'Tires & Pressure', score: 88, fill: '#f59e0b' },
    { system: 'Fuel Efficiency', score: 94, fill: '#8b5cf6' },
    { system: 'Battery & Lights', score: 98, fill: '#ec4899' },
  ];

  // Vehicle Fuel/Energy Efficiency Chart Data
  const fuelEfficiencyData = [
    { day: 'Mon', km: 48, fuelLiters: 1.1, ratio: 43.6 },
    { day: 'Tue', km: 62, fuelLiters: 1.4, ratio: 44.2 },
    { day: 'Wed', km: 42, fuelLiters: 1.0, ratio: 42.0 },
    { day: 'Thu', km: 55, fuelLiters: 1.25, ratio: 44.0 },
    { day: 'Fri', km: 74, fuelLiters: 1.6, ratio: 46.25 },
    { day: 'Sat', km: 88, fuelLiters: 1.9, ratio: 46.3 },
    { day: 'Sun', km: 65, fuelLiters: 1.45, ratio: 44.8 },
  ];

  // Vehicle Details Mock Object
  const vehicleDetails = {
    model: driver.vehicleType.includes('Gixxer') ? 'Suzuki Gixxer 150 Fi' : 
           driver.vehicleType.includes('Yamaha') ? 'Yamaha FZ-S FI V3 (149cc)' : 
           driver.vehicleType.includes('Car') ? 'Toyota Probox 1.5' : 'Runner Turbo 125',
    plateNumber: isRahim ? 'DHAKA METRO-HA-54-3210' : `DHAKA METRO-LA-${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 8999)}`,
    registrationYear: '2023',
    ownership: 'Courier Owned (Verified)',
    fuelType: driver.vehicleType.includes('Electric') ? 'Lithium-Ion EV' : 'Octane / Petrol',
    odometer: `${(driver.completedOrders * 38.5 + 4200).toFixed(0)} km`,
    insuranceExpiry: 'Dec 15, 2026',
    taxTokenExpiry: 'Oct 30, 2026',
    fitnessCert: 'Valid (Passed)',
    lastServiceDate: 'May 12, 2024',
    nextServiceDue: 'Aug 12, 2024'
  };

  // Recent Customer Reviews & Feedback
  const customerReviews = [
    {
      id: 'REV-901',
      orderId: '#A7B9C2',
      customerName: 'Shakib Hasan',
      rating: 5,
      date: 'May 20, 2024',
      time: '11:46 AM',
      tags: ['Fast Delivery', 'Polite Behavior', 'Hot & Fresh'],
      comment: 'Arrived 8 mins earlier than estimated time! Very well-mannered rider and the food packaging was completely spill-free.',
      avatarBg: 'bg-emerald-500/20 text-emerald-400'
    },
    {
      id: 'REV-902',
      orderId: '#A7B9BD',
      customerName: 'Ayesha Rahman',
      rating: 5,
      date: 'May 19, 2024',
      time: '07:45 PM',
      tags: ['Perfect Route', 'Careful Handling'],
      comment: 'Excellent delivery service during heavy traffic in Dhanmondi. Called politely to confirm address before arriving.',
      avatarBg: 'bg-blue-500/20 text-blue-400'
    },
    {
      id: 'REV-903',
      orderId: '#A7B9B8',
      customerName: 'Tanvir Ahmed',
      rating: 4,
      date: 'May 18, 2024',
      time: '01:15 PM',
      tags: ['Good Communication'],
      comment: 'Rider was friendly. Small delay due to rain, but updated me over phone call.',
      avatarBg: 'bg-amber-500/20 text-amber-400'
    },
    {
      id: 'REV-904',
      orderId: '#A7B9A4',
      customerName: 'Nusrat Jahan',
      rating: 5,
      date: 'May 16, 2024',
      time: '08:30 PM',
      tags: ['Fast Delivery', 'Polite Behavior'],
      comment: 'Always reliable rider! Very quick and polite.',
      avatarBg: 'bg-purple-500/20 text-purple-400'
    },
    {
      id: 'REV-905',
      orderId: '#A7B989',
      customerName: 'Imran Hossain',
      rating: 5,
      date: 'May 14, 2024',
      time: '02:40 PM',
      tags: ['Safe Driving', 'Verified Driver'],
      comment: 'Super fast delivery. Followed delivery instructions perfectly.',
      avatarBg: 'bg-teal-500/20 text-teal-400'
    }
  ];

  const filteredReviews = customerReviews.filter(rev => {
    if (ratingFilter === 'all') return true;
    return rev.rating === ratingFilter;
  });

  const toggleStatus = () => {
    const nextStatus = driver.status === 'Online' ? 'Offline' : 'Online';
    onUpdateDriver({ ...driver, status: nextStatus });
    if (showToast) showToast(`${driver.name} is now ${nextStatus}`, 'info');
  };

  return (
    <div className="space-y-6 fade-in" id="driver-profile-view">
      
      {/* Top Navigation & Driver Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-card border border-brand-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-brand-dark/80 hover:bg-brand-border/40 text-gray-300 hover:text-white border border-brand-border rounded-lg cursor-pointer transition-all flex items-center space-x-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Drivers</span>
          </button>

          <span className="text-gray-600">|</span>

          {/* Quick Driver Selector Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 hidden md:inline">Viewing Profile:</span>
            <select
              value={driver.id}
              onChange={(e) => onSelectDriver(e.target.value)}
              className="px-3 py-1.5 bg-brand-dark text-white text-xs font-bold border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
            >
              {allDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id}) - {d.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer border transition-all flex items-center space-x-1.5 ${
              driver.status === 'Online'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${driver.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
            <span>{driver.status}</span>
          </button>

          <a
            href={`tel:${driver.phone}`}
            onClick={(e) => {
              e.preventDefault();
              if (showToast) showToast(`Initiating voice call to ${driver.name} (${driver.phone})...`, 'info');
            }}
            className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Call Rider</span>
          </a>
        </div>
      </div>

      {/* Driver Header Hero Banner Card */}
      <div className="bg-gradient-to-r from-[#0d1b2a] via-brand-card to-[#0e1e30] border border-brand-border/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Decorative Background Mesh */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Driver Information */}
          <div className="flex items-center space-x-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-500 p-0.5 shadow-xl shrink-0 relative">
              <div className="w-full h-full bg-[#0d1622] rounded-[14px] flex items-center justify-center text-2xl font-black text-brand-orange uppercase">
                {driver.name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-brand-card flex items-center justify-center ${
                driver.status === 'Online' ? 'bg-emerald-500' : 'bg-red-500'
              }`}>
                <CheckCircle2 className="w-3.0 h-3.0 text-white" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h2 className="text-2xl font-black text-white tracking-tight">{driver.name}</h2>
                <span className="px-2.5 py-0.5 bg-brand-orange/15 border border-brand-orange/30 text-brand-orange text-[10px] font-black uppercase rounded-full">
                  Verified Dispatch Courier
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  NID & Driving License Verified
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs text-gray-300 flex-wrap gap-y-1 pt-1">
                <span className="font-mono text-brand-orange font-bold">{driver.id}</span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5 text-gray-400" />
                  <span>{driver.vehicleType}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zone: Dhanmondi & Central Dhaka</span>
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs text-gray-400 pt-1">
                <span>Phone: <strong className="text-gray-200">{driver.phone}</strong></span>
                <span>•</span>
                <span>Joined: <strong className="text-gray-200">Jan 15, 2024</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto shrink-0 bg-brand-dark/60 p-3.5 border border-brand-border/60 rounded-xl text-center items-center">
            <div className="px-2">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Completed</p>
              <p className="text-lg font-black text-white mt-0.5">{driver.completedOrders} Orders</p>
              <p className="text-[9px] text-emerald-400 font-semibold mt-0.5">98.4% On-time</p>
            </div>
            <div className="px-2 border-x border-brand-border/40">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Earnings</p>
              <p className="text-lg font-black text-brand-green mt-0.5">৳{driver.earnings.toLocaleString()}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Wallet: ৳1,230</p>
            </div>
            <div className="px-2 flex flex-col items-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Rating Score</p>
              <div className="flex items-center justify-center space-x-1 text-amber-400 mt-0.5">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-lg font-black">{driver.rating.toFixed(1)}</span>
              </div>
              <div className="mt-1">
                <SparklineChart 
                  data={ratingTrend7Days} 
                  color={isRatingUp ? '#10b981' : '#ef4444'} 
                  isUp={isRatingUp} 
                  label={`${isRatingUp ? '+' : ''}${ratingDiff} (7d)`} 
                  width={64}
                  height={18}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Profile Module View Selector Tabs */}
      <div className="flex items-center space-x-2 border-b border-brand-border/60 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-brand-orange text-white shadow-md'
              : 'bg-brand-card text-gray-400 hover:text-white border border-brand-border'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Performance Metrics & Charts</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'timeline'
              ? 'bg-brand-orange text-white shadow-md'
              : 'bg-brand-card text-gray-400 hover:text-white border border-brand-border hover:border-brand-orange/40'
          }`}
        >
          <History className="w-4 h-4 text-emerald-400" />
          <span>Duty Status Timeline</span>
          <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded-full border border-emerald-500/30">
            {driver.statusHistory?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'heatmap'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-brand-card text-gray-400 hover:text-white border border-brand-border hover:border-red-500/40'
          }`}
        >
          <Flame className="w-4 h-4 text-red-400 fill-red-400/20" />
          <span>Delivery Zone Heatmap</span>
        </button>

        <button
          onClick={() => setActiveTab('ratings')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'ratings'
              ? 'bg-brand-orange text-white shadow-md'
              : 'bg-brand-card text-gray-400 hover:text-white border border-brand-border'
          }`}
        >
          <Star className="w-4 h-4 text-amber-300" />
          <span>Recent Ratings & Reviews</span>
        </button>

        <button
          onClick={() => setActiveTab('vehicle')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'vehicle'
              ? 'bg-brand-orange text-white shadow-md'
              : 'bg-brand-card text-gray-400 hover:text-white border border-brand-border'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Vehicle Breakdown & Health Charts</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PERFORMANCE METRICS & CHARTS                       */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 fade-in">
          
          {/* 5 Key Performance Indicator Cards with 7-Day Recent Trend Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: 7-Day Driver Rating / Earnings Trend Sparkline */}
            <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl shadow-sm hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  {trendMetricMode === 'ratings' ? 'Driver Rating' : 'Daily Earnings'}
                </span>
                
                {/* Metric Toggle */}
                <div className="flex items-center space-x-1 bg-brand-dark/80 p-0.5 rounded-lg border border-brand-border/60">
                  <button
                    onClick={() => setTrendMetricMode('ratings')}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer ${
                      trendMetricMode === 'ratings' ? 'bg-amber-500 text-brand-dark' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Switch to Rating Trend"
                  >
                    ★ Rating
                  </button>
                  <button
                    onClick={() => setTrendMetricMode('earnings')}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer ${
                      trendMetricMode === 'earnings' ? 'bg-emerald-500 text-brand-dark' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Switch to Earnings Trend"
                  >
                    ৳ Earnings
                  </button>
                </div>
              </div>
              
              <div className="flex items-end justify-between gap-2 pt-1">
                {trendMetricMode === 'ratings' ? (
                  <div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-black text-white">{driver.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-amber-400 font-bold">/ 5.0</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 mt-0.5">142 reviews</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-black text-emerald-400">৳{earningsTrend7Days[earningsTrend7Days.length - 1].toLocaleString()}</span>
                    </div>
                    <p className="text-[9.5px] text-gray-400 mt-0.5">7d Payout Pace</p>
                  </div>
                )}

                <SparklineChart 
                  data={trendMetricMode === 'ratings' ? ratingTrend7Days : earningsTrend7Days} 
                  color={trendMetricMode === 'ratings' ? (isRatingUp ? '#f59e0b' : '#ef4444') : '#10b981'} 
                  isUp={trendMetricMode === 'ratings' ? isRatingUp : isEarningsUp} 
                  label={
                    trendMetricMode === 'ratings' 
                      ? `${isRatingUp ? '+' : ''}${ratingDiff} (7d)` 
                      : `${isEarningsUp ? '+' : ''}৳${earningsDiff.toLocaleString()} (7d)`
                  } 
                />
              </div>
            </div>

            {/* Card 2: On-Time Delivery Rate */}
            <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">On-Time Rate</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 pt-1">
                <div>
                  <span className="text-2xl font-black text-white">98.4%</span>
                  <p className="text-[9.5px] text-gray-400 mt-0.5">Avg 16.5m/order</p>
                </div>

                <SparklineChart 
                  data={onTimeTrend7Days} 
                  color="#10b981" 
                  isUp={true} 
                  label="+2.2% (7d)" 
                />
              </div>
            </div>

            {/* Card 3: Acceptance Rate */}
            <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl shadow-sm hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Acceptance Rate</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <ThumbsUp className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 pt-1">
                <div>
                  <span className="text-2xl font-black text-white">96.2%</span>
                  <p className="text-[9.5px] text-gray-400 mt-0.5">Accepts 19/20</p>
                </div>

                <SparklineChart 
                  data={acceptanceTrend7Days} 
                  color="#3b82f6" 
                  isUp={true} 
                  label="+4.2% (7d)" 
                />
              </div>
            </div>

            {/* Card 4: Cancellation Rate */}
            <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Cancel Rate</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 pt-1">
                <div>
                  <span className="text-2xl font-black text-emerald-400">1.2%</span>
                  <p className="text-[9.5px] text-gray-400 mt-0.5">Low / Safe</p>
                </div>

                <SparklineChart 
                  data={cancellationTrend7Days} 
                  color="#10b981" 
                  isUp={true} 
                  label="-1.6% (improving)" 
                />
              </div>
            </div>

            {/* Card 5: Order Volume Pace */}
            <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl shadow-sm hover:border-brand-orange/50 transition-all flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Daily Pace</span>
                <div className="w-7 h-7 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 pt-1">
                <div>
                  <span className="text-2xl font-black text-white">22/day</span>
                  <p className="text-[9.5px] text-gray-400 mt-0.5">{driver.completedOrders} total</p>
                </div>

                <SparklineChart 
                  data={ordersTrend7Days} 
                  color="#f97316" 
                  isUp={true} 
                  label="+11 orders/d" 
                />
              </div>
            </div>

          </div>

          {/* Charts Row: Deliveries & Revenue Trend + Peak Time Efficiency */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Performance Area Chart (2 Cols) */}
            <div className="lg:col-span-2 bg-brand-card border border-brand-border p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-orange" />
                    Delivery Volume & Earnings Trend
                  </h3>
                  <p className="text-[11px] text-gray-400">Historical performance metrics overview</p>
                </div>

                <div className="flex items-center space-x-1.5 bg-brand-dark/80 p-1 rounded-lg border border-brand-border/60">
                  <button
                    onClick={() => setTimeRange('week')}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      timeRange === 'week' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setTimeRange('month')}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      timeRange === 'month' ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentPerformanceData}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#f97316" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="earnings" name="Earnings (৳)" stroke="#f97316" fillOpacity={1} fill="url(#colorEarnings)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="orders" name="Completed Orders" stroke="#10b981" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly Peak Time Bar Chart (1 Col) */}
            <div className="bg-brand-card border border-brand-border p-5 rounded-xl shadow-sm space-y-4">
              <div className="border-b border-brand-border/60 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Peak Hour Efficiency
                </h3>
                <p className="text-[11px] text-gray-400">Deliveries fulfilled by time slot</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="time" type="category" stroke="#cbd5e1" fontSize={9} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="deliveries" name="Orders Fulfilled" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Quick Heatmap & Delivery Hotspot Preview Banner */}
          <div className="bg-brand-card border border-brand-border/80 p-5 rounded-xl shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3 relative z-10">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400 fill-red-400/20" />
                  <span>Top Delivery Hotspots & High-Demand Zones</span>
                </h3>
                <p className="text-[11px] text-gray-400">Concentration of fulfilled orders across Dhaka dispatch zones</p>
              </div>

              <button
                onClick={() => setActiveTab('heatmap')}
                className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <Map className="w-3.5 h-3.5" />
                <span>Open Full Interactive Heatmap →</span>
              </button>
            </div>

            {/* Hotspot Pills & Quick Density Meters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {heatmapZones.slice(0, 3).map((zone) => (
                <div 
                  key={zone.id} 
                  className="bg-brand-dark/60 border border-brand-border/60 p-3.5 rounded-xl space-y-2 hover:border-red-500/40 transition-all cursor-pointer group" 
                  onClick={() => { setSelectedZoneId(zone.id); setActiveTab('heatmap'); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 group-hover:text-brand-orange transition-colors">
                      <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: zone.heatColor }}></span>
                      {zone.name}
                    </span>
                    <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded ${zone.badgeBg}`}>
                      {zone.demandLevel}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-lg font-black text-white">{zone.orders} Orders</span>
                      <span className="text-[10px] text-gray-400 block font-mono">৳{zone.earnings.toLocaleString()} generated</span>
                    </div>
                    <span className="text-xs font-black text-amber-400 font-mono">{zone.sharePct}% of total</span>
                  </div>

                  <div className="w-full h-1.5 bg-brand-dark rounded-full overflow-hidden border border-white/10">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${zone.sharePct}%`, backgroundColor: zone.heatColor }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Recent Duty Status History Timeline Preview Card */}
          <div className="bg-brand-card border border-brand-border p-5 rounded-xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Recent Duty Status History Log</span>
                </h3>
                <p className="text-[11px] text-gray-400">Timestamped operational status changes recorded for {driver.name}</p>
              </div>

              <button
                onClick={() => setActiveTab('timeline')}
                className="px-3.5 py-1.5 bg-brand-orange/15 hover:bg-brand-orange text-brand-orange hover:text-white border border-brand-orange/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>View Full Interactive Timeline ({driver.statusHistory?.length || 0}) →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(driver.statusHistory || []).slice(0, 3).map((log) => (
                <div key={log.id} className="bg-brand-dark/60 border border-brand-border/60 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                      log.status === 'Online'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : log.status === 'On-Delivery'
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {log.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{log.formattedTime || log.timestamp.substring(11, 16)}</span>
                  </div>
                  <p className="text-xs text-gray-200 line-clamp-1 font-medium">{log.reason}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-brand-border/30">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-brand-orange" />
                      <span>{log.updatedBy || 'System'}</span>
                    </span>
                    {log.location && (
                      <span className="flex items-center gap-1 text-gray-400">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{log.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: DUTY STATUS CHANGE HISTORY TIMELINE                  */}
      {/* ========================================================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 fade-in">
          
          {/* Timeline Header & Control Bar */}
          <div className="bg-gradient-to-r from-[#0e1e30] via-brand-card to-[#122238] border border-brand-border p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Driver Duty Status Change History & Timeline</span>
                    <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono rounded-full">
                      Live Audit Trail
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Real-time timestamped log tracking transitions between <strong className="text-emerald-400">Online</strong>, <strong className="text-purple-300">On-Delivery</strong>, and <strong className="text-red-400">Offline</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Quick Duty Switch Controls */}
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Switch Status:</span>

              <button
                onClick={() => handleQuickStatusChange('Online')}
                disabled={driver.status === 'Online'}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  driver.status === 'Online'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 opacity-70 cursor-not-allowed'
                    : 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Set Online</span>
              </button>

              <button
                onClick={() => handleQuickStatusChange('On-Delivery')}
                disabled={driver.status === 'On-Delivery'}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  driver.status === 'On-Delivery'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 opacity-70 cursor-not-allowed'
                    : 'bg-purple-500/15 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Set On-Delivery</span>
              </button>

              <button
                onClick={() => handleQuickStatusChange('Offline')}
                disabled={driver.status === 'Offline'}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  driver.status === 'Offline'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 opacity-70 cursor-not-allowed'
                    : 'bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>Set Offline</span>
              </button>

              <button
                onClick={() => setIsAddLogModalOpen(true)}
                className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Custom Event</span>
              </button>

              <button
                onClick={handleExportTimelineCSV}
                className="px-3 py-1.5 bg-brand-dark/80 hover:bg-brand-card text-gray-300 border border-brand-border rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                title="Export status change history to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Timeline Operational Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Current Duty Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`w-3 h-3 rounded-full animate-pulse ${
                    driver.status === 'Online' ? 'bg-emerald-500' : driver.status === 'On-Delivery' ? 'bg-purple-500' : 'bg-red-500'
                  }`}></span>
                  <span className={`text-base font-black ${
                    driver.status === 'Online' ? 'text-emerald-400' : driver.status === 'On-Delivery' ? 'text-purple-300' : 'text-red-400'
                  }`}>
                    {driver.status}
                  </span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
                LIVE
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Recorded Logs</p>
                <p className="text-lg font-black text-white mt-0.5">{driver.statusHistory?.length || 0} Status Transitions</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <History className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Last Transition</p>
                <p className="text-xs font-bold text-gray-200 mt-1">
                  {driver.statusHistory && driver.statusHistory[0] ? (driver.statusHistory[0].formattedTime || driver.statusHistory[0].timestamp.substring(11, 16)) : 'No logs'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Shift Activity Status</p>
                <p className="text-lg font-black text-brand-orange mt-0.5">Active Fleet</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Timeline Search & Filter Toolbar */}
          <div className="bg-brand-card border border-brand-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter logs by reason, location or actor..."
                value={timelineSearchQuery}
                onChange={(e) => setTimelineSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-brand-dark/80 text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto overflow-x-auto justify-between md:justify-end">
              <div className="flex items-center space-x-1.5 shrink-0">
                {(['All', 'Online', 'On-Delivery', 'Offline'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTimelineFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                      timelineFilterStatus === st
                        ? 'bg-brand-orange/15 border-brand-orange text-brand-orange font-bold'
                        : 'bg-brand-dark/50 border-brand-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setTimelineSortOrder(timelineSortOrder === 'newest' ? 'oldest' : 'newest')}
                className="px-3 py-1.5 bg-brand-dark/60 text-xs text-gray-300 border border-brand-border rounded-lg hover:border-gray-500 transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-gray-400" />
                <span>Sort: {timelineSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
              </button>
            </div>
          </div>

          {/* Timeline Feed Container */}
          <div className="bg-brand-card border border-brand-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-orange" />
                <span>Chronological Status Event Stream</span>
              </h4>
              <span className="text-[11px] text-gray-400 font-mono">
                Showing {
                  (driver.statusHistory || []).filter(item => {
                    const matchSt = timelineFilterStatus === 'All' || item.status === timelineFilterStatus;
                    const matchText = (item.reason || '').toLowerCase().includes(timelineSearchQuery.toLowerCase()) ||
                                      (item.location || '').toLowerCase().includes(timelineSearchQuery.toLowerCase()) ||
                                      (item.updatedBy || '').toLowerCase().includes(timelineSearchQuery.toLowerCase());
                    return matchSt && matchText;
                  }).length
                } of {(driver.statusHistory || []).length} event logs
              </span>
            </div>

            {/* Render Vertical Interactive Timeline */}
            <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-brand-orange before:via-emerald-500/50 before:to-gray-700">
              {(() => {
                const logs = (driver.statusHistory || []).filter(item => {
                  const matchSt = timelineFilterStatus === 'All' || item.status === timelineFilterStatus;
                  const matchText = (item.reason || '').toLowerCase().includes(timelineSearchQuery.toLowerCase()) ||
                                    (item.location || '').toLowerCase().includes(timelineSearchQuery.toLowerCase()) ||
                                    (item.updatedBy || '').toLowerCase().includes(timelineSearchQuery.toLowerCase());
                  return matchSt && matchText;
                });

                const sortedLogs = [...logs].sort((a, b) => {
                  const timeA = new Date(a.timestamp).getTime();
                  const timeB = new Date(b.timestamp).getTime();
                  return timelineSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
                });

                if (sortedLogs.length === 0) {
                  return (
                    <div className="py-12 text-center text-sm text-gray-400 bg-brand-dark/40 rounded-xl border border-brand-border/40">
                      <History className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="font-bold text-gray-300">No status change logs match your filters</p>
                      <p className="text-xs text-gray-500 mt-1">Try resetting search terms or status filters.</p>
                    </div>
                  );
                }

                return sortedLogs.map((log) => {
                  const isOnline = log.status === 'Online';
                  const isOnDelivery = log.status === 'On-Delivery';
                  const isOffline = log.status === 'Offline';

                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline Node Circle */}
                      <div className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full border-2 border-brand-card flex items-center justify-center transition-transform group-hover:scale-110 shadow-md ${
                        isOnline
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                          : isOnDelivery
                          ? 'bg-purple-500 text-white shadow-purple-500/30'
                          : 'bg-red-500 text-white shadow-red-500/30'
                      }`}>
                        {isOnline && <Zap className="w-3 h-3" />}
                        {isOnDelivery && <Package className="w-3 h-3" />}
                        {isOffline && <Power className="w-3 h-3" />}
                      </div>

                      {/* Timeline Content Card */}
                      <div className="bg-brand-dark/70 border border-brand-border/70 rounded-xl p-4 space-y-3 hover:border-brand-orange/40 transition-all shadow-sm">
                        
                        {/* Event Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/40 pb-2.5">
                          <div className="flex items-center space-x-2.5">
                            <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border flex items-center gap-1.5 ${
                              isOnline
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : isOnDelivery
                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : isOnDelivery ? 'bg-purple-300' : 'bg-red-400'}`}></span>
                              {log.status}
                            </span>

                            <span className="text-xs font-bold text-white font-mono">
                              {log.formattedTime || log.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-gray-400 font-mono bg-brand-card px-2 py-0.5 rounded border border-brand-border/60">
                              ID: {log.id}
                            </span>
                            <button
                              onClick={() => handleDeleteStatusLog(log.id)}
                              className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete status log entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Event Reason / Note */}
                        <p className="text-xs text-gray-200 font-medium leading-relaxed">
                          {log.reason || 'Status updated'}
                        </p>

                        {/* Context Pills (UpdatedBy, Location, Duration) */}
                        <div className="flex items-center space-x-3 text-[11px] text-gray-400 flex-wrap gap-y-1.5 pt-1">
                          <span className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1 rounded-lg border border-brand-border/60 text-gray-300">
                            <User className="w-3 h-3 text-brand-orange" />
                            <span>Actor: <strong className="text-white">{log.updatedBy || 'System'}</strong></span>
                          </span>

                          {log.location && (
                            <span className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1 rounded-lg border border-brand-border/60 text-gray-300">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              <span>Zone: <strong className="text-white">{log.location}</strong></span>
                            </span>
                          )}

                          {log.durationMinutes && (
                            <span className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1 rounded-lg border border-brand-border/60 text-gray-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Duration: <strong className="text-white">{log.durationMinutes} mins</strong></span>
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HIGH-DEMAND DELIVERY ZONE HEATMAP                  */}
      {/* ========================================================= */}
      {activeTab === 'heatmap' && (
        <div className="space-y-6 fade-in">
          
          {/* Heatmap Top Control & KPI Header */}
          <div className="bg-gradient-to-r from-red-950/40 via-brand-card to-amber-950/30 border border-brand-border p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-current" /> GIS Spatial Radar
                </span>
                <span className="text-xs text-gray-400">• Driver Hotspot Analytics</span>
              </div>
              <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                <span>Dhaka High-Demand Delivery Zone Heatmap</span>
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Visual density mapping highlighting high-frequency fulfillment zones for <strong className="text-brand-orange">{driver.name}</strong>.
              </p>
            </div>

            {/* Timeframe & Filter controls */}
            <div className="flex items-center space-x-2 bg-brand-dark/80 p-1.5 rounded-xl border border-brand-border/60">
              <span className="text-[10px] text-gray-400 uppercase font-bold px-2 hidden sm:inline">Timeframe:</span>
              {(['7d', '30d', 'all'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setHeatmapTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                    heatmapTimeframe === tf ? 'bg-red-500 text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tf === '7d' ? 'Past 7 Days' : tf === '30d' ? 'Past 30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Main Visual Heatmap Canvas & Zone Deep Dive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: High-Tech 2D Heatmap Radar Canvas */}
            <div className="lg:col-span-2 bg-brand-card border border-brand-border p-5 rounded-2xl shadow-sm space-y-4 relative">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div className="flex items-center space-x-2">
                  <Map className="w-4 h-4 text-red-400" />
                  <h4 className="text-sm font-bold text-white">Live Zone Density Canvas (Dhaka Dispatch Grid)</h4>
                </div>

                {/* Heatmap intensity legend */}
                <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Med</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> High</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> Hotspot</span>
                </div>
              </div>

              {/* Simulated Map Canvas */}
              <div className="relative w-full h-80 sm:h-96 rounded-xl bg-[#09111e] border border-brand-border/80 overflow-hidden shadow-inner flex items-center justify-center">
                
                {/* Canvas Background Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d_1px,transparent_1px),linear-gradient(to_bottom,#1f293d_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>

                {/* Concentric Radar Rings Decorative */}
                <div className="absolute w-72 h-72 rounded-full border border-red-500/10 pointer-events-none"></div>
                <div className="absolute w-96 h-96 rounded-full border border-amber-500/10 pointer-events-none"></div>

                {/* Dhaka City Landmarks Labels */}
                <span className="absolute top-3 left-4 text-[9px] font-mono font-bold text-gray-600 uppercase tracking-widest pointer-events-none">
                  NORTH DHAKA DISPATCH CLUSTER (UTTARA / GULSHAN)
                </span>
                <span className="absolute bottom-3 right-4 text-[9px] font-mono font-bold text-gray-600 uppercase tracking-widest pointer-events-none">
                  SOUTH DHAKA SECTOR (OLD DHAKA / MOTIJHEEL)
                </span>

                {/* Heatmap Nodes Positioned on Canvas */}
                {heatmapZones.map((zone) => {
                  const isSelected = selectedZoneId === zone.id;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      style={{ left: zone.coordinates.x, top: zone.coordinates.y }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group/node transition-all z-20"
                    >
                      {/* Glowing Heat Radial Halo */}
                      <div
                        className={`absolute -inset-6 rounded-full blur-xl opacity-60 transition-all duration-300 group-hover/node:scale-125 ${
                          isSelected ? 'scale-150 opacity-90' : ''
                        }`}
                        style={{ backgroundColor: zone.heatColor }}
                      ></div>

                      {/* Animated Pulse Ring */}
                      <div
                        className="absolute -inset-3 rounded-full border-2 animate-ping opacity-40 pointer-events-none"
                        style={{ borderColor: zone.heatColor }}
                      ></div>

                      {/* Center Node Button */}
                      <div
                        className={`relative px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 shadow-2xl transition-all duration-300 ${
                          isSelected
                            ? 'bg-brand-dark text-white border-white scale-110 ring-2 ring-brand-orange'
                            : 'bg-brand-dark/90 text-gray-200 border-white/20 hover:border-white'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.heatColor }}></span>
                        <div className="text-left">
                          <p className="text-[10.5px] font-black leading-none">{zone.name.split(' ')[0]}</p>
                          <p className="text-[8.5px] font-mono font-bold text-gray-400 leading-tight mt-0.5">{zone.orders} orders</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Selected Zone Hover Overlay Badge */}
                <div className="absolute bottom-3 left-3 bg-brand-dark/95 border border-brand-border p-3 rounded-xl shadow-xl max-w-xs space-y-1 z-30 backdrop-blur-md">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentZone.heatColor }}></span>
                    <span className="text-xs font-black text-white">{currentZone.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-300">
                    <strong className="text-amber-400">{currentZone.sharePct}%</strong> of driver deliveries happen here. ({currentZone.orders} orders fulfilled)
                  </p>
                </div>

              </div>

              {/* Heatmap Zone Bar Comparison */}
              <div className="pt-2">
                <h5 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Volume Distribution by Dhaka Zone</h5>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={heatmapZones}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickFormatter={(val) => val.split(' ')[0]} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="orders" name="Fulfilled Orders" radius={[4, 4, 0, 0]}>
                        {heatmapZones.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.heatColor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Right 1 Col: Selected Zone Deep-Dive Details & Merchants */}
            <div className="bg-brand-card border border-brand-border p-5 rounded-2xl shadow-sm space-y-5">
              <div className="border-b border-brand-border/60 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-brand-orange" />
                    <span>Zone Analytical Breakdown</span>
                  </h4>
                  <p className="text-[11px] text-gray-400">Click any zone node to inspect metrics</p>
                </div>
                <span className={`px-2.5 py-0.5 text-[9.5px] font-black uppercase rounded-full border ${currentZone.badgeBg}`}>
                  {currentZone.demandLevel}
                </span>
              </div>

              {/* Selected Zone Header */}
              <div className="bg-brand-dark/70 border border-brand-border p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">{currentZone.name}</h3>
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-brand-orange">
                    Score: {currentZone.demandScore}/100
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{currentZone.description}</p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-brand-dark/50 border border-brand-border/60 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Total Zone Orders</p>
                  <p className="text-xl font-black text-white mt-1">{currentZone.orders}</p>
                  <p className="text-[9px] text-emerald-400 font-bold mt-0.5">{currentZone.sharePct}% of total driver jobs</p>
                </div>

                <div className="bg-brand-dark/50 border border-brand-border/60 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Total Zone Revenue</p>
                  <p className="text-xl font-black text-brand-green mt-1">৳{currentZone.earnings.toLocaleString()}</p>
                  <p className="text-[9px] text-gray-400 font-medium mt-0.5">Avg ৳{Math.round(currentZone.earnings / (currentZone.orders || 1))}/order</p>
                </div>

                <div className="bg-brand-dark/50 border border-brand-border/60 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Avg Delivery Speed</p>
                  <p className="text-xl font-black text-amber-400 mt-1">{currentZone.avgSpeed}</p>
                  <p className="text-[9px] text-gray-400 font-medium mt-0.5">Spill-free packaging</p>
                </div>

                <div className="bg-brand-dark/50 border border-brand-border/60 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Peak Order Window</p>
                  <p className="text-xs font-bold text-white mt-1 leading-tight">{currentZone.peakHours.split('&')[0]}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Lunch & Dinner surges</p>
                </div>
              </div>

              {/* Top Merchant Pickups in this Zone */}
              <div className="space-y-2 pt-1">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Top Merchant Pickup Hotspots</span>
                </h5>
                <div className="space-y-1.5">
                  {currentZone.topMerchants.map((merchant, mIdx) => (
                    <div key={mIdx} className="bg-brand-dark/40 border border-brand-border/40 px-3 py-2 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange"></span>
                        {merchant}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">High Frequency</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: RECENT DELIVERY RATINGS & CUSTOMER REVIEWS         */}
      {/* ========================================================= */}
      {activeTab === 'ratings' && (
        <div className="space-y-6 fade-in">

          {/* 7-Day Rating & Earnings Trajectory Sparkline Banner */}
          <div className="bg-brand-card border border-brand-border p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>
                    7-Day {trendMetricMode === 'ratings' ? 'Driver Rating Trajectory' : 'Earnings & Financial Trend'}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  {trendMetricMode === 'ratings' 
                    ? 'Daily customer satisfaction score movement over the past 7 days' 
                    : 'Daily financial payouts and revenue generation over the past 7 days'}
                </p>
              </div>

              {/* Sparkline Metric Toggle Pills */}
              <div className="flex items-center space-x-1.5 bg-brand-dark/90 p-1 rounded-xl border border-brand-border">
                <button
                  onClick={() => setTrendMetricMode('ratings')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    trendMetricMode === 'ratings' 
                      ? 'bg-amber-500 text-brand-dark shadow font-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Rating Trends</span>
                </button>

                <button
                  onClick={() => setTrendMetricMode('earnings')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    trendMetricMode === 'earnings' 
                      ? 'bg-emerald-500 text-brand-dark shadow font-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Earnings Trends</span>
                </button>
              </div>
            </div>

            {/* Metric Summary Ribbon */}
            <div className="flex items-center justify-between text-xs bg-brand-dark/50 px-3 py-2 rounded-xl border border-brand-border/40">
              <span className="text-gray-400">Current 7-Day Indicator:</span>
              {trendMetricMode === 'ratings' ? (
                <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{driver.rating.toFixed(1)} / 5.0 Score</span>
                  <span className={`text-[11px] flex items-center gap-0.5 ${isRatingUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({isRatingUp ? '+' : ''}{ratingDiff} 7d delta)
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-emerald-400 font-mono font-bold">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>৳{earningsTrend7Days[earningsTrend7Days.length - 1].toLocaleString()} daily</span>
                  <span className={`text-[11px] flex items-center gap-0.5 ${isEarningsUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({isEarningsUp ? '+' : ''}৳{earningsDiff.toLocaleString()} 7d delta)
                  </span>
                </div>
              )}
            </div>

            {/* Recharts Area / Line Chart for 7-Day Trajectory */}
            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {trendMetricMode === 'ratings' ? (
                  <AreaChart data={ratingTrendChartData}>
                    <defs>
                      <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[3.5, 5.0]} stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}★`} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} Stars`, 'Rating Score']}
                    />
                    <Area type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#ratingGrad)" />
                  </AreaChart>
                ) : (
                  <AreaChart data={earningsTrendChartData}>
                    <defs>
                      <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `৳${v}`} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`৳${val.toLocaleString()}`, 'Daily Revenue']}
                    />
                    <Area type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#earningsGrad)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Rating Breakdown & Distribution Chart */}
            <div className="bg-brand-card border border-brand-border p-5 rounded-xl shadow-sm space-y-4">
              <div className="text-center border-b border-brand-border/60 pb-4">
                <span className="text-4xl font-black text-white">{driver.rating.toFixed(1)}</span>
                <div className="flex items-center justify-center space-x-1 text-amber-400 my-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-gray-400 font-medium">Based on 142 Customer Reviews</p>
                <span className="inline-block px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9.5px] font-black uppercase rounded-full mt-2">
                  98% Positive Feedback Score
                </span>
              </div>

              {/* Progress Bars for Ratings */}
              <div className="space-y-2.5 pt-1">
                {ratingDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-300 font-medium flex items-center gap-1">
                        <span>{item.name}</span>
                      </span>
                      <span className="text-gray-400 font-mono">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-brand-dark rounded-full overflow-hidden border border-brand-border/40">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compliments / Tag Cloud */}
              <div className="pt-3 border-t border-brand-border/60">
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">Top Rider Compliments</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold">
                    ⚡ Fast Delivery (68)
                  </span>
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold">
                    😊 Polite Behavior (54)
                  </span>
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-bold">
                    🍱 Food Intact (49)
                  </span>
                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold">
                    🔥 Hot & Fresh (42)
                  </span>
                </div>
              </div>

            </div>

            {/* Customer Reviews List */}
            <div className="lg:col-span-2 bg-brand-card border border-brand-border p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-orange" />
                    Recent Customer Ratings & Feedback
                  </h3>
                  <p className="text-[11px] text-gray-400">Verified feedback submitted via mobile customer app</p>
                </div>

                {/* Star Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setRatingFilter('all')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                      ratingFilter === 'all' ? 'bg-brand-orange text-white' : 'bg-brand-dark text-gray-400 border border-brand-border'
                    }`}
                  >
                    All ({customerReviews.length})
                  </button>
                  {[5, 4, 3].map((starVal) => (
                    <button
                      key={starVal}
                      onClick={() => setRatingFilter(starVal)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center space-x-0.5 ${
                        ratingFilter === starVal ? 'bg-amber-500 text-brand-dark' : 'bg-brand-dark text-gray-400 border border-brand-border'
                      }`}
                    >
                      <span>{starVal}</span>
                      <Star className="w-2.5 h-2.5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Reviews Items */}
              <div className="space-y-3">
                {filteredReviews.map((rev) => (
                  <div key={rev.id} className="bg-brand-dark/50 border border-brand-border/60 p-4 rounded-xl space-y-2 hover:border-brand-orange/30 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ${rev.avatarBg}`}>
                          {rev.customerName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{rev.customerName}</h4>
                          <p className="text-[10px] text-gray-400">Order <span className="text-brand-orange font-mono font-bold">{rev.orderId}</span> • {rev.date}</p>
                        </div>
                      </div>

                      {/* Golden Stars */}
                      <div className="flex items-center space-x-0.5 text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                    </div>

                    {/* Tag Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rev.tags.map((tg, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 bg-brand-card text-gray-300 border border-brand-border/60 text-[9px] font-semibold rounded">
                          ✓ {tg}
                        </span>
                      ))}
                    </div>

                    {/* Comment text */}
                    <p className="text-xs text-gray-200 leading-relaxed italic bg-brand-card/40 p-2.5 rounded-lg border border-brand-border/40">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}

                {filteredReviews.length === 0 && (
                  <div className="py-8 text-center text-xs text-gray-400">
                    No reviews found for this filter.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: VEHICLE DETAIL BREAKDOWN & HEALTH CHARTS           */}
      {/* ========================================================= */}
      {activeTab === 'vehicle' && (
        <div className="space-y-6 fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Vehicle Technical Specifications Card */}
            <div className="bg-brand-card border border-brand-border p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Vehicle Specifications</h3>
                    <p className="text-[10px] text-gray-400">Rider dispatch unit details</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase rounded">
                  Active Unit
                </span>
              </div>

              {/* Specs Grid */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-brand-border/30">
                  <span className="text-gray-400">Vehicle Model</span>
                  <span className="font-bold text-white text-right">{vehicleDetails.model}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/30">
                  <span className="text-gray-400">License Plate</span>
                  <span className="font-mono font-bold text-brand-orange text-right">{vehicleDetails.plateNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/30">
                  <span className="text-gray-400">Fuel / Energy Type</span>
                  <span className="font-bold text-emerald-400 text-right">{vehicleDetails.fuelType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/30">
                  <span className="text-gray-400">Ownership Type</span>
                  <span className="font-medium text-gray-200 text-right">{vehicleDetails.ownership}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/30">
                  <span className="text-gray-400">Odometer Reading</span>
                  <span className="font-mono font-bold text-white text-right">{vehicleDetails.odometer}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/30">
                  <span className="text-gray-400">Insurance Expiry</span>
                  <span className="font-bold text-emerald-400 text-right">{vehicleDetails.insuranceExpiry}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/30">
                  <span className="text-gray-400">Fitness Clearance</span>
                  <span className="font-bold text-emerald-400 text-right">{vehicleDetails.fitnessCert}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Last Service Date</span>
                  <span className="font-bold text-white text-right">{vehicleDetails.lastServiceDate}</span>
                </div>
              </div>
            </div>

            {/* Vehicle Detail Charts (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Chart 1: Vehicle Health Systems Radar / Bar breakdown */}
              <div className="bg-brand-card border border-brand-border p-5 rounded-xl shadow-sm space-y-4">
                <div className="border-b border-brand-border/60 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-emerald-400" />
                      Vehicle Systems Health Analysis
                    </h3>
                    <p className="text-[11px] text-gray-400">Automated diagnostic score across core components</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg">
                    Overall Health: 93.6% (Optimal)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* Recharts Bar Chart for Health */}
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vehicleHealthData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                        <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={10} />
                        <YAxis dataKey="system" type="category" stroke="#cbd5e1" fontSize={9} width={100} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                        <Bar dataKey="score" name="Health Rating %" fill="#10b981" radius={[0, 4, 4, 0]}>
                          {vehicleHealthData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Diagnostic Summary Cards */}
                  <div className="space-y-3">
                    {vehicleHealthData.map((sys, sIdx) => (
                      <div key={sIdx} className="bg-brand-dark/50 p-2.5 rounded-lg border border-brand-border/40 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-200">{sys.system}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 h-2 bg-brand-dark rounded-full overflow-hidden border border-white/10">
                            <div className="h-full rounded-full" style={{ width: `${sys.score}%`, backgroundColor: sys.fill }}></div>
                          </div>
                          <span className="text-xs font-black font-mono" style={{ color: sys.fill }}>{sys.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Chart 2: Weekly Fuel / Energy Efficiency Chart */}
              <div className="bg-brand-card border border-brand-border p-5 rounded-xl shadow-sm space-y-4">
                <div className="border-b border-brand-border/60 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-amber-400" />
                      Weekly Mileage & Fuel Efficiency Breakdown
                    </h3>
                    <p className="text-[11px] text-gray-400">Kilometers driven vs fuel consumed (km/L efficiency ratio)</p>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    Avg: 44.5 km/Liter
                  </span>
                </div>

                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fuelEfficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                      <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                      <YAxis yAxisId="km" stroke="#3b82f6" fontSize={11} name="KM" />
                      <YAxis yAxisId="fuel" orientation="right" stroke="#f59e0b" fontSize={11} name="Liters" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar yAxisId="km" dataKey="km" name="Distance (km)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="fuel" dataKey="fuelLiters" name="Fuel Consumed (L)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Manual Status Change Entry Modal */}
      {isAddLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 fade-in">
            
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Log Custom Duty Status Change</h3>
                  <p className="text-[11px] text-gray-400">Record timestamped audit entry for {driver.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddLogModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-brand-dark transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualLogSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Select Duty Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Online', 'On-Delivery', 'Offline'] as const).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setNewLogStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        newLogStatus === st
                          ? st === 'Online'
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                            : st === 'On-Delivery'
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                            : 'bg-red-500 text-white border-red-400 shadow-md'
                          : 'bg-brand-dark/80 text-gray-400 border-brand-border hover:text-white'
                      }`}
                    >
                      {st === 'Online' && <Zap className="w-3.5 h-3.5" />}
                      {st === 'On-Delivery' && <Package className="w-3.5 h-3.5" />}
                      {st === 'Offline' && <Power className="w-3.5 h-3.5" />}
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Reason / Operational Event Note
                </label>
                <textarea
                  required
                  rows={3}
                  value={newLogReason}
                  onChange={(e) => setNewLogReason(e.target.value)}
                  placeholder="e.g., Rider requested short tea break / Assigned Order #ORD-001258 / Bike Maintenance"
                  className="w-full bg-brand-dark border border-brand-border rounded-xl p-3 text-xs text-white outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Location / Zone
                  </label>
                  <input
                    type="text"
                    value={newLogLocation}
                    onChange={(e) => setNewLogLocation(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-orange"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Updated By / Actor
                  </label>
                  <input
                    type="text"
                    value={newLogActor}
                    onChange={(e) => setNewLogActor(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setIsAddLogModalOpen(false)}
                  className="w-1/2 py-2.5 bg-brand-dark border border-brand-border text-gray-300 rounded-xl text-xs font-bold hover:bg-brand-card transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Status Log</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

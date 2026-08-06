/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Driver } from '../types';
import { 
  X, GitCompare, Star, Award, TrendingUp, TrendingDown, Clock, 
  ThumbsUp, ShieldCheck, MapPin, CheckCircle2, Flame, ArrowRightLeft,
  ChevronRight, ArrowUpRight, Zap, Trophy, Truck
} from 'lucide-react';

interface CompareDriversModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  onViewProfile?: (driverId: string) => void;
}

// Sparkline Component
const Sparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  isUp?: boolean;
}> = ({
  data,
  color = '#10b981',
  height = 24,
  width = 68,
  isUp = true
}) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 6) - 3;

  return (
    <div className="flex items-center space-x-1.5 shrink-0">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <circle
          cx={lastX}
          cy={lastY}
          r="2.5"
          fill={color}
          className="animate-pulse"
        />
      </svg>
      <span className={`text-[9px] font-mono font-bold flex items-center ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
        {isUp ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
        7d
      </span>
    </div>
  );
};

export default function CompareDriversModal({
  isOpen,
  onClose,
  drivers,
  onViewProfile
}: CompareDriversModalProps) {
  if (!isOpen) return null;

  const [driverAId, setDriverAId] = useState<string>(drivers[0]?.id || '');
  const [driverBId, setDriverBId] = useState<string>(drivers[1]?.id || drivers[0]?.id || '');

  const driverA = drivers.find(d => d.id === driverAId) || drivers[0];
  const driverB = drivers.find(d => d.id === driverBId) || drivers[1] || drivers[0];

  const handleSwap = () => {
    setDriverAId(driverBId);
    setDriverBId(driverAId);
  };

  // Helper mock trend generators based on driver stats
  const getDriverMetrics = (driver: Driver) => {
    const isRahim = driver.id === 'DRV123456';
    
    // Deterministic 7-day rating trend based on driver.rating
    const rTrend = [
      Number(Math.max(3.8, driver.rating - 0.28).toFixed(2)),
      Number(Math.max(3.9, driver.rating - 0.20).toFixed(2)),
      Number(Math.max(4.0, driver.rating - 0.15).toFixed(2)),
      Number(Math.max(4.1, driver.rating - 0.10).toFixed(2)),
      Number(Math.max(4.15, driver.rating - 0.05).toFixed(2)),
      Number(Math.max(4.2, driver.rating - 0.02).toFixed(2)),
      driver.rating
    ];
    const rDiff = Number((driver.rating - rTrend[0]).toFixed(2));

    const onTimeRate = isRahim ? 98.4 : Math.min(99, 92 + (driver.completedOrders % 7));
    const onTimeTrend = [onTimeRate - 2, onTimeRate - 1.5, onTimeRate - 1, onTimeRate - 0.5, onTimeRate];

    const acceptanceRate = isRahim ? 96.2 : Math.min(98, 88 + (driver.completedOrders % 10));
    const acceptanceTrend = [acceptanceRate - 3, acceptanceRate - 2, acceptanceRate - 1, acceptanceRate];

    const cancelRate = isRahim ? 1.2 : Number((Math.max(0.5, 3.5 - (driver.rating - 4) * 2)).toFixed(1));
    const cancelTrend = [cancelRate + 1.2, cancelRate + 0.8, cancelRate + 0.4, cancelRate];

    const topZone = isRahim 
      ? 'Dhanmondi & Sobhanbag (38%)'
      : (driver.completedOrders > 30 ? 'Gulshan 1 & 2 (32%)' : 'Mohammadpur & Ring Rd (28%)');

    const avgSpeed = isRahim ? '16.2 mins' : `${Math.round(15 + (100 / (driver.rating || 1)))} mins`;

    return {
      rTrend,
      rDiff,
      isRatingUp: rDiff >= 0,
      onTimeRate,
      onTimeTrend,
      acceptanceRate,
      acceptanceTrend,
      cancelRate,
      cancelTrend,
      topZone,
      avgSpeed
    };
  };

  const metricsA = getDriverMetrics(driverA);
  const metricsB = getDriverMetrics(driverB);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-brand-card border border-brand-border rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-brand-dark via-brand-card to-brand-dark border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange shadow-inner">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Side-by-Side Driver Performance Comparison</span>
              </h3>
              <p className="text-xs text-gray-400">Evaluate courier efficiency, customer satisfaction ratings, and 7-day metric trends</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls / Driver Selector Bar */}
        <div className="px-6 py-3.5 bg-brand-dark/90 border-b border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Driver A Select */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">A</span>
            <select
              value={driverAId}
              onChange={(e) => setDriverAId(e.target.value)}
              className="bg-brand-card text-white text-xs font-bold px-3 py-2 rounded-xl border border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-56"
            >
              {drivers.map(d => (
                <option key={`a-${d.id}`} value={d.id}>
                  {d.name} ({d.vehicleType})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            className="p-2 bg-brand-card hover:bg-brand-orange text-gray-300 hover:text-white border border-brand-border hover:border-brand-orange rounded-xl transition-all cursor-pointer shadow shrink-0 flex items-center gap-1.5 text-xs font-bold"
            title="Swap Driver A & Driver B"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="sm:hidden">Swap Selection</span>
          </button>

          {/* Driver B Select */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">B</span>
            <select
              value={driverBId}
              onChange={(e) => setDriverBId(e.target.value)}
              className="bg-brand-card text-white text-xs font-bold px-3 py-2 rounded-xl border border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer w-full sm:w-56"
            >
              {drivers.map(d => (
                <option key={`b-${d.id}`} value={d.id}>
                  {d.name} ({d.vehicleType})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Modal Main Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Driver Cards Comparison Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Driver A Card */}
            <div className="bg-gradient-to-br from-blue-950/30 via-brand-card to-brand-card border border-blue-500/30 p-4 rounded-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`}
                      alt={driverA.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/60 shadow"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-brand-card ${
                      driverA.status === 'Online' ? 'bg-emerald-500' : 'bg-gray-500'
                    }`}></span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <span>{driverA.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold">
                        {driverA.id}
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      <span>{driverA.phone}</span>
                      <span>•</span>
                      <span className="text-gray-300 font-medium">{driverA.vehicleType}</span>
                    </p>
                  </div>
                </div>

                {onViewProfile && (
                  <button
                    onClick={() => { onClose(); onViewProfile(driverA.id); }}
                    className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Full Profile</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Driver A Highlight Ribbon */}
              <div className="flex items-center justify-between text-xs bg-brand-dark/70 p-2.5 rounded-lg border border-brand-border/60">
                <span className="text-gray-400 font-medium">Primary Hub:</span>
                <span className="font-bold text-blue-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  {metricsA.topZone}
                </span>
              </div>
            </div>

            {/* Driver B Card */}
            <div className="bg-gradient-to-br from-purple-950/30 via-brand-card to-brand-card border border-purple-500/30 p-4 rounded-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={`https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80`}
                      alt={driverB.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/60 shadow"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-brand-card ${
                      driverB.status === 'Online' ? 'bg-emerald-500' : 'bg-gray-500'
                    }`}></span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <span>{driverB.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-mono font-bold">
                        {driverB.id}
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      <span>{driverB.phone}</span>
                      <span>•</span>
                      <span className="text-gray-300 font-medium">{driverB.vehicleType}</span>
                    </p>
                  </div>
                </div>

                {onViewProfile && (
                  <button
                    onClick={() => { onClose(); onViewProfile(driverB.id); }}
                    className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Full Profile</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Driver B Highlight Ribbon */}
              <div className="flex items-center justify-between text-xs bg-brand-dark/70 p-2.5 rounded-lg border border-brand-border/60">
                <span className="text-gray-400 font-medium">Primary Hub:</span>
                <span className="font-bold text-purple-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-purple-400" />
                  {metricsB.topZone}
                </span>
              </div>
            </div>

          </div>

          {/* Head-to-Head Comparative Metric Matrix Table */}
          <div className="bg-brand-dark/60 border border-brand-border rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-black uppercase text-gray-300 tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Head-to-Head Performance & Sparkline Matrix</span>
            </h4>

            <div className="space-y-3">
              
              {/* Metric 1: Rating Score + 7-Day Sparkline */}
              <div className="bg-brand-card/90 border border-brand-border p-3.5 rounded-xl grid grid-cols-1 md:grid-cols-7 items-center gap-3">
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Customer Rating Score
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">7-Day satisfaction rating movement</span>
                </div>

                {/* Driver A Score */}
                <div className={`md:col-span-2 p-2.5 rounded-lg border flex items-center justify-between ${
                  driverA.rating >= driverB.rating 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                    : 'bg-brand-dark/50 border-brand-border text-gray-300'
                }`}>
                  <div>
                    <span className="text-xs text-gray-400 font-mono block text-[9px] uppercase">Driver A</span>
                    <span className="text-lg font-black">{driverA.rating.toFixed(1)} ★</span>
                    {driverA.rating > driverB.rating && (
                      <span className="ml-1.5 text-[9px] font-black uppercase text-emerald-400">Higher</span>
                    )}
                  </div>
                  <Sparkline data={metricsA.rTrend} isUp={metricsA.isRatingUp} color="#f59e0b" />
                </div>

                <div className="hidden md:flex justify-center text-xs text-gray-500 font-bold">vs</div>

                {/* Driver B Score */}
                <div className={`md:col-span-2 p-2.5 rounded-lg border flex items-center justify-between ${
                  driverB.rating >= driverA.rating 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                    : 'bg-brand-dark/50 border-brand-border text-gray-300'
                }`}>
                  <div>
                    <span className="text-xs text-gray-400 font-mono block text-[9px] uppercase">Driver B</span>
                    <span className="text-lg font-black">{driverB.rating.toFixed(1)} ★</span>
                    {driverB.rating > driverA.rating && (
                      <span className="ml-1.5 text-[9px] font-black uppercase text-emerald-400">Higher</span>
                    )}
                  </div>
                  <Sparkline data={metricsB.rTrend} isUp={metricsB.isRatingUp} color="#f59e0b" />
                </div>
              </div>

              {/* Metric 2: Completed Orders Volume */}
              <div className="bg-brand-card/90 border border-brand-border p-3.5 rounded-xl grid grid-cols-1 md:grid-cols-7 items-center gap-3">
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-brand-orange" />
                    Completed Orders
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Total lifetime fulfilled deliveries</span>
                </div>

                {/* Driver A Orders */}
                <div className={`md:col-span-2 p-2.5 rounded-lg border flex items-center justify-between ${
                  driverA.completedOrders >= driverB.completedOrders 
                    ? 'bg-brand-orange/10 border-brand-orange/30 text-brand-orange' 
                    : 'bg-brand-dark/50 border-brand-border text-gray-300'
                }`}>
                  <div>
                    <span className="text-[9px] text-gray-400 font-mono block uppercase">Driver A</span>
                    <span className="text-lg font-black">{driverA.completedOrders} Orders</span>
                  </div>
                  {driverA.completedOrders >= driverB.completedOrders && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange">
                      +{driverA.completedOrders - driverB.completedOrders} more
                    </span>
                  )}
                </div>

                <div className="hidden md:flex justify-center text-xs text-gray-500 font-bold">vs</div>

                {/* Driver B Orders */}
                <div className={`md:col-span-2 p-2.5 rounded-lg border flex items-center justify-between ${
                  driverB.completedOrders >= driverA.completedOrders 
                    ? 'bg-brand-orange/10 border-brand-orange/30 text-brand-orange' 
                    : 'bg-brand-dark/50 border-brand-border text-gray-300'
                }`}>
                  <div>
                    <span className="text-[9px] text-gray-400 font-mono block uppercase">Driver B</span>
                    <span className="text-lg font-black">{driverB.completedOrders} Orders</span>
                  </div>
                  {driverB.completedOrders >= driverA.completedOrders && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange">
                      +{driverB.completedOrders - driverA.completedOrders} more
                    </span>
                  )}
                </div>
              </div>

              {/* Metric 3: Total Earnings */}
              <div className="bg-brand-card/90 border border-brand-border p-3.5 rounded-xl grid grid-cols-1 md:grid-cols-7 items-center gap-3">
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Total Revenue Generated
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Gross delivery payout (BDT)</span>
                </div>

                {/* Driver A Earnings */}
                <div className={`md:col-span-2 p-2.5 rounded-lg border flex items-center justify-between ${
                  driverA.earnings >= driverB.earnings 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-brand-dark/50 border-brand-border text-gray-300'
                }`}>
                  <div>
                    <span className="text-[9px] text-gray-400 font-mono block uppercase">Driver A</span>
                    <span className="text-lg font-black">৳{driverA.earnings.toLocaleString()}</span>
                  </div>
                  {driverA.earnings >= driverB.earnings && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Top Earner
                    </span>
                  )}
                </div>

                <div className="hidden md:flex justify-center text-xs text-gray-500 font-bold">vs</div>

                {/* Driver B Earnings */}
                <div className={`md:col-span-2 p-2.5 rounded-lg border flex items-center justify-between ${
                  driverB.earnings >= driverA.earnings 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-brand-dark/50 border-brand-border text-gray-300'
                }`}>
                  <div>
                    <span className="text-[9px] text-gray-400 font-mono block uppercase">Driver B</span>
                    <span className="text-lg font-black">৳{driverB.earnings.toLocaleString()}</span>
                  </div>
                  {driverB.earnings >= driverA.earnings && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Top Earner
                    </span>
                  )}
                </div>
              </div>

              {/* Metric 4: On-Time Delivery Rate & Sparkline */}
              <div className="bg-brand-card/90 border border-brand-border p-3.5 rounded-xl grid grid-cols-1 md:grid-cols-7 items-center gap-3">
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    On-Time Delivery Rate
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Punctuality percentage</span>
                </div>

                {/* Driver A On-Time */}
                <div className="md:col-span-2 p-2.5 bg-brand-dark/50 border border-brand-border rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-gray-400 font-mono block uppercase">Driver A</span>
                    <span className="text-base font-black text-white">{metricsA.onTimeRate}%</span>
                    <span className="text-[9px] text-gray-400 block">Avg {metricsA.avgSpeed}</span>
                  </div>
                  <Sparkline data={metricsA.onTimeTrend} color="#10b981" />
                </div>

                <div className="hidden md:flex justify-center text-xs text-gray-500 font-bold">vs</div>

                {/* Driver B On-Time */}
                <div className="md:col-span-2 p-2.5 bg-brand-dark/50 border border-brand-border rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-gray-400 font-mono block uppercase">Driver B</span>
                    <span className="text-base font-black text-white">{metricsB.onTimeRate}%</span>
                    <span className="text-[9px] text-gray-400 block">Avg {metricsB.avgSpeed}</span>
                  </div>
                  <Sparkline data={metricsB.onTimeTrend} color="#10b981" />
                </div>
              </div>

              {/* Metric 5: Acceptance Rate & Sparkline */}
              <div className="bg-brand-card/90 border border-brand-border p-3.5 rounded-xl grid grid-cols-1 md:grid-cols-7 items-center gap-3">
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-blue-400" />
                    Dispatch Acceptance
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Order request acceptance rate</span>
                </div>

                {/* Driver A Acceptance */}
                <div className="md:col-span-2 p-2.5 bg-brand-dark/50 border border-brand-border rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-gray-400 font-mono block uppercase">Driver A</span>
                    <span className="text-base font-black text-white">{metricsA.acceptanceRate}%</span>
                  </div>
                  <Sparkline data={metricsA.acceptanceTrend} color="#3b82f6" />
                </div>

                <div className="hidden md:flex justify-center text-xs text-gray-500 font-bold">vs</div>

                {/* Driver B Acceptance */}
                <div className="md:col-span-2 p-2.5 bg-brand-dark/50 border border-brand-border rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-gray-400 font-mono block uppercase">Driver B</span>
                    <span className="text-base font-black text-white">{metricsB.acceptanceRate}%</span>
                  </div>
                  <Sparkline data={metricsB.acceptanceTrend} color="#3b82f6" />
                </div>
              </div>

            </div>
          </div>

          {/* AI Comparison Synthesis Card */}
          <div className="bg-gradient-to-r from-brand-orange/10 via-brand-card to-emerald-950/20 border border-brand-orange/30 p-4 rounded-xl space-y-2">
            <h5 className="text-xs font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Comparative Dispatch Insights</span>
            </h5>
            <p className="text-xs text-gray-300 leading-relaxed">
              {driverA.completedOrders >= driverB.completedOrders ? (
                <>
                  <strong className="text-blue-400">{driverA.name}</strong> leads in overall fulfillment volume with <strong className="text-white">{driverA.completedOrders} orders</strong> compared to <strong className="text-purple-400">{driverB.name}</strong>'s {driverB.completedOrders} orders.
                </>
              ) : (
                <>
                  <strong className="text-purple-400">{driverB.name}</strong> leads in overall fulfillment volume with <strong className="text-white">{driverB.completedOrders} orders</strong> compared to <strong className="text-blue-400">{driverA.name}</strong>'s {driverA.completedOrders} orders.
                </>
              )}
              {driverA.rating >= driverB.rating ? (
                <> Both riders maintain active status, with <strong className="text-amber-400">{driverA.name} holding a higher customer rating of {driverA.rating.toFixed(1)} ★</strong>.</>
              ) : (
                <> Both riders maintain active status, with <strong className="text-amber-400">{driverB.name} holding a higher customer rating of {driverB.rating.toFixed(1)} ★</strong>.</>
              )}
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-brand-dark border-t border-brand-border flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-card hover:bg-white/10 text-gray-300 hover:text-white border border-brand-border rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
}

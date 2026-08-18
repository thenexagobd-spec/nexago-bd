/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Vehicle, PromotionBanner } from '../types';
import { Truck, Bookmark, FileBarChart, Plus, Trash2, CheckCircle, Flame, FileSpreadsheet, Eye, X } from 'lucide-react';

interface FleetPromosViewProps {
  vehicles: Vehicle[];
  banners: PromotionBanner[];
  onAddVehicle: (v: Omit<Vehicle, 'id'>) => void;
  onAddBanner: (b: Omit<PromotionBanner, 'id' | 'clicks'>) => void;
  onDeleteVehicle: (id: string) => void;
  onDeleteBanner: (id: string) => void;
}

export default function FleetPromosView({
  vehicles,
  banners,
  onAddVehicle,
  onAddBanner,
  onDeleteVehicle,
  onDeleteBanner
}: FleetPromosViewProps) {
  const [subTab, setSubTab] = useState<'vehicles' | 'promotions' | 'reports'>('vehicles');
  
  // Modals status
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  // Form states - Vehicle
  const [vType, setVType] = useState<'Bike' | 'Bicycle' | 'Car' | 'Van'>('Bike');
  const [vPlate, setVPlate] = useState('');
  const [vDriver, setVDriver] = useState('');
  const [vStatus, setVStatus] = useState<'Active' | 'Maintenance' | 'Inactive'>('Active');

  // Form states - Banner
  const [bTitle, setBTitle] = useState('');
  const [bSubtitle, setBSubtitle] = useState('');
  const [bStatus, setBStatus] = useState<'Active' | 'Scheduled' | 'Expired'>('Active');
  const [bStart, setBStart] = useState('2024-05-01');
  const [bEnd, setBEnd] = useState('2024-05-31');

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVehicle({
      type: vType,
      plateNumber: vPlate || 'N/A',
      driverName: vDriver,
      status: vStatus
    });
    setVPlate('');
    setVDriver('');
    setVStatus('Active');
    setIsVehicleModalOpen(false);
  };

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBanner({
      title: bTitle,
      subtitle: bSubtitle,
      status: bStatus,
      startDate: bStart,
      endDate: bEnd
    });
    setBTitle('');
    setBSubtitle('');
    setBStatus('Active');
    setIsBannerModalOpen(false);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Sub tabs navigation rail */}
      <div className="flex border-b border-brand-border pb-px overflow-x-auto space-x-6">
        <button
          onClick={() => setSubTab('vehicles')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 cursor-pointer transition-all ${
            subTab === 'vehicles' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Fleet Vehicles</span>
        </button>

        <button
          onClick={() => setSubTab('promotions')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 cursor-pointer transition-all ${
            subTab === 'promotions' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Promotions & Banners</span>
        </button>

        <button
          onClick={() => setSubTab('reports')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 cursor-pointer transition-all ${
            subTab === 'reports' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FileBarChart className="w-4 h-4" />
          <span>Reports & Analytics</span>
        </button>
      </div>

      {/* Fleet Vehicles Panel */}
      {subTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fleet & Vehicles Management</h3>
              <p className="text-xs text-gray-400">Track registration, courier plates, and mechanical service statuses</p>
            </div>

            <button
              onClick={() => setIsVehicleModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Register Vehicle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => (
              <div key={v.id} className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-col justify-between group shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{v.type} ({v.id})</h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{v.plateNumber}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                    v.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                    v.status === 'Maintenance' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {v.status}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-brand-border/40 pt-3 mt-1">
                  <span className="text-[11px] text-gray-300">Driver: <strong className="text-white font-semibold">{v.driverName}</strong></span>

                  <button
                    onClick={() => onDeleteVehicle(v.id)}
                    className="p-1.5 hover:bg-red-500/15 text-gray-500 hover:text-red-400 border border-transparent hover:border-red-500/10 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Remove Vehicle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promotions & Campaigns Panel */}
      {subTab === 'promotions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Promotional Campaigns</h3>
              <p className="text-xs text-gray-400">Deploy banner ads, discount vouchers, and coupon campaigns on the customer client app</p>
            </div>

            <button
              onClick={() => setIsBannerModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign Banner</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="bg-brand-card border border-brand-border rounded-xl p-5 hover:border-brand-orange/20 transition-all flex flex-col justify-between shadow-sm relative group">
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    b.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                    b.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-orange inline-block animate-pulse"></span>
                    <h4 className="text-xs font-bold text-white font-mono">{b.id}</h4>
                  </div>
                  <h3 className="font-bold text-sm text-white pr-16">{b.title}</h3>
                  <p className="text-xs text-gray-300 pr-12 leading-relaxed">{b.subtitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-brand-border/40 pt-4 mt-5">
                  <div className="text-[10px] text-gray-400 space-y-0.5">
                    <p>Start: <strong className="text-gray-300">{b.startDate}</strong></p>
                    <p>Expiry: <strong className="text-gray-300">{b.endDate}</strong></p>
                  </div>
                  <div className="text-right flex flex-col justify-end items-end">
                    <div className="flex items-center space-x-1 font-bold text-brand-orange text-xs">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{b.clicks.toLocaleString()} Clicks</span>
                    </div>
                    <button
                      onClick={() => onDeleteBanner(b.id)}
                      className="mt-1 p-1 hover:bg-red-500/15 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports & Exports Panel */}
      {subTab === 'reports' && (
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-6 shadow-sm">
          <div>
            <h3 className="font-semibold text-white text-sm">Logistics Reports Export</h3>
            <p className="text-xs text-gray-400">Generate and download official CSV spreadsheets for payouts, billing audits, and rider shifts</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-brand-border bg-brand-dark/30 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">Rider Weekly Commission Split</h4>
                <p className="text-[10px] text-gray-400">Weekly breakdown of cash deliveries vs digital payouts</p>
              </div>
              <button 
                onClick={() => alert('Spreadsheet exported: smart_delivery_driver_commissions_may_2024.xlsx')}
                className="p-2 bg-brand-dark hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 text-gray-300 hover:text-brand-orange rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer text-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-semibold text-[11px]">CSV</span>
              </button>
            </div>

            <div className="border border-brand-border bg-brand-dark/30 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">Merchant Billing Ledger</h4>
                <p className="text-[10px] text-gray-400">Total payouts due to Brew & Bites, KFC, and Super Store</p>
              </div>
              <button 
                onClick={() => alert('Spreadsheet exported: smart_delivery_merchant_ledgers_may_2024.xlsx')}
                className="p-2 bg-brand-dark hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 text-gray-300 hover:text-brand-orange rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer text-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-semibold text-[11px]">CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Vehicle Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-sm w-full overflow-hidden shadow-2xl fade-in">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-semibold text-white text-sm">Register Fleet Vehicle</h3>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Vehicle Class</label>
                <select
                  value={vType}
                  onChange={(e) => setVType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                >
                  <option value="Bike">Motorcycle (Bike)</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Car">Car</option>
                  <option value="Van">Van (Heavy cargo)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Registration Plate Number</label>
                <input
                  type="text"
                  value={vPlate}
                  onChange={(e) => setVPlate(e.target.value)}
                  placeholder="e.g. Dhaka Metro-H-12-3456"
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Assigned Dispatch Driver Name</label>
                <input
                  type="text"
                  required
                  value={vDriver}
                  onChange={(e) => setVDriver(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Initial Status</label>
                <select
                  value={vStatus}
                  onChange={(e) => setVStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                >
                  <option value="Active">Active / Ready</option>
                  <option value="Maintenance">Mechanical Maintenance</option>
                  <option value="Inactive">Deactivated</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Banner Modal */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-sm w-full overflow-hidden shadow-2xl fade-in">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-semibold text-white text-sm">Create Banner Promotion Campaign</h3>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBanner} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Campaign Headline Title</label>
                <input
                  type="text"
                  required
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  placeholder="e.g. Eid 20% Discount with bKash"
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Detailed Description (Subtitle)</label>
                <input
                  type="text"
                  required
                  value={bSubtitle}
                  onChange={(e) => setBSubtitle(e.target.value)}
                  placeholder="e.g. Minimum order ৳400 at Pizza Express"
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Launch Date</label>
                  <input
                    type="date"
                    required
                    value={bStart}
                    onChange={(e) => setBStart(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={bEnd}
                    onChange={(e) => setBEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Campaign Status</label>
                <select
                  value={bStatus}
                  onChange={(e) => setBStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                >
                  <option value="Active">Active (Publish live immediately)</option>
                  <option value="Scheduled">Scheduled (Wait for dates)</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Deploy Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

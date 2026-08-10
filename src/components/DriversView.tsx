/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Driver, DriverStatusLog, DriverDocument } from '../types';
import { 
  Search, UserPlus, Phone, Star, Award, MapPin, Edit3, Trash2, X, AlertCircle, 
  Eye, UserCheck, Download, GitCompare, Lock, Unlock, ShieldCheck, DollarSign, 
  MessageSquare, Send, CheckCircle2, XCircle, Zap, Truck, Gauge, Fuel, Wrench
} from 'lucide-react';
import DriverProfileView from './DriverProfileView';
import CompareDriversModal from './CompareDriversModal';

interface VehicleInfo { id:string; regNo:string; type:string; brand:string; model:string; year:number; driverName:string; fuelType:string; status:string; fuelCost:number; maintenanceCost:number; odoKm:number; downtime:number; }

interface DriversViewProps {
  drivers: Driver[];
  onAddDriver: (driver: Omit<Driver, 'id' | 'completedOrders' | 'earnings'>) => void;
  onUpdateDriver: (driver: Driver) => void;
  onDeleteDriver: (id: string) => void;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  vehicles?: VehicleInfo[];
}

export default function DriversView({ drivers, onAddDriver, onUpdateDriver, onDeleteDriver, showToast, vehicles = [] }: DriversViewProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Online' | 'On-Delivery' | 'Offline' | 'Audit Pending' | 'Dispatch Locked'>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // New Admin Control Modals State
  const [auditingDriver, setAuditingDriver] = useState<Driver | null>(null);
  const [messagingDriver, setMessagingDriver] = useState<Driver | null>(null);
  const [broadcastText, setBroadcastText] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('Motorcycle');
  const [rating, setRating] = useState(5.0);
  const [status, setStatus] = useState<'Online' | 'Offline'>('Online');
  const [nidNumber, setNidNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'Verified' | 'Pending Audit'>('Pending Audit');
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleDocumentUpload = (type: DriverDocument['type'], file: File | null | undefined) => {
    if (!file) return;
    setDocuments(prev => [
      { type, fileName: file.name, submittedAt: new Date().toLocaleString('en-GB'), status: 'Pending' },
      ...prev.filter(d => d.type !== type)
    ]);
    if (showToast) showToast(`${type} submitted for ${name || 'driver'}`, 'success');
  };

  // If a driver profile is selected, render DriverProfileView
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  if (selectedDriverId && selectedDriver) {
    return (
      <DriverProfileView
        driver={selectedDriver}
        allDrivers={drivers}
        onBack={() => setSelectedDriverId(null)}
        onUpdateDriver={onUpdateDriver}
        onSelectDriver={(id) => setSelectedDriverId(id)}
        showToast={showToast}
      />
    );
  }

  // KPI Metrics
  const totalOnline = drivers.filter(d => d.status === 'Online').length;
  const totalCodCollected = drivers.reduce((acc, d) => acc + (d.codCashCollected || 0), 0);
  const totalPendingAudit = drivers.filter(d => d.verificationStatus === 'Pending Audit').length;
  const totalLocked = drivers.filter(d => d.dispatchLocked).length;

  const filteredDrivers = drivers.filter(driver => {
    const q = search.toLowerCase().trim();
    const matchesSearch = q === '' ||
      driver.name.toLowerCase().includes(q) ||
      driver.phone.includes(q) ||
      (driver.email || '').toLowerCase().includes(q) ||
      driver.id.toLowerCase().includes(q);
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Online' || statusFilter === 'On-Delivery' || statusFilter === 'Offline') return matchesSearch && driver.status === statusFilter;
    if (statusFilter === 'Audit Pending') return matchesSearch && driver.verificationStatus === 'Pending Audit';
    if (statusFilter === 'Dispatch Locked') return matchesSearch && driver.dispatchLocked === true;
    return matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formDocuments = documents.length > 0
      ? documents
      : ([
          { type: 'NID Card' as const, fileName: 'nid_card.pdf', submittedAt: new Date().toLocaleString('en-GB'), status: 'Pending' as const },
          { type: 'Driving License' as const, fileName: 'driving_license.pdf', submittedAt: new Date().toLocaleString('en-GB'), status: 'Pending' as const }
        ]);
    if (editingDriver) {
      onUpdateDriver({
        ...editingDriver,
        name,
        phone,
        vehicleType,
        rating: Number(rating),
        status,
        nidNumber: nidNumber || editingDriver.nidNumber,
        licenseNumber: licenseNumber || editingDriver.licenseNumber,
        verificationStatus,
        documents: formDocuments
      });
      setEditingDriver(null);
    } else {
      onAddDriver({
        name,
        phone,
        vehicleType,
        rating: Number(rating),
        status,
        dispatchLocked: false,
        commissionRate: 15,
        verificationStatus,
        codCashCollected: 0.00,
        nidNumber: nidNumber || ('19922610' + Math.floor(100000 + Math.random() * 900000)),
        licenseNumber: licenseNumber || ('DK-DL-2024-' + Math.floor(10000 + Math.random() * 90000)),
        documents: formDocuments
      });
      setIsAddOpen(false);
    }
    resetForm();
  };

  const startEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.name);
    setPhone(driver.phone);
    setVehicleType(driver.vehicleType);
    setRating(driver.rating);
    setStatus(driver.status);
    setNidNumber(driver.nidNumber || '');
    setLicenseNumber(driver.licenseNumber || '');
    setVerificationStatus(driver.verificationStatus === 'Verified' ? 'Verified' : 'Pending Audit');
    setDocuments(driver.documents || []);
    setIsAddOpen(true);
  };

  const toggleStatus = (driver: Driver) => {
    const statuses: ('Online' | 'On-Delivery' | 'Offline')[] = ['Online', 'On-Delivery', 'Offline'];
    const currentIdx = statuses.indexOf(driver.status as any);
    const nextStatus = statuses[currentIdx === -1 ? 0 : (currentIdx + 1) % statuses.length];
    
    const now = new Date();
    const formattedTime = `Today, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    
    const newLog: DriverStatusLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      status: nextStatus,
      timestamp: now.toISOString(),
      formattedTime,
      reason: `Duty status updated via Fleet Admin Control`,
      updatedBy: 'Admin Dispatch Control',
      location: 'HQ Dispatch Command'
    };

    onUpdateDriver({
      ...driver,
      status: nextStatus,
      statusHistory: [newLog, ...(driver.statusHistory || [])]
    });
    if (showToast) {
      showToast(`Driver ${driver.name} status switched to ${nextStatus}`, 'info');
    }
  };

  const toggleDispatchLock = (driver: Driver) => {
    const nextState = !driver.dispatchLocked;
    onUpdateDriver({
      ...driver,
      dispatchLocked: nextState
    });
    if (showToast) {
      showToast(
        nextState 
          ? `Dispatch locked for ${driver.name}. Rider cannot accept orders.` 
          : `Dispatch unlocked for ${driver.name}.`,
        nextState ? 'error' : 'success'
      );
    }
  };

  const handleCollectCodCash = (driver: Driver) => {
    const amount = driver.codCashCollected || 0;
    if (amount <= 0) {
      if (showToast) showToast('No pending COD cash balance to collect.', 'info');
      return;
    }
    onUpdateDriver({
      ...driver,
      codCashCollected: 0
    });
    if (showToast) {
      showToast(`Collected ৳${amount.toLocaleString()} COD cash handover from ${driver.name}.`, 'success');
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setVehicleType('Motorcycle');
    setRating(5.0);
    setStatus('Online');
    setNidNumber('');
    setLicenseNumber('');
    setVerificationStatus('Pending Audit');
    setDocuments([]);
    setEditingDriver(null);
  };

  const handleExportCSV = () => {
    const headers = ['Driver ID', 'Driver Name', 'Phone Number', 'Vehicle Type', 'Duty Status', 'Verification', 'Dispatch Lock', 'Rating', 'Completed Orders', 'Total Earnings (BDT)', 'COD Cash Held'];
    const rows = filteredDrivers.map(d => [
      `"${d.id}"`,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.phone}"`,
      `"${d.vehicleType}"`,
      `"${d.status}"`,
      `"${d.verificationStatus || 'Verified'}"`,
      `"${d.dispatchLocked ? 'Locked' : 'Unlocked'}"`,
      d.rating,
      d.completedOrders,
      d.earnings,
      d.codCashCollected || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `driver_performance_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) {
      showToast(`Exported report for ${filteredDrivers.length} drivers (CSV)`, 'success');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">Driver App & Fleet Admin Control</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
              Live Fleet Control
            </span>
          </div>
          <p className="text-xs text-gray-400">Manage rider dispatches, COD cash settlements, document verification & remote locks</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsCompareOpen(true)}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-brand-dark hover:bg-white/10 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-sm"
            title="Compare two drivers side-by-side"
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare Drivers</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-brand-dark hover:bg-white/10 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-sm"
            title="Export filtered driver performance data to CSV spreadsheet"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => { resetForm(); setIsAddOpen(true); }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Driver</span>
          </button>
        </div>
      </div>

      {/* Admin Fleet Operational Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Active Fleet</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">{totalOnline} <span className="text-xs font-normal text-gray-400">/ {drivers.length} Online</span></p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">COD Cash Held by Riders</p>
            <p className="text-lg font-black text-brand-orange mt-0.5">৳{totalCodCollected.toLocaleString()}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Pending License Audits</p>
            <p className="text-lg font-black text-amber-400 mt-0.5">{totalPendingAudit} Riders</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Dispatch Freeze / Locked</p>
            <p className="text-lg font-black text-red-400 mt-0.5">{totalLocked} Suspended</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by driver ID, phone, gmail or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-brand-dark/80 text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Online', 'On-Delivery', 'Offline', 'Audit Pending', 'Dispatch Locked'] as const).map((statusOpt) => (
            <button
              key={statusOpt}
              onClick={() => setStatusFilter(statusOpt)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all shrink-0 ${
                statusFilter === statusOpt
                  ? 'bg-brand-orange/10 border-brand-orange text-brand-orange font-bold'
                  : 'bg-brand-dark/50 border-brand-border text-gray-400 hover:text-gray-200'
              }`}
            >
              {statusOpt}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDrivers.map((driver) => (
          <div 
            key={driver.id} 
            className={`bg-brand-card border rounded-xl p-5 transition-all flex flex-col justify-between shadow-sm relative group ${
              driver.dispatchLocked ? 'border-red-500/40 bg-red-500/5' : 'border-brand-border hover:border-brand-orange/40'
            }`}
          >
            {/* Status indicator badges */}
            <div className="absolute top-4 right-4 flex items-center space-x-1.5">
              {driver.dispatchLocked && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Locked
                </span>
              )}

              <button
                onClick={() => toggleStatus(driver)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer border tracking-wider transition-colors ${
                  driver.status === 'Online'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                    : driver.status === 'On-Delivery'
                    ? 'bg-purple-500/10 border-purple-500/25 text-purple-300 hover:bg-purple-500/20'
                    : 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'
                }`}
                title="Click to cycle status (Online -> On-Delivery -> Offline)"
              >
                {driver.status}
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3.5 cursor-pointer group/card" onClick={() => setSelectedDriverId(driver.id)}>
                <div className="w-12 h-12 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center font-black text-brand-orange text-xs shrink-0 relative group-hover/card:scale-105 transition-transform">
                  {driver.name.split(' ').map(n => n[0]).join('')}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-brand-card ${
                    driver.status === 'Online' ? 'bg-emerald-500' : driver.status === 'On-Delivery' ? 'bg-purple-500' : 'bg-red-500'
                  }`}></span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white pr-28 group-hover/card:text-brand-orange transition-colors flex items-center gap-1.5">
                    <span>{driver.name}</span>
                  </h4>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{driver.id}</p>
                  <p className="text-[11px] text-gray-300 mt-1">{driver.vehicleType}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 bg-brand-dark/40 p-2.5 border border-brand-border/40 rounded-lg text-center">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Orders</p>
                  <p className="text-xs font-bold text-white mt-0.5">{driver.completedOrders}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Earnings</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">৳{driver.earnings.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Rating</p>
                  <div className="flex items-center justify-center space-x-0.5 mt-0.5 text-xs font-bold text-yellow-400">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{driver.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Assigned Vehicle */}
              {(()=>{const veh=vehicles.find(v=>v.driverName===driver.name)||vehicles[0];return(<div className="bg-gradient-to-r from-brand-dark/30 to-brand-dark/10 border border-brand-border/40 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between"><span className="text-[9px] text-gray-400 uppercase font-black flex items-center gap-1"><Truck className="w-3 h-3"/>Assigned Vehicle</span><span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${veh?.status==='Active'?'bg-emerald-500/10 text-emerald-400':veh?.status==='Maintenance'?'bg-amber-500/10 text-amber-400':'bg-gray-500/10 text-gray-400'}`}>{veh?.status||'Active'}</span></div>
                <p className="text-[11px] font-mono font-black text-white">{veh?.regNo||'DHAKA METRO-XX-00-0000'}</p>
                <p className="text-[10px] text-gray-400">{veh?.brand||'Yamaha'} {veh?.model||'FZ-S'} · {veh?.year||2024} · {veh?.fuelType||'Octane'}</p>
                <div className="flex items-center justify-between text-[10px]"><span className="text-gray-400"><Gauge className="w-2.5 h-2.5 inline"/> {(veh?.odoKm||28500).toLocaleString()} km</span><span className="text-gray-400"><Fuel className="w-2.5 h-2.5 inline"/> ৳{(veh?.fuelCost||12400).toLocaleString()}</span></div>
              </div>)})()}

              {/* COD Cash & Verification Ribbon */}
              <div className="space-y-2 text-xs bg-brand-dark/20 p-2.5 rounded-lg border border-brand-border/30">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 font-medium">COD Cash Collected:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-brand-orange">
                      ৳{(driver.codCashCollected || 0).toLocaleString()}
                    </span>
                    {(driver.codCashCollected || 0) > 0 && (
                      <button
                        onClick={() => handleCollectCodCash(driver)}
                        className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded text-[9.5px] font-bold transition-all cursor-pointer border border-emerald-500/30"
                        title="Deposit COD cash into company vault"
                      >
                        Collect
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] border-t border-brand-border/20 pt-2">
                  <span className="text-gray-400 font-medium">Document Audit:</span>
                  <button
                    onClick={() => setAuditingDriver(driver)}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      driver.verificationStatus === 'Pending Audit' 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                        : driver.verificationStatus === 'Rejected'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{driver.verificationStatus || 'Verified'}</span>
                  </button>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-1.5 text-xs text-gray-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{driver.phone}</span>
                  </div>

                  <button
                    onClick={() => setMessagingDriver(driver)}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"
                    title="Send direct Push Alert to Driver Mobile App"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Push Alert</span>
                  </button>
                </div>
                {driver.email && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-gray-500 font-mono text-[10px]">✉</span>
                      <span className="font-mono text-[11px] truncate text-gray-300">{driver.email}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions footer */}
            <div className="mt-5 pt-3 border-t border-brand-border/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedDriverId(driver.id)}
                  className="px-2.5 py-1 bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white border border-brand-orange/30 rounded text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  title="Open Detailed Performance Profile"
                >
                  <Eye className="w-3 h-3" />
                  <span>View Profile</span>
                </button>

                {/* Dispatch Lock Toggle */}
                <button
                  onClick={() => toggleDispatchLock(driver)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer border ${
                    driver.dispatchLocked 
                      ? 'bg-red-500 text-white border-red-600' 
                      : 'bg-gray-800 text-gray-300 hover:text-white border-brand-border'
                  }`}
                  title={driver.dispatchLocked ? "Unlock Rider Dispatch" : "Lock / Suspend Dispatch"}
                >
                  {driver.dispatchLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{driver.dispatchLocked ? 'Unlock' : 'Lock Dispatch'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(driver)}
                  className="p-1.5 bg-brand-dark/60 hover:bg-brand-orange/20 text-gray-300 hover:text-brand-orange border border-brand-border rounded cursor-pointer transition-colors"
                  title="Edit Driver"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteDriver(driver.id)}
                  className="p-1.5 bg-brand-dark/60 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-brand-border rounded cursor-pointer transition-colors"
                  title="Delete Driver"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredDrivers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-brand-card border border-brand-border rounded-xl">
            <p className="text-xs text-gray-400">No dispatch drivers found matching the filter.</p>
          </div>
        )}
      </div>

      {/* DOCUMENT AUDIT MODAL */}
      {auditingDriver && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-lg w-full overflow-hidden shadow-2xl fade-in p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Driver Verification & Legal Audit</span>
                </h3>
                <p className="text-[11px] text-gray-400">Review NID and Driving License credentials for {auditingDriver.name}</p>
              </div>
              <button onClick={() => setAuditingDriver(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-brand-dark/60 p-3 rounded-lg border border-brand-border/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">National ID (NID) Number:</span>
                  <span className="font-mono font-bold text-white">{auditingDriver.nidNumber || '1992261048291039'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">BRTA Driving License:</span>
                  <span className="font-mono font-bold text-white">{auditingDriver.licenseNumber || 'DK-DL-2021-98432'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Vehicle Specification:</span>
                  <span className="font-bold text-brand-orange">{auditingDriver.vehicleType}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Audit Controls & Verification Status</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onUpdateDriver({ ...auditingDriver, verificationStatus: 'Verified' });
                      setAuditingDriver(null);
                      if (showToast) showToast(`Driver ${auditingDriver.name} marked as Verified!`, 'success');
                    }}
                    className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Verify</span>
                  </button>

                  <button
                    onClick={() => {
                      onUpdateDriver({ ...auditingDriver, verificationStatus: 'Rejected' });
                      setAuditingDriver(null);
                      if (showToast) showToast(`Driver ${auditingDriver.name} verification rejected.`, 'error');
                    }}
                    className="py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-lg font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Credentials</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUSH ALERT MODAL FOR DRIVER APP */}
      {messagingDriver && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl fade-in p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-brand-orange" />
                <span>Send Push Alert to Driver Mobile App</span>
              </h3>
              <button onClick={() => setMessagingDriver(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-300">Recipient: <b className="text-white">{messagingDriver.name}</b> ({messagingDriver.phone})</p>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Alert Message</label>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="e.g. Please proceed to Gulshan Hub for high-priority dispatch assignment."
                  className="w-full bg-brand-dark/80 border border-brand-border text-xs text-white p-2.5 rounded-lg outline-none focus:border-brand-orange resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setMessagingDriver(null)}
                  className="px-4 py-2 bg-brand-dark hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!broadcastText.trim()) return;
                    if (showToast) showToast(`Broadcast sent to driver app: "${broadcastText}"`, 'success');
                    setBroadcastText('');
                    setMessagingDriver(null);
                  }}
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Alert</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Driver Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl fade-in">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-semibold text-white text-sm">
                {editingDriver ? 'Edit Driver Details' : 'Add New Dispatch Rider'}
              </h3>
              <button
                onClick={() => { resetForm(); setIsAddOpen(false); }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Driver's Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Masrafe Bin Mortaza"
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Vehicle Type & Spec</label>
                  <input
                    type="text"
                    required
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    placeholder="e.g. Motorcycle (Yamaha)"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Initial Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    required
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              {/* Document Number Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">NID Number</label>
                  <input
                    type="text"
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder="19922610XXXXXXXX"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Driving License No.</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="DK-DL-2024-XXXXX"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Document Upload / Submit Options */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-gray-300 uppercase">Document Submission</label>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                    verificationStatus === 'Verified'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {verificationStatus === 'Verified' ? 'Verified' : 'Pending Audit'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">Upload all required documents below to complete the rider registration.</p>

                <div className="grid grid-cols-2 gap-2">
                  {(['NID Card', 'Driving License', 'Vehicle Registration', 'Profile Photo'] as DriverDocument['type'][]).map((docType) => {
                    const uploaded = documents.find(d => d.type === docType);
                    return (
                      <div key={docType} className="border border-brand-border/60 bg-brand-dark/40 rounded-lg p-2.5 space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-300 uppercase flex items-center justify-between">
                          <span>{docType}</span>
                          {uploaded && (
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                              uploaded.status === 'Verified'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}>
                              {uploaded.status}
                            </span>
                          )}
                        </p>
                        {uploaded ? (
                          <div className="flex items-center justify-between space-x-1">
                            <span className="text-[10px] text-gray-300 truncate font-mono">{uploaded.fileName}</span>
                            <button
                              type="button"
                              onClick={() => setDocuments(prev => prev.filter(d => d.type !== docType))}
                              className="text-[9px] text-red-400 hover:text-red-300 font-bold shrink-0 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 italic">Not submitted</p>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          ref={(el) => { docInputRefs.current[docType] = el; }}
                          onChange={(e) => handleDocumentUpload(docType, e.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={() => docInputRefs.current[docType]?.click()}
                          className="w-full py-1.5 bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white border border-brand-orange/30 rounded text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {uploaded ? 'Replace File' : 'Upload / Submit'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/60 rounded-lg p-2.5">
                <span className="text-[11px] font-bold text-gray-300">Verification Status</span>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                >
                  <option value="Pending Audit">Pending Audit</option>
                  <option value="Verified">Verified</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => { resetForm(); setIsAddOpen(false); }}
                  className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {editingDriver ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compare Drivers Modal */}
      <CompareDriversModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        drivers={drivers}
        onViewProfile={(id) => setSelectedDriverId(id)}
      />
    </div>
  );
}

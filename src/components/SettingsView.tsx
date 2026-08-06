/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Shield, Bell, Check, Save, RotateCcw } from 'lucide-react';

export default function SettingsView() {
  const [baseFee, setBaseFee] = useState(40);
  const [peakSurcharge, setPeakSurcharge] = useState(1.2);
  const [minOrder, setMinOrder] = useState(200);
  const [bkashEnabled, setBkashEnabled] = useState(true);
  const [nagadEnabled, setNagadEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-6 fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">System Settings</h2>
        <p className="text-xs text-gray-400">Configure global dispatch fees, payment gateways, and system maintenance</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Logistics Pricing */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-white text-sm flex items-center space-x-2 border-b border-brand-border/60 pb-2.5">
            <Settings className="w-4 h-4 text-brand-orange" />
            <span>Pricing & Surcharges</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wide mb-1">Base Delivery Fee (৳)</label>
              <input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(Number(e.target.value))}
                className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wide mb-1">Peak Surcharge (Multiplier)</label>
              <input
                type="number"
                step="0.1"
                value={peakSurcharge}
                onChange={(e) => setPeakSurcharge(Number(e.target.value))}
                className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wide mb-1">Min Order Value (৳)</label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(Number(e.target.value))}
                className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
              />
            </div>
          </div>
        </div>

        {/* Payment Gateways */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-white text-sm flex items-center space-x-2 border-b border-brand-border/60 pb-2.5">
            <Shield className="w-4 h-4 text-brand-orange" />
            <span>Active Payment Gateways</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-brand-dark/40 border border-brand-border rounded-lg">
              <div>
                <p className="text-xs font-semibold text-white">bKash (Mobile Wallet)</p>
                <p className="text-[10px] text-gray-400">Main local payout provider</p>
              </div>
              <input
                type="checkbox"
                checked={bkashEnabled}
                onChange={(e) => setBkashEnabled(e.target.checked)}
                className="w-4 h-4 text-brand-orange bg-brand-dark border-brand-border rounded focus:ring-brand-orange"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-brand-dark/40 border border-brand-border rounded-lg">
              <div>
                <p className="text-xs font-semibold text-white">Nagad (Mobile Wallet)</p>
                <p className="text-[10px] text-gray-400">Local direct checkout</p>
              </div>
              <input
                type="checkbox"
                checked={nagadEnabled}
                onChange={(e) => setNagadEnabled(e.target.checked)}
                className="w-4 h-4 text-brand-orange bg-brand-dark border-brand-border rounded focus:ring-brand-orange"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-brand-dark/40 border border-brand-border rounded-lg">
              <div>
                <p className="text-xs font-semibold text-white">Cash on Delivery (COD)</p>
                <p className="text-[10px] text-gray-400">Rider collection method</p>
              </div>
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
                className="w-4 h-4 text-brand-orange bg-brand-dark border-brand-border rounded focus:ring-brand-orange"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-brand-dark/40 border border-brand-border rounded-lg">
              <div>
                <p className="text-xs font-semibold text-white">Visa/Mastercard Gateway</p>
                <p className="text-[10px] text-gray-400">SslCommerz secure merchant</p>
              </div>
              <input
                type="checkbox"
                checked={cardEnabled}
                onChange={(e) => setCardEnabled(e.target.checked)}
                className="w-4 h-4 text-brand-orange bg-brand-dark border-brand-border rounded focus:ring-brand-orange"
              />
            </div>
          </div>
        </div>

        {/* Platform Maintenance Mode Toggle */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-white text-sm flex items-center space-x-2 border-b border-brand-border/60 pb-2.5">
            <Bell className="w-4 h-4 text-brand-orange" />
            <span>Platform Operations Status</span>
          </h3>

          <div className="flex items-center justify-between p-3.5 bg-brand-dark/60 border border-brand-border rounded-lg">
            <div>
              <p className="text-xs font-bold text-white">Global Maintenance Mode</p>
              <p className="text-[10px] text-gray-400 max-w-sm mt-0.5">Enabling this halts all dispatching services, blocking users from checkout and informing riders about maintenance.</p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border cursor-pointer ${
                maintenanceMode 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {maintenanceMode ? 'Active Maintenance' : 'Operational'}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {saved && (
            <p className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
              <Check className="w-4 h-4" />
              <span>Configurations updated and saved successfully!</span>
            </p>
          )}
          {!saved && <span></span>}

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-md shadow-brand-orange/10"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

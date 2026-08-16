/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Shield, Bell, Check, Save, RotateCcw, FileText, ScrollText, X, ExternalLink } from 'lucide-react';
import { LEGAL_DOCS } from '../legalContent';

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
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const legalUrl = (doc: 'privacy' | 'terms') =>
    `${window.location.origin}${window.location.pathname}?legal=${doc}`;

  const copyLegalUrl = (doc: 'privacy' | 'terms') => {
    navigator.clipboard.writeText(legalUrl(doc)).then(() => {
      setLegalDoc(null);
      setTimeout(() => window.location.href = legalUrl(doc), 200);
    });
  };

  const openDoc = legalDoc === 'privacy' ? LEGAL_DOCS.privacy : LEGAL_DOCS.terms;

  return (
    <div className="max-w-3xl space-y-6 fade-in">
      {legalDoc && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setLegalDoc(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-brand-border bg-[#0c1624] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-brand-border bg-[#0c1624] p-4">
              <div className="flex items-center space-x-2">
                {legalDoc === 'privacy' ? <Shield className="h-4 w-4 text-brand-orange" /> : <ScrollText className="h-4 w-4 text-brand-orange" />}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-brand-orange">{legalDoc === 'privacy' ? 'Legal' : 'Legal'}</p>
                  <h3 className="mt-0.5 text-sm font-black text-white">{openDoc.title}</h3>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button type="button" onClick={() => copyLegalUrl(legalDoc)} className="rounded-lg border border-brand-border p-2 text-gray-300 hover:border-brand-orange hover:text-white" title="Open public link">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setLegalDoc(null)} className="rounded-lg border border-brand-border p-2 text-gray-300 hover:border-brand-orange hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <h4 className="text-xs font-black text-white">{openDoc.title}</h4>
                  <p className="mt-0.5 text-[10px] text-gray-400">Effective Date: {openDoc.effectiveDate}</p>
                </div>
                <span className="rounded-lg border border-brand-border bg-[#070e17] px-2.5 py-1 text-[9px] font-black uppercase text-gray-400">thanexsago.com</span>
              </div>
              {openDoc.content.map((section, i) => (
                <div key={i} className="rounded-xl border border-brand-border bg-[#070e17] p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-brand-orange">{section.heading}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray-300">{section.text}</p>
                </div>
              ))}
              <div className="rounded-xl border border-brand-border bg-[#070e17] p-3.5 text-center">
                <p className="text-[10px] text-gray-400">Public URL</p>
                <p className="mt-1 break-all font-mono text-[10px] text-brand-orange">{legalUrl(legalDoc)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Legal Documents */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-white text-sm flex items-center space-x-2 border-b border-brand-border/60 pb-2.5">
          <FileText className="w-4 h-4 text-brand-orange" />
          <span>Legal Documents</span>
        </h3>
        <p className="text-[10px] text-gray-400">Public Privacy Policy and Terms of Service for the platform. Open them here, or share their public links.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setLegalDoc('privacy')}
            className="group flex items-center justify-between rounded-xl border border-brand-border bg-[#070e17] p-4 text-left transition-colors hover:border-brand-orange"
          >
            <div className="flex items-center space-x-3">
              <div className="rounded-lg border border-brand-border bg-[#0c1624] p-2 text-brand-orange">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Privacy Policy</p>
                <p className="mt-0.5 text-[9px] text-gray-400">Effective {LEGAL_DOCS.privacy.effectiveDate}</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-brand-orange" />
          </button>
          <button
            type="button"
            onClick={() => setLegalDoc('terms')}
            className="group flex items-center justify-between rounded-xl border border-brand-border bg-[#070e17] p-4 text-left transition-colors hover:border-brand-orange"
          >
            <div className="flex items-center space-x-3">
              <div className="rounded-lg border border-brand-border bg-[#0c1624] p-2 text-brand-orange">
                <ScrollText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Terms of Service</p>
                <p className="mt-0.5 text-[9px] text-gray-400">Effective {LEGAL_DOCS.terms.effectiveDate}</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-brand-orange" />
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-brand-border bg-brand-dark/40 px-3 py-2">
            <p className="text-[9px] font-black uppercase text-gray-400">Privacy Policy Link</p>
            <p className="mt-0.5 break-all font-mono text-[9px] text-brand-orange">{legalUrl('privacy')}</p>
          </div>
          <div className="rounded-lg border border-brand-border bg-brand-dark/40 px-3 py-2">
            <p className="text-[9px] font-black uppercase text-gray-400">Terms of Service Link</p>
            <p className="mt-0.5 break-all font-mono text-[9px] text-brand-orange">{legalUrl('terms')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CloudUpload, DownloadCloud, RefreshCw, Copy, ExternalLink, Globe, Trash2, CheckCircle2, AlertTriangle, Store, Truck, ShieldCheck, ShieldAlert, Users } from 'lucide-react';

interface StoreSyncViewProps {
  storeKey: string;
  onStoreKeyChange: (key: string) => void;
  storefrontUrl: string;
  syncState: 'idle' | 'syncing' | 'online' | 'offline';
  lastSyncAt: string | null;
  profile: { storeName: string; storeSub: string; whatsapp: string };
  onProfileChange: (p: { storeName: string; storeSub: string; whatsapp: string }) => void;
  onPush: () => void;
  onPull: () => void;
  onReset: () => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

const PORTAL_SITES = [
  { file: 'driver.html', label: 'Driver Site', desc: 'Accept deliveries, track earnings & manage your workday.', icon: Truck, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  { file: 'store.html', label: 'Store Site', desc: 'Product catalog, inventory, coupons & live storefront sync.', icon: Store, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { file: 'store-admin.html', label: 'Store Admin Site', desc: 'Store dashboard, staff, orders, payments & support.', icon: ShieldCheck, color: 'text-teal-400 border-teal-500/30 bg-teal-500/10' },
  { file: 'super-admin.html', label: 'Super Admin Site', desc: 'Full platform control center — every module unlocked.', icon: ShieldAlert, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { file: 'super-admin-staff.html', label: 'Super Admin Staff', desc: 'Orders, order tools, support tickets, notifications & reports.', icon: Users, color: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
];

export default function StoreSyncView({
  storeKey,
  onStoreKeyChange,
  storefrontUrl,
  syncState,
  lastSyncAt,
  profile,
  onProfileChange,
  onPush,
  onPull,
  onReset,
  showToast
}: StoreSyncViewProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(profile.storeName);
  const [sub, setSub] = useState(profile.storeSub);
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp);

  const statusMeta = {
    idle: { label: 'Not connected yet', cls: 'text-gray-400 bg-gray-600/10 border-gray-600/30', dot: 'bg-gray-400' },
    syncing: { label: 'Syncing…', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' },
    online: { label: 'Live & synced', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400 animate-pulse' },
    offline: { label: 'Offline — server unreachable', cls: 'text-red-400 bg-red-500/10 border-red-500/30', dot: 'bg-red-400' }
  }[syncState];

  const copyLink = () => {
    navigator.clipboard.writeText(storefrontUrl).then(() => {
      setCopied(true);
      showToast('Live storefront link copied — share it with your customers!', 'success');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Live Storefront & Cloud Sync</h3>
        <p className="text-xs text-gray-400">
          Publish your products &amp; banners to the public customer site. Every Save/Edit in the admin is pushed automatically and appears live for customers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Connection card */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-brand-border/60 pb-2.5">
            <CloudUpload className="w-4 h-4 text-brand-orange" />
            <span>Cloud Sync Status</span>
          </h4>

          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${statusMeta.cls}`}>
              <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`}></span>
              <span className="text-[11px] font-bold">{statusMeta.label}</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-500 font-bold uppercase">Store Key</div>
              <div className="font-mono text-xs text-brand-orange font-black">{storeKey}</div>
            </div>
          </div>

          <div className="text-[11px] text-gray-400 space-y-1">
            <div>Last push: <b className="text-gray-200">{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : '—'}</b></div>
            <div>Auto-sync: <b className="text-emerald-400">ON</b> — products, banners &amp; orders push automatically ~1.5s after any change.</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onPush}
              disabled={syncState === 'syncing'}
              className="px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 text-white rounded-lg text-[11px] font-bold cursor-pointer"
            >
              <CloudUpload className="w-3.5 h-3.5 inline mr-1" /> Push now
            </button>
            <button
              onClick={onPull}
              disabled={syncState === 'syncing'}
              className="px-3 py-2 bg-brand-dark border border-brand-border hover:border-brand-orange/40 text-gray-200 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              <DownloadCloud className="w-3.5 h-3.5 inline mr-1" /> Pull now
            </button>
            <button
              onClick={onReset}
              className="px-3 py-2 bg-brand-dark border border-brand-border hover:border-red-500/40 hover:text-red-400 text-gray-400 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Reset cloud
            </button>
          </div>

          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-yellow-200/80 leading-relaxed">
              Reset clears the cloud copy for this store key. Your local admin data is untouched. Note: Render free instances store the cloud copy on an ephemeral disk — it may be reset when the server restarts.
            </p>
          </div>
        </div>

        {/* Storefront link card */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-brand-border/60 pb-2.5">
            <Globe className="w-4 h-4 text-brand-orange" />
            <span>Customer Storefront Link</span>
          </h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            This public page shows your live banners + product catalog with WhatsApp ordering. Customers see updates instantly after you sync.
          </p>
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              readOnly
              value={storefrontUrl}
              className="flex-1 bg-brand-dark px-3 py-2 text-[10px] font-mono text-gray-300 rounded-lg border border-brand-border select-all outline-none"
            />
            <button
              onClick={copyLink}
              className="p-2.5 bg-brand-dark hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/40 text-gray-400 hover:text-brand-orange rounded-lg cursor-pointer transition-all"
              title="Copy storefront link"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Store Key</label>
          </div>
          <input
            value={storeKey}
            onChange={(e) => onStoreKeyChange(e.target.value)}
            placeholder="nexago-main"
            className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
          />
          <div className="flex justify-end space-x-2 pt-1">
            <button
              onClick={() => { navigator.clipboard.writeText(storefrontUrl); showToast('Storefront link copied — share with customers!', 'success'); }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 inline mr-1" /> Share link
            </button>
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-brand-dark border border-brand-border hover:border-brand-orange/40 text-gray-200 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Open storefront
            </a>
          </div>
        </div>

        {/* Role portal sites */}
        <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-xl p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-brand-border/60 pb-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-orange" />
            <span>Role Sites — open each portal in its own tab</span>
          </h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Five dedicated portals on the same NexaGo platform. Each one opens with its own sidebar &amp; panel mode — share the link with that team.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PORTAL_SITES.map(site => (
              <a
                key={site.file}
                href={`${window.location.origin}/${site.file}`}
                target="_blank"
                rel="noreferrer"
                className="group bg-brand-dark/40 border border-brand-border/50 rounded-xl p-4 hover:border-brand-orange/40 hover:bg-brand-dark/70 transition-all"
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${site.color}`}>
                  <site.icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-black text-white mt-2.5 flex items-center space-x-1.5">
                  <span>{site.label}</span>
                  <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-brand-orange transition-colors" />
                </p>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-1">{site.desc}</p>
                <p className="text-[9px] font-mono text-gray-600 mt-2">{site.file}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Branding card */}
        <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-xl p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-brand-border/60 pb-2.5">
            <Store className="w-4 h-4 text-brand-orange" />
            <span>Store Branding (shown on customer site)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Store Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Smart Shop"
                className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Sub-brand / Tagline</label>
              <input
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                placeholder="NexaGo BD Delivery"
                className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">WhatsApp Order Number</label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="8801XXXXXXXXX"
                className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            The WhatsApp number powers the "Order via WhatsApp" buttons on the customer site. Leave blank to keep the buttons (message opens without a pre-filled shop number).
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => onProfileChange({ storeName: name, storeSub: sub, whatsapp })}
              className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Save branding & publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

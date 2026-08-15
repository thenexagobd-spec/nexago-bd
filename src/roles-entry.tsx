/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Roles Hub — a standalone landing page listing every role portal site on the
 * NexaGo platform. Each site opens on its own clean route (served live by the
 * relay, e.g. https://sea-lion-app-eqin8.ondigitalocean.app/driver?key=nexago-main) with a
 * one-click copy link so teams can share their portal. Each role site's back
 * button lands here so the portals stay fully separate from the super admin panel.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Truck, Store, ShieldCheck, Users, Globe, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react';

const KEY = new URLSearchParams(window.location.search).get('key') || 'nexago-main';
const BASE = window.location.origin;

const SITES = [
  { route: 'store', label: 'Customer Storefront', desc: 'Public ordering site your customers use.', icon: Globe, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { route: 'driver', label: 'Driver Site', desc: 'Accept deliveries, track earnings & manage your workday.', icon: Truck, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  { route: 'store-site', label: 'Store Site', desc: 'Product catalog, inventory, coupons & live storefront sync.', icon: Store, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { route: 'store-admin', label: 'Store Admin Site', desc: 'Store dashboard, staff, orders, payments & support.', icon: ShieldCheck, color: 'text-teal-400 border-teal-500/30 bg-teal-500/10' },
  { route: 'super-admin', label: 'Super Admin Site', desc: 'Full platform control center — every module unlocked.', icon: ShieldCheck, color: 'text-brand-orange border-brand-orange/30 bg-brand-orange/10' },
  { route: 'super-admin-staff', label: 'Super Admin Staff', desc: 'Orders, order tools, support tickets, notifications & reports.', icon: Users, color: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
];

function SiteCard({ site, onCopy, key }: { site: (typeof SITES)[number]; onCopy: (url: string, label: string) => void; key?: string }) {
  void key;
  const url = `${BASE}/${site.route}?key=${encodeURIComponent(KEY)}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col bg-[#0d1829]/80 border border-[#1e3050]/60 rounded-xl p-4 hover:border-brand-orange/40 transition-all">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${site.color}`}>
          <site.icon className="w-4 h-4" />
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopy(url, site.label); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#132238] border border-[#1e3050] hover:border-brand-orange/40 text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#132238] border border-[#1e3050] hover:border-brand-orange/40 text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Open</span>
          </a>
        </div>
      </div>
      <p className="text-xs font-black text-white mt-2.5">{site.label}</p>
      <p className="text-[10px] text-gray-400 leading-relaxed mt-1">{site.desc}</p>
      <p className="text-[9px] font-mono text-gray-600 mt-2 break-all">{url}</p>
    </div>
  );
}

function RolesHub() {
  const [copiedMsg, setCopiedMsg] = useState<{ url: string; label: string } | null>(null);
  const onCopy = (url: string, label: string) => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedMsg({ url, label });
      setTimeout(() => setCopiedMsg(null), 2200);
    }).catch(() => {});
  };
  return (
    <div className="min-h-screen bg-[#0a1322] text-gray-100 flex flex-col">
      <header className="h-14 shrink-0 border-b border-[#1e3050] bg-[#0d1829]/80 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-sm shadow-lg">N</div>
          <div>
            <p className="font-black tracking-widest leading-none text-sm">NEXAGO</p>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">Role Portal Sites</p>
          </div>
        </div>
        <a href="./index.html" className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#132238] border border-[#1e3050] hover:border-brand-orange/40 text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white transition-colors">
          <ArrowLeft className="w-3 h-3" /><span className="hidden sm:inline">Back</span>
        </a>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div>
            <h1 className="text-xl font-black text-white">Choose a portal</h1>
            <p className="text-[11px] text-gray-400 mt-1">Each role opens on its own separate live site — copy the link and share it with that team member.</p>
            <p className="text-[10px] font-mono text-gray-600 mt-1.5">Key: <span className="text-brand-orange">{KEY}</span> · Base: {BASE}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SITES.map(site => (
              <SiteCard key={site.route} site={site} onCopy={onCopy} />
            ))}
          </div>
          {copiedMsg && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 text-white rounded-lg shadow-2xl text-xs font-semibold border-l-4 bg-[#0f1c2e] border-emerald-500">
              Link copied: {copiedMsg.label}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<RolesHub />);

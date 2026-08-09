/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Roles Hub — a standalone landing page listing every role portal site on the
 * NexaGo platform. Each role site's back button lands here so the portals stay
 * fully separate from the super admin panel.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Truck, Store, ShieldCheck, Users, Globe, ArrowLeft } from 'lucide-react';

const SITES = [
  { file: 'driver.html', label: 'Driver Site', desc: 'Accept deliveries, track earnings & manage your workday.', icon: Truck, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  { file: 'store.html', label: 'Store Site', desc: 'Receive customer orders & view order history.', icon: Store, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { file: 'store-admin.html', label: 'Store Admin Site', desc: 'Store dashboard, products, inventory, staff, payments & support.', icon: ShieldCheck, color: 'text-teal-400 border-teal-500/30 bg-teal-500/10' },
  { file: 'super-admin-staff.html', label: 'Super Admin Staff', desc: 'Orders, order tools, support tickets, notifications & reports.', icon: Users, color: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
  { file: 'super-admin.html', label: 'Super Admin Panel', desc: 'Full control — drivers, stores, analytics & every tool.', icon: ShieldCheck, color: 'text-brand-orange border-brand-orange/30 bg-brand-orange/10' },
  { file: 'customer.html', label: 'Customer Storefront', desc: 'Public ordering site your customers use.', icon: Globe, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
];

function RolesHub() {
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
            <p className="text-[11px] text-gray-400 mt-1">Each role opens in its own separate site — share the link with that team member.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SITES.map(site => (
              <a
                key={site.file}
                href={`./${site.file}`}
                target="_blank"
                rel="noreferrer"
                className="group bg-[#0d1829]/80 border border-[#1e3050]/60 rounded-xl p-4 hover:border-brand-orange/40 transition-all"
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${site.color}`}>
                  <site.icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-black text-white mt-2.5">{site.label}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-1">{site.desc}</p>
                <p className="text-[9px] font-mono text-gray-600 mt-2">{site.file}</p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<RolesHub />);

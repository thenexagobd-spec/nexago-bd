/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fresh portal shell shared by the four role sites — top header with logo,
 * live clock & back-to-admin link, a left icon rail nav, and the content area.
 */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Truck } from 'lucide-react';

export interface PortalNavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

interface PortalShellProps {
  role: string;
  tagline: string;
  nav: PortalNavItem[];
  active: string;
  onNav: (id: string) => void;
  onBack: () => void;
  children: React.ReactNode;
}

export default function PortalShell({ role, tagline, nav, active, onNav, onBack, children }: PortalShellProps) {
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a1322] text-gray-100 flex flex-col">
      {/* Top header */}
      <header className="h-14 shrink-0 border-b border-[#1e3050] bg-[#0d1829]/80 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-sm shadow-lg">N</div>
          <div>
            <p className="font-black tracking-widest leading-none text-sm">NEXAGO</p>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">Smart Delivery Network</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <span className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#132238] border border-[#1e3050] text-[10px] font-bold text-gray-300">
            <Clock className="w-3 h-3 text-brand-orange" />
            <span className="font-mono">{clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </span>
          <span className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-brand-orange/15 border border-brand-orange/40 text-brand-orange text-[9px] font-black uppercase tracking-wider">
            <Truck className="w-3 h-3" /><span className="hidden sm:inline">{role}</span><span className="sm:hidden">{role.split(' ')[0]}</span>
          </span>
          <button onClick={onBack} className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#132238] border border-[#1e3050] hover:border-brand-orange/40 text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="w-3 h-3" /><span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Left icon rail */}
        <aside className="hidden md:flex flex-col w-20 shrink-0 border-r border-[#1e3050] bg-[#0c1626] py-4 items-center space-y-1 overflow-y-auto">
          {nav.map(item => (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              title={item.label}
              className={`relative w-16 flex flex-col items-center space-y-1 py-2.5 rounded-xl border text-[9px] font-bold transition-all cursor-pointer ${
                active === item.id
                  ? 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#132238]'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="leading-none">{item.label.split(' ').slice(0, 2).join(' ')}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">{item.badge}</span>
              )}
            </button>
          ))}
        </aside>

        {/* Mobile top nav */}
        <div className="md:hidden shrink-0 overflow-x-auto border-b border-[#1e3050] bg-[#0c1626] flex space-x-2 px-3 py-2 scrollbar-none">
          {nav.map(item => (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                active === item.id ? 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange' : 'border-[#1e3050] text-gray-400'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" /><span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">{item.badge}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-5 fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

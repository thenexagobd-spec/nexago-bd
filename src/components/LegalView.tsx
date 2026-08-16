/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, ScrollText, ArrowLeft } from 'lucide-react';
import { LEGAL_DOCS, type LegalDoc } from '../legalContent';

export default function LegalView({ doc }: { doc: LegalDoc }) {
  const other = doc.id === 'privacy' ? LEGAL_DOCS.terms : LEGAL_DOCS.privacy;
  const homeUrl = `${window.location.origin}/index.html`;

  return (
    <div className="min-h-screen bg-[#070d16] text-gray-100 flex flex-col">
      <header className="h-14 shrink-0 border-b border-brand-border bg-[#0c1624]/80 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-sm shadow-lg">N</div>
          <div>
            <p className="font-black tracking-widest leading-none text-sm">NEXAGO</p>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">{doc.website}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <a
            href={`${window.location.origin}${window.location.pathname}?legal=${other.id}`}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#132238] border border-brand-border hover:border-brand-orange text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white transition-colors"
          >
            {other.id === 'privacy' ? <ShieldCheck className="w-3 h-3" /> : <ScrollText className="w-3 h-3" />}
            <span>{other.title}</span>
          </a>
          <a href={homeUrl} className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#132238] border border-brand-border hover:border-brand-orange text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="w-3 h-3" /><span className="hidden sm:inline">Back</span>
          </a>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="rounded-2xl border border-brand-border bg-[#0c1624] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange">NexaGo · {doc.website}</p>
                <h1 className="mt-2 text-2xl font-black text-white">{doc.title}</h1>
                <p className="mt-1 text-xs text-gray-400">Effective Date: {doc.effectiveDate}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                {doc.id === 'privacy'
                  ? <ShieldCheck className="w-6 h-6 text-brand-orange" />
                  : <ScrollText className="w-6 h-6 text-brand-orange" />}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {doc.content.map((section, i) => (
              <div key={i} className="rounded-xl border border-brand-border bg-[#0c1624] p-4 sm:p-5">
                <p className="text-[11px] font-black uppercase tracking-wider text-brand-orange">{section.heading}</p>
                <p className="mt-2 text-xs leading-relaxed text-gray-300">{section.text}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-brand-border bg-[#0c1624] p-4 text-center text-[10px] text-gray-500">
            © 2026 The NexaGo BD. All rights reserved.
          </div>
        </div>
      </main>
    </div>
  );
}
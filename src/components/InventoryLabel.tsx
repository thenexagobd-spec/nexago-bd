/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';
import { code39Bars, fmt } from './inventoryUtils';

export const BarcodeView = ({ text, width = 170, height = 40 }: { text: string; width?: number; height?: number }) => {
  const bars = code39Bars(text || 'NEXA');
  const total = bars.reduce((s, b) => s + b.width, 0);
  const px = width / total;
  return (
    <div className="flex items-stretch overflow-hidden" style={{ height, width }}>
      {bars.map((b, i) => (
        <div key={i} style={{ width: b.width * px, background: b.white ? 'transparent' : '#0b0f17' }} />
      ))}
    </div>
  );
};

const LabelCard = ({ p }: { p: any; key?: any }) => {
  const sku = (p.sku || p.id || 'NEXA').replace(/[^A-Za-z0-9\-.\s]/g, '');
  const sale = p.promoPrice && p.promoPrice > 0 ? p.promoPrice : p.price - ((p.price || 0) * (p.discount || 0)) / 100;
  return (
    <div className="bg-white text-gray-900 rounded-lg p-3 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase leading-tight text-gray-800 break-words">{p.name || 'Product'}</p>
          <p className="font-mono text-[8px] text-gray-500 mt-0.5">{p.sku || p.id}</p>
        </div>
        <QRCodeSVG value={sku || 'NEXA'} size={42} fgColor="#0b0f17" bgColor="#ffffff" />
      </div>
      <div className="flex justify-center my-1.5">
        <BarcodeView text={sku || 'NEXA'} width={180} height={38} />
      </div>
      <div className="flex items-center justify-between text-[10px] font-bold border-t border-gray-200 pt-1.5">
        <span>MRP: {fmt(p.price || 0)}</span>
        <span className="text-gray-500 font-mono">{p.unit || 'pcs'}</span>
        {sale > 0 && Math.abs(sale - (p.price || 0)) > 0.001 && <span className="text-emerald-600">{fmt(sale)}</span>}
      </div>
    </div>
  );
};

const PRINT_CSS = `
  @page { size: A4; margin: 8mm; }
  @media print {
    body * { visibility: hidden !important; }
    #label-overlay { background: #fff !important; position: static !important; overflow: visible !important; display: block !important; padding: 0 !important; }
    #label-overlay > div { overflow: visible !important; max-height: none !important; box-shadow: none !important; border: none !important; background: #fff !important; width: 100% !important; max-width: none !important; }
    #label-header { display: none !important; }
    #print-labels, #print-labels * { visibility: visible !important; }
    #print-labels { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 6mm !important; }
  }
`;

export default function InventoryLabelModal({ products, onClose }: { products: any[]; onClose: () => void }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'sd-label-print';
    style.innerHTML = PRINT_CSS;
    document.head.appendChild(style);
    return () => { const el = document.getElementById('sd-label-print'); if (el) el.remove(); };
  }, []);

  return (
    <div id="label-overlay" className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-brand-card border border-brand-border rounded-xl p-5" onClick={e => e.stopPropagation()}>
        <div id="label-header" className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Shelf Labels — {products.length} item{products.length === 1 ? '' : 's'}</h4>
          <div className="flex items-center space-x-2">
            <button onClick={() => window.print()} className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5">
              <Printer className="w-3.5 h-3.5" /><span>Print Labels</span>
            </button>
            <button onClick={onClose} className="p-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg cursor-pointer hover:bg-gray-600/30" title="Close"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div id="print-labels" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p: any) => <LabelCard key={p.id} p={p} />)}
        </div>
        <p className="text-[9px] text-gray-500 mt-3">Code-39 barcode + QR encode the product SKU/ID. Cut and stick on shelves or packaging.</p>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent } from 'react';
import { PromotionBanner } from '../types';
import { BarChart3, CalendarDays, Eye, Image, Link2, Megaphone, MousePointerClick, Pencil, Play, Plus, Save, Tag, Trash2, TrendingUp, Video, X } from 'lucide-react';
import { addDays, todayISO } from './inventoryUtils';

interface PromoStudioViewProps {
  banners: PromotionBanner[];
  onBannersChange: (next: PromotionBanner[]) => void;
  showToast: (msg: string, type?: 'success' | 'info') => void;
}

const PLACEMENTS = [
  { id: 'home', label: 'Home Carousel' },
  { id: 'store', label: 'Store Page' },
  { id: 'popup', label: 'In-App Popup' },
  { id: 'app', label: 'App Banner' }
] as const;

const emptyDraft = () => ({
  title: '',
  subtitle: '',
  description: '',
  mediaType: 'image' as 'image' | 'video',
  media: '',
  link: '',
  ctaLabel: 'Shop Now',
  placement: 'home' as PromotionBanner['placement'],
  startDate: todayISO(),
  endDate: addDays(todayISO(), 30),
  status: 'Active' as PromotionBanner['status'],
  couponCode: ''
});

export default function PromoStudioView({ banners, onBannersChange, showToast }: PromoStudioViewProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionBanner | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  const activeBanners = banners.filter(b => b.status === 'Active');
  useEffect(() => {
    if (activeBanners.length < 2) return;
    const t = setInterval(() => setPreviewIdx(i => (i + 1) % activeBanners.length), 3500);
    return () => clearInterval(t);
  }, [activeBanners.length]);

  const totalImpressions = banners.reduce((s, b) => s + (b.impressions || 0), 0);
  const totalClicks = banners.reduce((s, b) => s + (b.clicks || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '0%';
  const topBanner = banners.length ? banners.reduce((a, b) => ((b.clicks || 0) > (a.clicks || 0) ? b : a)) : null;

  const readFile = (file: File, cb: (dataUrl: string) => void) => {
    const r = new FileReader();
    r.onload = () => cb(String(r.result || ''));
    r.readAsDataURL(file);
  };

  const onFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { showToast('File too large — keep it under ~4MB (localStorage limit)', 'info'); return; }
    readFile(file, (dataUrl) => setDraft(d => ({ ...d, media: dataUrl })));
  };

  const placementLabel = (p?: string) => PLACEMENTS.find(x => x.id === p)?.label || 'Home Carousel';

  const openAdd = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setFormOpen(true);
  };

  const openEdit = (b: PromotionBanner) => {
    setEditing(b);
    setDraft({
      title: b.title || '',
      subtitle: b.subtitle || '',
      description: b.description || '',
      mediaType: b.mediaType || (b.media || (b.imageUrl && b.imageUrl.startsWith('data:video')) ? 'video' : 'image'),
      media: b.media || '',
      link: b.link || '',
      ctaLabel: b.ctaLabel || 'Shop Now',
      placement: b.placement || 'home',
      startDate: b.startDate || todayISO(),
      endDate: b.endDate || addDays(todayISO(), 30),
      status: b.status || 'Active',
      couponCode: b.couponCode || ''
    });
    setFormOpen(true);
  };

  const save = () => {
    if (!draft.title.trim()) { showToast('Banner title is required', 'info'); return; }
    const media = draft.media.trim();
    const imageUrl = draft.mediaType === 'image' ? (media || editing?.imageUrl || '') : '';
    const banner: PromotionBanner = {
      id: editing ? editing.id : 'BAN-' + Math.floor(100 + Math.random() * 900),
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      imageUrl,
      status: draft.status,
      startDate: draft.startDate || todayISO(),
      endDate: draft.endDate || addDays(todayISO(), 30),
      clicks: editing?.clicks || 0,
      description: draft.description.trim() || undefined,
      ctaLabel: draft.ctaLabel.trim() || 'Shop Now',
      link: draft.link.trim() || undefined,
      placement: draft.placement || 'home',
      mediaType: draft.mediaType,
      media: media || undefined,
      impressions: editing?.impressions || 0,
      couponCode: draft.couponCode.trim() || undefined
    };
    if (editing) {
      onBannersChange(banners.map(b => b.id === editing.id ? banner : b));
      showToast(`Banner "${banner.title}" updated`, 'success');
    } else {
      onBannersChange([banner, ...banners]);
      showToast(`Banner "${banner.title}" published`, 'success');
    }
    setFormOpen(false);
    setEditing(null);
  };

  const doDelete = () => {
    const b = banners.find(x => x.id === deleteId);
    if (!b) return;
    onBannersChange(banners.filter(x => x.id !== deleteId));
    showToast(`Banner "${b.title}" deleted`, 'info');
    setDeleteId(null);
  };

  const bump = (id: string, key: 'impressions' | 'clicks') => {
    onBannersChange(banners.map(b => b.id === id ? { ...b, [key]: (b[key] || 0) + 1 } : b));
  };

  const statusChip = (s: string) =>
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${s === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : s === 'Scheduled' ? 'bg-amber-500/10 text-amber-300' : 'bg-gray-600/20 text-gray-400'}`}>{s}</span>;

  const MediaBlock = ({ b, className = 'w-full h-full object-cover' }: { b: PromotionBanner; className?: string }) => {
    if (b.mediaType === 'video' && b.media) {
      return <video src={b.media} autoPlay muted loop playsInline className={className} />;
    }
    const src = b.mediaType === 'video' ? '' : (b.media || b.imageUrl);
    if (src) return <img src={src} alt={b.title} className={className} />;
    return <div className={`${className} bg-gradient-to-br from-brand-orange/40 to-indigo-500/40`} />;
  };

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center space-x-2"><Megaphone className="w-5 h-5 text-brand-orange" /><span>Ad Banner Studio</span></h3>
          <p className="text-xs text-gray-400">Photo & video ad banners with descriptions, CTA links, scheduling, and campaign analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setAnalyticsOpen(!analyticsOpen)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1.5 border ${analyticsOpen ? 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange' : 'bg-brand-dark border-brand-border text-gray-300 hover:text-white'}`}>
            <BarChart3 className="w-4 h-4" /><span>Campaign Analytics</span>
          </button>
          <button onClick={openAdd} className="px-3.5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1.5">
            <Plus className="w-4 h-4" /><span>Add Ad Banner</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Banners</span>
          <div className="text-2xl font-black text-white mt-1 flex items-center space-x-2"><Megaphone className="w-4 h-4 text-brand-orange" /><span>{activeBanners.length} / {banners.length}</span></div>
        </div>
        <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Impressions</span>
          <div className="text-2xl font-black text-indigo-400 mt-1 flex items-center space-x-2"><Eye className="w-4 h-4 text-indigo-400" /><span>{totalImpressions}</span></div>
        </div>
        <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Clicks</span>
          <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center space-x-2"><MousePointerClick className="w-4 h-4 text-emerald-400" /><span>{totalClicks}</span></div>
        </div>
        <div className="bg-brand-card p-4 border border-brand-border rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Click-Through Rate</span>
          <div className="text-2xl font-black text-brand-orange mt-1 flex items-center space-x-2"><TrendingUp className="w-4 h-4 text-brand-orange" /><span>{ctr}</span></div>
        </div>
      </div>

      {/* Mobile preview carousel */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4">
        <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Play className="w-3.5 h-3.5 text-brand-orange" /><span>Mobile Preview — Video & Photo Carousel</span></h4>
        {activeBanners.length === 0 ? (
          <p className="text-xs text-gray-500">No active banners yet — publish one (status Active) to see it here.</p>
        ) : (
          <div className="relative rounded-xl overflow-hidden aspect-[16/7] bg-brand-dark">
            {activeBanners.map((b, i) => (
              <div key={b.id} className={`absolute inset-0 transition-opacity duration-700 ${i === previewIdx % activeBanners.length ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <MediaBlock b={b} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-brand-orange">{b.mediaType === 'video' ? 'Video Ad' : 'Photo Ad'}</p>
                    <p className="text-sm font-black text-white leading-tight truncate">{b.title}</p>
                    {b.subtitle && <p className="text-[10px] text-gray-200 truncate">{b.subtitle}</p>}
                  </div>
                  <button className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-[10px] font-black shrink-0 cursor-pointer">{b.ctaLabel || 'Shop Now'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          {activeBanners.map((_, i) => (
            <button key={i} onClick={() => setPreviewIdx(i)} className={`h-1.5 rounded-full transition-all cursor-pointer ${i === previewIdx % activeBanners.length ? 'w-5 bg-brand-orange' : 'w-1.5 bg-gray-600'}`} />
          ))}
        </div>
      </div>

      {/* Campaign analytics */}
      {analyticsOpen && (
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><BarChart3 className="w-3.5 h-3.5 text-indigo-400" /><span>Campaign Analytics — per Banner</span></h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-gray-500 border-b border-brand-border">
                  <th className="py-2 pr-2 font-bold uppercase">Banner</th>
                  <th className="py-2 px-2 font-bold uppercase">Placement</th>
                  <th className="py-2 px-2 font-bold uppercase">Impressions</th>
                  <th className="py-2 px-2 font-bold uppercase">Clicks</th>
                  <th className="py-2 px-2 font-bold uppercase">CTR</th>
                  <th className="py-2 pl-2 font-bold uppercase text-right">Simulate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {banners.map(b => {
                  const imp = b.impressions || 0;
                  return (
                    <tr key={b.id} className="hover:bg-brand-dark/10">
                      <td className="py-1.5 pr-2 font-bold text-white truncate max-w-[220px]">{b.title}</td>
                      <td className="py-1.5 px-2 text-gray-300">{placementLabel(b.placement)}</td>
                      <td className="py-1.5 px-2 font-mono text-indigo-300">{imp}</td>
                      <td className="py-1.5 px-2 font-mono text-emerald-300">{b.clicks || 0}</td>
                      <td className="py-1.5 px-2 font-mono font-bold text-brand-orange">{imp ? ((b.clicks || 0) / imp * 100).toFixed(2) + '%' : '0%'}</td>
                      <td className="py-1.5 pl-2 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button onClick={() => bump(b.id, 'impressions')} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 rounded text-[9px] font-bold cursor-pointer hover:bg-indigo-500/20"><Eye className="w-3 h-3 inline-block mr-0.5" />View</button>
                          <button onClick={() => bump(b.id, 'clicks')} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded text-[9px] font-bold cursor-pointer hover:bg-emerald-500/20"><MousePointerClick className="w-3 h-3 inline-block mr-0.5" />Click</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {topBanner && (
            <p className="text-[10px] text-gray-500">Top performer: <span className="text-brand-orange font-bold">{topBanner.title}</span> ({topBanner.clicks || 0} clicks)</p>
          )}
        </div>
      )}

      {/* Banner cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banners.length === 0 && (
          <div className="md:col-span-3 bg-brand-card border border-brand-border rounded-xl p-8 text-center text-gray-500">
            <Megaphone className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-300">No ad banners yet</p>
            <p className="text-xs mt-1">Create your first photo or video banner with a description, CTA link, and schedule.</p>
          </div>
        )}
        {banners.map(b => {
          const imp = b.impressions || 0;
          return (
            <div key={b.id} className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-xl group">
              <div className="relative aspect-video bg-brand-dark">
                <MediaBlock b={b} />
                <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                  <span className="font-mono text-[9px] bg-black/60 text-brand-orange font-bold px-1.5 py-0.5 rounded">#{b.id}</span>
                  {b.mediaType === 'video' && <span className="text-[9px] bg-black/60 text-white font-bold px-1.5 py-0.5 rounded flex items-center"><Play className="w-2.5 h-2.5 mr-0.5" />VIDEO</span>}
                </div>
                <div className="absolute top-2 right-2">{statusChip(b.status)}</div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white truncate">{b.title}</h4>
                  <span className="text-[9px] text-gray-500 uppercase font-bold px-2 py-0.5 bg-brand-dark border border-brand-border rounded-full">{placementLabel(b.placement)}</span>
                </div>
                {b.subtitle && <p className="text-xs text-gray-400 font-semibold">{b.subtitle}</p>}
                {b.description && <p className="text-[11px] text-gray-400 line-clamp-3">{b.description}</p>}
                <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                  {b.couponCode && <span className="px-1.5 py-0.5 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange font-black rounded flex items-center"><Tag className="w-2.5 h-2.5 mr-0.5" />{b.couponCode}</span>}
                  {b.link && <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/40 text-blue-300 font-bold rounded flex items-center"><Link2 className="w-2.5 h-2.5 mr-0.5" />{b.link}</span>}
                </div>
                <div className="flex items-center justify-between border-t border-brand-border/40 pt-2 text-[10px] text-gray-500">
                  <span className="flex items-center space-x-1"><CalendarDays className="w-3 h-3" /><span>{b.startDate} → {b.endDate}</span></span>
                  <span className="flex items-center space-x-1"><MousePointerClick className="w-3 h-3" /><span>{b.clicks} clicks · {imp} views</span></span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono font-bold text-brand-orange">{imp ? ((b.clicks || 0) / imp * 100).toFixed(1) + '% CTR' : '—'}</span>
                  <div className="flex items-center space-x-1.5">
                    <button onClick={() => bump(b.id, 'impressions')} className="p-1.5 bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-500/20" title="Simulate a view"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(b)} className="p-1.5 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg cursor-pointer hover:bg-gray-600/30" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(b.id)} className="p-1.5 bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg cursor-pointer hover:bg-red-500/20" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2"><Megaphone className="w-4 h-4 text-brand-orange" /><span>{editing ? 'Edit Ad Banner' : 'New Ad Banner'}</span></h4>
              <button onClick={() => setFormOpen(false)} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1.5">Media Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDraft(d => ({ ...d, mediaType: 'image' }))} className={`px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer border flex items-center justify-center space-x-1.5 ${draft.mediaType === 'image' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200' : 'bg-brand-dark border-brand-border text-gray-400'}`}><Image className="w-3.5 h-3.5" /><span>Photo</span></button>
                <button onClick={() => setDraft(d => ({ ...d, mediaType: 'video' }))} className={`px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer border flex items-center justify-center space-x-1.5 ${draft.mediaType === 'video' ? 'bg-red-500/20 border-red-500/40 text-red-200' : 'bg-brand-dark border-brand-border text-gray-400'}`}><Video className="w-3.5 h-3.5" /><span>Video</span></button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Upload {draft.mediaType === 'video' ? 'Video' : 'Photo'} (or paste URL below)</label>
              <div className="flex items-center space-x-2">
                <label className={`flex-1 px-3 py-2 ${draft.mediaType === 'video' ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'} border rounded-lg text-[10px] font-bold cursor-pointer text-center hover:opacity-80`}>
                  <input type="file" accept={draft.mediaType === 'video' ? 'video/*' : 'image/*'} className="hidden" onChange={onFilePick} />
                  {draft.mediaType === 'video' ? <><Video className="w-3.5 h-3.5 inline-block mr-1" />Choose Video File</> : <><Image className="w-3.5 h-3.5 inline-block mr-1" />Choose Image File</>}
                </label>
                {draft.media && (
                  <button onClick={() => setDraft(d => ({ ...d, media: '' }))} className="px-3 py-2 bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg text-[10px] font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /> Clear</button>
                )}
              </div>
              <input value={draft.media} onChange={(e) => setDraft(d => ({ ...d, media: e.target.value }))} placeholder={draft.mediaType === 'video' ? 'https://…/ad.mp4 or uploaded file' : 'https://…/ad.jpg or uploaded file'} className="w-full mt-2 px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <p className="text-[9px] text-gray-600 mt-1">Uploaded files are stored as base64 in browser storage — keep them under ~4MB. Videos play inline, muted, looping.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Title *</label>
                <input value={draft.title} onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Eid Mega Sale — 20% OFF" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Subtitle</label>
                <input value={draft.subtitle} onChange={(e) => setDraft(d => ({ ...d, subtitle: e.target.value }))} placeholder="Short tagline under the title" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Description</label>
                <textarea value={draft.description} onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))} rows={3} placeholder="Longer campaign description — offer details, terms, highlights…" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600 resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">CTA Label</label>
                <input value={draft.ctaLabel} onChange={(e) => setDraft(d => ({ ...d, ctaLabel: e.target.value }))} placeholder="Shop Now" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">CTA Link</label>
                <input value={draft.link} onChange={(e) => setDraft(d => ({ ...d, link: e.target.value }))} placeholder="https://… or /products?cat=…" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Coupon Code (optional)</label>
                <input value={draft.couponCode} onChange={(e) => setDraft(d => ({ ...d, couponCode: e.target.value }))} placeholder="EID20" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Placement</label>
                <select value={draft.placement} onChange={(e) => setDraft(d => ({ ...d, placement: e.target.value as PromotionBanner['placement'] }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange">
                  {PLACEMENTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Start Date</label>
                <input type="date" value={draft.startDate} onChange={(e) => setDraft(d => ({ ...d, startDate: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">End Date</label>
                <input type="date" value={draft.endDate} onChange={(e) => setDraft(d => ({ ...d, endDate: e.target.value }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Status</label>
                <select value={draft.status} onChange={(e) => setDraft(d => ({ ...d, status: e.target.value as PromotionBanner['status'] }))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange">
                  <option>Active</option>
                  <option>Scheduled</option>
                  <option>Expired</option>
                </select>
              </div>
            </div>

            {draft.media && (
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2">
                <p className="text-[9px] text-gray-500 uppercase mb-1">Live Preview</p>
                <div className="relative rounded-lg overflow-hidden aspect-video bg-brand-dark">
                  {draft.mediaType === 'video'
                    ? <video src={draft.media} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                    : <img src={draft.media} alt="preview" className="w-full h-full object-cover" />}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-xs font-black text-white">{draft.title || 'Your title'}</p>
                    <p className="text-[10px] text-white/80">{draft.subtitle || 'Subtitle appears here'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-600/30">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center space-x-1.5"><Save className="w-3.5 h-3.5" /><span>{editing ? 'Save Changes' : 'Publish Banner'}</span></button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-xl p-5 text-center space-y-3">
            <Trash2 className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm font-bold text-white">Delete this banner?</p>
            <p className="text-xs text-gray-400">"{banners.find(x => x.id === deleteId)?.title}" will be removed from all placements.</p>
            <div className="flex justify-center space-x-2 pt-1">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer">Cancel</button>
              <button onClick={doDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

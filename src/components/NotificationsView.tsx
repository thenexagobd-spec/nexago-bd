/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SystemNotification } from '../types';
import { Bell, ShieldAlert, CheckCircle2, Send, Trash, Eye } from 'lucide-react';

interface NotificationsViewProps {
  notifications: SystemNotification[];
  onAddNotification: (notification: Omit<SystemNotification, 'id' | 'time' | 'read'>) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onToggleRead?: (id: string) => void;
}

export default function NotificationsView({
  notifications,
  onAddNotification,
  onMarkAllAsRead,
  onClearAll,
  onToggleRead
}: NotificationsViewProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SystemNotification['type']>('system');
  const [filter, setFilter] = useState<'all' | SystemNotification['type']>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    onAddNotification({ title, message, type });
    setTitle('');
    setMessage('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in items-start">
      {/* List of Notifications */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">System Notifications</h2>
            <p className="text-xs text-gray-400">Dispatch and review push alerts and platform-wide updates</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1.5 bg-brand-dark/50 hover:bg-brand-orange/10 border border-brand-border hover:border-brand-orange/30 text-xs font-semibold text-gray-300 hover:text-brand-orange rounded-lg transition-all cursor-pointer"
            >
              Mark All Read
            </button>
            <button
              onClick={onClearAll}
              className="p-1.5 bg-brand-dark/50 hover:bg-red-500/10 border border-brand-border hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
              title="Clear All Notifications"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {(['all', 'order', 'system', 'driver', 'payment'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                filter === f
                  ? 'bg-brand-orange text-white shadow'
                  : 'bg-brand-dark border border-brand-border text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f}
              <span className="ml-1 opacity-70">
                {f === 'all' ? notifications.length : notifications.filter(n => n.type === f).length}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border flex items-start space-x-3.5 transition-all ${
                notif.read 
                  ? 'bg-brand-card/60 border-brand-border/60 opacity-80' 
                  : 'bg-brand-card border-brand-orange/20 shadow-md shadow-brand-orange/5'
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${
                notif.type === 'driver' ? 'bg-orange-500/10 text-brand-orange' :
                notif.type === 'order' ? 'bg-blue-500/10 text-blue-400' :
                notif.type === 'payment' ? 'bg-purple-500/10 text-purple-400' :
                'bg-yellow-500/10 text-yellow-400'
              }`}>
                <Bell className="w-4 h-4" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-white">{notif.title}</h4>
                  <span className="text-[9px] text-gray-500 font-mono">{notif.time}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{notif.message}</p>
                {!notif.read && onToggleRead && (
                  <button
                    onClick={() => onToggleRead(notif.id)}
                    className="mt-1 text-[10px] font-bold text-brand-orange hover:text-white transition-colors cursor-pointer inline-flex items-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Mark as read</span>
                  </button>
                )}
              </div>

              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0 mt-1.5"></span>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-gray-400 bg-brand-card border border-brand-border rounded-xl">
              {filter === 'all' ? 'All caught up! No system notifications to display.' : 'No ' + filter + ' notifications.'}
            </div>
          )}
        </div>
      </div>

      {/* Dispatch custom push notification */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-white text-sm mb-1.5 flex items-center space-x-2">
          <Send className="w-4 h-4 text-brand-orange" />
          <span>Dispatch Push Alert</span>
        </h3>
        <p className="text-[11px] text-gray-400 mb-4">Send a push notification alert instantly to all active customers or drivers.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wide mb-1">Target Audience Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
            >
              <option value="system">All Platform Users (System Update)</option>
              <option value="driver">Riders / Drivers Only</option>
              <option value="order">Order Support alerts</option>
              <option value="payment">Billing & Payout Updates</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wide mb-1">Alert Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Free Delivery Enabled!"
              className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wide mb-1">Alert Detailed Message</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write detailed push announcement..."
              className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-brand-orange/10"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Alert Broadcast</span>
          </button>
        </form>
      </div>
    </div>
  );
}

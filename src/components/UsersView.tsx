/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { 
  Search, UserPlus, Mail, Phone, Calendar, ShoppingBag, ShieldCheck, 
  Edit3, Trash2, X, Wallet, Crown, Lock, Unlock, MessageSquare, Send, 
  PlusCircle, RefreshCw, AlertTriangle, CheckCircle2
} from 'lucide-react';

interface UsersViewProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'joinDate'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const safeText = (value: unknown, fallback = '') => {
  const next = String(value ?? '').trim();
  return next || fallback;
};
const initials = (value: unknown, fallback = 'US') => safeText(value, fallback).split(/\s+/).map(n => n[0] || '').join('').slice(0, 2).toUpperCase() || fallback;

export default function UsersView({ users, onAddUser, onUpdateUser, onDeleteUser, showToast }: UsersViewProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Customer' | 'Admin' | 'Super Admin'>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // New Admin Control Modals for Customer App
  const [walletUser, setWalletUser] = useState<User | null>(null);
  const [walletCreditAmount, setWalletCreditAmount] = useState<number>(200);
  const [walletNote, setWalletNote] = useState('');

  const [messagingUser, setMessagingUser] = useState<User | null>(null);
  const [broadcastText, setBroadcastText] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Customer' | 'Admin' | 'Super Admin'>('Customer');
  const [status, setStatus] = useState<'Active' | 'Suspended'>('Active');
  const [ordersCount, setOrdersCount] = useState(0);

  // KPI summary calculations
  const totalCustomers = users.filter(u => u.role === 'Customer').length;
  const totalWalletBalance = users.reduce((acc, u) => acc + (u.walletBalance || 0), 0);
  const totalVipGold = users.filter(u => u.membershipTier === 'Gold VIP').length;
  const totalSuspended = users.filter(u => u.status === 'Suspended').length;

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || 
                          user.email.toLowerCase().includes(search.toLowerCase()) ||
                          user.phone.includes(search);
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        name,
        email,
        phone,
        role,
        status,
        ordersCount: Number(ordersCount)
      });
      setEditingUser(null);
    } else {
      onAddUser({
        name,
        email,
        phone,
        role,
        status,
        ordersCount: Number(ordersCount),
        walletBalance: 250.00,
        membershipTier: 'Standard',
        address: 'Dhaka City'
      });
      setIsAddOpen(false);
    }
    resetForm();
  };

  const toggleAccountStatus = (user: User) => {
    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    onUpdateUser({
      ...user,
      status: nextStatus
    });
    if (showToast) {
      showToast(
        nextStatus === 'Suspended'
          ? `Account ${user.name} frozen. Ordering & Login blocked.`
          : `Account ${user.name} reactivated.`,
        nextStatus === 'Suspended' ? 'error' : 'success'
      );
    }
  };

  const cycleVipTier = (user: User) => {
    const tiers: Array<'Standard' | 'Silver VIP' | 'Gold VIP'> = ['Standard', 'Silver VIP', 'Gold VIP'];
    const currentIdx = tiers.indexOf(user.membershipTier || 'Standard');
    const nextTier = tiers[(currentIdx + 1) % tiers.length];
    onUpdateUser({
      ...user,
      membershipTier: nextTier
    });
    if (showToast) {
      showToast(`${user.name} elevated to ${nextTier}!`, 'success');
    }
  };

  const handleWalletTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletUser) return;
    const currentBal = walletUser.walletBalance || 0;
    const newBal = currentBal + Number(walletCreditAmount);

    onUpdateUser({
      ...walletUser,
      walletBalance: newBal
    });

    if (showToast) {
      showToast(`Credited ৳${walletCreditAmount} to ${walletUser.name}'s app wallet! New balance: ৳${newBal}`, 'success');
    }

    setWalletUser(null);
    setWalletCreditAmount(200);
    setWalletNote('');
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setRole(user.role);
    setStatus(user.status);
    setOrdersCount(user.ordersCount);
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('Customer');
    setStatus('Active');
    setOrdersCount(0);
    setEditingUser(null);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">Customer App & User Admin Control</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
              Customer Operations
            </span>
          </div>
          <p className="text-xs text-gray-400">Manage customer app wallets, VIP loyalty tiers, fraud locks & direct push messaging</p>
        </div>

        <button
          onClick={() => { resetForm(); setIsAddOpen(true); }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Customer Operations Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Registered Customers</p>
            <p className="text-lg font-black text-white mt-0.5">{totalCustomers} Users</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">App Wallet Pool Balance</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">৳{totalWalletBalance.toLocaleString()}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Gold VIP Members</p>
            <p className="text-lg font-black text-amber-400 mt-0.5">{totalVipGold} Accounts</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Crown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Fraud Blocked / Frozen</p>
            <p className="text-lg font-black text-red-400 mt-0.5">{totalSuspended} Suspended</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-brand-dark/80 text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Customer', 'Admin', 'Super Admin'] as const).map((roleOpt) => (
            <button
              key={roleOpt}
              onClick={() => setRoleFilter(roleOpt)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all shrink-0 ${
                roleFilter === roleOpt
                  ? 'bg-brand-orange/10 border-brand-orange text-brand-orange font-bold'
                  : 'bg-brand-dark/50 border-brand-border text-gray-400 hover:text-gray-200'
              }`}
            >
              {roleOpt}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <div 
            key={user.id} 
            className={`bg-brand-card border rounded-xl p-5 relative overflow-hidden group flex flex-col justify-between transition-all ${
              user.status === 'Suspended' ? 'border-red-500/40 bg-red-500/5' : 'border-brand-border hover:border-brand-orange/40'
            }`}
          >
            {/* Role indicator tag */}
            <div className="absolute top-3 right-3 flex items-center space-x-1.5">
              {user.role === 'Customer' && (
                <button
                  onClick={() => cycleVipTier(user)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-transform hover:scale-105 flex items-center gap-1 ${
                    user.membershipTier === 'Gold VIP'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : user.membershipTier === 'Silver VIP'
                      ? 'bg-slate-400/15 text-slate-200 border-slate-400/40'
                      : 'bg-brand-dark text-gray-400 border-brand-border'
                  }`}
                  title="Click to elevate customer VIP tier"
                >
                  <Crown className="w-2.5 h-2.5" />
                  <span>{user.membershipTier || 'Standard'}</span>
                </button>
              )}

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                user.role === 'Super Admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25' :
                user.role === 'Admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' :
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
              }`}>
                {user.role}
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center font-bold text-brand-orange text-sm shrink-0 relative">
                  {initials(user.name)}
                  {user.status === 'Suspended' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-brand-card flex items-center justify-center text-[8px] text-white">
                      ✕
                    </span>
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-sm text-white truncate pr-20">{safeText(user.name, 'Unnamed User')}</h4>
                  <p className="text-[10px] text-gray-400 font-mono">{user.id}</p>

                  <div className="space-y-1 text-xs text-gray-300">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer App Wallet & Metrics */}
              {user.role === 'Customer' && (
                <div className="bg-brand-dark/40 p-3 rounded-lg border border-brand-border/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center space-x-1">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>In-App Wallet:</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        ৳{(user.walletBalance || 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => setWalletUser(user)}
                        className="px-2 py-0.5 bg-brand-orange/15 hover:bg-brand-orange text-brand-orange hover:text-white rounded text-[9.5px] font-bold transition-all cursor-pointer border border-brand-orange/30 flex items-center space-x-1"
                        title="Top-Up or Refund Wallet Balance"
                      >
                        <PlusCircle className="w-2.5 h-2.5" />
                        <span>Credit</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] border-t border-brand-border/20 pt-1.5 text-gray-400">
                    <span className="flex items-center space-x-1">
                      <ShoppingBag className="w-3 h-3 text-brand-orange" />
                      <span>Total Completed Orders:</span>
                    </span>
                    <span className="font-bold text-white">{user.ordersCount}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="mt-4 pt-3 border-t border-brand-border/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleAccountStatus(user)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1 border ${
                    user.status === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                      : 'bg-red-500 text-white border-red-600 hover:bg-emerald-500'
                  }`}
                  title={user.status === 'Active' ? "Freeze account for fraud check" : "Reactivate account"}
                >
                  {user.status === 'Active' ? <ShieldCheck className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{user.status === 'Active' ? 'Active Account' : 'Suspended'}</span>
                </button>

                {user.role === 'Customer' && (
                  <button
                    onClick={() => setMessagingUser(user)}
                    className="p-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 rounded cursor-pointer transition-colors"
                    title="Send Push Message to Customer Mobile App"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {user.role !== 'Super Admin' && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(user)}
                    className="p-1.5 bg-brand-dark/60 hover:bg-brand-orange/20 text-gray-300 hover:text-brand-orange border border-brand-border rounded cursor-pointer transition-colors"
                    title="Edit User"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteUser(user.id)}
                    className="p-1.5 bg-brand-dark/60 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-brand-border rounded cursor-pointer transition-colors"
                    title="Delete User"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-brand-card border border-brand-border rounded-xl">
            <p className="text-xs text-gray-400">No users found matching filters.</p>
          </div>
        )}
      </div>

      {/* WALLET TOP-UP & CREDIT MODAL */}
      {walletUser && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl fade-in p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Credit App Wallet / Issue Refund</span>
              </h3>
              <button onClick={() => setWalletUser(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWalletTopUp} className="space-y-4 text-xs">
              <div className="bg-brand-dark/60 p-3 rounded-lg border border-brand-border/40 space-y-1">
                <p className="text-gray-300">Customer: <b className="text-white">{walletUser.name}</b></p>
                <p className="text-gray-400">Current App Wallet Balance: <span className="font-mono font-bold text-emerald-400">৳{(walletUser.walletBalance || 0).toLocaleString()}</span></p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Credit Amount (BDT ৳)</label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  required
                  value={walletCreditAmount}
                  onChange={(e) => setWalletCreditAmount(Number(e.target.value))}
                  className="w-full bg-brand-dark text-white border border-brand-border rounded-lg p-2.5 outline-none focus:border-brand-orange font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Reason / Reference Note</label>
                <input
                  type="text"
                  placeholder="e.g. Promotional Cashback or Order Refund #ORD-1245"
                  value={walletNote}
                  onChange={(e) => setWalletNote(e.target.value)}
                  className="w-full bg-brand-dark text-white border border-brand-border rounded-lg p-2.5 outline-none focus:border-brand-orange"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletUser(null)}
                  className="px-4 py-2 bg-brand-dark hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Credit ৳{walletCreditAmount} Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUSH ALERT MODAL FOR CUSTOMER APP */}
      {messagingUser && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl fade-in p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-brand-orange" />
                <span>Transmit Push Broadcast to Customer App</span>
              </h3>
              <button onClick={() => setMessagingUser(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-300">Target User: <b className="text-white">{messagingUser.name}</b> ({messagingUser.phone})</p>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Push Broadcast Message</label>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="e.g. Special Offer: Enjoy 20% discount on grocery delivery using coupon FRESH20!"
                  className="w-full bg-brand-dark/80 border border-brand-border text-xs text-white p-2.5 rounded-lg outline-none focus:border-brand-orange resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setMessagingUser(null)}
                  className="px-4 py-2 bg-brand-dark hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!broadcastText.trim()) return;
                    if (showToast) showToast(`Broadcast sent to ${messagingUser.name}'s customer app: "${broadcastText}"`, 'success');
                    setBroadcastText('');
                    setMessagingUser(null);
                  }}
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Push Alert</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl fade-in">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-semibold text-white text-sm">
                {editingUser ? 'Edit User Profile' : 'Add New User'}
              </h3>
              <button
                onClick={() => { resetForm(); setIsAddOpen(false); }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="shakib@email.com"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Role Type</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Pre-existing Order Count</label>
                <input
                  type="number"
                  min="0"
                  value={ordersCount}
                  onChange={(e) => setOrdersCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => { resetForm(); setIsAddOpen(false); }}
                  className="px-4 py-2 bg-brand-dark border border-brand-border hover:bg-brand-border/30 text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

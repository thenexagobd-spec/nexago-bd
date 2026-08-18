/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Super Admin Staff Site — fresh staff portal: dashboard, orders, order tools,
 * support, notifications and reports. Reads the same localStorage keys as the
 * admin panel.
 */
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardList, Wrench, LifeBuoy, Bell, BarChart3, CheckCircle2, TrendingUp, Ticket, ShieldCheck, Lock, LogOut } from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, useTickets, useNotifications, useWalletBal, useWalletTxns, bdt, statusBadge, useCloudSync, securityApi, securityAudit, lsGet } from './portalUtils';

export default function StaffPortal() {
  useCloudSync();
  const [session, setSession] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('sd_staff_security_session') || 'null'); } catch { return null; }
  });
  const [login, setLogin] = useState({ userId: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [orders, setOrders] = useOrders();
  const [tickets, setTickets] = useTickets();
  const [notifications, setNotifications] = useNotifications();
  const [walletBal, setWalletBal] = useWalletBal();
  const [txns, setTxns] = useWalletTxns();
  const [tab, setTab] = useState('dashboard');
  const [custTickets, setCustTickets] = useState<any[]>(() => {
    try { const raw = localStorage.getItem('ss_tickets_v2'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [staffRecords, setStaffRecords] = useState<any[]>(() => lsGet('sd_staff', []));
  useEffect(() => {
    const refresh = () => setStaffRecords(lsGet('sd_staff', []));
    window.addEventListener('storage', refresh);
    window.addEventListener('nexago-local-write', refresh);
    const timer = setInterval(refresh, 2000);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('nexago-local-write', refresh); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      const rec = staffRecords.find((s: any) => s.id === session.user?.userId);
      if (!rec) return;
      const cardExp = rec.cardExpiresAt || rec.expiresAt;
      const blocked = (rec.status && rec.status !== 'Active') || rec.loginEnabled === false || (cardExp && Date.now() > Date.parse(cardExp));
      if (blocked) {
        localStorage.removeItem('sd_staff_security_session');
        localStorage.removeItem('sd_security_session');
        setSession(null);
      }
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, staffRecords]);

  const staffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = login.userId.trim();
    const rec = staffRecords.find((s: any) => String(s.id || '').trim().toLowerCase() === userId.toLowerCase());
    if (rec) {
      const cardExp = rec.cardExpiresAt || rec.expiresAt;
      if (cardExp && Date.now() > Date.parse(cardExp)) {
        setLoginError('Your staff ID card has expired. Super Admin renewal required.');
        securityAudit('staff-login-denied', { actor: userId, reason: 'staff ID card expired' });
        return;
      }
      if (rec.status && rec.status !== 'Active') {
        setLoginError(`Your account is ${rec.status}. Contact Super Admin.`);
        securityAudit('staff-login-denied', { actor: userId, reason: `staff status ${rec.status}` });
        return;
      }
      if (rec.loginEnabled === false) {
        setLoginError('Portal access is not enabled for this account.');
        securityAudit('staff-login-denied', { actor: userId, reason: 'staff portal access disabled' });
        return;
      }
    }
    securityApi('/login', { userId, password: login.password }).then((data) => {
      if (data.user?.role !== 'staff' && data.user?.role !== 'super-admin-staff' && data.user?.role !== 'super-admin') throw new Error('not staff');
      const next = { token: data.token, user: data.user, loggedAt: Date.now() };
      localStorage.setItem('sd_security_session', data.token);
      localStorage.setItem('sd_staff_security_session', JSON.stringify(next));
      setSession(next);
      setLoginError('');
      securityAudit('staff-login-success', { actor: userId, role: data.user?.role || 'staff', reason: 'staff portal login' });
    }).catch((err) => {
      setLoginError(String(err?.message || '') === 'CARD_EXPIRED' ? 'Your staff ID card has expired. Super Admin renewal required.' : 'Invalid Staff ID/email or password.');
      securityAudit('staff-login-failed', { actor: userId || 'unknown', reason: 'server rejected staff login' });
    });
  };

  const staffLogout = () => {
    localStorage.removeItem('sd_staff_security_session');
    localStorage.removeItem('sd_security_session');
    setSession(null);
    setLogin({ userId: '', password: '' });
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#070d16] text-gray-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.14),transparent_28%)]" />
        <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-[#1e3050] bg-[#0c1624] shadow-2xl">
          <div className="grid min-h-[560px] lg:grid-cols-[1fr_420px]">
            <div className="flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Staff Secure Access
                </div>
                <h1 className="mt-6 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl">Super Admin Staff Console</h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-gray-400">Real staff login for support tickets, order tools, notifications, reports and approved operational actions. Every action is audited with Staff ID.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[['Role', 'Staff permission'], ['Audit', 'Permanent logs'], ['Sync', 'Live operations']].map(([title, sub]) => (
                  <div key={title} className="rounded-xl border border-[#1e3050] bg-[#080e17] p-3">
                    <p className="text-[10px] font-black uppercase text-white">{title}</p>
                    <p className="mt-1 text-[9px] text-gray-500">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={staffLogin} className="flex flex-col justify-center border-t border-[#1e3050] bg-[#101d30] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Login Required</p>
                <h2 className="mt-2 text-xl font-black text-white">Staff Dashboard</h2>
                <p className="mt-1 text-[11px] text-gray-400">Enter approved Staff ID/email and password.</p>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">Staff ID / Email</span>
                  <input value={login.userId} onChange={e => setLogin(prev => ({ ...prev, userId: e.target.value }))} className="w-full rounded-xl border border-[#1e3050] bg-[#080e17] px-4 py-3 text-sm text-white outline-none focus:border-violet-400" placeholder="STF-... or email" autoComplete="username" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">Password</span>
                  <input value={login.password} onChange={e => setLogin(prev => ({ ...prev, password: e.target.value }))} className="w-full rounded-xl border border-[#1e3050] bg-[#080e17] px-4 py-3 text-sm text-white outline-none focus:border-violet-400" placeholder="Password" type="password" autoComplete="current-password" />
                </label>
                {loginError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-300">{loginError}</p>}
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-white shadow-lg transition-colors hover:bg-violet-500">
                  <Lock className="h-4 w-4" /> Open Staff Console
                </button>
              </div>
              <p className="mt-5 text-center text-[10px] text-gray-500">No temporary access. Super Admin must create a real staff account first.</p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const pending = txns.filter(t => t.status === 'Pending');
  const openTickets = tickets.filter(t => t.status === 'Open');
  const staffNotifs = notifications.filter(n => n.audience === 'all' || n.audience === 'staff' || n.audience === 'admin' || (!n.audience && !n.driverId && !n.customerId && !n.storeId));
  const unread = staffNotifs.filter(n => !n.read).length;
  const revenue = orders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);
  const byStatus = ['Completed', 'Pending', 'Confirmed', 'Processing', 'Cancelled'].map(st => ({ st, n: orders.filter(o => o.status === st).length }));
  const permissions = new Set<string>((session.user?.permissions || []).map((p: string) => String(p).toLowerCase()));
  const can = (permission: string) => session.user?.role === 'super-admin' || permissions.has(permission) || permissions.has('all');

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allow: true },
    { id: 'orders', label: 'Orders', icon: ClipboardList, badge: orders.filter(o => o.status === 'Pending').length, allow: can('orders') },
    { id: 'tools', label: 'Order Tools', icon: Wrench, badge: pending.length, allow: can('tools') || can('payouts') },
    { id: 'support', label: 'Support', icon: LifeBuoy, badge: openTickets.length + custTickets.length, allow: can('support') },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: unread, allow: can('notifications') },
    { id: 'reports', label: 'Reports', icon: BarChart3, allow: can('reports') },
  ].filter(item => item.allow);

  const goBack = () => { window.open(`${window.location.origin}/roles.html`, '_self'); };

  const updateStatus = (id: string, status: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: status as any } : o)));
    securityAudit('staff-order-status-changed', { actor: session.user?.userId || 'staff', role: session.user?.role || 'staff', storeId: orders.find(o => o.id === id)?.storeId || '', newValue: { orderId: id, status }, reason: 'staff updated order status' });
  };
  const approveTopUp = (tx: any, ok: boolean) => {
    const next = txns.map(t => (t.id === tx.id ? { ...t, status: ok ? 'Completed' : 'Rejected' } : t));
    setTxns(next);
    if (ok) setWalletBal(walletBal + tx.amount);
    securityAudit(ok ? 'staff-topup-approved' : 'staff-topup-rejected', { actor: session.user?.userId || 'staff', role: session.user?.role || 'staff', newValue: { txnId: tx.id, amount: tx.amount, status: ok ? 'Completed' : 'Rejected' }, reason: 'staff verified wallet top-up' });
  };
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    securityAudit('staff-notifications-read', { actor: session.user?.userId || 'staff', role: session.user?.role || 'staff', reason: 'staff marked notifications read' });
  };
  const closeTicket = (id: string) => {
    setTickets(prev => prev.map(t => (t.id === id ? { ...t, status: 'Closed' } : t)));
    securityAudit('staff-ticket-closed', { actor: session.user?.userId || 'staff', role: session.user?.role || 'staff', newValue: { ticketId: id }, reason: 'staff closed support ticket' });
  };
  const closeCustTicket = (id: string) => {
    setCustTickets(prev => prev.map(t => (t.id === id ? { ...t, status: 'Resolved' } : t)));
    securityAudit('staff-customer-ticket-resolved', { actor: session.user?.userId || 'staff', role: session.user?.role || 'staff', newValue: { ticketId: id }, reason: 'staff resolved customer ticket' });
  };
  const ownStaff = staffRecords.find((s: any) => s.id === session.user?.userId) || session.user || {};
  const ownCardHtml = () => `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111827;font-family:Arial}.card{width:85.6mm;height:54mm;box-sizing:border-box;border-radius:5mm;padding:5mm;color:white;background:linear-gradient(135deg,#07111f,#102138 60%,#f97316);position:relative;overflow:hidden}.brand{font-size:9px;font-weight:900;letter-spacing:2px}.logo{position:absolute;right:5mm;top:5mm;background:white;color:#0b1220;border-radius:3mm;padding:3mm;font-weight:900;font-size:10px}.main{position:absolute;left:5mm;right:5mm;bottom:9mm;display:flex;gap:4mm;align-items:end}.photo{width:18mm;height:24mm;border:1px solid rgba(255,255,255,.35);border-radius:3mm;background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:22px;font-weight:900}.name{font-size:13px;font-weight:900;text-transform:uppercase}.meta{font-size:7px;font-weight:700;color:#ffedd5;margin-top:1mm}.id{font-family:monospace;font-size:8px;font-weight:900;margin-top:1mm}.foot{position:absolute;left:5mm;right:5mm;bottom:3mm;border-top:1px solid rgba(255,255,255,.2);padding-top:1mm;display:flex;justify-content:space-between;font-size:6px;font-weight:700;color:rgba(255,255,255,.75)}@media print{body{background:white}@page{size:85.6mm 54mm;margin:0}}</style></head><body><div class="card"><div class="brand">THE NEXAGO BD</div><div style="font-size:7px;color:rgba(255,255,255,.75);font-weight:700">SUPER ADMIN STAFF</div><div class="logo">NXG</div><div class="main"><div class="photo">${String(ownStaff.name || 'S').slice(0,1).toUpperCase()}</div><div><div class="name">${ownStaff.name || ownStaff.userId || 'Staff'}</div><div class="meta">${ownStaff.role || 'Staff'} · ${ownStaff.shift || ''}</div><div class="id">${ownStaff.permanentNumber || ownStaff.id || ownStaff.userId}</div><div class="meta">Phone: ${ownStaff.phone || 'N/A'}</div></div></div><div class="foot"><span>THE NEXAGO BD</span><span>${ownStaff.status || 'Active'}</span><span>Official Staff ID</span></div></div></body></html>`;
  const downloadOwnCard = () => { const url = URL.createObjectURL(new Blob([ownCardHtml()], { type: 'text/html' })); const a = document.createElement('a'); a.href = url; a.download = `${ownStaff.permanentNumber || ownStaff.id || 'staff'}-id-card.html`; a.click(); URL.revokeObjectURL(url); };
  const printOwnCard = () => { const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f); f.contentDocument?.open(); f.contentDocument?.write(ownCardHtml()); f.contentDocument?.close(); setTimeout(() => { f.contentWindow?.print(); setTimeout(() => f.remove(), 1000); }, 250); };

  return (
    <PortalShell role="Admin Staff" tagline={`Super Admin Support · ${session.user?.userId || 'Staff'}`} nav={[...nav, { id: 'logout', label: 'Logout', icon: LogOut }]} active={tab} onNav={(id) => id === 'logout' ? staffLogout() : setTab(id)} onBack={goBack}>
      {tab === 'dashboard' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 bg-gradient-to-r from-violet-500/15 via-[#101d30] to-[#101d30] border border-violet-500/20 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-white text-xl">AS</div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">Support & Operations Team</p>
                <p className="text-lg font-black text-white">NexaGo Staff Console</p>
                <p className="text-[10px] text-gray-400">Super Admin Staff · {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
              </div>
            </div>
            <button onClick={() => setTab('support')} className="flex items-center space-x-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors">
              <LifeBuoy className="w-3.5 h-3.5" /><span>Open Queue ({openTickets.length + custTickets.length})</span>
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Open Tickets', value: (openTickets.length + custTickets.length).toString(), sub: 'needs attention', color: 'text-amber-400' },
              { label: 'Orders Today', value: orders.length.toString(), sub: `${orders.filter(o => o.status === 'Pending').length} pending`, color: 'text-white' },
              { label: 'Pending Top-Ups', value: pending.length.toString(), sub: 'verify wallet credits', color: 'text-brand-orange' },
              { label: 'Unread Alerts', value: unread.toString(), sub: 'notifications', color: 'text-sky-400' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-2xl font-black mt-1.5 ${k.color}`}>{k.value}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-orange-500/20 bg-[#101d30] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white">My Smart Staff ID Card</p>
                <p className="mt-1 font-mono text-[10px] font-bold text-brand-orange">{ownStaff.permanentNumber || ownStaff.id || session.user?.userId}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadOwnCard} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase text-emerald-300">Download</button>
                <button onClick={printOwnCard} className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-[10px] font-black uppercase text-sky-300">Print</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><Ticket className="w-3.5 h-3.5 text-brand-orange" /><span>Latest Tickets</span></p>
              {tickets.slice(0, 4).map(t => (
                <div key={t.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2 mb-2 text-[10px]">
                  <div className="min-w-0">
                    <p className="font-mono text-brand-orange font-bold">{t.id}</p>
                    <p className="text-gray-300 truncate">{t.subject}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black shrink-0 ${t.status === 'Open' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{t.status}</span>
                </div>
              ))}
              {tickets.length === 0 && <p className="text-[10px] text-gray-500 py-4 text-center">No tickets.</p>}
            </div>
            <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><TrendingUp className="w-3.5 h-3.5 text-brand-orange" /><span>Orders by Status</span></p>
              <div className="space-y-2">
                {byStatus.map(s => (
                  <div key={s.st} className="flex min-w-0 items-center gap-2 text-[10px]">
                    <span className="w-20 shrink-0 text-gray-400 sm:w-24">{s.st}</span>
                    <div className="flex-1 h-2.5 bg-[#0a1322] rounded-full overflow-hidden">
                      <div className={`h-full ${s.st === 'Completed' ? 'bg-emerald-500' : s.st === 'Cancelled' ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${orders.length ? (s.n / orders.length) * 100 : 0}%` }} />
                    </div>
                    <span className="text-gray-400 w-6 text-right font-mono">{s.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><ClipboardList className="w-4 h-4 text-brand-orange" /><span>Orders</span></h3>
            <p className="text-[10px] text-gray-400">Track & update order status across the network.</p>
          </div>
          {orders.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No orders found.</p> : (
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-mono text-brand-orange font-black">#{o.id}</p>
                      <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                    </div>
                    <span className="text-[11px] font-black font-mono text-white">{bdt(o.amount)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-2 text-[10px]">
                    <p className="text-gray-300"><b className="text-gray-200">{o.customerName}</b> · {o.customerPhone}</p>
                    <p className="text-gray-400 truncate">{o.storeName} · {o.paymentMethod}</p>
                    <p className="text-gray-500">{o.date}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                    {o.status !== 'Completed' && o.status !== 'Cancelled' && (
                      <>
                        <button onClick={() => updateStatus(o.id, 'Ongoing')} className="px-3 py-1.5 bg-sky-500/15 border border-sky-500/40 text-sky-300 rounded-lg text-[9px] font-black hover:bg-sky-500/25 transition-colors">Dispatch</button>
                        <button onClick={() => updateStatus(o.id, 'Completed')} className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors"><CheckCircle2 className="w-3 h-3" /><span>Complete</span></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tools' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><Wrench className="w-4 h-4 text-brand-orange" /><span>Order Tools</span></h3>
            <p className="text-[10px] text-gray-400">Verify wallet top-ups & review the ledger.</p>
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Pending Top-Ups ({pending.length})</p>
              <span className="text-[10px] text-emerald-400 font-black">Wallet: {bdt(walletBal)}</span>
            </div>
            {pending.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">Queue clear ✓</p> : (
              <div className="space-y-2">
                {pending.map(tx => (
                  <div key={tx.id} className="bg-[#0a1322] border border-amber-500/30 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] font-mono text-brand-orange font-bold">{tx.id}</p>
                      <p className="text-[9px] text-gray-400">{tx.sender} · {tx.method} · {tx.date}</p>
                    </div>
                    <span className="text-[12px] font-black text-emerald-400">+{bdt(tx.amount)}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => approveTopUp(tx, true)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors">✓ Verify</button>
                      <button onClick={() => approveTopUp(tx, false)} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-[9px] font-black transition-colors">✗ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Wallet Ledger</p>
            {txns.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">No wallet activity.</p> : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {txns.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-lg px-3 py-2 text-[10px]">
                    <p className="text-gray-300 truncate">{t.type} <span className="font-mono text-gray-500">{t.id}</span></p>
                    <span className={`font-mono font-black ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.amount >= 0 ? '+' : ''}{bdt(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><LifeBuoy className="w-4 h-4 text-brand-orange" /><span>Support Queue</span></h3>
            <p className="text-[10px] text-gray-400">Platform tickets + customer-raised tickets.</p>
          </div>
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-brand-orange font-bold">{t.id}</p>
                    <p className="text-[11px] font-bold text-white truncate">{t.subject}</p>
                    <p className="text-[9px] text-gray-500">{t.category} · {t.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg border text-[8px] font-black ${t.status === 'Open' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{t.status}</span>
                </div>
                {t.status !== 'Closed' && (
                  <div className="flex items-center justify-end mt-3">
                    <button onClick={() => closeTicket(t.id)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors">✓ Resolve</button>
                  </div>
                )}
              </div>
            ))}
            {custTickets.map(t => (
              <div key={t.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-brand-orange font-bold">{t.id} <span className="text-[8px] text-gray-500 ml-1">customer</span></p>
                    <p className="text-[11px] font-bold text-white truncate">{t.subject}</p>
                    <p className="text-[9px] text-gray-500">{t.category} · {t.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg border text-[8px] font-black ${t.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>{t.status}</span>
                </div>
                {t.status !== 'Resolved' && (
                  <div className="flex items-center justify-end mt-3">
                    <button onClick={() => closeCustTicket(t.id)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[9px] font-black transition-colors">✓ Resolve</button>
                  </div>
                )}
              </div>
            ))}
            {tickets.length + custTickets.length === 0 && <p className="text-center text-[10px] text-gray-500 py-10">Queue clear ✓</p>}
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2"><Bell className="w-4 h-4 text-brand-orange" /><span>Notifications</span></h3>
              <p className="text-[10px] text-gray-400">Platform alerts & announcements.</p>
            </div>
            <button onClick={markAllRead} className="px-3 py-2 bg-sky-500/15 border border-sky-500/40 text-sky-300 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-sky-500/25 transition-colors">Mark all read</button>
          </div>
          {staffNotifs.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No notifications.</p> : (
            <div className="space-y-2">
              {staffNotifs.map(n => (
                <div key={n.id} className={`bg-[#101d30] border rounded-2xl p-4 ${n.read ? 'border-[#1e3050] opacity-70' : 'border-sky-500/40'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white">{n.title} {!n.read && <span className="ml-1 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[8px] font-black">NEW</span>}</p>
                      <p className="text-[9px] text-gray-400 mt-1">{n.message}</p>
                      <p className="text-[8px] text-gray-600 mt-1">{n.date || '—'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black shrink-0 ${n.type === 'system' ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' : n.type === 'order' ? 'bg-brand-orange/20 text-brand-orange border-brand-orange/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{n.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2"><BarChart3 className="w-4 h-4 text-brand-orange" /><span>Reports</span></h3>
            <p className="text-[10px] text-gray-400">Platform performance at a glance.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Orders', value: orders.length.toString(), color: 'text-white' },
              { label: 'Completed', value: orders.filter(o => o.status === 'Completed').length.toString(), color: 'text-emerald-400' },
              { label: 'Cancelled', value: orders.filter(o => o.status === 'Cancelled').length.toString(), color: 'text-red-400' },
              { label: 'Revenue', value: bdt(revenue), color: 'text-brand-orange' },
            ].map(k => (
              <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Order Mix</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {byStatus.map(s => (
                <div key={s.st} className="flex min-w-0 items-center gap-2 text-[10px]">
                  <span className="w-20 shrink-0 text-gray-400 sm:w-24">{s.st}</span>
                  <div className="flex-1 h-2 bg-[#0a1322] rounded-full overflow-hidden"><div className={`h-full ${s.st === 'Completed' ? 'bg-emerald-500' : s.st === 'Cancelled' ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${orders.length ? (s.n / orders.length) * 100 : 0}%` }} /></div>
                  <span className="text-gray-400 w-6 text-right font-mono">{s.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

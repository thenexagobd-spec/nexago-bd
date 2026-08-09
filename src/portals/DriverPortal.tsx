/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver Site — a full driver portal that mirrors the simulator's Driver App:
 * signup/onboarding (login → signup → docs → pending → forgot password),
 * online duty toggle, new-order offers with accept/reject + countdown,
 * live in-progress delivery flow (arrive store → pickup proof → deliver →
 * delivery proof), order completed, history with filters + report, wallet &
 * earnings, inbox, support, settings, terms, profile and dispatch chat.
 * Data is shared via localStorage with the admin panel and store site.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard, Package, Wallet, User, MessageSquare, BarChart3, Phone, Navigation,
  CheckCircle2, Star, LogIn, Power, Send, RefreshCw, MapPin, FileText, AlertCircle,
    History, Inbox, Headphones, Settings, ShieldCheck, LogOut, ChevronRight, Copy, Eye, Truck,
    X, Bell, Clock
  } from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, useDrivers, useWalletTxns, useTickets, useNotifications, bdt, todayStr, statusBadge, lsGet, lsSet, appendTimeline, makeNotif } from './portalUtils';

type AuthView = 'login' | 'signup' | 'docs' | 'pending' | 'forgot' | 'terms' | 'dashboard';

export default function DriverPortal() {
  const [orders, setOrders] = useOrders();
  const [drivers, setDrivers] = useDrivers();
  const [txns] = useWalletTxns();
  const [tickets, setTickets] = useTickets();
  const [notifications, setNotifications] = useNotifications();
  const me = drivers[0];
  const [tab, setTab] = useState('dashboard');
  const [authView, setAuthView] = useState<AuthView>('dashboard');
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketTopic, setTicketTopic] = useState('Payout / Earnings');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [ticketDesc, setTicketDesc] = useState('');
  const [chat, setChat] = useState<{ from: string; msg: string; time: string }[]>([
    { from: 'Dispatch', msg: 'Rahim, 3 deliveries assigned near Dhanmondi. Please start.', time: '9:12 AM' },
  ]);
  const [chatMsg, setChatMsg] = useState('');
  const [online, setOnline] = useState<boolean>(me?.status !== 'Offline');
  const [autoAccept, setAutoAccept] = useState<boolean>(lsGet('sd_driver_autoaccept', false));
  const [notifOn, setNotifOn] = useState<boolean>(true);
  const [expandedTerm, setExpandedTerm] = useState<string | null>('t1');
  const [historyTab, setHistoryTab] = useState<'all' | 'completed' | 'cancelled' | 'ongoing'>('all');
  const [customerRating, setCustomerRating] = useState<Record<string, number>>({});
  const [reportOpen, setReportOpen] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('Customer unreachable');
  const [reportDesc, setReportDesc] = useState('');
  const [now, setNow] = useState(Date.now());

  // Auth form state
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(lsGet('sd_driver_remember', true));
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupVehicle, setSignupVehicle] = useState('Motorcycle (150cc)');
  const [signupPass, setSignupPass] = useState('');
  const [termsChecked, setTermsChecked] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [pickupProofName, setPickupProofName] = useState<string | null>(null);
  const [deliveryProofName, setDeliveryProofName] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [codSettled, setCodSettled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    setOnline(me?.status !== 'Offline');
  }, [me?.status]);

  // Seed a welcome notification for this driver once
  useEffect(() => {
    if (!me) return;
    if (!notifications.some(n => n.driverId === me.id && n.title.includes('Welcome'))) {
      setNotifications(prev => [
        {
          id: `NOTIF-${me.id}-welcome`,
          title: '👋 Welcome to The NexaGo BD Driver!',
          message: `${me.name}, your driver app is live. New order requests and admin updates will arrive here.`,
          type: 'system',
          time: 'Just Now',
          read: false,
          audience: 'driver',
          driverId: me.id,
        },
        ...prev,
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  useEffect(() => lsSet('sd_driver_autoaccept', autoAccept), [autoAccept]);
  useEffect(() => lsSet('sd_driver_remember', rememberMe), [rememberMe]);

  // Ticking clock for offer countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const myOrders = useMemo(
    () => orders.filter(o => o.driverId === me?.id || o.driverId === me?.name || o.driverId === `DRV-${me?.id?.slice(-4)}`),
    [orders, me]
  );

  const offers = myOrders.filter(o => o.status === 'Confirmed' && !o.pickedUp);
  const active = myOrders.filter(o => o.status === 'Processing' || o.status === 'Ongoing');
  const activeOrder = active[0];
  const done = myOrders.filter(o => o.status === 'Completed');
  const cancelled = myOrders.filter(o => o.status === 'Cancelled');
  const earned = done.reduce((s, o) => s + (o.deliveryCharge || 60), 0) + done.length * 20;

  const myNotifs = notifications.filter(n => n.driverId === me?.id || (!n.driverId && n.audience === 'driver') || n.audience === 'all');
  const unreadCount = myNotifs.filter(n => !n.read).length;

  // Auto-accept offers when enabled
  useEffect(() => {
    if (autoAccept && online && offers.length && !activeOrder) {
      const first = offers[0];
      const t = setTimeout(() => acceptOffer(first.id), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers.length, activeOrder, autoAccept, online]);

  // Auto-generate driver-relevant notifications from real events
  const notifiedRef = useRef<Set<string>>(new Set());
  const pushNotif = (title: string, message: string, type: 'order' | 'system' | 'driver' | 'payment' = 'system', key: string) => {
    if (!me) return;
    if (notifiedRef.current.has(key)) return;
    notifiedRef.current.add(key);
    const now = new Date();
    setNotifications(prev => [
      {
        id: `NOTIF-${Date.now().toString().slice(-4)}-${key.slice(0, 6)}`,
        title,
        message,
        type,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        audience: 'driver',
        driverId: me.id,
      },
      ...prev,
    ]);
  };
  useEffect(() => {
    if (offers.length && online) {
      const o = offers[0];
      pushNotif('🔔 New Order Request', `Order #${o.id} from ${o.storeName} — ${bdt(o.amount)}. Accept within 1 minute.`, 'order', `offer-${o.id}`);
    }
  }, [offers, online]);
  useEffect(() => {
    const ready = myOrders.find(o => o.status === 'Processing' && o.storeReady && !o.pickedUp);
    if (ready) pushNotif('📦 Order Ready for Pickup', `Store ${ready.storeName} marked order #${ready.id} ready — pick it up.`, 'order', `ready-${ready.id}`);
  }, [myOrders]);
  useEffect(() => {
    const latest = myOrders.find(o => o.status === 'Completed');
    if (latest && latest.deliveryProof) pushNotif('✅ Delivery Completed', `Order #${latest.id} delivered — ${bdt(latest.deliveryCharge || 60)} added to earnings.`, 'payment', `done-${latest.id}`);
  }, [myOrders]);

  const toggleDuty = () => {
    if (!me) return;
    if (online && activeOrder) return;
    const next = online ? 'Offline' : 'Online';
    setOnline(!online);
    setDrivers(prev => prev.map(d => (d.id === me.id ? { ...d, status: next as any } : d)));
  };

  const acceptOffer = (id: string) => {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    setOrders(prev => prev.map(x => (x.id === id ? { ...x, status: 'Processing' as any, driverStage: 'to_store' } : x)));
    if (me) setDrivers(prev => prev.map(d => (d.id === me.id ? { ...d, status: 'On-Delivery' as any } : d)));
    setPickupProofName(null);
    setDeliveryProofName(null);
  };

  const rejectOffer = (id: string) => {
    setOrders(prev => prev.map(x => (x.id === id ? { ...x, status: 'Cancelled' as any } : x)));
  };

  const updateStage = (id: string, stage: string, extra: Partial<typeof orders[0]> = {}) => {
    setOrders(prev => prev.map(x => (x.id === id ? appendTimeline({ ...x, driverStage: stage, ...extra }, stage, 'driver') : x)));
    const ord = orders.find(x => x.id === id);
    if (ord) {
      const notifs: any[] = [];
      if (stage === 'to_customer') notifs.push(makeNotif('📦 Order Picked Up — #' + id, `Your order is on the way. ${ord.storeName} handed it to ${me?.name || 'the rider'}.`, 'order', { audience: 'customer', customerId: ord.customerId || ord.customerPhone }));
      if (stage === 'at_customer') notifs.push(makeNotif('🛵 Rider Arrived — #' + id, `${me?.name || 'Your rider'} has arrived at your address.`, 'order', { audience: 'customer', customerId: ord.customerId || ord.customerPhone }));
      if (notifs.length) setNotifications(prev => [...notifs, ...prev]);
    }
  };

  const handleArriveStore = () => {
    if (!activeOrder) return;
    updateStage(activeOrder.id, activeOrder.storeReady ? 'ready_for_pickup' : 'waiting_store');
  };

  const handlePickupConfirmed = () => {
    if (!activeOrder) return;
    if (!pickupProofName) return;
    updateStage(activeOrder.id, 'to_customer', { status: 'Ongoing' as any, pickedUp: true, pickupProof: pickupProofName });
  };

  const handleArrived = () => {
    if (!activeOrder) return;
    updateStage(activeOrder.id, 'at_customer');
  };

  const handleCustomerUnreachable = () => {
    if (!activeOrder) return;
    updateStage(activeOrder.id, 'customer_reported');
  };

  const handleDeliveryProofSubmitted = () => {
    if (!activeOrder) return;
    if (!deliveryProofName) return;
    // Delivery PIN verification — if the order carries a PIN, the driver must enter it
    if (activeOrder.deliveryPin && pinInput.trim() !== activeOrder.deliveryPin) {
      showToast('Delivery PIN incorrect — enter the PIN the customer shared.');
      return;
    }
    setOrders(prev => prev.map(x => (x.id === activeOrder.id ? appendTimeline({ ...x, status: 'Completed' as any, driverStage: 'delivered', deliveryProof: deliveryProofName, codSettled: codSettled || undefined }, 'delivered', 'driver', 'Delivery completed') : x)));
    if (me) {
      const fee = activeOrder.deliveryCharge || 60;
      setDrivers(prev => prev.map(d => (d.id === me.id ? { ...d, status: 'Online' as any, completedOrders: (d.completedOrders || 0) + 1, earnings: (d.earnings || 0) + fee } : d)));
    }
    setPickupProofName(null);
    setDeliveryProofName(null);
    setPinInput('');
    setCodSettled(false);
    setNotifications(prev => [
      makeNotif('✅ Delivered — #' + activeOrder.id, `Your order was delivered by ${me?.name || 'the rider'}. Enjoy!`, 'order', { audience: 'customer', customerId: activeOrder.customerId || activeOrder.customerPhone }),
      ...prev,
    ]);
  };

  const copyOrderNo = (id: string) => {
    try { navigator.clipboard?.writeText(id); } catch { /* ignore */ }
  };

  const submitReport = () => {
    if (!reportOpen) return;
    setReportOpen(null);
    setReportDesc('');
  };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    setChat(prev => [...prev, { from: 'You', msg: chatMsg.trim(), time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }]);
    setChatMsg('');
  };

  const submitTicket = () => {
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;
    const now = new Date();
    const newTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      user: `${me?.name || 'Rahim Khan'} (Driver)`,
      subject: `[${ticketTopic}] ${ticketSubject.trim()}`,
      priority: ticketPriority as 'Low' | 'Medium' | 'High',
      status: 'Open' as const,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      messages: [{ sender: 'user' as const, text: ticketDesc.trim(), time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
    };
    setTickets(prev => [newTicket, ...prev]);
    setTicketOpen(false);
    setTicketSubject('');
    setTicketDesc('');
  };

  const goBack = () => { window.open(`${window.location.origin}/roles.html`, '_self'); };

  const moneyBars = [3800, 2900, 4100, 2200, 5100, 3400, 2600];

  const driverStep = (o = activeOrder): number => {
    if (!o) return 0;
    if (o.status === 'Completed') return 6;
    if (o.driverStage === 'at_customer' || o.driverStage === 'customer_reported') return 5;
    if (o.pickedUp || o.driverStage === 'to_customer') return 4;
    if (o.storeReady) return 3;
    if (o.driverStage === 'waiting_store' || o.driverStage === 'ready_for_pickup') return 2;
    return 1;
  };

  const stageLabel = (o: OrderLike = activeOrder): string => {
    if (!o) return '';
    if (o.status === 'Completed') return 'Delivered';
    if (o.driverStage === 'customer_reported') return 'Customer Report Open';
    if (o.driverStage === 'at_customer') return 'At Customer Location';
    if (o.driverStage === 'to_customer') return 'On The Way to Customer';
    if (o.driverStage === 'ready_for_pickup') return 'Order Ready for Pickup';
    if (o.driverStage === 'waiting_store') return 'Waiting at Store';
    if (o.driverStage === 'to_store') return 'Navigate to Store';
    return 'New Order';
  };

  // When an offer expires (1 min window), auto-cancel it
  useEffect(() => {
    offers.forEach(o => {
      if (o.driverDeadline && now > o.driverDeadline) rejectOffer(o.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, offers.length]);

  const authNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'offers', label: 'New Orders', icon: Bell, badge: offers.length },
    { id: 'active', label: 'Active Delivery', icon: Package, badge: activeOrder ? 1 : 0 },
    { id: 'deliveries', label: 'Deliveries', icon: History },
    { id: 'earnings', label: 'Earnings', icon: Wallet },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: unreadCount },
    { id: 'support', label: 'Support', icon: Headphones },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: 1 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'register', label: 'Register', icon: Truck },
  ];

  const registerNav = authNav.filter(n => n.id !== 'register');
  const nav = authView === 'dashboard' ? authNav : registerNav;

  return (
    <PortalShell
      role="Driver Site"
      tagline={`${me?.name || 'Rahim Khan'} · ${me?.id || 'DRV-1001'}`}
      nav={nav}
      active={authView === 'dashboard' ? tab : authView}
      onNav={id => {
        if (authView !== 'dashboard' && (id === 'login' || id === 'signup' || id === 'docs' || id === 'pending' || id === 'forgot' || id === 'terms')) return;
        if (id === 'login' || id === 'signup' || id === 'docs' || id === 'pending' || id === 'forgot' || id === 'terms') {
          setAuthView(id as AuthView);
          return;
        }
        setAuthView('dashboard');
        setTab(id);
      }}
      onBack={goBack}
    >
      {/* ============ AUTH / ONBOARDING SCREENS ============ */}
      {authView !== 'dashboard' && (
        <div className="max-w-lg mx-auto space-y-4 fade-in">
          {/* ---- LOGIN ---- */}
          {authView === 'login' && (
            <>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center mx-auto text-3xl font-bold shadow-xl">
                  <Truck className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-white tracking-wide">The NexaGo BD Driver</h4>
                <p className="text-[10px] text-gray-400">Enter credentials to access dispatch portal</p>
              </div>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[8px] text-gray-400 uppercase block font-black">Driver Phone or ID</label>
                  <input value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="e.g. DRV123456"
                    className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[11px] font-mono outline-none focus:border-brand-orange text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-gray-400 uppercase block font-black">Password</label>
                  <div className="flex items-center gap-2 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2">
                    <input type={showPassword ? 'text' : 'password'} value={loginPass} onChange={e => setLoginPass(e.target.value)}
                      placeholder="••••••••" className="flex-1 bg-transparent text-[11px] font-mono outline-none text-white" />
                    <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-white cursor-pointer">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-gray-300">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-white/20 text-brand-orange focus:ring-0" />
                    <span>Remember Me</span>
                  </label>
                  <button onClick={() => setAuthView('forgot')} className="text-brand-orange hover:underline font-bold">Forgot Password?</button>
                </div>
              </div>
              <button onClick={() => setAuthView('dashboard')} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-black uppercase rounded-xl shadow-lg transition-all">
                Login to Portal
              </button>
              <button onClick={() => setAuthView('signup')} className="w-full py-2 bg-[#101d30] border border-[#1e3050] hover:bg-[#132238] text-gray-300 hover:text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer">
                Register New Driver →
              </button>
            </>
          )}

          {/* ---- SIGNUP (Step 1) ---- */}
          {authView === 'signup' && (
            <>
              <div className="flex items-center justify-between border-b border-[#1e3050] pb-2">
                <button onClick={() => setAuthView('login')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                <h4 className="text-xs font-bold text-white">Driver Registration</h4>
                <span className="text-[9px] text-brand-orange font-bold">Step 1 of 2</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Full Name (Bangla/English)', val: signupName, set: setSignupName, type: 'text' },
                  { label: 'Mobile Phone (+880)', val: signupPhone, set: setSignupPhone, type: 'tel' },
                ].map(f => (
                  <div key={f.label} className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                    <label className="text-[7.5px] text-gray-400 uppercase block font-bold">{f.label}</label>
                    <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full mt-1" />
                  </div>
                ))}
                <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                  <label className="text-[7.5px] text-gray-400 uppercase block font-bold">Vehicle Type</label>
                  <select value={signupVehicle} onChange={e => setSignupVehicle(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full mt-1 cursor-pointer">
                    {['Motorcycle (150cc)', 'Electric Scooter / EV', 'Bicycle Courier', 'Covered Van / Car'].map(v => (
                      <option key={v} value={v} className="bg-[#101d30]">{v}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                  <label className="text-[7.5px] text-gray-400 uppercase block font-bold">Create Password</label>
                  <input type="password" value={signupPass} onChange={e => setSignupPass(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full mt-1" />
                </div>
                <label className="flex items-center space-x-1.5 text-[9px] text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)} className="rounded border-white/20 text-brand-orange" />
                  <span>I agree to the <button onClick={() => setAuthView('terms')} className="text-brand-orange underline">Terms & Safety Guidelines</button></span>
                </label>
              </div>
              <button onClick={() => setAuthView('docs')} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-black uppercase rounded-xl shadow-lg mt-3">
                Continue to Document Upload →
              </button>
            </>
          )}

          {/* ---- DOCS (Step 2) ---- */}
          {authView === 'docs' && (
            <>
              <div className="flex items-center justify-between border-b border-[#1e3050] pb-2">
                <button onClick={() => setAuthView('signup')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                <h4 className="text-xs font-bold text-white">Document Verification</h4>
                <span className="text-[9px] text-brand-orange font-bold">Step 2 of 2</span>
              </div>
              <p className="text-[10px] text-gray-400">Upload clear photos of your official documents for dispatch approval.</p>
              <div className="space-y-2">
                {[
                  { key: 'license', label: 'Driving License (Front & Back)', required: true },
                  { key: 'nid', label: 'National ID (NID) Smart Card', required: true },
                  { key: 'registration', label: 'Vehicle Registration Certificate', required: true },
                  { key: 'insurance', label: 'Tax Token & Insurance Policy', required: false },
                  { key: 'photo', label: 'Profile Photo / Selfie with Vehicle', required: true },
                ].map(docItem => (
                  <div key={docItem.key} className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-white font-bold">{docItem.label}</p>
                      <p className="text-[8px] text-gray-400">{uploadedDocs[docItem.key] || (docItem.required ? 'Required' : 'Optional')}</p>
                    </div>
                    <button
                      onClick={() => setUploadedDocs(prev => ({ ...prev, [docItem.key]: `${docItem.label.split(' ')[0]}.jpg` }))}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition-all border ${uploadedDocs[docItem.key] ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-brand-orange/10 text-brand-orange border-brand-orange/30 hover:bg-brand-orange hover:text-white'}`}
                    >
                      {uploadedDocs[docItem.key] ? '✓ Uploaded' : 'Upload File'}
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => { setAuthView('pending'); }} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl shadow-lg mt-3">
                Submit Application for Approval
              </button>
            </>
          )}

          {/* ---- PENDING ---- */}
          {authView === 'pending' && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Application Under Review</h4>
                <p className="text-[10px] text-gray-400 mt-1 max-w-[260px] mx-auto">
                  Our dispatch team is verifying your Driving License & NID details. Estimated time: 2 - 4 hours.
                </p>
              </div>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3 text-left text-[10px] space-y-1.5 w-full">
                <div className="flex justify-between"><span className="text-gray-400">Driver ID:</span><span className="text-white font-mono font-bold">DRV1001-NEW</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Submitted:</span><span className="text-white">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Verification Status:</span><span className="text-amber-400 font-bold">Pending Review</span></div>
              </div>
              <button onClick={() => setAuthView('dashboard')} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-black uppercase rounded-xl shadow-lg">
                Bypass / Enter Demo Dashboard →
              </button>
            </div>
          )}

          {/* ---- FORGOT PASSWORD ---- */}
          {authView === 'forgot' && (
            <>
              <div className="flex items-center justify-between border-b border-[#1e3050] pb-2">
                <button onClick={() => setAuthView('login')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                <h4 className="text-xs font-bold text-white">Reset Driver Password</h4>
                <span className="w-4" />
              </div>
              <p className="text-[10px] text-gray-400">Enter your registered mobile phone number to receive a 6-digit OTP verification code.</p>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                <label className="text-[8px] text-gray-400 uppercase block font-black">Registered Phone Number</label>
                <input type="tel" defaultValue="+880 1234-567890" className="bg-transparent text-xs text-white font-mono outline-none w-full mt-1" />
              </div>
              <button onClick={() => setAuthView('login')} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-black uppercase rounded-xl">
                Send OTP Verification Code
              </button>
            </>
          )}

          {/* ---- TERMS ---- */}
          {authView === 'terms' && (
            <>
              <div className="flex items-center justify-between border-b border-[#1e3050] pb-2">
                <button onClick={() => setAuthView('signup')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                <h4 className="text-xs font-bold text-white">Terms & Safety Guidelines</h4>
                <span className="w-4" />
              </div>
              <div className="space-y-2 text-[10px] text-gray-300">
                {[
                  { id: 't1', title: '1. Courier Safety & Helmet Rule', desc: 'All riders must wear a certified helmet and follow traffic regulations across Dhaka city.' },
                  { id: 't2', title: '2. Payout & Commission Rates', desc: 'Standard commission is 15% per fulfilled delivery. Weekly settlement happens every Sunday.' },
                  { id: 't3', title: '3. Order Cancellation Policy', desc: 'Unauthorized order cancellation will lead to temporary account freeze.' },
                ].map(term => (
                  <div key={term.id} className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                    <button onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)} className="w-full text-left flex justify-between items-center font-bold text-white cursor-pointer">
                      <span>{term.title}</span>
                      <span className="text-brand-orange">{expandedTerm === term.id ? '−' : '+'}</span>
                    </button>
                    {expandedTerm === term.id && <p className="text-gray-400 text-[9px] mt-1.5 pt-1.5 border-t border-white/5">{term.desc}</p>}
                  </div>
                ))}
              </div>
              <button onClick={() => { setTermsChecked(true); setAuthView('signup'); }} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-black uppercase rounded-xl mt-3">
                I Accept Terms
              </button>
            </>
          )}
        </div>
      )}

      {/* ============ MAIN PORTAL ============ */}
      {authView === 'dashboard' && (
        <>
          {tab === 'dashboard' && (
            <div className="space-y-5">
              {/* Hero */}
              <div className="rounded-2xl p-5 bg-gradient-to-r from-brand-orange/20 via-[#101d30] to-[#101d30] border border-brand-orange/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  {me?.photo ? <img src={me.photo} alt={me.name} className="w-14 h-14 rounded-2xl object-cover border border-brand-orange/40" /> : <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-xl">RK</div>}
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},</p>
                    <p className="text-lg font-black text-white">{me?.name || 'Rahim Khan'}</p>
                    <p className="text-[10px] text-gray-400">{me?.id || 'DRV-1001'} · {me?.vehicleType || 'Bike'} · Dhanmondi Zone</p>
                  </div>
                </div>
                <button onClick={toggleDuty} className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-colors ${online ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-gray-500/20 border-gray-500/40 text-gray-300'}`}>
                  <Power className="w-3.5 h-3.5" /><span>{online ? (activeOrder ? 'On-Delivery' : 'Online') : 'Offline'}</span>
                </button>
              </div>

              {/* Duty status banner */}
              {!online ? (
                <div className="rounded-2xl p-6 bg-[#101d30] border border-[#1e3050] text-center space-y-3">
                  <p className="text-[11px] font-black text-red-400 uppercase tracking-wide">You're Offline</p>
                  <p className="text-[11px] text-gray-400">To receive orders, go online by tapping <b className="text-white">Start Working</b></p>
                  <button onClick={toggleDuty} className="w-full max-w-xs mx-auto py-3 bg-brand-orange hover:bg-brand-orange-hover text-white text-[11px] font-black uppercase rounded-2xl cursor-pointer shadow-lg">
                    Start Working
                  </button>
                </div>
              ) : (
                <>
                  {/* Active delivery card */}
                  {activeOrder && (
                    <div className="bg-[#101d30] border border-brand-orange/40 rounded-2xl p-4 space-y-2.5 shadow-md">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-brand-orange font-black uppercase tracking-wider">Active Delivery</p>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm font-black text-white font-mono tracking-wider">#{activeOrder.id}</span>
                          <button onClick={() => copyOrderNo(activeOrder.id)} className="p-1 bg-[#0a1322] border border-[#1e3050] rounded-md cursor-pointer hover:bg-[#132238]"><Copy className="w-3 h-3 text-brand-orange" /></button>
                        </div>
                      </div>
                      <p className="text-[11px] font-black text-white truncate">{activeOrder.storeName}</p>
                      <div className="flex items-center justify-between text-[9px] text-gray-400">
                        <span>To Restaurant: <b className="text-white">{activeOrder.pickupLocation || activeOrder.address || '—'}</b></span>
                        <span>To Customer: <b className="text-white">{activeOrder.address || '—'}</b></span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-gray-400">
                        <span>Stage: <b className="text-brand-orange">{stageLabel(activeOrder)}</b></span>
                        <span>Payment: <b className="text-white">{activeOrder.paymentMethod}</b></span>
                      </div>
                      <button onClick={() => setTab('active')} className="w-full py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-black uppercase rounded-xl cursor-pointer">
                        Continue Delivery
                      </button>
                    </div>
                  )}

                  {/* Refresh ring when idle */}
                  {!activeOrder && (
                    <div className="flex flex-col items-center justify-center py-6">
                      <button onClick={() => setTab('offers')} className="relative w-14 h-14 rounded-full bg-[#101d30] border border-brand-orange/40 flex items-center justify-center cursor-pointer group" title="Check for new orders">
                        <span className="absolute inset-0 rounded-full border-2 border-dashed border-brand-orange/50"></span>
                        <RefreshCw className="w-6 h-6 text-brand-orange animate-spin" />
                      </button>
                      <p className="text-[9px] text-gray-500 font-bold uppercase mt-2 tracking-wide">{offers.length ? `${offers.length} new order${offers.length > 1 ? 's' : ''} available` : 'Tap to check for new orders'}</p>
                    </div>
                  )}

                  {/* Next delivery + recent */}
                </>
              )}
            </div>
          )}

          {/* ============ NEW ORDERS (OFFERS) ============ */}
          {tab === 'offers' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><Bell className="w-4 h-4 text-brand-orange" /><span>New Orders</span></h3>
                <p className="text-[10px] text-gray-400">Store accepted these orders and dispatched them to you — accept within 1 minute or it auto-cancels.</p>
              </div>
              {!online ? (
                <div className="rounded-2xl p-6 bg-[#101d30] border border-[#1e3050] text-center">
                  <p className="text-[11px] font-black text-red-400 uppercase">You're Offline</p>
                  <p className="text-[10px] text-gray-400 mt-1">Go online to receive order requests.</p>
                  <button onClick={toggleDuty} className="mt-3 px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-black uppercase rounded-xl">Start Working</button>
                </div>
              ) : offers.length === 0 ? (
                <div className="rounded-2xl p-8 bg-[#101d30] border border-[#1e3050] text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-[11px] text-white font-bold">No new orders right now</p>
                  <p className="text-[10px] text-gray-400">New dispatched orders will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {offers.map(o => {
                    const remaining = o.driverDeadline ? Math.max(0, Math.round((o.driverDeadline - now) / 1000)) : 60;
                    return (
                      <div key={o.id} className="bg-[#101d30] border border-brand-orange/30 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <p className="text-[12px] font-mono text-brand-orange font-black">#{o.id}</p>
                            <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {autoAccept && <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300">Auto-accept ON</span>}
                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${remaining <= 10 ? 'bg-red-500/15 text-red-400' : 'bg-brand-orange/15 text-brand-orange'}`}>{remaining}s left</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] gap-3">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-bold shrink-0">🍴</div>
                            <div className="min-w-0">
                              <p className="text-gray-400 text-[8px] uppercase font-bold">Restaurant</p>
                              <p className="text-white font-bold truncate">{o.storeName}</p>
                              <p className="text-gray-400 text-[8px] truncate">{o.pickupLocation || '—'}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">👤</div>
                            <div className="min-w-0">
                              <p className="text-gray-400 text-[8px] uppercase font-bold">Customer</p>
                              <p className="text-white font-bold truncate">{o.customerName}</p>
                              <p className="text-gray-400 text-[8px] truncate">{o.address || '—'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 text-center text-[9px]">
                          <div className="bg-[#0a1322] p-2 rounded-lg border border-[#1e3050]"><p className="text-gray-400">Total Distance</p><p className="text-white font-bold mt-0.5">{o.pickupLocation && o.address ? '~4.2 km' : '—'}</p></div>
                          <div className="bg-[#0a1322] p-2 rounded-lg border border-[#1e3050]"><p className="text-gray-400">Est. Time</p><p className="text-brand-orange font-bold mt-0.5">~23 min</p></div>
                          <div className="bg-[#0a1322] p-2 rounded-lg border border-[#1e3050]"><p className="text-gray-400">Delivery Fee</p><p className="text-emerald-400 font-bold mt-0.5">{bdt(o.deliveryCharge || 60)}</p></div>
                          <div className="bg-[#0a1322] p-2 rounded-lg border border-[#1e3050]"><p className="text-gray-400">Total Payable</p><p className="text-white font-bold mt-0.5">{bdt(o.amount)}</p></div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => rejectOffer(o.id)} className="py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 text-[10px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center space-x-1">
                            <X className="w-3.5 h-3.5" /><span>Reject</span>
                          </button>
                          <button onClick={() => acceptOffer(o.id)} className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center space-x-1 animate-pulse">
                            <CheckCircle2 className="w-3.5 h-3.5" /><span>Accept</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============ ACTIVE DELIVERY (PROGRESS FLOW) ============ */}
          {tab === 'active' && (
            <div className="space-y-3">
              {!activeOrder ? (
                <div className="rounded-2xl p-8 bg-[#101d30] border border-[#1e3050] text-center space-y-2">
                  <Package className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-[11px] text-white font-bold">No active delivery</p>
                  <p className="text-[10px] text-gray-400">Accept a new order to start delivering.</p>
                  <button onClick={() => setTab('offers')} className="mt-2 px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-black uppercase rounded-xl">View New Orders</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-[#1e3050] pb-2">
                    <h3 className="text-sm font-black text-white flex items-center space-x-2"><Navigation className="w-4 h-4 text-brand-orange" /><span>Order In Progress</span></h3>
                    <button onClick={() => setTab('chat')} className="flex items-center space-x-1 text-[10px] text-sky-300 hover:underline">
                      <MessageSquare className="w-3 h-3" /><span>Chat</span>
                    </button>
                  </div>

                  {/* Trip summary */}
                  <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-2 shadow-lg">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Delivery Summary</p>
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] text-gray-400 font-bold uppercase">Restaurant</span><span className="text-[10px] font-black text-white truncate">{activeOrder.storeName}</span></div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Order No.</span>
                      <span className="flex items-center space-x-1.5"><span className="text-sm font-black text-brand-orange font-mono tracking-wider">#{activeOrder.id}</span>
                        <button onClick={() => copyOrderNo(activeOrder.id)} className="p-1 bg-[#0a1322] border border-[#1e3050] rounded-md cursor-pointer hover:bg-[#132238]"><Copy className="w-3 h-3 text-brand-orange" /></button>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] text-gray-400 font-bold uppercase">To Restaurant</span><span className="text-[10px] font-black text-white">{activeOrder.pickupLocation || activeOrder.address || '—'}</span></div>
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] text-gray-400 font-bold uppercase">To Customer</span><span className="text-[10px] font-black text-white">{activeOrder.address || '—'}</span></div>
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] text-gray-400 font-bold uppercase">Total Distance</span><span className="text-[10px] font-black text-emerald-400">~4.2 km</span></div>
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] text-gray-400 font-bold uppercase">Payment</span>
                      {/cash|cod/i.test(activeOrder.paymentMethod || '') ? <span className="text-[10px] font-black text-emerald-400">Cash · {bdt(activeOrder.codAmount || activeOrder.amount)}</span> : <span className="text-[10px] font-black text-sky-400">Prepaid · {bdt(activeOrder.amount)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] text-gray-400 font-bold uppercase">Current Stage</span><span className="text-[10px] font-black text-brand-orange">{stageLabel(activeOrder)}</span></div>
                  </div>

                  {/* Step timeline */}
                  <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Delivery Progress</p>
                      <span className="px-2 py-0.5 rounded-lg bg-brand-orange/15 text-brand-orange text-[8px] font-black">{driverStep(activeOrder) >= 6 ? 'Completed' : 'Live'}</span>
                    </div>
                    {[
                      { done: driverStep(activeOrder) >= 1, icon: '✅', label: 'Order Accepted', desc: 'Request accepted by rider', time: 'Just now' },
                      { done: driverStep(activeOrder) >= 2, icon: '🏪', label: 'Reached Store', desc: `Store: ${activeOrder.storeName}`, time: driverStep(activeOrder) >= 2 ? 'Arrived' : 'Pending' },
                      { done: driverStep(activeOrder) >= 3, icon: '📦', label: 'Order Ready for Pickup', desc: 'Store marked the order ready', time: activeOrder.storeReady ? 'Ready' : 'Pending' },
                      { done: driverStep(activeOrder) >= 4, icon: '🛵', label: 'Picked Up — On The Way', desc: `Delivering to ${activeOrder.customerName}`, time: activeOrder.pickedUp ? 'Going' : 'Pending' },
                      { done: driverStep(activeOrder) >= 5, icon: '🚪', label: 'At Customer Location', desc: activeOrder.address || '', time: driverStep(activeOrder) >= 5 ? 'Reached' : 'Upcoming' },
                      { done: driverStep(activeOrder) >= 6, icon: '🏠', label: 'Delivered', desc: 'Order handed over to customer', time: driverStep(activeOrder) >= 6 ? 'Done' : 'Upcoming' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-start space-x-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'bg-[#0a1322] text-gray-500 border border-[#1e3050]'}`}>
                          {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px]">{s.icon}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-[10px] font-bold ${s.done ? 'text-emerald-400' : 'text-gray-400'}`}>{s.label}</p>
                            <span className="text-[8px] text-gray-500">{s.time}</span>
                          </div>
                          <p className="text-[8px] text-gray-400 truncate">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Audit timeline */}
                  {(activeOrder.timeline?.length || 0) > 0 && (
                    <div className="bg-[#0a1322] border border-[#1e3050] rounded-xl p-3">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Order Timeline</p>
                      <div className="space-y-1.5">
                        {activeOrder.timeline!.map((t, i) => (
                          <div key={i} className="flex items-start space-x-2">
                            <span className="text-[9px] mt-0.5">{t.actor === 'store' ? '🏪' : t.actor === 'driver' ? '🛵' : t.actor === 'customer' ? '👤' : '🛠️'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] text-white font-bold uppercase">{t.status}</p>
                              {t.note && <p className="text-[8px] text-gray-400">{t.note}</p>}
                            </div>
                            <span className="text-[8px] text-gray-500 shrink-0">{new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stage actions */}
                  <div className="space-y-2">
                    {activeOrder.driverStage === 'to_store' && (
                      <>
                        <button onClick={() => setTab('active')} className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /><span>{activeOrder.storeName} — Store Location</span>
                        </button>
                        <button onClick={handleArriveStore} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[11px] font-black uppercase rounded-xl shadow-lg cursor-pointer">
                          I've Arrived at Store
                        </button>
                      </>
                    )}
                    {activeOrder.driverStage === 'waiting_store' && (
                      <div className="w-full py-3 bg-[#101d30] border border-[#1e3050] text-gray-300 text-[10px] font-bold text-center rounded-xl">
                        Waiting for Store App to mark the order ready
                      </div>
                    )}
                    {activeOrder.driverStage === 'ready_for_pickup' && (
                      <>
                        <label className="w-full py-3 bg-[#101d30] border border-dashed border-[#1e3050] hover:border-brand-orange/40 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-brand-orange" />
                          <span>{pickupProofName ? `Pickup photo: ${pickupProofName}` : 'Upload pickup order photo'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => setPickupProofName(e.target.files?.[0]?.name || 'pickup.jpg')} />
                        </label>
                        <button onClick={handlePickupConfirmed} className={`w-full py-2.5 text-[11px] font-black uppercase rounded-xl shadow-lg cursor-pointer ${pickupProofName ? 'bg-brand-orange hover:bg-brand-orange-hover text-white' : 'bg-[#0a1322] border border-[#1e3050] text-gray-500 cursor-not-allowed'}`}>
                          {pickupProofName ? 'Confirm Pickup & Start Delivery' : 'Upload a pickup photo first'}
                        </button>
                      </>
                    )}
                    {(activeOrder.driverStage === 'to_customer' || activeOrder.driverStage === 'at_customer' || activeOrder.driverStage === 'customer_reported') && (
                      <>
                        <button onClick={() => window.open(`tel:${activeOrder.customerPhone?.replace(/\D/g, '')}`, '_self')} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[11px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center space-x-1.5">
                          <Phone className="w-3.5 h-3.5" /><span>Call Customer · {activeOrder.customerPhone || '+880'}</span>
                        </button>
                        {activeOrder.driverStage === 'to_customer' && (
                          <button onClick={() => setTab('active')} className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-black uppercase rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" /><span>Customer Location — {activeOrder.address}</span>
                          </button>
                        )}
                        {activeOrder.driverStage === 'to_customer' && (
                          <button onClick={handleArrived} className="w-full py-2.5 bg-[#101d30] border border-[#1e3050] hover:bg-[#132238] text-white text-[11px] font-black uppercase rounded-xl cursor-pointer">
                            I've Arrived at Customer
                          </button>
                        )}
                        {activeOrder.driverStage === 'at_customer' && (
                          <button onClick={handleCustomerUnreachable} className="w-full py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 text-[11px] font-black uppercase rounded-xl cursor-pointer">
                            Customer Did Not Answer — Report
                          </button>
                        )}
                        {(activeOrder.driverStage === 'at_customer' || activeOrder.driverStage === 'customer_reported') && (
                          <>
                            <label className="w-full py-3 bg-[#101d30] border border-dashed border-[#1e3050] hover:border-emerald-500/40 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{deliveryProofName ? `Delivery photo: ${deliveryProofName}` : 'Upload delivery proof photo'}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => setDeliveryProofName(e.target.files?.[0]?.name || 'delivery.jpg')} />
                            </label>
                            {activeOrder.deliveryPin && (
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase">Delivery PIN (customer shared)</p>
                                <input
                                  value={pinInput}
                                  onChange={e => setPinInput(e.target.value)}
                                  inputMode="numeric"
                                  placeholder="Enter 4-digit PIN"
                                  className="w-full px-3 py-2 bg-[#0a1322] border border-[#1e3050] rounded-xl text-white text-[12px] font-mono tracking-widest outline-none focus:border-emerald-500"
                                />
                              </div>
                            )}
                            {/cash|cod/i.test(activeOrder.paymentMethod || '') && (
                              <label className="w-full py-2.5 bg-[#101d30] border border-[#1e3050] hover:border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                                <input type="checkbox" checked={codSettled} onChange={e => setCodSettled(e.target.checked)} className="accent-emerald-500" />
                                <span>Cash collected: {bdt(activeOrder.codAmount || activeOrder.amount)} — I'll settle to store</span>
                              </label>
                            )}
                            <button onClick={handleDeliveryProofSubmitted} className={`w-full py-2.5 text-[11px] font-black uppercase rounded-xl cursor-pointer ${deliveryProofName ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-[#0a1322] border border-[#1e3050] text-gray-500 cursor-not-allowed'}`}>
                              {deliveryProofName ? 'Complete Delivery' : 'Upload delivery proof photo first'}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============ DELIVERIES ============ */}
          {tab === 'deliveries' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><History className="w-4 h-4 text-brand-orange" /><span>My Deliveries</span></h3>
                <p className="text-[10px] text-gray-400">Every order assigned to you — status syncs to the admin panel live.</p>
              </div>
              {myOrders.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No deliveries assigned yet.</p> : (
                <div className="space-y-2">
                  {myOrders.map(o => (
                    <div key={o.id} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <p className="text-[11px] font-mono text-brand-orange font-black">#{o.id}</p>
                          <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black ${statusBadge(o.status)}`}>{o.status}</span>
                          <span className="text-[9px] text-gray-500">{o.paymentMethod}</span>
                        </div>
                        <span className="text-[11px] font-black font-mono text-white">{bdt(o.amount)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[10px]">
                        <p className="text-gray-300"><span className="text-gray-500">From:</span> <b className="text-gray-200">{o.storeName}</b></p>
                        <p className="text-gray-300"><span className="text-gray-500">To:</span> <b className="text-gray-200">{o.customerName}</b> · {o.customerPhone}</p>
                        <p className="text-gray-400 sm:col-span-2 truncate"><span className="text-gray-500">Address:</span> {o.address || o.pickupLocation || '—'}</p>
                      </div>
                      {(o.status === 'Processing' || o.status === 'Ongoing') && (
                        <div className="flex items-center justify-end space-x-2 mt-3">
                          <button onClick={() => setReportOpen(o.id)} className="flex items-center space-x-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-black hover:bg-red-500/20 transition-colors">
                            <AlertCircle className="w-3 h-3" /><span>Report</span>
                          </button>
                          <button onClick={() => { setTab('active'); }} className="flex items-center space-x-1.5 px-3 py-2 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange rounded-xl text-[10px] font-black hover:bg-brand-orange/25 transition-colors">
                            <Navigation className="w-3 h-3" /><span>Open Delivery</span>
                          </button>
                        </div>
                      )}
                      {o.status === 'Completed' && (
                        <div className="flex items-center space-x-2 mt-3">
                          <span className="flex items-center space-x-1 text-[9px] text-gray-500"><Star className="w-3 h-3 text-amber-400" /><span>Rate Customer (Optional)</span></span>
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map(st => (
                              <button key={st} onClick={() => setCustomerRating(prev => ({ ...prev, [o.id]: st }))}
                                className={`text-sm cursor-pointer ${(customerRating[o.id] || 0) >= st ? 'text-amber-400' : 'text-gray-600 hover:text-amber-300'}`}>★</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ EARNINGS / WALLET ============ */}
          {tab === 'earnings' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><Wallet className="w-4 h-4 text-brand-orange" /><span>Wallet & Earnings</span></h3>
                <p className="text-[10px] text-gray-400">Payouts sync with the admin wallet system every Sunday.</p>
              </div>

              <div className="rounded-2xl p-5 bg-gradient-to-tr from-sky-600 to-emerald-500 shadow-lg">
                <p className="text-[9px] text-white/80 font-bold uppercase">Available Balance</p>
                <p className="text-3xl font-black text-white mt-1">{bdt(me?.earnings || earned)}</p>
                <p className="text-[9px] text-white/80 font-bold mt-1.5">{me?.completedOrders || done.length} Orders Completed</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Today's Earnings", value: bdt(earned), color: 'text-white' },
                  { label: 'This Week', value: bdt(24100), color: 'text-white' },
                  { label: 'Pending Settlement', value: bdt(0), color: 'text-emerald-400' },
                  { label: 'Tips', value: bdt(done.length * 10), color: 'text-amber-400' },
                ].map(k => (
                  <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                    <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><BarChart3 className="w-3.5 h-3.5 text-brand-orange" /><span>This Week</span></p>
                <div className="flex items-end space-x-1.5 h-24">
                  {moneyBars.map((v, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-brand-orange/60 to-brand-orange rounded-t-md" style={{ height: `${(v / 5100) * 100}%` }} title={bdt(v)} />
                  ))}
                </div>
                <div className="flex justify-between text-[8px] text-gray-500 mt-1.5"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
              </div>

              <button onClick={() => { /* withdraw */ }} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black uppercase rounded-xl cursor-pointer shadow-lg">
                Withdraw to bKash / Bank
              </button>

              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Payout History</p>
                {txns.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">No payouts yet.</p> : (
                  <div className="space-y-1.5">
                    {txns.slice(0, 6).map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-2 bg-[#0a1322] border border-[#1e3050] rounded-lg px-3 py-2 text-[10px]">
                        <div>
                          <p className="text-gray-200 font-bold">{t.type}</p>
                          <p className="text-[8px] text-gray-500 font-mono">{t.id} · {t.date}</p>
                        </div>
                        <span className={`font-mono font-black ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.amount >= 0 ? '+' : ''}{bdt(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ INBOX ============ */}
          {tab === 'inbox' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center space-x-2"><Inbox className="w-4 h-4 text-brand-orange" /><span>Inbox</span></h3>
                  <p className="text-[10px] text-gray-400">Admin updates, order statuses, payouts and support replies appear here.</p>
                </div>
                <button onClick={() => setNotifications(prev => prev.map(n => (n.driverId && n.driverId === me?.id) || (!n.driverId && !n.audience) ? { ...n, read: true } : n))} className="text-[9px] font-black text-brand-orange uppercase tracking-wider hover:underline">Mark all read</button>
              </div>
              {myNotifs.length === 0 ? (
                <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0"><Inbox className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[11px] font-bold text-white">No new messages</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">New dispatch updates, admin notices, order statuses and support replies will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {myNotifs.map(n => {
                    const color = n.type === 'order' ? 'text-brand-orange' : n.type === 'payment' ? 'text-emerald-400' : n.type === 'driver' ? 'text-cyan-400' : 'text-sky-400';
                    return (
                      <div key={n.id} className={`bg-[#101d30] border rounded-xl p-3 flex items-start space-x-3 ${n.read ? 'border-[#1e3050]' : 'border-brand-orange/40'}`}>
                        <span className={`w-8 h-8 rounded-full bg-[#0a1322] flex items-center justify-center shrink-0 ${color}`}>
                          {n.type === 'order' ? <Package className="w-4 h-4" /> : n.type === 'payment' ? <Wallet className="w-4 h-4" /> : n.type === 'driver' ? <Truck className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-white font-bold">{n.title}</p>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0"></span>}
                          </div>
                          <p className="text-[9px] text-gray-400 mt-0.5">{n.message}</p>
                          <p className={`text-[8px] ${color} font-bold mt-1`}>{n.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============ SUPPORT ============ */}
          {tab === 'support' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><Headphones className="w-4 h-4 text-brand-orange" /><span>Driver Helpline Support</span></h3>
                <p className="text-[10px] text-gray-400">24/7 dispatch control room for active rider emergencies.</p>
              </div>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-5 text-center space-y-2">
                <button onClick={() => setTicketOpen(true)} className="w-full py-3 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/25 text-[10px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center space-x-2 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" /><span>Raise a Ticket for Admin</span>
                </button>
              </div>

              {/* My tickets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 font-bold uppercase text-[9px]">My Tickets ({tickets.filter(t => /Driver|driver|Shakib|Rahim/i.test(t.user)).length})</p>
                  <button onClick={() => setTicketOpen(true)} className="text-[9px] font-black text-brand-orange uppercase tracking-wider hover:underline">+ New</button>
                </div>
                {tickets.filter(t => /Driver|driver|Shakib|Rahim/i.test(t.user)).length === 0 ? (
                  <p className="text-[9px] text-gray-500 text-center py-3 bg-[#101d30] border border-[#1e3050] rounded-xl">No tickets yet — raise one and the admin will reply here.</p>
                ) : (
                  tickets.filter(t => /Driver|driver|Shakib|Rahim/i.test(t.user)).slice(0, 5).map(t => (
                    <div key={t.id} className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-mono text-gray-500">{t.id}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${t.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-300' : t.status === 'In Progress' ? 'bg-sky-500/15 text-sky-300' : 'bg-amber-500/15 text-amber-300'}`}>{t.status}</span>
                      </div>
                      <p className="text-[11px] text-white font-bold mt-1">{t.subject}</p>
                      <p className="text-[8px] text-gray-500 mt-0.5">{t.priority} priority · {t.date}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-1.5 text-[10px]">
                <p className="text-gray-400 font-bold uppercase text-[9px]">Frequently Asked Questions</p>
                <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                  <p className="text-[11px] text-white font-bold">How are weekly payouts calculated?</p>
                  <p className="text-gray-400 text-[9px] mt-0.5">Earnings are transferred every Sunday directly to your bKash or Bank account.</p>
                </div>
                <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                  <p className="text-[11px] text-white font-bold">What to do in case of heavy traffic / rain delay?</p>
                  <p className="text-gray-400 text-[9px] mt-0.5">Use the in-app chat button on transit view to notify the customer immediately.</p>
                </div>
                <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3">
                  <p className="text-[11px] text-white font-bold">Can I change my vehicle type?</p>
                  <p className="text-gray-400 text-[9px] mt-0.5">Contact support to update your vehicle after re-verifying your documents.</p>
                </div>
              </div>
            </div>
          )}

          {/* ============ SETTINGS ============ */}
          {tab === 'settings' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><Settings className="w-4 h-4 text-brand-orange" /><span>Settings</span></h3>
                <p className="text-[10px] text-gray-400">Preferences for your driver account.</p>
              </div>
              <div className="space-y-1.5 text-[10px]">
                {[
                  { label: 'App Language', value: 'English (বাংলা available)' },
                  { label: 'Distance Unit', value: 'Kilometers (km)' },
                  { label: 'Ringer / Notification Tone', value: 'Default · Dispatch Bell' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3 flex items-center justify-between">
                    <p className="text-gray-400">{s.label}</p>
                    <p className="text-white font-bold text-[11px]">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-white">Push Notifications</p>
                  <p className="text-[8px] text-gray-400">New order, payout & support alerts</p>
                </div>
                <button onClick={() => setNotifOn(!notifOn)} className={`w-10 h-5 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${notifOn ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${notifOn ? 'ml-auto' : ''}`}></div>
                </button>
              </div>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-white">Auto-accept orders</p>
                  <p className="text-[8px] text-gray-400">{autoAccept ? 'ON — new orders are received automatically' : 'OFF — accept each order manually'}</p>
                </div>
                <button onClick={() => setAutoAccept(!autoAccept)} className={`w-10 h-5 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${autoAccept ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${autoAccept ? 'ml-auto' : ''}`}></div>
                </button>
              </div>
              <button onClick={() => { /* version */ }} className="w-full bg-[#101d30] border border-[#1e3050] p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#132238]">
                <p className="text-[10px] text-gray-400">App Version</p>
                <p className="text-white font-bold text-[11px]">v1.4.2 ✓</p>
              </button>
            </div>
          )}

          {/* ============ PERFORMANCE ============ */}
          {tab === 'performance' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><BarChart3 className="w-4 h-4 text-brand-orange" /><span>Performance</span></h3>
                <p className="text-[10px] text-gray-400">Your delivery stats at a glance.</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Completion Rate', value: '98%', color: 'text-emerald-400' },
                  { label: 'On-Time Delivery', value: '94%', color: 'text-sky-400' },
                  { label: 'Total Distance', value: '1,240 km', color: 'text-brand-orange' },
                  { label: 'Customer Rating', value: `★ ${me?.rating?.toFixed(1) || '4.9'}`, color: 'text-amber-400' },
                ].map(k => (
                  <div key={k.label} className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                    <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Rating Breakdown</p>
                {[5, 4, 3, 2, 1].map(r => {
                  const pct = r === 5 ? 88 : r === 4 ? 9 : r === 3 ? 2 : 1;
                  return (
                    <div key={r} className="flex items-center space-x-2 text-[10px]">
                      <span className="w-6 text-gray-400 flex items-center"><Star className="w-3 h-3 text-amber-400" />{r}</span>
                      <div className="flex-1 h-2 bg-[#0a1322] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-brand-orange" style={{ width: `${pct}%` }} /></div>
                      <span className="text-gray-400 w-8 text-right font-mono">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============ CHAT ============ */}
          {tab === 'chat' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><MessageSquare className="w-4 h-4 text-brand-orange" /><span>Dispatch Chat</span></h3>
                <p className="text-[10px] text-gray-400">Talk to the dispatch team in real time.</p>
              </div>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 h-96 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {chat.map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'You' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-[10px] ${m.from === 'You' ? 'bg-brand-orange text-white' : 'bg-[#0a1322] border border-[#1e3050] text-gray-200'}`}>
                        <p className="font-black text-[8px] uppercase tracking-wider opacity-70 mb-0.5">{m.from} · {m.time}</p>
                        <p>{m.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type a message…" className="flex-1 bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[10px] outline-none focus:border-brand-orange" />
                  <button onClick={sendChat} className="p-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl transition-colors"><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}

          {/* ============ PROFILE ============ */}
          {tab === 'profile' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><User className="w-4 h-4 text-brand-orange" /><span>My Profile</span></h3>
                <p className="text-[10px] text-gray-400">Your identity & documents on the NexaGo network.</p>
              </div>
              <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-5 flex flex-wrap items-center gap-5">
                {me?.photo ? <img src={me.photo} alt={me.name} className="w-20 h-20 rounded-2xl object-cover border border-brand-orange/40" /> : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-2xl">RK</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-black text-white">{me?.name || 'Rahim Khan'}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{me?.id || 'DRV-1001'} · {me?.vehicleType || 'Bike'} · Dhanmondi</p>
                  <div className="flex items-center space-x-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">★ {me?.rating?.toFixed(1) || '4.9'} Rating</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">Top 5% Rider</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">{me?.completedOrders || 72} deliveries</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2.5 bg-[#0a1322] border border-[#1e3050] hover:border-emerald-500/40 text-emerald-300 rounded-xl"><Phone className="w-4 h-4" /></button>
                  <button onClick={toggleDuty} className="flex items-center space-x-2 px-4 py-2.5 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-orange/25 transition-colors">
                    <LogIn className="w-3.5 h-3.5" /><span>{online ? 'Go Offline' : 'Go Online'}</span>
                  </button>
                </div>
              </div>

              {/* Online / auto-accept toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className={`text-[10px] font-black ${online ? 'text-emerald-400' : 'text-red-400'}`}>{online ? "You're Online" : "You're Offline"}</p>
                    <p className="text-[8px] text-gray-400">Accept orders to start earning</p>
                  </div>
                  <button onClick={toggleDuty} className={`w-10 h-5 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${online ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${online ? 'ml-auto' : ''}`}></div>
                  </button>
                </div>
                <div className="bg-[#101d30] border border-[#1e3050] rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className={`text-[10px] font-black ${autoAccept ? 'text-emerald-400' : 'text-gray-300'}`}>Auto-accept orders</p>
                    <p className="text-[8px] text-gray-400">{autoAccept ? 'ON — received automatically' : 'OFF — accept each order manually'}</p>
                  </div>
                  <button onClick={() => setAutoAccept(!autoAccept)} className={`w-10 h-5 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${autoAccept ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${autoAccept ? 'ml-auto' : ''}`}></div>
                  </button>
                </div>
              </div>

              {/* Account menu */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Account</p>
                {[
                  { icon: User, label: 'Profile', color: 'text-brand-orange', fn: () => {} },
                  { icon: Wallet, label: 'Wallet & Earnings', color: 'text-emerald-400', fn: () => setTab('earnings') },
                  { icon: History, label: 'Delivery History', color: 'text-sky-400', fn: () => setTab('deliveries') },
                  { icon: LayoutDashboard, label: 'Dashboard', color: 'text-brand-orange', fn: () => setTab('dashboard') },
                  { icon: Inbox, label: 'Inbox', color: 'text-cyan-400', fn: () => setTab('inbox') },
                  { icon: Headphones, label: 'Support', color: 'text-purple-400', fn: () => setTab('support') },
                  { icon: Settings, label: 'Settings', color: 'text-amber-400', fn: () => setTab('settings') },
                  { icon: ShieldCheck, label: 'Privacy Policy', color: 'text-teal-400', fn: () => setAuthView('terms') },
                  { icon: LogOut, label: 'Logout', color: 'text-red-400', fn: () => setAuthView('login') },
                ].map(item => (
                  <button key={item.label} onClick={item.fn} className="w-full bg-[#101d30] border border-[#1e3050] hover:border-brand-orange/40 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="flex items-center space-x-2.5">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className={`text-[10px] font-bold ${item.label === 'Logout' ? 'text-red-400' : 'text-white'}`}>{item.label}</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                ))}
              </div>

              <p className="text-[9px] text-gray-600 text-center pt-2">Last active: {todayStr()} · NexaGo Smart Delivery Network</p>
            </div>
          )}

          {/* ============ REGISTER ============ */}
          {tab === 'register' && (
            <div className="max-w-lg mx-auto space-y-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center mx-auto text-3xl font-bold shadow-xl">
                  <Truck className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-white tracking-wide">Become a NexaGo Rider</h4>
                <p className="text-[10px] text-gray-400">Register your vehicle & documents to start earning.</p>
              </div>
              <button onClick={() => setAuthView('login')} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-black uppercase rounded-xl shadow-lg">
                Already a Driver? Login →
              </button>
              <button onClick={() => setAuthView('signup')} className="w-full py-2.5 bg-[#101d30] border border-[#1e3050] hover:bg-[#132238] text-gray-300 hover:text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer">
                Start Registration →
              </button>
            </div>
          )}
        </>
      )}

      {/* ============ TICKET MODAL ============ */}
      {ticketOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setTicketOpen(false)}>
          <div className="w-full max-w-md bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-white flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-brand-orange" />Raise a Ticket</h5>
              <button onClick={() => setTicketOpen(false)} className="w-6 h-6 rounded-full bg-[#0a1322] flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <p className="text-[9px] text-gray-400">Send any issue straight to the NexaGo admin — they'll reply in your tickets below.</p>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Topic</label>
              <select value={ticketTopic} onChange={e => setTicketTopic(e.target.value)} className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[11px] text-white outline-none cursor-pointer">
                {['Payout / Earnings', 'Order / Delivery Issue', 'Account & Documents', 'Vehicle / Zone Change', 'Technical Support', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Subject</label>
              <input value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Short summary of your issue…" className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[11px] text-white outline-none focus:border-brand-orange" />
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Priority</label>
              <select value={ticketPriority} onChange={e => setTicketPriority(e.target.value)} className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[11px] text-white outline-none cursor-pointer">
                {['Low', 'Medium', 'High'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Description</label>
              <textarea value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} rows={3} placeholder="Explain what happened…" className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[11px] text-white outline-none focus:border-brand-orange resize-none" />
            </div>
            <button onClick={submitTicket} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-black uppercase rounded-xl cursor-pointer transition-colors">
              Submit Ticket
            </button>
          </div>
        </div>
      )}

      {/* ============ REPORT MODAL ============ */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setReportOpen(null)}>
          <div className="w-full max-w-md bg-[#101d30] border border-[#1e3050] rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-white flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-red-400" />Report Order #{reportOpen}</h5>
              <button onClick={() => setReportOpen(null)} className="w-6 h-6 rounded-full bg-[#0a1322] flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Reason</label>
              <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[11px] text-white outline-none cursor-pointer">
                {['Customer unreachable', 'Wrong address', 'Order damaged', 'Payment issue', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Description</label>
              <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} rows={3} placeholder="Add details…" className="w-full bg-[#0a1322] border border-[#1e3050] rounded-xl px-3 py-2.5 text-[11px] outline-none focus:border-brand-orange resize-none" />
            </div>
            <button onClick={submitReport} className="w-full py-2.5 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-300 text-[10px] font-black uppercase rounded-xl cursor-pointer">
              Submit Report
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 bg-[#0f1c2e] border border-brand-orange/40 text-white text-[11px] font-bold rounded-xl shadow-2xl">
          {toast}
        </div>
      )}
    </PortalShell>
  );
}

type OrderLike = {
  status: string;
  driverStage?: string;
  pickedUp?: boolean;
  storeReady?: boolean;
  deliveryCharge?: number;
  amount: number;
  deliveryFee?: number;
  codAmount?: number;
};

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
    X, Bell, Clock, RotateCcw, Search, Lock, Mail, CalendarDays, MailCheck, ArrowLeft
  } from 'lucide-react';
import PortalShell from './PortalShell';
import { useOrders, useDrivers, useWalletTxns, useTickets, useNotifications, bdt, todayStr, statusBadge, lsGet, lsSet, appendTimeline, makeNotif, useCloudSync, identityCheck, identityClaim, securityApi, supabaseClient } from './portalUtils';

type AuthView = 'login' | 'signup' | 'docs' | 'pending' | 'forgot' | 'terms' | 'dashboard';

export default function DriverPortal() {
  useCloudSync();
  const [orders, setOrders] = useOrders();
  const [drivers, setDrivers] = useDrivers();
  const [txns, setTxns] = useWalletTxns();
  const [tickets, setTickets] = useTickets();
  const [notifications, setNotifications] = useNotifications();
  const [sessionId, setSessionId] = useState<string>(() => lsGet('sd_driver_session', ''));
  const me = drivers.find(d => d.id === sessionId) || null;
  const [tab, setTab] = useState('dashboard');
  const [authView, setAuthView] = useState<AuthView>(() => (lsGet('sd_driver_remember', true) && lsGet('sd_driver_session', '') ? 'dashboard' : 'login'));
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketTopic, setTicketTopic] = useState('Payout / Earnings');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [ticketDesc, setTicketDesc] = useState('');
  const [chat, setChat] = useState<{ from: string; msg: string; time: string }[]>([]);
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
  const [signupGmail, setSignupGmail] = useState('');
  const [signupNid, setSignupNid] = useState('');
  const [signupLicense, setSignupLicense] = useState('');
  const [signupLicenseExpiry, setSignupLicenseExpiry] = useState('');
  const [signupVehicle, setSignupVehicle] = useState('Motorcycle (150cc)');
  const [termsChecked, setTermsChecked] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string>(() => lsGet('sd_driver_pending_id', ''));
  // Gmail OTP signup verification (mirrors Store Admin flow): the driver verifies
  // their Gmail with a 6-digit code before the application can be submitted.
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState('');
  // Signup is two steps: first verify the account (Google or Gmail OTP), then
  // fill in the driver registration form. The "Driver Registration" screen only
  // appears AFTER the account is verified.
  const [signupStage, setSignupStage] = useState<'account' | 'details'>('account');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [checkStatusInput, setCheckStatusInput] = useState('');
  const [checkStatusQuery, setCheckStatusQuery] = useState('');
  const [pickupProofName, setPickupProofName] = useState<string | null>(null);
  const [deliveryProofName, setDeliveryProofName] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pickupPinInput, setPickupPinInput] = useState('');
  const [codSettled, setCodSettled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Read a selected photo (camera or gallery) as a base64 data URL and save it
  // permanently into uploadedDocs — the actual image is stored, not a invalid name.
  const handleDocFile = (key: string, file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      // PDF support: store the file as-is (PDFs cannot be canvas-compressed).
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        // localStorage + cloud quota is shared, so very large PDFs would silently
        // overflow. 3MB (→ ~4MB base64) keeps the whole driver record safe.
        if (file.size > 3 * 1024 * 1024) { showToast('PDF is too large — keep it under 3MB (compress the scan first)'); return; }
        if (!dataUrl.startsWith('data:application/pdf')) { showToast('Please choose a valid PDF file'); return; }
        setUploadedDocs(prev => ({ ...prev, [key]: dataUrl }));
        return;
      }
      if (!dataUrl.startsWith('data:image')) { showToast('Please choose an image file (JPG/PNG) or a PDF'); return; }
      // Compress before storing so signup documents always fit in localStorage +
      // cloud sync (large camera photos would silently overflow the quota).
      const img = new Image();
      img.onload = () => {
        // Any photo size is fine — it is always downscaled to a compact JPEG.
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setUploadedDocs(prev => ({ ...prev, [key]: dataUrl })); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        setUploadedDocs(prev => ({ ...prev, [key]: canvas.toDataURL('image/jpeg', 0.72) }));
      };
      img.onerror = () => setUploadedDocs(prev => ({ ...prev, [key]: dataUrl }));
      img.src = dataUrl;
    };
    reader.onerror = () => showToast('Could not read that file — try again');
    reader.readAsDataURL(file);
  };

  const triggerDocInput = (key: string, mode: 'camera' | 'gallery') => {
    const el = docInputRefs.current[key];
    if (!el) return;
    el.setAttribute('capture', mode === 'camera' ? 'environment' : '');
    el.click();
  };

  const requiredDocs = ['license', 'nid', 'registration', 'photo'];
  const docMeta: { key: string; label: string; docType: 'NID Card' | 'Driving License' | 'Vehicle Registration' | 'Profile Photo' | 'Other'; required: boolean }[] = [
    { key: 'license', label: 'Driving License (Front & Back)', docType: 'Driving License', required: true },
    { key: 'nid', label: 'National ID (NID) Smart Card', docType: 'NID Card', required: true },
    { key: 'registration', label: 'Vehicle Registration Certificate', docType: 'Vehicle Registration', required: true },
    { key: 'insurance', label: 'Tax Token & Insurance Policy', docType: 'Other', required: false },
    { key: 'photo', label: 'Profile Photo / Selfie with Vehicle', docType: 'Profile Photo', required: true },
  ];

  // Credentials come only from the admin panel: admin-created fleet drivers get a
  // password at creation, and approved pending registrations get a password in
  // App.tsx handleUpdateDriver. They are synced to the driver site via cloud
  // (sd_driver_creds) so the driver receives their ID + password instantly.
  const CREDS_KEY = 'sd_driver_creds';
  const getCreds = (): Record<string, { phone: string; password: string }> => {
    try {
      const raw = localStorage.getItem(CREDS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };
  const saveCreds = (c: Record<string, { phone: string; password: string }>) => {
    try { localStorage.setItem(CREDS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  };

  // Authenticate the driver against the shared fleet (id / phone / name) AND a
  // stored password. Without a matching account + password there is no way in.
  // Credentials are mirrored to the relay security registry by the admin at
  // creation/approval, so we first try the server-side login for cross-device
  // verification, then fall back to the local credential map when the relay is
  // unreachable (offline mode).
  const handleLogin = () => {
    const id = loginId.trim().toLowerCase();
    if (!id) { showToast('Enter your driver ID or phone number'); return; }
    const found = drivers.find(d =>
      d.id.toLowerCase() === id ||
      d.id.replace(/[^0-9]/g, '').endsWith(id.replace(/[^0-9]/g, '')) ||
      d.phone === id ||
      d.name.toLowerCase() === id
    );
    if (!found) { showToast('Driver not found — register a new account first'); return; }
    if (found.verificationStatus === 'Pending Audit') {
      showToast('Account not approved yet — wait for admin approval');
      return;
    }
    const creds = getCreds();
    const cred = creds[found.id];
    if (!cred) { showToast('No password set for this account — admin must approve first'); return; }
    const localOk = cred.password === loginPass;
    const finishLogin = () => {
      setSessionId(found.id);
      lsSet('sd_driver_session', found.id);
      setLoginId('');
      setLoginPass('');
      setAuthView('dashboard');
      showToast(`Welcome back, ${found.name.split(' ')[0]}!`);
    };
    // Server-side verify first (cross-device + secure). If the relay responds,
    // INVALID_LOGIN blocks the sign-in; only a network failure falls back to
    // the local credential match so offline access keeps working.
    securityApi('/login', { userId: found.id, password: loginPass }).then((data) => {
      if (data && data.ok) { finishLogin(); return; }
      if (localOk) finishLogin(); else showToast('Incorrect password — try again');
    }).catch(() => {
      if (localOk) finishLogin(); else showToast('Incorrect password — try again');
    });
  };

  // Signup: register a real driver account with documents, then require admin
  // approval. No temporary/bypass button — the pending screen only leads to login.
  // Every driver gets a permanent numeric ID (e.g. 3667463854); once the admin
  // approves (App.tsx handleUpdateDriver) a random password is generated into
  // sd_driver_creds and the driver logs in with ID + that password.
  const submitSignup = async () => {
    const missing = requiredDocs.find(k => !uploadedDocs[k]);
    if (!signupName.trim() || !signupPhone.trim() || !signupGmail.trim() || !signupNid.trim() || !signupLicense.trim()) {
      showToast('Fill in your name, phone, gmail, NID and driving license');
      return;
    }
    if (!/^\+?88?01\d{9}$/.test(signupPhone.replace(/[^0-9]/g, ''))) {
      showToast('Enter a valid Bangladeshi phone number (e.g. 01712345678)');
      return;
    }
    if (!/^[\w.+-]+@gmail\.com$/i.test(signupGmail.trim())) {
      showToast('Enter a valid Gmail address (name@gmail.com)');
      return;
    }
    if (otpStep !== 'verified') {
      showToast('Verify your Gmail with the OTP code first');
      return;
    }
    if (signupNid.replace(/[^0-9]/g, '').length < 10) {
      showToast('Enter a valid NID number (10+ digits)');
      return;
    }
    if (signupLicense.trim().length < 5) {
      showToast('Enter a valid driving license number');
      return;
    }
    if (!signupLicenseExpiry) { showToast('Enter your driving license expiry date'); return; }
    if (new Date(signupLicenseExpiry) <= new Date()) { showToast('Your driving license has expired — upload a valid one'); return; }
    if (!termsChecked) { showToast('Accept the Terms & Safety Guidelines first'); return; }
    if (missing) { showToast(`Upload required document: ${missing}`); return; }
    const normPhone = signupPhone.replace(/[^0-9]/g, '');
    const dup = drivers.find(d =>
      (d.phone && d.phone.replace(/[^0-9]/g, '') === normPhone) ||
      (d.email && d.email.toLowerCase() === signupGmail.trim().toLowerCase()) ||
      (d.nidNumber && d.nidNumber.replace(/[^0-9]/g, '') === signupNid.replace(/[^0-9]/g, '')) ||
      (d.licenseNumber && d.licenseNumber.trim().toUpperCase() === signupLicense.trim().toUpperCase())
    );
    if (dup) {
      showToast('This phone / gmail / NID / license is already registered — you can only register once');
      return;
    }
    const idConflict = await identityCheck({ phone: signupPhone, email: signupGmail });
    if (idConflict.taken) {
      const c = idConflict.conflict;
      showToast(`This phone or Gmail already belongs to ${c?.name || c?.identityId || 'an existing account'} (${c?.role || 'account'}). One account per phone/Gmail.`);
      return;
    }
    let newId = '';
    do { newId = `3${Math.floor(100000000 + Math.random() * 899999999)}`.slice(0, 10); }
    while (drivers.some(d => d.id === newId));
    const newDriver: typeof drivers[0] = {
      id: newId,
      name: signupName.trim(),
      phone: signupPhone.trim(),
      email: signupGmail.trim().toLowerCase(),
      nidNumber: signupNid.trim(),
      licenseNumber: signupLicense.trim().toUpperCase(),
      licenseExpiry: signupLicenseExpiry,
      vehicleType: signupVehicle,
      status: 'Offline',
      completedOrders: 0,
      earnings: 0,
      rating: 5,
      verificationStatus: 'Pending Audit',
      documents: docMeta
        .filter(d => uploadedDocs[d.key])
        .map(d => ({
          type: d.docType,
          fileName: `${d.label.split(' ')[0]}.jpg`,
          submittedAt: new Date().toLocaleString('en-GB'),
          status: 'Pending' as const,
          dataUrl: uploadedDocs[d.key],
        })),
    };
    setDrivers(prev => [newDriver, ...prev]);
    identityClaim({ role: 'driver', identityId: newId, name: signupName.trim(), phone: signupPhone, email: signupGmail.trim() }).catch(() => {});
    setPendingId(newId);
    lsSet('sd_driver_pending_id', newId);
    setAuthView('pending');
    setSignupName(''); setSignupPhone(''); setSignupGmail(''); setSignupNid(''); setSignupLicense(''); setSignupLicenseExpiry('');
    setUploadedDocs({}); setTermsChecked(false);
  };

  // Gmail OTP signup verification (server-side, same endpoints as Store Admin).
  const sendSignupOtp = () => {
    const email = signupGmail.trim().toLowerCase();
    if (!email || !/^[\w.+-]+@gmail\.com$/i.test(email)) { setOtpError('Enter a valid Gmail address first.'); return; }
    setOtpBusy(true);
    setOtpError('');
    securityApi('/otp-signup-send', { email }).then(() => {
      setOtpStep('sent');
      setOtpError('');
      showToast('Verification code sent to your Gmail');
    }).catch((err) => {
      setOtpError(String(err?.message || 'Could not send the code. Try again.'));
    }).finally(() => setOtpBusy(false));
  };

  const verifySignupOtp = () => {
    const email = signupGmail.trim().toLowerCase();
    if (!otpCode.trim()) { setOtpError('Enter the 6-digit code from your email.'); return; }
    setOtpBusy(true);
    setOtpError('');
    securityApi('/otp-signup-verify', { email, code: otpCode }).then(() => {
      setOtpStep('verified');
      setEmailVerified(true);
      setOtpError('');
      setSignupStage('details');
      showToast('Gmail verified — complete your registration below');
    }).catch((err) => {
      setOtpError(String(err?.message || 'Invalid or expired code.'));
    }).finally(() => setOtpBusy(false));
  };

  // Google OAuth callback for driver signup: after the Gmail account chooser,
  // Supabase redirects back with #access_token. The chosen Gmail counts as a
  // verified email, so the driver goes straight to the registration form.
  useEffect(() => {
    const sb = supabaseClient();
    if (!sb) return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (!params.get('access_token')) return;
    (async () => {
      try {
        const { data, error } = await sb.auth.getSession();
        if (error || !data.session) throw error || new Error('no session');
        const email = String(data.session.user.email || '').trim().toLowerCase();
        if (email && /^[\w.+-]+@gmail\.com$/i.test(email)) {
          setSignupGmail(email);
          setOtpStep('verified');
          setEmailVerified(true);
          setSignupStage('details');
          showToast('Google account verified — complete your registration below');
        } else {
          showToast('That Google account has no Gmail address — use the Gmail + OTP option instead');
        }
      } catch {
        showToast('Google sign-in could not be completed. Use Gmail + OTP instead.');
      }
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    })();
  }, []);

  const continueWithGoogle = async () => {
    const sb = supabaseClient();
    if (!sb) { setGoogleError('Google sign-in is not configured on this server yet — use Gmail + OTP.'); return; }
    setGoogleBusy(true);
    setGoogleError('');
    try {
      const redirectTo = `${window.location.origin}/driver`;
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) { setGoogleError(String(error.message)); setGoogleBusy(false); }
    } catch (err) {
      setGoogleError(String(err?.message || 'Google sign-in failed — try again.'));
      setGoogleBusy(false);
    }
  };

  const handleLogout = () => {
    setSessionId('');
    lsSet('sd_driver_session', '');
    setLoginId('');
    setLoginPass('');
    setAuthView('login');
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

  // Return / reverse-logistics pickups (approved by the store, awaiting rider pickup)
  const [returns, setReturns] = useState<any[]>(() => lsGet('sd_returns', []));
  useEffect(() => {
    const onStorage = () => setReturns(lsGet('sd_returns', []));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const pickupJobs = returns.filter(r => r.status === 'Approved');

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
  const active = myOrders.filter(o => o.status === 'Processing' || o.status === 'Ongoing');  const activeOrder = active[0];
  const done = myOrders.filter(o => o.status === 'Completed');
  const cancelled = myOrders.filter(o => o.status === 'Cancelled');
  const earned = done.reduce((s, o) => s + (o.deliveryCharge || 60), 0) + done.length * 20;

  // Real weekly / performance stats derived from this driver's actual orders
  const nowMs = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const orderTs = (o: OrderLike): number => o.placedAt ?? new Date(o.date).getTime();
  const doneThisWeek = done.filter(o => nowMs - orderTs(o) < weekMs);
  const doneToday = done.filter(o => new Date(orderTs(o)).toDateString() === new Date().toDateString());
  const weekEarned = doneThisWeek.reduce((s, o) => s + (o.deliveryCharge || 60) + 20, 0);
  const todayEarned = doneToday.reduce((s, o) => s + (o.deliveryCharge || 60) + 20, 0);
  const completionRate = done.length + cancelled.length > 0 ? Math.round((done.length / (done.length + cancelled.length)) * 100) : 0;
  const totalKm = done.reduce((s, o) => s + (o.deliveryCoords && o.pickupCoords ? Math.round(haversineKm(o.pickupCoords, o.deliveryCoords)) : 0), 0);
  const moneyBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(nowMs - (6 - i) * 24 * 60 * 60 * 1000);
    return done.filter(o => new Date(orderTs(o)).toDateString() === d.toDateString())
      .reduce((s, o) => s + (o.deliveryCharge || 60) + 20, 0);
  });

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
    if (online && activeOrder) { showToast('Finish the active delivery before going offline'); return; }
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
    // Pickup PIN verification — the store gives this PIN to the rider at the counter
    if (activeOrder.pickupPin && pickupPinInput.trim() !== activeOrder.pickupPin) {
      showToast('Pickup PIN incorrect — ask the store staff for the pickup PIN.');
      return;
    }
    updateStage(activeOrder.id, 'to_customer', { status: 'Ongoing' as any, pickedUp: true, pickupProof: pickupProofName, handoffScanned: { ...(activeOrder.handoffScanned || {}), pickup: true } });
    // Notify the store + customer that pickup is verified
    setNotifications(prev => [
      makeNotif('🛵 Pickup Verified', `Rider ${me?.name || ''} picked up order #${activeOrder.id} (PIN verified) — on the way to the customer.`, 'order', { audience: 'store', storeId: activeOrder.storeId }),
      makeNotif('🛵 Picked Up — #' + activeOrder.id, `Your order from ${activeOrder.storeName} is on the way.`, 'order', { audience: 'customer', customerId: activeOrder.customerId || activeOrder.customerPhone }),
      ...prev,
    ]);
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
      user: me ? `${me.name} (Driver)` : 'Driver',
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

  // Withdraw to bKash / Nagad / Bank — records a real payout request into the
  // shared wallet transaction ledger (ss_wtxn_v3) so it shows in Payout History
  // and is visible to the admin settlement dashboard.
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState('bKash');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const submitWithdraw = () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) { showToast('Enter a valid withdrawal amount'); return; }
    if (amt > earned) { showToast(`You can withdraw up to ${bdt(earned)}`); return; }
    const now = new Date();
    const txn = {
      id: `PAYOUT-${Date.now().toString().slice(-6)}`,
      type: `Withdrawal (${withdrawMethod})`,
      amount: -Math.round(amt),
      date: `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      status: 'Requested',
      driverId: me?.id,
      driverName: me?.name,
    };
    setTxns(prev => [txn, ...(prev || [])]);
    setWithdrawOpen(false);
    setWithdrawAmount('');
    showToast(`Withdrawal of ${bdt(amt)} to ${withdrawMethod} requested — admin will settle shortly`);
  };

  const goBack = () => { window.open(`${window.location.origin}/roles.html`, '_self'); };

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
    { id: 'returns', label: 'Returns', icon: RotateCcw, badge: pickupJobs.length },
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
  const nav = authView === 'dashboard' ? authNav : [];

  return (
    <PortalShell
      role="Driver Site"
      tagline={authView === 'dashboard' ? `${me?.name || 'Driver'} · ${me?.id || ''}` : 'NexaGo BD Driver Portal'}
      nav={nav}
      active={authView === 'dashboard' ? tab : authView}
      onNav={id => {
        // Auth screens (login/signup/docs/pending/forgot/terms) can only move
        // between auth views — a main portal tab is unreachable until login.
        if (authView !== 'dashboard') {
          if (id === 'login' || id === 'signup' || id === 'docs' || id === 'pending' || id === 'forgot' || id === 'terms') {
            setAuthView(id as AuthView);
          }
          return;
        }
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
        <div className="max-w-lg mx-auto space-y-4 fade-in min-h-[calc(100vh-3.5rem)] flex flex-col justify-center py-6">
          {/* ---- LOGIN ---- */}
          {authView === 'login' && (
            <>
              {/* Ambient glow */}
              <div className="absolute top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none"></div>
              <div className="relative text-center space-y-3">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-brand-orange to-amber-400 opacity-40 blur-xl"></div>
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-orange via-orange-500 to-amber-500 text-white flex items-center justify-center text-3xl font-black shadow-2xl shadow-brand-orange/30 border border-white/20">
                    <Truck className="w-9 h-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] tracking-[0.35em] uppercase text-brand-orange font-semibold">NexaGo BD · Delivery Network</p>
                  <h4 className="text-xl font-bold text-white tracking-tight">Driver Dispatch Portal</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Sign in with your permanent Driver ID and password to receive and complete delivery orders.</p>
                </div>
              </div>
              <div className="relative rounded-3xl bg-gradient-to-b from-[#17273f] to-[#0e1a2e] border border-[#24395c] shadow-2xl shadow-black/40 p-5 space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[8px] text-gray-400 uppercase block font-black tracking-widest">Driver ID / Phone</label>
                  <div className="flex items-center gap-2.5 glass-input border border-[#24395c] rounded-xl px-3.5 py-2.5 focus-within:border-brand-orange focus-within:ring-1 focus-within:ring-brand-orange/40 transition-all">
                    <User className="w-4 h-4 text-brand-orange/70 shrink-0" />
                    <input value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="e.g. 3667463854"
                      className="flex-1 bg-transparent text-[11px] font-mono outline-none text-white placeholder:text-gray-600" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] text-gray-400 uppercase block font-black tracking-widest">Password</label>
                  <div className="flex items-center gap-2.5 glass-input border border-[#24395c] rounded-xl px-3.5 py-2.5 focus-within:border-brand-orange focus-within:ring-1 focus-within:ring-brand-orange/40 transition-all">
                    <Lock className="w-4 h-4 text-brand-orange/70 shrink-0" />
                    <input type={showPassword ? 'text' : 'password'} value={loginPass} onChange={e => setLoginPass(e.target.value)}
                      placeholder="••••••••" className="flex-1 bg-transparent text-[11px] font-mono outline-none text-white placeholder:text-gray-600" />
                    <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-white cursor-pointer">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-0.5">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-gray-300">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-white/20 text-brand-orange focus:ring-0" />
                    <span>Remember Me</span>
                  </label>
                  <button onClick={() => setAuthView('forgot')} className="text-brand-orange hover:underline font-bold">Forgot Password?</button>
                </div>
                <button onClick={handleLogin} className="w-full py-3 bg-gradient-to-r from-brand-orange to-orange-500 hover:from-brand-orange-hover hover:to-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg shadow-brand-orange/25 transition-all hover:shadow-brand-orange/40 active:scale-[0.99]">
                  Sign In Securely
                </button>
              </div>
              <div className="relative flex items-center gap-3 text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                <span className="flex-1 h-px bg-gradient-to-r from-transparent to-[#24395c]"></span>
                <span>New to NexaGo?</span>
                <span className="flex-1 h-px bg-gradient-to-l from-transparent to-[#24395c]"></span>
              </div>
              <button onClick={() => { setSignupStage('account'); setOtpStep('idle'); setOtpCode(''); setOtpError(''); setGoogleError(''); setAuthView('signup'); }} className="w-full py-3 bg-gradient-to-b from-[#17273f] to-[#0e1a2e] border border-[#24395c] hover:border-brand-orange/50 hover:from-[#1b2f4d] hover:to-brand-card text-gray-200 hover:text-white text-[11px] font-bold rounded-xl cursor-pointer transition-all">
                Create Driver Account
              </button>
              <p className="relative text-center text-[9px] text-gray-500">Access with your permanent Driver ID + password. New riders can register below.</p>
              <button onClick={() => { setCheckStatusInput(''); setCheckStatusQuery(''); setAuthView('pending'); }} className="relative w-full text-center text-[9px] text-emerald-400 hover:underline font-bold cursor-pointer">
                Check my application status (any device) →
              </button>
            </>
          )}

          {/* ---- SIGNUP (Step A: verify account with Google or Gmail OTP first) ---- */}
          {authView === 'signup' && signupStage === 'account' && (
            <>
              <div className="relative text-center space-y-2">
                <p className="text-[9px] tracking-[0.35em] uppercase text-brand-orange font-semibold">NexaGo BD · Delivery Network</p>
                <h4 className="text-xl font-bold text-white tracking-tight">Create Your Account</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">Verify with Google or your Gmail first — then complete driver registration.</p>
              </div>
              <div className="relative rounded-3xl bg-gradient-to-b from-[#17273f] to-[#0e1a2e] border border-[#24395c] shadow-2xl shadow-black/40 p-5 space-y-3.5">
                <button onClick={continueWithGoogle} disabled={googleBusy} className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white text-[#1f1f1f] text-xs font-bold shadow-lg hover:bg-gray-100 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer">
                  <span className="flex items-center justify-center w-4 h-4">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                  </span>
                  {googleBusy ? 'Connecting to Google…' : 'Continue with Google'}
                </button>
                {googleError && <p className="text-[9px] font-bold text-red-400 text-center">{googleError}</p>}
                <div className="relative flex items-center gap-3 text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                  <span className="flex-1 h-px bg-gradient-to-r from-transparent to-[#24395c]"></span>
                  <span>or with Gmail</span>
                  <span className="flex-1 h-px bg-gradient-to-l from-transparent to-[#24395c]"></span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] text-gray-400 uppercase block font-black tracking-widest">Gmail Address</label>
                  <div className="flex items-center gap-2.5 glass-input border border-[#24395c] rounded-xl px-3.5 py-2.5 focus-within:border-brand-orange focus-within:ring-1 focus-within:ring-brand-orange/40 transition-all">
                    <Mail className="w-4 h-4 text-brand-orange/70 shrink-0" />
                    <input value={signupGmail} onChange={e => setSignupGmail(e.target.value)} placeholder="name@gmail.com"
                      className="flex-1 bg-transparent text-[11px] font-mono outline-none text-white placeholder:text-gray-600" />
                  </div>
                </div>
                <div className={`rounded-xl p-3 border ${otpStep === 'verified' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-[#24395c] glass-soft'}`}>
                  <div className="flex items-start space-x-2">
                    <MailCheck className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Verify Gmail with OTP</p>
                      <p className="text-[8px] text-gray-500 mt-0.5">A 6-digit code is emailed to your Gmail. Your account is only created after this passes.</p>
                      {otpStep === 'verified' ? (
                        <p className="mt-2 text-[9px] font-bold text-emerald-400 flex items-center space-x-1"><CheckCircle2 className="w-3 h-3" /><span>Gmail verified — proceeding to registration…</span></p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {otpStep === 'sent' && (
                            <div className="flex items-center space-x-2">
                              <input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="6-digit code" className="flex-1 bg-[#0a1322] border border-[#1e3050] rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
                              <button onClick={verifySignupOtp} disabled={otpBusy} className="rounded-lg bg-brand-orange px-3 py-2 text-[9px] font-black uppercase text-white disabled:opacity-60">Verify</button>
                            </div>
                          )}
                          <button onClick={sendSignupOtp} disabled={otpBusy} className="w-full rounded-lg border border-brand-orange/40 bg-brand-orange/10 px-3 py-2 text-[9px] font-black uppercase text-brand-orange hover:bg-brand-orange/20 disabled:opacity-60">
                            {otpStep === 'sent' ? 'Resend Code' : 'Send OTP to Gmail'}
                          </button>
                          {otpError && <p className="text-[8px] font-bold text-red-400">{otpError}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setAuthView('login')} className="relative w-full text-center text-[9px] text-brand-orange hover:underline font-bold cursor-pointer">
                Already have an account? Sign in →
              </button>
            </>
          )}

          {/* ---- SIGNUP (Step B: Driver Registration — shown only after the
               account is verified with Google or the Gmail OTP) ---- */}
          {authView === 'signup' && signupStage === 'details' && (
            <>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <button onClick={() => setSignupStage('account')} className="text-gray-400 hover:text-white transition-colors" title="Change Gmail"><ArrowLeft className="w-4 h-4" /></button>
                  <div className="text-center flex-1">
                    <h4 className="text-sm font-bold text-white tracking-tight">Driver Registration</h4>
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Join the NexaGo Delivery Network</p>
                  </div>
                  <span className="w-4" />
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-[#132238] border border-[#1e3050] overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-brand-orange to-orange-500 rounded-full" />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[8px] font-bold uppercase tracking-widest">
                  <span className="text-brand-orange">Step 1 · Personal Details</span>
                  <span className="text-gray-500">Step 2 · Documents</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center space-x-1.5">
                    <User className="w-3 h-3 text-brand-orange" /><span>Personal Information</span>
                  </p>
                  <div className="glass-soft rounded-xl p-3 mb-2 border border-emerald-500/30 bg-emerald-500/5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <label className="text-[7.5px] text-gray-400 uppercase block font-bold tracking-widest">Verified Gmail</label>
                        <p className="text-[11px] text-emerald-300 font-mono mt-0.5 truncate">{signupGmail || '—'}</p>
                      </div>
                      <span className="flex items-center space-x-1 text-[9px] font-black text-emerald-400 shrink-0"><CheckCircle2 className="w-3 h-3" /><span>Verified</span></span>
                    </div>
                  </div>
                  {[
                    { label: 'Full Name (Bangla/English)', val: signupName, set: setSignupName, type: 'text', icon: User, ph: 'Enter full name' },
                    { label: 'Mobile Phone', val: signupPhone, set: setSignupPhone, type: 'tel', icon: Phone, ph: 'e.g. 01712345678' },
                  ].map(f => (
                    <div key={f.label} className="glass-soft rounded-xl p-3 mb-2 last:mb-0 border-[#24395c]">
                      <label className="text-[7.5px] text-gray-400 uppercase block font-bold tracking-widest">{f.label} <span className="text-brand-orange">*</span></label>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <f.icon className="w-3.5 h-3.5 text-brand-orange/70 shrink-0" />
                        <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="bg-transparent text-xs text-white outline-none w-full placeholder:text-gray-600" />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3 h-3 text-brand-orange" /><span>Verification Documents</span>
                  </p>
                  {[
                    { label: 'NID Number', val: signupNid, set: setSignupNid, type: 'text', icon: FileText, ph: '10+ digit national ID' },
                    { label: 'Driving License Number', val: signupLicense, set: setSignupLicense, type: 'text', icon: Truck, ph: 'e.g. DK-DL-2024-XXXXX' },
                  ].map(f => (
                    <div key={f.label} className="glass-soft rounded-xl p-3 mb-2 last:mb-0 border-[#24395c]">
                      <label className="text-[7.5px] text-gray-400 uppercase block font-bold tracking-widest">{f.label} <span className="text-brand-orange">*</span></label>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <f.icon className="w-3.5 h-3.5 text-brand-orange/70 shrink-0" />
                        <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="bg-transparent text-xs text-white outline-none w-full placeholder:text-gray-600" />
                      </div>
                    </div>
                  ))}
                  <div className="glass-soft rounded-xl p-3 border-[#24395c]">
                    <label className="text-[7.5px] text-gray-400 uppercase block font-bold tracking-widest">Driving License Expiry Date <span className="text-brand-orange">*</span></label>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-brand-orange/70 shrink-0" />
                      <input type="date" value={signupLicenseExpiry} onChange={e => setSignupLicenseExpiry(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full [color-scheme:dark]" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center space-x-1.5">
                    <Navigation className="w-3 h-3 text-brand-orange" /><span>Vehicle</span>
                  </p>
                  <div className="glass-soft rounded-xl p-3 border-[#24395c]">
                    <label className="text-[7.5px] text-gray-400 uppercase block font-bold tracking-widest">Vehicle Type <span className="text-brand-orange">*</span></label>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <Truck className="w-3.5 h-3.5 text-brand-orange/70 shrink-0" />
                      <select value={signupVehicle} onChange={e => setSignupVehicle(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full cursor-pointer">
                        {['Motorcycle (150cc)', 'Electric Scooter / EV', 'Bicycle Courier', 'Covered Van / Car'].map(v => (
                          <option key={v} value={v} className="glass-soft text-white">{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-3 border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-transparent">
                  <div className="flex items-start space-x-2">
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Your Permanent Driver ID</p>
                      <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">Auto-generated after admin approval (e.g. 3667463854). You will also receive a <b className="text-white">random secure password</b> to log in.</p>
                    </div>
                  </div>
                </div>

                <label className="flex items-start space-x-2.5 text-[9px] text-gray-300 cursor-pointer glass-soft rounded-xl p-3 border-[#24395c]">
                  <input type="checkbox" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)} className="mt-0.5 rounded border-white/20 text-brand-orange accent-brand-orange" />
                  <span className="leading-relaxed">I agree to the <button onClick={() => setAuthView('terms')} className="text-brand-orange underline hover:opacity-80">Terms & Safety Guidelines</button> and confirm the above information is accurate.</span>
                </label>
              </div>
              <button onClick={() => {
                if (!signupName.trim() || !signupPhone.trim() || !signupGmail.trim() || !signupNid.trim() || !signupLicense.trim()) {
                  showToast('Fill in your name, phone, gmail, NID and driving license first');
                  return;
                }
                if (!/^\+?88?01\d{9}$/.test(signupPhone.replace(/[^0-9]/g, ''))) { showToast('Enter a valid Bangladeshi phone number (e.g. 01712345678)'); return; }
                if (!/^[\w.+-]+@gmail\.com$/i.test(signupGmail.trim())) { showToast('Enter a valid Gmail address (name@gmail.com)'); return; }
                if (signupNid.replace(/[^0-9]/g, '').length < 10) { showToast('Enter a valid NID number (10+ digits)'); return; }
                if (signupLicense.trim().length < 5) { showToast('Enter a valid driving license number'); return; }
                if (!signupLicenseExpiry) { showToast('Enter your driving license expiry date'); return; }
                if (new Date(signupLicenseExpiry) <= new Date()) { showToast('Your driving license has expired — upload a valid one'); return; }
                if (!termsChecked) { showToast('Accept the Terms & Safety Guidelines first'); return; }
                setAuthView('docs');
              }} className="w-full py-3 bg-gradient-to-r from-brand-orange to-orange-500 hover:from-brand-orange-hover hover:to-orange-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-brand-orange/25 transition-all hover:shadow-brand-orange/40 active:scale-[0.99]">
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
              <p className="text-[10px] text-gray-400">Upload clear photos or PDFs of your official documents for dispatch approval. Any photo size works — it is auto-compressed.</p>
              <div className="space-y-2">
                {docMeta.map(docItem => (
                  <div key={docItem.key} className="glass-soft rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-white font-bold">{docItem.label}</p>
                        <p className="text-[8px] text-gray-400">{uploadedDocs[docItem.key] ? 'File saved & locked — replace to change' : (docItem.required ? 'Required — Camera, Gallery or PDF' : 'Optional — Camera, Gallery or PDF')}</p>
                      </div>
                      {uploadedDocs[docItem.key] && (
                        <button onClick={() => setUploadedDocs(prev => { const n = { ...prev }; delete n[docItem.key]; return n; })} className="text-[8px] text-red-400 hover:underline font-bold">Remove</button>
                      )}
                    </div>
                    {uploadedDocs[docItem.key] ? (
                      uploadedDocs[docItem.key].startsWith('data:application/pdf') ? (
                        <iframe title={docItem.label} src={uploadedDocs[docItem.key]} className="mt-2 w-full h-32 rounded-lg border border-emerald-500/40 bg-white" />
                      ) : (
                        <img src={uploadedDocs[docItem.key]} alt={docItem.label} className="mt-2 w-full h-32 object-cover rounded-lg border border-emerald-500/40" />
                      )
                    ) : null}
                    <div className="flex items-center space-x-2 mt-2">
                      <button onClick={() => triggerDocInput(docItem.key, 'camera')} className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer transition-all border bg-brand-orange/10 text-brand-orange border-brand-orange/30 hover:bg-brand-orange hover:text-white">
                        📷 Camera
                      </button>
                      <button onClick={() => triggerDocInput(docItem.key, 'gallery')} className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer transition-all border bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500 hover:text-white">
                        🖼️ Gallery
                      </button>
                      <button onClick={() => triggerDocInput(docItem.key, 'gallery')} className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer transition-all border bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500 hover:text-white">
                        📄 PDF
                      </button>
                      <input
                        ref={el => { docInputRefs.current[docItem.key] = el; }}
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        capture="environment"
                        className="hidden"
                        onChange={e => { handleDocFile(docItem.key, e.target.files?.[0]); e.target.value = ''; }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={submitSignup} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl shadow-lg mt-3">
                Submit Application for Approval
              </button>
            </>
          )}

          {/* ---- PENDING ---- */}
          {authView === 'pending' && (() => {
            let pendingDriver = pendingId
              ? drivers.find(d => d.id === pendingId) || null
              : null;
            if (!pendingDriver && checkStatusQuery.trim()) {
              const q = checkStatusQuery.trim().toLowerCase();
              pendingDriver = drivers.find(d =>
                d.id.toLowerCase() === q ||
                d.phone.replace(/[^0-9]/g, '').endsWith(q.replace(/[^0-9]/g, '')) ||
                (d.email || '').toLowerCase() === q
              ) || null;
            }
            const approved = pendingDriver && pendingDriver.verificationStatus === 'Verified';
            const pendingCred = pendingDriver ? getCreds()[pendingDriver.id] : undefined;
            if (!pendingDriver) {
              return (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                    <Search className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Check Your Registration Status</h4>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[280px] mx-auto">
                      Enter the permanent Driver ID, phone number or Gmail you registered with to see your application from any device.
                    </p>
                  </div>
                  <div className="glass-soft rounded-xl p-3 w-full">
                    <label className="text-[7.5px] text-gray-400 uppercase block font-bold">Driver ID / Phone / Gmail</label>
                    <input
                      type="text"
                      value={checkStatusInput}
                      onChange={e => setCheckStatusInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') setCheckStatusQuery(checkStatusInput.trim()); }}
                      placeholder="Your permanent Driver ID, phone or Gmail"
                      className="bg-transparent text-xs text-white outline-none w-full mt-1"
                    />
                  </div>
                  {checkStatusQuery.trim() && (
                    <p className="text-[10px] text-red-400 font-bold">No registration found with that ID / phone / Gmail — please check and try again.</p>
                  )}
                  <button
                    onClick={() => setCheckStatusQuery(checkStatusInput.trim())}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl shadow-lg"
                  >
                    Check Status →
                  </button>
                  <button onClick={() => setAuthView('login')} className="w-full py-2.5 glass-soft hover:bg-[#132238] text-gray-300 hover:text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer">
                    ← Back to Login
                  </button>
                </div>
              );
            }
            return (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${approved ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-amber-500/20 border border-amber-500/40 text-amber-400 animate-pulse'}`}>
                {approved ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {approved
                    ? 'Congratulations! Your account is ready.'
                    : 'Application Under Review'}
                </h4>
                <p className="text-[10px] text-gray-400 mt-1 max-w-[280px] mx-auto">
                  {approved
                    ? 'Please login with your permanent Driver ID and the password below to start earning money.'
                    : 'Our dispatch team is verifying your Driving License & NID details. Check back soon from this link.'}
                </p>
              </div>
              <div className="glass-soft rounded-xl p-3 text-left text-[10px] space-y-1.5 w-full">
                <div className="flex justify-between"><span className="text-gray-400">Permanent Driver ID:</span>
                  {approved
                    ? <span className="text-white font-mono font-bold">{pendingDriver?.id || '—'}</span>
                    : <span className="text-gray-500 italic">Assigned after approval</span>}
                </div>
                <div className="flex justify-between"><span className="text-gray-400">Name:</span><span className="text-white">{pendingDriver?.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Phone:</span><span className="text-white">{pendingDriver?.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Gmail:</span><span className="text-white truncate max-w-[150px]">{pendingDriver?.email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">NID:</span><span className="text-white font-mono">{pendingDriver?.nidNumber || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Driving License:</span><span className="text-white font-mono">{pendingDriver?.licenseNumber || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">License Expiry:</span><span className="text-white font-mono">{pendingDriver?.licenseExpiry || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Verification:</span>
                  <span className={approved ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{approved ? 'Verified' : 'Pending Review'}</span>
                </div>
                {approved && pendingCred?.password && (
                  <div className="flex justify-between items-center border-t border-[#1e3050] pt-1.5 mt-1">
                    <span className="text-gray-400">Random Password:</span>
                    <span className="text-brand-orange font-mono font-black tracking-widest cursor-pointer" onClick={() => { navigator.clipboard?.writeText(pendingCred.password); showToast('Password copied'); }}>{pendingCred.password}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button onClick={() => setAuthView('login')} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-black uppercase rounded-xl shadow-lg">
                  {approved ? 'Login with this Password →' : 'Back to Login →'}
                </button>
              </div>
            </div>
            );
          })()}

          {/* ---- FORGOT PASSWORD ---- */}
          {authView === 'forgot' && (
            <>
              <div className="flex items-center justify-between border-b border-[#1e3050] pb-2">
                <button onClick={() => setAuthView('login')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                <h4 className="text-xs font-bold text-white">Reset Driver Password</h4>
                <span className="w-4" />
              </div>
              <p className="text-[10px] text-gray-400">Enter your registered mobile phone number to receive a 6-digit OTP verification code.</p>
              <div className="glass-soft rounded-xl p-3">
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
                  <div key={term.id} className="glass-soft rounded-xl p-3">
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
              <div className="rounded-2xl p-5 bg-gradient-to-r from-brand-orange/20 via-brand-card to-brand-card border border-brand-orange/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  {me?.photo ? <img src={me.photo} alt={me.name} className="w-14 h-14 rounded-2xl object-cover border border-brand-orange/40" /> : <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-xl">{me?.name?.charAt(0).toUpperCase() || 'D'}</div>}
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},</p>
                    <p className="text-lg font-black text-white">{me?.name || 'Driver'}</p>
                    <p className="text-[10px] text-gray-400">{me?.id || '—'} · {me?.vehicleType || '—'} · {me?.currentZone || 'Unassigned Zone'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={toggleDuty} className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-colors ${online ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-gray-500/20 border-gray-500/40 text-gray-300'}`}>
                    <Power className="w-3.5 h-3.5" /><span>{online ? (activeOrder ? 'On-Delivery' : 'Online') : 'Offline'}</span>
                  </button>
                  <button onClick={handleLogout} title="Logout" className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-[10px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors">
                    <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </div>

              {/* Duty status banner */}
              {!online ? (
                <div className="rounded-2xl p-6 glass-soft text-center space-y-3">
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
                    <div className="glass-soft border border-brand-orange/40 rounded-2xl p-4 space-y-2.5 shadow-md">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-brand-orange font-black uppercase tracking-wider">Active Delivery</p>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm font-black text-white font-mono tracking-wider">#{activeOrder.id}</span>
                          <button onClick={() => copyOrderNo(activeOrder.id)} className="p-1 glass-input rounded-md cursor-pointer hover:bg-[#132238]"><Copy className="w-3 h-3 text-brand-orange" /></button>
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
                      <button onClick={() => setTab('offers')} className="relative w-14 h-14 rounded-full glass-soft border border-brand-orange/40 flex items-center justify-center cursor-pointer group" title="Check for new orders">
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
                <div className="rounded-2xl p-6 glass-soft text-center">
                  <p className="text-[11px] font-black text-red-400 uppercase">You're Offline</p>
                  <p className="text-[10px] text-gray-400 mt-1">Go online to receive order requests.</p>
                  <button onClick={toggleDuty} className="mt-3 px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-black uppercase rounded-xl">Start Working</button>
                </div>
              ) : offers.length === 0 ? (
                <div className="rounded-2xl p-8 glass-soft text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-[11px] text-white font-bold">No new orders right now</p>
                  <p className="text-[10px] text-gray-400">New dispatched orders will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {offers.map(o => {
                    const remaining = o.driverDeadline ? Math.max(0, Math.round((o.driverDeadline - now) / 1000)) : 60;
                    return (
                      <div key={o.id} className="glass-soft border border-brand-orange/30 rounded-2xl p-4 space-y-3">
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

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[9px]">
                          <div className="glass-input p-2 rounded-lg border border-[#1e3050]"><p className="text-gray-400">Total Distance</p><p className="text-white font-bold mt-0.5">{o.pickupLocation && o.address ? '~4.2 km' : '—'}</p></div>
                          <div className="glass-input p-2 rounded-lg border border-[#1e3050]"><p className="text-gray-400">Est. Time</p><p className="text-brand-orange font-bold mt-0.5">~23 min</p></div>
                          <div className="glass-input p-2 rounded-lg border border-[#1e3050]"><p className="text-gray-400">Delivery Fee</p><p className="text-emerald-400 font-bold mt-0.5">{bdt(o.deliveryCharge || 60)}</p></div>
                          <div className="glass-input p-2 rounded-lg border border-[#1e3050]"><p className="text-gray-400">Total Payable</p><p className="text-white font-bold mt-0.5">{bdt(o.amount)}</p></div>
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
                <div className="rounded-2xl p-8 glass-soft text-center space-y-2">
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
                  <div className="glass-soft rounded-2xl p-4 space-y-2 shadow-lg">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Delivery Summary</p>
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] text-gray-400 font-bold uppercase">Restaurant</span><span className="text-[10px] font-black text-white truncate">{activeOrder.storeName}</span></div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Order No.</span>
                      <span className="flex items-center space-x-1.5"><span className="text-sm font-black text-brand-orange font-mono tracking-wider">#{activeOrder.id}</span>
                        <button onClick={() => copyOrderNo(activeOrder.id)} className="p-1 glass-input rounded-md cursor-pointer hover:bg-[#132238]"><Copy className="w-3 h-3 text-brand-orange" /></button>
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
                  <div className="glass-soft rounded-2xl p-4 space-y-2.5">
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
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'glass-input text-gray-500 border border-[#1e3050]'}`}>
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
                    <div className="glass-input rounded-xl p-3">
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
                      <div className="w-full py-3 glass-soft text-gray-300 text-[10px] font-bold text-center rounded-xl">
                        Waiting for Store App to mark the order ready
                      </div>
                    )}
                    {activeOrder.driverStage === 'ready_for_pickup' && (
                      <>
                        {activeOrder.pickupPin && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase">Pickup PIN (store staff shared it)</p>
                            <input
                              value={pickupPinInput}
                              onChange={e => setPickupPinInput(e.target.value)}
                              inputMode="numeric"
                              placeholder="Enter 4-digit pickup PIN"
                              className="w-full px-3 py-2 glass-input rounded-xl text-white text-[12px] font-mono tracking-widest outline-none focus:border-brand-orange"
                            />
                          </div>
                        )}
                        <label className="w-full py-3 glass-soft border border-dashed border-[#1e3050] hover:border-brand-orange/40 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-brand-orange" />
                          <span>{pickupProofName ? `Pickup photo: ${pickupProofName}` : 'Upload pickup order photo'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => setPickupProofName(e.target.files?.[0]?.name || 'pickup.jpg')} />
                        </label>
                        <button onClick={handlePickupConfirmed} className={`w-full py-2.5 text-[11px] font-black uppercase rounded-xl shadow-lg cursor-pointer ${pickupProofName ? 'bg-brand-orange hover:bg-brand-orange-hover text-white' : 'glass-input text-gray-500 cursor-not-allowed'}`}>
                          {pickupProofName ? 'Verify PIN & Confirm Pickup' : 'Upload a pickup photo first'}
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
                          <button onClick={handleArrived} className="w-full py-2.5 glass-soft hover:bg-[#132238] text-white text-[11px] font-black uppercase rounded-xl cursor-pointer">
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
                            <label className="w-full py-3 glass-soft border border-dashed border-[#1e3050] hover:border-emerald-500/40 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
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
                                  className="w-full px-3 py-2 glass-input rounded-xl text-white text-[12px] font-mono tracking-widest outline-none focus:border-emerald-500"
                                />
                              </div>
                            )}
                            {/cash|cod/i.test(activeOrder.paymentMethod || '') && (
                              <label className="w-full py-2.5 glass-soft hover:border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                                <input type="checkbox" checked={codSettled} onChange={e => setCodSettled(e.target.checked)} className="accent-emerald-500" />
                                <span>Cash collected: {bdt(activeOrder.codAmount || activeOrder.amount)} — I'll settle to store</span>
                              </label>
                            )}
                            <button onClick={handleDeliveryProofSubmitted} className={`w-full py-2.5 text-[11px] font-black uppercase rounded-xl cursor-pointer ${deliveryProofName ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'glass-input text-gray-500 cursor-not-allowed'}`}>
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
          {tab === 'returns' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><RotateCcw className="w-4 h-4 text-brand-orange" /><span>Return Pickups</span></h3>
                <p className="text-[10px] text-gray-400">Pick up returned items from customers and bring them back to the store.</p>
              </div>
              {pickupJobs.length === 0 ? (
                <p className="text-center text-[10px] text-gray-500 py-10">No return pickups available right now.</p>
              ) : (
                <div className="space-y-2">
                  {pickupJobs.map(r => (
                    <div key={r.id} className="glass-soft rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-black text-brand-orange">#{r.id}</span>
                          <span className="text-[10px] font-mono text-gray-400">order #{r.orderId}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30 text-[8px] font-black">Pickup Approved</span>
                      </div>
                      <div className="text-[10px] text-gray-300"><b className="text-gray-200">{r.customerName || 'Customer'}</b> · {r.customerPhone || '—'} · {r.storeName || 'Smart Shop'}</div>
                      <p className="text-[9px] text-gray-400">Reason: <b className="text-gray-200">{r.reason}</b>{r.note ? ` — ${r.note}` : ''}</p>
                      <div className="flex items-center space-x-2 pt-1">
                        <button onClick={() => {
                          const next = returns.map(x => x.id === r.id ? { ...x, status: 'Completed' as any, driverId: me?.id } : x);
                          setReturns(next);
                          lsSet('sd_returns', next);
                          // Notify the customer that the item was picked up
                          setNotifications(prev => [
                            makeNotif('📦 Return Item Picked Up', `The rider picked up the item for return #${r.id} — it is on its way back to ${r.storeName || 'the store'}.`, 'order', { audience: 'customer', customerId: r.customerId || r.customerPhone }),
                            ...prev,
                          ]);
                          // Auto-create a refund request so the admin can approve the money back
                          const amount = typeof r.amount === 'number' ? r.amount : 0;
                          if (amount > 0) {
                            const refunds = lsGet<any[]>('ss_refunds', []);
                            lsSet('ss_refunds', [{
                              id: `RF-${Date.now().toString().slice(-5)}`,
                              orderId: r.orderId,
                              method: 'Smart Wallet',
                              number: 'Smart Wallet',
                              amount,
                              reason: `Return #${r.id} received — item returned to store`,
                              status: 'Requested',
                              at: Date.now(),
                              customerId: r.customerId,
                            }, ...refunds]);
                          }
                          showToast(`Return #${r.id} picked up — store notified`);
                        }} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[10px] font-black cursor-pointer transition-colors">📦 Picked Up</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'deliveries' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2"><History className="w-4 h-4 text-brand-orange" /><span>My Deliveries</span></h3>
                <p className="text-[10px] text-gray-400">Every order assigned to you — status syncs to the admin panel live.</p>
              </div>
              {myOrders.length === 0 ? <p className="text-center text-[10px] text-gray-500 py-10">No deliveries assigned yet.</p> : (
                <div className="space-y-2">
                  {myOrders.map(o => (
                    <div key={o.id} className="glass-soft rounded-2xl p-4">
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
                        <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                          <button onClick={() => setReportOpen(o.id)} className="flex items-center space-x-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-black hover:bg-red-500/20 transition-colors">
                            <AlertCircle className="w-3 h-3" /><span>Report</span>
                          </button>
                          <button onClick={() => { setTab('active'); }} className="flex items-center space-x-1.5 px-3 py-2 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange rounded-xl text-[10px] font-black hover:bg-brand-orange/25 transition-colors">
                            <Navigation className="w-3 h-3" /><span>Open Delivery</span>
                          </button>
                        </div>
                      )}
                      {o.status === 'Completed' && (
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="flex items-center space-x-1 text-[9px] text-gray-500"><Star className="w-3 h-3 text-amber-400" /><span>Rate Customer (Optional)</span></span>
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map(st => (
                              <button key={st} onClick={() => {
                                setOrders(prev => prev.map(x => x.id === o.id ? { ...x, customerRating: st } : x));
                                setCustomerRating(prev => ({ ...prev, [o.id]: st }));
                              }}
                                className={`text-sm cursor-pointer ${((o as any).customerRating || customerRating[o.id] || 0) >= st ? 'text-amber-400' : 'text-gray-600 hover:text-amber-300'}`}>★</button>
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
                  { label: "Today's Earnings", value: bdt(todayEarned), color: 'text-white' },
                  { label: 'This Week', value: bdt(weekEarned), color: 'text-white' },
                  { label: 'Pending Settlement', value: bdt(done.length ? earned : 0), color: 'text-emerald-400' },
                  { label: 'Tips', value: bdt(done.reduce((s, o) => s + (o.amount > (o.deliveryCharge || 60) + (o.codAmount || 0) ? Math.round(o.amount * 0.02) : 0), 0)), color: 'text-amber-400' },
                ].map(k => (
                  <div key={k.label} className="glass-soft rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                    <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              <div className="glass-soft rounded-2xl p-4">
                <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-2 mb-3"><BarChart3 className="w-3.5 h-3.5 text-brand-orange" /><span>Last 7 Days</span></p>
                <div className="flex items-end space-x-1.5 h-24">
                  {moneyBars.map((v, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-brand-orange/60 to-brand-orange rounded-t-md" style={{ height: `${Math.max(4, (v / Math.max(...moneyBars, 1)) * 100)}%` }} title={bdt(v)} />
                  ))}
                </div>
                <div className="flex justify-between text-[8px] text-gray-500 mt-1.5"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
              </div>

              <button onClick={() => { setWithdrawAmount(String(earned)); setWithdrawMethod('bKash'); setWithdrawOpen(true); }} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black uppercase rounded-xl cursor-pointer shadow-lg">
                Withdraw to bKash / Bank
              </button>

              <div className="glass-soft rounded-2xl p-4">
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Payout History</p>
                {txns.length === 0 ? <p className="text-[10px] text-gray-500 py-4 text-center">No payouts yet.</p> : (
                  <div className="space-y-1.5">
                    {txns.slice(0, 6).map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-2 glass-input rounded-lg px-3 py-2 text-[10px]">
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
                <div className="glass-soft rounded-2xl p-4 flex items-start space-x-3">
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
                      <div key={n.id} className={`glass-soft border rounded-xl p-3 flex items-start space-x-3 ${n.read ? 'border-[#1e3050]' : 'border-brand-orange/40'}`}>
                        <span className={`w-8 h-8 rounded-full glass-input flex items-center justify-center shrink-0 ${color}`}>
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
              <div className="glass-soft rounded-2xl p-5 text-center space-y-2">
                <button onClick={() => setTicketOpen(true)} className="w-full py-3 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/25 text-[10px] font-black uppercase rounded-xl cursor-pointer flex items-center justify-center space-x-2 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" /><span>Raise a Ticket for Admin</span>
                </button>
              </div>

              {/* My tickets */}
              <div className="space-y-1.5">
                {(() => {
                  const meTickets = tickets.filter(t => me ? (t.user || '').toLowerCase().includes(me.name.toLowerCase()) || (t.user || '').toLowerCase().includes((me.id || '').toLowerCase()) : false);
                  return (
                    <>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 font-bold uppercase text-[9px]">My Tickets ({meTickets.length})</p>
                  <button onClick={() => setTicketOpen(true)} className="text-[9px] font-black text-brand-orange uppercase tracking-wider hover:underline">+ New</button>
                </div>
                {meTickets.length === 0 ? (
                  <p className="text-[9px] text-gray-500 text-center py-3 glass-soft rounded-xl">No tickets yet — raise one and the admin will reply here.</p>
                ) : (
                  meTickets.slice(0, 5).map(t => (
                    <div key={t.id} className="glass-soft rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-mono text-gray-500">{t.id}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${t.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-300' : t.status === 'In Progress' ? 'bg-sky-500/15 text-sky-300' : 'bg-amber-500/15 text-amber-300'}`}>{t.status}</span>
                      </div>
                      <p className="text-[11px] text-white font-bold mt-1">{t.subject}</p>
                      <p className="text-[8px] text-gray-500 mt-0.5">{t.priority} priority · {t.date}</p>
                    </div>
                  ))
                )}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-1.5 text-[10px]">
                <p className="text-gray-400 font-bold uppercase text-[9px]">Frequently Asked Questions</p>
                <div className="glass-soft rounded-xl p-3">
                  <p className="text-[11px] text-white font-bold">How are weekly payouts calculated?</p>
                  <p className="text-gray-400 text-[9px] mt-0.5">Earnings are transferred every Sunday directly to your bKash or Bank account.</p>
                </div>
                <div className="glass-soft rounded-xl p-3">
                  <p className="text-[11px] text-white font-bold">What to do in case of heavy traffic / rain delay?</p>
                  <p className="text-gray-400 text-[9px] mt-0.5">Use the in-app chat button on transit view to notify the customer immediately.</p>
                </div>
                <div className="glass-soft rounded-xl p-3">
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
                  <div key={i} className="glass-soft rounded-xl p-3 flex items-center justify-between">
                    <p className="text-gray-400">{s.label}</p>
                    <p className="text-white font-bold text-[11px]">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="glass-soft rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-white">Push Notifications</p>
                  <p className="text-[8px] text-gray-400">New order, payout & support alerts</p>
                </div>
                <button onClick={() => setNotifOn(!notifOn)} className={`w-10 h-5 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${notifOn ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${notifOn ? 'ml-auto' : ''}`}></div>
                </button>
              </div>
              <div className="glass-soft rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-white">Auto-accept orders</p>
                  <p className="text-[8px] text-gray-400">{autoAccept ? 'ON — new orders are received automatically' : 'OFF — accept each order manually'}</p>
                </div>
                <button onClick={() => setAutoAccept(!autoAccept)} className={`w-10 h-5 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${autoAccept ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${autoAccept ? 'ml-auto' : ''}`}></div>
                </button>
              </div>
              <button onClick={() => showToast('NexaGo Driver v1.4.2 — you are on the latest version')} className="w-full glass-soft p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#132238]">
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
                  { label: 'Completion Rate', value: `${completionRate}%`, color: 'text-emerald-400' },
                  { label: 'On-Time Delivery', value: `${done.length ? 100 : 0}%`, color: 'text-sky-400' },
                  { label: 'Total Distance', value: `${totalKm} km`, color: 'text-brand-orange' },
                  { label: 'Customer Rating', value: `★ ${(me?.rating ?? 0).toFixed(1)}`, color: 'text-amber-400' },
                ].map(k => (
                  <div key={k.label} className="glass-soft rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{k.label}</p>
                    <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="glass-soft rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Rating Breakdown</p>
                {[5, 4, 3, 2, 1].map(r => {
                  const pct = me?.rating ? (r === Math.round(me.rating) ? 100 : 0) : 0;
                  return (
                    <div key={r} className="flex items-center space-x-2 text-[10px]">
                      <span className="w-6 text-gray-400 flex items-center"><Star className="w-3 h-3 text-amber-400" />{r}</span>
                      <div className="flex-1 h-2 glass-input rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-brand-orange" style={{ width: `${pct}%` }} /></div>
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
              <div className="glass-soft rounded-2xl p-4 h-96 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {chat.map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'You' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-[10px] ${m.from === 'You' ? 'bg-brand-orange text-white' : 'glass-input text-gray-200'}`}>
                        <p className="font-black text-[8px] uppercase tracking-wider opacity-70 mb-0.5">{m.from} · {m.time}</p>
                        <p>{m.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type a message…" className="flex-1 glass-input rounded-xl px-3 py-2.5 text-[10px] outline-none focus:border-brand-orange" />
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
              <div className="glass-soft rounded-2xl p-5 flex flex-wrap items-center gap-5">
                {me?.photo ? <img src={me.photo} alt={me.name} className="w-20 h-20 rounded-2xl object-cover border border-brand-orange/40" /> : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-orange to-orange-600 flex items-center justify-center font-black text-white text-2xl">{me?.name?.charAt(0).toUpperCase() || 'D'}</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-black text-white">{me?.name || 'Driver'}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{me?.id || '—'} · {me?.vehicleType || '—'} · {me?.currentZone || 'Unassigned Zone'}</p>
                  <div className="flex items-center space-x-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">★ {(me?.rating ?? 0).toFixed(1)} Rating</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">{me?.verificationStatus || 'Pending Audit'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">{me?.completedOrders ?? done.length} deliveries</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2.5 glass-input hover:border-emerald-500/40 text-emerald-300 rounded-xl"><Phone className="w-4 h-4" /></button>
                  <button onClick={toggleDuty} className="flex items-center space-x-2 px-4 py-2.5 bg-brand-orange/15 border border-brand-orange/40 text-brand-orange rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-orange/25 transition-colors">
                    <LogIn className="w-3.5 h-3.5" /><span>{online ? 'Go Offline' : 'Go Online'}</span>
                  </button>
                </div>
              </div>

              {/* Online / auto-accept toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="glass-soft rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className={`text-[10px] font-black ${online ? 'text-emerald-400' : 'text-red-400'}`}>{online ? "You're Online" : "You're Offline"}</p>
                    <p className="text-[8px] text-gray-400">Accept orders to start earning</p>
                  </div>
                  <button onClick={toggleDuty} className={`w-10 h-5 rounded-full p-0.5 border border-[#1e3050] transition-colors cursor-pointer ${online ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${online ? 'ml-auto' : ''}`}></div>
                  </button>
                </div>
                <div className="glass-soft rounded-2xl p-3.5 flex items-center justify-between">
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
                  { icon: LogOut, label: 'Logout', color: 'text-red-400', fn: () => handleLogout() },
                ].map(item => (
                  <button key={item.label} onClick={item.fn} className="w-full glass-soft hover:border-brand-orange/40 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors">
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
              <button onClick={() => setAuthView('signup')} className="w-full py-2.5 glass-soft hover:bg-[#132238] text-gray-300 hover:text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer">
                Start Registration →
              </button>
            </div>
          )}
        </>
      )}

      {/* ============ TICKET MODAL ============ */}
      {ticketOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setTicketOpen(false)}>
          <div className="w-full max-w-md glass-soft rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-white flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-brand-orange" />Raise a Ticket</h5>
              <button onClick={() => setTicketOpen(false)} className="w-6 h-6 rounded-full glass-input flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <p className="text-[9px] text-gray-400">Send any issue straight to the NexaGo admin — they'll reply in your tickets below.</p>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Topic</label>
              <select value={ticketTopic} onChange={e => setTicketTopic(e.target.value)} className="w-full glass-input rounded-xl px-3 py-2.5 text-[11px] text-white outline-none cursor-pointer">
                {['Payout / Earnings', 'Order / Delivery Issue', 'Account & Documents', 'Vehicle / Zone Change', 'Technical Support', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Subject</label>
              <input value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Short summary of your issue…" className="w-full glass-input rounded-xl px-3 py-2.5 text-[11px] text-white outline-none focus:border-brand-orange" />
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Priority</label>
              <select value={ticketPriority} onChange={e => setTicketPriority(e.target.value)} className="w-full glass-input rounded-xl px-3 py-2.5 text-[11px] text-white outline-none cursor-pointer">
                {['Low', 'Medium', 'High'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Description</label>
              <textarea value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} rows={3} placeholder="Explain what happened…" className="w-full glass-input rounded-xl px-3 py-2.5 text-[11px] text-white outline-none focus:border-brand-orange resize-none" />
            </div>
            <button onClick={submitTicket} className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-black uppercase rounded-xl cursor-pointer transition-colors">
              Submit Ticket
            </button>
          </div>
        </div>
      )}

      {/* ============ REPORT MODAL ============ */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setWithdrawOpen(false)}>
          <div className="w-full max-w-md glass-soft rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-white flex items-center gap-1.5"><Wallet className="w-4 h-4 text-cyan-400" />Withdraw Earnings</h5>
              <button onClick={() => setWithdrawOpen(false)} className="w-6 h-6 rounded-full glass-input flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <div className="text-center glass-input rounded-xl py-3">
              <p className="text-[8px] text-gray-400 uppercase font-black">Available Balance</p>
              <p className="text-xl font-black text-emerald-400">{bdt(earned)}</p>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Withdraw To</label>
              <div className="grid grid-cols-3 gap-2">
                {['bKash', 'Nagad', 'Bank'].map(m => (
                  <button key={m} onClick={() => setWithdrawMethod(m)} className={`py-2.5 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all ${withdrawMethod === m ? 'bg-cyan-600 text-white shadow-lg' : 'glass-input text-gray-400 hover:text-white'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Amount (৳)</label>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} min={1} max={earned} placeholder="0" className="w-full glass-input rounded-xl px-3 py-2.5 text-[11px] font-mono text-white outline-none focus:border-brand-orange" />
              <button onClick={() => setWithdrawAmount(String(earned))} className="text-[9px] text-cyan-400 font-bold mt-1 hover:underline cursor-pointer">Withdraw all ({bdt(earned)})</button>
            </div>
            <button onClick={submitWithdraw} className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer">
              Request Withdrawal
            </button>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setReportOpen(null)}>
          <div className="w-full max-w-md glass-soft rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-white flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-red-400" />Report Order #{reportOpen}</h5>
              <button onClick={() => setReportOpen(null)} className="w-6 h-6 rounded-full glass-input flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Reason</label>
              <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full glass-input rounded-xl px-3 py-2.5 text-[11px] text-white outline-none cursor-pointer">
                {['Customer unreachable', 'Wrong address', 'Order damaged', 'Payment issue', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-400 uppercase block font-black mb-1">Description</label>
              <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} rows={3} placeholder="Add details…" className="w-full glass-input rounded-xl px-3 py-2.5 text-[11px] outline-none focus:border-brand-orange resize-none" />
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
  date: string;
  placedAt?: number;
  deliveryCoords?: { lat: number; lng: number };
  pickupCoords?: { lat: number; lng: number };
};

// Great-circle distance between two coordinates in kilometres.
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

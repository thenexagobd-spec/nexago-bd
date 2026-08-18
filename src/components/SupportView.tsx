/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SupportTicket, Order, ChatLogEntry, OrderReportEntry, Driver } from '../types';
import { LifeBuoy, Check, AlertCircle, MessageSquare, Send, ArrowLeft, Clock, Search, Package, Scale, ListChecks, History, Activity, Truck, Store, UserX, FileSearch, Wand2, Zap, Timer, Users, X, Sparkles, Navigation, SearchCheck, BookOpen, Wrench, ArrowUpCircle, Smartphone, Bug, Bell, Shield, BarChart3, GitBranch, GitCommit, MessagesSquare, Terminal, Webhook, Database, ClipboardCheck, FileText, Siren, Calculator, ShieldCheck, Inbox, Hourglass, Megaphone, AlertTriangle, ClipboardList, KeyRound, Rocket, Map, Gauge, Monitor, RotateCw, Trash2, FileWarning, GraduationCap, Lock, Workflow, Fingerprint, MapPin, BellRing, IdCard, ArrowRightLeft, Wifi, LayoutTemplate, Lightbulb, Award, CalendarClock, Settings2, Globe, Download, Quote, MapPinned, RefreshCw, TrendingUp, Banknote, Tag, Percent, Star, Cpu, BookOpenCheck, Utensils, Layers, ChevronDown, ScanFace, Loader2, Plus } from 'lucide-react';

interface SupportViewProps {
  tickets: SupportTicket[];
  onReplyTicket: (id: string, text: string) => void;
  onUpdateStatus: (id: string, status: SupportTicket['status']) => void;
  orders?: Order[];
  chatLog?: ChatLogEntry[];
  reports?: OrderReportEntry[];
  onPaymentRefund?: (orderId: string, amount: number, reason: string) => void;
  onNotify?: (n: { title: string; message: string; type: 'order' | 'system' | 'driver' | 'payment'; audience?: 'all' | 'driver' | 'store' | 'store-admin' | 'admin'; driverId?: string }) => void;
  drivers?: Driver[];
  onDriversChange?: (drivers: Driver[]) => void;
}

type FaultParty = 'customer' | 'driver' | 'store';

interface FaultRecord {
  party: FaultParty;
  note: string;
  time: string;
}

interface ResolveAction {
  text: string;
  done: boolean;
}

interface LedgerEntry {
  party: FaultParty;
  type: 'credit' | 'debit';
  amount: number;
  note: string;
  time: string;
}

interface AuditEntry {
  action: string;
  detail: string;
  time: string;
}

interface ManagedUser {
  id: string;
  name: string;
  phone: string;
  type: 'customer' | 'driver' | 'store';
  status: 'active' | 'blocked' | 'pending';
  zone: string;
  added: string;
  orders: number;
  complaints: number;
  grade?: string;
  note?: string;
}

const ANALYSIS_STORAGE_KEY = 'sd_support_analysis_v1';

interface AnalysisStore {
  faults: Record<string, FaultRecord>;
  resolveActions: Record<string, ResolveAction[]>;
  ledger: Record<string, LedgerEntry[]>;
  audit: Record<string, AuditEntry[]>;
  proofs: Record<string, string[]>;
}

function loadAnalysisData(): AnalysisStore {
  try {
    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (!raw) return { faults: {}, resolveActions: {}, ledger: {}, audit: {}, proofs: {} };
    const data = JSON.parse(raw);
    return {
      faults: data.faults || {},
      resolveActions: data.resolveActions || {},
      ledger: data.ledger || {},
      audit: data.audit || {},
      proofs: data.proofs || {}
    };
  } catch {
    return { faults: {}, resolveActions: {}, ledger: {}, audit: {}, proofs: {} };
  }
}

// ================= TECHNICAL SUPPORT SYSTEM DATA =================
// All content below is bespoke to the Smart Delivery / NexaGo platform.
const TECH_CATEGORIES = ['All', 'App & UI', 'Login & Account', 'Payments & Wallet', 'Order & Checkout', 'Delivery & GPS', 'Notifications', 'Performance & Crash', 'Data & Sync', 'Security & Compliance', 'Integrations & API', 'Devices & Hardware', 'Billing & Reports'];
const TECH_PLATFORMS = ['All', 'Customer App', 'Driver App', 'Store Panel', 'Admin / Multi', 'POS Terminal', 'Web Portal'];

const KB_ARTICLES: Array<{ id: string; cat: string; platform: string; title: string; cause: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; fixes: string[] }> = [
  { id: 'KB-001', cat: 'Payments & Wallet', platform: 'Customer App', title: 'bKash paid but the order shows failed', cause: 'bKash callback did not reach the SD API within the 2-minute order window, so the order auto-failed even though the customer was debited.', severity: 'Critical', fixes: ['Open SD Payment Ops → verify the bKash txn in the SD ledger', 'Match the txn → flip the order to Paid', 'If the order was cancelled, push the amount into the SD Wallet', 'Notify the customer with the SD order ID + refund status'] },
  { id: 'KB-002', cat: 'Payments & Wallet', platform: 'Customer App', title: 'Nagad cashback not credited to the SD Wallet', cause: 'The Nagad promo cashback job skipped orders paid with a COD + wallet split.', severity: 'Medium', fixes: ['Re-run the Nagad cashback batch for the order window', 'Credit the cashback into the SD Wallet manually', 'Audit the promo rule in SD Offers'] },
  { id: 'KB-003', cat: 'Payments & Wallet', platform: 'Admin / Multi', title: 'Refund is stuck in the SD refund queue', cause: 'A pending Nagad reverse transaction is blocking the whole refund queue for that batch.', severity: 'High', fixes: ['Release the blocked reverse in the Nagad dashboard', 'Retry the refund from the SD Refund Console', 'Flip the refund to Settled in the Refund Timeline'] },
  { id: 'KB-004', cat: 'Payments & Wallet', platform: 'Customer App', title: 'Wrong amount charged on a scheduled-slot order', cause: 'The price was re-quoted after slot confirmation because the COD/wallet split was recalculated.', severity: 'High', fixes: ['Recompute with the locked slot quote', 'Refund the difference via the SD Ledger', 'Lock pricing at slot-confirm time going forward'] },
  { id: 'KB-005', cat: 'Login & Account', platform: 'Driver App', title: 'Driver cannot log in to the SD Driver App', cause: 'Driver OTP is rate-limited after 5 wrong attempts on a low-balance SIM.', severity: 'High', fixes: ['Unblock the driver in SD Driver Ops', 'Reset the driver PIN', 'Verify the driver SIM number on file'] },
  { id: 'KB-006', cat: 'Login & Account', platform: 'Customer App', title: 'Customer OTP not arriving via SMS', cause: 'SMS from the SD shortcode is queued at the telco during peak hours.', severity: 'Medium', fixes: ['Check the SD SMS queue depth', 'Fall back to the in-app call OTP', 'Re-send from the SD OTP console'] },
  { id: 'KB-007', cat: 'Login & Account', platform: 'Admin / Multi', title: 'Admin console locked after 3 MFA failures', cause: 'SD security policy locked the account automatically after repeated MFA failures.', severity: 'Medium', fixes: ['Release the lock from SD Admin Security', 'Reset the password', 'Re-enroll the admin MFA device'] },
  { id: 'KB-008', cat: 'Delivery & GPS', platform: 'Driver App', title: 'Driver GPS frozen mid-delivery', cause: 'The phone battery-optimizer killed the SD Driver background location service.', severity: 'High', fixes: ['Guide the driver to disable battery optimization for SD Driver App', 'Re-grant location permission (Allow all the time)', 'Re-sync the live tracking feed'] },
  { id: 'KB-009', cat: 'Delivery & GPS', platform: 'Driver App', title: 'Wrong route / ETA for the new Mymensingh zone', cause: 'The SD map tile cache is stale for the newly added zone, so routing uses old data.', severity: 'Medium', fixes: ['Refresh the SD map key', 'Re-baseline the zone route cache', 'Verify the delivery pin coordinates'] },
  { id: 'KB-010', cat: 'Notifications', platform: 'Customer App', title: 'Order status updates not reaching the customer', cause: 'Push throttling is applied to multi-store orders, and no SMS fallback fired.', severity: 'Medium', fixes: ['Check the SD push service load', 'Re-send the latest status push', 'Enable the SMS fallback for that order'] },
  { id: 'KB-011', cat: 'Notifications', platform: 'Driver App', title: 'Driver not ringing on new order alerts', cause: 'The driver muted the "New Order" notification channel on the device.', severity: 'High', fixes: ['Re-enable the New Order channel remotely', 'Send a test push to the driver token', 'Confirm the driver app is in the foreground'] },
  { id: 'KB-012', cat: 'Performance & Crash', platform: 'Customer App', title: 'Customer app crashes right after opening on Android 15', cause: 'SD App v2.4.0 crashes on Android 15 because of a target-SDK mismatch in the build.', severity: 'Critical', fixes: ['Roll the SD App back to v2.3.9', 'Clear cache and reinstall', 'Push the hotfix build v2.4.1'] },
  { id: 'KB-013', cat: 'Performance & Crash', platform: 'Admin / Multi', title: 'Admin dashboard is very slow to load', cause: 'The SLA breach job scans the full history because no date-range filter is applied.', severity: 'Medium', fixes: ['Restrict the report to the 7/30/90-day window', 'Purge the CDN cache for admin assets', 'Backfill the missing report indexes'] },
  { id: 'KB-014', cat: 'Performance & Crash', platform: 'Store Panel', title: 'Store panel freezes during Friday order rush', cause: 'The store panel websocket floods when live order cards exceed capacity.', severity: 'High', fixes: ['Restart the store panel session', 'Reduce the live order card count', 'Enable batching on the SD hub'] },
  { id: 'KB-015', cat: 'Data & Sync', platform: 'Admin / Multi', title: 'Paid order not showing in the admin console', cause: 'Event sync lag between the customer app and the admin console after the bKash callback.', severity: 'Critical', fixes: ['Force a re-sync from the SD Console', 'Check the event queue depth', 'Verify the order across all SD apps'] },
  { id: 'KB-016', cat: 'Data & Sync', platform: 'Store Panel', title: 'Store created a duplicate order', cause: 'The store operator double-submitted the confirm action on a slow connection.', severity: 'High', fixes: ['Merge the duplicates in the SD Order Console', 'Cancel the extra order and refund if charged', 'Add a double-submit guard to the panel'] },
  { id: 'KB-017', cat: 'Data & Sync', platform: 'Driver App', title: 'Delivery marked complete twice', cause: 'The driver retried "Complete" after a network drop, so two completion events landed.', severity: 'High', fixes: ['Reconcile the SD delivery events', 'Revert the duplicate completion', 'Reopen the delivery for the signature'] },
  { id: 'KB-018', cat: 'Order & Checkout', platform: 'Customer App', title: 'Checkout button does nothing for saved addresses', cause: 'The saved address has no area pin, so the SD checkout validation silently blocks submission.', severity: 'High', fixes: ['Ask the customer to re-add the area pin', 'Validate the pin in SD checkout', 'Complete the COD order manually'] },
  { id: 'KB-019', cat: 'Order & Checkout', platform: 'Customer App', title: 'Coupon not applying at checkout', cause: 'The coupon expired but is still listed in the SD offers carousel.', severity: 'Low', fixes: ['Hide the expired coupon from the feed', 'Apply the offer manually', 'Refresh the offer feed'] },
  { id: 'KB-020', cat: 'Order & Checkout', platform: 'Customer App', title: 'Saved address not selectable in checkout', cause: 'The saved address is missing its lat/lng, so it cannot be pinned on the map.', severity: 'Medium', fixes: ['Backfill the geocode for that address', 'Re-add the address in the SD App', 'Verify it in checkout'] },
  { id: 'KB-021', cat: 'Security & Compliance', platform: 'Admin / Multi', title: 'COD + wallet split flagged as suspicious', cause: 'The SD fraud rule fired on a high-amount COD split from a brand-new device.', severity: 'Critical', fixes: ['Review the flag in the SD Risk Desk', 'Hold the driver payout for that order', 'Verify the customer identity', 'Escalate to compliance'] },
  { id: 'KB-022', cat: 'Security & Compliance', platform: 'Driver App', title: 'Driver NID rejected at verification', cause: 'The NID photo the driver uploaded is blurred, so auto-verification failed.', severity: 'Medium', fixes: ['Request a re-upload with the retake guide', 'Verify the NID in SD Driver Ops', 'Update the verification status'] },
  { id: 'KB-023', cat: 'Integrations & API', platform: 'Store Panel', title: 'Store POS not syncing orders', cause: 'The store used an old POS API key after the monthly key rotation.', severity: 'Medium', fixes: ['Issue a new POS key', 'Re-authorize the store terminal', 'Replay the failed sync queue'] },
  { id: 'KB-024', cat: 'Integrations & API', platform: 'Admin / Multi', title: 'Webhook not firing for order events', cause: 'The endpoint returned 500 and the SD webhook dropped it after 3 retries.', severity: 'Medium', fixes: ['Verify the webhook URL + secret', 'Replay the event from the SD webhook console', 'Check the signature header'] },
  { id: 'KB-025', cat: 'Devices & Hardware', platform: 'POS Terminal', title: 'POS receipt printer not printing', cause: 'The thermal printer driver dropped after a terminal restart.', severity: 'Low', fixes: ['Reinstall the printer driver', 'Run a test print from the SD POS', 'Restart the terminal'] },
  { id: 'KB-026', cat: 'Devices & Hardware', platform: 'Store Panel', title: 'Barcode scanner not reading items', cause: 'The scanner USB re-enumerated and the camera-scan mode is off.', severity: 'Low', fixes: ['Reconnect the scanner', 'Switch to camera scan mode', 'Restart the panel'] },
  { id: 'KB-027', cat: 'Billing & Reports', platform: 'Admin / Multi', title: 'Settlement report totals mismatch', cause: 'The COD batch and the wallet batch are dated on different days, so reconciliation is off.', severity: 'High', fixes: ['Re-run the SD settlement reconciliation', 'Compare payment logs per batch', 'Adjust the driver payout statement'] },
  { id: 'KB-028', cat: 'Billing & Reports', platform: 'Driver App', title: 'Driver earnings missing from statement', cause: 'The earnings aggregation job skipped orders that had a fuel deduction.', severity: 'Medium', fixes: ['Recompute earnings with fuel deduction', 'Verify the completed deliveries', 'Refresh the driver statement'] },
  { id: 'KB-029', cat: 'App & UI', platform: 'Customer App', title: 'Product images not loading in the store feed', cause: 'The CDN origin returned 404 after the store menu sync changed image paths.', severity: 'Low', fixes: ['Purge the SD CDN cache', 'Re-upload the store images', 'Verify the storage bucket'] },
  { id: 'KB-030', cat: 'App & UI', platform: 'Customer App', title: 'Bangla text showing garbled after update', cause: 'The SD App font bundle lost the Bangla glyphs in the last update.', severity: 'Low', fixes: ['Clear the font cache', 'Reinstall the SD App', 'Ship the Bangla font bundle'] },
  { id: 'KB-031', cat: 'App & UI', platform: 'Store Panel', title: 'Menu items duplicated in the store panel', cause: 'The catalog sync duplicated the categories after a partial sync.', severity: 'Medium', fixes: ['Re-sync the catalog', 'Merge the duplicate categories', 'Refresh the menu'] },
  { id: 'KB-032', cat: 'Payments & Wallet', platform: 'Customer App', title: 'Wallet top-up not reflecting in balance', cause: 'The top-up callback is queued behind the bKash payment callback.', severity: 'High', fixes: ['Re-trigger the wallet credit job', 'Verify the SD Wallet balance', 'Credit the amount manually'] },
  { id: 'KB-033', cat: 'Data & Sync', platform: 'Driver App', title: 'Route history missing after a completed trip', cause: 'The driver GPS buffer was not flushed at the end of the trip.', severity: 'Low', fixes: ['Flush the tracking buffer', 'Backfill the route history', 'Re-verify the trip log'] },
  { id: 'KB-034', cat: 'Performance & Crash', platform: 'Customer App', title: 'App stuck on the loading spinner', cause: 'The startup API timed out on a slow 2G network.', severity: 'High', fixes: ['Check the SD API server latency', 'Retry on WiFi', 'Enable offline retry'] },
  { id: 'KB-035', cat: 'Integrations & API', platform: 'Admin / Multi', title: 'Dispute CSV export keeps failing', cause: 'The export worker runs out of memory on a 90-day dispute export.', severity: 'Medium', fixes: ['Split the export into month chunks', 'Restart the export worker', 'Retry the export'] },
  { id: 'KB-036', cat: 'Security & Compliance', platform: 'Customer App', title: 'Customer KYC stuck on "reviewing"', cause: 'The KYC queue is backlogged after the onboarding campaign signups.', severity: 'Medium', fixes: ['Prioritize the pending KYC queue', 'Verify manually in the SD Risk Desk', 'Notify the customer'] }
];

const FIX_LIBRARY = [
  'SD App → Settings → Clear Cache', 'Force-stop & restart the SD Driver App', 'Reinstall the SD App from the Play Store',
  'Update the SD App to the latest build', 'Update the Android / iOS OS version', 'Switch WiFi ↔ mobile data and retry',
  'Toggle airplane mode for 10 seconds', 'Enable auto date-time sync on the device', 'Grant location permission (Allow all the time)',
  'Enable the SD push channel in app settings', 'Grant camera / storage permission to the SD App', 'Reset the SD App preferences',
  'Check the SD service status board first', 'Re-login / refresh the SD session token', 'Disable VPN / proxy and retry',
  'Free up more than 500MB of device storage', 'Restart the device and retry', 'Check for a pending SD App update',
  'Verify the customer phone number format', 'Re-send the OTP via the call fallback', 'Check the spam block on the SD shortcode',
  'Merge the duplicate orders in the SD Console', 'Force a re-sync from SD settings', 'Purge the CDN cache for that store',
  'Re-run the settlement reconciliation job', 'Re-issue the store POS API key', 'Escalate to SD Engineering (L2)',
  'Raise a vendor ticket for the gateway (L3)', 'Freeze the payout — compliance hold (L4)', 'Verify with SD Ops and close'
];

const ESCALATION = [
  { level: 'L1', team: 'SD Support Desk', applies: 'All issues — triage, KB fixes, permission resets', sla: 'Respond in 15 min', note: 'Applies the SD playbook and verifies the service board' },
  { level: 'L2', team: 'SD Engineering (Node / Express)', applies: 'Bugs, crashes, sync errors, checkout failures', sla: 'Diagnose in 2 hrs · fix in 4 hrs', note: 'Root-cause, deploy the hotfix, patch the config' },
  { level: 'L3', team: 'Vendor Ops (bKash / Nagad / Rocket · GPS · SMS)', applies: 'Gateway outages, map and SMS vendor failures', sla: 'Vendor ticket + vendor SLA', note: 'Track the vendor status and share the ETA' },
  { level: 'L4', team: 'SD Compliance / Security', applies: 'Fraud, KYC, suspicious payout flags', sla: 'Immediate — freeze and investigate', note: 'Hold payouts and notify the affected users' }
];

const DEVICE_MATRIX = [
  { platform: 'Customer App', android: 'Android 9+ · v2.4.1', ios: 'iOS 13+ · v2.4.1', web: '—', status: 'Supported' },
  { platform: 'Driver App', android: 'Android 10+ · v3.1.0', ios: 'iOS 14+ · v3.1.0', web: '—', status: 'Supported' },
  { platform: 'Store Panel', android: 'Android 9+ · v2.2.3', ios: '—', web: 'Chrome / Edge / Firefox', status: 'Supported' },
  { platform: 'Admin Console', android: '—', ios: '—', web: 'Chrome / Edge (latest 2)', status: 'Supported' },
  { platform: 'SD POS Terminal', android: 'Android 9+ · v1.8.0', ios: '—', web: 'Local panel', status: 'Beta' }
];

const SYMPTOMS = [
  'bKash paid but order failed', 'Driver login OTP blocked', 'Customer OTP not arriving', 'App crashes on startup',
  'GPS frozen mid-delivery', 'Wrong route / ETA shown', 'Order updates not pushing', 'New order alert not ringing',
  'Order missing in admin', 'Store made a duplicate order', 'Checkout button unresponsive', 'Coupon not applying',
  'Address pin not selectable', 'Refund stuck in queue', 'Earnings mismatch on statement', 'Settlement totals mismatch',
  'POS printer not printing', 'Product images not loading', 'Data not syncing across apps', 'Admin dashboard very slow'
];

// Seed the user registry from the live order / report / chat / ticket data (persisted afterwards)
function seedUsers(orders: Order[], reports: OrderReportEntry[], chatLog: ChatLogEntry[], tickets: SupportTicket[]): ManagedUser[] {
  const out: ManagedUser[] = [];
  const added = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const cPhones: Record<string, string> = {};
  orders.forEach(o => { if (o.customerName && o.customerPhone) cPhones[o.customerName] = o.customerPhone; });
  const custNames = Array.from(new Set(orders.map(o => o.customerName).filter(Boolean)));
  custNames.forEach((name, i) => {
    const os = orders.filter(o => o.customerName === name);
    const complaints = reports.filter(r => orders.some(o => o.id === r.orderId && o.customerName === name)).length;
    out.push({ id: 'CUS' + String(i + 1).padStart(4, '0'), name, phone: cPhones[name] || '+88017' + String(12345678 + i * 1111), type: 'customer', status: 'active', zone: os.find(o => o.zone)?.zone || 'Dhaka', added, orders: os.length, complaints });
  });
  const dNames = Array.from(new Set([
    ...chatLog.filter(l => l.sender === 'driver').map(l => l.name),
    ...tickets.filter(t => /driver/i.test(t.user)).map(t => t.user.replace(/\s*\(driver\)\s*/i, '').trim())
  ].filter(Boolean)));
  dNames.forEach((name, i) => {
    out.push({ id: 'DRV' + String(i + 1).padStart(4, '0'), name, phone: '+88018' + String(23456780 + i * 2222), type: 'driver', status: 'active', zone: 'Dhaka', added, orders: 0, complaints: 0, grade: 'A', note: 'Seeded from the delivery fleet' });
  });
  const sNames = Array.from(new Set(orders.flatMap(o => [o.storeName, ...(o.extraStores || [])]).filter(Boolean)));
  sNames.forEach((name, i) => {
    const os = orders.filter(o => o.storeName === name || (o.extraStores || []).includes(name));
    const complaints = reports.filter(r => os.some(o => o.id === r.orderId)).length;
    out.push({ id: 'STR' + String(i + 1).padStart(4, '0'), name, phone: '+88019' + String(34567890 + i * 3333), type: 'store', status: 'active', zone: 'Dhaka', added, orders: os.length, complaints });
  });
  return out;
}

// Which app + code + button fixes each technical issue type (bespoke to this codebase)
const CODE_MAP: Array<{ type: string; app: string; file: string; fn: string; why: string; action: string; outcome: string }> = [
  { type: 'Payment / Transaction Error', app: 'Customer App', file: 'src/App.tsx', fn: 'onPaymentRefund / payment flow', why: 'Refund callbacks and wallet credits run through the App-level payment handlers.', action: 'Support desk → Refund → choose amount → Confirm', outcome: 'Customer credited, ledger + timeline updated' },
  { type: 'Login / Account Issue', app: 'Driver App', file: 'src/components/SupportView.tsx', fn: 'openTicket / agentOf', why: 'Ticket status and auto-assignment are resolved inside the support console.', action: 'Ticket → change status to Resolved', outcome: 'Login case closed and audited' },
  { type: 'GPS / Location Issue', app: 'Driver App', file: 'src/App.tsx', fn: 'driverDispatchOrder', why: 'Re-dispatching a pending order re-runs live tracking to a fresh driver.', action: 'OrdersView → Dispatch button', outcome: 'Fresh driver assigned, tracking resumes' },
  { type: 'Notification / SMS Issue', app: 'Customer App', file: 'src/App.tsx', fn: 'onNotify', why: 'Order/driver/payment alerts are pushed from the App-level notification handler.', action: 'Support desk → Notification draft → Copy', outcome: 'Manual notify fired to the user' },
  { type: 'App Crash / Freeze / Slow', app: 'Customer App', file: 'src/components/SupportView.tsx', fn: 'applyTechFix / techFixPlaybook', why: 'The playbook steps are recorded here and applied to the linked order.', action: 'Auto-Diagnosis → Apply Full Fix Playbook', outcome: 'Fix steps land in resolution + audit' },
  { type: 'Data Sync Issue', app: 'Admin / Multi', file: 'src/App.tsx', fn: 'handleReactivateOrder', why: 'Re-activating a cancelled order re-syncs it across all apps.', action: 'OrdersView → Reactivate order', outcome: 'Order re-appears everywhere' },
  { type: 'Install / Update Issue', app: 'Customer App', file: 'src/components/SupportView.tsx', fn: 'KB_ARTICLES KB-012', why: 'The KB article holds the rollback + hotfix steps.', action: 'Knowledge Base → Apply Article Fixes', outcome: 'Steps recorded for the linked order' },
  { type: 'General Technical Issue', app: 'Admin / Multi', file: 'src/components/SupportView.tsx', fn: 'diagnosis advisor', why: 'The playbook lists the exact next action per detected problem.', action: 'Auto-Diagnosis → follow the Fix step', outcome: 'Priority order of what to fix first' }
];

const codeForType = (type: string) => CODE_MAP.find(c => c.type === type) || CODE_MAP[CODE_MAP.length - 1];

// Third-party integrations this platform depends on (bespoke to the BD payments + logistics stack)
const INTEGRATIONS: Array<{ name: string; area: string; endpoint: string; owner: string }> = [
  { name: 'bKash Payment Gateway', area: 'Payments & Wallet', endpoint: 'api.bkash.com', owner: 'Payment Ops' },
  { name: 'Nagad Payment Gateway', area: 'Payments & Wallet', endpoint: 'api.nagad.com.bd', owner: 'Payment Ops' },
  { name: 'Rocket (Dutch-Bangla)', area: 'Payments & Wallet', endpoint: 'rocket.dutchbanglabank.com', owner: 'Payment Ops' },
  { name: 'SMS Gateway (Telco)', area: 'Notifications', endpoint: 'sms.smartdelivery.bd', owner: 'Engineering' },
  { name: 'GPS / Map Vendor', area: 'Delivery & GPS', endpoint: 'gps.smartdelivery.bd', owner: 'Engineering' },
  { name: 'Email / SMTP', area: 'Notifications', endpoint: 'smtp.smartdelivery.bd', owner: 'Support Desk' },
  { name: 'CDN / File Storage', area: 'App & UI', endpoint: 'cdn.smartdelivery.bd', owner: 'Engineering' },
  { name: 'Webhook / API Gateway', area: 'Integrations & API', endpoint: 'api.smartdelivery.bd', owner: 'Engineering' }
];

const RELEASE_NOTES: Array<{ app: string; version: string; date: string; type: 'Hotfix' | 'Feature' | 'Fix'; notes: string[] }> = [
  { app: 'Customer App', version: 'v2.4.1', date: 'May 18, 2026', type: 'Hotfix', notes: ['Fixed Android 15 crash on startup (target-SDK)', 'Fixed Bangla font rendering', 'Improved bKash callback handling'] },
  { app: 'Admin Console (Web)', version: 'v2.6.2', date: 'May 25, 2026', type: 'Fix', notes: ['Added the 7/30/90-day report range filter', 'Export worker memory fix for big disputes'] },
  { app: 'Driver App', version: 'v3.1.0', date: 'May 02, 2026', type: 'Feature', notes: ['New live route tracker', 'Earnings now include fuel deduction', 'Faster new-order alerts'] },
  { app: 'Store Panel', version: 'v2.2.3', date: 'Apr 20, 2026', type: 'Fix', notes: ['Fixed menu duplication on catalog sync', 'Added a double-submit guard on confirm'] },
  { app: 'SD POS Terminal', version: 'v1.8.0', date: 'Apr 12, 2026', type: 'Feature', notes: ['Receipt printer driver update', 'Scanner re-enumeration fix'] }
];

const API_ENDPOINTS: Array<{ method: string; endpoint: string; source: string }> = [
  { method: 'POST', endpoint: '/api/payments/bkash/callback', source: 'bKash' },
  { method: 'POST', endpoint: '/api/payments/nagad/callback', source: 'Nagad' },
  { method: 'GET', endpoint: '/api/orders/:id', source: 'Customer App' },
  { method: 'POST', endpoint: '/api/dispatch/assign', source: 'Admin Console' },
  { method: 'POST', endpoint: '/api/webhook/order-events', source: 'Store Panel' },
  { method: 'GET', endpoint: '/api/drivers/online', source: 'Driver App' },
  { method: 'POST', endpoint: '/api/sync/catalog', source: 'Store Panel' },
  { method: 'GET', endpoint: '/api/payments/refunds', source: 'Support Desk' },
  { method: 'POST', endpoint: '/api/sms/send-otp', source: 'SMS Gateway' },
  { method: 'GET', endpoint: '/api/routes/:zone', source: 'GPS / Map Vendor' }
];

const SOP_RUNBOOKS: Array<{ id: string; title: string; scope: string; steps: string[] }> = [
  { id: 'SOP-01', title: 'Payment refund runbook', scope: 'Payments & Wallet', steps: ['Verify the txn in the SD ledger', 'Confirm the amount from the auto-calculator', 'Push the credit via the Refund panel', 'Mark the refund Settled in the timeline', 'Notify the customer with the order id'] },
  { id: 'SOP-02', title: 'Driver login / OTP runbook', scope: 'Login & Account', steps: ['Check the driver SIM + account status', 'Unblock in SD Driver Ops', 'Reset the PIN', 'Re-send the OTP via call fallback', 'Verify the driver comes online'] },
  { id: 'SOP-03', title: 'Outage runbook', scope: 'System Health', steps: ['Flip the service on the health board', 'Confirm the linked incident auto-resolves', 'Run Full Diagnostics', 'Log the RCA + prevention', 'Notify stores in the affected zone'] },
  { id: 'SOP-04', title: 'Store duplicate-order runbook', scope: 'Order & Checkout', steps: ['Merge the duplicates in the SD Order Console', 'Cancel the extra order', 'Refund if charged', 'Enable the double-submit guard'] },
  { id: 'SOP-05', title: 'Settlement mismatch runbook', scope: 'Billing & Reports', steps: ['Re-run the settlement reconciliation', 'Compare payment logs per batch', 'Adjust the driver payout statement', 'Notify the affected driver'] }
];

// Feature flags / rollout — keys match real SD features
const FEATURE_FLAGS: Array<{ key: string; label: string; platform: string; desc: string }> = [
  { key: 'scheduled_slots', label: 'Scheduled delivery slots', platform: 'Customer App', desc: 'Let customers pick a future delivery slot' },
  { key: 'wallet_split', label: 'COD + wallet split payment', platform: 'Customer App', desc: 'Split an order between cash and SD Wallet' },
  { key: 'extra_stores', label: 'Multi-store (extra stores) orders', platform: 'Customer App', desc: 'One order fulfilled from several stores' },
  { key: 'fuel_deduction', label: 'Driver fuel deduction', platform: 'Driver App', desc: 'Deduct fuel cost from driver earnings' },
  { key: 'driver_scorecard', label: 'Driver A/B/C scorecard', platform: 'Admin Console', desc: 'Grade drivers by breaches, fines, complaints' },
  { key: 'csat', label: 'CSAT survey after resolution', platform: 'Customer App', desc: 'Rate satisfaction once resolution steps finish' },
  { key: 'pos_dispatch', label: 'POS counter dispatch', platform: 'POS Terminal', desc: 'Dispatch orders from the store counter' }
];

// Service dependency graph — service → services that depend on it (cascade impact)
const DEPENDENCY_MAP: Record<string, string[]> = {
  'SD App Server': ['Payment Gateway (bKash/Nagad/Rocket)', 'GPS / Map Track', 'Push + SMS Alerts', 'Store Panel Service', 'Driver App Cloud', 'CDN / File Storage', 'Webhook / API Gateway', 'Search / Catalog Index', 'Reports / Analytics', 'POS Terminal Bridge'],
  'Order DB / Sync': ['Store Panel Service', 'Driver App Cloud', 'Search / Catalog Index', 'Reports / Analytics', 'POS Terminal Bridge'],
  'Payment Gateway (bKash/Nagad/Rocket)': ['Order DB / Sync'],
  'GPS / Map Track': ['Driver App Cloud'],
  'Push + SMS Alerts': ['Driver App Cloud', 'Store Panel Service'],
  'Webhook / API Gateway': ['Store Panel Service'],
  'Store Panel Service': ['POS Terminal Bridge']
};

const AGENTS = ['Agent-1', 'Agent-2', 'Agent-3', 'Agent-4', 'Engineering', 'Payment Ops', 'Compliance'];

const REVIEW_CHECKLIST = [
  'Root cause identified (RCA logged)',
  'Incident timeline documented',
  'Customer notified of the impact',
  'Fix verified in production',
  'Prevention added to Knowledge Base'
];

const RELEASE_CHECKLIST = [
  'Production DB backup confirmed',
  'Rollback plan reviewed',
  'Automated test suite passed',
  'Release notes + KB article updated',
  'Feature flag / rollout plan set'
];

const INCIDENT_TEMPLATES: Array<{ id: string; name: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; platform: string; desc: string }> = [
  { id: 'IT-01', name: 'Full payment outage', severity: 'Critical', platform: 'Admin / Multi', desc: 'No bKash/Nagad/Rocket callbacks for 10+ min' },
  { id: 'IT-02', name: 'App-wide crash on launch', severity: 'High', platform: 'Customer App', desc: 'Crashes spike >100 in last hour on a version' },
  { id: 'IT-03', name: 'Store panel offline', severity: 'High', platform: 'Store Panel', desc: 'Single store cannot sync catalog or confirm' },
  { id: 'IT-04', name: 'OTP delivery degraded', severity: 'Medium', platform: 'Admin / Multi', desc: 'SMS vendor latency >3s on OTP' },
  { id: 'IT-05', name: 'Search results stale', severity: 'Low', platform: 'Admin / Multi', desc: 'Index sync stuck for one store' }
];

export default function SupportView({ tickets, onReplyTicket, onUpdateStatus, orders = [], chatLog = [], reports = [], onPaymentRefund, onNotify, drivers = [], onDriversChange }: SupportViewProps) {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [category, setCategory] = useState<'all' | 'customers' | 'disputes' | 'drivers' | 'technical' | 'users'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Fault / resolution / ledger records persist across refreshes
  const [faults, setFaults] = useState<Record<string, FaultRecord>>(() => loadAnalysisData().faults);
  const [resolveActions, setResolveActions] = useState<Record<string, ResolveAction[]>>(() => loadAnalysisData().resolveActions);
  const [ledger, setLedger] = useState<Record<string, LedgerEntry[]>>(() => loadAnalysisData().ledger);
  const [audit, setAudit] = useState<Record<string, AuditEntry[]>>(() => loadAnalysisData().audit);
  const [proofs, setProofs] = useState<Record<string, string[]>>(() => loadAnalysisData().proofs);
  const [faultParty, setFaultParty] = useState<FaultParty | null>(null);
  const [faultNote, setFaultNote] = useState('');
  const [faultSuggestion, setFaultSuggestion] = useState<FaultParty | null>(null);
  const [resolveInput, setResolveInput] = useState('');
  const [ledgerParty, setLedgerParty] = useState<FaultParty>('customer');
  const [ledgerType, setLedgerType] = useState<'credit' | 'debit'>('credit');
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [ledgerNote, setLedgerNote] = useState('');
  const [profileView, setProfileView] = useState<{ type: 'customer' | 'driver'; key: string; label: string } | null>(null);
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [profileMonth, setProfileMonth] = useState('all');
  const [refundItems, setRefundItems] = useState<Record<string, boolean>>({});
  const [savedTemplates, setSavedTemplates] = useState<Array<{ id: string; name: string; steps: string[] }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_support_templates_v1') || '[]'); } catch { return []; }
  });
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [range, setRange] = useState<'7' | '30' | '90' | 'all'>('all');
  const [health, setHealth] = useState<Record<string, 'Online' | 'Issue'>>({
    'SD App Server': 'Online',
    'Payment Gateway (bKash/Nagad/Rocket)': 'Online',
    'GPS / Map Track': 'Online',
    'Push + SMS Alerts': 'Online',
    'Order DB / Sync': 'Online',
    'Store Panel Service': 'Online',
    'Driver App Cloud': 'Online',
    'CDN / File Storage': 'Online',
    'Webhook / API Gateway': 'Online',
    'Search / Catalog Index': 'Online',
    'Reports / Analytics': 'Online',
    'POS Terminal Bridge': 'Online'
  });
  const [kbSearch, setKbSearch] = useState('');
  const [kbCat, setKbCat] = useState('All');
  const [kbPlat, setKbPlat] = useState('All');
  const [expandedKb, setExpandedKb] = useState<string | null>(null);
  const [diagPlat, setDiagPlat] = useState('Customer App');
  const [diagSymptom, setDiagSymptom] = useState('');
  const [knownIssues, setKnownIssues] = useState<Array<{ id: string; title: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; platform: string; status: 'Investigating' | 'Fix Deployed' | 'Resolved'; time: string; rca?: string; prevention?: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_known_issues_v1') || '[]'); } catch { return []; }
  });
  const [techAudit, setTechAudit] = useState<Array<{ action: string; detail: string; time: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_tech_audit_v1') || '[]'); } catch { return []; }
  });
  const [issueForm, setIssueForm] = useState<{ title: string; severity: string; platform: string }>({ title: '', severity: 'Medium', platform: 'Customer App' });
  const [users, setUsers] = useState<ManagedUser[]>(() => {
    try {
      const raw = localStorage.getItem('sd_users_v1');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return seedUsers(orders, reports, chatLog, tickets);
  });
  const [userSearch, setUserSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<{ name: string; phone: string; type: 'customer' | 'driver' | 'store'; zone: string }>({ name: '', phone: '', type: 'customer', zone: '' });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [userEdit, setUserEdit] = useState<{ name: string; phone: string; zone: string; note: string }>({ name: '', phone: '', zone: '', note: '' });
  const [integrations, setIntegrations] = useState<Record<string, { status: 'Connected' | 'Degraded' | 'Down'; lastSync: string; note: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_integrations_v1');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return Object.fromEntries(INTEGRATIONS.map(i => [i.name, { status: 'Connected' as const, lastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), note: 'Healthy' }]));
  });
  const [maintenance, setMaintenance] = useState<Array<{ id: string; service: string; title: string; status: 'Scheduled' | 'Ongoing' | 'Done'; time: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_maintenance_v1') || '[]'); } catch { return []; }
  });
  const [maintForm, setMaintForm] = useState<{ service: string; title: string }>({ service: 'SD App Server', title: '' });
  const [backlog, setBacklog] = useState<Array<{ id: string; task: string; priority: 'Low' | 'Medium' | 'High' | 'Critical'; assignee: string; status: 'Todo' | 'In Progress' | 'Done' }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_backlog_v1') || '[]'); } catch { return []; }
  });
  const [backlogForm, setBacklogForm] = useState<{ task: string; priority: string; assignee: string }>({ task: '', priority: 'Medium', assignee: 'Agent-1' });
  const [bugForm, setBugForm] = useState<{ title: string; app: string; version: string; device: string; severity: string; repro: string }>({ title: '', app: 'Customer App', version: '', device: '', severity: 'Medium', repro: '' });
  const [diagReport, setDiagReport] = useState<{ time: string; checks: Array<{ label: string; result: 'Pass' | 'Warn' | 'Fail'; detail: string }> } | null>(null);
  const [rcaOpen, setRcaOpen] = useState<string | null>(null);
  const [rcaForm, setRcaForm] = useState<{ root: string; prevention: string }>({ root: '', prevention: '' });
  const [slaConfig, setSlaConfig] = useState<Record<'Critical' | 'High' | 'Medium' | 'Low', number>>(() => {
    try {
      const raw = localStorage.getItem('sd_sla_targets_v1');
      if (raw) return { Critical: 15, High: 60, Medium: 240, Low: 1440, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { Critical: 15, High: 60, Medium: 240, Low: 1440 };
  });
  const [apiLog, setApiLog] = useState<Array<{ time: string; method: string; endpoint: string; status: number; ms: number; source: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_apilog_v1');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), method: 'POST', endpoint: '/api/payments/bkash/callback', status: 200, ms: 212, source: 'bKash' },
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), method: 'GET', endpoint: '/api/orders/:id', status: 200, ms: 48, source: 'Customer App' },
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), method: 'POST', endpoint: '/api/dispatch/assign', status: 202, ms: 94, source: 'Admin Console' },
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), method: 'POST', endpoint: '/api/webhook/order-events', status: 500, ms: 1305, source: 'Store Panel' }
    ];
  });
  const [alertRules, setAlertRules] = useState<Array<{ id: string; rule: string; enabled: boolean; action: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_alertrules_v1');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [
      { id: 'AR-1', rule: 'Auto-escalate any service outage to L2 Engineering', enabled: true, action: 'Raise engineering / vendor ticket' },
      { id: 'AR-2', rule: 'Notify the on-call agent when 3+ incidents are open at once', enabled: true, action: 'Ping the support queue' },
      { id: 'AR-3', rule: 'Critical-incident SLA breach → auto-fine the relevant party', enabled: false, action: 'Apply the SD auto-fine' },
      { id: 'AR-4', rule: 'Payment gateway degraded for 10 min → pause wallet top-ups', enabled: false, action: 'Block the wallet credit job' },
      { id: 'AR-5', rule: 'Duplicate order detected → auto-flag for Bulk Resolution', enabled: true, action: 'Add to the bulk queue' },
      { id: 'AR-6', rule: 'Fraud flag on a payout → hold the payout automatically', enabled: true, action: 'Freeze in the SD Risk Desk' }
    ];
  });
  const [securityEvents, setSecurityEvents] = useState<Array<{ time: string; type: string; detail: string; severity: 'Low' | 'Medium' | 'High' | 'Critical' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_sec_events_v1');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return [
      { time: t, type: 'Login from new device', detail: 'CUS-0003 · Android · Mirpur, Dhaka', severity: 'Medium' },
      { time: t, type: 'OTP retry flood', detail: 'DRV-0002 · 8 attempts in 5 min', severity: 'High' },
      { time: t, type: 'Fraud flag raised', detail: 'COD + wallet split · new device · Tk 4,250', severity: 'Critical' },
      { time: t, type: 'Payout held', detail: 'Driver payout frozen by compliance', severity: 'High' },
      { time: t, type: 'Document rejected', detail: 'NID photo blurred · DRV-0004', severity: 'Low' }
    ];
  });
  const [securityScore, setSecurityScore] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('sd_sec_score_v1') || '88', 10); } catch { return 88; }
  });
  const [runbookOpen, setRunbookOpen] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sd_featureflags_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object' && !Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return Object.fromEntries(FEATURE_FLAGS.map(f => [f.key, true]));
  });
  const [changes, setChanges] = useState<Array<{ id: string; title: string; service: string; type: string; risk: 'Low' | 'Medium' | 'High'; status: 'Proposed' | 'Approved' | 'Deployed' | 'Rolled Back'; by: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_changes_v1') || '[]'); } catch { return []; }
  });
  const [changeForm, setChangeForm] = useState<{ title: string; service: string; type: string; risk: string; by: string }>({ title: '', service: 'SD App Server', type: 'Config', risk: 'Medium', by: 'Agent-1' });
  const [warroom, setWarroom] = useState<Array<{ id: string; text: string; by: string; time: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_warroom_v1') || '[]'); } catch { return []; }
  });
  const [warroomText, setWarroomText] = useState('');
  const [logs, setLogs] = useState<Array<{ id: string; time: string; level: 'INFO' | 'WARN' | 'ERROR'; service: string; message: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_logs_v1') || '[]'); } catch { return []; }
  });
  const [logSearch, setLogSearch] = useState('');
  const [logLevel, setLogLevel] = useState('ALL');
  const [webhooks, setWebhooks] = useState<Array<{ id: string; event: string; target: string; status: 'Success' | 'Failed' | 'Retrying'; attempts: number; time: string; payload: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('sd_webhooks_v1') || '[]'); } catch { return []; }
  });
  const [backups, setBackups] = useState<Array<{ id: string; db: string; last: string; status: 'Success' | 'Failed'; size: string; retention: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_backups_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'BKP-ORD', db: 'Orders DB', last: '03:10 AM', status: 'Success', size: '1.2 GB', retention: '30 days' },
      { id: 'BKP-USR', db: 'Users & Auth DB', last: '03:22 AM', status: 'Success', size: '840 MB', retention: '30 days' },
      { id: 'BKP-LDG', db: 'Ledger & Payments DB', last: '03:35 AM', status: 'Success', size: '610 MB', retention: '90 days' },
      { id: 'BKP-AUD', db: 'Audit Log DB', last: '03:40 AM', status: 'Success', size: '2.1 GB', retention: '180 days' }
    ];
  });
  const [digest, setDigest] = useState<{ enabled: boolean; cadence: 'Daily' | 'Weekly'; sections: Record<string, boolean> }>(() => {
    try {
      const raw = localStorage.getItem('sd_digest_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object' && typeof p.enabled === 'boolean' && (p.cadence === 'Daily' || p.cadence === 'Weekly') && p.sections && typeof p.sections === 'object') {
          return { enabled: p.enabled, cadence: p.cadence, sections: { health: !!p.sections.health, incidents: !!p.sections.incidents, integrations: !!p.sections.integrations, backlog: !!p.sections.backlog, security: !!p.sections.security } };
        }
      }
    } catch { /* ignore */ }
    return { enabled: true, cadence: 'Weekly', sections: { health: true, incidents: true, integrations: true, backlog: true, security: true } };
  });
  const [reviewIncident, setReviewIncident] = useState('');
  const [reviews, setReviews] = useState<Record<string, Array<{ label: string; done: boolean }>>>(() => {
    try {
      const raw = localStorage.getItem('sd_reviews_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object' && !Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return {};
  });
  const [sosAlerts, setSosAlerts] = useState<Array<{ id: string; driver: string; order: string; location: string; time: string; status: 'Received' | 'Dispatch' | 'Resolved' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_sos_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'SOS-1001', driver: 'D-3011', order: 'ORDER-1042', location: 'Mirpur-10 near Interchange', time: '3 min ago', status: 'Received' },
      { id: 'SOS-1002', driver: 'D-3004', order: 'ORDER-1039', location: 'Bashundhara Gate 2', time: '22 min ago', status: 'Dispatch' },
      { id: 'SOS-1003', driver: 'D-3017', order: 'ORDER-1040', location: 'Uttara Sector 7', time: '1 h ago', status: 'Resolved' }
    ];
  });
  const [sevCalc, setSevCalc] = useState<{ impact: string; scope: string; workaround: string }>({ impact: 'Payments', scope: '5–25%', workaround: 'None' });
  const [drDrills, setDrDrills] = useState<Array<{ id: string; tier: string; rpo: string; rto: string; lastDrill: string; status: 'Ready' | 'At risk' | 'Overdue' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_dr_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'DR-ORD', tier: 'Orders DB', rpo: '15 min', rto: '1 h', lastDrill: '12 Jul 2026', status: 'Ready' },
      { id: 'DR-LDG', tier: 'Ledger & Payments DB', rpo: '5 min', rto: '30 min', lastDrill: '3 Jul 2026', status: 'Ready' },
      { id: 'DR-AUD', tier: 'Audit Log DB', rpo: '1 h', rto: '4 h', lastDrill: '21 May 2026', status: 'At risk' },
      { id: 'DR-PAY', tier: 'Payment gateway config', rpo: '10 min', rto: '1 h', lastDrill: '8 Apr 2026', status: 'Overdue' }
    ];
  });
  const [smsBal, setSmsBal] = useState<Array<{ id: string; vendor: string; channel: string; quota: number; used: number; resets: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_smsbal_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'SMS-BK', vendor: 'bKash SMS', channel: 'OTP + alerts', quota: 50000, used: 45400, resets: '1st of month' },
      { id: 'SMS-NG', vendor: 'Nagad SMS', channel: 'OTP + alerts', quota: 20000, used: 12400, resets: '1st of month' },
      { id: 'SMS-RK', vendor: 'Rocket SMS', channel: 'OTP + alerts', quota: 10000, used: 8100, resets: '1st of month' },
      { id: 'PUSH-FCM', vendor: 'Firebase Push', channel: 'Order notifications', quota: 400000, used: 321000, resets: 'monthly' }
    ];
  });
  const [debt, setDebt] = useState<Array<{ id: string; item: string; type: 'Endpoint' | 'App version' | 'API' | 'Config'; eol: string; owner: string; status: 'On track' | 'At risk' | 'Overdue' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_debt_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'DEP-001', item: '/api/orders/legacy-status endpoint', type: 'Endpoint', eol: '30 Jun 2026', owner: 'Engineering', status: 'Overdue' },
      { id: 'DEP-002', item: 'Customer App v2.2.3 (min supported)', type: 'App version', eol: '15 Jul 2026', owner: 'Engineering', status: 'At risk' },
      { id: 'DEP-003', item: 'Nagad v1 sandbox credentials', type: 'Config', eol: '31 Aug 2026', owner: 'Payment Ops', status: 'On track' },
      { id: 'DEP-004', item: 'Store Panel Node 16 runtime', type: 'Config', eol: '1 Aug 2026', owner: 'Engineering', status: 'At risk' }
    ];
  });
  const [debtForm, setDebtForm] = useState<{ item: string; type: string; eol: string; owner: string }>({ item: '', type: 'Endpoint', eol: '', owner: 'Engineering' });
  const [broadcasts, setBroadcasts] = useState<Array<{ id: string; audience: string; title: string; body: string; scheduled: string; total: number; sent: number; delivered: number; opened: number; time: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_broadcast_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'BC-2001', audience: 'All customers', title: 'Scheduled slots now live!', body: 'Pick your delivery time in the app.', scheduled: 'Sent now', total: 12500, sent: 12500, delivered: 11920, opened: 6420, time: 'Today 09:15' },
      { id: 'BC-2000', audience: 'Drivers', title: 'Fuel deduction update', body: 'Check the new earnings breakdown.', scheduled: 'Sent Mon', total: 3500, sent: 3480, delivered: 3310, opened: 2050, time: 'Mon 18:40' }
    ];
  });
  const [bcForm, setBcForm] = useState<{ audience: string; title: string; body: string; when: string }>({ audience: 'All customers', title: '', body: '', when: 'Now' });
  const [fraudQueue, setFraudQueue] = useState<Array<{ id: string; order: string; customer: string; amount: string; reason: string; flag: 'Duplicate claim' | 'Device mismatch' | 'Speed-of-claim' | 'Suspicious pattern'; status: 'Queued' | 'Approved' | 'Rejected' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_fraudq_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [];
  });
  const [approvals, setApprovals] = useState<Array<{ id: string; type: string; subject: string; by: string; time: string; status: 'Pending' | 'Approved' | 'Rejected' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_approvals_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'AP-301', type: 'Driver reactivation', subject: 'D-3008 — suspended 14 days ago', by: 'Driver Ops', time: '2 h ago', status: 'Pending' },
      { id: 'AP-302', type: 'Store onboarding', subject: 'S-21 — Mirpur Bazar (new store)', by: 'Sales', time: '5 h ago', status: 'Pending' },
      { id: 'AP-303', type: 'Payout hold release', subject: 'Ledger batch L-88 — ৳ 42,500', by: 'Payment Ops', time: '1 d ago', status: 'Pending' },
      { id: 'AP-304', type: 'KYC escalation', subject: 'Customer A. Hasan — NID re-verify', by: 'Compliance', time: '1 d ago', status: 'Pending' }
    ];
  });
  const [certs, setCerts] = useState<Array<{ id: string; item: string; type: 'SSL' | 'API Key' | 'Contract' | 'License'; expires: string; days: number; owner: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_certs_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'CRT-01', item: 'nexago.com wildcard SSL', type: 'SSL', expires: '12 Aug 2026', days: 6, owner: 'Engineering' },
      { id: 'CRT-02', item: 'bKash merchant API key', type: 'API Key', expires: '5 Nov 2026', days: 91, owner: 'Payment Ops' },
      { id: 'CRT-03', item: 'Nagad gateway contract', type: 'Contract', expires: '31 Dec 2026', days: 147, owner: 'Payment Ops' },
      { id: 'CRT-04', item: 'Map SDK commercial license', type: 'License', expires: '22 Sep 2026', days: 47, owner: 'Engineering' },
      { id: 'CRT-05', item: 'SMS vendor annual plan', type: 'Contract', expires: '2 Mar 2027', days: 208, owner: 'Compliance' }
    ];
  });
  const [relCheck, setRelCheck] = useState('');
  const [relChecks, setRelChecks] = useState<Record<string, Array<{ label: string; done: boolean }>>>(() => {
    try {
      const raw = localStorage.getItem('sd_relcheck_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object' && !Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return {};
  });
  const [zones, setZones] = useState<Array<{ id: string; name: string; orders: number; drivers: number; avgMin: number; status: 'Normal' | 'Congested' | 'Outage' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_zones_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'ZN-Utt', name: 'Uttara Sector 6', orders: 142, drivers: 38, avgMin: 42, status: 'Normal' },
      { id: 'ZN-Mir', name: 'Mirpur-10', orders: 210, drivers: 51, avgMin: 55, status: 'Congested' },
      { id: 'ZN-Dha', name: 'Dhanmondi', orders: 96, drivers: 27, avgMin: 38, status: 'Normal' },
      { id: 'ZN-Bas', name: 'Bashundhara', orders: 175, drivers: 44, avgMin: 49, status: 'Normal' },
      { id: 'ZN-Khi', name: 'Khilgaon', orders: 88, drivers: 22, avgMin: 58, status: 'Congested' },
      { id: 'ZN-Mot', name: 'Motijheel', orders: 64, drivers: 18, avgMin: 45, status: 'Normal' },
      { id: 'ZN-Ban', name: 'Banani', orders: 120, drivers: 33, avgMin: 41, status: 'Normal' },
      { id: 'ZN-Gul', name: 'Gulshan', orders: 78, drivers: 24, avgMin: 36, status: 'Normal' },
      { id: 'ZN-Tej', name: 'Tejgaon', orders: 51, drivers: 15, avgMin: 44, status: 'Normal' },
      { id: 'ZN-Moh', name: 'Mohammadpur', orders: 133, drivers: 36, avgMin: 52, status: 'Normal' }
    ];
  });
  const [rateLimits, setRateLimits] = useState<Array<{ id: string; endpoint: string; limit: number; window: string; enforce: boolean }>>(() => {
    try {
      const raw = localStorage.getItem('sd_ratelimit_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'RL-01', endpoint: '/api/auth/login', limit: 10, window: 'per 5 min', enforce: true },
      { id: 'RL-02', endpoint: '/api/sms/send-otp', limit: 5, window: 'per 10 min', enforce: true },
      { id: 'RL-03', endpoint: '/api/payments/refunds', limit: 20, window: 'per hour', enforce: true },
      { id: 'RL-04', endpoint: '/api/dispatch/assign', limit: 60, window: 'per minute', enforce: false },
      { id: 'RL-05', endpoint: '/api/webhook/order-events', limit: 120, window: 'per minute', enforce: false }
    ];
  });
  const [sessions, setSessions] = useState<Array<{ id: string; user: string; role: string; ip: string; device: string; last: string; status: 'Active' | 'Revoked' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_sessions_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'SS-501', user: 'admin@nexago', role: 'Super Admin', ip: '103.67.15.22', device: 'Chrome / Windows', last: 'now', status: 'Active' },
      { id: 'SS-502', user: 'support1@nexago', role: 'Support Agent', ip: '203.76.91.4', device: 'Firefox / Windows', last: '2 min ago', status: 'Active' },
      { id: 'SS-503', user: 'store.s14@nexago', role: 'Store Admin', ip: '114.130.20.71', device: 'Edge / Windows', last: '18 min ago', status: 'Active' },
      { id: 'SS-504', user: 'finance@nexago', role: 'Finance', ip: '45.83.11.9', device: 'Safari / macOS', last: '1 h ago', status: 'Active' },
      { id: 'SS-505', user: 'driver.ops@nexago', role: 'Driver Ops', ip: '197.45.60.3', device: 'Chrome / Android', last: '3 h ago', status: 'Active' }
    ];
  });
  const [searchIdx, setSearchIdx] = useState<Array<{ id: string; store: string; docs: number; pending: number; lastSync: string; status: 'Synced' | 'Syncing' | 'Stale' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_searchidx_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'SI-01', store: 'All stores (global)', docs: 128000, pending: 0, lastSync: 'Today 05:30', status: 'Synced' },
      { id: 'SI-02', store: 'S-14 Dhanmondi', docs: 8200, pending: 12, lastSync: 'Today 09:00', status: 'Stale' },
      { id: 'SI-03', store: 'S-05 Bashundhara', docs: 11400, pending: 0, lastSync: 'Today 06:40', status: 'Synced' },
      { id: 'SI-04', store: 'S-09 Uttara', docs: 9600, pending: 3, lastSync: 'Today 10:15', status: 'Syncing' },
      { id: 'SI-05', store: 'S-21 Mirpur Bazar', docs: 450, pending: 450, lastSync: 'Never', status: 'Stale' }
    ];
  });
  const [retention, setRetention] = useState<Array<{ id: string; dataType: string; keepFor: number; unit: string; nextPurge: string; lastPurge: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_retention_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'RT-01', dataType: 'Support chat messages', keepFor: 180, unit: 'days', nextPurge: 'Aug 15', lastPurge: 'May 15' },
      { id: 'RT-02', dataType: 'API request logs', keepFor: 90, unit: 'days', nextPurge: 'Aug 01', lastPurge: 'Jul 01' },
      { id: 'RT-03', dataType: 'Audit trail entries', keepFor: 365, unit: 'days', nextPurge: 'Jan 01', lastPurge: 'Jan 01' },
      { id: 'RT-04', dataType: 'Delivery proof photos', keepFor: 90, unit: 'days', nextPurge: 'Aug 10', lastPurge: 'May 10' },
      { id: 'RT-05', dataType: 'OTP verification records', keepFor: 30, unit: 'days', nextPurge: 'Aug 06', lastPurge: 'Jul 06' }
    ];
  });
  const [crashes, setCrashes] = useState<Array<{ id: string; app: string; version: string; device: string; error: string; users: number; time: string; status: 'New' | 'Triaged' | 'Fixed' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_crashes_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'CR-701', app: 'Driver App', version: 'v3.1.0', device: 'Redmi Note 12', error: 'TypeError on extraStores receipt preview', users: 23, time: '2 h ago', status: 'New' },
      { id: 'CR-702', app: 'Customer App', version: 'v2.4.1', device: 'Samsung A34', error: 'Null pointer on bKash callback parse', users: 9, time: '5 h ago', status: 'Triaged' },
      { id: 'CR-703', app: 'Store Panel', version: 'v2.2.3', device: 'Intel NUC / Windows', error: 'Memory leak on 3h catalog sync', users: 4, time: '1 d ago', status: 'New' },
      { id: 'CR-704', app: 'SD POS Terminal', version: 'v1.8.0', device: 'ZKTeco K40', error: 'Printer queue stuck after paper jam', users: 2, time: '2 d ago', status: 'Fixed' }
    ];
  });
  const [allowlist, setAllowlist] = useState<Array<{ id: string; target: string; ip: string; note: string; enabled: boolean }>>(() => {
    try {
      const raw = localStorage.getItem('sd_allowlist_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'IP-01', target: 'Store Panel', ip: '103.67.0.0/16', note: 'Dhaka HQ office', enabled: true },
      { id: 'IP-02', target: 'Admin Console', ip: '103.67.15.0/24', note: 'NexaGo HQ', enabled: true },
      { id: 'IP-03', target: 'Store Panel', ip: '45.83.11.0/24', note: 'Chattogram office', enabled: true },
      { id: 'IP-04', target: 'Admin Console', ip: '197.45.60.0/24', note: 'Karwan Bazar DC', enabled: false }
    ];
  });
  const [allowForm, setAllowForm] = useState<{ target: string; ip: string; note: string }>({ target: 'Store Panel', ip: '', note: '' });
  const [pipeline, setPipeline] = useState<Array<{ id: string; app: string; staging: string; prod: string; stagedAt: string; prodAt: string; status: 'Staged' | 'Live' | 'Rolled back' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_pipeline_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'PL-01', app: 'Customer App', staging: 'v2.4.1', prod: 'v2.4.0', stagedAt: 'Today 09:00', prodAt: 'May 18', status: 'Staged' },
      { id: 'PL-02', app: 'Admin Console (Web)', staging: 'v2.6.2', prod: 'v2.6.1', stagedAt: 'Yesterday 16:30', prodAt: 'May 25', status: 'Live' },
      { id: 'PL-03', app: 'Driver App', staging: 'v3.1.0', prod: 'v3.0.9', stagedAt: 'Mon 11:00', prodAt: 'May 02', status: 'Live' },
      { id: 'PL-04', app: 'Store Panel', staging: 'v2.2.3', prod: 'v2.2.2', stagedAt: 'Yesterday 14:00', prodAt: 'Apr 20', status: 'Staged' }
    ];
  });
  const [pwPolicy, setPwPolicy] = useState<{ minLen: number; special: boolean; expireDays: number; lockout: number }>(() => {
    try {
      const raw = localStorage.getItem('sd_pwpolicy_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') return { minLen: p.minLen || 8, special: !!p.special, expireDays: p.expireDays || 90, lockout: p.lockout || 5 };
      }
    } catch { /* ignore */ }
    return { minLen: 8, special: true, expireDays: 90, lockout: 5 };
  });
  const [lockCfg, setLockCfg] = useState<{ masterEnabled: boolean; pinEnabled: boolean; pinLen: number; passcodeEnabled: boolean; passcodeLen: number; faceEnabled: boolean; faceConfidence: number; passwordEnabled: boolean; passwordLen: number; autoLockMin: number; maxAttempts: number }>(() => {
    try {
      const raw = localStorage.getItem('sd_locks_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') return {
          masterEnabled: p.masterEnabled !== false,
          pinEnabled: p.pinEnabled !== false,
          pinLen: p.pinLen || 6,
          passcodeEnabled: p.passcodeEnabled !== false,
          passcodeLen: p.passcodeLen || 8,
          faceEnabled: !!p.faceEnabled,
          faceConfidence: p.faceConfidence || 92,
          passwordEnabled: p.passwordEnabled !== false,
          passwordLen: p.passwordLen || 12,
          autoLockMin: p.autoLockMin || 5,
          maxAttempts: p.maxAttempts || 5
        };
      }
    } catch { /* ignore */ }
    return { masterEnabled: true, pinEnabled: true, pinLen: 6, passcodeEnabled: true, passcodeLen: 8, faceEnabled: true, faceConfidence: 92, passwordEnabled: true, passwordLen: 12, autoLockMin: 5, maxAttempts: 5 };
  });
  const [accessModes, setAccessModes] = useState<Array<{ id: string; name: string; level: 'Full' | 'Edit' | 'View' | 'None' }>>(() => {    try {
      const raw = localStorage.getItem('sd_access_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'tickets', name: 'Support Tickets', level: 'Full' },
      { id: 'orders', name: 'Orders & Refunds', level: 'Full' },
      { id: 'users', name: 'User Management', level: 'Full' },
      { id: 'drivers', name: 'Drivers & Payouts', level: 'Full' },
      { id: 'stores', name: 'Stores & Menus', level: 'Full' },
      { id: 'promos', name: 'Promos & Pricing', level: 'Full' },
      { id: 'security', name: 'Security & Locks', level: 'Full' },
      { id: 'tech', name: 'Tech Config & Releases', level: 'Full' },
      { id: 'reports', name: 'Reports & Exports', level: 'Full' },
      { id: 'driver-app', name: 'Driver App', level: 'Full' },
      { id: 'customer-app', name: 'Customer App', level: 'Full' },
      { id: 'store-app', name: 'Store App', level: 'Full' },
      { id: 'store-admin-app', name: 'Store Admin App', level: 'Full' },
      { id: 'super-admin-app', name: 'Super Admin App', level: 'Full' }
    ];
  });
  const [newAppName, setNewAppName] = useState('');
  const [launchedApp, setLaunchedApp] = useState<{ name: string; stage: number; steps: Array<{ label: string; status: 'waiting' | 'running' | 'ok' | 'warn' }>; issues: string[]; booted: boolean } | null>(null);
  const [realSession, setRealSession] = useState<{ code: string; shareUrl: string; status: 'idle' | 'waiting' | 'sharing' | 'live' | 'offline' | 'error' }>({ code: '', shareUrl: '', status: 'idle' });
  const [realStream, setRealStream] = useState<MediaStream | null>(null);
  const [realMode, setRealMode] = useState<'screen' | 'camera'>('screen');
  const [peerDevice, setPeerDevice] = useState<{ os?: string; browser?: string; isMobile?: boolean; isWebView?: boolean; ua?: string; gdm?: boolean; secure?: boolean; mediaDevices?: boolean } | null>(null);
  const [shareStatus, setShareStatus] = useState<{ state: string; message: string } | null>(null);
  const realWsRef = useRef<WebSocket | null>(null);
  const realPcRef = useRef<RTCPeerConnection | null>(null);
  const realVideoRef = useRef<HTMLVideoElement | null>(null);
  const [superAdmin, setSuperAdmin] = useState(() => {
    try { return localStorage.getItem('sd_superadmin_v1') !== 'off'; } catch { return true; }
  });
  const [geofence, setGeofence] = useState<Array<{ id: string; driver: string; zone: string; event: string; time: string; status: 'Open' | 'Reviewed' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_geofence_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'GF-901', driver: 'D-3011', zone: 'Mirpur-10', event: 'Left service area 1.4 km', time: '12 min ago', status: 'Open' },
      { id: 'GF-902', driver: 'D-3008', zone: 'Khilgaon', event: 'Speed anomaly 78 km/h', time: '38 min ago', status: 'Open' },
      { id: 'GF-903', driver: 'D-3014', zone: 'Gulshan', event: 'Entered no-go zone (park)', time: '1 h ago', status: 'Reviewed' },
      { id: 'GF-904', driver: 'D-3021', zone: 'Uttara', event: 'Off-route deviation 2.9 km', time: '3 h ago', status: 'Reviewed' }
    ];
  });
  const [smsTpls, setSmsTpls] = useState<Array<{ id: string; name: string; channel: string; body: string; updated: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_smstpl_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'TPL-01', name: 'OTP login (customer)', channel: 'SMS · bKash', body: 'Your NexaGo OTP is {otp}. Valid for 5 minutes. Never share it with anyone.', updated: 'May 12' },
      { id: 'TPL-02', name: 'Order confirmed', channel: 'SMS · Nagad', body: 'Hi {name}, your order {order} is confirmed. Store {store} is preparing it.', updated: 'May 20' },
      { id: 'TPL-03', name: 'Driver assigned', channel: 'SMS · Rocket', body: 'Your rider {driver} is on the way with order {order}. Track live in the app.', updated: 'Jun 02' },
      { id: 'TPL-04', name: 'Delivery reminder', channel: 'SMS · bKash', body: 'Reminder: your NexaGo delivery for {order} arrives in 30 minutes.', updated: 'Jun 15' },
      { id: 'TPL-05', name: 'Out-of-stock alert', channel: 'SMS · Nagad', body: 'Sorry {name}, an item in {order} is unavailable. A refund will follow automatically.', updated: 'Jul 01' }
    ];
  });
  const [driverDocs, setDriverDocs] = useState<Array<{ id: string; driver: string; doc: string; no: string; expires: string; days: number; status: 'Valid' | 'Expiring' | 'Expired' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_driverdocs_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'DD-01', driver: 'D-3011', doc: 'Driving license', no: 'DL-7654321', expires: '18 Aug 2026', days: 12, status: 'Expiring' },
      { id: 'DD-02', driver: 'D-3004', doc: 'National ID (NID)', no: '4414-8891-0237', expires: '10 Nov 2026', days: 96, status: 'Valid' },
      { id: 'DD-03', driver: 'D-3017', doc: 'Vehicle fitness cert', no: 'DHA-2018-556', expires: '05 Aug 2026', days: 1, status: 'Expiring' },
      { id: 'DD-04', driver: 'D-3008', doc: 'Vehicle insurance', no: 'INS-2026-9910', expires: '02 Jul 2026', days: -35, status: 'Expired' }
    ];
  });
  const [handover, setHandover] = useState<Array<{ id: string; shift: string; agent: string; note: string; time: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_handover_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'HO-01', shift: 'Morning', agent: 'Agent-1', note: 'Watch ORDER-1042 (SMS vendor degraded) and the D-3011 SOS. War room updated.', time: '09:00' },
      { id: 'HO-02', shift: 'Evening', agent: 'Agent-2', note: 'Pending approval: store S-21 onboarding + payout hold L-88. Do not approve without compliance sign-off.', time: '17:00' }
    ];
  });
  const [handoverForm, setHandoverForm] = useState<{ shift: string; note: string }>({ shift: 'Evening', note: '' });
  const [storeHealth, setStoreHealth] = useState<Array<{ id: string; store: string; version: string; heartbeat: string; status: 'Online' | 'Offline' | 'Updating' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_storehealth_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'SH-01', store: 'S-14 Dhanmondi', version: 'v2.2.3', heartbeat: '2 min ago', status: 'Online' },
      { id: 'SH-02', store: 'S-05 Bashundhara', version: 'v2.2.2', heartbeat: '1 min ago', status: 'Online' },
      { id: 'SH-03', store: 'S-09 Uttara', version: 'v2.2.3', heartbeat: '8 min ago', status: 'Online' },
      { id: 'SH-04', store: 'S-21 Mirpur Bazar', version: 'v2.1.9', heartbeat: 'Never', status: 'Offline' },
      { id: 'SH-05', store: 'S-03 Motijheel', version: 'v2.2.3', heartbeat: 'Just now', status: 'Updating' }
    ];
  });
  const [featureBoard, setFeatureBoard] = useState<Array<{ id: string; title: string; source: string; votes: number; status: 'New' | 'In review' | 'Roadmap' | 'Shipped' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_featureboard_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'FR-1001', title: 'Cash-on-delivery change request for store staff', source: 'Store S-14', votes: 42, status: 'Roadmap' },
      { id: 'FR-1002', title: 'Multi-language receipt (BN/EN) from POS', source: 'POS Terminal', votes: 31, status: 'In review' },
      { id: 'FR-1003', title: 'Order notes visible to driver', source: 'Customers', votes: 58, status: 'Shipped' },
      { id: 'FR-1004', title: 'Wallet top-up via bKash quick pay', source: 'Customers', votes: 76, status: 'New' },
      { id: 'FR-1005', title: 'Bulk menu upload for big stores', source: 'Store S-09', votes: 27, status: 'New' }
    ];
  });
  const [batchJobs, setBatchJobs] = useState<Array<{ id: string; job: string; schedule: string; lastRun: string; duration: string; status: 'Passed' | 'Warn' | 'Failed' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_batchjobs_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'BJ-01', job: 'Tech digest report', schedule: '00:30 daily', lastRun: 'Today 00:30', duration: '4m 12s', status: 'Passed' },
      { id: 'BJ-02', job: 'Fraud rule sweep', schedule: '01:15 daily', lastRun: 'Today 01:15', duration: '11m 40s', status: 'Warn' },
      { id: 'BJ-03', job: 'Backup verification', schedule: '03:45 daily', lastRun: 'Today 03:45', duration: '9m 05s', status: 'Passed' },
      { id: 'BJ-04', job: 'Cache warm-up', schedule: '04:00 daily', lastRun: 'Today 04:00', duration: '6m 21s', status: 'Passed' },
      { id: 'BJ-05', job: 'Search index rebuild', schedule: '05:00 daily', lastRun: 'Yesterday 05:00', duration: '—', status: 'Failed' }
    ];
  });
  const [envConfig, setEnvConfig] = useState<Array<{ id: string; key: string; value: string; env: 'prod' | 'staging'; note: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_envconfig_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'EC-01', key: 'PAYMENT_MODE', value: 'LIVE', env: 'prod', note: 'bKash/Nagad/Rocket live keys' },
      { id: 'EC-02', key: 'SMS_PROVIDER_PRIORITY', value: 'bKash→Nagad→Rocket', env: 'prod', note: 'OTP routing order' },
      { id: 'EC-03', key: 'REFUND_AUTO_APPROVE_MAX', value: '৳ 5,000', env: 'prod', note: 'auto refunds below this' },
      { id: 'EC-04', key: 'SLOT_INTERVAL_MIN', value: '60', env: 'prod', note: 'scheduled delivery slots' },
      { id: 'EC-05', key: 'MAP_VENDOR', value: 'Leaftlet+Here', env: 'staging', note: 'route tracking vendor' }
    ];
  });
  const [forceUpdate, setForceUpdate] = useState<Array<{ id: string; app: string; current: string; minSupported: string; force: boolean; note: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_forceupdate_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'FU-01', app: 'Customer App', current: 'v2.4.1', minSupported: 'v2.4.0', force: false, note: 'Android 15 hotfix rolled out' },
      { id: 'FU-02', app: 'Driver App', current: 'v3.1.0', minSupported: 'v3.0.9', force: true, note: 'Earnings breakdown fix required' },
      { id: 'FU-03', app: 'Store Panel', current: 'v2.2.3', minSupported: 'v2.2.0', force: false, note: 'Double-submit guard shipped' },
      { id: 'FU-04', app: 'SD POS Terminal', current: 'v1.8.0', minSupported: 'v1.7.4', force: false, note: 'Printer driver update' }
    ];
  });
  const [canned, setCanned] = useState<Array<{ id: string; cat: string; label: string; body: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_canned_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'CN-01', cat: 'Refund', label: 'Refund processed', body: 'Your refund of {amount} for {order} has been processed and will reach your bKash/Nagad within 24 hours.' },
      { id: 'CN-02', cat: 'Delivery', label: 'Rider on the way', body: 'Your rider {driver} is on the way with order {order}. Track the live route in the app.' },
      { id: 'CN-03', cat: 'Technical', label: 'Please hard refresh', body: 'Please fully close the app and reopen it (or press Ctrl+Shift+R on the Store Panel). That clears the cached version.' },
      { id: 'CN-04', cat: 'Payment', label: 'Payment retry', body: 'Please try the payment again — the gateway recovered. If it fails again we will investigate immediately.' },
      { id: 'CN-05', cat: 'Account', label: 'OTP re-send', body: 'A fresh OTP has been sent. It stays valid for 5 minutes. Check your SMS inbox.' }
    ];
  });
  const [cannedForm, setCannedForm] = useState<{ cat: string; label: string; body: string }>({ cat: 'Refund', label: '', body: '' });
  const [zoneSla, setZoneSla] = useState<Array<{ id: string; zone: string; promiseMin: number }>>(() => {
    try {
      const raw = localStorage.getItem('sd_zonesla_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'ZS-Utt', zone: 'Uttara Sector 6', promiseMin: 40 },
      { id: 'ZS-Mir', zone: 'Mirpur-10', promiseMin: 55 },
      { id: 'ZS-Dha', zone: 'Dhanmondi', promiseMin: 35 },
      { id: 'ZS-Bas', zone: 'Bashundhara', promiseMin: 45 },
      { id: 'ZS-Khi', zone: 'Khilgaon', promiseMin: 50 },
      { id: 'ZS-Moh', zone: 'Mohammadpur', promiseMin: 45 }
    ];
  });
  const [offlineQ, setOfflineQ] = useState<Array<{ id: string; source: string; pending: number; note: string; status: 'Idle' | 'Syncing' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_offlineq_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'OQ-01', source: 'Store Panel S-21', pending: 47, note: 'orders + menu changes since 08:00', status: 'Idle' },
      { id: 'OQ-02', source: 'Driver App offline orders', pending: 12, note: 'confirmations from dead zones', status: 'Idle' },
      { id: 'OQ-03', source: 'POS Terminal batch', pending: 4, note: 'sale receipts pending upload', status: 'Idle' },
      { id: 'OQ-04', source: 'Store Panel S-03', pending: 0, note: 'up to date', status: 'Idle' }
    ];
  });
  const [impCalc, setImpCalc] = useState<{ type: string; duration: string; period: string }>({ type: 'Payments', duration: '30 min', period: 'Peak' });
  const [promos, setPromos] = useState<Array<{ id: string; code: string; type: string; redemptions: number; cap: number; budget: string; budgetCap: string; status: 'Active' | 'Paused' | 'Expired' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_promos_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'PR-01', code: 'FRESH10', type: 'Fixed ৳100 off', redemptions: 842, cap: 1000, budget: '৳84,200', budgetCap: '৳100,000', status: 'Active' },
      { id: 'PR-02', code: 'SNAP15', type: '15% off', redemptions: 320, cap: 500, budget: '৳38,400', budgetCap: '৳60,000', status: 'Active' },
      { id: 'PR-03', code: 'FREEDEL', type: 'Free delivery', redemptions: 2210, cap: 3000, budget: '৳1,10,500', budgetCap: '৳1,50,000', status: 'Active' },
      { id: 'PR-04', code: 'IDFEST', type: 'Fixed ৳200 off', redemptions: 5000, cap: 5000, budget: '৳10,00,000', budgetCap: '৳10,00,000', status: 'Expired' }
    ];
  });
  const [payouts, setPayouts] = useState<Array<{ id: string; period: string; drivers: number; amount: string; status: 'Paid' | 'Processing' | 'Pending' | 'Failed' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_payouts_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'PO-01', period: 'Weekly · 28 Jun – 4 Jul', drivers: 312, amount: '৳ 4,82,500', status: 'Paid' },
      { id: 'PO-02', period: 'Weekly · 5 Jul – 11 Jul', drivers: 318, amount: '৳ 5,12,900', status: 'Processing' },
      { id: 'PO-03', period: 'Fuel deduction batch · Jul', drivers: 56, amount: '৳ 1,84,300', status: 'Pending' },
      { id: 'PO-04', period: 'COD settlement gap · Jul', drivers: 14, amount: '৳ 96,400', status: 'Failed' }
    ];
  });
  const [cdn, setCdn] = useState<Array<{ id: string; layer: string; hit: number; note: string }>>(() => {
    try {
      const raw = localStorage.getItem('sd_cdn_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'CDN-01', layer: 'Edge (CDN)', hit: 98.1, note: 'static assets · last purge 3h ago' },
      { id: 'CDN-02', layer: 'Redis cache', hit: 96.2, note: 'cart + catalog keys · TTL 15m' },
      { id: 'CDN-03', layer: 'DB query cache', hit: 88.4, note: 'driver & store lookups' },
      { id: 'CDN-04', layer: 'DNS resolver', hit: 99.3, note: 'route + zone lookups' }
    ];
  });
  const [runbook, setRunbook] = useState<Array<{ id: string; vendor: string; scope: string; steps: string[]; status: 'Ready' | 'Drilling' | 'Resolved' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_runbook_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'RB-01', vendor: 'bKash', scope: 'Wallet / merchant pay', status: 'Ready', steps: ['Check bKash status page + our API error codes', 'Verify merchant wallet balance', 'Switch payments to Nagad fallback', 'Refund in-flight payment captures after 5m', 'Log incident + notify stores'] },
      { id: 'RB-02', vendor: 'Nagad', scope: 'Cash-in / checkout', status: 'Ready', steps: ['Check Nagad gateway health', 'Confirm pending order captures', 'Fall back to COD + wallet split', 'Batch-retry failed callbacks', 'Update status page'] },
      { id: 'RB-03', vendor: 'Rocket', scope: 'Driver payouts', status: 'Ready', steps: ['Check Rocket payout API', 'Hold payout batch (do not double-pay)', 'Reconcile settlement file', 'Resume on recovery', 'Notify finance'] },
      { id: 'RB-04', vendor: 'Grameenphone SMS', scope: 'OTP + SMS alerts', status: 'Ready', steps: ['Check GP aggregator quota', 'Switch to Robi fallback pool', 'Verify OTP still delivered', 'Audit delivery report gap', 'Close runbook'] },
      { id: 'RB-05', vendor: 'SSLCommerz', scope: 'Card checkout', status: 'Ready', steps: ['Check SSLCommerz API + our cert', 'Verify refund webhooks arriving', 'Pause card as sole method', 'Queue failed 3DS handshakes', 'Re-verify after recovery'] }
    ];
  });
  const [refundVel, setRefundVel] = useState<Array<{ id: string; order: string; customer: string; method: string; hours: number; amount: string; status: 'Aged' | 'Escalated' | 'Done' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_refundvel_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'RV-01', order: 'SD-40218', customer: 'Tanvir A.', method: 'bKash', hours: 54, amount: '৳ 1,250', status: 'Aged' },
      { id: 'RV-02', order: 'SD-40193', customer: 'Nusrat J.', method: 'Card', hours: 49, amount: '৳ 2,840', status: 'Aged' },
      { id: 'RV-03', order: 'SD-40155', customer: 'Rakib H.', method: 'Wallet', hours: 38, amount: '৳ 980', status: 'Aged' },
      { id: 'RV-04', order: 'SD-40112', customer: 'Sadia K.', method: 'bKash', hours: 26, amount: '৳ 1,760', status: 'Aged' }
    ];
  });
  const [latencySpike, setLatencySpike] = useState<{ label: string; time: string } | null>(() => {
    try {
      const raw = localStorage.getItem('sd_latency_v1');
      if (raw && raw !== 'null') {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object' && 'label' in p) return p;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [tierQueue, setTierQueue] = useState<Array<{ id: string; issue: string; customer: string; tier: 'L0' | 'L1' | 'L2' | 'L3' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_tiers_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'TQ-01', issue: 'OTP not arriving after 3rd retry', customer: 'Sadia K.', tier: 'L1' },
      { id: 'TQ-02', issue: 'Payment callback stuck as Pending', customer: 'Tanvir A.', tier: 'L2' },
      { id: 'TQ-03', issue: 'Store catalog not syncing overnight', customer: 'Sultans Dine', tier: 'L2' },
      { id: 'TQ-04', issue: 'Order dedupe loop in POS bridge', customer: 'Pizza Palace', tier: 'L3' },
      { id: 'TQ-05', issue: 'How to enable COD split on checkout', customer: 'Kacchi Bhai', tier: 'L1' }
    ];
  });
  const [channels, setChannels] = useState<Array<{ id: string; name: string; platform: string; online: number; queue: number; avg: string; status: 'Online' | 'Offline' }>>(() => {
    try {
      const raw = localStorage.getItem('sd_channels_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'CH-01', name: 'Live Chat & Real-time', platform: 'Web · Customer/Driver app', online: 4, queue: 6, avg: '42s first reply', status: 'Online' },
      { id: 'CH-02', name: 'Ticket / Email', platform: 'helpdesk@nexago.com', online: 3, queue: 38, avg: '94% SLA met', status: 'Online' },
      { id: 'CH-03', name: 'Remote Desktop', platform: 'AnyDesk / TeamViewer session', online: 2, queue: 3, avg: 'RDP access granted', status: 'Online' }
    ];
  });
  const [tierForm, setTierForm] = useState<{ issue: string; customer: string; tier: 'L1' | 'L2' | 'L3' }>({ issue: '', customer: '', tier: 'L1' });

  const [ticketCategories, setTicketCategories] = useState<{ value: string; label: string }[]>(() => {
    try {
      const defaults = [
        { value: 'Order Delivery', label: 'Order Delivery Delay' },
        { value: 'Top-Up / Add Money', label: 'Top-Up / Add Money Issue' },
        { value: 'Payment / Refund', label: 'Payment / Wallet Refund' },
        { value: 'Missing Item', label: 'Missing or Damaged Item' },
        { value: 'General Query', label: 'General Query' },
      ];
      const raw = localStorage.getItem('sd_ticket_categories_v1');
      const p = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(p) ? p : [];
      return defaults.concat(arr.filter((s: any) => s && s.value && !defaults.some(d => d.value === s.value)));
    } catch { /* ignore */ }
    return [
      { value: 'Order Delivery', label: 'Order Delivery Delay' },
      { value: 'Top-Up / Add Money', label: 'Top-Up / Add Money Issue' },
      { value: 'Payment / Refund', label: 'Payment / Wallet Refund' },
      { value: 'Missing Item', label: 'Missing or Damaged Item' },
      { value: 'General Query', label: 'General Query' },
    ];
  });
  const [newTicketCat, setNewTicketCat] = useState('');

  useEffect(() => {
    try { localStorage.setItem('sd_ticket_categories_v1', JSON.stringify(ticketCategories)); } catch { /* ignore */ }
  }, [ticketCategories]);

  const addTicketCategory = () => {
    const v = newTicketCat.trim();
    if (!v) return;
    const value = v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    if (!value || ticketCategories.some(c => c.value.toLowerCase() === value.toLowerCase())) { setNewTicketCat(''); return; }
    setTicketCategories(prev => [...prev, { value, label: v }]);
    setNewTicketCat('');
  };
  const removeTicketCategory = (value: string) => setTicketCategories(prev => prev.filter(c => c.value !== value));

  const [helpFaqs, setHelpFaqs] = useState<{ id: string; problem: string; solution: string }[]>(() => {
    try {
      const raw = localStorage.getItem('sd_support_faqs_v1');
      if (raw && raw !== '[]') {
        const p = JSON.parse(raw);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch { /* ignore */ }
    return [
      { id: 'FAQ-1', problem: 'My order is delayed', solution: 'Check the live tracking in My Orders. If it exceeds the estimated time, the delivery partner is notified automatically. You can also open a ticket and we will prioritize it.' },
      { id: 'FAQ-2', problem: 'How do I get a refund?', solution: 'Open the order in My Orders and tap Request Refund. Approved refunds go back to your payment method or Smart Wallet within 24–48 hours.' },
      { id: 'FAQ-3', problem: 'An item is missing from my order', solution: 'Report it immediately via a support ticket with the Missing Item category. Attach a photo if possible and our team will verify and replace or refund.' },
      { id: 'FAQ-4', problem: 'How does Cash on Delivery work?', solution: 'Select Cash on Delivery at checkout. Pay the rider in cash when your order arrives — no online payment needed.' },
    ];
  });
  const [newFaqProblem, setNewFaqProblem] = useState('');
  const [newFaqSolution, setNewFaqSolution] = useState('');

  useEffect(() => {
    try { localStorage.setItem('sd_support_faqs_v1', JSON.stringify(helpFaqs)); } catch { /* ignore */ }
  }, [helpFaqs]);

  const addHelpFaq = () => {
    const p = newFaqProblem.trim();
    const s = newFaqSolution.trim();
    if (!p || !s) return;
    setHelpFaqs(prev => [...prev, { id: `FAQ-${Date.now().toString().slice(-4)}`, problem: p, solution: s }]);
    setNewFaqProblem('');
    setNewFaqSolution('');
  };
  const removeHelpFaq = (id: string) => setHelpFaqs(prev => prev.filter(f => f.id !== id));

  useEffect(() => {
    try {
      localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify({ faults, resolveActions, ledger, audit, proofs }));
    } catch { /* storage full/unavailable — ignore */ }
  }, [faults, resolveActions, ledger, audit, proofs]);

  useEffect(() => {
    try { localStorage.setItem('sd_support_templates_v1', JSON.stringify(savedTemplates)); } catch { /* ignore */ }
  }, [savedTemplates]);

  useEffect(() => {
    try { localStorage.setItem('sd_known_issues_v1', JSON.stringify(knownIssues)); } catch { /* ignore */ }
  }, [knownIssues]);

  useEffect(() => {
    try { localStorage.setItem('sd_tech_audit_v1', JSON.stringify(techAudit)); } catch { /* ignore */ }
  }, [techAudit]);

  useEffect(() => {
    try { localStorage.setItem('sd_users_v1', JSON.stringify(users)); } catch { /* ignore */ }
  }, [users]);

  useEffect(() => {
    try { localStorage.setItem('sd_integrations_v1', JSON.stringify(integrations)); } catch { /* ignore */ }
  }, [integrations]);

  useEffect(() => {
    try { localStorage.setItem('sd_maintenance_v1', JSON.stringify(maintenance)); } catch { /* ignore */ }
  }, [maintenance]);

  useEffect(() => {
    try { localStorage.setItem('sd_backlog_v1', JSON.stringify(backlog)); } catch { /* ignore */ }
  }, [backlog]);

  useEffect(() => {
    try { localStorage.setItem('sd_sla_targets_v1', JSON.stringify(slaConfig)); } catch { /* ignore */ }
  }, [slaConfig]);

  useEffect(() => {
    try { localStorage.setItem('sd_apilog_v1', JSON.stringify(apiLog)); } catch { /* ignore */ }
  }, [apiLog]);

  useEffect(() => {
    try { localStorage.setItem('sd_alertrules_v1', JSON.stringify(alertRules)); } catch { /* ignore */ }
  }, [alertRules]);

  useEffect(() => {
    try { localStorage.setItem('sd_sec_events_v1', JSON.stringify(securityEvents)); } catch { /* ignore */ }
  }, [securityEvents]);

  useEffect(() => {
    try { localStorage.setItem('sd_sec_score_v1', String(securityScore)); } catch { /* ignore */ }
  }, [securityScore]);

  useEffect(() => {
    try { localStorage.setItem('sd_featureflags_v1', JSON.stringify(flags)); } catch { /* ignore */ }
  }, [flags]);

  useEffect(() => {
    try { localStorage.setItem('sd_changes_v1', JSON.stringify(changes)); } catch { /* ignore */ }
  }, [changes]);

  useEffect(() => {
    try { localStorage.setItem('sd_warroom_v1', JSON.stringify(warroom)); } catch { /* ignore */ }
  }, [warroom]);

  useEffect(() => {
    try { localStorage.setItem('sd_logs_v1', JSON.stringify(logs)); } catch { /* ignore */ }
  }, [logs]);

  useEffect(() => {
    try { localStorage.setItem('sd_webhooks_v1', JSON.stringify(webhooks)); } catch { /* ignore */ }
  }, [webhooks]);

  useEffect(() => {
    try { localStorage.setItem('sd_backups_v1', JSON.stringify(backups)); } catch { /* ignore */ }
  }, [backups]);

  useEffect(() => {
    try { localStorage.setItem('sd_digest_v1', JSON.stringify(digest)); } catch { /* ignore */ }
  }, [digest]);

  useEffect(() => {
    try { localStorage.setItem('sd_reviews_v1', JSON.stringify(reviews)); } catch { /* ignore */ }
  }, [reviews]);

  useEffect(() => {
    try { localStorage.setItem('sd_sos_v1', JSON.stringify(sosAlerts)); } catch { /* ignore */ }
  }, [sosAlerts]);

  useEffect(() => {
    try { localStorage.setItem('sd_dr_v1', JSON.stringify(drDrills)); } catch { /* ignore */ }
  }, [drDrills]);

  useEffect(() => {
    try { localStorage.setItem('sd_smsbal_v1', JSON.stringify(smsBal)); } catch { /* ignore */ }
  }, [smsBal]);

  useEffect(() => {
    try { localStorage.setItem('sd_debt_v1', JSON.stringify(debt)); } catch { /* ignore */ }
  }, [debt]);

  useEffect(() => {
    try { localStorage.setItem('sd_broadcast_v1', JSON.stringify(broadcasts)); } catch { /* ignore */ }
  }, [broadcasts]);

  useEffect(() => {
    try { localStorage.setItem('sd_fraudq_v1', JSON.stringify(fraudQueue)); } catch { /* ignore */ }
  }, [fraudQueue]);

  useEffect(() => {
    try { localStorage.setItem('sd_approvals_v1', JSON.stringify(approvals)); } catch { /* ignore */ }
  }, [approvals]);

  useEffect(() => {
    try { localStorage.setItem('sd_certs_v1', JSON.stringify(certs)); } catch { /* ignore */ }
  }, [certs]);

  useEffect(() => {
    try { localStorage.setItem('sd_relcheck_v1', JSON.stringify(relChecks)); } catch { /* ignore */ }
  }, [relChecks]);

  useEffect(() => {
    try { localStorage.setItem('sd_zones_v1', JSON.stringify(zones)); } catch { /* ignore */ }
  }, [zones]);

  useEffect(() => {
    try { localStorage.setItem('sd_ratelimit_v1', JSON.stringify(rateLimits)); } catch { /* ignore */ }
  }, [rateLimits]);

  useEffect(() => {
    try { localStorage.setItem('sd_sessions_v1', JSON.stringify(sessions)); } catch { /* ignore */ }
  }, [sessions]);

  useEffect(() => {
    try { localStorage.setItem('sd_searchidx_v1', JSON.stringify(searchIdx)); } catch { /* ignore */ }
  }, [searchIdx]);

  useEffect(() => {
    try { localStorage.setItem('sd_retention_v1', JSON.stringify(retention)); } catch { /* ignore */ }
  }, [retention]);

  useEffect(() => {
    try { localStorage.setItem('sd_crashes_v1', JSON.stringify(crashes)); } catch { /* ignore */ }
  }, [crashes]);

  useEffect(() => {
    try { localStorage.setItem('sd_allowlist_v1', JSON.stringify(allowlist)); } catch { /* ignore */ }
  }, [allowlist]);

  useEffect(() => {
    try { localStorage.setItem('sd_pipeline_v1', JSON.stringify(pipeline)); } catch { /* ignore */ }
  }, [pipeline]);

  useEffect(() => {
    try { localStorage.setItem('sd_pwpolicy_v1', JSON.stringify(pwPolicy)); } catch { /* ignore */ }
  }, [pwPolicy]);

  useEffect(() => {
    try { localStorage.setItem('sd_locks_v1', JSON.stringify(lockCfg)); } catch { /* ignore */ }
  }, [lockCfg]);

  useEffect(() => {
    try { localStorage.setItem('sd_access_v1', JSON.stringify(accessModes)); } catch { /* ignore */ }
  }, [accessModes]);

  useEffect(() => {
    const seed = [
      { id: 'driver-app', name: 'Driver App', level: 'Full' as const },
      { id: 'customer-app', name: 'Customer App', level: 'Full' as const },
      { id: 'store-app', name: 'Store App', level: 'Full' as const },
      { id: 'store-admin-app', name: 'Store Admin App', level: 'Full' as const },
      { id: 'super-admin-app', name: 'Super Admin App', level: 'Full' as const }
    ];
    setAccessModes(prev => {
      const missing = seed.filter(s => !prev.some(p => p.id === s.id));
      if (missing.length === 0) return prev;
      return [...prev, ...missing];
    });
  }, []);

  useEffect(() => {
    if (realVideoRef.current && realStream) realVideoRef.current.srcObject = realStream;
  }, [realStream]);

  useEffect(() => () => {
    if (realPcRef.current) { try { realPcRef.current.close(); } catch { /* ignore */ } }
    if (realWsRef.current) { try { realWsRef.current.close(); } catch { /* ignore */ } }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('sd_geofence_v1', JSON.stringify(geofence)); } catch { /* ignore */ }
  }, [geofence]);

  useEffect(() => {
    try { localStorage.setItem('sd_smstpl_v1', JSON.stringify(smsTpls)); } catch { /* ignore */ }
  }, [smsTpls]);

  useEffect(() => {
    try { localStorage.setItem('sd_driverdocs_v1', JSON.stringify(driverDocs)); } catch { /* ignore */ }
  }, [driverDocs]);

  useEffect(() => {
    try { localStorage.setItem('sd_handover_v1', JSON.stringify(handover)); } catch { /* ignore */ }
  }, [handover]);

  useEffect(() => {
    try { localStorage.setItem('sd_storehealth_v1', JSON.stringify(storeHealth)); } catch { /* ignore */ }
  }, [storeHealth]);

  useEffect(() => {
    try { localStorage.setItem('sd_featureboard_v1', JSON.stringify(featureBoard)); } catch { /* ignore */ }
  }, [featureBoard]);

  useEffect(() => {
    try { localStorage.setItem('sd_batchjobs_v1', JSON.stringify(batchJobs)); } catch { /* ignore */ }
  }, [batchJobs]);

  useEffect(() => {
    try { localStorage.setItem('sd_envconfig_v1', JSON.stringify(envConfig)); } catch { /* ignore */ }
  }, [envConfig]);

  useEffect(() => {
    try { localStorage.setItem('sd_forceupdate_v1', JSON.stringify(forceUpdate)); } catch { /* ignore */ }
  }, [forceUpdate]);

  useEffect(() => {
    try { localStorage.setItem('sd_canned_v1', JSON.stringify(canned)); } catch { /* ignore */ }
  }, [canned]);

  useEffect(() => {
    try { localStorage.setItem('sd_zonesla_v1', JSON.stringify(zoneSla)); } catch { /* ignore */ }
  }, [zoneSla]);

  useEffect(() => {
    try { localStorage.setItem('sd_offlineq_v1', JSON.stringify(offlineQ)); } catch { /* ignore */ }
  }, [offlineQ]);

  useEffect(() => {
    try { localStorage.setItem('sd_promos_v1', JSON.stringify(promos)); } catch { /* ignore */ }
  }, [promos]);

  useEffect(() => {
    try { localStorage.setItem('sd_payouts_v1', JSON.stringify(payouts)); } catch { /* ignore */ }
  }, [payouts]);

  useEffect(() => {
    try { localStorage.setItem('sd_cdn_v1', JSON.stringify(cdn)); } catch { /* ignore */ }
  }, [cdn]);

  useEffect(() => {
    try { localStorage.setItem('sd_runbook_v1', JSON.stringify(runbook)); } catch { /* ignore */ }
  }, [runbook]);

  useEffect(() => {
    try { localStorage.setItem('sd_refundvel_v1', JSON.stringify(refundVel)); } catch { /* ignore */ }
  }, [refundVel]);

  useEffect(() => {
    try { localStorage.setItem('sd_latency_v1', JSON.stringify(latencySpike)); } catch { /* ignore */ }
  }, [latencySpike]);

  useEffect(() => {
    try { localStorage.setItem('sd_tiers_v1', JSON.stringify(tierQueue)); } catch { /* ignore */ }
  }, [tierQueue]);

  useEffect(() => {
    try { localStorage.setItem('sd_channels_v1', JSON.stringify(channels)); } catch { /* ignore */ }
  }, [channels]);

  const categorize = (t: SupportTicket): 'customers' | 'disputes' | 'drivers' | 'technical' => {
    if (t.user.toLowerCase().includes('driver')) return 'drivers';
    if (/refund|cancel|wrong|missing|dispute|pricing|charge|cashback|not received/i.test(t.subject)) return 'disputes';
    if (/technical|bug|crash|error|login|account|gps|map|notification|sync|install|app issue|app won|app not|loading/i.test(t.subject)) return 'technical';
    return 'customers';
  };

  const normalizedSearch = orderSearch.trim().toLowerCase().replace(/^order[\s#]*/, '');
  const reportedIds = new Set(reports.map(r => r.orderId));
  const matchedReportedOrders = normalizedSearch
    ? orders.filter(o => reportedIds.has(o.id) && o.id.toLowerCase().includes(normalizedSearch))
    : [];
  const matchedOrderExistsNotReported = normalizedSearch
    ? orders.some(o => o.id.toLowerCase().includes(normalizedSearch) && !reportedIds.has(o.id))
    : false;
  const relatedTickets = normalizedSearch
    ? tickets.filter(t => t.subject.toLowerCase().includes(normalizedSearch) || t.id.toLowerCase().includes(normalizedSearch) || t.user.toLowerCase().includes(normalizedSearch))
    : [];

  const filtered = category === 'all' ? tickets : tickets.filter(t => categorize(t) === category);

  const activeTicket = tickets.find(t => t.id === activeTicketId);
  const activeOrder = activeOrderId ? orders.find(o => o.id === activeOrderId) : null;
  const activeOrderReports = activeOrderId ? reports.filter(r => r.orderId === activeOrderId) : [];
  const activeOrderChat = activeOrderId ? chatLog.filter(l => l.orderId === activeOrderId) : [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;
    onReplyTicket(activeTicketId, replyText);
    setReplyText('');
  };

  const changeStatus = (id: string, status: SupportTicket['status']) => {
    onUpdateStatus(id, status);
  };

  // Ticket ↔ Order auto-link: extract the order id referenced by a ticket
  const extractOrderId = (t: SupportTicket): string | null => {
    const text = `${t.subject} ${t.messages.map(m => m.text).join(' ')}`;
    const m = text.match(/order\s*[#]?\s*([A-Za-z0-9-]{4,})/i) || text.match(/(45\d{7,})/);
    return m ? m[1] : null;
  };

  // Open a ticket and auto-load its linked order analysis (if any)
  const openTicket = (t: SupportTicket) => {
    setActiveTicketId(t.id);
    const oid = extractOrderId(t);
    if (oid && orders.some(o => o.id === oid)) {
      setActiveOrderId(oid);
    }
  };

  const addResolveAction = () => {
    if (!activeOrderId || !resolveInput.trim()) return;
    setResolveActions(prev => ({
      ...prev,
      [activeOrderId]: [...(prev[activeOrderId] || []), { text: resolveInput.trim(), done: false }]
    }));
    pushAudit('Resolution step added', resolveInput.trim());
    setResolveInput('');
  };

  const toggleResolveAction = (idx: number) => {
    if (!activeOrderId) return;
    const list = resolveActions[activeOrderId] || [];
    const next = list.map((a, i) => i === idx ? { ...a, done: !a.done } : a);
    const toggled = next[idx];
    setResolveActions(prev => ({ ...prev, [activeOrderId]: next }));
    pushAudit('Resolution step toggled', `${toggled.done ? 'Completed: ' : 'Reopened: '}${toggled.text}`);
  };

  const pushAudit = (action: string, detail: string) => {
    if (!activeOrderId) return;
    setAudit(prev => ({
      ...prev,
      [activeOrderId]: [
        ...(prev[activeOrderId] || []),
        { action, detail, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]
    }));
  };

  const pushLedger = (orderId: string, party: FaultParty, type: 'credit' | 'debit', amount: number, note: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLedger(prev => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), { party, type, amount, note, time }]
    }));
    pushAudit(`${type === 'credit' ? 'Credit' : 'Debit'} ${partyLabel[party]}`, `Tk ${amount.toFixed(2)} — ${note}`);
    if (party === 'customer' && type === 'credit') {
      if (onPaymentRefund) onPaymentRefund(orderId, amount, note || 'Refund issued');
      onNotify?.({ title: '💰 Refund Issued — ' + orderId, message: `Customer credited Tk ${amount.toFixed(2)}: ${note || 'Refund'}`, type: 'payment' });
    } else if (party === 'driver') {
      const order = orders.find(o => o.id === orderId);
      const d = drivers.find(x => x.id === order?.driverId);
      if (d && onDriversChange) {
        const delta = type === 'credit' ? amount : -amount;
        onDriversChange(drivers.map(x => x.id === d.id ? { ...x, earnings: Math.max(0, (x.earnings || 0) + delta) } : x));
      }
      onNotify?.({
        title: type === 'credit' ? '💰 Wallet Credited — ' + orderId : '⚠️ Wallet Debited — ' + orderId,
        message: `Driver ${d?.name || 'wallet'} ${type === 'credit' ? 'credited' : 'debited'} Tk ${amount.toFixed(2)}: ${note || (type === 'credit' ? 'Adjustment credit' : 'Fine / adjustment')}`,
        type: 'driver',
        audience: 'driver',
        driverId: order?.driverId,
      });
    }
  };

  const pushResolve = (orderId: string, text: string) => {
    setResolveActions(prev => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), { text, done: false }]
    }));
  };

  const addLedgerEntry = () => {
    if (!activeOrderId || !ledgerAmount) return;
    const amt = parseFloat(ledgerAmount);
    if (isNaN(amt) || amt <= 0) return;
    pushLedger(activeOrderId, ledgerParty, ledgerType, amt, ledgerNote || (ledgerType === 'credit' ? 'Credit entry' : 'Debit entry'));
    setLedgerAmount('');
    setLedgerNote('');
  };

  // Auto fault-suggestion driven by the report text
  const suggestFault = (): { party: FaultParty; note: string; basis: string } | null => {
    const combined = activeOrderReports.map(r => `${r.reason} ${r.note}`).join(' ').toLowerCase();
    if (!combined) return null;
    if (/unreachable|did not answer|didn't answer|not answer|no answer|not responding|phone off|wrong number/i.test(combined)) {
      return { party: 'customer', note: 'Customer was unreachable when the driver attempted delivery.', basis: 'Report says the customer could not be reached.' };
    }
    if (/late|delay|slow|wait/i.test(combined)) {
      return { party: 'driver', note: 'Delivery was delayed — driver exceeded the SLA.', basis: 'Report mentions a delay by the delivery partner.' };
    }
    if (/wrong item|wrong order|missing item|defective|damaged|expired|packed wrong|broken|short count/i.test(combined)) {
      return { party: 'store', note: 'The store packed the wrong / damaged items.', basis: 'Report mentions an item or order mistake from the store.' };
    }
    if (/not received|not delivered|where is my|never came/i.test(combined)) {
      return { party: 'driver', note: 'The parcel was not delivered to the customer.', basis: 'Report says the parcel was not received.' };
    }
    if (/refund|charge|pricing|fee|overcharge/i.test(combined)) {
      return { party: 'store', note: 'Billing or charge discrepancy on the order.', basis: 'Report mentions a charge or refund issue.' };
    }
    return null;
  };

  const applySuggestion = () => {
    const s = suggestFault();
    if (!s) {
      setFaultSuggestion(null);
      setFaultParty(null);
      setFaultNote('');
      return;
    }
    setFaultSuggestion(s.party);
    setFaultParty(s.party);
    setFaultNote(s.note);
  };

  const recordFault = () => {
    if (!activeOrderId || !faultParty) return;
    setFaults(prev => ({
      ...prev,
      [activeOrderId]: {
        party: faultParty,
        note: faultNote,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    }));
    pushAudit('Fault recorded', `${partyLabel[faultParty]} is at fault${faultNote ? ' — ' + faultNote : ''}`);
    onNotify?.({ title: '⚖️ Fault Assigned — ' + activeOrderId, message: `${partyLabel[faultParty]} is at fault on this order.`, type: 'system' });
    setFaultNote('');
  };

  // One-click resolution playbook — adds a resolution step + auto-posts the matching ledger entry
  const applyTemplate = (template: { id: string; label: string; amountLabel: string }) => {
    if (!activeOrder) return;
    const oid = activeOrder.id;
    pushAudit('Resolution template applied', template.label);
    const itemTotal = (activeOrder.items || []).reduce((s, i) => s + i.price * i.quantity, activeOrder.amount || 0);
    switch (template.id) {
      case 'refund': {
        const amt = smartAmount('refund') || itemTotal;
        pushResolve(oid, `Refund order items — Tk ${amt.toFixed(2)}`);
        pushLedger(oid, 'customer', 'credit', amt, 'Refund for order items');
        break;
      }
      case 'resend':
        pushResolve(oid, 'Resend the order items to the customer');
        break;
      case 'waive-fee': {
        const amt = activeOrder.deliveryCharge || 0;
        pushResolve(oid, `Waive delivery fee — Tk ${amt.toFixed(2)}`);
        if (amt > 0) pushLedger(oid, 'customer', 'credit', amt, 'Delivery fee waived');
        break;
      }
      case 'fine-driver': {
        const amt = smartAmount('fine') || activeOrder.deliveryCharge || 100;
        pushResolve(oid, `Fine driver — Tk ${amt.toFixed(2)}`);
        pushLedger(oid, 'driver', 'debit', amt, 'Fine (SLA / conduct breach)');
        break;
      }
      case 'compensate': {
        const amt = smartAmount('compensation') || Math.max(50, Math.round(activeOrder.amount * 0.1));
        pushResolve(oid, `Compensate customer — Tk ${amt.toFixed(2)}`);
        pushLedger(oid, 'customer', 'credit', amt, 'Goodwill compensation');
        break;
      }
    }
  };

  const templates: Array<{ id: string; label: string; amountLabel: string }> = [
    { id: 'refund', label: 'Refund Items', amountLabel: 'Items total' },
    { id: 'resend', label: 'Resend Items', amountLabel: '—' },
    { id: 'waive-fee', label: 'Waive Fee', amountLabel: 'Delivery fee' },
    { id: 'fine-driver', label: 'Fine Driver', amountLabel: 'Fee / Tk 100' },
    { id: 'compensate', label: 'Compensate', amountLabel: '10% of order' }
  ];

  // SLA / timing — parse 12h "10:39 AM" style timestamps
  const parseTime12 = (t: string): number | null => {
    if (!t) return null;
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  const minutesBetween = (a: string, b: string): number | null => {
    const pa = parseTime12(a);
    const pb = parseTime12(b);
    if (pa === null || pb === null) return null;
    let d = pb - pa;
    if (d < 0) d += 1440;
    return d;
  };

  const placedTime = activeOrder?.time || '';
  const reportTime = activeOrderReports[0]?.time || '';
  const elapsedToReport = placedTime && reportTime ? minutesBetween(placedTime, reportTime) : null;
  const deliveryTarget = (activeOrder?.estimatedMinutes || 30) * (activeOrder?.priority === 'Urgent' ? 0.5 : activeOrder?.priority === 'Express' ? 0.75 : 1);
  const slaSteps = [
    { label: 'Store confirmation', target: '≤ 5 min', reached: (activeOrder?.status || '') !== 'Pending' },
    { label: 'Driver assignment', target: '≤ 10 min', reached: !!activeOrder?.driverId },
    { label: 'Delivery', target: `${Math.round(deliveryTarget)} min`, reached: activeOrder?.status === 'Completed' },
    { label: 'Report filed', target: `≤ ${Math.round(deliveryTarget)} min`, reached: elapsedToReport !== null && elapsedToReport <= deliveryTarget }
  ];

  // Multi-party evidence — per-party chat + photos
  const partyChatGroups = (['customer', 'driver'] as const)
    .map(p => ({
      party: p,
      entries: activeOrderChat.filter(l => l.sender === p)
    }))
    .filter(g => g.entries.length > 0);

  // Dispute analytics across all analyzed orders
  const faultCounts = { customer: 0, driver: 0, store: 0 } as Record<FaultParty, number>;
  Object.keys(faults).forEach(id => { const f = faults[id]; faultCounts[f.party]++; });
  const allLedgerEntries: LedgerEntry[] = Object.keys(ledger).reduce<LedgerEntry[]>((acc, id) => [...acc, ...(ledger[id] || [])], []);
  const totalRefunds = allLedgerEntries.filter(e => e.party === 'customer' && e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const totalFines = allLedgerEntries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const analyzedOrderCount = new Set([...Object.keys(faults), ...Object.keys(resolveActions), ...Object.keys(ledger)]).size;
  const resolvedOrderCount = Object.keys(resolveActions).filter(id => {
    const list = resolveActions[id] || [];
    return list.length > 0 && list.every(a => a.done);
  }).length;
  const resolutionRate = analyzedOrderCount ? Math.round((resolvedOrderCount / analyzedOrderCount) * 100) : 0;
  const repeatParty = (Object.keys(faultCounts) as FaultParty[]).find(p => faultCounts[p] > 1);

  // Export current order analysis as CSV
  const exportCSV = () => {
    if (!activeOrder) return;
    const oid = activeOrder.id;
    const rows: string[][] = [
      ['NexaGo Support Analysis — Order', oid],
      [],
      ['Store', activeOrder.storeName],
      ['Customer', activeOrder.customerName],
      ['Amount (Tk)', activeOrder.amount.toFixed(2)],
      ['Payment', activeOrder.paymentMethod],
      ['Placed', `${activeOrder.date}${activeOrder.time ? ' · ' + activeOrder.time : ''}`],
      ['Status', activeOrder.status],
      [],
      ['Report Details'],
      ...(activeOrderReports.length ? activeOrderReports.map(r => [r.reason, r.note, r.time]) : [['No report']]),
      [],
      ['Fault Decision'],
      ...(faults[oid] ? [[`${partyLabel[faults[oid].party]} at fault`, faults[oid].note, faults[oid].time]] : [['Not recorded']]),
      [],
      ['Resolution Steps'],
      ...((resolveActions[oid] || []).map(a => [a.text, a.done ? 'Done' : 'Pending'])),
      [],
      ['Credit / Debit Ledger'],
      ...((ledger[oid] || []).map(e => [`${e.type.toUpperCase()} ${partyLabel[e.party]}`, `Tk ${e.amount.toFixed(2)}`, e.note, e.time])),
      [],
      ['SLA'],
      ['Store confirmation (≤ 5 min)', slaSteps[0].reached ? 'MET' : 'PENDING'],
      ['Driver assignment (≤ 10 min)', slaSteps[1].reached ? 'MET' : 'PENDING'],
      ['Delivery target', `${Math.round(deliveryTarget)} min`],
      ...(elapsedToReport !== null ? [['Response window (min)', String(elapsedToReport), elapsedToReport <= deliveryTarget ? 'Within target' : 'SLA breached']] : [])
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexago-support-${oid}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Attach a proof-of-delivery photo (stored base64, persisted)
  const attachProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeOrderId || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || '');
      setProofs(prev => ({ ...prev, [activeOrderId]: [...(prev[activeOrderId] || []), data] }));
      pushAudit('Proof photo attached', file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const partyTotals = (entries: LedgerEntry[]) => {
    const totals: Record<FaultParty, { credit: number; debit: number }> = {
      customer: { credit: 0, debit: 0 },
      driver: { credit: 0, debit: 0 },
      store: { credit: 0, debit: 0 }
    };
    entries.forEach(e => {
      if (e.type === 'credit') totals[e.party].credit += e.amount;
      else totals[e.party].debit += e.amount;
    });
    return totals;
  };

  const partyLabel: Record<FaultParty, string> = {
    customer: 'Customer',
    driver: 'Driver',
    store: 'Store'
  };

  const partyIcon = (p: FaultParty) =>
    p === 'customer' ? <UserX className="w-3.5 h-3.5" /> : p === 'driver' ? <Truck className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />;

  const activityPerParty = () => {
    if (!activeOrderId) return [];
    const perParty: Record<string, { party: string; count: number; first: string; last: string; photos: number }> = {};
    activeOrderChat.forEach(l => {
      const key = l.sender === 'driver' ? 'driver' : 'customer';
      if (!perParty[key]) perParty[key] = { party: partyLabel[key as FaultParty], count: 0, first: l.time, last: l.time, photos: 0 };
      const p = perParty[key];
      p.count++;
      if (l.time < p.first) p.first = l.time;
      if (l.time > p.last) p.last = l.time;
      if (l.image) p.photos++;
    });
    return Object.values(perParty);
  };

  // Fault-aware amount calculator — suggests refund / fine / compensation amounts from the recorded fault
  function smartAmount(kind: 'refund' | 'fine' | 'compensation'): number {
    if (!activeOrder) return 0;
    const itemTotal = (activeOrder.items || []).reduce((s, i) => s + i.price * i.quantity, activeOrder.amount || 0);
    const fee = activeOrder.deliveryCharge || 0;
    const fault = activeOrder ? faults[activeOrder.id]?.party : undefined;
    if (kind === 'refund') {
      if (fault === 'store') return itemTotal;
      if (fault === 'driver') return fee;
      return 0;
    }
    if (kind === 'fine') return fault === 'driver' ? (fee || 100) : 0;
    if (kind === 'compensation') return fault !== 'customer' && fault ? Math.max(50, Math.round(activeOrder.amount * 0.1)) : 0;
    return 0;
  }

  const suggestedRefund = activeOrder ? smartAmount('refund') : 0;
  const suggestedFine = activeOrder ? smartAmount('fine') : 0;
  const suggestedComp = activeOrder ? smartAmount('compensation') : 0;

  // Auto dispute summary — one narrative paragraph generated from report + fault + ledger + resolution + SLA
  const disputeSummary = (() => {
    if (!activeOrder) return '';
    const parts: string[] = [];
    parts.push(`Order #${activeOrder.id} from ${activeOrder.storeName} for ${activeOrder.customerName} — Tk ${activeOrder.amount.toFixed(2)} via ${activeOrder.paymentMethod}, placed ${activeOrder.date}${activeOrder.time ? ' at ' + activeOrder.time : ''}.`);
    if (activeOrderReports.length) parts.push(`A report was filed: "${activeOrderReports[0].reason}"${activeOrderReports[0].note ? ' — ' + activeOrderReports[0].note : ''} (${activeOrderReports[0].time}).`);
    const fault = faults[activeOrder.id];
    if (fault) parts.push(`Fault was assigned to the ${partyLabel[fault.party].toLowerCase()}${fault.note ? ` — ${fault.note}` : ''}.`);
    const entries = ledger[activeOrder.id] || [];
    if (entries.length) {
      const credits = entries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
      const debits = entries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
      parts.push(`Ledger: ${credits > 0 ? 'Tk ' + credits.toFixed(2) + ' credited' : 'no credits issued'}${debits > 0 ? ' and Tk ' + debits.toFixed(2) + ' debited' : ''}.`);
    }
    const steps = resolveActions[activeOrder.id] || [];
    if (steps.length) parts.push(`${steps.filter(s => s.done).length} of ${steps.length} resolution steps completed.`);
    if (elapsedToReport !== null) {
      parts.push(`The report arrived ${elapsedToReport} min after placement, ${elapsedToReport <= deliveryTarget ? 'within the SLA target.' : `breaching the ${Math.round(deliveryTarget)}-min SLA target.`}`);
    }
    return parts.join(' ');
  })();

  // Linked ticket for the active order (Ticket ↔ Order auto-link, reverse direction)
  const linkedTicket = activeOrder
    ? tickets.find(t => extractOrderId(t) === activeOrder.id) || tickets.find(t => t.subject.toLowerCase().includes(activeOrder.id.toLowerCase()))
    : undefined;

  // One-click SLA-breach auto-fine: posts a driver debit + audit + notification
  const applySlaFine = () => {
    if (!activeOrder) return;
    const amt = smartAmount('fine') || activeOrder.deliveryCharge || 100;
    pushResolve(activeOrder.id, `Auto-fine driver — SLA breach (Tk ${amt.toFixed(2)})`);
    pushLedger(activeOrder.id, 'driver', 'debit', amt, 'Auto-fine — SLA breach');
    pushAudit('SLA breach auto-fine applied', `Driver fined Tk ${amt.toFixed(2)}`);
    onNotify?.({ title: '⚠️ SLA Breach Auto-Fine — ' + activeOrder.id, message: `Driver fined Tk ${amt.toFixed(2)} for missing the ${Math.round(deliveryTarget)}-min SLA.`, type: 'system' });
  };

  // Remove (undo) a ledger entry with an audit-trail record
  const removeLedgerEntry = (idx: number) => {
    if (!activeOrderId) return;
    const list = ledger[activeOrderId] || [];
    const removed = list[idx];
    if (!removed) return;
    setLedger(prev => ({ ...prev, [activeOrderId]: list.filter((_, j) => j !== idx) }));
    pushAudit('Ledger entry removed', `${removed.type.toUpperCase()} ${partyLabel[removed.party]} Tk ${removed.amount.toFixed(2)}`);
  };

  // Customer / Driver 360 profile aggregation — order history, faults, reports, ledger
  const profileData = (() => {
    if (!profileView || !activeOrderId) return null;
    if (profileView.type === 'customer') {
      const custOrders = orders.filter(o => o.customerName === profileView.key);
      return {
        label: profileView.label,
        orders: custOrders,
        faultCount: Object.keys(faults).filter(oid => custOrders.some(o => o.id === oid) && faults[oid].party === 'customer').length,
        reports: reports.filter(r => custOrders.some(o => o.id === r.orderId)),
        ledger: Object.keys(ledger).filter(oid => custOrders.some(o => o.id === oid)).reduce<Array<LedgerEntry & { orderId: string }>>((acc, oid) => [...acc, ...(ledger[oid] || []).filter(e => e.party === 'customer').map(e => ({ ...e, orderId: oid }))], []),
        totalSpent: custOrders.reduce((s, o) => s + o.amount, 0)
      };
    }
    const drvOrders = orders.filter(o => o.driverId === profileView.key);
    return {
      label: profileView.label,
      orders: drvOrders,
      faultCount: Object.keys(faults).filter(oid => drvOrders.some(o => o.id === oid) && faults[oid].party === 'driver').length,
      reports: reports.filter(r => drvOrders.some(o => o.id === r.orderId)),
      ledger: Object.keys(ledger).filter(oid => drvOrders.some(o => o.id === oid)).reduce<Array<LedgerEntry & { orderId: string }>>((acc, oid) => [...acc, ...(ledger[oid] || []).filter(e => e.party === 'driver').map(e => ({ ...e, orderId: oid }))], []),
      totalSpent: drvOrders.reduce((s, o) => s + o.amount, 0)
    };
  })();

  // scoped EN/BN language toggle for key labels
  const t = (en: string, bn: string) => (lang === 'bn' ? bn : en);

  // Auto escalation — high-priority tickets still open need attention
  const openHighTickets = tickets.filter(tk => tk.priority === 'High' && tk.status !== 'Resolved');
  const oldestOpenHigh = openHighTickets.length
    ? openHighTickets.reduce((a, b) => (a.date < b.date ? a : b))
    : null;

  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Date helpers for aging / range filters ("May 26, 2026" or "Today" or ISO)
  const daysSince = (d: string): number | null => {
    if (!d) return null;
    if (/today|just now|now/i.test(d)) return 0;
    const iso = d.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const dt = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
      return Math.max(0, Math.floor((Date.now() - dt.getTime()) / 86400000));
    }
    const m = d.match(/([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})/);
    if (!m) return null;
    const months: Record<string, number> = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const dt = new Date(parseInt(m[3], 10), months[m[1].toLowerCase().slice(0, 3)] || 0, parseInt(m[2], 10));
    return Math.max(0, Math.floor((Date.now() - dt.getTime()) / 86400000));
  };
  const ageHours = (o: Order): number | null => {
    if (!o.time) return null;
    const t = parseTime12(o.time);
    if (t === null) return null;
    if (/today|just now|now/i.test(o.date)) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      let diff = nowMin - t;
      if (diff < 0) diff += 1440;
      return Math.round(diff / 60);
    }
    const d = daysSince(o.date);
    return d === null ? null : d * 24 + Math.round(t / 60);
  };

  // SLA dashboard — breaches across all reported orders, worst driver, per-month
  const slaStats = (() => {
    const byOrder: Array<{ oid: string; driver: string; breach: boolean; elapsed: number; month: string }> = [];
    orders.forEach(o => {
      const rep = reports.find(r => r.orderId === o.id);
      if (!rep || !o.time) return;
      const d = daysSince(o.date);
      if (range !== 'all' && (d === null || d > parseInt(range, 10))) return;
      const elapsed = minutesBetween(o.time, rep.time);
      if (elapsed === null) return;
      const target = (o.estimatedMinutes || 30) * (o.priority === 'Urgent' ? 0.5 : o.priority === 'Express' ? 0.75 : 1);
      byOrder.push({ oid: o.id, driver: o.driverId || 'Unassigned', breach: elapsed > target, elapsed, month: monthKey(o.date) });
    });
    const breaches = byOrder.filter(b => b.breach);
    const driverCount: Record<string, number> = {};
    breaches.forEach(b => { driverCount[b.driver] = (driverCount[b.driver] || 0) + 1; });
    const worst = Object.keys(driverCount).sort((a, b) => driverCount[b] - driverCount[a])[0];
    const byMonth: Record<string, number> = {};
    breaches.forEach(b => { byMonth[b.month] = (byMonth[b.month] || 0) + 1; });
    return {
      analyzed: byOrder.length,
      breaches: breaches.length,
      rate: byOrder.length ? Math.round((breaches.length / byOrder.length) * 100) : 0,
      worstDriver: worst || null,
      worstCount: worst ? driverCount[worst] : 0,
      byMonth,
      months: Object.keys(byMonth).sort()
    };
  })();

  // Resolution SLA tracker — average admin resolution time across fully-resolved orders
  const resolveTimes: number[] = [];
  Object.keys(resolveActions).forEach(oid => {
    const list = resolveActions[oid] || [];
    if (!list.length || !list.every(a => a.done)) return;
    const a = audit[oid] || [];
    const first = a[0], last = a[a.length - 1];
    if (first && last) {
      const mins = minutesBetween(first.time, last.time);
      if (mins !== null && mins >= 0) resolveTimes.push(mins);
    }
  });
  const avgResolveMin = resolveTimes.length ? Math.round(resolveTimes.reduce((s, m) => s + m, 0) / resolveTimes.length) : null;

  // Bulk resolution — multi-select reported orders and resolve together
  const bulkCandidates = orders.filter(o => reportedIds.has(o.id) && (range === 'all' || (daysSince(o.date) !== null && daysSince(o.date) <= parseInt(range, 10)))).slice(0, 30);
  const toggleBulk = (oid: string) => setBulkSelected(prev => prev.includes(oid) ? prev.filter(x => x !== oid) : [...prev, oid]);
  const bulkResolve = () => {
    if (!bulkSelected.length) return;
    bulkSelected.forEach(oid => {
      setResolveActions(prev => ({ ...prev, [oid]: [...(prev[oid] || []), { text: 'Resolved in bulk', done: true }] }));
      setAudit(prev => ({ ...prev, [oid]: [...(prev[oid] || []), { action: 'Bulk resolution', detail: `Order ${oid} marked resolved`, time: nowTime() }] }));
    });
    onNotify?.({ title: 'Bulk resolution applied', message: `${bulkSelected.length} orders resolved together.`, type: 'system' });
    setBulkSelected([]);
  };

  // Partial refund — refund only the selected items
  const refundSelectedItems = () => {
    if (!activeOrder) return;
    const sel = (activeOrder.items || []).filter(it => refundItems[it.name]).reduce((s, it) => s + it.price * it.quantity, 0);
    if (sel <= 0) return;
    pushResolve(activeOrder.id, `Partial refund — Tk ${sel.toFixed(2)}`);
    pushLedger(activeOrder.id, 'customer', 'credit', sel, 'Partial item refund');
    setRefundItems({});
  };

  // Route cost / fuel deduction — quick driver debit
  const fuelDeduction = () => {
    if (!activeOrder) return;
    const amt = parseFloat(ledgerAmount) || activeOrder.deliveryCharge || 50;
    pushLedger(activeOrder.id, 'driver', 'debit', amt, 'Route cost / fuel deduction');
  };

  // Auto notification template (WhatsApp / email draft) generated from the analysis
  const notificationDraft = (() => {
    if (!activeOrder) return '';
    const fault = faults[activeOrder.id];
    const lines: string[] = [];
    lines.push(`Hi ${activeOrder.customerName},`);
    lines.push(`Regarding your order #${activeOrder.id} (${activeOrder.storeName}, Tk ${activeOrder.amount.toFixed(2)}).`);
    if (fault) lines.push(`Our team reviewed your report and found the ${partyLabel[fault.party].toLowerCase()} at fault.`);
    if (suggestedRefund > 0) lines.push(`A refund of Tk ${suggestedRefund.toFixed(2)} is being processed.`);
    if (suggestedComp > 0) lines.push(`We are also adding Tk ${suggestedComp.toFixed(2)} as a goodwill gesture.`);
    if (suggestedFine > 0) lines.push(`The responsible driver has been fined Tk ${suggestedFine.toFixed(2)}.`);
    lines.push('Estimated settlement: 2-3 business days.');
    lines.push('Thank you for your patience — NexaGo Support.');
    return lines.join('\n');
  })();
  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(notificationDraft);
      if (activeOrderId) pushAudit('Notification draft copied', 'WhatsApp / email template');
    } catch { /* clipboard unavailable */ }
  };

  // Export every analyzed dispute as one CSV
  const exportAllCSV = () => {
    const ids = Array.from(new Set([...Object.keys(faults), ...Object.keys(resolveActions), ...Object.keys(ledger)]));
    const header = ['Order ID', 'Store', 'Customer', 'Amount (Tk)', 'Status', 'Report', 'Fault', 'Credits (Tk)', 'Debits (Tk)', 'Resolution done', 'SLA'];
    const rows = ids.map(oid => {
      const o = orders.find(x => x.id === oid);
      const f = faults[oid];
      const entries = ledger[oid] || [];
      const credits = entries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
      const debits = entries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
      const res = (resolveActions[oid] || []);
      const rep = reports.find(r => r.orderId === oid);
      let sla = '';
      if (o && rep && o.time) {
        const elapsed = minutesBetween(o.time, rep.time);
        if (elapsed !== null) {
          const target = (o.estimatedMinutes || 30) * (o.priority === 'Urgent' ? 0.5 : o.priority === 'Express' ? 0.75 : 1);
          sla = `${elapsed} min ${elapsed <= target ? 'OK' : 'BREACH'}`;
        }
      }
      return [oid, o?.storeName || '', o?.customerName || '', o?.amount.toFixed(2) || '', o?.status || '', rep ? rep.reason : '', f ? partyLabel[f.party] : '', credits.toFixed(2), debits.toFixed(2), `${res.filter(a => a.done).length}/${res.length}`, sla];
    });
    const csv = '\uFEFF' + [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexago-disputes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Demo data reset — clears the persisted support analysis
  const resetAnalysis = () => {
    if (!window.confirm('Clear all support analysis data (faults, resolutions, ledger, audits, proofs)?')) return;
    localStorage.removeItem(ANALYSIS_STORAGE_KEY);
    setFaults({}); setResolveActions({}); setLedger({}); setAudit({}); setProofs({});
    onNotify?.({ title: 'Support analysis reset', message: 'All support analysis data cleared.', type: 'system' });
  };

  // Refund timeline — Pending → Processed → Settled derived from report + ledger + status
  const refundTimeline = (() => {
    if (!activeOrder) return null;
    const hasReport = activeOrderReports.length > 0;
    const credits = (ledger[activeOrder.id] || []).filter(e => e.party === 'customer' && e.type === 'credit').reduce((s, e) => s + e.amount, 0);
    return { hasReport, credits, processed: credits > 0, settled: activeOrder.status === 'Completed' };
  })();

  // Profile month filter
  const monthKey = (d: string) => {
    if (!d) return 'Unknown';
    const iso = d.match(/(\d{4})-(\d{2})/);
    if (iso) return `${iso[2]}/${iso[1]}`;
    const named = d.match(/([A-Za-z]{3,9})\s+\d{1,2},\s*(\d{4})/);
    if (named) return `${named[1]} ${named[2]}`;
    return d;
  };
  const profileMonths = profileView && profileData ? Array.from(new Set(profileData.orders.map(o => monthKey(o.date)))).sort() : [];
  const filteredProfileOrders = (profileMonth === 'all' ? (profileData?.orders || []) : (profileData?.orders || []).filter(o => monthKey(o.date) === profileMonth));
  const filteredProfileReports = (profileMonth === 'all' ? (profileData?.reports || []) : (profileData?.reports || []).filter(r => {
    const o = orders.find(x => x.id === r.orderId);
    return o ? monthKey(o.date) === profileMonth : false;
  }));

  // ---- Driver scorecard: orders, SLA breaches, fines, complaints → grade A/B/C
  const driverScorecards = (() => {
    const breachesByDriver: Record<string, number> = {};
    orders.forEach(o => {
      const rep = reports.find(r => r.orderId === o.id);
      if (!o.driverId || !rep || !o.time) return;
      const elapsed = minutesBetween(o.time, rep.time);
      if (elapsed === null) return;
      const target = (o.estimatedMinutes || 30) * (o.priority === 'Urgent' ? 0.5 : o.priority === 'Express' ? 0.75 : 1);
      if (elapsed > target) breachesByDriver[o.driverId] = (breachesByDriver[o.driverId] || 0) + 1;
    });
    const map: Record<string, { orders: number; breaches: number; fines: number; complaints: number }> = {};
    orders.forEach(o => {
      if (!o.driverId) return;
      const m = map[o.driverId] || { orders: 0, breaches: 0, fines: 0, complaints: 0 };
      m.orders++;
      if (reports.filter(r => r.orderId === o.id).length > 1) m.complaints++;
      map[o.driverId] = m;
    });
    Object.keys(ledger).forEach(oid => {
      (ledger[oid] || []).forEach(e => {
        if (e.party === 'driver' && e.type === 'debit') {
          const did = orders.find(o => o.id === oid)?.driverId;
          if (did && map[did]) map[did].fines += e.amount;
        }
      });
    });
    Object.keys(breachesByDriver).forEach(did => { if (map[did]) map[did].breaches = breachesByDriver[did]; });
    return Object.keys(map).map(did => {
      const m = map[did];
      const grade = m.breaches === 0 && m.fines === 0 ? 'A' : (m.breaches <= 1 && m.fines < 200 ? 'B' : 'C');
      return { driver: did, ...m, grade };
    }).sort((a, b) => b.orders - a.orders);
  })();

  // ---- Store performance: orders, delivery mins, store-at-fault → issues
  const storePerformance = (() => {
    const map: Record<string, { orders: number; mins: number; counted: number; atFault: number }> = {};
    orders.forEach(o => {
      const m = map[o.storeName] || { orders: 0, mins: 0, counted: 0, atFault: 0 };
      m.orders++;
      const rep = reports.find(r => r.orderId === o.id);
      if (rep && o.time) {
        const elapsed = minutesBetween(o.time, rep.time);
        if (elapsed !== null) { m.mins += elapsed; m.counted++; }
      }
      map[o.storeName] = m;
    });
    Object.keys(faults).forEach(oid => {
      const f = faults[oid];
      if (f.party === 'store') {
        const o = orders.find(x => x.id === oid);
        if (o && map[o.storeName]) map[o.storeName].atFault++;
      }
    });
    return Object.keys(map).map(name => {
      const m = map[name];
      return { store: name, orders: m.orders, avgMin: m.counted ? Math.round(m.mins / m.counted) : null, atFault: m.atFault };
    }).sort((a, b) => b.orders - a.orders);
  })();

  // ---- Duplicate order detection: same customer + amount + address
  const duplicateOrders = (() => {
    const groups: Record<string, Order[]> = {};
    orders.forEach(o => {
      const key = `${o.customerName}|${o.amount}|${o.address}`;
      (groups[key] = groups[key] || []).push(o);
    });
    return Object.keys(groups).filter(k => groups[k].length > 1).map(k => groups[k]);
  })();

  // ---- Order aging: pending/ongoing orders open too long
  const agingOrders = orders.filter(o => (o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Processing' || o.status === 'Ongoing'))
    .map(o => ({ order: o, hours: ageHours(o) }))
    .filter(x => x.hours !== null && x.hours >= 2)
    .sort((a, b) => (b.hours || 0) - (a.hours || 0));

  // ---- Predicted report priority from the reason text
  const predictedPriority = (() => {
    const reason = activeOrderReports[0]?.reason || '';
    const note = activeOrderReports[0]?.note || '';
    const text = (reason + ' ' + note).toLowerCase();
    const highWords = ['refund', 'wrong', 'missing', 'cancel', 'not received', 'charged', 'damaged', 'urgent', 'late', 'delay', 'never'];
    const lowWords = ['question', 'how', 'when', 'status', 'info', 'update'];
    let score = 0;
    highWords.forEach(w => { if (text.includes(w)) score += 2; });
    lowWords.forEach(w => { if (text.includes(w)) score -= 1; });
    if (score >= 3) return 'High';
    if (score <= 0 && text) return 'Low';
    return 'Medium';
  })();

  // ---- CSAT — simulated customer satisfaction once all resolution steps are done
  const csat = (() => {
    const list = resolveActions[activeOrder?.id || ''] || [];
    return list.length > 0 && list.every(a => a.done) ? 4.6 : null;
  })();

  // ---- Ticket SLA aging + auto-assigned support agent (deterministic from id)
  const ticketAging = (id: string) => {
    const tk = tickets.find(t => t.id === id);
    if (!tk || tk.status === 'Resolved') return null;
    return daysSince(tk.date);
  };
  const agentOf = (id: string) => `Agent-${(id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 4) + 1}`;

  // ---- Backup export / import JSON
  const exportBackup = () => {
    const data = { faults, resolveActions, ledger, audit, proofs, savedTemplates };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexago-support-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        setFaults(data.faults || {});
        setResolveActions(data.resolveActions || {});
        setLedger(data.ledger || {});
        setAudit(data.audit || {});
        setProofs(data.proofs || {});
        setSavedTemplates(data.savedTemplates || []);
        onNotify?.({ title: 'Backup restored', message: 'Support analysis data imported.', type: 'system' });
      } catch { /* invalid file */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ---- Resolution replay: save / apply / delete saved templates
  const saveTemplate = () => {
    if (!activeOrder) return;
    const steps = (resolveActions[activeOrder.id] || []).map(a => a.text);
    if (!steps.length) return;
    const name = `${activeOrder.id} solution`;
    setSavedTemplates(prev => [...prev, { id: 'T-' + Date.now(), name, steps }]);
    pushAudit('Resolution template saved', name);
  };
  const applySavedTemplate = (t: { id: string; name: string; steps: string[] }) => {
    if (!activeOrderId) return;
    t.steps.forEach(s => setResolveActions(prev => ({ ...prev, [activeOrderId!]: [...(prev[activeOrderId!] || []), { text: s, done: true }] })));
    pushAudit('Resolution template applied', t.name);
  };
  const deleteTemplate = (id: string) => setSavedTemplates(prev => prev.filter(x => x.id !== id));

  // ---- Route mini-map geometry (SVG)
  const route = (() => {
    if (!activeOrder) return null;
    const a = activeOrder.pickupCoords;
    const b = activeOrder.deliveryCoords;
    return { has: !!(a && b), a, b };
  })();

  // ================= TECHNICAL SUPPORT SYSTEM =================
  const techTickets = tickets.filter(t => categorize(t) === 'technical');

  const diagnoseIssue = (subject: string) => {
    const s = subject.toLowerCase();
    const type = /payment|charge|wallet|refund|transaction|fail|deduct/i.test(s) ? 'Payment / Transaction Error'
      : /login|otp|password|account|sign|register|verify/i.test(s) ? 'Login / Account Issue'
      : /gps|location|map|pin|route|tracking/i.test(s) ? 'GPS / Location Issue'
      : /notif|sms|alert|push|otp not/i.test(s) ? 'Notification / SMS Issue'
      : /crash|freeze|hang|slow|loading|blank|white/i.test(s) ? 'App Crash / Freeze / Slow'
      : /sync|data not|order not showing|duplicate|double/i.test(s) ? 'Data Sync Issue'
      : /install|reinstall|update|version|store/i.test(s) ? 'Install / Update Issue'
      : 'General Technical Issue';
    const severity = /critical|emergency|total|all order|down|crash every|urgent|full/i.test(s) ? 'Critical'
      : /error|not working|fails|always|every time/i.test(s) ? 'High' : 'Medium';
    const platform = /driver/i.test(s) ? 'Driver App' : /store|restaurant|merchant/i.test(s) ? 'Store Panel' : /customer|order|delivery|checkout/i.test(s) ? 'Customer App' : 'Admin / Multi';
    return { type, severity, platform };
  };

  const techFixPlaybook: Record<string, string[]> = {
    'Payment / Transaction Error': ['Verify payment gateway status', 'Check the failed transaction in Payments log', 'Void or refund the failed transaction', 'Notify the customer of the outcome'],
    'Login / Account Issue': ['Reset the account password / OTP', 'Check account status (active / suspended)', 'Verify the phone number on record', 'Re-send the verification code'],
    'GPS / Location Issue': ['Check GPS permission on the device', 'Verify pickup / delivery coordinates', 'Clear app cache and re-locate', 'Update the map service key'],
    'Notification / SMS Issue': ['Check the notification service status', 'Verify push permission on the device', 'Re-send the failed message', 'Mark the notification delivered'],
    'App Crash / Freeze / Slow': ['Check the app server status', 'Advise cache clear + app restart', 'Check the installed app version', 'Escalate to engineering if it persists'],
    'Data Sync Issue': ['Check the database / sync service', 'Force a re-sync from settings', 'Verify the order appears in all apps', 'Clear the stale cache'],
    'Install / Update Issue': ['Advise reinstalling from the app store', 'Check device storage / OS version', 'Provide the direct APK / download link', 'Verify the install signature'],
    'General Technical Issue': ['Restart the app', 'Clear cache', 'Check the network connection', 'Escalate to engineering if unresolved']
  };

  const activeTech = activeTicket && categorize(activeTicket) === 'technical' ? diagnoseIssue(activeTicket.subject) : null;

  const toggleHealth = (k: string) => {
    const next = health[k] === 'Online' ? 'Issue' : 'Online';
    setHealth(prev => ({ ...prev, [k]: next }));
    if (next === 'Issue') {
      setKnownIssues(prev => [{ id: 'INC-' + Math.floor(100 + Math.random() * 900), title: `${k} — automated service alert`, severity: 'High', platform: 'Admin / Multi', status: 'Investigating', time: nowTime() }, ...prev]);
      setTechAudit(prev => [{ action: 'Service alert raised', detail: `${k} flagged as Issue — incident auto-logged`, time: nowTime() }, ...prev]);
    } else {
      setKnownIssues(prev => prev.map(iss => iss.title.startsWith(`${k} —`) && iss.status !== 'Resolved' ? { ...iss, status: 'Resolved' } : iss));
      setTechAudit(prev => [{ action: 'Service recovered', detail: `${k} back Online — linked incidents auto-resolved`, time: nowTime() }, ...prev]);
    }
  };

  const logIssue = () => {
    if (!issueForm.title.trim()) return;
    setKnownIssues(prev => [{ id: 'INC-' + Math.floor(100 + Math.random() * 900), title: issueForm.title.trim(), severity: issueForm.severity as 'Low' | 'Medium' | 'High' | 'Critical', platform: issueForm.platform, status: 'Investigating', time: nowTime() }, ...prev]);
    setTechAudit(prev => [{ action: 'Incident logged', detail: issueForm.title.trim(), time: nowTime() }, ...prev]);
    setIssueForm(f => ({ ...f, title: '' }));
  };
  const advanceIssue = (id: string, status: 'Investigating' | 'Fix Deployed' | 'Resolved') => {
    setKnownIssues(prev => prev.map(k => k.id === id ? { ...k, status } : k));
    setTechAudit(prev => [{ action: 'Incident updated', detail: `${id} → ${status}`, time: nowTime() }, ...prev]);
  };
  const deleteIssue = (id: string) => {
    setKnownIssues(prev => prev.filter(k => k.id !== id));
    setTechAudit(prev => [{ action: 'Incident closed', detail: id, time: nowTime() }, ...prev]);
  };
  const logIncidentFromArticle = (articleId: string) => {
    const a = KB_ARTICLES.find(x => x.id === articleId);
    if (!a) return;
    setKnownIssues(prev => [{ id: 'INC-' + Math.floor(100 + Math.random() * 900), title: `${a.title} (${a.id})`, severity: a.severity, platform: a.platform, status: 'Investigating', time: nowTime() }, ...prev]);
    setTechAudit(prev => [{ action: 'Incident raised from KB', detail: `${a.id} — ${a.title}`, time: nowTime() }, ...prev]);
  };
  const applyTechFix = (step: string) => {
    if (activeOrderId) {
      pushResolve(activeOrderId, step);
      pushAudit('Technical fix applied', step);
    }
    setTechAudit(prev => [{ action: 'Fix applied', detail: step, time: nowTime() }, ...prev]);
  };
  const applyAllTechFixes = () => {
    if (!activeTech) return;
    techFixPlaybook[activeTech.type].forEach(applyTechFix);
  };

  const filteredKB = KB_ARTICLES.filter(a => {
    const q = kbSearch.trim().toLowerCase();
    const okCat = kbCat === 'All' || a.cat === kbCat;
    const okPlat = kbPlat === 'All' || a.platform === kbPlat;
    const okQ = !q || `${a.title} ${a.cause} ${a.cat}`.toLowerCase().includes(q);
    return okCat && okPlat && okQ;
  });

  const diagArticle = (() => {
    if (!diagSymptom) return null;
    const s = diagSymptom.toLowerCase();
    const kw: Array<[string, string]> = [
      ['bkash', 'KB-001'], ['nagad', 'KB-001'], ['rocket', 'KB-001'], ['failed', 'KB-001'], ['payment', 'KB-001'],
      ['paid', 'KB-004'], ['charge', 'KB-004'], ['refund', 'KB-003'], ['cashback', 'KB-002'],
      ['log in', 'KB-005'], ['login', 'KB-005'], ['otp', 'KB-006'], ['password', 'KB-005'], ['locked', 'KB-007'],
      ['crash', 'KB-012'], ['slow', 'KB-013'], ['loading', 'KB-034'], ['stuck', 'KB-034'], ['blank', 'KB-012'], ['white', 'KB-012'],
      ['gps', 'KB-008'], ['location', 'KB-008'], ['route', 'KB-009'],
      ['notification', 'KB-010'], ['alert', 'KB-011'], ['push', 'KB-010'], ['sms', 'KB-006'],
      ['missing', 'KB-015'], ['not showing', 'KB-015'], ['sync', 'KB-015'], ['duplicate', 'KB-016'], ['doubl', 'KB-016'],
      ['checkout', 'KB-018'], ['coupon', 'KB-019'], ['offer', 'KB-019'], ['address', 'KB-020'],
      ['install', 'KB-012'], ['update', 'KB-012'],
      ['photo', 'KB-029'], ['upload', 'KB-029'], ['image', 'KB-029'],
      ['receipt', 'KB-025'], ['print', 'KB-025'],
      ['earnings', 'KB-028'], ['settlement', 'KB-027'], ['mismatch', 'KB-027'],
      ['topup', 'KB-032'], ['top-up', 'KB-032'], ['wallet', 'KB-032']
    ];
    for (const [k, id] of kw) if (s.includes(k)) return KB_ARTICLES.find(a => a.id === id) || null;
    return KB_ARTICLES.find(a => a.cat === 'App & UI') || KB_ARTICLES[0];
  })();

  // ================= USER MANAGEMENT =================
  const filteredUsers = users.filter(u => {
    const q = userSearch.trim().toLowerCase();
    const okQ = !q || `${u.name} ${u.phone} ${u.zone} ${u.id} ${u.note || ''}`.toLowerCase().includes(q);
    const okT = userTypeFilter === 'all' || u.type === userTypeFilter;
    const okS = userStatusFilter === 'all' || u.status === userStatusFilter;
    return okQ && okT && okS;
  });
  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    blocked: users.filter(u => u.status === 'blocked').length,
    pending: users.filter(u => u.status === 'pending').length,
    flagged: users.filter(u => (u.type === 'driver' && u.grade === 'C') || u.status === 'blocked' || (u.type !== 'customer' && u.complaints > 0) || u.complaints >= 2).length
  };
  const userFlags = (u: ManagedUser): string[] => {
    const f: string[] = [];
    if (u.status === 'blocked') f.push('Blocked');
    if (u.status === 'pending') f.push('Pending verification');
    if (u.type === 'driver' && u.grade === 'C') f.push('Poor scorecard');
    if (u.type === 'store' && u.complaints > 0) f.push('Store complaints');
    if (u.complaints >= 2) f.push('Repeat complainant');
    return f;
  };
  const addNewUser = () => {
    if (!newUser.name.trim()) return;
    const idPrefix = newUser.type === 'customer' ? 'CUS' : newUser.type === 'driver' ? 'DRV' : 'STR';
    setUsers(prev => [{
      id: idPrefix + String(prev.length + 1).padStart(4, '0'),
      name: newUser.name.trim(),
      phone: newUser.phone.trim() || (newUser.type === 'customer' ? '+88017' : newUser.type === 'driver' ? '+88018' : '+88019') + 'XXXXXXXXX',
      type: newUser.type,
      status: 'active',
      zone: newUser.zone.trim() || 'Dhaka',
      added: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      orders: 0,
      complaints: 0,
      note: 'Added by support desk'
    }, ...prev]);
    setTechAudit(prev => [{ action: 'User created', detail: `${newUser.type}: ${newUser.name.trim()} (${newUser.phone.trim() || 'no phone'})`, time: nowTime() }, ...prev]);
    setNewUser({ name: '', phone: '', type: 'customer', zone: '' });
    setAddUserOpen(false);
  };
  const toggleUserStatus = (id: string) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    const next = u.status === 'blocked' ? 'active' : 'blocked';
    setUsers(prev => prev.map(x => x.id === id ? { ...x, status: next } : x));
    setTechAudit(prev => [{ action: next === 'blocked' ? 'User blocked' : 'User re-activated', detail: `${u.name} (${u.id})`, time: nowTime() }, ...prev]);
  };
  const setUserStatus = (id: string, status: ManagedUser['status']) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    setUsers(prev => prev.map(x => x.id === id ? { ...x, status } : x));
    setTechAudit(prev => [{ action: 'User status changed', detail: `${u.name} (${u.id}) → ${status}`, time: nowTime() }, ...prev]);
  };
  const startEditUser = (u: ManagedUser) => {
    setEditingUser(u.id);
    setUserEdit({ name: u.name, phone: u.phone, zone: u.zone, note: u.note || '' });
  };
  const saveUserEdit = () => {
    if (!editingUser) return;
    const u = users.find(x => x.id === editingUser);
    setUsers(prev => prev.map(x => x.id === editingUser ? { ...x, name: userEdit.name.trim() || x.name, phone: userEdit.phone.trim() || x.phone, zone: userEdit.zone.trim() || x.zone, note: userEdit.note.trim() } : x));
    if (u) setTechAudit(prev => [{ action: 'User edited', detail: `${u.name} (${u.id}) updated`, time: nowTime() }, ...prev]);
    setEditingUser(null);
  };
  const removeUser = (id: string) => {
    const u = users.find(x => x.id === id);
    setUsers(prev => prev.filter(x => x.id !== id));
    if (u) setTechAudit(prev => [{ action: 'User removed', detail: `${u.name} (${u.id})`, time: nowTime() }, ...prev]);
  };

  // ================= FIX ADVISOR — exactly what to do, where, and which button =================
  const userNextAction = (u: ManagedUser): string => {
    if (u.status === 'blocked') return 'Press Re-activate to restore access';
    if (u.status === 'pending') return 'Press Approve after the document check';
    if (u.type === 'driver' && u.grade === 'C') return 'Open the 360 profile → review fines, decide retrain';
    if (u.type === 'store' && u.complaints > 0) return 'Open related disputes → refund if at fault';
    if (u.complaints >= 2) return 'Call the customer to fix their repeat issue';
    return 'No action needed — user is healthy';
  };

  // ================= INTEGRATIONS / MAINTENANCE / KPI =================
  const slaInfo = (severity: 'Low' | 'Medium' | 'High' | 'Critical'): { targetMins: number; label: string } => {
    const t = slaConfig[severity];
    return { targetMins: t, label: t >= 60 && t % 60 === 0 ? `${t / 60} hr${t / 60 > 1 ? 's' : ''}` : `${t} min` };
  };
  const incidentOpenMins = (time: string): number | null => minutesBetween(time, nowTime());
  const cycleIntegration = (name: string) => {
    const cur = integrations[name]?.status || 'Connected';
    const next = cur === 'Connected' ? 'Degraded' : cur === 'Degraded' ? 'Down' : 'Connected';
    setIntegrations(prev => ({ ...prev, [name]: { ...(prev[name] || { lastSync: nowTime(), note: 'Healthy' }), status: next, note: next === 'Connected' ? 'Healthy' : next === 'Degraded' ? 'Slow response detected' : 'Unreachable' } }));
    setTechAudit(prev => [{ action: next === 'Connected' ? 'Integration restored' : `Integration ${next.toLowerCase()}`, detail: `${name} → ${next}`, time: nowTime() }, ...prev]);
  };
  const testIntegration = (name: string) => {
    setIntegrations(prev => ({ ...prev, [name]: { ...(prev[name] || { status: 'Connected' as const, note: 'Healthy' }), lastSync: nowTime() } }));
    setTechAudit(prev => [{ action: 'Integration tested', detail: `${name} — health check run`, time: nowTime() }, ...prev]);
  };
  const addMaintenance = () => {
    if (!maintForm.title.trim()) return;
    setMaintenance(prev => [{ id: 'MNT-' + Math.floor(100 + Math.random() * 900), service: maintForm.service, title: maintForm.title.trim(), status: 'Scheduled', time: nowTime() }, ...prev]);
    setTechAudit(prev => [{ action: 'Maintenance scheduled', detail: `${maintForm.service}: ${maintForm.title.trim()}`, time: nowTime() }, ...prev]);
    setMaintForm(f => ({ ...f, title: '' }));
  };
  const cycleMaintenance = (id: string) => {
    const m = maintenance.find(x => x.id === id);
    setMaintenance(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Scheduled' ? 'Ongoing' : x.status === 'Ongoing' ? 'Done' : 'Scheduled' } : x));
    if (m) setTechAudit(prev => [{ action: 'Maintenance updated', detail: `${m.id} → ${m.status === 'Scheduled' ? 'Ongoing' : m.status === 'Ongoing' ? 'Done' : 'Scheduled'}`, time: nowTime() }, ...prev]);
  };
  const removeMaintenance = (id: string) => {
    setMaintenance(prev => prev.filter(m => m.id !== id));
    setTechAudit(prev => [{ action: 'Maintenance removed', detail: id, time: nowTime() }, ...prev]);
  };
  const deployRelease = (app: string, version: string) => {
    setTechAudit(prev => [{ action: 'Release deployed', detail: `${app} ${version} promoted to production`, time: nowTime() }, ...prev]);
  };
  const techKpis = {
    fixesApplied: techAudit.filter(a => a.action === 'Fix applied').length,
    incidents: knownIssues.length,
    resolved: knownIssues.filter(i => i.status === 'Resolved').length,
    resolutionRate: knownIssues.length ? Math.round(knownIssues.filter(i => i.status === 'Resolved').length / knownIssues.length * 100) : 0,
    open: knownIssues.filter(i => i.status !== 'Resolved').length,
    worstService: (() => {
      const counts: Record<string, number> = {};
      Object.keys(health).forEach(k => { if (health[k] === 'Issue') counts[k] = 1; });
      knownIssues.forEach(i => { const svc = i.title.split(' — ')[0]; counts[svc] = (counts[svc] || 0) + 1; });
      const entries = Object.entries(counts);
      if (!entries.length) return null;
      return entries.sort((a, b) => b[1] - a[1])[0];
    })()
  };

  // ================= BACKLOG / BUG REPORT / DIAGNOSTICS / RECONCILE / RCA =================
  const addBacklog = () => {
    if (!backlogForm.task.trim()) return;
    setBacklog(prev => [{ id: 'TASK-' + Math.floor(1000 + Math.random() * 9000), task: backlogForm.task.trim(), priority: backlogForm.priority as 'Low' | 'Medium' | 'High' | 'Critical', assignee: backlogForm.assignee.trim() || 'Agent-1', status: 'Todo' }, ...prev]);
    setTechAudit(prev => [{ action: 'Backlog task created', detail: `${backlogForm.priority}: ${backlogForm.task.trim()} (${backlogForm.assignee.trim() || 'Agent-1'})`, time: nowTime() }, ...prev]);
    setBacklogForm(f => ({ ...f, task: '' }));
  };
  const cycleBacklog = (id: string) => {
    const t = backlog.find(x => x.id === id);
    setBacklog(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Todo' ? 'In Progress' : x.status === 'In Progress' ? 'Done' : 'Todo' } : x));
    if (t) setTechAudit(prev => [{ action: 'Backlog updated', detail: `${t.id}: ${t.task} → ${t.status === 'Todo' ? 'In Progress' : t.status === 'In Progress' ? 'Done' : 'Todo'}`, time: nowTime() }, ...prev]);
  };
  const deleteBacklog = (id: string) => {
    const t = backlog.find(x => x.id === id);
    setBacklog(prev => prev.filter(x => x.id !== id));
    if (t) setTechAudit(prev => [{ action: 'Backlog task removed', detail: `${t.id}: ${t.task}`, time: nowTime() }, ...prev]);
  };
  const submitBug = () => {
    if (!bugForm.title.trim()) return;
    setKnownIssues(prev => [{ id: 'BUG-' + Math.floor(100 + Math.random() * 900), title: `[Bug] ${bugForm.title.trim()}`, severity: bugForm.severity as 'Low' | 'Medium' | 'High' | 'Critical', platform: bugForm.app, status: 'Investigating', time: nowTime() }, ...prev]);
    setTechAudit(prev => [{ action: 'Bug report filed', detail: `${bugForm.app}${bugForm.version ? ' ' + bugForm.version : ''}${bugForm.device ? ' · ' + bugForm.device : ''}: ${bugForm.title.trim()}${bugForm.repro.trim() ? ' — repro: ' + bugForm.repro.trim() : ''}`, time: nowTime() }, ...prev]);
    setBugForm({ title: '', app: bugForm.app, version: '', device: '', severity: bugForm.severity, repro: '' });
  };
  const runDiagnostics = () => {
    const checks: Array<{ label: string; result: 'Pass' | 'Warn' | 'Fail'; detail: string }> = [];
    Object.keys(health).forEach(k => checks.push({ label: `Service — ${k}`, result: health[k] === 'Online' ? 'Pass' : 'Fail', detail: health[k] === 'Online' ? 'Responding normally' : 'Service is down' }));
    INTEGRATIONS.forEach(ig => {
      const st = integrations[ig.name]?.status || 'Connected';
      checks.push({ label: `Vendor — ${ig.name}`, result: st === 'Connected' ? 'Pass' : st === 'Degraded' ? 'Warn' : 'Fail', detail: st === 'Connected' ? 'Handshake OK' : st === 'Degraded' ? 'Slow / partial response' : 'Unreachable' });
    });
    checks.push({ label: 'Open incidents', result: techKpis.open === 0 ? 'Pass' : 'Warn', detail: `${techKpis.open} still open` });
    checks.push({ label: 'Blocked users', result: userStats.blocked === 0 ? 'Pass' : 'Warn', detail: `${userStats.blocked} user(s) blocked` });
    checks.push({ label: 'Duplicate orders', result: duplicateOrders.length === 0 ? 'Pass' : 'Fail', detail: `${duplicateOrders.length} duplicate group(s)` });
    checks.push({ label: 'Aging orders (2h+)', result: agingOrders.length === 0 ? 'Pass' : 'Warn', detail: `${agingOrders.length} order(s) over 2h` });
    setDiagReport({ time: nowTime(), checks });
    setTechAudit(prev => [{ action: 'Full diagnostics run', detail: `${checks.filter(c => c.result !== 'Pass').length} issue(s) across ${checks.length} checks`, time: nowTime() }, ...prev]);
  };
  const saveRca = (id: string) => {
    if (!rcaForm.root.trim()) return;
    setKnownIssues(prev => prev.map(x => x.id === id ? { ...x, rca: rcaForm.root.trim(), prevention: rcaForm.prevention.trim() || x.prevention } : x));
    setTechAudit(prev => [{ action: 'Postmortem (RCA) recorded', detail: `${id} — ${rcaForm.root.trim()}${rcaForm.prevention.trim() ? ' | prevention: ' + rcaForm.prevention.trim() : ''}`, time: nowTime() }, ...prev]);
    setRcaOpen(null);
    setRcaForm({ root: '', prevention: '' });
  };
  const reconcileIssues = (() => {
    const out: Array<{ problem: string; what: string; fix: string }> = [];
    orders.forEach(o => {
      const rep = reports.filter(r => r.orderId === o.id);
      if (rep.length > 0 && !faults[o.id]) out.push({ problem: `Reported order ${o.id} has no fault assigned`, what: 'Report present but the at-fault analysis is missing', fix: 'Open the order analysis and record the fault party' });
      const splitSum = (o.codAmount || 0) + (o.splitWalletAmount || 0);
      if (o.splitWalletAmount && splitSum !== o.amount) out.push({ problem: `Order ${o.id} payment split mismatch`, what: `COD Tk ${o.codAmount || 0} + wallet Tk ${o.splitWalletAmount} ≠ total Tk ${o.amount}`, fix: 'Recompute the COD/wallet split in the SD Ledger' });
    });
    Object.keys(ledger).forEach(oid => {
      const credits = (ledger[oid] || []).filter(e => e.type === 'credit' && e.party === 'customer');
      const steps = resolveActions[oid] || [];
      const hasRefundStep = steps.some(s => /refund|credit|waive/i.test(s.text));
      if (credits.length > 0 && !hasRefundStep) out.push({ problem: `Order ${oid} has customer credits without a refund step`, what: `${credits.length} credit(s) in the ledger but no refund resolution step`, fix: 'Add the refund step to the resolution list' });
    });
    return out;
  })();

  // ================= SLA CONFIG / API MONITOR / ALERT RULES / SECURITY / RUNBOOKS =================
  const updateSla = (sev: 'Critical' | 'High' | 'Medium' | 'Low', mins: number) => {
    const safe = Math.max(1, Math.min(4320, mins || 15));
    setSlaConfig(prev => ({ ...prev, [sev]: safe }));
    setTechAudit(prev => [{ action: 'SLA target updated', detail: `${sev} response target → ${safe} min`, time: nowTime() }, ...prev]);
  };
  const refreshApiLog = () => {
    const picks = API_ENDPOINTS.slice();
    const take = picks.slice(0, 3).map(p => {
      const ok = Math.random() < 0.85;
      return { time: nowTime(), method: p.method, endpoint: p.endpoint, status: ok ? (p.method === 'POST' ? 201 : 200) : 500, ms: ok ? 40 + Math.floor(Math.random() * 220) : 900 + Math.floor(Math.random() * 700), source: p.source };
    });
    setApiLog(prev => [...take, ...prev].slice(0, 25));
    setTechAudit(prev => [{ action: 'API traffic sampled', detail: `${take.filter(t => t.status >= 500).length} failed of ${take.length} sampled calls`, time: nowTime() }, ...prev]);
  };
  const toggleAlertRule = (id: string) => {
    const r = alertRules.find(x => x.id === id);
    setAlertRules(prev => prev.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
    if (r) setTechAudit(prev => [{ action: 'Alert rule updated', detail: `${r.id}: ${r.rule} → ${r.enabled ? 'disabled' : 'enabled'}`, time: nowTime() }, ...prev]);
  };
  const runSecurityScan = () => {
    const score = Math.max(35, Math.min(100, 100 - userStats.blocked * 4 - techKpis.open * 3 - (driverScorecards.filter(d => d.grade === 'C').length * 2)));
    setSecurityScore(score);
    setSecurityEvents(prev => [{ time: nowTime(), type: 'Security scan completed', detail: `Score ${score}/100 — ${score >= 85 ? 'healthy' : score >= 65 ? 'needs attention' : 'action required'}`, severity: score >= 85 ? 'Low' : score >= 65 ? 'Medium' : 'High' }, ...prev]);
    setTechAudit(prev => [{ action: 'Security scan run', detail: `Score ${score}/100 (blocked ${userStats.blocked}, open incidents ${techKpis.open})`, time: nowTime() }, ...prev]);
  };
  const logRunbook = (rb: typeof SOP_RUNBOOKS[0]) => {
    setTechAudit(prev => [{ action: `Runbook executed — ${rb.id}`, detail: `${rb.title}: ${rb.steps.join(' → ')}`, time: nowTime() }, ...prev]);
  };

  // ================= ANALYTICS / CASCADE / FLAGS / ON-CALL =================
  const auditBuckets = (() => {
    const map: Record<string, number> = {};
    techAudit.forEach(a => {
      const k = a.action.includes('Fix applied') ? 'Fixes'
        : /Incident|alert|raised/i.test(a.action) ? 'Incidents'
        : /Security|scan/i.test(a.action) ? 'Security'
        : /Release|deploy/i.test(a.action) ? 'Releases'
        : /User|blocked|created|re-activat/i.test(a.action) ? 'User ops'
        : /Integration|tested/i.test(a.action) ? 'Integrations'
        : /SLA/i.test(a.action) ? 'SLA config'
        : /Diagnostic/i.test(a.action) ? 'Diagnostics'
        : /Runbook/i.test(a.action) ? 'Runbooks'
        : /Maintenance/i.test(a.action) ? 'Maintenance'
        : /Backlog/i.test(a.action) ? 'Backlog'
        : /Bug/i.test(a.action) ? 'Bug reports'
        : 'Other';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();
  const sevCounts = (['Critical', 'High', 'Medium', 'Low'] as const).map(s => ({ sev: s, n: knownIssues.filter(i => i.severity === s).length }));
  const sevMax = Math.max(1, ...sevCounts.map(x => x.n));
  const agentWorkload = AGENTS.map(a => {
    const tks = tickets.filter(t => agentOf(t.id) === a);
    const open = tks.filter(t => t.status !== 'Resolved').length;
    const backlogTasks = backlog.filter(b => b.assignee === a && b.status !== 'Done').length;
    return { agent: a, total: tks.length, open, backlogTasks, load: tks.length + backlogTasks };
  }).sort((a, b) => b.load - a.load);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  const onCallRoster = dayNames.map((d, i) => ({ day: d, agent: AGENTS[i % AGENTS.length], current: i === todayIdx }));
  const cascadeAffected = (key: string): string[] => {
    const seen = new Set<string>();
    const walk = (k: string) => {
      (DEPENDENCY_MAP[k] || []).forEach(d => { if (!seen.has(d)) { seen.add(d); walk(d); } });
    };
    walk(key);
    return Array.from(seen);
  };
  const downServices = Object.keys(health).filter(k => health[k] === 'Issue');
  const toggleFlag = (key: string) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
    const f = FEATURE_FLAGS.find(x => x.key === key);
    setTechAudit(prev => [{ action: 'Feature flag toggled', detail: `${f ? f.label : key} → ${flags[key] ? 'off' : 'on'}`, time: nowTime() }, ...prev]);
  };

  // ================= CHANGE MGMT / WAR ROOM / EXPORT / TICKET SLA / UPTIME =================
  const addChange = () => {
    if (!changeForm.title.trim()) return;
    setChanges(prev => [{ id: 'CHG-' + Math.floor(100 + Math.random() * 900), title: changeForm.title.trim(), service: changeForm.service, type: changeForm.type, risk: changeForm.risk as 'Low' | 'Medium' | 'High', status: 'Proposed', by: changeForm.by.trim() || 'Agent-1' }, ...prev]);
    setTechAudit(prev => [{ action: 'Change proposed', detail: `${changeForm.title.trim()} on ${changeForm.service} (${changeForm.risk} risk, ${changeForm.type})`, time: nowTime() }, ...prev]);
    setChangeForm(f => ({ ...f, title: '' }));
  };
  const cycleChange = (id: string) => {
    const c = changes.find(x => x.id === id);
    setChanges(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Proposed' ? 'Approved' : x.status === 'Approved' ? 'Deployed' : x.status === 'Deployed' ? 'Rolled Back' : 'Proposed' } : x));
    if (c) setTechAudit(prev => [{ action: 'Change status updated', detail: `${c.id}: ${c.title} → ${c.status === 'Proposed' ? 'Approved' : c.status === 'Approved' ? 'Deployed' : c.status === 'Deployed' ? 'Rolled Back' : 'Proposed'}`, time: nowTime() }, ...prev]);
  };
  const deleteChange = (id: string) => {
    const c = changes.find(x => x.id === id);
    setChanges(prev => prev.filter(x => x.id !== id));
    if (c) setTechAudit(prev => [{ action: 'Change removed', detail: `${c.id}: ${c.title}`, time: nowTime() }, ...prev]);
  };
  const addWarroom = () => {
    if (!warroomText.trim()) return;
    setWarroom(prev => [...prev, { id: 'WR-' + Math.floor(1000 + Math.random() * 9000), text: warroomText.trim(), by: 'Agent-1', time: nowTime() }]);
    setWarroomText('');
  };

  // ================= LOG VIEWER / WEBHOOKS / BACKUPS / DIGEST / REVIEW =================
  const SIM_LOG_POOL: Array<{ level: 'INFO' | 'WARN' | 'ERROR'; service: string; message: string }> = [
    { level: 'INFO', service: 'Payment Gateway', message: 'bKash refund callback processed for ORDER-1044' },
    { level: 'INFO', service: 'Order Service', message: 'Wallet split (COD + wallet) completed for ORDER-1041' },
    { level: 'WARN', service: 'SMS Gateway', message: 'Nagad OTP delivery 1.2s above p95 — retry queued' },
    { level: 'ERROR', service: 'Store Panel', message: 'v2.2.3 signature verification failed on /api/orders/bulk' },
    { level: 'INFO', service: 'Dispatch', message: 'driverDispatchOrder assigned D-3011 to ORDER-1045' },
    { level: 'WARN', service: 'GPS/Map', message: 'Location ping timeout for driver D-3004 (2m ago)' },
    { level: 'ERROR', service: 'Driver App', message: 'v3.1.0 crash on extraStores receipt preview' },
    { level: 'INFO', service: 'Auth', message: 'New device login approved for store S-14' },
    { level: 'WARN', service: 'Rocket', message: 'Balance check call retried 2x before success' },
    { level: 'INFO', service: 'Order Service', message: 'extraStores applied — ORDER-1043 now spans 2 stores' }
  ];
  const simulateLog = () => {
    const s = SIM_LOG_POOL[Math.floor(Math.random() * SIM_LOG_POOL.length)];
    setLogs(prev => [{ id: 'L-' + Math.floor(1000 + Math.random() * 9000), time: nowTime(), level: s.level, service: s.service, message: s.message }, ...prev]);
    setTechAudit(prev => [{ action: 'Log traffic simulated', detail: `${s.level} · ${s.service} · ${s.message}`, time: nowTime() }, ...prev]);
  };
  const retryWebhook = (id: string) => {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, status: 'Success', attempts: w.attempts + 1, time: nowTime() } : w));
    setTechAudit(prev => [{ action: 'Webhook retried', detail: `event ${id} re-delivered successfully (attempts+1)`, time: nowTime() }, ...prev]);
  };
  const simulateWebhook = () => {
    const events: Array<{ event: string; target: string; payload: string }> = [
      { event: 'order.created', target: 'Store S-14 callback', payload: '{"order":"ORDER-1046","stores":2}' },
      { event: 'payment.verified', target: 'bKash merchant webhook', payload: '{"ref":"8M8HXXXX","amount":640}' },
      { event: 'delivery.confirmed', target: 'Customer App push', payload: '{"order":"ORDER-1039"}' },
      { event: 'driver.ping', target: 'Dispatch listener', payload: '{"driver":"D-3011","lat":23.81}' }
    ];
    const e = events[Math.floor(Math.random() * events.length)];
    setWebhooks(prev => [{ id: 'WH-' + Math.floor(1000 + Math.random() * 9000), event: e.event, target: e.target, status: Math.random() > 0.35 ? 'Success' : 'Failed', attempts: 1, time: nowTime(), payload: e.payload }, ...prev]);
    setTechAudit(prev => [{ action: 'Webhook delivery simulated', detail: `${e.event} → ${e.target}`, time: nowTime() }, ...prev]);
  };
  const runBackup = (id: string) => {
    setBackups(prev => prev.map(b => b.id === id ? { ...b, last: nowTime(), status: 'Success' } : b));
    setTechAudit(prev => [{ action: 'Manual backup run', detail: `${id} snapshot taken (${nowTime()})`, time: nowTime() }, ...prev]);
  };
  const toggleReview = (incId: string, idx: number) => {
    setReviews(prev => {
      const list = prev[incId] || REVIEW_CHECKLIST.map(c => ({ label: c, done: false }));
      return { ...prev, [incId]: list.map((c, i) => i === idx ? { ...c, done: !c.done } : c) };
    });
  };

  // ================= SOS / SEVERITY / DR / SMS BALANCE / TECH DEBT =================
  const cycleSos = (id: string) => {
    const s = sosAlerts.find(x => x.id === id);
    setSosAlerts(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Received' ? 'Dispatch' : x.status === 'Dispatch' ? 'Resolved' : 'Received' } : x));
    if (s) setTechAudit(prev => [{ action: 'SOS status updated', detail: `${s.id} (${s.driver}) → ${s.status === 'Received' ? 'Dispatch' : s.status === 'Dispatch' ? 'Resolved' : 'Received'}`, time: nowTime() }, ...prev]);
  };
  const simulateSos = () => {
    const pool = [
      { driver: 'D-3021', order: 'ORDER-1048', location: 'Khilgaon Flyover' },
      { driver: 'D-3008', order: 'ORDER-1046', location: 'Dhanmondi Rd 27' },
      { driver: 'D-3014', order: 'ORDER-1050', location: 'Airport Rd near Kuril' }
    ];
    const p = pool[Math.floor(Math.random() * pool.length)];
    setSosAlerts(prev => [{ id: 'SOS-' + Math.floor(1000 + Math.random() * 9000), driver: p.driver, order: p.order, location: p.location, time: 'just now', status: 'Received' }, ...prev]);
    setTechAudit(prev => [{ action: 'SOS alert received', detail: `${p.driver} at ${p.location} (${p.order})`, time: nowTime() }, ...prev]);
  };
  const computeSeverity = (): { severity: string; score: number; why: string } => {
    const scopeScore = sevCalc.scope === '>60%' ? 3 : sevCalc.scope === '25–60%' ? 2 : sevCalc.scope === '5–25%' ? 1 : 0;
    const workScore = sevCalc.workaround === 'None' ? 3 : sevCalc.workaround === 'Manual workaround' ? 1 : 0;
    const impactBonus = sevCalc.impact === 'Payments' || sevCalc.impact === 'Admin' ? 1 : 0;
    const score = scopeScore + workScore + impactBonus;
    const severity = score >= 6 ? 'Critical' : score >= 4 ? 'High' : score >= 2 ? 'Medium' : 'Low';
    const why = `scope ${sevCalc.scope} (${scopeScore}/3) + workaround: ${sevCalc.workaround} (${workScore}/3) + impact ${sevCalc.impact} (${impactBonus}/1) = ${score}/7 → ${severity}`;
    return { severity, score, why };
  };
  const logSevIncident = () => {
    const r = computeSeverity();
    setKnownIssues(prev => [{ id: 'INC-' + Math.floor(100 + Math.random() * 900), title: `[Auto-triage] ${sevCalc.impact} issue (${sevCalc.scope} users)`, severity: r.severity as 'Low' | 'Medium' | 'High' | 'Critical', platform: 'Admin / Multi', status: 'Investigating', time: nowTime() }, ...prev]);
    setTechAudit(prev => [{ action: 'Incident logged from severity calculator', detail: `${r.severity} — ${sevCalc.impact} · ${sevCalc.scope} · ${sevCalc.workaround} workaround`, time: nowTime() }, ...prev]);
  };
  const simulateFailover = (id: string) => {
    setDrDrills(prev => prev.map(d => d.id === id ? { ...d, lastDrill: 'Today', status: 'Ready' } : d));
    setTechAudit(prev => [{ action: 'Failover drill completed', detail: `${id} — RPO/RTO verified, system back to primary`, time: nowTime() }, ...prev]);
  };
  const simulateUsage = () => {
    setSmsBal(prev => prev.map(s => ({ ...s, used: Math.min(s.quota, s.used + Math.floor(s.quota * (0.02 + Math.random() * 0.04))) })));
    setTechAudit(prev => [{ action: 'SMS/push usage simulated', detail: 'channels consumed ~2–6% of remaining quota', time: nowTime() }, ...prev]);
  };
  const cycleDebt = (id: string) => {
    const d = debt.find(x => x.id === id);
    setDebt(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'On track' ? 'At risk' : x.status === 'At risk' ? 'Overdue' : 'On track' } : x));
    if (d) setTechAudit(prev => [{ action: 'Tech debt status updated', detail: `${d.id}: ${d.item} → ${d.status === 'On track' ? 'At risk' : d.status === 'At risk' ? 'Overdue' : 'On track'}`, time: nowTime() }, ...prev]);
  };
  const addDebt = () => {
    if (!debtForm.item.trim()) return;
    setDebt(prev => [{ id: 'DEP-' + Math.floor(100 + Math.random() * 900), item: debtForm.item.trim(), type: debtForm.type as 'Endpoint' | 'App version' | 'API' | 'Config', eol: debtForm.eol.trim() || 'TBD', owner: debtForm.owner, status: 'On track' }, ...prev]);
    setTechAudit(prev => [{ action: 'Tech debt tracked', detail: `${debtForm.item.trim()} (${debtForm.type}) EOL ${debtForm.eol || 'TBD'}`, time: nowTime() }, ...prev]);
    setDebtForm(f => ({ ...f, item: '', eol: '' }));
  };

  // ================= BROADCAST / FRAUD QUEUE / APPROVALS / CERTS / RELEASE CHECK =================
  const AUDIENCE_TOTALS: Record<string, number> = { 'All customers': 12500, 'Active customers': 8200, 'Drivers': 3500, 'Store owners': 900 };
  const sendBroadcast = () => {
    if (!bcForm.title.trim()) return;
    const total = AUDIENCE_TOTALS[bcForm.audience] || 1000;
    const sent = Math.floor(total * (0.97 + Math.random() * 0.03));
    setBroadcasts(prev => [{ id: 'BC-' + Math.floor(2000 + Math.random() * 9000), audience: bcForm.audience, title: bcForm.title.trim(), body: bcForm.body.trim() || '(no body)', scheduled: bcForm.when === 'Now' ? `Sent ${nowTime()}` : `Scheduled ${bcForm.when}`, total, sent, delivered: Math.floor(sent * 0.95), opened: Math.floor(sent * 0.54), time: nowTime() }, ...prev]);
    setTechAudit(prev => [{ action: 'Broadcast sent', detail: `"${bcForm.title.trim()}" → ${bcForm.audience} (${total.toLocaleString()}) · ${bcForm.when}`, time: nowTime() }, ...prev]);
    setBcForm(f => ({ ...f, title: '', body: '' }));
  };
  const decideFraud = (id: string, approve: boolean) => {
    const f = fraudQueue.find(x => x.id === id);
    setFraudQueue(prev => prev.map(x => x.id === id ? { ...x, status: approve ? 'Approved' : 'Rejected' } : x));
    if (f) setTechAudit(prev => [{ action: approve ? 'Refund approved (fraud review)' : 'Refund rejected (fraud review)', detail: `${f.id}: ${f.customer} · ${f.amount} · ${f.reason}`, time: nowTime() }, ...prev]);
  };
  const decideApproval = (id: string, approve: boolean) => {
    const a = approvals.find(x => x.id === id);
    setApprovals(prev => prev.map(x => x.id === id ? { ...x, status: approve ? 'Approved' : 'Rejected' } : x));
    if (a) setTechAudit(prev => [{ action: approve ? 'Approval granted' : 'Approval rejected', detail: `${a.id}: ${a.type} — ${a.subject}`, time: nowTime() }, ...prev]);
  };
  const logRenewal = (id: string) => {
    const c = certs.find(x => x.id === id);
    setCerts(prev => prev.map(x => x.id === id ? { ...x, days: x.days + 180, expires: `${x.days + 180} days → renewed` } : x));
    if (c) setTechAudit(prev => [{ action: 'Renewal logged', detail: `${c.id}: ${c.item} renewed (+180 days)`, time: nowTime() }, ...prev]);
  };
  const toggleRelCheck = (key: string, idx: number) => {
    setRelChecks(prev => {
      const list = prev[key] || RELEASE_CHECKLIST.map(c => ({ label: c, done: false }));
      return { ...prev, [key]: list.map((c, i) => i === idx ? { ...c, done: !c.done } : c) };
    });
  };

  // ================= ZONES / RATE LIMITS / SESSIONS / SEARCH INDEX / RETENTION =================
  const cycleZone = (id: string) => {
    const z = zones.find(x => x.id === id);
    setZones(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Normal' ? 'Congested' : x.status === 'Congested' ? 'Outage' : 'Normal' } : x));
    if (z) setTechAudit(prev => [{ action: 'Zone status updated', detail: `${z.name} → ${z.status === 'Normal' ? 'Congested' : z.status === 'Congested' ? 'Outage' : 'Normal'}`, time: nowTime() }, ...prev]);
  };
  const adjustLimit = (id: string, delta: number) => {
    setRateLimits(prev => prev.map(r => r.id === id ? { ...r, limit: Math.max(1, r.limit + delta) } : r));
  };
  const toggleRateLimit = (id: string) => {
    const r = rateLimits.find(x => x.id === id);
    setRateLimits(prev => prev.map(x => x.id === id ? { ...x, enforce: !x.enforce } : x));
    if (r) setTechAudit(prev => [{ action: 'Rate limit toggled', detail: `${r.endpoint} → ${r.enforce ? 'bypassed' : 'enforced'} (${r.limit} ${r.window})`, time: nowTime() }, ...prev]);
  };
  const revokeSession = (id: string) => {
    const s = sessions.find(x => x.id === id);
    setSessions(prev => prev.map(x => x.id === id ? { ...x, status: 'Revoked' } : x));
    if (s) setTechAudit(prev => [{ action: 'Session revoked', detail: `${s.user} (${s.role}) from ${s.ip} · ${s.device}`, time: nowTime() }, ...prev]);
  };
  const reindex = (id: string) => {
    const s = searchIdx.find(x => x.id === id);
    setSearchIdx(prev => prev.map(x => x.id === id ? { ...x, pending: 0, lastSync: nowTime(), status: 'Synced' } : x));
    if (s) setTechAudit(prev => [{ action: 'Search reindex triggered', detail: `${s.store} — ${s.docs.toLocaleString()} docs rebuilt (${s.pending} pending cleared)`, time: nowTime() }, ...prev]);
  };
  const runPurge = (id: string) => {
    const r = retention.find(x => x.id === id);
    setRetention(prev => prev.map(x => x.id === id ? { ...x, lastPurge: 'Today', nextPurge: `+${x.keepFor} ${x.unit}` } : x));
    if (r) setTechAudit(prev => [{ action: 'Data purge executed', detail: `${r.dataType} older than ${r.keepFor} ${r.unit} removed`, time: nowTime() }, ...prev]);
  };

  // ================= CRASHES / TRAINING / ALLOWLIST / PIPELINE / PASSWORD POLICY =================
  const triageCrash = (id: string) => {
    const c = crashes.find(x => x.id === id);
    setCrashes(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'New' ? 'Triaged' : x.status === 'Triaged' ? 'Fixed' : 'Triaged' } : x));
    if (c) setTechAudit(prev => [{ action: 'Crash report updated', detail: `${c.id}: ${c.error} (${c.app} ${c.version}) → ${c.status === 'New' ? 'Triaged' : c.status === 'Triaged' ? 'Fixed' : 'Triaged'}`, time: nowTime() }, ...prev]);
  };
  const toggleAllow = (id: string) => {
    const a = allowlist.find(x => x.id === id);
    setAllowlist(prev => prev.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
    if (a) setTechAudit(prev => [{ action: 'IP allowlist toggled', detail: `${a.target}: ${a.ip} → ${a.enabled ? 'blocked' : 'allowed'}`, time: nowTime() }, ...prev]);
  };
  const toggleLock = (key: 'masterEnabled' | 'pinEnabled' | 'passcodeEnabled' | 'faceEnabled' | 'passwordEnabled') => {
    setLockCfg(prev => ({ ...prev, [key]: !prev[key] }));
    setTechAudit(prev => [{ action: 'Lock policy toggled', detail: `${key} → ${!lockCfg[key] ? 'enabled' : 'disabled'}`, time: nowTime() }, ...prev]);
  };
  const stepLock = (key: 'pinLen' | 'passcodeLen' | 'passwordLen' | 'faceConfidence' | 'autoLockMin' | 'maxAttempts', delta: number) => {
    setLockCfg(prev => {
      const step = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v + delta));
      switch (key) {
        case 'pinLen': return { ...prev, pinLen: step(prev.pinLen, 4, 10) };
        case 'passcodeLen': return { ...prev, passcodeLen: step(prev.passcodeLen, 6, 16) };
        case 'passwordLen': return { ...prev, passwordLen: step(prev.passwordLen, 8, 24) };
        case 'faceConfidence': return { ...prev, faceConfidence: step(prev.faceConfidence, 70, 99) };
        case 'autoLockMin': return { ...prev, autoLockMin: step(prev.autoLockMin, 1, 60) };
        case 'maxAttempts': return { ...prev, maxAttempts: step(prev.maxAttempts, 3, 10) };
      }
    });
    setTechAudit(prev => [{ action: 'Lock policy adjusted', detail: `${key} ${delta > 0 ? '+' : ''}${delta}`, time: nowTime() }, ...prev]);
  };
  const cycleAccess = (id: string) => {
    const order = ['None', 'View', 'Edit', 'Full'] as const;
    const m = accessModes.find(x => x.id === id);
    if (!m) return;
    const next = order[(order.indexOf(m.level) + 1) % order.length];
    setAccessModes(prev => prev.map(x => x.id === id ? { ...x, level: next } : x));
    setTechAudit(prev => [{ action: 'Access level changed', detail: `${m.name}: ${m.level} → ${next}`, time: nowTime() }, ...prev]);
  };
  const grantAllAccess = () => {
    setAccessModes(prev => prev.map(x => ({ ...x, level: 'Full' as const })));
    setTechAudit(prev => [{ action: 'Full access granted', detail: 'All 9 modules set to Full by admin', time: nowTime() }, ...prev]);
  };
  const setAllReadOnly = () => {
    setAccessModes(prev => prev.map(x => ({ ...x, level: 'View' as const })));
    setTechAudit(prev => [{ action: 'Read-only mode enabled', detail: 'All 9 modules set to View-only', time: nowTime() }, ...prev]);
  };
  const toggleSuperAdmin = () => {
    setSuperAdmin(s => !s);
    setTechAudit(prev => [{ action: 'Super admin toggled', detail: `full root access → ${!superAdmin ? 'on' : 'off'}`, time: nowTime() }, ...prev]);
  };
  const addAccessApp = () => {
    const name = newAppName.trim();
    if (!name) return;
    if (accessModes.some(m => m.name.toLowerCase() === name.toLowerCase())) return;
    setAccessModes(prev => [...prev, { id: 'app-' + Date.now(), name, level: 'Full' }]);
    setTechAudit(prev => [{ action: 'App added to access control', detail: `${name} registered with Full access`, time: nowTime() }, ...prev]);
    setNewAppName('');
  };
  const removeAccessApp = (id: string) => {
    const m = accessModes.find(x => x.id === id);
    setAccessModes(prev => prev.filter(x => x.id !== id));
    if (m) setTechAudit(prev => [{ action: 'App removed from access control', detail: `${m.name} removed`, time: nowTime() }, ...prev]);
  };
  const launchApp = (name: string) => {
    const steps = [
      { label: 'Authenticating session', status: 'waiting' as const },
      { label: 'Connecting to NexaGo API gateway', status: 'waiting' as const },
      { label: 'Syncing config & permissions', status: 'waiting' as const },
      { label: 'Warming up modules', status: 'waiting' as const },
      { label: 'Loading live order feed', status: 'waiting' as const }
    ];
    setLaunchedApp({ name, stage: 0, steps, issues: [], booted: false });
    setTechAudit(prev => [{ action: 'App launched', detail: `${name} boot started via access console`, time: nowTime() }, ...prev]);
    const timers = [400, 800, 1200, 1600, 2100];
    timers.forEach((delay, i) => {
      setTimeout(() => {
        setLaunchedApp(prev => {
          if (!prev) return prev;
          const stepsCopy = prev.steps.map((s, j) => j === i ? { ...s, status: i === 4 ? 'warn' as const : 'ok' as const } : s);
          const issues = i === 4 && name !== 'Customer App' && name !== 'Driver App'
            ? [`Slow response on ${name.toLowerCase()} endpoints (+320 ms vs SLA)`]
            : [];
          return { ...prev, stage: i + 1, steps: stepsCopy, issues, booted: i === 4 };
        });
      }, delay);
    });
  };
  const closeLaunch = () => {
    setLaunchedApp(prev => {
      if (prev) setTechAudit(prev2 => [{ action: 'App session closed', detail: `${prev.name} exited from access console`, time: nowTime() }, ...prev2]);
      return null;
    });
  };
  const startRealSession = () => {
    const code = 'NX-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const host = window.location.hostname || 'localhost';
    const shareUrl = `http://${host}:3100/share?room=${code}`;
    setRealSession({ code, shareUrl, status: 'waiting' });
    setTechAudit(prev => [{ action: 'Real remote session started', detail: `Room ${code} — resolving public link…`, time: nowTime() }, ...prev]);
    const connect = (base: string) => {
      const wsBase = base.replace(/^http/, 'ws');
      const url = `${base}/share?room=${code}`;
      setRealSession(s => ({ ...s, shareUrl: url }));
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${wsBase}/ws`);
      } catch {
        setRealSession(s => ({ ...s, status: 'error' }));
        return;
      }
      realWsRef.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', room: code, role: 'admin' }));
      };
      ws.onmessage = (ev) => {
        let m: any;
        try { m = JSON.parse(ev.data); } catch { return; }
        if (m.type === 'peer-status') {
          if (m.role === 'share') setRealSession(s => ({ ...s, status: m.online ? 'sharing' : 'waiting' }));
        } else if (m.type === 'device') {
          setPeerDevice(m.info || null);
        } else if (m.type === 'status') {
          setShareStatus(m.message ? { state: m.state, message: m.message } : null);
        } else if (m.type === 'offer' && m.from === 'share') {
          setRealMode(m.mode === 'camera' ? 'camera' : 'screen');
          handleRealOffer(m.sdp);
        } else if (m.type === 'ice' && m.from === 'share') {
          if (realPcRef.current) {
            try { realPcRef.current.addIceCandidate(JSON.parse(m.candidate)); } catch { /* ignore */ }
          }
        }
      };
      ws.onclose = () => {
        setRealSession(s => ({ ...s, status: 'offline' }));
      };
      ws.onerror = () => {
        setRealSession(s => ({ ...s, status: 'error' }));
      };
    };
    const relayHost = host === 'localhost' || host === '127.0.0.1' || host === '::1' ? 'localhost' : host;
    const envBase = (import.meta.env.VITE_RELAY_BASE || '').replace(/\/+$/, '');
    if (envBase) {
      connect(envBase);
      return;
    }
    fetch(`http://${relayHost}:3100/info`)
      .then(r => r.json())
      .then((info: { base?: string }) => {
        const base = info.base || `http://${host}:3100`;
        connect(base);
      })
      .catch(() => {
        const fallbackBase = `http://${host}:3100`;
        connect(fallbackBase);
      });
  };
  const handleRealOffer = async (sdp: any) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
      ]
    });
    realPcRef.current = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate && realWsRef.current) realWsRef.current.send(JSON.stringify({ type: 'ice', candidate: JSON.stringify(e.candidate), room: realSession.code, from: 'admin' }));
    };
    pc.ontrack = (e) => {
      setRealStream(e.streams[0] || null);
      setRealSession(s => ({ ...s, status: 'live' }));
      setTechAudit(p2 => [{ action: 'Real remote stream live', detail: `Receiving live screen from room ${realSession.code}`, time: nowTime() }, ...p2]);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') setRealSession(s => ({ ...s, status: 'offline' }));
    };
    try {
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (realWsRef.current) realWsRef.current.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription, room: realSession.code, from: 'admin' }));
    } catch {
      setRealSession(s => ({ ...s, status: 'error' }));
    }
  };
  const stopRealSession = () => {
    if (realPcRef.current) { try { realPcRef.current.close(); } catch { /* ignore */ } realPcRef.current = null; }
    if (realWsRef.current) { try { realWsRef.current.close(); } catch { /* ignore */ } realWsRef.current = null; }
    if (realStream) { realStream.getTracks().forEach(t => t.stop()); setRealStream(null); }
    setPeerDevice(null);
    setShareStatus(null);
    setRealMode('screen');
    setRealSession({ code: '', shareUrl: '', status: 'idle' });
    setTechAudit(prev => [{ action: 'Real remote session ended', detail: `Closed room ${realSession.code || '—'}`, time: nowTime() }, ...prev]);
  };
  const copyShareLink = () => {
    if (realSession.shareUrl && navigator.clipboard) {
      navigator.clipboard.writeText(realSession.shareUrl).then(() => setTechAudit(prev => [{ action: 'Share link copied', detail: realSession.shareUrl, time: nowTime() }, ...prev])).catch(() => {});
    }
  };
  const addAllow = () => {
    if (!allowForm.ip.trim()) return;
    setAllowlist(prev => [{ id: 'IP-' + Math.floor(10 + Math.random() * 90), target: allowForm.target, ip: allowForm.ip.trim(), note: allowForm.note.trim() || '—', enabled: true }, ...prev]);
    setTechAudit(prev => [{ action: 'IP allowlist entry added', detail: `${allowForm.target}: ${allowForm.ip.trim()} (${allowForm.note || '—'})`, time: nowTime() }, ...prev]);
    setAllowForm(f => ({ ...f, ip: '', note: '' }));
  };
  const cyclePipeline = (id: string) => {
    const p = pipeline.find(x => x.id === id);
    setPipeline(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Staged' ? 'Live' : x.status === 'Live' ? 'Rolled back' : 'Staged', prod: x.status === 'Staged' ? x.staging : x.status === 'Live' ? x.prod : x.prod, prodAt: x.status === 'Staged' ? nowTime() : x.prodAt } : x));
    if (p) setTechAudit(prev => [{ action: 'Deploy pipeline updated', detail: `${p.app}: ${p.status === 'Staged' ? 'promoted to production' : p.status === 'Live' ? 'rolled back' : 're-staged to production'}`, time: nowTime() }, ...prev]);
  };
  const setPolicy = (key: 'minLen' | 'expireDays' | 'lockout', delta: number) => {
    setPwPolicy(prev => ({ ...prev, [key]: Math.max(4, prev[key] + delta) }));
    setTechAudit(prev => [{ action: 'Password policy updated', detail: `${key} ${key === 'minLen' ? 'min length' : key === 'expireDays' ? 'expiry days' : 'lockout attempts'} → ${Math.max(4, pwPolicy[key] + delta)}`, time: nowTime() }, ...prev]);
  };

  // ================= GEOFENCE / SMS TEMPLATES / DRIVER DOCS / HANDOVER / STORE HEALTH =================
  const reviewGeofence = (id: string) => {
    const g = geofence.find(x => x.id === id);
    setGeofence(prev => prev.map(x => x.id === id ? { ...x, status: 'Reviewed' } : x));
    if (g) setTechAudit(prev => [{ action: 'Geofence alert reviewed', detail: `${g.driver} · ${g.zone} · ${g.event}`, time: nowTime() }, ...prev]);
  };
  const editSmsTpl = (id: string, body: string) => {
    setSmsTpls(prev => prev.map(t => t.id === id ? { ...t, body, updated: nowTime() } : t));
  };
  const verifyDoc = (id: string) => {
    const d = driverDocs.find(x => x.id === id);
    setDriverDocs(prev => prev.map(x => x.id === id ? { ...x, days: x.days + 365, expires: `${x.days + 365} days → renewed`, status: 'Valid' } : x));
    if (d) setTechAudit(prev => [{ action: 'Driver document verified', detail: `${d.driver} · ${d.doc} (${d.no}) renewed +365 days`, time: nowTime() }, ...prev]);
  };
  const addHandover = () => {
    if (!handoverForm.note.trim()) return;
    setHandover(prev => [{ id: 'HO-' + Math.floor(10 + Math.random() * 90), shift: handoverForm.shift, agent: 'Agent-1', note: handoverForm.note.trim(), time: nowTime() }, ...prev]);
    setTechAudit(prev => [{ action: 'Shift handover note added', detail: `${handoverForm.shift} shift: ${handoverForm.note.trim().slice(0, 60)}`, time: nowTime() }, ...prev]);
    setHandoverForm(f => ({ ...f, note: '' }));
  };
  const pingStore = (id: string) => {
    const s = storeHealth.find(x => x.id === id);
    setStoreHealth(prev => prev.map(x => x.id === id ? { ...x, heartbeat: 'Just now', status: x.status === 'Offline' ? 'Online' : x.status } : x));
    if (s) setTechAudit(prev => [{ action: 'Store panel pinged', detail: `${s.store} → ${s.status === 'Offline' ? 'reconnected' : 'acknowledged'} (${s.version})`, time: nowTime() }, ...prev]);
  };

  // ================= INCIDENT TEMPLATES / FEATURE BOARD / BATCH JOBS / ENV CONFIG =================
  const useTemplate = (t: typeof INCIDENT_TEMPLATES[number]) => {
    setKnownIssues(prev => [{ id: 'INC-' + Math.floor(100 + Math.random() * 900), title: `[Template] ${t.name}`, severity: t.severity, platform: t.platform, status: 'Investigating', time: nowTime() }, ...prev]);
    setWarroom(prev => [...prev, { id: 'WR-' + Math.floor(1000 + Math.random() * 9000), text: `Opened from template "${t.name}" — ${t.desc}`, by: 'Agent-1', time: nowTime() }]);
    setTechAudit(prev => [{ action: 'Incident opened from template', detail: `${t.name} (${t.severity}) · ${t.desc}`, time: nowTime() }, ...prev]);
  };
  const voteFeature = (id: string) => {
    setFeatureBoard(prev => prev.map(f => f.id === id ? { ...f, votes: f.votes + 1 } : f));
  };
  const cycleFeature = (id: string) => {
    const f = featureBoard.find(x => x.id === id);
    setFeatureBoard(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'New' ? 'In review' : x.status === 'In review' ? 'Roadmap' : x.status === 'Roadmap' ? 'Shipped' : 'New' } : x));
    if (f) setTechAudit(prev => [{ action: 'Feature request status updated', detail: `${f.id}: ${f.title} → ${f.status === 'New' ? 'In review' : f.status === 'In review' ? 'Roadmap' : f.status === 'Roadmap' ? 'Shipped' : 'New'}`, time: nowTime() }, ...prev]);
  };
  const runBatch = (id: string) => {
    const b = batchJobs.find(x => x.id === id);
    setBatchJobs(prev => prev.map(x => x.id === id ? { ...x, lastRun: nowTime(), duration: Math.floor(3 + Math.random() * 9) + 'm ' + Math.floor(Math.random() * 60) + 's', status: x.status === 'Failed' ? 'Warn' : 'Passed' } : x));
    if (b) setTechAudit(prev => [{ action: 'Batch job re-run', detail: `${b.job} (${b.schedule}) — started manually`, time: nowTime() }, ...prev]);
  };
  const editEnv = (id: string, value: string) => {
    setEnvConfig(prev => prev.map(e => e.id === id ? { ...e, value } : e));
    const e = envConfig.find(x => x.id === id);
    if (e) setTechAudit(prev => [{ action: 'Env config changed', detail: `${e.key} (${e.env}) → ${value}`, time: nowTime() }, ...prev]);
  };

  // ================= STATUS PAGE / FORCE UPDATE / CANNED / ZONE SLA / OFFLINE Q =================
  const toggleForce = (id: string) => {
    const f = forceUpdate.find(x => x.id === id);
    setForceUpdate(prev => prev.map(x => x.id === id ? { ...x, force: !x.force } : x));
    if (f) setTechAudit(prev => [{ action: 'Force update toggled', detail: `${f.app}: ${f.force ? 'blocks' : 'allows'} versions below ${f.minSupported}`, time: nowTime() }, ...prev]);
  };
  const useCanned = (c: typeof canned[number]) => {
    setReplyText(prev => prev + (prev ? '\n\n' : '') + c.body);
    setTechAudit(prev => [{ action: 'Canned reply inserted', detail: `${c.label} (${c.cat}) — ${c.body.length} chars`, time: nowTime() }, ...prev]);
  };
  const addCanned = () => {
    if (!cannedForm.label.trim() || !cannedForm.body.trim()) return;
    setCanned(prev => [{ id: 'CN-' + Math.floor(10 + Math.random() * 90), cat: cannedForm.cat, label: cannedForm.label.trim(), body: cannedForm.body.trim() }, ...prev]);
    setCannedForm(f => ({ ...f, label: '', body: '' }));
  };
  const adjustZoneSla = (id: string, delta: number) => {
    setZoneSla(prev => prev.map(z => z.id === id ? { ...z, promiseMin: Math.max(20, Math.min(120, z.promiseMin + delta)) } : z));
    const z = zoneSla.find(x => x.id === id);
    if (z) setTechAudit(prev => [{ action: 'Zone delivery SLA updated', detail: `${z.zone} promise → ${Math.max(20, Math.min(120, z.promiseMin + delta))} min`, time: nowTime() }, ...prev]);
  };
  const syncOffline = (id: string) => {
    const q = offlineQ.find(x => x.id === id);
    setOfflineQ(prev => prev.map(x => x.id === id ? { ...x, pending: 0, note: 'synced at ' + nowTime(), status: 'Syncing' } : x));
    if (q) setTechAudit(prev => [{ action: 'Offline queue synced', detail: `${q.source}: ${q.pending} item(s) uploaded`, time: nowTime() }, ...prev]);
  };

  // ================= IMPACT / PROMOS / PAYOUTS =================
  const computeImpact = (): { orders: number; customers: number; revenue: string; why: string } => {
    const base: Record<string, number> = { Payments: 2400, 'Order & Checkout': 3200, 'Delivery & GPS': 1800, Notifications: 1500, 'App launch': 2800 };
    const hrs = impCalc.duration === '15 min' ? 0.25 : impCalc.duration === '30 min' ? 0.5 : impCalc.duration === '60 min' ? 1 : 2;
    const mult = impCalc.period === 'Peak' ? 1.5 : 0.5;
    const orders = Math.round((base[impCalc.type] || 2000) * hrs * mult);
    const customers = Math.round(orders * 0.8);
    const revenue = '৳ ' + (orders * 620).toLocaleString('en-IN');
    return { orders, customers, revenue, why: `${impCalc.type} · ${impCalc.duration} · ${impCalc.period} period` };
  };
  const togglePromo = (id: string) => {
    const p = promos.find(x => x.id === id);
    setPromos(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Active' ? 'Paused' : x.status === 'Paused' ? 'Active' : x.status } : x));
    if (p) setTechAudit(prev => [{ action: 'Promo toggled', detail: `${p.code} (${p.type}) → ${p.status === 'Active' ? 'paused' : 'resumed'}`, time: nowTime() }, ...prev]);
  };
  const cyclePayout = (id: string) => {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Pending' ? 'Processing' : x.status === 'Processing' ? 'Paid' : x.status === 'Failed' ? 'Processing' : x.status } : x));
    if (p) setTechAudit(prev => [{ action: 'Payout run updated', detail: `${p.id} (${p.period}) → ${p.status === 'Pending' ? 'Processing' : p.status === 'Processing' ? 'Paid' : p.status === 'Failed' ? 'Processing' : p.status}`, time: nowTime() }, ...prev]);
  };
  const purgeLayer = (id: string) => {
    const c = cdn.find(x => x.id === id);
    setCdn(prev => prev.map(x => x.id === id ? { ...x, hit: 100, note: 'purged at ' + nowTime() + ' · warm-up in progress' } : x));
    if (c) setTechAudit(prev => [{ action: 'Cache layer purged', detail: `${c.layer}: hit ratio reset to 100%`, time: nowTime() }, ...prev]);
  };
  const toggleRunbook = (id: string) => {
    const r = runbook.find(x => x.id === id);
    setRunbook(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Ready' ? 'Drilling' : x.status === 'Drilling' ? 'Resolved' : 'Ready' } : x));
    if (r) setTechAudit(prev => [{ action: 'Runbook drill', detail: `${r.vendor} (${r.scope}) → ${r.status === 'Ready' ? 'drill started' : r.status === 'Drilling' ? 'resolved' : 'reset to ready'}`, time: nowTime() }, ...prev]);
  };
  const escalateRefund = (id: string) => {
    const r = refundVel.find(x => x.id === id);
    setRefundVel(prev => prev.map(x => x.id === id ? { ...x, status: 'Escalated' } : x));
    if (r) setTechAudit(prev => [{ action: 'Refund escalated', detail: `${r.order} · ${r.amount} · aged ${r.hours}h via ${r.method}`, time: nowTime() }, ...prev]);
  };
  const recheckMenus = () => setTechAudit(prev => [{ action: 'Menu audit run', detail: 'Store menu completeness rechecked (items · photos · stock freshness)', time: nowTime() }, ...prev]);
  const simulateSpike = (label: string) => {
    setLatencySpike({ label, time: nowTime() });
    setTechAudit(prev => [{ action: 'Traffic spike simulated', detail: `${label}: p95 latency spiked, monitor for 5 minutes`, time: nowTime() }, ...prev]);
  };

  // ================= TIER / CHANNEL MODEL =================
  const escalateTicket = (id: string) => {
    const t = tierQueue.find(x => x.id === id);
    setTierQueue(prev => prev.map(x => x.id === id ? { ...x, tier: x.tier === 'L0' ? 'L1' : x.tier === 'L1' ? 'L2' : x.tier === 'L2' ? 'L3' : 'L3' } : x));
    if (t) setTechAudit(prev => [{ action: 'Ticket escalated', detail: `${t.id}: ${t.issue} moved up a tier`, time: nowTime() }, ...prev]);
  };
  const resolveTicket = (id: string) => {
    const t = tierQueue.find(x => x.id === id);
    setTierQueue(prev => prev.filter(x => x.id !== id));
    if (t) setTechAudit(prev => [{ action: 'Ticket resolved', detail: `${t.id}: ${t.issue} (${t.customer}) closed`, time: nowTime() }, ...prev]);
  };
  const addTierTicket = () => {
    if (!tierForm.issue.trim() || !tierForm.customer.trim()) return;
    setTierQueue(prev => [{ id: 'TQ-' + Math.floor(100 + Math.random() * 900), issue: tierForm.issue.trim(), customer: tierForm.customer.trim(), tier: tierForm.tier }, ...prev]);
    setTechAudit(prev => [{ action: 'Ticket created', detail: `${tierForm.issue.trim()} (${tierForm.customer.trim()}) opened at ${tierForm.tier}`, time: nowTime() }, ...prev]);
    setTierForm(f => ({ ...f, issue: '', customer: '' }));
  };
  const toggleChannel = (id: string) => {
    const ch = channels.find(x => x.id === id);
    setChannels(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'Online' ? 'Offline' : 'Online' } : x));
    if (ch) setTechAudit(prev => [{ action: 'Channel toggled', detail: `${ch.name} → ${ch.status === 'Online' ? 'offline' : 'online'}`, time: nowTime() }, ...prev]);
  };
  const exportTechReport = () => {
    const data = {
      exportedAt: nowTime(),
      health,
      integrations,
      incidents: knownIssues,
      backlog,
      changes,
      maintenance,
      featureFlags: flags,
      securityScore,
      securityEvents,
      apiLog,
      techAudit,
      agentWorkload,
      reconciliationIssues: reconcileIssues
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexago-tech-support-report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTechAudit(prev => [{ action: 'Tech report exported', detail: `snapshot with ${techAudit.length} audit entries`, time: nowTime() }, ...prev]);
  };
  const ticketSla = (t: SupportTicket): { target: number; label: string } => {
    const days = t.priority === 'High' ? 1 : t.priority === 'Medium' ? 3 : 5;
    return { target: days, label: days === 1 ? '1 day' : `${days} days` };
  };

  const [activeTechSection, setActiveTechSection] = useState('sec-app-issue-overview-where-the-problems-are');
  const CAT_GROUPS: Array<{ key: string; name: string; items: Array<{ key: string; label: string }> }> = [
    { key: 'monitoring', name: 'Monitoring & Health', items: [
      { key: 'sec-system-health', label: 'System health' },
      { key: 'sec-sla-targets', label: 'SLA targets' },
      { key: 'sec-api-request-monitor', label: 'API request monitor' },
      { key: 'sec-rate-limit-config', label: 'Rate limit config' },
      { key: 'sec-api-latency-monitor', label: 'API latency monitor' },
      { key: 'sec-webhook-delivery-monitor', label: 'Webhook delivery' },
      { key: 'sec-database-backup-center', label: 'Database backups' },
      { key: 'sec-cdn-cache-hit-monitor', label: 'CDN / cache' },
      { key: 'sec-search-index-catalog-sync', label: 'Search index' },
      { key: 'sec-store-panel-connection-health', label: 'Store panel health' },
      { key: 'sec-offline-sync-queue', label: 'Offline sync' },
      { key: 'sec-dr-readiness', label: 'DR readiness' },
      { key: 'sec-alert-rules', label: 'Alert rules' },
      { key: 'sec-scheduled-tech-digest', label: 'Tech digest' },
      { key: 'sec-public-status-page', label: 'Public status page' },
      { key: 'sec-support-log-viewer', label: 'Log viewer' },
      { key: 'sec-crash-report-inbox', label: 'Crash inbox' },
    ] },
    { key: 'incidents', name: 'Incidents & Analytics', items: [
      { key: 'sec-app-issue-overview-where-the-problems-are', label: 'App issue overview' },
      { key: 'sec-technical-kpis', label: 'Technical KPIs' },
      { key: 'sec-diagnostics-runner', label: 'Diagnostics runner' },
      { key: 'sec-data-reconciliation', label: 'Data reconciliation' },
      { key: 'sec-severity-priority-calculator', label: 'Severity calculator' },
      { key: 'sec-incident-impact-calculator', label: 'Impact calculator' },
      { key: 'sec-incident-action-analytics', label: 'Incident analytics' },
      { key: 'sec-dependency-cascade-map', label: 'Dependency map' },
      { key: 'sec-known-issues-incidents-board', label: 'Known issues' },
      { key: 'sec-incident-template-library', label: 'Incident templates' },
      { key: 'sec-incident-review-postmortem-checklist', label: 'Incident review' },
      { key: 'sec-war-room', label: 'War room' },
    ] },
    { key: 'payments', name: 'Payments, Refunds & Payouts', items: [
      { key: 'sec-refund-fraud-review-queue', label: 'Fraud review' },
      { key: 'sec-refund-velocity', label: 'Refund velocity' },
      { key: 'sec-admin-approval-queue', label: 'Admin approvals' },
      { key: 'sec-driver-payout-monitor', label: 'Driver payouts' },
      { key: 'sec-promo-code-health', label: 'Promo health' },
      { key: 'sec-sms-push-balance', label: 'SMS balance' },
      { key: 'sec-certificates-contracts', label: 'Certificates' },
    ] },
    { key: 'vendors', name: 'Vendors & Messaging', items: [
      { key: 'sec-integration-vendor-registry', label: 'Vendor registry' },
      { key: 'sec-vendor-outage-runbook', label: 'Vendor runbook' },
      { key: 'sec-sms-notification-template-library', label: 'SMS templates' },
      { key: 'sec-push-notification-broadcast-center', label: 'Broadcast center' },
    ] },
    { key: 'security', name: 'Security & Access', items: [
      { key: 'sec-security-compliance-center', label: 'Security center' },
      { key: 'sec-session-access-monitor', label: 'Sessions' },
      { key: 'sec-ip-allowlist', label: 'IP allowlist' },
      { key: 'sec-password-auth-policy', label: 'Auth policy' },
      { key: 'sec-data-retention-policy', label: 'Retention' },
    ] },
    { key: 'delivery', name: 'Delivery & Zones', items: [
      { key: 'sec-multi-zone-dispatch-map', label: 'Zone map' },
      { key: 'sec-delivery-sla-by-zone', label: 'Zone SLA' },
      { key: 'sec-geofence-monitor', label: 'Geofence' },
      { key: 'sec-driver-emergency-sos-center', label: 'Driver SOS' },
      { key: 'sec-driver-documents-expiry', label: 'Driver docs' },
      { key: 'sec-store-menu-health', label: 'Menu health' },
    ] },
    { key: 'releases', name: 'Change & Releases', items: [
      { key: 'sec-feature-flags-rollout', label: 'Feature flags' },
      { key: 'sec-change-management', label: 'Change mgmt' },
      { key: 'sec-maintenance-windows', label: 'Maintenance' },
      { key: 'sec-bug-report-form', label: 'Bug report' },
      { key: 'sec-device-matrix', label: 'Device matrix' },
      { key: 'sec-force-update-center', label: 'Force update' },
      { key: 'sec-version-adoption', label: 'Version adoption' },
      { key: 'sec-release-changelog', label: 'Changelog' },
      { key: 'sec-release-readiness-checklist', label: 'Release checklist' },
      { key: 'sec-deploy-pipeline-environment-status', label: 'Deploy pipeline' },
      { key: 'sec-environment-config-center', label: 'Env config' },
    ] },
    { key: 'people', name: 'People & Operations', items: [
      { key: 'sec-on-call-roster', label: 'On-call roster' },
      { key: 'sec-shift-handover-notes', label: 'Shift handover' },
      { key: 'sec-nightly-batch-jobs', label: 'Batch jobs' },
      { key: 'sec-tech-debt-deprecation-tracker', label: 'Tech debt' },
      { key: 'sec-tech-backlog', label: 'Tech backlog' },
      { key: 'sec-feature-request-board', label: 'Feature board' },
      { key: 'sec-csat-funnel', label: 'CSAT funnel' },
      { key: 'sec-canned-responses', label: 'Canned replies' },
    ] },
    { key: 'tools', name: 'Support Tools & Knowledge', items: [
      { key: 'sec-technical-auto-diagnosis', label: 'Auto-diagnosis' },
      { key: 'sec-diagnosis-wizard', label: 'Diagnosis wizard' },
      { key: 'sec-knowledge-base', label: 'Knowledge base' },
      { key: 'sec-common-fix-library', label: 'Fix library' },
      { key: 'sec-escalation-matrix', label: 'Escalation matrix' },
      { key: 'sec-tier-based-support-model', label: 'Tier model' },
      { key: 'sec-support-channels-types', label: 'Channels' },
      { key: 'sec-sop-runbook-library', label: 'SOP runbooks' },
      { key: 'sec-tech-audit-trail', label: 'Audit trail' },
    ] },
  ];
  const [openCat, setOpenCat] = useState<string | null>(null);
  useEffect(() => { if (activeTechSection !== 'all') { const el = document.getElementById('tech-jump-nav'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, [activeTechSection]);
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">{t('Support & Help Desk', 'সাপোর্ট ও হেল্প ডেস্ক')}</h2>
          <p className="text-xs text-gray-400">{t('Resolve customer concerns, order disputes, and driver assistance requests', 'গ্রাহকের অভিযোগ, অর্ডার ডিসপিউট ও ড্রাইভার সহায়তার সমাধান করুন')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setLang(prev => prev === 'en' ? 'bn' : 'en')} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:border-brand-orange/50">
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>
        </div>
      </div>

      {/* Top Bar — Help Desk Categories */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-2 flex flex-wrap items-center gap-1.5">
        <span className="px-2.5 text-[10px] font-black uppercase tracking-wider text-gray-400">Support Tickets</span>
        <span className="w-px h-4 bg-brand-border mx-0.5" />
        {([
          ['all', 'All', Layers],
          ['customers', 'Customer Concerns', MessageSquare],
          ['disputes', 'Order Disputes', Scale],
          ['drivers', 'Driver Assistance', Truck],
          ['technical', 'Technical Support', Wrench],
          ['users', 'User Management', Users],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${category === key ? 'bg-brand-orange border-brand-orange text-white' : 'bg-brand-dark border-brand-border text-gray-400 hover:border-brand-orange/40'}`}
          >
            <Icon className="w-3 h-3 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Order Number Search — nothing is listed until an order number from the report list is searched */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-3">
        <div className="flex items-center space-x-2">
          <Search className="w-3.5 h-3.5 text-brand-orange shrink-0" />
          <input
            type="text"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Search order # (e.g. ORD-001248) from report list to analyze…"
            className="flex-1 bg-brand-dark px-3 py-1.5 border border-brand-border rounded-lg text-xs text-white outline-none focus:border-brand-orange placeholder:text-gray-600"
          />
          {orderSearch && (
            <button onClick={() => { setOrderSearch(''); setActiveOrderId(null); setActiveTicketId(null); }} className="px-2.5 py-1.5 bg-brand-dark border border-brand-border text-gray-400 rounded-lg text-xs cursor-pointer hover:text-white shrink-0">
              ✕
            </button>
          )}
        </div>

        {activeOrder ? (
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-emerald-400 font-bold flex items-center space-x-1.5">
              <Package className="w-3.5 h-3.5" />
              <span>Analyzing {activeOrder.id}</span>
            </p>
            <div className="flex items-center space-x-2">
              {linkedTicket && (
                <button onClick={() => { setActiveTicketId(linkedTicket.id); setActiveOrderId(null); }} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-yellow-400 rounded-lg text-[10px] font-bold cursor-pointer hover:border-yellow-400/50" title="Open the linked support ticket">
                  Ticket {linkedTicket.id}
                </button>
              )}
              <button onClick={exportCSV} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-emerald-400 rounded-lg text-[10px] font-bold cursor-pointer hover:border-emerald-500/40">
                Export CSV
              </button>
              <button onClick={() => window.print()} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-brand-orange rounded-lg text-[10px] font-bold cursor-pointer hover:border-brand-orange/50" title="Print the analysis and save as PDF">
                Print / PDF
              </button>
              <button onClick={() => { setActiveOrderId(null); setActiveTicketId(null); }} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-gray-400 rounded-lg text-[10px] font-bold cursor-pointer hover:text-white">
                Back to report list
              </button>
            </div>
          </div>
        ) : normalizedSearch ? (
          <div className="mt-3 space-y-2">
            {matchedReportedOrders.length === 0 && relatedTickets.length === 0 && (
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">
                  {matchedOrderExistsNotReported
                    ? 'This order exists but has not been reported yet. Only reported orders are listed for analysis.'
                    : `No report found for “${orderSearch}”. Report the order from the Customer / Driver simulator first.`}
                </p>
              </div>
            )}

            {matchedReportedOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Reported orders ({matchedReportedOrders.length})</p>
                {matchedReportedOrders.map(o => {
                  const rep = reports.filter(r => r.orderId === o.id);
                  return (
                    <button key={o.id} onClick={() => setActiveOrderId(o.id)} className="w-full text-left bg-brand-dark/40 border border-brand-border hover:border-brand-orange/50 rounded-lg p-3 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-white">#{o.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${o.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : o.status === 'Cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{o.status}</span>
                      </div>
                      <p className="text-[11px] text-gray-300">{o.storeName} → {o.customerName} · Tk {o.amount.toFixed(2)}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {rep.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-md text-[9px] font-bold">{r.reason} · {r.time}</span>
                        ))}
                      </div>
                      <p className="mt-1 text-[10px] text-brand-orange font-bold">Click to analyze →</p>
                    </button>
                  );
                })}
              </div>
            )}

            {relatedTickets.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Related support tickets</p>
                {relatedTickets.map(ticket => (
                  <button key={ticket.id} onClick={() => openTicket(ticket)} className="w-full bg-brand-dark/40 border border-brand-border hover:border-brand-orange/40 rounded-lg p-3 text-left cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-gray-300">{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${ticket.status === 'Open' ? 'bg-red-500/10 text-red-400' : ticket.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{ticket.status}</span>
                    </div>
                    <p className="text-xs font-bold text-white">{ticket.subject}</p>
                    <p className="text-[10px] text-gray-400">By {ticket.user} · {ticket.date}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 bg-brand-dark/40 border border-brand-border rounded-lg p-6 text-center">
            <FileSearch className="w-8 h-8 text-gray-600 mx-auto mb-2 stroke-1" />
            <p className="text-xs font-bold text-gray-300">Search an order number from the report list</p>
            <p className="text-[10px] text-gray-500 mt-1">No orders are listed until a reported order number is searched. After searching you can analyze fault, resolve it, track credit/debt, view the chat + photos, and see how long each party took.</p>
          </div>
        )}
      </div>

      {/* ===== Technical Support System ===== */}
      {category === 'technical' && (
        <div className="space-y-4">
          {/* Quick Jump — main groups, sections hidden until opened */}
          <div id="tech-jump-nav" className="bg-brand-card border border-brand-border rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Technical Sections — click a group to open its tools</h3>
              <button onClick={() => setActiveTechSection('all')} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors ${activeTechSection === 'all' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>Show All</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'monitoring' ? null : 'monitoring')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'monitoring' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Monitoring & Health</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">17</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'monitoring' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'monitoring' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-system-health" onClick={() => setActiveTechSection('sec-system-health')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-system-health' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Activity className="w-3 h-3 text-emerald-400 shrink-0" /> System health</button>
              <button key="sec-sla-targets" onClick={() => setActiveTechSection('sec-sla-targets')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-sla-targets' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Timer className="w-3 h-3 text-emerald-400 shrink-0" /> SLA targets</button>
              <button key="sec-api-request-monitor" onClick={() => setActiveTechSection('sec-api-request-monitor')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-api-request-monitor' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Terminal className="w-3 h-3 text-emerald-400 shrink-0" /> API request monitor</button>
              <button key="sec-rate-limit-config" onClick={() => setActiveTechSection('sec-rate-limit-config')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-rate-limit-config' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Gauge className="w-3 h-3 text-emerald-400 shrink-0" /> Rate limit config</button>
              <button key="sec-api-latency-monitor" onClick={() => setActiveTechSection('sec-api-latency-monitor')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-api-latency-monitor' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" /> API latency monitor</button>
              <button key="sec-webhook-delivery-monitor" onClick={() => setActiveTechSection('sec-webhook-delivery-monitor')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-webhook-delivery-monitor' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Webhook className="w-3 h-3 text-emerald-400 shrink-0" /> Webhook delivery</button>
              <button key="sec-database-backup-center" onClick={() => setActiveTechSection('sec-database-backup-center')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-database-backup-center' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Database className="w-3 h-3 text-emerald-400 shrink-0" /> Database backups</button>
              <button key="sec-cdn-cache-hit-monitor" onClick={() => setActiveTechSection('sec-cdn-cache-hit-monitor')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-cdn-cache-hit-monitor' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Cpu className="w-3 h-3 text-emerald-400 shrink-0" /> CDN / cache</button>
              <button key="sec-search-index-catalog-sync" onClick={() => setActiveTechSection('sec-search-index-catalog-sync')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-search-index-catalog-sync' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Search className="w-3 h-3 text-emerald-400 shrink-0" /> Search index</button>
              <button key="sec-store-panel-connection-health" onClick={() => setActiveTechSection('sec-store-panel-connection-health')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-store-panel-connection-health' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Store className="w-3 h-3 text-emerald-400 shrink-0" /> Store panel health</button>
              <button key="sec-offline-sync-queue" onClick={() => setActiveTechSection('sec-offline-sync-queue')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-offline-sync-queue' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><RefreshCw className="w-3 h-3 text-emerald-400 shrink-0" /> Offline sync</button>
              <button key="sec-dr-readiness" onClick={() => setActiveTechSection('sec-dr-readiness')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-dr-readiness' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" /> DR readiness</button>
              <button key="sec-alert-rules" onClick={() => setActiveTechSection('sec-alert-rules')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-alert-rules' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Bell className="w-3 h-3 text-emerald-400 shrink-0" /> Alert rules</button>
              <button key="sec-scheduled-tech-digest" onClick={() => setActiveTechSection('sec-scheduled-tech-digest')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-scheduled-tech-digest' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><CalendarClock className="w-3 h-3 text-emerald-400 shrink-0" /> Tech digest</button>
              <button key="sec-public-status-page" onClick={() => setActiveTechSection('sec-public-status-page')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-public-status-page' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Globe className="w-3 h-3 text-emerald-400 shrink-0" /> Public status page</button>
              <button key="sec-support-log-viewer" onClick={() => setActiveTechSection('sec-support-log-viewer')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-support-log-viewer' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><FileText className="w-3 h-3 text-emerald-400 shrink-0" /> Log viewer</button>
              <button key="sec-crash-report-inbox" onClick={() => setActiveTechSection('sec-crash-report-inbox')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-crash-report-inbox' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Bug className="w-3 h-3 text-emerald-400 shrink-0" /> Crash inbox</button>
                  </div>
                )}
              </div>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'incidents' ? null : 'incidents')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'incidents' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><Bug className="w-3.5 h-3.5 text-red-400 shrink-0" />Incidents & Analytics</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">12</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'incidents' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'incidents' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-app-issue-overview-where-the-problems-are" onClick={() => setActiveTechSection('sec-app-issue-overview-where-the-problems-are')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-app-issue-overview-where-the-problems-are' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Zap className="w-3 h-3 text-red-400 shrink-0" /> App issue overview</button>
              <button key="sec-technical-kpis" onClick={() => setActiveTechSection('sec-technical-kpis')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-technical-kpis' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Timer className="w-3 h-3 text-red-400 shrink-0" /> Technical KPIs</button>
              <button key="sec-diagnostics-runner" onClick={() => setActiveTechSection('sec-diagnostics-runner')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-diagnostics-runner' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Wand2 className="w-3 h-3 text-red-400 shrink-0" /> Diagnostics runner</button>
              <button key="sec-data-reconciliation" onClick={() => setActiveTechSection('sec-data-reconciliation')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-data-reconciliation' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Scale className="w-3 h-3 text-red-400 shrink-0" /> Data reconciliation</button>
              <button key="sec-severity-priority-calculator" onClick={() => setActiveTechSection('sec-severity-priority-calculator')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-severity-priority-calculator' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Calculator className="w-3 h-3 text-red-400 shrink-0" /> Severity calculator</button>
              <button key="sec-incident-impact-calculator" onClick={() => setActiveTechSection('sec-incident-impact-calculator')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-incident-impact-calculator' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><TrendingUp className="w-3 h-3 text-red-400 shrink-0" /> Impact calculator</button>
              <button key="sec-incident-action-analytics" onClick={() => setActiveTechSection('sec-incident-action-analytics')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-incident-action-analytics' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><BarChart3 className="w-3 h-3 text-red-400 shrink-0" /> Incident analytics</button>
              <button key="sec-dependency-cascade-map" onClick={() => setActiveTechSection('sec-dependency-cascade-map')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-dependency-cascade-map' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><GitBranch className="w-3 h-3 text-red-400 shrink-0" /> Dependency map</button>
              <button key="sec-known-issues-incidents-board" onClick={() => setActiveTechSection('sec-known-issues-incidents-board')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-known-issues-incidents-board' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><AlertTriangle className="w-3 h-3 text-red-400 shrink-0" /> Known issues</button>
              <button key="sec-incident-template-library" onClick={() => setActiveTechSection('sec-incident-template-library')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-incident-template-library' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><LayoutTemplate className="w-3 h-3 text-red-400 shrink-0" /> Incident templates</button>
              <button key="sec-incident-review-postmortem-checklist" onClick={() => setActiveTechSection('sec-incident-review-postmortem-checklist')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-incident-review-postmortem-checklist' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><ClipboardCheck className="w-3 h-3 text-red-400 shrink-0" /> Incident review</button>
              <button key="sec-war-room" onClick={() => setActiveTechSection('sec-war-room')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-war-room' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Siren className="w-3 h-3 text-red-400 shrink-0" /> War room</button>
                  </div>
                )}
              </div>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'payments' ? null : 'payments')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'payments' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Payments, Refunds & Payouts</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">7</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'payments' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'payments' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-refund-fraud-review-queue" onClick={() => setActiveTechSection('sec-refund-fraud-review-queue')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-refund-fraud-review-queue' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><FileWarning className="w-3 h-3 text-emerald-400 shrink-0" /> Fraud review</button>
              <button key="sec-refund-velocity" onClick={() => setActiveTechSection('sec-refund-velocity')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-refund-velocity' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Hourglass className="w-3 h-3 text-emerald-400 shrink-0" /> Refund velocity</button>
              <button key="sec-admin-approval-queue" onClick={() => setActiveTechSection('sec-admin-approval-queue')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-admin-approval-queue' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><ClipboardList className="w-3 h-3 text-emerald-400 shrink-0" /> Admin approvals</button>
              <button key="sec-driver-payout-monitor" onClick={() => setActiveTechSection('sec-driver-payout-monitor')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-driver-payout-monitor' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Banknote className="w-3 h-3 text-emerald-400 shrink-0" /> Driver payouts</button>
              <button key="sec-promo-code-health" onClick={() => setActiveTechSection('sec-promo-code-health')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-promo-code-health' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Tag className="w-3 h-3 text-emerald-400 shrink-0" /> Promo health</button>
              <button key="sec-sms-push-balance" onClick={() => setActiveTechSection('sec-sms-push-balance')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-sms-push-balance' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Inbox className="w-3 h-3 text-emerald-400 shrink-0" /> SMS balance</button>
              <button key="sec-certificates-contracts" onClick={() => setActiveTechSection('sec-certificates-contracts')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-certificates-contracts' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><FileText className="w-3 h-3 text-emerald-400 shrink-0" /> Certificates</button>
                  </div>
                )}
              </div>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'vendors' ? null : 'vendors')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'vendors' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />Vendors & Messaging</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">4</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'vendors' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'vendors' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-integration-vendor-registry" onClick={() => setActiveTechSection('sec-integration-vendor-registry')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-integration-vendor-registry' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Package className="w-3 h-3 text-indigo-400 shrink-0" /> Vendor registry</button>
              <button key="sec-vendor-outage-runbook" onClick={() => setActiveTechSection('sec-vendor-outage-runbook')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-vendor-outage-runbook' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><BookOpenCheck className="w-3 h-3 text-indigo-400 shrink-0" /> Vendor runbook</button>
              <button key="sec-sms-notification-template-library" onClick={() => setActiveTechSection('sec-sms-notification-template-library')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-sms-notification-template-library' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><MessageSquare className="w-3 h-3 text-indigo-400 shrink-0" /> SMS templates</button>
              <button key="sec-push-notification-broadcast-center" onClick={() => setActiveTechSection('sec-push-notification-broadcast-center')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-push-notification-broadcast-center' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Megaphone className="w-3 h-3 text-indigo-400 shrink-0" /> Broadcast center</button>
                  </div>
                )}
              </div>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'security' ? null : 'security')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'security' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />Security & Access</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">5</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'security' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'security' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-security-compliance-center" onClick={() => setActiveTechSection('sec-security-compliance-center')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-security-compliance-center' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Shield className="w-3 h-3 text-sky-400 shrink-0" /> Security center</button>
              <button key="sec-session-access-monitor" onClick={() => setActiveTechSection('sec-session-access-monitor')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-session-access-monitor' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Monitor className="w-3 h-3 text-sky-400 shrink-0" /> Sessions</button>
              <button key="sec-ip-allowlist" onClick={() => setActiveTechSection('sec-ip-allowlist')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-ip-allowlist' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Fingerprint className="w-3 h-3 text-sky-400 shrink-0" /> IP allowlist</button>
              <button key="sec-password-auth-policy" onClick={() => setActiveTechSection('sec-password-auth-policy')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-password-auth-policy' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Lock className="w-3 h-3 text-sky-400 shrink-0" /> Auth policy</button>
              <button key="sec-data-retention-policy" onClick={() => setActiveTechSection('sec-data-retention-policy')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-data-retention-policy' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Trash2 className="w-3 h-3 text-sky-400 shrink-0" /> Retention</button>
                  </div>
                )}
              </div>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'delivery' ? null : 'delivery')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'delivery' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />Delivery & Zones</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">6</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'delivery' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'delivery' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-multi-zone-dispatch-map" onClick={() => setActiveTechSection('sec-multi-zone-dispatch-map')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-multi-zone-dispatch-map' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Map className="w-3 h-3 text-amber-400 shrink-0" /> Zone map</button>
              <button key="sec-delivery-sla-by-zone" onClick={() => setActiveTechSection('sec-delivery-sla-by-zone')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-delivery-sla-by-zone' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><MapPinned className="w-3 h-3 text-amber-400 shrink-0" /> Zone SLA</button>
              <button key="sec-geofence-monitor" onClick={() => setActiveTechSection('sec-geofence-monitor')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-geofence-monitor' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><MapPin className="w-3 h-3 text-amber-400 shrink-0" /> Geofence</button>
              <button key="sec-driver-emergency-sos-center" onClick={() => setActiveTechSection('sec-driver-emergency-sos-center')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-driver-emergency-sos-center' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><LifeBuoy className="w-3 h-3 text-amber-400 shrink-0" /> Driver SOS</button>
              <button key="sec-driver-documents-expiry" onClick={() => setActiveTechSection('sec-driver-documents-expiry')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-driver-documents-expiry' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><IdCard className="w-3 h-3 text-amber-400 shrink-0" /> Driver docs</button>
              <button key="sec-store-menu-health" onClick={() => setActiveTechSection('sec-store-menu-health')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-store-menu-health' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Utensils className="w-3 h-3 text-amber-400 shrink-0" /> Menu health</button>
                  </div>
                )}
              </div>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'releases' ? null : 'releases')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'releases' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><Rocket className="w-3.5 h-3.5 text-pink-400 shrink-0" />Change & Releases</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">11</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'releases' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'releases' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-feature-flags-rollout" onClick={() => setActiveTechSection('sec-feature-flags-rollout')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-feature-flags-rollout' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Settings2 className="w-3 h-3 text-pink-400 shrink-0" /> Feature flags</button>
              <button key="sec-change-management" onClick={() => setActiveTechSection('sec-change-management')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-change-management' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><ArrowRightLeft className="w-3 h-3 text-pink-400 shrink-0" /> Change mgmt</button>
              <button key="sec-maintenance-windows" onClick={() => setActiveTechSection('sec-maintenance-windows')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-maintenance-windows' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Clock className="w-3 h-3 text-pink-400 shrink-0" /> Maintenance</button>
              <button key="sec-bug-report-form" onClick={() => setActiveTechSection('sec-bug-report-form')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-bug-report-form' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Bug className="w-3 h-3 text-pink-400 shrink-0" /> Bug report</button>
              <button key="sec-device-matrix" onClick={() => setActiveTechSection('sec-device-matrix')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-device-matrix' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Smartphone className="w-3 h-3 text-pink-400 shrink-0" /> Device matrix</button>
              <button key="sec-force-update-center" onClick={() => setActiveTechSection('sec-force-update-center')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-force-update-center' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Download className="w-3 h-3 text-pink-400 shrink-0" /> Force update</button>
              <button key="sec-version-adoption" onClick={() => setActiveTechSection('sec-version-adoption')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-version-adoption' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Percent className="w-3 h-3 text-pink-400 shrink-0" /> Version adoption</button>
              <button key="sec-release-changelog" onClick={() => setActiveTechSection('sec-release-changelog')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-release-changelog' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Sparkles className="w-3 h-3 text-pink-400 shrink-0" /> Changelog</button>
              <button key="sec-release-readiness-checklist" onClick={() => setActiveTechSection('sec-release-readiness-checklist')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-release-readiness-checklist' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><ListChecks className="w-3 h-3 text-pink-400 shrink-0" /> Release checklist</button>
              <button key="sec-deploy-pipeline-environment-status" onClick={() => setActiveTechSection('sec-deploy-pipeline-environment-status')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-deploy-pipeline-environment-status' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Rocket className="w-3 h-3 text-pink-400 shrink-0" /> Deploy pipeline</button>
              <button key="sec-environment-config-center" onClick={() => setActiveTechSection('sec-environment-config-center')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-environment-config-center' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Settings2 className="w-3 h-3 text-pink-400 shrink-0" /> Env config</button>
                  </div>
                )}
              </div>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'people' ? null : 'people')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'people' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />People & Operations</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">8</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'people' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'people' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-on-call-roster" onClick={() => setActiveTechSection('sec-on-call-roster')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-on-call-roster' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Users className="w-3 h-3 text-purple-400 shrink-0" /> On-call roster</button>
              <button key="sec-shift-handover-notes" onClick={() => setActiveTechSection('sec-shift-handover-notes')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-shift-handover-notes' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><MessagesSquare className="w-3 h-3 text-purple-400 shrink-0" /> Shift handover</button>
              <button key="sec-nightly-batch-jobs" onClick={() => setActiveTechSection('sec-nightly-batch-jobs')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-nightly-batch-jobs' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Workflow className="w-3 h-3 text-purple-400 shrink-0" /> Batch jobs</button>
              <button key="sec-tech-debt-deprecation-tracker" onClick={() => setActiveTechSection('sec-tech-debt-deprecation-tracker')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-tech-debt-deprecation-tracker' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><AlertCircle className="w-3 h-3 text-purple-400 shrink-0" /> Tech debt</button>
              <button key="sec-tech-backlog" onClick={() => setActiveTechSection('sec-tech-backlog')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-tech-backlog' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><ListChecks className="w-3 h-3 text-purple-400 shrink-0" /> Tech backlog</button>
              <button key="sec-feature-request-board" onClick={() => setActiveTechSection('sec-feature-request-board')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-feature-request-board' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Lightbulb className="w-3 h-3 text-purple-400 shrink-0" /> Feature board</button>
              <button key="sec-csat-funnel" onClick={() => setActiveTechSection('sec-csat-funnel')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-csat-funnel' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Star className="w-3 h-3 text-purple-400 shrink-0" /> CSAT funnel</button>
              <button key="sec-canned-responses" onClick={() => setActiveTechSection('sec-canned-responses')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-canned-responses' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Quote className="w-3 h-3 text-purple-400 shrink-0" /> Canned replies</button>
                  </div>
                )}
              </div>
              <div className="border border-brand-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenCat(o => o === 'tools' ? null : 'tools')} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${openCat === 'tools' ? 'bg-brand-orange/10 border-b border-brand-border' : 'bg-brand-dark/40 hover:bg-brand-dark/70'}`}>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-200 tracking-wider text-left"><Wrench className="w-3.5 h-3.5 text-cyan-400 shrink-0" />Support Tools & Knowledge</span>
                  <span className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-dark border border-brand-border text-gray-400">9</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openCat === 'tools' ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openCat === 'tools' && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-brand-dark/20">
              <button key="sec-technical-auto-diagnosis" onClick={() => setActiveTechSection('sec-technical-auto-diagnosis')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-technical-auto-diagnosis' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><SearchCheck className="w-3 h-3 text-cyan-400 shrink-0" /> Auto-diagnosis</button>
              <button key="sec-diagnosis-wizard" onClick={() => setActiveTechSection('sec-diagnosis-wizard')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-diagnosis-wizard' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Wand2 className="w-3 h-3 text-cyan-400 shrink-0" /> Diagnosis wizard</button>
              <button key="sec-knowledge-base" onClick={() => setActiveTechSection('sec-knowledge-base')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-knowledge-base' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><BookOpen className="w-3 h-3 text-cyan-400 shrink-0" /> Knowledge base</button>
              <button key="sec-common-fix-library" onClick={() => setActiveTechSection('sec-common-fix-library')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-common-fix-library' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Wrench className="w-3 h-3 text-cyan-400 shrink-0" /> Fix library</button>
              <button key="sec-escalation-matrix" onClick={() => setActiveTechSection('sec-escalation-matrix')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-escalation-matrix' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><ArrowUpCircle className="w-3 h-3 text-cyan-400 shrink-0" /> Escalation matrix</button>
              <button key="sec-tier-based-support-model" onClick={() => setActiveTechSection('sec-tier-based-support-model')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-tier-based-support-model' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><Layers className="w-3 h-3 text-cyan-400 shrink-0" /> Tier model</button>
              <button key="sec-support-channels-types" onClick={() => setActiveTechSection('sec-support-channels-types')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-support-channels-types' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><MessagesSquare className="w-3 h-3 text-cyan-400 shrink-0" /> Channels</button>
              <button key="sec-sop-runbook-library" onClick={() => setActiveTechSection('sec-sop-runbook-library')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-sop-runbook-library' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><GitCommit className="w-3 h-3 text-cyan-400 shrink-0" /> SOP runbooks</button>
              <button key="sec-tech-audit-trail" onClick={() => setActiveTechSection('sec-tech-audit-trail')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${activeTechSection === 'sec-tech-audit-trail' ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-dark/40 border-brand-border text-gray-300 hover:border-brand-orange/40'}`}><History className="w-3 h-3 text-cyan-400 shrink-0" /> Audit trail</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* App Issue Overview — where the problems are */}
          <div id="sec-app-issue-overview-where-the-problems-are" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-app-issue-overview-where-the-problems-are' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Zap className="w-3.5 h-3.5 text-brand-orange" /><span>App Issue Overview</span></h3>
              {(() => {
                const problemCount = (Object.keys(health).filter(k => health[k] === 'Issue').length)
                  + knownIssues.filter(i => i.status !== 'Resolved').length
                  + techTickets.filter(t => t.status !== 'Resolved').length
                  + users.filter(u => (u.type === 'driver' && u.grade === 'C') || u.status === 'blocked' || (u.type !== 'customer' && u.complaints > 0) || u.complaints >= 2).length
                  + driverScorecards.filter(d => d.grade === 'C').length
                  + storePerformance.filter(s => s.atFault > 0).length
                  + agingOrders.length
                  + duplicateOrders.length
                  + debt.filter(d => d.status === 'Overdue').length;
                return (
                  <span className={`text-[9px] font-black uppercase ${problemCount === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {problemCount === 0 ? '● No problem areas detected' : `⚠ ${problemCount} problem area(s) detected`}
                  </span>
                );
              })()}
              <button onClick={exportTechReport} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-emerald-300 rounded-lg text-[9px] font-black uppercase cursor-pointer transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10" title="Download nexago-tech-support-report.json">Export Tech Report</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-white">{Object.keys(health).filter(k => health[k] === 'Issue').length}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Services down</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-white">{knownIssues.filter(i => i.status !== 'Resolved').length}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Open incidents</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-white">{techTickets.filter(t => t.status !== 'Resolved').length}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Tech tickets</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-white">{users.filter(u => u.status === 'blocked').length}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Blocked users</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-red-400">{driverScorecards.filter(d => d.grade === 'C').length}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Problem drivers</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-orange-400">{storePerformance.filter(s => s.atFault > 0).length}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Stores at fault</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-amber-400">{agingOrders.length}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Aging orders</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-cyan-400">{duplicateOrders.length}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Duplicates</p>
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Auto-detected across health board, incidents, tickets, users, driver/store scorecards and order reports. Switch to the User Management tab to block / re-activate users.</p>
          </div>

          {/* Technical KPIs */}
          <div id="sec-technical-kpis" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-technical-kpis' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Timer className="w-3.5 h-3.5 text-brand-orange" /><span>Technical KPIs</span></h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-white">{techKpis.fixesApplied}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Fixes applied</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-white">{techKpis.incidents}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Incidents logged</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-emerald-400">{techKpis.resolved}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Resolved</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-amber-400">{techKpis.open}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Still open</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-brand-orange">{techKpis.resolutionRate}%</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Resolution rate</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className={`text-lg font-black truncate ${techKpis.worstService ? 'text-red-400' : 'text-gray-600'}`}>{techKpis.worstService ? techKpis.worstService[0].split(' ')[0] : '—'}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Worst area</p>
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">KPIs are computed live from the Tech Support Audit + incident board.</p>
          </div>

          {/* Diagnostics runner */}
          <div id="sec-diagnostics-runner" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-diagnostics-runner' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Wand2 className="w-3.5 h-3.5 text-cyan-400" /><span>Full Diagnostics Runner</span></h3>
              <button onClick={runDiagnostics} className="px-3.5 py-1.5 bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-cyan-600/30">Run Full Diagnostics</button>
            </div>
            {!diagReport ? (
              <p className="text-[10px] text-gray-500">Runs a live check across all 12 services, 8 vendors, incidents, users, duplicates and aging orders — then logs the outcome to the audit.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[9px] text-gray-500 font-mono">Report generated at {diagReport.time} · {diagReport.checks.filter(c => c.result !== 'Pass').length} issue(s) across {diagReport.checks.length} checks</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {diagReport.checks.map((c, i) => (
                    <div key={i} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-1.5 ${c.result === 'Pass' ? 'bg-emerald-500/5 border-emerald-500/20' : c.result === 'Warn' ? 'bg-amber-500/5 border-amber-500/25' : 'bg-red-500/5 border-red-500/25'}`}>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-white truncate">{c.label}</p>
                        <p className="text-[9px] text-gray-500 truncate">{c.detail}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${c.result === 'Pass' ? 'bg-emerald-500/10 text-emerald-400' : c.result === 'Warn' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{c.result}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data reconciliation */}
          <div id="sec-data-reconciliation" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-data-reconciliation' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Scale className="w-3.5 h-3.5 text-emerald-400" /><span>Data Reconciliation ({reconcileIssues.length})</span></h3>
            {reconcileIssues.length === 0 ? (
              <p className="text-[10px] text-gray-500">No mismatches found — orders, reports, faults and the ledger are consistent.</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {reconcileIssues.map((r, i) => (
                  <div key={i} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold text-amber-300">{r.problem}</p>
                    <p className="text-[9px] text-gray-500 mt-1">What: {r.what}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Fix: <span className="text-emerald-300">{r.fix}</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Severity / priority calculator */}
          <div id="sec-severity-priority-calculator" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-severity-priority-calculator' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Calculator className="w-3.5 h-3.5 text-orange-400" /><span>Severity / Priority Calculator</span></h3>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${computeSeverity().severity === 'Critical' ? 'bg-red-500/10 text-red-400' : computeSeverity().severity === 'High' ? 'bg-orange-500/10 text-orange-400' : computeSeverity().severity === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>Result: {computeSeverity().severity}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={sevCalc.impact} onChange={(e) => setSevCalc(f => ({ ...f, impact: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Payments', 'Order & Checkout', 'Delivery & GPS', 'Notifications', 'Customer App', 'Driver App', 'Store Panel', 'Admin'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <select value={sevCalc.scope} onChange={(e) => setSevCalc(f => ({ ...f, scope: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['<5%', '5–25%', '25–60%', '>60%'].map(s => <option key={s} value={s}>{s} users</option>)}
              </select>
              <select value={sevCalc.workaround} onChange={(e) => setSevCalc(f => ({ ...f, workaround: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['None', 'Manual workaround', 'Full workaround'].map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <p className="text-[10px] text-gray-400 mb-2">How it scores: <span className="text-gray-300 font-mono">{computeSeverity().why}</span></p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${computeSeverity().score >= 6 ? 'bg-red-500/70' : computeSeverity().score >= 4 ? 'bg-orange-500/70' : computeSeverity().score >= 2 ? 'bg-amber-500/70' : 'bg-blue-500/70'}`} style={{ width: `${Math.min(100, computeSeverity().score / 7 * 100)}%` }} />
              </div>
              <button onClick={logSevIncident} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0">Log as Incident</button>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Scores impact + scope + workaround into a severity, then creates an Investigating incident on the Known Issues board.</p>
          </div>

          {/* Incident impact calculator */}
          <div id="sec-incident-impact-calculator" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-incident-impact-calculator' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><TrendingUp className="w-3.5 h-3.5 text-rose-400" /><span>Incident Impact Calculator</span></h3>
              <span className="text-[9px] text-gray-500">Estimate blast radius before escalating</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={impCalc.type} onChange={(e) => setImpCalc(f => ({ ...f, type: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Payments', 'Order & Checkout', 'Delivery & GPS', 'Notifications', 'App launch'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={impCalc.duration} onChange={(e) => setImpCalc(f => ({ ...f, duration: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['15 min', '30 min', '60 min', '120 min'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={impCalc.period} onChange={(e) => setImpCalc(f => ({ ...f, period: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Peak', 'Off-peak'].map(p => <option key={p} value={p}>{p} hours</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-brand-dark/60 border border-brand-border rounded-lg px-3 py-2 text-center">
                <p className="text-[8px] text-gray-500 uppercase">Orders hit</p>
                <p className="text-[16px] font-black text-rose-300">{computeImpact().orders.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-brand-dark/60 border border-brand-border rounded-lg px-3 py-2 text-center">
                <p className="text-[8px] text-gray-500 uppercase">Customers</p>
                <p className="text-[16px] font-black text-amber-300">{computeImpact().customers.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-brand-dark/60 border brand-border rounded-lg px-3 py-2 text-center">
                <p className="text-[8px] text-gray-500 uppercase">Revenue at risk</p>
                <p className="text-[16px] font-black text-emerald-300">{computeImpact().revenue}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">Scenario: <span className="text-gray-300 font-mono">{computeImpact().why}</span> — use this to justify Critical status in the war room.</p>
            <p className="text-[9px] text-gray-600 mt-2">Blast radius = base per-hour volume × duration × peak multiplier. Combine with the Severity calculator before opening a war room.</p>
          </div>

          {/* Refund fraud review queue */}
          <div id="sec-refund-fraud-review-queue" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-refund-fraud-review-queue' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-400" /><span>Refund Fraud Review Queue ({fraudQueue.filter(f => f.status === 'Queued').length} queued)</span></h3>
              <span className="text-[9px] text-gray-500">{fraudQueue.filter(f => f.status === 'Approved').length} approved · {fraudQueue.filter(f => f.status === 'Rejected').length} rejected</span>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {fraudQueue.length === 0 ? (
                <p className="text-[10px] text-gray-500">No refunds waiting for fraud review.</p>
              ) : (
                fraudQueue.map(f => (
                  <div key={f.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border ${f.status === 'Queued' ? 'bg-amber-500/5 border-amber-500/25' : f.status === 'Approved' ? 'bg-emerald-500/5 border-emerald-500/25 opacity-70' : 'bg-brand-dark/40 border-brand-border opacity-60'}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white"><span className="font-mono text-brand-orange">{f.id}</span> · {f.customer} · <span className="text-amber-300">{f.amount}</span> · <span className="text-gray-400">{f.order}</span></p>
                      <p className="text-[9px] text-gray-500">Flag: <span className={`font-black ${f.flag === 'Duplicate claim' ? 'text-red-400' : f.flag === 'Suspicious pattern' ? 'text-purple-400' : 'text-amber-400'}`}>{f.flag}</span> — {f.reason}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${f.status === 'Queued' ? 'bg-amber-500/10 text-amber-400' : f.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{f.status}</span>
                      {f.status === 'Queued' && (
                        <div className="flex items-center space-x-1.5">
                          <button onClick={() => decideFraud(f.id, true)} className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded text-[9px] font-bold cursor-pointer hover:bg-emerald-600/30">Approve refund</button>
                          <button onClick={() => decideFraud(f.id, false)} className="px-2 py-1 bg-red-600/20 border border-red-500/40 text-red-300 rounded text-[9px] font-bold cursor-pointer hover:bg-red-600/30">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Auto-flagged refunds from the SD fraud rules — approve to release the payout, reject to keep the hold. Every decision is audited.</p>
          </div>

          {/* Refund velocity */}
          <div id="sec-refund-velocity" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-refund-velocity' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Hourglass className="w-3.5 h-3.5 text-amber-400" /><span>Refund Velocity / Aged Refunds</span></h3>
              <span className="text-[9px] text-gray-500">{refundVel.filter(r => r.status === 'Aged').length} aged · avg {refundVel.reduce((s, r) => s + r.hours, 0) / refundVel.length}h</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-brand-dark/60 border border-brand-border rounded-lg px-2 py-1.5 text-center">
                <p className="text-[8px] text-gray-500 uppercase">Avg time to refund</p>
                <p className="text-[13px] font-black text-amber-300">19h 40m</p>
              </div>
              <div className="bg-brand-dark/60 border border-brand-border rounded-lg px-2 py-1.5 text-center">
                <p className="text-[8px] text-gray-500 uppercase">Auto-approved</p>
                <p className="text-[13px] font-black text-emerald-300">68%</p>
              </div>
              <div className="bg-brand-dark/60 border border-brand-border rounded-lg px-2 py-1.5 text-center">
                <p className="text-[8px] text-gray-500 uppercase">Over 48h</p>
                <p className="text-[13px] font-black text-red-400">{refundVel.filter(r => r.hours > 48).length}</p>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {refundVel.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{r.order} · {r.customer} <span className="text-[8px] text-gray-500">· {r.method}</span></p>
                    <p className={`text-[9px] ${r.hours > 48 ? 'text-red-400 font-bold' : 'text-amber-400'}`}>{r.amount} · waiting {r.hours}h</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${r.status === 'Escalated' ? 'bg-red-500/10 text-red-400' : r.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{r.status}</span>
                    {r.status === 'Aged' && <button onClick={() => escalateRefund(r.id)} className="px-2 py-1 bg-red-600/20 border border-red-500/40 text-red-300 rounded text-[9px] font-bold cursor-pointer hover:bg-red-600/30">Escalate</button>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Refunds stuck past 48h violate our SLA and attract chargebacks — escalate to the finance on-call with the order id.</p>
          </div>

          {/* Admin approval queue */}
          <div id="sec-admin-approval-queue" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-admin-approval-queue' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><ClipboardList className="w-3.5 h-3.5 text-blue-400" /><span>Admin Approval Queue ({approvals.filter(a => a.status === 'Pending').length} pending)</span></h3>
              <span className="text-[9px] text-gray-500">{approvals.filter(a => a.status === 'Pending').length} waiting for a decision</span>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {approvals.length === 0 ? (
                <p className="text-[10px] text-gray-500">No pending approvals.</p>
              ) : (
                approvals.map(a => (
                  <div key={a.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border ${a.status === 'Pending' ? 'bg-brand-dark/40 border-blue-500/25' : a.status === 'Approved' ? 'bg-emerald-500/5 border-emerald-500/25 opacity-70' : 'bg-brand-dark/40 border-brand-border opacity-60'}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white"><span className="font-mono text-blue-400">{a.id}</span> · {a.type} · <span className="text-gray-400">{a.time}</span></p>
                      <p className="text-[9px] text-gray-500">{a.subject} · by {a.by}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${a.status === 'Pending' ? 'bg-blue-500/10 text-blue-400' : a.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{a.status}</span>
                      {a.status === 'Pending' && (
                        <div className="flex items-center space-x-1.5">
                          <button onClick={() => decideApproval(a.id, true)} className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded text-[9px] font-bold cursor-pointer hover:bg-emerald-600/30">Approve</button>
                          <button onClick={() => decideApproval(a.id, false)} className="px-2 py-1 bg-red-600/20 border border-red-500/40 text-red-300 rounded text-[9px] font-bold cursor-pointer hover:bg-red-600/30">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Driver reactivations, store onboarding, payout holds and KYC escalations land here for a decision.</p>
          </div>

          {/* Driver payout monitor */}
          <div id="sec-driver-payout-monitor" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-driver-payout-monitor' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Banknote className="w-3.5 h-3.5 text-emerald-400" /><span>Driver Payout Runs</span></h3>
              <span className="text-[9px] text-gray-500">{payouts.filter(p => p.status === 'Paid').length}/{payouts.length} paid</span>
            </div>
            <div className="space-y-1.5">
              {payouts.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white"><span className="font-mono text-brand-orange">{p.id}</span> · {p.period}</p>
                    <p className="text-[9px] text-gray-500">{p.drivers} drivers · <span className="text-emerald-300 font-black">{p.amount}</span></p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'Processing' ? 'bg-blue-500/10 text-blue-400' : p.status === 'Failed' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{p.status}</span>
                    {p.status === 'Pending' && <button onClick={() => cyclePayout(p.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Start run</button>}
                    {p.status === 'Processing' && <button onClick={() => cyclePayout(p.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Mark paid</button>}
                    {p.status === 'Failed' && <button onClick={() => cyclePayout(p.id)} className="px-2 py-1 bg-red-600/20 border border-red-500/40 text-red-300 rounded text-[9px] font-bold cursor-pointer hover:bg-red-600/30">Retry</button>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Weekly earnings + fuel-deduction + COD settlement batches. Failed runs mean drivers are not paid — escalate immediately.</p>
          </div>

          {/* Public status page */}
          <div id="sec-public-status-page" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-public-status-page' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Globe className="w-3.5 h-3.5 text-emerald-400" /><span>Public Status Page</span></h3>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${downServices.length === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{downServices.length === 0 ? 'All systems operational' : `${downServices.length} system(s) down`}</span>
                <button onClick={() => setTechAudit(prev => [{ action: 'Status page published', detail: `${downServices.length === 0 ? 'All systems operational' : downServices.length + ' system(s) down'} — update sent to status.nexago.com`, time: nowTime() }, ...prev])} className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-emerald-600/30">Publish Update</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {[
                { name: 'Order placement', key: 'SD App Server', note: 'Checkout, slots, extra stores' },
                { name: 'Payments', key: 'Payment Gateway (bKash/Nagad/Rocket)', note: 'COD, wallet, refunds' },
                { name: 'Delivery tracking', key: 'GPS / Map Track', note: 'Live route + ETA' },
                { name: 'Notifications', key: 'Push + SMS Alerts', note: 'OTP, order alerts' },
                { name: 'Store operations', key: 'Store Panel Service', note: 'Catalog, confirm, sync' },
                { name: 'Reports & analytics', key: 'Reports / Analytics', note: 'Disputes, scorecards, aging' }
              ].map(s => {
                const down = health[s.key] === 'Issue' || Object.keys(integrations).some(k => integrations[k].status === 'Down');
                return (
                  <div key={s.name} className={`rounded-lg border px-3 py-2.5 ${down ? 'bg-red-500/10 border-red-500/40' : 'bg-brand-dark/40 border-brand-border'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-white">{s.name}</p>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: down ? '#ef4444' : '#22c55e' }} />
                    </div>
                    <p className="text-[8px] text-gray-500 mt-0.5">{s.note}</p>
                    <p className={`text-[8px] font-black uppercase mt-1 ${down ? 'text-red-400' : 'text-emerald-400'}`}>{down ? 'Degraded / outage' : 'Operational'} · {Math.min(100, 99 - downServices.length)}% uptime 90d</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">What customers see on status.nexago.com — publishing broadcasts a fresh update and is audited.</p>
          </div>

          {/* SLA targets */}
          <div id="sec-sla-targets" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-sla-targets' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Timer className="w-3.5 h-3.5 text-amber-400" /><span>SLA Response Targets</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {(['Critical', 'High', 'Medium', 'Low'] as const).map(sev => (
                <div key={sev} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase ${sev === 'Critical' ? 'text-red-400' : sev === 'High' ? 'text-orange-400' : sev === 'Medium' ? 'text-amber-400' : 'text-blue-400'}`}>{sev}</span>
                    <span className="text-[9px] text-gray-500">Target: {slaInfo(sev).label}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <input
                      type="number"
                      min={1}
                      max={4320}
                      defaultValue={slaConfig[sev]}
                      key={slaConfig[sev]}
                      onBlur={(e) => updateSla(sev, parseInt(e.target.value || '0', 10))}
                      onKeyDown={(e) => { if (e.key === 'Enter') updateSla(sev, parseInt((e.target as HTMLInputElement).value || '0', 10)); }}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-brand-orange"
                      title="Minutes — updates on blur / Enter"
                    />
                  </div>
                  <p className="text-[8px] text-gray-600 mt-1.5">minutes to respond — feeds the incident SLA badges</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Editable per-severity response targets. Every change is audited and persisted.</p>
          </div>

          {/* Incident & action analytics */}
          <div id="sec-incident-action-analytics" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-incident-action-analytics' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><BarChart3 className="w-3.5 h-3.5 text-brand-orange" /><span>Incident &amp; Action Analytics</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">Incidents by severity</p>
                <div className="space-y-1.5">
                  {sevCounts.map(x => (
                    <div key={x.sev} className="flex items-center space-x-2">
                      <span className={`w-14 text-[9px] font-black uppercase shrink-0 ${x.sev === 'Critical' ? 'text-red-400' : x.sev === 'High' ? 'text-orange-400' : x.sev === 'Medium' ? 'text-amber-400' : 'text-blue-400'}`}>{x.sev}</span>
                      <div className="flex-1 bg-brand-dark/40 border border-brand-border rounded h-3 overflow-hidden">
                        <div className={`h-full ${x.sev === 'Critical' ? 'bg-red-500' : x.sev === 'High' ? 'bg-orange-500' : x.sev === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${(x.n / sevMax) * 100}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-gray-400 w-6 text-right shrink-0">{x.n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">Audit actions by type</p>
                <div className="space-y-1.5">
                  {auditBuckets.length === 0 ? (
                    <p className="text-[10px] text-gray-500">No audit actions yet — apply a fix or log an incident.</p>
                  ) : auditBuckets.map(([k, n]) => (
                    <div key={k} className="flex items-center space-x-2">
                      <span className="w-20 text-[9px] font-bold text-gray-300 truncate shrink-0">{k}</span>
                      <div className="flex-1 bg-brand-dark/40 border border-brand-border rounded h-3 overflow-hidden">
                        <div className="h-full bg-brand-orange" style={{ width: `${(n / auditBuckets[0][1]) * 100}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-gray-400 w-6 text-right shrink-0">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Live distributions from the incident board + Tech Support Audit.</p>
          </div>

          {/* System health */}
          <div id="sec-system-health" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-system-health' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /><span>System Health</span></h3>
              <span className={`text-[9px] font-black uppercase ${Object.values(health).includes('Issue') ? 'text-red-400' : 'text-emerald-400'}`}>
                {Object.values(health).includes('Issue') ? '⚠ Partial outage' : '● All systems online'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {Object.keys(health).map(k => (
                <button key={k} onClick={() => toggleHealth(k)} className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${health[k] === 'Online' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/30'}`} title="Click to simulate status">
                  <span className="text-[10px] font-bold text-gray-200">{k}</span>
                  <span className={`text-[9px] font-black uppercase ${health[k] === 'Online' ? 'text-emerald-400' : 'text-red-400'}`}>{health[k] === 'Online' ? 'Online' : 'Issue'}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Toggle a service to raise or auto-resolve linked incidents — every change is logged to the Tech Support Audit.</p>
          </div>

          {/* Dependency cascade map */}
          <div id="sec-dependency-cascade-map" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-dependency-cascade-map' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><GitBranch className="w-3.5 h-3.5 text-cyan-400" /><span>Dependency &amp; Cascade Map</span></h3>
            {downServices.length > 0 && (
              <div className="space-y-1.5 mb-3">
                <p className="text-[9px] font-bold uppercase text-gray-500">Live cascade — what is affected right now</p>
                {downServices.map(k => (
                  <div key={k} className="bg-red-500/5 border border-red-500/25 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold text-red-300">{k} is down → affects {cascadeAffected(k).length} dependent service(s)</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{cascadeAffected(k).join(' · ') || 'no direct dependents'}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-2">
              {Object.keys(DEPENDENCY_MAP).map(k => (
                <div key={k} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold text-white">{k}</p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${health[k] === 'Issue' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{health[k]}</span>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">Feeds {DEPENDENCY_MAP[k].length} service(s): {DEPENDENCY_MAP[k].join(' · ')}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">If a service goes down, everything that depends on it degrades. Check the cascade before running maintenance.</p>
          </div>

          {/* Multi-zone dispatch map */}
          <div id="sec-multi-zone-dispatch-map" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-multi-zone-dispatch-map' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Map className="w-3.5 h-3.5 text-orange-400" /><span>Multi-Zone Dispatch Map</span></h3>
              <span className="text-[9px] text-gray-500">{zones.reduce((s, z) => s + z.orders, 0).toLocaleString()} live orders · {zones.filter(z => z.status !== 'Normal').length} zone(s) needing attention</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
              {zones.map(z => (
                <button key={z.id} onClick={() => cycleZone(z.id)} className={`rounded-lg border px-3 py-2 text-left cursor-pointer transition-colors ${z.status === 'Outage' ? 'bg-red-500/10 border-red-500/40' : z.status === 'Congested' ? 'bg-amber-500/10 border-amber-500/40' : z.orders > 150 ? 'bg-orange-500/5 border-orange-500/25' : 'bg-brand-dark/40 border-brand-border hover:border-brand-orange/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold text-white truncate">{z.name}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase shrink-0 ${z.status === 'Outage' ? 'bg-red-500/10 text-red-400' : z.status === 'Congested' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{z.status}</span>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1"><span className="font-mono text-brand-orange font-black">{z.orders}</span> orders · <span className="font-mono">{z.drivers}</span> drivers</p>
                  <p className="text-[8px] text-gray-500">avg {z.avgMin} min · <span className="text-emerald-400">{Math.max(4, Math.round(z.drivers / (z.orders || 1) * 100))}% capacity</span></p>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Click a zone to cycle its status (Normal → Congested → Outage) for dispatch prioritization — changes are audited.</p>
          </div>

          {/* Delivery SLA by zone */}
          <div id="sec-delivery-sla-by-zone" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-delivery-sla-by-zone' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><MapPinned className="w-3.5 h-3.5 text-emerald-400" /><span>Delivery SLA by Zone</span></h3>
              <span className="text-[9px] text-gray-500">Customer-visible promise per zone</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {zoneSla.map(z => (
                <div key={z.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 text-center">
                  <p className="text-[9px] font-bold text-gray-300 truncate">{z.zone}</p>
                  <div className="flex items-center justify-center space-x-2 mt-1.5">
                    <button onClick={() => adjustZoneSla(z.id, -5)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">−</button>
                    <span className="font-mono text-lg font-black text-emerald-300">{z.promiseMin}<span className="text-[8px] text-gray-500">m</span></span>
                    <button onClick={() => adjustZoneSla(z.id, 5)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">+</button>
                  </div>
                  <p className="text-[8px] text-gray-600 mt-1">promised ETA</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Shown as the checkout ETA — set realistic promises per zone so riders can hit them.</p>
          </div>

          {/* Geofence monitor */}
          <div id="sec-geofence-monitor" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-geofence-monitor' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><MapPin className="w-3.5 h-3.5 text-red-400" /><span>Geofence Monitor ({geofence.filter(g => g.status === 'Open').length} open)</span></h3>
              <span className="text-[9px] text-gray-500">Zone boundary violations in real time</span>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {geofence.length === 0 ? (
                <p className="text-[10px] text-gray-500">No geofence events recorded.</p>
              ) : (
                geofence.map(g => (
                  <div key={g.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border ${g.status === 'Open' ? 'bg-red-500/5 border-red-500/30' : 'bg-brand-dark/40 border-brand-border opacity-60'}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white"><span className="font-mono text-brand-orange">{g.id}</span> · {g.driver} · <span className="text-red-300">{g.event}</span></p>
                      <p className="text-[9px] text-gray-500">Zone {g.zone} · {g.time}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${g.status === 'Open' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{g.status}</span>
                      {g.status === 'Open' && <button onClick={() => reviewGeofence(g.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Review & clear</button>}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Leaving the service area, entering no-go zones or speed anomalies surface here for review.</p>
          </div>

          {/* Known issues / incidents board */}
          <div id="sec-known-issues-incidents-board" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-known-issues-incidents-board' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><AlertCircle className="w-3.5 h-3.5 text-amber-400" /><span>Known Issues / Incidents ({knownIssues.length})</span></h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                type="text"
                value={issueForm.title}
                onChange={(e) => setIssueForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') logIssue(); }}
                placeholder="e.g. Driver app crash on login"
                className="flex-1 min-w-[160px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600"
              />
              <select value={issueForm.severity} onChange={(e) => setIssueForm(f => ({ ...f, severity: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {(['Low', 'Medium', 'High', 'Critical'] as const).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={issueForm.platform} onChange={(e) => setIssueForm(f => ({ ...f, platform: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {(['Customer App', 'Driver App', 'Store Panel', 'Admin / Multi'] as const).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={logIssue} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Log Issue</button>
            </div>
            {knownIssues.length === 0 ? (
              <p className="text-[10px] text-gray-500">No known issues logged yet.</p>
            ) : (
              <div className="space-y-2">
                {knownIssues.map(k => (
                  <div key={k.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white">{k.title} <span className="font-mono text-[9px] text-gray-500">({k.id})</span></p>
                      <p className="text-[9px] text-gray-500">{k.platform} · {k.time} · severity <span className={`font-black ${k.severity === 'Critical' ? 'text-red-400' : k.severity === 'High' ? 'text-orange-400' : k.severity === 'Medium' ? 'text-amber-400' : 'text-blue-400'}`}>{k.severity}</span></p>
                      {(() => {
                        if (k.status === 'Resolved') return null;
                        const openMins = incidentOpenMins(k.time);
                        const sla = slaInfo(k.severity);
                        const breach = openMins !== null && openMins > sla.targetMins;
                        return (
                          <p className="text-[9px] text-gray-500 mt-0.5">
                            Open for <span className={breach ? 'text-red-400 font-black' : 'text-gray-300 font-bold'}>{openMins === null ? '…' : openMins >= 60 ? `${Math.floor(openMins / 60)}h ${openMins % 60}m` : `${openMins}m`}</span> · SLA target <span className="text-gray-300 font-bold">{sla.label}</span>
                            {breach && <span className="ml-1.5 px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded text-[8px] font-black uppercase">SLA breached</span>}
                            {openMins !== null && openMins <= sla.targetMins && <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[8px] font-black uppercase">On target</span>}
                          </p>
                        );
                      })()}
                      {rcaOpen === k.id && (
                        <div className="mt-2 bg-brand-dark/50 border border-brand-border rounded-lg p-2 space-y-1.5">
                          <input type="text" value={rcaForm.root} onChange={(e) => setRcaForm(f => ({ ...f, root: e.target.value }))} placeholder="Root cause (RCA)…" className="w-full bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
                          <input type="text" value={rcaForm.prevention} onChange={(e) => setRcaForm(f => ({ ...f, prevention: e.target.value }))} placeholder="Prevention / action item…" className="w-full bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
                          <button onClick={() => saveRca(k.id)} className="px-2.5 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded text-[9px] font-black cursor-pointer hover:bg-emerald-600/30">Save RCA</button>
                        </div>
                      )}
                      {k.rca && rcaOpen !== k.id && (
                        <p className="text-[9px] text-gray-500 mt-1">RCA: <span className="text-purple-300">{k.rca}</span>{k.prevention ? ` · Prevent: ${k.prevention}` : ''}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${k.status === 'Investigating' ? 'bg-amber-500/10 text-amber-400' : k.status === 'Fix Deployed' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{k.status}</span>
                      {k.status === 'Investigating' && <button onClick={() => advanceIssue(k.id, 'Fix Deployed')} className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[9px] font-bold cursor-pointer hover:bg-blue-500/20">Fix Deployed</button>}
                      {k.status !== 'Resolved' && <button onClick={() => advanceIssue(k.id, 'Resolved')} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[9px] font-bold cursor-pointer hover:bg-emerald-500/20">Resolve</button>}
                      {k.status === 'Resolved' && <button onClick={() => { setRcaOpen(rcaOpen === k.id ? null : k.id); setRcaForm({ root: k.rca || '', prevention: k.prevention || '' }); }} className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded text-[9px] font-bold cursor-pointer hover:bg-purple-500/20">{k.rca ? 'Edit RCA' : 'RCA'}</button>}
                      <button onClick={() => deleteIssue(k.id)} className="p-1 text-gray-500 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incident template library */}
          <div id="sec-incident-template-library" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-incident-template-library' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><LayoutTemplate className="w-3.5 h-3.5 text-blue-400" /><span>Incident Template Library ({INCIDENT_TEMPLATES.length})</span></h3>
              <span className="text-[9px] text-gray-500">One-click standard incidents</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-2">
              {INCIDENT_TEMPLATES.map(t => (
                <div key={t.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[10px] font-bold text-white">{t.name}</p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${t.severity === 'Critical' ? 'bg-red-500/10 text-red-400' : t.severity === 'High' ? 'bg-orange-500/10 text-orange-400' : t.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{t.severity}</span>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">{t.platform} · {t.desc}</p>
                  <button onClick={() => useTemplate(t)} className="mt-1.5 px-2.5 py-1 bg-brand-orange/10 border border-brand-orange/30 text-brand-orange rounded text-[9px] font-black uppercase cursor-pointer hover:bg-brand-orange/20">Use Template</button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Standard scenarios open instantly as Investigating incidents and post a war-room update — no typing needed.</p>
          </div>

          {/* Incident review / postmortem checklist */}
          <div id="sec-incident-review-postmortem-checklist" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-incident-review-postmortem-checklist' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><ClipboardCheck className="w-3.5 h-3.5 text-violet-400" /><span>Incident Review Board</span></h3>
              <select value={reviewIncident} onChange={(e) => setReviewIncident(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="">Select an incident…</option>
                {knownIssues.map(k => <option key={k.id} value={k.id}>{k.id} — {k.title}</option>)}
              </select>
            </div>
            {reviewIncident === '' ? (
              <p className="text-[10px] text-gray-500">Pick an incident from the Known Issues board to run its postmortem checklist.</p>
            ) : (
              (() => {
                const inc = knownIssues.find(x => x.id === reviewIncident);
                const list = reviews[reviewIncident] || REVIEW_CHECKLIST.map(c => ({ label: c, done: false }));
                const doneCount = list.filter(c => c.done).length;
                return (
                  <div>
                    <p className="text-[9px] text-gray-400 mb-2">{inc ? `${inc.title} · ${inc.status} · severity ${inc.severity}` : ''} — <span className={`font-black ${doneCount === list.length ? 'text-emerald-400' : 'text-violet-400'}`}>{doneCount}/{list.length} complete</span></p>
                    <div className="space-y-1.5">
                      {list.map((c, i) => (
                        <button key={i} onClick={() => toggleReview(reviewIncident, i)} className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left cursor-pointer transition-colors ${c.done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-brand-dark/40 border-brand-border hover:border-violet-400/40'}`}>
                          <span className={`text-[10px] font-bold ${c.done ? 'text-emerald-300 line-through' : 'text-gray-200'}`}>{c.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${c.done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{c.done ? 'Done' : 'Mark'}</span>
                        </button>
                      ))}
                    </div>
                    {doneCount === list.length && <p className="text-[9px] text-emerald-400 font-black uppercase mt-2">● Review complete — incident can be closed</p>}
                  </div>
                );
              })()
            )}
          </div>

          {/* Feature request board */}
          <div id="sec-feature-request-board" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-feature-request-board' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Lightbulb className="w-3.5 h-3.5 text-yellow-400" /><span>Feature Request Board ({featureBoard.filter(f => f.status !== 'Shipped').length} open)</span></h3>
              <span className="text-[9px] text-gray-500">{featureBoard.reduce((s, f) => s + f.votes, 0)} total votes</span>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {featureBoard.map(f => (
                <div key={f.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{f.title} <span className="font-mono text-[8px] text-gray-500">({f.id})</span></p>
                    <p className="text-[9px] text-gray-500">from {f.source} · <span className="text-yellow-300 font-black">{f.votes} votes</span></p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${f.status === 'Shipped' ? 'bg-emerald-500/10 text-emerald-400' : f.status === 'Roadmap' ? 'bg-blue-500/10 text-blue-400' : f.status === 'In review' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>{f.status}</span>
                    <button onClick={() => voteFeature(f.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-yellow-300 rounded text-[9px] font-bold cursor-pointer hover:border-yellow-400/50">Vote +1</button>
                    <button onClick={() => cycleFeature(f.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{f.status === 'New' ? 'In review' : f.status === 'In review' ? 'Roadmap' : f.status === 'Roadmap' ? 'Ship' : 'Re-open'}</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Customer and store-sourced ideas with vote counts — high-vote items feed the roadmap. Status changes are audited.</p>
          </div>

          {/* Promo code health */}
          <div id="sec-promo-code-health" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-promo-code-health' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Tag className="w-3.5 h-3.5 text-pink-400" /><span>Promo Code Health ({promos.filter(p => p.status === 'Active').length} active)</span></h3>
              <span className="text-[9px] text-gray-500">Redemptions vs cap live</span>
            </div>
            <div className="space-y-1.5">
              {promos.map(p => {
                const pct = Math.min(100, Math.round(p.redemptions / p.cap * 100));
                return (
                  <div key={p.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <p className="text-[10px] font-bold text-white"><span className="font-mono text-pink-300">{p.code}</span> <span className="text-[8px] text-gray-500">· {p.type}</span></p>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.status === 'Expired' ? 'bg-gray-500/10 text-gray-400' : p.status === 'Paused' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{p.status}</span>
                        {p.status === 'Active' && <button onClick={() => togglePromo(p.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-amber-300 rounded text-[9px] font-bold cursor-pointer hover:border-amber-400/50">Pause</button>}
                        {p.status === 'Paused' && <button onClick={() => togglePromo(p.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-emerald-300 rounded text-[9px] font-bold cursor-pointer hover:border-emerald-400/50">Resume</button>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-gray-500/60' : pct >= 80 ? 'bg-amber-500/70' : 'bg-emerald-500/70'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] text-gray-400 font-mono">{p.redemptions}/{p.cap}</span>
                      <span className="text-[9px] text-gray-500 font-mono">{p.budget} / {p.budgetCap}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Codes near cap can silently fail at checkout — pause before budget runs out. Expired codes show in the store but error on apply.</p>
          </div>

          {/* Integration / vendor registry */}
          <div id="sec-integration-vendor-registry" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-integration-vendor-registry' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Package className="w-3.5 h-3.5 text-indigo-400" /><span>Integration / Vendor Registry ({INTEGRATIONS.length})</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-2">
              {INTEGRATIONS.map(ig => {
                const st = integrations[ig.name] || { status: 'Connected', lastSync: nowTime(), note: 'Healthy' };
                return (
                  <div key={ig.name} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[10px] font-bold text-white">{ig.name}</p>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${st.status === 'Connected' ? 'bg-emerald-500/10 text-emerald-400' : st.status === 'Degraded' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{st.status}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">{ig.endpoint} · {ig.owner} · {ig.area}</p>
                    <p className="text-[9px] text-gray-500">Last check: {st.lastSync} · <span className={st.status === 'Connected' ? 'text-emerald-400' : st.status === 'Degraded' ? 'text-amber-400' : 'text-red-400'}>{st.note}</span></p>
                    <div className="flex items-center space-x-1.5 mt-1.5">
                      <button onClick={() => testIntegration(ig.name)} className="px-2 py-1 bg-brand-dark border border-brand-border text-cyan-300 rounded text-[9px] font-bold cursor-pointer hover:border-cyan-400/50">Test</button>
                      <button onClick={() => cycleIntegration(ig.name)} className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer border ${st.status === 'Down' ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{st.status === 'Down' ? 'Restore' : st.status === 'Degraded' ? 'Mark Down' : 'Flag Degraded'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Click Test to run a health check (logs to audit), or flag a vendor degraded / down.</p>
          </div>

          {/* Vendor outage runbook */}
          <div id="sec-vendor-outage-runbook" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-vendor-outage-runbook' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><BookOpenCheck className="w-3.5 h-3.5 text-sky-400" /><span>Vendor Outage Runbook</span></h3>
              <span className="text-[9px] text-gray-500">Step-by-step recovery playbook per vendor</span>
            </div>
            <div className="space-y-1.5">
              {runbook.map(rb => (
                <div key={rb.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <p className="text-[10px] font-bold text-white">{rb.vendor} <span className="text-[8px] text-gray-500">· {rb.scope}</span></p>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${rb.status === 'Drilling' ? 'bg-amber-500/10 text-amber-400' : rb.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{rb.status}</span>
                      <button onClick={() => toggleRunbook(rb.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{rb.status === 'Ready' ? 'Start drill' : rb.status === 'Drilling' ? 'Mark resolved' : 'Reset'}</button>
                    </div>
                  </div>
                  <ol className="space-y-0.5 mt-1">
                    {rb.steps.map((s, i) => (
                      <li key={i} className="text-[9px] text-gray-400 flex gap-1.5"><span className="text-brand-orange font-black shrink-0">{i + 1}.</span><span>{s}</span></li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Run the drill during an actual outage to stay calm and consistent — completing every step is audited.</p>
          </div>

          {/* SMS & push balance */}
          <div id="sec-sms-push-balance" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-sms-push-balance' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Inbox className="w-3.5 h-3.5 text-cyan-400" /><span>SMS & Push Balance Monitor</span></h3>
              <button onClick={simulateUsage} className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-cyan-600/30">Simulate Usage</button>
            </div>
            <div className="space-y-2">
              {smsBal.map(s => {
                const rem = s.quota - s.used;
                const pct = Math.round(rem / s.quota * 100);
                return (
                  <div key={s.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-white">{s.vendor} <span className="text-gray-500 font-normal">· {s.channel}</span></p>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${pct < 15 ? 'bg-red-500/10 text-red-400' : pct < 35 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{rem.toLocaleString()} left ({pct}%)</span>
                    </div>
                    <div className="flex-1 h-2 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden mt-1.5">
                      <div className={`h-full rounded-full ${pct < 15 ? 'bg-red-500/70' : pct < 35 ? 'bg-amber-500/70' : 'bg-emerald-500/70'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">{s.used.toLocaleString()} / {s.quota.toLocaleString()} used · resets {s.resets}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Live quota for OTP/push channels — red means top-up needed soon (below 15%).</p>
          </div>

          {/* SMS / notification template library */}
          <div id="sec-sms-notification-template-library" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-sms-notification-template-library' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><BellRing className="w-3.5 h-3.5 text-sky-400" /><span>SMS / Notification Template Library ({smsTpls.length})</span></h3>
              <span className="text-[9px] text-gray-500">Edit any template — saved to audit</span>
            </div>
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {smsTpls.map(t => (
                <div key={t.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <p className="text-[10px] font-bold text-white">{t.name} <span className="text-[8px] text-gray-500">· {t.channel}</span></p>
                    <span className="text-[8px] text-gray-600">updated {t.updated}</span>
                  </div>
                  <textarea
                    value={t.body}
                    onChange={(e) => editSmsTpl(t.id, e.target.value)}
                    className="w-full bg-brand-dark/60 border border-brand-border rounded-lg px-2.5 py-1.5 text-[10px] text-gray-200 outline-none focus:border-sky-400/50 resize-y min-h-[42px] font-mono"
                  />
                  <p className="text-[8px] text-gray-600">Placeholders: {'{otp}'} {'{name}'} {'{order}'} {'{store}'} {'{driver}'} — SMS length {t.body.length} chars</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Live OTP and alert templates for bKash/Nagad/Rocket routes — edits update instantly and are captured in the audit trail.</p>
          </div>

          {/* Push notification broadcast center */}
          <div id="sec-push-notification-broadcast-center" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-push-notification-broadcast-center' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Megaphone className="w-3.5 h-3.5 text-pink-400" /><span>Push Broadcast Center ({broadcasts.length} sent)</span></h3>
              <span className="text-[9px] text-gray-500">Sent · Delivered · Opened tracking</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={bcForm.audience} onChange={(e) => setBcForm(f => ({ ...f, audience: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {Object.keys(AUDIENCE_TOTALS).map(a => <option key={a} value={a}>{a} ({AUDIENCE_TOTALS[a].toLocaleString()})</option>)}
              </select>
              <input type="text" value={bcForm.title} onChange={(e) => setBcForm(f => ({ ...f, title: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') sendBroadcast(); }} placeholder="Broadcast title, e.g. New slot booking!" className="flex-1 min-w-[180px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={bcForm.when} onChange={(e) => setBcForm(f => ({ ...f, when: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="Now">Send now</option>
                <option value="Tomorrow 10:00">Tomorrow 10:00</option>
                <option value="Sat 09:00">Sat 09:00</option>
              </select>
              <button onClick={sendBroadcast} className="px-3.5 py-1.5 bg-pink-600/20 border border-pink-500/40 text-pink-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-pink-600/30">Send Broadcast</button>
            </div>
            <input type="text" value={bcForm.body} onChange={(e) => setBcForm(f => ({ ...f, body: e.target.value }))} placeholder="Body (optional)…" className="w-full mb-3 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {broadcasts.map(b => (
                <div key={b.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[10px] font-bold text-white">{b.title} <span className="font-mono text-[9px] text-gray-500">({b.id})</span></p>
                    <span className="text-[8px] text-gray-500">{b.audience} · {b.scheduled}</span>
                  </div>
                  <p className="text-[9px] text-gray-500">{b.body}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 h-1.5 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500/70 rounded-full" style={{ width: `${Math.round(b.delivered / b.sent * 100)}%` }} />
                    </div>
                    <span className="text-[8px] font-mono text-gray-400 shrink-0">delivered {b.delivered.toLocaleString()}/{b.sent.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-1.5 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${Math.round(b.opened / b.delivered * 100)}%` }} />
                    </div>
                    <span className="text-[8px] font-mono text-gray-400 shrink-0">opened {b.opened.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Compose once, broadcast to a whole segment. Delivery/opens are simulated per audience size.</p>
          </div>

          {/* Certificates & contracts */}
          <div id="sec-certificates-contracts" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-certificates-contracts' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><KeyRound className="w-3.5 h-3.5 text-lime-400" /><span>Certificates & Contract Expiry</span></h3>
              <span className={`text-[9px] font-black uppercase ${certs.filter(c => c.days < 30).length === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{certs.filter(c => c.days < 30).length} expiring {'<'} 30d</span>
            </div>
            <div className="space-y-1.5">
              {certs.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{c.item} <span className="text-[8px] text-gray-500">· {c.type} · owner {c.owner}</span></p>
                    <p className="text-[9px] text-gray-500">Expires <span className={`font-black ${c.days < 30 ? 'text-red-400' : c.days < 90 ? 'text-amber-400' : 'text-emerald-400'}`}>{c.expires}</span> · <span className={c.days < 30 ? 'text-red-400 font-black' : 'text-gray-300'}>{c.days} day(s) left</span></p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${c.days < 30 ? 'bg-red-500/10 text-red-400' : c.days < 90 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{c.days < 30 ? 'Urgent' : c.days < 90 ? 'Soon' : 'Healthy'}</span>
                    <button onClick={() => logRenewal(c.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Log Renewal</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">SSL certs, gateway API keys and vendor contracts — red items are under 30 days from expiry.</p>
          </div>

          {/* API request monitor */}
          <div id="sec-api-request-monitor" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-api-request-monitor' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /><span>API Request Monitor</span></h3>
              <button onClick={refreshApiLog} className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-emerald-600/30">Sample Traffic</button>
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {apiLog.map((l, i) => (
                <div key={i} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 border ${l.status >= 500 ? 'bg-red-500/5 border-red-500/25' : 'bg-brand-dark/40 border-brand-border'}`}>
                  <div className="min-w-0 flex items-center space-x-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${l.method === 'GET' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{l.method}</span>
                    <span className="font-mono text-[9px] text-gray-300 truncate">{l.endpoint}</span>
                    <span className="text-[8px] text-gray-600 hidden sm:inline">· {l.source}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-[9px] font-mono font-black ${l.status >= 500 ? 'text-red-400' : l.status >= 400 ? 'text-amber-400' : 'text-emerald-400'}`}>{l.status}</span>
                    <span className={`text-[8px] font-mono ${l.ms > 800 ? 'text-red-400' : l.ms > 300 ? 'text-amber-400' : 'text-gray-500'}`}>{l.ms}ms</span>
                    <span className="text-[8px] text-gray-600 font-mono">{l.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Sampled SD API calls — red rows are 5xx failures with slow latency.</p>
          </div>

          {/* Rate limit config */}
          <div id="sec-rate-limit-config" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-rate-limit-config' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Gauge className="w-3.5 h-3.5 text-yellow-400" /><span>Rate Limit & Throttle Config ({rateLimits.filter(r => r.enforce).length}/{rateLimits.length} enforced)</span></h3>
              <span className="text-[9px] text-gray-500">Adjust limits or bypass per endpoint</span>
            </div>
            <div className="space-y-1.5">
              {rateLimits.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold text-white truncate">{r.endpoint}</p>
                    <p className="text-[9px] text-gray-500">limit <span className="text-yellow-300 font-black">{r.limit}</span> {r.window}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <div className="flex items-center space-x-1 border border-brand-border rounded-lg bg-brand-dark px-1 py-0.5">
                      <button onClick={() => adjustLimit(r.id, -10)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[11px] font-bold">−</button>
                      <span className="text-[9px] font-mono font-black text-white w-7 text-center">{r.limit}</span>
                      <button onClick={() => adjustLimit(r.id, 10)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[11px] font-bold">+</button>
                    </div>
                    <button onClick={() => toggleRateLimit(r.id)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors ${r.enforce ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>{r.enforce ? 'Enforced' : 'Bypassed'}</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Login and OTP endpoints are hardened; toggling enforcement or changing limits is audited.</p>
          </div>

          {/* API latency monitor */}
          <div id="sec-api-latency-monitor" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-api-latency-monitor' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Activity className="w-3.5 h-3.5 text-purple-400" /><span>API Latency Monitor</span></h3>
              <div className="flex items-center space-x-2">
                {latencySpike && <span className="text-[9px] text-red-400 font-bold">Spike on {latencySpike.label} at {latencySpike.time}</span>}
                <button onClick={() => simulateSpike('checkout')} className="px-3 py-1.5 bg-red-600/20 border border-red-500/40 text-red-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-red-600/30">Simulate spike</button>
              </div>
            </div>
            {[
              { ep: '/api/orders/place', p95: 540, err: 0.8, ok: 240, note: 'checkout flow' },
              { ep: '/api/payments/charge', p95: latencySpike && latencySpike.label === 'checkout' ? 4100 : 860, err: latencySpike && latencySpike.label === 'checkout' ? 4.2 : 1.1, ok: 410, note: 'bKash / card gateway' },
              { ep: '/api/drivers/locate', p95: 320, err: 0.4, ok: 140, note: 'GPS push' },
              { ep: '/api/orders/track', p95: 190, err: 0.2, ok: 95, note: 'customer tracking' },
              { ep: '/api/stores/menu', p95: 460, err: 1.3, ok: 210, note: 'catalog + photos' }
            ].map(a => {
              const hot = a.p95 > 2000 || a.err > 3;
              return (
                <div key={a.ep} className="flex items-center gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-[9px] text-cyan-300 w-48 shrink-0">{a.ep}</span>
                  <div className="flex-1 min-w-[100px] h-2 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${hot ? 'bg-red-500/80' : a.p95 > 700 ? 'bg-amber-500/70' : 'bg-emerald-500/70'}`} style={{ width: `${Math.min(100, a.p95 / 4000 * 100)}%` }} />
                  </div>
                  <span className={`text-[9px] font-mono font-black w-12 text-right ${hot ? 'text-red-400' : a.p95 > 700 ? 'text-amber-300' : 'text-emerald-300'}`}>{a.p95}ms</span>
                  <span className={`text-[8px] font-mono w-12 text-right ${a.err > 3 ? 'text-red-400' : a.err > 1 ? 'text-amber-300' : 'text-gray-400'}`}>{a.err}% err</span>
                  <span className="text-[8px] text-gray-500 w-24 text-right">{a.note}</span>
                </div>
              );
            })}
            <p className="text-[9px] text-gray-600 mt-2">p95 latency + error rate per endpoint. Red endpoints map to checkout and payment failures — the auto-diagnosis playbook shows the next action.</p>
          </div>

          {/* Webhook delivery monitor */}
          <div id="sec-webhook-delivery-monitor" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-webhook-delivery-monitor' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Webhook className="w-3.5 h-3.5 text-purple-400" /><span>Webhook Delivery Monitor ({webhooks.filter(w => w.status !== 'Success').length} pending)</span></h3>
              <button onClick={simulateWebhook} className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/40 text-purple-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-purple-600/30">Simulate Delivery</button>
            </div>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {webhooks.length === 0 ? (
                <p className="text-[10px] text-gray-500">No webhook deliveries recorded yet — simulate one to see the queue.</p>
              ) : (
                webhooks.map(w => (
                  <div key={w.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 border ${w.status === 'Failed' ? 'bg-red-500/5 border-red-500/25' : w.status === 'Retrying' ? 'bg-amber-500/5 border-amber-500/25' : 'bg-brand-dark/40 border-brand-border'}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white"><span className="font-mono text-brand-orange">{w.event}</span> <span className="text-gray-500 font-normal">→ {w.target}</span> <span className="font-mono text-[8px] text-gray-600">({w.id})</span></p>
                      <p className="font-mono text-[8px] text-gray-500 truncate">{w.payload} · {w.attempts} attempt(s) · {w.time}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${w.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400' : w.status === 'Retrying' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{w.status}</span>
                      {w.status !== 'Success' && <button onClick={() => retryWebhook(w.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Retry</button>}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Tracks outbound webhook events (order.created, payment.verified, delivery.confirmed). Retry re-delivers and records attempts.</p>
          </div>

          {/* Database backup center */}
          <div id="sec-database-backup-center" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-database-backup-center' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Database className="w-3.5 h-3.5 text-cyan-400" /><span>Database Backup Center</span></h3>
              <span className={`text-[9px] font-black uppercase ${backups.every(b => b.status === 'Success') ? 'text-emerald-400' : 'text-red-400'}`}>{backups.filter(b => b.status === 'Success').length}/{backups.length} healthy</span>
            </div>
            <div className="space-y-1.5">
              {backups.map(b => (
                <div key={b.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{b.db} <span className="font-mono text-[9px] text-gray-500">({b.id})</span></p>
                    <p className="text-[9px] text-gray-500">Last: {b.last} · {b.size} · retention {b.retention}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${b.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{b.status}</span>
                    <button onClick={() => runBackup(b.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Run Backup Now</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Nightly automated snapshots — manual backups refresh the last-run time and are audited.</p>
          </div>

          {/* CDN / cache hit monitor */}
          <div id="sec-cdn-cache-hit-monitor" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-cdn-cache-hit-monitor' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Cpu className="w-3.5 h-3.5 text-fuchsia-400" /><span>CDN / Cache Hit Monitor</span></h3>
              <span className="text-[9px] text-gray-500">Hit ratio per layer</span>
            </div>
            <div className="space-y-1.5">
              {cdn.map(c => (
                <div key={c.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] font-bold text-white">{c.layer} <span className="text-[8px] text-gray-500">· {c.note}</span></p>
                    <button onClick={() => purgeLayer(c.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-fuchsia-300 rounded text-[9px] font-bold cursor-pointer hover:border-fuchsia-400/50 shrink-0">Purge</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.hit >= 97 ? 'bg-emerald-500/70' : c.hit >= 92 ? 'bg-amber-500/70' : 'bg-red-500/70'}`} style={{ width: `${c.hit}%` }} />
                    </div>
                    <span className={`text-[9px] font-mono font-black w-10 text-right ${c.hit >= 97 ? 'text-emerald-300' : c.hit >= 92 ? 'text-amber-300' : 'text-red-400'}`}>{c.hit}%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Low hit ratio = slow loads and gateway retries. Purge resets to 100% (cold start) then warms — use during deployments, not peak hours.</p>
          </div>

          {/* Search index & catalog sync */}
          <div id="sec-search-index-catalog-sync" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-search-index-catalog-sync' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><RotateCw className="w-3.5 h-3.5 text-teal-400" /><span>Search Index & Catalog Sync</span></h3>
              <span className={`text-[9px] font-black uppercase ${searchIdx.filter(s => s.pending > 0).length === 0 ? 'text-emerald-400' : 'text-teal-400'}`}>{searchIdx.filter(s => s.pending > 0).length} store(s) with pending docs</span>
            </div>
            <div className="space-y-1.5">
              {searchIdx.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{s.store} <span className="font-mono text-[9px] text-gray-500">({s.id})</span></p>
                    <p className="text-[9px] text-gray-500">{s.docs.toLocaleString()} docs indexed · <span className={s.pending > 0 ? 'text-amber-400 font-black' : 'text-gray-300'}>{s.pending} pending</span> · last sync {s.lastSync}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'Synced' ? 'bg-emerald-500/10 text-emerald-400' : s.status === 'Syncing' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>{s.status}</span>
                    <button onClick={() => reindex(s.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-teal-300 rounded text-[9px] font-bold cursor-pointer hover:border-teal-400/50">Reindex Now</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Catalog → search pipeline status per store. Stale or pending docs mean search results lag behind menu updates.</p>
          </div>

          {/* Store panel connection health */}
          <div id="sec-store-panel-connection-health" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-store-panel-connection-health' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span>Store Panel Connection Health ({storeHealth.filter(s => s.status === 'Online').length}/{storeHealth.length} online)</span></h3>
              <span className="text-[9px] text-gray-500">Heartbeat per store panel</span>
            </div>
            <div className="space-y-1.5">
              {storeHealth.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{s.store} <span className="font-mono text-[8px] text-gray-500">({s.id})</span> · <span className="text-gray-400">{s.version}</span></p>
                    <p className="text-[9px] text-gray-500">last heartbeat {s.heartbeat}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400' : s.status === 'Offline' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{s.status}</span>
                    <button onClick={() => pingStore(s.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-emerald-300 rounded text-[9px] font-bold cursor-pointer hover:border-emerald-400/50">Ping</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Offline panels can't push catalog syncs or confirm orders — ping reconnects and is audited.</p>
          </div>

          {/* Store menu health */}
          <div id="sec-store-menu-health" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-store-menu-health' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Utensils className="w-3.5 h-3.5 text-orange-400" /><span>Store Menu Health Score</span></h3>
              <button onClick={recheckMenus} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-brand-orange rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:border-brand-orange/50">Recheck all</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { store: 'S-01', name: 'Sultans Dine', score: 96, note: 'menu complete', items: 84, photos: 82, stale: 1 },
                { store: 'S-02', name: 'Kacchi Bhai', score: 88, note: 'ok', items: 61, photos: 57, stale: 2 },
                { store: 'S-07', name: 'Star Kabab', score: 71, note: '15 items missing photos', items: 58, photos: 43, stale: 6 },
                { store: 'S-12', name: 'Pizza Palace', score: 64, note: '12 stale stock entries', items: 72, photos: 64, stale: 12 }
              ].map(m => (
                <div key={m.store} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <p className="text-[10px] font-bold text-white">{m.name} <span className="font-mono text-[8px] text-gray-500">({m.store})</span></p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${m.score >= 85 ? 'bg-emerald-500/10 text-emerald-400' : m.score >= 75 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{m.score}/100</span>
                  </div>
                  <p className="text-[9px] text-gray-500">{m.items} items · {m.photos} with photos · {m.stale} stale · <span className={m.score >= 85 ? 'text-emerald-400' : m.score < 75 ? 'text-red-400' : 'text-amber-400'}>{m.note}</span></p>
                  <div className="flex-1 h-1.5 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden mt-1.5">
                    <div className={`h-full rounded-full ${m.score >= 85 ? 'bg-emerald-500/70' : m.score >= 75 ? 'bg-amber-500/70' : 'bg-red-500/70'}`} style={{ width: `${m.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Menu completeness (items + photos + stock freshness) drives orders. Red stores should be told to refresh photos — that usually fixes "item unavailable".</p>
          </div>

          {/* Offline sync queue */}
          <div id="sec-offline-sync-queue" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-offline-sync-queue' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><RefreshCw className="w-3.5 h-3.5 text-cyan-400" /><span>Offline Sync / Pending Queue ({offlineQ.filter(q => q.pending > 0).length} queues)</span></h3>
              <span className={`text-[9px] font-black uppercase ${offlineQ.reduce((s, q) => s + q.pending, 0) === 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>{offlineQ.reduce((s, q) => s + q.pending, 0)} pending upload(s)</span>
            </div>
            <div className="space-y-1.5">
              {offlineQ.map(q => (
                <div key={q.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{q.source} <span className="font-mono text-[8px] text-gray-500">({q.id})</span></p>
                    <p className="text-[9px] text-gray-500">{q.pending} pending · {q.note}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.pending === 0 ? 'bg-emerald-500/10 text-emerald-400' : q.status === 'Syncing' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>{q.pending === 0 ? 'Synced' : q.status}</span>
                    {q.pending > 0 && <button onClick={() => syncOffline(q.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Sync now</button>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Items queued while offline (store panel, driver app, POS) — force a sync when connectivity returns.</p>
          </div>

          {/* DR readiness */}
          <div id="sec-dr-readiness" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-dr-readiness' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><ShieldCheck className="w-3.5 h-3.5 text-red-400" /><span>Recovery / DR Readiness</span></h3>
              <span className={`text-[9px] font-black uppercase ${drDrills.every(d => d.status === 'Ready') ? 'text-emerald-400' : 'text-red-400'}`}>{drDrills.filter(d => d.status === 'Ready').length}/{drDrills.length} ready</span>
            </div>
            <div className="space-y-1.5">
              {drDrills.map(d => (
                <div key={d.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{d.tier} <span className="font-mono text-[9px] text-gray-500">({d.id})</span></p>
                    <p className="text-[9px] text-gray-500">RPO <span className="text-gray-300 font-bold">{d.rpo}</span> · RTO <span className="text-gray-300 font-bold">{d.rto}</span> · last drill {d.lastDrill}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${d.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-400' : d.status === 'At risk' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{d.status}</span>
                    <button onClick={() => simulateFailover(d.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-red-400 rounded text-[9px] font-bold cursor-pointer hover:border-red-500/50">Simulate Failover</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">RPO/RTO targets per data tier. Running a failover drill refreshes the last-drill date, restores Ready status and logs to audit.</p>
          </div>

          {/* Alert rules */}
          <div id="sec-alert-rules" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-alert-rules' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Bell className="w-3.5 h-3.5 text-rose-400" /><span>Alert Rules ({alertRules.filter(r => r.enabled).length}/{alertRules.length} active)</span></h3>
            <div className="space-y-1.5">
              {alertRules.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{r.rule} <span className="font-mono text-[9px] text-gray-500">({r.id})</span></p>
                    <p className="text-[9px] text-gray-500">Action: {r.action}</p>
                  </div>
                  <button onClick={() => toggleAlertRule(r.id)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors ${r.enabled ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>{r.enabled ? 'Active' : 'Off'}</button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Toggle automated alerting behaviour — every change is audited.</p>
          </div>

          {/* Security & compliance center */}
          <div id="sec-security-compliance-center" className={`bg-brand-card border border-brand-border rounded-xl p-4 space-y-3 ${activeTechSection === 'sec-security-compliance-center' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /><span>Security &amp; Compliance Center</span></h3>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-black ${securityScore >= 85 ? 'text-emerald-400' : securityScore >= 65 ? 'text-amber-400' : 'text-red-400'}`}>Score {securityScore}/100</span>
                <button onClick={runSecurityScan} className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-emerald-600/30">Run Scan</button>
              </div>
            </div>
            <div className="w-full bg-brand-dark/40 border border-brand-border rounded-lg h-2 overflow-hidden">
              <div className={`h-full rounded-r ${securityScore >= 85 ? 'bg-emerald-500' : securityScore >= 65 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${securityScore}%` }} />
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {securityEvents.map((ev, i) => (
                <div key={i} className="flex items-start justify-between gap-2 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white flex items-center space-x-1.5"><span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${ev.severity === 'Critical' ? 'bg-red-500/10 text-red-400' : ev.severity === 'High' ? 'bg-orange-500/10 text-orange-400' : ev.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{ev.severity}</span><span>{ev.type}</span></p>
                    <p className="text-[9px] text-gray-500 mt-0.5">{ev.detail}</p>
                  </div>
                  <span className="text-[8px] text-gray-600 font-mono shrink-0">{ev.time}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600">Score is recomputed from blocked users, open incidents and grade-C drivers. Events are demo-monitored for this build.</p>
          </div>

          {/* Session & access monitor */}
          <div id="sec-session-access-monitor" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-session-access-monitor' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Monitor className="w-3.5 h-3.5 text-indigo-400" /><span>Session & Access Monitor ({sessions.filter(s => s.status === 'Active').length} active)</span></h3>
              <span className="text-[9px] text-gray-500">Revoke any suspicious session</span>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {sessions.map(s => (
                <div key={s.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border ${s.status === 'Active' ? 'bg-brand-dark/40 border-brand-border' : 'bg-brand-dark/40 border-brand-border opacity-60'}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{s.user} <span className="text-[8px] text-gray-500">· {s.role}</span></p>
                    <p className="text-[9px] text-gray-500 font-mono">{s.ip} · {s.device} · last {s.last}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{s.status}</span>
                    {s.status === 'Active' && <button onClick={() => revokeSession(s.id)} className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[9px] font-bold cursor-pointer hover:bg-red-500/20">Revoke</button>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Every admin/store session with IP and device. Revoking force-logs-out and writes to the audit trail.</p>
          </div>

          {/* IP allowlist */}
          <div id="sec-ip-allowlist" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-ip-allowlist' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Lock className="w-3.5 h-3.5 text-cyan-400" /><span>IP Allowlist / Access Control</span></h3>
              <span className="text-[9px] text-gray-500">{allowlist.filter(a => a.enabled).length}/{allowlist.length} rules active</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={allowForm.target} onChange={(e) => setAllowForm(f => ({ ...f, target: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="Store Panel">Store Panel</option>
                <option value="Admin Console">Admin Console</option>
              </select>
              <input type="text" value={allowForm.ip} onChange={(e) => setAllowForm(f => ({ ...f, ip: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addAllow(); }} placeholder="CIDR, e.g. 103.67.15.0/24" className="flex-1 min-w-[160px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <input type="text" value={allowForm.note} onChange={(e) => setAllowForm(f => ({ ...f, note: e.target.value }))} placeholder="Note, e.g. Gazipur office" className="flex-1 min-w-[140px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <button onClick={addAllow} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Add Rule</button>
            </div>
            <div className="space-y-1.5">
              {allowlist.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold text-white">{a.ip} <span className="text-[8px] text-gray-500">· {a.target}</span></p>
                    <p className="text-[9px] text-gray-500">{a.note}</p>
                  </div>
                  <button onClick={() => toggleAllow(a.id)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors ${a.enabled ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>{a.enabled ? 'Allowed' : 'Blocked'}</button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Only these subnets can reach the Store Panel / Admin Console. Disabling a rule blocks access from that range.</p>
            <div className="border-t border-brand-border mt-3 pt-3">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <h4 className="text-[10px] font-black uppercase text-gray-300 tracking-wider flex items-center space-x-1.5"><KeyRound className="w-3.5 h-3.5 text-brand-orange" /><span>Screen & App Lock System</span></h4>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${lockCfg.masterEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{lockCfg.masterEnabled ? '● Lock enforced' : '○ Lock disabled'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-2">
                <div className={`bg-brand-dark/40 border rounded-lg px-3 py-2 ${lockCfg.pinEnabled ? 'border-brand-border' : 'border-brand-border opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-gray-300 flex items-center space-x-1"><KeyRound className="w-3 h-3 text-cyan-400" /><span>PIN Lock</span></p>
                    <button onClick={() => toggleLock('pinEnabled')} className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${lockCfg.pinEnabled ? 'bg-emerald-500/60' : 'bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${lockCfg.pinEnabled ? 'left-3.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {lockCfg.pinEnabled && (
                    <div className="flex items-center justify-between mt-1.5">
                      <button onClick={() => stepLock('pinLen', -1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">−</button>
                      <span className="font-mono text-[10px] font-bold text-white">{lockCfg.pinLen} digits</span>
                      <button onClick={() => stepLock('pinLen', 1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">+</button>
                    </div>
                  )}
                </div>
                <div className={`bg-brand-dark/40 border rounded-lg px-3 py-2 ${lockCfg.passcodeEnabled ? 'border-brand-border' : 'border-brand-border opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-gray-300 flex items-center space-x-1"><Lock className="w-3 h-3 text-violet-400" /><span>Passcode Lock</span></p>
                    <button onClick={() => toggleLock('passcodeEnabled')} className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${lockCfg.passcodeEnabled ? 'bg-emerald-500/60' : 'bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${lockCfg.passcodeEnabled ? 'left-3.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {lockCfg.passcodeEnabled && (
                    <div className="flex items-center justify-between mt-1.5">
                      <button onClick={() => stepLock('passcodeLen', -1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">−</button>
                      <span className="font-mono text-[10px] font-bold text-white">{lockCfg.passcodeLen} chars</span>
                      <button onClick={() => stepLock('passcodeLen', 1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">+</button>
                    </div>
                  )}
                </div>
                <div className={`bg-brand-dark/40 border rounded-lg px-3 py-2 ${lockCfg.faceEnabled ? 'border-brand-border' : 'border-brand-border opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-gray-300 flex items-center space-x-1"><ScanFace className="w-3 h-3 text-teal-400" /><span>Face Lock</span></p>
                    <button onClick={() => toggleLock('faceEnabled')} className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${lockCfg.faceEnabled ? 'bg-emerald-500/60' : 'bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${lockCfg.faceEnabled ? 'left-3.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {lockCfg.faceEnabled && (
                    <div className="flex items-center justify-between mt-1.5">
                      <button onClick={() => stepLock('faceConfidence', -1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">−</button>
                      <span className="font-mono text-[10px] font-bold text-white">{lockCfg.faceConfidence}% match</span>
                      <button onClick={() => stepLock('faceConfidence', 1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">+</button>
                    </div>
                  )}
                </div>
                <div className={`bg-brand-dark/40 border rounded-lg px-3 py-2 ${lockCfg.passwordEnabled ? 'border-brand-border' : 'border-brand-border opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-gray-300 flex items-center space-x-1"><Fingerprint className="w-3 h-3 text-amber-400" /><span>Password Lock</span></p>
                    <button onClick={() => toggleLock('passwordEnabled')} className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${lockCfg.passwordEnabled ? 'bg-emerald-500/60' : 'bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${lockCfg.passwordEnabled ? 'left-3.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {lockCfg.passwordEnabled && (
                    <div className="flex items-center justify-between mt-1.5">
                      <button onClick={() => stepLock('passwordLen', -1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">−</button>
                      <span className="font-mono text-[10px] font-bold text-white">{lockCfg.passwordLen} chars</span>
                      <button onClick={() => stepLock('passwordLen', 1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">+</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex items-center justify-between">
                  <p className="text-[9px] text-gray-500">Auto-lock after</p>
                  <div className="flex items-center space-x-1.5">
                    <button onClick={() => stepLock('autoLockMin', -1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">−</button>
                    <span className="font-mono text-[10px] font-bold text-white">{lockCfg.autoLockMin} min</span>
                    <button onClick={() => stepLock('autoLockMin', 1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">+</button>
                  </div>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex items-center justify-between">
                  <p className="text-[9px] text-gray-500">Max failed attempts</p>
                  <div className="flex items-center space-x-1.5">
                    <button onClick={() => stepLock('maxAttempts', -1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">−</button>
                    <span className="font-mono text-[10px] font-bold text-white">{lockCfg.maxAttempts}</span>
                    <button onClick={() => stepLock('maxAttempts', 1)} className="px-1.5 text-gray-400 hover:text-white cursor-pointer text-[12px] font-bold">+</button>
                  </div>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex items-center justify-between">
                  <p className="text-[9px] text-gray-500">Master lock</p>
                  <button onClick={() => toggleLock('masterEnabled')} className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${lockCfg.masterEnabled ? 'bg-emerald-500/60' : 'bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${lockCfg.masterEnabled ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-gray-600 mt-2">{lockCfg.masterEnabled ? `After ${lockCfg.autoLockMin} min idle the app re-locks. Unlock requires ${[lockCfg.pinEnabled && 'PIN', lockCfg.passcodeEnabled && 'passcode', lockCfg.faceEnabled && 'face match', lockCfg.passwordEnabled && 'password'].filter(Boolean).join(' or ') || 'no method'} — ${lockCfg.maxAttempts} failed tries locks out the session.` : 'Master lock is off — no screen lock is enforced on any panel.'}</p>
            </div>
            <div className="border-t border-brand-border mt-3 pt-3">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <h4 className="text-[10px] font-black uppercase text-gray-300 tracking-wider flex items-center space-x-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /><span>Admin Access Rights</span></h4>
                <div className="flex items-center space-x-1.5">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${superAdmin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{superAdmin ? 'Super Admin' : 'Restricted'}</span>
                  <button onClick={toggleSuperAdmin} className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${superAdmin ? 'bg-emerald-500/60' : 'bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${superAdmin ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
              {superAdmin ? (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <button onClick={grantAllAccess} className="px-3 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-emerald-600/30">Grant Full Access to All</button>
                    <button onClick={setAllReadOnly} className="px-3 py-1 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-gray-600/30">Set Everything Read-Only</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
                    {accessModes.map(m => (
                      <div key={m.id} className={`flex items-center justify-between gap-2 bg-brand-dark/40 border rounded-lg px-3 py-1.5 ${m.level === 'Full' ? 'border-emerald-500/40' : m.level === 'Edit' ? 'border-brand-orange/40' : m.level === 'View' ? 'border-sky-500/40' : 'border-gray-600/40'}`}>
                        <button onClick={() => cycleAccess(m.id)} className="flex items-center justify-between gap-2 flex-1 min-w-0 cursor-pointer" title="Click to cycle None → View → Edit → Full">
                          <span className="text-[9px] font-bold text-gray-200 text-left truncate">{m.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${m.level === 'Full' ? 'bg-emerald-500/10 text-emerald-300' : m.level === 'Edit' ? 'bg-brand-orange/10 text-brand-orange' : m.level === 'View' ? 'bg-sky-500/10 text-sky-300' : 'bg-gray-600/10 text-gray-400'}`}>{m.level}</span>
                        </button>
                        <button onClick={() => removeAccessApp(m.id)} className="p-0.5 text-gray-500 hover:text-red-400 cursor-pointer shrink-0" title="Remove this app from access control">
                          <X className="w-3 h-3" />
                        </button>
                        <button onClick={() => launchApp(m.name)} className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-orange/10 border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/20 cursor-pointer shrink-0" title="Launch this app through the system">
                          <Zap className="w-2.5 h-2.5 inline-block mr-0.5" />Launch
                        </button>
                      </div>
                    ))}
                  </div>
                  {launchedApp && (
                    <div className="mt-2 bg-brand-dark/60 border border-brand-border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-[10px] font-black uppercase text-gray-200 flex items-center space-x-1.5">
                          <Terminal className="w-3.5 h-3.5 text-brand-orange" />
                          <span>{launchedApp.name} — Boot Console</span>
                        </p>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${launchedApp.booted ? (launchedApp.issues.length ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300') : 'bg-sky-500/10 text-sky-300'}`}>
                          {launchedApp.booted ? (launchedApp.issues.length ? 'Opened with issues' : 'Opened — all OK') : 'Booting…'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {launchedApp.steps.map((s, i) => (
                          <div key={i} className={`flex items-center justify-between text-[9px] font-mono ${s.status === 'ok' ? 'text-emerald-400' : s.status === 'warn' ? 'text-amber-400' : s.status === 'running' ? 'text-sky-300' : 'text-gray-600'}`}>
                            <span>{s.label}</span>
                            <span>{s.status === 'ok' ? '✓' : s.status === 'warn' ? '⚠' : s.status === 'running' ? '◌' : '·'}</span>
                          </div>
                        ))}
                      </div>
                      {launchedApp.booted && (
                        <div className="mt-2">
                          {launchedApp.issues.length === 0 ? (
                            <p className="text-[9px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                              <ShieldCheck className="w-3 h-3 inline-block mr-1" />
                              No problems detected — {launchedApp.name} is healthy and ready to use. You are signed in as Super Admin.
                            </p>
                          ) : (
                            <p className="text-[9px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                              <AlertTriangle className="w-3 h-3 inline-block mr-1" />
                              {launchedApp.issues.join(' ')} — App still opened, but check the incident board for details.
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[9px] text-gray-500">Inside {launchedApp.name} now — Dashboard, Orders, Wallet & Help are live.</p>
                            <button onClick={closeLaunch} className="px-3 py-1 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-gray-600/30">Exit App</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <input
                      type="text"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addAccessApp(); }}
                      placeholder="Add any app / system manually, e.g. NexaGo Analytics…"
                      className="flex-1 min-w-[160px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600"
                    />
                    <button onClick={addAccessApp} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[9px] font-bold cursor-pointer transition-colors shrink-0">Add App</button>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-2">Click any module to cycle its access level. Use the box to manually register any extra app or system into access control. Super Admin keeps root access everywhere.</p>
                </>
              ) : (
                <p className="text-[9px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">Super Admin mode is off — this operator currently only has the per-module levels below. Flip the toggle to regain full root access.</p>
              )}
            </div>
          </div>

          <div className="border-t border-brand-border mt-3 pt-3">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <h4 className="text-[10px] font-black uppercase text-gray-300 tracking-wider flex items-center space-x-1.5"><Monitor className="w-3.5 h-3.5 text-rose-400" /><span>Remote Live Screen — real WebRTC session</span></h4>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${realSession.status === 'live' ? 'bg-emerald-500/10 text-emerald-400' : realSession.status === 'waiting' || realSession.status === 'sharing' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {realSession.status === 'live' ? '● LIVE' : realSession.status === 'waiting' ? 'Waiting for user' : realSession.status === 'sharing' ? 'User connected' : realSession.status === 'offline' ? 'Disconnected' : realSession.status === 'error' ? 'Error' : 'No session'}
              </span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
              <div className="xl:col-span-2 space-y-2">
                {realSession.status === 'idle' ? (
                  <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-4 flex flex-col items-center justify-center text-center h-[240px]">
                    <Wifi className="w-8 h-8 text-gray-600 stroke-1 mb-2" />
                    <p className="text-xs font-bold text-gray-300">Start a real remote session</p>
                    <p className="text-[10px] text-gray-500 mt-1">This creates a room code + share link. Send it to the user — they open it in their browser, click Share, and you see their real screen here over WebRTC.</p>
                    <button onClick={startRealSession} className="mt-4 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center space-x-1.5"><Zap className="w-3.5 h-3.5" /><span>Create Session</span></button>
                  </div>
                ) : (
                  <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold text-gray-300">Room</p>
                      <span className="font-mono text-[12px] font-black text-brand-orange tracking-wider">{realSession.code}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-300">Share link</p>
                      <div className="flex items-center space-x-1.5">
                        <input readOnly value={realSession.shareUrl} className="flex-1 min-w-0 bg-brand-dark border border-brand-border rounded-lg px-2 py-1.5 text-[9px] font-mono text-gray-400 outline-none" />
                        <button onClick={copyShareLink} className="px-2 py-1.5 bg-gray-600/20 border border-gray-500/40 text-gray-300 rounded-lg text-[9px] font-bold cursor-pointer hover:bg-gray-600/30 shrink-0">Copy</button>
                      </div>
                      <p className="text-[8px] text-gray-600">Send this link on WhatsApp/Messenger/email — the user taps it in their phone or computer browser and grants access directly. Any device, any network.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-brand-dark/60 border border-brand-border rounded-lg p-2">
                      <div className="bg-white rounded-lg p-1.5 shrink-0">
                        <QRCodeSVG value={realSession.shareUrl} size={76} bgColor="#ffffff" fgColor="#0b0f17" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase text-gray-400">Scan on phone</p>
                        <p className="text-[8px] text-gray-600 mt-0.5">Open camera → point at QR → tap the banner to open the share page directly.</p>
                      </div>
                    </div>
                    <div className="pt-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] text-gray-400">
                        <span>User connected</span>
                        <span className={realSession.status === 'sharing' || realSession.status === 'live' ? 'text-emerald-400 font-bold' : 'text-gray-500'}>{realSession.status === 'sharing' || realSession.status === 'live' ? '● Yes' : 'Not yet'}</span>
                      </div>
                      {peerDevice && (
                        <div className="flex items-center justify-between text-[9px] text-gray-400">
                          <span>Device</span>
                          <span className="text-gray-300">{peerDevice.isMobile ? <Smartphone className="w-3 h-3 inline-block mr-0.5" /> : <Monitor className="w-3 h-3 inline-block mr-0.5" />}{peerDevice.os} · {peerDevice.browser}{peerDevice.isWebView ? ' (in-app browser)' : ''}</span>
                        </div>
                      )}
                      {peerDevice && peerDevice.ua && (
                        <div className="text-[8px] text-gray-600 font-mono leading-tight break-all" title={peerDevice.ua}>UA: {peerDevice.ua}<span className="text-gray-500"> · https: {peerDevice.secure ? 'yes' : 'NO'} · mediaDevices: {peerDevice.mediaDevices ? 'yes' : 'NO'} · getDisplayMedia: {peerDevice.gdm ? 'yes' : 'NO'}</span></div>
                      )}
                      <div className="flex items-center justify-between text-[9px] text-gray-400">
                        <span>Stream</span>
                        <span className={realSession.status === 'live' ? 'text-emerald-400 font-bold' : 'text-gray-500'}>{realSession.status === 'live' ? '● Receiving' : '—'}</span>
                      </div>
                    </div>
                    <button onClick={stopRealSession} className="w-full px-3 py-2 bg-red-500/10 border border-red-500/40 text-red-300 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-red-500/20">End Session</button>
                  </div>
                )}
              </div>
              <div className="xl:col-span-3">
                {realStream ? (
                  <div className="bg-black rounded-lg border border-brand-border overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-brand-dark/80 border-b border-brand-border">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <p className="text-[10px] font-black text-white">Live screen <span className="text-[8px] text-gray-500 font-mono">· room {realSession.code}</span></p>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-rose-500/10 text-rose-300 border border-rose-500/30">● LIVE</span>
                        <span className="px-2 py-0.5 rounded text-[8px] font-mono text-gray-400">{realMode === 'camera' ? 'Camera' : 'WebRTC'}</span>
                        <button onClick={stopRealSession} className="px-2 py-1 rounded text-[8px] font-black uppercase bg-red-500/10 border border-red-500/40 text-red-300 cursor-pointer hover:bg-red-500/20">Exit</button>
                      </div>
                    </div>
                    <div className="relative bg-gradient-to-br from-[#0c1220] to-[#1a2130]">
                      <video ref={realVideoRef} autoPlay playsInline className="w-full h-[260px] object-contain" />
                      <span className="absolute bottom-2 right-3 text-[8px] font-mono text-gray-500">NexaGo Remote • real WebRTC stream • view only</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-8 text-center flex flex-col items-center justify-center h-[260px]">
                    {realSession.status === 'idle' ? (
                      <>
                        <Monitor className="w-8 h-8 text-gray-600 stroke-1 mb-2" />
                        <p className="text-xs font-bold text-gray-300">No live session yet</p>
                        <p className="text-[10px] text-gray-500 mt-1">Create a session, send the link, and once the user shares their screen you will see it here in real time.</p>
                      </>
                    ) : realSession.status === 'live' ? (
                      <>
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                        <p className="text-xs font-bold text-emerald-300">Preparing stream…</p>
                      </>
                    ) : realSession.status === 'offline' ? (
                      <>
                        <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                        <p className="text-xs font-bold text-amber-300">Session disconnected</p>
                        <p className="text-[10px] text-gray-500 mt-1">The connection dropped. Ask the user to reopen the share link, then restart the session.</p>
                        <button onClick={startRealSession} className="mt-4 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">New Session</button>
                      </>
                    ) : realSession.status === 'error' ? (
                      <>
                        <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                        <p className="text-xs font-bold text-red-300">Could not reach the relay</p>
                        <p className="text-[10px] text-gray-500 mt-1">Make sure the relay server is running (npm run relay) on port 3100, then try again.</p>
                        <button onClick={startRealSession} className="mt-4 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Retry</button>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                        <p className="text-xs font-bold text-amber-300">{shareStatus && shareStatus.state === 'unsupported' ? 'Needs Google Chrome' : shareStatus && shareStatus.state === 'error' ? 'Share failed' : 'Waiting for the user…'}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{shareStatus && shareStatus.state !== 'ready' ? shareStatus.message : 'Send the share link to the target device. Once they tap Share Screen, their real screen appears here.'}</p>
                        <p className="text-[10px] text-gray-600 mt-1.5">Important: if the link opens inside WhatsApp/Messenger, the user must tap ⋮ → "Open in Chrome" first — the in-app browser cannot share the screen.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Real end-to-end remote viewing: the relay only passes signaling (SDP/ICE); the video flows peer-to-peer over WebRTC. Browser limits mean this is view-only — full mouse/keyboard control needs the native NexaGo agent.</p>
          </div>

          {/* Password & auth policy */}
          <div id="sec-password-auth-policy" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-password-auth-policy' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Fingerprint className="w-3.5 h-3.5 text-teal-400" /><span>Password & Auth Policy</span></h3>
              <span className={`text-[9px] font-black uppercase ${pwPolicy.minLen >= 8 && pwPolicy.special && pwPolicy.lockout <= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>{pwPolicy.minLen >= 8 && pwPolicy.special && pwPolicy.lockout <= 5 ? '● Strong' : '⚠ Weak'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                <p className="text-[9px] text-gray-500">Min password length</p>
                <div className="flex items-center justify-between mt-1">
                  <button onClick={() => setPolicy('minLen', -1)} className="px-2 text-gray-400 hover:text-white cursor-pointer text-[13px] font-bold">−</button>
                  <span className="font-mono text-lg font-black text-white">{pwPolicy.minLen}</span>
                  <button onClick={() => setPolicy('minLen', 1)} className="px-2 text-gray-400 hover:text-white cursor-pointer text-[13px] font-bold">+</button>
                </div>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                <p className="text-[9px] text-gray-500">Require special chars</p>
                <button onClick={() => { setPwPolicy(prev => ({ ...prev, special: !prev.special })); setTechAudit(prev => [{ action: 'Password policy updated', detail: `require special characters → ${pwPolicy.special ? 'off' : 'on'}`, time: nowTime() }, ...prev]); }} className={`mt-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors ${pwPolicy.special ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>{pwPolicy.special ? 'On' : 'Off'}</button>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                <p className="text-[9px] text-gray-500">Expiry (days)</p>
                <div className="flex items-center justify-between mt-1">
                  <button onClick={() => setPolicy('expireDays', -30)} className="px-2 text-gray-400 hover:text-white cursor-pointer text-[13px] font-bold">−</button>
                  <span className="font-mono text-lg font-black text-white">{pwPolicy.expireDays}</span>
                  <button onClick={() => setPolicy('expireDays', 30)} className="px-2 text-gray-400 hover:text-white cursor-pointer text-[13px] font-bold">+</button>
                </div>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                <p className="text-[9px] text-gray-500">Login lockout (attempts)</p>
                <div className="flex items-center justify-between mt-1">
                  <button onClick={() => setPolicy('lockout', -1)} className="px-2 text-gray-400 hover:text-white cursor-pointer text-[13px] font-bold">−</button>
                  <span className="font-mono text-lg font-black text-white">{pwPolicy.lockout}</span>
                  <button onClick={() => setPolicy('lockout', 1)} className="px-2 text-gray-400 hover:text-white cursor-pointer text-[13px] font-bold">+</button>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Applies to admin, store and support accounts. Every change is versioned in the audit trail.</p>
          </div>

          {/* Data retention policy */}
          <div id="sec-data-retention-policy" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-data-retention-policy' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Trash2 className="w-3.5 h-3.5 text-rose-400" /><span>Data Retention Policy Center</span></h3>
              <span className="text-[9px] text-gray-500">{retention.length} retention rules · compliance</span>
            </div>
            <div className="space-y-1.5">
              {retention.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{r.dataType} <span className="text-[8px] text-gray-500">· keep {r.keepFor} {r.unit}</span></p>
                    <p className="text-[9px] text-gray-500">Next purge <span className="text-rose-300 font-bold">{r.nextPurge}</span> · last purge {r.lastPurge}</p>
                  </div>
                  <button onClick={() => runPurge(r.id)} className="px-2 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded text-[9px] font-bold cursor-pointer hover:bg-rose-500/20">Run Purge</button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Automatic deletion windows per data type — running a purge deletes data older than the keep window and is audited.</p>
          </div>

          {/* Scheduled tech digest */}
          <div id="sec-scheduled-tech-digest" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-scheduled-tech-digest' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><FileText className="w-3.5 h-3.5 text-sky-400" /><span>Scheduled Tech Digest</span></h3>
              <div className="flex items-center space-x-2">
                <select value={digest.cadence} onChange={(e) => setDigest(d => ({ ...d, cadence: e.target.value as 'Daily' | 'Weekly' }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
                <button onClick={() => setDigest(d => ({ ...d, enabled: !d.enabled }))} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors ${digest.enabled ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>{digest.enabled ? 'Enabled' : 'Paused'}</button>
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              {(['health', 'incidents', 'integrations', 'backlog', 'security'] as const).map(s => (
                <button key={s} onClick={() => setDigest(d => ({ ...d, sections: { ...d.sections, [s]: !d.sections[s] } }))} className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left cursor-pointer transition-colors ${digest.sections[s] ? 'bg-brand-dark/40 border-emerald-500/30' : 'bg-brand-dark/40 border-brand-border opacity-60'}`}>
                  <span className="text-[10px] font-bold text-gray-200">{s === 'health' ? 'Health summary' : s === 'incidents' ? 'Open incidents' : s === 'integrations' ? 'Integration / vendor status' : s === 'backlog' ? 'Technical backlog' : 'Security score'}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${digest.sections[s] ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{digest.sections[s] ? 'Included' : 'Excluded'}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setTechAudit(prev => [{ action: 'Test digest sent', detail: `${digest.cadence} digest preview with ${Object.values(digest.sections).filter(Boolean).length} sections → support@nexago.com`, time: nowTime() }, ...prev])} className="px-3.5 py-1.5 bg-sky-600/20 border border-sky-500/40 text-sky-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-sky-600/30">Send Test Digest</button>
            <div className="mt-2 bg-brand-dark/40 border border-brand-border rounded-lg p-3">
              <p className="text-[9px] font-black uppercase text-sky-300 mb-1">Preview — {digest.cadence} digest would include</p>
              <ul className="text-[9px] text-gray-400 space-y-0.5">
                {digest.sections.health && <li>• {Object.keys(health).filter(k => health[k] === 'Issue').length} service(s) down of {Object.keys(health).length}</li>}
                {digest.sections.incidents && <li>• {knownIssues.filter(i => i.status !== 'Resolved').length} open incident(s), {knownIssues.filter(i => i.status !== 'Resolved' && incidentOpenMins(i.time) !== null && incidentOpenMins(i.time)! > slaInfo(i.severity).targetMins).length} SLA breach(es)</li>}
                {digest.sections.integrations && <li>• {Object.keys(integrations).filter(k => integrations[k].status !== 'Connected').length} vendor(s) not fully connected</li>}
                {digest.sections.backlog && <li>• {backlog.filter(b => b.status !== 'Done').length} open backlog task(s)</li>}
                {digest.sections.security && <li>• Security score {securityScore}/100</li>}
              </ul>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Pick which sections go into the {digest.cadence.toLowerCase()} report sent to the support lead. Test digest only simulates the send (audited).</p>
          </div>

          {/* Feature flags / rollout */}
          <div id="sec-feature-flags-rollout" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-feature-flags-rollout' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Zap className="w-3.5 h-3.5 text-yellow-400" /><span>Feature Flags / Rollout ({Object.values(flags).filter(Boolean).length}/{FEATURE_FLAGS.length} on)</span></h3>
              <span className={`text-[9px] font-black uppercase ${Object.values(flags).filter(Boolean).length === FEATURE_FLAGS.length ? 'text-emerald-400' : 'text-yellow-400'}`}>{Math.round(Object.values(flags).filter(Boolean).length / FEATURE_FLAGS.length * 100)}% rollout</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-2">
              {FEATURE_FLAGS.map(f => (
                <div key={f.key} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold text-white">{f.label}</p>
                    <button onClick={() => toggleFlag(f.key)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors shrink-0 ${flags[f.key] ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>{flags[f.key] ? 'On' : 'Off'}</button>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">{f.platform} · {f.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Toggle feature availability per platform — every switch is audited.</p>
          </div>

          {/* Change management */}
          <div id="sec-change-management" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-change-management' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><GitCommit className="w-3.5 h-3.5 text-cyan-400" /><span>Change Management ({changes.length})</span></h3>
              <span className="text-[9px] text-gray-500">{changes.filter(c => c.status === 'Approved').length} approved · {changes.filter(c => c.status === 'Proposed').length} proposed</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <input type="text" value={changeForm.title} onChange={(e) => setChangeForm(f => ({ ...f, title: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addChange(); }} placeholder="Change, e.g. Add pagination to Store Panel order list" className="flex-1 min-w-[180px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={changeForm.service} onChange={(e) => setChangeForm(f => ({ ...f, service: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {Object.keys(health).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={changeForm.type} onChange={(e) => setChangeForm(f => ({ ...f, type: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Bugfix', 'Feature', 'Config', 'Hotfix'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={changeForm.risk} onChange={(e) => setChangeForm(f => ({ ...f, risk: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {(['Low', 'Medium', 'High'] as const).map(r => <option key={r} value={r}>{r} risk</option>)}
              </select>
              <select value={changeForm.by} onChange={(e) => setChangeForm(f => ({ ...f, by: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Agent-1', 'Agent-2', 'Engineering', 'Payment Ops', 'Compliance'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={addChange} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Propose Change</button>
            </div>
            {changes.length === 0 ? (
              <p className="text-[10px] text-gray-500">No change requests yet — propose one to start an approval flow.</p>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {changes.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white">{c.title} <span className="font-mono text-[9px] text-gray-500">({c.id})</span></p>
                      <p className="text-[9px] text-gray-500">{c.service} · {c.type} · <span className={`font-black ${c.risk === 'High' ? 'text-red-400' : c.risk === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{c.risk} risk</span> · by {c.by}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${c.status === 'Proposed' ? 'bg-gray-500/10 text-gray-400' : c.status === 'Approved' ? 'bg-blue-500/10 text-blue-400' : c.status === 'Deployed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{c.status}</span>
                      <button onClick={() => cycleChange(c.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{c.status === 'Proposed' ? 'Approve' : c.status === 'Approved' ? 'Deploy' : c.status === 'Deployed' ? 'Roll back' : 'Re-propose'}</button>
                      <button onClick={() => deleteChange(c.id)} className="p-1 text-gray-500 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tech debt / deprecation tracker */}
          <div id="sec-tech-debt-deprecation-tracker" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-tech-debt-deprecation-tracker' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Hourglass className="w-3.5 h-3.5 text-amber-400" /><span>Tech Debt / Deprecation Tracker ({debt.filter(d => d.status === 'Overdue').length} overdue)</span></h3>
              <span className={`text-[9px] font-black uppercase ${debt.filter(d => d.status === 'Overdue').length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{debt.filter(d => d.status === 'On track').length}/{debt.length} on track</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <input type="text" value={debtForm.item} onChange={(e) => setDebtForm(f => ({ ...f, item: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addDebt(); }} placeholder="Item, e.g. deprecate /api/orders/legacy-status" className="flex-1 min-w-[180px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={debtForm.type} onChange={(e) => setDebtForm(f => ({ ...f, type: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Endpoint', 'App version', 'API', 'Config'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="text" value={debtForm.eol} onChange={(e) => setDebtForm(f => ({ ...f, eol: e.target.value }))} placeholder="EOL, e.g. 30 Sep 2026" className="w-[130px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={debtForm.owner} onChange={(e) => setDebtForm(f => ({ ...f, owner: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Engineering', 'Payment Ops', 'Compliance', 'Agent-1'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={addDebt} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Track Item</button>
            </div>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {debt.length === 0 ? (
                <p className="text-[10px] text-gray-500">No tech debt tracked yet.</p>
              ) : (
                debt.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white">{d.item} <span className="font-mono text-[9px] text-gray-500">({d.id})</span></p>
                      <p className="text-[9px] text-gray-500">{d.type} · EOL <span className={`font-black ${d.status === 'Overdue' ? 'text-red-400' : 'text-gray-300'}`}>{d.eol}</span> · owner {d.owner}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${d.status === 'On track' ? 'bg-emerald-500/10 text-emerald-400' : d.status === 'At risk' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{d.status}</span>
                      <button onClick={() => cycleDebt(d.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{d.status === 'On track' ? 'Mark at risk' : d.status === 'At risk' ? 'Mark overdue' : 'Reopen'}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Track deprecated endpoints, old app versions and EOL config — overdue items surface in the App Issue Overview count.</p>
          </div>

          {/* Bug report form */}
          <div id="sec-bug-report-form" className={`bg-brand-card border border-brand-border rounded-xl p-4 space-y-3 ${activeTechSection === 'sec-bug-report-form' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Bug className="w-3.5 h-3.5 text-red-400" /><span>Report a Bug (structured)</span></h3>
            <div className="flex flex-wrap gap-2">
              <input type="text" value={bugForm.title} onChange={(e) => setBugForm(f => ({ ...f, title: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') submitBug(); }} placeholder="Bug title, e.g. Checkout fails after adding extra store" className="flex-1 min-w-[180px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={bugForm.app} onChange={(e) => setBugForm(f => ({ ...f, app: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Customer App', 'Driver App', 'Store Panel', 'Admin Console', 'POS Terminal'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={bugForm.version} onChange={(e) => setBugForm(f => ({ ...f, version: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="">Version…</option>
                <option value="v2.4.1">v2.4.1</option>
                <option value="v3.1.0">v3.1.0</option>
                <option value="v2.2.3">v2.2.3</option>
                <option value="v1.8.0">v1.8.0</option>
                <option value="other">other</option>
              </select>
              <select value={bugForm.severity} onChange={(e) => setBugForm(f => ({ ...f, severity: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {(['Low', 'Medium', 'High', 'Critical'] as const).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="text" value={bugForm.device} onChange={(e) => setBugForm(f => ({ ...f, device: e.target.value }))} placeholder="Device / OS (e.g. Redmi Note 12)" className="flex-1 min-w-[140px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
            </div>
            <textarea value={bugForm.repro} onChange={(e) => setBugForm(f => ({ ...f, repro: e.target.value }))} placeholder="Reproduction steps: 1. … 2. … 3. Expected vs actual…" className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600 resize-y min-h-[56px]" />
            <button onClick={submitBug} className="px-3.5 py-1.5 bg-red-600/20 border border-red-500/40 text-red-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-red-600/30">File Bug Report</button>
            <p className="text-[9px] text-gray-600">Filing creates a BUG-### incident on the Known Issues board (Investigating) + writes the full repro to the audit.</p>
          </div>

          {/* Maintenance windows */}
          <div id="sec-maintenance-windows" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-maintenance-windows' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Clock className="w-3.5 h-3.5 text-violet-400" /><span>Maintenance Windows ({maintenance.length})</span></h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={maintForm.service} onChange={(e) => setMaintForm(f => ({ ...f, service: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {Object.keys(health).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <input type="text" value={maintForm.title} onChange={(e) => setMaintForm(f => ({ ...f, title: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addMaintenance(); }} placeholder="e.g. DB index rebuild, 02:00–03:00" className="flex-1 min-w-[180px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <button onClick={addMaintenance} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Schedule</button>
            </div>
            {maintenance.length === 0 ? (
              <p className="text-[10px] text-gray-500">No maintenance windows scheduled.</p>
            ) : (
              <div className="space-y-1.5">
                {maintenance.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white">{m.title} <span className="font-mono text-[9px] text-gray-500">({m.id})</span></p>
                      <p className="text-[9px] text-gray-500">{m.service} · planned at {m.time}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${m.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-400' : m.status === 'Ongoing' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{m.status}</span>
                      <button onClick={() => cycleMaintenance(m.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{m.status === 'Scheduled' ? 'Start' : m.status === 'Ongoing' ? 'Complete' : 'Reopen'}</button>
                      <button onClick={() => removeMaintenance(m.id)} className="p-1 text-gray-500 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nightly batch jobs */}
          <div id="sec-nightly-batch-jobs" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-nightly-batch-jobs' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><CalendarClock className="w-3.5 h-3.5 text-indigo-400" /><span>Nightly Batch Jobs Monitor</span></h3>
              <span className={`text-[9px] font-black uppercase ${batchJobs.filter(j => j.status === 'Failed').length === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{batchJobs.filter(j => j.status === 'Failed').length} failed</span>
            </div>
            <div className="space-y-1.5">
              {batchJobs.map(j => (
                <div key={j.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{j.job} <span className="font-mono text-[8px] text-gray-500">({j.id})</span></p>
                    <p className="text-[9px] text-gray-500">{j.schedule} · last {j.lastRun} · {j.duration}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${j.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-400' : j.status === 'Warn' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{j.status}</span>
                    <button onClick={() => runBatch(j.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Run Now</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Scheduled overnight jobs — a failed run (e.g. search index rebuild) surfaces here before business hours.</p>
          </div>

          {/* On-call roster */}
          <div id="sec-on-call-roster" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-on-call-roster' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Users className="w-3.5 h-3.5 text-brand-orange" /><span>On-call Roster</span></h3>
              <span className="text-[9px] text-gray-500">Current: <span className="text-emerald-400 font-bold">{onCallRoster.find(r => r.current)?.agent}</span></span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              {onCallRoster.map(r => (
                <div key={r.day} className={`rounded-lg border px-2 py-2 text-center ${r.current ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-brand-dark/40 border-brand-border'}`}>
                  <p className={`text-[9px] font-black uppercase ${r.current ? 'text-emerald-400' : 'text-gray-500'}`}>{r.day.slice(0, 3)}</p>
                  <p className="text-[9px] text-gray-200 mt-1">{r.agent}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Primary support responder per day. Week is generated from the agent pool.</p>
          </div>

          {/* Shift handover notes */}
          <div id="sec-shift-handover-notes" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-shift-handover-notes' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><ArrowRightLeft className="w-3.5 h-3.5 text-orange-400" /><span>Shift Handover Notes ({handover.length})</span></h3>
              <span className="text-[9px] text-gray-500">End-of-shift briefing for the next agent</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={handoverForm.shift} onChange={(e) => setHandoverForm(f => ({ ...f, shift: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
              <input type="text" value={handoverForm.note} onChange={(e) => setHandoverForm(f => ({ ...f, note: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addHandover(); }} placeholder="Handover note, e.g. Watch pending approvals…" className="flex-1 min-w-[200px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <button onClick={addHandover} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Add Note</button>
            </div>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {handover.length === 0 ? (
                <p className="text-[10px] text-gray-500">No handover notes yet.</p>
              ) : (
                handover.map(h => (
                  <div key={h.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                    <p className="text-[9px] font-black text-white">{h.shift} shift · {h.agent} <span className="text-gray-500 font-mono font-normal">· {h.time}</span></p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{h.note}</p>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Live briefing: {knownIssues.filter(i => i.status !== 'Resolved').length} open incident(s), {approvals.filter(a => a.status === 'Pending').length} pending approval(s), {sosAlerts.filter(s => s.status !== 'Resolved').length} SOS active — pass it forward.</p>
          </div>

          {/* War room */}
          <div id="sec-war-room" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-war-room' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><MessagesSquare className="w-3.5 h-3.5 text-red-400" /><span>Incident War Room ({warroom.length})</span></h3>
              <span className="text-[9px] text-gray-500">Live discussion log for ongoing incidents</span>
            </div>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 mb-3 bg-brand-dark/40 border border-brand-border rounded-lg p-2">
              {warroom.length === 0 ? (
                <p className="text-[10px] text-gray-500 p-2">No updates yet — post the first update about the active incident.</p>
              ) : (
                warroom.map(w => (
                  <div key={w.id} className="border-b border-brand-border/40 last:border-0 pb-1.5 mb-1.5">
                    <p className="text-[9px] font-black text-white">{w.by} <span className="text-gray-500 font-mono font-normal">· {w.time}</span></p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{w.text}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input type="text" value={warroomText} onChange={(e) => setWarroomText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addWarroom(); }} placeholder="Status update, e.g. SMS vendor degraded — failing over to backup route…" className="flex-1 min-w-[180px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <button onClick={addWarroom} className="px-3.5 py-1.5 bg-red-600/20 border border-red-500/40 text-red-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-red-600/30">Post Update</button>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">War room entries are persisted locally — use it to keep the on-call team aligned mid-incident.</p>
          </div>

          {/* Support log viewer */}
          <div id="sec-support-log-viewer" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-support-log-viewer' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Terminal className="w-3.5 h-3.5 text-lime-400" /><span>Support Log Viewer ({logs.filter(l => l.level === 'ERROR').length} errors)</span></h3>
              <button onClick={simulateLog} className="px-3 py-1.5 bg-lime-600/20 border border-lime-500/40 text-lime-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-lime-600/30">Simulate Traffic</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <input type="text" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} placeholder="Search logs, e.g. bKash, extraStores, signature…" className="flex-1 min-w-[160px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={logLevel} onChange={(e) => setLogLevel(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['ALL', 'INFO', 'WARN', 'ERROR'].map(lv => <option key={lv} value={lv}>{lv}</option>)}
              </select>
            </div>
            <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1 font-mono">
              {logs.length === 0 ? (
                <p className="text-[10px] text-gray-500">Log stream is empty — simulate traffic to generate entries.</p>
              ) : (
                logs.filter(l => (logLevel === 'ALL' || l.level === logLevel) && (logSearch.trim() === '' || (l.service + ' ' + l.message).toLowerCase().includes(logSearch.toLowerCase()))).map(l => (
                  <div key={l.id} className={`flex items-start gap-2 rounded-lg px-3 py-1.5 border ${l.level === 'ERROR' ? 'bg-red-500/5 border-red-500/25' : l.level === 'WARN' ? 'bg-amber-500/5 border-amber-500/25' : 'bg-brand-dark/40 border-brand-border'}`}>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black shrink-0 ${l.level === 'ERROR' ? 'bg-red-500/10 text-red-400' : l.level === 'WARN' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{l.level}</span>
                    <span className="text-[9px] text-gray-600 shrink-0">{l.time}</span>
                    <span className="text-[9px] text-gray-400 shrink-0">{l.service}</span>
                    <span className={`text-[9px] ${l.level === 'ERROR' ? 'text-red-300' : l.level === 'WARN' ? 'text-amber-200' : 'text-gray-300'}`}>{l.message}</span>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Central log stream across SD services — filter by level or search to trace an incident quickly.</p>
          </div>

          {/* Crash report inbox */}
          <div id="sec-crash-report-inbox" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-crash-report-inbox' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><FileWarning className="w-3.5 h-3.5 text-orange-400" /><span>Crash Report Inbox ({crashes.filter(c => c.status === 'New').length} new)</span></h3>
              <span className="text-[9px] text-gray-500">{crashes.reduce((s, c) => s + c.users, 0)} users affected</span>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {crashes.length === 0 ? (
                <p className="text-[10px] text-gray-500">No crash reports in the inbox.</p>
              ) : (
                crashes.map(c => (
                  <div key={c.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border ${c.status === 'New' ? 'bg-orange-500/5 border-orange-500/30' : c.status === 'Triaged' ? 'bg-blue-500/5 border-blue-500/25' : 'bg-brand-dark/40 border-brand-border opacity-60'}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white"><span className="font-mono text-brand-orange">{c.id}</span> · {c.app} <span className="text-[8px] text-gray-500">{c.version}</span> · <span className="text-gray-400">{c.device}</span></p>
                      <p className="text-[9px] text-amber-200/90 mt-0.5">{c.error}</p>
                      <p className="text-[8px] text-gray-500">{c.users} user(s) · {c.time}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${c.status === 'New' ? 'bg-orange-500/10 text-orange-400' : c.status === 'Triaged' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{c.status}</span>
                      <button onClick={() => triageCrash(c.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{c.status === 'New' ? 'Triage' : c.status === 'Triaged' ? 'Mark fixed' : 'Re-open'}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Auto-collected stack traces from Customer App / Driver App / Store Panel / POS. Triage → mark fixed with full audit trail.</p>
          </div>

          {/* Driver emergency SOS center */}
          <div id="sec-driver-emergency-sos-center" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-driver-emergency-sos-center' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Siren className="w-3.5 h-3.5 text-red-400" /><span>Driver Emergency SOS Center ({sosAlerts.filter(s => s.status !== 'Resolved').length} active)</span></h3>
              <button onClick={simulateSos} className="px-3 py-1.5 bg-red-600/20 border border-red-500/40 text-red-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-red-600/30">Simulate SOS</button>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {sosAlerts.length === 0 ? (
                <p className="text-[10px] text-gray-500">No SOS alerts recorded.</p>
              ) : (
                sosAlerts.map(s => (
                  <div key={s.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border ${s.status === 'Resolved' ? 'bg-brand-dark/40 border-brand-border opacity-70' : s.status === 'Dispatch' ? 'bg-blue-500/5 border-blue-500/25' : 'bg-red-500/5 border-red-500/30 animate-pulse'}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white"><span className="font-mono text-brand-orange">{s.id}</span> · {s.driver} · <span className="text-gray-400">{s.order}</span></p>
                      <p className="text-[9px] text-gray-500">📍 {s.location} · {s.time}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'Received' ? 'bg-red-500/10 text-red-400' : s.status === 'Dispatch' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{s.status}</span>
                      <button onClick={() => cycleSos(s.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{s.status === 'Received' ? 'Dispatch backup' : s.status === 'Dispatch' ? 'Resolve' : 'Re-open'}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Driver SOS flow: Received (panic) → Dispatch backup rider → Resolved. Every status change is audited.</p>
          </div>

          {/* Driver documents expiry */}
          <div id="sec-driver-documents-expiry" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-driver-documents-expiry' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><IdCard className="w-3.5 h-3.5 text-amber-400" /><span>Driver Documents Expiry</span></h3>
              <span className={`text-[9px] font-black uppercase ${driverDocs.filter(d => d.status !== 'Valid').length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{driverDocs.filter(d => d.status === 'Expired').length} expired · {driverDocs.filter(d => d.status === 'Expiring').length} expiring</span>
            </div>
            <div className="space-y-1.5">
              {driverDocs.map(d => (
                <div key={d.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{d.driver} · <span className="text-gray-300">{d.doc}</span> <span className="font-mono text-[8px] text-gray-500">{d.no}</span></p>
                    <p className="text-[9px] text-gray-500">Expires <span className={`font-black ${d.days < 0 ? 'text-red-400' : d.days < 30 ? 'text-amber-400' : 'text-emerald-400'}`}>{d.expires}</span> · <span className={d.days < 0 ? 'text-red-400 font-black' : 'text-gray-300'}>{d.days < 0 ? 'expired' : `${d.days} day(s) left`}</span></p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${d.status === 'Expired' ? 'bg-red-500/10 text-red-400' : d.status === 'Expiring' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{d.status}</span>
                    <button onClick={() => verifyDoc(d.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Mark verified (+365d)</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">License, NID, fitness and insurance renewals — expired documents block driver assignment until renewed.</p>
          </div>

          {/* Tech backlog */}
          <div id="sec-tech-backlog" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-tech-backlog' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><ListChecks className="w-3.5 h-3.5 text-lime-400" /><span>Technical Backlog ({backlog.length})</span></h3>
              <span className={`text-[9px] font-black uppercase ${backlog.filter(b => b.status !== 'Done').length === 0 ? 'text-emerald-400' : 'text-lime-400'}`}>{backlog.filter(b => b.status !== 'Done').length} open</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <input type="text" value={backlogForm.task} onChange={(e) => setBacklogForm(f => ({ ...f, task: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addBacklog(); }} placeholder="Task, e.g. Add double-submit guard to Store Panel" className="flex-1 min-w-[180px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={backlogForm.priority} onChange={(e) => setBacklogForm(f => ({ ...f, priority: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {(['Low', 'Medium', 'High', 'Critical'] as const).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={backlogForm.assignee} onChange={(e) => setBacklogForm(f => ({ ...f, assignee: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Agent-1', 'Agent-2', 'Agent-3', 'Engineering', 'Payment Ops', 'Compliance'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={addBacklog} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Add Task</button>
            </div>
            {backlog.length === 0 ? (
              <p className="text-[10px] text-gray-500">No backlog tasks yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {backlog.map(b => (
                  <div key={b.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                    <div className="min-w-0">
                      <p className={`text-[11px] font-bold ${b.status === 'Done' ? 'text-gray-500 line-through' : 'text-white'}`}>{b.task} <span className="font-mono text-[9px] text-gray-500">({b.id})</span></p>
                      <p className="text-[9px] text-gray-500">{b.assignee} · priority <span className={`font-black ${b.priority === 'Critical' ? 'text-red-400' : b.priority === 'High' ? 'text-orange-400' : b.priority === 'Medium' ? 'text-amber-400' : 'text-blue-400'}`}>{b.priority}</span></p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${b.status === 'Todo' ? 'bg-gray-500/10 text-gray-400' : b.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{b.status}</span>
                      <button onClick={() => cycleBacklog(b.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{b.status === 'Todo' ? 'Start' : b.status === 'In Progress' ? 'Complete' : 'Reopen'}</button>
                      <button onClick={() => deleteBacklog(b.id)} className="p-1 text-gray-500 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-diagnosis for an open technical ticket */}
          {activeTech && (
            <div id="sec-technical-auto-diagnosis" className={`bg-brand-card border border-brand-border rounded-xl p-4 space-y-3 ${activeTechSection === 'sec-technical-auto-diagnosis' || activeTechSection === 'all' ? '' : 'hidden'}`}>
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Wand2 className="w-3.5 h-3.5 text-brand-orange" /><span>Technical Auto-Diagnosis — {activeTicket?.id}</span></h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-1 bg-brand-orange/10 border border-brand-orange/30 text-brand-orange rounded-md text-[9px] font-black">{activeTech.type}</span>
                <span className={`px-2 py-1 rounded-md text-[9px] font-black border ${activeTech.severity === 'Critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' : activeTech.severity === 'High' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>{activeTech.severity} severity</span>
                <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md text-[9px] font-black">Affects: {activeTech.platform}</span>
              </div>
              {(() => { const cm = codeForType(activeTech.type); return (
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-3 space-y-1">
                  <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Where the fix lives</p>
                  <p className="text-[10px] text-gray-300">App: <span className="text-cyan-300 font-bold">{cm.app}</span> · Code: <span className="font-mono text-brand-orange">{cm.file} → {cm.fn}</span></p>
                  <p className="text-[9px] text-gray-500">Why: {cm.why}</p>
                  <p className="text-[9px] text-gray-500">Button to use: <span className="font-mono text-brand-orange">{cm.action}</span> → Outcome: <span className="text-gray-300">{cm.outcome}</span></p>
                </div>
              ); })()}
              <div className="flex items-center space-x-2">
                <button onClick={applyAllTechFixes} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors">Apply Full Fix Playbook</button>
              </div>
              <div className="space-y-1.5">
                {techFixPlaybook[activeTech.type].map((step, i) => (
                  <div key={i} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-1.5">
                    <p className="text-[10px] text-gray-300"><span className="text-gray-600 font-mono mr-1.5">{i + 1}.</span>{step}</p>
                    <button onClick={() => applyTechFix(step)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50 shrink-0 ml-2">Apply</button>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-gray-500">{techTickets.length} technical ticket(s) in queue · fixes logged to Tech Audit + order resolution steps</p>
            </div>
          )}

          {/* Diagnosis wizard */}
          <div id="sec-diagnosis-wizard" className={`bg-brand-card border border-brand-border rounded-xl p-4 space-y-3 ${activeTechSection === 'sec-diagnosis-wizard' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><SearchCheck className="w-3.5 h-3.5 text-cyan-400" /><span>Diagnosis Wizard</span></h3>
            <div className="flex flex-wrap gap-2">
              <select value={diagPlat} onChange={(e) => setDiagPlat(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {TECH_PLATFORMS.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={diagSymptom} onChange={(e) => setDiagSymptom(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="">Pick a symptom…</option>
                {SYMPTOMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {diagArticle ? (
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] font-bold text-white">{diagArticle.title} <span className="font-mono text-[9px] text-gray-500">({diagArticle.id})</span></p>
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${diagArticle.severity === 'Critical' ? 'bg-red-500/10 text-red-400' : diagArticle.severity === 'High' ? 'bg-orange-500/10 text-orange-400' : diagArticle.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{diagArticle.severity}</span>
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-[8px] font-black uppercase">{diagArticle.platform}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-300">Likely root cause:</span> {diagArticle.cause}</p>
                <div className="space-y-1">
                  {diagArticle.fixes.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-brand-dark/50 border border-brand-border rounded-lg px-2.5 py-1">
                      <p className="text-[10px] text-gray-300"><span className="text-gray-600 font-mono mr-1.5">{i + 1}.</span>{f}</p>
                      <button onClick={() => applyTechFix(f)} className="px-2 py-0.5 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50 shrink-0 ml-2">Apply</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => diagArticle.fixes.forEach(applyTechFix)} className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-cyan-600/30">Apply Suggested Fixes</button>
                <button onClick={() => logIncidentFromArticle(diagArticle.id)} className="px-3 py-1.5 bg-amber-600/20 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-amber-600/30">Raise Incident from Diagnosis</button>
              </div>
            ) : (
              <p className="text-[10px] text-gray-500">Select a platform + symptom to get an auto-diagnosed root cause, fix steps, and escalation level.</p>
            )}
          </div>

          {/* Knowledge base */}
          <div id="sec-knowledge-base" className={`bg-brand-card border border-brand-border rounded-xl p-4 space-y-3 ${activeTechSection === 'sec-knowledge-base' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><BookOpen className="w-3.5 h-3.5 text-blue-400" /><span>Knowledge Base ({filteredKB.length} / {KB_ARTICLES.length})</span></h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder="Search articles, causes, fixes…"
                className="flex-1 min-w-[160px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600"
              />
              <select value={kbCat} onChange={(e) => setKbCat(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {TECH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={kbPlat} onChange={(e) => setKbPlat(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {TECH_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {filteredKB.length === 0 ? (
                <p className="text-[10px] text-gray-500">No articles match the filters.</p>
              ) : filteredKB.map(a => (
                <div key={a.id} className="bg-brand-dark/40 border border-brand-border rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedKb(expandedKb === a.id ? null : a.id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 cursor-pointer text-left">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{a.title}</p>
                      <p className="text-[9px] text-gray-500">{a.id} · {a.cat} · {a.platform}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${a.severity === 'Critical' ? 'bg-red-500/10 text-red-400' : a.severity === 'High' ? 'bg-orange-500/10 text-orange-400' : a.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{a.severity}</span>
                  </button>
                  {expandedKb === a.id && (
                    <div className="px-3 pb-3 space-y-2 border-t border-brand-border pt-2">
                      <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-300">Root cause:</span> {a.cause}</p>
                      <div className="space-y-1">
                        {a.fixes.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-brand-dark/50 border border-brand-border rounded-lg px-2.5 py-1">
                            <p className="text-[10px] text-gray-300"><span className="text-gray-600 font-mono mr-1.5">{i + 1}.</span>{f}</p>
                            <button onClick={() => applyTechFix(f)} className="px-2 py-0.5 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50 shrink-0 ml-2">Apply</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => a.fixes.forEach(applyTechFix)} className="px-3 py-1 bg-blue-600/20 border border-blue-500/40 text-blue-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-blue-600/30">Apply Article Fixes</button>
                        <button onClick={() => logIncidentFromArticle(a.id)} className="px-3 py-1 bg-amber-600/20 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-amber-600/30">Raise Incident</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Common fix library */}
          <div id="sec-common-fix-library" className={`bg-brand-card border border-brand-border rounded-xl p-4 space-y-3 ${activeTechSection === 'sec-common-fix-library' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Wrench className="w-3.5 h-3.5 text-lime-400" /><span>Common Fix Library ({FIX_LIBRARY.length})</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
              {FIX_LIBRARY.map((fix, i) => (
                <div key={i} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-2.5 py-1.5">
                  <span className="text-[10px] text-gray-300 truncate mr-2">{fix}</span>
                  <button onClick={() => applyTechFix(fix)} className="px-2 py-0.5 bg-brand-dark border border-brand-border text-lime-400 rounded text-[9px] font-bold cursor-pointer hover:border-lime-400/50 shrink-0">Apply</button>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation matrix */}
          <div id="sec-escalation-matrix" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-escalation-matrix' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><ArrowUpCircle className="w-3.5 h-3.5 text-red-400" /><span>Escalation Matrix</span></h3>
            <div className="space-y-2">
              {ESCALATION.map(e => (
                <div key={e.level} className="flex items-start gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] font-black shrink-0">{e.level}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white">{e.team} <span className="text-[9px] font-black text-red-400 ml-1.5">{e.sla}</span></p>
                    <p className="text-[9px] text-gray-500">{e.applies} · {e.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tier-based support model */}
          <div id="sec-tier-based-support-model" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-tier-based-support-model' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Layers className="w-3.5 h-3.5 text-sky-400" /><span>Tier-Based Support Model (L0–L3)</span></h3>
              <span className="text-[9px] text-gray-500">Queue: {tierQueue.length} live ticket(s) · escalate or resolve below</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
              {[
                { id: 'L0', name: 'Self-Service', handler: 'KB articles · FAQ · chatbot', resolve: 'Instant', auto: 68, color: 'text-emerald-400' },
                { id: 'L1', name: 'Frontline', handler: 'Support agents · password reset · guidance', resolve: '≤ 15 min', auto: 22, color: 'text-sky-400' },
                { id: 'L2', name: 'Advanced', handler: 'Tech specialists · bug tracking · DB/API', resolve: '≤ 4 hrs', auto: 8, color: 'text-amber-400' },
                { id: 'L3', name: 'Expert / Engineering', handler: 'Developers · system architects · code fix', resolve: 'On-call', auto: 2, color: 'text-red-400' }
              ].map(t => (
                <div key={t.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${t.id === 'L0' ? 'bg-emerald-500/10' : t.id === 'L1' ? 'bg-sky-500/10' : t.id === 'L2' ? 'bg-amber-500/10' : 'bg-red-500/10'} ${t.color}`}>{t.id}</span>
                    <span className="text-[9px] text-gray-400 font-black">{tierQueue.filter(x => x.tier === t.id).length} queued</span>
                  </div>
                  <p className="text-[10px] font-bold text-white">{t.name}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{t.handler}</p>
                  <p className="text-[9px] text-gray-500">Response: <span className="text-gray-300 font-bold">{t.resolve}</span> · <span className="text-gray-300 font-bold">{t.auto}%</span> of all issues</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 mb-3">
              {tierQueue.map(tq => (
                <div key={tq.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{tq.issue} <span className="text-[8px] text-gray-500">· {tq.customer}</span></p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${tq.tier === 'L0' ? 'bg-emerald-500/10 text-emerald-400' : tq.tier === 'L1' ? 'bg-sky-500/10 text-sky-400' : tq.tier === 'L2' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{tq.tier}</span>
                    {tq.tier !== 'L3' && <button onClick={() => escalateTicket(tq.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-red-300 rounded text-[9px] font-bold cursor-pointer hover:border-red-400/50">Escalate</button>}
                    <button onClick={() => resolveTicket(tq.id)} className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded text-[9px] font-bold cursor-pointer hover:bg-emerald-600/30">Resolve</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input type="text" value={tierForm.issue} onChange={(e) => setTierForm(f => ({ ...f, issue: e.target.value }))} placeholder="Issue, e.g. Refund stuck in Pending" className="flex-1 min-w-[150px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <input type="text" value={tierForm.customer} onChange={(e) => setTierForm(f => ({ ...f, customer: e.target.value }))} placeholder="Customer / Store" className="w-[130px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={tierForm.tier} onChange={(e) => setTierForm(f => ({ ...f, tier: e.target.value as 'L1' | 'L2' | 'L3' }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['L1', 'L2', 'L3'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <button onClick={addTierTicket} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Open Ticket</button>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Open the ticket at the right tier — L0 handles itself via KB/FAQ, escalate to L2 for DB/bug depth, L3 (engineering) only for code-level fixes. Every move is audited.</p>
          </div>

          {/* Support channels / types */}
          <div id="sec-support-channels-types" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-support-channels-types' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><MessagesSquare className="w-3.5 h-3.5 text-indigo-400" /><span>Support Channels / Types</span></h3>
              <span className="text-[9px] text-gray-500">{channels.filter(c => c.status === 'Online').length}/{channels.length} channels online</span>
            </div>
            <div className="space-y-1.5">
              {channels.map(ch => (
                <div key={ch.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{ch.name} <span className="text-[8px] text-gray-500">· {ch.platform}</span></p>
                    <p className="text-[9px] text-gray-500">{ch.online} staff online · {ch.queue} in queue · <span className="text-gray-300">{ch.avg}</span></p>
                  </div>
                  <button onClick={() => toggleChannel(ch.id)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors ${ch.status === 'Online' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-red-500/10 border-red-500/40 text-red-300'}`}>{ch.status === 'Online' ? 'Online' : 'Offline'}</button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Live chat resolves instantly; tickets track complex issues end-to-end; remote desktop connects directly to a user's device for on-screen fixes. Taking a channel offline is audited.</p>

            <div className="mt-3 pt-3 border-t border-brand-border">
              <p className="text-[10px] font-bold text-white flex items-center space-x-1.5 mb-2"><Tag className="w-3.5 h-3.5 text-amber-400" /><span>Ticket Categories (shown in the customer storefront)</span></p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ticketCategories.map(c => (
                  <span key={c.value} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-brand-dark/60 border border-brand-border text-[9px] font-bold text-gray-200">
                    <span>{c.label}</span>
                    <button onClick={() => removeTicketCategory(c.value)} className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors" title="Remove category"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newTicketCat}
                  onChange={(e) => setNewTicketCat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTicketCategory(); } }}
                  placeholder="Add a category e.g. Product Quality"
                  className="flex-1 px-2.5 py-1.5 bg-brand-dark text-[10px] text-gray-200 border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600"
                />
                <button onClick={addTicketCategory} className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-black cursor-pointer transition-colors flex items-center space-x-1">
                  <Plus className="w-3 h-3" /><span>Add</span>
                </button>
              </div>
              <p className="text-[9px] text-gray-600 mt-2">Categories appear instantly in the customer's Open Support Ticket dropdown. Removing one does not affect already-submitted tickets.</p>
            </div>

            <div className="mt-3 pt-3 border-t border-brand-border">
              <p className="text-[10px] font-bold text-white flex items-center space-x-1.5 mb-2"><BookOpen className="w-3.5 h-3.5 text-cyan-400" /><span>Problem & Solution FAQs (shown in customer Help & Support)</span></p>
              <div className="space-y-1.5 mb-2">
                {helpFaqs.map(f => (
                  <div key={f.id} className="flex items-start justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-white">{f.problem}</p>
                      <p className="text-[9px] text-gray-500 leading-relaxed mt-0.5">{f.solution}</p>
                    </div>
                    <button onClick={() => removeHelpFaq(f.id)} className="p-1 text-gray-500 hover:text-red-400 cursor-pointer transition-colors shrink-0" title="Remove FAQ"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {helpFaqs.length === 0 && <p className="text-[9px] text-gray-600">No FAQs yet. Add one below.</p>}
              </div>
              <div className="space-y-1.5">
                <input type="text" value={newFaqProblem} onChange={(e) => setNewFaqProblem(e.target.value)} placeholder="Problem — e.g. My order is delayed" className="w-full px-2.5 py-1.5 bg-brand-dark text-[10px] text-gray-200 border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600" />
                <textarea rows={2} value={newFaqSolution} onChange={(e) => setNewFaqSolution(e.target.value)} placeholder="Solution — step-by-step fix shown to the customer" className="w-full px-2.5 py-1.5 bg-brand-dark text-[10px] text-gray-200 border border-brand-border rounded-lg outline-none focus:border-brand-orange placeholder:text-gray-600 resize-none" />
                <div className="flex items-center space-x-2">
                  <button onClick={addHelpFaq} className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-black cursor-pointer transition-colors flex items-center space-x-1">
                    <Plus className="w-3 h-3" /><span>Add FAQ</span>
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-gray-600 mt-2">FAQs appear instantly in the customer's Help & Customer Support page as expandable cards. Removing one does not affect already-submitted tickets.</p>
            </div>
          </div>

          {/* Device matrix */}
          <div id="sec-device-matrix" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-device-matrix' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Smartphone className="w-3.5 h-3.5 text-emerald-400" /><span>Device / Version Matrix</span></h3>
            <div className="space-y-2">
              {DEVICE_MATRIX.map(d => (
                <div key={d.platform} className="flex items-start justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white">{d.platform}</p>
                    <p className="text-[9px] text-gray-500">Android: {d.android} · iOS: {d.ios} · Web: {d.web}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${d.status === 'Supported' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Force update center */}
          <div id="sec-force-update-center" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-force-update-center' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Download className="w-3.5 h-3.5 text-cyan-400" /><span>Force Update Center</span></h3>
              <span className="text-[9px] text-gray-500">{forceUpdate.filter(f => f.force).length} app(s) force-updating</span>
            </div>
            <div className="space-y-1.5">
              {forceUpdate.map(f => (
                <div key={f.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{f.app} <span className="font-mono text-brand-orange">{f.current}</span> <span className="text-[8px] text-gray-500">· min {f.minSupported}</span></p>
                    <p className="text-[9px] text-gray-500">{f.note}</p>
                  </div>
                  <button onClick={() => toggleForce(f.id)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition-colors ${f.force ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>{f.force ? 'Force update ON' : 'Force update OFF'}</button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Force-enforced apps block logins/checkouts below the minimum version until updated. Toggles are audited.</p>
          </div>

          {/* Version adoption */}
          <div id="sec-version-adoption" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-version-adoption' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Percent className="w-3.5 h-3.5 text-violet-400" /><span>Version Adoption</span></h3>
              <span className="text-[9px] text-gray-500">Who runs which build</span>
            </div>
            {[
              { app: 'Customer App', active: 'v2.4.1', rows: [['v2.4.1', 42], ['v2.4.0', 31], ['v2.3.x', 18], ['older', 9]] },
              { app: 'Driver App', active: 'v3.1.0', rows: [['v3.1.0', 38], ['v3.0.9', 44], ['v3.0.8', 12], ['older', 6]] },
              { app: 'Store Panel', active: 'v2.2.3', rows: [['v2.2.3', 55], ['v2.2.2', 27], ['older', 18]] },
              { app: 'Admin Dashboard', active: 'v1.8.0', rows: [['v1.8.0', 61], ['v1.7.x', 29], ['older', 10]] }
            ].map(v => (
              <div key={v.app} className="mb-3">
                <p className="text-[10px] font-bold text-white mb-1">{v.app} <span className="text-[8px] text-gray-500">· active {v.active}</span></p>
                <div className="space-y-1">
                  {v.rows.map(r => (
                    <div key={r[0]} className="flex items-center gap-2">
                      <span className={`text-[8px] font-mono w-14 shrink-0 ${r[0] === v.active ? 'text-emerald-300 font-bold' : r[0] === 'older' ? 'text-red-400' : 'text-gray-400'}`}>{r[0]}</span>
                      <div className="flex-1 h-1.5 bg-brand-dark/60 border border-brand-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r[0] === 'older' ? 'bg-red-500/70' : r[0] === v.active ? 'bg-emerald-500/70' : 'bg-violet-500/60'}`} style={{ width: `${r[1]}%` }} />
                      </div>
                      <span className="text-[8px] text-gray-400 w-8 text-right">{r[1]}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[9px] text-gray-600 mt-2">Old-build clusters explain "feature missing" tickets — a force update or targeted push fixes them at once.</p>
          </div>

          {/* Release & changelog */}
          <div id="sec-release-changelog" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-release-changelog' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Sparkles className="w-3.5 h-3.5 text-pink-400" /><span>Release &amp; Changelog Center</span></h3>
            <div className="space-y-2">
              {RELEASE_NOTES.map(r => (
                <div key={r.app + r.version} className="flex items-start justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white">{r.app} <span className="font-mono text-brand-orange">{r.version}</span> <span className="text-[9px] text-gray-500">· {r.date}</span></p>
                    <div className="mt-1 space-y-0.5">
                      {r.notes.map((n, i) => <p key={i} className="text-[9px] text-gray-400 flex items-start space-x-1"><span className="text-emerald-400 shrink-0">✓</span><span>{n}</span></p>)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${r.type === 'Hotfix' ? 'bg-red-500/10 text-red-400' : r.type === 'Feature' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{r.type}</span>
                    <button onClick={() => deployRelease(r.app, r.version)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Deploy</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Each Deploy action is logged to the Tech Support Audit as a production promotion.</p>
          </div>

          {/* Release readiness checklist */}
          <div id="sec-release-readiness-checklist" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-release-readiness-checklist' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Rocket className="w-3.5 h-3.5 text-emerald-400" /><span>Release Readiness Checklist</span></h3>
              <select value={relCheck} onChange={(e) => setRelCheck(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="">Select a release…</option>
                {RELEASE_NOTES.map(r => <option key={r.app + r.version} value={r.app + ':' + r.version}>{r.app} {r.version}</option>)}
              </select>
            </div>
            {relCheck === '' ? (
              <p className="text-[10px] text-gray-500">Pick a release above to run its pre-deploy checklist.</p>
            ) : (
              (() => {
                const r = RELEASE_NOTES.find(x => x.app + ':' + x.version === relCheck);
                const list = relChecks[relCheck] || RELEASE_CHECKLIST.map(c => ({ label: c, done: false }));
                const doneCount = list.filter(c => c.done).length;
                return (
                  <div>
                    <p className="text-[9px] text-gray-400 mb-2">{r ? `${r.app} ${r.version} · ${r.date} · ${r.type}` : ''} — <span className={`font-black ${doneCount === list.length ? 'text-emerald-400' : 'text-emerald-400/70'}`}>{doneCount}/{list.length} checks passed</span></p>
                    <div className="space-y-1.5">
                      {list.map((c, i) => (
                        <button key={i} onClick={() => toggleRelCheck(relCheck, i)} className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left cursor-pointer transition-colors ${c.done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-brand-dark/40 border-brand-border hover:border-emerald-400/40'}`}>
                          <span className={`text-[10px] font-bold ${c.done ? 'text-emerald-300 line-through' : 'text-gray-200'}`}>{c.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${c.done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{c.done ? 'Passed' : 'Check'}</span>
                        </button>
                      ))}
                    </div>
                    {doneCount === list.length && <p className="text-[9px] text-emerald-400 font-black uppercase mt-2">● Ready to ship — all pre-deploy checks passed</p>}
                  </div>
                );
              })()
            )}
          </div>

          {/* Deploy pipeline / environment status */}
          <div id="sec-deploy-pipeline-environment-status" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-deploy-pipeline-environment-status' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Workflow className="w-3.5 h-3.5 text-blue-400" /><span>Deploy Pipeline / Environment Status</span></h3>
              <span className="text-[9px] text-gray-500">Staging → Production promotion</span>
            </div>
            <div className="space-y-1.5">
              {pipeline.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white">{p.app}</p>
                    <p className="text-[9px] text-gray-500">Staging <span className="font-mono text-blue-300">{p.staging}</span> → Prod <span className="font-mono text-emerald-300">{p.prod}</span> · staged {p.stagedAt} · prod {p.prodAt}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.status === 'Live' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'Staged' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{p.status}</span>
                    <button onClick={() => cyclePipeline(p.id)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">{p.status === 'Staged' ? 'Promote to Prod' : p.status === 'Live' ? 'Rollback' : 'Promote to Prod'}</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Promote a staged build to production, or roll back a live one — every action is audited.</p>
          </div>

          {/* Environment config center */}
          <div id="sec-environment-config-center" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-environment-config-center' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Settings2 className="w-3.5 h-3.5 text-slate-400" /><span>Environment Config Center</span></h3>
              <span className="text-[9px] text-gray-500">prod + staging runtime settings</span>
            </div>
            <div className="space-y-1.5">
              {envConfig.map(e => (
                <div key={e.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <p className="font-mono text-[10px] font-bold text-white">{e.key} <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${e.env === 'prod' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{e.env}</span></p>
                    <span className="text-[8px] text-gray-500">{e.note}</span>
                  </div>
                  <input type="text" value={e.value} onChange={(ev) => editEnv(e.id, ev.target.value)} className="w-full bg-brand-dark/60 border border-brand-border rounded-lg px-2.5 py-1.5 text-[10px] text-emerald-300 outline-none focus:border-brand-orange font-mono" />
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Runtime switches like payment mode, SMS routing priority and auto-refund ceiling — changes are audited.</p>
          </div>

          {/* SOP runbook library */}
          <div id="sec-sop-runbook-library" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-sop-runbook-library' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><BookOpen className="w-3.5 h-3.5 text-teal-400" /><span>SOP / Runbook Library ({SOP_RUNBOOKS.length})</span></h3>
            <div className="space-y-2">
              {SOP_RUNBOOKS.map(rb => (
                <div key={rb.id} className="bg-brand-dark/40 border border-brand-border rounded-lg overflow-hidden">
                  <button onClick={() => setRunbookOpen(runbookOpen === rb.id ? null : rb.id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 cursor-pointer text-left">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white">{rb.title} <span className="font-mono text-[9px] text-gray-500">({rb.id})</span></p>
                      <p className="text-[9px] text-gray-500">{rb.scope}</p>
                    </div>
                    <span className="text-gray-500 shrink-0">{runbookOpen === rb.id ? '−' : '+'}</span>
                  </button>
                  {runbookOpen === rb.id && (
                    <div className="px-3 pb-3 space-y-2 border-t border-brand-border pt-2">
                      <div className="space-y-1">
                        {rb.steps.map((s, i) => (
                          <div key={i} className="flex items-center justify-between bg-brand-dark/50 border border-brand-border rounded-lg px-2.5 py-1">
                            <p className="text-[10px] text-gray-300"><span className="text-gray-600 font-mono mr-1.5">{i + 1}.</span>{s}</p>
                            <button onClick={() => applyTechFix(s)} className="px-2 py-0.5 bg-brand-dark border border-brand-border text-teal-300 rounded text-[9px] font-bold cursor-pointer hover:border-teal-400/50 shrink-0 ml-2">Apply</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => logRunbook(rb)} className="px-3 py-1 bg-teal-600/20 border border-teal-500/40 text-teal-300 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors hover:bg-teal-600/30">Log runbook to audit</button>
                        <button onClick={() => rb.steps.forEach(applyTechFix)} className="px-3 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded-lg text-[10px] font-black uppercase cursor-pointer hover:border-brand-orange/50">Run All Steps</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Apply steps to the linked order resolution or log the whole runbook to the audit.</p>
          </div>

          {/* Agent workload */}
          {/* CSAT funnel */}
          <div id="sec-csat-funnel" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-csat-funnel' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Star className="w-3.5 h-3.5 text-amber-400" /><span>CSAT Feedback Funnel</span></h3>
              <span className="text-[9px] text-gray-500">Survey → response → positive → promoter</span>
            </div>
            {[
              { label: 'Surveys sent', val: 5200, note: 'after order delivery', color: 'bg-gray-500/50' },
              { label: 'Responded', val: 4450, note: '85.6% response rate', color: 'bg-sky-500/60' },
              { label: 'Positive (4–5)', val: 3890, note: '87.4% of responses', color: 'bg-emerald-500/60' },
              { label: 'Promoters (9–10)', val: 2870, note: '73.8% of positives', color: 'bg-amber-500/60' }
            ].map((f, i) => (
              <div key={f.label} className="flex items-center gap-2 mb-1.5">
                <span className="text-[8px] text-gray-400 w-24 shrink-0">{f.label}</span>
                <div className="flex-1 h-3 bg-brand-dark/60 border border-brand-border rounded-sm overflow-hidden">
                  <div className={`h-full ${f.color}`} style={{ width: `${f.val / 5200 * 100}%` }} />
                </div>
                <span className="text-[9px] text-white font-black w-10 text-right">{f.val.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-brand-dark/60 border border-brand-border rounded-lg px-2 py-1.5 text-center">
                <p className="text-[8px] text-gray-500 uppercase">Overall CSAT</p>
                <p className="text-[13px] font-black text-emerald-300">87.4%</p>
              </div>
              <div className="bg-brand-dark/60 border border-brand-border rounded-lg px-2 py-1.5 text-center">
                <p className="text-[8px] text-gray-500 uppercase">By app · best</p>
                <p className="text-[13px] font-black text-amber-300">Customer App 92%</p>
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Funnel drops show where sentiment leaks — respond but not positive signals a fix-worthy issue in that flow.</p>
          </div>

          {/* Canned responses */}
          <div id="sec-canned-responses" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-canned-responses' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Quote className="w-3.5 h-3.5 text-sky-400" /><span>Canned Responses / Quick Replies ({canned.length})</span></h3>
              <span className="text-[9px] text-gray-500">Insert into the reply box with one click</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={cannedForm.cat} onChange={(e) => setCannedForm(f => ({ ...f, cat: e.target.value }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                {['Refund', 'Delivery', 'Technical', 'Payment', 'Account'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" value={cannedForm.label} onChange={(e) => setCannedForm(f => ({ ...f, label: e.target.value }))} placeholder="Label, e.g. Payment retry" className="flex-1 min-w-[140px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <button onClick={addCanned} className="px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Add Reply</button>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {canned.map(c => (
                <div key={c.id} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <p className="text-[10px] font-bold text-white">{c.label} <span className="text-[8px] text-gray-500">· {c.cat}</span></p>
                    <button onClick={() => useCanned(c)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50 shrink-0">Insert</button>
                  </div>
                  <p className="text-[9px] text-gray-400">{c.body}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-600 mt-2">Insert appends the reply into the active ticket's message box — placeholders like {'{order}'} get filled by the agent.</p>
          </div>

          {/* Tech audit trail */}
          <div id="sec-tech-audit-trail" className={`bg-brand-card border border-brand-border rounded-xl p-4 ${activeTechSection === 'sec-tech-audit-trail' || activeTechSection === 'all' ? '' : 'hidden'}`}>
            <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><History className="w-3.5 h-3.5 text-purple-400" /><span>Tech Support Audit</span></h3>
            {techAudit.length === 0 ? (
              <p className="text-[10px] text-gray-500">No technical actions logged yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {techAudit.map((a, i) => (
                  <div key={i} className="flex items-start justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-1.5">
                    <div>
                      <p className="text-[10px] font-bold text-white">{a.action}</p>
                      <p className="text-[9px] text-gray-400">{a.detail}</p>
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono shrink-0 ml-2">{a.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {category === 'users' && (
        <div className="space-y-4">
          <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Users className="w-3.5 h-3.5 text-brand-orange" /><span>User Management</span></h3>
              <button onClick={() => setAddUserOpen(o => !o)} className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors">+ Add New User</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-white">{userStats.total}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Total users</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-emerald-400">{userStats.active}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Active</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-red-400">{userStats.blocked}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Blocked</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-amber-400">{userStats.pending}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Pending</p>
              </div>
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                <p className="text-lg font-black text-orange-400">{userStats.flagged}</p>
                <p className="text-[8px] font-bold uppercase text-gray-500">Flagged</p>
              </div>
            </div>
            {addUserOpen && (
              <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-3 flex flex-wrap gap-2">
                <input type="text" value={newUser.name} onChange={(e) => setNewUser(f => ({ ...f, name: e.target.value }))} placeholder="Full name *" className="flex-1 min-w-[140px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
                <input type="text" value={newUser.phone} onChange={(e) => setNewUser(f => ({ ...f, phone: e.target.value }))} placeholder="Phone (e.g. 01712-345678)" className="flex-1 min-w-[150px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
                <select value={newUser.type} onChange={(e) => setNewUser(f => ({ ...f, type: e.target.value as ManagedUser['type'] }))} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                  <option value="store">Store</option>
                </select>
                <input type="text" value={newUser.zone} onChange={(e) => setNewUser(f => ({ ...f, zone: e.target.value }))} placeholder="Zone" className="flex-1 min-w-[90px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
                <button onClick={addNewUser} className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-black cursor-pointer transition-colors hover:bg-emerald-600/30">Create</button>
                <button onClick={() => setAddUserOpen(false)} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-gray-400 rounded-lg text-[10px] cursor-pointer hover:text-white">Cancel</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search name, phone, zone, id…" className="flex-1 min-w-[160px] bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
              <select value={userTypeFilter} onChange={(e) => setUserTypeFilter(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="all">All types</option>
                <option value="customer">Customers</option>
                <option value="driver">Drivers</option>
                <option value="store">Stores</option>
              </select>
              <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)} className="bg-brand-dark border border-brand-border text-gray-300 rounded-lg px-2 py-1.5 text-[10px] cursor-pointer">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">{filteredUsers.length} user(s)</p>
            {filteredUsers.length === 0 ? (
              <p className="text-[10px] text-gray-500">No users match the filters.</p>
            ) : filteredUsers.map(u => {
              const flags = userFlags(u);
              return (
                <div key={u.id} className="bg-brand-dark/40 border border-brand-border rounded-lg p-3">
                  {editingUser === u.id ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <input type="text" value={userEdit.name} onChange={(e) => setUserEdit(p => ({ ...p, name: e.target.value }))} className="flex-1 min-w-[130px] bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange" />
                      <input type="text" value={userEdit.phone} onChange={(e) => setUserEdit(p => ({ ...p, phone: e.target.value }))} className="flex-1 min-w-[130px] bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange" />
                      <input type="text" value={userEdit.zone} onChange={(e) => setUserEdit(p => ({ ...p, zone: e.target.value }))} className="flex-1 min-w-[90px] bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange" />
                      <input type="text" value={userEdit.note} onChange={(e) => setUserEdit(p => ({ ...p, note: e.target.value }))} placeholder="Note" className="flex-1 min-w-[130px] bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600" />
                      <button onClick={saveUserEdit} className="px-2.5 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-black cursor-pointer">Save</button>
                      <button onClick={() => setEditingUser(null)} className="px-2.5 py-1 bg-brand-dark border border-brand-border text-gray-400 rounded text-[10px] cursor-pointer hover:text-white">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-[11px] font-black text-brand-orange shrink-0">{u.name.charAt(0).toUpperCase()}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{u.name} <span className="font-mono text-[9px] text-gray-500">({u.id})</span></p>
                          <p className="text-[9px] text-gray-500">{u.phone} · {u.zone} · {u.orders} orders · {u.complaints} complaints · since {u.added}</p>
                          <p className="text-[9px] mt-1 flex items-center space-x-1.5"><span className="text-gray-600 font-bold uppercase text-[8px]">Next:</span><span className="text-cyan-300">{userNextAction(u)}</span></p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${u.type === 'customer' ? 'bg-blue-500/10 text-blue-400' : u.type === 'driver' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>{u.type}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : u.status === 'blocked' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{u.status}</span>
                            {u.grade && <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${u.grade === 'A' ? 'bg-emerald-500/10 text-emerald-400' : u.grade === 'B' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>Grade {u.grade}</span>}
                            {u.note && <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded text-[8px]">{u.note}</span>}
                            {flags.map(f => <span key={f} className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[8px] font-black uppercase">{f}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {u.status === 'pending' && <button onClick={() => setUserStatus(u.id, 'active')} className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded text-[9px] font-bold cursor-pointer hover:bg-emerald-600/30">Approve</button>}
                        <button onClick={() => toggleUserStatus(u.id)} className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer border transition-colors ${u.status === 'blocked' ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30' : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'}`}>{u.status === 'blocked' ? 'Re-activate' : 'Block'}</button>
                        <button onClick={() => startEditUser(u)} className="px-2 py-1 bg-brand-dark border border-brand-border text-brand-orange rounded text-[9px] font-bold cursor-pointer hover:border-brand-orange/50">Edit</button>
                        <button onClick={() => removeUser(u.id)} className="p-1 text-gray-500 hover:text-red-400 cursor-pointer" title="Remove user"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTicketId && (<>
      {/* Dispute analytics dashboard */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4">
        <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Activity className="w-3.5 h-3.5 text-brand-orange" /><span>Dispute Analytics</span></h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className="text-lg font-black text-white">{analyzedOrderCount}</p>
            <p className="text-[9px] font-bold text-gray-500">Analyzed</p>
          </div>
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className="text-lg font-black text-emerald-400">Tk {totalRefunds.toFixed(0)}</p>
            <p className="text-[9px] font-bold text-gray-500">Refunds</p>
          </div>
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className="text-lg font-black text-red-400">Tk {totalFines.toFixed(0)}</p>
            <p className="text-[9px] font-bold text-gray-500">Fines</p>
          </div>
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className="text-lg font-black text-brand-orange">{resolutionRate}%</p>
            <p className="text-[9px] font-bold text-gray-500">Resolved</p>
          </div>
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className="text-lg font-black text-white">{faultCounts.customer} / {faultCounts.driver} / {faultCounts.store}</p>
            <p className="text-[9px] font-bold text-gray-500">Faults C/D/S</p>
          </div>
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className={`text-lg font-black ${repeatParty ? 'text-amber-400' : 'text-gray-600'}`}>{repeatParty ? partyLabel[repeatParty] : '—'}</p>
            <p className="text-[9px] font-bold text-gray-500">Repeat offender</p>
          </div>
        </div>
      </div>

      {/* SLA dashboard */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Timer className="w-3.5 h-3.5 text-amber-400" /><span>SLA Dashboard</span></h3>
          <div className="flex items-center space-x-2">
            <button onClick={exportAllCSV} className="px-2.5 py-1 bg-brand-dark border border-brand-border text-emerald-400 rounded-lg text-[9px] font-bold cursor-pointer hover:border-emerald-500/40 transition-colors">Export All Disputes CSV</button>
            <button onClick={exportBackup} className="px-2.5 py-1 bg-brand-dark border border-brand-border text-cyan-400 rounded-lg text-[9px] font-bold cursor-pointer hover:border-cyan-500/40 transition-colors" title="Download all support data as JSON">Backup</button>
            <label className="px-2.5 py-1 bg-brand-dark border border-brand-border text-cyan-400 rounded-lg text-[9px] font-bold cursor-pointer hover:border-cyan-500/40 transition-colors">
              Restore
              <input type="file" accept="application/json" className="hidden" onChange={importBackup} />
            </label>
            <button onClick={resetAnalysis} className="px-2.5 py-1 bg-brand-dark border border-brand-border text-red-400 rounded-lg text-[9px] font-bold cursor-pointer hover:border-red-500/40 transition-colors">Reset Data</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className="text-lg font-black text-white">{slaStats.analyzed}</p>
            <p className="text-[9px] font-bold text-gray-500">Reported orders tracked</p>
          </div>
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className="text-lg font-black text-red-400">{slaStats.breaches}</p>
            <p className="text-[9px] font-bold text-gray-500">SLA breaches</p>
          </div>
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className="text-lg font-black text-amber-400">{slaStats.rate}%</p>
            <p className="text-[9px] font-bold text-gray-500">Breach rate</p>
          </div>
          <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
            <p className={`text-lg font-black ${slaStats.worstDriver ? 'text-brand-orange' : 'text-gray-600'}`}>{slaStats.worstDriver || '—'}</p>
            <p className="text-[9px] font-bold text-gray-500">Worst driver ({slaStats.worstCount} breaches)</p>
          </div>
        </div>
        {slaStats.months.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {slaStats.months.map(m => (
              <span key={m} className="px-2.5 py-1 bg-brand-dark/40 border border-brand-border rounded-lg text-[10px] font-bold text-gray-300 flex items-center space-x-1.5">
                <span>{m}</span>
                <span className="px-1 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] font-black">{slaStats.byMonth[m]} breach</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-500">No SLA data yet — track a reported order with placement + report timestamps.</p>
        )}
        <p className="mt-2 text-[10px] text-gray-400">Avg admin resolution time: <span className="text-white font-bold">{avgResolveMin !== null ? avgResolveMin + ' min' : '—'}</span> <span className="text-gray-600">(first audit action → all resolution steps done)</span></p>
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-[10px] text-gray-400">Range:</span>
          {(['7', '30', '90', 'all'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold cursor-pointer ${range === r ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-brand-dark border-brand-border text-gray-400 hover:border-brand-orange/40'}`}>{r === 'all' ? 'All' : r + 'd'}</button>
          ))}
          <span className="text-[9px] text-gray-600 ml-1">(applies to SLA + bulk list)</span>
        </div>
      </div>

      {/* Driver scorecard */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4">
        <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Truck className="w-3.5 h-3.5 text-orange-400" /><span>Driver Scorecard</span></h3>
        {driverScorecards.length === 0 ? (
          <p className="text-[10px] text-gray-500">No driver data yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {driverScorecards.map(d => (
              <div key={d.driver} className="bg-brand-dark/40 border border-brand-border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[11px] font-black text-white">{d.driver}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{d.orders} orders · {d.breaches} SLA breach · Tk {d.fines.toFixed(0)} fines · {d.complaints} complaints</p>
                </div>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border ${d.grade === 'A' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : d.grade === 'B' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>{d.grade}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Store performance */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4">
        <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Store className="w-3.5 h-3.5 text-emerald-400" /><span>Store Performance & Rating</span></h3>
        {storePerformance.length === 0 ? (
          <p className="text-[10px] text-gray-500">No store data yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {storePerformance.map(s => (
              <div key={s.store} className="bg-brand-dark/40 border border-brand-border rounded-lg p-3">
                <p className="text-[11px] font-black text-white truncate">{s.store}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{s.orders} orders · avg report {s.avgMin !== null ? s.avgMin + ' min' : '—'} · {s.atFault} at-fault</p>
                <span className={`text-[9px] font-black uppercase mt-1 inline-block ${s.atFault === 0 ? 'text-emerald-400' : s.atFault <= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                  {s.atFault === 0 ? '★ Good' : s.atFault <= 1 ? '★ Fair' : '★ Needs attention'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicate orders + aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-brand-card border border-brand-border rounded-xl p-4">
          <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><AlertCircle className="w-3.5 h-3.5 text-amber-400" /><span>Duplicate Order Detection</span></h3>
          {duplicateOrders.length === 0 ? (
            <p className="text-[10px] text-gray-500">No duplicate orders flagged (same customer + amount + address).</p>
          ) : (
            <div className="space-y-2">
              {duplicateOrders.map((grp, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  <p className="text-[10px] font-bold text-red-300">{grp.length}× {grp[0].customerName} · Tk {grp[0].amount.toFixed(2)} · {grp[0].address}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{grp.map(g => g.id).join(' · ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-4">
          <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Clock className="w-3.5 h-3.5 text-blue-400" /><span>Order Aging Report</span></h3>
          {agingOrders.length === 0 ? (
            <p className="text-[10px] text-gray-500">No order open for 2+ hours.</p>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {agingOrders.map(x => (
                <div key={x.order.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-1.5">
                  <div>
                    <p className="font-mono text-[10px] font-bold text-gray-300">{x.order.id}</p>
                    <p className="text-[9px] text-gray-500">{x.order.storeName} → {x.order.customerName} · {x.order.status}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${x.hours! >= 6 ? 'bg-red-500/10 text-red-400' : x.hours! >= 3 ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{x.hours}h open</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk resolution */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4">
        <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><ListChecks className="w-3.5 h-3.5 text-purple-400" /><span>Bulk Resolution</span></h3>
        {bulkCandidates.length === 0 ? (
          <p className="text-[10px] text-gray-500">No reported orders yet — report an order from the Customer / Driver simulator first.</p>
        ) : (
          <>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {bulkCandidates.map(o => (
                <label key={o.id} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${bulkSelected.includes(o.id) ? 'bg-brand-orange/10 border-brand-orange' : 'bg-brand-dark/40 border-brand-border hover:border-brand-orange/40'}`}>
                  <input type="checkbox" checked={bulkSelected.includes(o.id)} onChange={() => toggleBulk(o.id)} className="accent-brand-orange cursor-pointer" />
                  <span className="font-mono text-[10px] font-bold text-gray-300">{o.id}</span>
                  <span className="text-[10px] text-gray-500 flex-1 truncate">{o.storeName} → {o.customerName} · Tk {o.amount.toFixed(2)}</span>
                  <span className={`text-[9px] font-bold uppercase ${o.status === 'Completed' ? 'text-emerald-400' : o.status === 'Cancelled' ? 'text-red-400' : 'text-blue-400'}`}>{o.status}</span>
                </label>
              ))}
            </div>
            <div className="mt-2.5 flex items-center space-x-2">
              <span className="text-[10px] text-gray-400">{bulkSelected.length} selected</span>
              <button onClick={bulkResolve} disabled={bulkSelected.length === 0} className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors ${bulkSelected.length === 0 ? 'bg-brand-dark text-gray-600 cursor-not-allowed' : 'bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 cursor-pointer'}`}>
                Resolve selected ({bulkSelected.length})
              </button>
            </div>
          </>
        )}
      </div>
      </>)}

      {/* ===== Order Analysis Workspace ===== */}
      {activeOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: order + report + fault + resolve + ledger */}
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-2"><Sparkles className="w-3.5 h-3.5 text-emerald-400" /><span>Auto Dispute Summary</span></h3>
              <p className="text-[10.5px] text-gray-300 leading-relaxed">{disputeSummary}</p>
            </div>
            <OrderCard order={activeOrder} onOpenProfile={(type, key, label) => { setProfileMonth('all'); setProfileView({ type, key, label }); }} />

            {/* Report details */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-400" /><span>Report Details</span></h3>
              {activeOrderReports.length === 0 ? (
                <p className="text-xs text-gray-500">No customer/driver report filed for this order.</p>
              ) : (
                activeOrderReports.map((r, i) => (
                  <div key={i} className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-red-300">{r.reason} · {r.time}</p>
                    {r.note && <p className="text-[10px] text-gray-400 mt-1">{r.note}</p>}
                  </div>
                ))
              )}
              {activeOrderReports.length > 1 && (
                <p className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">⚠ Duplicate reports — {activeOrderReports.length} reports filed for this order</p>
              )}
              {activeOrderReports.length > 0 && (
                <p className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">Predicted priority: <span className="font-black">{predictedPriority}</span></p>
              )}
              {csat !== null && (
                <p className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">CSAT: {csat.toFixed(1)}/5 · customer satisfied — all resolution steps done</p>
              )}
            </div>

            {/* Refund timeline + payment reversal log */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Timer className="w-3.5 h-3.5 text-blue-400" /><span>Refund Timeline</span></h3>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Pending', ok: refundTimeline?.hasReport, color: 'text-amber-400' },
                  { label: 'Processed', ok: refundTimeline?.processed, color: 'text-blue-400' },
                  { label: 'Settled', ok: refundTimeline?.settled, color: 'text-emerald-400' }
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase ${s.ok ? 'bg-brand-dark/40 ' + s.color + ' border-' + (i === 0 ? 'amber-500/30' : i === 1 ? 'blue-500/30' : 'emerald-500/30') : 'bg-brand-dark text-gray-600 border-brand-border'}`}>
                      {s.ok ? '✓ ' : ''}{s.label}
                    </span>
                    {i < 2 && <span className="text-gray-600 text-[10px]">→</span>}
                  </div>
                ))}
              </div>
              {refundTimeline && refundTimeline.credits > 0 && (
                <p className="text-[10px] text-gray-300">Total credited to customer: <span className="text-emerald-400 font-black">Tk {refundTimeline.credits.toFixed(2)}</span></p>
              )}
              <p className="text-[10px] text-gray-400">Method: <span className="text-white font-medium">{activeOrder.paymentMethod}</span>{activeOrder.codAmount && activeOrder.codAmount > 0 ? <span> · COD Tk {activeOrder.codAmount.toFixed(2)} + {activeOrder.paymentMethod} Tk {Math.max(0, activeOrder.amount - activeOrder.codAmount).toFixed(2)} (split payment)</span> : ''}</p>
              <div className="border-t border-brand-border/40 pt-2">
                <p className="text-[10px] font-bold text-gray-400 mb-1.5 flex items-center space-x-1.5"><Scale className="w-3 h-3 text-red-400" /><span>Payment Reversal Log</span></p>
                {(ledger[activeOrder.id] || []).length === 0 ? (
                  <p className="text-[10px] text-gray-500">No reversals recorded.</p>
                ) : (
                  <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
                    {(ledger[activeOrder.id] || []).map((e, i) => (
                      <p key={i} className={`text-[10px] bg-brand-dark/40 border border-brand-border rounded px-2 py-1 ${e.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {e.type === 'credit' ? 'CREDIT' : 'DEBIT'} · {partyLabel[e.party]} · Tk {e.amount.toFixed(2)} <span className="text-gray-500">{e.note} · {e.time}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fault analysis */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Activity className="w-3.5 h-3.5 text-brand-orange" /><span>Fault Analysis</span></h3>
              <p className="text-[10px] text-gray-500">Whose fault is this? Analyze each option and record the decision.</p>
              <div className="grid grid-cols-3 gap-2">
                {(['customer', 'driver', 'store'] as FaultParty[]).map(p => (
                  <button key={p} onClick={() => setFaultParty(p)} className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-[9px] font-bold cursor-pointer transition-colors ${faultParty === p ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-brand-dark border-brand-border text-gray-400 hover:border-brand-orange/40'}`}>
                    {partyIcon(p)}
                    {partyLabel[p]}
                  </button>
                ))}
              </div>
              <textarea
                value={faultNote}
                onChange={(e) => setFaultNote(e.target.value)}
                placeholder="Fault note — e.g. driver was 40 min late, store sent wrong item…"
                className="w-full bg-brand-dark border border-brand-border rounded-lg p-2 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600 min-h-[52px] resize-none"
              />
              <div className="flex items-center space-x-2">
                <button onClick={applySuggestion} className="flex-1 py-2 bg-brand-dark border border-brand-border text-emerald-400 text-[10px] font-black uppercase rounded-lg cursor-pointer hover:border-emerald-500/40 transition-colors">
                  <span className="inline-flex items-center space-x-1"><Wand2 className="w-3 h-3" /><span>Suggest</span></span>
                </button>
                <button onClick={recordFault} className="flex-1 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-black uppercase rounded-lg cursor-pointer transition-colors">
                  Record Decision
                </button>
              </div>
              {faultSuggestion && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                  <p className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1.5"><Wand2 className="w-3 h-3" /><span>Auto-suggested: {partyLabel[faultSuggestion]} is at fault</span></p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{suggestFault()?.basis}</p>
                </div>
              )}
              {faults[activeOrder.id] && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                  <p className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1.5">{partyIcon(faults[activeOrder.id].party)}<span>{partyLabel[faults[activeOrder.id].party]} is at fault</span><span className="text-emerald-500/60 font-mono">· {faults[activeOrder.id].time}</span></p>
                  {faults[activeOrder.id].note && <p className="text-[10px] text-gray-400 mt-1">{faults[activeOrder.id].note}</p>}
                </div>
              )}
              {faults[activeOrder.id] && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
                  <p className="text-[10px] font-bold text-blue-400 flex items-center space-x-1.5"><Zap className="w-3 h-3" /><span>Suggested resolution amounts (auto-calculated from fault)</span></p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[9px] font-black">Refund Tk {suggestedRefund.toFixed(2)}</span>
                    <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-[9px] font-black">Fine Tk {suggestedFine.toFixed(2)}</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md text-[9px] font-black">Compensate Tk {suggestedComp.toFixed(2)}</span>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1.5">Templates now use these amounts — click Refund Items / Fine Driver / Compensate to apply.</p>
                </div>
              )}
            </div>

            {/* Resolve */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><ListChecks className="w-3.5 h-3.5 text-emerald-400" /><span>Resolution Steps</span></h3>
              {activeOrder.items && activeOrder.items.length > 0 && (
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 flex items-center space-x-1.5"><Package className="w-3 h-3 text-blue-400" /><span>Partial refund — select items</span></p>
                  {(activeOrder.items || []).map(it => (
                    <label key={it.name} className="flex items-center space-x-2 text-[10px] text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={!!refundItems[it.name]} onChange={() => setRefundItems(prev => ({ ...prev, [it.name]: !prev[it.name] }))} className="accent-brand-orange cursor-pointer" />
                      <span>{it.quantity}× {it.name}</span>
                      <span className="ml-auto font-mono text-gray-500">Tk {(it.price * it.quantity).toFixed(2)}</span>
                    </label>
                  ))}
                  <button onClick={refundSelectedItems} className="w-full py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-emerald-500/20 transition-colors">
                    Refund selected items
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {templates.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)} className="px-2.5 py-1.5 bg-brand-dark border border-brand-border text-[9px] font-black rounded-lg cursor-pointer hover:border-brand-orange/50 hover:text-brand-orange transition-colors flex items-center space-x-1" title={`${t.label} (${t.amountLabel})`}>
                    <Zap className="w-3 h-3 text-brand-orange" />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400">Saved templates ({savedTemplates.length})</p>
                <button onClick={saveTemplate} className="px-2.5 py-1 bg-brand-dark border border-brand-border text-purple-400 rounded-lg text-[9px] font-bold cursor-pointer hover:border-purple-400/50 transition-colors" title="Save the current resolution steps as a reusable template">
                  Save current steps
                </button>
              </div>
              {savedTemplates.length > 0 && (
                <div className="space-y-1.5">
                  {savedTemplates.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-1.5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-200 truncate">{t.name}</p>
                        <p className="text-[9px] text-gray-500 truncate">{t.steps.length} steps · {t.steps.slice(0, 2).join(' / ')}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <button onClick={() => applySavedTemplate(t)} className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded text-[9px] font-bold cursor-pointer hover:bg-purple-500/20 transition-colors">Apply</button>
                        <button onClick={() => deleteTemplate(t.id)} className="p-1 text-gray-500 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={resolveInput}
                  onChange={(e) => setResolveInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addResolveAction(); }}
                  placeholder="e.g. Refund Tk 120, Resend item, Warn driver…"
                  className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600"
                />
                <button onClick={addResolveAction} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-brand-orange rounded-lg text-[10px] font-bold cursor-pointer hover:border-brand-orange/50">Add</button>
              </div>
              <div className="space-y-1.5">
                {(resolveActions[activeOrder.id] || []).map((a, i) => (
                  <button key={i} onClick={() => toggleResolveAction(i)} className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg border text-left cursor-pointer transition-colors ${a.done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-brand-dark border-brand-border hover:border-brand-orange/40'}`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${a.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}>
                      {a.done && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className={`text-[11px] ${a.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{a.text}</span>
                  </button>
                ))}
                {(resolveActions[activeOrder.id] || []).length === 0 && (
                  <p className="text-[10px] text-gray-500">No resolution steps added yet.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={copyDraft} className="py-2 bg-brand-dark border border-brand-border text-brand-orange rounded-lg text-[9px] font-black uppercase cursor-pointer hover:border-brand-orange/50 transition-colors" title="Copy WhatsApp / email notification draft">
                  <span className="inline-flex items-center space-x-1 justify-center w-full"><Zap className="w-3 h-3" /><span>Copy Draft</span></span>
                </button>
                <button onClick={fuelDeduction} className="py-2 bg-brand-dark border border-brand-border text-amber-400 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:border-amber-500/40 transition-colors" title="Debit driver for route cost / fuel">
                  <span className="inline-flex items-center space-x-1 justify-center w-full"><Zap className="w-3 h-3" /><span>Fuel Deduction</span></span>
                </button>
              </div>
            </div>

            {/* Credit / Debit ledger */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Scale className="w-3.5 h-3.5 text-blue-400" /><span>Credit / Debit Tracking</span></h3>
              <div className="grid grid-cols-3 gap-2">
                {(['customer', 'driver', 'store'] as FaultParty[]).map(p => (
                  <button key={p} onClick={() => setLedgerParty(p)} className={`px-2 py-1.5 rounded-lg border text-[9px] font-bold cursor-pointer ${ledgerParty === p ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-brand-dark border-brand-border text-gray-400'}`}>
                    {partyLabel[p]}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                {(['credit', 'debit'] as const).map(t => (
                  <button key={t} onClick={() => setLedgerType(t)} className={`flex-1 px-2 py-1.5 rounded-lg border text-[9px] font-black uppercase cursor-pointer ${ledgerType === t ? (t === 'credit' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-red-500/15 border-red-500/40 text-red-400') : 'bg-brand-dark border-brand-border text-gray-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={ledgerAmount}
                  onChange={(e) => setLedgerAmount(e.target.value)}
                  placeholder="Tk amount"
                  className="w-24 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600"
                />
                <input
                  type="text"
                  value={ledgerNote}
                  onChange={(e) => setLedgerNote(e.target.value)}
                  placeholder="Note (refund, fine, compensation…)"
                  className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-brand-orange placeholder:text-gray-600"
                />
                <button onClick={addLedgerEntry} className="px-3 py-1.5 bg-brand-dark border border-brand-border text-blue-400 rounded-lg text-[10px] font-bold cursor-pointer hover:border-blue-400/50">Add</button>
              </div>

              <div className="space-y-2">
                {(() => {
                  const entries = ledger[activeOrder.id] || [];
                  const totals = partyTotals(entries);
                  return (
                    <>
                      {entries.length === 0 && <p className="text-[10px] text-gray-500">No credit/debit entries yet. Track refunds, fines and compensations here.</p>}
                      {entries.map((e, i) => (
                        <div key={i} className="group flex items-center justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-1.5">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] font-black ${e.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>{e.type === 'credit' ? 'CREDIT' : 'DEBIT'}</span>
                            <span className="text-[10px] text-gray-300">{partyLabel[e.party]}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <p className={`font-mono text-[11px] font-bold ${e.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>{e.type === 'credit' ? '+' : '−'}Tk {e.amount.toFixed(2)}</p>
                              <p className="text-[9px] text-gray-500">{e.note} · {e.time}</p>
                            </div>
                            <button
                              onClick={() => removeLedgerEntry(i)}
                              className="p-1 rounded bg-brand-dark border border-brand-border text-gray-500 hover:text-red-400 hover:border-red-500/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Remove this entry (undo)"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-brand-border/40 pt-2 grid grid-cols-3 gap-2">
                        {(['customer', 'driver', 'store'] as FaultParty[]).map(p => {
                          const net = totals[p].credit - totals[p].debit;
                          return (
                            <div key={p} className="bg-brand-dark/40 rounded-lg p-2 text-center">
                              <p className="text-[9px] font-bold text-gray-500">{partyLabel[p]}</p>
                              <p className={`font-mono text-[11px] font-black ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                {net > 0 ? '+' : net < 0 ? '−' : ''}Tk {Math.abs(net).toFixed(2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right: tracking + activity + chat */}
          <div className="space-y-4 lg:col-span-2">
            {/* Tracking timeline */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><History className="w-3.5 h-3.5 text-brand-orange" /><span>Order Tracking Timeline</span></h3>
              <div className="space-y-3">
                {[
                  { label: 'Order Placed', value: activeOrder.date + (activeOrder.time ? ` · ${activeOrder.time}` : ''), done: true },
                  { label: 'Store Received', value: activeOrder.status !== 'Pending' ? 'Confirmed by store' : 'Awaiting store confirmation', done: activeOrder.status !== 'Pending' },
                  { label: 'Driver Assigned', value: activeOrder.driverId ? `Driver ${activeOrder.driverId}` : 'No driver assigned yet', done: !!activeOrder.driverId },
                  { label: 'On the Way', value: activeOrder.status === 'Ongoing' || activeOrder.status === 'Completed' ? 'Out for delivery' : '—', done: activeOrder.status === 'Ongoing' || activeOrder.status === 'Completed' },
                  { label: 'Delivered', value: activeOrder.status === 'Completed' ? 'Delivered successfully' : activeOrder.status === 'Cancelled' ? 'Cancelled' : '—', done: activeOrder.status === 'Completed' },
                  { label: 'Report Filed', value: activeOrderReports.length > 0 ? activeOrderReports.map(r => `${r.reason} · ${r.time}`).join(', ') : 'No report', done: activeOrderReports.length > 0 }
                ].map((step, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${step.done ? 'border-emerald-400 bg-emerald-400/20' : 'border-gray-600'}`}>
                        {step.done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                      </div>
                      {i < 5 && <div className="w-px flex-1 bg-brand-border/50 my-0.5" />}
                    </div>
                    <div className="pb-3">
                      <p className={`text-[11px] font-bold ${step.done ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                      <p className="text-[10px] text-gray-500">{step.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Route mini-map */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Navigation className="w-3.5 h-3.5 text-emerald-400" /><span>Route Map</span></h3>
              <div className="relative bg-brand-dark/40 border border-brand-border rounded-lg p-3">
                <svg viewBox="0 0 300 60" className="w-full h-14">
                  <line x1="8" y1="30" x2="292" y2="30" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" />
                  <circle cx="8" cy="30" r="5" fill="#10b981" />
                  <text x="8" y="12" fontSize="8" fill="#10b981" fontWeight="bold">{activeOrder.pickupLocation || activeOrder.storeName}</text>
                  <circle cx="292" cy="30" r="5" fill="#f97316" />
                  <text x="292" y="52" fontSize="8" fill="#f97316" fontWeight="bold" textAnchor="end">{activeOrder.zone || activeOrder.address.slice(0, 18)}</text>
                </svg>
                <p className="text-[9px] text-gray-500 mt-1">{route && route.has ? 'Live coordinates available (pickup → delivery)' : 'Route line shown from store pickup to delivery address'}</p>
              </div>
            </div>

            {/* SLA / timing metrics */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Timer className="w-3.5 h-3.5 text-amber-400" /><span>SLA & Timing</span></h3>
              <div className="space-y-2">
                {slaSteps.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2">
                      {s.reached ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-gray-500" />}
                      <span className={`text-[10px] font-bold ${s.reached ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                    </div>
                    <span className={`text-[9px] font-black ${s.reached ? 'text-emerald-400' : 'text-gray-500'}`}>{s.reached ? 'MET · ' + s.target : 'PENDING · ' + s.target}</span>
                  </div>
                ))}
              </div>
              {placedTime && reportTime && elapsedToReport !== null ? (
                <div className={`mt-2.5 rounded-lg p-2.5 border ${elapsedToReport <= deliveryTarget ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <p className={`text-[10px] font-bold ${elapsedToReport <= deliveryTarget ? 'text-emerald-400' : 'text-red-400'}`}>
                    Response window: {elapsedToReport} min ({placedTime} → {reportTime})
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {elapsedToReport <= deliveryTarget
                      ? `Report filed within the ${Math.round(deliveryTarget)}-min target.`
                      : `Filed ${elapsedToReport - Math.round(deliveryTarget)} min over the ${Math.round(deliveryTarget)}-min target — SLA breached.`}
                  </p>
                </div>
              ) : (
                <p className="mt-2.5 text-[9px] text-gray-500">Placement / report timestamps unavailable for duration math.</p>
              )}
              {elapsedToReport !== null && elapsedToReport > deliveryTarget && (
                <button onClick={applySlaFine} className="mt-2.5 w-full py-2 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase rounded-lg cursor-pointer hover:bg-red-500/25 transition-colors" title="Posts a driver debit for the SLA breach">
                  <span className="inline-flex items-center space-x-1"><Zap className="w-3 h-3" /><span>Apply Auto-Fine to Driver (SLA breached)</span></span>
                </button>
              )}
            </div>

            {/* Per-party time + activity */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Clock className="w-3.5 h-3.5 text-blue-400" /><span>Who did what & how long</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { party: 'customer' as FaultParty, value: activeOrder.status, hint: `${activeOrder.customerName} ordered at ${activeOrder.time || activeOrder.date}${activeOrderReports.length ? ' — filed a report' : ''}` },
                  { party: 'store' as FaultParty, value: activeOrder.status === 'Pending' ? 'No response' : 'Responded', hint: `${activeOrder.storeName} ${activeOrder.status === 'Pending' ? 'has not confirmed the order yet' : 'confirmed & prepared the order'}` },
                  { party: 'driver' as FaultParty, value: activeOrder.driverId ? 'Assigned' : 'Not assigned', hint: activeOrder.driverId ? `Driver ${activeOrder.driverId} handles delivery` : 'No rider dispatched yet' }
                ].map((s, i) => (
                  <div key={i} className="bg-brand-dark/40 border border-brand-border rounded-lg p-3">
                    <div className="flex items-center space-x-1.5 mb-1">
                      {partyIcon(s.party)}
                      <span className="text-[10px] font-bold text-gray-300">{partyLabel[s.party]}</span>
                    </div>
                    <p className="text-[11px] font-black text-white">{s.value}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{s.hint}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t border-brand-border/40 pt-3">
                <p className="text-[10px] font-bold text-gray-400 mb-2">Chat activity on this order</p>
                {activityPerParty().length === 0 ? (
                  <p className="text-[10px] text-gray-500">No chat messages exchanged for this order yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {activityPerParty().map((p, i) => (
                      <div key={i} className="bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-white">{p.party}</p>
                          <p className="text-[9px] text-gray-500">First {p.first} · Last {p.last}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black text-brand-orange">{p.count} msg</p>
                          {p.photos > 0 && <p className="text-[9px] text-blue-400">{p.photos} photo(s)</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat log + photos */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><MessageSquare className="w-3.5 h-3.5 text-brand-orange" /><span>Customer ↔ Driver Chat & Photos</span></h3>
              {activeOrderChat.length === 0 ? (
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-6 text-center">
                  <MessageSquare className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-[10px] text-gray-500">No messages logged for this order.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {partyChatGroups.map(group => (
                    <div key={group.party}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider flex items-center space-x-1 ${group.party === 'driver' ? 'text-orange-400' : 'text-blue-400'}`}>
                          {group.party === 'driver' ? <Truck className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          <span>{group.party === 'driver' ? 'Driver evidence' : 'Customer evidence'}</span>
                        </span>
                        <span className="text-[9px] text-gray-500">{group.entries.length} msg · {group.entries.filter(e => e.image).length} photo(s)</span>
                      </div>
                      <div className="space-y-1.5">
                        {[...group.entries].reverse().map((log, idx) => (
                          <div key={idx} className={`flex ${group.party === 'driver' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[70%] rounded-xl px-3 py-2 ${group.party === 'driver' ? 'bg-brand-dark border border-brand-border' : 'bg-brand-orange/15 border border-brand-orange/30'}`}>
                              <p className={`text-[9px] font-bold mb-1 ${group.party === 'driver' ? 'text-orange-400' : 'text-blue-400'}`}>
                                {group.party === 'driver' ? 'DRIVER' : 'CUSTOMER'} · {log.time} · {log.orderId}
                              </p>
                              {log.image ? (
                                <div>
                                  <img src={log.image} alt="chat attachment" className="max-w-full max-h-36 rounded-lg border border-brand-border/50" />
                                  <p className="text-[9px] text-gray-400 mt-1">📷 Photo attached</p>
                                </div>
                              ) : (
                                <p className="text-[11px] text-gray-100">{log.text}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Proof of delivery photos */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5"><Package className="w-3.5 h-3.5 text-blue-400" /><span>Proof of Delivery</span></h3>
                {(proofs[activeOrder.id] || []).length > 0 && (
                  <button onClick={() => setGalleryOpen(true)} className="px-2.5 py-1 bg-brand-dark border border-brand-border text-blue-400 rounded-lg text-[9px] font-bold cursor-pointer hover:border-blue-400/50 transition-colors">
                    Gallery ({(proofs[activeOrder.id] || []).length})
                  </button>
                )}
              </div>
              <label className="block w-full py-2 bg-brand-dark border border-dashed border-brand-border rounded-lg text-center text-[10px] font-bold text-blue-400 cursor-pointer hover:border-blue-400/50 transition-colors">
                + Attach delivery proof photo
                <input type="file" accept="image/*" className="hidden" onChange={attachProof} />
              </label>
              <div className="mt-2">
                {(proofs[activeOrder.id] || []).length === 0 && <p className="text-[10px] text-gray-500">No delivery proof photos attached yet.</p>}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(proofs[activeOrder.id] || []).map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt={`delivery proof ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-brand-border/50" />
                      <button
                        onClick={() => setProofs(prev => ({ ...prev, [activeOrder.id]: (prev[activeOrder.id] || []).filter((_, j) => j !== i) }))}
                        className="absolute top-1 right-1 p-0.5 bg-black/60 text-red-400 rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin audit trail */}
            <div className="bg-brand-card border border-brand-border rounded-xl p-4">
              <h3 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-3"><Clock className="w-3.5 h-3.5 text-purple-400" /><span>Admin Audit Trail</span></h3>
              {(audit[activeOrder.id] || []).length === 0 ? (
                <p className="text-[10px] text-gray-500">No admin actions recorded for this order yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {[...(audit[activeOrder.id] || [])].reverse().map((a, i) => (
                    <div key={i} className="flex items-start justify-between bg-brand-dark/40 border border-brand-border rounded-lg px-3 py-1.5">
                      <div>
                        <p className="text-[10px] font-bold text-white">{a.action}</p>
                        <p className="text-[9px] text-gray-400">{a.detail}</p>
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono shrink-0 ml-2">{a.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Tickets List */}
          <div className={`space-y-3 lg:col-span-1 ${activeTicketId ? 'hidden lg:block' : 'block'}`}>
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Support Tickets</h3>

            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center">
                  <p className="text-xs text-gray-400">No tickets in this category right now.</p>
                </div>
              )}
              {filtered.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${activeTicketId === ticket.id ? 'bg-brand-orange/5 border-brand-orange shadow-lg' : 'bg-brand-card border-brand-border hover:border-brand-orange/30'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-gray-300">{ticket.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${ticket.priority === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/10' : ticket.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/10' : 'bg-blue-500/10 text-blue-400 border border-blue-500/10'}`}>
                      {ticket.priority} Priority
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{ticket.subject}</h4>
                  <p className="text-[10px] text-gray-400 mb-3">By {ticket.user} • {ticket.date}{ticketAging(ticket.id) !== null && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${ticketAging(ticket.id)! >= 2 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{ticketAging(ticket.id)}d old</span>
                  )}{ticket.status !== 'Resolved' && ticketAging(ticket.id) !== null && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${ticketAging(ticket.id)! > ticketSla(ticket).target ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>SLA {ticketAging(ticket.id)}d/{ticketSla(ticket).target}d</span>
                  )}</p>

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${ticket.status === 'Open' ? 'bg-red-500/10 text-red-400' : ticket.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {ticket.status}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center space-x-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{ticket.messages.length}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation Thread */}
          <div className={`lg:col-span-2 bg-brand-card border border-brand-border rounded-xl flex flex-col h-[550px] shadow-sm overflow-hidden ${!activeTicketId ? 'hidden lg:flex justify-center items-center text-center p-8' : 'flex'}`}>
            {activeTicket ? (
              <>
                <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-dark/25">
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setActiveTicketId(null)} className="p-1.5 hover:bg-brand-dark text-gray-400 hover:text-white rounded lg:hidden cursor-pointer">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-gray-400">{activeTicket.id}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${activeTicket.priority === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          {activeTicket.priority} Priority
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-xs mt-0.5">{activeTicket.subject}</h3>
                      <p className="text-[10px] text-gray-400">Owner: {activeTicket.user} · Auto-assigned: <span className="text-brand-orange font-bold">{agentOf(activeTicket.id)}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={activeTicket.status}
                      onChange={(e) => changeStatus(activeTicket.id, e.target.value as any)}
                      className="bg-brand-dark text-gray-200 border border-brand-border rounded px-2.5 py-1 text-[11px] outline-none cursor-pointer focus:border-brand-orange"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-brand-dark/10">
                  {activeTicket.messages.map((msg, idx) => {
                    const isAdmin = msg.sender === 'admin';
                    const richMsg = msg as any;
                    return (
                      <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-3.5 ${isAdmin ? 'bg-brand-orange text-white rounded-br-none' : 'bg-brand-dark border border-brand-border text-gray-100 rounded-bl-none'}`}>
                          <p className="text-xs leading-relaxed">{msg.text}</p>
                          {richMsg.linkUrl && <a href={richMsg.linkUrl} target="_blank" rel="noreferrer" className={`mt-2 block break-all text-[10px] underline ${isAdmin ? 'text-orange-100' : 'text-brand-orange'}`}>{richMsg.linkUrl}</a>}
                          {richMsg.attachmentUrl && (
                            <a href={richMsg.attachmentUrl} target="_blank" rel="noreferrer" className={`mt-2 inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold ${isAdmin ? 'bg-white/15 text-white' : 'bg-sky-500/10 text-sky-300 border border-sky-500/30'}`}>
                              {richMsg.attachmentName || 'Open attachment'}
                            </a>
                          )}
                          <p className={`text-[9px] mt-1.5 text-right ${isAdmin ? 'text-orange-100' : 'text-gray-500 font-mono'}`}>
                            {msg.time} {isAdmin ? '(You)' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeTicket.status !== 'Resolved' ? (
                  <form onSubmit={handleSend} className="p-3 border-t border-brand-border bg-brand-dark/25 flex items-center space-x-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type administrative reply to support chat..."
                      className="flex-1 bg-brand-dark px-4 py-2 border border-brand-border rounded-lg text-xs text-white outline-none focus:border-brand-orange"
                    />
                    <button type="submit" className="p-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg cursor-pointer transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-emerald-500/5 border-t border-brand-border text-center text-xs text-emerald-400 font-medium flex items-center justify-center space-x-1.5">
                    <Check className="w-4 h-4" />
                    <span>This support ticket has been resolved. Change status to reopen.</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center space-y-2 p-8">
                <LifeBuoy className="w-12 h-12 text-gray-600 mx-auto stroke-1" />
                <h4 className="font-semibold text-gray-300 text-xs">No Active Ticket Selected</h4>
                <p className="text-[11px] text-gray-500 max-w-xs mx-auto">Select any ticket from the support desk queue to view details and message the customer or dispatch rider.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof-of-delivery gallery */}
      {galleryOpen && activeOrder && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setGalleryOpen(false)}>
          <div className="bg-[#0d1526] border border-brand-border/60 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-white">Proof Gallery — {activeOrder.id}</h3>
              <button onClick={() => setGalleryOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {(proofs[activeOrder.id] || []).length === 0 ? (
              <p className="text-xs text-gray-500">No proof photos attached yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(proofs[activeOrder.id] || []).map((img, i) => (
                  <img key={i} src={img} alt={`delivery proof ${i + 1}`} className="w-full h-40 object-cover rounded-xl border border-brand-border/50" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer / Driver 360 Profile drawer */}
      {profileView && profileData && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-brand-border/60 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-brand-border/40 flex items-center justify-between sticky top-0 bg-[#0d1526]">
              <div>
                <h3 className="text-sm font-black text-white">{profileData.label} — 360 Profile</h3>
                <p className="text-[10px] text-gray-400">{profileView.type === 'customer' ? 'Customer' : 'Driver'} history across all orders</p>
              </div>
              <button onClick={() => setProfileView(null)} className="p-1.5 text-gray-400 hover:text-white rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setProfileMonth('all')} className={`px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer ${profileMonth === 'all' ? 'bg-brand-orange border-brand-orange text-white' : 'bg-brand-dark border-brand-border text-gray-400 hover:border-brand-orange/40'}`}>All</button>
                {profileMonths.map(m => (
                  <button key={m} onClick={() => setProfileMonth(m)} className={`px-2.5 py-1 rounded-full text-[9px] font-bold border cursor-pointer ${profileMonth === m ? 'bg-brand-orange border-brand-orange text-white' : 'bg-brand-dark border-brand-border text-gray-400 hover:border-brand-orange/40'}`}>{m}</button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                  <p className="text-lg font-black text-white">{profileData.orders.length}</p>
                  <p className="text-[9px] font-bold text-gray-500">Orders</p>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                  <p className="text-lg font-black text-brand-orange">Tk {profileData.totalSpent.toFixed(0)}</p>
                  <p className="text-[9px] font-bold text-gray-500">{profileView.type === 'customer' ? 'Spent' : 'Delivered'}</p>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                  <p className={`text-lg font-black ${profileData.faultCount > 0 ? 'text-amber-400' : 'text-gray-600'}`}>{profileData.faultCount}</p>
                  <p className="text-[9px] font-bold text-gray-500">At fault</p>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-2.5 text-center">
                  {profileView.type === 'customer' ? (
                    <>
                      <p className={`text-lg font-black ${profileData.totalSpent > 5000 ? 'text-emerald-400' : profileData.totalSpent > 2000 ? 'text-blue-400' : profileData.totalSpent > 500 ? 'text-amber-400' : 'text-gray-500'}`}>
                        {profileData.totalSpent > 5000 ? 'A' : profileData.totalSpent > 2000 ? 'B' : profileData.totalSpent > 500 ? 'C' : 'D'}
                      </p>
                      <p className="text-[9px] font-bold text-gray-500">LTV grade</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-black text-emerald-400">Tk {Math.max(0, profileData.totalSpent - profileData.ledger.reduce((s, e) => s + e.amount, 0)).toFixed(0)}</p>
                      <p className="text-[9px] font-bold text-gray-500">Net earnings</p>
                    </>
                  )}
                </div>
              </div>
              {profileView.type === 'driver' && (() => {
                const sc = driverScorecards.find(d => d.driver === profileView.key);
                return sc ? (
                  <p className="text-[10px] text-gray-400">Scorecard: {sc.orders} orders · {sc.breaches} SLA breach · Tk {sc.fines.toFixed(0)} fines · grade <span className={`font-black ${sc.grade === 'A' ? 'text-emerald-400' : sc.grade === 'B' ? 'text-amber-400' : 'text-red-400'}`}>{sc.grade}</span></p>
                ) : null;
              })()}

              <div className="border-t border-brand-border/40 pt-2">
                <p className="text-[10px] font-bold text-gray-400 mb-1.5 flex items-center space-x-1.5"><Package className="w-3 h-3 text-brand-orange" /><span>Order history ({filteredProfileOrders.length})</span></p>
                {filteredProfileOrders.length === 0 ? (
                  <p className="text-[10px] text-gray-500">No orders in this period.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredProfileOrders.map(o => (
                      <button key={o.id} onClick={() => { setActiveOrderId(o.id); setProfileView(null); }} className="w-full text-left bg-brand-dark/40 border border-brand-border rounded px-2 py-1.5 text-[10px] text-gray-300 hover:border-brand-orange/40 cursor-pointer">
                        <span className="font-mono text-gray-500">{o.id}</span> — {o.storeName} → Tk {o.amount.toFixed(2)} <span className={`ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${o.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : o.status === 'Cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{o.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-brand-border/40 pt-2">
                <p className="text-[10px] font-bold text-gray-400 mb-1.5 flex items-center space-x-1.5"><AlertCircle className="w-3 h-3 text-red-400" /><span>Disputes / Reports ({filteredProfileReports.length})</span></p>
                {filteredProfileReports.length === 0 ? (
                  <p className="text-[10px] text-gray-500">No reports in this period.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredProfileReports.map((r, i) => (
                      <p key={i} className="text-[10px] text-gray-300 bg-brand-dark/40 border border-brand-border rounded px-2 py-1"><span className="font-mono text-gray-500">{r.orderId}</span> — {r.reason} · {r.time}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-brand-border/40 pt-2">
                <p className="text-[10px] font-bold text-gray-400 mb-1.5 flex items-center space-x-1.5"><Scale className="w-3 h-3 text-blue-400" /><span>Credit / Debit for this {profileView.type}</span></p>
                {profileData.ledger.length === 0 ? (
                  <p className="text-[10px] text-gray-500">No credit/debit entries.</p>
                ) : (
                  <div className="space-y-1">
                    {profileData.ledger.map((e, i) => (
                      <p key={i} className={`text-[10px] bg-brand-dark/40 border border-brand-border rounded px-2 py-1 ${e.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                        <span className="font-mono text-gray-500">{e.orderId}</span> — {e.type.toUpperCase()} Tk {e.amount.toFixed(2)} · {e.note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onOpenProfile }: { order: Order; onOpenProfile?: (type: 'customer' | 'driver', key: string, label: string) => void }) {
  return (
    <div className="bg-brand-dark/40 border border-brand-border rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-white">#{order.id}</span>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${order.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : order.status === 'Cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{order.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <p className="text-gray-400">Store: <span className="text-white font-medium">{order.storeName}</span></p>
        <p className="text-gray-400">Customer: <button onClick={() => onOpenProfile?.('customer', order.customerName, order.customerName)} className="text-white font-medium underline decoration-dotted hover:text-brand-orange cursor-pointer" title="View customer 360 profile">{order.customerName}</button></p>
        <p className="text-gray-400">Amount: <span className="text-white font-medium">Tk {order.amount.toFixed(2)}</span></p>
        <p className="text-gray-400">Payment: <span className="text-white font-medium">{order.paymentMethod}</span></p>
        <p className="text-gray-400">Driver: {order.driverId ? <button onClick={() => onOpenProfile?.('driver', order.driverId!, order.driverId)} className="text-white font-medium underline decoration-dotted hover:text-brand-orange cursor-pointer" title="View driver 360 profile">{order.driverId}</button> : <span className="text-white font-medium">Unassigned</span>}</p>
        <p className="text-gray-400">Placed: <span className="text-white font-medium">{order.date}{order.time ? ` · ${order.time}` : ''}</span></p>
        <p className="text-gray-400">Address: <span className="text-white font-medium truncate">{order.address}</span></p>
        {order.extraStores && order.extraStores.length > 0 && (
          <p className="text-gray-400 col-span-2">Multi-store: <span className="text-white font-medium">{order.extraStores.join(' + ')}</span></p>
        )}
        {order.scheduledSlot && (
          <p className="text-gray-400 col-span-2">Scheduled: <span className="text-amber-400 font-medium">{order.scheduledSlot}</span></p>
        )}
      </div>
      {order.items && order.items.length > 0 && (
        <div className="border-t border-brand-border/40 pt-1.5 text-[11px]">
          <p className="text-gray-500 font-bold uppercase text-[9px] mb-1">Items</p>
          {order.items.map((it, i) => (
            <p key={i} className="text-gray-300 flex justify-between"><span>{it.quantity}× {it.name}</span><span className="font-mono">Tk {(it.price * it.quantity).toFixed(2)}</span></p>
          ))}
        </div>
      )}
    </div>
  );
}

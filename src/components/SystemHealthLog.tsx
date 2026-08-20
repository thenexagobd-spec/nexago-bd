import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BellRing, CheckCircle2, Clock, Database, Download, HardDrive, Lock, PlayCircle, RefreshCw, RotateCcw, Server, ShieldCheck, WifiOff } from 'lucide-react';

type HealthPayload = {
  ok?: boolean;
  checkedAt?: string;
  backup?: {
    automaticEnabled?: boolean;
    running?: boolean;
    status?: string;
    latest?: { name?: string; sizeLabel?: string; createdAt?: string } | null;
    nextRunAt?: string | null;
    intervalMinutes?: number;
    retention?: number;
    localJsonBackupCount?: number;
    files?: Array<{ name: string; sizeLabel: string; createdAt: string }>;
    integrity?: { score: number; status: string; warnings: string[] };
  };
  storage?: {
    databaseConfigured?: boolean;
    databaseSizeEstimate?: string;
    localDataSize?: string;
    backupStorageSize?: string;
    localCounts?: Record<string, number>;
    tableCounts?: Record<string, { table: string; count?: number; error?: string }>;
  };
  server?: {
    uptimeSeconds?: number;
    cpuLoadPercent?: number;
    memoryUsed?: string;
    heapUsed?: string;
    freeSystemMemory?: string;
    totalSystemMemory?: string;
    platform?: string;
  };
  activity?: {
    activeKeys?: Array<{ key: string; count: number; lastAt: string; lastPath: string; ip: string; device: string }>;
    branches?: Array<{ key: string; orders: number; completed: number; revenue: number; posSales: number; printerStatus: string; lastOrderAt: string }>;
    auditTail?: Array<{ id?: string; action?: string; actor?: string; role?: string; time?: string; reason?: string }>;
    auditCount?: number;
    websocketSubscribers?: Array<{ key: string; subscribers: number }>;
    conflicts?: Array<{ group: string; id: string; reason: string }>;
    incidents?: Array<{ id?: string; action?: string; actor?: string; time?: string; reason?: string }>;
  };
  protection?: {
    score?: number;
    total?: number;
    checks?: Array<{ key: string; label: string; ok: boolean }>;
  };
  recovery?: {
    rpoMinutes?: number | null;
    rtoEstimateMinutes?: number | null;
    lockdown?: { active?: boolean; reason?: string; actor?: string; revoked?: number; updatedAt?: string };
    dependencies?: Array<{ name: string; status: string }>;
  };
};

const configuredApiBase = ((import.meta.env.VITE_RELAY_BASE as string) || '').replace(/\/+$/, '');
const API_BASE = (configuredApiBase || window.location.origin).replace(/\/+$/, '');

const readQueueCount = (key: string) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

const fmtTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Not available' : d.toLocaleString();
};

const fmtUptime = (seconds = 0) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

const statusClass = (status?: string) => {
  if (status === 'Success') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (status === 'Pending' || status === 'Running') return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
  return 'text-red-300 bg-red-500/10 border-red-500/30';
};

export default function SystemHealthLog() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [offlineOrders, setOfflineOrders] = useState(0);
  const [offlineStates, setOfflineStates] = useState(0);
  const [actionMsg, setActionMsg] = useState('');
  const [restoreTarget, setRestoreTarget] = useState('');
  const [restoreReason, setRestoreReason] = useState('');
  const [restoreConfirm, setRestoreConfirm] = useState('');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [scanReport, setScanReport] = useState<any>(null);

  const key = useMemo(() => new URLSearchParams(window.location.search).get('key') || localStorage.getItem('sd_store_key') || 'nexago-main', []);

  const refreshLocalQueues = () => {
    setOfflineOrders(readQueueCount('nexago_offline_order_queue_v1'));
    setOfflineStates(readQueueCount('nexago_offline_state_queue_v1'));
  };

  const loadHealth = async () => {
    setLoading(true);
    refreshLocalQueues();
    try {
      const token = localStorage.getItem('sd_security_session') || '';
      const res = await fetch(`${API_BASE}/api/system/health?key=${encodeURIComponent(key)}`, {
        headers: token ? { 'X-Session-Token': token } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || 'SYSTEM_HEALTH_UNAVAILABLE');
      setHealth(data);
      setError('');
    } catch (err: any) {
      setError(String(err?.message || err || 'SYSTEM_HEALTH_UNAVAILABLE'));
    } finally {
      setLoading(false);
    }
  };

  const systemApi = async (path: string, body?: Record<string, any>) => {
    const token = localStorage.getItem('sd_security_session') || '';
    const res = await fetch(`${API_BASE}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(token ? { 'X-Session-Token': token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || 'SYSTEM_ACTION_FAILED');
    return data;
  };

  const triggerBackup = async () => {
    try {
      setActionMsg('Starting backup...');
      await systemApi('/api/system/backup/run', {});
      setActionMsg('Manual backup started. Refresh after a moment.');
      window.setTimeout(() => void loadHealth(), 4000);
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Backup failed'));
    }
  };

  const testAlert = async () => {
    try {
      setActionMsg('Sending test alert...');
      const result = await systemApi('/api/system/alert/test', {});
      setActionMsg(`Test alert sent. Telegram: ${result.telegramConfigured ? 'configured' : 'not configured'}, Webhook: ${result.webhookConfigured ? 'configured' : 'not configured'}.`);
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Alert test failed'));
    }
  };

  const verifyBackup = async (name: string) => {
    try {
      setActionMsg(`Verifying ${name}...`);
      const result = await systemApi('/api/system/backup/verify', { name });
      setActionMsg(`Backup verified: ${name} (${result.durationMs || 0}ms)`);
      void loadHealth();
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Backup verify failed'));
      void loadHealth();
    }
  };

  const simulateRestore = async (name: string) => {
    try {
      setActionMsg(`Running restore simulation for ${name}...`);
      const result = await systemApi('/api/system/backup/simulate-restore', { name });
      setSimulationResult(result);
      setActionMsg(`Restore simulation completed: ${result.tables?.length || 0} tables detected.`);
      void loadHealth();
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Restore simulation failed'));
      void loadHealth();
    }
  };

  const toggleLockdown = async (active: boolean) => {
    const reason = active ? 'Emergency lockdown from System Health' : 'Emergency lockdown released from System Health';
    try {
      const result = await systemApi('/api/system/emergency-lockdown', { active, reason });
      setActionMsg(active ? `Lockdown enabled. Revoked ${result.lockdown?.revoked || 0} sessions.` : 'Lockdown disabled.');
      void loadHealth();
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Lockdown action failed'));
    }
  };

  const runFullScan = async () => {
    try {
      setActionMsg('Running full system scan...');
      const result = await systemApi('/api/system/full-scan', {});
      setScanReport(result.report);
      setActionMsg(`Full scan complete: ${result.report.scanId}`);
      void loadHealth();
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Full scan failed'));
    }
  };

  const createIncident = async (subject = 'System Health Incident', message = 'Created from System Health') => {
    try {
      const result = await systemApi('/api/system/incident/create', { subject, message, priority: 'High' });
      setActionMsg(`Incident created: ${result.incident?.id || subject}`);
      void loadHealth();
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Incident create failed'));
    }
  };

  const runSystemAction = async (action: string, reason: string) => {
    try {
      const result = await systemApi('/api/system/action', { action, reason });
      setActionMsg(`${action} completed: ${result.result?.status || 'saved'}`);
      if (result.result?.checklist) setScanReport({ scanId: 'RECOVERY-CHECKLIST', dependencyMissing: [], integrity: { score: 100 }, conflicts: 0, backupCount: 0, checklist: result.result.checklist });
      if (result.result?.dependencies) setScanReport({ scanId: 'DEPENDENCY-RECHECK', dependencyMissing: result.result.dependencies.filter((d: any) => !d.ok).map((d: any) => d.name), integrity: { score: 100 }, conflicts: 0, backupCount: 0 });
      void loadHealth();
    } catch (err: any) {
      setActionMsg(String(err?.message || err || `${action} failed`));
    }
  };

  const reviewConflict = async (conflict: { group: string; id: string; reason: string }) => {
    try {
      await systemApi('/api/system/conflict/review', conflict);
      setActionMsg(`Conflict reviewed: ${conflict.group} ${conflict.id}`);
      void loadHealth();
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Conflict review failed'));
    }
  };

  const exportReport = () => {
    const report = { exportedAt: new Date().toISOString(), health, localOfflineQueue: { orders: offlineOrders, states: offlineStates }, scanReport };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexago-system-health-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setActionMsg('System health report exported.');
  };

  const downloadBackup = (name: string) => {
    const token = localStorage.getItem('sd_security_session') || '';
    const url = `${API_BASE}/api/system/backup/download?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}`;
    fetch(url, { headers: token ? { 'X-Session-Token': token } : {} })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'DOWNLOAD_FAILED');
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        setActionMsg(`Downloaded ${name}`);
      })
      .catch((err) => setActionMsg(String(err?.message || err || 'Download failed')));
  };

  const requestRestore = async () => {
    if (!restoreTarget) return;
    try {
      await systemApi('/api/system/backup/restore-request', { name: restoreTarget, reason: restoreReason, confirmText: restoreConfirm });
      setActionMsg(`Restore request saved for ${restoreTarget}`);
      setRestoreTarget('');
      setRestoreReason('');
      setRestoreConfirm('');
      void loadHealth();
    } catch (err: any) {
      setActionMsg(String(err?.message || err || 'Restore request failed'));
    }
  };

  useEffect(() => {
    void loadHealth();
    const timer = window.setInterval(() => void loadHealth(), 30_000);
    const onStorage = () => refreshLocalQueues();
    window.addEventListener('storage', onStorage);
    window.addEventListener('nexago-local-write', onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('nexago-local-write', onStorage);
    };
  }, []);

  const backupStatus = health?.backup?.running ? 'Running' : health?.backup?.status;
  const pendingQueue = offlineOrders + offlineStates;
  const commandGroups = [
    {
      title: 'Recovery',
      items: [
        { label: 'Full Scan', icon: Activity, run: () => runFullScan() },
        { label: 'Trigger Backup', icon: PlayCircle, run: () => triggerBackup(), disabled: !!health?.backup?.running },
        { label: 'Backup Drill', icon: Database, run: () => runSystemAction('backup-drill-ticket', 'Create backup drill ticket') },
        { label: 'Recovery Checklist', icon: ShieldCheck, run: () => runSystemAction('recovery-checklist', 'Generate recovery checklist') },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Maintenance On', icon: Clock, run: () => runSystemAction('maintenance-on', 'Super Admin enabled maintenance mode') },
        { label: 'Maintenance Off', icon: CheckCircle2, run: () => runSystemAction('maintenance-off', 'Super Admin disabled maintenance mode') },
        { label: 'Sync Broadcast', icon: Activity, run: () => runSystemAction('sync-broadcast', 'Manual sync broadcast to live clients') },
        { label: 'Restart Request', icon: Server, run: () => runSystemAction('restart-request', 'Super Admin requested controlled server restart') },
      ],
    },
    {
      title: 'Risk',
      items: [
        { label: 'Create Incident', icon: AlertTriangle, run: () => createIncident('Manual System Health Incident', 'Super Admin created incident from System Health panel') },
        { label: 'Repair Dry Run', icon: ShieldCheck, run: () => runSystemAction('data-repair-dry-run', 'Create dry-run data repair ticket') },
        { label: 'Dependency Recheck', icon: RefreshCw, run: () => runSystemAction('dependency-recheck', 'Manual dependency recheck from System Health') },
        { label: 'Alert Test', icon: BellRing, run: () => testAlert() },
      ],
    },
  ];

  return (
    <section className="space-y-4">
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-orange" />
            Backup & System Health Log
          </h3>
          <p className="text-[10px] text-gray-500 mt-1">Live backup, offline sync, resource and audit monitor.</p>
        </div>
        <div className="flex items-center gap-2">
          {error ? (
            <span className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-bold">{error}</span>
          ) : (
            <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${statusClass(backupStatus)}`}>{backupStatus || 'Checking'}</span>
          )}
          <button onClick={() => void loadHealth()} className="h-8 px-3 rounded-lg bg-brand-dark border border-brand-border text-gray-200 hover:border-brand-orange/50 text-[10px] font-bold flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => void toggleLockdown(!health?.recovery?.lockdown?.active)} className={`h-8 px-3 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 ${health?.recovery?.lockdown?.active ? 'bg-red-600/25 border-red-500/50 text-red-200' : 'bg-red-600/10 border-red-500/30 text-red-300 hover:bg-red-600/20'}`}>
            <Lock className="w-3.5 h-3.5" />
            {health?.recovery?.lockdown?.active ? 'Release Lockdown' : 'Emergency Lockdown'}
          </button>
        </div>
      </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="bg-brand-card border border-brand-border rounded-lg p-3">
          <div className="flex items-center justify-between border-b border-brand-border/50 pb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange">Command Console</p>
              <p className="text-[10px] text-gray-500 mt-1">Audited operations only</p>
            </div>
            <button onClick={exportReport} className="h-8 px-2.5 rounded-md border border-brand-border bg-brand-dark text-[9px] font-black text-gray-200 hover:border-brand-orange/50 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export</button>
          </div>
          <div className="mt-3 space-y-4">
            {commandGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-gray-500">{group.title}</p>
                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.label} disabled={item.disabled} onClick={() => void item.run()} className="w-full h-9 rounded-md border border-brand-border bg-[#07111f] px-2.5 text-left text-[10px] font-bold text-gray-200 hover:border-brand-orange/50 hover:bg-[#0d1a2a] disabled:opacity-50 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-brand-orange" />{item.label}</span>
                        <span className="text-gray-600">Run</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="bg-brand-card border border-brand-border rounded-lg p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Command Output</p>
                <p className="text-xs font-bold text-white mt-1">{actionMsg || 'No command running. Select an operation from the command console.'}</p>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className={`px-2 py-1 rounded-md border ${statusClass(backupStatus)}`}>{backupStatus || 'Checking'}</span>
                <span className={`px-2 py-1 rounded-md border ${pendingQueue ? 'border-amber-500/30 text-amber-300 bg-amber-500/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'}`}>Queue {pendingQueue}</span>
              </div>
            </div>
          </div>
      {scanReport && (
        <div className="mb-3 rounded-lg border border-brand-orange/25 bg-brand-orange/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black text-brand-orange">Full Scan Report: {scanReport.scanId}</p>
            <button onClick={() => setScanReport(null)} className="text-[10px] text-gray-400 hover:text-white font-bold">Close</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-[10px]">
            <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">Backups <b className="text-white">{scanReport.backupCount || 0}</b></span>
            <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">Integrity <b className="text-white">{scanReport.integrity?.score || 0}</b></span>
            <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">Conflicts <b className="text-white">{scanReport.conflicts || 0}</b></span>
            <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">Missing <b className="text-white">{scanReport.dependencyMissing?.length || 0}</b></span>
            <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">Latest <b className="text-white">{scanReport.latestBackup?.name ? 'Yes' : 'No'}</b></span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-lg border border-brand-border bg-brand-dark/35 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Last Backup</p>
          <p className="text-xs font-bold text-white mt-2 truncate">{health?.backup?.latest?.name || 'No backup yet'}</p>
          <p className="text-[10px] text-gray-400 mt-1">{fmtTime(health?.backup?.latest?.createdAt)} · {health?.backup?.latest?.sizeLabel || '0 B'}</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/35 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-400" /> Next Automatic Run</p>
          <p className="text-xs font-bold text-white mt-2">{health?.backup?.automaticEnabled ? fmtTime(health?.backup?.nextRunAt) : 'Automatic backup off'}</p>
          <p className="text-[10px] text-gray-400 mt-1">Every {health?.backup?.intervalMinutes || 0} min · Keep {health?.backup?.retention || 0} files</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/35 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><WifiOff className="w-3.5 h-3.5 text-amber-400" /> Offline Sync Queue</p>
          <p className={`text-lg font-black mt-1 ${pendingQueue ? 'text-amber-300' : 'text-emerald-400'}`}>{pendingQueue}</p>
          <p className="text-[10px] text-gray-400">Orders {offlineOrders} · State snapshots {offlineStates}</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/35 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Storage Size</p>
          <p className="text-xs font-bold text-white mt-2">DB estimate: {health?.storage?.databaseSizeEstimate || 'Checking'}</p>
          <p className="text-[10px] text-gray-400">Local {health?.storage?.localDataSize || '-'} · Backups {health?.storage?.backupStorageSize || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
        <div className="rounded-lg border border-brand-border bg-brand-dark/25 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-violet-400" /> Server Resource</p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
            <span className="text-gray-400">CPU</span><span className="text-white font-bold text-right">{health?.server?.cpuLoadPercent ?? 0}%</span>
            <span className="text-gray-400">RAM</span><span className="text-white font-bold text-right">{health?.server?.memoryUsed || '-'}</span>
            <span className="text-gray-400">Uptime</span><span className="text-white font-bold text-right">{fmtUptime(health?.server?.uptimeSeconds)}</span>
            <span className="text-gray-400">Platform</span><span className="text-white font-bold text-right truncate">{health?.server?.platform || '-'}</span>
          </div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/25 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Active Store / Branch Requests</p>
          <div className="space-y-1.5 mt-2 max-h-28 overflow-y-auto pr-1">
            {(health?.activity?.activeKeys || []).length === 0 ? <p className="text-[10px] text-gray-500">No live request recorded yet.</p> : health?.activity?.activeKeys?.slice(0, 5).map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-white font-bold truncate">{row.key}</span>
                <span className="text-gray-500 truncate">{row.lastPath}</span>
                <span className="text-brand-orange font-mono">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/25 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Latest Audit Events</p>
          <div className="space-y-1.5 mt-2 max-h-28 overflow-y-auto pr-1">
            {(health?.activity?.auditTail || []).length === 0 ? <p className="text-[10px] text-gray-500">No audit event yet.</p> : health?.activity?.auditTail?.slice(0, 5).map((row, idx) => (
              <div key={row.id || idx} className="text-[10px] border-b border-brand-border/40 last:border-0 pb-1">
                <p className="text-white font-bold truncate">{row.action || 'audit-event'}</p>
                <p className="text-gray-500 truncate">{row.actor || row.role || 'system'} · {fmtTime(row.time)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <div className="rounded-lg border border-brand-border bg-brand-dark/20 p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Data Loss Protection</p>
            <span className="text-[9px] font-black text-brand-orange">{health?.protection?.score || 0}/{health?.protection?.total || 0}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {(health?.protection?.checks || []).map((check) => (
              <div key={check.key} className="flex items-center gap-2 rounded-lg border border-brand-border/50 bg-brand-card/50 px-2.5 py-2">
                <span className={`h-2 w-2 rounded-full ${check.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className={`text-[10px] font-bold ${check.ok ? 'text-gray-200' : 'text-red-200'}`}>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/20 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-cyan-400" /> Database / Local Row Counts</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {Object.entries(health?.storage?.localCounts || {}).slice(0, 9).map(([name, count]) => (
              <div key={name} className="rounded-lg border border-brand-border/50 bg-brand-card/50 px-2.5 py-2">
                <p className="text-[8px] uppercase text-gray-500 font-black truncate">{name}</p>
                <p className="text-sm font-black text-white">{Number(count || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
            {Object.entries((health?.storage?.tableCounts || {}) as Record<string, { table: string; count?: number; error?: string }>).slice(0, 10).map(([name, row]) => (
              <div key={name} className="flex items-center justify-between gap-2 text-[9px] border-b border-brand-border/30 pb-1 last:border-0">
                <span className="text-gray-400 truncate">{row.table}</span>
                <span className={row.error ? 'text-red-300' : 'text-emerald-300'}>{row.error ? row.error : Number(row.count || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
        <div className="rounded-lg border border-brand-border bg-brand-dark/20 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand-orange" /> Backup Integrity Score</p>
          <div className="flex items-end justify-between gap-3 mt-2">
            <p className={`text-3xl font-black ${(health?.backup?.integrity?.score || 0) >= 80 ? 'text-emerald-400' : 'text-amber-300'}`}>{health?.backup?.integrity?.score || 0}</p>
            <span className="text-[10px] font-black text-white">{health?.backup?.integrity?.status || 'Checking'}</span>
          </div>
          <div className="mt-2 space-y-1">
            {(health?.backup?.integrity?.warnings || []).length === 0 ? <p className="text-[10px] text-emerald-400">No integrity warning.</p> : health?.backup?.integrity?.warnings?.map((w) => <p key={w} className="text-[10px] text-amber-300">{w}</p>)}
          </div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/20 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-cyan-400" /> RPO / RTO Recovery</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2"><p className="text-[8px] uppercase text-gray-500 font-black">RPO</p><p className="text-lg font-black text-white">{health?.recovery?.rpoMinutes ?? '-'}m</p></div>
            <div className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2"><p className="text-[8px] uppercase text-gray-500 font-black">RTO Estimate</p><p className="text-lg font-black text-white">{health?.recovery?.rtoEstimateMinutes ?? '-'}m</p></div>
          </div>
          <p className={`mt-2 text-[10px] font-bold ${health?.recovery?.lockdown?.active ? 'text-red-300' : 'text-emerald-400'}`}>Lockdown: {health?.recovery?.lockdown?.active ? 'Active' : 'Off'}</p>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/20 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-violet-400" /> Dependency Monitor</p>
          <div className="space-y-1.5 mt-2">
            {(health?.recovery?.dependencies || []).map((dep) => (
              <div key={dep.name} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-gray-300">{dep.name}</span>
                <span className={dep.status === 'Configured' ? 'text-emerald-400 font-bold' : 'text-red-300 font-bold'}>{dep.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <div className="rounded-lg border border-brand-border bg-brand-dark/20 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Conflict Resolution Center</p>
          <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
            {(health?.activity?.conflicts || []).length === 0 ? <p className="text-[10px] text-emerald-400">No duplicate ID conflict detected.</p> : health?.activity?.conflicts?.slice(0, 8).map((c, idx) => (
              <div key={`${c.group}-${c.id}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2 text-[10px]">
                <span className="text-white font-bold">{c.group}</span><span className="text-amber-200 truncate">{c.id}</span><span className="text-amber-400">{c.reason}</span>
                <button onClick={() => void reviewConflict(c)} className="rounded-md border border-amber-500/30 px-2 py-1 text-[8px] font-black text-amber-200 hover:bg-amber-500/10">Review</button>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-dark/20 p-3">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-red-400" /> Auto Incident Timeline</p>
          <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
            {(health?.activity?.incidents || []).length === 0 ? <p className="text-[10px] text-gray-500">No incident event detected.</p> : health?.activity?.incidents?.slice(0, 8).map((row, idx) => (
              <div key={row.id || idx} className="border-b border-brand-border/40 last:border-0 pb-1 text-[10px]">
                <p className="text-white font-bold truncate">{row.action || 'incident'}</p>
                <p className="text-gray-500 truncate">{row.actor || 'system'} · {fmtTime(row.time)} · {row.reason || ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-brand-border bg-brand-dark/20 p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Multi-Branch Live Tracking</p>
          <span className="text-[9px] text-gray-500">{health?.activity?.branches?.length || 0} branch/store records</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 mb-3">
          {(health?.activity?.branches || []).length === 0 ? (
            <p className="text-[10px] text-gray-500">No branch sales or POS records yet.</p>
          ) : health?.activity?.branches?.slice(0, 6).map((branch) => (
            <div key={branch.key} className="rounded-lg border border-brand-border/60 bg-brand-card/70 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black text-white truncate">{branch.key}</p>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${branch.printerStatus === 'Unknown' ? 'bg-gray-500/10 text-gray-400' : 'bg-emerald-500/10 text-emerald-300'}`}>{branch.printerStatus}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[9px]">
                <span className="text-gray-500">Orders <b className="text-white">{branch.orders}</b></span>
                <span className="text-gray-500">POS <b className="text-white">{branch.posSales}</b></span>
                <span className="text-gray-500">৳ <b className="text-brand-orange">{Number(branch.revenue || 0).toLocaleString()}</b></span>
              </div>
              <p className="text-[8px] text-gray-600 mt-1">Last: {fmtTime(branch.lastOrderAt)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[9px] uppercase font-black text-gray-500 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-brand-orange" /> Backup Files</p>
          <span className="text-[9px] text-gray-500">{health?.backup?.files?.length || 0} latest files</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {(health?.backup?.files || []).length === 0 ? (
            <p className="text-[10px] text-gray-500">No backup file yet. Use Trigger Backup after `pg_dump` and `SUPABASE_DB_URL` are configured.</p>
          ) : health?.backup?.files?.slice(0, 6).map((file) => (
            <div key={file.name} className="flex items-center justify-between gap-2 rounded-lg border border-brand-border/60 bg-brand-card/70 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-white truncate">{file.name}</p>
                <p className="text-[9px] text-gray-500">{fmtTime(file.createdAt)} · {file.sizeLabel}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => downloadBackup(file.name)} className="h-7 px-2 rounded-md bg-brand-dark border border-brand-border text-cyan-300 hover:border-cyan-400/50 text-[9px] font-bold flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download
                </button>
                <button onClick={() => void verifyBackup(file.name)} className="h-7 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-[9px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verify
                </button>
                <button onClick={() => void simulateRestore(file.name)} className="h-7 px-2 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 text-[9px] font-bold flex items-center gap-1">
                  <Server className="w-3 h-3" /> Simulate
                </button>
                <button onClick={() => { setRestoreTarget(file.name); setRestoreReason(''); setRestoreConfirm(''); }} className="h-7 px-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-[9px] font-bold flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
              </div>
            </div>
          ))}
        </div>
        {restoreTarget && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-red-200">Restore Request</p>
                <p className="text-[9px] text-gray-400 truncate">{restoreTarget}</p>
              </div>
              <button onClick={() => setRestoreTarget('')} className="text-[10px] text-gray-400 hover:text-white font-bold">Cancel</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_auto] gap-2 mt-3">
              <input value={restoreReason} onChange={(e) => setRestoreReason(e.target.value)} placeholder="Reason for restore request" className="h-9 rounded-lg bg-brand-dark border border-brand-border px-3 text-[11px] text-white outline-none focus:border-red-400" />
              <input value={restoreConfirm} onChange={(e) => setRestoreConfirm(e.target.value)} placeholder="Type RESTORE REQUEST" className="h-9 rounded-lg bg-brand-dark border border-brand-border px-3 text-[11px] text-white outline-none focus:border-red-400" />
              <button onClick={() => void requestRestore()} disabled={restoreConfirm !== 'RESTORE REQUEST'} className="h-9 px-3 rounded-lg bg-red-600/20 border border-red-500/40 text-red-200 disabled:opacity-50 text-[10px] font-black">Save Request</button>
            </div>
          </div>
        )}
        {simulationResult && (
          <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black text-violet-200">Restore Simulation Report: {simulationResult.backup}</p>
              <button onClick={() => setSimulationResult(null)} className="text-[10px] text-gray-400 hover:text-white font-bold">Close</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[10px]">
              <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">Verify: <b className={simulationResult.ok ? 'text-emerald-400' : 'text-red-300'}>{simulationResult.ok ? 'Pass' : 'Fail'}</b></span>
              <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">Tables: <b className="text-white">{simulationResult.tables?.length || 0}</b></span>
              <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">COPY: <b className="text-white">{simulationResult.copySections || 0}</b></span>
              <span className="rounded-lg border border-brand-border/50 bg-brand-card/50 p-2 text-gray-300">Rows est: <b className="text-white">{simulationResult.estimatedRows || 0}</b></span>
            </div>
            <p className="mt-2 text-[9px] text-gray-500 truncate">Tables: {(simulationResult.tables || []).join(', ') || 'No table detected in first scan window'}</p>
          </div>
        )}
        <p className="mt-2 text-[9px] text-gray-600">Restore button saves a secured restore request, audit and alert. Actual database restore should be run in a maintenance window to avoid data loss.</p>
      </div>
        </div>
      </div>
    </section>
  );
}

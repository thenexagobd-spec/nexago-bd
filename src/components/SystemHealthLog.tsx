import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, Download, HardDrive, PlayCircle, RefreshCw, RotateCcw, Server, WifiOff } from 'lucide-react';

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
  };
  storage?: {
    databaseConfigured?: boolean;
    databaseSizeEstimate?: string;
    localDataSize?: string;
    backupStorageSize?: string;
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

  return (
    <section className="bg-brand-card border border-brand-border rounded-xl p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
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
          <button onClick={() => void triggerBackup()} disabled={health?.backup?.running} className="h-8 px-3 rounded-lg bg-emerald-600/15 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-600/25 disabled:opacity-50 text-[10px] font-bold flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5" />
            Trigger Backup
          </button>
        </div>
      </div>
      {actionMsg && <p className="mb-3 text-[10px] font-bold text-brand-orange bg-brand-orange/10 border border-brand-orange/20 rounded-lg px-3 py-2">{actionMsg}</p>}

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
        <p className="mt-2 text-[9px] text-gray-600">Restore button saves a secured restore request, audit and alert. Actual database restore should be run in a maintenance window to avoid data loss.</p>
      </div>
    </section>
  );
}

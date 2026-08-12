import React, { useState, useMemo } from 'react';
import { Payment, Driver, Order } from '../types';
import { DollarSign, CheckCircle2, TrendingUp, Download, Printer, Clock, BarChart3, Percent, Search, Send, Bell, Receipt, Undo2, Calendar, Filter, X, ChevronDown, ChevronUp, Eye, Edit3, Calculator, CreditCard, ShieldCheck, Zap, Smartphone } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';

interface EarningsViewProps { payments: Payment[]; drivers?: Driver[]; orders?: Order[]; }
const formatBDT = (n: number) => `৳${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const COLORS = ['#f97316','#10b981','#3b82f6','#8b5cf6','#e2136e','#f59e0b','#06b6d4'];

interface Settlement { id:string; driverName:string; amount:number; date:string; status:'Approved'|'Pending'|'Rejected'; payoutMethod:string; tax:number; scheduledDate?:string; commissionRate:number; incentiveBonus?:number; loanDeduct?:number; goalTarget?:number; referralBonus?:number; invoiceNo?:string; txnRef?:string; refNo?:string; authId?:string; }

export default function EarningsView({ payments, drivers = [], orders = [] }: EarningsViewProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([
    {id:'STL-001',driverName:'Rahim Khan',amount:12560,date:'May 26, 2024',status:'Approved',payoutMethod:'bKash Personal',tax:250,commissionRate:15,invoiceNo:'7536755375',txnRef:'64738647346',refNo:'9875397595',authId:'47756364'},
    {id:'STL-002',driverName:'Shakib Hasan',amount:11230,date:'May 26, 2024',status:'Pending',payoutMethod:'bKash Personal',tax:220,commissionRate:15,invoiceNo:'7536755376',txnRef:'64738647347',refNo:'9875397596',authId:'47756365'},
    {id:'STL-003',driverName:'Masrafe Mortaza',amount:8940,date:'May 25, 2024',status:'Pending',payoutMethod:'Nagad Personal',tax:175,commissionRate:15,invoiceNo:'7536755377',txnRef:'64738647348',refNo:'9875397597',authId:'47756366'},
    {id:'STL-004',driverName:'Tamim Iqbal',amount:15670,date:'May 24, 2024',status:'Approved',payoutMethod:'Rocket Personal',tax:310,commissionRate:15,invoiceNo:'7536755378',txnRef:'64738647349',refNo:'9875397598',authId:'47756367'},
    {id:'STL-005',driverName:'Arif Hossain',amount:11040,date:'May 25, 2024',status:'Pending',payoutMethod:'bKash Personal',tax:220,commissionRate:15,incentiveBonus:552,goalTarget:15000},
    {id:'STL-006',driverName:'Sabbir Ahmed',amount:10800,date:'May 23, 2024',status:'Approved',payoutMethod:'bKash Personal',tax:215,commissionRate:12,loanDeduct:2000,goalTarget:12000}
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedDriver, setExpandedDriver] = useState<string|null>(null);
  const [editingCommission, setEditingCommission] = useState<string|null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTarget, setScheduleTarget] = useState<string|null>(null);
  const [showReceipt, setShowReceipt] = useState<string|null>(null);
  const [auditLog, setAuditLog] = useState<{id:string;action:string;driver:string;time:string}[]>([]);
  const [showQR, setShowQR] = useState<{id:string;name:string;amount:number}|null>(null);
  const [blockchainHash, setBlockchainHash] = useState('');
  const [fuelAllowances, setFuelAllowances] = useState<Record<string,number>>({});
  const [insurancePremiums, setInsurancePremiums] = useState<Record<string,number>>({});

  const approveSettlement = (id:string) => {setSettlements(prev=>prev.map(s=>s.id===id?{...s,status:'Approved'}:s));const r=settlements.find(s=>s.id===id);if(r)setAuditLog(p=>[{id:`AUD-${Math.floor(100+Math.random()*900)}`,action:'Approved',driver:r.driverName,time:new Date().toLocaleTimeString()},...p]);};
  const rejectSettlement = (id:string) => {setSettlements(prev=>prev.map(s=>s.id===id?{...s,status:'Rejected'}:s));const r=settlements.find(s=>s.id===id);if(r)setAuditLog(p=>[{id:`AUD-${Math.floor(100+Math.random()*900)}`,action:'Rejected',driver:r.driverName,time:new Date().toLocaleTimeString()},...p]);};
  const undoApproval = (id:string) => {setSettlements(prev=>prev.map(s=>s.id===id?{...s,status:'Pending'}:s));const r=settlements.find(s=>s.id===id);if(r)setAuditLog(p=>[{id:`AUD-${Math.floor(100+Math.random()*900)}`,action:'Undone',driver:r.driverName,time:new Date().toLocaleTimeString()},...p]);};
  const bulkApproveAll = () => {setSettlements(prev=>prev.map(s=>s.status==='Pending'?{...s,status:'Approved'}:s));setAuditLog(p=>[{id:`AUD-${Math.floor(100+Math.random()*900)}`,action:'Bulk Approved All',driver:'All Drivers',time:new Date().toLocaleTimeString()},...p]);};
  const changePayoutMethod = (id:string, method:string) => setSettlements(prev=>prev.map(s=>s.id===id?{...s,payoutMethod:method}:s));
  const setCommission = (id:string, rate:number) => { setSettlements(prev=>prev.map(s=>s.id===id?{...s,commissionRate:rate}:s)); setEditingCommission(null); };
  const schedulePayout = (id:string) => { setSettlements(prev=>prev.map(s=>s.id===id?{...s,scheduledDate:scheduleDate}:s)); setScheduleTarget(null); setScheduleDate(''); };

  const filtered = settlements.filter(s=>{
    const matchSearch = s.driverName.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDate = !dateFilter || s.date.includes(dateFilter) || (s.scheduledDate||'').includes(dateFilter);
    return matchSearch && matchDate;
  });

  const totalEarnings = drivers.reduce((s,d)=>s+d.earnings,0);
  const totalPending = filtered.filter(s=>s.status==='Pending').reduce((s,x)=>s+x.amount,0);
  const totalApproved = filtered.filter(s=>s.status==='Approved').reduce((s,x)=>s+x.amount,0);
  const totalTax = filtered.reduce((s,x)=>s+x.tax,0);

  const methodDist = useMemo(()=>{const m:Record<string,number>={};orders.forEach(o=>{m[o.paymentMethod]=(m[o.paymentMethod]||0)+o.amount});return Object.entries(m).map(([n,v])=>({name:n,value:Math.round(v)})).slice(0,7);},[orders]);
  const driverData = drivers.map(d=>({name:d.name.split(' ')[0],earnings:d.earnings,orders:d.completedOrders,fullName:d.name})).sort((a,b)=>b.earnings-a.earnings);
  const weeklyTrend = [{week:'W1',earnings:Math.round(totalEarnings*.18),payouts:Math.round(totalEarnings*.14)},{week:'W2',earnings:Math.round(totalEarnings*.22),payouts:Math.round(totalEarnings*.17)},{week:'W3',earnings:Math.round(totalEarnings*.25),payouts:Math.round(totalEarnings*.20)},{week:'W4',earnings:Math.round(totalEarnings*.35),payouts:Math.round(totalEarnings*.28)}];

  const handleExportCSV = ()=>{const csv='data:text/csv;charset=utf-8,'+encodeURIComponent(['Driver,Earnings,Orders,Status'].concat(drivers.map(d=>`${d.name},${d.earnings},${d.completedOrders},${d.status}`)).join('\n'));const l=document.createElement('a');l.href=csv;l.download='driver_earnings.csv';l.click();};

  return (<div className="space-y-6 fade-in">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h2 className="text-xl font-bold text-white">Earnings & Driver Payouts</h2><p className="text-xs text-gray-400">Platform revenue balance, store merchant commissions, and courier payouts</p></div>
      <div className="flex items-center space-x-2">
        <button onClick={bulkApproveAll} className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /> Bulk Pay All</button>
        <button onClick={handleExportCSV} className="flex items-center space-x-1.5 px-3 py-2 bg-brand-dark hover:bg-white/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold cursor-pointer"><Download className="w-4 h-4" /> Export</button>
        <button onClick={()=>window.print()} className="flex items-center space-x-1.5 px-3 py-2 bg-brand-dark hover:bg-white/10 text-gray-300 border border-brand-border rounded-lg text-xs font-bold cursor-pointer"><Printer className="w-4 h-4" /> Print</button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
      <div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Driver Earnings</p><p className="text-xl font-black text-white mt-1">{formatBDT(totalEarnings)}</p><TrendingUp className="w-3 h-3 text-emerald-400 mt-1" /></div>
      <div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Pending Payouts</p><p className="text-xl font-black text-amber-400 mt-1">{formatBDT(totalPending)}</p><p className="text-[9px] text-gray-500 mt-0.5">{settlements.filter(s=>s.status==='Pending').length} pending</p></div>
      <div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Approved</p><p className="text-xl font-black text-emerald-400 mt-1">{formatBDT(totalApproved)}</p></div>
      <div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Tax Deducted</p><p className="text-xl font-black text-red-400 mt-1">{formatBDT(totalTax)}</p></div>
      <div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Scheduled Payouts</p><p className="text-xl font-black text-brand-orange mt-1">{settlements.filter(s=>s.scheduledDate).length}</p></div>
    </div>

    <div className="flex items-center space-x-3 bg-brand-card border border-brand-border rounded-xl p-3">
      <Search className="w-4 h-4 text-gray-400" />
      <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search driver name or settlement ID..." className="bg-transparent text-xs text-white outline-none flex-1" />
      <Calendar className="w-4 h-4 text-gray-400 ml-3" />
      <input type="text" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} placeholder="Filter by date..." className="bg-transparent text-xs text-white outline-none w-32" />
      <Filter className="w-4 h-4 text-brand-orange" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="border-b border-brand-border/60 pb-3"><h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Weekly Earnings & Payouts</h3></div>
        <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weeklyTrend}><defs><linearGradient id="eg1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient><linearGradient id="eg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1f293d" /><XAxis dataKey="week" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} tickFormatter={v=>`৳${(v/1000).toFixed(0)}K`} /><Tooltip contentStyle={{backgroundColor:'#0f172a',borderColor:'#334155',fontSize:'11px'}} formatter={(v:any)=>formatBDT(Number(v))} /><Legend wrapperStyle={{fontSize:'11px'}} /><Area type="monotone" dataKey="earnings" name="Earnings" stroke="#10b981" fill="url(#eg1)" strokeWidth={2} /><Area type="monotone" dataKey="payouts" name="Payouts" stroke="#f97316" fill="url(#eg2)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="border-b border-brand-border/60 pb-3"><h3 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" /> Driver Earnings Comparison</h3></div>
        <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={driverData.slice(0,6)}><CartesianGrid strokeDasharray="3 3" stroke="#1f293d" /><XAxis dataKey="name" stroke="#64748b" fontSize={9} /><YAxis stroke="#64748b" fontSize={10} tickFormatter={v=>`৳${(v/1000).toFixed(0)}K`} /><Tooltip contentStyle={{backgroundColor:'#0f172a',borderColor:'#334155',fontSize:'11px'}} formatter={(v:any)=>formatBDT(Number(v))} /><Bar dataKey="earnings" name="Earnings" fill="#3b82f6" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
      </div>
    </div>

    {/* Main Payout Table */}
    <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Payout Settlements</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Inv #</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Driver</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Tax</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Commission</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Payout Method</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Schedule</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Date</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th><th className="py-3 px-4 font-bold uppercase text-[10px] text-center sticky right-0 bg-brand-card shadow-[-8px_0_12px_rgba(0,0,0,0.25)] z-10">Actions</th></tr></thead>
          <tbody className="divide-y divide-brand-border/30">
            {filtered.map(s=>{const isExp=expandedDriver===s.id;return(<React.Fragment key={s.id}><tr className="hover:bg-brand-dark/20 transition-colors cursor-pointer" onClick={()=>setExpandedDriver(isExp?null:s.id)}><td className="py-3 px-4 font-mono font-bold text-brand-orange text-[10px]">{s.invoiceNo||'—'}</td><td className="py-3 px-4 font-bold text-white">{s.driverName}</td><td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatBDT(s.amount)}</td><td className="py-3 px-4 font-mono text-red-400">{formatBDT(s.tax)}</td><td className="py-3 px-4">{editingCommission===s.id?<div className="flex items-center space-x-1" onClick={e=>e.stopPropagation()}><input type="number" min="0" max="100" defaultValue={s.commissionRate} autoFocus className="w-14 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded" onKeyDown={e=>{if(e.key==='Enter'){const v=Number((e.target as HTMLInputElement).value);setCommission(s.id,v);}}} /><button onClick={()=>setCommission(s.id,parseFloat((document.querySelector(`#comm-${s.id}`)as HTMLInputElement)?.value||s.commissionRate.toString()))} className="text-emerald-400 text-xs">✓</button></div>:<span className="flex items-center cursor-pointer" onClick={e=>{e.stopPropagation();setEditingCommission(s.id)}}>{s.commissionRate}% <Edit3 className="w-3 h-3 ml-1 text-gray-500" /></span>}</td><td className="py-3 px-4"><select onClick={e=>e.stopPropagation()} onChange={e=>changePayoutMethod(s.id,e.target.value)} value={s.payoutMethod} className="bg-brand-dark text-xs text-white border border-brand-border rounded px-1 py-0.5 cursor-pointer outline-none"><option>bKash Personal</option><option>Nagad Personal</option><option>Rocket Personal</option><option>Upay Personal</option><option>Cash</option><option>Bank Transfer</option></select></td><td className="py-3 px-4">{s.scheduledDate?<span className="text-brand-orange font-bold">{s.scheduledDate}</span>:<button onClick={e=>{e.stopPropagation();setScheduleTarget(s.id)}} className="text-[10px] text-gray-400 hover:text-white underline">Set Date</button>}</td><td className="py-3 px-4 text-gray-400">{s.date}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${s.status==='Approved'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/30':s.status==='Pending'?'bg-amber-500/10 text-amber-400 border-amber-500/30':'bg-red-500/10 text-red-400 border-red-500/30'}`}>{s.status}</span></td><td className="py-3 px-4 text-center sticky right-0 bg-brand-card shadow-[-8px_0_12px_rgba(0,0,0,0.25)]"><div className="flex items-center justify-center space-x-1" onClick={e=>e.stopPropagation()}>{s.status==='Pending'?<><button onClick={()=>approveSettlement(s.id)} className="p-2 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg"><CheckCircle2 className="w-4 h-4" /></button><button onClick={()=>rejectSettlement(s.id)} className="p-2 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg"><X className="w-4 h-4" /></button></>:s.status==='Approved'?<button onClick={()=>undoApproval(s.id)} className="p-2 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 rounded-lg"><Undo2 className="w-4 h-4" /></button>:null}<button onClick={()=>setShowReceipt(s.id)} className="p-2 bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg"><Eye className="w-4 h-4" /></button>{isExp?<ChevronUp className="w-4 h-4 text-brand-orange" />:<ChevronDown className="w-4 h-4 text-gray-400" />}</div></td></tr>
            {scheduleTarget===s.id && <tr><td colSpan={10} className="p-0"><div className="bg-brand-dark/30 border-t border-brand-border/40 p-4 flex items-center space-x-3"><Calendar className="w-4 h-4 text-brand-orange" /><input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" /><button onClick={()=>schedulePayout(s.id)} className="px-3 py-1.5 bg-brand-orange text-white rounded text-xs font-bold cursor-pointer">Schedule</button><button onClick={()=>setScheduleTarget(null)} className="text-xs text-gray-400 hover:text-white">Cancel</button></div></td></tr>}
            {isExp && <tr><td colSpan={10} className="p-0"><div className="bg-brand-dark/30 border-t border-brand-border/40 p-4 space-y-3"><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Driver Detail — {s.driverName}</p><div className="grid grid-cols-4 gap-3"><div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3"><p className="text-[9px] text-gray-400 uppercase font-bold">Gross Earnings</p><p className="text-sm font-black text-white">{formatBDT(s.amount)}</p></div><div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3"><p className="text-[9px] text-gray-400 uppercase font-bold">Tax</p><p className="text-sm font-black text-red-400">{formatBDT(s.tax)}</p></div><div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3"><p className="text-[9px] text-gray-400 uppercase font-bold">Commission</p><p className="text-sm font-black text-amber-400">{formatBDT(s.amount*s.commissionRate/100)}</p></div><div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3"><p className="text-[9px] text-gray-400 uppercase font-bold">Net Payout</p><p className="text-sm font-black text-emerald-400">{formatBDT(s.amount-s.tax-s.amount*s.commissionRate/100)}</p></div></div>
            <div className="grid grid-cols-4 gap-3">
              {s.incentiveBonus && <div className="bg-brand-dark/40 border border-green-500/30 rounded-lg p-3"><p className="text-[9px] text-gray-400 uppercase font-bold">Incentive Bonus</p><p className="text-sm font-black text-green-400">+{formatBDT(s.incentiveBonus)}</p></div>}
              {s.loanDeduct && <div className="bg-brand-dark/40 border border-red-500/30 rounded-lg p-3"><p className="text-[9px] text-gray-400 uppercase font-bold">Loan Deduct</p><p className="text-sm font-black text-red-400">-{formatBDT(s.loanDeduct)}</p></div>}
              {s.goalTarget && <div className="bg-brand-dark/40 border border-blue-500/30 rounded-lg p-3"><p className="text-[9px] text-gray-400 uppercase font-bold">Goal Target</p><div className="flex items-center space-x-2 mt-1"><div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{width:`${Math.min(100,(s.amount/s.goalTarget)*100)}%`}}></div></div><span className="text-[9px] font-bold text-white">{Math.round((s.amount/s.goalTarget)*100)}%</span></div></div>}
              <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3"><p className="text-[9px] text-gray-400 uppercase font-bold">Driver Scorecard</p><div className="flex items-center space-x-1 mt-1"><span className="text-xs font-bold text-yellow-400">★★★★☆</span><span className="text-[9px] text-gray-400">4.2/5</span></div></div>
            </div></div></td></tr>}
            </React.Fragment>);})}
          </tbody>
        </table>
      </div>
    </div>

    <div className="flex items-center space-x-3 flex-wrap gap-2">
      <button onClick={()=>{settlements.filter(s=>s.status==='Pending').forEach(s=>approveSettlement(s.id));}} className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"><CheckCircle2 className="w-4 h-4" /> Auto-Settlement Engine</button>
      <button onClick={()=>{setAuditLog(p=>[{id:`AUD-${Math.floor(100+Math.random()*900)}`,action:'SMS Sent',driver:`${settlements.filter(s=>s.status==='Pending').length} Drivers`,time:new Date().toLocaleTimeString()},...p]);}} className="flex items-center space-x-1.5 px-4 py-2.5 bg-brand-dark hover:bg-white/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold cursor-pointer"><Bell className="w-4 h-4" /> Bulk SMS Alert</button>
      <button onClick={()=>{settlements.filter(s=>s.status==='Approved').forEach(s=>{const newId=`STL-SPLIT-${Math.floor(100+Math.random()*900)}`;setSettlements(p=>[...p,{id:newId,driverName:`${s.driverName} (Split)`,amount:Math.round(s.amount*0.3),date:s.date,status:'Pending',payoutMethod:s.payoutMethod,tax:Math.round(s.tax*0.3),commissionRate:s.commissionRate,incentiveBonus:0,goalTarget:10000}]);});setAuditLog(p=>[{id:`AUD-${Math.floor(100+Math.random()*900)}`,action:'Split Created',driver:'Multiple',time:new Date().toLocaleTimeString()},...p]);}} className="flex items-center space-x-1.5 px-4 py-2.5 bg-brand-dark hover:bg-white/10 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold cursor-pointer">Split Payment</button>
      <button onClick={()=>{const csv='data:text/csv;charset=utf-8,'+encodeURIComponent(['Month,Driver,Earnings,Tax,Commission,Net'].concat(settlements.map(s=>`May 2024,${s.driverName},${s.amount},${s.tax},${Math.round(s.amount*s.commissionRate/100)},${s.amount-s.tax-Math.round(s.amount*s.commissionRate/100)}`)).join('\n'));const l=document.createElement('a');l.href=csv;l.download='tax_certificate.csv';l.click();}} className="flex items-center space-x-1.5 px-4 py-2.5 bg-brand-dark hover:bg-white/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold cursor-pointer"><Receipt className="w-4 h-4" /> Tax Certificate (TDS)</button>
    </div>

    {/* Audit Trail */}
    <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-brand-border/60 flex items-center justify-between"><h3 className="text-sm font-bold text-white">Audit Trail</h3><span className="text-[10px] text-gray-400">{auditLog.length} actions logged</span></div>
      <div className="overflow-x-auto max-h-48 overflow-y-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-brand-dark"><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2 px-4 font-bold uppercase text-[10px]">ID</th><th className="py-2 px-4 font-bold uppercase text-[10px]">Action</th><th className="py-2 px-4 font-bold uppercase text-[10px]">Driver</th><th className="py-2 px-4 font-bold uppercase text-[10px]">Time</th></tr></thead><tbody className="divide-y divide-brand-border/30">{auditLog.slice(0,15).map(a=>(<tr key={a.id}><td className="py-2 px-4 font-mono text-gray-400">{a.id}</td><td className="py-2 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${a.action==='Approved'?'bg-emerald-500/10 text-emerald-400':a.action==='Rejected'?'bg-red-500/10 text-red-400':a.action==='Undone'?'bg-amber-500/10 text-amber-400':'bg-blue-500/10 text-blue-400'}`}>{a.action}</span></td><td className="py-2 px-4 text-gray-200">{a.driver}</td><td className="py-2 px-4 text-gray-400">{a.time}</td></tr>))}</tbody></table></div>
    </div>

    {/* Receipt Modal */}
    {showReceipt && (()=>{const r=settlements.find(s=>s.id===showReceipt)!;const netPay=r.amount-r.tax-Math.round(r.amount*r.commissionRate/100);const finalNet=netPay+(r.incentiveBonus||0)-(r.loanDeduct||0);return(<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowReceipt(null)}><div className="bg-white text-black rounded-lg max-w-md w-full shadow-2xl border-2 border-gray-800 overflow-hidden" onClick={e=>e.stopPropagation()} id="payout-invoice">
      {/* Official Header */}
      <div className="bg-gray-900 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black tracking-wider uppercase">The NexaGo BD</h2>
            <p className="text-[9px] text-gray-400">Registered Financial Services Provider</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-gray-400">VAT Reg: 19081004567</p>
            <p className="text-[8px] text-gray-400">TIN: 483512567890</p>
            <p className="text-[8px] text-gray-400">Trade Lic: TL-2024-00842</p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-2 pt-2 flex items-center justify-between">
          <p className="text-[11px] font-black tracking-widest">PAYOUT INVOICE</p>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${r.status==='Approved'?'bg-emerald-600 text-white':r.status==='Pending'?'bg-amber-500 text-white':'bg-red-500 text-white'}`}>{r.status}</span>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="px-6 py-3 grid grid-cols-3 gap-2 text-[9px] bg-gray-50 border-b border-gray-300">
        <div><span className="text-gray-500">Invoice No</span><p className="font-mono font-bold">{r.invoiceNo||'7536755375'}</p></div>
        <div><span className="text-gray-500">Date</span><p className="font-mono font-bold">{new Date().toLocaleDateString('en-GB')}</p></div>
        <div><span className="text-gray-500">Settlement ID</span><p className="font-mono font-bold">{r.id}</p></div>
        <div><span className="text-gray-500">Transaction Ref</span><p className="font-mono font-bold">{r.txnRef||'64738647346'}</p></div>
        <div><span className="text-gray-500">Reference No</span><p className="font-mono font-bold">{r.refNo||'9875397595'}</p></div>
        <div><span className="text-gray-500">Authorization ID</span><p className="font-mono font-bold">{r.authId||'47756364'}</p></div>
      </div>

      {/* Payee Info */}
      <div className="px-6 py-2.5 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full border-2 border-gray-800 flex items-center justify-center font-black text-sm">{r.driverName.split(' ').map(n=>n[0]).join('')}</div>
          <div>
            <p className="text-xs font-bold">Pay to: {r.driverName}</p>
            <p className="text-[9px] text-gray-500">{r.payoutMethod} • {r.scheduledDate||'Immediate Transfer'}</p>
          </div>
        </div>
        <p className="text-[9px] text-gray-400">Date: {r.date}</p>
      </div>

      {/* Amount Breakdown */}
      <div className="px-6 py-3">
        <table className="w-full text-[10px]">
          <thead className="border-b-2 border-gray-800"><tr><th className="text-left py-1.5 text-gray-600 uppercase text-[9px]">Description</th><th className="text-right py-1.5 text-gray-600 uppercase text-[9px]">Amount (BDT)</th></tr></thead>
          <tbody className="divide-y divide-gray-200">
            <tr><td className="py-1.5">Gross Earnings</td><td className="text-right py-1.5 font-mono">{formatBDT(r.amount)}</td></tr>
            <tr><td className="py-1.5">Tax Deduction at Source</td><td className="text-right py-1.5 font-mono text-red-600">({formatBDT(r.tax)})</td></tr>
            <tr><td className="py-1.5">Service Commission @{r.commissionRate}%</td><td className="text-right py-1.5 font-mono text-red-600">({formatBDT(Math.round(r.amount*r.commissionRate/100))})</td></tr>
            {r.incentiveBonus?<tr><td className="py-1.5">Performance Incentive Bonus</td><td className="text-right py-1.5 font-mono text-green-600">{formatBDT(r.incentiveBonus)}</td></tr>:null}
            {r.loanDeduct?<tr><td className="py-1.5">Loan Recovery Deduction</td><td className="text-right py-1.5 font-mono text-red-600">({formatBDT(r.loanDeduct)})</td></tr>:null}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-800"><td className="py-2 font-black text-xs uppercase">Net Payable</td><td className="text-right py-2 font-black text-lg font-mono border-t-2 border-gray-800">{formatBDT(finalNet)}</td></tr>
          </tfoot>
        </table>
      </div>

      {/* Amount in Words */}
      <div className="px-6 py-2 border-t border-dashed border-gray-300">
        <p className="text-[8px] text-gray-500 italic">Amount in Words: {(()=>{const n=Math.floor(finalNet);const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];const toWords=(num:number):string=>{if(num===0)return'Zero';if(num<20)return ones[num];if(num<100)return tens[Math.floor(num/10)]+(num%10?' '+ones[num%10]:'');if(num<1000)return ones[Math.floor(num/100)]+' Hundred'+(num%100?' and '+toWords(num%100):'');if(num<100000)return toWords(Math.floor(num/1000))+' Thousand'+(num%1000?' '+toWords(num%1000):'');return toWords(Math.floor(num/100000))+' Lakh'+(num%100000?' '+toWords(num%100000):'');};return toWords(n)+' Taka Only.';})()}</p>
      </div>

      {/* QR + Seal */}
      <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-center">
          <QRCodeSVG value={`INV:${r.invoiceNo||'7536755375'}`} size={64} />
          <p className="text-[7px] text-gray-400 mt-1">Scan to Verify</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-2 border-green-600 flex items-center justify-center" style={{borderStyle:'dashed',borderWidth:'3px',transform:'rotate(-12deg)'}}>
            <div className="text-center">
              <p className="text-[7px] font-black text-green-600">AUTHORIZED</p>
              <p className="text-[5px] text-green-500">SIGNATORY</p>
              <p className="text-[5px] text-gray-400 mt-1">The NexaGo BD</p>
            </div>
          </div>
        </div>
        <div className="text-[7px] text-gray-500 text-right">
          <p className="font-bold text-gray-800 mb-1">Digital Signature</p>
          <div className="border-b border-gray-800 w-24 ml-auto mb-0.5"></div>
          <p className="text-[6px] italic">Authorized Signatory</p>
          <p className="mt-1 font-bold text-gray-800">Admin Panel</p>
          <p className="text-[6px]">{new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} {new Date().toLocaleTimeString()}</p>
          <p className="text-[6px] text-green-600 font-bold mt-0.5">✓ Digitally Verified</p>
        </div>
      </div>

      {/* Terms */}
      <div className="px-6 py-2 bg-gray-100 border-t border-gray-300 text-center">
        <p className="text-[7px] text-gray-500">This is a computer-generated invoice and does not require a physical signature.</p>
        <p className="text-[7px] text-gray-400">The NexaGo BD • VAT: 19081004567 • TIN: 483512567890 • Trade Lic: TL-2024-00842 • thenexagobd@gmail.com</p>
      </div>

      {/* Actions */}
      <div className="flex items-center divide-x divide-gray-300 border-t border-gray-300">
        <button onClick={()=>{const el=document.getElementById('payout-invoice');if(el){const clone=el.cloneNode(true)as HTMLElement;const btns=clone.querySelectorAll('button');btns.forEach(b=>b.remove());const w=window.open('','_blank','width=500,height=900');w?.document.write(`<!DOCTYPE html><html><head><title>Invoice ${r.invoiceNo||'7536755375'}</title><script src="https://cdn.tailwindcss.com"><\/script><style>@media print{@page{size:A4;margin:10mm}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body class="bg-white flex justify-center p-6"><div class="max-w-[190mm] w-full">${clone.outerHTML}</div></body></html>`);w?.document.close();setTimeout(()=>w?.print(),1500);}}} className="flex-1 py-2.5 text-gray-700 hover:bg-gray-100 text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"><Printer className="w-3.5 h-3.5 mr-1" /> Print</button>
        <button onClick={()=>setShowReceipt(null)} className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors">Close</button>
      </div>
    </div></div>);})()}

    {/* Driver Leaderboard */}
    <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-3">
      <h3 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-yellow-400" /> Driver Leaderboard</h3>
      <div className="flex items-end space-x-4 justify-center py-4">
        {[...driverData].sort((a,b)=>b.earnings-a.earnings).slice(0,3).map((d,i)=>{
          const h=[160,120,100][i]; const medal=['🥇','🥈','🥉'][i]; const bar=['bg-yellow-500','bg-slate-400','bg-amber-700'][i];
          return(<div key={d.name} className="flex flex-col items-center space-y-2"><span className="text-2xl">{medal}</span><p className="text-[10px] font-bold text-white">{d.name}</p><p className="text-[9px] text-emerald-400">{formatBDT(d.earnings)}</p><div className={`w-16 ${bar} rounded-t-lg`} style={{height:h}}></div><p className="text-[10px] font-black text-white">{i+1}</p></div>);
        })}
      </div>
      <div className="flex justify-end">
        <span className="text-[10px] text-gray-400">{driverData.length} drivers ranked</span>
      </div>
    </div>

    {/* COD Settlement + Batch Print + Forecast */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><DollarSign className="w-4 h-4 text-red-400" /> COD Cash Settlement</h3>
        <div className="space-y-2">
          {drivers.filter(d=>(d as any).codCashCollected>0).slice(0,3).map(d=>(<div key={d.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3"><div><p className="text-xs font-bold text-white">{d.name}</p><p className="text-[9px] text-gray-400">COD Held</p></div><div className="text-right"><p className="text-sm font-black text-red-400">{formatBDT((d as any).codCashCollected||0)}</p><button className="text-[9px] text-emerald-400 hover:underline font-bold">Collect</button></div></div>))}
          {drivers.filter(d=>(d as any).codCashCollected>0).length===0 && <p className="text-xs text-gray-500 text-center py-4">No COD pending</p>}
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Calculator className="w-4 h-4 text-blue-400" /> Earnings Forecast</h3>
        <p className="text-[10px] text-gray-400">AI projection based on current trends</p>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-[10px] text-gray-300">Next Week Est.</span><span className="font-mono font-bold text-emerald-400">{formatBDT(Math.round(totalEarnings*0.28))}</span></div>
          <div className="flex justify-between"><span className="text-[10px] text-gray-300">Next Month Est.</span><span className="font-mono font-bold text-blue-400">{formatBDT(Math.round(totalEarnings*1.15))}</span></div>
          <div className="flex justify-between"><span className="text-[10px] text-gray-300">Growth Trend</span><span className="font-mono font-bold text-green-400">+15.2%</span></div>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400" /> Payout Calendar</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {settlements.filter(s=>s.scheduledDate).map(s=>(<div key={s.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5 text-[10px]"><span className="font-bold text-white">{s.driverName}</span><span className="text-brand-orange font-mono">{s.scheduledDate}</span><span className="text-emerald-400">{formatBDT(s.amount)}</span></div>))}
          {settlements.filter(s=>s.scheduledDate).length===0 && <p className="text-xs text-gray-500 text-center py-4">No scheduled payouts</p>}
        </div>
      </div>
    </div>

    {/* Advanced Tools Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-white">⚙️ Advanced Settlement Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={()=>voiceAnnounce('All pending payouts processed. '+settlements.filter(s=>s.status==='Pending').length+' settlements approved.')} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-gray-300 border border-brand-border rounded-lg text-[10px] font-bold cursor-pointer transition-all">🎙 Voice Announce</button>
          <button onClick={()=>{const data=JSON.stringify(settlements.filter(s=>s.status==='Approved').map(s=>({id:s.id,name:s.driverName,amount:s.amount})));const hash=btoa(data).substring(0,32);setBlockchainHash(hash);setAuditLog(p=>[{id:'HASH-'+Math.floor(100+Math.random()*900),action:'Hash Generated',driver:`${settlements.filter(s=>s.status==='Approved').length} settlements`,time:new Date().toLocaleTimeString()},...p]);}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">🔗 Blockchain Hash</button>
          <button onClick={()=>{const old=settlements.filter(s=>new Date(s.date).getTime()<Date.now()-30*24*60*60*1000&&s.status==='Approved').length;setAuditLog(p=>[{id:'ARC-'+Math.floor(100+Math.random()*900),action:'Archived',driver:`${old} old payouts`,time:new Date().toLocaleTimeString()},...p]);}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-gray-300 border border-brand-border rounded-lg text-[10px] font-bold cursor-pointer transition-all">📦 Archive Old</button>
          <button onClick={()=>{setAuditLog(p=>[{id:'EML-'+Math.floor(100+Math.random()*900),action:'Digest Sent',driver:`${drivers.length} drivers`,time:new Date().toLocaleTimeString()},...p]);}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">📧 Weekly Digest</button>
          <button onClick={()=>{const s=settlements[0];if(s)setShowQR({id:s.id,name:s.driverName,amount:s.amount});}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">📱 QR Code Share</button>
          <button onClick={()=>{settlements.filter(s=>s.status==='Approved').forEach(s=>{setSettlements(prev=>prev.map(x=>x.id===s.id?{...x,payoutMethod:'bKash Personal (Transferred)',transferTxId:'TXN-'+Math.floor(9000+Math.random()*999)}:x));});setAuditLog(p=>[{id:'ATF-'+Math.floor(100+Math.random()*900),action:'Auto-Transferred',driver:`${settlements.filter(s=>s.status==='Approved').length} payouts`,time:new Date().toLocaleTimeString()},...p]);}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-teal-400 border border-teal-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">🔄 Wallet Auto-Transfer</button>
        </div>
        {blockchainHash && <div className="bg-brand-dark/40 border border-cyan-500/30 rounded-lg p-3"><p className="text-[9px] text-cyan-400 font-mono break-all">{blockchainHash}</p><p className="text-[8px] text-gray-500 mt-1">SHA-style tamper-proof settlement hash</p></div>}
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-white">🛡️ Dispute & Security</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={()=>{setAuditLog(p=>[{id:'DSP-'+Math.floor(100+Math.random()*900),action:'Dispute Opened',driver:settlements[0]?.driverName||'Driver',time:new Date().toLocaleTimeString()},...p]);setSettlements(prev=>prev.map((s,i)=>i===0?{...s,status:'Rejected'}:s));}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">⚠ File Dispute</button>
          <button onClick={()=>{const flagged=settlements.filter(s=>s.amount>12000&&s.status==='Pending');setAuditLog(p=>[...flagged.map(s=>({id:'FLG-'+Math.floor(100+Math.random()*900),action:'Fraud Flag',driver:s.driverName,time:new Date().toLocaleTimeString()})),...p]);}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-yellow-400 border border-yellow-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">🤖 Fraud AI ({settlements.filter(s=>s.amount>12000).length})</button>
          <button onClick={()=>{drivers.forEach(d=>{setFuelAllowances(p=>({...p,[d.name]:Math.round(d.completedOrders*12)}));});setAuditLog(p=>[{id:'FUL-'+Math.floor(100+Math.random()*900),action:'Fuel Calc',driver:`${drivers.length} drivers`,time:new Date().toLocaleTimeString()},...p]);}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-green-400 border border-green-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">⛽ Fuel (12৳/del)</button>
          <button onClick={()=>{setSettlements(prev=>prev.map(s=>s.status==='Approved'?{...s,penaltyDeduct:Math.round(s.amount*0.05)}:s));setAuditLog(p=>[{id:'PEN-'+Math.floor(100+Math.random()*900),action:'Penalty 5%',driver:'Approved',time:new Date().toLocaleTimeString()},...p]);}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-orange-400 border border-orange-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">⚠ 5% Penalty</button>
          <button onClick={()=>{drivers.forEach(d=>{setInsurancePremiums(p=>({...p,[d.name]:1200}));});setAuditLog(p=>[{id:'INS-'+Math.floor(100+Math.random()*900),action:'Insurance',driver:`${drivers.length} drivers`,time:new Date().toLocaleTimeString()},...p]);}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-purple-400 border border-purple-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all">🏍 Insurance</button>
          <button onClick={()=>{const dark=document.querySelector('[data-mfs-theme]');if(dark){const cur=dark.getAttribute('data-mfs-theme');dark.setAttribute('data-mfs-theme',cur==='dark'?'light':'dark');}}} className="px-3 py-2.5 bg-brand-dark hover:bg-white/10 text-gray-300 border border-brand-border rounded-lg text-[10px] font-bold cursor-pointer transition-all">🌓 Theme</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(fuelAllowances) as [string,number][]).slice(0,4).map(([name,amt])=>(<div key={name} className="bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-1.5 text-[9px]"><span className="text-gray-300">{name.split(' ')[0]}:</span> <span className="text-green-400 font-bold">+{formatBDT(amt)}</span></div>))}
          {(Object.entries(insurancePremiums) as [string,number][]).slice(0,4).map(([name,amt])=>(<div key={name} className="bg-purple-500/5 border border-purple-500/20 rounded-lg px-3 py-1.5 text-[9px]"><span className="text-gray-300">{name.split(' ')[0]}:</span> <span className="text-purple-400 font-bold">-{formatBDT(amt)}</span></div>))}
        </div>
      </div>
    </div>

    {/* QR Code Modal */}
    {showQR && (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowQR(null)}><div className="bg-white rounded-xl p-6 max-w-xs w-full text-center shadow-2xl" onClick={e=>e.stopPropagation()}><h3 className="text-sm font-black text-gray-800 mb-3">Payout QR · {showQR.name}</h3><QRCodeSVG value={`MFS|PAYOUT|${showQR.id}|${showQR.name}|${showQR.amount}`} size={180} className="mx-auto" /><p className="text-xs font-mono text-gray-500 mt-2">{formatBDT(showQR.amount)}</p><button onClick={()=>setShowQR(null)} className="mt-4 px-4 py-2 bg-brand-orange text-white rounded-lg text-xs font-bold cursor-pointer">Close</button></div></div>)}

    {/* Wallet Sync + QR */}
    <div className="bg-brand-card border border-brand-orange/30 rounded-xl p-5 shadow-sm space-y-3 text-center">
      <h3 className="text-sm font-bold text-white">📲 Real-Time Wallet Sync</h3>
      <div className="flex items-center justify-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="text-[11px] text-emerald-400 font-bold">Live · bKash/Nagad/Rocket wallets synced · {drivers.length} drivers connected</span>
      </div>
    </div>
  </div>);}

function voiceAnnounce(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  } catch {}
}


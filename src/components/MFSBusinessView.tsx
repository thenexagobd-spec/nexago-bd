/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Order } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Wallet, LayoutDashboard, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine,
  Receipt, PiggyBank, Percent, Users, BarChart3, Download, Search, Plus, Send,
  RefreshCcw, Smartphone, Zap, CheckCircle2, CreditCard, Banknote, MapPin, X,
  UserRound, ScanLine, HandCoins, Bell, ShieldCheck, Scale, Settings2, Eye, EyeOff, ChevronDown,
  Globe, Store, Sparkles, GraduationCap, Ticket, DollarSign, Building2, List, Gift, Code, FileText, Calendar
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// Persistent state hook — data survives browser reloads (real system behaviour)
function useLocalState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`mfs_${key}`);
      if (!stored) return Array.isArray(initial) ? ([] as T) : initial;
      const parsed = JSON.parse(stored) as T;
      if (!Array.isArray(parsed)) return parsed;
      const legacySeedId = new RegExp(`^(${['TXN-900','AG-00','FLT-00','CUS-10','LN-200','SAV-300','CARD-400','NTF-00','RMT-00','MER-00','DSP-00','CB-00','INS-00','KEY-00','WH-00','AUD-00','SCH-00','FX-','TAX-00','BUD-00','ROL-00','NPSB-00','POS-00','BANK-00','API-00','CT-00'].map(x => x.replace('-', '\\-')).join('|')})`, 'i');
      return parsed.filter((row: any) => !legacySeedId.test(String(row?.id || ''))) as T;
    } catch {
      return Array.isArray(initial) ? ([] as T) : initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`mfs_${key}`, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
  }, [key, state]);
  return [state, setState];
}

interface MFSBusinessViewProps {
  orders: Order[];
}

const MFS_METHODS = ['bKash', 'Nagad', 'Rocket', 'Upay', 'SureCash', 'Tap', 'mCash', 'OK Wallet', 'MY Cash', 'Aamra Pay', 'Islami Bank mCash'];
const DIGITAL_METHODS = ['Visa Card', 'Mastercard', 'Amex Card', 'Local Debit Card', 'Internet Banking', 'Bank Transfer', 'SSLCommerz', 'Shwapno Pay'];
const ALL_METHODS = [...MFS_METHODS, ...DIGITAL_METHODS];

const DEFAULT_COMMISSION: Record<string, number> = {
  'bKash': 1.85, 'Nagad': 1.50, 'Rocket': 1.80, 'Upay': 1.50, 'SureCash': 1.20,
  'Tap': 1.00, 'mCash': 1.20, 'OK Wallet': 1.50, 'MY Cash': 1.50, 'Aamra Pay': 1.20,
  'Islami Bank mCash': 1.00, 'Visa Card': 2.50, 'Mastercard': 2.50, 'Amex Card': 3.00,
  'Local Debit Card': 1.80, 'Internet Banking': 1.00, 'Bank Transfer': 1.00,
  'SSLCommerz': 2.00, 'Shwapno Pay': 1.20, 'Cash': 0, 'Cash on Delivery': 0
};

const METHOD_COLORS: Record<string, string> = {
  'bKash': '#e2136e', 'Nagad': '#f26522', 'Rocket': '#8c3494', 'Upay': '#ee1c25',
  'SureCash': '#f7941d', 'Tap': '#7c3aed', 'mCash': '#d71920', 'OK Wallet': '#00a651',
  'MY Cash': '#f58220', 'Aamra Pay': '#78be20', 'Islami Bank mCash': '#0d8a5f',
  'Visa Card': '#1a1f71', 'Mastercard': '#f79e1b', 'Amex Card': '#2e77bc',
  'Local Debit Card': '#4f46e5', 'Internet Banking': '#475569', 'Bank Transfer': '#334155',
  'SSLCommerz': '#0b6dc7', 'Shwapno Pay': '#8dc63f', 'Cash': '#10b981', 'Cash on Delivery': '#059669'
};

const formatBDT = (n: number) => `৳${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = 'overview' | 'wallets' | 'transactions' | 'cashinout' | 'transfers' | 'bills' | 'float' | 'settlement' | 'agents' | 'reports' | 'customers' | 'qr' | 'loans' | 'savings' | 'cards' | 'notifications' | 'settings' | 'reconcile' | 'remittance' | 'merchants' | 'disputes' | 'cashback' | 'insurance' | 'education' | 'tickets' | 'salary' | 'govt' | 'bulkpayout' | 'payrequest' | 'referral' | 'withdraw' | 'fraud' | 'api' | 'audit' | 'scheduled' | 'forex' | 'tax' | 'budget' | 'ticker' | 'roles' | 'npsb' | 'pos' | 'theme' | 'bankhub' | 'profile360';

type TxType = 'Cash-In' | 'Cash-Out' | 'Transfer' | 'Bill Pay' | 'Mobile Recharge' | 'Merchant QR' | 'Settlement';
interface Tx {
  id: string;
  type: TxType;
  method: string;
  amount: number;
  fee: number;
  counterparty: string;
  note: string;
  date: string;
  status: 'Completed' | 'Processing' | 'Failed';
}

interface Wallet {
  method: string;
  label: string;
  balance: number;
  cashInTotal: number;
  cashOutTotal: number;
  status: 'Active' | 'Low Float' | 'Suspended';
}

interface Agent {
  id: string;
  name: string;
  area: string;
  method: string;
  balance: number;
  todayTransactions: number;
  commission: number;
  status: 'Active' | 'Pending' | 'Suspended';
}

interface BillProvider {
  id: string;
  name: string;
  category: string;
  color: string;
}

interface FloatRecord {
  id: string;
  method: string;
  amount: number;
  action: 'Add' | 'Withdraw';
  date: string;
  status: 'Processing' | 'Completed';
}

interface MfsCustomer {
  id: string;
  name: string;
  phone: string;
  method: string;
  balance: number;
  kycStatus: 'Verified' | 'Pending' | 'Rejected';
  joinDate: string;
  transactions: number;
  status: 'Active' | 'Suspended';
}

interface LoanRecord {
  id: string;
  customer: string;
  phone: string;
  method: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  repaid: number;
  status: 'Active' | 'Completed' | 'Overdue';
  issuedDate: string;
}

interface SavingsAccount {
  id: string;
  customer: string;
  phone: string;
  method: string;
  balance: number;
  interestRate: number;
  tenure: string;
  maturityDate: string;
  status: 'Active' | 'Matured' | 'Closed';
}

interface VirtualCard {
  id: string;
  name: string;
  method: string;
  cardNumber: string;
  expiry: string;
  limit: number;
  spent: number;
  status: 'Active' | 'Frozen' | 'Expired';
}

interface MfsNotification {
  id: string;
  type: 'Payment' | 'Alert' | 'Settlement' | 'System' | 'Agent';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface MfsSettings {
  dailyTransactionLimit: number;
  singleTransactionLimit: number;
  cashOutFeePct: number;
  transferFeePct: number;
  defaultCommission: number;
  fraudDetection: boolean;
  autoSettlement: boolean;
  smsAlerts: boolean;
  currency: string;
  settlementCycle: string;
}

interface RemittanceTx {
  id: string;
  sender: string;
  receiver: string;
  fromCountry: string;
  toMethod: string;
  amountForeign: number;
  currency: string;
  rate: number;
  amountBDT: number;
  status: 'Completed' | 'Processing' | 'Pending';
  date: string;
}

interface Merchant {
  id: string;
  name: string;
  category: string;
  method: string;
  city: string;
  totalVol: number;
  commission: number;
  status: 'Active' | 'Inactive';
}

interface Dispute {
  id: string;
  txId: string;
  method: string;
  amount: number;
  reason: string;
  filedBy: string;
  status: 'Open' | 'Investigating' | 'Resolved' | 'Rejected';
  date: string;
}

interface CashbackCampaign {
  id: string;
  title: string;
  method: string;
  cashbackPct: number;
  maxAmount: number;
  startDate: string;
  endDate: string;
  usageCount: number;
  status: 'Active' | 'Scheduled' | 'Ended';
}

interface InsurancePolicy {
  id: string;
  customer: string;
  phone: string;
  type: string;
  provider: string;
  premium: number;
  coverAmount: number;
  expiry: string;
  status: 'Active' | 'Expired' | 'Cancelled';
}

interface EduProvider { id: string; name: string; category: string; color: string; }
interface TicketProvider { id: string; name: string; category: string; color: string; }
interface GovtProvider { id: string; name: string; category: string; color: string; }

const EDU_PROVIDERS: EduProvider[] = [
  { id:'nu', name:'National University (NU)', category:'University', color:'#3b82f6' },
  { id:'du', name:'Dhaka University (DU)', category:'University', color:'#e2136e' },
  { id:'buet', name:'BUET', category:'Engineering', color:'#f59e0b' },
  { id:'nsu', name:'North South University', category:'Private', color:'#10b981' },
  { id:'brac', name:'BRAC University', category:'Private', color:'#8b5cf6' },
  { id:'iut', name:'IUT', category:'Engineering', color:'#f97316' },
  { id:'medical', name:'Medical Colleges', category:'Medical', color:'#ec4899' },
  { id:'school', name:'School Board Exams', category:'Board', color:'#14b8a6' }
];

const TICKET_PROVIDERS: TicketProvider[] = [
  { id:'bus', name:'Hanif / Shohag Bus', category:'Bus', color:'#3b82f6' },
  { id:'train', name:'Bangladesh Railway', category:'Train', color:'#10b981' },
  { id:'launch', name:'Sundarban Launch', category:'Launch', color:'#f59e0b' },
  { id:'air', name:'Biman Bangladesh', category:'Air', color:'#e2136e' },
  { id:'cinema', name:'Star Cineplex', category:'Movie', color:'#ec4899' },
  { id:'event', name:'Event / Concert', category:'Event', color:'#8b5cf6' }
];

const GOVT_PROVIDERS: GovtProvider[] = [
  { id:'passport', name:'Passport Fee', category:'Immigration', color:'#3b82f6' },
  { id:'visa', name:'Visa Application Fee', category:'Immigration', color:'#e2136e' },
  { id:'tax', name:'Income Tax (e-TIN)', category:'Tax', color:'#f59e0b' },
  { id:'vat', name:'VAT Return', category:'Tax', color:'#10b981' },
  { id:'rsc', name:'RSC / Land Tax', category:'Tax', color:'#8b5cf6' },
  { id:'courtfee', name:'Court Fee / Fine', category:'Judicial', color:'#f97316' }
];

interface AuditEntry { id:string; user:string; action:string; module:string; detail:string; date:string; }
interface ScheduledPayment { id:string; name:string; method:string; amount:number; frequency:string; nextDate:string; counterParty:string; status:'Active'|'Paused'; }
interface ForexRate { currency:string; country:string; buy:number; sell:number; change:string; }
interface TaxRecord { id:string; type:'TDS'|'VAT'; amount:number; rate:number; deducted:number; period:string; status:'Paid'|'Pending'; }
interface BudgetItem { category:string; planned:number; actual:number; }
interface UserRole { id:string; name:string; role:'Super Admin'|'Admin'|'Agent'|'Viewer'; permissions:string; status:'Active'|'Suspended'; }
interface NpsbTransfer { id:string; fromMethod:string; bankName:string; branch:string; accountNo:string; amount:number; fee:number; status:'Completed'|'Processing'|'Failed'; date:string; }
interface PosTransaction { id:string; terminal:string; method:string; amount:number; merchant:string; date:string; status:'Approved'|'Declined'; }

interface BankAccount { id:string; bankName:string; accountNo:string; branch:string; accountType:string; linkedMethod:string; balance:number; status:'Active'|'Pending'; contactPhone:string; }
interface MfsApiStatus { provider:string; apiKey:string; endpoint:string; status:'Online'|'Degraded'|'Offline'|'Archive'; lastChecked:string; successRate:number; dailyCalls:number; }
interface ContactPhone { id:string; name:string; phone:string; type:'Merchant'|'Customer'|'Agent'|'Bank'|'Support'; method?:string; }

const BILL_PROVIDERS: BillProvider[] = [
  { id: 'desco', name: 'Desco Electric', category: 'Electricity', color: '#f59e0b' },
  { id: 'dpdc', name: 'DPDC', category: 'Electricity', color: '#e2136e' },
  { id: 'breb', name: 'BREB Rural', category: 'Electricity', color: '#10b981' },
  { id: 'wasa', name: 'Dhaka WASA', category: 'Water', color: '#3b82f6' },
  { id: 'titas', name: 'Titas Gas', category: 'Gas', color: '#f97316' },
  { id: 'btcl', name: 'BTCL Landline', category: 'Telecom', color: '#8b5cf6' },
  { id: 'internet', name: 'Internet (ISP)', category: 'Internet', color: '#06b6d4' },
  { id: 'cable', name: 'Cable TV', category: 'Entertainment', color: '#ec4899' },
  { id: 'water-log', name: 'City Corp Tax', category: 'Tax', color: '#64748b' },
  { id: 'dse', name: 'DSE / Brokerage', category: 'Finance', color: '#84cc16' }
];

export default function MFSBusinessView({ orders }: MFSBusinessViewProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [commissionOverrides, setCommissionOverrides] = useState<Record<string, number>>({});
  const [selectedMethod, setSelectedMethod] = useState('All');
  const [sortBy, setSortBy] = useState<'gross' | 'count' | 'commission' | 'net'>('gross');
  const [timeframe, setTimeframe] = useState<'Today' | 'This Week' | 'This Month' | 'All Time'>('This Week');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [txFilter, setTxFilter] = useState('All');

  const getRate = (method: string) => commissionOverrides[method] ?? DEFAULT_COMMISSION[method] ?? 0;

  // ---- Seed data (wallets, transactions, agents, float) ----
  const [wallets, setWallets] = useLocalState<Wallet[]>('wallets', []);

  const [transactions, setTransactions] = useLocalState<Tx[]>('transactions', []);

  const [agents, setAgents] = useLocalState<Agent[]>('agents', []);

  const [floatRecords, setFloatRecords] = useLocalState<FloatRecord[]>('floatRecords', []);

  const [customers, setCustomers] = useLocalState<MfsCustomer[]>('customers', []);

  const [loans, setLoans] = useLocalState<LoanRecord[]>('loans', []);

  const [savingsAccounts, setSavingsAccounts] = useLocalState<SavingsAccount[]>('savings', []);

  const [cards, setCards] = useLocalState<VirtualCard[]>('cards', []);

  const [notifications, setNotifications] = useLocalState<MfsNotification[]>('notifications', []);

  const [settings, setSettings] = useLocalState<MfsSettings>('settings', {
    dailyTransactionLimit: 500000,
    singleTransactionLimit: 100000,
    cashOutFeePct: 1.7,
    transferFeePct: 0.2,
    defaultCommission: 1.85,
    fraudDetection: true,
    autoSettlement: true,
    smsAlerts: true,
    currency: 'BDT (৳)',
    settlementCycle: 'Daily'
  });

  const [remittances, setRemittances] = useLocalState<RemittanceTx[]>('remittances', []);

  const [merchants, setMerchants] = useLocalState<Merchant[]>('merchants', []);

  const [disputes, setDisputes] = useLocalState<Dispute[]>('disputes', []);

  const [cashbackCampaigns, setCashbackCampaigns] = useLocalState<CashbackCampaign[]>('cashback', []);

  const [policies, setPolicies] = useLocalState<InsurancePolicy[]>('insurance', []);

  const [faudFlags, setFaudFlags] = useLocalState<Tx[]>('faudFlags', []);

  const [apiKeys, setApiKeys] = useLocalState<{id:string; key:string; name:string; created:string; active:boolean}[]>('apiKeys', []);

  const [webhooks, setWebhooks] = useLocalState<{id:string; url:string; events:string; status:'Active'|'Failed'}[]>('webhooks', []);

  const [auditLog, setAuditLog] = useLocalState<AuditEntry[]>('audit', []);

  const [scheduledPays, setScheduledPays] = useLocalState<ScheduledPayment[]>('scheduled', []);

  const [forexRates, setForexRates] = useLocalState<ForexRate[]>('forex', []);

  const [taxRecords, setTaxRecords] = useLocalState<TaxRecord[]>('tax', []);

  const [budgetItems, setBudgetItems] = useLocalState<BudgetItem[]>('budget', []);

  const [userRoles, setUserRoles] = useLocalState<UserRole[]>('roles', []);

  const [npsbTransfers, setNpsbTransfers] = useLocalState<NpsbTransfer[]>('npsb', []);

  const [posTxns, setPosTxns] = useLocalState<PosTransaction[]>('pos', []);

  const [isDarkMode, setIsDarkMode] = useLocalState<boolean>('darkMode', false);

  const [bankAccounts, setBankAccounts] = useLocalState<BankAccount[]>('bankAccounts', []);

  const [mfsApiStatuses, setMfsApiStatuses] = useLocalState<MfsApiStatus[]>('apiStatus', []);

  const [contactPhones, setContactPhones] = useLocalState<ContactPhone[]>('contacts', []);

  // ---- Algorithm: Customer Risk Score (0-100, lower is better) ----
  const getCustomerRiskScore = (c: any): number => {
    let score = 0;
    if (c.kycStatus !== 'Verified') score += 30;
    if (c.balance < 1000) score += 20;
    if ((c.transactions || 0) < 5) score += 15;
    if (c.status !== 'Active') score += 25;
    return Math.min(100, score + Math.floor(Math.random() * 10));
  };
  const riskLabel = (score: number) => score <= 20 ? 'Low Risk' : score <= 50 ? 'Medium' : 'High Risk';
  const riskColor = (score: number) => score <= 20 ? '#10b981' : score <= 50 ? '#f59e0b' : '#ef4444';

  // ---- Algorithm: Agent Performance Tier ----
  const getAgentTier = (commission: number, allCommissions: number[]): { tier: string; color: string } => {
    const sorted = [...allCommissions].sort((a, b) => b - a);
    const p80 = sorted[Math.floor(sorted.length * 0.2)] || 0;
    const p40 = sorted[Math.floor(sorted.length * 0.6)] || 0;
    if (commission >= p80) return { tier: 'Gold ⭐', color: '#f59e0b' };
    if (commission >= p40) return { tier: 'Silver', color: '#94a3b8' };
    return { tier: 'Bronze', color: '#d97706' };
  };

  // ---- Algorithm: Loan Credit Score ----
  const getLoanCreditScore = (l: LoanRecord): number => {
    let score = 600;
    const totalPayable = l.principal + (l.principal * l.interestRate / 100) * (l.termMonths / 12);
    const repaymentRatio = totalPayable > 0 ? l.repaid / totalPayable : 0;
    score += Math.round(repaymentRatio * 300);
    if (l.status === 'Completed') score += 100;
    if (l.status === 'Overdue') score -= 250;
    return Math.min(850, Math.max(250, score));
  };
  const creditLabel = (score: number) => score >= 700 ? 'Excellent' : score >= 600 ? 'Good' : score >= 500 ? 'Fair' : 'Poor';
  const creditColor = (score: number) => score >= 700 ? '#10b981' : score >= 600 ? '#3b82f6' : score >= 500 ? '#f59e0b' : '#ef4444';

  // ---- Algorithm: Fraud Risk Score per flag ----
  const getFraudRiskScore = (f: Tx): number => {
    let score = 50;
    if (f.amount > 50000) score += 35;
    else if (f.amount > 20000) score += 15;
    if (f.note.includes('40 txn') || f.note.includes('threshold')) score += 25;
    if (f.status === 'Failed') score += 10;
    return Math.min(100, score);
  };

  // ---- Advanced: System Health Score (0-100) ----
  const systemHealthScore = useMemo(() => {
    let score = 100;
    const lowFloatCount = wallets.filter(w => w.status === 'Low Float').length;
    score -= lowFloatCount * 10;
    if (faudFlags.length > 10) score -= 20;
    else if (faudFlags.length > 3) score -= 10;
    if (transactions.length > 0) {
      const failedCount = transactions.filter(t => t.status === 'Failed').length;
      score -= Math.min(20, failedCount * 2);
    }
    if (wallets.filter(w => w.status === 'Suspended').length > 0) score -= 15;
    return Math.max(0, Math.min(100, score));
  }, [wallets, faudFlags, transactions]);
  const healthLabel = (s: number) => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Critical';
  const healthColor = (s: number) => s >= 80 ? '#10b981' : s >= 60 ? '#3b82f6' : s >= 40 ? '#f59e0b' : '#ef4444';

  // ---- Advanced: Customer LTV (Lifetime Value) ----
  const getCustomerLTV = (c: MfsCustomer): number => {
    const txCount = c.transactions || 0;
    const avgTxValue = txCount > 0 ? c.balance / Math.max(1, txCount) : 0;
    const lifespanMonths = Math.max(1, Math.round((Date.now() - new Date(c.joinDate).getTime()) / (30 * 24 * 60 * 60 * 1000)));
    return Math.round(avgTxValue * 12 * lifespanMonths * 0.1);
  };

  // ---- Advanced: Loan Portfolio Health ----
  const loanPortfolioHealth = useMemo(() => {
    const totalLoans = loans.reduce((s, l) => s + l.principal, 0);
    const overdueAmount = loans.filter(l => l.status === 'Overdue').reduce((s, l) => {
      const tp = l.principal + (l.principal * l.interestRate / 100) * (l.termMonths / 12);
      return s + Math.max(0, tp - l.repaid);
    }, 0);
    const nplRatio = totalLoans > 0 ? Math.round((overdueAmount / totalLoans) * 100) : 0;
    return { totalLoans, overdueAmount, nplRatio, healthScore: Math.max(0, 100 - nplRatio * 5) };
  }, [loans]);

  const totalFloat = wallets.reduce((s, w) => s + w.balance, 0);

  // ---- Advanced: Float Rebalance Suggestion ----
  const floatRebalanceSuggestions = useMemo(() => {
    const avgBalance = wallets.length > 0 ? totalFloat / wallets.length : 0;
    return wallets.map(w => {
      const diff = w.balance - avgBalance;
      return { method: w.method, balance: w.balance, avgBalance, diff, action: diff > avgBalance * 0.3 ? 'Withdraw Excess' : diff < -avgBalance * 0.3 ? 'Add Float' : 'Balanced' as 'Add Float' | 'Withdraw Excess' | 'Balanced' };
    }).filter(w => w.action !== 'Balanced');
  }, [wallets, totalFloat]);

  // ---- Advanced: Agent Productivity Score (commission per active day) ----
  const getAgentProductivity = (a: Agent): number => {
    return a.todayTransactions > 0 ? Math.round((a.commission / Math.max(1, a.todayTransactions)) * 100) / 100 : 0;
  };

  // ---- Customer Segmentation ----
  const getCustomerSegment = (c: MfsCustomer, ltv: number): { label: string; color: string } => {
    if (ltv > 50000 || c.transactions > 30) return { label: 'VIP', color: '#f59e0b' };
    if (ltv > 20000 || c.transactions > 15) return { label: 'Gold', color: '#10b981' };
    if (ltv > 5000 || c.transactions > 5) return { label: 'Silver', color: '#94a3b8' };
    return { label: 'Standard', color: '#64748b' };
  };

  // ---- Settlement calculation from orders ----
  const filteredOrders = useMemo(() => {
    const parseDate = (d: string) => { const p = new Date(d); return isNaN(p.getTime()) ? null : p; };
    const anchor = orders.reduce<Date>((max, o) => {
      const d = parseDate(o.date);
      return d && d > max ? d : max;
    }, new Date(0));
    const anchorDay = anchor.getTime() === new Date(0).getTime() ? new Date() : anchor;
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return orders.filter(o => {
      const d = parseDate(o.date);
      if (!d) return true;
      const diffDays = (startOfDay(anchorDay) - startOfDay(d)) / (24 * 60 * 60 * 1000);
      if (timeframe === 'Today') return diffDays <= 0;
      if (timeframe === 'This Week') return diffDays < 7;
      if (timeframe === 'This Month') return diffDays < 30;
      return true;
    });
  }, [orders, timeframe]);

  const methodStats = useMemo(() => {
    const map: Record<string, { count: number; gross: number }> = {};
    filteredOrders.forEach(o => {
      const m = o.paymentMethod;
      if (!m) return;
      map[m] = map[m] || { count: 0, gross: 0 };
      map[m].count += 1;
      map[m].gross += o.amount;
    });
    return map;
  }, [filteredOrders]);

  const businessMethods = ALL_METHODS.filter(m => (methodStats[m]?.count || 0) > 0);

  const settlementRows = useMemo(() => {
    return businessMethods.map(method => {
      const stat = methodStats[method] || { count: 0, gross: 0 };
      const rate = getRate(method);
      const commission = stat.gross * (rate / 100);
      return { method, count: stat.count, gross: stat.gross, rate, commission, net: stat.gross - commission };
    }).sort((a, b) => {
      if (sortBy === 'count') return b.count - a.count;
      if (sortBy === 'commission') return b.commission - a.commission;
      if (sortBy === 'net') return b.net - a.net;
      return b.gross - a.gross;
    });
  }, [businessMethods, methodStats, commissionOverrides, sortBy]);

  const totalGross = settlementRows.reduce((s, c) => s + c.gross, 0);
  const totalCommission = settlementRows.reduce((s, c) => s + c.commission, 0);
  const totalNet = settlementRows.reduce((s, c) => s + c.net, 0);
  const totalCount = settlementRows.reduce((s, c) => s + c.count, 0);

  const liveBudgetItems = useMemo(() => {
    const realActuals: Record<string, number> = {
      'Commission Revenue': totalCommission,
      'Cash-Out Fees': transactions.filter(t => t.type === 'Cash-Out').reduce((s, t) => s + t.fee, 0),
      'Agent Commission': agents.reduce((s, a) => s + a.commission, 0),
      'Settlement Charges': transactions.filter(t => t.type === 'Settlement').reduce((s, t) => s + t.fee, 0)
    };
    return budgetItems.map(b => ({ ...b, actual: realActuals[b.category] ?? b.actual }));
  }, [budgetItems, totalCommission, transactions, agents]);

  const dailyChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const m = o.paymentMethod;
      if (!m || DEFAULT_COMMISSION[m] === 0) return;
      map[o.date] = (map[o.date] || 0) + o.amount;
    });
    return Object.entries(map).map(([day, gross]) => ({ day, gross })).sort((a, b) => a.day.localeCompare(b.day)).slice(-10);
  }, [filteredOrders]);

  // ---- Predictive: Next-period revenue forecast ----
  const revenueForecast = useMemo(() => {
    const vals = dailyChartData.map(d => d.gross);
    if (vals.length < 2) return totalGross;
    const n = vals.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    vals.forEach((y, i) => { sumX += i; sumY += y; sumXY += i * y; sumX2 += i * i; });
    const slope = (n * sumXY - sumX * sumY) / Math.max(1, (n * sumX2 - sumX * sumX));
    return Math.round(Math.max(0, vals[vals.length - 1] + slope));
  }, [dailyChartData, totalGross]);

  const pieData = useMemo(() => settlementRows.map(c => ({ name: c.method, value: Math.round(c.gross) })).filter(d => d.value > 0), [settlementRows]);

  const filteredTx = transactions.filter(t => {
    const matchesSearch = t.id.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.counterparty.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.note.toLowerCase().includes(ledgerSearch.toLowerCase());
    const matchesType = txFilter === 'All' || t.type === txFilter;
    return matchesSearch && matchesType;
  });

  // ---- Action helpers ----
  const addAudit = (action: string, module: string, detail: string) => {
    setAuditLog(prev => [{
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      user: 'System',
      action,
      module,
      detail,
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }, ...prev]);
  };

  const recordTransaction = (t: Omit<Tx, 'id' | 'date' | 'status'>) => {
    const id = `TXN-${Math.floor(9000 + Math.random() * 999)}`;
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setTransactions(prev => [{ ...t, id, date, status: 'Completed' }, ...prev]);
    addAudit('Transaction', t.method, `${t.type}: ${formatBDT(t.amount)} ${t.counterparty || ''} · ${id}`);
  };

  const updateWalletBalance = (method: string, delta: number) => {
    setWallets(prev => {
      const w = prev.find(x => x.method === method);
      if (w && Math.abs(delta) > 0) {
        addAudit('Balance', method, `${delta > 0 ? 'Credit' : 'Debit'} ${formatBDT(Math.abs(delta))} · Balance: ${formatBDT(Math.max(0, w.balance + delta))}`);
      }
      return prev.map(w => w.method === method ? { ...w, balance: Math.max(0, w.balance + delta) } : w);
    });
  };

  const handleExportCSV = () => {
    const headers = ['Payment Method', 'Transactions', 'Gross Amount (BDT)', 'Commission Rate (%)', 'Commission (BDT)', 'Net Settlement (BDT)'];
    const rows = settlementRows.map(c => [c.method, c.count, c.gross.toFixed(2), c.rate.toFixed(2), c.commission.toFixed(2), c.net.toFixed(2)]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `mfs_system_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---- Form states ----
  const [cashInMethod, setCashInMethod] = useState('bKash');
  const [cashInAmount, setCashInAmount] = useState(0);
  const [cashInFrom, setCashInFrom] = useState('');
  const [cashOutMethod, setCashOutMethod] = useState('bKash');
  const [cashOutAmount, setCashOutAmount] = useState(0);
  const [cashOutAgent, setCashOutAgent] = useState('');
  const [transferFrom, setTransferFrom] = useState('bKash');
  const [transferTo, setTransferTo] = useState('Nagad');
  const [transferAmount, setTransferAmount] = useState(0);
  const [billMethod, setBillMethod] = useState('bKash');
  const [billProvider, setBillProvider] = useState(BILL_PROVIDERS[0].name);
  const [billAccount, setBillAccount] = useState('');
  const [billAmount, setBillAmount] = useState(0);
  const [rechargeMethod, setRechargeMethod] = useState('bKash');
  const [rechargeAmount, setRechargeAmount] = useState(0);
  const [floatMethod, setFloatMethod] = useState('bKash');
  const [floatAmount, setFloatAmount] = useState(0);
  const [floatAction, setFloatAction] = useState<'Add' | 'Withdraw'>('Add');
  const [rechargeNumber, setRechargeNumber] = useState('');

  // New module form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerMethod, setCustomerMethod] = useState('bKash');
  const [customerKyc, setCustomerKyc] = useState<'Verified' | 'Pending' | 'Rejected'>('Pending');
  const [qrMethod, setQrMethod] = useState('bKash');
  const [qrAmount, setQrAmount] = useState(0);
  const [qrMerchant, setQrMerchant] = useState('');
  const [loanCustomer, setLoanCustomer] = useState('');
  const [loanPhone, setLoanPhone] = useState('');
  const [loanMethod, setLoanMethod] = useState('bKash');
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanTerm, setLoanTerm] = useState(12);
  const [loanRate, setLoanRate] = useState(18);
  const [savCustomer, setSavCustomer] = useState('');
  const [savPhone, setSavPhone] = useState('');
  const [savMethod, setSavMethod] = useState('bKash');
  const [savAmount, setSavAmount] = useState(0);
  const [savTenure, setSavTenure] = useState('12 months');
  const [cardName, setCardName] = useState('');
  const [cardMethod, setCardMethod] = useState('Visa Card');
  const [cardLimit, setCardLimit] = useState(20000);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('');
  const [cardStep, setCardStep] = useState<1|2>(1);
  const [otpValue, setOtpValue] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Tx | null>(null);
  const [notificationFilter, setNotificationFilter] = useState<string>('All');
  const [reconciledMethods, setReconciledMethods] = useState<string[]>([]);
  const [reconSearch, setReconSearch] = useState('');
  const [savAddId, setSavAddId] = useState<string | null>(null);
  const [savAddAmt, setSavAddAmt] = useState(0);

  // New module form states
  const [remSender, setRemSender] = useState(''); const [remReceiver, setRemReceiver] = useState('');
  const [remFrom, setRemFrom] = useState('Saudi Arabia'); const [remToMethod, setRemToMethod] = useState('bKash');
  const [remFgnAmt, setRemFgnAmt] = useState(0); const [remRate, setRemRate] = useState(29.5);
  const [remCurr, setRemCurr] = useState('SAR'); const [remBDT, setRemBDT] = useState(0);
  const [merchantName, setMerchantName] = useState(''); const [merchantCat, setMerchantCat] = useState('Grocery');
  const [merchantCity, setMerchantCity] = useState(''); const [merchantMethod, setMerchantMethod] = useState('bKash');
  const [dispTxnId, setDispTxnId] = useState(''); const [dispReason, setDispReason] = useState('');
  const [dispMethod, setDispMethod] = useState('bKash'); const [dispAmt, setDispAmt] = useState(0);
  const [cbTitle, setCbTitle] = useState(''); const [cbMethod, setCbMethod] = useState('bKash');
  const [cbPct, setCbPct] = useState(5); const [cbMax, setCbMax] = useState(100);
  const [insName, setInsName] = useState(''); const [insPhone, setInsPhone] = useState('');
  const [insType, setInsType] = useState('Health'); const [insProvider, setInsProvider] = useState('Pragati Life');
  const [insPrem, setInsPrem] = useState(0); const [insCover, setInsCover] = useState(0);
  const [eduMethod, setEduMethod] = useState('bKash'); const [eduProvider, setEduProvider] = useState(EDU_PROVIDERS[0].name);
  const [eduStudentId, setEduStudentId] = useState(''); const [eduAmt, setEduAmt] = useState(0);
  const [tktMethod, setTktMethod] = useState('bKash'); const [tktProvider, setTktProvider] = useState(TICKET_PROVIDERS[0].name);
  const [tktQty, setTktQty] = useState(1); const [tktAmt, setTktAmt] = useState(0);
  const [salaryMethod, setSalaryMethod] = useState('bKash'); const [salaryAmt, setSalaryAmt] = useState(0); const [salaryEmp, setSalaryEmp] = useState('');
  const [govtMethod, setGovtMethod] = useState('bKash'); const [govtProvider, setGovtProvider] = useState(GOVT_PROVIDERS[0].name);
  const [govtRef, setGovtRef] = useState(''); const [govtAmt, setGovtAmt] = useState(0);
  const [bulkRows, setBulkRows] = useState<{phone:string; amount:number}[]>([{phone:'017XXXXXXXX',amount:500}]);
  const [bulkMethod, setBulkMethod] = useState('bKash');
  const [reqMethod, setReqMethod] = useState('bKash'); const [reqAmt, setReqAmt] = useState(0); const [reqTo, setReqTo] = useState('');
  const [refName, setRefName] = useState(''); const [refPhone, setRefPhone] = useState('');
  const [refBonus, setRefBonus] = useState(50); const [refCode, setRefCode] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bKash'); const [withdrawAmt, setWithdrawAmt] = useState(0);
  const [withdrawBank, setWithdrawBank] = useState(''); const [withdrawAcct, setWithdrawAcct] = useState('');
  const [fraudRule, setFraudRule] = useState(''); const [apiName, setApiName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(''); const [webhookEvents, setWebhookEvents] = useState('payment.success');
  const [schName, setSchName] = useState(''); const [schMethod, setSchMethod] = useState('bKash');
  const [schAmt, setSchAmt] = useState(0); const [schFreq, setSchFreq] = useState('Monthly');
  const [schTo, setSchTo] = useState('');
  const [npsbMethod, setNpsbMethod] = useState('bKash'); const [npsbBank, setNpsbBank] = useState('');
  const [npsbBranch, setNpsbBranch] = useState(''); const [npsbAcct, setNpsbAcct] = useState('');
  const [npsbAmt, setNpsbAmt] = useState(0);
  const [posTerminal, setPosTerminal] = useState('POS-T1'); const [posMethod, setPosMethod] = useState('bKash');
  const [posAmount, setPosAmount] = useState(0); const [posMerchant, setPosMerchant] = useState('');
  const [roleName, setRoleName] = useState(''); const [roleType, setRoleType] = useState<'Super Admin'|'Admin'|'Agent'|'Viewer'>('Agent');
  const [rolePerms, setRolePerms] = useState('');
  const [forexBuy, setForexBuy] = useState(0); const [forexSell, setForexSell] = useState(0);
  const [forexCurr, setForexCurr] = useState(''); const [forexCountry, setForexCountry] = useState('');
  const [taxType, setTaxType] = useState<'TDS'|'VAT'>('TDS'); const [taxAmt, setTaxAmt] = useState(0);
  const [taxRate, setTaxRate] = useState(5); const [taxPeriod, setTaxPeriod] = useState('');
  const [budgetCat, setBudgetCat] = useState(''); const [budgetPlan, setBudgetPlan] = useState(0);
  const [budgetAct, setBudgetAct] = useState(0);
  const [bnkBank, setBnkBank] = useState(''); const [bnkAcct, setBnkAcct] = useState('');
  const [bnkBranch, setBnkBranch] = useState(''); const [bnkType, setBnkType] = useState('Current');
  const [bnkMethod, setBnkMethod] = useState('bKash'); const [bnkBalance, setBnkBalance] = useState(0);
  const [bnkPhone, setBnkPhone] = useState('');
  const [ctName, setCtName] = useState(''); const [ctPhone, setCtPhone] = useState('');
  const [ctType, setCtType] = useState<'Merchant'|'Customer'|'Agent'|'Bank'|'Support'>('Merchant');
  const [apiProvider, setApiProvider] = useState('bKash');   const [apiKey, setApiKey] = useState('');
  const [copiedApi, setCopiedApi] = useState<string|null>(null);
  const [editingBank, setEditingBank] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editingApi, setEditingApi] = useState<string | null>(null);
  const [editBnkName, setEditBnkName] = useState(''); const [editBnkAcct, setEditBnkAcct] = useState('');
  const [editBnkPhone, setEditBnkPhone] = useState(''); const [editCtEditName, setEditCtEditName] = useState('');
  const [editCtEditPhone, setEditCtEditPhone] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletMethod, setNewWalletMethod] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [newWalletBalance, setNewWalletBalance] = useState(0);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showCardDetail, setShowCardDetail] = useState<VirtualCard|null>(null);
  const [agentName, setAgentName] = useState('');
  const [agentArea, setAgentArea] = useState('');
  const [agentMethod, setAgentMethod] = useState('bKash');
  const [agentWallet, setAgentWallet] = useState(0);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: UserRound },
    { id: 'wallets', label: 'Wallets', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'cashinout', label: 'Cash In / Out', icon: ArrowDownToLine },
    { id: 'transfers', label: 'Transfers', icon: Send },
    { id: 'qr', label: 'QR Payments', icon: ScanLine },
    { id: 'bills', label: 'Bill Pay', icon: Receipt },
    { id: 'loans', label: 'Loans', icon: HandCoins },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'cards', label: 'Cards', icon: CreditCard },
    { id: 'float', label: 'Float', icon: Banknote },
    { id: 'settlement', label: 'Settlement', icon: Percent },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'reconcile', label: 'Reconcile', icon: Scale },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings2 },
    { id: 'remittance', label: 'Remittance', icon: Globe },
    { id: 'merchants', label: 'Merchants', icon: Store },
    { id: 'disputes', label: 'Disputes', icon: ShieldCheck },
    { id: 'cashback', label: 'Cashback', icon: Sparkles },
    { id: 'insurance', label: 'Insurance', icon: ShieldCheck },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'salary', label: 'Salary', icon: DollarSign },
    { id: 'govt', label: 'Govt Pay', icon: Building2 },
    { id: 'bulkpayout', label: 'Bulk Payout', icon: List },
    { id: 'payrequest', label: 'Pay Request', icon: Send },
    { id: 'referral', label: 'Referral', icon: Gift },
    { id: 'withdraw', label: 'Withdraw', icon: Banknote },
    { id: 'fraud', label: 'Fraud Detect', icon: ShieldCheck },
    { id: 'api', label: 'Dev API', icon: Code },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'scheduled', label: 'Scheduled Pay', icon: Calendar },
    { id: 'forex', label: 'Forex Rates', icon: Globe },
    { id: 'tax', label: 'Tax / VAT', icon: Percent },
    { id: 'budget', label: 'Budget', icon: BarChart3 },
    { id: 'ticker', label: 'Live Ticker', icon: Zap },
    { id: 'roles', label: 'User Roles', icon: ShieldCheck },
    { id: 'npsb', label: 'NPSB Transfer', icon: Building2 },
    { id: 'pos', label: 'POS Terminal', icon: CreditCard },
    { id: 'theme', label: 'Theme', icon: Eye },
    { id: 'bankhub', label: 'Bank & API Hub', icon: CreditCard },
    { id: 'profile360', label: '360° Profile', icon: UserRound }
  ];

  const renderWalletIcon = (method: string, size = 40) => (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-[12px] shrink-0"
      style={{ backgroundColor: `${METHOD_COLORS[method]}22`, color: METHOD_COLORS[method], border: `1px solid ${METHOD_COLORS[method]}40` }}>
      {method === 'bKash' ? 'b' : method === 'Cash on Delivery' ? 'COD' : method[0]}
    </div>
  );

  const txTypeBadge = (type: TxType) => {
    const colors: Record<TxType, string> = {
      'Cash-In': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'Cash-Out': 'bg-red-500/10 text-red-400 border-red-500/30',
      'Transfer': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'Bill Pay': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      'Mobile Recharge': 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      'Merchant QR': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      'Settlement': 'bg-teal-500/10 text-teal-400 border-teal-500/30'
    };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${colors[type]}`}>{type}</span>;
  };

  return (
    <div className="space-y-6 fade-in" data-mfs-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-brand-orange" />
            <span>NexaGo BD MFS</span>
          </h2>
          <p className="text-xs text-gray-400">Full mobile financial services &nbsp;|&nbsp; <span className="text-brand-orange">Support: thenexagobd@gmail.com</span></p>
        </div>
        <div className="flex items-center space-x-2 shrink-0 text-[10px]">
          <span className={`px-2 py-0.5 rounded ${wallets.filter(w=>w.status==='Low Float').length>0?'bg-amber-500/10 text-amber-400':'bg-emerald-500/10 text-emerald-400'}`}>● {wallets.filter(w=>w.status==='Low Float').length} Low Float</span>
          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400">⚠ {faudFlags.length} Alerts</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">◉ {agents.filter(a=>a.status==='Active').length} Agents</span>
        </div>
      </div>
      <div className="flex items-center space-x-2 shrink-0 flex-wrap">
        <div className="flex items-center space-x-1 bg-brand-dark p-1 rounded-lg border border-brand-border/60">
          {(['Today', 'This Week', 'This Month', 'All Time'] as const).map((t) => (
            <button key={t} onClick={() => setTimeframe(t)} className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${timeframe === t ? 'bg-brand-orange text-white' : 'text-gray-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>
        <button onClick={handleExportCSV} className="flex items-center space-x-1.5 px-3 py-2 bg-brand-dark hover:bg-white/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-all"><Download className="w-4 h-4" /> Export</button>
      </div>
      <div className="flex items-center space-x-2 text-[10px] flex-wrap">
        <span className={`px-2 py-0.5 rounded ${wallets.filter(w=>w.status==='Low Float').length>0?'bg-amber-500/10 text-amber-400 border border-amber-500/20':'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} font-bold`}>Wallets: {wallets.length} active</span>
        <span className={`px-2 py-0.5 rounded ${faudFlags.length>0?'bg-red-500/10 text-red-400 border border-red-500/20':'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} font-bold`}>Alerts: {faudFlags.length}</span>
        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">Agents: {agents.filter(a=>a.status==='Active').length} active</span>
        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">TX Today: {transactions.length}</span>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center space-x-2 border-b border-brand-border/60 pb-3 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              tab === t.id ? 'bg-brand-orange text-white shadow-md' : 'bg-brand-card text-gray-400 hover:text-white border border-brand-border'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ===================== OVERVIEW ===================== */}
      {tab === 'overview' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">System Health</p>
              <p className="text-xl font-black mt-1" style={{color:healthColor(systemHealthScore)}}>{healthLabel(systemHealthScore)}</p>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5"><div className="h-full rounded-full transition-all" style={{width:`${systemHealthScore}%`,backgroundColor:healthColor(systemHealthScore)}}></div></div>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Loan Health (NPL)</p>
              <p className="text-xl font-black mt-1" style={{color:loanPortfolioHealth.nplRatio>10?'#ef4444':loanPortfolioHealth.nplRatio>5?'#f59e0b':'#10b981'}}>{loanPortfolioHealth.nplRatio}% NPL</p>
              <p className="text-[10px] text-gray-500 mt-0.5">৳{loanPortfolioHealth.overdueAmount.toLocaleString()} overdue</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Float / Wallet Balance</p>
              <p className="text-xl font-black text-white mt-1">{formatBDT(totalFloat)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{wallets.filter(w => w.status === 'Active').length} active wallets</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Gross MFS Collection</p>
              <p className="text-xl font-black text-white mt-1">{formatBDT(totalGross)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{totalCount} transactions ({timeframe})</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Commission Earned</p>
              <p className="text-xl font-black text-amber-400 mt-1">{formatBDT(totalCommission)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Business revenue from MFS</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Net Payable</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{formatBDT(totalNet)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">After all commission</p>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-orange/30 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-brand-orange animate-pulse" /> Predictive Analytics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-[10px] text-gray-400 uppercase font-bold">Next Day Forecast</p><p className="text-lg font-black text-emerald-400">{formatBDT(revenueForecast)}</p><p className="text-[9px] text-gray-500">Based on linear trend</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase font-bold">Growth Trend</p><p className="text-lg font-black text-blue-400">{dailyChartData.length>=2?(((dailyChartData[dailyChartData.length-1].gross/dailyChartData[0].gross)-1)*100).toFixed(1):'0'}%</p><p className="text-[9px] text-gray-500">Period over period</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase font-bold">Confidence</p><p className="text-lg font-black text-amber-400">{Math.min(95,60+Math.min(35,dailyChartData.length*5))}%</p><p className="text-[9px] text-gray-500">Based on {dailyChartData.length} data points</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-brand-border/60 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-brand-orange" /> Daily MFS Collection</h3>
                <p className="text-[11px] text-gray-400">Gross collection per day ({timeframe})</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} formatter={(v: any) => formatBDT(Number(v))} />
                    <Bar dataKey="gross" name="Collection" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-brand-border/60 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><PiggyBank className="w-4 h-4 text-emerald-400" /> Wallet Balances</h3>
                <p className="text-[11px] text-gray-400">Current float per wallet</p>
              </div>
              <div className="space-y-3">
                {wallets.map(w => (
                  <div key={w.method} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2.5">
                      {renderWalletIcon(w.method)}
                      <div>
                        <p className="text-xs font-bold text-white">{w.method}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                          w.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : w.status === 'Low Float' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                        }`}>{w.status}</span>
                      </div>
                    </div>
                    <p className="text-sm font-black font-mono text-white">{formatBDT(w.balance)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-brand-border/60 pb-3">
                <h3 className="text-sm font-bold text-white">Today's P&L Summary</h3>
                <p className="text-[11px] text-gray-400">Profit & Loss from all MFS revenue channels</p>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5">
                  <span className="text-[11px] text-gray-300">Commission Revenue</span>
                  <span className="text-sm font-black text-emerald-400">{formatBDT(totalCommission)}</span>
                </div>
                <div className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5">
                  <span className="text-[11px] text-gray-300">Cash-Out & Transfer Fees</span>
                  <span className="text-sm font-black text-amber-400">{formatBDT(transactions.reduce((s,t)=>s+t.fee,0))}</span>
                </div>
                <div className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5">
                  <span className="text-[11px] text-gray-300">Loan Interest (active)</span>
                  <span className="text-sm font-black text-blue-400">{formatBDT(loans.filter(l=>l.status==='Active').reduce((s,l)=>{const tp=l.principal+(l.principal*l.interestRate/100)*(l.termMonths/12); return s+(tp-l.principal);},0))}</span>
                </div>
                <div className="flex items-center justify-between border-t border-brand-border/60 pt-2.5">
                  <span className="text-[11px] font-black text-white">Total Revenue</span>
                  <span className="text-lg font-black text-white">{formatBDT(totalCommission+transactions.reduce((s,t)=>s+t.fee,0))}</span>
                </div>
              </div>
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-brand-border/60 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-brand-orange" /> Top Agents</h3>
              </div>
              <div className="space-y-2.5">
                {[...agents].sort((a,b)=>b.commission-a.commission).slice(0,5).map((a,idx)=>(
                  <div key={a.id} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] ${idx===0?'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40':idx===1?'bg-slate-400/20 text-slate-300 border border-slate-400/40':idx===2?'bg-amber-700/20 text-amber-600 border border-amber-700/40':'bg-gray-700/20 text-gray-400 border border-gray-700/40'}`}>{idx+1}</span>
                      <div><p className="text-xs font-bold text-white">{a.name}</p><p className="text-[9px] text-gray-500">{a.area} · {a.method}</p></div>
                    </div>
                    <div className="text-right"><p className="text-sm font-black font-mono text-emerald-400">{formatBDT(a.commission)}</p><p className="text-[9px] text-gray-500">{a.todayTransactions} TX</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-brand-border/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Recent MFS Activity
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live</span>
                </span>
              </h3>
              <button onClick={() => setTab('transactions')} className="text-[11px] font-bold text-brand-orange hover:underline cursor-pointer">View All →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead>
                  <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40">
                    <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[10px]">TX ID</th>
                    <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[10px]">Type</th>
                    <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[10px]">Method</th>
                    <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[10px]">Amount</th>
                    <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {transactions.slice(0, 6).map(t => (
                    <tr key={t.id} className="hover:bg-brand-dark/20">
                      <td className="py-2.5 px-4 font-mono font-bold text-gray-300">{t.id}</td>
                      <td className="py-2.5 px-4">{txTypeBadge(t.type)}</td>
                      <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${METHOD_COLORS[t.method]}1a`, color: METHOD_COLORS[t.method], borderColor: `${METHOD_COLORS[t.method]}40` }}>{t.method}</span></td>
                      <td className="py-2.5 px-4 font-mono font-bold text-white">{formatBDT(t.amount)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          t.status === 'Processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== WALLETS ===================== */}
      {tab === 'wallets' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map(w => (
              <div key={w.method} className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {renderWalletIcon(w.method)}
                    <div>
                      <p className="font-bold text-white">{w.method}</p>
                      <p className="text-[10px] text-gray-400">{w.label}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                    w.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    w.status === 'Low Float' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>{w.status}</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Available Balance</p>
                  <p className="text-2xl font-black font-mono text-white mt-1">{formatBDT(w.balance)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5">
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Total Cash-In</p>
                    <p className="text-xs font-black text-emerald-400 mt-0.5">{formatBDT(w.cashInTotal)}</p>
                  </div>
                  <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5">
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Total Cash-Out</p>
                    <p className="text-xs font-black text-red-400 mt-0.5">{formatBDT(w.cashOutTotal)}</p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-brand-dark rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (w.balance / 50000) * 100)}%`, backgroundColor: METHOD_COLORS[w.method] }}></div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-brand-border/40">
                  <div className="flex items-center space-x-1.5">
                    <button onClick={() => {
                      updateWalletBalance(w.method, 1000);
                      recordTransaction({ type: 'Cash-In', method: w.method, amount: 1000, fee: 0, counterparty: `Manual Top-up`, note: `Quick cash-in to ${w.method}` });
                    }} className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-[10px] font-bold cursor-pointer transition-all">+ Cash-In</button>
                    <button onClick={() => {
                      if (w.balance >= 500) {
                        updateWalletBalance(w.method, -500);
                        recordTransaction({ type: 'Cash-Out', method: w.method, amount: 500, fee: 8, counterparty: 'Manual Withdrawal', note: `Quick cash-out from ${w.method}` });
                      }
                    }} className="px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded text-[10px] font-bold cursor-pointer transition-all">- Cash-Out</button>
                    <button onClick={() => setWallets(prev => prev.map(x => x.method === w.method ? { ...x, status: x.status === 'Active' ? 'Low Float' : x.status === 'Low Float' ? 'Suspended' : 'Active' } : x))} className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                      w.status === 'Active' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500 hover:text-white' :
                      w.status === 'Low Float' ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                    }`}>{w.status === 'Active' ? 'Low Float' : w.status === 'Low Float' ? 'Suspend' : 'Activate'}</button>
                  </div>
                  <button onClick={() => setEditingWallet(editingWallet === w.method ? null : w.method)} className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer font-bold">
                    {editingWallet === w.method ? 'Cancel' : '✎ Label'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">{transactions.filter(t=>t.method===w.method).length} activities</span>
                  <button onClick={() => setWallets(prev => prev.filter(x => x.method !== w.method))} className="p-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded cursor-pointer transition-all" title="Delete"><X className="w-2.5 h-2.5" /></button>
                </div>
                {editingWallet === w.method && (
                  <div className="flex items-center space-x-2 fade-in">
                    <input type="text" defaultValue={w.label} onBlur={(e) => { setWallets(prev => prev.map(x => x.method === w.method ? { ...x, label: e.target.value } : x)); setEditingWallet(null); }} className="flex-1 px-2.5 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange" autoFocus />
                    <button onClick={() => setEditingWallet(null)} className="px-2 py-1.5 bg-brand-orange text-white rounded text-xs font-bold cursor-pointer">Save</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="bg-brand-dark/30 border border-brand-border/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-brand-orange" />
              <div>
                <p className="text-xs font-bold text-white">Add a New MFS Wallet Account</p>
                <p className="text-[10px] text-gray-400">Register a new wallet / gateway to start accepting payments</p>
              </div>
            </div>
            <button onClick={() => setShowAddWallet(prev => !prev)} className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5" /> {showAddWallet ? 'Close' : 'Add Wallet'}
            </button>
          </div>

          {showAddWallet && (
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4 fade-in">
              <h3 className="text-sm font-bold text-white">Register New Wallet Account</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input type="text" value={newWalletMethod} onChange={(e) => setNewWalletMethod(e.target.value)} placeholder="Method name (e.g. Shwapno)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <input type="text" value={newWalletLabel} onChange={(e) => setNewWalletLabel(e.target.value)} placeholder="Label (e.g. Business Wallet)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <input type="number" min="0" value={newWalletBalance} onChange={(e) => setNewWalletBalance(Number(e.target.value))} placeholder="Opening balance (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <button
                  onClick={() => {
                    if (!newWalletMethod.trim()) return;
                    const method = newWalletMethod.trim();
                    setWallets(prev => [...prev, { method, label: newWalletLabel.trim() || 'Business Wallet', balance: newWalletBalance, cashInTotal: 0, cashOutTotal: 0, status: 'Active' }]);
                    recordTransaction({ type: 'Cash-In', method, amount: newWalletBalance, fee: 0, counterparty: 'New Wallet Setup', note: 'Opening balance / initial float' });
                    setNewWalletMethod(''); setNewWalletLabel(''); setNewWalletBalance(0); setShowAddWallet(false);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Register Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TRANSACTIONS ===================== */}
      {tab === 'transactions' && (
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-brand-border/60">
            <h3 className="text-sm font-bold text-white">Full Transaction Ledger</h3>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input type="text" value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} placeholder="Search TX / party..." className="w-44 pl-8 pr-2 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <select value={txFilter} onChange={(e) => setTxFilter(e.target.value)} className="px-2 py-1.5 bg-brand-dark text-white text-xs font-bold border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                <option value="All">All Types</option>
                {['Cash-In', 'Cash-Out', 'Transfer', 'Bill Pay', 'Mobile Recharge', 'Merchant QR', 'Settlement'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40">
                  <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">TX ID</th>
                  <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Type</th>
                  <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Method</th>
                  <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Counterparty</th>
                  <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Amount</th>
                  <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Fee</th>
                  <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Date</th>
                  <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {filteredTx.map(t => (
                  <tr key={t.id} className="hover:bg-brand-dark/20 transition-colors cursor-pointer" onClick={() => setSelectedReceipt(t)}>
                    <td className="py-3 px-4 font-mono font-bold text-gray-300">{t.id}</td>
                    <td className="py-3 px-4">{txTypeBadge(t.type)}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${METHOD_COLORS[t.method]}1a`, color: METHOD_COLORS[t.method], borderColor: `${METHOD_COLORS[t.method]}40` }}>{t.method}</span></td>
                    <td className="py-3 px-4">
                      <p className="text-gray-200 font-medium">{t.counterparty}</p>
                      <p className="text-[10px] text-gray-500">{t.note}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(t.amount)}</td>
                    <td className="py-3 px-4 font-mono text-gray-400">{t.fee > 0 ? formatBDT(t.fee) : '—'}</td>
                    <td className="py-3 px-4 text-gray-400">{t.date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        t.status === 'Processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
                {filteredTx.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-500 text-xs">No transactions found.</td></tr>}
              </tbody>
            </table>
          </div>
          {selectedReceipt && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedReceipt(null)}>
              <div className="bg-white text-black rounded-lg max-w-md w-full shadow-2xl border-2 border-gray-800 overflow-hidden" onClick={(e) => e.stopPropagation()} id="mfs-receipt">
                <div className="bg-gray-900 text-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-black tracking-wider uppercase">The NexaGo BD</h2><p className="text-[9px] text-gray-400">MFS Transaction Receipt</p></div>
                    <div className="text-right"><p className="text-[8px] text-gray-400">VAT: 19081004567</p><p className="text-[8px] text-gray-400">TIN: 483512567890</p><p className="text-[8px] text-gray-400">Trade Lic: TL-2024-00842</p></div>
                  </div>
                  <div className="border-t border-gray-700 mt-2 pt-2 flex items-center justify-between">
                    <p className="text-[11px] font-black tracking-widest">TRANSACTION RECEIPT</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${selectedReceipt.status==='Completed'?'bg-emerald-600 text-white':'bg-amber-500 text-white'}`}>{selectedReceipt.status}</span>
                  </div>
                </div>
                <div className="px-6 py-3 grid grid-cols-2 gap-2 text-[9px] bg-gray-50 border-b border-gray-300">
                  <div><span className="text-gray-500">TX ID</span><p className="font-mono font-bold">{selectedReceipt.id}</p></div>
                  <div><span className="text-gray-500">Date</span><p className="font-mono font-bold">{selectedReceipt.date}</p></div>
                  <div><span className="text-gray-500">Type</span><p className="font-mono font-bold">{txTypeBadge(selectedReceipt.type)}</p></div>
                  <div><span className="text-gray-500">Method</span><p className="font-bold">{selectedReceipt.method}</p></div>
                </div>
                <div className="px-6 py-3"><table className="w-full text-[10px]"><thead className="border-b-2 border-gray-800"><tr><th className="text-left py-1.5 text-gray-600 uppercase text-[9px]">Description</th><th className="text-right py-1.5 text-gray-600 uppercase text-[9px]">Amount (BDT)</th></tr></thead><tbody className="divide-y divide-gray-200"><tr><td className="py-1.5">Transaction Amount</td><td className="text-right py-1.5 font-mono font-bold">{formatBDT(selectedReceipt.amount)}</td></tr><tr><td className="py-1.5">Service Fee</td><td className="text-right py-1.5 font-mono text-red-600">({formatBDT(selectedReceipt.fee||0)})</td></tr></tbody><tfoot><tr className="border-t-2 border-gray-800"><td className="py-2 font-black text-xs uppercase">Net Amount</td><td className="text-right py-2 font-black text-lg font-mono border-t-2 border-gray-800">{formatBDT(selectedReceipt.amount-(selectedReceipt.fee||0))}</td></tr></tfoot></table></div>
                <div className="px-6 py-2 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-[8px] text-gray-500"><span className="text-gray-400">To/From:</span> <span className="font-bold text-gray-800">{selectedReceipt.counterparty}</span><br/><span className="text-gray-400">Note:</span> {selectedReceipt.note}</div>
                  <div className="w-14 h-14 rounded-full border-2 border-green-600 flex items-center justify-center" style={{borderStyle:'dashed',borderWidth:'3px',transform:'rotate(-12deg)'}}><div className="text-center"><p className="text-[6px] font-black text-green-600">PAID</p><p className="text-[5px] text-green-500">STAMP</p></div></div>
                </div>
                <div className="px-6 py-2 bg-gray-100 border-t border-gray-300 text-center"><p className="text-[7px] text-gray-500">This is a computer-generated receipt • The NexaGo BD</p><p className="text-[7px] text-gray-400">VAT: 19081004567 • TIN: 483512567890 • thenexagobd@gmail.com</p></div>
                <div className="flex items-center divide-x divide-gray-300 border-t border-gray-300">
                  <button onClick={()=>{const el=document.getElementById('mfs-receipt');if(el){const clone=el.cloneNode(true)as HTMLElement;const btns=clone.querySelectorAll('button');btns.forEach(b=>b.remove());const w=window.open('','_blank','width=500,height=900');w?.document.write(`<!DOCTYPE html><html><head><title>Receipt ${selectedReceipt.id}</title><script src="https://cdn.tailwindcss.com"><\/script><style>@media print{@page{size:A4;margin:10mm}body{print-color-adjust:exact}}</style></head><body class="bg-white flex justify-center p-6"><div class="max-w-[190mm] w-full">${clone.outerHTML}</div></body></html>`);w?.document.close();setTimeout(()=>w?.print(),1500);}}} className="flex-1 py-2.5 text-gray-700 hover:bg-gray-100 text-xs font-bold cursor-pointer transition-colors flex items-center justify-center">🖨 Print</button>
                  <button onClick={()=>setSelectedReceipt(null)} className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== CASH IN / OUT ===================== */}
      {tab === 'cashinout' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ArrowDownToLine className="w-4 h-4 text-emerald-400" /> Cash-In (Receive Money)</h3>
            <p className="text-[11px] text-gray-400">Record money received into a wallet</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Wallet / Method</label>
                <select value={cashInMethod} onChange={(e) => setCashInMethod(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                  {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Sender Name / Account</label>
                <input type="text" value={cashInFrom} onChange={(e) => setCashInFrom(e.target.value)} placeholder="Enter merchant or phone" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Amount (৳)</label>
                <input type="number" min="0" value={cashInAmount} onChange={(e) => setCashInAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <button
                onClick={() => {
                  if (cashInAmount <= 0) return;
                  recordTransaction({ type: 'Cash-In', method: cashInMethod, amount: cashInAmount, fee: 0, counterparty: cashInFrom || 'Wallet Deposit', note: 'Manual cash-in entry' });
                  updateWalletBalance(cashInMethod, cashInAmount);
                  setCashInAmount(0); setCashInFrom('');
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Confirm Cash-In
              </button>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ArrowUpFromLine className="w-4 h-4 text-red-400" /> Cash-Out (Send / Withdraw)</h3>
            <p className="text-[11px] text-gray-400">Record money sent out of a wallet (withdrawal / payout)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Wallet / Method</label>
                <select value={cashOutMethod} onChange={(e) => setCashOutMethod(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                  {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Recipient / Agent</label>
                <input type="text" value={cashOutAgent} onChange={(e) => setCashOutAgent(e.target.value)} placeholder="e.g. Agent - Mirpur 10" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Amount (৳)</label>
                <input type="number" min="0" value={cashOutAmount} onChange={(e) => setCashOutAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <button
                onClick={() => {
                  if (cashOutAmount <= 0) return;
                  const fee = cashOutAmount * 0.017;
                  recordTransaction({ type: 'Cash-Out', method: cashOutMethod, amount: cashOutAmount, fee, counterparty: cashOutAgent || 'Withdrawal', note: 'Manual cash-out entry' });
                  updateWalletBalance(cashOutMethod, -(cashOutAmount + fee));
                  setCashOutAmount(0); setCashOutAgent('');
                }}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Confirm Cash-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TRANSFERS ===================== */}
      {tab === 'transfers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Send className="w-4 h-4 text-blue-400" /> Wallet-to-Wallet Transfer</h3>
            <p className="text-[11px] text-gray-400">Move float between your business wallets</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">From Wallet</label>
                  <select value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                    {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">To Wallet</label>
                  <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                    {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Transfer Amount (৳)</label>
                <input type="number" min="0" value={transferAmount} onChange={(e) => setTransferAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <button
                onClick={() => {
                  if (transferAmount <= 0 || transferFrom === transferTo) return;
                  const fee = transferAmount * 0.002;
                  recordTransaction({ type: 'Transfer', method: transferFrom, amount: transferAmount, fee, counterparty: transferTo, note: 'Internal wallet transfer' });
                  updateWalletBalance(transferFrom, -(transferAmount + fee));
                  updateWalletBalance(transferTo, transferAmount);
                  setTransferAmount(0);
                }}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Transfer Float
              </button>
              {transferFrom === transferTo && <p className="text-[10px] text-red-400">From and To wallet cannot be the same.</p>}
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Smartphone className="w-4 h-4 text-purple-300" /> Mobile Recharge / Top-up</h3>
            <p className="text-[11px] text-gray-400">Recharge a mobile number from a wallet</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Wallet</label>
                <select value={rechargeMethod} onChange={(e) => setRechargeMethod(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                  {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Mobile Number</label>
                <input type="text" value={rechargeNumber} onChange={(e) => setRechargeNumber(e.target.value)} placeholder="017XXXXXXXX" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Recharge Amount (৳)</label>
                <input type="number" min="0" value={rechargeAmount} onChange={(e) => setRechargeAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <button
                onClick={() => {
                  if (rechargeAmount <= 0 || !rechargeNumber) return;
                  const fee = rechargeAmount * 0.01;
                  recordTransaction({ type: 'Mobile Recharge', method: rechargeMethod, amount: rechargeAmount, fee, counterparty: rechargeNumber, note: 'Prepaid mobile recharge' });
                  updateWalletBalance(rechargeMethod, -(rechargeAmount + fee));
                  setRechargeAmount(0); setRechargeNumber('');
                }}
                className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Recharge Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== BILL PAY ===================== */}
      {tab === 'bills' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {BILL_PROVIDERS.map(bp => (
              <button key={bp.id} onClick={() => setBillProvider(bp.name)}
                className={`bg-brand-card border rounded-xl p-4 flex flex-col items-center space-y-2 transition-all cursor-pointer ${
                  billProvider === bp.name ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border hover:border-brand-orange/40'
                }`}>
                <span className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: bp.color }}>{bp.name[0]}</span>
                <span className="text-[11px] font-bold text-white text-center">{bp.name}</span>
                <span className="text-[9px] text-gray-400 uppercase">{bp.category}</span>
              </button>
            ))}
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Receipt className="w-4 h-4 text-amber-400" /> Pay Bill — {billProvider}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Pay From Wallet</label>
                <select value={billMethod} onChange={(e) => setBillMethod(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                  {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Account / Consumer ID</label>
                <input type="text" value={billAccount} onChange={(e) => setBillAccount(e.target.value)} placeholder="e.g. Consumer #235689" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Bill Amount (৳)</label>
                <input type="number" min="0" value={billAmount} onChange={(e) => setBillAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
            </div>
            <button
              onClick={() => {
                if (billAmount <= 0 || !billAccount) return;
                const fee = billAmount * 0.005;
                recordTransaction({ type: 'Bill Pay', method: billMethod, amount: billAmount, fee, counterparty: billProvider, note: `Bill payment · ${billAccount}` });
                updateWalletBalance(billMethod, -(billAmount + fee));
                setBillAmount(0); setBillAccount('');
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Pay Bill
            </button>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Bill Payment History</h3></div>
            <div className="divide-y divide-brand-border/30">
              {transactions.filter(t => t.type === 'Bill Pay').map(t => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: METHOD_COLORS[t.method] }}>{t.method[0]}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{t.counterparty} · {t.note}</p>
                      <p className="text-[10px] text-gray-500">{t.id} · {t.date}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black font-mono text-white">{formatBDT(t.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== FLOAT ===================== */}
      {tab === 'float' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Business Float</p>
              <p className="text-xl font-black text-white mt-1">{formatBDT(totalFloat)}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Low Float Wallets</p>
              <p className="text-xl font-black text-amber-400 mt-1">{wallets.filter(w => w.status === 'Low Float').length}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Float Additions</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{floatRecords.filter(f => f.action === 'Add').reduce((s, f) => s + f.amount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Float Withdrawals</p>
              <p className="text-xl font-black text-red-400 mt-1">{floatRecords.filter(f => f.action === 'Withdraw').reduce((s, f) => s + f.amount, 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Wallet Float Utilization</h3>
              <button onClick={() => { const avg = totalFloat / Math.max(1,wallets.length); wallets.forEach(w => { const diff = avg - w.balance; if(Math.abs(diff) > 100){ updateWalletBalance(w.method,diff); } }); }} className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded text-[10px] font-bold cursor-pointer">Auto-Rebalance All to ৳{Math.round(totalFloat/Math.max(1,wallets.length)).toLocaleString()}</button>
            </div>
            <div className="space-y-2.5">
              {wallets.map(w => { const utilPct = Math.min(100, Math.round((w.balance / 50000) * 100)); return (
                <div key={w.method} className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-300 w-16">{w.method}</span>
                  <div className="flex-1 mx-3 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${utilPct}%`,backgroundColor:utilPct>80?'#10b981':utilPct>30?'#f59e0b':'#ef4444'}}></div></div>
                  <span className="text-[10px] text-gray-400 w-12 text-right">{utilPct}%</span>
                  <span className="text-[10px] font-mono text-white w-28 text-right">{formatBDT(w.balance)} / 50K</span>
                </div>
              );})}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><PiggyBank className="w-4 h-4 text-emerald-400" /> Add / Withdraw Float</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Wallet</label>
                    <select value={floatMethod} onChange={(e) => setFloatMethod(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                      {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Action</label>
                    <select value={floatAction} onChange={(e) => setFloatAction(e.target.value as any)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                      <option value="Add">Add Float</option>
                      <option value="Withdraw">Withdraw Float</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Amount (৳)</label>
                  <input type="number" min="0" value={floatAmount} onChange={(e) => setFloatAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                </div>
                <button
                  onClick={() => {
                    if (floatAmount <= 0) return;
                    const net = floatAction === 'Add' ? floatAmount : -floatAmount;
                    setFloatRecords(prev => [
                      { id: `FLT-${Math.floor(100 + Math.random() * 900)}`, method: floatMethod, amount: floatAmount, action: floatAction, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), status: 'Processing' },
                      ...prev
                    ]);
                    updateWalletBalance(floatMethod, net);
                    setFloatAmount(0);
                  }}
                  className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {floatAction === 'Add' ? 'Add Float' : 'Withdraw Float'}
                </button>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Float Transaction History</h3></div>
              <div className="divide-y divide-brand-border/30 max-h-[360px] overflow-y-auto">
                {floatRecords.map(f => (
                  <div key={f.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-[11px] ${f.action === 'Add' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{f.action === 'Add' ? '+' : '−'}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{f.id} · {f.method} · {f.action}</p>
                        <p className="text-[10px] text-gray-500">{f.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black font-mono ${f.action === 'Add' ? 'text-emerald-400' : 'text-red-400'}`}>{f.action === 'Add' ? '+' : '−'}{formatBDT(f.amount)}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        f.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>{f.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SETTLEMENT ===================== */}
      {tab === 'settlement' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Gross Collection</p>
              <p className="text-xl font-black text-white mt-1">{formatBDT(totalGross)}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Commission</p>
              <p className="text-xl font-black text-amber-400 mt-1">{formatBDT(totalCommission)}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Net Settlement</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{formatBDT(totalNet)}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Transactions</p>
              <p className="text-xl font-black text-brand-orange mt-1">{totalCount}</p>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-brand-border/60">
              <div>
                <h3 className="text-sm font-bold text-white">Settlement Calculation</h3>
                <p className="text-[11px] text-gray-400">Commission % editable — recalculation happens live</p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => { settlementRows.forEach(r => { if(r.net>0){ recordTransaction({type:'Settlement',method:r.method,amount:r.net,fee:0,counterparty:'Batch Settlement',note:`Auto batch settlement · ${r.method}`}); updateWalletBalance(r.method,r.net); } }); }} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer transition-all">Batch Settle All ({formatBDT(totalNet)})</button>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Sort:</span>
                {(['gross', 'count', 'commission', 'net'] as const).map((s) => (
                  <button key={s} onClick={() => setSortBy(s)} className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition-all cursor-pointer ${sortBy === s ? 'bg-brand-orange/15 border-brand-orange text-brand-orange' : 'bg-brand-dark/50 border-brand-border text-gray-400 hover:text-gray-200'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead>
                  <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40">
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Method</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Transactions</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Gross</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Commission %</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Commission (৳)</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {settlementRows.map(row => (
                    <tr key={row.method} className="hover:bg-brand-dark/20">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          {renderWalletIcon(row.method)}
                          <span className="font-bold text-white">{row.method}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-200">{row.count}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(row.gross)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <input type="number" min="0" step="0.01" value={row.rate}
                            onChange={(e) => setCommissionOverrides(prev => ({ ...prev, [row.method]: Number(e.target.value) }))}
                            className="w-16 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange" />
                          <span className="text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">{formatBDT(row.commission)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatBDT(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-dark/40 border-t border-brand-border">
                    <td className="py-3 px-4 font-black text-white">Total</td>
                    <td className="py-3 px-4 font-black text-white">{totalCount}</td>
                    <td className="py-3 px-4 font-mono font-black text-white">{formatBDT(totalGross)}</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 font-mono font-black text-amber-400">{formatBDT(totalCommission)}</td>
                    <td className="py-3 px-4 font-mono font-black text-emerald-400">{formatBDT(totalNet)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== AGENTS ===================== */}
      {tab === 'agents' && (
        <div className="space-y-6 fade-in">
          <div className="flex items-center justify-between bg-brand-card border border-brand-border rounded-xl p-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" /> MFS Agent Network</h3>
              <p className="text-[11px] text-gray-400">{agents.filter(a => a.status === 'Active').length} active agents · {agents.length} total registered</p>
            </div>
            <button onClick={() => setShowAddAgent(prev => !prev)} className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5" /> {showAddAgent ? 'Close' : 'Register Agent'}
            </button>
          </div>

          {showAddAgent && (
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4 fade-in">
              <h3 className="text-sm font-bold text-white">Register New Agent</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Agent Name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <input type="text" value={agentArea} onChange={(e) => setAgentArea(e.target.value)} placeholder="Area" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <select value={agentMethod} onChange={(e) => setAgentMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                  {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                </select>
                <input type="number" min="0" value={agentWallet} onChange={(e) => setAgentWallet(Number(e.target.value))} placeholder="Wallet float (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <button
                  onClick={() => {
                    if (!agentName.trim()) return;
                    setAgents(prev => [
                      { id: `AG-${Math.floor(100 + Math.random() * 900)}`, name: agentName, area: agentArea.trim() || 'Unassigned', method: agentMethod, balance: agentWallet, todayTransactions: 0, commission: 0, status: 'Pending' },
                      ...prev
                    ]);
                    setAgentName(''); setAgentArea(''); setAgentWallet(0); setShowAddAgent(false);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Register
                </button>
              </div>
            </div>
          )}

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[820px]">
                <thead>
                  <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40">
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Agent ID</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Name</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Area</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Wallet</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Balance</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Today's TX</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Commission</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Prod/Score</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Tier</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Status</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {agents.map(a => (
                    <tr key={a.id} className="hover:bg-brand-dark/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-300">{a.id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-8 h-8 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center font-black text-brand-orange text-[10px]">{a.name.split(' ').map(n => n[0]).join('')}</span>
                          <span className="font-bold text-white">{a.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300 flex items-center space-x-1"><MapPin className="w-3 h-3 text-gray-500" />{a.area}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${METHOD_COLORS[a.method]}1a`, color: METHOD_COLORS[a.method], borderColor: `${METHOD_COLORS[a.method]}40` }}>{a.method}</span></td>
                      <td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(a.balance)}</td>
                      <td className="py-3 px-4 font-bold text-gray-200">{a.todayTransactions}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatBDT(a.commission)}</td>
                      <td className="py-3 px-4"><span className="text-[10px] font-mono font-bold text-blue-400">৳{getAgentProductivity(a).toFixed(1)}/tx</span></td>
                      <td className="py-3 px-4">{( () => { const t = getAgentTier(a.commission, agents.map(x=>x.commission)); return <span className="px-2 py-0.5 rounded-full text-[9px] font-black border" style={{color:t.color,borderColor:`${t.color}40`,backgroundColor:`${t.color}20`}}>{t.tier}</span>; })()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          a.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          a.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>{a.status}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setAgents(prev => prev.map(x => x.id === a.id ? { ...x, status: x.status === 'Active' ? 'Suspended' : 'Active' } : x))}
                          className={`px-2 py-1 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${
                            a.status === 'Active' ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                          }`}
                        >
                          {a.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== REPORTS ===================== */}
      {tab === 'reports' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-brand-border/60 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-brand-orange" /> Method Share Report</h3>
                <p className="text-[11px] text-gray-400">Share of gross collection by method ({timeframe})</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(d: any) => d.name}>
                      {pieData.map((entry) => <Cell key={entry.name} fill={METHOD_COLORS[entry.name] || '#64748b'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} formatter={(v: any) => formatBDT(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-white mb-3">Business Summary ({timeframe})</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Total Gross Collection', value: totalGross, color: 'text-white' },
                    { label: 'Total Commission Earned', value: totalCommission, color: 'text-amber-400' },
                    { label: 'Net Settlement (Payable)', value: totalNet, color: 'text-emerald-400' },
                    { label: 'Business Float Balance', value: totalFloat, color: 'text-white' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                      <span className="text-[11px] text-gray-300">{item.label}</span>
                      <span className={`text-sm font-black font-mono ${item.color}`}>{formatBDT(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-white mb-3">Quick Export</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleExportCSV} className="flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold cursor-pointer transition-all">
                    <Download className="w-3.5 h-3.5" /> Settlement CSV
                  </button>
                  <button onClick={() => window.print()} className="flex items-center justify-center space-x-1.5 py-2.5 bg-brand-dark hover:bg-white/10 text-gray-300 border border-brand-border rounded-lg text-xs font-bold cursor-pointer transition-all">
                    <BarChart3 className="w-3.5 h-3.5" /> Print Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CUSTOMERS ===================== */}
      {tab === 'customers' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><UserRound className="w-4 h-4 text-emerald-400" /> Register New MFS Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full Name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone (01XXXXXXXXX)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={customerMethod} onChange={(e) => setCustomerMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
              </select>
              <select value={customerKyc} onChange={(e) => setCustomerKyc(e.target.value as any)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                <option value="Verified">KYC Verified</option>
                <option value="Pending">KYC Pending</option>
                <option value="Rejected">KYC Rejected</option>
              </select>
              <button
                onClick={() => {
                  if (!customerName.trim() || !customerPhone.trim()) return;
                  setCustomers(prev => [
                    { id: `CUS-${Math.floor(100 + Math.random() * 900)}`, name: customerName, phone: customerPhone, method: customerMethod, balance: 0, kycStatus: customerKyc, joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), transactions: 0, status: 'Active' },
                    ...prev
                  ]);
                  setCustomerName(''); setCustomerPhone('');
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Register
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-brand-dark/30 border border-brand-border/60 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} placeholder="Search customer by name, phone, ID..." className="bg-transparent text-xs text-white outline-none w-64" />
            </div>
            <button onClick={() => setCustomers(prev => prev.map(c => ({ ...c, kycStatus: 'Verified' })))} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-[10px] font-bold cursor-pointer transition-all">Bulk Verify All KYC</button>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[820px]">
                <thead>
                  <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40">
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Customer ID</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Name</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Segment</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Phone</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Wallet</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Balance</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">LTV</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Risk</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">KYC</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Joined</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Status</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {customers.map(c => {
                    const isExpanded = expandedCustomer === c.id;
                    const cxTxs = transactions.filter(t => t.counterparty.includes(c.name) || t.counterparty.includes(c.id));
                    return (
                      <React.Fragment key={c.id}>
                        <tr className="hover:bg-brand-dark/20 transition-colors cursor-pointer" onClick={() => setExpandedCustomer(isExpanded ? null : c.id)}>
                          <td className="py-3 px-4 font-mono font-bold text-gray-300">{c.id}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2.5">
                              <span className="w-8 h-8 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center font-black text-brand-orange text-[10px]">{c.name.split(' ').map(n => n[0]).join('')}</span>
                          <span className="font-bold text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{( () => { const seg = getCustomerSegment(c, getCustomerLTV(c)); return <span className="px-2 py-0.5 rounded-full text-[9px] font-black border" style={{color:seg.color,borderColor:`${seg.color}40`,backgroundColor:`${seg.color}20`}}>{seg.label}</span>; })()}</td>
                      <td className="py-3 px-4 font-mono text-gray-300">{c.phone}</td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${METHOD_COLORS[c.method]}1a`, color: METHOD_COLORS[c.method], borderColor: `${METHOD_COLORS[c.method]}40` }}>{c.method}</span></td>
                      <td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(c.balance)}</td>
                      <td className="py-3 px-4 font-mono text-brand-orange font-bold">{formatBDT(getCustomerLTV(c))}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-[9px] font-black" style={{backgroundColor:`${riskColor(getCustomerRiskScore(c))}20`,color:riskColor(getCustomerRiskScore(c)),border:`1px solid ${riskColor(getCustomerRiskScore(c))}40`}}>{riskLabel(getCustomerRiskScore(c))} ({getCustomerRiskScore(c)})</span></td>
                      <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                              c.kycStatus === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              c.kycStatus === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}>{c.kycStatus}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-400">{c.joinDate}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>{c.status}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setCustomers(prev => prev.filter(x => x.id !== c.id))} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded cursor-pointer transition-all" title="Delete"><X className="w-3 h-3" /></button>
                              <span className="text-gray-500 ml-1">{isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-brand-orange" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 rotate-[-90deg]" />}</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <div className="bg-brand-dark/30 border-t border-brand-border/40 p-4 fade-in">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Transaction History — {c.name}</p>
                                {cxTxs.length > 0 ? (
                                  <table className="w-full text-left text-[10px] min-w-[480px]">
                                    <thead><tr className="text-gray-400 border-b border-brand-border/40"><th className="py-1.5 px-2">ID</th><th className="py-1.5 px-2">Type</th><th className="py-1.5 px-2">Amount</th><th className="py-1.5 px-2">Fee</th><th className="py-1.5 px-2">Status</th><th className="py-1.5 px-2">Date</th></tr></thead>
                                    <tbody className="divide-y divide-brand-border/20">
                                      {cxTxs.slice(0,10).map(t => (
                                        <tr key={t.id} className="text-gray-300">
                                          <td className="py-1.5 px-2 font-mono">{t.id}</td>
                                          <td className="py-1.5 px-2">{txTypeBadge(t.type)}</td>
                                          <td className="py-1.5 px-2 font-mono text-white">{formatBDT(t.amount)}</td>
                                          <td className="py-1.5 px-2 font-mono">{t.fee>0?formatBDT(t.fee):'—'}</td>
                                          <td className="py-1.5 px-2"><span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${t.status==='Completed'?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-400'}`}>{t.status}</span></td>
                                          <td className="py-1.5 px-2">{t.date}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : <p className="text-xs text-gray-500 py-2">No transactions found for this customer.</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== QR PAYMENTS ===================== */}
      {tab === 'qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ScanLine className="w-4 h-4 text-cyan-400" /> Generate & Record QR Payment</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Wallet</label>
                  <select value={qrMethod} onChange={(e) => setQrMethod(e.target.value)} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                    {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Merchant</label>
                  <input type="text" value={qrMerchant} onChange={(e) => setQrMerchant(e.target.value)} placeholder="Enter store name" className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Payment Amount (৳)</label>
                <input type="number" min="0" value={qrAmount} onChange={(e) => setQrAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              </div>
              <div className="flex items-center justify-center py-4">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG value={`MFS|${qrMethod}|${qrMerchant || 'Merchant'}|${qrAmount}`} size={160} />
                  <p className="text-[9px] text-gray-700 font-mono mt-2 text-center">{qrMethod} · {formatBDT(qrAmount)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (qrAmount <= 0) return;
                  recordTransaction({ type: 'Merchant QR', method: qrMethod, amount: qrAmount, fee: qrAmount * (getRate(qrMethod) / 100), counterparty: qrMerchant || 'QR Merchant', note: 'QR scan payment' });
                  updateWalletBalance(qrMethod, qrAmount);
                  setQrAmount(0); setQrMerchant('');
                }}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Record QR Payment
              </button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> How QR Payments Work</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Customer scans the merchant QR code shown here.' },
                { step: '2', text: 'Money is debited from the customer wallet and credited to your business wallet.' },
                { step: '3', text: `A ${getRate(qrMethod) || 'gateway'}% gateway commission is applied and tracked.` },
                { step: '4', text: 'The transaction appears instantly in the Transactions ledger.' }
              ].map(item => (
                <div key={item.step} className="flex items-start space-x-3 bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-[10px] font-black shrink-0">{item.step}</span>
                  <p className="text-[11px] text-gray-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== LOANS ===================== */}
      {tab === 'loans' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><HandCoins className="w-4 h-4 text-emerald-400" /> Disburse Micro-Loan</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={loanCustomer} onChange={(e) => setLoanCustomer(e.target.value)} placeholder="Customer Name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={loanPhone} onChange={(e) => setLoanPhone(e.target.value)} placeholder="Phone" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={loanMethod} onChange={(e) => setLoanMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
              </select>
              <input type="number" min="0" value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} placeholder="Principal (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="1" value={loanTerm} onChange={(e) => setLoanTerm(Number(e.target.value))} placeholder="Term (months)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" step="0.1" value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))} placeholder="Interest %/yr" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button
                onClick={() => {
                  if (!loanCustomer.trim() || loanAmount <= 0) return;
                  setLoans(prev => [
                    { id: `LN-${Math.floor(2000 + Math.random() * 900)}`, customer: loanCustomer, phone: loanPhone || '—', method: loanMethod, principal: loanAmount, interestRate: loanRate, termMonths: loanTerm, repaid: 0, status: 'Active', issuedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                    ...prev
                  ]);
                  updateWalletBalance(loanMethod, -loanAmount);
                  setLoanCustomer(''); setLoanPhone(''); setLoanAmount(0);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Disburse Loan
              </button>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[860px]">
                <thead>
                  <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40">
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Loan ID</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Customer</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Wallet</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Credit</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Principal</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">EMI/mo</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Interest</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Term</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Repaid</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Balance</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Status</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] text-center">Repay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {loans.map(l => {
                    const totalPayable = l.principal + (l.principal * l.interestRate / 100) * (l.termMonths / 12);
                    const remaining = Math.max(0, totalPayable - l.repaid);
                    const monthlyRate = l.interestRate / 12 / 100;
                    const months = l.termMonths;
                    const emi = monthlyRate > 0 && months > 0 ? Math.round(l.principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)) : Math.round(totalPayable / months);
                    return (
                      <tr key={l.id} className="hover:bg-brand-dark/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-gray-300">{l.id}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-white">{l.customer}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{l.phone}</p>
                        </td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${METHOD_COLORS[l.method]}1a`, color: METHOD_COLORS[l.method], borderColor: `${METHOD_COLORS[l.method]}40` }}>{l.method}</span></td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-[9px] font-black border" style={{backgroundColor:`${creditColor(getLoanCreditScore(l))}20`,color:creditColor(getLoanCreditScore(l)),border:`1px solid ${creditColor(getLoanCreditScore(l))}40`}}>{creditLabel(getLoanCreditScore(l))}</span></td>
                      <td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(l.principal)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400">{formatBDT(emi)}</td>
                        <td className="py-3 px-4 font-mono text-gray-300">{l.interestRate}%</td>
                        <td className="py-3 px-4 text-gray-300">{l.termMonths} mo</td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{formatBDT(l.repaid)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">{formatBDT(remaining)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            l.status === 'Active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            l.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>{l.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {l.status === 'Active' && (
                            <button onClick={() => {
                              setLoans(prev => prev.map(x => {
                                if (x.id !== l.id) return x;
                                const newRepaid = x.repaid + emi;
                                const isComplete = newRepaid >= totalPayable;
                                return { ...x, repaid: newRepaid, status: isComplete ? 'Completed' : x.status };
                              }));
                              recordTransaction({ type:'Settlement', method: l.method, amount: emi, fee: 0, counterparty: l.customer, note: `Loan EMI repayment · ${l.id}` });
                              updateWalletBalance(l.method, emi);
                            }}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-[9.5px] font-bold cursor-pointer transition-all whitespace-nowrap"
                            >
                              Pay EMI {formatBDT(emi)}
                            </button>
                          )}
                          {l.status === 'Completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
                          {l.status === 'Overdue' && <span className="text-[10px] text-red-400 font-bold">Overdue</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SAVINGS ===================== */}
      {tab === 'savings' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Deposits</p>
              <p className="text-xl font-black text-white mt-1">{formatBDT(savingsAccounts.reduce((s, a) => s + a.balance, 0))}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Active Accounts</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{savingsAccounts.filter(a => a.status === 'Active').length}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Matured Accounts</p>
              <p className="text-xl font-black text-amber-400 mt-1">{savingsAccounts.filter(a => a.status === 'Matured').length}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Avg Interest</p>
              <p className="text-xl font-black text-brand-orange mt-1">{savingsAccounts.length ? (savingsAccounts.reduce((s, a) => s + a.interestRate, 0) / savingsAccounts.length).toFixed(1) : '0'}%</p>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><PiggyBank className="w-4 h-4 text-emerald-400" /> Open Savings / Deposit Account</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={savCustomer} onChange={(e) => setSavCustomer(e.target.value)} placeholder="Customer Name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={savPhone} onChange={(e) => setSavPhone(e.target.value)} placeholder="Phone" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={savMethod} onChange={(e) => setSavMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
              </select>
              <input type="number" min="0" value={savAmount} onChange={(e) => setSavAmount(Number(e.target.value))} placeholder="Deposit (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={savTenure} onChange={(e) => setSavTenure(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                <option value="6 months">6 months (6.5%)</option>
                <option value="12 months">12 months (6%)</option>
                <option value="24 months">24 months (7%)</option>
              </select>
              <button
                onClick={() => {
                  if (!savCustomer.trim() || savAmount <= 0) return;
                  const rate = savTenure === '6 months' ? 6.5 : savTenure === '12 months' ? 6 : 7;
                  setSavingsAccounts(prev => [
                    { id: `SAV-${Math.floor(3000 + Math.random() * 900)}`, customer: savCustomer, phone: savPhone || '—', method: savMethod, balance: savAmount, interestRate: rate, tenure: savTenure, maturityDate: '—', status: 'Active' },
                    ...prev
                  ]);
                  updateWalletBalance(savMethod, savAmount);
                  setSavCustomer(''); setSavPhone(''); setSavAmount(0);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Open Account
              </button>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[820px]">
                <thead>
                  <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40">
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Account</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Customer</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Wallet</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Balance</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Interest</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Tenure</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px]">Status</th>
                    <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] text-center">Funds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {savingsAccounts.map(a => {
                    const isAdding = savAddId === a.id;
                    return (
                    <tr key={a.id} className="hover:bg-brand-dark/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-300">{a.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-white">{a.customer}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{a.phone}</p>
                      </td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${METHOD_COLORS[a.method]}1a`, color: METHOD_COLORS[a.method], borderColor: `${METHOD_COLORS[a.method]}40` }}>{a.method}</span></td>
                      <td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(a.balance)}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400">{a.interestRate}%</td>
                      <td className="py-3 px-4 text-gray-300">{a.tenure}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          a.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          a.status === 'Matured' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>{a.status}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isAdding ? (
                          <div className="flex items-center space-x-1.5">
                            <input type="number" min="0" value={savAddAmt} onChange={(e) => setSavAddAmt(Number(e.target.value))} className="w-20 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange" autoFocus />
                            <button onClick={() => { if(savAddAmt>0){ setSavingsAccounts(prev=>prev.map(x=>x.id===a.id?{...x,balance:x.balance+savAddAmt}:x)); recordTransaction({type:'Cash-In',method:a.method,amount:savAddAmt,fee:0,counterparty:a.customer,note:`Savings deposit · ${a.id}`}); updateWalletBalance(a.method,savAddAmt); } setSavAddId(null); setSavAddAmt(0); }} className="px-2 py-1 bg-emerald-500 text-white rounded text-[9px] font-bold cursor-pointer">Add</button>
                            <button onClick={() => { setSavAddId(null); setSavAddAmt(0); }} className="text-[9px] text-gray-400 hover:text-white">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setSavAddId(a.id); setSavAddAmt(5000); }} className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-[9.5px] font-bold cursor-pointer transition-all whitespace-nowrap">+ Add Funds</button>
                        )}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CARDS ===================== */}
      {tab === 'cards' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => (
              <div key={card.id} className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-brand-border rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center justify-between relative z-10">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase border" style={{ backgroundColor: `${METHOD_COLORS[card.method]}22`, color: METHOD_COLORS[card.method], borderColor: `${METHOD_COLORS[card.method]}40` }}>{card.method} · Virtual Card</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                    card.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    card.status === 'Frozen' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>{card.status}</span>
                </div>
                <p className="font-mono font-black text-white text-lg tracking-wider mt-6 relative z-10">{card.cardNumber}</p>
                <div className="flex items-center justify-between mt-4 relative z-10">
                  <div><p className="text-[9px] text-gray-400 uppercase">Card Holder</p><p className="text-xs font-bold text-white">{card.name}</p></div>
                  <div className="text-right"><p className="text-[9px] text-gray-400 uppercase">Expiry</p><p className="text-xs font-bold text-gray-200">{card.expiry}</p></div>
                </div>
                <div className="mt-4 relative z-10">
                  <div className="flex items-center justify-between text-[10px] mb-1"><span className="text-gray-400">Limit: {formatBDT(card.limit)}</span><span className="text-gray-400">Spent: {formatBDT(card.spent)}</span></div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full bg-brand-orange" style={{width:`${Math.min(100,(card.spent/card.limit)*100)}%`}}></div></div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 relative z-10">
                  <button onClick={()=>setCards(prev=>prev.map(c=>c.id===card.id?{...c,status:c.status==='Active'?'Frozen':'Active'}:c))} className={`px-2 py-1 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${card.status==='Active'?'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500 hover:text-white':'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'}`}>{card.status==='Active'?'Freeze':'Unfreeze'}</button>
                  <button onClick={()=>setShowCardDetail(card)} className="px-2 py-1 rounded text-[9.5px] font-bold border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all cursor-pointer">View Card</button>
                  <input type="number" min="0" defaultValue={card.limit} onBlur={(e)=>setCards(prev=>prev.map(c=>c.id===card.id?{...c,limit:Number(e.target.value)}:c))} className="w-16 px-2 py-0.5 bg-white/10 text-[10px] text-white rounded outline-none focus:bg-white/20 text-right" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Cards</p>
              <p className="text-xl font-black text-white mt-1">{cards.length}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Active Cards</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{cards.filter(c=>c.status==='Active').length}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Limit</p>
              <p className="text-xl font-black text-blue-400 mt-1">{formatBDT(cards.reduce((s,c)=>s+c.limit,0))}</p>
            </div>
            <div className="bg-brand-card border border-brand-border p-4 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Spent</p>
              <p className="text-xl font-black text-amber-400 mt-1">{formatBDT(cards.reduce((s,c)=>s+c.spent,0))}</p>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-400" /> Add New Card</h3>
            {cardStep === 1 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <select value={cardMethod} onChange={(e) => setCardMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                    <option value="Visa Credit">Visa Credit</option><option value="Visa Debit">Visa Debit</option>
                    <option value="Mastercard Credit">Mastercard Credit</option><option value="Mastercard Debit">Mastercard Debit</option>
                    <option value="Amex Card">Amex</option><option value="Prepaid Card">Prepaid Card</option>
                    <option value="Multi-Currency">Multi-Currency</option>
                  </select>
                  <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Card Holder Name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                  <input type="text" value={cardNumber} onChange={(e) => {const v=e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();setCardNumber(v);}} placeholder="0000 0000 0000 0000" maxLength={19} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange font-mono" />
                  <input type="text" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                  <input type="password" value={cardCvv} onChange={(e) => setCardCvv(e.target.value.slice(0,4))} placeholder="CVV" maxLength={4} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                  <input type="number" min="0" value={cardLimit} onChange={(e) => setCardLimit(Number(e.target.value))} placeholder="Card Limit (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                </div>
                <button onClick={()=>{if(!cardName||cardNumber.replace(/\s/g,'').length<13||!cardCvv){return;}setCardStep(2);setOtpValue('');}} className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">Continue to OTP Verification</button>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-brand-dark/40 border border-brand-border/60 rounded-xl text-center">
                <p className="text-xs font-bold text-white">🔐 OTP Verification</p>
                <p className="text-[10px] text-gray-400">A 6-digit OTP has been sent to your registered number</p>
                <div className="flex items-center justify-center space-x-2">
                  <input type="text" value={otpValue} onChange={(e)=>setOtpValue(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="OTP Code" maxLength={6} className="w-32 px-3 py-2 bg-brand-dark text-lg text-white text-center font-mono font-bold border border-brand-border rounded-lg outline-none focus:border-brand-orange tracking-[0.5em]" autoFocus />
                </div>
                {otpValue.length === 6 && otpValue === '123456' ? (
                  <button onClick={()=>{
                    if(!cardName)return;
                    setCards(prev=>[{id:`CARD-${Math.floor(1000+Math.random()*9000)}`,name:cardName,method:cardMethod,cardNumber:cardNumber||`5${Array.from({length:15},()=>Math.floor(Math.random()*10)).join('').replace(/(.{4})/g,'$1 ')}`,expiry:cardExpiry||'12/28',limit:cardLimit,spent:0,status:'Active'},...prev]);
                    setCardName('');setCardNumber('');setCardCvv('');setCardLimit(20000);setCardStep(1);setOtpValue('');
                  }} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">✓ Verify & Add Card</button>
                ) : (otpValue.length === 6 ? (<p className="text-[10px] text-red-400">Invalid OTP. Use: 123456</p>) : null)}
                <button onClick={()=>setCardStep(1)} className="text-[10px] text-gray-400 hover:text-white cursor-pointer mt-1">← Back to card details</button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ===================== NOTIFICATIONS ===================== */}
      {tab === 'notifications' && (
        <div className="space-y-4 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" /> Alert Center</h3>
              <p className="text-[11px] text-gray-400">{notifications.filter(n => !n.read).length} unread notifications</p>
            </div>
            <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))} className="px-3 py-1.5 bg-brand-dark hover:bg-white/10 text-gray-300 border border-brand-border rounded-lg text-xs font-bold cursor-pointer">
              Mark All Read
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-gray-400 uppercase font-bold">Filter:</span>
            {['All','Payment','Alert','Settlement','Agent','System'].map(f => (
              <button key={f} onClick={() => setNotificationFilter(f)} className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition-all cursor-pointer ${notificationFilter===f?'bg-brand-orange/15 border-brand-orange text-brand-orange':'bg-brand-dark/50 border-brand-border text-gray-400 hover:text-gray-200'}`}>{f}</button>
            ))}
          </div>
          <div className="space-y-2.5">
            {notifications.filter(n=>notificationFilter==='All'||n.type===notificationFilter).map(n => (
              <button key={n.id} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                className={`w-full text-left flex items-start justify-between gap-4 border rounded-xl p-4 transition-all cursor-pointer ${n.read ? 'bg-brand-card border-brand-border/50 opacity-70' : 'bg-brand-card border-brand-orange/40'}`}>
                <div className="flex items-start space-x-3">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    n.type === 'Payment' ? 'bg-emerald-500/10 text-emerald-400' : n.type === 'Alert' ? 'bg-red-500/10 text-red-400' :
                    n.type === 'Settlement' ? 'bg-teal-500/10 text-teal-400' : n.type === 'Agent' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-300'
                  }`}>
                    {n.type === 'Payment' ? <CheckCircle2 className="w-4 h-4" /> : n.type === 'Alert' ? <ShieldCheck className="w-4 h-4" /> : n.type === 'Settlement' ? <Banknote className="w-4 h-4" /> : n.type === 'Agent' ? <Users className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-white">{n.title}</p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>}
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase bg-brand-dark text-gray-400 border border-brand-border">{n.type}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{n.message}</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 shrink-0">{n.time}</span>
                <button onClick={(e) => { e.stopPropagation(); setNotifications(prev => prev.filter(x => x.id !== n.id)); }} className="p-1 text-gray-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"><X className="w-3 h-3" /></button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================== RECONCILE ===================== */}
      {tab === 'reconcile' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-400" /> Reconciliation Tool</h3>
            <p className="text-[11px] text-gray-400">Match recorded MFS transactions against expected collection from orders. Any difference is flagged as a discrepancy.</p>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input type="text" value={reconSearch} onChange={(e) => setReconSearch(e.target.value)} placeholder="Search by method / order..." className="pl-8 pr-2 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange w-64" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Expected (from Orders)</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[400px]">
                  <thead>
                    <tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40">
                      <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[10px]">Method</th>
                      <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[10px]">Expected</th>
                      <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[10px]">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30">
                    {settlementRows.filter(r => r.method.toLowerCase().includes(reconSearch.toLowerCase())).map(r => (
                      <tr key={r.method} className="hover:bg-brand-dark/20">
                        <td className="py-2.5 px-4 font-bold text-white">{r.method}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-white">{formatBDT(r.gross)}</td>
                        <td className="py-2.5 px-4 text-gray-300">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Recorded vs Expected Difference</h3></div>
              <div className="divide-y divide-brand-border/30">
                {settlementRows.map(r => {
                  const recorded = transactions.filter(t => t.method === r.method).reduce((s, t) => s + t.amount, 0);
                  const diff = recorded - r.gross;
                  const isResolved = reconciledMethods.includes(r.method) || Math.abs(diff) < 0.01;
                  return (
                    <div key={r.method} className="p-4 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{r.method}</span>
                      <div className="text-right space-y-0.5 flex items-center space-x-3">
                        <div>
                          <p className="text-[10px] text-gray-400">Expected: {formatBDT(r.gross)} · Recorded: {formatBDT(recorded)}</p>
                          <p className={`text-xs font-black font-mono ${isResolved ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isResolved ? '✓ Resolved' : `Δ ${formatBDT(Math.abs(diff))}`}
                          </p>
                        </div>
                        {!isResolved && (
                          <button
                            onClick={() => { setReconciledMethods(prev => [...prev, r.method]); recordTransaction({ type:'Settlement', method: r.method, amount: Math.abs(diff), fee: 0, counterparty: 'Reconciliation', note: `Adjustment for ${r.method} settlement` }); }}
                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-[9.5px] font-bold cursor-pointer whitespace-nowrap transition-all"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SETTINGS ===================== */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Settings2 className="w-4 h-4 text-gray-300" /> Transaction Limits & Fees</h3>
            <div className="space-y-3">
              {[
                { label: 'Daily Transaction Limit (৳)', value: settings.dailyTransactionLimit, key: 'dailyTransactionLimit' },
                { label: 'Single Transaction Limit (৳)', value: settings.singleTransactionLimit, key: 'singleTransactionLimit' },
                { label: 'Cash-Out Fee (%)', value: settings.cashOutFeePct, key: 'cashOutFeePct' },
                { label: 'Transfer Fee (%)', value: settings.transferFeePct, key: 'transferFeePct' },
                { label: 'Default Commission (%)', value: settings.defaultCommission, key: 'defaultCommission' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                  <span className="text-[11px] text-gray-300">{item.label}</span>
                  <input type="number" step="0.01" value={item.value}
                    onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                    className="w-28 px-2.5 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange text-right" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Security & Automation</h3>
              {([
                { label: 'Fraud Detection (AI rules)', key: 'fraudDetection' },
                { label: 'Auto-Settlement to Bank', key: 'autoSettlement' },
                { label: 'SMS / Push Alerts', key: 'smsAlerts' }
              ] as const).map(item => (
                <div key={item.key} className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                  <span className="text-[11px] text-gray-300">{item.label}</span>
                  <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className={`w-10 h-5 rounded-full transition-all cursor-pointer relative ${settings[item.key] ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings[item.key] ? 'left-5.5' : 'left-0.5'}`} style={settings[item.key] ? { left: '22px' } : { left: '2px' }}></span>
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                <span className="text-[11px] text-gray-300">Settlement Cycle</span>
                <select value={settings.settlementCycle} onChange={(e) => setSettings(prev => ({ ...prev, settlementCycle: e.target.value }))} className="px-2.5 py-1.5 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange cursor-pointer">
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-center justify-between bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                <span className="text-[11px] text-gray-300">Currency</span>
                <span className="text-xs font-bold text-white">{settings.currency}</span>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white mb-2">Current Configuration</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Daily Limit', value: formatBDT(settings.dailyTransactionLimit) },
                  { label: 'Single Limit', value: formatBDT(settings.singleTransactionLimit) },
                  { label: 'Cash-Out Fee', value: `${settings.cashOutFeePct}%` },
                  { label: 'Transfer Fee', value: `${settings.transferFeePct}%` },
                  { label: 'Default Commission', value: `${settings.defaultCommission}%` },
                  { label: 'Settlement', value: settings.settlementCycle }
                ].map(item => (
                  <div key={item.label} className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3">
                    <p className="text-[9px] text-gray-400 uppercase font-bold">{item.label}</p>
                    <p className="text-sm font-black text-white mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-brand-card border border-brand-orange/40 rounded-xl p-5 shadow-sm text-center space-y-2 mt-4">
              <p className="text-xs font-bold text-white">📧 Contact Support</p>
              <p className="text-sm font-black text-brand-orange">thenexagobd@gmail.com</p>
              <p className="text-[10px] text-gray-400">Admin & Support — 24/7 assistance for The NexaGo BD</p>
            </div>
          </div>
        </div>
      )}
      {/* ============= REMITTANCE ============= */}
      {tab === 'remittance' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> International Remittance (Receive)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={remSender} onChange={(e) => setRemSender(e.target.value)} placeholder="Sender name abroad" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={remReceiver} onChange={(e) => setRemReceiver(e.target.value)} placeholder="Receiver in BD" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={remFrom} onChange={(e) => { setRemFrom(e.target.value); const r = e.target.value==='Saudi Arabia'?29.5:e.target.value==='UAE'?30.2:23.5; setRemRate(r); }} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                <option>Saudi Arabia</option><option>UAE</option><option>Malaysia</option><option>Qatar</option><option>Kuwait</option><option>UK</option><option>USA</option>
              </select>
              <input type="number" min="0" value={remFgnAmt} onChange={(e) => setRemFgnAmt(Number(e.target.value))} placeholder="Foreign amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={remToMethod} onChange={(e) => setRemToMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
              </select>
              <div className="flex items-center space-x-1 bg-brand-dark/40 border border-brand-border/50 rounded-lg px-3 py-2 text-xs"><span className="text-gray-400">Rate: 1 {remCurr} =</span><input type="number" min="0" step="0.1" value={remRate} onChange={(e) => setRemRate(Number(e.target.value))} className="w-16 px-1 bg-transparent text-white outline-none text-right font-bold" /><span className="text-gray-400">৳</span></div>
              <span className="flex items-center text-xs font-black text-emerald-400">BDT: {formatBDT(remFgnAmt * remRate)}</span>
              <button onClick={() => { if(!remSender||remFgnAmt<=0) return; const bdt=remFgnAmt*remRate; setRemittances(p=>[{id:`RMT-${Math.floor(100+Math.random()*900)}`,sender:remSender,receiver:remReceiver||'N/A',fromCountry:remFrom,toMethod:remToMethod,amountForeign:remFgnAmt,currency:remCurr,rate:remRate,amountBDT:bdt,status:'Completed',date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})},...p]); updateWalletBalance(remToMethod,bdt); recordTransaction({type:'Cash-In',method:remToMethod,amount:bdt,fee:0,counterparty:remReceiver||remSender,note:`Remittance from ${remSender} (${remFrom})`}); setRemSender(''); setRemReceiver(''); setRemFgnAmt(0); }} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold cursor-pointer">Receive Remittance</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[860px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">ID</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Sender</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Receiver</th><th className="py-3 px-4 font-bold uppercase text-[10px]">From</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Foreign</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Rate</th><th className="py-3 px-4 font-bold uppercase text-[10px]">BDT</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{remittances.map(r=>(<tr key={r.id} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-mono font-bold text-gray-300">{r.id}</td><td className="py-3 px-4 font-bold text-white">{r.sender}</td><td className="py-3 px-4 text-gray-300">{r.receiver}</td><td className="py-3 px-4 text-gray-300">{r.fromCountry}</td><td className="py-3 px-4 font-mono text-white">{r.amountForeign.toLocaleString()} {r.currency}</td><td className="py-3 px-4 font-mono text-gray-300">{r.rate}</td><td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatBDT(r.amountBDT)}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${r.status==='Completed'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/30':r.status==='Processing'?'bg-amber-500/10 text-amber-400':'bg-blue-500/10 text-blue-400'}`}>{r.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ============= MERCHANTS ============= */}
      {tab === 'merchants' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Store className="w-4 h-4 text-brand-orange" /> Merchant Directory</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="text" value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="Merchant name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={merchantCat} onChange={(e) => setMerchantCat(e.target.value)} placeholder="Category" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={merchantCity} onChange={(e) => setMerchantCity(e.target.value)} placeholder="City" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={merchantMethod} onChange={(e) => setMerchantMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                {wallets.map(w => <option key={w.method} value={w.method}>{w.method}</option>)}
              </select>
              <button onClick={() => { if(!merchantName.trim())return; setMerchants(p=>[{id:`MRC-${Math.floor(100+Math.random()*900)}`,name:merchantName,category:merchantCat||'General',method:merchantMethod,city:merchantCity||'Dhaka',totalVol:0,commission:0,status:'Active'},...p]); setMerchantName('');setMerchantCat('');setMerchantCity(''); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Register</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[760px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Merchant</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Category</th><th className="py-3 px-4 font-bold uppercase text-[10px]">City</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Wallet</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Volume</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Commission</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{merchants.map(m=>(<tr key={m.id} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-bold text-white">{m.name}</td><td className="py-3 px-4 text-gray-300">{m.category}</td><td className="py-3 px-4 text-gray-300">{m.city}</td><td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{backgroundColor:`${METHOD_COLORS[m.method]}1a`,color:METHOD_COLORS[m.method],borderColor:`${METHOD_COLORS[m.method]}40`}}>{m.method}</span></td><td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(m.totalVol)}</td><td className="py-3 px-4 font-mono text-emerald-400">{formatBDT(m.commission)}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${m.status==='Active'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/30':'bg-red-500/10 text-red-400 border-red-500/30'}`}>{m.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ============= DISPUTES ============= */}
      {tab === 'disputes' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-red-400" /> File Transaction Dispute</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="text" value={dispTxnId} onChange={(e) => setDispTxnId(e.target.value)} placeholder="Transaction ID" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={dispMethod} onChange={(e) => setDispMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="number" min="0" value={dispAmt} onChange={(e) => setDispAmt(Number(e.target.value))} placeholder="Disputed amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={dispReason} onChange={(e) => setDispReason(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                <option>Select reason</option><option>Double charged</option><option>Amount incorrect</option><option>Not received</option><option>Wrong merchant</option><option>Fraud suspicion</option>
              </select>
              <button onClick={() => { if(!dispTxnId||!dispReason||dispReason==='Select reason')return; setDisputes(p=>[{id:`DSP-${Math.floor(100+Math.random()*900)}`,txId:dispTxnId,method:dispMethod,amount:dispAmt,reason:dispReason,filedBy:'Admin',status:'Open',date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})},...p]); setDispTxnId('');setDispReason('');setDispAmt(0); }} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer">File Dispute</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[720px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Dispute ID</th><th className="py-3 px-4 font-bold uppercase text-[10px]">TX ID</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Reason</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Date</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{disputes.map(d=>(<tr key={d.id} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-mono font-bold text-gray-300">{d.id}</td><td className="py-3 px-4 font-mono text-gray-300">{d.txId}</td><td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(d.amount)}</td><td className="py-3 px-4 text-gray-300">{d.reason}</td><td className="py-3 px-4 text-gray-400">{d.date}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${d.status==='Open'?'bg-red-500/10 text-red-400':d.status==='Investigating'?'bg-amber-500/10 text-amber-400':d.status==='Resolved'?'bg-emerald-500/10 text-emerald-400':'bg-gray-500/10 text-gray-400'}`}>{d.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ============= CASHBACK ============= */}
      {tab === 'cashback' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Cashback Campaign</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="text" value={cbTitle} onChange={(e) => setCbTitle(e.target.value)} placeholder="Campaign title" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={cbMethod} onChange={(e) => setCbMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="number" min="0" value={cbPct} onChange={(e) => setCbPct(Number(e.target.value))} placeholder="Cashback %" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={cbMax} onChange={(e) => setCbMax(Number(e.target.value))} placeholder="Max ৳" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!cbTitle.trim())return; setCashbackCampaigns(p=>[{id:`CBK-${Math.floor(100+Math.random()*900)}`,title:cbTitle,method:cbMethod,cashbackPct:cbPct,maxAmount:cbMax,startDate:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),endDate:'—',usageCount:0,status:'Active'},...p]); setCbTitle(''); }} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer">Launch</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{cashbackCampaigns.map(c=>(<div key={c.id} className={`bg-brand-card border rounded-xl p-5 shadow-sm space-y-3 ${c.status==='Active'?'border-amber-500/40 bg-amber-500/5':'border-brand-border'}`}><div className="flex items-center justify-between"><h4 className="font-bold text-white">{c.title}</h4><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${c.status==='Active'?'bg-amber-500/10 text-amber-400 border-amber-500/30':c.status==='Scheduled'?'bg-blue-500/10 text-blue-400':'bg-gray-500/10 text-gray-400'}`}>{c.status}</span></div><p className="text-[11px] text-gray-400">{c.method} · {c.cashbackPct}% cashback up to {formatBDT(c.maxAmount)}</p><div className="flex items-center justify-between text-[10px]"><span className="text-gray-500">{c.usageCount} uses</span><span className="text-gray-500">{c.startDate} - {c.endDate}</span></div></div>))}</div>
        </div>
      )}

      {/* ============= INSURANCE ============= */}
      {tab === 'insurance' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Micro-Insurance Policy</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={insName} onChange={(e) => setInsName(e.target.value)} placeholder="Customer name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={insPhone} onChange={(e) => setInsPhone(e.target.value)} placeholder="Phone" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={insType} onChange={(e) => setInsType(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                <option>Health</option><option>Accident</option><option>Life</option><option>Vehicle</option>
              </select>
              <select value={insProvider} onChange={(e) => setInsProvider(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                <option>Pragati Life</option><option>Green Delta</option><option>MetLife</option><option>Delta Life</option>
              </select>
              <input type="number" min="0" value={insPrem} onChange={(e) => setInsPrem(Number(e.target.value))} placeholder="Monthly premium" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={insCover} onChange={(e) => setInsCover(Number(e.target.value))} placeholder="Coverage amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!insName.trim())return; setPolicies(p=>[{id:`INS-${Math.floor(100+Math.random()*900)}`,customer:insName,phone:insPhone||'—',type:insType,provider:insProvider,premium:insPrem,coverAmount:insCover,expiry:'Dec 2025',status:'Active'},...p]); setInsName('');setInsPhone('');setInsPrem(0);setInsCover(0); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Issue Policy</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[760px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Policy</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Customer</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Type</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Provider</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Premium</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Coverage</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{policies.map(p=>(<tr key={p.id} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-mono font-bold text-gray-300">{p.id}</td><td className="py-3 px-4 font-bold text-white">{p.customer}</td><td className="py-3 px-4 text-gray-300">{p.type}</td><td className="py-3 px-4 text-gray-300">{p.provider}</td><td className="py-3 px-4 font-mono text-white">{formatBDT(p.premium)}</td><td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatBDT(p.coverAmount)}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${p.status==='Active'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/30':p.status==='Expired'?'bg-red-500/10 text-red-400':'bg-gray-500/10 text-gray-400'}`}>{p.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ============= EDUCATION ============= */}
      {tab === 'education' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{EDU_PROVIDERS.map(ep=>(<button key={ep.id} onClick={()=>setEduProvider(ep.name)} className={`bg-brand-card border rounded-xl p-4 flex flex-col items-center space-y-2 transition-all cursor-pointer ${eduProvider===ep.name?'border-brand-orange bg-brand-orange/5':'border-brand-border hover:border-brand-orange/40'}`}><span className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{backgroundColor:ep.color}}>{ep.name[0]}</span><span className="text-[11px] font-bold text-white text-center">{ep.name}</span><span className="text-[9px] text-gray-400 uppercase">{ep.category}</span></button>))}</div>
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><GraduationCap className="w-4 h-4 text-brand-orange" /> Pay Education Fees — {eduProvider}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={eduMethod} onChange={(e) => setEduMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="text" value={eduStudentId} onChange={(e) => setEduStudentId(e.target.value)} placeholder="Student ID / Roll" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={eduAmt} onChange={(e) => setEduAmt(Number(e.target.value))} placeholder="Amount (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(eduAmt<=0||!eduStudentId)return; recordTransaction({type:'Bill Pay',method:eduMethod,amount:eduAmt,fee:0,counterparty:eduProvider,note:`Education fee · ${eduStudentId}`}); updateWalletBalance(eduMethod,-eduAmt); setEduAmt(0);setEduStudentId(''); }} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer">Pay Fee</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= TICKETS ============= */}
      {tab === 'tickets' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{TICKET_PROVIDERS.map(tp=>(<button key={tp.id} onClick={()=>setTktProvider(tp.name)} className={`bg-brand-card border rounded-xl p-4 flex flex-col items-center space-y-2 transition-all cursor-pointer ${tktProvider===tp.name?'border-brand-orange bg-brand-orange/5':'border-brand-border hover:border-brand-orange/40'}`}><span className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{backgroundColor:tp.color}}>{tp.name[0]}</span><span className="text-[11px] font-bold text-white text-center">{tp.name}</span><span className="text-[9px] text-gray-400 uppercase">{tp.category}</span></button>))}</div>
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Ticket className="w-4 h-4 text-amber-400" /> Book {tktProvider}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={tktMethod} onChange={(e) => setTktMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="number" min="1" value={tktQty} onChange={(e) => setTktQty(Number(e.target.value))} placeholder="Qty" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={tktAmt} onChange={(e) => setTktAmt(Number(e.target.value))} placeholder="Price per ticket" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(tktAmt<=0)return; const total=tktQty*tktAmt; recordTransaction({type:'Bill Pay',method:tktMethod,amount:total,fee:0,counterparty:tktProvider,note:`${tktQty} ticket(s) booking`}); updateWalletBalance(tktMethod,-total); setTktAmt(0);setTktQty(1); }} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer">Book Now ({formatBDT(tktQty*tktAmt)})</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= SALARY ============= */}
      {tab === 'salary' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Salary Disbursement</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="text" value={salaryEmp} onChange={(e) => setSalaryEmp(e.target.value)} placeholder="Employee name/ID" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={salaryMethod} onChange={(e) => setSalaryMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="number" min="0" value={salaryAmt} onChange={(e) => setSalaryAmt(Number(e.target.value))} placeholder="Salary amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!salaryEmp||salaryAmt<=0)return; recordTransaction({type:'Cash-Out',method:salaryMethod,amount:salaryAmt,fee:0,counterparty:salaryEmp,note:'Salary disbursement'}); updateWalletBalance(salaryMethod,-salaryAmt); setSalaryEmp('');setSalaryAmt(0); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Disburse</button>
              <button onClick={() => { if(salaryAmt<=0)return; const count=Math.floor(Math.random()*10)+3; for(let i=0;i<count;i++){ recordTransaction({type:'Cash-Out',method:salaryMethod,amount:salaryAmt,fee:0,counterparty:`Emp-${Math.floor(100+Math.random()*900)}`,note:'Salary disbursement (bulk)'}); updateWalletBalance(salaryMethod,-salaryAmt); } }} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer">Bulk (CSV Simulate)</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="w-full text-left text-xs min-w-[480px]"><thead className="sticky top-0 bg-brand-dark"><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">ID</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Employee</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Method</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Date</th></tr></thead><tbody className="divide-y divide-brand-border/30">{transactions.filter(t=>t.note.includes('Salary')).slice(0,15).map(t=>(<tr key={t.id} className="hover:bg-brand-dark/20"><td className="py-2.5 px-4 font-mono font-bold text-gray-300">{t.id}</td><td className="py-2.5 px-4 text-gray-200">{t.counterparty}</td><td className="py-2.5 px-4 font-mono font-bold text-white">{formatBDT(t.amount)}</td><td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{backgroundColor:`${METHOD_COLORS[t.method]}1a`,color:METHOD_COLORS[t.method],borderColor:`${METHOD_COLORS[t.method]}40`}}>{t.method}</span></td><td className="py-2.5 px-4 text-gray-400">{t.date}</td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ============= GOVT PAY ============= */}
      {tab === 'govt' && (
        <div className="space-y-6 fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{GOVT_PROVIDERS.map(gp=>(<button key={gp.id} onClick={()=>setGovtProvider(gp.name)} className={`bg-brand-card border rounded-xl p-4 flex flex-col items-center space-y-2 transition-all cursor-pointer ${govtProvider===gp.name?'border-brand-orange bg-brand-orange/5':'border-brand-border hover:border-brand-orange/40'}`}><span className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{backgroundColor:gp.color}}>{gp.name[0]}</span><span className="text-[11px] font-bold text-white text-center">{gp.name}</span><span className="text-[9px] text-gray-400 uppercase">{gp.category}</span></button>))}</div>
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-400" /> Government Payment — {govtProvider}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={govtMethod} onChange={(e) => setGovtMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="text" value={govtRef} onChange={(e) => setGovtRef(e.target.value)} placeholder="Reference / e-TIN / ID" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={govtAmt} onChange={(e) => setGovtAmt(Number(e.target.value))} placeholder="Amount (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(govtAmt<=0||!govtRef)return; recordTransaction({type:'Bill Pay',method:govtMethod,amount:govtAmt,fee:0,counterparty:govtProvider,note:`Govt payment · ${govtRef}`}); updateWalletBalance(govtMethod,-govtAmt); setGovtAmt(0);setGovtRef(''); }} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer">Pay Now</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= BULK PAYOUT ============= */}
      {tab === 'bulkpayout' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><List className="w-4 h-4 text-emerald-400" /> Bulk Payout</h3>
            <div className="space-y-2">
              {bulkRows.map((r,i)=>(<div key={i} className="flex items-center space-x-2"><input type="text" value={r.phone} onChange={(e)=>{const n=[...bulkRows];n[i].phone=e.target.value;setBulkRows(n);}} placeholder="Phone" className="flex-1 px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" /><input type="number" min="0" value={r.amount} onChange={(e)=>{const n=[...bulkRows];n[i].amount=Number(e.target.value);setBulkRows(n);}} placeholder="Amount" className="w-28 px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" /><button onClick={()=>setBulkRows(bulkRows.filter((_,j)=>j!==i))} className="p-2 text-red-400 hover:text-white"><X className="w-3 h-3" /></button></div>))}
              <button onClick={()=>setBulkRows([...bulkRows,{phone:'',amount:500}])} className="text-[10px] font-bold text-brand-orange hover:underline cursor-pointer">+ Add Row</button>
            </div>
            <div className="flex items-center space-x-3"><select value={bulkMethod} onChange={(e) => setBulkMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select><span className="text-xs font-black text-white">Total: {formatBDT(bulkRows.reduce((s,r)=>s+r.amount,0))}</span><button onClick={() => { const total=bulkRows.reduce((s,r)=>s+r.amount,0); if(total<=0)return; bulkRows.forEach(r=>{if(r.amount>0&&r.phone){recordTransaction({type:'Cash-Out',method:bulkMethod,amount:r.amount,fee:0,counterparty:r.phone,note:'Bulk payout'}); updateWalletBalance(bulkMethod,-r.amount);}}); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Send All</button></div>
          </div>
        </div>
      )}

      {/* ============= PAY REQUEST ============= */}
      {tab === 'payrequest' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Send className="w-4 h-4 text-blue-400" /> Request Payment</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={reqTo} onChange={(e) => setReqTo(e.target.value)} placeholder="Request from (name/phone)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={reqMethod} onChange={(e) => setReqMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="number" min="0" value={reqAmt} onChange={(e) => setReqAmt(Number(e.target.value))} placeholder="Amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!reqTo||reqAmt<=0)return; recordTransaction({type:'Cash-In',method:reqMethod,amount:reqAmt,fee:0,counterparty:reqTo,note:`Payment request fulfilled`}); updateWalletBalance(reqMethod,reqAmt); setReqTo('');setReqAmt(0); }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">Send Request</button>
            </div>
          </div>
          <div className="bg-brand-dark/30 border border-brand-border/60 rounded-xl p-4 flex flex-col items-center space-y-3"><QRCodeSVG value={`MFS|${reqMethod}|${reqTo||'User'}|${reqAmt}`} size={140} /><p className="text-[10px] text-gray-400 font-mono">Or share this payment link: <span className="text-brand-orange font-bold">https://mfs.pay/{reqTo||'user'}/{reqAmt}</span></p></div>
        </div>
      )}

      {/* ============= REFERRAL ============= */}
      {tab === 'referral' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Gift className="w-4 h-4 text-brand-orange" /> Referral Program</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={refName} onChange={(e) => setRefName(e.target.value)} placeholder="Referrer name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={refPhone} onChange={(e) => setRefPhone(e.target.value)} placeholder="Phone" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={refBonus} onChange={(e) => setRefBonus(Number(e.target.value))} placeholder="Bonus (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!refName)return; const code='REF'+Math.floor(1000+Math.random()*9000); setRefCode(code); recordTransaction({type:'Cash-In',method:'bKash',amount:refBonus,fee:0,counterparty:refName,note:`Referral bonus · ${code}`}); updateWalletBalance('bKash',refBonus); setRefName('');setRefPhone(''); }} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer">Generate Code</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm text-center space-y-2">{refCode ? <><p className="text-2xl font-black font-mono text-emerald-400">{refCode}</p><p className="text-[11px] text-gray-400">Share this code with friends. They get bonus on first transaction!</p></> : <p className="text-sm text-gray-400">Generate a referral code above</p>}</div>
        </div>
      )}

      {/* ============= WITHDRAW ============= */}
      {tab === 'withdraw' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Banknote className="w-4 h-4 text-red-400" /> Withdraw to Bank</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="text" value={withdrawBank} onChange={(e) => setWithdrawBank(e.target.value)} placeholder="Bank name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={withdrawAcct} onChange={(e) => setWithdrawAcct(e.target.value)} placeholder="A/C number" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={withdrawAmt} onChange={(e) => setWithdrawAmt(Number(e.target.value))} placeholder="Amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!withdrawBank||!withdrawAcct||withdrawAmt<=0)return; recordTransaction({type:'Settlement',method:withdrawMethod,amount:withdrawAmt,fee:10,counterparty:withdrawBank,note:`Bank withdrawal · A/C ${withdrawAcct}`}); updateWalletBalance(withdrawMethod,-withdrawAmt); setWithdrawBank('');setWithdrawAcct('');setWithdrawAmt(0); }} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer">Withdraw</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="w-full text-left text-xs min-w-[560px]"><thead className="sticky top-0 bg-brand-dark"><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">TX ID</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Bank</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">A/C</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Date</th></tr></thead><tbody className="divide-y divide-brand-border/30">{transactions.filter(t=>t.note.includes('Bank withdrawal')).map(t=>(<tr key={t.id} className="hover:bg-brand-dark/20"><td className="py-2.5 px-4 font-mono font-bold text-gray-300">{t.id}</td><td className="py-2.5 px-4 font-bold text-white">{t.counterparty}</td><td className="py-2.5 px-4 text-gray-300">{t.note.replace('Bank withdrawal · A/C ','')}</td><td className="py-2.5 px-4 font-mono font-bold text-red-400">{formatBDT(t.amount)}</td><td className="py-2.5 px-4 text-gray-400">{t.date}</td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ============= FRAUD DETECT ============= */}
      {tab === 'fraud' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-red-400" /> Fraud Detection Rules</h3>
            <div className="flex items-center space-x-3"><input type="text" value={fraudRule} onChange={(e) => setFraudRule(e.target.value)} placeholder="New rule (e.g. cash-out > 50k in 1hr)" className="flex-1 px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" /><button onClick={() => { if(fraudRule.trim()){                       setFaudFlags(p=>[{id:`FLG-${Math.floor(100+Math.random()*900)}`,type:'Settlement',method:'System',amount:0,fee:0,counterparty:'System',note:`Rule added: ${fraudRule}`,date:new Date().toLocaleString(),status:'Processing'},...p]); setFraudRule(''); } }} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer">Add Rule</button></div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Flagged Suspicious Transactions</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[640px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Flag ID</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Type</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Counterparty</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Risk</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Reason</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Date</th></tr></thead><tbody className="divide-y divide-brand-border/30">{faudFlags.map(f=>{const rs=getFraudRiskScore(f);return(<tr key={f.id} className="hover:bg-brand-dark/20 bg-red-500/5"><td className="py-3 px-4 font-mono font-bold text-red-400">{f.id}</td>                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/30">Flagged</span></td><td className="py-3 px-4 font-bold text-white">{f.counterparty}</td><td className="py-3 px-4 font-mono font-bold text-red-400">{f.amount>0?formatBDT(f.amount):'—'}</td><td className="py-3 px-4"><div className="flex items-center space-x-1.5"><div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${rs}%`,backgroundColor:rs>75?'#ef4444':rs>50?'#f59e0b':'#10b981'}}></div></div><span className="text-[9px] font-bold font-mono" style={{color:rs>75?'#ef4444':rs>50?'#f59e0b':'#10b981'}}>{rs}%</span></div></td><td className="py-3 px-4 text-[10px] text-gray-300 max-w-[200px] truncate">{f.note}</td><td className="py-3 px-4 text-gray-400">{f.date}</td></tr>);})}</tbody></table></div></div>
        </div>
      )}

      {/* ============= DEV API ============= */}
      {tab === 'api' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Code className="w-4 h-4 text-emerald-400" /> API Keys & Webhooks</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input type="text" value={apiName} onChange={(e) => setApiName(e.target.value)} placeholder="Key name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!apiName.trim())return; setApiKeys(p=>[{id:`API-${Math.floor(100+Math.random()*900)}`,key:`mfs_sk_live_${Math.random().toString(36).substring(2,30)}`,name:apiName,created:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),active:true},...p]); setApiName(''); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Generate Key</button>
              <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="Webhook URL" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={webhookEvents} onChange={(e) => setWebhookEvents(e.target.value)} placeholder="Events (comma separated)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!webhookUrl.trim())return; setWebhooks(p=>[{id:`WH-${Math.floor(100+Math.random()*900)}`,url:webhookUrl,events:webhookEvents,status:'Active'},...p]); setWebhookUrl(''); }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">Add Webhook</button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">API Keys</h3></div><div className="divide-y divide-brand-border/30">{apiKeys.map(k=>(<div key={k.id} className="p-4 space-y-2"><div className="flex items-center justify-between"><span className="font-mono font-bold text-white text-xs">{k.name}</span><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${k.active?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>{k.active?'Active':'Revoked'}</span></div><p className="font-mono text-[10px] text-gray-400 break-all">{k.key}</p><p className="text-[9px] text-gray-500">Created {k.created}</p></div>))}</div></div>
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Webhook Endpoints</h3></div><div className="divide-y divide-brand-border/30">{webhooks.map(w=>(<div key={w.id} className="p-4 space-y-2"><div className="flex items-center justify-between"><span className="font-mono font-bold text-white text-[11px]">{w.id}</span><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${w.status==='Active'?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>{w.status}</span></div><p className="text-[10px] text-gray-400 break-all">{w.url}</p><p className="text-[9px] text-gray-500">Events: {w.events}</p></div>))}</div></div>
          </div>
          <div className="bg-brand-dark/30 border border-brand-border/60 rounded-xl p-4"><h3 className="text-sm font-bold text-white mb-2">Quick API Reference</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-mono text-gray-300">
            <div className="bg-brand-dark p-2 rounded"><span className="text-emerald-400">POST</span> /v1/payment - Create payment</div>
            <div className="bg-brand-dark p-2 rounded"><span className="text-blue-400">GET</span> /v1/transactions - List transactions</div>
            <div className="bg-brand-dark p-2 rounded"><span className="text-amber-400">POST</span> /v1/webhook - Test webhook</div>
            <div className="bg-brand-dark p-2 rounded"><span className="text-emerald-400">GET</span> /v1/balance - Wallet balance</div>
            <div className="bg-brand-dark p-2 rounded"><span className="text-blue-400">POST</span> /v1/transfer - P2P transfer</div>
            <div className="bg-brand-dark p-2 rounded"><span className="text-amber-400">GET</span> /v1/settlement - Settlement status</div>
          </div></div>
        </div>
      )}

      {/* ========== AUDIT LOG ========== */}
      {tab === 'audit' && (
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-brand-border/60 flex items-center justify-between"><div><h3 className="text-sm font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" /> Full Audit Trail</h3><p className="text-[11px] text-gray-400">Every action logged: who, what, when</p></div><span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">{auditLog.length} entries</span></div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="sticky top-0 bg-brand-dark"><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">ID</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">User</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Action</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Module</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Detail</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Date</th></tr></thead>
              <tbody className="divide-y divide-brand-border/30">{auditLog.map(a=>(<tr key={a.id} className="hover:bg-brand-dark/20"><td className="py-2.5 px-4 font-mono font-bold text-gray-300">{a.id}</td><td className="py-2.5 px-4 font-bold text-white">{a.user}</td><td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${a.action==='Login'?'bg-cyan-500/10 text-cyan-400':a.action==='Create'?'bg-emerald-500/10 text-emerald-400':a.action==='Update'?'bg-amber-500/10 text-amber-400':a.action==='Alert'?'bg-red-500/10 text-red-400':'bg-blue-500/10 text-blue-400'}`}>{a.action}</span></td><td className="py-2.5 px-4 text-gray-300">{a.module}</td><td className="py-2.5 px-4 text-gray-300 max-w-[240px] truncate">{a.detail}</td><td className="py-2.5 px-4 text-gray-400">{a.date}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== SCHEDULED PAY ========== */}
      {tab === 'scheduled' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-orange" /> Schedule Recurring Payment</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="text" value={schName} onChange={(e) => setSchName(e.target.value)} placeholder="Payment name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={schMethod} onChange={(e) => setSchMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="number" min="0" value={schAmt} onChange={(e) => setSchAmt(Number(e.target.value))} placeholder="Amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={schFreq} onChange={(e) => setSchFreq(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"><option>Daily</option><option>Weekly</option><option>Monthly</option></select>
              <input type="text" value={schTo} onChange={(e) => setSchTo(e.target.value)} placeholder="To (name/account)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!schName||schAmt<=0)return; setScheduledPays(p=>[{id:`SCH-${Math.floor(100+Math.random()*900)}`,name:schName,method:schMethod,amount:schAmt,frequency:schFreq,nextDate:schFreq==='Daily'?'Tomorrow':schFreq==='Weekly'?'Next Monday':'Next Month 1st',counterParty:schTo||'N/A',status:'Active'},...p]); setSchName('');setSchAmt(0);setSchTo(''); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Schedule</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[640px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Name</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Frequency</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Next</th><th className="py-3 px-4 font-bold uppercase text-[10px]">To</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{scheduledPays.map(s=>(<tr key={s.id} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-bold text-white">{s.name}</td><td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(s.amount)}</td><td className="py-3 px-4 text-gray-300">{s.frequency}</td><td className="py-3 px-4 font-mono text-gray-300">{s.nextDate}</td><td className="py-3 px-4 text-gray-300">{s.counterParty}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${s.status==='Active'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/30':'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>{s.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ========== FOREX RATES ========== */}
      {tab === 'forex' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> Currency Buy/Sell Rates (Forex)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="text" value={forexCurr} onChange={(e) => setForexCurr(e.target.value)} placeholder="Currency code" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={forexCountry} onChange={(e) => setForexCountry(e.target.value)} placeholder="Country" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" step="0.1" value={forexBuy} onChange={(e) => setForexBuy(Number(e.target.value))} placeholder="Buy rate (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" step="0.1" value={forexSell} onChange={(e) => setForexSell(Number(e.target.value))} placeholder="Sell rate (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!forexCurr)return; setForexRates(p=>[{currency:forexCurr,country:forexCountry||forexCurr,buy:forexBuy,sell:forexSell,change:'0.0'},...p]); setForexCurr('');setForexCountry('');setForexBuy(0);setForexSell(0); }} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold cursor-pointer">Add Rate</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[540px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Currency</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Country</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Buy (We Buy)</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Sell (We Sell)</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Change</th></tr></thead><tbody className="divide-y divide-brand-border/30">{forexRates.map(f=>(<tr key={f.currency} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-black text-white font-mono">{f.currency}</td><td className="py-3 px-4 text-gray-300">{f.country}</td><td className="py-3 px-4 font-mono font-bold text-emerald-400">৳ {f.buy.toFixed(1)}</td><td className="py-3 px-4 font-mono font-bold text-red-400">৳ {f.sell.toFixed(1)}</td><td className="py-3 px-4 font-mono"><span className={f.change.startsWith('+')?'text-emerald-400':f.change.startsWith('-')?'text-red-400':'text-gray-400'}>{f.change}</span></td></tr>))}</tbody></table></div></div>
          <div className="bg-brand-card border border-brand-orange/30 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white">Currency Converter</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div><label className="block text-[10px] text-gray-400 mb-0.5">From</label><select className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"><option value="BDT">BDT (৳)</option>{forexRates.map(f=><option key={f.currency} value={f.currency}>{f.currency} ({f.country})</option>)}</select></div>
              <div><label className="block text-[10px] text-gray-400 mb-0.5">Amount</label><input type="number" min="0" defaultValue={1} className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" /></div>
              <div className="text-center text-lg font-black text-gray-400">→</div>
              <div><label className="block text-[10px] text-gray-400 mb-0.5">To</label><select className="w-full px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"><option value="BDT">BDT (৳)</option>{forexRates.map(f=><option key={f.currency} value={f.currency}>{f.currency}</option>)}</select></div>
              <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold cursor-pointer">Convert</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAX / VAT ========== */}
      {tab === 'tax' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Percent className="w-4 h-4 text-amber-400" /> Tax Deduction (TDS / VAT)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select value={taxType} onChange={(e) => setTaxType(e.target.value as any)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"><option value="TDS">TDS</option><option value="VAT">VAT</option></select>
              <input type="number" min="0" value={taxAmt} onChange={(e) => setTaxAmt(Number(e.target.value))} placeholder="Base amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} placeholder="Rate %" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={taxPeriod} onChange={(e) => setTaxPeriod(e.target.value)} placeholder="Period (e.g. Q1 2024)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(taxAmt<=0)return; setTaxRecords(p=>[{id:`TAX-${Math.floor(100+Math.random()*900)}`,type:taxType,amount:taxAmt,rate:taxRate,deducted:taxAmt*taxRate/100,period:taxPeriod||'—',status:'Pending'},...p]); setTaxAmt(0); }} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer">Calculate & Record</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[600px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">ID</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Type</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Base</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Rate</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Deducted</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Period</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{taxRecords.map(t=>(<tr key={t.id} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-mono font-bold text-gray-300">{t.id}</td><td className="py-3 px-4 font-bold text-white">{t.type}</td><td className="py-3 px-4 font-mono text-white">{formatBDT(t.amount)}</td><td className="py-3 px-4 font-mono">{t.rate}%</td><td className="py-3 px-4 font-mono font-bold text-red-400">{formatBDT(t.deducted)}</td><td className="py-3 px-4 text-gray-300">{t.period}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${t.status==='Paid'?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-400'}`}>{t.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ========== BUDGET ========== */}
      {tab === 'budget' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-400" /> Budget Planner</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={budgetCat} onChange={(e) => setBudgetCat(e.target.value)} placeholder="Category" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={budgetPlan} onChange={(e) => setBudgetPlan(Number(e.target.value))} placeholder="Planned (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={budgetAct} onChange={(e) => setBudgetAct(Number(e.target.value))} placeholder="Actual (৳)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!budgetCat)return; setBudgetItems(p=>[...p.filter(x=>x.category!==budgetCat),{category:budgetCat,planned:budgetPlan,actual:budgetAct}]); setBudgetCat('');setBudgetPlan(0);setBudgetAct(0); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Add Line</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[480px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Category</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Planned</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Actual</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Variance</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{liveBudgetItems.map(b=>{const diff=b.actual-b.planned;const pct=b.planned>0?Math.round((b.actual/b.planned)*100):0;return(<tr key={b.category} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-bold text-white">{b.category}</td><td className="py-3 px-4 font-mono text-white">{formatBDT(b.planned)}</td><td className="py-3 px-4 font-mono text-white">{formatBDT(b.actual)}</td><td className="py-3 px-4 font-mono font-bold"><span className={diff>0?'text-red-400':diff<0?'text-emerald-400':'text-gray-400'}>{diff>0?'+':''}{formatBDT(diff)}</span></td><td className="py-3 px-4"><div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[80px]"><div className={`h-full rounded-full ${pct>100?'bg-red-500':pct>=80?'bg-emerald-500':'bg-amber-500'}`} style={{width:`${Math.min(100,pct)}%`}}></div></div><span className="text-[9px] ml-1">{pct}%</span></td></tr>);})}</tbody><tfoot><tr className="bg-brand-dark/40 border-t border-brand-border"><td className="py-3 px-4 font-black text-white">Total</td><td className="py-3 px-4 font-mono font-black text-white">{formatBDT(liveBudgetItems.reduce((s,b)=>s+b.planned,0))}</td><td className="py-3 px-4 font-mono font-black text-white">{formatBDT(liveBudgetItems.reduce((s,b)=>s+b.actual,0))}</td><td className="py-3 px-4"></td><td className="py-3 px-4"></td></tr></tfoot></table></div></div>
        </div>
      )}

      {/* ========== LIVE TICKER ========== */}
      {tab === 'ticker' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Zap className="w-4 h-4 text-amber-400 animate-pulse" /> Live MFS Rate Ticker</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['bKash','Nagad','Rocket','Upay','SureCash','SSLCommerz'].map(m=>{const tx=transactions.filter(t=>t.method===m);const vol=tx.reduce((s,t)=>s+t.amount,0);const cnt=tx.length;return(<div key={m} className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-3 flex items-center justify-between"><div className="flex items-center space-x-2">{renderWalletIcon(m)}<div><p className="text-xs font-bold text-white">{m}</p><p className="text-[9px] text-gray-500">{cnt} TX · ৳{vol.toLocaleString()}</p></div></div><div className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span className="text-[10px] font-mono text-emerald-400 font-bold">{(cnt>0?(vol*100/totalGross).toFixed(1):'0.0')}%</span></div></div>);})}
            </div>
          </div>
          <div className="bg-brand-dark/30 border border-brand-border/60 rounded-xl p-4"><p className="text-[10px] text-gray-400 font-mono flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>LIVE · Last transaction: {transactions[0]?.id || '—'} · {transactions[0]?.date || '—'}</p></div>
        </div>
      )}

      {/* ========== USER ROLES ========== */}
      {tab === 'roles' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> User Role & Permissions (RBAC)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="User name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={roleType} onChange={(e) => setRoleType(e.target.value as any)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"><option>Super Admin</option><option>Admin</option><option>Agent</option><option>Viewer</option></select>
              <input type="text" value={rolePerms} onChange={(e) => setRolePerms(e.target.value)} placeholder="Permissions (comma)" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!roleName)return; setUserRoles(p=>[{id:`ROL-${Math.floor(100+Math.random()*900)}`,name:roleName,role:roleType,permissions:rolePerms||'Read Only',status:'Active'},...p.filter(x=>x.name!==roleName)]); setRoleName('');setRolePerms(''); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Save Role</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[540px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">User</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Role</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Permissions</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{userRoles.map(r=>(<tr key={r.id} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-bold text-white">{r.name}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${r.role==='Super Admin'?'bg-red-500/10 text-red-400 border-red-500/30':r.role==='Admin'?'bg-brand-orange/10 text-brand-orange border-brand-orange/30':r.role==='Agent'?'bg-blue-500/10 text-blue-400':'bg-gray-500/10 text-gray-400'}`}>{r.role}</span></td><td className="py-3 px-4 text-[10px] text-gray-300">{r.permissions}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${r.status==='Active'?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>{r.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ========== NPSB ========== */}
      {tab === 'npsb' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" /> NPSB Bank Transfer</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={npsbMethod} onChange={(e) => setNpsbMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="text" value={npsbBank} onChange={(e) => setNpsbBank(e.target.value)} placeholder="Bank name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={npsbBranch} onChange={(e) => setNpsbBranch(e.target.value)} placeholder="Branch" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={npsbAcct} onChange={(e) => setNpsbAcct(e.target.value)} placeholder="A/C number" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={npsbAmt} onChange={(e) => setNpsbAmt(Number(e.target.value))} placeholder="Amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!npsbBank||!npsbAcct||npsbAmt<=0)return; setNpsbTransfers(p=>[{id:`NPSB-${Math.floor(100+Math.random()*900)}`,fromMethod:npsbMethod,bankName:npsbBank,branch:npsbBranch||'—',accountNo:npsbAcct,amount:npsbAmt,fee:Math.round(npsbAmt*0.001),status:'Processing',date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})},...p]); recordTransaction({type:'Transfer',method:npsbMethod,amount:npsbAmt,fee:Math.round(npsbAmt*0.001),counterparty:npsbBank,note:`NPSB transfer · ${npsbAcct}`}); updateWalletBalance(npsbMethod,-(npsbAmt+Math.round(npsbAmt*0.001))); setNpsbBank('');setNpsbBranch('');setNpsbAcct('');setNpsbAmt(0); }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">Transfer via NPSB</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[640px]"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">ID</th><th className="py-3 px-4 font-bold uppercase text-[10px]">From</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Bank</th><th className="py-3 px-4 font-bold uppercase text-[10px]">A/C</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Fee</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{npsbTransfers.map(n=>(<tr key={n.id} className="hover:bg-brand-dark/20"><td className="py-3 px-4 font-mono font-bold text-gray-300">{n.id}</td><td className="py-3 px-4 font-bold text-white">{n.fromMethod}</td><td className="py-3 px-4"><p className="text-gray-200">{n.bankName}</p><p className="text-[9px] text-gray-500">{n.branch}</p></td><td className="py-3 px-4 font-mono text-gray-300">{n.accountNo}</td><td className="py-3 px-4 font-mono font-bold text-white">{formatBDT(n.amount)}</td><td className="py-3 px-4 font-mono text-amber-400">{formatBDT(n.fee)}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${n.status==='Completed'?'bg-emerald-500/10 text-emerald-400':n.status==='Processing'?'bg-amber-500/10 text-amber-400':'bg-red-500/10 text-red-400'}`}>{n.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ========== POS ========== */}
      {tab === 'pos' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-400" /> POS Terminal (Simulator)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={posTerminal} onChange={(e) => setPosTerminal(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"><option>POS-T1 (Dhanmondi)</option><option>POS-T2 (Gulshan)</option><option>POS-T3 (Uttara)</option></select>
              <select value={posMethod} onChange={(e) => setPosMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
              <input type="text" value={posMerchant} onChange={(e) => setPosMerchant(e.target.value)} placeholder="Merchant" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="number" min="0" value={posAmount} onChange={(e) => setPosAmount(Number(e.target.value))} placeholder="Amount" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(posAmount<=0)return; const approved=Math.random()>0.1; setPosTxns(p=>[{id:`POS-${Math.floor(100+Math.random()*900)}`,terminal:posTerminal,method:posMethod,amount:posAmount,merchant:posMerchant||'Unknown',date:new Date().toLocaleString(),status:approved?'Approved':'Declined'},...p]); if(approved){ recordTransaction({type:'Merchant QR',method:posMethod,amount:posAmount,fee:posAmount*(getRate(posMethod)/100),counterparty:posMerchant||'POS Customer',note:'POS swipe'}); updateWalletBalance(posMethod,posAmount); } setPosAmount(0); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Swipe Card</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="w-full text-left text-xs min-w-[540px]"><thead className="sticky top-0 bg-brand-dark"><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">ID</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Terminal</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Method</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Merchant</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{posTxns.map(p=>(<tr key={p.id} className="hover:bg-brand-dark/20"><td className="py-2.5 px-4 font-mono font-bold text-gray-300">{p.id}</td><td className="py-2.5 px-4 text-gray-200">{p.terminal}</td><td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{backgroundColor:`${METHOD_COLORS[p.method]}1a`,color:METHOD_COLORS[p.method],borderColor:`${METHOD_COLORS[p.method]}40`}}>{p.method}</span></td><td className="py-2.5 px-4 font-mono font-bold text-white">{formatBDT(p.amount)}</td><td className="py-2.5 px-4 text-gray-300">{p.merchant}</td><td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${p.status==='Approved'?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>{p.status}</span></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* ========== THEME ========== */}
      {tab === 'theme' && (
        <div className="space-y-6 fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4 text-center">
            <h3 className="text-sm font-bold text-white flex items-center justify-center gap-2"><Eye className="w-4 h-4 text-brand-orange" /> Theme Settings</h3>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setIsDarkMode(false)} className={`px-6 py-4 rounded-xl border-2 transition-all cursor-pointer ${!isDarkMode?'border-brand-orange bg-brand-orange/10':'border-brand-border bg-brand-dark/40 opacity-60'}`}>
                <div className="w-16 h-12 rounded-lg bg-white shadow mb-2 mx-auto"></div>
                <span className="text-xs font-bold text-white">Light</span>
              </button>
              <button onClick={() => setIsDarkMode(true)} className={`px-6 py-4 rounded-xl border-2 transition-all cursor-pointer ${isDarkMode?'border-brand-orange bg-brand-orange/10':'border-brand-border bg-brand-dark/40 opacity-60'}`}>
                <div className="w-16 h-12 rounded-lg bg-[#0a0e17] shadow mb-2 mx-auto"></div>
                <span className="text-xs font-bold text-white">Dark</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-400">Theme applied immediately — {isDarkMode?'Dark mode activated':'Light mode activated'}.</p>
          </div>
        </div>
      )}

      {/* ================= BANK & API HUB ================= */}
      {tab === 'bankhub' && (
        <div className="space-y-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2"><CreditCard className="w-5 h-5 text-brand-orange" />
                <span>Bank & API Integration Hub</span>
              </h2>
              <p className="text-xs text-gray-400">MFS API status · Bank Accounts · Merchant/Customer Phone Directory · Integration Health</p>
            </div>
          </div>

          {/* MFS API Status */}
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white">➕ Register MFS API / Payment Gateway (Manual Add)</h3>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-400">Add bKash, Nagad, Rocket, Upay, SureCash, SSLCommerz, Visa, Mastercard API credentials</p>
              <button onClick={()=>{setMfsApiStatuses([{provider:'bKash',apiKey:'bkash_live_X7kL9mP2qR4vN8wH6cT5',endpoint:'api.bkash.com',status:'Online',lastChecked:'Just now',successRate:99.8,dailyCalls:1245},{provider:'Nagad',apiKey:'nagad_live_J3fG7hD1sW9yA6uM0oK4',endpoint:'api.nagad.com',status:'Online',lastChecked:'2 min ago',successRate:98.5,dailyCalls:890},{provider:'Rocket',apiKey:'rocket_sandbox_W9dC2eR5tG8hJ1kN3pS6',endpoint:'api.rocket.com.bd',status:'Degraded',lastChecked:'5 min ago',successRate:89.2,dailyCalls:456},{provider:'Upay',apiKey:'upay_live_M0vB3nC6xZ9lK2jH5gF8',endpoint:'api.upay.com',status:'Online',lastChecked:'1 min ago',successRate:100,dailyCalls:312},{provider:'SSLCommerz',apiKey:'ssl_store_A5dS8fG1hJ4kL7zX0cV3',endpoint:'api.sslcommerz.com',status:'Online',lastChecked:'Just now',successRate:97.1,dailyCalls:678}]);}} className="px-3 py-1.5 bg-brand-dark hover:bg-white/10 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold cursor-pointer">🔄 Reset All APKs</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={apiProvider} onChange={(e) => setApiProvider(e.target.value)} placeholder="Provider name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key / Secret" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="Endpoint URL" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!apiProvider.trim())return; setMfsApiStatuses(p=>[{provider:apiProvider,apiKey:apiKey||`mfs_sk_****`,endpoint:webhookUrl||'api.example.com',status:'Online',lastChecked:'Just now',successRate:100,dailyCalls:0},...p.filter(x=>x.provider!==apiProvider)]); setApiProvider('');setApiKey('');setWebhookUrl(''); }} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold cursor-pointer">Register API</button>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-brand-border/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">MFS API Status (Live Integration Monitor)</h3>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">{mfsApiStatuses.filter(a=>a.status==='Online').length} Online</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-3 px-4 font-bold uppercase text-[10px]">Provider</th><th className="py-3 px-4 font-bold uppercase text-[10px]">API Key</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Endpoint</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Status</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Success Rate</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Daily Calls</th><th className="py-3 px-4 font-bold uppercase text-[10px]">Last Check</th><th className="py-3 px-4 font-bold uppercase text-[10px] text-center">Actions</th></tr></thead>
                <tbody className="divide-y divide-brand-border/30">{mfsApiStatuses.map(a=>(<tr key={a.provider} className={"hover:bg-brand-dark/20 "+(a.status==="Archive"?"opacity-40":"")}><td className="py-3 px-4 font-bold text-white">{a.provider}</td><td className="py-3 px-4 font-mono text-[10px] text-gray-400 cursor-pointer hover:text-brand-orange transition-colors" onClick={async(e:any)=>{e.stopPropagation();const txt=e.currentTarget;const orig=a.apiKey.length>16?a.apiKey.slice(0,12)+"..."+a.apiKey.slice(-4):a.apiKey;txt.textContent=a.apiKey;txt.style.color="#10b981";setTimeout(()=>{txt.textContent=orig;txt.style.color="";},2500);}} title="Click to reveal full key">{a.apiKey.length>16?a.apiKey.slice(0,12)+"..."+a.apiKey.slice(-4):a.apiKey}</td><td className="py-3 px-4 font-mono text-[10px] text-gray-300">{a.endpoint}</td><td className="py-3 px-4"><span className={"px-2 py-0.5 rounded-full text-[9px] font-black uppercase border "+(a.status==="Online"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/30":a.status==="Degraded"?"bg-amber-500/10 text-amber-400 border-amber-500/30":a.status==="Archive"?"bg-gray-500/10 text-gray-400 border-gray-500/30":"bg-red-500/10 text-red-400 border-red-500/30")}>{a.status}</span></td><td className="py-3 px-4 font-mono font-bold" style={{color:a.successRate>95?"#10b981":a.successRate>85?"#f59e0b":"#ef4444"}}>{a.successRate}%</td><td className="py-3 px-4 font-mono text-white">{a.dailyCalls.toLocaleString()}</td><td className="py-3 px-4 text-gray-400">{a.lastChecked}</td><td className="py-3 px-4 text-center"><div className="flex items-center justify-center space-x-1" onClick={(e:any)=>e.stopPropagation()}>{a.status==="Archive"?<button onClick={()=>setMfsApiStatuses((prev:any)=>prev.map((x:any)=>x.provider===a.provider?{...x,status:"Online",lastChecked:"Just now"}:x))} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded cursor-pointer" title="Restore">♻</button>:<><button onClick={()=>setMfsApiStatuses((prev:any)=>prev.map((x:any)=>x.provider===a.provider?{...x,status:x.status==="Online"?"Offline":"Online",lastChecked:"Just now"}:x))} className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 rounded cursor-pointer" title="Toggle">{a.status==="Online"?"⏸":"▶"}</button><button onClick={async()=>{try{await navigator.clipboard.writeText(a.apiKey);setCopiedApi(a.provider);setTimeout(()=>setCopiedApi(null),2000);}catch{const tx=document.createElement("textarea");tx.value=a.apiKey;document.body.appendChild(tx);tx.select();document.execCommand("copy");document.body.removeChild(tx);setCopiedApi(a.provider);setTimeout(()=>setCopiedApi(null),2000);}}} className={"p-1.5 rounded cursor-pointer border transition-all "+(copiedApi===a.provider?"bg-emerald-500 text-white border-emerald-500":"bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border-blue-500/30")} title="Copy">{copiedApi===a.provider?"✅ Copied":"📋"}</button><button onClick={()=>setMfsApiStatuses((prev:any)=>prev.map((x:any)=>x.provider===a.provider?{...x,lastChecked:"Just now",dailyCalls:x.dailyCalls+Math.floor(Math.random()*15+5),successRate:Math.min(100,Math.max(80,x.successRate+Math.floor(Math.random()*8-3)))}:x))} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded cursor-pointer" title="Test">🔍</button><button onClick={()=>setMfsApiStatuses((prev:any)=>prev.map((x:any)=>x.provider===a.provider?{...x,status:"Archive"}:x))} className="p-1.5 bg-gray-500/10 hover:bg-gray-500 text-gray-400 hover:text-white border border-gray-500/30 rounded cursor-pointer" title="Archive">📦</button></>}</div></td></tr>))}</tbody>
              </table>
            </div>
          </div>

          {/* Bank Accounts Registry */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white">➕ Link Bank Account (BD Banks)</h3>
              <p className="text-[10px] text-gray-400">Select any Bangladesh bank & link to MFS wallet</p>
              <div className="grid grid-cols-2 gap-3">
                <select value={bnkBank} onChange={(e) => setBnkBank(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">
                  <option value="">Select Bank</option>
                  <option>Sonali Bank</option><option>Janata Bank</option><option>Agrani Bank</option><option>Rupali Bank</option>
                  <option>Dutch-Bangla Bank</option><option>Islami Bank BD</option><option>BRAC Bank</option><option>City Bank</option>
                  <option>Eastern Bank (EBL)</option><option>Prime Bank</option><option>Dhaka Bank</option><option>AB Bank</option>
                  <option>IFIC Bank</option><option>NCC Bank</option><option>One Bank</option><option>Premier Bank</option>
                  <option>Mutual Trust Bank</option><option>Bank Asia</option><option>Pubali Bank</option><option>Uttara Bank</option>
                  <option>UCB</option><option>Standard Bank</option><option>Trust Bank</option><option>Southeast Bank</option>
                  <option>SBAC Bank</option><option>NRBC Bank</option><option>NRB Bank</option><option>Al-Arafah Islami Bank</option>
                  <option>Shahjalal Islami Bank</option><option>First Security Bank</option><option>Social Islami Bank</option>
                  <option>HSBC Bangladesh</option><option>Standard Chartered</option><option>Modhumoti Bank</option>
                </select>
                <input type="text" value={bnkAcct} onChange={(e) => setBnkAcct(e.target.value)} placeholder="Account Number" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <input type="text" value={bnkBranch} onChange={(e) => setBnkBranch(e.target.value)} placeholder="Branch" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <select value={bnkType} onChange={(e) => setBnkType(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"><option>Current</option><option>Savings</option><option>Fixed Deposit</option></select>
                <select value={bnkMethod} onChange={(e) => setBnkMethod(e.target.value)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer">{wallets.map(w=><option key={w.method} value={w.method}>{w.method}</option>)}</select>
                <input type="number" min="0" value={bnkBalance} onChange={(e) => setBnkBalance(Number(e.target.value))} placeholder="Balance" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <input type="text" value={bnkPhone} onChange={(e) => setBnkPhone(e.target.value)} placeholder="Contact Phone" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
                <button onClick={() => { if(!bnkBank||!bnkAcct)return; setBankAccounts(p=>[{id:`BNK-${Math.floor(100+Math.random()*900)}`,bankName:bnkBank,accountNo:bnkAcct,branch:bnkBranch||'N/A',accountType:bnkType,linkedMethod:bnkMethod,balance:bnkBalance,status:'Active',contactPhone:bnkPhone||'—'},...p]); setBnkBank('');setBnkAcct('');setBnkBranch('');setBnkPhone('');setBnkBalance(0); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Link Account</button>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Bank Accounts ({bankAccounts.length})</h3></div>
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className="sticky top-0 bg-brand-dark"><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Bank</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">A/C No</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Linked</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Balance</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Phone</th><th className="py-2.5 px-4 font-bold uppercase text-[10px] text-center">Actions</th></tr></thead>
                  <tbody className="divide-y divide-brand-border/30">{bankAccounts.map(b=>{const isE=editingBank===b.id;return(<tr key={b.id} className="hover:bg-brand-dark/20"><td className="py-2.5 px-4"><p className="font-bold text-white">{isE?<input type="text" defaultValue={b.bankName} onChange={(e)=>setEditBnkName(e.target.value)} className="w-28 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange"/>:<>{b.bankName}</>}</p><p className="text-[9px] text-gray-500">{b.branch} · {b.accountType}</p></td><td className="py-2.5 px-4 font-mono text-gray-300">{isE?<input type="text" defaultValue={b.accountNo} onChange={(e)=>setEditBnkAcct(e.target.value)} className="w-28 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange"/>:b.accountNo}</td><td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{backgroundColor:`${METHOD_COLORS[b.linkedMethod]}1a`,color:METHOD_COLORS[b.linkedMethod],borderColor:`${METHOD_COLORS[b.linkedMethod]}40`}}>{b.linkedMethod}</span></td><td className="py-2.5 px-4 font-mono font-bold text-white">{formatBDT(b.balance)}</td><td className="py-2.5 px-4 font-mono text-gray-300">{isE?<input type="text" defaultValue={b.contactPhone} onChange={(e)=>setEditBnkPhone(e.target.value)} className="w-28 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange"/>:b.contactPhone}</td><td className="py-2.5 px-4 text-center"><div className="flex items-center justify-center space-x-1" onClick={(e)=>e.stopPropagation()}>{isE?<><button onClick={()=>{setBankAccounts(prev=>prev.map(x=>x.id===b.id?{...x,bankName:editBnkName||x.bankName,accountNo:editBnkAcct||x.accountNo,contactPhone:editBnkPhone||x.contactPhone}:x));setEditingBank(null);}} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded cursor-pointer">✓</button><button onClick={()=>setEditingBank(null)} className="p-1.5 text-gray-400 hover:text-white cursor-pointer">✕</button></>:<><button onClick={()=>{setEditingBank(b.id);setEditBnkName(b.bankName);setEditBnkAcct(b.accountNo);setEditBnkPhone(b.contactPhone);}} className="p-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded cursor-pointer" title="Edit">✎</button><button onClick={()=>setBankAccounts(prev=>prev.map(x=>x.id===b.id?{...x,status:x.status==='Active'?'Pending':'Active'}:x))} className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 rounded cursor-pointer" title={b.status==='Active'?'Suspend':'Activate'}>{b.status==='Active'?'⏸':'▶'}</button><button onClick={()=>{const types=['Current','Savings','Fixed Deposit'];const idx=types.indexOf(b.accountType);const next=types[(idx+1)%types.length];setBankAccounts(prev=>prev.map(x=>x.id===b.id?{...x,accountType:next}:x));}} className="p-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 rounded cursor-pointer" title="Upgrade Type">↑</button><button onClick={()=>setBankAccounts(prev=>prev.filter(x=>x.id!==b.id))} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded cursor-pointer" title="Delete">✕</button></>}</div></td></tr>);})}</tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Phone Directory */}
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white">➕ Add bKash Merchant / Contact Phone</h3>
            <p className="text-[10px] text-gray-400">Add bKash Merchant phone · Customer personal · Agent · Bank · Support contact</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="text" value={ctName} onChange={(e) => setCtName(e.target.value)} placeholder="Contact Name" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <input type="text" value={ctPhone} onChange={(e) => setCtPhone(e.target.value)} placeholder="Phone / Email" className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <select value={ctType} onChange={(e) => setCtType(e.target.value as any)} className="px-3 py-2 bg-brand-dark text-xs text-white border border-brand-border rounded-lg outline-none focus:border-brand-orange cursor-pointer"><option>Merchant</option><option>Customer</option><option>Agent</option><option>Bank</option><option>Support</option></select>
              <button onClick={() => { if(!ctName||!ctPhone)return; setContactPhones(p=>[{id:`CT-${Math.floor(100+Math.random()*900)}`,name:ctName,phone:ctPhone,type:ctType,method:ctType==='Merchant'||ctType==='Agent'?bnkMethod:undefined},...p]); setCtName('');setCtPhone(''); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Save Contact</button>
            </div>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="w-full text-left text-xs min-w-[600px]"><thead className="sticky top-0 bg-brand-dark"><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Name</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Phone</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Type</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Method</th><th className="py-2.5 px-4 font-bold uppercase text-[10px] text-center">Actions</th></tr></thead><tbody className="divide-y divide-brand-border/30">{contactPhones.map(c=>{const isE=editingContact===c.id;return(<tr key={c.id} className="hover:bg-brand-dark/20"><td className="py-2.5 px-4 font-bold text-white">{isE?<input type="text" defaultValue={c.name} onChange={(e)=>setEditCtEditName(e.target.value)} className="w-28 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange"/>:c.name}</td><td className="py-2.5 px-4 font-mono text-brand-orange">{isE?<input type="text" defaultValue={c.phone} onChange={(e)=>setEditCtEditPhone(e.target.value)} className="w-36 px-2 py-1 bg-brand-dark text-xs text-white border border-brand-border rounded outline-none focus:border-brand-orange"/>:c.phone}</td><td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${c.type==='Merchant'?'bg-amber-500/10 text-amber-400 border-amber-500/30':c.type==='Customer'?'bg-blue-500/10 text-blue-400 border-blue-500/30':c.type==='Agent'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/30':c.type==='Bank'?'bg-purple-500/10 text-purple-300 border-purple-500/30':'bg-brand-orange/10 text-brand-orange border-brand-orange/30'}`}>{c.type}</span></td><td className="py-2.5 px-4">{c.method?<span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{backgroundColor:`${METHOD_COLORS[c.method]}1a`,color:METHOD_COLORS[c.method],borderColor:`${METHOD_COLORS[c.method]}40`}}>{c.method}</span>:<span className="text-gray-500">—</span>}</td><td className="py-2.5 px-4 text-center"><div className="flex items-center justify-center space-x-1" onClick={(e)=>e.stopPropagation()}>{isE?<><button onClick={()=>{setContactPhones(prev=>prev.map(x=>x.id===c.id?{...x,name:editCtEditName||x.name,phone:editCtEditPhone||x.phone}:x));setEditingContact(null);}} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded cursor-pointer">✓</button><button onClick={()=>setEditingContact(null)} className="p-1.5 text-gray-400 hover:text-white cursor-pointer">✕</button></>:<><button onClick={()=>{setEditingContact(c.id);setEditCtEditName(c.name);setEditCtEditPhone(c.phone);}} className="p-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded cursor-pointer" title="Edit">✎</button><button onClick={()=>setContactPhones(prev=>prev.filter(x=>x.id!==c.id))} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded cursor-pointer" title="Delete"><X className="w-3 h-3" /></button><button onClick={()=>setContactPhones(prev=>prev.filter(x=>x.id!==c.id))} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded cursor-pointer" title="Delete"><X className="w-3 h-3" /></button></>}</div></td></tr>);})}</tbody></table></div></div>
        </div>
      )}

      {/* ================= 360° UNIFIED PROFILE ================= */}
      {tab === 'profile360' && (
        <div className="space-y-6 fade-in">
          <div className="bg-gradient-to-r from-brand-orange/15 via-brand-orange/5 to-transparent border border-brand-orange/30 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><UserRound className="w-5 h-5 text-brand-orange" /> 360° Unified Profile</h3>
            <p className="text-[11px] text-gray-400">Enter any phone number to see ALL linked data — Customer · Merchant · Agent · Bank · Wallet · Loans · Savings · Cards · Transactions</p>
            <div className="flex items-center space-x-3">
              <input type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="Enter phone number (e.g. 01712345678)..." className="flex-1 px-4 py-2.5 bg-brand-dark text-white text-sm border border-brand-border rounded-lg outline-none focus:border-brand-orange" />
              <button onClick={() => { if(!profilePhone.trim())return; }} className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-sm font-bold cursor-pointer">Search</button>
            </div>
            {profilePhone.trim() && (
              <div className="flex flex-wrap gap-2">
                {['01712345678','01812345679','01912345680','01612345681'].map(p=>(<button key={p} onClick={()=>setProfilePhone(p)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${profilePhone===p?'bg-brand-orange text-white border-brand-orange':'bg-brand-dark/40 text-gray-400 border-brand-border hover:text-white'}`}>{p}</button>))}
              </div>
            )}
          </div>

          {profilePhone.trim() && (() => {
            const cx = customers.filter(c => c.phone.includes(profilePhone));
            const ag = agents.filter(a => a.name.toLowerCase().includes(profilePhone) || a.id.includes(profilePhone));
            const bnk = bankAccounts.filter(b => b.contactPhone.includes(profilePhone) || b.accountNo.includes(profilePhone));
            const ct = contactPhones.filter(c => c.phone.includes(profilePhone));
            const tx = transactions.filter(t => t.counterparty.includes(profilePhone) || t.note.includes(profilePhone) || t.id.includes(profilePhone));
            const ln = loans.filter(l => l.phone.includes(profilePhone));
            const sv = savingsAccounts.filter(s => s.phone.includes(profilePhone));
            const cd = cards.filter(c => c.name.includes(profilePhone) || c.cardNumber.includes(profilePhone));
            const ins = policies.filter(p => p.phone.includes(profilePhone));
            const rem = remittances.filter(r => r.receiver.includes(profilePhone));
            const wals = wallets.filter(w => transactions.some(t => t.method === w.method && t.counterparty.includes(profilePhone)));
            return (<div className="space-y-6 fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5"><div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Total TX</p><p className="text-xl font-black text-white">{tx.length}</p></div><div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Total Volume</p><p className="text-xl font-black text-emerald-400">{formatBDT(tx.reduce((s,t)=>s+t.amount,0))}</p></div><div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Linked Accounts</p><p className="text-xl font-black text-brand-orange">{cx.length + bnk.length + ln.length + sv.length}</p></div><div className="bg-brand-card border border-brand-border p-4 rounded-xl"><p className="text-[10px] text-gray-400 uppercase font-black">Active Products</p><p className="text-xl font-black text-blue-400">{ln.filter(l=>l.status==='Active').length + sv.filter(s=>s.status==='Active').length + cd.filter(c=>c.status==='Active').length + ins.filter(i=>i.status==='Active').length}</p></div></div>
              {cx.length > 0 && <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Customer Profile ({cx.length})</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Name</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Phone</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Wallet</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Balance</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">KYC</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">LTV</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Segment</th></tr></thead><tbody className="divide-y divide-brand-border/30">{cx.map(c=>(<tr key={c.id} className="hover:bg-brand-dark/20"><td className="py-2.5 px-4 font-bold text-white">{c.name}</td><td className="py-2.5 px-4 font-mono text-gray-300">{c.phone}</td><td className="py-2.5 px-4">{c.method}</td><td className="py-2.5 px-4 font-mono text-white">{formatBDT(c.balance)}</td><td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${c.kycStatus==='Verified'?'bg-emerald-500/10 text-emerald-400':c.kycStatus==='Pending'?'bg-amber-500/10 text-amber-400':'bg-red-500/10 text-red-400'}`}>{c.kycStatus}</span></td><td className="py-2.5 px-4 font-mono text-brand-orange">{formatBDT(getCustomerLTV(c))}</td><td className="py-2.5 px-4">{(()=>{const s=getCustomerSegment(c,getCustomerLTV(c));return <span className="px-2 py-0.5 rounded-full text-[9px] font-black border" style={{color:s.color,borderColor:`${s.color}40`,backgroundColor:`${s.color}20`}}>{s.label}</span>;})()}</td></tr>))}</tbody></table></div></div>}
              {ag.length > 0 && <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Agent Profile</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Name</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Area</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Wallet</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Balance</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Commission</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Tier</th></tr></thead><tbody className="divide-y divide-brand-border/30">{ag.map(a=>(<tr key={a.id}><td className="py-2.5 px-4 font-bold text-white">{a.name}</td><td className="py-2.5 px-4 text-gray-300">{a.area}</td><td className="py-2.5 px-4">{a.method}</td><td className="py-2.5 px-4 font-mono text-white">{formatBDT(a.balance)}</td><td className="py-2.5 px-4 font-mono text-emerald-400">{formatBDT(a.commission)}</td><td className="py-2.5 px-4">{(()=>{const t=getAgentTier(a.commission,agents.map(x=>x.commission));return <span className="px-2 py-0.5 rounded-full text-[9px] font-black border" style={{color:t.color,borderColor:`${t.color}40`,backgroundColor:`${t.color}20`}}>{t.tier}</span>;})()}</td></tr>))}</tbody></table></div></div>}
              {bnk.length > 0 && <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Bank Accounts ({bnk.length})</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Bank</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">A/C</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Linked MFS</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Balance</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Type</th></tr></thead><tbody className="divide-y divide-brand-border/30">{bnk.map(b=>(<tr key={b.id}><td className="py-2.5 px-4 font-bold text-white">{b.bankName}</td><td className="py-2.5 px-4 font-mono text-gray-300">{b.accountNo}</td><td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{backgroundColor:`${METHOD_COLORS[b.linkedMethod]}1a`,color:METHOD_COLORS[b.linkedMethod],borderColor:`${METHOD_COLORS[b.linkedMethod]}40`}}>{b.linkedMethod}</span></td><td className="py-2.5 px-4 font-mono text-white">{formatBDT(b.balance)}</td><td className="py-2.5 px-4 text-gray-300">{b.accountType}</td></tr>))}</tbody></table></div></div>}
              {ln.length > 0 && <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Loans ({ln.length})</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Loan ID</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Principal</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Remaining</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{ln.map(l=>{const tp=l.principal+(l.principal*l.interestRate/100)*(l.termMonths/12);return(<tr key={l.id}><td className="py-2.5 px-4 font-mono font-bold text-gray-300">{l.id}</td><td className="py-2.5 px-4 font-mono text-white">{formatBDT(l.principal)}</td><td className="py-2.5 px-4 font-mono font-bold text-amber-400">{formatBDT(Math.max(0,tp-l.repaid))}</td><td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${l.status==='Active'?'bg-blue-500/10 text-blue-400':l.status==='Completed'?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>{l.status}</span></td></tr>);})}</tbody></table></div></div>}
              {sv.length > 0 && <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Savings</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Account</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Balance</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Interest</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Status</th></tr></thead><tbody className="divide-y divide-brand-border/30">{sv.map(s=>(<tr key={s.id}><td className="py-2.5 px-4 font-mono text-gray-300">{s.id}</td><td className="py-2.5 px-4 font-mono text-white">{formatBDT(s.balance)}</td><td className="py-2.5 px-4 font-mono text-emerald-400">{s.interestRate}%</td><td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${s.status==='Active'?'bg-emerald-500/10 text-emerald-400':s.status==='Matured'?'bg-amber-500/10 text-amber-400':'bg-red-500/10 text-red-400'}`}>{s.status}</span></td></tr>))}</tbody></table></div></div>}
              {tx.length > 0 && <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-brand-border/60"><h3 className="text-sm font-bold text-white">Transaction History ({tx.length})</h3></div><div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-brand-dark"><tr className="text-gray-400 border-b border-brand-border/40 bg-brand-dark/40"><th className="py-2.5 px-4 font-bold uppercase text-[10px]">TX ID</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Type</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Method</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Amount</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Counterparty</th><th className="py-2.5 px-4 font-bold uppercase text-[10px]">Date</th></tr></thead><tbody className="divide-y divide-brand-border/30">{tx.slice(0,20).map(t=>(<tr key={t.id}><td className="py-2.5 px-4 font-mono font-bold text-gray-300">{t.id}</td><td className="py-2.5 px-4">{txTypeBadge(t.type)}</td><td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{backgroundColor:`${METHOD_COLORS[t.method]}1a`,color:METHOD_COLORS[t.method],borderColor:`${METHOD_COLORS[t.method]}40`}}>{t.method}</span></td><td className="py-2.5 px-4 font-mono font-bold text-white">{formatBDT(t.amount)}</td><td className="py-2.5 px-4 text-gray-300">{t.counterparty}</td><td className="py-2.5 px-4 text-gray-400">{t.date}</td></tr>))}</tbody></table></div></div>}
              {cx.length===0 && ag.length===0 && bnk.length===0 && ct.length===0 && <div className="py-10 text-center text-gray-500 text-xs">No data found for this phone number.</div>}
            </div>);
          })()}
        </div>
      )}
      {/* Card Detail Modal */}
      {showCardDetail && (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowCardDetail(null)}><div className="max-w-md w-full" onClick={e=>e.stopPropagation()}>
        <div className="rounded-2xl p-6 shadow-2xl min-h-[200px]" style={{background:showCardDetail.method.includes('Visa')?'linear-gradient(135deg,#1a1f71,#2563eb)':showCardDetail.method.includes('Rocket')?'linear-gradient(135deg,#8c3494,#ab47bc)':`linear-gradient(135deg,${METHOD_COLORS[showCardDetail.method]||'#1e293b'},#0f172a)`}}>
          <div className="flex items-center justify-between"><div className="w-10 h-7 bg-yellow-400/80 rounded-[3px] flex items-center justify-center"><span className="text-[7px] font-black text-yellow-700">CHIP</span></div><p className="text-2xl font-black italic tracking-tighter text-white/90" style={{fontFamily:'serif'}}>{showCardDetail.method.includes('Visa')?'VISA':showCardDetail.method.includes('Master')?'Mastercard':'NexaGo'}</p></div>
          <p className="font-mono font-black text-white text-2xl tracking-[0.3em] mt-4">{showCardDetail.cardNumber}</p>
          <div className="flex items-center justify-between mt-4"><div><p className="text-[9px] text-white/50 uppercase">Holder</p><p className="text-sm font-bold text-white uppercase">{showCardDetail.name}</p></div><div className="text-right"><p className="text-[9px] text-white/50 uppercase">Expiry</p><p className="text-sm font-mono font-bold text-white">{showCardDetail.expiry}</p></div></div>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-xl mt-3 p-4 space-y-2">
          <div className="flex justify-between text-xs"><span className="text-gray-400">Limit</span><span className="font-mono text-white">{formatBDT(showCardDetail.limit)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-gray-400">Spent</span><span className="font-mono text-amber-400">{formatBDT(showCardDetail.spent)}</span></div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full bg-brand-orange" style={{width:`${Math.min(100,(showCardDetail.spent/showCardDetail.limit)*100)}%`}}></div></div>
          <button onClick={()=>setShowCardDetail(null)} className="w-full py-2 bg-brand-orange text-white rounded-lg text-xs font-bold cursor-pointer">Close</button>
        </div>
      </div></div>)}
    </div>
  );
}









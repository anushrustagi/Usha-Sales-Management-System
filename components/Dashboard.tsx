
import React, { useMemo, useState } from 'react';
import { AppData, ViewType, WalkInRecord, Transaction, Customer } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  IndianRupee, TrendingUp, Users, ShoppingCart, Store, Plus, Minus, ShieldCheck, AlertTriangle, FileText, HandCoins, BarChart3, ChevronRight, Zap, PackagePlus, FilePlus, ShoppingBag, Briefcase, Activity, Truck, Phone, MessageSquare, AlertCircle, ArrowUpRight, CheckCircle2, Wallet as WalletIcon, BellRing, CalendarClock, PiggyBank, ArrowDownRight, Tag
} from 'lucide-react';

interface DashboardProps {
  data: AppData;
  setActiveView: (view: ViewType, filter: string | null) => void;
  updateData: (newData: Partial<AppData>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, setActiveView, updateData }) => {
  const [tally, setTally] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');

  const stats = useMemo(() => {
    const salesInvoices = data.invoices.filter(i => i.type === 'SALE' && (i.subType === 'TAX_INVOICE' || !i.subType));
    const totalSales = salesInvoices.reduce((acc, curr) => acc + curr.grandTotal, 0);
    
    // Payment Collected = Actual amount paid in Sales invoices + Direct CREDIT transactions
    const paymentCollected = data.invoices.filter(i => i.type === 'SALE').reduce((acc, i) => acc + i.amountPaid, 0) +
                             data.transactions.filter(t => t.type === 'CREDIT' && t.category === 'Payment').reduce((acc, t) => acc + t.amount, 0);

    // Payment Given = Actual amount paid in Purchase invoices + Direct DEBIT transactions
    const paymentGiven = data.invoices.filter(i => i.type === 'PURCHASE').reduce((acc, i) => acc + i.amountPaid, 0) +
                         data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').reduce((acc, t) => acc + t.amount, 0);

    const lowStockItems = data.products.filter(p => p.stock <= p.minStockAlert);
    
    return { totalSales, paymentCollected, paymentGiven, lowStockItems };
  }, [data]);

  const topDebtors = useMemo(() => {
    return data.customers
      .filter(c => c.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .slice(0, 5);
  }, [data.customers]);

  const totalOutstanding = useMemo(() => {
    return data.customers.reduce((acc, c) => acc + (c.outstandingBalance > 0 ? c.outstandingBalance : 0), 0);
  }, [data.customers]);

  const salesTrendData = useMemo(() => {
    const last10 = data.invoices.filter(i => i.type === 'SALE').slice(-10).map(i => ({
      date: new Date(i.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      amount: i.grandTotal
    }));
    return last10;
  }, [data]);

  const handleLogWalkIn = () => {
    if (tally === 0 && !remarks && !productName) return;
    const newRecord: WalkInRecord = { 
      id: Math.random().toString(36).substr(2, 9), 
      date: new Date().toISOString(), 
      count: tally, 
      remarks: remarks || 'Walk-in visitor',
      productName: productName || undefined,
      price: price ? Number(price) : undefined
    };
    updateData({ walkInRecords: [newRecord, ...data.walkInRecords] });
    setTally(0);
    setRemarks('');
    setProductName('');
    setPrice('');
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="text-blue-600 text-xs font-black uppercase tracking-[0.3em]">Operational Command Center</p>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
             Welcome, Administrator
             <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Vault Active</span>
             </div>
          </h2>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setActiveView(ViewType.SALES, null)} className="px-8 py-4 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3">
              <Plus size={18} strokeWidth={3} /> New Sale
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Revenue (Net)" 
          value={stats.totalSales} 
          icon={<IndianRupee className="text-blue-600" />} 
          trend="Master Ledger" 
          trendUp={true} 
          onClick={() => setActiveView(ViewType.ACCOUNTING, 'REVENUE')} 
        />
        <StatCard 
          title="Payment Collected" 
          value={stats.paymentCollected} 
          icon={<ArrowUpRight className="text-emerald-600" />} 
          trend="Cash Inflow" 
          trendUp={true} 
          onClick={() => setActiveView(ViewType.ACCOUNTING, 'COLLECTED')} 
        />
        <StatCard 
          title="Payment Given" 
          value={stats.paymentGiven} 
          icon={<ArrowDownRight className="text-rose-600" />} 
          trend="Cash Outflow" 
          trendUp={false} 
          onClick={() => setActiveView(ViewType.ACCOUNTING, 'GIVEN')} 
        />
        <StatCard 
          title="Stock Alerts" 
          value={stats.lowStockItems.length} 
          icon={<AlertTriangle className="text-amber-600" />} 
          trend="Inventory Audit" 
          trendUp={false} 
          isCurrency={false}
          highlight={stats.lowStockItems.length > 0}
          onClick={() => setActiveView(ViewType.INVENTORY, "LOW_STOCK")} 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <Zap className="text-amber-500 w-5 h-5 fill-amber-500" />
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Commercial Launchpad</h3>
              </div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Optimized Workflow</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ActionCard title="B2B Invoice" subtitle="Full GST Commercial Sale" icon={<Briefcase className="w-7 h-7" />} color="blue" onClick={() => setActiveView(ViewType.SALES, null)} />
              <ActionCard title="Inward Stock" subtitle="Supplier Procurement" icon={<Truck className="w-7 h-7" />} color="emerald" onClick={() => setActiveView(ViewType.PURCHASES, null)} />
              <ActionCard title="Retail POS" subtitle="Quick Walk-in Cash Sale" icon={<ShoppingBag className="w-7 h-7" />} color="amber" onClick={() => setActiveView(ViewType.SALES, null)} />
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-12">
               <div>
                 <h3 className="font-black text-slate-900 text-2xl tracking-tighter">Business Velocity</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Historical Revenue Pull-through</p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                     <span className="text-[9px] font-black text-slate-400 uppercase">Settled Sales</span>
                  </div>
               </div>
             </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontSize: '12px', fontWeight: 'bold', padding: '16px' }} 
                  />
                  <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={5} fillOpacity={1} fill="url(#colorAmt)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-rose-50 border border-rose-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-rose-100/50 group">
            <div className="p-10 bg-slate-900 text-white relative overflow-hidden">
               <div className="relative z-10 flex justify-between items-center">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-400">Credit Recall</h3>
                    <p className="text-3xl font-black tracking-tighter tabular-nums">₹{totalOutstanding.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-[1.5rem] backdrop-blur-md group-hover:scale-110 transition-transform"><AlertCircle size={32} className="text-rose-500" /></div>
               </div>
               <div className="absolute -bottom-12 -right-12 opacity-5 pointer-events-none transform rotate-12"><Activity size={200} /></div>
            </div>
            <div className="p-8 space-y-5 bg-white">
               {topDebtors.length > 0 ? topDebtors.map(debtor => (
                 <div key={debtor.id} className="p-5 rounded-2xl border border-slate-50 bg-slate-50/30 flex items-center justify-between group/item hover:border-rose-200 hover:bg-rose-50/20 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 border border-slate-100 flex items-center justify-center font-black text-sm group-hover/item:bg-blue-600 group-hover/item:text-white group-hover/item:border-blue-600 transition-all shadow-sm">{debtor.name.charAt(0)}</div>
                       <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">{debtor.name}</p>
                          <p className="text-[10px] font-black text-rose-500 tabular-nums mt-1">₹{debtor.outstandingBalance.toLocaleString()}</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setActiveView(ViewType.CRM, debtor.name)}
                      className="p-3 bg-white text-slate-400 rounded-xl hover:text-blue-600 shadow-sm border border-slate-100 group-hover/item:border-blue-100 transition-all"
                    >
                       <ArrowUpRight size={18} strokeWidth={3} />
                    </button>
                 </div>
               )) : (
                 <div className="py-12 text-center">
                    <div className="p-5 bg-emerald-50 rounded-full inline-block mb-4"><CheckCircle2 size={32} className="text-emerald-500" /></div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">All Master Ledgers Settled</p>
                 </div>
               )}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-10">
               <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.3em] flex items-center gap-3">
                 <Users size={18} className="text-blue-600" /> Walk-in Analytics
               </h3>
               <button onClick={() => setActiveView(ViewType.WALKIN_REPORTS, null)} className="p-2 bg-slate-50 text-slate-300 rounded-lg hover:text-blue-600 transition-all"><ChevronRight size={16} /></button>
            </div>
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center gap-12 py-4 w-full">
                <button onClick={() => setTally(Math.max(0, tally - 1))} className="w-14 h-14 flex items-center justify-center bg-slate-50 text-slate-300 rounded-2xl hover:bg-slate-100 active:scale-90 transition-all border border-slate-100"><Minus size={24} strokeWidth={3}/></button>
                <div className="flex flex-col items-center">
                   <span className="text-7xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">{tally}</span>
                   <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">New Entries</span>
                </div>
                <button onClick={() => setTally(tally + 1)} className="w-14 h-14 flex items-center justify-center bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100 active:scale-90 transition-all"><Plus size={24} strokeWidth={3}/></button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Interested Product</label>
                   <div className="relative">
                      <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="text" placeholder="e.g. MS Pipe" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-50 focus:border-blue-100 focus:bg-white rounded-xl text-xs font-bold outline-none transition-all uppercase" value={productName} onChange={(e) => setProductName(e.target.value)} />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quote / Budget</label>
                   <div className="relative">
                      <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="number" placeholder="0.00" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-50 focus:border-blue-100 focus:bg-white rounded-xl text-xs font-bold outline-none transition-all" value={price} onChange={(e) => setPrice(e.target.value)} />
                   </div>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observation Remarks</label>
                 <input type="text" placeholder="Visitor demands or specific SKU inquiry..." className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-blue-100 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all uppercase" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
              
              <button onClick={handleLogWalkIn} className="w-full py-6 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-[1.8rem] shadow-2xl shadow-slate-200 active:scale-95 transition-all">Synchronize Daily Tally</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionCard = ({ title, subtitle, icon, color, onClick }: any) => {
  const themes: any = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100',
    slate: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
  };
  return (
    <button onClick={onClick} className={`${themes[color]} p-8 rounded-[2.5rem] flex flex-col items-start gap-6 transition-all hover:-translate-y-2 active:scale-95 shadow-2xl text-left group h-full`}>
      <div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform shadow-inner">{icon}</div>
      <div>
        <h4 className="font-black text-base uppercase tracking-widest">{title}</h4>
        <p className="text-[10px] opacity-70 font-bold mt-2 uppercase tracking-tighter">{subtitle}</p>
      </div>
      <div className="mt-auto w-full flex justify-end">
         <ArrowUpRight size={20} className="opacity-40 group-hover:opacity-100 transition-all" />
      </div>
    </button>
  );
};

const StatCard = ({ title, value, icon, trend, trendUp, isCurrency = true, highlight = false, onClick }: any) => (
  <div onClick={onClick} className={`bg-white p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer group flex flex-col h-full ${highlight ? 'border-rose-200 ring-4 ring-rose-50 shadow-xl' : 'border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 hover:-translate-y-1'}`}>
    <div className="flex items-center justify-between mb-8">
      <div className={`p-3.5 rounded-2xl transition-colors shadow-inner ${highlight ? 'bg-rose-50' : 'bg-slate-50 group-hover:bg-blue-50'}`}>{icon}</div>
      <div className={`text-[9px] font-black px-3 py-1 rounded-xl uppercase tracking-widest border transition-all ${highlight ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'}`}>
        {trend}
      </div>
    </div>
    <div className="mt-auto">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">{title}</p>
      <p className={`text-4xl font-black tracking-tighter tabular-nums ${highlight ? 'text-rose-600' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>{isCurrency ? '₹' : ''}{value.toLocaleString('en-IN')}</p>
    </div>
  </div>
);

export default Dashboard;

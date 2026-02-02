
import React, { useMemo, useState, useEffect } from 'react';
import { AppData, Invoice, Transaction } from '../types';
import { FileText, ArrowRightLeft, Landmark, DollarSign, Wallet, Printer, ShieldCheck, ChevronRight, Activity, TrendingUp, TrendingDown, FileSpreadsheet, X, Eye, Calculator, LayoutDashboard, Scale, Briefcase } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AccountingProps {
  data: AppData;
  initialFilter?: string | null;
}

type DrillDownView = 'REVENUE' | 'PURCHASES' | 'EXPENSES' | 'PROFIT' | 'COLLECTED' | 'GIVEN' | null;
type ReportTab = 'GENERAL' | 'PL' | 'BALANCE_SHEET';

interface UnifiedLedgerEntry {
  id: string;
  date: string;
  description: string;
  ref: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
}

const Accounting: React.FC<AccountingProps> = ({ data, initialFilter }) => {
  const [detailView, setDetailView] = useState<DrillDownView>(null);
  const [activeReport, setActiveReport] = useState<ReportTab>('GENERAL');

  useEffect(() => {
    if (initialFilter) {
       if (initialFilter === 'REVENUE') setDetailView('REVENUE');
       else if (initialFilter === 'PURCHASES') setDetailView('PURCHASES');
       else if (initialFilter === 'EXPENSES') setDetailView('EXPENSES');
       else if (initialFilter === 'COLLECTED') setDetailView('COLLECTED');
       else if (initialFilter === 'GIVEN') setDetailView('GIVEN');
    }
  }, [initialFilter]);

  const stats = useMemo(() => {
    const revenue = data.invoices.filter(i => i.type === 'SALE').reduce((acc, i) => acc + i.grandTotal, 0);
    const purchases = data.invoices.filter(i => i.type === 'PURCHASE').reduce((acc, i) => acc + i.grandTotal, 0);
    const expenses = data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').reduce((acc, t) => acc + t.amount, 0);
    const profit = revenue - purchases - expenses;

    const stockValue = data.products.reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0);
    const debtors = data.customers.reduce((acc, c) => acc + Math.max(0, c.outstandingBalance), 0);
    const creditors = data.suppliers.reduce((acc, s) => acc + Math.max(0, s.outstandingBalance), 0);
    const netCash = data.transactions.reduce((acc, t) => acc + (t.type === 'CREDIT' ? t.amount : -t.amount), 0);

    return { revenue, purchases, expenses, profit, stockValue, debtors, creditors, netCash };
  }, [data]);

  const handlePrintLedger = () => {
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const exportToExcel = () => {
    const exportData = data.transactions.map(t => ({
      'Date': new Date(t.date).toLocaleDateString(),
      'Category': t.category,
      'Description': t.description,
      'Type': t.type,
      'Debit (-)': t.type === 'DEBIT' ? t.amount : 0,
      'Credit (+)': t.type === 'CREDIT' ? t.amount : 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'General Ledger');
    XLSX.writeFile(workbook, `Usha_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const detailRecords = useMemo(() => {
    if (detailView === 'REVENUE') return data.invoices.filter(i => i.type === 'SALE').slice().reverse();
    if (detailView === 'PURCHASES') return data.invoices.filter(i => i.type === 'PURCHASE').slice().reverse();
    if (detailView === 'EXPENSES') return data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').slice().reverse();
    
    if (detailView === 'COLLECTED') {
      const entries: UnifiedLedgerEntry[] = [];
      data.invoices.filter(i => i.type === 'SALE' && i.amountPaid > 0).forEach(i => {
        entries.push({ id: i.id, date: i.date, description: `Receipt: ${i.partyName}`, ref: i.invoiceNo, amount: i.amountPaid, type: 'CREDIT', category: 'Sale' });
      });
      data.transactions.filter(t => t.type === 'CREDIT' && t.category === 'Payment').forEach(t => {
        entries.push({ id: t.id, date: t.date, description: t.description, ref: 'TX', amount: t.amount, type: 'CREDIT', category: 'Payment' });
      });
      return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    if (detailView === 'GIVEN') {
      const entries: UnifiedLedgerEntry[] = [];
      data.invoices.filter(i => i.type === 'PURCHASE' && i.amountPaid > 0).forEach(i => {
        entries.push({ id: i.id, date: i.date, description: `Settlement: ${i.partyName}`, ref: i.invoiceNo, amount: i.amountPaid, type: 'DEBIT', category: 'Purchase' });
      });
      data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').forEach(t => {
        entries.push({ id: t.id, date: t.date, description: t.description, ref: 'TX', amount: t.amount, type: 'DEBIT', category: t.category });
      });
      return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [];
  }, [detailView, data.invoices, data.transactions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; background: white !important; padding: 0 !important; margin: 0 !important; }
          .no-print, header, aside, nav, button { display: none !important; visibility: hidden !important; }
          #root, main, #root > div { display: block !important; position: static !important; width: 100% !important; overflow: visible !important; height: auto !important; padding: 0 !important; margin: 0 !important; }
          #printable-report { display: block !important; visibility: visible !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20mm !important; margin: 0 !important; background: white !important; border: none !important; box-shadow: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-report * { visibility: visible !important; }
          @page { margin: 0; size: auto; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print">
         <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm">
            <button onClick={() => setActiveReport('GENERAL')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'GENERAL' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>Transactions</button>
            <button onClick={() => setActiveReport('PL')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'PL' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>Profit & Loss</button>
            <button onClick={() => setActiveReport('BALANCE_SHEET')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'BALANCE_SHEET' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>Balance Sheet</button>
         </div>
         <div className="flex gap-4">
            <button onClick={exportToExcel} className="px-6 py-4 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-2xl uppercase tracking-widest border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2"><FileSpreadsheet size={18} /> Export .xlsx</button>
            <button onClick={handlePrintLedger} className="px-6 py-4 bg-white border-2 border-slate-100 hover:border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 transition-all flex items-center gap-3 uppercase tracking-widest shadow-sm"><Printer size={18} className="text-blue-600" /> Print Report</button>
         </div>
      </div>

      <div id="printable-report">
        <div className="hidden print:block mb-12 border-b-4 border-slate-900 pb-10">
           <div className="flex justify-between items-start">
              <div>
                 <h1 className="text-4xl font-black uppercase tracking-tighter">{data.companyProfile.name}</h1>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{data.companyProfile.address}</p>
                 <p className="text-xs font-black text-blue-600 uppercase mt-1">GSTIN: {data.companyProfile.gstin}</p>
              </div>
              <div className="text-right">
                 <h2 className="text-2xl font-black uppercase tracking-widest text-slate-400">
                    {activeReport === 'PL' ? 'Profit & Loss Statement' : activeReport === 'BALANCE_SHEET' ? 'Balance Sheet Snapshot' : 'General Ledger Audit'}
                 </h2>
                 <p className="text-[10px] font-black text-slate-500 uppercase mt-2">FY {new Date().getFullYear()} - Period Real-time</p>
              </div>
           </div>
        </div>

        {activeReport === 'GENERAL' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 no-print">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl"><FileText size={24}/></div>
                  <div><h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{detailView ? detailView.replace('_', ' ') + ' Detail' : 'Master Transaction Log'}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">General Ledger View</p></div>
                </div>
                {detailView && <button onClick={() => setDetailView(null)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>}
              </div>
              <div className="overflow-x-auto flex-1">
                {detailView ? (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                      <tr><th className="px-8 py-6">Date</th><th className="px-6 py-6">Entity/Description</th><th className="px-6 py-6 text-center">Reference</th><th className="px-8 py-6 text-right">Value (₹)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailRecords.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(entry.date).toLocaleDateString()}</td>
                          <td className="px-6 py-5 text-xs font-black text-slate-700 uppercase">{entry.partyName || entry.description}</td>
                          <td className="px-6 py-5 text-center"><span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">{entry.invoiceNo || entry.ref || 'DIR'}</span></td>
                          <td className={`px-8 py-5 text-right font-black text-base tabular-nums ${entry.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>₹{entry.grandTotal?.toLocaleString() || entry.amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                      <tr><th className="px-8 py-6">Timeline</th><th className="px-6 py-6">Description</th><th className="px-6 py-6 text-center">Category</th><th className="px-6 py-6 text-right">Debit (-)</th><th className="px-8 py-6 text-right">Credit (+)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.transactions.slice().reverse().map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5"><span className="font-black text-slate-600 text-xs tabular-nums">{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span></td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-700 uppercase truncate max-w-xs">{t.description}</td>
                          <td className="px-6 py-5 text-center"><span className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-slate-400 font-black text-[8px] uppercase tracking-widest">{t.category}</span></td>
                          <td className="px-6 py-5 text-right text-rose-600 font-black tabular-nums text-xs">{t.type === 'DEBIT' ? `₹${t.amount.toLocaleString()}` : '—'}</td>
                          <td className="px-8 py-5 text-right text-emerald-600 font-black tabular-nums text-xs">{t.type === 'CREDIT' ? `₹${t.amount.toLocaleString()}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="space-y-6 no-print">
               <AccountStatCard title="Total Revenue" amount={stats.revenue} color="blue" icon={<DollarSign size={20}/>} active={detailView === 'REVENUE'} onClick={() => setDetailView('REVENUE')} />
               <AccountStatCard title="Procurement Spend" amount={stats.purchases} color="rose" icon={<ArrowRightLeft size={20}/>} active={detailView === 'PURCHASES'} onClick={() => setDetailView('PURCHASES')} />
               <AccountStatCard title="Indirect Expenses" amount={stats.expenses} color="amber" icon={<Wallet size={20}/>} active={detailView === 'EXPENSES'} onClick={() => setDetailView('EXPENSES')} />
               <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6 border border-white/5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Financial Summary</h4>
                  <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Retained Earnings</p><p className={`text-4xl font-black tracking-tighter ${stats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>₹{stats.profit.toLocaleString()}</p></div>
                  <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-6"><div onClick={() => setDetailView('COLLECTED')} className="cursor-pointer group"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-white transition-colors">Inflow</p><p className="text-sm font-black text-emerald-400">₹{(stats.revenue).toLocaleString()}</p></div><div onClick={() => setDetailView('GIVEN')} className="cursor-pointer group"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-white transition-colors">Outflow</p><p className="text-sm font-black text-rose-400">₹{(stats.purchases + stats.expenses).toLocaleString()}</p></div></div>
               </div>
            </div>
          </div>
        )}

        {activeReport === 'PL' && (
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-12 max-w-4xl mx-auto space-y-12">
            <div className="flex items-center gap-6 border-b pb-10">
               <div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl"><Calculator size={32}/></div>
               <div><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Profit & Loss</h3><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Period Revenue vs operational burn</p></div>
            </div>
            <div className="space-y-8">
               <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">Operating Revenue</h4>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50 font-bold text-sm"><span>Sales Income (Net GST)</span><span className="font-black">₹{stats.revenue.toLocaleString()}</span></div>
               </div>
               <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em] border-l-4 border-rose-600 pl-4">Cost of Goods Sold (COGS)</h4>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50 text-sm"><span>Purchases</span><span className="font-bold text-rose-500">₹{stats.purchases.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50 font-black text-sm"><span>Total Direct Costs</span><span>(₹{stats.purchases.toLocaleString()})</span></div>
               </div>
               <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.3em] border-l-4 border-amber-600 pl-4">Indirect Expenses</h4>
                  {Array.from(new Set(data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').map(t => t.category))).map(cat => {
                    const amt = data.transactions.filter(t => t.category === cat && t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0);
                    return <div key={cat} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm italic"><span>{cat}</span><span>₹{amt.toLocaleString()}</span></div>
                  })}
               </div>
               <div className="pt-10 border-t-4 border-slate-900 flex justify-between items-end">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Bottom Line</p><p className="text-2xl font-black uppercase text-slate-900 tracking-tighter">Net Profit / Surplus</p></div>
                  <p className={`text-5xl font-black tabular-nums tracking-tighter ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{stats.profit.toLocaleString()}</p>
               </div>
            </div>
          </div>
        )}

        {activeReport === 'BALANCE_SHEET' && (
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-12 max-w-4xl mx-auto space-y-12">
            <div className="flex items-center gap-6 border-b pb-10">
               <div className="p-5 bg-emerald-600 text-white rounded-[2rem] shadow-xl"><Scale size={32}/></div>
               <div><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Balance Sheet</h3><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Snapshot of corporate assets & liabilities</p></div>
            </div>
            <div className="grid grid-cols-2 gap-16">
               <div className="space-y-8">
                  <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] border-b-2 border-emerald-100 pb-3">Current Assets</h4>
                  <div className="space-y-5">
                     <div className="flex justify-between text-sm italic"><span>Closing Stock (Valuation)</span><span className="font-bold">₹{stats.stockValue.toLocaleString()}</span></div>
                     <div className="flex justify-between text-sm italic"><span>Accounts Receivable (Debtors)</span><span className="font-bold">₹{stats.debtors.toLocaleString()}</span></div>
                     <div className="flex justify-between text-sm italic"><span>Cash & Bank Equiv.</span><span className="font-bold">₹{stats.netCash.toLocaleString()}</span></div>
                     <div className="pt-5 border-t border-slate-100 flex justify-between font-black text-base text-slate-900"><span>Total Assets</span><span>₹{(stats.stockValue + stats.debtors + stats.netCash).toLocaleString()}</span></div>
                  </div>
               </div>
               <div className="space-y-8">
                  <h4 className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em] border-b-2 border-rose-100 pb-3">Liabilities & Capital</h4>
                  <div className="space-y-5">
                     <div className="flex justify-between text-sm italic"><span>Accounts Payable (Creditors)</span><span className="font-bold">₹{stats.creditors.toLocaleString()}</span></div>
                     <div className="flex justify-between text-sm italic"><span>Accumulated Earnings</span><span className="font-bold">₹{stats.profit.toLocaleString()}</span></div>
                     <div className="pt-5 border-t border-slate-100 flex justify-between font-black text-base text-slate-900"><span>Total Equities</span><span>₹{(stats.creditors + stats.profit).toLocaleString()}</span></div>
                  </div>
               </div>
            </div>
            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 text-center space-y-2">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Integrated Accounting Check</p>
               <div className="flex items-center justify-center gap-3"><ShieldCheck className="text-emerald-500" size={20}/><span className="text-lg font-black text-slate-800 uppercase tracking-tighter">Vault Ledger In-Balance</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AccountStatCard = ({ title, amount, color, icon, active = false, onClick }: any) => {
  const themes: Record<string, any> = {
    blue: 'border-blue-100 bg-blue-50 text-blue-600',
    rose: 'border-rose-100 bg-rose-50 text-rose-600',
    amber: 'border-amber-100 bg-amber-50 text-amber-600'
  };
  return (
    <div onClick={onClick} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 ${active ? themes[color] + ' shadow-xl' : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'}`}>
       <div className="flex justify-between items-center mb-6">
          <p className={`text-[10px] font-black uppercase tracking-widest ${active ? '' : 'text-slate-400'}`}>{title}</p>
          <div className={`p-2.5 rounded-xl ${active ? 'bg-white/20' : 'bg-slate-50'}`}>{icon}</div>
       </div>
       <p className={`text-2xl font-black tabular-nums tracking-tighter ${active ? '' : 'text-slate-900'}`}>₹{amount.toLocaleString()}</p>
    </div>
  );
};

export default Accounting;

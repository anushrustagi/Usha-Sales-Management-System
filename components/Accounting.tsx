
import React, { useMemo, useState, useEffect } from 'react';
import { AppData, Invoice, Transaction } from '../types';
import { FileText, ArrowRightLeft, Landmark, DollarSign, Wallet, Printer, ShieldCheck, ChevronRight, Activity, TrendingUp, TrendingDown, FileSpreadsheet, X, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AccountingProps {
  data: AppData;
  initialFilter?: string | null;
}

type DrillDownView = 'REVENUE' | 'PURCHASES' | 'EXPENSES' | 'PROFIT' | 'COLLECTED' | 'GIVEN' | null;

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

  useEffect(() => {
    if (initialFilter === 'REVENUE') setDetailView('REVENUE');
    else if (initialFilter === 'PURCHASES') setDetailView('PURCHASES');
    else if (initialFilter === 'EXPENSES') setDetailView('EXPENSES');
    else if (initialFilter === 'COLLECTED') setDetailView('COLLECTED');
    else if (initialFilter === 'GIVEN') setDetailView('GIVEN');
  }, [initialFilter]);

  const accountStats = useMemo(() => {
    const revenue = data.invoices.filter(i => i.type === 'SALE').reduce((acc, i) => acc + i.grandTotal, 0);
    const purchases = data.invoices.filter(i => i.type === 'PURCHASE').reduce((acc, i) => acc + i.grandTotal, 0);
    const expenses = data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').reduce((acc, t) => acc + t.amount, 0);
    const profit = revenue - purchases - expenses;
    
    return { revenue, purchases, expenses, profit };
  }, [data]);

  const handlePrintLedger = () => {
    window.print();
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
    XLSX.writeFile(workbook, `Usha_Ledger_Statement_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const detailRecords = useMemo(() => {
    if (detailView === 'REVENUE') return data.invoices.filter(i => i.type === 'SALE').slice().reverse();
    if (detailView === 'PURCHASES') return data.invoices.filter(i => i.type === 'PURCHASE').slice().reverse();
    if (detailView === 'EXPENSES') return data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').slice().reverse();
    
    if (detailView === 'COLLECTED') {
      const entries: UnifiedLedgerEntry[] = [];
      data.invoices.filter(i => i.type === 'SALE' && i.amountPaid > 0).forEach(i => {
        entries.push({
          id: i.id, date: i.date, description: `Receipt from ${i.partyName}`, ref: i.invoiceNo,
          amount: i.amountPaid, type: 'CREDIT', category: 'Sale'
        });
      });
      data.transactions.filter(t => t.type === 'CREDIT' && t.category === 'Payment').forEach(t => {
        entries.push({
          id: t.id, date: t.date, description: t.description, ref: 'Direct-TX',
          amount: t.amount, type: 'CREDIT', category: 'Payment'
        });
      });
      return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    if (detailView === 'GIVEN') {
      const entries: UnifiedLedgerEntry[] = [];
      data.invoices.filter(i => i.type === 'PURCHASE' && i.amountPaid > 0).forEach(i => {
        entries.push({
          id: i.id, date: i.date, description: `Settlement to ${i.partyName}`, ref: i.invoiceNo,
          amount: i.amountPaid, type: 'DEBIT', category: 'Purchase'
        });
      });
      data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').forEach(t => {
        entries.push({
          id: t.id, date: t.date, description: t.description, ref: 'Direct-TX',
          amount: t.amount, type: 'DEBIT', category: t.category
        });
      });
      return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return [];
  }, [detailView, data.invoices, data.transactions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <style>{`
        @media print {
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            background: white !important;
          }
          .no-print, header, aside, nav { 
            display: none !important; 
            visibility: hidden !important;
          }
          #root, #root > div, main { 
            display: block !important; 
            height: auto !important; 
            overflow: visible !important; 
            padding: 0 !important;
            margin: 0 !important;
            position: static !important;
          }
          #printable-ledger { 
            display: block !important; 
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20mm !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          #printable-ledger * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <AccountStatCard 
          title="Total Revenue" 
          amount={accountStats.revenue} 
          color="blue" 
          icon={<DollarSign size={24}/>} 
          active={detailView === 'REVENUE'}
          onClick={() => setDetailView(detailView === 'REVENUE' ? null : 'REVENUE')}
        />
        <AccountStatCard 
          title="Stock Spend" 
          amount={accountStats.purchases} 
          color="rose" 
          icon={<ArrowRightLeft size={24}/>} 
          active={detailView === 'PURCHASES'}
          onClick={() => setDetailView(detailView === 'PURCHASES' ? null : 'PURCHASES')}
        />
        <AccountStatCard 
          title="Indirect Costs" 
          amount={accountStats.expenses} 
          color="amber" 
          icon={<Wallet size={24}/>} 
          active={detailView === 'EXPENSES'}
          onClick={() => setDetailView(detailView === 'EXPENSES' ? null : 'EXPENSES')}
        />
        <AccountStatCard 
          title="Master Surplus" 
          amount={accountStats.profit} 
          color="emerald" 
          icon={<Landmark size={24}/>} 
          onClick={() => setDetailView(null)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div id="printable-ledger" className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 no-print">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl"><FileText size={24}/></div>
               <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">
                    {detailView === 'COLLECTED' ? 'Cash Receipt Ledger' : 
                     detailView === 'GIVEN' ? 'Cash Payment Ledger' :
                     detailView ? `${detailView.replace('_', ' ')} Audit Log` : 
                     'Corporate General Ledger'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Transaction Audit</p>
               </div>
            </div>
            <div className="flex gap-3">
              {detailView && (
                <button onClick={() => setDetailView(null)} className="px-6 py-3.5 bg-white border-2 border-rose-100 text-rose-600 rounded-2xl text-[11px] font-black flex items-center gap-2 uppercase tracking-widest hover:bg-rose-50 transition-all">
                  <X size={16} /> Exit Analysis
                </button>
              )}
              <button onClick={exportToExcel} className="px-6 py-3.5 bg-emerald-600 text-white text-[11px] font-black rounded-2xl flex items-center gap-3 uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-all">
                <FileSpreadsheet size={18} /> Spreadsheet
              </button>
              <button onClick={handlePrintLedger} className="px-6 py-3.5 bg-white border-2 border-slate-100 hover:border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 transition-all flex items-center gap-3 uppercase tracking-widest shadow-sm">
                <Printer size={18} className="text-blue-600" /> Print
              </button>
            </div>
          </div>
          
          <div className="hidden print:block mb-12 border-b-4 border-slate-900 pb-8 text-center">
             <h1 className="text-4xl font-black uppercase tracking-tighter">{data.companyProfile.name}</h1>
             <p className="text-xs font-black uppercase text-slate-500 tracking-[0.3em] mt-3">Universal Ledger Audit — Statement of Account</p>
          </div>

          <div className="overflow-x-auto flex-1">
            {detailView === 'COLLECTED' || detailView === 'GIVEN' ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6">Date</th>
                    <th className="px-6 py-6">Description</th>
                    <th className="px-6 py-6 text-center">Ref #</th>
                    <th className={`px-8 py-6 text-right ${detailView === 'COLLECTED' ? 'text-emerald-600' : 'text-rose-600'}`}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(detailRecords as UnifiedLedgerEntry[]).map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 text-xs font-bold text-slate-500 tabular-nums">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-5 text-xs font-black text-slate-700 uppercase">{entry.description}</td>
                      <td className="px-6 py-5 text-center"><span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500">{entry.ref}</span></td>
                      <td className={`px-8 py-5 text-right font-black text-base tabular-nums ${detailView === 'COLLECTED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {detailView === 'COLLECTED' ? '+' : '-'} ₹{entry.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : detailView === 'REVENUE' || detailView === 'PURCHASES' ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6">Date</th>
                    <th className="px-6 py-6">Voucher #</th>
                    <th className="px-6 py-6">Counterparty</th>
                    <th className="px-6 py-6 text-right">Net Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(detailRecords as Invoice[]).map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 text-xs font-bold text-slate-500 tabular-nums">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-5 text-xs font-black text-blue-600 uppercase tracking-widest">{inv.invoiceNo}</td>
                      <td className="px-6 py-5 text-xs font-black text-slate-700 uppercase">{inv.partyName}</td>
                      <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums">₹{inv.grandTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6">Timeline</th>
                    <th className="px-6 py-6">Narration</th>
                    <th className="px-6 py-6 text-center">Segment</th>
                    <th className="px-6 py-6 text-right">Debit (-)</th>
                    <th className="px-8 py-6 text-right">Credit (+)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.transactions.slice().reverse().map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6 whitespace-nowrap">
                         <span className="font-black text-slate-600 text-xs tabular-nums">{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </td>
                      <td className="px-6 py-6 text-xs font-bold text-slate-700 uppercase truncate max-w-xs">{t.description}</td>
                      <td className="px-6 py-6 text-center">
                        <span className="px-3 py-1 rounded-xl bg-white border border-slate-100 text-slate-400 font-black uppercase text-[8px] tracking-widest shadow-sm">{t.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-rose-600 font-black tabular-nums text-xs">{t.type === 'DEBIT' ? `₹${t.amount.toLocaleString()}` : '—'}</td>
                      <td className="px-8 py-4 text-right text-emerald-600 font-black tabular-nums text-xs">{t.type === 'CREDIT' ? `₹${t.amount.toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-8 no-print">
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <h3 className="font-black text-white text-[11px] uppercase tracking-[0.2em]">P&L Summary</h3>
              <ShieldCheck className="text-blue-500" size={20} />
            </div>
            <div className="p-10 flex-1 space-y-10">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4">Core Revenue</p>
                  <div className="flex justify-between items-center group cursor-pointer" onClick={() => setDetailView('REVENUE')}>
                    <span className="text-sm font-bold text-slate-300">Net Sales</span>
                    <span className="text-lg font-black text-white tabular-nums">₹{accountStats.revenue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4">Direct Burn</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm cursor-pointer" onClick={() => setDetailView('PURCHASES')}>
                      <span className="text-slate-400 font-bold">COGS</span>
                      <span className="font-black text-rose-400 tabular-nums">-₹{accountStats.purchases.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-8 border-t border-blue-500/20">
                <span className={`text-4xl font-black tracking-tighter tabular-nums ${accountStats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ₹{accountStats.profit.toLocaleString()}
                </span>
                <p className="text-[9px] font-black text-slate-500 uppercase mt-2 tracking-widest">Retained Earnings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountStatCard = ({ title, amount, color, icon, active = false, onClick }: { title: string, amount: number, color: string, icon: React.ReactNode, active?: boolean, onClick: () => void }) => {
  const themes: Record<string, any> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', shadow: 'shadow-blue-50', ring: 'ring-blue-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', shadow: 'shadow-rose-50', ring: 'ring-rose-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', shadow: 'shadow-emerald-50', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', shadow: 'shadow-amber-50', ring: 'ring-amber-100' }
  };
  const theme = themes[color];

  return (
    <div 
      onClick={onClick}
      className={`p-7 rounded-[2rem] border bg-white shadow-sm flex flex-col group hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer ${active ? `ring-4 ${theme.ring} border-2 ${theme.border}` : 'border-slate-100'}`}
    >
      <div className="flex justify-between items-center mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-slate-600 transition-colors">{title}</p>
        <div className={`p-3 rounded-2xl ${theme.bg} ${theme.text} shadow-sm group-hover:scale-110 transition-all`}>{icon}</div>
      </div>
      <p className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">₹{amount.toLocaleString()}</p>
    </div>
  );
};

export default Accounting;

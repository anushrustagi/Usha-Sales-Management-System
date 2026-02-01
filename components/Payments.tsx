
import React, { useState, useMemo } from 'react';
import { AppData, Transaction, Customer, Supplier, OtherParty, AttendanceStatus, AttendanceRecord } from '../types';
import { 
  HandCoins, Save, History, IndianRupee, User, Search, Calendar, Landmark, 
  ArrowRightLeft, UserPlus, X, Briefcase, Users as UsersIcon, Banknote, 
  Clock, AlertCircle, Plus, ChevronRight, ArrowRight, Tag, CreditCard, 
  Smartphone, Wallet as WalletIcon, ShieldCheck, UserCheck, CheckCircle2,
  CalendarCheck, UserCircle2, UserCheck2, UserMinus2, Fingerprint, CalendarDays,
  Activity, FileText, ChevronLeft, Download, Send, Zap, Calculator, Info
} from 'lucide-react';

interface PaymentsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const Payments: React.FC<PaymentsProps> = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'STAFF_SUMMARY' | 'ATTENDANCE' | 'PAYROLL_GEN'>('LEDGER');
  const [partyCategory, setPartyCategory] = useState<'CUSTOMER' | 'SUPPLIER' | 'OTHER'>('CUSTOMER');
  const [payType, setPayType] = useState<'COLLECT' | 'PAY'>('COLLECT');
  const [payPartyId, setPayPartyId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK' | 'UPI' | 'CHEQUE'>('CASH');
  const [isSalaryDisbursal, setIsSalaryDisbursal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('Payment');
  
  // Attendance & Payroll State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth());
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  
  const [showAddOtherModal, setShowAddOtherModal] = useState(false);

  const expenseCategories = ['Payment', 'Rent', 'Salary', 'Electricity', 'Transport', 'Marketing', 'Maintenance', 'Others'];

  const parties = useMemo(() => {
    if (partyCategory === 'CUSTOMER') return data.customers;
    if (partyCategory === 'SUPPLIER') return data.suppliers;
    return data.others;
  }, [partyCategory, data.customers, data.suppliers, data.others]);

  const selectedParty = useMemo(() => parties.find(p => p.id === payPartyId), [parties, payPartyId]);
  const employees = useMemo(() => data.others.filter(o => o.type === 'EMPLOYEE'), [data.others]);

  const handlePostPayment = () => {
    if (!payPartyId || !payAmount || Number(payAmount) <= 0) {
      alert("Validation Error: Choose a valid account and enter positive currency volume.");
      return;
    }
    
    const amountNum = Number(payAmount);
    const party = selectedParty;
    if (!party) return;

    const updatePayload: Partial<AppData> = {};
    if (partyCategory === 'CUSTOMER') {
      const updated = [...data.customers];
      const idx = updated.findIndex(p => p.id === payPartyId);
      updated[idx] = { ...updated[idx], outstandingBalance: (updated[idx].outstandingBalance || 0) - amountNum };
      updatePayload.customers = updated;
    } else if (partyCategory === 'SUPPLIER') {
      const updated = [...data.suppliers];
      const idx = updated.findIndex(s => s.id === payPartyId);
      updated[idx] = { ...updated[idx], outstandingBalance: (updated[idx].outstandingBalance || 0) - amountNum };
      updatePayload.suppliers = updated;
    } else {
      const updated = [...data.others];
      const idx = updated.findIndex(o => o.id === payPartyId);
      updated[idx] = { ...updated[idx], outstandingBalance: (updated[idx].outstandingBalance || 0) + (payType === 'PAY' ? -amountNum : amountNum) };
      updatePayload.others = updated;
    }

    let finalCategory = 'Payment';
    if (payType === 'PAY') {
      finalCategory = isSalaryDisbursal ? 'Salary' : expenseCategory;
    } else {
      finalCategory = 'Sale'; 
    }

    const txDescription = isSalaryDisbursal 
      ? `Payroll Settlement: ${party.name} [${paymentMode}]. Ref: ${payRemarks || 'Monthly Cycle'}`
      : `Ledger ${payType === 'COLLECT' ? 'Recovery' : 'Remittance'} [${paymentMode}] — ${party.name} (${partyCategory}). ${payRemarks ? `Note: ${payRemarks}` : ''}`;

    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      description: txDescription,
      amount: amountNum,
      type: payType === 'COLLECT' ? 'CREDIT' : 'DEBIT',
      category: finalCategory
    };

    updatePayload.transactions = [...data.transactions, newTx];
    updateData(updatePayload);
    
    setPayAmount('');
    setPayRemarks('');
    setPayPartyId('');
    setIsSalaryDisbursal(false);
    setExpenseCategory('Payment');
    setPaymentMode('CASH');
    alert("Record finalized in master ledger.");
  };

  const calculateMonthlyPayable = (employee: OtherParty, year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
    const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const records = data.attendance.filter(r => 
      r.employeeId === employee.id && 
      r.date >= monthStart && 
      r.date <= monthEnd
    );

    let effectiveDays = 0;
    records.forEach(r => {
      if (r.status === 'PRESENT') effectiveDays += 1;
      else if (r.status === 'HALF_DAY') effectiveDays += 0.5;
    });

    const perDaySalary = (employee.monthlySalary || 0) / daysInMonth;
    return {
      effectiveDays,
      daysInMonth,
      calculatedSalary: Math.round(perDaySalary * effectiveDays)
    };
  };

  const handleBatchPayroll = () => {
    const monthName = new Date(payrollYear, payrollMonth).toLocaleString('default', { month: 'long' });
    if (!confirm(`Authorize Batch Processing: Calculate and post salaries for ALL employees for ${monthName} ${payrollYear}?`)) return;

    let updatedOthers = [...data.others];
    let newTransactions: Transaction[] = [];

    employees.forEach(emp => {
      const { calculatedSalary, effectiveDays } = calculateMonthlyPayable(emp, payrollYear, payrollMonth);
      if (calculatedSalary > 0) {
        const idx = updatedOthers.findIndex(o => o.id === emp.id);
        updatedOthers[idx] = { 
          ...updatedOthers[idx], 
          outstandingBalance: (updatedOthers[idx].outstandingBalance || 0) + calculatedSalary 
        };

        newTransactions.push({
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          description: `Batch Payroll Accrual: ${emp.name} [${monthName} ${payrollYear}] (${effectiveDays} Days)`,
          amount: calculatedSalary,
          type: 'DEBIT',
          category: 'Salary'
        });
      }
    });

    if (newTransactions.length === 0) {
      alert("No attendance records found for the selected period. Payroll generation aborted.");
      return;
    }

    updateData({
      others: updatedOthers,
      transactions: [...data.transactions, ...newTransactions]
    });

    alert(`Successfully processed payroll for ${newTransactions.length} employees.`);
    setActiveTab('STAFF_SUMMARY');
  };

  const handleMarkAttendance = (empId: string, status: AttendanceStatus) => {
    const updated = [...data.attendance];
    const existingIdx = updated.findIndex(r => r.employeeId === empId && r.date === attendanceDate);
    
    const record: AttendanceRecord = {
      id: existingIdx > -1 ? updated[existingIdx].id : Math.random().toString(36).substr(2, 9),
      employeeId: empId,
      date: attendanceDate,
      status: status
    };

    if (existingIdx > -1) updated[existingIdx] = record;
    else updated.push(record);

    updateData({ attendance: updated });
  };

  const markAllPresent = () => {
    let updated = [...data.attendance];
    employees.forEach(emp => {
      const existingIdx = updated.findIndex(r => r.employeeId === emp.id && r.date === attendanceDate);
      const record: AttendanceRecord = {
        id: existingIdx > -1 ? updated[existingIdx].id : Math.random().toString(36).substr(2, 9),
        employeeId: emp.id,
        date: attendanceDate,
        status: 'PRESENT'
      };
      if (existingIdx > -1) updated[existingIdx] = record;
      else updated.push(record);
    });
    updateData({ attendance: updated });
  };

  const paymentTransactions = data.transactions
    .filter(t => t.category === 'Payment' || t.category === 'Salary' || t.category === 'Sale' || expenseCategories.includes(t.category))
    .slice()
    .reverse();

  const getNextSalaryDate = (dueDay: number) => {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    if (today.getDate() > dueDay) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
    const nextDate = new Date(year, month, dueDay);
    return nextDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500 pb-20 no-print">
      <div className="xl:col-span-1">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden sticky top-6">
          <div className="p-8 border-b border-slate-100 bg-slate-900 text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20"><HandCoins size={24} className="text-white" /></div>
              <div>
                 <h3 className="font-black text-sm uppercase tracking-widest">Vault Posting</h3>
                 <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest opacity-60">Ledger & Payroll Console</p>
              </div>
            </div>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Account Cluster</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                {(['CUSTOMER', 'SUPPLIER', 'OTHER'] as const).map(cat => (
                  <button 
                    key={cat}
                    onClick={() => {setPartyCategory(cat); setPayPartyId(''); setIsSalaryDisbursal(false);}}
                    className={`py-3 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest ${partyCategory === cat ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {cat === 'OTHER' ? 'STAFF' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Transaction Vector</label>
              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                <button 
                  onClick={() => {setPayType('COLLECT'); setIsSalaryDisbursal(false); setExpenseCategory('Payment');}}
                  className={`flex-1 py-4 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${payType === 'COLLECT' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  RECOVERY
                </button>
                <button 
                  onClick={() => setPayType('PAY')}
                  className={`flex-1 py-4 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${payType === 'PAY' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  SETTLEMENT
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Asset Channel</label>
              <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                {[
                  { id: 'CASH', label: 'Cash', icon: WalletIcon },
                  { id: 'BANK', label: 'Transfer', icon: Landmark },
                  { id: 'UPI', label: 'Digital', icon: Smartphone },
                  { id: 'CHEQUE', label: 'Clearing', icon: CreditCard }
                ].map(mode => (
                  <button key={mode.id} onClick={() => setPaymentMode(mode.id as any)} className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all ${paymentMode === mode.id ? 'bg-white text-blue-600 shadow-md border border-blue-50' : 'text-slate-400 hover:text-slate-800'}`}>
                    <mode.icon size={16} className="mb-1.5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-50">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1 px-1">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Account</label>
                   {partyCategory === 'OTHER' && <button onClick={() => setShowAddOtherModal(true)} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-tighter transition-all">+ Add Profile</button>}
                </div>
                <select className="w-full border-2 border-slate-50 rounded-2xl p-5 text-sm font-bold outline-none focus:border-blue-500 bg-slate-50 shadow-inner appearance-none" value={payPartyId} onChange={e => setPayPartyId(e.target.value)}>
                  <option value="">Choose Registry ID...</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name} [Bal: ₹{p.outstandingBalance.toLocaleString()}]</option>)}
                </select>
              </div>

              {partyCategory === 'OTHER' && selectedParty && (selectedParty as OtherParty).type === 'EMPLOYEE' && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                   <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[1.5rem] space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Clock size={16} className="text-blue-600" />
                            <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Active Payroll</span>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Salary</p>
                            <p className="text-base font-black text-slate-900 tracking-tight">₹{(selectedParty as OtherParty).monthlySalary?.toLocaleString() || '---'}</p>
                         </div>
                         <div>
                            {(() => {
                              const now = new Date();
                              const { calculatedSalary } = calculateMonthlyPayable(selectedParty as OtherParty, now.getFullYear(), now.getMonth());
                              return (
                                <>
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Current Payable</p>
                                  <p className="text-base font-black text-emerald-700 tracking-tight">₹{calculatedSalary.toLocaleString()}</p>
                                </>
                              );
                            })()}
                         </div>
                      </div>
                   </div>
                   {payType === 'PAY' && (
                    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg"><Banknote size={18} /></div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Treat as Payroll</p>
                          <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-tight">Auto-links to Salary Expense</p>
                        </div>
                      </div>
                      <button onClick={() => setIsSalaryDisbursal(!isSalaryDisbursal)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all shadow-inner ${isSalaryDisbursal ? 'bg-indigo-600' : 'bg-slate-200'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${isSalaryDisbursal ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Volume (INR)</label>
                <div className="relative">
                  <input type="number" className="w-full border-2 border-slate-50 rounded-[1.5rem] p-6 text-3xl font-black outline-none focus:border-blue-500 bg-slate-50 shadow-inner pl-14" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                  <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={28} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ledger Remarks</label>
                <textarea rows={2} className="w-full border-2 border-slate-50 rounded-2xl p-5 text-sm font-bold outline-none focus:border-blue-500 bg-slate-50 shadow-inner transition-all" placeholder="Optional audit details..." value={payRemarks} onChange={e => setPayRemarks(e.target.value)} />
              </div>

              <button onClick={handlePostPayment} className={`w-full py-6 rounded-[1.8rem] font-black text-[11px] transition-all active:scale-95 shadow-2xl uppercase tracking-[0.25em] text-white ${payType === 'COLLECT' ? 'bg-slate-900 shadow-slate-100' : isSalaryDisbursal ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-600 shadow-rose-100'}`}>
                Confirm Vault Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="xl:col-span-2 space-y-8">
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[800px]">
          <div className="p-1 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between overflow-x-auto custom-scrollbar">
            <div className="flex">
              <button onClick={() => setActiveTab('LEDGER')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === 'LEDGER' ? 'bg-white text-slate-900 border-r border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Master Ledger</button>
              <button onClick={() => setActiveTab('ATTENDANCE')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === 'ATTENDANCE' ? 'bg-white text-indigo-600 border-x border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><CalendarCheck size={16} /> Attendance</button>
              <button onClick={() => setActiveTab('PAYROLL_GEN')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === 'PAYROLL_GEN' ? 'bg-white text-blue-600 border-x border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Calculator size={16} /> Process Payroll</button>
              <button onClick={() => setActiveTab('STAFF_SUMMARY')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === 'STAFF_SUMMARY' ? 'bg-white text-slate-600 border-l border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><UsersIcon size={16} /> Staff Directory</button>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            {activeTab === 'LEDGER' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6">Timeline</th>
                    <th className="px-6 py-6">Corporate Entity</th>
                    <th className="px-6 py-6">Transaction Detail</th>
                    <th className="px-6 py-6 text-right">Inflow (+)</th>
                    <th className="px-10 py-6 text-right">Outflow (-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paymentTransactions.map(tx => {
                    const matchedParty = [...data.customers, ...data.suppliers, ...data.others].find(p => tx.description.includes(p.name));
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/30 transition-all group">
                        <td className="px-10 py-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-700 text-xs tabular-nums">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            <span className="text-[9px] text-slate-300 font-black uppercase tracking-tighter mt-1">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                           {matchedParty ? (
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white rounded-xl transition-all shadow-inner"><ShieldCheck size={14} /></div>
                                <span className="font-black text-slate-700 text-[11px] uppercase tracking-tight truncate max-w-[150px]">{matchedParty.name}</span>
                             </div>
                           ) : <span className="text-[11px] font-black text-slate-300 uppercase italic opacity-40">Direct Expense</span>}
                        </td>
                        <td className="px-6 py-6">
                          <p className="font-bold text-slate-500 text-[11px] leading-relaxed line-clamp-2 uppercase tracking-tighter">{tx.description}</p>
                        </td>
                        <td className="px-6 py-6 text-right">
                          {tx.type === 'CREDIT' ? <span className="font-black text-emerald-600 text-sm tabular-nums">₹{tx.amount.toLocaleString()}</span> : '—'}
                        </td>
                        <td className="px-10 py-6 text-right">
                          {tx.type === 'DEBIT' ? <span className={`font-black text-sm tabular-nums ${tx.category === 'Salary' ? 'text-indigo-600' : 'text-rose-600'}`}>₹{tx.amount.toLocaleString()}</span> : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : activeTab === 'STAFF_SUMMARY' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6">Staff Profile</th>
                    <th className="px-6 py-6">Standard Pay</th>
                    <th className="px-6 py-6">Next Cycle</th>
                    <th className="px-6 py-6 text-right">Ledger Balance</th>
                    <th className="px-10 py-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {employees.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all">{e.name.charAt(0)}</div>
                           <div className="flex flex-col">
                             <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{e.name}</span>
                             <span className="text-[10px] text-slate-300 font-bold uppercase mt-1 tracking-widest">{e.phone || 'NO PHONE'}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-6"><span className="font-black text-slate-600 text-sm tabular-nums">₹{e.monthlySalary?.toLocaleString() || '0'}</span></td>
                      <td className="px-6 py-6"><div className="flex items-center gap-2"><Calendar size={14} className="text-blue-500" /><span className="font-black text-slate-600 text-[11px] uppercase tracking-tighter">{e.salaryDueDate ? getNextSalaryDate(e.salaryDueDate) : 'NOT SET'}</span></div></td>
                      <td className="px-6 py-6 text-right"><span className={`font-black text-sm tabular-nums ${e.outstandingBalance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₹{Math.abs(e.outstandingBalance).toLocaleString()}</span></td>
                      <td className="px-10 py-6 text-center"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${e.outstandingBalance >= 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{e.outstandingBalance >= 0 ? 'Dues Payable' : 'Clear'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTab === 'PAYROLL_GEN' ? (
              /* PAYROLL BATCH GENERATION */
              <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white">
                <div className="p-10 bg-slate-50 border-b space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100"><Calculator size={28}/></div>
                      <div>
                        <h4 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none mb-1.5">Payroll Engine</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Automatic Pro-rata Calculation</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-xs font-black outline-none focus:border-blue-500 appearance-none min-w-[120px]" value={payrollMonth} onChange={e => setPayrollMonth(Number(e.target.value))}>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <select className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-xs font-black outline-none focus:border-blue-500 appearance-none min-w-[100px]" value={payrollYear} onChange={e => setPayrollYear(Number(e.target.value))}>
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-full">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Professionals</p>
                       <p className="text-3xl font-black text-slate-900">{employees.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-full">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Est. Monthly Liability</p>
                       <p className="text-3xl font-black text-blue-600">₹{employees.reduce((acc, e) => acc + (e.monthlySalary || 0), 0).toLocaleString()}</p>
                    </div>
                    <button onClick={handleBatchPayroll} className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl flex flex-col justify-between h-full hover:bg-blue-600 transition-all active:scale-95 text-left group">
                       <div className="flex justify-between w-full"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white/50">Execute Batch</p><Zap size={18} className="text-amber-400 fill-amber-400" /></div>
                       <p className="text-sm font-black uppercase tracking-widest leading-none mt-4">Process All Salaries</p>
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                   <table className="w-full text-left">
                     <thead className="bg-white text-slate-400 font-black uppercase text-[9px] tracking-widest border-b">
                        <tr>
                          <th className="px-10 py-5">Verified Professional</th>
                          <th className="px-6 py-5 text-center">Work Days</th>
                          <th className="px-6 py-5 text-right">Fixed Base</th>
                          <th className="px-10 py-5 text-right">Payable Value</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 bg-white">
                        {employees.map(emp => {
                          const { effectiveDays, calculatedSalary } = calculateMonthlyPayable(emp, payrollYear, payrollMonth);
                          return (
                            <tr key={emp.id} className="hover:bg-slate-50 transition-all group">
                              <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">{emp.name.charAt(0)}</div>
                                  <span className="font-black text-slate-800 text-xs uppercase">{emp.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${effectiveDays > 25 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{effectiveDays} Units</span>
                              </td>
                              <td className="px-6 py-6 text-right font-bold text-slate-400 text-xs tabular-nums">₹{emp.monthlySalary?.toLocaleString()}</td>
                              <td className="px-10 py-6 text-right">
                                <span className="font-black text-slate-900 text-base tabular-nums">₹{calculatedSalary.toLocaleString()}</span>
                              </td>
                            </tr>
                          );
                        })}
                     </tbody>
                   </table>
                </div>
              </div>
            ) : (
              /* ATTENDANCE REGISTRY */
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="p-8 bg-slate-50 border-b flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><Fingerprint size={24}/></div>
                      <div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Attendance Register</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Turn Verification</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <button onClick={markAllPresent} className="px-5 py-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-2 shadow-sm"><UserCheck size={16}/> Mark All Present</button>
                      <div className="relative">
                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="date" className="pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-indigo-500 transition-all" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                      </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white text-slate-400 font-black uppercase text-[9px] tracking-widest border-b">
                      <tr>
                        <th className="px-10 py-5">Verified Professional</th>
                        <th className="px-6 py-5 text-center">Status Control</th>
                        <th className="px-10 py-5 text-right">Day Insight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {employees.map(emp => {
                        const record = data.attendance.find(r => r.employeeId === emp.id && r.date === attendanceDate);
                        
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">{emp.name.charAt(0)}</div>
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-800 text-xs uppercase">{emp.name}</span>
                                  <span className="text-[8px] font-black text-slate-300 uppercase mt-1 tracking-tighter">ID: {emp.id.slice(0, 8)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleMarkAttendance(emp.id, 'PRESENT')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${record?.status === 'PRESENT' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-400 hover:border-emerald-100 hover:text-emerald-600'}`}>
                                     <UserCheck2 size={12}/> PRESENT
                                  </button>
                                  <button onClick={() => handleMarkAttendance(emp.id, 'HALF_DAY')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${record?.status === 'HALF_DAY' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-400 hover:border-amber-100 hover:text-amber-600'}`}>
                                     <UserCircle2 size={12}/> HALF DAY
                                  </button>
                                  <button onClick={() => handleMarkAttendance(emp.id, 'ABSENT')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${record?.status === 'ABSENT' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-400 hover:border-rose-100 hover:text-rose-600'}`}>
                                     <UserMinus2 size={12}/> ABSENT
                                  </button>
                               </div>
                            </td>
                            <td className="px-10 py-6 text-right">
                               <div className="flex flex-col items-end">
                                  <span className={`text-[10px] font-black uppercase tracking-tighter ${record ? 'text-indigo-600' : 'text-slate-300'}`}>{record ? record.status : 'Awaiting Entry'}</span>
                                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Verification Required</span>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-8 bg-slate-900 text-white border-t border-white/5">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-white/10 rounded-2xl"><Activity size={24}/></div>
                         <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Manual Override Console</p>
                            <p className="text-xs font-bold text-slate-400 max-w-sm">Salaries accrue pro-rata: (Standard Pay / Days in Month) × Present Units. Switch to "Process Payroll" for monthly batching.</p>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
            {activeTab === 'LEDGER' && data.transactions.length === 0 && (
              <div className="py-40 text-center">
                 <History size={48} className="mx-auto text-slate-100 mb-6" />
                 <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[11px]">Master ledger is currently blank</p>
              </div>
            )}
            {(activeTab === 'STAFF_SUMMARY' || activeTab === 'ATTENDANCE') && employees.length === 0 && (
              <div className="py-40 text-center">
                 <UsersIcon size={48} className="mx-auto text-slate-100 mb-6" />
                 <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[11px]">Staff directory is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddOtherModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in duration-300 border border-white/20">
            <QuickOtherPartyForm 
              onClose={() => setShowAddOtherModal(false)}
              onSave={(newParty) => {
                updateData({ others: [...data.others, newParty] });
                setPayPartyId(newParty.id);
                setShowAddOtherModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const QuickOtherPartyForm: React.FC<{onClose: () => void, onSave: (p: OtherParty) => void}> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<OtherParty, 'id'>>({
    name: '', type: 'EMPLOYEE', phone: '', outstandingBalance: 0, remarks: '', monthlySalary: 0, salaryDueDate: 1
  });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!formData.name) return alert("Validation: Name identity is required."); onSave({ ...formData, id: Math.random().toString(36).substr(2, 9) }); };

  return (
    <div className="flex flex-col">
      <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-200"><UserPlus size={28}/></div>
          <div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Staff Registration</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">Payroll Index Profiling</p>
          </div>
        </div>
        <button onClick={onClose} className="p-4 hover:bg-white rounded-full transition-all text-slate-400"><X size={32} /></button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-12 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Staff Full Name *</label>
            <input autoFocus type="text" className="w-full border-2 border-slate-50 rounded-2xl p-5 text-sm font-bold bg-slate-50 shadow-inner outline-none focus:border-blue-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Sharma" />
          </div>
          
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Employment Category</label>
            <div className="grid grid-cols-3 gap-3">
              {(['EMPLOYEE', 'PARTNER', 'OTHER'] as const).map(t => (
                <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`py-4 text-[10px] font-black rounded-2xl border-2 transition-all uppercase tracking-widest ${formData.type === t ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200'}`}>{t}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Contact Phone</label>
              <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-5 text-sm font-bold bg-slate-50 shadow-inner outline-none focus:border-blue-500 transition-all" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ledger Opening</label>
              <input type="number" className="w-full border-2 border-slate-50 rounded-2xl p-5 text-sm font-bold bg-slate-50 shadow-inner outline-none focus:border-blue-500 transition-all" value={formData.outstandingBalance} onChange={e => setFormData({...formData, outstandingBalance: Number(e.target.value)})} />
            </div>
          </div>

          {formData.type === 'EMPLOYEE' && (
            <div className="p-8 bg-blue-50 rounded-[2rem] border-2 border-blue-100 space-y-6">
               <div className="flex items-center gap-3 mb-4">
                  <Briefcase size={20} className="text-blue-600"/>
                  <div>
                    <p className="text-[11px] font-black text-blue-800 uppercase tracking-[0.2em]">Payroll Configuration</p>
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Automation settings</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Base Salary (Monthly)</label>
                    <div className="relative">
                      <input type="number" className="w-full border-2 border-white rounded-xl p-4 pl-10 text-base font-black text-slate-800 bg-white shadow-sm outline-none focus:border-blue-300 transition-all" value={formData.monthlySalary} onChange={e => setFormData({...formData, monthlySalary: Number(e.target.value)})} />
                      <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Payroll Cycle Day</label>
                      <Info size={12} className="text-blue-200" title="The day of the month when salary accrues (1-31)" />
                    </div>
                    <div className="relative">
                      <input type="number" min="1" max="31" className="w-full border-2 border-white rounded-xl p-4 pl-10 text-base font-black text-slate-800 bg-white shadow-sm outline-none focus:border-blue-300 transition-all" value={formData.salaryDueDate} onChange={e => setFormData({...formData, salaryDueDate: Number(e.target.value)})} />
                      <CalendarCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                    </div>
                    <p className="text-[8px] font-black text-blue-300 uppercase tracking-widest text-center mt-1">E.g. "1" for 1st of every month</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        <button type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-2xl uppercase tracking-[0.25em] text-[11px] transition-all active:scale-95 shadow-blue-100 mt-4">COMMIT TO MASTER RECODRS</button>
      </form>
    </div>
  );
};

export default Payments;

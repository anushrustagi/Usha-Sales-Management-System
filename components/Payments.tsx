
import React, { useState, useMemo } from 'react';
import { AppData, Transaction, Customer, Supplier, OtherParty, AttendanceStatus, AttendanceRecord } from '../types';
import { 
  HandCoins, Save, History, IndianRupee, User, Search, Calendar, Landmark, 
  ArrowRightLeft, UserPlus, X, Briefcase, Users as UsersIcon, Banknote, 
  Clock, AlertCircle, Plus, ChevronRight, ArrowRight, Tag, CreditCard, 
  Smartphone, Wallet as WalletIcon, ShieldCheck, UserCheck, CheckCircle2,
  CalendarCheck, UserCircle2, UserCheck2, UserMinus2, Fingerprint, CalendarDays,
  Activity, FileText, ChevronLeft, Download, Send, Zap, Calculator, Info,
  Edit2, Trash2, RotateCcw
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
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  
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

    let updatedCustomers = [...data.customers];
    let updatedSuppliers = [...data.suppliers];
    let updatedOthers = [...data.others];
    let updatedTransactions = [...data.transactions];

    if (editingTxId) {
      const oldTx = data.transactions.find(t => t.id === editingTxId);
      if (oldTx) {
        const oldParty = [...updatedCustomers, ...updatedSuppliers, ...updatedOthers].find(p => oldTx.description.includes(p.name));
        if (oldParty) {
          if (updatedCustomers.some(c => c.id === oldParty.id)) {
            const idx = updatedCustomers.findIndex(c => c.id === oldParty.id);
            updatedCustomers[idx] = { ...updatedCustomers[idx], outstandingBalance: updatedCustomers[idx].outstandingBalance + oldTx.amount };
          } else if (updatedSuppliers.some(s => s.id === oldParty.id)) {
            const idx = updatedSuppliers.findIndex(s => s.id === oldParty.id);
            updatedSuppliers[idx] = { ...updatedSuppliers[idx], outstandingBalance: updatedSuppliers[idx].outstandingBalance + oldTx.amount };
          } else {
            const idx = updatedOthers.findIndex(o => o.id === oldParty.id);
            const wasPay = oldTx.type === 'DEBIT';
            updatedOthers[idx] = { ...updatedOthers[idx], outstandingBalance: updatedOthers[idx].outstandingBalance + (wasPay ? oldTx.amount : -oldTx.amount) };
          }
        }
      }
    }

    if (partyCategory === 'CUSTOMER') {
      const idx = updatedCustomers.findIndex(p => p.id === payPartyId);
      updatedCustomers[idx] = { ...updatedCustomers[idx], outstandingBalance: updatedCustomers[idx].outstandingBalance - amountNum };
    } else if (partyCategory === 'SUPPLIER') {
      const idx = updatedSuppliers.findIndex(s => s.id === payPartyId);
      updatedSuppliers[idx] = { ...updatedSuppliers[idx], outstandingBalance: updatedSuppliers[idx].outstandingBalance - amountNum };
    } else {
      const idx = updatedOthers.findIndex(o => o.id === payPartyId);
      updatedOthers[idx] = { ...updatedOthers[idx], outstandingBalance: updatedOthers[idx].outstandingBalance + (payType === 'PAY' ? -amountNum : amountNum) };
    }

    let finalCategory = 'Payment';
    if (payType === 'PAY') finalCategory = isSalaryDisbursal ? 'Salary' : expenseCategory;
    else finalCategory = 'Sale'; 

    const txDescription = isSalaryDisbursal 
      ? `Payroll Settlement: ${party.name} [${paymentMode}]. Ref: ${payRemarks || 'Monthly Cycle'}`
      : `Ledger ${payType === 'COLLECT' ? 'Recovery' : 'Remittance'} [${paymentMode}] — ${party.name}. ${payRemarks ? `Note: ${payRemarks}` : ''}`;

    const newTx: Transaction = {
      id: editingTxId || Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      description: txDescription,
      amount: amountNum,
      type: payType === 'COLLECT' ? 'CREDIT' : 'DEBIT',
      category: finalCategory
    };

    if (editingTxId) {
      const tIdx = updatedTransactions.findIndex(t => t.id === editingTxId);
      updatedTransactions[tIdx] = newTx;
    } else updatedTransactions.push(newTx);

    updateData({ transactions: updatedTransactions, customers: updatedCustomers, suppliers: updatedSuppliers, others: updatedOthers });
    resetForm();
    alert(editingTxId ? "Ledger record updated." : "Transaction synchronized.");
  };

  const handleDeleteTransaction = (id: string) => {
    if (!confirm("Permanently delete this ledger entry? Linked balances will be automatically reconciled.")) return;
    const tx = data.transactions.find(t => t.id === id);
    if (!tx) return;

    let updatedCustomers = [...data.customers];
    let updatedSuppliers = [...data.suppliers];
    let updatedOthers = [...data.others];
    const allParties = [...updatedCustomers, ...updatedSuppliers, ...updatedOthers];
    const party = allParties.find(p => tx.description.includes(p.name));
    
    if (party) {
      if (updatedCustomers.some(c => c.id === party.id)) {
        const idx = updatedCustomers.findIndex(c => c.id === party.id);
        updatedCustomers[idx] = { ...updatedCustomers[idx], outstandingBalance: updatedCustomers[idx].outstandingBalance + tx.amount };
      } else if (updatedSuppliers.some(s => s.id === party.id)) {
        const idx = updatedSuppliers.findIndex(s => s.id === party.id);
        updatedSuppliers[idx] = { ...updatedSuppliers[idx], outstandingBalance: updatedSuppliers[idx].outstandingBalance + tx.amount };
      } else {
        const idx = updatedOthers.findIndex(o => o.id === party.id);
        const wasPay = tx.type === 'DEBIT';
        updatedOthers[idx] = { ...updatedOthers[idx], outstandingBalance: updatedOthers[idx].outstandingBalance + (wasPay ? tx.amount : -tx.amount) };
      }
    }

    updateData({
      transactions: data.transactions.filter(t => t.id !== id),
      customers: updatedCustomers,
      suppliers: updatedSuppliers,
      others: updatedOthers
    });
  };

  const resetForm = () => { setPayAmount(''); setPayRemarks(''); setPayPartyId(''); setIsSalaryDisbursal(false); setExpenseCategory('Payment'); setPaymentMode('CASH'); setEditingTxId(null); };

  const calculateMonthlyPayable = (employee: OtherParty, year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
    const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const records = data.attendance.filter(r => r.employeeId === employee.id && r.date >= monthStart && r.date <= monthEnd);
    let effectiveDays = 0;
    records.forEach(r => { if (r.status === 'PRESENT') effectiveDays += 1; else if (r.status === 'HALF_DAY') effectiveDays += 0.5; });
    const perDaySalary = (employee.monthlySalary || 0) / daysInMonth;
    return { effectiveDays, daysInMonth, calculatedSalary: Math.round(perDaySalary * effectiveDays) };
  };

  const handleBatchPayroll = () => {
    const monthName = new Date(payrollYear, payrollMonth).toLocaleString('default', { month: 'long' });
    if (!confirm(`Authorize Batch: Calculate salaries for ALL employees for ${monthName} ${payrollYear}?`)) return;
    let updatedOthers = [...data.others];
    let newTransactions: Transaction[] = [];
    employees.forEach(emp => {
      const { calculatedSalary, effectiveDays } = calculateMonthlyPayable(emp, payrollYear, payrollMonth);
      if (calculatedSalary > 0) {
        const idx = updatedOthers.findIndex(o => o.id === emp.id);
        updatedOthers[idx] = { ...updatedOthers[idx], outstandingBalance: (updatedOthers[idx].outstandingBalance || 0) + calculatedSalary };
        newTransactions.push({ id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), description: `Batch Payroll: ${emp.name} [${monthName} ${payrollYear}] (${effectiveDays} Days)`, amount: calculatedSalary, type: 'DEBIT', category: 'Salary' });
      }
    });
    if (newTransactions.length === 0) return alert("No records found.");
    updateData({ others: updatedOthers, transactions: [...data.transactions, ...newTransactions] });
    alert("Batch processed.");
    setActiveTab('STAFF_SUMMARY');
  };

  const paymentTransactions = data.transactions.filter(t => t.category === 'Payment' || t.category === 'Salary' || t.category === 'Sale' || expenseCategories.includes(t.category)).slice().reverse();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500 pb-20 no-print">
      <div className="xl:col-span-1">
        <div className={`bg-white rounded-[2.5rem] border shadow-sm overflow-hidden sticky top-6 transition-all ${editingTxId ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-200'}`}>
          <div className={`p-8 border-b transition-colors ${editingTxId ? 'bg-amber-600' : 'bg-slate-900'} text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl shadow-xl shadow-blue-500/20 ${editingTxId ? 'bg-white text-amber-600' : 'bg-blue-600 text-white'}`}>{editingTxId ? <Edit2 size={24} /> : <HandCoins size={24} />}</div>
                <div><h3 className="font-black text-sm uppercase tracking-widest">{editingTxId ? 'Modify Entry' : 'Vault Posting'}</h3><p className="text-[10px] text-white/60 font-black uppercase mt-1 tracking-widest">Master Payment Console</p></div>
              </div>
              {editingTxId && <button onClick={resetForm} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"><X size={20} /></button>}
            </div>
          </div>
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Account Cluster</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                {(['CUSTOMER', 'SUPPLIER', 'OTHER'] as const).map(cat => (
                  <button key={cat} disabled={!!editingTxId} onClick={() => {setPartyCategory(cat); setPayPartyId(''); setIsSalaryDisbursal(false);}} className={`py-3 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest ${partyCategory === cat ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'} disabled:opacity-50`}>{cat === 'OTHER' ? 'STAFF' : cat}</button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Vector Type</label>
              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => {setPayType('COLLECT'); setIsSalaryDisbursal(false);}} className={`flex-1 py-4 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${payType === 'COLLECT' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}>RECOVERY</button>
                <button onClick={() => setPayType('PAY')} className={`flex-1 py-4 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${payType === 'PAY' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}>SETTLEMENT</button>
              </div>
            </div>
            <div className="space-y-6 pt-4 border-t border-slate-50">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1 px-1"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Account</label></div>
                <select disabled={!!editingTxId} className="w-full border-2 border-slate-50 rounded-2xl p-5 text-sm font-bold outline-none focus:border-blue-500 bg-slate-50 shadow-inner appearance-none disabled:opacity-50" value={payPartyId} onChange={e => setPayPartyId(e.target.value)}>
                  <option value="">Choose Identity...</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name} [Bal: ₹{p.outstandingBalance.toLocaleString()}]</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Currency (INR)</label>
                <div className="relative"><input type="number" className="w-full border-2 border-slate-50 rounded-[1.5rem] p-6 text-3xl font-black outline-none focus:border-blue-500 bg-slate-50 shadow-inner pl-14" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} /><IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={28} /></div>
              </div>
              <div className="flex gap-4">
                {editingTxId && <button onClick={resetForm} className="flex-1 py-6 rounded-[1.8rem] font-black text-[11px] bg-slate-100 text-slate-500 uppercase tracking-[0.25em] transition-all">Discard</button>}
                <button onClick={handlePostPayment} className={`flex-[2] py-6 rounded-[1.8rem] font-black text-[11px] transition-all active:scale-95 shadow-2xl uppercase tracking-[0.25em] text-white ${editingTxId ? 'bg-amber-600 shadow-amber-100' : payType === 'COLLECT' ? 'bg-slate-900 shadow-slate-100' : 'bg-rose-600 shadow-rose-100'}`}>{editingTxId ? 'Update Posting' : 'Confirm Entry'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="xl:col-span-2 space-y-8">
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[800px]">
          <div className="p-1 border-b border-slate-100 bg-slate-50/50 flex items-center justify-start overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('LEDGER')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === 'LEDGER' ? 'bg-white text-slate-900 border-r border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Transaction Audit</button>
            <button onClick={() => setActiveTab('STAFF_SUMMARY')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === 'STAFF_SUMMARY' ? 'bg-white text-slate-600 border-l border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><UsersIcon size={16} /> Staff Directory</button>
            <button onClick={() => setActiveTab('ATTENDANCE')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === 'ATTENDANCE' ? 'bg-white text-indigo-600 border-x border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><CalendarCheck size={16} /> Attendance</button>
            <button onClick={() => setActiveTab('PAYROLL_GEN')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === 'PAYROLL_GEN' ? 'bg-white text-blue-600 border-x border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Calculator size={16} /> Process Payroll</button>
          </div>
          
          <div className="overflow-x-auto flex-1">
            {activeTab === 'LEDGER' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                  <tr><th className="px-10 py-6">Timeline</th><th className="px-6 py-6">Entity Profile</th><th className="px-6 py-6">Audit Narration</th><th className="px-6 py-6 text-right">Inflow (+)</th><th className="px-6 py-6 text-right">Outflow (-)</th><th className="px-10 py-6 text-center">Control</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paymentTransactions.map(tx => (
                    <tr key={tx.id} className={`hover:bg-slate-50/30 transition-all group ${editingTxId === tx.id ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-10 py-6 whitespace-nowrap"><span className="font-black text-slate-700 text-xs tabular-nums">{new Date(tx.date).toLocaleDateString()}</span></td>
                      <td className="px-6 py-6"><span className="font-black text-slate-700 text-[11px] uppercase tracking-tight truncate max-w-[150px]">{[...data.customers, ...data.suppliers, ...data.others].find(p => tx.description.includes(p.name))?.name || 'Direct Entry'}</span></td>
                      <td className="px-6 py-6 font-bold text-slate-500 text-[11px] uppercase tracking-tighter line-clamp-2">{tx.description}</td>
                      <td className="px-6 py-6 text-right">{tx.type === 'CREDIT' ? <span className="font-black text-emerald-600 text-sm tabular-nums">₹{tx.amount.toLocaleString()}</span> : '—'}</td>
                      <td className="px-6 py-6 text-right">{tx.type === 'DEBIT' ? <span className="font-black text-rose-600 text-sm tabular-nums">₹{tx.amount.toLocaleString()}</span> : '—'}</td>
                      <td className="px-10 py-6"><div className="flex justify-center gap-2"><button onClick={() => handleDeleteTransaction(tx.id)} className="p-2.5 bg-white text-slate-300 hover:text-rose-600 rounded-xl transition-all border border-slate-100 shadow-sm"><Trash2 size={16}/></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center opacity-30"><FileText size={64} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Select Category for Specialized View</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;

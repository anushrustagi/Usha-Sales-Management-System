
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Transaction, Customer, Supplier, OtherParty, AttendanceStatus, AttendanceRecord } from '../types';
import { 
  HandCoins, Save, History, IndianRupee, User, Search, Calendar, Landmark, 
  ArrowRightLeft, UserPlus, X, Briefcase, Users as UsersIcon, Banknote, 
  Clock, AlertCircle, Plus, ChevronRight, ArrowRight, Tag, CreditCard, 
  Smartphone, Wallet as WalletIcon, ShieldCheck, UserCheck, CheckCircle2,
  CalendarCheck, UserCircle2, UserCheck2, UserMinus2, Fingerprint, CalendarDays,
  Activity, FileText, ChevronLeft, Download, Send, Zap, Calculator, Info,
  Edit2, Trash2, RotateCcw, BriefcaseBusiness
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
  
  // Staff & Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth());
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<OtherParty | null>(null);

  const expenseCategories = ['Payment', 'Rent', 'Salary', 'Electricity', 'Transport', 'Marketing', 'Maintenance', 'Others'];

  const parties = useMemo(() => {
    if (partyCategory === 'CUSTOMER') return data.customers;
    if (partyCategory === 'SUPPLIER') return data.suppliers;
    return data.others;
  }, [partyCategory, data.customers, data.suppliers, data.others]);

  const selectedParty = useMemo(() => parties.find(p => p.id === payPartyId), [parties, payPartyId]);
  const employees = useMemo(() => data.others.filter(o => o.type === 'EMPLOYEE'), [data.others]);

  // Attendance Logic
  const handleMarkAttendance = (empId: string, status: AttendanceStatus) => {
    const existingIdx = data.attendance.findIndex(r => r.employeeId === empId && r.date === attendanceDate);
    let updatedAttendance = [...data.attendance];
    
    if (existingIdx > -1) {
      updatedAttendance[existingIdx] = { ...updatedAttendance[existingIdx], status };
    } else {
      updatedAttendance.push({ id: Math.random().toString(36).substr(2, 9), employeeId: empId, date: attendanceDate, status });
    }
    updateData({ attendance: updatedAttendance });
  };

  const getAttendanceStatus = (empId: string): AttendanceStatus | null => {
    const record = data.attendance.find(r => r.employeeId === empId && r.date === attendanceDate);
    if (record) return record.status;
    
    // Auto-suggest Weekly Off
    const emp = employees.find(e => e.id === empId);
    if (emp && emp.weeklyOffDay) {
      const dayName = new Date(attendanceDate).toLocaleDateString('en-US', { weekday: 'long' });
      if (dayName === emp.weeklyOffDay) return 'WEEKLY_OFF';
    }
    return null;
  };

  // Ledger Logic
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

    // Revert old transaction impact if editing
    if (editingTxId) {
      const oldTx = data.transactions.find(t => t.id === editingTxId);
      if (oldTx) {
        // Attempt to find original party from description to revert balance
        const oldParty = [...updatedCustomers, ...updatedSuppliers, ...updatedOthers].find(p => oldTx.description.includes(p.name));
        if (oldParty) {
           if (partyCategory === 'CUSTOMER') {
             const idx = updatedCustomers.findIndex(c => c.id === oldParty.id);
             if(idx > -1) updatedCustomers[idx].outstandingBalance += oldTx.amount; // Re-add debt (since credit reduced it)
           } else if (partyCategory === 'SUPPLIER') {
             const idx = updatedSuppliers.findIndex(s => s.id === oldParty.id);
             if(idx > -1) updatedSuppliers[idx].outstandingBalance += oldTx.amount;
           } else {
             const idx = updatedOthers.findIndex(o => o.id === oldParty.id);
             if(idx > -1) updatedOthers[idx].outstandingBalance -= (oldTx.type === 'DEBIT' ? oldTx.amount : -oldTx.amount); // Reverse logic
           }
        }
      }
    }

    // Apply new transaction impact
    if (partyCategory === 'CUSTOMER') {
      const idx = updatedCustomers.findIndex(p => p.id === payPartyId);
      updatedCustomers[idx] = { ...updatedCustomers[idx], outstandingBalance: updatedCustomers[idx].outstandingBalance - amountNum };
    } else if (partyCategory === 'SUPPLIER') {
      const idx = updatedSuppliers.findIndex(s => s.id === payPartyId);
      updatedSuppliers[idx] = { ...updatedSuppliers[idx], outstandingBalance: updatedSuppliers[idx].outstandingBalance - amountNum };
    } else {
      const idx = updatedOthers.findIndex(o => o.id === payPartyId);
      // For staff/others: Paying them (DEBIT) reduces what we owe them (Liability goes down)
      // Collecting (CREDIT) increases what we owe (Advance)
      // Balance convention for Staff: Positive = Payable by Company
      updatedOthers[idx] = { ...updatedOthers[idx], outstandingBalance: updatedOthers[idx].outstandingBalance - (payType === 'PAY' ? amountNum : -amountNum) };
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

  const handleEditTransaction = (tx: Transaction) => {
    // Basic heuristics to pre-fill form
    const allParties = [...data.customers, ...data.suppliers, ...data.others];
    const party = allParties.find(p => tx.description.includes(p.name));
    
    if (party) {
      if (data.customers.some(c => c.id === party.id)) setPartyCategory('CUSTOMER');
      else if (data.suppliers.some(s => s.id === party.id)) setPartyCategory('SUPPLIER');
      else setPartyCategory('OTHER');
      
      setPayPartyId(party.id);
    }
    
    setPayAmount(tx.amount.toString());
    setPayType(tx.type === 'CREDIT' ? 'COLLECT' : 'PAY');
    setPayRemarks(tx.description);
    setEditingTxId(tx.id);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        updatedCustomers[idx].outstandingBalance += tx.amount; // Revert payment credit
      } else if (updatedSuppliers.some(s => s.id === party.id)) {
        const idx = updatedSuppliers.findIndex(s => s.id === party.id);
        updatedSuppliers[idx].outstandingBalance += tx.amount; // Revert payment debit
      } else {
        const idx = updatedOthers.findIndex(o => o.id === party.id);
        // For staff: Debit reduced balance, Credit increased it. Reverse.
        const wasPay = tx.type === 'DEBIT';
        updatedOthers[idx].outstandingBalance += (wasPay ? tx.amount : -tx.amount); 
      }
    }

    updateData({
      transactions: data.transactions.filter(t => t.id !== id),
      customers: updatedCustomers,
      suppliers: updatedSuppliers,
      others: updatedOthers
    });
  };

  const handleSaveStaff = (staff: OtherParty) => {
    let updatedOthers = [...data.others];
    if (editingStaff) {
      const idx = updatedOthers.findIndex(o => o.id === editingStaff.id);
      updatedOthers[idx] = { ...staff, id: editingStaff.id, outstandingBalance: editingStaff.outstandingBalance };
    } else {
      updatedOthers.push({ ...staff, id: Math.random().toString(36).substr(2, 9), outstandingBalance: 0, type: 'EMPLOYEE' });
    }
    updateData({ others: updatedOthers });
    setEditingStaff(null);
    setShowStaffModal(false);
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm("Remove this staff member? This does not delete their transaction history.")) {
      updateData({ others: data.others.filter(o => o.id !== id) });
    }
  };

  const resetForm = () => { setPayAmount(''); setPayRemarks(''); setPayPartyId(''); setIsSalaryDisbursal(false); setExpenseCategory('Payment'); setPaymentMode('CASH'); setEditingTxId(null); };

  const calculateMonthlyPayable = (employee: OtherParty, year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
    const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const records = data.attendance.filter(r => r.employeeId === employee.id && r.date >= monthStart && r.date <= monthEnd);
    
    let presentDays = 0;
    let halfDays = 0;
    let holidays = 0;
    let weeklyOffs = 0;

    records.forEach(r => {
      if (r.status === 'PRESENT') presentDays++;
      if (r.status === 'HALF_DAY') halfDays++;
      if (r.status === 'HOLIDAY') holidays++;
      if (r.status === 'WEEKLY_OFF') weeklyOffs++;
    });

    // If explicit weekly off records are missing, we should theoretically add them, 
    // but for simplicity, we rely on the user to mark 'WO' or we assume 'Present' days include weekends if not marked otherwise.
    // However, the standard payroll formula is: (Basic / DaysInMonth) * PayDays
    // PayDays = Present + WO + Holidays + (HalfDays * 0.5)
    
    const payDays = presentDays + weeklyOffs + holidays + (halfDays * 0.5);
    const perDaySalary = (employee.monthlySalary || 0) / daysInMonth;
    const calculatedSalary = Math.round(perDaySalary * payDays);

    return { payDays, presentDays, weeklyOffs, halfDays, holidays, daysInMonth, calculatedSalary };
  };

  const handleBatchPayroll = () => {
    const monthName = new Date(payrollYear, payrollMonth).toLocaleString('default', { month: 'long' });
    if (!confirm(`Authorize Batch: Generate salary dues for ALL employees for ${monthName} ${payrollYear}? This adds to their 'Payable' balance.`)) return;
    
    let updatedOthers = [...data.others];
    
    employees.forEach(emp => {
      const { calculatedSalary } = calculateMonthlyPayable(emp, payrollYear, payrollMonth);
      if (calculatedSalary > 0) {
        const idx = updatedOthers.findIndex(o => o.id === emp.id);
        updatedOthers[idx] = { ...updatedOthers[idx], outstandingBalance: (updatedOthers[idx].outstandingBalance || 0) + calculatedSalary };
        // Optional: Add a ledger note?
      }
    });
    
    updateData({ others: updatedOthers });
    alert(`Payroll Accrued. Staff balances updated. Go to 'Ledger' to disperse cash payments.`);
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
              
              {/* Special Salary Checkbox for Staff */}
              {partyCategory === 'OTHER' && payType === 'PAY' && (
                 <div onClick={() => setIsSalaryDisbursal(!isSalaryDisbursal)} className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${isSalaryDisbursal ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSalaryDisbursal ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                       {isSalaryDisbursal && <CheckCircle2 size={12} className="text-white"/>}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Mark as Salary Disbursal</span>
                 </div>
              )}

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
            {activeTab === 'LEDGER' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                  <tr><th className="px-10 py-6">Timeline</th><th className="px-6 py-6">Entity Profile</th><th className="px-6 py-6">Narration</th><th className="px-6 py-6 text-right">Inflow (+)</th><th className="px-6 py-6 text-right">Outflow (-)</th><th className="px-10 py-6 text-center">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paymentTransactions.map(tx => (
                    <tr key={tx.id} className={`hover:bg-slate-50/30 transition-all group ${editingTxId === tx.id ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-10 py-6 whitespace-nowrap"><span className="font-black text-slate-700 text-xs tabular-nums">{new Date(tx.date).toLocaleDateString()}</span></td>
                      <td className="px-6 py-6"><span className="font-black text-slate-700 text-[11px] uppercase tracking-tight truncate max-w-[150px]">{[...data.customers, ...data.suppliers, ...data.others].find(p => tx.description.includes(p.name))?.name || 'Direct Entry'}</span></td>
                      <td className="px-6 py-6 font-bold text-slate-500 text-[11px] uppercase tracking-tighter line-clamp-2">{tx.description}</td>
                      <td className="px-6 py-6 text-right">{tx.type === 'CREDIT' ? <span className="font-black text-emerald-600 text-sm tabular-nums">₹{tx.amount.toLocaleString()}</span> : '—'}</td>
                      <td className="px-6 py-6 text-right">{tx.type === 'DEBIT' ? <span className="font-black text-rose-600 text-sm tabular-nums">₹{tx.amount.toLocaleString()}</span> : '—'}</td>
                      <td className="px-10 py-6">
                        <div className="flex justify-center gap-2">
                           <button onClick={() => handleEditTransaction(tx)} className="p-2.5 bg-white text-slate-300 hover:text-blue-600 rounded-xl transition-all border border-slate-100 shadow-sm"><Edit2 size={14}/></button>
                           <button onClick={() => handleDeleteTransaction(tx.id)} className="p-2.5 bg-white text-slate-300 hover:text-rose-600 rounded-xl transition-all border border-slate-100 shadow-sm"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'STAFF_SUMMARY' && (
              <div className="p-8 space-y-6">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Active Personnel</h3>
                    <button onClick={() => {setEditingStaff(null); setShowStaffModal(true);}} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all"><UserPlus size={16}/> Add Staff</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {employees.map(emp => (
                       <div key={emp.id} className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm flex flex-col gap-4 group hover:border-blue-200 transition-all">
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">{emp.name.charAt(0)}</div>
                                <div>
                                   <h4 className="font-black text-slate-900 uppercase text-sm">{emp.name}</h4>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{emp.designation || 'Staff Member'}</p>
                                </div>
                             </div>
                             <div className="flex gap-1">
                                <button onClick={() => {setEditingStaff(emp); setShowStaffModal(true);}} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                                <button onClick={() => handleDeleteStaff(emp.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                             <div><p className="text-[9px] font-black text-slate-400 uppercase">Monthly Pay</p><p className="text-sm font-black text-slate-800 tabular-nums">₹{(emp.monthlySalary || 0).toLocaleString()}</p></div>
                             <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Balance Payable</p><p className="text-sm font-black text-rose-600 tabular-nums">₹{emp.outstandingBalance.toLocaleString()}</p></div>
                          </div>
                          <div className="flex items-center gap-2 pt-2 flex-wrap">
                             <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">Off: {emp.weeklyOffDay || 'None'}</span>
                             {emp.salaryCycleDate && (
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Cycle: {emp.salaryCycleDate}th</span>
                             )}
                             <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">{emp.phone}</span>
                          </div>
                       </div>
                    ))}
                    {employees.length === 0 && <div className="col-span-2 py-10 text-center text-slate-400 text-xs font-black uppercase tracking-widest opacity-50">No staff registered in vault</div>}
                 </div>
              </div>
            )}

            {activeTab === 'ATTENDANCE' && (
               <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div className="flex items-center gap-4">
                        <CalendarDays className="text-indigo-600" />
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Registry</p><p className="text-lg font-black text-slate-900">{new Date(attendanceDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
                     </div>
                     <input type="date" className="bg-white border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                  </div>
                  
                  <div className="overflow-hidden rounded-[2rem] border border-slate-200">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                           <tr><th className="px-8 py-5">Employee</th><th className="px-8 py-5">Role</th><th className="px-8 py-5 text-center">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {employees.map(emp => {
                              const status = getAttendanceStatus(emp.id);
                              return (
                                 <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5"><span className="font-black text-slate-800 text-xs uppercase">{emp.name}</span></td>
                                    <td className="px-8 py-5"><span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">{emp.designation}</span></td>
                                    <td className="px-8 py-5">
                                       <div className="flex justify-center gap-2">
                                          {(['PRESENT', 'ABSENT', 'HALF_DAY', 'WEEKLY_OFF', 'HOLIDAY'] as AttendanceStatus[]).map(s => (
                                             <button 
                                                key={s}
                                                onClick={() => handleMarkAttendance(emp.id, s)}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                                                   status === s 
                                                   ? s === 'PRESENT' ? 'bg-emerald-600 text-white border-emerald-600' 
                                                   : s === 'ABSENT' ? 'bg-rose-600 text-white border-rose-600'
                                                   : s === 'HALF_DAY' ? 'bg-amber-500 text-white border-amber-500'
                                                   : 'bg-slate-600 text-white border-slate-600'
                                                   : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                                }`}
                                             >
                                                {s === 'PRESENT' ? 'P' : s === 'ABSENT' ? 'A' : s === 'HALF_DAY' ? 'HD' : s === 'WEEKLY_OFF' ? 'WO' : 'H'}
                                             </button>
                                          ))}
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {activeTab === 'PAYROLL_GEN' && (
               <div className="p-8 space-y-8">
                  <div className="flex items-center gap-4 mb-6">
                     <select className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none" value={payrollMonth} onChange={e => setPayrollMonth(Number(e.target.value))}>
                        {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{new Date(2000, i).toLocaleString('default', {month: 'long'})}</option>)}
                     </select>
                     <select className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none" value={payrollYear} onChange={e => setPayrollYear(Number(e.target.value))}>
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                     </select>
                     <button onClick={handleBatchPayroll} className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2"><Calculator size={16}/> Calculate & Accrue</button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     {employees.map(emp => {
                        const stats = calculateMonthlyPayable(emp, payrollYear, payrollMonth);
                        return (
                           <div key={emp.id} className="p-6 bg-white border border-slate-200 rounded-[2rem] flex justify-between items-center shadow-sm">
                              <div>
                                 <h4 className="font-black text-slate-900 uppercase text-sm">{emp.name}</h4>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Base: ₹{emp.monthlySalary?.toLocaleString()}</p>
                              </div>
                              <div className="flex gap-8 text-center">
                                 <div><p className="text-xl font-black text-emerald-600">{stats.presentDays}</p><p className="text-[8px] font-bold text-slate-400 uppercase">Present</p></div>
                                 <div><p className="text-xl font-black text-slate-600">{stats.weeklyOffs}</p><p className="text-[8px] font-bold text-slate-400 uppercase">W-Off</p></div>
                                 <div><p className="text-xl font-black text-amber-500">{stats.halfDays}</p><p className="text-[8px] font-bold text-slate-400 uppercase">Half Day</p></div>
                                 <div><p className="text-xl font-black text-blue-600 tabular-nums">{stats.payDays}</p><p className="text-[8px] font-bold text-slate-400 uppercase">Payable Days</p></div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Salary</p>
                                 <p className="text-2xl font-black text-slate-900 tabular-nums">₹{stats.calculatedSalary.toLocaleString()}</p>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* STAFF MODAL */}
      {showStaffModal && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in border border-white/20">
               <StaffForm staff={editingStaff} onSave={handleSaveStaff} onClose={() => setShowStaffModal(false)} />
            </div>
         </div>
      )}
    </div>
  );
};

const StaffForm: React.FC<{staff: OtherParty | null, onSave: (s: OtherParty) => void, onClose: () => void}> = ({ staff, onSave, onClose }) => {
   const [form, setForm] = useState<any>(staff || { name: '', phone: '', designation: '', monthlySalary: '', salaryCycleDate: 1, weeklyOffDay: 'Sunday', joiningDate: '' });
   
   return (
      <div className="flex flex-col h-full">
         <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl"><BriefcaseBusiness size={24}/></div>
               <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">{staff ? 'Edit Profile' : 'New Staff'}</h3>
            </div>
            <button onClick={onClose} className="p-3 text-slate-400 hover:bg-white rounded-full transition-all"><X size={24}/></button>
         </div>
         <div className="p-10 space-y-6">
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label><input className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-white outline-none focus:border-slate-900" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role / Title</label><input className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-white outline-none focus:border-slate-900" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="e.g. Manager" /></div>
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-white outline-none focus:border-slate-900" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Salary (₹)</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black bg-white outline-none focus:border-slate-900" value={form.monthlySalary} onChange={e => setForm({...form, monthlySalary: Number(e.target.value)})} /></div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cycle Start (Day)</label>
                  <input type="number" min="1" max="31" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-white outline-none focus:border-slate-900" placeholder="1" value={form.salaryCycleDate || ''} onChange={e => setForm({...form, salaryCycleDate: Number(e.target.value)})} />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weekly Off</label>
               <select className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold bg-white outline-none" value={form.weeklyOffDay} onChange={e => setForm({...form, weeklyOffDay: e.target.value})}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>
            <button onClick={() => { if(!form.name) return; onSave(form); }} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl shadow-xl uppercase tracking-[0.2em] text-xs active:scale-95 transition-all">Save Personnel Record</button>
         </div>
      </div>
   );
};

export default Payments;

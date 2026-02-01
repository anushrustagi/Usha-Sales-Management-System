
import React, { useState, useMemo } from 'react';
import { AppData, Transaction, Supplier, OtherParty } from '../types';
import { Plus, Wallet, Tag, Calendar, MoreVertical, User, ChevronDown, CheckCircle2 } from 'lucide-react';

interface ExpensesProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ data, updateData }) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Rent');
  const [payeeId, setPayeeId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const categories = ['Rent', 'Salary', 'Electricity', 'Transport', 'Marketing', 'Maintenance', 'Others'];

  const allPayees = useMemo(() => {
    return [
      ...data.suppliers.map(s => ({ id: s.id, name: s.name, type: 'SUPPLIER', balance: s.outstandingBalance })),
      ...data.others.map(o => ({ id: o.id, name: o.name, type: o.type, balance: o.outstandingBalance }))
    ];
  }, [data.suppliers, data.others]);

  const selectedPayee = useMemo(() => allPayees.find(p => p.id === payeeId), [allPayees, payeeId]);

  const handleAddExpense = () => {
    if (!desc || !amount || Number(amount) <= 0) return;
    
    const amountNum = Number(amount);
    const payeeName = selectedPayee ? ` to ${selectedPayee.name}` : '';
    
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      description: `${desc}${payeeName}`,
      amount: amountNum,
      type: 'DEBIT',
      category: category
    };

    const updatePayload: Partial<AppData> = {
      transactions: [...data.transactions, newTx]
    };

    // If a payee is selected, link to their ledger
    if (payeeId) {
      const isSupplier = data.suppliers.some(s => s.id === payeeId);
      if (isSupplier) {
        const updatedSuppliers = [...data.suppliers];
        const idx = updatedSuppliers.findIndex(s => s.id === payeeId);
        updatedSuppliers[idx] = { 
          ...updatedSuppliers[idx], 
          outstandingBalance: updatedSuppliers[idx].outstandingBalance - amountNum 
        };
        updatePayload.suppliers = updatedSuppliers;
      } else {
        const updatedOthers = [...data.others];
        const idx = updatedOthers.findIndex(o => o.id === payeeId);
        updatedOthers[idx] = { 
          ...updatedOthers[idx], 
          outstandingBalance: updatedOthers[idx].outstandingBalance - amountNum 
        };
        updatePayload.others = updatedOthers;
      }
    }

    updateData(updatePayload);
    setDesc('');
    setAmount('');
    setPayeeId('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const expenseHistory = data.transactions
    .filter(t => t.type === 'DEBIT' && t.category !== 'Purchase')
    .slice()
    .reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      {showSuccess && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold border border-emerald-500/20">
            <CheckCircle2 size={20} />
            Expense Recorded & Ledger Updated
          </div>
        </div>
      )}

      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-6 overflow-hidden">
          <div className="p-6 bg-slate-900 text-white">
            <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
              <Wallet className="text-blue-400" size={20} /> Direct Cash Outflow
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Operational Expense Entry</p>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense Narrative</label>
              <input 
                type="text" 
                placeholder="e.g. Monthly Shop Electricity"
                className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 bg-slate-50/50"
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                <div className="relative">
                  <select 
                    className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 bg-white appearance-none"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (₹)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-black outline-none focus:border-blue-500 bg-slate-50/50"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1.5">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                <User size={10} /> Link to Payee (Optional Settlement)
              </label>
              <div className="relative">
                <select 
                  className={`w-full border-2 rounded-xl p-3 text-xs font-bold outline-none transition-all appearance-none ${payeeId ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-slate-50/30'}`}
                  value={payeeId}
                  onChange={e => setPayeeId(e.target.value)}
                >
                  <option value="">-- No Ledger Link (Direct) --</option>
                  <optgroup label="Suppliers / Vendors">
                    {data.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} [Bal: ₹{s.outstandingBalance}]</option>
                    ))}
                  </optgroup>
                  <optgroup label="Staff / Others">
                    {data.others.map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({o.type}) [Bal: ₹{o.outstandingBalance}]</option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {selectedPayee && (
                <p className="text-[9px] font-bold text-blue-500 uppercase italic">
                  * This will reduce {selectedPayee.name}'s balance by ₹{amount || '0'}
                </p>
              )}
            </div>

            <button 
              onClick={handleAddExpense}
              disabled={!desc || !amount}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 shadow-xl shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50"
            >
              <Plus size={18} /> Record Expense
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Expense Audit Trail</h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Recent Outflows</span>
          </div>
          <div className="divide-y divide-slate-100 min-h-[400px]">
            {expenseHistory.map(tx => (
              <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl ${
                    tx.category === 'Rent' ? 'bg-indigo-50 text-indigo-500' :
                    tx.category === 'Salary' ? 'bg-blue-50 text-blue-500' :
                    tx.category === 'Electricity' ? 'bg-amber-50 text-amber-500' :
                    'bg-slate-50 text-slate-400'
                  }`}>
                    <Tag size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{tx.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase mt-1.5">
                      <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-300" /> {new Date(tx.date).toLocaleDateString('en-IN')}</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">{tx.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-lg font-black text-slate-900 tracking-tight">₹{tx.amount.toLocaleString()}</span>
                  <button className="p-2 text-slate-200 hover:text-slate-500 transition-colors group-hover:text-slate-300"><MoreVertical size={18} /></button>
                </div>
              </div>
            ))}
            {expenseHistory.length === 0 && (
              <div className="p-24 text-center text-slate-300">
                <Wallet className="w-16 h-16 mx-auto mb-4 opacity-5" />
                <p className="font-black uppercase tracking-widest text-[10px]">Vault is currently untouched</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;

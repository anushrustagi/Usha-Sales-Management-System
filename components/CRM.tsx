
import React, { useState, useMemo } from 'react';
import { AppData, Inquiry, Customer, Supplier, Invoice, Opportunity, CrmStage, Transaction } from '../types';
import { 
  Plus, UserPlus, Search, MessageSquare, History, Phone, TrendingUp, 
  Filter, ShieldCheck, Mail, MapPin, Hash, X, Edit3, Trash2, 
  Building2, UserCircle, MapPinned, CreditCard, ChevronRight, 
  ArrowRightCircle, CheckCircle2, UserCheck, Briefcase, Info, 
  FileText, IndianRupee, AlertCircle, Calendar as CalendarIcon, 
  BellRing, Smartphone, FilterX, Star, GripVertical, MoreHorizontal, Clock,
  Printer, ArrowDown, ArrowUp, FileSpreadsheet
} from 'lucide-react';

interface CRMProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  initialFilter?: string | null;
}

const STAGES: { id: CrmStage; label: string; color: string }[] = [
  { id: 'NEW', label: 'New', color: 'bg-slate-500' },
  { id: 'QUALIFIED', label: 'Qualified', color: 'bg-amber-500' },
  { id: 'PROPOSITION', label: 'Proposition', color: 'bg-blue-500' },
  { id: 'WON', label: 'Won', color: 'bg-emerald-500' }
];

const CRM: React.FC<CRMProps> = ({ data, updateData, initialFilter }) => {
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'CUSTOMERS' | 'SUPPLIERS'>('PIPELINE');
  const [searchTerm, setSearchTerm] = useState(initialFilter || '');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showOppModal, setShowOppModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Customer | Supplier | null>(null);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [historyParty, setHistoryParty] = useState<Customer | Supplier | null>(null);
  const [showSettled, setShowSettled] = useState(false);

  // Drag and Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filteredCustomers = data.customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm) ||
      c.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(searchTerm.toLowerCase());
    if (searchTerm) return matchesSearch;
    if (!showSettled) return matchesSearch && c.outstandingBalance > 0;
    return matchesSearch;
  });

  const filteredSuppliers = data.suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.phone.includes(searchTerm);
    if (searchTerm) return matchesSearch;
    if (!showSettled) return matchesSearch && s.outstandingBalance !== 0;
    return matchesSearch;
  });

  const filteredOpportunities = useMemo(() => {
    if (!searchTerm) return data.opportunities;
    const s = searchTerm.toLowerCase();
    return data.opportunities.filter(o => 
      o.title.toLowerCase().includes(s) || 
      o.customerName.toLowerCase().includes(s)
    );
  }, [data.opportunities, searchTerm]);

  const handleSaveParty = (party: Customer | Supplier) => {
    const isSupplier = activeTab === 'SUPPLIERS';
    const key = isSupplier ? 'suppliers' : 'customers';
    let updatedList = [...(data[key] as any)];
    if (editingParty) {
      const idx = updatedList.findIndex(p => p.id === editingParty.id);
      updatedList[idx] = { ...party, outstandingBalance: editingParty.outstandingBalance };
    } else {
      updatedList.push({ ...party, id: Math.random().toString(36).substr(2, 9), outstandingBalance: 0 });
    }
    updateData({ [key]: updatedList });
    setShowPartyModal(false);
    setEditingParty(null);
  };

  const handleDeleteParty = (id: string) => {
    const isSupplier = activeTab === 'SUPPLIERS';
    const key = isSupplier ? 'suppliers' : 'customers';
    if (confirm(`Permanently remove this ${isSupplier ? 'supplier' : 'customer'} from the master registry?`)) {
      const updated = (data[key] as any[]).filter(p => p.id !== id);
      updateData({ [key]: updated });
    }
  };

  const handleSaveOpp = (opp: Opportunity) => {
    let updatedOpps = [...data.opportunities];
    if (editingOpp) {
      const idx = updatedOpps.findIndex(o => o.id === editingOpp.id);
      updatedOpps[idx] = opp;
    } else {
      updatedOpps.push({ ...opp, id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString() });
    }
    updateData({ opportunities: updatedOpps });
    setShowOppModal(false);
    setEditingOpp(null);
  };

  const moveOpp = (id: string, newStage: CrmStage) => {
    const updated = data.opportunities.map(o => o.id === id ? { ...o, stage: newStage } : o);
    updateData({ opportunities: updated });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('oppId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: CrmStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('oppId');
    if (id) {
      moveOpp(id, stage);
    }
    setDraggedId(null);
  };

  const handleSendWhatsApp = (party: Customer | Supplier) => {
    const msg = `Greetings from ${data.companyProfile.name}. This is a friendly reminder regarding your outstanding balance of ₹${party.outstandingBalance.toLocaleString()}. Kindly settle at your earliest convenience. Thank you.`;
    const encoded = encodeURIComponent(msg);
    const phone = party.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/91${phone}?text=${encoded}`, '_blank');
  };

  // Ledger Logic
  const ledgerRecords = useMemo(() => {
    if (!historyParty) return [];
    
    // 1. Get all invoices for this party
    const invoices = data.invoices.filter(inv => inv.partyId === historyParty.id);
    
    // 2. Get all transactions that mention this party by name in the description
    // Note: This matches how Payments.tsx posts transactions
    const transactions = data.transactions.filter(tx => 
      tx.description.includes(historyParty.name) && 
      !invoices.some(inv => tx.description.includes(inv.invoiceNo)) // Avoid duplicating invoice payment entries if they exist separately
    );

    // 3. Map both to a unified ledger structure
    const unified: { date: string, type: 'DEBIT' | 'CREDIT', amount: number, description: string, ref: string, runningBalance: number }[] = [];

    // Invoices are special: The grandTotal is a DEBIT (for sales) or CREDIT (for purchases)
    // The amountPaid is the opposite.
    invoices.forEach(inv => {
      const isSale = inv.type === 'SALE';
      // Step A: The Invoice itself (Accrual)
      unified.push({
        date: inv.date,
        type: isSale ? 'DEBIT' : 'CREDIT',
        amount: inv.grandTotal,
        description: `${isSale ? 'Sale' : 'Purchase'} Invoice #${inv.invoiceNo}`,
        ref: inv.invoiceNo,
        runningBalance: 0
      });
      // Step B: The Payment made at the time of invoice
      if (inv.amountPaid > 0) {
        unified.push({
          date: inv.date,
          type: isSale ? 'CREDIT' : 'DEBIT',
          amount: inv.amountPaid,
          description: `Payment [${inv.paymentMode}] against Inv #${inv.invoiceNo}`,
          ref: inv.invoiceNo,
          runningBalance: 0
        });
      }
    });

    // Pure transactions (Direct payments/receipts)
    transactions.forEach(tx => {
      unified.push({
        date: tx.date,
        type: tx.type, // CREDIT or DEBIT from the transaction object
        amount: tx.amount,
        description: tx.description,
        ref: 'TX-' + tx.id.slice(0, 4).toUpperCase(),
        runningBalance: 0
      });
    });

    // 4. Sort by date ascending to calculate running balance
    unified.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentBalance = 0;
    const withBalance = unified.map(entry => {
      // Logic: For a customer, DEBIT increases what they owe, CREDIT decreases it.
      // In our ledger, we use a single running balance where Positive = Due from Party, Negative = Advance from Party
      // For Supplier, it's reversed.
      // To keep it simple for the user, we follow the "Outstanding Balance" logic:
      // Amount Due increases with Invoice (Sale for Cust, Purchase for Supp), decreases with Payment.
      
      const isSaleRelated = activeTab === 'CUSTOMERS';
      
      if (isSaleRelated) {
        // Customer Ledger: Sale is Debit(+), Payment is Credit(-)
        if (entry.type === 'DEBIT') currentBalance += entry.amount;
        else currentBalance -= entry.amount;
      } else {
        // Supplier Ledger: Purchase is Credit(+), Payment is Debit(-)
        // Wait, to keep consistency with the party detail view: 
        // Suppliers usually have a balance we OWE them.
        if (entry.type === 'CREDIT') currentBalance += entry.amount;
        else currentBalance -= entry.amount;
      }

      return { ...entry, runningBalance: currentBalance };
    });

    return withBalance.reverse(); // Newest first for the table
  }, [historyParty, data.invoices, data.transactions, activeTab]);

  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          #printable-ledger-modal { 
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            z-index: 9999 !important;
            padding: 40px !important;
            display: block !important;
          }
          body * { visibility: hidden; }
          #printable-ledger-modal, #printable-ledger-modal * { visibility: visible; }
        }
      `}</style>

      {/* Dynamic Header */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 no-print">
        <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm w-full xl:w-auto">
          <button onClick={() => setActiveTab('PIPELINE')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'PIPELINE' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>Sales Pipeline</button>
          <button onClick={() => setActiveTab('CUSTOMERS')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'CUSTOMERS' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>Accounts</button>
          <button onClick={() => setActiveTab('SUPPLIERS')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'SUPPLIERS' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>Vendors</button>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-blue-500" />
            <input type="text" placeholder={`Filter ${activeTab.toLowerCase()}...`} className="pl-12 pr-4 py-4 w-full bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
          </div>

          {activeTab === 'PIPELINE' ? (
            <button onClick={() => { setEditingOpp(null); setShowOppModal(true); }} className="w-full md:w-auto px-8 py-4 text-[11px] font-black text-white bg-blue-600 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-100 active:scale-95 transition-all uppercase tracking-widest">
              <Plus size={18} strokeWidth={3} /> New Opportunity
            </button>
          ) : (
            <button onClick={() => { setEditingParty(null); setShowPartyModal(true); }} className={`w-full md:w-auto px-8 py-4 text-[11px] font-black text-white rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 uppercase tracking-widest ${activeTab === 'CUSTOMERS' ? 'bg-slate-900 shadow-slate-100' : 'bg-emerald-600 shadow-emerald-100'}`}>
              <UserPlus size={18} strokeWidth={3} /> New Registry
            </button>
          )}
        </div>
      </div>

      {activeTab === 'PIPELINE' ? (
        <div className="overflow-x-auto pb-6 no-print">
          <div className="flex gap-6 min-w-[1200px] h-[calc(100vh-280px)]">
            {STAGES.map(stage => {
              const oppsInStage = filteredOpportunities.filter(o => o.stage === stage.id);
              const totalRevenue = oppsInStage.reduce((acc, curr) => acc + curr.expectedRevenue, 0);
              
              return (
                <div 
                  key={stage.id} 
                  className="flex-1 flex flex-col bg-slate-50/50 rounded-[2rem] border border-slate-100 group/column"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className="p-5 flex flex-col gap-1 border-b border-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                         <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{stage.label}</h3>
                      </div>
                      <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-white rounded-lg transition-all"><Plus size={16}/></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                       <span className="text-[10px] font-black text-slate-400 tabular-nums">₹{totalRevenue.toLocaleString()}</span>
                       <span className="text-[10px] font-black text-slate-300 uppercase">{oppsInStage.length} Cards</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {oppsInStage.map(opp => (
                      <div 
                        key={opp.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-grab active:cursor-grabbing group/card relative ${draggedId === opp.id ? 'opacity-30' : ''}`}
                        onClick={() => { setEditingOpp(opp); setShowOppModal(true); }}
                      >
                        <div className="flex items-start justify-between mb-3">
                           <h4 className="font-black text-slate-800 text-xs uppercase tracking-tight leading-tight line-clamp-2 pr-4">{opp.title}</h4>
                           <button className="p-1 text-slate-200 hover:text-slate-600 opacity-0 group-hover/card:opacity-100 transition-all"><MoreHorizontal size={14}/></button>
                        </div>
                        
                        <div className="flex flex-col gap-2 mb-4">
                           <div className="flex items-center gap-2">
                              <UserCircle size={14} className="text-slate-300" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{opp.customerName}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <IndianRupee size={14} className="text-blue-500" />
                              <span className="text-xs font-black text-slate-900 tabular-nums">₹{opp.expectedRevenue.toLocaleString()}</span>
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                           <div className="flex items-center gap-1">
                              {[1, 2, Star].map((_, star) => (
                                <Star 
                                  key={star} 
                                  size={12} 
                                  className={(star + 1) <= opp.priority ? "text-amber-400 fill-amber-400" : "text-slate-100"} 
                                />
                              ))}
                           </div>
                           <div className="flex items-center gap-2">
                              <button className="p-1.5 bg-slate-50 text-slate-300 rounded-lg hover:text-blue-500 hover:bg-blue-50 transition-all"><Phone size={12}/></button>
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border border-white">
                                {opp.customerName.charAt(0)}
                              </div>
                           </div>
                        </div>
                      </div>
                    ))}
                    {oppsInStage.length === 0 && (
                      <div className="h-20 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center">
                        <span className="text-[9px] font-black text-slate-200 uppercase">Drop cards here</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'CUSTOMERS' || activeTab === 'SUPPLIERS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 no-print">
          {(activeTab === 'CUSTOMERS' ? filteredCustomers : filteredSuppliers).map(party => (
            <div key={party.id} className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] transition-all group overflow-hidden flex flex-col hover:-translate-y-1 ${party.outstandingBalance > 0 ? 'border-rose-100 ring-2 ring-rose-50' : 'opacity-80 grayscale-[0.3] hover:grayscale-0'}`}>
              <div className={`p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start ${party.outstandingBalance > 0 ? 'bg-rose-50/30' : ''}`}>
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-inner ${party.outstandingBalance > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>
                    {party.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg leading-tight uppercase truncate max-w-[150px]">{party.name}</h4>
                    <div className="flex flex-col gap-1 mt-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 tracking-widest"><Hash size={12}/> {party.gstin || 'B2C'}</p>
                       {party.outstandingBalance === 0 && (
                         <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 w-fit">Settled Account</span>
                       )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { setEditingParty(party); setShowPartyModal(true); }} className="p-3 bg-white text-slate-300 hover:text-blue-600 rounded-xl transition-all border border-slate-100 shadow-sm"><Edit3 size={18}/></button>
                  <button onClick={() => handleDeleteParty(party.id)} className="p-3 bg-white text-slate-300 hover:text-rose-600 rounded-xl transition-all border border-slate-100 shadow-sm"><Trash2 size={18}/></button>
                </div>
              </div>
              
              <div className="p-8 space-y-6 flex-1">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-slate-600">
                    <div className="p-2.5 bg-slate-50 rounded-xl shadow-inner"><Phone size={16} className="text-slate-400" /></div>
                    <span className="text-sm font-black tracking-tight">{party.phone}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600">
                    <div className="p-2.5 bg-slate-50 rounded-xl shadow-inner"><MapPinned size={16} className="text-slate-400" /></div>
                    <span className="text-sm font-bold truncate tracking-tight">{party.area || 'Direct Market'}</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Net Ledger</p>
                    <p className={`text-lg font-black tracking-tighter tabular-nums ${party.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{party.outstandingBalance.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engagement</p>
                    {party.outstandingBalance > 0 ? (
                      <button onClick={() => handleSendWhatsApp(party)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5">
                        <Smartphone size={14} /><span className="text-[8px] font-black uppercase tracking-widest">WhatsApp</span>
                      </button>
                    ) : (
                      <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 flex items-center gap-1.5">
                         <CheckCircle2 size={14} /><span className="text-[8px] font-black uppercase tracking-widest">No Dues</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-8 py-5 bg-slate-50/80 border-t border-slate-100 flex gap-3">
                <button onClick={() => setHistoryParty(party)} className="flex-1 py-3.5 text-[10px] font-black text-slate-600 bg-white border border-slate-200 rounded-[1.2rem] hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3 uppercase tracking-[0.15em] shadow-sm">
                  <History size={16} /> Statement & Ledger
                </button>
                <button className={`px-5 py-3.5 rounded-[1.2rem] transition-all shadow-lg active:scale-95 flex items-center justify-center ${party.outstandingBalance > 0 ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}>
                  <ArrowRightCircle size={20} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Ledger History Modal */}
      {historyParty && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div id="printable-ledger-modal" className="bg-white rounded-[3.5rem] w-full max-w-6xl overflow-hidden shadow-2xl animate-in zoom-in border border-white/20 flex flex-col max-h-[95vh]">
            <div className="p-8 border-b flex items-center justify-between bg-slate-50/50 no-print">
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-[1.5rem] shadow-xl ${activeTab === 'SUPPLIERS' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                  <History size={28}/>
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">{historyParty.name} — Master Ledger</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">Comprehensive Statement of Account</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handlePrintLedger} className="px-6 py-3.5 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl text-[11px] font-black flex items-center gap-2 uppercase tracking-widest hover:border-slate-300 transition-all">
                  <Printer size={18} className="text-blue-600" /> Print Statement
                </button>
                <button onClick={() => setHistoryParty(null)} className="p-4 text-slate-400 hover:bg-white rounded-full transition-all"><X size={32}/></button>
              </div>
            </div>

            <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-8">
               <div className="flex justify-between items-start">
                  <div>
                     <h1 className="text-4xl font-black uppercase tracking-tighter">{data.companyProfile.name}</h1>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">{data.companyProfile.address}</p>
                     <p className="text-xs font-black text-blue-600 uppercase mt-1">GSTIN: {data.companyProfile.gstin}</p>
                  </div>
                  <div className="text-right">
                     <h2 className="text-2xl font-black uppercase tracking-widest text-slate-400">Statement of Account</h2>
                     <p className="text-sm font-bold text-slate-800 mt-2">{historyParty.name}</p>
                     <p className="text-xs text-slate-500">{historyParty.address}</p>
                  </div>
               </div>
            </div>

            <div className="overflow-y-auto flex-1 p-8 bg-white">
              {ledgerRecords.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b">
                    <tr>
                      <th className="px-6 py-5">Timeline</th>
                      <th className="px-6 py-5">Voucher / Description</th>
                      <th className="px-6 py-5 text-center">Reference</th>
                      <th className="px-6 py-5 text-right">Debit (Dr)</th>
                      <th className="px-6 py-5 text-right">Credit (Cr)</th>
                      <th className="px-8 py-5 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerRecords.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5 text-xs font-black text-slate-500 tabular-nums">
                          {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                             <p className="text-xs font-bold text-slate-800 uppercase tracking-tight leading-relaxed">{entry.description}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                           <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[9px] font-black text-slate-400 uppercase">{entry.ref}</span>
                        </td>
                        <td className="px-6 py-5 text-right text-sm font-black text-rose-600 tabular-nums">
                          {entry.type === 'DEBIT' ? `₹${entry.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-6 py-5 text-right text-sm font-black text-emerald-600 tabular-nums">
                          {entry.type === 'CREDIT' ? `₹${entry.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-8 py-5 text-right font-black text-slate-900 tabular-nums text-base">
                          ₹{entry.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-20 text-center">
                  <FileText size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No ledger entries found for this identity</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t flex justify-between items-center no-print">
              <div className="flex gap-10">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Ledger Exposure</p>
                  <div className="flex items-center gap-3">
                     <p className={`text-2xl font-black tabular-nums ${historyParty.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₹{historyParty.outstandingBalance.toLocaleString()}</p>
                     <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${historyParty.outstandingBalance > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                        {activeTab === 'CUSTOMERS' ? (historyParty.outstandingBalance > 0 ? 'Receivable' : 'Advance Cr.') : (historyParty.outstandingBalance > 0 ? 'Payable' : 'Paid Dr.')}
                     </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-6 shadow-sm">
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Updated</p>
                       <p className="text-xs font-black text-slate-700">{ledgerRecords.length > 0 ? new Date(ledgerRecords[0].date).toLocaleDateString() : 'Never'}</p>
                    </div>
                    <History size={20} className="text-blue-500" />
                 </div>
              </div>
            </div>

            <div className="hidden print:block mt-12 pt-8 border-t border-slate-100 text-center">
               <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.5em]">This is a computer generated ledger statement from USHA Sales Corp Infrastructure</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPartyModal && (
        <PartyModal party={editingParty} type={activeTab === 'SUPPLIERS' ? 'SUPPLIER' : 'CUSTOMER'} onClose={() => setShowPartyModal(false)} onSave={handleSaveParty} />
      )}
      {showOppModal && (
        <OppModal opp={editingOpp} customers={data.customers} onClose={() => setShowOppModal(false)} onSave={handleSaveOpp} />
      )}
    </div>
  );
};

// Opportunity Modal
const OppModal: React.FC<{ opp: Opportunity | null, customers: Customer[], onClose: () => void, onSave: (o: Opportunity) => void }> = ({ opp, customers, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>(opp || { 
    title: '', customerId: '', customerName: '', expectedRevenue: 0, 
    probability: 50, stage: 'NEW', priority: 1, date: new Date().toISOString() 
  });

  const handleCustomerChange = (id: string) => {
    const cust = customers.find(c => c.id === id);
    setFormData({ ...formData, customerId: id, customerName: cust?.name || '' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[160] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in border border-white/20">
        <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl"><TrendingUp size={28}/></div>
              <div>
                <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">{opp ? 'Modify Deal' : 'New Sales Lead'}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">Pipeline Opportunity Registry</p>
              </div>
           </div>
           <button onClick={onClose} className="p-4 text-slate-400 hover:bg-white rounded-full transition-all"><X size={32}/></button>
        </div>
        <div className="p-12 space-y-8 max-h-[65vh] overflow-y-auto">
          <div className="space-y-3">
             <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Opportunity Title *</label>
             <input autoFocus className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none" placeholder="e.g. Bulk Supply of MS Pipes" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Commercial Account</label>
              <select className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-white focus:border-blue-500 outline-none" value={formData.customerId} onChange={e => handleCustomerChange(e.target.value)}>
                <option value="">Choose Account...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pipeline Stage</label>
              <select className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-white focus:border-blue-500 outline-none" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value as any})}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">Expected Revenue (₹)</label>
              <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-base font-black bg-blue-50 text-blue-700 outline-none focus:border-blue-500" value={formData.expectedRevenue} onChange={e => setFormData({...formData, expectedRevenue: Number(e.target.value)})} />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Hotness / Priority</label>
              <div className="flex items-center gap-6 h-16 px-6 bg-slate-50 rounded-2xl border-2 border-slate-100">
                {[1, 2, 3].map(val => (
                  <button key={val} type="button" onClick={() => setFormData({...formData, priority: val})} className="transition-all hover:scale-125">
                    <Star size={24} className={val <= formData.priority ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-10 bg-slate-50 border-t flex justify-end gap-6">
          <button onClick={onClose} className="px-10 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Discard</button>
          <button onClick={() => onSave(formData)} className="px-16 py-5 text-xs font-black text-white bg-blue-600 rounded-2xl shadow-2xl shadow-blue-100 transition-all active:scale-95 uppercase tracking-[0.25em]">Save to Pipeline</button>
        </div>
      </div>
    </div>
  );
};

const PartyModal: React.FC<{ party: Customer | Supplier | null, type: 'CUSTOMER' | 'SUPPLIER', onClose: () => void, onSave: (p: Customer | Supplier) => void }> = ({ party, type, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>(party || { id: '', name: '', contactPerson: '', phone: '', address: '', gstin: '', area: '', email: '', remarks: '', outstandingBalance: 0, paymentReminderDate: '' });
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[160] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in border border-white/20">
        <div className="p-10 border-b flex items-center justify-between bg-slate-50/50"><div className="flex items-center gap-5"><div className={`p-4 rounded-[1.5rem] shadow-2xl ${type === 'CUSTOMER' ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'}`}><Building2 size={28}/></div><div><h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">{party ? 'Modify Identity' : 'Register New Entity'}</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">Registry Management Pass</p></div></div><button onClick={onClose} className="p-4 text-slate-400 hover:bg-white rounded-full transition-all"><X size={32}/></button></div>
        <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-10 max-h-[65vh] overflow-y-auto">
          <div className="md:col-span-2 space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Company / Legal Name *</label><input autoFocus className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none" placeholder="Strategic Corp" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Primary Phone *</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none" placeholder="10 Digit Mobile" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
          <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Market Area / City</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none" placeholder="Market / Locality" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} /></div>
          <div className="md:col-span-2 border-t pt-8 space-y-6"><div className="flex items-center gap-3"><BellRing size={20} className="text-rose-500" /><h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Payment Collection Reminder</h4></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reminder Date</label><input type="date" className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold bg-white focus:border-rose-500 outline-none" value={formData.paymentReminderDate || ''} onChange={e => setFormData({...formData, paymentReminderDate: e.target.value})} /></div><div className="flex items-center justify-center p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center"><p className="text-[9px] font-bold text-rose-600 uppercase">Set to trigger alert on Hub.</p></div></div></div>
          <div className="md:col-span-2 space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Office Address</label><textarea rows={2} className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none" placeholder="Full address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
        </div>
        <div className="p-10 bg-slate-50 border-t flex justify-end gap-6"><button onClick={onClose} className="px-10 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Discard</button><button onClick={() => onSave(formData)} className={`px-16 py-5 text-xs font-black text-white rounded-2xl shadow-2xl transition-all active:scale-95 uppercase tracking-[0.25em] ${type === 'CUSTOMER' ? 'bg-slate-900 shadow-slate-200' : 'bg-emerald-600 shadow-emerald-200'}`}>Commit to Master Registry</button></div>
      </div>
    </div>
  );
};

export default CRM;

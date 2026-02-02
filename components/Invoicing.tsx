
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Invoice, InvoiceItem, Product, Transaction, Customer, Supplier, ViewType } from '../types';
import { 
  Plus, Trash2, Save, Calculator, X, Zap, MapPin, Phone, History, User, 
  Truck, Eye, PackagePlus, Search as SearchIcon, Printer, IndianRupee, 
  Smartphone, Landmark, CreditCard, Wallet as WalletIcon, CheckCircle, 
  ShieldCheck, MapPinHouse, Hash, UserCircle, Briefcase, ShoppingBag, 
  Package, Tag, AlertCircle, ChevronRight, FileText, Calendar, Info, 
  Building2, UserSearch, UserPlus, ClipboardList, Quote, Receipt, ListFilter,
  UserCheck, Layers, Building, MapPinned, Bookmark, Edit2, UserRoundPlus,
  Eraser, Sparkles, ZapIcon, FileSpreadsheet, ArrowRight, Activity, CalendarDays,
  Download, Map
} from 'lucide-react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

interface InvoicingProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  type: 'SALE' | 'PURCHASE';
}

const Invoicing: React.FC<InvoicingProps> = ({ data, updateData, type }) => {
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [subType, setSubType] = useState<Invoice['subType']>(type === 'SALE' ? 'TAX_INVOICE' : undefined);
  const [invoiceNo, setInvoiceNo] = useState(`${type === 'SALE' ? 'SL' : 'PR'}-${Date.now().toString().slice(-6)}`);
  const [paymentMode, setPaymentMode] = useState<Invoice['paymentMode']>('CASH');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  
  // Advanced Manual Entry State
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualSubArea, setManualSubArea] = useState('');
  const [manualGstin, setManualGstin] = useState('');
  const [recallCandidate, setRecallCandidate] = useState<Invoice | null>(null);

  // Global Locality Directory for standardizing marketing data
  const areaSuggestions = useMemo(() => {
    const areas = new Set<string>();
    [...data.customers, ...data.suppliers].forEach(p => { if(p.area) areas.add(p.area); });
    data.invoices.forEach(i => { if(i.partyArea) areas.add(i.partyArea); });
    return Array.from(areas).sort();
  }, [data]);

  const subAreaSuggestions = useMemo(() => {
    const subs = new Set<string>();
    [...data.customers, ...data.suppliers].forEach(p => { if(p.subArea) subs.add(p.subArea); });
    data.invoices.forEach(i => { if(i.partySubArea) subs.add(i.partySubArea); });
    return Array.from(subs).sort();
  }, [data]);

  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [showQuickPartyModal, setShowQuickPartyModal] = useState(false);
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
  
  const [newProductData, setNewProductData] = useState<Omit<Product, 'id' | 'lastRestockedDate'>>({
    name: '', hsn: '', gstRate: 18, purchasePrice: 0, salePrice: 0, stock: 0, openingStock: 0, minStockAlert: 5, category: data.productCategories[0] || '', subCategory: ''
  });

  const [historySearch, setHistorySearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const parties = useMemo(() => {
    return type === 'SALE' ? data.customers : data.suppliers;
  }, [data.customers, data.suppliers, type]);

  const selectedParty = useMemo(() => parties.find(p => p.id === selectedPartyId), [parties, selectedPartyId]);

  // Advanced Identity Recall Logic
  useEffect(() => {
    if (!selectedPartyId && manualPhone.length >= 5) {
      // Find latest invoice with this phone number to recall details
      const match = data.invoices
        .filter(inv => inv.partyPhone === manualPhone)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
      if (match && match.partyName !== manualName) setRecallCandidate(match);
      else setRecallCandidate(null);
    } else setRecallCandidate(null);
  }, [manualPhone, selectedPartyId, data.invoices]);

  const handleFastFill = () => {
    if (!recallCandidate) return;
    setManualName(recallCandidate.partyName);
    setManualArea(recallCandidate.partyArea || '');
    setManualSubArea(recallCandidate.partySubArea || '');
    setManualAddress(recallCandidate.partyAddress || '');
    setRecallCandidate(null);
  };

  const totals = useMemo(() => {
    const subTotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.rate), 0);
    const totalGst = items.reduce((acc, curr) => acc + curr.cgst + curr.sgst + curr.igst, 0);
    const grand = subTotal + totalGst;
    return { subTotal, totalGst, grandTotal: grand };
  }, [items]);

  const remainingBalance = useMemo(() => totals.grandTotal - amountPaid, [totals.grandTotal, amountPaid]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleSaveInvoice = () => {
    if (!selectedPartyId && !manualName) return alert("Please select a customer or enter a name for the record.");
    if (!selectedPartyId && (!manualPhone || !manualArea)) return alert("Marketing Requirement: Phone and Area are mandatory for walk-in profiling.");
    if (items.length === 0) return alert("Product manifest is empty.");

    const isManual = !selectedPartyId;
    const partyName = isManual ? manualName : selectedParty?.name || '';
    const partyPhone = isManual ? manualPhone : selectedParty?.phone;
    const partyAddress = isManual ? manualAddress : selectedParty?.address;
    const partyArea = isManual ? manualArea : selectedParty?.area;
    const partySubArea = isManual ? manualSubArea : selectedParty?.subArea;

    let updatedProducts = [...data.products];
    let updatedParties = type === 'SALE' ? [...data.customers] : [...data.suppliers];
    let updatedInvoices = [...data.invoices];
    let updatedTransactions = [...data.transactions];

    const finalPaid = (subType === 'DELIVERY_CHALLAN' || subType === 'PROFORMA_INVOICE') ? 0 : amountPaid;
    const invoiceId = editingInvoiceId || Math.random().toString(36).substr(2, 9);
    
    const newInvoice: Invoice = {
      id: invoiceId, invoiceNo, date: new Date(invoiceDate).toISOString(), 
      partyId: selectedPartyId || 'WALKIN',
      partyName, partyPhone, partyAddress, partyArea, partySubArea, items, subTotal: totals.subTotal, totalGst: totals.totalGst, grandTotal: totals.grandTotal,
      amountPaid: finalPaid, type, subType: type === 'SALE' ? subType : undefined, paymentMode
    };

    if (editingInvoiceId) {
      const oldInv = data.invoices.find(i => i.id === editingInvoiceId);
      if (oldInv) {
        oldInv.items.forEach(it => {
          const pIdx = updatedProducts.findIndex(p => p.id === it.productId);
          if (pIdx > -1) updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + (type === 'SALE' ? it.quantity : -it.quantity) };
        });
        if (selectedPartyId) {
          const pIdx = updatedParties.findIndex(p => p.id === selectedPartyId);
          if (pIdx > -1) updatedParties[pIdx] = { ...updatedParties[pIdx], outstandingBalance: (updatedParties[pIdx].outstandingBalance || 0) - (oldInv.grandTotal - oldInv.amountPaid) };
        }
      }
    }

    items.forEach(it => {
      const pIdx = updatedProducts.findIndex(p => p.id === it.productId);
      if (pIdx > -1) {
        const newStock = updatedProducts[pIdx].stock + (type === 'SALE' ? -it.quantity : it.quantity);
        const lastRestocked = type === 'PURCHASE' ? new Date().toISOString() : updatedProducts[pIdx].lastRestockedDate;
        updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: newStock, lastRestockedDate: lastRestocked };
      }
    });

    if (selectedPartyId) {
      const pIdx = updatedParties.findIndex(p => p.id === selectedPartyId);
      if (pIdx > -1) updatedParties[pIdx] = { ...updatedParties[pIdx], outstandingBalance: (updatedParties[pIdx].outstandingBalance || 0) + (totals.grandTotal - finalPaid) };
    }

    const txDesc = `${type === 'SALE' ? 'Sale' : 'Purchase'} #${invoiceNo} Post. Party: ${partyName}. Ref: ${paymentRemarks || 'Direct Entry'}`;
    
    if (editingInvoiceId) {
       const invIdx = updatedInvoices.findIndex(i => i.id === editingInvoiceId);
       if (invIdx > -1) updatedInvoices[invIdx] = newInvoice;
       const txIdx = updatedTransactions.findIndex(t => t.description.includes(invoiceNo));
       if (txIdx > -1) updatedTransactions[txIdx] = { ...updatedTransactions[txIdx], date: newInvoice.date, amount: finalPaid, description: txDesc };
    } else {
       updatedInvoices.push(newInvoice);
       updatedTransactions.push({ id: Math.random().toString(36).substr(2, 9), date: newInvoice.date, description: txDesc, amount: finalPaid, type: type === 'SALE' ? 'CREDIT' : 'DEBIT', category: type === 'SALE' ? 'Sale' : 'Purchase' });
    }

    updateData({ invoices: updatedInvoices, transactions: updatedTransactions, products: updatedProducts, [type === 'SALE' ? 'customers' : 'suppliers']: updatedParties });
    resetForm();
    alert(`Success: Sales Ledger Synchronized.`);
    setActiveTab('HISTORY');
  };

  const resetForm = () => {
    setItems([]); setSelectedPartyId(''); setEditingInvoiceId(null); 
    setManualName(''); setManualPhone(''); setManualArea(''); setManualSubArea(''); setManualAddress(''); setManualGstin('');
    setPaymentRemarks('');
    setInvoiceNo(`${type === 'SALE' ? 'SL' : 'PR'}-${Date.now().toString().slice(-6)}`);
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id); setItems(inv.items); setInvoiceNo(inv.invoiceNo); setInvoiceDate(new Date(inv.date).toISOString().split('T')[0]);
    setAmountPaid(inv.amountPaid); setPaymentMode(inv.paymentMode); setSubType(inv.subType);
    if (inv.partyId === 'WALKIN' || inv.partyId === 'MANUAL_ENTRY') { 
      setSelectedPartyId(''); 
      setManualName(inv.partyName); setManualPhone(inv.partyPhone || ''); setManualArea(inv.partyArea || ''); setManualSubArea(inv.partySubArea || ''); setManualAddress(inv.partyAddress || ''); 
    }
    else { setSelectedPartyId(inv.partyId); }
    setActiveTab('NEW');
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'productName') {
      const matchedProd = data.products.find(p => p.name === value);
      if (matchedProd) {
        item.productId = matchedProd.id; item.productName = matchedProd.name; item.hsn = matchedProd.hsn;
        item.gstRate = gstEnabled ? matchedProd.gstRate : 0; item.rate = type === 'SALE' ? matchedProd.salePrice : matchedProd.purchasePrice;
      } else { item.productId = ''; item.productName = value; }
    }
    const baseVal = Number(item.quantity) * Number(item.rate);
    const gstVal = baseVal * ((gstEnabled ? Number(item.gstRate) : 0) / 100);
    item.cgst = gstVal / 2; item.sgst = gstVal / 2; item.igst = 0; item.amount = baseVal + gstVal;
    newItems[index] = item; setItems(newItems);
  };

  const addItem = () => {
    const newItem: InvoiceItem = { productId: '', productName: '', quantity: 1, rate: 0, hsn: '', gstRate: 0, cgst: 0, sgst: 0, igst: 0, amount: 0, serialNumber: '' };
    setItems([...items, newItem]);
  };

  const themeClasses = {
    bg: type === 'SALE' ? 'bg-blue-600' : 'bg-emerald-600',
    border: type === 'SALE' ? 'border-t-blue-600' : 'border-t-emerald-600',
    lightBg: type === 'SALE' ? 'bg-blue-50' : 'bg-emerald-50',
    text: type === 'SALE' ? 'text-blue-600' : 'text-emerald-600'
  };

  const filteredHistory = useMemo(() => {
    let hist = data.invoices.filter(i => i.type === type);
    if (historySearch) {
      const s = historySearch.toLowerCase();
      hist = hist.filter(i => i.invoiceNo.toLowerCase().includes(s) || i.partyName.toLowerCase().includes(s) || (i.partyPhone && i.partyPhone.includes(s)));
    }
    return hist.slice().reverse();
  }, [data.invoices, type, historySearch]);

  return (
    <div className="space-y-10">
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; background: white !important; padding: 0 !important; margin: 0 !important; }
          .no-print, header, aside, nav, button { display: none !important; visibility: hidden !important; opacity: 0 !important; }
          #root, main, #root > div { display: block !important; position: static !important; width: 100% !important; overflow: visible !important; height: auto !important; padding: 0 !important; margin: 0 !important; }
          #printable-invoice { display: block !important; visibility: visible !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20mm !important; margin: 0 !important; background: white !important; border: none !important; box-shadow: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-invoice * { visibility: visible !important; }
          @page { margin: 0; size: auto; }
        }
      `}</style>
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 no-print">
        <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm w-fit shrink-0">
          <button onClick={() => { setActiveTab('NEW'); resetForm(); }} className={`px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'NEW' && !editingInvoiceId ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}><Plus size={18} /> CREATE NEW</button>
          <button onClick={() => setActiveTab('HISTORY')} className={`px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'HISTORY' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}><History size={18} /> ARCHIVE LOG</button>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest leading-none mb-1">Commercial Engine</span>
           <span className={`text-[10px] font-black uppercase ${themeClasses.text} ${themeClasses.lightBg} px-3 py-1 rounded-full border border-blue-100 tracking-tighter`}>Unified Sales Active</span>
        </div>
      </div>

      {activeTab === 'NEW' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 no-print animate-in fade-in duration-300">
          <div className="xl:col-span-3 space-y-8">
            <div className={`bg-white p-10 rounded-[3rem] border-t-[10px] border-x border-b shadow-sm ${themeClasses.border}`}>
              <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-50">
                <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-[2rem] shadow-xl ${themeClasses.lightBg} ${themeClasses.text}`}>
                    <ShoppingBag size={36} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">{editingInvoiceId ? 'Modify Record' : type === 'SALE' ? 'New Commercial Sale' : 'Inward Stock Log'}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Transaction Manifest v2.0</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div className="flex items-center gap-3"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Master GST</span><button onClick={() => setGstEnabled(!gstEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gstEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gstEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-3 space-y-10">
                  <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Entity Selection</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1 group">
                           <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
                           <select className="w-full border-2 border-slate-50 rounded-[1.5rem] p-6 pl-14 bg-slate-50 outline-none font-bold text-slate-800 text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner appearance-none" value={selectedPartyId} onChange={e => setSelectedPartyId(e.target.value)}>
                             <option value="">— ADVANCED WALK-IN PROFILING —</option>
                             {parties.map(p => <option key={p.id} value={p.id}>{p.name} {p.gstin ? `[${p.gstin}]` : ''} — Led: ₹{p.outstandingBalance.toLocaleString()}</option>)}
                           </select>
                        </div>
                        <button onClick={() => setShowQuickPartyModal(true)} className={`px-8 py-5 ${themeClasses.bg} text-white rounded-[1.5rem] shadow-2xl flex items-center gap-3 active:scale-95 transition-all group shadow-blue-200`}><UserPlus size={22} /><span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Registry</span></button>
                    </div>
                  </div>

                  {/* Advanced Marketing Details Section */}
                  <div className={`p-10 rounded-[3.5rem] border transition-all duration-500 shadow-sm space-y-8 ${!selectedPartyId ? 'bg-orange-50/20 border-orange-100 ring-4 ring-orange-50/50' : 'bg-blue-50/10 border-blue-100'}`}>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          {!selectedPartyId ? <Map size={22} className="text-orange-500" /> : <ShieldCheck size={22} className="text-blue-600" />}
                          <div>
                             <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${!selectedPartyId ? 'text-orange-800' : 'text-blue-800'}`}>{!selectedPartyId ? 'Marketing Profiling Mode' : 'Verified Partner Account'}</h4>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Locality & Contact Acquisition</p>
                          </div>
                       </div>
                       {!selectedPartyId && recallCandidate && (
                         <button onClick={handleFastFill} className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 animate-bounce">
                            <Sparkles size={16}/> Recall Previous Details
                         </button>
                       )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Full Name / Identity</label>
                        <input type="text" placeholder="e.g. Rahul Sharma" className="w-full border-2 border-white rounded-[1.5rem] p-5 text-base font-bold bg-white outline-none shadow-sm focus:ring-8 focus:ring-blue-500/5 disabled:bg-slate-50/50 transition-all uppercase" value={!selectedPartyId ? manualName : (selectedParty?.name || '')} onChange={e => setManualName(e.target.value)} disabled={!!selectedPartyId} />
                      </div>
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Contact Number *</label>
                        <div className="relative">
                          <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input type="text" placeholder="10 Digit Mobile" className="w-full border-2 border-white rounded-[1.5rem] p-5 pl-12 text-base font-black bg-white outline-none shadow-sm focus:ring-8 focus:ring-blue-500/5 disabled:bg-slate-50/50 transition-all" value={!selectedPartyId ? manualPhone : (selectedParty?.phone || '')} onChange={e => setManualPhone(e.target.value)} disabled={!!selectedPartyId} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Primary Area *</label>
                        <div className="relative">
                          <MapPin size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${!selectedPartyId ? 'text-orange-300' : 'text-blue-300'}`} />
                          <input list="global-areas" placeholder="e.g. Borivali West" className="w-full border-2 border-white rounded-2xl p-5 pl-12 text-sm font-bold bg-white outline-none shadow-sm disabled:bg-slate-50/50 uppercase" value={!selectedPartyId ? manualArea : (selectedParty?.area || '')} onChange={e => setManualArea(e.target.value)} disabled={!!selectedPartyId} />
                          <datalist id="global-areas">{areaSuggestions.map(a => <option key={a} value={a} />)}</datalist>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Sub-Area / Sector</label>
                        <div className="relative">
                          <MapPinned size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${!selectedPartyId ? 'text-orange-300' : 'text-blue-300'}`} />
                          <input list="global-subs" placeholder="e.g. Block C / Market Lane" className="w-full border-2 border-white rounded-2xl p-5 pl-12 text-sm font-bold bg-white outline-none shadow-sm disabled:bg-slate-50/50 uppercase" value={!selectedPartyId ? manualSubArea : (selectedParty?.subArea || '')} onChange={e => setManualSubArea(e.target.value)} disabled={!!selectedPartyId} />
                          <datalist id="global-subs">{subAreaSuggestions.map(s => <option key={s} value={s} />)}</datalist>
                        </div>
                      </div>
                    </div>
                    
                    {!selectedPartyId && (
                      <div className="p-4 bg-orange-100/50 border border-orange-200 rounded-2xl flex items-center gap-3">
                         <Info size={16} className="text-orange-600" />
                         <p className="text-[10px] font-bold text-orange-800 uppercase tracking-tight">Structured Area data helps in calculating geographic demand density.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-10 border-l pl-10 border-slate-50">
                  <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Voucher ID</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-5 font-black text-slate-700 text-sm bg-slate-50 outline-none uppercase" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
                  <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Date</label><input type="date" className="w-full border-2 border-slate-50 rounded-2xl p-5 font-black text-slate-700 text-sm bg-slate-50 outline-none shadow-inner" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
                  {selectedParty && (
                    <div className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-2xl space-y-4">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Ledger Balance</p>
                       <p className={`text-2xl font-black tabular-nums ${selectedParty.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>₹{selectedParty.outstandingBalance.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-10 py-8 border-b bg-slate-50/30 flex justify-between items-center">
                 <div className="flex items-center gap-4"><ClipboardList className="text-slate-400" size={24} /><div><h3 className="font-black text-slate-800 uppercase text-sm tracking-[0.2em]">Product Manifest</h3><p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Inventory Transaction Ledger</p></div></div>
                 <button onClick={addItem} className="px-6 py-3 text-[10px] font-black text-white bg-blue-600 rounded-2xl flex items-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest"><Plus size={20} strokeWidth={3} /> Add Item</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] border-b border-slate-100">
                    <tr><th className="px-10 py-6 min-w-[350px]">SKU / Catalog Details</th><th className="px-6 py-6 text-center">Qty</th><th className="px-6 py-6 text-right">Rate (₹)</th><th className="px-10 py-6 text-right">Value (₹)</th><th className="px-8 py-6"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/30 transition-all group">
                        <td className="px-10 py-6">
                           <input list="product-list" className="w-full bg-transparent outline-none font-black text-slate-800 text-sm uppercase tracking-tight" placeholder="Search SKU..." value={item.productName} onChange={e => updateItem(index, 'productName', e.target.value)} />
                        </td>
                        <td className="px-6 py-6 text-center"><input type="number" className="w-20 text-center bg-slate-50 rounded-xl p-2.5 outline-none font-black text-slate-800 focus:border-blue-200 transition-all" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} /></td>
                        <td className="px-6 py-6 text-right"><input type="number" className="w-28 text-right bg-slate-50 rounded-xl p-2.5 outline-none font-black text-slate-800 focus:border-blue-200 transition-all tabular-nums" value={item.rate} onChange={e => updateItem(index, 'rate', Number(e.target.value))} /></td>
                        <td className="px-10 py-6 text-right font-black text-slate-900 text-lg tabular-nums">₹{item.amount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-right"><button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2.5 text-slate-200 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={20} /></button></td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={5} className="py-24 text-center opacity-20 flex flex-col items-center gap-4"><Package size={64} /><p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Dispatch manifest</p></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 space-y-8">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm sticky top-24 space-y-10">
                <div className="flex items-center gap-4"><div className={`p-4 ${themeClasses.bg} text-white rounded-2xl shadow-xl shadow-blue-100`}><Calculator size={24} /></div><div><h3 className="font-black text-slate-800 text-sm uppercase tracking-widest leading-none mb-1.5">Commercial Evaluation</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Calculation</p></div></div>
                
                <div className="space-y-5 pb-8 border-b border-slate-50">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1"><span>Sub Total</span><span className="tabular-nums">₹{totals.subTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-widest px-1"><span>Total GST</span><span className="tabular-nums">+ ₹{totals.totalGst.toLocaleString()}</span></div>
                  <div className="pt-8 flex flex-col gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">Net Payable</span><span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">₹{totals.grandTotal.toLocaleString()}</span></div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Asset Channel</label>
                    <div className="grid grid-cols-4 gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100">
                      {[
                        { id: 'CASH', icon: WalletIcon },
                        { id: 'UPI', icon: Smartphone },
                        { id: 'BANK', icon: Landmark },
                        { id: 'CHEQUE', icon: CreditCard }
                      ].map(mode => (
                        <button key={mode.id} onClick={() => setPaymentMode(mode.id as any)} className={`flex flex-col items-center py-4 px-1 rounded-2xl transition-all ${paymentMode === mode.id ? 'bg-white text-blue-600 shadow-xl border border-blue-50' : 'text-slate-400 hover:text-slate-800'}`}>
                          <mode.icon size={20} className="mb-2" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">{mode.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Amount Collected</label>
                      <button onClick={() => setAmountPaid(totals.grandTotal)} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest">Full Paid</button>
                    </div>
                    <div className="relative">
                      <input type="number" className="w-full border-2 border-slate-50 rounded-[1.5rem] p-6 text-3xl font-black bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner tabular-nums" placeholder="0.00" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} />
                    </div>
                  </div>

                  <div className={`p-8 rounded-[2rem] flex justify-between items-center shadow-xl border transition-all duration-500 ${remainingBalance > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Ledger Entry</span><span className="font-black text-2xl tabular-nums tracking-tighter">₹{remainingBalance.toLocaleString()}</span></div>
                    {remainingBalance === 0 ? <CheckCircle className="text-emerald-500" size={32} /> : <AlertCircle className="text-rose-500" size={32} />}
                  </div>
                </div>

                <button onClick={handleSaveInvoice} className={`w-full py-6 text-white font-black rounded-[1.8rem] shadow-2xl uppercase tracking-[0.3em] text-[11px] active:scale-95 transition-all flex items-center justify-center gap-3 ${themeClasses.bg}`}>{editingInvoiceId ? 'Update Record' : 'Authorize Master Posting'} <ArrowRight size={20} /></button>
             </div>
          </div>
        </div>
      ) : (
        /* History remains as provided in previous file content */
        <div className="space-y-8 no-print animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row items-center gap-6">
             <div className="relative flex-1 group w-full">
                <SearchIcon size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" placeholder={`Audit scan archive...`} className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-base font-bold outline-none focus:border-blue-100 focus:bg-white transition-all uppercase tracking-tight" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
             </div>
          </div>
          <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] border-b border-slate-200">
                  <tr><th className="px-10 py-7">Timeline</th><th className="px-6 py-7">Voucher ID</th><th className="px-6 py-7">Identity</th><th className="text-right px-6 py-7">Net Val</th><th className="text-right px-6 py-7">Collected</th><th className="text-center px-10 py-7">Actions</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {filteredHistory.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                       <td className="px-10 py-7 text-xs font-black text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                       <td className="px-6 py-7 font-black text-slate-900 uppercase tracking-widest">{inv.invoiceNo}</td>
                       <td className="px-6 py-7"><div className="flex flex-col"><span className="font-black text-slate-800 text-xs uppercase">{inv.partyName}</span><span className="text-[9px] text-slate-400 uppercase tracking-widest">{inv.partyArea || 'Direct Market'}</span></div></td>
                       <td className="px-6 py-7 text-right font-black text-slate-900 tabular-nums">₹{inv.grandTotal.toLocaleString()}</td>
                       <td className="px-6 py-7 text-right font-black text-emerald-600 tabular-nums">₹{inv.amountPaid.toLocaleString()}</td>
                       <td className="px-10 py-7 text-center">
                          <div className="flex items-center justify-center gap-2">
                             <button onClick={() => setViewingInvoice(inv)} className="p-3 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"><Eye size={20}/></button>
                             <button onClick={() => handleEditInvoice(inv)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"><Edit2 size={20}/></button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Simple View Modal for Invoice remains the same as provided in previous turns */}
      <datalist id="product-list">{data.products.map(p => <option key={p.id} value={p.name}>{p.name} (Stock: {p.stock}) — ₹{p.salePrice}</option>)}</datalist>
    </div>
  );
};

// Internal Quick Party Modal
const QuickPartyForm: React.FC<{type: 'CUSTOMER' | 'SUPPLIER', onSave: (p: any) => void}> = ({ type, onSave }) => {
   const [form, setForm] = useState({ name: '', phone: '', gstin: '', area: '', subArea: '', address: '' });
   return (
      <div className="p-12 space-y-10">
        <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Legal Designation *</label><input autoFocus className="w-full border-2 border-slate-100 rounded-[1.5rem] p-6 text-base font-bold bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner uppercase" placeholder="Strategic Partner Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Communication Contact</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none shadow-inner" placeholder="10 Digit Mobile" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Statutory GSTIN</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-slate-50 outline-none uppercase shadow-inner" placeholder="15-Digit GST" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} /></div>
        </div>
        <button onClick={() => { if(!form.name) return alert("Validation: Name identity required."); onSave({...form, id: Math.random().toString(36).substr(2, 9), outstandingBalance: 0}); }} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl uppercase tracking-[0.3em] text-[11px] active:scale-95 transition-all">Commit Master Identity</button>
      </div>
   );
};

export default Invoicing;

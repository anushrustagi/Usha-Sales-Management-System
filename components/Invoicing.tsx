
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
  Download, Map as MapIcon, ShieldAlert, ChevronDown, Loader2
} from 'lucide-react';
// @ts-ignore
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
  const [invoiceNo, setInvoiceNo] = useState(`${type === 'SALE' ? 'SL' : 'PR'}-${Date.now().toString().slice(-6)}`);
  const [paymentMode, setPaymentMode] = useState<Invoice['paymentMode']>('CASH');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null); // For Print Preview & PDF
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null); // For View Details Modal
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null); // For Edit Mode
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Modals
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [showQuickPartyModal, setShowQuickPartyModal] = useState(false);

  // Manual Identity State (For Walk-ins or ad-hoc entries)
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualGstin, setManualGstin] = useState('');

  const parties = useMemo(() => {
    return type === 'SALE' ? data.customers : data.suppliers;
  }, [data.customers, data.suppliers, type]);

  const selectedParty = useMemo(() => parties.find(p => p.id === selectedPartyId), [parties, selectedPartyId]);

  const totals = useMemo(() => {
    const subTotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.rate), 0);
    const totalGst = items.reduce((acc, curr) => acc + curr.cgst + curr.sgst + curr.igst, 0);
    return { subTotal, totalGst, grandTotal: subTotal + totalGst };
  }, [items]);

  const remainingBalance = useMemo(() => totals.grandTotal - amountPaid, [totals.grandTotal, amountPaid]);

  const handlePrint = (invoice: Invoice | null) => {
    setViewingInvoice(invoice || {
        id: 'PREVIEW', invoiceNo, date: invoiceDate, partyId: selectedPartyId || 'WALKIN',
        partyName: selectedParty?.name || manualName || 'Walk-in Customer',
        partyPhone: selectedParty?.phone || manualPhone,
        partyAddress: selectedParty?.address || manualAddress,
        partyArea: selectedParty?.area || manualArea,
        items, subTotal: totals.subTotal, totalGst: totals.totalGst, grandTotal: totals.grandTotal,
        amountPaid, type, paymentMode
    });
    setTimeout(() => window.print(), 100);
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    window.scrollTo(0,0);
    setViewingInvoice(invoice);
    setIsGeneratingPdf(true);
    
    // Explicitly wait for the DOM to update and repaint
    setTimeout(() => {
      const element = document.getElementById('printable-invoice-content');
      if (element) {
        const opt = {
          margin: [10, 10, 10, 10], // mm
          filename: `Invoice_${invoice.invoiceNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0,
            logging: false,
            width: 794 // Approx width of A4 in pixels at 96 DPI
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(element).save().then(() => {
          setIsGeneratingPdf(false);
          setViewingInvoice(null);
        }).catch((err: any) => {
            console.error("PDF Generation Error", err);
            setIsGeneratingPdf(false);
            setViewingInvoice(null);
        });
      } else {
        console.error("Element not found for PDF generation");
        setIsGeneratingPdf(false);
      }
    }, 1000); // 1s delay to ensure full render
  };

  const handleSaveInvoice = () => {
    if (!selectedPartyId && !manualName) return alert("Validation: Identity required.");
    if (items.length === 0) return alert("Manifest: Add items.");

    // Prepare Copies for Atomic Update
    let updatedProducts = [...data.products];
    let updatedParties = type === 'SALE' ? [...data.customers] : [...data.suppliers];
    let updatedInvoices = [...data.invoices];
    let updatedTransactions = [...data.transactions];

    // --- 1. REVERT OLD DATA IF EDITING ---
    if (editingInvoice) {
        // Revert Stock
        editingInvoice.items.forEach(item => {
            const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
            if (pIdx > -1) {
                // If it was a sale, we gave stock, so add it back. If purchase, remove it.
                const diff = type === 'SALE' ? item.quantity : -item.quantity;
                updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + diff };
            }
        });
        // Revert Balance
        if (editingInvoice.partyId && editingInvoice.partyId !== 'WALKIN') {
            const pIdx = updatedParties.findIndex(p => p.id === editingInvoice.partyId);
            if (pIdx > -1) {
                const oldUnpaid = editingInvoice.grandTotal - editingInvoice.amountPaid;
                updatedParties[pIdx] = { ...updatedParties[pIdx], outstandingBalance: updatedParties[pIdx].outstandingBalance - oldUnpaid };
            }
        }
        // Remove Old Records
        updatedInvoices = updatedInvoices.filter(i => i.id !== editingInvoice.id);
        updatedTransactions = updatedTransactions.filter(t => !t.description.includes(`#${editingInvoice.invoiceNo}`));
    }

    // --- 2. APPLY NEW DATA ---
    const isManual = !selectedPartyId;
    const partyName = isManual ? manualName : selectedParty?.name || '';
    const partyPhone = isManual ? manualPhone : selectedParty?.phone;
    const partyAddress = isManual ? manualAddress : selectedParty?.address;
    const partyArea = isManual ? manualArea : selectedParty?.area;

    const invoiceId = editingInvoice ? editingInvoice.id : Math.random().toString(36).substr(2, 9);
    
    const newInvoice: Invoice = {
      id: invoiceId, invoiceNo, date: new Date(invoiceDate).toISOString(), 
      partyId: selectedPartyId || 'WALKIN',
      partyName, partyPhone, partyAddress, partyArea, items, subTotal: totals.subTotal, totalGst: totals.totalGst, grandTotal: totals.grandTotal,
      amountPaid, type, subType: type === 'SALE' ? 'TAX_INVOICE' : undefined, paymentMode
    };

    // Apply New Stock
    items.forEach(it => {
      const pIdx = updatedProducts.findIndex(p => p.id === it.productId);
      if (pIdx > -1) {
        const diff = type === 'SALE' ? -it.quantity : it.quantity;
        updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + diff };
      }
    });

    // Apply New Balance
    if (selectedPartyId) {
      const pIdx = updatedParties.findIndex(p => p.id === selectedPartyId);
      if (pIdx > -1) {
        updatedParties[pIdx] = { 
          ...updatedParties[pIdx], 
          outstandingBalance: (updatedParties[pIdx].outstandingBalance || 0) + (totals.grandTotal - amountPaid) 
        };
      }
    }

    updatedInvoices.push(newInvoice);
    updatedTransactions.push({ 
      id: Math.random().toString(36).substr(2, 9), 
      date: newInvoice.date, 
      description: `${type} #${invoiceNo} — ${partyName}`, 
      amount: amountPaid, 
      type: type === 'SALE' ? 'CREDIT' : 'DEBIT', 
      category: type === 'SALE' ? 'Sale' : 'Purchase' 
    });

    updateData({ 
      invoices: updatedInvoices, 
      transactions: updatedTransactions, 
      products: updatedProducts, 
      [type === 'SALE' ? 'customers' : 'suppliers']: updatedParties 
    });

    resetForm();
    setActiveTab('HISTORY');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setItems(inv.items);
    setInvoiceNo(inv.invoiceNo);
    setInvoiceDate(inv.date.split('T')[0]);
    setPaymentMode(inv.paymentMode);
    setAmountPaid(inv.amountPaid);
    
    if (inv.partyId === 'WALKIN') {
       setSelectedPartyId('');
       setManualName(inv.partyName);
       setManualPhone(inv.partyPhone || '');
       setManualAddress(inv.partyAddress || '');
       setManualArea(inv.partyArea || '');
    } else {
       setSelectedPartyId(inv.partyId);
    }
    setActiveTab('NEW');
  };

  const handleDeleteInvoice = (inv: Invoice) => {
    if (!confirm("Are you sure? This will revert stock and balances associated with this invoice.")) return;

    let updatedProducts = [...data.products];
    let updatedParties = type === 'SALE' ? [...data.customers] : [...data.suppliers];
    let updatedInvoices = [...data.invoices];
    let updatedTransactions = [...data.transactions];

    // Revert Stock
    inv.items.forEach(item => {
        const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (pIdx > -1) {
            const diff = type === 'SALE' ? item.quantity : -item.quantity;
            updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + diff };
        }
    });

    // Revert Balance
    if (inv.partyId && inv.partyId !== 'WALKIN') {
        const pIdx = updatedParties.findIndex(p => p.id === inv.partyId);
        if (pIdx > -1) {
            const unpaid = inv.grandTotal - inv.amountPaid;
            updatedParties[pIdx] = { ...updatedParties[pIdx], outstandingBalance: updatedParties[pIdx].outstandingBalance - unpaid };
        }
    }

    updatedInvoices = updatedInvoices.filter(i => i.id !== inv.id);
    updatedTransactions = updatedTransactions.filter(t => !t.description.includes(`#${inv.invoiceNo}`));

    updateData({ 
        invoices: updatedInvoices, 
        transactions: updatedTransactions, 
        products: updatedProducts, 
        [type === 'SALE' ? 'customers' : 'suppliers']: updatedParties 
    });
  };

  const resetForm = () => {
    setItems([]); setSelectedPartyId(''); setAmountPaid(0); setViewingInvoice(null); setEditingInvoice(null);
    setManualName(''); setManualPhone(''); setManualArea(''); setManualAddress(''); setManualGstin('');
    setInvoiceNo(`${type === 'SALE' ? 'SL' : 'PR'}-${Date.now().toString().slice(-6)}`);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'productName') {
      const matchedProd = data.products.find(p => p.name === value);
      if (matchedProd) {
        item.productId = matchedProd.id; item.productName = matchedProd.name; item.hsn = matchedProd.hsn;
        item.gstRate = gstEnabled ? matchedProd.gstRate : 0; item.rate = type === 'SALE' ? matchedProd.salePrice : matchedProd.purchasePrice;
      }
    }
    const baseVal = Number(item.quantity) * Number(item.rate);
    const gstVal = baseVal * ((gstEnabled ? Number(item.gstRate) : 0) / 100);
    item.cgst = gstVal / 2; item.sgst = gstVal / 2; item.igst = 0; item.amount = baseVal + gstVal;
    newItems[index] = item; setItems(newItems);
  };

  const themeClasses = {
    bg: type === 'SALE' ? 'bg-blue-600' : 'bg-emerald-600',
    text: type === 'SALE' ? 'text-blue-600' : 'text-emerald-600',
    lightBg: type === 'SALE' ? 'bg-blue-50' : 'bg-emerald-50'
  };

  return (
    <div className="space-y-10">
      <style>{`
        @media print {
          header, footer, nav, aside, .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; width: 210mm; }
          #root, main { display: block !important; height: auto !important; overflow: visible !important; }
          #printable-invoice-content { display: block !important; padding: 20mm !important; }
        }
      `}</style>
      
      {/* Loading Overlay during PDF Generation */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 bg-slate-900/90 z-[5000] flex flex-col items-center justify-center text-white no-print">
           <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
           <h3 className="text-xl font-black uppercase tracking-widest">Generating Invoice PDF</h3>
           <p className="text-sm text-slate-400 mt-2 font-bold">Please wait while the document is rendered...</p>
        </div>
      )}

      {/* Hidden Container for PDF Capture */}
      {viewingInvoice && (
        <div className={`fixed top-0 left-0 bg-white z-[4000] overflow-hidden ${isGeneratingPdf ? 'w-[210mm] min-h-[297mm] block' : 'hidden'}`}>
           <div id="printable-invoice-content" className="p-[20mm] bg-white text-slate-900 w-full h-full">
              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter">{data.companyProfile.name}</h1>
                  <p className="text-sm font-bold text-slate-600 mt-2 uppercase">{data.companyProfile.address}</p>
                  <p className="text-sm font-black text-blue-600 mt-1 uppercase tracking-widest">GSTIN: {data.companyProfile.gstin}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-black uppercase tracking-widest text-slate-300">{type === 'SALE' ? 'Tax Invoice' : 'Purchase Bill'}</h2>
                  <p className="text-sm font-black text-slate-800 mt-2">Voucher #: {viewingInvoice.invoiceNo}</p>
                  <p className="text-sm font-bold text-slate-500 mt-1">Date: {new Date(viewingInvoice.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">Account Detail</h4>
                   <p className="text-xl font-black text-slate-800 uppercase tracking-tight">{viewingInvoice.partyName}</p>
                   <p className="text-sm font-bold text-slate-600 mt-2 uppercase">{viewingInvoice.partyAddress || 'Direct Locality'}</p>
                   <p className="text-sm font-black text-slate-800 mt-1">Phone: {viewingInvoice.partyPhone}</p>
                </div>
                <div className="p-8 border border-slate-100 rounded-[2.5rem] flex flex-col justify-center">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">Commercial Summary</h4>
                   <p className="text-sm font-black text-slate-800 uppercase">Mode: {viewingInvoice.paymentMode}</p>
                   <p className="text-sm font-black text-slate-800 mt-1 uppercase">GST Profile: {gstEnabled ? 'Registered' : 'N/A'}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse mb-12">
                 <thead>
                    <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.3em]"><th className="p-5">Goods Description</th><th className="p-5 text-center">HSN</th><th className="p-5 text-center">Qty</th><th className="p-5 text-right">Rate</th><th className="p-5 text-right">Total (₹)</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 border-b-2 border-slate-200">
                    {viewingInvoice.items.map((it, i) => (
                      <tr key={i} className="text-sm font-bold text-slate-800 uppercase"><td className="p-5">{it.productName}</td><td className="p-5 text-center">{it.hsn || '—'}</td><td className="p-5 text-center">{it.quantity}</td><td className="p-5 text-right">₹{it.rate.toLocaleString()}</td><td className="p-5 text-right font-black text-slate-900">₹{it.amount.toLocaleString()}</td></tr>
                    ))}
                 </tbody>
              </table>

              <div className="flex justify-end">
                 <div className="w-96 space-y-4">
                    <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-widest"><span>Net Value</span><span>₹{viewingInvoice.subTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm font-black text-emerald-600 uppercase tracking-widest"><span>Tax Component</span><span>+ ₹{viewingInvoice.totalGst.toLocaleString()}</span></div>
                    <div className="pt-6 border-t-2 border-slate-900 flex justify-between text-2xl font-black text-slate-900 uppercase tracking-tight"><span>Grand Total</span><span>₹{viewingInvoice.grandTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm font-black text-blue-600 uppercase tracking-widest pt-2"><span>Paid Volume</span><span>₹{viewingInvoice.amountPaid.toLocaleString()}</span></div>
                 </div>
              </div>

              <div className="mt-32 pt-10 border-t border-slate-100 flex justify-between items-end">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em]">Integrated Voucher Registry</p>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Usha Sales Corp - Digital Hub</p>
                 </div>
                 <div className="text-right space-y-4">
                    <div className="h-20 w-48 border-b border-slate-300"></div>
                    <p className="text-[11px] font-black uppercase tracking-widest">Authorized Signatory</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-end gap-6 no-print">
        <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <button onClick={() => { setActiveTab('NEW'); resetForm(); }} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'NEW' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}><Plus size={18} /> New Voucher</button>
          <button onClick={() => setActiveTab('HISTORY')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'HISTORY' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}><History size={18} /> Logs</button>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest mb-1">Accounting Suite</span>
           <span className={`text-[10px] font-black uppercase ${themeClasses.text} ${themeClasses.lightBg} px-3 py-1 rounded-full border border-slate-200`}>{type} Cycle Active</span>
        </div>
      </div>

      {activeTab === 'NEW' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 no-print animate-in fade-in duration-300">
          <div className="xl:col-span-3 space-y-8">
            <div className={`bg-white p-10 rounded-[3rem] border-t-[12px] shadow-sm ${editingInvoice ? 'border-amber-500 ring-4 ring-amber-50' : themeClasses.bg}`}>
              <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-50">
                <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-[2rem] shadow-xl ${editingInvoice ? 'bg-amber-100 text-amber-600' : themeClasses.lightBg + ' ' + themeClasses.text}`}>
                     {editingInvoice ? <Edit2 size={36}/> : <ShoppingBag size={36} />}
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-1">{editingInvoice ? 'Modify Voucher' : (type === 'SALE' ? 'Sales Ledger' : 'Purchase Ledger')}</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{editingInvoice ? `Editing: ${editingInvoice.invoiceNo}` : 'Integrated Registry System'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enable GST</span><button onClick={() => setGstEnabled(!gstEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gstEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gstEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-3 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Select Identity</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                           <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                           <select className="w-full border-2 border-slate-50 rounded-[1.5rem] p-6 pl-14 bg-slate-50 outline-none font-bold text-slate-800 text-sm focus:border-blue-500 transition-all appearance-none" value={selectedPartyId} onChange={e => setSelectedPartyId(e.target.value)}>
                             <option value="">— WALK-IN / MANUAL ENTRY —</option>
                             {parties.map(p => <option key={p.id} value={p.id}>{p.name} {p.gstin ? `[${p.gstin}]` : ''} — Bal: ₹{p.outstandingBalance.toLocaleString()}</option>)}
                           </select>
                        </div>
                        <button onClick={() => setShowQuickPartyModal(true)} className={`px-8 py-5 ${themeClasses.bg} text-white rounded-[1.5rem] shadow-2xl flex items-center gap-3 active:scale-95 transition-all`} title="Register New Identity"><UserPlus size={22} /></button>
                    </div>
                  </div>

                  <div className={`p-8 rounded-[2.5rem] border transition-all shadow-sm space-y-6 ${!selectedPartyId ? 'bg-orange-50/20 border-orange-100 ring-4 ring-orange-50' : 'bg-slate-50 border-slate-100'}`}>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                      {!selectedPartyId ? <Zap size={16} className="text-orange-500" /> : <ShieldCheck size={16} className="text-blue-600" />}
                      {type === 'SALE' ? 'Customer Profile' : 'Supplier Profile'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400">Designation Name</label>
                        <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm disabled:opacity-50 uppercase" value={!selectedPartyId ? manualName : (selectedParty?.name || '')} onChange={e => setManualName(e.target.value)} disabled={!!selectedPartyId} placeholder="Full Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400">Primary Contact</label>
                        <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm disabled:opacity-50" value={!selectedPartyId ? manualPhone : (selectedParty?.phone || '')} onChange={e => setManualPhone(e.target.value)} disabled={!!selectedPartyId} placeholder="Phone" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400">Locality (Area)</label>
                        <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm disabled:opacity-50 uppercase" value={!selectedPartyId ? manualArea : (selectedParty?.area || '')} onChange={e => setManualArea(e.target.value)} disabled={!!selectedPartyId} placeholder="Area / Market" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400">Tax ID (GSTIN)</label>
                        <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm disabled:opacity-50 uppercase" value={!selectedPartyId ? manualGstin : (selectedParty?.gstin || '')} onChange={e => setManualGstin(e.target.value)} disabled={!!selectedPartyId} placeholder="GSTIN" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 border-l pl-10 border-slate-50">
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Voucher #</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-5 font-black text-slate-700 bg-slate-50 outline-none uppercase" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Timeline</label><input type="date" className="w-full border-2 border-slate-50 rounded-2xl p-5 font-black text-slate-700 bg-slate-50 outline-none" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-10 py-8 border-b bg-slate-50/50 flex justify-between items-center">
                 <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.25em]">Voucher Items</h3>
                 <div className="flex gap-3">
                    <button onClick={() => setShowQuickProductModal(true)} className="px-5 py-3 text-[9px] font-black text-slate-600 bg-slate-100 rounded-xl flex items-center gap-2 hover:bg-slate-200 transition-all uppercase tracking-widest"><PackagePlus size={16} /> Quick SKU</button>
                    <button onClick={() => setItems([...items, { productId: '', productName: '', quantity: 1, rate: 0, hsn: '', gstRate: 0, cgst: 0, sgst: 0, igst: 0, amount: 0 }])} className="px-6 py-3 text-[9px] font-black text-white bg-blue-600 rounded-xl flex items-center gap-2 shadow-xl active:scale-95 transition-all uppercase tracking-widest"><Plus size={16} strokeWidth={3} /> Add Line</button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/30 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                    <tr><th className="px-10 py-6 min-w-[300px]">Description of Goods</th><th className="px-6 py-6 text-center">Qty</th><th className="px-6 py-6 text-right">Rate</th><th className="px-10 py-6 text-right">Value</th><th className="px-8 py-6"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-6"><input list="plist" className="w-full bg-transparent outline-none font-bold text-slate-800 text-sm uppercase" placeholder="Start typing product name..." value={item.productName} onChange={e => updateItem(index, 'productName', e.target.value)} /></td>
                        <td className="px-6 py-6 text-center"><input type="number" className="w-20 text-center bg-slate-50 rounded-xl p-3 outline-none font-bold" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} /></td>
                        <td className="px-6 py-6 text-right"><input type="number" className="w-28 text-right bg-slate-50 rounded-xl p-3 outline-none font-bold" value={item.rate} onChange={e => updateItem(index, 'rate', Number(e.target.value))} /></td>
                        <td className="px-10 py-6 text-right font-black text-slate-900 tabular-nums">₹{item.amount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-right"><button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 space-y-8">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm sticky top-6 space-y-8">
                <div className="flex items-center gap-4"><div className={`p-4 ${themeClasses.bg} text-white rounded-2xl shadow-xl`}><Calculator size={24} /></div><h3 className="font-black text-slate-800 text-[11px] uppercase tracking-widest">Financial Summary</h3></div>
                
                <div className="space-y-4 pb-8 border-b border-slate-50">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Net Value</span><span className="tabular-nums">₹{totals.subTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-widest"><span>Total Tax (GST)</span><span className="tabular-nums">+ ₹{totals.totalGst.toLocaleString()}</span></div>
                  <div className="pt-6 flex flex-col gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Grand Total</span><span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">₹{totals.grandTotal.toLocaleString()}</span></div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Settled Amount</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-2xl font-black bg-slate-50 outline-none focus:border-blue-500" placeholder="0.00" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} /></div>
                  <div className={`p-6 rounded-2xl flex justify-between items-center ${remainingBalance > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-60">Balance Due</span><span className="font-black text-xl tabular-nums">₹{remainingBalance.toLocaleString()}</span></div>
                    {remainingBalance === 0 ? <CheckCircle className="text-emerald-500" size={28} /> : <AlertCircle className="text-rose-500" size={28} />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {editingInvoice && <button onClick={resetForm} className="py-4 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Cancel Edit</button>}
                    {!editingInvoice && <button onClick={() => handlePrint(null)} className="py-4 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center justify-center gap-2"><Printer size={16} /> Print</button>}
                    <button onClick={handleSaveInvoice} className={`py-4 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all ${editingInvoice ? 'col-span-1 bg-amber-600' : themeClasses.bg} ${!editingInvoice ? 'col-span-1' : ''}`}>{editingInvoice ? 'Update Voucher' : 'Post Ledger'}</button>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 no-print animate-in fade-in duration-500">
           <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                  <tr><th className="px-10 py-6">Date</th><th className="px-6 py-6">Voucher #</th><th className="px-6 py-6">Identity Profile</th><th className="text-right px-10 py-6">Grand Total</th><th className="px-10 py-6 text-center">Action</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {data.invoices.filter(i => i.type === type).slice().reverse().map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                       <td className="px-10 py-6 text-xs font-bold text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                       <td className="px-6 py-6 font-black text-slate-900">{inv.invoiceNo}</td>
                       <td className="px-6 py-6 font-bold text-slate-700 uppercase">{inv.partyName}</td>
                       <td className="px-10 py-6 text-right font-black text-blue-600 tabular-nums">₹{inv.grandTotal.toLocaleString()}</td>
                       <td className="px-10 py-6 text-center flex justify-center gap-2">
                          <button onClick={() => setDetailInvoice(inv)} className="p-3 bg-white text-slate-300 hover:text-blue-600 rounded-xl border border-slate-100 shadow-sm active:scale-90 transition-all" title="View Details"><Eye size={16}/></button>
                          <button onClick={() => handleEditInvoice(inv)} className="p-3 bg-white text-slate-300 hover:text-amber-600 rounded-xl border border-slate-100 shadow-sm active:scale-90 transition-all" title="Edit Voucher"><Edit2 size={16}/></button>
                          <button onClick={() => handlePrint(inv)} className="p-3 bg-white text-slate-300 hover:text-slate-600 rounded-xl border border-slate-100 shadow-sm active:scale-90 transition-all" title="Print"><Printer size={16}/></button>
                          <button onClick={() => handleDownloadPdf(inv)} className="p-3 bg-white text-slate-300 hover:text-indigo-600 rounded-xl border border-slate-100 shadow-sm active:scale-90 transition-all" title="Download PDF">
                             {isGeneratingPdf && viewingInvoice?.id === inv.id ? <Loader2 size={16} className="animate-spin text-indigo-600"/> : <Download size={16}/>}
                          </button>
                          <button onClick={() => handleDeleteInvoice(inv)} className="p-3 bg-white text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 shadow-sm active:scale-90 transition-all" title="Delete"><Trash2 size={16}/></button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {detailInvoice && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[500] flex items-center justify-center p-4 no-print">
           <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in border border-white/20 flex flex-col max-h-[85vh]">
              <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl shadow-xl bg-blue-600 text-white"><FileText size={24}/></div>
                    <div><h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Voucher Details</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{detailInvoice.invoiceNo}</p></div>
                 </div>
                 <button onClick={() => setDetailInvoice(null)} className="p-3 text-slate-400 hover:bg-white rounded-full transition-all"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Party Name</p><p className="text-sm font-black text-slate-800 uppercase">{detailInvoice.partyName}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</p><p className="text-sm font-bold text-slate-600">{new Date(detailInvoice.date).toLocaleDateString()}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Mode</p><p className="text-sm font-bold text-slate-600 uppercase">{detailInvoice.paymentMode}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p><p className={`text-sm font-bold uppercase ${detailInvoice.grandTotal === detailInvoice.amountPaid ? 'text-emerald-600' : 'text-rose-600'}`}>{detailInvoice.grandTotal === detailInvoice.amountPaid ? 'Fully Paid' : 'Partial/Due'}</p></div>
                 </div>
                 
                 <table className="w-full text-left">
                    <thead className="bg-white text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-100">
                       <tr><th className="py-3">Item</th><th className="py-3 text-center">HSN</th><th className="py-3 text-center">Qty</th><th className="py-3 text-right">Rate</th><th className="py-3 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {detailInvoice.items.map((item, idx) => (
                          <tr key={idx}>
                             <td className="py-3 text-xs font-bold text-slate-700 uppercase">{item.productName}</td>
                             <td className="py-3 text-center text-[10px] font-bold text-slate-500">{item.hsn}</td>
                             <td className="py-3 text-center text-xs font-black text-slate-800">{item.quantity}</td>
                             <td className="py-3 text-right text-xs font-bold text-slate-600">₹{item.rate.toLocaleString()}</td>
                             <td className="py-3 text-right text-xs font-black text-slate-900">₹{item.amount.toLocaleString()}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>

                 <div className="flex justify-end pt-4 border-t border-slate-100">
                    <div className="text-right space-y-1">
                       <div className="flex justify-between w-48 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><span>Subtotal</span><span>₹{detailInvoice.subTotal.toLocaleString()}</span></div>
                       <div className="flex justify-between w-48 text-[10px] font-bold text-emerald-600 uppercase tracking-widest"><span>GST</span><span>₹{detailInvoice.totalGst.toLocaleString()}</span></div>
                       <div className="flex justify-between w-48 text-xl font-black text-slate-900 uppercase tracking-tighter pt-2 border-t border-slate-200"><span>Total</span><span>₹{detailInvoice.grandTotal.toLocaleString()}</span></div>
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                 <button onClick={() => { setDetailInvoice(null); handleEditInvoice(detailInvoice); }} className="px-6 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2"><Edit2 size={14}/> Modify Voucher</button>
              </div>
           </div>
        </div>
      )}

      {/* QUICK PARTY MODAL */}
      {showQuickPartyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[500] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in border border-white/20">
             <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl shadow-xl ${themeClasses.bg} text-white`}><UserRoundPlus size={24}/></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Party Registry</h3>
                </div>
                <button onClick={() => setShowQuickPartyModal(false)} className="p-3 text-slate-400 hover:bg-white rounded-full transition-all"><X size={28}/></button>
             </div>
             <QuickPartyForm type={type === 'SALE' ? 'CUSTOMER' : 'SUPPLIER'} onSave={(p) => {
                const key = type === 'SALE' ? 'customers' : 'suppliers';
                updateData({ [key]: [...(data[key] as any), p] });
                setSelectedPartyId(p.id);
                setShowQuickPartyModal(false);
             }} />
          </div>
        </div>
      )}

      {/* QUICK PRODUCT MODAL */}
      {showQuickProductModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[500] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in border border-white/20">
             <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl shadow-xl bg-slate-900 text-white"><PackagePlus size={24}/></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Quick SKU Registry</h3>
                </div>
                <button onClick={() => setShowQuickProductModal(false)} className="p-3 text-slate-400 hover:bg-white rounded-full transition-all"><X size={28}/></button>
             </div>
             <div className="p-10 space-y-8">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">SKU Name</label><input id="q-prod-name" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none uppercase shadow-inner" placeholder="e.g. Copper Wire" /></div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">GST Rate (%)</label><input id="q-prod-gst" type="number" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none shadow-inner" defaultValue={18} /></div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Category</label>
                      <input id="q-prod-cat" list="cat-list-quick" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none uppercase shadow-inner" placeholder="Select or Type..." />
                      <datalist id="cat-list-quick">{data.productCategories.map(c => <option key={c} value={c} />)}</datalist>
                   </div>
                </div>
                <button onClick={() => {
                  const nameInput = document.getElementById('q-prod-name') as HTMLInputElement;
                  const gstInput = document.getElementById('q-prod-gst') as HTMLInputElement;
                  const catInput = document.getElementById('q-prod-cat') as HTMLInputElement;
                  if (!nameInput.value || !catInput.value) return;
                  
                  const newCats = data.productCategories.includes(catInput.value) ? data.productCategories : [...data.productCategories, catInput.value];
                  const newP: Product = { id: Math.random().toString(36).substr(2, 9), name: nameInput.value.toUpperCase(), salePrice: 0, purchasePrice: 0, category: catInput.value, hsn: '', gstRate: Number(gstInput.value), stock: 0, openingStock: 0, minStockAlert: 5, subCategory: '', lastRestockedDate: new Date().toISOString() };
                  
                  updateData({ products: [...data.products, newP], productCategories: newCats });
                  setShowQuickProductModal(false);
                }} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all">Synchronize SKU</button>
             </div>
          </div>
        </div>
      )}

      <datalist id="plist">{data.products.map(p => <option key={p.id} value={p.name}>{p.name} (Stock: {p.stock}) — ₹{type === 'SALE' ? p.salePrice : p.purchasePrice}</option>)}</datalist>
    </div>
  );
};

// Internal Quick Party Modal Form Component
const QuickPartyForm: React.FC<{type: 'CUSTOMER' | 'SUPPLIER', onSave: (p: any) => void}> = ({ type, onSave }) => {
   const [form, setForm] = useState({ name: '', phone: '', area: '', address: '', gstin: '' });
   return (
      <div className="p-10 space-y-8">
        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Legal Name *</label><input autoFocus className="w-full border-2 border-slate-100 rounded-[1.5rem] p-5 text-base font-bold bg-slate-50 focus:bg-white outline-none transition-all uppercase shadow-inner" placeholder="Company Designation" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Mobile #</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none shadow-inner" placeholder="Contact" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Area / Locality</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none uppercase shadow-inner" placeholder="Market" value={form.area} onChange={e => setForm({...form, area: e.target.value})} /></div>
        </div>
        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Address / GSTIN</label>
            <div className="grid grid-cols-1 gap-4">
                <input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none uppercase shadow-inner" placeholder="Full Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                <input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none uppercase shadow-inner" placeholder="GSTIN (Optional)" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} />
            </div>
        </div>
        <button onClick={() => { if(!form.name) return; onSave({...form, id: Math.random().toString(36).substr(2, 9), outstandingBalance: 0}); }} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-xl uppercase tracking-[0.2em] text-[11px] active:scale-95 transition-all">Commit Master Entry</button>
      </div>
   );
};

export default Invoicing;

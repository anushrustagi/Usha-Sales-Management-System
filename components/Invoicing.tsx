
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
  Download
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
  
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualSubArea, setManualSubArea] = useState('');
  const [manualGstin, setManualGstin] = useState('');
  const [recallCandidate, setRecallCandidate] = useState<Invoice | null>(null);

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

  useEffect(() => {
    if (!selectedPartyId && manualPhone.length >= 10) {
      const match = data.invoices.find(inv => inv.partyPhone === manualPhone);
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
    setManualGstin(recallCandidate.partyId === 'NEW_B2B' ? (recallCandidate.partyId) : '');
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
    }, 100);
  };

  const handleDownloadPdf = (targetInvoice: Invoice | null = viewingInvoice) => {
    if (!targetInvoice) return;

    const element = document.getElementById('printable-invoice');
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `Invoice_${targetInvoice.invoiceNo}_${new Date(targetInvoice.date).toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const exportToExcel = () => {
    const exportData = filteredHistory.map(inv => ({
      'Invoice No': inv.invoiceNo,
      'Date': new Date(inv.date).toLocaleDateString(),
      'Entity Name': inv.partyName,
      'Type': (inv.subType || inv.type).replace('_', ' '),
      'Sub-Total': inv.subTotal,
      'Tax Amount': inv.totalGst,
      'Grand Total': inv.grandTotal,
      'Paid Amount': inv.amountPaid,
      'Outstanding': inv.grandTotal - inv.amountPaid,
      'Payment Mode': inv.paymentMode
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${type} History`);
    XLSX.writeFile(workbook, `Usha_${type}_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePreviewDraft = () => {
    if (items.length === 0) return alert("Inventory dispatch list is empty.");
    
    const isManual = !selectedPartyId;
    const partyName = isManual ? (manualName || 'General Customer') : (selectedParty?.name || 'Unknown');
    const partyPhone = isManual ? manualPhone : selectedParty?.phone;
    const partyAddress = isManual ? manualAddress : selectedParty?.address;
    const partyArea = isManual ? manualArea : selectedParty?.area;
    const partySubArea = isManual ? manualSubArea : selectedParty?.subArea;

    const draftInvoice: Invoice = {
      id: editingInvoiceId || 'DRAFT',
      invoiceNo: invoiceNo || 'DRAFT-VOUCHER',
      date: new Date(invoiceDate).toISOString(),
      partyId: selectedPartyId || 'MANUAL_ENTRY',
      partyName, partyPhone, partyAddress, partyArea, partySubArea,
      items, subTotal: totals.subTotal, totalGst: totals.totalGst, grandTotal: totals.grandTotal,
      amountPaid, type, subType: type === 'SALE' ? subType : undefined, paymentMode
    };
    setViewingInvoice(draftInvoice);
  };

  const handleSaveInvoice = () => {
    if (!selectedPartyId && !manualName) return alert("Please select a customer or enter a name for the record.");
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
    setItems([]); 
    setSelectedPartyId(''); 
    setEditingInvoiceId(null); 
    setManualName(''); setManualPhone(''); setManualArea(''); setManualSubArea(''); setManualAddress(''); setManualGstin('');
    setPaymentRemarks('');
    setInvoiceNo(`${type === 'SALE' ? 'SL' : 'PR'}-${Date.now().toString().slice(-6)}`);
  };

  const filteredHistory = useMemo(() => {
    let hist = data.invoices.filter(i => i.type === type);
    
    if (historySearch) {
      const s = historySearch.toLowerCase();
      hist = hist.filter(i => 
        i.invoiceNo.toLowerCase().includes(s) || 
        i.partyName.toLowerCase().includes(s) || 
        (i.partyArea && i.partyArea.toLowerCase().includes(s)) || 
        (i.partySubArea && i.partySubArea.toLowerCase().includes(s))
      );
    }

    if (startDate) {
      hist = hist.filter(i => new Date(i.date) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      hist = hist.filter(i => new Date(i.date) <= end);
    }

    return hist.slice().reverse();
  }, [data.invoices, type, historySearch, startDate, endDate]);

  const themeClasses = {
    bg: type === 'SALE' ? 'bg-blue-600' : 'bg-emerald-600',
    border: type === 'SALE' ? 'border-t-blue-600' : 'border-t-emerald-600',
    lightBg: type === 'SALE' ? 'bg-blue-50' : 'bg-emerald-50',
    text: type === 'SALE' ? 'text-blue-600' : 'text-emerald-600'
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

  const addItem = (productId = '') => {
    const newItem: InvoiceItem = { productId: '', productName: '', quantity: 1, rate: 0, hsn: '', gstRate: 0, cgst: 0, sgst: 0, igst: 0, amount: 0, serialNumber: '' };
    if (productId) {
      const prod = data.products.find(p => p.id === productId);
      if (prod) {
        newItem.productId = prod.id; newItem.productName = prod.name; newItem.hsn = prod.hsn; newItem.gstRate = gstEnabled ? prod.gstRate : 0;
        newItem.rate = type === 'SALE' ? prod.salePrice : prod.purchasePrice;
        const baseVal = newItem.quantity * newItem.rate;
        const gstVal = baseVal * (newItem.gstRate / 100);
        newItem.cgst = gstVal / 2; newItem.sgst = gstVal / 2; newItem.amount = baseVal + gstVal;
      }
    }
    setItems([...items, newItem]);
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

  return (
    <div className="space-y-10">
      <style>{`
        @media print {
          /* Force visibility of root/body contents but hide specific classes */
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            background: white !important;
          }
          
          /* Hide all components with no-print class */
          .no-print, header, aside, nav { 
            display: none !important; 
            visibility: hidden !important;
          }

          /* Reset root layout constraints */
          #root, #root > div, main { 
            display: block !important; 
            height: auto !important; 
            overflow: visible !important; 
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            position: static !important;
          }

          /* The printable element itself */
          #printable-invoice {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Ensure table elements and text are visible */
          #printable-invoice * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide modal backgrounds and non-invoice modal parts */
          div[role="dialog"], .fixed.inset-0.bg-slate-900\/80 {
            background: transparent !important;
            box-shadow: none !important;
          }
          
          .custom-scrollbar::-webkit-scrollbar { display: none; }
          @page { margin: 1cm; size: auto; }
        }
      `}</style>
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 no-print">
        <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm w-fit shrink-0">
          <button onClick={() => { setActiveTab('NEW'); resetForm(); }} className={`px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'NEW' && !editingInvoiceId ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}><Plus size={18} /> CREATE NEW</button>
          <button onClick={() => setActiveTab('HISTORY')} className={`px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'HISTORY' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}><History size={18} /> ARCHIVE LOG</button>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={exportToExcel}
             className="px-6 py-3 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-2xl uppercase tracking-widest border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
           >
             <FileSpreadsheet size={18} /> Export Records
           </button>
           <div className="h-10 w-px bg-slate-200 mx-2"></div>
           <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest leading-none mb-1">Status</span>
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 tracking-tighter">Unified Engine Active</span>
           </div>
        </div>
      </div>

      {activeTab === 'NEW' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 no-print animate-in fade-in duration-300">
          <div className="xl:col-span-3 space-y-8">
            <div className={`bg-white p-10 rounded-[3rem] border-t-[10px] border-x border-b shadow-sm ${type === 'SALE' ? 'border-t-blue-600' : 'border-t-emerald-600'}`}>
              <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-50">
                <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-[2rem] shadow-xl ${themeClasses.lightBg} ${themeClasses.text}`}>
                    {data.companyProfile.logo ? <img src={data.companyProfile.logo} className="w-12 h-12 object-contain" /> : <Briefcase size={36} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">{editingInvoiceId ? 'Modify Document' : type === 'SALE' ? 'Commercial Sale' : 'Stock Procurement'}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Integrated Commercial Suite</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                  {type === 'SALE' && (
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      {(['TAX_INVOICE', 'DELIVERY_CHALLAN', 'PROFORMA_INVOICE'] as const).map(t => (
                        <button key={t} onClick={() => setSubType(t)} className={`px-5 py-2.5 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest ${subType === t ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{t.replace('_', ' ')}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global GST</span><button onClick={() => setGstEnabled(!gstEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gstEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gstEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-3 space-y-10">
                  <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Party / Registered Account</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1 group">
                           <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
                           <select className="w-full border-2 border-slate-50 rounded-[1.5rem] p-6 pl-14 bg-slate-50 outline-none font-bold text-slate-800 text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner appearance-none" value={selectedPartyId} onChange={e => setSelectedPartyId(e.target.value)}>
                             <option value="">— QUICK MANUAL LOG / WALKIN —</option>
                             {parties.map(p => <option key={p.id} value={p.id}>{p.name} {p.gstin ? `[${p.gstin}]` : ''} — Led: ₹{p.outstandingBalance.toLocaleString()}</option>)}
                           </select>
                        </div>
                        <button onClick={() => setShowQuickPartyModal(true)} className={`px-8 py-5 ${themeClasses.bg} text-white rounded-[1.5rem] shadow-2xl flex items-center gap-3 active:scale-95 transition-all group shadow-blue-200`}><UserPlus size={22} /><span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Register Party</span></button>
                    </div>
                  </div>

                  <div className={`p-10 rounded-[3.5rem] border transition-all duration-500 shadow-sm space-y-8 ${!selectedPartyId ? 'bg-orange-50/20 border-orange-100 ring-4 ring-orange-50/50' : 'bg-blue-50/10 border-blue-100'}`}>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          {!selectedPartyId ? <UserSearch size={22} className="text-orange-500" /> : <ShieldCheck size={22} className="text-blue-600" />}
                          <div>
                             <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${!selectedPartyId ? 'text-orange-800' : 'text-blue-800'}`}>{!selectedPartyId ? 'Manual Identity Mode' : 'Ledger Verified Account'}</h4>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized Profile Details</p>
                          </div>
                       </div>
                       {!selectedPartyId && recallCandidate && (
                         <button onClick={handleFastFill} className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 animate-pulse">
                            <Sparkles size={16}/> Auto-suggest identity
                         </button>
                       )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Legal Designation</label>
                        <input type="text" placeholder="e.g. M/S Strategic Corp" className="w-full border-2 border-white rounded-[1.5rem] p-5 text-base font-bold bg-white outline-none shadow-sm focus:ring-8 focus:ring-blue-500/5 disabled:bg-slate-50/50 transition-all uppercase" value={!selectedPartyId ? manualName : (selectedParty?.name || '')} onChange={e => setManualName(e.target.value)} disabled={!!selectedPartyId} />
                      </div>
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Communication Phone</label>
                        <div className="relative">
                          <input type="text" placeholder="10 Digit Mobile" className="w-full border-2 border-white rounded-[1.5rem] p-5 text-base font-bold bg-white outline-none shadow-sm focus:ring-8 focus:ring-blue-500/5 disabled:bg-slate-50/50 transition-all" value={!selectedPartyId ? manualPhone : (selectedParty?.phone || '')} onChange={e => setManualPhone(e.target.value)} disabled={!!selectedPartyId} />
                          {!selectedPartyId && recallCandidate && <ZapIcon size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400" />}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Locality Segment</label>
                        <div className="relative"><input type="text" placeholder="e.g. Industrial Area" className="w-full border-2 border-white rounded-2xl p-5 pl-12 text-sm font-bold bg-white outline-none shadow-sm disabled:bg-slate-50/50 uppercase" value={!selectedPartyId ? manualArea : (selectedParty?.area || '')} onChange={e => setManualArea(e.target.value)} disabled={!!selectedPartyId} /><MapPin size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${!selectedPartyId ? 'text-orange-300' : 'text-blue-300'}`} /></div>
                      </div>
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Sub-Area Code</label>
                        <div className="relative"><input type="text" placeholder="e.g. Sector-X" className="w-full border-2 border-white rounded-2xl p-5 pl-12 text-sm font-bold bg-white outline-none shadow-sm disabled:bg-slate-50/50 uppercase" value={!selectedPartyId ? manualSubArea : (selectedParty?.subArea || '')} onChange={e => setManualSubArea(e.target.value)} disabled={!!selectedPartyId} /><MapPinned size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${!selectedPartyId ? 'text-orange-300' : 'text-blue-300'}`} /></div>
                      </div>
                      <div className="space-y-3">
                        <label className={`text-[10px] font-black uppercase tracking-[0.3em] ${!selectedPartyId ? 'text-orange-600' : 'text-blue-600'}`}>Registry Address</label>
                        <input type="text" placeholder="Building, Street, Pin" className="w-full border-2 border-white rounded-2xl p-5 text-sm font-bold bg-white outline-none shadow-sm disabled:bg-slate-50/50 uppercase" value={!selectedPartyId ? manualAddress : (selectedParty?.address || '')} onChange={e => setManualAddress(e.target.value)} disabled={!!selectedPartyId} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-10 border-l pl-10 border-slate-50">
                  <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Document ID</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-5 font-black text-slate-700 text-sm bg-slate-50 outline-none uppercase shadow-inner" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
                  <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Posting Date</label><input type="date" className="w-full border-2 border-slate-50 rounded-2xl p-5 font-black text-slate-700 text-sm bg-slate-50 outline-none shadow-inner" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
                  {selectedParty && (
                    <div className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-2xl space-y-4 relative overflow-hidden group">
                       <div className="relative z-10">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-2">Net Ledger Bal</p>
                          <p className={`text-2xl font-black tabular-nums ${selectedParty.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>₹{selectedParty.outstandingBalance.toLocaleString()}</p>
                          <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase text-blue-400">
                             <UserCheck size={12} /> Live Accounting Connect
                          </div>
                       </div>
                       <Activity className="absolute -bottom-6 -right-6 text-white opacity-5 group-hover:scale-110 transition-transform" size={100} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-10 py-8 border-b bg-slate-50/30 flex justify-between items-center">
                 <div className="flex items-center gap-4"><ClipboardList className="text-slate-400" size={24} /><div><h3 className="font-black text-slate-800 uppercase text-sm tracking-[0.2em]">Product Manifest</h3><p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Inventory Transaction Ledger</p></div></div>
                 <div className="flex gap-4">
                   <button onClick={() => setShowQuickProductModal(true)} className={`px-6 py-3 text-[10px] font-black ${type === 'SALE' ? 'text-indigo-600 bg-white border-indigo-100 shadow-indigo-100' : 'text-emerald-600 bg-white border-emerald-100 shadow-emerald-100'} border-2 rounded-2xl uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-md`}><PackagePlus size={20} /> Register SKU</button>
                   <button onClick={() => addItem()} className="px-6 py-3 text-[10px] font-black text-white bg-blue-600 border-2 border-blue-600 rounded-2xl uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-100 active:scale-95 transition-all"><Plus size={20} strokeWidth={3} /> New Line</button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] border-b border-slate-100">
                    <tr><th className="px-10 py-6 min-w-[400px]">Strategic Inventory Classification</th><th className="px-6 py-6 text-center">Volume</th><th className="px-6 py-6 text-right">Unit Val (₹)</th><th className="px-10 py-6 text-right">Net Ext (₹)</th><th className="px-8 py-6"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/30 transition-all group">
                        <td className="px-10 py-6">
                           <div className="relative group/item">
                              <SearchIcon size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-200 group-hover/item:text-blue-400 transition-colors" />
                              <input list="product-list" className="w-full bg-transparent pl-7 outline-none font-black text-slate-800 text-sm uppercase tracking-tight placeholder:text-slate-200" placeholder="Type SKU Name..." value={item.productName} onChange={e => updateItem(index, 'productName', e.target.value)} />
                           </div>
                        </td>
                        <td className="px-6 py-6 text-center"><input type="number" className="w-24 text-center bg-slate-50 border-2 border-slate-50 rounded-xl p-2.5 outline-none font-black text-slate-800 focus:border-blue-100 transition-all" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} /></td>
                        <td className="px-6 py-6 text-right"><input type="number" className="w-32 text-right bg-slate-50 border-2 border-slate-50 rounded-xl p-2.5 outline-none font-black text-slate-800 focus:border-blue-100 transition-all tabular-nums" value={item.rate} onChange={e => updateItem(index, 'rate', Number(e.target.value))} /></td>
                        <td className="px-10 py-6 text-right font-black text-slate-900 text-lg tabular-nums group-hover:text-blue-600 transition-colors">₹{item.amount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-right"><button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20} /></button></td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={5} className="py-32 text-center opacity-20 flex flex-col items-center gap-6"><Package size={80} strokeWidth={1} /><p className="text-[11px] font-black uppercase tracking-[0.4em]">Empty Dispatch Manifest</p></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 space-y-8">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm sticky top-24 space-y-10">
                <div className="flex items-center gap-4"><div className={`p-4 ${themeClasses.bg} text-white rounded-2xl shadow-xl shadow-blue-100`}><Calculator size={24} /></div><div><h3 className="font-black text-slate-800 text-sm uppercase tracking-widest leading-none mb-1.5">Financial Core</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Calculation</p></div></div>
                
                <div className="space-y-5 pb-8 border-b border-slate-50">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1"><span>Base Evaluation</span><span className="tabular-nums">₹{totals.subTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-widest px-1"><span>Applied GST (Sum)</span><span className="tabular-nums">+ ₹{totals.totalGst.toLocaleString()}</span></div>
                  <div className="pt-8 flex flex-col gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">Net Document Value</span><span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">₹{totals.grandTotal.toLocaleString()}</span></div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Instrument Mode</label>
                    <div className="grid grid-cols-4 gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100">
                      {[
                        { id: 'CASH', label: 'Cash', icon: WalletIcon },
                        { id: 'UPI', label: 'Digital', icon: Smartphone },
                        { id: 'BANK', label: 'Bank', icon: Landmark },
                        { id: 'CHEQUE', label: 'Clear', icon: CreditCard }
                      ].map(mode => (
                        <button key={mode.id} onClick={() => setPaymentMode(mode.id as any)} className={`flex flex-col items-center py-4 px-1 rounded-2xl transition-all ${paymentMode === mode.id ? 'bg-white text-blue-600 shadow-xl border border-blue-50' : 'text-slate-400 hover:text-slate-800'}`}>
                          <mode.icon size={20} className="mb-2" />
                          <span className="text-[9px] font-black uppercase tracking-tighter">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Currency Posted</label>
                      <button onClick={() => setAmountPaid(totals.grandTotal)} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest">Full Clearance</button>
                    </div>
                    <div className="relative group">
                      <input type="number" className="w-full border-2 border-slate-50 rounded-[1.5rem] p-6 text-3xl font-black bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner tabular-nums" placeholder="0.00" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200 font-black text-sm uppercase tracking-widest group-hover:text-slate-300 transition-colors">INR</div>
                    </div>
                  </div>

                  <div className={`p-8 rounded-[2rem] flex justify-between items-center shadow-xl border transition-all duration-500 ${remainingBalance > 0 ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/50' : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/50'}`}>
                    <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Ledger Surplus</span><span className="font-black text-2xl tabular-nums tracking-tighter">₹{remainingBalance.toLocaleString()}</span></div>
                    {remainingBalance === 0 ? <CheckCircle className="text-emerald-500" size={36} /> : <AlertCircle className="text-rose-500" size={36} />}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 pt-4">
                  <button onClick={handleSaveInvoice} className={`w-full py-6 text-white font-black rounded-[1.8rem] shadow-2xl uppercase tracking-[0.3em] text-[11px] active:scale-95 transition-all flex items-center justify-center gap-3 ${themeClasses.bg} ${type === 'SALE' ? 'shadow-blue-200' : 'shadow-emerald-200'}`}>{editingInvoiceId ? 'Update Record' : 'Commit Entry'} <ArrowRight size={20} /></button>
                  <button onClick={handlePreviewDraft} className="w-full py-5 bg-white border-2 border-slate-100 text-slate-500 font-black rounded-[1.8rem] uppercase tracking-[0.25em] text-[10px] flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"><Printer size={20} /> Preview Analysis</button>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 no-print animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row items-center gap-6">
             <div className="relative flex-1 group w-full">
                <SearchIcon size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" placeholder={`Audit scan archive...`} className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-base font-bold outline-none focus:border-blue-100 focus:bg-white transition-all uppercase tracking-tight" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
             </div>
             
             <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                   <CalendarDays size={18} className="text-blue-500" />
                   <div className="flex items-center gap-2">
                      <input type="date" className="bg-transparent text-xs font-black outline-none uppercase" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      <span className="text-[10px] font-black text-slate-300 uppercase">To</span>
                      <input type="date" className="bg-transparent text-xs font-black outline-none uppercase" value={endDate} onChange={e => setEndDate(e.target.value)} />
                   </div>
                   {(startDate || endDate) && (
                     <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><X size={16}/></button>
                   )}
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] border-b border-slate-200">
                  <tr><th className="px-10 py-7">Audit Timeline</th><th className="px-6 py-7">Identification</th><th className="px-6 py-7">Counter-Party Entity</th><th className="text-right px-6 py-7">Valuation</th><th className="text-right px-6 py-7">Posting</th><th className="text-right px-10 py-7">Net Led.</th><th className="text-center px-10 py-7">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.map(inv => {
                    const isManual = inv.partyId === 'WALKIN' || inv.partyId === 'MANUAL_ENTRY';
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-7"><span className="font-black text-slate-700 text-xs tabular-nums tracking-tighter">{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><p className="text-[9px] font-black uppercase text-slate-300 tracking-widest mt-1">{new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></td>
                        <td className="px-6 py-7"><span className="font-black text-slate-900 text-xs uppercase tracking-widest border-b border-slate-200 pb-0.5">{inv.invoiceNo}</span></td>
                        <td className="px-6 py-7"><div className="flex flex-col"><div className="flex items-center gap-3">{isManual ? <UserCircle size={16} className="text-orange-400" /> : <ShieldCheck size={16} className="text-blue-500" />}<span className="font-black text-slate-800 text-xs uppercase truncate max-w-[180px]">{inv.partyName}</span></div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">{ [inv.partySubArea, inv.partyArea].filter(Boolean).join(' • ') || 'Direct Logistics'}</p></div></td>
                        <td className="px-6 py-7 text-right font-black text-slate-900 text-base tabular-nums group-hover:text-blue-600 transition-colors">₹{inv.grandTotal.toLocaleString()}</td>
                        <td className="px-6 py-7 text-right"><div className="flex flex-col items-end"><span className="font-black text-emerald-600 text-sm tabular-nums">₹{inv.amountPaid.toLocaleString()}</span><span className="text-[9px] text-slate-300 uppercase font-black tracking-widest mt-1">{inv.paymentMode}</span></div></td>
                        <td className={`px-10 py-7 text-right font-black text-sm tabular-nums ${inv.grandTotal - inv.amountPaid > 0 ? 'text-rose-600' : 'text-slate-200'}`}>₹{(inv.grandTotal - inv.amountPaid).toLocaleString()}</td>
                        <td className="px-10 py-7 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setViewingInvoice(inv)} className="p-3 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"><Eye size={20}/></button>
                            <button onClick={() => handleEditInvoice(inv)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"><Edit2 size={20}/></button>
                            <button onClick={() => { setViewingInvoice(inv); setTimeout(() => handleDownloadPdf(inv), 500); }} className="p-3 text-slate-300 hover:text-emerald-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"><Download size={20}/></button>
                            <button onClick={() => { setViewingInvoice(inv); handlePrint(); }} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"><Printer size={20}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredHistory.length === 0 && (
              <div className="py-32 text-center text-slate-300"><FileText size={64} className="mx-auto mb-6 opacity-5" /><p className="text-[11px] font-black uppercase tracking-[0.4em]">Historical Registry Untouched</p></div>
            )}
          </div>
        </div>
      )}

      {showQuickPartyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[220] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-xl shadow-[0_45px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-300 border border-white/20">
              <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-5">
                    <div className={`p-4 ${themeClasses.bg} text-white rounded-[2rem] shadow-2xl shadow-blue-200`}><UserPlus size={28}/></div>
                    <div><h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none mb-1.5">Entity Registry</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Account Synchronization</p></div>
                 </div>
                 <button onClick={() => setShowQuickPartyModal(false)} className="p-4 hover:bg-white rounded-full text-slate-400 transition-colors"><X size={32}/></button>
              </div>
              <QuickPartyForm type={type === 'SALE' ? 'CUSTOMER' : 'SUPPLIER'} onSave={(party) => { 
                const key = type === 'SALE' ? 'customers' : 'suppliers'; 
                updateData({ [key]: [...(data[key] as any), party] }); 
                setSelectedPartyId(party.id); 
                setShowQuickPartyModal(false); 
              }} />
           </div>
        </div>
      )}

      {viewingInvoice && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] no-print border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
             <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-6">
                   <div className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-xl"><FileText size={28}/></div>
                   <div><h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none mb-1.5">{viewingInvoice.id === 'DRAFT' ? 'Audit Snapshot' : `Voucher ID: ${viewingInvoice.invoiceNo}`}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Transaction Registry</p></div>
                </div>
                <button onClick={() => setViewingInvoice(null)} className="p-5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={36} /></button>
             </div>
             <div className="p-12 overflow-y-auto bg-slate-100 flex-1 custom-scrollbar">
                <div id="printable-invoice" className="bg-white shadow-2xl rounded-[1.5rem] p-16 min-h-[1150px] text-slate-900 font-sans mx-auto max-w-[850px] border border-slate-200">
                  <div className="flex justify-between items-start mb-16 pb-12 border-b-4 border-slate-900">
                    <div>
                        {data.companyProfile.logo && <img src={data.companyProfile.logo} className="h-20 mb-6 object-contain shadow-sm rounded-lg" />}
                        <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">{(viewingInvoice.subType || viewingInvoice.type).replace('_', ' ')}</h1>
                        <div className={`mt-5 px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] inline-block ${viewingInvoice.type === 'SALE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{viewingInvoice.type === 'SALE' ? 'SALES RECORD' : 'PROCUREMENT'}</div>
                    </div>
                    <div className="text-right space-y-2"><p className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">{data.companyProfile.name}</p><p className="text-sm font-black text-blue-600 tracking-widest uppercase bg-blue-50 inline-block px-3 py-1 rounded-lg">GSTIN: {data.companyProfile.gstin}</p><p className="text-[10px] font-bold text-slate-400 max-w-[250px] leading-relaxed mt-4 uppercase italic">{data.companyProfile.address}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-20 mb-16 text-xs">
                    <div className="space-y-6">
                      <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-3">{viewingInvoice.type === 'SALE' ? 'Account Recipient' : 'Remittance Source'}</h4>
                      <div className="space-y-4">
                         <p className="font-black uppercase text-2xl text-slate-900 tracking-tight leading-none">{viewingInvoice.partyName}</p>
                         <div className="space-y-2 font-bold text-slate-500 text-[11px] leading-relaxed uppercase">
                            {viewingInvoice.partyAddress && <p className="flex items-start gap-3"><MapPinHouse size={16} className="text-slate-300 mt-0.5" /> {viewingInvoice.partyAddress}</p>}
                            {(viewingInvoice.partyArea || viewingInvoice.partySubArea) && (<p className="flex items-center gap-3"><MapPinned size={16} className="text-slate-300" /> Locality: <span className="text-slate-900 font-black">{[viewingInvoice.partySubArea, viewingInvoice.partyArea].filter(Boolean).join(', ')}</span></p>)}
                            <p className="flex items-center gap-3"><Phone size={16} className="text-slate-300" /> Contact: <span className="text-slate-900 font-black tracking-widest">{viewingInvoice.partyPhone}</span></p>
                         </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                       <div className="flex items-center gap-6 border-b-2 border-slate-100 pb-3 mb-4 w-full justify-end"><span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Document Metrics</span></div>
                       <p className="flex justify-between w-64 border-b border-slate-50 pb-2"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Reference ID</span><span className="font-black text-slate-900 text-base tracking-widest">{viewingInvoice.invoiceNo}</span></p>
                       <p className="flex justify-between w-64 border-b border-slate-50 pb-2"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Registry Date</span><span className="font-black text-slate-900 text-base tracking-tighter tabular-nums">{new Date(viewingInvoice.date).toLocaleDateString()}</span></p>
                       <p className="flex justify-between w-64"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Settlement</span><span className="font-black text-slate-900 text-base tracking-[0.2em] uppercase">{viewingInvoice.paymentMode}</span></p>
                    </div>
                  </div>
                  <table className="w-full text-left border-collapse mb-16">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-[0.3em]">
                       <tr><th className="px-8 py-6 rounded-l-2xl">SKU / Catalog Details</th><th className="text-center px-4">Qty</th><th className="text-right px-4">Unit Rate</th><th className="text-right px-8 rounded-r-2xl">Total Val</th></tr>
                    </thead>
                    <tbody className="font-bold text-xs uppercase tracking-tight">
                       {viewingInvoice.items.map((it, idx) => (
                         <tr key={idx} className="border-b border-slate-50 text-slate-800"><td className="px-8 py-7 leading-relaxed">{it.productName}</td><td className="text-center px-4 tabular-nums text-sm font-black">{it.quantity}</td><td className="text-right px-4 tabular-nums">₹{it.rate.toLocaleString()}</td><td className="text-right px-8 font-black text-base tabular-nums">₹{it.amount.toLocaleString()}</td></tr>
                       ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end mb-20">
                     <div className="w-full max-w-[400px] space-y-5 bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200 shadow-inner">
                        <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Net Basic Evaluation</span><span className="tabular-nums">₹{viewingInvoice.subTotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Statutory GST Consolidation</span><span className="tabular-nums">₹{viewingInvoice.totalGst.toLocaleString()}</span></div>
                        <div className="flex justify-between text-3xl font-black text-slate-900 border-t-2 border-slate-200 pt-6 uppercase tracking-tighter"><span>Grand Total</span><span className="tabular-nums">₹{viewingInvoice.grandTotal.toLocaleString()}</span></div>
                        <div className="pt-6 border-t border-slate-200 mt-6 space-y-4">
                           <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest"><span>Amount Posted (Paid)</span><span className="tabular-nums">₹{viewingInvoice.amountPaid.toLocaleString()}</span></div>
                           <div className="flex justify-between text-[10px] font-black text-rose-600 uppercase tracking-widest"><span>Outstanding Ledger</span><span className="tabular-nums">₹{(viewingInvoice.grandTotal - viewingInvoice.amountPaid).toLocaleString()}</span></div>
                        </div>
                     </div>
                  </div>
                  <div className="text-[10px] text-slate-300 font-black uppercase tracking-[0.5em] text-center border-t border-slate-50 pt-12 flex flex-col gap-2">
                     <span>Electronic Audit Log • No Seal Mandatory</span>
                     <span className="text-[8px] opacity-50 tracking-[0.1em]">Verified by USHA Secure Vault Infrastructure</span>
                  </div>
                </div>
             </div>
             <div className="p-10 bg-white border-t flex justify-end gap-6 no-print">
                <button onClick={() => setViewingInvoice(null)} className="px-10 py-5 border-2 border-slate-100 text-slate-500 font-black text-[12px] rounded-[1.8rem] uppercase tracking-widest hover:bg-slate-50 transition-all">Dismiss Analysis</button>
                <button onClick={() => handleDownloadPdf()} className={`px-10 py-5 bg-slate-900 text-white font-black text-[12px] rounded-[1.8rem] uppercase tracking-widest flex items-center gap-4 shadow-2xl transition-all hover:bg-slate-800`}><Download size={20} /> Download PDF</button>
                <button onClick={handlePrint} className={`px-12 py-5 text-white font-black text-[12px] rounded-[1.8rem] uppercase tracking-widest flex items-center gap-4 shadow-2xl transition-all ${type === 'SALE' ? 'bg-blue-600 shadow-blue-200' : 'bg-emerald-600 shadow-emerald-200'}`}><Printer size={24} /> Print Formal Copy</button>
             </div>
          </div>
        </div>
      )}

      {showQuickProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[210] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
             <div className={`p-10 border-b flex items-center justify-between ${type === 'SALE' ? 'bg-blue-50/50' : 'bg-emerald-50/50'}`}>
                <div className="flex items-center gap-5">
                   <div className={`p-4 ${type === 'SALE' ? 'bg-blue-600' : 'bg-emerald-600'} text-white rounded-2xl shadow-xl`}><PackagePlus size={28}/></div>
                   <div><h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none mb-1.5">Master SKU Catalog</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rapid Inventory Injection</p></div>
                </div>
                <button onClick={() => {setShowQuickProductModal(false); setIsNewCategoryMode(false);}} className="p-4 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={32}/></button>
             </div>
             <div className="p-12 space-y-8">
                <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Universal Item Description</label><input autoFocus type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-base font-bold bg-slate-50 focus:border-blue-400 focus:bg-white outline-none transition-all shadow-inner" placeholder="e.g. MS Seamless Pipe 12ft" value={newProductData.name} onChange={e => setNewProductData({...newProductData, name: e.target.value})} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3"><div className="flex justify-between items-center px-1"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{isNewCategoryMode ? 'New Label' : 'Segment'}</label><button onClick={() => { setIsNewCategoryMode(!isNewCategoryMode); if (!isNewCategoryMode) setNewProductData({...newProductData, category: ''}); else setNewProductData({...newProductData, category: data.productCategories[0] || ''}); }} className={`text-[10px] font-black uppercase tracking-tighter hover:underline ${type === 'SALE' ? 'text-blue-600' : 'text-emerald-600'}`}>{isNewCategoryMode ? 'Use Existing' : '+ Create New'}</button></div><div className="relative">{isNewCategoryMode ? (<input type="text" className="w-full border-2 border-blue-100 rounded-2xl p-5 text-sm font-black bg-blue-50/20 outline-none shadow-sm uppercase tracking-widest" placeholder="New Cat..." value={newProductData.category} onChange={e => setNewProductData({...newProductData, category: e.target.value})} />) : (<select className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-white outline-none shadow-sm appearance-none" value={newProductData.category} onChange={e => setNewProductData({...newProductData, category: e.target.value})}><option value="">Choose...</option>{data.productCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>)}<Bookmark size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" /></div></div>
                   <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Sub-Catalog</label><div className="relative"><input list="sub-cats" type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-400 focus:bg-white shadow-inner" placeholder="Optional tag" value={newProductData.subCategory} onChange={e => setNewProductData({...newProductData, subCategory: e.target.value})} /><Layers size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" /></div><datalist id="sub-cats">{data.products.map(p => p.subCategory).filter(Boolean).map(s => <option key={s} value={s} />)}</datalist></div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">HSN/SAC</label><input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-slate-50 outline-none uppercase shadow-inner" value={newProductData.hsn} onChange={e => setNewProductData({...newProductData, hsn: e.target.value})} /></div>
                   <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">GST Slab</label><select className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-white outline-none shadow-sm" value={newProductData.gstRate} onChange={e => setNewProductData({...newProductData, gstRate: Number(e.target.value)})}>{[0, 5, 12, 18, 28].map(s => <option key={s} value={s}>{s}% GST</option>)}</select></div>
                </div>
                <button onClick={() => { if (!newProductData.name || !newProductData.category) return alert("Validation: Profile required."); const updatedCategories = Array.from(new Set([...data.productCategories, newProductData.category])); const newProduct: Product = { ...newProductData, id: Math.random().toString(36).substr(2, 9), lastRestockedDate: new Date().toISOString() }; const newItem: InvoiceItem = { productId: newProduct.id, productName: newProduct.name, quantity: 1, rate: type === 'SALE' ? newProduct.salePrice : newProduct.purchasePrice, hsn: newProduct.hsn, gstRate: gstEnabled ? newProduct.gstRate : 0, cgst: 0, sgst: 0, igst: 0, amount: 0, serialNumber: '' }; const baseVal = newItem.quantity * newItem.rate; const gstVal = baseVal * (newItem.gstRate / 100); newItem.cgst = gstVal / 2; newItem.sgst = gstVal / 2; newItem.amount = baseVal + gstVal; updateData({ products: [...data.products, newProduct], productCategories: updatedCategories }); setItems([...items, newItem]); setShowQuickProductModal(false); }} className={`w-full py-6 text-white font-black rounded-3xl shadow-2xl uppercase tracking-[0.3em] text-[11px] active:scale-95 transition-all flex items-center justify-center gap-4 ${type === 'SALE' ? 'bg-blue-600 shadow-blue-200' : 'bg-emerald-600 shadow-emerald-200'}`}><Save size={20}/> Synchronize Profile</button>
             </div>
          </div>
        </div>
      )}

      <datalist id="product-list">{data.products.map(p => <option key={p.id} value={p.name}>{p.name} (Cur. Bal: {p.stock} Unit) — Rate: ₹{p.salePrice}</option>)}</datalist>
    </div>
  );
};

const QuickPartyForm: React.FC<{type: 'CUSTOMER' | 'SUPPLIER', onSave: (p: any) => void}> = ({ type, onSave }) => {
   const [form, setForm] = useState({ name: '', phone: '', gstin: '', area: '', subArea: '', address: '' });
   return (
      <div className="p-12 space-y-10">
        <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Legal Designation *</label><input autoFocus className="w-full border-2 border-slate-100 rounded-[1.5rem] p-6 text-base font-bold bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner uppercase" placeholder="Strategic Partner Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Communication Contact</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none shadow-inner" placeholder="10 Digit Mobile" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Statutory GSTIN</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-slate-50 outline-none uppercase shadow-inner" placeholder="15-Digit GST" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} /></div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Primary Locality</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none shadow-inner uppercase" placeholder="e.g. Mumbai Hub" value={form.area} onChange={e => setForm({...form, area: e.target.value})} /></div>
          <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Sub-Sector</label><input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none shadow-inner uppercase" placeholder="e.g. Block A" value={form.subArea} onChange={e => setForm({...form, subArea: e.target.value})} /></div>
        </div>
        <button onClick={() => { if(!form.name) return alert("Validation: Name identity required."); onSave({...form, id: Math.random().toString(36).substr(2, 9), outstandingBalance: 0}); }} className={`w-full py-6 ${type === 'CUSTOMER' ? 'bg-slate-900 shadow-slate-200' : 'bg-emerald-600 shadow-emerald-200'} text-white font-black rounded-3xl shadow-2xl uppercase tracking-[0.3em] text-[11px] active:scale-95 transition-all flex items-center justify-center gap-4`}>Commit Master Identity</button>
      </div>
   );
};

export default Invoicing;
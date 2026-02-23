
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
  Download, Map as MapIcon, ShieldAlert, ChevronDown, Loader2, Mail, Globe, 
  Truck as TruckIcon, FileSignature, BookOpenCheck, Copy
} from 'lucide-react';

interface InvoicingProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  type: 'SALE' | 'PURCHASE';
}

// Utility to convert number to words (Indian Format)
const numberToWords = (price: number): string => {
  const sglDigit = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const dblDigit = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tensPlace = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const handle_tens = (d: number, trial: any) => { return tensPlace[d] + " " + trial; };
  const handle_ut = (d: number, trial: any) => { return sglDigit[d] + " " + trial; };

  let str = "";
  let digit: any[] = price.toString().split("");
  let p = digit.indexOf(".");
  if (p !== -1) digit = digit.slice(0, p); // Truncate decimals for words
  
  digit = digit.reverse();
  let len = digit.length;
  
  if (len === 0) return "";
  if (len === 1) return sglDigit[digit[0]];

  // Return a formatted string for now to ensure reliability without external heavy libs
  return price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }).replace('₹', '') + " Only";
};

const Invoicing: React.FC<InvoicingProps> = ({ data, updateData, type }) => {
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(`${type === 'SALE' ? 'SL' : 'PR'}-${Date.now().toString().slice(-6)}`);
  const [paymentMode, setPaymentMode] = useState<Invoice['paymentMode']>('CASH');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Enhanced Fields State - Initialize with defaults from profile
  const [subType, setSubType] = useState<'TAX_INVOICE' | 'DELIVERY_CHALLAN' | 'PROFORMA_INVOICE'>('TAX_INVOICE');
  const [isIgst, setIsIgst] = useState(false);
  const [bankDetails, setBankDetails] = useState(data.companyProfile.bankDetails || { bankName: '', accNo: '', ifsc: '', branch: '' });
  const [terms, setTerms] = useState('Goods once sold will not be taken back.\nInterest @18% p.a. if not paid by due date.\nSubject to Mumbai Jurisdiction.');
  const [extraFields, setExtraFields] = useState({ ewayBill: '', vehicleNo: '', poNo: '', customerCare: data.companyProfile.phone });

  // Shipping Details State
  const [enableShipping, setEnableShipping] = useState(false);
  const [shipName, setShipName] = useState('');
  const [shipAddress, setShipAddress] = useState('');
  const [shipGstin, setShipGstin] = useState('');

  // Modals
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [showQuickPartyModal, setShowQuickPartyModal] = useState(false);

  // Manual Identity State
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualSubArea, setManualSubArea] = useState(''); // New: Sub-area
  const [manualAddress, setManualAddress] = useState('');
  const [manualGstin, setManualGstin] = useState('');

  const parties = useMemo(() => {
    return type === 'SALE' ? data.customers : data.suppliers;
  }, [data.customers, data.suppliers, type]);

  const selectedParty = useMemo(() => parties.find(p => p.id === selectedPartyId), [parties, selectedPartyId]);

  const totals = useMemo(() => {
    const subTotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.rate), 0);
    const totalGst = items.reduce((acc, curr) => acc + (gstEnabled ? (curr.quantity * curr.rate * curr.gstRate / 100) : 0), 0);
    const grossTotal = subTotal + totalGst;
    const roundOff = Math.round(grossTotal) - grossTotal;
    return { subTotal, totalGst, grandTotal: Math.round(grossTotal), roundOff };
  }, [items, gstEnabled]);

  const remainingBalance = useMemo(() => totals.grandTotal - amountPaid, [totals.grandTotal, amountPaid]);

  const enrichInvoice = (inv: Invoice) => {
      if (!inv.partyGstin && inv.partyId && inv.partyId !== 'WALKIN') {
          const party = (type === 'SALE' ? data.customers : data.suppliers).find(p => p.id === inv.partyId);
          if (party?.gstin) {
              return { ...inv, partyGstin: party.gstin };
          }
      }
      return inv;
  };

  const handlePrint = (invoice: Invoice | null) => {
    const invoiceToView = invoice ? enrichInvoice(invoice) : {
        id: 'PREVIEW', invoiceNo, date: invoiceDate, partyId: selectedPartyId || 'WALKIN',
        partyName: selectedParty?.name || manualName || 'Walk-in Customer',
        partyPhone: selectedParty?.phone || manualPhone,
        partyAddress: selectedParty?.address || manualAddress,
        partyArea: selectedParty?.area || manualArea,
        partySubArea: selectedParty?.subArea || manualSubArea,
        partyGstin: selectedParty?.gstin || manualGstin, // Include GSTIN for preview
        items, subTotal: totals.subTotal, totalGst: totals.totalGst, grandTotal: totals.grandTotal,
        amountPaid, type, paymentMode,
        subType, isIgst, roundOff: totals.roundOff,
        bankDetails, terms, extraFields,
        shippingDetails: enableShipping ? { name: shipName, address: shipAddress, gstin: shipGstin } : undefined
    };

    setViewingInvoice(invoiceToView);
    setTimeout(() => window.print(), 100);
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
        alert("PDF Generator library not loaded. Please refresh or check connection.");
        return;
    }

    window.scrollTo(0,0);
    setViewingInvoice(enrichInvoice(invoice));
    setIsGeneratingPdf(true);
    
    setTimeout(() => {
      const element = document.getElementById('printable-invoice-content');
      if (element) {
        const opt = {
          margin: 0,
          filename: `${invoice.subType}_${invoice.invoiceNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0, logging: false, width: 794 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(element).save().then(() => {
          setIsGeneratingPdf(false);
          setViewingInvoice(null);
        }).catch((err: any) => {
            console.error("PDF Generation Error", err);
            setIsGeneratingPdf(false);
            setViewingInvoice(null);
            alert("Failed to generate PDF. Check console.");
        });
      } else {
        console.error("Element not found for PDF generation");
        setIsGeneratingPdf(false);
      }
    }, 1000);
  };

  const handleSaveInvoice = () => {
    if (!selectedPartyId && !manualName) return alert("Validation: Identity required.");
    if (items.length === 0) return alert("Manifest: Add items.");

    let updatedProducts = [...data.products];
    let updatedParties = type === 'SALE' ? [...data.customers] : [...data.suppliers];
    let updatedInvoices = [...data.invoices];
    let updatedTransactions = [...data.transactions];

    if (editingInvoice) {
        editingInvoice.items.forEach(item => {
            const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
            if (pIdx > -1) {
                const diff = type === 'SALE' ? item.quantity : -item.quantity;
                updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + diff };
            }
        });
        if (editingInvoice.partyId && editingInvoice.partyId !== 'WALKIN') {
            const pIdx = updatedParties.findIndex(p => p.id === editingInvoice.partyId);
            if (pIdx > -1) {
                const oldUnpaid = editingInvoice.grandTotal - editingInvoice.amountPaid;
                updatedParties[pIdx] = { ...updatedParties[pIdx], outstandingBalance: updatedParties[pIdx].outstandingBalance - oldUnpaid };
            }
        }
        updatedInvoices = updatedInvoices.filter(i => i.id !== editingInvoice.id);
        updatedTransactions = updatedTransactions.filter(t => !t.description.includes(`#${editingInvoice.invoiceNo}`));
    }

    const isManual = !selectedPartyId;
    const partyName = isManual ? manualName : selectedParty?.name || '';
    const partyPhone = isManual ? manualPhone : selectedParty?.phone;
    const partyAddress = isManual ? manualAddress : selectedParty?.address;
    const partyArea = isManual ? manualArea : selectedParty?.area;
    const partySubArea = isManual ? manualSubArea : selectedParty?.subArea;
    const partyGstin = isManual ? manualGstin : selectedParty?.gstin;

    const invoiceId = editingInvoice ? editingInvoice.id : Math.random().toString(36).substr(2, 9);
    
    const newInvoice: Invoice = {
      id: invoiceId, invoiceNo, date: new Date(invoiceDate).toISOString(), 
      partyId: selectedPartyId || 'WALKIN',
      partyName, partyPhone, partyAddress, partyArea, partySubArea, partyGstin, items, 
      subTotal: totals.subTotal, totalGst: totals.totalGst, grandTotal: totals.grandTotal,
      amountPaid, type, subType, paymentMode,
      isIgst, roundOff: totals.roundOff,
      bankDetails, terms, extraFields,
      shippingDetails: enableShipping ? { name: shipName, address: shipAddress, gstin: shipGstin } : undefined
    };

    items.forEach(it => {
      const pIdx = updatedProducts.findIndex(p => p.id === it.productId);
      if (pIdx > -1) {
        const diff = type === 'SALE' ? -it.quantity : it.quantity;
        updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + diff };
      }
    });

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
      description: `${type} ${subType === 'DELIVERY_CHALLAN' ? '(Challan)' : ''} #${invoiceNo} — ${partyName}`, 
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
    setSubType(inv.subType || 'TAX_INVOICE');
    setIsIgst(inv.isIgst || false);
    if(inv.bankDetails) setBankDetails(inv.bankDetails);
    if(inv.terms) setTerms(inv.terms);
    if(inv.extraFields) setExtraFields(inv.extraFields);
    
    // Shipping fields
    if (inv.shippingDetails) {
        setEnableShipping(true);
        setShipName(inv.shippingDetails.name);
        setShipAddress(inv.shippingDetails.address);
        setShipGstin(inv.shippingDetails.gstin || '');
    } else {
        setEnableShipping(false);
        setShipName(''); setShipAddress(''); setShipGstin('');
    }
    
    if (inv.partyId === 'WALKIN') {
       setSelectedPartyId('');
       setManualName(inv.partyName);
       setManualPhone(inv.partyPhone || '');
       setManualAddress(inv.partyAddress || '');
       setManualArea(inv.partyArea || '');
       setManualSubArea(inv.partySubArea || '');
       setManualGstin(inv.partyGstin || '');
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

    inv.items.forEach(item => {
        const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (pIdx > -1) {
            const diff = type === 'SALE' ? item.quantity : -item.quantity;
            updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + diff };
        }
    });

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
    setManualName(''); setManualPhone(''); setManualArea(''); setManualSubArea(''); setManualAddress(''); setManualGstin('');
    setInvoiceNo(`${type === 'SALE' ? 'SL' : 'PR'}-${Date.now().toString().slice(-6)}`);
    setSubType('TAX_INVOICE'); setIsIgst(false);
    // Shipping reset
    setEnableShipping(false); setShipName(''); setShipAddress(''); setShipGstin('');
    // Reset to defaults from profile
    setBankDetails(data.companyProfile.bankDetails || { bankName: '', accNo: '', ifsc: '', branch: '' });
    setExtraFields({ ewayBill: '', vehicleNo: '', poNo: '', customerCare: data.companyProfile.phone });
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
    // IGST Logic
    if (isIgst) {
        item.igst = gstVal; item.cgst = 0; item.sgst = 0;
    } else {
        item.igst = 0; item.cgst = gstVal / 2; item.sgst = gstVal / 2;
    }
    item.amount = baseVal + gstVal;
    newItems[index] = item; setItems(newItems);
  };

  // Recalculate Taxes when IGST Toggle changes
  useEffect(() => {
    if (items.length > 0) {
        const updatedItems = items.map(item => {
            const baseVal = item.quantity * item.rate;
            const gstVal = baseVal * (item.gstRate / 100);
            return {
                ...item,
                igst: isIgst ? gstVal : 0,
                cgst: isIgst ? 0 : gstVal / 2,
                sgst: isIgst ? 0 : gstVal / 2,
                amount: baseVal + gstVal
            };
        });
        setItems(updatedItems);
    }
  }, [isIgst]);

  const saveBankAsDefault = () => {
    if(confirm("Set these bank details as the permanent default for future invoices?")) {
        const updatedProfile = { ...data.companyProfile, bankDetails };
        updateData({ companyProfile: updatedProfile });
    }
  };

  const copyBillingToShipping = () => {
      setShipName(!selectedPartyId ? manualName : (selectedParty?.name || ''));
      setShipAddress(!selectedPartyId ? manualAddress : (selectedParty?.address || ''));
      setShipGstin(!selectedPartyId ? manualGstin : (selectedParty?.gstin || ''));
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
          #printable-invoice-content { display: block !important; padding: 15mm !important; }
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
           <div id="printable-invoice-content" className="bg-white text-slate-900 w-full h-full relative flex flex-col font-sans">
                <div className="p-[10mm] h-full flex flex-col">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                            {data.companyProfile.logo ? (
                                <img src={data.companyProfile.logo} className="w-16 h-16 object-contain" alt="Logo" />
                            ) : (
                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-2xl">
                                    {data.companyProfile.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">{data.companyProfile.name}</h1>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{data.companyProfile.tagline || 'Business Management'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">GSTIN: {data.companyProfile.gstin}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-blue-600">{viewingInvoice.subType.replace('_', ' ')}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{data.companyProfile.email}</p>
                            {viewingInvoice.extraFields?.customerCare && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Care: {viewingInvoice.extraFields.customerCare}</p>}
                        </div>
                    </div>

                    <div className="flex mb-8">
                        <div className="h-1.5 w-24 bg-blue-600"></div>
                        <div className="h-1.5 flex-1 bg-slate-200"></div>
                    </div>

                    {/* Info Section - Split for Shipping */}
                    <div className="flex justify-between items-start mb-8 gap-8">
                        {/* Billing Details */}
                        <div className="flex-1">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Details of Receiver (Billed To)</p>
                            <h3 className="text-base font-black text-slate-900 mb-1 uppercase">{viewingInvoice.partyName}</h3>
                            <div className="text-xs font-medium text-slate-500 space-y-0.5">
                                <p className="leading-tight">{viewingInvoice.partyAddress || 'No Address Provided'}</p>
                                <p>Ph: {viewingInvoice.partyPhone}</p>
                                {viewingInvoice.partyArea && <p>Area: {viewingInvoice.partyArea} {viewingInvoice.partySubArea ? `, ${viewingInvoice.partySubArea}` : ''}</p>}
                                {viewingInvoice.partyGstin && <p className="font-bold">GSTIN: {viewingInvoice.partyGstin}</p>}
                            </div>
                        </div>

                        {/* Shipping Details */}
                        {viewingInvoice.shippingDetails && (
                            <div className="flex-1 border-l border-slate-200 pl-8">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Details of Consignee (Shipped To)</p>
                                <h3 className="text-base font-black text-slate-900 mb-1 uppercase">{viewingInvoice.shippingDetails.name}</h3>
                                <div className="text-xs font-medium text-slate-500 space-y-0.5">
                                    <p className="leading-tight">{viewingInvoice.shippingDetails.address}</p>
                                    {viewingInvoice.shippingDetails.gstin && <p>GSTIN: {viewingInvoice.shippingDetails.gstin}</p>}
                                </div>
                            </div>
                        )}

                        <div className="text-right space-y-1">
                            <div className="mb-2">
                                <span className="text-slate-900 font-bold text-lg">Invoice no : </span>
                                <span className="text-slate-900 font-black text-lg">{viewingInvoice.invoiceNo}</span>
                            </div>
                            <p className="text-slate-500 font-bold">{new Date(viewingInvoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            
                            {/* Extra Invoice Meta */}
                            {viewingInvoice.extraFields?.poNo && <p className="text-xs font-bold text-slate-600">PO No: {viewingInvoice.extraFields.poNo}</p>}
                            {viewingInvoice.extraFields?.vehicleNo && <p className="text-xs font-bold text-slate-600">Vehicle: {viewingInvoice.extraFields.vehicleNo}</p>}
                            {viewingInvoice.extraFields?.ewayBill && <p className="text-xs font-bold text-slate-600">E-Way: {viewingInvoice.extraFields.ewayBill}</p>}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="mb-8">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">
                                    <th className="py-3 px-2 text-left w-10">#</th>
                                    <th className="py-3 px-2 text-left">Description</th>
                                    <th className="py-3 px-2 text-center w-16">HSN</th>
                                    <th className="py-3 px-2 text-center w-16">Qty</th>
                                    <th className="py-3 px-2 text-right w-24">Rate</th>
                                    {viewingInvoice.isIgst ? (
                                        <th className="py-3 px-2 text-right w-20">IGST</th>
                                    ) : (
                                        <>
                                            <th className="py-3 px-2 text-right w-16">CGST</th>
                                            <th className="py-3 px-2 text-right w-16">SGST</th>
                                        </>
                                    )}
                                    <th className="py-3 px-2 text-right w-28">Total</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs font-bold text-slate-700">
                                {viewingInvoice.items.map((item, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}>
                                        <td className="py-3 px-2 text-left border-b border-slate-100">{idx + 1}</td>
                                        <td className="py-3 px-2 text-left border-b border-slate-100 uppercase">{item.productName}</td>
                                        <td className="py-3 px-2 text-center border-b border-slate-100">{item.hsn}</td>
                                        <td className="py-3 px-2 text-center border-b border-slate-100">{item.quantity}</td>
                                        <td className="py-3 px-2 text-right border-b border-slate-100">₹{item.rate}</td>
                                        {viewingInvoice.isIgst ? (
                                            <td className="py-3 px-2 text-right border-b border-slate-100 text-slate-500">₹{item.igst.toFixed(2)}</td>
                                        ) : (
                                            <>
                                                <td className="py-3 px-2 text-right border-b border-slate-100 text-slate-500">₹{item.cgst.toFixed(2)}</td>
                                                <td className="py-3 px-2 text-right border-b border-slate-100 text-slate-500">₹{item.sgst.toFixed(2)}</td>
                                            </>
                                        )}
                                        <td className="py-3 px-2 text-right border-b border-slate-100 text-slate-900">₹{item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex-1"></div>

                    {/* Bottom Section */}
                    <div className="flex justify-between items-end gap-12 mb-8">
                        
                        {/* Left Column: Bank & Terms */}
                        <div className="flex-1 space-y-6">
                            {viewingInvoice.bankDetails && (
                                <div>
                                    <div className="bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest py-1 px-3 inline-block mb-2 rounded">
                                        Banking Details
                                    </div>
                                    <div className="text-xs font-medium text-slate-600 space-y-0.5">
                                        <p><span className="font-bold text-slate-800">Bank:</span> {viewingInvoice.bankDetails.bankName}</p>
                                        <p><span className="font-bold text-slate-800">A/C No:</span> {viewingInvoice.bankDetails.accNo}</p>
                                        <p><span className="font-bold text-slate-800">IFSC:</span> {viewingInvoice.bankDetails.ifsc}</p>
                                        <p><span className="font-bold text-slate-800">Branch:</span> {viewingInvoice.bankDetails.branch}</p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-200">
                                {viewingInvoice.terms && (
                                    <>
                                        <p className="font-bold text-slate-800 text-[10px] mb-1 uppercase">Terms & Conditions :</p>
                                        <div className="text-[9px] text-slate-500 leading-relaxed max-w-sm whitespace-pre-line">
                                            {viewingInvoice.terms}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Totals & Signature */}
                        <div className="w-72 space-y-4">
                            <div className="space-y-2 pb-2">
                                <div className="flex justify-between text-xs font-bold text-slate-600">
                                    <span>Sub Total</span>
                                    <span className="text-slate-900">₹{viewingInvoice.subTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-600">
                                    <span>Total Tax</span>
                                    <span className="text-slate-900">₹{viewingInvoice.totalGst.toLocaleString()}</span>
                                </div>
                                {viewingInvoice.roundOff !== 0 && (
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Round Off</span>
                                        <span>{viewingInvoice.roundOff > 0 ? '+' : ''}{viewingInvoice.roundOff?.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-blue-600 text-white p-3 flex justify-between items-center rounded">
                                <span className="font-black text-sm uppercase">Grand Total</span>
                                <span className="font-black text-xl">₹{viewingInvoice.grandTotal.toLocaleString()}</span>
                            </div>
                            <div className="text-[9px] font-bold text-slate-500 text-right italic">
                                ({numberToWords(viewingInvoice.grandTotal)})
                            </div>

                            <div className="pt-10 text-right">
                                <p className="font-serif italic text-2xl text-slate-400 mb-1" style={{ fontFamily: 'cursive' }}>Authorized Signatory</p>
                                <p className="font-black text-slate-900 text-xs uppercase">{data.companyProfile.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Strip */}
                    <div className="border-t-2 border-slate-200 pt-4 flex justify-between items-center text-slate-500">
                        <div className="flex items-center gap-2">
                            <Phone size={14} className="text-blue-600" />
                            <span className="text-[10px] font-bold">{data.companyProfile.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-blue-600" />
                            <span className="text-[10px] font-bold">{data.companyProfile.address.split(',')[0]}</span>
                        </div>
                    </div>
                </div>
           </div>
        </div>
      )}

      {/* Main UI */}
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
              {/* Header Controls */}
              <div className="flex flex-wrap justify-between items-start mb-10 pb-8 border-b border-slate-50 gap-6">
                <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-[2rem] shadow-xl ${editingInvoice ? 'bg-amber-100 text-amber-600' : themeClasses.lightBg + ' ' + themeClasses.text}`}>
                     {editingInvoice ? <Edit2 size={36}/> : <ShoppingBag size={36} />}
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-1">{editingInvoice ? 'Modify Voucher' : (type === 'SALE' ? 'Sales Ledger' : 'Purchase Ledger')}</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{editingInvoice ? `Editing: ${editingInvoice.invoiceNo}` : 'Integrated Registry System'}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 items-end">
                    <div className="flex items-center gap-2 bg-slate-900/10 p-1 rounded-xl">
                        {(['TAX_INVOICE', 'DELIVERY_CHALLAN', 'PROFORMA_INVOICE'] as const).map(t => (
                            <button key={t} onClick={() => setSubType(t)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${subType === t ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}>
                                {t.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsIgst(!isIgst)}>
                            <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${isIgst ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                {isIgst && <CheckCircle size={12} className="text-white"/>}
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IGST (Inter-state)</span>
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setGstEnabled(!gstEnabled)}>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${gstEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${gstEnabled ? 'translate-x-5' : ''}`}></div>
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tax Enabled</span>
                        </div>
                    </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-3 space-y-8">
                  {/* Identity Selection */}
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
                        <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm disabled:opacity-50 uppercase" value={!selectedPartyId ? manualArea : (selectedParty?.area || '')} onChange={e => setManualArea(e.target.value)} disabled={!!selectedPartyId} placeholder="City / Area" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400">Sub-Area / Landmark</label>
                        <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm disabled:opacity-50 uppercase" value={!selectedPartyId ? manualSubArea : (selectedParty?.subArea || '')} onChange={e => setManualSubArea(e.target.value)} disabled={!!selectedPartyId} placeholder="Specific Market / Street" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400">Tax ID (GSTIN)</label>
                        <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm disabled:opacity-50 uppercase" value={!selectedPartyId ? manualGstin : (selectedParty?.gstin || '')} onChange={e => setManualGstin(e.target.value)} disabled={!!selectedPartyId} placeholder="GSTIN (Optional)" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400">Full Address</label>
                        <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm disabled:opacity-50 uppercase" value={!selectedPartyId ? manualAddress : (selectedParty?.address || '')} onChange={e => setManualAddress(e.target.value)} disabled={!!selectedPartyId} placeholder="Full Billing Address" />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address Toggle */}
                  <div className={`p-8 rounded-[2.5rem] border transition-all shadow-sm space-y-6 ${enableShipping ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                     <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                           <TruckIcon size={16} className={enableShipping ? "text-blue-600" : "text-slate-400"} />
                           Shipping Details
                        </h4>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setEnableShipping(!enableShipping)}>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${enableShipping ? 'bg-blue-500' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${enableShipping ? 'translate-x-5' : ''}`}></div>
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ship to different address?</span>
                        </div>
                     </div>
                     
                     {enableShipping && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 fade-in">
                           <div className="md:col-span-2 flex justify-end">
                                <button onClick={copyBillingToShipping} className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline"><Copy size={12}/> Copy from Billing</button>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase text-slate-400">Consignee Name</label>
                              <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm uppercase" value={shipName} onChange={e => setShipName(e.target.value)} placeholder="Receiving Party" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase text-slate-400">GSTIN (If different)</label>
                              <input type="text" className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm uppercase" value={shipGstin} onChange={e => setShipGstin(e.target.value)} placeholder="Consignee GSTIN" />
                           </div>
                           <div className="space-y-2 md:col-span-2">
                              <label className="text-[9px] font-black uppercase text-slate-400">Shipping Address</label>
                              <textarea className="w-full border-2 border-white rounded-2xl p-4 text-sm font-bold bg-white outline-none shadow-sm uppercase resize-none" rows={2} value={shipAddress} onChange={e => setShipAddress(e.target.value)} placeholder="Delivery Location" />
                           </div>
                        </div>
                     )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 border-l pl-10 border-slate-50">
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Voucher #</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-5 font-black text-slate-700 bg-slate-50 outline-none uppercase" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Timeline</label><input type="date" className="w-full border-2 border-slate-50 rounded-2xl p-5 font-black text-slate-700 bg-slate-50 outline-none" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
                  
                  {/* Extra Fields */}
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">P.O. Number</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold text-slate-600 bg-slate-50 outline-none uppercase text-xs" placeholder="Optional" value={extraFields.poNo} onChange={e => setExtraFields({...extraFields, poNo: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Vehicle No</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold text-slate-600 bg-slate-50 outline-none uppercase text-xs" placeholder="MH-04..." value={extraFields.vehicleNo} onChange={e => setExtraFields({...extraFields, vehicleNo: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">E-Way Bill</label><input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 font-bold text-slate-600 bg-slate-50 outline-none uppercase text-xs" placeholder="12 Digit..." value={extraFields.ewayBill} onChange={e => setExtraFields({...extraFields, ewayBill: e.target.value})} /></div>
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

            {/* Terms & Bank Details Inputs */}
            <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Landmark size={14}/> Bank Details (For Invoice)</h4>
                        <button onClick={saveBankAsDefault} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Set as Default</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input className="border-2 border-slate-100 rounded-xl p-3 text-xs font-bold bg-slate-50 outline-none" placeholder="Bank Name" value={bankDetails.bankName} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} />
                        <input className="border-2 border-slate-100 rounded-xl p-3 text-xs font-bold bg-slate-50 outline-none" placeholder="Account No" value={bankDetails.accNo} onChange={e => setBankDetails({...bankDetails, accNo: e.target.value})} />
                        <input className="border-2 border-slate-100 rounded-xl p-3 text-xs font-bold bg-slate-50 outline-none" placeholder="IFSC" value={bankDetails.ifsc} onChange={e => setBankDetails({...bankDetails, ifsc: e.target.value})} />
                        <input className="border-2 border-slate-100 rounded-xl p-3 text-xs font-bold bg-slate-50 outline-none" placeholder="Branch" value={bankDetails.branch} onChange={e => setBankDetails({...bankDetails, branch: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileSignature size={14}/> Terms & Conditions</h4>
                    <textarea className="w-full h-32 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold bg-slate-50 outline-none resize-none" value={terms} onChange={e => setTerms(e.target.value)} />
                </div>
            </div>
          </div>

          <div className="xl:col-span-1 space-y-8">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm sticky top-6 space-y-8">
                <div className="flex items-center gap-4"><div className={`p-4 ${themeClasses.bg} text-white rounded-2xl shadow-xl`}><Calculator size={24} /></div><h3 className="font-black text-slate-800 text-[11px] uppercase tracking-widest">Financial Summary</h3></div>
                
                <div className="space-y-4 pb-8 border-b border-slate-50">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Net Value</span><span className="tabular-nums">₹{totals.subTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-widest"><span>Total Tax</span><span className="tabular-nums">+ ₹{totals.totalGst.toLocaleString()}</span></div>
                  {totals.roundOff !== 0 && <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Round Off</span><span className="tabular-nums">{totals.roundOff > 0 ? '+' : ''}{totals.roundOff.toFixed(2)}</span></div>}
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
                       <td className="px-6 py-6 font-black text-slate-900">
                           {inv.invoiceNo}
                           <span className="block text-[8px] text-slate-400 uppercase font-bold mt-1">{inv.subType?.replace('_', ' ')}</span>
                       </td>
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
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</p><p className="text-sm font-bold text-slate-600 uppercase">{detailInvoice.subType?.replace('_', ' ')}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p><p className={`text-sm font-bold uppercase ${detailInvoice.grandTotal === detailInvoice.amountPaid ? 'text-emerald-600' : 'text-rose-600'}`}>{detailInvoice.grandTotal === detailInvoice.amountPaid ? 'Fully Paid' : 'Partial/Due'}</p></div>
                    {detailInvoice.shippingDetails && (
                        <div className="col-span-2 pt-2 border-t border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shipped To</p>
                            <p className="text-xs font-bold text-slate-700 uppercase">{detailInvoice.shippingDetails.name}, {detailInvoice.shippingDetails.address}</p>
                        </div>
                    )}
                 </div>
                 
                 <table className="w-full text-left">
                    <thead className="bg-white text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-100">
                       <tr><th className="py-3">Item</th><th className="py-3 text-center">HSN</th><th className="py-3 text-center">Qty</th><th className="py-3 text-right">Rate</th><th className="py-3 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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
                       {detailInvoice.roundOff !== 0 && (
                           <div className="flex justify-between w-48 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><span>Round Off</span><span>{detailInvoice.roundOff > 0 ? '+' : ''}{detailInvoice.roundOff?.toFixed(2)}</span></div>
                       )}
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

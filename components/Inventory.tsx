
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Product, Invoice } from '../types';
import { Plus, Search, Filter, Edit2, Trash2, Package, Tag, X, ListFilter, Settings2, BarChart3, Activity, Info, Layers, ChevronRight, AlertCircle, CheckCircle2, Hash, FileSpreadsheet, Clock, Calendar, Eye, History, MapPin } from 'lucide-react';
import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from 'recharts';
import * as XLSX from 'xlsx';

interface InventoryProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  initialFilter?: string | null;
}

const Inventory: React.FC<InventoryProps> = ({ data, updateData, initialFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'VELOCITY'>('LIST');
  const [viewingHistory, setViewingHistory] = useState<Product | null>(null);

  // Handle incoming filters from Dashboard/Command Palette
  useEffect(() => {
    if (initialFilter === "LOW_STOCK") {
      setSearchTerm(''); // Clear search if we're doing a functional filter
    } else if (initialFilter) {
      setSearchTerm(initialFilter);
    }
  }, [initialFilter]);

  const filteredProducts = useMemo(() => {
    let list = data.products;
    if (initialFilter === "LOW_STOCK") {
      list = list.filter(p => p.stock <= p.minStockAlert);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(s) || 
        p.hsn.includes(s) ||
        p.category.toLowerCase().includes(s) ||
        (p.location && p.location.toLowerCase().includes(s)) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(s))
      );
    }
    return list;
  }, [data.products, searchTerm, initialFilter]);

  const existingSubCategories = useMemo(() => {
    const subs = new Set<string>();
    data.products.forEach(p => {
      if (p.subCategory) subs.add(p.subCategory);
    });
    return Array.from(subs).sort();
  }, [data.products]);

  const categoryHeatmapData = useMemo(() => {
    return data.productCategories.map(cat => {
      const items = data.products.filter(p => p.category === cat);
      const totalValue = items.reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0);
      return { name: cat, size: totalValue || 0, count: items.length };
    }).filter(c => c.size > 0);
  }, [data.products, data.productCategories]);

  const handleDelete = (id: string) => {
    if (confirm('Permanently remove this item from the master inventory?')) {
      const updated = data.products.filter(p => p.id !== id);
      updateData({ products: updated });
    }
  };

  const handleSaveProduct = (newProd: Product) => {
    const products = [...data.products];
    if (editingProduct) {
      const idx = products.findIndex(p => p.id === editingProduct.id);
      const finalProd = { ...newProd };
      if (newProd.stock > editingProduct.stock) {
        finalProd.lastRestockedDate = new Date().toISOString();
      }
      products[idx] = finalProd;
    } else {
      products.push({ 
        ...newProd, 
        id: Math.random().toString(36).substr(2, 9),
        lastRestockedDate: new Date().toISOString() 
      });
    }
    updateData({ products });
    setShowAddModal(false);
  };

  const exportToExcel = () => {
    const exportData = data.products.map(p => {
      const ageDays = Math.floor((new Date().getTime() - new Date(p.lastRestockedDate).getTime()) / (1000 * 3600 * 24));
      return {
        'SKU Name': p.name,
        'Location': p.location || 'Not Set',
        'Category': p.category,
        'Sub-Category': p.subCategory || 'N/A',
        'HSN Code': p.hsn,
        'GST Rate %': p.gstRate,
        'Purchase Price': p.purchasePrice,
        'Sale Price': p.salePrice,
        'Current Stock': p.stock,
        'Stock Valuation (At Purchase)': p.stock * p.purchasePrice,
        'Stock Age (Days)': ageDays,
        'Last Restocked': new Date(p.lastRestockedDate).toLocaleDateString()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Report');
    XLSX.writeFile(workbook, `Usha_Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getAgeingStatus = (lastRestocked: string) => {
    const days = Math.floor((new Date().getTime() - new Date(lastRestocked).getTime()) / (1000 * 3600 * 24));
    if (days < 30) return { label: `${days}d Fresh`, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <Activity size={10}/> };
    if (days < 90) return { label: `${days}d Stable`, color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Clock size={10}/> };
    return { label: `${days}d Stagnant`, color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <AlertCircle size={10}/> };
  };

  const productHistoryRecords = useMemo(() => {
    if (!viewingHistory) return [];
    const logs: { date: string, type: 'SALE' | 'PURCHASE', party: string, qty: number, rate: number }[] = [];
    data.invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (item.productId === viewingHistory.id) {
          logs.push({
            date: inv.date,
            type: inv.type,
            party: inv.partyName,
            qty: item.quantity,
            rate: item.rate
          });
        }
      });
    });
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewingHistory, data.invoices]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 no-print">
        <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <button onClick={() => setActiveTab('LIST')} className={`px-10 py-3 rounded-2xl text-[11px] font-black tracking-widest transition-all ${activeTab === 'LIST' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>ITEM REGISTRY</button>
          <button onClick={() => setActiveTab('VELOCITY')} className={`px-10 py-3 rounded-2xl text-[11px] font-black tracking-widest transition-all ${activeTab === 'VELOCITY' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>INVESTMENT HEATMAP</button>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={exportToExcel}
            className="px-6 py-4 bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100 rounded-2xl uppercase tracking-widest shadow-sm hover:bg-emerald-600 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet size={18} /> Export .xlsx
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setShowAddModal(true); }}
            className="flex-1 md:flex-none px-10 py-4 bg-blue-600 text-white text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Plus size={20} strokeWidth={3} /> Register New SKU
          </button>
        </div>
      </div>

      {activeTab === 'LIST' ? (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 no-print">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
              <input type="text" placeholder="Search by name, HSN, category, or locator ID..." className="pl-14 pr-6 py-4 w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-100 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => setShowCategoryManager(true)} className="px-8 py-4 bg-white border-2 border-slate-100 hover:border-blue-200 hover:text-blue-600 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-sm">
              <ListFilter size={20}/> Categories
            </button>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 uppercase text-[9px] font-black tracking-[0.25em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-8">SKU Intelligence</th>
                    <th className="px-6 py-8">Classification</th>
                    <th className="px-6 py-8 text-center">In-Stock</th>
                    <th className="px-6 py-8 text-center">Stock Locator</th>
                    <th className="px-6 py-8 text-right">Valuation</th>
                    <th className="px-10 py-8 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map(p => {
                    const ageing = getAgeingStatus(p.lastRestockedDate);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                            <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                              <Package size={24} />
                            </div>
                            <div>
                              <p className="font-black text-sm text-slate-800 uppercase tracking-tight leading-none mb-2">{p.name}</p>
                              <div className="flex items-center gap-3">
                                 <span className="text-[9px] font-black text-slate-300 uppercase flex items-center gap-1.5 tracking-widest"><Hash size={12} /> HSN: {p.hsn || '---'}</span>
                                 <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Rate: {p.gstRate}%</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex flex-col gap-2">
                            <span className="px-3 py-1 bg-white border border-slate-100 text-slate-600 rounded-xl text-[8px] font-black uppercase tracking-widest w-fit shadow-sm">{p.category}</span>
                            {p.subCategory && <span className="text-[9px] font-bold text-blue-500 uppercase ml-1 flex items-center gap-1.5"><Layers size={10}/> {p.subCategory}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-base font-black tabular-nums ${p.stock <= p.minStockAlert ? 'text-rose-600' : 'text-slate-900'}`}>{p.stock.toLocaleString()}</span>
                            {p.stock <= p.minStockAlert && (
                              <span className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase tracking-widest mt-2 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">Critical</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-8 text-center">
                          {p.location ? (
                            <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl w-fit mx-auto shadow-sm">
                               <MapPin size={12} />
                               <span className="text-[9px] font-black uppercase tracking-widest">{p.location}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black text-slate-300 uppercase italic opacity-40">Not Mapped</span>
                          )}
                        </td>
                        <td className="px-6 py-8 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Selling Rate</span>
                            <span className="text-base font-black text-slate-900 tabular-nums">₹{p.salePrice.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex justify-center gap-2.5">
                            <button onClick={() => setViewingHistory(p)} title="View SKU History" className="p-3 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 border border-slate-100 rounded-xl transition-all shadow-sm"><History size={18}/></button>
                            <button onClick={() => { setEditingProduct(p); setShowAddModal(true); }} className="p-3 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200 border border-slate-100 rounded-xl transition-all shadow-sm"><Edit2 size={18}/></button>
                            <button onClick={() => handleDelete(p.id)} className="p-3 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 border border-slate-100 rounded-xl transition-all shadow-sm"><Trash2 size={18}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredProducts.length === 0 && (
              <div className="py-32 text-center flex flex-col items-center gap-6">
                 <div className="p-8 bg-slate-50 rounded-full"><Package size={56} className="text-slate-200" /></div>
                 <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[11px]">No SKU matches found in registry</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in slide-in-from-bottom-4 duration-500">
           <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-12">
                 <div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3">Investment Allocation</h3>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Master Heatmap</p>
                 </div>
                 <div className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-100"><Activity size={32}/></div>
              </div>
              <div className="h-[500px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <Treemap 
                      data={categoryHeatmapData} 
                      dataKey="size" 
                      aspectRatio={16 / 9} 
                      stroke="#fff" 
                      fill="#4f46e5"
                    >
                       <RechartsTooltip contentStyle={{ borderRadius: '28px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.2)', padding: '20px', fontSize: '14px', fontWeight: 'bold' }} />
                    </Treemap>
                 </ResponsiveContainer>
              </div>
           </div>
           <div className="space-y-10">
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
                 <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="p-3 bg-blue-500 rounded-2xl shadow-xl shadow-blue-500/30"><Info size={24} /></div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-300">Strategic Intelligence</h4>
                 </div>
                 <p className="text-sm text-slate-400 leading-relaxed font-bold relative z-10 uppercase tracking-tight">
                    This visualization displays the distribution of capital within your warehouse. Larger blocks indicate significant capital lock-in. Prioritize clearance for stagnant blocks.
                 </p>
                 <div className="absolute -bottom-16 -right-16 opacity-5 transform rotate-12 pointer-events-none"><BarChart3 size={300} /></div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex-1 flex flex-col">
                 <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 border-b border-slate-50 pb-4">Weightage Breakdown</h4>
                 <div className="space-y-5">
                    {categoryHeatmapData.sort((a,b) => b.size - a.size).slice(0, 5).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-50 hover:bg-blue-50/50 border border-transparent hover:border-blue-100 rounded-3xl transition-all shadow-sm group">
                         <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{cat.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1.5">{cat.count} Master SKUs</span>
                         </div>
                         <div className="text-right">
                            <span className="text-sm font-black text-blue-600 tabular-nums">₹{cat.size.toLocaleString()}</span>
                            <p className="text-[8px] font-black text-slate-300 uppercase mt-1 tracking-tighter">Valuation</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* SKU History Modal */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[3.5rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in border border-white/20 flex flex-col max-h-[85vh]">
             <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-6">
                   <div className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-xl"><History size={28}/></div>
                   <div>
                      <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none mb-1.5">{viewingHistory.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU Transaction Narrative</p>
                   </div>
                </div>
                <button onClick={() => setViewingHistory(null)} className="p-5 hover:bg-white rounded-full text-slate-400 transition-colors"><X size={36}/></button>
             </div>
             <div className="overflow-y-auto flex-1 bg-white p-8">
                {productHistoryRecords.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b">
                      <tr>
                        <th className="px-6 py-4">Timeline</th>
                        <th className="px-6 py-4">Vector</th>
                        <th className="px-6 py-4">Corporate Entity</th>
                        <th className="px-6 py-4 text-center">Volume</th>
                        <th className="px-6 py-4 text-right">Unit Val (₹)</th>
                        <th className="px-6 py-4 text-right">Ext Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productHistoryRecords.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-5 text-xs font-black text-slate-600 tabular-nums">{new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="px-6 py-5">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${log.type === 'SALE' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                               {log.type}
                             </span>
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-700 uppercase text-xs truncate max-w-[150px]">{log.party}</td>
                          <td className="px-6 py-5 text-center font-black text-slate-900 tabular-nums">{log.qty} Units</td>
                          <td className="px-6 py-5 text-right font-bold text-slate-400 tabular-nums">₹{log.rate.toLocaleString()}</td>
                          <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums text-sm">₹{(log.qty * log.rate).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-24 text-center">
                    <Package size={64} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">No historical movement logged for this SKU</p>
                  </div>
                )}
             </div>
             <div className="p-8 bg-slate-50 border-t flex justify-between items-center">
                <div className="flex gap-10">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total units sold</p>
                      <p className="text-lg font-black text-blue-600">{productHistoryRecords.filter(r => r.type === 'SALE').reduce((acc, r) => acc + r.qty, 0)} Units</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total units inward</p>
                      <p className="text-lg font-black text-emerald-600">{productHistoryRecords.filter(r => r.type === 'PURCHASE').reduce((acc, r) => acc + r.qty, 0)} Units</p>
                   </div>
                </div>
                <button onClick={() => setViewingHistory(null)} className="px-10 py-4 bg-slate-900 text-white font-black text-[10px] rounded-2xl uppercase tracking-widest shadow-xl">Close Analysis</button>
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <ProductModal 
          product={editingProduct} 
          categories={data.productCategories}
          subCategories={existingSubCategories}
          onClose={() => setShowAddModal(false)} 
          onSave={handleSaveProduct}
        />
      )}

      {showCategoryManager && (
        <CategoryManager 
          categories={data.productCategories} onClose={() => setShowCategoryManager(false)} 
          onSave={(newCats) => updateData({ productCategories: newCats })} 
        />
      )}
    </div>
  );
};

const CategoryManager: React.FC<{categories: string[], onClose: () => void, onSave: (cats: string[]) => void}> = ({ categories, onClose, onSave }) => {
  const [cats, setCats] = useState(categories);
  const [newCat, setNewCat] = useState('');
  const handleAdd = () => { if (!newCat.trim() || cats.includes(newCat.trim())) return; const u = [...cats, newCat.trim()]; setCats(u); setNewCat(''); onSave(u); };
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-[3.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-white/20">
        <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl"><ListFilter size={28}/></div>
            <div>
               <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight leading-none mb-1.5">Parent Catalog</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registry Segmentation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-white rounded-full text-slate-400 transition-colors"><X size={32}/></button>
        </div>
        <div className="p-12 space-y-10">
          <div className="flex gap-4">
            <input type="text" className="flex-1 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-inner bg-slate-50" placeholder="Define Segment..." value={newCat} onChange={e => setNewCat(e.target.value)} />
            <button onClick={handleAdd} className="px-6 py-5 bg-slate-900 text-white rounded-2xl shadow-2xl active:scale-95 transition-all"><Plus size={28} strokeWidth={3}/></button>
          </div>
          <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
            {cats.map(c => (
              <div key={c} className="group flex items-center justify-between p-5 bg-white border-2 border-slate-50 rounded-[1.5rem] hover:border-blue-100 hover:bg-blue-50/20 transition-all shadow-sm">
                <span className="text-xs font-black uppercase text-slate-700 tracking-widest">{c}</span>
                <button onClick={() => { const u = cats.filter(cat => cat !== c); setCats(u); onSave(u); }} className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X size={20}/></button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-10 bg-slate-50 flex justify-center border-t border-slate-100">
           <button onClick={onClose} className="w-full py-5 bg-slate-900 text-white font-black text-[11px] rounded-2xl uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 active:scale-95 transition-all">Finalize Classification</button>
        </div>
      </div>
    </div>
  );
};

const ProductModal: React.FC<{product: Product|null, categories: string[], subCategories: string[], onClose:()=>void, onSave:(p:Product)=>void}> = ({ product, categories, subCategories, onClose, onSave }) => {
  const [formData, setFormData] = useState<Product>(product || { 
    id:'', name:'', hsn:'', gstRate:18, purchasePrice:0, salePrice:0, stock:0, openingStock:0, minStockAlert:5, category: categories[0] || '', subCategory: '',
    lastRestockedDate: new Date().toISOString(), location: ''
  });
  
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[120] flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-[4rem] w-full max-w-2xl overflow-hidden shadow-[0_45px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300 border border-white/10">
        <div className="p-12 border-b flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-6">
              <div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-2xl shadow-blue-200"><Package size={32}/></div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-1.5">{product ? 'SKU Calibration' : 'Master Registry Injection'}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Product Intelligence Mapping</p>
              </div>
           </div>
           <button onClick={onClose} className="p-5 hover:bg-white rounded-full text-slate-400 transition-colors"><X size={36}/></button>
        </div>
        
        <div className="p-14 space-y-12 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4 md:col-span-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Universal Item Nomenclature</label>
              <input className="w-full border-2 border-slate-100 rounded-[1.5rem] p-6 text-base font-bold bg-slate-50 outline-none focus:border-blue-400 focus:bg-white shadow-inner transition-all" placeholder="e.g. MS Heavy Duty Seamless Pipe 12.5mm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Parent Segment</label>
              <select className="w-full border-2 border-slate-100 rounded-[1.5rem] p-6 text-sm font-bold bg-white outline-none focus:border-blue-400 shadow-sm transition-all appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="">Choose Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Physical Stock Locator</label>
              <div className="relative">
                <input className="w-full border-2 border-slate-100 rounded-[1.5rem] p-6 text-sm font-bold bg-slate-50 outline-none focus:border-blue-400 focus:bg-white shadow-inner transition-all uppercase" placeholder="e.g. B-04 / Shelf-A" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none"><MapPin size={22}/></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">GST HSN ID</label>
              <input className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-400 shadow-inner transition-all uppercase" placeholder="8-Digit Code" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em] ml-1">Procurement (₹)</label>
              <input type="number" className="w-full border-2 border-rose-100 rounded-2xl p-5 text-lg font-black bg-rose-50/50 text-rose-700 outline-none focus:border-rose-400 shadow-inner transition-all tabular-nums" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] ml-1">Sale Target (₹)</label>
              <input type="number" className="w-full border-2 border-emerald-100 rounded-2xl p-5 text-lg font-black bg-emerald-50/50 text-emerald-700 outline-none focus:border-emerald-400 shadow-inner transition-all tabular-nums" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: Number(e.target.value)})} />
            </div>
          </div>
        </div>

        <div className="p-12 bg-slate-50 flex justify-end gap-8 border-t border-slate-100">
          <button onClick={onClose} className="px-10 py-6 font-black text-[11px] text-slate-400 uppercase tracking-[0.3em] active:scale-95 transition-all">Discard Changes</button>
          <button onClick={() => onSave(formData)} className="px-16 py-6 bg-blue-600 text-white font-black text-[11px] rounded-2xl shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-[0.3em]">Authorize Vault Entry</button>
        </div>
      </div>
    </div>
  );
};

export default Inventory;

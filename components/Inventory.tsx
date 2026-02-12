
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Product, Invoice } from '../types';
import { Plus, Search, Filter, Edit2, Trash2, Package, Tag, X, ListFilter, Settings2, BarChart3, Activity, Info, Layers, ChevronRight, AlertCircle, CheckCircle2, Hash, FileSpreadsheet, Clock, Calendar, Eye, History, MapPin, ShieldCheck, Zap, Sparkles, ChevronDown, Tags, Save, LocateFixed } from 'lucide-react';
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
  
  // Stock History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (initialFilter === "LOW_STOCK") setSearchTerm('');
    else if (initialFilter) setSearchTerm(initialFilter);
  }, [initialFilter]);

  const filteredProducts = useMemo(() => {
    let list = data.products;
    if (initialFilter === "LOW_STOCK") list = list.filter(p => p.stock <= p.minStockAlert);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(s) || 
        p.category.toLowerCase().includes(s) ||
        p.location?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [data.products, searchTerm, initialFilter]);

  const getAgeingStatus = (lastRestocked: string) => {
    const days = Math.floor((new Date().getTime() - new Date(lastRestocked).getTime()) / (1000 * 3600 * 24));
    if (days <= 30) return { label: 'Fresh', desc: `${days} days ago`, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <Zap size={10} className="fill-emerald-600" /> };
    if (days <= 90) return { label: 'Active', desc: `${days} days ago`, color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Activity size={10} /> };
    return { label: 'Stagnant', desc: `Over ${days} days`, color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <Clock size={10} /> };
  };

  const getProductHistory = (prodId: string) => {
    const history: any[] = [];
    data.invoices.forEach(inv => {
      const item = inv.items.find(i => i.productId === prodId);
      if(item) {
        history.push({
          date: inv.date,
          type: inv.type, // SALE or PURCHASE
          party: inv.partyName,
          qty: item.quantity,
          rate: item.rate,
          invNo: inv.invoiceNo
        });
      }
    });
    return history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleSaveProduct = (newProd: Product) => {
    const products = [...data.products];
    // Auto-add category if it doesn't exist
    const categories = data.productCategories.includes(newProd.category) 
        ? data.productCategories 
        : [...data.productCategories, newProd.category];

    if (editingProduct) {
      const idx = products.findIndex(p => p.id === editingProduct.id);
      products[idx] = { 
          ...newProd, 
          id: editingProduct.id, 
          lastRestockedDate: editingProduct.lastRestockedDate 
      };
    } else {
      products.push({ ...newProd, id: Math.random().toString(36).substr(2, 9), lastRestockedDate: new Date().toISOString() });
    }
    
    updateData({ products, productCategories: categories });
    setShowAddModal(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-[1.2rem] shadow-xl"><Package size={24}/></div>
            Inventory Intelligence
          </h2>
          <p className="text-slate-400 text-[11px] mt-1 font-black uppercase tracking-[0.2em]">Master Stock Registry & Ageing Profile</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowCategoryManager(true)} className="px-6 py-4 bg-white text-slate-600 text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3 border border-slate-200">
            <Tags size={18} /> Manage Segments
          </button>
          <button onClick={() => { setEditingProduct(null); setShowAddModal(true); }} className="px-8 py-4 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3">
            <Plus size={20} strokeWidth={3} /> Register SKU
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6 no-print">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
          <input type="text" placeholder="Search by SKU Name, Category or Shelf ID..." className="pl-14 pr-6 py-4 w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-100 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all shadow-inner uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
          <thead className="bg-slate-50/50 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-10 py-8">SKU Detail</th>
              <th className="px-6 py-8">Location & Segment</th>
              <th className="px-6 py-8">Stock Volume</th>
              <th className="px-6 py-8">Ageing Profile</th>
              <th className="px-6 py-8 text-right">Unit Rate</th>
              <th className="px-10 py-8 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredProducts.map(p => {
              const ageing = getAgeingStatus(p.lastRestockedDate);
              const healthPct = Math.min(100, (p.stock / (p.minStockAlert * 3)) * 100);
              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-all ${p.stock <= p.minStockAlert ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white shadow-inner'}`}><Package size={20}/></div>
                      <div><p className="font-black text-sm text-slate-800 uppercase tracking-tight">{p.name}</p><p className="text-[9px] font-black text-slate-300 uppercase mt-1">HSN Code: {p.hsn || 'N/A'}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                     <div className="flex flex-col gap-1.5 items-start">
                        <span className="px-3 py-1 bg-white border border-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest">{p.category}</span>
                        {p.location && (
                           <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                              <MapPin size={10} /> {p.location}
                           </div>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-8">
                    <div className="w-40 space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase"><span className={p.stock <= p.minStockAlert ? 'text-rose-600' : 'text-slate-400'}>{p.stock} Units</span><span className="text-slate-200">Alert: {p.minStockAlert}</span></div>
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner"><div className={`h-full transition-all duration-1000 ${p.stock <= p.minStockAlert ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : p.stock <= p.minStockAlert * 1.5 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${healthPct}%` }}></div></div>
                    </div>
                  </td>
                  <td className="px-6 py-8"><div className="flex flex-col gap-1"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border flex items-center gap-2 w-fit ${ageing.color}`}>{ageing.icon} {ageing.label}</span><p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter ml-1">{ageing.desc}</p></div></td>
                  <td className="px-6 py-8 text-right font-black text-slate-900 tabular-nums">₹{p.salePrice.toLocaleString()}</td>
                  <td className="px-10 py-8">
                     <div className="flex justify-center gap-2">
                        <button onClick={() => { setHistoryProduct(p); setShowHistoryModal(true); }} className="p-2.5 bg-white text-slate-300 hover:text-indigo-600 rounded-xl border border-slate-100 shadow-sm transition-all active:scale-90" title="View History"><History size={16}/></button>
                        <button onClick={() => { setEditingProduct(p); setShowAddModal(true); }} className="p-2.5 bg-white text-slate-300 hover:text-blue-600 rounded-xl border border-slate-100 shadow-sm transition-all active:scale-90" title="Edit"><Edit2 size={16}/></button>
                        <button onClick={() => { if(confirm('Authorized Wipe: Erase this SKU from master catalog permanently?')) updateData({ products: data.products.filter(item => item.id !== p.id) }) }} className="p-2.5 bg-white text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 shadow-sm transition-all active:scale-90" title="Delete"><Trash2 size={16}/></button>
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCategoryManager && (
        <CategoryManager 
          categories={data.productCategories} 
          products={data.products}
          onUpdate={(newCategories, newProducts) => updateData({ productCategories: newCategories, products: newProducts })}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-12 space-y-10 shadow-2xl animate-in zoom-in duration-300 border border-white/10">
             <div className="flex justify-between items-center border-b border-slate-100 pb-6"><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Modify SKU' : 'Register New SKU'}</h3><button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24}/></button></div>
             <div className="grid grid-cols-1 gap-8">
                <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU Designation</label><input autoFocus type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all uppercase shadow-inner" placeholder="Product Name" value={editingProduct?.name || ''} onChange={e => setEditingProduct(prev => prev ? {...prev, name: e.target.value} : {...data.products[0], name: e.target.value, stock: 0, minStockAlert: 5, hsn: ''})} /></div>
                
                {/* Stock Locator Field */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={12}/> Stock Locator</label>
                       <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner uppercase" placeholder="Shelf A1" value={editingProduct?.location || ''} onChange={e => setEditingProduct(prev => prev ? {...prev, location: e.target.value} : null)} />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Hash size={12}/> HSN Code</label>
                       <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" placeholder="HSN" value={editingProduct?.hsn || ''} onChange={e => setEditingProduct(prev => prev ? {...prev, hsn: e.target.value} : null)} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Stock</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" value={editingProduct?.stock || 0} onChange={e => setEditingProduct(prev => prev ? {...prev, stock: Number(e.target.value)} : null)} /></div>
                   <div className="space-y-3"><label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-1">Low-stock Alert</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-rose-500 shadow-inner" value={editingProduct?.minStockAlert || 5} onChange={e => setEditingProduct(prev => prev ? {...prev, minStockAlert: Number(e.target.value)} : null)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selling Rate (₹)</label><input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-slate-50 outline-none focus:border-emerald-500 shadow-inner" value={editingProduct?.salePrice || 0} onChange={e => setEditingProduct(prev => prev ? {...prev, salePrice: Number(e.target.value)} : null)} /></div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Category</label>
                      <div className="relative">
                        <input list="cat-list" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-white outline-none focus:border-blue-500 shadow-sm uppercase pr-10" value={editingProduct?.category || ''} onChange={e => setEditingProduct(prev => prev ? {...prev, category: e.target.value} : null)} placeholder="Type or Select..." />
                        <datalist id="cat-list">{data.productCategories.map(c => <option key={c} value={c} />)}</datalist>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                   </div>
                </div>
             </div>
             <button onClick={() => editingProduct && handleSaveProduct(editingProduct)} className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl uppercase tracking-[0.2em] text-[11px] active:scale-95 transition-all flex items-center justify-center gap-3"><ShieldCheck size={20} /> Authorize Ledger Record</button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyProduct && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 border border-white/10 flex flex-col max-h-[80vh]">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                     <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl"><History size={24}/></div>
                     <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Movement History</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{historyProduct.name}</p>
                     </div>
                  </div>
                  <button onClick={() => setShowHistoryModal(false)} className="p-3 text-slate-400 hover:bg-white rounded-full transition-all"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 bg-white">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                        <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Ref/Inv</th><th className="px-6 py-4">Party</th><th className="px-6 py-4 text-center">Qty</th><th className="px-6 py-4 text-right">Rate</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {getProductHistory(historyProduct.id).map((h, i) => (
                           <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-slate-500 tabular-nums">{new Date(h.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4">
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${h.type === 'SALE' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {h.type === 'SALE' ? 'Outward' : 'Inward'}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase">{h.invNo}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">{h.party}</td>
                              <td className="px-6 py-4 text-center text-sm font-black text-slate-900">{h.qty}</td>
                              <td className="px-6 py-4 text-right text-xs font-bold text-slate-500 tabular-nums">₹{h.rate}</td>
                           </tr>
                        ))}
                        {getProductHistory(historyProduct.id).length === 0 && (
                           <tr><td colSpan={6} className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No movement recorded for this item</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

const CategoryManager: React.FC<{categories: string[], products: Product[], onUpdate: (cats: string[], prods: Product[]) => void, onClose: () => void}> = ({ categories, products, onUpdate, onClose }) => {
  const [newCat, setNewCat] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = () => {
    if (!newCat.trim()) return;
    if (categories.includes(newCat.trim())) return alert("Category already exists");
    onUpdate([...categories, newCat.trim()], products);
    setNewCat('');
  };

  const handleUpdate = (index: number) => {
    if (!editValue.trim()) return;
    const oldName = categories[index];
    const newName = editValue.trim();
    
    // Update category list
    const updatedCats = [...categories];
    updatedCats[index] = newName;

    // Update products belonging to old category
    const updatedProducts = products.map(p => 
      p.category === oldName ? { ...p, category: newName } : p
    );

    onUpdate(updatedCats, updatedProducts);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    if (!confirm("Remove this category? Products will keep their current category name but it will be removed from the master list.")) return;
    const updatedCats = categories.filter((_, i) => i !== index);
    onUpdate(updatedCats, products);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in border border-white/20 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><Tags size={24}/></div>
            <div><h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Segment Manager</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Category List</p></div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-white rounded-full transition-all"><X size={24}/></button>
        </div>
        
        <div className="p-8 bg-slate-50 border-b border-slate-100 shrink-0">
           <div className="flex gap-3">
              <input 
                className="flex-1 border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm bg-white outline-none focus:border-indigo-500 uppercase"
                placeholder="New Category Name..."
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <button onClick={handleAdd} className="px-6 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all"><Plus size={20}/></button>
           </div>
        </div>

        <div className="overflow-y-auto p-8 space-y-3 custom-scrollbar">
           {categories.map((cat, idx) => (
             <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-all shadow-sm">
                {editingIndex === idx ? (
                  <div className="flex gap-2 w-full">
                     <input 
                       autoFocus
                       className="flex-1 bg-slate-50 border-2 border-indigo-100 rounded-xl px-3 py-2 font-bold text-sm outline-none uppercase text-indigo-700"
                       value={editValue}
                       onChange={e => setEditValue(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleUpdate(idx)}
                     />
                     <button onClick={() => handleUpdate(idx)} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Save size={16}/></button>
                     <button onClick={() => setEditingIndex(null)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"><X size={16}/></button>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-slate-700 text-xs uppercase tracking-tight">{cat}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => { setEditingIndex(idx); setEditValue(cat); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14}/></button>
                       <button onClick={() => handleDelete(idx)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                    </div>
                  </>
                )}
             </div>
           ))}
           {categories.length === 0 && <div className="text-center text-slate-400 font-bold text-xs uppercase py-10">No categories defined</div>}
        </div>
      </div>
    </div>
  );
};

export default Inventory;

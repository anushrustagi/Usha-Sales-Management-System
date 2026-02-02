
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Product, Invoice } from '../types';
// Add Zap to the imports from lucide-react
import { Plus, Search, Filter, Edit2, Trash2, Package, Tag, X, ListFilter, Settings2, BarChart3, Activity, Info, Layers, ChevronRight, AlertCircle, CheckCircle2, Hash, FileSpreadsheet, Clock, Calendar, Eye, History, MapPin, ShieldCheck, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  initialFilter?: string | null;
}

const Inventory: React.FC<InventoryProps> = ({ data, updateData, initialFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (initialFilter === "LOW_STOCK") setSearchTerm('');
    else if (initialFilter) setSearchTerm(initialFilter);
  }, [initialFilter]);

  const filteredProducts = useMemo(() => {
    let list = data.products;
    if (initialFilter === "LOW_STOCK") list = list.filter(p => p.stock <= p.minStockAlert);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
    }
    return list;
  }, [data.products, searchTerm, initialFilter]);

  const getAgeingStatus = (lastRestocked: string) => {
    const days = Math.floor((new Date().getTime() - new Date(lastRestocked).getTime()) / (1000 * 3600 * 24));
    if (days <= 30) return { label: 'Fresh', desc: `${days} days ago`, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <Zap size={10} className="fill-emerald-600" /> };
    if (days <= 90) return { label: 'Active', desc: `${days} days ago`, color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Activity size={10} /> };
    return { label: 'Stagnant', desc: `Over ${days} days`, color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <Clock size={10} /> };
  };

  const handleSaveProduct = (newProd: Product) => {
    const products = [...data.products];
    if (editingProduct) {
      const idx = products.findIndex(p => p.id === editingProduct.id);
      products[idx] = { ...newProd, id: editingProduct.id, lastRestockedDate: editingProduct.lastRestockedDate };
    } else {
      products.push({ ...newProd, id: Math.random().toString(36).substr(2, 9), lastRestockedDate: new Date().toISOString() });
    }
    updateData({ products });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-end gap-6 no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-[1.2rem] shadow-xl">
              <Package size={24}/>
            </div>
            Warehouse Intelligence
          </h2>
          <p className="text-slate-400 text-[11px] mt-1 font-black uppercase tracking-[0.2em]">Master Inventory Registry & Ageing Flows</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setShowAddModal(true); }} className="px-10 py-4 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3">
          <Plus size={20} strokeWidth={3} /> Register SKU
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6 no-print">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search Master Catalog by SKU or Category..." 
            className="pl-14 pr-6 py-4 w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-100 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all shadow-inner" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-10 py-8">SKU Detail</th>
              <th className="px-6 py-8">Segment</th>
              <th className="px-6 py-8">Stock Volume</th>
              <th className="px-6 py-8">Ageing Profile</th>
              <th className="px-6 py-8 text-right">Selling Val</th>
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
                      <div className={`p-3 rounded-xl transition-all ${p.stock <= p.minStockAlert ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white shadow-inner'}`}>
                        <Package size={20}/>
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-800 uppercase tracking-tight">{p.name}</p>
                        <p className="text-[9px] font-black text-slate-300 uppercase mt-1">HSN: {p.hsn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <span className="px-3 py-1 bg-white border border-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest">{p.category}</span>
                  </td>
                  <td className="px-6 py-8">
                    <div className="w-40 space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className={p.stock <= p.minStockAlert ? 'text-rose-600' : 'text-slate-400'}>{p.stock} Units</span>
                          <span className="text-slate-200">Ref: {p.minStockAlert}</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full transition-all duration-1000 ${p.stock <= p.minStockAlert ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : p.stock <= p.minStockAlert * 1.5 ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                            style={{ width: `${healthPct}%` }}
                          ></div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex flex-col gap-1">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border flex items-center gap-2 w-fit ${ageing.color}`}>
                        {ageing.icon} {ageing.label}
                      </span>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter ml-1">{ageing.desc}</p>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-right font-black text-slate-900 tabular-nums">₹{p.salePrice.toLocaleString()}</td>
                  <td className="px-10 py-8">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingProduct(p); setShowAddModal(true); }} className="p-2.5 bg-white text-slate-300 hover:text-blue-600 rounded-xl border border-slate-100 shadow-sm transition-all active:scale-90">
                        <Edit2 size={16}/>
                      </button>
                      <button onClick={() => { if(confirm('Erase this SKU from master catalog?')) updateData({ products: data.products.filter(item => item.id !== p.id) }) }} className="p-2.5 bg-white text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 shadow-sm transition-all active:scale-90">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-12 space-y-10 shadow-2xl animate-in zoom-in duration-300 border border-white/10">
             <div className="flex justify-between items-center border-b border-slate-100 pb-6">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Modify SKU' : 'New Master Entry'}</h3>
               <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
             </div>
             <div className="grid grid-cols-1 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU Designation</label>
                  <input 
                    autoFocus
                    type="text" 
                    className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all uppercase shadow-inner" 
                    placeholder="Product Name"
                    value={editingProduct?.name || ''} 
                    onChange={e => setEditingProduct(prev => prev ? {...prev, name: e.target.value} : {...data.products[0], name: e.target.value, stock: 0, minStockAlert: 5})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Stock</label>
                      <input 
                        type="number" 
                        className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" 
                        value={editingProduct?.stock || 0} 
                        onChange={e => setEditingProduct(prev => prev ? {...prev, stock: Number(e.target.value)} : null)} 
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-1">Critical Alert Level</label>
                      <input 
                        type="number" 
                        className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-rose-500 shadow-inner" 
                        value={editingProduct?.minStockAlert || 5} 
                        onChange={e => setEditingProduct(prev => prev ? {...prev, minStockAlert: Number(e.target.value)} : null)} 
                      />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Rate (₹)</label>
                      <input 
                        type="number" 
                        className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-slate-50 outline-none focus:border-emerald-500 shadow-inner" 
                        value={editingProduct?.salePrice || 0} 
                        onChange={e => setEditingProduct(prev => prev ? {...prev, salePrice: Number(e.target.value)} : null)} 
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-black bg-white outline-none focus:border-blue-500 shadow-sm" 
                        value={editingProduct?.category || ''} 
                        onChange={e => setEditingProduct(prev => prev ? {...prev, category: e.target.value} : null)}
                      >
                        <option value="">Select Segment...</option>
                        {data.productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                </div>
             </div>
             <button 
              onClick={() => editingProduct && handleSaveProduct(editingProduct)} 
              className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl uppercase tracking-[0.2em] text-[11px] hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
             >
               <ShieldCheck size={20} /> Authorize Registry Pass
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

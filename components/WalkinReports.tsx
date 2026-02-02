
import React, { useMemo, useState } from 'react';
import { AppData, WalkInRecord, Invoice } from '../types';
import { 
  Users, TrendingUp, Calendar, ShoppingBag, Package, Activity, Search, 
  Sparkles, Loader2, Zap, ArrowLeft, ArrowUpRight, BarChart3, Clock, 
  MessageSquare, ChevronRight, Filter, IndianRupee, Trash2, MapPinned, Tag,
  Download, FileSpreadsheet, Send, UserCheck, Map
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Cell 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';

interface WalkinReportsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const WalkinReports: React.FC<WalkinReportsProps> = ({ data, updateData }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const records = useMemo(() => {
    return data.walkInRecords.slice().reverse();
  }, [data.walkInRecords]);

  // Catchment Intelligence: Analyzing unique walk-in customers from invoices
  const catchmentData = useMemo(() => {
    const areas: Record<string, { count: number, revenue: number, subs: Set<string> }> = {};
    
    data.invoices.filter(i => i.type === 'SALE' && i.partyId === 'WALKIN').forEach(inv => {
      const area = inv.partyArea || 'Unknown Locality';
      if (!areas[area]) areas[area] = { count: 0, revenue: 0, subs: new Set() };
      areas[area].count += 1;
      areas[area].revenue += inv.grandTotal;
      if (inv.partySubArea) areas[area].subs.add(inv.partySubArea);
    });

    return Object.entries(areas)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        revenue: stats.revenue,
        subs: Array.from(stats.subs).join(', ')
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [data.invoices]);

  // Marketing Lead List Extraction
  const marketingLeads = useMemo(() => {
    const leads = new Map<string, { name: string, phone: string, area: string, lastVisit: string, totalSpend: number }>();
    
    data.invoices.filter(i => i.type === 'SALE' && i.partyId === 'WALKIN' && i.partyPhone).forEach(inv => {
      const phone = inv.partyPhone || '';
      const existing = leads.get(phone);
      if (existing) {
        existing.totalSpend += inv.grandTotal;
        if (new Date(inv.date) > new Date(existing.lastVisit)) existing.lastVisit = inv.date;
      } else {
        leads.set(phone, {
          name: inv.partyName,
          phone: phone,
          area: [inv.partySubArea, inv.partyArea].filter(Boolean).join(', '),
          lastVisit: inv.date,
          totalSpend: inv.grandTotal
        });
      }
    });

    // Fix: Explicitly type sort parameters as 'any' to resolve 'unknown' type inference issue
    return Array.from(leads.values()).sort((a: any, b: any) => b.totalSpend - a.totalSpend);
  }, [data.invoices]);

  const exportMarketingList = () => {
    const exportData = marketingLeads.map(l => ({
      'Customer Name': l.name,
      'Contact Number': l.phone,
      'Locality/Area': l.area,
      'Lifetime Spend': l.totalSpend,
      'Last Visit': new Date(l.lastVisit).toLocaleDateString()
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marketing Leads');
    XLSX.writeFile(workbook, `Walkin_Marketing_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleRunAiAnalysis = async () => {
    if (marketingLeads.length === 0) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = marketingLeads.slice(0, 20).map(l => `${l.name} from ${l.area} spent ₹${l.totalSpend}`).join(' | ');
      const prompt = `Act as a Marketing Strategist. Analyze this walk-in lead list: "${context}". 1. Identify which geographical areas are high-yield. 2. Suggest a specific SMS marketing campaign theme for these people. 3. Advice on localized physical advertisement placement. Brief points only.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiAnalysis(response.text || "No insights found.");
    } catch (err) { setAiAnalysis("Error reaching core intelligence."); } finally { setIsAiLoading(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3"><div className="p-2.5 bg-orange-500 rounded-2xl shadow-xl"><Map className="text-white" size={24}/></div>Market Penetration Analysis</h2>
           <p className="text-slate-400 text-[11px] mt-1 font-black uppercase tracking-[0.2em]">Geographic Catchment & Lead Intelligence</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button onClick={exportMarketingList} className="flex-1 md:flex-initial px-6 py-4 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"><FileSpreadsheet size={18} /> Export Lead List</button>
          <button onClick={handleRunAiAnalysis} disabled={isAiLoading} className="flex-1 md:flex-initial px-8 py-4 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">{isAiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles className="text-orange-400" size={18} />}AI Marketing Strategist</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {/* Geographic Catchment Table */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-10">
                 <div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Catchment Ranking</h3>
                    <p className="text-xl font-black text-slate-900">Highest Revenue Municipalities</p>
                 </div>
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><MapPinned size={20}/></div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                       <tr><th className="px-6 py-5">Locality (Area)</th><th className="px-6 py-5">Sub-Sectors Identified</th><th className="px-6 py-5 text-center">Invoices</th><th className="px-6 py-5 text-right">Net Revenue</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {catchmentData.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-all group">
                             <td className="px-6 py-5 font-black text-slate-800 uppercase text-xs">{c.name}</td>
                             <td className="px-6 py-5 font-bold text-slate-400 uppercase text-[10px]">{c.subs || 'Generic'}</td>
                             <td className="px-6 py-5 text-center font-black text-slate-700">{c.count}</td>
                             <td className="px-6 py-5 text-right font-black text-blue-600 tabular-nums">₹{c.revenue.toLocaleString()}</td>
                          </tr>
                       ))}
                       {catchmentData.length === 0 && (
                          <tr><td colSpan={4} className="py-20 text-center text-slate-300 italic text-sm">Collect Area/Sub-area details in Sales to build this map.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* Marketing Lead Registry */}
           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><UserCheck size={20}/></div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Identified Marketing Leads</h3>
                 </div>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/30 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                       <tr><th className="px-6 py-5">Customer Profile</th><th className="px-6 py-5">Locality Cluster</th><th className="px-6 py-5 text-right">Last Visit</th><th className="px-6 py-5 text-right">LTV (Spend)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {marketingLeads.map((l, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-all group">
                             <td className="px-6 py-5">
                                <div className="flex flex-col">
                                   <span className="text-xs font-black text-slate-800 uppercase">{l.name}</span>
                                   <span className="text-[10px] font-black text-blue-500 tabular-nums tracking-widest">{l.phone}</span>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase">{l.area}</td>
                             <td className="px-6 py-5 text-right text-[10px] font-bold text-slate-500">{new Date(l.lastVisit).toLocaleDateString()}</td>
                             <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums">₹{l.totalSpend.toLocaleString()}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full min-h-[500px]">
              <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between"><div className="flex items-center gap-3"><Sparkles className="text-orange-400" size={20} /><h3 className="font-black text-white text-[11px] uppercase tracking-[0.2em]">Strategy Panel</h3></div></div>
              <div className="p-10 flex-1 overflow-y-auto">
                 {aiAnalysis ? (
                    <div className="prose prose-invert prose-sm text-slate-400 font-medium leading-relaxed animate-in fade-in slide-in-from-top-4 duration-500 whitespace-pre-line">{aiAnalysis}</div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                       <Activity size={48} className="text-white" />
                       <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Ready for Analysis</p>
                       <p className="text-[9px] text-slate-500 font-bold uppercase max-w-[180px]">Run Strategist to generate targeting insights based on leads.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WalkinReports;


import React, { useMemo, useState } from 'react';
import { AppData, WalkInRecord, Invoice } from '../types';
import { 
  Users, TrendingUp, Calendar, ShoppingBag, Package, Activity, Search, 
  Sparkles, Loader2, Zap, ArrowLeft, ArrowUpRight, BarChart3, Clock, 
  MessageSquare, ChevronRight, Filter, IndianRupee, Trash2, MapPinned, Tag,
  Download, FileSpreadsheet, Send, UserCheck, Map as MapIcon, Footprints
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Cell, LineChart, Line
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
  const [activeTab, setActiveTab] = useState<'FOOTFALL' | 'LEADS'>('FOOTFALL');

  // Footfall Data Logic
  const footfallTrend = useMemo(() => {
    const daily: Record<string, number> = {};
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        daily[d.toISOString().split('T')[0]] = 0;
    }
    
    data.walkInRecords.forEach(r => {
      const d = r.date.split('T')[0];
      if (daily[d] !== undefined) daily[d] += r.count;
      else daily[d] = (daily[d] || 0) + r.count;
    });

    return Object.entries(daily)
      .map(([date, count]) => ({ 
          date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), 
          fullDate: date,
          count 
      }))
      .sort((a,b) => a.fullDate.localeCompare(b.fullDate))
      .slice(-14); // Last 14 active days
  }, [data.walkInRecords]);

  const totalFootfall = useMemo(() => data.walkInRecords.reduce((acc, r) => acc + r.count, 0), [data.walkInRecords]);
  
  const recentLogs = useMemo(() => {
      return [...data.walkInRecords].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.walkInRecords]);

  // Catchment Intelligence
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
        name, count: stats.count, revenue: stats.revenue, subs: Array.from(stats.subs).join(', ')
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [data.invoices]);

  // Marketing Lead List
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
          name: inv.partyName, phone: phone, area: [inv.partySubArea, inv.partyArea].filter(Boolean).join(', '),
          lastVisit: inv.date, totalSpend: inv.grandTotal
        });
      }
    });
    return Array.from(leads.values()).sort((a: any, b: any) => b.totalSpend - a.totalSpend);
  }, [data.invoices]);

  const exportMarketingList = () => {
    const exportData = marketingLeads.map(l => ({
      'Customer Name': l.name, 'Contact Number': l.phone, 'Locality/Area': l.area,
      'Lifetime Spend': l.totalSpend, 'Last Visit': new Date(l.lastVisit).toLocaleDateString()
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <div className="p-2.5 bg-orange-500 rounded-2xl shadow-xl"><Footprints className="text-white" size={24}/></div>
             Visitor Intelligence
           </h2>
           <p className="text-slate-400 text-[11px] mt-1 font-black uppercase tracking-[0.2em]">Footfall & Catchment Analytics</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
           <button onClick={() => setActiveTab('FOOTFALL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FOOTFALL' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Footfall Logs</button>
           <button onClick={() => setActiveTab('LEADS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LEADS' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Leads & Catchment</button>
        </div>
      </div>

      {activeTab === 'FOOTFALL' && (
        <div className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Daily Traffic</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Walk-in Volume</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                       <TrendingUp size={16} className="text-emerald-500" />
                       <span className="text-xs font-black text-slate-700">{totalFootfall} Total Visitors</span>
                    </div>
                 </div>
                 <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={footfallTrend}>
                          <defs>
                             <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                          <Area type="monotone" dataKey="count" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col relative overflow-hidden">
                 <div className="relative z-10 space-y-6">
                    <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-3"><Activity className="text-orange-500"/> Engagement</h3>
                    <div className="space-y-4">
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peak Day</p>
                          <p className="text-2xl font-black">{footfallTrend.sort((a,b) => b.count - a.count)[0]?.date || 'N/A'}</p>
                       </div>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conversion Potential</p>
                          <p className="text-2xl font-black text-emerald-400">~{marketingLeads.length} Leads</p>
                       </div>
                    </div>
                 </div>
                 <Footprints size={200} className="absolute -bottom-10 -right-10 text-white opacity-5" />
              </div>
           </div>

           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                 <div className="p-3 bg-white text-slate-400 rounded-2xl shadow-sm border border-slate-100"><Clock size={20}/></div>
                 <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Detailed Visitor Log</h3>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                       <tr><th className="px-8 py-5">Date & Time</th><th className="px-6 py-5 text-center">Group Size</th><th className="px-6 py-5">Interest / Product</th><th className="px-6 py-5">Remarks</th><th className="px-6 py-5 text-right">Quote Value</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {recentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-all">
                             <td className="px-8 py-5">
                                <div className="flex flex-col">
                                   <span className="text-xs font-black text-slate-700">{new Date(log.date).toLocaleDateString()}</span>
                                   <span className="text-[10px] font-bold text-slate-400">{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-xs">{log.count}</span></td>
                             <td className="px-6 py-5"><span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded-md">{log.productName || 'General'}</span></td>
                             <td className="px-6 py-5 text-xs font-medium text-slate-500 uppercase tracking-tight">{log.remarks}</td>
                             <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums">{log.price ? `₹${log.price.toLocaleString()}` : '—'}</td>
                          </tr>
                       ))}
                       {recentLogs.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No walk-in data recorded yet</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'LEADS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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

             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><UserCheck size={20}/></div>
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Identified Marketing Leads</h3>
                   </div>
                   <button onClick={exportMarketingList} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50"><FileSpreadsheet size={14}/> Export</button>
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
                <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-3"><Sparkles className="text-orange-400" size={20} /><h3 className="font-black text-white text-[11px] uppercase tracking-[0.2em]">Strategy Panel</h3></div>
                   <button onClick={handleRunAiAnalysis} disabled={isAiLoading} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all disabled:opacity-50"><Zap size={16}/></button>
                </div>
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
      )}
    </div>
  );
};

export default WalkinReports;

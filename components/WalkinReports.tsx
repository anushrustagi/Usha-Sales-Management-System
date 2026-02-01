
import React, { useMemo, useState } from 'react';
import { AppData, WalkInRecord } from '../types';
import { 
  Users, TrendingUp, Calendar, ShoppingBag, Package, Activity, Search, 
  Sparkles, Loader2, Zap, ArrowLeft, ArrowUpRight, BarChart3, Clock, 
  MessageSquare, ChevronRight, Filter, IndianRupee, Trash2, MapPinned, Tag 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Cell 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

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

  // Point: Geographic Aggregate from Invoices
  const areaData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.invoices.filter(inv => inv.partyId === 'WALKIN' && (inv.partyArea || inv.partySubArea)).forEach(inv => {
      const label = [inv.partySubArea, inv.partyArea].filter(Boolean).join(', ');
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data.invoices]);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const s = searchTerm.toLowerCase();
    return records.filter(r => 
      r.remarks.toLowerCase().includes(s) || 
      r.productName?.toLowerCase().includes(s)
    );
  }, [records, searchTerm]);

  const stats = useMemo(() => {
    const totalVisitors = records.reduce((acc, r) => acc + r.count, 0);
    const avgPerDay = records.length > 0 ? (totalVisitors / records.length).toFixed(1) : 0;
    const dailyDataMap = new Map<string, number>();
    records.forEach(r => {
      const d = new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dailyDataMap.set(d, (dailyDataMap.get(d) || 0) + r.count);
    });
    const dailyChartData = Array.from(dailyDataMap.entries()).map(([date, count]) => ({ date, count })).slice(-15);
    return { totalVisitors, avgPerDay, dailyChartData };
  }, [records]);

  const handleRunAiAnalysis = async () => {
    if (records.length === 0) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const logs = records.slice(-30).map(r => `${r.productName || 'General'} (₹${r.price || 'N/A'}): ${r.remarks}`).join(' | ');
      const prompt = `Analyze these hardware walk-in logs: "${logs}". Include product names and budget points mentioned. 1. Identify top demands. 2. Price sensitivity & budget trends. 3. stocking advice. Brief and bulleted.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiAnalysis(response.text || "No insights found.");
    } catch (err) { setAiAnalysis("Error reaching core."); } finally { setIsAiLoading(false); }
  };

  const deleteRecord = (id: string) => { if (confirm("Remove log?")) updateData({ walkInRecords: data.walkInRecords.filter(r => r.id !== id) }); };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3"><div className="p-2.5 bg-orange-500 rounded-2xl shadow-xl"><Users className="text-white" size={24}/></div>Visitor Traffic Intelligence</h2>
           <p className="text-slate-400 text-[11px] mt-1 font-black uppercase tracking-[0.2em]">Analytics & Market Penetration</p>
        </div>
        <button onClick={handleRunAiAnalysis} disabled={isAiLoading || records.length === 0} className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">{isAiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles className="text-orange-400" size={18} />}Analyze Demands with AI</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-all">
           <div className="flex justify-between items-center mb-6"><div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-100 transition-colors"><Users size={22}/></div><span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Master Stat</span></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Visitors Logged</p><p className="text-4xl font-black text-slate-900 tabular-nums">{stats.totalVisitors}</p></div>
        </div>
        <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
           <div className="flex justify-between items-center mb-6"><div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-100 transition-colors"><Activity size={22}/></div><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Velocity</span></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Daily Footfall</p><p className="text-4xl font-black text-slate-900 tabular-nums">{stats.avgPerDay}</p></div>
        </div>
        <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all">
           <div className="flex justify-between items-center mb-6"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-100 transition-colors"><Clock size={22}/></div><span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Logs</span></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registry Entries</p><p className="text-4xl font-black text-slate-900 tabular-nums">{records.length}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-10"><div><h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Traffic Trend</h3><p className="text-xl font-black text-slate-900">Daily Footfall Analysis</p></div><div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><TrendingUp size={20}/></div></div>
              <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.dailyChartData}><defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} /><YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} /><Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} /><Area type="monotone" dataKey="count" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" /></AreaChart></ResponsiveContainer></div>
           </div>

           {/* Point: Market Penetration by Locality */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                 <div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Market Penetration</h3>
                    <p className="text-xl font-black text-slate-900">Walk-ins by Locality Cluster</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><MapPinned size={20}/></div>
              </div>
              <div className="h-72 w-full">
                 {areaData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaData} layout="vertical">
                       <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                       <XAxis type="number" axisLine={false} tickLine={false} hide />
                       <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 800}} width={120} />
                       <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                       <Bar dataKey="count" fill="#4f46e5" radius={[0, 10, 10, 0]} barSize={20} />
                    </BarChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-sm">Collect locality data in Sales to view Heatmap</div>
                 )}
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><MessageSquare size={20}/></div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Master Inquiry Ledger</h3>
                 </div>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                    <input type="text" placeholder="Filter keyword..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/30 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                       <tr>
                          <th className="px-6 py-5">Timeline</th>
                          <th className="px-6 py-5">Product Detail</th>
                          <th className="px-6 py-5 text-center">Volume</th>
                          <th className="px-6 py-5 text-right">Price Point</th>
                          <th className="px-6 py-5">Observation</th>
                          <th className="px-6 py-5"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredRecords.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-all group">
                             <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                   <span className="text-[9px] font-bold text-slate-400">{new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                             </td>
                             <td className="px-6 py-5">
                                {r.productName ? (
                                   <div className="flex items-center gap-2">
                                      <Tag size={12} className="text-blue-500" />
                                      <span className="text-xs font-black text-slate-800 uppercase truncate max-w-[120px]">{r.productName}</span>
                                   </div>
                                ) : (
                                   <span className="text-[10px] font-bold text-slate-300 uppercase italic">General Inquiry</span>
                                )}
                             </td>
                             <td className="px-6 py-5 text-center">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs mx-auto">{r.count}</div>
                             </td>
                             <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums">
                                {r.price ? `₹${r.price.toLocaleString()}` : '—'}
                             </td>
                             <td className="px-6 py-5">
                                <p className="font-bold text-slate-500 text-xs leading-relaxed uppercase truncate max-w-[200px]">"{r.remarks}"</p>
                             </td>
                             <td className="px-6 py-5 text-right">
                                <button onClick={() => deleteRecord(r.id)} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                 {filteredRecords.length === 0 && (
                    <div className="py-24 text-center text-slate-300">
                       <MessageSquare size={48} className="mx-auto mb-4 opacity-5" />
                       <p className="text-[10px] font-black uppercase tracking-[0.4em]">Historical Registry Untouched</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full min-h-[500px]">
              <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between"><div className="flex items-center gap-3"><Sparkles className="text-orange-400" size={20} /><h3 className="font-black text-white text-[11px] uppercase tracking-[0.2em]">Demand Analytics (AI)</h3></div>{isAiLoading && <Loader2 className="animate-spin text-white/50" size={20} />}</div>
              <div className="p-10 flex-1 overflow-y-auto">{aiAnalysis ? (<div className="prose prose-invert prose-sm text-slate-400 font-medium leading-relaxed animate-in fade-in slide-in-from-top-4 duration-500"><div className="whitespace-pre-line">{aiAnalysis}</div></div>) : (<div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30"><div className="p-6 bg-white/5 rounded-full"><Activity size={48} className="text-white" /></div><p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Execution Required</p><p className="text-[10px] text-slate-500 font-bold uppercase max-w-[200px]">Extract intelligence from logs</p></div>)}</div>
              <div className="p-6 bg-white/5 border-t border-white/5"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Strategizing based on recent {records.length} interactions</p></div>
           </div>
           <div className="bg-orange-50 border border-orange-100 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-sm"><div className="flex items-center gap-4"><div className="p-3 bg-white rounded-2xl text-orange-600 shadow-sm"><IndianRupee size={24}/></div><div><h4 className="text-xs font-black text-orange-900 uppercase tracking-widest">Opportunity Score</h4><p className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter">Conversion Potential</p></div></div><p className="text-sm font-bold text-orange-800/80 leading-relaxed italic">"Detailed product inquiry and budget tracking allows for better stock optimization and targeted conversion."</p></div>
        </div>
      </div>
    </div>
  );
};

export default WalkinReports;


import React, { useState, useEffect } from 'react';
import { AppData, PlannedTask } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Bot, BrainCircuit, Sparkles, Activity, ShieldAlert, Zap, 
  Lightbulb, CheckCircle2, AlertTriangle, ArrowRight, Loader2,
  Terminal, MessageSquare, Send, RefreshCcw, Power, Plus
} from 'lucide-react';

interface BrainProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

interface BrainAnalysis {
  healthScore: number;
  healthSummary: string;
  alerts: { severity: 'HIGH' | 'MEDIUM' | 'LOW'; title: string; message: string; action: string }[];
  insights: { title: string; observation: string; suggestion: string }[];
  tasks: { title: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }[];
}

const Brain: React.FC<BrainProps> = ({ data, updateData }) => {
  const [analysis, setAnalysis] = useState<BrainAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
        window.removeEventListener('online', handleStatus);
        window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const runFullScan = async () => {
    if (!isOnline) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Prepare Condensed Context (Avoid token overflow)
      const now = new Date();
      const last30Days = new Date(now.setDate(now.getDate() - 30));
      
      const recentSales = data.invoices.filter(i => i.type === 'SALE' && new Date(i.date) >= last30Days);
      const totalRevenue30d = recentSales.reduce((acc, i) => acc + i.grandTotal, 0);
      const recentExpenses = data.transactions.filter(t => t.type === 'DEBIT' && new Date(t.date) >= last30Days);
      const totalExpense30d = recentExpenses.reduce((acc, t) => acc + t.amount, 0);
      
      const lowStockCount = data.products.filter(p => p.stock <= p.minStockAlert).length;
      const totalOutstanding = data.customers.reduce((acc, c) => acc + c.outstandingBalance, 0);
      
      const context = {
        company: data.companyProfile.name,
        metrics: {
          revenue30d: totalRevenue30d,
          expense30d: totalExpense30d,
          cashFlow: totalRevenue30d - totalExpense30d,
          lowStockSKUs: lowStockCount,
          totalDebtReceivable: totalOutstanding,
          activeProjects: data.projects.filter(p => p.status === 'ACTIVE').length
        },
        topDebtors: data.customers.sort((a,b) => b.outstandingBalance - a.outstandingBalance).slice(0, 5).map(c => ({ name: c.name, debt: c.outstandingBalance })),
        recentActivity: recentSales.slice(-5).map(s => `Sale: ${s.grandTotal}`)
      };

      const prompt = `Act as the Chief Operating Officer (COO) AI for ${context.company}.
      Analyze the provided business metrics.
      
      Data Context: ${JSON.stringify(context)}
      
      Task:
      1. Calculate a Business Health Score (0-100).
      2. Identify critical anomalies or risks (Alerts).
      3. Find strategic opportunities (Insights).
      4. Generate 3-5 specific, actionable tasks for the owner.
      
      Output strictly in JSON format matching the schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              healthScore: { type: Type.NUMBER },
              healthSummary: { type: Type.STRING },
              alerts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    severity: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
                    title: { type: Type.STRING },
                    message: { type: Type.STRING },
                    action: { type: Type.STRING }
                  }
                }
              },
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    observation: { type: Type.STRING },
                    suggestion: { type: Type.STRING }
                  }
                }
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] }
                  }
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setAnalysis(result);
    } catch (e) {
      console.error("Brain Scan Failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !isOnline) return;
    setChatLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Lightweight context for chat
      const context = {
        products: data.products.length,
        salesCount: data.invoices.length,
        customers: data.customers.length,
        lastTransaction: data.transactions.slice(-1)[0]
      };
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Context: ${JSON.stringify(context)}. User Query: ${query}. Answer briefly and professionally as the Business Brain.`,
      });
      setChatResponse(response.text || "Thinking process interrupted.");
    } catch (e) {
        setChatResponse("Link to neural core unstable.");
    } finally {
        setChatLoading(false);
    }
  };

  const addGeneratedTask = (taskTitle: string, priority: string) => {
    const newTask: PlannedTask = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        title: taskTitle,
        priority: priority as any,
        status: 'PENDING'
    };
    updateData({ plannedTasks: [...data.plannedTasks, newTask] });
  };

  // Initial scan on mount if no analysis exists
  useEffect(() => {
    if (!analysis && isOnline && !loading) {
        // Debounce slightly to allow rendering
        const t = setTimeout(runFullScan, 500);
        return () => clearTimeout(t);
    }
  }, [isOnline]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700 min-h-screen">
      {/* Neural Core Header */}
      <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-600 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.5)] animate-pulse">
                    <Bot size={32} className="text-white"/>
                 </div>
                 <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Master Brain</h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Central Intelligence Unit</p>
                 </div>
              </div>
              <p className="max-w-xl text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wide">
                 Autonomous neural network analyzing ledger anomalies, stock velocities, and capital efficiency.
              </p>
           </div>

           <div className="flex items-center gap-8">
              {analysis && (
                 <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">System Pulse</p>
                    <div className="text-5xl font-black tracking-tighter tabular-nums text-white">
                       {analysis.healthScore}<span className="text-lg text-slate-600">/100</span>
                    </div>
                 </div>
              )}
              <button 
                onClick={runFullScan} 
                disabled={loading || !isOnline}
                className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 disabled:opacity-50"
              >
                 {loading ? <Loader2 className="animate-spin text-indigo-400"/> : <RefreshCcw className="text-indigo-400"/>}
              </button>
           </div>
        </div>
        
        {/* Decorative Neural Lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <BrainCircuit className="w-full h-full text-indigo-500 transform scale-150 translate-x-20 translate-y-10" strokeWidth={0.5} />
        </div>
      </div>

      {!analysis && loading && (
         <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Loader2 size={48} className="animate-spin text-indigo-600" />
            <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">Establishing Neural Link...</p>
         </div>
      )}

      {!analysis && !loading && (
         <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[3rem]">
            <Power size={48} className="mb-4 text-slate-200" />
            <p className="text-xs font-black uppercase tracking-widest">System Standby</p>
            <button onClick={runFullScan} className="mt-4 text-indigo-600 font-bold text-xs uppercase underline">Initiate Sequence</button>
         </div>
      )}

      {analysis && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
           {/* Left Column: Alerts & Tasks */}
           <div className="space-y-8 xl:col-span-1">
              {/* Alerts */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                    <ShieldAlert size={18} className="text-rose-500"/>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Critical Anomalies</h3>
                 </div>
                 <div className="p-6 space-y-4">
                    {analysis.alerts.length > 0 ? analysis.alerts.map((alert, idx) => (
                       <div key={idx} className={`p-4 rounded-2xl border-l-4 ${alert.severity === 'HIGH' ? 'bg-rose-50 border-rose-500' : 'bg-amber-50 border-amber-500'}`}>
                          <div className="flex justify-between items-start mb-1">
                             <h4 className="font-black text-[10px] uppercase tracking-wide text-slate-800">{alert.title}</h4>
                             <span className={`text-[8px] font-black px-2 py-0.5 rounded text-white ${alert.severity === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500'}`}>{alert.severity}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 leading-relaxed mb-2">{alert.message}</p>
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-700 uppercase">
                             <ArrowRight size={10} /> {alert.action}
                          </div>
                       </div>
                    )) : (
                       <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase">No critical anomalies detected.</div>
                    )}
                 </div>
              </div>

              {/* Tasks */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500"/>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Generated Action Items</h3>
                 </div>
                 <div className="divide-y divide-slate-50">
                    {analysis.tasks.map((task, idx) => (
                       <div key={idx} className="p-5 hover:bg-slate-50 transition-all flex items-center justify-between group">
                          <div>
                             <p className="text-xs font-bold text-slate-800 uppercase">{task.title}</p>
                             <span className={`text-[8px] font-black uppercase ${task.priority === 'HIGH' ? 'text-rose-500' : 'text-slate-400'}`}>{task.priority} Priority</span>
                          </div>
                          <button onClick={() => addGeneratedTask(task.title, task.priority)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white" title="Add to Planner">
                             <Plus size={14} strokeWidth={3}/>
                          </button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Middle Column: Strategy & Insights */}
           <div className="xl:col-span-1 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                 <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                    <Lightbulb size={18} className="text-amber-500"/>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Strategic Intelligence</h3>
                 </div>
                 <div className="p-6 space-y-6 flex-1">
                    <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Executive Summary</p>
                       <p className="text-xs font-bold text-indigo-900 leading-relaxed uppercase">{analysis.healthSummary}</p>
                    </div>
                    
                    <div className="space-y-4">
                       {analysis.insights.map((insight, idx) => (
                          <div key={idx} className="p-5 border-2 border-slate-100 rounded-3xl hover:border-indigo-100 hover:shadow-lg transition-all group bg-white">
                             <h4 className="font-black text-xs uppercase text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{insight.title}</h4>
                             <p className="text-[10px] font-bold text-slate-500 leading-relaxed mb-3">{insight.observation}</p>
                             <div className="pt-3 border-t border-slate-50">
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wide">Rec: {insight.suggestion}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Chat Interface */}
           <div className="xl:col-span-1">
              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl h-[600px] flex flex-col overflow-hidden relative">
                 <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Terminal size={18} className="text-emerald-400" />
                       <h3 className="font-black text-white text-xs uppercase tracking-widest">Neural Link</h3>
                    </div>
                    <div className="flex gap-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-150"></div>
                    </div>
                 </div>
                 
                 <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                          <Bot size={16} className="text-white"/>
                       </div>
                       <div className="p-4 bg-white/10 rounded-2xl rounded-tl-none border border-white/5">
                          <p className="text-xs font-bold text-slate-300 leading-relaxed">
                             Neural core online. I have access to your sales, inventory, and customer ledgers. How can I assist with operations today?
                          </p>
                       </div>
                    </div>

                    {chatResponse && (
                       <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                             <Bot size={16} className="text-white"/>
                          </div>
                          <div className="p-4 bg-white/10 rounded-2xl rounded-tl-none border border-white/5">
                             <p className="text-xs font-bold text-slate-300 leading-relaxed whitespace-pre-line">
                                {chatResponse}
                             </p>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="p-4 bg-white/5 border-t border-white/5">
                    <form onSubmit={handleSmartChat} className="relative">
                       <input 
                         type="text" 
                         className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 uppercase"
                         placeholder="Query the database..."
                         value={query}
                         onChange={e => setQuery(e.target.value)}
                         disabled={chatLoading}
                       />
                       <button 
                         type="submit" 
                         disabled={chatLoading || !query}
                         className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50"
                       >
                          {chatLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                       </button>
                    </form>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Brain;

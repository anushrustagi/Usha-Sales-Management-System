
import React, { useState, useEffect } from 'react';
import { AppData, PlannedTask } from '../types';
import { 
  Bot, BrainCircuit, ShieldAlert, Zap, 
  Lightbulb, CheckCircle2, ArrowRight, Loader2,
  Terminal, Send, RefreshCcw, Plus, Database
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
  const [queryResult, setQueryResult] = useState<{type: 'text' | 'list', content: any} | null>(null);

  // --- DETERMINISTIC INTELLIGENCE ENGINE ---
  const runDeepScan = () => {
      setLoading(true);
      
      // Simulation of processing time for "Scanning" effect
      setTimeout(() => {
        const now = new Date();
        
        // 1. Financial Velocity & Runway
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        
        const recentExpenses = data.transactions
            .filter(t => t.type === 'DEBIT' && new Date(t.date) >= last30Days)
            .reduce((acc, t) => acc + t.amount, 0);
        
        const recentRevenue = data.invoices
            .filter(i => i.type === 'SALE' && new Date(i.date) >= last30Days)
            .reduce((acc, i) => acc + i.grandTotal, 0);

        const currentCash = data.transactions.reduce((acc, t) => acc + (t.type === 'CREDIT' ? t.amount : -t.amount), 0);
        const dailyBurnRate = recentExpenses / 30;
        const runwayDays = dailyBurnRate > 0 ? Math.floor(currentCash / dailyBurnRate) : 999;

        // 2. Inventory Health (DSI - Days Sales of Inventory logic simplified)
        const deadStock = data.products.filter(p => {
            const lastRestock = new Date(p.lastRestockedDate);
            const daysSince = Math.floor((now.getTime() - lastRestock.getTime()) / (1000 * 3600 * 24));
            return daysSince > 90 && p.stock > 0;
        });
        const lowStockCount = data.products.filter(p => p.stock <= p.minStockAlert).length;

        // 3. Debtor Risk Profiling
        const totalReceivables = data.customers.reduce((acc, c) => acc + Math.max(0, c.outstandingBalance), 0);
        const riskyDebtors = data.customers.filter(c => c.outstandingBalance > 50000); // Threshold

        // 4. Scoring Logic (Weighted)
        let score = 100;
        if (runwayDays < 30) score -= 25; // Critical cash flow issue
        else if (runwayDays < 60) score -= 10;
        
        if (lowStockCount > 5) score -= 10;
        if (deadStock.length > 5) score -= 10;
        
        if (totalReceivables > recentRevenue * 1.5 && recentRevenue > 0) score -= 20; // High debt relative to revenue
        if (recentExpenses > recentRevenue && recentRevenue > 0) score -= 15; // Burning cash

        score = Math.max(0, Math.min(100, score));

        // 5. Generate Artifacts
        const alerts: any[] = [];
        const insights: any[] = [];
        const tasks: any[] = [];

        // Alert Generation
        if (runwayDays < 45) {
            alerts.push({
                severity: runwayDays < 15 ? 'HIGH' : 'MEDIUM',
                title: 'Cash Runway Warning',
                message: `At current burn rate (₹${Math.round(dailyBurnRate).toLocaleString()}/day), cash reserves may deplete in ~${runwayDays} days.`,
                action: 'Reduce Opex'
            });
        }
        if (riskyDebtors.length > 0) {
            alerts.push({
                severity: 'HIGH',
                title: 'High Credit Risk',
                message: `${riskyDebtors.length} customers owe >₹50k each. Total exposure: ₹${riskyDebtors.reduce((a,c)=>a+c.outstandingBalance,0).toLocaleString()}`,
                action: 'Call Debtors'
            });
        }

        // Insight Generation
        if (deadStock.length > 0) {
            insights.push({
                title: 'Zombie Inventory',
                observation: `${deadStock.length} SKUs have stagnated for >90 days. Value trapped: ₹${deadStock.reduce((a,p)=>a+(p.stock*p.purchasePrice),0).toLocaleString()}.`,
                suggestion: 'Run Clearance Sale'
            });
        }
        
        const expenseRatio = recentRevenue > 0 ? (recentExpenses / recentRevenue) * 100 : 0;
        insights.push({
            title: 'Operating Efficiency',
            observation: `Expenses are consuming ${expenseRatio.toFixed(1)}% of revenue this month.`,
            suggestion: expenseRatio > 70 ? 'Audit Variable Costs' : 'Maintain Level'
        });

        // Task Generation
        if (lowStockCount > 0) tasks.push({ title: `Restock ${lowStockCount} Critical Items`, priority: 'HIGH' });
        if (totalReceivables > 0) tasks.push({ title: 'Send Payment Reminders', priority: 'MEDIUM' });
        if (recentRevenue < recentExpenses) tasks.push({ title: 'Review Marketing Strategy', priority: 'HIGH' });

        setAnalysis({
            healthScore: Math.round(score),
            healthSummary: score > 80 ? "System Healthy. Optimal cash flow and inventory velocity." : score > 50 ? "Moderate Risk. Attention needed on cash flow or stock." : "Critical State. Immediate financial restructuring recommended.",
            alerts,
            insights,
            tasks
        });
        setLoading(false);
      }, 800);
  };

  // --- KEYWORD QUERY ENGINE (Local "Chat") ---
  const handleLocalQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const lowerQ = query.toLowerCase();
    let result = null;

    if (lowerQ.includes('stock') || lowerQ.includes('inventory')) {
        const low = data.products.filter(p => p.stock <= p.minStockAlert);
        result = {
            type: 'list',
            content: {
                title: 'Inventory Alert',
                items: low.length > 0 ? low.map(p => `${p.name}: ${p.stock} units (Low)`) : ['All stock levels healthy.']
            }
        };
    } else if (lowerQ.includes('debt') || lowerQ.includes('owe') || lowerQ.includes('collect')) {
        const debtors = data.customers.filter(c => c.outstandingBalance > 0).sort((a,b) => b.outstandingBalance - a.outstandingBalance);
        result = {
            type: 'list',
            content: {
                title: 'Outstanding Receivables',
                items: debtors.length > 0 ? debtors.slice(0,5).map(c => `${c.name}: ₹${c.outstandingBalance.toLocaleString()}`) : ['No pending collections.']
            }
        };
    } else if (lowerQ.includes('sale') || lowerQ.includes('revenue')) {
        const sales = data.invoices.filter(i => i.type === 'SALE').reduce((a,c) => a + c.grandTotal, 0);
        result = {
            type: 'text',
            content: `Total Lifetime Revenue is ₹${sales.toLocaleString()}. Use the Growth Analyzer for detailed charts.`
        };
    } else if (lowerQ.includes('cash') || lowerQ.includes('balance')) {
        const cash = data.transactions.reduce((acc, t) => acc + (t.type === 'CREDIT' ? t.amount : -t.amount), 0);
        result = {
            type: 'text',
            content: `Current Liquid Cash Estimation: ₹${cash.toLocaleString()}`
        };
    } else {
        result = {
            type: 'text',
            content: "Command not recognized. Try keywords: 'Stock', 'Debt', 'Sales', 'Cash'."
        };
    }

    setQueryResult(result as any);
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

  // Initial Scan on Mount
  useEffect(() => {
    if (!analysis && !loading) {
        runDeepScan();
    }
  }, []);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700 min-h-screen">
      {/* Neural Core Header */}
      <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                 <div className={`p-3 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.5)] bg-indigo-600`}>
                    <BrainCircuit size={32} className="text-white"/>
                 </div>
                 <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Master Brain</h1>
                    <div className="flex items-center gap-2 mt-2">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Central Intelligence Unit</p>
                       <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border rounded bg-indigo-500/20 text-indigo-300 border-indigo-500/50`}>
                          Local Algorithmic Core
                       </span>
                    </div>
                 </div>
              </div>
              <p className="max-w-xl text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wide">
                 Autonomous engine analyzing ledger anomalies, stock velocities, and capital efficiency using advanced deterministic algorithms.
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
                onClick={runDeepScan} 
                disabled={loading}
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

           {/* Right Column: Query Interface */}
           <div className="xl:col-span-1">
              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl h-[600px] flex flex-col overflow-hidden relative">
                 <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Terminal size={18} className="text-emerald-400" />
                       <h3 className="font-black text-white text-xs uppercase tracking-widest">Neural Link</h3>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                 </div>
                 
                 <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                          <Bot size={16} className="text-white"/>
                       </div>
                       <div className="p-4 bg-white/10 rounded-2xl rounded-tl-none border border-white/5">
                          <p className="text-xs font-bold text-slate-300 leading-relaxed">
                             System Ready. Query the database using keywords like "Stock", "Debt", or "Sales".
                          </p>
                       </div>
                    </div>

                    {queryResult && (
                       <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-600`}>
                             <Database size={16} className="text-white"/>
                          </div>
                          <div className={`p-4 rounded-2xl rounded-tl-none border bg-emerald-900/20 border-emerald-500/20 w-full`}>
                             {queryResult.type === 'text' ? (
                                <p className="text-xs font-bold leading-relaxed text-emerald-200">{queryResult.content}</p>
                             ) : (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{queryResult.content.title}</p>
                                    <ul className="space-y-1">
                                        {(queryResult.content.items as string[]).map((item, i) => (
                                            <li key={i} className="text-xs font-bold text-emerald-100 flex items-start gap-2">
                                                <span className="mt-1.5 w-1 h-1 bg-emerald-500 rounded-full shrink-0"></span> {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                             )}
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="p-4 bg-white/5 border-t border-white/5 space-y-4">
                    <form onSubmit={handleLocalQuery} className="relative flex gap-2">
                        <input 
                        type="text" 
                        className="flex-1 bg-slate-950 border border-white/10 rounded-2xl pl-5 pr-4 py-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 uppercase"
                        placeholder="Keyword command..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        />
                        <button 
                        type="submit" 
                        disabled={!query}
                        className="p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50"
                        >
                            <Send size={16}/>
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

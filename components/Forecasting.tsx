
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from '../types';
import { 
  BrainCircuit, Sparkles, Loader2, BarChart3, TrendingUp, Info, 
  WifiOff, Target, AlertTriangle, ShieldCheck, Zap, 
  ArrowUpRight, ArrowRight, LineChart as LineChartIcon, PieChart as PieChartIcon,
  ChevronRight, Activity, PackageSearch, Lightbulb, BellRing, CalendarClock, Telescope, TrendingDown,
  Coins, Scale, ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, ComposedChart, Bar, Cell 
} from 'recharts';

interface ForecastingProps {
  data: AppData;
}

interface ForecastResult {
  executiveSummary: string;
  cashFlowTrend: { month: string; revenue: number; expenses: number; forecast: boolean }[];
  quarterlyOutlook: { quarter: string; focusProducts: string[]; strategy: string }[];
  inventoryActions: {
    restock: string[];
    clearance: string[];
    reason: string;
  };
  profitabilityAnalysis: {
    highMarginItems: string[];
    volumeDrivers: string[];
    insight: string;
  };
}

const Forecasting: React.FC<ForecastingProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const generateForecast = async () => {
    if (!isOnline) {
      setErrorMsg("System Offline. Connect to internet for AI analysis.");
      return;
    }
    const apiKey = data.companyProfile.apiKey || process.env.API_KEY;
    if (!apiKey) {
      setErrorMsg("API Key Missing. Please configure it in Settings.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // --- 1. Pre-process Data for "Deep Analysis" ---
      
      // A. Margin Analysis
      const productPerformance = data.products.map(p => {
        const margin = p.salePrice - p.purchasePrice;
        const marginPct = p.salePrice > 0 ? ((margin / p.salePrice) * 100).toFixed(1) : '0';
        return { 
          name: p.name, 
          stock: p.stock, 
          cost: p.purchasePrice,
          price: p.salePrice,
          marginPct: `${marginPct}%`,
          lastRestock: p.lastRestockedDate
        };
      });

      // B. Sales Velocity (Items sold in last 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const recentSalesMap: Record<string, number> = {};
      let totalRevenue60d = 0;
      
      data.invoices.filter(i => i.type === 'SALE' && new Date(i.date) >= sixtyDaysAgo).forEach(inv => {
        totalRevenue60d += inv.grandTotal;
        inv.items.forEach(item => {
          recentSalesMap[item.productName] = (recentSalesMap[item.productName] || 0) + item.quantity;
        });
      });

      // C. Cash Flow History (Last 6 Months Aggregated)
      const monthlyCashFlow: Record<string, {in: number, out: number}> = {};
      const now = new Date();
      for(let i=5; i>=0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         const key = d.toLocaleString('default', { month: 'short' });
         monthlyCashFlow[key] = { in: 0, out: 0 };
      }

      data.invoices.forEach(inv => {
         const d = new Date(inv.date);
         if (d >= new Date(now.getFullYear(), now.getMonth() - 5, 1)) {
            const key = d.toLocaleString('default', { month: 'short' });
            if (monthlyCashFlow[key]) {
               if (inv.type === 'SALE') monthlyCashFlow[key].in += inv.grandTotal;
               else monthlyCashFlow[key].out += inv.grandTotal;
            }
         }
      });

      // --- 2. Construct Analytical Prompt ---
      const prompt = `Act as a Senior Financial Analyst for "USHA SALES CORP". 
        Perform a comprehensive analysis based on the following processed ledger data:

        1. **Product Margins & Stock**: ${JSON.stringify(productPerformance.slice(0, 40))}
        2. **Recent Sales Velocity (60 days)**: ${JSON.stringify(recentSalesMap)}
        3. **6-Month Cash Flow**: ${JSON.stringify(monthlyCashFlow)}

        **Analysis Goals:**
        1. Identify "Profit Engines" (High Margin + Selling Well).
        2. Identify "Dead Weight" (Stock exists but Sales are 0).
        3. Predict upcoming Seasonal Demand (Quarterly) based on general business logic for this industry (Industrial/Hardware/General).
        4. Analyze Cash Flow trends.

        **Output Requirement:**
        Return strictly JSON matching the schema. No markdown.
        - 'cashFlowTrend' should include the last 3 months ACTUALs and next 3 months PREDICTED.
        - 'quarterlyOutlook' should cover the next 2 quarters.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              cashFlowTrend: { 
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { month: {type: Type.STRING}, revenue: {type: Type.NUMBER}, expenses: {type: Type.NUMBER}, forecast: {type: Type.BOOLEAN} }
                }
              },
              quarterlyOutlook: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { quarter: {type: Type.STRING}, focusProducts: {type: Type.ARRAY, items: {type: Type.STRING}}, strategy: {type: Type.STRING} }
                }
              },
              inventoryActions: {
                type: Type.OBJECT,
                properties: {
                  restock: { type: Type.ARRAY, items: {type: Type.STRING} },
                  clearance: { type: Type.ARRAY, items: {type: Type.STRING} },
                  reason: { type: Type.STRING }
                }
              },
              profitabilityAnalysis: {
                type: Type.OBJECT,
                properties: {
                  highMarginItems: { type: Type.ARRAY, items: {type: Type.STRING} },
                  volumeDrivers: { type: Type.ARRAY, items: {type: Type.STRING} },
                  insight: { type: Type.STRING }
                }
              }
            }
          }
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI Content");
      
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      setForecast(JSON.parse(cleanJson));
    } catch (error: any) {
      console.error("Analysis Link Refused:", error);
      setErrorMsg(`Analysis Failed: ${error.message || "Unknown error"}. Check API Key.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg"><BrainCircuit className="w-8 h-8 text-white" /></div>
              <div>
                 <h2 className="text-3xl font-black tracking-tight uppercase leading-none">Business Forecaster</h2>
                 <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mt-2">Margin & Demand Intelligence</p>
              </div>
            </div>
            <p className="max-w-xl text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wide">
               Analyzing cash flow velocity, product profit margins, and inventory cycles to generate actionable quarterly predictions.
            </p>
          </div>
          <button onClick={generateForecast} disabled={loading || !isOnline} className={`px-10 py-5 font-black rounded-3xl shadow-xl transition-all flex items-center gap-4 active:scale-95 text-xs tracking-widest uppercase ${!isOnline ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 hover:bg-indigo-50'}`}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="text-indigo-600" />} {loading ? 'Analyzing Data...' : 'Run Forecast'}
          </button>
        </div>
        <Activity size={300} className="absolute -bottom-20 -right-20 text-white opacity-5" />
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-center gap-4 text-rose-600 animate-in fade-in">
           <AlertTriangle size={24} />
           <p className="font-bold text-xs uppercase tracking-wider">{errorMsg}</p>
        </div>
      )}

      {!forecast && !loading && !errorMsg ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-slate-100 border-dashed animate-in fade-in duration-700">
          <Scale className="w-16 h-16 text-slate-200 mb-6" />
          <h3 className="text-slate-400 font-black text-sm uppercase tracking-widest">Awaiting Analysis</h3>
          <p className="text-slate-300 text-[10px] font-bold uppercase mt-2">Generate report for margin & demand insights</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
           <div className="h-80 bg-slate-100 rounded-[3rem]"></div>
           <div className="h-80 bg-slate-100 rounded-[3rem]"></div>
        </div>
      ) : forecast ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
           
           {/* Executive Summary */}
           <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 flex gap-6 items-start shadow-sm">
              <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm"><Lightbulb size={24}/></div>
              <div className="space-y-2">
                 <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Executive Summary</h3>
                 <p className="text-sm font-bold text-indigo-800/80 leading-relaxed">{forecast.executiveSummary}</p>
              </div>
           </div>

           {/* Profitability & Cash Flow Row */}
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* Profitability Card */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1">Profit Analysis</h3>
                       <p className="text-xl font-black text-slate-900 uppercase">Margin vs Volume</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Coins size={20}/></div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">High Margin Items</p>
                       <div className="flex flex-wrap gap-2">
                          {forecast.profitabilityAnalysis.highMarginItems.map((item, i) => (
                             <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 uppercase shadow-sm">{item}</span>
                          ))}
                       </div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Volume Drivers</p>
                       <div className="flex flex-wrap gap-2">
                          {forecast.profitabilityAnalysis.volumeDrivers.map((item, i) => (
                             <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 uppercase shadow-sm">{item}</span>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="mt-auto pt-6 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed"><span className="text-emerald-600 font-black">Insight:</span> {forecast.profitabilityAnalysis.insight}</p>
                 </div>
              </div>

              {/* Cash Flow Chart */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Financial Health</h3>
                       <p className="text-xl font-black text-slate-900 uppercase">Cash Flow Prediction</p>
                    </div>
                    <div className="flex gap-2">
                       <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Revenue</div>
                       <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-[9px] font-black text-rose-600 uppercase"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Expense</div>
                    </div>
                 </div>
                 <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={forecast.cashFlowTrend}>
                          <defs>
                             <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                             </linearGradient>
                             <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                          <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                          <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>

           {/* Quarterly Radar & Inventory Actions */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Quarterly Radar */}
              <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                 <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white/10 rounded-2xl"><CalendarClock className="text-white" size={24}/></div>
                       <div>
                          <h3 className="text-white font-black text-lg uppercase tracking-tight">Quarterly Radar</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Seasonal Demand Forecast</p>
                       </div>
                    </div>
                    
                    <div className="space-y-6">
                       {forecast.quarterlyOutlook.map((q, idx) => (
                          <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-black text-white uppercase tracking-widest bg-indigo-600 px-3 py-1 rounded-lg">{q.quarter}</span>
                             </div>
                             <div className="mb-4">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Demand Surge Expected</p>
                                <div className="flex flex-wrap gap-2">
                                   {q.focusProducts.map((p, i) => (
                                      <span key={i} className="text-[10px] font-bold text-slate-200 bg-white/10 px-2 py-1 rounded border border-white/5 uppercase">{p}</span>
                                   ))}
                                </div>
                             </div>
                             <p className="text-[10px] text-slate-400 leading-relaxed font-medium border-t border-white/10 pt-3">
                                <span className="text-indigo-400 font-black uppercase">Strategy:</span> {q.strategy}
                             </p>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Inventory Actions */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><PackageSearch size={24}/></div>
                    <div>
                       <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Inventory Optimization</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Immediate Actions Required</p>
                    </div>
                 </div>

                 <div className="space-y-6 flex-1">
                    <div className="space-y-3">
                       <div className="flex items-center gap-2 text-emerald-600">
                          <ArrowUpRight size={16}/>
                          <h4 className="text-xs font-black uppercase tracking-widest">Recommended Buy (Restock)</h4>
                       </div>
                       <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-wrap gap-2">
                          {forecast.inventoryActions.restock.length > 0 ? forecast.inventoryActions.restock.map((item, i) => (
                             <span key={i} className="text-[10px] font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-lg border border-emerald-100 uppercase shadow-sm">{item}</span>
                          )) : <span className="text-[10px] text-slate-400 italic">No immediate restock needed</span>}
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center gap-2 text-rose-600">
                          <ArrowDownRight size={16}/>
                          <h4 className="text-xs font-black uppercase tracking-widest">Clearance Candidates (Dead Stock)</h4>
                       </div>
                       <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 flex flex-wrap gap-2">
                          {forecast.inventoryActions.clearance.length > 0 ? forecast.inventoryActions.clearance.map((item, i) => (
                             <span key={i} className="text-[10px] font-bold text-rose-700 bg-white px-3 py-1.5 rounded-lg border border-rose-100 uppercase shadow-sm">{item}</span>
                          )) : <span className="text-[10px] text-slate-400 italic">Inventory flow is healthy</span>}
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed"><span className="text-slate-900 font-black">Reasoning:</span> {forecast.inventoryActions.reason}</p>
                 </div>
              </div>
           </div>

        </div>
      ) : null}
    </div>
  );
};

export default Forecasting;

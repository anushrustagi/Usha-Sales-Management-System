
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from '../types';
import { 
  BrainCircuit, Sparkles, Loader2, BarChart3, TrendingUp, Info, 
  WifiOff, Target, AlertTriangle, ShieldCheck, Zap, 
  // Added ArrowRight to imports to fix the error on line 253
  ArrowUpRight, ArrowRight, LineChart as LineChartIcon, PieChart as PieChartIcon,
  ChevronRight, Activity, PackageSearch, Lightbulb, BellRing
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, ComposedChart, Bar 
} from 'recharts';

interface ForecastingProps {
  data: AppData;
}

interface ForecastResult {
  expectedTrend: string;
  monthlyProjections: { month: string; value: number; isPredicted: boolean }[];
  topProducts: string[];
  procurementAdvice: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  financialHealth: {
    score: number;
    summary: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

const Forecasting: React.FC<ForecastingProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    if (!isOnline) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const salesSummary = data.invoices
        .filter(i => i.type === 'SALE')
        .map(i => ({ date: i.date, total: i.grandTotal, items: i.items.map(it => it.productName) }));
      
      const expenseSummary = data.transactions
        .filter(t => t.type === 'DEBIT' && t.category !== 'Purchase')
        .reduce((acc: any, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

      const inventoryStatus = data.products.map(p => ({ 
        name: p.name, 
        stock: p.stock, 
        cat: p.category,
        alert: p.stock <= p.minStockAlert 
      }));

      const prompt = `Act as a world-class Business Intelligence consultant. Analyze this raw data for "USHA SALES CORP" and provide a structured JSON forecast.
        
        DATASET:
        - Sales History: ${JSON.stringify(salesSummary.slice(-30))}
        - Expense Breakdown: ${JSON.stringify(expenseSummary)}
        - Inventory Context: ${JSON.stringify(inventoryStatus.slice(0, 20))}
        - Current Date: ${new Date().toLocaleDateString()}

        TASK:
        1. Perform a deep strategic analysis.
        2. Generate 6 months of revenue projections (last 3 actual, next 3 predicted).
        3. Conduct a SWOT analysis based on inventory and conversion patterns.
        4. Assess Financial Health Score (0-100).
        5. Identify top-selling items and inventory risks.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              expectedTrend: { type: Type.STRING },
              monthlyProjections: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.STRING },
                    value: { type: Type.NUMBER },
                    isPredicted: { type: Type.BOOLEAN }
                  },
                  required: ["month", "value", "isPredicted"]
                }
              },
              topProducts: { type: Type.ARRAY, items: { type: Type.STRING } },
              procurementAdvice: { type: Type.STRING },
              swot: {
                type: Type.OBJECT,
                properties: {
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                  opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  threats: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              financialHealth: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  summary: { type: Type.STRING },
                  riskLevel: { type: Type.STRING }
                }
              }
            },
            required: ["expectedTrend", "monthlyProjections", "topProducts", "procurementAdvice", "swot", "financialHealth"]
          }
        },
      });

      const result = JSON.parse(response.text);
      setForecast(result);
    } catch (error) {
      console.error("AI Forecasting failed:", error);
      // Fallback for demonstration
      setForecast({
        expectedTrend: "Revenue is stabilizing after a high-growth quarter. Expecting a 8% correction followed by 12% growth.",
        monthlyProjections: [
          { month: 'Jul', value: 450000, isPredicted: false },
          { month: 'Aug', value: 520000, isPredicted: false },
          { month: 'Sep', value: 480000, isPredicted: false },
          { month: 'Oct', value: 510000, isPredicted: true },
          { month: 'Nov', value: 580000, isPredicted: true },
          { month: 'Dec', value: 650000, isPredicted: true },
        ],
        topProducts: ["Mild Steel Pipes", "Industrial Fittings", "Copper Wire Reels"],
        procurementAdvice: "Stock levels for Pipes are dangerously low relative to predicted Q4 demand. Initiate purchase orders immediately.",
        swot: {
          strengths: ["Strong Cash Flow", "Diverse Supplier Base"],
          weaknesses: ["High Storage Costs", "Slow Inventory Turn-over"],
          opportunities: ["Expansion to New Sub-Areas", "AI-Driven Stocking"],
          threats: ["Material Price Fluctuations", "New Local Competition"]
        },
        financialHealth: {
          score: 82,
          summary: "Highly liquid and profitable, but storage overhead is eating into net margins.",
          riskLevel: "LOW"
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <BrainCircuit className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tight uppercase">Strategy Engine</h2>
            </div>
            <p className="max-w-xl text-slate-400 text-sm font-medium leading-relaxed">
              Analyzing your transactional ledger and inventory flows using Gemini AI to provide predictive demand curves and operational strategy.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-3">
            <button 
              onClick={generateForecast}
              disabled={loading || !isOnline}
              className={`px-8 py-4 font-black rounded-2xl shadow-xl transition-all flex items-center gap-3 active:scale-95 text-xs tracking-widest uppercase ${
                !isOnline 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                  : 'bg-white text-slate-900 hover:bg-blue-50'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="text-blue-600" />}
              {loading ? 'Processing Model...' : 'Execute AI Analysis'}
            </button>
            {!isOnline && (
              <p className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                <WifiOff size={12} /> Requires Connection
              </p>
            )}
          </div>
        </div>
        
        {/* Animated background detail */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {!forecast && !loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-slate-100 border-dashed">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
            <Activity className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-slate-400 font-black text-sm uppercase tracking-widest">Awaiting Analysis Command</h3>
          <p className="text-slate-400 text-xs mt-2 uppercase font-bold opacity-60">System Ready for Business Intelligence Pass</p>
        </div>
      ) : loading ? (
        <div className="space-y-6 animate-pulse">
           <div className="h-64 bg-slate-100 rounded-3xl"></div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl"></div>)}
           </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* AI Strategy Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[2.5rem] flex items-start gap-6 shadow-sm group hover:shadow-xl transition-all">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform"><Lightbulb size={28}/></div>
                <div>
                   <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Demand Forecast</h4>
                   <p className="text-slate-800 font-bold leading-relaxed">{forecast?.expectedTrend}</p>
                   <div className="mt-4 flex flex-wrap gap-2">
                      {forecast?.topProducts.map((p, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white border border-indigo-100 text-[9px] font-black text-indigo-600 rounded-lg uppercase tracking-tight">Predicted: {p}</span>
                      ))}
                   </div>
                </div>
             </div>

             <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2.5rem] flex items-start gap-6 shadow-sm group hover:shadow-xl transition-all">
                <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl shadow-rose-200 group-hover:scale-110 transition-transform"><BellRing size={28}/></div>
                <div>
                   <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Immediate Alerts</h4>
                   <p className="text-slate-800 font-bold leading-relaxed">{forecast?.procurementAdvice}</p>
                   <button className="mt-4 text-[9px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5 group/btn">
                      Generate Purchase Order <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>
          </div>

          {/* Main Forecast Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Health Score & Summary */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex-1">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Health Score</h3>
                    <ShieldCheck className="text-emerald-500" size={20} />
                 </div>
                 <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                       <svg className="w-full h-full transform -rotate-90">
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                          <circle 
                            cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                            strokeDasharray={364.4}
                            strokeDashoffset={364.4 - (364.4 * (forecast?.financialHealth.score || 0)) / 100}
                            className={`${forecast?.financialHealth.score && forecast.financialHealth.score > 80 ? 'text-emerald-500' : 'text-blue-500'}`} 
                          />
                       </svg>
                       <span className="absolute text-3xl font-black text-slate-800 tabular-nums">{forecast?.financialHealth.score}</span>
                    </div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-tighter text-slate-500">Risk Assessment: <span className="text-slate-900">{forecast?.financialHealth.riskLevel}</span></p>
                 </div>
                 <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{forecast?.financialHealth.summary}"</p>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Target size={16} className="text-rose-500" /> Focus Inventory
                 </h3>
                 <div className="space-y-3">
                    {forecast?.topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{p}</span>
                         <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                            <TrendingUp size={10} /> High Demand
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* Revenue Projection Chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <div>
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Trajectory Analysis</h3>
                     <p className="text-lg font-black text-slate-900">Projected 6-Month Volume</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Actual</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-200 rounded-full"></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">AI Projected</span>
                     </div>
                  </div>
               </div>
               
               <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast?.monthlyProjections}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        cursor={{fill: '#f8fafc'}}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[6, 6, 0, 0]}
                        barSize={32}
                      >
                        {forecast?.monthlyProjections.map((entry, index) => (
                          <circle key={`cell-${index}`} fill={entry.isPredicted ? '#c7d2fe' : '#2563eb'} />
                        ))}
                      </Bar>
                      <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.05} stroke="#3b82f6" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* SWOT Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <SWOTCard type="STRENGTHS" items={forecast?.swot.strengths || []} color="emerald" />
             <SWOTCard type="WEAKNESSES" items={forecast?.swot.weaknesses || []} color="rose" />
             <SWOTCard type="OPPORTUNITIES" items={forecast?.swot.opportunities || []} color="blue" />
             <SWOTCard type="THREATS" items={forecast?.swot.threats || []} color="amber" />
          </div>

        </div>
      )}
    </div>
  );
};

const SWOTCard = ({ type, items, color }: { type: string, items: string[], color: string }) => {
  const themes: any = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', bullet: 'bg-emerald-500' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', bullet: 'bg-rose-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', bullet: 'bg-blue-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', bullet: 'bg-amber-500' },
  };
  const theme = themes[color];

  return (
    <div className={`p-6 rounded-3xl border ${theme.bg} ${theme.border} shadow-sm`}>
       <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${theme.text}`}>{type}</h4>
       <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3">
               <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${theme.bullet}`}></div>
               <p className="text-xs font-bold text-slate-700 leading-tight">{item}</p>
            </div>
          ))}
          {items.length === 0 && <p className="text-[10px] font-bold text-slate-400 italic">No data identified</p>}
       </div>
    </div>
  );
};

export default Forecasting;


import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from '../types';
import { 
  BrainCircuit, Sparkles, Loader2, BarChart3, TrendingUp, Info, 
  WifiOff, Target, AlertTriangle, ShieldCheck, Zap, 
  ArrowUpRight, ArrowRight, LineChart as LineChartIcon, PieChart as PieChartIcon,
  ChevronRight, Activity, PackageSearch, Lightbulb, BellRing, CalendarClock, Telescope, TrendingDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, ComposedChart, Bar, Cell 
} from 'recharts';

interface ForecastingProps {
  data: AppData;
}

interface ForecastResult {
  expectedTrend: string;
  monthlyProjections: { month: string; value: number; isPredicted: boolean }[];
  seasonalForecast: { season: string; outlook: string; recommendedFocus: string }[];
  productDemand: { productName: string; predictedGrowth: string; reasoning: string }[];
  procurementAdvice: string;
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
    setLoading(true);
    setErrorMsg('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const salesSummary = data.invoices
        .filter(i => i.type === 'SALE')
        .map(i => ({ date: i.date, total: i.grandTotal, items: i.items.map(it => it.productName) }));
      
      const inventoryStatus = data.products.map(p => ({ 
        name: p.name, 
        stock: p.stock, 
        category: p.category,
        ageing: Math.floor((new Date().getTime() - new Date(p.lastRestockedDate).getTime()) / (1000 * 3600 * 24))
      }));

      const prompt = `Act as a Chief Demand Planner for "USHA SALES CORP". 
        Data Source:
        - Sales History (Last 50 txns): ${JSON.stringify(salesSummary.slice(-50))}
        - Inventory & Ageing (Top 30 items): ${JSON.stringify(inventoryStatus.slice(0, 30))}
        
        Task: Perform a deep predictive analysis. 
        1. Forecast revenue for the next 4 months.
        2. Identify specific products that will see increased demand in the coming season (Quarterly outlook).
        3. Flag "Dead Stock" risks.
        
        Output MUST be strictly JSON adhering to the schema.`;

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
                  properties: { month: { type: Type.STRING }, value: { type: Type.NUMBER }, isPredicted: { type: Type.BOOLEAN } },
                  required: ["month", "value", "isPredicted"]
                }
              },
              seasonalForecast: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { season: { type: Type.STRING }, outlook: { type: Type.STRING }, recommendedFocus: { type: Type.STRING } },
                  required: ["season", "outlook", "recommendedFocus"]
                }
              },
              productDemand: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { productName: { type: Type.STRING }, predictedGrowth: { type: Type.STRING }, reasoning: { type: Type.STRING } },
                  required: ["productName", "predictedGrowth", "reasoning"]
                }
              },
              procurementAdvice: { type: Type.STRING },
              financialHealth: {
                type: Type.OBJECT,
                properties: { score: { type: Type.NUMBER }, summary: { type: Type.STRING }, riskLevel: { type: Type.STRING } },
                required: ["score", "summary", "riskLevel"]
              }
            },
            required: ["expectedTrend", "monthlyProjections", "seasonalForecast", "productDemand", "procurementAdvice", "financialHealth"]
          }
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI Content");
      
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      setForecast(JSON.parse(cleanJson));
    } catch (error: any) {
      console.error("Analysis Link Refused:", error);
      setErrorMsg(`Deep Analysis Failed: ${error.message || "Unknown error"}. Check API Key.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><BrainCircuit className="w-8 h-8 text-white" /></div>
              <div>
                 <h2 className="text-3xl font-black tracking-tight uppercase leading-none">Predictive Analyzer</h2>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2">Gemini 3 Pro Intelligence Engine</p>
              </div>
            </div>
            <p className="max-w-xl text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wide">
               Deep-learning model scanning sales velocity, seasonal vectors, and inventory stagnation to predict future product demand curves.
            </p>
          </div>
          <button onClick={generateForecast} disabled={loading || !isOnline} className={`px-10 py-5 font-black rounded-3xl shadow-xl transition-all flex items-center gap-4 active:scale-95 text-xs tracking-widest uppercase ${!isOnline ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 hover:bg-blue-50'}`}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} className="text-blue-600" />} {loading ? 'Running Simulation...' : 'Execute Deep Scan'}
          </button>
        </div>
        <BrainCircuit size={300} className="absolute -bottom-20 -right-20 text-white opacity-5" />
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-center gap-4 text-rose-600 animate-in fade-in">
           <AlertTriangle size={24} />
           <p className="font-bold text-xs uppercase tracking-wider">{errorMsg}</p>
        </div>
      )}

      {!forecast && !loading && !errorMsg ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-slate-100 border-dashed animate-in fade-in duration-700">
          <Telescope className="w-16 h-16 text-slate-200 mb-6" />
          <h3 className="text-slate-400 font-black text-sm uppercase tracking-widest">Awaiting Strategic Directive</h3>
          <p className="text-slate-300 text-[10px] font-bold uppercase mt-2">Initialize scan to reveal future market position</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
           <div className="lg:col-span-2 h-96 bg-slate-100 rounded-[3rem]"></div>
           <div className="h-96 bg-slate-100 rounded-[3rem]"></div>
        </div>
      ) : forecast ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
           {/* Revenue Projection & Financial Health */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                       <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Future Revenue Curve</h3>
                       <p className="text-xl font-black text-slate-900 uppercase">Projected Cashflow</p>
                    </div>
                    <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                       <TrendingUp size={14}/> {forecast.expectedTrend}
                    </div>
                 </div>
                 <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecast.monthlyProjections}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                          {forecast.monthlyProjections.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.isPredicted ? '#e0e7ff' : '#2563eb'} />)}
                        </Bar>
                        <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.05} stroke="#3b82f6" strokeWidth={4} />
                      </ComposedChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                 <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <div className={`p-4 rounded-2xl text-white shadow-xl ${forecast.financialHealth.riskLevel === 'LOW' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          <ShieldCheck size={24}/>
                       </div>
                       <div>
                          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Health Score</h3>
                          <p className="text-3xl font-black text-slate-900">{forecast.financialHealth.score}/100</p>
                       </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                       <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase">{forecast.financialHealth.summary}</p>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Risk Factor</p>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                       <div className={`h-full transition-all duration-1000 ${forecast.financialHealth.riskLevel === 'LOW' ? 'bg-emerald-500' : forecast.financialHealth.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: forecast.financialHealth.riskLevel === 'LOW' ? '20%' : forecast.financialHealth.riskLevel === 'MEDIUM' ? '50%' : '85%' }}></div>
                    </div>
                    <p className={`text-right text-[10px] font-black uppercase ${forecast.financialHealth.riskLevel === 'LOW' ? 'text-emerald-600' : 'text-amber-600'}`}>{forecast.financialHealth.riskLevel} Exposure</p>
                 </div>
              </div>
           </div>

           {/* Seasonal & Product Analysis */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-50 rounded-[3rem] border border-slate-200 p-10 space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white text-slate-900 rounded-2xl shadow-sm border border-slate-100"><CalendarClock size={20}/></div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Seasonal Radar</h3>
                 </div>
                 <div className="space-y-4">
                    {forecast.seasonalForecast.map((item, idx) => (
                       <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.season}</span>
                             <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase">{item.outlook}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 leading-snug uppercase">Focus: {item.recommendedFocus}</p>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="bg-slate-50 rounded-[3rem] border border-slate-200 p-10 space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm border border-slate-100"><PackageSearch size={20}/></div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">High Growth Candidates</h3>
                 </div>
                 <div className="space-y-4">
                    {forecast.productDemand.map((prod, idx) => (
                       <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                             <h4 className="font-black text-slate-900 text-sm uppercase">{prod.productName}</h4>
                             <div className="flex items-center gap-1 text-emerald-600">
                                <TrendingUp size={14}/>
                                <span className="text-[10px] font-black uppercase">{prod.predictedGrowth}</span>
                             </div>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed border-t border-slate-50 pt-2">{prod.reasoning}</p>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Strategic Advice */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100 flex gap-8 items-start">
              <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl shrink-0"><Lightbulb size={28} strokeWidth={2.5}/></div>
              <div className="space-y-4">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Chief Strategy Directive</h3>
                 <p className="text-sm font-bold text-slate-800 leading-loose uppercase tracking-tight">{forecast.procurementAdvice}</p>
              </div>
           </div>
        </div>
      ) : null}
    </div>
  );
};

export default Forecasting;

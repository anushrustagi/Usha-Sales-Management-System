import React, { useState, useEffect, useMemo } from 'react';
import { AppData, Product } from '../types';
import { 
  LineChart as LineChartIcon, TrendingUp, TrendingDown, 
  AlertTriangle, Package, DollarSign, Activity, 
  ArrowUpRight, ArrowDownRight, Search, Calendar,
  BarChart3, PieChart as PieIcon, Layers, Zap, 
  RefreshCcw, Target, Award, Skull, Loader2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

interface ForecastingProps {
  data: AppData;
}

interface ProductMetric {
  id: string;
  name: string;
  category: string;
  margin: number;
  totalRevenue: number;
  unitsSold: number;
  stock: number;
  velocity: number; // units per month
  status: 'STAR' | 'CASH_COW' | 'PROBLEM' | 'DOG';
}

interface AnalysisResult {
  financialTrend: { month: string; revenue: number; expenses: number; profit: number }[];
  topPerformers: ProductMetric[];
  slowMovers: ProductMetric[];
  deadStock: ProductMetric[];
  categoryPerformance: { name: string; value: number }[];
  walkInDemand: { name: string; count: number }[];
  insights: string[];
  projectedRevenue: number;
  growthRate: number;
}

const Forecasting: React.FC<ForecastingProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const runAnalysis = () => {
    setLoading(true);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      // --- 1. Financial Trend Analysis (Last 6 Months) ---
      const monthlyStats: Record<string, { revenue: number; expenses: number; profit: number; order: number }> = {};
      
      // Initialize months
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyStats[key] = { revenue: 0, expenses: 0, profit: 0, order: i };
      }

      // Process Invoices (Revenue)
      data.invoices.filter(i => i.type === 'SALE' && new Date(i.date) >= sixMonthsAgo).forEach(inv => {
        const d = new Date(inv.date);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (monthlyStats[key]) monthlyStats[key].revenue += inv.grandTotal;
      });

      // Process Expenses (Purchases + Transactions)
      data.invoices.filter(i => i.type === 'PURCHASE' && new Date(i.date) >= sixMonthsAgo).forEach(inv => {
        const d = new Date(inv.date);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (monthlyStats[key]) monthlyStats[key].expenses += inv.grandTotal;
      });
      data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase' && new Date(t.date) >= sixMonthsAgo).forEach(t => {
        const d = new Date(t.date);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (monthlyStats[key]) monthlyStats[key].expenses += t.amount;
      });

      const financialTrend = Object.entries(monthlyStats)
        .map(([month, stats]) => ({
          month,
          revenue: stats.revenue,
          expenses: stats.expenses,
          profit: stats.revenue - stats.expenses,
          order: stats.order
        }))
        .sort((a, b) => b.order - a.order); // Reverse to get chronological order (oldest first)

      // Calculate Growth Rate (Last month vs Avg of prev 3)
      const lastMonth = financialTrend[financialTrend.length - 1];
      const prevRevenue = financialTrend.slice(Math.max(0, financialTrend.length - 4), financialTrend.length - 1).reduce((acc, curr) => acc + curr.revenue, 0) / 3 || 1;
      const growthRate = ((lastMonth.revenue - prevRevenue) / prevRevenue) * 100;
      const projectedRevenue = lastMonth.revenue * (1 + (growthRate / 100));

      // --- 2. Product Matrix & Inventory Health ---
      // Sales in last 90 days for velocity
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const productSalesMap: Record<string, { qty: number, revenue: number }> = {};
      data.invoices.filter(i => i.type === 'SALE' && new Date(i.date) >= ninetyDaysAgo).forEach(inv => {
        inv.items.forEach(item => {
          if (!productSalesMap[item.productId]) productSalesMap[item.productId] = { qty: 0, revenue: 0 };
          productSalesMap[item.productId].qty += item.quantity;
          productSalesMap[item.productId].revenue += item.amount;
        });
      });

      const productMetrics: ProductMetric[] = data.products.map(p => {
        const sales = productSalesMap[p.id] || { qty: 0, revenue: 0 };
        const velocity = sales.qty / 3; // Approx monthly units
        const margin = p.salePrice > 0 ? ((p.salePrice - p.purchasePrice) / p.salePrice) * 100 : 0;
        
        let status: ProductMetric['status'] = 'DOG';
        if (margin > 20 && velocity > 10) status = 'STAR';
        else if (margin <= 20 && velocity > 10) status = 'CASH_COW';
        else if (margin > 20 && velocity <= 10) status = 'PROBLEM'; // High margin but low sales
        else status = 'DOG'; // Low margin, low sales

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          margin,
          totalRevenue: sales.revenue,
          unitsSold: sales.qty,
          stock: p.stock,
          velocity,
          status
        };
      });

      // Segments
      const topPerformers = [...productMetrics].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
      const slowMovers = productMetrics.filter(p => p.velocity < 1 && p.stock > 0).slice(0, 5);
      const deadStock = productMetrics.filter(p => p.unitsSold === 0 && p.stock > 0 && new Date(data.products.find(prod => prod.id === p.id)?.lastRestockedDate || '') < ninetyDaysAgo);

      // Category Analysis
      const categoryStats: Record<string, number> = {};
      productMetrics.forEach(p => {
        categoryStats[p.category] = (categoryStats[p.category] || 0) + p.totalRevenue;
      });
      const categoryPerformance = Object.entries(categoryStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // --- 3. Walk-In Demand Analysis ---
      const demandCounts: Record<string, number> = {};
      data.walkInRecords.forEach(r => {
        if (r.productName) {
          const name = r.productName.toUpperCase();
          demandCounts[name] = (demandCounts[name] || 0) + r.count;
        }
      });
      const walkInDemand = Object.entries(demandCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // --- 4. Insights Generation ---
      const insights = [];
      if (growthRate > 10) insights.push("Business is growing! Revenue trend is positive (+10%) over 3-month avg.");
      else if (growthRate < -10) insights.push("Revenue Alert: Sales are trending down compared to 3-month average.");
      else insights.push("Business is stable with steady revenue flow.");

      if (deadStock.length > 5) insights.push(`Capital Lock Alert: ${deadStock.length} items have not moved in 90 days.`);
      
      const starCount = productMetrics.filter(p => p.status === 'STAR').length;
      insights.push(`${starCount} 'Star' products identified (High Margin & High Velocity). Focus marketing here.`);

      if (walkInDemand.length > 0) {
        insights.push(`High Walk-in Demand for "${walkInDemand[0].name}". Ensure stock availability.`);
      }

      setAnalysis({
        financialTrend,
        topPerformers,
        slowMovers,
        deadStock,
        categoryPerformance,
        walkInDemand,
        insights,
        projectedRevenue,
        growthRate
      });
      setLoading(false);
    }, 1500);
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg"><LineChartIcon className="w-8 h-8 text-white" /></div>
              <div>
                 <h2 className="text-3xl font-black tracking-tight uppercase leading-none">Growth Analyzer</h2>
                 <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.3em] mt-2">Local Algorithmic Engine</p>
              </div>
            </div>
            <p className="max-w-xl text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wide">
               Processing local ledger, inventory velocity, and walk-in patterns to generate deterministic business insights.
            </p>
          </div>
          <button 
            onClick={runAnalysis} 
            disabled={loading} 
            className="px-10 py-5 bg-white text-slate-900 font-black rounded-3xl shadow-xl hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-xs"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCcw size={20} />}
            {loading ? 'Running Algorithms...' : 'Run Deep Scan'}
          </button>
        </div>
        <Activity size={300} className="absolute -bottom-20 -right-20 text-white opacity-5 pointer-events-none" />
      </div>

      {!analysis && !loading && (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-slate-100 border-dashed">
          <BarChart3 className="w-16 h-16 text-slate-200 mb-6" />
          <h3 className="text-slate-400 font-black text-sm uppercase tracking-widest">System Ready</h3>
          <p className="text-slate-300 text-[10px] font-bold uppercase mt-2">Initiate local data processing to view insights</p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
           <div className="h-80 bg-slate-100 rounded-[3rem]"></div>
           <div className="h-80 bg-slate-100 rounded-[3rem]"></div>
        </div>
      )}

      {analysis && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
          
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4 text-slate-400">
                   <Target size={20} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Projected Next Month</h3>
                </div>
                <div className="flex items-end gap-3">
                   <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(analysis.projectedRevenue)}</span>
                   <span className={`text-xs font-black px-2 py-1 rounded mb-1 ${analysis.growthRate >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {analysis.growthRate >= 0 ? '+' : ''}{analysis.growthRate.toFixed(1)}%
                   </span>
                </div>
             </div>
             
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4 text-slate-400">
                   <Zap size={20} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Efficiency Insight</h3>
                </div>
                <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase">
                   {analysis.insights[0]}
                </p>
             </div>

             <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-lg flex flex-col justify-between border border-white/5">
                <div className="flex items-center gap-3 mb-4 text-emerald-400">
                   <Award size={20} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Star Performer</h3>
                </div>
                <div>
                   <p className="text-xl font-black truncate">{analysis.topPerformers[0]?.name || 'N/A'}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      {formatCurrency(analysis.topPerformers[0]?.totalRevenue || 0)} Revenue Generated
                   </p>
                </div>
             </div>
          </div>

          {/* Financial Trend Chart */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Cash Flow Velocity</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">6-Month Revenue vs Expense Trend</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Revenue</div>
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-600"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Expenses</div>
                </div>
             </div>
             <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={analysis.financialTrend}>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             
             {/* Product Matrix */}
             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Layers size={24}/></div>
                   <div>
                      <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Product Matrix</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sales Velocity vs Margin</p>
                   </div>
                </div>
                
                <div className="flex-1 space-y-6">
                   <div>
                      <div className="flex justify-between items-center mb-3">
                         <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Award size={14}/> Top Profit Drivers</h4>
                      </div>
                      <div className="space-y-3">
                         {analysis.topPerformers.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                               <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-800 uppercase">{p.name}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">{p.unitsSold} Sold • {Math.round(p.margin)}% Margin</span>
                               </div>
                               <span className="text-sm font-black text-emerald-700">{formatCurrency(p.totalRevenue)}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   {analysis.deadStock.length > 0 && (
                      <div>
                         <div className="flex justify-between items-center mb-3 pt-4 border-t border-slate-50">
                            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2"><Skull size={14}/> Dead Stock (Zero Sales 90d)</h4>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {analysis.deadStock.slice(0, 6).map((p, i) => (
                               <span key={i} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[9px] font-black uppercase">
                                  {p.name} ({p.stock})
                               </span>
                            ))}
                            {analysis.deadStock.length > 6 && <span className="text-[9px] text-slate-400 font-bold self-center">+{analysis.deadStock.length - 6} more</span>}
                         </div>
                      </div>
                   )}
                </div>
             </div>

             {/* Demand & Categories */}
             <div className="space-y-8">
                {/* Walk-in Demand */}
                <div className="bg-slate-900 p-8 rounded-[3rem] text-white border border-white/5 shadow-xl relative overflow-hidden">
                   <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="p-3 bg-white/10 rounded-2xl"><Search size={20}/></div>
                         <div>
                            <h3 className="font-black text-base uppercase tracking-widest">Unfulfilled Demand</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">From Walk-in Logs</p>
                         </div>
                      </div>
                      <div className="space-y-3">
                         {analysis.walkInDemand.length > 0 ? analysis.walkInDemand.map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                               <span className="text-xs font-bold text-slate-200 uppercase">{d.name}</span>
                               <span className="text-[10px] font-black bg-blue-600 px-2 py-0.5 rounded text-white">{d.count} Requests</span>
                            </div>
                         )) : <div className="text-center py-6 text-slate-500 text-xs font-bold uppercase">No missed demand recorded</div>}
                      </div>
                   </div>
                </div>

                {/* Category Pie */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-[320px]">
                   <div className="mb-4">
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Category Share</h3>
                   </div>
                   <div className="flex-1 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie 
                               data={analysis.categoryPerformance} 
                               innerRadius={60} 
                               outerRadius={80} 
                               paddingAngle={5} 
                               dataKey="value"
                            >
                               {analysis.categoryPerformance.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                               ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                         </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Forecasting;
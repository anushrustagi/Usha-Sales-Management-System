import React, { useMemo } from 'react';
import { Trade, Outcome, TradeType } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, StackedBarChart
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, Wallet, Brain } from 'lucide-react';

interface DashboardProps {
  trades: Trade[];
  initialCapital: number;
  currency: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ trades, initialCapital, currency }) => {
  
  const stats = useMemo(() => {
    // Only calculate stats for CLOSED trades
    const closedTrades = trades.filter(t => t.outcome !== Outcome.OPEN);
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(t => t.outcome === Outcome.WIN).length;
    const losses = closedTrades.filter(t => t.outcome === Outcome.LOSS).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    // Long vs Short PnL
    const longTrades = closedTrades.filter(t => t.type === TradeType.LONG);
    const shortTrades = closedTrades.filter(t => t.type === TradeType.SHORT);
    const longPnL = longTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const shortPnL = shortTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    const avgWin = wins > 0 ? closedTrades.filter(t => (t.pnl || 0) > 0).reduce((acc, t) => acc + (t.pnl || 0), 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(closedTrades.filter(t => (t.pnl || 0) < 0).reduce((acc, t) => acc + (t.pnl || 0), 0) / losses) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin; // Simplified

    const currentBalance = initialCapital + totalPnL;
    const roi = initialCapital > 0 ? (totalPnL / initialCapital) * 100 : 0;

    return { totalTrades, wins, losses, winRate, totalPnL, longPnL, shortPnL, avgWin, avgLoss, profitFactor, currentBalance, roi };
  }, [trades, initialCapital]);

  const equityCurveData = useMemo(() => {
    let runningTotal = initialCapital; // Start from capital if available, else 0 will act as PnL only
    // If capital is 0, we track PnL. If capital > 0, we track Equity.
    const base = initialCapital > 0 ? initialCapital : 0;
    runningTotal = base;

    // We need to add an initial point for the chart
    const data = [{
      trade: 0,
      equity: base,
      date: 'Start',
      pnl: 0
    }];

    // Only map Closed trades
    const sortedTrades = [...trades]
        .filter(t => t.outcome !== Outcome.OPEN)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTrades.forEach((t, index) => {
      runningTotal += (t.pnl || 0);
      data.push({
        trade: index + 1,
        equity: runningTotal,
        date: new Date(t.date).toLocaleDateString(),
        pnl: t.pnl || 0
      });
    });

    return data;
  }, [trades, initialCapital]);

  const dailyPerformanceData = useMemo(() => {
     // Group trades by date
     const grouped: Record<string, { win: number, loss: number, be: number, total: number }> = {};
     
     const closedTrades = trades
        .filter(t => t.outcome !== Outcome.OPEN)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

     closedTrades.forEach(t => {
         const dateKey = new Date(t.date).toLocaleDateString();
         if (!grouped[dateKey]) grouped[dateKey] = { win: 0, loss: 0, be: 0, total: 0 };
         
         grouped[dateKey].total += 1;
         if (t.outcome === Outcome.WIN) grouped[dateKey].win += 1;
         else if (t.outcome === Outcome.LOSS) grouped[dateKey].loss += 1;
         else if (t.outcome === Outcome.BREAK_EVEN) grouped[dateKey].be += 1;
     });

     return Object.entries(grouped).map(([date, counts]) => ({
         date,
         winRate: (counts.win / counts.total) * 100,
         lossRate: (counts.loss / counts.total) * 100,
         beRate: (counts.be / counts.total) * 100,
         total: counts.total
     })).slice(-10); // Last 10 days
  }, [trades]);

  const emotionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    trades.forEach(t => {
        // Collect all emotions from entry, exit, and legacy field
        const allEmotions = [
            ...(t.emotionsEntry || []),
            ...(t.emotionsExit || []),
            ...(t.emotions || [])
        ];
        
        allEmotions.forEach(e => {
            if (e) counts[e] = (counts[e] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [trades]);

  const outcomeDistribution = [
    { name: 'Wins', value: stats.wins, color: '#10b981' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
    { name: 'Break Even', value: trades.filter(t => t.outcome === Outcome.BREAK_EVEN).length, color: '#64748b' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {initialCapital > 0 ? (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between">
             <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm font-medium">Account Balance</span>
                  <Wallet className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {currency}{stats.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`text-xs mt-1 font-medium ${stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}% ROI
                </div>
             </div>
             
             <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between text-xs">
                <div className="flex gap-1">
                   <span className="text-slate-500">Longs:</span>
                   <span className={stats.longPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {currency}{stats.longPnL.toFixed(0)}
                   </span>
                </div>
                <div className="flex gap-1">
                   <span className="text-slate-500">Shorts:</span>
                   <span className={stats.shortPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {currency}{stats.shortPnL.toFixed(0)}
                   </span>
                </div>
             </div>
          </div>
        ) : (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm font-medium">Net P&L</span>
                  <DollarSign className={`w-4 h-4 ${stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                </div>
                <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currency}{stats.totalPnL.toFixed(2)}
                </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between text-xs">
                <div className="flex gap-1">
                   <span className="text-slate-500">Longs:</span>
                   <span className={stats.longPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {currency}{stats.longPnL.toFixed(0)}
                   </span>
                </div>
                <div className="flex gap-1">
                   <span className="text-slate-500">Shorts:</span>
                   <span className={stats.shortPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {currency}{stats.shortPnL.toFixed(0)}
                   </span>
                </div>
             </div>
          </div>
        )}

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Win Rate</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.wins}W - {stats.losses}L (Closed)
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Profit Factor</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.profitFactor.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
             Avg Win: {currency}{stats.avgWin.toFixed(0)} / Avg Loss: {currency}{stats.avgLoss.toFixed(0)}
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Completed Trades</span>
            <Activity className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.totalTrades}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-6">Equity Curve</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="trade" stroke="#94a3b8" tick={{fontSize: 12}} />
                <YAxis stroke="#94a3b8" tick={{fontSize: 12}} domain={['auto', 'auto']} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                  formatter={(value: any) => [`${currency}${parseFloat(value).toFixed(2)}`, 'Equity']}
                />
                <Line 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Distribution */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-6">Outcome Distribution</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {outcomeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <RechartsTooltip 
                   contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Daily Performance Chart */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
             <h3 className="text-lg font-semibold text-slate-100 mb-6">Daily Performance Rates</h3>
             <div className="h-64">
                {dailyPerformanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyPerformanceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} />
                            <YAxis stroke="#94a3b8" tick={{fontSize: 12}} unit="%" />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                                cursor={{fill: '#334155', opacity: 0.4}}
                            />
                            <Legend />
                            <Bar dataKey="winRate" name="Win %" stackId="a" fill="#10b981" />
                            <Bar dataKey="lossRate" name="Loss %" stackId="a" fill="#ef4444" />
                            <Bar dataKey="beRate" name="BE %" stackId="a" fill="#64748b" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Activity className="w-8 h-8 mb-2 opacity-50" />
                        <p>No enough trade data.</p>
                    </div>
                )}
             </div>
          </div>
      </div>

      {/* Psychology Section */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div className="flex items-center gap-2 mb-6">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-100">Emotional Frequency Analysis</h3>
        </div>
        <div className="h-64">
           {emotionStats.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={emotionStats}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                 <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} interval={0} />
                 <YAxis stroke="#94a3b8" tick={{fontSize: 12}} allowDecimals={false} />
                 <RechartsTooltip 
                   contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                   cursor={{fill: '#334155', opacity: 0.4}}
                 />
                 <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Frequency" />
               </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Brain className="w-8 h-8 mb-2 opacity-50" />
                <p>No emotional data recorded yet.</p>
                <p className="text-xs">Log emotions in your trades to see this chart.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

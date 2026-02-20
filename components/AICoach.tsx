import React, { useMemo } from 'react';
import { Trade, TradeType, Outcome, Emotion } from '../types';
import { 
  BrainCircuit, AlertTriangle, CheckCircle, TrendingUp, ShieldAlert, 
  HeartPulse, Clock, Calendar, BarChart3, Zap, Target, Hourglass 
} from 'lucide-react';

interface AICoachProps {
  trades: Trade[];
  currency: string;
  initialCapital: number;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  category: 'Risk' | 'Psychology' | 'Timing' | 'Strategy' | 'Performance';
  title: string;
  message: string;
  metric?: string;
  icon: React.ReactNode;
}

export const AICoach: React.FC<AICoachProps> = ({ trades, currency, initialCapital }) => {
  
  const insights = useMemo(() => {
    const report: Insight[] = [];
    
    // Sort trades by date ascending for sequential analysis
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const closedTrades = sortedTrades.filter(t => t.outcome !== Outcome.OPEN);
    
    // Not Enough Data check
    if (closedTrades.length < 5) {
      return [{
        id: 'no-data',
        type: 'neutral',
        category: 'Performance',
        title: 'Gathering Data',
        message: 'The local analytics engine needs at least 5 closed trades to generate patterns and reliable insights.',
        icon: <BrainCircuit className="w-5 h-5 text-slate-400" />
      }];
    }

    // --- 1. STREAK ANALYSIS ---
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let streakType: 'WIN' | 'LOSS' | null = null;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    closedTrades.forEach(t => {
        if (t.outcome === Outcome.WIN) {
            tempWinStreak++;
            tempLossStreak = 0;
            if (streakType === 'WIN') currentStreak++;
            else { currentStreak = 1; streakType = 'WIN'; }
        } else if (t.outcome === Outcome.LOSS) {
            tempLossStreak++;
            tempWinStreak = 0;
            if (streakType === 'LOSS') currentStreak++;
            else { currentStreak = 1; streakType = 'LOSS'; }
        }
        if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
        if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
    });

    if (streakType === 'WIN' && currentStreak >= 3) {
        report.push({
            id: 'hot-streak',
            type: 'success',
            category: 'Performance',
            title: 'Hot Streak Detected',
            message: `You have won ${currentStreak} trades in a row. Confidence is good, but beware of euphoria. Stick to your size.`,
            metric: `${currentStreak} Wins`,
            icon: <Zap className="w-5 h-5 text-yellow-400" />
        });
    } else if (streakType === 'LOSS' && currentStreak >= 3) {
         report.push({
            id: 'cold-streak',
            type: 'danger',
            category: 'Psychology',
            title: 'Cold Streak Warning',
            message: `You have lost ${currentStreak} trades in a row. You may be tilting. Consider taking a break or reducing position size by 50%.`,
            metric: `${currentStreak} Losses`,
            icon: <HeartPulse className="w-5 h-5 text-red-500" />
        });
    }

    // --- 2. TIME OF DAY ANALYSIS ---
    const hourPerformance: Record<number, { pnl: number, wins: number, total: number }> = {};
    const dayPerformance: Record<number, { pnl: number, wins: number, total: number }> = {};

    closedTrades.forEach(t => {
        const date = new Date(t.date);
        const hour = date.getHours();
        const day = date.getDay();

        if (!hourPerformance[hour]) hourPerformance[hour] = { pnl: 0, wins: 0, total: 0 };
        if (!dayPerformance[day]) dayPerformance[day] = { pnl: 0, wins: 0, total: 0 };

        hourPerformance[hour].total++;
        hourPerformance[hour].pnl += (t.pnl || 0);
        if (t.outcome === Outcome.WIN) hourPerformance[hour].wins++;

        dayPerformance[day].total++;
        dayPerformance[day].pnl += (t.pnl || 0);
        if (t.outcome === Outcome.WIN) dayPerformance[day].wins++;
    });

    // Find best hour bucket (Morning 6-12, Afternoon 12-18, Evening 18-0, Night 0-6)
    const buckets = {
        'Morning (6AM-12PM)': { pnl: 0, total: 0 },
        'Afternoon (12PM-6PM)': { pnl: 0, total: 0 },
        'Evening (6PM-12AM)': { pnl: 0, total: 0 },
        'Night (12AM-6AM)': { pnl: 0, total: 0 }
    };

    Object.entries(hourPerformance).forEach(([h, data]) => {
        const hour = parseInt(h);
        if (hour >= 6 && hour < 12) { buckets['Morning (6AM-12PM)'].pnl += data.pnl; buckets['Morning (6AM-12PM)'].total += data.total; }
        else if (hour >= 12 && hour < 18) { buckets['Afternoon (12PM-6PM)'].pnl += data.pnl; buckets['Afternoon (12PM-6PM)'].total += data.total; }
        else if (hour >= 18 && hour <= 23) { buckets['Evening (6PM-12AM)'].pnl += data.pnl; buckets['Evening (6PM-12AM)'].total += data.total; }
        else { buckets['Night (12AM-6AM)'].pnl += data.pnl; buckets['Night (12AM-6AM)'].total += data.total; }
    });

    const bestBucket = Object.entries(buckets).reduce((a, b) => a[1].pnl > b[1].pnl ? a : b);
    if (bestBucket[1].total > 3 && bestBucket[1].pnl > 0) {
        report.push({
            id: 'best-time',
            type: 'info',
            category: 'Timing',
            title: 'Prime Trading Window',
            message: `Your most profitable time of day is ${bestBucket[0]}. You have made ${currency}${bestBucket[1].pnl.toFixed(0)} during this window.`,
            icon: <Clock className="w-5 h-5 text-blue-400" />
        });
    }

    // --- 3. DURATION ANALYSIS ---
    let totalWinDuration = 0;
    let totalLossDuration = 0;
    let winCount = 0;
    let lossCount = 0;

    closedTrades.forEach(t => {
        if (t.exitDate) {
            const durationMinutes = (new Date(t.exitDate).getTime() - new Date(t.date).getTime()) / 60000;
            if (t.outcome === Outcome.WIN) {
                totalWinDuration += durationMinutes;
                winCount++;
            } else if (t.outcome === Outcome.LOSS) {
                totalLossDuration += durationMinutes;
                lossCount++;
            }
        }
    });

    const avgWinDuration = winCount > 0 ? totalWinDuration / winCount : 0;
    const avgLossDuration = lossCount > 0 ? totalLossDuration / lossCount : 0;

    if (avgWinDuration > 0 && avgLossDuration > 0) {
        if (avgWinDuration < avgLossDuration * 0.5) {
             report.push({
                id: 'cutting-winners',
                type: 'warning',
                category: 'Strategy',
                title: 'Cutting Winners Short?',
                message: `You hold losers (${avgLossDuration.toFixed(0)}m) much longer than winners (${avgWinDuration.toFixed(0)}m). This usually indicates fear of giving back profits.`,
                icon: <Hourglass className="w-5 h-5 text-orange-400" />
            });
        } else if (avgWinDuration > avgLossDuration * 1.5) {
            report.push({
                id: 'letting-run',
                type: 'success',
                category: 'Strategy',
                title: 'Patience Pays Off',
                message: `You hold winners (${avgWinDuration.toFixed(0)}m) significantly longer than losers (${avgLossDuration.toFixed(0)}m). This is a hallmark of professional trading.`,
                icon: <CheckCircle className="w-5 h-5 text-emerald-400" />
            });
        }
    }

    // --- 4. SETUP INTELLIGENCE ---
    const setupStats: Record<string, { pnl: number, wins: number, total: number }> = {};
    closedTrades.forEach(t => {
        if (t.setup) {
            if (!setupStats[t.setup]) setupStats[t.setup] = { pnl: 0, wins: 0, total: 0 };
            setupStats[t.setup].total++;
            setupStats[t.setup].pnl += (t.pnl || 0);
            if (t.outcome === Outcome.WIN) setupStats[t.setup].wins++;
        }
    });

    const bestSetup = Object.entries(setupStats).reduce((a, b) => (a[1].pnl > b[1].pnl ? a : b), ['', { pnl: -Infinity, wins: 0, total: 0 }]);
    const worstSetup = Object.entries(setupStats).reduce((a, b) => (a[1].pnl < b[1].pnl ? a : b), ['', { pnl: Infinity, wins: 0, total: 0 }]);

    if (bestSetup[0] && bestSetup[1].total >= 3) {
         report.push({
            id: 'best-setup',
            type: 'success',
            category: 'Strategy',
            title: 'Best Strategy: ' + bestSetup[0],
            message: `This setup has generated ${currency}${bestSetup[1].pnl.toFixed(0)} with a ${((bestSetup[1].wins / bestSetup[1].total) * 100).toFixed(0)}% win rate. Double down on finding this pattern.`,
            icon: <Target className="w-5 h-5 text-emerald-400" />
        });
    }

    if (worstSetup[0] && worstSetup[1].total >= 3 && worstSetup[1].pnl < 0) {
        report.push({
           id: 'worst-setup',
           type: 'warning',
           category: 'Strategy',
           title: 'Problematic Strategy: ' + worstSetup[0],
           message: `This setup is draining your capital (${currency}${worstSetup[1].pnl.toFixed(0)}). Review your execution or consider dropping it.`,
           icon: <AlertTriangle className="w-5 h-5 text-orange-400" />
       });
   }

    // --- 5. RISK MANAGEMENT ---
    const tradesWithoutSL = closedTrades.filter(t => !t.stopLoss || t.stopLoss <= 0).length;
    if (tradesWithoutSL > 0) {
        report.push({
            id: 'missing-sl',
            type: 'danger',
            category: 'Risk',
            title: 'Safety Hazard',
            message: `${tradesWithoutSL} of your trades were taken without a hard Stop Loss. This exposes you to ruin risk.`,
            icon: <ShieldAlert className="w-5 h-5 text-red-500" />
        });
    }

    // --- 6. REVENGE TRADING DETECTION ---
    // Check for 3+ trades in same 2 hour window where at least 2 were losses
    for (let i = 0; i < closedTrades.length - 2; i++) {
        const t1 = closedTrades[i];
        const t2 = closedTrades[i+2]; // Check range of 3 trades
        const timeDiff = (new Date(t2.date).getTime() - new Date(t1.date).getTime()) / (1000 * 60 * 60); // Hours
        
        if (timeDiff < 2) {
            const subset = [t1, closedTrades[i+1], t2];
            const losses = subset.filter(t => t.outcome === Outcome.LOSS).length;
            if (losses >= 2) {
                report.push({
                    id: 'revenge-trading',
                    type: 'danger',
                    category: 'Psychology',
                    title: 'Possible Revenge Trading',
                    message: `Detected rapid-fire trading with multiple losses around ${new Date(t1.date).toLocaleDateString()}. Slow down after a loss.`,
                    icon: <BrainCircuit className="w-5 h-5 text-purple-400" />
                });
                break; // Only report once
            }
        }
    }

    return report;
  }, [trades, currency, initialCapital]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 h-[600px] flex flex-col shadow-xl">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
                <BrainCircuit className="w-6 h-6 text-blue-400" />
            </div>
            <div>
                <h3 className="font-bold text-slate-100">Local Trading Brain</h3>
                <p className="text-xs text-slate-400">Advanced Pattern Recognition Engine</p>
            </div>
        </div>
        <div className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700">
            {insights.length} Insights
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        {insights.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-500">
                 <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                 <p>Log more trades to activate the brain.</p>
             </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {insights.map((item) => (
                    <div 
                        key={item.id} 
                        className={`relative overflow-hidden p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                        item.type === 'danger' ? 'bg-gradient-to-br from-red-900/20 to-slate-800 border-red-500/30' :
                        item.type === 'warning' ? 'bg-gradient-to-br from-orange-900/20 to-slate-800 border-orange-500/30' :
                        item.type === 'success' ? 'bg-gradient-to-br from-emerald-900/20 to-slate-800 border-emerald-500/30' :
                        item.type === 'info' ? 'bg-gradient-to-br from-blue-900/20 to-slate-800 border-blue-500/30' :
                        'bg-slate-800 border-slate-700'
                        }`}
                    >
                        {/* Category Badge */}
                        <div className="absolute top-0 right-0 px-3 py-1 bg-black/20 text-[10px] font-bold uppercase tracking-wider text-slate-400 rounded-bl-xl border-l border-b border-white/5">
                            {item.category}
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className={`mt-1 p-2.5 rounded-lg shrink-0 shadow-lg ${
                                item.type === 'danger' ? 'bg-red-500/20 text-red-400' :
                                item.type === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                                item.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                item.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-slate-700 text-slate-400'
                            }`}>
                                {item.icon}
                            </div>
                            <div className="flex-1 pr-12">
                                <h4 className={`font-bold text-sm mb-1 ${
                                    item.type === 'danger' ? 'text-red-300' :
                                    item.type === 'warning' ? 'text-orange-300' :
                                    item.type === 'success' ? 'text-emerald-300' :
                                    item.type === 'info' ? 'text-blue-300' :
                                    'text-slate-200'
                                }`}>
                                    {item.title}
                                </h4>
                                <p className="text-sm text-slate-300/90 leading-relaxed mb-2">
                                    {item.message}
                                </p>
                                {item.metric && (
                                    <div className="inline-block px-2 py-0.5 bg-black/30 rounded text-xs font-mono text-slate-400 border border-white/5">
                                        {item.metric}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
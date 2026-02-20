import React, { useState, useMemo } from 'react';
import { Trade, TradeType, Outcome } from '../types';
import { Calendar, Tag, Target, ShieldAlert, Scale, Filter, AlertTriangle, Edit2, Trash2, CheckCircle2, Star, AlertCircle, ChevronDown, ChevronUp, BookOpen, XCircle } from 'lucide-react';

interface TradeListProps {
  trades: Trade[];
  initialCapital?: number;
  currency: string;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

// Helper functions moved outside component scope
const calculateR = (trade: Trade) => {
  if (!trade.stopLoss) return null;
  
  let risk = 0;
  let reward = 0;

  // For Open Trades, we can only calculate Planned R (vs TP)
  // For Closed Trades, we calculate Realized R (vs Exit)
  const isClosed = trade.outcome !== Outcome.OPEN;
  const targetPrice = isClosed ? trade.exitPrice! : trade.takeProfit;

  // If open and no TP, cant calculate R
  if (!isClosed && (!targetPrice || targetPrice === 0)) return null;

  if (trade.type === TradeType.LONG) {
    risk = trade.entryPrice - trade.stopLoss;
    reward = targetPrice - trade.entryPrice;
  } else {
    risk = trade.stopLoss - trade.entryPrice;
    reward = trade.entryPrice - targetPrice;
  }

  if (risk <= 0.00001) return null; 

  return (reward / risk).toFixed(2);
};

const calculateRiskMetrics = (trade: Trade, initialCapital: number) => {
  if (!trade.stopLoss || trade.stopLoss <= 0) return null;

  let riskAmount = 0;
  if (trade.type === TradeType.LONG) {
    riskAmount = (trade.entryPrice - trade.stopLoss) * trade.quantity;
  } else {
    riskAmount = (trade.stopLoss - trade.entryPrice) * trade.quantity;
  }

  if (riskAmount <= 0) return null;

  const riskPercent = initialCapital > 0 ? (riskAmount / initialCapital) * 100 : 0;

  return { riskAmount, riskPercent };
};

interface TradeCardProps {
  trade: Trade;
  initialCapital: number;
  currency: string;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

const TradeCard: React.FC<TradeCardProps> = ({ trade, initialCapital, currency, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const rMultiple = calculateR(trade);
  const riskMetrics = calculateRiskMetrics(trade, initialCapital);
  const isClosed = trade.outcome !== Outcome.OPEN;
  
  // Combine all emotions for display or prefer Entry/Exit if available
  const displayEmotions = [...(trade.emotionsEntry || []), ...(trade.emotionsExit || []), ...(trade.emotions || [])];
  const uniqueEmotions = Array.from(new Set(displayEmotions));

  return (
    <div className="p-4 hover:bg-slate-700/50 transition-colors group">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                trade.type === TradeType.LONG ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
              }`}>
                {trade.type}
              </span>
              <span className="font-bold text-slate-200">{trade.symbol}</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(trade.date).toLocaleDateString()}
              </span>
              {!isClosed && (
                  <span className="text-[10px] font-bold bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded border border-blue-800 animate-pulse">
                      LIVE
                  </span>
              )}
            </div>
            <div className="flex items-center gap-4">
                {isClosed ? (
                    <div className={`text-right font-mono font-bold ${trade.pnl! >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.pnl! >= 0 ? '+' : ''}{currency}{trade.pnl!.toFixed(2)}
                    </div>
                ) : (
                    <div className="text-xs text-slate-500 italic">Floating</div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!isClosed && (
                      <button 
                          onClick={() => onEdit(trade)}
                          title="Close Position"
                          className="p-1.5 hover:bg-emerald-500/20 text-emerald-500 rounded"
                      >
                          <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => onEdit(trade)}
                      className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(trade.id)}
                      className="p-1.5 hover:bg-red-500/20 text-red-400 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm text-slate-400 mt-3">
            <div className="space-y-1">
              <div className="flex gap-4">
                  <span>Entry: <span className="text-slate-200">{trade.entryPrice}</span></span>
                  {isClosed ? (
                       <span>Exit: <span className="text-slate-200">{trade.exitPrice}</span></span>
                  ) : (
                      <span>Qty: <span className="text-slate-200">{trade.quantity}</span></span>
                  )}
              </div>
              
              {(trade.stopLoss > 0 || trade.takeProfit > 0) && (
                 <div className="flex gap-3 pt-1 text-xs">
                   {trade.stopLoss > 0 && (
                     <span className="text-red-400/80 flex items-center gap-1 bg-red-900/20 px-1.5 py-0.5 rounded border border-red-900/30">
                       <ShieldAlert className="w-3 h-3" /> SL: {trade.stopLoss}
                     </span>
                   )}
                   {trade.takeProfit > 0 && (
                     <span className="text-emerald-400/80 flex items-center gap-1 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-900/30">
                       <Target className="w-3 h-3" /> TP: {trade.takeProfit}
                     </span>
                   )}
                 </div>
              )}
            </div>

            <div className="flex flex-col sm:items-end gap-2">
               <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  {uniqueEmotions.slice(0, 3).map(e => (
                    <span key={e} className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 border border-slate-600">
                      {e}
                    </span>
                  ))}
                  {uniqueEmotions.length > 3 && <span className="text-[10px] text-slate-500">+{uniqueEmotions.length - 3}</span>}
               </div>
               
               <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  {/* Rating Badge */}
                  {trade.executionRating && trade.executionRating > 0 && (
                      <div className="flex items-center gap-1" title="Execution Rating">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">{trade.executionRating}/5</span>
                      </div>
                  )}

                  {/* R Multiple Badge */}
                  {rMultiple && (
                      <div className="flex items-center gap-1.5" title={!isClosed ? "Planned Risk/Reward" : "Realized Risk/Reward"}>
                          <Scale className="w-3 h-3 text-slate-500" />
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              parseFloat(rMultiple) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                              {parseFloat(rMultiple) > 0 ? '+' : ''}{rMultiple}R
                          </span>
                      </div>
                  )}

                   {/* Risk % Badge */}
                   {riskMetrics && initialCapital > 0 && (
                    <div className="flex items-center gap-1.5" title="Risk Amount and % of Initial Capital">
                      <AlertTriangle className="w-3 h-3 text-slate-500" />
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                         riskMetrics.riskPercent > 2 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}>
                        -{currency}{riskMetrics.riskAmount.toFixed(0)} ({riskMetrics.riskPercent.toFixed(1)}%)
                      </span>
                    </div>
                  )}
               </div>
            </div>
          </div>
          
          {/* Analysis Footer */}
          <div className="mt-3 pt-2 border-t border-slate-700/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                  {trade.setup && (
                      <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
                          <Tag className="w-3 h-3" />
                          <span className="font-medium text-slate-400">{trade.setup}</span>
                      </div>
                  )}
              </div>
              <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                  {isExpanded ? 'Hide Analysis' : 'View Analysis'}
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {isExpanded && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    
                    {/* Plan */}
                    {trade.plan && (
                        <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50">
                            <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                                <Target className="w-3 h-3" /> The Plan
                            </h5>
                            <p className="text-sm text-slate-300 italic">"{trade.plan}"</p>
                        </div>
                    )}

                    {/* Analysis Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Mistakes */}
                        <div className="bg-red-900/10 p-3 rounded border border-red-900/20">
                            <h5 className="text-[10px] uppercase font-bold text-red-400 mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Mistakes
                            </h5>
                            <p className="text-sm text-slate-300">
                                {trade.mistakes || <span className="text-slate-600 italic">None recorded.</span>}
                            </p>
                        </div>

                        {/* Learnings */}
                        <div className="bg-emerald-900/10 p-3 rounded border border-emerald-900/20">
                            <h5 className="text-[10px] uppercase font-bold text-emerald-400 mb-1 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> Learnings
                            </h5>
                            <p className="text-sm text-slate-300">
                                {trade.learnings || <span className="text-slate-600 italic">No specific learnings.</span>}
                            </p>
                        </div>
                    </div>

                    {/* Rating & Notes */}
                    <div className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                            <span className="text-xs text-slate-400 font-bold uppercase">Execution Rating</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${star <= (trade.executionRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} 
                                    />
                                ))}
                            </div>
                        </div>
                        {trade.notes && (
                            <div className="pt-1">
                                <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Notes</h5>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap">{trade.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>
  );
};

export const TradeList: React.FC<TradeListProps> = ({ trades, initialCapital = 0, currency, onEdit, onDelete }) => {
  // --- FILTERS STATE ---
  const [setupFilter, setSetupFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Extract unique setups
  const setups = useMemo(() => {
    const s = new Set(trades.map(t => t.setup).filter(Boolean));
    return ['ALL', ...Array.from(s)];
  }, [trades]);

  // Filter and Sort Logic
  const filteredTrades = useMemo(() => {
    let result = trades;
    
    // 1. Setup Filter
    if (setupFilter !== 'ALL') {
      result = result.filter(t => t.setup === setupFilter);
    }

    // 2. Outcome Filter
    if (outcomeFilter !== 'ALL') {
      result = result.filter(t => t.outcome === outcomeFilter);
    }

    // 3. Trade Type Filter
    if (typeFilter !== 'ALL') {
      result = result.filter(t => t.type === typeFilter);
    }

    // 4. Date Range Filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(t => new Date(t.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.date) <= end);
    }

    return [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades, setupFilter, outcomeFilter, typeFilter, startDate, endDate]);

  const resetFilters = () => {
      setSetupFilter('ALL');
      setOutcomeFilter('ALL');
      setTypeFilter('ALL');
      setStartDate('');
      setEndDate('');
  };

  const openTrades = filteredTrades.filter(t => t.outcome === Outcome.OPEN);
  const closedTrades = filteredTrades.filter(t => t.outcome !== Outcome.OPEN);

  const activeFiltersCount = [
      setupFilter !== 'ALL',
      outcomeFilter !== 'ALL',
      typeFilter !== 'ALL',
      startDate !== '',
      endDate !== ''
  ].filter(Boolean).length;

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-800 rounded-xl border border-slate-700 text-slate-400">
        <p>No trades logged yet.</p>
        <p className="text-sm mt-2">Click "Log Trade" to start your journey.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
        <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" /> 
                Filter Trades
                {activeFiltersCount > 0 && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
            </h3>
            {activeFiltersCount > 0 && (
                <button 
                    onClick={resetFilters}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                    <XCircle className="w-3 h-3" /> Clear All
                </button>
            )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Setup */}
            <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold">Strategy</label>
                <select 
                    value={setupFilter} 
                    onChange={(e) => setSetupFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                >
                    {setups.map(s => (
                    <option key={s} value={s}>{s === 'ALL' ? 'All Strategies' : s}</option>
                    ))}
                </select>
            </div>

            {/* Outcome */}
            <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold">Outcome</label>
                <select 
                    value={outcomeFilter} 
                    onChange={(e) => setOutcomeFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                >
                    <option value="ALL">All Outcomes</option>
                    <option value={Outcome.WIN}>Win</option>
                    <option value={Outcome.LOSS}>Loss</option>
                    <option value={Outcome.BREAK_EVEN}>Break Even</option>
                    <option value={Outcome.OPEN}>Open / Active</option>
                </select>
            </div>

            {/* Type */}
            <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold">Direction</label>
                <select 
                    value={typeFilter} 
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                >
                    <option value="ALL">All Types</option>
                    <option value={TradeType.LONG}>Long</option>
                    <option value={TradeType.SHORT}>Short</option>
                </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold">From Date</label>
                <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                />
            </div>

            {/* End Date */}
            <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold">To Date</label>
                <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                />
            </div>
        </div>
      </div>

      {/* Running Trades Section */}
      {openTrades.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden border-l-4 border-l-blue-500">
             <div className="p-3 bg-blue-900/20 border-b border-slate-700 flex justify-between items-center">
                 <h4 className="font-bold text-blue-100 text-sm uppercase tracking-wide">Running Positions</h4>
                 <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{openTrades.length}</span>
             </div>
             <div className="divide-y divide-slate-700">
                 {openTrades.map(trade => (
                     <TradeCard 
                        key={trade.id} 
                        trade={trade} 
                        initialCapital={initialCapital}
                        currency={currency}
                        onEdit={onEdit}
                        onDelete={onDelete}
                     />
                 ))}
             </div>
          </div>
      )}

      {/* Closed Trades Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
             <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wide">Trade History</h4>
             <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">{closedTrades.length}</span>
        </div>
        <div className="divide-y divide-slate-700">
           {closedTrades.length === 0 ? (
               <div className="p-8 text-center text-slate-500 text-sm">No closed trades matching filters.</div>
           ) : (
               closedTrades.map(trade => (
                   <TradeCard 
                      key={trade.id} 
                      trade={trade} 
                      initialCapital={initialCapital}
                      currency={currency}
                      onEdit={onEdit}
                      onDelete={onDelete}
                   />
               ))
           )}
        </div>
      </div>
    </div>
  );
};
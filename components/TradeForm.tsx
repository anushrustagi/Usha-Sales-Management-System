import React, { useState, useEffect, useMemo } from 'react';
import { Trade, TradeType, Outcome, Emotion } from '../types';
import { PlusCircle, X, Save, Edit, Brain, Target, Activity, AlertTriangle, Star, ShieldAlert } from 'lucide-react';

interface TradeFormProps {
  initialData?: Trade;
  currency: string;
  onSave: (trade: Trade) => void;
  onClose: () => void;
  dailyTradeCount: number;
  dailyTradeLimit: number;
}

export const TradeForm: React.FC<TradeFormProps> = ({ 
  initialData, 
  currency, 
  onSave, 
  onClose,
  dailyTradeCount,
  dailyTradeLimit
}) => {
  // --- STATE ---
  
  // 1. Planning & Setup
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<TradeType>(TradeType.LONG);
  const [setup, setSetup] = useState('');
  const [plan, setPlan] = useState(''); // "Inside the Trade"
  
  // 2. Execution Parameters
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16)); // DateTime local
  const [quantity, setQuantity] = useState<string>('');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [emotionsEntry, setEmotionsEntry] = useState<Emotion[]>([]);

  // 3. Management & Exit
  const [isOpen, setIsOpen] = useState(false);
  const [exitPrice, setExitPrice] = useState<string>('');
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 16));
  const [emotionsExit, setEmotionsExit] = useState<Emotion[]>([]);

  // 4. Analysis & Review
  const [notes, setNotes] = useState('');
  const [learnings, setLearnings] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [executionRating, setExecutionRating] = useState<number>(0);

  // Load Data on Edit
  useEffect(() => {
    if (initialData) {
      setSymbol(initialData.symbol);
      setType(initialData.type);
      setSetup(initialData.setup);
      setPlan(initialData.plan || '');
      setDate(new Date(initialData.date).toISOString().slice(0, 16));
      setQuantity(initialData.quantity.toString());
      setEntryPrice(initialData.entryPrice.toString());
      setStopLoss(initialData.stopLoss.toString());
      setTakeProfit(initialData.takeProfit.toString());
      setEmotionsEntry(initialData.emotionsEntry || initialData.emotions || []);
      
      setIsOpen(initialData.outcome === Outcome.OPEN);
      if (initialData.outcome !== Outcome.OPEN) {
        setExitPrice(initialData.exitPrice?.toString() || '');
        setExitDate(initialData.exitDate ? new Date(initialData.exitDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
        setEmotionsExit(initialData.emotionsExit || []);
      }

      setNotes(initialData.notes);
      setLearnings(initialData.learnings || '');
      setMistakes(initialData.mistakes || '');
      setExecutionRating(initialData.executionRating || 0);
    }
  }, [initialData]);

  // --- CALCULATIONS ---
  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const qty = parseFloat(quantity) || 0;
    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(takeProfit) || 0;
    
    if (entry === 0 || qty === 0) return null;

    const positionSize = entry * qty;
    
    let riskAmount = 0;
    let riskPercent = 0;
    let rewardAmount = 0;
    let rewardPercent = 0;
    
    if (sl > 0) {
      riskAmount = Math.abs(entry - sl) * qty;
      riskPercent = (Math.abs(entry - sl) / entry) * 100;
    }

    if (tp > 0) {
      rewardAmount = Math.abs(tp - entry) * qty;
      rewardPercent = (Math.abs(tp - entry) / entry) * 100;
    }

    const rr = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : 'N/A';

    return { positionSize, riskAmount, riskPercent, rewardAmount, rewardPercent, rr };
  }, [entryPrice, quantity, stopLoss, takeProfit]);


  // --- HANDLERS ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entry = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    let exit: number | undefined = undefined;
    let pnl: number | undefined = undefined;
    let outcome = Outcome.OPEN;

    if (!isOpen) {
      // Handle Close Logic
      if (!exitPrice) {
        alert("Exit Price is required for closed trades.");
        return;
      }
      exit = parseFloat(exitPrice);
      
      // Calculate PnL
      if (type === TradeType.LONG) {
        pnl = (exit - entry) * qty;
      } else {
        pnl = (entry - exit) * qty;
      }

      // Determine Outcome
      if (Math.abs(pnl) < 0.01) outcome = Outcome.BREAK_EVEN;
      else if (pnl > 0) outcome = Outcome.WIN;
      else outcome = Outcome.LOSS;
    }

    const tradeData: Trade = {
      id: initialData?.id || crypto.randomUUID(),
      date: new Date(date).toISOString(),
      exitDate: !isOpen ? new Date(exitDate).toISOString() : undefined,
      symbol: symbol.toUpperCase(),
      type,
      entryPrice: entry,
      exitPrice: exit,
      quantity: qty,
      stopLoss: parseFloat(stopLoss) || 0,
      takeProfit: parseFloat(takeProfit) || 0,
      pnl: pnl,
      outcome,
      setup,
      plan,
      notes,
      emotions: [], // Deprecated field, sending empty
      emotionsEntry,
      emotionsExit,
      learnings,
      mistakes,
      executionRating
    };

    onSave(tradeData);
  };

  const toggleEmotion = (emotion: Emotion, type: 'entry' | 'exit') => {
    if (type === 'entry') {
      setEmotionsEntry(prev => prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]);
    } else {
      setEmotionsExit(prev => prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]);
    }
  };

  const EmotionSelector = ({ selected, type }: { selected: Emotion[], type: 'entry' | 'exit' }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {Object.values(Emotion).map(emotion => (
        <button
          key={emotion}
          type="button"
          onClick={() => toggleEmotion(emotion, type)}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            selected.includes(emotion)
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
          }`}
        >
          {emotion}
        </button>
      ))}
    </div>
  );

  const isLimitExceeded = !initialData && dailyTradeLimit > 0 && dailyTradeCount >= dailyTradeLimit;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl border border-slate-700 shadow-2xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              {initialData ? <Edit className="w-5 h-5 text-blue-500" /> : <PlusCircle className="w-5 h-5 text-blue-500" />}
              {initialData ? 'Edit Trade Lifecycle' : 'Log Trade Lifecycle'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Plan, Execute, Manage, Analyze</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors p-2 hover:bg-slate-700 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Limit Warning */}
        {isLimitExceeded && (
          <div className="bg-red-500/10 border-b border-red-500/20 p-4 flex items-center gap-3">
             <ShieldAlert className="w-6 h-6 text-red-500" />
             <div>
                <h4 className="font-bold text-red-400 text-sm">Daily Trade Limit Reached</h4>
                <p className="text-xs text-red-300/80">
                   You have already taken {dailyTradeCount} trades today. Your limit is {dailyTradeLimit}. 
                   Discipline is about knowing when to stop.
                </p>
             </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* SECTION 1: PLANNING & ENTRY */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
               <Target className="w-5 h-5 text-purple-400" />
               <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm">1. Planning & Setup</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Symbol</label>
                  <input required type="text" value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white uppercase focus:border-blue-500 outline-none" placeholder="BTCUSD" />
               </div>
               <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                  <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                     <button type="button" onClick={() => setType(TradeType.LONG)} className={`flex-1 py-1 rounded text-xs font-bold ${type === TradeType.LONG ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Long</button>
                     <button type="button" onClick={() => setType(TradeType.SHORT)} className={`flex-1 py-1 rounded text-xs font-bold ${type === TradeType.SHORT ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Short</button>
                  </div>
               </div>
               <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Setup / Strategy</label>
                  <input type="text" value={setup} onChange={e => setSetup(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. Bull Flag, Support Bounce" />
               </div>
            </div>

            <div>
               <label className="block text-xs font-medium text-slate-400 mb-1">The Plan (Inside the Trade)</label>
               <textarea value={plan} onChange={e => setPlan(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none resize-none" placeholder="What is your hypothesis? Why are you taking this trade?" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Entry Price</label>
                  <input required type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Quantity</label>
                  <input required type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Stop Loss</label>
                  <input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Take Profit</label>
                  <input type="number" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none" />
               </div>
            </div>
            
            {/* Real-time Calculation Display */}
            {calculations && (
               <div className="flex flex-wrap gap-4 text-xs bg-slate-800/50 p-3 rounded border border-slate-700/50">
                  <div className="flex gap-1"><span className="text-slate-400">Pos Size:</span> <span className="text-white font-mono">{currency}{calculations.positionSize.toFixed(2)}</span></div>
                  {calculations.riskAmount > 0 && (
                     <div className="flex gap-1"><span className="text-slate-400">Risk:</span> <span className="text-red-400 font-mono">{currency}{calculations.riskAmount.toFixed(2)} ({calculations.riskPercent.toFixed(2)}%)</span></div>
                  )}
                  {calculations.rewardAmount > 0 && (
                     <div className="flex gap-1"><span className="text-slate-400">Reward:</span> <span className="text-emerald-400 font-mono">{currency}{calculations.rewardAmount.toFixed(2)} ({calculations.rewardPercent.toFixed(2)}%)</span></div>
                  )}
                  {calculations.rr !== 'N/A' && (
                      <div className="flex gap-1"><span className="text-slate-400">R:R</span> <span className="text-blue-400 font-bold font-mono">1:{calculations.rr}</span></div>
                  )}
               </div>
            )}
          </section>

          {/* SECTION 2: EXECUTION & MANAGEMENT */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
               <Activity className="w-5 h-5 text-blue-400" />
               <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm">2. Execution & Management</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Entry Date</label>
                        <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Emotions during Entry</label>
                        <EmotionSelector selected={emotionsEntry} type="entry" />
                    </div>
                </div>

                <div className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Trade Status</label>
                        <div className="flex bg-slate-800 rounded p-1 border border-slate-700 mb-4">
                            <button type="button" onClick={() => setIsOpen(true)} className={`flex-1 py-1.5 rounded text-xs font-bold ${isOpen ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Running</button>
                            <button type="button" onClick={() => setIsOpen(false)} className={`flex-1 py-1.5 rounded text-xs font-bold ${!isOpen ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>Closed</button>
                        </div>
                    </div>
                    
                    {!isOpen && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Exit Price</label>
                                    <input required type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Exit Date</label>
                                    <input type="datetime-local" value={exitDate} onChange={e => setExitDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Emotions during Exit</label>
                                <EmotionSelector selected={emotionsExit} type="exit" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </section>

          {/* SECTION 3: ANALYSIS & REVIEW */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
               <Brain className="w-5 h-5 text-emerald-400" />
               <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm">3. Post-Trade Analysis</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Mistakes</label>
                   <textarea value={mistakes} onChange={e => setMistakes(e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-red-500/50 outline-none resize-none" placeholder="Did you break rules? FOMO?" />
                </div>
                <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Learnings</label>
                   <textarea value={learnings} onChange={e => setLearnings(e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-emerald-500/50 outline-none resize-none" placeholder="What did you learn for next time?" />
                </div>
            </div>

            <div>
               <label className="block text-xs font-medium text-slate-400 mb-2">Execution Rating</label>
               <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star} 
                        type="button" 
                        onClick={() => setExecutionRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                          <Star 
                            className={`w-8 h-8 ${star <= executionRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} 
                          />
                      </button>
                  ))}
               </div>
               <p className="text-xs text-slate-500 mt-1">Rate how well you followed your plan, not the P&L outcome.</p>
            </div>
            
            <div>
               <label className="block text-xs font-medium text-slate-400 mb-1">General Notes</label>
               <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none resize-none" />
            </div>
          </section>

          <div className="flex justify-end pt-6 border-t border-slate-700 sticky bottom-0 bg-slate-900 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-400 hover:text-slate-100 transition-colors mr-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Update Trade' : 'Save Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
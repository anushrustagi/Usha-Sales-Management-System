
import React, { useState, useEffect, useRef } from 'react';
import { AppData, PlannedTask } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, GenerateContentResponse, Type } from "@google/genai";
import { 
  Bot, BrainCircuit, Sparkles, Activity, ShieldAlert, Zap, 
  Lightbulb, CheckCircle2, AlertTriangle, ArrowRight, Loader2,
  Terminal, MessageSquare, Send, RefreshCcw, Power, Plus, Mic, MicOff, Volume2,
  Wifi, WifiOff, Lock
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
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Live API State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [volume, setVolume] = useState(0);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Audio Output Refs
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
        window.removeEventListener('online', handleStatus);
        window.removeEventListener('offline', handleStatus);
        stopLiveSession();
    };
  }, []);

  // --- Live API & Context Logic ---

  const getContextSummary = () => {
    const now = new Date();
    const last30Days = new Date(now.setDate(now.getDate() - 30));
    
    // Financials
    const recentSales = data.invoices.filter(i => i.type === 'SALE' && new Date(i.date) >= last30Days);
    const totalRevenue = recentSales.reduce((acc, i) => acc + i.grandTotal, 0);
    const unpaidInvoices = data.invoices.filter(i => i.type === 'SALE' && i.amountPaid < i.grandTotal).length;
    
    // Inventory
    const lowStockItems = data.products.filter(p => p.stock <= p.minStockAlert);
    const lowStockList = lowStockItems.slice(0, 5).map(p => `${p.name} (${p.stock})`).join(', ');
    
    // Debtors
    const topDebtors = data.customers
        .filter(c => c.outstandingBalance > 0)
        .sort((a,b) => b.outstandingBalance - a.outstandingBalance)
        .slice(0,3)
        .map(c => `${c.name}: ₹${c.outstandingBalance.toLocaleString()}`);

    return `
      BUSINESS SNAPSHOT (${new Date().toLocaleDateString()}):
      - Company Name: ${data.companyProfile.name}
      - 30-Day Revenue: ₹${totalRevenue.toLocaleString()}
      - Total Active Products: ${data.products.length}
      - Critical Low Stock (${lowStockItems.length} items): ${lowStockList || 'None'}
      - Top 3 Debtors: ${topDebtors.join(', ') || 'None'}
      - Unpaid Sales Invoices: ${unpaidInvoices}
      - Active Projects: ${data.projects.filter(p => p.status === 'ACTIVE').length}
    `;
  };

  const startLiveSession = async () => {
    if (!isOnline) {
      setChatResponse("Cannot connect: System Offline.");
      return;
    }
    const apiKey = data.companyProfile.apiKey || process.env.API_KEY;
    if (!apiKey) {
      setChatResponse("Configuration Error: API Key missing in Settings.");
      return;
    }

    try {
      setIsLiveActive(true);
      const ai = new GoogleGenAI({ apiKey });
      
      const contextSummary = getContextSummary();
      const systemInstruction = `You are the AI Business Manager for ${data.companyProfile.name}. 
      You have direct access to the live ledger.
      
      ${contextSummary}
      
      Your Role:
      1. Answer specific questions about sales, stock, and debts using the data provided.
      2. Be professional, concise, and strategic.
      3. If asked about something not in the summary, ask for clarification.
      
      Speak naturally.`;

      // Audio Setup
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      nextStartTimeRef.current = audioCtx.currentTime;

      // Input Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      processorRef.current = processor;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: () => {
            console.log("Live Session Connected");
            setChatResponse("Voice Link Active. Listening...");
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for UI visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(rms);

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const audioCtx = audioContextRef.current;
              if (audioCtx) {
                // Ensure seamless playback by scheduling next chunk
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
                
                const buffer = await decodeAudioData(decode(audioData), audioCtx);
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                sourcesRef.current.add(source);
                
                nextStartTimeRef.current += buffer.duration;
              }
            }
            
            if (msg.serverContent?.interrupted) {
               sourcesRef.current.forEach(s => { s.stop(); });
               sourcesRef.current.clear();
               if(audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
            }
          },
          onclose: () => {
            console.log("Live Session Closed");
            setIsLiveActive(false);
          },
          onerror: (err) => {
            console.error("Live Error", err);
            setChatResponse("Voice Link Error. Reconnecting...");
            setIsLiveActive(false);
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Failed to start live session", e);
      setIsLiveActive(false);
      setChatResponse("Microphone Access Denied or Connection Failed.");
    }
  };

  const stopLiveSession = () => {
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => s.close());
      sessionRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    setIsLiveActive(false);
    setVolume(0);
    setChatResponse("Voice Link Terminated.");
  };

  // Helper functions for Audio
  function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext) {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }

  // --- End Live API Implementation ---

  // --- LOCAL SCAN IMPLEMENTATION (Deterministic, No AI) ---
  const runFullScan = async () => {
    setLoading(true);
    setError(null);
    
    // Simulate computational delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      // 1. Logic for Health Score
      let score = 100;
      const lowStockCount = data.products.filter(p => p.stock <= p.minStockAlert).length;
      const totalReceivables = data.customers.reduce((acc, c) => acc + c.outstandingBalance, 0);
      
      const currentMonth = new Date().getMonth();
      const monthlyRevenue = data.invoices
        .filter(i => i.type === 'SALE' && new Date(i.date).getMonth() === currentMonth)
        .reduce((acc, i) => acc + i.grandTotal, 0);
      const monthlyExpense = data.transactions
        .filter(t => t.type === 'DEBIT' && new Date(t.date).getMonth() === currentMonth)
        .reduce((acc, t) => acc + t.amount, 0);

      // Algorithmic Deductions
      if (lowStockCount > 0) score -= Math.min(20, lowStockCount * 5); 
      if (totalReceivables > monthlyRevenue * 0.5 && monthlyRevenue > 0) score -= 15;
      if (monthlyExpense > monthlyRevenue && monthlyRevenue > 0) score -= 20;
      
      score = Math.max(0, Math.min(100, score));

      // 2. Generate Alerts
      const alerts: any[] = [];
      if (lowStockCount > 0) {
        alerts.push({
          severity: 'HIGH',
          title: 'Inventory Shortage',
          message: `${lowStockCount} SKUs are below safety stock levels.`,
          action: 'Restock Now'
        });
      }
      if (totalReceivables > 0) {
        alerts.push({
          severity: totalReceivables > 50000 ? 'HIGH' : 'MEDIUM',
          title: 'Credit Exposure',
          message: `Total pending market collection: ₹${totalReceivables.toLocaleString()}.`,
          action: 'Payment Reminders'
        });
      }
      if (monthlyExpense > monthlyRevenue && monthlyRevenue > 0) {
         alerts.push({
          severity: 'MEDIUM',
          title: 'Cash Flow Warning',
          message: 'Monthly burn rate exceeds revenue generation.',
          action: 'Audit Expenses'
        });
      }

      // 3. Generate Insights
      const insights: any[] = [];
      const itemCounts: Record<string, number> = {};
      data.invoices.filter(i => i.type === 'SALE').forEach(inv => {
        inv.items.forEach(item => {
          itemCounts[item.productName] = (itemCounts[item.productName] || 0) + item.quantity;
        });
      });
      const topProduct = Object.entries(itemCounts).sort((a,b) => b[1] - a[1])[0];
      
      if (topProduct) {
        insights.push({
          title: 'Best Seller',
          observation: `"${topProduct[0]}" leads sales volume with ${topProduct[1]} units moving.`,
          suggestion: 'Prioritize Supply'
        });
      }

      insights.push({
        title: 'Vault Integrity',
        observation: `${data.invoices.length} Vouchers, ${data.transactions.length} Ledger Entries active.`,
        suggestion: 'Backup Recommended'
      });

      // 4. Generate Tasks
      const tasks: any[] = [];
      if (lowStockCount > 0) tasks.push({ title: 'Generate Purchase Orders', priority: 'HIGH' });
      if (totalReceivables > 0) tasks.push({ title: 'Follow-up with Debtors', priority: 'MEDIUM' });
      tasks.push({ title: 'Weekly Ledger Reconciliation', priority: 'LOW' });

      setAnalysis({
        healthScore: score,
        healthSummary: `Diagnostic Complete. System operating at ${score}% efficiency based on deterministic rule analysis.`,
        alerts,
        insights,
        tasks
      });

    } catch (e: any) {
      console.error("Local Scan Failed", e);
      setError("Diagnostic Algorithm Failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- Streaming Chat Implementation ---
  const handleSmartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !isOnline) return;
    const apiKey = data.companyProfile.apiKey || process.env.API_KEY;
    if (!apiKey) {
        setChatResponse("Error: API Key is missing. Configure in Settings.");
        return;
    }
    
    setChatLoading(true);
    setChatResponse(''); // Clear previous response
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const context = getContextSummary();
      
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: `Business Context: ${context}. User Query: ${query}. Answer briefly and professionally as the Business Brain.`,
      });

      for await (const chunk of responseStream) {
        const text = (chunk as GenerateContentResponse).text || '';
        setChatResponse(prev => prev + text);
      }
    } catch (e) {
        setChatResponse("Link to neural core unstable. Please check internet or API Key.");
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

  // Initial Scan on Mount
  useEffect(() => {
    if (!analysis && !loading) {
        const t = setTimeout(runFullScan, 500);
        return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700 min-h-screen">
      {/* Neural Core Header */}
      <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                 <div className={`p-3 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.5)] ${error ? 'bg-rose-600 animate-pulse' : 'bg-indigo-600'}`}>
                    {error ? <AlertTriangle size={32} className="text-white"/> : <Bot size={32} className="text-white"/>}
                 </div>
                 <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Master Brain</h1>
                    <div className="flex items-center gap-2 mt-2">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Central Intelligence Unit</p>
                       <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/50 rounded">Local Processing</span>
                    </div>
                 </div>
              </div>
              <p className="max-w-xl text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wide">
                 Autonomous rule-based engine analyzing ledger anomalies, stock velocities, and capital efficiency.
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

      {error && (
         <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-600 animate-in fade-in">
            <ShieldAlert size={24} />
            <div>
               <h4 className="font-black text-sm uppercase tracking-widest">Diagnostic Failure</h4>
               <p className="text-xs font-bold opacity-80">{error}</p>
            </div>
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
                    <div className="flex gap-1 items-center">
                       {isLiveActive && (
                          <div className="flex gap-1 items-end h-4">
                             {[...Array(3)].map((_, i) => (
                                <div key={i} className="w-1 bg-emerald-500 animate-pulse" style={{ height: `${Math.max(4, volume * 100 * (i+1))}px`, animationDuration: '0.2s' }}></div>
                             ))}
                          </div>
                       )}
                       {!isLiveActive && <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>}
                    </div>
                 </div>
                 
                 <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                          <Bot size={16} className="text-white"/>
                       </div>
                       <div className="p-4 bg-white/10 rounded-2xl rounded-tl-none border border-white/5">
                          <p className="text-xs font-bold text-slate-300 leading-relaxed">
                             Neural core online. I have live access to your sales, inventory, and customer ledgers.
                          </p>
                       </div>
                    </div>

                    {chatResponse && (
                       <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isLiveActive ? 'bg-emerald-600 animate-pulse' : 'bg-indigo-600'}`}>
                             {isLiveActive ? <Volume2 size={16} className="text-white"/> : <Bot size={16} className="text-white"/>}
                          </div>
                          <div className={`p-4 rounded-2xl rounded-tl-none border ${isLiveActive ? 'bg-emerald-900/30 border-emerald-500/30' : 'bg-white/10 border-white/5'}`}>
                             <p className={`text-xs font-bold leading-relaxed whitespace-pre-line ${isLiveActive ? 'text-emerald-200' : 'text-slate-300'}`}>
                                {chatResponse}
                             </p>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="p-4 bg-white/5 border-t border-white/5 space-y-4">
                    {!isLiveActive ? (
                       <form onSubmit={handleSmartChat} className="relative flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 bg-slate-950 border border-white/10 rounded-2xl pl-5 pr-4 py-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 uppercase"
                            placeholder="Query the database..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            disabled={chatLoading}
                          />
                          <button 
                            type="submit" 
                            disabled={chatLoading || !query}
                            className="p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50"
                          >
                             {chatLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                          </button>
                          <button
                            type="button"
                            onClick={startLiveSession}
                            className="p-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all"
                            title="Start Voice Session"
                          >
                             <Mic size={16} />
                          </button>
                       </form>
                    ) : (
                       <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4">
                          <div className="flex items-center gap-3">
                             <div className="relative">
                                <span className="absolute -inset-1 rounded-full bg-emerald-500 opacity-20 animate-ping"></span>
                                <Mic size={20} className="text-emerald-400 relative z-10" />
                             </div>
                             <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Voice Link Active</span>
                          </div>
                          <button onClick={stopLiveSession} className="px-4 py-2 bg-rose-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-rose-500 transition-all">
                             Terminate
                          </button>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Brain;

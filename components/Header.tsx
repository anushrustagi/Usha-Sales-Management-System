
import React, { useState, useEffect } from 'react';
import { Bell, Search, Settings as SettingsIcon, Calendar, Building2, Wifi, WifiOff, Maximize, Minimize, BrainCircuit, X, MessageSquare, Send, Sparkles, Loader2, Database, ShieldCheck, Command } from 'lucide-react';
import { ViewType, AppData } from '../types';
import { GoogleGenAI } from "@google/genai";

interface HeaderProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isSidebarOpen: boolean;
  businessName: string;
  data: AppData;
  onSearchClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, businessName, data, onSearchClick }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [data.invoices.length, data.transactions.length, data.products.length]);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || !isOnline) return;
    
    setIsAiLoading(true);
    setAiResponse('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const context = {
        business: businessName,
        topCustomers: data.customers.sort((a,b) => b.outstandingBalance - a.outstandingBalance).slice(0,5).map(c => ({ name: c.name, debt: c.outstandingBalance })),
        inventory: {
          total: data.products.length,
          lowStock: data.products.filter(p => p.stock <= p.minStockAlert).length,
          criticalItems: data.products.filter(p => p.stock <= p.minStockAlert).slice(0,5).map(p => p.name)
        },
        financials: {
          recentSales: data.invoices.filter(i => i.type === 'SALE').slice(-10).map(i => ({ date: i.date.split('T')[0], amt: i.grandTotal }))
        }
      };

      const systemInstruction = `You are the Strategic Intelligence Officer for ${businessName}. 
      You have full read access to the business ledger, inventory flows, and customer debt profiles. 
      Your goal is to provide concise, data-driven strategic advice.
      Prioritize: 1. Cash flow optimization. 2. Stock risk mitigation. 3. Debt recovery priority.
      Be professional, analytical, and brief. Limit response to 120 words.`;

      const userPrompt = `Context Data: ${JSON.stringify(context)}
      User Inquiry: ${aiQuery}`;

      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: [{ parts: [{ text: userPrompt }] }],
        config: { systemInstruction }
      });

      const text = response.text;
      if (text) {
        setAiResponse(text);
      } else {
        throw new Error("Empty intelligence response");
      }
    } catch (err: any) { 
      console.error("AI Strategic Fix Error:", err);
      setAiResponse(`Strategic Link Offline: ${err.message || 'Check connection or API key'}. Please retry shortly.`); 
    } finally { 
      setIsAiLoading(false); 
    }
  };

  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); };

  return (
    <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm sticky top-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 text-slate-400 pr-8 border-r border-slate-200">
          {data.companyProfile.logo ? (
            <img src={data.companyProfile.logo} alt="Mini Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">U</div>
          )}
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 leading-none mb-1">Corporate Ledger</span>
             <span className="text-xs font-black uppercase tracking-tight text-slate-800 truncate max-w-[150px]">{businessName}</span>
          </div>
        </div>
        
        <button 
          onClick={onSearchClick}
          className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 hover:bg-white hover:border-blue-200 hover:text-blue-500 transition-all group min-w-[300px]"
        >
          <Search size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold flex-1 text-left">Quick Search Command...</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase group-hover:border-blue-100 transition-all">
             <Command size={10} /> K
          </div>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden xl:flex items-center gap-3 px-4 py-2 bg-emerald-50/50 border border-emerald-100 rounded-2xl shadow-sm">
           <ShieldCheck size={16} className="text-emerald-500" />
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-emerald-600/50 uppercase tracking-widest leading-none mb-1">Vault Sync</span>
              <span className="text-[10px] font-black text-emerald-700 leading-none tabular-nums">{lastSaved}</span>
           </div>
        </div>

        <button onClick={() => setShowAiSearch(true)} className="flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 group active:scale-95">
          <BrainCircuit size={18} className="group-hover:animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] hidden md:block">AI Strategic Panel</span>
        </button>

        <div className="w-px h-8 bg-slate-100 mx-1 hidden md:block"></div>

        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${isOnline ? 'bg-white border-emerald-100 text-emerald-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
          <span className="text-[9px] font-black uppercase tracking-widest">{isOnline ? 'Live' : 'Offline'}</span>
        </div>

        <button onClick={toggleFullscreen} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
        <button onClick={() => setActiveView(ViewType.SETTINGS)} className={`p-2.5 rounded-xl transition-all ${activeView === ViewType.SETTINGS ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}><SettingsIcon className="w-5 h-5" /></button>
      </div>

      {showAiSearch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-white/20">
            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20"><Sparkles className="w-6 h-6" /></div>
                 <div><h3 className="font-black uppercase tracking-[0.2em] text-sm leading-none mb-1.5">Strategic Intelligence</h3><p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Cross-Ledger Semantic Analysis</p></div>
              </div>
              <button onClick={() => {setShowAiSearch(false); setAiQuery(''); setAiResponse('');}} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-6">
              <form onSubmit={handleAiSearch} className="flex gap-3">
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="e.g. 'Identify financial risks for this month'" 
                  className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner" 
                  value={aiQuery} 
                  onChange={e => setAiQuery(e.target.value)} 
                />
                <button disabled={isAiLoading} className="bg-blue-600 text-white px-6 rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center">
                  {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={22}/>}
                </button>
              </form>
              <div className={`p-8 rounded-3xl border-2 border-slate-100 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar ${aiResponse ? 'bg-white shadow-inner border-blue-50' : 'bg-slate-50/50 flex items-center justify-center'}`}>
                {aiResponse ? (
                  <div className="prose prose-sm font-medium text-slate-700 whitespace-pre-line leading-relaxed text-xs uppercase tracking-tight">
                    {aiResponse}
                  </div>
                ) : (
                  <div className="text-center text-slate-300 italic flex flex-col items-center gap-4">
                    <MessageSquare size={48} className="opacity-10" />
                    <p className="text-[10px] uppercase font-black tracking-[0.3em]">Awaiting Strategic Query</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Model Output Subject to Local Vault integrity</p></div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

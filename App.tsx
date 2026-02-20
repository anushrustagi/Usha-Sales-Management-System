
import React, { useState, useEffect, useCallback } from 'react';
import { ViewType, AppData } from './types';
import { loadData, saveData } from './db';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Invoicing from './components/Invoicing';
import CRM from './components/CRM';
import Accounting from './components/Accounting';
import Expenses from './components/Expenses';
import Settings from './components/Settings';
import Payments from './components/Payments';
import WalkinReports from './components/WalkinReports';
import Budgeting from './components/Budgeting';
import Planner from './components/Planner';
import Brain from './components/Brain';
import Forecasting from './components/Forecasting';
import Login from './components/Login';
import { Search, Command, X, ArrowRight, User, Package, Calculator } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [data, setData] = useState<AppData>(loadData());
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Cross-component connectivity state
  const [globalFilter, setGlobalFilter] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');

  // Desktop SQLite Initialization
  useEffect(() => {
    const initDesktopData = async () => {
      const bridge = (window as any).pywebview?.api;
      if (bridge) {
        try {
          const desktopData = await bridge.load_data();
          if (desktopData) {
            setData(desktopData);
          }
        } catch (e) {
          console.error("Desktop Load Error:", e);
        }
      }
      setIsInitialLoad(false);
    };

    if ((window as any).pywebview) {
        initDesktopData();
    } else {
        window.addEventListener('pywebviewready', initDesktopData);
    }

    return () => window.removeEventListener('pywebviewready', initDesktopData);
  }, []);

  // Hotkeys & Global Actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 'n') navigateTo(ViewType.SALES);
      if (e.altKey && e.key.toLowerCase() === 'd') navigateTo(ViewType.DASHBOARD);
      if (e.altKey && e.key.toLowerCase() === 'p') navigateTo(ViewType.PLANNER);
      if (e.altKey && e.key.toLowerCase() === 'b') navigateTo(ViewType.BRAIN);
      if (e.altKey && e.key.toLowerCase() === 'l') setIsAuthenticated(false);
      if (e.key === 'Escape') setShowCommandPalette(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateData = (newData: Partial<AppData>) => {
    const updated = { ...data, ...newData };
    setData(updated);
    saveData(updated);
  };

  const navigateTo = useCallback((view: ViewType, filter: string | null = null) => {
    setGlobalFilter(filter);
    setActiveView(view);
    setShowCommandPalette(false);
  }, []);

  if (isInitialLoad && (window as any).pywebview) {
      return (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 text-white">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-black uppercase tracking-widest text-[10px]">Initializing Local Vault...</p>
          </div>
      );
  }

  if (!isAuthenticated) {
    return <Login data={data} onLogin={() => setIsAuthenticated(true)} updateData={updateData} />;
  }

  const renderContent = () => {
    switch (activeView) {
      case ViewType.DASHBOARD:
        return <Dashboard data={data} setActiveView={navigateTo} updateData={updateData} />;
      case ViewType.INVENTORY:
        return <Inventory data={data} updateData={updateData} initialFilter={globalFilter} />;
      case ViewType.SALES:
        return <Invoicing data={data} updateData={updateData} type="SALE" />;
      case ViewType.PURCHASES:
        return <Invoicing data={data} updateData={updateData} type="PURCHASE" />;
      case ViewType.CRM:
        return <CRM data={data} updateData={updateData} initialFilter={globalFilter} />;
      case ViewType.PAYMENTS:
        return <Payments data={data} updateData={updateData} />;
      case ViewType.ACCOUNTING:
        return <Accounting data={data} initialFilter={globalFilter} />;
      case ViewType.EXPENSES:
        return <Expenses data={data} updateData={updateData} />;
      case ViewType.SETTINGS:
        return <Settings data={data} updateData={updateData} />;
      case ViewType.WALKIN_REPORTS:
        return <WalkinReports data={data} updateData={updateData} />;
      case ViewType.BUDGETING:
        return <Budgeting data={data} updateData={updateData} />;
      case ViewType.PLANNER:
        return <Planner data={data} updateData={updateData} />;
      case ViewType.BRAIN:
        return <Brain data={data} updateData={updateData} />;
      case ViewType.ANALYZER:
        return <Forecasting data={data} />;
      default:
        return <Dashboard data={data} setActiveView={navigateTo} updateData={updateData} />;
    }
  };

  const commandResults = cmdQuery.length > 1 ? {
    customers: data.customers.filter(c => c.name.toLowerCase().includes(cmdQuery.toLowerCase())).slice(0, 3),
    products: data.products.filter(p => p.name.toLowerCase().includes(cmdQuery.toLowerCase())).slice(0, 3)
  } : { customers: [], products: [] };

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden fixed inset-0 font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={(v) => navigateTo(v, null)} 
        isOpen={isSidebarOpen} 
        setIsOpen={setSidebarOpen} 
        companyName={data.companyProfile.name}
        logo={data.companyProfile.logo}
        logout={() => setIsAuthenticated(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          activeView={activeView} 
          setActiveView={(v) => navigateTo(v, null)} 
          isSidebarOpen={isSidebarOpen} 
          businessName={data.companyProfile.name}
          data={data}
          onSearchClick={() => setShowCommandPalette(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </main>

        {/* Smart Command Palette */}
        {showCommandPalette && (
          <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-20 px-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCommandPalette(false)}></div>
             <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 relative z-10 border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                   <Search className="text-slate-400" size={24} />
                   <input 
                     autoFocus
                     type="text" 
                     placeholder="Type to find anything (Customer, SKU, Action)..." 
                     className="flex-1 bg-transparent outline-none text-lg font-bold text-slate-700"
                     value={cmdQuery}
                     onChange={e => setCmdQuery(e.target.value)}
                   />
                   <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded text-[10px] font-black text-slate-400 uppercase">ESC</div>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto p-2">
                   {cmdQuery.length <= 1 ? (
                     <div className="p-4 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Navigation Shortcuts</p>
                        <div className="grid grid-cols-2 gap-2">
                           <CommandBtn icon={<Calculator size={18}/>} label="Create Sales Invoice" onClick={() => navigateTo(ViewType.SALES)} />
                           <CommandBtn icon={<Package size={18}/>} label="Inventory Health" onClick={() => navigateTo(ViewType.INVENTORY)} />
                           <CommandBtn icon={<User size={18}/>} label="Customer Directory" onClick={() => navigateTo(ViewType.CRM)} />
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-4 p-2">
                        {commandResults.customers.length > 0 && (
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Matching Customers</p>
                             {commandResults.customers.map(c => (
                               <button 
                                 key={c.id} 
                                 onClick={() => navigateTo(ViewType.CRM, c.name)}
                                 className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group"
                               >
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">{c.name.charAt(0)}</div>
                                    <div className="text-left">
                                       <p className="font-bold text-slate-800 uppercase text-sm">{c.name}</p>
                                       <p className="text-xs text-slate-400">Balance: ₹{c.outstandingBalance.toLocaleString()}</p>
                                    </div>
                                 </div>
                                 <ArrowRight size={18} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                               </button>
                             ))}
                          </div>
                        )}
                        {commandResults.products.length > 0 && (
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Matching Inventory</p>
                             {commandResults.products.map(p => (
                               <button 
                                 key={p.id} 
                                 onClick={() => navigateTo(ViewType.INVENTORY, p.name)}
                                 className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group"
                               >
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black"><Package size={20}/></div>
                                    <div className="text-left">
                                       <p className="font-bold text-slate-800 uppercase text-sm">{p.name}</p>
                                       <p className="text-xs text-slate-400">Stock: {p.stock} | HSN: {p.hsn}</p>
                                    </div>
                                 </div>
                                 <ArrowRight size={18} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                               </button>
                             ))}
                          </div>
                        )}
                        {commandResults.customers.length === 0 && commandResults.products.length === 0 && (
                          <div className="p-12 text-center text-slate-400 italic">No specific records found for "{cmdQuery}"</div>
                        )}
                     </div>
                   )}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   <span>Smart Vault Search Engine v2.0</span>
                   <div className="flex items-center gap-3">
                      <span>↑↓ to navigate</span>
                      <span>↵ to select</span>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CommandBtn = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all text-left group">
     <div className="p-2 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">{icon}</div>
     <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{label}</span>
  </button>
);

export default App;


import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Users, 
  BookOpen, 
  BrainCircuit, 
  ChevronLeft, 
  ChevronRight, 
  Wallet, 
  Store,
  Settings,
  HandCoins,
  Footprints,
  Lock,
  LogOut,
  PiggyBank,
  CalendarDays
} from 'lucide-react';
import { ViewType, AppData } from '../types';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  companyName: string;
  logo?: string;
  logout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen, companyName, logo, logout }) => {
  const menuItems = [
    { id: ViewType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewType.PLANNER, label: 'Task Planner', icon: CalendarDays },
    { id: ViewType.SALES, label: 'Sales', icon: ShoppingCart },
    { id: ViewType.PURCHASES, label: 'Purchases', icon: Store },
    { id: ViewType.INVENTORY, label: 'Inventory', icon: Package },
    { id: ViewType.CRM, label: 'CRM & Inquiries', icon: Users },
    { id: ViewType.BUDGETING, label: 'Budgeting', icon: PiggyBank },
    { id: ViewType.WALKIN_REPORTS, label: 'Visitor Analytics', icon: Footprints },
    { id: ViewType.EXPENSES, label: 'Expenses', icon: Wallet },
    { id: ViewType.PAYMENTS, label: 'Payments (Ledger)', icon: HandCoins },
    { id: ViewType.ACCOUNTING, label: 'Accounts (P&L)', icon: BookOpen },
    { id: ViewType.FORECASTING, label: 'AI Forecasting', icon: BrainCircuit },
  ];

  return (
    <div 
      className={`bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col ${
        isOpen ? 'w-64' : 'w-20'
      } relative border-r border-slate-800 z-20`}
    >
      <div className="p-6 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 overflow-hidden">
          {logo ? (
            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <TrendingUp className="text-white w-6 h-6" />
          )}
        </div>
        {isOpen && <span className="font-black text-white text-base tracking-tight truncate uppercase">{companyName}</span>}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${
              activeView === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className={`w-5 h-5 shrink-0 ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
            {isOpen && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-4 space-y-1">
        <button
          onClick={() => setActiveView(ViewType.SETTINGS)}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${
            activeView === ViewType.SETTINGS 
              ? 'bg-slate-700 text-white shadow-lg' 
              : 'hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Settings className={`w-5 h-5 shrink-0 ${activeView === ViewType.SETTINGS ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
          {isOpen && <span className="font-medium text-sm whitespace-nowrap">Settings</span>}
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 group"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isOpen && <span className="font-bold text-xs uppercase tracking-widest whitespace-nowrap">Lock System</span>}
        </button>
      </div>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 text-slate-600 z-50"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase overflow-hidden border border-slate-700 shadow-inner">
             {logo ? <img src={logo} className="w-full h-full object-cover" /> : companyName.charAt(0)}
          </div>
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">Administrator</span>
              <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                 <span className="text-[10px] text-slate-500 truncate uppercase font-black tracking-tighter">Vault Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

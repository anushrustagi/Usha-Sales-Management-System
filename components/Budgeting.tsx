
import React, { useState, useMemo } from 'react';
import { AppData, BudgetPeriod, BudgetGoal, Transaction, Invoice } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Area
} from 'recharts';
import { 
  Target, TrendingUp, IndianRupee, Plus, Trash2, 
  CheckCircle2, AlertCircle, Calculator, Wallet, CreditCard, 
  ArrowRight, Zap, X as CloseIcon, Activity,
  ArrowDownRight, BarChart3, Info, Bookmark, 
  Star, Flame, HelpCircle, ArrowUpRight, TrendingDown, ChevronDown, ListTree, Tags,
  Trophy, Sparkles, ShoppingBag, Package, Calendar, LayoutGrid, CalendarClock, History
} from 'lucide-react';

interface BudgetingProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const COLORS = {
  variable: '#ec4899', // Pink (Direct Costs)
  bills: '#eab308',    // Yellow (Utilities)
  debt: '#3b82f6',     // Blue (Repayments)
  investments: '#8b5cf6', // Purple (Growth)
  savings: '#10b981'    // Green (Reserves)
};

const PILLARS = [
  { id: 'Variable', label: 'Direct Costs', color: COLORS.variable, icon: <Flame size={16}/>, expenseKeys: ['Purchase', 'Transport'] },
  { id: 'Bills', label: 'Fixed & Payroll', color: COLORS.bills, icon: <Wallet size={16}/>, expenseKeys: ['Rent', 'Electricity', 'Maintenance', 'Salary'] },
  { id: 'Debt', label: 'Debt Service', color: COLORS.debt, icon: <CreditCard size={16}/>, expenseKeys: ['Debt', 'Interest'] },
  { id: 'Investments', label: 'Investments', color: COLORS.investments, icon: <Activity size={16}/>, expenseKeys: ['Marketing', 'Investment'] },
  { id: 'Savings', label: 'Liquid Reserve', color: COLORS.savings, icon: <Target size={16}/>, expenseKeys: ['Savings', 'Others'] },
];

const SUB_CATEGORIES_MAP: Record<string, string[]> = {
  'Variable': ['Product Sourcing', 'Logistics/Freight', 'Packaging', 'Direct Labor', 'Raw Materials'],
  'Bills': ['Shop Rent', 'Electricity', 'Telecom/Internet', 'Security', 'Staff Salaries', 'Cleaning'],
  'Debt': ['Bank Loan EMI', 'Credit Card Balances', 'Partner Interest', 'Private Lending'],
  'Investments': ['Marketing/Ads', 'Equipment Upgrade', 'R&D', 'Staff Training', 'Software Subscriptions'],
  'Savings': ['Emergency Reserve', 'Tax Provision', 'Bonus Pool', 'Expansion Fund']
};

const Budgeting: React.FC<BudgetingProps> = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'EVALUATIONS'>('ANALYSIS');
  const [activePeriod, setActivePeriod] = useState<BudgetPeriod>('MONTHLY');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ category: 'Variable', subCategory: '', amount: 0, essentialAmount: 0 });

  const stats = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    if (activePeriod === 'ANNUAL') startDate = new Date(now.getFullYear(), 0, 1);
    else if (activePeriod === 'QUARTERLY') startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    else if (activePeriod === 'MONTHLY') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (activePeriod === 'WEEKLY') startDate = new Date(now.setDate(now.getDate() - now.getDay()));
    else startDate = new Date(now.setHours(0,0,0,0));

    const periodInvoices = data.invoices.filter(i => new Date(i.date) >= startDate);
    const periodTransactions = data.transactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').filter(t => new Date(t.date) >= startDate);

    // Smart Actuals: Income from Sales
    const salesInvoices = periodInvoices.filter(i => i.type === 'SALE');
    const actualIncome = salesInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
    
    // Best Revenue Generating Products
    const productRevenueMap: Record<string, { name: string, total: number }> = {};
    salesInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!productRevenueMap[item.productId]) {
          productRevenueMap[item.productId] = { name: item.productName, total: 0 };
        }
        productRevenueMap[item.productId].total += item.amount;
      });
    });
    const topProducts = Object.values(productRevenueMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Total Expenses
    const actualExpenses = periodInvoices.filter(i => i.type === 'PURCHASE').reduce((acc, i) => acc + i.grandTotal, 0) +
                          periodTransactions.reduce((acc, t) => acc + t.amount, 0);

    const goals = data.budgetGoals.filter(g => g.period === activePeriod);
    
    const pillarStats = PILLARS.map(pillar => {
      const pillarGoals = goals.filter(g => g.category === pillar.id);
      const budgeted = pillarGoals.reduce((acc, g) => acc + g.amount, 0);
      const essential = pillarGoals.reduce((acc, g) => acc + g.essentialAmount, 0);
      
      const matchedTx = periodTransactions.filter(t => pillar.expenseKeys.includes(t.category));
      let actual = matchedTx.reduce((acc, t) => acc + t.amount, 0);
      
      if (pillar.id === 'Variable') {
        actual += periodInvoices.filter(i => i.type === 'PURCHASE').reduce((acc, i) => acc + i.grandTotal, 0);
      }

      return {
        ...pillar,
        budgeted,
        actual,
        essential,
        optional: budgeted - essential,
        progress: budgeted > 0 ? (actual / budgeted) * 100 : 0,
        pctOfIncome: actualIncome > 0 ? (actual / actualIncome) * 100 : 0,
        subGoals: pillarGoals
      };
    });

    const totalBudgeted = pillarStats.reduce((acc, s) => acc + s.budgeted, 0);
    const startingBalance = data.transactions.reduce((acc, t) => acc + (t.type === 'CREDIT' ? t.amount : -t.amount), 0);

    // Evaluations: Quarter by Quarter Data
    const currentYear = now.getFullYear();
    const quarterlyData = [0, 1, 2, 3].map(q => {
      const qStart = new Date(currentYear, q * 3, 1);
      const qEnd = new Date(currentYear, (q + 1) * 3, 0);
      const qInvoices = data.invoices.filter(i => new Date(i.date) >= qStart && new Date(i.date) <= qEnd);
      const qTransactions = data.transactions.filter(t => new Date(t.date) >= qStart && new Date(t.date) <= qEnd);
      
      const qIncome = qInvoices.filter(i => i.type === 'SALE').reduce((acc, i) => acc + i.grandTotal, 0);
      const qExpenses = qInvoices.filter(i => i.type === 'PURCHASE').reduce((acc, i) => acc + i.grandTotal, 0) +
                        qTransactions.filter(t => t.type === 'DEBIT' && t.category !== 'Purchase').reduce((acc, t) => acc + t.amount, 0);
      
      const qBudget = data.budgetGoals.filter(g => g.period === 'QUARTERLY').reduce((acc, g) => acc + g.amount, 0) || (totalBudgeted / 4);

      return {
        name: `Q${q + 1}`,
        income: qIncome,
        expense: qExpenses,
        budget: qBudget,
        efficiency: qBudget > 0 ? Math.round((qExpenses / qBudget) * 100) : 0,
        profit: qIncome - qExpenses
      };
    });

    // Yearly Comparison (Current vs Previous if available)
    const yearlyComparison = [
      { year: currentYear - 1, income: 0, expense: 0 },
      { year: currentYear, income: actualIncome, expense: actualExpenses }
    ];

    return { actualIncome, actualExpenses, totalBudgeted, pillarStats, startingBalance, topProducts, quarterlyData, yearlyComparison };
  }, [data, activePeriod]);

  const handleAddGoal = () => {
    if (!newGoal.category || !newGoal.subCategory || newGoal.amount <= 0) {
      alert("Validation: Pillar, Item Name and Amount are required.");
      return;
    }
    
    const existingIdx = data.budgetGoals.findIndex(g => 
      g.category === newGoal.category && 
      g.subCategory === newGoal.subCategory && 
      g.period === activePeriod
    );

    let updatedGoals = [...data.budgetGoals];
    const goal: BudgetGoal = {
      id: existingIdx > -1 ? updatedGoals[existingIdx].id : Math.random().toString(36).substr(2, 9),
      category: newGoal.category,
      subCategory: newGoal.subCategory,
      amount: newGoal.amount,
      essentialAmount: newGoal.essentialAmount,
      period: activePeriod
    };

    if (existingIdx > -1) updatedGoals[existingIdx] = goal;
    else updatedGoals.push(goal);

    updateData({ budgetGoals: updatedGoals });
    setNewGoal({ category: 'Variable', subCategory: '', amount: 0, essentialAmount: 0 });
    setShowAddGoal(false);
  };

  const handleDeleteGoal = (id: string) => {
    if(confirm("Permanently remove this budget allocation?")) {
      updateData({ budgetGoals: data.budgetGoals.filter(g => g.id !== id) });
    }
  };

  const netIncome = stats.actualIncome - stats.actualExpenses;
  const currentBalance = stats.startingBalance;
  const projectedRemaining = currentBalance + netIncome - (stats.totalBudgeted - stats.actualExpenses);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12 overflow-x-hidden">
      {/* Smart Analysis Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-4 gap-12 items-center">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">{new Date().toLocaleString('default', { month: 'long' })}</h1>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Operational Oversight Engine</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-10 xl:col-span-2 border-x border-white/10 px-10">
            <div>
               <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={14} className="text-slate-500" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Post-Budget Projection</p>
               </div>
               <p className="text-3xl font-black tabular-nums tracking-tighter">₹{projectedRemaining.toLocaleString()}</p>
            </div>
            <div>
               <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Liquid Bank Balance</p>
               </div>
               <p className="text-3xl font-black tabular-nums text-emerald-400 tracking-tighter">₹{currentBalance.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm self-end">
              {(['ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'DAILY'] as BudgetPeriod[]).map(p => (
                <button key={p} onClick={() => setActivePeriod(p)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activePeriod === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{p}</button>
              ))}
            </div>
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 self-end">
               <button onClick={() => setActiveTab('ANALYSIS')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ANALYSIS' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'}`}>Analysis</button>
               <button onClick={() => setActiveTab('EVALUATIONS')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'EVALUATIONS' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'}`}>Evaluations</button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><BarChart3 size={240}/></div>
      </div>

      {activeTab === 'ANALYSIS' ? (
        <>
          {/* Analytical Intelligence Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 group hover:border-blue-200 transition-all">
               <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                     <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-inner"><Trophy size={24} strokeWidth={3}/></div>
                     <div>
                        <h3 className="text-blue-600 text-[11px] font-black uppercase tracking-[0.3em]">Revenue Intelligence</h3>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Market Winners</p>
                     </div>
                  </div>
                  <Sparkles className="text-amber-400 animate-pulse" size={20} />
               </div>

               <div className="space-y-4">
                  {stats.topProducts.length > 0 ? stats.topProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group/item hover:bg-white hover:border-blue-100 transition-all shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xs font-black text-slate-400 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-sm border border-slate-100">
                             {idx + 1}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">{p.name}</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase">Yield Level {5 - idx}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-slate-900 tabular-nums">₹{p.total.toLocaleString()}</p>
                          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{Math.round((p.total / (stats.actualIncome || 1)) * 100)}% Contribution</p>
                       </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                       <ShoppingBag size={48} />
                       <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Sales Ingestion</p>
                    </div>
                  )}
               </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 h-fit">
               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 group hover:border-emerald-200 transition-all h-full">
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner"><ArrowUpRight size={24} strokeWidth={3}/></div>
                        <div>
                           <h3 className="text-emerald-600 text-[11px] font-black uppercase tracking-[0.3em]">Aggregate Revenue</h3>
                           <p className="text-4xl font-black text-slate-900 tracking-tighter">₹{stats.actualIncome.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-3">
                     <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: '82%' }}></div>
                     </div>
                     <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <span>Performance Target</span>
                        <span className="text-emerald-600">82% Realized</span>
                     </div>
               </div>
               </div>

               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 group hover:border-rose-200 transition-all h-full">
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-4">
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl shadow-inner"><ArrowDownRight size={24} strokeWidth={3}/></div>
                        <div>
                           <h3 className="text-rose-600 text-[11px] font-black uppercase tracking-[0.3em]">Total Expenditure</h3>
                           <p className="text-4xl font-black text-slate-900 tracking-tighter">₹{stats.actualExpenses.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-3">
                     <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-1000 ${stats.actualExpenses > stats.totalBudgeted ? 'bg-rose-500' : 'bg-blue-500'}`} 
                          style={{ width: `${Math.min(100, (stats.actualExpenses / (stats.totalBudgeted || 1)) * 100)}%` }}
                        ></div>
                     </div>
                     <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <span>Pillar Constraint</span>
                        <span className={stats.actualExpenses > stats.totalBudgeted ? 'text-rose-600' : 'text-blue-600'}>
                           {Math.round((stats.actualExpenses / (stats.totalBudgeted || 1)) * 100)}% Burned
                        </span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Strategic 5-Pillar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
            {stats.pillarStats.map(pillar => (
              <div key={pillar.id} className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:border-slate-300 hover:shadow-xl transition-all h-full">
                 <div className="p-8 pb-4 space-y-6">
                    <div className="flex justify-between items-start">
                       <div className={`p-4 rounded-2xl shadow-xl text-white`} style={{ backgroundColor: pillar.color }}>{pillar.icon}</div>
                       <div className="flex flex-col items-end">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Pillar Net</span>
                          <span className="text-sm font-black text-slate-900 tabular-nums">₹{pillar.actual.toLocaleString()}</span>
                       </div>
                    </div>
                    
                    <div>
                       <h4 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none mb-2">{pillar.label}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pillar.subGoals.length} Active Targets</p>
                    </div>
                    
                    {/* Progress Ring */}
                    <div className="relative w-full aspect-square flex items-center justify-center">
                       <svg className="w-full h-full transform -rotate-90">
                          <circle cx="50%" cy="50%" r="40%" stroke="#f8fafc" strokeWidth="12" fill="transparent" />
                          <circle 
                            cx="50%" cy="50%" r="40%" 
                            stroke={pillar.color} strokeWidth="12" fill="transparent" 
                            strokeDasharray="251.2" 
                            strokeDashoffset={251.2 - (251.2 * Math.min(100, pillar.progress)) / 100}
                            className="transition-all duration-1000"
                            strokeLinecap="round"
                          />
                       </svg>
                       <div className="absolute text-center">
                          <p className="text-2xl font-black text-slate-900 leading-none">{Math.round(pillar.progress)}%</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">Capacity</p>
                       </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-50">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">Pillar Goal</span>
                          <span className="text-slate-900 font-bold tabular-nums">₹{pillar.budgeted.toLocaleString()}</span>
                       </div>
                       <div className={`p-3 rounded-2xl flex justify-between items-center ${pillar.budgeted - pillar.actual >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          <span className="text-[9px] font-black uppercase">Variance</span>
                          <span className="text-xs font-black tabular-nums">{pillar.budgeted - pillar.actual >= 0 ? '+' : ''}₹{(pillar.budgeted - pillar.actual).toLocaleString()}</span>
                       </div>
                    </div>
                 </div>

                 {/* Line Item Breakdown */}
                 <div className="p-8 bg-slate-50 border-t border-slate-100 flex-1 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Line Allocation</p>
                       <ListTree size={12} className="text-slate-300" />
                    </div>
                    {pillar.subGoals.length > 0 ? (
                      <div className="space-y-3">
                        {pillar.subGoals.map(goal => (
                          <div key={goal.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group/item">
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-black text-slate-700 uppercase leading-tight max-w-[80%]">{goal.subCategory}</span>
                                <button onClick={() => handleDeleteGoal(goal.id)} className="p-1 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover/item:opacity-100"><Trash2 size={12}/></button>
                             </div>
                             <div className="flex justify-between items-end">
                                <span className="text-xs font-black text-slate-900">₹{goal.amount.toLocaleString()}</span>
                                {goal.essentialAmount > 0 && <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase"><Star size={8} className="fill-blue-600" /> ESS</div>}
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center opacity-30">
                         <Package size={32} className="mx-auto mb-2" />
                         <p className="text-[9px] font-black uppercase">No points defined</p>
                      </div>
                    )}
                 </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* EVALUATIONS VIEW */
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
           {/* Quarterly Breakdown Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {stats.quarterlyData.map((q, idx) => (
                <div key={idx} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6 group hover:border-blue-200 transition-all">
                   <div className="flex justify-between items-center">
                      <div className="p-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg">{q.name}</div>
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${q.efficiency > 100 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                         {q.efficiency}% Burn
                      </span>
                   </div>
                   
                   <div className="space-y-4">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Quarterly Income</p>
                         <p className="text-2xl font-black text-slate-900 tabular-nums">₹{q.income.toLocaleString()}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                         <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expenditure</p>
                            <p className="text-sm font-black text-rose-500 tabular-nums">₹{q.expense.toLocaleString()}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Allocated</p>
                            <p className="text-sm font-black text-slate-700 tabular-nums">₹{q.budget.toLocaleString()}</p>
                         </div>
                      </div>
                   </div>

                   <div className={`p-4 rounded-2xl flex items-center justify-between ${q.profit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      <span className="text-[10px] font-black uppercase">Net Margin</span>
                      <span className="text-sm font-black tabular-nums">{q.profit >= 0 ? '+' : ''}₹{q.profit.toLocaleString()}</span>
                   </div>
                </div>
              ))}
           </div>

           {/* Comparative Charts */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                 <div className="flex items-center justify-between mb-10">
                    <div>
                       <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Performance Benchmarking</h3>
                       <p className="text-xl font-black text-slate-900 uppercase">Quarter-by-Quarter Evaluations</p>
                    </div>
                    <CalendarClock size={24} className="text-blue-500" />
                 </div>
                 <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={stats.quarterlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 800}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}} />
                          <RechartsTooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="income" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} name="Revenue" />
                          <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={40} name="Burn" />
                          <Area type="monotone" dataKey="budget" fill="#e2e8f0" stroke="#94a3b8" fillOpacity={0.2} name="Budget Limit" />
                       </ComposedChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col relative overflow-hidden">
                 <div className="relative z-10 flex items-center gap-4 mb-10">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20"><History size={24}/></div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Year-on-Year</h3>
                 </div>
                 
                 <div className="space-y-12 relative z-10">
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggregate Revenue (YoY)</p>
                       <div className="flex items-end gap-10">
                          <div className="flex flex-col items-center gap-3">
                             <div className="w-12 bg-white/10 rounded-t-xl h-24 relative group">
                                <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"></div>
                             </div>
                             <span className="text-[9px] font-black text-slate-400">2023</span>
                          </div>
                          <div className="flex flex-col items-center gap-3">
                             <div className="w-12 bg-blue-500 rounded-t-xl h-40 shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
                             <span className="text-[9px] font-black text-white">2024</span>
                          </div>
                          <div className="pb-4">
                             <p className="text-emerald-400 font-black text-xl flex items-center gap-1"><ArrowUpRight size={20}/> 100%</p>
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Growth Curve</p>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                       <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={12}/> Analysis Insight</h4>
                       <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase italic">
                          "Revenue is trending upward, but expense efficiency in Q2 showed a 12% variance from target. Recommended: Re-evaluate Variable costs for Q4."
                       </p>
                    </div>
                 </div>
                 <BarChart3 size={200} className="absolute -bottom-20 -right-20 opacity-5 text-white pointer-events-none" />
              </div>
           </div>
        </div>
      )}

      <div className="flex justify-center pt-8">
         <button onClick={() => setShowAddGoal(true)} className="px-12 py-5 bg-slate-900 text-white text-[11px] font-black rounded-[2.5rem] uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl hover:scale-105 active:scale-95 transition-all">
            <Plus size={22} strokeWidth={3} /> Define Pillar Constraints
         </button>
      </div>

      {/* Smart Entry Modal with Sub-Categories */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in duration-300 border border-white/20">
              <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20"><Target size={28}/></div>
                    <div>
                       <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none mb-1.5">Commercial Entry</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Defined Pillar Point Allocation</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAddGoal(false)} className="p-4 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><CloseIcon size={24}/></button>
              </div>
              <div className="p-12 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
                 <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Target Commercial Pillar</label>
                    <div className="grid grid-cols-2 gap-3">
                       {PILLARS.map(p => (
                         <button key={p.id} onClick={() => setNewGoal({...newGoal, category: p.id, subCategory: ''})} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${newGoal.category === p.id ? 'border-blue-600 bg-blue-50 shadow-inner' : 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-100'}`}>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></div>
                            <span className="text-[10px] font-black uppercase text-slate-700 tracking-tighter">{p.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4 animate-in fade-in duration-500">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Precise Allocation Point</label>
                    <div className="grid grid-cols-1 gap-2">
                       <div className="relative group">
                          <input 
                            list="sub-cat-list"
                            className="w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all shadow-inner uppercase"
                            placeholder="Type or select specific point..."
                            value={newGoal.subCategory}
                            onChange={e => setNewGoal({...newGoal, subCategory: e.target.value})}
                          />
                          <datalist id="sub-cat-list">
                             {SUB_CATEGORIES_MAP[newGoal.category]?.map(sub => <option key={sub} value={sub} />)}
                          </datalist>
                          <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                       </div>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Common: {SUB_CATEGORIES_MAP[newGoal.category]?.join(', ')}</p>
                    </div>
                 </div>

                 <div className="space-y-8 pt-4 border-t border-slate-50">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Maximum Allocation (₹)</label>
                       <div className="relative">
                         <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-6 text-3xl font-black bg-slate-50 outline-none focus:border-blue-500 transition-all shadow-inner tabular-nums" placeholder="0.00" value={newGoal.amount || ''} onChange={e => setNewGoal({...newGoal, amount: Number(e.target.value)})} />
                         <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={28}/>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Essential Core Portion (₹)</label>
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Safety: ₹{(newGoal.amount - newGoal.essentialAmount).toLocaleString()}</span>
                       </div>
                       <input type="range" min="0" max={newGoal.amount} step="100" className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" value={newGoal.essentialAmount} onChange={e => setNewGoal({...newGoal, essentialAmount: Number(e.target.value)})} />
                       <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tabular-nums">
                          <span>₹0</span>
                          <span className="text-slate-900 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-200 font-bold shadow-sm">Commit: ₹{newGoal.essentialAmount.toLocaleString()}</span>
                          <span>₹{newGoal.amount.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>

                 <button onClick={handleAddGoal} className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] shadow-2xl shadow-blue-200 uppercase tracking-[0.3em] text-[11px] hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3">Authorize Master Posting <ArrowRight size={18}/></button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Budgeting;

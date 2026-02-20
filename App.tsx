import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { TradeList } from './components/TradeList';
import { TradeForm } from './components/TradeForm';
import { AICoach } from './components/AICoach';
import { Planner } from './components/Planner';
import { Diary } from './components/Diary';
import { Breadcrumbs } from './components/Breadcrumbs'; // Import Breadcrumbs
import { Trade, Task, CalendarEvent, Note } from './types';
import { LayoutDashboard, BookOpen, Brain, Plus, Wallet, Settings, ArrowUpCircle, ArrowDownCircle, Shield, Notebook, Palette, BellRing, CalendarDays, X, Download, Upload, FileSpreadsheet } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' },
  { code: 'JPY', symbol: '¥' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'BTC', symbol: '₿' },
  { code: 'ETH', symbol: 'Ξ' },
];

const THEMES = [
  { id: 'slate', name: 'Cosmic Slate', bgClass: 'bg-slate-900', headerClass: 'bg-slate-900/80 border-b border-slate-800', textMain: 'text-white', textMuted: 'text-slate-400' },
  { id: 'zinc', name: 'Void Black', bgClass: 'bg-zinc-950', headerClass: 'bg-zinc-950/80 border-b border-zinc-900', textMain: 'text-white', textMuted: 'text-zinc-400' },
  { id: 'neutral', name: 'Studio Grey', bgClass: 'bg-neutral-900', headerClass: 'bg-neutral-900/80 border-b border-neutral-800', textMain: 'text-white', textMuted: 'text-neutral-400' },
  { id: 'blue', name: 'Midnight', bgClass: 'bg-blue-950', headerClass: 'bg-blue-950/80 border-b border-blue-900', textMain: 'text-white', textMuted: 'text-blue-300' },
  { id: 'indigo', name: 'Deep Indigo', bgClass: 'bg-indigo-950', headerClass: 'bg-indigo-950/80 border-b border-indigo-900', textMain: 'text-white', textMuted: 'text-indigo-300' },
  { id: 'white', name: 'Polar White', bgClass: 'bg-slate-50', headerClass: 'bg-white/80 border-b border-slate-200', textMain: 'text-slate-900', textMuted: 'text-slate-500' },
];

const App: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]); // Notes State
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'planner' | 'coach' | 'diary'>('dashboard');
  
  // State for Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | undefined>(undefined);

  const [initialCapital, setInitialCapital] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('$');
  
  // New States for Features
  const [dailyTradeLimit, setDailyTradeLimit] = useState<number>(0); // 0 means no limit
  const [isFundsModalOpen, setIsFundsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  
  // Theme State
  const [themeId, setThemeId] = useState<string>('slate');

  // Notification State
  const [notification, setNotification] = useState<{ message: string, type: 'info' | 'alert' } | null>(null);

  // File Input Ref for Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradeMind_trades');
    if (savedTrades) {
      try {
        setTrades(JSON.parse(savedTrades));
      } catch (e) {
        console.error("Failed to parse trades", e);
      }
    }

    const savedTasks = localStorage.getItem('tradeMind_tasks');
    if (savedTasks) {
       try { setTasks(JSON.parse(savedTasks)); } catch (e) {}
    }

    const savedEvents = localStorage.getItem('tradeMind_events');
    if (savedEvents) {
       try { setEvents(JSON.parse(savedEvents)); } catch (e) {}
    }

    const savedNotes = localStorage.getItem('tradeMind_notes');
    if (savedNotes) {
       try { setNotes(JSON.parse(savedNotes)); } catch (e) {}
    }

    const savedCapital = localStorage.getItem('tradeMind_capital');
    if (savedCapital) {
      setInitialCapital(parseFloat(savedCapital));
    }

    const savedCurrency = localStorage.getItem('tradeMind_currency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
    
    const savedLimit = localStorage.getItem('tradeMind_dailyLimit');
    if (savedLimit) {
      setDailyTradeLimit(parseInt(savedLimit, 10));
    }

    const savedTheme = localStorage.getItem('tradeMind_theme');
    if (savedTheme) {
      setThemeId(savedTheme);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('tradeMind_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('tradeMind_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('tradeMind_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('tradeMind_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('tradeMind_capital', initialCapital.toString());
  }, [initialCapital]);

  useEffect(() => {
    localStorage.setItem('tradeMind_currency', currency);
  }, [currency]);
  
  useEffect(() => {
    localStorage.setItem('tradeMind_dailyLimit', dailyTradeLimit.toString());
  }, [dailyTradeLimit]);

  useEffect(() => {
    localStorage.setItem('tradeMind_theme', themeId);
  }, [themeId]);

  // --- REMINDER SYSTEM ---
  useEffect(() => {
    const checkReminders = () => {
        const now = new Date();
        const currentDate = now.toISOString().slice(0, 10);
        const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        // Check Tasks
        let updatedTasks = false;
        const newTasks = tasks.map(task => {
            if (!task.completed && !task.notified && task.date === currentDate && task.time === currentTime) {
                setNotification({ message: `Reminder: ${task.text}`, type: 'info' });
                updatedTasks = true;
                return { ...task, notified: true };
            }
            return task;
        });
        if (updatedTasks) setTasks(newTasks);

        // Check Events
        let updatedEvents = false;
        const newEvents = events.map(event => {
            if (!event.notified && event.date === currentDate && event.time === currentTime) {
                setNotification({ message: `Event Alert: ${event.title}`, type: 'alert' });
                updatedEvents = true;
                return { ...event, notified: true };
            }
            return event;
        });
        if (updatedEvents) setEvents(newEvents);
    };

    const interval = setInterval(checkReminders, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [tasks, events]);

  // Clear notification after 5 seconds
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  // Trade Handlers
  const handleSaveTrade = (trade: Trade) => {
    if (tradeToEdit) {
      // Update existing trade
      setTrades(prev => prev.map(t => t.id === trade.id ? trade : t));
    } else {
      // Add new trade
      setTrades(prev => [trade, ...prev]);
    }
    closeForm();
  };

  const handleDeleteTrade = (id: string) => {
    if (window.confirm("Are you sure you want to delete this trade?")) {
      setTrades(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleEditTrade = (trade: Trade) => {
    setTradeToEdit(trade);
    setIsFormOpen(true);
  };

  // Planner Handlers
  const handleAddTask = (task: Task) => setTasks(prev => [...prev, task]);
  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  const handleToggleTask = (id: string) => {
     setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };
  const handleDeleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));
  
  const handleAddEvent = (event: CalendarEvent) => setEvents(prev => [...prev, event]);
  const handleDeleteEvent = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));

  // Diary Handlers
  const handleSaveNote = (note: Note) => {
    setNotes(prev => {
        const exists = prev.find(n => n.id === note.id);
        if (exists) {
            return prev.map(n => n.id === note.id ? note : n);
        }
        return [note, ...prev];
    });
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // Funds Handlers
  const handleDeposit = () => {
    const amt = parseFloat(transactionAmount);
    if (amt > 0) {
      setInitialCapital(prev => prev + amt);
      setTransactionAmount('');
      setIsFundsModalOpen(false);
    }
  };

  const handleWithdraw = () => {
    const amt = parseFloat(transactionAmount);
    if (amt > 0) {
      setInitialCapital(prev => prev - amt);
      setTransactionAmount('');
      setIsFundsModalOpen(false);
    }
  };

  // DATA EXPORT/IMPORT Handlers
  const handleBackup = () => {
    const data = {
        trades,
        tasks,
        events,
        notes,
        settings: {
            initialCapital,
            currency,
            dailyTradeLimit,
            themeId
        },
        version: 1,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trademind_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setNotification({ message: 'Backup downloaded successfully', type: 'info' });
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target?.result as string);
            
            // Basic validation
            if (!Array.isArray(data.trades)) throw new Error("Invalid backup format");

            if (window.confirm("This will overwrite your current data with the backup. Are you sure?")) {
                setTrades(data.trades || []);
                setTasks(data.tasks || []);
                setEvents(data.events || []);
                setNotes(data.notes || []);
                
                if (data.settings) {
                    setInitialCapital(data.settings.initialCapital || 0);
                    setCurrency(data.settings.currency || '$');
                    setDailyTradeLimit(data.settings.dailyTradeLimit || 0);
                    setThemeId(data.settings.themeId || 'slate');
                }
                
                setNotification({ message: 'Data restored successfully', type: 'info' });
                setIsSettingsModalOpen(false);
            }
        } catch (error) {
            alert("Failed to restore data. Invalid file format.");
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCSV = () => {
    // CSV Header
    const headers = ["Date", "Symbol", "Type", "Outcome", "Entry Price", "Exit Price", "Quantity", "PnL", "Setup", "Mistakes", "Learnings", "Notes"];
    
    // Map trades to rows
    const rows = trades.map(t => [
        `"${new Date(t.date).toLocaleDateString()}"`,
        `"${t.symbol}"`,
        t.type,
        t.outcome,
        t.entryPrice,
        t.exitPrice || '',
        t.quantity,
        t.pnl || '',
        `"${(t.setup || '').replace(/"/g, '""')}"`, // Escape quotes
        `"${(t.mistakes || '').replace(/"/g, '""')}"`,
        `"${(t.learnings || '').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trademind_trades_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setNotification({ message: 'Excel (CSV) export downloaded', type: 'info' });
  };


  // Logic for Trade Limit
  const todayTradeCount = trades.filter(t => 
      new Date(t.date).toDateString() === new Date().toDateString()
  ).length;

  const handleLogTradeClick = () => {
    if (dailyTradeLimit > 0 && todayTradeCount >= dailyTradeLimit) {
        if(!window.confirm(`⚠️ DAILY LIMIT REACHED\n\nYou have already taken ${todayTradeCount} trades today. The limit is ${dailyTradeLimit}.\n\nDo you really want to break your rule?`)) {
            return;
        }
    }
    setTradeToEdit(undefined);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setTradeToEdit(undefined);
    setIsFormOpen(false);
  };

  const currentTheme = THEMES.find(t => t.id === themeId) || THEMES[0];

  return (
    <div className={`min-h-screen ${currentTheme.bgClass} font-sans selection:bg-purple-500/30 transition-colors duration-500`}>
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 h-16 ${currentTheme.headerClass} backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-40 transition-colors duration-500`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-white">TM</span>
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${currentTheme.textMain} hidden md:block`}>TradeMind</h1>
        </div>

        <nav className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 overflow-x-auto max-w-[calc(100vw-180px)] sm:max-w-none no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'journal' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Journal</span>
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'diary' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Notebook className="w-4 h-4" />
            <span className="hidden sm:inline">Diary</span>
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'planner' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Planner</span>
          </button>
          <button
            onClick={() => setActiveTab('coach')}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'coach' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {/* Limit Reached Indicator */}
          {dailyTradeLimit > 0 && todayTradeCount >= dailyTradeLimit && (
            <div className="hidden md:flex items-center gap-1 bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse">
                <Shield className="w-3 h-3" />
                <span>Limit Reached</span>
            </div>
          )}

          {/* Capital Widget */}
          <button 
             onClick={() => setIsFundsModalOpen(true)}
             className="hidden lg:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-slate-200">
              {initialCapital > 0 ? `${currency}${initialCapital.toLocaleString()}` : 'Funds'}
            </span>
          </button>

          {/* Settings Widget */}
          <button 
             onClick={() => setIsSettingsModalOpen(true)}
             className={`p-2 hover:bg-slate-800 rounded-lg transition-colors relative ${currentTheme.id === 'white' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-white'}`}
             title="Settings"
          >
            <Settings className="w-5 h-5" />
            {dailyTradeLimit > 0 && todayTradeCount >= dailyTradeLimit && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>

          <button
            onClick={handleLogTradeClick}
            className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg ${
                dailyTradeLimit > 0 && todayTradeCount >= dailyTradeLimit
                ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
            }`}
          >
            {dailyTradeLimit > 0 && todayTradeCount >= dailyTradeLimit ? <Shield className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">Log Trade</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        <Breadcrumbs activeTab={activeTab} />
        
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
             <div className="mb-8 flex justify-between items-end">
               <div>
                 <h2 className={`text-2xl font-bold mb-2 ${currentTheme.textMain}`}>Trading Performance</h2>
                 <p className={currentTheme.textMuted}>Track your progress and equity curve.</p>
               </div>
               {dailyTradeLimit > 0 && (
                 <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex flex-col items-end">
                    <span className="text-xs text-slate-400 uppercase font-bold">Daily Trades</span>
                    <span className={`text-lg font-mono font-bold ${todayTradeCount >= dailyTradeLimit ? 'text-red-400' : 'text-emerald-400'}`}>
                        {todayTradeCount} / {dailyTradeLimit}
                    </span>
                 </div>
               )}
             </div>
             <Dashboard trades={trades} initialCapital={initialCapital} currency={currency} />
             <div className="mt-8">
                <h3 className={`text-lg font-bold mb-4 ${currentTheme.textMain}`}>Recent Activity</h3>
                <TradeList 
                  trades={trades.slice(0, 5)} 
                  initialCapital={initialCapital}
                  currency={currency}
                  onEdit={handleEditTrade}
                  onDelete={handleDeleteTrade}
                />
             </div>
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="animate-in fade-in duration-500">
             <div className="mb-8 flex justify-between items-end">
               <div>
                 <h2 className={`text-2xl font-bold mb-2 ${currentTheme.textMain}`}>Trade Journal</h2>
                 <p className={currentTheme.textMuted}>Detailed history of all your executions.</p>
               </div>
             </div>
             <TradeList 
                trades={trades} 
                initialCapital={initialCapital}
                currency={currency} 
                onEdit={handleEditTrade}
                onDelete={handleDeleteTrade}
             />
          </div>
        )}

        {activeTab === 'diary' && (
           <div className="animate-in fade-in duration-500">
              <div className="mb-6">
                <h2 className={`text-2xl font-bold mb-2 ${currentTheme.textMain}`}>Trader's Diary</h2>
                <p className={currentTheme.textMuted}>Record your daily thoughts, psychological state, and market observations.</p>
              </div>
              <Diary 
                 notes={notes}
                 onSave={handleSaveNote}
                 onDelete={handleDeleteNote}
              />
           </div>
        )}

        {activeTab === 'planner' && (
          <div className="animate-in fade-in duration-500 h-[calc(100vh-140px)]">
             <div className="mb-6">
               <h2 className={`text-2xl font-bold mb-2 ${currentTheme.textMain}`}>Day Planner & Events</h2>
               <p className={currentTheme.textMuted}>Structure your trading day and stay ahead of market events.</p>
             </div>
             <Planner 
                tasks={tasks}
                events={events}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onAddEvent={handleAddEvent}
                onDeleteEvent={handleDeleteEvent}
             />
          </div>
        )}

        {activeTab === 'coach' && (
          <div className="animate-in fade-in duration-500 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            <div className="lg:col-span-2 h-full">
               <AICoach trades={trades} currency={currency} initialCapital={initialCapital} />
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 h-fit">
              <h3 className="font-bold text-white mb-4">Psychology Tips</h3>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <div className="min-w-[4px] h-full bg-blue-500 rounded-full"></div>
                  <p>Never move your stop loss further away from entry. Acceptance of risk is key.</p>
                </li>
                <li className="flex gap-3">
                  <div className="min-w-[4px] h-full bg-purple-500 rounded-full"></div>
                  <p>If you feel anxious, your position size is likely too big.</p>
                </li>
                <li className="flex gap-3">
                  <div className="min-w-[4px] h-full bg-emerald-500 rounded-full"></div>
                  <p>A winning trade with bad process is worse than a losing trade with good process.</p>
                </li>
              </ul>
              
              <div className="mt-8 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                 <h4 className="font-semibold text-slate-200 mb-2">Journal Stats</h4>
                 <div className="flex justify-between text-sm text-slate-400">
                    <span>Entries</span>
                    <span>{trades.length}</span>
                 </div>
                 <div className="flex justify-between text-sm text-slate-400 mt-1">
                    <span>Last Trade</span>
                    <span>{trades[0] ? new Date(trades[0].date).toLocaleDateString() : 'N/A'}</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Notification Toast */}
      {notification && (
          <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
              notification.type === 'alert' ? 'bg-red-900/90 border border-red-500/50 text-white' : 'bg-blue-600/90 border border-blue-400/50 text-white'
          }`}>
              <BellRing className="w-6 h-6 animate-pulse" />
              <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider">{notification.type === 'alert' ? 'Alert' : 'Reminder'}</h4>
                  <p className="text-sm font-medium">{notification.message}</p>
              </div>
          </div>
      )}

      {isFormOpen && (
        <TradeForm 
          initialData={tradeToEdit}
          onSave={handleSaveTrade} 
          onClose={closeForm}
          currency={currency}
          dailyTradeCount={todayTradeCount}
          dailyTradeLimit={dailyTradeLimit}
        />
      )}

      {/* Funds Modal */}
      {isFundsModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
             <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl p-6">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-500" /> Manage Funds
                    </h3>
                    <button onClick={() => setIsFundsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                 </div>
                 
                 <div className="bg-slate-800 p-4 rounded-lg mb-6 text-center">
                    <p className="text-xs text-slate-400 uppercase font-medium">Net Deposits</p>
                    <p className="text-2xl font-bold text-white mt-1">{currency}{initialCapital.toLocaleString()}</p>
                 </div>

                 <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Amount</label>
                        <input 
                            type="number" 
                            value={transactionAmount}
                            onChange={(e) => setTransactionAmount(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-lg font-medium"
                            placeholder="0.00"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleDeposit}
                            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                            <ArrowUpCircle className="w-5 h-5" /> Deposit
                        </button>
                        <button 
                            onClick={handleWithdraw}
                            className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                            <ArrowDownCircle className="w-5 h-5" /> Withdraw
                        </button>
                    </div>
                 </div>
             </div>
          </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
             <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-500" /> Settings
                    </h3>
                    <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                 </div>
                 
                 <div className="space-y-8">
                    {/* General Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase border-b border-slate-700 pb-2">General</h4>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium text-slate-300">Daily Trade Limit</label>
                                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">0 = Unlimited</span>
                            </div>
                            <input 
                                type="number" 
                                value={dailyTradeLimit}
                                onChange={(e) => setDailyTradeLimit(parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Set a hard limit on the number of trades you can take per day. We will warn you if you try to exceed this.
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 block">Account Currency</label>
                            <div className="grid grid-cols-4 gap-2">
                                {CURRENCIES.map(c => (
                                    <button
                                        key={c.code}
                                        onClick={() => setCurrency(c.symbol)}
                                        className={`p-2 rounded border text-sm font-medium ${
                                            currency === c.symbol 
                                            ? 'bg-blue-600 border-blue-600 text-white' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                    >
                                        {c.code}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Palette className="w-4 h-4 text-purple-400" /> Appearance
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {THEMES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setThemeId(t.id)}
                                        className={`p-2 rounded border text-sm font-medium flex items-center gap-2 ${
                                            themeId === t.id 
                                            ? 'bg-blue-600/20 border-blue-600 text-white' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border border-white/20 ${t.bgClass}`}></div>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Data Management */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase border-b border-slate-700 pb-2">Data Management</h4>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={handleBackup}
                                className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Download className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-slate-200">Backup Data</div>
                                        <div className="text-xs text-slate-500">Download a full JSON backup of your journal.</div>
                                    </div>
                                </div>
                            </button>

                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-slate-200">Restore Data</div>
                                        <div className="text-xs text-slate-500">Restore from a previously saved JSON file.</div>
                                    </div>
                                </div>
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleRestore} 
                                className="hidden" 
                                accept="application/json"
                            />

                            <button 
                                onClick={handleExportCSV}
                                className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                        <FileSpreadsheet className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-slate-200">Export to Excel</div>
                                        <div className="text-xs text-slate-500">Download trade history as a CSV file.</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsSettingsModalOpen(false)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                        Close Settings
                    </button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default App;
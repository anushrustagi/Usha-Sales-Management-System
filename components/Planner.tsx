
import React, { useState, useMemo } from 'react';
import { AppData, PlannedTask, PriorityLevel } from '../types';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, 
  Trash2, CheckCircle2, Clock, AlertCircle, X, 
  Star, GripVertical, Calendar as CalendarIcon, 
  CheckCircle, ListTodo, Activity, History, Trash
} from 'lucide-react';

interface PlannerProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const PRIORITY_THEMES: Record<PriorityLevel, { color: string; bg: string; border: string }> = {
  HIGH: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  MEDIUM: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
};

const Planner: React.FC<PlannerProps> = ({ data, updateData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<{title: string, description: string, priority: PriorityLevel, time: string}>({
    title: '', description: '', priority: 'MEDIUM', time: ''
  });

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Padding for previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ 
        date: new Date(year, month, -i), 
        isCurrentMonth: false 
      });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ 
        date: new Date(year, month, i), 
        isCurrentMonth: true 
      });
    }
    
    return days;
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, PlannedTask[]> = {};
    data.plannedTasks.forEach(task => {
      const dateKey = task.date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });
    // Sort tasks in each date by time then priority
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.priority] - order[b.priority];
      });
    });
    return map;
  }, [data.plannedTasks]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasksByDate[today] || [];
    const pending = data.plannedTasks.filter(t => t.status === 'PENDING').length;
    const completed = data.plannedTasks.filter(t => t.status === 'COMPLETED').length;
    return { todayCount: todayTasks.length, pending, completed };
  }, [data.plannedTasks, tasksByDate]);

  const handleAddTask = () => {
    if (!newTask.title || !selectedDate) return;

    const task: PlannedTask = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDate,
      time: newTask.time || undefined,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: 'PENDING'
    };

    updateData({ plannedTasks: [...data.plannedTasks, task] });
    setNewTask({ title: '', description: '', priority: 'MEDIUM', time: '' });
    setShowAddModal(false);
  };

  const toggleTaskStatus = (taskId: string) => {
    const updated = data.plannedTasks.map(t => 
      t.id === taskId ? { ...t, status: t.status === 'PENDING' ? 'COMPLETED' : 'PENDING' } as PlannedTask : t
    );
    updateData({ plannedTasks: updated });
  };

  const deleteTask = (taskId: string) => {
    if (confirm("Remove this planned activity?")) {
      updateData({ plannedTasks: data.plannedTasks.filter(t => t.id !== taskId) });
    }
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Strategic Planner Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-3">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20"><CalendarDays size={32} /></div>
                <div>
                   <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Operational Planner</h1>
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2">Strategic Day Execution Hub</p>
                </div>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-8 border-l border-white/10 pl-10">
             <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today's Agenda</p>
                <p className="text-2xl font-black tabular-nums">{stats.todayCount} Tasks</p>
             </div>
             <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Open Items</p>
                <p className="text-2xl font-black text-amber-400 tabular-nums">{stats.pending}</p>
             </div>
             <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Archived Finish</p>
                <p className="text-2xl font-black text-emerald-400 tabular-nums">{stats.completed}</p>
             </div>
          </div>

          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm items-center gap-4">
             <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"><ChevronLeft size={20}/></button>
             <span className="text-[11px] font-black uppercase tracking-widest px-4 border-x border-white/5">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
             </span>
             <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"><ChevronRight size={20}/></button>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transform rotate-12"><CalendarIcon size={300}/></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* Calendar Grid */}
        <div className="xl:col-span-3 bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden p-8">
           <div className="grid grid-cols-7 gap-px mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</div>
              ))}
           </div>
           <div className="grid grid-cols-7 gap-4">
              {calendarDays.map((dayObj, idx) => {
                const dateKey = dayObj.date.toISOString().split('T')[0];
                const dayTasks = tasksByDate[dateKey] || [];
                const isSelected = selectedDate === dateKey;
                const today = isToday(dayObj.date);

                return (
                  <div 
                    key={idx} 
                    onClick={() => { setSelectedDate(dateKey); setShowAddModal(true); }}
                    className={`min-h-[140px] p-4 rounded-3xl border-2 transition-all cursor-pointer relative group flex flex-col gap-2 ${
                      dayObj.isCurrentMonth 
                        ? isSelected 
                          ? 'border-blue-600 bg-blue-50/30' 
                          : 'border-slate-50 bg-white hover:border-slate-200'
                        : 'border-transparent opacity-20 pointer-events-none'
                    }`}
                  >
                     <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-black tabular-nums ${today ? 'w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg' : 'text-slate-400'}`}>
                           {dayObj.date.getDate()}
                        </span>
                        {dayTasks.length > 0 && (
                          <div className="flex -space-x-1.5">
                             {dayTasks.slice(0, 3).map((t, i) => (
                               <div key={i} className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${t.priority === 'HIGH' ? 'bg-rose-500' : t.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                             ))}
                          </div>
                        )}
                     </div>

                     <div className="flex-1 space-y-1.5 overflow-hidden">
                        {dayTasks.slice(0, 3).map(task => (
                           <div key={task.id} className={`px-2 py-1.5 rounded-lg text-[8px] font-bold uppercase truncate border ${task.status === 'COMPLETED' ? 'bg-slate-50 text-slate-300 border-slate-100 line-through' : `${PRIORITY_THEMES[task.priority].bg} ${PRIORITY_THEMES[task.priority].color} ${PRIORITY_THEMES[task.priority].border}`}`}>
                              {task.time && <span className="mr-1 opacity-60">[{task.time}]</span>}
                              {task.title}
                           </div>
                        ))}
                        {dayTasks.length > 3 && (
                           <p className="text-[8px] font-black text-slate-300 text-center uppercase tracking-widest mt-1">+{dayTasks.length - 3} More items</p>
                        )}
                     </div>

                     <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg transform group-hover:scale-110"><Plus size={14}/></div>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Task Detail / Feed Panel */}
        <div className="space-y-8">
           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 bg-slate-50/50 border-b flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200"><ListTodo size={20}/></div>
                    <div>
                       <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Action Items</h3>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending Planning Log</p>
                    </div>
                 </div>
              </div>

              <div className="p-6 space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar">
                 {data.plannedTasks.length > 0 ? (
                   [...data.plannedTasks].sort((a, b) => {
                     // Reverse date sort, but normal time sort within date
                     const dateCompare = b.date.localeCompare(a.date);
                     if (dateCompare !== 0) return dateCompare;
                     return (a.time || '').localeCompare(b.time || '');
                   }).map(task => {
                     const isLate = new Date(task.date) < new Date(new Date().setHours(0,0,0,0)) && task.status === 'PENDING';
                     return (
                        <div key={task.id} className={`p-5 rounded-[2rem] border transition-all group ${task.status === 'COMPLETED' ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}>
                           <div className="flex justify-between items-start mb-4">
                              <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : PRIORITY_THEMES[task.priority].bg + ' ' + PRIORITY_THEMES[task.priority].color + ' ' + PRIORITY_THEMES[task.priority].border}`}>
                                 {task.priority} Priority
                              </div>
                              <div className="flex gap-1">
                                 <button onClick={() => toggleTaskStatus(task.id)} className={`p-2 rounded-xl transition-all ${task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-300 hover:text-blue-600'}`}>
                                    {task.status === 'COMPLETED' ? <CheckCircle size={16}/> : <CheckCircle2 size={16}/>}
                                 </button>
                                 <button onClick={() => deleteTask(task.id)} className="p-2 bg-slate-50 text-slate-200 hover:text-rose-500 rounded-xl transition-all">
                                    <Trash size={16}/>
                                 </button>
                              </div>
                           </div>

                           <h4 className={`font-black text-slate-800 text-sm uppercase tracking-tight leading-tight mb-2 ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}`}>
                              {task.title}
                           </h4>
                           {task.description && <p className="text-[10px] text-slate-400 font-bold leading-relaxed line-clamp-2 uppercase tracking-tighter mb-4">{task.description}</p>}

                           <div className="flex flex-col gap-2 pt-4 border-t border-slate-50 mt-4">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                    <CalendarIcon size={12} className="text-slate-300" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isLate ? 'text-rose-600' : 'text-slate-400'}`}>
                                       {new Date(task.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                       {isLate && ' • Overdue'}
                                    </span>
                                 </div>
                                 {task.time && (
                                   <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
                                      <Clock size={10} />
                                      <span className="text-[9px] font-black tabular-nums">{formatTime(task.time)}</span>
                                   </div>
                                 )}
                              </div>
                              <div className="flex justify-end">
                                 <div className="p-1.5 bg-slate-100 rounded-lg"><Activity size={10} className="text-slate-400" /></div>
                              </div>
                           </div>
                        </div>
                     );
                   })
                 ) : (
                   <div className="py-20 text-center opacity-30 flex flex-col items-center gap-6">
                      <ListTodo size={64} strokeWidth={1}/>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">No planning entries</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[4rem] w-full max-w-lg shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in duration-300 border border-white/20">
              <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-6">
                    <div className="p-4 bg-blue-600 text-white rounded-[1.8rem] shadow-2xl shadow-blue-500/20"><Plus size={28}/></div>
                    <div>
                       <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none mb-1.5">Register Action</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(selectedDate || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                       </p>
                    </div>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-4 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={32}/></button>
              </div>
              
              <div className="p-12 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Activity Title *</label>
                    <input autoFocus className="w-full border-2 border-slate-50 rounded-3xl p-6 text-base font-bold bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" placeholder="What needs to be done?" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Execution Time</label>
                       <div className="relative">
                          <input type="time" className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" value={newTask.time} onChange={e => setNewTask({...newTask, time: e.target.value})} />
                          <Clock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Impact Priority</label>
                       <select className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner appearance-none" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                          <option value="HIGH">High Priority</option>
                          <option value="MEDIUM">Medium Priority</option>
                          <option value="LOW">Low Priority</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Detail Breakdown</label>
                    <textarea rows={3} className="w-full border-2 border-slate-50 rounded-3xl p-6 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner uppercase tracking-tight" placeholder="Additional logistics context..." value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                 </div>

                 <button onClick={handleAddTask} className="w-full py-6 bg-blue-600 text-white font-black rounded-[2.2rem] shadow-2xl shadow-blue-200 uppercase tracking-[0.3em] text-[11px] hover:bg-blue-700 active:scale-95 transition-all">Authorize Plan Entry</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Planner;


import React, { useState, useMemo, useEffect } from 'react';
import { AppData, PlannedTask, PriorityLevel, DailyNote } from '../types';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, 
  Trash2, Check, Clock, AlertCircle, X, 
  ListTodo, Activity, Zap, CheckCircle2,
  BookOpen, Edit3
} from 'lucide-react';

interface PlannerProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const PRIORITY_THEMES: Record<PriorityLevel, { color: string; bg: string; border: string; marker: string; shadow: string }> = {
  HIGH: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', marker: 'bg-rose-600', shadow: 'shadow-rose-100' },
  MEDIUM: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', marker: 'bg-amber-500', shadow: 'shadow-amber-100' },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', marker: 'bg-blue-500', shadow: 'shadow-blue-100' }
};

const Planner: React.FC<PlannerProps> = ({ data, updateData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'TASKS' | 'DIARY'>('TASKS');
  
  const [newTask, setNewTask] = useState<{title: string, description: string, priority: PriorityLevel, time: string, projectId: string}>({
    title: '', description: '', priority: 'MEDIUM', time: '', projectId: ''
  });

  const [diaryContent, setDiaryContent] = useState('');

  // Sync diary content when date changes
  useEffect(() => {
    const note = data.dailyNotes.find(n => n.date === selectedDate);
    setDiaryContent(note ? note.content : '');
  }, [selectedDate, data.dailyNotes]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) { days.push({ date: new Date(year, month, -i), isCurrentMonth: false }); }
    for (let i = 1; i <= lastDay.getDate(); i++) { days.push({ date: new Date(year, month, i), isCurrentMonth: true }); }
    return days;
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, PlannedTask[]> = {};
    data.plannedTasks.forEach(task => {
      const dateKey = task.date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });
    return map;
  }, [data.plannedTasks]);

  const currentDayTasks = useMemo(() => {
    return (tasksByDate[selectedDate] || []).sort((a,b) => {
        if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
        if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
        return 0;
    });
  }, [tasksByDate, selectedDate]);

  const handleAddTask = () => {
    if (!newTask.title) return;
    const task: PlannedTask = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDate,
      time: newTask.time || undefined,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: 'PENDING',
      projectId: newTask.projectId || undefined
    };
    updateData({ plannedTasks: [...data.plannedTasks, task] });
    setNewTask({ title: '', description: '', priority: 'MEDIUM', time: '', projectId: '' });
    setShowAddModal(false);
  };

  const toggleTaskStatus = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = data.plannedTasks.map(t => 
      t.id === taskId ? { ...t, status: t.status === 'PENDING' ? 'COMPLETED' : 'PENDING' } as PlannedTask : t
    );
    updateData({ plannedTasks: updated });
  };

  const deleteTask = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Authorization Required: Permanently erase this planned task from the vault?")) {
      updateData({ plannedTasks: data.plannedTasks.filter(t => t.id !== taskId) });
    }
  };

  const handleSaveDiary = () => {
    let updatedNotes = [...data.dailyNotes];
    const existingIndex = updatedNotes.findIndex(n => n.date === selectedDate);
    
    if (diaryContent.trim() === '') {
        if (existingIndex > -1) updatedNotes.splice(existingIndex, 1);
    } else {
        if (existingIndex > -1) updatedNotes[existingIndex].content = diaryContent;
        else updatedNotes.push({ date: selectedDate, content: diaryContent });
    }
    
    updateData({ dailyNotes: updatedNotes });
  };

  const changeMonth = (offset: number) => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1)); };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-600 rounded-2xl shadow-xl"><CalendarDays size={32} /></div>
             <div><h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Strategy Hub</h1><p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2">Unified Performance Planner</p></div>
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm items-center gap-4">
             <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white/10 rounded-xl transition-all text-slate-400"><ChevronLeft size={20}/></button>
             <span className="text-[11px] font-black uppercase tracking-widest px-4 border-x border-white/5">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
             <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white/10 rounded-xl transition-all text-slate-400"><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
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
                const isSelected = dateKey === selectedDate;
                const hasNote = data.dailyNotes.some(n => n.date === dateKey);
                
                return (
                  <div key={idx} onClick={() => setSelectedDate(dateKey)} className={`min-h-[140px] p-4 rounded-3xl border-2 transition-all cursor-pointer relative group flex flex-col gap-2 ${dayObj.isCurrentMonth ? isSelected ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-50/50' : 'border-slate-50 bg-white hover:border-slate-200 hover:shadow-lg' : 'border-transparent opacity-20 pointer-events-none'}`}>
                     <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-black tabular-nums ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>{dayObj.date.getDate()}</span>
                        <div className="flex items-center gap-1">
                            {hasNote && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>}
                            {dayTasks.length > 0 && <div className="flex -space-x-1.5">{dayTasks.slice(0, 3).map((t, i) => <div key={i} className={`w-2.5 h-2.5 rounded-full ring-2 ring-white ${PRIORITY_THEMES[t.priority].marker}`}></div>)}</div>}
                        </div>
                     </div>
                     <div className="flex-1 space-y-1.5 overflow-hidden">
                        {dayTasks.slice(0, 3).map(task => (
                           <div key={task.id} className={`px-2 py-1.5 rounded-lg text-[8px] font-bold uppercase truncate border-l-4 group/task flex items-center gap-2 ${task.status === 'COMPLETED' ? 'bg-slate-50 text-slate-300 border-slate-200 opacity-60' : `${PRIORITY_THEMES[task.priority].bg} ${PRIORITY_THEMES[task.priority].color} ${PRIORITY_THEMES[task.priority].border}`}`}>
                              <div className={`w-2 h-2 rounded flex items-center justify-center border transition-all ${task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>{task.status === 'COMPLETED' && <Check size={5} className="text-white" strokeWidth={5} />}</div>
                              <span className={`truncate ${task.status === 'COMPLETED' ? 'line-through' : ''}`}>{task.title}</span>
                           </div>
                        ))}
                     </div>
                  </div>
                );
              })}
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[800px]">
              <div className="p-8 bg-slate-50/50 border-b space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Date</p>
                        <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter">{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"><Plus size={20}/></button>
                 </div>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setActiveRightTab('TASKS')} className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeRightTab === 'TASKS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><ListTodo size={14}/> Tasks</button>
                    <button onClick={() => setActiveRightTab('DIARY')} className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeRightTab === 'DIARY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><BookOpen size={14}/> Diary</button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                 {activeRightTab === 'TASKS' ? (
                    <div className="p-6 space-y-4">
                        {currentDayTasks.length > 0 ? currentDayTasks.map(task => (
                            <div key={task.id} className={`p-5 rounded-[2rem] border transition-all group ${task.status === 'COMPLETED' ? 'bg-slate-50 opacity-60' : 'bg-white shadow-sm hover:shadow-md'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border flex items-center gap-1.5 ${PRIORITY_THEMES[task.priority].bg} ${PRIORITY_THEMES[task.priority].color} ${PRIORITY_THEMES[task.priority].border}`}><Zap size={8} fill="currentColor"/> {task.priority}</div>
                                    <button onClick={(e) => deleteTask(task.id, e)} className="p-1 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                                </div>
                                <h4 className={`font-black text-slate-800 text-xs uppercase tracking-tight mb-2 ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                                {task.time && <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mb-4"><Clock size={10}/> {task.time}</p>}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <span className="text-[8px] font-black text-slate-300 uppercase">Status</span>
                                    <button onClick={(e) => toggleTaskStatus(task.id, e)} className={`p-2 rounded-xl transition-all ${task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}><Check size={14} strokeWidth={4} /></button>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center opacity-30">
                                <ListTodo size={48} className="mx-auto mb-4"/>
                                <p className="text-[10px] font-black uppercase">No Objectives Set</p>
                            </div>
                        )}
                    </div>
                 ) : (
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex-1 bg-white border-2 border-indigo-50 rounded-[2rem] p-6 shadow-sm focus-within:border-indigo-200 transition-all flex flex-col">
                            <textarea 
                                className="w-full h-full resize-none outline-none text-sm font-medium text-slate-700 leading-relaxed placeholder:text-slate-300"
                                placeholder="Write your daily notes, observations, or future plans here..."
                                value={diaryContent}
                                onChange={e => setDiaryContent(e.target.value)}
                                onBlur={handleSaveDiary}
                            />
                            <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-4">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Auto-Saves on exit</span>
                                <Edit3 size={16} className="text-indigo-200" />
                            </div>
                        </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[600] flex items-center justify-center p-4">
           <div className="bg-white rounded-[4rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in border border-white/20">
              <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-6"><div className="p-4 bg-blue-600 text-white rounded-[1.8rem] shadow-xl"><Plus size={28}/></div><div><h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter">New Objective</h3><p className="text-[10px] text-slate-400 uppercase font-black">{selectedDate}</p></div></div>
                 <button onClick={() => setShowAddModal(false)} className="p-4 text-slate-400 hover:bg-white rounded-full transition-colors"><X size={32}/></button>
              </div>
              <div className="p-12 space-y-8">
                 <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Task Nomenclature</label><input autoFocus className="w-full border-2 border-slate-50 rounded-2xl p-5 font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner uppercase" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} /></div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Time Marker</label><input type="time" className="w-full border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 outline-none" value={newTask.time} onChange={e => setNewTask({...newTask, time: e.target.value})} /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Intensity</label><select className="w-full border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 outline-none" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as PriorityLevel})}><option value="HIGH">CRITICAL</option><option value="MEDIUM">STANDARD</option><option value="LOW">MINOR</option></select></div>
                 </div>
                 <button onClick={handleAddTask} className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-[0.2em] text-[11px] hover:bg-blue-700 active:scale-95 transition-all">Synchronize to Calendar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Planner;

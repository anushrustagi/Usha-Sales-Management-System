
import React, { useState, useMemo } from 'react';
import { AppData, PlannedTask, PriorityLevel, Project, ProjectStatus } from '../types';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, 
  Trash2, CheckCircle2, Clock, AlertCircle, X, 
  Star, GripVertical, Calendar as CalendarIcon, 
  CheckCircle, ListTodo, Activity, History, Trash,
  LayoutGrid, Briefcase, Timer, ArrowRight, Kanban,
  CheckSquare, BarChart3, Layers, Check
} from 'lucide-react';

interface PlannerProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const PRIORITY_THEMES: Record<PriorityLevel, { color: string; bg: string; border: string; marker: string }> = {
  HIGH: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', marker: 'bg-rose-600' },
  MEDIUM: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', marker: 'bg-amber-500' },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', marker: 'bg-blue-500' }
};

const PROJECT_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
];

const Planner: React.FC<PlannerProps> = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'PROJECTS'>('CALENDAR');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [newTask, setNewTask] = useState<{title: string, description: string, priority: PriorityLevel, time: string, projectId: string}>({
    title: '', description: '', priority: 'MEDIUM', time: '', projectId: ''
  });

  const [newProject, setNewProject] = useState<Omit<Project, 'id'>>({
    name: '', description: '', startDate: new Date().toISOString().split('T')[0], endDate: '', status: 'PLANNING', color: PROJECT_COLORS[0]
  });

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
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
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.priority] - order[b.priority];
      });
    });
    return map;
  }, [data.plannedTasks]);

  const handleAddTask = () => {
    if (!newTask.title || !selectedDate) return;
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

  const handleAddProject = () => {
    if (!newProject.name || !newProject.endDate) return;
    const project: Project = {
      ...newProject,
      id: Math.random().toString(36).substr(2, 9)
    };
    updateData({ projects: [...data.projects, project] });
    setNewProject({ name: '', description: '', startDate: new Date().toISOString().split('T')[0], endDate: '', status: 'PLANNING', color: PROJECT_COLORS[0] });
    setShowProjectModal(false);
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
    if (confirm("Permanently erase this planned task?")) {
      updateData({ plannedTasks: data.plannedTasks.filter(t => t.id !== taskId) });
    }
  };

  const deleteProject = (projectId: string) => {
    if (confirm("Remove this project and unlink all its child tasks?")) {
      const updatedTasks = data.plannedTasks.map(t => t.projectId === projectId ? { ...t, projectId: undefined } : t);
      updateData({ 
        projects: data.projects.filter(p => p.id !== projectId),
        plannedTasks: updatedTasks
      });
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

  const projectProgress = (projectId: string) => {
    const projectTasks = data.plannedTasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(t => t.status === 'COMPLETED').length;
    return Math.round((completed / projectTasks.length) * 100);
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
                   <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Strategy Planner</h1>
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2">Unified Execution Hub</p>
                </div>
             </div>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm">
             <button onClick={() => setActiveTab('CALENDAR')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CALENDAR' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Day Schedule</button>
             <button onClick={() => setActiveTab('PROJECTS')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PROJECTS' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Project Timelines</button>
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

      {activeTab === 'CALENDAR' ? (
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
                                 <div key={i} className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${PRIORITY_THEMES[t.priority].marker}`}></div>
                               ))}
                            </div>
                          )}
                       </div>

                       <div className="flex-1 space-y-1.5 overflow-hidden">
                          {dayTasks.slice(0, 3).map(task => (
                             <div 
                               key={task.id} 
                               className={`px-2 py-1.5 rounded-lg text-[8px] font-bold uppercase truncate border-l-4 group/task transition-all flex items-center justify-between ${
                                 task.status === 'COMPLETED' 
                                 ? 'bg-slate-50 text-slate-300 border-slate-200 line-through' 
                                 : `${PRIORITY_THEMES[task.priority].bg} ${PRIORITY_THEMES[task.priority].color} ${PRIORITY_THEMES[task.priority].border}`
                               }`}
                             >
                                <div className="flex items-center gap-1.5 truncate">
                                   <button 
                                      onClick={(e) => toggleTaskStatus(task.id, e)}
                                      className={`w-3 h-3 rounded flex items-center justify-center border transition-all ${task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300 hover:border-blue-500'}`}
                                   >
                                      {task.status === 'COMPLETED' && <Check size={8} className="text-white" strokeWidth={4} />}
                                   </button>
                                   <span className="truncate">{task.time && `[${task.time}] `}{task.title}</span>
                                </div>
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

          {/* Task Feed */}
          <div className="space-y-8">
             <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 bg-slate-50/50 border-b flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200"><ListTodo size={20}/></div>
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Feed</h3>
                   </div>
                </div>

                <div className="p-6 space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar">
                   {data.plannedTasks.length > 0 ? (
                     [...data.plannedTasks].sort((a, b) => b.date.localeCompare(a.date)).map(task => (
                        <div key={task.id} className={`p-5 rounded-[2rem] border transition-all group ${task.status === 'COMPLETED' ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl'}`}>
                           <div className="flex justify-between items-start mb-3">
                              <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${PRIORITY_THEMES[task.priority].bg} ${PRIORITY_THEMES[task.priority].color} ${PRIORITY_THEMES[task.priority].border}`}>
                                 {task.priority}
                              </div>
                              <button onClick={(e) => deleteTask(task.id, e)} className="p-1 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                           </div>
                           <h4 className={`font-black text-slate-800 text-xs uppercase tracking-tight mb-2 ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                           <div className="flex items-center justify-between mt-4">
                              <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(task.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              <button onClick={(e) => toggleTaskStatus(task.id, e)} className={`p-1.5 rounded-lg transition-all ${task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:text-blue-600'}`}><CheckCircle2 size={14}/></button>
                           </div>
                        </div>
                     ))
                   ) : (
                     <div className="py-20 text-center opacity-30"><ListTodo size={48} className="mx-auto mb-4"/><p className="text-[10px] font-black uppercase">No agenda</p></div>
                   )}
                </div>
             </div>
          </div>
        </div>
      ) : (
        /* PROJECTS VIEW remains unchanged */
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              <button 
                onClick={() => setShowProjectModal(true)}
                className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-10 flex flex-col items-center justify-center gap-6 hover:border-blue-200 hover:bg-blue-50/20 transition-all group min-h-[350px]"
              >
                 <div className="p-6 bg-slate-50 text-slate-300 rounded-[2.5rem] group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 transition-all shadow-inner">
                    <Briefcase size={48} strokeWidth={1.5} />
                 </div>
                 <div className="text-center">
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">Initiate Project</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Define new timeline & objectives</p>
                 </div>
              </button>

              {data.projects.map(project => {
                const progress = projectProgress(project.id);
                const taskCount = data.plannedTasks.filter(t => t.projectId === project.id).length;
                return (
                  <div key={project.id} className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all">
                     <div className="p-8 border-b border-slate-50 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                           <div className="p-3 rounded-2xl text-white shadow-xl" style={{ backgroundColor: project.color }}>
                              <Timer size={24} />
                           </div>
                           <div>
                              <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight truncate max-w-[180px]">{project.name}</h4>
                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">ID: {project.id.slice(0, 8)}</p>
                           </div>
                        </div>
                        <button onClick={() => deleteProject(project.id)} className="p-2 text-slate-200 hover:text-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                     </div>

                     <div className="p-8 flex-1 space-y-8">
                        <div className="space-y-4">
                           <div className="flex justify-between items-end">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Density</p>
                              <p className="text-xl font-black text-slate-900 tabular-nums">{progress}%</p>
                           </div>
                           <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                              <div className="h-full transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: project.color }}></div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Execution Range</p>
                              <div className="flex items-center gap-2 text-slate-800 font-bold text-[10px] uppercase">
                                 <span>{new Date(project.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                 <ArrowRight size={10} className="text-slate-300" />
                                 <span>{new Date(project.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border border-slate-100 bg-slate-50 text-slate-500`}>{project.status}</span>
                           </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="flex items-center gap-2">
                              <CheckSquare size={16} className="text-blue-500" />
                              <span className="text-[10px] font-black text-slate-600 uppercase">{taskCount} Linked Tasks</span>
                           </div>
                           <button onClick={() => { setSelectedDate(project.startDate); setNewTask({...newTask, projectId: project.id}); setShowAddModal(true); }} className="p-2 bg-white text-blue-600 rounded-xl shadow-sm hover:scale-110 transition-transform"><Plus size={16} strokeWidth={3} /></button>
                        </div>
                     </div>

                     <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                        <button className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors">Visual Timeline View</button>
                     </div>
                  </div>
                );
              })}
           </div>

           {data.projects.length === 0 && (
             <div className="py-40 text-center text-slate-200">
                <BarChart3 size={80} className="mx-auto mb-6 opacity-5" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em]">Project Repository Empty</p>
             </div>
           )}
        </div>
      )}

      {/* Task Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[4rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in border border-white/20">
              <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-6">
                    <div className="p-4 bg-blue-600 text-white rounded-[1.8rem] shadow-xl"><Plus size={28}/></div>
                    <div>
                       <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter">New Task</h3>
                       <p className="text-[10px] text-slate-400 uppercase font-black">{selectedDate}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-4 text-slate-400 hover:bg-white rounded-full transition-colors"><X size={32}/></button>
              </div>
              <div className="p-12 space-y-8">
                 <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Title</label><input autoFocus className="w-full border-2 border-slate-50 rounded-2xl p-5 font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} /></div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Time</label><input type="time" className="w-full border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 outline-none shadow-inner" value={newTask.time} onChange={e => setNewTask({...newTask, time: e.target.value})} /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Priority</label><select className="w-full border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 outline-none shadow-inner" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as PriorityLevel})}><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></div>
                 </div>
                 <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Link Project</label><select className="w-full border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 outline-none shadow-inner" value={newTask.projectId} onChange={e => setNewTask({...newTask, projectId: e.target.value})}><option value="">None</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                 <button onClick={handleAddTask} className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-[0.2em] text-[11px] hover:bg-blue-700 active:scale-95 transition-all">Add to Schedule</button>
              </div>
           </div>
        </div>
      )}

      {/* Project Creation Modal remains unchanged */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in border border-white/20">
              <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-6">
                    <div className="p-4 bg-slate-900 text-white rounded-[1.8rem] shadow-xl"><Briefcase size={28}/></div>
                    <div>
                       <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter">New Project</h3>
                       <p className="text-[10px] text-slate-400 uppercase font-black">Strategic Timeline Initialization</p>
                    </div>
                 </div>
                 <button onClick={() => setShowProjectModal(false)} className="p-4 text-slate-400 hover:bg-white rounded-full transition-colors"><X size={32}/></button>
              </div>
              <div className="p-12 space-y-8 max-h-[75vh] overflow-y-auto">
                 <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Project Name *</label><input autoFocus className="w-full border-2 border-slate-50 rounded-2xl p-5 font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" placeholder="e.g. Q4 Supply Chain Optimization" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} /></div>
                 
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Start Date</label><input type="date" className="w-full border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 outline-none shadow-inner" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})} /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">End Date *</label><input type="date" className="w-full border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 outline-none shadow-inner" value={newProject.endDate} onChange={e => setNewProject({...newProject, endDate: e.target.value})} /></div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Initial Status</label><select className="w-full border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 outline-none shadow-inner" value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value as ProjectStatus})}><option value="PLANNING">Planning</option><option value="ACTIVE">Active</option><option value="ON_HOLD">On Hold</option></select></div>
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Visual Marker</label>
                       <div className="flex gap-2">
                          {PROJECT_COLORS.map(c => (
                            <button key={c} onClick={() => setNewProject({...newProject, color: c})} className={`w-8 h-8 rounded-full border-4 transition-all ${newProject.color === c ? 'border-slate-300 scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Executive Description</label><textarea rows={3} className="w-full border-2 border-slate-50 rounded-2xl p-5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" placeholder="Objectives & high-level plan..." value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} /></div>

                 <button onClick={handleAddProject} className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-[0.2em] text-[11px] hover:bg-slate-800 active:scale-95 transition-all">Authorize Project Launch</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Planner;

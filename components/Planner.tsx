import React, { useState, useMemo } from 'react';
import { Task, CalendarEvent } from '../types';
import { Calendar as CalendarIcon, CheckSquare, Clock, Plus, Trash2, AlertCircle, ChevronLeft, ChevronRight, Bell, Edit2, Save, X } from 'lucide-react';

interface PlannerProps {
  tasks: Task[];
  events: CalendarEvent[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export const Planner: React.FC<PlannerProps> = ({ 
  tasks, events, onAddTask, onUpdateTask, onToggleTask, onDeleteTask, onAddEvent, onDeleteEvent 
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Task Input State
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');

  // Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingTime, setEditingTime] = useState('');

  // Event Input State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventImpact, setNewEventImpact] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  // Filtered Data
  const dailyTasks = useMemo(() => {
    return tasks
      .filter(t => t.date === selectedDate)
      .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
  }, [tasks, selectedDate]);

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events
      .filter(e => e.date >= today)
      .sort((a, b) => {
        if (a.date === b.date) {
            return (a.time || '00:00').localeCompare(b.time || '00:00');
        }
        return a.date.localeCompare(b.date);
      });
  }, [events]);

  // Handlers
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    onAddTask({
      id: crypto.randomUUID(),
      text: newTaskText,
      completed: false,
      date: selectedDate,
      time: newTaskTime || undefined,
      notified: false
    });
    setNewTaskText('');
    setNewTaskTime('');
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
    setEditingTime(task.time || '');
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingText('');
    setEditingTime('');
  };

  const saveEditing = () => {
    if (!editingTaskId || !editingText.trim()) return;
    
    // Find original to keep other props
    const original = tasks.find(t => t.id === editingTaskId);
    if (original) {
        onUpdateTask({
            ...original,
            text: editingText,
            time: editingTime || undefined,
            notified: editingTime !== original.time ? false : original.notified // Reset notification if time changed
        });
    }
    cancelEditing();
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) return;

    onAddEvent({
      id: crypto.randomUUID(),
      title: newEventTitle,
      date: newEventDate,
      time: newEventTime || undefined,
      impact: newEventImpact,
      notified: false
    });
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventTime('');
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* LEFT COLUMN: DAY PLANNER */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
           <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-slate-100">Day Planner</h3>
           </div>
           
           <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button onClick={() => changeDate(-1)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm text-slate-200 outline-none font-medium text-center w-32"
              />
              <button onClick={() => changeDate(1)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {dailyTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <p>No tasks for this day.</p>
              <p className="text-xs mt-1">Plan your trading routine.</p>
            </div>
          ) : (
            dailyTasks.map(task => {
                if (editingTaskId === task.id) {
                    return (
                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg border border-blue-500/50 bg-blue-900/10">
                            <input 
                                type="text" 
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
                                autoFocus
                                placeholder="Task description..."
                                onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                            />
                            <input 
                                type="time" 
                                value={editingTime}
                                onChange={(e) => setEditingTime(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none w-24"
                                onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                            />
                            <button onClick={saveEditing} className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors">
                                <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditing} className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                }

                return (
                  <div 
                    key={task.id} 
                    className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      task.completed 
                        ? 'bg-slate-800/50 border-slate-700 opacity-60' 
                        : 'bg-slate-700/30 border-slate-600'
                    }`}
                  >
                    <button 
                      onClick={() => onToggleTask(task.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        task.completed ? 'bg-blue-600 border-blue-600' : 'border-slate-500 hover:border-blue-400'
                      }`}
                    >
                      {task.completed && <CheckSquare className="w-3 h-3 text-white" />}
                    </button>
                    
                    <div className="flex-1">
                      <p className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.text}
                      </p>
                    </div>

                    {task.time && (
                      <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${task.notified ? 'bg-slate-800 text-slate-500' : 'bg-blue-900/20 text-blue-400'}`}>
                        <Clock className="w-3 h-3" />
                        {task.time}
                        {task.notified && <Bell className="w-3 h-3 ml-1" />}
                      </div>
                    )}

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => startEditing(task)}
                            className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                );
            })
          )}
        </div>

        {/* Add Task Form */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <form onSubmit={handleAddTask} className="flex gap-2">
            <div className="flex-1 space-y-2">
              <input 
                type="text" 
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a trading task (set time for reminder)..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
              <div className="flex items-center gap-2">
                 <div className="relative flex items-center flex-1">
                    <Clock className="w-4 h-4 text-slate-500 absolute left-3" />
                    <input 
                        type="time" 
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-300 outline-none w-full"
                    />
                 </div>
                 <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
                    disabled={!newTaskText.trim()}
                 >
                    <Plus className="w-4 h-4" />
                 </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: EVENTS & REMINDERS */}
      <div className="space-y-6">
        {/* Economic Calendar */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
           <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-slate-100">Market Events</h3>
           </div>

           <div className="max-h-[300px] overflow-y-auto p-2">
              {upcomingEvents.length === 0 ? (
                 <div className="text-center p-6 text-slate-500 text-sm">No upcoming events scheduled.</div>
              ) : (
                upcomingEvents.map(event => (
                  <div key={event.id} className="p-3 hover:bg-slate-700/30 rounded-lg border border-transparent hover:border-slate-700 transition-colors flex gap-3 group">
                     <div className="flex flex-col items-center justify-center w-12 bg-slate-900 rounded border border-slate-700 p-1 text-xs">
                        <span className="font-bold text-slate-300">{new Date(event.date).getDate()}</span>
                        <span className="text-slate-500 uppercase">{new Date(event.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                           <span className="text-sm font-medium text-slate-200">{event.title}</span>
                           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              event.impact === 'HIGH' ? 'bg-red-900/30 text-red-400 border-red-900/50' :
                              event.impact === 'MEDIUM' ? 'bg-orange-900/30 text-orange-400 border-orange-900/50' :
                              'bg-yellow-900/30 text-yellow-400 border-yellow-900/50'
                           }`}>
                              {event.impact}
                           </span>
                        </div>
                        {event.time && (
                           <div className={`text-xs mt-1 flex items-center gap-1 ${event.notified ? 'text-slate-500' : 'text-slate-400'}`}>
                              <Bell className={`w-3 h-3 ${event.notified ? 'text-slate-600' : 'text-slate-400'}`} /> {event.time}
                           </div>
                        )}
                     </div>
                     <button onClick={() => onDeleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                ))
              )}
           </div>

           {/* Add Event Form */}
           <div className="p-4 border-t border-slate-700 bg-slate-900/50">
             <form onSubmit={handleAddEvent} className="space-y-2">
               <input 
                  type="text" 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Event Title (e.g., FOMC Meeting)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
               />
               <div className="flex gap-2">
                  <input 
                     type="date"
                     required
                     value={newEventDate}
                     onChange={(e) => setNewEventDate(e.target.value)}
                     className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none flex-1"
                  />
                  <input 
                     type="time"
                     value={newEventTime}
                     onChange={(e) => setNewEventTime(e.target.value)}
                     className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none w-24"
                  />
                  <select 
                     value={newEventImpact}
                     onChange={(e) => setNewEventImpact(e.target.value as any)}
                     className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none"
                  >
                     <option value="HIGH">High Impact</option>
                     <option value="MEDIUM">Medium Impact</option>
                     <option value="LOW">Low Impact</option>
                  </select>
                  <button 
                     type="submit"
                     className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded-lg transition-colors"
                  >
                     <Plus className="w-4 h-4" />
                  </button>
               </div>
             </form>
           </div>
        </div>

        {/* Tip Card */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-xl border border-indigo-700/30">
           <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-indigo-300 shrink-0" />
              <div>
                 <h4 className="font-bold text-indigo-100 mb-1">Trader's Routine</h4>
                 <p className="text-sm text-indigo-200/80">
                    "Amateurs execute trades. Professionals execute routines."
                    <br/><br/>
                    Use the planner to script your day before the market opens. If an event is High Impact, consider reducing position size or stepping aside.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
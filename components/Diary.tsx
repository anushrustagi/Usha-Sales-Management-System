import React, { useState, useMemo, useEffect } from 'react';
import { Note } from '../types';
import { Plus, Search, Trash2, Save, FileText, Calendar, PenLine, ChevronRight } from 'lucide-react';

interface DiaryProps {
  notes: Note[];
  onSave: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const Diary: React.FC<DiaryProps> = ({ notes, onSave, onDelete }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [isDirty, setIsDirty] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Derived State
  const sortedNotes = useMemo(() => {
    return notes
      .filter(n => n.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || n.content.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes, debouncedSearchQuery]);

  // Load selected note into editor
  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find(n => n.id === selectedNoteId);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setDate(new Date(note.date).toISOString().slice(0, 16));
        setIsDirty(false);
      }
    } else {
        // Reset if no note selected (or creating new)
        setTitle('');
        setContent('');
        setDate(new Date().toISOString().slice(0, 16));
        setIsDirty(false);
    }
  }, [selectedNoteId, notes]);

  const handleCreateNew = () => {
    // If unsaved changes, maybe prompt? For now, we just auto-select new.
    const newId = crypto.randomUUID();
    const newNote: Note = {
      id: newId,
      title: 'New Entry',
      content: '',
      date: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    onSave(newNote);
    setSelectedNoteId(newId);
  };

  const handleSave = () => {
    if (!selectedNoteId) return;
    
    onSave({
      id: selectedNoteId,
      title: title || 'Untitled Note',
      content,
      date: new Date(date).toISOString(),
      lastModified: new Date().toISOString()
    });
    setIsDirty(false);
  };

  const handleDelete = () => {
    if (!selectedNoteId) return;
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDelete(selectedNoteId);
      setSelectedNoteId(null);
    }
  };

  // Auto-save styling helper
  const saveStatusColor = isDirty ? 'text-orange-400' : 'text-slate-500';

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 h-[calc(100vh-140px)] flex overflow-hidden shadow-2xl">
      {/* Sidebar List */}
      <div className="w-full md:w-80 bg-slate-900/50 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" /> My Diary
                </h3>
                <button 
                    onClick={handleCreateNew}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    title="New Entry"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input 
                    type="text" 
                    placeholder="Search notes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                />
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sortedNotes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                    {searchQuery ? 'No notes match your search.' : (
                        <>
                            No notes found.
                            <br/>Start writing your journey.
                        </>
                    )}
                </div>
            ) : (
                <div className="divide-y divide-slate-800">
                    {sortedNotes.map(note => (
                        <button
                            key={note.id}
                            onClick={() => setSelectedNoteId(note.id)}
                            className={`w-full text-left p-4 hover:bg-slate-800 transition-colors group ${
                                selectedNoteId === note.id ? 'bg-slate-800 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`font-semibold truncate pr-2 ${selectedNoteId === note.id ? 'text-blue-400' : 'text-slate-200'}`}>
                                    {note.title || 'Untitled'}
                                </h4>
                                {selectedNoteId === note.id && <ChevronRight className="w-4 h-4 text-blue-500" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(note.date).toLocaleDateString()}
                            </div>
                            <p className="text-xs text-slate-400 truncate opacity-70">
                                {note.content || 'No content...'}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col bg-slate-800">
        {selectedNoteId ? (
            <>
                {/* Editor Toolbar */}
                <div className="h-16 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800/80 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <input 
                            type="datetime-local" 
                            value={date}
                            onChange={(e) => { setDate(e.target.value); setIsDirty(true); }}
                            className="bg-transparent text-sm text-slate-400 focus:text-slate-200 outline-none border-b border-transparent focus:border-slate-600 transition-colors"
                        />
                        <span className={`text-xs italic transition-colors ${saveStatusColor}`}>
                            {isDirty ? 'Unsaved changes' : 'Saved'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDelete}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Note"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                isDirty 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Save className="w-4 h-4" />
                            Save
                        </button>
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                            placeholder="Note Title"
                            className="w-full bg-transparent text-3xl md:text-4xl font-bold text-slate-100 placeholder-slate-600 outline-none border-none"
                        />
                        <textarea 
                            value={content}
                            onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
                            placeholder="Write your thoughts, analysis, or daily review here..."
                            className="w-full h-[calc(100vh-350px)] bg-transparent text-lg text-slate-300 placeholder-slate-600 outline-none resize-none leading-relaxed"
                            spellCheck={false}
                        />
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                    <PenLine className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Select a Note</h3>
                <p className="max-w-xs text-center mb-6">Choose a note from the sidebar or create a new one to start writing your trading diary.</p>
                <button 
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-5 h-5" /> Create New Note
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
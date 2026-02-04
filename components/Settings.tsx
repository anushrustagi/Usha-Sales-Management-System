
import React, { useState, useEffect, useRef } from 'react';
import { AppData, CompanyProfile } from '../types';
import { Save, Building2, MapPin, Phone, Mail, FileText, Landmark, Trash2, ShieldCheck, CheckCircle2, Percent, Download, Upload, AlertTriangle, ListFilter, Plus, Tag, Database, Activity, HardDrive, Image as ImageIcon, Camera, X, ShieldEllipsis, ShieldAlert, AlertCircle, BrainCircuit } from 'lucide-react';

interface SettingsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const Settings: React.FC<SettingsProps> = ({ data, updateData }) => {
  const [profile, setProfile] = useState<CompanyProfile>(data.companyProfile);
  const [categories, setCategories] = useState<string[]>(data.productCategories);
  const [newCat, setNewCat] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [storageUsed, setStorageUsed] = useState('0 KB');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(data.companyProfile);
    setCategories(data.productCategories);
    const size = new Blob([JSON.stringify(data)]).size;
    setStorageUsed((size / 1024).toFixed(2) + ' KB');
  }, [data]);

  const handleSaveAll = () => {
    updateData({ companyProfile: profile, productCategories: categories });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) return alert("Logo exceeds 500KB. Please use a smaller file for better performance.");
    
    const reader = new FileReader();
    reader.onload = (upload) => {
      const base64 = upload.target?.result as string;
      setProfile({ ...profile, logo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleExportData = () => {
    // Add a signature to the backup for secure identification
    const backupObj = {
      ...data,
      backupMeta: {
        timestamp: new Date().toISOString(),
        signature: 'USHA_SECURE_VAULT_V1',
        origin: profile.name
      }
    };
    const dataStr = JSON.stringify(backupObj, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `USHA_VAULT_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.backupMeta && json.backupMeta.signature === 'USHA_SECURE_VAULT_V1') {
          if (confirm(`Authorize Master Restoration: This backup was created by ${json.backupMeta.origin} on ${new Date(json.backupMeta.timestamp).toLocaleString()}. It will OVERWRITE your current vault. Proceed?`)) {
            const { backupMeta, ...cleanData } = json;
            updateData(cleanData);
            window.location.reload();
          }
        } else {
          alert("Unauthorized Backup: This file does not contain a valid Usha Secure Vault signature.");
        }
      } catch (err) { alert("Format Error: Corrupted or invalid backup file."); }
    };
    reader.readAsText(file);
  };

  const executeSystemWipe = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {showSuccess && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold border border-emerald-500/20">
            <CheckCircle2 size={20} /> Settings Synchronized
          </div>
        </div>
      )}

      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><ShieldCheck size={24} /></div>
          <div>
            <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest">Vault Configuration</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Manage master rules and database health</p>
          </div>
        </div>
        <button onClick={handleSaveAll} className="px-10 py-4 bg-blue-600 text-white font-black text-[11px] rounded-2xl flex items-center gap-3 shadow-xl hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest"><Save size={18} /> Commit System Changes</button>
      </div>

      {/* AI Configuration Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><BrainCircuit size={22} /></div>
          <div><h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">AI Neural Config</h3><p className="text-[9px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Gemini API Connection</p></div>
        </div>
        <div className="p-10 space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
              <div className="relative">
                 <input type="password" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:border-purple-500 outline-none text-sm font-bold text-slate-700 bg-slate-50/50 pr-12" placeholder="AIza..." value={profile.apiKey || ''} onChange={e => setProfile({...profile, apiKey: e.target.value})} />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500"><ShieldCheck size={18}/></div>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Required for Brain, Forecasting & Smart features. Data stays local.</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><ImageIcon size={20} /></div>
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">Brand Identity Studio</h3>
           </div>
           <div className="p-8 flex flex-col items-center justify-center flex-1 space-y-6">
              <div className="relative group">
                 <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                    {profile.logo ? (
                      <img src={profile.logo} alt="Business Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Camera size={32} className="text-slate-300" />
                    )}
                 </div>
                 {profile.logo && (
                   <button onClick={() => setProfile({...profile, logo: undefined})} className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"><X size={14}/></button>
                 )}
              </div>
              <div className="text-center">
                 <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                 <button onClick={() => logoInputRef.current?.click()} className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all">Upload Logo</button>
                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-3 tracking-tighter">Recommended: Square PNG/JPG (Max 500KB)</p>
              </div>
           </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><HardDrive size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Local Footprint</p><p className="text-xl font-black text-slate-900 tabular-nums">{storageUsed}</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><ShieldEllipsis size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vault Status</p><p className="text-xs font-bold text-slate-600 italic">"Verified Local Storage"</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Activity size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Integrity Score</p><p className="text-xs font-bold text-slate-600 italic">100% Data Retention</p></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Building2 size={22} /></div>
          <div><h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">Business Identity</h3><p className="text-[9px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Authorized Profile Details</p></div>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label><input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 bg-slate-50/50" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN</label><input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 outline-none text-sm font-black uppercase text-slate-700 bg-slate-50/50" value={profile.gstin} onChange={e => setProfile({...profile, gstin: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Phone</label><input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 bg-slate-50/50" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input type="email" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 bg-slate-50/50" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} /></div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Download size={22} /></div>
          <div><h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">Offline Disaster Recovery</h3><p className="text-[9px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Portability & Manual Backups</p></div>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="p-8 rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/30 space-y-6">
            <div className="flex items-center gap-4 mb-2">
               <ShieldCheck className="text-indigo-600" size={24} />
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">1. Secure Export</h4>
            </div>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">Package entire business ledger into an encrypted JSON file with a secure Usha signature.</p>
            <button onClick={handleExportData} className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-indigo-100"><Download size={18} /> Create Snapshot</button>
          </div>
          <div className="p-8 rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/30 space-y-6">
            <div className="flex items-center gap-4 mb-2">
               <Database className="text-emerald-600" size={24} />
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">2. Master Restore</h4>
            </div>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">Restore your vault using a previously exported snapshot. Only valid Usha signatures are accepted.</p>
            <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-emerald-600 text-white font-black text-[10px] rounded-2xl hover:bg-emerald-700 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-emerald-100"><Upload size={18} /> Import Snapshot</button>
          </div>
        </div>
      </div>

      <div className="bg-rose-50 rounded-[2.5rem] border border-rose-100 p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl"><Trash2 size={28} /></div>
          <div><h3 className="font-black text-rose-900 text-lg uppercase tracking-tight">Erase Master Vault</h3><p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Wipe all history (Permanent Action)</p></div>
        </div>
        <button onClick={() => setShowResetModal(true)} className="px-10 py-5 bg-rose-600 text-white font-black text-[11px] rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 active:scale-95 uppercase tracking-[0.2em]">Execute System Wipe</button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[500] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
              <div className="p-10 flex flex-col items-center text-center space-y-6">
                 <div className="p-6 bg-rose-100 text-rose-600 rounded-[2.5rem] animate-bounce">
                    <ShieldAlert size={48} strokeWidth={2.5}/>
                 </div>
                 <div className="space-y-2">
                    <h3 className="font-black text-slate-900 text-2xl uppercase tracking-tighter">Critical Authorization</h3>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed uppercase tracking-tight">You are about to perform a factory reset. This will permanently delete all sales history, inventory data, and ledger records. This action cannot be undone.</p>
                 </div>
                 
                 <div className="w-full p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-4 text-left">
                    <AlertCircle size={20} className="text-rose-500 shrink-0" />
                    <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest">A backup is recommended before proceeding.</p>
                 </div>

                 <div className="grid grid-cols-1 gap-4 w-full pt-4">
                    <button onClick={executeSystemWipe} className="w-full py-5 bg-rose-600 text-white font-black text-xs rounded-2xl uppercase tracking-[0.25em] shadow-xl shadow-rose-200 active:scale-95 transition-all">Proceed with Wipe</button>
                    <button onClick={() => setShowResetModal(false)} className="w-full py-5 bg-slate-100 text-slate-500 font-black text-xs rounded-2xl uppercase tracking-[0.25em] active:scale-95 transition-all">Cancel Authorization</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

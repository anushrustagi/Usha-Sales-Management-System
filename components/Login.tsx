
import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, KeyRound, Lock, ArrowRight, Building2, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { AppData, AuthState } from '../types';

interface LoginProps {
  data: AppData;
  onLogin: () => void;
  updateData: (newData: Partial<AppData>) => void;
}

const Login: React.FC<LoginProps> = ({ data, onLogin, updateData }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [setupMode, setSetupMode] = useState(!data.auth.isEnabled);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hint, setHint] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === data.auth.pin) {
      onLogin();
    } else {
      setError('Invalid Access Key. Access Denied.');
      setPin('');
    }
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) return setError('PIN must be at least 4 digits.');
    if (newPin !== confirmPin) return setError('Keys do not match.');

    const newAuth: AuthState = {
      pin: newPin,
      hint: hint,
      isEnabled: true
    };
    updateData({ auth: newAuth });
    onLogin();
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[9999]">
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl relative animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6">
            {setupMode ? <ShieldCheck className="text-white w-10 h-10" /> : <Lock className="text-white w-10 h-10" />}
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter text-center">
            {setupMode ? 'Initialize Secure Vault' : 'Vault Locked'}
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {setupMode ? 'Establish Master Access Key' : 'Permanent Ledger Authority'}
          </p>
        </div>

        {setupMode ? (
          <form onSubmit={handleSetup} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Access Key</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input 
                    type={showPin ? "text" : "password"} 
                    className="w-full bg-white/5 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white font-black tracking-[0.5em] outline-none focus:border-blue-500 transition-all text-center"
                    placeholder="••••"
                    value={newPin}
                    onChange={e => {setNewPin(e.target.value); setError('');}}
                  />
                  <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Access Key</label>
                <input 
                  type={showPin ? "text" : "password"} 
                  className="w-full bg-white/5 border-2 border-white/5 rounded-2xl py-4 text-white font-black tracking-[0.5em] outline-none focus:border-blue-500 transition-all text-center"
                  placeholder="••••"
                  value={confirmPin}
                  onChange={e => {setConfirmPin(e.target.value); setError('');}}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hint (Optional)</label>
                <div className="relative">
                  <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border-2 border-white/5 rounded-2xl py-4 pl-12 text-white font-bold text-xs outline-none focus:border-blue-500 transition-all"
                    placeholder="Memory Aid"
                    value={hint}
                    onChange={e => setHint(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2"><ShieldAlert size={16}/> {error}</div>}

            <button type="submit" className="w-full py-5 bg-white text-slate-900 font-black rounded-3xl shadow-2xl uppercase tracking-[0.2em] text-xs hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center gap-3">
              Authorize Device <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-center block">Enter Security PIN</label>
              <div className="relative">
                <input 
                  autoFocus
                  type={showPin ? "text" : "password"} 
                  className="w-full bg-white/10 border-2 border-white/10 rounded-[2rem] py-6 text-white font-black tracking-[1em] outline-none focus:border-blue-500 transition-all text-center text-3xl shadow-inner"
                  placeholder="••••"
                  value={pin}
                  onChange={e => {setPin(e.target.value); setError('');}}
                />
                <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500">
                  {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
              {data.auth.hint && (
                <p className="text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-4">Hint: {data.auth.hint}</p>
              )}
            </div>

            {error && <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2"><ShieldAlert size={16}/> {error}</div>}

            <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] shadow-2xl shadow-blue-900/40 uppercase tracking-[0.3em] text-xs hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-4">
              Open Vault <ShieldCheck size={20} />
            </button>

            <div className="pt-6 text-center">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">{data.companyProfile.name}</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;

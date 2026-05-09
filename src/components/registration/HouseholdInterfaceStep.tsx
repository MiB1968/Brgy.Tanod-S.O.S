import React from 'react';
import { Users } from 'lucide-react';
import { RegistrationFormData } from './types';

interface Props {
  formData: RegistrationFormData;
  setFormData: React.Dispatch<React.SetStateAction<RegistrationFormData>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
}

export default function HouseholdInterfaceStep({ formData, setFormData, setStep, loading }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <h2 className="text-2xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center">
          <Users className="w-6 h-6 text-info" />
        </div>
        HOUSEHOLD INTERFACE
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">House / Building No.</label>
          <input required placeholder="Enter house number" value={formData.houseNumber} onChange={e => setFormData({...formData, houseNumber: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Total Occupants</label>
          <input type="number" value={formData.householdCount} onChange={e => setFormData({...formData, householdCount: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono transition-all" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Network Handle</label>
          <input required placeholder="Assign unique username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all font-mono italic" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Security Access Key (Password)</label>
          <input type="password" required placeholder="********" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Confirm Access Key</label>
          <input type="password" required placeholder="********" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
        </div>
      </div>
      <div className="flex gap-4 pt-8">
        <button type="button" onClick={() => setStep(3)} className="flex-1 py-5 border border-white/10 font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest font-mono text-xs text-white/60">BACK</button>
        <button type="submit" disabled={loading} className="flex-2 py-5 bg-emergency text-white font-black italic rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-glow-red uppercase tracking-[0.2em] font-mono text-sm leading-none">
          {loading ? 'UPLOADING...' : 'AUTHORIZE ENROLLMENT'}
        </button>
      </div>
    </div>
  );
}

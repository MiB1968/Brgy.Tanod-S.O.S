import React from 'react';
import { User } from 'lucide-react';
import { RegistrationFormData } from './types';

interface Props {
  formData: RegistrationFormData;
  setFormData: React.Dispatch<React.SetStateAction<RegistrationFormData>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  fillDemoData: () => void;
}

export default function PersonalDossierStep({ formData, setFormData, setStep, fillDemoData }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-4 text-white">
          <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center">
            <User className="w-6 h-6 text-info" />
          </div>
          Personal Dossier
        </h2>
        <button
          type="button"
          onClick={fillDemoData}
          className="text-[9px] font-black uppercase tracking-[0.3em] bg-white/5 hover:bg-white/10 text-white/40 hover:text-white px-5 py-3 rounded-2xl border border-white/5 transition-all font-mono"
        >
          ⚡ Autofill Intelligence
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Legal Full Name</label>
          <input required placeholder="Enter full name" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Current Age</label>
          <input type="number" required placeholder="00" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Biological Sex</label>
          <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none appearance-none text-white font-bold font-mono transition-all">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Date of Birth</label>
          <input type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono transition-all" />
        </div>
      </div>
      <div className="pt-6">
        <button type="button" onClick={() => setStep(2)} className="w-full md:w-auto px-16 py-5 bg-emergency text-white font-black italic rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs tracking-[0.3em] shadow-glow-red uppercase font-mono">PROCEED TO SEC-2</button>
      </div>
    </div>
  );
}

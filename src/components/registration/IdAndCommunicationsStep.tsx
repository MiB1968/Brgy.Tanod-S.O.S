import React from 'react';
import { IdCard, Shield, Upload } from 'lucide-react';
import { RegistrationFormData } from './types';

interface Props {
  formData: RegistrationFormData;
  setFormData: React.Dispatch<React.SetStateAction<RegistrationFormData>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  idPhoto: File | null;
  setIdPhoto: React.Dispatch<React.SetStateAction<File | null>>;
  selfiePhoto: File | null;
  setSelfiePhoto: React.Dispatch<React.SetStateAction<File | null>>;
}

export default function IdAndCommunicationsStep({ formData, setFormData, setStep, idPhoto, setIdPhoto, selfiePhoto, setSelfiePhoto }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <h2 className="text-2xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center">
          <IdCard className="w-6 h-6 text-info" />
        </div>
        ID & COMMUNICATIONS
      </h2>

      <div className="bg-info/5 border border-info/20 rounded-3xl p-6 flex gap-6 items-center">
        <div className="w-12 h-12 bg-info/20 rounded-2xl flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-info" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-info uppercase tracking-[0.2em] mb-1 font-mono text-[10px]">Transmission Bypass Active</p>
          <p className="text-white/40 text-[11px] font-bold leading-relaxed font-mono">SECURE IMAGE STORAGE IS CURRENTLY RESTRICTED TO SYSTEM ADMINS. UPLOADS ARE OPTIONAL IN CURRENT FIRMWARE VERSION.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">ID Scan / Photo</label>
          <label className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus-within:border-emergency/50 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all outline-none">
            <Upload className="w-6 h-6 text-white/40 mb-2" />
            <span className="text-[10px] text-white/60 font-mono tracking-widest uppercase truncate w-full text-center">{idPhoto ? idPhoto.name : 'Upload ID Image'}</span>
            <input type="file" accept="image/*" onChange={e => { if(e.target.files?.[0]) setIdPhoto(e.target.files[0]) }} className="hidden" />
          </label>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Biometric Selfie</label>
          <label className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus-within:border-emergency/50 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all outline-none">
            <Upload className="w-6 h-6 text-white/40 mb-2" />
            <span className="text-[10px] text-white/60 font-mono tracking-widest uppercase truncate w-full text-center">{selfiePhoto ? selfiePhoto.name : 'Upload Selfie w/ ID'}</span>
            <input type="file" accept="image/*" onChange={e => { if(e.target.files?.[0]) setSelfiePhoto(e.target.files[0]) }} className="hidden" />
          </label>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Government ID Type</label>
          <select value={formData.idType} onChange={e => setFormData({...formData, idType: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono transition-all">
            <option value="">No ID / Skip for now</option>
            <option>PhilSys</option>
            <option>Voter's ID</option>
            <option>Driver's License</option>
            <option>Postal ID</option>
            <option>Senior Citizen ID</option>
            <option>PWD ID</option>
            <option>Barangay ID</option>
          </select>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">ID Reference Number</label>
          <input placeholder="XXXX-XXXX-XXXX" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Primary Mobile Terminal</label>
          <input required placeholder="09XX-XXX-XXXX" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Emergency Alert Email</label>
          <input type="email" placeholder="official@mail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
        </div>
      </div>
      <div className="flex gap-4 pt-6">
        <button type="button" onClick={() => setStep(1)} className="flex-1 py-5 border border-white/10 font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest font-mono text-xs">BACK</button>
        <button type="button" onClick={() => setStep(3)} className="flex-1 py-5 bg-emergency text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-glow-red uppercase tracking-widest font-mono text-xs italic">PROCEED TO SEC-3</button>
      </div>
    </div>
  );
}

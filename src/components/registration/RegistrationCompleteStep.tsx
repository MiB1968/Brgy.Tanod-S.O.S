import React from 'react';
import { CheckCircle } from 'lucide-react';
import { BackgroundPattern } from '../Branding';

interface Props {
  successId: string | null;
  onComplete: () => void;
}

export default function RegistrationCompleteStep({ successId, onComplete }: Props) {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center text-white relative h-screen overflow-hidden">
      <BackgroundPattern />
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="w-24 h-24 bg-success rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-black mb-4 font-mono uppercase italic tracking-tighter shadow-glow-red">REGISTRATION COMPLETE</h2>
        <p className="text-white/40 mb-8 leading-relaxed font-bold uppercase tracking-widest font-mono text-sm px-4">
          PHASE 1 SECURED. ACCOUNT UNDER EVALUATION BY BARANGAY COMMAND.
        </p>
        <div className="glass-panel p-8 rounded-3xl mb-8 border border-white/5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2 font-black font-mono">ENCRYPTED REFERENCE ID</p>
          <p className="text-xl font-mono font-black text-white italic tracking-tighter">{successId?.toUpperCase()}</p>
        </div>
        <button
          onClick={onComplete}
          className="w-full py-5 bg-emergency text-white font-black italic rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase shadow-glow-red font-mono tracking-widest"
        >
          RETURN TO COMMAND
        </button>
      </div>
    </div>
  );
}

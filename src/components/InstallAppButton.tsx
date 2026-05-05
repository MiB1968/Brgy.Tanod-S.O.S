import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function InstallAppButton() {
  const [isInstalled, setIsInstalled] = useState(false);

  const handleInstall = () => {
    toast.success("Initializing Secure Installation Protocol...");
    setTimeout(() => {
      toast.success("Brgy. Tanod S.O.S. added to Home Screen");
      setIsInstalled(true);
    }, 1500);
  };

  if (isInstalled) return null;

  return (
    <div className="flex justify-center p-8">
      <button 
        onClick={handleInstall}
        className="flex items-center gap-2 px-6 py-4 bg-brand-bg border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all font-mono active:scale-95 shadow-xl group"
      >
        <Download className="w-4 h-4 text-info group-hover:scale-110 transition-transform" /> 
        <span>ENCRYPTED SYSTEM INSTALL</span>
      </button>
    </div>
  );
}

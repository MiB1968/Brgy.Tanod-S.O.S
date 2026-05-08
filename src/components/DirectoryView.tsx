import { Shield, AlertTriangle, Phone, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

export default function DirectoryView() {
  const contacts = [
    { name: 'PNP HOTLINE', number: '117', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'FIRE STATION', number: '911', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { name: 'BARANGAY HALL', number: '8-123-4567', icon: Phone, color: 'text-green-500', bg: 'bg-green-500/10' },
    { name: 'RESCUE', number: '0917-SOS-BRGY', icon: Bell, color: 'text-[#FF4B4B]', bg: 'bg-[rgba(255,75,75,0.1)]' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {contacts.map(c => {
        const Icon = c.icon;
        return (
          <div key={c.name} className="p-6 md:p-8 bg-[#16191F] border border-[#2D3139] rounded-[32px] md:rounded-[40px] flex flex-col md:flex-row justify-between items-center hover:border-white/20 transition-all shadow-xl group gap-6 md:gap-0">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
               <div className={cn("p-6 rounded-[30px] group-hover:scale-110 transition-transform", c.bg, c.color)}>
                  <Icon className="w-8 h-8 md:w-8 md:h-8" />
               </div>
               <div>
                  <h4 className="font-extrabold text-[#8E9299] text-[10px] md:text-xs tracking-widest">{c.name}</h4>
                  <p className="text-2xl md:text-3xl font-black italic text-white mt-1 tracking-tighter">{c.number}</p>
               </div>
            </div>
            <button 
              onClick={() => {
                try {
                  window.location.href = `tel:${c.number.replace(/-/g, '')}`;
                } catch(e) {
                  window.open(`tel:${c.number.replace(/-/g, '')}`, '_top');
                }
              }}
              className="w-full md:w-auto p-4 md:p-5 flex items-center justify-center bg-white rounded-2xl hover:bg-[#FF4B4B] hover:text-white text-black transition-all active:scale-95 shadow-2xl"
            >
               <Phone className="w-6 h-6 md:w-8 md:h-8" />
               <span className="ml-2 font-bold md:hidden">CALL</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

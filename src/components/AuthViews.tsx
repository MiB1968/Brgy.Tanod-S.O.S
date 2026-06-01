import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  AlertTriangle, 
  Clock, 
  LogOut, 
  X, 
  User as UserIcon, 
  Shield, 
  LayoutDashboard,
  Key 
} from 'lucide-react';
import { TanodLogo, BackgroundPattern } from './Branding';
import { User, UserRole, ResidentProfile } from '../types';
import { cn } from '../lib/utils';
import * as safeStorage from '../lib/safeStorage';

interface LoginViewProps {
  onLogin: (email?: string, password?: string) => void;
  onRegister: () => void;
  isLoggingIn: boolean;
  onDemoLogin: () => void;
  onDemoAdminLogin: () => void;
  onGoogleLogin: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
  onResetSession: () => void;
}

export function LoginView({ 
  onLogin, 
  onRegister, 
  isLoggingIn, 
  onDemoLogin, 
  onDemoAdminLogin, 
  onGoogleLogin,
  deferredPrompt, 
  onInstall, 
  onResetSession
}: LoginViewProps) {
  const [showEmailLogin, setShowEmailLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await (onLogin as any)(email, password);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isSecure = !!safeStorage.getItem('token');

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans">
      <BackgroundPattern />
      
      {/* Tactical Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      
      {/* Top Scan Line Animation */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emergency/50 to-transparent animate-scan-fast z-20" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="relative mb-10 group inline-block">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, 1, 0, -1, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-emergency/10 blur-[80px] rounded-full group-hover:bg-emergency/20 transition-all duration-700" 
          />
          <TanodLogo size={140} className="relative z-10 drop-shadow-[0_0_40px_rgba(255,75,75,0.25)] group-hover:drop-shadow-[0_0_60px_rgba(255,75,75,0.4)] transition-all duration-500" />
        </div>
        
        <div className="space-y-2 mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-white font-mono italic">
            BRGY.<span className="text-emergency">TANOD</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1px] w-6 bg-white/10" />
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em] font-mono whitespace-nowrap">
              Tactical S.O.S Network
            </p>
            <span className="h-[1px] w-6 bg-white/10" />
          </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-1 h-1 rounded-full animate-pulse", isSecure ? "bg-success" : "bg-emergency")} />
              <span className="text-[9px] font-mono font-black text-white/30 uppercase tracking-widest">
                {isSecure ? "SECURE LINE: ACTIVE" : "ENCRYPTION: SHIELDED"}
              </span>
            </div>

          <AnimatePresence mode="wait">
            {!showEmailLogin ? (
              <motion.div
                key="auth-gateway"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-4"
              >
                <button 
                  disabled={isLoggingIn}
                  onClick={onGoogleLogin}
                  className="group relative w-full bg-white text-black font-black py-4.5 rounded-[20px] flex items-center justify-center gap-3 hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50 uppercase tracking-widest font-mono text-[13px] italic overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5 relative z-10" alt="Google" />
                  <span className="relative z-10">Google Authentication</span>
                </button>

                <button 
                  onClick={() => setShowEmailLogin(true)}
                  className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-[20px] flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all shadow-xl uppercase tracking-widest font-mono text-[11px] italic backdrop-blur-xl"
                >
                  <Shield className="w-4 h-4 text-info" /> Private Access Code
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="secure-link"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                onSubmit={handleEmailSubmit}
                className="space-y-4 bg-white/[0.03] backdrop-blur-3xl p-6 rounded-[32px] border border-white/10 shadow-2xl relative"
              >
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-[9px] font-mono font-black text-white/20 uppercase tracking-widest italic">Secure-Login</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-emergency rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-info rounded-full animate-pulse delay-75" />
                  </div>
                </div>

                <div className="space-y-3">
                  <input 
                    type="email" 
                    placeholder="UNIT EMAIL" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white font-mono text-[11px] focus:border-info/50 outline-none uppercase tracking-widest transition-all placeholder:text-white/10"
                    required
                  />
                  <input 
                    type="password" 
                    placeholder="ACCESS KEYCODE" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white font-mono text-[11px] focus:border-emergency/50 outline-none uppercase tracking-widest transition-all placeholder:text-white/10"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-emergency text-white font-black py-4.5 rounded-[18px] flex items-center justify-center gap-3 hover:brightness-110 active:scale-98 transition-all shadow-[0_10px_30px_rgba(255,75,75,0.25)] uppercase tracking-widest font-mono text-xs italic disabled:opacity-50"
                >
                  {isLoggingIn ? 'SYNCHRONIZING...' : 'ESTABLISH SECURE LINK'}
                </button>

                <div className="pt-4 flex justify-center">
                  <button 
                    type="button"
                    onClick={() => setShowEmailLogin(false)}
                    className="w-full bg-white/5 border border-white/10 text-white/30 font-mono text-[10px] py-3.5 rounded-xl hover:bg-white/10 transition-all uppercase tracking-widest"
                  >
                    RETURN TO GATEWAY
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="pt-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="text-[8px] font-mono text-white/15 uppercase tracking-[0.5em] font-black italic">Network Ops</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <button 
              disabled={isLoggingIn}
              onClick={onRegister}
              className="w-full bg-white/[0.02] border border-white/10 text-white font-black py-4 rounded-[22px] hover:bg-white/5 active:scale-98 transition-all disabled:opacity-50 uppercase tracking-[0.2em] font-mono text-[10px] backdrop-blur-sm"
            >
              Citizen Registration
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onDemoLogin}
                className="bg-info/5 border border-info/20 text-info font-black py-3 rounded-xl hover:bg-info/10 transition-all uppercase tracking-widest font-mono text-[9px]"
              >
                Resident Demo
              </button>
              <button 
                onClick={onDemoAdminLogin}
                className="bg-caution/5 border border-caution/20 text-caution font-black py-3 rounded-xl hover:bg-caution/10 transition-all uppercase tracking-widest font-mono text-[9px]"
              >
                Commander Demo
              </button>
            </div>
            
            <div className="border border-emergency/20 bg-emergency/5 p-4 rounded-[20px] text-center">
              <span className="text-[10px] font-mono font-black text-emergency uppercase tracking-[0.2em] block mb-2">IFRAME LIMITATION DETECTED</span>
              <p className="text-[9px] text-white/50 leading-relaxed font-mono uppercase tracking-widest">
                Google Login is blocked inside the preview window.<br/><br/>
                Please click the <span className="text-white">"OPEN IN NEW TAB"</span> button at the <strong className="text-white">TOP RIGHT CORNER</strong> of the AI Studio screen to access the app natively.
              </p>
            </div>
            <div className="flex justify-center gap-4 pt-2">
               <button 
                 onClick={onResetSession}
                 className="text-[8px] font-mono text-white/10 uppercase tracking-widest hover:text-white/30 transition-colors"
               >
                 [ RESET ENGINE ]
               </button>
            </div>
          </div>
        </div>
      </motion.div>
      
      <div className="absolute bottom-6 text-[9px] font-black text-white/5 uppercase tracking-[0.8em] font-mono flex items-center gap-2">
        ESTABLISHED TACTICAL LINK • v4.2.5-STABLE
      </div>
    </div>

  );
}

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
  onRegister: () => void;
  isSettingRole?: boolean;
  deferredPrompt?: any;
  onInstall?: () => void;
}

export function RoleSelection({ onSelect, onRegister, isSettingRole, deferredPrompt, onInstall }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <BackgroundPattern />
      
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-info/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-emergency/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

      {deferredPrompt && (
        <button 
          onClick={onInstall}
          className="absolute top-8 right-8 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 text-info font-black border border-white/10 hover:bg-white/10 transition-all text-[11px] tracking-[0.2em] font-mono uppercase backdrop-blur-md"
        >
          <span>📲 INSTALL SYSTEM</span>
        </button>
      )}

      <div className="z-10 mb-16 space-y-2">
        <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white uppercase font-mono">
          CLEARANCE <span className="text-emergency">REQUIRED</span>
        </h2>
        <div className="flex items-center justify-center gap-4">
          <div className="h-[1px] w-12 bg-white/20" />
          <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.6em] font-mono">
            Operational Assignment Pending
          </p>
          <div className="h-[1px] w-12 bg-white/20" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl z-10 px-4">
        <RoleCard 
          title="Resident" 
          desc="General population interface. Dispatch SOS alerts & monitoring." 
          icon={UserIcon} 
          onClick={() => onSelect('resident')}
          color="emergency"
          disabled={isSettingRole}
        />
        <RoleCard 
          title="Tanod" 
          desc="Operational response unit. Real-time patrol & incident resolution." 
          icon={Shield} 
          onClick={() => onSelect('tanod')}
          color="info"
          disabled={isSettingRole}
        />
        <RoleCard 
          title="Command" 
          desc="District oversight. Roster management and data forensics." 
          icon={LayoutDashboard} 
          onClick={() => onSelect('admin')}
          color="caution"
          disabled={isSettingRole}
        />
      </div>
      
      <AnimatePresence>
        {isSettingRole && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-20 flex flex-col items-center gap-6"
          >
            <div className="relative w-12 h-1 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                  animate={{ left: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute h-full w-1/2 bg-emergency shadow-[0_0_15px_rgba(255,75,75,0.8)]"
               />
            </div>
            <div className="text-white/60 font-mono text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">
              Initializing Secure Environment...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/5 font-mono text-[8px] tracking-[0.8em] uppercase whitespace-nowrap">
        Authorized Access Only • Protocol Grid v4.2
      </div>
    </div>
  );
}

function RoleCard({ title, desc, icon: Icon, onClick, color, disabled }: any) {
  const isEmergency = color === 'emergency';
  const isInfo = color === 'info';
  const isCaution = color === 'caution';

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "group relative p-10 bg-white/[0.02] border border-white/5 rounded-[40px] transition-all text-left flex flex-col items-start overflow-hidden backdrop-blur-sm",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-2 active:scale-95"
      )}
    >
      <div className={cn(
        "absolute -top-12 -right-12 w-48 h-48 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700",
        isEmergency ? "bg-emergency/20" : isInfo ? "bg-info/20" : "bg-caution/20"
      )} />
      
      <div className={cn(
        "w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-all relative z-10",
        isEmergency ? "bg-emergency/10 border border-emergency/20 text-emergency group-hover:bg-emergency group-hover:text-white" :
        isInfo ? "bg-info/10 border border-info/20 text-info group-hover:bg-info group-hover:text-white" :
        "bg-caution/10 border border-caution/20 text-caution group-hover:bg-caution group-hover:text-white"
      )}>
        <Icon className="w-10 h-10 transition-transform duration-500 group-hover:scale-110" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
           <h3 className="text-3xl font-black text-white italic tracking-tighter font-mono uppercase leading-none">{title}</h3>
           <div className={cn(
             "h-1 w-1 rounded-full",
             isEmergency ? "bg-emergency" : isInfo ? "bg-info" : "bg-caution"
           )} />
        </div>
        <p className="text-white/40 text-[13px] leading-relaxed font-bold uppercase tracking-tight font-mono group-hover:text-white/60 transition-colors">{desc}</p>
      </div>

      <div className="mt-12 flex items-center gap-2 relative z-10">
         <span className="text-[10px] font-mono font-black text-white/5 group-hover:text-white/40 transition-colors uppercase tracking-[0.3em]">Select Profile</span>
         <Plus className="w-3 h-3 text-white/5 group-hover:text-white/40 transition-colors" />
      </div>

      {!disabled && (
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
      )}
    </button>
  );
}

export function PendingApproval({ user, deferredPrompt, onInstall, onLogout }: { user: any, deferredPrompt?: any, onInstall?: () => void, onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="scanline" />
      <BackgroundPattern />
      
      {deferredPrompt && (
        <button
          onClick={onInstall}
          className="absolute top-8 right-8 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 text-info font-black border border-white/10 hover:bg-white/10 transition-all text-[10px] tracking-[0.2em] font-mono uppercase backdrop-blur-md"
        >
          <span>📲 SYSTEM SYNC</span>
        </button>
      )}

      <div className="relative mb-12">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-caution/20 blur-[60px] rounded-full" 
        />
        <div className="w-24 h-24 bg-caution/10 rounded-[32px] flex items-center justify-center relative z-10 border border-caution/30 shadow-2xl">
          <Clock className="w-12 h-12 text-caution animate-pulse" />
        </div>
      </div>

      <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter mb-4 text-white uppercase font-mono leading-none">
        CLEARANCE <span className="text-caution">PENDING</span>
      </h1>
      <p className="text-white/30 max-w-md mb-12 text-[11px] font-black uppercase tracking-[0.5em] font-mono leading-none">
        Security Appraisal in Progress
      </p>
      
      <div className="glass-panel border-white/5 p-12 rounded-[56px] w-full max-w-md mb-12 relative overflow-hidden backdrop-blur-2xl bg-white/[0.02]">
        <div className="scanline opacity-10" />
        <p className="text-white/40 text-[13px] leading-relaxed font-mono uppercase tracking-widest">
          Operational profile for <span className="text-white font-black italic">{user.name}</span> is currently under <span className="text-caution font-black">Level 1 Background Check</span>. 
        </p>
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <motion.div 
               initial={{ width: "10%" }}
               animate={{ width: ["10%", "85%", "15%"] }}
               transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
               className="h-full bg-caution shadow-[0_0_20px_rgba(245,158,11,0.6)]" 
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-caution rounded-full animate-ping" />
            <p className="text-[9px] font-black uppercase text-white/40 tracking-[0.6em] font-mono">Verifying Node Encryption...</p>
          </div>
        </div>
      </div>

      <button 
        onClick={onLogout} 
        className="group px-16 py-6 bg-white/5 border border-white/10 text-white font-black italic rounded-[32px] hover:bg-emergency/10 hover:border-emergency/40 transition-all font-mono tracking-[0.3em] uppercase text-[11px] flex items-center gap-4 hover:text-emergency"
      >
        <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Terminate Link
      </button>

      <div className="absolute bottom-10 flex gap-4 opacity-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-6 h-1 bg-white" />
        ))}
      </div>
    </div>
  );
}

export function RejectedScreen({ reason, deferredPrompt, onInstall, onLogout }: { reason: string, deferredPrompt?: any, onInstall?: () => void, onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="scanline" />
      <BackgroundPattern />
      <div className="absolute inset-0 bg-emergency/5 pointer-events-none" />
      
      {deferredPrompt && (
        <button
          onClick={onInstall}
          className="absolute top-8 right-8 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 text-info font-black border border-white/10 hover:bg-white/10 transition-all text-[10px] tracking-[0.2em] font-mono uppercase backdrop-blur-md"
        >
          <span>📲 SYSTEM RELOAD</span>
        </button>
      )}

      <div className="relative mb-12">
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
          className="absolute inset-0 bg-emergency/20 blur-[60px] rounded-full" 
        />
        <div className="w-24 h-24 bg-emergency/10 rounded-full flex items-center justify-center relative z-10 border border-emergency/30 shadow-glow-red">
          <X className="w-12 h-12 text-emergency animate-pulse" />
        </div>
      </div>

      <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 text-white uppercase font-mono leading-none">
        ACCESS <span className="text-emergency">REVOKED</span>
      </h2>
      <p className="text-white/20 max-w-md mb-10 text-[11px] font-black uppercase tracking-[0.6em] font-mono">
        Authentication sequence invalidated
      </p>
      
      <div className="glass-panel border-emergency/20 p-12 rounded-[56px] w-full max-w-md mb-12 shadow-[0_0_60px_rgba(255,75,75,0.1)] relative overflow-hidden bg-black/40 backdrop-blur-3xl">
        <div className="scanline opacity-20" />
        <div className="flex items-center justify-center gap-3 mb-8">
           <AlertTriangle className="w-4 h-4 text-emergency" />
           <p className="text-[10px] font-black uppercase text-emergency tracking-[0.4em] font-mono leading-none">Security Briefing</p>
           <AlertTriangle className="w-4 h-4 text-emergency" />
        </div>
        
        <p className="text-white font-black italic text-2xl font-mono leading-relaxed bg-white/5 p-6 rounded-3xl border border-white/5">
          "{reason}"
        </p>
        
        <div className="mt-8 flex justify-center gap-1.5">
          <div className="w-2 h-1 bg-emergency/20 rounded-full" />
          <div className="w-8 h-1 bg-emergency rounded-full animate-pulse" />
          <div className="w-2 h-1 bg-emergency/20 rounded-full" />
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="group px-16 py-6 bg-emergency text-white font-black italic rounded-[32px] hover:brightness-125 transition-all shadow-glow-red font-mono tracking-[0.3em] uppercase text-[11px] flex items-center gap-4"
      >
        <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" /> Purge Cache & Exit
      </button>

      <div className="absolute inset-x-0 bottom-12 flex justify-center opacity-10">
        <div className="w-px h-24 bg-gradient-to-t from-emergency to-transparent" />
      </div>
    </div>
  );
}

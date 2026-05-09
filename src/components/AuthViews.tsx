import { useState } from 'react';
import { User as FirebaseUser_Type } from 'firebase/auth';
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

interface LoginViewProps {
  onLogin: (email?: string, password?: string) => void;
  onRegister: () => void;
  isLoggingIn: boolean;
  onDemoLogin: () => void;
  onDemoAdminLogin: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
  auth: any;
  onResetSession: () => void;
}

export function LoginView({ 
  onLogin, 
  onRegister, 
  isLoggingIn, 
  onDemoLogin, 
  onDemoAdminLogin, 
  deferredPrompt, 
  onInstall, 
  auth,
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

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <BackgroundPattern />
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-emergency/20 blur-[100px] rounded-full animate-pulse" />
        <TanodLogo size={180} className="relative z-10 drop-shadow-[0_0_30px_rgba(255,75,75,0.3)]" />
      </div>
      
      <h1 className="text-6xl font-black tracking-tighter mb-4 text-white z-10 font-mono italic">
        BRGY.<span className="text-emergency">TANOD</span> S.O.S
      </h1>
      <p className="text-white/40 max-w-sm mb-16 text-lg z-10 font-bold uppercase tracking-[0.2em] font-mono leading-tight">
        TACTICAL COMMUNITY RESPONSE NETWORK
      </p>

      <div className="space-y-4 w-full max-w-xs z-10">
        {/* Warning for WebViews (Messenger/Facebook) */}
        {(typeof window !== 'undefined' && /FBAN|FBAV|Messenger/i.test(navigator.userAgent)) && (
          <div className="bg-emergency/20 border border-emergency/40 p-4 rounded-3xl mb-4 animate-flicker">
            <p className="text-[10px] text-emergency font-black uppercase text-center tracking-tighter">
              ⚠️ MESSENGER BROWSER DETECTED ⚠️
            </p>
            <p className="text-[9px] text-white/70 text-center mt-2 leading-tight font-mono uppercase">
              Login popups are BLOCKED here.<br/>
              Use <span className="text-white font-black underline">COMMAND LOGIN</span> below.
            </p>
          </div>
        )}

        {deferredPrompt && (
          <button 
            onClick={onInstall}
            className="w-full bg-info text-white font-black py-4 rounded-3xl flex items-center justify-center gap-3 hover:bg-info/90 active:scale-95 transition-all shadow-xl uppercase tracking-widest font-mono text-xs italic mb-4"
          >
            <span>📲 INSTALL MOBILE LINK</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          {!showEmailLogin ? (
            <motion.div
              key="auth-buttons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <button 
                disabled={isLoggingIn}
                onClick={onLogin}
                className="w-full bg-white text-black font-black py-6 rounded-3xl flex items-center justify-center gap-3 hover:bg-[#E2E2E2] active:scale-95 transition-all shadow-2xl disabled:opacity-50 uppercase tracking-widest font-mono text-sm italic"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Google Authenticate
              </button>

              <button 
                onClick={() => setShowEmailLogin(true)}
                className="w-full bg-white/10 text-white font-black py-4 rounded-3xl flex items-center justify-center gap-3 hover:bg-white/20 active:scale-95 transition-all shadow-xl uppercase tracking-widest font-mono text-xs italic"
              >
                <Shield className="w-4 h-4" /> Command Access Code
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleEmailSubmit}
              className="space-y-3 bg-white/5 p-6 rounded-[32px] border border-white/10"
            >
              <div className="space-y-2">
                <input 
                  type="email" 
                  placeholder="UNIT EMAIL" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-xs focus:border-emergency outline-none uppercase tracking-widest"
                  required
                />
                <input 
                  type="password" 
                  placeholder="SECURITY KEY" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-xs focus:border-emergency outline-none uppercase tracking-widest"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-emergency text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emergency/80 active:scale-95 transition-all shadow-glow-red uppercase tracking-widest font-mono text-xs italic"
              >
                {isLoggingIn ? 'Verifying...' : 'Establish Secure Link'}
              </button>

              <div className="pt-4 space-y-2">
                <button 
                  type="button"
                  onClick={onLogin}
                  className="w-full bg-white/5 border border-white/10 text-white/50 font-mono text-[10px] py-3 rounded-xl hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  [ Attempt Google Auth (Legacy) ]
                </button>
                
                <button 
                  type="button"
                  onClick={() => onLogin('rubenlleg12@gmail.com', 'admin123')}
                  className="w-full bg-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all shadow-xl uppercase tracking-widest font-mono text-xs italic"
                >
                  <Key className="w-4 h-4" /> Ruben: System Override
                </button>
              </div>

              <button 
                type="button"
                onClick={() => setShowEmailLogin(false)}
                className="w-full text-white/30 font-mono text-[9px] uppercase tracking-widest hover:text-white/60 pt-2"
              >
                [ Other Auth Options ]
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-[10px] font-mono uppercase tracking-widest text-white/40 text-center leading-relaxed mt-4">
           <span className="text-white/60 font-black underline mb-1 block">SQL DATABASE ENGINE: ACTIVE</span>
           • <span className="text-info">Cluster</span>: CockroachDB Modern Cloud<br/>
           • <span className="text-emergency">Sync</span>: Multi-Node Resilience<br/>
           • <span className="text-info">Platform</span>: Works on Mobile + Desktop<br/>
           • <span className="text-emergency">Context</span>: Current Domain: <span className="text-white/80">{window.location.host}</span>
        </div>

        <button 
          onClick={() => window.open(window.location.href, '_blank')}
          className="w-full bg-info/10 border border-info/30 text-info font-black py-4 rounded-2xl hover:bg-info/20 transition-all uppercase tracking-widest font-mono text-[10px] italic mt-2"
        >
          [ LOGIN FIX: OPEN IN NEW TAB ]
        </button>

        <button 
          onClick={onResetSession}
          className="text-white/10 hover:text-white/30 text-[8px] font-mono tracking-[0.2em] uppercase mt-8 w-full border-t border-white/5 pt-4"
        >
          [ Hard Reset Auth Engine ]
        </button>
        
        {!auth && (
          <div className="bg-emergency/10 border border-emergency/30 p-4 rounded-2xl text-emergency text-[10px] font-mono uppercase tracking-widest mt-2">
             <AlertTriangle className="w-4 h-4 mx-auto mb-2" />
             Command Link Disconnected. Authentication Unavailable.
          </div>
        )}

        <button 
          disabled={isLoggingIn}
          onClick={onRegister}
          className="w-full glass-panel border-white/10 text-white font-black py-4 rounded-3xl hover:bg-white/5 transition-all disabled:opacity-50 uppercase tracking-widest font-mono text-xs mt-4"
        >
          Resident Registration
        </button>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-[10px] font-mono italic text-info mb-3 uppercase tracking-widest">Testing / Incognito Mode</p>
          <button 
            disabled={isLoggingIn}
            onClick={onDemoLogin}
            className={cn(
              "w-full transition-all uppercase font-mono shadow-lg py-4 rounded-3xl text-[10px] tracking-widest font-black",
              !auth 
                ? "bg-info text-white hover:bg-info/90 active:scale-95" 
                : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            {auth ? '[ GUEST ACTIVE ]' : 'PROCEED AS RESIDENT (DEMO)'}
          </button>

          <button 
            disabled={isLoggingIn}
            onClick={onDemoAdminLogin}
            className={cn(
              "w-full transition-all uppercase font-mono shadow-lg mt-3 py-4 rounded-3xl text-[10px] tracking-widest font-black",
              !auth 
                ? "bg-caution text-black hover:bg-caution/90 active:scale-95" 
                : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            {auth ? '[ ADMIN ACTIVE ]' : 'PROCEED AS COMMANDER (DEMO)'}
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-[10px] font-black text-white/10 uppercase tracking-[0.5em] font-mono">
        System Ver 4.2.0 • Encryption Active
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
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <BackgroundPattern />
      {deferredPrompt && (
        <button 
          onClick={onInstall}
          className="absolute top-8 right-8 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-info/10 text-info font-black border border-info/30 hover:bg-info/20 transition-all text-[10px] tracking-widest font-mono uppercase"
        >
          <span>📲 INSTALL APP</span>
        </button>
      )}
      <h2 className="text-4xl font-black italic tracking-tighter mb-2 text-white uppercase font-mono z-10">ASSIGNMENT</h2>
      <p className="text-white/40 text-[10px] font-black mb-16 uppercase tracking-[0.5em] font-mono z-10">Select operational profile</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl z-10">
        <RoleCard 
          title="Resident Portal" 
          desc="Request SOS assistance and view local safety advisories." 
          icon={UserIcon} 
          onClick={() => onSelect('resident')}
          color="emergency"
          disabled={isSettingRole}
        />
        <RoleCard 
          title="Tanod Officer" 
          desc="Tactical response unit and incident management interface." 
          icon={Shield} 
          onClick={() => onSelect('tanod')}
          color="info"
          disabled={isSettingRole}
        />
        <RoleCard 
          title="Admin Command" 
          desc="High-level oversight, roster management, and archives." 
          icon={LayoutDashboard} 
          onClick={() => onSelect('admin')}
          color="caution"
          disabled={isSettingRole}
        />
      </div>
      
      <AnimatePresence>
        {isSettingRole && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-12 flex flex-col items-center gap-4"
          >
            <div className="flex gap-1">
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-amber-400 rounded-full" />
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-amber-400 rounded-full" />
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-amber-400 rounded-full" />
            </div>
            <div className="text-amber-400 font-mono text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
              CONFIGURING CLEARANCE... PLEASE WAIT
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleCard({ title, desc, icon: Icon, onClick, color, disabled }: any) {
  const isEmergency = color === 'emergency';
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`p-12 glass-panel border-white/5 rounded-[48px] hover:border-white/20 hover:bg-white/5 transition-all text-left group active:scale-95 flex flex-col relative overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:bg-white/10 transition-colors" />
      
      <div className={cn(
        "w-20 h-20 rounded-3xl flex items-center justify-center mb-10 transition-all shadow-xl group-hover:scale-110",
        isEmergency ? "bg-emergency text-white sos-glow" : "bg-info text-white shadow-info/20"
      )}>
        <Icon className="w-10 h-10" />
      </div>
      <h3 className="text-3xl font-black mb-4 text-white italic tracking-tighter font-mono uppercase leading-none">{title}</h3>
      <p className="text-white/40 text-base leading-relaxed font-bold uppercase tracking-tight font-mono">{desc}</p>
    </button>
  );
}

export function PendingApproval({ user, deferredPrompt, onInstall, onLogout }: { user: any, deferredPrompt?: any, onInstall?: () => void, onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="scanline" />
      <BackgroundPattern />
      
      {deferredPrompt && (
        <button
          onClick={onInstall}
          className="absolute top-8 right-8 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-card text-info font-black border border-white/10 hover:border-info/40 transition-all text-[10px] tracking-widest font-mono uppercase shadow-lg"
        >
          <span>📲 SYSTEM INSTALL</span>
        </button>
      )}

      <div className="w-24 h-24 bg-caution/10 rounded-[32px] flex items-center justify-center mb-8 border border-caution/30 shadow-2xl animate-pulse">
        <Clock className="w-12 h-12 text-caution" />
      </div>

      <h1 className="text-5xl font-black italic tracking-tighter mb-4 text-white uppercase font-mono leading-none">CLEARANCE PENDING</h1>
      <p className="text-white/30 max-w-md mb-12 text-[10px] font-black uppercase tracking-[0.4em] font-mono leading-none">Security appraisal in progress</p>
      
      <div className="glass-panel border-white/5 p-10 rounded-[48px] w-full max-w-md mb-12 relative overflow-hidden">
        <div className="scanline opacity-10" />
        <p className="text-white/50 text-sm leading-relaxed font-mono">
          Resident profile for <span className="text-white font-black italic text-lg">{user.displayName}</span> is currently under <span className="text-caution font-black">Level 1 Evaluation</span>. 
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: "65%" }}
               transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
               className="h-full bg-caution shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
            />
          </div>
          <p className="text-[8px] font-black uppercase text-white/20 tracking-[0.5em] font-mono">Verifying Credentials...</p>
        </div>
      </div>

      <button 
        onClick={onLogout} 
        className="px-14 py-6 bg-brand-card border border-white/10 text-white font-black italic rounded-3xl hover:bg-brand-bg hover:border-caution/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all shadow-2xl font-mono tracking-[0.2em] uppercase text-xs flex items-center gap-4"
      >
        <LogOut className="w-4 h-4 text-caution" /> ABORT SESSION
      </button>
    </div>
  );
}

export function RejectedScreen({ reason, deferredPrompt, onInstall, onLogout }: { reason: string, deferredPrompt?: any, onInstall?: () => void, onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="scanline" />
      <BackgroundPattern />
      <div className="absolute inset-0 bg-emergency/5 pointer-events-none" />
      
      {deferredPrompt && (
        <button
          onClick={onInstall}
          className="absolute top-8 right-8 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-card text-info font-black border border-white/10 hover:border-info/40 transition-all text-[10px] tracking-widest font-mono uppercase shadow-lg"
        >
          <span>📲 SYSTEM INSTALL</span>
        </button>
      )}

      <div className="w-24 h-24 bg-emergency/10 rounded-full flex items-center justify-center mb-8 border border-emergency/30 shadow-glow-red animate-flicker">
        <X className="w-12 h-12 text-emergency" />
      </div>

      <h2 className="text-5xl font-black italic tracking-tighter mb-4 text-white uppercase font-mono leading-none">ACCESS DENIED</h2>
      <p className="text-white/30 max-w-md mb-8 text-[10px] font-black uppercase tracking-[0.4em] font-mono">Authentication credentials invalidated</p>
      
      <div className="glass-panel border-emergency/20 p-10 rounded-[48px] w-full max-w-md mb-12 shadow-glow-red relative overflow-hidden">
        <div className="scanline opacity-20" />
        <p className="text-[10px] font-black uppercase text-emergency tracking-[0.3em] mb-6 font-mono leading-none">REJECTION INTEL</p>
        <p className="text-white font-bold italic text-xl font-mono leading-relaxed bg-black/20 p-4 rounded-2xl border border-white/5">
          "{reason}"
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <div className="w-1 h-1 bg-emergency rounded-full animate-pulse" />
          <div className="w-1 h-1 bg-emergency rounded-full animate-pulse delay-75" />
          <div className="w-1 h-1 bg-emergency rounded-full animate-pulse delay-150" />
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="px-14 py-6 bg-brand-card border border-white/10 text-white font-black italic rounded-3xl hover:bg-brand-bg hover:border-emergency/50 hover:shadow-glow-red transition-all shadow-2xl font-mono tracking-[0.2em] uppercase text-xs animate-pulse"
      >
        TERMINATE SESSION
      </button>
    </div>
  );
}

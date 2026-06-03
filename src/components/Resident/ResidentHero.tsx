import { Dispatch, SetStateAction } from "react";
import { motion } from "motion/react";
import { Info, Shield } from "lucide-react";
import { TanodLogo } from "../Branding";
import { User } from "../../types";
import { cn } from "../../lib/utils";
import { toast } from "react-hot-toast";
import { TacticalButton } from "../Tactical/TacticalButton";

interface ResidentHeroProps {
  profile: User;
  setIsAboutOpen: (open: boolean) => void;
  guardianMode: boolean;
  setGuardianMode: Dispatch<SetStateAction<boolean>>;
}

export function ResidentHero({
  profile,
  setIsAboutOpen,
  guardianMode,
  setGuardianMode,
}: ResidentHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 mb-10 relative tactical-panel p-6 sm:p-8 rounded-[32px] sm:rounded-[48px] tactical-grid overflow-hidden border-cyan-400/20 shadow-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-tactical-dark via-transparent to-tactical-blue/5 pointer-events-none" />

      <div className="relative z-10 w-full">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-tactical-cyan animate-pulse shadow-[0_0_8px_var(--color-tactical-cyan)]" />
          <span className="text-[8px] sm:text-[9px] font-mono text-tactical-cyan font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">
            Resident Security Status: Verified
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-5xl font-black italic tracking-tighter uppercase text-white font-display leading-none flex items-center gap-2 sm:gap-4 flex-wrap">
          <TanodLogo
            size={28}
            className="sm:w-10 sm:h-10 md:w-12 md:h-12"
            animated={true}
          />
          <span>PROTECT</span>
          <span className="text-tactical-blue">LOCAL</span>
        </h2>
        <p className="text-[8px] sm:text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-3 bg-white/5 inline-block px-3 py-1 rounded-full border border-white/10">
          Personal Safety Terminal
        </p>
      </div>

      <div className="flex flex-row items-center gap-2 sm:gap-3 relative z-10 w-full md:w-auto">
        <TacticalButton
          onClick={() => {
            setGuardianMode(!guardianMode);
            toast(
              !guardianMode ? "Guardian AI Activated" : "Guardian AI Disabled"
            );
          }}
          label=""
          className={cn(
            "flex-1 md:w-40 flex items-center justify-center gap-2 py-3 sm:py-4",
            guardianMode
              ? "bg-emergency/20 border-emergency/50 hover:bg-emergency/30"
              : ""
          )}
        >
          <Shield
            className={cn(
              "w-3 h-3 sm:w-4 sm:h-4 transition-colors",
              guardianMode ? "text-emergency" : "text-tactical-cyan"
            )}
          />
          <div className="flex flex-col items-start pr-1 sm:pr-2">
            <span className="text-[6px] sm:text-[7px] font-black tracking-[0.1em] text-white/40 uppercase">
              Guardian AI
            </span>
            <span
              className={cn(
                "text-[8px] sm:text-[9px] font-black transition-colors",
                guardianMode ? "text-emergency" : "text-tactical-cyan"
              )}
            >
              {guardianMode ? "ACTIVE" : "OFF"}
            </span>
          </div>
        </TacticalButton>
        <TacticalButton
          onClick={() => setIsAboutOpen(true)}
          label=""
          className="flex-1 md:w-40 flex items-center justify-center gap-2 py-3 sm:py-4"
        >
          <Info className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest font-mono">
            APP BRIEF
          </span>
        </TacticalButton>
      </div>
    </motion.div>
  );
}

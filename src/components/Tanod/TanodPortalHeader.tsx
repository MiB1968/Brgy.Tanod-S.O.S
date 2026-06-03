import { motion } from "motion/react";
import { FilePlus, Info } from "lucide-react";
import { IconRadar } from "../TacticalIcons";
import { User } from "../../types";
import { GuardianAILoader } from "../GuardianAILoader";

interface TanodPortalHeaderProps {
  profile: User | null;
  setIsReportFormOpen: (open: boolean) => void;
  setIsAboutOpen: (open: boolean) => void;
}

export function TanodPortalHeader({
  profile,
  setIsReportFormOpen,
  setIsAboutOpen,
}: TanodPortalHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 mb-10 relative glass-panel p-6 sm:p-8 rounded-[32px] sm:rounded-[48px] border-white/10 skew-card overflow-hidden shadow-2xl"
    >
      <div className="scanline opacity-20 pointer-events-none" />
      <div className="tactical-bg-glow absolute inset-0 rounded-[32px] sm:rounded-[48px] pointer-events-none" />

      <div className="relative z-10 w-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-[8px] sm:text-[9px] font-mono text-success font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">
              Unit Identity: Verified
            </span>
          </div>
          <GuardianAILoader variant="compact" />
        </div>
        <h2 className="text-xl sm:text-2xl md:text-5xl font-black italic tracking-tighter uppercase text-white font-mono leading-none flex items-center gap-2 sm:gap-4 outline-text flex-wrap">
          <IconRadar className="w-8 h-8 sm:w-10 sm:h-10 text-success animate-pulse" />
          <span>RESPONDER</span>
          <span className="text-success"> PORTAL</span>
        </h2>
        <p className="text-[8px] sm:text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-3 bg-white/5 inline-block px-3 py-1 rounded-full border border-white/5">
          Tactical Interface
        </p>
      </div>

      <div className="flex flex-row items-center gap-2 sm:gap-4 w-full md:w-auto relative z-10">
        <motion.button
          whileHover={{
            scale: 1.02,
            backgroundColor: "rgba(239, 68, 68, 0.9)",
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsReportFormOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-5 rounded-xl sm:rounded-2xl bg-emergency text-white transition-all group shadow-glow-red border-b-2 sm:border-b-4 border-emergency/30"
        >
          <FilePlus className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] sm:text-[14px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] font-mono italic">
            FILE_INTEL
          </span>
        </motion.button>
        <button
          onClick={() => setIsAboutOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
        >
          <Info className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
          <span className="text-[8px] sm:text-[10px] font-bold text-white/40 group-hover:text-white uppercase tracking-[0.1em] sm:tracking-[0.25em] font-mono">
            APP BRIEF
          </span>
        </button>
      </div>
    </motion.div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { motion, useAnimation } from "motion/react";
import { cn } from "../lib/utils";

interface LongPressButtonProps {
  onComplete: () => void;
  text: string;
  subtext?: string;
  duration?: number;
  className?: string;
  color?: "emergency" | "cyan" | "info";
}

export const LongPressButton: React.FC<LongPressButtonProps> = ({
  onComplete,
  text,
  subtext,
  duration = 3000,
  className,
  color = "emergency",
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const controls = useAnimation();

  const colorClasses = {
    emergency: "bg-tactical-red text-white border-tactical-red shadow-glow-red",
    cyan: "bg-tactical-cyan text-black border-tactical-cyan shadow-glow-cyan",
    info: "bg-info text-white border-info shadow-glow-info",
  };

  const ghostClasses = {
    emergency:
      "bg-tactical-red/10 text-tactical-red border-tactical-red/30 hover:bg-tactical-red/20",
    cyan: "bg-tactical-cyan/10 text-tactical-cyan border-tactical-cyan/30 hover:bg-tactical-cyan/20",
    info: "bg-info/10 text-info border-info/30 hover:bg-info/20",
  };

  const handleStart = () => {
    setIsPressing(true);
    startTimeRef.current = Date.now();
    setProgress(0);
    const spokenSecondsRef = { current: -1 };

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    controls.start({
      scale: 0.95,
      transition: { duration: 0.1 },
    });

    const step = () => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      const totalSeconds = Math.floor(duration / 1000);
      const currentSecond = Math.floor(elapsed / 1000);

      if (
        currentSecond > spokenSecondsRef.current &&
        currentSecond < totalSeconds
      ) {
        spokenSecondsRef.current = currentSecond;
        const remaining = totalSeconds - currentSecond;

        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(remaining.toString());
          utterance.rate = 1.5;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      }

      if (currentProgress < 100) {
        timerRef.current = setTimeout(step, 50);
      } else {
        setIsPressing(false);
        handleComplete();
      }
    };

    step();
  };

  const handleEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPressing(false);
    setProgress(0);
    startTimeRef.current = 0;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    controls.start({
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    });
  };

  const handleComplete = () => {
    onComplete();
    startTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={cn("relative flex flex-col items-center gap-2", className)}>
      <motion.button
        animate={controls}
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        className={cn(
          "relative overflow-hidden px-8 py-4 rounded-[28px] border transition-all select-none cursor-pointer",
          isPressing ? colorClasses[color] : ghostClasses[color]
        )}
      >
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-xs font-black uppercase tracking-[0.2em] font-mono whitespace-nowrap">
            {text}
          </span>
        </div>

        {/* Tactical Progress Bar (Background) */}
        <motion.div
          className={cn(
            "absolute inset-0 z-0 origin-left opacity-30",
            color === "emergency" ? "bg-white" : "bg-black"
          )}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.1 }}
        />

        {/* Animated Background Pulse when pressing */}
        {isPressing && (
          <motion.div
            className="absolute inset-0 z-0 bg-white/10"
            animate={{ opacity: [0, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </motion.button>

      {subtext && (
        <span
          className={cn(
            "text-[8px] font-black uppercase tracking-[0.3em] font-mono transition-opacity",
            isPressing ? "text-white opacity-100" : "text-white/20 opacity-100"
          )}
        >
          {isPressing ? `HOLDING... ${Math.round(progress)}%` : subtext}
        </span>
      )}
    </div>
  );
};

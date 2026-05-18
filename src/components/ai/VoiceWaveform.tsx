import React from 'react';
import { motion } from 'motion/react';

interface VoiceWaveformProps {
  active: boolean;
  color?: string;
  count?: number;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ active, color = "#22d3ee", count = 5 }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          animate={active ? {
            height: [12, 48, 16, 32, 12],
          } : {
            height: 4
          }}
          transition={active ? {
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          } : {
            duration: 0.3
          }}
          className="w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

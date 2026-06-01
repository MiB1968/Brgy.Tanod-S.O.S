import { motion, AnimatePresence } from 'motion/react';

export function PoliceLights({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active}
      {active && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-4 flex">
            <motion.div 
              className="flex-1 bg-red-600 shadow-[0_0_40px_20px_rgba(220,38,38,0.9)]"
              animate={{ opacity: [0, 1, 0, 0, 0] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            <motion.div 
              className="flex-1 bg-blue-600 shadow-[0_0_40px_20px_rgba(37,99,235,0.9)]"
              animate={{ opacity: [0, 0, 0, 1, 0] }}
              transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }}
            />
          </div>
          
          {/* Screen Vignette Flash with Rings */}
          <motion.div 
            className="absolute inset-0 border-[10px] sm:border-[40px] border-red-600/20"
            animate={{ opacity: [0, 1, 0, 0, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute inset-0 border-[10px] sm:border-[40px] border-blue-600/20"
            animate={{ opacity: [0, 0, 0, 1, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
          />
          
          {/* Pulsing Central Rings (Codepen rggjXp inspiration) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <motion.div 
              className="absolute w-[30vw] h-[30vw] border-8 border-red-600 rounded-full"
              animate={{ scale: [0.5, 2], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div 
              className="absolute w-[30vw] h-[30vw] border-8 border-blue-600 rounded-full"
              animate={{ scale: [0.5, 2], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.75 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

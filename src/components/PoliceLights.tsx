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
          
          {/* Screen Vignette Flash */}
          <motion.div 
            className="absolute inset-0 border-[20px] border-red-600/20"
            animate={{ opacity: [0, 1, 0, 0, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute inset-0 border-[20px] border-blue-600/20"
            animate={{ opacity: [0, 0, 0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

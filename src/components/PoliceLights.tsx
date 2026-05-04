import { motion, AnimatePresence } from 'motion/react';

export function PoliceLights({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 h-4 z-[9999] pointer-events-none flex"
        >
          <motion.div 
            className="flex-1 bg-red-600 shadow-[0_0_40px_10px_rgba(220,38,38,0.8)]"
            animate={{ opacity: [0, 1, 0, 0, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
          <motion.div 
            className="flex-1 bg-blue-600 shadow-[0_0_40px_10px_rgba(37,99,235,0.8)]"
            animate={{ opacity: [0, 0, 0, 1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

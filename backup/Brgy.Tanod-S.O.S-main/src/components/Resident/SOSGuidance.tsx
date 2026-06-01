import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { guardianAI } from '../../services/guardianAIService';
import { isWebLLMReady } from '../../lib/webllm';

interface SOSGuidanceProps {
  type: string;
}

export const SOSGuidance: React.FC<SOSGuidanceProps> = ({ type }) => {
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSteps = async () => {
      if (!isWebLLMReady()) {
        // Basic fallback
        const basics = {
          FIRE: ['Lisanin agad ang gusali.', 'Tumawag sa 911.', 'Huwag gumamit ng elevator.'],
          MEDICAL: ['Tingnan kung humihinga ang biktima.', 'Huwag galawin kung may tama sa leeg.', 'Tumawag sa ambulansya.'],
          CRIME: ['Pumunta sa ligtas na lugar.', 'Huwag lumaban kung may sandata.', 'Tandaan ang itsura ng salarin.'],
        };
        setSteps(basics[type as keyof typeof basics] || ['Manatiling kalmado.', 'Hintayin ang pagdating ng Tanod.', 'Humingi ng tulong sa kapitbahay.']);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const raw = await guardianAI.generateFirstAid(type);
        const split = raw.split('\n').filter(s => s.trim().length > 3).map(s => s.replace(/^\d+[.)\s]*/, '').trim());
        setSteps(split.length > 0 ? split : ['Manatiling kalmado.']);
      } catch (e) {
        console.error("Guidance error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [type]);

  return (
    <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-3xl p-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
          <BookOpen className="text-white w-5 h-5" />
        </div>
        <h4 className="text-white font-black italic text-sm tracking-tighter uppercase font-mono">
          Guardian Tactical Advice
        </h4>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] animate-pulse">
          <Loader2 className="animate-spin w-3 h-3" />
          CONSULTING GUARDIAN AI...
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 group"
            >
              <div className="mt-1 flex-shrink-0">
                <ChevronRight size={14} className="text-cyan-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-white/80 font-medium font-mono italic leading-relaxed">
                {step}
              </p>
            </motion.div>
          ))}
          <div className="pt-4 mt-4 border-t border-white/5">
            <p className="text-[9px] text-cyan-400/40 font-mono tracking-widest uppercase">
              Offline First-Aid via On-Device AI
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Cpu, Zap, Shield, AlertCircle, ChevronRight, CheckCircle, MapPin, Users } from "lucide-react";
import { ai } from "../../lib/api";
import { Alert } from "../../types";
import { toast } from "react-hot-toast";
import { TacticalCard } from "../Tactical/TacticalCard";
import { TacticalButton } from "../Tactical/TacticalButton";

interface GuardianDispatcherProps {
  activeAlert: Alert | null;
  onDispatchToUnit: (alert: Alert, unitId: string) => Promise<void>;
}

export function GuardianDispatcher({ activeAlert, onDispatchToUnit }: GuardianDispatcherProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const performAnalysis = async () => {
    if (!activeAlert) return;
    
    setIsAnalyzing(true);
    try {
      const result = await ai.analyze(activeAlert.description || activeAlert.type, activeAlert.type);
      if (result && result.success) {
        setAnalysis(result.analysis);
      }
    } catch (err) {
      console.error("AI Dispatch Analysis failed:", err);
      toast.error("Guardian AI Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (activeAlert) {
      performAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [activeAlert?.id]);

  if (!activeAlert) return null;

  return (
    <div className="space-y-4">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-tactical-cyan/10 rounded-lg border border-tactical-cyan/20 group-hover:border-tactical-cyan/50 transition-all">
            <Bot className="w-5 h-5 text-tactical-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest font-display italic">
              Guardian AI Dispatcher
            </h3>
            <p className="text-[10px] text-white/40 font-mono uppercase">
              Autonomous Intelligence Loop
            </p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-white/20 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <TacticalCard className="border-tactical-cyan/20 bg-tactical-cyan/5">
              {isAnalyzing ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-2 border-tactical-cyan/20 rounded-full animate-ping" />
                    <Cpu className="w-6 h-6 text-tactical-cyan absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-[10px] font-black text-tactical-cyan uppercase tracking-[0.3em] animate-pulse">
                    Analyzing Incident Data...
                  </p>
                </div>
              ) : analysis ? (
                <div className="space-y-6">
                  {/* Analysis Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          analysis.severityScore >= 8 ? 'bg-tactical-red/20 text-tactical-red' : 
                          analysis.severityScore >= 5 ? 'bg-amber-500/20 text-amber-500' : 
                          'bg-emerald-500/20 text-emerald-500'
                        }`}>
                          Severity Level: {analysis.severityScore}/10
                        </span>
                        <span className="bg-white/5 text-white/40 px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono">
                          {analysis._modelUsed || 'GEN-PRO'}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-white uppercase italic font-display tracking-tight">
                        {analysis.incidentType.replace('_', ' ')}
                      </h4>
                    </div>
                    <Zap className="w-6 h-6 text-tactical-cyan opacity-50" />
                  </div>

                  {/* Summary */}
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-white/80 leading-relaxed font-medium">
                      {analysis.summary}
                    </p>
                  </div>

                  {/* Tactical Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 font-mono">Urgency</p>
                      <p className="text-sm font-bold text-white uppercase italic">{analysis.urgency}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 font-mono">Est. Response</p>
                      <p className="text-sm font-bold text-white uppercase italic">{analysis.estimatedResponseTimeMins} MINS</p>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div>
                    <p className="text-[9px] font-black text-tactical-red uppercase mb-2 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Potential Risk Factors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.riskFactors.map((risk: string, i: number) => (
                        <span key={i} className="text-[10px] text-white/60 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                          {risk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Dispatch */}
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <p className="text-[9px] font-black text-tactical-cyan uppercase mb-3 flex items-center gap-2">
                      <Users className="w-3 h-3" /> Recommended Units
                    </p>
                    {analysis.recommendedResponders.map((responder: string, i: number) => (
                      <div key={i} className="flex items-center justify-between group/unit bg-black/20 p-3 rounded-xl border border-white/5 hover:border-tactical-cyan/40 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-tactical-cyan/10 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-tactical-cyan" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase">{responder}</p>
                            <p className="text-[9px] text-white/40 font-mono">AVAILABLE FOR DISPATCH</p>
                          </div>
                        </div>
                        <button className="text-[9px] font-black text-tactical-cyan uppercase tracking-widest bg-tactical-cyan/10 px-3 py-1.5 rounded-lg opacity-0 group-hover/unit:opacity-100 transition-all active:scale-95">
                          Select Unit
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex gap-3">
                    <TacticalButton 
                      label="Confirm AI Dispatch"
                      className="flex-1"
                      onClick={() => performAnalysis()} // Placeholder for actual multi-dispatch
                    />
                    <button 
                      onClick={() => setAnalysis(null)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5"
                    >
                      Dismiss
                    </button>
                  </div>

                  {analysis.broadcastRecommendation?.shouldBroadcast && (
                    <div className="bg-tactical-red/10 border border-tactical-red/20 p-3 rounded-xl mt-4">
                      <p className="text-[8px] font-black text-tactical-red uppercase mb-1">AI BROADCAST SUGGESTION</p>
                      <p className="text-[10px] text-white font-medium italic underline decoration-tactical-red/30">
                        {analysis.broadcastRecommendation.message}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[10px] text-white/40 font-mono uppercase italic">
                    Analysis engine idle. Reviewing alert logs...
                  </p>
                  <button 
                    onClick={performAnalysis}
                    className="mt-4 text-[9px] font-black text-tactical-cyan uppercase tracking-widest hover:underline"
                  >
                    Force Analysis Run
                  </button>
                </div>
              )}
            </TacticalCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

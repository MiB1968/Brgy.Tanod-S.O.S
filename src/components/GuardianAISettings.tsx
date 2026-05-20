// src/components/GuardianAISettings.tsx
import { useState, useEffect } from 'react';
import { guardianAI } from '../services/guardianAI';
import { Settings, Download, Trash2, Volume2, X } from 'lucide-react';

export default function GuardianAISettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [models] = useState([
    { id: "Qwen2-0.5B-Instruct-q4f16_1-MLC", name: "Qwen2 0.5B (Lightweight)", size: "~0.5 GB", speed: "Instant responses" },
    { id: "Phi-3.5-mini-instruct-q4f16_1", name: "Phi-3.5 Mini (High Quality)", size: "~2.1 GB", speed: "Detailed guidelines" },
    { id: "Llama-3.2-3B-Instruct-q4f16_1", name: "Llama 3.2 3B (Complete)", size: "~2.3 GB", speed: "Robust Tagalog support" },
  ]);

  const [currentModel, setCurrentModel] = useState("Qwen2-0.5B-Instruct-q4f16_1-MLC");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.type === 'progress') {
        setProgress(Math.round(e.detail.payload.progress));
      }
    };
    window.addEventListener('guardian-ai-event', handler);
    return () => window.removeEventListener('guardian-ai-event', handler);
  }, []);

  const loadModel = async (modelId: string) => {
    setIsLoading(true);
    setProgress(0);
    setCurrentModel(modelId);

    try {
      await guardianAI.loadModel(modelId, (prog) => setProgress(prog));
      alert(`✅ ${models.find(m => m.id === modelId)?.name} is ready for offline safety duty!`);
    } catch (err) {
      alert("Fail loading model. Make sure WebGPU is enabled, and your browser supports offline caches.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    if (confirm("Clear AI model cache? This will clean up storage but requires downloading files again upon restart.")) {
      guardianAI.clearCache();
      setProgress(0);
      alert("🧹 Guardian AI model storage cache cleared.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
      <div className="bg-[#0a1428] border border-purple-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full filter blur-xl pointer-events-none"></div>

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="text-purple-400 w-6 h-6 animate-spin-slow" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Guardian AI Offline Settings</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5 font-mono">Model Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Model */}
          <div>
            <h3 className="text-xs font-mono uppercase text-gray-400 tracking-wider mb-2">Active Offline Brain</h3>
            <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl">
              <p className="font-semibold text-slate-100">{models.find(m => m.id === currentModel)?.name}</p>
              <p className="text-[10px] text-purple-400 font-mono mt-1 uppercase tracking-wider">WebGPU ACCELERATED</p>
            </div>
          </div>

          {/* Available Models */}
          <div>
            <h3 className="text-xs font-mono uppercase text-gray-400 tracking-wider mb-3">Model Selection</h3>
            <div className="space-y-2.5">
              {models.map((model) => (
                <div key={model.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-3.5 rounded-2xl hover:bg-black/60 transition">
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{model.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{model.size} • {model.speed}</p>
                  </div>
                  <button
                    onClick={() => loadModel(model.id)}
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 text-white rounded-xl text-xs font-bold tracking-wide uppercase transition"
                  >
                    {isLoading && currentModel === model.id ? "Loading..." : "Load"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          {isLoading && (
            <div className="bg-purple-950/20 border border-purple-500/20 p-4 rounded-2xl">
              <div className="flex justify-between items-center text-xs text-purple-400 mb-2">
                <span className="font-mono uppercase tracking-widest">Downloading AI Model...</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-2 italic">Stored locally in your browser sandbox</p>
            </div>
          )}

          {/* Voice Settings */}
          <div>
            <h3 className="text-xs font-mono uppercase text-gray-400 tracking-wider mb-3">Sound & feedback</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group text-sm text-gray-300">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="text-gray-400 w-4 h-4" />
                  <span>Enable Tagalog Auditory Responses</span>
                </div>
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-sm text-gray-300">
                <span>Auto-speak emergency recommendations</span>
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-white/5 flex gap-3">
          <button
            onClick={clearCache}
            className="flex-1 py-3 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-2xl font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 size={16} /> Clean Cache
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

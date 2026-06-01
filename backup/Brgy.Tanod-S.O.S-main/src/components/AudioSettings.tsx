import { useState, useEffect } from "react";
import { EmergencySoundManager } from "../lib/EmergencySoundManager";

export default function AudioSettings() {
  const [volume, setVolume] = useState(0.85);
  const [ttsRate, setTtsRate] = useState(0.94);
  const [ttsPitch, setTtsPitch] = useState(1.05);

  useEffect(() => {
    // Load from localStorage
    const savedVol = localStorage.getItem("emergencyVolume");
    if (savedVol) setVolume(parseFloat(savedVol));
  }, []);

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    EmergencySoundManager.getInstance().setMasterVolume(val);
    localStorage.setItem("emergencyVolume", val.toString());
  };

  const testAlert = () => {
    EmergencySoundManager.getInstance().triggerEmergency("test", {
      speak: true,
    });
  };

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <h3 className="text-xl font-bold mb-6 text-white uppercase tracking-widest text-[10px]">
        <span className="text-teal-400 mr-2">🔊</span> Audio & Voice Settings
      </h3>

      <div className="space-y-8 relative z-10">
        <div>
          <label className="block text-xs font-medium mb-2 text-white/70 uppercase tracking-wider">
            Master Volume:{" "}
            <span className="text-white">{Math.round(volume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-2 text-white/70 uppercase tracking-wider">
            TTS Speed: <span className="text-white">{ttsRate.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.01"
            value={ttsRate}
            onChange={(e) => setTtsRate(parseFloat(e.target.value))}
            className="w-full accent-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-2 text-white/70 uppercase tracking-wider">
            TTS Pitch: <span className="text-white">{ttsPitch.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.01"
            value={ttsPitch}
            onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
            className="w-full accent-teal-500"
          />
        </div>

        <button
          onClick={testAlert}
          className="w-full py-3 bg-teal-500/20 hover:bg-teal-500/40 text-teal-300 rounded-lg font-bold uppercase tracking-widest text-xs border border-teal-500/50 transition-all border-dashed mt-4"
        >
          Test Emergency Alert
        </button>
      </div>
    </div>
  );
}

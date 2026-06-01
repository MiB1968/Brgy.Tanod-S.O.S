import { useState, useEffect } from 'react';
import { X, Volume2, Mic, Settings, Save } from 'lucide-react';

export interface VoiceSettings {
  voiceId: string;
  speed: number;
  pitch: number;
  stability: number;
  similarity: number;
  style: number;
  wakeWord: string;
  language: 'en' | 'fil';
  volume: number;
  autoListen: boolean;
}

export const defaultSettings: VoiceSettings = {
  voiceId: "default",
  speed: 0.92,
  pitch: 1.05,
  stability: 0.85,
  similarity: 0.95,
  style: 0.45,
  wakeWord: "guardian",
  language: 'en',
  volume: 0.95,
  autoListen: true,
};

export function JarvisSettingsPanel({
  isOpen,
  onClose,
  onSave,
  initialSettings
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: VoiceSettings) => void;
  initialSettings: VoiceSettings;
}) {
  const [settings, setSettings] = useState<VoiceSettings>(initialSettings);
  const [previewText, setPreviewText] = useState("Systems online. How may I assist you, Sir?");

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, isOpen]);

  // Preview voice
  const playPreview = () => {
    const utterance = new SpeechSynthesisUtterance(previewText);
    utterance.rate = settings.speed;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
      <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="text-amber-400" size={24} />
            <h2 className="text-2xl font-bold text-amber-400 tracking-widest">JARVIS SETTINGS</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {/* Voice Profile */}
          <div>
            <label className="text-sm text-gray-400 block mb-2 font-mono">VOICE PROFILE</label>
            <div className="bg-zinc-900 rounded-2xl p-4 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-amber-500">JARVIS Prime</p>
                  <p className="text-xs text-gray-500">ElevenLabs • British • Premium</p>
                </div>
                <button
                  onClick={playPreview}
                  className="flex items-center gap-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/50 px-4 py-2 rounded-xl text-sm transition"
                >
                  <Volume2 size={18} /> Preview
                </button>
              </div>
            </div>
          </div>

          {/* Speech Parameters */}
          <div className="space-y-6">
            <div>
              <label className="flex justify-between text-sm text-gray-400 mb-2 font-mono">
                <span>Speed</span>
                <span className="text-amber-500">{settings.speed.toFixed(2)}x</span>
              </label>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.01"
                value={settings.speed}
                onChange={(e) => setSettings({ ...settings, speed: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400 mb-2 font-mono">
                <span>Pitch</span>
                <span className="text-amber-500">{settings.pitch.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.01"
                value={settings.pitch}
                onChange={(e) => setSettings({ ...settings, pitch: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400 mb-2 font-mono">
                <span>Stability</span>
                <span className="text-amber-500">{settings.stability.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.stability}
                onChange={(e) => setSettings({ ...settings, stability: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400 mb-2 font-mono">
                <span>Style / Emotion</span>
                <span className="text-amber-500">{settings.style.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.style}
                onChange={(e) => setSettings({ ...settings, style: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Wake Word & Language */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-400 block mb-2 font-mono">WAKE WORD</label>
              <input
                type="text"
                value={settings.wakeWord}
                onChange={(e) => setSettings({ ...settings, wakeWord: e.target.value.toLowerCase() })}
                className="w-full bg-zinc-900 border border-amber-500/30 rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-500 text-white"
                placeholder="e.g. guardian"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2 font-mono">LANGUAGE MODE</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value as 'en' | 'fil' })}
                className="w-full bg-zinc-900 border border-amber-500/30 rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-500 text-white"
              >
                <option value="en">English (British JARVIS)</option>
                <option value="fil">Fluent Tagalog / Taglish</option>
              </select>
            </div>
          </div>

          {/* Preview Text */}
          <div>
            <label className="text-sm text-gray-400 block mb-2 font-mono">PREVIEW TEXT</label>
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              className="w-full h-20 bg-zinc-900 border border-amber-500/30 rounded-2xl p-4 text-sm resize-y focus:outline-none focus:border-amber-500 text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoListen}
              onChange={(e) => setSettings({ ...settings, autoListen: e.target.checked })}
              className="w-5 h-5 accent-amber-500"
            />
            <span className="text-sm text-gray-300">Always Listening Mode (after activation)</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-amber-500/30 p-4 flex gap-3 flex-shrink-0 bg-zinc-950">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-semibold flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            <Save size={20} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

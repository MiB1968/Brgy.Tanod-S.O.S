// src/components/GuardianButton.tsx
import React, { useState, useRef } from 'react';
import { useTTS } from '../hooks/useTTS';
import { AlertTriangle, Volume2, VolumeX, Loader2 } from 'lucide-react';

const PRESET_ALERTS = [
  { id: 1, label: "Standard", message: "Alert! May tanod na nangangailangan ng tulong sa lokasyon mo. Tumugon agad!" },
  { id: 2, label: "Emergency", message: "Emergency! May krimen o sakuna. Pumunta agad sa lokasyon." },
  { id: 3, label: "Medical", message: "Medical emergency! May aksidente o masakit. Tulungan agad." },
  { id: 4, label: "Check-in", message: "Tanod check-in: Safe ba ang area mo? Magreport kung may problema." },
];

type ButtonState = 'idle' | 'pressing' | 'activated';

export default function GuardianButton() {
  const { speak, isReady, isSpeaking, isLoading, error, stop, queueLength, retryCount } = useTTS();

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [progress, setProgress] = useState(0);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const hasActivated = useRef(false);
  const HOLD_DURATION = 900; // ms

  const triggerVibration = (pattern: number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const startHold = (e: React.PointerEvent) => {
    if (!isReady || isSpeaking || e.pointerType === 'mouse' && e.button !== 0) return;
    if (!e.isPrimary) return; // Prevent multi-touch interference

    hasActivated.current = false;
    setButtonState('pressing');
    setProgress(0);
    triggerVibration([40]);

    const startTime = Date.now();

    // Progress ring
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
    }, 16);

    // Activation timer
    pressTimer.current = setTimeout(() => {
      activateBroadcast();
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    if (buttonState === 'pressing') {
      setButtonState('idle');
      setProgress(0);
      triggerVibration([20]); // Cancel feedback
    }
  };

  const activateBroadcast = () => {
    if (hasActivated.current) return;
    hasActivated.current = true;

    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);

    setButtonState('activated');
    setProgress(100);
    triggerVibration([60, 40, 60]); // Strong success vibration

    const alert = PRESET_ALERTS[selectedPreset];
    speak(alert.message, { lang: 'tl', speed: 1.0, priority: 'high' });

    // Reset after activation
    setTimeout(() => {
      setButtonState('idle');
      setProgress(0);
      hasActivated.current = false;
    }, 600);
  };

  const handlePresetChange = (index: number) => {
    triggerVibration([30]);
    setSelectedPreset(index);
  };

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6">
      {/* Long-Press Guardian Button */}
      <div className="relative">
        <button
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          disabled={!isReady || isSpeaking}
          className={`
            relative w-28 h-28 rounded-3xl flex items-center justify-center
            transition-all duration-200 shadow-2xl active:scale-[0.95]
            ${isSpeaking || buttonState === 'activated'
              ? 'bg-orange-600 scale-110 shadow-orange-500/50' 
              : 'bg-red-600 hover:bg-red-700'
            }
            disabled:bg-gray-700
          `}
        >
          {isLoading && <Loader2 className="w-12 h-12 text-white animate-spin" />}

          {(isSpeaking || buttonState === 'activated') && (
            <Volume2 className="w-14 h-14 text-white animate-pulse" />
          )}

          {!isLoading && !isSpeaking && buttonState !== 'activated' && (
            <>
              <AlertTriangle className="w-14 h-14 text-white" />
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-red-900 text-[11px] font-bold w-7 h-7 rounded-full flex items-center justify-center border-2 border-white">
                SOS
              </div>
            </>
          )}

          {/* Progress Ring */}
          {(buttonState === 'pressing' || buttonState === 'activated') && (
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff20" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="#ffffff"
                strokeWidth="8"
                strokeDasharray={288}
                strokeDashoffset={288 - (progress / 100) * 288}
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        {buttonState === 'pressing' && (
          <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-white text-xs font-medium tracking-widest">
            HOLD TO BROADCAST
          </div>
        )}
      </div>

      {/* Status */}
      <div className="text-center">
        <p className="font-bold text-xl text-white tracking-widest">GUARDIAN</p>
        <p className="text-sm text-gray-400">
          {isSpeaking ? "Binabasa ang alert..." : "Hold 0.9s para i-broadcast"}
        </p>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-wrap justify-center gap-2 max-w-[340px]">
        {PRESET_ALERTS.map((alert, idx) => (
          <button
            key={alert.id}
            onClick={() => handlePresetChange(idx)}
            className={`px-4 py-2 text-xs rounded-2xl transition-all ${
              selectedPreset === idx ? 'bg-white text-red-600 font-semibold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {alert.label}
          </button>
        ))}
      </div>

      {/* Status Indicators */}
      <div className="flex flex-col items-center gap-1 text-[11px] text-gray-500">
        {isReady && <span className="text-green-500">● Supertonic TTS Ready</span>}
        {queueLength > 0 && <span className="text-amber-500">Queued: {queueLength}</span>}
        {retryCount > 0 && <span className="text-orange-500">Retrying... ({retryCount}/3)</span>}
        {error && <span className="text-red-500 text-center px-4">{error}</span>}
      </div>

      {/* Emergency Stop */}
      {isSpeaking && (
        <button
          onClick={stop}
          className="mt-2 px-8 py-3 bg-gray-900 hover:bg-gray-800 border border-red-900/50 rounded-2xl text-white flex items-center gap-2 text-sm"
        >
          <VolumeX className="w-5 h-5" />
          ITIGIL ANG PAGBABASA
        </button>
      )}
    </div>
  );
}

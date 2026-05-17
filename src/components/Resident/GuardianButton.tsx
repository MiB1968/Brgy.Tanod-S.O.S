// src/components/Resident/GuardianButton.tsx
import React, { useState, useRef, useCallback } from 'react';
import { useTTS } from '../../hooks/useTTS';
import { useEmergencySound } from '../../lib/EmergencySoundManager';
import { emergencySSML } from '../../lib/ssmlTagalog';
import './GuardianButton.css';

type ButtonState = 'idle' | 'pressing' | 'activated';

const HOLD_DURATION = 900; // milliseconds

interface GuardianButtonProps {
  onInitiateSOS?: () => void;
}

export const GuardianButton: React.FC<GuardianButtonProps> = ({ onInitiateSOS }) => {
  const { speak, stop: stopTTS } = useTTS();
  const { triggerEmergency, stopAll: stopSounds } = useEmergencySound();

  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [progress, setProgress] = useState(0);
  const [isTestMode, setIsTestMode] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetButton = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    setButtonState('idle');
    setProgress(0);
  }, []);

  const handlePressStart = useCallback(() => {
    setButtonState('pressing');
    setProgress(0);

    const startTime = Date.now();

    // Progress ring animation
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
    }, 16);

    // Hold timer
    timerRef.current = setTimeout(() => {
      activateSOS();
    }, HOLD_DURATION);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (buttonState === 'activated') return;
    resetButton();
  }, [buttonState, resetButton]);

  const activateSOS = async () => {
    setButtonState('activated');
    stopTTS();
    stopSounds();

    try {
      // Trigger full emergency audio experience
      await triggerEmergency('sos', { useSiren: true });

      // Urgent Tagalog voice with SSML
      await speak({
        ssml: emergencySSML.sosActivated,
        style: 'urgent',
        priority: 'high',
      });

      // Follow-up reassuring message
      setTimeout(() => {
        speak({
          phraseKey: 'helpComing',
          style: 'reassuring',
          priority: 'normal',
        });
      }, 1400);
      
      if (onInitiateSOS) {
          onInitiateSOS();
      }

    } catch (error) {
      console.error('SOS Activation Error:', error);
    }
  };

  const cancelSOS = () => {
    stopTTS();
    stopSounds();
    resetButton();
    
    speak({
      phraseKey: 'sosCancelled',
      style: 'calm',
      priority: 'normal',
    });
  };

  const toggleTestMode = () => {
    setIsTestMode(prev => !prev);
    if (!isTestMode) {
      speak({
        text: "Test mode activated. Holding the button will not send real alerts.",
        style: 'calm',
      });
    }
  };

  return (
    <div className="guardian-button-container">
      <button
        className={`guardian-button ${buttonState}`}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onPointerCancel={handlePressEnd}
        disabled={buttonState === 'activated'}
        aria-label={isTestMode ? "Test SOS Button" : "Emergency SOS Button"}
        aria-pressed={buttonState === 'activated'}
      >
        <div className="button-content">
          <div className="icon">
            {buttonState === 'activated' ? '✅' : '🛡️'}
          </div>
          <div className="text">
            {buttonState === 'idle' && (isTestMode ? "TEST MODE\nHold to Simulate" : "HOLD TO ACTIVATE\nSOS")}
            {buttonState === 'pressing' && "HOLDING..."}
            {buttonState === 'activated' && "SOS ACTIVATED\nHELP IS COMING"}
          </div>
        </div>

        {/* Progress Ring */}
        {buttonState === 'pressing' && (
          <svg className="progress-ring" width="230" height="230" viewBox="0 0 120 120">
            <circle className="bg" cx="60" cy="60" r="54" />
            <circle 
              className="progress" 
              cx="60" 
              cy="60" 
              r="54"
              strokeDasharray={338}
              strokeDashoffset={338 - (338 * progress) / 100}
            />
          </svg>
        )}
      </button>

      {/* Action Buttons */}
      <div className="guardian-actions">
        <button 
          onClick={toggleTestMode} 
          className="test-mode-btn"
        >
          {isTestMode ? "Exit Test Mode" : "Enable Test Mode"}
        </button>

        {buttonState === 'activated' && (
          <button 
            onClick={cancelSOS} 
            className="cancel-sos-btn"
          >
            CANCEL SOS
          </button>
        )}
      </div>
    </div>
  );
};

// src/components/Resident/FloatingGuardianButton.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTTS } from '../../hooks/useTTS';
import { useEmergencySound } from '../../lib/EmergencySoundManager';
import { emergencySSML } from '../../lib/ssmlTagalog';
import './FloatingGuardianButton.css';

type ButtonState = 'idle' | 'pressing' | 'activated';

const HOLD_DURATION = 900;

export const FloatingGuardianButton: React.FC = () => {
  const { speak, stop: stopTTS } = useTTS();
  const { triggerEmergency, stopAll: stopSounds } = useEmergencySound();

  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [progress, setProgress] = useState(0);
  const [isTestMode, setIsTestMode] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem('floatingSOSPosition');
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved);
        setPosition({ x: Math.max(10, x), y: Math.max(10, y) });
      } catch (e) {}
    }
  }, []);

  const savePosition = (x: number, y: number) => {
    localStorage.setItem('floatingSOSPosition', JSON.stringify({ x, y }));
  };

  const resetButton = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setButtonState('idle');
    setProgress(0);
  }, []);

  // ==================== DRAG LOGIC ====================
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (buttonState === 'activated') return;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };

    // Start hold timer for SOS
    setButtonState('pressing');
    setProgress(0);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / HOLD_DURATION) * 100, 100));
    }, 16);

    timerRef.current = setTimeout(() => {
      activateSOS();
    }, HOLD_DURATION);
  }, [position, buttonState]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    
    // Ignore movement if we are not pressing the button
    if (buttonState === 'idle') return;
    
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY; // positive is down in screen coords
    // however our layout is bottom/left oriented. 
    // Wait, the styles use `left` and `bottom`. So dy should affect `bottom` negatively.
    // dx affects `left` positively.

    // Consider it dragging if moved more than 8px
    if (!drag.isDragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      drag.isDragging = true;
      resetButton(); // Cancel SOS activation if dragging
    }

    if (drag.isDragging) {
      const newX = Math.max(10, Math.min(window.innerWidth - 90, drag.initialX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 90, drag.initialY - dy));

      setPosition({ x: newX, y: newY });
    }
  }, [buttonState, resetButton]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      savePosition(position.x, position.y);
    } else if (buttonState !== 'activated') {
      resetButton();
    }
    dragRef.current.isDragging = false;
  }, [position, buttonState, resetButton]);

  const activateSOS = async () => {
    setButtonState('activated');
    stopTTS();
    stopSounds();

    try {
      await triggerEmergency('sos', { useSiren: true });

      await speak({
        ssml: emergencySSML.sosActivated,
        style: 'urgent',
        priority: 'high',
      });

      setTimeout(() => {
        speak({ phraseKey: 'helpComing', style: 'reassuring' });
      }, 1400);
    } catch (error) {
      console.error('SOS Error:', error);
    }
  };

  const cancelSOS = () => {
    stopTTS();
    stopSounds();
    resetButton();
    speak({ phraseKey: 'sosCancelled', style: 'calm' });
  };

  return (
    <>
      <button
        ref={buttonRef}
        className={`floating-guardian-btn ${buttonState}`}
        style={{
          left: `${position.x}px`,
          bottom: `${position.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={buttonState === 'activated'}
        aria-label="Emergency SOS Button"
      >
        <div className="floating-content">
          <span className="icon">
            {buttonState === 'activated' ? '✅' : '🛡️'}
          </span>
          <span className="label">
            {buttonState === 'activated' ? 'SOS ACTIVE' : 'SOS'}
          </span>
        </div>

        {buttonState === 'pressing' && (
          <svg className="progress-ring" width="92" height="92" viewBox="0 0 100 100">
            <circle className="bg" cx="50" cy="50" r="46" />
            <circle 
              className="progress" 
              cx="50" 
              cy="50" 
              r="46"
              strokeDasharray={289}
              strokeDashoffset={289 - (289 * progress) / 100}
            />
          </svg>
        )}
      </button>

      {buttonState === 'activated' && (
        <button onClick={cancelSOS} className="floating-cancel-btn">
          CANCEL SOS
        </button>
      )}
    </>
  );
};

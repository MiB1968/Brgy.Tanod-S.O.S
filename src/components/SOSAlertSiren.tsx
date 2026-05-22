import React, { useState, useRef, useEffect } from "react";
import { Haptics } from "../lib/haptics";

interface Props {
  onSOS: (data: any) => Promise<void>;
}

export default function SOSAlertSiren({ onSOS }: Props) {
  const [position, setPosition] = useState({ x: 24, y: 140 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle Long Press for SOS
  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(true);
    Haptics.shortPress();

    pressTimer.current = setTimeout(() => {
      Haptics.emergencySOS();
      triggerSOS();
    }, 650); // Long press threshold
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const triggerSOS = async () => {
    try {
      Haptics.heavyImpact();
      await onSOS({
        type: "emergency",
        description: "Manual SOS activated via floating button",
        timestamp: Date.now(),
      });
    } catch (err) {
      Haptics.error();
      console.error("SOS failed", err);
    }
  };

  // Draggable Logic
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging || !buttonRef.current) return;

      const btn = buttonRef.current;
      const rect = btn.getBoundingClientRect();

      let newX = clientX - rect.width / 2;
      let newY = clientY - rect.height / 2;

      newX = Math.max(16, Math.min(newX, window.innerWidth - rect.width - 16));
      newY = Math.max(16, Math.min(newY, window.innerHeight - rect.height - 100));

      setPosition({ x: newX, y: newY });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("touchmove", onTouchMove);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [isDragging]);

  return (
    <div
      ref={buttonRef}
      className={`fixed z-[150] transition-all duration-200 ${isDragging ? "scale-110" : ""}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => {
        setIsDragging(true);
        handlePressStart(e);
      }}
      onMouseUp={() => {
        setIsDragging(false);
        handlePressEnd();
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handlePressStart(e);
      }}
      onTouchEnd={() => {
        setIsDragging(false);
        handlePressEnd();
      }}
    >
      <button
        onClick={triggerSOS}
        className={`w-20 h-20 rounded-full shadow-2xl flex items-center justify-center text-white font-bold text-3xl border-4 border-white/30 transition-all active:scale-95 ${
          isPressed ? "bg-red-700 scale-110" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        SOS
      </button>

      <div className="text-center text-[10px] text-red-500 font-medium mt-1.5 tracking-[2px]">
        HOLD FOR SOS
      </div>
    </div>
  );
}

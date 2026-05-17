// src/components/FloatingGuardianButton.tsx
import { useState, useRef, useEffect } from "react";
import { EmergencySoundManager } from "../lib/EmergencySoundManager";
import { useSOSStore } from "../store/useSOSStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

export default function FloatingGuardianButton() {
  const [position, setPosition] = useState({
    x: window.innerWidth - 90,
    y: window.innerHeight - 180,
  });
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const { createSOS } = useSOSStore();
  const { profile } = useAuthStore();

  const triggerSOS = async () => {
    if (!profile) return;

    EmergencySoundManager.getInstance().triggerEmergency("sos", {
      speak: true,
      messageKey: "sos_alert",
    });

    // Attempt to get location to attach to SOS
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await createSOS("sos", "GUARDIAN SOS TRIGGERED", {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            toast.success("SOS Alert Sent!");
          },
          async () => {
            await createSOS("sos", "GUARDIAN SOS TRIGGERED", {
              lat: 14.5995,
              lng: 120.9842,
            });
            toast.success("SOS Alert Sent! (No GPS)");
          },
        );
      } else {
        await createSOS("sos", "GUARDIAN SOS TRIGGERED", {
          lat: 14.5995,
          lng: 120.9842,
        });
        toast.success("SOS Alert Sent! (No GPS)");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to send SOS. Call Hotline.");
    }
  };

  // Draggable logic
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    startPos.current = { x: clientX - position.x, y: clientY - position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setPosition({
        x: Math.max(
          20,
          Math.min(window.innerWidth - 80, clientX - startPos.current.x),
        ),
        y: Math.max(
          20,
          Math.min(window.innerHeight - 120, clientY - startPos.current.y),
        ),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={buttonRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onClick={triggerSOS}
      className="fixed w-16 h-16 bg-red-600 hover:bg-red-700 active:scale-95 rounded-full shadow-2xl flex items-center justify-center cursor-pointer z-50 select-none transition-all duration-200 border-4 border-white"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="text-center">
        <div className="text-white text-xl font-bold">SOS</div>
        <div className="text-[10px] text-red-200 -mt-1">TAP</div>
      </div>
    </div>
  );
}

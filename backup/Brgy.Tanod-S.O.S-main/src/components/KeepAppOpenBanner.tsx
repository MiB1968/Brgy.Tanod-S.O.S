import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const KeepAppOpenBanner: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('keepAppOpenDismissed');
    if (hasDismissed) setVisible(false);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('keepAppOpenDismissed', 'true');
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] bg-amber-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3">
      <div className="text-2xl mt-0.5">📌</div>
      <div className="flex-1">
        <div className="font-bold text-lg">Keep This App Open</div>
        <p className="text-sm opacity-90 mt-1 leading-tight">
          For best real-time tracking, do not close this tab.<br />
          You can minimize Chrome but keep it running in the background.
        </p>
      </div>
      <button onClick={handleDismiss} className="text-white/70 hover:text-white p-1">
        <X size={20} />
      </button>
    </div>
  );
};

export default KeepAppOpenBanner;

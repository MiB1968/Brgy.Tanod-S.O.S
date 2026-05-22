import React, { useState, useEffect } from 'react';
import { pushService } from '@/services/pushNotificationService';

const NotificationPermission: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => setShowPrompt(true), 3000);
    }
  }, []);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    if (result === 'granted') await pushService.initialize();
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[10000] bg-zinc-800 border border-zinc-600 rounded-3xl p-5 shadow-2xl text-white text-center">
      <h3 className="font-bold text-lg">Enable SOS Notifications?</h3>
      <div className="flex gap-3 mt-6">
        <button onClick={() => setShowPrompt(false)} className="flex-1 py-3 text-zinc-400">Not Now</button>
        <button onClick={requestPermission} className="flex-1 bg-red-600 py-3 rounded-2xl font-semibold">Enable</button>
      </div>
    </div>
  );
};

export default NotificationPermission;

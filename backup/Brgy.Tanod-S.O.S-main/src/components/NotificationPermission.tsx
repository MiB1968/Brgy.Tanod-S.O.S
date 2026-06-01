import React, { useState, useEffect } from 'react';
import { pushService } from '../services/pushNotificationService';

const NotificationPermission: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }
  }, []);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') await pushService.initialize();
    setShowPrompt(false);
  };

  if (permission === 'denied') {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-[10000] bg-zinc-900 border border-red-900/50 rounded-3xl p-6 shadow-2xl text-white text-center">
        <h3 className="font-bold text-lg text-red-500">Notifications Blocked</h3>
        <p className="text-zinc-400 mt-2 text-sm">Please enable notifications in your browser settings to receive critical SOS alerts.</p>
      </div>
    );
  }

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[10000] bg-zinc-800 border border-zinc-600 rounded-3xl p-5 shadow-2xl text-white text-center">
      <h3 className="font-bold text-lg">Enable SOS Notifications?</h3>
      <div className="flex gap-3 mt-6">
        <button onClick={() => setShowPrompt(false)} className="flex-1 py-3 text-zinc-400">Not Now</button>
        <button onClick={requestPermission} className="flex-1 bg-red-600 py-3 rounded-2xl font-semibold">Enable</button>
      </div>
    </div>
  );
};

export default NotificationPermission;

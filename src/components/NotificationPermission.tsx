import React, { useState, useEffect } from 'react';
import { pushService } from '../services/pushNotificationService';
import { X, AlertTriangle, Bell, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const NotificationPermission: React.FC = () => {
  const getPermission = (): NotificationPermission => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  };

  const [permission, setPermission] = useState<NotificationPermission>(getPermission());
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('brgy_notification_dismissed_v3') === 'true';
  });

  const inIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if ('Notification' in window) {
      const currentPerm = Notification.permission;
      setPermission(currentPerm);
      if (currentPerm === 'default') {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        await pushService.initialize();
      }
      setShowPrompt(false);
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('brgy_notification_dismissed_v3', 'true');
  };

  if (dismissed) return null;

  // Render when blocked / denied or inside iframe (where permissions are restricted by sandbox)
  if (permission === 'denied' || inIframe) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[10000] bg-zinc-950/95 backdrop-blur-md border border-red-900/45 rounded-2xl p-5 shadow-2xl text-white relative overflow-hidden"
        >
          {/* Top colored accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-650" />

          {/* Close button */}
          <button 
            onClick={handleDismiss} 
            className="absolute top-3 right-3 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/60 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-3 mt-1">
            <div className="p-2 bg-red-500/10 rounded-xl text-red-500 shrink-0">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm tracking-tight text-red-400">
                {inIframe ? "Iframe Preview Notification Limit" : "Notifications Blocked"}
              </h3>
              <p className="text-zinc-400 mt-1 text-xs leading-relaxed">
                {inIframe ? (
                  <>
                    The Google AI Studio development sandbox restricts live browser push notifications inside the embedded preview pane. They will function normally when opened directly or deployed.
                  </>
                ) : (
                  "Please enable notifications in your browser settings to receive real-time SOS broadcast alerts and tactical responder dispatches."
                )}
              </p>
              
              <div className="flex items-center gap-2 mt-4">
                {inIframe && (
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-[10px] font-semibold text-red-250 cursor-pointer transition-all border border-red-800/30"
                  >
                    Open Direct Tab <ExternalLink size={10} />
                  </a>
                )}
                <button 
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors border border-zinc-800"
                >
                  Dismiss Warning
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!showPrompt || permission !== 'default') return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[10000] bg-zinc-900/95 backdrop-blur-md border border-zinc-700/55 rounded-2xl p-5 shadow-2xl text-white relative"
      >
        <button 
          onClick={handleDismiss} 
          className="absolute top-3 right-3 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/60 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shrink-0">
            <Bell size={20} className="animate-bounce" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm tracking-tight text-white">Enable Live SOS Alerts?</h3>
            <p className="text-zinc-400 mt-1 text-xs leading-relaxed">
              Receive alert notifications on active emergencies, firefighter updates, and official barangay security dispatches.
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <button 
                onClick={() => setShowPrompt(false)} 
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors"
              >
                Not Now
              </button>
              <button 
                onClick={requestPermission} 
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg font-semibold text-xs cursor-pointer transition-all shadow-md shadow-blue-900/20 text-white"
              >
                Enable Notifications
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPermission;

import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Check if running as PWA already
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-6 bg-[#0a1428] border border-white/20 rounded-2xl p-5 max-w-xs z-50 shadow-2xl" id="pwa-install-prompt">
      <p className="font-semibold mb-2 flex items-center gap-2">📱 Install Brgy. Tanod S.O.S.</p>
      <p className="text-sm text-gray-300 mb-4">Add to your home screen for faster response, lightweight storage, and full offline rescue capabilities.</p>
      <div className="flex gap-3">
        <button 
          onClick={() => setShowPrompt(false)} 
          className="flex-1 py-2 border border-gray-600 hover:bg-white/5 rounded-xl text-sm transition"
          id="pwa-later-btn"
        >
          Later
        </button>
        <button 
          onClick={handleInstall} 
          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition"
          id="pwa-install-btn"
        >
          Install Now
        </button>
      </div>
    </div>
  );
}

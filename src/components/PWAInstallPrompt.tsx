import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    // Auto-hide after 30 seconds if not interacted
    const timeout = setTimeout(() => setShowPrompt(false), 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      clearTimeout(timeout);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ User accepted PWA install');
    } else {
      console.log('❌ User dismissed install');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const dismiss = () => {
    setShowPrompt(false);
    // Optional: Remember dismissal in localStorage
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-green-600 text-white rounded-3xl shadow-2xl max-w-[360px] w-full mx-4 overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
          🚨
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-lg">Install Tanod SOS</h3>
          <p className="text-sm text-zinc-400 mt-1 leading-tight">
            Add to home screen for quick SOS access, offline mode, and faster response even without browser tabs.
          </p>

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleInstall}
              className="flex-1 bg-green-600 hover:bg-green-700 transition-colors text-white font-medium py-3.5 rounded-2xl flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Install App
            </button>

            <button
              onClick={dismiss}
              className="flex-1 border border-zinc-700 hover:bg-zinc-800 transition-colors font-medium py-3.5 rounded-2xl"
            >
              Maybe Later
            </button>
          </div>
        </div>

        <button onClick={dismiss} className="text-zinc-500 hover:text-zinc-400 -mt-1 -mr-1 p-2">
          <X size={20} />
        </button>
      </div>
    </div>
  );
};


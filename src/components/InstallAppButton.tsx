import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { toast } from "react-hot-toast";

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Initial check for display-mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.error(
        "Installation protocol already engaged or unsupported by this browser.",
        {
          icon: "⚠️",
          duration: 4000,
        }
      );
      return;
    }

    toast.success("Initializing Secure Installation Protocol...");

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("Brgy. Tanod S.O.S. added to Home Screen");
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;
  // If no prompt, we still show the button but with a descriptive toast on click
  // This helps users who might be wondering "where is the button"

  return (
    <div className="flex justify-center p-8">
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 px-6 py-4 bg-brand-bg border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all font-mono active:scale-95 shadow-xl group"
      >
        <Download className="w-4 h-4 text-info group-hover:scale-110 transition-transform" />
        <span>ENCRYPTED SYSTEM INSTALL</span>
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Download, CheckCircle, Trash2, AlertTriangle, HardDrive } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

const CACHE_NAME = 'supertonic-models-v1';
const MODEL_FILES = [
  '/models/supertonic/model.onnx',
  // In reality, this would include the tokenizer config, vocabulary JSONs, etc.
];
const ESTIMATED_SIZE_MB = 350;

export function OfflineVoiceManager() {
  const [isCached, setIsCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [storageInfo, setStorageInfo] = useState<{ quota: number; usage: number } | null>(null);

  useEffect(() => {
    checkCache();
    checkStorage();
  }, []);

  const checkCache = async () => {
    const hasCache = await caches.has(CACHE_NAME);
    if (!hasCache) {
      setIsCached(false);
      return;
    }
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    setIsCached(keys.length > 0);
  };

  const checkStorage = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      setStorageInfo({
        usage: (estimate.usage || 0) / (1024 * 1024),
        quota: (estimate.quota || 0) / (1024 * 1024)
      });
    }
  };

  const handleDownload = async () => {
    // Memory/Device capability guard
    if ('deviceMemory' in navigator && (navigator as any).deviceMemory < 2) {
      toast.error('Device memory is too low (< 2GB) to run offline AI safely.');
      return;
    }

    setDownloading(true);
    setProgress(0);
    try {
      const cache = await caches.open(CACHE_NAME);
      let loaded = 0;
      
      // Simulate progress for UI, in reality you'd track fetch progress or just wait
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 500);

      await Promise.all(MODEL_FILES.map(url => cache.add(url)));
      
      clearInterval(interval);
      setProgress(100);
      setIsCached(true);
      toast.success('Offline Voice Pack downloaded successfully!');
      checkStorage();
    } catch (err) {
      console.error(err);
      toast.error('Failed to download voice pack. Check connection.');
    } finally {
      setDownloading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDelete = async () => {
    await caches.delete(CACHE_NAME);
    setIsCached(false);
    checkStorage();
    toast.success('Offline Voice Pack removed.');
  };

  return (
    <div className="bg-[#131b24] p-5 rounded-xl border border-[#1e2d3d] space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-accent" />
            Offline Voice Pack
          </h3>
          <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-sm">
            Download AI models to allow the Guardian app to speak even without an internet connection. Required for field offline use.
          </p>
        </div>
        {isCached ? (
          <span className="bg-success/10 text-success border border-success/20 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Ready
          </span>
        ) : (
          <span className="bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded text-xs font-bold uppercase">
            Not Downloaded
          </span>
        )}
      </div>

      <div className="bg-[#0b1016] p-3 rounded-lg flex items-center justify-between text-xs font-mono text-text-muted border border-[#1e2d3d]/50">
        <div className="flex items-center gap-4">
          <div>
            <span className="block text-[#5a7080]">Model Size</span>
            <span className="text-white">~{ESTIMATED_SIZE_MB} MB</span>
          </div>
          {storageInfo && (
            <div>
              <span className="block text-[#5a7080]">Free Space</span>
              <span className={storageInfo.quota - storageInfo.usage < 1000 ? 'text-danger' : 'text-success'}>
                {Math.max(0, Math.floor(storageInfo.quota - storageInfo.usage))} MB
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {isCached ? (
          <button 
            onClick={handleDelete}
            className="w-full py-2 flex items-center justify-center gap-2 text-danger hover:bg-danger/10 border border-danger/20 rounded-lg text-sm transition-colors uppercase font-bold"
          >
            <Trash2 className="w-4 h-4" /> Remove Voice Pack
          </button>
        ) : (
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="w-full relative overflow-hidden bg-accent text-black font-bold uppercase text-sm py-2 px-4 rounded-lg hover:bg-[#00e5ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {downloading ? (
              <span className="flex items-center justify-center gap-2">
                Downloading {progress}%...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download 
              </span>
            )}
            {downloading && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-black/30 transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
            )}
          </button>
        )}
      </div>

      {(!isCached && storageInfo && (storageInfo.quota - storageInfo.usage) < 500) && (
        <div className="flex items-start gap-2 text-warning bg-warning/10 p-3 rounded-lg border border-warning/20">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">Your device might not have enough free storage. Ensure you have at least 1GB free before downloading.</p>
        </div>
      )}
    </div>
  );
}

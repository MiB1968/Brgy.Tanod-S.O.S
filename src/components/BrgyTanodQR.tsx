import toast from "react-hot-toast";
import React from "react";
import { cn } from "../lib/utils";
import { QrCode, Share2, Download } from "lucide-react";

export function BrgyTanodQR({ className }: { className?: string }) {
  const qrUrl = "https://bit.ly/BrgyTanodSoS";

  return (
    <div
      className={cn(
        "glass-panel p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-emergency/30 transition-all duration-500",
        className
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <QrCode size={80} className="text-white" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emergency/20 flex items-center justify-center border border-emergency/30">
            <Share2 className="w-5 h-5 text-emergency" animate-pulse />
          </div>
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-white">
              Share Access
            </h3>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
              Official QR Sync
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative p-3 bg-white rounded-3xl group-hover:scale-105 transition-transform duration-500 shadow-2xl overflow-hidden">
            <img
              src="/Official-Url-QR.png"
              alt="Scan to Access"
              className="w-32 h-32 md:w-40 md:h-40 object-contain"
              onError={(e) => {
                // Fallback to generated QR if the image is missing
                const target = e.target as HTMLImageElement;
                target.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  qrUrl
                )}&bgcolor=ffffff&color=000000`;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-brand-bg/80 backdrop-blur-sm p-4 rounded-full border border-white/10">
                <Download className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div className="bg-brand-bg/50 p-4 rounded-2xl border border-white/5 font-mono">
              <div className="text-[9px] text-white/30 uppercase tracking-[0.3em] mb-1">
                Direct Link
              </div>
              <div className="text-xs text-info break-all font-bold group-hover:text-white transition-colors">
                {qrUrl}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(qrUrl);
                toast("Link copied to clipboard!");
              }}
              className="w-full py-4 px-6 bg-white/5 hover:bg-emergency hover:text-white text-white/60 transition-all rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 hover:border-emergency/50 flex items-center justify-center gap-2 italic"
            >
              Copy Quick Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

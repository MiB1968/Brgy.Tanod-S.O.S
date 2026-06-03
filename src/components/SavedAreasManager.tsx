import React, { useState, useEffect } from "react";
import { offlineTileService } from "../services/offlineTileService";
import {
  Trash2,
  MapPin,
  Calendar,
  HardDrive,
  Map,
  Info,
  Compass,
} from "lucide-react";
import toast from "react-hot-toast";

export default function SavedAreasManager() {
  const [savedAreas, setSavedAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAreas = async () => {
    setLoading(true);
    const areas = await offlineTileService.getSavedAreas();
    setSavedAreas(areas);
    setLoading(false);
  };

  useEffect(() => {
    loadAreas();

    // Reload cache indexes if a new download finishes
    const handleReload = () => {
      loadAreas();
    };
    window.addEventListener("offline-area-downloaded", handleReload);
    return () =>
      window.removeEventListener("offline-area-downloaded", handleReload);
  }, []);

  const deleteArea = async (id: number, name: string) => {
    if (
      window.confirm(
        `⚠️ ARE YOU SURE? This will permanently delete standard cached tiles for "${name}" from your offline index store.`
      )
    ) {
      await offlineTileService.deleteSavedArea(id);
      toast.success(`Removed offline profile: ${name}`);
      loadAreas();
    }
  };

  const loadAreaOnMap = (area: any) => {
    // Transition to active map view first
    window.dispatchEvent(new CustomEvent("set-active-tab", { detail: "map" }));

    // Give some space for tab DOM structures to fully mount
    setTimeout(() => {
      const event = new CustomEvent("load-saved-area", {
        detail: {
          bounds: area.bounds,
          name: area.name,
        },
      });
      window.dispatchEvent(event);
    }, 200);

    toast.success(`📍 Center map target on: ${area.name}`);
  };

  return (
    <div className="relative tactical-panel border border-white/[0.08] p-6 lg:p-8 rounded-[32px] bg-brand-bg/95 backdrop-blur-2xl overflow-hidden shadow-2xl">
      {/* Decorative ambient subtle light grids */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-tactical-cyan/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6 mb-8">
        <div>
          <span className="text-[9px] font-black tracking-[0.3em] text-tactical-cyan font-mono uppercase italic block mb-1">
            LOCAL_STORAGE_REGISTRY • INTEGRITY_VERIFIED
          </span>
          <h2 className="text-2xl font-black uppercase tracking-wider font-display text-white flex items-center gap-3">
            <HardDrive className="text-tactical-cyan animate-pulse w-7 h-7" />
            Offline Region Registry
          </h2>
          <p className="text-xs text-white/40 mt-1 font-mono">
            Mamburao responder terminals cache registry for remote tactical
            operation.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-[#121620] border border-white/5 px-4 py-2.5 rounded-2xl">
          <span className="w-1.5 h-1.5 rounded-full bg-tactical-cyan animate-pulse shadow-[0_0_8px_var(--color-tactical-cyan)]" />
          <span className="text-xs font-mono font-bold text-tactical-cyan">
            {savedAreas.length} SECURE ZONE{savedAreas.length !== 1 ? "S" : ""}{" "}
            INDEXED
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-tactical-cyan border-t-transparent animate-spin rounded-full mb-4" />
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest">
            Querying Dexie Cache DB...
          </p>
        </div>
      ) : savedAreas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-white/10 rounded-[24px] bg-black/25 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1A1E29] flex items-center justify-center text-white/20 mb-5 border border-white/5 shadow-inner">
            <Compass size={32} className="text-white/20 animate-spin-slow" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            No custom pre-cached regions found
          </h3>
          <p className="text-xs text-white/40 max-w-sm mt-2 leading-relaxed">
            Use the Live map interface and drag to highlight parts of Mamburao,
            or tap the{" "}
            <span className="text-[#FF8C00] font-black">"Cache Region"</span>{" "}
            control on the map toolbar to save the viewport offline.
          </p>
          <div className="mt-6 flex items-center gap-2 bg-[#121620] border border-white/5 px-4 py-2 rounded-xl text-[10px] font-mono text-white/50">
            <Info className="w-3.5 h-3.5 text-tactical-cyan shrink-0" />
            <span>
              Mamburao Core Downtown area is pre-loaded automatically.
            </span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {savedAreas.map((area) => (
            <div
              key={area.id}
              className="group relative bg-[#0C101B]/70 border border-white/[0.05] hover:border-tactical-cyan/35 p-5 sm:p-6 rounded-2xl flex justify-between items-center transition-all duration-300 hover:shadow-lg hover:shadow-cyan-950/25"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:scale-125 transition-transform" />
                  <h3 className="font-bold text-sm text-white uppercase tracking-wide truncate">
                    {area.name}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-white/40 font-mono mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-white/20" />
                    {new Date(area.downloadedAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span>•</span>
                  <span className="text-tactical-cyan font-bold">
                    {area.tileCount} Tiles stored
                  </span>
                  <span>•</span>
                  <span className="bg-white/5 px-1.5 py-0.5 rounded text-white/60">
                    Zoom {area.minZoom}–{area.maxZoom}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => loadAreaOnMap(area)}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-tactical-cyan/10 border border-tactical-cyan/30 rounded-xl hover:bg-tactical-cyan/25 text-[10px] font-mono font-bold text-tactical-cyan uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Map size={12} />
                  <span>Inspect</span>
                </button>
                <button
                  onClick={() => deleteArea(area.id, area.name)}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  className="p-2 text-white/30 hover:text-tactical-red hover:bg-tactical-red/10 rounded-xl transition-all cursor-pointer"
                  title="Purge details"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

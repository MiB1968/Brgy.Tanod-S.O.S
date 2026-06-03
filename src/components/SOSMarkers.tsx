// src/components/SOSMarkers.tsx
import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useSOS } from '../hooks/useSOS';
import { useRBAC } from '../context/AuthContext';
import { dispatchService } from '../services/dispatchService';
import { toast } from 'react-hot-toast';

// High-visibility SOS red beacon icon
const sosBeaconIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [0, -35],
});

export const SOSMarkers: React.FC = () => {
  const { activeSOS } = useSOS();
  const { profile, user } = useRBAC();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const isTanod = profile?.role === 'tanod' || profile?.role === 'admin' || profile?.role === 'superadmin';

  const handleRespondToAlert = async (sosId: string) => {
    if (!user?.uid) {
      toast.error('You must be strictly logged in to dispatch onto this alert.');
      return;
    }
    setIsProcessing(sosId);
    try {
      await dispatchService.acceptSOS(sosId, user.uid, profile?.name || 'Tanod Responder');
      toast.success('Dispatched! You have accepted this alert successfully.');
    } catch (err: any) {
      toast.error(`Dispatch action failed: ${err.message || err}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleResolveAlert = async (sosId: string) => {
    if (!user?.uid) return;
    setIsProcessing(sosId);
    try {
      await dispatchService.resolveSOS(sosId, user.uid);
      toast.success('Alert resolved! Excellent work, Tanod.');
    } catch (err: any) {
      toast.error(`Resolution action failed: ${err.message || err}`);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <>
      {activeSOS.map((sos) => {
        if (!sos.location || typeof sos.location.lat !== 'number' || typeof sos.location.lng !== 'number') {
          return null; // Skip invalid location nodes safely
        }

        const isAssignedToMe = sos.assignedTo === user?.uid;

        return (
          <Marker
            key={sos.id}
            position={[sos.location.lat, sos.location.lng]}
            icon={sosBeaconIcon}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[200px] text-zinc-950">
                {/* Header tag */}
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-100">
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse uppercase">
                    🚨 {sos.type || 'SOS'}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    sos.status === 'responding' 
                      ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                      : 'bg-rose-100 text-rose-700 border border-rose-300'
                  }`}>
                    {sos.status || 'pending'}
                  </span>
                </div>

                {/* Body details */}
                <p className="text-xs font-semibold text-zinc-800 line-clamp-3 mb-1">
                  {sos.description || 'No description provided.'}
                </p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  By: {sos.residentName || 'Barangay Resident'}
                </p>

                {/* Photos fallback */}
                {sos.photos && sos.photos.length > 0 && (
                  <div className="mt-2 flex gap-1 overflow-x-auto py-1">
                    {sos.photos.map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo}
                        alt="Incident Context"
                        className="h-12 w-12 object-cover rounded-md border border-zinc-200"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                )}

                {/* Responder controls */}
                {isTanod && (
                  <div className="mt-3 pt-2 border-t border-zinc-100 flex flex-col gap-1.5">
                    {sos.status === 'pending' ? (
                      <button
                        id={`dispatch-respond-btn-${sos.id}`}
                        disabled={isProcessing !== null}
                        onClick={() => handleRespondToAlert(sos.id)}
                        className="w-full text-center bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing === sos.id ? 'Responding...' : 'Respond & Intercept'}
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[9px] text-zinc-500 italic pb-1">
                          Assigned: {sos.assignedToName || 'Another Tanod'}
                        </p>
                        {isAssignedToMe && (
                          <button
                            id={`dispatch-resolve-btn-${sos.id}`}
                            disabled={isProcessing !== null}
                            onClick={() => handleResolveAlert(sos.id)}
                            className="w-full text-center bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                          >
                            {isProcessing === sos.id ? 'Updating...' : 'Mark as Resolved'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-[9px] text-zinc-400 font-mono mt-2 border-t pt-1.5 text-right">
                  {sos.timestamp?.toDate
                    ? sos.timestamp.toDate().toLocaleTimeString()
                    : sos.timestamp 
                      ? new Date(sos.timestamp).toLocaleTimeString() 
                      : 'Just now'}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default SOSMarkers;

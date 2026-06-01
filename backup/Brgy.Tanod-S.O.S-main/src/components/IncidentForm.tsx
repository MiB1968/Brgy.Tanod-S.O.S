import React, { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { MapContainer, Marker } from "react-leaflet";
import L from "leaflet";
import { useGeolocation } from "../hooks/useGeolocation";
import { toast } from "react-hot-toast";
import { OfflineTileLayer } from "./OfflineTileLayer";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface IncidentFormProps {
  onClose: () => void;
  userRole?: string;
  onSubmit: (data: any) => Promise<void> | void;
}

export default function IncidentForm({
  onClose,
  userRole,
  onSubmit,
}: IncidentFormProps) {
  const [type, setType] = useState("medical");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    getCurrentLocation,
    loading: locLoading,
    location,
  } = useGeolocation();
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const handleGetLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      setSelectedLocation(loc);
    } catch (err) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        type,
        description: description.trim(),
        location: selectedLocation,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-end md:items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-red-500">
            🚨 EMERGENCY REPORT
          </h2>
          <button onClick={onClose}>
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Incident Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-2xl p-4 focus:outline-none focus:border-red-500"
            >
              <option value="medical">🩹 Medical Emergency</option>
              <option value="fire">🔥 Fire</option>
              <option value="crime">⚠️ Crime / Disturbance</option>
              <option value="natural">🌊 Natural Disaster</option>
              <option value="other">📢 Other Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Describe the Situation
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Elderly woman having difficulty breathing near the basketball court..."
              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-2xl p-4 resize-y focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-3">Location</label>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locLoading}
              className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl p-4"
            >
              {locLoading ? <Loader2 className="animate-spin" /> : <MapPin />}
              {selectedLocation
                ? "📍 Update Location"
                : "Capture Current Location"}
            </button>

            {/* MAP PREVIEW */}
            {selectedLocation && (
              <div className="mt-4 rounded-2xl overflow-hidden border border-gray-700 h-48 bg-gray-950 relative">
                <MapContainer
                  center={[selectedLocation.lat, selectedLocation.lng]}
                  zoom={16}
                  className="w-full h-full grayscale"
                  scrollWheelZoom={false}
                  zoomControl={false}
                >
                  <OfflineTileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png" />
                  <Marker
                    position={[selectedLocation.lat, selectedLocation.lng]}
                  />
                </MapContainer>
                <div className="absolute top-3 left-3 z-[400] bg-black/70 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                  📍 Live Location
                </div>
                <div className="absolute bottom-3 right-3 z-[400] bg-black/70 text-gray-300 text-[10px] px-2 py-1 rounded pointer-events-none">
                  {selectedLocation.lat.toFixed(5)},{" "}
                  {selectedLocation.lng.toFixed(5)}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="w-full bg-red-600 hover:bg-red-700 py-5 rounded-2xl text-xl font-bold transition-all active:scale-95"
          >
            {isSubmitting ? "SENDING..." : "SEND SOS ALERT"}
          </button>
        </form>
      </div>
    </div>
  );
}

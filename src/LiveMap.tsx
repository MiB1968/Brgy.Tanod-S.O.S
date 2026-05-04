import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from 'leaflet';
import { startGPS } from "./gpsSystem";

/**
 * Custom Icons for Web Leaflet
 */
const TanodIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CitizenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CENTER: [number, number] = [13.2236, 120.5960]; // Mamburao

import { useMap } from "react-leaflet";

function MyLocationButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const observer = new window.ResizeObserver(() => {
      map.invalidateSize();
    });
    
    const container = map.getContainer();
    observer.observe(container);
    
    // Multiple fallbacks for React render cycles
    const timers = [
      setTimeout(() => map.invalidateSize(), 10),
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 500),
      setTimeout(() => map.invalidateSize(), 1000)
    ];

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [map]);

  const locateMe = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 17);
        const icon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        L.marker([latitude, longitude], { icon })
          .addTo(map)
          .bindPopup("<div class='text-black font-bold'>You are here 📍</div>")
          .openPopup();
        setLocating(false);
      },
      (err) => {
        console.error("GPS error", err);
        setLocating(false);
        alert("Unable to fetch location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <button 
      onClick={(e) => { e.preventDefault(); locateMe(); }}
      className={`absolute bottom-4 right-4 z-[400] w-12 h-12 bg-[#252932] text-xl rounded-full shadow-lg border border-[#2D3139] flex items-center justify-center hover:bg-[#FF4B4B] hover:scale-110 transition-all ${locating ? "animate-pulse" : ""}`}
      title="Pinpoint My Location"
    >
      {locating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "📍"}
    </button>
  );
}

export default function LiveMap() {
  const [users, setUsers] = useState<Record<string, any>>({});

  useEffect(() => {
    // Replace with actual user ID from Auth context if available
    const stopGPS = startGPS("user123", "citizen", (newData) => {
      setUsers(prev => ({ ...prev, ...newData }));
    });
    return () => stopGPS();
  }, []);

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
      <MapContainer 
        center={CENTER} 
        zoom={14} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="Google Maps"
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        <MyLocationButton />
        {Object.values(users).map((u: any, i: number) => (
          u.lat && u.lng && (
            <Marker
              key={u.user_id || i}
              position={[u.lat, u.lng]}
              icon={u.role === "tanod" ? TanodIcon : CitizenIcon}
            >
              <Popup>
                <div className="text-black">
                  <strong>{u.role?.toUpperCase()}</strong><br />
                  ID: {u.user_id}<br />
                  Time: {new Date(u.timestamp).toLocaleTimeString()}
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}

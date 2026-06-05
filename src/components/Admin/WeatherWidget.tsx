import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TacticalCard } from "../Tactical/TacticalCard";
import { CloudRain, Wind, AlertTriangle, Thermometer } from "lucide-react";
import { cn } from "../../lib/utils";

const LOCAL_STORAGE_KEY = "brgy_mamburao_weather_cache";

const FALLBACK_WEATHER = {
  current: {
    temperature_2m: 31.0,
    apparent_temperature: 36.5,
    precipitation: 0.0,
    wind_speed_10m: 12.0,
    weather_code: 1, // Clear / Partly Cloudy
  },
  daily: {
    wind_gusts_10m_max: [18.5],
  },
  isOffline: true,
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Brgy locations around Mamburao [13.2236, 120.5960]
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=13.2236&longitude=120.5960&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&timezone=Asia%2FManila`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP status: ${res.status}`);
        }
        const data = await res.json();
        setWeather(data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } catch (err: any) {
        console.log(
          "[Weather] Utilizing local cache fallback:",
          err.message || err
        );
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setWeather({ ...parsed, isOffline: true });
          } catch {
            setWeather(FALLBACK_WEATHER);
          }
        } else {
          setWeather(FALLBACK_WEATHER);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
    // refresh every 30 mins
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !weather) {
    return (
      <TacticalCard className="h-full flex items-center justify-center p-6 bg-[#16191F] border border-white/5 opacity-50 relative animate-pulse">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
          Acquiring Meteorological Data...
        </p>
      </TacticalCard>
    );
  }

  const { current, daily } = weather;

  // WMO Weather interpretation codes (very simplified)
  // 0: clear, 1-3: cloudy, 45-48: fog, 51-67: rain/drizzle, 71-77: snow, 80-82: rain showers, 95-99: thunderstorm
  const isRaining = current.precipitation > 0 || current.weather_code >= 51;
  const isHighWind = current.wind_speed_10m > 40; // >40km/h is fairly strong
  const isDanger = current.weather_code >= 95 || (isRaining && isHighWind);

  return (
    <TacticalCard
      className={cn(
        "h-full p-6 relative overflow-hidden transition-all",
        isDanger
          ? "border-emergency/30 bg-emergency/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
          : "border-white/5 bg-[#16191F]"
      )}
    >
      {isDanger && (
        <div className="absolute top-0 left-0 w-full h-1 bg-emergency opacity-50 shadow-[0_0_10px_#EF4444]" />
      )}

      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div>
          <h3 className="text-xl font-black font-mono text-white tracking-widest uppercase">
            Mamburao
          </h3>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mt-0.5">
            Atmospheric Conditions{" "}
            {weather.isOffline && (
              <span className="text-[8px] text-amber-500 font-extrabold ml-1.5 animate-pulse">
                ● OFFLINE_CACHE
              </span>
            )}
          </p>
        </div>

        {isDanger ? (
          <div className="px-3 py-1 bg-emergency/10 border border-emergency/30 rounded-full flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-emergency" />
            <span className="text-[9px] font-black tracking-widest text-emergency uppercase">
              Typhoon/Flood Warning
            </span>
          </div>
        ) : (
          <div className="px-3 py-1 bg-[#34C759]/10 border border-[#34C759]/30 rounded-full">
            <span className="text-[9px] font-black tracking-widest text-[#34C759] uppercase">
              Clear Conditions
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 z-10 relative">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="w-4 h-4 text-info" />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
              Temp
            </span>
          </div>
          <span className="text-2xl font-black italic text-white tracking-tighter">
            {current.temperature_2m}°C
          </span>
          <span className="text-[9px] text-info font-mono">
            Feels like {current.apparent_temperature}°
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Wind
              className={cn(
                "w-4 h-4",
                isHighWind ? "text-emergency animate-pulse" : "text-sky-400"
              )}
            />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
              Wind
            </span>
          </div>
          <span className="text-2xl font-black italic text-white tracking-tighter">
            {current.wind_speed_10m}
          </span>
          <span className="text-[9px] text-sky-400 font-mono">km/h</span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <CloudRain
              className={cn(
                "w-4 h-4",
                isRaining ? "text-blue-400 animate-bounce" : "text-blue-400"
              )}
            />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
              Precip
            </span>
          </div>
          <span className="text-2xl font-black italic text-white tracking-tighter">
            {current.precipitation}
          </span>
          <span className="text-[9px] text-blue-400 font-mono">mm/h</span>
        </div>

        <div className="flex flex-col justify-end pt-5">
          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[9px] text-white/60 font-mono uppercase tracking-widest mb-1.5">
              Max Wind Gust
            </p>
            <p className="text-sm font-bold text-white font-mono">
              {daily.wind_gusts_10m_max?.[0] || "--"} km/h
            </p>
          </div>
        </div>
      </div>
    </TacticalCard>
  );
}

# Brgy.Tanod-S.O.S 🚨🇵🇭

**Real-time Emergency Response System for Philippine Barangays**

A responsive, **offline-first**, **PWA-first** SOS alert system designed for local government units (Barangays). It connects citizens directly to Barangay Tanods with reliable performance even in low-connectivity and typhoon-prone areas.

![Hero Banner](https://via.placeholder.com/800x300/15803d/ffffff?text=Brgy+Tanod+S.O.S) <!-- Replace with actual screenshot -->

## ✨ Key Features

### Core Emergency Features
- **Floating SOS Button** — Long-press activation with one-tap emergency alert
- **Real-time Tanod Tracking** — Live location with direction indicators and heatmap
- **Offline-First SOS** — Queued alerts with auto-sync when connection returns
- **Multi-Channel Fallback** — Firebase + Twilio SMS during network outages
- **Hybrid TTS (Tagalog Support)** — Multiple voice options including local dialects

### 🛡️ AI Guardian Mode (Highlight Feature)
**AI Guardian Mode** is an intelligent, privacy-first voice assistant powered by **WebLLM** (local AI running directly in the browser).

**Capabilities**:
- **Voice-activated SOS** — Speak naturally in Tagalog or English ("Tulong! May sunog!" or "Help, emergency!")
- **Context-aware assistance** — Answers common barangay queries offline (e.g., "Saan ang pinakamalapit na health center?")
- **Real-time guidance during emergencies** — Step-by-step instructions while waiting for Tanods
- **Local AI Processing** — Runs entirely on-device (no cloud dependency, better privacy & works offline)
- **Hybrid Fallback** — Switches to cloud AI (Gemini) when available for more complex queries
- **Super Admin Greeting** — Personalized voice welcome for barangay officials

This feature makes the app accessible to elderly residents and users with limited literacy.

### Advanced Capabilities
- **PWA + Aggressive Offline Map Tiles** — Installable app with cached Leaflet maps
- **Role-Based Dashboards** — Citizen, Tanod, Admin, and Super Admin views
- **Patrol Logging & Broadcast System** — Tanod activity logs and system-wide announcements
- **Geofencing Ready** — Future hotspot alerts (background tracking via Capacitor)
- **Local AI Voice Assistant** — WebLLM + multiple TTS engines

## 🛠️ Tech Stack

**Frontend**:
- React 19 + TypeScript + Vite + Tailwind CSS
- State: Zustand
- Maps: Leaflet + react-leaflet + Heatmap Layer
- PWA: vite-plugin-pwa (with Workbox + Background Sync)
- Local AI: @mlc-ai/web-llm + ONNX Runtime
- Animations: Framer Motion

**Backend & Services**:
- Firebase (Auth, Firestore, Functions, Storage)
- Express + Socket.io (real-time)
- Drizzle ORM (PostgreSQL / Firebase compatible)
- Twilio (SMS fallback)
- Hybrid AI (WebLLM local + Google Gemini)

**Mobile**:
- Progressive Web App (Primary)
- Capacitor-ready for native Android/iOS builds

## 🚀 Quick Start

```bash
git clone https://github.com/MiB1968/Brgy.Tanod-S.O.S.git
cd Brgy.Tanod-S.O.S
npm install
cp .env.example .env
npm run dev
```

## 🚨 Background Tanod Tracking

Real-time location tracking for Tanods with **background support**, **offline queuing**, and **geofencing**.

### Key Capabilities
- Persistent background location on Android/iOS (even when app is closed)
- Offline queuing via Dexie + auto-sync when online
- Geofence-triggered alerts for barangay hotspots
- Battery-optimized with distance filtering (30m)
- Persistent notification + high-priority SOS wake-up

### Setup for Capacitor Build
1. Install plugin: `npm install @capgo/background-geolocation`
2. Follow permissions in `capacitor.config.ts`, `Info.plist`, and `AndroidManifest.xml` (see docs/).
3. Tanods toggling tracking handles everything automatically.

## 🌐 PWA (Progressive Web App)

**Primary deployment target** — Works great on any smartphone browser.

### Offline Capabilities
- Full SOS queuing with Dexie IndexedDB
- Aggressive caching of map tiles
- Local AI (WebLLM) + Tagalog TTS
- Service Worker for asset caching

**Install Instructions**:
1. Open in Chrome/Safari on mobile
2. Tap "Add to Home Screen"
3. Use as native-like app

**Note**: For background location, use Capacitor build. PWA version supports foreground tracking + notifications via Firebase.

## Deployment
- Firebase Hosting + Functions
- Docker + Nginx (included)
- Android/iOS via Capacitor (recommended for background tracking)

## Security
Firestore rules are **granular and role-based**. Never use open rules in production.

## Cost Estimates
- Firebase: Free tier sufficient for small barangays
- Twilio SMS: ~₱1.30–₱12 per message (PH rates)

**Made with ❤️ for Philippine Barangays**

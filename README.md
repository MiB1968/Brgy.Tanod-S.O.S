# Brgy.Tanod-S.O.S 🚨🇵🇭

**Real-time Emergency Response System for Philippine Barangays**

A responsive, offline-first SOS alert system with Tanod tracking, Twilio SMS fallback, and local AI voice assistance.

## Features
- Floating SOS Button (long press)
- Real-time Tanod tracking with direction + heatmap
- Offline SOS queuing + auto-sync
- Twilio SMS fallback during network outages
- Hybrid TTS (Tagalog support)
- PWA + aggressive offline map tiles

## Tech Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind
- Maps: Leaflet + Heatmap + Offline Tiles
- Backend: Firebase (Auth, Firestore, Functions)
- Real-time: Socket.io
- SMS: Twilio
- AI: WebLLM (local)

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

## Quick Start
```bash
git clone https://github.com/MiB1968/Brgy.Tanod-S.O.S.git
cd Brgy.Tanod-S.O.S
npm install
cp .env.example .env
npm run dev
```

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

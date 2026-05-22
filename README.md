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

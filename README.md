# 🛡️ Brgy. Tanod S.O.S

**Real-time Emergency Response System for Barangays in the Philippines**

A modern, offline-first, voice-enabled emergency platform built for Philippine barangays.

## ✨ Features

- **Real-time SOS Alerts** with geolocation
- **Floating Draggable SOS Button**
- **Twilio SMS Fallback** (Auto-SMS if alerts unacknowledged or offline synced)
- **Background Tanod GPS Tracking**
- **Offline Mode** with automatic queue sync
- **Tagalog Voice Support** (TTS + Siren)
- **Role-Based Access Control** (Resident, Tanod, Admin, SuperAdmin)
- **PWA** – Installable on mobile
- **Live Map** with Leaflet
- **Master Admin Override** (for development)

## 📡 Twilio SMS Fallback (NEW)

The app features an integrated Twilio SMS engine for critical life-safety scenarios:
- Triggers **automatically after 5 minutes** if an emergency is unassigned.
- **Offline-recovery**: Resends SOS directly via SMS right after the device regains internet connection.
- **Cost**: Outbound SMS to mobile numbers in PH (Globe, Smart) is ~$0.024–$0.241 per segment.
- **Setup**: Alphanumeric Sender IDs (e.g. `BRGYTANOD`) are highly recommended in the Philippines and must be pre-registered via Twilio's portal.

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind + Zustand
- **Real-time**: Socket.io
- **Maps**: Leaflet + React-Leaflet
- **Auth**: Firebase Auth + Custom RBAC
- **Audio**: Web Audio API + SpeechSynthesis
- **Offline**: Dexie + Custom Queue
- **Deployment**: Docker / Vercel + Render

## 🚀 Quick Start

```bash
git clone https://github.com/MiB1968/Brgy.Tanod-S.O.S.git
cd Brgy.Tanod-S.O.S

cp .env.example .env
# Fill in your Firebase and other keys

npm install
npm run dev:full
```

## 📱 Available Roles

- `resident` – Report emergencies
- `tanod` – Receive alerts + background tracking
- `admin` – Manage system
- `superadmin` – Full access (Ruben/Ben)

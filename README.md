# Brgy Tanod S.O.S. — Tanza, Calabarzon

**Real-time Emergency Response System for Barangay Tanods**

A modern, offline-first PWA designed for Philippine barangays to improve emergency response time and coordination.

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen) 
![PWA](https://img.shields.io/badge/PWA-Installable-blue)
![Offline](https://img.shields.io/badge/Offline-First-orange)

## ✨ Key Features

- **Real-time Tanod Tracking** (Background + Visibility API)
- **Offline SOS Reporting** with photo support + auto-sync
- **Aggressive Offline Map Tiles** (OpenStreetMap)
- **Guardian AI** — Fully offline WebLLM assistant (Tagalog + English)
- **Smart Dispatch** — Auto-assign nearest Tanod via Cloud Functions
- **FCM Push Notifications** + Voice Commands
- **PWA + Capacitor** ready for Play Store
- **Role-based Dashboards** (Tanod / Admin)

## 🚀 Quick Start

```bash
git clone https://github.com/MiB1968/Brgy.Tanod-S.O.S.git
cd Brgy.Tanod-S.O.S
npm install
npm run dev
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind
- **Maps**: Leaflet + Offline Caching
- **Backend**: Firebase (Firestore, Functions, Auth, FCM)
- **Offline**: Dexie.js + Workbox + WebLLM
- **Mobile**: Capacitor (Android/iOS ready)
- **AI**: WebLLM (Phi-3.5, Llama-3.2) running locally

## Folder Structure

See `docs/STRUCTURE.md` for details.

## Deployment

```bash
./scripts/deploy.sh
```

## Screenshots

*(Add screenshots here once available)*

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

MIT © 2026 Brgy Tanod S.O.S. Team

**Made with ❤️ for Philippine Barangays**

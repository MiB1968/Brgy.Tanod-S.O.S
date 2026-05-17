# 🚨 Brgy. Tanod S.O.S.

**A mobile-first, offline-resilient emergency response system for Philippine Barangays**

Real-time SOS alerts • Tagalog Voice System • Web Audio Effects • Guardian Floating Button • Tanod GPS Tracking

![Hero Image](https://via.placeholder.com/800x400?text=Brgy+Tanod+SOS+Dashboard)

---

## ✨ Key Features

- **🔊 Advanced Audio System** — Siren, heartbeat, procedural reverb + **Tagalog SSML TTS**
- **📱 Floating Guardian Button** — Draggable SOS button always accessible
- **🌐 Offline-First** — Works without internet (local TTS fallback + cached maps)
- **🛰️ Real-time GPS** — Live tracking of Tanod responders
- **📡 Backend as Single Source of Truth** — Strict security model
- **📲 Mobile Optimized** — PWA-ready with excellent touch experience

---

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: Express + TypeScript + Firebase
- **Audio**: Web Audio API + Google TTS + Local SSML Tagalog
- **Maps**: Leaflet + Offline tiles
- **Real-time**: WebSocket

---

## 🚀 Quick Start

```bash
# 1. Clone & Install
git clone https://github.com/MiB1968/Brgy.Tanod-S.O.S.git
cd Brgy.Tanod-S.O.S
npm install

# 2. Environment
cp .env.example .env
# Fill in your Firebase + API keys

# 3. Run
npm run dev
```

---

## 🎵 Audio System Highlights

- `EmergencySoundManager` — Single source of truth for all emergency audio
- Full Tagalog voice support with SSML
- Procedural siren, heartbeat, spatial audio + reverb
- Global volume control ready

---

## 📱 Mobile Experience

- Draggable Floating Guardian SOS Button
- One-tap emergency activation
- Voice feedback in Tagalog

**Made with ❤️ for Philippine Barangays**

---

## License

MIT License — Free to use for any LGU / Barangay.

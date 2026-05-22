# Project Structure

## Overview

This is a modern, offline-first emergency response system for Barangay Tanod.

## Directory Structure

```
/
├── public/                  # Static assets
│   ├── icons/
│   ├── sounds/
│   └── offline-tile.png
│
├── src/
│   ├── components/          # React components
│   │   ├── common/          # Reusable UI
│   │   └── [feature components]
│   ├── services/            # Business logic services
│   ├── lib/                 # Utilities & configs (firebase, fcm, etc.)
│   ├── store/               # Zustand state management
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page-level components
│   ├── workers/             # Web Workers (WebLLM)
│   ├── App.tsx
│   └── main.tsx
│
├── functions/               # Firebase Cloud Functions
│   └── src/
│       ├── index.ts
│       ├── sosFunctions.ts
│       ├── notifications.ts
│       └── tanodLocation.ts
│
├── scripts/                 # Deployment & utility scripts
├── docs/                    # Documentation
├── tests/                   # Test files & archives
├── capacitor.config.ts      # Mobile native config
├── vite.config.ts
├── firebase.json
├── firestore.rules
└── README.md
```

## Key Design Decisions

- **Services Pattern**: All major logic in `/services`
- **Offline-First**: Dexie + WebLLM + PWA caching
- **Web Workers**: Heavy AI computation off main thread
- **Barrel Exports**: Clean imports via `index.ts`

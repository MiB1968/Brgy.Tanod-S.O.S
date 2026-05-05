# Brgy. Tanod S.O.S. System

A mobile-first emergency response web app for Philippine barangay operations. The system connects citizens, Tanod patrol officers, and barangay admins in a real-time SOS and deployment coordination platform.

## Architecture

This project is a React/TypeScript frontend (Vite) with a Node.js Express backend (`server.ts`).
It uses Supabase for Postgres and Realtime features, and Firebase for Authentication and Firestore.

### Security Best Practices Implemented:
- Firebase config and API keys (`GEMINI_API_KEY`, `SEMAPHORE_API_KEY`) are kept out of tracking/client-side where possible.
- SMS dispatch calls are proxied through the backend (`/api/sms`).
- Input validation on WebSocket and SOS HTTP endpoints is handled via Zod on the server.
- Supabase Row Level Security (RLS) is enabled (see `SUPABASE_SETUP.sql`).

## Running the Application

1. Install dependencies:
   ```sh
   npm install
   ```

2. Environment Setup:
   Copy `.env.example` to `.env` and fill in necessary keys.

3. Run Development Server:
   ```sh
   npm run dev
   ```

## Integrations

- **GPS/Maps:** `react-leaflet` combined with real-time websocket updates (`/ws/gps`) on the Express backend.
- **SMS Notifications:** Handled by [Semaphore API](https://semaphore.co), configured in `.env` and proxied via `server.ts`.
- **AI Triage:** Configured with Gemini 2.5 (`GEMINI_API_KEY`) for summarizing and triaging emergency reports.

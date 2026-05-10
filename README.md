# Brgy. Tanod S.O.S. System

A mobile-first emergency response web app for Philippine barangay operations. The system connects citizens, Tanod patrol officers, and barangay admins in a real-time SOS and deployment coordination platform.

## Architecture

This project is a React/TypeScript frontend (Vite) with an Express backend (`server.ts`).
It uses Firebase for Authentication and Firestore as the database. The system strictly adheres to the "Backend as Single Source of Truth" mandate, with all communication securely proxied and validated by the backend.

### Security Best Practices Implemented:
- Firebase config and external API keys (`GEMINI_API_KEY`, `SEMAPHORE_API_KEY`) are kept on the server to prevent client-side exposure.
- All backend routes (`/api/*`) require an API key (`VITE_API_SECRET_KEY`) sent via the `x-api-key` header to prevent unauthorized access.
- SMS dispatch calls are securely proxied through the backend (`/api/sms`).
- Input validation on WebSocket and SOS HTTP endpoints is handled securely on the server.
- Completely eliminated rogue direct client-side database calls.

## Running the Application

1. Install dependencies:
   ```sh
   npm install
   ```

2. Environment Setup:
   Copy `.env.example` to `.env` and fill in necessary keys, including `VITE_API_SECRET_KEY` and Firebase credentials.

3. Run Development Server:
   ```sh
   npm run dev
   ```

## Integrations

- **GPS/Maps:** `react-leaflet` combined with real-time websocket updates (`/ws/gps`) on the Express backend.
- **SMS Notifications:** Handled by [Semaphore API](https://semaphore.co), configured in `.env` and proxied via `server.ts`.
- **AI Triage/Guardian AI:** Configured with Gemini (`GEMINI_API_KEY`) for monitoring, summarizing, and triaging emergency reports.
- **Backend Analytics:** Dedicated API endpoints for fetching real-time dashboard analytics and statistics.

# Brgy. Tanod S.O.S — GODMODE Deep Dive Audit
**Repo:** `Brgy.Tanod-S.O.S-main` | **Date:** 2026-06-07 | **Files reviewed:** 160+

---

## SEVERITY LEGEND
- 🔴 **CRITICAL** — Breaks core functionality or security right now
- 🟠 **HIGH** — Causes incorrect behavior, data loss, or auth failure in common scenarios
- 🟡 **MEDIUM** — Degrades developer experience, causes silent failures, or creates maintenance hazards
- 🟢 **LOW / INFO** — Observations, dead code, architectural notes

---

## 🔴 CRITICAL — CRIT-AI-01: All Gemini Model Names Are Phantom Strings
**File:** `src/server/config/aiModels.ts`

Every AI feature in this app (incident triage, JARVIS voice dispatcher, Guardian AI, TTS routing, report drafting) is broken silently in production because the model names fed to the Gemini API don't exist.

| Tier | Current (broken) | Fixed |
|------|-----------------|-------|
| `flash` | `gemini-3.5-flash` | `gemini-2.0-flash-lite` |
| `pro` | `gemini-3.5-flash` ← *same as flash!* | `gemini-2.0-flash` |
| `critical` | `gemini-3.1-pro-preview` | `gemini-2.5-pro-preview-06-05` |

**Double bug:** `flash` and `pro` tiers used the SAME model name, making the tier routing logic completely pointless — both tiers dispatched identical requests.

**Impact:** Every call to `analyzeIncident()`, `getGuardianResponse()`, `voiceAssistantService.executeCommand()` crashes with a 404 API error from Google. Fallback analysis kicks in for incident triage (silently degraded), but JARVIS voice commands fail entirely (no fallback).

**Fix:** `brgy-fixes/aiModels.ts` — Replace with correct model identifiers.

---

## 🔴 CRITICAL — CRIT-TYPES-01: Server UserRole Is Wrong Type, Wrong Values
**File:** `src/server/types/index.ts`

```typescript
// CURRENT (broken):
export type UserRole = "CITIZEN" | "TANOD" | "ADMIN" | "CAPTAIN";

// ACTUAL DB values and src/types.ts:
export type UserRole = 'resident' | 'tanod' | 'admin' | 'super_admin' | ...;
```

**Problems caused:**
1. `CITIZEN` does not exist as a DB role. The real role is `resident`. This is why `socketAuth.ts` has the hack: `if (normalizedRole === "citizen") normalizedRole = "resident"` — it was papering over this mismatch.
2. All strings are uppercase (`"TANOD"`, `"ADMIN"`) but the DB stores lowercase (`'tanod'`, `'admin'`). Any RBAC check like `req.user.role === USER_ROLES.TANOD` silently fails.
3. `super_admin`, `dispatcher`, `captain`, `guest` — all valid roles in the system — are completely absent from the server types, meaning TypeScript silently accepts wrong values in typed server code.
4. `Incident.status` was `"PENDING" | "DISPATCHED"` etc. (uppercase) but `syncController.ts` inserts lowercase `'pending'`, `'resolved'`.

**Fix:** `brgy-fixes/server-types-index.ts` — Align with DB schema and `src/types.ts`.

---

## 🟠 HIGH — HIGH-COOKIE-01: `isProduction = true` Hardcoded — Breaks Local Dev Auth
**File:** `src/server/controllers/authController.ts`, line 82

```typescript
const isProduction = true; // Force production-style cookies for better cross-origin compatibility
const cookieOptions = {
  secure: true,    // ← ALWAYS true
  sameSite: 'none' // ← ALWAYS 'none'
};
```

**Impact:** In local development (HTTP, not HTTPS):
- `secure: true` → browser **silently drops** the auth cookie on every Set-Cookie response
- Every subsequent API call returns `401 Authentication required` even after successful login
- `sameSite: 'none'` requires `secure: true` — without HTTPS this pair is always rejected

This makes local development completely broken for cookie-based auth. You'd have to use a Bearer token workaround, but that requires extra manual setup.

**Fix:** `brgy-fixes/authController-cookie-fix.ts` — Derive from `config.nodeEnv`. Also, there is a **second duplicate** `cookieOptions` block around line 316 that also hardcodes `isProduction = true` — delete that second block and use the exported constant.

---

## 🟠 HIGH — HIGH-DB-SILENT: DB Errors Silently Swallowed
**File:** `src/server/db/index.ts`, lines 20–27

```typescript
(pool as any).query = function (text, params) {
  if (!config.databaseUrl) { return Promise.resolve({ rows: [] }); }
  return originalQuery(text, params).catch(e => {
    console.error(`[DB pool.query Error] ${e.message}`);
    return { rows: [] };  // ← ALL real errors swallowed here
  });
};
```

**Impact:** When `DATABASE_URL` IS set (production, staging), real database errors are swallowed and callers get `{ rows: [] }` back. This causes:
- Constraint violations → silently ignored → duplicate rows
- Connection timeouts → caller thinks "not found" → wrong 404 instead of 503
- Auth queries failing → `dbUser = undefined` → wrong 401/500 cascade
- Any `INSERT` that fails → caller thinks it succeeded → data loss

**Fix:** `brgy-fixes/db-index.ts` — Only mock when `DATABASE_URL` is absent; let real errors propagate.

---

## 🟠 HIGH — HIGH-PUSH-INIT: Double Firebase Admin Init Race Condition
**File:** `src/server/services/pushService.ts`, lines 3–17

```typescript
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
```

`db/index.ts` already initializes Firebase Admin with `projectId`-based config. If `pushService.ts` is imported before `initDatabase()` runs (e.g., during module resolution order), it initializes Firebase with `applicationDefault()` credentials instead. The two initializations use different credential strategies, causing permission mismatches in Cloud Run environments without a service account key file.

**Fix:** `brgy-fixes/pushService.ts` — Remove independent init; import `admin` from `db/index.ts`.

---

## 🟡 MEDIUM — MED-CONSTANTS-01: USER_ROLES Constants Don't Match DB
**File:** `src/server/constants/index.ts`

```typescript
export const USER_ROLES = {
  CITIZEN: "CITIZEN",  // ← DB has no 'CITIZEN' role
  TANOD: "TANOD",      // ← DB stores 'tanod' (lowercase)
  ADMIN: "ADMIN",      // ← DB stores 'admin' (lowercase)
};
```

Any code doing `if (user.role === USER_ROLES.TANOD)` is always false because `user.role` from the DB is `'tanod'` but `USER_ROLES.TANOD === "TANOD"`. Silent permission bypass.

**Fix:** `brgy-fixes/constants-index.ts` — All values lowercase. `CITIZEN` → `RESIDENT` with deprecated alias.

---

## 🟡 MEDIUM — MED-ENV-MISSING: `GEMINI_API_KEY_NEW` Not in .env.example
**Files:** `src/server/services/aiService.ts:18`, `voiceAssistantService.ts:30`, `ttsService.ts:29`

All three AI service files check `process.env.GEMINI_API_KEY_NEW` first as the primary key:
```typescript
const key = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
```

But `GEMINI_API_KEY_NEW` is nowhere in `.env.example`. Operators setting up deployment don't know this rotation mechanism exists and can't use it.

**Fix:** `brgy-fixes/.env.example` — Added with explanation of the rotation pattern.

---

## 🟡 MEDIUM — MED-HMR: Vite HMR Globally Disabled
**File:** `vite.config.ts`, line 80

```typescript
server: {
  hmr: false,  // ← Disabled hot module replacement for ALL dev sessions
}
```

Every change to any React component requires a full browser reload. In standalone `vite dev` mode, HMR works fine — this config was breaking it unnecessarily. The server-mode HMR disable is already handled in `src/server.ts`'s `createViteServer({ server: { hmr: false } })` call.

**Fix:** `brgy-fixes/vite.config.ts` — Remove `server: { hmr: false }`.

---

## 🟡 MEDIUM — MED-CRYPTO-EMPTY: `src/server/utils/crypto.ts` is 0 Bytes
**File:** `src/server/utils/crypto.ts`

This file is completely empty (confirmed: 0 bytes). Any future server code importing from `'../utils/crypto'` (the server-relative path) would get `undefined` exports and crash at runtime with no clear error.

The real implementation is at `src/utils/crypto.ts`. Current server files (`authController.ts`, `syncController.ts`) correctly import from `'../../utils/crypto'` — but the empty server-utils path is a trap.

**Fix:** `brgy-fixes/server-utils-crypto.ts` — Re-export from the real implementation.

---

## 🟡 MEDIUM — MED-FIREBASE-DOUBLE: `authController.ts` Re-Initializes Firebase
**File:** `src/server/controllers/authController.ts`, line 12

```typescript
initDatabase(); // ← called at module load time
```

`db/index.ts` always runs `initDatabase()` as part of the server startup sequence. Calling it again from `authController.ts` is redundant and adds confusion about which file "owns" Firebase initialization.

**Recommendation:** Remove `initDatabase()` from `authController.ts`. Trust that `server.ts` initializes it via `import './server/db/index'`.

---

## 🟡 MEDIUM — MED-SOCKET-EMPTY-HEADERS: Dead io.engine.on('headers') Callback
**File:** `src/server/sockets/index.ts`, lines 71–76

```typescript
io.engine.on('headers', (headers, req) => {
  // Empty — adds no headers
});
```

This is a no-op that was meant to set COEP headers. It was commented out to fix iframe compatibility issues, leaving an empty event handler. Remove the block entirely.

---

## 🟡 MEDIUM — MED-MEMORY-DEDUP: In-Memory SOS Dedup Lost on Server Restart
**File:** `src/server/services/incidentService.ts`, line 42

```typescript
const processedUuids = new Set<string>(); // In-memory only
```

After a server restart, `processedUuids` is cleared. If a resident's offline SOS queue retries submission immediately after a restart, the `clientUuid` dedup check won't catch it (the UUID was in the old Set). The DB-level `UNIQUE(client_uuid)` constraint in `alerts` table is the real safety net here — but it will surface as a DB constraint error (which now propagates correctly after the HIGH-DB-SILENT fix).

**Recommendation:** Add a try/catch around the DB INSERT in `createSOS()` that specifically handles unique-constraint errors (`error.code === '23505'`) and returns a clean `DUPLICATE` response instead of a 500.

---

## 🟢 INFO — Socket Rate Limiter In-Memory
**File:** `src/server/middleware/rateLimiter.ts` (comment already present)

Rate limiters use in-memory storage. On multi-instance deployments (load-balanced Cloud Run), each instance has its own counter. A user can exceed the limit by `N × limit` where `N` is the number of instances. For SOS rate limiting this is a safety concern.

**Recommendation:** When scaling beyond 1 instance, switch to Redis-backed rate limiting (comment already documents this).

---

## 🟢 INFO — Firestore Rules: Alerts.create Requires email_verified
**File:** `firestore.rules`, line 61

```
(request.auth.token.email_verified == true || request.auth.token.role in [...])
```

Users who register via email/password but haven't verified their email can still create alerts IF they have a role claim. This is intentional (tanod/admin bypass) but means an unverified email resident CAN create alerts if the DB registration flow grants them a role claim. Verify this is intended.

---

## 🟢 INFO — `authController.ts` Redundant Double Cookie Block

Around line 316, there's a second `cookieOptions` construction inside the `refreshToken` handler that also hardcodes `isProduction = true`. After applying the `HIGH-COOKIE-01` fix, delete this second block and use the shared `cookieOptions` constant from the fix file.

---

## APPLY ORDER

```
1. brgy-fixes/aiModels.ts                → src/server/config/aiModels.ts
2. brgy-fixes/server-types-index.ts      → src/server/types/index.ts
3. brgy-fixes/db-index.ts                → src/server/db/index.ts
4. brgy-fixes/pushService.ts             → src/server/services/pushService.ts
5. brgy-fixes/constants-index.ts         → src/server/constants/index.ts
6. brgy-fixes/server-utils-crypto.ts     → src/server/utils/crypto.ts
7. brgy-fixes/vite.config.ts             → vite.config.ts
8. brgy-fixes/.env.example               → .env.example
9. MANUAL: authController.ts cookie fix  → see brgy-fixes/authController-cookie-fix.ts
```

---

## EXISTING FIXES ALREADY IN REPO (Well Done)

These security patches from previous sessions are correctly applied:

- ✅ **CRIT-01** — Hardcoded personal email (`rubenlleg12@gmail.com`) removed from `auth.ts` and Firestore rules
- ✅ **CRIT-03** — CORS no longer accepts all origins (`origin: () => true` → allowlist)
- ✅ **HIGH-01** — Token revocation check now applies to Firebase Auth path (not just JWT)
- ✅ **HIGH-01 (Socket)** — `socketAuth.ts` enforces revocation for Firebase-authed sockets
- ✅ **HIGH-02** — Telegram webhook now validates `TELEGRAM_WEBHOOK_SECRET` header
- ✅ **MED-01** — `selfHealingSuperAdmin()` backdoor removed from Firestore rules
- ✅ **CRIT-02 + CRIT-04** — `encryptField` / `decryptField` null-safe, single key source
- ✅ **Client UUID dedup** — `clientUuid` validation and in-memory dedup for SOS
- ✅ **Geofencing** — Out-of-boundary SOS marked for review instead of rejected
- ✅ **App Check** — `requireAppCheck` middleware on all API routes

---

## SUMMARY TABLE

| ID | Severity | File | Status |
|----|----------|------|--------|
| CRIT-AI-01 | 🔴 Critical | `src/server/config/aiModels.ts` | Fix provided |
| CRIT-TYPES-01 | 🔴 Critical | `src/server/types/index.ts` | Fix provided |
| HIGH-COOKIE-01 | 🟠 High | `src/server/controllers/authController.ts` | Fix provided |
| HIGH-DB-SILENT | 🟠 High | `src/server/db/index.ts` | Fix provided |
| HIGH-PUSH-INIT | 🟠 High | `src/server/services/pushService.ts` | Fix provided |
| MED-CONSTANTS-01 | 🟡 Medium | `src/server/constants/index.ts` | Fix provided |
| MED-ENV-MISSING | 🟡 Medium | `.env.example` | Fix provided |
| MED-HMR | 🟡 Medium | `vite.config.ts` | Fix provided |
| MED-CRYPTO-EMPTY | 🟡 Medium | `src/server/utils/crypto.ts` | Fix provided |
| MED-FIREBASE-DOUBLE | 🟡 Medium | `authController.ts` | Manual edit |
| MED-SOCKET-EMPTY-HEADERS | 🟡 Medium | `src/server/sockets/index.ts` | Remove dead code |
| MED-MEMORY-DEDUP | 🟡 Medium | `src/server/services/incidentService.ts` | Recommendation |
| INFO-RATE-LIMIT | 🟢 Info | `rateLimiter.ts` | Documented |

# Fix Batch — Brgy. Tanod S.O.S.
Generated from prior review session (other account). 9 issues, 9 files.

---

## CRIT-01 — Live Firebase API key committed to repo
**Files:**
- `firebase-applet-config.json` → **delete from git**, keep local only
- `firebase-applet-config.example.json` → **commit this** (all empty strings)
- `.gitignore` → add `firebase-applet-config.json`  (see gitignore.patch.txt)
- `src/server/config/index.ts` → replace with `config_index.patch.ts`

**Key behaviour:** Production reads Firebase config from `VITE_FIREBASE_*` env vars.
Dev falls back to local JSON but refuses to load if the old revoked key is present.

**Immediate action:** Rotate the exposed key in Firebase Console → Project Settings
→ General → Your apps → Regenerate API key. The committed key is:
`AIzaSyCiRKS_NqYGHrY_kMz_mY4e0xwE3rUD5bI` — treat it as compromised.

---

## CRIT-02 — API key bypassed all rate limiting and left no audit trail
**File:** `src/server/middleware/auth.ts` → replace with `auth_middleware.patch.ts`

**Key behaviour:**
- API key path now has its own 10 req/min per-IP bucket (in-process).
- Every API key call writes to `audit_logs`.
- Role defaults to `tanod` (not `admin`). Set `API_KEY_ROLE=admin` in env to elevate.
- Synthetic user ID derived from SHA-256(key) — safe to log, never the raw key.
- Hardcoded master email auto-bootstrap removed (was a security hole on its own).

---

## CRIT-04 — clientUuid dedup was in-memory, lost on restart or scale-out
**Files:**
- `src/server/db/migrations/0005_add_client_uuid_dedup.sql` → **run this migration**
- `src/server/services/incidentService.ts` → replace `createSOS` with `incidentService_createSOS.patch.ts`
- `src/server/db/repositories/IncidentRepository.ts` → add `client_uuid` to INSERT (see comment at bottom of patch)

**Key behaviour:** DB-level `UNIQUE` partial index on `client_uuid WHERE NOT NULL`.
Postgres error 23505 on duplicate → returns the existing row so offline sync marks
the item as done without user-visible error.

---

## HIGH-01 — extractProposedActions keyword-matched reply text instead of parsing functionCalls
**File:** `src/server/services/voiceAssistantService.ts`

Replace the `extractProposedActions` method with the version in
`voiceAssistantService_extractProposedActions.patch.ts`.

Also update the two call sites (lines ~261 and ~666):
```ts
// Add before the tool-execution block:
const firstRoundFunctionCalls = result.functionCalls ?? [];

// Replace both extractProposedActions calls:
const proposedActions = this.extractProposedActions(replyText, firstRoundFunctionCalls);
```

**Key behaviour:** Structured tool calls → `ProposedAction[]` with real payloads and
`confidence: 0.95`. Text keyword fallback remains for pure-chat responses.

---

## HIGH-03 — No timeout on Gemini API calls
**File:** `src/server/services/voiceAssistantService.ts`

Replace `executeWithRetry` with the version in
`voiceAssistantService_executeWithRetry.patch.ts`.

**Key behaviour:** Each attempt races against a 15s `withTimeout()`. On expiry,
`err.code === 'TIMEOUT'` is treated as transient, so retry logic applies.
Backoff is now exponential (2s, 4s, 8s) instead of fixed 2s.

---

## HIGH-04 — Three uncoordinated mic streams
**File (new):** `src/lib/microphoneManager.ts` → `microphoneManager.ts`

Then update the three consumers (full instructions in the file comments):

| File | Line | Change |
|---|---|---|
| `src/components/ai/GuardianVoiceAssistant.tsx` | ~65 | `getUserMedia` → `micManager.acquire('guardian-voice', ...)` |
| `src/components/Admin/VoiceBiometricModal.tsx` | ~23 | `getUserMedia` → `micManager.acquire('biometric-modal', ...)` |
| `src/hooks/useShoutDetection.ts` | ~21 | `getUserMedia` → `micManager.acquire('shout-detection', ...)` |

**Key behaviour:** One `MediaStream` shared across all consumers. Hardware track
released only when the last consumer calls `micManager.release()`.

---

## MED-03 — isOnline={true} hardcoded stub
**File (new):** `src/hooks/useOnlineStatus.ts` → `useOnlineStatus.ts`

In `src/App.tsx`:
1. Import `useOnlineStatus`
2. Add `const { isOnline, isReconnecting } = useOnlineStatus();`
3. Change line 347: `isOnline={true}` → `isOnline={isOnline}`

**Key behaviour:** Debounced (2s) network state derived from `navigator.onLine` +
`online`/`offline` events. On reconnect, triggers `syncService.processQueue()` to
flush the offline SOS queue automatically.

---

## MED-05 — geminiModel defaults to non-existent 'gemini-3.5-flash'
**File:** `src/server/config/index.ts` — already fixed in `config_index.patch.ts`.

The default is now `gemini-2.0-flash`. The guard against accidentally pasting an
API key as a model name is also included.

Set `GEMINI_MODEL=gemini-2.0-flash` (or `gemini-1.5-pro` for heavier workloads)
in your environment.

---

## LOW-05 — schedule_patrol tool was a console.log stub
**File:** `src/server/services/dispatcherService.ts`

Replace the `schedule_patrol` handler with `dispatcherService_schedule_patrol.patch.ts`.

Add these imports at the top of `dispatcherService.ts`:
```ts
import { pool } from '../db/index';
import { v4 as uuidv4 } from 'uuid';
```

**Key behaviour:** Validates Tanod user → inserts `patrol_sessions` row → upserts
`patrols` row. Returns `session_id` and `scheduled_end` so the Jarvis voice response
can quote real data.

---

## Application order

Run in this sequence to avoid dependency conflicts:

1. Rotate Firebase API key (immediate — key is already public)
2. `git rm firebase-applet-config.json` + update `.gitignore`
3. Apply `config_index.patch.ts` (MED-05 default also in here)
4. Apply `auth_middleware.patch.ts`
5. Run migration `0005_add_client_uuid_dedup.sql`
6. Apply `incidentService_createSOS.patch.ts`
7. Add `microphoneManager.ts` and update three consumer files
8. Add `useOnlineStatus.ts` and update `App.tsx`
9. Apply both `voiceAssistantService_*.patch.ts`
10. Apply `dispatcherService_schedule_patrol.patch.ts`

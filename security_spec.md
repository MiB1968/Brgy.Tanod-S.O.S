# Firebase Security Specification: Brgy. Tanod S.O.S.

## 1. Data Invariants

- **User Access:** A user document MUST only be modifiable by the user to whom it belongs (based on UID).
- **Incident Integrity:** An Incident MUST have a valid `tanodId` (Patrol Officer ID) and MUST be created by an authorized Tanod.
- **Patrol Location:** A Patrol Location document MUST be created/updated ONLY by the Tanod it belongs to.
- **Alerts:** SOS Alerts are created by residents. A resident can only create alerts for themselves.
- **Immutability:** Fields like `createdAt`, `originalOwnerId`, and `tanodId` MUST be immutable after creation.
- **Terminal State:** An Incident with `status: 'completed'` cannot be updated further.

## 2. The "Dirty Dozen" Payloads (Attack Vectors)

| ID | Attack Vector | Payload | Expected Result |
| :--- | :--- | :--- | :--- |
| 1 | Identity Spoofing | `{ "uid": "other_user_uid", "role": "admin" }` | PERMISSION_DENIED |
| 2 | State Shortcutting | `{ "status": "completed" }` (on an active incident) | PERMISSION_DENIED |
| 3 | Resource Poisoning | `{ "id": "A".repeat(1000) }` (invalid ID length) | PERMISSION_DENIED |
| 4 | Orphaned Write | Incident with `tanodId: "non_existent_tanod"` | PERMISSION_DENIED |
| 5 | Unauthorized PII Read | Get request to `users/{uid}/private` by non-owner | PERMISSION_DENIED |
| 6 | Ghost Field Injection | `{ "status": "active", "isVerified": true }` | PERMISSION_DENIED |
| 7 | Email Spoofing | Spoofed Admin Write (`email_verified: false`) | PERMISSION_DENIED |
| 8 | Terminal State Bypass | Update `completed` incident status to `active` | PERMISSION_DENIED |
| 9 | Immutable Field Mod | Change `createdAt` on existing document | PERMISSION_DENIED |
| 10 | Query Scraping | `allow list` access without restricting to ownerId | PERMISSION_DENIED |
| 11 | Malicious ID Injection| Path variable `{incidentId}` = `../../admins/adminUid` | PERMISSION_DENIED |
| 12 | Value Poisoning | Update `winner` (boolean) with `winner: "string"` | PERMISSION_DENIED |

## 3. Test Runner Invariant

The `firestore.rules.test.ts` will use the Firebase Rules Emulator to execute these 12 scenarios against the draft ruleset. All 12 must return `PERMISSION_DENIED` to proceed to rule finalization.

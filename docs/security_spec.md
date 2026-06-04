# Security Specification: Brgy. Tanod S.O.S.

## 1. Data Invariants (SQL/CockroachDB)
- **Identity Integrity**: All writes to `alerts`, `incidents`, and `users` must be tied to the authenticated `req.user.id`.
- **Alert Sovereignty**: A resident can only update or cancel their own active SOS alerts.
- **Tanod Authority**: Only users with the `tanod` or `admin` role can respond to alerts or create incident reports.
- **Admin Supremacy**: Only `admin` or `super_admin` roles can approve new residents or change user roles.
- **Temporal Strictness**: Audit logs and activity logs use DB-side `now()` for timestamps to prevent forgery.
- **Relational Consistency**: Foreign keys exist between `alerts` and `users` to prevent orphaned records.

## 2. Hardened Protections

### A. Rate Limiting
- **Global API**: 1000 requests per 15 mins.
- **Authentication**: 20 requests per 15 mins (Mitigates Brute-Force).
- **SOS Creation**: 5 requests per minute (Mitigates SOS Spam).

### B. RBAC (Role-Based Access Control)
Implemented in `syncController.ts` and middleware:
1. **Resident Tier**: Can only `GET` their own alerts and profiles. Can only `POST` updates to their own profile.
2. **Tanod Tier**: Can `GET` all alerts, residents, and patrols. Can `POST` updates to any alert (responding/resolving).
3. **Admin Tier**: Full access to `audit_logs` and user management.

### C. CORS Security
- **Strict Origin**: Production origin is locked to the specific deployed URL.
- **Credentials Allowed**: Secure cookies or headers allowed only from trusted origins.

## 3. The "Dirty Dozen" Audit Results (SQL Edition)

| Vulnerability | Attack Vector | Mitigation Status |
| :--- | :--- | :--- |
| Identity Spoofing | Change `resident_id` in payload | **PATCHED** (Controller forces `req.user.id`) |
| Role Escalation | Update `role` field in profile | **PATCHED** (Field removed for non-admins) |
| SOS Spam | Script creating 1000 alerts | **PATCHED** (sosLimiter + Active Check) |
| Ghost Alerts | Create alert for another user | **PATCHED** (Logic verification in `sosController`) |
| PII Leak | GET /api/sync?path=residents/ALL | **PATCHED** (RBAC restricts LIST to Tanod/Admin) |
| Status Shortcut | pending -> resolved bypassing responding | **MONITORED** (Application logic in controllers) |
| Shadow Update | Inject unknown fields to User | **PATCHED** (Field mapping + Allow-listing) |
| Junk Data | 10MB message payload | **MITIGATED** (express.json limit + DB field size) |
| Orphaned Writes | Incident for non-existent alert | **PATCHED** (SQL Foreign Keys) |
| Timestamp Forgery | Client-side future date | **PATCHED** (DB uses `now()`) |
| Anonymous Spam | Create alert without login | **PATCHED** (Auth Middleware) |
| Siren Hijack | Non-admin toggling siren | **PATCHED** (isTanod check in `postSync`) |

## 4. Deployment Readiness
- Environment variables for `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` must be set.
- `helmet` is active with secure headers.
- `logo.png` (2.9MB) replaced with lightweight SVG in branding.

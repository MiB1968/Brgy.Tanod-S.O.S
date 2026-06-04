# Changelog

All notable changes to Brgy.Tanod-S.O.S are documented here.

## [2026-06-04] Security Hardening, Encryption-at-Rest & GPS Audit Remediations

### Major Changes

- **Security Hardening v2**  
  JWT fail-fast production checks, exact CORS origin matching, centralized RBAC middleware with `requireRole`/`requireAnyRole`, `super_admin` as highest privilege, structured audit logging (`actorId`, `entityType`, `metadata`) + `x-request-id` request correlation via AsyncLocalStorage. All critical paths (SOS lifecycle, auth, admin) now instrumented.

- **Encryption-at-Rest (Full Implementation)**  
  AES-256-GCM encryption for sensitive resident fields: `bloodType`, `medicalConditions`, `allergies`, `medications`.  
  - New `src/server/utils/crypto.ts` with `encryptField`, `decryptField`, `isEncrypted` (regex).  
  - Safe migration script `scripts/migrate-encryption.ts` (handles existing data + Postgres ARRAY→TEXT).  
  - Consistent `decryptField()` usage in `syncController`, `authController`, `adminController`.  
  - New test suite `src/tests/encryption.test.ts`.  
  Ciphertext is never exposed to clients.

- **SOS Geofence Workflow Polish**  
  Out-of-boundary alerts/incidents now flagged with `status: 'needs_review'` + `review_reason` column instead of deletion.  
  Dispatcher dashboard shows clear "⚠ Outside Barangay Boundary" warning.  
  Active incident queries now include `needs_review` status.  
  Preserves complete forensic/audit trail while enabling review.

- **GPS Tracking System Audit Remediations** (see `GPS_Audit_Report.md`)  
  - Consolidated three competing tracking implementations into `tanodLocationService.ts` + `useLocationTracking.ts`.  
  - Persistent `location_history` table in Postgres with UUID, timestamp, PostGIS `GEOMETRY` (`ST_MakePoint`), and GIST indexes → restart resilience + full movement forensics.  
  - Dedicated high-frequency `sos_location_stream` (3-second interval) emitted to `sos:{alertId}` room when `activeAlertId` is set.  
  - Smart 10-minute in-memory TTL cache for `barangay_boundaries` geofence checks.  
  - Consistent `normalizeRole()` application.  
  - Legacy `gpsService.ts` deprecated.

### Other Improvements
- Numerous code-health cleanups (removal of unused imports across TanodDashboard, ResidentProfile, etc.).
- Performance optimizations (location socket batching, LiveMap memoization) in active `bolt/*` branches.
- Enhanced test coverage for encryption flows and security paths.
- `firestore.rules` updated with stronger `email_verified` gate on alert creation and immutable role enforcement.

These merges represent a major step toward production readiness, with significantly improved security posture, forensic capability (full location + audit trails), and SOS workflow integrity.

## Previous

See git history for earlier development (heavy feature branching + rapid AI-assisted iteration).
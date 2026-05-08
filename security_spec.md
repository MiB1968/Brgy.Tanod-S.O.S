# Security Specification: Brgy. Tanod S.O.S.

## 1. Data Invariants
- A **User** profile must exist for all authenticated actions.
- An **Alert** (SOS) cannot be created without a valid resident identity.
- **Alert** status transitions must be unidirectional (pending -> responding -> resolved/cancelled).
- **Tanod** locations are only visible to authorized personnel (Admin, Tanod) or a resident who has an active emergency assigned to that unit.
- **System Broadcasts** can only be initiated by verified Admins.

## 2. The "Dirty Dozen" Payloads

1.  **Identity Spoofing**: Attempt to create a user profile with a different `uid` than the authenticated one.
2.  **Role Escalation**: Attempt to update own `role` to 'admin'.
3.  **Ghost Alert**: Create an SOS alert with a `residentId` that doesn't match the sender.
4.  **Shadow Update**: Update an alert using `affectedKeys()` bypass (if the rule didn't have `hasOnly`).
5.  **Status Shortcut**: Transition an alert from 'pending' directly to 'resolved' bypassing 'responding' (or other state logic).
6.  **Junk Data Injection**: Inject a 1MB string into the alert `customMessage`.
7.  **Resource Poisoning**: Use a document ID containing malicious scripts or excessive length (>128 chars).
8.  **Unauthorized List Coverage**: Attempt to list all residents as a standard resident.
9.  **PII Leak**: Attempt to 'get' a resident's private profile details (if split).
10. **Orphaned Writes**: Create an `incident` report referencing a non-existent `alert`.
11. **Timestamp Forgery**: Provide a client-side `timestamp` in the future for an alert.
12. **Anonymous Spam**: Attempt to create alerts while unverified (if email verification is mandated).

## 3. Test Runner (Draft)
A comprehensive test suite in `firestore.rules.test.ts` will verify that all above payloads return `PERMISSION_DENIED`.

(Detailed test implementation planned for next step)

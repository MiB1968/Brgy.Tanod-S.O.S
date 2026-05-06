# Security Specification: Brgy. Tanod S.O.S.

## Data Invariants
1. **Citizens (Residents)**: Can only register once. Their profile stays 'pending' until an Admin approves. They can only view their own profile.
2. **Alerts (SOS)**: Must belong to a valid resident. Can only be updated by the resident who created it (cancellation) or a Tanod/Admin (resolution/response).
3. **Users (Auth Profiles)**: Every user must have a corresponding profile entry in the `users` collection determining their role.
4. **Tanod Tracking**: Only users with the 'tanod' role can write to the `tanods` (status/GPS) and `patrols` collections.
5. **System Config**: Only Tanods and Admins can toggle the global siren.

## The "Dirty Dozen" Payloads (Deny Test Cases)
1. **Identity Spoofing**: Resident A tries to update Resident B's profile.
2. **Privilege Escalation**: Resident tries to set their role to 'admin' in `users`.
3. **Ghost Field Injection**: Resident adds `isAdmin: true` to their SOS alert document.
4. **ID Poisoning**: Malicious user creates an SOS alert with a 2MB string as the document ID.
5. **Orphaned Write**: Creating an alert with a `residentId` that doesn't exist in `users`.
6. **State Shortcutting**: Resident tries to update an alert status directly to 'resolved' (must be done by Tanod).
7. **Terminal State Bypass**: Updating an alert after it has been marked 'resolved'.
8. **PII Leak**: Unauthenticated user tries to read the `residents` collection.
9. **Resource Exhaustion**: Sending a custom message in an SOS alert that is 1MB in size.
10. **Timestamp Fraud**: Resident tries to set `timestamp` to a future date instead of `request.time`.
11. **Relational Sync Break**: Deleting a user profile while they have active alerts.
12. **Blanket Read Attack**: Authenticated resident tries to `list` all documents in the `residents` collection without a filter.

## Evaluation
These rules protect against Identity, Integrity, and State violations by enforcing strict schema validation and relational checks using `get()` and `exists()`.

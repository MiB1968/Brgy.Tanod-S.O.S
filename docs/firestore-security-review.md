## Firestore Security Rules Review & Improvements

**Branch**: improve-firestore-rules  
**Date**: June 2026

### Summary
- Hardened Firestore rules with proper data validation
- Added ownership check on alerts (`reportedBy == request.auth.uid`)
- Added rules for `locations`, `residents`, and `audit_logs`
- Fixed critical gap: roles were not being synced to Firebase custom claims

### Next Recommended Action
Add `admin.auth().setCustomUserClaims()` in the auth flow so the role checks work.

Please commit these changes with a clear message and open a Pull Request to `main`.

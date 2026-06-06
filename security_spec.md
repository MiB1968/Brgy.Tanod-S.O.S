# Security Specification: Brgy.Tanod-S.O.S

## Data Invariants
- An Alert can only be created by a verified resident.
- An Alert owner must match the Firestore document auth.uid.

## The Dirty Dozen Payloads
1. Create alert with someone else's residentId.
2. Create alert with type as 1MB string.
3. Update alert status to 'resolved' as non-admin.

## Test Runner (firestore.rules.test.ts placeholder)
// TODO: Implement actual testing logic

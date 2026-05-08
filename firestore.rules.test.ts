import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import { beforeAll, afterAll, beforeEach, describe, test, expect } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'brgy-tanod-sos-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe('Dirty Dozen Security Tests', () => {
  // Scenario 1: Identity Spoofing
  test('Prevents Identity Spoofing', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    await assertFails(
      setDoc(doc(alice.firestore(), 'users/malicious_uid'), { 
        uid: 'alice', 
        email: 'attacker@example.com',
        role: 'resident',
        status: 'pending'
      })
    );
  });

  // Scenario 2: Role Escalation
  test('Prevents Role Escalation', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    await assertSucceeds(
      setDoc(doc(alice.firestore(), 'users/alice'), {
        uid: 'alice',
        email: 'alice@example.com',
        role: 'resident',
        status: 'pending'
      })
    );
    await assertFails(
      setDoc(doc(alice.firestore(), 'users/alice'), {
        uid: 'alice',
        email: 'alice@example.com',
        role: 'admin',
        status: 'pending'
      }, { merge: true })
    );
  });

  // Scenario 3: Ghost Alert
  test('Prevents Ghost Alert', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    await assertFails(
      setDoc(doc(alice.firestore(), 'alerts/alert123'), {
        residentId: 'bob',
        status: 'pending',
        timestamp: new Date().toISOString(),
        residentName: 'Alice',
        type: 'Medical'
      })
    );
  });

  // Scenario 4: Shadow Update
  test('Prevents Shadow Update', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    await assertSucceeds(
      setDoc(doc(alice.firestore(), 'alerts/alert_shadow'), {
        residentId: 'alice',
        status: 'pending',
        timestamp: new Date().toISOString(),
        residentName: 'Alice',
        type: 'Medical'
      })
    );
    await assertFails(
      setDoc(doc(alice.firestore(), 'alerts/alert_shadow'), {
        residentId: 'alice',
        status: 'pending',
        timestamp: new Date().toISOString(),
        residentName: 'Alice',
        type: 'Medical',
        respondedBy: 'attacker'
      }, { merge: true })
    );
  });

  // Scenario 5: Status Shortcut
  test('Prevents Status Shortcut', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    await assertSucceeds(
      setDoc(doc(alice.firestore(), 'alerts/alert_status'), {
        residentId: 'alice',
        status: 'pending',
        timestamp: new Date().toISOString(),
        residentName: 'Alice',
        type: 'Medical'
      })
    );
    await assertFails(
      setDoc(doc(alice.firestore(), 'alerts/alert_status'), {
        residentId: 'alice',
        status: 'resolved',
        timestamp: new Date().toISOString(),
        residentName: 'Alice',
        type: 'Medical'
      }, { merge: true })
    );
  });

  // Scenario 6: Junk Data Injection
  test('Prevents Junk Data Injection', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    const largeMessage = 'A'.repeat(500 * 1024);
    await assertFails(
      setDoc(doc(alice.firestore(), 'alerts/alert_junk'), {
        residentId: 'alice',
        status: 'pending',
        timestamp: new Date().toISOString(),
        residentName: 'Alice',
        type: 'Medical',
        customMessage: largeMessage
      })
    );
  });

  // Scenario 7: Resource Poisoning
  test('Prevents Resource Poisoning', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    const maliciousId = 'a'.repeat(129);
    await assertFails(
      setDoc(doc(alice.firestore(), `alerts/${maliciousId}`), {
        residentId: 'alice',
        status: 'pending',
        timestamp: new Date().toISOString(),
        residentName: 'Alice',
        type: 'Medical'
      })
    );
  });

  // Scenario 8: Unauthorized List Coverage
  test('Prevents Unauthorized List Coverage', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    await assertFails(
      getDocs(collection(alice.firestore(), 'users'))
    );
  });

  // Scenario 9: PII Leak
  test('Prevents PII Leak', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    await assertFails(
      getDoc(doc(alice.firestore(), 'residents/bob'))
    );
  });

  // Scenario 10: Orphaned Writes
  test('Prevents Orphaned Writes', async () => {
    const admin = testEnv.authenticatedContext('admin1', { email: 'rubenlleg12@gmail.com', email_verified: true });
    await assertFails(
      setDoc(doc(admin.firestore(), 'incidents/inc123'), {
        tanodId: 'tanod1',
        alertId: 'non_existent_alert_id',
        status: 'resolved',
        type: 'patrol',
        description: 'Testing orphan'
      })
    );
  });

  // Scenario 11: Timestamp Forgery
  test('Prevents Timestamp Forgery', async () => {
    const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true });
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    await assertFails(
      setDoc(doc(alice.firestore(), 'alerts/alert_future'), {
        residentId: 'alice',
        status: 'pending',
        timestamp: futureDate.toISOString(),
        residentName: 'Alice',
        type: 'Medical'
      })
    );
  });

  // Scenario 12: Anonymous Spam
  test('Prevents Anonymous Spam', async () => {
    const unverified = testEnv.authenticatedContext('spammy', { email: 'spam@example.com', email_verified: false });
    await assertFails(
      setDoc(doc(unverified.firestore(), 'alerts/alert_spam'), {
        residentId: 'spammy',
        status: 'pending',
        timestamp: new Date().toISOString(),
        residentName: 'Spammy',
        type: 'Medical'
      })
    );
  });
});

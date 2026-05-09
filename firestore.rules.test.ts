import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import { beforeAll, afterAll, describe, test, expect } from 'vitest';

let testEnv: RulesTestEnvironment;

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
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(
      setDoc(doc(alice.firestore(), 'users/malicious_uid'), { 
        uid: 'alice', 
        email: 'attacker@example.com' 
      })
    );
  });

  // Scenario 7: Resource Poisoning
  test('Prevents Resource Poisoning (Invalid Doc ID)', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const longId = 'a'.repeat(200);
    await assertFails(
      setDoc(doc(alice.firestore(), `alerts/${longId}`), { 
        data: 'malicious' 
      })
    );
  });

  // Scenario 8: Unauthorized List Coverage
  test('Prevents Unauthorized List Coverage', async () => {
    // Resident 'bob' tries to list all residents
    const bob = testEnv.authenticatedContext('bob');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'residents/alice'), { id: 'alice' });
    });
    // Real test requires a query. For now, checking doc read access.
    await assertFails(
      testEnv.authenticatedContext('bob').firestore().collection('residents').get()
    );
  });

  // Scenario 9: PII Leak
  test('Prevents PII Leak', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const bob = testEnv.authenticatedContext('bob');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice/private/info'), { email: 'alice@example.com' });
    });
    
    // Bob should not be able to read Alice's PII
    await assertFails(
      testEnv.authenticatedContext('bob').firestore().doc('users/alice/private/info').get()
    );
  });

  // Scenario 10: Orphaned Writes
  test('Prevents Orphaned Writes', async () => {
    const alice = testEnv.authenticatedContext('alice');
    // Attempt to create a task in a non-existent project
    await assertFails(
      setDoc(doc(alice.firestore(), 'projects/nonexistent/tasks/task1'), { 
        title: 'Task' 
      })
    );
  });

  // Scenario 11: Timestamp Forgery
  test('Prevents Timestamp Forgery', async () => {
    const alice = testEnv.authenticatedContext('alice');
    // Try to set createdAt to 100 years in the future
    await assertFails(
      setDoc(doc(alice.firestore(), 'alerts/alert1'), { 
        createdAt: new Date('2100-01-01').getTime(),
        residentId: 'alice'
      })
    );
  });

  // Scenario 12: Anonymous Spam
  test('Prevents Anonymous Spam', async () => {
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(unauth.firestore(), 'alerts/alert2'), { 
        data: 'spam' 
      })
    );
  });
});


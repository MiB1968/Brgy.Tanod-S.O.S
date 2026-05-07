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
});

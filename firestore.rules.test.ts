import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";

// Mock data for testing
const PROJECT_ID = "brgy-tanod-sos-test";

describe("Firestore Security Rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
        host: "localhost",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("denies access to residents for other residents' profiles", async () => {
    const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com", email_verified: true });
    const bobDoc = alice.firestore().doc("residents/bob");
    await assertFails(bobDoc.get());
  });

  it("prevents privilege escalation during creation", async () => {
    const malicious = testEnv.authenticatedContext("eve", { email: "eve@example.com", email_verified: true });
    const userDoc = malicious.firestore().doc("users/eve");
    await assertFails(userDoc.set({
      uid: "eve",
      name: "Eve",
      role: "admin",
      email: "eve@example.com"
    }));
    
    // Should succeed with 'resident'
    await assertSucceeds(userDoc.set({
      uid: "eve",
      name: "Eve",
      role: "resident",
      email: "eve@example.com"
    }));
  });

  it("restricts incident creation to Tanods", async () => {
    const resident = testEnv.authenticatedContext("resident1", { email: "res@example.com", email_verified: true });
    const incidentDoc = resident.firestore().doc("incidents/report1");
    // This will fail because we have a catch-all deny and no specific rule allowing residents to create incidents
    await assertFails(incidentDoc.set({ title: "Fake Incident" }));
  });
});

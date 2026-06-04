/**
 * Hybrid Data Layer Rules
 * Firestore (alerts/users) + Drizzle/Postgres (residents + location_history)
 *
 * ALWAYS FOLLOW THESE RULES:
 */

export const DataLayerRules = {
  /**
   * Encryption Rule
   * Sensitive fields in `residents` table must be encrypted at rest.
   */
  encryption: {
    fields: ['bloodType', 'medicalConditions', 'allergies', 'medications'] as const,
    encryptBeforeWrite: true,
    decryptOnlyAtAuthorizedAPI: true,
  },

  /**
   * Role Rule
   * Roles come ONLY from Firebase custom claims.
   */
  roles: {
    sourceOfTruth: 'request.auth.token.role',
    clientFieldIsDisplayOnly: true,
    neverTrust: 'users/{uid}.role for access control',
  },

  /**
   * When writing to Postgres (residents)
   */
  beforePostgresWrite: (data: any) => {
    // Always encrypt sensitive fields here (use encryptField from crypto.ts)
  },

  /**
   * When reading from Postgres
   */
  afterPostgresRead: (data: any) => {
    // Always decrypt using decryptField() before returning to client
  },
} as const;

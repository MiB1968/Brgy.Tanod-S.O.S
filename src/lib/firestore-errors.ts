import { auth } from './api';

export type OperationType = 'read' | 'write' | 'update' | 'delete' | 'query';

export interface AuthInfo {
  userId?: string;
  email?: string | null;
  emailVerified?: boolean;
  isAnonymous?: boolean;
  tenantId?: string | null;
  providerInfo?: Array<{
    providerId: string;
    email?: string | null;
  }>;
}

export interface FirestoreErrorInfo {
  error: string;
  authInfo: AuthInfo;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Safe cast since auth might not have currentUser defined in api.ts types
  const currentAuth = (auth as any)?.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
      tenantId: currentAuth?.tenantId,
      providerInfo: currentAuth?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error Details:', errorJson);
  throw new Error(errorJson);
}

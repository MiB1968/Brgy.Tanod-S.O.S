import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleFirestoreError, OperationType } from './firestore-errors';

// Mock the firebase auth module
vi.mock('./firebase', () => {
  return {
    auth: {
      currentUser: null,
    },
  };
});

import { auth } from './firebase';

describe('handleFirestoreError', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.currentUser = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should format Error instances and throw stringified JSON with missing user info', () => {
    const error = new Error('Permission denied');

    let caughtError: Error | undefined;
    try {
      handleFirestoreError(error, OperationType.GET, 'users/123');
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError).toBeInstanceOf(Error);

    const parsedJson = JSON.parse(caughtError!.message);

    expect(parsedJson).toEqual({
      error: 'Permission denied',
      authInfo: {
        providerInfo: []
      },
      operationType: OperationType.GET,
      path: 'users/123'
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Firestore Error Details:', caughtError!.message);
  });

  it('should format non-Error objects correctly', () => {
    const stringError = 'Just a string error';

    let caughtError: Error | undefined;
    try {
      handleFirestoreError(stringError, OperationType.CREATE, 'alerts/1');
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError).toBeInstanceOf(Error);

    const parsedJson = JSON.parse(caughtError!.message);
    expect(parsedJson.error).toBe('Just a string error');
  });

  it('should include full auth information when user is logged in', () => {
    // Set up mock user
    (auth as any).currentUser = {
      uid: 'user-123',
      email: 'test@example.com',
      emailVerified: true,
      isAnonymous: false,
      tenantId: 'tenant-456',
      providerData: [
        {
          providerId: 'password',
          email: 'test@example.com'
        },
        {
          providerId: 'google.com',
          email: 'google@example.com'
        }
      ]
    };

    const error = new Error('Not found');

    let caughtError: Error | undefined;
    try {
      handleFirestoreError(error, OperationType.DELETE, 'posts/5');
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError).toBeInstanceOf(Error);

    const parsedJson = JSON.parse(caughtError!.message);

    expect(parsedJson).toEqual({
      error: 'Not found',
      authInfo: {
        userId: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        isAnonymous: false,
        tenantId: 'tenant-456',
        providerInfo: [
          {
            providerId: 'password',
            email: 'test@example.com'
          },
          {
            providerId: 'google.com',
            email: 'google@example.com'
          }
        ]
      },
      operationType: OperationType.DELETE,
      path: 'posts/5'
    });
  });

  it('should handle missing providerData array gracefully', () => {
    // Set up mock user without providerData
    (auth as any).currentUser = {
      uid: 'user-123',
    };

    let caughtError: Error | undefined;
    try {
      handleFirestoreError(new Error('Test'), OperationType.UPDATE, null);
    } catch (e) {
      caughtError = e as Error;
    }

    const parsedJson = JSON.parse(caughtError!.message);
    expect(parsedJson.authInfo.providerInfo).toEqual([]);
  });
});

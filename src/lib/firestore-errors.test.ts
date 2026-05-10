import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleFirestoreError } from './firestore-errors';

// Correctly mock the external api module using vi.mock
vi.mock('./api', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerData: [
        { providerId: 'password', email: 'test@example.com' }
      ]
    }
  }
}));

describe('handleFirestoreError', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Spy on console.error to intercept logs and prevent terminal clutter
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should format Error instances and log JSON with auth info', () => {
    const error = new Error('Permission denied');

    // Function should throw
    expect(() => handleFirestoreError(error, 'read', 'users/doc1')).toThrowError();

    // Verify console.error was called
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    // Parse the logged JSON string
    const loggedJsonStr = consoleErrorSpy.mock.calls[0][1];
    const loggedJson = JSON.parse(loggedJsonStr);

    // Verify JSON structure
    expect(loggedJson.error).toBe('Permission denied');
    expect(loggedJson.operationType).toBe('read');
    expect(loggedJson.path).toBe('users/doc1');

    // Verify Auth Info is populated from mock
    expect(loggedJson.authInfo.userId).toBe('test-user-123');
    expect(loggedJson.authInfo.email).toBe('test@example.com');
    expect(loggedJson.authInfo.emailVerified).toBe(true);
    expect(loggedJson.authInfo.providerInfo.length).toBe(1);
    expect(loggedJson.authInfo.providerInfo[0].providerId).toBe('password');
  });

  it('should stringify non-Error objects correctly', () => {
    const customError = { code: 403, message: 'Forbidden' };

    expect(() => handleFirestoreError(customError, 'write', 'settings/app')).toThrowError();

    const loggedJsonStr = consoleErrorSpy.mock.calls[0][1];
    const loggedJson = JSON.parse(loggedJsonStr);

    expect(loggedJson.error).toBe(String(customError)); // '[object Object]'
    expect(loggedJson.operationType).toBe('write');
  });

  it('should handle string errors', () => {
    const errorStr = "A string error occurred";

    expect(() => handleFirestoreError(errorStr, 'update', null)).toThrowError();

    const loggedJsonStr = consoleErrorSpy.mock.calls[0][1];
    const loggedJson = JSON.parse(loggedJsonStr);

    expect(loggedJson.error).toBe('A string error occurred');
    expect(loggedJson.path).toBeNull();
  });

  it('should handle missing auth/currentUser gracefully', async () => {
    // Import the mocked module
    const api = await import('./api');

    // Temporarily set currentUser to null for this test
    const authAsAny = api.auth as any;
    const originalUser = authAsAny.currentUser;
    authAsAny.currentUser = null;

    const error = new Error('Unauthenticated error');

    expect(() => handleFirestoreError(error, 'delete', 'data/item1')).toThrowError();

    const loggedJsonStr = consoleErrorSpy.mock.calls[0][1];
    const loggedJson = JSON.parse(loggedJsonStr);

    // Auth fields should be undefined/empty when currentUser is null
    expect(loggedJson.authInfo.userId).toBeUndefined();
    expect(loggedJson.authInfo.email).toBeUndefined();
    expect(loggedJson.authInfo.providerInfo).toEqual([]);

    // Restore mock state
    authAsAny.currentUser = originalUser;
  });
});

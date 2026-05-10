import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../lib/api';

// Mock the global fetch
global.fetch = vi.fn();

describe('Auth Flow API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call fetch API with correct credentials on login', async () => {
    const mockResponse = { user: { id: '123', name: 'Test User', role: 'resident' } };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const credentials = { email: 'test@example.com', password: 'password123' };
    const result = await api.auth.login(credentials);

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json'
      }),
      credentials: 'include',
      body: JSON.stringify(credentials)
    }));

    expect(result).toEqual(mockResponse);
  });

  it('should throw an error on login failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    const credentials = { email: 'test@example.com', password: 'wrongpassword' };

    await expect(api.auth.login(credentials)).rejects.toThrow('Invalid credentials');
  });
});

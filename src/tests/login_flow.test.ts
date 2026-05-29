import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../server/controllers/authController';
import bcrypt from 'bcryptjs';
import { pool } from '../server/db/index';

// Mock dependencies
vi.mock('../server/db/index', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
  admin: {
    auth: () => ({
      verifyIdToken: vi.fn(),
      createUser: vi.fn(),
    }),
    apps: [],
  },
  initDatabase: vi.fn(),
}));

vi.mock('../server/services/auditService', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/config/index', () => ({
  config: {
    jwtSecret: 'test_secret',
    firebase: { projectId: 'test-project' },
  },
}));

function mockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
}

describe('authController.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully logs in with correct credentials', async () => {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Mock user found in DB
    (pool.query as any).mockResolvedValueOnce({
      rows: [{
        id: 'user-id',
        email: 'resident@brgytanod.com',
        password: hashedPassword,
        name: 'Test Resident',
        role: 'resident',
        status: 'approved',
        token_version: 1
      }]
    });

    const req: any = {
      body: {
        email: 'resident@brgytanod.com',
        password: 'password123'
      }
    };
    const res = mockResponse();

    await authController.login(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Login successful',
      data: expect.objectContaining({
        user: expect.objectContaining({
          email: 'resident@brgytanod.com'
        }),
        token: expect.any(String)
      })
    }));
    expect(res.cookie).toHaveBeenCalledWith('token', expect.any(String), expect.any(Object));
  });

  it('fails with incorrect password', async () => {
    const hashedPassword = await bcrypt.hash('correct-password', 12);

    (pool.query as any).mockResolvedValueOnce({
      rows: [{
        id: 'user-id',
        email: 'resident@brgytanod.com',
        password: hashedPassword,
        role: 'resident',
      }]
    });

    const req: any = {
      body: {
        email: 'resident@brgytanod.com',
        password: 'wrong-password'
      }
    };
    const res = mockResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        message: 'Invalid email or password.'
      })
    }));
  });
});

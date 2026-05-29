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
      createUser: vi.fn().mockResolvedValue({ uid: 'firebase-uid' }),
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

describe('authController provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-provisions a demo resident if they do not exist', async () => {
    // 1. Mock first query: user not found
    (pool.query as any).mockResolvedValueOnce({ rows: [] });

    // 2. Mock second query: successful insertion
    const hashedPassword = await bcrypt.hash('tanod123', 12);
    (pool.query as any).mockResolvedValueOnce({
      rows: [{
        id: 'new-user-id',
        email: 'resident@brgytanod.com',
        password: hashedPassword,
        name: 'Demo User',
        role: 'resident',
        status: 'approved',
        token_version: 1
      }]
    });

    const req: any = {
      body: {
        email: 'resident@brgytanod.com',
        password: 'tanod123'
      }
    };
    const res = mockResponse();

    await authController.login(req, res);

    // Verify it attempted to provision (second query should be an INSERT)
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['resident@brgytanod.com', 'Demo User', 'resident', 'approved'])
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Login successful'
    }));
  });
});

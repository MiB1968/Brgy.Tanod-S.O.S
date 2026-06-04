import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../server/controllers/authController';
import bcrypt from 'bcryptjs';

// Mocks
vi.mock('../server/db/index', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn(),
      release: vi.fn()
    })
  },
  admin: {
    auth: () => ({
      createUser: vi.fn(),
      verifyIdToken: vi.fn()
    })
  },
  initDatabase: vi.fn()
}));

// Re-import to get the mocked pool
import { pool } from '../server/db/index';

vi.mock('../server/services/auditService', () => ({
  logAction: vi.fn().mockResolvedValue(true)
}));

vi.mock('../server/config/index', () => ({
  config: {
    jwtSecret: 'test-secret',
    encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  }
}));

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
};

describe('Demo User Provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('automatically provisions a missing resident demo account', async () => {
    const demoEmail = 'resident@brgytanod.com';
    const hashedPass = await bcrypt.hash('tanod123', 12);
    
    // First query returns nothing (user not found)
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
    // Second query returns the newly inserted user with a valid hash
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ id: 'd1', email: demoEmail, role: 'resident', status: 'approved', password: hashedPass }]
    });

    const req: any = { body: { email: demoEmail, password: 'tanod123', isGoogle: false } };
    const res = mockRes();

    await authController.login(req, res);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining([demoEmail, 'Demo User', 'resident', 'approved', expect.any(String)])
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('automatically provisions a missing admin demo account', async () => {
    const demoEmail = 'admin@brgytanod.com';
    const hashedPass = await bcrypt.hash('tanod123', 12);
    
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ id: 'd2', email: demoEmail, role: 'admin', status: 'approved', password: hashedPass }]
    });

    const req: any = { body: { email: demoEmail, password: 'tanod123', isGoogle: false } };
    const res = mockRes();

    await authController.login(req, res);

    expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([demoEmail, 'Demo User', 'admin', 'approved', expect.any(String)])
    );
  });
});

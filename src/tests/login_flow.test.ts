import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../server/controllers/authController';
import bcrypt from 'bcryptjs';

// Mocks for database and services
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
      verifyIdToken: vi.fn(),
      createUser: vi.fn()
    })
  },
  initDatabase: vi.fn()
}));

// Re-import after mock to get the mocked versions
import { pool } from '../server/db/index';

vi.mock('../server/services/auditService', () => ({
  logAction: vi.fn().mockResolvedValue(true)
}));

vi.mock('../server/config/index', () => ({
  config: { jwtSecret: 'test-secret' }
}));

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
};

describe('Login Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successful standard login with correct credentials', async () => {
    const password = 'correct-pass';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Mock database response for user lookup
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ id: 'u123', email: 'user@example.com', password: hashedPassword, role: 'resident', token_version: 1 }]
    });

    const req: any = { body: { email: 'user@example.com', password: password, isGoogle: false } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.cookie).toHaveBeenCalledWith('token', expect.any(String), expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        user: expect.objectContaining({ email: 'user@example.com' })
      })
    }));
  });

  it('fails with incorrect password', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ id: 'u123', email: 'user@example.com', password: 'hashed-password', role: 'resident' }]
    });

    const req: any = { body: { email: 'user@example.com', password: 'wrong-password', isGoogle: false } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ message: 'Invalid email or password.' })
    }));
  });
});

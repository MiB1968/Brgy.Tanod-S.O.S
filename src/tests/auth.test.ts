import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate, authorize } from '../server/middleware/auth';
import jwt from 'jsonwebtoken';

vi.mock('../server/config/index', () => ({
  config: { jwtSecret: 'test_secret_only' },
}));

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const SECRET = 'test_secret_only';

describe('authenticate middleware', () => {
  it('calls next() and attaches user when token is valid (cookie)', () => {
    const token = jwt.sign({ id: 'u1', email: 't@t.com', role: 'resident' }, SECRET);
    const req: any = { cookies: { token }, headers: {} };
    const next = vi.fn();
    authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('u1');
    expect(req.user.role).toBe('resident');
  });

  it('calls next() and attaches user when token is valid (Authorization header)', () => {
    const token = jwt.sign({ id: 'u2', email: 'a@a.com', role: 'admin' }, SECRET);
    const req: any = { cookies: {}, headers: { authorization: `Bearer ${token}` } };
    const next = vi.fn();
    authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('admin');
  });

  it('returns 401 when no token is provided', () => {
    const req: any = { cookies: {}, headers: {} };
    const res = mockRes();
    authenticate(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('returns 401 for an invalid/tampered token', () => {
    const req: any = { cookies: { token: 'invalid.token.value' }, headers: {} };
    const res = mockRes();
    authenticate(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for a token signed with the wrong secret', () => {
    const token = jwt.sign({ id: 'u3', role: 'tanod' }, 'wrong_secret');
    const req: any = { cookies: { token }, headers: {} };
    const res = mockRes();
    authenticate(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('authorize middleware', () => {
  it('calls next() when the user role is in the allowed list', () => {
    const req: any = { user: { id: 'u1', role: 'admin', email: 'a@a.com' } };
    const next = vi.fn();
    authorize(['admin', 'superadmin'])(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when the user role is not in the allowed list', () => {
    const req: any = { user: { id: 'u1', role: 'resident', email: 'r@r.com' } };
    const res = mockRes();
    authorize(['admin'])(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when req.user is undefined', () => {
    const req: any = {};
    const res = mockRes();
    authorize(['admin'])(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

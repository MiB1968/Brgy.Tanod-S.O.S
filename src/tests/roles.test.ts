import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { authenticate, AuthRequest, _testAppPromise } from '../../server';
import jwt from 'jsonwebtoken';
import request from 'supertest';

vi.mock('jsonwebtoken');

describe('Role Guards & Middleware', () => {
  describe('authenticate middleware', () => {
    it('should return 401 if token is missing', () => {
      const req: Partial<AuthRequest> = { cookies: {} };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      authenticate(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Auth required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() and populate req.user on valid token', () => {
      const mockPayload = { id: 'admin1', role: 'admin' };
      (jwt.verify as any).mockReturnValueOnce(mockPayload);

      const req: Partial<AuthRequest> = { cookies: { token: 'valid.jwt.token' } };
      const res: any = {};
      const next = vi.fn();

      authenticate(req as any, res, next);

      expect(req.user).toEqual(mockPayload);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/users/:id/role endpoint', () => {
    let app: any;
    let serverInstance: any;

    beforeAll(async () => {
      const result = await _testAppPromise;
      if (result) {
        app = result.app;
        serverInstance = result.server;
      }
    });

    afterAll(() => {
      if (serverInstance) {
        serverInstance.close();
      }
    });

    it('should return 403 if user is not admin or superadmin', async () => {
      // Mock verify to return a resident
      (jwt.verify as any).mockReturnValue({ id: 'res1', role: 'resident' });

      const response = await request(app)
        .patch('/api/users/123/role')
        .set('Cookie', ['token=valid.token'])
        .send({ role: 'tanod' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Forbidden');
    });
  });
});

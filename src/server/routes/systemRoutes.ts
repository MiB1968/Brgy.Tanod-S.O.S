import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { pool } from '../db/index';
import * as socketService from '../sockets/index';
import * as response from '../utils/response';
import { rateLimit } from 'express-rate-limit';
import { ttsService } from '../services/ttsService';
import { z } from 'zod';

const router = Router();

const PatchUserSchema = z.object({
  status: z.enum(['pending', 'verified', 'active', 'suspended']).optional(),
  role: z.enum(['resident', 'tanod', 'admin', 'superadmin', 'captain']).optional(),
});

const smsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  limit: 10,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many SMS requests. Please wait a moment.' } },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.post('/siren', authenticate, authorize(['admin', 'superadmin', 'tanod']), async (req, res) => {
  const { sirenActive } = req.body;
  try {
    await pool.query(
      "INSERT INTO system_config (key, data, updated_at) VALUES ('siren', $1, now()) ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()",
      [JSON.stringify({ sirenActive })]
    );
    socketService.emitToAll("siren_update", { sirenActive });
    response.success(res, { sirenActive });
  } catch (err: any) {
    response.error(res, err.message);
  }
});

router.patch('/users/:id', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const validated = PatchUserSchema.parse(req.body);
    const { status, role } = validated;
    const updates = [];
    const values = [];
    let i = 1;
    
    if (status) { updates.push(`status = $${i++}`); values.push(status); }
    if (role) { updates.push(`role = $${i++}`); values.push(role); }
    
    if (updates.length === 0) return response.error(res, "Nothing to update", "BAD_REQUEST", 400);
    
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, name, role, status`,
      values
    );
    
    if (result.rows.length === 0) return response.error(res, "User not found", "NOT_FOUND", 404);
    
    const updatedUser = result.rows[0];
    socketService.emitToAll("tanod_update", { id: updatedUser.id, status: updatedUser.status, role: updatedUser.role });
    
    response.success(res, updatedUser);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const issues = err.issues || (err as any).errors || [];
      return response.error(res, `Invalid input: ${issues.map((e: any) => e.message).join(', ')}`, "VALIDATION_ERROR", 400);
    }
    response.error(res, err.message);
  }
});

router.post('/sms', authenticate, authorize(['admin', 'superadmin']), smsLimiter, async (req, res) => {
  const { to, message } = req.body ?? {};

  if (!to || !message) {
    return response.error(res, "to and message are required", "BAD_REQUEST", 400);
  }

  const apiKey = process.env.SEMAPHORE_API_KEY;

  if (!apiKey) {
    console.log("[SMS Simulation]", { to, message });
    return res.json({ success: true, simulated: true });
  }

  try {
    const fetchResponse = await fetch(
      "https://api.semaphore.co/api/v4/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ apikey: apiKey, number: to, message }),
      }
    );

    if (!fetchResponse.ok) {
        const detail = await fetchResponse.text();
        return res.status(502).json({ success: false, error: { code: 'BAD_GATEWAY', message: "Semaphore API error", detail } });
    }

    const data = await fetchResponse.json();
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("[SMS] Fetch failed:", err);
    return res.status(502).json({ success: false, error: { code: 'BAD_GATEWAY', message: "Could not reach Semaphore API" } });
  }
});

router.post('/tts', authenticate, authorize(['resident', 'admin', 'superadmin', 'captain', 'tanod']), async (req, res) => {
  const { text, options } = req.body;
  if (!text) {
    return response.error(res, "Text is required", "BAD_REQUEST", 400);
  }

  try {
    const buffer = await ttsService.generateSpeech({ text, ...options });
    if (!buffer || buffer.length === 0) {
      return response.error(res, "Failed to generate TTS (empty buffer)", "TTS_FAILED", 500);
    }
    
    console.log(`[TTS] Serving buffer of size: ${buffer.length} bytes`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err: any) {
    console.error('TTS Error:', err);
    response.error(res, err.message, "TTS_ERROR", 500);
  }
});

export default router;

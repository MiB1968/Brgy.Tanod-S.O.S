/**
 * AI Routes — /api/ai
 *
 * Proxies AI analysis calls server-side.
 * The Gemini API key never leaves the server.
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { analyzeIncident, getGuardianResponse } from '../services/aiService';

const router = Router();

// POST /api/ai/guardian
// Body: { text: string }
router.post('/guardian', authenticate, async (req: Request, res: Response) => {
  const { text } = req.body;
  try {
    const response = await getGuardianResponse(text);
    return res.json({ success: true, response });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/analyze
// Body: { description: string, initialType?: string }
router.post('/analyze', authenticate, async (req: Request, res: Response) => {
  const { description, initialType } = req.body;

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'description is required' },
    });
  }

  try {
    const analysis = await analyzeIncident(description.slice(0, 500), initialType);
    return res.json({ success: true, analysis });
  } catch (err: any) {
    console.error('[AI Route] analyzeIncident failed:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'AI_ERROR', message: 'AI analysis failed. Fallback used on client.' },
    });
  }
});

export default router;

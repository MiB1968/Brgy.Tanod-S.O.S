/**
 * AI Routes — /api/ai
 *
 * Proxies AI analysis calls server-side.
 * The Gemini API key never leaves the server.
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import * as aiService from '../services/aiService';

const router = Router();

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
    const analysis = await aiService.analyzeIncident(description.slice(0, 500), initialType);
    return res.json({ success: true, analysis });
  } catch (err: any) {
    console.error('[AI Route] analyzeIncident failed:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'AI_ERROR', message: 'AI analysis failed. Fallback used on client.' },
    });
  }
});

// POST /api/ai/chat
router.post('/chat', authenticate, async (req: Request, res: Response) => {
  const { userText } = req.body;
  if (!userText || typeof userText !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }
  try {
    const response = await aiService.generateChatResponse(userText);
    return res.json({ success: true, response });
  } catch (err) {
    console.error('[AI Route] Chat failed:', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

export default router;

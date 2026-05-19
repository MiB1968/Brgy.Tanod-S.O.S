/**
 * AI Routes — /api/ai
 *
 * Proxies AI analysis calls server-side.
 * The Gemini API key never leaves the server.
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { analyzeIncident, getGuardianResponse, summarizeIncident, draftReport, translateText, askAssistant } from '../services/aiService';

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

// POST /api/ai/summarize
// Body: { incidentNotes: string }
router.post('/summarize', authenticate, async (req: Request, res: Response) => {
  const { incidentNotes } = req.body;
  if (!incidentNotes || typeof incidentNotes !== 'string') {
    return res.status(400).json({ success: false, error: 'incidentNotes is required' });
  }
  try {
    const summary = await summarizeIncident(incidentNotes);
    return res.json({ success: true, summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/draft-report
// Body: { roughNotes: string, date?: string }
router.post('/draft-report', authenticate, async (req: Request, res: Response) => {
  const { roughNotes, date } = req.body;
  if (!roughNotes || typeof roughNotes !== 'string') {
    return res.status(400).json({ success: false, error: 'roughNotes is required' });
  }
  try {
    const draft = await draftReport(roughNotes, date);
    return res.json({ success: true, draft });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/translate
// Body: { text: string, targetLanguage?: string }
router.post('/translate', authenticate, async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'text is required' });
  }
  try {
    const translation = await translateText(text, targetLanguage);
    return res.json({ success: true, translation });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/assistant
// Body: { query: string }
router.post('/assistant', authenticate, async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ success: false, error: 'query is required' });
  }
  try {
    const result = await askAssistant(query);
    return res.json({ success: true, ...result });
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

import { Request, Response } from 'express';
import { ttsService } from '../services/ttsService';

const MAX_TTS_LENGTH = 500;

export const textToSpeech = async (req: Request, res: Response) => {
  try {
    const { text, options } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Text is required.' },
      });
    }

    if (text.length > MAX_TTS_LENGTH) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEXT_TOO_LONG',
          message: `Text exceeds maximum length of ${MAX_TTS_LENGTH} characters.`,
        },
      });
    }

    const audioBuffer = await ttsService.generateSpeech({
      text: text.trim(),
      ...options,
    });

    if (!audioBuffer) {
      return res.status(500).json({
        success: false,
        error: { code: 'TTS_FAILED', message: 'Failed to generate audio.' },
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error: any) {
    console.error('[Voice Controller] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'TTS_ERROR', message: error.message || 'Internal server error' },
    });
  }
};

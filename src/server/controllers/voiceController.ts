import { Request, Response } from 'express';
import { ttsService } from '../services/ttsService';

export const textToSpeech = async (req: Request, res: Response) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: { message: 'Text is required' } });
    }

    const audioBuffer = await ttsService.generateSpeech({ text, ...options });

    if (!audioBuffer) {
      return res.status(500).json({ success: false, error: { message: 'Failed to generate audio' } });
    }

    // Set headers for audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (error: any) {
    console.error('[Voice Controller] Error:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Internal server error' } });
  }
};

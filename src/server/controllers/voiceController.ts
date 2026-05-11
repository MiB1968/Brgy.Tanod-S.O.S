import { Request, Response } from 'express';
import { jarvisVoiceService } from '../services/elevenLabsService';

export const textToSpeech = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: { message: 'Text is required' } });
    }

    const audioStream = await jarvisVoiceService.generateAudioStream(text);

    if (!audioStream) {
      return res.status(500).json({ success: false, error: { message: 'Failed to generate audio' } });
    }

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe the stream to the response
    if ('pipe' in audioStream) {
      // Standard Node.js Readable stream
      (audioStream as any).pipe(res);
    } else {
      // It might be a web ReadableStream if generated via fetch (ElevenLabs SDK under some conditions)
      const reader = (audioStream as any).getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
      res.end();
    }

  } catch (error: any) {
    console.error('[Voice Controller] Error:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Internal server error' } });
  }
};

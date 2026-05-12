import express from 'express';
import edgeTTS from '@andresaya/edge-tts';

const router = express.Router();

router.post('/api/system/tts', async (req, res) => {
  const { text, voice = 'fil-PH-BlessicaNeural', rate = '+0%', pitch = '+0Hz', volume = '+0%' } = req.body;

  if (!text || typeof text !== 'string' || text.length > 2000) {
    return res.status(400).json({ error: 'Invalid text' });
  }

  try {
    const communicator = new edgeTTS.Communicator();
    const readable = await communicator.toStream(text, { voice, rate, pitch, volume });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    });

    readable.pipe(res);
  } catch (error) {
    console.error('Edge TTS Error:', error);
    res.status(500).json({ error: 'TTS failed' });
  }
});

export default router;

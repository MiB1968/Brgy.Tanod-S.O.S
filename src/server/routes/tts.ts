import express from 'express';
import { EdgeTTS } from '@andresaya/edge-tts';

const router = express.Router();

router.post('/api/system/tts', async (req, res) => {
  const { 
    text, 
    voice = 'fil-PH-BlessicaNeural', 
    rate = '+0%', 
    pitch = '+0Hz', 
    volume = '+0%' 
  } = req.body;

  if (!text || typeof text !== 'string' || text.length > 2000) {
    return res.status(400).json({ error: 'Invalid text' });
  }

  try {
    const tts = new EdgeTTS();
    
    // Correct method: synthesizeStream
    const audioStream = tts.synthesizeStream(text, voice, {
      rate,
      pitch,
      volume,
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    });

    // Stream the audio
    for await (const chunk of audioStream) {
      res.write(chunk);
    }

    res.end();
  } catch (error: any) {
    console.error('Edge TTS Error:', error.message);
    res.status(500).json({ error: 'TTS generation failed', details: error.message });
  }
});

export default router;

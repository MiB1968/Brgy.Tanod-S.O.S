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
    return res.status(400).json({ error: 'Invalid or too long text' });
  }

  try {
    const tts = new EdgeTTS();

    // Correct API usage for @andresaya/edge-tts
    const audioStream = tts.synthesizeStream(text, voice, {
      rate: rate,
      pitch: pitch,
      volume: volume,
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    });

    let chunkCount = 0;
    for await (const chunk of audioStream) {
      chunkCount++;
      res.write(chunk);
    }
    
    console.log(`[EdgeTTS] Stream finished for text "${text.substring(0, 20)}...". Total chunks: ${chunkCount}`);

    res.end();
  } catch (error: any) {
    console.error('Edge TTS Error:', error.message || error);
    res.status(500).json({ 
      error: 'TTS generation failed', 
      details: error.message 
    });
  }
});

export default router;

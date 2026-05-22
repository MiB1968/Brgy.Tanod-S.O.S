import { Router } from 'express';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenAI } from '@google/genai';
import { authenticate } from '../middleware/auth';

const router = Router();
const ttsCache = new Map<string, Buffer>(); // Cache audio buffers

// Lazy initialization of TTS clients to avoid startup errors if keys are missing
let ttsClient: TextToSpeechClient | null = null;
let genAI: any = null;

const getGenAI = () => {
    if (!genAI && process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return genAI;
};

const getTtsClient = () => {
    if (!ttsClient && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        ttsClient = new TextToSpeechClient();
    }
    return ttsClient;
};

router.post('/speak', async (req, res) => {
  const { text, ssml, language = 'fil', style = 'calm', priority = 'normal', voice = 'fil-PH-Wavenet-A' } = req.body;
  const cacheKey = `${text || ssml}-${voice}`;
  
  if (ttsCache.has(cacheKey)) {
    res.set('Content-Type', 'audio/mpeg');
    return res.send(ttsCache.get(cacheKey));
  }

  if (!text && !ssml) {
    return res.status(400).json({ error: 'Text or SSML is required' });
  }

  try {
    const cloudTts = getTtsClient();
    
    if (cloudTts) {
        // === 1. Google Cloud Text-to-Speech (Very Reliable for fil-PH) ===
        const request: any = {
            input: ssml ? { ssml } : { text },
            voice: {
                languageCode: voice.startsWith('fil-PH') ? 'fil-PH' : (language === 'fil' ? 'fil-PH' : 'en-US'),
                name: voice,
                ssmlGender: 'FEMALE',
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0,
            },
        };

        const [response] = await cloudTts.synthesizeSpeech(request);
        res.set('Content-Type', 'audio/mpeg');
        
        let audioData = response.audioContent;
        if (typeof audioData === 'string') {
          audioData = Buffer.from(audioData, 'base64');
        } else if (audioData instanceof Uint8Array) {
          audioData = Buffer.from(audioData);
        }
        
        ttsCache.set(cacheKey, audioData as Buffer);
        return res.send(audioData);
    } 

    // === 2. Fallback: Edge TTS (Free, no credentials needed) ===
    const { EdgeTTS } = await import('@andresaya/edge-tts');
    const edgeTtsClient = new EdgeTTS();
    
    // Note: EdgeTTS doesn't natively parse SSML as perfectly via simple synthesize string without manual SSML injection,
    // but we can pass text logic if SSML fails. For now, synthesize text directly, stripping basic SSML tags if needed.
    const cleanText = text || (ssml ? ssml.replace(/<[^>]*>?/gm, '') : '');
    const edgeVoice = voice.startsWith('fil-PH') ? 'fil-PH-BlessicaNeural' : 'en-US-AriaNeural';
    
    await edgeTtsClient.synthesize(cleanText, edgeVoice, { 
      rate: '+0%',
      volume: '+0%',
      pitch: '+0Hz'
    });
    const audioBuffer = edgeTtsClient.toBuffer();
    
    ttsCache.set(cacheKey, audioBuffer);
    res.set('Content-Type', 'audio/mpeg');
    return res.send(audioBuffer);

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

export default router;

import { Router } from 'express';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenAI } from '@google/genai';
import { authenticate } from '../middleware/auth';

const router = Router();

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

  if (!text && !ssml) {
    return res.status(400).json({ error: 'Text or SSML is required' });
  }

  try {
    const aiClient = getGenAI();
    
    // === 1. Try Gemini TTS First (Most Natural) if available ===
    if (aiClient && !ssml) { // Gemini currently doesn't natively parse SSML as perfectly as GCP TTS
        try {
            // we skip Gemini TTS for now since there's no native TTS model in the new SDK that's publicly stable, 
            // but if the user wants it, we would use generating audio if the model is available.
            // "gemini-2.5-flash-preview-tts" or "gemini-3.1-flash-tts-preview"
            /*
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash' // adjust to correct model
            });
            */
            // Skipping to Fallback since the exact Gemini TTS model is experimental
        } catch (geminiErr) {
            console.warn('Gemini TTS failed, falling back to Google Cloud TTS', geminiErr);
        }
    }

    const cloudTts = getTtsClient();
    
    if (cloudTts) {
        // === 2. Fallback: Google Cloud Text-to-Speech (Very Reliable for fil-PH) ===
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
        
        // Ensure audioContent is sent as raw binary data, not JSON
        let audioData = response.audioContent;
        if (typeof audioData === 'string') {
          audioData = Buffer.from(audioData, 'base64');
        } else if (audioData instanceof Uint8Array) {
          audioData = Buffer.from(audioData);
        }
        
        return res.send(audioData);
    } 

    res.status(503).json({ error: 'TTS services are not configured on the server.'});

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

export default router;

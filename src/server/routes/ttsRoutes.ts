import { Router } from 'express';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenAI } from '@google/genai';
import { authenticate } from '../middleware/auth';
import * as googleTTS from 'google-tts-api';

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

  const cleanText = text || (ssml ? ssml.replace(/<[^>]*>?/gm, '') : '');

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
        
        return res.send(audioData);
    } 

    // === 2. Fallback: Edge TTS (Free, no credentials needed) ===
    try {
        const { EdgeTTS } = await import('@andresaya/edge-tts');
        const edgeTtsClient = new EdgeTTS();
        
        const edgeVoice = voice.startsWith('fil-PH') ? 'fil-PH-BlessicaNeural' : 'en-US-AriaNeural';
        
        await edgeTtsClient.synthesize(cleanText, edgeVoice, { 
          rate: '+0%',
          volume: '+0%',
          pitch: '+0Hz'
        });
        const audioBuffer = edgeTtsClient.toBuffer();
        
        res.set('Content-Type', 'audio/mpeg');
        return res.send(audioBuffer);
    } catch (edgeError: any) {
        if (edgeError?.message?.includes('429')) {
             console.warn('EdgeTTS 429 Too Many Requests, falling back to google-tts-api');
        } else {
             console.warn('EdgeTTS failed:', edgeError?.message);
        }
    }

    // === 3. Fallback: Google Translate TTS API ===
    const results = await googleTTS.getAllAudioBase64(cleanText, {
      lang: language === 'fil' ? 'tl' : 'en',
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: ',.?'
    });

    // Combine base64 strings if necessary (getAllAudioBase64 returns an array of chunks)
    const audioDataList = results.map((result) => Buffer.from(result.base64, 'base64'));
    const finalBuffer = Buffer.concat(audioDataList);

    res.set('Content-Type', 'audio/mpeg');
    return res.send(finalBuffer);

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

export default router;

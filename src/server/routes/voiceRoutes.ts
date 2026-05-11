import express from 'express';
import { textToSpeech } from '../controllers/voiceController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Allow authenticated users to use TTS
router.post('/tts', authenticate, textToSpeech);

export default router;

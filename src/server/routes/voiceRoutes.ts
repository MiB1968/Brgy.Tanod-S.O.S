// voiceRoutes.ts is intentionally left empty.
// TTS is served exclusively via /api/system/tts (systemRoutes.ts)
// which enforces admin/superadmin/captain role restriction.
// The /api/voice/tts duplicate has been removed to prevent
// unauthenticated role bypass of ElevenLabs quota.
import { Router } from 'express';
const router = Router();
export default router;

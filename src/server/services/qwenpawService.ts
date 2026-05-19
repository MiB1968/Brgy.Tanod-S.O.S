import axios from 'axios';
import { logger } from '../utils/logger';

const QWENPAW_URL = process.env.QWENPAW_URL || 'http://localhost:8088';
// Get from QwenPaw Console or env vars
const DISPATCHER_AGENT_ID = process.env.DISPATCHER_AGENT_ID || 'dispatcher-agent';
const REPORTER_AGENT_ID = process.env.REPORTER_AGENT_ID || 'reporter-agent';

export async function triggerQwenPawDispatcher(newSOS: any) {
  try {
    const response = await axios.post(`${QWENPAW_URL}/api/agents/${DISPATCHER_AGENT_ID}/chat`, {
      message: `New SOS Alert Received!\n\nID: ${newSOS.id}\nCitizen: ${newSOS.residentName || 'Unknown'}\nLocation: ${newSOS.description}\nCoordinates: ${newSOS.latitude}, ${newSOS.longitude}\nTime: ${newSOS.created_at || new Date().toISOString()}\n\nPlease triage, find nearest Tanod, and send notifications.`,
      stream: false
    });

    logger.info("✅ QwenPaw Dispatcher triggered", { data: response.data });
    return response.data;
  } catch (error: any) {
    logger.error("❌ Failed to trigger QwenPaw Dispatcher", { error: error.message });
  }
}

export async function triggerQwenPawReporter(sosId: string) {
  try {
    const response = await axios.post(`${QWENPAW_URL}/api/agents/${REPORTER_AGENT_ID}/chat`, {
      message: `SOS ${sosId} has been marked as RESOLVED. Please generate a complete official incident report.`,
      stream: false
    });

    logger.info(`📄 Auto-report triggered for SOS: ${sosId}`, { data: response.data });
    return response.data;
  } catch (error: any) {
    logger.error("❌ Failed to trigger QwenPaw Reporter", { error: error.message });
  }
}

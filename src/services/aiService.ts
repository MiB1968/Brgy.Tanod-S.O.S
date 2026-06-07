import { fetchAPI } from './apiBase';
import { triageEmergency } from './webllmTriage';

export const aiService = {
  analyze: async (description: string, initialType?: string) => {
    try {
      const response = await fetchAPI('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ description, initialType }),
      });
      if (response && response.success) return response;
      throw new Error("Server analysis failed");
    } catch (err) {
      console.warn("[AI_SERVICE] Server analysis failed, attempting local triage fallback...");
      const localResult = await triageEmergency({ type: initialType }, description);
      if (localResult) {
        return { 
          success: true, 
          analysis: { 
            ...localResult, 
            _modelUsed: 'WebLLM-Local',
            actionRecommendations: localResult.instructions // mapping local format to server format
          } 
        };
      }
      throw err;
    }
  },
  getGuardianResponse: (text: string) => fetchAPI('/ai/guardian', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),
};

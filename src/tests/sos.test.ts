import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSOSStore } from '../store/useSOSStore';
import * as api from '../lib/api';
import * as aiService from '../services/aiService';

// Mock dependencies
vi.mock('../lib/api', () => ({
  alerts: {
    create: vi.fn()
  }
}));

vi.mock('../services/aiService', () => ({
  analyzeIncident: vi.fn()
}));

// Mock queueing (Dexie context)
vi.mock('../lib/offlineQueue', () => ({
  queueSOS: vi.fn()
}));

describe('SOS Flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('navigator', { onLine: true });

    // Mock localStorage since Vitest node environment lacks it by default
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      clear: () => { Object.keys(store).forEach(key => delete store[key]); }
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    localStorage.setItem('user', JSON.stringify({ id: 'res-123', name: 'John Doe', role: 'resident' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should successfully create an SOS alert when online', async () => {
    const mockAlertId = 'alert-123';

    // Mock the backend creation response
    (api.alerts.create as any).mockResolvedValueOnce({ id: mockAlertId });

    // Mock AI response
    const mockAiAnalysis = { incidentType: 'MEDICAL', severityScore: 8 };
    (aiService.analyzeIncident as any).mockResolvedValueOnce(mockAiAnalysis);

    const store = useSOSStore.getState();

    const resultId = await store.createSOS('medical', 'Heart attack', { lat: 10, lng: 120 });

    expect(resultId).toBe(mockAlertId);
    expect(aiService.analyzeIncident).toHaveBeenCalledWith('Heart attack', 'medical');
    expect(api.alerts.create).toHaveBeenCalledWith(expect.objectContaining({
      residentId: 'res-123',
      type: 'medical',
      status: 'pending',
      customMessage: 'Heart attack',
      location: { lat: 10, lng: 120 },
      aiAnalysis: mockAiAnalysis
    }));

    // Ensure state transitions correctly
    expect(useSOSStore.getState().isSending).toBe(false);
  });
});

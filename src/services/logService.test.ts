import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logIncidentAction } from './logService';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { supabase } from '../lib/supabase';
import { Alert } from '../types';

vi.mock('../lib/api', () => ({
  generic: {
    create: vi.fn(),
  },
}));

vi.mock('../lib/socket', () => ({
  default: {
    emit: vi.fn(),
  },
}));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(),
    })),
  },
}));

describe('logIncidentAction', () => {
  const mockAlert: Alert = {
    id: 'test-id',
    residentId: 'resident-1',
    residentName: 'Test Resident',
    type: 'medical',
    location: { lat: 14.5995, lng: 120.9842 },
    status: 'pending',
    timestamp: new Date().toISOString(),
    assignedTo: 'tanod-1',
    resolutionNotes: 'Initial notes'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log incident successfully to API and Supabase', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    (supabase.from as any).mockReturnValue({ upsert: mockUpsert });

    await logIncidentAction(mockAlert, 'New action note');

    expect(api.generic.create).toHaveBeenCalledWith('audit_logs', expect.objectContaining({
      incident_id: 'test-id',
      type: 'medical',
      status: 'pending',
      citizen_id: 'resident-1',
      tanod_assigned: 'tanod-1',
      location_lat: 14.5995,
      location_lng: 120.9842,
      notes: 'New action note'
    }));
    expect(socket.emit).toHaveBeenCalledWith('audit_log_new', expect.any(Object));
    expect(supabase.from).toHaveBeenCalledWith('report_logs');
    expect(mockUpsert).toHaveBeenCalledWith([{
      id: 'test-id',
      incident_id: 'test-id',
      type: 'medical',
      status: 'pending',
      tanod_assigned: 'tanod-1',
      location_lat: 14.5995,
      location_lng: 120.9842,
      lat: 14.5995,
      lng: 120.9842
    }]);
  });

  it('should log an error when Supabase sync fails', async () => {
    const mockError = new Error('Supabase network error');
    const mockUpsert = vi.fn().mockRejectedValue(mockError);
    (supabase.from as any).mockReturnValue({ upsert: mockUpsert });

    await logIncidentAction(mockAlert, 'Test note');

    expect(api.generic.create).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('report_logs');
    expect(mockUpsert).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Supabase Audit Log sync failed:', mockError);
  });

  it('should log an error when API save fails', async () => {
    const mockApiError = new Error('API down');
    (api.generic.create as any).mockRejectedValue(mockApiError);

    await logIncidentAction(mockAlert, 'Test note');

    expect(api.generic.create).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Failed to log incident action:', mockApiError);

    // Supabase should not be called if API fails (since API is awaited before Supabase)
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

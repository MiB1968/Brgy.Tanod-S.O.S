import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerWitnessAlert } from './WitnessService';
import * as api from '../lib/api';
import socket from '../lib/socket';

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

describe('WitnessService', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should successfully trigger a witness alert', async () => {
    vi.mocked(api.generic.create).mockResolvedValue({ witnessCount: 5 });

    const result = await triggerWitnessAlert('alert-123', { lat: 14.5, lng: 121.0 });

    expect(api.generic.create).toHaveBeenCalledWith('witness_invites/trigger', {
      alertId: 'alert-123',
      location: { lat: 14.5, lng: 121.0 }
    });
    expect(socket.emit).toHaveBeenCalledWith('witness_invite_new', { alertId: 'alert-123' });
    expect(result).toBe(5);
  });

  it('should return 0 when witnessCount is not returned', async () => {
    vi.mocked(api.generic.create).mockResolvedValue({});

    const result = await triggerWitnessAlert('alert-123', { lat: 14.5, lng: 121.0 });

    expect(result).toBe(0);
  });

  it('should return 0 and log error when api call fails', async () => {
    const error = new Error('API failure');
    vi.mocked(api.generic.create).mockRejectedValue(error);

    const result = await triggerWitnessAlert('alert-123', { lat: 14.5, lng: 121.0 });

    expect(api.generic.create).toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Failed to trigger witness alerts', error);
    expect(result).toBe(0);
  });
});

// src/tests/guardianAI.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressSOS, decompressSOS } from '../services/smsCompression';
import { guardianAI } from '../services/guardianAI';

describe('Guardian SMS Compression Engine', () => {
  it('should compress a typical SOS payload under 140 character limit', () => {
    const payload = {
      lat: 14.12345,
      lng: 121.67890,
      type: 'CRIME',
      severity: 'HIGH' as const,
      timestamp: Date.now(),
      victimCount: 3
    };

    const compressed = compressSOS(payload);
    expect(compressed.length).toBeLessThanOrEqual(140);
    expect(compressed.startsWith('SOS:')).toBe(true);
    // Contains pieces separated by pipelines
    expect(compressed).toContain('|CR|H|');
    expect(compressed).toContain('14.12345');
    expect(compressed).toContain('121.67890');
  });

  it('should decompress a compressed message back into correct structures', () => {
    const originalText = 'SOS:14.54321|121.09876|ME|H|246810|2';
    const decompressed = decompressSOS(originalText);

    expect(decompressed).not.toBeNull();
    if (decompressed) {
      expect(decompressed.lat).toBe(14.54321);
      expect(decompressed.lng).toBe(121.09876);
      expect(decompressed.type).toBe('MEDICAL');
      expect(decompressed.severity).toBe('HIGH');
      expect(decompressed.victimCount).toBe(2);
    }
  });

  it('should gracefully handle invalid SOS prefix and corrupted body', () => {
    const badTextSymbol = 'FIRE|HIGH|123';
    expect(decompressSOS(badTextSymbol)).toBeNull();

    const shortText = 'SOS:14.33|121';
    expect(decompressSOS(shortText)).toBeNull();
  });
});

describe('Guardian device calibration telemetry', () => {
  let originalNavigator: any;

  beforeEach(() => {
    if (typeof window !== 'undefined') {
      originalNavigator = window.navigator;
    }
  });

  it('should output chunk sizes calibrated to low-end devices', () => {
    const originalProfile = (guardianAI as any).deviceProfile;
    (guardianAI as any).deviceProfile = 'LOW';
    expect(guardianAI.getChunkSize()).toBe(8);
    (guardianAI as any).deviceProfile = originalProfile;
  });

  it('should output chunks of size 1 for normal devices', () => {
    const originalProfile = (guardianAI as any).deviceProfile;
    (guardianAI as any).deviceProfile = 'HIGH';
    expect(guardianAI.getChunkSize()).toBe(1);
    (guardianAI as any).deviceProfile = originalProfile;
  });
});

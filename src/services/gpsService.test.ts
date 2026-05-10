import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startGPSTracking, calculateDistance } from './gpsService';
import * as api from '../lib/api';
import socket from '../lib/socket';

// Mock dependencies
vi.mock('../lib/api', () => ({
  generic: {
    update: vi.fn(),
  },
}));

vi.mock('../lib/socket', () => ({
  default: {
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
  },
}));

describe('gpsService', () => {
  let mockGeolocation: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator.geolocation
    mockGeolocation = {
      watchPosition: vi.fn().mockReturnValue(123),
      clearWatch: vi.fn(),
    };

    // Mock navigator.geolocation safely
    vi.stubGlobal('navigator', {
      geolocation: mockGeolocation,
    });

    // Spy on console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startGPSTracking', () => {
    it('should register socket listener and start geolocation watch', () => {
      const onUpdate = vi.fn();
      startGPSTracking('user1', 'resident', onUpdate);

      expect(socket.on).toHaveBeenCalledWith('tanod_locations', expect.any(Function));
      expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

    it('should call onUpdate when socket receives tanod_locations', () => {
      const onUpdate = vi.fn();
      startGPSTracking('user1', 'resident', onUpdate);

      const socketListener = vi.mocked(socket.on).mock.calls[0][1];
      const mockLocations = [{ id: 'tanod1', lat: 10, lng: 20 }];

      socketListener(mockLocations);
      expect(onUpdate).toHaveBeenCalledWith(mockLocations);
    });

    it('should update API and emit socket event for tanod role on position change', async () => {
      startGPSTracking('tanod1', 'tanod', vi.fn());

      const successCallback = mockGeolocation.watchPosition.mock.calls[0][0];
      const mockPos = { coords: { latitude: 14.5, longitude: 121.0 } };

      await successCallback(mockPos);

      expect(api.generic.update).toHaveBeenCalledWith('gps/heartbeat', {
        id: 'tanod1',
        role: 'tanod',
        lat: 14.5,
        lng: 121.0,
        timestamp: expect.any(String),
      });

      expect(socket.emit).toHaveBeenCalledWith('tanod_move', {
        id: 'tanod1',
        lat: 14.5,
        lng: 121.0,
      });
    });

    it('should update API but not emit socket event for resident role on position change', async () => {
      startGPSTracking('resident1', 'resident', vi.fn());

      const successCallback = mockGeolocation.watchPosition.mock.calls[0][0];
      const mockPos = { coords: { latitude: 14.5, longitude: 121.0 } };

      await successCallback(mockPos);

      expect(api.generic.update).toHaveBeenCalledWith('gps/heartbeat', {
        id: 'resident1',
        role: 'resident',
        lat: 14.5,
        lng: 121.0,
        timestamp: expect.any(String),
      });

      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should log error when API update fails', async () => {
      startGPSTracking('tanod1', 'tanod', vi.fn());

      const mockError = new Error('API failure');
      vi.mocked(api.generic.update).mockRejectedValueOnce(mockError);

      const successCallback = mockGeolocation.watchPosition.mock.calls[0][0];
      const mockPos = { coords: { latitude: 14.5, longitude: 121.0 } };

      await successCallback(mockPos);

      expect(console.error).toHaveBeenCalledWith('GPS Update error:', mockError);
    });

    it('should log error when geolocation watchPosition fails', () => {
      startGPSTracking('tanod1', 'tanod', vi.fn());

      const errorCallback = mockGeolocation.watchPosition.mock.calls[0][1];
      const mockError = new Error('Geolocation denied');

      errorCallback(mockError);

      expect(console.error).toHaveBeenCalledWith('Geolocation error:', mockError);
    });

    it('should clean up socket listeners and geolocation watch on unmount', () => {
      const cleanup = startGPSTracking('user1', 'resident', vi.fn());

      cleanup();

      expect(socket.off).toHaveBeenCalledWith('tanod_locations');
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(123);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate the correct distance between two coordinates', () => {
      // Distance between Manila (14.5995, 120.9842) and Quezon City (14.6760, 121.0437)
      const dist = calculateDistance(14.5995, 120.9842, 14.6760, 121.0437);

      // Expected distance is ~10.6 km
      expect(dist).toBeGreaterThan(10);
      expect(dist).toBeLessThan(11);

      // Same point distance should be 0
      const distZero = calculateDistance(14.5, 121.0, 14.5, 121.0);
      expect(distZero).toBe(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadVideoChunk } from './StorageService';

describe('StorageService', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => {
        if (key === 'token') return 'mock-token';
        return null;
      }),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    global.localStorage = localStorageMock as unknown as Storage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully upload a video chunk', async () => {
    // Mock a successful fetch response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const alertId = 'test-alert-123';
    const chunk = new Blob(['test chunk data'], { type: 'video/webm' });
    const index = 1;

    await uploadVideoChunk(alertId, chunk, index);

    // Verify fetch was called with correct arguments
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const [url, options] = fetchCall;

    expect(url).toBe('/api/storage/upload');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({
      'Authorization': 'Bearer mock-token'
    });

    // Verify FormData
    const formData = options.body;
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('alertId')).toBe(alertId);
    expect(formData.get('index')).toBe(index.toString());

    const fileField = formData.get('file') as Blob;
    expect(fileField).toBeInstanceOf(Blob);
    expect(fileField.size).toBe(chunk.size);
    expect(fileField.type).toBe(chunk.type);
  });

  it('should throw an error when the upload fails', async () => {
    // Mock a failed fetch response
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const alertId = 'test-alert-456';
    const chunk = new Blob(['error chunk data'], { type: 'video/webm' });
    const index = 2;

    await expect(uploadVideoChunk(alertId, chunk, index)).rejects.toThrow('Upload failed');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

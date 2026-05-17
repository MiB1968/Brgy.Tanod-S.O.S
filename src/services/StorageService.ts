// src/services/StorageService.ts

export class StorageService {
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async uploadFile(
    file: File | Blob, 
    folder: string = 'uploads',
    maxRetries: number = 3,
    signal?: AbortSignal
  ): Promise<string> {
    
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (signal?.aborted) {
          throw new DOMException('Upload aborted by user', 'AbortError');
        }

        const formData = new FormData();
        formData.append('file', file as Blob);
        formData.append('folder', folder);

        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 45000); // 45s timeout

        const combinedSignal = signal 
          ? AbortSignal.any([signal, timeoutController.signal])
          : timeoutController.signal;

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          signal: combinedSignal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Upload successful: ${file instanceof File ? file.name : 'blob'}`);
        return data.url || data.fileUrl || data.path;

      } catch (error: any) {
        lastError = error;

        if (error.name === 'AbortError') {
          throw new DOMException('Upload was cancelled', 'AbortError');
        }

        const isNetworkError = !navigator.onLine || error.name === 'TypeError';

        if (error.message?.includes('HTTP 4') || attempt === maxRetries || !isNetworkError) {
          throw error;
        }

        const backoff = Math.min(2000 * Math.pow(1.8, attempt), 15000);
        console.warn(`Upload attempt ${attempt + 1} failed. Retrying in ${Math.round(backoff/1000)}s...`);
        
        await this.delay(backoff);
      }
    }

    throw new Error(`Upload failed: ${lastError?.message || 'Unknown error'}`);
  }

  async uploadMultiple(files: File[], folder?: string, signal?: AbortSignal): Promise<string[]> {
    const results: string[] = [];

    for (const file of files) {
      if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');
      
      try {
        const url = await this.uploadFile(file, folder, 3, signal);
        results.push(url);
      } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error(`Failed uploading ${file.name}`, error);
        // Continue with other files
      }
    }

    return results;
  }
}

export const storageService = new StorageService();

// Keeping existing uploadVideoChunk but fixing headers to use cookies instead of Bearer token
export const uploadVideoChunk = async (alertId: string, chunk: Blob, index: number) => {
  const formData = new FormData();
  formData.append('file', chunk);
  formData.append('alertId', alertId);
  formData.append('index', index.toString());

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }
};

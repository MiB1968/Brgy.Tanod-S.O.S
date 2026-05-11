import { safeStorage } from '../lib/safeStorage';

export const uploadVideoChunk = async (alertId: string, chunk: Blob, index: number) => {
  const formData = new FormData();
  formData.append('file', chunk);
  formData.append('alertId', alertId);
  formData.append('index', index.toString());

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${safeStorage.getItem('token')}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }
};

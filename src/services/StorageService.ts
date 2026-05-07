import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';

export const uploadVideoChunk = async (alertId: string, chunk: Blob, index: number) => {
  const fileName = `alerts/${alertId}/evidence_${index}.webm`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, chunk);
};

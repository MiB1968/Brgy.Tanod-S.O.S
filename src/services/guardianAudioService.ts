import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';

let currentMediaRecorder: MediaRecorder | null = null;
let currentStream: MediaStream | null = null;
let respondersUnsubscribe: Unsubscribe | null = null;
let isOfflineMode = false;

const DB_NAME = 'BrgyTanodSOS_Guardian';
const STORE_NAME = 'pendingGuardianAudio';

async function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAudioChunkToIndexedDB(alertId: string, blob: Blob, timestamp: number, index: number) {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const id = `${alertId}_${timestamp}_${index}`;
    store.put({ id, alertId, timestamp, index, blob, mimeType: blob.type || 'audio/webm', createdAt: Date.now() });
  } catch (err) {
    console.error('[GuardianAudio] IndexedDB save failed', err);
  }
}

async function uploadAudioChunk(alertId: string, blob: Blob, timestamp: number) {
  if (!storage) return;
  try {
    const path = `sosAlerts/${alertId}/audio_${timestamp}.webm`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, blob, { contentType: blob.type || 'audio/webm' });
  } catch (err) {
    console.error('[GuardianAudio] Upload failed', err);
  }
}

export function listenForResponders(alertId: string, onRespondersArrived: () => void) {
  if (respondersUnsubscribe) respondersUnsubscribe();

  const docRef = doc(db, 'sosAlerts', alertId);
  respondersUnsubscribe = onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists() && snapshot.data().respondersArrived === true) {
      onRespondersArrived();
    }
  });
}

export async function startContinuousRecording(
  alertId: string,
  offline: boolean = false,
  onStopped?: () => void
) {
  if (currentMediaRecorder) return;
  isOfflineMode = offline;

  try {
    if (!currentStream) {
      currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/webm';

    currentMediaRecorder = new MediaRecorder(currentStream, { mimeType });
    let chunkIndex = 0;

    currentMediaRecorder.ondataavailable = async (event) => {
      if (event.data.size === 0) return;
      const timestamp = Date.now();

      if (isOfflineMode) {
        await saveAudioChunkToIndexedDB(alertId, event.data, timestamp, chunkIndex++);
      } else {
        await uploadAudioChunk(alertId, event.data, timestamp);
      }
    };

    currentMediaRecorder.onstop = () => {
      if (onStopped) onStopped();
      cleanup();
    };

    currentMediaRecorder.start(10000); // 10-second chunks
  } catch (err) {
    console.error('[GuardianAudio] Failed to start recording', err);
    cleanup();
    throw err;
  }
}

export function stopContinuousRecording() {
  if (currentMediaRecorder && currentMediaRecorder.state !== 'inactive') {
    currentMediaRecorder.stop();
  }
  if (respondersUnsubscribe) {
    respondersUnsubscribe();
    respondersUnsubscribe = null;
  }
  cleanup();
}

function cleanup() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  currentMediaRecorder = null;
  isOfflineMode = false;
}

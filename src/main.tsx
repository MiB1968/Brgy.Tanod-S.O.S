import React from 'react';
import ReactDOM from 'react-dom/client';
import "@fontsource/orbitron";
import "@fontsource/rajdhani";
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { nativeService } from './services/nativeService';
import { initBackgroundRunner } from './services/backgroundService';
import { modelProfiler } from './services/modelProfiler';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { cleanupOldQueues } from './db/offlineDB';
import { registerBackgroundSync, processQueuedActions } from './sw/backgroundSync';

// Safe Native & Profiler Initialization
async function initializeServices() {
  try {
    if (nativeService.isNative()) {
      await nativeService.requestPermissions();
      await initBackgroundRunner();
    }

    // Run memory profiling in development mode to monitor WebLLM heap footprint
    if (import.meta.env.DEV) {
      await modelProfiler.runMemoryProfile();
    }
    
    await cleanupOldQueues();
    await registerBackgroundSync();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PERFORM_QUEUED_SYNC') {
          processQueuedActions();
        }
      });
    }

    window.addEventListener('online', processQueuedActions);

  } catch (err) {
    console.warn('⚠️ Service initialization bypassed:', err);
  }
}

initializeServices().catch(console.error);

// Service Worker registration is now handled by vite-plugin-pwa (injectRegister: 'auto')

console.log('Mounting React Application...');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);


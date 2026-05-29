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
  } catch (err) {
    console.warn('⚠️ Native service or profiling initialization bypassed:', err);
  }
}

initializeServices().catch(console.error);

// Register Service Worker for offline emergency capability & map caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('🛡️ [SW] Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.error('⚠️ [SW] Service Worker registration failed:', err);
      });
  });
}

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


import React from 'react';
import ReactDOM from 'react-dom/client';
import "@fontsource/orbitron";
import "@fontsource/rajdhani";
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';

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

import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

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

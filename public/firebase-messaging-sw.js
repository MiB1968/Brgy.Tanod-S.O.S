/* eslint-disable no-undef */

// Import Firebase SDKs
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyBsBqnHw9d1rc6HB2kHVytr0ZXAlx6s0qY",
  authDomain: "gen-lang-client-0433922302.firebaseapp.com",
  projectId: "gen-lang-client-0433922302",
  storageBucket: "gen-lang-client-0433922302.firebasestorage.app",
  messagingSenderId: "643968538769",
  appId: "1:643968538769:web:feae4acd4266cbe4348730"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  
  const notificationTitle = payload.notification?.title || '🚨 Emergency Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'New alert from Brgy. Tanod S.O.S.',
    icon: '/logo.svg',
    // badge: '/icons/badge.png' // Add if you have a badge icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

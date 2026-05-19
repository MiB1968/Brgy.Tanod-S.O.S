import { messaging, getToken, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const subscribeToTanodTopic = async (userId: string) => {
  if (!messaging) return;

  try {
    const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FCM_VAPID_KEY || 'YOUR_VAPID_KEY' });
    
    // Save token to Firestore (for push from QwenPaw)
    if (userId) {
      await updateDoc(doc(db, 'users', userId), {
        fcm_token: token,
        available: true
      });
    }

    // Subscribe to topic via our backend or direct fetch
    // Example fetch to backend:
    await fetch('/api/webhooks/fcm/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        topic: 'all_tanod'
      })
    });

    console.log("✅ Subscribed to all_tanod topic");
  } catch (error) {
    console.error("Subscription failed", error);
  }
};

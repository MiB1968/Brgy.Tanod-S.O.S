// src/lib/haptics.ts

export const emergencyHaptics = {
  heartbeat: () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 100, 100, 400]);
    }
  },
  sirenPulse: () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100]);
    }
  }
};

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

export const Haptics = {
  shortPress: () => {
    if (navigator.vibrate) navigator.vibrate(50);
  },
  heavyImpact: () => {
    if (navigator.vibrate) navigator.vibrate([150]);
  },
  emergencySOS: () => {
    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
  },
  error: () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
  }
};
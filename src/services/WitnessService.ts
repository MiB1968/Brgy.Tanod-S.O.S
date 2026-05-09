import * as api from '../lib/api';
import socket from '../lib/socket';

export const triggerWitnessAlert = async (alertId: string, location: { lat: number, lng: number }) => {
  try {
     // The server should ideally handle geohash-based witness triggering,
     // but we'll simulate the logic via API for now.
     const response = await api.generic.create('witness_invites/trigger', {
       alertId,
       location
     });
     
     socket.emit('witness_invite_new', { alertId });
     return response.witnessCount || 0;
  } catch (err) {
    console.error("Failed to trigger witness alerts", err);
    return 0;
  }
};

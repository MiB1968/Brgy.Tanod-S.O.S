// src/services/dispatchService.ts
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tanodLocationService } from './tanodLocationService';

export const dispatchService = {
  /**
   * Tanod accepts an SOS emergency alert
   */
  async acceptSOS(sosId: string, tanodId: string, tanodName?: string) {
    try {
      const ref = doc(db, 'alerts', sosId);
      await updateDoc(ref, {
        status: 'responding',
        assignedTo: tanodId,
        assignedToName: tanodName || 'Tanod Responder',
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update Tanod status to responding in Firestore
      await tanodLocationService.updateTanodStatus(tanodId, 'responding');
      console.log(`[Dispatch] Tanod ${tanodId} accepted SOS alert ${sosId}`);
    } catch (error) {
      console.error('[Dispatch] Failed to accept SOS alert:', error);
      throw error;
    }
  },

  /**
   * Tanod marks an SOS emergency alert as resolved
   */
  async resolveSOS(sosId: string, tanodId: string) {
    try {
      const ref = doc(db, 'alerts', sosId);
      await updateDoc(ref, {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: tanodId,
        updatedAt: serverTimestamp(),
      });

      // Set Tanod back to available / patrolling in Firestore
      await tanodLocationService.updateTanodStatus(tanodId, 'on_patrol');
      console.log(`[Dispatch] Tanod ${tanodId} resolved SOS alert ${sosId}`);
    } catch (error) {
      console.error('[Dispatch] Failed to resolve SOS alert:', error);
      throw error;
    }
  },

  /**
   * Cancel / revoke assignment (if a Tanod has to release they are responding)
   */
  async cancelAssignment(sosId: string, tanodId: string) {
    try {
      const ref = doc(db, 'alerts', sosId);
      await updateDoc(ref, {
        status: 'pending',
        assignedTo: null,
        assignedToName: null,
        assignedAt: null,
        updatedAt: serverTimestamp(),
      });

      // Release Tanod status back to patrolling
      await tanodLocationService.updateTanodStatus(tanodId, 'on_patrol');
      console.log(`[Dispatch] Assignment of Tanod ${tanodId} on alert ${sosId} cancelled`);
    } catch (error) {
      console.error('[Dispatch] Failed to cancel assignment:', error);
      throw error;
    }
  }
};

export default dispatchService;

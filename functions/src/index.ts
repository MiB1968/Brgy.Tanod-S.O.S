import * as functions from "firebase-functions/v2";
import { onDocumentCreate, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

// ====================== GEOFENCING VALIDATION ======================
export const validateSOSGeofence = onDocumentCreate(
  "sos_alerts/{sosId}",
  async (event) => {
    // Check if the event data exists
    if (!event.data) {
        console.error("No data associated with the event.");
        return;
    }

    const sos = event.data.data();
    const sosId = event.params.sosId;

    if (!sos?.latitude || !sos?.longitude || !sos?.barangayId) {
      console.error(`Invalid SOS data for ${sosId}`);
      await admin.firestore().collection("sos_alerts").doc(sosId).delete();
      return;
    }

    try {
      const barangaySnap = await admin.firestore()
        .collection("barangays")
        .doc(sos.barangayId)
        .get();

      if (!barangaySnap.exists) {
        console.error(`Invalid barangayId: ${sos.barangayId}`);
        await admin.firestore().collection("sos_alerts").doc(sosId).delete();
        return;
      }

      const barangay = barangaySnap.data()!;
      if (barangay.center) {
          const distanceKm = calculateDistance(
            sos.latitude,
            sos.longitude,
            barangay.center.lat,
            barangay.center.lng
          );

          const maxRadius = barangay.radiusKm || 5.0;

          if (distanceKm > maxRadius) {
            console.warn(`SOS ${sosId} rejected - outside barangay boundary (${distanceKm.toFixed(2)}km > ${maxRadius}km)`);
            await admin.firestore().collection("sos_alerts").doc(sosId).delete();
            return;
          }
      }

      console.log(`✅ SOS ${sosId} passed geofence validation`);
    } catch (error) {
      console.error("Geofence validation error:", error);
      await admin.firestore().collection("sos_alerts").doc(sosId).delete();
    }
  }
);

// Haversine Distance Formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ====================== AUTO REPORT ON RESOLVED ======================
export const generateReportOnResolved = onDocumentUpdated(
  "sos_alerts/{sosId}",
  async (event) => {
    // Check if the event data exists
    if (!event.data) {
        console.error("No data associated with the event.");
        return;
    }
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status !== "resolved" && after.status === "resolved") {
      // You can trigger AI here if needed
      console.log(`📄 SOS ${event.params.sosId} resolved - Report generation triggered`);
    }
  }
);

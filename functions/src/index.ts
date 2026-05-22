import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreate, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as functionsLegacy from "firebase-functions";

// Lazy-loaded or safer Twilio import
let twilioClient: any = null;
const getTwilioClient = () => {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_SID || functionsLegacy.config().twilio?.sid;
  const token = process.env.TWILIO_TOKEN || functionsLegacy.config().twilio?.token;
  if (sid && token) {
    try {
      // Require twilio dynamically to handle environments safely
      const twilioInstance = require("twilio");
      twilioClient = twilioInstance(sid, token);
      return twilioClient;
    } catch (e) {
      console.error("Failed to initialize Twilio client:", e);
    }
  }
  return null;
};

admin.initializeApp();

// ====================== GEOFENCING VALIDATION ======================
export const validateSOSGeofence = onDocumentCreate(
  "sos_alerts/{sosId}",
  async (event: any) => {
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

// Distance formula in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ====================== AUTO REPORT ON RESOLVED ======================
export const generateReportOnResolved = onDocumentUpdated(
  "sos_alerts/{sosId}",
  async (event: any) => {
    if (!event.data) {
        console.error("No data associated with the event.");
        return;
    }
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status !== "resolved" && after.status === "resolved") {
      console.log(`📄 SOS ${event.params.sosId} resolved - Report generation triggered`);
    }
  }
);

// ====================== SOS CLOUD FUNCTIONS ======================

// 1. Create New SOS + Notifications
export const createSOS = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in to trigger an SOS alert');
  }

  const db = admin.firestore();
  const data = request.data || {};
  
  const sosRef = db.collection('alerts').doc();
  const alertId = sosRef.id;

  const sosData = {
    id: alertId,
    userId: request.auth.uid,
    userName: data.userName || 'Anonymous Resident',
    description: data.description || 'Emergency SOS',
    location: data.location || { lat: 0, lng: 0 },
    photos: data.photos || [],
    audioUrl: data.audioUrl || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: 'active',
    severity: data.severity || 'high',
    assignedTo: null,
    responseTime: null,
  };

  await sosRef.set(sosData);

  // Trigger push notifications to all authorized Tanod patrols
  await notifyNearbyTanods({
    id: alertId,
    userName: sosData.userName,
    description: sosData.description,
    location: sosData.location,
  });

  // Twilio SMS integration for high-severity alerts
  if (sosData.severity === 'high') {
    await sendEmergencySMS(sosData);
  }

  return { success: true, sosId: alertId };
});

// 2. Sync Offline/Queued SOS
export const syncOfflineSOS = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in to sync offline SOS reports');
  }

  const db = admin.firestore();
  const data = request.data || {};
  const batch = db.batch();
  const results: any[] = [];
  const sosBatch = data.sosBatch || [data];

  for (const item of sosBatch) {
    if (!item) continue;
    const docId = item.clientUuid || db.collection('alerts').doc().id;
    const docRef = db.collection('alerts').doc(docId);

    batch.set(docRef, {
      ...item,
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'offline_queue',
      userId: request.auth.uid,
    }, { merge: true });

    results.push({ id: docId, success: true });
  }

  await batch.commit();
  return { success: true, synced: results.length, results };
});

// 3. Assign Nearest Tanod (Background Trigger)
export const assignNearestTanod = onDocumentCreate(
  "alerts/{alertId}",
  async (event: any) => {
    if (!event.data) {
      console.error("No data associated with the event.");
      return;
    }

    const sos = event.data.data();
    if (!sos || !sos.location || sos.assignedTo) return;

    try {
      const nearestTanod = await findNearestAvailableTanod(sos.location);

      if (nearestTanod) {
        await event.data.ref.update({
          assignedTo: nearestTanod.id,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send FCM (Push Notification) to the assigned Tanod patrol unit
        await admin.messaging().send({
          topic: `tanod-${nearestTanod.id}`,
          notification: {
            title: "🚨 Emergency Dispatched 🚨",
            body: `${sos.userName}: ${sos.description.substring(0, 100)}`,
          },
          data: {
            alertId: event.params.alertId,
            type: 'assigned_sos'
          }
        });

        console.log(`🎯 Assigned alert ${event.params.alertId} to nearest Tanod: ${nearestTanod.id}`);
      }
    } catch (error) {
      console.error("Error assigning nearest Tanod:", error);
    }
  }
);

// 4. Tanod Heartbeat Location Tracker
export const tanodHeartbeat = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authenticating credentials required for Tanod duty updates');
  }

  const db = admin.firestore();
  const data = request.data || {};
  const tanodId = data.id || request.auth.uid;

  await db.collection('tanod_locations').doc(tanodId).set({
    ...data,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});

// Helper: Notify Nearby Tanods via FCM Topic or direct dispatch logs
async function notifyNearbyTanods(sos: any) {
  try {
    // Notify general Tanod topic for broad neighborhood alerts
    await admin.messaging().send({
      topic: 'tanod_emergencies',
      notification: {
        title: "🆘 EMERGENCY ALERT 🆘",
        body: `${sos.userName} reports: ${sos.description.substring(0, 80)}`,
      },
      data: {
        alertId: sos.id,
        type: 'new_emergency_broadcast'
      }
    });
    console.log("📢 Broadcast message sent to Tanod responders topic");
  } catch (err) {
    console.error("Failed to notify Tanods via FCM:", err);
  }
}

// Helper: Find Nearest Available Tanod within 5 kilometers range
async function findNearestAvailableTanod(sosLocation: { lat: number; lng: number }) {
  const db = admin.firestore();
  const tanodsSnapshot = await db.collection('tanod_locations')
    .where('status', '==', 'online')
    .get();

  let nearest: any = null;
  let minDistance = Infinity;

  tanodsSnapshot.forEach(doc => {
    const tanod = doc.data();
    if (!tanod.location || typeof tanod.location.lat !== 'number' || typeof tanod.location.lng !== 'number') return;

    const distance = calculateDistanceMeters(
      sosLocation.lat, sosLocation.lng,
      tanod.location.lat, tanod.location.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { id: doc.id, ...tanod };
    }
  });

  // Limit response range to 5000 meters (5 kilometers)
  return minDistance < 5000 ? nearest : null;
}

// Helper: Send Twilio SMS Backup Alert
async function sendEmergencySMS(sos: any) {
  const twilio = getTwilioClient();
  if (!twilio) {
    console.log("⚠️ Twilio client not configured. Skipping SMS alert.");
    return;
  }

  try {
    const fromPhone = process.env.TWILIO_PHONE || functionsLegacy.config().twilio?.phone;
    const toHotline = process.env.TWILIO_HOTLINE || functionsLegacy.config().twilio?.hotline;

    if (!fromPhone || !toHotline) {
      console.warn("⚠️ Twilio phone or hotline is missing from environment params.");
      return;
    }

    await twilio.messages.create({
      body: `🚨 EMERGENCY S.O.S ALERT 🚨\nCitizen: ${sos.userName}\nEvent: ${sos.description}\nAt Coordinates: ${sos.location?.lat}, ${sos.location?.lng}\nTime: ${new Date().toLocaleString('en-US')}`,
      from: fromPhone,
      to: toHotline
    });
    console.log(`📲 Backup Emergency SMS successfully sent to barangay captain / captain's desk.`);
  } catch (error) {
    console.error("Error dispatching backup emergency SMS through Twilio:", error);
  }
}

// 5. Set User Role (Custom Claims)
export const setUserRole = onCall(async (request: any) => {
  // Only superadmin can set roles
  if (!request.auth || !["superadmin"].includes(request.auth.token.role)) {
    throw new HttpsError('permission-denied', 'Only superadmins can assign roles');
  }

  const { uid, role, barangayId } = request.data || {};

  if (!["resident", "tanod", "admin", "superadmin"].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role');
  }

  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { 
      role: role,
      barangayId: barangayId || null 
    });

    // Also update user document
    await admin.firestore().collection('users').doc(uid).update({
      role: role,
      barangayId: barangayId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', error.message);
  }
});

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';

// Use Firebase Functions config or env var
const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || functions.config().bootstrap?.secret;

export const bootstrapSuperAdmin = onCall(async (request: any) => {
  const { email, secret } = request.data;

  if (secret !== BOOTSTRAP_SECRET) {
    throw new HttpsError('unauthenticated', 'Unauthorized');
  }

  const user = await admin.auth().getUserByEmail(email);
  
  // Set custom claim
  await admin.auth().setCustomUserClaims(user.uid, { role: 'super_admin' });
  
  // Update Firestore
  await admin.firestore().collection('users').doc(user.uid).update({
    role: 'super_admin',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, uid: user.uid };
});

import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, startAt, endAt } from 'firebase/firestore';
import ngeohash from 'ngeohash';

export const triggerWitnessAlert = async (alertId: string, location: { lat: number, lng: number }) => {
  // Use a precision of 6 covers a box of ~1.2km x 0.6km. 
  // We'll query geohashes in that precise area.
  const precision = 6;
  const hash = ngeohash.encode(location.lat, location.lng, precision);
  
  const usersRef = collection(db, 'users');
  
  // Query users whose geohash starts with the same characters, 
  // effectively querying a rectangular area.
  const q = query(
    usersRef, 
    where('role', '==', 'resident'),
    orderBy('geohash'),
    startAt(hash),
    endAt(hash + '\uf8ff')
  );

  const snapshot = await getDocs(q);

  // Create WitnessRequest for each nearby resident in a global collection for easier listening
  const witnessRequests = snapshot.docs.map(async (doc) => {
    await addDoc(collection(db, 'witness_invites'), {
      alertId,
      witnessUserId: doc.id,
      status: 'pending',
      location, // Store incident location for the witness to see on map
      createdAt: new Date().toISOString()
    });
  });

  await Promise.all(witnessRequests);
  return snapshot.docs.length;
};

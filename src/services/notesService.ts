import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface Note {
  id?: string;
  userId: string;
  content: string;
  createdAt: any;
}

const NOTES_COLLECTION = 'notes';

export const notesService = {
  async getNotes(): Promise<Note[]> {
    if (!auth.currentUser) return [];
    const q = query(
      collection(db, NOTES_COLLECTION),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
  },

  async addNote(content: string): Promise<string> {
    if (!auth.currentUser) throw new Error('Not authenticated');
    const docRef = await addDoc(collection(db, NOTES_COLLECTION), {
      userId: auth.currentUser.uid,
      content,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async deleteNote(noteId: string): Promise<void> {
    await deleteDoc(doc(db, NOTES_COLLECTION, noteId));
  },
};

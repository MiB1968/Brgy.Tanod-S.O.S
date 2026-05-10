import { getDb } from '../index';
import { AppError } from '../../middleware/error';
import { Timestamp } from 'firebase-admin/firestore';

export abstract class BaseRepository<T extends { id: string }> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected getCollection() {
    return getDb().collection(this.collectionName);
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const now = Timestamp.now();
      const docRef = await this.getCollection().add({
        ...data,
        createdAt: now,
        updatedAt: now,
      });

      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      console.error(`[Repository] Create failed in ${this.collectionName}`, error);
      throw new AppError('Failed to create record', 500, 'DB_CREATE_ERROR');
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const doc = await this.getCollection().doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      throw new AppError('Failed to fetch record', 500, 'DB_READ_ERROR');
    }
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null> {
    try {
      const docRef = this.getCollection().doc(id);
      await docRef.update({
        ...data,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await docRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as T;
    } catch (error) {
      throw new AppError('Failed to update record', 500, 'DB_UPDATE_ERROR');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.getCollection().doc(id).delete();
      return true;
    } catch (error) {
      throw new AppError('Failed to delete record', 500, 'DB_DELETE_ERROR');
    }
  }
}

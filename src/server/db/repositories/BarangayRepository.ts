// src/server/db/repositories/BarangayRepository.ts
import { BaseRepository } from './BaseRepository';
import { Barangay } from '../../types';

export class BarangayRepository extends BaseRepository<Barangay> {
  constructor() {
    super('barangays');
  }

  async findByCode(code: string): Promise<Barangay | null> {
    const snapshot = await this.getCollection()
      .where('code', '==', code)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Barangay;
  }

  async findAllActive(): Promise<Barangay[]> {
    const snapshot = await this.getCollection()
      .where('isActive', '==', true)
      .orderBy('name')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Barangay));
  }

  async getStats(barangayId: string) {
    // You can expand this later with aggregation queries
    const incidentsSnapshot = await this.getCollection().doc(barangayId)
      .collection('incidents') // subcollection if you use it
      .count()
      .get();

    return {
      totalIncidents: incidentsSnapshot.data().count || 0,
      // Add more stats as needed
    };
  }
}

export const barangayRepository = new BarangayRepository();

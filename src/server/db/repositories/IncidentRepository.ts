import { BaseRepository } from './BaseRepository';
import { Incident } from '../../types';

export class IncidentRepository extends BaseRepository<Incident> {
  constructor() {
    super('incidents');
  }

  async findActiveByBarangay(barangayId: string, limit = 30): Promise<Incident[]> {
    const snapshot = await this.getCollection()
      .where('barangayId', '==', barangayId)
      .where('status', 'in', ['PENDING', 'DISPATCHED', 'RESPONDING'])
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Incident));
  }

  async findByReporter(reporterId: string, limit = 10): Promise<Incident[]> {
    const snapshot = await this.getCollection()
      .where('reporterId', '==', reporterId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Incident));
  }

  async findByStatus(status: string, barangayId?: string) {
    let query = this.getCollection().where('status', '==', status);

    if (barangayId) {
      query = query.where('barangayId', '==', barangayId);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
  }
}

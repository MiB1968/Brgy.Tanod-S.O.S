// src/server/db/repositories/AuthRepository.ts
import { BaseRepository } from './BaseRepository';
import { User } from '../../types';

export class AuthRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const snapshot = await this.getCollection()
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  async findByRole(role: string, limit = 50): Promise<User[]> {
    const snapshot = await this.getCollection()
      .where('role', '==', role)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));
  }

  async updateLastActive(id: string): Promise<User | null> {
    return this.update(id, { lastActive: new Date() });
  }

  async updateStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<User | null> {
    return this.update(id, { status });
  }
}

export const authRepository = new AuthRepository();

import { db } from '../index';
import { shifts } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { Shift } from '../../../types';

export class ShiftRepository {
  static async getAll(): Promise<Shift[]> {
    const results = await db.select({ id: shifts.id, tanodId: shifts.tanodId, tanodName: shifts.tanodName, startTime: shifts.startTime, endTime: shifts.endTime, sector: shifts.sector, status: shifts.status, tanodResponse: shifts.tanodResponse, notes: shifts.notes, createdAt: shifts.createdAt }).from(shifts).orderBy(desc(shifts.createdAt)).limit(100);
    return results.map(s => ({
      id: s.id,
      tanodId: s.tanodId as string,
      tanodName: s.tanodName as string,
      startTime: s.startTime?.toISOString() as string,
      endTime: s.endTime?.toISOString() as string,
      sector: s.sector as string,
      status: s.status as any,
      tanodResponse: s.tanodResponse as any,
      notes: s.notes as string,
      createdAt: s.createdAt?.toISOString() as string
    }));
  }

  static async getById(id: string): Promise<Shift | null> {
    const [result] = await db.select({ id: shifts.id, tanodId: shifts.tanodId, tanodName: shifts.tanodName, startTime: shifts.startTime, endTime: shifts.endTime, sector: shifts.sector, status: shifts.status, tanodResponse: shifts.tanodResponse, notes: shifts.notes, createdAt: shifts.createdAt }).from(shifts).where(eq(shifts.id, id));
    if (!result) return null;
    return {
      id: result.id,
      tanodId: result.tanodId as string,
      tanodName: result.tanodName as string,
      startTime: result.startTime?.toISOString() as string,
      endTime: result.endTime?.toISOString() as string,
      sector: result.sector as string,
      status: result.status as any,
      tanodResponse: result.tanodResponse as any,
      notes: result.notes as string,
      createdAt: result.createdAt?.toISOString() as string
    };
  }

  static async create(data: any): Promise<void> {
    await db.insert(shifts).values({
      tanodId: data.tanodId,
      tanodName: data.tanodName,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      sector: data.sector,
      status: data.status || 'scheduled',
      tanodResponse: data.tanodResponse || 'pending',
      notes: data.notes || null,
      createdAt: new Date()
    });
  }

  static async update(id: string, data: any): Promise<void> {
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.tanodResponse) updateData.tanodResponse = data.tanodResponse;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.sector) updateData.sector = data.sector;
    if (data.tanodId) updateData.tanodId = data.tanodId;
    if (data.tanodName) updateData.tanodName = data.tanodName;

    await db.update(shifts).set(updateData).where(eq(shifts.id, id));
  }

  static async delete(id: string): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }
}

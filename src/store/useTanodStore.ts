import { create } from 'zustand';
import { PatrolLocation, Shift, TanodActivityLog, TanodPatrolSession } from '../types';

interface TanodState {
  patrols: PatrolLocation[];
  shifts: Shift[];
  activityLogs: TanodActivityLog[];
  patrolSessions: TanodPatrolSession[];
  updatePatrol: (patrol: PatrolLocation) => void;
  setPatrols: (patrols: PatrolLocation[]) => void;
  setShifts: (shifts: Shift[]) => void;
  setActivityLogs: (logs: TanodActivityLog[]) => void;
  setPatrolSessions: (sessions: TanodPatrolSession[]) => void;
  updateShiftStatus: (shiftId: string, status: Shift['status']) => void;
  addActivityLog: (log: TanodActivityLog) => void;
}

export const useTanodStore = create<TanodState>((set) => ({
  patrols: [],
  shifts: [],
  activityLogs: [],
  patrolSessions: [],
  updatePatrol: (patrol: PatrolLocation) => set((state) => ({
    patrols: state.patrols.map((p) => p.id === patrol.id ? { ...p, ...patrol } : p)
  })),
  setPatrols: (patrols) => set({ patrols }),
  setShifts: (shifts) => set({ shifts }),
  setActivityLogs: (activityLogs) => set({ activityLogs }),
  setPatrolSessions: (patrolSessions) => set({ patrolSessions }),
  updateShiftStatus: (shiftId, status) => set((state) => ({
    shifts: state.shifts.map((s) => s.id === shiftId ? { ...s, status } : s)
  })),
  addActivityLog: (log) => set((state) => ({ 
    activityLogs: [log, ...state.activityLogs].slice(0, 100) 
  })),
}));

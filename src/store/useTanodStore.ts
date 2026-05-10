import { create } from 'zustand';
import { PatrolLocation, Shift, TanodActivityLog, TanodPatrolSession, TanodProfile, RegistryStatus } from '../types';

interface TanodState {
  patrols: PatrolLocation[];
  shifts: Shift[];
  activityLogs: TanodActivityLog[];
  patrolSessions: TanodPatrolSession[];
  tanods: TanodProfile[];
  updatePatrol: (patrol: PatrolLocation) => void;
  setPatrols: (patrols: PatrolLocation[] | ((prev: PatrolLocation[]) => PatrolLocation[])) => void;
  setShifts: (shifts: Shift[]) => void;
  setActivityLogs: (logs: TanodActivityLog[]) => void;
  setPatrolSessions: (sessions: TanodPatrolSession[]) => void;
  setTanods: (tanods: TanodProfile[]) => void;
  updateShiftStatus: (shiftId: string, status: Shift['status']) => void;
  updateTanodStatus: (tanodId: string, status: RegistryStatus) => void;
  addActivityLog: (log: TanodActivityLog) => void;
}

export const useTanodStore = create<TanodState>((set) => ({
  patrols: [],
  shifts: [],
  activityLogs: [],
  patrolSessions: [],
  tanods: [],
  updatePatrol: (patrol: PatrolLocation) => set((state) => ({
    patrols: state.patrols.map((p) => p.id === patrol.id ? { ...p, ...patrol } : p)
  })),
  setPatrols: (patrols) => set((state) => ({
    patrols: typeof patrols === 'function' ? patrols(state.patrols) : patrols
  })),
  setShifts: (shifts) => set({ shifts }),
  setActivityLogs: (activityLogs) => set({ activityLogs }),
  setPatrolSessions: (patrolSessions) => set({ patrolSessions }),
  setTanods: (tanods) => set({ tanods }),
  updateShiftStatus: (shiftId, status) => set((state) => ({
    shifts: state.shifts.map((s) => s.id === shiftId ? { ...s, status } : s)
  })),
  updateTanodStatus: (tanodId, status) => set((state) => ({
    tanods: state.tanods.map((t) => t.id === tanodId ? { ...t, status } : t)
  })),
  addActivityLog: (log) => set((state) => ({ 
    activityLogs: [log, ...state.activityLogs].slice(0, 100) 
  })),
}));

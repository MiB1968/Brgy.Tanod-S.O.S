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
  updatePatrol: (patrol: PatrolLocation) => set((state) => {
    const tid = patrol.tanodId || patrol.id;
    if (!tid) return state;

    const normalizedPatrol = {
      ...patrol,
      id: tid,
      tanodId: tid,
      lastUpdate: patrol.lastUpdate || new Date().toISOString()
    };

    const exists = state.patrols.find((p) => p.tanodId === tid);
    if (exists) {
      return {
        patrols: state.patrols.map((p) => 
          (p.tanodId === tid) ? { ...p, ...normalizedPatrol } : p
        )
      };
    }
    return {
      patrols: [...state.patrols, normalizedPatrol]
    };
  }),
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
  addActivityLog: (log) => set((state) => {
    const logId = log.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newLog = { ...log, id: logId };
    
    // De-duplicate if the log already exists by ID
    const exists = state.activityLogs.some(l => l.id === logId);
    if (exists) return state;
    
    return { 
      activityLogs: [newLog, ...state.activityLogs].slice(0, 500) 
    };
  }),
}));

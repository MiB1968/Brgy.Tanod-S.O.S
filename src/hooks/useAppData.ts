import { useEffect } from 'react';
import * as api from '../lib/api';
import { useIncidentStore } from '../store/useIncidentStore';
import { useTanodStore } from '../store/useTanodStore';
import { User, UserRole } from '../types';

export function useAppData(user: User | null, effectiveRole: UserRole | string) {
  const { setAlerts } = useIncidentStore();
  const { setPatrols, setTanods } = useTanodStore();

  useEffect(() => {
    async function loadInitialData() {
      if (!user) return;
      try {
        const [alertsData, patrolsData, tanodsData] = await Promise.all([
          api.alerts.getAll(),
          api.generic.list('patrols'),
          api.generic.list('users?role=tanod')
        ]);
        setAlerts(alertsData);
        setPatrols(patrolsData);
        setTanods(tanodsData);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }
    
    loadInitialData();
  }, [user, setAlerts, setPatrols, setTanods]);
}

import { useEffect } from 'react';
import * as api from '../lib/api';
import { useIncidentStore } from '../store/useIncidentStore';
import { useTanodStore } from '../store/useTanodStore';
import { User, UserRole } from '../types';

export function useAppData(user: User | null, effectiveRole: UserRole | string) {
  // Logic removed: Now handled centrally in BackgroundServices.tsx 
  // to prevent redundant API calls and race conditions.
  return null;
}

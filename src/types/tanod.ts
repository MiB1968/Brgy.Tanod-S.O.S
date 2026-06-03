export type TanodStatus = 'available' | 'on_patrol' | 'responding' | 'offline';

export interface TanodLocation {
  uid: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  status: TanodStatus;
}

export interface TanodProfile {
  uid: string;
  name: string;
  phone?: string;
  status: TanodStatus;
  lastActive: number;
  currentLocation?: TanodLocation;
  assignedIncidentId?: string;
}

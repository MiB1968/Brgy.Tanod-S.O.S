export type UserRole = 'resident' | 'tanod' | 'admin' | 'super_admin' | 'guest' | 'captain' | 'dispatcher';

export const RoleHierarchy: Record<UserRole, number> = {
  resident: 1,
  tanod: 2,
  admin: 3,
  super_admin: 4,
  guest: 0,
  captain: 3,
  dispatcher: 3,
};

export const RolePermissions: Record<UserRole, string[]> = {
  resident: ["view_map", "create_sos", "view_own_alerts"],
  tanod: ["view_map", "create_sos", "respond_alerts", "update_location", "view_own_alerts"],
  admin: ["view_map", "create_sos", "respond_alerts", "manage_users", "view_all_alerts", "broadcast", "view_reports", "manage_roster"],
  super_admin: ["*"],
  guest: [],
  captain: ["view_map", "create_sos", "respond_alerts", "manage_users", "view_all_alerts", "broadcast", "view_reports", "manage_roster"],
  dispatcher: ["view_map", "create_sos", "respond_alerts", "manage_users", "view_all_alerts", "broadcast", "view_reports", "manage_roster"],
};
export type RegistryStatus = 'pending' | 'approved' | 'rejected' | 'Available' | 'On Patrol' | 'Responding' | 'Off-Duty' | 'Break' | 'Offline';
export type AlertStatus = 'pending' | 'responding' | 'resolved' | 'cancelled' | 'needs_review';
export type IncidentStatus = 'pending' | 'ongoing' | 'resolved' | 'referred' | 'needs_review';
export type EmergencyType = 'MEDICAL' | 'FIRE' | 'CRIME' | 'NATURAL_DISASTER' | 'OTHER' | 'VIOLENCE' | 'FLOOD' | 'DISTURBANCE';

export interface User {
  id: string;
  uid: string;
  name: string;
  role: UserRole;
  phone?: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  status: RegistryStatus;
  rejectionReason?: string;
  activeAlertId?: string | null;
  lastActive?: string;
}

export interface TanodProfile extends User {
  sector?: string;
  isLocationSharingEnabled?: boolean;
  lastGpsLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
}

export interface ResidentProfile extends User {
  fullName: string;
  age: number;
  gender: string;
  dob: string;
  civilStatus: string;
  idType: string;
  idNumber: string;
  idPhotoUrl: string;
  selfieUrl: string;
  mobileNumber: string;
  altContactName?: string;
  altContactNumber?: string;
  houseNumber: string;
  street: string;
  householdCount: number;
  specialNeeds: 'Yes' | 'No';
  specialNeedsInfo?: string;
  gpsLat: number;
  gpsLng: number;
  registeredAt: string;
  approvedAt?: string;
}

export interface Alert {
  id: string;
  residentId: string;
  residentName: string;
  residentMobile?: string;
  type: EmergencyType;
  description?: string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  homeLocation?: {
    lat: number;
    lng: number;
  };
  status: AlertStatus;
  timestamp: string;
  isManualLocation?: boolean;
  assignedTo?: string;
  assignedToName?: string;
  respondedBy?: string;
  respondedByName?: string;
  respondedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  responderNotes?: string;
  reviewReason?: string;
  // ── Offline queue flag ────────────────────────────────────────────────────
  // Set to true when the SOS was saved to the local outbox because the device
  // was offline. Cleared once the server confirms receipt.
  isOfflineQueued?: boolean;
  aiAnalysis?: {
    incidentType: string;
    severityScore: number;
    urgency: string;
    summary: string;
    recommendedResponders: string[];
    riskFactors: string[];
    instructions: string[];
  };
}

export interface Incident {
  id: string;
  alertId?: string;
  tanodId: string;
  tanodName: string;
  timestamp: string;
  location: string;
  gpsLocation?: { lat: number; lng: number };
  type: string;
  description: string;
  personsInvolved?: string;
  actionsTaken?: string;
  status: IncidentStatus;
  respondedAt?: string;
  resolvedAt?: string;
  adminOnDuty?: string;
  reviewReason?: string;
}

export interface PatrolLocation {
  id: string;
  tanodId: string;
  tanodName: string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  isActive: boolean;
  status: 'patrolling' | 'responding' | 'offline';
  isLocationSharingEnabled?: boolean;
  lastUpdate: string;
}

export interface Shift {
  id: string;
  tanodId: string;
  tanodName: string;
  startTime: string;
  endTime: string;
  sector: string;
  status: 'scheduled' | 'active' | 'completed';
  tanodResponse?: 'pending' | 'accepted' | 'rejected';
  notes?: string;
  createdAt: string;
}

export interface TanodActivityLog {
  id: string;
  tanodId: string;
  tanodName: string;
  type: 'duty_start' | 'duty_end' | 'alert_response' | 'patrol_marker' | 'status_change';
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
  };
  details: string;
  alertId?: string;
  responseTime?: number;
}

export interface TanodRoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface TanodPatrolSession {
  id: string;
  tanodId: string;
  tanodName: string;
  startTime: string;
  endTime?: string;
  route: TanodRoutePoint[];
  distanceCovered?: number;
}

export interface SystemBroadcast {
  id: string;
  incidentId?: string;
  adminId: string;
  adminName: string;
  type: 'evacuation' | 'calamity' | 'security' | 'other' | 'emergency';
  message: string;
  isActive: boolean;
  timestamp: string;
  expiresAt?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  aiRecommendation?: any;
}

export interface WitnessRequest {
  id: string;
  alertId: string;
  witnessUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface QueuedSOS {
  id: string;
  residentId: string;
  type: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  queuedAt: number;
  attempts: number;
}

export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface LocationUpdate {
  userId: string;
  role: UserRole;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  alertId: string | null;
}

export interface SOSChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
}

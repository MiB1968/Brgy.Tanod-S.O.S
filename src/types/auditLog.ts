export interface AuditLogEntry {
  id: string;
  incident_id: string;
  type: 'Medical' | 'Fire' | 'Crime' | 'Other';
  status: 'Sent' | 'Received' | 'Dispatched' | 'Resolved';
  citizen_id?: string;
  tanod_assigned?: string;
  location_lat: number;
  location_lng: number;
  created_at: string;
  resolved_at?: string;
  notes?: string;
}

export interface AuditLogArchive {
  id: string;
  session_date: string;                // "YYYY-MM-DD"
  archived_at: string;                 // ISO 8601
  archived_by: 'system' | string;      // "system" = auto; string = admin userId
  log_count: number;
  log_entries: AuditLogEntry[];
  total_incidents: number;
  resolved_count: number;
  unresolved_count: number;
  notes?: string;
}

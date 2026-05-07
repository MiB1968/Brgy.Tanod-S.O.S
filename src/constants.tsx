
import { 
  IconRadar, 
  IconApprovedResidents, 
  IconOnlineTanods, 
  IconAdminBadge,
  IconActiveSOS,
  IconNewIncident
} from './components/TacticalIcons';
import { 
  Map as MapIcon, 
  Phone, 
  Settings as SettingsIcon, 
  Clock, 
  ClipboardList, 
  FileText, 
  MapPin, 
  Navigation
} from 'lucide-react';

export const navItems = [
  { id: 'home', label: '📡 Command', icon: IconRadar },
  { id: 'logs', label: '📋 Activity Logs', icon: ClipboardList },
  { id: 'map', label: '🗺 Offline Map', icon: MapIcon },
  { id: 'tracker', label: '📍 Tactical GPS', icon: Navigation },
  { id: 'residents', label: '👥 Residents', icon: IconApprovedResidents },
  { id: 'resident-map', label: '📍 Resident Map', icon: MapPin },
  { id: 'roster', label: '👮 Tanods', icon: IconOnlineTanods },
  { id: 'schedule', label: '📅 Schedule', icon: Clock },
  { id: 'reports', label: '📜 Reports', icon: FileText },
  { id: 'directory', label: '🆘 SOS Help', icon: Phone },
  { id: 'settings', label: '⚙️ Config', icon: SettingsIcon },
];

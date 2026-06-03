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
  Navigation,
  UserCheck,
  UserPlus,
  Bot,
  HardDrive,
  Users
} from 'lucide-react';

export const SOS_SUGGESTIONS: Record<string, string[]> = {
  medical: ['UNCONSCIOUS', 'BREATHING_DIFFICULTY', 'SEVERE_BLEEDING', 'CHEST_PAIN', 'SEIZURE'],
  fire: ['STRUCTURE_FIRE', 'ELECTRICAL_FIRE', 'GAS_LEAK', 'WILDFIRE', 'TRAPPED_PERSONS'],
  crime: ['ROBBERY_IN_PROGRESS', 'ASSAULT', 'SUSPICIOUS_ACTIVITY', 'DOMESTIC_STRIFE', 'VANDALISM'],
  flood: ['RISING_WATER_LEVEL', 'STRAPPED_IN_FLOOD', 'LANDSLIDE_RISK', 'POWER_LINE_DOWN', 'EVACUATION_NEEDED'],
  other: ['GENERAL_DISTURBANCE', 'ANIMAL_CONTROL', 'LOST_PERSON', 'PROPERTY_DAMAGE']
};

export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const isRuben = (uid?: string, email?: string) => {
  // Check against env variables and hardcoded bootstrap admin
  const masterEmail = (import.meta.env.VITE_MASTER_EMAIL || '').toLowerCase();
  const normalizedEmail = email?.toLowerCase() || '';
  
  if (!uid && !normalizedEmail) return false;

  return (
    (masterEmail && normalizedEmail === masterEmail) ||
    normalizedEmail === "rubenlleg12@gmail.com" ||
    normalizedEmail === "ben@brgytanod.com"
  );
};

export const PATROL_TIMEOUT = 1000 * 60 * 5; // 5 minutes

export const MAMBURAO_CENTER: [number, number] = [13.2236, 120.5960];

export const navItems = [
  { id: 'home', label: '📡 Command', icon: IconRadar },
  { id: 'logs', label: '📋 Activity Logs', icon: ClipboardList },
  { id: 'map', label: '🗺 Live Intel', icon: MapIcon },
  { id: 'areas', label: '📥 Offline Cache', icon: HardDrive },
  { id: 'tracker', label: '📍 Tactical GPS', icon: Navigation },
  { id: 'users', label: '👥 Users Roster', icon: Users },
  { id: 'resident-map', label: '📍 Resident Map', icon: MapPin },
  { id: 'roster', label: '👮 Tanods', icon: IconOnlineTanods },
  { id: 'schedule', label: '📅 Schedule', icon: Clock },
  { id: 'reports', label: '📜 Reports', icon: FileText },
  { id: 'records', label: '📄 Workspace', icon: FileText },
  { id: 'directory', label: '🆘 SOS Help', icon: Phone },
  { id: 'guardian', label: '🤖 Guardian AI', icon: Bot },
  { id: 'settings', label: '⚙️ Config', icon: SettingsIcon },
  { id: 'ops', label: '🔌 Integrations', icon: SettingsIcon },
];

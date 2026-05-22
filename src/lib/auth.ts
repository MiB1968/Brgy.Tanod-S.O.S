export const MASTER_ADMIN_EMAILS = (import.meta.env.VITE_MASTER_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const isMasterAdmin = (email?: string | null): boolean => {
  return !!(email && MASTER_ADMIN_EMAILS.includes(email.toLowerCase()));
};

export const getUserRole = (user: any): string => {
  return user?.role || (isMasterAdmin(user?.email) ? 'superadmin' : 'resident');
};

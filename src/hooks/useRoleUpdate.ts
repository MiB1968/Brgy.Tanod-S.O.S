import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { admin } from '../lib/api';

interface UseRoleUpdateReturn {
  updateRole: (userId: string, newRole: string, userName: string) => Promise<void>;
  loading: boolean;
}

export const useRoleUpdate = (): UseRoleUpdateReturn => {
  const [loading, setLoading] = useState(false);

  const updateRole = async (userId: string, newRole: string, userName: string) => {
    setLoading(true);

    try {
      // 1. Update role in backend + Firebase claims
      await admin.updateUserRole(userId, newRole);

      toast.success(`${userName} promoted to ${newRole.toUpperCase()}`);

      // 2. Force refresh token if current user changed their own role
      const _auth = getAuth();
      const currentUser = _auth.currentUser;

      if (currentUser && currentUser.uid === userId) {
        await currentUser.getIdToken(true);
        toast.success("Your permissions have been updated.");

        // Optional: Reload for clean state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err: any) {
      console.error("Role update failed:", err);
      toast.error(err.response?.data?.message || "Failed to update role");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateRole, loading };
};

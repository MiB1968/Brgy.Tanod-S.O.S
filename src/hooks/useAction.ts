import { useState } from 'react';
import toast from 'react-hot-toast';

export function useAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, successMessage?: string) => {
    setLoading(true);
    setError(null);
    try {
      await action();
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || err.message || 'Something went wrong';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleAction };
}

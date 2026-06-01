import { useState } from 'react';
import { toast } from 'react-hot-toast';

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async <T>(
    action: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (result: T) => void;
    }
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await action();

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }

      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        options?.errorMessage ||
        'Something went wrong';

      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, execute, setError };
}

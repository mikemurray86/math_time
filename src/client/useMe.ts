import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type Me } from './api.ts';

/** The child who's signed in on this device; sends everyone else to the picker. */
export function useMe() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const refresh = useCallback(
    () =>
      api<Me>('GET', '/api/me')
        .then(setMe)
        .catch((e) => {
          if (e instanceof ApiError && e.status === 401) navigate('/who', { replace: true });
        }),
    [navigate],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return [me, setMe] as const;
}

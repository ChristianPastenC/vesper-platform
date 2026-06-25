import { useCallback } from 'react';
import { useSovereignClient } from '../../providers/sovereign/SovereignClientContext';
import { getRefreshToken, saveTokens } from './tokenStore';
import { useAppStore } from '../../store/useAppStore';
import type { SovereignAdapterRequest } from '@sovereign/secure-client';
import { getApiUrl } from '../config';

/**
 * useAuthenticatedRequest
 *
 * Wraps SovereignClientCore's executeRequest to provide automatic token refresh behavior.
 * Intercepts 401 Unauthorized errors and automatically attempts to refresh the session
 * exactly once before falling back or throwing.
 */
export const useAuthenticatedRequest = () => {
  const client = useSovereignClient();
  const logout = useAppStore((state) => state.logout);

  const execute = useCallback(
    async <T>(requestId: string, request: SovereignAdapterRequest): Promise<T> => {
      const API_URL = getApiUrl();
      try {
        // 1. Execute original request
        return await client.executeRequest<T>(requestId, request);
      } catch (error: unknown) {
        // 2. If it fails (e.g. SovereignHttpError) with status === 401
        const err = error as { status?: number; message?: string };
        if (err && err.status === 401) {
          const refreshToken = await getRefreshToken();

          if (!refreshToken) {
            logout();
            throw error;
          }

          try {
            // 3. Call POST /api/v1/auth/refresh with refresh token (direct fetch without queuing)
            const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });

            // If refresh also fails with 401 or other auth error, clear session
            if (response.status === 401 || !response.ok) {
              logout();
              throw new Error('Token refresh failed');
            }

            const data = await response.json();
            const { accessToken: newAccess, refreshToken: newRefresh } = data;

            // 4. Save new tokens
            await saveTokens(newAccess, newRefresh);

            // Prepare retry with new accessToken in Authorization header
            const updatedRequest = {
              ...request,
              headers: {
                ...request.headers,
                Authorization: `Bearer ${newAccess}`,
              },
            };

            // 5. Retry the original request exactly once with the new accessToken
            return await client.executeRequest<T>(requestId, updatedRequest);
          } catch (refreshError) {
            logout();
            throw refreshError;
          }
        }

        // Throw original error if not 401
        throw error;
      }
    },
    [client, logout],
  );

  return { execute };
};

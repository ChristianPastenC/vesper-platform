import { useCallback } from 'react';
import { useSovereignClient } from '../../providers/SovereignClientContext';
import { getRefreshToken, saveTokens } from './tokenStore';
import { useAppStore } from '../../store/useAppStore';
import type { SovereignAdapterRequest } from '@sovereign/secure-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.sovereign.local';

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

  const execute = useCallback(async <T>(
    requestId: string,
    request: SovereignAdapterRequest
  ): Promise<T> => {
    try {
      // 1. Ejecuta la petición original
      return await client.executeRequest<T>(requestId, request);
    } catch (error: any) {
      // 2. Si recibe error (por ej. SovereignHttpError) con status === 401
      if (error && error.status === 401) {
        const refreshToken = await getRefreshToken();
        
        if (!refreshToken) {
          logout();
          throw error;
        }

        try {
          // 3. Llama POST /api/v1/auth/refresh con el refresh token (fetch directo sin pasar por la queue)
          const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          // Si el refresh también falla con 401 u otro error de auth, limpia la sesión
          if (response.status === 401 || !response.ok) {
            logout();
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          const { accessToken: newAccess, refreshToken: newRefresh } = data;

          // 4. Guarda los nuevos tokens
          await saveTokens(newAccess, newRefresh);

          // Prepara el reintento con el nuevo accessToken en el header Authorization
          const updatedRequest = {
            ...request,
            headers: {
              ...request.headers,
              Authorization: `Bearer ${newAccess}`,
            },
          };

          // 5. Reintenta la petición original exactamente una vez con el nuevo accessToken
          return await client.executeRequest<T>(requestId, updatedRequest);
        } catch (refreshError) {
          logout();
          throw refreshError;
        }
      }
      
      // Lanza el error original si no era 401
      throw error;
    }
  }, [client, logout]);

  return { execute };
};

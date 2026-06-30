import { useSovereignCatalog } from './useSovereignCatalog';

export const useCatalog = (category?: string, limit: number = 20) => {
  // Always fetch real data from the backend, regardless of auth state
  // The backend's /api/v1/catalog endpoint is public.
  return useSovereignCatalog(category, limit);
};

import { useVesperCatalog } from './useVesperCatalog';

export const useCatalog = (category?: string, limit: number = 20) => {
  // Always fetch real data from the backend, regardless of auth state
  // The backend's /api/v1/catalog endpoint is public.
  return useVesperCatalog(category, limit);
};

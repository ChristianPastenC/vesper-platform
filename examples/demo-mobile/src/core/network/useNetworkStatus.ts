import { useAppStore } from '../../store/useAppStore';

export const useNetworkStatus = () => {
  const isOnline = useAppStore((state) => state.isOnline);
  const toggleNetwork = useAppStore((state) => state.toggleNetwork);

  return {
    isOnline,
    toggleNetwork,
  };
};

import { renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from './useNetworkStatus';
import { useAppStore } from '../../store/useAppStore';

jest.mock('../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('useNetworkStatus', () => {
  it('returns isOnline and toggleNetwork from store', () => {
    const mockToggle = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ isOnline: true, toggleNetwork: mockToggle });
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.toggleNetwork).toBe(mockToggle);
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DevMenuScreen } from './DevMenuScreen';
import { useDevMenu } from '../hooks/useDevMenu';

jest.mock('../hooks/useDevMenu', () => ({
  useDevMenu: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      text: '#000',
      surface: '#fff',
      border: '#ccc',
      background: '#fff',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('DevMenuScreen', () => {
  const baseHookValue = {
    status: { queueSize: 0, isLocked: false, isIntegrityCompromised: false },
    isFrozen: false,
    isSimulatedOffline: false,
    isBusy: false,
    lastFlushResult: null,
    lastEnqueuedId: null,
    refreshStatus: jest.fn(),
    simulateOffline: jest.fn(),
    simulateOnline: jest.fn(),
    stopOperation: jest.fn(),
    flushTelemetryNow: jest.fn(),
    simulateE2EEvent: jest.fn(),
    enqueueTestPayload: jest.fn(),
    dequeueTestPayload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDevMenu as jest.Mock).mockReturnValue(baseHookValue);
  });

  it('renders the current ledger status', () => {
    (useDevMenu as jest.Mock).mockReturnValue({
      ...baseHookValue,
      status: { queueSize: 3, isLocked: true, isIntegrityCompromised: true },
    });

    const { getByTestId } = render(<DevMenuScreen />);

    expect(getByTestId('dev-menu-queue-size').props.children).toBe(3);
    expect(getByTestId('dev-menu-network-status').props.children).toBe('Online');
  });

  it('triggers simulateOffline when the network button is pressed while online', () => {
    const { getByTestId } = render(<DevMenuScreen />);
    fireEvent.press(getByTestId('dev-menu-toggle-network-btn'));
    expect(baseHookValue.simulateOffline).toHaveBeenCalledTimes(1);
  });

  it('triggers simulateOnline when the network button is pressed while simulated offline', () => {
    (useDevMenu as jest.Mock).mockReturnValue({ ...baseHookValue, isSimulatedOffline: true });
    const { getByTestId } = render(<DevMenuScreen />);
    fireEvent.press(getByTestId('dev-menu-toggle-network-btn'));
    expect(baseHookValue.simulateOnline).toHaveBeenCalledTimes(1);
  });

  it('triggers stopOperation when the stop button is pressed', () => {
    const { getByTestId } = render(<DevMenuScreen />);
    fireEvent.press(getByTestId('dev-menu-stop-operation-btn'));
    expect(baseHookValue.stopOperation).toHaveBeenCalledTimes(1);
  });

  it('triggers simulateE2EEvent and flushTelemetryNow from their buttons', () => {
    const { getByTestId } = render(<DevMenuScreen />);
    fireEvent.press(getByTestId('dev-menu-simulate-event-btn'));
    fireEvent.press(getByTestId('dev-menu-flush-telemetry-btn'));
    expect(baseHookValue.simulateE2EEvent).toHaveBeenCalledTimes(1);
    expect(baseHookValue.flushTelemetryNow).toHaveBeenCalledTimes(1);
  });

  it('shows the frozen and integrity-compromised states as danger', () => {
    (useDevMenu as jest.Mock).mockReturnValue({
      ...baseHookValue,
      isFrozen: true,
      status: { queueSize: 1, isLocked: false, isIntegrityCompromised: true },
    });

    const { getAllByText } = render(<DevMenuScreen />);

    expect(getAllByText('Yes')).toHaveLength(2);
  });

  it('shows a failure flush result with the error marker', () => {
    (useDevMenu as jest.Mock).mockReturnValue({
      ...baseHookValue,
      lastFlushResult: { success: false, eventCount: 0, message: 'No telemetry events buffered to flush.' },
    });

    const { getByTestId } = render(<DevMenuScreen />);
    expect(getByTestId('dev-menu-flush-result').props.children.join('')).toBe(
      '✗ No telemetry events buffered to flush.',
    );
  });

  it('shows the last flush result message', () => {
    (useDevMenu as jest.Mock).mockReturnValue({
      ...baseHookValue,
      lastFlushResult: { success: true, eventCount: 1, message: 'Sent 1 event(s) to the dashboard.' },
    });

    const { getByTestId } = render(<DevMenuScreen />);
    expect(getByTestId('dev-menu-flush-result').props.children.join('')).toContain(
      'Sent 1 event(s) to the dashboard.',
    );
  });

  it('disables the action buttons while busy', () => {
    (useDevMenu as jest.Mock).mockReturnValue({ ...baseHookValue, isBusy: true });
    const { getByTestId } = render(<DevMenuScreen />);
    expect(getByTestId('dev-menu-toggle-network-btn').props.accessibilityState.disabled).toBe(true);
    expect(getByTestId('dev-menu-simulate-event-btn').props.accessibilityState.disabled).toBe(true);
  });

  it('enqueues the typed label when the enqueue button is pressed', () => {
    const { getByTestId } = render(<DevMenuScreen />);
    fireEvent.changeText(getByTestId('dev-menu-custom-label-input'), 'GHOST_SEC_abc123');
    fireEvent.press(getByTestId('dev-menu-enqueue-btn'));
    expect(baseHookValue.enqueueTestPayload).toHaveBeenCalledWith('GHOST_SEC_abc123');
  });

  it('disables the enqueue button until a label is typed', () => {
    const { getByTestId } = render(<DevMenuScreen />);
    expect(getByTestId('dev-menu-enqueue-btn').props.accessibilityState.disabled).toBe(true);
  });

  it('disables the dequeue button until something has been enqueued', () => {
    const { getByTestId } = render(<DevMenuScreen />);
    expect(getByTestId('dev-menu-dequeue-btn').props.accessibilityState.disabled).toBe(true);
  });

  it('triggers dequeueTestPayload when the dequeue button is pressed', () => {
    (useDevMenu as jest.Mock).mockReturnValue({ ...baseHookValue, lastEnqueuedId: 'dast-123' });
    const { getByTestId } = render(<DevMenuScreen />);
    fireEvent.press(getByTestId('dev-menu-dequeue-btn'));
    expect(baseHookValue.dequeueTestPayload).toHaveBeenCalledTimes(1);
  });
});

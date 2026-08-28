import React from 'react';
import { ScrollView, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { Text } from '../../../components/Text';
import { useDevMenu } from '../hooks/useDevMenu';
import { stylesFactory } from './DevMenuScreen.styles';

export const DevMenuScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const {
    status,
    isFrozen,
    isSimulatedOffline,
    isBusy,
    lastFlushResult,
    refreshStatus,
    simulateOffline,
    simulateOnline,
    stopOperation,
    simulateE2EEvent,
    flushTelemetryNow,
  } = useDevMenu();

  return (
    <ScrollView style={styles.container} testID="dev-menu-scroll">
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Developer-only tools. Actions here directly drive the native Sovereign ledger and can
          send real telemetry to the local dashboard.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ledger Status</Text>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Queued transactions</Text>
            <Text style={styles.statusValue} testID="dev-menu-queue-size">
              {status.queueSize}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Session frozen</Text>
            <Text
              style={[styles.statusValue, isFrozen ? styles.statusValueDanger : styles.statusValueOk]}
            >
              {isFrozen ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Integrity compromised</Text>
            <Text
              style={[
                styles.statusValue,
                status.isIntegrityCompromised ? styles.statusValueDanger : styles.statusValueOk,
              ]}
            >
              {status.isIntegrityCompromised ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Simulated network</Text>
            <Text style={styles.statusValue} testID="dev-menu-network-status">
              {isSimulatedOffline ? 'Offline' : 'Online'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={refreshStatus}
            testID="dev-menu-refresh-btn"
          >
            <Ionicons name="refresh-outline" size={18} color={theme.colors.text} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operation Control</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={isSimulatedOffline ? simulateOnline : simulateOffline}
            disabled={isBusy}
            testID="dev-menu-toggle-network-btn"
          >
            {isBusy ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <>
                <Ionicons
                  name={isSimulatedOffline ? 'cloud-done-outline' : 'cloud-offline-outline'}
                  size={18}
                  color={theme.colors.text}
                />
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  {isSimulatedOffline ? 'Resume Network (Flush Queue)' : 'Simulate Network Offline'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={stopOperation}
            testID="dev-menu-stop-operation-btn"
          >
            <Ionicons name="stop-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Stop Operation (Freeze &amp; Purge)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Telemetry E2E Simulation</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={simulateE2EEvent}
            disabled={isBusy}
            testID="dev-menu-simulate-event-btn"
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="flash-outline" size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>Simulate E2E Event &amp; Send to Dashboard</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={flushTelemetryNow}
            disabled={isBusy}
            testID="dev-menu-flush-telemetry-btn"
          >
            <Ionicons name="send-outline" size={18} color={theme.colors.text} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Flush Buffered Telemetry</Text>
          </TouchableOpacity>

          {lastFlushResult && (
            <Text style={styles.resultText} testID="dev-menu-flush-result">
              {lastFlushResult.success ? '✓ ' : '✗ '}
              {lastFlushResult.message}
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

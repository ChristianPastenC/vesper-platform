import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface HandshakeResponse { status: string; message: string; timestamp: string; }

const API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export default function App() {
  const [response, setResponse] = useState<HandshakeResponse | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const runHandshake = async () => {
    setLoading(true); setError(null); setResponse(null);
    try {
      const res  = await fetch(`${API_BASE}/api/handshake`);
      const json = await res.json() as HandshakeResponse;
      setResponse(json);
    } catch {
      setError(`Sin conexión con ${API_BASE}. En iPhone físico edita API_BASE con tu IP LAN.`);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style='light' />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>SovereignCore</Text>
          <Text style={styles.subtitle}>Ciberseguridad Móvil - SDK 54 Nativo Puro</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Endpoint</Text>
          <Text style={styles.cardValue}>{API_BASE}/api/handshake</Text>
        </View>

        <TouchableOpacity onPress={runHandshake} disabled={loading} activeOpacity={0.8}
          style={[styles.button, { opacity: loading ? 0.6 : 1 }]}>
          {loading
            ? <ActivityIndicator color='#fff' />
            : <Text style={styles.buttonText}>Ejecutar Handshake</Text>}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Error de conexión</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {response && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Handshake exitoso</Text>
            <View style={styles.row}><Text style={styles.rowLabel}>Status</Text><Text style={styles.rowValue}>{response.status}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>Mensaje</Text><Text style={styles.rowValue}>{response.message}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>Timestamp</Text><Text style={styles.rowValue}>{response.timestamp}</Text></View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>SovereignCore v1.0 - Maestría en Ciberseguridad</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 30, fontWeight: '900', color: '#a78bfa', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#9ca3af', marginTop: 4, fontWeight: '500' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#2d2d4e' },
  cardLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6, fontWeight: '700', letterSpacing: 0.5 },
  cardValue: { color: '#e5e5e5', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },
  button: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  errorCard: { backgroundColor: '#451a03', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#7f1d1d' },
  errorTitle: { color: '#fca5a5', fontWeight: '600', marginBottom: 4 },
  errorText: { color: '#fca5a5', fontSize: 13 },
  successCard: { backgroundColor: '#064e3b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#065f46' },
  successTitle: { color: '#34d399', fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 8 },
  rowLabel: { color: '#9ca3af', fontSize: 13, width: 90 },
  rowValue: { color: '#d1fae5', fontSize: 13, flex: 1 },
  footer: { marginTop: 'auto', pt: 40 },
  footerText: { color: '#9ca3af', fontSize: 11, textAlign: 'center' }
});
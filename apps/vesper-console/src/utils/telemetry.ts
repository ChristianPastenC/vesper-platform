export interface Metric {
  id: string;
  metric_type: number;
  value: number;
  timestamp: string;
}

export interface MetricPoint {
  x: string;
  y: number;
}

export interface LogDetails {
  level: string;
  source: string;
  msg: string;
  valHex: string;
  hasTrace: boolean;
  time?: string;
}

export const formatTime = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const getLogDetails = (metric_type: number, value: number): LogDetails => {
  switch (metric_type) {
    case 1:
      return {
        level: 'FATAL',
        source: 'CPP_CORE',
        msg: 'ZEROIZATION_TRIGGERED: RAM wiped to protect crypto material.',
        valHex: `0x${Math.floor(value).toString(16).toUpperCase()}`,
        hasTrace: true
      };
    case 2:
      return {
        level: 'ERROR',
        source: 'TS_WRAPPER',
        msg: `INTEGRITY_COMPROMISED: Ledger hash mismatch detected. Offset: ${value}`,
        valHex: '0x0002A3F',
        hasTrace: true
      };
    case 3:
      return {
        level: 'INFO',
        source: 'CPP_CORE',
        msg: `COMPUTE_HASH_LATENCY: DPoP token computed in ${value.toFixed(2)}ms.`,
        valHex: `${value.toFixed(2)}ms`,
        hasTrace: false
      };
    default:
      return {
        level: 'DEBUG',
        source: 'UNKNOWN',
        msg: `Generic Telemetry Event [Type: ${metric_type}]`,
        valHex: String(value),
        hasTrace: false
      };
  }
};

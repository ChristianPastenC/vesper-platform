import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function () {
  const url = 'http://localhost:8080/api/v1/support/telemetry/'; // Assuming 8080, adjust if needed
  
  // Create a 17-byte mock binary payload matching the backend struct
  // 1 byte eventType + 8 bytes timestamp + 8 bytes float64 value
  // Using an ArrayBuffer
  const buffer = new ArrayBuffer(17);
  const view = new DataView(buffer);
  
  // Event Type: TypeZeroizationTriggered (let's assume it's 1 based on handler logic, actually it's just a valid enum)
  view.setUint8(0, 1); 
  
  // Timestamp: 8 bytes little endian
  const now = Date.now();
  view.setBigUint64(1, BigInt(now), true);
  
  // Value: 8 bytes little endian float64
  view.setFloat64(9, 42.5, true);

  const payload = buffer;
  const params = {
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Sovereign-API-Key': 'mock-api-key', // Usually needed
      'X-Bundle-ID': 'com.vesper.app',
      'X-Sovereign-Start-Index': '0'
    },
  };

  const res = http.post(url, payload, params);
  
  check(res, {
    'is status 202': (r) => r.status === 202,
  });
  
  sleep(1);
}

'use client';
import { useState } from 'react';
interface Handshake { status: string; message: string; timestamp: string; }
export default function HomePage() {
  const [data,    setData]    = useState<Handshake | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function ping() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('http://localhost:8080/api/handshake');
      setData(await res.json());
    } catch {
      setError('No se pudo conectar con el backend en :8080');
    } finally { setLoading(false); }
  }
  return (
    <main style={{ maxWidth:720, margin:'0 auto', padding:'48px 24px' }}>
      <h1 style={{ color:'#a78bfa' }}>SovereignCore</h1>
      <p  style={{ color:'#9ca3af', marginBottom:24 }}>Portal de Soporte</p>
      <button onClick={ping} disabled={loading}
        style={{ background: loading ? '#374151':'#7c3aed', color:'#fff',
                 border:'none', borderRadius:8, padding:'10px 24px', cursor:'pointer' }}>
        {loading ? 'Conectando...' : 'Ejecutar Handshake'}
      </button>
      {error && <div style={{ marginTop:16, color:'#fca5a5' }}>{error}</div>}
      {data  && (
        <pre style={{ marginTop:16, background:'#052e16', color:'#d1fae5',
                      padding:16, borderRadius:8 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
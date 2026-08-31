import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RiKey2Line, RiFileCopyLine, RiDeleteBinLine } from '@remixicon/react';
import { ConfirmModal } from './ConfirmModal';

interface Key {
  key: string;
  name: string;
  bundle_id: string;
  created_at: string;
}

interface MetricPoint {
  x: string;
  y: number;
}

export const Dashboard: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [integrityData, setIntegrityData] = useState<MetricPoint[]>([]);
  const [latencyData, setLatencyData] = useState<MetricPoint[]>([]);
  
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('sovereign_session_token');
    if (!t) {
      window.location.href = '/login';
    } else {
      setToken(t);
    }
  }, []);

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingKeys(true);
      const res = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8081'}/api/v1/b2b/keys`, {
        headers: { 'Authorization': token }
      });
      if (res.status === 401) {
        localStorage.removeItem('sovereign_session_token');
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      setKeys(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKeys(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchKeys();
    }
  }, [token, fetchKeys]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newKeyName) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8081'}/api/v1/b2b/keys`, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newKeyName })
      });
      if (res.ok) {
        setNewKeyName('');
        await fetchKeys();
      } else {
        alert('Error al generar llave (Límite alcanzado)');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmRevoke = (keyStr: string) => {
    setKeyToRevoke(keyStr);
    setRevokeModalOpen(true);
  };

  const handleRevoke = async () => {
    if (!token || !keyToRevoke) return;
    try {
      await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8081'}/api/v1/b2b/keys?key=${keyToRevoke}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      await fetchKeys();
    } catch (err) {
      console.error(err);
    } finally {
      setKeyToRevoke(null);
    }
  };

  const fetchMetrics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8081'}/api/v1/b2b/metrics`, {
        headers: { 'Authorization': token }
      });
      if (!res.ok) return;
      const metrics = await res.json();
      
      const newIntegrityData: MetricPoint[] = [];
      const newLatencyData: MetricPoint[] = [];

      metrics.forEach((m: any) => {
        const date = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (m.metric_type === 2) {
          newIntegrityData.push({ x: date, y: m.value });
        } else if (m.metric_type === 3) {
          newLatencyData.push({ x: date, y: m.value });
        }
      });

      if (newIntegrityData.length > 0) {
        setIntegrityData(newIntegrityData);
      }
      if (newLatencyData.length > 0) {
        setLatencyData(newLatencyData);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 3000);
      return () => clearInterval(interval);
    }
  }, [token, fetchMetrics]);

  if (!token) return null;

  const latestIntegrity = integrityData.length > 0 ? integrityData[integrityData.length - 1].y : 0;
  const latestLatency = latencyData.length > 0 ? latencyData[latencyData.length - 1].y : 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0d1117] border border-slate-700 p-2 rounded shadow-lg text-sm text-slate-300">
          <p className="font-semibold">{label}</p>
          <p className="text-emerald-400">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
          <p className="text-slate-400 mt-1 text-sm">Monitoree la salud e integridad criptográfica de su flota de SDKs instalados.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel de Keys */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
              <h2 className="text-lg font-semibold text-white mb-4">API Keys</h2>
              <p className="text-sm text-slate-400 mb-6">Genere llaves para inyectar en la configuración de <code>SovereignClientCore</code> en el dispositivo del cliente.</p>
              
              <div className="space-y-3 mb-6">
                {loadingKeys ? (
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                    </div>
                  </div>
                ) : keys.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay llaves generadas.</p>
                ) : (
                  keys.map((k) => (
                    <div key={k.key} className="p-4 rounded-lg border border-slate-800 bg-slate-950 flex flex-col gap-3 relative group">
                      <button 
                        onClick={() => confirmRevoke(k.key)}
                        className="absolute top-3 right-3 text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <RiDeleteBinLine size={12} /> Revocar
                      </button>
                      
                      <div>
                        <div className="flex justify-between items-center pr-16">
                          <span className="text-sm font-bold text-white">{k.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                            <RiKey2Line size={12} />
                            {k.bundle_id || 'Pendiente de vinculación (TOFU)'}
                          </span>
                          <span className="text-xs text-slate-600">{new Date(k.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div 
                        className="bg-black/50 p-2.5 rounded flex justify-between items-center hover:ring-1 hover:ring-emerald-500/30 transition-all cursor-pointer"
                        onClick={() => copyToClipboard(k.key)}
                      >
                        <code className="text-xs text-emerald-400 font-mono tracking-wide">{k.key}</code>
                        <span className="text-slate-500 text-xs flex items-center gap-1"><RiFileCopyLine size={12} /> Copiar</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleCreateKey} className="space-y-3">
                <fieldset disabled={keys.length > 0 || isGenerating} className="space-y-3">
                  <input 
                    type="text" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Nombre de la llave (Ej. Producción)" 
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? 'Generando...' : keys.length > 0 ? 'Límite alcanzado (1/1)' : 'Generar API Key'}
                  </button>
                </fieldset>
              </form>
            </div>
          </div>

          {/* Panel de Telemetría */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
                <h2 className="text-lg font-semibold text-white mb-2">Integridad del Ledger</h2>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-3xl font-bold text-white">{latestIntegrity}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${latestIntegrity > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {latestIntegrity > 0 ? 'Alerta' : 'Estable'}
                  </span>
                </div>
                <div className="h-48">
                  {integrityData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-pulse flex space-x-4 w-full h-full p-4">
                        <div className="flex-1 bg-slate-800/50 rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={integrityData}>
                        <XAxis dataKey="x" hide />
                        <YAxis hide domain={[0, 'dataMax + 2']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="y" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                <h2 className="text-lg font-semibold text-white mb-2">Latencia DPoP (ms)</h2>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-3xl font-bold text-white">{latestLatency.toFixed(1)} ms</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${latestLatency > 100 ? 'bg-red-500/20 text-red-400' : latestLatency > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {latestLatency === 0 ? 'Esperando datos' : latestLatency > 100 ? 'Crítico' : latestLatency > 50 ? 'Lento' : 'Óptimo'}
                  </span>
                </div>
                <div className="h-48">
                  {latencyData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-pulse flex space-x-4 w-full h-full p-4">
                        <div className="flex-1 bg-slate-800/50 rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={latencyData}>
                        <XAxis dataKey="x" hide />
                        <YAxis hide domain={[0, 'dataMax + 10']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      <ConfirmModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        onConfirm={handleRevoke}
        title="Revocar API Key"
        message="¿Estás seguro que deseas revocar esta API Key? Todas las peticiones con este Bundle ID fallarán hasta configurar una nueva."
        confirmText="Revocar Key"
      />
    </div>
  );
};

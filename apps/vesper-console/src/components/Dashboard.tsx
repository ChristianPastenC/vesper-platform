import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

interface LogDetails {
  level: string;
  msg: string;
  time: string;
}

export const Dashboard: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [integrityData, setIntegrityData] = useState<MetricPoint[]>([]);
  const [latencyData, setLatencyData] = useState<MetricPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogDetails[]>([]);
  
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('sovereign_session_token');
    if (!t) {
      // Demo Mode Fallback
      localStorage.setItem('sovereign_session_token', 'demo_token');
      localStorage.setItem('sovereign_tenant_name', 'Demo Corp (Offline Mode)');
      setToken('demo_token');
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
      setKeys(data);
    } catch (err) {
      console.warn('API Unreachable. Activating Offline Mock Data for Keys.', err);
      setKeys([{
        key: 'sk_live_demo_9876543210',
        name: 'Production Environment',
        bundle_id: 'com.democorp.app',
        created_at: new Date().toISOString()
      }]);
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
      const newLogs: LogDetails[] = [];

      metrics.forEach((m: any) => {
        const date = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let level = 'DEBUG';
        let msg = `Generic Telemetry [Type: ${m.metric_type}]`;
        if (m.metric_type === 1) {
          level = 'FATAL';
          msg = 'ZEROIZATION_TRIGGERED: RAM wiped to protect crypto material.';
        } else if (m.metric_type === 2) {
          level = 'ERROR';
          msg = `INTEGRITY_COMPROMISED: Ledger hash mismatch. Offset: ${m.value}`;
          newIntegrityData.push({ x: date, y: m.value });
        } else if (m.metric_type === 3) {
          level = 'INFO';
          msg = `COMPUTE_HASH_LATENCY: DPoP token computed in ${m.value.toFixed(2)}ms`;
          newLatencyData.push({ x: date, y: m.value });
        }
        
        newLogs.push({ level, msg, time: date });
      });

      if (newIntegrityData.length > 0) setIntegrityData(newIntegrityData);
      if (newLatencyData.length > 0) setLatencyData(newLatencyData);
      if (newLogs.length > 0) {
        setRecentLogs(prev => {
          const l = [...prev, ...newLogs];
          return l.length > 10 ? l.slice(l.length - 10) : l;
        });
      }
    } catch (err) {
      // Offline Mock Generator
      const date = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const r = Math.random();
      const isBreach = r > 0.95;
      const latency = 15 + Math.random() * 50;

      setIntegrityData(prev => {
        const d = [...prev, { x: date, y: isBreach ? 1 : 0 }];
        return d.length > 20 ? d.slice(d.length - 20) : d;
      });
      
      setLatencyData(prev => {
        const d = [...prev, { x: date, y: latency }];
        return d.length > 20 ? d.slice(d.length - 20) : d;
      });

      setRecentLogs(prev => {
        let level = 'INFO';
        let msg = `COMPUTE_HASH_LATENCY: DPoP token computed in ${latency.toFixed(2)}ms`;
        
        if (isBreach) {
          level = 'ERROR';
          msg = `INTEGRITY_COMPROMISED: Ledger hash mismatch detected. Offset: 1`;
        }

        const l = [...prev, { level, msg, time: date }];
        return l.length > 10 ? l.slice(l.length - 10) : l;
      });
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchKeys();
      fetchMetrics(); // Initial fetch
      const interval = setInterval(fetchMetrics, 2000); // Poll every 2s
      return () => clearInterval(interval);
    }
  }, [token, fetchMetrics, fetchKeys]);

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
    <div className="flex-1 overflow-auto p-8 relative">
      {/* Astro.build style ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Dashboard Overview</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">Monitoree la salud e integridad criptográfica de su flota de SDKs instalados en tiempo real.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel de Keys */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:ring-white/20 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10">
                <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <RiKey2Line size={20} className="text-emerald-400" /> API Keys
                </h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">Genere llaves para inyectar en la configuración de <code className="bg-white/5 text-emerald-300 px-1.5 py-0.5 rounded text-xs">SovereignClientCore</code> en el dispositivo del cliente.</p>
                
                <div className="space-y-3 mb-6">
                  {loadingKeys ? (
                    <div className="animate-pulse flex space-x-4">
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-4 bg-white/5 rounded w-3/4"></div>
                        <div className="h-4 bg-white/5 rounded w-1/2"></div>
                      </div>
                    </div>
                  ) : keys.length === 0 ? (
                    <div className="bg-white/5 rounded-lg p-4 text-center border border-white/5 border-dashed">
                      <p className="text-sm text-slate-400">No hay llaves generadas.</p>
                    </div>
                  ) : (
                    keys.map((k) => (
                      <div key={k.key} className="p-4 rounded-xl border border-white/5 bg-black/20 flex flex-col gap-3 relative group/key hover:bg-black/40 hover:border-white/10 transition-all duration-300">
                        <button 
                          onClick={() => confirmRevoke(k.key)}
                          className="absolute top-3 right-3 text-red-400 opacity-0 group-hover/key:opacity-100 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 transform translate-y-1 group-hover/key:translate-y-0"
                        >
                          <RiDeleteBinLine size={14} /> Revocar
                        </button>
                        
                        <div>
                          <div className="flex justify-between items-center pr-24">
                            <span className="text-sm font-bold text-white tracking-wide">{k.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-emerald-400/80 font-mono bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1.5">
                              <RiKey2Line size={12} />
                              {k.bundle_id || 'Pendiente de vinculación'}
                            </span>
                            <span className="text-xs text-slate-500">{new Date(k.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div 
                          className="bg-black/40 p-3 rounded-lg flex justify-between items-center ring-1 ring-white/5 hover:ring-emerald-500/30 transition-all cursor-pointer mt-1 group/copy"
                          onClick={() => copyToClipboard(k.key)}
                        >
                          <code className="text-xs text-slate-300 font-mono tracking-wide truncate mr-4">{k.key}</code>
                          <span className="text-slate-400 text-xs flex items-center gap-1.5 font-medium group-hover/copy:text-emerald-400 transition-colors shrink-0"><RiFileCopyLine size={14} /> Copiar</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleCreateKey} className="space-y-4">
                  <fieldset disabled={keys.length > 0 || isGenerating} className="space-y-3">
                    <input 
                      type="text" 
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Nombre de la llave (Ej. Producción)" 
                      required
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                      type="submit" 
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {isGenerating ? 'Generando...' : keys.length > 0 ? 'Límite alcanzado (1/1)' : 'Generar API Key'}
                    </button>
                  </fieldset>
                </form>
              </div>
            </div>

            {/* Security Posture Policies (From BIA Docs) */}
            <div className="bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:ring-white/20 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-400"><path fillRule="evenodd" d="M11.828 2.25c-.916 0-1.699.663-1.85 1.567l-.091.549a3.375 3.375 0 0 1-2.42 2.42l-.548.091c-.904.15-1.568.934-1.568 1.85v.802c0 .946.15 1.875.44 2.76.28.852.706 1.638 1.253 2.316.58.718 1.272 1.332 2.053 1.808a10.638 10.638 0 0 0 2.731 1.2c.441.135.917.135 1.358 0a10.638 10.638 0 0 0 2.73-1.2c.782-.476 1.474-1.09 2.054-1.808.547-.678.973-1.464 1.253-2.316a8.91 8.91 0 0 0 .44-2.76v-.802c0-.916-.664-1.7-1.568-1.85l-.548-.092a3.375 3.375 0 0 1-2.42-2.42l-.091-.548c-.151-.904-.934-1.568-1.85-1.568h-.802Z" clipRule="evenodd" /></svg>
                  Security Posture
                </h2>
                
                <div className="space-y-3">
                  <div className="bg-black/20 border border-white/5 p-3 rounded-xl flex items-start gap-3 hover:bg-white/5 transition-colors">
                    <div className="mt-1"><div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div></div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">Zero-Disk Footprint</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">No persistence. All cryptographic materials and payloads are strictly confined to volatile RAM, ensuring total forensic deniability.</p>
                    </div>
                  </div>
                  
                  <div className="bg-black/20 border border-white/5 p-3 rounded-xl flex items-start gap-3 hover:bg-white/5 transition-colors">
                    <div className="mt-1"><div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div></div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">Deterministic Zeroize</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Physical memory allocations are actively zeroized (<code className="text-emerald-400/80">SecureZeroMemory</code>) explicitly after dispatch or TTL expiry.</p>
                    </div>
                  </div>

                  <div className="bg-black/20 border border-white/5 p-3 rounded-xl flex items-start gap-3 hover:bg-white/5 transition-colors">
                    <div className="mt-1"><div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div></div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">DPoP Strict Mode</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">All payloads enforce RFC 9449 standard. Rogue network transitions immediately freeze outbound transport layer.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          {/* Panel de Telemetría */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Integrity Card */}
              <div className="bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:ring-white/20 transition-all duration-300 flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex-1 flex flex-col">
                  <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4">Integridad del Ledger</h2>
                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-4xl font-black text-white leading-none">{latestIntegrity}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${latestIntegrity > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {latestIntegrity > 0 ? 'ALERTA CRÍTICA' : 'ESTABLE'}
                    </span>
                  </div>
                  <div className="h-56 w-full mt-auto -mx-2">
                    {integrityData.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-pulse flex space-x-4 w-full h-full p-4">
                          <div className="flex-1 bg-white/5 rounded-xl"></div>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={integrityData}>
                          <defs>
                            <linearGradient id="colorIntegrity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="x" hide />
                          <YAxis hide domain={[0, 'dataMax + 2']} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                          <Area type="stepAfter" dataKey="y" stroke="#ef4444" fillOpacity={1} fill="url(#colorIntegrity)" strokeWidth={3} isAnimationActive={false} style={{ filter: 'drop-shadow(0px 4px 10px rgba(239, 68, 68, 0.4))' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Latency Card */}
              <div className="bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:ring-white/20 transition-all duration-300 flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4">Latencia DPoP</h2>
                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-4xl font-black text-white leading-none">{latestLatency.toFixed(1)}<span className="text-2xl text-slate-500 ml-1">ms</span></span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${latestLatency > 100 ? 'bg-red-500/10 text-red-400 border-red-500/20' : latestLatency > 50 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {latestLatency === 0 ? 'ESPERANDO' : latestLatency > 100 ? 'CRÍTICO' : latestLatency > 50 ? 'LENTO' : 'ÓPTIMO'}
                    </span>
                  </div>
                  <div className="h-56 w-full mt-auto -mx-2">
                    {latencyData.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-pulse flex space-x-4 w-full h-full p-4">
                          <div className="flex-1 bg-white/5 rounded-xl"></div>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={latencyData}>
                          <defs>
                            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="x" hide />
                          <YAxis hide domain={[0, 'dataMax + 10']} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                          <Area type="monotone" dataKey="y" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={3} isAnimationActive={false} style={{ filter: 'drop-shadow(0px 4px 10px rgba(59, 130, 246, 0.4))' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Activity Feed */}
            <div className="bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-800/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Actividad Reciente de Soporte</h2>
                  <a href="/console" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">Ver Consola Completa &rarr;</a>
                </div>
                
                <div className="space-y-3">
                  {recentLogs.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4 italic border border-white/5 rounded-xl border-dashed">Esperando eventos telemétricos...</div>
                  ) : (
                    [...recentLogs].reverse().slice(0, 4).map((log, idx) => (
                      <div key={idx} className="bg-black/30 border border-white/5 p-3.5 rounded-xl flex items-center justify-between group hover:bg-black/50 hover:border-white/10 transition-colors cursor-default">
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${
                            log.level === 'FATAL' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            log.level === 'ERROR' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}>
                            {log.level}
                          </span>
                          <span className="text-xs text-slate-300 font-medium tracking-wide truncate max-w-[280px]" title={log.msg}>{log.msg}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">{log.time}</span>
                      </div>
                    ))
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

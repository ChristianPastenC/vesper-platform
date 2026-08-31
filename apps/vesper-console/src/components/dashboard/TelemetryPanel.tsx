import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { MetricPoint, LogDetails, getLogDetails, formatTime } from '../../utils/telemetry';

export const TelemetryPanel: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [integrityData, setIntegrityData] = useState<MetricPoint[]>([]);
  const [latencyData, setLatencyData] = useState<MetricPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogDetails[]>([]);

  useEffect(() => {
    const t = localStorage.getItem('sovereign_session_token');
    if (!t) {
      setToken('demo_token');
    } else {
      setToken(t);
    }
  }, []);

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
        const date = formatTime(m.timestamp);
        const details = getLogDetails(m.metric_type, m.value);

        if (m.metric_type === 2) {
          newIntegrityData.push({ x: date, y: m.value });
        } else if (m.metric_type === 3) {
          newLatencyData.push({ x: date, y: m.value });
        }

        newLogs.push({ ...details, time: date });
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
      const date = formatTime(new Date());
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
        const details = getLogDetails(isBreach ? 2 : 3, isBreach ? 1 : latency);
        const l = [...prev, { ...details, time: date }];
        return l.length > 10 ? l.slice(l.length - 10) : l;
      });
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMetrics(); // Initial fetch
      const interval = setInterval(fetchMetrics, 2000); // Poll every 2s
      return () => clearInterval(interval);
    }
  }, [token, fetchMetrics]);

  if (!token) return null;

  const latestIntegrity = integrityData.length > 0 ? integrityData[integrityData.length - 1].y : 0;
  const latestLatency = latencyData.length > 0 ? latencyData[latencyData.length - 1].y : 0;

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
    <>
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
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
      <div className="mt-6 bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
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
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${log.level === 'FATAL' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
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
    </>
  );
};

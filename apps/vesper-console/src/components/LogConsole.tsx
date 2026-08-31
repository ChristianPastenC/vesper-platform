import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RiSearchLine, RiPauseCircleLine, RiPlayCircleLine, RiCloseLine, RiTerminalBoxLine, RiAlertLine } from '@remixicon/react';

interface Metric {
  id: string;
  metric_type: number;
  value: number;
  timestamp: string;
}

interface LogDetails {
  level: string;
  source: string;
  msg: string;
  valHex: string;
  hasTrace: boolean;
}

const getLogDetails = (m: Metric): LogDetails => {
  switch(m.metric_type) {
    case 1: 
      return { level: 'FATAL', source: 'CPP_CORE', msg: 'ZEROIZATION_TRIGGERED: RAM wiped to protect crypto material.', valHex: `0x${Math.floor(m.value).toString(16).toUpperCase()}`, hasTrace: true };
    case 2:
      return { level: 'ERROR', source: 'TS_WRAPPER', msg: `INTEGRITY_COMPROMISED: Ledger hash mismatch detected. Offset: ${m.value}`, valHex: '0x0002A3F', hasTrace: true };
    case 3:
      return { level: 'INFO', source: 'CPP_CORE', msg: `COMPUTE_HASH_LATENCY: DPoP token computed successfully.`, valHex: `${m.value.toFixed(2)}ms`, hasTrace: false };
    default:
      return { level: 'DEBUG', source: 'UNKNOWN', msg: `Generic Telemetry Event [Type: ${m.metric_type}]`, valHex: String(m.value), hasTrace: false };
  }
};

export const LogConsole: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<Metric[]>([]);
  const [search, setSearch] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [selectedLog, setSelectedLog] = useState<Metric | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('sovereign_session_token');
    if (!t) {
      localStorage.setItem('sovereign_session_token', 'demo_token');
      localStorage.setItem('sovereign_tenant_name', 'Demo Corp (Offline Mode)');
      setToken('demo_token');
    } else {
      setToken(t);
    }
  }, []);

  const pollMetrics = useCallback(async () => {
    if (!token || !isLive) return;
    try {
      const res = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8081'}/api/v1/b2b/metrics`, {
        headers: { 'Authorization': token }
      });
      if (!res.ok) throw new Error('API Error');
      const metrics: Metric[] = await res.json();
      
      metrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setLogs((prevLogs) => {
        const newLogs = [...prevLogs];
        metrics.forEach((m) => {
          if (!newLogs.find(l => l.id === m.id)) {
            newLogs.push(m);
          }
        });
        if (newLogs.length > 200) return newLogs.slice(newLogs.length - 200);
        return newLogs;
      });
    } catch (err) {
      // Offline Mock Generator
      setLogs((prevLogs) => {
        const r = Math.random();
        let type = 3;
        if (r > 0.95) type = 1;
        else if (r > 0.85) type = 2;
        
        const mockLog: Metric = {
          id: 'mock-' + Math.random().toString(36).substring(7),
          metric_type: type,
          value: type === 3 ? 15 + Math.random() * 50 : Math.random(),
          timestamp: new Date().toISOString()
        };
        
        const newLogs = [...prevLogs, mockLog];
        if (newLogs.length > 100) return newLogs.slice(newLogs.length - 100);
        return newLogs;
      });
    }
  }, [token, isLive]);

  useEffect(() => {
    if (token && isLive) {
      const interval = setInterval(pollMetrics, 1500); // Polling faster in demo mode
      return () => clearInterval(interval);
    }
  }, [token, isLive, pollMetrics]);

  const filteredLogs = useMemo(() => {
    if (!search) return logs;
    const lowerSearch = search.toLowerCase();
    return logs.filter((log) => {
      const details = getLogDetails(log);
      return log.id.toLowerCase().includes(lowerSearch) || 
             details.msg.toLowerCase().includes(lowerSearch) || 
             details.level.toLowerCase().includes(lowerSearch) ||
             details.source.toLowerCase().includes(lowerSearch);
    });
  }, [logs, search]);

  if (!token) return null;

  return (
    <div className="flex flex-1 min-h-0 w-full h-full relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
      
      {/* MAIN CONSOLE */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 bg-transparent backdrop-blur-sm z-10">
        {/* TOOLBAR */}
        <div className="h-14 border-b border-white/5 bg-slate-900/30 flex items-center px-6 gap-4 shrink-0 backdrop-blur-md">
          <div className="flex items-center flex-1 bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all shadow-inner">
            <RiSearchLine size={16} className="text-slate-500 mr-2" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by event type, ID or message..." 
              className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full" 
            />
          </div>
          
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 shadow-lg ${
              isLive 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:shadow-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:shadow-emerald-500/20'
            }`}
          >
            {isLive ? (
              <><RiPauseCircleLine size={16} /> PAUSE STREAM</>
            ) : (
              <><RiPlayCircleLine size={16} /> RESUME STREAM</>
            )}
          </button>
        </div>

        {/* LOG VIEWER */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed" id="log-container">
          {logs.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-600">
               <div className="relative">
                 <RiTerminalBoxLine size={48} className="mb-4 opacity-20 relative z-10" />
                 <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
               </div>
               <p className="animate-pulse font-sans tracking-wide">Connecting to Vesper telemetry stream...</p>
             </div>
          ) : filteredLogs.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-600 font-sans">
               <p>No logs match the filter.</p>
             </div>
          ) : (
            <div className="space-y-1">
            {filteredLogs.map((m) => {
              const details = getLogDetails(m);
              const date = new Date(m.timestamp);
              const timeStr = date.toISOString().split('T')[1].replace('Z', '');
              const isError = details.level === 'FATAL' || details.level === 'ERROR';
              const isWarn = details.level === 'WARN';
              const isSelected = selectedLog?.id === m.id;

              return (
                <div 
                  key={m.id}
                  onClick={() => setSelectedLog(m)}
                  className={`log-row cursor-pointer py-1.5 px-3 rounded-lg flex gap-4 transition-all duration-200 border border-transparent ${
                    isSelected ? 'bg-white/10 shadow-lg border-white/10 scale-[1.01] z-10' : 'hover:bg-white/5'
                  } ${
                    isError ? 'text-red-300 hover:text-red-200' : 
                    isWarn ? 'text-amber-300 hover:text-amber-200' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 shrink-0 w-24 opacity-80">{timeStr}</span>
                  <span className={`shrink-0 w-16 font-extrabold tracking-wider ${
                    isError ? 'text-red-500' : 
                    isWarn ? 'text-amber-500' : 'text-blue-400'
                  }`}>{details.level}</span>
                  <span className="text-slate-500 shrink-0 w-24 opacity-80">[{details.source}]</span>
                  <span className="truncate">{details.msg}</span>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {/* SIDE PANEL (INSPECTOR) */}
      {selectedLog && (() => {
        const details = getLogDetails(selectedLog);
        const date = new Date(selectedLog.timestamp);
        const timeStr = date.toISOString().split('T')[1].replace('Z', '');
        
        return (
          <aside className="w-96 bg-slate-900/60 backdrop-blur-2xl flex flex-col shrink-0 animate-in slide-in-from-right-10 duration-300 border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-20 relative">
            <div className="absolute top-0 right-0 w-full h-[300px] bg-blue-500/5 blur-[80px] pointer-events-none rounded-bl-full"></div>
            
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-transparent relative z-10">
              <h2 className="font-bold text-slate-100 flex items-center gap-2 text-sm tracking-wide">
                <RiTerminalBoxLine size={18} className="text-blue-400" />
                Inspector de Trazas
              </h2>
              <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-white hover:bg-white/10 p-1 rounded transition-colors">
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 relative z-10">
              <div className="space-y-8">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-400"></span> Metadata del Evento
                  </h3>
                  <div className="bg-black/30 rounded-xl border border-white/5 p-4 text-sm space-y-3 font-mono shadow-inner">
                    <div className="flex justify-between items-center"><span className="text-slate-500">Event ID:</span> <span className="text-slate-300 truncate w-32 bg-white/5 px-2 py-0.5 rounded text-right" title={selectedLog.id}>{selectedLog.id.split('-')[0]}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">Timestamp:</span> <span className="text-slate-300 bg-white/5 px-2 py-0.5 rounded">{timeStr}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">Event Code:</span> <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">0x00{selectedLog.metric_type}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">Component:</span> <span className="bg-white/5 px-2 py-0.5 rounded text-slate-300">{details.source}</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-3 mt-3 items-center">
                      <span className="text-slate-400 font-semibold">Raw Value:</span> 
                      <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-bold border border-blue-500/20">{details.valHex}</span>
                    </div>
                  </div>
                </div>
                
                {details.hasTrace && (
                  <div className="mt-6">
                    <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3 flex items-center gap-2">
                      <RiAlertLine size={16} className="text-red-500" /> 
                      Exception Trace
                    </h3>
                    <div className="bg-red-950/30 border border-red-500/20 p-4 rounded-xl font-mono text-xs text-red-300 overflow-x-auto whitespace-pre shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                      <span className="text-red-400 font-bold">Exception in sovereign::secure::VolatileQueue::verifyIntegrity()</span>
<br/><span className="text-slate-500">  at MemoryArena.cpp:142</span>
<br/><span className="text-slate-500">  at SovereignLedger.cpp:89</span>
<br/><br/><span className="text-red-500 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">[SIGABRT] Execution halted. Integrity rules violated.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        );
      })()}
    </div>
  );
};

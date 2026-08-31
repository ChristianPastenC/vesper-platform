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
      window.location.href = '/login';
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
      if (!res.ok) return;
      const metrics: Metric[] = await res.json();
      
      metrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setLogs((prevLogs) => {
        const newLogs = [...prevLogs];
        const seen = new Set(prevLogs.map(l => l.id));
        let added = false;
        metrics.forEach((m) => {
          if (!seen.has(m.id)) {
            newLogs.push(m);
            added = true;
          }
        });
        if (added) {
          // Sort descending for display
          newLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          return newLogs.slice(0, 500); // Keep last 500
        }
        return prevLogs;
      });
    } catch (e) {
      console.error(e);
    }
  }, [token, isLive]);

  useEffect(() => {
    if (token && isLive) {
      pollMetrics();
      const interval = setInterval(pollMetrics, 2000);
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
    <div className="flex flex-1 min-h-0 w-full h-full">
      {/* MAIN CONSOLE */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 bg-[#0d1117]">
        {/* TOOLBAR */}
        <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 gap-4 shrink-0">
          <div className="flex items-center flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 focus-within:border-emerald-500/50 transition-colors">
            <RiSearchLine size={16} className="text-slate-500 mr-2" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by event type, ID or message..." 
              className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-600 w-full" 
            />
          </div>
          
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
              isLive 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            {isLive ? (
              <><RiPauseCircleLine size={16} /> Pause Stream</>
            ) : (
              <><RiPlayCircleLine size={16} /> Resume Stream</>
            )}
          </button>
        </div>

        {/* LOG VIEWER */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed" id="log-container">
          {logs.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-600">
               <RiTerminalBoxLine size={48} className="mb-3 opacity-20" />
               <p className="animate-pulse">Connecting to Vesper telemetry stream...</p>
             </div>
          ) : filteredLogs.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-600">
               <p>No logs match the filter.</p>
             </div>
          ) : (
            filteredLogs.map((m) => {
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
                  className={`log-row cursor-pointer py-1 px-2 rounded -mx-2 flex gap-4 border-l-2 transition-colors ${
                    isSelected ? 'bg-slate-800/80' : 'hover:bg-slate-800/50'
                  } ${
                    isError ? 'border-red-500 text-red-300' : 
                    isWarn ? 'border-amber-500 text-amber-300' : 'border-transparent text-slate-400'
                  }`}
                >
                  <span className="text-slate-600 shrink-0 w-24">{timeStr}</span>
                  <span className={`shrink-0 w-16 font-bold ${
                    isError ? 'text-red-500' : 
                    isWarn ? 'text-amber-500' : 'text-blue-400'
                  }`}>{details.level}</span>
                  <span className="text-slate-500 shrink-0 w-24">[{details.source}]</span>
                  <span className="truncate">{details.msg}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SIDE PANEL (INSPECTOR) */}
      {selectedLog && (() => {
        const details = getLogDetails(selectedLog);
        const date = new Date(selectedLog.timestamp);
        const timeStr = date.toISOString().split('T')[1].replace('Z', '');
        
        return (
          <aside className="w-96 bg-slate-900 flex flex-col shrink-0 animate-in slide-in-from-right-10 duration-200">
            <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 bg-slate-800/50">
              <h2 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                <RiTerminalBoxLine size={16} className="text-blue-400" />
                Inspector de Trazas
              </h2>
              <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-white transition-colors">
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Metadata del Evento</h3>
                  <div className="bg-slate-950 rounded border border-slate-800 p-3 text-sm space-y-2 font-mono">
                    <div className="flex justify-between"><span className="text-slate-500">Event ID:</span> <span className="text-slate-300 truncate w-32" title={selectedLog.id}>{selectedLog.id.split('-')[0]}...</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Timestamp:</span> <span className="text-slate-300">{timeStr}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Event Code:</span> <span className="text-emerald-400">0x00{selectedLog.metric_type}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Component:</span> <span>{details.source}</span></div>
                    <div className="flex justify-between border-t border-slate-800 pt-2 mt-2">
                      <span className="text-slate-500">Raw Value:</span> 
                      <span className="text-blue-400">{details.valHex}</span>
                    </div>
                  </div>
                </div>
                
                {details.hasTrace && (
                  <div className="mt-6">
                    <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1">
                      <RiAlertLine size={16} className="text-red-500" /> 
                      Exception Trace (C++ Nitro)
                    </h3>
                    <div className="bg-red-950/20 border border-red-900/50 p-3 rounded font-mono text-xs text-red-300 overflow-x-auto whitespace-pre">
                      Exception in sovereign::secure::VolatileQueue::verifyIntegrity()
  at MemoryArena.cpp:142
  at SovereignLedger.cpp:89
[SIGABRT] Execution halted. Integrity rules violated.
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

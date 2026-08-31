import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RiSearchLine, RiPauseCircleLine, RiPlayCircleLine, RiCloseLine, RiTerminalBoxLine, RiAlertLine } from '@remixicon/react';
import { LogInspector } from './console/LogInspector';
import { useTranslation } from 'react-i18next';
import '../i18n/config';
import { Metric, getLogDetails, formatTime } from '../utils/telemetry';

export const LogConsole: React.FC = () => {
  const { t } = useTranslation();
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
      const details = getLogDetails(log.metric_type, log.value);
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
              placeholder={t("console.search")}
              className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
            />
          </div>

          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 shadow-lg ${isLive
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:shadow-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:shadow-emerald-500/20'
              }`}
          >
            {isLive ? (
              <><RiPauseCircleLine size={16} />{t("console.pause")}</>
            ) : (
              <><RiPlayCircleLine size={16} />{t("console.resume")}</>
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
              <p className="animate-pulse font-sans tracking-wide">{t("console.connecting")}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 font-sans">
              <p>{t("console.no_logs")}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((m) => {
                const details = getLogDetails(m.metric_type, m.value);
                const timeStr = formatTime(m.timestamp);
                const isError = details.level === 'FATAL' || details.level === 'ERROR';
                const isWarn = details.level === 'WARN';
                const isSelected = selectedLog?.id === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedLog(m)}
                    className={`log-row cursor-pointer py-1.5 px-3 rounded-lg flex gap-4 transition-all duration-200 border border-transparent ${isSelected ? 'bg-white/10 shadow-lg border-white/10 scale-[1.01] z-10' : 'hover:bg-white/5'
                      } ${isError ? 'text-red-300 hover:text-red-200' :
                        isWarn ? 'text-amber-300 hover:text-amber-200' : 'text-slate-400 hover:text-slate-300'
                      }`}
                  >
                    <span className="text-slate-500 shrink-0 w-24 opacity-80">{timeStr}</span>
                    <span className={`shrink-0 w-16 font-extrabold tracking-wider ${isError ? 'text-red-500' :
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
      {selectedLog && (
        <LogInspector selectedLog={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
};

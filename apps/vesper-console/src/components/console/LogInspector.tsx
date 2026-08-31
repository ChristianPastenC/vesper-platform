import React from 'react';
import { RiTerminalBoxLine, RiCloseLine, RiAlertLine } from '@remixicon/react';
import { Metric, getLogDetails, formatTime } from '../../utils/telemetry';

interface LogInspectorProps {
  selectedLog: Metric;
  onClose: () => void;
}

export const LogInspector: React.FC<LogInspectorProps> = ({ selectedLog, onClose }) => {
  const details = getLogDetails(selectedLog.metric_type, selectedLog.value);
  const timeStr = formatTime(selectedLog.timestamp);

  return (
    <aside className="absolute inset-0 z-50 md:relative md:w-96 bg-slate-950/95 md:bg-slate-900/60 backdrop-blur-2xl flex flex-col shrink-0 animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 duration-300 border-l-0 md:border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
      <div className="absolute top-0 right-0 w-full h-[300px] bg-blue-500/5 blur-[80px] pointer-events-none rounded-bl-full"></div>

      <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-transparent relative z-10">
        <h2 className="font-bold text-slate-100 flex items-center gap-2 text-sm tracking-wide">
          <RiTerminalBoxLine size={18} className="text-blue-400" />
          Inspector de Trazas
        </h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white hover:bg-white/10 p-1 rounded transition-colors">
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
                <br /><span className="text-slate-500">  at MemoryArena.cpp:142</span>
                <br /><span className="text-slate-500">  at SovereignLedger.cpp:89</span>
                <br /><br /><span className="text-red-500 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">[SIGABRT] Execution halted. Integrity rules violated.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

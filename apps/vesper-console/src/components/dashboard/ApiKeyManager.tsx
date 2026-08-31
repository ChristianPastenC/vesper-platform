import React, { useState, useEffect, useCallback } from 'react';
import { RiKey2Line, RiFileCopyLine, RiDeleteBinLine } from '@remixicon/react';
import { ConfirmModal } from '../ConfirmModal';

interface Key {
  key: string;
  name: string;
  bundle_id: string;
  created_at: string;
}

export const ApiKeyManager: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('sovereign_session_token');
    if (!t) {
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
      setRevokeModalOpen(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!token) return null;

  return (
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

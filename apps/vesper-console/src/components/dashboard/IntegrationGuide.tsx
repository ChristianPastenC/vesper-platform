import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n/config';
import { RiTerminalBoxLine, RiFileCopyLine, RiCheckLine, RiCodeBoxLine, RiInformationLine } from '@remixicon/react';

export const IntegrationGuide: React.FC = () => {
  const { t } = useTranslation();
  const [copiedStep1, setCopiedStep1] = useState(false);
  const [copiedStep2, setCopiedStep2] = useState(false);

  const step1Code = `yarn add @vesper-core/ghost-ledger react-native-nitro-modules react-native-quick-crypto`;
  
  const step2Code = `import { SovereignClientCore, FetchAdapter } from '@vesper-core/ghost-ledger';
import QuickCrypto from 'react-native-quick-crypto';
import NetInfo from '@react-native-community/netinfo';

export const ghostClient = SovereignClientCore.getInstance({
  cryptoProvider: {
    getRandomBytes: (n) => QuickCrypto.randomBytes(n),
    sha256: async (d) => new Uint8Array(QuickCrypto.createHash('sha256').update(d).digest())
  },
  networkResolver: async () => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  },
  networkAdapter: new FetchAdapter(),
  // Enable Telemetry (Optional)
  telemetry: {
    apiKey: 'YOUR_API_KEY',
    bundleId: 'com.your.app',
    endpoint: 'https://api.vesper.local/v1/support/telemetry'
  }
});`;

  const handleCopy = (text: string, setCopied: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const step2Highlighted = (
    <pre className="text-[11px] font-mono whitespace-pre text-slate-300 m-0 p-0">
      <span className="text-purple-400">import</span> {'{'} SovereignClientCore, FetchAdapter {'}'} <span className="text-purple-400">from</span> <span className="text-emerald-300">'@vesper-core/ghost-ledger'</span>;{'\n'}
      <span className="text-purple-400">import</span> QuickCrypto <span className="text-purple-400">from</span> <span className="text-emerald-300">'react-native-quick-crypto'</span>;{'\n'}
      <span className="text-purple-400">import</span> NetInfo <span className="text-purple-400">from</span> <span className="text-emerald-300">'@react-native-community/netinfo'</span>;{'\n\n'}
      <span className="text-purple-400">export const</span> ghostClient = SovereignClientCore.<span className="text-blue-300">getInstance</span>({'{'}{'\n'}
      {'  '}<span className="text-slate-400">cryptoProvider</span>: {'{'}{'\n'}
      {'    '}<span className="text-blue-300">getRandomBytes</span>: (n) <span className="text-blue-400">{'=>'}</span> QuickCrypto.<span className="text-blue-300">randomBytes</span>(n),{'\n'}
      {'    '}<span className="text-blue-300">sha256</span>: <span className="text-purple-400">async</span> (d) <span className="text-blue-400">{'=>'}</span> <span className="text-purple-400">new</span> <span className="text-orange-300">Uint8Array</span>(QuickCrypto.<span className="text-blue-300">createHash</span>(<span className="text-emerald-300">'sha256'</span>).<span className="text-blue-300">update</span>(d).<span className="text-blue-300">digest</span>()){'\n'}
      {'  }'},{'\n'}
      {'  '}<span className="text-blue-300">networkResolver</span>: <span className="text-purple-400">async</span> () <span className="text-blue-400">{'=>'}</span> {'{'}{'\n'}
      {'    '}<span className="text-purple-400">const</span> state = <span className="text-purple-400">await</span> NetInfo.<span className="text-blue-300">fetch</span>();{'\n'}
      {'    '}<span className="text-purple-400">return</span> state.isConnected ?? <span className="text-orange-300">false</span>;{'\n'}
      {'  }'},{'\n'}
      {'  '}<span className="text-slate-400">networkAdapter</span>: <span className="text-purple-400">new</span> <span className="text-blue-300">FetchAdapter</span>(),{'\n'}
      {'  '}<span className="text-slate-500">// Enable Telemetry (Optional)</span>{'\n'}
      {'  '}<span className="text-slate-400">telemetry</span>: {'{'}{'\n'}
      {'    '}<span className="text-slate-400">apiKey</span>: <span className="text-emerald-300">'YOUR_API_KEY'</span>,{'\n'}
      {'    '}<span className="text-slate-400">bundleId</span>: <span className="text-emerald-300">'com.your.app'</span>,{'\n'}
      {'    '}<span className="text-slate-400">endpoint</span>: <span className="text-emerald-300">'https://api.vesper.local/v1/support/telemetry'</span>{'\n'}
      {'  }'}{'\n'}
      {'});'}
    </pre>
  );

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:ring-white/20 transition-all duration-300 mt-8">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative z-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RiCodeBoxLine className="text-blue-400" />
            {t('dashboard.integration.title')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('dashboard.integration.desc1')}
            <strong>{t('dashboard.integration.desc_bold')}</strong>
            {t('dashboard.integration.desc2')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Step 1 */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30">1</div>
              <h3 className="text-sm font-semibold text-white">{t('dashboard.integration.step1')}</h3>
            </div>
            
            <div className="bg-[#0d1117] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative group/code ring-1 ring-white/5 transition-all hover:ring-white/10 flex-1 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <RiTerminalBoxLine size={14} />
                    <span className="text-[10px] font-mono uppercase tracking-wider">{t('dashboard.integration.terminal')}</span>
                  </div>
                  <button 
                    onClick={() => handleCopy(step1Code, setCopiedStep1)}
                    className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-md transition-colors"
                  >
                    {copiedStep1 ? <RiCheckLine size={16} className="text-emerald-400" /> : <RiFileCopyLine size={16} />}
                  </button>
              </div>
              <div className="p-4 overflow-x-auto custom-scrollbar flex-1">
                <code className="text-[11px] font-mono block whitespace-pre">
                    <span className="text-emerald-400">yarn add</span> <span className="text-slate-300">@vesper-core/ghost-ledger react-native-nitro-modules react-native-quick-crypto</span>
                </code>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30">2</div>
              <h3 className="text-sm font-semibold text-white">{t('dashboard.integration.step2')}</h3>
            </div>
            
            <div className="bg-[#0d1117] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative group/code ring-1 ring-white/5 transition-all hover:ring-white/10 flex-1 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <RiCodeBoxLine size={14} />
                    <span className="text-[10px] font-mono uppercase tracking-wider">{t('dashboard.integration.code')}</span>
                  </div>
                  <button 
                    onClick={() => handleCopy(step2Code, setCopiedStep2)}
                    className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-md transition-colors"
                  >
                    {copiedStep2 ? <RiCheckLine size={16} className="text-emerald-400" /> : <RiFileCopyLine size={16} />}
                  </button>
              </div>
              <div className="p-4 overflow-x-auto custom-scrollbar flex-1">
                {step2Highlighted}
              </div>
            </div>
          </div>
        </div>

        {/* Info callout */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
          <RiInformationLine className="text-blue-400 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-semibold text-blue-300">{t('dashboard.integration.testing_title')}</h4>
            <p className="text-xs text-blue-400/80 mt-1">
              {t('dashboard.integration.testing_desc1')}
              <code className="bg-blue-900/40 px-1 rounded text-blue-300">{t('dashboard.integration.testing_code1')}</code>
              {t('dashboard.integration.testing_desc2')}
              <code className="bg-blue-900/40 px-1 rounded text-blue-300">{t('dashboard.integration.testing_code2')}</code>
              {t('dashboard.integration.testing_desc3')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { X, CheckCircle, AlertCircle, ExternalLink, Key, Cpu, Sparkles } from 'lucide-react';
import { ClientConfig } from '../types.js';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ClientConfig | null;
}

export const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, config }) => {
  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                AI Provider Credentials & Setup
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure live cloud video generation models or explore the built-in engine.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-6 pt-5 pr-1">
          
          {/* Active Mode Notice */}
          <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
            config.demoMode
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}>
            {config.demoMode ? (
              <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-semibold text-sm text-white">
                {config.demoMode ? 'Demo Mode Active (Animagic Turbo Engine)' : 'Live AI Cloud Credentials Detected'}
              </p>
              <p className="text-slate-300 leading-relaxed">
                {config.setupInstructions.message}
              </p>
            </div>
          </div>

          {/* Provider List & Status */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Supported Cloud Models & Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.models.map((model) => (
                <div
                  key={model.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-200">{model.name}</span>
                      {model.isConfigured ? (
                        <span className="flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" /> Ready
                        </span>
                      ) : (
                        <span className="flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <AlertCircle className="w-3 h-3 mr-1" /> Key Needed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{model.description}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-mono">Max clip: {model.maxClipDuration}s</span>
                    {model.requiresKeyName && (
                      <span className="text-purple-400 font-mono">{model.requiresKeyName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <span>Quick Setup Guide (.env)</span>
            </h4>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Open the server environment file at <code className="text-purple-400 font-mono bg-purple-950/40 px-1 py-0.5 rounded">server/.env</code>.
              </li>
              <li>
                Paste your API keys from your provider dashboards:
                <pre className="mt-2 p-3 rounded-lg bg-black/60 font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
RUNWAY_API_SECRET=your_runway_api_secret_here&#10;LUMA_API_KEY=your_luma_api_key_here&#10;KLING_API_KEY=your_kling_api_key_here&#10;MINIMAX_API_KEY=your_minimax_api_key_here&#10;OPENAI_API_KEY=your_openai_api_key_here&#10;REPLICATE_API_TOKEN=your_replicate_token_here
                </pre>
              </li>
              <li>
                Restart the backend service. The application will immediately switch to live generation for the configured models.
              </li>
            </ol>
          </div>

          {/* Provider Documentation Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Official Provider Dashboards & Docs
            </h4>
            <div className="flex flex-wrap gap-2">
              {config.setupInstructions.envVars.map(v => (
                <a
                  key={v.name}
                  href={v.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-purple-500/50 transition-all"
                >
                  <span>{v.provider}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-purple-600/30"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};

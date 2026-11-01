import React from 'react';
import { Sparkles, Sliders, LogIn, LogOut, User as UserIcon, ShieldAlert, Cpu } from 'lucide-react';
import { User } from '../types.js';

interface HeaderProps {
  user: User | null;
  demoMode: boolean;
  onOpenAuth: () => void;
  onOpenSetup: () => void;
  onLogout: () => void;
  activeTab: 'generate' | 'history';
  setActiveTab: (tab: 'generate' | 'history') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  demoMode,
  onOpenAuth,
  onOpenSetup,
  onLogout,
  activeTab,
  setActiveTab
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('generate')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
                ANIMAGIC<span className="text-purple-500 ml-1 text-sm font-black px-1.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30">AI</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase hidden sm:block">
              Multi-Scene AI Video Synthesis & FFmpeg Concatenation
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'generate'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Video Vault
          </button>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Demo Mode / AI Credentials Pill */}
          <button
            onClick={onOpenSetup}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              demoMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title="Click to view and configure live cloud AI provider credentials"
          >
            {demoMode ? (
              <>
                <Cpu className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden md:inline">Demo Mode: Procedural Engine</span>
                <span className="md:hidden">Demo</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Cloud AI Active</span>
                <span className="md:hidden">Live</span>
              </>
            )}
            <Sliders className="w-3 h-3 ml-1 opacity-70" />
          </button>

          {/* User Account / Auth */}
          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{user.name}</span>
                <span className="text-[10px] text-purple-400 font-mono capitalize">{user.role}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-purple-600/30 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

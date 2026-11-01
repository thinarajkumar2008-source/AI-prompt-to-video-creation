import React, { useState } from 'react';
import { X, Sparkles, User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { User as UserType } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await api.login(email, password);
        onSuccess(res.user);
      } else {
        const res = await api.register(name, email, password);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.demoLogin();
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel rounded-2xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-1 ring-white/20 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {tab === 'login' ? 'Welcome Back' : 'Create Creator Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your private generated video vault & custom settings.
          </p>
        </div>

        {/* Fast Demo Guest Button */}
        <button
          type="button"
          onClick={handleDemoGuestLogin}
          disabled={loading}
          className="w-full mb-5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 border border-purple-500/40 text-purple-200 text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm"
        >
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Instant Access: Continue as Demo Guest</span>
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Or with credentials</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-900 p-1 mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'login' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'register' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 mt-2"
          >
            <span>{loading ? 'Processing...' : tab === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    const user = authService.getCurrentUser();
    if (user) {
      navigate('/');
    }
  }, [navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await authService.login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'Incorrect credentials or backend offline'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail: string, rolePass: string) => {
    setError(null);
    setLoading(true);
    try {
      await authService.login(roleEmail, rolePass);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Failed to login. Ensure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Visual background details */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Brand/Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 mb-3">
            <Terminal className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            PromptVault
          </h1>
          <p className="text-zinc-500 text-xs text-center mt-1">
            Centralized prompt version control & collaboration
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-indigo-600 text-white font-medium rounded-2xl text-sm flex items-center justify-center gap-2 transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Access Seed Profiles */}
        <div className="mt-8 pt-6 border-t border-zinc-800">
          <span className="block text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
            Prototype Quick Access
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin@promptvault.com', 'AdminPass123!')}
              disabled={loading}
              className="px-2 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold rounded-xl text-zinc-300 transition-all-300 flex flex-col items-center"
            >
              <span>Admin</span>
              <span className="text-[8px] text-zinc-500 font-mono mt-0.5">Shlok</span>
            </button>
            <button
              onClick={() => handleQuickLogin('manager@promptvault.com', 'ManagerPass123!')}
              disabled={loading}
              className="px-2 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold rounded-xl text-zinc-300 transition-all-300 flex flex-col items-center"
            >
              <span>Manager</span>
              <span className="text-[8px] text-zinc-500 font-mono mt-0.5">Rahul</span>
            </button>
            <button
              onClick={() => handleQuickLogin('member@promptvault.com', 'MemberPass123!')}
              disabled={loading}
              className="px-2 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold rounded-xl text-zinc-300 transition-all-300 flex flex-col items-center"
            >
              <span>Member</span>
              <span className="text-[8px] text-zinc-500 font-mono mt-0.5">Alex</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Login;

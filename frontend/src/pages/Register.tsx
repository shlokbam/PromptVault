import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../services/api';
import logo from '../assets/logo.png';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Manager' | 'Member'>('Member');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await authService.register(name, email, role, password);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'Registration failed. Try a different email.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-zinc-100 relative overflow-hidden font-sans">
      {/* Dynamic Background Blur Shapes */}
      <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-primary/20 rounded-full blur-[90px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-[#4f46e5]/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Decorative Top Right Banner */}
      <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

      <div className="w-full max-w-[420px] px-6 py-10 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl relative z-10 flex flex-col gap-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-800 overflow-hidden flex items-center justify-center shadow-lg shadow-primary/10 p-1">
            <img src={logo} alt="PromptVault Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-2">Create Account</h2>
          <p className="text-zinc-500 text-xs text-center">
            Sign up to collaborate and manage prompts on PromptVault
          </p>
        </div>

        {/* Display Status Errors */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-950/40 border border-red-900/30 text-red-400 text-xs rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Display Success Status */}
        {success && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
          
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
              />
            </div>
          </div>

          {/* Role Choice */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Access Role
            </label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 border border-zinc-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setRole('Manager')}
                className={`py-2 rounded-xl text-xs font-semibold transition-all-300 ${
                  role === 'Manager'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Manager/Lead
              </button>
              <button
                type="button"
                onClick={() => setRole('Member')}
                className={`py-2 rounded-xl text-xs font-semibold transition-all-300 ${
                  role === 'Member'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Member
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
              />
            </div>
          </div>

          {/* Register Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-indigo-600 text-white font-medium rounded-2xl text-sm flex items-center justify-center gap-2 transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20 mt-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Redirect to Sign In */}
        <div className="text-center">
          <span className="text-zinc-500 text-xs">Already have an account? </span>
          <button
            onClick={() => navigate('/login')}
            className="text-primary hover:text-indigo-400 font-semibold text-xs transition-all-300"
          >
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
};
export default Register;

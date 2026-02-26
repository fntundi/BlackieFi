import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, TrendingUp, Shield, Zap } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-cyan-600 p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-10 h-10" />
            BlackieFi
          </h1>
          <p className="text-emerald-100 mt-2 text-lg">Personal Finance Management</p>
        </div>
        
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Track Everything</h3>
              <p className="text-emerald-100">Monitor transactions, investments, debts, and goals in one place.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Secure & Private</h3>
              <p className="text-emerald-100">Your financial data is encrypted and never shared.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">AI-Powered Insights</h3>
              <p className="text-emerald-100">Get smart recommendations for budgeting and investments.</p>
            </div>
          </div>
        </div>
        
        <p className="text-emerald-100 text-sm">© 2025 BlackieFi. Built with Go + React.</p>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-emerald-500 flex items-center justify-center gap-3">
              <TrendingUp className="w-8 h-8" />
              BlackieFi
            </h1>
          </div>
          
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-slate-400 mb-6">Sign in to your account</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="Enter your username"
                  required
                  data-testid="login-username-input"
                />
              </div>
              
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-12"
                    placeholder="Enter your password"
                    required
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
                data-testid="login-submit-btn"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <p className="text-center mt-6 text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-emerald-500 hover:text-emerald-400 font-semibold">
                Sign up
              </Link>
            </p>
            
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Demo credentials: <span className="text-slate-400">testuser / user123</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

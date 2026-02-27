import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Crown, Shield, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';

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

  const features = [
    {
      icon: TrendingUp,
      title: 'Wealth Tracking',
      description: 'Monitor your investments and net worth in real-time'
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Enterprise encryption protects your financial data'
    },
    {
      icon: Sparkles,
      title: 'AI Insights',
      description: 'Smart recommendations powered by machine learning'
    }
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#030303' }}>
      {/* Left side - Feature Cards */}
      <div className="hidden lg:flex lg:w-[55%] p-8 flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)'
          }}>
            <Crown className="w-5 h-5 text-black" />
          </div>
          <span className="text-2xl font-semibold tracking-tight" style={{ color: '#F5F5F5' }}>BlackieFi</span>
        </div>

        {/* Feature Cards Grid */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-1 gap-4 max-w-lg w-full">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group p-6 rounded-2xl transition-all duration-500 cursor-default"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.12)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110" style={{
                      background: 'rgba(212, 175, 55, 0.15)',
                      border: '1px solid rgba(212, 175, 55, 0.2)'
                    }}>
                      <Icon className="w-5 h-5" style={{ color: '#D4AF37' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1" style={{ color: '#F5F5F5' }}>{feature.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#737373' }}>{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom tag */}
        <div className="mt-auto pt-8">
          <p className="text-xs tracking-widest uppercase" style={{ color: '#404040' }}>
            Trusted by 10,000+ users worldwide
          </p>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8" style={{
        background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)'
      }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)'
              }}>
                <Crown className="w-5 h-5 text-black" />
              </div>
              <span className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>BlackieFi</span>
            </div>
          </div>
          
          {/* Form Card */}
          <div className="rounded-2xl p-8" style={{
            background: '#0F0F0F',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2" style={{ color: '#F5F5F5' }}>Welcome back</h2>
              <p style={{ color: '#737373' }}>Sign in to continue to your account</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#737373' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full py-3.5 px-4 rounded-xl transition-all duration-300 focus:outline-none"
                  style={{
                    background: '#0A0A0A',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#F5F5F5'
                  }}
                  placeholder="Enter username"
                  required
                  data-testid="login-username-input"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#737373' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-3.5 px-4 pr-12 rounded-xl transition-all duration-300 focus:outline-none"
                    style={{
                      background: '#0A0A0A',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F5F5F5'
                    }}
                    placeholder="Enter password"
                    required
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                    style={{ color: '#525252' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 group"
                style={{
                  background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                  color: '#000000'
                }}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <p className="text-center" style={{ color: '#737373' }}>
                Don't have an account?{' '}
                <Link to="/register" className="font-medium transition-colors hover:opacity-80" style={{ color: '#D4AF37' }}>
                  Create one
                </Link>
              </p>
            </div>
          </div>
          
          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl text-center" style={{
            background: 'rgba(212, 175, 55, 0.05)',
            border: '1px solid rgba(212, 175, 55, 0.1)'
          }}>
            <p className="text-xs" style={{ color: '#525252' }}>
              Demo: <span style={{ color: '#A3A3A3' }}>demo / demo12345</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

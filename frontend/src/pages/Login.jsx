import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Crown, Shield, Sparkles, TrendingUp } from 'lucide-react';

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
    <div className="min-h-screen flex" style={{ background: '#050505' }}>
      {/* Left side - Luxury Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%)'
        }}></div>
        
        {/* Gold accent lines */}
        <div className="absolute top-0 left-0 w-full h-1" style={{
          background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)'
        }}></div>
        <div className="absolute bottom-0 left-0 w-full h-1" style={{
          background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)'
        }}></div>
        
        {/* Decorative gold circles */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-10" style={{
          background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)'
        }}></div>
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full opacity-10" style={{
          background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)'
        }}></div>
        
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)',
                boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
              }}>
                <Crown className="w-7 h-7 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-display font-bold" style={{
                  background: 'linear-gradient(135deg, #F9F1D8 0%, #D4AF37 50%, #F9F1D8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>BlackieFi</h1>
                <p className="text-xs tracking-widest uppercase" style={{ color: '#6E6E6E' }}>Premium Finance</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-10">
            <div className="flex items-start gap-5">
              <div className="p-4 rounded-xl" style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }}>
                <TrendingUp className="w-6 h-6" style={{ color: '#D4AF37' }} />
              </div>
              <div>
                <h3 className="font-semibold text-lg" style={{ color: '#F5F5F5' }}>Wealth Management</h3>
                <p style={{ color: '#6E6E6E' }}>Track investments, assets, and transactions with precision.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-5">
              <div className="p-4 rounded-xl" style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }}>
                <Shield className="w-6 h-6" style={{ color: '#D4AF37' }} />
              </div>
              <div>
                <h3 className="font-semibold text-lg" style={{ color: '#F5F5F5' }}>Bank-Level Security</h3>
                <p style={{ color: '#6E6E6E' }}>Your financial data is encrypted and completely private.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-5">
              <div className="p-4 rounded-xl" style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }}>
                <Sparkles className="w-6 h-6" style={{ color: '#D4AF37' }} />
              </div>
              <div>
                <h3 className="font-semibold text-lg" style={{ color: '#F5F5F5' }}>AI-Powered Insights</h3>
                <p style={{ color: '#6E6E6E' }}>Intelligent recommendations powered by OpenRouter.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3))' }}></div>
            <p className="text-xs tracking-widest" style={{ color: '#525252' }}>PREMIUM FINANCE MANAGEMENT</p>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), transparent)' }}></div>
          </div>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)'
              }}>
                <Crown className="w-6 h-6 text-black" />
              </div>
              <span className="text-3xl font-display font-bold" style={{
                background: 'linear-gradient(135deg, #F9F1D8 0%, #D4AF37 50%, #F9F1D8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>BlackieFi</span>
            </div>
          </div>
          
          <div className="rounded-2xl p-8" style={{
            background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Gold accent line */}
            <div className="h-0.5 w-20 mx-auto mb-8 rounded-full" style={{
              background: 'linear-gradient(90deg, #997B19, #D4AF37, #F9F1D8, #D4AF37, #997B19)'
            }}></div>
            
            <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: '#F5F5F5' }}>Welcome Back</h2>
            <p className="text-center mb-8" style={{ color: '#6E6E6E' }}>Sign in to your account</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none"
                  style={{
                    background: 'rgba(10, 10, 10, 0.8)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    color: '#F5F5F5'
                  }}
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
                    className="w-full py-3 px-4 pr-12 rounded-lg transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(10, 10, 10, 0.8)',
                      border: '1px solid rgba(212, 175, 55, 0.15)',
                      color: '#F5F5F5'
                    }}
                    placeholder="Enter your password"
                    required
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#6E6E6E' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #997B19 0%, #D4AF37 50%, #997B19 100%)',
                  color: '#000000',
                  boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)'
                }}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
            
            <p className="text-center mt-8" style={{ color: '#6E6E6E' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold transition-colors hover:opacity-80" style={{ color: '#D4AF37' }}>
                Sign up
              </Link>
            </p>
            
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
              <p className="text-xs text-center" style={{ color: '#525252' }}>
                Demo credentials: <span style={{ color: '#A3A3A3' }}>demo / demo12345</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

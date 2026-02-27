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
      description: 'Monitor investments and net worth in real-time'
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Enterprise encryption protects your data'
    },
    {
      icon: Sparkles,
      title: 'AI Insights',
      description: 'Smart recommendations powered by ML'
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      background: '#030303' 
    }}>
      {/* Left side - Feature Cards */}
      <div style={{
        width: '55%',
        padding: '2.5rem',
        display: 'flex',
        flexDirection: 'column',
        '@media (max-width: 1024px)': { display: 'none' }
      }} className="feature-panel">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'auto' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)'
          }}>
            <Crown style={{ width: '22px', height: '22px', color: '#000' }} />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#F5F5F5', letterSpacing: '-0.02em' }}>BlackieFi</span>
        </div>

        {/* Feature Cards */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '420px', width: '100%' }}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.12)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      padding: '0.875rem',
                      borderRadius: '12px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      border: '1px solid rgba(212, 175, 55, 0.2)'
                    }}>
                      <Icon style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.25rem', color: '#F5F5F5' }}>{feature.title}</h3>
                      <p style={{ fontSize: '0.875rem', lineHeight: '1.5', color: '#737373' }}>{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom tag */}
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#404040' }}>
            Trusted by 10,000+ users worldwide
          </p>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div style={{
        width: '45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)'
      }} className="login-panel">
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Mobile logo - hidden on desktop */}
          <div className="mobile-logo" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)'
              }}>
                <Crown style={{ width: '22px', height: '22px', color: '#000' }} />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#F5F5F5' }}>BlackieFi</span>
            </div>
          </div>
          
          {/* Form Card */}
          <div style={{
            borderRadius: '20px',
            padding: '2rem',
            background: '#0F0F0F',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#F5F5F5' }}>Welcome back</h2>
              <p style={{ color: '#737373' }}>Sign in to continue to your account</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '500', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    borderRadius: '12px',
                    background: '#0A0A0A',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#F5F5F5',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter username"
                  required
                  data-testid="login-username-input"
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '500', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      paddingRight: '3rem',
                      borderRadius: '12px',
                      background: '#0A0A0A',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F5F5F5',
                      fontSize: '0.9375rem',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Enter password"
                    required
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '1rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#525252',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff style={{ width: '20px', height: '20px' }} /> : <Eye style={{ width: '20px', height: '20px' }} />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                  color: '#000000',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(0,0,0,0.3)',
                      borderTopColor: '#000',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight style={{ width: '16px', height: '16px' }} />
                  </>
                )}
              </button>
            </form>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <p style={{ textAlign: 'center', color: '#737373' }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ fontWeight: '500', color: '#D4AF37', textDecoration: 'none' }}>
                  Create one
                </Link>
              </p>
            </div>
          </div>
          
          {/* Demo credentials */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '12px',
            textAlign: 'center',
            background: 'rgba(212, 175, 55, 0.05)',
            border: '1px solid rgba(212, 175, 55, 0.1)'
          }}>
            <p style={{ fontSize: '0.75rem', color: '#525252' }}>
              Demo: <span style={{ color: '#A3A3A3' }}>demo / demo12345</span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .feature-panel { display: none !important; }
          .login-panel { width: 100% !important; }
        }
        @media (min-width: 1025px) {
          .mobile-logo { display: none !important; }
        }
        input:focus {
          border-color: rgba(212, 175, 55, 0.5) !important;
        }
        button[type="submit"]:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);
        }
      `}</style>
    </div>
  );
}

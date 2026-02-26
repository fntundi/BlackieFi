import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Crown, ArrowLeft } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(formData.username, formData.email, formData.password, formData.fullName);
      toast.success('Account created successfully!');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#050505' }}>
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent)'
        }}></div>
        <div className="absolute -top-40 left-1/4 w-96 h-96 rounded-full opacity-5" style={{
          background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)'
        }}></div>
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 rounded-full opacity-5" style={{
          background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)'
        }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)',
              boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
            }}>
              <Crown className="w-6 h-6 text-black" />
            </div>
            <span className="text-3xl font-display font-bold" style={{
              background: 'linear-gradient(135deg, #F9F1D8 0%, #D4AF37 50%, #F9F1D8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>BlackieFi</span>
          </div>
          <p style={{ color: '#6E6E6E' }}>Create your premium account</p>
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none"
                style={{
                  background: 'rgba(10, 10, 10, 0.8)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  color: '#F5F5F5'
                }}
                placeholder="John Doe"
                data-testid="register-fullname-input"
              />
            </div>
            
            <div>
              <label className="label">Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none"
                style={{
                  background: 'rgba(10, 10, 10, 0.8)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  color: '#F5F5F5'
                }}
                placeholder="johndoe"
                required
                minLength={3}
                data-testid="register-username-input"
              />
            </div>
            
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none"
                style={{
                  background: 'rgba(10, 10, 10, 0.8)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  color: '#F5F5F5'
                }}
                placeholder="john@example.com"
                required
                data-testid="register-email-input"
              />
            </div>
            
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full py-3 px-4 pr-12 rounded-lg transition-all duration-300 focus:outline-none"
                  style={{
                    background: 'rgba(10, 10, 10, 0.8)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    color: '#F5F5F5'
                  }}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  data-testid="register-password-input"
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
            
            <div>
              <label className="label">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none"
                style={{
                  background: 'rgba(10, 10, 10, 0.8)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  color: '#F5F5F5'
                }}
                placeholder="Confirm your password"
                required
                data-testid="register-confirm-password-input"
              />
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
              data-testid="register-submit-btn"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>
          
          <p className="text-center mt-8" style={{ color: '#6E6E6E' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold transition-colors hover:opacity-80" style={{ color: '#D4AF37' }}>
              Sign in
            </Link>
          </p>
        </div>
        
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 mt-8 transition-colors"
          style={{ color: '#6E6E6E' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}

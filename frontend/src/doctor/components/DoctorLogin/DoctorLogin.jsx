import React, { useState } from 'react';
import { useDoctorAuth } from '../../context/DoctorContext';
import { useNavigate } from 'react-router-dom';
import './DoctorLogin.css';

const DoctorLogin = () => {
  const { login, loading, error } = useDoctorAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email.trim(), password);
  };

  return (
    <div className="dr-login-root">
      <div className="dr-login-card">
        {/* Logo */}
        <div className="dr-login-logo" aria-hidden="true" onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
          <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#1565c0"/>
            <rect x="17" y="6" width="6" height="28" rx="2" fill="white"/>
            <rect x="6"  y="17" width="28" height="6" rx="2" fill="white"/>
          </svg>
        </div>

        <h1 className="dr-login-brand">AROGYABODHINI</h1>
        <p className="dr-login-subtitle">Doctor Portal</p>
        <h2 className="dr-login-title">Sign In</h2>

        <form className="dr-login-form" onSubmit={handleSubmit} noValidate>
          <div className="dr-login-field">
            <label htmlFor="dr-email">Email Address</label>
            <input
              id="dr-email"
              type="email"
              className="dr-login-input"
              placeholder="doctor@arogyabodhini.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="dr-login-field">
            <label htmlFor="dr-password">Password</label>
            <div className="dr-login-pass-wrap">
              <input
                id="dr-password"
                type={showPass ? 'text' : 'password'}
                className="dr-login-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="dr-login-pass-toggle"
                onClick={() => setShowPass(s => !s)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="dr-login-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            id="dr-login-btn"
            type="submit"
            className="dr-login-btn"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <><span className="dr-login-spinner" aria-hidden="true"/> Signing in...</>
            ) : (
              'Sign In ➔'
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="dr-login-switch" onClick={() => navigate('/doctor/register')} style={{ color: '#1565c0', fontWeight: 'bold' }}>
            Not registered? Apply here
          </button>
          <button className="dr-login-switch" onClick={() => navigate('/patient')}>
            ← Back to Patient Portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorLogin;

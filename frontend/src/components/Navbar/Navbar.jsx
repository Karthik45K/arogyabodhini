import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <nav
      id="navbar"
      ref={ref}
      className={`navbar ${scrolled ? 'navbar--scrolled' : 'navbar--top'}`}
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: 'sticky', top: 0, zIndex: 100, background: scrolled ? 'white' : 'rgba(255,255,255,0.95)',
        boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s ease'
      }}
    >
      <div className="container navbar__inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', maxWidth: '1200px', margin: '0 auto' }}>

        <button onClick={() => navigate('/')} className="navbar__logo" aria-label="Arogyabodhini - Home" style={{ display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: 'none', cursor: 'pointer' }}>
          <div className="navbar__logo-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="36" height="36" fill="none">
              <rect width="40" height="40" rx="10" fill="#1565c0"/>
              <rect x="17" y="6" width="6" height="28" rx="2" fill="white"/>
              <rect x="6"  y="17" width="28" height="6" rx="2" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1565c0' }}>
            Arogyabodhini
          </span>
        </button>

        <ul className="navbar__links" role="list" style={{ display: 'flex', gap: '24px', margin: 0, padding: 0 }}>
          <li><button onClick={() => { navigate('/'); close(); }} style={{ fontSize: '1rem', fontWeight: 500, color: '#333' }}>Home</button></li>
          <li><button onClick={() => { navigate('/doctor/register'); close(); }} style={{ fontSize: '1rem', fontWeight: 500, color: '#333' }}>For Doctors</button></li>
        </ul>

        <div className="navbar__auth" style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => navigate('/doctor')} style={{ padding: '10px 20px', borderRadius: '8px', border: '2px solid #1565c0', color: '#1565c0', fontWeight: 600 }}>
            Doctor Portal
          </button>
          <button onClick={() => navigate('/patient')} style={{ padding: '10px 20px', borderRadius: '8px', background: '#1565c0', border: 'none', color: 'white', fontWeight: 600 }}>
            Patient Portal
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;

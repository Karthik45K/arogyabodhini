import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNav = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <nav
      id="navbar"
      ref={ref}
      className={`navbar ${scrolled ? 'navbar--scrolled' : 'navbar--top'}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="navbar__inner">
        {/* Brand Logo */}
        <button
          onClick={() => handleNav('/')}
          className="navbar__logo"
          aria-label="Arogyabodhini - Home"
        >
          <div className="navbar__logo-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="34" height="34" fill="none">
              <rect width="40" height="40" rx="10" fill="#1565c0" />
              <rect x="17" y="7" width="6" height="26" rx="2" fill="white" />
              <rect x="7" y="17" width="26" height="6" rx="2" fill="white" />
            </svg>
          </div>
          <span className="navbar__logo-text">Arogyabodhini</span>
        </button>

        {/* Desktop Links */}
        <ul className="navbar__links" role="list">
          <li>
            <button onClick={() => handleNav('/')} className="navbar__nav-btn">
              Home
            </button>
          </li>
          <li>
            <button onClick={() => handleNav('/doctor/register')} className="navbar__nav-btn">
              For Doctors
            </button>
          </li>
        </ul>

        {/* Desktop Action Buttons */}
        <div className="navbar__auth">
          <button
            onClick={() => handleNav('/doctor')}
            className="navbar__btn-outline"
          >
            Doctor Portal
          </button>
          <button
            onClick={() => handleNav('/patient')}
            className="navbar__btn-primary"
          >
            Patient Portal
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--open' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`navbar__mobile-menu ${menuOpen ? 'navbar__mobile-menu--open' : ''}`}>
        <div className="navbar__mobile-inner">
          <ul className="navbar__mobile-links">
            <li>
              <button onClick={() => handleNav('/')} className="navbar__mobile-item">
                🏠 Home
              </button>
            </li>
            <li>
              <button onClick={() => handleNav('/doctor/register')} className="navbar__mobile-item">
                📝 For Doctors (Onboarding)
              </button>
            </li>
          </ul>

          <div className="navbar__mobile-divider" />

          <div className="navbar__mobile-auth">
            <button
              onClick={() => handleNav('/doctor')}
              className="navbar__mobile-btn navbar__btn-outline"
            >
              🩺 Doctor Portal
            </button>
            <button
              onClick={() => handleNav('/patient')}
              className="navbar__mobile-btn navbar__btn-primary"
            >
              🧑🏽‍⚕️ Patient Portal
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

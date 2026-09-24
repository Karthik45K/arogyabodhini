import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import BilingualText from '../BilingualText/BilingualText';
import PatientAccount from '../PatientAccount/PatientAccount';
import { usePatientAuth } from '../../patient/context/PatientContext';
import './AppHeader.css';

const AppHeader = ({ onChangeLang, onJoinVideoRoom, activeIncomingCall, onOpenAccount }) => {
  const { t, en, lang } = useLanguage();
  const { patient } = usePatientAuth();
  const [showAccount, setShowAccount] = useState(false);
  const navigate = useNavigate();

  const handleAccountClick = () => {
    if (onOpenAccount) {
      onOpenAccount();
    } else {
      setShowAccount(true);
    }
  };

  return (
    <header className="ab-header" role="banner">
      <div className="ab-header__inner">
        <button className="ab-header__brand-btn" onClick={() => navigate('/')} aria-label="Arogyabodhini Home">
          <div className="ab-header__logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#1565c0"/>
              <rect x="13" y="5" width="6" height="22" rx="2" fill="white"/>
              <rect x="5" y="13" width="22" height="6" rx="2" fill="white"/>
            </svg>
          </div>
          <div className="ab-header__brand">
            <span className="ab-header__name">
              <BilingualText tKey="appName" as="span" size="sm" />
            </span>
            <span className="ab-header__tagline">
              <BilingualText tKey="appTagline" as="span" size="sm" />
            </span>
          </div>
        </button>

        <div className="ab-header__right">
          {activeIncomingCall && onJoinVideoRoom && (
            <button
              id="active-call-header-btn"
              className="ab-header__active-call-btn"
              onClick={() => onJoinVideoRoom(activeIncomingCall.id, activeIncomingCall.patientName || patient?.name)}
              title={`Join active call with Dr. ${activeIncomingCall.doctorName}`}
            >
              🎥 <span className="ab-header__call-text">Call Active</span>
            </button>
          )}

          <div className="ab-header__badge" aria-label={en('freeSecure')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>{en('freeSecure')}</span>
          </div>

          <button
            id="patient-login-btn"
            className="ab-header__patient-btn"
            onClick={handleAccountClick}
            aria-label={patient ? `Profile of ${patient.name}` : 'Patient Login'}
          >
            <span className="ab-header__patient-icon">👤</span>
            <span className="ab-header__patient-name">
              {patient ? `Hi, ${patient.name.split(/\s+/)[0]}` : 'Login'}
            </span>
          </button>

          <button
            id="change-lang-btn"
            className="ab-header__lang-btn"
            onClick={onChangeLang}
            aria-label={en('changeLanguage')}
            title={en('changeLanguage')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span className="ab-header__lang-code">
              {lang?.code ? lang.code.toUpperCase() : (lang?.nativeLabel || '🌐')}
            </span>
          </button>
        </div>
      </div>
      {showAccount && (
        <PatientAccount
          onClose={() => setShowAccount(false)}
          onJoinVideoRoom={onJoinVideoRoom}
        />
      )}
    </header>
  );
};

export default AppHeader;

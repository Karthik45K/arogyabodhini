import React from 'react'
import './Hero.css'

const STATS = [
  { val: '50K+', lbl: 'Patients Served'  },
  { val: '12',   lbl: 'Languages'        },
  { val: '98%',  lbl: 'AI Accuracy'      },
  { val: '200+', lbl: 'Specialists'      },
]

const CHIPS = ['🇬🇧 English', '🇮🇳 हिंदी', '🇮🇳 ಕನ್ನಡ', '🇮🇳 தமிழ்', '🇮🇳 తెలుగు']

const BARS = [
  { label: 'Symptom Analysis', pct: '88%' },
  { label: 'Disease Match',    pct: '74%' },
  { label: 'Confidence Score', pct: '96%' },
]

const Hero = () => (
  <section id="home" className="hero" aria-label="Hero — AI Healthcare Assistant">

    {/* Background */}
    <div className="hero__bg" aria-hidden="true">
      <div className="hero__orb hero__orb--1" />
      <div className="hero__orb hero__orb--2" />
      <div className="hero__orb hero__orb--3" />
      <div className="hero__grid" />
    </div>

    <div className="container hero__inner">

      {/* ── Left content ── */}
      <div className="hero__content">

        <div className="hero__eyebrow anim-up">
          <span className="hero__eyebrow-dot" />
          AI-Powered Healthcare Platform
        </div>

        <h1 className="hero__title anim-up d-100">
          AI Multilingual
          <span className="hero__title-line2"> Healthcare Assistant</span>
        </h1>

        <p className="hero__sub anim-up d-200">
          Describe symptoms by voice or text in your native language — our AI
          analyzes them instantly and connects you with the right specialist.
        </p>

        <div className="hero__chips anim-up d-300">
          {CHIPS.map(c => <span key={c} className="hero__chip">{c}</span>)}
        </div>

        <div className="hero__actions anim-up d-400">
          <a href="#symptom-input" className="btn btn--primary btn--xl" id="hero-cta-consult">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 10 10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
            Start Consultation
          </a>
          <a href="#features" className="btn btn--ghost btn--xl" id="hero-cta-learn">
            Explore Features
          </a>
        </div>

        <div className="hero__stats anim-up d-500">
          {STATS.map(({ val, lbl }) => (
            <div key={lbl}>
              <span className="hero__stat-val">{val}</span>
              <span className="hero__stat-lbl">{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right visual ── */}
      <div className="hero__visual anim-float-slow" aria-hidden="true">

        {/* Main glass card */}
        <div className="hero__card-main">
          {/* Rotating ring + cross */}
          <div className="hero__ai-ring">
            <svg className="hero__ai-ring-svg" viewBox="0 0 88 88" fill="none">
              <circle cx="44" cy="44" r="40" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="5 3"/>
              <circle cx="44" cy="4"  r="4" fill="#34d399"/>
              <circle cx="84" cy="44" r="3" fill="#0ea5e9"/>
              <circle cx="44" cy="84" r="3.5" fill="#a78bfa"/>
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#34d399"/>
                  <stop offset="1" stopColor="#0ea5e9"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="hero__ai-plus">
              <svg viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="10" fill="url(#plusGrad)"/>
                <path d="M20 12v16M12 20h16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="plusGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#34d399"/>
                    <stop offset="1" stopColor="#0369a1"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <h3>Analyzing Symptoms</h3>
          <p>AI processing in real-time</p>

          <div className="hero__bars">
            {BARS.map(({ label, pct }) => (
              <div className="hero__bar-row" key={label}>
                <div className="hero__bar-label">
                  <span>{label}</span><span>{pct}</span>
                </div>
                <div className="hero__bar-track">
                  <div className="hero__bar-fill" style={{ width: pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Float card — top left */}
        <div className="hero__float hero__float--tl">
          <div className="hero__float-icon hero__float-icon--green">🎤</div>
          <div>
            <p className="hero__float-title">Voice Active</p>
            <p className="hero__float-sub">Listening in Hindi</p>
          </div>
          <div className="hero__float-dot hero__float-dot--green" />
        </div>

        {/* Float card — bottom right */}
        <div className="hero__float hero__float--br">
          <div className="hero__float-icon hero__float-icon--blue">👨‍⚕️</div>
          <div>
            <p className="hero__float-title">Specialist Found</p>
            <p className="hero__float-sub">Cardiologist — 4.9 ★</p>
          </div>
        </div>
      </div>
    </div>

    {/* Wave into next section */}
    <div className="hero__wave" aria-hidden="true">
      <svg viewBox="0 0 1440 64" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,32 C320,64 1120,0 1440,48 L1440,64 L0,64 Z" fill="var(--surface-1)"/>
      </svg>
    </div>
  </section>
)

export default Hero

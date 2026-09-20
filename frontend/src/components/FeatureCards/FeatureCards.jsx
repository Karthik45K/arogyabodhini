import React from 'react'
import './FeatureCards.css'

const FEATURES = [
  {
    id: 'feat-ai',
    title: 'AI Disease Prediction',
    body: 'ML models trained on millions of cases analyze your symptoms and predict possible conditions with clinical-grade accuracy.',
    badge: '98% Accuracy',
    grad:   'linear-gradient(135deg,#0ea5e9,#0369a1)',
    shadow: 'rgba(14,165,233,.3)',
    arrowColor: '#0ea5e9',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    id: 'feat-voice',
    title: 'Voice-to-Text',
    body: 'Speak naturally in your dialect. Watch your words transform into precise text instantly — no typing required.',
    badge: 'Real-time',
    grad:   'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    shadow: 'rgba(139,92,246,.3)',
    arrowColor: '#8b5cf6',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
  },
  {
    id: 'feat-lang',
    title: 'Multilingual Support',
    body: 'Communicate in English, Hindi, Kannada, Tamil, Telugu and 8 more languages. Breaking barriers to make healthcare accessible.',
    badge: '12 Languages',
    grad:   'linear-gradient(135deg,#10b981,#059669)',
    shadow: 'rgba(16,185,129,.3)',
    arrowColor: '#10b981',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    id: 'feat-specialist',
    title: 'Specialist Recommendation',
    body: 'AI matches your condition to the most qualified specialist and connects you with nearby doctors who speak your language.',
    badge: '200+ Doctors',
    grad:   'linear-gradient(135deg,#f59e0b,#d97706)',
    shadow: 'rgba(245,158,11,.3)',
    arrowColor: '#f59e0b',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'feat-emergency',
    title: 'Emergency Detection',
    body: 'Critical symptom patterns trigger instant emergency alerts — one-tap access to ambulance and emergency services.',
    badge: '< 30s Response',
    grad:   'linear-gradient(135deg,#ef4444,#dc2626)',
    shadow: 'rgba(239,68,68,.3)',
    arrowColor: '#ef4444',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
]

const FeatureCards = () => (
  <section id="features" className="features-section section" aria-labelledby="features-heading">
    <div className="container">
      <div className="section-header anim-up">
        <div className="section-eyebrow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Core Features
        </div>
        <h2 id="features-heading" className="section-title">
          Everything for <span className="grad-text">Smart Healthcare</span>
        </h2>
        <p className="section-body">
          Cutting-edge AI combined with compassionate care — making quality
          healthcare accessible for every Indian.
        </p>
      </div>

      <div className="features-grid" role="list">
        {FEATURES.map((f, i) => (
          <article
            key={f.id}
            id={f.id}
            className="feat-card anim-up"
            style={{ animationDelay: `${i * 0.09}s` }}
            role="listitem"
          >
            {/* Top gradient stripe */}
            <div className="feat-card__stripe" style={{ background: f.grad }} aria-hidden="true" />

            {/* Glow bg */}
            <div className="feat-card__glow" style={{ background: f.grad }} aria-hidden="true" />

            {/* Icon */}
            <div className="feat-card__icon" style={{ background: f.grad, boxShadow: `0 8px 24px ${f.shadow}` }} aria-hidden="true">
              {f.icon}
            </div>

            {/* Badge */}
            <span className="feat-card__badge" style={{ background: f.grad }}>{f.badge}</span>

            {/* Text */}
            <h3 className="feat-card__title">{f.title}</h3>
            <p  className="feat-card__body">{f.body}</p>

            {/* Arrow */}
            <div className="feat-card__arrow" style={{ background: `${f.arrowColor}18`, color: f.arrowColor }} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
)

export default FeatureCards

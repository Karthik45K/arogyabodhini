import React from 'react'
import './Footer.css'

const LINKS = {
  Platform: [
    { label: 'Patient Portal',   href: '#patient-login' },
    { label: 'Doctor Portal',    href: '#doctor-login'  },
    { label: 'Symptom Checker',  href: '#symptom-input' },
    { label: 'Find Specialists', href: '#doctors'       },
  ],
  Company: [
    { label: 'About Us',  href: '#' },
    { label: 'Careers',   href: '#' },
    { label: 'Blog',      href: '#' },
    { label: 'Press',     href: '#' },
  ],
  Support: [
    { label: 'Help Center',    href: '#' },
    { label: 'Contact Us',     href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
  Languages: [
    { label: '🇬🇧 English',  href: '#' },
    { label: '🇮🇳 हिंदी',     href: '#' },
    { label: '🇮🇳 ಕನ್ನಡ',    href: '#' },
    { label: '🇮🇳 தமிழ்',    href: '#' },
    { label: '🇮🇳 తెలుగు',   href: '#' },
  ],
}

const SOCIALS = [
  {
    id: 'footer-twitter', label: 'Twitter', href: '#',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  {
    id: 'footer-linkedin', label: 'LinkedIn', href: '#',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
  {
    id: 'footer-github', label: 'GitHub', href: '#',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>,
  },
]

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer id="footer" className="footer" role="contentinfo">
      <div className="footer__body">
        <div className="container">
          <div className="footer__main">

            {/* Brand */}
            <div className="footer__brand">
              <a href="#home" className="footer__logo" aria-label="MediAI — home">
                <div className="footer__logo-mark" aria-hidden="true">
                  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="36" height="36" rx="9" fill="url(#ftrGrad)"/>
                    <path d="M18 9v18M9 18h18" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="ftrGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#34d399"/>
                        <stop offset="1" stopColor="#0369a1"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span className="footer__logo-text">Medi<span className="footer__logo-accent">AI</span></span>
              </a>

              <p className="footer__tagline">
                Making quality healthcare accessible to every Indian through
                AI-powered multilingual technology.
              </p>

              <div className="footer__emergency" role="note" aria-label="Emergency contact">
                <span className="footer__emerg-icon">🚨</span>
                <div>
                  <p className="footer__emerg-label">Medical Emergency</p>
                  <p className="footer__emerg-num">Call 108</p>
                </div>
              </div>

              <div className="footer__social" aria-label="Social media">
                {SOCIALS.map(s => (
                  <a key={s.id} id={s.id} href={s.href} className="footer__social-btn" aria-label={s.label}>
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Nav cols */}
            {Object.entries(LINKS).map(([group, items]) => (
              <nav key={group} className="footer__nav" aria-label={group}>
                <h3 className="footer__nav-title">{group}</h3>
                <ul>
                  {items.map(i => (
                    <li key={i.label}>
                      <a href={i.href} className="footer__nav-link">{i.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p className="footer__copy">© {year} MediAI Healthcare. All rights reserved.</p>
          <div className="footer__badges">
            <span className="footer__badge">🔒 HIPAA Compliant</span>
            <span className="footer__badge">🛡️ ISO 27001</span>
            <span className="footer__badge">✅ DISHA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

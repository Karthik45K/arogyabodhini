import React from 'react'
import './MobileNav.css'

const MobileNav = ({ currentTab, onTabChange, activeCallCount = 0 }) => {
  return (
    <nav className="mobile-nav" aria-label="Mobile Navigation">
      <button
        id="mob-nav-home"
        className={`mobile-nav__item ${currentTab === 'home' ? 'mobile-nav__item--active' : ''}`}
        onClick={() => onTabChange('home')}
      >
        <span className="mobile-nav__icon">🏠</span>
        <span className="mobile-nav__label">Home</span>
      </button>

      <button
        id="mob-nav-consultations"
        className={`mobile-nav__item ${currentTab === 'consultations' ? 'mobile-nav__item--active' : ''}`}
        onClick={() => onTabChange('consultations')}
      >
        <div className="mobile-nav__icon-wrap">
          <span className="mobile-nav__icon">📅</span>
          {activeCallCount > 0 && <span className="mobile-nav__badge">{activeCallCount}</span>}
        </div>
        <span className="mobile-nav__label">Appointments</span>
      </button>

      <button
        id="mob-nav-records"
        className={`mobile-nav__item ${currentTab === 'records' ? 'mobile-nav__item--active' : ''}`}
        onClick={() => onTabChange('records')}
      >
        <span className="mobile-nav__icon">📁</span>
        <span className="mobile-nav__label">Records</span>
      </button>

      <button
        id="mob-nav-lang"
        className="mobile-nav__item"
        onClick={() => onTabChange('language')}
      >
        <span className="mobile-nav__icon">🌐</span>
        <span className="mobile-nav__label">Language</span>
      </button>
    </nav>
  )
}

export default MobileNav

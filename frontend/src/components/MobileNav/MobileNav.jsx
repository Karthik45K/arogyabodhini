import React from 'react'
import './MobileNav.css'

const MobileNav = ({ currentTab, onTabChange, activeCallCount = 0 }) => {
  return (
    <nav className="mobile-nav" aria-label="Main">
      <button
        id="mob-nav-home"
        className={`mobile-nav__item ${currentTab === 'home' ? 'mobile-nav__item--active' : ''}`}
        onClick={() => onTabChange('home')}
      >
        <span className="mobile-nav__icon">🏠</span>
        <span className="mobile-nav__label">Home</span>
      </button>

      <button
        id="mob-nav-reports"
        className={`mobile-nav__item ${currentTab === 'reports' ? 'mobile-nav__item--active' : ''}`}
        onClick={() => onTabChange('reports')}
      >
        <span className="mobile-nav__icon">📄</span>
        <span className="mobile-nav__label">My Reports</span>
      </button>

      <button
        id="mob-nav-prescriptions"
        className={`mobile-nav__item ${currentTab === 'prescriptions' ? 'mobile-nav__item--active' : ''}`}
        onClick={() => onTabChange('prescriptions')}
      >
        <div className="mobile-nav__icon-wrap">
          <span className="mobile-nav__icon">💊</span>
          {activeCallCount > 0 && <span className="mobile-nav__badge">{activeCallCount}</span>}
        </div>
        <span className="mobile-nav__label">My Prescriptions</span>
      </button>

      <button
        id="mob-nav-details"
        className={`mobile-nav__item ${currentTab === 'details' ? 'mobile-nav__item--active' : ''}`}
        onClick={() => onTabChange('details')}
      >
        <span className="mobile-nav__icon">👤</span>
        <span className="mobile-nav__label">My Details</span>
      </button>
    </nav>
  )
}

export default MobileNav

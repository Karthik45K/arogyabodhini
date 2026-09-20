import React from 'react'
import './DoctorDetailScreen.css'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'

const DoctorDetailScreen = ({ doctor, lang, onBack, onBookAppointment, onVideoConsult }) => {
  const { en, t } = useLanguage()

  if (!doctor) return null

  const patientLang   = lang?.label || 'English'
  const speaksMatch   = doctor.langs.some(l => l.toLowerCase() === patientLang.toLowerCase())
  const isAvailNow    = doctor.availStatus === 'now' || doctor.availStatus === 'today'

  return (
    <div className="docdetail-screen anim-in">

      {/* ── Top bar ── */}
      <div className="docdetail-topbar">
        <button id="docdetail-back-btn" className="docdetail-back-btn" onClick={onBack}>
          ← <BilingualText tKey="backToResult" enText="Back" as="span" size="sm" />
        </button>
        <span className="docdetail-topbar__title">Doctor Profile</span>
      </div>

      <div className="docdetail-inner">

        {/* ── Profile hero ── */}
        <div className="docdetail-hero">
          <div className="docdetail-avatar" style={{ background: doctor.bgColor }} aria-hidden="true">
            {doctor.initials}
            {doctor.online && <span className="docdetail-avatar__dot" aria-label="Online now" />}
          </div>

          <div className="docdetail-hero__info">
            <h1 className="docdetail-name">{doctor.name}</h1>
            {/* Specialization always in English */}
            <p className="docdetail-spec">{doctor.spec}</p>
            <p className="docdetail-hosp">🏥 {doctor.hospital}</p>

            <div className="docdetail-rating-row">
              <div className="docdetail-stars" aria-label={`Rating ${doctor.rating} out of 5`}>
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24"
                    fill={i <= Math.round(doctor.rating) ? '#f9a825' : '#e0e0e0'} aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
                <span className="docdetail-stars__val">{doctor.rating}</span>
                <span className="docdetail-stars__cnt">({doctor.reviews} reviews)</span>
              </div>

              <span className={`docdetail-avail ${isAvailNow ? 'docdetail-avail--now' : 'docdetail-avail--soon'}`}>
                {isAvailNow && <span className="docdetail-avail__dot" aria-hidden="true"/>}
                {doctor.availLabel}
              </span>
            </div>

            {speaksMatch && (
              <div className="docdetail-lang-match">
                ✓ Speaks {patientLang}
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row — no fees ── */}
        <div className="docdetail-stats">
          <div className="docdetail-stat">
            <span className="docdetail-stat__val">{doctor.exp}</span>
            <BilingualText tKey="experience" as="span" className="docdetail-stat__label" size="sm" />
          </div>
          <div className="docdetail-stat">
            <span className="docdetail-stat__val">🟢 Online Telemedicine</span>
            <span className="docdetail-stat__label">Mode</span>
          </div>
        </div>

        {/* ── About ── */}
        <div className="docdetail-section">
          <h2 className="docdetail-section__title">About</h2>
          <p className="docdetail-about">{doctor.about}</p>
        </div>

        {/* ── Specializations ── */}
        <div className="docdetail-section">
          <h2 className="docdetail-section__title">Specializations</h2>
          <div className="docdetail-chips">
            {doctor.specializations.map(s => (
              <span key={s} className="docdetail-chip">{s}</span>
            ))}
          </div>
        </div>

        {/* ── Education ── */}
        {doctor.education && doctor.education.length > 0 && (
          <div className="docdetail-section">
            <h2 className="docdetail-section__title">Education &amp; Training</h2>
            <ul className="docdetail-edu-list">
              {doctor.education.map((e, i) => (
                <li key={i} className="docdetail-edu-item">
                  <span className="docdetail-edu-dot" aria-hidden="true" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Languages ── */}
        <div className="docdetail-section">
          <h2 className="docdetail-section__title">
            <BilingualText tKey="languagesSpoken" enText="Languages Spoken" as="span" size="sm" />
          </h2>
          <div className="docdetail-chips">
            {doctor.langs.map(l => (
              <span key={l}
                className={`docdetail-chip ${l.toLowerCase() === patientLang.toLowerCase() ? 'docdetail-chip--match' : ''}`}>
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* ── Available Slots ── */}
        {doctor.slots && doctor.slots.length > 0 && (
          <div className="docdetail-section">
            <h2 className="docdetail-section__title">Available Online Slots</h2>
            <div className="docdetail-slots">
              {doctor.slots.map(slot => (
                <span key={slot} className="docdetail-slot">{slot}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="docdetail-actions">
          <button
            id={`${doctor.id}-video-detail`}
            className="docdetail-btn docdetail-btn--video"
            onClick={() => onVideoConsult(doctor)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            <span>⚡ Instant Video Call</span>
          </button>

          <button
            id={`${doctor.id}-book-detail`}
            className="docdetail-btn docdetail-btn--book"
            onClick={() => onBookAppointment(doctor)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>📅 Schedule for Later</span>
          </button>
        </div>

        {/* Contact */}
        {doctor.phone && (
          <p className="docdetail-phone">
            📞 {doctor.phone}
          </p>
        )}
      </div>
    </div>
  )
}

export default DoctorDetailScreen

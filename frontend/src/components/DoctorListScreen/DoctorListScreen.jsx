import React, { useState } from 'react'
import './DoctorListScreen.css'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'

/**
 * Normalise a doctor object from MongoDB (via API) into the shape
 * expected by the DoctorListScreen and DoctorDetailScreen.
 *
 * MongoDB shape             → UI shape
 * ─────────────────────────────────────
 * specialty                 → spec
 * languages                 → langs
 * grad                      → bgColor  (gradient string)
 * availability              → availLabel
 * availabilityStatus        → availStatus
 * bio                       → about
 * treatments                → specializations
 * consultationTypes         → determines online flag
 * experience (number)       → exp (string)
 */
const normaliseDoctor = (raw) => ({
  // ── identity ──────────────────────────────────────────────────────────────
  id:              raw.id   || raw._id?.toString() || String(Math.random()),
  name:            raw.name || 'Unknown Doctor',
  initials:        raw.initials || (raw.name || 'Dr').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),

  // ── profile ───────────────────────────────────────────────────────────────
  spec:            raw.specialty  || raw.spec     || 'General Physician',
  hospital:        raw.hospital   || raw.location || '',
  exp:             typeof raw.experience === 'number' ? `${raw.experience} yrs` : (raw.exp || ''),
  expYears:        raw.experience || 0,
  rating:          raw.rating   || 4.5,
  reviews:         raw.reviews  || 0,
  langs:           raw.languages || raw.langs  || ['English'],

  // ── visual ────────────────────────────────────────────────────────────────
  bgColor:         raw.grad || raw.bgColor || 'linear-gradient(135deg,#10b981,#059669)',

  // ── availability ─────────────────────────────────────────────────────────
  availStatus:     raw.availabilityStatus || raw.availStatus || 'soon',
  availLabel:      raw.availability       || raw.availLabel  || 'Contact for availability',

  // ── mode ──────────────────────────────────────────────────────────────────
  online: Array.isArray(raw.consultationTypes)
    ? raw.consultationTypes.includes('online')
    : (raw.online ?? true),

  // ── detail page ───────────────────────────────────────────────────────────
  about:           raw.bio || raw.about || `${raw.name || 'This doctor'} is a qualified specialist.`,
  specializations: raw.treatments || raw.specializations || [],
  education:       raw.education  || [],
  slots:           raw.slots      || ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
  phone:           raw.phone      || '',

  // emergency flag
  isEmergencyAvailable: raw.isEmergencyAvailable || false,
  isFileDoctor: /^doc-\d+$/i.test(String(raw.id || '')),
})

// ─── Component ───────────────────────────────────────────────────────────────

const DoctorListScreen = ({ result, lang, onBack, onHome, onViewDoctor, onBookDoctor }) => {
  const { en, t } = useLanguage()

  const patientLang = lang?.label || 'English'

  // ── Use doctors from the API response (MongoDB), normalised to UI shape ───
  const rawDoctors   = result?.recommendedDoctors || []
  const doctors      = rawDoctors.map(normaliseDoctor)

  // Sort: doctors speaking the patient's language appear first
  const sorted = [...doctors].sort((a, b) => {
    if (a.isFileDoctor !== b.isFileDoctor) return a.isFileDoctor ? -1 : 1
    const aMatch = a.langs.some(l => l.toLowerCase() === patientLang.toLowerCase()) ? 0 : 1
    const bMatch = b.langs.some(l => l.toLowerCase() === patientLang.toLowerCase()) ? 0 : 1
    return aMatch - bMatch
  })

  return (
    <div className="doclist-screen anim-in">

      {/* Top bar */}
      <div className="doclist-topbar">
        <button className="doclist-back-btn" onClick={onBack} id="back-to-result-btn">
          <BilingualText tKey="backToResult" as="span" size="sm" />
        </button>
        <div className="doclist-topbar__info">
          <span>{en('recommended')} <strong>{result.recommendedSpecialist}</strong></span>
        </div>
        <button className="doclist-home-btn" onClick={onHome} id="back-to-home-btn">
          <BilingualText tKey="backHome" as="span" size="sm" />
        </button>
      </div>

      <div className="doclist-inner">
        <h2 className="doclist-title">
          <BilingualText tKey="chooseDoctor" as="span" size="lg" />
        </h2>
        <p className="doclist-hint">
          {en('speaksFirst')} <strong>{patientLang}</strong> {en('shownFirst')}
          {lang?.code !== 'en' && (
            <span className="doclist-hint__native">
              {' '}· {t('speaksFirst')} <strong>{patientLang}</strong> {t('shownFirst')}
            </span>
          )}
        </p>

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="doclist-empty">
            <p>No doctors found for <strong>{result.recommendedSpecialist}</strong> in the database.</p>
            <p style={{ marginTop: '0.5rem', opacity: 0.7, fontSize: '0.9rem' }}>
              Please consult a General Physician or visit your nearest clinic.
            </p>
          </div>
        )}

        <div className="doclist-grid">
          {sorted.map(doc => {
            const speaksMatch = doc.langs.some(l => l.toLowerCase() === patientLang.toLowerCase())
            const isAvailNow  = doc.availStatus === 'now' || doc.availStatus === 'today'

            return (
              <div key={doc.id}
                className={`doc-card ${speaksMatch ? 'doc-card--highlight' : ''}`}
                role="article"
                aria-label={`${doc.name}, ${doc.spec}`}
              >
                {speaksMatch && (
                  <div className="doc-card__lang-badge">
                    {en('speaksLabel')} {patientLang}
                  </div>
                )}

                <div className="doc-card__header">
                  <div className="doc-card__avatar" style={{ background: doc.bgColor }} aria-hidden="true">
                    {doc.initials}
                    {doc.online && <span className="doc-card__online-dot" aria-label="Online"/>}
                  </div>

                  <div className="doc-card__meta">
                    <h3 className="doc-card__name">{doc.name}</h3>
                    <p className="doc-card__spec">{doc.spec}</p>
                    <p className="doc-card__hosp">{doc.hospital}</p>
                    <div className="doc-stars-row">
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} width="15" height="15" viewBox="0 0 24 24"
                          fill={i <= Math.round(doc.rating) ? '#f9a825' : '#e0e0e0'} aria-hidden="true">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      ))}
                      <span className="doc-stars__val">{doc.rating}</span>
                      <span className="doc-stars__cnt">({doc.reviews})</span>
                    </div>
                  </div>

                  <div className={`doc-card__avail ${isAvailNow ? 'doc-card__avail--now' : 'doc-card__avail--soon'}`}>
                    {isAvailNow && <span className="doc-card__avail-dot" aria-hidden="true"/>}
                    {doc.availLabel}
                  </div>
                </div>

                {/* Info row — no fees */}
                <div className="doc-card__info-row">
                  <div className="doc-card__info-cell">
                    <BilingualText tKey="experience" as="span" className="doc-card__info-label" size="sm" />
                    <span className="doc-card__info-val">{doc.exp}</span>
                  </div>
                  <div className="doc-card__info-cell">
                    <span className="doc-card__info-label">Mode</span>
                    <span className="doc-card__info-val">🟢 Online Telemedicine</span>
                  </div>
                </div>

                <div className="doc-card__langs">
                  <BilingualText tKey="languagesSpoken" as="span" className="doc-card__langs-label" size="sm" />
                  <div className="doc-card__lang-chips">
                    {doc.langs.map(l => (
                      <span key={l}
                        className={`doc-card__lang-chip ${l.toLowerCase() === patientLang.toLowerCase() ? 'doc-card__lang-chip--match' : ''}`}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="doc-card__actions">
                  <button
                    id={`${doc.id}-profile`}
                    className="doc-action-btn doc-action-btn--profile"
                    onClick={() => onViewDoctor(doc)}
                    aria-label={`View profile of ${doc.name}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    View Profile
                  </button>

                  <button
                    id={`${doc.id}-video`}
                    className="doc-action-btn doc-action-btn--video"
                    onClick={() => onBookDoctor ? onBookDoctor(doc, 'instant') : onViewDoctor(doc)}
                    aria-label={`Instant Video Consult — ${doc.name}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                    <span>⚡ Instant Call</span>
                  </button>

                  <button
                    id={`${doc.id}-book`}
                    className="doc-action-btn doc-action-btn--book"
                    onClick={() => onBookDoctor ? onBookDoctor(doc, 'scheduled') : onViewDoctor(doc)}
                    aria-label={`Schedule Online Appointment — ${doc.name}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>📅 Schedule</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DoctorListScreen

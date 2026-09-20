import React, { useState } from 'react'
import './DoctorCard.css'

const DOCTORS = [
  {
    id: 'doc-priya',
    name: 'Dr. Priya Sharma',
    spec: 'Cardiologist',
    exp:  '14 yrs',
    rating: 4.9, reviews: 312,
    langs: ['English', 'Hindi', 'Kannada'],
    avail: 'Available Today',
    initials: 'PS',
    grad: 'linear-gradient(135deg,#0ea5e9,#0369a1)',
    condition: 'Cardiac Conditions',
    hospital: 'Apollo Hospital, Bangalore',
    fee: '₹600',
  },
  {
    id: 'doc-rajesh',
    name: 'Dr. Rajesh Kumar',
    spec: 'Neurologist',
    exp:  '18 yrs',
    rating: 4.8, reviews: 276,
    langs: ['English', 'Tamil', 'Telugu'],
    avail: 'Tomorrow, 10 AM',
    initials: 'RK',
    grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    condition: 'Neurological Disorders',
    hospital: 'Manipal Hospital, Chennai',
    fee: '₹800',
  },
  {
    id: 'doc-ananya',
    name: 'Dr. Ananya Reddy',
    spec: 'General Physician',
    exp:  '9 yrs',
    rating: 4.9, reviews: 488,
    langs: ['English', 'Telugu', 'Kannada'],
    avail: 'Available Now',
    initials: 'AR',
    grad: 'linear-gradient(135deg,#10b981,#059669)',
    condition: 'General Health',
    hospital: 'Fortis Hospital, Hyderabad',
    fee: '₹400',
  },
]

const Star = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const iconProps = { width:18, height:18, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':true }

const INFO_ICONS = {
  brief: <svg {...iconProps}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  globe: <svg {...iconProps}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  check: <svg {...iconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  dollar:<svg {...iconProps}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
}

const DoctorCard = () => {
  const [active, setActive] = useState(DOCTORS[0])
  const [booked, setBooked] = useState(null)

  const book = (id) => {
    setBooked(id)
    setTimeout(() => setBooked(null), 3200)
  }

  const isAvailNow = active.avail.toLowerCase().includes('now') || active.avail.toLowerCase().includes('today')

  return (
    <section id="doctors" className="doctors-section section" aria-labelledby="doctors-heading">
      <div className="container">

        <div className="section-header anim-up">
          <div className="section-eyebrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Specialist Preview
          </div>
          <h2 id="doctors-heading" className="section-title">
            Your Recommended <span className="grad-text">Specialists</span>
          </h2>
          <p className="section-body">
            AI matches your symptoms to the most qualified specialists in your
            area who speak your language.
          </p>
        </div>

        <div className="doctors-layout anim-up d-200">

          {/* Sidebar */}
          <div className="doctors-sidebar" role="list" aria-label="Select doctor">
            {DOCTORS.map(d => (
              <button
                key={d.id}
                id={`${d.id}-select`}
                className={`doc-item ${active.id === d.id ? 'doc-item--active' : ''}`}
                onClick={() => setActive(d)}
                role="listitem"
                aria-selected={active.id === d.id}
              >
                <div className="doc-item__avatar" style={{ background: d.grad }}>{d.initials}</div>
                <div className="doc-item__info" style={{ overflow:'hidden' }}>
                  <p className="doc-item__name">{d.name}</p>
                  <p className="doc-item__spec">{d.spec}</p>
                </div>
                <span className={`doc-item__dot ${d.avail.toLowerCase().includes('now') || d.avail.toLowerCase().includes('today') ? 'doc-item__dot--now' : 'doc-item__dot--soon'}`}>
                  ●
                </span>
              </button>
            ))}
          </div>

          {/* Detail card */}
          <div className="doc-detail" key={active.id}>

            {/* Header */}
            <div className="doc-detail__header">
              <div className="doc-detail__avatar" style={{ background: active.grad }}>
                {active.initials}
                <div className="doc-detail__online" aria-label="Online" />
              </div>

              <div className="doc-detail__meta">
                <h3 className="doc-detail__name">{active.name}</h3>
                <p className="doc-detail__spec">{active.spec}</p>
                <p className="doc-detail__hosp">{active.hospital}</p>
                <div className="doc-detail__stars">
                  <div className="doc-stars" aria-label={`${active.rating} stars`}>
                    {[...Array(5)].map((_,i) => <Star key={i}/>)}
                  </div>
                  <span className="doc-rating-val">{active.rating}</span>
                  <span className="doc-rating-cnt">({active.reviews} reviews)</span>
                </div>
              </div>

              <div className={`doc-status ${isAvailNow ? 'doc-status--avail' : 'doc-status--sched'}`}>
                {active.avail}
              </div>
            </div>

            {/* Info grid */}
            <div className="doc-info-grid">
              {[
                { icon: INFO_ICONS.brief,  lbl: 'Experience',        val: active.exp + ' experience' },
                { icon: INFO_ICONS.globe,  lbl: 'Languages',         val: active.langs.join(', ')    },
                { icon: INFO_ICONS.check,  lbl: 'Specialises In',    val: active.condition           },
                { icon: INFO_ICONS.dollar, lbl: 'Consultation Fee',  val: active.fee                 },
              ].map(({ icon, lbl, val }) => (
                <div key={lbl} className="doc-info-cell">
                  <div className="doc-info-cell__icon">{icon}</div>
                  <div>
                    <p className="doc-info-cell__lbl">{lbl}</p>
                    <p className="doc-info-cell__val">{val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="doc-actions">
              <button
                id={`${active.id}-book`}
                className={`btn btn--primary btn--lg doc-book-btn ${booked === active.id ? 'doc-book-btn--booked' : ''}`}
                onClick={() => book(active.id)}
                aria-label={booked === active.id ? 'Booked!' : `Book with ${active.name}`}
              >
                {booked === active.id ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Appointment Booked!</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Book Appointment</>
                )}
              </button>

              <button id={`${active.id}-chat`} className="doc-action-btn" aria-label="Chat now">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Chat
              </button>
              <button id={`${active.id}-video`} className="doc-action-btn" aria-label="Video call">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                Video Call
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="doctors-cta anim-up d-400">
          <div className="doctors-cta__text">
            <h3>Ready for a full consultation?</h3>
            <p>Enter your symptoms above and get matched with the perfect specialist instantly.</p>
          </div>
          <a href="#symptom-input" id="doctors-cta-btn" className="btn btn--primary btn--lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Start Free Consultation
          </a>
        </div>
      </div>
    </section>
  )
}

export default DoctorCard

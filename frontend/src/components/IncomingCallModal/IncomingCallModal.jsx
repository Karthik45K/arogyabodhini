import React, { useEffect } from 'react'
import './IncomingCallModal.css'
import { startIncomingCallAlert, stopIncomingCallAlert } from '../../utils/callNotification'

const IncomingCallModal = ({ call, onAccept, onDismiss }) => {
  useEffect(() => {
    if (call?.doctorName) {
      startIncomingCallAlert(call.doctorName)
    }
    return () => {
      stopIncomingCallAlert()
    }
  }, [call?.doctorName])

  if (!call) return null

  const handleAccept = () => {
    stopIncomingCallAlert()
    onAccept(call)
  }

  const handleDismiss = () => {
    stopIncomingCallAlert()
    onDismiss()
  }

  return (
    <div className="call-modal-backdrop" role="dialog" aria-modal="true">
      <div className="call-modal-card anim-up">
        {/* Animated pulsing wave rings */}
        <div className="call-avatar-wrapper">
          <div className="call-avatar-pulse call-avatar-pulse--1" />
          <div className="call-avatar-pulse call-avatar-pulse--2" />
          <div className="call-avatar">
            {(call.doctorName || 'Dr').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        </div>

        <div className="call-info">
          <span className="call-badge">Incoming Video Consultation</span>
          <h2 className="call-doctor-name">Dr. {call.doctorName}</h2>
          <p className="call-doctor-spec">{call.doctorSpecialty || 'Consulting Specialist'}</p>
          {call.slot && <p className="call-slot-info">🕒 Scheduled for: <strong>{call.slot}</strong></p>}
          <p className="call-hint">Doctor is in the room waiting for you to connect.</p>
        </div>

        <div className="call-actions">
          <button
            id="accept-video-call-btn"
            className="call-btn call-btn--accept"
            onClick={handleAccept}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            <span>Accept &amp; Join</span>
          </button>

          <button
            id="dismiss-video-call-btn"
            className="call-btn call-btn--dismiss"
            onClick={handleDismiss}
          >
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallModal

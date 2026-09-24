import React from 'react'
import './WaitingForDoctorScreen.css'
import { formatDoctorDisplayName } from '../../services/doctorMatchService'

function conditionList(result) {
  const raw = result?.possibleDiseases || result?.predictions || []
  const names = raw
    .map((item) => (typeof item === 'string' ? item : item?.disease))
    .filter(Boolean)
  if (names.length) return names.slice(0, 5)
  if (result?.predictedDisease) return [result.predictedDisease]
  if (result?.translatedCondition) return [result.translatedCondition]
  return []
}

/**
 * Patient waiting / matching screen after AI analysis.
 * Phases: searching | found | connecting | waiting_accept
 */
const WaitingForDoctorScreen = ({
  result,
  phase = 'searching',
  doctor = null,
  onHome,
}) => {
  const specialist = result?.recommendedSpecialist || 'Specialist'
  const conditions = conditionList(result)
  const doctorName = formatDoctorDisplayName(doctor?.name)
  const doctorSpec = doctor?.specialtyLabel || doctor?.specialty || doctor?.spec || specialist
  const isEmergency = result?.emergencyFlag === true
    || String(result?.severity || '').toLowerCase() === 'emergency'

  let doctorBlock
  let statusBlock

  if (phase === 'searching') {
    doctorBlock = (
      <>
        <p className="wfd-label">Doctor</p>
        <p className="wfd-searching">Looking for an available doctor…</p>
      </>
    )
    statusBlock = (
      <>
        <p className="wfd-status">Waiting for a {specialist} doctor to become available.</p>
        <p className="wfd-hint">
          Please stay on this screen. We will connect you automatically when a suitable doctor is available.
        </p>
      </>
    )
  } else if (phase === 'found' || phase === 'connecting') {
    doctorBlock = (
      <>
        <p className="wfd-label">Doctor</p>
        <p className="wfd-doctor-name">Dr. {doctorName}</p>
        <p className="wfd-doctor-spec">{doctorSpec}</p>
      </>
    )
    statusBlock = (
      <p className="wfd-status">
        {phase === 'found'
          ? `Dr. ${doctorName} is available.`
          : `Connecting you to Dr. ${doctorName}…`}
      </p>
    )
  } else {
    doctorBlock = (
      <>
        <p className="wfd-label">Doctor</p>
        <p className="wfd-doctor-name">Dr. {doctorName}</p>
        <p className="wfd-doctor-spec">{doctorSpec}</p>
      </>
    )
    statusBlock = (
      <>
        <p className="wfd-status">Request sent.</p>
        <p className="wfd-hint">Waiting for Dr. {doctorName} to accept your request.</p>
      </>
    )
  }

  return (
    <div className="wfd-screen anim-in" aria-live="polite">
      <div className="wfd-card">
        <p className="wfd-ok">Symptoms understood</p>
        <p className="wfd-disclaimer">
          Possible conditions only — not a medical diagnosis.
        </p>

        {isEmergency && (
          <div className="wfd-emergency" role="alert">
            <p className="wfd-emergency-title">Emergency care warning</p>
            <p>
              Your symptoms may need urgent medical attention. If you feel severe pain, trouble
              breathing, chest pressure, confusion, or fainting, seek emergency care or call local
              emergency services immediately.
            </p>
            {result?.urgencyNote ? <p>{result.urgencyNote}</p> : null}
          </div>
        )}

        <div className="wfd-section">
          <p className="wfd-label">Possible Conditions</p>
          {conditions.length === 0 ? (
            <p className="wfd-empty">Clinical assessment ready</p>
          ) : (
            <ul className="wfd-conditions">
              {conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="wfd-section">
          <p className="wfd-label">Recommended Specialist</p>
          <p className="wfd-specialist">{specialist}</p>
        </div>

        <div className="wfd-section">
          {doctorBlock}
        </div>

        <div className="wfd-section wfd-section--status">
          <p className="wfd-label">Status</p>
          {statusBlock}
        </div>

        {(phase === 'searching' || phase === 'connecting') && (
          <div className="wfd-dots" aria-hidden="true">
            <span /><span /><span />
          </div>
        )}
      </div>

      <button type="button" className="wfd-home-btn" onClick={onHome}>
        Home
      </button>
    </div>
  )
}

export default WaitingForDoctorScreen

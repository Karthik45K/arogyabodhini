import React, { useState } from 'react'
import { DoctorProvider, useDoctorAuth } from './doctor/context/DoctorContext'
import DoctorLogin        from './doctor/components/DoctorLogin/DoctorLogin'
import DoctorDashboard    from './doctor/components/DoctorDashboard/DoctorDashboard'
import ConsultationRoom   from './doctor/components/ConsultationRoom/ConsultationRoom'
import consultationService from './doctor/services/consultationService'

const DSCREENS = { DASHBOARD: 'dashboard', CONSULTATION: 'consultation' }

function DoctorAppInner({ onSwitchToPatient }) {
  const { doctor } = useDoctorAuth()
  const [dScreen,       setDScreen]       = useState(() => {
    return sessionStorage.getItem('ab_doctor_active_consult_id') ? DSCREENS.CONSULTATION : DSCREENS.DASHBOARD
  })
  const [activeConsult, setActiveConsult] = useState(null)
  const [restoring,     setRestoring]     = useState(() => {
    return Boolean(sessionStorage.getItem('ab_doctor_active_consult_id'))
  })

  // Restore active consultation session across page refresh
  React.useEffect(() => {
    const savedConsultId = sessionStorage.getItem('ab_doctor_active_consult_id')
    if (savedConsultId && doctor) {
      consultationService.getById(savedConsultId)
        .then((consult) => {
          if (consult) {
            setActiveConsult(consult)
            setDScreen(DSCREENS.CONSULTATION)
          } else {
            sessionStorage.removeItem('ab_doctor_active_consult_id')
            setDScreen(DSCREENS.DASHBOARD)
          }
        })
        .catch(() => {
          sessionStorage.removeItem('ab_doctor_active_consult_id')
          setDScreen(DSCREENS.DASHBOARD)
        })
        .finally(() => setRestoring(false))
    } else {
      setRestoring(false)
    }
  }, [doctor])

  if (!doctor) {
    return <DoctorLogin onSwitchToPatient={onSwitchToPatient} />
  }

  if (restoring) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#1e293b' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Restoring consultation session…</p>
      </div>
    )
  }

  return (
    <>
      {dScreen === DSCREENS.DASHBOARD && (
        <DoctorDashboard
          onOpenConsultation={(consult) => {
            if (consult?.id) sessionStorage.setItem('ab_doctor_active_consult_id', consult.id)
            setActiveConsult(consult)
            setDScreen(DSCREENS.CONSULTATION)
          }}
        />
      )}

      {dScreen === DSCREENS.CONSULTATION && activeConsult && (
        <ConsultationRoom
          consultation={activeConsult}
          onBack={() => {
            sessionStorage.removeItem('ab_doctor_active_consult_id')
            setActiveConsult(null)
            setDScreen(DSCREENS.DASHBOARD)
          }}
        />
      )}
    </>
  )
}

export default DoctorAppInner

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import authService from '../services/authService'
import doctorStatusService from '../services/doctorStatusService'

const DoctorContext = createContext(null)

export const DoctorProvider = ({ children }) => {
  const [doctor,  setDoctor]  = useState(() => authService.restoreSession())
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const login = useCallback(async (email, password) => {
    setLoading(true); setError(null)
    // Small artificial delay for realism
    await new Promise(r => setTimeout(r, 600))
    const result = await authService.login(email, password)
    if (result.success) {
      let sessionDoctor = { ...result.doctor, isActive: false }
      try {
        sessionDoctor.isActive = await doctorStatusService.get(sessionDoctor.id)
      } catch {}
      authService.saveSession(sessionDoctor)
      setDoctor(sessionDoctor)
    } else {
      setError(result.error)
    }
    setLoading(false)
    return result.success
  }, [])

  const setActiveStatus = useCallback(async (isActive) => {
    if (!doctor?.id) return false
    const savedStatus = await doctorStatusService.set(doctor.id, isActive)
    const updatedDoctor = { ...doctor, isActive: savedStatus }
    authService.saveSession(updatedDoctor)
    setDoctor(updatedDoctor)
    return savedStatus
  }, [doctor])

  const logout = useCallback(() => {
    authService.logout()
    setDoctor(null)
  }, [])

  return (
    <DoctorContext.Provider value={{ doctor, login, logout, setActiveStatus, loading, error }}>
      {children}
    </DoctorContext.Provider>
  )
}

export const useDoctorAuth = () => {
  const ctx = useContext(DoctorContext)
  if (!ctx) throw new Error('useDoctorAuth must be used inside DoctorProvider')
  return ctx
}

export default DoctorContext

import React, { createContext, useContext, useEffect, useState } from 'react'
import patientService from '../services/patientService'

const PatientContext = createContext(null)

const AUTH_INIT_TIMEOUT_MS = 12000

export const PatientProvider = ({ children }) => {
  // Never treat a cached profile as authenticated without a valid JWT.
  // (Stale localStorage profile was skipping language → login for cold browser visits.)
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(patientService.getToken()))

  useEffect(() => {
    let cancelled = false
    const token = patientService.getToken()

    if (!token) {
      setPatient(null)
      setLoading(false)
      return undefined
    }

    const timer = setTimeout(() => {
      if (cancelled) return
      patientService.clearSession()
      setPatient(null)
      setLoading(false)
    }, AUTH_INIT_TIMEOUT_MS)

    patientService.me()
      .then(({ patient: profile }) => {
        if (cancelled) return
        clearTimeout(timer)
        if (profile) setPatient(profile)
        else {
          patientService.clearSession()
          setPatient(null)
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        clearTimeout(timer)
        patientService.clearSession()
        setPatient(null)
        setLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const authenticate = async (action, data) => {
    const result = await action(data)
    patientService.saveSession(result)
    setPatient(result.patient)
    setLoading(false)
    return result.patient
  }

  const register = (data) => authenticate(patientService.register, data)
  const login = (identifier, password) => authenticate(() => patientService.login(identifier, password), null)
  const continueWithPhone = (name, phone, email, preferredLanguage) =>
    authenticate(() => patientService.continueWithPhone(name, phone, email, preferredLanguage), null)
  const updateProfile = async (data) => {
    const result = await patientService.updateProfile(data)
    patientService.saveSession({ token: patientService.getToken(), patient: result.patient })
    setPatient(result.patient)
    return result.patient
  }
  const logout = async () => {
    try { await patientService.logout() } finally {
      patientService.clearSession()
      setPatient(null)
      setLoading(false)
    }
  }

  return (
    <PatientContext.Provider value={{ patient, token: patientService.getToken(), loading, register, login, continueWithPhone, updateProfile, logout }}>
      {children}
    </PatientContext.Provider>
  )
}

export const usePatientAuth = () => {
  const context = useContext(PatientContext)
  if (!context) throw new Error('usePatientAuth must be used inside PatientProvider')
  return context
}

export default PatientContext

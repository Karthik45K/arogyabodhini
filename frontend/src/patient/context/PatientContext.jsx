import React, { createContext, useContext, useEffect, useState } from 'react'
import patientService from '../services/patientService'

const PatientContext = createContext(null)

export const PatientProvider = ({ children }) => {
  const [patient, setPatient] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ab_patient_profile') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(Boolean(patientService.getToken()))

  useEffect(() => {
    if (!patientService.getToken()) return
    patientService.me()
      .then(({ patient: profile }) => setPatient(profile))
      .catch(() => { patientService.clearSession(); setPatient(null) })
      .finally(() => setLoading(false))
  }, [])

  const authenticate = async (action, data) => {
    const result = await action(data)
    patientService.saveSession(result)
    setPatient(result.patient)
    return result.patient
  }

  const register = (data) => authenticate(patientService.register, data)
  const login = (identifier, password) => authenticate(() => patientService.login(identifier, password), null)
  const logout = async () => {
    try { await patientService.logout() } finally { patientService.clearSession(); setPatient(null) }
  }

  return <PatientContext.Provider value={{ patient, token: patientService.getToken(), loading, register, login, logout }}>{children}</PatientContext.Provider>
}

export const usePatientAuth = () => {
  const context = useContext(PatientContext)
  if (!context) throw new Error('usePatientAuth must be used inside PatientProvider')
  return context
}

export default PatientContext
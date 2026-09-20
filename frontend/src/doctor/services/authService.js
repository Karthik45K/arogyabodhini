/**
 * authService.js — Doctor Authentication Service (Mock)
 * Replace login() with a real API call in production.
 */

import { apiUrl } from '../../services/apiBase'
import DOCTOR_ACCOUNTS from '../data/doctorAccounts'

const SESSION_KEY = 'ab_doctor_session'
const TOKEN_KEY = 'ab_doctor_token'

export const authService = {
  saveSession(doctor) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(doctor)) } catch {}
  },
  /** Authenticate doctor by email + password */
  async login(email, password) {
    try {
      const response = await fetch(apiUrl('/api/doctor-auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json()

      if (response.ok && payload.success && payload.doctor) {
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(payload.doctor)) } catch {}
        if (payload.token) localStorage.setItem(TOKEN_KEY, payload.token)
        return { success: true, doctor: payload.doctor }
      }
    } catch {}

    const account = DOCTOR_ACCOUNTS.find(
      candidate => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password
    )
    if (!account) return { success: false, error: 'Invalid email or password.' }
    const session = { ...account, loginAt: new Date().toISOString() }
    localStorage.removeItem(TOKEN_KEY)
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
    return { success: true, doctor: session }
  },

  /** Restore session from localStorage */
  restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const session = JSON.parse(raw)
      if (session?.name === 'Dr. Priya Sharma' && session.id === 'doc-priya-sharma') {
        const normalized = { ...session, id: 'doc-001' }
        localStorage.setItem(SESSION_KEY, JSON.stringify(normalized))
        return normalized
      }
      return session
    } catch { return null }
  },

  /** Logout */
  logout() {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) fetch(apiUrl('/api/doctor-auth/logout'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(TOKEN_KEY) } catch {}
  },

  /** Check if a session is active */
  isLoggedIn() {
    return !!authService.restoreSession()
  },
}

export default authService

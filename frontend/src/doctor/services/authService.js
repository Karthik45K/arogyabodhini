/**
 * authService.js — Doctor Authentication Service (Mock)
 * Replace login() with a real API call in production.
 */

import { apiUrl } from '../../services/apiBase'

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
      const payload = await response.json().catch(() => null)

      if (response.ok && payload?.success && payload?.doctor && payload?.token) {
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(payload.doctor)) } catch {}
        localStorage.setItem(TOKEN_KEY, payload.token)
        return { success: true, doctor: payload.doctor }
      }

      if (payload?.message) {
        return { success: false, error: payload.message }
      }
      return { success: false, error: 'Invalid email or password. Please try again.' }
    } catch (err) {
      return { success: false, error: 'Unable to connect to healthcare server. Please check your connection or wait a moment for the server to activate.' }
    }
  },

  /** Restore session from localStorage */
  restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      const token = localStorage.getItem(TOKEN_KEY)
      // Require valid token to avoid unauthorized poll loops
      if (!raw || !token) {
        localStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(TOKEN_KEY)
        return null
      }
      return JSON.parse(raw)
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

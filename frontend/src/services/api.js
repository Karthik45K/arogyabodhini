/**
 * MediAI API Service — Phase 2
 *
 * Centralises all backend calls. Swap the BASE_URL for production deployment.
 * In Phase 3, extend with auth headers, retry logic, and response caching.
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const BASE_URL = `${API_BASE_URL.replace(/\/$/, '')}/api`

// Axios instance for components that need .get() / .post() style calls
const api = axios.create({ baseURL: BASE_URL, timeout: 15000 })
export default api

/**
 * Analyze patient symptoms.
 *
 * @param {string} symptoms  - Free-text symptom description
 * @param {string} language  - ISO language code (en, hi, kn, ta, te…)
 * @returns {Promise<Object>} - Structured analysis result
 */
export const analyzeSymptoms = async (symptoms, language = 'en', retries = 2) => {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/analyze-symptoms`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symptoms, language }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `Request failed with status ${response.status}`)
      }

      return payload.data
    } catch (err) {
      lastError = err
      // If network error (e.g. server spinning up), wait and retry
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2500))
      }
    }
  }

  throw lastError || new Error('Unable to analyze symptoms. Please verify server connection and try again.')
}


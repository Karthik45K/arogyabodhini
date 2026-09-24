import { apiUrl } from '../../services/apiBase'

const TOKEN_KEY = 'ab_patient_token'

const request = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY)
  let response
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('Unable to connect to the server. Please try again.')
  }

  let payload = {}
  try { payload = await response.json() } catch {}
  if (!response.ok || !payload.success) {
    if (payload.message) throw new Error(payload.message)
    if (response.status === 404) throw new Error('Patient registration service is unavailable. Please try again.')
    if (response.status === 401) throw new Error('Please sign in again.')
    if (response.status === 409) throw new Error('An account already exists with this email or phone.')
    if (response.status >= 500) throw new Error('Unable to connect to the server. Please try again.')
    throw new Error('Patient request failed.')
  }
  return payload
}

export const patientService = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  saveSession: (payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token)
    localStorage.setItem('ab_patient_profile', JSON.stringify(payload.patient))
  },
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('ab_patient_profile')
  },
  register: (data) => request('/api/patient-auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (identifier, password) => request('/api/patient-auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  continueWithPhone: (name, phone, email, preferredLanguage) =>
    request('/api/patient-auth/continue', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email, preferredLanguage }),
    }),
  updateProfile: (data) => request('/api/patient-auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  me: () => request('/api/patient-auth/me'),
  logout: () => request('/api/patient-auth/logout', { method: 'POST' }),
  consultations: () => request('/api/patient/consultations'),
  prescriptions: () => request('/api/patient/prescriptions'),
  emailPrescription: (id) => request(`/api/patient/prescriptions/${encodeURIComponent(id)}/email`, { method: 'POST' }),
  smsPrescription: (id) => request(`/api/patient/prescriptions/${encodeURIComponent(id)}/sms`, { method: 'POST' }),
  downloadPrescriptionPdf: async (id) => {
    const token = localStorage.getItem(TOKEN_KEY)
    const response = await fetch(apiUrl(`/api/patient/prescriptions/${encodeURIComponent(id)}/pdf`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error('Unable to download prescription PDF.')
    return response.blob()
  },
}

export { TOKEN_KEY }
export default patientService
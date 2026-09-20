import { apiUrl } from '../../services/apiBase'

const getStatusUrl = (doctorId) => `${apiUrl('/api/doctor-status')}/${encodeURIComponent(doctorId)}`

const doctorStatusService = {
  async get(doctorId) {
    const response = await fetch(getStatusUrl(doctorId))
    const payload = await response.json()
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load doctor status.')
    return payload.isActive === true
  },

  async set(doctorId, isActive) {
    const response = await fetch(getStatusUrl(doctorId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
    const payload = await response.json()
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to update doctor status.')
    return payload.isActive === true
  },
}

export default doctorStatusService
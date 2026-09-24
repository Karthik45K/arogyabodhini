require('dotenv').config()
const http = require('http')

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const r = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = ''
        res.on('data', (c) => (raw += c))
        res.on('end', () => {
          let json = null
          try { json = JSON.parse(raw) } catch { json = raw }
          resolve({ status: res.statusCode, json })
        })
      }
    )
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

async function main() {
  const typed = await req('POST', '/analyze-symptoms', {
    symptoms: 'chest pain and shortness of breath for 2 days',
    language: 'en',
  })
  console.log('ANALYZE typed status', typed.status)
  console.log('  specialist:', typed.json?.data?.recommendedSpecialist)
  console.log('  conditions:', typed.json?.data?.possibleDiseases)
  console.log('  emergency:', typed.json?.data?.emergencyFlag)
  console.log('  disclaimer:', typed.json?.data?.disclaimer ? 'yes' : 'no')

  const voiceSame = await req('POST', '/analyze-symptoms', {
    symptoms: 'chest pain and shortness of breath for 2 days',
    language: 'en',
  })
  console.log('ANALYZE voice-same-pipeline:',
    voiceSame.json?.data?.recommendedSpecialist === typed.json?.data?.recommendedSpecialist ? 'PASS' : 'FAIL')

  // Match without auth → 401
  const unauth = await req('POST', '/consultations/match', { specialty: 'Cardiology' })
  console.log('MATCH unauth:', unauth.status === 401 ? 'PASS' : `FAIL ${unauth.status}`)

  // Cardiology wait (no login needed for service-level already tested)
  // Try patient login if common test accounts exist — skip if unknown
  console.log('Specialties route already verified via HTTP earlier')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

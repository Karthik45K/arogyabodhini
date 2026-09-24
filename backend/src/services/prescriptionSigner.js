/**
 * Cryptographic prescription signing.
 * Private key never leaves the backend. Optional env:
 *   PRESCRIPTION_SIGNING_PRIVATE_KEY  (PEM)
 * Otherwise a persistent key pair is created under backend/keys/.
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const KEY_DIR = path.join(__dirname, '../../keys')
const PRIV_PATH = path.join(KEY_DIR, 'prescription-private.pem')
const PUB_PATH = path.join(KEY_DIR, 'prescription-public.pem')

let cached = null

function ensureKeyPair() {
  if (cached) return cached

  const envPem = String(process.env.PRESCRIPTION_SIGNING_PRIVATE_KEY || '').trim()
  if (envPem) {
    const privateKey = envPem.replace(/\\n/g, '\n')
    const publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' })
    cached = { privateKey, publicKey, keyId: fingerprint(publicKey) }
    return cached
  }

  if (fs.existsSync(PRIV_PATH) && fs.existsSync(PUB_PATH)) {
    const privateKey = fs.readFileSync(PRIV_PATH, 'utf8')
    const publicKey = fs.readFileSync(PUB_PATH, 'utf8')
    cached = { privateKey, publicKey, keyId: fingerprint(publicKey) }
    return cached
  }

  if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true })
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  fs.writeFileSync(PRIV_PATH, privateKey, { mode: 0o600 })
  fs.writeFileSync(PUB_PATH, publicKey, { mode: 0o644 })
  cached = { privateKey, publicKey, keyId: fingerprint(publicKey) }
  console.log('[prescriptionSigner] Generated persistent RSA key pair at', KEY_DIR)
  return cached
}

function fingerprint(pem) {
  return crypto.createHash('sha256').update(pem).digest('hex').slice(0, 16)
}

function canonicalPayload(data) {
  const ordered = {
    prescriptionId: data.prescriptionId,
    consultationId: data.consultationId,
    patientId: data.patientId || '',
    patientName: data.patientName || '',
    patientPhone: data.patientPhone || '',
    doctorId: data.doctorId || '',
    doctorName: data.doctorName || '',
    doctorLicense: data.doctorLicense || '',
    diagnosis: data.diagnosis || '',
    medicines: data.medicines || [],
    issuedAt: data.issuedAt,
  }
  return JSON.stringify(ordered)
}

function signPrescription(data) {
  const keys = ensureKeyPair()
  const payload = canonicalPayload(data)
  const signature = crypto.sign('sha256', Buffer.from(payload), keys.privateKey).toString('base64')
  return {
    algorithm: 'RSA-SHA256',
    keyId: keys.keyId,
    payload,
    signature,
    signedAt: data.issuedAt,
  }
}

function verifyPrescription(data, signature, algorithm = 'RSA-SHA256') {
  const keys = ensureKeyPair()
  const payload = typeof data === 'string' ? data : canonicalPayload(data)
  try {
    return crypto.verify('sha256', Buffer.from(payload), keys.publicKey, Buffer.from(signature, 'base64'))
      && algorithm === 'RSA-SHA256'
  } catch {
    return false
  }
}

function getPublicKeyInfo() {
  const keys = ensureKeyPair()
  return { algorithm: 'RSA-SHA256', keyId: keys.keyId, publicKey: keys.publicKey }
}

module.exports = { signPrescription, verifyPrescription, getPublicKeyInfo, canonicalPayload }

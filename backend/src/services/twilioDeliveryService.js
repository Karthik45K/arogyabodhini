/**
 * Twilio SMS + WhatsApp delivery for prescriptions.
 * Credentials stay backend-only (TWILIO_* / SMS_* env vars).
 */
const twilio = require('twilio')
const { buildPrescriptionPdfBuffer } = require('./prescriptionPdfService')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function twilioCreds() {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || process.env.SMS_ACCOUNT_SID || '').trim()
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || process.env.SMS_API_KEY || '').trim()
  return { accountSid, authToken }
}

function isTwilioConfigured() {
  const { accountSid, authToken } = twilioCreds()
  if (!accountSid || !authToken) return false
  if (accountSid.startsWith('your-') || authToken.startsWith('your-')) return false
  return true
}

function isSmsConfigured() {
  if (String(process.env.SMS_PROVIDER || 'twilio').toLowerCase() === 'twilio') {
    const from = String(process.env.TWILIO_FROM || process.env.SMS_FROM || '').trim()
    return isTwilioConfigured() && Boolean(from)
  }
  return isTwilioConfigured()
}

function isWhatsAppConfigured() {
  const from = String(process.env.TWILIO_WHATSAPP_FROM || process.env.WHATSAPP_FROM || '').trim()
  return isTwilioConfigured() && Boolean(from)
}

function toE164India(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+91${digits}`
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  if (String(phone).trim().startsWith('+')) return String(phone).trim()
  return `+${digits}`
}

function getClient() {
  const { accountSid, authToken } = twilioCreds()
  return twilio(accountSid, authToken)
}

function publicBaseUrl() {
  return String(process.env.PUBLIC_API_URL || process.env.APP_PUBLIC_URL || 'http://localhost:5000').replace(/\/$/, '')
}

function ensureAccessToken(prescription) {
  if (prescription.accessToken) return prescription.accessToken
  const token = crypto.randomBytes(24).toString('hex')
  prescription.accessToken = token
  return token
}

async function writeTempPdf(prescription) {
  const buf = await buildPrescriptionPdfBuffer(prescription)
  const dir = path.join(__dirname, '../../uploads/prescriptions')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const filename = `${prescription.prescriptionId || 'rx'}.pdf`
  const full = path.join(dir, filename)
  fs.writeFileSync(full, buf)
  return { buf, filename, full, publicUrl: `${publicBaseUrl()}/uploads/prescriptions/${filename}` }
}

async function sendPrescriptionSMS(patientPhone, prescription) {
  const phone = toE164India(patientPhone || prescription.patientPhone)
  if (!phone) {
    return { configured: isSmsConfigured(), sent: false, reason: 'no_phone', channel: 'sms' }
  }
  if (!isSmsConfigured()) {
    return {
      configured: false,
      sent: false,
      reason: 'not_configured',
      channel: 'sms',
      message: 'SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM.',
    }
  }

  try {
    const token = ensureAccessToken(prescription)
    const link = `${publicBaseUrl()}/api/prescriptions/access/${token}/pdf`
    const body =
      `Arogyabodhini: Your prescription from Dr. ${prescription.doctorName || 'your doctor'} is ready. ` +
      `Access your signed prescription: ${link}`

    const client = getClient()
    const from = String(process.env.TWILIO_FROM || process.env.SMS_FROM).trim()
    const msg = await client.messages.create({ to: phone, from, body })
    return {
      configured: true,
      sent: true,
      channel: 'sms',
      sid: msg.sid,
      status: msg.status,
    }
  } catch (err) {
    console.error('[twilio SMS]', err.message)
    return {
      configured: true,
      sent: false,
      channel: 'sms',
      reason: 'provider_error',
      message: err.message,
    }
  }
}

async function sendPrescriptionWhatsApp(patientPhone, prescription) {
  const phone = toE164India(patientPhone || prescription.patientPhone)
  if (!phone) {
    return { configured: isWhatsAppConfigured(), sent: false, reason: 'no_phone', channel: 'whatsapp' }
  }
  if (!isWhatsAppConfigured()) {
    return {
      configured: false,
      sent: false,
      reason: 'not_configured',
      channel: 'whatsapp',
      message: 'WhatsApp is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.',
    }
  }

  const client = getClient()
  const fromRaw = String(process.env.TWILIO_WHATSAPP_FROM || process.env.WHATSAPP_FROM).trim()
  const from = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`
  const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`
  const token = ensureAccessToken(prescription)
  const link = `${publicBaseUrl()}/api/prescriptions/access/${token}/pdf`
  const textBody =
    `Arogyabodhini: Your prescription from Dr. ${prescription.doctorName || 'your doctor'} is ready. ` +
    `Open your signed PDF: ${link}`

  const baseUrl = publicBaseUrl()
  const canHostMedia = /^https:\/\//i.test(baseUrl) && !/localhost|127\.0\.0\.1/i.test(baseUrl)

  // 1) Prefer PDF media when PUBLIC_API_URL is publicly reachable over HTTPS
  if (canHostMedia) {
    try {
      const { publicUrl } = await writeTempPdf(prescription)
      const msg = await client.messages.create({
        from,
        to,
        body: `Arogyabodhini: Your prescription from Dr. ${prescription.doctorName || 'your doctor'} is attached.`,
        mediaUrl: [publicUrl],
      })
      return {
        configured: true,
        sent: true,
        channel: 'whatsapp',
        sid: msg.sid,
        status: msg.status,
        mediaUrl: publicUrl,
        mode: 'pdf_media',
      }
    } catch (err) {
      console.warn('[twilio WhatsApp] PDF media failed, falling back to text link:', err.message)
    }
  } else {
    console.warn('[twilio WhatsApp] PUBLIC_API_URL is not public HTTPS — sending text link (no PDF media).')
  }

  // 2) Text + secure link (works better on Twilio trial / sandbox)
  try {
    if (prescription.save) await prescription.save().catch(() => {})
    const msg = await client.messages.create({
      from,
      to,
      body: textBody,
    })
    return {
      configured: true,
      sent: true,
      channel: 'whatsapp',
      sid: msg.sid,
      status: msg.status,
      mode: 'text_link',
      accessLink: link,
    }
  } catch (err) {
    console.error('[twilio WhatsApp]', err.message)
    return {
      configured: true,
      sent: false,
      channel: 'whatsapp',
      reason: 'provider_error',
      message: err.message,
    }
  }
}

module.exports = {
  isSmsConfigured,
  isWhatsAppConfigured,
  isTwilioConfigured,
  sendPrescriptionSMS,
  sendPrescriptionWhatsApp,
  ensureAccessToken,
  buildPrescriptionPdfBuffer,
  writeTempPdf,
}

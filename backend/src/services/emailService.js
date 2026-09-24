const nodemailer = require('nodemailer');

let transporterInstance = null;

function createTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: { user, pass },
    family: 4,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

function getTransporter() {
  if (!transporterInstance) {
    transporterInstance = createTransporter();
  }
  return transporterInstance;
}

function isSmtpConfigured() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  if (!user || !pass) return false;
  if (user === 'your_email@gmail.com' || user === 'dummy@gmail.com') return false;
  if (pass === 'dummypass' || pass === 'your_email_password') return false;
  return true;
}

function isTwilioEmailConfigured() {
  const sid = String(process.env.TWILIO_ACCOUNT_SID || '').trim()
  const token = String(process.env.TWILIO_AUTH_TOKEN || '').trim()
  const from = String(process.env.TWILIO_EMAIL_FROM || '').trim()
  if (!sid || !token || !from) return false
  if (sid.startsWith('your-') || token.startsWith('your-')) return false
  return true
}

function isEmailConfigured() {
  const provider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase()
  if (provider === 'twilio') return isTwilioEmailConfigured()
  // Prefer Twilio Email if configured; otherwise SMTP
  return isTwilioEmailConfigured() || isSmtpConfigured()
}

function getFromAddress() {
  if (process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('no-reply@arogyabhodhini.com')) {
    return process.env.EMAIL_FROM;
  }
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@arogyabhodhini.com';
  return `"Arogyabodhini Healthcare" <${user}>`;
}

function buildPrescriptionHtml(prescription, medicinesHtml) {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1565c0; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Arogyabodhini Healthcare</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">Verified Teleconsultation Prescription</p>
        </div>
        <div style="padding: 24px;">
          <p>Dear ${prescription.patientName || 'Patient'},</p>
          <p>Your signed prescription from <strong>Dr. ${prescription.doctorName}</strong> is attached as a PDF.</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>
            <p style="margin: 0;"><strong>Ref:</strong> ${prescription.prescriptionId || prescription._id}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left;">
                <th style="padding: 12px;">Medicine</th>
                <th style="padding: 12px;">Dosage</th>
                <th style="padding: 12px;">Timing</th>
                <th style="padding: 12px;">Duration</th>
                <th style="padding: 12px;">Instructions</th>
              </tr>
            </thead>
            <tbody>${medicinesHtml}</tbody>
          </table>
          <p style="font-size: 12px; color: #94a3b8;">Cryptographically signed prescription (not a government e-sign). Key: ${prescription.signingKeyId || prescription.digitalSignatureHash || ''}</p>
        </div>
      </div>
    `
}

async function sendViaTwilioEmail({ to, toName, subject, html, pdfAttachment }) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const fromAddress = process.env.TWILIO_EMAIL_FROM
  const fromName = process.env.TWILIO_EMAIL_FROM_NAME || 'Arogyabodhini Healthcare'

  const content = {
    subject,
    html,
  }
  if (pdfAttachment?.content) {
    content.attachments = [{
      filename: pdfAttachment.filename,
      type: 'application/pdf',
      content: Buffer.isBuffer(pdfAttachment.content)
        ? pdfAttachment.content.toString('base64')
        : String(pdfAttachment.content),
    }]
  }

  const body = {
    from: { address: fromAddress, name: fromName },
    to: [{ address: to, name: toName || to }],
    content,
  }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const res = await fetch('https://comms.twilio.com/v1/Emails', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const raw = await res.text()
  let data = {}
  try { data = JSON.parse(raw) } catch { data = { raw } }

  if (!res.ok && res.status !== 202) {
    const message = data.message || data.error || raw || `Twilio Email HTTP ${res.status}`
    throw new Error(message)
  }

  return {
    success: true,
    sent: true,
    configured: true,
    channel: 'email',
    provider: 'twilio_email',
    messageId: data.operationId || data.id || null,
    pdfAttached: Boolean(pdfAttachment),
  }
}

const sendPrescriptionEmail = async (prescription) => {
  const to = String(prescription.patientEmail || '').trim()
  if (!to || !to.includes('@')) {
    return { configured: isEmailConfigured(), sent: false, reason: 'no_email', channel: 'email' }
  }
  if (!isEmailConfigured()) {
    console.log('[EmailService] Email not configured. Skipping prescription email dispatch to:', to)
    return { configured: false, sent: false, skipped: true, reason: 'not_configured', channel: 'email' }
  }

  const medicinesHtml = (prescription.medicines || []).map(med => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.dosage}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.frequency}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.duration}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.instructions || ''}</td>
    </tr>
  `).join('');

  let pdfAttachment = null
  try {
    const { buildPrescriptionPdfBuffer } = require('./prescriptionPdfService')
    const pdfBuf = await buildPrescriptionPdfBuffer(prescription)
    pdfAttachment = {
      filename: `prescription-${prescription.prescriptionId || 'rx'}.pdf`,
      content: pdfBuf,
      contentType: 'application/pdf',
    }
  } catch (pdfErr) {
    console.error('[EmailService] PDF build failed:', pdfErr.message)
  }

  const html = buildPrescriptionHtml(prescription, medicinesHtml)
  const subject = 'Your Arogyabodhini Prescription'
  const provider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase()
  const useTwilio = provider === 'twilio' || (isTwilioEmailConfigured() && !isSmtpConfigured()) || (provider !== 'smtp' && isTwilioEmailConfigured())

  if (useTwilio && isTwilioEmailConfigured()) {
    try {
      const result = await sendViaTwilioEmail({
        to,
        toName: prescription.patientName,
        subject,
        html,
        pdfAttachment,
      })
      console.log(`[EmailService] Twilio Email accepted for ${to} (operationId: ${result.messageId})`)
      return result
    } catch (err) {
      console.error(`[EmailService] Twilio Email failed for ${to}:`, err.message)
      // Fall through to SMTP if available
      if (!isSmtpConfigured()) {
        return { success: false, sent: false, configured: true, channel: 'email', error: err.message, reason: 'provider_error', provider: 'twilio_email' }
      }
      console.log('[EmailService] Falling back to SMTP…')
    }
  }

  const mailOptions = {
    from: getFromAddress(),
    to: prescription.patientEmail,
    subject,
    html,
    attachments: pdfAttachment ? [pdfAttachment] : [],
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Prescription successfully sent to ${prescription.patientEmail} (MessageID: ${info.messageId})`);
    return {
      success: true,
      sent: true,
      configured: true,
      channel: 'email',
      provider: 'smtp',
      messageId: info.messageId,
      pdfAttached: Boolean(pdfAttachment),
    };
  } catch (err) {
    console.error(`[EmailService] Error sending prescription email to ${prescription.patientEmail}:`, err.message);
    return { success: false, sent: false, configured: true, channel: 'email', error: err.message, reason: 'provider_error' };
  }
};

const sendDoctorRejectionEmail = async (email, name, reason) => {
  if (!isSmtpConfigured()) {
    console.log(`[EmailService] SMTP not configured. Doctor rejection email simulated for ${email} (Reason: ${reason})`);
    return { skipped: true };
  }
  const textBody = `
Dear Dr. ${name},

Thank you for your interest in joining the Arogyabodhini Telemedicine network.

After careful review of your submitted credentials, your application could not be approved at this time for the following reason:
Reason: ${reason}

If you believe this is an error or wish to provide updated documentation, you may re-apply through our registration portal.

Best regards,
Arogyabodhini Credentialing Team • Telemedicine Compliance Division
`.trim();

  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: `Arogyabodhini Application Update - Dr. ${name}`,
    text: textBody,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1565c0; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Arogyabodhini Healthcare</h1>
          <p style="margin: 4px 0 0; opacity: 0.9;">Doctor Credentialing Board</p>
        </div>
        <div style="padding: 24px;">
          <h2 style="color: #0f172a;">Dear Dr. ${name},</h2>
          <p style="color: #334155; line-height: 1.6;">Thank you for your interest in joining the Arogyabodhini Telemedicine network.</p>
          <p style="color: #334155; line-height: 1.6;">After careful review of your submitted credentials, your application could not be approved at this time for the following reason:</p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
            <p style="margin: 0; color: #b91c1c; font-weight: 600;">Reason: ${reason}</p>
          </div>
          <p style="color: #334155; line-height: 1.6;">If you believe this is an error or wish to provide updated documentation, you may re-apply through our registration portal.</p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">
            <p style="margin: 0;">Arogyabodhini Credentialing Team • Telemedicine Compliance Division</p>
          </div>
        </div>
      </div>
    `
  };
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Rejection email successfully dispatched to ${email} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Error sending rejection email to ${email}:`, err.message);
    return { success: false, error: err.message };
  }
};

const sendDoctorApprovalEmail = async (email, name) => {
  if (!isSmtpConfigured()) {
    console.log(`[EmailService] SMTP not configured. Doctor approval email simulated for ${email}`);
    return { skipped: true };
  }

  const textBody = `
Dear Dr. ${name},

We are pleased to inform you that your medical license and credentials have been verified. Your doctor account is now active on the Arogyabodhini telemedicine platform.

Your Account Credentials:
- Login Portal: Doctor Portal
- Registered Email: ${email}
- Password: The password you created during registration

Next Steps:
1. Sign in to the Doctor Portal with your registered credentials.
2. Toggle your status to Available to receive incoming patient teleconsultation calls.
3. Conduct HD video consultations and issue digitally signed prescriptions.

Need assistance? Contact our provider support at support@arogyabhodhini.com.

Best regards,
The Arogyabodhini Telemedicine Network
`.trim();

  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: `Arogyabodhini Doctor Account Approved - Dr. ${name}`,
    text: textBody,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1565c0; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Arogyabodhini Healthcare</h1>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Telemedicine Provider Network</p>
        </div>
        <div style="padding: 24px; color: #334155;">
          <h2 style="color: #0f172a; margin-top: 0;">Welcome, Dr. ${name}!</h2>
          <p style="line-height: 1.6;">We are pleased to inform you that your medical license and credentials have been verified. Your doctor account is now <strong>active</strong> on the Arogyabodhini telemedicine platform.</p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #166534; font-size: 15px;">Your Account Credentials</h3>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Login Portal:</strong> Doctor Portal</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Registered Email:</strong> ${email}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Password:</strong> The password you created during registration</p>
          </div>

          <h3 style="color: #0f172a; font-size: 15px; margin-top: 20px;">Next Steps:</h3>
          <ol style="line-height: 1.8; padding-left: 20px; font-size: 14px;">
            <li>Sign in to the Doctor Portal with your registered credentials.</li>
            <li>Toggle your status to <strong>Available</strong> to receive incoming patient teleconsultation calls.</li>
            <li>Conduct HD video consultations and issue digitally signed prescriptions.</li>
          </ol>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
            <p style="margin: 0;">Need assistance? Contact our provider support at support@arogyabhodhini.com</p>
          </div>
        </div>
      </div>
    `
  };
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Approval email successfully dispatched to ${email} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Error sending approval email to ${email}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendPrescriptionEmail,
  sendDoctorRejectionEmail,
  sendDoctorApprovalEmail,
  isSmtpConfigured,
  isEmailConfigured,
  isTwilioEmailConfigured,
};

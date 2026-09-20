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

function getFromAddress() {
  if (process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('no-reply@arogyabhodhini.com')) {
    return process.env.EMAIL_FROM;
  }
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@arogyabhodhini.com';
  return `"Arogyabodhini Healthcare" <${user}>`;
}

const sendPrescriptionEmail = async (prescription) => {
  if (!isSmtpConfigured()) {
    console.log('[EmailService] SMTP not configured. Skipping prescription email dispatch to:', prescription.patientEmail);
    return { skipped: true };
  }

  const medicinesHtml = prescription.medicines.map(med => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.dosage}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.frequency}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.duration}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${med.instructions}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: getFromAddress(),
    to: prescription.patientEmail,
    subject: `Your Digital Prescription from Dr. ${prescription.doctorName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1565c0; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Arogyabodhini Healthcare</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">Verified Teleconsultation Prescription</p>
        </div>
        <div style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1565c0; padding-bottom: 16px; margin-bottom: 24px;">
            <div>
              <h2 style="margin: 0; color: #0f172a; font-size: 18px;">Dr. ${prescription.doctorName}</h2>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">${prescription.doctorSpecialty}</p>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Reg No: ${prescription.doctorRegNo}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Date: ${new Date(prescription.prescribedAt).toLocaleDateString()}</p>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Ref ID: ${prescription._id}</p>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px;"><strong>Patient:</strong> ${prescription.patientName} (${prescription.patientAge || '-'} yrs, ${prescription.patientGender || '-'})</p>
            <p style="margin: 0;"><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>
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
            <tbody>
              ${medicinesHtml}
            </tbody>
          </table>

          ${prescription.clinicalAdvice ? `
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px; font-size: 16px; color: #0f172a;">Clinical Advice:</h3>
              <p style="margin: 0; color: #475569;">${prescription.clinicalAdvice}</p>
            </div>
          ` : ''}

          <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
            <div style="display: inline-block; padding: 12px 24px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-weight: 600; font-size: 14px;">
              ✓ Digitally Signed & Certified under Indian Telemedicine Practice Guidelines 2020.
            </div>
            <p style="margin-top: 12px; font-size: 12px; color: #94a3b8;">Hash: ${prescription.digitalSignatureHash}</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Prescription successfully sent to ${prescription.patientEmail} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Error sending prescription email to ${prescription.patientEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

const sendDoctorRejectionEmail = async (email, name, reason) => {
  if (!isSmtpConfigured()) {
    console.log(`[EmailService] SMTP not configured. Doctor rejection email simulated for ${email} (Reason: ${reason})`);
    return { skipped: true };
  }
  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: `Update on your Arogyabodhini Doctor Application`,
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
  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: `Congratulations Dr. ${name}! Your Arogyabodhini Account is Approved`,
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

module.exports = { sendPrescriptionEmail, sendDoctorRejectionEmail, sendDoctorApprovalEmail };

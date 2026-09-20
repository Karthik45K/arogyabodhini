const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'dummy@gmail.com',
    pass: process.env.EMAIL_PASS || 'dummypass',
  },
});

const sendPrescriptionEmail = async (prescription) => {
  if (process.env.EMAIL_USER === 'your_email@gmail.com' || !process.env.EMAIL_USER) {
    console.log('[EmailService] SMTP not configured. Skipping email dispatch.');
    return;
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
    from: process.env.EMAIL_FROM || '"Arogyabodhini Healthcare" <no-reply@arogyabhodhini.com>',
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
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Prescription sent to ${prescription.patientEmail}`);
  } catch (err) {
    console.error(`[EmailService] Error sending email to ${prescription.patientEmail}:`, err.message);
  }
};

const sendDoctorRejectionEmail = async (email, name, reason) => {
  if (process.env.EMAIL_USER === 'your_email@gmail.com' || !process.env.EMAIL_USER) return;
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Arogyabodhini Healthcare" <no-reply@arogyabhodhini.com>',
    to: email,
    subject: `Update on your Arogyabodhini Doctor Application`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1565c0; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Arogyabodhini Healthcare</h1>
        </div>
        <div style="padding: 24px;">
          <h2>Dear Dr. ${name},</h2>
          <p>Thank you for your interest in joining the Arogyabodhini Telemedicine network.</p>
          <p>Unfortunately, your application could not be approved at this time for the following reason:</p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #b91c1c;"><strong>Reason:</strong> ${reason}</p>
          </div>
          <p>You can update your application and re-apply at any time.</p>
          <p>Best regards,<br>The Arogyabodhini Team</p>
        </div>
      </div>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(`[EmailService] Error sending rejection email to ${email}:`, err.message);
  }
};

const sendDoctorApprovalEmail = async (email, name) => {
  if (process.env.EMAIL_USER === 'your_email@gmail.com' || !process.env.EMAIL_USER) return;
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Arogyabodhini Healthcare" <no-reply@arogyabhodhini.com>',
    to: email,
    subject: `Welcome to Arogyabodhini, Dr. ${name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1565c0; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Arogyabodhini Healthcare</h1>
        </div>
        <div style="padding: 24px;">
          <h2>Dear Dr. ${name},</h2>
          <p>Congratulations! Your application has been approved.</p>
          <p>You can now log in to your Doctor Dashboard to manage your availability and accept telemedicine consultations.</p>
          <p>Best regards,<br>The Arogyabodhini Team</p>
        </div>
      </div>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(`[EmailService] Error sending approval email to ${email}:`, err.message);
  }
};

module.exports = { sendPrescriptionEmail, sendDoctorRejectionEmail, sendDoctorApprovalEmail };

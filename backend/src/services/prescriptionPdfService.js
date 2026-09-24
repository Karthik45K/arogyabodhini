/**
 * Medical-format signed prescription PDF (A4).
 * Used for email attachment, WhatsApp/SMS access download.
 */
const PDFDocument = require('pdfkit')

const COLORS = {
  ink: '#0f172a',
  muted: '#64748b',
  line: '#cbd5e1',
  brand: '#0284c7',
  brandDark: '#0c4a6e',
  soft: '#f1f5f9',
  softBlue: '#f0f9ff',
  softCyan: '#ecfeff',
  softYellow: '#fefce8',
  white: '#ffffff',
  tableHead: '#0f172a',
}

function drawRoundedRect(doc, x, y, w, h, r = 6) {
  doc.roundedRect(x, y, w, h, r)
}

function trunc(text, max = 80) {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function formatIssued(prescription) {
  const d = prescription.prescribedAt ? new Date(prescription.prescribedAt) : new Date()
  if (Number.isNaN(d.getTime())) return new Date().toLocaleString('en-IN')
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function doctorDisplayName(prescription) {
  const raw = String(prescription.doctorName || 'Doctor').trim()
  return raw.replace(/^(dr\.?\s*)+/i, '')
}

function buildPrescriptionPdfBuffer(prescription) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 40, left: 40, right: 40 },
        info: {
          Title: `Prescription ${prescription.prescriptionId || ''}`,
          Author: `Dr. ${doctorDisplayName(prescription)}`,
          Subject: 'Arogyabodhini digitally signed prescription',
        },
      })
      const chunks = []
      doc.on('data', (c) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageW = doc.page.width
      const left = doc.page.margins.left
      const right = pageW - doc.page.margins.right
      const contentW = right - left
      const meds = Array.isArray(prescription.medicines) ? prescription.medicines : []
      const issued = formatIssued(prescription)
      const rxId = prescription.prescriptionId || prescription._id || 'RX'
      const consultId = prescription.consultationId || ''
      const signed = String(prescription.signatureStatus || '').includes('signed')
        || Boolean(prescription.signature || prescription.signingKeyId)
      const sigKey = trunc(
        prescription.signingKeyId || prescription.digitalSignatureHash || prescription.signature || 'pending',
        42
      )
      const advice = prescription.clinicalAdvice || prescription.advice || ''
      const followUp = prescription.followUp || ''

      // ── Header bar ──
      doc.save()
      doc.rect(0, 0, pageW, 72).fill(COLORS.brand)
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(18)
        .text('AROGYABODHINI', left, 18, { width: contentW * 0.65 })
      doc.font('Helvetica').fontSize(9)
        .text('AI-Powered Multilingual Telemedicine  ·  Digitally Signed e-Prescription', left, 42, {
          width: contentW * 0.7,
        })
      doc.font('Helvetica-Bold').fontSize(10)
        .text('e-PRESCRIPTION', right - 120, 22, { width: 120, align: 'right' })
      doc.font('Helvetica').fontSize(8)
        .text(issued, right - 120, 40, { width: 120, align: 'right' })
      doc.restore()

      let y = 88

      // ── Meta row ──
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      doc.text(`Ref: ${rxId}`, left, y)
      if (consultId) doc.text(`Consultation: ${consultId}`, left + contentW * 0.42, y)
      doc.text('A4 Medical Format', right - 100, y, { width: 100, align: 'right' })
      y += 14
      doc.moveTo(left, y).lineTo(right, y).lineWidth(2).strokeColor(COLORS.brand).stroke()
      y += 14

      // ── Doctor card ──
      drawRoundedRect(doc, left, y, contentW, 58, 8)
      doc.fillColor(COLORS.soft).fill()
      doc.roundedRect(left, y, contentW, 58, 8).lineWidth(1).strokeColor(COLORS.line).stroke()

      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(13)
        .text(`Dr. ${doctorDisplayName(prescription)}`, left + 14, y + 12, { width: contentW * 0.6 })
      doc.fillColor(COLORS.brandDark).font('Helvetica').fontSize(10)
        .text(prescription.doctorSpecialty || 'Consulting Physician', left + 14, y + 30, {
          width: contentW * 0.55,
        })
      doc.fillColor(COLORS.muted).fontSize(9)
        .text(`Reg. No: ${prescription.doctorRegNo || '—'}`, left + 14, y + 44, { width: contentW * 0.55 })

      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
        .text('Issued', right - 130, y + 12, { width: 116, align: 'right' })
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9)
        .text(issued, right - 130, y + 24, { width: 116, align: 'right' })
      y += 72

      // ── Patient block ──
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9)
        .text('PATIENT DETAILS', left, y)
      y += 12

      const boxH = 52
      drawRoundedRect(doc, left, y, contentW, boxH, 8)
      doc.fillColor(COLORS.soft).fill()
      doc.roundedRect(left, y, contentW, boxH, 8).strokeColor(COLORS.line).stroke()

      const colW = contentW / 4
      const fields = [
        ['Patient Name', prescription.patientName || '—'],
        ['Age', prescription.patientAge ? String(prescription.patientAge) : '—'],
        ['Gender', prescription.patientGender || '—'],
        ['Mobile', prescription.patientPhone || '—'],
      ]
      fields.forEach((f, i) => {
        const x = left + 12 + i * colW
        doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7).text(f[0].toUpperCase(), x, y + 10, { width: colW - 16 })
        doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11).text(String(f[1]), x, y + 24, { width: colW - 16 })
      })
      y += boxH + 14

      // ── Diagnosis ──
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9).text('DIAGNOSIS / CLINICAL FINDING', left, y)
      y += 10
      drawRoundedRect(doc, left, y, contentW, 36, 6)
      doc.fillColor(COLORS.softCyan).fill()
      doc.save()
      doc.rect(left, y, 4, 36).fill(COLORS.brand)
      doc.restore()
      doc.roundedRect(left, y, contentW, 36, 6).strokeColor('#a5f3fc').stroke()
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11)
        .text(prescription.diagnosis || 'Clinical consultation', left + 14, y + 12, { width: contentW - 24 })
      y += 50

      // ── Rx heading ──
      doc.fillColor(COLORS.brand).font('Times-Bold').fontSize(28).text('℞', left, y - 4)
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12)
        .text('MEDICINES PRESCRIBED', left + 28, y + 6)
      y += 28

      // Table header
      const cols = [
        { label: '#', w: 28 },
        { label: 'Medicine', w: contentW * 0.34 },
        { label: 'Dosage', w: contentW * 0.16 },
        { label: 'Frequency', w: contentW * 0.18 },
        { label: 'Duration', w: contentW * 0.16 },
      ]
      // fix last col width to fill
      const used = cols.reduce((s, c) => s + c.w, 0)
      cols[cols.length - 1].w += contentW - used

      doc.save()
      doc.rect(left, y, contentW, 22).fill(COLORS.tableHead)
      let x = left
      cols.forEach((c) => {
        doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8)
          .text(c.label.toUpperCase(), x + 6, y + 7, { width: c.w - 10 })
        x += c.w
      })
      doc.restore()
      y += 22

      if (!meds.length) {
        doc.rect(left, y, contentW, 28).strokeColor(COLORS.line).stroke()
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10)
          .text('No medicines listed', left + 10, y + 9)
        y += 36
      } else {
        meds.forEach((m, i) => {
          const rowH = 30
          if (y + rowH > doc.page.height - 160) {
            doc.addPage()
            y = 48
          }
          if (i % 2 === 0) {
            doc.rect(left, y, contentW, rowH).fill('#f8fafc')
          }
          doc.rect(left, y, contentW, rowH).strokeColor(COLORS.line).lineWidth(0.5).stroke()
          const vals = [
            String(i + 1),
            m.name || '—',
            m.dosage || '—',
            m.frequency || '—',
            m.duration || '—',
          ]
          x = left
          vals.forEach((v, vi) => {
            doc.fillColor(COLORS.ink)
              .font(vi === 1 ? 'Helvetica-Bold' : 'Helvetica')
              .fontSize(9)
              .text(trunc(v, vi === 1 ? 36 : 22), x + 6, y + 10, { width: cols[vi].w - 10 })
            x += cols[vi].w
          })
          y += rowH
          if (m.instructions) {
            doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(8)
              .text(`Instructions: ${m.instructions}`, left + 34, y - 2, { width: contentW - 44 })
            y += 12
          }
        })
      }

      y += 10

      // ── Advice ──
      if (advice) {
        doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9).text('DOCTOR\'S ADVICE / PRECAUTIONS', left, y)
        y += 10
        const adviceHeight = Math.max(40, doc.heightOfString(advice, { width: contentW - 24, fontSize: 10 }) + 20)
        drawRoundedRect(doc, left, y, contentW, adviceHeight, 6)
        doc.fillColor(COLORS.softYellow).fill()
        doc.roundedRect(left, y, contentW, adviceHeight, 6).strokeColor('#fde68a').stroke()
        doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10)
          .text(advice, left + 12, y + 10, { width: contentW - 24 })
        y += adviceHeight + 12
      }

      if (followUp) {
        doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10)
          .text(`Follow-up: ${followUp}`, left, y, { width: contentW })
        y += 18
      }

      // ── Signature / seal section ──
      if (y > doc.page.height - 150) {
        doc.addPage()
        y = 48
      }

      y += 8
      doc.moveTo(left, y).lineTo(right, y).dash(4, { space: 3 }).strokeColor(COLORS.line).stroke()
      doc.undash()
      y += 16

      const sealW = 210
      const sealH = 86
      const sealX = left
      const signX = right - 200

      // Cryptographic seal box
      drawRoundedRect(doc, sealX, y, sealW, sealH, 8)
      doc.fillColor(COLORS.softBlue).fill()
      doc.roundedRect(sealX, y, sealW, sealH, 8).lineWidth(2).strokeColor(COLORS.brand).stroke()

      doc.fillColor(COLORS.brand).font('Helvetica-Bold').fontSize(9)
        .text(signed ? '✓ CRYPTOGRAPHICALLY SIGNED' : '⚠ NOT SIGNED', sealX + 12, y + 12, { width: sealW - 24, align: 'center' })
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8)
        .text('Digitally signed e-prescription', sealX + 12, y + 28, { width: sealW - 24, align: 'center' })
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
        .text(`Key: ${sigKey}`, sealX + 12, y + 44, { width: sealW - 24, align: 'center' })
      doc.fillColor(COLORS.muted).fontSize(7)
        .text('Not a government e-sign', sealX + 12, y + 58, { width: sealW - 24, align: 'center' })
      doc.text(signed ? 'Verified by Arogyabodhini signing service' : 'Pending signature', sealX + 12, y + 70, {
        width: sealW - 24,
        align: 'center',
      })

      // Doctor sign-off
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
        .text('Authorised Prescriber', signX, y + 8, { width: 190, align: 'right' })
      doc.fillColor(COLORS.brandDark).font('Times-BoldItalic').fontSize(16)
        .text(`Dr. ${doctorDisplayName(prescription)}`, signX, y + 26, { width: 190, align: 'right' })
      doc.moveTo(signX + 40, y + 50).lineTo(signX + 190, y + 50).strokeColor(COLORS.ink).lineWidth(1).stroke()
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10)
        .text(`Dr. ${doctorDisplayName(prescription)}`, signX, y + 56, { width: 190, align: 'right' })
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
        .text(prescription.doctorSpecialty || 'Physician', signX, y + 70, { width: 190, align: 'right' })

      // Footer
      const footerY = doc.page.height - 36
      doc.moveTo(left, footerY - 10).lineTo(right, footerY - 10).strokeColor(COLORS.line).lineWidth(0.8).stroke()
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
        .text(
          'This is a cryptographically signed prescription issued by an authenticated doctor on Arogyabodhini. '
          + 'It is not a regulated government e-prescription. For emergencies dial 108.',
          left,
          footerY - 4,
          { width: contentW, align: 'center' }
        )

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = { buildPrescriptionPdfBuffer }

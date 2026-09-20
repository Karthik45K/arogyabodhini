const { v4: uuidv4 } = (() => {
  try { return require('uuid') } catch { return { v4: () => `BK-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}` } }
})()

const generateBookingId = () => `MED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`

/** Validate date is today or future */
const isValidFutureDate = (dateStr) => {
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0,0,0,0)
  return !isNaN(d) && d >= today
}

/** POST /api/book-appointment */
const bookAppointment = (req, res, next) => {
  try {
    const {
      patientName, age, gender, consultationType,
      date, timeSlot, languagePreference,
      symptoms, doctorId, doctorName, specialty,
    } = req.body

    // Validation
    const errors = []
    if (!patientName?.trim())      errors.push('patientName is required')
    if (!age || age < 1 || age > 120) errors.push('age must be between 1 and 120')
    if (!gender)                   errors.push('gender is required')
    if (!consultationType || !['online','hospital'].includes(consultationType))
      errors.push('consultationType must be "online" or "hospital"')
    if (!date || !isValidFutureDate(date)) errors.push('date must be today or a future date')
    if (!timeSlot?.trim())         errors.push('timeSlot is required')
    if (!doctorId?.trim())         errors.push('doctorId is required')

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', messages: errors })
    }

    const bookingId = generateBookingId()
    const confirmedAt = new Date().toISOString()

    // Phase 5: persist to DB here
    res.status(201).json({
      success: true,
      data: {
        bookingId,
        patientName: patientName.trim(),
        doctorId,
        doctorName,
        specialty,
        consultationType,
        date,
        timeSlot,
        languagePreference: languagePreference || 'en',
        status: 'CONFIRMED',
        confirmedAt,
        instructions: consultationType === 'online'
          ? 'You will receive a video call link 15 minutes before your appointment via SMS/email.'
          : 'Please arrive 15 minutes early with your reports and government-issued ID.',
        emergencyContact: '108',
      },
    })
  } catch (err) { next(err) }
}

module.exports = { bookAppointment }

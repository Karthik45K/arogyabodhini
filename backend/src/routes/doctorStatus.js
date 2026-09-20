const express = require('express')
const mongoose = require('mongoose')
const Doctor = require('../models/Doctor')

const router = express.Router()
const doctorStatuses = new Map()

router.get('/doctor-status/:doctorId', async (req, res) => {
  const { doctorId } = req.params
  try {
    const query = [{ entry_id: doctorId }, { id: doctorId }]
    if (mongoose.Types.ObjectId.isValid(doctorId)) query.push({ _id: doctorId })
    const doctor = await Doctor.findOne({ $or: query }).lean()
    const isActive = doctor ? (doctor.availabilityStatus === 'available' || doctor.isActive === true) : (doctorStatuses.get(doctorId) === true)
    res.json({
      success: true,
      doctorId,
      isActive,
    })
  } catch {
    res.json({
      success: true,
      doctorId,
      isActive: doctorStatuses.get(doctorId) === true,
    })
  }
})

router.patch('/doctor-status/:doctorId', async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'isActive must be a boolean.' })
  }

  const { doctorId } = req.params
  const { isActive } = req.body
  doctorStatuses.set(doctorId, isActive)

  try {
    const query = [{ entry_id: doctorId }, { id: doctorId }]
    if (mongoose.Types.ObjectId.isValid(doctorId)) query.push({ _id: doctorId })
    await Doctor.updateOne(
      { $or: query },
      { 
        $set: { 
          availabilityStatus: isActive ? 'available' : 'unavailable',
          availability: isActive ? 'Available Now' : 'Not Available',
          isActive 
        } 
      }
    )
  } catch (err) {
    console.warn('[doctorStatus] Mongo update failed:', err.message)
  }

  return res.json({
    success: true,
    doctorId,
    isActive,
  })
})

module.exports = router
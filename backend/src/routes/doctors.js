const express = require('express')
const { getDoctorsByDisease, getDoctorsBySpecialty } = require('../controllers/doctorsController')

const router = express.Router()

/**
 * @route   GET /api/doctors/by-disease/:disease
 * @desc    Look up specialty for a disease, then return matching doctors
 * @access  Public
 */
router.get('/doctors/by-disease/:disease', getDoctorsByDisease)

/**
 * @route   GET /api/doctors/by-specialty/:specialty
 * @desc    Return doctors for an exact recommended specialty (no GP fallback)
 * @access  Public
 */
router.get('/doctors/by-specialty/:specialty', getDoctorsBySpecialty)

module.exports = router

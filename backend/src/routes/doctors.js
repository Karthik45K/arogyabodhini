const express = require('express')
const { getDoctorsByDisease } = require('../controllers/doctorsController')

const router = express.Router()

/**
 * @route   GET /api/doctors/by-disease/:disease
 * @desc    Look up specialty for a disease, then return matching doctors
 * @access  Public
 */
router.get('/doctors/by-disease/:disease', getDoctorsByDisease)

module.exports = router

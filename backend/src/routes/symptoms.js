const express = require('express')
const { analyzeSymptoms } = require('../controllers/symptomsController')

const router = express.Router()

/**
 * @route   POST /api/analyze-symptoms
 * @desc    Analyze patient symptoms and return disease predictions
 * @access  Public (Phase 2 — auth will be added in Phase 4)
 * @body    { symptoms: string, language?: string }
 */
router.post('/analyze-symptoms', analyzeSymptoms)

module.exports = router

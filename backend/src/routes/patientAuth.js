const express = require('express')
const router = express.Router()
const { getProfile, loginPatient, logoutPatient, registerPatient } = require('../controllers/patientAuthController')
const { requirePatient } = require('../middleware/patientAuth')

router.post('/register', registerPatient)
router.post('/login', loginPatient)
router.get('/me', requirePatient, getProfile)
router.post('/logout', requirePatient, logoutPatient)

module.exports = router
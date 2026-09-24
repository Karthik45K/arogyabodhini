const express = require('express')
const router = express.Router()
const { getProfile, updateProfile, loginPatient, logoutPatient, registerPatient, continueWithPhone } = require('../controllers/patientAuthController')
const { requirePatient } = require('../middleware/patientAuth')

router.post('/register', registerPatient)
router.post('/login', loginPatient)
router.post('/continue', continueWithPhone)
router.get('/me', requirePatient, getProfile)
router.patch('/me', requirePatient, updateProfile)
router.post('/logout', requirePatient, logoutPatient)

module.exports = router
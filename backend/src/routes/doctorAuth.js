const express = require('express')
const { loginDoctor } = require('../controllers/doctorAuthController')
const { requireDoctor } = require('../middleware/doctorAuth')

const router = express.Router()

router.post('/doctor-auth/login', loginDoctor)
router.post('/doctor-auth/logout', requireDoctor, async (req, res, next) => {
	try {
		const Doctor = require('../models/Doctor')
		await Doctor.updateOne({ _id: req.doctor._id }, { $set: { sessionTokenHash: null, sessionExpiresAt: null } })
		res.json({ success: true })
	} catch (error) { next(error) }
})

module.exports = router
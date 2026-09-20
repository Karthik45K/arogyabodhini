const express = require('express')
const cors    = require('cors')
const { errorHandler } = require('./middleware/errorHandler')
const symptomsRouter       = require('./routes/symptoms')
const videoRouter          = require('./routes/video')
const consultationsRouter  = require('./routes/consultations')
const doctorsRouter        = require('./routes/doctors')
const doctorAuthRouter     = require('./routes/doctorAuth')
const doctorStatusRouter   = require('./routes/doctorStatus')
const patientAuthRouter    = require('./routes/patientAuth')
const patientRouter        = require('./routes/patient')

const doctorRegistrationRouter = require('./routes/doctorRegistration')
const adminRouter = require('./routes/admin')

const path = require('path')

const app = express()

app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 🚀🚀🚀 CORS 🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
// Allow all origins universally while supporting credentials
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// 🚀🚀🚀 BODY PARSING 🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
app.use(express.json({ limit: '50kb' }))
app.use(express.urlencoded({ extended: true, limit: '50kb' }))

// 🚀🚀🚀 REQUEST LOGGER (dev only) 🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
    next()
  })
}

// 🚀🚀🚀 HEALTH CHECK & ROOT PING 🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
const mongoose = require('mongoose')

app.get('/', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'Arogyabodhini Healthcare Backend API',
    version: '2.0.0',
    uptime:  Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'connecting'
  res.json({
    status:  'ok',
    service: 'Arogyabodhini Backend',
    version: '2.0.0',
    env:     process.env.NODE_ENV || 'development',
    uptime:  Math.round(process.uptime()),
    database: dbStatus,
  })
})

// 🚀🚀🚀 API ROUTES 🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
app.use('/api', symptomsRouter)
app.use('/api', videoRouter)
app.use('/api', consultationsRouter)
app.use('/api', doctorsRouter)
app.use('/api', doctorAuthRouter)
app.use('/api', doctorRegistrationRouter)
app.use('/api', doctorStatusRouter)
app.use('/api/patient-auth', patientAuthRouter)
app.use('/api', patientRouter)
app.use('/api', adminRouter)

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
  })
})

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use(errorHandler)

module.exports = app

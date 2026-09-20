/**
 * video.js — Express route for ZEGOCLOUD token generation
 * GET /api/video/token?roomId=ROOM&userId=USER&userName=NAME
 *
 * The Server Secret NEVER leaves the backend.
 * Frontend receives only a short-lived token.
 */

const express  = require('express')
const router   = express.Router()
const { generateToken04 } = require('../utils/zegoTokenGenerator')

router.get('/video/token', (req, res) => {
  const { roomId, userId, userName } = req.query

  if (!roomId || !userId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_PARAMS',
      message: 'roomId and userId are required query parameters.',
    })
  }

  const appId        = parseInt(process.env.ZEGO_APP_ID, 10)
  const serverSecret = (process.env.ZEGO_SERVER_SECRET || '').trim()
  const expiry       = parseInt(process.env.ZEGO_TOKEN_EXPIRY_SECONDS || '3600', 10)

  if (!appId || isNaN(appId)) {
    return res.status(500).json({ success: false, error: 'ZEGO_NOT_CONFIGURED', message: 'ZEGO_APP_ID is not set.' })
  }
  if (!serverSecret) {
    return res.status(500).json({ success: false, error: 'ZEGO_NOT_CONFIGURED', message: 'ZEGO_SERVER_SECRET is not set.' })
  }

  try {
    const token = generateToken04(appId, userId, serverSecret, expiry, '')
    console.log('[video/token] issued', {
      appId,
      roomId,
      userId,
      tokenExists: !!token,
      tokenLength: token.length,
      tokenPrefix: token.slice(0, 10),
    })
    return res.json({
      success:   true,
      token,
      appId,
      roomId,
      userId,
      userName:  userName || userId,
      expiresIn: expiry,
    })
  } catch (err) {
    console.error('[video/token] Token generation error:', err.message)
    return res.status(500).json({ success: false, error: 'TOKEN_GENERATION_FAILED' })
  }
})

module.exports = router

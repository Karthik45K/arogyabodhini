/**
 * callNotification.js
 * Browser-native Web Audio API ringtone chime and desktop notifications.
 * Works without external MP3 files or CDN dependencies.
 */

let audioCtx = null
let ringInterval = null

function getAudioContext() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  return audioCtx
}

/**
 * Play a double chime (similar to healthcare/hospital video call alert)
 */
export function playChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    // First tone (pleasant E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.05)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.4)

    // Second tone (higher G#5 - 830.6 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(830.61, now + 0.15)
    gain2.gain.setValueAtTime(0, now + 0.15)
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.2)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.6)
  } catch (e) {
    console.warn('[callNotification] Audio chime blocked or unsupported:', e)
  }
}

/**
 * Start looping incoming call ringtone (every 2.5s)
 */
export function startIncomingCallAlert(doctorName = 'Your Doctor') {
  playChime()
  if (!ringInterval) {
    ringInterval = setInterval(playChime, 2500)
  }

  // Request & send OS Notification if supported
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(`Incoming Call: Dr. ${doctorName}`, {
          body: 'Your doctor is ready for the video consultation. Tap to join now.',
          icon: '/favicon.ico',
          tag: 'video-call-incoming',
          vibrate: [200, 100, 200]
        })
      } catch {}
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }
}

/**
 * Stop incoming call ringtone
 */
export function stopIncomingCallAlert() {
  if (ringInterval) {
    clearInterval(ringInterval)
    ringInterval = null
  }
}

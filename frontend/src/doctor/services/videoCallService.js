/**
 * videoCallService.js
 * Abstract Video Call Service Interface.
 *
 * Currently: mock (no real SDK).
 * To integrate ZEGOCLOUD (or any other provider):
 *   1. Install the SDK
 *   2. Replace the implementation of each method below
 *   3. Keep the interface identical — useVideoCall hook and room components stay unchanged
 *
 * Interface contract:
 *   init(config)      → Promise<void>
 *   join(roomId, userId, role) → Promise<void>
 *   leave()           → Promise<void>
 *   toggleMic()       → boolean (new muted state)
 *   toggleCamera()    → boolean (new hidden state)
 *   destroy()         → void
 *   onParticipantJoined(cb)  → unsubscribe fn
 *   onParticipantLeft(cb)    → unsubscribe fn
 */

class VideoCallService {
  constructor() {
    this._listeners   = {}
    this._micMuted    = false
    this._cameraOff   = false
    this._joined      = false
    this._mockTimer   = null
  }

  /** Initialize the SDK with config (appId, serverSecret, etc.) */
  async init(/* config */) {
    // TODO: initialize real SDK here
    console.log('[VideoCallService] init (mock)')
    return Promise.resolve()
  }

  /** Join a room as doctor or patient */
  async join(roomId, userId, role = 'doctor') {
    console.log(`[VideoCallService] join room=${roomId} user=${userId} role=${role}`)
    this._joined = true
    // Mock: simulate participant joining after 2s
    this._mockTimer = setTimeout(() => {
      this._emit('participantJoined', {
        userId: role === 'doctor' ? 'patient-mock' : 'doctor-mock',
        name:   role === 'doctor' ? 'Patient'       : 'Doctor',
      })
    }, 2000)
    return Promise.resolve()
  }

  /** Leave the current room */
  async leave() {
    this._joined = false
    clearTimeout(this._mockTimer)
    this._emit('participantLeft', { userId: 'remote-user' })
    return Promise.resolve()
  }

  /** Toggle microphone — returns new muted state */
  toggleMic() {
    this._micMuted = !this._micMuted
    console.log(`[VideoCallService] mic muted=${this._micMuted}`)
    return this._micMuted
  }

  /** Toggle camera — returns new camera-off state */
  toggleCamera() {
    this._cameraOff = !this._cameraOff
    console.log(`[VideoCallService] camera off=${this._cameraOff}`)
    return this._cameraOff
  }

  /** Clean up everything */
  destroy() {
    clearTimeout(this._mockTimer)
    this._listeners = {}
    this._joined    = false
  }

  /* ── Event system ── */
  onParticipantJoined(cb) { return this._on('participantJoined', cb) }
  onParticipantLeft(cb)   { return this._on('participantLeft',   cb) }

  _on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(cb)
    return () => {
      this._listeners[event] = this._listeners[event].filter(f => f !== cb)
    }
  }

  _emit(event, data) {
    ;(this._listeners[event] || []).forEach(cb => cb(data))
  }
}

// Singleton instance — swap with real SDK instantiation
export const videoCallService = new VideoCallService()
export default videoCallService

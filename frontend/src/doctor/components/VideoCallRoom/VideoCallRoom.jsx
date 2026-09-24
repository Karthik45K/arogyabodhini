import React, { useEffect, useRef, useState, useCallback } from 'react'
import './VideoCallRoom.css'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'
import {
  buildRoomId,
  buildUserId,
  createKitToken,
  isZegoConfigured,
} from '../../services/zegoVideoService'
import consultationService from '../../services/consultationService'

const STATUS = {
  IDLE:         'idle',
  FETCHING:     'fetching',   // token fetch only — status bar, no blocking overlay
  SDK_ACTIVE:   'sdk_active', // ZEGOCLOUD owns the UI — no overlay
  WAITING:      'waiting',
  IN_PROGRESS:  'in_progress',
  ENDED:        'ended',
  ERROR:        'error',
  UNCONFIGURED: 'unconfigured',
}

const STATUS_LABELS = {
  idle:         'Ready to join',
  fetching:     'Connecting...',
  sdk_active:   'Joining room...',
  waiting:      'Waiting for the other participant...',
  in_progress:  'Consultation in progress',
  ended:        'Call ended',
  error:        'Connection failed',
  unconfigured: 'ZEGOCLOUD not configured',
}

const ts = () => new Date().toISOString()

/**
 * VideoCallRoom — Real-time video consultation component.
 *
 * Props:
 *   consultationId {string} - Used as the base for the unique room ID
 *   role           {string} - 'doctor' | 'patient'
 *   userName       {string} - Display name shown to the other participant
 *   onEnd          {fn}     - Called when the local user ends the call
 */
const VideoCallRoom = ({ consultationId, role = 'doctor', userName = 'User', autoJoin = false, onEnd }) => {
  const containerRef   = useRef(null)
  const zpRef          = useRef(null)
  const mountedRef     = useRef(true)
  const joiningRef     = useRef(false)
  const joinedRef      = useRef(false)
  const autoJoinStartedRef = useRef(false)
  const joinAttemptRef = useRef(0)
  const joinTimeoutRef = useRef(null)
  const endedNotifiedRef = useRef(false)
  const remoteEndedRef = useRef(false)
  const finishingRef = useRef(false)
  const [status, setStatus] = useState(
    isZegoConfigured() ? STATUS.IDLE : STATUS.UNCONFIGURED
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [endMessage, setEndMessage] = useState('Consultation Ended')

  const roomId = buildRoomId(consultationId)
  const userId = buildUserId(role, consultationId)

  const clearJoinTimeout = useCallback(() => {
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current)
      joinTimeoutRef.current = null
    }
  }, [])

  const destroyZego = useCallback(() => {
    clearJoinTimeout()
    if (zpRef.current) {
      console.log('[VIDEO]', ts(), 'destroy()')
      try { zpRef.current.destroy() } catch (e) {
        console.warn('[VIDEO]', ts(), 'destroy error', e)
      }
      zpRef.current = null
    }
    joiningRef.current = false
    joinedRef.current = false
  }, [clearJoinTimeout])

  const notifyCallEnded = useCallback(async (endedBy) => {
    if (endedNotifiedRef.current || !consultationId) return
    endedNotifiedRef.current = true
    try {
      await consultationService.endCall(consultationId, endedBy, role)
    } catch {}
  }, [consultationId, role])

  const finishCall = useCallback((endedBy, remote = false) => {
    if (!mountedRef.current || finishingRef.current) return
    finishingRef.current = true
    remoteEndedRef.current = remote
    notifyCallEnded(endedBy)
    destroyZego()
    setEndMessage(remote
      ? (role === 'doctor' ? 'Patient ended the consultation' : 'Consultation ended')
      : 'Consultation ended')
    setStatus(STATUS.ENDED)
    onEnd?.({ endedBy, remote })
  }, [destroyZego, notifyCallEnded, onEnd, role])

  const joinCall = useCallback(async () => {
    if (!containerRef.current || joiningRef.current) {
      console.log('[VIDEO]', ts(), 'joinCall skipped', {
        hasContainer: !!containerRef.current,
        joining: joiningRef.current,
      })
      return
    }

    finishingRef.current = false
    endedNotifiedRef.current = false
    remoteEndedRef.current = false

    const joinAttempt = joinAttemptRef.current + 1
    joinAttemptRef.current = joinAttempt
    setStatus(STATUS.FETCHING)
    setErrorMsg('')
    clearJoinTimeout()

    try {
      // ZegoUIKitPrebuilt.create() is a singleton — always destroy before a new session
      destroyZego()
      joiningRef.current = true

      console.log('[VIDEO]', ts(), 'fetching token', { roomId, userId, userName, role })
      const kitToken = await createKitToken({ roomId, userId, userName })
      if (!mountedRef.current || joinAttempt !== joinAttemptRef.current) return
      console.log('[VIDEO]', ts(), 'token received, creating Zego instance', { roomId, userId })

      const zp = ZegoUIKitPrebuilt.create(kitToken)
      zp.autoLeaveRoomWhenOnlySelfInRoom = true
      zpRef.current = zp

      setStatus(STATUS.SDK_ACTIVE)
      console.log('[VIDEO]', ts(), 'calling joinRoom()', { roomId, userId, userName })

      // roomID/userID/userName come from kitToken — official examples omit them here
      zp.joinRoom({
        container: containerRef.current,
        showPreJoinView: !autoJoin,

        preJoinViewConfig: {
          title: role === 'doctor' ? 'Start Video Consultation' : 'Join Video Consultation',
        },

        scenario: {
          mode: ZegoUIKitPrebuilt.GroupCall,
        },
        autoLeaveRoomWhenOnlySelfInRoom: true,

        turnOnCameraWhenJoining:     true,
        turnOnMicrophoneWhenJoining: true,
        showMyCameraToggleButton:   true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showLeaveButton:             true,

        showScreenSharingButton:   false,
        showTurnOffRemoteCameraButton: true,
        showTurnOffRemoteMicrophoneButton: true,
        showRemoveUserButton:      false,
        showUserList:              false,
        showRoomTimer:             true,
        showRoomDetailsButton:     false,
        showLeaveRoomConfirmDialog: true,
        layout: 'Auto',

        onJoinRoom: () => {
          console.log('[VIDEO]', ts(), 'onJoinRoom', { roomId, userId, userName })
          clearJoinTimeout()
          joiningRef.current = false
          joinedRef.current = true
          setStatus(STATUS.WAITING)
        },

        onUserJoin: (users) => {
          console.log('[VIDEO]', ts(), 'onUserJoin', { roomId, userId, users })
          if (users?.length > 0) {
            setStatus(STATUS.IN_PROGRESS)
          }
        },

        onUserLeave: (users) => {
          console.log('[VIDEO]', ts(), 'onUserLeave', { roomId, userId, users })
          if (users?.length > 0 && joinedRef.current) {
            finishCall(role === 'doctor' ? 'patient' : 'doctor', true)
          }
        },

        onLeaveRoom: () => {
          console.log('[VIDEO]', ts(), 'onLeaveRoom', { roomId, userId, mounted: mountedRef.current })
          if (!mountedRef.current) return
          clearJoinTimeout()
          joiningRef.current = false
          joinedRef.current = false
          zpRef.current = null
          finishCall(role)
        },

        onYouRemovedFromRoom: () => {
          console.warn('[VIDEO]', ts(), 'onYouRemovedFromRoom', { roomId, userId })
          if (!mountedRef.current) return
          clearJoinTimeout()
          joiningRef.current = false
          joinedRef.current = false
          destroyZego()
          setErrorMsg('You were removed from the consultation room.')
          setStatus(STATUS.ERROR)
        },
      })

      console.log('[VIDEO]', ts(), 'joinRoom() invoked', { roomId, userId })

      // If prejoin/login never completes, allow retry (ZEGO sets hasJoinedRoom early)
      joinTimeoutRef.current = setTimeout(() => {
        if (!joinedRef.current && mountedRef.current) {
          console.warn('[VIDEO]', ts(), 'join timeout — no onJoinRoom after 90s', { roomId, userId })
          joiningRef.current = false
          destroyZego()
          setErrorMsg('Unable to connect to video call. Please try again.')
          setStatus(STATUS.ERROR)
        }
      }, 90000)
      } catch (err) {
        if (joinAttempt !== joinAttemptRef.current || !mountedRef.current) return
      console.error('[VIDEO]', ts(), 'Join error:', err)
      joiningRef.current = false
      destroyZego()

      if (err.message.includes('not configured') || err.message.includes('App ID') || err.message.includes('Server Secret')) {
        setErrorMsg(err.message)
        setStatus(STATUS.UNCONFIGURED)
      } else if (err.message.includes('permission') || err.message.includes('NotAllowed')) {
        setErrorMsg('Camera or microphone permission denied. Please allow access in your browser settings.')
        setStatus(STATUS.ERROR)
      } else if (err.message.includes('token') || err.message.includes('fetch')) {
        setErrorMsg('Could not connect to the server for authentication. Make sure the backend is running.')
        setStatus(STATUS.ERROR)
      } else {
        setErrorMsg(err.message || 'Failed to start video call.')
        setStatus(STATUS.ERROR)
      }
    }
  }, [roomId, userId, userName, role, autoJoin, finishCall, destroyZego, clearJoinTimeout])

  useEffect(() => {
    if (!consultationId) return undefined
    let cancelled = false
    const tick = async () => {
      if (cancelled || finishingRef.current) return
      try {
        const c = await consultationService.getById(consultationId, role)
        if (!cancelled && c?.callStatus === 'ended' && c.callEndedBy && c.callEndedBy !== role) {
          finishCall(c.callEndedBy, true)
        }
      } catch {}
    }
    const id = setInterval(tick, 4000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [consultationId, role, finishCall])

  // Cleanup only on true unmount — not on re-render
  useEffect(() => {
    mountedRef.current = true
    console.log('[VIDEO]', ts(), 'component mounted', { roomId, userId, userName, role })
    if (autoJoin && !autoJoinStartedRef.current) {
      autoJoinStartedRef.current = true
      joinCall()
    }
    return () => {
      console.log('[VIDEO]', ts(), 'component unmount cleanup', { roomId, userId })
      mountedRef.current = false
      joinAttemptRef.current += 1
      autoJoinStartedRef.current = false
      destroyZego()
    }
  }, [roomId, userId, userName, role, autoJoin, destroyZego, joinCall])

  const handleRetry = () => {
    destroyZego()
    setErrorMsg('')
    setStatus(STATUS.IDLE)
  }

  return (
    <div className="vcroom-root">

      {/* Status bar */}
      <div className={`vcroom-status vcroom-status--${status}`} aria-live="polite">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`vcroom-status__dot vcroom-status__dot--${status}`} aria-hidden="true" />
          <span>{STATUS_LABELS[status] || status}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {status === STATUS.WAITING && (
            <span className="vcroom-room-id">Room: {roomId}</span>
          )}
          {(status === STATUS.IN_PROGRESS || status === STATUS.WAITING || status === STATUS.SDK_ACTIVE) && (
            <button
              id="vcroom-leave-call-btn"
              type="button"
              className="vcroom-leave-btn"
              onClick={() => {
                if (window.confirm('Are you sure you want to end this consultation?')) {
                  finishCall(role)
                }
              }}
              title="Leave / End Consultation"
            >
              🔴 End Call
            </button>
          )}
        </div>
      </div>

      {/* ZEGOCLOUD renders its UI inside this div */}
      <div
        ref={containerRef}
        className={`vcroom-container ${status === STATUS.SDK_ACTIVE || status === STATUS.WAITING || status === STATUS.IN_PROGRESS ? 'vcroom-container--active' : ''}`}
        aria-label="Video consultation room"
      />

      {/* Idle state — show Join button */}
      {(status === STATUS.IDLE) && (
        <div className="vcroom-overlay">
          <div className="vcroom-overlay__card">
            <div className="vcroom-overlay__icon">🎥</div>
            <h3>{role === 'doctor' ? 'Start Video Consultation' : 'Join Video Consultation'}</h3>
            <p>Room ID: <code>{roomId}</code></p>
            <p className="vcroom-overlay__sub">
              {role === 'doctor'
                ? 'Click below to open the consultation room. The patient will join using the same room.'
                : 'Click below to join the video call with your doctor.'}
            </p>
            <button id="vcroom-join-btn" className="vcroom-join-btn" onClick={joinCall}>
              {role === 'doctor' ? '📹 Start Call' : '📹 Join Call'}
            </button>
          </div>
        </div>
      )}

      {/* Fetching token — status bar only; do NOT block ZEGOCLOUD UI */}
      {status === STATUS.ERROR && (
        <div className="vcroom-overlay">
          <div className="vcroom-overlay__card vcroom-overlay__card--error">
            <div className="vcroom-overlay__icon">⚠️</div>
            <h3>Connection Failed</h3>
            <p className="vcroom-error-msg">{errorMsg}</p>
            <button className="vcroom-join-btn vcroom-join-btn--retry" onClick={handleRetry}>
              🔄 Try Again
            </button>
          </div>
        </div>
      )}

      {/* Not configured state */}
      {status === STATUS.UNCONFIGURED && (
        <div className="vcroom-overlay">
          <div className="vcroom-overlay__card vcroom-overlay__card--warning">
            <div className="vcroom-overlay__icon">⚙️</div>
            <h3>ZEGOCLOUD Not Configured</h3>
            <div className="vcroom-setup-steps">
              <p><strong>To enable live video:</strong></p>
              <ol>
                <li>Sign up at <strong>console.zegocloud.com</strong></li>
                <li>Create a project → copy <strong>App ID</strong> and <strong>Server Secret</strong></li>
                <li>Add App ID to <code>.env</code> (frontend):</li>
              </ol>
              <pre className="vcroom-env-block">{`VITE_ZEGO_APP_ID=your_app_id`}</pre>
              <ol start="4">
                <li>Add Server Secret to <code>server/.env</code> (backend):</li>
              </ol>
              <pre className="vcroom-env-block">{`ZEGO_APP_ID=your_app_id\nZEGO_SERVER_SECRET=your_server_secret`}</pre>
              <p>5. Start the backend: <code>cd server && npm start</code></p>
              <p>6. Restart the frontend dev server</p>
            </div>
          </div>
        </div>
      )}

      {/* Ended state */}
      {status === STATUS.ENDED && (
        <div className="vcroom-overlay">
          <div className="vcroom-overlay__card vcroom-overlay__card--ended">
            <div className="vcroom-overlay__icon">✅</div>
            <h3>{endMessage}</h3>
            <p>{role === 'doctor' ? 'You can now fill in the consultation notes.' : 'You can return home.'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoCallRoom

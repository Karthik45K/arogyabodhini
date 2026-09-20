/**
 * useVideoCall.js — Reusable Video Call Hook
 *
 * Wraps videoCallService with React state.
 * When the real SDK is plugged into videoCallService, this hook needs no changes.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import videoCallService from '../services/videoCallService'

export function useVideoCall({ roomId, userId, role = 'doctor', autoJoin = false }) {
  const [status,       setStatus]       = useState('idle')   // idle | connecting | connected | ended | error
  const [micMuted,     setMicMuted]     = useState(false)
  const [cameraOff,    setCameraOff]    = useState(false)
  const [participants, setParticipants] = useState([])
  const [callDuration, setCallDuration] = useState(0)
  const timerRef = useRef(null)

  // Call duration ticker
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [status])

  // Subscribe to participant events
  useEffect(() => {
    const unJoin = videoCallService.onParticipantJoined((user) => {
      setParticipants(prev => [...prev.filter(p => p.userId !== user.userId), user])
    })
    const unLeft = videoCallService.onParticipantLeft((user) => {
      setParticipants(prev => prev.filter(p => p.userId !== user.userId))
    })
    return () => { unJoin(); unLeft() }
  }, [])

  // Auto-join on mount if configured
  useEffect(() => {
    if (autoJoin && roomId && userId) join()
    return () => { videoCallService.destroy() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const join = useCallback(async () => {
    try {
      setStatus('connecting')
      await videoCallService.init({})
      await videoCallService.join(roomId, userId, role)
      setStatus('connected')
      setCallDuration(0)
    } catch (err) {
      console.error('[useVideoCall] join error', err)
      setStatus('error')
    }
  }, [roomId, userId, role])

  const leave = useCallback(async () => {
    await videoCallService.leave()
    setStatus('ended')
    setParticipants([])
  }, [])

  const toggleMic = useCallback(() => {
    const muted = videoCallService.toggleMic()
    setMicMuted(muted)
  }, [])

  const toggleCamera = useCallback(() => {
    const off = videoCallService.toggleCamera()
    setCameraOff(off)
  }, [])

  // Format duration as MM:SS
  const formattedDuration = [
    String(Math.floor(callDuration / 60)).padStart(2, '0'),
    String(callDuration % 60).padStart(2, '0'),
  ].join(':')

  return { status, micMuted, cameraOff, participants, formattedDuration, join, leave, toggleMic, toggleCamera }
}

export default useVideoCall

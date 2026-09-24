/**
 * useSpeechRecognition — Phase 3
 *
 * React hook that wraps speechService with full state management.
 * Components only import this hook — they never touch speechService directly.
 *
 * Returned state:
 *   isSupported      boolean  — browser supports speech recognition
 *   isListening      boolean  — mic is active and recording
 *   isProcessing     boolean  — short post-stop processing delay
 *   interimText      string   — live partial transcript (updates as user speaks)
 *   error            string|null — permission / browser error message
 *
 * Returned actions:
 *   startListening(bcp47Lang)  — begin recording in the given language
 *   stopListening()            — stop recording gracefully
 *   clearError()               — dismiss the current error
 *
 * Callback props:
 *   onFinalResult(text)        — called every time a final sentence is committed
 *   onSessionComplete(text)    — called once when autoEnd session finishes
 *   autoEnd                    — stop after speech ends; no manual Stop needed
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import speechService from '../services/speechService'

const SILENCE_MS = 2400

const useSpeechRecognition = ({ onFinalResult, onSessionComplete, autoEnd = false } = {}) => {
  const [isListening,   setIsListening]   = useState(false)
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [interimText,   setInterimText]   = useState('')
  const [error,         setError]         = useState(null)

  const sessionRef      = useRef(null)
  const shouldListenRef = useRef(false)
  const accumulatedRef  = useRef('')
  const interimRef      = useRef('')
  const completedRef    = useRef(false)
  const silenceTimerRef = useRef(null)
  const emptyTimerRef   = useRef(null)
  const endModeRef      = useRef(null)
  const sessionIdRef    = useRef(0)
  const isSupported     = speechService.isSupported()

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  const clearEmptyTimer = () => {
    if (emptyTimerRef.current) {
      clearTimeout(emptyTimerRef.current)
      emptyTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      shouldListenRef.current = false
      endModeRef.current = 'abort'
      clearSilenceTimer()
      clearEmptyTimer()
      sessionRef.current?.abort()
    }
  }, [])

  const completeSession = useCallback((text) => {
    if (completedRef.current) return
    completedRef.current = true
    shouldListenRef.current = false
    clearSilenceTimer()
    clearEmptyTimer()
    setIsListening(false)
    setIsProcessing(false)
    setInterimText('')
    const combined = String(text || accumulatedRef.current || interimRef.current || '').trim()
    onSessionComplete?.(combined)
  }, [onSessionComplete])

  const startListening = useCallback((bcp47Lang = 'en-IN') => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser. Please try Chrome or Edge.')
      return
    }

    shouldListenRef.current = true
    completedRef.current = false
    accumulatedRef.current = ''
    interimRef.current = ''
    endModeRef.current = 'abort'
    clearSilenceTimer()
    clearEmptyTimer()
    sessionIdRef.current += 1
    sessionRef.current?.abort()
    const sessionId = sessionIdRef.current
    endModeRef.current = null
    setError(null)
    setInterimText('')

    try {
      const session = speechService.create({
        lang:           bcp47Lang,
        continuous:     true,
        interimResults: true,

        onStart: () => {
          setIsListening(true)
          setIsProcessing(false)
        },

        onResult: (text, isFinal) => {
          if (sessionIdRef.current !== sessionId) return
          if (isFinal) {
            accumulatedRef.current = accumulatedRef.current
              ? `${accumulatedRef.current} ${text}`.trim()
              : text
            interimRef.current = ''
            setInterimText('')
            onFinalResult?.(text)
          } else {
            interimRef.current = text
            setInterimText(text)
          }

          if (autoEnd) {
            clearEmptyTimer()
            clearSilenceTimer()
            silenceTimerRef.current = setTimeout(() => {
              endModeRef.current = 'complete'
              shouldListenRef.current = false
              sessionRef.current?.stop()
            }, SILENCE_MS)
          }
        },

        onEnd: () => {
          if (sessionIdRef.current !== sessionId) return
          if (shouldListenRef.current && !autoEnd) {
            try {
              session.start()
              return
            } catch {
              // Browser may require user gesture before restarting
            }
          }

          setIsListening(false)
          setInterimText('')
          setIsProcessing(true)
          setTimeout(() => setIsProcessing(false), 500)

          if (autoEnd && endModeRef.current !== 'abort') {
            const leftover = [accumulatedRef.current, interimRef.current].filter(Boolean).join(' ')
            completeSession(leftover)
          }
        },

        onError: (type, message) => {
          if (sessionIdRef.current !== sessionId) return
          if (type === 'no-speech') {
            if (autoEnd && !accumulatedRef.current.trim()) {
              endModeRef.current = 'complete'
              shouldListenRef.current = false
              completeSession('')
            }
            return
          }
          if (type === 'aborted') {
            return
          }
          shouldListenRef.current = false
          clearSilenceTimer()
          clearEmptyTimer()
          setIsListening(false)
          setIsProcessing(false)
          setInterimText('')
          setError(message)
          if (autoEnd && !completedRef.current) {
            completedRef.current = true
          }
        },
      })

      sessionRef.current = session
      session.start()

      if (autoEnd) {
        emptyTimerRef.current = setTimeout(() => {
          if (!accumulatedRef.current.trim() && !interimRef.current.trim()) {
            endModeRef.current = 'complete'
            shouldListenRef.current = false
            sessionRef.current?.stop()
            completeSession('')
          }
        }, 12000)
      }

    } catch (err) {
      shouldListenRef.current = false
      setError(err.message || 'Failed to start voice recognition.')
      setIsListening(false)
    }
  }, [isSupported, onFinalResult, autoEnd, completeSession])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    endModeRef.current = autoEnd ? 'complete' : 'stop'
    clearSilenceTimer()
    clearEmptyTimer()
    sessionRef.current?.stop()
  }, [autoEnd])

  const clearError = useCallback(() => setError(null), [])

  return {
    isSupported,
    isListening,
    isProcessing,
    interimText,
    error,
    startListening,
    stopListening,
    clearError,
  }
}

export default useSpeechRecognition

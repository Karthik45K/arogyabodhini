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
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import speechService from '../services/speechService'

const useSpeechRecognition = ({ onFinalResult } = {}) => {
  const [isListening,   setIsListening]   = useState(false)
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [interimText,   setInterimText]   = useState('')
  const [error,         setError]         = useState(null)

  const sessionRef     = useRef(null)
  const shouldListenRef= useRef(false)
  const isSupported    = speechService.isSupported()

  // Clean up on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false
      sessionRef.current?.abort()
    }
  }, [])

  const startListening = useCallback((bcp47Lang = 'en-IN') => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser. Please try Chrome or Edge.')
      return
    }

    // Clean up any existing session
    shouldListenRef.current = true
    sessionRef.current?.abort()
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
          if (isFinal) {
            setInterimText('')
            onFinalResult?.(text)
          } else {
            setInterimText(text)
          }
        },

        onEnd: () => {
          if (shouldListenRef.current) {
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
        },

        onError: (type, message) => {
          if (type !== 'no-speech' && type !== 'aborted') {
            shouldListenRef.current = false
            setIsListening(false)
            setIsProcessing(false)
            setInterimText('')
            setError(message)
          }
        },
      })

      sessionRef.current = session
      session.start()

    } catch (err) {
      shouldListenRef.current = false
      setError(err.message || 'Failed to start voice recognition.')
      setIsListening(false)
    }
  }, [isSupported, onFinalResult])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    sessionRef.current?.stop()
  }, [])

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

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
  const isSupported    = speechService.isSupported()

  // Clean up on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.abort()
    }
  }, [])

  const startListening = useCallback((bcp47Lang = 'en-IN') => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser. Please try Chrome or Edge.')
      return
    }

    // Clean up any existing session
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
          setIsListening(false)
          setInterimText('')
          // Brief processing state so the UI doesn't snap immediately
          setIsProcessing(true)
          setTimeout(() => setIsProcessing(false), 600)
        },

        onError: (type, message) => {
          setIsListening(false)
          setIsProcessing(false)
          setInterimText('')
          setError(message)
        },
      })

      sessionRef.current = session
      session.start()

    } catch (err) {
      setError(err.message || 'Failed to start voice recognition.')
      setIsListening(false)
    }
  }, [isSupported, onFinalResult])

  const stopListening = useCallback(() => {
    sessionRef.current?.stop()
    // onEnd callback will handle state update
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

/**
 * MediAI Speech Service — Phase 3
 *
 * A browser-agnostic abstraction over the Web Speech API.
 *
 * SWAP CONTRACT (Phase 4 — Whisper API):
 * ─────────────────────────────────────────────────────────
 * Replace the `_createWebSpeechSession` implementation with
 * a function that:
 *   1. Opens a MediaRecorder stream
 *   2. Sends audio chunks to /api/transcribe (Whisper endpoint)
 *   3. Fires the same onResult / onEnd / onError callbacks
 *
 * The calling code (useSpeechRecognition hook) never needs to change.
 * ─────────────────────────────────────────────────────────
 *
 * Public API:
 *   speechService.isSupported()          → boolean
 *   speechService.create(config)         → SpeechSession { start, stop, abort }
 *
 * Config shape:
 *   {
 *     lang:            string,   // BCP-47 language code (e.g. 'hi-IN')
 *     continuous:      boolean,  // Keep listening after pause?
 *     interimResults:  boolean,  // Fire callback with partial text?
 *     onResult:  (text, isFinal) => void,
 *     onStart:   ()              => void,
 *     onEnd:     ()              => void,
 *     onError:   (type, msg)     => void,
 *   }
 */

// ─── Browser capability detection ──────────────────────────────────────────
const _getSpeechRecognitionClass = () =>
  window.SpeechRecognition ||
  window.webkitSpeechRecognition ||
  window.mozSpeechRecognition ||
  window.msSpeechRecognition ||
  null

/**
 * Map of known SpeechRecognitionError types → human-readable messages.
 */
const ERROR_MESSAGES = {
  'not-allowed':        'Microphone access was denied. Please allow microphone permissions in your browser settings and try again.',
  'permission-denied':  'Microphone permission was denied. Please allow microphone access and try again.',
  'no-speech':          'No speech was detected. Please speak clearly and try again.',
  'audio-capture':      'Microphone not found. Please check that a microphone is connected.',
  'network':            'Network error during voice processing. Please check your connection.',
  'aborted':            null,   // User-initiated stop — not an error
  'service-not-allowed':'Speech recognition is not allowed in this context. Try using HTTPS.',
  'bad-grammar':        'Speech could not be processed. Please try again.',
  'language-not-supported': 'This language is not supported by your browser\'s speech recognition.',
}

// ─── Language normalization helper ─────────────────────────────────────────
export function normalizeLanguageCode(code) {
  if (!code) return 'en-IN'
  const c = String(code).toLowerCase().trim()
  if (c.startsWith('kn')) return 'kn-IN'
  if (c.startsWith('ta')) return 'ta-IN'
  if (c.startsWith('te')) return 'te-IN'
  if (c.startsWith('hi')) return 'hi-IN'
  if (c.startsWith('en')) return 'en-IN'
  return code
}

// ─── Web Speech API session factory ────────────────────────────────────────
const _createWebSpeechSession = (config) => {
  const RecognitionClass = _getSpeechRecognitionClass()
  if (!RecognitionClass) {
    throw new Error('Web Speech API is not supported in this browser.')
  }

  const recognition = new RecognitionClass()

  recognition.lang             = normalizeLanguageCode(config.lang)
  recognition.continuous       = config.continuous ?? true
  recognition.interimResults   = config.interimResults ?? true
  recognition.maxAlternatives  = 1

  console.log('[SpeechService] Initialized recognition session with lang:', recognition.lang)

  // ── Event handlers ──────────────────────────────────────────────────────
  recognition.onstart = () => {
    config.onStart?.()
  }

  recognition.onresult = (event) => {
    let interim = ''
    let finalText = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const alt = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalText += alt + ' '
      } else {
        interim += alt
      }
    }

    if (finalText) config.onResult?.(finalText.trim(), true)
    if (interim)   config.onResult?.(interim, false)
  }

  recognition.onerror = (event) => {
    const type = event.error
    // In regional languages (Kannada, Tamil, Telugu), silence timeouts fire 'no-speech' quickly.
    // Do NOT treat silence or aborted as fatal application errors.
    if (type === 'no-speech') {
      console.log('[SpeechService] No speech detected in silence window; session remains active.')
      return
    }
    if (type === 'aborted') {
      return
    }
    const msg = ERROR_MESSAGES[type]
    config.onError?.(type, msg || `Speech recognition error: ${type}`)
  }

  recognition.onend = () => {
    config.onEnd?.()
  }

  // ── Public session interface ─────────────────────────────────────────────
  return {
    start: () => {
      try {
        recognition.start()
      } catch (e) {
        console.warn('[SpeechService] start() notice:', e.message)
      }
    },
    stop:  () => {
      try {
        recognition.stop()
      } catch (e) {
        console.warn('[SpeechService] stop() notice:', e.message)
      }
    },
    abort: () => {
      try {
        recognition.abort()
      } catch (e) {
        console.warn('[SpeechService] abort() notice:', e.message)
      }
    },
  }
}

// ─── Public service object ──────────────────────────────────────────────────
const speechService = {
  /**
   * Returns true if the current browser supports speech recognition.
   */
  isSupported: () => Boolean(_getSpeechRecognitionClass()),

  /**
   * Creates and returns a speech session.
   * Call session.start() to begin recording.
   *
   * @param {Object} config - See JSDoc above
   * @returns {{ start, stop, abort }}
   */
  create: (config) => _createWebSpeechSession(config),
}

export default speechService

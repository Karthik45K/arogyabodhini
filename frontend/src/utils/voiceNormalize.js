/**
 * Voice login helpers: spoken phone → digits, spoken email → address,
 * name → Latin script (transliteration fallback = type manually).
 */

const INDIC_DIGITS = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  '೦': '0', '೧': '1', '೨': '2', '೩': '3', '೪': '4', '೫': '5', '೬': '6', '೭': '7', '೮': '8', '೯': '9',
  '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4', '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9',
  '౦': '0', '౧': '1', '౨': '2', '౩': '3', '౪': '4', '౫': '5', '౬': '6', '౭': '7', '౮': '8', '౯': '9',
}

/** Longer phrases first so multi-word forms win. */
const NUMBER_WORDS = [
  // English
  ['zero', '0'], ['oh', '0'],
  ['one', '1'], ['two', '2'], ['three', '3'], ['four', '4'], ['five', '5'],
  ['six', '6'], ['seven', '7'], ['eight', '8'], ['nine', '9'],
  // Hindi
  ['शून्य', '0'], ['सिफर', '0'], ['एक', '1'], ['दो', '2'], ['तीन', '3'], ['चार', '4'],
  ['पाँच', '5'], ['पांच', '5'], ['छह', '6'], ['छे', '6'], ['सात', '7'], ['आठ', '8'], ['नौ', '9'],
  // Kannada
  ['ಸೊನ್ನೆ', '0'], ['ಸೊನೆ', '0'], ['ಒಂದು', '1'], ['ಎರಡು', '2'], ['ಮೂರು', '3'], ['ನಾಲ್ಕು', '4'],
  ['ಐದು', '5'], ['ಆರು', '6'], ['ಏಳು', '7'], ['ಎಂಟು', '8'], ['ಒಂಬತ್ತು', '9'], ['ಒಂಭತ್ತು', '9'],
  // Tamil
  ['பூஜ்ஜியம்', '0'], ['பூஜ்யம்', '0'], ['சுழியம்', '0'], ['ஒன்று', '1'], ['இரண்டு', '2'],
  ['மூன்று', '3'], ['நான்கு', '4'], ['ஐந்து', '5'], ['ஆறு', '6'], ['ஏழு', '7'], ['எட்டு', '8'], ['ஒன்பது', '9'],
  // Telugu
  ['సున్నా', '0'], ['సున్న', '0'], ['ఒకటి', '1'], ['రెండు', '2'], ['మూడు', '3'], ['నాలుగు', '4'],
  ['ఐదు', '5'], ['అయిదు', '5'], ['ఆరు', '6'], ['ఏడు', '7'], ['ఎనిమిది', '8'], ['తొమ్మిది', '9'],
]

const LATIN_NAME_RE = /^[\s.'\-A-Za-z]+$/
const HAS_NON_LATIN_LETTER = /[^\u0000-\u007F\s.'\-0-9]/u

export function normalizePhone(raw) {
  let text = String(raw || '').trim().toLowerCase()

  for (const [ch, d] of Object.entries(INDIC_DIGITS)) {
    text = text.split(ch).join(d)
  }

  // Replace number words (longest first). ASCII uses word boundaries.
  const sorted = [...NUMBER_WORDS].sort((a, b) => b[0].length - a[0].length)
  for (const [word, digit] of sorted) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const isAscii = /^[a-z]+$/i.test(word)
    const re = isAscii
      ? new RegExp(`\\b${escaped}\\b`, 'gi')
      : new RegExp(escaped, 'gi')
    text = text.replace(re, digit)
  }

  return text.replace(/\D/g, '').slice(-10)
}

export function normalizeEmail(raw) {
  let text = String(raw || '').trim().toLowerCase()

  const replacements = [
    [/\s+at\s+/gi, '@'],
    [/\s+dot\s+/gi, '.'],
    [/\s+underscore\s+/gi, '_'],
    [/\s+under\s*score\s+/gi, '_'],
    [/\s+dash\s+/gi, '-'],
    [/\s+hyphen\s+/gi, '-'],
    [/\s+minus\s+/gi, '-'],
    // Hindi / common Indic speech for email punctuation
    [/\s+एट\s+/g, '@'],
    [/\s+डॉट\s+/g, '.'],
    [/\s+डाट\s+/g, '.'],
    [/\s+अंडरस्कोर\s+/g, '_'],
    [/\s+डैश\s+/g, '-'],
    // Kannada
    [/\s+ಅಟ್\s+/g, '@'],
    [/\s+ಡಾಟ್\s+/g, '.'],
    [/\s+ಡಾಟ\s+/g, '.'],
    // Tamil
    [/\s+அட்\s+/g, '@'],
    [/\s+ஆட்\s+/g, '@'],
    [/\s+டாட்\s+/g, '.'],
    // Telugu
    [/\s+అట్\s+/g, '@'],
    [/\s+డాట్\s+/g, '.'],
    [/\s+డాట\s+/g, '.'],
  ]

  for (const [re, val] of replacements) {
    text = text.replace(re, val)
  }

  return text.replace(/\s+/g, '')
}

/**
 * Prefer Latin/English script for stored patient names.
 * Returns { latin, needsTypingFallback, original }.
 * Does NOT invent a transliteration — if non-Latin, ask user to type.
 */
export function normalizePatientName(raw) {
  const original = String(raw || '').trim().replace(/\s+/g, ' ')
  if (!original) {
    return { latin: '', needsTypingFallback: false, original: '' }
  }

  // Already Latin
  if (LATIN_NAME_RE.test(original)) {
    return {
      latin: original.replace(/\b\w/g, (c) => c.toUpperCase()),
      needsTypingFallback: false,
      original,
    }
  }

  // Strip digits/punct and keep Latin letters if mixed
  const latinOnly = original
    .replace(/[^\u0041-\u005A\u0061-\u007A\s.'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (latinOnly.length >= 2 && LATIN_NAME_RE.test(latinOnly)) {
    return {
      latin: latinOnly.replace(/\b\w/g, (c) => c.toUpperCase()),
      needsTypingFallback: false,
      original,
    }
  }

  if (HAS_NON_LATIN_LETTER.test(original)) {
    return { latin: '', needsTypingFallback: true, original }
  }

  return { latin: original, needsTypingFallback: false, original }
}

export function speechCodeForLang(lang) {
  const map = { en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN' }
  if (!lang) return 'en-IN'
  if (lang.bcp47) return lang.bcp47
  return map[lang.code] || 'en-IN'
}

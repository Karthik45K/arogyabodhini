const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'my', 'me', 'i', 'im',
  'i\'m', 'is', 'was', 'were', 'have', 'has', 'had', 'feeling', 'feel', 'feels',
  'like', 'really', 'very', 'so', 'bad', 'terrible', 'awful', 'extreme',
  'constant', 'persistent', 'little', 'some', 'bit', 'been', 'for', 'with',
  'also', 'plus', 'getting', 'got', 'am', 'are', 'to', 'it', 'this', 'that',
  'just', 'now', 'today', 'yesterday', 'since', 'about', 'being',
])

const SYNONYMS = {
  headache: ['head ache', 'head pain', 'headache'],
  dizziness: ['dizzy', 'feeling dizzy', 'light headed', 'lightheaded'],
  vomiting: ['vomit', 'vomiting', 'throwing up', 'feel like vomiting', 'puking'],
  nausea: ['nauseous', 'nausea', 'feel sick', 'sick to my stomach'],
  itching: ['itch', 'itchy', 'itching', 'itchiness'],
  skin_rash: ['skin rash', 'rash'],
  high_fever: ['high fever', 'fever', 'high temperature', 'temperature'],
  mild_fever: ['mild fever', 'slight fever', 'low grade fever'],
  cough: ['cough', 'coughing'],
  breathlessness: ['breathless', 'shortness of breath', 'difficulty breathing', 'hard to breathe', 'cant breathe', "can't breathe"],
  chest_pain: ['chest pain', 'pain in chest'],
  stomach_pain: ['stomach pain', 'stomach ache', 'tummy pain'],
  abdominal_pain: ['abdominal pain', 'abdomen pain'],
  belly_pain: ['belly pain', 'belly ache'],
  joint_pain: ['joint pain', 'joints hurt'],
  muscle_pain: ['muscle pain', 'body ache', 'body pain'],
  back_pain: ['back pain', 'backache'],
  neck_pain: ['neck pain'],
  knee_pain: ['knee pain'],
  hip_joint_pain: ['hip pain', 'hip joint pain'],
  diarrhoea: ['diarrhoea', 'diarrhea', 'loose stools', 'loose motion'],
  constipation: ['constipation', 'constipated'],
  fatigue: ['fatigue', 'tired', 'exhausted'],
  chills: ['chills', 'shivering with cold'],
  shivering: ['shivering', 'shiver'],
  runny_nose: ['runny nose', 'running nose'],
  continuous_sneezing: ['sneezing', 'continuous sneezing'],
  loss_of_appetite: ['loss of appetite', 'no appetite', 'not eating'],
  yellowish_skin: ['yellow skin', 'yellowish skin'],
  dark_urine: ['dark urine'],
  yellow_urine: ['yellow urine'],
  yellowing_of_eyes: ['yellow eyes', 'yellowing of eyes'],
  pus_filled_pimples: ['pimples', 'pus filled pimples', 'acne pimples'],
  blackheads: ['blackheads', 'black heads'],
  palpitations: ['palpitations', 'heart racing', 'heart pounding'],
  blurred_and_distorted_vision: ['blurred vision', 'blurry vision', 'distorted vision'],
  loss_of_smell: ['loss of smell', 'cant smell', "can't smell", 'no smell'],
  burning_micturition: ['burning urination', 'painful urination', 'burning while peeing'],
  continuous_feel_of_urine: ['frequent urination', 'always feel like peeing'],
  acidity: ['acidity', 'acid reflux', 'heartburn'],
  indigestion: ['indigestion', 'upset stomach'],
  sweating: ['sweating', 'sweat', 'night sweats'],
  dehydration: ['dehydration', 'dehydrated'],
  weight_loss: ['weight loss', 'losing weight'],
  weight_gain: ['weight gain', 'gaining weight'],
  stiff_neck: ['stiff neck', 'neck stiffness'],
  swelling_joints: ['swelling joints', 'swollen joints', 'joint swelling'],
  muscle_weakness: ['muscle weakness', 'weak muscles'],
  restlessness: ['restlessness', 'restless'],
  lethargy: ['lethargy', 'lethargic'],
  anxiety: ['anxiety', 'anxious'],
  depression: ['depression', 'depressed'],
  irritability: ['irritability', 'irritable'],
  coma: ['coma', 'unconscious'],
  phlegm: ['phlegm', 'mucus'],
  congestion: ['congestion', 'congested', 'blocked nose'],
  throat_irritation: ['sore throat', 'throat irritation', 'throat pain'],
  red_spots_over_body: ['red spots', 'red spots over body'],
  nodal_skin_eruptions: ['nodal skin eruptions', 'skin eruptions', 'skin nodules'],
  'dischromic _patches': ['dischromic patches', 'discolored patches', 'discoloured patches'],
  sunken_eyes: ['sunken eyes'],
  watering_from_eyes: ['watery eyes', 'watering from eyes'],
  pain_behind_the_eyes: ['pain behind the eyes', 'pain behind eyes'],
  fast_heart_rate: ['fast heart rate', 'rapid heartbeat'],
  slurred_speech: ['slurred speech', 'slurring'],
  loss_of_balance: ['loss of balance', 'unsteady balance'],
  spinning_movements: ['spinning', 'room spinning'],
  unsteadiness: ['unsteadiness', 'unsteady'],
  excessive_hunger: ['excessive hunger', 'always hungry'],
  increased_appetite: ['increased appetite'],
  polyuria: ['polyuria', 'urinating a lot'],
  family_history: ['family history'],
  painful_walking: ['painful walking', 'pain while walking'],
  skin_peeling: ['skin peeling', 'peeling skin'],
  blister: ['blister', 'blisters'],
  obesity: ['obesity', 'obese'],
  bruising: ['bruising', 'bruises'],
  cramps: ['cramps', 'muscle cramps'],
  malaise: ['malaise', 'unwell'],
  passage_of_gases: ['gas', 'gases', 'passing gas', 'flatulence'],
  internal_itching: ['internal itching'],
  bloody_stool: ['bloody stool', 'blood in stool'],
  blood_in_sputum: ['blood in sputum', 'coughing blood'],
  rusty_sputum: ['rusty sputum'],
  mucoid_sputum: ['mucoid sputum'],
}

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const compact = (value) => normalize(value).replace(/\s+/g, '')

const levenshtein = (a, b) => {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const prev = new Array(b.length + 1)
  const curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j += 1) prev[j] = j

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j]
  }
  return prev[b.length]
}

const phraseVariantsForFeature = (featureName) => {
  const spaced = normalize(featureName)
  const variants = new Set([spaced, compact(featureName)])
  const aliases = SYNONYMS[featureName] || []
  for (const alias of aliases) {
    variants.add(normalize(alias))
    variants.add(compact(alias))
  }
  return [...variants].filter(Boolean)
}

const collectPatientPhrases = (tokens) => {
  const phrases = []
  for (let n = Math.min(6, tokens.length); n >= 1; n -= 1) {
    for (let i = 0; i <= tokens.length - n; i += 1) {
      const slice = tokens.slice(i, i + n)
      const spaced = slice.join(' ')
      if (n === 1 && STOPWORDS.has(slice[0])) continue
      phrases.push({
        spaced,
        compact: slice.join(''),
        tokenCount: n,
      })
    }
  }
  return phrases
}

const isReliableMatch = (variant, phrase) => {
  if (variant === phrase.spaced || variant === phrase.compact) {
    if (variant.length <= 3) return phrase.tokenCount === 1 && variant.length === phrase.compact.length
    return true
  }

  if (variant.length >= 6 && phrase.compact.length >= 6) {
    const distance = levenshtein(variant, phrase.compact)
    return distance === 1 && Math.abs(variant.length - phrase.compact.length) <= 1
  }

  return false
}

const matchSymptomsFromText = (text, featureNames) => {
  const normalized = normalize(text)
  if (!normalized) return []

  const tokens = normalized.split(' ').filter(Boolean)
  const phrases = collectPatientPhrases(tokens)
  const matched = []
  const matchedSet = new Set()

  const features = featureNames.map((name) => ({
    name,
    variants: phraseVariantsForFeature(name),
  })).sort((a, b) => {
    const aLen = Math.max(...a.variants.map((v) => v.length))
    const bLen = Math.max(...b.variants.map((v) => v.length))
    return bLen - aLen
  })

  const usedPhraseKeys = new Set()

  for (const feature of features) {
    for (const phrase of phrases) {
      const phraseKey = `${phrase.compact}:${phrase.tokenCount}`
      if (usedPhraseKeys.has(phraseKey) && phrase.tokenCount === 1) continue

      const hit = feature.variants.some((variant) => isReliableMatch(variant, phrase))
      if (!hit) continue

      if (!matchedSet.has(feature.name)) {
        matchedSet.add(feature.name)
        matched.push(feature.name)
      }
      if (phrase.tokenCount >= 2) usedPhraseKeys.add(phraseKey)
      break
    }
  }

  if (matched.includes('mild_fever') && /\bmild\b|\bslight\b|\blow grade\b/.test(normalized)) {
    return matched.filter((name) => name !== 'high_fever' || /\bhigh fever\b|\bhigh temperature\b/.test(normalized))
  }

  return matched
}

const toDisplaySymptom = (featureName) => normalize(featureName)

module.exports = {
  matchSymptomsFromText,
  toDisplaySymptom,
  normalize,
}

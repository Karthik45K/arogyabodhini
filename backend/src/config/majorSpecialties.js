/**
 * Controlled major specialties for routing, registration, and matching.
 * Canonical values match normalizeSpecialty() output in diseaseSpecialtyMap.js.
 */
const MAJOR_SPECIALTIES = [
  { canonical: 'general-physician', label: 'General Physician', aliases: ['general medicine', 'general-medicine', 'gp', 'family medicine'] },
  { canonical: 'cardiologist', label: 'Cardiology', aliases: ['cardiology', 'cardiac'] },
  { canonical: 'neurologist', label: 'Neurology', aliases: ['neurology', 'neuro'] },
  { canonical: 'pulmonologist', label: 'Pulmonology', aliases: ['pulmonology', 'pulmonary', 'respiratory'] },
  { canonical: 'gastroenterologist', label: 'Gastroenterology', aliases: ['gastroenterology', 'gastro'] },
  { canonical: 'dermatologist', label: 'Dermatology', aliases: ['dermatology', 'skin'] },
  { canonical: 'orthopedist', label: 'Orthopedics', aliases: ['orthopedics', 'orthopaedic', 'orthopedic'] },
  { canonical: 'ent-specialist', label: 'ENT', aliases: ['ent', 'otolaryngology', 'ear nose throat'] },
  { canonical: 'ophthalmologist', label: 'Ophthalmology', aliases: ['ophthalmology', 'eye'] },
  { canonical: 'pediatrician', label: 'Pediatrics', aliases: ['pediatrics', 'paediatrics', 'child'] },
  { canonical: 'gynecologist', label: 'Obstetrics & Gynecology', aliases: ['obstetrics', 'gynecology', 'gynaecology', 'obgyn', 'ob-gyn'] },
  { canonical: 'urologist', label: 'Urology', aliases: ['urology'] },
  { canonical: 'nephrologist', label: 'Nephrology', aliases: ['nephrology', 'kidney'] },
  { canonical: 'endocrinologist', label: 'Endocrinology', aliases: ['endocrinology', 'diabetes'] },
  { canonical: 'rheumatologist', label: 'Rheumatology', aliases: ['rheumatology'] },
  { canonical: 'psychiatrist', label: 'Psychiatry', aliases: ['psychiatry', 'mental health'] },
  { canonical: 'general-surgeon', label: 'General Surgery', aliases: ['general surgery', 'surgery', 'surgeon'] },
  { canonical: 'oncologist', label: 'Oncology', aliases: ['oncology', 'cancer'] },
  { canonical: 'infectious-disease', label: 'Infectious Disease', aliases: ['infectious disease', 'infectious-diseases'] },
]

const { normalizeSpecialty } = require('./diseaseSpecialtyMap')

const byCanonical = new Map(MAJOR_SPECIALTIES.map((s) => [s.canonical, s]))

const labelForCanonical = (canonical) => byCanonical.get(canonical)?.label || canonical

/**
 * Map any free-text specialty to a controlled major specialty canonical id.
 * Vague / unknown specialties fall back to general-physician.
 */
const toMajorSpecialty = (rawSpecialty) => {
  const normalized = normalizeSpecialty(rawSpecialty)
  if (byCanonical.has(normalized)) {
    return { canonical: normalized, label: labelForCanonical(normalized), fellBackToGp: false }
  }

  const cleaned = String(rawSpecialty || '').trim().toLowerCase()
  for (const entry of MAJOR_SPECIALTIES) {
    if (entry.canonical === normalized) {
      return { canonical: entry.canonical, label: entry.label, fellBackToGp: false }
    }
    for (const alias of entry.aliases) {
      if (cleaned === alias || cleaned.includes(alias) || normalized.includes(alias.replace(/\s+/g, '-'))) {
        return { canonical: entry.canonical, label: entry.label, fellBackToGp: false }
      }
    }
  }

  // Known non-major norms that should still map (surgeon → general-surgeon, etc.)
  if (normalized === 'surgeon' || normalized === 'vascular-surgeon') {
    return { canonical: 'general-surgeon', label: labelForCanonical('general-surgeon'), fellBackToGp: false }
  }

  return {
    canonical: 'general-physician',
    label: labelForCanonical('general-physician'),
    fellBackToGp: true,
  }
}

const isAllowedMajorSpecialty = (rawSpecialty) => {
  const { canonical, fellBackToGp } = toMajorSpecialty(rawSpecialty)
  if (!rawSpecialty || !String(rawSpecialty).trim()) return false
  // Only allow if it maps without forced GP fallback OR it is explicitly GP
  const normalized = normalizeSpecialty(rawSpecialty)
  if (byCanonical.has(normalized)) return true
  const explicitGp = /general\s*(physician|medicine)|family\s*medicine|^gp$/i.test(String(rawSpecialty))
  return !fellBackToGp || explicitGp
}

const registrationOptions = () =>
  MAJOR_SPECIALTIES.map((s) => ({ value: s.canonical, label: s.label }))

module.exports = {
  MAJOR_SPECIALTIES,
  toMajorSpecialty,
  labelForCanonical,
  isAllowedMajorSpecialty,
  registrationOptions,
}

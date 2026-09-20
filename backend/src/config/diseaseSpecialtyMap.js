const DISEASE_SPECIALTY_MAP = {
  '(vertigo) paroymsal positional vertigo': 'neurologist',
  'aids': 'general-physician',
  'acne': 'dermatologist',
  'alcoholic hepatitis': 'gastroenterologist',
  'allergy': 'general-physician',
  'arthritis': 'rheumatologist',
  'bronchial asthma': 'pulmonologist',
  'cervical spondylosis': 'orthopedist',
  'chicken pox': 'general-physician',
  'chronic cholestasis': 'gastroenterologist',
  'common cold': 'general-physician',
  'dengue': 'general-physician',
  'diabetes': 'endocrinologist',
  'dimorphic hemmorhoids(piles)': 'surgeon',
  'drug reaction': 'dermatologist',
  'fungal infection': 'dermatologist',
  'gerd': 'gastroenterologist',
  'gastroenteritis': 'gastroenterologist',
  'heart attack': 'cardiologist',
  'hepatitis b': 'gastroenterologist',
  'hepatitis c': 'gastroenterologist',
  'hepatitis d': 'gastroenterologist',
  'hepatitis e': 'gastroenterologist',
  'hypertension': 'cardiologist',
  'hyperthyroidism': 'endocrinologist',
  'hypoglycemia': 'endocrinologist',
  'hypothyroidism': 'endocrinologist',
  'impetigo': 'dermatologist',
  'jaundice': 'gastroenterologist',
  'malaria': 'general-physician',
  'migraine': 'neurologist',
  'osteoarthristis': 'orthopedist',
  'paralysis (brain hemorrhage)': 'neurologist',
  'peptic ulcer diseae': 'gastroenterologist',
  'pneumonia': 'pulmonologist',
  'psoriasis': 'dermatologist',
  'tuberculosis': 'pulmonologist',
  'typhoid': 'general-physician',
  'urinary tract infection': 'urologist',
  'varicose veins': 'vascular-surgeon',
  'hepatitis a': 'gastroenterologist',
  'chest pain': 'cardiologist',
  'chest pain and shortness of breath': 'cardiologist',
  'coronary artery disease': 'cardiologist',
  'arrhythmia': 'cardiologist',
  'angina': 'cardiologist',
  'stroke': 'neurologist',
  'seizure': 'neurologist',
  'epilepsy': 'neurologist',
  'fever': 'general-physician',
  'influenza': 'general-physician',
  'flu': 'general-physician',
  'asthma': 'pulmonologist',
  'bronchitis': 'pulmonologist',
  'copd': 'pulmonologist',
  'sinusitis': 'ent-specialist',
  'tonsillitis': 'ent-specialist',
  'eczema': 'dermatologist',
  'rash': 'dermatologist',
  'depression': 'psychiatrist',
  'anxiety': 'psychiatrist',
  'panic disorder': 'psychiatrist',
  'kidney stones': 'urologist',
}

const SPECIALTY_MAPPING = {
  // Cardiology
  'cardiology': 'cardiologist',
  'cardiologist': 'cardiologist',
  'cardiac': 'cardiologist',
  'cardiovascular': 'cardiologist',
  'heart': 'cardiologist',

  // Neurology
  'neurology': 'neurologist',
  'neurologist': 'neurologist',
  'neuro': 'neurologist',
  'neurosurgery': 'neurologist',

  // Pulmonology / Respiratory
  'pulmonology': 'pulmonologist',
  'pulmonologist': 'pulmonologist',
  'pulmonary': 'pulmonologist',
  'respiratory': 'pulmonologist',
  'respiratory-medicine': 'pulmonologist',
  'chest': 'pulmonologist',

  // Orthopedics
  'orthopedics': 'orthopedist',
  'orthopedic': 'orthopedist',
  'orthopedist': 'orthopedist',
  'orthopedic-surgeon': 'orthopedist',
  'orthopaedics': 'orthopedist',
  'orthopaedic': 'orthopedist',
  'bone': 'orthopedist',

  // Dermatology
  'dermatology': 'dermatologist',
  'dermatologist': 'dermatologist',
  'skin': 'dermatologist',

  // Gastroenterology
  'gastroenterology': 'gastroenterologist',
  'gastroenterologist': 'gastroenterologist',
  'gastro': 'gastroenterologist',
  'digestive': 'gastroenterologist',
  'hepatology': 'gastroenterologist',

  // ENT
  'ent': 'ent-specialist',
  'ent-specialist': 'ent-specialist',
  'otolaryngology': 'ent-specialist',
  'otolaryngologist': 'ent-specialist',
  'ear-nose-throat': 'ent-specialist',

  // Psychiatry
  'psychiatry': 'psychiatrist',
  'psychiatrist': 'psychiatrist',
  'psychology': 'psychiatrist',
  'mental-health': 'psychiatrist',

  // Endocrinology
  'endocrinology': 'endocrinologist',
  'endocrinologist': 'endocrinologist',
  'diabetes': 'endocrinologist',
  'metabolic': 'endocrinologist',

  // Ophthalmology
  'ophthalmology': 'ophthalmologist',
  'ophthalmologist': 'ophthalmologist',
  'eye': 'ophthalmologist',

  // Urology
  'urology': 'urologist',
  'urologist': 'urologist',
  'nephrology': 'urologist',

  // General Physician
  'general-physician': 'general-physician',
  'general-medicine': 'general-physician',
  'internal-medicine': 'general-physician',
  'physician': 'general-physician',
  'general': 'general-physician',
  'primary-care': 'general-physician',
  'general-practice': 'general-physician',
  'family-medicine': 'general-physician',
}

const normalizeDiseaseName = (disease) => String(disease || '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()

const normalizeSpecialty = (specialty) => {
  const cleaned = String(specialty || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')

  if (SPECIALTY_MAPPING[cleaned]) {
    return SPECIALTY_MAPPING[cleaned]
  }

  // Match if cleaned starts with or contains any key (e.g. "cardio" in "cardiology")
  for (const [key, val] of Object.entries(SPECIALTY_MAPPING)) {
    if (cleaned === key || cleaned.startsWith(key) || key.startsWith(cleaned)) {
      return val
    }
  }

  return cleaned || 'general-physician'
}

const normalizeDoctorSpecialty = (specialty) => normalizeSpecialty(specialty)

const getSpecialtyForDisease = (disease) => {
  const normalized = normalizeDiseaseName(disease)
  if (DISEASE_SPECIALTY_MAP[normalized]) {
    return DISEASE_SPECIALTY_MAP[normalized]
  }
  // Partial substring match
  for (const [key, val] of Object.entries(DISEASE_SPECIALTY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val
    }
  }
  return null
}

module.exports = {
  DISEASE_SPECIALTY_MAP,
  SPECIALTY_MAPPING,
  getSpecialtyForDisease,
  normalizeDiseaseName,
  normalizeSpecialty,
  normalizeDoctorSpecialty,
}

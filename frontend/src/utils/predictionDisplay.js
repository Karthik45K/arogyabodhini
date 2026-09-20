export function getDiseaseName(entry) {
  if (entry == null) return ''
  if (typeof entry === 'string') return entry
  return entry.disease || ''
}

export function getDiseaseProbability(entry) {
  if (entry && typeof entry === 'object' && typeof entry.probability === 'number') {
    return entry.probability
  }
  return null
}

export function formatDiseaseList(diseases = []) {
  return diseases.map(getDiseaseName).filter(Boolean).join(', ')
}

export function formatProbability(probability) {
  if (typeof probability !== 'number' || Number.isNaN(probability)) return ''
  return `${Math.round(probability * 100)}%`
}

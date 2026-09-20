const fs = require('fs')
const path = require('path')
const { RED_FLAGS } = require('../config/redFlags')

const SEVERITY_LEVELS = {
  1: 'Low',
  2: 'Moderate',
  3: 'High',
  4: 'Emergency',
}

const SEVERITY_FILE_PATH = path.join(__dirname, '../../data/disease_severity.csv')

const parseSeverityCsv = (content) => {
  const lines = content
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return {}

  const rows = {}
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(',')
    if (cells.length < 2) continue
    const disease = String(cells[0] || '').trim()
    const severity = Number.parseInt(String(cells[1] || '').trim(), 10)
    if (!disease || Number.isNaN(severity)) continue
    rows[disease] = severity
  }

  return rows
}

let cachedSeverityMap = null
const loadDiseaseSeverityMap = () => {
  if (cachedSeverityMap) return cachedSeverityMap

  try {
    const csv = fs.readFileSync(SEVERITY_FILE_PATH, 'utf8')
    cachedSeverityMap = parseSeverityCsv(csv)
  } catch (error) {
    console.warn('Could not read disease severity CSV:', error.message)
    cachedSeverityMap = {}
  }

  return cachedSeverityMap
}

const normalizeText = (input = '') => String(input)
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const getSeverityLabel = (level) => {
  const numericLevel = Number(level)
  return SEVERITY_LEVELS[Number.isInteger(numericLevel) && numericLevel >= 1 && numericLevel <= 4 ? numericLevel : 1] || 'Low'
}

const getBaselineSeverity = (disease) => {
  const diseaseName = String(disease || '').trim()
  if (!diseaseName) return null

  const map = loadDiseaseSeverityMap()
  const direct = map[diseaseName]
  if (Number.isInteger(direct)) return direct

  const match = Object.keys(map).find((key) => key.toLowerCase() === diseaseName.toLowerCase())
  return match ? map[match] : null
}

const detectRedFlags = (symptomsText = '') => {
  const normalized = normalizeText(symptomsText)
  if (!normalized) return { triggered: [], highestSeverity: 0 }

  const triggered = []
  let highestSeverity = 0

  for (const flag of RED_FLAGS) {
    const matches = (flag.patterns || []).some((pattern) => normalized.includes(normalizeText(pattern)))
    if (!matches) continue

    const severityLevel = Number(flag.severityLevel) || 0
    triggered.push({
      symptom: flag.symptom,
      severityLevel,
      reason: flag.reason,
    })
    if (severityLevel > highestSeverity) highestSeverity = severityLevel
  }

  return { triggered, highestSeverity }
}

const calculateSeverity = ({ disease, symptomsText }) => {
  const baselineLevel = getBaselineSeverity(disease)
  const redFlags = detectRedFlags(symptomsText)
  const highestTriggered = redFlags.highestSeverity || 0
  const finalLevel = Math.min(4, Math.max(baselineLevel || 1, highestTriggered || 0))

  const reasons = []
  if (baselineLevel) {
    reasons.push(`Baseline disease severity for ${disease || 'this condition'} is ${getSeverityLabel(baselineLevel)}.`)
  }
  if (redFlags.triggered.length) {
    redFlags.triggered.forEach((flag) => {
      reasons.push(flag.reason)
    })
  }

  if (!reasons.length) {
    reasons.push('No configured warning symptoms were detected from the reported symptoms.')
  }

  const severity = {
    level: finalLevel,
    label: getSeverityLabel(finalLevel),
    baselineLevel: baselineLevel || 1,
    redFlagsDetected: redFlags.triggered.length > 0,
    reasons: reasons.slice(0, 5),
    redFlagDetails: redFlags.triggered,
  }

  const action = finalLevel >= 4
    ? {
        type: 'emergency',
        message: 'Your reported symptoms include warning signs that may require immediate medical evaluation.',
      }
    : {
        type: 'monitor',
        message: 'Your reported symptoms may require prompt medical evaluation.',
      }

  return {
    severity,
    action,
    baselineLevel: baselineLevel || 1,
  }
}

module.exports = {
  loadDiseaseSeverityMap,
  getBaselineSeverity,
  detectRedFlags,
  calculateSeverity,
  getSeverityLabel,
  SEVERITY_LEVELS,
}

const fs = require('fs')
const path = require('path')

const DATASET_PATH = path.join(__dirname, 'Testing.csv')

let cached = null

const uniquifyHeaders = (headers) => {
  const seen = Object.create(null)
  const names = []
  const keepIndex = []

  headers.forEach((raw, index) => {
    const name = String(raw || '').trim()
    if (!name) return
    if (seen[name]) return
    seen[name] = true
    names.push(name)
    keepIndex.push(index)
  })

  return { names, keepIndex }
}

const parseCsv = (content) => {
  const lines = content
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('Testing.csv is empty or missing data rows.')
  }

  const headerCells = lines[0].split(',')
  const prognosisIndex = headerCells.length - 1
  const rawFeatureHeaders = headerCells.slice(0, prognosisIndex)
  const { names: featureNames, keepIndex } = uniquifyHeaders(rawFeatureHeaders)

  const samples = []

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(',')
    if (cells.length < headerCells.length) continue

    const y = String(cells[prognosisIndex] || '').trim()
    if (!y) continue

    const x = keepIndex.map((idx) => {
      const value = Number.parseInt(String(cells[idx] || '0').trim(), 10)
      return value === 1 ? 1 : 0
    })

    samples.push({ x, y })
  }

  return { featureNames, samples }
}

const loadSymptomDataset = () => {
  if (cached) return cached

  const content = fs.readFileSync(DATASET_PATH, 'utf8')
  const parsed = parseCsv(content)
  const classes = [...new Set(parsed.samples.map((s) => s.y))]

  cached = {
    path: DATASET_PATH,
    featureNames: parsed.featureNames,
    samples: parsed.samples,
    classes,
  }

  return cached
}

module.exports = { loadSymptomDataset, DATASET_PATH }

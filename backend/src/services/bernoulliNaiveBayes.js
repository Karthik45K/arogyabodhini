/**
 * Bernoulli Naive Bayes trained on binary symptom features.
 *
 * Incomplete input: only matched (stated) symptoms are used as evidence.
 * Unmentioned features are treated as missing and are left out of the
 * likelihood product, instead of being scored as confirmed absences.
 */
const DEFAULT_ALPHA = 1

const trainBernoulliNB = (samples, featureCount, alpha = DEFAULT_ALPHA) => {
  const stats = new Map()

  for (const sample of samples) {
    let entry = stats.get(sample.y)
    if (!entry) {
      entry = { count: 0, present: new Array(featureCount).fill(0) }
      stats.set(sample.y, entry)
    }
    entry.count += 1
    for (let i = 0; i < featureCount; i += 1) {
      if (sample.x[i] === 1) entry.present[i] += 1
    }
  }

  const n = samples.length
  const models = []

  for (const [name, entry] of stats.entries()) {
    const pPresent = new Array(featureCount)
    for (let i = 0; i < featureCount; i += 1) {
      pPresent[i] = (entry.present[i] + alpha) / (entry.count + 2 * alpha)
    }
    models.push({
      name,
      prior: entry.count / n,
      pPresent,
    })
  }

  return { models, n, alpha, featureCount }
}

const logSumExp = (values) => {
  const maxVal = Math.max(...values)
  let sum = 0
  for (const value of values) sum += Math.exp(value - maxVal)
  return maxVal + Math.log(sum)
}

const predictProba = (model, observedIndices) => {
  const logScores = model.models.map((cls) => {
    let logp = Math.log(cls.prior)
    for (const index of observedIndices) {
      const p1 = cls.pPresent[index]
      logp += Math.log(Math.max(p1, Number.EPSILON))
    }
    return logp
  })

  const normalizer = logSumExp(logScores)

  return model.models
    .map((cls, i) => ({
      disease: cls.name,
      probability: Math.exp(logScores[i] - normalizer),
    }))
    .sort((a, b) => b.probability - a.probability || a.disease.localeCompare(b.disease))
}

module.exports = { trainBernoulliNB, predictProba }

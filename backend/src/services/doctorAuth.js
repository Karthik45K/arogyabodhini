const crypto = require('crypto')

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

const verifyPassword = (password, storedHash) => {
  const [algorithm, salt, expected] = String(storedHash || '').split('$')
  if (algorithm !== 'scrypt' || !salt || !expected) return false

  const actual = crypto.scryptSync(password, salt, 64).toString('hex')
  return actual.length === expected.length && crypto.timingSafeEqual(
    Buffer.from(actual),
    Buffer.from(expected)
  )
}

module.exports = { hashPassword, verifyPassword }
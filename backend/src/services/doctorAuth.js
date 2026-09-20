const crypto = require('crypto')
const bcrypt = require('bcrypt')

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !password) return false
  const str = String(storedHash)

  // Check bcrypt hash ($2a$, $2b$, $2y$)
  if (str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(password, str)
    } catch {
      return false
    }
  }

  // Check scrypt hash
  const [algorithm, salt, expected] = str.split('$')
  if (algorithm !== 'scrypt' || !salt || !expected) return false

  try {
    const actual = crypto.scryptSync(password, salt, 64).toString('hex')
    return actual.length === expected.length && crypto.timingSafeEqual(
      Buffer.from(actual),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

module.exports = { hashPassword, verifyPassword }
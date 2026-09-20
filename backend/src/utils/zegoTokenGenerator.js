/**
 * zegoTokenGenerator.js
 * Official ZEGOCLOUD Token04 algorithm (AES-CBC).
 * Reference: https://github.com/ZEGOCLOUD/zego_server_assistant/tree/master/token/nodejs/server
 *
 * IMPORTANT: serverSecret is a 32-character UTF-8 string from the ZEGOCLOUD console.
 * Do NOT hex-decode it — that produces invalid tokens and "token authentication error".
 */

const crypto = require('crypto')

function rndNum(a, b) {
  return Math.ceil(a + (b - a) * Math.random())
}

function makeRandomIv() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function getAlgorithm(key) {
  switch (key.length) {
    case 16: return 'aes-128-cbc'
    case 24: return 'aes-192-cbc'
    case 32: return 'aes-256-cbc'
    default: throw new Error(`Invalid key length: ${key.length}`)
  }
}

function aesEncrypt(plainText, key, iv) {
  const keyBuf = Buffer.from(key, 'utf8')
  const ivBuf  = Buffer.from(iv, 'utf8')
  const cipher = crypto.createCipheriv(getAlgorithm(keyBuf), keyBuf, ivBuf)
  cipher.setAutoPadding(true)
  return Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
}

/**
 * generateToken04
 * @param {number} appId
 * @param {string} userId
 * @param {string} serverSecret - 32-byte string from ZEGOCLOUD console (NOT hex-decoded)
 * @param {number} effectiveTimeInSeconds
 * @param {string} payload
 */
function generateToken04(appId, userId, serverSecret, effectiveTimeInSeconds = 3600, payload = '') {
  if (!appId || typeof appId !== 'number') throw new Error('appId must be a number')
  if (!userId || typeof userId !== 'string') throw new Error('userId is required')
  if (!serverSecret || typeof serverSecret !== 'string' || serverSecret.length !== 32) {
    throw new Error('serverSecret must be a 32-byte string')
  }
  if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== 'number') {
    throw new Error('effectiveTimeInSeconds must be a number')
  }

  const createTime = Math.floor(Date.now() / 1000)
  const tokenInfo = {
    app_id:  appId,
    user_id: userId,
    nonce:   rndNum(-2147483648, 2147483647),
    ctime:   createTime,
    expire:  createTime + effectiveTimeInSeconds,
    payload: payload || '',
  }

  const plainText  = JSON.stringify(tokenInfo)
  const iv         = makeRandomIv()
  const encryptBuf = aesEncrypt(plainText, serverSecret, iv)

  const expireBuf = Buffer.alloc(8)
  expireBuf.writeBigInt64BE(BigInt(tokenInfo.expire))

  const ivLenBuf     = Buffer.alloc(2)
  ivLenBuf.writeUInt16BE(iv.length)

  const cipherLenBuf = Buffer.alloc(2)
  cipherLenBuf.writeUInt16BE(encryptBuf.length)

  const buf = Buffer.concat([
    expireBuf,
    ivLenBuf,
    Buffer.from(iv, 'utf8'),
    cipherLenBuf,
    encryptBuf,
  ])

  return '04' + buf.toString('base64')
}

module.exports = { generateToken04 }

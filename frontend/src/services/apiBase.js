/**
 * Shared API base URL & Server Wake-up Helper.
 * Supports Render (Backend free tier cold starts) & Netlify (Frontend SPA).
 */
const envUrl = import.meta.env.VITE_API_BASE_URL || ''
const configured = envUrl ? envUrl.replace(/\/$/, '') : (import.meta.env.DEV ? 'http://localhost:5000' : '')

export const API_BASE = configured

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return configured ? `${configured}${normalized}` : normalized
}

/**
 * Single ping to backend /health with timeout.
 */
export async function checkServerHealth(timeoutMs = 4000) {
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(apiUrl('/health'), {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: true, data, elapsedMs: Date.now() - start }
    }
    return { ok: false, status: res.status, elapsedMs: Date.now() - start }
  } catch (err) {
    clearTimeout(timer)
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : 'network_error', elapsedMs: Date.now() - start }
  }
}

/**
 * Polls backend until it spins up (Render free tier takes ~30-50s).
 */
export async function waitForServerReady(onProgress = () => {}, maxWaitMs = 70000) {
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    const elapsedSeconds = Math.round((Date.now() - start) / 1000)
    const result = await checkServerHealth(4000)

    if (result.ok) {
      onProgress({ status: 'active', elapsedSeconds })
      return true
    }

    onProgress({ status: 'warming_up', elapsedSeconds })
    // Wait 2.5 seconds before next retry
    await new Promise((r) => setTimeout(r, 2500))
  }

  onProgress({ status: 'timeout', elapsedSeconds: Math.round(maxWaitMs / 1000) })
  return false
}


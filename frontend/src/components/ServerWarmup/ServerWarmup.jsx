import React, { useState, useEffect } from 'react'
import { checkServerHealth, waitForServerReady } from '../../services/apiBase'
import './ServerWarmup.css'

const ServerWarmup = ({ onServerActive }) => {
  // states: 'checking' | 'ready' | 'warming' | 'connected' | 'error'
  const [status, setStatus] = useState('checking')
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // 1. Initial quick ping (2.2s timeout)
      const quickCheck = await checkServerHealth(2200)
      if (cancelled) return

      if (quickCheck.ok) {
        // Server is already warm and running - no intrusive banner needed!
        setStatus('ready')
        onServerActive?.()
        return
      }

      // 2. Server didn't respond within 2.2s, likely cold-started / spun down on Render free plan
      setStatus('warming')

      const success = await waitForServerReady(({ status: pollStatus, elapsedSeconds }) => {
        if (!cancelled) {
          setElapsed(elapsedSeconds)
          if (pollStatus === 'active') {
            setStatus('connected')
          }
        }
      }, 75000)

      if (cancelled) return

      if (success) {
        setStatus('connected')
        onServerActive?.()
        // Auto-dismiss the success badge after 2.5s
        setTimeout(() => {
          if (!cancelled) setStatus('ready')
        }, 2500)
      } else {
        setStatus('error')
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [onServerActive])

  // Don't render anything if already ready / warm
  if (status === 'ready' || status === 'checking') {
    return null
  }

  return (
    <div className={`server-warmup-banner server-warmup--${status}`} role="alert" aria-live="polite">
      <div className="server-warmup-content">
        <div className="server-warmup-icon">
          {status === 'warming' && <span className="server-warmup-spinner" aria-hidden="true" />}
          {status === 'connected' && <span className="server-warmup-check">✓</span>}
          {status === 'error' && <span className="server-warmup-warn">⚠️</span>}
        </div>

        <div className="server-warmup-text">
          <div className="server-warmup-title">
            {status === 'warming' && 'Connecting to Healthcare Server (Instance Waking Up...)'}
            {status === 'connected' && 'Healthcare Server Connected & Active!'}
            {status === 'error' && 'Server Connection Delayed'}
          </div>
          <div className="server-warmup-desc">
            {status === 'warming' && (
              <>
                Render free-tier instances sleep when idle. Starting up instance ({elapsed}s elapsed) — please hold on, your requests will connect automatically.
              </>
            )}
            {status === 'connected' && 'Ready! All consultations, AI diagnosis, and records are fully synced.'}
            {status === 'error' && 'Server is taking longer than expected. Please check your internet connection or refresh.'}
          </div>
        </div>

        {status === 'warming' && (
          <div className="server-warmup-badge">
            <span className="server-warmup-timer">{elapsed}s</span>
          </div>
        )}
      </div>

      {status === 'warming' && (
        <div className="server-warmup-bar-track">
          <div className="server-warmup-bar-fill" />
        </div>
      )}
    </div>
  )
}

export default ServerWarmup

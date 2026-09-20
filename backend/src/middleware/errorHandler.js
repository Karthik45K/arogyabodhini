/**
 * Global error handler middleware.
 * Must be registered last in app.js (after all routes).
 * Scalable: add logging, Sentry, etc. here in Phase 3+.
 */
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production'

  console.error(`[ERROR] ${req.method} ${req.originalUrl} —`, err.message)

  const status = err.statusCode || err.status || 500

  res.status(status).json({
    success: false,
    error: 'SERVER_ERROR',
    message: isDev
      ? err.message
      : 'An unexpected error occurred. Please try again later.',
    ...(isDev && { stack: err.stack }),
  })
}

module.exports = { errorHandler }

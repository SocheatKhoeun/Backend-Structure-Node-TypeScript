import type { Response } from 'express'
import { logger } from './logger.js'

/**
 * Align response shape with the PHP BaseAPI structure:
 *  - success: { status: 'success', message?: string, data: any }
 *  - error:   { status: 'error', message?: string, data: null }
 */

export function sendSuccess<T = unknown>(res: Response, data: T | null = null, message?: string, status = 200) {
  const body: { status: 'success'; message?: string | null; data: T | null } = {
    status: 'success',
    message: message ?? null,
    data,
  }
  return res.status(status).json(body)
}

export function sendError(res: Response, message: string | null = null, status = 400) {
  // Validate status code range (100-599). Fall back to 500 if invalid.
  const code = Number.isInteger(status) && status >= 100 && status < 600 ? status : 500

  // Log server/internal errors (5xx) as errors. Log client errors (4xx) at info
  // to avoid noisy error-level logs for expected authorization failures.
  if (message) {
    if (code >= 500) logger.error(message)
    else logger.info(message)
  }

  const body = {
    status: 'error' as const,
    message: message ?? null,
    data: null,
  }

  return res.status(code).json(body)
}

export default { sendSuccess, sendError }

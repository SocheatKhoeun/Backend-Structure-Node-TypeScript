import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { loginSchema } from '../../utils/validators.js'
import { logger } from '../../utils/logger.js'
import { sendError } from '../../utils/response.js'

export type LoginRequestData = z.infer<typeof loginSchema>

/**
 * Validate and return parsed data. If invalid, respond and return null.
 * Keeps validation rules in a single request-like file (Laravel Request style).
 */
export function validateOrRespond(req: Request, res: Response): LoginRequestData | null {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const path = first ? (first.path.join('.') || 'body') : 'body'
    const message = first ? `${path}: ${first.message}` : 'Invalid request body'
    logger.warn({ msg: 'Login validation failed', details: parsed.error.format() })
    sendError(res, message, 400)
    return null
  }
  return parsed.data
}

/**
 * Optional middleware variant to use in routes: sets req.body to parsed data.
 */
export function middleware(req: Request, res: Response, next: NextFunction) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const path = first ? (first.path.join('.') || 'body') : 'body'
    const message = first ? `${path}: ${first.message}` : 'Invalid request body'
    logger.warn({ msg: 'Login validation failed', details: parsed.error.format() })
    return sendError(res, message, 400)
  }
  req.body = parsed.data
  next()
}

export default { validateOrRespond, middleware }

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { registerSchema } from '../../utils/validators.js'
import { logger } from '../../utils/logger.js'
import { sendError } from '../../utils/response.js'

export type RegisterRequestData = z.infer<typeof registerSchema>

export function validateOrRespond(req: Request, res: Response): RegisterRequestData | null {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const path = first ? (first.path.join('.') || 'body') : 'body'
    const message = first ? `${path}: ${first.message}` : 'Invalid request body'
    logger.warn({ msg: 'Register validation failed', details: parsed.error.format() })
    sendError(res, message, 400)
    return null
  }
  return parsed.data
}

export function middleware(req: Request, res: Response, next: NextFunction) {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const path = first ? (first.path.join('.') || 'body') : 'body'
    const message = first ? `${path}: ${first.message}` : 'Invalid request body'
    logger.warn({ msg: 'Register validation failed', details: parsed.error.format() })
    return sendError(res, message, 400)
  }
  req.body = parsed.data
  next()
}

export default { validateOrRespond, middleware }

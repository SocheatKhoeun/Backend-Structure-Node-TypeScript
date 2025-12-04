import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { sendError } from '../utils/response.js'
import { isRevoked } from '../auth/tokenStore.js'
export interface JwtUser {
  id: number
  global_id: string
  username: string
  role: string
  permissions?: string[]
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser
    }
  }
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return sendError(res, 'Missing token', 401)
  try {
    if (isRevoked(token)) return sendError(res, 'Token revoked', 401)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtUser
    req.user = decoded
    next()
  } catch {
    return sendError(res, 'Invalid or expired token', 401)
  }
}
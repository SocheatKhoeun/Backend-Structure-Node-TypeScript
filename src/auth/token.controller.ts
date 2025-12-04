import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { sendError, sendSuccess } from '../utils/response.js'
import { isRevoked, revokeToken } from './tokenStore.js'
import { getSetting } from '../config/settings.js'
import { logger } from '../utils/logger.js'

// Helper to extract token string from Authorization header
function getRawToken(req: Request) {
  return req.headers.authorization?.replace('Bearer ', '')
}

export const refreshToken = (req: Request, res: Response) => {
  const token = getRawToken(req)
  if (!token) return sendError(res, 'Missing token', 401)

  // Verify token; only allow refresh for valid, non-revoked tokens.
  try {
    if (isRevoked(token)) return sendError(res, 'Token revoked', 401)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, any>

    // Remove standard JWT claims from payload if present
    const { iat, exp, nbf, jti, ...payload } = decoded
  // Revoke the old token so it cannot be used again
  const expiry = typeof exp === 'number' ? exp : undefined
  revokeToken(token, expiry)

  // Read new access token TTL (minutes) from settings; default 360 (6h)
  const accessTtlMinutes = Number(getSetting('jwt_ttl_refresh')) || 360
  const accessTtlSeconds = accessTtlMinutes * 60

  const newToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: accessTtlSeconds })
  return sendSuccess(res, { token: newToken }, 'Token refreshed')
  } catch (err: any) {
    logger.warn({ msg: 'refreshToken failed', err })
    return sendError(res, 'Invalid or expired token', 401)
  }
}

export const logout = (req: Request, res: Response) => {
  const token = getRawToken(req)
  if (!token) return sendError(res, 'Missing token', 401)

  // Try to decode to get expiry and then revoke until that expiry.
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, any>
    const exp = typeof decoded.exp === 'number' ? decoded.exp : undefined
    revokeToken(token, exp)
    return sendSuccess(res, null, 'Logged out')
  } catch (err: any) {
    // If token is invalid/expired, still consider user logged out but return 401
    logger.warn({ msg: 'logout failed to verify token', err })
    return sendError(res, 'Invalid or expired token', 401)
  }
}

export default { refreshToken, logout }

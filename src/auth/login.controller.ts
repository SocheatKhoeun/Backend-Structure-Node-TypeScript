import { query } from '../db/index.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express'
import { normalizePermissions } from '../db/rolePermissionsFromJson.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { validateOrRespond as validateLogin } from '../requests/auth/LoginRequest.js'
import { getSetting } from '../config/settings.js'

export const login = async (req: Request, res: Response) => {
  const body = validateLogin(req, res)
  if (!body) return
  const { email, password } = body
  const result = await query(
    `SELECT u.id, u.global_id, u.username, u.password, r.name AS role, r.permissions
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1
      LIMIT 1`,
    [email]
  )

  const user = result.rows[0]
  if (!user) return sendError(res, 'Invalid credentials', 401)
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  // Determine access token TTL from settings (minutes). Default 5 minutes.
  const accessTtlMinutes = Number(getSetting('jwt_tt')) || 5
  const accessTtlSeconds = accessTtlMinutes * 60
  const token = jwt.sign(
    { id: user.id, global_id: user.global_id, username: user.username, role: user.role, permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: accessTtlSeconds }
  )

  // Try to include role.permissions in the token payload for faster checks at runtime.
  // We normalize either array or nested object shapes to a flat array of permission strings.
  const permsRaw = user.permissions
  const permsSet = normalizePermissions(permsRaw)
  const permsArray = Array.from(permsSet)

  const tokenWithPerms = jwt.sign(
    { id: user.id, global_id: user.global_id, username: user.username, role: user.role, permissions: permsArray },
    process.env.JWT_SECRET!,
    { expiresIn: accessTtlSeconds }
  )

  // Do not return password or other sensitive fields. Convert id to string to
  // avoid BigInt/serialization issues.
  const safeUser = {
    id: String(user.id),
    global_id: user.global_id,
    username: user.username,
    role: user.role,
    permissions: permsArray,
  }

  return sendSuccess(res, { token: tokenWithPerms, user: safeUser })
}
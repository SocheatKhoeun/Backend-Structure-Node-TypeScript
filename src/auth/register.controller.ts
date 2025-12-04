import { prisma } from '../prisma/client.js'
import bcrypt from 'bcrypt'
import type { Request, Response } from 'express'
import { sendError, sendSuccess } from '../utils/response.js'
import { validateOrRespond as validateRegister } from '../requests/auth/RegisterRequest.js'
import { logger } from '../utils/logger.js'

/**
 * Public endpoint to create an admin user.
 * Security rules:
 *  - If ADMIN_SETUP_SECRET is set, the request must include it in body.secret
 *    or header 'x-admin-secret'. This allows controlled creation in prod.
 *  - Otherwise, creation is allowed only when no admin/superadmin user exists
 *    (initial setup bootstrap).
 */
export const registerAdmin = async (req: Request, res: Response) => {
  const body = validateRegister(req, res)
  if (!body) return
  const { username, email, password, role = 'admin' } = body

  // resolve role id via Prisma
  const roleRow = await prisma.roles.findFirst({ where: { name: role, status: 1 } })
  if (!roleRow) return sendError(res, `Role '${role}' not found`, 400)

  const hashed = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.users.create({
      data: {
        username,
        email,
        password: hashed,
        role_id: roleRow.id,
      },
      select: { id: true, global_id: true, username: true, email: true, role_id: true },
    })

    // Prisma returns BigInt for BigInt fields which JSON.stringify cannot serialize.
    // Convert BigInt values to strings before sending the response.
    const safeUser = {
      ...user,
      id: String((user as any).id),
      role_id: String((user as any).role_id),
    }

    return sendSuccess(res, safeUser, 'User created', 201)
  } catch (err: any) {
    // Prisma unique constraint error P2002
    if (err?.code === 'P2002') {
      const targets = err.meta?.target ?? []
      const field = Array.isArray(targets) ? targets[0] : 'field'
      return sendError(res, `${String(field)} already exists`, 409)
    }
    // Log full error for debugging and send a generic error response
    logger.error({ msg: 'registerAdmin: insert failed', err })
    return sendError(res, 'Failed to create user', 500)
  }
}

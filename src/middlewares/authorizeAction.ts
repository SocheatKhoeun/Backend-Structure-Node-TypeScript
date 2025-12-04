import type { Request, Response, NextFunction } from 'express'
import { RoleAccess, RoleHierarchy } from '../config/roles.js'
import { getPermissionsForRoleFromJson } from '../db/rolePermissionsFromJson.js'
import { sendError } from '../utils/response.js'
import { logger } from '../utils/logger.js'

function expandRole(role: string): Set<string> {
  const out = new Set<string>([role])
  const stack = [role]
  while (stack.length) {
    const r = stack.pop()!
    for (const child of (RoleHierarchy[r] || [])) {
      if (!out.has(child)) { out.add(child); stack.push(child) }
    }
  }
  return out
}

/**
 * authorizeAction accepts either:
 *  - (module, action) e.g. ('customers','view')
 *  - (permissionString) e.g. ('customers.view')
 *
 * It first tries to check permissions from the DB. If no permissions are found
 * for the role (for example DB not migrated or not seeded), it falls back to
 * the static `RoleAccess` config for backwards compatibility.
 */
export const authorizeAction =
  (moduleOrPermission: string, maybeAction?: string) =>
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) return sendError(res, 'Unauthorized', 401)

      const permission = maybeAction ? `${moduleOrPermission}.${maybeAction}` : moduleOrPermission

      try {
        // First, prefer permissions that were embedded in the JWT at login for best performance.
        // If JWT contains permissions, check them first; if the permission is missing there,
        // do NOT immediately deny — fall back to DB-backed permissions and static RoleAccess.
        const normalizedPermission = String(permission).trim().toLowerCase()

        if (req.user.permissions && Array.isArray(req.user.permissions) && req.user.permissions.length > 0) {
          const pset = new Set<string>(req.user.permissions.map((p: any) => String(p).trim().toLowerCase()))
          if (pset.has(normalizedPermission)) return next()
          logger.debug({ msg: 'authorizeAction: token perms missing permission', role: req.user.role, permission: normalizedPermission, tokenPermissionsCount: pset.size })
          // Also log the actual token permissions at info level so it appears with default logger level in local dev
          logger.info({ msg: 'authorizeAction: token permissions', role: req.user.role, tokenPermissions: Array.from(pset).slice(0, 200) })
          // fallthrough to DB check below when token permissions don't include the permission
        }

        const perms = await getPermissionsForRoleFromJson(req.user.role)
        // If DB role row contains permissions, use JSON-backed check
        if (perms.size > 0) {
          const permsNormalized = new Set(Array.from(perms).map((p: string) => String(p).trim().toLowerCase()))
          if (permsNormalized.has(normalizedPermission)) return next()
          logger.debug({ msg: 'authorizeAction: db perms do not include permission', role: req.user.role, permission: normalizedPermission, dbPermissionsCount: permsNormalized.size })
          // Also log the actual DB permissions at info level so it appears with default logger level in local dev
          logger.info({ msg: 'authorizeAction: db permissions', role: req.user.role, dbPermissions: Array.from(permsNormalized).slice(0, 200) })
          return sendError(res, `Does not have permission.||មិនមានសិទ្ធិចូលប្រើប្រាស់`, 403)
        }
      } catch (err) {
        // DB access failed — we'll fall back to static config below but log the error
        console.error('authorizeAction: role.permissions DB lookup failed:', err)
      }

      // Fallback to static RoleAccess mapping
      const parts = permission.split('.')
      if (parts.length !== 2) return sendError(res, `Does not have permission.||មិនមានសិទ្ធិចូលប្រើប្រាស់`, 403)
      const [moduleName, action] = parts

      // RoleAccess typing is narrow; use `any` at this access point for simplicity
      const moduleObj = (RoleAccess as any)[String(moduleName)]
      const allowed = (moduleObj && moduleObj[String(action)]) ? moduleObj[String(action)] : []
      const roles = expandRole(req.user.role)
      for (const r of allowed) if (roles.has(r)) return next()

      return sendError(res, `Does not have permission.||មិនមានសិទ្ធិចូលប្រើប្រាស់`, 403)
    }
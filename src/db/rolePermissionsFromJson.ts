import { prisma } from '../prisma/client.js'

// Simple in-memory cache for role -> Set<permission>
const cache = new Map<string, { perms: Set<string>; ts: number }>()
const TTL = Number(process.env.ROLE_PERM_TTL_MS) || 30 * 1000 // 30 seconds default
const MAX_PERMS = 1000 // safety cap to avoid huge payloads

function flattenPermissionObject(obj: Record<string, Record<string, unknown>>): string[] {
  const out: string[] = []
  for (const [moduleName, actions] of Object.entries(obj)) {
    if (!actions || typeof actions !== 'object') continue
    for (const [action, allowed] of Object.entries(actions)) {
      // Accept multiple representations of "true" from JSON: boolean true,
      // numeric 1, string '1' or 'true' (case-insensitive).
      const isAllowed = (allowed === true) || (allowed === 1) || (allowed === '1') || (typeof allowed === 'string' && allowed.toLowerCase() === 'true')
      if (isAllowed) out.push(`${moduleName}.${action}`)
    }
  }
  return out
}

export function normalizePermissions(raw: unknown): Set<string> {
  if (!raw) return new Set()
  // flat array of strings
  if (Array.isArray(raw)) {
    const filtered = raw.filter((p) => typeof p === 'string') as string[]
    return new Set(filtered.slice(0, MAX_PERMS))
  }

  // object shape: { module: { action: true/false } }
  if (typeof raw === 'object') {
    try {
      const flattened = flattenPermissionObject(raw as Record<string, Record<string, unknown>>)
      return new Set(flattened.slice(0, MAX_PERMS))
    } catch (err) {
      console.error('normalizePermissions: failed to flatten permission object', err)
      return new Set()
    }
  }

  // otherwise unsupported shape
  return new Set()
}

export async function getPermissionsForRoleFromJson(roleName: string): Promise<Set<string>> {
  const cached = cache.get(roleName)
  if (cached && Date.now() - cached.ts < TTL) return cached.perms

  // First try lookup by role name
  let row: any = await prisma.roles.findFirst({ where: { name: roleName }, select: { permissions: true, status: true } })

  // If not found and roleName looks numeric, also try lookup by id
  if (!row) {
    const maybeId = Number(roleName)
    if (!Number.isNaN(maybeId)) {
      try {
        row = await prisma.roles.findFirst({ where: { id: maybeId }, select: { permissions: true, status: true } })
      } catch (err) {
        // ignore and continue to return empty
        console.error('getPermissionsForRoleFromJson: numeric id lookup failed', err)
      }
    }
  }

  // If role is inactive or deleted, return empty set for security
  if (!row || (row.status !== undefined && row.status !== 1)) {
    const empty = new Set<string>()
    cache.set(roleName, { perms: empty, ts: Date.now() })
    return empty
  }

  const raw = row.permissions
  const perms = normalizePermissions(raw)
  cache.set(roleName, { perms, ts: Date.now() })
  return perms
}

export function clearPermissionCache(roleName?: string) {
  if (!roleName) return cache.clear()
  cache.delete(roleName)
}


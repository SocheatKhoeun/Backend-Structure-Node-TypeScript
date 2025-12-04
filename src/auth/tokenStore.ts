/**
 * Simple in-memory token blacklist with expiry cleanup.
 * Note: non-persistent. Replace with Redis/DB in production.
 */
const revoked = new Map<string, number>() // token -> expiry (unix seconds)

// Revoke a token until its expiry. If expirySeconds not provided, revoke for 1 hour.
export function revokeToken(token: string, expirySeconds?: number) {
  const now = Math.floor(Date.now() / 1000)
  const until = expirySeconds ? expirySeconds : now + 3600
  revoked.set(token, until)
}

export function isRevoked(token: string) {
  const until = revoked.get(token)
  if (!until) return false
  const now = Math.floor(Date.now() / 1000)
  if (now >= until) {
    revoked.delete(token)
    return false
  }
  return true
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Math.floor(Date.now() / 1000)
  for (const [t, until] of revoked.entries()) {
    if (now >= until) revoked.delete(t)
  }
}, 60 * 1000)

export default { revokeToken, isRevoked }

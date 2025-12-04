import { query } from '../db/index.js'
import { logger } from '../utils/logger.js'

type SettingsMap = Record<string, string>

let cached: SettingsMap | null = null

/**
 * Load settings from the `settings` table into memory.
 * Returns a plain object mapping key -> value (strings).
 */
export async function loadSettings(): Promise<SettingsMap> {
  if (cached) return cached
  try {
    const result = await query('SELECT key, value FROM settings WHERE status = 1')
    const map: SettingsMap = {}
    for (const row of result.rows) {
      // store as string; consumers can parse JSON/number/boolean as needed
      map[String(row.key)] = row.value === null ? '' : String(row.value)
    }
    cached = map
    logger.info({ msg: 'Loaded settings', count: Object.keys(map).length })
    return map
  } catch (err) {
    logger.error({ msg: 'Failed to load settings', err })
    cached = {}
    return cached
  }
}

/**
 * Force reload settings from DB (useful after writes)
 */
export async function refreshSettings(): Promise<SettingsMap> {
  cached = null
  return loadSettings()
}

export function getSetting(key: string, defaultValue: string | null = null): string | null {
  if (!cached) return defaultValue
  if (Object.prototype.hasOwnProperty.call(cached, key)) {
    const v = cached[key]
    return v === undefined ? defaultValue : v
  }
  return defaultValue
}

export function getAllSettings(): SettingsMap {
  return cached ?? {}
}

export default { loadSettings, getSetting, getAllSettings }

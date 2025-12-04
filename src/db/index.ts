import pkg from 'pg'
import dotenv from 'dotenv'
// Only load .env in non-production to avoid overriding platform-provided env vars
if ((process.env.NODE_ENV || 'development') !== 'production') {
  dotenv.config()
}

const { Pool } = pkg

// Build pool config either from a single DATABASE_URL or from separate env fields.
// Prefer DATABASE_URL when present for backwards compatibility.
const poolConfig: any = {}
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL
} else {
  // support both DB_* and PG* env var conventions
  poolConfig.host = process.env.DB_HOST || process.env.PGHOST || 'localhost'
  poolConfig.user = process.env.DB_USER || process.env.PGUSER || 'postgres'
  poolConfig.password = process.env.DB_PASSWORD || process.env.PGPASSWORD || ''
  poolConfig.database = process.env.DB_NAME || process.env.PGDATABASE || undefined
  const port = process.env.DB_PORT || process.env.PGPORT
  if (port) poolConfig.port = parseInt(port, 10)
}

// SSL: allow explicit DB_SSL=true or fallback to false. If you need custom
// SSL options, set DB_SSL to 'true' and configure more in code.
if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') {
  poolConfig.ssl = { rejectUnauthorized: false }
} else {
  poolConfig.ssl = false
}

export const pool = new Pool(poolConfig)

pool.on('connect', () => console.log('✅ Connected to PostgreSQL'))
pool.on('error', (err) => console.error('❌ PostgreSQL error:', err))

// Try a quick test query to verify the database is reachable. Exported so
// callers (for example server startup) can await this and fail fast.
export async function testConnection(): Promise<void> {
  try {
    // a tiny query that should always succeed if DB is reachable
    await pool.query('SELECT 1')
    console.log('✅ Connect database success')
  } catch (err) {
    console.error('❌ Connect database failed:', err)
    // rethrow so callers can decide to exit the process
    throw err
  }
}

export const query = (text: string, params?: any[]) => pool.query(text, params)
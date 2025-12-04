// Load environment variables as early as possible so Prisma's env("DATABASE_URL")
// can be resolved regardless of import order elsewhere in the app.
import dotenv from 'dotenv'
// Only load .env in non-production environments. Dokku injects env vars at
// runtime, so avoid overriding them with a checked-in .env file.
if ((process.env.NODE_ENV || 'development') !== 'production') {
  dotenv.config()
}

import { PrismaClient } from '@prisma/client'

// Helpful warning if DATABASE_URL isn't set yet (Prisma will also throw a clear
// error, but this makes diagnosis easier when code imports the client directly).
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('Warning: DATABASE_URL is not set in the environment. Prisma may fail to initialize.')
}

// Single shared client instance
export const prisma = new PrismaClient()

// Optional: log queries in non-prod (typed as any to avoid strict callback typing)
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e: any) => {
    // keep this commented by default to avoid noisy logs
    // console.debug('prisma query', e)
  })
}

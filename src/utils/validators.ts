import { z, type ZodSchema } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { sendError } from './response.js'
import { logger } from './logger.js'

// Register body schema
export const registerSchema = z.object({
  username: z.string().min(3, 'username must be at least 3 characters'),
  email: z.string().email('invalid email'),
  password: z.string().min(8, 'password must be at least 8 characters'),
  role: z.string().optional(),
  secret: z.string().optional(),
})

// Login schema
export const loginSchema = z.object({
  email: z.string().email('invalid email'),
  password: z.string().min(1, 'password is required'),
})

// Phone validator example (simple). You can replace with libphonenumber-js for stronger checks.
export const phoneSchema = z.string().regex(/^\+?[0-9]{7,15}$/, 'invalid phone number')

// Generic middleware factory for validating req.body with a Zod schema.
export const validateSchema = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const first = result.error.errors[0]
      // build simple message: "field: message". Guard in case first is undefined.
      const path = first ? (first.path.join('.') || 'body') : 'body'
      const message = first ? `${path}: ${first.message}` : 'Invalid request body'

      // Log full validation details for debugging while returning a concise error to client
      logger.warn({ msg: 'Validation failed', schema: schema.constructor?.name ?? 'schema', details: result.error.format() })

      return sendError(res, message, 400)
    }
    // replace req.body with the parsed data (narrowed/typed)
    req.body = result.data
    return next()
  }
}

export default { registerSchema, loginSchema, phoneSchema, validateSchema }

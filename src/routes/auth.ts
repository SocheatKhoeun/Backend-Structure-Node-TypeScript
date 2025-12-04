import express from 'express'
import { login } from '../auth/login.controller.js'
import { registerAdmin } from '../auth/register.controller.js'
import { refreshToken, logout } from '../auth/token.controller.js'
import { auth } from '../middlewares/auth.js'

const r = express.Router()

// Public auth routes
r.post('/login', login)
r.post('/register-admin', registerAdmin)

// Token endpoints
r.post('/auth/refresh-token', auth, refreshToken)
r.post('/auth/logout', auth, logout)

export default r


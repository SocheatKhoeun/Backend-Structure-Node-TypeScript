import dotenv from 'dotenv'
// Only load local .env in non-production environments. On Dokku the runtime
// environment variables are provided by the platform — avoid loading or
// overriding them in production to prevent PORT/DATABASE_URL from being
// shadowed by a checked-in .env file.
if ((process.env.NODE_ENV || 'development') !== 'production') {
	dotenv.config()
}

const start = async () => {
	try {
		// ensure DB is reachable before bringing up the HTTP server
		const { testConnection } = await import('./db/index.js')
		await testConnection()

		// Load settings from DB into memory and attach to app.locals before starting
		const { loadSettings } = await import('./config/settings.js')
		const settings = await loadSettings()

		const { default: app } = await import('./app.js')
			// attach settings to express app locals for easy access in handlers
			; (app as any).locals = (app as any).locals || {}
			; (app as any).locals.settings = settings

		const port = process.env.PORT ? Number(process.env.PORT) : 8000
		const host = process.env.HOST || '0.0.0.0'
		// get method for test it work or not
		app.get('/test', (req, res) => {
			res.send('Test endpoint is working!')
		})
		app.listen(port, host, () => console.log(`🚀 Server running on http://${host}:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`))
	} catch (err) {
		console.error('Failed to start server:')
		console.error(err)
		// print stack if available
		if ((err as any)?.stack) console.error((err as any).stack)
		process.exit(1)
	}
}

start()
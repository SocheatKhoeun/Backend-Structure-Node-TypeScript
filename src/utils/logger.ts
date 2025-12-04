// Lightweight console-based logger to replace pino. Keeps the same API
// (debug, info, warn, error, child) so existing code doesn't need changes.
const makeLogger = () => {
    const log = (level: 'debug' | 'info' | 'warn' | 'error', args: any[]) => {
        // If a single object is passed, print as JSON for readability
        if (args.length === 1 && typeof args[0] === 'object') {
            try {
                console[level](JSON.stringify(args[0]))
                return
            } catch {
                // fall through
            }
        }
        // Otherwise just print the arguments normally
        // eslint-disable-next-line no-console
        console[level](...args)
    }

    const logger = {
        debug: (...args: any[]) => log('debug', args),
        info: (...args: any[]) => log('info', args),
        warn: (...args: any[]) => log('warn', args),
        error: (...args: any[]) => log('error', args),
        child: () => logger as any,
    }

    return logger
}

export const logger = makeLogger()
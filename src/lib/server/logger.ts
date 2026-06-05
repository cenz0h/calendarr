type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, scope: string, msg: string, extra?: unknown): void {
	const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}] ${msg}`;
	const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
	if (extra !== undefined) fn(line, extra);
	else fn(line);
}

export function log(scope: string) {
	return {
		info: (msg: string, extra?: unknown) => emit('info', scope, msg, extra),
		warn: (msg: string, extra?: unknown) => emit('warn', scope, msg, extra),
		error: (msg: string, extra?: unknown) => emit('error', scope, msg, extra),
		debug: (msg: string, extra?: unknown) => emit('debug', scope, msg, extra)
	};
}

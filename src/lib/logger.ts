type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface BaseFields {
  requestId?: string;
  [key: string]: unknown;
}

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentThreshold(): number {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return LEVELS[raw as LogLevel] ?? LEVELS.info;
}

function emit(level: LogLevel, event: string, fields: BaseFields = {}) {
  if (LEVELS[level] < currentThreshold()) return;
  const line =
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...fields,
    }) + '\n';
  const stream = level === 'warn' || level === 'error' ? process.stderr : process.stdout;
  // En el runtime Edge (middleware) y en el browser, `process.std*` no existen.
  // Caemos a `console.warn` (permitido por el no-console) para no romper.
  if (stream && typeof stream.write === 'function') {
    stream.write(line);
    return;
  }
  console.warn(line.trimEnd());
}

export const logger = {
  debug: (event: string, fields?: BaseFields) => emit('debug', event, fields),
  info: (event: string, fields?: BaseFields) => emit('info', event, fields),
  warn: (event: string, fields?: BaseFields) => emit('warn', event, fields),
  error: (event: string, fields?: BaseFields) => emit('error', event, fields),
};

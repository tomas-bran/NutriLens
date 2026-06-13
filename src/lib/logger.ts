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
  const payload = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  // `process.stdout`/`stderr` solo existen en el runtime Node. En Edge (el
  // middleware corre ahí) y en el browser no están: caemos a console para no
  // romper (TypeError: reading 'write' de undefined).
  const stream = level === 'warn' || level === 'error' ? process.stderr : process.stdout;
  if (stream && typeof stream.write === 'function') {
    stream.write(payload + '\n');
  } else {
    // Edge/browser: sin process streams. console.warn está permitido por el
    // lint (no-console) y sirve igual como salida estructurada de diagnóstico.
    console.warn(payload);
  }
}

export const logger = {
  debug: (event: string, fields?: BaseFields) => emit('debug', event, fields),
  info: (event: string, fields?: BaseFields) => emit('info', event, fields),
  warn: (event: string, fields?: BaseFields) => emit('warn', event, fields),
  error: (event: string, fields?: BaseFields) => emit('error', event, fields),
};

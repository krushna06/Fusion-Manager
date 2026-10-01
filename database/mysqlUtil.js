const CONNECTION_ERROR_CODES = new Set([
  'ER_CON_COUNT_ERROR',
  'PROTOCOL_CONNECTION_LOST',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'ECONNRESET',
  'EHOSTUNREACH'
]);

export function isConnectionError(error) {
  if (!error) return false;
  if (CONNECTION_ERROR_CODES.has(error.code)) return true;
  if (error.errno === 1040) return true;
  if (error.fatal === true) return true;
  return false;
}

export async function withRetry(operation, { retries = 3, baseDelay = 500, onRetry } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && isConnectionError(error);
      if (!canRetry) throw error;

      const delay = baseDelay * 2 ** attempt;
      onRetry?.(error, attempt + 1, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

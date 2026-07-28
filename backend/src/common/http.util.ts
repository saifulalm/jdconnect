/**
 * fetch with a hard timeout. Without one, a hung supplier or gateway keeps
 * the request (and its DB connection) alive indefinitely, which is how a
 * single slow upstream takes the whole service down.
 */
export const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error(`Upstream timeout after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  }
}

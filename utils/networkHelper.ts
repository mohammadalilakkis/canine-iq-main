export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof (error as Record<string, unknown>)?.message === 'string'
          ? (error as Record<string, string>).message
          : JSON.stringify(error);

  const networkPatterns = [
    'network request failed',
    'failed to fetch',
    'networkerror',
    'fetch error',
    'load failed',
    'timeout',
    'aborted',
    'net::err',
    'econnrefused',
    'enotfound',
    'unable to resolve host',
    'no internet',
    'offline',
    'the internet connection appears to be offline',
  ];

  const lower = message.toLowerCase();
  return networkPatterns.some(pattern => lower.includes(pattern));
}

export function getOfflineMessage(): string {
  return "You're offline. Changes saved on this device and will sync when connected.";
}

export async function checkIsOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
}

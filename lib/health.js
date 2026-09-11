// lib/health.js — Vérification de santé des flux
export async function checkStreamHealth(url, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
      cache: 'no-store',
    });

    clearTimeout(timer);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : 'network' };
  }
}

export function isMixedContent(url) {
  if (typeof window === 'undefined') return false;
  return url.startsWith('http:') && window.location.protocol === 'https:';
}

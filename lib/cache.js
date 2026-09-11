// lib/cache.js — Wrapper Redis (Vercel KV / Upstash / mémoire)
let memoryCache = new Map();

function getEnv() {
  if (process.env.KV_URL) {
    return { type: 'vercel-kv', url: process.env.KV_URL, token: process.env.KV_REST_API_TOKEN };
  }
  if (process.env.UPSTASH_REDIS_REST_URL) {
    return { type: 'upstash', url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  }
  return { type: 'memory' };
}

async function kvFetch(path, method = 'GET', body = null) {
  const env = getEnv();
  if (env.type === 'memory') return null;

  const res = await fetch(`${env.url}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${env.token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!res.ok) return null;
  return res.json();
}

export async function cacheGet(key) {
  const env = getEnv();

  if (env.type === 'memory') {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  const data = await kvFetch(`/get/${encodeURIComponent(key)}`);
  return data ? JSON.parse(data.result) : null;
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  const env = getEnv();

  if (env.type === 'memory') {
    memoryCache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
    return true;
  }

  await kvFetch(`/set/${encodeURIComponent(key)}`, 'POST', {
    value: JSON.stringify(value),
    ex: ttlSeconds
  });
  return true;
}

export async function cacheDelete(key) {
  const env = getEnv();
  if (env.type === 'memory') {
    memoryCache.delete(key);
    return true;
  }
  await kvFetch(`/del/${encodeURIComponent(key)}`);
  return true;
}

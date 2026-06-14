type ServerCacheEntry<T> = {
  expiresAt: number;
  value: Promise<T> | T;
};

const serverMemoryCache = new Map<string, ServerCacheEntry<unknown>>();

export async function readServerCache<T>(key: string, ttlMs: number, load: () => Promise<T>) {
  const cachedEntry = serverMemoryCache.get(key) as ServerCacheEntry<T> | undefined;
  const now = Date.now();

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.value;
  }

  if (cachedEntry) {
    serverMemoryCache.delete(key);
  }

  const pendingValue = load();
  serverMemoryCache.set(key, {
    expiresAt: now + ttlMs,
    value: pendingValue
  });

  try {
    const value = await pendingValue;
    serverMemoryCache.set(key, {
      expiresAt: Date.now() + ttlMs,
      value
    });
    return value;
  } catch (error) {
    serverMemoryCache.delete(key);
    throw error;
  }
}

export function invalidateServerCache(prefix: string) {
  for (const key of serverMemoryCache.keys()) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    serverMemoryCache.delete(key);
  }
}

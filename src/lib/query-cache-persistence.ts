"use client";

import { dehydrate, hydrate, type DehydratedState, type QueryClient } from "@tanstack/react-query";

const queryCacheStorageKey = "neolytics:query-cache:v1";
const queryCacheMaxAgeMs = 1000 * 60 * 10;
const queryCacheWriteDelayMs = 800;
const persistedQueryRoots = new Set([
  "community",
  "dashboard",
  "demo-manager",
  "entitlements",
  "finance",
  "games",
  "opportunities",
  "projects",
  "reports"
]);

type PersistedQueryCache = {
  version: 1;
  savedAt: number;
  state: DehydratedState;
};

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function shouldPersistQueryKey(queryKey: readonly unknown[]) {
  const root = queryKey[0];

  if (typeof root !== "string") {
    return false;
  }

  return persistedQueryRoots.has(root);
}

function persistQueryCache(queryClient: QueryClient) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  const state = dehydrate(queryClient, {
    shouldDehydrateQuery(query) {
      if (query.state.status !== "success") {
        return false;
      }

      return shouldPersistQueryKey(query.queryKey);
    }
  });

  if (state.queries.length === 0) {
    storage.removeItem(queryCacheStorageKey);
    return;
  }

  const payload: PersistedQueryCache = {
    version: 1,
    savedAt: Date.now(),
    state
  };

  try {
    storage.setItem(queryCacheStorageKey, JSON.stringify(payload));
  } catch {
    storage.removeItem(queryCacheStorageKey);
  }
}

export function restoreQueryCache(queryClient: QueryClient) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  const rawPayload = storage.getItem(queryCacheStorageKey);

  if (!rawPayload) {
    return;
  }

  try {
    const payload = JSON.parse(rawPayload) as PersistedQueryCache;

    if (payload.version !== 1) {
      storage.removeItem(queryCacheStorageKey);
      return;
    }

    if (Date.now() - payload.savedAt > queryCacheMaxAgeMs) {
      storage.removeItem(queryCacheStorageKey);
      return;
    }

    hydrate(queryClient, payload.state);
  } catch {
    storage.removeItem(queryCacheStorageKey);
  }
}

export function startQueryCachePersistence(queryClient: QueryClient) {
  if (!getSessionStorage()) {
    return () => {};
  }

  let timeoutId: number | null = null;

  function writeCache() {
    timeoutId = null;
    persistQueryCache(queryClient);
  }

  function scheduleWrite() {
    if (timeoutId !== null) {
      return;
    }

    timeoutId = window.setTimeout(writeCache, queryCacheWriteDelayMs);
  }

  const unsubscribe = queryClient.getQueryCache().subscribe(scheduleWrite);
  window.addEventListener("pagehide", writeCache);

  return () => {
    unsubscribe();
    window.removeEventListener("pagehide", writeCache);

    if (timeoutId === null) {
      return;
    }

    window.clearTimeout(timeoutId);
  };
}

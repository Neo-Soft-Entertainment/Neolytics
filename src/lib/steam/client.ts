import { env } from "@/env";
import { logger } from "@/lib/logger";
import { sleep } from "@/lib/sleep";
import type {
  SteamAppDetailsResponse,
  SteamAppListResponse,
  SteamPlayerCountResponse,
  SteamPublicSearchResponse,
  SteamReviewSummaryResponse
} from "@/lib/steam/types";

async function fetchWithRetry<T>(url: string, init?: RequestInit, attempt = 1): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store"
  });

  if (response.ok) {
    return (await response.json()) as T;
  }

  if (attempt >= 4) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }

  const delay = env.STEAM_REQUEST_DELAY_MS * attempt * 2;
  logger.warn({ url, status: response.status, attempt, delay }, "Steam request failed, retrying");
  await sleep(delay);
  return fetchWithRetry<T>(url, init, attempt + 1);
}

export async function fetchSteamAppList() {
  if (env.STEAM_WEB_API_KEY) {
    const params = new URLSearchParams({
      key: env.STEAM_WEB_API_KEY,
      include_games: "true",
      include_dlc: "false",
      include_software: "false",
      include_videos: "false",
      include_hardware: "false",
      max_results: "50000"
    });
    const url = `https://partner.steam-api.com/IStoreService/GetAppList/v1/?${params.toString()}`;
    return fetchWithRetry<SteamAppListResponse>(url);
  }

  const url = `${env.STEAM_API_BASE_URL}/ISteamApps/GetAppList/v2/`;
  return fetchWithRetry<SteamAppListResponse>(url);
}

export async function fetchSteamCatalogAppIds(offset: number, count: number) {
  if (env.STEAM_WEB_API_KEY) {
    const list = await fetchSteamAppList();
    return list.applist.apps
      .filter((app) => app.name.trim().length > 0)
      .slice(offset, offset + count)
      .map((app) => app.appid);
  }

  const params = new URLSearchParams({
    query: "",
    start: String(offset),
    count: String(count),
    dynamic_data: "",
    sort_by: "_ASC",
    supportedlang: env.STEAM_DEFAULT_LANGUAGE === "en" ? "english" : env.STEAM_DEFAULT_LANGUAGE,
    snr: "1_7_7_230_7",
    infinite: "1"
  });
  const url = `${env.STEAM_STORE_BASE_URL}/search/results/?${params.toString()}`;
  const response = await fetchWithRetry<SteamPublicSearchResponse>(url, {
    headers: {
      "User-Agent": "NeolyticsBot/1.0"
    }
  });
  const matches = [...(response.results_html ?? "").matchAll(/data-ds-appid="([^"]+)"/g)];
  const appIds = new Set<number>();

  for (const match of matches) {
    for (const value of match[1].split(",")) {
      const appId = Number.parseInt(value.trim(), 10);

      if (Number.isFinite(appId) && appId > 0) {
        appIds.add(appId);
      }
    }
  }

  if (appIds.size === 0) {
    throw new Error(`Steam public search returned no app ids for offset=${offset} count=${count}`);
  }

  return [...appIds];
}

export async function fetchSteamAppDetails(appId: number) {
  const params = new URLSearchParams({
    appids: String(appId),
    cc: env.STEAM_DEFAULT_COUNTRY,
    l: env.STEAM_DEFAULT_LANGUAGE
  });

  const url = `${env.STEAM_STORE_BASE_URL}/api/appdetails?${params.toString()}`;
  return fetchWithRetry<SteamAppDetailsResponse>(url);
}

export async function fetchSteamReviewSummary(appId: number) {
  const params = new URLSearchParams({
    json: "1",
    language: "all",
    purchase_type: "all",
    num_per_page: "0"
  });

  const url = `${env.STEAM_STORE_BASE_URL}/appreviews/${appId}?${params.toString()}`;
  return fetchWithRetry<SteamReviewSummaryResponse>(url);
}

export async function fetchSteamCurrentPlayers(appId: number) {
  const params = new URLSearchParams({
    appid: String(appId)
  });

  const url = `${env.STEAM_API_BASE_URL}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?${params.toString()}`;
  return fetchWithRetry<SteamPlayerCountResponse>(url);
}

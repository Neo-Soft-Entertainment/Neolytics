import { env } from "@/env";
import { logger } from "@/lib/logger";
import { sleep } from "@/lib/sleep";
import type {
  SteamAppDetailsResponse,
  SteamAppListResponse,
  SteamPlayerCountResponse,
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

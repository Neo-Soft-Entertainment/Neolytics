"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { EntitlementPolicy, FeatureKey, LimitKey } from "@/lib/subscription-plans";

type EntitlementsResponse = {
  policy: EntitlementPolicy;
  usage: Record<LimitKey, number>;
};

export function useEntitlements() {
  const query = useQuery({
    queryKey: ["entitlements"],
    queryFn: () => apiClient<EntitlementsResponse>("/api/entitlements")
  });

  return {
    policy: query.data?.policy ?? null,
    canUse: (featureKey: FeatureKey) => Boolean(query.data?.policy.features[featureKey]),
    getLimit: (limitKey: LimitKey) => query.data?.policy.limits[limitKey] ?? null,
    isLoading: query.isLoading,
    error: query.error
  };
}

export function useUsage() {
  const query = useQuery({
    queryKey: ["entitlements", "usage"],
    queryFn: () => apiClient<EntitlementsResponse>("/api/entitlements")
  });

  return {
    usage: query.data?.usage ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}

"use client";

import type { ReactNode } from "react";

import { useEntitlements } from "@/features/entitlements/hooks";
import type { FeatureKey } from "@/lib/subscription-plans";

export function FeatureGate({
  featureKey,
  children,
  fallback = null
}: {
  featureKey: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { canUse, isLoading } = useEntitlements();

  if (isLoading) {
    return null;
  }

  if (!canUse(featureKey)) {
    return fallback;
  }

  return children;
}

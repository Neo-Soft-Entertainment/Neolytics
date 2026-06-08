"use client";

import type { ReactNode } from "react";

import { useEntitlements } from "@/features/entitlements/hooks";
import { getLimitLabel, hasReachedLimit, type LimitKey } from "@/lib/subscription-plans";

export function LimitGate({
  limitKey,
  currentUsage,
  children,
  fallback
}: {
  limitKey: LimitKey;
  currentUsage: number;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { getLimit, isLoading } = useEntitlements();
  const limit = getLimit(limitKey);

  if (isLoading || limit === null) {
    return null;
  }

  if (hasReachedLimit(currentUsage, limit)) {
    return fallback ?? (
      <p className="text-sm text-muted-foreground">
        Uso atual: {currentUsage} de {getLimitLabel(limit)}. Faça upgrade para continuar usando este recurso.
      </p>
    );
  }

  return children;
}

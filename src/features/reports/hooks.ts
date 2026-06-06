"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface ReportItem {
  id: string;
  title: string;
  reportType: string;
  status: string;
  createdAt: string;
  subject: string;
  content: string | null;
  metadata: {
    genre?: string;
    tag?: string;
    generatedAt?: string;
    segment?: {
      marketSizeLabel: string;
      opportunityScore: number;
      riskScore: number;
      confidenceLabel: string;
      confidenceScore: number;
      revenueConcentrationPercent: number;
    };
  } | null;
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => apiClient<ReportItem[]>("/api/reports")
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { title: string; genre?: string; tag?: string }) =>
      apiClient("/api/reports", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["reports"]
      });
    }
  });
}

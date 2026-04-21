import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import {
  CalibrationPoint,
  DropdownOptions,
  ExplainedQuoteResponse,
  InsightsOverview,
  PerformanceHeadline,
  QuoteInput,
  QuotePrediction,
  SavedQuote,
  SavedQuoteCreateBody,
  SavedQuoteList,
  TrainingRunRow,
} from "./types";

export function useDropdowns() {
  return useQuery({
    queryKey: ["catalog", "dropdowns"],
    queryFn: async () => (await api.get<DropdownOptions>("/catalog/dropdowns")).data,
    staleTime: 5 * 60_000,
  });
}

export function useSingleQuote() {
  return useMutation<ExplainedQuoteResponse, unknown, QuoteInput>({
    mutationFn: async (input) =>
      (await api.post<ExplainedQuoteResponse>("/quote/single", input)).data,
  });
}

export function useSavedQuotes(
  params: { project?: string; industry?: string; search?: string } = {},
) {
  return useQuery<SavedQuoteList>({
    queryKey: ["savedQuotes", params],
    queryFn: async () =>
      (await api.get<SavedQuoteList>("/quotes", { params })).data,
    staleTime: 30_000,
  });
}

export function useSavedQuote(id: string | undefined) {
  return useQuery<SavedQuote>({
    queryKey: ["savedQuote", id],
    enabled: !!id,
    queryFn: async () => (await api.get<SavedQuote>(`/quotes/${id}`)).data,
  });
}

export function useSaveScenario() {
  const qc = useQueryClient();
  return useMutation<SavedQuote, unknown, SavedQuoteCreateBody>({
    mutationFn: async (body) =>
      (await api.post<SavedQuote>("/quotes", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedQuotes"] }),
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      await api.delete(`/quotes/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedQuotes"] }),
  });
}

export function useDuplicateScenario() {
  const qc = useQueryClient();
  return useMutation<SavedQuote, unknown, string>({
    mutationFn: async (id) =>
      (await api.post<SavedQuote>(`/quotes/${id}/duplicate`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedQuotes"] }),
  });
}

async function streamDownload(resp: { data: Blob }, fallbackName: string) {
  const url = URL.createObjectURL(resp.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadScenarioPdf(id: string): Promise<void> {
  const resp = await api.get(`/quotes/${id}/pdf`, { responseType: "blob" });
  streamDownload(resp as { data: Blob }, `Matrix-Quote-${id}.pdf`);
}

export async function downloadAdHocPdf(body: {
  name: string;
  project_name: string;
  client_name?: string | null;
  created_by: string;
  inputs: QuoteInput;
  prediction: QuotePrediction;
}): Promise<void> {
  const resp = await api.post("/quote/pdf", body, { responseType: "blob" });
  streamDownload(resp as { data: Blob }, `Matrix-Quote-${body.project_name.replace(/\s+/g, "-")}.pdf`);
}

export function useMetricsHistory() {
  return useQuery<TrainingRunRow[]>({
    queryKey: ["metricsHistory"],
    queryFn: async () => (await api.get<TrainingRunRow[]>("/metrics/history")).data,
  });
}
export function useCalibration() {
  return useQuery<CalibrationPoint[]>({
    queryKey: ["calibration"],
    queryFn: async () => (await api.get<CalibrationPoint[]>("/metrics/calibration")).data,
  });
}
export function usePerformanceHeadline() {
  return useQuery<PerformanceHeadline>({
    queryKey: ["performanceHeadline"],
    queryFn: async () => (await api.get<PerformanceHeadline>("/metrics/headline")).data,
  });
}
export function useInsightsOverview() {
  return useQuery<InsightsOverview>({
    queryKey: ["insightsOverview"],
    queryFn: async () => (await api.get<InsightsOverview>("/insights/overview")).data,
  });
}

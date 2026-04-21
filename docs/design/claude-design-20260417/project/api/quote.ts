import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "./client";
import { DropdownOptions, ExplainedQuoteResponse, QuoteInput } from "./types";

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

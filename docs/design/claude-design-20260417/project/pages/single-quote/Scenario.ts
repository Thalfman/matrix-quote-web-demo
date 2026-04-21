// frontend/src/pages/single-quote/Scenario.ts
import { ExplainedQuoteResponse, QuoteInput } from "@/api/types";

export type Scenario = {
  id: string;           // uuid in memory only
  name: string;
  createdAt: string;    // ISO
  inputs: QuoteInput;
  result: ExplainedQuoteResponse;
  quotedHoursByBucket?: Record<string, number>;
};

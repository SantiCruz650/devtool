import { create } from "zustand";
import { Correlator, type CorrelationResult, type RequestRecord } from "@devtool/core/src/correlator.js";
import type { LogLine } from "@devtool/core";

type CorrelationState = {
  requests: RequestRecord[];
  correlator: Correlator;
  selectedRequestId: string | null;
  recordRequest: (request: RequestRecord) => void;
  ingest: (lines: LogLine[]) => void;
  selectRequest: (requestId: string | null) => void;
  getCorrelation: (requestId: string) => CorrelationResult | null;
};

export const useCorrelationStore = create<CorrelationState>((set) => {
  const correlator = new Correlator(2);

  return {
    requests: [],
    correlator,
    selectedRequestId: null,
    recordRequest: (request) => {
      correlator.upsertRequest(request);
      set((state) => ({
        requests: [request, ...state.requests.filter((item) => item.requestId !== request.requestId)].slice(0, 50),
      }));
    },
    ingest: (lines) => {
      correlator.ingestLines(lines);
    },
    selectRequest: (requestId) => {
      set({ selectedRequestId: requestId });
    },
    getCorrelation: (requestId) => correlator.correlate(requestId),
  };
});
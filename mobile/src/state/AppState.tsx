import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { persistVerified } from "../services/verifiedStorage";
import {
  FALLBACK_LAST_MEMORY,
  sanitizePriorPatterns,
  type CoachScores,
} from "../services/sessionHelpers";
import {
  buildHistoryEntry,
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from "../services/historyStorage";

export type Scenario = "First Date" | "Coffee Chat" | "Silence";

type AppState = {
  verified: boolean;
  setVerified: (v: boolean, inquiryId?: string) => void;
  sessionCount: number;
  bumpSessionCount: () => void;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  lastMemory: string;
  setLastMemory: (m: string) => void;
  pendingSessionId: string | null;
  setPendingSessionId: (id: string | null) => void;
  recallNonce: number;
  markSessionComplete: () => void;
  history: HistoryEntry[];
  historyReady: boolean;
  addHistoryEntry: (input: {
    sessionId?: string;
    scenario: string;
    scores?: CoachScores;
    keyMoment?: string;
    coaching?: string;
  }) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({
  children,
  initialVerified = false,
}: {
  children: React.ReactNode;
  initialVerified?: boolean;
}) {
  const [verified, setVerifiedState] = useState(initialVerified);
  const [scenario, setScenario] = useState<Scenario>("First Date");
  const [lastMemory, setLastMemoryState] = useState(FALLBACK_LAST_MEMORY);
  const [sessionCount, setSessionCount] = useState(4);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [recallNonce, setRecallNonce] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyReady, setHistoryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadHistory()
      .then((entries) => {
        if (!cancelled) {
          setHistory(entries);
          setHistoryReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setVerified = useCallback((v: boolean, inquiryId?: string) => {
    setVerifiedState(v);
    void persistVerified({
      verified: v,
      inquiryId: v ? inquiryId : undefined,
    });
  }, []);

  const setLastMemory = useCallback((m: string) => {
    const clean = sanitizePriorPatterns(m);
    setLastMemoryState(clean ?? FALLBACK_LAST_MEMORY);
  }, []);

  const bumpSessionCount = useCallback(() => {
    setSessionCount((n) => n + 1);
  }, []);

  const markSessionComplete = useCallback(() => {
    setPendingSessionId(null);
    setRecallNonce((n) => n + 1);
  }, []);

  const addHistoryEntry = useCallback(
    (input: {
      sessionId?: string;
      scenario: string;
      scores?: CoachScores;
      keyMoment?: string;
      coaching?: string;
    }) => {
      const entry = buildHistoryEntry(input);
      setHistory((prev) => {
        const withoutDup = prev.filter(
          (h) =>
            h.id !== entry.id &&
            !(entry.sessionId && h.sessionId === entry.sessionId)
        );
        const next = [entry, ...withoutDup].slice(0, 40);
        void saveHistory(next);
        return next;
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      verified,
      setVerified,
      sessionCount,
      bumpSessionCount,
      scenario,
      setScenario,
      lastMemory,
      setLastMemory,
      pendingSessionId,
      setPendingSessionId,
      recallNonce,
      markSessionComplete,
      history,
      historyReady,
      addHistoryEntry,
    }),
    [
      verified,
      setVerified,
      setLastMemory,
      scenario,
      lastMemory,
      sessionCount,
      pendingSessionId,
      recallNonce,
      bumpSessionCount,
      markSessionComplete,
      history,
      historyReady,
      addHistoryEntry,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type Scenario = "First Date" | "Coffee Chat" | "Silence";

const FALLBACK_MEMORY =
  "You tensed up on relationship questions — let’s revisit that tonight.";

type AppState = {
  verified: boolean;
  setVerified: (v: boolean) => void;
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
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("First Date");
  const [lastMemory, setLastMemory] = useState(FALLBACK_MEMORY);
  const [sessionCount, setSessionCount] = useState(4);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [recallNonce, setRecallNonce] = useState(0);

  const bumpSessionCount = useCallback(() => {
    setSessionCount((n) => n + 1);
  }, []);

  const markSessionComplete = useCallback(() => {
    setPendingSessionId(null);
    setRecallNonce((n) => n + 1);
  }, []);

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
    }),
    [
      verified,
      scenario,
      lastMemory,
      sessionCount,
      pendingSessionId,
      recallNonce,
      bumpSessionCount,
      markSessionComplete,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

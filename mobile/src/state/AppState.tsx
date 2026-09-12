import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { persistVerified } from "../services/verifiedStorage";

export type Scenario = "First Date" | "Coffee Chat" | "Silence";

const FALLBACK_MEMORY =
  "You tensed up on relationship questions — let’s revisit that tonight.";

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
  const [lastMemory, setLastMemory] = useState(FALLBACK_MEMORY);
  const [sessionCount, setSessionCount] = useState(4);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [recallNonce, setRecallNonce] = useState(0);

  const setVerified = useCallback((v: boolean, inquiryId?: string) => {
    setVerifiedState(v);
    void persistVerified({
      verified: v,
      inquiryId: v ? inquiryId : undefined,
    });
  }, []);

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
      setVerified,
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

import React, { createContext, useContext, useMemo, useState } from "react";

export type Scenario = "First Date" | "Coffee Chat" | "Silence";

type AppState = {
  verified: boolean;
  setVerified: (v: boolean) => void;
  sessionCount: number;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  lastMemory: string;
  setLastMemory: (m: string) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("First Date");
  const [lastMemory] = useState(
    "You tensed up on relationship questions — let’s revisit that tonight."
  );
  const [sessionCount] = useState(4);

  const value = useMemo(
    () => ({
      verified,
      setVerified,
      sessionCount,
      scenario,
      setScenario,
      lastMemory,
      setLastMemory: () => undefined,
    }),
    [verified, scenario, lastMemory, sessionCount]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

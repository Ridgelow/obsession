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
import {
  EMPTY_PROFILE,
  isProfileComplete,
  persistProfile,
  type UserProfile,
} from "../services/profileStorage";
import type { Personality, Scenario } from "../services/practiceOptions";

export type { Scenario } from "../services/practiceOptions";
export type { Personality } from "../services/practiceOptions";

type AppState = {
  verified: boolean;
  setVerified: (v: boolean, inquiryId?: string) => void;
  profile: UserProfile;
  profileComplete: boolean;
  setProfile: (p: UserProfile) => void;
  sessionCount: number;
  bumpSessionCount: () => void;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  personality: Personality;
  setPersonality: (p: Personality) => void;
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
    personality?: string;
    scores?: CoachScores;
    keyMoment?: string;
    coaching?: string;
    turns?: { speaker: "user" | "ai"; text: string }[];
  }) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({
  children,
  initialVerified = false,
  initialProfile = EMPTY_PROFILE,
}: {
  children: React.ReactNode;
  initialVerified?: boolean;
  initialProfile?: UserProfile;
}) {
  const [verified, setVerifiedState] = useState(initialVerified);
  const [profile, setProfileState] = useState<UserProfile>(initialProfile);
  const [scenario, setScenario] = useState<Scenario>("First Date");
  const [personality, setPersonality] = useState<Personality>("Warm");
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

  const profileComplete = useMemo(() => isProfileComplete(profile), [profile]);

  const setProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    void persistProfile(p);
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
      personality?: string;
      scores?: CoachScores;
      keyMoment?: string;
      coaching?: string;
      turns?: { speaker: "user" | "ai"; text: string }[];
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
      profile,
      profileComplete,
      setProfile,
      sessionCount,
      bumpSessionCount,
      scenario,
      setScenario,
      personality,
      setPersonality,
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
      profile,
      profileComplete,
      setProfile,
      setLastMemory,
      scenario,
      personality,
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

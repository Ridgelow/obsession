import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CoachScores } from "./sessionHelpers";

export const HISTORY_STORAGE_KEY = "@obsession/history_v1";

export type HistoryEntry = {
  id: string;
  sessionId?: string;
  scenario: string;
  completedAt: string;
  scores?: CoachScores;
  keyMoment?: string;
  coaching?: string;
};

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage unavailable — in-memory list still works for this session.
  }
}

export function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<HistoryEntry>;
  return (
    typeof v.id === "string" &&
    typeof v.scenario === "string" &&
    typeof v.completedAt === "string"
  );
}

export function buildHistoryEntry(input: {
  sessionId?: string;
  scenario: string;
  scores?: CoachScores;
  keyMoment?: string;
  coaching?: string;
}): HistoryEntry {
  return {
    id: input.sessionId ?? `local-${Date.now()}`,
    sessionId: input.sessionId,
    scenario: input.scenario,
    completedAt: new Date().toISOString(),
    scores: input.scores,
    keyMoment: input.keyMoment,
    coaching: input.coaching,
  };
}

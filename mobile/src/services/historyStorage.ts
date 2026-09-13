import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CoachScores } from "./sessionHelpers";
import { withMockHistory } from "./historyMock";

export const HISTORY_STORAGE_KEY = "@obsession/history_v1";

export type HistoryEntry = {
  id: string;
  sessionId?: string;
  scenario: string;
  /** Nikki’s personality for that session (optional on older entries). */
  personality?: string;
  completedAt: string;
  scores?: CoachScores;
  keyMoment?: string;
  coaching?: string;
  /** Conversation transcript (mock demos + live pending turns). */
  turns?: { speaker: "user" | "ai"; text: string }[];
};

export type HistorySort =
  | "newest"
  | "oldest"
  | "score_high"
  | "score_low"
  | "scenario";

export type HistoryFilters = {
  scenario: string; // "all" | scenario name
  personality: string; // "all" | personality name
  sort: HistorySort;
};

export const HISTORY_SORT_OPTIONS: { id: HistorySort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "score_high", label: "Best score" },
  { id: "score_low", label: "Lowest" },
  { id: "scenario", label: "Scenario A–Z" },
];

export function averageScore(entry: HistoryEntry): number | null {
  const s = entry.scores;
  if (!s) return null;
  return Math.round(
    (s.chemistry + s.conversation + s.composure + s.curiosity) / 4
  );
}

export function sortHistory(
  entries: HistoryEntry[],
  sort: HistorySort
): HistoryEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "oldest":
      return copy.sort(
        (a, b) =>
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      );
    case "score_high":
      return copy.sort(
        (a, b) => (averageScore(b) ?? -1) - (averageScore(a) ?? -1)
      );
    case "score_low":
      return copy.sort(
        (a, b) => (averageScore(a) ?? 999) - (averageScore(b) ?? 999)
      );
    case "scenario":
      return copy.sort((a, b) => {
        const byScenario = a.scenario.localeCompare(b.scenario);
        if (byScenario !== 0) return byScenario;
        return (
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
      });
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
  }
}

export function filterHistory(
  entries: HistoryEntry[],
  filters: HistoryFilters
): HistoryEntry[] {
  return sortHistory(
    entries.filter((entry) => {
      if (filters.scenario !== "all" && entry.scenario !== filters.scenario) {
        return false;
      }
      if (
        filters.personality !== "all" &&
        (entry.personality ?? "") !== filters.personality
      ) {
        return false;
      }
      return true;
    }),
    filters.sort
  );
}

export type HistoryDayGroup = {
  label: string;
  key: string;
  entries: HistoryEntry[];
};

/** Group filtered entries into day buckets (GitHub-style activity days). */
export function groupHistoryByDay(entries: HistoryEntry[]): HistoryDayGroup[] {
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.completedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const yesterdayKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => {
      let label: string;
      if (key === todayKey) label = "Today";
      else if (key === yesterdayKey) label = "Yesterday";
      else {
        const [yy, mm, dd] = key.split("-").map(Number);
        label = new Date(yy, mm - 1, dd).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: yy === today.getFullYear() ? undefined : "numeric",
        });
      }
      return { key, label, entries: list };
    });
}

export function shortCommitId(entry: HistoryEntry): string {
  const raw = entry.sessionId ?? entry.id;
  return (
    raw.replace(/[^a-zA-Z0-9]/g, "").slice(-7).toLowerCase() || "practice"
  );
}

/** Clock time for commit-style footers (replaces cryptic session hashes). */
export function formatClockTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function formatRelativeWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 14) return `${days}d ago`;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return withMockHistory([]);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return withMockHistory([]);
    return withMockHistory(parsed.filter(isHistoryEntry));
  } catch {
    return withMockHistory([]);
  }
}

export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  try {
    // Persist only non-mock rows so demos don’t balloon storage.
    const persistable = entries.filter((e) => !e.id.startsWith("mock-"));
    await AsyncStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(persistable)
    );
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
  personality?: string;
  scores?: CoachScores;
  keyMoment?: string;
  coaching?: string;
  turns?: { speaker: "user" | "ai"; text: string }[];
}): HistoryEntry {
  return {
    id: input.sessionId ?? `local-${Date.now()}`,
    sessionId: input.sessionId,
    scenario: input.scenario,
    personality: input.personality,
    completedAt: new Date().toISOString(),
    scores: input.scores,
    keyMoment: input.keyMoment,
    coaching: input.coaching,
    turns: input.turns,
  };
}

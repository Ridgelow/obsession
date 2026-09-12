export const NERVES_THRESHOLD_BPM = 12;
export const BASELINE_WINDOW_SEC = 20;
export const DEMO_USER_ID = "demo-user";
export const TELEMETRY_INTERVAL_MS = 1000;
export const AI_LINE_POLL_MS = 3000;

export type CoachScores = {
  chemistry: number;
  conversation: number;
  composure: number;
  curiosity: number;
};

export type CoachResponse = {
  scores: CoachScores;
  keyMoment: string;
  coaching: string;
};

export type TimelineTurn = {
  time: string;
  speaker: string;
  text: string;
  hr_delta: number | null;
  flagged: boolean;
};

export type StartSessionResponse = {
  sessionId: string;
  priorPatterns: string | null;
};

export type TelemetrySource = "presage" | "simulator";

export type TelemetryReading = {
  heartRate: number;
  breathingRate?: number;
  engagement?: number;
  /** Server defaults to "presage" when omitted. Always send "presage" or "simulator". */
  source?: TelemetrySource;
};

export type TelemetryResponse = {
  delta: number;
  flagged: boolean;
};

/** Map Home scenario chips to the server `scenario` string. */
export function mapScenario(scenario?: string): string {
  switch (scenario) {
    case "First Date":
    case "first_date":
      return "first_date";
    case "Coffee Chat":
    case "coffee_chat":
      return "coffee_chat";
    case "Silence":
    case "silence":
      return "silence";
    default:
      return "first_date";
  }
}

export function averageHeartRate(readings: number[]): number {
  if (readings.length === 0) return 0;
  const sum = readings.reduce((a, b) => a + b, 0);
  return Math.round(sum / readings.length);
}

export function shouldShowNerves(
  flagged: boolean,
  delta: number,
  threshold = NERVES_THRESHOLD_BPM
): boolean {
  return flagged || Math.abs(delta) >= threshold;
}

export function normalizeTimeline(data: unknown): TimelineTurn[] {
  const raw = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { turns?: unknown }).turns)
      ? (data as { turns: unknown[] }).turns
      : [];

  return raw.map((row) => {
    const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const deltaRaw = r.hr_delta ?? r.hrDelta;
    let hr_delta: number | null = null;
    if (typeof deltaRaw === "number" && Number.isFinite(deltaRaw)) {
      hr_delta = deltaRaw;
    } else if (deltaRaw != null && deltaRaw !== "") {
      const n = Number(deltaRaw);
      hr_delta = Number.isFinite(n) ? n : null;
    }
    return {
      time: String(r.time ?? r.ts ?? ""),
      speaker: String(r.speaker ?? ""),
      text: String(r.text ?? ""),
      hr_delta,
      flagged: Boolean(r.flagged),
    };
  });
}

export function latestAiLine(turns: TimelineTurn[]): string | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const speaker = turns[i].speaker.toLowerCase();
    if (
      (speaker === "ai" || speaker === "assistant") &&
      turns[i].text.trim()
    ) {
      return turns[i].text;
    }
  }
  return null;
}

export function isCoachResponse(value: unknown): value is CoachResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CoachResponse>;
  const scores = v.scores;
  return Boolean(
    scores &&
      typeof scores.chemistry === "number" &&
      typeof scores.conversation === "number" &&
      typeof scores.composure === "number" &&
      typeof scores.curiosity === "number"
  );
}
